'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Cloud, Calculator, BarChart3, FileText, BookMarked,
  ArrowRight, Zap, Database, Server, Globe,
  ChevronRight, CheckCircle, TrendingDown,
} from 'lucide-react'
import { PROVIDERS, type ProviderId } from '@/lib/cloud-pricing'

const FEATURES = [
  {
    icon: BarChart3,
    title: 'Compare Cloud Services',
    desc: 'Side-by-side comparison of AWS, Azure, GCP and ACE Cloud pricing for any service.',
    href: '/cloud/compare',
    color: 'from-purple-600/20 to-violet-600/10',
    border: 'border-purple-700/40',
  },
  {
    icon: Calculator,
    title: 'Pricing Calculator',
    desc: 'Estimate your cloud infrastructure cost before deployment with real pricing data.',
    href: '/cloud/calculator',
    color: 'from-sky-600/20 to-blue-600/10',
    border: 'border-sky-700/40',
  },
  {
    icon: FileText,
    title: 'Bill Builder',
    desc: 'Build a complete multi-service cloud bill and generate a professional invoice.',
    href: '/cloud/bill',
    color: 'from-emerald-600/20 to-teal-600/10',
    border: 'border-emerald-700/40',
  },
  {
    icon: BookMarked,
    title: 'Saved Estimates',
    desc: 'Save, view and edit your cloud cost estimates across sessions.',
    href: '/cloud/saved',
    color: 'from-amber-600/20 to-orange-600/10',
    border: 'border-amber-700/40',
  },
]

const STATS = [
  { value: '5',   label: 'Cloud Providers' },
  { value: '35+', label: 'Services Covered' },
  { value: '20',  label: 'Regions' },
  { value: 'USD/INR/EUR/GBP', label: 'Currencies' },
]

const WHY_ITEMS = [
  'Real pricing data — no made-up numbers',
  'Compare equivalent configurations fairly',
  'Download professional PDF invoices',
  'Save estimates to your account',
  'Multi-service bill builder',
  'Updated pricing as of September 2026',
]

const PROVIDER_COLORS: Record<ProviderId, string> = {
  aws:   'border-orange-500/40 hover:border-orange-400 bg-orange-500/5',
  azure: 'border-blue-500/40   hover:border-blue-400   bg-blue-500/5',
  gcp:   'border-red-500/40    hover:border-red-400    bg-red-500/5',
  ace:   'border-teal-500/40   hover:border-teal-400   bg-teal-500/5',
  utho:  'border-orange-400/40 hover:border-orange-300 bg-orange-400/5',
}

