import Link from 'next/link'
import { ArrowRight, Clock, User, Tag } from 'lucide-react'

const posts = [
  {
    slug: 'best-ai-tools-2026',
    title: 'Best AI Tools of 2026: The Complete Guide',
    excerpt: 'From ChatGPT to Cursor, Midjourney to ElevenLabs — we rank the top 20 AI tools you absolutely need to know about this year.',
    category: 'Roundup',
    emoji: '🏆',
    readTime: '8 min read',
    author: 'ApkaAI Team',
    date: 'Sep 1, 2026',
    featured: true,
    tags: ['ChatGPT', 'Claude', 'Midjourney', 'Cursor'],
  },
  {
    slug: 'chatgpt-vs-claude-vs-gemini',
    title: 'ChatGPT vs Claude vs Gemini: Which AI is Best in 2026?',
    excerpt: 'We tested all three leading AI assistants on 50 real-world tasks. Here\'s our detailed comparison of coding, writing, reasoning, and creativity.',
    category: 'Comparison',
    emoji: '⚔️',
    readTime: '12 min read',
    author: 'ApkaAI Team',
    date: 'Aug 28, 2026',
    featured: true,
    tags: ['ChatGPT', 'Claude', 'Gemini', 'Comparison'],
  },
  {
    slug: 'cursor-vs-github-copilot',
    title: 'Cursor vs GitHub Copilot: Which Coding AI Wins?',
    excerpt: 'Both are excellent AI coding tools, but they serve different needs. Here\'s how to choose between Cursor and GitHub Copilot for your workflow.',
    category: 'Comparison',
    emoji: '💻',
    readTime: '7 min read',
    author: 'ApkaAI Team',
    date: 'Aug 25, 2026',
    featured: false,
    tags: ['Cursor', 'GitHub Copilot', 'Coding', 'IDE'],
  },
  {
    slug: 'midjourney-vs-dall-e-3',
    title: 'Midjourney vs DALL-E 3 vs Ideogram: Best AI Image Generator?',
    excerpt: 'We generated 200+ images with each tool. Here\'s how they compare on quality, speed, prompt following, and value for money.',
    category: 'Comparison',
    emoji: '🎨',
    readTime: '10 min read',
    author: 'ApkaAI Team',
    date: 'Aug 20, 2026',
    featured: false,
    tags: ['Midjourney', 'DALL-E 3', 'Ideogram', 'Image AI'],
  },
  {
    slug: 'free-ai-tools-2026',
    title: '15 Best Free AI Tools You Can Use Right Now (No Credit Card)',
    excerpt: 'You don\'t need to spend a rupee to access powerful AI. Here are the 15 best completely free AI tools available in 2026.',
    category: 'Guide',
    emoji: '🆓',
    readTime: '6 min read',
    author: 'ApkaAI Team',
    date: 'Aug 18, 2026',
    featured: false,
    tags: ['Free AI', 'Budget', 'Beginners'],
  },
  {
    slug: 'ai-tools-for-content-creators',
    title: 'Top 10 AI Tools Every Content Creator Needs in 2026',
    excerpt: 'From writing to video, music to design — these 10 AI tools will supercharge your content creation workflow and save you hours every week.',
    category: 'Guide',
    emoji: '✍️',
    readTime: '8 min read',
    author: 'ApkaAI Team',
    date: 'Aug 15, 2026',
    featured: false,
    tags: ['Content', 'Writing', 'Video', 'Design'],
  },
  {
    slug: 'suno-vs-udio-music-ai',
    title: 'Suno vs Udio: Which AI Music Generator is Better?',
    excerpt: 'Both can create full songs from text in seconds. But which one produces better music? We compared 100 generations across genres.',
    category: 'Comparison',
    emoji: '🎵',
    readTime: '6 min read',
    author: 'ApkaAI Team',
    date: 'Aug 12, 2026',
    featured: false,
    tags: ['Suno', 'Udio', 'Music AI', 'Comparison'],
  },
  {
    slug: 'ai-automation-beginners-guide',
    title: 'AI Automation for Beginners: Zapier, Make, and n8n Explained',
    excerpt: 'Automate repetitive tasks with AI tools — no coding required. This beginner\'s guide walks you through setting up your first automation.',
    category: 'Tutorial',
    emoji: '🤖',
    readTime: '9 min read',
    author: 'ApkaAI Team',
    date: 'Aug 8, 2026',
    featured: false,
    tags: ['Automation', 'Zapier', 'Make', 'n8n'],
  },
  {
    slug: 'heygen-synthesia-avatar-video',
    title: 'HeyGen vs Synthesia: Best AI Avatar Video Tool for Business?',
    excerpt: 'AI avatar videos are transforming corporate training and marketing. We compare HeyGen and Synthesia on quality, pricing, and ease of use.',
    category: 'Comparison',
    emoji: '🎬',
    readTime: '7 min read',
    author: 'ApkaAI Team',
    date: 'Aug 5, 2026',
    featured: false,
    tags: ['HeyGen', 'Synthesia', 'Video', 'Avatar'],
  },
]

