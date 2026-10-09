'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Heart, ArrowLeft, RefreshCw, Zap, ExternalLink,
  Star, ShoppingCart, Trash2, AlertCircle
} from 'lucide-react'
import { useWishlist } from '@/lib/wishlist-context'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'

function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('apkaai_token') || sessionStorage.getItem('apkaai_token')
}
function getUser() {
  if (typeof window === 'undefined') return null
  try {
    const u = localStorage.getItem('apkaai_user') || sessionStorage.getItem('apkaai_user')
    return u ? JSON.parse(u) : null
  } catch { return null }
}

interface WishlistItem {
  id: string
  tool_id: string
  tool_slug: string
  tool_name: string
  tool_logo: string
  tool_category: string
  tool_pricing: string
  tool_rating: number
  tool_tagline: string
  created_at: string
}

function pricingClass(p: string) {
  switch (p) {
    case 'Free':       return 'bg-emerald-900/40 text-emerald-400'
    case 'Free Trial': return 'bg-teal-900/40 text-teal-400'
    case 'Paid':       return 'bg-amber-900/40 text-amber-400'
    default:           return 'bg-blue-900/40 text-blue-400'
  }
}

function WishlistCard({ item, onRemove }: { item: WishlistItem; onRemove: (toolId: string) => void }) {
  const [removing, setRemoving] = useState(false)

  async function handleRemove(e: React.MouseEvent) {
    e.preventDefault()
    setRemoving(true)
    try {
      await fetch(`${API}/wishlist/${item.tool_id}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      onRemove(item.tool_id)
    } catch {}
    setRemoving(false)
  }

  return (
    <div className="rounded-2xl bg-[#0F0A1E] border border-purple-900/40 hover:border-purple-700/50 transition-all p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-purple-900/40 border border-purple-700/30 flex items-center justify-center text-2xl flex-shrink-0">
          {item.tool_logo}
        </div>
        <div className="flex-1 min-w-0">
          <Link
            href={`/tools/${item.tool_slug}`}
            className="text-white font-bold text-sm hover:text-purple-300 transition-colors flex items-center gap-1"
          >
            {item.tool_name}
            <ExternalLink className="w-3 h-3 opacity-50" />
          </Link>
          <p className="text-slate-400 text-xs mt-0.5 line-clamp-1">{item.tool_tagline}</p>
        </div>
        {/* Remove */}
        <button
          onClick={handleRemove}
          disabled={removing}
          className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-900/20 flex-shrink-0"
          title="Remove from wishlist"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Meta row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="text-white text-xs font-semibold">{item.tool_rating}</span>
          </div>
          <span className="text-slate-600 text-xs">·</span>
          <span className="text-slate-400 text-xs">{item.tool_category}</span>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${pricingClass(item.tool_pricing)}`}>
          {item.tool_pricing === 'Freemium' ? 'Premium' : item.tool_pricing}
        </span>
      </div>

      {/* CTA */}
      <Link
        href={`/tools/${item.tool_slug}`}
        className="w-full flex items-center justify-center gap-2 border border-purple-700/40 hover:border-purple-500 text-purple-300 hover:text-white text-xs font-semibold py-2 rounded-xl transition-all hover:bg-purple-900/20"
      >
        <ShoppingCart className="w-3.5 h-3.5" />
        View & Add to Cart
      </Link>
    </div>
  )
}

export default function WishlistPage() {
  const router = useRouter()
  const { ids } = useWishlist()
  const [items, setItems]   = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')

  const fetchWishlist = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const token = getToken()
      const res   = await fetch(`${API}/wishlist`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) { router.replace('/signin'); return }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load wishlist')
      setItems(data.items || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
    setLoading(false)
  }, [router])

  useEffect(() => {
    const u = getUser()
    if (!u) { router.replace('/signin'); return }
    fetchWishlist()
  }, [router, fetchWishlist])

  const handleRemove = useCallback((toolId: string) => {
    setItems(prev => prev.filter(i => i.tool_id !== toolId))
  }, [])

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Back */}
        <Link href="/profile" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-8 transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Profile
        </Link>

        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Heart className="w-7 h-7 text-red-400 fill-red-400" />
            <div>
              <h1 className="text-3xl font-extrabold text-white">My Wishlist</h1>
              {items.length > 0 && (
                <p className="text-slate-400 text-sm mt-0.5">{items.length} saved {items.length === 1 ? 'tool' : 'tools'}</p>
              )}
            </div>
          </div>
          <button
            onClick={fetchWishlist}
            disabled={loading}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white border border-purple-800/40 hover:border-purple-600 px-3 py-2 rounded-lg transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-900/20 border border-red-700/40 text-red-400 mb-6 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-40 rounded-2xl bg-purple-900/10 border border-purple-900/30 animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && items.length === 0 && (
          <div className="text-center py-24">
            <div className="w-24 h-24 rounded-3xl bg-purple-900/20 border border-purple-800/30 flex items-center justify-center mx-auto mb-6">
              <Heart className="w-10 h-10 text-purple-400/50" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">No saved tools yet</h2>
            <p className="text-slate-400 max-w-sm mx-auto mb-8">
              Hit the ♥ button on any tool card to save it here for later.
            </p>
            <Link href="/tools" className="inline-flex items-center gap-2 btn-primary text-white font-bold px-8 py-3.5 rounded-xl">
              <Zap className="w-4 h-4" /> Browse AI Tools
            </Link>
          </div>
        )}

        {/* Grid */}
        {!loading && items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(item => (
              <WishlistCard key={item.id} item={item} onRemove={handleRemove} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
