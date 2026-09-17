'use client'
import Link from 'next/link'
import { ArrowRight, Sparkles, BarChart3 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import HoverPreview from '@/components/HoverPreview'

const ROTATING_WORDS = ['Creators', 'Developers', 'Marketers', 'Students', 'Founders']

const BRAND_PILLS = [
  { name: 'ChatGPT',     emoji: '🤖' },
  { name: 'Claude',      emoji: '🧡' },
  { name: 'Midjourney',  emoji: '🎨' },
  { name: 'Cursor',      emoji: '💻' },
  { name: 'Runway',      emoji: '🎬' },
  { name: 'ElevenLabs',  emoji: '🎙️' },
  { name: 'Gemini',      emoji: '✨' },
  { name: 'Suno',        emoji: '🎵' },
]

export default function HeroSection() {
  const [wordIndex, setWordIndex] = useState(0)
  const [visible, setVisible]     = useState(true)
  const intervalRef               = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setWordIndex(i => (i + 1) % ROTATING_WORDS.length)
        setVisible(true)
      }, 300)
    }, 2200)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  return (
    <section className="relative pt-28 pb-24 px-4 grid-bg overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-purple-700/25 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute top-32 left-1/4 w-[350px] h-[350px] bg-violet-600/10 blur-[90px] rounded-full pointer-events-none" />
      <div className="absolute top-32 right-1/4 w-[350px] h-[350px] bg-purple-600/10 blur-[90px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#08051A] to-transparent pointer-events-none" />

      <div className="relative max-w-5xl mx-auto text-center">

        {/* Announcement badge */}
        <div className="inline-flex items-center gap-2.5 bg-purple-900/40 border border-purple-700/50 rounded-full px-5 py-2 text-sm text-purple-300 mb-10 backdrop-blur-sm">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse flex-shrink-0" />
          <span>70 AI Tools &nbsp;·&nbsp; 15 Categories &nbsp;·&nbsp; Updated Daily</span>
          <span className="hidden sm:inline-flex items-center gap-1 text-purple-400 font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> New tools added weekly
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-[1.1] tracking-tight mb-6">
          One Platform for
          <span className="block gradient-text glow-text mt-1">Every AI Tool</span>
          <span className="block mt-2 text-4xl sm:text-5xl lg:text-6xl text-slate-300 font-bold">
            Built for{' '}
            <span
              className="inline-block text-purple-400 transition-all duration-300"
              style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(10px)' }}
            >
              {ROTATING_WORDS[wordIndex]}
            </span>
          </span>
        </h1>

        {/* Sub-headline */}
        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          World&apos;s #1 AI marketplace. Discover, compare and access ChatGPT, Claude, Midjourney,
          Cursor and 70 premium AI tools — all in one place, at the best prices.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-14">
          <HoverPreview label="Browse all 70 AI tools across 15 categories" icon={<Sparkles className="w-3.5 h-3.5" />}>
            <Link
              href="/tools"
              className="btn-primary flex items-center gap-2.5 text-white font-bold px-9 py-4 rounded-xl text-base shadow-glow-md w-full sm:w-auto justify-center"
            >
              Explore All 70 Tools <ArrowRight className="w-5 h-5" />
            </Link>
          </HoverPreview>
          <HoverPreview label="Compare up to 4 AI tools side by side" icon={<BarChart3 className="w-3.5 h-3.5" />}>
            <Link
              href="/compare"
              className="flex items-center gap-2.5 text-slate-300 hover:text-white font-semibold px-8 py-4 rounded-xl text-base border border-purple-800/50 hover:border-purple-500/70 transition-all bg-purple-950/20 backdrop-blur-sm w-full sm:w-auto justify-center"
            >
              <BarChart3 className="w-5 h-5 text-purple-400" /> Compare Tools
            </Link>
          </HoverPreview>
          <HoverPreview label="See all plans and pricing in INR" icon={<ArrowRight className="w-3.5 h-3.5" />}>
            <Link
              href="/pricing"
              className="flex items-center gap-2 text-purple-400 hover:text-purple-300 font-medium text-sm px-4 py-4 transition-colors w-full sm:w-auto justify-center"
            >
              <ArrowRight className="w-4 h-4" /> View Pricing
            </Link>
          </HoverPreview>
        </div>

        {/* Trusted brands — right-to-left marquee */}
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-widest mb-5 font-medium">
            Featuring tools from
          </p>

          {/* Marquee container — overflow hidden, no page scroll */}
          <div
            style={{
              overflow: 'hidden',
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
              maskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
            }}
          >
            {/* Inner wrapper: two identical strips side-by-side = seamless loop */}
            <div
              className="brand-marquee"
              style={{ display: 'flex', width: 'max-content' }}
            >
              {/* Strip A */}
              <div className="flex items-center gap-3 brand-strip">
                {BRAND_PILLS.map(({ name, emoji }) => (
                  <span
                    key={`a-${name}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#150D2E] border border-purple-900/40 rounded-xl text-slate-300 text-sm font-medium hover:border-purple-600/60 hover:text-white hover:bg-purple-900/20 transition-all cursor-default flex-shrink-0"
                  >
                    <span className="text-base">{emoji}</span>
                    {name}
                  </span>
                ))}
                {/* Spacer so strips don't bunch together */}
                <span className="inline-block w-8 flex-shrink-0" />
              </div>

              {/* Strip B — identical, follows A seamlessly */}
              <div className="flex items-center gap-3 brand-strip" aria-hidden="true">
                {BRAND_PILLS.map(({ name, emoji }) => (
                  <span
                    key={`b-${name}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#150D2E] border border-purple-900/40 rounded-xl text-slate-300 text-sm font-medium hover:border-purple-600/60 hover:text-white hover:bg-purple-900/20 transition-all cursor-default flex-shrink-0"
                  >
                    <span className="text-base">{emoji}</span>
                    {name}
                  </span>
                ))}
                <span className="inline-block w-8 flex-shrink-0" />
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes brandScroll {
            from { transform: translateX(0); }
            to   { transform: translateX(-50%); }
          }
          .brand-marquee {
            animation: brandScroll 18s linear infinite;
            will-change: transform;
          }
          .brand-marquee:hover {
            animation-play-state: paused;
          }
        `}</style>

        {/* Social proof strip */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm">
          <div className="flex -space-x-2">
            {['🧑‍💻', '👩‍🎨', '🧑‍🏫', '👨‍💼', '👩‍🔬'].map((emoji, idx) => (
              <div
                key={idx}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-700 to-violet-900 border-2 border-[#08051A] flex items-center justify-center text-base"
              >
                {emoji}
              </div>
            ))}
          </div>
          <div className="text-slate-400">
            <span className="text-white font-semibold">280+</span> professionals already using ApkaAI
            <div className="flex items-center justify-center sm:justify-start gap-1 mt-0.5">
              {[1,2,3,4,5].map(s => (
                <svg key={s} className="w-3.5 h-3.5 fill-amber-400" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
              ))}
              <span className="text-amber-400 font-semibold text-xs ml-1">4.7 avg rating</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
