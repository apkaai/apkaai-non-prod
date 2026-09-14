/**
 * ComingSoonWatermark — animated right-to-left diagonal watermark
 *
 * Architecture:
 *  • 5 rows, each offset vertically and horizontally so the diagonal tiles
 *    cover the entire viewport at all times.
 *  • Each row contains TWO identical strips of repeated text placed end-to-end.
 *    Strip-A animates from x=0 → x=-100%.  The moment it exits left, Strip-B
 *    (already starting at x=+100%) takes over — giving a perfectly seamless loop.
 *  • overflow:hidden on the container stops any horizontal scrollbar.
 *  • pointer-events:none + z-index:10 keeps it behind interactive UI.
 *  • Works in dark mode and light mode via separate opacity values.
 */

/* How many "COMING SOON •" copies per strip — enough to fill any screen width */
const COPIES = 6
const PHRASE = 'COMING SOON  •  '

const ROWS = [
  { top: '5%',  offsetX: '0%',    dur: '22s', delay: '0s'    },
  { top: '23%', offsetX: '-8%',   dur: '28s', delay: '-6s'   },
  { top: '41%', offsetX: '-4%',   dur: '20s', delay: '-10s'  },
  { top: '59%', offsetX: '-12%',  dur: '25s', delay: '-3s'   },
  { top: '77%', offsetX: '-6%',   dur: '30s', delay: '-15s'  },
]

const STRIP = Array.from({ length: COPIES }, () => PHRASE).join('')

const baseStyle: React.CSSProperties = {
  display: 'inline-block',
  whiteSpace: 'nowrap',
  fontSize: '2.2rem',
  fontWeight: 800,
  letterSpacing: '0.18em',
  fontFamily: 'Inter, system-ui, sans-serif',
  userSelect: 'none',
  willChange: 'transform',
}

export default function ComingSoonWatermark() {
  return (
    <>
      {/* ── Container ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        {ROWS.map((row, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: row.top,
              left: 0,
              right: 0,
              /* Rotate the whole row so the text is diagonal */
              transform: `translateX(${row.offsetX}) rotate(-25deg)`,
              transformOrigin: 'center center',
              display: 'flex',
              overflow: 'visible',
            }}
          >
            {/* Strip A — starts at x:0, moves to x:-100% */}
            <span
              className="wm-strip"
              style={{
                ...baseStyle,
                animationDuration: row.dur,
                animationDelay: row.delay,
              }}
            >
              {STRIP}
            </span>
            {/* Strip B — starts at x:+100%, moves to x:0  (seamless follow-up) */}
            <span
              className="wm-strip"
              style={{
                ...baseStyle,
                animationDuration: row.dur,
                animationDelay: row.delay,
                position: 'absolute',
                left: '100%',
              }}
            >
              {STRIP}
            </span>
          </div>
        ))}
      </div>

      {/* ── Keyframes + colour variants ── */}
      <style>{`
        /* Right → Left marquee: each strip travels exactly one full width */
        @keyframes wmScroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-100%); }
        }

        .wm-strip {
          animation-name: wmScroll;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          animation-fill-mode: none;
        }

        /* Dark mode colour */
        html:not(.light-mode) .wm-strip {
          color: rgba(168, 85, 247, 0.07);
        }

        /* Light mode colour */
        html.light-mode .wm-strip {
          color: rgba(109, 40, 217, 0.05);
        }

        /* Prevent horizontal scroll on the page body caused by the strips */
        body { overflow-x: hidden; }
      `}</style>
    </>
  )
}
