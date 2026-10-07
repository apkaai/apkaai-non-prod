'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  CheckCircle, Calendar, Copy, Check,
  ArrowRight, Mail, Home, Clock
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function safeFormatTime(hhmm: string): string {
  if (!hhmm) return ''
  try {
    // hhmm could be "11:00", "11:00:00", "11%3A00" (already decoded by URL)
    const clean = hhmm.split(':').slice(0, 2).join(':') // take only HH:MM
    const parts = clean.split(':').map(Number)
    const h = parts[0]
    const m = parts[1] || 0
    if (isNaN(h)) return hhmm
    const period = h >= 12 ? 'PM' : 'AM'
    const h12    = h > 12 ? h - 12 : h === 0 ? 12 : h
    return `${h12}:${m.toString().padStart(2, '0')} ${period} IST`
  } catch { return hhmm }
}

function safeFormatDate(ymd: string): string {
  if (!ymd) return ''
  try {
    // Handle both "2026-10-13" and "2026-10-13T00:00:00.000Z" formats
    const clean = ymd.includes('T') ? ymd.split('T')[0] : ymd
    const d = new Date(clean + 'T12:00:00')
    if (isNaN(d.getTime())) return ymd
    return d.toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })
  } catch { return ymd }
}

function buildCalLinks(date: string, time: string, meetLink: string) {
  if (!date || !time) return null
  try {
    // Parse HH:MM safely — ignore seconds if present
    const timeParts = time.split(':').map(Number)
    const h = timeParts[0] || 0
    const m = timeParts[1] || 0
    if (isNaN(h) || isNaN(m)) return null

    const hStr = h.toString().padStart(2, '0')
    const mStr = m.toString().padStart(2, '0')
    const start = new Date(`${date}T${hStr}:${mStr}:00+05:30`)
    if (isNaN(start.getTime())) return null
    const end = new Date(start.getTime() + 30 * 60 * 1000)

    const fmt = (d: Date) =>
      d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '').slice(0, 15) + 'Z'

    const title   = encodeURIComponent('ApkaAI Demo')
    const details = encodeURIComponent(`ApkaAI demo meeting${meetLink ? `\nJoin: ${meetLink}` : ''}`)
    const loc     = encodeURIComponent(meetLink || 'Online')

    return {
      googleUrl:    `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fmt(start)}/${fmt(end)}&details=${details}&location=${loc}`,
      outlookUrl:   `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${start.toISOString()}&enddt=${end.toISOString()}&body=${details}&location=${loc}`,
      office365Url: `https://outlook.office.com/calendar/0/deeplink/compose?subject=${title}&startdt=${start.toISOString()}&enddt=${end.toISOString()}&body=${details}&location=${loc}`,
    }
  } catch { return null }
}

