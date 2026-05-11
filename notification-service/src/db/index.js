'use strict';

const { Pool } = require('pg');

const pool = new Pool({
  host:                    process.env.DB_HOST     || 'localhost',
  port:                    parseInt(process.env.DB_PORT || '5432', 10),
  database:                process.env.DB_NAME     || 'notification_db',
  user:                    process.env.DB_USER     || 'postgres',
  password:                process.env.DB_PASSWORD || 'postgres',
  max:                     10,
  idleTimeoutMillis:       30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => console.error('[notification-service:db] Pool error:', err.message));

const SCHEMA_SQL = `
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";

  CREATE TABLE IF NOT EXISTS notification_logs (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID         NOT NULL,
    job_id     UUID         NOT NULL,
    company    VARCHAR(255),
    role       VARCHAR(255),
    message    TEXT         NOT NULL,
    is_read    BOOLEAN      NOT NULL DEFAULT false,
    sent_at    TIMESTAMPTZ  DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_notif_user_id   ON notification_logs(user_id);
  CREATE INDEX IF NOT EXISTS idx_notif_user_read ON notification_logs(user_id, is_read);
  CREATE INDEX IF NOT EXISTS idx_notif_job_id    ON notification_logs(job_id);
`;

async function connectDB() {
  const client = await pool.connect();
  try {
    console.log('[notification-service:db] Connected to PostgreSQL');
    await client.query(SCHEMA_SQL);
    console.log('[notification-service:db] Schema migrations applied');
  } finally {
    client.release();
  }
}

async function query(text, params) {
  const start  = Date.now();
  const result = await pool.query(text, params);
  if (process.env.NODE_ENV !== 'production') {
    console.debug(`[notification-service:db] "${text.slice(0, 60)}..." — ${Date.now() - start}ms`);
  }
  return result;
}

module.exports = { connectDB, query, pool };
