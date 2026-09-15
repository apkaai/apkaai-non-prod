'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

// ── Password strength helper ─────────────────────────────────────────────────
function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 8)  score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^a-zA-Z0-9]/.test(pw)) score++
  if (score <= 1) return { score, label: 'Weak',   color: 'bg-red-500'    }
  if (score <= 3) return { score, label: 'Fair',   color: 'bg-amber-400'  }
  if (score <= 4) return { score, label: 'Good',   color: 'bg-emerald-400'}
  return             { score, label: 'Strong', color: 'bg-emerald-500' }
}

// ── Inner component (uses useSearchParams — must be inside Suspense) ──────────
function ResetPasswordForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const token        = searchParams.get('token') ?? ''

  type TokenState  = 'checking' | 'valid' | 'invalid'
  type SubmitState = 'idle' | 'loading' | 'success' | 'error'

  const [tokenState,   setTokenState]   = useState<TokenState>('checking')
  const [tokenError,   setTokenError]   = useState('')

  const [password,     setPassword]     = useState('')
  const [confirm,      setConfirm]      = useState('')
  const [showPass,     setShowPass]     = useState(false)
  const [showConfirm,  setShowConfirm]  = useState(false)

  const [submitState,  setSubmitState]  = useState<SubmitState>('idle')
  const [submitError,  setSubmitError]  = useState('')
  const [fieldErrors,  setFieldErrors]  = useState<{ password?: string; confirm?: string }>({})

  const strength = getPasswordStrength(password)

  // ── Verify token on mount ──────────────────────────────────────────────────
  const verifyToken = useCallback(async () => {
    if (!token) {
      setTokenState('invalid')
      setTokenError('No reset token found. Please request a new password reset link.')
      return
    }
    try {
      const res  = await fetch(`${API}/api/auth/verify-reset-token?token=${encodeURIComponent(token)}`)
      const data = await res.json()
      if (data.valid) {
        setTokenState('valid')
      } else {
        setTokenState('invalid')
        setTokenError(data.error || 'This reset link is invalid or has expired.')
      }
    } catch {
      setTokenState('invalid')
      setTokenError('Unable to verify the reset link. Please check your connection.')
    }
  }, [token])

  useEffect(() => { verifyToken() }, [verifyToken])

  // ── Client-side validation ─────────────────────────────────────────────────
  function validate(): boolean {
    const errs: { password?: string; confirm?: string } = {}
    if (password.length < 8)
      errs.password = 'Password must be at least 8 characters.'
    else if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password))
      errs.password = 'Password must contain at least one letter and one number.'
    if (!confirm)
      errs.confirm = 'Please confirm your new password.'
    else if (password !== confirm)
      errs.confirm = 'Passwords do not match.'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitError('')
    setSubmitState('loading')

    try {
      const res  = await fetch(`${API}/api/auth/reset-password`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, password, confirmPassword: confirm }),
      })
      const data = await res.json()

      if (!res.ok) {
        setSubmitError(data.error || 'Something went wrong. Please try again.')
        setSubmitState('error')
        return
      }

      setSubmitState('success')
      // Redirect to sign-in after 1.5 seconds
      setTimeout(() => router.push('/signin?reset=1'), 1500)
    } catch {
      setSubmitError('Network error. Please check your connection and try again.')
      setSubmitState('error')
    }
  }

  // ── Render: checking token ─────────────────────────────────────────────────
  if (tokenState === 'checking') {
    return (
      <div className="text-center py-10">
        <Loader2 className="w-10 h-10 text-purple-400 animate-spin mx-auto mb-4" />
        <p className="text-slate-400 text-sm">Verifying reset link…</p>
      </div>
    )
  }

  // ── Render: invalid / expired token ───────────────────────────────────────
  if (tokenState === 'invalid') {
    return (
      <div className="text-center py-4">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-9 h-9 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Link expired or invalid</h2>
        <p className="text-slate-400 text-sm mb-6">{tokenError}</p>
        <Link
          href="/forgot-password"
          className="btn-primary inline-flex items-center gap-2 text-white font-bold px-6 py-3 rounded-xl text-sm"
        >
          Request a new reset link
        </Link>
      </div>
    )
  }

  // ── Render: success ────────────────────────────────────────────────────────
  if (submitState === 'success') {
    return (
      <div className="text-center py-4">
        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-9 h-9 text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Password reset!</h2>
        <p className="text-slate-400 text-sm mb-2">
          Your password has been updated successfully.
        </p>
        <p className="text-slate-500 text-xs mb-6">Redirecting you to sign in…</p>
        <Link
          href="/signin"
          className="btn-primary inline-flex items-center gap-2 text-white font-bold px-6 py-3 rounded-xl text-sm"
        >
          Sign In now
        </Link>
      </div>
    )
  }

  // ── Render: reset form ─────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>

      {/* Network / server error banner */}
      {submitState === 'error' && (
        <div className="flex items-start gap-3 bg-red-900/20 border border-red-700/40 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-400 text-sm">{submitError}</p>
        </div>
      )}

      {/* New Password */}
      <div>
        <label htmlFor="rp-password" className="block text-sm font-medium text-slate-300 mb-2">
          New Password
        </label>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            id="rp-password"
            type={showPass ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={e => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: undefined })) }}
            placeholder="Minimum 8 characters"
            className={`w-full bg-purple-950/30 border rounded-xl pl-11 pr-12 py-3 text-sm text-white placeholder-slate-500
              focus:outline-none focus:ring-1 transition
              ${fieldErrors.password
                ? 'border-red-500 focus:ring-red-500'
                : 'border-purple-800/40 focus:border-purple-500 focus:ring-purple-500'}`}
          />
          <button
            type="button"
            onClick={() => setShowPass(p => !p)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            aria-label={showPass ? 'Hide password' : 'Show password'}
          >
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Strength meter */}
        {password && (
          <div className="mt-2">
            <div className="flex gap-1 mb-1">
              {[1, 2, 3, 4, 5].map(i => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    i <= strength.score ? strength.color : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>
            <p className={`text-xs ${
              strength.label === 'Weak'   ? 'text-red-400'    :
              strength.label === 'Fair'   ? 'text-amber-400'  :
              'text-emerald-400'
            }`}>
              {strength.label}
            </p>
          </div>
        )}

        {fieldErrors.password && (
          <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 flex-shrink-0" /> {fieldErrors.password}
          </p>
        )}
      </div>

      {/* Confirm Password */}
      <div>
        <label htmlFor="rp-confirm" className="block text-sm font-medium text-slate-300 mb-2">
          Confirm New Password
        </label>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            id="rp-confirm"
            type={showConfirm ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirm}
            onChange={e => { setConfirm(e.target.value); setFieldErrors(p => ({ ...p, confirm: undefined })) }}
            placeholder="Re-enter your new password"
            className={`w-full bg-purple-950/30 border rounded-xl pl-11 pr-12 py-3 text-sm text-white placeholder-slate-500
              focus:outline-none focus:ring-1 transition
              ${fieldErrors.confirm
                ? 'border-red-500 focus:ring-red-500'
                : confirm && confirm === password
                  ? 'border-emerald-500/50 focus:ring-emerald-500'
                  : 'border-purple-800/40 focus:border-purple-500 focus:ring-purple-500'}`}
          />
          <button
            type="button"
            onClick={() => setShowConfirm(p => !p)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            aria-label={showConfirm ? 'Hide password' : 'Show password'}
          >
            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {confirm && confirm === password && !fieldErrors.confirm && (
          <p className="text-emerald-400 text-xs mt-1.5 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Passwords match
          </p>
        )}
        {fieldErrors.confirm && (
          <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 flex-shrink-0" /> {fieldErrors.confirm}
          </p>
        )}
      </div>

      {/* Password requirements hint */}
      <ul className="text-xs text-slate-500 space-y-1 pl-1">
        {[
          ['At least 8 characters', password.length >= 8],
          ['Contains a letter',     /[a-zA-Z]/.test(password)],
          ['Contains a number',     /[0-9]/.test(password)],
        ].map(([text, met]) => (
          <li key={text as string} className={`flex items-center gap-1.5 ${met ? 'text-emerald-400' : ''}`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${met ? 'bg-emerald-400' : 'bg-slate-600'}`} />
            {text as string}
          </li>
        ))}
      </ul>

      <button
        type="submit"
        disabled={submitState === 'loading'}
        className="btn-primary w-full flex items-center justify-center gap-2 text-white font-bold py-3.5 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {submitState === 'loading' ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Resetting…</>
        ) : (
          <>Reset Password <CheckCircle className="w-4 h-4" /></>
        )}
      </button>
    </form>
  )
}

// ── Page wrapper (Suspense required for useSearchParams in Next.js 14) ────────
export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen pt-20 pb-16 px-4 flex items-center justify-center">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <Image src="/apkaai-logo.png" alt="ApkaAI" width={40} height={40} className="rounded-xl" />
            <span className="text-2xl font-extrabold text-white">
              apka<span className="text-purple-400">AI</span>
            </span>
          </Link>
          <h1 className="text-3xl font-extrabold text-white mb-2">Choose a new password</h1>
          <p className="text-slate-400">Make it strong and memorable</p>
        </div>

        <div className="glow-border rounded-2xl p-8 bg-[#0F0A1E]">
          <Suspense fallback={
            <div className="text-center py-10">
              <Loader2 className="w-10 h-10 text-purple-400 animate-spin mx-auto mb-4" />
              <p className="text-slate-400 text-sm">Loading…</p>
            </div>
          }>
            <ResetPasswordForm />
          </Suspense>
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
