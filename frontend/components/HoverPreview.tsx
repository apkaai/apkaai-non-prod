'use client'

/**
 * HoverPreview — CSS-only tooltip anchored directly to the wrapper element.
 *
 * HOW IT WORKS:
 *   • The wrapper <span> is position:relative
 *   • The tooltip card is position:absolute, top:100%, left:50%
 *   • This guarantees the card always appears directly BELOW the hovered element
 *   • Zero JavaScript positioning — no getBoundingClientRect needed at all
 *   • CSS transition handles the fade-in / slide-down
 *   • A 250ms CSS transition-delay replaces the JS timer
 */

import React, { ReactNode } from 'react'

interface HoverPreviewProps {
  label: string
  icon?: ReactNode
  children: ReactNode
  className?: string
}

const CARD_STYLE: React.CSSProperties = {
  /* positioning — anchored below the wrapper */
  position:       'absolute',
  top:            'calc(100% + 10px)',   /* 10px gap below the button */
  left:           '50%',
  transform:      'translateX(-50%) translateY(4px)',
  zIndex:         99999,

  /* sizing */
  width:          'max-content',
  maxWidth:       240,
  minWidth:       140,

  /* never block clicks on the button */
  pointerEvents:  'none',

  /* hidden by default */
  opacity:        0,
  visibility:     'hidden',

  /* animation */
  transition:     'opacity 0.18s ease, transform 0.2s ease, visibility 0s linear 0.18s',
  transitionDelay:'0s',          /* overridden on :hover via CSS class */
}

const CARD_VISIBLE_STYLE: React.CSSProperties = {
  opacity:            1,
  visibility:         'visible',
  transform:          'translateX(-50%) translateY(0px)',
  transition:         'opacity 0.18s ease 0.25s, transform 0.2s ease 0.25s, visibility 0s linear 0.25s',
}

const INNER_STYLE: React.CSSProperties = {
  display:              'flex',
  alignItems:           'center',
  gap:                  7,
  padding:              '8px 13px',
  borderRadius:         10,
  background:           'linear-gradient(135deg,rgba(21,13,46,0.98) 0%,rgba(15,10,30,0.98) 100%)',
  border:               '1px solid rgba(124,58,237,0.55)',
  boxShadow:            '0 8px 28px rgba(0,0,0,0.55), 0 0 16px rgba(124,58,237,0.18)',
  backdropFilter:       'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  whiteSpace:           'nowrap',
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize:     12,
  fontWeight:   500,
  color:        '#C4B5FD',
  lineHeight:   1.4,
  fontFamily:   'Inter,system-ui,sans-serif',
  letterSpacing:'0.01em',
}

const ARROW_STYLE: React.CSSProperties = {
  position:    'absolute',
  top:          -6,
  left:         '50%',
  transform:    'translateX(-50%)',
  width:         0,
  height:        0,
  borderLeft:   '6px solid transparent',
  borderRight:  '6px solid transparent',
  borderBottom: '6px solid rgba(45,27,105,0.97)',
}

export default function HoverPreview({ label, icon, children, className = '' }: HoverPreviewProps) {
  return (
    <>
      {/* Inject the hover CSS once via a <style> tag */}
      <style>{`
        .hp-wrap { position: relative; display: inline-block; }
        .hp-wrap:hover .hp-card {
          opacity: 1 !important;
          visibility: visible !important;
          transform: translateX(-50%) translateY(0px) !important;
          transition: opacity 0.18s ease 0.25s,
                      transform 0.2s cubic-bezier(0.34,1.56,0.64,1) 0.25s,
                      visibility 0s linear 0.25s !important;
        }
      `}</style>

      <span className={`hp-wrap ${className}`}>
        {children}

        {/* Tooltip card — always in DOM, hidden via CSS */}
        <span className="hp-card" style={CARD_STYLE}>
          {/* Down-pointing arrow */}
          <span style={ARROW_STYLE} />

          {/* Card body */}
          <span style={INNER_STYLE}>
            {icon && (
              <span style={{ color:'#A855F7', flexShrink:0, display:'flex', alignItems:'center' }}>
                {icon}
              </span>
            )}
            <span style={LABEL_STYLE}>{label}</span>
          </span>
        </span>
      </span>
    </>
  )
}
