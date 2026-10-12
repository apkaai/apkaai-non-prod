/**
 * zoom.js — Zoom OAuth + Cloud Recording import
 *
 * Routes:
 *   GET  /api/zoom/auth/url        → Zoom OAuth consent URL
 *   GET  /api/zoom/auth/callback   → exchange code → store tokens
 *   GET  /api/zoom/auth/status     → is user connected to Zoom?
 *   POST /api/zoom/auth/disconnect → revoke & remove Zoom tokens
 *   GET  /api/zoom/recordings      → list Zoom cloud recordings
 *   POST /api/zoom/import/:id      → import a Zoom recording into video processing pipeline
 */
const express = require('express')
const router  = express.Router()
const crypto  = require('crypto')
const https   = require('https')
const { query: dbQuery } = require('../lib/db')

// ── Environment ───────────────────────────────────────────────────────────────
const ZOOM_CLIENT_ID     = process.env.ZOOM_CLIENT_ID     || ''
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET || ''
const FRONTEND_URL       = process.env.FRONTEND_URL       || 'https://apkaai.com'
const ZOOM_REDIRECT_URI  = `${FRONTEND_URL.replace(/\/$/, '')}/api/zoom/auth/callback`

// ── Auth middleware (reuses ApkaAI HMAC JWT pattern) ─────────────────────────
function verifyApkaaiToken(token) {
  try {
    const [payload, sig] = token.split('.')
    const secret   = process.env.JWT_SECRET || 'apkaai-jwt-secret-2026'
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex').slice(0, 32)
    if (sig !== expected) return null
    return JSON.parse(Buffer.from(payload, 'base64url').toString())
  } catch { return null }
}

function requireAuth(req, res, next) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Not authenticated' })
  const decoded = verifyApkaaiToken(auth.split(' ')[1])
  if (!decoded) return res.status(401).json({ error: 'Invalid or expired token' })
  req.user = decoded
  next()
}

// ── Ensure zoom_tokens table ─────────────────────────────────────────────────
async function ensureZoomTable() {
  await dbQuery(`
    CREATE TABLE IF NOT EXISTS zoom_tokens (
      user_id       UUID         PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
      zoom_user_id  VARCHAR(200),
      zoom_email    VARCHAR(200),
      access_token  TEXT         NOT NULL,
      refresh_token TEXT,
      token_type    VARCHAR(50)  DEFAULT 'Bearer',
      expires_at    TIMESTAMPTZ,
      scope         TEXT,
      created_at    TIMESTAMPTZ  DEFAULT NOW(),
      updated_at    TIMESTAMPTZ  DEFAULT NOW()
    )
  `)
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = { headers: { 'User-Agent': 'ApkaAI/1.0', ...headers } }
    https.get(url, options, res => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }) }
        catch { resolve({ status: res.statusCode, body: data }) }
      })
    }).on('error', reject)
  })
}

function httpsPost(hostname, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body)
    const opts = {
      hostname, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr), ...headers },
    }
    const req = https.request(opts, res => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }) }
        catch { resolve({ status: res.statusCode, body: data }) }
      })
    })
    req.on('error', reject)
    req.write(bodyStr)
    req.end()
  })
}

