import { Search, BarChart3, Zap, CheckCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const steps = [
  {
    number: '01',
    icon: Search,
    title: 'Discover AI Tools',
    description:
      'Browse 70 hand-picked AI tools across 15 categories — from chat and coding to image generation and automation. Use our search to find exactly what you need.',
    highlight: 'No account needed to browse',
    color: 'from-purple-600/20 to-purple-900/10',
    border: 'border-purple-600/30',
    iconBg: 'bg-purple-900/50',
  },
  {
    number: '02',
    icon: BarChart3,
    title: 'Compare Side-by-Side',
    description:
      'Select up to 4 AI tools and compare them on pricing, features, ratings and more. Our comparison tool helps you make the smartest decision in seconds.',
    highlight: 'Compare up to 4 tools at once',
    color: 'from-violet-600/20 to-violet-900/10',
    border: 'border-violet-600/30',
    iconBg: 'bg-violet-900/50',
  },
  {
    number: '03',
    icon: Zap,
    title: 'Access & Subscribe',
    description:
      'Get direct links to the best pricing plans for each tool. Sign up on your chosen platform and start using the AI instantly — we guide you every step of the way.',
    highlight: 'Best prices, direct access',
    color: 'from-fuchsia-600/20 to-fuchsia-900/10',
    border: 'border-fuchsia-600/30',
    iconBg: 'bg-fuchsia-900/50',
  },
]

export default function HowItWorksSection() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-purple-400 text-sm font-semibold uppercase tracking-wider">
            Simple Process
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 mt-3">
            How ApkaAI Works
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Getting started with the best AI tools takes less than 60 seconds — no signup, no friction.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">

          {/* Connector line (desktop only) */}
          <div className="hidden md:block absolute top-14 left-[calc(33.33%-1px)] right-[calc(33.33%-1px)] h-px bg-gradient-to-r from-purple-700/40 via-violet-500/60 to-fuchsia-700/40 z-0" />

          {steps.map((step) => {
            const Icon = step.icon
            return (
              <div
                key={step.number}
                className={`relative z-10 rounded-2xl bg-gradient-to-br ${step.color} border ${step.border} p-8 flex flex-col gap-4 group hover:-translate-y-1 transition-transform duration-300`}
              >
                {/* Step number */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-5xl font-black text-purple-900/60 select-none leading-none">
                    {step.number}
                  </span>
                  <div className={`w-12 h-12 rounded-xl ${step.iconBg} border ${step.border} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6 text-purple-300" />
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{step.description}</p>
                </div>

                {/* Highlight badge */}
                <div className="mt-auto pt-4 border-t border-purple-800/20">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-300">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    {step.highlight}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* CTA */}
        <div className="text-center mt-14">
          <Link
            href="/tools"
            className="btn-primary inline-flex items-center gap-2.5 text-white font-bold px-9 py-4 rounded-xl text-base shadow-glow-sm"
          >
            Get Started Now — It&apos;s Free <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  )
}