// ─── Confirm content ──────────────────────────────────────────────────────────
function ConfirmContent() {
  const params = useSearchParams()

  const bookingId   = params.get('id')      || ''
  const meetingLink = params.get('meeting') || ''
  const urlDate     = params.get('date')    || ''
  const urlTime     = params.get('time')    || ''
  const urlName     = params.get('name')    || ''
  const urlEmail    = params.get('email')   || ''
  const isFallback  = params.get('fallback') === '1'

  const [slotDate,     setSlotDate]     = useState(urlDate)
  const [slotTime,     setSlotTime]     = useState(urlTime)
  const [bookingName,  setBookingName]  = useState(urlName)
  const [bookingEmail, setBookingEmail] = useState(urlEmail)
  const [meetLink,     setMeetLink]     = useState(meetingLink)
  const [loading,      setLoading]      = useState(!!bookingId && !isFallback)
  const [copied,       setCopied]       = useState(false)

  // Try to enrich from API (optional — not critical)
  useEffect(() => {
    if (!bookingId || isFallback) { setLoading(false); return }
    const controller = new AbortController()
    fetch(`${API}/demo/${bookingId}`, { signal: controller.signal })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.booking) {
          const b = d.booking
          if (b.name)         setBookingName(b.name)
          if (b.email)        setBookingEmail(b.email)
          if (b.slot_date)    setSlotDate(b.slot_date)
          if (b.slot_time)    setSlotTime(b.slot_time.slice(0, 5)) // HH:MM only
          if (b.meeting_link) setMeetLink(b.meeting_link)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [bookingId, isFallback])

  async function copyLink() {
    if (!meetLink) return
    try {
      await navigator.clipboard.writeText(meetLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {}
  }

  // Safe derived values
  const displayDate = safeFormatDate(slotDate)
  const displayTime = safeFormatTime(slotTime)
  const calLinks    = buildCalLinks(slotDate, slotTime, meetLink)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400 text-sm animate-pulse">Loading your booking...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-20 pb-24 px-4">
      <div className="max-w-lg mx-auto pt-8">

        {/* Success header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-3xl bg-emerald-900/20 border border-emerald-700/30 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-2">Demo Confirmed! 🎉</h1>
          <p className="text-slate-400 text-sm">
            {bookingEmail
              ? <>A confirmation email has been sent to{' '}<span className="text-purple-300 font-semibold">{bookingEmail}</span>.</>
              : 'Your demo is confirmed. Check your email for details.'
            }
          </p>
        </div>

        {/* Booking details */}
        <div className="glow-border rounded-2xl bg-[#0F0A1E] p-6 mb-5">
          <h2 className="text-white font-bold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-400" /> Booking Details
          </h2>
          <div className="space-y-3 text-sm">
            {displayDate && (
              <div className="flex justify-between items-start gap-4">
                <span className="text-slate-400 flex-shrink-0">Date</span>
                <span className="text-white font-semibold text-right">{displayDate}</span>
              </div>
            )}
            {displayTime && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Time</span>
                <span className="text-white font-semibold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                  {displayTime}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Duration</span>
              <span className="text-white">30 minutes</span>
            </div>
            {bookingName && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Name</span>
                <span className="text-white">{bookingName}</span>
              </div>
            )}
            {bookingId && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Booking ID</span>
                <span className="text-purple-300 font-mono text-xs">{bookingId.slice(0, 8).toUpperCase()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Meeting link */}
        {meetLink && (
          <div className="glow-border rounded-2xl bg-[#0F0A1E] p-6 mb-5">
            <h2 className="text-white font-bold mb-3 flex items-center gap-2">
              📹 Meeting Link
            </h2>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-950/30 border border-purple-800/30 mb-3">
              <span className="text-purple-300 text-xs font-mono flex-1 truncate">{meetLink}</span>
              <button onClick={copyLink} className="flex-shrink-0 text-slate-400 hover:text-purple-300 transition-colors" title="Copy">
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <a
              href={meetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full btn-primary flex items-center justify-center gap-2 text-white font-bold py-3 rounded-xl text-sm"
            >
              Join Meeting →
            </a>
          </div>
        )}

        {/* Add to calendar */}
        {calLinks && (
          <div className="glow-border rounded-2xl bg-[#0F0A1E] p-6 mb-5">
            <h2 className="text-white font-bold mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-400" /> Add to Calendar
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <a href={calLinks.googleUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 p-3 rounded-xl border border-blue-700/40 bg-blue-900/10 text-blue-300 hover:bg-blue-900/20 text-xs font-semibold transition-all">
                📅 Google
              </a>
              <a href={calLinks.outlookUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 p-3 rounded-xl border border-sky-700/40 bg-sky-900/10 text-sky-300 hover:bg-sky-900/20 text-xs font-semibold transition-all">
                📅 Outlook
              </a>
              <a href={calLinks.office365Url} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 p-3 rounded-xl border border-sky-700/40 bg-sky-900/10 text-sky-300 hover:bg-sky-900/20 text-xs font-semibold transition-all">
                📅 O365
              </a>
            </div>
          </div>
        )}

        {/* Reminder note */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-purple-950/20 border border-purple-900/30 mb-6">
          <Mail className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
          <p className="text-slate-400 text-sm">
            You&apos;ll receive automatic reminders{' '}
            <strong className="text-white">24 hours</strong> and{' '}
            <strong className="text-white">1 hour</strong> before the demo via email.
          </p>
        </div>

        {/* What to expect */}
        <div className="glow-border rounded-2xl bg-[#0F0A1E] p-5 mb-6">
          <h3 className="text-white font-semibold text-sm mb-3">What to expect in your demo</h3>
          <ul className="space-y-2">
            {[
              '🔍 Live walkthrough of 100+ AI tools',
              '☁️ Cloud cost comparison across AWS, Azure, GCP',
              '🛒 How to add tools to cart and manage subscriptions',
              '❓ Q&A session tailored to your use case',
            ].map(item => (
              <li key={item} className="text-slate-400 text-xs flex items-start gap-2">
                <span className="flex-shrink-0">{item.slice(0, 2)}</span>
                {item.slice(2)}
              </li>
            ))}
          </ul>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/"
            className="flex-1 flex items-center justify-center gap-2 border border-purple-700/40 hover:border-purple-500 text-slate-300 hover:text-white font-semibold py-3 rounded-xl text-sm transition-all">
            <Home className="w-4 h-4" /> Back to Home
          </Link>
          <Link href="/tools"
            className="flex-1 flex items-center justify-center gap-2 btn-primary text-white font-bold py-3 rounded-xl text-sm">
            Explore AI Tools <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </div>
  )
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400 animate-pulse text-sm">Loading...</div>
      </div>
    }>
      <ConfirmContent />
    </Suspense>
  )
}
