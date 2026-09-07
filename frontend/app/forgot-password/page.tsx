'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Mail, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [status, setStatus]   = useState<'idle'|'loading'|'sent'|'error'>('idle')
  const [error, setError]     = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address')
      return
    }
    setError('')
    setStatus('loading')
    // Simulate — in production wire up to a real email service
    await new Promise(r => setTimeout(r, 1200))
    setStatus('sent')
  }

  return (
    <div className="min-h-screen pt-20 pb-16 px-4 flex items-center justify-center">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <Image src="/apkaai-logo.png" alt="ApkaAI" width={40} height={40} className="rounded-xl" />
            <span className="text-2xl font-extrabold text-white">apka<span className="text-purple-400">AI</span></span>
          </Link>
          <h1 className="text-3xl font-extrabold text-white mb-2">Reset your password</h1>
          <p className="text-slate-400">We&apos;ll send a reset link to your email</p>
        </div>

        <div className="glow-border rounded-2xl p-8 bg-[#0F0A1E]">
          {status === 'sent' ? (
            <div className="text-center py-6">
              <CheckCircle className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Check your inbox</h2>
              <p className="text-slate-400 text-sm mb-6">
                We sent a password reset link to <span className="text-white font-medium">{email}</span>
              </p>
              <p className="text-slate-500 text-xs">Didn&apos;t receive it? Check your spam folder or{' '}
                <button onClick={() => setStatus('idle')} className="text-purple-400 hover:text-purple-300 underline">try again</button>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={`w-full bg-purple-950/30 border rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 transition ${error ? 'border-red-500 focus:ring-red-500' : 'border-purple-800/40 focus:border-purple-500 focus:ring-purple-500'}`}
                  />
                </div>
                {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
              </div>
              <button type="submit" disabled={status === 'loading'}
                className="btn-primary w-full flex items-center justify-center gap-2 text-white font-bold py-3.5 rounded-xl disabled:opacity-60">
                {status === 'loading' ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending...</>
                ) : (
                  <>Send Reset Link <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center mt-6">
          <Link href="/signin" className="inline-flex items-center gap-1.5 text-purple-400 hover:text-purple-300 text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
