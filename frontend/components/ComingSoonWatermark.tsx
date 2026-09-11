/**
 * ComingSoonWatermark
 * ─────────────────────────────────────────────────────────────────────────────
 * A fixed, full-viewport repeating diagonal watermark rendered on every page.
 *
 * Design decisions:
 *  • position: fixed  — covers the viewport regardless of scroll
 *  • z-index: 10      — above page background / stars (z:0–1) but below
 *                       navbar (z:50), modals, and all interactive UI (z:9999+)
 *  • pointer-events: none  — clicks pass straight through
 *  • SVG pattern tile  — crisp at all resolutions, zero layout impact
 *  • Works in both dark and light mode via separate fill colours
 */
export default function ComingSoonWatermark() {
  return (
    <>
      {/* ── Dark-mode watermark (default) ────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="html-light-hidden"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="100%"
          height="100%"
          style={{ position: 'absolute', inset: 0 }}
        >
          <defs>
            <pattern
              id="wm-dark"
              x="0"
              y="0"
              width="420"
              height="200"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(-35)"
            >
              <text
                x="10"
                y="120"
                fontSize="38"
                fontFamily="Inter, system-ui, sans-serif"
                fontWeight="700"
                letterSpacing="8"
                fill="rgba(168,85,247,0.07)"
                style={{ userSelect: 'none' }}
              >
                COMING SOON
              </text>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#wm-dark)" />
        </svg>
      </div>

      {/* ── Light-mode watermark ──────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="html-light-show"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10,
          pointerEvents: 'none',
          overflow: 'hidden',
          display: 'none',          /* toggled by CSS below */
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="100%"
          height="100%"
          style={{ position: 'absolute', inset: 0 }}
        >
          <defs>
            <pattern
              id="wm-light"
              x="0"
              y="0"
              width="420"
              height="200"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(-35)"
            >
              <text
                x="10"
                y="120"
                fontSize="38"
                fontFamily="Inter, system-ui, sans-serif"
                fontWeight="700"
                letterSpacing="8"
                fill="rgba(109,40,217,0.06)"
                style={{ userSelect: 'none' }}
              >
                COMING SOON
              </text>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#wm-light)" />
        </svg>
      </div>
    </>
  )
}
