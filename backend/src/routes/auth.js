const express    = require('express')
const router     = express.Router()
const crypto     = require('crypto')
const nodemailer = require('nodemailer')
const { query }  = require('../lib/db')

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

/** Hash a raw reset token before storing — so DB leaks can't be replayed */
function hashResetToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex')
}

/** Lazy-initialised email transporter — built once from env vars */
let _transporter = null
function getTransporter() {
  if (_transporter) return _transporter
  _transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',   // true = 465 TLS, false = STARTTLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
  return _transporter
}

/** Send the password reset email */
async function sendResetEmail(toEmail, resetUrl) {
  const from     = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@apkaai.com'
  const fromName = 'ApkaAI'

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your ApkaAI password</title>
</head>
<body style="margin:0;padding:0;background:#08051A;font-family:Inter,system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#08051A;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#0F0A1E;border:1px solid rgba(124,58,237,0.35);border-radius:16px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#150D2E,#0F0A1E);padding:32px 40px;text-align:center;border-bottom:1px solid rgba(124,58,237,0.2);">
              <h1 style="margin:0;font-size:24px;font-weight:800;color:#fff;">
                apka<span style="color:#A855F7;">AI</span>
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#fff;">Reset your password</h2>
              <p style="margin:0 0 20px;font-size:14px;color:#94A3B8;line-height:1.6;">
                We received a request to reset the password for your ApkaAI account
                associated with <strong style="color:#C4B5FD;">${toEmail}</strong>.
              </p>
              <p style="margin:0 0 28px;font-size:14px;color:#94A3B8;line-height:1.6;">
                Click the button below to choose a new password.
                This link will expire in <strong style="color:#fff;">30 minutes</strong>.
              </p>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
                <tr>
                  <td style="background:linear-gradient(135deg,#7C3AED,#6D28D9);border-radius:10px;">
                    <a href="${resetUrl}"
                       style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#fff;text-decoration:none;border-radius:10px;">
                      Reset Password →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:12px;color:#64748B;line-height:1.5;">
                If the button doesn&apos;t work, copy and paste this URL into your browser:
              </p>
              <p style="margin:0 0 24px;font-size:11px;color:#7C3AED;word-break:break-all;">
                ${resetUrl}
              </p>

              <hr style="border:none;border-top:1px solid rgba(124,58,237,0.15);margin:0 0 20px;" />

              <p style="margin:0;font-size:12px;color:#475569;line-height:1.5;">
                If you didn&apos;t request a password reset, you can safely ignore this email.
                Your password will not change. For security, this link expires in 30 minutes
                and can only be used once.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#080514;padding:20px 40px;text-align:center;border-top:1px solid rgba(124,58,237,0.1);">
              <p style="margin:0;font-size:11px;color:#334155;">
                © ${new Date().getFullYear()} ApkaAI — World&apos;s #1 AI Tools Marketplace
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  await getTransporter().sendMail({
    from:    `"${fromName}" <${from}>`,
    to:      toEmail,
    subject: 'Reset your ApkaAI password',
    html,
    text: `Reset your ApkaAI password\n\nWe received a request to reset your password.\n\nClick this link to reset it (expires in 30 minutes):\n${resetUrl}\n\nIf you didn't request this, ignore this email.`,
  })
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

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
// Body: { email }
// Always returns 200 regardless of whether the email exists (prevents user enumeration).
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: 'A valid email address is required.' })

    const normalised = email.toLowerCase().trim()

    // Look up the user — but don't reveal existence to the caller
    const result = await query(
      'SELECT user_id, email, name FROM users WHERE email = $1',
      [normalised]
    )

    if (result.rowCount > 0) {
      const user = result.rows[0]

      // Generate a cryptographically secure 32-byte token
      const rawToken  = crypto.randomBytes(32).toString('hex')   // 64-char hex string
      const tokenHash = hashResetToken(rawToken)                  // store only the hash
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000)    // 30 minutes from now

      // Persist hash + expiry in the users table
      await query(
        `UPDATE users
         SET reset_token = $1, reset_token_expires = $2
         WHERE user_id = $3`,
        [tokenHash, expiresAt, user.user_id]
      )

      // Build reset URL with the RAW token (not the hash)
      const frontendUrl = process.env.FRONTEND_URL || 'https://apkaai.com'
      const resetUrl    = `${frontendUrl}/reset-password?token=${rawToken}`

      // Fire the email — don't await it so we don't block the response
      sendResetEmail(user.email, resetUrl).catch(err => {
        console.error('[Auth] Failed to send reset email to', user.email, err.message)
      })
    }

    // Always respond with the same message (prevents user enumeration)
    res.json({
      success: true,
      message: 'If an account with that email exists, a reset link has been sent.',
    })
  } catch (err) { next(err) }
})

// ── GET /api/auth/verify-reset-token ─────────────────────────────────────────
// Query: ?token=<rawToken>
// Used by the reset-password page to validate the token before showing the form.
router.get('/verify-reset-token', async (req, res, next) => {
  try {
    const { token } = req.query
    if (!token || typeof token !== 'string')
      return res.status(400).json({ valid: false, error: 'Token is required.' })

    const tokenHash = hashResetToken(token)
    const result    = await query(
      `SELECT user_id, email FROM users
       WHERE reset_token = $1
         AND reset_token_expires > NOW()`,
      [tokenHash]
    )

    if (result.rowCount === 0)
      return res.status(400).json({ valid: false, error: 'This reset link has expired or is invalid. Please request a new one.' })

    res.json({ valid: true, email: result.rows[0].email })
  } catch (err) { next(err) }
})

// ── POST /api/auth/reset-password ─────────────────────────────────────────────
// Body: { token, password, confirmPassword }
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password, confirmPassword } = req.body

    // ── Input validation ──────────────────────────────────────────────────────
    if (!token || typeof token !== 'string')
      return res.status(400).json({ error: 'Reset token is required.' })

    if (!password || !confirmPassword)
      return res.status(400).json({ error: 'Both password fields are required.' })

    if (password !== confirmPassword)
      return res.status(400).json({ error: 'Passwords do not match.' })

    // Password strength: min 8 chars, at least one letter and one number
    if (password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' })

    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password))
      return res.status(400).json({ error: 'Password must contain at least one letter and one number.' })

    // ── Token validation ──────────────────────────────────────────────────────
    const tokenHash = hashResetToken(token)
    const result    = await query(
      `SELECT user_id, email FROM users
       WHERE reset_token = $1
         AND reset_token_expires > NOW()`,
      [tokenHash]
    )

    if (result.rowCount === 0)
      return res.status(400).json({ error: 'This reset link has expired or has already been used. Please request a new one.' })

    const user = result.rows[0]

    // ── Update password and invalidate the token ──────────────────────────────
    await query(
      `UPDATE users
       SET password = $1,
           reset_token = NULL,
           reset_token_expires = NULL,
           updated_at = NOW()
       WHERE user_id = $2`,
      [hashPassword(password), user.user_id]
    )

    res.json({ success: true, message: 'Your password has been reset successfully. You can now sign in.' })
  } catch (err) { next(err) }
})

module.exports = router
