'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

// Expiry: 25 Sep 2026 12:00 PM IST (UTC+5:30 → UTC 06:30)
const EXPIRY_UTC = new Date('2026-09-25T06:30:00Z').getTime()

function isExpired() {
  return Date.now() >= EXPIRY_UTC
}

/* Simple floating particle */
function Particle({ style }: { style: React.CSSProperties }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        width: 8,
        height: 8,
        borderRadius: '50%',
        pointerEvents: 'none',
        ...style,
      }}
    />
  )
}

const PARTICLES = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  left: `${Math.random() * 100}%`,
  top: `${Math.random() * 100}%`,
  bg: ['#FFD700', '#FF6B35', '#E91E8C', '#9C27B0', '#FF9800', '#4CAF50'][i % 6],
  delay: `${(Math.random() * 4).toFixed(1)}s`,
  dur: `${(3 + Math.random() * 4).toFixed(1)}s`,
}))

export default function GaneshChaturthi() {
  const [expired, setExpired] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (isExpired()) { setExpired(true); return }

    // Check every minute
    const id = setInterval(() => {
      if (isExpired()) { setExpired(true); clearInterval(id) }
    }, 60_000)
    return () => clearInterval(id)
  }, [])

  if (!mounted) return null

  if (expired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#08051A] px-4">
        <div className="text-center">
          <p className="text-slate-400 text-lg mb-4">This celebration page is no longer available.</p>
          <Link href="/" className="btn-primary text-white font-bold px-8 py-3 rounded-xl inline-flex">
            Back to ApkaAI
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center px-4 py-16"
      style={{
        background: 'radial-gradient(ellipse at 50% 0%, rgba(255,140,0,0.25) 0%, transparent 60%), radial-gradient(ellipse at 50% 100%, rgba(156,39,176,0.3) 0%, transparent 60%), #0A0410',
      }}
    >
      {/* Floating particles */}
      {PARTICLES.map(p => (
        <Particle
          key={p.id}
          style={{
            left: p.left,
            top: p.top,
            background: p.bg,
            opacity: 0.6,
            animation: `floatUp ${p.dur} ${p.delay} ease-in-out infinite alternate`,
          }}
        />
      ))}

      {/* Decorative glow rings */}
      <div aria-hidden="true" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,140,0,0.12) 0%, transparent 70%)' }} />
      <div aria-hidden="true" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(156,39,176,0.08) 0%, transparent 70%)' }} />

      {/* ── Content ── */}
      <div className="relative z-10 text-center max-w-2xl mx-auto">

        {/* Om symbol */}
        <div className="text-5xl mb-4" aria-label="Om">🕉️</div>

        {/* Ganesha image */}
        <div className="relative inline-block mb-6">
          <div className="absolute inset-0 rounded-full blur-2xl opacity-60"
            style={{ background: 'radial-gradient(circle, rgba(255,200,0,0.6), rgba(255,100,0,0.3), transparent)' }} />
          <div
            className="relative rounded-full border-4 overflow-hidden mx-auto"
            style={{
              width: 200,
              height: 200,
              borderColor: '#FFD700',
              boxShadow: '0 0 40px rgba(255,215,0,0.6), 0 0 80px rgba(255,140,0,0.3)',
              animation: 'ganeshFloat 3s ease-in-out infinite',
            }}
          >
            <Image
              src="/ganesha.png"
              alt="Lord Ganesha"
              width={200}
              height={200}
              className="object-cover w-full h-full"
              priority
            />
          </div>
        </div>

        {/* Greeting */}
        <h1
          className="text-4xl sm:text-5xl font-extrabold mb-3"
          style={{
            background: 'linear-gradient(135deg, #FFD700 0%, #FF8C00 40%, #FF1493 80%, #9C27B0 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Happy Ganesh Chaturthi 🙏
        </h1>

        <p className="text-orange-300 text-xl font-semibold mb-2">
          गणपति बप्पा मोरया! 🐘
        </p>

        <p className="text-slate-300 text-lg leading-relaxed mb-6 max-w-lg mx-auto">
          May Lord Ganesha remove all obstacles from your path, bless you with wisdom, prosperity, and success. Wishing you and your family a joyful Ganesh Chaturthi!
        </p>

        {/* Decorative divider */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <span className="text-2xl">🌺</span>
          <div className="h-px w-20" style={{ background: 'linear-gradient(90deg, transparent, #FFD700, transparent)' }} />
          <span className="text-2xl">🪔</span>
          <div className="h-px w-20" style={{ background: 'linear-gradient(90deg, transparent, #FF8C00, transparent)' }} />
          <span className="text-2xl">🌸</span>
        </div>

        {/* Blessings card */}
        <div
          className="rounded-2xl p-6 mb-8 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(255,140,0,0.12), rgba(156,39,176,0.12))',
            border: '1px solid rgba(255,215,0,0.3)',
            boxShadow: '0 0 20px rgba(255,215,0,0.1)',
          }}
        >
          <p className="text-slate-200 text-base leading-relaxed italic">
            &ldquo;Vakratunda Mahakaya, Suryakoti Samaprabha.<br />
            Nirvighnam Kuru Me Deva, Sarva-Kaaryeshu Sarvada.&rdquo;
          </p>
          <p className="text-orange-400 text-sm mt-2">— Ganesh Stuti 🙏</p>
        </div>

        {/* From ApkaAI */}
        <p className="text-slate-400 text-sm mb-6">
          With warm wishes from the <span className="text-purple-400 font-semibold">ApkaAI</span> Team 🌍
        </p>

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white text-base transition-all hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, #FF8C00, #FF1493)',
            boxShadow: '0 0 20px rgba(255,140,0,0.4)',
          }}
        >
          🏠 Back to ApkaAI
        </Link>
      </div>

      {/* Inline keyframes */}
      <style>{`
        @keyframes floatUp {
          0%   { transform: translateY(0px) scale(1); opacity: 0.5; }
          50%  { transform: translateY(-30px) scale(1.2); opacity: 0.8; }
          100% { transform: translateY(0px) scale(1); opacity: 0.5; }
        }
        @keyframes ganeshFloat {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-12px); }
        }
      `}</style>
    </div>
  )
}
