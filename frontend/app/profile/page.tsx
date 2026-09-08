'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { User, Mail, Calendar, Shield, LogOut, ArrowRight, Zap } from 'lucide-react'

interface UserData { userId: string; name: string; email: string; role: string; created_at?: string }

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)

  useEffect(() => {
    const u = localStorage.getItem('apkaai_user') || sessionStorage.getItem('apkaai_user')
    if (!u) { router.replace('/signin'); return }
    try { setUser(JSON.parse(u)) } catch { router.replace('/signin') }
  }, [router])

  const signOut = () => {
    localStorage.removeItem('apkaai_token'); localStorage.removeItem('apkaai_user')
    sessionStorage.removeItem('apkaai_token'); sessionStorage.removeItem('apkaai_user')
    router.push('/')
  }

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-slate-400">Loading profile...</div>
    </div>
  )

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Profile card */}
        <div className="glow-border rounded-2xl p-8 bg-[#0F0A1E] mb-6 text-center">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-violet-700 flex items-center justify-center mx-auto mb-4 text-2xl font-extrabold text-white shadow-glow-md">
            {getInitials(user.name)}
          </div>
          <h1 className="text-2xl font-extrabold text-white">{user.name}</h1>
          <p className="text-slate-400 mt-1">{user.email}</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className={`text-xs px-3 py-1 rounded-full font-semibold ${user.role === 'admin' ? 'bg-purple-600/30 text-purple-300 border border-purple-600/40' : 'bg-slate-700/50 text-slate-300'}`}>
              {user.role === 'admin' ? '🛡️ Admin' : '👤 Member'}
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="glow-border rounded-2xl bg-[#0F0A1E] overflow-hidden mb-6">
          <h2 className="font-bold text-white p-5 border-b border-purple-900/30">Account Details</h2>
          <div className="divide-y divide-purple-900/20">
            {[
              { icon: User,     label: 'Full Name',  value: user.name },
              { icon: Mail,     label: 'Email',      value: user.email },
              { icon: Shield,   label: 'Role',       value: user.role.charAt(0).toUpperCase() + user.role.slice(1) },
              { icon: Calendar, label: 'User ID',    value: user.userId?.slice(0, 16) + '...' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-4 px-5 py-4">
                <div className="w-9 h-9 rounded-lg bg-purple-900/40 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-xs">{label}</p>
                  <p className="text-white text-sm font-medium">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Link href="/tools" className="glow-border rounded-xl p-5 bg-[#0F0A1E] hover:bg-purple-950/20 transition-all group">
            <Zap className="w-6 h-6 text-purple-400 mb-2" />
            <p className="text-white font-semibold text-sm">Browse AI Tools</p>
            <p className="text-slate-400 text-xs mt-0.5">43 tools curated</p>
          </Link>
          <Link href="/compare" className="glow-border rounded-xl p-5 bg-[#0F0A1E] hover:bg-purple-950/20 transition-all group">
            <ArrowRight className="w-6 h-6 text-purple-400 mb-2" />
            <p className="text-white font-semibold text-sm">Compare Tools</p>
            <p className="text-slate-400 text-xs mt-0.5">Side by side</p>
          </Link>
          {user.role === 'admin' && (
            <Link href="/admin" className="glow-border rounded-xl p-5 bg-purple-900/20 border-purple-600/40 hover:bg-purple-900/30 transition-all col-span-2">
              <Shield className="w-6 h-6 text-purple-400 mb-2" />
              <p className="text-white font-semibold text-sm">Admin Panel</p>
              <p className="text-slate-400 text-xs mt-0.5">Manage users, view data lake</p>
            </Link>
          )}
        </div>

        {/* Sign out */}
        <button onClick={signOut}
          className="w-full flex items-center justify-center gap-2 border border-red-700/40 hover:border-red-500 text-red-400 hover:text-red-300 font-semibold py-3 rounded-xl text-sm transition-all bg-red-900/10 hover:bg-red-900/20">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  )
}
