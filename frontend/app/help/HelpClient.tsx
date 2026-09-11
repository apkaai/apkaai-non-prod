'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Mail, Search, ChevronDown, ChevronUp, MessageSquare, BookOpen, Zap } from 'lucide-react'

const faqs = [
  {
    category: 'General',
    emoji: '💬',
    items: [
      { q: 'What is ApkaAI?', a: 'ApkaAI is India\'s #1 AI tools marketplace. We curate, review, and compare 70+ AI tools across 15 categories so you can find the perfect AI for your needs — all in one place.' },
      { q: 'Is ApkaAI free to use?', a: 'Yes! Browsing, comparing, and discovering AI tools on ApkaAI is completely free. We earn through affiliate partnerships and sponsored listings.' },
      { q: 'How often is the directory updated?', a: 'We update our AI tools directory daily. New tools are added as soon as they launch and pricing is reviewed monthly.' },
      { q: 'How do I submit my AI tool for listing?', a: 'Email us at ashutoshkumarpandey@apkaai.com with your tool name, website, category, and a brief description. We review all submissions within 48 hours.' },
    ]
  },
  {
    category: 'Pricing & Deals',
    emoji: '💰',
    items: [
      { q: 'Are the prices shown accurate?', a: 'We strive to keep all pricing current. Prices are shown in Indian Rupees (INR) for easy comparison. Always verify on the tool\'s official website before purchasing.' },
      { q: 'How do I get the "Get Deal / Discount" offer?', a: 'Click the "Get Deal / Discount" button on any tool page — it takes you directly to the tool\'s website where deals or free trials are available. Some offers are affiliate links.' },
      { q: 'What does "Free Trial" mean?', a: 'Tools marked "Free Trial" offer a limited-time or limited-usage free experience before requiring payment. No payment info is needed unless stated otherwise.' },
      { q: 'What is the difference between Free and Freemium?', a: 'Free tools are completely free forever. Freemium (shown as Premium on our site) tools have a free tier plus paid plans with more features.' },
    ]
  },
  {
    category: 'Comparison Tool',
    emoji: '⚖️',
    items: [
      { q: 'How does the AI Comparison tool work?', a: 'Go to /compare and select up to 4 AI tools. You\'ll see a side-by-side comparison of features, pricing, ratings, and use cases. Use quick-compare presets for popular combinations.' },
      { q: 'Can I compare tools from different categories?', a: 'Yes! You can mix and match tools from any category. For example, compare ChatGPT (Chat), Canva AI (Design), and Cursor (Coding) in one view.' },
    ]
  },
  {
    category: 'Account & Contact',
    emoji: '👤',
    items: [
      { q: 'Do I need an account to use ApkaAI?', a: 'No account is needed to browse, search, compare, or access tool information. ApkaAI is fully open to everyone.' },
      { q: 'How do I contact support?', a: 'Email ashutoshkumarpandey@apkaai.com or use the Contact form at /contact. Ashutosh Kumar Pandey personally reviews all queries and responds within 24 hours.' },
      { q: 'I found wrong information. How do I report it?', a: 'Email ashutoshkumarpandey@apkaai.com with the tool name and the incorrect information. We\'ll fix it within 24 hours.' },
    ]
  },
]

export default function HelpClient() {
  const [open, setOpen] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const allItems = faqs.flatMap(c => c.items.map(i => ({ ...i, cat: c.category })))
  const filtered = search
    ? allItems.filter(i => i.q.toLowerCase().includes(search.toLowerCase()) || i.a.toLowerCase().includes(search.toLowerCase()))
    : null

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-purple-900/40 border border-purple-700/50 rounded-full px-4 py-2 text-sm text-purple-300 mb-6">
            <MessageSquare className="w-4 h-4" />
            Help Center
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4">How can we help?</h1>
          <p className="text-slate-400 text-lg mb-8">Browse our FAQs or search for your question below.</p>
          {/* Search */}
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search help articles..."
              className="w-full bg-[#0F0A1E] border border-purple-800/40 rounded-xl pl-12 pr-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Quick links */}
        {!search && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
            {[
              { icon: BookOpen, label: 'Browse Tools',   href: '/tools' },
              { icon: Zap,      label: 'Compare AI',     href: '/compare' },
              { icon: Mail,     label: 'Contact Us',     href: '/contact' },
              { icon: MessageSquare, label: 'Submit Tool', href: `mailto:ashutoshkumarpandey@apkaai.com?subject=Tool Submission` },
            ].map(({ icon: Icon, label, href }) => (
              <Link key={label} href={href}
                className="glow-border rounded-xl p-5 bg-[#0F0A1E] text-center hover:bg-purple-950/20 transition-all group">
                <Icon className="w-6 h-6 text-purple-400 mx-auto mb-2 group-hover:text-purple-300" />
                <span className="text-white text-sm font-medium">{label}</span>
              </Link>
            ))}
          </div>
        )}

        {/* Search results */}
        {filtered && (
          <div className="mb-10">
            <p className="text-slate-400 text-sm mb-4">{filtered.length} result{filtered.length !== 1 ? 's' : ''} for &ldquo;{search}&rdquo;</p>
            <div className="space-y-3">
              {filtered.map((item, i) => (
                <div key={i} className="glow-border rounded-xl bg-[#0F0A1E] overflow-hidden">
                  <button className="w-full flex items-center justify-between p-5 text-left"
                    onClick={() => setOpen(open === `s${i}` ? null : `s${i}`)}>
                    <span className="font-semibold text-white text-sm pr-4">{item.q}</span>
                    {open === `s${i}` ? <ChevronUp className="w-4 h-4 text-purple-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />}
                  </button>
                  {open === `s${i}` && (
                    <div className="px-5 pb-5 border-t border-purple-900/30 pt-4 text-slate-400 text-sm leading-relaxed">{item.a}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category FAQs */}
        {!search && faqs.map(cat => (
          <div key={cat.category} className="mb-10">
            <h2 className="flex items-center gap-2 text-xl font-extrabold text-white mb-5">
              <span>{cat.emoji}</span>{cat.category}
            </h2>
            <div className="space-y-3">
              {cat.items.map((item, i) => {
                const key = `${cat.category}-${i}`
                return (
                  <div key={key} className="glow-border rounded-xl bg-[#0F0A1E] overflow-hidden">
                    <button className="w-full flex items-center justify-between p-5 text-left"
                      onClick={() => setOpen(open === key ? null : key)}>
                      <span className="font-semibold text-white text-sm pr-4">{item.q}</span>
                      {open === key ? <ChevronUp className="w-4 h-4 text-purple-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />}
                    </button>
                    {open === key && (
                      <div className="px-5 pb-5 border-t border-purple-900/30 pt-4 text-slate-400 text-sm leading-relaxed">{item.a}</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* Still need help */}
        <div className="glow-border rounded-2xl p-10 bg-gradient-to-br from-purple-900/20 to-[#0F0A1E] text-center">
          <h2 className="text-xl font-extrabold text-white mb-3">Still need help?</h2>
          <p className="text-slate-400 mb-6">Contact Ashutosh Kumar Pandey directly and get a response within 24 hours.</p>
          <a
            href="mailto:ashutoshkumarpandey@apkaai.com"
            className="btn-primary inline-flex items-center gap-2 text-white font-bold px-8 py-3.5 rounded-xl"
          >
            <Mail className="w-5 h-5" /> ashutoshkumarpandey@apkaai.com
          </a>
        </div>
      </div>
    </div>
  )
}
