'use strict';

const { Pool } = require('pg');

// ─── Connection Pool ──────────────────────────────────────────────────────────
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME     || 'auth_db',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  // Keep a maximum of 10 clients in the pool
  max:            10,
  idleTimeoutMillis:    30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[auth-service:db] Unexpected pool error:', err.message);
});

// ─── Schema Migrations ────────────────────────────────────────────────────────
const SCHEMA_SQL = `
  -- Enable UUID generation
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";

  -- Users table
  CREATE TABLE IF NOT EXISTS users (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email      VARCHAR(255) UNIQUE NOT NULL,
    password   VARCHAR(255) NOT NULL,
    name       VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Index for fast login lookups
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

  -- Refresh tokens table
  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      TEXT        NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Index for token lookup during refresh/logout
  CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token   ON refresh_tokens(token);
  CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);

  -- Auto-update updated_at on users
  CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS set_users_updated_at ON users;
  CREATE TRIGGER set_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;

// ─── Connect & Run Migrations ─────────────────────────────────────────────────
async function connectDB() {
  // Verify connectivity
  const client = await pool.connect();
  try {
    console.log('[auth-service:db] Connected to PostgreSQL');
    await client.query(SCHEMA_SQL);
    console.log('[auth-service:db] Schema migrations applied');
  } finally {
    client.release();
  }
}

// ─── Query Helper ─────────────────────────────────────────────────────────────
/**
 * Executes a parameterized query against the pool.
 * @param {string} text  - SQL query string
 * @param {Array}  params - Query parameters
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV !== 'production') {
    console.debug(`[auth-service:db] query "${text.slice(0, 60)}..." — ${duration}ms, rows: ${result.rowCount}`);
  }
  return result;
}

module.exports = { connectDB, query, pool };
