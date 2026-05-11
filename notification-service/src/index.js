'use strict';

require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const morgan   = require('morgan');
const client   = require('prom-client');

const { connectDB }        = require('./db');
const notifRouter          = require('./routes/notifications');
const { errorHandler }     = require('./middleware/errorHandler');
const { startScheduler }   = require('./cron/scheduler');

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpDuration = new client.Histogram({
  name: 'notification_http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});
const notifSentTotal = new client.Counter({
  name: 'notifications_sent_total',
  help: 'Total notifications created by cron',
});
register.registerMetric(httpDuration);
register.registerMetric(notifSentTotal);

const app  = express();
const PORT = process.env.PORT || 3004;

app.use(helmet());
app.use(cors({ origin: (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean), credentials: true }));
app.use(express.json({ limit: '10kb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use((req, res, next) => {
  const end = httpDuration.startTimer();
  res.on('finish', () => end({ method: req.method, route: req.route?.path ?? req.path, status_code: res.statusCode }));
  next();
});

app.locals.metrics = { notifSentTotal };

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'notification-service', timestamp: new Date().toISOString(), uptime: process.uptime() }));

app.get('/metrics', async (_req, res) => {
  res.setHeader('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use('/api/notifications', notifRouter);

app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use(errorHandler);

async function start() {
  try {
    await connectDB();
    startScheduler();
    const server = app.listen(PORT, () => {
      console.log(`[notification-service] Running on port ${PORT} (${process.env.NODE_ENV})`);
    });
    const shutdown = (sig) => {
      console.log(`[notification-service] ${sig} — shutting down`);
      server.close(() => process.exit(0));
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));
  } catch (err) {
    console.error('[notification-service] Failed to start:', err.message);
    process.exit(1);
  }
}

start();
