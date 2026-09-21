'use client'
import { useState } from 'react'
import Image from 'next/image'
import { Lock, Mail, Eye, EyeOff, Shield } from 'lucide-react'

// Admin fallback credentials (used when backend is unreachable)
const ADMIN_EMAIL    = 'admin@apkaai.com'
const ADMIN_PASSWORD = 'ApkaAI@Admin2026'

export default function AdminLoginPage() {
  const [email,   setEmail]   = useState('')
  const [pass,    setPass]    = useState('')
  const [show,    setShow]    = useState(false)
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const emailLower = email.trim().toLowerCase()
    const password   = pass

    // ── Try backend first ────────────────────────────────────────────────────
    try {
      const controller = new AbortController()
      const timeout    = setTimeout(() => controller.abort(), 8000) // 8s timeout

      const res = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: emailLower, password }),
        signal:  controller.signal,
      })
      clearTimeout(timeout)

      if (res.ok) {
        const data = await res.json()
        if (data.user?.role === 'admin') {
          localStorage.setItem('apkaai_token', data.token)
          localStorage.setItem('apkaai_user',  JSON.stringify(data.user))
          // Use replace so back button doesn't return to login
          window.location.replace('/admin')
          return
        }
        // Logged in but not admin
        setError('This account does not have admin access.')
        setLoading(false)
        return
      }

      // Backend responded with an error — use its message if possible
      try {
        const errData = await res.json()
        // Only fall through to hardcoded check if it's an auth error (wrong creds)
        // and the email matches admin
        if (res.status !== 401 || emailLower !== ADMIN_EMAIL) {
          setError(errData.error || 'Login failed. Please try again.')
          setLoading(false)
          return
        }
        // Fall through to hardcoded check below for admin with 401
      } catch {
        // JSON parse failed — fall through to hardcoded check
      }
    } catch (fetchErr: unknown) {
      // Network error or timeout — fall through to hardcoded check
      const isTimeout = fetchErr instanceof Error && fetchErr.name === 'AbortError'
      if (!isTimeout) {
        // Only log non-timeout network errors
        console.warn('[AdminLogin] Backend unreachable, using fallback auth')
      }
    }

    // ── Hardcoded admin fallback (works offline / when backend is down) ──────
    if (emailLower === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const adminUser = {
        userId: 'admin-001',
        name:   'Admin',
        email:  ADMIN_EMAIL,
        role:   'admin',
      }
      localStorage.setItem('apkaai_token', 'admin-token-' + Date.now())
      localStorage.setItem('apkaai_user',  JSON.stringify(adminUser))
      window.location.replace('/admin')
      return
    }

    // ── Both paths failed ────────────────────────────────────────────────────
    setError('Invalid admin credentials. Please check your email and password.')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-[#08051A]">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <Image src="/apkaai-logo.png" alt="ApkaAI" width={48} height={48}
            className="rounded-xl mx-auto mb-4" />
          <div className="inline-flex items-center gap-2 bg-purple-900/40 border border-purple-700/50 rounded-full px-4 py-1.5 text-purple-300 text-sm mb-4">
            <Shield className="w-4 h-4" /> Admin Access Only
          </div>
          <h1 className="text-3xl font-extrabold text-white">Admin Login</h1>
          <p className="text-slate-400 mt-1 text-sm">ApkaAI Control Panel</p>
        </div>

        {/* Form card */}
        <div className="glow-border rounded-2xl p-6 sm:p-8 bg-[#0F0A1E]">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>

            {/* Email */}
            <div>
              <label htmlFor="admin-email" className="block text-sm font-medium text-slate-300 mb-2">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="admin@apkaai.com"
                  className="w-full bg-purple-950/30 border border-purple-800/40 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 disabled:opacity-60 transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="admin-password" className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  id="admin-password"
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="Admin password"
                  className="w-full bg-purple-950/30 border border-purple-800/40 rounded-xl pl-11 pr-12 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 disabled:opacity-60 transition"
                />
                {/* Show/hide — larger tap target for mobile */}
                <button
                  type="button"
                  onClick={() => setShow(p => !p)}
                  aria-label={show ? 'Hide password' : 'Show password'}
                  className="absolute right-0 top-0 h-full px-4 text-slate-500 hover:text-white transition-colors"
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-900/20 border border-red-700/40 rounded-xl p-3.5 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 text-white font-bold py-4 rounded-xl disabled:opacity-60 text-base transition-all active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Access Admin Panel
                </>
              )}
            </button>

          </form>
        </div>

        {/* Footer note */}
        <p className="text-center text-slate-600 text-xs mt-6">
          Admin access only. Unauthorised access is prohibited.
        </p>
      </div>
    </div>
  )
}
