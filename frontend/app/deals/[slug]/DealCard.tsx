'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Tag, Copy, Check, ExternalLink } from 'lucide-react'

interface Deal {
  code: string
  discount: string
  description: string
  expires?: string
}

interface DealCardProps {
  deal: Deal
  toolName: string
}

export default function DealCard({ deal }: DealCardProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(deal.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // fallback for older browsers
      const el = document.createElement('textarea')
      el.value = deal.code
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  return (
    <div className="glow-border rounded-2xl bg-[#0F0A1E] p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        {/* Left — description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="w-4 h-4 text-purple-400" />
            <span className="text-purple-300 font-semibold text-sm">{deal.discount} Discount</span>
          </div>
          <p className="text-slate-300 text-sm mb-2">{deal.description}</p>
          {deal.expires && (
            <p className="text-slate-500 text-xs">Expires: {deal.expires}</p>
          )}
        </div>

        {/* Right — coupon code + actions */}
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          {/* Dashed coupon code box */}
          <div className="bg-purple-950/60 border border-purple-700/40 border-dashed rounded-xl px-4 py-2.5 font-mono text-purple-300 font-bold text-sm tracking-widest select-all">
            {deal.code}
          </div>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
              copied
                ? 'bg-emerald-600/30 border border-emerald-600/50 text-emerald-300'
                : 'btn-primary text-white'
            }`}
          >
            {copied
              ? <><Check className="w-3.5 h-3.5" /> Copied!</>
              : <><Copy className="w-3.5 h-3.5" /> Copy Code</>
            }
          </button>

          {/* Go to cart */}
          <Link
            href="/cart"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-purple-700/40 hover:border-purple-500 text-slate-300 hover:text-white font-semibold text-sm transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Use in Cart
          </Link>
        </div>
      </div>
    </div>
  )
}
