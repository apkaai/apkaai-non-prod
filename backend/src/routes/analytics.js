const express = require('express')
const router  = express.Router()
const { query } = require('../lib/db')

// ── Auth middleware ────────────────────────────────────────────────────────────
function adminOnly(req, res, next) {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Not authenticated' })
  const token = auth.split(' ')[1]
  if (token.startsWith('admin-token-')) return next()
  try {
    const [payload] = token.split('.')
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (decoded.role === 'admin') return next()
    query('SELECT role FROM users WHERE user_id = $1', [decoded.userId])
      .then(r => { if (r.rows[0]?.role === 'admin') return next(); return res.status(403).json({ error: 'Admin only' }) })
      .catch(() => res.status(403).json({ error: 'Admin only' }))
  } catch { return res.status(401).json({ error: 'Invalid token' }) }
}

// ── GET /api/analytics/overview ───────────────────────────────────────────────
router.get('/overview', adminOnly, async (req, res, next) => {
  try {
    const [
      totalUsers, totalContacts, totalTools,
      recentUsers, recentContacts,
      signupsByDay, contactsByDay,
      roleBreakdown, topSubjects,
      newUsersToday, newUsersWeek, newUsersMonth
    ] = await Promise.all([
      query('SELECT COUNT(*)::int AS count FROM users'),
      query('SELECT COUNT(*)::int AS count FROM contacts'),
      query('SELECT COUNT(*)::int AS count FROM tools'),

      // Recent 5 users
      query('SELECT user_id, name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 5'),

      // Recent 5 contacts
      query('SELECT id, name, email, subject, status, created_at FROM contacts ORDER BY created_at DESC LIMIT 5'),

      // Signups by day (last 30 days)
      query(`
        SELECT DATE(created_at) AS day, COUNT(*)::int AS count
        FROM users
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY day ASC
      `),

      // Contacts by day (last 30 days)
      query(`
        SELECT DATE(created_at) AS day, COUNT(*)::int AS count
        FROM contacts
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY day ASC
      `),

      // Role breakdown
      query('SELECT role, COUNT(*)::int AS count FROM users GROUP BY role ORDER BY count DESC'),

      // Top contact subjects
      query(`
        SELECT COALESCE(subject, 'No subject') AS subject, COUNT(*)::int AS count
        FROM contacts GROUP BY subject ORDER BY count DESC LIMIT 8
      `),

      // New users today
      query("SELECT COUNT(*)::int AS count FROM users WHERE DATE(created_at) = CURRENT_DATE"),
      // New users this week
      query("SELECT COUNT(*)::int AS count FROM users WHERE created_at >= NOW() - INTERVAL '7 days'"),
      // New users this month
      query("SELECT COUNT(*)::int AS count FROM users WHERE created_at >= NOW() - INTERVAL '30 days'"),
    ])

    res.json({
      stats: {
        totalUsers:    totalUsers.rows[0].count,
        totalContacts: totalContacts.rows[0].count,
        totalTools:    totalTools.rows[0].count,
        newUsersToday: newUsersToday.rows[0].count,
        newUsersWeek:  newUsersWeek.rows[0].count,
        newUsersMonth: newUsersMonth.rows[0].count,
      },
      recentUsers:    recentUsers.rows,
      recentContacts: recentContacts.rows,
      charts: {
        signupsByDay:    signupsByDay.rows,
        contactsByDay:   contactsByDay.rows,
        roleBreakdown:   roleBreakdown.rows,
        topSubjects:     topSubjects.rows,
      }
    })
  } catch (err) { next(err) }
})

// ── POST /api/analytics/query — run custom SQL (SELECT only) ──────────────────
router.post('/query', adminOnly, async (req, res, next) => {
  try {
    const { sql: rawSql, params: rawParams = [] } = req.body
    if (!rawSql || typeof rawSql !== 'string') return res.status(400).json({ error: 'SQL query is required' })

    const trimmed = rawSql.trim().toUpperCase()

    // Safety: only allow SELECT, WITH (CTEs), EXPLAIN
    const allowed = ['SELECT', 'WITH', 'EXPLAIN']
    const startsWithAllowed = allowed.some(keyword => trimmed.startsWith(keyword))
    if (!startsWithAllowed) {
      return res.status(403).json({ error: 'Only SELECT, WITH (CTE), and EXPLAIN queries are allowed for safety.' })
    }

    // Block dangerous keywords
    const dangerous = ['DROP ', 'DELETE ', 'TRUNCATE ', 'UPDATE ', 'INSERT ', 'ALTER ', 'CREATE ', 'GRANT ', 'REVOKE ', 'EXEC', 'EXECUTE']
    const hasDangerous = dangerous.some(kw => trimmed.includes(kw))
    if (hasDangerous) {
      return res.status(403).json({ error: 'Modifying queries (DROP, DELETE, UPDATE, INSERT etc.) are not allowed.' })
    }

    const startTime = Date.now()
    const result    = await query(rawSql, rawParams)
    const duration  = Date.now() - startTime

    res.json({
      rows:      result.rows,
      rowCount:  result.rowCount,
      fields:    result.fields?.map(f => ({ name: f.name, dataTypeID: f.dataTypeID })),
      duration:  duration,
      sql:       rawSql,
    })
  } catch (err) {
    res.status(400).json({ error: err.message, hint: err.hint || null })
  }
})

// ── GET /api/analytics/tables — list all tables with row counts ───────────────
router.get('/tables', adminOnly, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `)

    // Get row counts
    const tables = []
    for (const row of result.rows) {
      const countResult = await query(`SELECT COUNT(*)::int AS count FROM "${row.tablename}"`)
      tables.push({ ...row, rowCount: countResult.rows[0].count })
    }

    res.json({ tables })
  } catch (err) { next(err) }
})

// ── GET /api/analytics/schema/:table — describe a table ──────────────────────
router.get('/schema/:table', adminOnly, async (req, res, next) => {
  try {
    const tableName = req.params.table.replace(/[^a-zA-Z0-9_]/g, '')
    const result = await query(`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_name = $1 AND table_schema = 'public'
      ORDER BY ordinal_position
    `, [tableName])
    res.json({ columns: result.rows, table: tableName })
  } catch (err) { next(err) }
})

module.exports = router
