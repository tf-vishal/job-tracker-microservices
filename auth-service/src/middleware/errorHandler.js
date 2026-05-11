'use strict';

/**
 * Centralized error handler middleware.
 * Catches any error passed via next(err) and returns a structured JSON response.
 */
function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || err.status || 500;
  const message    = err.expose || process.env.NODE_ENV !== 'production'
    ? err.message
    : 'Internal Server Error';

  if (statusCode === 500) {
    console.error('[auth-service:error]', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

/**
 * Creates an error with a specific HTTP status code.
 * @param {string} message
 * @param {number} statusCode
 */
function createError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.expose     = true;
  return err;
}

module.exports = { errorHandler, createError };
