'use client'
/**
 * WishlistContext
 * ─────────────────────────────────────────────────────────────
 * Loads the user's wishlisted tool IDs once on mount.
 * Exposes toggle() which optimistically updates and syncs to backend.
 * Works only for signed-in users — guests see the button but get
 * redirected to /signin on click (handled in WishlistButton).
 */
import React, {
  createContext, useContext, useState, useEffect, useCallback
} from 'react'
import type { AITool } from '@/lib/tools-data'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'

function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('apkaai_token') || sessionStorage.getItem('apkaai_token')
}

interface WishlistContextValue {
  /** Set of wishlisted tool IDs */
  ids:          Set<string>
  /** True while initial IDs are loading */
  initialising: boolean
  /** toolId currently being toggled (for per-button spinner) */
  loading:      string | null
  isWishlisted: (toolId: string) => boolean
  toggle:       (tool: AITool) => Promise<void>
}

const WishlistContext = createContext<WishlistContextValue | null>(null)

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds]                   = useState<Set<string>>(new Set())
  const [initialising, setInitialising] = useState(false)
  const [loading, setLoading]           = useState<string | null>(null)

  // Load wishlist IDs when a token is present
  useEffect(() => {
    const token = getToken()
    if (!token) return

    setInitialising(true)
    fetch(`${API}/wishlist/ids`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : { ids: [] })
      .then(data => setIds(new Set(data.ids || [])))
      .catch(() => {})
      .finally(() => setInitialising(false))
  }, [])

  const isWishlisted = useCallback(
    (toolId: string) => ids.has(toolId),
    [ids]
  )

  const toggle = useCallback(async (tool: AITool) => {
    const token = getToken()
    if (!token) return

    // Optimistic update
    setLoading(tool.id)
    const wasWishlisted = ids.has(tool.id)
    setIds(prev => {
      const next = new Set(prev)
      if (wasWishlisted) next.delete(tool.id)
      else next.add(tool.id)
      return next
    })

    try {
      const res = await fetch(`${API}/wishlist/toggle`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({
          toolId:       tool.id,
          toolSlug:     tool.slug,
          toolName:     tool.name,
          toolLogo:     tool.logo,
          toolCategory: tool.category,
          toolPricing:  tool.pricing,
          toolRating:   tool.rating,
          toolTagline:  tool.tagline,
        }),
      })

      if (!res.ok) throw new Error('Toggle failed')
      const data = await res.json()

      // Reconcile with server truth
      setIds(prev => {
        const next = new Set(prev)
        if (data.wishlisted) next.add(tool.id)
        else next.delete(tool.id)
        return next
      })
    } catch {
      // Roll back optimistic update on error
      setIds(prev => {
        const next = new Set(prev)
        if (wasWishlisted) next.add(tool.id)
        else next.delete(tool.id)
        return next
      })
    } finally {
      setLoading(null)
    }
  }, [ids])

  return (
    <WishlistContext.Provider value={{ ids, initialising, loading, isWishlisted, toggle }}>
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error('useWishlist must be used inside <WishlistProvider>')
  return ctx
}
