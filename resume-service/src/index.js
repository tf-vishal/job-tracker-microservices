'use strict';

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const client  = require('prom-client');

const { connectDB }    = require('./db');
const resumesRouter    = require('./routes/resumes');
const { errorHandler } = require('./middleware/errorHandler');

// ─── Prometheus Metrics Setup ─────────────────────────────────────────────────
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDuration = new client.Histogram({
  name:       'resume_http_request_duration_seconds',
  help:       'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets:    [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});
const resumesUploadedTotal = new client.Counter({
  name: 'resume_versions_uploaded_total',
  help: 'Total number of resume versions created',
});
register.registerMetric(httpRequestDuration);
register.registerMetric(resumesUploadedTotal);

// ─── App Initialization ───────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 3003;

// ─── Core Middleware ──────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean),
  credentials: true,
}));
app.use(express.json({ limit: '10kb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── Request Duration Middleware ──────────────────────────────────────────────
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    end({
      method:      req.method,
      route:       req.route?.path ?? req.path,
      status_code: res.statusCode,
    });
  });
  next();
});

// Expose metrics to controllers
app.locals.metrics = { resumesUploadedTotal };

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({
    status:    'ok',
    service:   'resume-service',
    timestamp: new Date().toISOString(),
    uptime:    process.uptime(),
  });
});

// ─── Prometheus Metrics Endpoint ──────────────────────────────────────────────
app.get('/metrics', async (_req, res) => {
  res.setHeader('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/resumes', resumesRouter);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
async function start() {
  try {
    await connectDB();
    const server = app.listen(PORT, () => {
      console.log(`[resume-service] Running on port ${PORT} (${process.env.NODE_ENV})`);
    });

    const shutdown = (signal) => {
      console.log(`[resume-service] ${signal} received — shutting down gracefully`);
      server.close(() => {
        console.log('[resume-service] HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

  } catch (err) {
    console.error('[resume-service] Failed to start:', err.message);
    process.exit(1);
  }
}

start();
