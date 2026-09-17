'use client'
import { useState } from 'react'
import Image from 'next/image'

/* ─────────────────────────────────────────────────────────────────────────────
   Social links — replace the href values with real URLs when ready
───────────────────────────────────────────────────────────────────────────── */
const SOCIAL_LINKS = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    href: 'https://whatsapp.com/channel/0029Vb8v0PI3gvWdBSlAcx2Y',
    bg: 'bg-[#25D366]',
    glow: 'shadow-[0_0_14px_4px_#25D366aa]',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.523 5.85L.057 23.428a.75.75 0 00.921.921l5.578-1.466A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.847 0-3.576-.5-5.065-1.37l-.362-.214-3.75.986.986-3.75-.214-.362A9.944 9.944 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
      </svg>
    ),
  },
  {
    id: 'instagram',
    label: 'Instagram',
    href: 'https://www.instagram.com/apkaai2k26/',
    bg: 'bg-gradient-to-br from-[#f09433] via-[#e6683c] via-[#dc2743] via-[#cc2366] to-[#bc1888]',
    glow: 'shadow-[0_0_14px_4px_#e6683caa]',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
  },
  {
    id: 'twitter',
    label: 'X (Twitter)',
    href: 'https://x.com/apkaAI2026',
    bg: 'bg-[#000000]',
    glow: 'shadow-[0_0_14px_4px_#444444aa]',
    icon: (
      /* Official X / Twitter logo */
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L2.18 2.25h6.963l4.261 5.633 5.84-5.633zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
      </svg>
    ),
  },
  {
    id: 'facebook',
    label: 'Facebook',
    href: 'https://www.facebook.com/share/18pUPqwgCz/',
    bg: 'bg-[#1877F2]',
    glow: 'shadow-[0_0_14px_4px_#1877F2aa]',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/company/apkaai/',
    bg: 'bg-[#0A66C2]',
    glow: 'shadow-[0_0_14px_4px_#0A66C2aa]',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
  },
  {
    id: 'youtube',
    label: 'YouTube',
    href: 'https://www.youtube.com/@apkAI2026',
    bg: 'bg-[#FF0000]',
    glow: 'shadow-[0_0_14px_4px_#FF0000aa]',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
  },
]

export default function FloatingSocialWidget() {
  const [open, setOpen] = useState(false)

  return (
    <div
      className="flex flex-col items-center gap-3"
      aria-label="Social media links"
    >
      {/* Social icon list — slides in when open */}
      <div
        className={`flex flex-col items-center gap-3 transition-all duration-300 origin-bottom ${
          open
            ? 'opacity-100 scale-y-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-y-75 translate-y-4 pointer-events-none'
        }`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.34,1.56,0.64,1)' }}
      >
        {SOCIAL_LINKS.map(({ id, label, href, bg, glow, icon }) => (
          <a
            key={id}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            title={label}
            className={`w-11 h-11 rounded-full ${bg} text-white flex items-center justify-center transition-all duration-200 hover:scale-110 ${glow} hover:brightness-110`}
          >
            {icon}
          </a>
        ))}

        {/* Close button */}
        <button
          onClick={() => setOpen(false)}
          aria-label="Close social menu"
          className="w-11 h-11 rounded-full bg-[#e84c65] text-white flex items-center justify-center shadow-[0_0_14px_4px_#e84c65aa] hover:bg-[#cf3552] hover:scale-110 hover:brightness-110 transition-all duration-200"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      {/* Trigger button — 3D chatbot image */}
      <button
        onClick={() => setOpen(prev => !prev)}
        aria-label="Toggle social menu"
        className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300
          shadow-[0_0_0_3px_rgba(124,58,237,0.45),0_0_0_7px_rgba(124,58,237,0.15)]
          hover:shadow-[0_0_0_3px_rgba(168,85,247,0.65),0_0_0_9px_rgba(124,58,237,0.25)]
          hover:scale-105 active:scale-95 overflow-hidden bg-transparent
        `}
        style={{ transition: 'transform 0.3s ease, box-shadow 0.2s ease' }}
      >
        {/* Pulsing ring */}
        <span className="absolute inset-0 rounded-full border-2 border-purple-500/40 animate-ping pointer-events-none" style={{ animationDuration: '2.5s' }} />
        <Image
          src="/chatbot-icon.png"
          alt="Chat with us"
          width={64}
          height={64}
          className="rounded-full object-cover w-full h-full"
          priority
        />
      </button>
    </div>
  )
}
