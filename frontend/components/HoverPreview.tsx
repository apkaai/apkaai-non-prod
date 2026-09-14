'use client'

/**
 * HoverPreview — shows a small tooltip card below (or above) a button on hover.
 *
 * KEY FIX: uses `position: fixed` + raw getBoundingClientRect() values.
 * No scrollY offset needed — fixed positioning is always relative to the viewport.
 *
 * Usage:
 *   <HoverPreview label="Browse all 43 AI tools">
 *     <Link href="/tools" ...>Explore Tools</Link>
 *   </HoverPreview>
 */

import React, {
  useRef, useState, useEffect, useCallback, ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

interface HoverPreviewProps {
  label: string
  icon?: ReactNode
  children: ReactNode
  className?: string
}

const SHOW_DELAY  = 250   // ms before card appears
const HIDE_DELAY  = 60    // ms before card disappears
const GAP         = 10    // px gap between button bottom and card top
const CARD_WIDTH  = 230   // px — estimated card width for clamping

export default function HoverPreview({ label, icon, children, className }: HoverPreviewProps) {
  const wrapRef  = useRef<HTMLSpanElement>(null)
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [visible,  setVisible]  = useState(false)
  const [coords,   setCoords]   = useState({ top: 0, left: 0, below: true })
  const [mounted,  setMounted]  = useState(false)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => () => {
    if (showTimer.current) clearTimeout(showTimer.current)
    if (hideTimer.current) clearTimeout(hideTimer.current)
  }, [])

  /** Compute fixed-position coords centered below (or above) the anchor */
  const computeCoords = useCallback(() => {
    if (!wrapRef.current) return
    const rect = wrapRef.current.getBoundingClientRect()

    // Horizontal: center the card under the button, clamped to viewport
    const idealLeft = rect.left + rect.width / 2 - CARD_WIDTH / 2
    const clampedLeft = Math.max(8, Math.min(idealLeft, window.innerWidth - CARD_WIDTH - 8))

    // Vertical: prefer below, fall back to above if not enough room
    const spaceBelow = window.innerHeight - rect.bottom
    const cardHeight = 48 // rough estimate
    const below = spaceBelow >= cardHeight + GAP + 8

    const top = below
      ? rect.bottom + GAP          // below the button
      : rect.top  - cardHeight - GAP // above the button

    setCoords({ top, left: clampedLeft, below })
  }, [])

  const handleMouseEnter = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    computeCoords()
    showTimer.current = setTimeout(() => {
      computeCoords() // re-measure in case layout shifted during delay
      setVisible(true)
    }, SHOW_DELAY)
  }, [computeCoords])

  const handleMouseLeave = useCallback(() => {
    if (showTimer.current) clearTimeout(showTimer.current)
    hideTimer.current = setTimeout(() => setVisible(false), HIDE_DELAY)
  }, [])

  // The tooltip card — rendered via portal into <body>
  const card = mounted ? createPortal(
    <span
      role="tooltip"
      aria-hidden="true"
      style={{
        /* ── positioning ── */
        position:   'fixed',
        top:        coords.top,
        left:       coords.left,
        width:      CARD_WIDTH,
        zIndex:     999999,

        /* ── never intercept clicks ── */
        pointerEvents: 'none',

        /* ── animation ── */
        opacity:   visible ? 1 : 0,
        transform: visible
          ? 'translateY(0px)'
          : coords.below ? 'translateY(-6px)' : 'translateY(6px)',
        transition: visible
          ? 'opacity 0.2s ease, transform 0.2s cubic-bezier(0.34,1.56,0.64,1)'
          : 'opacity 0.1s ease, transform 0.1s ease',
      }}
    >
      {/* Arrow */}
      <span style={{
        position:  'absolute',
        left:      '50%',
        transform: 'translateX(-50%)',
        width:     0, height: 0,
        ...(coords.below ? {
          top:         -6,
          borderLeft:  '7px solid transparent',
          borderRight: '7px solid transparent',
          borderBottom:'7px solid rgba(45,27,105,0.97)',
        } : {
          bottom:      -6,
          borderLeft:  '7px solid transparent',
          borderRight: '7px solid transparent',
          borderTop:   '7px solid rgba(45,27,105,0.97)',
        }),
      }} />

      {/* Card body */}
      <span style={{
        display:         'flex',
        alignItems:      'center',
        gap:             8,
        padding:         '9px 14px',
        borderRadius:    12,
        background:      'linear-gradient(135deg,rgba(21,13,46,0.98) 0%,rgba(15,10,30,0.98) 100%)',
        border:          '1px solid rgba(124,58,237,0.5)',
        boxShadow:       '0 8px 32px rgba(0,0,0,0.6),0 0 18px rgba(124,58,237,0.2)',
        backdropFilter:  'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}>
        {icon && (
          <span style={{ color:'#A855F7', flexShrink:0, display:'flex', alignItems:'center' }}>
            {icon}
          </span>
        )}
        <span style={{
          fontSize:    12,
          fontWeight:  500,
          color:       '#C4B5FD',
          lineHeight:  1.4,
          fontFamily:  'Inter, system-ui, sans-serif',
          letterSpacing: '0.01em',
          whiteSpace:  'nowrap',
          overflow:    'hidden',
          textOverflow:'ellipsis',
          maxWidth:    CARD_WIDTH - 40,
        }}>
          {label}
        </span>
      </span>
    </span>,
    document.body,
  ) : null

  return (
    <>
      <span
        ref={wrapRef}
        className={className}
        style={{ display: 'contents' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </span>
      {card}
    </>
  )
}
