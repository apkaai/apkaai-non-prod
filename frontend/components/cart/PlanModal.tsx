'use client'
/**
 * PlanModal — shown when user clicks "Add to Cart" on a tool that has
 * multiple pricing plans, or "Change Plan" on a cart item.
 *
 * Props:
 *  tool       — the AITool being configured
 *  existingKey — if changing plan, the current cart-item key to replace
 *  onClose    — dismiss callback
 */
import { useState, useEffect, useCallback } from 'react'
import { X, ShoppingCart, Check, Star, Zap, ArrowRight } from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import type { AITool, PricingPlan } from '@/lib/tools-data'
import type { BillingCycle } from '@/lib/cart-context'

interface PlanModalProps {
  tool: AITool
  existingKey?: string   // present when "Change Plan" is clicked
  defaultPlan?: PricingPlan
  onClose: () => void
}

export default function PlanModal({ tool, existingKey, defaultPlan, onClose }: PlanModalProps) {
  const { addItem, updatePlan, items } = useCart()

  const plans = tool.pricingPlans ?? []

  // Pre-select: most popular → provided default → first paid → first
  const initialPlan =
    defaultPlan ??
    plans.find(p => p.popular) ??
    plans.find(p => p.monthly > 0) ??
    plans[0]

  const [selected, setSelected]     = useState<PricingPlan | null>(initialPlan ?? null)
  const [billing,  setBilling]      = useState<BillingCycle>('monthly')
  const [added,    setAdded]        = useState(false)

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Prevent scroll behind modal
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const yearlyMonthly = selected ? Math.round(selected.monthly * 10) : 0
  const yearlyStr     = selected?.monthly === 0
    ? '₹0/yr'
    : `₹${yearlyMonthly.toLocaleString('en-IN')}/yr`

  const handleConfirm = useCallback(() => {
    if (!selected) return
    if (existingKey) {
      updatePlan(existingKey, selected, billing)
    } else {
      addItem(tool, selected, billing)
    }
    setAdded(true)
    setTimeout(() => onClose(), 900)
  }, [selected, billing, existingKey, tool, addItem, updatePlan, onClose])

  if (plans.length === 0) return null

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* blur overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md bg-[#0F0A1E] border border-purple-700/50 rounded-2xl shadow-[0_0_60px_rgba(124,58,237,0.35)] overflow-hidden animate-[slideUp_0.25s_ease-out]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-purple-900/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-900/40 border border-purple-700/30 flex items-center justify-center text-xl flex-shrink-0">
              {tool.logo}
            </div>
            <div>
              <p className="text-white font-bold text-sm">{tool.name}</p>
              <p className="text-slate-400 text-xs">{existingKey ? 'Change Plan' : 'Select a Plan'}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-purple-900/30 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Billing toggle (only if any plan has a price) */}
        {plans.some(p => p.monthly > 0) && (
          <div className="flex items-center gap-1 mx-6 mt-4 p-1 bg-purple-950/50 rounded-xl border border-purple-800/30">
            {(['monthly', 'yearly'] as BillingCycle[]).map(cycle => (
              <button
                key={cycle}
                onClick={() => setBilling(cycle)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                  billing === cycle
                    ? 'bg-purple-600 text-white shadow-glow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cycle === 'monthly' ? 'Monthly' : 'Yearly'}
                {cycle === 'yearly' && (
                  <span className="ml-1.5 text-[10px] bg-emerald-600/80 text-white px-1.5 py-0.5 rounded-full">
                    2 months free
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Plan list */}
        <div className="px-6 py-4 space-y-2.5 max-h-[340px] overflow-y-auto">
          {plans.map(plan => {
            const isSelected = selected?.name === plan.name
            const displayPrice = billing === 'yearly' && plan.monthly > 0
              ? yearlyStr
              : plan.price

            return (
              <button
                key={plan.name}
                onClick={() => setSelected(plan)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  isSelected
                    ? 'border-purple-500 bg-purple-900/30 shadow-glow-sm'
                    : 'border-purple-900/40 bg-purple-950/20 hover:border-purple-700/60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Radio dot */}
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                      isSelected ? 'border-purple-400 bg-purple-500' : 'border-slate-600'
                    }`}>
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-semibold text-sm">{plan.name}</span>
                        {plan.popular && (
                          <span className="badge-new text-white text-[10px]">Most Popular</span>
                        )}
                      </div>
                      <p className="text-slate-400 text-xs mt-0.5 line-clamp-2">
                        {plan.features.slice(0, 2).join(' · ')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`font-extrabold text-base ${plan.monthly === 0 ? 'text-emerald-400' : 'text-purple-300'}`}>
                      {displayPrice}
                    </p>
                    {billing === 'yearly' && plan.monthly > 0 && (
                      <p className="text-slate-500 text-[10px] line-through">{plan.price}</p>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Selected plan feature list */}
        {selected && selected.features.length > 0 && (
          <div className="mx-6 mb-4 p-3 rounded-xl bg-purple-950/30 border border-purple-900/30">
            <p className="text-xs text-slate-400 font-semibold mb-2 flex items-center gap-1">
              <Zap className="w-3 h-3 text-purple-400" />
              {selected.name} includes:
            </p>
            <ul className="space-y-1">
              {selected.features.map(f => (
                <li key={f} className="flex items-start gap-2 text-xs text-slate-300">
                  <Check className="w-3 h-3 text-purple-400 flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer CTA */}
        <div className="px-6 pb-5">
          <button
            onClick={handleConfirm}
            disabled={!selected || added}
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all ${
              added
                ? 'bg-emerald-600 text-white cursor-default'
                : 'btn-primary text-white shadow-glow-sm hover:-translate-y-0.5'
            } disabled:opacity-60`}
          >
            {added ? (
              <>
                <Check className="w-4 h-4" />
                {existingKey ? 'Plan Updated!' : 'Added to Cart!'}
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4" />
                {existingKey ? 'Update Plan' : `Add to Cart — ${
                  selected
                    ? (billing === 'yearly' && (selected.monthly ?? 0) > 0
                        ? `₹${Math.round(selected.monthly * 10).toLocaleString('en-IN')}/yr`
                        : selected.price)
                    : '—'
                }`}
              </>
            )}
          </button>
          {!existingKey && (
            <p className="text-center text-xs text-slate-500 mt-2">
              You can change the plan or remove it from your cart anytime.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
