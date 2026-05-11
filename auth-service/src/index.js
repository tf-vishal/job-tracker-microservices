'use strict';

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const client  = require('prom-client');

const { connectDB }  = require('./db');
const authRouter     = require('./routes/auth');
const { errorHandler } = require('./middleware/errorHandler');

// ─── Prometheus Metrics Setup ─────────────────────────────────────────────────
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDuration = new client.Histogram({
  name: 'auth_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});
register.registerMetric(httpRequestDuration);

// ─── App Initialization ───────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 3001;

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

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({
    status:    'ok',
    service:   'auth-service',
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
app.use('/api/auth', authRouter);

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
      console.log(`[auth-service] Running on port ${PORT} (${process.env.NODE_ENV})`);
    });

    // Graceful shutdown
    const shutdown = (signal) => {
      console.log(`[auth-service] ${signal} received — shutting down gracefully`);
      server.close(() => {
        console.log('[auth-service] HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

  } catch (err) {
    console.error('[auth-service] Failed to start:', err.message);
    process.exit(1);
  }
}

start();
