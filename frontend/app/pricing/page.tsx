'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Check, ExternalLink, Star, ChevronDown, ChevronUp, Zap } from 'lucide-react'
import { tools, categories } from '@/lib/tools-data'

const CATEGORY_FILTERS = [{ slug: 'all', name: 'All Tools', emoji: '🌟' }, ...categories]

export default function PricingPage() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [activePricing, setActivePricing] = useState('All')
  const [expanded, setExpanded] = useState<string | null>(null)

  const filtered = tools.filter(t => {
    const catOk = activeCategory === 'all' || t.categorySlug === activeCategory
    const priceOk = activePricing === 'All' || t.pricing === activePricing
    return catOk && priceOk
  })

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-purple-900/40 border border-purple-700/50 rounded-full px-4 py-2 text-sm text-purple-300 mb-6">
            <Zap className="w-4 h-4" fill="currentColor" />
            All prices in Indian Rupees (₹)
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4">
            AI Tools Pricing Guide
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Compare pricing for every AI tool — from free tiers to enterprise plans. Find the best value for your needs.
          </p>
        </div>

        {/* Pricing filter pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {['All', 'Free', 'Freemium', 'Paid', 'Free Trial'].map(p => (
            <button
              key={p}
              onClick={() => setActivePricing(p)}
              className={`px-5 py-2 rounded-full text-sm font-semibold border transition-all ${
                activePricing === p
                  ? 'bg-purple-600 border-purple-500 text-white shadow-glow-sm'
                  : 'bg-[#0F0A1E] border-purple-800/40 text-slate-300 hover:border-purple-500'
              }`}
            >
              {p === 'Free' ? '🆓 Free' : p === 'Freemium' ? '⚡ Premium' : p === 'Paid' ? '💳 Paid' : p === 'Free Trial' ? '🎁 Free Trial' : '🌟 All'}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-10 scrollbar-none justify-start">
          {CATEGORY_FILTERS.map(cat => (
            <button
              key={cat.slug}
              onClick={() => setActiveCategory(cat.slug)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                activeCategory === cat.slug
                  ? 'bg-purple-600 border-purple-500 text-white'
                  : 'bg-[#0F0A1E] border-purple-800/40 text-slate-300 hover:border-purple-600'
              }`}
            >
              <span>{cat.emoji}</span>
              <span className="hidden sm:inline">{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Total Tools', value: filtered.length, color: 'text-purple-400' },
            { label: 'Free Tools', value: filtered.filter(t => t.pricing === 'Free' || t.monthlyPrice === 0).length, color: 'text-emerald-400' },
            { label: 'Premium', value: filtered.filter(t => t.pricing === 'Freemium').length, color: 'text-blue-400' },
            { label: 'Paid Only', value: filtered.filter(t => t.pricing === 'Paid').length, color: 'text-amber-400' },
          ].map(s => (
            <div key={s.label} className="glow-border rounded-xl p-4 text-center bg-[#0F0A1E]">
              <div className={`text-3xl font-extrabold ${s.color}`}>{s.value}</div>
              <div className="text-slate-400 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tools pricing table */}
        <div className="space-y-4">
          {filtered.map(tool => (
            <div key={tool.id} className="glow-border rounded-2xl bg-[#0F0A1E] overflow-hidden">
              {/* Tool header row */}
              <div
                className="flex items-center justify-between p-5 cursor-pointer hover:bg-purple-950/20 transition-colors"
                onClick={() => setExpanded(expanded === tool.slug ? null : tool.slug)}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-purple-900/40 border border-purple-700/30 flex items-center justify-center text-2xl flex-shrink-0">
                    {tool.logo}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-base">{tool.name}</span>
                      {tool.badge && <span className="badge-new text-white text-xs">{tool.badge}</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        tool.pricing === 'Free' ? 'bg-emerald-900/50 text-emerald-400'
                        : tool.pricing === 'Freemium' ? 'bg-blue-900/50 text-blue-400'
                        : 'bg-amber-900/50 text-amber-400'
                      }`}>{tool.pricing === 'Freemium' ? 'Premium' : tool.pricing}</span>
                    </div>
                    <p className="text-slate-400 text-sm truncate mt-0.5">{tool.tagline}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                  <div className="hidden sm:flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span className="text-white text-sm font-semibold">{tool.rating}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-purple-300 font-bold text-sm">{tool.startingPrice}</div>
                    <div className="text-slate-500 text-xs">starting from</div>
                  </div>
                  {expanded === tool.slug
                    ? <ChevronUp className="w-5 h-5 text-purple-400" />
                    : <ChevronDown className="w-5 h-5 text-slate-500" />
                  }
                </div>
              </div>

              {/* Expanded pricing plans */}
              {expanded === tool.slug && (
                <div className="border-t border-purple-900/30 p-5">
                  {tool.pricingPlans && tool.pricingPlans.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-5">
                      {tool.pricingPlans.map(plan => (
                        <div
                          key={plan.name}
                          className={`rounded-xl p-4 border ${
                            plan.popular
                              ? 'border-purple-500/70 bg-purple-900/20'
                              : 'border-purple-900/40 bg-purple-950/20'
                          }`}
                        >
                          {plan.popular && (
                            <span className="inline-block bg-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded-full mb-2">Most Popular</span>
                          )}
                          <div className="font-bold text-white mb-1">{plan.name}</div>
                          <div className="text-2xl font-extrabold text-purple-300 mb-3">{plan.price}</div>
                          <ul className="space-y-1.5">
                            {plan.features.map(f => (
                              <li key={f} className="flex items-start gap-2 text-xs text-slate-300">
                                <Check className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
                                {f}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-sm mb-4">Visit the tool's website for detailed pricing information.</p>
                  )}
                  <div className="flex items-center gap-3">
                    <a
                      href={tool.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary flex items-center gap-2 text-white text-sm font-semibold px-5 py-2.5 rounded-lg"
                    >
                      Visit {tool.name} <ExternalLink className="w-4 h-4" />
                    </a>
                    <Link
                      href={`/tools/${tool.slug}`}
                      className="border border-purple-700/40 hover:border-purple-500 text-slate-300 hover:text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-all"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <div className="glow-border rounded-2xl p-10 bg-gradient-to-br from-purple-900/20 to-[#0F0A1E]">
            <h2 className="text-2xl font-extrabold text-white mb-3">Want to compare tools side by side?</h2>
            <p className="text-slate-400 mb-6">Use our AI Comparison tool to give the same prompt to multiple AI tools and see who performs best.</p>
            <Link href="/compare" className="btn-primary inline-flex items-center gap-2 text-white font-bold px-8 py-3.5 rounded-xl">
              <Zap className="w-5 h-5" fill="white" /> Try AI Comparison Tool
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
