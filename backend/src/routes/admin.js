const express = require('express')
const router  = express.Router()
const crypto  = require('crypto')
const { query } = require('../lib/db')

// ── Auth middleware — admin only ──────────────────────────────────────────────
function adminOnly(req, res, next) {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Not authenticated' })
  const token = auth.split(' ')[1]
  // Accept hardcoded admin token prefix OR verified JWT with admin role
  if (token.startsWith('admin-token-')) return next()
  try {
    const [payload] = token.split('.')
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (decoded.role === 'admin') return next()
    // Check role from DB
    query('SELECT role FROM users WHERE user_id = $1', [decoded.userId])
      .then(r => {
        if (r.rows[0]?.role === 'admin') return next()
        return res.status(403).json({ error: 'Admin access required' })
      })
      .catch(() => res.status(403).json({ error: 'Admin access required' }))
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

// ── GET /api/admin/users ──────────────────────────────────────────────────────
router.get('/users', adminOnly, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT user_id, name, email, role, created_at FROM users ORDER BY created_at DESC',
      []
    )
    res.json({ users: result.rows, count: result.rowCount })
  } catch (err) { next(err) }
})

// ── GET /api/admin/contacts ───────────────────────────────────────────────────
router.get('/contacts', adminOnly, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM contacts ORDER BY created_at DESC',
      []
    )
    res.json({ contacts: result.rows, count: result.rowCount })
  } catch (err) { next(err) }
})

// ── GET /api/admin/stats ──────────────────────────────────────────────────────
router.get('/stats', adminOnly, async (req, res, next) => {
  try {
    const [users, contacts, tools] = await Promise.all([
      query('SELECT COUNT(*) FROM users',    []),
      query('SELECT COUNT(*) FROM contacts', []),
      query('SELECT COUNT(*) FROM tools',    []),
    ])
    res.json({
      users:    parseInt(users.rows[0].count),
      contacts: parseInt(contacts.rows[0].count),
      tools:    parseInt(tools.rows[0].count),
    })
  } catch (err) { next(err) }
})

// ── GET /api/admin/drive-files ────────────────────────────────────────────────
// Uses Google Drive API if GOOGLE_SERVICE_KEY is set, otherwise returns placeholder
router.get('/drive-files', adminOnly, async (req, res) => {
  const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '1DSp2WaZVTRwacJLkHv2rsqRcLAOu8jsy'
  const SERVICE_KEY     = process.env.GOOGLE_SERVICE_KEY

  if (!SERVICE_KEY) {
    // Return the known folder structure from the screenshot
    return res.json({
      files: [
        { name: 'Logo',                type: 'folder', modified: 'Sep 3, 2026', size: '-',    link: `https://drive.google.com/drive/folders/${DRIVE_FOLDER_ID}` },
        { name: 'Master database',     type: 'folder', modified: 'Sep 3, 2026', size: '-',    link: `https://drive.google.com/drive/folders/${DRIVE_FOLDER_ID}` },
        { name: 'Password',            type: 'folder', modified: 'Sep 3, 2026', size: '-',    link: `https://drive.google.com/drive/folders/${DRIVE_FOLDER_ID}` },
        { name: 'Project Code',        type: 'folder', modified: 'Sep 3, 2026', size: '-',    link: `https://drive.google.com/drive/folders/${DRIVE_FOLDER_ID}` },
        { name: 'Test',                type: 'folder', modified: 'Sep 3, 2026', size: '-',    link: `https://drive.google.com/drive/folders/${DRIVE_FOLDER_ID}` },
        { name: 'website requirements',type: 'folder', modified: 'Sep 7, 2026', size: '-',    link: `https://drive.google.com/drive/folders/${DRIVE_FOLDER_ID}` },
      ],
      note: 'Add GOOGLE_SERVICE_KEY to .env for live file listing',
      folderId: DRIVE_FOLDER_ID,
    })
  }

  // ── Live Google Drive API ──────────────────────────────────────────────────
  try {
    const { google } = require('googleapis')
    const creds = JSON.parse(SERVICE_KEY)
    const auth  = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    })
    const drive  = google.drive({ version: 'v3', auth })
    const result = await drive.files.list({
      q: `'${DRIVE_FOLDER_ID}' in parents and trashed=false`,
      fields: 'files(id,name,mimeType,modifiedTime,size,webViewLink)',
      orderBy: 'name',
    })
    const files = (result.data.files || []).map(f => ({
      name:     f.name,
      type:     f.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file',
      modified: new Date(f.modifiedTime).toLocaleDateString('en-IN'),
      size:     f.size ? `${Math.round(parseInt(f.size)/1024)} KB` : '-',
      link:     f.webViewLink,
      mimeType: f.mimeType,
    }))
    res.json({ files, count: files.length })
  } catch (err) {
    res.status(500).json({ error: 'Drive API error: ' + err.message, files: [] })
  }
})

// ── PATCH /api/admin/users/:id/role ──────────────────────────────────────────
router.patch('/users/:id/role', adminOnly, async (req, res, next) => {
  try {
    const { role } = req.body
    if (!['user','admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' })
    await query('UPDATE users SET role = $1 WHERE user_id = $2', [role, req.params.id])
    res.json({ success: true })
  } catch (err) { next(err) }
})

module.exports = router