async function zoomTokenRequest(params) {
  const bodyStr = new URLSearchParams(params).toString()
  const b64     = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64')
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'zoom.us',
      path: '/oauth/token',
      method: 'POST',
      headers: {
        'Authorization': `Basic ${b64}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
    }
    const req = https.request(opts, res => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }) }
        catch { resolve({ status: res.statusCode, body: data }) }
      })
    })
    req.on('error', reject)
    req.write(bodyStr)
    req.end()
  })
}

async function getValidToken(userId) {
  await ensureZoomTable()
  const r = await dbQuery('SELECT * FROM zoom_tokens WHERE user_id = $1', [userId])
  if (!r.rows[0]) return null
  const row = r.rows[0]
  // Refresh if expired (with 60s buffer)
  if (row.expires_at && new Date(row.expires_at) < new Date(Date.now() + 60000)) {
    if (!row.refresh_token) return null
    const resp = await zoomTokenRequest({ grant_type: 'refresh_token', refresh_token: row.refresh_token })
    if (resp.status !== 200 || !resp.body.access_token) return null
    const expiresAt = new Date(Date.now() + (resp.body.expires_in || 3600) * 1000)
    await dbQuery(
      `UPDATE zoom_tokens SET access_token=$1, refresh_token=$2, expires_at=$3, updated_at=NOW() WHERE user_id=$4`,
      [resp.body.access_token, resp.body.refresh_token || row.refresh_token, expiresAt, userId]
    )
    return resp.body.access_token
  }
  return row.access_token
}

// ── GET /api/zoom/auth/url ────────────────────────────────────────────────────
router.get('/auth/url', requireAuth, (req, res) => {
  if (!ZOOM_CLIENT_ID) {
    return res.status(503).json({
      error: 'Zoom OAuth not configured.',
      hint: 'Add ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET to your .env file.',
    })
  }
  const state = Buffer.from(JSON.stringify({
    userId:    req.user.userId,
    userEmail: req.user.email || '',
    nonce:     crypto.randomBytes(8).toString('hex'),
  })).toString('base64url')

  const url = new URL('https://zoom.us/oauth/authorize')
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', ZOOM_CLIENT_ID)
  url.searchParams.set('redirect_uri', ZOOM_REDIRECT_URI)
  url.searchParams.set('state', state)

  res.json({ url: url.toString() })
})

// ── GET /api/zoom/auth/callback ───────────────────────────────────────────────
router.get('/auth/callback', async (req, res, next) => {
  try {
    const { code, state, error: zoomError } = req.query
    if (zoomError) return res.redirect(`${FRONTEND_URL}/lambda?zoom_error=${encodeURIComponent(zoomError)}`)
    if (!code || !state) return res.status(400).json({ error: 'Missing code or state' })

    let stateData
    try { stateData = JSON.parse(Buffer.from(state, 'base64url').toString()) }
    catch { return res.status(400).json({ error: 'Invalid state' }) }

    const tokenResp = await zoomTokenRequest({
      grant_type: 'authorization_code',
      code,
      redirect_uri: ZOOM_REDIRECT_URI,
    })
    if (tokenResp.status !== 200) {
      return res.redirect(`${FRONTEND_URL}/lambda?zoom_error=token_exchange_failed`)
    }

    const { access_token, refresh_token, expires_in, token_type, scope } = tokenResp.body
    const expiresAt = new Date(Date.now() + (expires_in || 3600) * 1000)

    // Get Zoom user info
    const userResp = await httpsGet('https://api.zoom.us/v2/users/me', {
      Authorization: `Bearer ${access_token}`,
    })
    const zoomUserId = userResp.body.id || ''
    const zoomEmail  = userResp.body.email || stateData.userEmail || ''

    await ensureZoomTable()
    await dbQuery(
      `INSERT INTO zoom_tokens (user_id, zoom_user_id, zoom_email, access_token, refresh_token, token_type, expires_at, scope)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (user_id) DO UPDATE
         SET zoom_user_id=$2, zoom_email=$3, access_token=$4, refresh_token=$5,
             token_type=$6, expires_at=$7, scope=$8, updated_at=NOW()`,
      [stateData.userId, zoomUserId, zoomEmail, access_token, refresh_token, token_type, expiresAt, scope]
    )

    res.redirect(`${FRONTEND_URL}/lambda?zoom_connected=1`)
  } catch (err) { next(err) }
})

// ── GET /api/zoom/auth/status ─────────────────────────────────────────────────
router.get('/auth/status', requireAuth, async (req, res, next) => {
  try {
    await ensureZoomTable()
    const r = await dbQuery(
      'SELECT zoom_email, zoom_user_id, created_at FROM zoom_tokens WHERE user_id = $1',
      [req.user.userId]
    )
    if (!r.rows[0]) return res.json({ connected: false })
    res.json({ connected: true, zoomEmail: r.rows[0].zoom_email, connectedAt: r.rows[0].created_at })
  } catch (err) { next(err) }
})

// ── POST /api/zoom/auth/disconnect ────────────────────────────────────────────
router.post('/auth/disconnect', requireAuth, async (req, res, next) => {
  try {
    await ensureZoomTable()
    // Attempt token revocation (best effort)
    const token = await getValidToken(req.user.userId)
    if (token) {
      try {
        const b64 = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64')
        await new Promise(resolve => {
          const body = `token=${encodeURIComponent(token)}`
          const opts = {
            hostname: 'zoom.us', path: '/oauth/revoke', method: 'POST',
            headers: { Authorization: `Basic ${b64}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          }
          const r = https.request(opts, res => { res.resume(); resolve() })
          r.on('error', resolve)
          r.write(body); r.end()
        })
      } catch { /* ignore revocation errors */ }
    }
    await dbQuery('DELETE FROM zoom_tokens WHERE user_id = $1', [req.user.userId])
    res.json({ success: true, message: 'Zoom account disconnected' })
  } catch (err) { next(err) }
})

