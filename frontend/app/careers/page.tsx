import Link from 'next/link'
import { Mail, MapPin, Zap, ArrowRight } from 'lucide-react'

const openings = [
  {
    title: 'AI Content Writer',
    type: 'Remote · Full-time',
    dept: 'Content',
    emoji: '✍️',
    desc: 'Write in-depth reviews, comparisons, and guides about AI tools. Must have strong interest in AI and excellent writing skills.',
    skills: ['AI knowledge', 'SEO writing', 'Research', 'Hindi/English'],
  },
  {
    title: 'Frontend Developer',
    type: 'Remote · Part-time / Full-time',
    dept: 'Engineering',
    emoji: '💻',
    desc: 'Build and improve the ApkaAI platform using Next.js, TypeScript, and Tailwind CSS. Experience with React required.',
    skills: ['React/Next.js', 'TypeScript', 'Tailwind CSS', 'Node.js'],
  },
  {
    title: 'Social Media Manager',
    type: 'Remote · Part-time',
    dept: 'Marketing',
    emoji: '📱',
    desc: 'Grow our presence on LinkedIn, Twitter, Instagram, and YouTube. Create engaging content about AI tools for Indian audiences.',
    skills: ['Social media', 'Content creation', 'AI tools', 'Analytics'],
  },
  {
    title: 'Business Development',
    type: 'Greater Noida / Remote',
    dept: 'Sales',
    emoji: '📈',
    desc: 'Build partnerships with AI companies, negotiate listing deals, and grow ApkaAI revenue through affiliate and sponsored content.',
    skills: ['Sales', 'Negotiation', 'AI industry', 'B2B'],
  },
]

const perks = [
  { emoji: '🏠', title: 'Remote First', desc: 'Work from anywhere in India' },
  { emoji: '🤖', title: 'AI-native Company', desc: 'We use the best AI tools ourselves' },
  { emoji: '📚', title: 'Learning Budget', desc: 'Access to AI tool subscriptions' },
  { emoji: '🚀', title: 'Early Stage Equity', desc: 'Grow with us from the ground up' },
  { emoji: '🎯', title: 'Real Impact', desc: 'Your work reaches 10K+ users' },
  { emoji: '🇮🇳', title: 'India Focused', desc: 'Building for Indian users first' },
]

export default function CareersPage() {
  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-purple-900/40 border border-purple-700/50 rounded-full px-4 py-2 text-sm text-purple-300 mb-6">
            <Zap className="w-4 h-4" fill="currentColor" />
            We are hiring!
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4">
            Join the ApkaAI Team
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Help us build India&apos;s #1 AI tools marketplace. We are a small, passionate
            team based in Greater Noida working remotely across India.
          </p>
        </div>

        {/* Perks */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-14">
          {perks.map(p => (
            <div key={p.title} className="glow-border rounded-xl p-5 bg-[#0F0A1E]">
              <div className="text-2xl mb-2">{p.emoji}</div>
              <div className="font-bold text-white text-sm">{p.title}</div>
              <div className="text-slate-400 text-xs mt-1">{p.desc}</div>
            </div>
          ))}
        </div>

        {/* Open Roles */}
        <h2 className="text-2xl font-extrabold text-white mb-6">Open Positions</h2>
        <div className="space-y-5 mb-14">
          {openings.map(job => (
            <div key={job.title} className="glow-border rounded-2xl p-7 bg-[#0F0A1E]">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-4">
                  <div className="text-3xl">{job.emoji}</div>
                  <div>
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <h3 className="font-extrabold text-white text-lg">{job.title}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300 border border-purple-700/40">{job.dept}</span>
                    </div>
                    <p className="text-slate-400 text-sm mb-3">{job.type}</p>
                    <p className="text-slate-300 text-sm leading-relaxed mb-4">{job.desc}</p>
                    <div className="flex flex-wrap gap-2">
                      {job.skills.map(s => (
                        <span key={s} className="px-2 py-1 rounded-lg bg-purple-950/40 border border-purple-800/40 text-purple-300 text-xs">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <a
                  href={`mailto:ashutoshkumarpandey@apkaai.com?subject=Application for ${job.title}&body=Hi Ashutosh,%0A%0AI am applying for the ${job.title} position at ApkaAI.%0A%0AAbout me:%0A`}
                  className="btn-primary flex items-center gap-2 text-white text-sm font-bold px-5 py-2.5 rounded-xl flex-shrink-0"
                >
                  Apply Now <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* General Application */}
        <div className="glow-border rounded-2xl p-10 bg-gradient-to-br from-purple-900/20 to-[#0F0A1E] text-center">
          <h2 className="text-2xl font-extrabold text-white mb-3">Don&apos;t see your role?</h2>
          <p className="text-slate-400 mb-6 max-w-xl mx-auto">
            We&apos;re always looking for talented people who are passionate about AI. Send us
            your resume and tell us how you can contribute to ApkaAI.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="mailto:ashutoshkumarpandey@apkaai.com?subject=General Application - ApkaAI"
              className="btn-primary inline-flex items-center gap-2 text-white font-bold px-8 py-3.5 rounded-xl"
            >
              <Mail className="w-5 h-5" /> Send Open Application
            </a>
            <div className="flex items-center gap-2 text-slate-400 text-sm justify-center">
              <MapPin className="w-4 h-4" />
              <a href="https://maps.google.com/?q=Ace+City,+Greater+Noida,+Uttar+Pradesh,+India"
                target="_blank" rel="noopener noreferrer"
                className="hover:text-purple-400 transition-colors">
                Ace City, Greater Noida, UP
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
