'use client'
import { useEffect, useRef } from 'react'

interface Star {
  x: number
  y: number
  size: number
  speedX: number
  speedY: number
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
      // Density: ~1 star per 6000px²  (≈ 300 on a 1920×1080 screen)
      const count = Math.floor((W * H) / 6000)
      stars = []
      for (let i = 0; i < count; i++) {
        stars.push(makeStar())
      }
    }

    function makeStar(): Star {
      const tier = Math.random()
      let size: number
      let glow: number
      if (tier > 0.97) {
        size = 2.4 + Math.random() * 1.2   // large
        glow = 6 + Math.random() * 4
      } else if (tier > 0.85) {
        size = 1.4 + Math.random() * 0.8   // medium
        glow = 3 + Math.random() * 3
      } else {
        size = 0.5 + Math.random() * 0.8   // small
        glow = 1 + Math.random() * 2
      }
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        size,
        speedX: (Math.random() - 0.5) * 0.12,
        speedY: (Math.random() - 0.5) * 0.08,
        opacity: 0.3 + Math.random() * 0.7,
        opacityDir: Math.random() > 0.5 ? 1 : -1,
        opacitySpeed: 0.002 + Math.random() * 0.006,
        glow,
      }
    }

    function draw() {
      if (!canvas || !ctx) return
      ctx.clearRect(0, 0, W, H)

      for (const s of stars) {
        // drift
        s.x += s.speedX
        s.y += s.speedY
        // wrap around edges
        if (s.x < -10) s.x = W + 10
        if (s.x > W + 10) s.x = -10
        if (s.y < -10) s.y = H + 10
        if (s.y > H + 10) s.y = -10
        // twinkle
        s.opacity += s.opacityDir * s.opacitySpeed
        if (s.opacity >= 1)   { s.opacity = 1;   s.opacityDir = -1 }
        if (s.opacity <= 0.15) { s.opacity = 0.15; s.opacityDir =  1 }

        // glow halo
        const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size + s.glow)
        grad.addColorStop(0,   `rgba(220,200,255,${s.opacity})`)
        grad.addColorStop(0.4, `rgba(180,150,255,${s.opacity * 0.5})`)
        grad.addColorStop(1,   `rgba(100,60,200,0)`)
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size + s.glow, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()

        // bright core
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size * 0.5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${s.opacity})`
        ctx.fill()
      }

      animId = requestAnimationFrame(draw)
    }

    // Listen for document height changes (navigation between pages changes scroll height)
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
