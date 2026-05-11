'use strict';

const { createProxyMiddleware } = require('http-proxy-middleware');

const AUTH_URL         = process.env.AUTH_SERVICE_URL         || 'http://auth-service:3001';
const JOB_URL          = process.env.JOB_SERVICE_URL          || 'http://job-service:3002';
const RESUME_URL       = process.env.RESUME_SERVICE_URL       || 'http://resume-service:3003';
const NOTIFICATION_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3004';

// Shared proxy options factory
function makeProxy(target, pathRewrite) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite,
    on: {
      error: (err, req, res) => {
        console.error(`[api-gateway:proxy] Error proxying to ${target}:`, err.message);
        if (!res.headersSent) {
          res.status(502).json({ success: false, message: 'Service temporarily unavailable' });
        }
      },
    },
  });
}

// Each route strips its prefix and forwards to the downstream service
const authProxy         = makeProxy(AUTH_URL,         { '^/': '/api/auth/' });
const jobProxy          = makeProxy(JOB_URL,          { '^/': '/api/jobs/' });
const resumeProxy       = makeProxy(RESUME_URL,       { '^/': '/api/resumes/' });
const notificationProxy = makeProxy(NOTIFICATION_URL, { '^/': '/api/notifications/' });

module.exports = { authProxy, jobProxy, resumeProxy, notificationProxy };
