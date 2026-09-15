const express    = require('express')
const router     = express.Router()
const crypto     = require('crypto')
const nodemailer = require('nodemailer')
const rateLimit  = require('express-rate-limit')
const { query }  = require('../lib/db')

// ─────────────────────────────────────────────────────────────────────────────
// Rate limiters — tighter limits on sensitive auth endpoints
// ─────────────────────────────────────────────────────────────────────────────

/** 5 forgot-password requests per IP per 15 min — prevents email flooding */
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password reset requests. Please try again later.' },
})

/** 10 reset attempts per IP per 15 min */
const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password reset attempts. Please try again later.' },
})

/** 10 login attempts per IP per 15 min */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
})

// ─────────────────────────────────────────────────────────────────────────────
// Password helpers — SHA-256 + static salt (matches existing users in DB)
// NOTE: This is the current hashing scheme. New deployments should migrate to
// bcrypt or argon2. Do NOT change this without a password migration plan.
// ─────────────────────────────────────────────────────────────────────────────
function hashPassword(password) {
  const salt = process.env.PASSWORD_SALT || 'apkaai2026secure'
  return crypto.createHash('sha256').update(password + salt).digest('hex')
}

// ─────────────────────────────────────────────────────────────────────────────
// Session token helpers — custom HMAC token (existing auth system)
// ─────────────────────────────────────────────────────────────────────────────
function createToken(userId, email) {
  const payload = Buffer.from(JSON.stringify({ userId, email, iat: Date.now() })).toString('base64url')
  const secret  = process.env.JWT_SECRET || 'apkaai-jwt-secret-2026'
  const sig     = crypto.createHmac('sha256', secret).update(payload).digest('hex').slice(0, 32)
  return `${payload}.${sig}`
}

function verifyToken(token) {
  try {
    const [payload, sig] = token.split('.')
    const secret   = process.env.JWT_SECRET || 'apkaai-jwt-secret-2026'
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex').slice(0, 32)
    if (sig !== expected) return null
    return JSON.parse(Buffer.from(payload, 'base64url').toString())
  } catch { return null }
}

// ─────────────────────────────────────────────────────────────────────────────
// Reset token helpers
// Raw token: 32 crypto-random bytes → 64 hex chars (never stored)
// Token hash: SHA-256(rawToken) → stored in DB
// ─────────────────────────────────────────────────────────────────────────────
function hashResetToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex')
}

// ─────────────────────────────────────────────────────────────────────────────
// Email / nodemailer
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a fresh transporter each time so env-var changes are picked up.
 * We do NOT cache the transporter singleton — the overhead is minimal and
 * caching prevents credential rotation from taking effect.
 */
function buildTransporter() {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    return null  // SMTP not configured — caller must handle gracefully
  }

  return nodemailer.createTransport({
    host,
    port:   parseInt(process.env.SMTP_PORT   || '587', 10),
    secure: process.env.SMTP_SECURE          === 'true',
    auth:   { user, pass },
    // Reasonable timeouts to prevent hanging requests
    connectionTimeout: 10000,
    greetingTimeout:   10000,
    socketTimeout:     15000,
  })
}

