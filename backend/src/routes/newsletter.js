const express = require('express')
const router  = express.Router()
const crypto  = require('crypto')
const { query } = require('../lib/db')

// ─── Auth helper (for admin endpoints) ────────────────────────────────────────
function verifyToken(token) {
  try {
    const [payload, sig] = token.split('.')
    const secret   = process.env.JWT_SECRET || 'apkaai-jwt-secret-2026'
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex').slice(0, 32)
    if (sig !== expected) return null
    return JSON.parse(Buffer.from(payload, 'base64url').toString())
  } catch { return null }
}

function adminOnly(req, res, next) {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Not authenticated' })
  const decoded = verifyToken(auth.split(' ')[1])
  if (!decoded) return res.status(401).json({ error: 'Invalid token' })
  query('SELECT role FROM users WHERE user_id = $1', [decoded.userId])
    .then(r => {
      if (r.rows[0]?.role === 'admin') return next()
      return res.status(403).json({ error: 'Admin access required' })
    })
    .catch(() => res.status(403).json({ error: 'Admin access required' }))
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/newsletter/subscribe
// Body: { email, name?, source? }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/subscribe', async (req, res, next) => {
  try {
    const { email, name, source = 'website' } = req.body

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required' })
    }

    // Check if already subscribed
    const existing = await query(
      'SELECT id, status FROM newsletter_subscribers WHERE email = $1',
      [email.toLowerCase().trim()]
    )

    if (existing.rowCount > 0) {
      if (existing.rows[0].status === 'active') {
        return res.json({ success: true, message: 'You are already subscribed!' })
      }
      // Re-subscribe if previously unsubscribed
      await query(
        `UPDATE newsletter_subscribers SET status = 'active', updated_at = NOW()
         WHERE email = $1`,
        [email.toLowerCase().trim()]
      )
      return res.json({ success: true, message: 'Welcome back! You are now re-subscribed.' })
    }

    await query(
      `INSERT INTO newsletter_subscribers (email, name, source)
       VALUES ($1, $2, $3)`,
      [email.toLowerCase().trim(), name?.trim() || null, source]
    )

    res.status(201).json({
      success: true,
      message: 'Thank you for subscribing! You will receive AI tool updates from ApkaAI.',
    })
  } catch (err) { next(err) }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/newsletter/unsubscribe
