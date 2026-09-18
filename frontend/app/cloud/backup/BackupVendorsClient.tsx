'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Shield, ExternalLink, Check, ChevronDown, ChevronUp,
  Star, Globe, Building2, Calendar, Layers, Server, Zap
} from 'lucide-react'
import { BACKUP_VENDORS } from '@/lib/cloud-pricing'
import type { BackupVendor } from '@/lib/cloud-pricing'

// ── Vendor card ───────────────────────────────────────────────────────────────
function VendorCard({ vendor, expanded, onToggle }: {
  vendor: BackupVendor
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="glow-border rounded-2xl bg-[#0F0A1E] overflow-hidden">
      {/* Header row */}
      <div
        className="flex items-center justify-between p-5 cursor-pointer hover:bg-purple-950/20 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Logo */}
          <div className="w-14 h-14 rounded-xl bg-purple-900/40 border border-purple-700/30 flex items-center justify-center text-3xl flex-shrink-0">
            {vendor.logo}
          </div>

          {/* Name + tagline */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white text-base">{vendor.name}</span>
              {vendor.badge && (
                <span className="badge-new text-white text-[10px]">{vendor.badge}</span>
              )}
            </div>
            <p className="text-slate-400 text-sm truncate mt-0.5">{vendor.tagline}</p>
            {/* Deployment pills */}
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
              {vendor.deployments.map(d => (
                <span key={d} className="px-2 py-0.5 rounded-md bg-sky-900/30 border border-sky-800/30 text-sky-300 text-[10px] font-medium">
                  {d}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right info */}
        <div className="flex items-center gap-4 flex-shrink-0 ml-4">
          <div className="text-right hidden sm:block">
            <p className="text-purple-300 font-bold text-sm">{vendor.startingPrice}</p>
            <p className="text-slate-500 text-xs capitalize">{vendor.pricingModel.replace('-', ' ')}</p>
          </div>
          {expanded
            ? <ChevronUp className="w-5 h-5 text-purple-400" />
            : <ChevronDown className="w-5 h-5 text-slate-500" />
          }
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-purple-900/30 p-6 space-y-6">
          {/* Two-column info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-400">
                <Building2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <span>HQ: <span className="text-white">{vendor.hq}</span></span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Calendar className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <span>Founded: <span className="text-white">{vendor.founded}</span></span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Globe className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <a href={vendor.website} target="_blank" rel="noopener noreferrer"
                   className="text-purple-400 hover:text-purple-300 flex items-center gap-1">
                  Visit website <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
            <div>
              <p className="text-slate-300 text-sm leading-relaxed">{vendor.description}</p>
            </div>
          </div>

          {/* Platform support */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Server className="w-3.5 h-3.5 text-purple-400" /> Platform Support
            </p>
            <div className="flex flex-wrap gap-1.5">
              {vendor.platforms.map(p => (
                <span key={p} className="px-2 py-0.5 rounded-md bg-purple-900/30 border border-purple-800/30 text-purple-300 text-xs">
                  {p}
                </span>
              ))}
            </div>
          </div>

          {/* Strengths */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-purple-400" /> Key Strengths
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {vendor.strengths.map(s => (
                <li key={s} className="flex items-center gap-2 text-sm text-slate-300">
                  <Check className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>

          {/* Plans */}
          {vendor.plans.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-purple-400" /> Plans
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {vendor.plans.map(plan => (
                  <div
                    key={plan.name}
                    className={`p-4 rounded-xl border ${
                      plan.popular
                        ? 'border-purple-500/60 bg-purple-900/20'
                        : 'border-purple-900/40 bg-purple-950/20'
                    }`}
                  >
                    {plan.popular && (
                      <span className="inline-block badge-new text-white mb-2">Most Popular</span>
                    )}
                    <p className="font-bold text-white text-sm">{plan.name}</p>
                    <p className="text-purple-300 font-extrabold text-lg my-1">{plan.price}</p>
                    <p className="text-slate-500 text-xs mb-2">Best for: {plan.target}</p>
                    <ul className="space-y-1">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-start gap-2 text-xs text-slate-300">
                          <Check className="w-3 h-3 text-purple-400 flex-shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTAs */}
          <div className="flex items-center gap-3 flex-wrap pt-2">
            <a
              href={vendor.website}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary flex items-center gap-2 text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
            >
              Visit {vendor.name} <ExternalLink className="w-4 h-4" />
            </a>
            <Link
              href={`/tools/${vendor.slug}`}
              className="border border-purple-700/40 hover:border-purple-500 text-slate-300 hover:text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-all"
            >
              View Tool Details
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Comparison table ──────────────────────────────────────────────────────────
function CompareTable() {
  const cols = BACKUP_VENDORS

  const rows = [
    { label: 'Founded',       key: 'founded' },
    { label: 'HQ',            key: 'hq' },
    { label: 'Starting Price',key: 'startingPrice' },
    { label: 'Pricing Model', key: 'pricingModel' },
  ]

  return (
    <div className="overflow-x-auto rounded-2xl border border-purple-900/40">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-purple-900/30 bg-purple-950/30">
            <th className="text-left p-4 text-slate-400 font-medium min-w-36 sticky left-0 bg-[#0D0826]">Vendor</th>
            {cols.map(v => (
              <th key={v.id} className="p-4 text-center min-w-36">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl">{v.logo}</span>
                  <span className="text-white font-bold text-xs">{v.name}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.key} className="border-t border-purple-900/20 hover:bg-purple-950/10 transition-colors">
              <td className="p-4 text-slate-400 font-medium sticky left-0 bg-[#0D0826]">{row.label}</td>
              {cols.map(v => (
                <td key={v.id} className="p-4 text-center text-slate-300 text-xs">
                  {row.key === 'pricingModel'
                    ? <span className="capitalize px-2 py-0.5 rounded-full bg-purple-900/30 border border-purple-800/30 text-purple-300">
                        {(v as unknown as Record<string, string>)[row.key].replace(/-/g, ' ')}
                      </span>
                    : (v as unknown as Record<string, string>)[row.key]
                  }
                </td>
              ))}
            </tr>
          ))}
          {/* Deployment row */}
          <tr className="border-t border-purple-900/20 hover:bg-purple-950/10">
            <td className="p-4 text-slate-400 font-medium sticky left-0 bg-[#0D0826]">Deployment</td>
            {cols.map(v => (
              <td key={v.id} className="p-4 text-center">
                <div className="flex flex-wrap justify-center gap-1">
                  {v.deployments.map(d => (
                    <span key={d} className="text-[10px] px-1.5 py-0.5 rounded bg-sky-900/30 text-sky-400">{d}</span>
                  ))}
                </div>
              </td>
            ))}
          </tr>
          {/* Website row */}
          <tr className="border-t border-purple-900/20">
            <td className="p-4 text-slate-400 font-medium sticky left-0 bg-[#0D0826]">Website</td>
            {cols.map(v => (
              <td key={v.id} className="p-4 text-center">
                <a href={v.website} target="_blank" rel="noopener noreferrer"
                  className="btn-primary inline-flex items-center gap-1 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
                  Visit <ExternalLink className="w-3 h-3" />
                </a>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BackupVendorsClient() {
  const [expanded, setExpanded] = useState<string | null>('veeam')
  const [showTable, setShowTable] = useState(false)

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Breadcrumb */}
        <Link href="/cloud" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-8 transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Cloud
        </Link>

        {/* Page header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-purple-900/40 border border-purple-700/30 flex items-center justify-center text-2xl">
              🔄
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
                Backup & Data Protection
              </h1>
              <p className="text-slate-400 mt-1">
                Compare the leading enterprise backup and cyber recovery platforms
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-3 mt-5">
            {[
              { label: `${BACKUP_VENDORS.length} Vendors`, color: 'text-purple-400' },
              { label: 'On-prem, Cloud & SaaS', color: 'text-sky-400' },
              { label: 'Enterprise & SMB', color: 'text-emerald-400' },
              { label: 'Ransomware Protection', color: 'text-amber-400' },
            ].map(s => (
              <span key={s.label} className={`px-3 py-1 rounded-full bg-purple-900/30 border border-purple-800/30 text-xs font-semibold ${s.color}`}>
                {s.label}
              </span>
            ))}
          </div>
        </div>

        {/* Compare table toggle */}
        <div className="mb-6">
          <button
            onClick={() => setShowTable(!showTable)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
              showTable
                ? 'bg-purple-600 border-purple-500 text-white'
                : 'bg-[#0F0A1E] border-purple-800/40 text-slate-300 hover:border-purple-600'
            }`}
          >
            <Shield className="w-4 h-4" />
            {showTable ? 'Hide Comparison Table' : 'Show Side-by-Side Comparison'}
          </button>
        </div>

        {/* Comparison table */}
        {showTable && (
          <div className="mb-10">
            <CompareTable />
          </div>
        )}

        {/* Vendor cards */}
        <div className="space-y-4">
          {BACKUP_VENDORS.map(vendor => (
            <VendorCard
              key={vendor.id}
              vendor={vendor}
              expanded={expanded === vendor.id}
              onToggle={() => setExpanded(expanded === vendor.id ? null : vendor.id)}
            />
          ))}
        </div>

        {/* Footer CTA */}
        <div className="mt-16 glow-border rounded-2xl p-8 text-center bg-gradient-to-br from-purple-900/20 to-[#0F0A1E]">
          <h2 className="text-2xl font-extrabold text-white mb-3">Need help choosing the right backup solution?</h2>
          <p className="text-slate-400 mb-6 max-w-xl mx-auto">
            Browse all 77 tools in the ApkaAI catalog or compare cloud providers to find the right infrastructure for your backup strategy.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/tools" className="btn-primary inline-flex items-center gap-2 text-white font-bold px-6 py-3 rounded-xl">
              Browse All Tools
            </Link>
            <Link href="/cloud" className="border border-purple-700/40 hover:border-purple-500 inline-flex items-center gap-2 text-slate-300 hover:text-white font-semibold px-6 py-3 rounded-xl transition-all">
              Cloud Cost Calculator
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
