/**
 * datalake.js — ApkaAI Full Data Lake API
 * Endpoints:
 *   ETL:      POST /etl/upload, /etl/text, /etl/drive, /etl/s3
 *   Tables:   GET /tables, GET /tables/:name/preview, DELETE /tables/:name
 *   Query:    POST /query (PostgreSQL), POST /athena/query (Athena), GET /query/templates
 *   S3:       GET /s3/browse, GET /s3/summary, DELETE /s3/object
 *   Glue:     GET /glue/tables, POST /glue/crawl
 *   Analytics:GET /analytics/overview
 *   Schema:   GET /schema
 *   Jobs:     GET /jobs, POST /jobs/:id/run
 */
const express  = require('express')
const router   = express.Router()
const multer   = require('multer')
const { query } = require('../lib/db')
const { runETL, listETLTables, dropETLTable } = require('../etl/etlPipeline')
const { s3Upload, s3GetObject, s3List, s3Delete, s3PresignedUrl, s3FolderSummary } = require('../lib/s3')

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } })

// ── Auth middleware ────────────────────────────────────────────────────────────
function adminOnly(req, res, next) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Not authenticated' })
  const token = auth.split(' ')[1]
  if (token.startsWith('admin-token-')) return next()
  try {
    const decoded = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString())
    if (decoded.role === 'admin') return next()
    query('SELECT role FROM users WHERE user_id = $1', [decoded.userId])
      .then(r => r.rows[0]?.role === 'admin' ? next() : res.status(403).json({ error: 'Admin only' }))
      .catch(() => res.status(403).json({ error: 'Admin only' }))
  } catch { return res.status(401).json({ error: 'Invalid token' }) }
}

// ══════════════════════════════════════════════════════════════════════════════
// ETL ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════════

// POST /api/datalake/etl/upload — file upload (CSV, TSV, JSON, NDJSON, Excel, txt)
router.post('/etl/upload', adminOnly, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    const fileName = req.file.originalname
    const mode     = req.body.mode || 'append'
    const sheet    = req.body.sheet || null
    const ext      = fileName.split('.').pop().toLowerCase()
    const formatMap = { csv:'csv', tsv:'tsv', txt:'txt', json:'json', ndjson:'ndjson', jsonl:'ndjson', xlsx:'xlsx', xls:'xls' }
    const format    = formatMap[ext] || 'auto'
    const result    = await runETL(format, req.file.buffer, fileName, { mode, sheet, source: 'upload' })
    res.json(result)
  } catch (err) { next(err) }
})

// POST /api/datalake/etl/text — paste raw CSV/JSON
router.post('/etl/text', adminOnly, async (req, res, next) => {
  try {
    const { content, format = 'csv', tableName, mode = 'append' } = req.body
    if (!content)   return res.status(400).json({ error: 'content is required' })
    if (!tableName) return res.status(400).json({ error: 'tableName is required' })
    const result = await runETL(format, content, tableName, { mode, source: 'paste' })
    res.json(result)
  } catch (err) { next(err) }
})

