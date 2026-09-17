'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  ShoppingCart, ArrowRight, Trash2, RotateCcw, ArrowLeft,
  Tag, Shield, Zap, Check, Info
} from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import PlanModal from '@/components/cart/PlanModal'
import type { CartItem } from '@/lib/cart-context'
import { tools } from '@/lib/tools-data'

// ── Toast ─────────────────────────────────────────────────────────────────────
interface Toast { id: number; message: string; type: 'success' | 'info' }
let tid = 0
function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const show = (message: string, type: Toast['type'] = 'success') => {
    const id = ++tid
    setToasts(p => [...p, { id, message, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000)
  }
  return { toasts, show }
}

// ── Cart Item Row (full-width for the /cart page) ─────────────────────────────
function FullCartItemRow({
  item,
  onRemove,
  onChangePlan,
}: {
  item: CartItem
  onRemove: (key: string, label: string) => void
  onChangePlan: (item: CartItem) => void
}) {
  const hasPlan = (tools.find(t => t.id === item.toolId)?.pricingPlans?.length ?? 0) > 1

  return (
    <div className="flex items-center gap-4 p-5 rounded-2xl bg-[#0F0A1E] border border-purple-900/40 hover:border-purple-700/50 transition-all group">
      {/* Logo */}
      <div className="w-14 h-14 rounded-xl bg-purple-900/40 border border-purple-700/30 flex items-center justify-center text-3xl flex-shrink-0">
        {item.toolLogo}
      </div>

      {/* Middle — tool info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <Link
              href={`/tools/${item.toolSlug}`}
              className="text-white font-bold text-base hover:text-purple-300 transition-colors"
            >
              {item.toolName}
            </Link>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="badge-new text-white text-[10px]">{item.planName} Plan</span>
              <span className="text-slate-500 text-xs capitalize">{item.billingCycle} billing</span>
            </div>
          </div>

          {/* Price */}
          <div className="text-right flex-shrink-0">
            <p className="text-purple-300 font-extrabold text-lg">{item.planPrice}</p>
            <p className="text-slate-500 text-xs">{item.billingCycle === 'yearly' ? 'per year' : 'per month'}</p>
          </div>
        </div>

        {/* Actions row */}
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          <Link
            href={`/tools/${item.toolSlug}`}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            View Details →
          </Link>
          {hasPlan && (
            <button
              onClick={() => onChangePlan(item)}
              className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Change Plan
            </button>
          )}
          <button
            onClick={() => onRemove(item.key, `${item.toolName} (${item.planName})`)}
            className="flex items-center gap-1.5 text-xs text-red-400/60 hover:text-red-400 transition-colors ml-auto"
          >
            <Trash2 className="w-3 h-3" />
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CartPageClient() {
  const {
    items, itemCount, subtotal,
    removeItem, clearCart,
  } = useCart()
  const { toasts, show: showToast } = useToast()
  const [changingItem, setChangingItem] = useState<CartItem | null>(null)
  const [coupon, setCoupon]         = useState('')
  const [couponApplied, setCouponApplied] = useState(false)

  const tax      = Math.round(subtotal * 0.18)
  const discount = couponApplied ? Math.round(subtotal * 0.1) : 0
  const total    = subtotal + tax - discount

  function handleRemove(key: string, label: string) {
    removeItem(key)
    showToast(`${label} removed from cart`)
  }

  function handleChangePlan(item: CartItem) {
    setChangingItem(item)
  }

  function applyCoupon() {
    if (coupon.trim().toUpperCase() === 'APKAAI10') {
      setCouponApplied(true)
      showToast('Coupon applied — 10% off!', 'success')
    } else {
      showToast('Invalid coupon code', 'info')
    }
  }

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Breadcrumb */}
        <Link href="/tools" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-8 transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Continue Shopping
        </Link>

        {/* Page title */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-7 h-7 text-purple-400" />
            <h1 className="text-3xl font-extrabold text-white">Your Cart</h1>
            {itemCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-purple-600/30 border border-purple-600/50 text-purple-300 text-sm font-semibold">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </span>
            )}
          </div>
          {itemCount > 0 && (
            <button
              onClick={() => { clearCart(); showToast('Cart cleared') }}
              className="text-sm text-red-400/70 hover:text-red-400 flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear all
            </button>
          )}
        </div>

        {/* ── Empty state ── */}
        {items.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-24 h-24 rounded-3xl bg-purple-900/20 border border-purple-800/30 flex items-center justify-center mx-auto mb-6">
              <ShoppingCart className="w-10 h-10 text-purple-400/50" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Your cart is empty</h2>
            <p className="text-slate-400 max-w-md mx-auto mb-8">
              Explore our 70+ AI tools and add the ones you want to your cart. No account required to browse.
            </p>
            <Link
              href="/tools"
              className="inline-flex items-center gap-2 btn-primary text-white font-bold px-8 py-3.5 rounded-xl shadow-glow-sm"
            >
              Explore AI Tools <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Items column (2/3) ── */}
            <div className="lg:col-span-2 space-y-3">
              {items.map(item => (
                <FullCartItemRow
                  key={item.key}
                  item={item}
                  onRemove={handleRemove}
                  onChangePlan={handleChangePlan}
                />
              ))}

              {/* Trust badges */}
              <div className="grid grid-cols-3 gap-3 mt-6">
                {[
                  { icon: <Shield className="w-4 h-4" />, label: 'Secure Checkout' },
                  { icon: <Zap className="w-4 h-4" />,    label: 'Instant Access' },
                  { icon: <Check className="w-4 h-4" />,  label: 'Cancel Anytime' },
                ].map(b => (
                  <div key={b.label} className="flex items-center gap-2 p-3 rounded-xl bg-purple-950/20 border border-purple-900/30 text-xs text-slate-400">
                    <span className="text-purple-400">{b.icon}</span>
                    {b.label}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Order summary sidebar (1/3) ── */}
            <div className="space-y-4">
              <div className="glow-border rounded-2xl p-6 bg-[#0F0A1E] sticky top-24">
                <h2 className="text-white font-bold text-lg mb-5">Order Summary</h2>

                <div className="space-y-3 text-sm mb-5">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
                    <span className="text-white">₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  {couponApplied && (
                    <div className="flex justify-between text-emerald-400">
                      <span className="flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5" /> Discount (10%)
                      </span>
                      <span>−₹{discount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-400">
                    <span className="flex items-center gap-1">
                      GST (18%)
                      <span title="Taxes calculated at checkout" className="cursor-help">
                        <Info className="w-3 h-3 opacity-50" />
                      </span>
                    </span>
                    <span className="text-white">₹{tax.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between font-bold text-white border-t border-purple-900/30 pt-3 mt-1 text-base">
                    <span>Total</span>
                    <span className="text-purple-300">₹{total.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Coupon */}
                {!couponApplied && (
                  <div className="flex gap-2 mb-5">
                    <input
                      type="text"
                      placeholder="Coupon code"
                      value={coupon}
                      onChange={e => setCoupon(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                      className="flex-1 bg-purple-950/40 border border-purple-800/40 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                    />
                    <button
                      onClick={applyCoupon}
                      className="px-3 py-2 bg-purple-600/30 border border-purple-700/50 text-purple-300 text-sm rounded-lg hover:bg-purple-600/50 transition-colors font-medium"
                    >
                      Apply
                    </button>
                  </div>
                )}
                {couponApplied && (
                  <div className="flex items-center gap-2 mb-5 p-2.5 rounded-lg bg-emerald-900/20 border border-emerald-700/30 text-emerald-400 text-xs">
                    <Check className="w-4 h-4" />
                    Coupon &ldquo;APKAAI10&rdquo; applied — 10% off!
                  </div>
                )}

                {/* Checkout CTA */}
                <button
                  className="w-full btn-primary text-white font-bold py-3.5 rounded-xl shadow-glow-sm flex items-center justify-center gap-2 text-sm"
                  onClick={() => showToast('Checkout coming soon — stay tuned!', 'info')}
                >
                  Proceed to Checkout
                  <ArrowRight className="w-4 h-4" />
                </button>
                <p className="text-center text-xs text-slate-500 mt-3">
                  Payment gateway integration coming soon (Razorpay / Stripe).
                </p>

                {/* Items summary */}
                <div className="mt-5 border-t border-purple-900/30 pt-4 space-y-2">
                  {items.map(item => (
                    <div key={item.key} className="flex items-center gap-2 text-xs">
                      <span className="text-lg">{item.toolLogo}</span>
                      <span className="text-slate-300 flex-1 truncate">{item.toolName} — {item.planName}</span>
                      <span className="text-purple-300 font-semibold flex-shrink-0">{item.planPrice}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended */}
              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-900/30 text-center">
                <p className="text-slate-400 text-xs mb-2">Looking for more tools?</p>
                <Link href="/tools" className="text-purple-400 hover:text-purple-300 text-xs font-medium flex items-center justify-center gap-1 transition-colors">
                  Browse all 70 AI Tools <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast notifications */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`px-5 py-3 rounded-xl text-sm font-medium text-center shadow-glow-sm animate-[slideUp_0.3s_ease-out] border ${
              t.type === 'info'
                ? 'bg-[#1A1035] border-blue-700/60 text-blue-300'
                : 'bg-[#1A1035] border-emerald-700/60 text-emerald-300'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* Plan change modal */}
      {changingItem && (() => {
        const toolData = tools.find(t => t.id === changingItem.toolId)
        if (!toolData) return null
        return (
          <PlanModal
            tool={toolData}
            existingKey={changingItem.key}
            onClose={() => {
              setChangingItem(null)
              showToast('Plan updated!')
            }}
          />
        )
      })()}
    </div>
  )
}
