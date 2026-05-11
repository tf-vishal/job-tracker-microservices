'use strict';

const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  max:      parseInt(process.env.RATE_LIMIT_MAX       || '100',   10),
  standardHeaders: true,
  legacyHeaders:   false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests — please slow down.',
    });
  },
});

// Stricter limiter for auth endpoints to slow brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max:      20,
  standardHeaders: true,
  legacyHeaders:   false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many auth attempts — try again in 15 minutes.',
    });
  },
});

module.exports = { limiter, authLimiter };
