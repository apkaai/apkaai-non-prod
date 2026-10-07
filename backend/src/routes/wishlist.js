const express = require('express')
const router  = express.Router()
const crypto  = require('crypto')
const { query } = require('../lib/db')

// ─────────────────────────────────────────────────────────────────────────────
// Auth helper — same HMAC scheme as auth.js
// ─────────────────────────────────────────────────────────────────────────────
function verifyToken(token) {
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
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  const decoded = verifyToken(auth.split(' ')[1])
  if (!decoded) return res.status(401).json({ error: 'Invalid or expired token' })
  req.user = decoded
  next()
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/wishlist
// Get all wishlist items for the logged-in user
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM user_wishlist
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.userId]
    )
    res.json({ items: result.rows, count: result.rowCount })
  } catch (err) { next(err) }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/wishlist/ids
// Return just tool_ids for the user — lightweight check for WishlistButton
// ─────────────────────────────────────────────────────────────────────────────
router.get('/ids', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT tool_id FROM user_wishlist WHERE user_id = $1',
      [req.user.userId]
    )
    res.json({ ids: result.rows.map(r => r.tool_id) })
  } catch (err) { next(err) }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/wishlist/toggle
// Add or remove a tool from the wishlist (toggle)
// Body: { toolId, toolSlug, toolName, toolLogo, toolCategory, toolPricing, toolRating, toolTagline }
// Returns: { wishlisted: true/false }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/toggle', requireAuth, async (req, res, next) => {
  try {
    const {
      toolId, toolSlug, toolName,
      toolLogo, toolCategory, toolPricing,
      toolRating, toolTagline,
    } = req.body

    if (!toolId || !toolSlug || !toolName) {
      return res.status(400).json({ error: 'toolId, toolSlug, and toolName are required' })
    }

    // Check if already wishlisted
    const existing = await query(
      'SELECT id FROM user_wishlist WHERE user_id = $1 AND tool_id = $2',
      [req.user.userId, toolId]
    )

    if (existing.rowCount > 0) {
      // Remove
      await query(
        'DELETE FROM user_wishlist WHERE user_id = $1 AND tool_id = $2',
        [req.user.userId, toolId]
      )
      return res.json({ wishlisted: false, message: 'Removed from wishlist' })
    }

    // Add
    await query(
      `INSERT INTO user_wishlist
         (user_id, tool_id, tool_slug, tool_name, tool_logo, tool_category, tool_pricing, tool_rating, tool_tagline)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (user_id, tool_id) DO NOTHING`,
      [
        req.user.userId,
        toolId,
        toolSlug,
        toolName,
        toolLogo     || '',
        toolCategory || '',
        toolPricing  || '',
        Number(toolRating) || 0,
        toolTagline  || '',
      ]
    )
    res.json({ wishlisted: true, message: 'Added to wishlist' })
  } catch (err) { next(err) }
})

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/wishlist/:toolId
// Remove a specific tool from the wishlist
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:toolId', requireAuth, async (req, res, next) => {
  try {
    await query(
      'DELETE FROM user_wishlist WHERE user_id = $1 AND tool_id = $2',
      [req.user.userId, req.params.toolId]
    )
    res.json({ success: true, wishlisted: false })
  } catch (err) { next(err) }
})

module.exports = router
