'use strict';

function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const message = err.expose || process.env.NODE_ENV !== 'production' ? err.message : 'Internal Server Error';
  if (statusCode === 500) console.error('[notification-service:error]', err);
  res.status(statusCode).json({ success: false, message });
}

function createError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.expose = true;
  return err;
}

module.exports = { errorHandler, createError };
