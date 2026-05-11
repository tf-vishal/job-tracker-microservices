'use strict';

const { Router }    = require('express');
const { body }      = require('express-validator');
const { validate }  = require('../middleware/validate');
const authController = require('../controllers/authController');

const router = Router();

// ─── Validation Schemas ───────────────────────────────────────────────────────

const registerRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
];

const loginRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
];

const refreshRules = [
  body('refreshToken')
    .notEmpty().withMessage('Refresh token is required'),
];

// ─── Routes ───────────────────────────────────────────────────────────────────

// POST /api/auth/register
router.post('/register', registerRules, validate, authController.register);

// POST /api/auth/login
router.post('/login', loginRules, validate, authController.login);

// GET /api/auth/me  (requires Authorization: Bearer <token>)
router.get('/me', authController.authenticate, authController.me);

// POST /api/auth/refresh
router.post('/refresh', refreshRules, validate, authController.refresh);

// POST /api/auth/logout
router.post('/logout', authController.authenticate, authController.logout);

module.exports = router;
