import { Globe, Users, Star, BarChart3, Zap, Shield } from 'lucide-react'

const stats = [
  { icon: Globe,     value: '43',    label: 'AI Tools',       sub: 'hand-picked & verified'    },
  { icon: BarChart3, value: '15',    label: 'Categories',     sub: 'every use case covered'    },
  { icon: Users,     value: '280+',  label: 'Active Users',   sub: 'growing every day'         },
  { icon: Star,      value: '4.7',   label: 'Avg Rating',     sub: 'across all tools'          },
  { icon: Zap,       value: '₹0',    label: 'To Browse',      sub: 'always free to explore'    },
  { icon: Shield,    value: '100%',  label: 'Verified Info',  sub: 'accurate & up-to-date'     },
]

export default function StatsBar() {
  return (
    <section className="py-14 px-4 border-y border-purple-900/20 bg-[#0A0618]">
      <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 lg:gap-4">
        {stats.map(({ icon: Icon, value, label, sub }) => (
          <div key={label} className="text-center group">
            <div className="flex justify-center mb-2">
              <div className="w-9 h-9 rounded-lg bg-purple-900/40 border border-purple-700/30 flex items-center justify-center group-hover:border-purple-500/60 transition-colors">
                <Icon className="w-4 h-4 text-purple-400" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white">{value}</div>
            <div className="text-slate-300 text-sm font-semibold mt-0.5">{label}</div>
            <div className="text-slate-500 text-xs mt-0.5 hidden sm:block">{sub}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
