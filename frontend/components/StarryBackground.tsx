'use client'
import { useEffect, useRef } from 'react'

interface Star {
  x: number
  y: number
  size: number
  speed: number          // right-to-left speed (always positive)
  driftY: number         // tiny vertical wobble
  opacity: number
  opacityDir: number
  opacitySpeed: number
  glow: number
}

export default function StarryBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let stars: Star[] = []
    let W = 0
    let H = 0

    function resize() {
      if (!canvas) return
      W = window.innerWidth
      H = document.documentElement.scrollHeight
      canvas.width  = W
      canvas.height = H
      initStars()
    }

    function initStars() {
      // ~1 star per 4500px² for a denser field
      const count = Math.floor((W * H) / 4500)
      stars = []
      for (let i = 0; i < count; i++) {
        stars.push(makeStar(true))
      }
    }

    // randomStart=true on init so stars are distributed across the whole canvas
    function makeStar(randomStart = false): Star {
      const tier = Math.random()
      let size: number
      let glow: number
      let speed: number

      if (tier > 0.96) {
        // large bright stars (4%)
        size  = 2.8 + Math.random() * 1.6
        glow  = 4 + Math.random() * 4
        speed = 0.25 + Math.random() * 0.25
      } else if (tier > 0.82) {
        // medium stars (14%)
        size  = 1.6 + Math.random() * 1.0
        glow  = 2 + Math.random() * 3
        speed = 0.15 + Math.random() * 0.20
      } else {
        // small stars (82%)
        size  = 0.7 + Math.random() * 0.9
        glow  = 1 + Math.random() * 1.5
        speed = 0.08 + Math.random() * 0.15
      }

      return {
        x: randomStart ? Math.random() * W : W + size + glow + 5,
        y: Math.random() * H,
        size,
        speed,
        driftY: (Math.random() - 0.5) * 0.04,   // gentle vertical float
        opacity: 0.5 + Math.random() * 0.5,
        opacityDir: Math.random() > 0.5 ? 1 : -1,
        opacitySpeed: 0.003 + Math.random() * 0.007,
        glow,
      }
    }

    function draw() {
      if (!canvas || !ctx) return
      ctx.clearRect(0, 0, W, H)

      for (const s of stars) {
        // Move right → left
        s.x -= s.speed
        s.y += s.driftY

        // When a star exits the left edge, respawn it on the right
        if (s.x < -(s.size + s.glow + 5)) {
          const fresh = makeStar(false)
          s.x           = fresh.x
          s.y           = fresh.y
          s.size        = fresh.size
          s.speed       = fresh.speed
          s.driftY      = fresh.driftY
          s.glow        = fresh.glow
          s.opacity     = fresh.opacity
          s.opacityDir  = fresh.opacityDir
          s.opacitySpeed = fresh.opacitySpeed
        }

        // Wrap vertical edges
        if (s.y < -5) s.y = H + 5
        if (s.y > H + 5) s.y = -5

        // Twinkle
        s.opacity += s.opacityDir * s.opacitySpeed
        if (s.opacity >= 1)    { s.opacity = 1;    s.opacityDir = -1 }
        if (s.opacity <= 0.35) { s.opacity = 0.35; s.opacityDir =  1 }

        // ── Outer glow halo (tighter, rounder) ──────────────────────────
        const r = s.size + s.glow * 0.5   // tighter halo radius
        const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r)
        grad.addColorStop(0,    `rgba(255,255,255,${s.opacity})`)
        grad.addColorStop(0.35, `rgba(220,170,255,${s.opacity * 0.7})`)
        grad.addColorStop(0.7,  `rgba(140,80,255,${s.opacity * 0.25})`)
        grad.addColorStop(1,    `rgba(80,30,180,0)`)

        ctx.beginPath()
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()

        // ── Crisp round core (larger, fully opaque) ──────────────────────
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size * 0.85, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${Math.min(s.opacity + 0.3, 1)})`
        ctx.fill()
      }

      animId = requestAnimationFrame(draw)
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(document.documentElement)
    window.addEventListener('resize', resize)

    resize()
    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
      resizeObserver.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  )
}
