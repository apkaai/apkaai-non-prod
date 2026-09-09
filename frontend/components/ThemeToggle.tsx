'use client'
import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [theme, setTheme]   = useState<'dark' | 'light'>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('theme') as 'dark' | 'light' | null
    const initial = stored ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    setTheme(initial)
    applyTheme(initial)
    setMounted(true)
  }, [])

  function applyTheme(t: 'dark' | 'light') {
    document.documentElement.classList.toggle('light-mode', t === 'light')
    document.documentElement.classList.toggle('dark-mode',  t === 'dark')
  }

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
    applyTheme(next)
  }

  if (!mounted) return null

  return (
    <button
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-purple-900/30 transition-all text-base leading-none select-none"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}
