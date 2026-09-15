/**
 * etlPipeline.js — ApkaAI Full ETL Pipeline
 * Supports: CSV, TSV, JSON, NDJSON, Excel (.xlsx/.xls), unstructured text/PDF metadata
 * Destinations: PostgreSQL (primary) + S3 raw lake + S3 Parquet-like CSV
 */
require('dotenv').config()
const { query, pool } = require('../lib/db')
const { s3Upload, s3GetObject } = require('../lib/s3')
const path = require('path')

// ── Name sanitizers ────────────────────────────────────────────────────────────
function sanitizeColumnName(name) {
  return ('col_' + name)
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/^col_/, name.match(/^[0-9]/) ? 'col_' : '')
    .slice(0, 63) || 'column'
}

function sanitizeTableName(name) {
  return 'dl_' + name
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/, '')
    .slice(0, 55) || 'dl_import'
}

// ── Type inference ─────────────────────────────────────────────────────────────
function inferPostgresType(values) {
  const sample = values.filter(v => v !== null && v !== '' && v !== undefined).slice(0, 100)
  if (!sample.length) return 'TEXT'
  if (sample.every(v => !isNaN(Number(v)) && !String(v).includes('.'))) return 'BIGINT'
  if (sample.every(v => !isNaN(parseFloat(v)))) return 'NUMERIC'
  if (sample.every(v => /^\d{4}-\d{2}-\d{2}/.test(String(v)))) return 'TIMESTAMPTZ'
  if (sample.every(v => ['true','false','1','0','yes','no'].includes(String(v).toLowerCase()))) return 'BOOLEAN'
  if (sample.some(v => String(v).length > 500)) return 'TEXT'
  return 'TEXT'
}

