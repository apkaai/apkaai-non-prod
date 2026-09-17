'use client'
/**
 * ApkaAI Cart Context
 * ─────────────────────────────────────────────────────────────
 * Stores cart items in localStorage (guest) and in-memory.
 * On login it merges guest cart with any previously-saved user cart.
 * The cart item shape is deliberately rich so a future checkout
 * flow (Razorpay / Stripe) can consume it without changes.
 */
import React, {
  createContext, useContext, useState, useEffect, useCallback
} from 'react'
import type { AITool, PricingPlan } from '@/lib/tools-data'

// ─── Types ────────────────────────────────────────────────────────────────────

export type BillingCycle = 'monthly' | 'yearly'

export interface CartItem {
  /** Unique key: toolId + planName + billingCycle */
  key: string
  toolId: string
  toolName: string
  toolSlug: string
  toolLogo: string
  toolWebsite: string
  toolCategory: string
  planName: string
  planPrice: string          // display string  e.g. "₹1,650/mo"
  planMonthly: number        // INR integer for calculation
  billingCycle: BillingCycle
  quantity: number
  addedAt: number            // Date.now()
}

interface CartContextValue {
  items: CartItem[]
  itemCount: number
  subtotal: number
  isDrawerOpen: boolean
  openDrawer: () => void
  closeDrawer: () => void
  toggleDrawer: () => void
  addItem: (tool: AITool, plan: PricingPlan, billing?: BillingCycle) => void
  removeItem: (key: string) => void
  updatePlan: (key: string, newPlan: PricingPlan, billing?: BillingCycle) => void
  clearCart: () => void
  isInCart: (toolId: string, planName?: string) => boolean
  getItemByTool: (toolId: string) => CartItem | undefined
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'apkaai_cart'

function makeKey(toolId: string, planName: string, billing: BillingCycle) {
  return `${toolId}__${planName}__${billing}`
}

/** Yearly price = monthly * 10  (2 months free heuristic — can be replaced with actual data) */
function yearlyPrice(monthly: number) {
  return Math.round(monthly * 10)
}

function buildCartItem(
  tool: AITool,
  plan: PricingPlan,
  billing: BillingCycle
): CartItem {
  const isYearly = billing === 'yearly'
  const monthly  = isYearly ? yearlyPrice(plan.monthly) : plan.monthly
  const priceStr = isYearly
    ? (plan.monthly === 0 ? '₹0/yr' : `₹${yearlyPrice(plan.monthly).toLocaleString('en-IN')}/yr`)
    : plan.price

  return {
    key:          makeKey(tool.id, plan.name, billing),
    toolId:       tool.id,
    toolName:     tool.name,
    toolSlug:     tool.slug,
    toolLogo:     tool.logo,
    toolWebsite:  tool.website,
    toolCategory: tool.category,
    planName:     plan.name,
    planPrice:    priceStr,
    planMonthly:  monthly,
    billingCycle: billing,
    quantity:     1,
    addedAt:      Date.now(),
  }
}

function loadFromStorage(): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CartItem[]) : []
  } catch { return [] }
}

function saveToStorage(items: CartItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch { /* quota exceeded — silently ignore */ }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems]             = useState<CartItem[]>([])
  const [isDrawerOpen, setDrawerOpen] = useState(false)
  const [hydrated, setHydrated]       = useState(false)

  // Hydrate from localStorage on mount (avoids SSR mismatch)
  useEffect(() => {
    setItems(loadFromStorage())
    setHydrated(true)
  }, [])

  // Persist whenever items change (after hydration)
  useEffect(() => {
    if (hydrated) saveToStorage(items)
  }, [items, hydrated])

  // ── Drawer helpers ─────────────────────────────────────────────────────────
  const openDrawer   = useCallback(() => setDrawerOpen(true),  [])
  const closeDrawer  = useCallback(() => setDrawerOpen(false), [])
  const toggleDrawer = useCallback(() => setDrawerOpen(p => !p), [])

  // ── Cart mutations ─────────────────────────────────────────────────────────
  const addItem = useCallback(
    (tool: AITool, plan: PricingPlan, billing: BillingCycle = 'monthly') => {
      const newItem = buildCartItem(tool, plan, billing)
      setItems(prev => {
        // If exact key already exists, do nothing (duplicate guard)
        if (prev.some(i => i.key === newItem.key)) return prev
        // If tool already in cart with a different plan — replace it
        const without = prev.filter(i => i.toolId !== tool.id)
        return [...without, newItem]
      })
      setDrawerOpen(true) // open drawer on add
    },
    []
  )

  const removeItem = useCallback((key: string) => {
    setItems(prev => prev.filter(i => i.key !== key))
  }, [])

  const updatePlan = useCallback(
    (key: string, newPlan: PricingPlan, billing: BillingCycle = 'monthly') => {
      setItems(prev => {
        const existing = prev.find(i => i.key === key)
        if (!existing) return prev

        // Reconstruct a minimal AITool-like object to reuse buildCartItem
        const fakeTool: AITool = {
          id:           existing.toolId,
          name:         existing.toolName,
          slug:         existing.toolSlug,
          logo:         existing.toolLogo,
          website:      existing.toolWebsite,
          category:     existing.toolCategory,
          categorySlug: '',
          tagline:      '',
          description:  '',
          pricing:      'Freemium',
          startingPrice:'',
          rating:       0,
          reviews:      0,
          tags:         [],
          featured:     false,
          new:          false,
        }
        const updated = buildCartItem(fakeTool, newPlan, billing)
        return prev.map(i => i.key === key ? updated : i)
      })
    },
    []
  )

  const clearCart = useCallback(() => setItems([]), [])

  // ── Queries ────────────────────────────────────────────────────────────────
  const isInCart = useCallback(
    (toolId: string, planName?: string) => {
      if (planName) return items.some(i => i.toolId === toolId && i.planName === planName)
      return items.some(i => i.toolId === toolId)
    },
    [items]
  )

  const getItemByTool = useCallback(
    (toolId: string) => items.find(i => i.toolId === toolId),
    [items]
  )

  // ── Derived values ─────────────────────────────────────────────────────────
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)
  const subtotal  = items.reduce((sum, i) => sum + i.planMonthly * i.quantity, 0)

  return (
    <CartContext.Provider value={{
      items, itemCount, subtotal,
      isDrawerOpen, openDrawer, closeDrawer, toggleDrawer,
      addItem, removeItem, updatePlan, clearCart,
      isInCart, getItemByTool,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>')
  return ctx
}
