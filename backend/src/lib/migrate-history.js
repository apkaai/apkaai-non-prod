/**
 * migrate-history.js — Add user_history table to PostgreSQL
 * Usage: node src/lib/migrate-history.js
 */
require('dotenv').config()
const { pool } = require('./db')

const sql = `
-- ── user_history ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_history (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID         NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  event_type   VARCHAR(30)  NOT NULL CHECK (event_type IN ('view','search','compare','cart_add','cart_remove')),
  tool_id      VARCHAR(50),           -- null for search events
  tool_slug    VARCHAR(100),
  tool_name    VARCHAR(200),
  tool_logo    VARCHAR(10),
  tool_category VARCHAR(200),
  search_query VARCHAR(300),          -- only for search events
  extra        JSONB        DEFAULT '{}',
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_history_user_id    ON user_history(user_id);
CREATE INDEX IF NOT EXISTS idx_history_created_at ON user_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_event_type ON user_history(event_type);
`

async function run() {
  console.log('[migrate-history] Creating user_history table...')
  await pool.query(sql)
  console.log('[migrate-history] Done.')
  await pool.end()
}

run().catch(err => {
  console.error('[migrate-history] Error:', err.message)
  process.exit(1)
})
