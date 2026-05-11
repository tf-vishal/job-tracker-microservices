'use strict';

const { Pool } = require('pg');

const pool = new Pool({
  host:                    process.env.DB_HOST     || 'localhost',
  port:                    parseInt(process.env.DB_PORT || '5432', 10),
  database:                process.env.DB_NAME     || 'resume_db',
  user:                    process.env.DB_USER     || 'postgres',
  password:                process.env.DB_PASSWORD || 'postgres',
  max:                     10,
  idleTimeoutMillis:       30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[resume-service:db] Unexpected pool error:', err.message);
});

// ─── Schema Migrations ────────────────────────────────────────────────────────
const SCHEMA_SQL = `
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";

  CREATE TABLE IF NOT EXISTS resumes (
    id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID          NOT NULL,
    version_name VARCHAR(255)  NOT NULL,
    file_name    VARCHAR(255)  NOT NULL,
    file_size    INTEGER       CHECK (file_size > 0),
    is_active    BOOLEAN       NOT NULL DEFAULT false,
    notes        TEXT,
    tags         TEXT[]        NOT NULL DEFAULT '{}',
    created_at   TIMESTAMPTZ   DEFAULT NOW(),
    updated_at   TIMESTAMPTZ   DEFAULT NOW()
  );

  -- Fast lookup for user's resume list
  CREATE INDEX IF NOT EXISTS idx_resumes_user_id        ON resumes(user_id);
  -- Quick access to the active resume per user
  CREATE INDEX IF NOT EXISTS idx_resumes_user_active    ON resumes(user_id, is_active);

  -- Auto-update updated_at
  CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS set_resumes_updated_at ON resumes;
  CREATE TRIGGER set_resumes_updated_at
    BEFORE UPDATE ON resumes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;

async function connectDB() {
  const client = await pool.connect();
  try {
    console.log('[resume-service:db] Connected to PostgreSQL');
    await client.query(SCHEMA_SQL);
    console.log('[resume-service:db] Schema migrations applied');
  } finally {
    client.release();
  }
}

async function query(text, params) {
  const start  = Date.now();
  const result = await pool.query(text, params);
  if (process.env.NODE_ENV !== 'production') {
    console.debug(`[resume-service:db] "${text.slice(0, 60)}..." — ${Date.now() - start}ms`);
  }
  return result;
}

module.exports = { connectDB, query, pool };
