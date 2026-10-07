'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Calendar, Clock, User, Mail, Building2, Phone,
  MessageSquare, ChevronLeft, ChevronRight, ArrowRight,
  Loader2, CheckCircle, Video, Shield, Zap, Star, AlertCircle
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Slot { time: string; available: boolean; label: string }

// ─── Time slots (Mon-Fri, 10am-5pm IST) ──────────────────────────────────────
const ALL_SLOTS = [
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
]

function formatSlotLabel(hhmm: string): string {
  try {
    const [h, m] = hhmm.split(':').map(Number)
    const period = h >= 12 ? 'PM' : 'AM'
    const h12    = h > 12 ? h - 12 : h === 0 ? 12 : h
    return `${h12}:${(m || 0).toString().padStart(2, '0')} ${period}`
  } catch { return hhmm }
}

function generateSlots(ymd: string): Slot[] {
  try {
    const now      = new Date()
    const todayYMD = now.toISOString().slice(0, 10)
    const isToday  = ymd === todayYMD
    const nowH     = now.getHours()
    const nowM     = now.getMinutes()
    const nowHHMM  = `${nowH.toString().padStart(2,'0')}:${nowM.toString().padStart(2,'0')}`

    return ALL_SLOTS.map(time => ({
      time,
      available: !(isToday && time <= nowHHMM),
      label: formatSlotLabel(time),
    }))
  } catch {
    return ALL_SLOTS.map(time => ({ time, available: true, label: formatSlotLabel(time) }))
  }
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}
function toYMD(date: Date): string {
  return date.toISOString().slice(0, 10)
}
function formatDisplayDate(ymd: string): string {
  try {
    return new Date(ymd + 'T12:00:00').toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })
  } catch { return ymd }
}
function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

