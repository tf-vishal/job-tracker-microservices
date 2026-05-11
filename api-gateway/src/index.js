'use strict';

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const client  = require('prom-client');

const { verifyToken }                                               = require('./middleware/auth');
const { limiter, authLimiter }                                      = require('./middleware/rateLimit');
const { authProxy, jobProxy, resumeProxy, notificationProxy }       = require('./routes/proxy');

// ─── Prometheus ───────────────────────────────────────────────────────────────
const register = new client.Registry();
client.collectDefaultMetrics({ register });
const httpDuration = new client.Histogram({
  name: 'gateway_http_request_duration_seconds',
  help: 'Gateway HTTP request duration',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});
register.registerMetric(httpDuration);

const app  = express();
const PORT = process.env.PORT || 8080;

// ─── Core Middleware ──────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean),
  credentials: true,
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── Request Duration Tracking ────────────────────────────────────────────────
app.use((req, res, next) => {
  const end = httpDuration.startTimer();
  res.on('finish', () => end({ method: req.method, route: req.path.split('/')[1] || 'root', status_code: res.statusCode }));
  next();
});

// ─── Health & Metrics (no auth/rate-limit) ────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api-gateway', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

app.get('/metrics', async (_req, res) => {
  res.setHeader('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// ─── Global Rate Limit ────────────────────────────────────────────────────────
app.use(limiter);

// ─── JWT Verification (populates X-User-Id for all protected routes) ──────────
app.use(verifyToken);

// ─── Proxy Routes ─────────────────────────────────────────────────────────────
// Stricter rate limit on auth endpoints
app.use('/auth',          authLimiter, authProxy);
app.use('/jobs',          jobProxy);
app.use('/resumes',       resumeProxy);
app.use('/notifications', notificationProxy);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ success: false, message: 'Gateway: route not found' }));

// ─── Start ────────────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`[api-gateway] Running on port ${PORT} (${process.env.NODE_ENV})`);
});

const shutdown = (sig) => {
  console.log(`[api-gateway] ${sig} — shutting down`);
  server.close(() => process.exit(0));
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
