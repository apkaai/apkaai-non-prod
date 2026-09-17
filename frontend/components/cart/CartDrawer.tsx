'use client'
/**
 * CartDrawer — slides in from the right when cart icon is clicked.
 * Matches ApkaAI dark-purple design system.
 */
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { X, ShoppingCart, ArrowRight, Trash2, RotateCcw } from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import PlanModal from '@/components/cart/PlanModal'
import type { CartItem } from '@/lib/cart-context'
import { getToolBySlug, tools } from '@/lib/tools-data'

// ── Toast ─────────────────────────────────────────────────────────────────────
interface Toast { id: number; message: string }
let toastId = 0
function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const add = (message: string) => {
    const id = ++toastId
    setToasts(p => [...p, { id, message }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000)
  }
  return { toasts, add }
}

// ── CartItemRow ───────────────────────────────────────────────────────────────
function CartItemRow({
  item,
  onRemove,
  onChangePlan,
}: {
  item: CartItem
  onRemove: (key: string, name: string) => void
  onChangePlan: (item: CartItem) => void
}) {
  const hasPlan = (() => {
    const t = tools.find(x => x.id === item.toolId)
    return (t?.pricingPlans?.length ?? 0) > 1
  })()

  return (
    <div className="flex items-start gap-3 p-3.5 rounded-xl bg-purple-950/20 border border-purple-900/30 hover:border-purple-800/50 transition-colors group">
      {/* Logo */}
      <div className="w-10 h-10 rounded-xl bg-purple-900/40 border border-purple-700/30 flex items-center justify-center text-lg flex-shrink-0">
        {item.toolLogo}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm truncate">{item.toolName}</p>
        <p className="text-purple-300 text-xs">{item.planName} Plan</p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-white font-bold text-sm">{item.planPrice}</span>
          <span className="text-xs text-slate-500 capitalize">· {item.billingCycle}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-2">
          {hasPlan && (
            <button
              onClick={() => onChangePlan(item)}
              className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Change Plan
            </button>
          )}
          <button
            onClick={() => onRemove(item.key, `${item.toolName} ${item.planName}`)}
            className="text-xs text-red-400/70 hover:text-red-400 flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Drawer ───────────────────────────────────────────────────────────────
export default function CartDrawer() {
  const {
    items, itemCount, subtotal,
    isDrawerOpen, closeDrawer,
    removeItem,
  } = useCart()

  const { toasts, add: addToast } = useToasts()
  const [changingItem, setChangingItem] = useState<CartItem | null>(null)
  const drawerRef = useRef<HTMLDivElement>(null)

  // Close on outside click (but not on modal)
  useEffect(() => {
    if (!isDrawerOpen) return
    function handle(e: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        closeDrawer()
      }
    }
    // slight delay so the open-click doesn't immediately close
    const t = setTimeout(() => document.addEventListener('mousedown', handle), 100)
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handle) }
  }, [isDrawerOpen, closeDrawer])

  // Trap scroll on body when open on mobile
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isDrawerOpen])

  function handleRemove(key: string, label: string) {
    removeItem(key)
    addToast(`${label} removed from cart`)
  }

  function handleChangePlan(item: CartItem) {
    setChangingItem(item)
  }

  const tax      = Math.round(subtotal * 0.18)  // 18 % GST placeholder
  const total    = subtotal + tax

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[9970] transition-opacity duration-300 ${
          isDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* ── Drawer panel ── */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-label="Cart"
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-[#0D0826] border-l border-purple-800/40 z-[9980] flex flex-col shadow-[0_0_60px_rgba(124,58,237,0.3)] transition-transform duration-300 ease-out ${
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-purple-900/30 flex-shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-purple-400" />
            <h2 className="text-white font-bold text-base">Your Cart</h2>
            {itemCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </div>
          <button
            onClick={closeDrawer}
            aria-label="Close cart"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-purple-900/30 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-10 px-6">
              <div className="w-16 h-16 rounded-2xl bg-purple-900/30 border border-purple-800/30 flex items-center justify-center mb-4">
                <ShoppingCart className="w-7 h-7 text-purple-400 opacity-60" />
              </div>
              <h3 className="text-white font-bold mb-2">Your cart is empty</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                Explore our 70+ AI tools and add the ones you want.
              </p>
              <Link
                href="/tools"
                onClick={closeDrawer}
                className="btn-primary text-white text-sm font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2"
              >
                Explore AI Tools <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            items.map(item => (
              <CartItemRow
                key={item.key}
                item={item}
                onRemove={handleRemove}
                onChangePlan={handleChangePlan}
              />
            ))
          )}
        </div>

        {/* Footer summary (only when items exist) */}
        {items.length > 0 && (
          <div className="flex-shrink-0 border-t border-purple-900/30 px-5 py-4 space-y-3 bg-[#0D0826]">
            {/* Subtotals */}
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
                <span className="text-white">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>GST (18%)</span>
                <span className="text-white">₹{tax.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between font-bold text-white border-t border-purple-900/30 pt-2 mt-2">
                <span>Total</span>
                <span className="text-purple-300 text-base">₹{total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* CTAs */}
            <Link
              href="/cart"
              onClick={closeDrawer}
              className="btn-primary flex items-center justify-center gap-2 text-white font-bold text-sm py-3 rounded-xl w-full shadow-glow-sm"
            >
              View Cart <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={closeDrawer}
              className="w-full text-center text-slate-400 hover:text-white text-sm py-2 transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        )}

        {/* Toast stack */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none w-[90vw] max-w-xs">
          {toasts.map(t => (
            <div
              key={t.id}
              className="bg-[#1A1035] border border-purple-700/60 text-white text-xs font-medium px-4 py-2.5 rounded-xl shadow-glow-sm text-center animate-[slideUp_0.3s_ease-out]"
            >
              {t.message}
            </div>
          ))}
        </div>
      </div>

      {/* Plan change modal */}
      {changingItem && (() => {
        const toolData = tools.find(t => t.id === changingItem.toolId)
        if (!toolData) return null
        return (
          <PlanModal
            tool={toolData}
            existingKey={changingItem.key}
            onClose={() => { setChangingItem(null); addToast('Plan updated!') }}
          />
        )
      })()}
    </>
  )
}
