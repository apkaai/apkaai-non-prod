'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { X, Plus, ExternalLink, Star, Check, Zap, BarChart3, Search, ArrowRight } from 'lucide-react'
import { tools, categories } from '@/lib/tools-data'
import type { AITool } from '@/lib/tools-data'

const MAX_COMPARE = 4

function ToolSelector({
  selected, onAdd, onRemove
}: {
  selected: AITool[]
  onAdd: (t: AITool) => void
  onRemove: (id: string) => void
}) {
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() => {
    return tools.filter(t => {
      const notSelected = !selected.find(s => s.id === t.id)
      const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
      const matchCat = catFilter === 'all' || t.categorySlug === catFilter
      return notSelected && matchSearch && matchCat
    })
  }, [selected, search, catFilter])

  return (
    <div>
      {/* Selected tools */}
      <div className="flex flex-wrap gap-3 mb-6">
        {selected.map(t => (
          <div key={t.id} className="flex items-center gap-2 bg-purple-900/40 border border-purple-600/50 rounded-xl px-3 py-2">
            <span className="text-xl">{t.logo}</span>
            <span className="text-white font-semibold text-sm">{t.name}</span>
            <button onClick={() => onRemove(t.id)} className="text-slate-400 hover:text-white ml-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        {selected.length < MAX_COMPARE && (
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 border-2 border-dashed border-purple-700/50 hover:border-purple-500 rounded-xl px-4 py-2 text-purple-400 hover:text-purple-300 text-sm font-medium transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Tool {selected.length > 0 ? `(${selected.length}/${MAX_COMPARE})` : ''}
          </button>
        )}
      </div>

      {/* Tool picker dropdown */}
      {open && (
        <div className="glow-border rounded-2xl bg-[#0F0A1E] p-5 mb-6">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search tools..."
                autoFocus
                className="w-full bg-purple-950/30 border border-purple-800/40 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
            <select
              value={catFilter}
              onChange={e => setCatFilter(e.target.value)}
              className="bg-purple-950/30 border border-purple-800/40 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
            >
              <option value="all">All Categories</option>
              {categories.map(c => <option key={c.slug} value={c.slug}>{c.emoji} {c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto pr-1">
            {filtered.map(t => (
              <button
                key={t.id}
                onClick={() => { onAdd(t); if (selected.length + 1 >= MAX_COMPARE) setOpen(false) }}
                className="flex items-center gap-2 p-3 rounded-xl bg-purple-950/30 border border-purple-800/30 hover:border-purple-500 hover:bg-purple-900/30 transition-all text-left group"
              >
                <span className="text-xl flex-shrink-0">{t.logo}</span>
                <div className="min-w-0">
                  <div className="text-white text-xs font-semibold truncate group-hover:text-purple-300">{t.name}</div>
                  <div className="text-slate-500 text-xs">{t.pricing}</div>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-4 text-center text-slate-500 text-sm py-4">No tools found</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ComparisonTable({ tools: selectedTools }: { tools: AITool[] }) {
  if (selectedTools.length < 2) return null

  const allFeatures = [
    { key: 'pricing', label: 'Pricing Model' },
    { key: 'startingPrice', label: 'Starting Price' },
    { key: 'rating', label: 'User Rating' },
    { key: 'reviews', label: 'Total Reviews' },
    { key: 'category', label: 'Category' },
    { key: 'tags', label: 'Best For' },
  ]

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="text-left p-4 text-slate-400 text-sm font-medium w-36 sticky left-0 bg-[#08051A]">Feature</th>
            {selectedTools.map(t => (
              <th key={t.id} className="p-4 min-w-48">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-3xl">{t.logo}</span>
                  <span className="font-bold text-white text-sm">{t.name}</span>
                  <a
                    href={t.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 text-xs flex items-center gap-1 hover:text-purple-300"
                  >
                    Visit <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allFeatures.map(feat => (
            <tr key={feat.key} className="border-t border-purple-900/20">
              <td className="p-4 text-slate-400 text-sm font-medium sticky left-0 bg-[#08051A]">{feat.label}</td>
              {selectedTools.map(t => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const val = (t as any)[feat.key]
                return (
                  <td key={t.id} className="p-4 text-center">
                    {feat.key === 'rating' ? (
                      <div className="flex items-center justify-center gap-1">
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        <span className="text-white font-bold">{String(val)}</span>
                      </div>
                    ) : feat.key === 'reviews' ? (
                      <span className="text-slate-300 text-sm">{Number(val).toLocaleString()}</span>
                    ) : feat.key === 'tags' ? (
                      <div className="flex flex-wrap justify-center gap-1">
                        {(val as string[]).slice(0, 3).map(tag => (
                          <span key={tag} className="px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-300 text-xs">{tag}</span>
                        ))}
                      </div>
                    ) : feat.key === 'pricing' ? (
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        String(val) === 'Free' ? 'bg-emerald-900/50 text-emerald-400'
                        : String(val) === 'Freemium' ? 'bg-blue-900/50 text-blue-400'
                        : 'bg-amber-900/50 text-amber-400'
                      }`}>{String(val) === 'Freemium' ? 'Premium' : String(val)}</span>
                    ) : feat.key === 'startingPrice' ? (
                      <span className="text-purple-300 font-bold text-sm">{String(val)}</span>
                    ) : (
                      <span className="text-slate-300 text-sm">{String(val)}</span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
          {/* Best plan row */}
          <tr className="border-t border-purple-900/20 bg-purple-950/10">
            <td className="p-4 text-slate-400 text-sm font-medium sticky left-0 bg-[#0A0618]">Best Free Plan</td>
            {selectedTools.map(t => {
              const freePlan = t.pricingPlans?.find(p => p.monthly === 0)
              return (
                <td key={t.id} className="p-4 text-center">
                  {freePlan ? (
                    <div className="text-center">
                      <div className="text-emerald-400 font-bold text-sm mb-1">{freePlan.name}</div>
                      <ul className="space-y-0.5">
                        {freePlan.features.slice(0, 2).map(f => (
                          <li key={f} className="text-xs text-slate-400 flex items-center justify-center gap-1">
                            <Check className="w-3 h-3 text-emerald-400" />{f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <span className="text-slate-500 text-xs">No free plan</span>
                  )}
                </td>
              )
            })}
          </tr>
          {/* Verdict row */}
          <tr className="border-t border-purple-900/20">
            <td className="p-4 text-slate-400 text-sm font-medium sticky left-0 bg-[#08051A]">Best For</td>
            {selectedTools.map(t => (
              <td key={t.id} className="p-4 text-center">
                <span className="text-white text-xs font-medium">{t.tagline}</span>
              </td>
            ))}
          </tr>
          {/* CTA row */}
          <tr className="border-t border-purple-900/30">
            <td className="p-4 sticky left-0 bg-[#08051A]"></td>
            {selectedTools.map(t => (
              <td key={t.id} className="p-4 text-center">
                <a
                  href={t.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary inline-flex items-center gap-1.5 text-white text-xs font-bold px-4 py-2 rounded-lg"
                >
                  Try {t.name} <ExternalLink className="w-3 h-3" />
                </a>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export default function ComparePage() {
  const [selected, setSelected] = useState<AITool[]>([])
  const [activeTab, setActiveTab] = useState<'compare' | 'pricing'>('compare')

  const add = (t: AITool) => {
    if (selected.length < MAX_COMPARE) setSelected([...selected, t])
  }
  const remove = (id: string) => setSelected(selected.filter(t => t.id !== id))

  // Popular comparison sets
  const quickSets = [
    { label: 'Top Chat AIs', slugs: ['chatgpt', 'claude', 'gemini', 'perplexity'] },
    { label: 'Best Code Editors', slugs: ['cursor', 'github-copilot', 'windsurf'] },
    { label: 'Image Generators', slugs: ['midjourney', 'dalle-3', 'ideogram', 'stable-diffusion'] },
    { label: 'Video Tools', slugs: ['runway', 'heygen', 'pika', 'luma-ai'] },
    { label: 'Music AI', slugs: ['suno', 'udio', 'elevenlabs'] },
    { label: 'Writing Tools', slugs: ['chatgpt', 'jasper', 'grammarly', 'copy-ai'] },
  ]

  const loadQuickSet = (slugs: string[]) => {
    const toolSet = slugs.map(s => tools.find(t => t.slug === s)).filter(Boolean) as AITool[]
    setSelected(toolSet)
  }

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-purple-900/40 border border-purple-700/50 rounded-full px-4 py-2 text-sm text-purple-300 mb-6">
            <BarChart3 className="w-4 h-4" />
            Side-by-side AI tool comparison
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4">
            Compare AI Tools
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Select up to 4 AI tools and compare them side by side on pricing, features, ratings, and use cases.
          </p>
        </div>

        {/* Quick compare sets */}
        <div className="mb-8">
          <p className="text-slate-400 text-sm mb-3 font-medium">Quick compare:</p>
          <div className="flex flex-wrap gap-2">
            {quickSets.map(set => (
              <button
                key={set.label}
                onClick={() => loadQuickSet(set.slugs)}
                className="px-4 py-2 rounded-xl bg-purple-900/30 border border-purple-800/40 text-purple-300 hover:border-purple-500 hover:text-white text-sm font-medium transition-all"
              >
                {set.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tool selector */}
        <ToolSelector selected={selected} onAdd={add} onRemove={remove} />

        {/* Comparison content */}
        {selected.length >= 2 ? (
          <div className="glow-border rounded-2xl bg-[#08051A] overflow-hidden">
            {/* Tab bar */}
            <div className="flex border-b border-purple-900/30">
              <button
                onClick={() => setActiveTab('compare')}
                className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                  activeTab === 'compare' ? 'text-white border-b-2 border-purple-500 bg-purple-950/20' : 'text-slate-400 hover:text-white'
                }`}
              >
                📊 Feature Comparison
              </button>
              <button
                onClick={() => setActiveTab('pricing')}
                className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                  activeTab === 'pricing' ? 'text-white border-b-2 border-purple-500 bg-purple-950/20' : 'text-slate-400 hover:text-white'
                }`}
              >
                💰 Pricing Comparison
              </button>
            </div>

            {activeTab === 'compare' && (
              <div className="p-4">
                <ComparisonTable tools={selected} />
              </div>
            )}

            {activeTab === 'pricing' && (
              <div className="p-6">
                <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${selected.length}, minmax(0, 1fr))` }}>
                  {selected.map(tool => (
                    <div key={tool.id}>
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-2xl">{tool.logo}</span>
                        <div>
                          <div className="font-bold text-white">{tool.name}</div>
                          <div className="text-slate-400 text-xs">{tool.pricing}</div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {tool.pricingPlans?.map(plan => (
                          <div
                            key={plan.name}
                            className={`p-4 rounded-xl border ${plan.popular ? 'border-purple-500/60 bg-purple-900/20' : 'border-purple-900/40 bg-purple-950/20'}`}
                          >
                            {plan.popular && (
                              <span className="inline-block bg-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded-full mb-2">Popular</span>
                            )}
                            <div className="font-bold text-white text-sm">{plan.name}</div>
                            <div className="text-xl font-extrabold text-purple-300 my-1">{plan.price}</div>
                            <ul className="space-y-1 mt-2">
                              {plan.features.map(f => (
                                <li key={f} className="flex items-start gap-1.5 text-xs text-slate-400">
                                  <Check className="w-3 h-3 text-purple-400 flex-shrink-0 mt-0.5" />{f}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )) ?? (
                          <div className="text-slate-500 text-sm p-4 border border-purple-900/30 rounded-xl">
                            Check website for pricing
                          </div>
                        )}
                        <a
                          href={tool.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full btn-primary text-white text-sm font-semibold py-2.5 rounded-xl"
                        >
                          Visit {tool.name} <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="glow-border rounded-2xl p-16 text-center bg-[#0F0A1E]">
            <div className="text-5xl mb-4">⚖️</div>
            <h3 className="text-xl font-bold text-white mb-2">Select at least 2 tools to compare</h3>
            <p className="text-slate-400 text-sm mb-6">Use the &quot;Add Tool&quot; button above or pick a quick compare set</p>
            <div className="flex flex-wrap justify-center gap-3">
              {['chatgpt', 'claude', 'gemini'].map(slug => {
                const t = tools.find(t => t.slug === slug)!
                return (
                  <button
                    key={slug}
                    onClick={() => add(t)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-900/30 border border-purple-700/40 hover:border-purple-500 text-white text-sm font-medium transition-all"
                  >
                    <span>{t.logo}</span>{t.name}
                    <Plus className="w-4 h-4 text-purple-400" />
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* All tools grid below */}
        <div className="mt-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-extrabold text-white">All 60 AI Tools</h2>
            <Link href="/tools" className="flex items-center gap-1 text-purple-400 hover:text-purple-300 text-sm font-medium">
              Browse catalog <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {tools.map(t => (
              <button
                key={t.id}
                onClick={() => !selected.find(s => s.id === t.id) && selected.length < MAX_COMPARE && add(t)}
                disabled={!!selected.find(s => s.id === t.id) || selected.length >= MAX_COMPARE}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-center transition-all ${
                  selected.find(s => s.id === t.id)
                    ? 'border-purple-500/60 bg-purple-900/30 opacity-60'
                    : selected.length >= MAX_COMPARE
                    ? 'border-purple-900/20 bg-purple-950/10 opacity-40 cursor-not-allowed'
                    : 'border-purple-900/30 bg-purple-950/20 hover:border-purple-500 hover:bg-purple-900/20 cursor-pointer'
                }`}
              >
                <span className="text-2xl">{t.logo}</span>
                <span className="text-white text-xs font-semibold leading-tight">{t.name}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  t.pricing === 'Free' ? 'bg-emerald-900/40 text-emerald-400'
                  : t.pricing === 'Freemium' ? 'bg-blue-900/40 text-blue-400'
                  : 'bg-amber-900/40 text-amber-400'
                }`}>{t.pricing === 'Freemium' ? 'Premium' : t.pricing}</span>
                {selected.find(s => s.id === t.id) && (
                  <span className="text-purple-400 text-xs flex items-center gap-0.5"><Check className="w-3 h-3" />Added</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
