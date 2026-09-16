'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { BookMarked, Eye, Edit3, Copy, Trash2, AlertCircle, Plus, Calendar, DollarSign } from 'lucide-react'
import { PROVIDERS, CURRENCY_SYMBOLS, EXCHANGE_RATES, formatCurrency, convertCurrency, type ProviderId } from '@/lib/cloud-pricing'

interface SavedEstimate {
  id:        string
  provider:  ProviderId
  items:     { label: string; monthly: number; provider: ProviderId }[]
  currency:  string
  tax:       boolean
  taxRate:   number
  monthly:   number
  createdAt: string
}

export default function SavedPage() {
  const [estimates, setEstimates] = useState<SavedEstimate[]>([])
  const [user, setUser] = useState<{ name: string } | null>(null)
  const [currency, setCurrency] = useState('USD')

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const u = localStorage.getItem('apkaai_user')
      setUser(u ? JSON.parse(u) : null)
      const saved = localStorage.getItem('cloud_estimates')
      setEstimates(saved ? JSON.parse(saved) : [])
    } catch { /* ignore */ }
  }, [])

  function deleteEstimate(id: string) {
    const updated = estimates.filter(e => e.id !== id)
    setEstimates(updated)
    localStorage.setItem('cloud_estimates', JSON.stringify(updated))
  }

  function duplicateEstimate(est: SavedEstimate) {
    const copy: SavedEstimate = {
      ...est,
      id:        `EST-${Date.now().toString(36).toUpperCase()}`,
      createdAt: new Date().toISOString(),
    }
    const updated = [copy, ...estimates]
    setEstimates(updated)
    localStorage.setItem('cloud_estimates', JSON.stringify(updated))
  }

  const fmt = (n: number) => formatCurrency(convertCurrency(n, currency), currency)

  if (!user) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-purple-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Sign In Required</h2>
          <p className="text-slate-400 mb-6">
            Please log in to view and manage your saved cloud cost estimates.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signin" className="btn-primary flex items-center justify-center gap-2 text-white font-bold px-6 py-3 rounded-xl text-sm">
              Log In
            </Link>
            <Link href="/cloud/bill" className="flex items-center justify-center gap-2 border border-purple-700/40 text-slate-300 px-6 py-3 rounded-xl text-sm hover:border-purple-500 transition-all">
              <Plus className="w-4 h-4" /> Create Estimate (no login)
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-20 pb-24">
      <div className="max-w-5xl mx-auto px-4 pt-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
              <Link href="/cloud" className="hover:text-white transition-colors">Cloud</Link>
              <span>/</span>
              <span className="text-slate-300">Saved Estimates</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-1 flex items-center gap-3">
              <BookMarked className="w-8 h-8 text-amber-400" />
              Saved Estimates
            </h1>
            <p className="text-slate-400 text-sm">
              {estimates.length} estimate{estimates.length !== 1 ? 's' : ''} saved · Logged in as {user.name}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Currency */}
            {Object.keys(EXCHANGE_RATES).map(c => (
              <button key={c} onClick={() => setCurrency(c)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  currency === c ? 'border-amber-500 bg-amber-500/15 text-amber-300' : 'border-purple-900/30 text-slate-400'
                }`}>
                {CURRENCY_SYMBOLS[c]} {c}
              </button>
            ))}
            <Link href="/cloud/bill"
              className="btn-primary flex items-center gap-2 text-white font-bold px-4 py-2 rounded-xl text-sm">
              <Plus className="w-4 h-4" /> New Estimate
            </Link>
          </div>
        </div>

        {/* Empty state */}
        {estimates.length === 0 ? (
          <div className="glow-border rounded-2xl p-16 bg-[#0F0A1E] text-center">
            <BookMarked className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg font-semibold mb-2">No saved estimates yet</p>
            <p className="text-slate-600 text-sm mb-6">
              Build a cloud infrastructure bill and save it to track your estimates here.
            </p>
            <Link href="/cloud/bill"
              className="btn-primary inline-flex items-center gap-2 text-white font-bold px-6 py-3 rounded-xl text-sm">
              <Plus className="w-4 h-4" /> Build Your First Bill
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {estimates.map(est => {
              const p = PROVIDERS.find(x => x.id === est.provider) || PROVIDERS[0]
              const date = new Date(est.createdAt).toLocaleDateString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric'
              })
              const itemCount = est.items?.length || 0

              return (
                <div key={est.id}
                  className="glow-border rounded-2xl p-5 bg-[#0F0A1E] hover:border-purple-600/40 transition-all">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{p.logo}</span>
                      <div>
                        <p className="text-white font-bold text-sm font-mono">{est.id}</p>
                        <p className="text-slate-500 text-xs">{p.shortName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-extrabold text-white">{fmt(est.monthly)}</p>
                      <p className="text-slate-500 text-xs">/month</p>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {date}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" /> {itemCount} service{itemCount !== 1 ? 's' : ''}
                    </span>
                    {est.tax && <span>{est.taxRate}% tax</span>}
                  </div>

                  {/* Services list */}
                  {est.items && est.items.length > 0 && (
                    <div className="space-y-1 mb-4">
                      {est.items.slice(0, 3).map((item, idx) => {
                        const ip = PROVIDERS.find(x => x.id === item.provider)
                        return (
                          <div key={idx} className="flex justify-between text-xs">
                            <span className="text-slate-400 truncate max-w-[160px]">{ip?.logo} {item.label}</span>
                            <span className="text-slate-500">{fmt(item.monthly)}</span>
                          </div>
                        )
                      })}
                      {est.items.length > 3 && (
                        <p className="text-xs text-slate-600">+{est.items.length - 3} more services</p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-purple-900/20">
                    <Link href="/cloud/bill"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-purple-900/20 hover:bg-purple-900/40 text-slate-300 hover:text-white text-xs font-medium transition-all">
                      <Eye className="w-3.5 h-3.5" /> View
                    </Link>
                    <Link href="/cloud/bill"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-purple-900/20 hover:bg-purple-900/40 text-slate-300 hover:text-white text-xs font-medium transition-all">
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </Link>
                    <button onClick={() => duplicateEstimate(est)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-purple-900/20 hover:bg-purple-900/40 text-slate-300 hover:text-white text-xs font-medium transition-all">
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </button>
                    <button onClick={() => deleteEstimate(est.id)}
                      className="p-2 rounded-lg bg-red-900/10 hover:bg-red-900/30 text-red-500 hover:text-red-400 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer note */}
        {estimates.length > 0 && (
          <p className="text-xs text-slate-600 text-center mt-8">
            Estimates are stored locally in your browser. Log in status is required to view saved estimates.
          </p>
        )}
      </div>
    </div>
  )
}
