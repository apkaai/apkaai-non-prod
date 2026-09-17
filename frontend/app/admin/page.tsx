'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Users, Mail, BarChart3, Database, LogOut, Shield,
  TrendingUp, Search, RefreshCw, Download, Eye, ChevronRight
} from 'lucide-react'

interface User   { user_id: string; name: string; email: string; role: string; created_at: string }
interface Contact { id: string; name: string; email: string; subject: string; message: string; status: string; created_at: string }

function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ok, setOk] = useState(false)

  useEffect(() => {
    const u = localStorage.getItem('apkaai_user') || sessionStorage.getItem('apkaai_user')
    if (!u) { router.replace('/admin/login'); return }
    try {
      const user = JSON.parse(u)
      if (user.role !== 'admin') { router.replace('/admin/login'); return }
      setOk(true)
    } catch { router.replace('/admin/login') }
  }, [router])

  if (!ok) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-slate-400">Checking access...</div>
    </div>
  )
  return <>{children}</>
}

function signOut() {
  localStorage.removeItem('apkaai_token'); localStorage.removeItem('apkaai_user')
  sessionStorage.removeItem('apkaai_token'); sessionStorage.removeItem('apkaai_user')
  window.location.href = '/admin/login'
}

export default function AdminDashboard() {
  const [tab, setTab]         = useState<'overview'|'users'|'contacts'|'datalake'>('overview')
  const [users, setUsers]     = useState<User[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch]   = useState('')
  const [driveFiles, setDriveFiles] = useState<{ name: string; type: string; modified: string; size: string; link: string }[]>([])
  const [driveLoading, setDriveLoading] = useState(false)

  const token = typeof window !== 'undefined' ? (localStorage.getItem('apkaai_token') || sessionStorage.getItem('apkaai_token')) : ''

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } })
      const d = await r.json()
      setUsers(d.users || [])
    } catch {}
    setLoading(false)
  }

  const fetchContacts = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/contacts', { headers: { Authorization: `Bearer ${token}` } })
      const d = await r.json()
      setContacts(d.contacts || [])
    } catch {}
    setLoading(false)
  }

  const fetchDriveFiles = async () => {
    setDriveLoading(true)
    try {
      const r = await fetch('/api/admin/drive-files', { headers: { Authorization: `Bearer ${token}` } })
      const d = await r.json()
      setDriveFiles(d.files || [])
    } catch {}
    setDriveLoading(false)
  }

  useEffect(() => {
    if (tab === 'users' || tab === 'overview') fetchUsers()
    if (tab === 'contacts') fetchContacts()
    if (tab === 'datalake') { fetchUsers(); fetchContacts(); fetchDriveFiles() }
  }, [tab])

  const filteredUsers    = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
  const filteredContacts = contacts.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()))

  const exportCSV = (data: unknown[], filename: string) => {
    if (!data.length) return
    const keys = Object.keys(data[0] as object)
    const csv  = [keys.join(','), ...data.map(r => keys.map(k => JSON.stringify((r as Record<string,unknown>)[k] ?? '')).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a    = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click()
  }

  const tabs = [
    { id: 'overview', label: 'Overview',  icon: BarChart3 },
    { id: 'users',    label: 'Users',     icon: Users },
    { id: 'contacts', label: 'Contacts',  icon: Mail },
    { id: 'datalake', label: 'Data Lake', icon: Database },
  ] as const

  return (
    <AdminGuard>
      <div className="min-h-screen bg-[#08051A] pt-4">
        {/* Top bar */}
        <div className="border-b border-purple-900/30 bg-[#0F0A1E]/80 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-purple-400" />
              <span className="font-bold text-white">ApkaAI Admin</span>
              <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">Control Panel</span>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/" className="text-slate-400 hover:text-white text-sm transition-colors">View Site</Link>
              <button onClick={signOut} className="flex items-center gap-1.5 text-red-400 hover:text-red-300 text-sm">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Tab nav */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all flex-shrink-0 ${
                  tab === t.id ? 'bg-purple-600 border-purple-500 text-white' : 'bg-[#0F0A1E] border-purple-800/40 text-slate-300 hover:border-purple-600'
                }`}>
                <t.icon className="w-4 h-4" />
                {t.label}
                {t.id === 'users' && users.length > 0 && (
                  <span className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full">{users.length}</span>
                )}
              </button>
            ))}
          </div>

          {/* ── OVERVIEW ─────────────────────────────────────────────────── */}
          {tab === 'overview' && (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Users',     value: users.length,                              icon: Users,      color: 'text-purple-400' },
                  { label: 'Contacts Recv.',  value: contacts.length,                           icon: Mail,       color: 'text-blue-400' },
                  { label: 'AI Tools',        value: 70,                                        icon: BarChart3,  color: 'text-emerald-400' },
                  { label: 'Drive Files',     value: driveFiles.length,                         icon: Database,   color: 'text-amber-400' },
                ].map(s => (
                  <div key={s.label} className="glow-border rounded-xl p-5 bg-[#0F0A1E]">
                    <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
                    <div className="text-3xl font-extrabold text-white">{s.value}</div>
                    <div className="text-slate-400 text-sm mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Recent users */}
              <div className="glow-border rounded-2xl bg-[#0F0A1E] overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-purple-900/30">
                  <h2 className="font-bold text-white">Recent Signups</h2>
                  <button onClick={() => setTab('users')} className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1">
                    View all <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="divide-y divide-purple-900/20">
                  {users.slice(0, 5).map(u => (
                    <div key={u.user_id} className="flex items-center gap-4 px-5 py-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-violet-700 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">{u.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium">{u.name}</p>
                        <p className="text-slate-500 text-xs">{u.email}</p>
                      </div>
                      <p className="text-slate-500 text-xs flex-shrink-0">{new Date(u.created_at).toLocaleDateString('en-IN')}</p>
                    </div>
                  ))}
                  {users.length === 0 && (
                    <div className="px-5 py-8 text-center text-slate-500">No users yet</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── USERS ─────────────────────────────────────────────────────── */}
          {tab === 'users' && (
            <div className="glow-border rounded-2xl bg-[#0F0A1E] overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-purple-900/30 flex-wrap gap-3">
                <h2 className="font-bold text-white">All Registered Users ({users.length})</h2>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                      placeholder="Search users..."
                      className="bg-purple-950/40 border border-purple-800/40 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 w-48" />
                  </div>
                  <button onClick={fetchUsers} className="p-2 text-slate-400 hover:text-white border border-purple-800/40 rounded-lg hover:border-purple-500 transition-all">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button onClick={() => exportCSV(users, 'apkaai-users.csv')}
                    className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-all">
                    <Download className="w-4 h-4" /> Export
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-purple-950/20">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">User</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Joined</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">User ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-900/20">
                    {loading ? (
                      <tr><td colSpan={5} className="text-center py-10 text-slate-500">Loading...</td></tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-10 text-slate-500">No users found</td></tr>
                    ) : filteredUsers.map(u => (
                      <tr key={u.user_id} className="hover:bg-purple-950/20 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-violet-700 flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-xs font-bold">{u.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}</span>
                            </div>
                            <span className="text-white text-sm font-medium">{u.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-slate-300 text-sm">{u.email}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${u.role === 'admin' ? 'bg-purple-600/30 text-purple-300' : 'bg-slate-700/50 text-slate-300'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-400 text-sm">{new Date(u.created_at).toLocaleString('en-IN')}</td>
                        <td className="px-5 py-3 text-slate-600 text-xs font-mono">{u.user_id.slice(0,8)}...</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── CONTACTS ──────────────────────────────────────────────────── */}
          {tab === 'contacts' && (
            <div className="glow-border rounded-2xl bg-[#0F0A1E] overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-purple-900/30 flex-wrap gap-3">
                <h2 className="font-bold text-white">Contact Form Submissions ({contacts.length})</h2>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
                      className="bg-purple-950/40 border border-purple-800/40 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 w-48" />
                  </div>
                  <button onClick={fetchContacts} className="p-2 text-slate-400 hover:text-white border border-purple-800/40 rounded-lg hover:border-purple-500"><RefreshCw className="w-4 h-4" /></button>
                  <button onClick={() => exportCSV(contacts, 'apkaai-contacts.csv')}
                    className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg">
                    <Download className="w-4 h-4" /> Export
                  </button>
                </div>
              </div>
              <div className="divide-y divide-purple-900/20">
                {loading ? (
                  <div className="py-10 text-center text-slate-500">Loading...</div>
                ) : filteredContacts.length === 0 ? (
                  <div className="py-10 text-center text-slate-500">No contacts yet</div>
                ) : filteredContacts.map(c => (
                  <div key={c.id} className="p-5 hover:bg-purple-950/10 transition-colors">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <span className="font-semibold text-white">{c.name}</span>
                          <span className="text-slate-400 text-sm">{c.email}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'new' ? 'bg-emerald-900/40 text-emerald-400' : 'bg-slate-700/40 text-slate-400'}`}>{c.status}</span>
                        </div>
                        <p className="text-purple-300 text-sm font-medium mb-1">{c.subject}</p>
                        <p className="text-slate-400 text-sm line-clamp-2">{c.message}</p>
                      </div>
                      <div className="text-slate-500 text-xs flex-shrink-0">{new Date(c.created_at).toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── DATA LAKE ─────────────────────────────────────────────────── */}
          {tab === 'datalake' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: 'RDS PostgreSQL', status: 'Connected', color: 'text-emerald-400', bg: 'bg-emerald-900/20 border-emerald-700/40', icon: Database, detail: 'apkaai-db.cl8qcg44s0p7.ap-south-1.rds.amazonaws.com' },
                  { label: 'Google Drive',   status: driveFiles.length > 0 ? 'Connected' : 'Pending API Key', color: driveFiles.length > 0 ? 'text-emerald-400' : 'text-amber-400', bg: 'bg-blue-900/20 border-blue-700/40', icon: Database, detail: 'drive.google.com/drive/folders/1DSp2...' },
                  { label: 'Total Records',  status: `${users.length + contacts.length}`, color: 'text-purple-400', bg: 'bg-purple-900/20 border-purple-700/40', icon: TrendingUp, detail: `${users.length} users + ${contacts.length} contacts` },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl p-5 border ${s.bg}`}>
                    <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
                    <div className="font-bold text-white mb-0.5">{s.label}</div>
                    <div className={`text-sm font-semibold ${s.color} mb-1`}>{s.status}</div>
                    <div className="text-slate-500 text-xs truncate">{s.detail}</div>
                  </div>
                ))}
              </div>

              {/* PostgreSQL data */}
              <div className="glow-border rounded-2xl bg-[#0F0A1E] overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-purple-900/30">
                  <h2 className="font-bold text-white flex items-center gap-2"><Database className="w-5 h-5 text-emerald-400" /> PostgreSQL Data</h2>
                  <button onClick={() => exportCSV([...users, ...contacts.map(c => ({...c, type:'contact'}))], 'apkaai-datalake.csv')}
                    className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg">
                    <Download className="w-4 h-4" /> Export All
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-purple-900/30">
                  <div className="p-5">
                    <h3 className="text-white font-semibold mb-3">Users Table ({users.length})</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {users.map(u => (
                        <div key={u.user_id} className="flex items-center gap-2 text-sm">
                          <div className="w-6 h-6 rounded-full bg-purple-600/50 flex items-center justify-center flex-shrink-0 text-white text-xs">{u.name[0]?.toUpperCase()}</div>
                          <span className="text-white flex-1 truncate">{u.name}</span>
                          <span className="text-slate-500 text-xs">{u.email.split('@')[1]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="text-white font-semibold mb-3">Contacts Table ({contacts.length})</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {contacts.map(c => (
                        <div key={c.id} className="flex items-center gap-2 text-sm">
                          <div className="w-6 h-6 rounded-full bg-blue-600/50 flex items-center justify-center flex-shrink-0 text-white text-xs">{c.name[0]?.toUpperCase()}</div>
                          <span className="text-white flex-1 truncate">{c.name}</span>
                          <span className="text-slate-500 text-xs">{c.subject?.slice(0,20)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Google Drive files */}
              <div className="glow-border rounded-2xl bg-[#0F0A1E] overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-purple-900/30">
                  <h2 className="font-bold text-white flex items-center gap-2">
                    <span className="text-xl">📁</span> Google Drive — apkaAI Folder
                  </h2>
                  <button onClick={fetchDriveFiles} disabled={driveLoading}
                    className="p-2 text-slate-400 hover:text-white border border-purple-800/40 rounded-lg hover:border-purple-500">
                    <RefreshCw className={`w-4 h-4 ${driveLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {driveFiles.length > 0 ? (
                  <div className="divide-y divide-purple-900/20">
                    {driveFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-4 px-5 py-3 hover:bg-purple-950/10">
                        <span className="text-xl">{f.type === 'folder' ? '📁' : f.name.endsWith('.xlsx') || f.name.endsWith('.csv') ? '📊' : f.name.endsWith('.pdf') ? '📄' : '📎'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{f.name}</p>
                          <p className="text-slate-500 text-xs">{f.modified} · {f.size}</p>
                        </div>
                        {f.link && (
                          <a href={f.link} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-purple-400 hover:text-purple-300 text-xs">
                            <Eye className="w-3.5 h-3.5" /> View
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <div className="text-4xl mb-3">🔑</div>
                    <p className="text-white font-semibold mb-1">Google Drive API Key Required</p>
                    <p className="text-slate-400 text-sm mb-4">To browse Drive files, add your Google Service Account JSON key.</p>
                    <div className="bg-purple-950/40 rounded-xl p-4 text-left max-w-md mx-auto">
                      <p className="text-purple-300 text-xs font-mono">1. Go to console.cloud.google.com</p>
                      <p className="text-purple-300 text-xs font-mono">2. Create Service Account → Download JSON</p>
                      <p className="text-purple-300 text-xs font-mono">3. Share Drive folder with service email</p>
                      <p className="text-purple-300 text-xs font-mono">4. Add GOOGLE_SERVICE_KEY to .env</p>
                    </div>
                    <a href="https://drive.google.com/drive/folders/1DSp2WaZVTRwacJLkHv2rsqRcLAOu8jsy"
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 mt-4 btn-primary text-white text-sm font-semibold px-6 py-2.5 rounded-xl">
                      Open Drive Folder
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  )
}
