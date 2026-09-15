'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Mail, ArrowRight, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export default function ForgotPasswordPage() {
  const [email,  setEmail]  = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [error,  setError]  = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim()

    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address.')
      return
    }

    setError('')
    setStatus('loading')

    try {
      const res = await fetch(`${API}/api/auth/forgot-password`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: trimmed }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        setStatus('error')
        return
      }

      // Always show success (backend never reveals whether email exists)
      setStatus('sent')
    } catch {
      setError('Network error. Please check your connection and try again.')
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen pt-20 pb-16 px-4 flex items-center justify-center">
      <div className="w-full max-w-md">

        {/* Logo + heading */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <Image src="/apkaai-logo.png" alt="ApkaAI" width={40} height={40} className="rounded-xl" />
            <span className="text-2xl font-extrabold text-white">
              apka<span className="text-purple-400">AI</span>
            </span>
          </Link>
          <h1 className="text-3xl font-extrabold text-white mb-2">Reset your password</h1>
          <p className="text-slate-400">We&apos;ll send a reset link to your email</p>
        </div>

        <div className="glow-border rounded-2xl p-8 bg-[#0F0A1E]">

          {/* ── Success state ── */}
          {status === 'sent' ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-9 h-9 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Check your inbox</h2>
              <p className="text-slate-400 text-sm mb-1">
                If <span className="text-white font-medium">{email}</span> is registered,
                we&apos;ve sent a password reset link.
              </p>
              <p className="text-slate-500 text-xs mb-6">
                The link expires in <span className="text-white">30 minutes</span>.
                Check your spam folder if you don&apos;t see it.
              </p>
              <button
                onClick={() => { setStatus('idle'); setEmail('') }}
                className="text-purple-400 hover:text-purple-300 text-sm underline transition-colors"
              >
                Try a different email address
              </button>
            </div>

          ) : (
            /* ── Form state ── */
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>

              {/* Generic error banner */}
              {status === 'error' && (
                <div className="flex items-start gap-3 bg-red-900/20 border border-red-700/40 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div>
                <label htmlFor="fp-email" className="block text-sm font-medium text-slate-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    id="fp-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError('') }}
                    placeholder="you@example.com"
                    className={`w-full bg-purple-950/30 border rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500
                      focus:outline-none focus:ring-1 transition
                      ${error && status !== 'error'
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-purple-800/40 focus:border-purple-500 focus:ring-purple-500'}`}
                  />
                </div>
                {/* Inline field error (validation, not network) */}
                {error && status !== 'error' && (
                  <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {error}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={status === 'loading'}
                className="btn-primary w-full flex items-center justify-center gap-2 text-white font-bold py-3.5 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {status === 'loading' ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending link…
                  </>
                ) : (
                  <>Send Reset Link <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center mt-6">
          <Link
            href="/signin"
            className="inline-flex items-center gap-1.5 text-purple-400 hover:text-purple-300 text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
