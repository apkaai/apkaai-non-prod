'use client'
import { Check, ExternalLink, Lock, Zap } from 'lucide-react'
import { useSubscription } from '@/lib/use-subscription'

interface Props {
  website:   string
  toolName:  string
  freePlan?: { name: string; features: string[] }
  paidPlans: { name: string; price: string; features: string[]; popular?: boolean }[]
}

export default function DealCTAButtons({ website, toolName, freePlan, paidPlans }: Props) {
  const { requirePlan } = useSubscription()

  function openTool(e: React.MouseEvent) {
    e.preventDefault()
    requirePlan(() => window.open(website, '_blank', 'noopener,noreferrer'))
  }

  return (
    <>
      {/* Main CTA */}
      <a href={website} onClick={openTool}
        className="btn-primary inline-flex items-center gap-3 text-white font-bold px-10 py-4 rounded-xl text-lg shadow-glow-md hover:scale-105 transition-all">
        <Zap className="w-5 h-5" fill="white" />
        Claim Best Deal on {toolName}
        <Lock className="w-5 h-5" />
      </a>

      {/* Free plan */}
      {freePlan && (
        <div className="glow-border rounded-2xl p-6 bg-emerald-900/10 border-emerald-700/30 mt-6 text-left">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">🆓</span>
            <div>
              <h2 className="text-lg font-bold text-white">Start Free — No Credit Card</h2>
              <p className="text-emerald-400 text-sm">{freePlan.name} plan is completely free</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            {freePlan.features.map(f => (
              <div key={f} className="flex items-center gap-2 text-sm text-slate-300">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />{f}
              </div>
            ))}
          </div>
          <a href={website} onClick={openTool}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-all">
            Start Free <Lock className="w-4 h-4" />
          </a>
        </div>
      )}

      {/* Paid plans */}
      {paidPlans.length > 0 && (
        <div className="glow-border rounded-2xl p-6 bg-[#0F0A1E] mt-6 text-left">
          <h2 className="text-xl font-bold text-white mb-5">Choose Your Plan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {paidPlans.map(plan => (
              <div key={plan.name}
                className={`rounded-xl p-5 border transition-all ${plan.popular ? 'border-purple-500/60 bg-purple-900/20' : 'border-purple-900/40 bg-purple-950/20'}`}>
                {plan.popular && (
                  <span className="inline-block bg-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded-full mb-2">Most Popular</span>
                )}
                <div className="font-bold text-white text-base mb-1">{plan.name}</div>
                <div className="text-2xl font-extrabold text-purple-300 mb-3">{plan.price}</div>
                <ul className="space-y-1.5 mb-4">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs text-slate-300">
                      <Check className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <a href={website} onClick={openTool}
                  className={`flex items-center justify-center gap-2 w-full font-semibold py-2.5 rounded-xl text-sm transition-all ${plan.popular ? 'btn-primary text-white' : 'border border-purple-700/40 text-slate-300 hover:border-purple-500 hover:text-white'}`}>
                  Get {plan.name} <Lock className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