// ── CSV/TSV parser ─────────────────────────────────────────────────────────────
function parseCSV(content, delimiter = ',') {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim())
  if (!lines.length) return { headers: [], rows: [] }
  // Handle quoted fields
  function splitLine(line, sep) {
    const result = []; let cur = ''; let inQ = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') { inQ = !inQ }
      else if (c === sep && !inQ) { result.push(cur.trim()); cur = '' }
      else { cur += c }
    }
    result.push(cur.trim())
    return result.map(v => v.replace(/^["']|["']$/g, ''))
  }
  const headers = splitLine(lines[0], delimiter)
  const rows = lines.slice(1).map(line => {
    const vals = splitLine(line, delimiter)
    const obj = {}
    headers.forEach((h, i) => { obj[h] = vals[i] ?? null })
    return obj
  })
  return { headers, rows }
}

// ── JSON parser ────────────────────────────────────────────────────────────────
function parseJSON(content) {
  const data = JSON.parse(content)
  if (Array.isArray(data) && data.length > 0) {
    const headers = Object.keys(data[0])
    return { headers, rows: data.map(r => { const o = {}; headers.forEach(h => { o[h] = r[h] ?? null }); return o }) }
  }
  if (typeof data === 'object' && data !== null) {
    // Single object → one row
    const headers = Object.keys(data)
    return { headers, rows: [data] }
  }
  throw new Error('JSON must be an array of objects or a single object')
}

// ── NDJSON parser ──────────────────────────────────────────────────────────────
function parseNDJSON(content) {
  const rows = content.trim().split('\n').filter(l => l.trim()).map(l => JSON.parse(l.trim()))
  const headers = [...new Set(rows.flatMap(r => Object.keys(r)))]
  return { headers, rows: rows.map(r => { const o = {}; headers.forEach(h => { o[h] = r[h] ?? null }); return o }) }
}

// ── Excel parser (.xlsx / .xls) ────────────────────────────────────────────────
function parseExcel(buffer, sheetName = null) {
  let XLSX
  try { XLSX = require('xlsx') } catch { throw new Error('xlsx package not installed. Run: npm install xlsx') }
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const wsName = sheetName || wb.SheetNames[0]
  const ws = wb.Sheets[wsName]
  if (!ws) throw new Error(`Sheet "${wsName}" not found. Available: ${wb.SheetNames.join(', ')}`)
  const rows = XLSX.utils.sheet_to_json(ws, { defval: null, raw: false })
  if (!rows.length) return { headers: [], rows: [], sheets: wb.SheetNames }
  const headers = Object.keys(rows[0])
  return { headers, rows, sheets: wb.SheetNames }
}

// ── Unstructured text / PDF metadata parser ───────────────────────────────────
function parseUnstructured(content, fileName) {
  // Wrap as single-row with raw content + metadata
  const ext = path.extname(fileName).toLowerCase()
  const lines = content.split('\n').filter(l => l.trim())
  const wordCount = content.split(/\s+/).filter(Boolean).length
  const rows = [{
    file_name:   fileName,
    file_type:   ext,
    content:     content.slice(0, 10000),  // first 10K chars
    char_count:  content.length,
    word_count:  wordCount,
    line_count:  lines.length,
    preview:     content.slice(0, 500),
  }]
  return { headers: Object.keys(rows[0]), rows }
}

// ── Load into PostgreSQL ───────────────────────────────────────────────────────
async function loadIntoPostgres(tableName, headers, rows, options = {}) {
  const safeTable = sanitizeTableName(tableName)
  const rawCols   = headers.map(sanitizeColumnName)
  // Deduplicate column names
  const seen = {}
  const uniqueCols = rawCols.map((c, i) => {
    const base = c; let name = base; let n = 1
    while (seen[name] !== undefined) { name = `${base}_${n++}` }
    seen[name] = i; return name
  })

  const colTypes = uniqueCols.map((col, i) => {
    const vals = rows.map(r => Object.values(r)[i])
    return { col, type: inferPostgresType(vals) }
  })

  if (options.mode === 'replace') {
    await query(`DROP TABLE IF EXISTS "${safeTable}"`)
  }

  const colDefs = [
    `_etl_id BIGSERIAL PRIMARY KEY`,
    `_etl_source TEXT DEFAULT '${tableName.replace(/'/g,"''")}' `,
    `_etl_loaded_at TIMESTAMPTZ DEFAULT NOW()`,
    ...colTypes.map(({ col, type }) => `"${col}" ${type}`)
  ].join(', ')

  await query(`CREATE TABLE IF NOT EXISTS "${safeTable}" (${colDefs})`)

  // Batch insert
  let loaded = 0
  const batchSize = 200
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const flatVals = []
    const phs = batch.map(row => {
      const rowVals = Object.values(row)
      const start = flatVals.length + 1
      rowVals.forEach(v => flatVals.push(v === '' ? null : v))
      return `(${uniqueCols.map((_, vi) => `$${start + vi}`).join(', ')})`
    })
    const colStr = uniqueCols.map(c => `"${c}"`).join(', ')
    await query(`INSERT INTO "${safeTable}" (${colStr}) VALUES ${phs.join(', ')}`, flatVals)
    loaded += batch.length
  }
  return { table: safeTable, columns: colTypes, rows: loaded, status: 'success' }
}

// ── Upload raw file to S3 ──────────────────────────────────────────────────────
async function uploadRawToS3(buffer, fileName, source = 'upload') {
  try {
    const bucket = process.env.DATALAKE_BUCKET
    if (!bucket) return null
    const key = `raw/${source}/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    await s3Upload(bucket, key, buffer, fileName)
    return `s3://${bucket}/${key}`
  } catch (e) {
    console.error('[S3 upload] Skipped:', e.message)
    return null
  }
}

// ── Upload processed CSV to S3 ────────────────────────────────────────────────
async function uploadProcessedToS3(rows, headers, tableName) {
  try {
    const bucket = process.env.DATALAKE_BUCKET
    if (!bucket) return null
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))].join('\n')
    const key  = `processed/csv/${tableName}/${Date.now()}.csv`
    await s3Upload(bucket, key, Buffer.from(csv), `${tableName}.csv`)
    return `s3://${bucket}/${key}`
  } catch (e) {
    console.error('[S3 processed] Skipped:', e.message)
    return null
  }
}

