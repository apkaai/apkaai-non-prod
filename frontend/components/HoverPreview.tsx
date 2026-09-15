'use client'

/**
 * HoverPreview — single global tooltip rendered via portal.
 *
 * DIAGNOSIS OF PREVIOUS FAILURES:
 *
 * 1. display:contents  → getBoundingClientRect() returns {0,0,0,0}, card lands at top-left
 * 2. display:inline-block + fixed positioning → coords measured before paint/hydration,
 *    returns {0,0}; also the Navbar's backdrop-blur creates a new stacking context
 *    that breaks fixed children inside it
 * 3. CSS position:relative+absolute → Navbar has overflow clipping from backdrop-blur-xl,
 *    the absolute card gets clipped and appears at the container origin (top-left)
 *
 * CORRECT APPROACH:
 * - Single global <div id="hp-portal"> appended to <body> (outside all stacking contexts)
 * - position:fixed on the card (viewport-relative, never clipped)
 * - Coords measured inside requestAnimationFrame so the DOM is fully painted
 * - A data attribute on the trigger element lets the global listener find the anchor
 * - No wrapper span at all — events attached directly via onMouseEnter/onMouseLeave props
 *   cloned onto the child via React.cloneElement
 */

import React, {
  ReactNode, useEffect, useRef, useState, useCallback, useId,
} from 'react'
import { createPortal } from 'react-dom'

interface HoverPreviewProps {
  label: string
  icon?: ReactNode
  children: ReactNode
}

const SHOW_DELAY = 260  // ms
const CARD_WIDTH = 220  // px — used for viewport clamping

export default function HoverPreview({ label, icon, children }: HoverPreviewProps) {
  // Unique id so each instance manages its own tooltip independently
  const uid = useId()

  const anchorRef = useRef<HTMLElement | null>(null)
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafId     = useRef<number | null>(null)

  const [mounted,  setMounted]  = useState(false)
  const [visible,  setVisible]  = useState(false)
  const [coords,   setCoords]   = useState<{ top: number; left: number; below: boolean } | null>(null)

  useEffect(() => { setMounted(true) }, [])

  const clearAll = useCallback(() => {
    if (showTimer.current) clearTimeout(showTimer.current)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    if (rafId.current)     cancelAnimationFrame(rafId.current)
  }, [])

  useEffect(() => () => clearAll(), [clearAll])

  /** Measure the anchor inside rAF so the DOM is guaranteed painted */
  const measure = useCallback(() => {
    rafId.current = requestAnimationFrame(() => {
      if (!anchorRef.current) return
      const r = anchorRef.current.getBoundingClientRect()

      // If the element has no size yet, bail (prevents top-left flash)
      if (r.width === 0 && r.height === 0) return

      const CARD_H     = 44
      const spaceBelow = window.innerHeight - r.bottom
      const below      = spaceBelow >= CARD_H + 12

      const idealLeft = r.left + r.width / 2 - CARD_WIDTH / 2
      const left = Math.max(8, Math.min(idealLeft, window.innerWidth - CARD_WIDTH - 8))
      const top  = below ? r.bottom + 8 : r.top - CARD_H - 8

      setCoords({ top, left, below })
    })
  }, [])

  const handleEnter = useCallback((e: React.MouseEvent) => {
    // Store the actual DOM element that fired the event
    anchorRef.current = e.currentTarget as HTMLElement
    clearAll()
    measure()
    showTimer.current = setTimeout(() => {
      measure()
      setVisible(true)
    }, SHOW_DELAY)
  }, [clearAll, measure])

  const handleLeave = useCallback(() => {
    clearAll()
    hideTimer.current = setTimeout(() => {
      setVisible(false)
      setCoords(null)
    }, 60)
  }, [clearAll])

  // Clone the single child to attach our mouse events
  // We do NOT wrap in any extra element — the child IS the anchor
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const child = React.Children.only(children) as React.ReactElement<any>
  const augmented = React.cloneElement(child, {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      handleEnter(e)
      child.props.onMouseEnter?.(e)
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      handleLeave()
      child.props.onMouseLeave?.(e)
    },
  })

  // The portal card — only rendered when we have real coords
  const card = mounted && coords ? createPortal(
    <div
      aria-hidden="true"
      style={{
        /* FIXED positioning — always relative to viewport, never clipped by parents */
        position:   'fixed',
        top:        coords.top,
        left:       coords.left,
        width:      CARD_WIDTH,
        zIndex:     2147483647,      // max z-index
        pointerEvents: 'none',

        /* Fade + slide animation — using inline style, NOT overridden by globals.css */
        opacity:   visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : coords.below ? 'translateY(-6px)' : 'translateY(6px)',

        /*
         * Use a specific property list to avoid the globals.css wildcard:
         *   * { transition-property: background-color, border-color, color, fill, stroke }
         * That rule does NOT include opacity/transform, so these transitions will work.
         */
        transitionProperty:       'opacity, transform',
        transitionDuration:       visible ? '0.2s, 0.22s' : '0.12s, 0.12s',
        transitionTimingFunction: 'ease, cubic-bezier(0.34,1.56,0.64,1)',
      }}
    >
      {/* Arrow */}
      <div style={{
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 0, height: 0,
        ...(coords.below ? {
          top: -6,
          borderLeft:  '6px solid transparent',
          borderRight: '6px solid transparent',
          borderBottom:'6px solid #2D1B69',
        } : {
          bottom: -6,
          borderLeft: '6px solid transparent',
          borderRight:'6px solid transparent',
          borderTop:  '6px solid #2D1B69',
        }),
      }} />

      {/* Card */}
      <div style={{
        display:         'flex',
        alignItems:      'center',
        gap:             8,
        padding:         '8px 13px',
        borderRadius:    10,
        background:      'linear-gradient(135deg,#150D2E 0%,#0F0A1E 100%)',
        border:          '1px solid rgba(124,58,237,0.55)',
        boxShadow:       '0 8px 28px rgba(0,0,0,0.6),0 0 16px rgba(124,58,237,0.2)',
        backdropFilter:  'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
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
          fontFamily:  'Inter,system-ui,sans-serif',
          whiteSpace:  'nowrap',
        }}>
          {label}
        </span>
      </div>
    </div>,
    document.body,
  ) : null

  return (
    <>
      {augmented}
      {card}
    </>
  )
}
