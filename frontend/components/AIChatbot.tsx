'use client'
import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'

/* ─────────────────────────────────────────────────────────────────────────────
   ApkaAI Knowledge Base — used to answer user questions
───────────────────────────────────────────────────────────────────────────── */
const KB: Record<string, string> = {
  // What is ApkaAI
  'what is apkaai': 'ApkaAI is India\'s #1 AI tools marketplace. We help you discover, compare and access 43 premium AI tools — ChatGPT, Claude, Midjourney, Cursor and more — all in one place.',
  'about apkaai': 'ApkaAI is built by Ashutosh Kumar Pandey. Our mission is to make AI tools accessible to every professional, creator and student in India by curating the best tools and showing accurate pricing in INR.',
  'what does apkaai do': 'ApkaAI lets you browse 43 hand-picked AI tools across 15 categories, compare them side-by-side on pricing and features, and get direct links to subscribe at the best price.',

  // How it works
  'how does it work': 'Browse our directory of 43 AI tools → use our comparison tool to pick the right one → click through to the official website to subscribe. No account needed to browse!',
  'how to get started': 'Simply go to apkaai.com, click "All Tools" or browse by category. No sign-up required to explore. Create a free account to save your favourites.',
  'how to use': 'Use the search bar to find specific tools, browse by category (Chat, Code, Image, Video etc.), or use our Compare tool to see up to 4 tools side by side.',

  // Tools
  'how many tools': 'We currently list 43 hand-picked AI tools across 15 categories, updated regularly.',
  'what tools': 'We cover ChatGPT, Claude, Gemini, Midjourney, Cursor, Runway, ElevenLabs, Suno, GitHub Copilot, Perplexity, Notion AI, and 32 more tools.',
  'categories': 'Our 15 categories include: AI Chat & Research, Writing & Content, Image Generation, Video Generation, Music & Audio, Coding, Presentations, Research & Productivity, Design, Voice & Avatars, Automation, Business & Marketing, Meetings & Transcription, Learning, and AI Search.',
  'best ai tool': 'The most popular tools on ApkaAI are ChatGPT (4.8★), Claude (4.7★), and Midjourney (4.8★). Use our comparison tool to find the best one for your specific needs.',
  'free tools': 'Several tools offer free tiers: ChatGPT (free plan with GPT-4o mini), Claude (free plan), Gemini (free plan), GitHub Copilot (free for students), and more. Filter by "Free" on our tools page.',

  // Pricing
  'pricing': 'All prices on ApkaAI are shown in Indian Rupees (INR). Tools range from free to ₹8,000+/month. We always show the most affordable plan first.',
  'how much': 'Pricing varies by tool. ChatGPT Plus is ₹1,650/mo, Claude Pro is ₹1,650/mo, Midjourney starts at ₹830/mo. Visit each tool\'s page for full pricing details.',
  'free': 'Yes! Browsing ApkaAI is completely free. Many AI tools also offer free tiers. No credit card needed to explore our directory.',
  'inr': 'Yes, all prices are displayed in Indian Rupees (INR) for easy comparison without currency conversion.',
  'plan': 'Each tool page shows all available plans side-by-side — Free, Freemium, and Paid — with feature breakdowns so you can pick the right tier.',

  // Comparison
  'compare': 'Our comparison tool lets you select up to 4 AI tools and compare them on pricing, features, and ratings side-by-side. Go to apkaai.com/compare to try it.',
  'comparison': 'Select any tools from the Compare page and see a detailed side-by-side breakdown of features, pricing in INR, and user ratings.',

  // Account
  'account': 'You can browse all 43 AI tools without an account. Create a free account to save favourites and get personalised recommendations.',
  'sign up': 'Sign up for free at apkaai.com/signup. We only ask for your name and email — no credit card required.',
  'sign in': 'Sign in at apkaai.com/signin with your email and password.',
  'forgot password': 'Reset your password at apkaai.com/forgot-password. Enter your email and we\'ll send a reset link.',
  'login': 'Log in at apkaai.com/signin. If you\'ve forgotten your password, use apkaai.com/forgot-password.',

  // Contact
  'contact': 'Email us at ashutoshkumarpandey@apkaai.com — Ashutosh Kumar Pandey personally replies to every message within 24 hours.',
  'email': 'Our email is ashutoshkumarpandey@apkaai.com',
  'support': 'For support, email ashutoshkumarpandey@apkaai.com or visit apkaai.com/contact. We reply within 24 hours.',
  'help': 'Visit apkaai.com/help for our FAQ and help centre, or email ashutoshkumarpandey@apkaai.com.',
  'location': 'We are based in Ace City, Greater Noida, Uttar Pradesh, India.',
  'address': 'Ace City, Greater Noida, Uttar Pradesh, India.',
  'founder': 'ApkaAI was built by Ashutosh Kumar Pandey. You can reach him at ashutoshkumarpandey@apkaai.com.',

  // Privacy & Security
  'privacy': 'We take your privacy seriously. Read our full Privacy Policy at apkaai.com/privacy.',
  'data': 'We do not sell your data. Your information is used only to improve your experience on ApkaAI. See apkaai.com/privacy for full details.',
  'security': 'ApkaAI uses HTTPS encryption and secure authentication. We never store passwords in plain text.',
  'cookies': 'We use cookies to improve your browsing experience. Read our Cookie Policy at apkaai.com/cookies.',

  // Features
  'features': 'ApkaAI features: 43 curated AI tools, 15 categories, side-by-side comparison, INR pricing, real user ratings, free/paid plan breakdowns, and a search tool.',
  'search': 'Use the search bar in the top navigation to instantly find any AI tool by name or keyword.',
  'ratings': 'All tool ratings are aggregated from real user reviews across the internet, giving you an honest view of each tool\'s quality.',

  // List tool / partnership
  'list my tool': 'To list your AI tool on ApkaAI, email ashutoshkumarpandey@apkaai.com with your tool name, website, category, and a brief description. We review all submissions within 48 hours.',
  'advertise': 'For advertising and partnership opportunities, email ashutoshkumarpandey@apkaai.com.',
  'partner': 'We offer featured listings and sponsored content. Contact ashutoshkumarpandey@apkaai.com for partnership details.',
  'affiliate': 'We are building an affiliate programme. Email ashutoshkumarpandey@apkaai.com to be notified when it launches.',

  // Social
  'twitter': 'Follow us on Twitter/X: @apkaAI2026 — https://x.com/apkaAI2026',
  'linkedin': 'Follow us on LinkedIn: https://www.linkedin.com/company/apkaai/',
  'social media': 'Find us on Twitter (@apkaAI2026), LinkedIn (ApkaAI), and Instagram (@apkaai).',
}

