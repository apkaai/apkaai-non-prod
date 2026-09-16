'use client'
import { useState } from 'react'
import Image from 'next/image'
import { Lock, Mail, Eye, EyeOff, Shield } from 'lucide-react'

// Admin credentials — change these after first login
const ADMIN_EMAIL    = 'admin@apkaai.com'
const ADMIN_PASSWORD = 'ApkaAI@Admin2026'

export default function AdminLoginPage() {
  const [email, setEmail]   = useState('')
  const [pass, setPass]     = useState('')
  const [show, setShow]     = useState(false)
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    await new Promise(r => setTimeout(r, 800))

    // Try backend first, fall back to hardcoded admin
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase(), password: pass }),
      })
      const data = await res.json()
      if (res.ok && data.user?.role === 'admin') {
        localStorage.setItem('apkaai_token', data.token)
        localStorage.setItem('apkaai_user', JSON.stringify(data.user))
        window.location.href = '/admin'
        return
      }
    } catch {}

    // Hardcoded admin fallback
    if (email.toLowerCase() === ADMIN_EMAIL && pass === ADMIN_PASSWORD) {
      const adminUser = { userId: 'admin-001', name: 'Admin', email: ADMIN_EMAIL, role: 'admin' }
      localStorage.setItem('apkaai_token', 'admin-token-' + Date.now())
      localStorage.setItem('apkaai_user', JSON.stringify(adminUser))
      window.location.href = '/admin'
      return
    }

    setError('Invalid admin credentials.')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#08051A]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image src="/apkaai-logo.png" alt="ApkaAI" width={48} height={48} className="rounded-xl mx-auto mb-4" />
          <div className="inline-flex items-center gap-2 bg-purple-900/40 border border-purple-700/50 rounded-full px-4 py-1.5 text-purple-300 text-sm mb-4">
            <Shield className="w-4 h-4" /> Admin Access Only
          </div>
          <h1 className="text-3xl font-extrabold text-white">Admin Login</h1>
          <p className="text-slate-400 mt-1">ApkaAI Control Panel</p>
        </div>

        <div className="glow-border rounded-2xl p-8 bg-[#0F0A1E]">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Admin Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="admin@apkaai.com"
                  className="w-full bg-purple-950/30 border border-purple-800/40 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type={show ? 'text' : 'password'} value={pass} onChange={e => setPass(e.target.value)} required
                  placeholder="Admin password"
                  className="w-full bg-purple-950/30 border border-purple-800/40 rounded-xl pl-11 pr-12 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
                <button type="button" onClick={() => setShow(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {error && <div className="bg-red-900/20 border border-red-700/40 rounded-xl p-3 text-red-400 text-sm">{error}</div>}
            <button type="submit" disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 text-white font-bold py-3.5 rounded-xl disabled:opacity-60">
              {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in...</> : <><Shield className="w-4 h-4" /> Access Admin Panel</>}
            </button>
          </form>

        </div>
      </div>
    </div>
  )
}
