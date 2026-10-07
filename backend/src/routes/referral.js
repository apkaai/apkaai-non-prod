const express = require('express')
const router  = express.Router()
const crypto  = require('crypto')
const { query } = require('../lib/db')

// ─────────────────────────────────────────────────────────────────────────────
// Auth helper
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

// ─────────────────────────────────────────────────────────────────────────────
// Generate a unique referral code for a user
// ─────────────────────────────────────────────────────────────────────────────
function generateCode(userId) {
  // 8 chars: first 4 from userId, last 4 random hex
  const prefix = userId.replace(/-/g, '').slice(0, 4).toUpperCase()
  const suffix = crypto.randomBytes(2).toString('hex').toUpperCase()
  return `APKA${prefix}${suffix}`
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/referral/me
// Get or create the logged-in user's referral code + stats
// ─────────────────────────────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    // Ensure user has a referral code
    let userResult = await query(
      'SELECT user_id, name, email, referral_code FROM users WHERE user_id = $1',
      [req.user.userId]
    )
    if (userResult.rowCount === 0) return res.status(404).json({ error: 'User not found' })

    let user = userResult.rows[0]

    if (!user.referral_code) {
      // Generate and save a code
      let code
      let attempts = 0
      do {
        code = generateCode(req.user.userId)
        const existing = await query('SELECT id FROM referrals WHERE code = $1', [code])
        if (existing.rowCount === 0) break
        attempts++
      } while (attempts < 5)

      await query(
        'UPDATE users SET referral_code = $1 WHERE user_id = $2',
        [code, req.user.userId]
      )
      user.referral_code = code
    }

    // Stats
    const statsResult = await query(
      `SELECT
         COUNT(*)                                          AS total_referrals,
         COUNT(*) FILTER (WHERE status = 'signed_up')     AS signed_up,
         COUNT(*) FILTER (WHERE status = 'rewarded')      AS rewarded,
         COUNT(*) FILTER (WHERE reward_applied = true)    AS rewards_earned
       FROM referrals
       WHERE referrer_id = $1`,
      [req.user.userId]
    )

    // Recent referred users
    const recentResult = await query(
      `SELECT r.id, r.status, r.created_at, r.converted_at,
              u.name AS referred_name
       FROM referrals r
       LEFT JOIN users u ON u.user_id = r.referred_id
       WHERE r.referrer_id = $1
       ORDER BY r.created_at DESC
       LIMIT 10`,
      [req.user.userId]
    )

    const frontendUrl = (process.env.FRONTEND_URL || 'https://apkaai.com').replace(/\/$/, '')
    const referralLink = `${frontendUrl}/signup?ref=${user.referral_code}`

    res.json({
      code:         user.referral_code,
      link:         referralLink,
      stats:        statsResult.rows[0],
      referrals:    recentResult.rows,
    })
  } catch (err) { next(err) }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/referral/track
// Called at signup — track that a new user signed up via a referral code
// Body: { code, newUserId }  (called internally from auth.js register route)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/track', async (req, res, next) => {
  try {
    const { code, newUserId } = req.body
    if (!code || !newUserId) return res.status(400).json({ error: 'code and newUserId required' })

    // Find referrer by code
    const referrerResult = await query(
      'SELECT user_id FROM users WHERE referral_code = $1',
      [code.toUpperCase().trim()]
    )
    if (referrerResult.rowCount === 0) {
      return res.status(404).json({ error: 'Invalid referral code' })
    }
    const referrerId = referrerResult.rows[0].user_id

    // Don't let a user refer themselves
    if (referrerId === newUserId) {
      return res.status(400).json({ error: 'Cannot use your own referral code' })
    }

    // Check if this new user was already referred
    const existing = await query(
      'SELECT id FROM referrals WHERE referred_id = $1',
      [newUserId]
    )
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: 'User already has a referral' })
    }

    // Record referral
    await query(
      `INSERT INTO referrals (referrer_id, referred_id, code, status, converted_at)
       VALUES ($1, $2, $3, 'signed_up', NOW())`,
      [referrerId, newUserId, code.toUpperCase().trim()]
    )

    // Mark who referred this user
    await query(
      'UPDATE users SET referred_by = $1 WHERE user_id = $2',
      [referrerId, newUserId]
    )

    res.json({ success: true, referrerId })
  } catch (err) { next(err) }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/referral/validate/:code
// Public — check if a referral code is valid before showing on signup page
// ─────────────────────────────────────────────────────────────────────────────
router.get('/validate/:code', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT name FROM users WHERE referral_code = $1',
      [req.params.code.toUpperCase().trim()]
    )
    if (result.rowCount === 0) {
      return res.status(404).json({ valid: false })
    }
    // Only expose referrer's first name
    const firstName = result.rows[0].name.split(' ')[0]
    res.json({ valid: true, referrerName: firstName })
  } catch (err) { next(err) }
})

module.exports = router
