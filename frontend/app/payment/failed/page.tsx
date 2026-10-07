'use client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { XCircle, RefreshCw, MessageCircle } from 'lucide-react'
import { Suspense } from 'react'

function FailedContent() {
  const params  = useSearchParams()
  const orderId = params.get('order_id') || ''

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-8">
          <div className="w-24 h-24 rounded-full bg-red-900/30 border-2 border-red-500/60 flex items-center justify-center">
            <XCircle className="w-12 h-12 text-red-400" />
          </div>
        </div>

        <h1 className="text-3xl font-extrabold text-white mb-3">Payment Failed</h1>
        <p className="text-slate-400 mb-8">
          Something went wrong with your payment. No amount has been deducted. Please try again.
        </p>

        {orderId && (
          <div className="glow-border rounded-xl p-4 bg-[#0F0A1E] mb-8 text-left">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Order ID</span>
              <span className="text-white font-mono text-xs">{orderId}</span>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Link href="/plans"
            className="w-full flex items-center justify-center gap-2 btn-primary text-white font-bold py-3.5 rounded-xl">
            <RefreshCw className="w-4 h-4" /> Try Again
          </Link>
          <a href="mailto:ashutoshkumarpandey@apkaai.com?subject=Payment%20Failed"
            className="w-full flex items-center justify-center gap-2 border border-purple-700/40 hover:border-purple-500 text-slate-300 hover:text-white py-3.5 rounded-xl text-sm font-medium transition-all">
            <MessageCircle className="w-4 h-4" /> Contact Support
          </a>
        </div>

        <div className="mt-8 glow-border rounded-xl p-4 bg-[#0F0A1E] text-left text-sm text-slate-400">
          <p className="font-semibold text-white mb-2">Common reasons for failure:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Insufficient balance in account</li>
            <li>Bank declined the transaction</li>
            <li>Network timeout during payment</li>
            <li>Card / UPI limit exceeded</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default function PaymentFailedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-slate-400">Loading...</div></div>}>
      <FailedContent />
    </Suspense>
  )
}
