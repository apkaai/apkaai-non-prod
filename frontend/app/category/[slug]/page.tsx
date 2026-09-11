import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import ToolCard from '@/components/ToolCard'
import { getCategoryBySlug, getToolsByCategory, categories } from '@/lib/tools-data'
import type { Metadata } from 'next'

interface Props {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = getCategoryBySlug(params.slug)
  if (!category) return {}
  const toolCount = getToolsByCategory(params.slug).length
  return {
    title: `${category.name} AI Tools — Top ${toolCount} Picks | ApkaAI`,
    description: `Discover the best ${category.name.toLowerCase()} AI tools. Compare ${toolCount} hand-picked options on pricing, features, and ratings — only on ApkaAI.`,
    alternates: { canonical: `https://apkaai.com/category/${params.slug}` },
  }
}

export async function generateStaticParams() {
  return categories.map(c => ({ slug: c.slug }))
}

export default function CategoryPage({ params }: Props) {
  const category = getCategoryBySlug(params.slug)
  if (!category) notFound()

  const categoryTools = getToolsByCategory(params.slug)

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <Link href="/tools" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-8 transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to All Tools
        </Link>

        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-5xl">{category.emoji}</span>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white">{category.name}</h1>
              <p className="text-slate-400 mt-1">{category.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <span className="px-3 py-1 bg-purple-900/40 border border-purple-700/40 rounded-full text-purple-300 text-sm">
              {categoryTools.length} tools
            </span>
          </div>
        </div>

        {/* Tools Grid */}
        {categoryTools.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {categoryTools.map(tool => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">{category.emoji}</p>
            <h3 className="text-xl font-bold text-white mb-2">Coming Soon</h3>
            <p className="text-slate-400">We&apos;re adding tools to this category. Check back soon!</p>
          </div>
        )}

        {/* Other categories */}
        <section className="mt-20">
          <h2 className="text-xl font-bold text-white mb-6">Explore Other Categories</h2>
          <div className="flex flex-wrap gap-3">
            {categories
              .filter(c => c.slug !== params.slug)
              .map(cat => (
                <Link
                  key={cat.slug}
                  href={`/category/${cat.slug}`}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0F0A1E] border border-purple-800/40 text-slate-300 hover:border-purple-500 hover:text-white text-sm transition-all"
                >
                  <span>{cat.emoji}</span>
                  {cat.name}
                </Link>
              ))}
          </div>
        </section>
      </div>
    </div>
  )
}