// POST /api/datalake/etl/drive — import from Google Drive by fileId
router.post('/etl/drive', adminOnly, async (req, res, next) => {
  try {
    const { fileId, format, tableName, mode = 'append', sheet } = req.body
    const SERVICE_KEY = process.env.GOOGLE_SERVICE_KEY
    if (!SERVICE_KEY) return res.status(400).json({ error: 'GOOGLE_SERVICE_KEY not configured in .env', instruction: 'Add your Google Service Account JSON as GOOGLE_SERVICE_KEY' })
    if (!fileId) return res.status(400).json({ error: 'fileId is required' })

    const { google } = require('googleapis')
    const creds  = JSON.parse(SERVICE_KEY)
    const auth   = new google.auth.GoogleAuth({ credentials: creds, scopes: ['https://www.googleapis.com/auth/drive.readonly'] })
    const drive  = google.drive({ version: 'v3', auth })

    // Get file metadata
    const meta = await drive.files.get({ fileId, fields: 'name,mimeType,size' })
    const mimeType = meta.data.mimeType
    const name     = tableName || meta.data.name

    let buffer, detectedFormat = format

    // Handle Google Sheets → export as CSV
    if (mimeType === 'application/vnd.google-apps.spreadsheet') {
      const exp = await drive.files.export({ fileId, mimeType: 'text/csv' }, { responseType: 'arraybuffer' })
      buffer = Buffer.from(exp.data)
      detectedFormat = detectedFormat || 'csv'
    } else if (mimeType === 'application/vnd.google-apps.document') {
      const exp = await drive.files.export({ fileId, mimeType: 'text/plain' }, { responseType: 'arraybuffer' })
      buffer = Buffer.from(exp.data)
      detectedFormat = detectedFormat || 'txt'
    } else {
      // Binary download
      const dl = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'arraybuffer' })
      buffer = Buffer.from(dl.data)
      // Auto-detect format from name
      const ext = meta.data.name.split('.').pop().toLowerCase()
      detectedFormat = detectedFormat || { csv:'csv', tsv:'tsv', json:'json', ndjson:'ndjson', xlsx:'xlsx', xls:'xls', txt:'txt' }[ext] || 'csv'
    }

    // Upload raw to S3
    const bucket = process.env.DATALAKE_BUCKET
    if (bucket) {
      const s3key = `raw/drive/${Date.now()}_${meta.data.name}`
      await s3Upload(bucket, s3key, buffer, meta.data.name).catch(() => {})
    }

    const result = await runETL(detectedFormat, buffer, name, { mode, sheet, source: 'drive' })
    res.json({ ...result, driveFile: meta.data.name, mimeType })
  } catch (err) { next(err) }
})

// POST /api/datalake/etl/s3 — import from S3 key
router.post('/etl/s3', adminOnly, async (req, res, next) => {
  try {
    const { s3Key, format, tableName, mode = 'append', sheet } = req.body
    const bucket = process.env.DATALAKE_BUCKET
    if (!bucket) return res.status(400).json({ error: 'DATALAKE_BUCKET not configured' })
    if (!s3Key)  return res.status(400).json({ error: 's3Key is required' })
    const { buffer } = await s3GetObject(bucket, s3Key)
    const name = tableName || s3Key.split('/').pop()
    const ext  = s3Key.split('.').pop().toLowerCase()
    const fmt  = format || { csv:'csv', tsv:'tsv', json:'json', ndjson:'ndjson', xlsx:'xlsx', xls:'xls' }[ext] || 'csv'
    const result = await runETL(fmt, buffer, name, { mode, sheet, source: 's3' })
    res.json({ ...result, s3Key })
  } catch (err) { next(err) }
})

// ══════════════════════════════════════════════════════════════════════════════
// TABLE MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════

