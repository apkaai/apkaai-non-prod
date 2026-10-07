/**
 * useSubscription — checks if the current user has access
 *
 * ApkaAI uses a per-tool cart + Razorpay checkout model.
 * There is NO global subscription gate — any logged-in user
 * can add tools to cart and purchase individually.
 *
 * This hook is kept for compatibility but:
 *  - isSubscribed() returns true for ANY logged-in user
 *  - requirePlan() only redirects to signin if not logged in
 *  - Admin users always have access
 */
'use client'
import { useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface SubscriptionUser {
  userId: string
  email:  string
  role:   string
  plan?:  string
}

function getUser(): SubscriptionUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('apkaai_user') || sessionStorage.getItem('apkaai_user')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('apkaai_token') || sessionStorage.getItem('apkaai_token') || null
}

/**
 * Any logged-in user has access.
 * Individual tool purchases are handled via cart + Razorpay.
 */
export function isSubscribed(): boolean {
  const token = getToken()
  const user  = getUser()
  // Simply: logged in = access granted
  return !!(token && user)
}

export function useSubscription() {
  const router = useRouter()

  /**
   * requirePlan(action, redirectBackTo?)
   * - If not logged in → go to /signin with redirect
   * - If logged in     → run action() immediately (no paywall)
   */
  const requirePlan = useCallback((
    action: () => void,
    redirectBackTo?: string,
  ) => {
    const token = getToken()
    const user  = getUser()

    if (!token || !user) {
      const back = redirectBackTo || (typeof window !== 'undefined' ? window.location.pathname : '/')
      router.push(`/signin?redirect=${encodeURIComponent(back)}`)
      return
    }

    // Logged in — allow the action immediately
    action()
  }, [router])

  return { requirePlan, isSubscribed }
}
