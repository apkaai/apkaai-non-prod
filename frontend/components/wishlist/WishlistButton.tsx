'use client'
/**
 * WishlistButton — heart toggle for any tool card.
 * - If user is not signed in, redirects to /signin on click.
 * - Optimistically updates UI, syncs with backend.
 * - Reads initial state from WishlistContext (loaded once on mount).
 */
import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Heart } from 'lucide-react'
import { useWishlist } from '@/lib/wishlist-context'
import type { AITool } from '@/lib/tools-data'

interface WishlistButtonProps {
  tool: AITool
  /** Size variant */
  size?: 'sm' | 'md'
  className?: string
}

export default function WishlistButton({ tool, size = 'md', className = '' }: WishlistButtonProps) {
  const router = useRouter()
  const { isWishlisted, toggle, loading } = useWishlist()

  const wishlisted = isWishlisted(tool.id)
  const pending    = loading === tool.id

  const handleClick = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault()   // prevent card link navigation
    e.stopPropagation()

    const token = typeof window !== 'undefined'
      ? (localStorage.getItem('apkaai_token') || sessionStorage.getItem('apkaai_token'))
      : null

    if (!token) {
      router.push('/signin')
      return
    }

    await toggle(tool)
  }, [tool, toggle, router])

  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'
  const btnSize  = size === 'sm' ? 'w-7 h-7' : 'w-8 h-8'

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      aria-label={wishlisted ? `Remove ${tool.name} from wishlist` : `Add ${tool.name} to wishlist`}
      title={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
      className={`
        ${btnSize} rounded-full flex items-center justify-center transition-all
        ${wishlisted
          ? 'bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30'
          : 'bg-purple-900/30 border border-purple-700/30 text-slate-400 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/10'
        }
        ${pending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      <Heart
        className={`${iconSize} transition-all ${wishlisted ? 'fill-red-400 text-red-400' : ''} ${pending ? 'animate-pulse' : ''}`}
      />
    </button>
  )
}
