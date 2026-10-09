'use client'
import { useState, useEffect } from 'react'
import { Check, Zap, Shield, Star, Users, ArrowRight, Loader2 } from 'lucide-react'
import Script from 'next/script'

const RAZORPAY_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_live_TeyNk9D9O7uVV9'

interface Plan {
  id: string
  name: string
  price: number
  priceYearly: number
  currency: string
  features: string[]
  badge: string | null
}


const PLAN_ICONS: Record<string, React.ReactNode> = {
  basic:      <Zap className="w-6 h-6" />,
  pro:        <Star className="w-6 h-6" />,
  enterprise: <Users className="w-6 h-6" />,
}
const PLAN_COLORS: Record<string, string> = {
  basic:      'from-blue-600 to-blue-700',
  pro:        'from-purple-600 to-violet-700',
  enterprise: 'from-amber-600 to-orange-600',
}

export default function PlansPage() {
  const [plans, setPlans]         = useState<Plan[]>([])
  const [loading, setLoading]     = useState(true)
  const [billing, setBilling]     = useState<'monthly'|'yearly'>('monthly')
  const [paying, setPaying]       = useState<string | null>(null)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [accessBanner, setAccessBanner] = useState(false)

  useEffect(() => {
    fetch('/api/payment/plans')
      .then(r => r.json())
      .then(d => { setPlans(d.plans || []); setLoading(false) })
      .catch(() => setLoading(false))
    // Show banner if redirected from a paywall
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('reason') === 'access') setAccessBanner(true)
    }
  }, [])

  const getToken = () =>
    typeof window !== 'undefined'
      ? localStorage.getItem('apkaai_token') || sessionStorage.getItem('apkaai_token')
      : null

  const getUser = () => {
    if (typeof window === 'undefined') return null
    try {
      const u = localStorage.getItem('apkaai_user') || sessionStorage.getItem('apkaai_user')
      return u ? JSON.parse(u) : null
    } catch { return null }
  }

  const handlePay = async (planId: string) => {
    const token = getToken()
    if (!token) {
      window.location.href = `/signin?redirect=/plans&plan=${planId}`
      return
    }
    if (!scriptLoaded || !window.Razorpay) {
      alert('Payment gateway loading... please try again in a moment.')
      return
    }

    setPaying(planId)
    try {
      // Step 1: Create order on backend
      const res = await fetch('/api/payment/create-order', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ planId, billingCycle: billing }),
      })
      const order = await res.json()
      if (!res.ok) throw new Error(order.error || 'Failed to create order')

      const user = getUser()

      // Step 2: Open Razorpay popup
      const options = {
        key:         RAZORPAY_KEY,
        amount:      order.amount,
        currency:    order.currency,
        name:        'ApkaAI',
        description: `${order.planName} Plan — ${billing}`,
        image:       '/apkaai-logo.png',
        order_id:    order.orderId,
        prefill: {
          name:    user?.name  || '',
          email:   user?.email || '',
        },
        theme:   { color: '#8B5CF6' },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          // Step 3: Verify on backend
          try {
            const verify = await fetch('/api/payment/verify', {
              method:  'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body:    JSON.stringify(response),
            })
            const result = await verify.json()
            if (result.success) {
              window.location.href = `/payment/success?plan=${planId}&payment_id=${response.razorpay_payment_id}`
            } else {
              window.location.href = `/payment/failed?order_id=${response.razorpay_order_id}`
            }
          } catch {
            window.location.href = `/payment/failed`
          }
        },
        modal: {
          ondismiss: () => setPaying(null),
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Payment failed. Please try again.')
      setPaying(null)
    }
  }

  const displayPrice = (plan: Plan) =>
    billing === 'yearly'
      ? Math.round(plan.priceYearly / 12)
      : plan.price

  const savings = (plan: Plan) =>
    Math.round(((plan.price * 12 - plan.priceYearly) / (plan.price * 12)) * 100)

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setScriptLoaded(true)}
      />

      <div className="min-h-screen pt-24 pb-20 px-4">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-purple-900/40 border border-purple-700/50 rounded-full px-4 py-2 text-sm text-purple-300 mb-6">
              <Shield className="w-4 h-4" />
              Secured by Razorpay · 100% refund within 7 days
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4">
              Supercharge Your<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-violet-400">
                AI Workflow
              </span>
            </h1>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              Get unlimited access to all 43+ AI tools comparisons, recommendations, and analytics — at prices made for India.
            </p>
          </div>

          {/* Access required banner — removed (no subscription gate in ApkaAI) */}

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-4 mb-12">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                billing === 'monthly'
                  ? 'bg-purple-600 border-purple-500 text-white'
                  : 'bg-[#0F0A1E] border-purple-800/40 text-slate-300 hover:border-purple-500'
              }`}>
              Monthly
            </button>
            <button
              onClick={() => setBilling('yearly')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                billing === 'yearly'
                  ? 'bg-purple-600 border-purple-500 text-white'
                  : 'bg-[#0F0A1E] border-purple-800/40 text-slate-300 hover:border-purple-500'
              }`}>
              Yearly
              <span className="bg-emerald-600 text-white text-xs px-1.5 py-0.5 rounded-full">Save 30%</span>
            </button>
          </div>

          {/* Plans grid */}
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
              {plans.map(plan => (
                <div
                  key={plan.id}
                  className={`relative glow-border rounded-2xl bg-[#0F0A1E] flex flex-col overflow-hidden transition-transform hover:-translate-y-1 ${
                    plan.id === 'pro' ? 'border-purple-500/60 ring-2 ring-purple-500/30' : ''
                  }`}
                >
                  {/* Badge */}
                  {plan.badge && (
                    <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${PLAN_COLORS[plan.id]}`} />
                  )}
                  {plan.badge && (
                    <div className="absolute top-4 right-4">
                      <span className={`text-xs font-bold text-white px-2.5 py-1 rounded-full bg-gradient-to-r ${PLAN_COLORS[plan.id]}`}>
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  <div className="p-7 flex-1">
                    {/* Icon + Name */}
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${PLAN_COLORS[plan.id]} flex items-center justify-center text-white mb-4`}>
                      {PLAN_ICONS[plan.id]}
                    </div>
                    <h2 className="text-xl font-bold text-white mb-1">{plan.name}</h2>

                    {/* Price */}
                    <div className="flex items-end gap-1 mb-1">
                      <span className="text-slate-400 text-lg">₹</span>
                      <span className="text-4xl font-extrabold text-white">{displayPrice(plan)}</span>
                      <span className="text-slate-400 mb-1">/mo</span>
                    </div>
                    {billing === 'yearly' && (
                      <p className="text-emerald-400 text-sm mb-1">
                        ₹{plan.priceYearly}/year · Save {savings(plan)}%
                      </p>
                    )}
                    {billing === 'monthly' && (
                      <p className="text-slate-500 text-sm mb-1">Billed monthly</p>
                    )}

                    {/* Features */}
                    <ul className="mt-5 space-y-3 mb-8">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                          <Check className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA button */}
                  <div className="p-7 pt-0">
                    <button
                      onClick={() => handlePay(plan.id)}
                      disabled={paying === plan.id}
                      className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-60 bg-gradient-to-r ${PLAN_COLORS[plan.id]} hover:opacity-90 active:scale-95`}
                    >
                      {paying === plan.id ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                      ) : (
                        <>Get {plan.name} <ArrowRight className="w-4 h-4" /></>
                      )}
                    </button>
                    <p className="text-center text-slate-600 text-xs mt-3">
                      Secured by Razorpay · UPI, Cards, Net Banking
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Trust badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
            {[
              { icon: '🔒', title: 'Bank-grade Security', desc: '256-bit SSL encryption. PCI DSS compliant payments via Razorpay.' },
              { icon: '↩️', title: '7-Day Refund Policy', desc: 'Not satisfied? Get a full refund within 7 days of purchase.' },
              { icon: '💳', title: 'All Payment Methods', desc: 'UPI, Debit/Credit Cards, Net Banking, Wallets — all accepted.' },
            ].map(b => (
              <div key={b.title} className="glow-border rounded-xl p-5 bg-[#0F0A1E] flex items-start gap-4">
                <span className="text-2xl">{b.icon}</span>
                <div>
                  <p className="text-white font-semibold text-sm">{b.title}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* FAQ */}
          <div className="glow-border rounded-2xl p-8 bg-[#0F0A1E]">
            <h2 className="text-xl font-bold text-white mb-6 text-center">Frequently Asked Questions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                { q: 'Can I cancel anytime?', a: 'Yes, you can cancel your subscription at any time. You keep access until the end of your billing period.' },
                { q: 'Is there a free trial?', a: 'All plans include a 7-day money-back guarantee. If not satisfied, contact us for a full refund.' },
                { q: 'What payment methods are accepted?', a: 'UPI (Google Pay, PhonePe, Paytm), Debit/Credit Cards (Visa, Mastercard, RuPay), Net Banking, and all major wallets.' },
                { q: 'Can I upgrade/downgrade my plan?', a: 'Yes, you can change your plan anytime. Upgrades are effective immediately with pro-rated billing.' },
              ].map(f => (
                <div key={f.q}>
                  <p className="text-white font-semibold text-sm mb-1.5">{f.q}</p>
                  <p className="text-slate-400 text-sm">{f.a}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
