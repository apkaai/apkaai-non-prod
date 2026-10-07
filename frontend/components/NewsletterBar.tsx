'use client'
import { useState } from 'react'
import { Mail, ArrowRight, CheckCircle, Loader2 } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'

export default function NewsletterBar() {
  const [email, setEmail]     = useState('')
  const [status, setStatus]   = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !email.includes('@')) { setStatus('error'); setMessage('Please enter a valid email'); return }

    setStatus('loading')
    try {
      const res  = await fetch(`${API}/newsletter/subscribe`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, source: 'footer' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to subscribe')
      setStatus('success')
      setMessage(data.message || 'You\'re subscribed!')
      setEmail('')
    } catch (err: unknown) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  if (status === 'success') {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-900/20 border border-emerald-700/30 text-emerald-400 text-sm">
        <CheckCircle className="w-5 h-5 flex-shrink-0" />
        <span>{message}</span>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-white font-semibold text-sm mb-1 flex items-center gap-2">
        <Mail className="w-4 h-4 text-purple-400" />
        Stay updated
      </h3>
      <p className="text-slate-500 text-xs mb-3">Get the latest AI tool launches & deals.</p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setStatus('idle') }}
          placeholder="your@email.com"
          className="flex-1 bg-purple-950/40 border border-purple-800/40 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition min-w-0"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="flex items-center gap-1.5 btn-primary text-white text-xs font-bold px-4 py-2 rounded-lg flex-shrink-0 disabled:opacity-50"
        >
          {status === 'loading'
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <ArrowRight className="w-3.5 h-3.5" />}
        </button>
      </form>
      {status === 'error' && (
        <p className="text-red-400 text-xs mt-1.5">{message}</p>
      )}
    </div>
  )
}