// Body: { email }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/unsubscribe', async (req, res, next) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Email is required' })

    await query(
      `UPDATE newsletter_subscribers SET status = 'unsubscribed', updated_at = NOW()
       WHERE email = $1`,
      [email.toLowerCase().trim()]
    )
    res.json({ success: true, message: 'You have been unsubscribed successfully.' })
  } catch (err) { next(err) }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/newsletter/subscribers  (admin only)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/subscribers', adminOnly, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, email, name, source, status, created_at
       FROM newsletter_subscribers
       ORDER BY created_at DESC`,
      []
    )
    const active = result.rows.filter(r => r.status === 'active').length
    res.json({ subscribers: result.rows, total: result.rowCount, active })
  } catch (err) { next(err) }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/newsletter/send-campaign  (admin only)
// Send an email campaign to all active subscribers
// Body: { subject, previewText, htmlBody, textBody, testEmail? }
//   testEmail → if set, only sends to that address (dry run)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/send-campaign', adminOnly, async (req, res, next) => {
  try {
    const { subject, htmlBody, textBody, previewText, testEmail } = req.body

    if (!subject || !htmlBody) {
      return res.status(400).json({ error: 'subject and htmlBody are required' })
    }

    const { sendEmail } = require('../services/emailService')
    const FRONTEND_URL  = (process.env.FRONTEND_URL || 'https://apkaai.com').replace(/\/$/, '')
    const year          = new Date().getFullYear()

    // Wrap user content in branded template
    function buildCampaignHtml(email) {
      const unsubUrl = `${FRONTEND_URL}/api/newsletter/unsubscribe-link?email=${encodeURIComponent(email)}`
      return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${subject}</title></head>
<body style="margin:0;padding:0;background:#08051A;font-family:Inter,system-ui,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#08051A;padding:40px 16px;">
<tr><td align="center">
<table width="100%" style="max-width:600px;background:#0F0A1E;border:1px solid rgba(124,58,237,0.35);border-radius:16px;overflow:hidden;">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#150D2E,#0F0A1E);padding:24px 40px;text-align:center;border-bottom:1px solid rgba(124,58,237,0.2);">
    <h1 style="margin:0;font-size:22px;font-weight:800;color:#fff;">apka<span style="color:#A855F7;">AI</span></h1>
    <p style="margin:4px 0 0;font-size:12px;color:#7C3AED;">World's #1 AI Tools Marketplace</p>
  </td></tr>

  ${previewText ? `<tr><td style="padding:16px 40px 0;text-align:center;">
    <p style="margin:0;font-size:13px;color:#94A3B8;font-style:italic;">${previewText}</p>
  </td></tr>` : ''}

  <!-- User content -->
  <tr><td style="padding:32px 40px;">
    <div style="color:#CBD5E1;font-size:15px;line-height:1.7;">
      ${htmlBody}
    </div>
  </td></tr>

  <!-- CTA -->
  <tr><td style="padding:0 40px 32px;text-align:center;">
    <a href="${FRONTEND_URL}/tools" style="display:inline-block;padding:13px 32px;background:linear-gradient(135deg,#7C3AED,#6D28D9);color:#fff;font-weight:700;font-size:14px;text-decoration:none;border-radius:10px;">
      Explore AI Tools →
    </a>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#080514;padding:16px 40px;text-align:center;border-top:1px solid rgba(124,58,237,0.1);">
    <p style="margin:0 0 6px;font-size:11px;color:#334155;">
      &copy; ${year} ApkaAI &mdash; <a href="${FRONTEND_URL}" style="color:#7C3AED;text-decoration:none;">apkaai.com</a>
    </p>
    <p style="margin:0;font-size:10px;color:#1E293B;">
      <a href="${unsubUrl}" style="color:#475569;text-decoration:underline;">Unsubscribe</a>
    </p>
  </td></tr>

</table></td></tr></table>
</body></html>`
    }

    // Test mode — send only to testEmail
    if (testEmail) {
      const html    = buildCampaignHtml(testEmail)
      const result  = await sendEmail(testEmail, `[TEST] ${subject}`, html, textBody || subject)
      return res.json({ success: result.ok, testMode: true, sentTo: testEmail, error: result.reason })
    }

    // Production mode — send to all active subscribers
    const subResult = await query(
      `SELECT email, name FROM newsletter_subscribers WHERE status = 'active' ORDER BY created_at ASC`,
      []
    )
    const subscribers = subResult.rows
    if (subscribers.length === 0) {
      return res.json({ success: true, sent: 0, failed: 0, message: 'No active subscribers' })
    }

    let sent = 0, failed = 0
    const errors = []

    for (const sub of subscribers) {
      try {
        const html   = buildCampaignHtml(sub.email)
        const result = await sendEmail(sub.email, subject, html, textBody || subject)
        if (result.ok) sent++
        else { failed++; errors.push({ email: sub.email, error: result.reason }) }
        // Small delay between sends to avoid SES rate limits
        await new Promise(r => setTimeout(r, 100))
      } catch (e) {
        failed++
        errors.push({ email: sub.email, error: e.message })
      }
    }

    console.log(`[Newsletter] Campaign sent: ${sent} ok, ${failed} failed`)
    res.json({
      success: true,
      sent,
      failed,
      total:   subscribers.length,
      errors:  errors.slice(0, 10), // return first 10 errors only
      message: `Campaign sent to ${sent}/${subscribers.length} subscribers`,
    })
  } catch (err) { next(err) }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/newsletter/unsubscribe-link  (public — used in email footer)
// Query: { email }
// ─────────────────────────────────────────────────────────────────────────────
router.get('/unsubscribe-link', async (req, res, next) => {
  try {
    const { email } = req.query
    if (!email) return res.status(400).send('<h2>Invalid unsubscribe link</h2>')
    await query(
      `UPDATE newsletter_subscribers SET status = 'unsubscribed', updated_at = NOW() WHERE email = $1`,
      [decodeURIComponent(email).toLowerCase().trim()]
    )
    res.send(`<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:60px;background:#08051A;color:#94A3B8;">
      <h2 style="color:#fff;">Unsubscribed</h2>
      <p>You have been unsubscribed from ApkaAI newsletters.</p>
      <a href="${(process.env.FRONTEND_URL||'https://apkaai.com').replace(/\/$/,'')}" style="color:#7C3AED;">Go back to ApkaAI</a>
    </body></html>`)
  } catch (err) { next(err) }
})

module.exports = router
