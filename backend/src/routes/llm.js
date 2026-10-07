/**
 * llm.js  —  ApkaAI SLM Search
 *
 * Uses Google Gemini 1.5 Flash as the SLM to intelligently search a user's
 * Google Drive documents and Gmail threads, then return ranked results with
 * file/message locations.
 *
 * OAuth 2.0 flow (user-delegated, not service-account):
 *   GET  /api/llm/auth/url          → returns Google OAuth consent URL
 *   GET  /api/llm/auth/callback     → exchanges code → stores tokens in session/DB
 *   GET  /api/llm/auth/status       → check if user has connected Google
 *   POST /api/llm/auth/disconnect   → revoke & remove tokens
 *
 * Search:
 *   POST /api/llm/search            → { query, sources: ['drive','gmail'], maxResults }
 *
 * Gemini:
 *   POST /api/llm/chat              → direct chat with Gemini (no search)
 */

const express = require('express')
const router  = express.Router()
const crypto  = require('crypto')
const { query: dbQuery } = require('../lib/db')

// ── Lazy-load googleapis (already in package.json) ─────────────────────────
const { google } = require('googleapis')

// ── Environment vars ───────────────────────────────────────────────────────
const GOOGLE_CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     || ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''
const GEMINI_API_KEY        = process.env.GEMINI_API_KEY       || ''
const FRONTEND_URL          = process.env.FRONTEND_URL         || 'https://non-prod.apkaai.com'
const REDIRECT_URI          = `${FRONTEND_URL.replace(/\/$/, '')}/api/llm/auth/callback`

// ── OAuth2 client factory ─────────────────────────────────────────────────
function makeOAuth2Client() {
  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URI)
}

// ── Auth middleware (ApkaAI user token) ───────────────────────────────────
function authRequired(req, res, next) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' })
  try {
    const token   = auth.split(' ')[1]
    const payload = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString())
    req.apkaaiUser = payload
    return next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

// ── Ensure google_tokens table ────────────────────────────────────────────
async function ensureTokensTable() {
  await dbQuery(`
    CREATE TABLE IF NOT EXISTS google_oauth_tokens (
      user_id     VARCHAR(200) PRIMARY KEY,
      user_email  VARCHAR(200),
      tokens      JSONB        NOT NULL,
      scopes      TEXT[],
      created_at  TIMESTAMPTZ  DEFAULT NOW(),
      updated_at  TIMESTAMPTZ  DEFAULT NOW()
    )
  `)
}

async function saveTokens(userId, email, tokens, scopes) {
  await ensureTokensTable()
  await dbQuery(`
    INSERT INTO google_oauth_tokens (user_id, user_email, tokens, scopes, updated_at)
    VALUES ($1, $2, $3, $4, NOW())
    ON CONFLICT (user_id) DO UPDATE
      SET tokens = $3, scopes = $4, user_email = $2, updated_at = NOW()
  `, [userId, email, JSON.stringify(tokens), scopes])
}

async function loadTokens(userId) {
  await ensureTokensTable()
  const r = await dbQuery('SELECT tokens, scopes FROM google_oauth_tokens WHERE user_id = $1', [userId])
  return r.rows[0] || null
}

async function deleteTokens(userId) {
  await ensureTokensTable()
  await dbQuery('DELETE FROM google_oauth_tokens WHERE user_id = $1', [userId])
}

