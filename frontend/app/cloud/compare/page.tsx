'use client'
import { useState } from 'react'
import Link from 'next/link'
import { BarChart3, AlertCircle, CheckCircle, ArrowRight, Info } from 'lucide-react'
import {
  PROVIDERS, CATEGORIES, SERVICES, INSTANCE_TYPES, DB_INSTANCES,
  REGIONS, EXCHANGE_RATES, CURRENCY_SYMBOLS,
  calculateCost, convertCurrency, formatCurrency,
  type ProviderId, type CategoryId,
  DATA_LAST_UPDATED,
} from '@/lib/cloud-pricing'

const ALL_PROVIDERS: ProviderId[] = ['aws', 'azure', 'gcp', 'ace', 'utho']

interface CompareRow {
  provider: ProviderId
  serviceName: string
  vcpu?: number
  ram?: number
  storage?: number
  monthly: number
  annual: number
  note?: string
}

function buildCompareRows(category: CategoryId, configBase: Record<string, string | number | boolean>): CompareRow[] {
  return ALL_PROVIDERS.map(pid => {
    const services = SERVICES[pid] || []
    const service = services.find(s => s.category === category)
    if (!service) {
      return { provider: pid, serviceName: 'Not available', monthly: 0, annual: 0, note: 'Service not available for this provider' }
    }

    // Build config with provider's own instance types
    const cfg: Record<string, string | number | boolean> = { ...configBase }

    // Map instance type to closest available for this provider
    if (category === 'compute') {
      const instances = INSTANCE_TYPES[pid]
      const targetVcpu = configBase._vcpu as number || 2
      const targetRam  = configBase._ram  as number || 4
      const closest = instances.reduce((best, inst) => {
        const bScore = Math.abs(best.vcpu - targetVcpu) + Math.abs(best.ram - targetRam)
        const cScore = Math.abs(inst.vcpu - targetVcpu) + Math.abs(inst.ram - targetRam)
        return cScore < bScore ? inst : best
      })
      cfg.instanceType = closest.id
      cfg._vcpu = closest.vcpu
      cfg._ram  = closest.ram

      const result = calculateCost(pid, service.id, cfg)
      const isExact = closest.vcpu === targetVcpu && closest.ram === targetRam
      return {
        provider: pid,
        serviceName: service.name,
        vcpu: closest.vcpu,
        ram: closest.ram,
        storage: configBase.storage as number,
        monthly: result.monthly,
        annual: result.annual,
        note: isExact ? undefined : `Closest available: ${closest.id} (${closest.vcpu} vCPU, ${closest.ram} GB)`,
      }
    }

    if (category === 'database') {
      const dbInstances = DB_INSTANCES[pid]
      const targetVcpu = configBase._vcpu as number || 2
      const targetRam  = configBase._ram  as number || 4
      const closest = dbInstances.reduce((best, inst) => {
        const bScore = Math.abs(best.vcpu - targetVcpu) + Math.abs(best.ram - targetRam)
        const cScore = Math.abs(inst.vcpu - targetVcpu) + Math.abs(inst.ram - targetRam)
        return cScore < bScore ? inst : best
      })
      cfg.instanceClass = closest.id
      cfg.tier = closest.id
      cfg.instanceType = closest.id

      const result = calculateCost(pid, service.id, cfg)
      const isExact = closest.vcpu === targetVcpu && closest.ram === targetRam
      return {
        provider: pid,
        serviceName: service.name,
        vcpu: closest.vcpu,
        ram: closest.ram,
        monthly: result.monthly,
        annual: result.annual,
        note: isExact ? undefined : `Closest: ${closest.id} (${closest.vcpu} vCPU, ${closest.ram} GB)`,
      }
    }

    // Storage, serverless, etc. — use config as-is
    const result = calculateCost(pid, service.id, cfg)
    return {
      provider: pid,
      serviceName: service.name,
      monthly: result.monthly,
      annual: result.annual,
    }
  })
}

