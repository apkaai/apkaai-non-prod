'use client'
import { useState } from 'react'
import { Mail, Linkedin, Twitter, MapPin, Send, CheckCircle, MessageSquare } from 'lucide-react'

const MAPS_URL = 'https://maps.google.com/?q=Ace+City,+Greater+Noida,+Uttar+Pradesh,+India'

const contactInfo = [
  {
    icon: Mail,
    label: 'Email Us',
    value: 'ashutoshkumarpandey@apkaai.com',
    href: 'mailto:ashutoshkumarpandey@apkaai.com',
    desc: 'Contact: Ashutosh Kumar Pandey — replies within 24 hrs',
    external: false,
  },
  {
    icon: Linkedin,
    label: 'LinkedIn',
    value: 'ApkaAI on LinkedIn',
    href: 'https://www.linkedin.com/in/apkaai-3784a1433/',
    desc: 'Connect with us professionally',
    external: true,
  },
  {
    icon: Twitter,
    label: 'Twitter / X',
    value: '@apkaai',
    href: 'https://x.com/apkaAI2026',
    desc: 'Follow for daily AI tool updates',
    external: true,
  },
  {
    icon: MapPin,
    label: 'Location',
    value: 'Ace City, Greater Noida',
    href: MAPS_URL,
    desc: 'Uttar Pradesh, India — click to open in Google Maps',
    external: true,
  },
]

const faqs = [
  { q: 'How do I list my AI tool on ApkaAI?', a: 'Email ashutoshkumarpandey@apkaai.com with your tool name, website, category, and a brief description. We review all submissions within 48 hours.' },
  { q: 'Are the prices shown accurate?', a: 'We update pricing regularly. Always verify on the official website before purchasing. Prices are shown in INR for easy comparison.' },
  { q: 'Can I advertise on ApkaAI?', a: 'Yes! We offer featured listings and sponsored content. Email ashutoshkumarpandey@apkaai.com for partnership details.' },
  { q: 'How do I report incorrect information?', a: 'Email ashutoshkumarpandey@apkaai.com with the tool name and the incorrect details. We fix inaccuracies within 24 hours.' },
  { q: 'Do you offer affiliate programs?', a: "We're building an affiliate program for content creators. Subscribe to our newsletter to be notified when it launches." },
]

export default function ContactPage() {
  const [form, setForm]     = useState({ name: '', email: '', subject: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) { setStatus('sent'); setForm({ name: '', email: '', subject: '', message: '' }) }
      else setStatus('error')
    } catch { setStatus('error') }
  }

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-purple-900/40 border border-purple-700/50 rounded-full px-4 py-2 text-sm text-purple-300 mb-6">
            <MessageSquare className="w-4 h-4" />
            We&apos;d love to hear from you
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4">Get in Touch</h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Questions, partnerships, tool listings, or just want to say hi — Ashutosh Kumar Pandey personally replies to every message.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">

          {/* Contact cards */}
          <div className="space-y-4">
            {contactInfo.map(({ icon: Icon, label, value, href, desc, external }) => (
              <a
                key={label}
                href={href}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
                className="flex items-start gap-4 p-5 glow-border rounded-xl bg-[#0F0A1E] hover:bg-purple-950/20 transition-all group block"
              >
                <div className="w-10 h-10 rounded-lg bg-purple-900/40 border border-purple-700/30 flex items-center justify-center flex-shrink-0 group-hover:border-purple-500 transition-colors">
                  <Icon className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-0.5">{label}</div>
                  <div className="text-white font-semibold text-sm group-hover:text-purple-300 transition-colors">{value}</div>
                  <div className="text-slate-500 text-xs mt-0.5 leading-relaxed">{desc}</div>
                </div>
              </a>
            ))}

            {/* LinkedIn highlight */}
            <a
              href="https://www.linkedin.com/in/apkaai-3784a1433/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-5 rounded-xl bg-gradient-to-r from-blue-900/30 to-purple-900/20 border border-blue-700/40 hover:border-blue-500 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-800/40 flex items-center justify-center flex-shrink-0">
                <Linkedin className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <div className="text-white font-bold text-sm">Follow on LinkedIn</div>
                <div className="text-blue-400 text-xs">linkedin.com/in/apkaai</div>
              </div>
              <span className="text-xs text-blue-400 bg-blue-900/40 px-2 py-1 rounded-full">Follow</span>
            </a>
          </div>

          {/* Contact form */}
          <div className="lg:col-span-2 glow-border rounded-2xl p-8 bg-[#0F0A1E]">
            {status === 'sent' ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <CheckCircle className="w-16 h-16 text-emerald-400 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Message Sent!</h3>
                <p className="text-slate-400 mb-1">Ashutosh Kumar Pandey will get back to you within 24 hours.</p>
                <p className="text-slate-500 text-sm">Reply will come from ashutoshkumarpandey@apkaai.com</p>
                <button onClick={() => setStatus('idle')} className="mt-6 text-purple-400 text-sm hover:text-purple-300">
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-white">Send us a message</h2>
                  <p className="text-slate-500 text-xs mt-1">
                    Your message goes directly to <span className="text-purple-400">Ashutosh Kumar Pandey</span> at ashutoshkumarpandey@apkaai.com
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Your Name</label>
                    <input type="text" required value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      placeholder="Your Name"
                      className="w-full bg-purple-950/30 border border-purple-800/40 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                    <input type="email" required value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      placeholder="you@example.com"
                      className="w-full bg-purple-950/30 border border-purple-800/40 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Subject</label>
                  <select value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
                    className="w-full bg-purple-950/30 border border-purple-800/40 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition">
                    <option value="" className="bg-[#0F0A1E]">Select a topic...</option>
                    <option value="List my AI tool" className="bg-[#0F0A1E]">List my AI tool on ApkaAI</option>
                    <option value="Partnership" className="bg-[#0F0A1E]">Partnership / Advertising</option>
                    <option value="Wrong information" className="bg-[#0F0A1E]">Report wrong information</option>
                    <option value="Feature request" className="bg-[#0F0A1E]">Feature request</option>
                    <option value="General inquiry" className="bg-[#0F0A1E]">General inquiry</option>
                    <option value="Other" className="bg-[#0F0A1E]">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Message</label>
                  <textarea required rows={5} value={form.message}
                    onChange={e => setForm({ ...form, message: e.target.value })}
                    placeholder="Tell us how we can help..."
                    className="w-full bg-purple-950/30 border border-purple-800/40 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition resize-none" />
                </div>
                {status === 'error' && (
                  <p className="text-red-400 text-sm">
                    Something went wrong. Email us directly at{' '}
                    <a href="mailto:ashutoshkumarpandey@apkaai.com" className="underline">ashutoshkumarpandey@apkaai.com</a>
                  </p>
                )}
                <button type="submit" disabled={status === 'sending'}
                  className="btn-primary flex items-center gap-2 text-white font-bold px-8 py-3.5 rounded-xl w-full justify-center disabled:opacity-60">
                  <Send className="w-4 h-4" />
                  {status === 'sending' ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-2xl font-extrabold text-white mb-6 text-center">Frequently Asked Questions</h2>
          <div className="max-w-3xl mx-auto space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="glow-border rounded-xl bg-[#0F0A1E] overflow-hidden">
                <button className="w-full flex items-center justify-between p-5 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span className="font-semibold text-white text-sm pr-4">{faq.q}</span>
                  <span className={`text-purple-400 flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-slate-400 text-sm leading-relaxed border-t border-purple-900/30 pt-4">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