/** Branded HTML reset email */
function buildResetEmailHtml(toEmail, resetUrl) {
  const year = new Date().getFullYear()
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Reset your ApkaAI password</title>
</head>
<body style="margin:0;padding:0;background:#08051A;font-family:Inter,system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#08051A;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#0F0A1E;border:1px solid rgba(124,58,237,0.35);border-radius:16px;overflow:hidden;">

        <tr><td style="background:linear-gradient(135deg,#150D2E,#0F0A1E);padding:28px 40px;text-align:center;border-bottom:1px solid rgba(124,58,237,0.2);">
          <h1 style="margin:0;font-size:22px;font-weight:800;color:#fff;">apka<span style="color:#A855F7;">AI</span></h1>
        </td></tr>

        <tr><td style="padding:32px 40px;">
          <h2 style="margin:0 0 12px;font-size:18px;font-weight:700;color:#fff;">Reset your password</h2>
          <p style="margin:0 0 16px;font-size:14px;color:#94A3B8;line-height:1.6;">
            We received a request to reset the password for the ApkaAI account associated with
            <strong style="color:#C4B5FD;">${toEmail}</strong>.
          </p>
          <p style="margin:0 0 24px;font-size:14px;color:#94A3B8;line-height:1.6;">
            Click the button below to set a new password.
            This link will expire in <strong style="color:#fff;">30&nbsp;minutes</strong>
            and can only be used once.
          </p>

          <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
            <tr><td style="background:linear-gradient(135deg,#7C3AED,#6D28D9);border-radius:10px;">
              <a href="${resetUrl}"
                 style="display:inline-block;padding:13px 30px;font-size:14px;font-weight:700;color:#fff;text-decoration:none;border-radius:10px;">
                Reset Password &rarr;
              </a>
            </td></tr>
          </table>

          <p style="margin:0 0 6px;font-size:12px;color:#64748B;">If the button doesn't work, copy this URL:</p>
          <p style="margin:0 0 24px;font-size:11px;color:#7C3AED;word-break:break-all;">${resetUrl}</p>

          <hr style="border:none;border-top:1px solid rgba(124,58,237,0.15);margin:0 0 18px;">
          <p style="margin:0;font-size:12px;color:#475569;line-height:1.5;">
            If you didn't request a password reset, you can safely ignore this email.
            Your password will not change.
          </p>
        </td></tr>

        <tr><td style="background:#080514;padding:16px 40px;text-align:center;border-top:1px solid rgba(124,58,237,0.1);">
          <p style="margin:0;font-size:11px;color:#334155;">
            &copy; ${year} ApkaAI &mdash; World&apos;s #1 AI Tools Marketplace
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

/**
 * Send the password-reset email.
 * Returns { ok: true } on success or { ok: false, reason: string } on failure.
 * NEVER throws — callers must handle the result gracefully.
 */
async function sendResetEmail(toEmail, resetUrl) {
  const transporter = buildTransporter()
  if (!transporter) {
    return { ok: false, reason: 'SMTP_NOT_CONFIGURED' }
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER

  try {
    await transporter.sendMail({
      from:    `"ApkaAI" <${from}>`,
      to:      toEmail,
      subject: 'Reset your ApkaAI password',
      html:    buildResetEmailHtml(toEmail, resetUrl),
      text:    [
        'Reset your ApkaAI password',
        '',
        'We received a request to reset your password.',
        `Click this link to reset it (expires in 30 minutes): ${resetUrl}`,
        '',
        "If you didn't request this, ignore this email.",
      ].join('\n'),
    })
    return { ok: true }
  } catch (err) {
    // Log the SMTP error but NOT the reset URL or raw token
    console.error('[Auth] SMTP send failed:', err.code || err.message)
    return { ok: false, reason: err.code || 'SMTP_SEND_FAILED' }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────────────────────
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password)
      return res.status(400).json({ error: 'name, email and password are required' })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: 'Invalid email address' })
    if (password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters' })

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
    res.status(201).json({
      success: true,
      token,
      user: { userId: user.user_id, name: user.name, email: user.email, role: user.role },
    })
  } catch (err) { next(err) }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────
router.post('/login', loginLimiter, async (req, res, next) => {
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
    res.json({
      success: true,
      token,
      user: { userId: user.user_id, name: user.name, email: user.email, role: user.role },
    })
  } catch (err) { next(err) }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/forgot-password
// Body: { email }
//
// Security:
//  • Always returns 200 with identical response (prevents account enumeration)
//  • Token is 32 random bytes (256-bit entropy)
//  • Only the SHA-256 hash is stored — raw token is never persisted
//  • Any existing reset token is overwritten (invalidating the previous request)
//  • 30-minute expiry
//  • 5 requests/IP/15min rate limit
// ─────────────────────────────────────────────────────────────────────────────
router.post('/forgot-password', forgotPasswordLimiter, async (req, res, next) => {
  try {
    const { email } = req.body

    // Basic format validation — still returns 200 on invalid format to avoid
    // revealing any information, but a format error is not sensitive
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'A valid email address is required.' })
    }

    const normalised = email.toLowerCase().trim()

    // Look up user — result is never exposed to the caller
    const userResult = await query(
      'SELECT user_id, email, name FROM users WHERE email = $1',
      [normalised]
    )

    if (userResult.rowCount > 0) {
      const user = userResult.rows[0]

      // 32 bytes = 256 bits of entropy — token is hex-encoded (64 chars)
      const rawToken  = crypto.randomBytes(32).toString('hex')
      const tokenHash = hashResetToken(rawToken)
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000)   // 30 minutes

      // Overwrite any existing token atomically (invalidates previous request)
      await query(
        `UPDATE users
         SET reset_token = $1, reset_token_expires = $2
         WHERE user_id = $3`,
        [tokenHash, expiresAt, user.user_id]
      )

      // Build the reset URL — FRONTEND_URL must be set in production .env
      const frontendUrl = (process.env.FRONTEND_URL || 'https://apkaai.com').replace(/\/$/, '')
      const resetUrl    = `${frontendUrl}/reset-password?token=${rawToken}`

      // Send email asynchronously — do NOT await (don't block the HTTP response)
      // The raw token is only in resetUrl; we never log resetUrl
      sendResetEmail(user.email, resetUrl).then(result => {
        if (!result.ok) {
          // Log failure without exposing the token or URL
          console.warn(`[Auth] Reset email not sent to ${user.email}: ${result.reason}`)
        }
      })
    }

    // Always identical response — never reveals whether the email exists
    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    })
  } catch (err) { next(err) }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/verify-reset-token?token=<rawToken>
