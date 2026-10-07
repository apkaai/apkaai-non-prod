const express = require('express')
const router  = express.Router()
const crypto  = require('crypto')
const { query } = require('../lib/db')

// ─────────────────────────────────────────────────────────────────────────────
// Auth helpers
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
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Not authenticated' })
  const decoded = verifyToken(auth.split(' ')[1])
  if (!decoded) return res.status(401).json({ error: 'Invalid or expired token' })
  req.user = decoded
  next()
}

function adminOnly(req, res, next) {
  requireAuth(req, res, async () => {
    try {
      const r = await query('SELECT role FROM users WHERE user_id = $1', [req.user.userId])
      if (r.rows[0]?.role === 'admin') return next()
      return res.status(403).json({ error: 'Admin access required' })
    } catch (err) { next(err) }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reviews/:toolSlug
// All reviews for a tool — public, paginated
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:toolSlug', async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query
    const offset = (Number(page) - 1) * Number(limit)

    const reviewsResult = await query(
      `SELECT
         r.id, r.tool_id, r.rating, r.title, r.body, r.helpful, r.created_at,
         u.name AS user_name,
         LEFT(u.email, 1) || '***@' || SPLIT_PART(u.email,'@',2) AS user_email_masked
       FROM tool_reviews r
       JOIN users u ON u.user_id = r.user_id
       WHERE r.tool_slug = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.params.toolSlug, Number(limit), offset]
    )

    const countResult = await query(
      'SELECT COUNT(*), AVG(rating)::NUMERIC(3,1) AS avg_rating FROM tool_reviews WHERE tool_slug = $1',
      [req.params.toolSlug]
    )

    // Rating distribution
    const distResult = await query(
      `SELECT rating, COUNT(*) AS count
       FROM tool_reviews WHERE tool_slug = $1
       GROUP BY rating ORDER BY rating DESC`,
      [req.params.toolSlug]
    )

    res.json({
      reviews:     reviewsResult.rows,
      total:       parseInt(countResult.rows[0].count, 10),
      avgRating:   parseFloat(countResult.rows[0].avg_rating) || 0,
      distribution: distResult.rows,
      page:        Number(page),
      limit:       Number(limit),
    })
  } catch (err) { next(err) }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reviews/:toolSlug/mine
// Get the logged-in user's own review for a tool
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:toolSlug/mine', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM tool_reviews WHERE tool_slug = $1 AND user_id = $2',
      [req.params.toolSlug, req.user.userId]
    )
    res.json({ review: result.rows[0] || null })
  } catch (err) { next(err) }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/reviews/:toolSlug
// Submit or update a review (one per user per tool)
// Body: { toolId, rating, title, body }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:toolSlug', requireAuth, async (req, res, next) => {
  try {
    const { toolId, rating, title, body } = req.body

    if (!toolId)  return res.status(400).json({ error: 'toolId is required' })
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'rating must be between 1 and 5' })
    }

    const result = await query(
      `INSERT INTO tool_reviews (tool_id, tool_slug, user_id, rating, title, body)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (tool_id, user_id)
       DO UPDATE SET rating = $4, title = $5, body = $6, updated_at = NOW()
       RETURNING *`,
      [toolId, req.params.toolSlug, req.user.userId, rating, title?.trim() || null, body?.trim() || null]
    )

    res.status(201).json({ success: true, review: result.rows[0] })
  } catch (err) { next(err) }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/reviews/:reviewId/helpful
// Mark a review as helpful (+1)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:reviewId/helpful', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      'UPDATE tool_reviews SET helpful = helpful + 1 WHERE id = $1 RETURNING helpful',
      [req.params.reviewId]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'Review not found' })
    res.json({ helpful: result.rows[0].helpful })
  } catch (err) { next(err) }
})

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/reviews/:reviewId  (owner or admin)
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:reviewId', requireAuth, async (req, res, next) => {
  try {
    const existing = await query('SELECT user_id FROM tool_reviews WHERE id = $1', [req.params.reviewId])
    if (existing.rowCount === 0) return res.status(404).json({ error: 'Review not found' })

    const userResult = await query('SELECT role FROM users WHERE user_id = $1', [req.user.userId])
    const isAdmin    = userResult.rows[0]?.role === 'admin'
    const isOwner    = existing.rows[0].user_id === req.user.userId

    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Access denied' })

    await query('DELETE FROM tool_reviews WHERE id = $1', [req.params.reviewId])
    res.json({ success: true })
  } catch (err) { next(err) }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reviews/mine/count
// Returns the total number of reviews written by the logged-in user
// ─────────────────────────────────────────────────────────────────────────────
router.get('/mine/count', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT COUNT(*) AS count FROM tool_reviews WHERE user_id = $1',
      [req.user.userId]
    )
    res.json({ count: parseInt(result.rows[0].count, 10) })
  } catch (err) { next(err) }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reviews/mine
// Returns all reviews written by the logged-in user (with tool info)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, tool_id, tool_slug, rating, title, body, helpful, created_at
       FROM tool_reviews
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.userId]
    )
    res.json({ reviews: result.rows, count: result.rowCount })
  } catch (err) { next(err) }
})

module.exports = router
