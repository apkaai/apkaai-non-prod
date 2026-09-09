import Link from 'next/link'
import { ArrowRight, Sparkles, User } from 'lucide-react'

const bullets = [
  'Free to browse — no account needed',
  '43 verified AI tools across 15 categories',
  'Compare tools & find the best plan for you',
  'Best pricing in INR',
]

export default function FinalCTASection() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="relative rounded-3xl overflow-hidden border border-purple-700/40">

          {/* Background layers */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-[#0F0A1E] to-violet-900/30 pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-purple-600/15 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-violet-600/10 blur-[80px] rounded-full pointer-events-none" />

          {/* Subtle grid */}
          <div
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(rgba(124,58,237,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.07) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          <div className="relative z-10 px-8 sm:px-16 py-16 sm:py-20 text-center">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-purple-900/50 border border-purple-700/50 rounded-full px-5 py-2 text-sm text-purple-300 mb-8">
              <Sparkles className="w-4 h-4 text-purple-400" />
              India&apos;s #1 AI Tools Marketplace
            </div>

            {/* Headline */}
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight mb-5">
              Start Exploring <span className="gradient-text glow-text">AI Today</span>
            </h2>

            {/* Sub */}
            <p className="text-slate-400 text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
              Join thousands of professionals, creators and students across the World already using
              the best AI tools. Discover, compare and access everything from one place.
            </p>

            {/* Bullet list */}
            <ul className="inline-flex flex-col sm:flex-row flex-wrap justify-center gap-x-8 gap-y-2 mb-10 text-left">
              {bullets.map(b => (
                <li key={b} className="flex items-center gap-2 text-slate-300 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                  {b}
                </li>
              ))}
            </ul>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/tools"
                className="btn-primary flex items-center gap-2.5 text-white font-bold px-10 py-4 rounded-xl text-base shadow-glow-md w-full sm:w-auto justify-center"
              >
                <Sparkles className="w-5 h-5" /> Browse All 43 Tools <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/signup"
                className="flex items-center gap-2.5 border border-purple-700/50 hover:border-purple-500 text-slate-300 hover:text-white font-semibold px-8 py-4 rounded-xl text-base transition-all bg-purple-950/20 w-full sm:w-auto justify-center"
              >
                <User className="w-5 h-5 text-purple-400" /> Create Free Account
              </Link>
            </div>

            {/* Micro-copy */}
            <p className="mt-6 text-slate-600 text-xs">
              No credit card required · Sign up takes 30 seconds · Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
