'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  FileText, Plus, Trash2, Edit3, Copy, Download, Printer,
  ChevronDown, ChevronUp, BarChart3, CheckCircle, AlertCircle, Save,
} from 'lucide-react'
import {
  PROVIDERS, SERVICES, CATEGORIES, EXCHANGE_RATES, CURRENCY_SYMBOLS,
  calculateCost, convertCurrency, formatCurrency,
  type ProviderId, type CategoryId, type BillLineItem,
  DATA_LAST_UPDATED,
} from '@/lib/cloud-pricing'

let _id = 1
const uid = () => `item-${_id++}`

interface EditState {
  id: string
  provider: ProviderId
  category: CategoryId
  serviceId: string
  config: Record<string, string | number | boolean>
}

const PROVIDER_COLORS: Record<ProviderId, string> = {
  aws:   'bg-orange-500/10 border-orange-500/30',
  azure: 'bg-blue-500/10   border-blue-500/30',
  gcp:   'bg-red-500/10    border-red-500/30',
  ace:   'bg-teal-500/10   border-teal-500/30',
}

export default function BillPage() {
  const [items,    setItems]    = useState<BillLineItem[]>([])
  const [currency, setCurrency] = useState('USD')
  const [tax,      setTax]      = useState(false)
  const [taxRate,  setTaxRate]  = useState(18)
  const [editing,  setEditing]  = useState<EditState | null>(null)
  const [saved,    setSaved]    = useState(false)
  const [addedMsg, setAddedMsg] = useState('')
  const [estimateId]            = useState(() => `EST-${Date.now().toString(36).toUpperCase()}`)
  const printRef               = useRef<HTMLDivElement>(null)

  // Pick up any items passed from the calculator page via localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = localStorage.getItem('cloud_pending_item')
    if (!raw) return
    try {
      const pending: BillLineItem[] = JSON.parse(raw)
      if (pending.length > 0) {
        setItems(prev => {
          const existingIds = new Set(prev.map(i => i.id))
          const newItems = pending.filter(p => !existingIds.has(p.id))
          return [...prev, ...newItems]
        })
        setAddedMsg(`${pending.length} service${pending.length > 1 ? 's' : ''} added from calculator`)
        setTimeout(() => setAddedMsg(''), 4000)
        localStorage.removeItem('cloud_pending_item')
      }
    } catch { /* ignore */ }
  }, [])

  // Totals
  const subtotal  = items.reduce((s, i) => s + i.monthly, 0)
  const taxAmount = tax ? subtotal * (taxRate / 100) : 0
  const total     = subtotal + taxAmount
  const fmt = (n: number) => formatCurrency(convertCurrency(n, currency), currency)

  const categoryTotals = CATEGORIES.map(c => ({
    ...c,
    total: items.filter(i => i.category === c.id).reduce((s, i) => s + i.monthly, 0),
  })).filter(c => c.total > 0)

  // ── Add / Edit flow ───────────────────────────────────────────────────────

  function startAddItem() {
    setEditing({ id: uid(), provider: 'aws', category: 'compute', serviceId: '', config: {} })
  }

  function startEditItem(item: BillLineItem) {
    setEditing({ id: item.id, provider: item.provider, category: item.category, serviceId: item.serviceId, config: { ...item.config } })
  }

  function duplicateItem(item: BillLineItem) {
    const copy: BillLineItem = { ...item, id: uid(), label: item.label + ' (copy)' }
    setItems(prev => [...prev, copy])
  }

  function removeItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  function saveEdit() {
    if (!editing) return

    // Use the first available service as fallback if serviceId is empty
    const services = (SERVICES[editing.provider] || []).filter(
      s => !editing.category || s.category === editing.category
    )
    const resolvedServiceId = editing.serviceId || services[0]?.id
    if (!resolvedServiceId) return

    const service = SERVICES[editing.provider]?.find(s => s.id === resolvedServiceId)
    if (!service) return

    // Populate config defaults for empty fields
    const finalConfig = { ...editing.config }
    service.fields.forEach(f => {
      if (finalConfig[f.id] === undefined) finalConfig[f.id] = f.defaultValue
    })

    const result = calculateCost(editing.provider, resolvedServiceId, finalConfig)
    const item: BillLineItem = {
      id:        editing.id,
      provider:  editing.provider,
      service:   service.name,
      serviceId: resolvedServiceId,
      config:    finalConfig,
      qty:       1,
      unitPrice: result.hourly,
      hourly:    result.hourly,
      monthly:   result.monthly,
      category:  service.category,
      label:     `${PROVIDERS.find(p => p.id === editing.provider)!.shortName} ${service.name}`,
    }

    setItems(prev => {
      const existing = prev.findIndex(i => i.id === editing.id)
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = item
        return updated
      }
      return [...prev, item]
    })
    setEditing(null)
  }

  // ── PDF / Print ───────────────────────────────────────────────────────────

  function handlePrint() {
    window.print()
  }

  function handleSave() {
    if (typeof window === 'undefined') return
    const user = localStorage.getItem('apkaai_user')
    if (!user) {
      alert('Please log in to save your cloud estimate.')
      return
    }
    const estimates = JSON.parse(localStorage.getItem('cloud_estimates') || '[]')
    estimates.unshift({
      id:        estimateId,
      provider:  items[0]?.provider || 'aws',
      items,
      currency,
      tax, taxRate,
      monthly:   total,
      createdAt: new Date().toISOString(),
    })
    localStorage.setItem('cloud_estimates', JSON.stringify(estimates))
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  // ── Edit panel ────────────────────────────────────────────────────────────

  const EditPanel = () => {
    if (!editing) return null
    const services = (SERVICES[editing.provider] || []).filter(s => !editing.category || s.category === editing.category)
    const currentService = services.find(s => s.id === editing.serviceId) || services[0]

    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-xl bg-[#0F0A1E] border border-purple-700/40 rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
          <h3 className="text-white font-bold text-lg mb-5">
            {items.find(i => i.id === editing.id) ? 'Edit Service' : 'Add Service'}
          </h3>

          {/* Provider */}
          <div className="mb-4">
            <label className="block text-xs text-slate-400 mb-2">Cloud Provider</label>
            <div className="grid grid-cols-4 gap-2">
              {PROVIDERS.map(p => (
                <button key={p.id} onClick={() => setEditing(e => e ? { ...e, provider: p.id as ProviderId, serviceId: '', config: {} } : null)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs transition-all ${
                    editing.provider === p.id ? 'border-sky-500 bg-sky-500/10' : 'border-purple-900/30 hover:border-sky-700/40'
                  }`}>
                  <span>{p.logo}</span><span className="text-white">{p.shortName}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div className="mb-4">
            <label className="block text-xs text-slate-400 mb-2">Category</label>
            <select value={editing.category}
              onChange={e => setEditing(ed => ed ? { ...ed, category: e.target.value as CategoryId, serviceId: '', config: {} } : null)}
              className="w-full bg-purple-950/30 border border-purple-800/40 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500">
              {CATEGORIES.filter(c => (SERVICES[editing.provider] || []).some(s => s.category === c.id))
                .map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
            </select>
          </div>

          {/* Service */}
          {services.length > 0 && (
            <div className="mb-4">
              <label className="block text-xs text-slate-400 mb-2">Service</label>
              <select value={editing.serviceId || services[0]?.id || ''}
                onChange={e => setEditing(ed => ed ? { ...ed, serviceId: e.target.value, config: {} } : null)}
                className="w-full bg-purple-950/30 border border-purple-800/40 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500">
                {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          {/* Config fields */}
          {currentService && (
            <div className="space-y-3 mb-5">
              <label className="block text-xs text-slate-400">Configuration</label>
              {currentService.fields.map(f => (
                <div key={f.id} className="flex items-center gap-3">
                  <label className="text-xs text-slate-400 w-36 flex-shrink-0">
                    {f.label}{f.unit ? ` (${f.unit})` : ''}
                  </label>
                  {f.type === 'select' ? (
                    <select value={String(editing.config[f.id] ?? f.defaultValue)}
                      onChange={e => setEditing(ed => ed ? { ...ed, config: { ...ed.config, [f.id]: e.target.value } } : null)}
                      className="flex-1 bg-purple-950/30 border border-purple-800/40 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500">
                      {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : f.type === 'toggle' ? (
                    <button onClick={() => setEditing(ed => ed ? {
                      ...ed, config: { ...ed.config, [f.id]: !(ed.config[f.id] ?? f.defaultValue) }
                    } : null)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${
                        (editing.config[f.id] ?? f.defaultValue) ? 'bg-sky-500' : 'bg-slate-700'
                      }`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        (editing.config[f.id] ?? f.defaultValue) ? 'translate-x-5' : 'translate-x-0.5'
                      }`} />
                    </button>
                  ) : (
                    <input type="number" min={f.min} max={f.max}
                      value={String(editing.config[f.id] ?? f.defaultValue)}
                      onChange={e => setEditing(ed => ed ? { ...ed, config: { ...ed.config, [f.id]: parseFloat(e.target.value) || 0 } } : null)}
                      className="flex-1 bg-purple-950/30 border border-purple-800/40 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500" />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={saveEdit}
              className="flex-1 btn-primary text-white font-bold py-2.5 rounded-xl text-sm">
              {items.find(i => i.id === editing.id) ? 'Update Service' : 'Add to Bill'}
            </button>
            <button onClick={() => setEditing(null)}
              className="px-5 py-2.5 rounded-xl border border-purple-700/40 text-slate-300 hover:border-purple-500 text-sm transition-all">
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <EditPanel />

      <div className="min-h-screen pt-20 pb-24">
        <div ref={printRef} className="max-w-6xl mx-auto px-4 pt-8">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                <Link href="/cloud" className="hover:text-white transition-colors">Cloud</Link>
                <span>/</span>
                <span className="text-slate-300">Bill Builder</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2 flex items-center gap-3">
                <FileText className="w-8 h-8 text-emerald-400" />
                Cloud Bill Builder
              </h1>
              <p className="text-slate-400 text-sm">
                Estimate ID: <span className="text-slate-300 font-mono">{estimateId}</span>
                {' · '}Generated: {new Date().toLocaleDateString('en-IN')}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 print:hidden">
              {/* Currency */}
              {Object.keys(EXCHANGE_RATES).map(c => (
                <button key={c} onClick={() => setCurrency(c)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    currency === c ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300' : 'border-purple-900/30 text-slate-400'
                  }`}>
                  {CURRENCY_SYMBOLS[c]} {c}
                </button>
              ))}
            </div>
          </div>

          {/* Added from calculator banner */}
        {addedMsg && (
          <div className="mb-4 flex items-center gap-3 bg-emerald-900/20 border border-emerald-700/40 rounded-xl px-4 py-3">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <p className="text-emerald-300 text-sm font-medium">{addedMsg}</p>
          </div>
        )}

        <div className="lg:grid lg:grid-cols-3 lg:gap-6">
            {/* Left: Line items */}
            <div className="lg:col-span-2 space-y-4 mb-6 lg:mb-0">
              {/* Items */}
              {items.length === 0 ? (
                <div className="glow-border rounded-2xl p-12 bg-[#0F0A1E] text-center">
                  <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 mb-2">Your bill is empty</p>
                  <p className="text-slate-600 text-sm mb-6">Add cloud services to build your infrastructure bill</p>
                  <button onClick={startAddItem}
                    className="btn-primary flex items-center gap-2 text-white font-bold px-6 py-3 rounded-xl text-sm mx-auto">
                    <Plus className="w-4 h-4" /> Add Your First Service
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map(item => {
                    const p = PROVIDERS.find(x => x.id === item.provider)!
                    return (
                      <div key={item.id}
                        className={`rounded-xl border p-4 ${PROVIDER_COLORS[item.provider]}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <span className="text-xl flex-shrink-0">{p.logo}</span>
                            <div className="min-w-0">
                              <p className="text-white font-semibold text-sm truncate">{item.label}</p>
                              <p className="text-slate-500 text-xs mt-0.5">
                                {Object.entries(item.config)
                                  .filter(([k]) => !k.startsWith('_'))
                                  .slice(0, 3)
                                  .map(([k, v]) => `${k}: ${v}`)
                                  .join(' · ')}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end flex-shrink-0 gap-1">
                            <p className="text-white font-extrabold">{fmt(item.monthly)}<span className="text-slate-500 text-xs font-normal">/mo</span></p>
                            <div className="flex items-center gap-1">
                              <button onClick={() => startEditItem(item)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-purple-900/30 transition-all">
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => duplicateItem(item)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-purple-900/30 transition-all">
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => removeItem(item.id)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-900/20 transition-all">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Add service button */}
              {items.length > 0 && (
                <button onClick={startAddItem}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-purple-700/40 text-slate-400 hover:border-purple-500 hover:text-white transition-all text-sm print:hidden">
                  <Plus className="w-4 h-4" /> Add Another Service
                </button>
              )}

              {/* Invoice table for print */}
              {items.length > 0 && (
                <div className="overflow-x-auto rounded-2xl border border-purple-900/30 mt-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-purple-900/30 bg-purple-950/20">
                        <th className="text-left px-4 py-3 text-slate-400">Service</th>
                        <th className="text-left px-4 py-3 text-slate-400">Provider</th>
                        <th className="text-right px-4 py-3 text-slate-400">Hourly</th>
                        <th className="text-right px-4 py-3 text-slate-400">Monthly</th>
                        <th className="text-right px-4 py-3 text-slate-400">Annual</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(item => {
                        const p = PROVIDERS.find(x => x.id === item.provider)!
                        return (
                          <tr key={item.id} className="border-b border-purple-900/20 last:border-0">
                            <td className="px-4 py-3 text-white">{item.service}</td>
                            <td className="px-4 py-3 text-slate-400">{p.shortName}</td>
                            <td className="px-4 py-3 text-slate-400 text-right">{fmt(item.hourly)}</td>
                            <td className="px-4 py-3 text-white text-right">{fmt(item.monthly)}</td>
                            <td className="px-4 py-3 text-slate-400 text-right">{fmt(item.monthly * 12)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Category breakdown */}
              {categoryTotals.length > 1 && (
                <div className="glow-border rounded-2xl p-5 bg-[#0F0A1E]">
                  <p className="text-sm font-semibold text-slate-400 mb-3">Cost by Category</p>
                  <div className="space-y-2">
                    {categoryTotals.map(c => (
                      <div key={c.id} className="flex items-center gap-3">
                        <span className="text-sm text-slate-400 w-24">{c.emoji} {c.label}</span>
                        <div className="flex-1 h-2 bg-purple-900/30 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full transition-all"
                            style={{ width: `${(c.total / subtotal) * 100}%` }} />
                        </div>
                        <span className="text-sm text-white w-24 text-right">{fmt(c.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Sticky bill summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-20 space-y-4">
                <div className="glow-border rounded-2xl p-6 bg-[#0F0A1E]">
                  <h3 className="text-white font-bold text-base mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    Estimated Cloud Bill
                  </h3>

                  {/* Time-based totals */}
                  <div className="space-y-3 mb-5">
                    {[
                      { label: 'Hourly',  val: fmt(subtotal / 730) },
                      { label: 'Daily',   val: fmt(subtotal / 30) },
                      { label: 'Monthly', val: fmt(subtotal), highlight: true },
                      { label: 'Annual',  val: fmt(subtotal * 12) },
                    ].map(row => (
                      <div key={row.label} className={`flex justify-between items-center ${row.highlight ? 'py-2 border-t border-b border-purple-900/30' : ''}`}>
                        <span className="text-slate-400 text-sm">{row.label}</span>
                        <span className={`font-${row.highlight ? 'extrabold text-lg text-emerald-300' : 'semibold text-white'}`}>
                          {row.val}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Tax toggle */}
                  <div className="border-t border-purple-900/30 pt-4 mb-4">
                    <label className="flex items-center justify-between cursor-pointer mb-3">
                      <span className="text-sm text-slate-400">Enable Tax</span>
                      <div onClick={() => setTax(t => !t)}
                        className={`relative w-10 h-5 rounded-full transition-colors ${tax ? 'bg-sky-500' : 'bg-slate-700'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${tax ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </div>
                    </label>
                    {tax && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-400">Tax Rate (%)</label>
                        <input type="number" value={taxRate} min={0} max={100}
                          onChange={e => setTaxRate(Number(e.target.value))}
                          className="w-20 bg-purple-950/30 border border-purple-800/40 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-sky-500" />
                      </div>
                    )}
                    {tax && (
                      <div className="mt-3 space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Subtotal</span>
                          <span className="text-white">{fmt(subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Tax ({taxRate}%)</span>
                          <span className="text-white">{fmt(taxAmount)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold border-t border-purple-900/30 pt-2">
                          <span className="text-white">Total</span>
                          <span className="text-emerald-300">{fmt(total)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  {items.length > 0 && (
                    <div className="space-y-2 print:hidden">
                      <button onClick={handleSave}
                        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                          saved ? 'border-emerald-500 text-emerald-300 bg-emerald-500/10' : 'border-purple-700/40 text-slate-300 hover:border-purple-500'
                        }`}>
                        {saved ? <><CheckCircle className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Estimate</>}
                      </button>
                      <button onClick={handlePrint}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-purple-700/40 text-slate-300 hover:border-purple-500 text-sm font-semibold transition-all">
                        <Printer className="w-4 h-4" /> Print / Save PDF
                      </button>
                      <Link href="/cloud/compare"
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl btn-primary text-white text-sm font-semibold">
                        <BarChart3 className="w-4 h-4" /> Compare Across Clouds
                      </Link>
                    </div>
                  )}
                </div>

                {/* Assumptions */}
                <div className="rounded-xl border border-purple-900/20 bg-purple-900/5 p-4">
                  <p className="text-xs font-semibold text-slate-500 mb-2">Assumptions</p>
                  <div className="text-xs text-slate-600 space-y-1">
                    <p>Pricing model: On-Demand</p>
                    <p>Currency: {currency}</p>
                    <p>Tax: {tax ? `${taxRate}% included` : 'Excluded'}</p>
                    <p>Discount: None</p>
                    <p>Updated: {DATA_LAST_UPDATED}</p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Estimated pricing only. Actual cloud-provider charges may vary.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body > *:not(#__next) { display: none !important; }
          .print\\:hidden { display: none !important; }
          header, footer { display: none !important; }
        }
      `}</style>
    </>
  )
}
