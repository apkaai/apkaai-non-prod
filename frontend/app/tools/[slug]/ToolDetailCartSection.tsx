'use client'
/**
 * Client component that injects Add-to-Cart into the tool detail page.
 * Rendered inside the (server) /tools/[slug]/page.tsx.
 */
import { useState } from 'react'
import { ShoppingCart, Check } from 'lucide-react'
import AddToCartButton from '@/components/cart/AddToCartButton'
import PlanModal from '@/components/cart/PlanModal'
import { useCart } from '@/lib/cart-context'
import type { AITool, PricingPlan } from '@/lib/tools-data'
import type { BillingCycle } from '@/lib/cart-context'
import Link from 'next/link'

// ── Sidebar CTA (replaces / complements the existing "Visit" button) ──────────
export function SidebarCartCTA({ tool }: { tool: AITool }) {
  const { isInCart, itemCount } = useCart()
  const inCart = isInCart(tool.id)
  const [showModal, setShowModal] = useState(false)

  const plans   = tool.pricingPlans ?? []
  const hasPlans = plans.length > 0

  return (
    <>
      {hasPlans ? (
        <button
          onClick={() => setShowModal(true)}
          className={`w-full flex items-center justify-center gap-2 font-bold px-6 py-3.5 rounded-xl text-sm transition-all ${
            inCart
              ? 'bg-purple-600/20 border border-purple-500/60 text-purple-300 hover:bg-purple-600/30'
              : 'bg-purple-950/40 border border-purple-700/50 text-slate-300 hover:border-purple-500 hover:text-white hover:bg-purple-900/20'
          }`}
        >
          {inCart ? (
            <>
              <Check className="w-4 h-4" />
              In Cart — Change Plan
            </>
          ) : (
            <>
              <ShoppingCart className="w-4 h-4" />
              Add to Cart
            </>
          )}
        </button>
      ) : (
        <AddToCartButton tool={tool} size="lg" variant="secondary" className="w-full justify-center" />
      )}

      {inCart && (
        <Link
          href="/cart"
          className="block text-center text-xs text-purple-400 hover:text-purple-300 underline underline-offset-2 mt-2 transition-colors"
        >
          View Cart
        </Link>
      )}

      {showModal && (
        <PlanModal
          tool={tool}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}

// ── Per-plan "Add" button inside the Pricing Plans grid ──────────────────────
export function PlanCartButton({
  tool,
  plan,
}: {
  tool: AITool
  plan: PricingPlan
}) {
  const { addItem, isInCart, getItemByTool, updatePlan } = useCart()
  const [billing, setBilling] = useState<BillingCycle>('monthly')
  const [added,   setAdded]   = useState(false)

  const existingItem = getItemByTool(tool.id)
  const thisInCart   = existingItem?.planName === plan.name

  function handleClick() {
    if (existingItem && !thisInCart) {
      // Replace plan
      updatePlan(existingItem.key, plan, billing)
    } else if (!existingItem) {
      addItem(tool, plan, billing)
    }
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  if (plan.monthly === 0) return null // No cart button for free plans

  return (
    <button
      onClick={handleClick}
      className={`w-full mt-3 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
        thisInCart
          ? 'bg-purple-600/20 border border-purple-500/50 text-purple-300'
          : added
          ? 'bg-emerald-600/20 border border-emerald-500/50 text-emerald-400'
          : 'bg-purple-950/40 border border-purple-800/40 text-slate-300 hover:border-purple-600 hover:text-white'
      }`}
    >
      {thisInCart ? (
        <><Check className="w-3.5 h-3.5" /> In Cart</>
      ) : added ? (
        <><Check className="w-3.5 h-3.5" /> Added!</>
      ) : (
        <><ShoppingCart className="w-3.5 h-3.5" /> Add to Cart</>
      )}
    </button>
  )
}
