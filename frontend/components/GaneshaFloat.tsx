'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

// Expiry: 25 Sep 2026 12:00 PM IST = UTC 06:30
const EXPIRY_UTC = new Date('2026-09-25T06:30:00Z').getTime()

export default function GaneshaFloat() {
  const router = useRouter()
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Only show if before expiry
    if (Date.now() < EXPIRY_UTC) {
      setShow(true)
    }
    // Re-check every minute
    const id = setInterval(() => {
      if (Date.now() >= EXPIRY_UTC) {
        setShow(false)
        clearInterval(id)
      }
    }, 60_000)
    return () => clearInterval(id)
  }, [])

  if (!show) return null

  return (
    <button
      onClick={() => router.push('/ganesh-chaturthi')}
      aria-label="Happy Ganesh Chaturthi — Click to celebrate!"
      title="Happy Ganesh Chaturthi 🙏"
      style={{
        position: 'fixed',
        bottom: '100px',       /* above the chatbot/social widget bar */
        left: '20px',
        zIndex: 9998,
        background: 'linear-gradient(135deg, rgba(255,140,0,0.15), rgba(156,39,176,0.15))',
        border: '2px solid rgba(255,215,0,0.5)',
        borderRadius: '50%',
        width: 60,
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
        animation: 'ganeshaGlow 2s ease-in-out infinite',
        boxShadow: '0 0 20px rgba(255,215,0,0.4), 0 0 40px rgba(255,140,0,0.2)',
        transition: 'transform 0.2s ease',
      }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.15)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
    >
      {/* Pulsing ring */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: -4,
          borderRadius: '50%',
          border: '2px solid rgba(255,215,0,0.3)',
          animation: 'ganeshaPing 2s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />
      <Image
        src="/ganesha.png"
        alt="Lord Ganesha"
        width={48}
        height={48}
        className="rounded-full object-cover"
        style={{ width: 48, height: 48 }}
        priority
      />

      <style>{`
        @keyframes ganeshaGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(255,215,0,0.4), 0 0 40px rgba(255,140,0,0.2); }
          50%       { box-shadow: 0 0 30px rgba(255,215,0,0.7), 0 0 60px rgba(255,140,0,0.4); }
        }
        @keyframes ganeshaPing {
          0%   { transform: scale(1);   opacity: 0.7; }
          80%  { transform: scale(1.6); opacity: 0;   }
          100% { transform: scale(1.6); opacity: 0;   }
        }
      `}</style>
    </button>
  )
}
