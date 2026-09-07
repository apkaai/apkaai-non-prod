const express = require('express')
const router  = express.Router()
const crypto  = require('crypto')
const { query } = require('../lib/db')

// ── Helpers ────────────────────────────────────────────────────────────────────
function hashPassword(password) {
  const salt = process.env.PASSWORD_SALT || 'apkaai2026secure'
  return crypto.createHash('sha256').update(password + salt).digest('hex')
}

function createToken(userId, email) {
  const payload = Buffer.from(JSON.stringify({ userId, email, iat: Date.now() })).toString('base64url')
  const secret  = process.env.JWT_SECRET || 'apkaai-jwt-secret-2026'
  const sig     = crypto.createHmac('sha256', secret).update(payload).digest('hex').slice(0, 32)
  return `${payload}.${sig}`
}

function verifyToken(token) {
  try {
    const [payload, sig] = token.split('.')
    const secret  = process.env.JWT_SECRET || 'apkaai-jwt-secret-2026'
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex').slice(0, 32)
    if (sig !== expected) return null
    return JSON.parse(Buffer.from(payload, 'base64url').toString())
  } catch { return null }
}

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password)
      return res.status(400).json({ error: 'name, email and password are required' })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: 'Invalid email address' })
    if (password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters' })

    // Check existing
    const existing = await query('SELECT user_id FROM users WHERE email = $1', [email.toLowerCase()])
    if (existing.rowCount > 0)
      return res.status(409).json({ error: 'An account with this email already exists. Please sign in.' })

    const result = await query(
      `INSERT INTO users (email, name, password, role)
       VALUES ($1, $2, $3, 'user')
       RETURNING user_id, email, name, role`,
      [email.toLowerCase().trim(), name.trim(), hashPassword(password)]
    )

    const user  = result.rows[0]
    const token = createToken(user.user_id, user.email)
    res.status(201).json({ success: true, token, user: { userId: user.user_id, name: user.name, email: user.email, role: user.role } })
  } catch (err) { next(err) }
})

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' })

    const result = await query(
      'SELECT user_id, email, name, password, role FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    )
    if (result.rowCount === 0)
      return res.status(401).json({ error: 'No account found with this email. Please sign up first.' })

    const user = result.rows[0]
    if (user.password !== hashPassword(password))
      return res.status(401).json({ error: 'Incorrect password. Please try again.' })

    const token = createToken(user.user_id, user.email)
    res.json({ success: true, token, user: { userId: user.user_id, name: user.name, email: user.email, role: user.role } })
  } catch (err) { next(err) }
})

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', async (req, res, next) => {
  try {
    const auth = req.headers.authorization
    if (!auth || !auth.startsWith('Bearer '))
      return res.status(401).json({ error: 'Not authenticated' })

    const decoded = verifyToken(auth.split(' ')[1])
    if (!decoded) return res.status(401).json({ error: 'Invalid or expired token' })

    const result = await query(
      'SELECT user_id, email, name, role, created_at FROM users WHERE user_id = $1',
      [decoded.userId]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' })
    res.json({ user: result.rows[0] })
  } catch (err) { next(err) }
})

module.exports = router
