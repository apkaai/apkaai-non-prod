import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ExternalLink, Tag, Star, Check, ArrowLeft, Zap, Clock, Shield } from 'lucide-react'
import { getToolBySlug, tools } from '@/lib/tools-data'

export async function generateStaticParams() {
  return tools.map(t => ({ slug: t.slug }))
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const tool = getToolBySlug(params.slug)
  if (!tool) return {}
  return {
    title: `${tool.name} Deal & Discount — ApkaAI`,
    description: `Get the best deal on ${tool.name}. ${tool.tagline}. Exclusive offers via ApkaAI.`,
  }
}

export default function DealPage({ params }: { params: { slug: string } }) {
  const tool = getToolBySlug(params.slug)
  if (!tool) notFound()

  const freePlan = tool.pricingPlans?.find(p => p.monthly === 0)
  const paidPlans = tool.pricingPlans?.filter(p => p.monthly > 0) || []
  const bestDeal  = paidPlans.find(p => p.popular) || paidPlans[0]

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Back */}
        <Link href={`/tools/${tool.slug}`}
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-8 transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to {tool.name}
        </Link>

        {/* Hero */}
        <div className="glow-border rounded-2xl p-8 bg-gradient-to-br from-purple-900/20 to-[#0F0A1E] mb-6 text-center">
          <div className="text-6xl mb-4">{tool.logo}</div>
          <div className="inline-flex items-center gap-2 bg-purple-600/20 border border-purple-600/40 rounded-full px-4 py-1.5 text-purple-300 text-sm mb-4">
            <Tag className="w-4 h-4" /> Exclusive ApkaAI Deal
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
            Get the Best Deal on {tool.name}
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto mb-6">{tool.tagline}</p>

          {/* Rating */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {[1,2,3,4,5].map(i => (
              <Star key={i} className={`w-5 h-5 ${i <= Math.round(tool.rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
            ))}
            <span className="text-white font-bold ml-1">{tool.rating}</span>
            <span className="text-slate-400">({tool.reviews.toLocaleString()} reviews)</span>
          </div>

          {/* Main CTA */}
          <a href={tool.website} target="_blank" rel="noopener noreferrer"
            className="btn-primary inline-flex items-center gap-3 text-white font-bold px-10 py-4 rounded-xl text-lg shadow-glow-md hover:scale-105 transition-all">
            <Zap className="w-5 h-5" fill="white" />
            Claim Best Deal on {tool.name}
            <ExternalLink className="w-5 h-5" />
          </a>

          <div className="flex items-center justify-center gap-6 mt-4 text-slate-500 text-xs">
            <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Safe & Official</span>
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Limited Time</span>
            <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5" /> No Hidden Fees</span>
          </div>
        </div>

        {/* Free plan highlight */}
        {freePlan && (
          <div className="glow-border rounded-2xl p-6 bg-emerald-900/10 border-emerald-700/30 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🆓</span>
              <div>
                <h2 className="text-lg font-bold text-white">Start Free — No Credit Card</h2>
                <p className="text-emerald-400 text-sm">{freePlan.name} plan is completely free</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              {freePlan.features.map(f => (
                <div key={f} className="flex items-center gap-2 text-sm text-slate-300">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />{f}
                </div>
              ))}
            </div>
            <a href={tool.website} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-all">
              Start Free <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}

        {/* Pricing plans */}
        {paidPlans.length > 0 && (
          <div className="glow-border rounded-2xl p-6 bg-[#0F0A1E] mb-6">
            <h2 className="text-xl font-bold text-white mb-5">Choose Your Plan</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {paidPlans.map(plan => (
                <div key={plan.name}
                  className={`rounded-xl p-5 border transition-all ${plan.popular ? 'border-purple-500/60 bg-purple-900/20' : 'border-purple-900/40 bg-purple-950/20'}`}>
                  {plan.popular && (
                    <span className="inline-block bg-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded-full mb-2">Most Popular</span>
                  )}
                  <div className="font-bold text-white text-base mb-1">{plan.name}</div>
                  <div className="text-2xl font-extrabold text-purple-300 mb-3">{plan.price}</div>
                  <ul className="space-y-1.5 mb-4">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs text-slate-300">
                        <Check className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />{f}
                      </li>
                    ))}
                  </ul>
                  <a href={tool.website} target="_blank" rel="noopener noreferrer"
                    className={`flex items-center justify-center gap-2 w-full font-semibold py-2.5 rounded-xl text-sm transition-all ${plan.popular ? 'btn-primary text-white' : 'border border-purple-700/40 text-slate-300 hover:border-purple-500 hover:text-white'}`}>
                    Get {plan.name} <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-8">
          {tool.tags.map(tag => (
            <span key={tag} className="px-3 py-1 rounded-lg bg-purple-900/40 border border-purple-800/40 text-purple-300 text-sm">
              #{tag}
            </span>
          ))}
        </div>

        {/* Other deals CTA */}
        <div className="text-center">
          <p className="text-slate-400 mb-4">Looking for more AI tool deals?</p>
          <Link href="/pricing"
            className="inline-flex items-center gap-2 btn-primary text-white font-semibold px-8 py-3 rounded-xl">
            Browse All AI Tool Deals
          </Link>
        </div>
      </div>
    </div>
  )
}
