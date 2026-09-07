import Link from 'next/link'
import Image from 'next/image'
import { Twitter, Linkedin, Github, Mail, MapPin, BarChart3 } from 'lucide-react'

const MAPS_URL = 'https://maps.google.com/?q=Ace+City,+Greater+Noida,+Uttar+Pradesh,+India'
const EMAIL    = 'ashutoshkumarpandey@apkaai.com'

const footerLinks = {
  'AI Tools': [
    { label: 'All 43 Tools',       href: '/tools' },
    { label: 'AI Chat & Research',  href: '/category/ai-chat' },
    { label: 'Image Generation',    href: '/category/image-generation' },
    { label: 'Coding Tools',        href: '/category/coding' },
    { label: 'Video Generation',    href: '/category/video-generation' },
    { label: 'Writing & Content',   href: '/category/writing' },
  ],
  'Company': [
    { label: 'About Us',   href: '/about' },
    { label: 'Blog',       href: '/blog' },
    { label: 'Careers',    href: '/careers' },
    { label: 'Contact Us', href: '/contact' },
  ],
  'Support': [
    { label: 'Help Center',      href: '/help' },
    { label: 'Privacy Policy',   href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Cookie Policy',    href: '/cookies' },
  ],
}

const socialLinks = [
  { icon: Twitter,  href: 'https://x.com/apkaAI2026',                            label: 'Twitter',  color: 'hover:border-sky-500 hover:text-sky-400' },
  { icon: Linkedin, href: 'https://www.linkedin.com/in/apkaai-3784a1433/', label: 'LinkedIn', color: 'hover:border-blue-500 hover:text-blue-400' },
  { icon: Github,   href: 'https://github.com/AshutoshPanday/apkaai',      label: 'GitHub',   color: 'hover:border-slate-400 hover:text-white' },
  { icon: Mail,     href: `mailto:${EMAIL}`,                               label: 'Email',    color: 'hover:border-purple-500 hover:text-purple-400' },
]

export default function Footer() {
  return (
    <footer className="border-t border-purple-900/30 bg-[#08051A] mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">

          {/* Brand column */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <Image src="/apkaai-logo.png" alt="ApkaAI Logo" width={28} height={28} className="rounded-lg flex-shrink-0" />
              <span className="text-xl font-extrabold text-white tracking-tight">
                apka<span className="text-purple-400">AI</span>
              </span>
            </Link>

            <p className="text-slate-400 text-sm leading-relaxed max-w-xs mb-5">
              India&apos;s #1 marketplace for AI tools. Discover, compare and access 43 AI tools — ChatGPT, Claude, Midjourney and more — all in one place.
            </p>

            {/* Contact info */}
            <div className="space-y-2.5 mb-5">
              <a href={`mailto:${EMAIL}`}
                className="flex items-center gap-2 text-slate-400 hover:text-purple-400 text-sm transition-colors break-all">
                <Mail className="w-4 h-4 flex-shrink-0" />
                {EMAIL}
              </a>
              <p className="text-slate-500 text-xs pl-6">Contact: Ashutosh Kumar Pandey</p>

              {/* Location — opens Google Maps to Ace City Greater Noida */}
              <a
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-slate-400 hover:text-purple-400 text-sm transition-colors group"
              >
                <MapPin className="w-4 h-4 flex-shrink-0 group-hover:text-purple-400" />
                <span>
                  Ace City, Greater Noida, UP, India
                  <span className="text-slate-600 text-xs ml-1 group-hover:text-purple-500"> ↗</span>
                </span>
              </a>
            </div>

            {/* Social links */}
            <div className="flex items-center gap-3 mb-4">
              {socialLinks.map(({ icon: Icon, href, label, color }) => (
                <a key={label} href={href}
                  target={href.startsWith('http') ? '_blank' : undefined}
                  rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  aria-label={label}
                  className={`p-2 rounded-lg border border-purple-800/40 text-slate-400 transition-all ${color}`}>
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>

            {/* LinkedIn badge */}
            <a href="https://www.linkedin.com/in/apkaai-3784a1433/" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-900/20 border border-blue-700/40 hover:border-blue-500 text-blue-300 hover:text-white text-sm font-medium transition-all">
              <Linkedin className="w-4 h-4" />
              Follow on LinkedIn
            </a>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section}>
              <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-1.5">
                {section === 'AI Tools' && <BarChart3 className="w-4 h-4 text-purple-400" />}
                {section}
              </h3>
              <ul className="space-y-2.5">
                {links.map(link => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-slate-400 hover:text-purple-400 text-sm transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-purple-900/20 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} ApkaAI by Ashutosh Kumar Pandey. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-slate-600 text-xs">
            <Link href="/privacy" className="hover:text-slate-400">Privacy</Link>
            <Link href="/terms"   className="hover:text-slate-400">Terms</Link>
            <Link href="/cookies" className="hover:text-slate-400">Cookies</Link>
            <span>Built with love in India</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
