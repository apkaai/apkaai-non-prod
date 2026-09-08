/**
 * db.js — PostgreSQL connection pool
 * Uses the `pg` package with connection pooling.
 * All environment variables are loaded from .env
 */
const { Pool } = require('pg')

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME     || 'apkaai',
  user:     process.env.DB_USER,
  password: process.env.DB_PASS,
  ssl: process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: false }   // RDS requires SSL
    : false,
  max:              10,   // max pool connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})

// Test connection on startup
pool.connect((err, client, done) => {
  if (err) {
    console.error('[DB] Connection error:', err.message)
  } else {
    console.log('[DB] PostgreSQL connected:', process.env.DB_HOST)
    done()
  }
})

/**
 * query(text, params) — run a parameterized query
 * Usage: await query('SELECT * FROM tools WHERE slug = $1', [slug])
 */
async function query(text, params) {
  const start = Date.now()
  const res   = await pool.query(text, params)
  const ms    = Date.now() - start
  if (process.env.NODE_ENV !== 'production') {
    console.log('[DB]', { text: text.slice(0, 60), rows: res.rowCount, ms })
  }
  return res
}

module.exports = { pool, query }
