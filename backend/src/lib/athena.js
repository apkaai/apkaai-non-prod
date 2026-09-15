/**
 * athena.js — AWS Athena query runner for ApkaAI Data Lake
 */
const { AthenaClient, StartQueryExecutionCommand, GetQueryExecutionCommand, GetQueryResultsCommand, ListQueryExecutionsCommand, StopQueryExecutionCommand } = require('@aws-sdk/client-athena')

const athena = new AthenaClient({ region: process.env.AWS_REGION || 'ap-south-1' })

const WORKGROUP = process.env.ATHENA_WORKGROUP || 'apkaai-datalake'
const OUTPUT    = process.env.ATHENA_OUTPUT    || ''
const DATABASE  = process.env.GLUE_DATABASE    || 'apkaai_datalake'

// Start a query
async function startQuery(sql, database = DATABASE) {
  const cmd = new StartQueryExecutionCommand({
    QueryString: sql,
    QueryExecutionContext: { Database: database },
    WorkGroup: WORKGROUP,
    ...(OUTPUT ? { ResultConfiguration: { OutputLocation: OUTPUT } } : {}),
  })
  const res = await athena.send(cmd)
  return res.QueryExecutionId
}

// Poll until query finishes (max 5 min)
async function waitForQuery(queryId, maxWaitMs = 300000) {
  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    await new Promise(r => setTimeout(r, 1000))
    const cmd = new GetQueryExecutionCommand({ QueryExecutionId: queryId })
    const res = await athena.send(cmd)
    const state = res.QueryExecution?.Status?.State
    if (state === 'SUCCEEDED') return { state, stats: res.QueryExecution.Statistics }
    if (['FAILED','CANCELLED'].includes(state)) {
      const reason = res.QueryExecution?.Status?.StateChangeReason || state
      throw new Error(`Athena query ${state}: ${reason}`)
    }
  }
  throw new Error('Athena query timed out after 5 minutes')
}

// Get results
async function getResults(queryId, maxRows = 1000) {
  const rows = []
  let columns = []
  let nextToken

  do {
    const cmd = new GetQueryResultsCommand({ QueryExecutionId: queryId, MaxResults: 1000, ...(nextToken ? { NextToken: nextToken } : {}) })
    const res = await athena.send(cmd)
    if (!columns.length && res.ResultSet?.ResultSetMetadata?.ColumnInfo) {
      columns = res.ResultSet.ResultSetMetadata.ColumnInfo.map(c => ({ name: c.Name, type: c.Type }))
    }
    const resultRows = res.ResultSet?.Rows || []
    // Skip header row on first page
    const start = rows.length === 0 ? 1 : 0
    for (let i = start; i < resultRows.length; i++) {
      if (rows.length >= maxRows) break
      const row = {}
      resultRows[i].Data?.forEach((d, idx) => { row[columns[idx]?.name || `col${idx}`] = d.VarCharValue ?? null })
      rows.push(row)
    }
    nextToken = res.NextToken
  } while (nextToken && rows.length < maxRows)

  return { columns: columns.map(c => c.name), rows, rowCount: rows.length }
}

// Run full query cycle: start → wait → results
async function runAthenaQuery(sql, database = DATABASE, maxRows = 1000) {
  const start = Date.now()
  const queryId = await startQuery(sql, database)
  const { stats } = await waitForQuery(queryId)
  const results   = await getResults(queryId, maxRows)
  return {
    ...results,
    queryId,
    duration: Date.now() - start,
    scanBytes: stats?.DataScannedInBytes || 0,
    scanMB:    ((stats?.DataScannedInBytes || 0) / 1048576).toFixed(2),
    executionMs: stats?.TotalExecutionTimeInMillis || 0,
  }
}

// List recent query executions
async function listRecentQueries(maxResults = 20) {
  try {
    const cmd = new ListQueryExecutionsCommand({ WorkGroup: WORKGROUP, MaxResults: maxResults })
    const res = await athena.send(cmd)
    const ids = res.QueryExecutionIds || []
    if (!ids.length) return []
    // Get details for each
    const details = await Promise.all(ids.slice(0, 10).map(async id => {
      try {
        const d = await athena.send(new GetQueryExecutionCommand({ QueryExecutionId: id }))
        return {
          id,
          sql:     d.QueryExecution?.Query?.slice(0, 120),
          state:   d.QueryExecution?.Status?.State,
          duration: d.QueryExecution?.Statistics?.TotalExecutionTimeInMillis,
          scanMB:  ((d.QueryExecution?.Statistics?.DataScannedInBytes || 0)/1048576).toFixed(2),
          submitted: d.QueryExecution?.Status?.SubmissionDateTime,
        }
      } catch { return null }
    }))
    return details.filter(Boolean)
  } catch { return [] }
}

// Stop a running query
async function stopQuery(queryId) {
  await athena.send(new StopQueryExecutionCommand({ QueryExecutionId: queryId }))
  return { success: true, queryId }
}

module.exports = { runAthenaQuery, startQuery, waitForQuery, getResults, listRecentQueries, stopQuery }
