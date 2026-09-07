import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import ToolCard from '@/components/ToolCard'
import { tools } from '@/lib/tools-data'

export default function NewToolsSection() {
  const newTools = tools.filter(t => t.new).slice(0, 4)
  if (newTools.length === 0) return null

  return (
    <section className="py-16 px-4">
      <div className="max-w-7xl mx-auto">

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-emerald-400 text-sm font-semibold uppercase tracking-wider">🆕 Just Added</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Newest AI Tools
            </h2>
            <p className="text-slate-400 text-sm mt-1">Fresh additions to the ApkaAI directory</p>
          </div>
          <Link
            href="/tools?sort=new"
            className="inline-flex items-center gap-1.5 text-purple-400 hover:text-purple-300 text-sm font-semibold transition-colors group"
          >
            See all new <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {newTools.map(tool => (
            <ToolCard key={tool.id} tool={tool} compact />
          ))}
        </div>
      </div>
    </section>
  )
}
