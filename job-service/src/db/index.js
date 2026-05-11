'use strict';

const { Pool } = require('pg');

const pool = new Pool({
  host:                    process.env.DB_HOST     || 'localhost',
  port:                    parseInt(process.env.DB_PORT || '5432', 10),
  database:                process.env.DB_NAME     || 'job_db',
  user:                    process.env.DB_USER     || 'postgres',
  password:                process.env.DB_PASSWORD || 'postgres',
  max:                     10,
  idleTimeoutMillis:       30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[job-service:db] Unexpected pool error:', err.message);
});

// ─── Schema Migrations ────────────────────────────────────────────────────────
const SCHEMA_SQL = `
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";

  -- Valid job application statuses
  DO $$ BEGIN
    CREATE TYPE job_status AS ENUM (
      'applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn'
    );
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;

  CREATE TABLE IF NOT EXISTS jobs (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL,
    company      VARCHAR(255) NOT NULL,
    role         VARCHAR(255) NOT NULL,
    status       job_status  NOT NULL DEFAULT 'applied',
    applied_date DATE        NOT NULL DEFAULT CURRENT_DATE,
    notes        TEXT,
    job_url      VARCHAR(500),
    salary_range VARCHAR(100),
    location     VARCHAR(255),
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
  );

  -- Indexes for common query patterns
  CREATE INDEX IF NOT EXISTS idx_jobs_user_id       ON jobs(user_id);
  CREATE INDEX IF NOT EXISTS idx_jobs_user_status   ON jobs(user_id, status);
  CREATE INDEX IF NOT EXISTS idx_jobs_updated_at    ON jobs(updated_at);

  -- Auto-update updated_at
  CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS set_jobs_updated_at ON jobs;
  CREATE TRIGGER set_jobs_updated_at
    BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;

async function connectDB() {
  const client = await pool.connect();
  try {
    console.log('[job-service:db] Connected to PostgreSQL');
    await client.query(SCHEMA_SQL);
    console.log('[job-service:db] Schema migrations applied');
  } finally {
    client.release();
  }
}

async function query(text, params) {
  const start  = Date.now();
  const result = await pool.query(text, params);
  if (process.env.NODE_ENV !== 'production') {
    console.debug(`[job-service:db] "${text.slice(0, 60)}..." — ${Date.now() - start}ms`);
  }
  return result;
}

module.exports = { connectDB, query, pool };