const categoryColors: Record<string, string> = {
  Roundup: 'bg-purple-900/50 text-purple-300',
  Comparison: 'bg-blue-900/50 text-blue-300',
  Guide: 'bg-emerald-900/50 text-emerald-300',
  Tutorial: 'bg-amber-900/50 text-amber-300',
}

export default function BlogPage() {
  const featured = posts.filter(p => p.featured)
  const rest = posts.filter(p => !p.featured)

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-14">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4">
            ApkaAI Blog
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            In-depth guides, comparisons, and reviews of the best AI tools — written for Indian creators, developers, and businesses.
          </p>
        </div>

        {/* Featured posts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-14">
          {featured.map(post => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="block group">
              <div className="glow-border rounded-2xl p-7 bg-[#0F0A1E] h-full hover:bg-purple-950/20 transition-all group-hover:-translate-y-1">
                <div className="flex items-start justify-between mb-4">
                  <span className="text-4xl">{post.emoji}</span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${categoryColors[post.category]}`}>
                    {post.category}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white mb-3 group-hover:text-purple-300 transition-colors leading-snug">
                  {post.title}
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed mb-5">
                  {post.excerpt}
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {post.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded bg-purple-900/40 text-purple-300 text-xs">#{tag}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between text-slate-500 text-xs border-t border-purple-900/30 pt-4">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{post.author}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{post.readTime}</span>
                  </div>
                  <span>{post.date}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* All posts */}
        <h2 className="text-2xl font-extrabold text-white mb-6">Latest Articles</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {rest.map(post => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="block group">
              <div className="glow-border rounded-xl p-5 bg-[#0F0A1E] h-full hover:bg-purple-950/20 transition-all group-hover:-translate-y-1">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">{post.emoji}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${categoryColors[post.category]}`}>
                    {post.category}
                  </span>
                </div>
                <h3 className="font-bold text-white text-sm mb-2 group-hover:text-purple-300 transition-colors leading-snug">
                  {post.title}
                </h3>
                <p className="text-slate-500 text-xs leading-relaxed mb-3 line-clamp-2">
                  {post.excerpt}
                </p>
                <div className="flex items-center justify-between text-slate-500 text-xs">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{post.readTime}</span>
                  <span className="flex items-center gap-1 text-purple-400 group-hover:text-purple-300">
                    Read <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Newsletter */}
        <div className="mt-16 glow-border rounded-2xl p-10 bg-gradient-to-br from-purple-900/20 to-[#0F0A1E] text-center">
          <h2 className="text-2xl font-extrabold text-white mb-3">Stay updated on AI tools</h2>
          <p className="text-slate-400 mb-6">Get our weekly digest of the best new AI tools, comparisons, and guides — straight to your inbox.</p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="your@email.com"
              className="flex-1 bg-[#0F0A1E] border border-purple-800/40 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
            <button className="btn-primary text-white font-bold px-6 py-3 rounded-xl text-sm whitespace-nowrap">
              Subscribe Free
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
