'use strict';

const { validationResult } = require('express-validator');

/**
 * Middleware that reads express-validator results and returns a
 * 422 Unprocessable Entity if any validation errors exist.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors:  errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

module.exports = { validate };
