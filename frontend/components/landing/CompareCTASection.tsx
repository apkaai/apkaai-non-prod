import Link from 'next/link'
import { BarChart3, ArrowRight, CheckCircle } from 'lucide-react'

const comparePerks = [
  'Compare up to 4 tools at once',
  'Pricing plans side-by-side in INR',
  'Feature-by-feature breakdown',
  'Ratings & review counts',
]

export default function CompareCTASection() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="relative rounded-2xl overflow-hidden border border-purple-700/40">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-[#0F0A1E] to-violet-900/20 pointer-events-none" />
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-600/10 blur-[100px] rounded-full pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center gap-10 p-10 sm:p-14">

            {/* Left: Text */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-purple-900/40 border border-purple-700/40 rounded-full px-4 py-1.5 text-xs text-purple-300 font-semibold mb-5">
                <BarChart3 className="w-3.5 h-3.5" /> Free Comparison Tool
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
                Still Deciding? <br className="hidden sm:block" />
                <span className="gradient-text">Compare AI Tools Side by Side</span>
              </h2>
              <p className="text-slate-400 mb-6 max-w-md mx-auto lg:mx-0">
                Select up to 4 tools and instantly compare pricing, features and ratings to make the perfect choice — no guesswork.
              </p>

              {/* Perks list */}
              <ul className="space-y-2 mb-8">
                {comparePerks.map(perk => (
                  <li key={perk} className="flex items-center gap-2.5 text-slate-300 text-sm justify-center lg:justify-start">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    {perk}
                  </li>
                ))}
              </ul>

              <Link
                href="/compare"
                className="btn-primary inline-flex items-center gap-2.5 text-white font-bold px-8 py-4 rounded-xl text-base shadow-glow-sm"
              >
                <BarChart3 className="w-5 h-5" /> Open Comparison Tool <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Right: Visual preview card */}
            <div className="flex-shrink-0 w-full lg:w-80">
              <div className="glow-border rounded-xl p-5 bg-[#0D0826] space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-4 h-4 text-purple-400" />
                  <span className="text-white text-sm font-semibold">Comparison Preview</span>
                </div>

                {/* Mock comparison rows */}
                {[
                  { tool: '🤖 ChatGPT',    price: '₹1,650/mo', rating: '4.8', type: 'Freemium' },
                  { tool: '🧡 Claude',     price: '₹1,650/mo', rating: '4.7', type: 'Freemium' },
                  { tool: '✨ Gemini',     price: '₹1,740/mo', rating: '4.6', type: 'Freemium' },
                ].map(row => (
                  <div key={row.tool} className="flex items-center justify-between py-2 border-b border-purple-900/30 last:border-0">
                    <span className="text-slate-300 text-xs font-medium">{row.tool}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-purple-300 text-xs">{row.price}</span>
                      <span className="text-amber-400 text-xs">★ {row.rating}</span>
                    </div>
                  </div>
                ))}

                <div className="pt-1 text-center">
                  <span className="text-slate-500 text-xs">+ 40 more tools to compare</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}
