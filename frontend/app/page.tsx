import Link from 'next/link'
import { ArrowRight, Sparkles, TrendingUp, Shield, Zap, Star, Users, Globe, BarChart3 } from 'lucide-react'
import ToolCard from '@/components/ToolCard'
import CategoryCard from '@/components/CategoryCard'
import { featuredTools, categories, tools } from '@/lib/tools-data'

const stats = [
  { icon: Globe,      label: 'AI Tools',     value: '43' },
  { icon: Users,      label: 'Happy Users',  value: '280+' },
  { icon: Star,       label: 'Avg Rating',   value: '4.7' },
  { icon: TrendingUp, label: 'Categories',   value: '15' },
]

const trustedBrands = ['ChatGPT', 'Claude', 'Gemini', 'Midjourney', 'Cursor', 'Runway', 'ElevenLabs', 'Suno']

const whyChooseUs = [
  { icon: Sparkles, title: 'Curated Collection',    desc: 'Every tool is hand-picked and verified. No spam — only the best 43 AI tools across 15 categories.' },
  { icon: Shield,   title: 'Trusted Information',   desc: 'Accurate pricing, honest ratings, and up-to-date details sourced directly from each tool.' },
  { icon: Zap,      title: 'Instant Access',        desc: 'Find and access any AI tool in seconds — no sign-ups or paywalls to browse our directory.' },
  { icon: BarChart3,title: 'Compare Side-by-Side',  desc: 'Use our comparison tool to pick the right AI for your needs based on pricing and features.' },
]

export default function HomePage() {
  const allNewTools = tools.filter(t => t.new).slice(0, 8)

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 grid-bg overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-purple-700/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-[300px] h-[300px] bg-violet-600/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute top-20 right-1/4 w-[300px] h-[300px] bg-purple-600/10 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-purple-900/40 border border-purple-700/50 rounded-full px-4 py-2 text-sm text-purple-300 mb-8">
            <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
            43 AI Tools · 15 Categories · Updated Daily
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-tight mb-6">
            Discover the
            <span className="block gradient-text glow-text">Best AI Tools</span>
            for Everything
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            India&apos;s #1 AI marketplace. Find, compare and access ChatGPT, Claude, Midjourney, Cursor and 43 AI tools — all in one place.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/tools" className="btn-primary flex items-center gap-2 text-white font-bold px-8 py-4 rounded-xl text-base shadow-glow-sm">
              Explore All 43 Tools <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/compare" className="flex items-center gap-2 text-slate-300 hover:text-white font-semibold px-8 py-4 rounded-xl text-base border border-purple-800/40 hover:border-purple-500/60 transition-all bg-purple-950/20">
              <BarChart3 className="w-5 h-5" /> Compare AI Tools
            </Link>
          </div>

          <div className="mt-16">
            <p className="text-slate-500 text-sm mb-6">Featuring tools from</p>
            <div className="flex flex-wrap justify-center gap-3">
              {trustedBrands.map(name => (
                <span key={name} className="px-4 py-2 bg-[#150D2E] border border-purple-900/40 rounded-lg text-slate-300 text-sm font-medium hover:border-purple-600/50 transition-colors">
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-4 border-y border-purple-900/20">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="text-center">
              <div className="flex justify-center mb-2"><Icon className="w-5 h-5 text-purple-400" /></div>
              <div className="text-3xl font-extrabold text-white">{value}</div>
              <div className="text-slate-400 text-sm mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Tools */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <span className="text-purple-400 text-sm font-semibold uppercase tracking-wider">Featured</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Top AI Tools</h2>
              <p className="text-slate-400 mt-2">The most popular AI tools used by millions worldwide</p>
            </div>
            <Link href="/tools" className="hidden sm:flex items-center gap-1 text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors">
              View all 43 <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {featuredTools.slice(0, 8).map(tool => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/tools" className="inline-flex items-center gap-2 btn-primary text-white font-semibold px-8 py-3 rounded-xl text-sm">
              Explore All 43 AI Tools <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* New Tools */}
      {allNewTools.length > 0 && (
        <section className="py-16 px-4 bg-[#0A0618]">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-emerald-400 text-sm font-semibold uppercase tracking-wider">🆕 Just Added</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Newest AI Tools</h2>
              </div>
              <Link href="/tools?sort=new" className="hidden sm:flex items-center gap-1 text-purple-400 hover:text-purple-300 text-sm font-medium">
                See all new <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {allNewTools.map(tool => (
                <ToolCard key={tool.id} tool={tool} compact />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Categories */}
      <section id="categories" className="py-20 px-4 bg-[#0A0618]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-purple-400 text-sm font-semibold uppercase tracking-wider">Browse by Category</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 mt-2">Every AI Category Covered</h2>
            <p className="text-slate-400 max-w-xl mx-auto">From chat to code, image to video — we have AI tools for every use case</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {categories.map(cat => <CategoryCard key={cat.id} category={cat} />)}
          </div>
        </div>
      </section>

      {/* Compare CTA */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="glow-border rounded-2xl p-10 bg-gradient-to-br from-purple-900/20 to-[#0F0A1E] text-center">
            <BarChart3 className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">Compare AI Tools Side by Side</h2>
            <p className="text-slate-400 mb-6 max-w-xl mx-auto">Select up to 4 tools and compare them on pricing, features, and ratings to make the perfect choice.</p>
            <Link href="/compare" className="btn-primary inline-flex items-center gap-2 text-white font-bold px-8 py-3.5 rounded-xl text-base shadow-glow-sm">
              <BarChart3 className="w-5 h-5" /> Open Comparison Tool
            </Link>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">Why Choose ApkaAI?</h2>
            <p className="text-slate-400 max-w-xl mx-auto">We make discovering and accessing AI tools simple, safe and affordable</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {whyChooseUs.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="glow-border rounded-xl p-6 text-center bg-[#0F0A1E] group hover:bg-purple-950/20 transition-all">
                <div className="w-12 h-12 rounded-xl bg-purple-900/40 border border-purple-700/30 flex items-center justify-center mx-auto mb-4 group-hover:border-purple-500 transition-colors">
                  <Icon className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="font-bold text-white mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden border border-purple-700/40 bg-gradient-to-br from-purple-900/30 to-violet-900/20 p-12 text-center">
            <div className="absolute inset-0 bg-glow-gradient opacity-50 pointer-events-none" />
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">Start Exploring AI Today</h2>
              <p className="text-slate-400 text-lg mb-8 max-w-xl mx-auto">
                Join thousands of professionals, creators and businesses already using the best AI tools
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/tools" className="btn-primary inline-flex items-center gap-2 text-white font-bold px-10 py-4 rounded-xl text-base shadow-glow-md">
                  Browse All Tools <ArrowRight className="w-5 h-5" />
                </Link>
                <Link href="/pricing" className="inline-flex items-center gap-2 border border-purple-700/40 hover:border-purple-500 text-slate-300 hover:text-white font-semibold px-8 py-4 rounded-xl text-base transition-all">
                  View Pricing Guide
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
