'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff, Mail, Lock, ArrowRight, Zap } from 'lucide-react'

export default function SignInPage() {
  const [form, setForm]       = useState({ email: '', password: '' })
  const [show, setShow]       = useState(false)
  const [remember, setRemember] = useState(false)
  const [status, setStatus]   = useState<'idle'|'loading'|'success'|'error'>('idle')
  const [message, setMessage] = useState('')
  const [errors, setErrors]   = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.email.trim())    e.email    = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email'
    if (!form.password)        e.password = 'Password is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setStatus('loading')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email.trim().toLowerCase(), password: form.password }),
      })
      const data = await res.json()
      if (res.ok) {
        // Store token
        if (remember) {
          localStorage.setItem('apkaai_token', data.token)
          localStorage.setItem('apkaai_user', JSON.stringify(data.user))
        } else {
          sessionStorage.setItem('apkaai_token', data.token)
          sessionStorage.setItem('apkaai_user', JSON.stringify(data.user))
        }
        setStatus('success')
        setMessage(`Welcome back, ${data.user?.name || 'there'}!`)
        setTimeout(() => window.location.href = '/tools', 1500)
      } else {
        setStatus('error')
        setMessage(data.error || 'Invalid email or password. Please try again.')
      }
    } catch {
      setStatus('error')
      setMessage('Network error. Please check your connection.')
    }
  }

  return (
    <div className="min-h-screen pt-20 pb-16 px-4 flex items-center justify-center">
      <div className="w-full max-w-md">

        {/* Logo + heading */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <Image src="/apkaai-logo.png" alt="ApkaAI" width={40} height={40} className="rounded-xl" />
            <span className="text-2xl font-extrabold text-white">apka<span className="text-purple-400">AI</span></span>
          </Link>
          <h1 className="text-3xl font-extrabold text-white mb-2">Welcome back</h1>
          <p className="text-slate-400">Sign in to your ApkaAI account</p>
        </div>

        {/* Card */}
        <div className="glow-border rounded-2xl p-8 bg-[#0F0A1E]">

          {status === 'success' ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-purple-900/40 border border-purple-600/40 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-purple-400" fill="currentColor" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">{message}</h2>
              <p className="text-slate-400 text-sm">Redirecting to AI tools...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className={`w-full bg-purple-950/30 border rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 transition ${errors.email ? 'border-red-500 focus:ring-red-500' : 'border-purple-800/40 focus:border-purple-500 focus:ring-purple-500'}`}
                  />
                </div>
                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-300">Password</label>
                  <Link href="/forgot-password" className="text-purple-400 hover:text-purple-300 text-xs transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={show ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="Your password"
                    autoComplete="current-password"
                    className={`w-full bg-purple-950/30 border rounded-xl pl-11 pr-12 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 transition ${errors.password ? 'border-red-500 focus:ring-red-500' : 'border-purple-800/40 focus:border-purple-500 focus:ring-purple-500'}`}
                  />
                  <button type="button" onClick={() => setShow(!show)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
              </div>

              {/* Remember me */}
              <label className="flex items-center gap-3 cursor-pointer">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${remember ? 'bg-purple-600 border-purple-600' : 'border-purple-700/50 bg-transparent'}`}
                  onClick={() => setRemember(!remember)}>
                  {remember && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>}
                </div>
                <span className="text-slate-400 text-sm">Remember me for 30 days</span>
              </label>

              {/* Error message */}
              {status === 'error' && (
                <div className="bg-red-900/20 border border-red-700/40 rounded-xl p-3 text-red-400 text-sm">
                  {message}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={status === 'loading'}
                className="btn-primary w-full flex items-center justify-center gap-2 text-white font-bold py-3.5 rounded-xl disabled:opacity-60 transition-all"
              >
                {status === 'loading' ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in...</>
                ) : (
                  <>Sign In <ArrowRight className="w-4 h-4" /></>
                )}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-purple-900/30" />
                <span className="text-slate-600 text-xs">OR</span>
                <div className="flex-1 h-px bg-purple-900/30" />
              </div>

              {/* Quick access */}
              <Link href="/tools"
                className="w-full flex items-center justify-center gap-2 border border-purple-700/40 hover:border-purple-500 text-slate-300 hover:text-white font-medium py-3 rounded-xl text-sm transition-all">
                Browse tools without signing in
              </Link>
            </form>
          )}
        </div>

        {/* Sign up link */}
        <p className="text-center text-slate-400 text-sm mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-purple-400 hover:text-purple-300 font-semibold transition-colors">
            Create one free
          </Link>
        </p>
      </div>
    </div>
  )
}
