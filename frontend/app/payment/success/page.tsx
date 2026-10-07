'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, ArrowRight, Zap } from 'lucide-react'
import { Suspense } from 'react'

const PLAN_NAMES: Record<string, string> = { basic: 'Basic', pro: 'Pro', enterprise: 'Enterprise' }

function SuccessContent() {
  const params    = useSearchParams()
  const planId    = params.get('plan') || ''
  const paymentId = params.get('payment_id') || ''
  const [show, setShow] = useState(false)

  useEffect(() => { setTimeout(() => setShow(true), 100) }, [])

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 transition-all duration-700 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="max-w-md w-full text-center">
        {/* Animated checkmark */}
        <div className="flex justify-center mb-8">
          <div className="w-24 h-24 rounded-full bg-emerald-900/30 border-2 border-emerald-500/60 flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-emerald-400" />
          </div>
        </div>

        <h1 className="text-3xl font-extrabold text-white mb-3">Payment Successful! 🎉</h1>
        <p className="text-slate-400 mb-8">
          Welcome to ApkaAI {PLAN_NAMES[planId] || 'Premium'}! Your account is now active.
        </p>

        {/* Payment details card */}
        <div className="glow-border rounded-2xl p-6 bg-[#0F0A1E] mb-8 text-left space-y-3">
          {planId && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Plan</span>
              <span className="text-white font-semibold">{PLAN_NAMES[planId]} Plan</span>
            </div>
          )}
          {paymentId && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Payment ID</span>
              <span className="text-white font-mono text-xs">{paymentId.slice(0, 20)}...</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Status</span>
            <span className="text-emerald-400 font-semibold">✅ Confirmed</span>
          </div>
        </div>

        <div className="space-y-3">
          <Link href="/tools"
            className="w-full flex items-center justify-center gap-2 btn-primary text-white font-bold py-3.5 rounded-xl">
            <Zap className="w-4 h-4" fill="white" /> Explore All AI Tools
          </Link>
          <Link href="/compare"
            className="w-full flex items-center justify-center gap-2 border border-purple-700/40 hover:border-purple-500 text-slate-300 hover:text-white py-3.5 rounded-xl text-sm font-medium transition-all">
            Try AI Comparison Tool <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <p className="text-slate-600 text-xs mt-6">
          A confirmation has been sent to your email. Need help?{' '}
          <a href="mailto:ashutoshkumarpandey@apkaai.com" className="text-purple-400 hover:underline">Contact support</a>
        </p>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-slate-400">Loading...</div></div>}>
      <SuccessContent />
    </Suspense>
  )
}
