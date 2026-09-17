'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Menu, X, Search, BarChart3, User, LogOut, Settings, ChevronDown, Cloud, ShoppingCart } from 'lucide-react'
import ThemeToggle from '@/components/ThemeToggle'
import HoverPreview from '@/components/HoverPreview'
import { useCart } from '@/lib/cart-context'

const navLinks = [
  { label: 'All Tools',  href: '/tools' },
  { label: 'Categories', href: '/tools#categories' },
  { label: 'Compare',    href: '/compare' },
  { label: 'Pricing',    href: '/pricing' },
  { label: 'Blog',       href: '/blog' },
  { label: 'Contact',    href: '/contact' },
  { label: 'Cloud',      href: '/cloud' },
]

// ── Auth helpers ───────────────────────────────────────────────────────────────
function getUser() {
  if (typeof window === 'undefined') return null
  try {
    const u = localStorage.getItem('apkaai_user') || sessionStorage.getItem('apkaai_user')
    return u ? JSON.parse(u) : null
  } catch { return null }
}

function signOut() {
  localStorage.removeItem('apkaai_token')
  localStorage.removeItem('apkaai_user')
  sessionStorage.removeItem('apkaai_token')
  sessionStorage.removeItem('apkaai_user')
  window.location.href = '/'
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function Navbar() {
  const router                      = useRouter()
  const [open, setOpen]             = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery]           = useState('')
  const [user, setUser]             = useState<{ name: string; email: string; role?: string } | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const searchInputRef              = useRef<HTMLInputElement>(null)
  const profileRef                  = useRef<HTMLDivElement>(null)
  const { itemCount, toggleDrawer } = useCart()

  // Load user from storage on mount
  useEffect(() => {
    setUser(getUser())
    // Listen for storage changes (login/logout in other tab)
    const handler = () => setUser(getUser())
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (searchOpen && searchInputRef.current) searchInputRef.current.focus()
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

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
          <div className="group-hover:scale-105 transition-transform duration-200">
            <Image src="/apkaai-logo.png" alt="ApkaAI Logo" width={34} height={34} priority className="rounded-lg" />
          </div>
          <span className="text-xl font-extrabold text-white tracking-tight">
            apka<span className="text-purple-400">AI</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map(link => (
            <HoverPreview
              key={link.href}
              label={
                link.label === 'All Tools'  ? 'View all 70 AI tools' :
                link.label === 'Categories' ? 'Browse tools by category' :
                link.label === 'Compare'    ? 'Compare AI tools side by side' :
                link.label === 'Pricing'    ? 'See pricing plans in INR' :
                link.label === 'Blog'       ? 'Read AI tips and guides' :
                link.label === 'Contact'    ? 'Get in touch with us' :
                link.label === 'Cloud'      ? 'Compare cloud costs & calculate bills' :
                link.label
              }
            >
              <Link key={link.href} href={link.href}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                  link.label === 'Compare' ? 'text-purple-300 hover:text-white hover:bg-purple-900/30' :
                  link.label === 'Cloud'   ? 'text-sky-300 hover:text-white hover:bg-sky-900/20' :
                  'text-slate-400 hover:text-white hover:bg-purple-900/20'
                }`}>
                {link.label === 'Compare' && <BarChart3 className="w-3.5 h-3.5" />}
                {link.label === 'Cloud'   && <Cloud className="w-3.5 h-3.5" />}
                {link.label}
              </Link>
            </HoverPreview>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Cart */}
          <HoverPreview label="Your cart" icon={<ShoppingCart className="w-3.5 h-3.5" />}>
            <button
              onClick={toggleDrawer}
              aria-label={`Cart${itemCount > 0 ? ` (${itemCount} items)` : ''}`}
              className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-purple-900/30 transition-all"
            >
              <ShoppingCart className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </button>
          </HoverPreview>

          {/* Search */}
          <HoverPreview label="Search across all 70 AI tools" icon={<Search className="w-3.5 h-3.5" />}>
            <button onClick={() => setSearchOpen(p => !p)} aria-label="Search"
              className={`p-2 rounded-lg transition-all ${searchOpen ? 'text-white bg-purple-700/40' : 'text-slate-400 hover:text-white hover:bg-purple-900/30'}`}>
              {searchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
            </button>
          </HoverPreview>

          {/* ── Signed IN — show user avatar + dropdown ── */}
          {user ? (
            <div className="relative hidden sm:block" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(p => !p)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-purple-700/40 hover:border-purple-500 bg-purple-950/20 hover:bg-purple-900/30 transition-all"
              >
                {/* Avatar circle with initials */}
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-violet-700 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">{getInitials(user.name)}</span>
                </div>
                <span className="text-white text-sm font-medium max-w-[100px] truncate">{user.name.split(' ')[0]}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown */}
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[#0F0A1E] border border-purple-800/40 rounded-2xl shadow-glow-md overflow-hidden z-50">
                  {/* User info header */}
                  <div className="px-4 py-3 border-b border-purple-900/30">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-violet-700 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm font-bold">{getInitials(user.name)}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{user.name}</p>
                        <p className="text-slate-400 text-xs truncate">{user.email}</p>
                        {user.role === 'admin' && (
                          <span className="inline-block mt-0.5 text-xs bg-purple-600 text-white px-1.5 py-0.5 rounded-full">Admin</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Menu items */}
                  <div className="py-1">
                    <Link href="/profile" onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-slate-300 hover:text-white hover:bg-purple-900/30 text-sm transition-colors">
                      <User className="w-4 h-4" /> My Profile
                    </Link>
                    {user.role === 'admin' && (
                      <Link href="/admin" onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-purple-300 hover:text-white hover:bg-purple-900/30 text-sm transition-colors">
                        <Settings className="w-4 h-4" /> Admin Panel
                      </Link>
                    )}
                    <button onClick={() => { setProfileOpen(false); signOut() }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-900/20 text-sm transition-colors">
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ── NOT signed in — show Sign In / Sign Up ── */
            <>
              <HoverPreview label="Login to your ApkaAI account" icon={<User className="w-3.5 h-3.5" />}>
                <Link href="/signin"
                  className="hidden sm:inline-flex items-center gap-1.5 text-slate-300 hover:text-white text-sm font-medium px-3 py-2 rounded-lg border border-purple-700/40 hover:border-purple-500 hover:bg-purple-900/20 transition-all">
                  <User className="w-3.5 h-3.5" />
                  Login as User
                </Link>
              </HoverPreview>
              <HoverPreview label="Login to the Admin Panel" icon={<Settings className="w-3.5 h-3.5" />}>
                <Link href="/admin/login"
                  className="hidden sm:inline-flex items-center gap-1.5 btn-primary text-white text-sm font-semibold px-4 py-2 rounded-lg">
                  <Settings className="w-3.5 h-3.5" />
                  Login as Admin
                </Link>
              </HoverPreview>
            </>
          )}

          <button className="lg:hidden p-2 text-slate-400 hover:text-white" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <ThemeToggle />
        </div>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="border-t border-purple-900/30 bg-[#0D0826] px-4 py-3 shadow-lg">
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              <input ref={searchInputRef} type="search" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search AI tools (e.g. ChatGPT, Midjourney, Cursor...)"
                className="w-full bg-purple-950/50 border border-purple-700/50 rounded-xl pl-11 pr-24 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition" />
              <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary text-white text-xs font-bold px-4 py-1.5 rounded-lg">
                Search
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden border-t border-purple-900/30 bg-[#0F0A1E] px-4 py-4 space-y-1">
          {user && (
            <div className="flex items-center gap-3 px-3 py-3 mb-2 border-b border-purple-900/30">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-violet-700 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">{getInitials(user.name)}</span>
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{user.name}</p>
                <p className="text-slate-500 text-xs">{user.email}</p>
              </div>
            </div>
          )}
          {navLinks.map(link => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 text-slate-300 hover:text-white hover:bg-purple-900/30 rounded-lg text-sm font-medium">
              {link.label === 'Compare' && <BarChart3 className="w-4 h-4 text-purple-400" />}
              {link.label === 'Cloud'   && <Cloud className="w-4 h-4 text-sky-400" />}
              {link.label}
            </Link>
          ))}
          {/* Cart link in mobile menu */}
          <Link href="/cart" onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 text-slate-300 hover:text-white hover:bg-purple-900/30 rounded-lg text-sm font-medium">
            <ShoppingCart className="w-4 h-4 text-purple-400" />
            Cart
            {itemCount > 0 && (
              <span className="ml-auto w-5 h-5 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </Link>
          <div className="pt-3 border-t border-purple-900/30 grid grid-cols-2 gap-2">
            {user ? (
              <>
                <Link href="/profile" onClick={() => setOpen(false)}
                  className="text-center border border-purple-700/40 text-slate-300 text-sm font-semibold px-4 py-2.5 rounded-lg hover:border-purple-500 transition-all">
                  My Profile
                </Link>
                <button onClick={() => { setOpen(false); signOut() }}
                  className="text-center bg-red-900/30 border border-red-700/40 text-red-300 text-sm font-semibold px-4 py-2.5 rounded-lg">
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/signin" onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-1.5 border border-purple-700/40 text-slate-300 text-sm font-semibold px-4 py-2.5 rounded-lg hover:border-purple-500 transition-all">
                  <User className="w-3.5 h-3.5" />
                  Login as User
                </Link>
                <Link href="/admin/login" onClick={() => setOpen(false)}
                  className="btn-primary flex items-center justify-center gap-1.5 text-white text-sm font-semibold px-4 py-2.5 rounded-lg">
                  <Settings className="w-3.5 h-3.5" />
                  Login as Admin
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