// ─── Calendar strip ───────────────────────────────────────────────────────────
function DateStrip({ selected, onSelect }: { selected: string; onSelect: (ymd: string) => void }) {
  const today = new Date()
  const [offset, setOffset] = useState(0)
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, offset + i))

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setOffset(o => Math.max(0, o - 7))}
          disabled={offset === 0}
          className="p-1.5 rounded-lg border border-purple-800/40 text-slate-400 hover:text-white hover:border-purple-500 disabled:opacity-30 transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-slate-300 text-sm font-medium">
          {days[0].toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </span>
        <button
          onClick={() => setOffset(o => o + 7)}
          className="p-1.5 rounded-lg border border-purple-800/40 text-slate-400 hover:text-white hover:border-purple-500 transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map(day => {
          const ymd      = toYMD(day)
          const weekend  = isWeekend(day)
          const pastDate = day < today && toYMD(day) !== toYMD(today)
          const disabled = weekend || pastDate
          const isActive = ymd === selected

          return (
            <button
              key={ymd}
              onClick={() => !disabled && onSelect(ymd)}
              disabled={disabled}
              className={`flex flex-col items-center py-2.5 rounded-xl text-center transition-all ${
                isActive
                  ? 'bg-purple-600 border border-purple-500 text-white'
                  : disabled
                  ? 'opacity-25 cursor-not-allowed text-slate-600'
                  : 'border border-purple-900/30 text-slate-300 hover:border-purple-600 hover:bg-purple-900/20'
              }`}
            >
              <span className="text-[10px] font-medium uppercase tracking-wide">
                {day.toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 3)}
              </span>
              <span className="text-base font-bold mt-0.5">{day.getDate()}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Time slot grid ───────────────────────────────────────────────────────────
function TimeSlotGrid({ slots, selected, onSelect }: {
  slots: Slot[]
  selected: string
  onSelect: (t: string) => void
}) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {slots.map(slot => (
        <button
          key={slot.time}
          onClick={() => slot.available && onSelect(slot.time)}
          disabled={!slot.available}
          className={`py-2.5 px-2 rounded-xl text-xs font-semibold text-center transition-all ${
            slot.time === selected
              ? 'bg-purple-600 border border-purple-500 text-white shadow-glow-sm'
              : slot.available
              ? 'border border-purple-900/40 text-slate-300 hover:border-purple-500 hover:bg-purple-900/20 hover:text-white'
              : 'opacity-25 cursor-not-allowed border border-purple-900/20 text-slate-600 line-through'
          }`}
        >
          {slot.label}
        </button>
      ))}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DemoPage() {
  const router = useRouter()

  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [slots, setSlots]               = useState<Slot[]>([])

  const [form, setForm] = useState({
    name: '', email: '', company: '', phone: '', use_case: '',
    calendar_type: 'none',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')

  const handleDateSelect = useCallback((ymd: string) => {
    setSelectedDate(ymd)
    setSelectedTime('')
    setSlots(generateSlots(ymd))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.name.trim())  { setError('Please enter your name'); return }
    if (!form.email.trim()) { setError('Please enter your email'); return }
    if (!/\S+@\S+\.\S+/.test(form.email)) { setError('Please enter a valid email address'); return }
    if (!selectedDate)      { setError('Please select a date'); return }
    if (!selectedTime)      { setError('Please select a time slot'); return }

    setSubmitting(true)

    // Get timezone safely
    let timezone = 'Asia/Kolkata'
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'
    } catch { timezone = 'Asia/Kolkata' }

    try {
      const res = await fetch(`${API}/demo/book`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:             form.name.trim(),
          email:            form.email.trim().toLowerCase(),
          company:          form.company.trim() || undefined,
          phone:            form.phone.trim() || undefined,
          use_case:         form.use_case.trim() || undefined,
          slot_date:        selectedDate,
          slot_time:        selectedTime + ':00',
          slot_timezone:    timezone,
          duration_minutes: 30,
          calendar_type:    form.calendar_type,
        }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        // Redirect to confirm with all info in URL params
        const params = new URLSearchParams({
          id:     data.bookingId || '',
          date:   selectedDate,
          time:   selectedTime,
          name:   form.name.trim(),
          email:  form.email.trim(),
          ...(form.company ? { company: form.company.trim() } : {}),
          ...(data.meetingLink ? { meeting: data.meetingLink } : {}),
        })
        router.push(`/demo/confirm?${params.toString()}`)
        return
      }

      // API error
      if (data.error?.includes('no longer available')) {
        setError('This time slot was just booked. Please choose a different time.')
        // Refresh slots
        setSlots(generateSlots(selectedDate))
        setSelectedTime('')
      } else {
        setError(data.error || 'Booking failed. Please try again.')
      }
    } catch {
      // Network error — still redirect to confirm (email won't send but UX is better)
      const params = new URLSearchParams({
        date:    selectedDate,
        time:    selectedTime,
        name:    form.name.trim(),
        email:   form.email.trim(),
        fallback: '1',
      })
      router.push(`/demo/confirm?${params.toString()}`)
      return
    }

    setSubmitting(false)
  }

  return (
    <div className="min-h-screen pt-20 pb-24 px-4">
      <div className="max-w-5xl mx-auto">

        {/* Hero */}
        <div className="text-center mb-10 pt-8">
          <div className="inline-flex items-center gap-2 bg-purple-900/40 border border-purple-700/50 rounded-full px-4 py-2 text-sm text-purple-300 mb-5">
            <Video className="w-4 h-4" /> Free 30-minute demo
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-3">
            Book a Demo with
            <span className="block bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent mt-1">
              ApkaAI Team
            </span>
          </h1>
          <p className="text-slate-400 text-base max-w-xl mx-auto">
            See 100+ AI tools, cloud cost intelligence, and enterprise features in action. 30 minutes. No commitment.
          </p>
        </div>

        {/* Value props */}
        <div className="grid grid-cols-3 gap-3 mb-8 max-w-2xl mx-auto">
          {[
            { icon: <Zap className="w-4 h-4" />,    text: 'Live walkthrough' },
            { icon: <Shield className="w-4 h-4" />, text: 'No credit card' },
            { icon: <Star className="w-4 h-4" />,   text: 'Tailored to you' },
          ].map(v => (
            <div key={v.text} className="flex items-center gap-2 text-sm text-slate-400 p-3 rounded-xl bg-purple-950/20 border border-purple-900/30">
              <span className="text-purple-400 flex-shrink-0">{v.icon}</span>
              {v.text}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Left: Date + Time */}
          <div className="lg:col-span-3 space-y-5">
            <div className="glow-border rounded-2xl bg-[#0F0A1E] p-6">
              <h2 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-400" /> Select a Date
                <span className="text-slate-500 text-xs font-normal ml-1">(Mon–Fri only)</span>
              </h2>
              <DateStrip selected={selectedDate} onSelect={handleDateSelect} />
            </div>

            {selectedDate && (
              <div className="glow-border rounded-2xl bg-[#0F0A1E] p-6">
                <h2 className="text-white font-bold text-sm mb-1 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-400" /> Available Times
                </h2>
                <p className="text-slate-500 text-xs mb-4">{formatDisplayDate(selectedDate)} · All times in IST</p>
                <TimeSlotGrid slots={slots} selected={selectedTime} onSelect={setSelectedTime} />
              </div>
            )}
          </div>

          {/* Right: Form */}
          <div className="lg:col-span-2">
            <div className="glow-border rounded-2xl bg-[#0F0A1E] p-6 sticky top-24">
              {selectedDate && selectedTime ? (
                <>
                  {/* Selected summary */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-600/20 border border-purple-600/40 mb-5">
                    <CheckCircle className="w-5 h-5 text-purple-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{formatDisplayDate(selectedDate)}</p>
                      <p className="text-purple-300 text-xs">{slots.find(s => s.time === selectedTime)?.label} IST · 30 min</p>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-3">
                    {/* Name */}
                    <div>
                      <label className="text-xs text-slate-400 font-medium mb-1 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" /> Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Your full name"
                        className="w-full bg-purple-950/40 border border-purple-800/40 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="text-xs text-slate-400 font-medium mb-1 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" /> Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="you@company.com"
                        className="w-full bg-purple-950/40 border border-purple-800/40 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                      />
                    </div>

                    {/* Company */}
                    <div>
                      <label className="text-xs text-slate-400 font-medium mb-1 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5" /> Company (optional)
                      </label>
                      <input
                        type="text"
                        value={form.company}
                        onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                        placeholder="Your company"
                        className="w-full bg-purple-950/40 border border-purple-800/40 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="text-xs text-slate-400 font-medium mb-1 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" /> Phone (optional)
                      </label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                        placeholder="+91 98765 43210"
                        className="w-full bg-purple-950/40 border border-purple-800/40 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                      />
                    </div>

                    {/* Use case */}
                    <div>
                      <label className="text-xs text-slate-400 font-medium mb-1 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" /> What do you want to explore?
                      </label>
                      <textarea
                        value={form.use_case}
                        onChange={e => setForm(f => ({ ...f, use_case: e.target.value }))}
                        placeholder="e.g. AI tools for marketing, cloud cost comparison..."
                        rows={2}
                        className="w-full bg-purple-950/40 border border-purple-800/40 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition resize-none"
                      />
                    </div>

                    {/* Error */}
                    {error && (
                      <div className="flex items-start gap-2 text-red-400 text-xs bg-red-900/20 border border-red-700/30 rounded-lg px-3 py-2.5">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        {error}
                      </div>
                    )}

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full btn-primary text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 text-sm mt-1"
                    >
                      {submitting
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Booking your demo...</>
                        : <>Confirm Demo Booking <ArrowRight className="w-4 h-4" /></>
                      }
                    </button>

                    <p className="text-center text-slate-600 text-xs">
                      A confirmation email will be sent immediately after booking.
                    </p>
                  </form>
                </>
              ) : (
                <div className="text-center py-10">
                  <div className="w-14 h-14 rounded-2xl bg-purple-900/20 border border-purple-800/30 flex items-center justify-center mx-auto mb-3">
                    <Calendar className="w-7 h-7 text-purple-400/60" />
                  </div>
                  <p className="text-white font-semibold text-sm mb-1">Pick a date and time</p>
                  <p className="text-slate-500 text-xs">Select from the calendar on the left to continue</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