// ── Main ETL entry point ──────────────────────────────────────────────────────
async function runETL(sourceType, contentOrBuffer, fileName, options = {}) {
  let headers, rows, extra = {}
  try {
    const fmt = sourceType.toLowerCase()
    const isBuffer = Buffer.isBuffer(contentOrBuffer)
    const content  = isBuffer ? contentOrBuffer.toString('utf-8') : contentOrBuffer

    switch (fmt) {
      case 'csv':
        ({ headers, rows } = parseCSV(content, ','))
        break
      case 'tsv':
        ({ headers, rows } = parseCSV(content, '\t'))
        break
      case 'json':
        ({ headers, rows } = parseJSON(content))
        break
      case 'ndjson': case 'jsonl':
        ({ headers, rows } = parseNDJSON(content))
        break
      case 'xlsx': case 'xls': case 'excel':
        const buf = isBuffer ? contentOrBuffer : Buffer.from(content)
        const exRes = parseExcel(buf, options.sheet)
        headers = exRes.headers; rows = exRes.rows; extra.sheets = exRes.sheets
        break
      case 'txt': case 'text': case 'unstructured':
        ({ headers, rows } = parseUnstructured(content, fileName))
        break
      default:
        // Try to auto-detect
        if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
          const buf2 = isBuffer ? contentOrBuffer : Buffer.from(content)
          const exR  = parseExcel(buf2, options.sheet)
          headers = exR.headers; rows = exR.rows; extra.sheets = exR.sheets
        } else if (content.trim().startsWith('[') || content.trim().startsWith('{')) {
          try { ({ headers, rows } = parseJSON(content)) } catch { ({ headers, rows } = parseNDJSON(content)) }
        } else if (content.includes('\t')) {
          ({ headers, rows } = parseCSV(content, '\t'))
        } else if (content.includes(',')) {
          ({ headers, rows } = parseCSV(content, ','))
        } else {
          ({ headers, rows } = parseUnstructured(content, fileName))
        }
    }

    if (!rows.length) throw new Error('No data rows found in file')
    if (!headers.length) throw new Error('No column headers found')

    // Upload raw to S3 in background
    const rawBuffer = isBuffer ? contentOrBuffer : Buffer.from(content)
    uploadRawToS3(rawBuffer, fileName, options.source || 'upload').then(s3path => {
      if (s3path) console.log(`[S3] Raw uploaded: ${s3path}`)
    })

    // Load into PostgreSQL
    const result = await loadIntoPostgres(fileName, headers, rows, options)

    // Upload processed CSV to S3 in background
    uploadProcessedToS3(rows, headers, result.table).then(s3path => {
      if (s3path) console.log(`[S3] Processed uploaded: ${s3path}`)
    })

    return {
      success: true,
      ...result,
      ...extra,
      sourceType: fmt,
      message: `✅ Loaded ${rows.length} rows into table "${result.table}" (${headers.length} columns)`,
    }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

// ── List all ETL tables ────────────────────────────────────────────────────────
async function listETLTables() {
  const result = await query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename LIKE 'dl_%'
    ORDER BY tablename
  `)
  const tables = []
  for (const row of result.rows) {
    const count  = await query(`SELECT COUNT(*)::int AS n FROM "${row.tablename}"`)
    const schema = await query(`
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_name = $1 AND table_schema = 'public' AND column_name NOT LIKE '_etl_%'
      ORDER BY ordinal_position
    `, [row.tablename])
    tables.push({ name: row.tablename, rows: count.rows[0].n, columns: schema.rows })
  }
  return tables
}

async function dropETLTable(tableName) {
  const safe = tableName.replace(/[^a-z0-9_]/gi, '')
  await query(`DROP TABLE IF EXISTS "${safe}"`)
  return { success: true, message: `Table "${safe}" dropped` }
}

module.exports = { runETL, listETLTables, dropETLTable, loadIntoPostgres, parseExcel, parseCSV, parseJSON }