// ── GET /api/zoom/recordings ──────────────────────────────────────────────────
router.get('/recordings', requireAuth, async (req, res, next) => {
  try {
    const token = await getValidToken(req.user.userId)
    if (!token) return res.status(401).json({ error: 'Zoom not connected. Please connect your Zoom account first.' })

    const { from, to, page_size = 30 } = req.query
    const params = new URLSearchParams()
    params.set('page_size', String(Math.min(Number(page_size), 100)))
    if (from) params.set('from', from)
    if (to)   params.set('to', to)

    const resp = await httpsGet(
      `https://api.zoom.us/v2/users/me/recordings?${params}`,
      { Authorization: `Bearer ${token}` }
    )

    if (resp.status === 401) {
      await dbQuery('DELETE FROM zoom_tokens WHERE user_id = $1', [req.user.userId])
      return res.status(401).json({ error: 'Zoom token expired. Please reconnect your Zoom account.' })
    }
    if (resp.status !== 200) {
      return res.status(502).json({ error: 'Failed to fetch Zoom recordings', details: resp.body })
    }

    // Shape the response for the frontend
    const meetings = (resp.body.meetings || []).map(m => ({
      meetingId:  m.id,
      uuid:       m.uuid,
      topic:      m.topic,
      startTime:  m.start_time,
      duration:   m.duration,
      files:      (m.recording_files || [])
        .filter(f => ['MP4', 'M4A'].includes(f.file_type))
        .map(f => ({
          fileId:     f.id,
          fileType:   f.file_type,
          fileSize:   f.file_size,
          status:     f.status,
          downloadUrl: f.download_url,
          recordingType: f.recording_type,
          recordingStart: f.recording_start,
          recordingEnd: f.recording_end,
        })),
    })).filter(m => m.files.length > 0)

    res.json({
      meetings,
      totalRecords: resp.body.total_records || meetings.length,
      from:         resp.body.from,
      to:           resp.body.to,
    })
  } catch (err) { next(err) }
})

// ── POST /api/zoom/import/:meetingId ──────────────────────────────────────────
// Trigger import of a specific Zoom recording file into the video pipeline
router.post('/import/:meetingId', requireAuth, async (req, res, next) => {
  try {
    const { meetingId } = req.params
    const { fileId, topic, startTime } = req.body

    if (!fileId) return res.status(400).json({ error: 'fileId is required' })

    const token = await getValidToken(req.user.userId)
    if (!token) return res.status(401).json({ error: 'Zoom not connected' })

    // Get the specific recording to get a fresh download URL
    const resp = await httpsGet(
      `https://api.zoom.us/v2/meetings/${meetingId}/recordings`,
      { Authorization: `Bearer ${token}` }
    )
    if (resp.status !== 200) {
      return res.status(502).json({ error: 'Could not fetch recording details from Zoom' })
    }

    const file = (resp.body.recording_files || []).find(f => f.id === fileId)
    if (!file) return res.status(404).json({ error: 'Recording file not found' })
    if (file.status !== 'completed') {
      return res.status(400).json({ error: `Recording is not ready. Status: ${file.status}` })
    }

    // Delegate to the video processing route — return the videoId so frontend can track
    // The actual download+S3 upload is handled asynchronously by the video processing service
    const videoId = `zoom-${meetingId}-${fileId}-${Date.now()}`
    res.json({
      success:     true,
      videoId,
      message:     'Zoom recording queued for import. Check the video library for processing status.',
      downloadUrl: file.download_url,  // caller (video processing route) uses this
      topic:       resp.body.topic || topic,
      startTime:   resp.body.start_time || startTime,
      fileSize:    file.file_size,
      fileType:    file.file_type,
    })
  } catch (err) { next(err) }
})

module.exports = router
