import Link from 'next/link'
import { Mail, Linkedin, MapPin, Zap, Users, Globe, Star, TrendingUp } from 'lucide-react'

const stats = [
  { icon: Globe,      value: '43',   label: 'AI Tools Curated' },
  { icon: Users,      value: '280+', label: 'Users Helped' },
  { icon: Star,       value: '4.7',  label: 'Average Rating' },
  { icon: TrendingUp, value: '15',   label: 'Categories' },
]

const team = [
  {
    name: 'Ashutosh Kumar Pandey',
    role: 'Founder & CEO',
    bio: 'AI enthusiast and entrepreneur passionate about making AI tools accessible to every Indian professional, creator, and student.',
    linkedin: 'https://www.linkedin.com/in/apkaai-3784a1433/',
    email: 'ashutoshkumarpandey@apkaai.com',
    avatar: '👨‍💻',
  },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-5xl mx-auto">

        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-purple-900/40 border border-purple-700/50 rounded-full px-4 py-2 text-sm text-purple-300 mb-6">
            <Zap className="w-4 h-4" fill="currentColor" />
            India&apos;s #1 AI Marketplace
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-5">
            About ApkaAI
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
            ApkaAI was built with a simple mission — make the world&apos;s best AI tools
            discoverable, comparable, and accessible to every Indian professional,
            creator, student, and business.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-16">
          {stats.map(({ icon: Icon, value, label }) => (
            <div key={label} className="glow-border rounded-xl p-6 bg-[#0F0A1E] text-center">
              <Icon className="w-6 h-6 text-purple-400 mx-auto mb-3" />
              <div className="text-3xl font-extrabold text-white">{value}</div>
              <div className="text-slate-400 text-sm mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Mission */}
        <div className="glow-border rounded-2xl p-8 bg-[#0F0A1E] mb-10">
          <h2 className="text-2xl font-extrabold text-white mb-4">Our Mission</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            The AI revolution is happening right now — and we believe every Indian
            should have equal access to these transformative tools. Whether you&apos;re a
            freelancer looking to automate your workflow, a student exploring AI for
            research, a marketer creating content at scale, or a developer building
            the next big thing — ApkaAI is your guide.
          </p>
          <p className="text-slate-300 leading-relaxed">
            We curate, review, and compare 43 AI tools across 15 categories so you
            never have to spend hours searching. Every tool on our platform is
            hand-picked, verified, and kept up to date.
          </p>
        </div>

        {/* What we do */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16">
          {[
            { emoji: '🔍', title: 'Discover', desc: 'Find the perfect AI tool for your exact use case from our curated directory of 43 tools.' },
            { emoji: '⚖️', title: 'Compare', desc: 'Compare tools side by side on pricing, features, ratings and real user reviews.' },
            { emoji: '🚀', title: 'Access', desc: 'Get direct links, exclusive deals, and free trial information for every AI tool.' },
          ].map(item => (
            <div key={item.title} className="glow-border rounded-xl p-6 bg-[#0F0A1E]">
              <div className="text-4xl mb-4">{item.emoji}</div>
              <h3 className="font-bold text-white text-lg mb-2">{item.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Team */}
        <div className="mb-16">
          <h2 className="text-2xl font-extrabold text-white mb-8 text-center">Meet the Team</h2>
          <div className="flex justify-center">
            {team.map(member => (
              <div key={member.name} className="glow-border rounded-2xl p-8 bg-[#0F0A1E] max-w-md w-full text-center">
                <div className="text-6xl mb-4">{member.avatar}</div>
                <h3 className="text-xl font-extrabold text-white">{member.name}</h3>
                <p className="text-purple-400 font-medium text-sm mb-3">{member.role}</p>
                <p className="text-slate-400 text-sm leading-relaxed mb-5">{member.bio}</p>
                <div className="flex items-center justify-center gap-3">
                  <a href={`mailto:${member.email}`}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-900/30 border border-purple-700/40 hover:border-purple-500 text-purple-300 hover:text-white text-sm transition-all">
                    <Mail className="w-4 h-4" /> Email
                  </a>
                  <a href={member.linkedin} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-900/30 border border-blue-700/40 hover:border-blue-500 text-blue-300 hover:text-white text-sm transition-all">
                    <Linkedin className="w-4 h-4" /> LinkedIn
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Location */}
        <div className="glow-border rounded-2xl p-8 bg-[#0F0A1E] mb-10">
          <h2 className="text-2xl font-extrabold text-white mb-4">Where We Are</h2>
          <a
            href="https://maps.google.com/?q=Ace+City,+Greater+Noida,+Uttar+Pradesh,+India"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-4 group"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-900/40 border border-purple-700/30 flex items-center justify-center flex-shrink-0 group-hover:border-purple-500 transition-colors">
              <MapPin className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-white font-bold group-hover:text-purple-300 transition-colors">Ace City, Greater Noida</p>
              <p className="text-slate-400 text-sm">Uttar Pradesh, India</p>
              <p className="text-purple-400 text-xs mt-1 group-hover:text-purple-300">Click to open in Google Maps →</p>
            </div>
          </a>
        </div>

        {/* CTA */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Have questions or want to partner with us?</h2>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/contact" className="btn-primary inline-flex items-center gap-2 text-white font-bold px-8 py-3.5 rounded-xl">
              <Mail className="w-5 h-5" /> Contact Us
            </Link>
            <a href="https://www.linkedin.com/in/apkaai-3784a1433/" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-purple-700/40 hover:border-purple-500 text-slate-300 hover:text-white font-semibold px-8 py-3.5 rounded-xl transition-all">
              <Linkedin className="w-5 h-5" /> LinkedIn
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