//
// Used by the reset-password page to validate the token before showing the form.
// Returns minimal information — only { valid: true } or { valid: false, error }.
// Does NOT return the user's email (prevents information leakage via token probe).
// ─────────────────────────────────────────────────────────────────────────────
router.get('/verify-reset-token', async (req, res, next) => {
  try {
    const { token } = req.query

    if (!token || typeof token !== 'string' || token.length !== 64) {
      return res.status(400).json({
        valid: false,
        error: 'Invalid reset link. Please request a new password reset.',
      })
    }

    const tokenHash = hashResetToken(token)
    const result    = await query(
      `SELECT user_id
         FROM users
        WHERE reset_token = $1
          AND reset_token_expires > NOW()`,
      [tokenHash]
    )

    if (result.rowCount === 0) {
      return res.status(400).json({
        valid: false,
        error: 'This reset link has expired or is invalid. Please request a new one.',
      })
    }

    // Valid — return only what the UI needs
    res.json({ valid: true })
  } catch (err) { next(err) }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/reset-password
// Body: { token, password, confirmPassword }
//
// Security:
//  • Token validated server-side (never trust frontend validation)
//  • Token hash compared — raw token never stored or logged
//  • Token and expiry checked atomically
//  • Token NULLed immediately after successful reset (one-time use)
//  • Password validated for strength
//  • 10 requests/IP/15min rate limit
// ─────────────────────────────────────────────────────────────────────────────
router.post('/reset-password', resetPasswordLimiter, async (req, res, next) => {
  try {
    const { token, password, confirmPassword } = req.body

    // ── Input validation ──────────────────────────────────────────────────────
    if (!token || typeof token !== 'string' || token.length !== 64) {
      return res.status(400).json({ error: 'Invalid or missing reset token.' })
    }

    if (!password || !confirmPassword) {
      return res.status(400).json({ error: 'Both password fields are required.' })
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' })
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' })
    }

    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({
        error: 'Password must contain at least one letter and one number.',
      })
    }

    // ── Token validation — re-checked server-side ─────────────────────────────
    const tokenHash = hashResetToken(token)
    const result    = await query(
      `SELECT user_id
         FROM users
        WHERE reset_token = $1
          AND reset_token_expires > NOW()`,
      [tokenHash]
    )

    if (result.rowCount === 0) {
      return res.status(400).json({
        error: 'This reset link has expired or has already been used. Please request a new one.',
      })
    }

    const { user_id } = result.rows[0]

    // ── Update password + invalidate token atomically ─────────────────────────
    await query(
      `UPDATE users
          SET password             = $1,
              reset_token          = NULL,
              reset_token_expires  = NULL,
              updated_at           = NOW()
        WHERE user_id = $2`,
      [hashPassword(password), user_id]
    )

    res.json({
      success: true,
      message: 'Your password has been reset successfully. You can now sign in.',
    })
  } catch (err) { next(err) }
})

module.exports = router
