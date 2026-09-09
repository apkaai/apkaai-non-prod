import { Star, MessageSquare } from 'lucide-react'

const testimonials = [
  {
    avatar: '👩‍💻',
    name: 'Priya Sharma',
    role: 'Freelance Designer, Mumbai',
    stars: 5,
    text: 'ApkaAI saved me hours of research. I found Midjourney, Canva AI and Runway all in one place and could compare their pricing in INR. No more converting dollars manually!',
  },
  {
    avatar: '👨‍🎓',
    name: 'Rahul Verma',
    role: 'CS Student, IIT Delhi',
    stars: 5,
    text: "The comparison tool is incredible. I was choosing between Cursor and GitHub Copilot for coding — the side-by-side view made it an easy call. Cursor won hands down.",
  },
  {
    avatar: '👩‍💼',
    name: 'Sneha Gupta',
    role: 'Content Marketing Lead, Bangalore',
    stars: 5,
    text: "I didn't know half these AI writing tools existed until I found ApkaAI. The category browsing is super clean and every tool page has exactly the info I need.",
  },
  {
    avatar: '🧑‍🏫',
    name: 'Amit Joshi',
    role: 'Online Educator, Pune',
    stars: 5,
    text: 'Discovered ElevenLabs through ApkaAI for my course voiceovers — complete game changer. The free tier info saved me ₹6,000 before I was sure about committing.',
  },
  {
    avatar: '👨‍💻',
    name: 'Vikram Nair',
    role: 'Startup Founder, Hyderabad',
    stars: 5,
    text: "As a solo founder I need AI tools for everything — writing, coding, presentations, automation. ApkaAI is my go-to reference. I check it before subscribing to anything.",
  },
  {
    avatar: '👩‍🔬',
    name: 'Divya Menon',
    role: 'Research Analyst, Chennai',
    stars: 5,
    text: 'The Research & Productivity category is a goldmine. Perplexity, Notion AI, all verified and accurate. Exactly what I needed for my workflow.',
  },
]

export default function TestimonialsSection() {
  return (
    <section className="py-24 px-4 bg-[#0A0618]">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-14">
          <span className="text-purple-400 text-sm font-semibold uppercase tracking-wider">
            Loved by Users
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 mt-3">
            What Our Community Says
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Professionals, students and creators across the World trust ApkaAI to find the right AI tools.
          </p>
        </div>

        {/* Testimonial grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map(({ avatar, name, role, stars, text }) => (
            <div
              key={name}
              className="glow-border rounded-xl p-6 bg-[#0F0A1E] hover:bg-purple-950/20 group transition-all duration-300 hover:-translate-y-1 flex flex-col gap-4"
            >
              {/* Quote icon */}
              <MessageSquare className="w-6 h-6 text-purple-700/60 flex-shrink-0" />

              {/* Review text */}
              <p className="text-slate-300 text-sm leading-relaxed flex-1">{text}</p>

              {/* Stars */}
              <div className="flex items-center gap-0.5">
                {Array.from({ length: stars }).map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>

              {/* Author */}
              <div className="flex items-center gap-3 pt-3 border-t border-purple-900/30">
                <div className="w-10 h-10 rounded-full bg-purple-900/50 border border-purple-700/30 flex items-center justify-center text-xl flex-shrink-0">
                  {avatar}
                </div>
                <div>
                  <div className="text-white text-sm font-semibold">{name}</div>
                  <div className="text-slate-500 text-xs">{role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Aggregate rating */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6 text-center sm:text-left">
          <div>
            <span className="text-5xl font-extrabold text-white">4.7</span>
            <div className="flex items-center gap-1 mt-1 justify-center sm:justify-start">
              {[1,2,3,4,5].map(s => (
                <Star key={s} className="w-4 h-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
          </div>
          <div className="w-px h-12 bg-purple-900/40 hidden sm:block" />
          <div className="text-slate-400 text-sm">
            <div className="text-white font-semibold text-lg">280+ Users</div>
            have discovered their favourite AI tools through ApkaAI
          </div>
        </div>
      </div>
    </section>
  )
}
