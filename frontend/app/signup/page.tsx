'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Check } from 'lucide-react'

const AI_INTERESTS = [
  { value: '',               label: 'Select your AI interest...',    emoji: '' },
  { value: 'ai-chat',        label: 'AI Chat & Research',           emoji: '💬' },
  { value: 'coding',         label: 'Coding & Development',         emoji: '💻' },
  { value: 'image-generation',label: 'Image Generation',            emoji: '🎨' },
  { value: 'video-generation',label: 'Video Creation',              emoji: '🎬' },
  { value: 'writing',        label: 'Writing & Content',            emoji: '✍️' },
  { value: 'music-audio',    label: 'Music & Audio',                emoji: '🎵' },
  { value: 'presentations',  label: 'Presentations & Slides',       emoji: '📊' },
  { value: 'automation',     label: 'Automation & Workflows',       emoji: '🤖' },
  { value: 'business',       label: 'Business & Marketing',         emoji: '📈' },
  { value: 'design',         label: 'Design & Creative',            emoji: '🖼️' },
  { value: 'voice-avatars',  label: 'Voice & Avatars',             emoji: '🗣️' },
  { value: 'meetings',       label: 'Meetings & Transcription',     emoji: '📝' },
  { value: 'learning',       label: 'Learning & Education',         emoji: '🧠' },
  { value: 'ai-search',      label: 'AI Search',                    emoji: '🔍' },
  { value: 'research',       label: 'Research & Productivity',      emoji: '📚' },
]