export default function CloudPage() {
  const router = useRouter()

  const handleProviderClick = (providerId: ProviderId) => {
    router.push(`/cloud/calculator?provider=${providerId}`)
  }

  return (
    <div className="min-h-screen pt-20 pb-24">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative px-4 pt-16 pb-20 overflow-hidden">
        {/* Ambient glows */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(56,189,248,0.15),transparent)]" />
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-sky-600/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute top-20 right-1/4 w-72 h-72 bg-purple-600/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-sky-900/30 border border-sky-700/40 rounded-full px-5 py-2 text-sm text-sky-300 mb-8">
            <Cloud className="w-4 h-4" />
            Cloud Intelligence Platform
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-[1.1] tracking-tight mb-6">
            Cloud Infrastructure,
            <span className="block mt-1 bg-gradient-to-r from-sky-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Simplified.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed">
            Compare cloud services, calculate infrastructure costs, and build your cloud bill
            across AWS, Azure, Google Cloud, ACE Cloud and <span className="text-orange-400 font-semibold">Utho 🇮🇳</span> — all in one place.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link href="/cloud/compare"
              className="btn-primary flex items-center gap-2.5 text-white font-bold px-8 py-4 rounded-xl text-base shadow-[0_0_30px_rgba(56,189,248,0.3)] w-full sm:w-auto justify-center">
              <BarChart3 className="w-5 h-5" /> Compare Cloud Services
            </Link>
            <Link href="/cloud/calculator"
              className="flex items-center gap-2.5 text-slate-300 hover:text-white font-semibold px-8 py-4 rounded-xl text-base border border-sky-800/50 hover:border-sky-500 transition-all bg-sky-950/20 backdrop-blur-sm w-full sm:w-auto justify-center">
              <Calculator className="w-5 h-5 text-sky-400" /> Calculate Cloud Cost
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {STATS.map(s => (
              <div key={s.label} className="bg-[#0F0A1E]/80 border border-purple-900/30 rounded-xl p-4">
                <p className="text-xl font-extrabold text-white mb-0.5">{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cloud Providers ───────────────────────────────────────────────── */}
      <section className="px-4 pb-20 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">Supported Cloud Providers</h2>
          <p className="text-slate-400 text-sm">Click a provider to open the calculator with it pre-selected</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {PROVIDERS.map(p => (
            <button
              key={p.id}
              onClick={() => handleProviderClick(p.id as ProviderId)}
              className={`group flex flex-col items-center gap-3 p-6 rounded-2xl border transition-all duration-200 hover:scale-105 hover:shadow-[0_0_30px_rgba(0,0,0,0.4)] ${PROVIDER_COLORS[p.id as ProviderId]}`}
            >
              <span className="text-4xl">{p.logo}</span>
              <div className="text-center">
                <p className="text-white font-bold text-sm">{p.shortName}</p>
                <p className="text-slate-500 text-xs mt-0.5 group-hover:text-slate-400 transition-colors">{p.name}</p>
              </div>
              <span className="text-xs text-slate-600 group-hover:text-sky-400 flex items-center gap-1 transition-colors">
                Open Calculator <ChevronRight className="w-3 h-3" />
              </span>
              {p.id === 'utho' && (
                <span className="text-[10px] bg-orange-500/20 border border-orange-500/30 text-orange-300 px-2 py-0.5 rounded-full font-semibold">
                  India-based
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* ── Feature Cards ─────────────────────────────────────────────────── */}
      <section className="px-4 pb-20 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">Everything You Need</h2>
          <p className="text-slate-400">Full cloud cost intelligence in one platform</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {FEATURES.map(f => (
            <Link key={f.href} href={f.href}
              className={`group relative rounded-2xl border ${f.border} bg-gradient-to-br ${f.color} p-6 transition-all hover:scale-[1.02] hover:shadow-[0_8px_40px_rgba(0,0,0,0.4)]`}>
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 group-hover:bg-white/10 transition-colors">
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-bold text-base mb-1">{f.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1 text-sm text-slate-500 group-hover:text-white transition-colors">
                Open <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Service Categories ────────────────────────────────────────────── */}
      <section className="px-4 pb-20 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">15 Service Categories</h2>
          <p className="text-slate-400">Covering all major cloud service types</p>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {[
            { icon: Server,    label: 'Compute' },
            { icon: Database,  label: 'Database' },
            { icon: Zap,       label: 'Serverless' },
            { icon: Globe,     label: 'Networking' },
            { icon: Cloud,     label: 'Storage' },
          ].map(item => (
            <Link key={item.label}
              href={`/cloud/calculator?category=${item.label.toLowerCase()}`}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-purple-900/30 bg-[#0F0A1E]/60 hover:border-purple-600/50 hover:bg-purple-900/10 transition-all text-center group">
              <item.icon className="w-6 h-6 text-purple-400 group-hover:text-purple-300 transition-colors" />
              <span className="text-xs text-slate-400 group-hover:text-white transition-colors font-medium">{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="text-center mt-5">
          <Link href="/cloud/calculator" className="text-sky-400 hover:text-sky-300 text-sm flex items-center gap-1 justify-center transition-colors">
            View all 15 categories <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Why ApkaAI Cloud ──────────────────────────────────────────────── */}
      <section className="px-4 pb-20 max-w-5xl mx-auto">
        <div className="relative rounded-3xl border border-purple-700/30 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-[#0F0A1E] to-sky-900/20 pointer-events-none" />
          <div className="relative z-10 p-8 sm:p-12">
            <div className="flex flex-col lg:flex-row gap-10 items-center">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 bg-purple-900/40 border border-purple-700/40 rounded-full px-4 py-1.5 text-xs text-purple-300 font-semibold mb-5">
                  <TrendingDown className="w-3.5 h-3.5" /> Save on Cloud Costs
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-4">
                  Why Use ApkaAI Cloud?
                </h2>
                <p className="text-slate-400 mb-6 leading-relaxed">
                  Make smarter cloud infrastructure decisions with accurate, transparent pricing comparisons.
                  No vendor bias — just the facts.
                </p>
                <ul className="space-y-2.5">
                  {WHY_ITEMS.map(item => (
                    <li key={item} className="flex items-center gap-2.5 text-slate-300 text-sm">
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-shrink-0 grid grid-cols-2 gap-3 w-full sm:w-80">
                {[
                  { label: 'Start with Calculator', href: '/cloud/calculator', icon: Calculator, color: 'bg-sky-600' },
                  { label: 'Compare Services', href: '/cloud/compare', icon: BarChart3, color: 'bg-purple-600' },
                  { label: 'Build a Bill', href: '/cloud/bill', icon: FileText, color: 'bg-emerald-600' },
                  { label: 'Saved Estimates', href: '/cloud/saved', icon: BookMarked, color: 'bg-amber-600' },
                ].map(btn => (
                  <Link key={btn.href} href={btn.href}
                    className={`${btn.color} hover:opacity-90 transition-opacity rounded-xl p-4 flex flex-col gap-2`}>
                    <btn.icon className="w-5 h-5 text-white" />
                    <span className="text-white text-xs font-semibold">{btn.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Disclaimer ────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4">
        <p className="text-xs text-slate-600 text-center leading-relaxed">
          Cloud costs shown are estimates based on selected configuration and pricing data as of September 2026.
          Actual charges may vary based on provider pricing updates, taxes, usage tiers, discounts, data transfer,
          and other factors. Always verify with the official cloud provider pricing pages.
        </p>
      </div>
    </div>
  )
}
