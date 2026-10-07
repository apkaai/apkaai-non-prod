/**
 * demo.js — /api/demo
 * ─────────────────────────────────────────────────────────────────────────────
 * Demo Booking System
 *
 * Public endpoints:
 *   GET  /api/demo/slots          — available time slots for a date
 *   POST /api/demo/book           — create a booking
 *   GET  /api/demo/:id            — get booking details
 *   POST /api/demo/:id/cancel     — cancel a booking
 *
 * Admin endpoints (Bearer token + admin role):
 *   GET  /api/demo                — all bookings (filterable)
 *   PATCH /api/demo/:id/status    — update status
 *   GET  /api/demo/stats          — booking statistics
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express  = require('express')
const router   = express.Router()
const crypto   = require('crypto')
const rateLimit = require('express-rate-limit')
const { query } = require('../lib/db')
const { createCalendarEvent, buildCalendarLinks } = require('../services/calendarService')
const { sendBookingConfirmation } = require('../services/reminderService')

// ─── Rate limiter (5 bookings / IP / hour) ────────────────────────────────────
const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many booking attempts. Please try again later.' },
})

// ─── Auth helper ──────────────────────────────────────────────────────────────
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
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Not authenticated' })
  const decoded = verifyToken(auth.split(' ')[1])
  if (!decoded) return res.status(401).json({ error: 'Invalid token' })
  query('SELECT role FROM users WHERE user_id = $1', [decoded.userId])
    .then(r => {
      if (r.rows[0]?.role === 'admin') return next()
      return res.status(403).json({ error: 'Admin access required' })
    })
    .catch(() => res.status(403).json({ error: 'Admin access required' }))
}

// ─── Available time slots ─────────────────────────────────────────────────────
// Working hours: Mon–Fri, 10:00 AM – 5:30 PM IST, 30-min slots
// Excludes already-booked slots and past times

const SLOT_TIMES = [
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
]

router.get('/slots', async (req, res, next) => {
  try {
    const { date } = req.query
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'date is required in YYYY-MM-DD format' })
    }

    // Check if date is a weekday
    const d = new Date(date + 'T00:00:00Z')
    const dayOfWeek = d.getUTCDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return res.json({ date, slots: [], message: 'No slots on weekends' })
    }

    // Try to fetch already-booked slots, but handle missing table gracefully
    let bookedTimes = new Set()
    try {
      const booked = await query(
        `SELECT slot_time FROM demo_bookings
         WHERE slot_date = $1 AND status IN ('confirmed','pending')`,
        [date]
      )
      bookedTimes = new Set(booked.rows.map(r => r.slot_time.slice(0, 5)))
    } catch (dbErr) {
      // Table may not exist yet — return all slots as available
      console.warn('[Demo] demo_bookings table not ready:', dbErr.message)
    }

    // Build available slots (exclude past times for today)
    const today  = new Date().toISOString().slice(0, 10)
    const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
    const nowHHMM = `${nowIST.getHours().toString().padStart(2,'0')}:${nowIST.getMinutes().toString().padStart(2,'0')}`

    const slots = SLOT_TIMES.map(time => {
      const isBooked = bookedTimes.has(time)
      const isPast   = date === today && time <= nowHHMM
      return {
        time,
        available: !isBooked && !isPast,
        label:     formatSlotTime(time),
      }
    })

    res.json({ date, slots, timezone: 'Asia/Kolkata (IST)' })
  } catch (err) { next(err) }
})

function formatSlotTime(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12    = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${h12}:${m.toString().padStart(2, '0')} ${period} IST`
}

// ─── POST /api/demo/book ──────────────────────────────────────────────────────
router.post('/book', bookingLimiter, async (req, res, next) => {
  try {
    const {
      name, email, company, phone, use_case,
      slot_date, slot_time, slot_timezone = 'Asia/Kolkata',
      duration_minutes = 30,
      calendar_type = 'google',
    } = req.body

    // Validation
    if (!name || !email || !slot_date || !slot_time) {
      return res.status(400).json({ error: 'name, email, slot_date, slot_time are required' })
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' })
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(slot_date)) {
      return res.status(400).json({ error: 'slot_date must be YYYY-MM-DD' })
    }

    // Check slot is still available
    const conflict = await query(
      `SELECT id FROM demo_bookings
       WHERE slot_date = $1 AND slot_time = $2 AND status IN ('confirmed','pending')`,
      [slot_date, slot_time]
    )
    if (conflict.rowCount > 0) {
      return res.status(409).json({ error: 'This time slot is no longer available. Please choose another.' })
    }

    // Insert booking (pending status until calendar event created)
    const insertResult = await query(
      `INSERT INTO demo_bookings
         (name, email, company, phone, use_case, slot_date, slot_time, slot_timezone,
          duration_minutes, status, calendar_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',$10)
       RETURNING *`,
      [name, email.toLowerCase().trim(), company||null, phone||null, use_case||null,
       slot_date, slot_time, slot_timezone, duration_minutes, calendar_type]
    )
    const booking = insertResult.rows[0]

    // Create calendar event asynchronously (non-blocking)
    let meetingLink = null
    let eventId     = null
    let calProvider = 'none'

    try {
      const calResult = await createCalendarEvent(booking, calendar_type)
      if (calResult) {
        meetingLink = calResult.meetingLink
        eventId     = calResult.eventId
        calProvider = calResult.provider

        // Update booking with meeting link + event id
        const updateFields = { meeting_link: meetingLink, status: 'confirmed' }
        if (calResult.provider === 'google') updateFields.google_event_id = eventId
        if (calResult.provider === 'teams')  updateFields.ms_event_id     = calResult.calEventId || eventId

        await query(
          `UPDATE demo_bookings
           SET meeting_link = $1, status = 'confirmed',
               google_event_id = $2, ms_event_id = $3, updated_at = NOW()
           WHERE id = $4`,
          [meetingLink, calResult.provider === 'google' ? eventId : null,
           calResult.provider === 'teams' ? eventId : null, booking.id]
        )
        booking.meeting_link = meetingLink
        booking.status       = 'confirmed'
      }
    } catch (calErr) {
      console.error('[Demo] Calendar event creation failed:', calErr.message)
      // Still confirm the booking even if calendar fails
      await query(`UPDATE demo_bookings SET status='confirmed', updated_at=NOW() WHERE id=$1`, [booking.id])
      booking.status = 'confirmed'
    }

    // Send confirmation emails (non-blocking)
    sendBookingConfirmation({ ...booking, meeting_link: meetingLink }).catch(e =>
      console.error('[Demo] Confirmation email failed:', e.message)
    )

    // Build calendar links for the response
    const calLinks = buildCalendarLinks({ ...booking, meeting_link: meetingLink })

    res.status(201).json({
      success:    true,
      bookingId:  booking.id,
      status:     'confirmed',
      meetingLink,
      calProvider,
      calendarLinks: calLinks,
      message:    `Demo booked! ${meetingLink ? `Join: ${meetingLink}` : 'Meeting link will be sent by email.'}`,
    })
  } catch (err) { next(err) }
})

// ─── GET /api/demo/:id ────────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, name, email, company, slot_date, slot_time, slot_timezone, duration_minutes, status, meeting_link, calendar_type, created_at FROM demo_bookings WHERE id = $1',
      [req.params.id]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'Booking not found' })
    const booking = result.rows[0]
    const calendarLinks = buildCalendarLinks(booking)
    res.json({ booking: { ...booking, calendarLinks } })
  } catch (err) { next(err) }
})

// ─── POST /api/demo/:id/cancel ────────────────────────────────────────────────
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const { email, reason } = req.body
    if (!email) return res.status(400).json({ error: 'email is required to cancel' })

    const result = await query(
      `UPDATE demo_bookings
       SET status = 'cancelled', cancellation_reason = $1, updated_at = NOW()
       WHERE id = $2 AND email = $3 AND status NOT IN ('cancelled','completed')
       RETURNING *`,
      [reason || null, req.params.id, email.toLowerCase().trim()]
    )
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Booking not found or cannot be cancelled' })
    }
    res.json({ success: true, message: 'Demo booking cancelled successfully' })
  } catch (err) { next(err) }
})

// ─── GET /api/demo (admin) ────────────────────────────────────────────────────
router.get('/', adminOnly, async (req, res, next) => {
  try {
    const { status, date, page = 1, limit = 20 } = req.query
    const offset = (Number(page) - 1) * Number(limit)
    const params = []
    let where    = 'WHERE 1=1'

    if (status) { params.push(status); where += ` AND status = $${params.length}` }
    if (date)   { params.push(date);   where += ` AND slot_date = $${params.length}` }
    params.push(Number(limit), offset)

    const result = await query(
      `SELECT * FROM demo_bookings ${where}
       ORDER BY slot_date, slot_time
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    )
    const countRes = await query(`SELECT COUNT(*) FROM demo_bookings ${where}`, params.slice(0, -2))
    const statsRes = await query(
      `SELECT
         COUNT(*) FILTER (WHERE status='confirmed') AS confirmed,
         COUNT(*) FILTER (WHERE status='pending')   AS pending,
         COUNT(*) FILTER (WHERE status='completed') AS completed,
         COUNT(*) FILTER (WHERE status='cancelled') AS cancelled,
         COUNT(*) AS total
       FROM demo_bookings`,
      []
    )

    res.json({
      bookings: result.rows,
      total:    parseInt(countRes.rows[0].count, 10),
      stats:    statsRes.rows[0],
      page:     Number(page),
      limit:    Number(limit),
    })
  } catch (err) { next(err) }
})

// ─── PATCH /api/demo/:id/status (admin) ──────────────────────────────────────
router.patch('/:id/status', adminOnly, async (req, res, next) => {
  try {
    const { status } = req.body
    const valid = ['pending','confirmed','cancelled','completed','no_show']
    if (!status || !valid.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${valid.join(', ')}` })
    }
    const result = await query(
      'UPDATE demo_bookings SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
      [status, req.params.id]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'Booking not found' })
    res.json({ success: true, booking: result.rows[0] })
  } catch (err) { next(err) }
})

module.exports = router
