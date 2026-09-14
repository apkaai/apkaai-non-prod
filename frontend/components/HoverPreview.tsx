'use client'

/**
 * HoverPreview — reusable tooltip/preview card shown above any button or link.
 *
 * Usage:
 *   <HoverPreview label="Browse all 43 AI tools">
 *     <Link href="/tools" className="btn-primary ...">Explore Tools</Link>
 *   </HoverPreview>
 *
 * Rules:
 *   • 250 ms delay before appearing   (so quick passes don't flash it)
 *   • Fade-in + slide-up animation    (GPU-accelerated via opacity + transform)
 *   • Positioned above the wrapped element, clamped inside viewport
 *   • pointer-events: none on the card  (never blocks the button underneath)
 *   • No effect on touch/mobile         (hover is meaningless on touch)
 *   • Social-media links are excluded by NOT wrapping them at all (opt-in pattern)
 */

import React, { useRef, useState, useEffect, useCallback, ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface HoverPreviewProps {
  /** Short description shown in the preview card */
  label: string
  /** Optional icon rendered left of the label (any JSX, e.g. a Lucide icon) */
  icon?: ReactNode
  /** The button / link element to wrap */
  children: ReactNode
  /** Extra class names forwarded to the wrapper <span> */
  className?: string
}

const DELAY_MS    = 250   // show delay
const HIDE_MS     = 80    // hide delay (fast)
const CARD_OFFSET = 10    // px above the anchor element

export default function HoverPreview({ label, icon, children, className }: HoverPreviewProps) {
  const anchorRef  = useRef<HTMLSpanElement>(null)
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [visible,  setVisible]  = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [mounted,  setMounted]  = useState(false)

  // Only run on client (portal target needs document)
  useEffect(() => { setMounted(true) }, [])

  // Compute position — above the anchor, horizontally centred, clamped to viewport
  const computePosition = useCallback(() => {
    if (!anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    const scrollY = window.scrollY

    // Estimated card width — we clamp against viewport
    const CARD_W = 220
    let left = rect.left + rect.width / 2 - CARD_W / 2
    const maxLeft = window.innerWidth - CARD_W - 12
    left = Math.max(8, Math.min(left, maxLeft))

    const top = rect.top + scrollY - CARD_OFFSET  // card bottom sits CARD_OFFSET above anchor top

    setPosition({ top, left })
  }, [])

  const handleMouseEnter = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    computePosition()
    timerRef.current = setTimeout(() => {
      computePosition() // re-compute in case page scrolled during delay
      setVisible(true)
    }, DELAY_MS)
  }, [computePosition])

  const handleMouseLeave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setVisible(false), HIDE_MS)
  }, [])

  // Clean up timer on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const card = (
    <span
      role="tooltip"
      aria-hidden="true"
      style={{
        position:  'absolute',
        top:       position.top,
        left:      position.left,
        width:     220,
        zIndex:    99999,
        pointerEvents: 'none',
        transform: visible ? 'translateY(-8px)' : 'translateY(0px)',
        opacity:   visible ? 1 : 0,
        transition: visible
          ? 'opacity 0.22s ease, transform 0.22s cubic-bezier(0.34,1.56,0.64,1)'
          : 'opacity 0.12s ease, transform 0.12s ease',
      }}
    >
      {/* Arrow pointing down */}
      <span
        style={{
          position: 'absolute',
          bottom: -6,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '7px solid transparent',
          borderRight: '7px solid transparent',
          borderTop: '7px solid rgba(45,27,105,0.95)',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
        }}
      />
      {/* Card body */}
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '9px 14px',
          borderRadius: 12,
          background: 'linear-gradient(135deg, rgba(21,13,46,0.98) 0%, rgba(15,10,30,0.98) 100%)',
          border: '1px solid rgba(124,58,237,0.45)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.55), 0 0 16px rgba(124,58,237,0.18), inset 0 1px 0 rgba(168,85,247,0.08)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        {icon && (
          <span style={{ color: '#A855F7', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
            {icon}
          </span>
        )}
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: '#C4B5FD',
            lineHeight: 1.4,
            fontFamily: 'Inter, system-ui, sans-serif',
            letterSpacing: '0.01em',
          }}
        >
          {label}
        </span>
      </span>
    </span>
  )

  return (
    <>
      <span
        ref={anchorRef}
        className={className}
        style={{ display: 'contents' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </span>

      {/* Render the card into a portal so it escapes overflow:hidden parents */}
      {mounted && createPortal(card, document.body)}
    </>
  )
}