export default function ComparePage() {
  const [category, setCategory]   = useState<CategoryId>('compute')
  const [currency, setCurrency]   = useState('USD')
  const [rows,     setRows]       = useState<CompareRow[] | null>(null)
  const [compared, setCompared]   = useState(false)

  // Compute-specific config
  const [vcpu,     setVcpu]     = useState(2)
  const [ram,      setRam]      = useState(4)
  const [storage,  setStorage]  = useState(30)
  const [hours,    setHours]    = useState(730)
  const [transfer, setTransfer] = useState(0)

  // DB-specific
  const [dbEngine, setDbEngine] = useState('MySQL')
  const [dbHours,  setDbHours]  = useState(730)
  const [dbStorage,setDbStorage]= useState(20)

  // Storage-specific
  const [objStorage, setObjStorage] = useState(100)

  // Serverless-specific
  const [requests,   setRequests]  = useState(1000000)
  const [memoryMB,   setMemoryMB]  = useState(512)
  const [durationMs, setDurationMs]= useState(200)

  function handleCompare() {
    const base: Record<string, string | number | boolean> = {}

    if (category === 'compute') {
      base._vcpu = vcpu; base._ram = ram
      base.instances = 1; base.hours = hours; base.storage = storage
      base.transfer = transfer; base.os = 'Linux'
    } else if (category === 'database') {
      base._vcpu = vcpu; base._ram = ram
      base.engine = dbEngine; base.hours = dbHours; base.storage = dbStorage
      base.multiAZ = false; base.iops = 0; base.backupStorage = 0
    } else if (category === 'storage') {
      base.storage = objStorage; base.storageClass = 'standard'; base.tier = 'hot'
      base.putRequests = 10000; base.getRequests = 100000; base.writeOps = 10000
      base.classA = 10000; base.transfer = transfer
    } else if (category === 'serverless') {
      base.requests = requests; base.memory = String(memoryMB); base.duration = durationMs; base.freeTier = false
    } else {
      base.hours = hours; base.storage = storage; base.transfer = transfer
    }

    setRows(buildCompareRows(category, base))
    setCompared(true)
  }

  const cheapest = rows ? Math.min(...rows.filter(r => r.monthly > 0).map(r => r.monthly)) : 0
  const fmt = (n: number) => formatCurrency(convertCurrency(n, currency), currency)

  return (
    <div className="min-h-screen pt-20 pb-24">
      <div className="max-w-6xl mx-auto px-4 pt-8 space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
            <Link href="/cloud" className="hover:text-white transition-colors">Cloud</Link>
            <span>/</span>
            <span className="text-slate-300">Compare</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-purple-400" />
            Compare Cloud Services
          </h1>
          <p className="text-slate-400">Side-by-side pricing comparison across AWS, Azure, GCP, ACE Cloud and Utho 🇮🇳.</p>
        </div>

        {/* Currency */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-slate-400">Currency:</span>
          {Object.keys(EXCHANGE_RATES).map(c => (
            <button key={c} onClick={() => setCurrency(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                currency === c ? 'border-purple-500 bg-purple-500/15 text-purple-300' : 'border-purple-900/30 text-slate-400 hover:border-purple-700/40'
              }`}>
              {CURRENCY_SYMBOLS[c]} {c}
            </button>
          ))}
        </div>

        {/* Config panel */}
        <div className="glow-border rounded-2xl p-6 bg-[#0F0A1E] space-y-6">
          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-3">Service Category</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {CATEGORIES.slice(0, 10).map(c => (
                <button key={c.id} onClick={() => { setCategory(c.id); setCompared(false); setRows(null) }}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all ${
                    category === c.id
                      ? 'border-purple-500 bg-purple-500/10 text-white'
                      : 'border-purple-900/30 text-slate-400 hover:border-purple-700/30'
                  }`}>
                  <span className="text-lg">{c.emoji}</span>
                  <span className="text-xs leading-tight">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic config fields */}
          {category === 'compute' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: 'vCPU', val: vcpu, set: setVcpu, min: 1, options: [1,2,4,8,16,32] },
                { label: 'RAM (GB)', val: ram, set: setRam, min: 1, options: [1,2,4,8,16,32,64] },
                { label: 'Storage (GB)', val: storage, set: setStorage, min: 1 },
                { label: 'Hours/Month', val: hours, set: setHours, min: 1, max: 744 },
                { label: 'Transfer Out (GB)', val: transfer, set: setTransfer, min: 0 },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-xs text-slate-400 mb-1">{f.label}</label>
                  {f.options ? (
                    <select value={f.val} onChange={e => { f.set(Number(e.target.value)); setCompared(false) }}
                      className="w-full bg-purple-950/30 border border-purple-800/40 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500">
                      {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input type="number" value={f.val} min={f.min} max={f.max}
                      onChange={e => { f.set(Number(e.target.value)); setCompared(false) }}
                      className="w-full bg-purple-950/30 border border-purple-800/40 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500" />
                  )}
                </div>
              ))}
            </div>
          )}

          {category === 'database' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: 'vCPU', val: vcpu, set: setVcpu, options: [1,2,4,8] },
                { label: 'RAM (GB)', val: ram, set: setRam, options: [1,2,4,8,16,32] },
                { label: 'Engine', val: dbEngine, set: setDbEngine, strOptions: ['MySQL','PostgreSQL','MariaDB'] },
                { label: 'Hours/Month', val: dbHours, set: setDbHours },
                { label: 'Storage (GB)', val: dbStorage, set: setDbStorage, min: 10 },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-xs text-slate-400 mb-1">{f.label}</label>
                  {f.strOptions ? (
                    <select value={f.val as string} onChange={e => { f.set(e.target.value as never); setCompared(false) }}
                      className="w-full bg-purple-950/30 border border-purple-800/40 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500">
                      {f.strOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : f.options ? (
                    <select value={Number(f.val)} onChange={e => { f.set(Number(e.target.value) as never); setCompared(false) }}
                      className="w-full bg-purple-950/30 border border-purple-800/40 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500">
                      {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input type="number" value={Number(f.val)} min={f.min ?? 0}
                      onChange={e => { f.set(Number(e.target.value) as never); setCompared(false) }}
                      className="w-full bg-purple-950/30 border border-purple-800/40 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500" />
                  )}
                </div>
              ))}
            </div>
          )}

          {category === 'storage' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Storage (GB)</label>
                <input type="number" value={objStorage} min={1}
                  onChange={e => { setObjStorage(Number(e.target.value)); setCompared(false) }}
                  className="w-full bg-purple-950/30 border border-purple-800/40 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Transfer Out (GB)</label>
                <input type="number" value={transfer} min={0}
                  onChange={e => { setTransfer(Number(e.target.value)); setCompared(false) }}
                  className="w-full bg-purple-950/30 border border-purple-800/40 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500" />
              </div>
            </div>
          )}

          {category === 'serverless' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: 'Monthly Requests', val: requests, set: setRequests, min: 0 },
                { label: 'Memory (MB)', val: memoryMB, set: setMemoryMB, options: [128,256,512,1024,2048] },
                { label: 'Duration (ms)', val: durationMs, set: setDurationMs, min: 1 },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-xs text-slate-400 mb-1">{f.label}</label>
                  {f.options ? (
                    <select value={f.val} onChange={e => { f.set(Number(e.target.value)); setCompared(false) }}
                      className="w-full bg-purple-950/30 border border-purple-800/40 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500">
                      {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input type="number" value={f.val} min={f.min}
                      onChange={e => { f.set(Number(e.target.value)); setCompared(false) }}
                      className="w-full bg-purple-950/30 border border-purple-800/40 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500" />
                  )}
                </div>
              ))}
            </div>
          )}

          <button onClick={handleCompare}
            className="btn-primary flex items-center gap-2 text-white font-bold px-8 py-3.5 rounded-xl">
            <BarChart3 className="w-5 h-5" /> Compare Now
          </button>
        </div>

        {/* Results Table */}
        {compared && rows && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">Comparison Results</h2>

            {/* Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {rows.map(row => {
                const p = PROVIDERS.find(x => x.id === row.provider)!
                const isCheapest = row.monthly > 0 && row.monthly === cheapest
                const unavailable = row.monthly === 0
                return (
                  <div key={row.provider}
                    className={`rounded-2xl border p-5 relative transition-all ${
                      isCheapest ? 'border-emerald-500/50 bg-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.15)]' :
                      unavailable ? 'border-slate-700/30 opacity-60' :
                      'border-purple-900/30 bg-[#0F0A1E]/60'
                    }`}>
                    {isCheapest && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                        Lowest Cost
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-2xl">{p.logo}</span>
                      <div>
                        <p className="text-white font-bold text-sm">{p.shortName}</p>
                        <p className="text-slate-500 text-xs">{row.serviceName}</p>
                      </div>
                    </div>

                    {!unavailable ? (
                      <>
                        {row.vcpu && <p className="text-xs text-slate-500 mb-1">{row.vcpu} vCPU · {row.ram} GB RAM</p>}
                        <p className="text-2xl font-extrabold text-white mb-0.5">{fmt(row.monthly)}</p>
                        <p className="text-xs text-slate-500">per month</p>
                        <p className="text-xs text-slate-600 mt-1">{fmt(row.annual)} / year</p>
                        {row.provider === 'utho' && (
                          <div className="mt-2 p-2 rounded-lg bg-orange-900/20 border border-orange-700/30">
                            <p className="text-orange-300 text-[10px] flex items-start gap-1">
                              🇮🇳 India-based · Storage + bandwidth bundled
                            </p>
                            <a href="https://utho.com/pricing" target="_blank" rel="noopener noreferrer"
                              className="text-orange-400 text-[10px] hover:underline">
                              Official pricing →
                            </a>
                          </div>
                        )}
                        {row.note && (
                          <div className="mt-3 p-2 rounded-lg bg-amber-900/20 border border-amber-700/30">
                            <p className="text-amber-400 text-xs flex items-start gap-1">
                              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" /> {row.note}
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-500 text-sm mt-2">
                        <AlertCircle className="w-4 h-4" />
                        {row.note || 'Not available'}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Full comparison table */}
            <div className="overflow-x-auto rounded-2xl border border-purple-900/30">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-purple-900/30 bg-purple-950/20">
                    <th className="text-left px-4 py-3 text-slate-400 font-semibold">Provider</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-semibold">Service</th>
                    {rows[0]?.vcpu !== undefined && <>
                      <th className="text-right px-4 py-3 text-slate-400 font-semibold">vCPU</th>
                      <th className="text-right px-4 py-3 text-slate-400 font-semibold">RAM</th>
                    </>}
                    <th className="text-right px-4 py-3 text-slate-400 font-semibold">Monthly</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-semibold">Annual</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => {
                    const p = PROVIDERS.find(x => x.id === row.provider)!
                    const isCheapest = row.monthly > 0 && row.monthly === cheapest
                    return (
                      <tr key={row.provider}
                        className={`border-b border-purple-900/20 last:border-0 ${isCheapest ? 'bg-emerald-900/5' : ''}`}>
                        <td className="px-4 py-3 text-white font-medium">
                          <span className="flex items-center gap-2">{p.logo} {p.shortName}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-400">{row.serviceName}</td>
                        {row.vcpu !== undefined && <>
                          <td className="px-4 py-3 text-slate-400 text-right">{row.vcpu}</td>
                          <td className="px-4 py-3 text-slate-400 text-right">{row.ram} GB</td>
                        </>}
                        <td className="px-4 py-3 text-right">
                          <span className={isCheapest ? 'text-emerald-400 font-bold' : 'text-white'}>
                            {row.monthly > 0 ? fmt(row.monthly) : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-right">
                          {row.annual > 0 ? fmt(row.annual) : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {isCheapest && <span className="text-emerald-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Lowest</span>}
                          {row.note && !isCheapest && row.note}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Info note */}
            <div className="rounded-xl border border-sky-900/30 bg-sky-900/5 p-4">
              <p className="text-xs text-sky-400/80 flex items-start gap-2">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                Pricing is based on On-Demand rates for {REGIONS.aws[0].name} (AWS), {REGIONS.azure[0].name} (Azure),
                {' '}{REGIONS.gcp[0].name} (GCP), {REGIONS.ace[0].name} (ACE Cloud) and {REGIONS.utho[0].name} (Utho 🇮🇳).
                Utho plans include NVMe storage + 1–6 TB/mo bandwidth bundled — no separate egress charge within allowance.
                Exact equivalents are used where available; otherwise the closest configuration is shown.
                This is informational only — verify with official provider pages before provisioning.
                Last updated: {DATA_LAST_UPDATED}.
              </p>
            </div>

            {/* CTA */}
            <div className="flex flex-wrap gap-3">
              <Link href="/cloud/bill"
                className="btn-primary flex items-center gap-2 text-white font-bold px-6 py-3 rounded-xl text-sm">
                Build Full Infrastructure Bill <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/cloud/calculator"
                className="flex items-center gap-2 text-slate-300 hover:text-white font-semibold px-6 py-3 rounded-xl text-sm border border-purple-700/40 hover:border-purple-500 transition-all">
                Detailed Calculator
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
