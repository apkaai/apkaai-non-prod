'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Cloud, Calculator, ArrowRight, AlertCircle, Info } from 'lucide-react'
import {
  PROVIDERS, REGIONS, SERVICES, CATEGORIES, EXCHANGE_RATES, CURRENCY_SYMBOLS,
  calculateCost, convertCurrency, formatCurrency,
  type ProviderId, type CategoryId, type ServiceConfig,
  DATA_LAST_UPDATED,
} from '@/lib/cloud-pricing'

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function ProviderCard({ id, selected, onClick }: { id: ProviderId; selected: boolean; onClick: () => void }) {
  const p = PROVIDERS.find(x => x.id === id)!
  return (
    <button onClick={onClick}
      className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
        selected
          ? 'border-sky-500 bg-sky-500/10 scale-105 shadow-[0_0_20px_rgba(14,165,233,0.3)]'
          : 'border-purple-900/30 bg-[#0F0A1E]/60 hover:border-sky-700/40'
      }`}>
      <span className="text-2xl">{p.logo}</span>
      <span className="text-xs font-semibold text-white">{p.shortName}</span>
    </button>
  )
}

function CostDisplay({ monthly, currency }: { monthly: number; currency: string }) {
  const hourly  = monthly / 730
  const daily   = monthly / 30
  const annual  = monthly * 12
  const sym     = CURRENCY_SYMBOLS[currency] || '$'
  const rate    = EXCHANGE_RATES[currency] || 1
  const fmt = (n: number) => formatCurrency(n * rate, currency)
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[
        { label: 'Hourly',  val: fmt(hourly) },
        { label: 'Daily',   val: fmt(daily)  },
        { label: 'Monthly', val: fmt(monthly), highlight: true },
        { label: 'Annual',  val: fmt(annual)  },
      ].map(item => (
        <div key={item.label}
          className={`rounded-xl p-4 text-center border ${
            item.highlight
              ? 'border-sky-500/40 bg-sky-500/10'
              : 'border-purple-900/30 bg-[#0F0A1E]/60'
          }`}>
          <p className={`text-xl font-extrabold ${item.highlight ? 'text-sky-300' : 'text-white'}`}>{item.val}</p>
          <p className="text-xs text-slate-500 mt-0.5">{item.label}</p>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main calculator (uses useSearchParams — must be in Suspense)
// ─────────────────────────────────────────────────────────────────────────────

function CalculatorForm() {
  const sp     = useSearchParams()
  const router = useRouter()

  const initProvider  = (sp.get('provider') || 'aws') as ProviderId
  const initCategory  = (sp.get('category') || 'compute') as CategoryId

  const [provider,  setProvider]  = useState<ProviderId>(initProvider)
  const [category,  setCategory]  = useState<CategoryId>(initCategory)
  const [serviceId, setServiceId] = useState<string>('')
  const [config,    setConfig]    = useState<Record<string, string | number | boolean>>({})
  const [currency,  setCurrency]  = useState('USD')
  const [errors,    setErrors]    = useState<Record<string, string>>({})
  const [result,    setResult]    = useState<ReturnType<typeof calculateCost> | null>(null)

  // Filtered services
  const services = (SERVICES[provider] || []).filter(s => !category || s.category === category)
  const currentService: ServiceConfig | undefined = services.find(s => s.id === serviceId) || services[0]

  // When provider/category changes → reset service + config
  useEffect(() => {
    const first = (SERVICES[provider] || []).find(s => !category || s.category === category)
    if (first) {
      setServiceId(first.id)
      const defaults: Record<string, string | number | boolean> = {}
      first.fields.forEach(f => { defaults[f.id] = f.defaultValue })
      setConfig(defaults)
      setErrors({})
    } else {
      setServiceId('')
      setConfig({})
    }
    setResult(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, category])

  // When serviceId changes → reset config to defaults
  useEffect(() => {
    if (!currentService) return
    const defaults: Record<string, string | number | boolean> = {}
    currentService.fields.forEach(f => { defaults[f.id] = f.defaultValue })
    setConfig(defaults)
    setErrors({})
    setResult(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId])

  // Real-time calculation
  useEffect(() => {
    if (!currentService) return
    try {
      const r = calculateCost(provider, currentService.id, config)
      setResult(r)
    } catch { setResult(null) }
  }, [provider, currentService, config])

  function setField(id: string, val: string | number | boolean) {
    setConfig(prev => ({ ...prev, [id]: val }))
    setErrors(prev => { const e = { ...prev }; delete e[id]; return e })
  }

  function validate() {
    const errs: Record<string, string> = {}
    currentService?.fields.forEach(f => {
      if (f.type === 'number') {
        const v = Number(config[f.id])
        if (isNaN(v) || v < (f.min ?? 0)) {
          errs[f.id] = `Must be at least ${f.min ?? 0}`
        }
        if (f.max !== undefined && v > f.max) {
          errs[f.id] = `Must be at most ${f.max}`
        }
      }
    })
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  return (
    <div className="max-w-5xl mx-auto px-4 pt-8 pb-20 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
          <Link href="/cloud" className="hover:text-white transition-colors">Cloud</Link>
          <span>/</span>
          <span className="text-slate-300">Calculator</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2 flex items-center gap-3">
          <Calculator className="w-8 h-8 text-sky-400" />
          Cloud Pricing Calculator
        </h1>
        <p className="text-slate-400">Estimate your cloud infrastructure cost before deployment.</p>
      </div>

      {/* Currency selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-slate-400">Currency:</span>
        {Object.keys(EXCHANGE_RATES).map(c => (
          <button key={c} onClick={() => setCurrency(c)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              currency === c
                ? 'border-sky-500 bg-sky-500/15 text-sky-300'
                : 'border-purple-900/30 text-slate-400 hover:border-sky-700/40'
            }`}>
            {CURRENCY_SYMBOLS[c]} {c}
          </button>
        ))}
      </div>

      {/* Step 1: Choose Provider */}
      <div className="glow-border rounded-2xl p-6 bg-[#0F0A1E]">
        <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
          <span className="w-7 h-7 bg-sky-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
          Choose Your Cloud Provider
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PROVIDERS.map(p => (
            <ProviderCard key={p.id} id={p.id as ProviderId} selected={provider === p.id}
              onClick={() => setProvider(p.id as ProviderId)} />
          ))}
        </div>
      </div>

      {/* Step 2: Choose Category */}
      <div className="glow-border rounded-2xl p-6 bg-[#0F0A1E]">
        <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
          <span className="w-7 h-7 bg-sky-600 rounded-full flex items-center justify-center text-xs font-bold">2</span>
          Select Category
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {CATEGORIES.filter(c => (SERVICES[provider] || []).some(s => s.category === c.id)).map(c => (
            <button key={c.id} onClick={() => setCategory(c.id)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
                category === c.id
                  ? 'border-sky-500 bg-sky-500/10 text-white'
                  : 'border-purple-900/30 text-slate-400 hover:border-sky-700/30 hover:text-white'
              }`}>
              <span className="text-lg">{c.emoji}</span>
              <span className="text-xs font-medium leading-tight">{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Step 3: Choose Service */}
      {services.length > 0 && (
        <div className="glow-border rounded-2xl p-6 bg-[#0F0A1E]">
          <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <span className="w-7 h-7 bg-sky-600 rounded-full flex items-center justify-center text-xs font-bold">3</span>
            Select Service
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {services.map(s => (
              <button key={s.id} onClick={() => setServiceId(s.id)}
                className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                  (serviceId || services[0]?.id) === s.id
                    ? 'border-sky-500 bg-sky-500/10'
                    : 'border-purple-900/30 hover:border-sky-700/40'
                }`}>
                <div>
                  <p className="text-white font-semibold text-sm">{s.name}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{s.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Configure */}
      {currentService && (
        <div className="glow-border rounded-2xl p-6 bg-[#0F0A1E]">
          <h2 className="text-white font-bold text-lg mb-2 flex items-center gap-2">
            <span className="w-7 h-7 bg-sky-600 rounded-full flex items-center justify-center text-xs font-bold">4</span>
            Configure {currentService.name}
          </h2>
          <p className="text-slate-500 text-xs mb-5 flex items-center gap-1">
            <Info className="w-3.5 h-3.5" />
            Region: {REGIONS[provider]?.[0]?.name} · Pricing model: On-Demand · Last updated: {DATA_LAST_UPDATED}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {currentService.fields.map(field => (
              <div key={field.id} className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-300">
                  {field.label}
                  {field.unit && <span className="text-slate-500 ml-1 text-xs">({field.unit})</span>}
                </label>

                {field.type === 'select' && (
                  <select
                    value={String(config[field.id] ?? field.defaultValue)}
                    onChange={e => setField(field.id, e.target.value)}
                    className="w-full bg-purple-950/30 border border-purple-800/40 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500 transition">
                    {field.options?.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                )}

                {field.type === 'number' && (
                  <>
                    <input
                      type="number"
                      value={String(config[field.id] ?? field.defaultValue)}
                      min={field.min}
                      max={field.max}
                      onChange={e => setField(field.id, parseFloat(e.target.value) || 0)}
                      className={`w-full bg-purple-950/30 border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 transition ${
                        errors[field.id] ? 'border-red-500 focus:ring-red-500' : 'border-purple-800/40 focus:border-sky-500'
                      }`} />
                    {errors[field.id] && (
                      <p className="text-red-400 text-xs flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {errors[field.id]}
                      </p>
                    )}
                  </>
                )}

                {field.type === 'toggle' && (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div
                      onClick={() => setField(field.id, !(config[field.id] ?? field.defaultValue))}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        (config[field.id] ?? field.defaultValue) ? 'bg-sky-500' : 'bg-slate-700'
                      }`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        (config[field.id] ?? field.defaultValue) ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </div>
                    <span className="text-sm text-slate-300">
                      {(config[field.id] ?? field.defaultValue) ? 'Yes' : 'No'}
                    </span>
                  </label>
                )}

                {field.helpText && (
                  <p className="text-xs text-slate-600">{field.helpText}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {result && currentService && (
        <div className="space-y-4">
          <div className="glow-border rounded-2xl p-6 bg-[#0F0A1E]">
            <h2 className="text-white font-bold text-lg mb-5">💰 Estimated Cost</h2>
            <CostDisplay monthly={result.monthly} currency={currency} />

            {/* Breakdown */}
            {result.breakdown.length > 0 && (
              <div className="mt-6">
                <p className="text-sm font-semibold text-slate-400 mb-3">Cost Breakdown</p>
                <div className="space-y-2">
                  {result.breakdown.map((b, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-purple-900/20 last:border-0">
                      <span className="text-slate-400 text-sm">{b.label}</span>
                      <span className="text-white text-sm font-medium">
                        {formatCurrency(convertCurrency(b.cost, currency), currency)}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-white font-bold">Total (monthly)</span>
                    <span className="text-sky-300 font-extrabold text-lg">
                      {formatCurrency(convertCurrency(result.monthly, currency), currency)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Assumptions */}
          <div className="rounded-xl border border-purple-900/20 bg-purple-900/5 p-4">
            <p className="text-xs font-semibold text-slate-500 mb-2">Assumptions</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-600">
              <span>Region: {REGIONS[provider]?.[0]?.name}</span>
              <span>Pricing: On-Demand</span>
              <span>Currency: {currency}</span>
              <span>Tax: Excluded</span>
              <span>Discount: None</span>
              <span>Updated: {DATA_LAST_UPDATED}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Link href="/cloud/bill"
              className="btn-primary flex items-center gap-2 text-white font-bold px-6 py-3 rounded-xl text-sm">
              <Cloud className="w-4 h-4" /> Add to Bill Builder
            </Link>
            <Link href="/cloud/compare"
              className="flex items-center gap-2 text-slate-300 hover:text-white font-semibold px-6 py-3 rounded-xl text-sm border border-purple-700/40 hover:border-purple-500 transition-all">
              <ArrowRight className="w-4 h-4" /> Compare Across Clouds
            </Link>
          </div>

          <p className="text-xs text-slate-600">
            Estimated pricing only. Actual cloud-provider charges may vary.
          </p>
        </div>
      )}
    </div>
  )
}

export default function CalculatorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Loading calculator…</p>
        </div>
      </div>
    }>
      <div className="min-h-screen pt-16">
        <CalculatorForm />
      </div>
    </Suspense>
  )
}
