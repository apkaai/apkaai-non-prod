'use client'

/**
 * HoverPreview — shows a small tooltip card BELOW (or above) a hovered element.
 *
 * KEY FIX: The wrapper <span> uses display:inline-block so it has a real
 * getBoundingClientRect(). display:contents gives a zero-size rect and
 * causes the card to appear at (0,0) / top-left.
 *
 * Uses position:fixed so coords are always viewport-relative — no scrollY needed.
 */

import React, { useRef, useState, useEffect, useCallback, ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface HoverPreviewProps {
  /** Short description shown in the tooltip */
  label: string
  /** Optional lucide/SVG icon rendered left of the label */
  icon?: ReactNode
  /** The wrapped button / link */
  children: ReactNode
  /** Extra tailwind classes forwarded to the wrapper span */
  className?: string
}

const SHOW_DELAY  = 250   // ms before card appears
const HIDE_DELAY  = 60    // ms before card disappears
const GAP         = 8     // px gap between element edge and card
const CARD_W      = 230   // px — card width (used for clamping)

export default function HoverPreview({ label, icon, children, className = '' }: HoverPreviewProps) {
  const wrapRef   = useRef<HTMLSpanElement>(null)
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [visible, setVisible] = useState(false)
  const [pos,     setPos]     = useState({ top: 0, left: 0, below: true })
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => () => {
    if (showTimer.current) clearTimeout(showTimer.current)
    if (hideTimer.current) clearTimeout(hideTimer.current)
  }, [])

  const measure = useCallback(() => {
    const el = wrapRef.current
    if (!el) return

    const rect = el.getBoundingClientRect()

    // Horizontal: centre the card under the element, clamped inside viewport
    const idealLeft = rect.left + rect.width / 2 - CARD_W / 2
    const left = Math.max(8, Math.min(idealLeft, window.innerWidth - CARD_W - 8))

    // Vertical: prefer below, flip above if not enough room
    const CARD_H     = 44
    const spaceBelow = window.innerHeight - rect.bottom
    const below      = spaceBelow >= CARD_H + GAP + 4

    const top = below
      ? rect.bottom + GAP
      : rect.top - CARD_H - GAP

    setPos({ top, left, below })
  }, [])

  const handleEnter = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    measure()
    showTimer.current = setTimeout(() => {
      measure()          // re-measure after delay in case page scrolled
      setVisible(true)
    }, SHOW_DELAY)
  }, [measure])

  const handleLeave = useCallback(() => {
    if (showTimer.current) clearTimeout(showTimer.current)
    hideTimer.current = setTimeout(() => setVisible(false), HIDE_DELAY)
  }, [])

  const card = mounted ? createPortal(
    <div
      role="tooltip"
      aria-hidden="true"
      style={{
        position:      'fixed',
        top:           pos.top,
        left:          pos.left,
        width:         CARD_W,
        zIndex:        999999,
        pointerEvents: 'none',
        opacity:       visible ? 1 : 0,
        transform:     visible
          ? 'translateY(0)'
          : pos.below ? 'translateY(-5px)' : 'translateY(5px)',
        transition:    visible
          ? 'opacity .2s ease, transform .22s cubic-bezier(.34,1.56,.64,1)'
          : 'opacity .1s ease, transform .1s ease',
      }}
    >
      {/* Arrow pointing toward the button */}
      <div style={{
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 0, height: 0,
        ...(pos.below ? {
          top: -6,
          borderLeft:  '6px solid transparent',
          borderRight: '6px solid transparent',
          borderBottom:'6px solid rgba(45,27,105,0.97)',
        } : {
          bottom: -6,
          borderLeft: '6px solid transparent',
          borderRight:'6px solid transparent',
          borderTop:  '6px solid rgba(45,27,105,0.97)',
        }),
      }} />

      {/* Card */}
      <div style={{
        display:         'flex',
        alignItems:      'center',
        gap:             8,
        padding:         '8px 13px',
        borderRadius:    10,
        background:      'linear-gradient(135deg,rgba(21,13,46,.98) 0%,rgba(15,10,30,.98) 100%)',
        border:          '1px solid rgba(124,58,237,.5)',
        boxShadow:       '0 8px 32px rgba(0,0,0,.55), 0 0 18px rgba(124,58,237,.18)',
        backdropFilter:  'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}>
        {icon && (
          <span style={{ color: '#A855F7', flexShrink: 0, display: 'flex' }}>
            {icon}
          </span>
        )}
        <span style={{
          fontSize:     12,
          fontWeight:   500,
          color:        '#C4B5FD',
          lineHeight:   1.4,
          fontFamily:   'Inter,system-ui,sans-serif',
          whiteSpace:   'nowrap',
          overflow:     'hidden',
          textOverflow: 'ellipsis',
          maxWidth:     CARD_W - 38,
        }}>
          {label}
        </span>
      </div>
    </div>,
    document.body,
  ) : null

  return (
    <>
      {/*
        ─── CRITICAL ──────────────────────────────────────────────────────────
        Use display:inline-block (NOT display:contents).
        display:contents has no layout box, so getBoundingClientRect() returns
        all zeros and the card ends up at the top-left corner of the page.
        inline-block wraps tightly around the child and gives us a real rect.
        ───────────────────────────────────────────────────────────────────────
      */}
      <span
        ref={wrapRef}
        className={className}
        style={{ display: 'inline-block', lineHeight: 'inherit' }}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        {children}
      </span>
      {card}
    </>
  )
}
