'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Gift, Copy, Check, ArrowLeft, RefreshCw, Users,
  AlertCircle, Share2, CheckCircle, Clock, Star
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'

function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('apkaai_token') || sessionStorage.getItem('apkaai_token')
}
function getUser() {
  if (typeof window === 'undefined') return null
  try {
    const u = localStorage.getItem('apkaai_user') || sessionStorage.getItem('apkaai_user')
    return u ? JSON.parse(u) : null
  } catch { return null }
}

interface ReferralStats {
  total_referrals: string
  signed_up: string
  rewarded: string
  rewards_earned: string
}
interface ReferralEntry {
  id: string
  status: 'pending' | 'signed_up' | 'rewarded'
  created_at: string
  converted_at: string | null
  referred_name: string | null
}

const STATUS_CONFIG = {
  pending:    { label: 'Pending',    color: 'bg-yellow-900/30 text-yellow-400 border-yellow-700/40',    icon: <Clock className="w-3 h-3" /> },
  signed_up:  { label: 'Signed Up',  color: 'bg-blue-900/30 text-blue-400 border-blue-700/40',          icon: <CheckCircle className="w-3 h-3" /> },
  rewarded:   { label: 'Rewarded',   color: 'bg-emerald-900/30 text-emerald-400 border-emerald-700/40', icon: <Star className="w-3 h-3" /> },
}

export default function ReferralPage() {
  const router  = useRouter()
  const [code, setCode]         = useState('')
  const [link, setLink]         = useState('')
  const [stats, setStats]       = useState<ReferralStats | null>(null)
  const [referrals, setReferrals] = useState<ReferralEntry[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [copied, setCopied]     = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const token = getToken()
      const res   = await fetch(`${API}/referral/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) { router.replace('/signin'); return }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load referral data')
      setCode(data.code)
      setLink(data.link)
      setStats(data.stats)
      setReferrals(data.referrals || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
    setLoading(false)
  }, [router])

  useEffect(() => {
    if (!getUser()) { router.replace('/signin'); return }
    fetchData()
  }, [router, fetchData])

  async function copyCode() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function copyLink() {
    await navigator.clipboard.writeText(link)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  function shareNative() {
    if (navigator.share) {
      navigator.share({
        title: 'Join ApkaAI — Discover 100+ AI Tools',
        text: 'Use my referral link to sign up for ApkaAI and get a discount on your first order!',
        url: link,
      }).catch(() => {})
    } else {
      copyLink()
    }
  }

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Back */}
        <Link href="/profile" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-8 transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Profile
        </Link>

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-purple-900/40 border border-purple-700/30 flex items-center justify-center">
            <Gift className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white">Refer & Earn</h1>
            <p className="text-slate-400 text-sm mt-0.5">Share ApkaAI with friends — both get a reward</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-900/20 border border-red-700/40 text-red-400 mb-6 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-purple-900/10 border border-purple-900/30 animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* How it works */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { step: '1', title: 'Share your link', desc: 'Send your unique referral link to friends' },
                { step: '2', title: 'They sign up', desc: 'Friend creates an ApkaAI account' },
                { step: '3', title: 'Both get 10% off', desc: 'Use APKAAI10 coupon on first order' },
              ].map(s => (
                <div key={s.step} className="p-4 rounded-2xl bg-purple-950/20 border border-purple-900/30 text-center">
                  <div className="w-8 h-8 rounded-full bg-purple-600/30 border border-purple-600/50 text-purple-300 font-bold text-sm flex items-center justify-center mx-auto mb-3">{s.step}</div>
                  <p className="text-white font-semibold text-sm mb-1">{s.title}</p>
                  <p className="text-slate-400 text-xs">{s.desc}</p>
                </div>
              ))}
            </div>

            {/* Referral code + link */}
            <div className="glow-border rounded-2xl bg-[#0F0A1E] p-6 mb-6">
              <h2 className="text-white font-bold mb-4">Your Referral Code</h2>

              {/* Code */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 bg-purple-950/40 border border-purple-700/40 rounded-xl px-5 py-3 text-center">
                  <span className="text-2xl font-extrabold text-purple-300 font-mono tracking-widest">{code}</span>
                </div>
                <button
                  onClick={copyCode}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${copied ? 'bg-emerald-600/30 border border-emerald-700/50 text-emerald-400' : 'border border-purple-700/40 hover:border-purple-500 text-purple-300 hover:text-white'}`}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy Code'}
                </button>
              </div>

              {/* Link */}
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-purple-950/40 border border-purple-700/30 rounded-xl px-4 py-2.5 text-xs text-slate-400 truncate font-mono">
                  {link}
                </div>
                <button
                  onClick={copyLink}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all flex-shrink-0 ${copiedLink ? 'bg-emerald-600/30 border border-emerald-700/50 text-emerald-400' : 'border border-purple-700/40 hover:border-purple-500 text-purple-300 hover:text-white'}`}
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedLink ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={shareNative}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm border border-purple-700/40 hover:border-purple-500 text-purple-300 hover:text-white transition-all flex-shrink-0"
                >
                  <Share2 className="w-3.5 h-3.5" /> Share
                </button>
              </div>
            </div>

            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Total Referrals', value: parseInt(stats.total_referrals), icon: <Users className="w-5 h-5" />, color: 'text-purple-400' },
                  { label: 'Signed Up',       value: parseInt(stats.signed_up),       icon: <CheckCircle className="w-5 h-5" />, color: 'text-blue-400' },
                  { label: 'Rewarded',        value: parseInt(stats.rewarded),        icon: <Star className="w-5 h-5" />,        color: 'text-amber-400' },
                  { label: 'Rewards Earned',  value: parseInt(stats.rewards_earned),  icon: <Gift className="w-5 h-5" />,        color: 'text-emerald-400' },
                ].map(s => (
                  <div key={s.label} className="glow-border rounded-xl p-4 bg-[#0F0A1E]">
                    <div className={`${s.color} mb-2`}>{s.icon}</div>
                    <div className="text-2xl font-extrabold text-white">{s.value}</div>
                    <div className="text-slate-400 text-xs mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Referral history */}
            {referrals.length > 0 && (
              <div className="glow-border rounded-2xl bg-[#0F0A1E] overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-purple-900/30">
                  <h2 className="text-white font-bold">Referred Friends</h2>
                  <button onClick={fetchData} className="p-1.5 text-slate-400 hover:text-white border border-purple-800/40 rounded-lg hover:border-purple-500 transition-all">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="divide-y divide-purple-900/20">
                  {referrals.map(r => {
                    const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending
                    return (
                      <div key={r.id} className="flex items-center justify-between px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-600/30 flex items-center justify-center text-purple-300 font-bold text-xs">
                            {r.referred_name ? r.referred_name[0].toUpperCase() : '?'}
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">{r.referred_name || 'Anonymous'}</p>
                            <p className="text-slate-500 text-xs">{new Date(r.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {referrals.length === 0 && (
              <div className="text-center py-12 glow-border rounded-2xl bg-[#0F0A1E]">
                <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-white font-semibold mb-1">No referrals yet</p>
                <p className="text-slate-400 text-sm">Share your link above to start earning rewards!</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
