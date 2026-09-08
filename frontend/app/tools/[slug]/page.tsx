import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Star, ExternalLink, Check, ArrowRight, Globe, Tag, Zap } from 'lucide-react'
import ToolCard from '@/components/ToolCard'
import { getToolBySlug, getToolsByCategory, tools, categories } from '@/lib/tools-data'

interface Props { params: { slug: string } }

export async function generateStaticParams() {
  return tools.map(t => ({ slug: t.slug }))
}

export async function generateMetadata({ params }: Props) {
  const tool = getToolBySlug(params.slug)
  if (!tool) return {}
  return {
    title: `${tool.name} — ${tool.tagline} | ApkaAI`,
    description: tool.description,
  }
}

// Freemium shown as Premium
function pricingLabel(pricing: string) {
  return pricing === 'Freemium' ? 'Premium' : pricing
}

function pricingColor(pricing: string) {
  switch (pricing) {
    case 'Free':       return 'bg-emerald-900/40 text-emerald-400'
    case 'Free Trial': return 'bg-teal-900/40 text-teal-400'
    case 'Paid':       return 'bg-amber-900/40 text-amber-400'
    default:           return 'bg-purple-900/40 text-purple-400' // Freemium/Premium
  }
}

export default function ToolDetailPage({ params }: Props) {
  const tool = getToolBySlug(params.slug)
  if (!tool) notFound()

  const related = getToolsByCategory(tool.categorySlug)
    .filter(t => t.slug !== tool.slug)
    .slice(0, 4)

  const otherCategories = categories.filter(c => c.slug !== tool.categorySlug)

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-8 flex-wrap">
          <Link href="/tools" className="hover:text-white transition-colors">Tools</Link>
          <span>/</span>
          <Link href={`/category/${tool.categorySlug}`} className="hover:text-white transition-colors">
            {tool.category}
          </Link>
          <span>/</span>
          <span className="text-slate-300">{tool.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Main Content ───────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Tool Header */}
            <div className="glow-border rounded-2xl p-7 bg-[#0F0A1E]">
              <div className="flex items-start gap-5">
                <div className="w-20 h-20 rounded-2xl bg-purple-900/40 border border-purple-700/40 flex items-center justify-center text-4xl flex-shrink-0">
                  {tool.logo}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-3xl font-extrabold text-white">{tool.name}</h1>
                        {tool.badge && <span className="badge-new text-white">{tool.badge}</span>}
                        {tool.new && !tool.badge && (
                          <span className="badge-new text-white bg-gradient-to-r from-emerald-600 to-teal-600">New</span>
                        )}
                      </div>
                      <p className="text-slate-300 text-lg mt-1">{tool.tagline}</p>
                    </div>
                  </div>
                  {/* Rating */}
                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map(i => (
                        <Star key={i} className={`w-4 h-4 ${i <= Math.round(tool.rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
                      ))}
                    </div>
                    <span className="text-white font-bold">{tool.rating}</span>
                    <span className="text-slate-400 text-sm">({tool.reviews.toLocaleString()} reviews)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* About */}
            <div className="glow-border rounded-2xl p-7 bg-[#0F0A1E]">
              <h2 className="text-xl font-bold text-white mb-4">About {tool.name}</h2>
              <p className="text-slate-300 leading-relaxed">{tool.description}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {tool.tags.map(tag => (
                  <span key={tag} className="px-3 py-1 rounded-lg bg-purple-900/40 border border-purple-800/40 text-purple-300 text-sm">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Key Features */}
            <div className="glow-border rounded-2xl p-7 bg-[#0F0A1E]">
              <h2 className="text-xl font-bold text-white mb-5">Key Features</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  'Advanced AI capabilities',
                  'Easy to use interface',
                  'Regular model updates',
                  'API access available',
                  'Mobile & desktop support',
                  'Multi-language support',
                ].map(f => (
                  <div key={f} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-purple-900/60 border border-purple-600/40 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-purple-400" />
                    </div>
                    <span className="text-slate-300 text-sm">{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing Plans */}
            {tool.pricingPlans && tool.pricingPlans.length > 0 && (
              <div className="glow-border rounded-2xl p-7 bg-[#0F0A1E]">
                <h2 className="text-xl font-bold text-white mb-5">Pricing Plans</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tool.pricingPlans.map(plan => (
                    <div
                      key={plan.name}
                      className={`p-4 rounded-xl border ${
                        plan.popular
                          ? 'border-purple-500/60 bg-purple-900/20'
                          : 'border-purple-900/40 bg-purple-950/20'
                      }`}
                    >
                      {plan.popular && (
                        <span className="inline-block bg-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded-full mb-2">Most Popular</span>
                      )}
                      <div className="font-bold text-white text-sm mb-1">{plan.name}</div>
                      <div className="text-2xl font-extrabold text-purple-300 mb-3">{plan.price}</div>
                      <ul className="space-y-1.5">
                        {plan.features.map(f => (
                          <li key={f} className="flex items-start gap-2 text-xs text-slate-300">
                            <Check className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />{f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar ────────────────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* CTA Card */}
            <div className="glow-border rounded-2xl p-6 bg-[#0F0A1E] sticky top-24">
              <div className="text-center mb-5">
                <p className="text-slate-400 text-sm mb-1">Starting from</p>
                <p className="text-3xl font-extrabold text-white">{tool.startingPrice}</p>
                <span className={`inline-block mt-2 text-xs font-semibold px-3 py-1 rounded-full ${pricingColor(tool.pricing)}`}>
                  {pricingLabel(tool.pricing)}
                </span>
              </div>

              {/* Visit button */}
              <a
                href={tool.website}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary flex items-center justify-center gap-2 text-white font-bold px-6 py-3.5 rounded-xl w-full text-sm shadow-glow-sm mb-3"
              >
                Visit {tool.name}
                <ExternalLink className="w-4 h-4" />
              </a>

              {/* Get Deal / Discount — now routes to custom deal page */}
              <Link
                href={`/deals/${tool.slug}`}
                className="w-full flex items-center justify-center gap-2 border border-purple-700/40 hover:border-purple-500 text-slate-300 hover:text-white font-semibold px-6 py-3 rounded-xl text-sm transition-all bg-purple-950/20 hover:bg-purple-900/20"
              >
                Get Deal / Discount
                <Tag className="w-4 h-4" />
              </Link>

              {/* Meta info */}
              <div className="mt-5 space-y-3 border-t border-purple-900/30 pt-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Category</span>
                  <Link href={`/category/${tool.categorySlug}`} className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
                    {tool.category}
                  </Link>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Pricing</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pricingColor(tool.pricing)}`}>
                    {pricingLabel(tool.pricing)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Website</span>
                  <a href={tool.website} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium">
                    <Globe className="w-3 h-3" />Visit
                  </a>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Rating</span>
                  <span className="text-white font-semibold flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />{tool.rating}/5
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Reviews</span>
                  <span className="text-white font-semibold">{tool.reviews.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Compare link */}
            <Link
              href={`/compare?tools=${tool.slug}`}
              className="flex items-center justify-center gap-2 w-full border border-purple-700/40 hover:border-purple-500 text-purple-300 hover:text-white font-medium px-4 py-3 rounded-xl text-sm transition-all bg-purple-950/10"
            >
              <Zap className="w-4 h-4" />
              Compare with other tools
            </Link>
          </div>
        </div>

        {/* Related Tools */}
        {related.length > 0 && (
          <section className="mt-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-extrabold text-white">Similar Tools in {tool.category}</h2>
              <Link href={`/category/${tool.categorySlug}`} className="flex items-center gap-1 text-purple-400 hover:text-purple-300 text-sm font-medium">
                See all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {related.map(t => <ToolCard key={t.id} tool={t} />)}
            </div>
          </section>
        )}

        {/* Explore Other Categories */}
        <section className="mt-16">
          <h2 className="text-xl font-bold text-white mb-5">Explore Other Categories</h2>
          <div className="flex flex-wrap gap-3">
            {otherCategories.map(cat => (
              <Link
                key={cat.slug}
                href={`/category/${cat.slug}`}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0F0A1E] border border-purple-800/40 text-slate-300 hover:border-purple-500 hover:text-white text-sm transition-all"
              >
                <span>{cat.emoji}</span>{cat.name}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
