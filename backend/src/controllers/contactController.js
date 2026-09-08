const { query } = require('../lib/db')

// ── POST /api/contact ─────────────────────────────────────────────────────────
async function submitContact(req, res, next) {
  try {
    const { name, email, message, subject } = req.body

    if (!name || !email || !message)
      return res.status(400).json({ error: 'name, email and message are required' })

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email))
      return res.status(400).json({ error: 'Invalid email address' })

    if (message.length > 2000)
      return res.status(400).json({ error: 'Message too long (max 2000 chars)' })

    await query(
      `INSERT INTO contacts (name, email, subject, message, sent_to, status)
       VALUES ($1, $2, $3, $4, $5, 'new')`,
      [
        name.trim().slice(0, 100),
        email.trim().toLowerCase(),
        subject ? subject.trim().slice(0, 200) : 'General Inquiry',
        message.trim(),
        'ashutoshkumarpandey@apkaai.com',
      ]
    )

    res.status(201).json({ success: true, message: "Your message has been received. Ashutosh Kumar Pandey will reply within 24 hours." })
  } catch (err) { next(err) }
}

module.exports = { submitContact }
