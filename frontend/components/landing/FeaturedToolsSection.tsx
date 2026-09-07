import Link from 'next/link'
import { Sparkles, ArrowRight } from 'lucide-react'
import ToolCard from '@/components/ToolCard'
import { featuredTools } from '@/lib/tools-data'

export default function FeaturedToolsSection() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span className="text-purple-400 text-sm font-semibold uppercase tracking-wider">Featured</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">
              Top AI Tools Right Now
            </h2>
            <p className="text-slate-400 max-w-lg">
              The most powerful, popular AI tools used by millions of creators, developers and businesses worldwide.
            </p>
          </div>
          <Link
            href="/tools"
            className="inline-flex items-center gap-1.5 text-purple-400 hover:text-purple-300 text-sm font-semibold transition-colors flex-shrink-0 group"
          >
            View all 43 <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Tool cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {featuredTools.slice(0, 8).map(tool => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <Link
            href="/tools"
            className="inline-flex items-center gap-2.5 btn-primary text-white font-bold px-9 py-3.5 rounded-xl text-sm shadow-glow-sm"
          >
            Explore All 43 AI Tools <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
