'use strict';

const jwt = require('jsonwebtoken');

// Routes that do NOT require a valid JWT
const PUBLIC_PATHS = [
  '/auth/register',
  '/auth/login',
  '/auth/refresh',
  '/health',
  '/metrics',
];

/**
 * JWT verification middleware.
 * Verifies the Bearer token, then injects X-User-Id into the proxied request.
 */
function verifyToken(req, res, next) {
  // Allow public paths through
  const path = req.path;
  if (PUBLIC_PATHS.some((p) => path === p || path.startsWith(p))) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Missing or malformed Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Inject user identity for downstream services — they trust this header
    req.headers['x-user-id']    = decoded.id;
    req.headers['x-user-email'] = decoded.email;
    req.headers['x-user-name']  = decoded.name;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Access token expired' });
    }
    return res.status(401).json({ success: false, message: 'Invalid access token' });
  }
}

module.exports = { verifyToken };
