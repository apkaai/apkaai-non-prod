import { Sparkles, Shield, Zap, BarChart3, Globe, Star, Tag, TrendingUp } from 'lucide-react'

const features = [
  {
    icon: Sparkles,
    title: 'Curated, Not Crowded',
    description:
      'Every single tool is hand-picked and verified by our team. No spam, no outdated tools — only the best 70 AI tools across 15 categories.',
    accent: 'text-purple-400',
    bg: 'bg-purple-900/30',
    border: 'border-purple-700/30',
  },
  {
    icon: Shield,
    title: 'Trusted & Accurate',
    description:
      'Pricing, ratings, and features are sourced directly from each platform and updated regularly so you always get the truth.',
    accent: 'text-emerald-400',
    bg: 'bg-emerald-900/20',
    border: 'border-emerald-700/20',
  },
  {
    icon: Zap,
    title: 'Instant Discovery',
    description:
      'Find any AI tool in seconds with our fast search and category filters. No paywalls, no sign-up required to browse our full directory.',
    accent: 'text-amber-400',
    bg: 'bg-amber-900/20',
    border: 'border-amber-700/20',
  },
  {
    icon: BarChart3,
    title: 'Smart Comparison',
    description:
      'Select up to 4 AI tools and compare them side-by-side on pricing, feature sets, ratings and more — so you always choose right.',
    accent: 'text-blue-400',
    bg: 'bg-blue-900/20',
    border: 'border-blue-700/20',
  },
  {
    icon: TrendingUp,
    title: 'World Pricing',
    description:
      'All prices shown in INR. We surface the most affordable plans and highlight free tiers so you spend only what you need to.',
    accent: 'text-orange-400',
    bg: 'bg-orange-900/20',
    border: 'border-orange-700/20',
  },
  {
    icon: Globe,
    title: 'All Categories Covered',
    description:
      'Chat, code, image, video, audio, design, automation and more — 15 categories so your entire AI workflow lives in one place.',
    accent: 'text-teal-400',
    bg: 'bg-teal-900/20',
    border: 'border-teal-700/20',
  },
  {
    icon: Star,
    title: 'Real User Ratings',
    description:
      'Every tool shows aggregated ratings and review counts from real users so you can gauge popularity and trust before subscribing.',
    accent: 'text-yellow-400',
    bg: 'bg-yellow-900/20',
    border: 'border-yellow-700/20',
  },
  {
    icon: Tag,
    title: 'All Plans in One Place',
    description:
      'Each tool page shows Free, Freemium, and Paid plans side-by-side with feature breakdowns, so you can pick the right tier without leaving the site.',
    accent: 'text-fuchsia-400',
    bg: 'bg-fuchsia-900/20',
    border: 'border-fuchsia-700/20',
  },
]

export default function FeaturesSection() {
  return (
    <section className="py-24 px-4 bg-[#0A0618]">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-purple-400 text-sm font-semibold uppercase tracking-wider">
            Why ApkaAI
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 mt-3">
            Everything You Need to Choose the Right AI
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            We built the platform we wished existed when we were trying to figure out which AI tools were actually worth paying for.
          </p>
        </div>

        {/* Feature cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map(({ icon: Icon, title, description, accent, bg, border }) => (
            <div
              key={title}
              className="glow-border rounded-xl p-6 bg-[#0F0A1E] hover:bg-purple-950/20 group transition-all duration-300 hover:-translate-y-1 flex flex-col gap-4"
            >
              {/* Icon */}
              <div className={`w-11 h-11 rounded-xl ${bg} border ${border} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                <Icon className={`w-5 h-5 ${accent}`} />
              </div>

              {/* Content */}
              <div>
                <h3 className="font-bold text-white mb-1.5 text-sm">{title}</h3>
                <p className="text-slate-400 text-xs leading-relaxed">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
