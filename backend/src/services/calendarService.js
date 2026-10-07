/**
 * calendarService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Creates calendar events and meeting links for demo bookings.
 *
 * Supports:
 *   Google Calendar → creates event + Google Meet link (via Service Account)
 *   Microsoft Graph → creates Teams meeting + Outlook Calendar event (via Client Credentials)
 *   Fallback       → returns a Calendly-style join URL if neither is configured
 *
 * Setup:
 *   Google  : Create a Service Account → download JSON → set GOOGLE_SERVICE_ACCOUNT_JSON in .env
 *             Share the "ApkaAI Demo" calendar with the service account email.
 *   Microsoft: Register App in Azure AD → set MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET
 *              Grant Calendar.ReadWrite + OnlineMeetings.ReadWrite application permissions.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { DateTime } = require('luxon')   // safe timezone handling

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert slot date + time + timezone to ISO strings for calendar APIs
 */
function buildDateTimeRange(slotDate, slotTime, timezone, durationMinutes = 30) {
  // slot_date: "2026-10-15", slot_time: "14:30:00" or "14:00"
  const tz = timezone || 'Asia/Kolkata'
  // Normalize time to HH:MM:SS format
  const timeStr = (slotTime || '10:00:00').replace(/^(\d{2}:\d{2})$/, '$1:00')
  const startDt = DateTime.fromISO(`${slotDate}T${timeStr}`, { zone: tz })

  // If invalid, fall back to UTC
  const validStart = startDt.isValid ? startDt : DateTime.fromISO(`${slotDate}T${timeStr}`, { zone: 'UTC' })
  const endDt      = validStart.plus({ minutes: durationMinutes })

  return {
    startIso:    validStart.toISO()   || new Date().toISOString(),
    endIso:      endDt.toISO()        || new Date().toISOString(),
    startUtc:    validStart.toUTC().toISO() || new Date().toISOString(),
    endUtc:      endDt.toUTC().toISO()     || new Date().toISOString(),
    displayTime: validStart.isValid
      ? validStart.toFormat('cccc, LLLL d yyyy, h:mm a ZZZZ')
      : `${slotDate} at ${timeStr} ${tz}`,
  }
}

// ─── Google Calendar ──────────────────────────────────────────────────────────

async function createGoogleCalendarEvent(booking) {
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  const calendarId         = process.env.GOOGLE_CALENDAR_ID || 'primary'

  if (!serviceAccountJson) {
    console.warn('[Calendar] GOOGLE_SERVICE_ACCOUNT_JSON not set — skipping Google Calendar')
    return null
  }

  try {
    const { google }  = require('googleapis')
    const credentials = JSON.parse(serviceAccountJson)

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
      ],
    })

    const calendar = google.calendar({ version: 'v3', auth })
    const { startIso, endIso } = buildDateTimeRange(
      booking.slot_date, booking.slot_time,
      booking.slot_timezone, booking.duration_minutes
    )

    const event = {
      summary:     `ApkaAI Demo — ${booking.name}${booking.company ? ` (${booking.company})` : ''}`,
      description: [
        `Demo booking for ${booking.name}`,
        booking.company ? `Company: ${booking.company}` : '',
        booking.use_case ? `Use case: ${booking.use_case}` : '',
        `Booking ID: ${booking.id}`,
        '',
        'Booked via apkaai.com/demo',
      ].filter(Boolean).join('\n'),
      start: { dateTime: startIso, timeZone: booking.slot_timezone },
      end:   { dateTime: endIso,   timeZone: booking.slot_timezone },
      attendees: [
        { email: booking.email, displayName: booking.name },
        { email: process.env.DEMO_HOST_EMAIL || 'ashutoshkumarpandey@apkaai.com', organizer: true },
      ],
      conferenceData: {
        createRequest: {
          requestId:             `apkaai-demo-${booking.id}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'email', minutes: 60 },
          { method: 'popup', minutes: 10 },
        ],
      },
      status: 'confirmed',
    }

    const response = await calendar.events.insert({
      calendarId,
      resource:             event,
      conferenceDataVersion: 1,
      sendUpdates:          'all',
    })

    const meetLink = response.data.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri
    console.log(`[Calendar] Google event created: ${response.data.id}`)

    return {
      eventId:     response.data.id,
      meetingLink: meetLink || response.data.hangoutLink || null,
      htmlLink:    response.data.htmlLink,
    }
  } catch (err) {
    console.error('[Calendar] Google Calendar error:', err.message)
    return null
  }
}

// ─── Microsoft Graph (Teams + Outlook) ───────────────────────────────────────

async function getMicrosoftToken() {
  const tenantId     = process.env.MS_TENANT_ID
  const clientId     = process.env.MS_CLIENT_ID
  const clientSecret = process.env.MS_CLIENT_SECRET

  if (!tenantId || !clientId || !clientSecret) return null

  const url  = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`
  const body = new URLSearchParams({
    grant_type:    'client_credentials',
    client_id:     clientId,
    client_secret: clientSecret,
    scope:         'https://graph.microsoft.com/.default',
  })

  const resp = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
  })

  if (!resp.ok) throw new Error(`MS token error: ${resp.status}`)
  const data = await resp.json()
  return data.access_token
}