// ── GET /api/llm/auth/url ─────────────────────────────────────────────────
router.get('/auth/url', authRequired, (req, res) => {
  if (!GOOGLE_CLIENT_ID) {
    return res.status(503).json({
      error: 'Google OAuth not configured. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET to .env',
    })
  }
  const oauth2 = makeOAuth2Client()
  const url = oauth2.generateAuthUrl({
    access_type:  'offline',
    prompt:       'consent',
    scope: [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    state: Buffer.from(JSON.stringify({
      userId:    req.apkaaiUser.userId,
      email:     req.apkaaiUser.email,
      ts:        Date.now(),
    })).toString('base64url'),
  })
  res.json({ url })
})

// ── GET /api/llm/auth/callback ────────────────────────────────────────────
// This is called by Google after user consent. It's also the URL the frontend
// redirects to. Backend exchanges code → tokens, stores them, then redirects
// the user back to /llm
router.get('/auth/callback', async (req, res) => {
  const { code, state, error } = req.query
  if (error) return res.redirect(`${FRONTEND_URL}/llm?auth_error=${encodeURIComponent(error)}`)
  if (!code || !state) return res.redirect(`${FRONTEND_URL}/llm?auth_error=missing_params`)

  try {
    const stateData = JSON.parse(Buffer.from(state, 'base64url').toString())
    const oauth2    = makeOAuth2Client()
    const { tokens } = await oauth2.getToken(code)
    oauth2.setCredentials(tokens)

    // Get the user's Google email
    const oauth2Api = google.oauth2({ version: 'v2', auth: oauth2 })
    const profile   = await oauth2Api.userinfo.get()

    await saveTokens(stateData.userId, profile.data.email, tokens, [
      'drive.readonly', 'gmail.readonly',
    ])

    res.redirect(`${FRONTEND_URL}/llm?auth_success=1&google_email=${encodeURIComponent(profile.data.email)}`)
  } catch (err) {
    console.error('[LLM OAuth callback]', err.message)
    res.redirect(`${FRONTEND_URL}/llm?auth_error=${encodeURIComponent(err.message)}`)
  }
})

// ── GET /api/llm/auth/status ──────────────────────────────────────────────
router.get('/auth/status', authRequired, async (req, res) => {
  try {
    const row = await loadTokens(req.apkaaiUser.userId)
    res.json({
      connected:   !!row,
      googleEmail: row?.tokens?.email || null,
      scopes:      row?.scopes || [],
    })
  } catch (err) {
    res.json({ connected: false })
  }
})

// ── POST /api/llm/auth/disconnect ─────────────────────────────────────────
router.post('/auth/disconnect', authRequired, async (req, res) => {
  try {
    const row = await loadTokens(req.apkaaiUser.userId)
    if (row) {
      try {
        const oauth2 = makeOAuth2Client()
        oauth2.setCredentials(row.tokens)
        await oauth2.revokeCredentials()
      } catch { /* ignore revoke errors */ }
      await deleteTokens(req.apkaaiUser.userId)
    }
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Gemini call ───────────────────────────────────────────────────────────
async function callGemini(prompt) {
  if (!GEMINI_API_KEY) {
    return '(Gemini not configured — add GEMINI_API_KEY to .env)'
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`
  const resp = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
    }),
  })
  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Gemini API error: ${err}`)
  }
  const data = await resp.json()
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '(no response)'
}

// ── Search Google Drive ───────────────────────────────────────────────────
async function searchDrive(oauth2Client, queryText, maxResults = 10) {
  const drive = google.drive({ version: 'v3', auth: oauth2Client })

  // Full-text search across all files the user has access to
  const escaped = queryText.replace(/'/g, "\\'")
  const result  = await drive.files.list({
    q:       `fullText contains '${escaped}' and trashed=false`,
    fields:  'files(id,name,mimeType,modifiedTime,size,webViewLink,parents,description,owners)',
    pageSize: maxResults,
    orderBy: 'modifiedTime desc',
  })

  const files = result.data.files || []

  // For small text files, try to get a snippet of content
  const enriched = await Promise.all(files.map(async f => {
    let snippet = ''
    try {
      // Only fetch text-exportable types to get snippets
      const exportable = [
        'application/vnd.google-apps.document',
        'application/vnd.google-apps.spreadsheet',
        'application/vnd.google-apps.presentation',
        'text/plain',
      ]
      if (exportable.includes(f.mimeType)) {
        const mimeMap = {
          'application/vnd.google-apps.document':     'text/plain',
          'application/vnd.google-apps.spreadsheet':  'text/csv',
          'application/vnd.google-apps.presentation': 'text/plain',
          'text/plain':                                'text/plain',
        }
        const exportMime = mimeMap[f.mimeType] || 'text/plain'
        const content = await drive.files.export({ fileId: f.id, mimeType: exportMime })
        const text = typeof content.data === 'string' ? content.data : String(content.data)
        // Extract ~300 chars around the query term
        const idx = text.toLowerCase().indexOf(queryText.toLowerCase())
        if (idx >= 0) {
          const start = Math.max(0, idx - 100)
          const end   = Math.min(text.length, idx + 200)
          snippet = (start > 0 ? '...' : '') + text.slice(start, end) + (end < text.length ? '...' : '')
        } else {
          snippet = text.slice(0, 200) + (text.length > 200 ? '...' : '')
        }
      }
    } catch { /* snippet fetch is best-effort */ }

    return {
      source:      'drive',
      id:          f.id,
      name:        f.name,
      type:        f.mimeType,
      modified:    f.modifiedTime,
      link:        f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
      location:    `Google Drive → ${f.name}`,
      snippet,
      owner:       f.owners?.[0]?.emailAddress || '',
    }
  }))

  return enriched
}

// ── Search Gmail ──────────────────────────────────────────────────────────
async function searchGmail(oauth2Client, queryText, maxResults = 10) {
  const gmail   = google.gmail({ version: 'v1', auth: oauth2Client })

  const listResp = await gmail.users.messages.list({
    userId:  'me',
    q:       queryText,
    maxResults,
  })

  const messages = listResp.data.messages || []
  if (messages.length === 0) return []

  const enriched = await Promise.all(messages.map(async msg => {
    try {
      const detail = await gmail.users.messages.get({
        userId:  'me',
        id:      msg.id,
        format:  'metadata',
        metadataHeaders: ['Subject', 'From', 'To', 'Date'],
      })
      const headers  = detail.data.payload?.headers || []
      const get      = (name) => headers.find(h => h.name === name)?.value || ''
      const subject  = get('Subject') || '(no subject)'
      const from     = get('From')
      const date     = get('Date')
      const snippet  = detail.data.snippet || ''
      const threadId = detail.data.threadId

      return {
        source:   'gmail',
        id:       msg.id,
        name:     subject,
        type:     'email',
        modified: date,
        link:     `https://mail.google.com/mail/#inbox/${threadId}`,
        location: `Gmail → ${subject}`,
        snippet:  snippet.slice(0, 300),
        from,
      }
    } catch { return null }
  }))

  return enriched.filter(Boolean)
}

// ── POST /api/llm/search ──────────────────────────────────────────────────
router.post('/search', authRequired, async (req, res) => {
  const { query: userQuery, sources = ['drive', 'gmail'], maxResults = 10 } = req.body

  if (!userQuery || typeof userQuery !== 'string' || userQuery.trim().length < 2) {
    return res.status(400).json({ error: 'Query must be at least 2 characters' })
  }

  try {
    const row = await loadTokens(req.apkaaiUser.userId)
    if (!row) {
      return res.status(401).json({
        error: 'Google account not connected. Please connect your Google account first.',
        needsAuth: true,
      })
    }

    // Build authenticated OAuth client with stored tokens
    const oauth2 = makeOAuth2Client()
    oauth2.setCredentials(row.tokens)

    // Auto-refresh token if expired
    oauth2.on('tokens', async (newTokens) => {
      const merged = { ...row.tokens, ...newTokens }
      await saveTokens(req.apkaaiUser.userId, row.user_email, merged, row.scopes)
    })

    const q = userQuery.trim()
    const driveResults = sources.includes('drive') ? await searchDrive(oauth2, q, maxResults) : []
    const gmailResults = sources.includes('gmail') ? await searchGmail(oauth2, q, maxResults) : []
    const allResults   = [...driveResults, ...gmailResults]

    if (allResults.length === 0) {
      return res.json({
        query:       q,
        results:     [],
        summary:     `No results found for "${q}" in ${sources.join(' or ')}.`,
        totalFound:  0,
      })
    }

    // Build Gemini prompt to rank and summarise results
    const resultsText = allResults.map((r, i) =>
      `[${i + 1}] Source: ${r.source.toUpperCase()}\n` +
      `    Name: ${r.name}\n` +
      `    Location: ${r.location}\n` +
      `    Link: ${r.link}\n` +
      (r.snippet ? `    Preview: ${r.snippet.slice(0, 200)}\n` : '') +
      (r.from    ? `    From: ${r.from}\n` : '')
    ).join('\n')

    const geminiPrompt =
      `You are a helpful assistant. A user searched for: "${q}"\n\n` +
      `The following documents and emails were found:\n\n${resultsText}\n\n` +
      `Instructions:\n` +
      `1. Write a 2-3 sentence summary of what was found and which result is most relevant.\n` +
      `2. List the top 3 most relevant results with their location and why they match.\n` +
      `3. Be concise. Do not repeat the full list.`

    let summary = ''
    try {
      summary = await callGemini(geminiPrompt)
    } catch (geminiErr) {
      console.warn('[LLM] Gemini call failed:', geminiErr.message)
      summary = `Found ${allResults.length} result(s) for "${q}".`
    }

    res.json({
      query:      q,
      results:    allResults,
      summary,
      totalFound: allResults.length,
      breakdown:  { drive: driveResults.length, gmail: gmailResults.length },
    })
  } catch (err) {
    console.error('[LLM search]', err.message)
    // Handle token expiry / revoked access
    if (err.code === 401 || err.message?.includes('invalid_grant') || err.message?.includes('Token has been expired')) {
      await deleteTokens(req.apkaaiUser.userId).catch(() => {})
      return res.status(401).json({
        error: 'Google session expired. Please reconnect your Google account.',
        needsAuth: true,
      })
    }
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/llm/chat ────────────────────────────────────────────────────
// Direct Gemini chat — no search context
router.post('/chat', authRequired, async (req, res) => {
  const { message } = req.body
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required' })
  }
  try {
    const reply = await callGemini(message)
    res.json({ reply })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