export default function SignUpPage() {
  const [form, setForm]       = useState({ name: '', email: '', password: '', confirm: '', interest: '' })
  const [show, setShow]       = useState(false)
  const [showC, setShowC]     = useState(false)
  const [status, setStatus]   = useState<'idle'|'loading'|'success'|'error'>('idle')
  const [message, setMessage] = useState('')
  const [errors, setErrors]   = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim())               e.name     = 'Name is required'
    if (!form.email.trim())              e.email    = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email'
    if (!form.password)                  e.password = 'Password is required'
    else if (form.password.length < 8)   e.password = 'Minimum 8 characters'
    if (form.password !== form.confirm)  e.confirm  = 'Passwords do not match'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setStatus('loading')
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:     form.name.trim(),
          email:    form.email.trim().toLowerCase(),
          password: form.password,
          interest: form.interest,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        // Store user session
        localStorage.setItem('apkaai_token', data.token)
        localStorage.setItem('apkaai_user', JSON.stringify(data.user))
        setStatus('success')
        setMessage(`Welcome to ApkaAI, ${data.user.name.split(' ')[0]}!`)
        // Route to their chosen AI tools category or all tools
        setTimeout(() => {
          if (form.interest) {
            window.location.href = `/tools?cat=${form.interest}`
          } else {
            window.location.href = '/tools'
          }
        }, 1500)
      } else {
        setStatus('error')
        setMessage(data.error || 'Registration failed. Please try again.')
      }
    } catch {
      setStatus('error')
      setMessage('Network error. Please try again.')
    }
  }

  const strength = form.password.length === 0 ? 0
    : form.password.length < 6 ? 1
    : form.password.length < 10 ? 2
    : /[A-Z]/.test(form.password) && /[0-9]/.test(form.password) ? 4 : 3

  const strengthColor = ['', 'bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500']
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong']

  return (
    <div className="min-h-screen pt-20 pb-16 px-4 flex items-center justify-center">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <Image src="/apkaai-logo.png" alt="ApkaAI" width={40} height={40} className="rounded-xl" />
            <span className="text-2xl font-extrabold text-white">apka<span className="text-purple-400">AI</span></span>
          </Link>
          <h1 className="text-3xl font-extrabold text-white mb-2">Create your account</h1>
          <p className="text-slate-400">Join thousands discovering the best AI tools</p>
        </div>

        <div className="glow-border rounded-2xl p-8 bg-[#0F0A1E]">
          {status === 'success' ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-900/40 border border-emerald-600/40 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">{message}</h2>
              <p className="text-slate-400 text-sm">
                {form.interest
                  ? `Redirecting to ${AI_INTERESTS.find(i => i.value === form.interest)?.label} tools...`
                  : 'Redirecting to AI tools...'}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                    placeholder="Your Name"
                    className={`w-full bg-purple-950/30 border rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 transition ${errors.name ? 'border-red-500 focus:ring-red-500' : 'border-purple-800/40 focus:border-purple-500 focus:ring-purple-500'}`} />
                </div>
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                    placeholder="you@example.com"
                    className={`w-full bg-purple-950/30 border rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 transition ${errors.email ? 'border-red-500 focus:ring-red-500' : 'border-purple-800/40 focus:border-purple-500 focus:ring-purple-500'}`} />
                </div>
                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
              </div>

              {/* ── AI Interest Dropdown ── */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  What AI are you most interested in? <span className="text-slate-500">(optional)</span>
                </label>
                <select value={form.interest} onChange={e => setForm({...form, interest: e.target.value})}
                  className="w-full bg-purple-950/30 border border-purple-800/40 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition appearance-none">
                  {AI_INTERESTS.map(opt => (
                    <option key={opt.value} value={opt.value} className="bg-[#0F0A1E]">
                      {opt.emoji ? `${opt.emoji} ${opt.label}` : opt.label}
                    </option>
                  ))}
                </select>
                {form.interest && (
                  <p className="text-purple-400 text-xs mt-1">
                    After signup you&apos;ll be taken to {AI_INTERESTS.find(i => i.value === form.interest)?.label} tools
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input type={show ? 'text' : 'password'} value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                    placeholder="Min. 8 characters"
                    className={`w-full bg-purple-950/30 border rounded-xl pl-11 pr-12 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 transition ${errors.password ? 'border-red-500 focus:ring-red-500' : 'border-purple-800/40 focus:border-purple-500 focus:ring-purple-500'}`} />
                  <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {form.password && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1,2,3,4].map(n => (
                        <div key={n} className={`h-1 flex-1 rounded-full transition-all ${n <= strength ? strengthColor[strength] : 'bg-slate-700'}`} />
                      ))}
                    </div>
                    <p className={`text-xs ${strength <= 1 ? 'text-red-400' : strength === 2 ? 'text-amber-400' : strength === 3 ? 'text-blue-400' : 'text-emerald-400'}`}>{strengthLabel[strength]} password</p>
                  </div>
                )}
                {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
              </div>

              {/* Confirm */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input type={showC ? 'text' : 'password'} value={form.confirm} onChange={e => setForm({...form, confirm: e.target.value})}
                    placeholder="Repeat your password"
                    className={`w-full bg-purple-950/30 border rounded-xl pl-11 pr-12 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 transition ${errors.confirm ? 'border-red-500 focus:ring-red-500' : 'border-purple-800/40 focus:border-purple-500 focus:ring-purple-500'}`} />
                  <button type="button" onClick={() => setShowC(!showC)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                    {showC ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirm && <p className="text-red-400 text-xs mt-1">{errors.confirm}</p>}
              </div>

              {status === 'error' && (
                <div className="bg-red-900/20 border border-red-700/40 rounded-xl p-3 text-red-400 text-sm">{message}</div>
              )}

              <p className="text-slate-500 text-xs">
                By signing up, you agree to our{' '}
                <Link href="/terms" className="text-purple-400 hover:text-purple-300">Terms</Link> and{' '}
                <Link href="/privacy" className="text-purple-400 hover:text-purple-300">Privacy Policy</Link>
              </p>

              <button type="submit" disabled={status === 'loading'}
                className="btn-primary w-full flex items-center justify-center gap-2 text-white font-bold py-3.5 rounded-xl disabled:opacity-60">
                {status === 'loading'
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating account...</>
                  : <>Create Account <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-slate-400 text-sm mt-6">
          Already have an account?{' '}
          <Link href="/signin" className="text-purple-400 hover:text-purple-300 font-semibold">Sign In</Link>
        </p>
      </div>
    </div>
  )
}
