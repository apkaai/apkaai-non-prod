#!/bin/bash
# hotpatch.sh — patch calendarService.js directly on EC2 (no git needed)
APP="/home/ec2-user/apkaai"

echo "=== Patching calendarService.js ==="
cat > "$APP/backend/src/services/calendarService.js" << 'CALENDARSERVICE'
/**
 * calendarService.js — Calendar event creation + calendar link builder
 * Fixed: null-safe buildDateTimeRange with luxon fallback
 */
const { DateTime } = require('luxon')

function buildDateTimeRange(slotDate, slotTime, timezone, durationMinutes) {
  const tz = timezone || 'Asia/Kolkata'
  const mins = durationMinutes || 30
  const timeStr = (slotTime || '10:00:00').replace(/^(\d{2}:\d{2})$/, '$1:00')
  let startDt = DateTime.fromISO(`${slotDate}T${timeStr}`, { zone: tz })
  if (!startDt.isValid) startDt = DateTime.fromISO(`${slotDate}T${timeStr}`, { zone: 'UTC' })
  if (!startDt.isValid) startDt = DateTime.now().setZone(tz)
  const endDt = startDt.plus({ minutes: mins })
  const safeISO = (dt) => dt && dt.isValid ? (dt.toISO() || new Date().toISOString()) : new Date().toISOString()
  return {
    startIso:    safeISO(startDt),
    endIso:      safeISO(endDt),
    startUtc:    safeISO(startDt.toUTC()),
    endUtc:      safeISO(endDt.toUTC()),
    displayTime: startDt.isValid ? startDt.toFormat('cccc, LLLL d yyyy, h:mm a ZZZZ') : `${slotDate} at ${timeStr}`,
  }
}

async function createGoogleCalendarEvent(booking) {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    console.warn('[Calendar] GOOGLE_SERVICE_ACCOUNT_JSON not set — skipping Google Calendar')
    return null
  }
  try {
    const { google } = require('googleapis')
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
    const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/calendar'] })
    const calendar = google.calendar({ version: 'v3', auth })
    const { startIso, endIso } = buildDateTimeRange(booking.slot_date, booking.slot_time, booking.slot_timezone, booking.duration_minutes)
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary'
    const event = {
      summary: `ApkaAI Demo — ${booking.name}${booking.company ? ` (${booking.company})` : ''}`,
      description: [`Demo for ${booking.name}`, booking.use_case ? `Use case: ${booking.use_case}` : '', `ID: ${booking.id}`].filter(Boolean).join('\n'),
      start: { dateTime: startIso, timeZone: booking.slot_timezone || 'Asia/Kolkata' },
      end:   { dateTime: endIso,   timeZone: booking.slot_timezone || 'Asia/Kolkata' },
      attendees: [{ email: booking.email, displayName: booking.name }, { email: process.env.DEMO_HOST_EMAIL || 'ashutoshkumarpandey@apkaai.com', organizer: true }],
      conferenceData: { createRequest: { requestId: `apkaai-demo-${booking.id}`, conferenceSolutionKey: { type: 'hangoutsMeet' } } },
      reminders: { useDefault: false, overrides: [{ method: 'email', minutes: 24*60 }, { method: 'email', minutes: 60 }] },
    }
    const response = await calendar.events.insert({ calendarId, resource: event, conferenceDataVersion: 1, sendUpdates: 'all' })
    const meetLink = response.data.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri
    return { eventId: response.data.id, meetingLink: meetLink || response.data.hangoutLink || null, htmlLink: response.data.htmlLink }
  } catch (err) { console.error('[Calendar] Google Calendar error:', err.message); return null }
}

async function createCalendarEvent(booking, calendarType) {
  if (calendarType === 'google') {
    const result = await createGoogleCalendarEvent(booking)
    if (result) return { provider: 'google', meetingLink: result.meetingLink, eventId: result.eventId }
  }
  console.warn('[Calendar] No calendar integration configured. Using fallback.')
  const frontendUrl = (process.env.FRONTEND_URL || 'https://apkaai.com').replace(/\/$/, '')
  return { provider: 'none', meetingLink: `${frontendUrl}/demo/join/${booking.id}`, eventId: null }
}

function buildCalendarLinks(booking) {
  if (!booking || !booking.slot_date || !booking.slot_time) {
    return { googleUrl: 'https://calendar.google.com', outlookUrl: 'https://outlook.live.com/calendar', office365Url: 'https://outlook.office.com/calendar', icsUrl: '', displayTime: 'Time to be confirmed' }
  }
  const { startIso, endIso, displayTime } = buildDateTimeRange(booking.slot_date, booking.slot_time, booking.slot_timezone, booking.duration_minutes)
  const meetLink = booking.meeting_link || ''
  const title    = encodeURIComponent(`ApkaAI Demo — ${booking.name || 'Guest'}`)
  const details  = encodeURIComponent(`ApkaAI demo\nMeeting: ${meetLink || '(link coming)'}`)
  const location = encodeURIComponent(meetLink || 'Online')
  const gStart   = startIso.replace(/[-:]/g,'').replace('.000','').replace('Z','Z')
  const gEnd     = endIso.replace(/[-:]/g,'').replace('.000','').replace('Z','Z')
  return {
    googleUrl:    `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${gStart}/${gEnd}&details=${details}&location=${location}`,
    outlookUrl:   `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${startIso}&enddt=${endIso}&body=${details}&location=${location}`,
    office365Url: `https://outlook.office.com/calendar/0/deeplink/compose?subject=${title}&startdt=${startIso}&enddt=${endIso}&body=${details}&location=${location}`,
    icsUrl:       '',
    displayTime,
  }
}

module.exports = { createCalendarEvent, buildCalendarLinks, buildDateTimeRange }
CALENDARSERVICE

echo "  ✅ calendarService.js patched"
node --check "$APP/backend/src/services/calendarService.js" && echo "  Syntax: OK" || echo "  Syntax: ERROR"

echo ""
echo "=== Restart API ==="
pm2 restart apkaai-api --update-env
sleep 4
curl -sf http://localhost:4000/health && echo "  API: healthy" || echo "  API: DOWN"

echo ""
echo "=== Test booking + email ==="
RESULT=$(curl -s -X POST http://localhost:4000/api/demo/book \
  -H "Content-Type: application/json" \
  -d '{"name":"Ashutosh Pandey","email":"ashutoshkumarpandey@apkaai.com","company":"ApkaAI","slot_date":"2026-10-11","slot_time":"15:00:00","slot_timezone":"Asia/Kolkata","duration_minutes":30,"calendar_type":"none","use_case":"Email verification test"}')
echo "Booking result: $RESULT"

sleep 3
echo ""
echo "=== Error logs after booking ==="
pm2 logs apkaai-api --err --lines 3 --nostream 2>&1 | tail -5
echo "DONE"