async function createTeamsMeeting(booking) {
  const hostUserId = process.env.MS_DEMO_HOST_USER_ID  // Azure AD Object ID of the host
  const tenantId   = process.env.MS_TENANT_ID

  if (!tenantId || !hostUserId) {
    console.warn('[Calendar] MS_TENANT_ID or MS_DEMO_HOST_USER_ID not set — skipping Teams')
    return null
  }

  try {
    const token = await getMicrosoftToken()
    if (!token) return null

    const { startUtc, endUtc } = buildDateTimeRange(
      booking.slot_date, booking.slot_time,
      booking.slot_timezone, booking.duration_minutes
    )

    // Create Teams Online Meeting
    const meetingResp = await fetch(
      `https://graph.microsoft.com/v1.0/users/${hostUserId}/onlineMeetings`,
      {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject:   `ApkaAI Demo — ${booking.name}`,
          startDateTime: startUtc,
          endDateTime:   endUtc,
          participants: {
            attendees: [
              { upn: booking.email, role: 'attendee' },
            ],
          },
          allowedPresenters: 'organizer',
          lobbyBypassSettings: { scope: 'everyone', isDialInBypassEnabled: true },
        }),
      }
    )

    if (!meetingResp.ok) {
      const err = await meetingResp.text()
      throw new Error(`Teams meeting error: ${meetingResp.status} — ${err}`)
    }

    const meeting = await meetingResp.json()

    // Create Outlook Calendar Event for host
    const eventResp = await fetch(
      `https://graph.microsoft.com/v1.0/users/${hostUserId}/events`,
      {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: `ApkaAI Demo — ${booking.name}${booking.company ? ` (${booking.company})` : ''}`,
          body: {
            contentType: 'HTML',
            content: `
              <p>Demo booking for <strong>${booking.name}</strong></p>
              ${booking.company ? `<p>Company: ${booking.company}</p>` : ''}
              ${booking.use_case ? `<p>Use case: ${booking.use_case}</p>` : ''}
              <p>Booking ID: ${booking.id}</p>
              <p><a href="${meeting.joinWebUrl}">Join Teams Meeting</a></p>
            `,
          },
          start: { dateTime: startUtc, timeZone: 'UTC' },
          end:   { dateTime: endUtc,   timeZone: 'UTC' },
          attendees: [
            {
              emailAddress: { address: booking.email, name: booking.name },
              type: 'required',
            },
          ],
          isOnlineMeeting:    true,
          onlineMeetingProvider: 'teamsForBusiness',
          onlineMeeting:      { joinUrl: meeting.joinWebUrl },
          reminderMinutesBeforeStart: 60,
          isReminderOn:       true,
        }),
      }
    )

    const calEvent = eventResp.ok ? await eventResp.json() : null
    console.log(`[Calendar] Teams meeting created: ${meeting.id}`)

    return {
      meetingId:   meeting.id,
      meetingLink: meeting.joinWebUrl,
      eventId:     calEvent?.id || null,
    }
  } catch (err) {
    console.error('[Calendar] Teams/Outlook error:', err.message)
    return null
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * createCalendarEvent(booking, calendarType)
 * calendarType: 'google' | 'teams' | 'outlook' | 'none'
 * Returns: { meetingLink, eventId, provider } or null
 */
async function createCalendarEvent(booking, calendarType = 'google') {
  if (calendarType === 'google') {
    const result = await createGoogleCalendarEvent(booking)
    if (result) return { provider: 'google', meetingLink: result.meetingLink, eventId: result.eventId }
  }

  if (calendarType === 'teams' || calendarType === 'outlook') {
    const result = await createTeamsMeeting(booking)
    if (result) return { provider: 'teams', meetingLink: result.meetingLink, eventId: result.meetingId, calEventId: result.eventId }
  }

  // Fallback — no calendar configured, generate a placeholder meeting link
  console.warn('[Calendar] No calendar integration configured. Using fallback.')
  return {
    provider:    'none',
    meetingLink: `${(process.env.FRONTEND_URL || 'https://apkaai.com')}/demo/join/${booking.id}`,
    eventId:     null,
  }
}

/**
 * buildCalendarLinks(booking)
 * Returns add-to-calendar links for Google, Outlook, Apple, Teams
 */
function buildCalendarLinks(booking) {
  // Guard against null/undefined booking fields
  if (!booking || !booking.slot_date || !booking.slot_time) {
    return {
      googleUrl:    'https://calendar.google.com',
      outlookUrl:   'https://outlook.live.com/calendar',
      office365Url: 'https://outlook.office.com/calendar',
      icsUrl:       '',
      displayTime:  'Time to be confirmed',
    }
  }

  const { startIso, endIso, displayTime } = buildDateTimeRange(
    booking.slot_date, booking.slot_time,
    booking.slot_timezone || 'Asia/Kolkata',
    booking.duration_minutes || 30
  )

  const meetLink = booking.meeting_link || ''
  const title    = encodeURIComponent(`ApkaAI Demo — ${booking.name || 'Guest'}`)
  const details  = encodeURIComponent(`ApkaAI demo meeting\nMeeting link: ${meetLink || '(will be shared)'}`)
  const location = encodeURIComponent(meetLink || 'Online')

  const gStart   = startIso.replace(/[-:]/g, '').replace('.000', '').replace('Z', 'Z')
  const gEnd     = endIso.replace(/[-:]/g, '').replace('.000', '').replace('Z', 'Z')
  const googleUrl    = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${gStart}/${gEnd}&details=${details}&location=${location}`
  const outlookUrl   = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${startIso}&enddt=${endIso}&body=${details}&location=${location}`
  const office365Url = `https://outlook.office.com/calendar/0/deeplink/compose?subject=${title}&startdt=${startIso}&enddt=${endIso}&body=${details}&location=${location}`

  const icsContent = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ApkaAI//Demo//EN', 'BEGIN:VEVENT',
    `DTSTART:${gStart}`, `DTEND:${gEnd}`,
    `SUMMARY:ApkaAI Demo — ${booking.name || 'Guest'}`,
    `DESCRIPTION:ApkaAI demo meeting\\nMeeting: ${meetLink}`,
    `LOCATION:${meetLink || 'Online'}`,
    `UID:${booking.id || 'demo'}@apkaai.com`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
  const icsUrl = `data:text/calendar;charset=utf8,${encodeURIComponent(icsContent)}`

  return { googleUrl, outlookUrl, office365Url, icsUrl, displayTime }
}

module.exports = { createCalendarEvent, buildCalendarLinks, buildDateTimeRange }
