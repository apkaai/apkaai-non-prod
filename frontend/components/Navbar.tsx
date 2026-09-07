'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Menu, X, Search, BarChart3 } from 'lucide-react'
import Image from 'next/image'

const navLinks = [
  { label: 'All Tools',  href: '/tools' },
  { label: 'Categories', href: '/tools#categories' },
  { label: 'Compare',    href: '/compare' },
  { label: 'Pricing',    href: '/pricing' },
  { label: 'Blog',       href: '/blog' },
  { label: 'Contact',    href: '/contact' },
]

export default function Navbar() {
  const router                      = useRouter()
  const [open, setOpen]             = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery]           = useState('')
  const searchInputRef              = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [searchOpen])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    setSearchOpen(false)
    setQuery('')
    router.push(`/tools?search=${encodeURIComponent(q)}`)
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-purple-900/30 backdrop-blur-xl bg-[#08051A]/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

        {/* Logo — uses the PNG/SVG image file, no SVG code in component */}
        <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
          <div className="group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
            <Image
              src="/apkaai-logo.png"
              alt="ApkaAI Logo"
              width={36}
              height={36}
              priority
              className="rounded-lg"
            />
          </div>
          <span className="text-xl font-extrabold text-white tracking-tight">
            apka<span className="text-purple-400">AI</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map(link => (
            <Link key={link.href} href={link.href}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                link.label === 'Compare'
                  ? 'text-purple-300 hover:text-white hover:bg-purple-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-purple-900/20'
              }`}>
              {link.label === 'Compare' && <BarChart3 className="w-3.5 h-3.5" />}
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSearchOpen(prev => !prev)}
            aria-label="Search AI tools"
            className={`p-2 rounded-lg transition-all ${
              searchOpen ? 'text-white bg-purple-700/40' : 'text-slate-400 hover:text-white hover:bg-purple-900/30'
            }`}
          >
            {searchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
          </button>

          <Link href="/signin" className="hidden sm:inline-flex items-center text-slate-300 hover:text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-purple-900/20 transition-all">
            Sign In
          </Link>
          <Link href="/signup" className="hidden sm:inline-flex btn-primary text-white text-sm font-semibold px-4 py-2 rounded-lg">
            Sign Up
          </Link>

          <button className="lg:hidden p-2 text-slate-400 hover:text-white"
            onClick={() => setOpen(!open)} aria-label="Open menu">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="border-t border-purple-900/30 bg-[#0D0826] px-4 py-3 shadow-lg">
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search AI tools (e.g. ChatGPT, Midjourney, Cursor...)"
                className="w-full bg-purple-950/50 border border-purple-700/50 rounded-xl pl-11 pr-24 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
              />
              <button type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary text-white text-xs font-bold px-4 py-1.5 rounded-lg">
                Search
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mobile Menu */}
      {open && (
        <div className="lg:hidden border-t border-purple-900/30 bg-[#0F0A1E] px-4 py-4 space-y-1">
          {navLinks.map(link => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 text-slate-300 hover:text-white hover:bg-purple-900/30 rounded-lg transition-colors text-sm font-medium">
              {link.label === 'Compare' && <BarChart3 className="w-4 h-4 text-purple-400" />}
              {link.label}
            </Link>
          ))}
          <div className="pt-3 border-t border-purple-900/30 grid grid-cols-2 gap-2">
            <Link href="/signin" onClick={() => setOpen(false)}
              className="text-center border border-purple-700/40 text-slate-300 text-sm font-semibold px-4 py-2.5 rounded-lg hover:border-purple-500 hover:text-white transition-all">
              Sign In
            </Link>
            <Link href="/signup" onClick={() => setOpen(false)}
              className="btn-primary text-center text-white text-sm font-semibold px-4 py-2.5 rounded-lg">
              Sign Up
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
