'use strict';

const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { query } = require('../db');
const { createError } = require('../middleware/errorHandler');

// ─── Constants ────────────────────────────────────────────────────────────────
const SALT_ROUNDS = 12;

const JWT_ACCESS_SECRET   = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET  = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRES_IN   = process.env.JWT_ACCESS_EXPIRES_IN  || '15m';
const REFRESH_EXPIRES_IN  = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// ─── Token Helpers ────────────────────────────────────────────────────────────

/**
 * Signs and returns an access JWT.
 * @param {object} payload - { id, email, name }
 */
function signAccessToken(payload) {
  return jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}

/**
 * Signs and returns a refresh JWT.
 * @param {object} payload - { id }
 */
function signRefreshToken(payload) {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
}

/**
 * Calculates the expiry Date object from a JWT expiration string (e.g. "7d").
 */
function expiresAtFromString(expiresIn) {
  const units = { s: 1, m: 60, h: 3600, d: 86400 };
  const match = String(expiresIn).match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid expiresIn format: ${expiresIn}`);
  const seconds = parseInt(match[1], 10) * units[match[2]];
  return new Date(Date.now() + seconds * 1000);
}

// ─── Middleware: authenticate ─────────────────────────────────────────────────

/**
 * Verifies the Bearer token from the Authorization header.
 * Attaches decoded payload to req.user on success.
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError('Missing or malformed Authorization header', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET);

    // Confirm the user still exists in the database
    const result = await query(
      'SELECT id, email, name FROM users WHERE id = $1',
      [decoded.id]
    );
    if (result.rowCount === 0) {
      throw createError('User no longer exists', 401);
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(createError('Access token expired', 401));
    }
    if (err.name === 'JsonWebTokenError') {
      return next(createError('Invalid access token', 401));
    }
    next(err);
  }
}

// ─── Controller: register ─────────────────────────────────────────────────────

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    // Check for existing user
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rowCount > 0) {
      throw createError('An account with this email already exists', 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Insert new user
    const result = await query(
      `INSERT INTO users (name, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
      [name, email, hashedPassword]
    );
    const user = result.rows[0];

    // Issue tokens
    const accessToken  = signAccessToken({ id: user.id, email: user.email, name: user.name });
    const refreshToken = signRefreshToken({ id: user.id });

    // Persist refresh token
    await query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, refreshToken, expiresAtFromString(REFRESH_EXPIRES_IN)]
    );

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        user: { id: user.id, name: user.name, email: user.email, createdAt: user.created_at },
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Controller: login ────────────────────────────────────────────────────────

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    // Look up user
    const result = await query(
      'SELECT id, name, email, password FROM users WHERE email = $1',
      [email]
    );

    // Use a constant-time comparison to prevent user enumeration
    const user          = result.rows[0];
    const dummyHash     = '$2a$12$invalidhashfortimingprotectiononly000000000000000000';
    const passwordMatch = await bcrypt.compare(password, user?.password || dummyHash);

    if (!user || !passwordMatch) {
      throw createError('Invalid email or password', 401);
    }

    // Issue tokens
    const accessToken  = signAccessToken({ id: user.id, email: user.email, name: user.name });
    const refreshToken = signRefreshToken({ id: user.id });

    // Persist refresh token (invalidate old ones for this user to limit concurrent sessions)
    await query('DELETE FROM refresh_tokens WHERE user_id = $1', [user.id]);
    await query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, refreshToken, expiresAtFromString(REFRESH_EXPIRES_IN)]
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: { id: user.id, name: user.name, email: user.email },
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Controller: me ───────────────────────────────────────────────────────────

async function me(req, res, next) {
  try {
    const result = await query(
      'SELECT id, name, email, created_at, updated_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rowCount === 0) {
      throw createError('User not found', 404);
    }
    const user = result.rows[0];
    res.status(200).json({
      success: true,
      data: {
        user: {
          id:        user.id,
          name:      user.name,
          email:     user.email,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Controller: refresh ──────────────────────────────────────────────────────

async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;

    // Verify the refresh token signature and expiry
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch {
      throw createError('Invalid or expired refresh token', 401);
    }

    // Check token exists in DB (ensures it hasn't been rotated/revoked)
    const tokenResult = await query(
      `SELECT rt.id, rt.expires_at, u.id AS user_id, u.name, u.email
       FROM   refresh_tokens rt
       JOIN   users u ON u.id = rt.user_id
       WHERE  rt.token = $1 AND rt.user_id = $2`,
      [refreshToken, decoded.id]
    );

    if (tokenResult.rowCount === 0) {
      throw createError('Refresh token not found or already rotated', 401);
    }

    const row = tokenResult.rows[0];
    if (new Date(row.expires_at) < new Date()) {
      throw createError('Refresh token expired', 401);
    }

    // Rotate: delete old, issue new pair
    await query('DELETE FROM refresh_tokens WHERE id = $1', [row.id]);

    const newAccessToken  = signAccessToken({ id: row.user_id, email: row.email, name: row.name });
    const newRefreshToken = signRefreshToken({ id: row.user_id });

    await query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [row.user_id, newRefreshToken, expiresAtFromString(REFRESH_EXPIRES_IN)]
    );

    res.status(200).json({
      success: true,
      message: 'Token refreshed',
      data: {
        accessToken:  newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Controller: logout ───────────────────────────────────────────────────────

async function logout(req, res, next) {
  try {
    // Delete all refresh tokens for this user (logs out all sessions)
    await query('DELETE FROM refresh_tokens WHERE user_id = $1', [req.user.id]);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (err) {
    next(err);
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
  authenticate,
  register,
  login,
  me,
  refresh,
  logout,
};