/* Simple intent matcher — finds the best KB entry for a user message */
function getAnswer(msg: string): string {
  const q = msg.toLowerCase().replace(/[?!.,]/g, '').trim()

  // Direct key match
  for (const key of Object.keys(KB)) {
    if (q.includes(key)) return KB[key]
  }

  // Word-level partial match — score each entry
  const words = q.split(/\s+/)
  let best = ''
  let bestScore = 0
  for (const [key, val] of Object.entries(KB)) {
    const score = words.filter(w => w.length > 2 && key.includes(w)).length
    if (score > bestScore) { bestScore = score; best = val }
  }
  if (bestScore > 0) return best

  // Fallback
  return "I'm not sure about that yet! For the most accurate answer, email us at ashutoshkumarpandey@apkaai.com or visit apkaai.com/help — we reply within 24 hours. 😊"
}

/* ─────────────────────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────────────────────── */
interface Message {
  role: 'bot' | 'user'
  text: string
}

const QUICK_REPLIES = [
  'What is ApkaAI?',
  'How does it work?',
  'Show me free tools',
  'How to compare tools?',
  'Pricing info',
  'Contact support',
]

/* ─────────────────────────────────────────────────────────────────────────────
   Component
───────────────────────────────────────────────────────────────────────────── */
export default function AIChatbot() {
  const [open, setOpen]       = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: "👋 Hi! I'm ApkaAI Assistant. Ask me anything about our AI tools marketplace — pricing, features, how to get started, and more!" }
  ])
  const [input, setInput]     = useState('')
  const [typing, setTyping]   = useState(false)
  const bottomRef             = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const send = (text: string) => {
    if (!text.trim()) return
    const userMsg: Message = { role: 'user', text: text.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setTyping(true)
    setTimeout(() => {
      const answer = getAnswer(text)
      setMessages(prev => [...prev, { role: 'bot', text: answer }])
      setTyping(false)
    }, 600)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    send(input)
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Chat window — slides up above the button */}
      {open && (
        <div className="w-[300px] sm:w-[350px] bg-[#0F0A1E] border border-purple-700/50 rounded-2xl shadow-[0_0_40px_rgba(124,58,237,0.35)] overflow-hidden flex flex-col mb-2"
          style={{ height: '460px' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-900/60 to-violet-900/40 border-b border-purple-700/30">
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2 border-purple-500/50 bg-[#0F0A1E] flex items-center justify-center">
              <Image src="/apkaai-logo.png" alt="ApkaAI Assistant" width={40} height={40} className="object-contain w-full h-full rounded-full" />
            </div>
            <div className="flex-1">
              <div className="text-white text-sm font-bold">ApkaAI Assistant</div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                Online — replies instantly
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-purple-900/40">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'bot' && (
                  <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 mr-2 mt-0.5 border border-purple-600/40 bg-[#0F0A1E] flex items-center justify-center">
                    <Image src="/apkaai-logo.png" alt="" width={28} height={28} className="object-contain w-full h-full rounded-full" />
                  </div>
                )}
                <div className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-purple-700 text-white rounded-br-sm'
                    : 'bg-[#1A1035] text-slate-200 border border-purple-800/30 rounded-bl-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 mr-2 mt-0.5 border border-purple-600/40 bg-[#0F0A1E] flex items-center justify-center">
                  <Image src="/apkaai-logo.png" alt="" width={28} height={28} className="object-contain w-full h-full rounded-full" />
                </div>
                <div className="bg-[#1A1035] border border-purple-800/30 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
                  {[0,1,2].map(d => (
                    <span key={d} className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: `${d * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick replies */}
          <div className="px-3 py-2 flex gap-2 overflow-x-auto border-t border-purple-900/30">
            {QUICK_REPLIES.map(q => (
              <button
                key={q}
                onClick={() => send(q)}
                className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full bg-purple-900/40 border border-purple-700/40 text-purple-300 hover:bg-purple-800/50 hover:text-white transition-all"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="px-3 py-3 border-t border-purple-900/30 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about ApkaAI..."
              className="flex-1 bg-purple-950/40 border border-purple-700/40 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="w-10 h-10 rounded-xl bg-purple-700 hover:bg-purple-600 text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
            </button>
          </form>
        </div>
      )}

      {/* Trigger button — bouncing chatbot */}
      <div className="flex flex-col items-center gap-1">
        <button
          onClick={() => setOpen(prev => !prev)}
          aria-label="Open AI chatbot"
          title="Chat with ApkaAI Assistant"
          className={`bot-bounce relative w-[60px] h-[60px] rounded-full flex items-center justify-center
            bg-gradient-to-br from-purple-700 to-violet-900
            shadow-[0_0_0_3px_rgba(124,58,237,0.5),0_8px_24px_rgba(124,58,237,0.5)]
            active:scale-95 cursor-pointer select-none
            ${open ? 'ring-2 ring-purple-400' : ''}
          `}
        >
          {/* Pulsing ring — only when closed */}
          {!open && (
            <span className="absolute inset-0 rounded-full border-2 border-purple-400/50 animate-ping pointer-events-none" style={{ animationDuration: '2.5s' }} />
          )}
          <Image
            src="/apkaai-logo.png"
            alt="Chat with ApkaAI"
            width={60}
            height={60}
            className="rounded-full object-cover w-full h-full"
            priority
          />
        </button>
        {/* Ground shadow — shrinks as bot goes up */}
        <div className="bot-shadow w-8 h-2 rounded-full bg-purple-900/60 blur-[3px] -mt-1" />
      </div>
    </div>
  )
}