router.get('/tables', adminOnly, async (req, res, next) => {
  try {
    const etlTables = await listETLTables()
    const core = await query(`
      SELECT t.tablename, pg_size_pretty(pg_total_relation_size('public.'||t.tablename)) AS size
      FROM pg_tables t WHERE t.schemaname='public' AND t.tablename NOT LIKE 'dl_%' ORDER BY t.tablename`)
    const coreTables = []
    for (const row of core.rows) {
      const cnt  = await query(`SELECT COUNT(*)::int AS n FROM "${row.tablename}"`)
      const cols = await query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name=$1 AND table_schema='public' ORDER BY ordinal_position`, [row.tablename])
      coreTables.push({ name: row.tablename, rows: cnt.rows[0].n, size: row.size, columns: cols.rows, source: 'postgresql' })
    }
    res.json({ etlTables, coreTables, totalTables: etlTables.length + coreTables.length })
  } catch (err) { next(err) }
})

router.get('/tables/:name/preview', adminOnly, async (req, res, next) => {
  try {
    const safe  = req.params.name.replace(/[^a-z0-9_]/gi, '')
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 1000)
    const result = await query(`SELECT * FROM "${safe}" LIMIT $1`, [limit])
    res.json({ rows: result.rows, columns: result.fields?.map(f => f.name), rowCount: result.rowCount })
  } catch (err) { next(err) }
})

router.delete('/tables/:name', adminOnly, async (req, res, next) => {
  try {
    if (!req.params.name.startsWith('dl_'))
      return res.status(403).json({ error: 'Can only drop ETL tables (dl_ prefix). Core tables are protected.' })
    res.json(await dropETLTable(req.params.name))
  } catch (err) { next(err) }
})

// ══════════════════════════════════════════════════════════════════════════════
// SQL QUERY RUNNER (PostgreSQL)
// ══════════════════════════════════════════════════════════════════════════════

router.post('/query', adminOnly, async (req, res, next) => {
  try {
    const { sql: rawSql, params: rawParams = [], limit: rawLimit = 500 } = req.body
    if (!rawSql) return res.status(400).json({ error: 'sql is required' })
    const trimmed  = rawSql.trim().toUpperCase()
    const allowed  = ['SELECT', 'WITH', 'EXPLAIN']
    if (!allowed.some(kw => trimmed.startsWith(kw)))
      return res.status(403).json({ error: 'Only SELECT, WITH (CTEs), and EXPLAIN queries are allowed.' })
    const dangerous = ['DROP ','DELETE ','TRUNCATE ','UPDATE ','INSERT ','ALTER ','CREATE ','GRANT ','REVOKE ']
    if (dangerous.some(kw => trimmed.includes(kw)))
      return res.status(403).json({ error: 'Write operations are not permitted in the query runner.' })
    const limit    = Math.min(parseInt(rawLimit, 10) || 500, 5000)
    let   finalSql = rawSql.trim()
    if (!trimmed.includes(' LIMIT ') && trimmed.startsWith('SELECT')) finalSql += ` LIMIT ${limit}`
    const t0     = Date.now()
    const result = await query(finalSql, rawParams)
    res.json({ rows: result.rows, rowCount: result.rowCount, columns: result.fields?.map(f => f.name) || [], duration: Date.now()-t0, sql: rawSql, truncated: result.rowCount >= limit })
  } catch (err) { res.status(400).json({ error: err.message, hint: err.hint||null, detail: err.detail||null }) }
})

// ══════════════════════════════════════════════════════════════════════════════
// ATHENA QUERY (S3 Data Lake)
// ══════════════════════════════════════════════════════════════════════════════

router.post('/athena/query', adminOnly, async (req, res, next) => {
  try {
    const { sql, database, maxRows = 1000 } = req.body
    if (!sql) return res.status(400).json({ error: 'sql is required' })
    const { runAthenaQuery } = require('../lib/athena')
    const result = await runAthenaQuery(sql, database, maxRows)
    res.json({ ...result, engine: 'athena' })
  } catch (err) { res.status(400).json({ error: err.message }) }
})

router.get('/athena/history', adminOnly, async (req, res) => {
  try {
    const { listRecentQueries } = require('../lib/athena')
    const queries = await listRecentQueries(20)
    res.json({ queries })
  } catch (err) { res.json({ queries: [], error: err.message }) }
})

// ══════════════════════════════════════════════════════════════════════════════
// S3 DATA LAKE BROWSER
// ══════════════════════════════════════════════════════════════════════════════

router.get('/s3/summary', adminOnly, async (req, res) => {
  try {
    const bucket = process.env.DATALAKE_BUCKET
    if (!bucket) return res.json({ configured: false, message: 'DATALAKE_BUCKET not set in .env' })
    const summary = await s3FolderSummary(bucket)
    res.json({ bucket, summary, configured: true })
  } catch (err) { res.json({ configured: false, error: err.message }) }
})

router.get('/s3/browse', adminOnly, async (req, res) => {
  try {
    const bucket = process.env.DATALAKE_BUCKET
    if (!bucket) return res.json({ files: [], configured: false })
    const prefix  = req.query.prefix || ''
    const files   = await s3List(bucket, prefix, 200)
    res.json({ files, bucket, prefix, configured: true })
  } catch (err) { res.json({ files: [], error: err.message }) }
})

router.delete('/s3/object', adminOnly, async (req, res) => {
  try {
    const { key } = req.body
    const bucket  = process.env.DATALAKE_BUCKET
    if (!bucket || !key) return res.status(400).json({ error: 'bucket or key missing' })
    await s3Delete(bucket, key)
    res.json({ success: true, deleted: key })
  } catch (err) { next(err) }
})

router.get('/s3/presign', adminOnly, async (req, res) => {
  try {
    const { key } = req.query
    const bucket  = process.env.DATALAKE_BUCKET
    if (!bucket || !key) return res.status(400).json({ error: 'bucket or key missing' })
    const url = await s3PresignedUrl(bucket, key, 3600)
    res.json({ url, expiresIn: 3600 })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ══════════════════════════════════════════════════════════════════════════════
// GLUE CATALOG
// ══════════════════════════════════════════════════════════════════════════════

router.get('/glue/tables', adminOnly, async (req, res) => {
  try {
    const { GlueClient, GetTablesCommand, GetDatabasesCommand } = require('@aws-sdk/client-glue')
    const glue = new GlueClient({ region: process.env.AWS_REGION || 'ap-south-1' })
    const database = process.env.GLUE_DATABASE || 'apkaai_datalake'
    const [tablesRes, dbRes] = await Promise.all([
      glue.send(new GetTablesCommand({ DatabaseName: database })),
      glue.send(new GetDatabasesCommand({})),
    ])
    const tables = (tablesRes.TableList || []).map(t => ({
      name:        t.Name,
      database:    t.DatabaseName,
      location:    t.StorageDescriptor?.Location,
      inputFormat: t.StorageDescriptor?.InputFormat?.split('.').pop(),
      columns:     t.StorageDescriptor?.Columns?.map(c => ({ name: c.Name, type: c.Type })),
      rowCount:    t.Parameters?.['recordCount'],
      createdAt:   t.CreateTime,
      updatedAt:   t.UpdateTime,
    }))
    const databases = (dbRes.DatabaseList || []).map(d => ({ name: d.Name, location: d.LocationUri }))
    res.json({ tables, databases, catalog: 'AwsDataCatalog', database })
  } catch (err) { res.json({ tables: [], databases: [], error: err.message }) }
})

// Trigger Glue crawler (if configured)
router.post('/glue/crawl', adminOnly, async (req, res) => {
  try {
    const { GlueClient, StartCrawlerCommand } = require('@aws-sdk/client-glue')
    const glue    = new GlueClient({ region: process.env.AWS_REGION || 'ap-south-1' })
    const crawler = req.body.crawler || process.env.GLUE_CRAWLER_NAME || 'apkaai-datalake-crawler'
    await glue.send(new StartCrawlerCommand({ Name: crawler }))
    res.json({ success: true, crawler, message: `Crawler "${crawler}" started` })
  } catch (err) { res.json({ success: false, error: err.message }) }
})

// ══════════════════════════════════════════════════════════════════════════════
// ANALYTICS OVERVIEW
// ══════════════════════════════════════════════════════════════════════════════

router.get('/analytics/overview', adminOnly, async (req, res, next) => {
  try {
    const [
      users, contacts, tools,
      newToday, newWeek, newMonth,
      signupsByDay, contactsByDay,
      roleBreakdown, toolsByCategory, toolsByPricing,
      topRatedTools, etlTableCount, dbSize
    ] = await Promise.all([
      query('SELECT COUNT(*)::int AS n FROM users'),
      query('SELECT COUNT(*)::int AS n FROM contacts'),
      query('SELECT COUNT(*)::int AS n FROM tools'),
      query("SELECT COUNT(*)::int AS n FROM users WHERE DATE(created_at)=CURRENT_DATE"),
      query("SELECT COUNT(*)::int AS n FROM users WHERE created_at>=NOW()-INTERVAL '7 days'"),
      query("SELECT COUNT(*)::int AS n FROM users WHERE created_at>=NOW()-INTERVAL '30 days'"),
      query("SELECT TO_CHAR(DATE(created_at),'YYYY-MM-DD') AS day, COUNT(*)::int AS count FROM users WHERE created_at>=NOW()-INTERVAL '30 days' GROUP BY DATE(created_at) ORDER BY day"),
      query("SELECT TO_CHAR(DATE(created_at),'YYYY-MM-DD') AS day, COUNT(*)::int AS count FROM contacts WHERE created_at>=NOW()-INTERVAL '30 days' GROUP BY DATE(created_at) ORDER BY day"),
      query("SELECT role, COUNT(*)::int AS count FROM users GROUP BY role ORDER BY count DESC"),
      query("SELECT COALESCE(category,'Other') AS category, COUNT(*)::int AS count FROM tools GROUP BY category ORDER BY count DESC LIMIT 10"),
      query("SELECT COALESCE(pricing,'Unknown') AS pricing, COUNT(*)::int AS count FROM tools GROUP BY pricing ORDER BY count DESC"),
      query("SELECT name, category, rating, reviews FROM tools ORDER BY rating DESC, reviews DESC LIMIT 5"),
      query("SELECT COUNT(*)::int AS n FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'dl_%'"),
      query("SELECT pg_size_pretty(pg_database_size(current_database())) AS size"),
    ])

    // Fill in missing days for charts
    function fillDays(rows, days = 30) {
      const map = {}; rows.forEach(r => { map[r.day] = r.count })
      const result = []; const now = new Date()
      for (let i = days-1; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i)
        const key = d.toISOString().slice(0, 10)
        result.push({ day: key, count: map[key] || 0 })
      }
      return result
    }

    res.json({
      stats: {
        totalUsers:    users.rows[0].n,
        totalContacts: contacts.rows[0].n,
        totalTools:    tools.rows[0].n,
        newUsersToday: newToday.rows[0].n,
        newUsersWeek:  newWeek.rows[0].n,
        newUsersMonth: newMonth.rows[0].n,
        etlTables:     etlTableCount.rows[0].n,
        dbSize:        dbSize.rows[0].size,
      },
      charts: {
        signupsByDay:    fillDays(signupsByDay.rows, 30),
        contactsByDay:   fillDays(contactsByDay.rows, 30),
        roleBreakdown:   roleBreakdown.rows,
        toolsByCategory: toolsByCategory.rows,
        toolsByPricing:  toolsByPricing.rows,
        topRatedTools:   topRatedTools.rows,
      }
    })
  } catch (err) { next(err) }
})

// ══════════════════════════════════════════════════════════════════════════════
// QUERY TEMPLATES
// ══════════════════════════════════════════════════════════════════════════════

router.get('/query/templates', adminOnly, (req, res) => {
  res.json({ templates: [
    { category: 'Users', emoji: '👥', queries: [
      { label: 'All Users',              sql: `SELECT user_id, name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 100` },
      { label: 'Total User Count',       sql: `SELECT COUNT(*) AS total_users FROM users` },
      { label: 'Users by Role',          sql: `SELECT role, COUNT(*) AS count FROM users GROUP BY role ORDER BY count DESC` },
      { label: 'Signups Last 30 Days',   sql: `SELECT DATE(created_at) AS day, COUNT(*) AS signups FROM users WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY day ORDER BY day` },
      { label: 'New Users Today',        sql: `SELECT * FROM users WHERE DATE(created_at) = CURRENT_DATE ORDER BY created_at DESC` },
      { label: 'Admin Users',            sql: `SELECT user_id, name, email, created_at FROM users WHERE role = 'admin'` },
    ]},
    { category: 'Contacts', emoji: '📬', queries: [
      { label: 'All Contacts',           sql: `SELECT id, name, email, subject, status, created_at FROM contacts ORDER BY created_at DESC LIMIT 100` },
      { label: 'Contacts by Status',     sql: `SELECT status, COUNT(*) AS count FROM contacts GROUP BY status ORDER BY count DESC` },
      { label: 'Top Subjects',           sql: `SELECT COALESCE(subject,'No subject') AS subject, COUNT(*) AS count FROM contacts GROUP BY subject ORDER BY count DESC LIMIT 10` },
      { label: 'Unread Contacts',        sql: `SELECT * FROM contacts WHERE status = 'new' ORDER BY created_at DESC` },
    ]},
    { category: 'AI Tools', emoji: '🤖', queries: [
      { label: 'All Tools',              sql: `SELECT id, name, category, pricing, rating, reviews, featured FROM tools ORDER BY reviews DESC` },
      { label: 'Tools by Category',      sql: `SELECT category, COUNT(*) AS count, ROUND(AVG(rating)::numeric,1) AS avg_rating FROM tools GROUP BY category ORDER BY count DESC` },
      { label: 'Highest Rated',          sql: `SELECT name, category, rating, reviews FROM tools ORDER BY rating DESC, reviews DESC LIMIT 10` },
      { label: 'Featured Tools',         sql: `SELECT name, category, pricing, rating FROM tools WHERE featured = true ORDER BY rating DESC` },
      { label: 'Free Tools',             sql: `SELECT name, category, rating FROM tools WHERE pricing = 'Free' ORDER BY rating DESC` },
    ]},
    { category: 'Analytics', emoji: '📊', queries: [
      { label: 'Platform Overview',      sql: `SELECT 'Users' AS metric, COUNT(*)::text AS value FROM users UNION ALL SELECT 'Contacts', COUNT(*)::text FROM contacts UNION ALL SELECT 'Tools', COUNT(*)::text FROM tools` },
      { label: 'Monthly Signups',        sql: `SELECT TO_CHAR(DATE_TRUNC('month',created_at),'Mon YYYY') AS month, COUNT(*) AS signups FROM users GROUP BY DATE_TRUNC('month',created_at) ORDER BY DATE_TRUNC('month',created_at)` },
      { label: 'Latest Activity',        sql: `(SELECT 'signup' AS type, name, email, created_at FROM users ORDER BY created_at DESC LIMIT 5) UNION ALL (SELECT 'contact', name, email, created_at FROM contacts ORDER BY created_at DESC LIMIT 5) ORDER BY created_at DESC` },
      { label: 'DB Table Sizes',         sql: `SELECT tablename, pg_size_pretty(pg_total_relation_size('public.'||tablename)) AS size FROM pg_tables WHERE schemaname='public' ORDER BY pg_total_relation_size('public.'||tablename) DESC` },
    ]},
    { category: 'Data Lake', emoji: '🗄️', queries: [
      { label: 'ETL Tables',             sql: `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'dl_%' ORDER BY tablename` },
      { label: 'All Tables + Sizes',     sql: `SELECT tablename, pg_size_pretty(pg_total_relation_size('public.'||tablename)) AS size FROM pg_tables WHERE schemaname='public' ORDER BY pg_total_relation_size('public.'||tablename) DESC` },
      { label: 'Full Schema',            sql: `SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name, ordinal_position` },
    ]},
  ]})
})

// ── Schema endpoint ────────────────────────────────────────────────────────────
router.get('/schema', adminOnly, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT t.tablename, c.column_name, c.data_type, c.is_nullable, c.column_default
      FROM pg_tables t
      JOIN information_schema.columns c ON c.table_name=t.tablename AND c.table_schema='public'
      WHERE t.schemaname='public'
      ORDER BY t.tablename, c.ordinal_position
    `)
    const schema = {}
    result.rows.forEach(row => {
      if (!schema[row.tablename]) schema[row.tablename] = []
      schema[row.tablename].push({ column: row.column_name, type: row.data_type, nullable: row.is_nullable, default: row.column_default })
    })
    res.json({ schema, tableCount: Object.keys(schema).length })
  } catch (err) { next(err) }
})

// ── ETL job status (track recent jobs in PostgreSQL) ─────────────────────────
router.get('/jobs', adminOnly, async (req, res, next) => {
  try {
    // Create jobs table if not exists
    await query(`CREATE TABLE IF NOT EXISTS dl_etl_jobs (
      id BIGSERIAL PRIMARY KEY, source TEXT, file_name TEXT, format TEXT,
      rows_loaded INT, table_name TEXT, status TEXT, error TEXT,
      duration_ms INT, s3_path TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
    )`)
    const result = await query('SELECT * FROM dl_etl_jobs ORDER BY created_at DESC LIMIT 50')
    res.json({ jobs: result.rows })
  } catch (err) { next(err) }
})

module.exports = router
