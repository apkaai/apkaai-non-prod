import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import CategoryCard from '@/components/CategoryCard'
import { categories } from '@/lib/tools-data'

export default function CategoriesSection() {
  return (
    <section id="categories" className="py-24 px-4 bg-[#0A0618]">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="text-center mb-14">
          <span className="text-purple-400 text-sm font-semibold uppercase tracking-wider">
            Browse by Category
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 mt-3">
            Every AI Use Case, Covered
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            From conversational chat to code generation, image creation to business automation —
            we have the right AI tool for your workflow.
          </p>
        </div>

        {/* Category grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {categories.map(cat => (
            <CategoryCard key={cat.id} category={cat} />
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Link
            href="/tools#categories"
            className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 font-semibold text-sm transition-colors group"
          >
            Browse all categories <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  )
}
