/**
 * reminderService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Sends automated email reminders for demo bookings.
 *
 * Reminders sent:
 *   - 24 hours before the demo
 *   - 1 hour before the demo
 *
 * How to run:
 *   - Call checkAndSendReminders() on a cron (every 15 minutes recommended)
 *   - Or call it from index.js startup with setInterval
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { query }       = require('../lib/db')
const { sendEmail }   = require('./emailService')
const { buildCalendarLinks, buildDateTimeRange } = require('./calendarService')
const { DateTime }    = require('luxon')

const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://apkaai.com').replace(/\/$/, '')

// ─── Email templates ──────────────────────────────────────────────────────────

function buildReminderHtml(booking, hoursLabel) {
  const { displayTime } = buildDateTimeRange(
    booking.slot_date, booking.slot_time,
    booking.slot_timezone, booking.duration_minutes
  )
  const { googleUrl, outlookUrl, office365Url } = buildCalendarLinks(booking)
  const year = new Date().getFullYear()

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>ApkaAI Demo Reminder</title></head>
<body style="margin:0;padding:0;background:#08051A;font-family:Inter,system-ui,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#08051A;padding:40px 16px;">
<tr><td align="center">
<table width="100%" style="max-width:560px;background:#0F0A1E;border:1px solid rgba(124,58,237,0.35);border-radius:16px;overflow:hidden;">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#150D2E,#0F0A1E);padding:28px 40px;text-align:center;border-bottom:1px solid rgba(124,58,237,0.2);">
    <h1 style="margin:0;font-size:22px;font-weight:800;color:#fff;">apka<span style="color:#A855F7;">AI</span></h1>
    <p style="margin:4px 0 0;font-size:12px;color:#7C3AED;">Demo Reminder</p>
  </td></tr>

  <!-- Banner -->
  <tr><td style="padding:28px 40px;border-bottom:1px solid rgba(124,58,237,0.15);">
    <div style="background:rgba(124,58,237,0.12);border:1px solid rgba(124,58,237,0.3);border-radius:12px;padding:20px;text-align:center;">
      <p style="margin:0 0 6px;font-size:13px;color:#94A3B8;">Your ApkaAI demo is in</p>
      <p style="margin:0;font-size:28px;font-weight:800;color:#C4B5FD;">${hoursLabel}</p>
    </div>
  </td></tr>

  <!-- Details -->
  <tr><td style="padding:28px 40px;">
    <p style="margin:0 0 16px;font-size:14px;color:#94A3B8;">
      Hi <strong style="color:#fff;">${booking.name}</strong>, this is your reminder for your upcoming ApkaAI demo.
    </p>

    <!-- Meeting details card -->
    <table width="100%" style="background:rgba(124,58,237,0.08);border:1px solid rgba(124,58,237,0.2);border-radius:10px;overflow:hidden;margin-bottom:20px;">
      <tr><td style="padding:14px 16px;border-bottom:1px solid rgba(124,58,237,0.1);">
        <p style="margin:0;font-size:11px;color:#64748B;text-transform:uppercase;letter-spacing:0.05em;">Date & Time</p>
        <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#fff;">${displayTime}</p>
      </td></tr>
      ${booking.meeting_link ? `
      <tr><td style="padding:14px 16px;">
        <p style="margin:0;font-size:11px;color:#64748B;text-transform:uppercase;letter-spacing:0.05em;">Meeting Link</p>
        <a href="${booking.meeting_link}" style="display:inline-block;margin-top:6px;font-size:13px;color:#A78BFA;text-decoration:none;word-break:break-all;">${booking.meeting_link}</a>
      </td></tr>` : ''}
    </table>

    <!-- Join button -->
    ${booking.meeting_link ? `
    <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
      <tr><td style="background:linear-gradient(135deg,#7C3AED,#6D28D9);border-radius:10px;">
        <a href="${booking.meeting_link}" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:700;color:#fff;text-decoration:none;border-radius:10px;">
          🎥 Join Meeting Now
        </a>
      </td></tr>
    </table>` : ''}

    <!-- Add to calendar -->
    <p style="margin:0 0 10px;font-size:13px;color:#64748B;">Add to your calendar:</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <a href="${googleUrl}" style="display:inline-block;padding:8px 14px;background:rgba(66,133,244,0.15);border:1px solid rgba(66,133,244,0.4);border-radius:8px;color:#93C5FD;text-decoration:none;font-size:12px;font-weight:600;">📅 Google</a>
      <a href="${outlookUrl}" style="display:inline-block;padding:8px 14px;background:rgba(0,120,212,0.15);border:1px solid rgba(0,120,212,0.4);border-radius:8px;color:#93C5FD;text-decoration:none;font-size:12px;font-weight:600;">📅 Outlook</a>
      <a href="${office365Url}" style="display:inline-block;padding:8px 14px;background:rgba(0,120,212,0.15);border:1px solid rgba(0,120,212,0.4);border-radius:8px;color:#93C5FD;text-decoration:none;font-size:12px;font-weight:600;">📅 Office 365</a>
    </div>

    <hr style="border:none;border-top:1px solid rgba(124,58,237,0.15);margin:24px 0 16px;">
    <p style="margin:0;font-size:12px;color:#475569;line-height:1.6;">
      Need to reschedule? Reply to this email or visit
      <a href="${FRONTEND_URL}/demo" style="color:#7C3AED;">${FRONTEND_URL}/demo</a>
    </p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#080514;padding:16px 40px;text-align:center;border-top:1px solid rgba(124,58,237,0.1);">
    <p style="margin:0;font-size:11px;color:#334155;">
      &copy; ${year} ApkaAI &mdash; <a href="${FRONTEND_URL}" style="color:#7C3AED;text-decoration:none;">apkaai.com</a>
    </p>
  </td></tr>

</table></td></tr></table>
</body></html>`
}

function buildHostNotificationHtml(booking) {
  const { displayTime } = buildDateTimeRange(
    booking.slot_date, booking.slot_time,
    booking.slot_timezone, booking.duration_minutes
  )
  return `
    <h2 style="color:#7C3AED;">New Demo Booking</h2>
    <p><strong>Name:</strong> ${booking.name}</p>
    <p><strong>Email:</strong> ${booking.email}</p>
    ${booking.company ? `<p><strong>Company:</strong> ${booking.company}</p>` : ''}
    ${booking.phone ? `<p><strong>Phone:</strong> ${booking.phone}</p>` : ''}
    ${booking.use_case ? `<p><strong>Use case:</strong> ${booking.use_case}</p>` : ''}
    <p><strong>Time:</strong> ${displayTime}</p>
    ${booking.meeting_link ? `<p><strong>Meeting link:</strong> <a href="${booking.meeting_link}">${booking.meeting_link}</a></p>` : ''}
    <p><strong>Booking ID:</strong> ${booking.id}</p>
  `
}

// ─── Send a single reminder ───────────────────────────────────────────────────

async function sendReminder(booking, type) {
  const hoursLabel = type === '24h' ? '24 Hours' : '1 Hour'
  const subject    = `⏰ Reminder: Your ApkaAI demo is in ${hoursLabel} — ${booking.name}`
  const html       = buildReminderHtml(booking, hoursLabel)
  const text       = `Hi ${booking.name}, your ApkaAI demo is in ${hoursLabel}. Meeting: ${booking.meeting_link || 'Link coming soon'}`

  const result = await sendEmail(booking.email, subject, html, text)

  if (result.ok) {
    const field = type === '24h' ? 'reminder_24h_sent' : 'reminder_1h_sent'
    await query(`UPDATE demo_bookings SET ${field} = TRUE, updated_at = NOW() WHERE id = $1`, [booking.id])
    console.log(`[Reminder] ${type} reminder sent to ${booking.email} for booking ${booking.id}`)
  } else {
    console.error(`[Reminder] Failed to send ${type} reminder to ${booking.email}: ${result.reason}`)
  }

  return result
}

// ─── Scan and send due reminders ─────────────────────────────────────────────

async function checkAndSendReminders() {
  const now = DateTime.utc()

  try {
    // Find bookings where reminder is due (within next 15 min window)
    const result = await query(
      `SELECT b.*,
              (b.slot_date::text || 'T' || b.slot_time::text) AS slot_datetime_local
       FROM demo_bookings b
       WHERE b.status = 'confirmed'
         AND (
           (b.reminder_24h_sent = FALSE)
           OR (b.reminder_1h_sent = FALSE)
         )
       ORDER BY b.slot_date, b.slot_time`,
      []
    )

    let sent = 0

    for (const booking of result.rows) {
      const slotDt = DateTime.fromISO(`${booking.slot_date}T${booking.slot_time}`, {
        zone: booking.slot_timezone || 'Asia/Kolkata',
      }).toUTC()

      const minutesUntil = slotDt.diff(now, 'minutes').minutes

      // 24h reminder: send when 23h 45m to 24h 15m before
      if (!booking.reminder_24h_sent && minutesUntil >= 23 * 60 + 45 && minutesUntil <= 24 * 60 + 15) {
        await sendReminder(booking, '24h')
        sent++
      }

      // 1h reminder: send when 45m to 75m before
      if (!booking.reminder_1h_sent && minutesUntil >= 45 && minutesUntil <= 75) {
        await sendReminder(booking, '1h')
        sent++
      }
    }

    if (sent > 0) console.log(`[Reminder] Sent ${sent} reminder(s)`)
    return sent
  } catch (err) {
    console.error('[Reminder] checkAndSendReminders error:', err.message)
    return 0
  }
}

// ─── Send booking confirmation to attendee + host ─────────────────────────────

async function sendBookingConfirmation(booking) {
  // Guard against missing required fields
  if (!booking || !booking.slot_date || !booking.slot_time) {
    console.warn('[Reminder] sendBookingConfirmation: missing slot_date or slot_time')
    return
  }

  const { displayTime } = buildDateTimeRange(
    booking.slot_date, booking.slot_time,
    booking.slot_timezone || 'Asia/Kolkata',
    booking.duration_minutes || 30
  )
  const { googleUrl, outlookUrl, office365Url } = buildCalendarLinks(booking)
  const meetLink = booking.meeting_link || ''
  const year = new Date().getFullYear()

  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#08051A;font-family:sans-serif;">
<table width="100%" style="background:#08051A;padding:40px 16px;"><tr><td align="center">
<table width="100%" style="max-width:560px;background:#0F0A1E;border:1px solid rgba(124,58,237,0.35);border-radius:16px;overflow:hidden;">
  <tr><td style="padding:28px 40px;text-align:center;background:linear-gradient(135deg,#150D2E,#0F0A1E);border-bottom:1px solid rgba(124,58,237,0.2);">
    <h1 style="margin:0;font-size:22px;color:#fff;">apka<span style="color:#A855F7;">AI</span></h1>
    <p style="margin:4px 0 0;font-size:12px;color:#7C3AED;">Demo Confirmed!</p>
  </td></tr>
  <tr><td style="padding:32px 40px;">
    <div style="width:56px;height:56px;background:rgba(16,185,129,0.2);border:2px solid rgba(16,185,129,0.4);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;text-align:center;">
      <span style="font-size:28px;">✅</span>
    </div>
    <h2 style="text-align:center;color:#fff;margin:0 0 8px;">Your demo is booked!</h2>
    <p style="text-align:center;color:#94A3B8;font-size:14px;margin:0 0 24px;">Hi ${booking.name}, we're looking forward to showing you ApkaAI.</p>

    <table width="100%" style="background:rgba(124,58,237,0.08);border:1px solid rgba(124,58,237,0.2);border-radius:10px;margin-bottom:20px;">
      <tr><td style="padding:14px 16px;border-bottom:1px solid rgba(124,58,237,0.1);">
        <p style="margin:0;font-size:11px;color:#64748B;text-transform:uppercase;">Date & Time</p>
        <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#fff;">${displayTime}</p>
      </td></tr>
      <tr><td style="padding:14px 16px;border-bottom:1px solid rgba(124,58,237,0.1);">
        <p style="margin:0;font-size:11px;color:#64748B;text-transform:uppercase;">Duration</p>
        <p style="margin:4px 0 0;font-size:14px;color:#fff;">${booking.duration_minutes} minutes</p>
      </td></tr>
      ${booking.meeting_link ? `<tr><td style="padding:14px 16px;">
        <p style="margin:0;font-size:11px;color:#64748B;text-transform:uppercase;">Meeting Link</p>
        <a href="${booking.meeting_link}" style="display:inline-block;margin-top:4px;font-size:13px;color:#A78BFA;">${booking.meeting_link}</a>
      </td></tr>` : ''}
    </table>

    ${booking.meeting_link ? `<table cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
      <tr><td style="background:linear-gradient(135deg,#7C3AED,#6D28D9);border-radius:10px;">
        <a href="${booking.meeting_link}" style="display:inline-block;padding:13px 32px;font-size:14px;font-weight:700;color:#fff;text-decoration:none;">
          🎥 Join Meeting
        </a>
      </td></tr></table>` : ''}

    <p style="font-size:13px;color:#64748B;margin:0 0 10px;">Add to your calendar:</p>
    <div>
      <a href="${googleUrl}" style="display:inline-block;margin:4px;padding:8px 14px;background:rgba(66,133,244,0.15);border:1px solid rgba(66,133,244,0.4);border-radius:8px;color:#93C5FD;text-decoration:none;font-size:12px;">📅 Google Calendar</a>
      <a href="${outlookUrl}" style="display:inline-block;margin:4px;padding:8px 14px;background:rgba(0,120,212,0.15);border:1px solid rgba(0,120,212,0.4);border-radius:8px;color:#93C5FD;text-decoration:none;font-size:12px;">📅 Outlook</a>
      <a href="${office365Url}" style="display:inline-block;margin:4px;padding:8px 14px;background:rgba(0,120,212,0.15);border:1px solid rgba(0,120,212,0.4);border-radius:8px;color:#93C5FD;text-decoration:none;font-size:12px;">📅 Office 365</a>
    </div>

    <hr style="border:none;border-top:1px solid rgba(124,58,237,0.15);margin:24px 0 16px;">
    <p style="font-size:12px;color:#475569;">Questions? Email us at <a href="mailto:ashutoshkumarpandey@apkaai.com" style="color:#7C3AED;">ashutoshkumarpandey@apkaai.com</a></p>
  </td></tr>
  <tr><td style="background:#080514;padding:16px;text-align:center;border-top:1px solid rgba(124,58,237,0.1);">
    <p style="margin:0;font-size:11px;color:#334155;">&copy; ${year} ApkaAI — <a href="${FRONTEND_URL}" style="color:#7C3AED;">apkaai.com</a></p>
  </td></tr>
</table></td></tr></table>
</body></html>`

  // Send to attendee
  await sendEmail(
    booking.email,
    '✅ ApkaAI Demo Confirmed — See you soon!',
    html,
    `Hi ${booking.name}, your ApkaAI demo is confirmed for ${displayTime}. Meeting: ${booking.meeting_link || 'Link coming soon'}`
  )

  // Notify the host
  const hostEmail = process.env.DEMO_HOST_EMAIL || 'ashutoshkumarpandey@apkaai.com'
  await sendEmail(
    hostEmail,
    `📅 New Demo Booking — ${booking.name} (${booking.company || booking.email})`,
    buildHostNotificationHtml(booking),
    `New demo booking from ${booking.name} (${booking.email}) for ${displayTime}`
  )

  console.log(`[Reminder] Confirmation sent to ${booking.email}`)
}

// ─── Start reminder scheduler ─────────────────────────────────────────────────

let reminderInterval = null

function startReminderScheduler(intervalMs = 15 * 60 * 1000) { // every 15 min
  if (reminderInterval) return
  console.log('[Reminder] Scheduler started — checking every 15 minutes')
  checkAndSendReminders() // run immediately on startup
  reminderInterval = setInterval(checkAndSendReminders, intervalMs)
}

function stopReminderScheduler() {
  if (reminderInterval) { clearInterval(reminderInterval); reminderInterval = null }
}

module.exports = {
  sendBookingConfirmation,
  sendReminder,
  checkAndSendReminders,
  startReminderScheduler,
  stopReminderScheduler,
}
