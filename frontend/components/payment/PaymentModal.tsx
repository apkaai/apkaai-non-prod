'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  X, ShieldCheck, Loader2, AlertCircle,
  CreditCard, Lock, Zap
} from 'lucide-react'
import type { CartItem } from '@/lib/cart-context'
declare global {
  interface Window {
    Razorpay: new (opts: object) => { open: () => void }
  }
}

// Compatible with existing Window.Razorpay declaration in plans/page.tsx
// No duplicate declare global needed here

interface RazorpayResponse {
  razorpay_payment_id: string
  razorpay_order_id:   string
  razorpay_signature:  string
}

const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface PaymentModalProps {
  isOpen:      boolean
  onClose:     () => void
  onSuccess:   (orderId: string, paymentId: string) => void
  items:       CartItem[]
  subtotal:    number
  discount:    number
  tax:         number
  total:       number
  couponCode?: string | null
}

type Step = 'confirm' | 'processing' | 'success' | 'error'


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
function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (typeof window !== 'undefined' && window.Razorpay) { resolve(true); return }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}
export default function PaymentModal({
  items, subtotal, discount, tax, total, couponCode,
  onSuccess, onClose,
}: PaymentModalProps) {
  const [step, setStep]     = useState<Step>('confirm')
  const [error, setError]   = useState('')
  const [statusMsg, setStatusMsg] = useState('Initialising payment...')
  const user = getUser()

  // Load Razorpay script on mount
  useEffect(() => {
    loadRazorpayScript()
  }, [])

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handlePay = useCallback(async () => {
    const token = getToken()
    if (!token) { setError('Please sign in to continue'); setStep('error'); return }

    setStep('processing')
    setError('')

    try {
      // ── 1. Load Razorpay script ──────────────────────────────────────────
      setStatusMsg('Loading payment gateway...')
      const loaded = await loadRazorpayScript()
      if (!loaded || !window.Razorpay) {
        throw new Error('Failed to load Razorpay. Check your internet connection.')
      }

      // ── 2. Create ApkaAI order in DB ─────────────────────────────────────
      setStatusMsg('Creating your order...')
      const orderRes = await fetch(`${API}/orders`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ items, subtotal, discount, tax, total, couponCode }),
      })
      const orderData = await orderRes.json()
      if (!orderRes.ok) throw new Error(orderData.error || 'Failed to create order')
      const apkaaiOrderId = orderData.orderId

      // ── 3. Create Razorpay order ─────────────────────────────────────────
      setStatusMsg('Connecting to payment gateway...')
      const rzpRes = await fetch(`${API}/payment/create-order`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ orderId: apkaaiOrderId }),
      })
      const rzpData = await rzpRes.json()
      if (!rzpRes.ok) throw new Error(rzpData.error || 'Failed to create Razorpay order')

      // ── 4. Open Razorpay checkout ────────────────────────────────────────
      setStatusMsg('Opening payment window...')

      await new Promise<void>((resolve, reject) => {
        const options = {
          key:         rzpData.keyId,
          amount:      rzpData.amount,
          currency:    rzpData.currency || 'INR',
          name:        'ApkaAI',
          description: `${items.length} AI Tool${items.length > 1 ? 's' : ''} Subscription`,
          order_id:    rzpData.razorpayOrderId,
          prefill: {
            name:  user?.name  || '',
            email: user?.email || '',
          },
          theme:  { color: '#7C3AED' },
          notes:  { apkaai_order_id: apkaaiOrderId },
          modal:  {
            ondismiss: () => {
              reject(new Error('PAYMENT_DISMISSED'))
            },
          },
          handler: async (response: any) => {
            try {
              // ── 5. Verify payment on backend ─────────────────────────────
              setStatusMsg('Verifying payment...')
              const verifyRes = await fetch(`${API}/payment/verify`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body:    JSON.stringify({
                  razorpayOrderId:   response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                  orderId:           apkaaiOrderId,
                }),
              })
              const verifyData = await verifyRes.json()
              if (!verifyRes.ok) throw new Error(verifyData.error || 'Payment verification failed')
              resolve()
              onSuccess(apkaaiOrderId, response.razorpay_payment_id)
            } catch (err) {
              reject(err)
            }
          },
        }

        const rzp = new window.Razorpay(options)
        rzp.open()
      })

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Payment failed'
      if (msg === 'PAYMENT_DISMISSED') {
        // User closed the modal — go back to confirm step quietly
        setStep('confirm')
        return
      }
      setError(msg)
      setStep('error')
    }
  }, [items, subtotal, discount, tax, total, couponCode, onSuccess, user])

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(8,5,26,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md bg-[#0F0A1E] border border-purple-800/50 rounded-2xl shadow-2xl overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-purple-900/30">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-purple-400" />
            <span className="text-white font-bold text-sm">Secure Checkout</span>
          </div>
          {step !== 'processing' && (
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-purple-900/30">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ── Confirm step ── */}
        {step === 'confirm' && (
          <div className="p-6">
            {/* Items summary */}
            <div className="space-y-2 mb-5">
              {items.map(item => (
                <div key={item.key} className="flex items-center gap-3 p-3 rounded-xl bg-purple-950/20 border border-purple-900/20">
                  <span className="text-xl flex-shrink-0">{item.toolLogo}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{item.toolName}</p>
                    <p className="text-slate-400 text-xs capitalize">{item.planName} · {item.billingCycle}</p>
                  </div>
                  <p className="text-purple-300 font-bold text-sm flex-shrink-0">{item.planPrice}</p>
                </div>
              ))}
            </div>

            {/* Price breakdown */}
            <div className="space-y-2 text-sm border-t border-purple-900/30 pt-4 mb-5">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span className="text-white">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Discount {couponCode && <span className="text-xs font-mono bg-emerald-900/30 px-1.5 py-0.5 rounded ml-1">{couponCode}</span>}</span>
                  <span>−₹{discount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400">
                <span>GST (18%)</span>
                <span className="text-white">₹{tax.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between font-extrabold text-white border-t border-purple-900/30 pt-2 text-base">
                <span>Total</span>
                <span className="text-purple-300">₹{total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Pay button */}
            <button
              onClick={handlePay}
              className="w-full btn-primary text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm shadow-glow-sm"
            >
              <CreditCard className="w-4 h-4" />
              Pay ₹{total.toLocaleString('en-IN')} with Razorpay
            </button>

            {/* Trust row */}
            <div className="flex items-center justify-center gap-4 mt-4">
              {[
                { icon: <ShieldCheck className="w-3.5 h-3.5" />, label: '256-bit SSL' },
                { icon: <Lock className="w-3.5 h-3.5" />,        label: 'PCI DSS Safe' },
                { icon: <Zap className="w-3.5 h-3.5" />,         label: 'Instant Access' },
              ].map(t => (
                <div key={t.label} className="flex items-center gap-1 text-slate-500 text-xs">
                  <span className="text-purple-400">{t.icon}</span>
                  {t.label}
                </div>
              ))}
            </div>

            <p className="text-center text-slate-600 text-xs mt-3">
              Powered by Razorpay · UPI, Cards, Net Banking, Wallets accepted
            </p>
          </div>
        )}

        {/* ── Processing step ── */}
        {step === 'processing' && (
          <div className="p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-purple-900/30 border border-purple-700/40 flex items-center justify-center mx-auto mb-5">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            </div>
            <p className="text-white font-semibold mb-1">Processing Payment</p>
            <p className="text-slate-400 text-sm">{statusMsg}</p>
            <p className="text-slate-600 text-xs mt-4">Please do not close this window</p>
          </div>
        )}

        {/* ── Error step ── */}
        {step === 'error' && (
          <div className="p-6">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-900/20 border border-red-700/40 text-red-400 mb-5">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Payment Failed</p>
                <p className="text-xs mt-1 text-red-400/80">{error}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setStep('confirm'); setError('') }}
                className="flex-1 btn-primary text-white font-bold py-3 rounded-xl text-sm"
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                className="flex-1 border border-purple-800/40 text-slate-300 hover:text-white font-semibold py-3 rounded-xl text-sm transition-all hover:border-purple-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
