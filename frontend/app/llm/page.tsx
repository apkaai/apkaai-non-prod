'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Search, FileText, Mail, Brain, Zap, CheckCircle2, XCircle,
  ExternalLink, Loader2, AlertCircle, Link2, Link2Off, RefreshCw,
  FileSpreadsheet, FileImage, Presentation, File, ChevronDown, ChevronUp,
  Sparkles, Clock, User, FolderOpen, Inbox, Copy, Check
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface SearchResult {
  source:   'drive' | 'gmail'
  id:       string
  name:     string
  type:     string
  modified: string
  link:     string
  location: string
  snippet:  string
  from?:    string
  owner?:   string
}

interface SearchResponse {
  query:      string
  results:    SearchResult[]
  summary:    string
  totalFound: number
  breakdown:  { drive: number; gmail: number }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fileIcon(mimeType: string) {
  if (mimeType === 'email') return <Mail className="w-4 h-4 text-blue-400" />
  if (mimeType?.includes('spreadsheet') || mimeType?.includes('csv'))
    return <FileSpreadsheet className="w-4 h-4 text-green-400" />
  if (mimeType?.includes('presentation'))
    return <Presentation className="w-4 h-4 text-orange-400" />
  if (mimeType?.includes('image') || mimeType?.includes('photo'))
    return <FileImage className="w-4 h-4 text-pink-400" />
  if (mimeType?.includes('document') || mimeType?.includes('text') || mimeType?.includes('pdf'))
    return <FileText className="w-4 h-4 text-purple-400" />
  return <File className="w-4 h-4 text-slate-400" />
}

function sourceLabel(source: 'drive' | 'gmail') {
  return source === 'drive'
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"><FolderOpen className="w-3 h-3" />Drive</span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20"><Inbox className="w-3 h-3" />Gmail</span>
}

function relativTime(dateStr: string) {
  if (!dateStr) return ''
  try {
    const d    = new Date(dateStr)
    const diff = Date.now() - d.getTime()
    const m    = Math.floor(diff / 60000)
    if (m < 60)     return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24)     return `${h}h ago`
    const days = Math.floor(h / 24)
    if (days < 30)  return `${days}d ago`
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })
  } catch { return dateStr }
}

// ── Result Card ───────────────────────────────────────────────────────────────
function ResultCard({ result, index }: { result: SearchResult; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const [copied,   setCopied]   = useState(false)

  const copyLink = () => {
    navigator.clipboard.writeText(result.link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="group relative rounded-xl border border-white/10 bg-white/[0.03] hover:border-purple-500/40 hover:bg-white/[0.05] transition-all duration-200 overflow-hidden"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Rank badge */}
      <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
        <span className="text-[10px] font-bold text-purple-400">{index + 1}</span>
      </div>

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start gap-3 pr-8">
          <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
            {fileIcon(result.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {sourceLabel(result.source)}
              <h3 className="text-sm font-semibold text-white truncate max-w-xs">{result.name}</h3>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <span className="text-purple-400/70">{result.location}</span>
              {result.modified && (
                <>
                  <span className="text-white/20">·</span>
                  <Clock className="w-3 h-3" />
                  <span>{relativTime(result.modified)}</span>
                </>
              )}
              {result.from && (
                <>
                  <span className="text-white/20">·</span>
                  <User className="w-3 h-3" />
                  <span className="truncate max-w-[150px]">{result.from}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Snippet */}
        {result.snippet && (
          <div className="mt-3 ml-11">
            <p className={`text-xs text-slate-400 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
              {result.snippet}
            </p>
            {result.snippet.length > 120 && (
              <button
                onClick={() => setExpanded(e => !e)}
                className="mt-1 text-xs text-purple-400 hover:text-purple-300 flex items-center gap-0.5"
              >
                {expanded ? <><ChevronUp className="w-3 h-3" />Less</> : <><ChevronDown className="w-3 h-3" />More</>}
              </button>
            )}
          </div>
        )}

        {/* Action row */}
        <div className="mt-3 ml-11 flex items-center gap-2">
          <a
            href={result.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-xs font-medium text-purple-300 hover:text-white transition-all"
          >
            <ExternalLink className="w-3 h-3" />
            Open
          </a>
          <button
            onClick={copyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-400 hover:text-white transition-all"
          >
            {copied ? <><Check className="w-3 h-3 text-green-400" />Copied</> : <><Copy className="w-3 h-3" />Copy link</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LLMPage() {
  const [token,         setToken]         = useState<string | null>(null)
  const [isConnected,   setIsConnected]   = useState(false)
  const [googleEmail,   setGoogleEmail]   = useState<string | null>(null)
  const [authLoading,   setAuthLoading]   = useState(false)
  const [statusLoading, setStatusLoading] = useState(true)

  const [query,         setQuery]         = useState('')
  const [sources,       setSources]       = useState<{ drive: boolean; gmail: boolean }>({ drive: true, gmail: true })
  const [maxResults,    setMaxResults]    = useState(10)
  const [searching,     setSearching]     = useState(false)
  const [response,      setResponse]      = useState<SearchResponse | null>(null)
  const [error,         setError]         = useState<string | null>(null)

  const [chatMsg,       setChatMsg]       = useState('')
  const [chatReply,     setChatReply]     = useState<string | null>(null)
  const [chatLoading,   setChatLoading]   = useState(false)
  const [activeTab,     setActiveTab]     = useState<'search' | 'chat'>('search')

  const searchInputRef = useRef<HTMLInputElement>(null)

  // ── Load ApkaAI auth token ───────────────────────────────────────────────
  useEffect(() => {
    const t = localStorage.getItem('apkaai_token') || sessionStorage.getItem('apkaai_token')
    setToken(t)
  }, [])

  // ── Handle OAuth callback params in URL ──────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('auth_success')) {
      setIsConnected(true)
      setGoogleEmail(params.get('google_email'))
      window.history.replaceState({}, '', '/llm')
    }
    if (params.get('auth_error')) {
      setError(`Google auth failed: ${params.get('auth_error')}`)
      window.history.replaceState({}, '', '/llm')
    }
  }, [])

  // ── Check connection status ──────────────────────────────────────────────
  const checkStatus = useCallback(async (t: string) => {
    setStatusLoading(true)
    try {
      const r = await fetch('/api/llm/auth/status', {
        headers: { Authorization: `Bearer ${t}` },
      })
      if (r.ok) {
        const d = await r.json()
        setIsConnected(d.connected)
        setGoogleEmail(d.googleEmail)
      }
    } catch { /* network error — assume not connected */ }
    finally { setStatusLoading(false) }
  }, [])

  useEffect(() => {
    if (token) checkStatus(token)
    else       setStatusLoading(false)
  }, [token, checkStatus])

  // ── Connect Google ───────────────────────────────────────────────────────
  const connectGoogle = async () => {
    if (!token) { setError('Please sign in to ApkaAI first'); return }
    setAuthLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/llm/auth/url', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const d = await r.json()
      if (d.error) { setError(d.error); return }
      window.location.href = d.url
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to get auth URL')
    } finally {
      setAuthLoading(false)
    }
  }

  // ── Disconnect Google ────────────────────────────────────────────────────
  const disconnectGoogle = async () => {
    if (!token) return
    setAuthLoading(true)
    try {
      await fetch('/api/llm/auth/disconnect', {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      setIsConnected(false)
      setGoogleEmail(null)
      setResponse(null)
    } catch { /* ignore */ }
    finally { setAuthLoading(false) }
  }

  // ── Search ───────────────────────────────────────────────────────────────
  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!query.trim() || searching) return
    if (!isConnected) { setError('Connect your Google account first'); return }

    setSearching(true)
    setError(null)
    setResponse(null)

    const activeSources = Object.entries(sources)
      .filter(([, on]) => on)
      .map(([s]) => s)

    if (activeSources.length === 0) {
      setError('Select at least one source (Drive or Gmail)')
      setSearching(false)
      return
    }

    try {
      const r = await fetch('/api/llm/search', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          Authorization:   `Bearer ${token}`,
        },
        body: JSON.stringify({ query: query.trim(), sources: activeSources, maxResults }),
      })
      const d = await r.json()
      if (!r.ok) {
        if (d.needsAuth) { setIsConnected(false); setGoogleEmail(null) }
        setError(d.error || 'Search failed')
        return
      }
      setResponse(d)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  // ── Chat ─────────────────────────────────────────────────────────────────
  const handleChat = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!chatMsg.trim() || chatLoading) return
    setChatLoading(true)
    setChatReply(null)
    setError(null)
    try {
      const r = await fetch('/api/llm/chat', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({ message: chatMsg.trim() }),
      })
      const d = await r.json()
      if (!r.ok) { setError(d.error || 'Chat failed'); return }
      setChatReply(d.reply)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Chat failed')
    } finally {
      setChatLoading(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#08051A] text-slate-100">
      {/* ── Hero Header ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(124,58,237,0.3),transparent)]" />
        <div className="relative max-w-5xl mx-auto px-4 pt-16 pb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-violet-700 flex items-center justify-center shadow-lg shadow-purple-900/40">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                apka<span className="text-purple-400">AI</span> SLM Search
              </h1>
              <p className="text-xs text-slate-500">Powered by Gemini 1.5 Flash</p>
            </div>
          </div>
          <p className="text-slate-400 text-sm max-w-xl leading-relaxed">
            Search across your <span className="text-yellow-400 font-medium">Google Drive documents</span> and{' '}
            <span className="text-blue-400 font-medium">Gmail threads</span> using natural language.
            The SLM reads your results and tells you exactly where to find what you need.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 mt-5">
            {[
              { icon: <FolderOpen className="w-3.5 h-3.5" />, label: 'Google Drive full-text search', color: 'text-yellow-400' },
              { icon: <Mail       className="w-3.5 h-3.5" />, label: 'Gmail thread search',          color: 'text-blue-400'   },
              { icon: <Sparkles   className="w-3.5 h-3.5" />, label: 'Gemini AI summary',            color: 'text-purple-400' },
              { icon: <Zap        className="w-3.5 h-3.5" />, label: 'Returns exact file location',  color: 'text-green-400'  },
            ].map(f => (
              <span key={f.label} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs ${f.color}`}>
                {f.icon}{f.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* ── Not signed in warning ─────────────────────────────────────── */}
        {!token && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-300">Sign in required</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Please <a href="/signin" className="text-amber-400 underline underline-offset-2">sign in to ApkaAI</a> to use SLM Search.
              </p>
            </div>
          </div>
        )}

        {/* ── Google connection card ────────────────────────────────────── */}
        {token && (
          <div className={`rounded-xl border p-4 transition-all ${
            isConnected
              ? 'border-green-500/30 bg-green-500/5'
              : 'border-white/10 bg-white/[0.03]'
          }`}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                  isConnected ? 'bg-green-500/15 border border-green-500/30' : 'bg-white/5 border border-white/10'
                }`}>
                  {statusLoading
                    ? <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                    : isConnected
                      ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                      : <Link2Off    className="w-4 h-4 text-slate-500" />
                  }
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {isConnected ? 'Google account connected' : 'Connect your Google account'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {isConnected
                      ? <span className="text-green-400">{googleEmail || 'Connected'}</span>
                      : 'Grant read-only access to Drive & Gmail'
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isConnected && (
                  <button
                    onClick={() => checkStatus(token!)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-all"
                    title="Refresh status"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={isConnected ? disconnectGoogle : connectGoogle}
                  disabled={authLoading || statusLoading}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${
                    isConnected
                      ? 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300'
                      : 'bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white shadow-lg shadow-purple-900/30'
                  }`}
                >
                  {authLoading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : isConnected
                      ? <><Link2Off className="w-4 h-4" />Disconnect</>
                      : <><Link2    className="w-4 h-4" />Connect Google</>
                  }
                </button>
              </div>
            </div>

            {/* Permissions note */}
            {!isConnected && (
              <p className="mt-3 text-xs text-slate-500 border-t border-white/5 pt-3">
                🔒 Read-only access only. We never modify your Drive or Gmail.
                Your tokens are stored securely and can be revoked anytime.
              </p>
            )}
          </div>
        )}

        {/* ── Tabs ─────────────────────────────────────────────────────── */}
        {token && (
          <div className="flex gap-1 p-1 bg-white/[0.03] rounded-xl border border-white/10 w-fit">
            {([
              { id: 'search', label: 'Search',   icon: <Search   className="w-3.5 h-3.5" /> },
              { id: 'chat',   label: 'Ask Gemini', icon: <Sparkles className="w-3.5 h-3.5" /> },
            ] as const).map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === t.id
                    ? 'bg-purple-600 text-white shadow shadow-purple-900/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.icon}{t.label}
              </button>
            ))}
          </div>
        )}

        {/* ── SEARCH TAB ───────────────────────────────────────────────── */}
        {token && activeTab === 'search' && (
          <div className="space-y-5">

            {/* Search form */}
            <form onSubmit={handleSearch} className="space-y-4">
              {/* Query input */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search your Drive and Gmail… e.g. 'project proposal Q4' or 'invoice from Ashutosh'"
                  disabled={!isConnected || searching}
                  className="w-full pl-11 pr-32 py-3.5 rounded-xl bg-white/[0.04] border border-white/10 focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 focus:outline-none text-sm text-white placeholder-slate-500 transition-all disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!isConnected || searching || !query.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-all shadow shadow-purple-900/40"
                >
                  {searching
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Searching…</>
                    : <><Zap     className="w-3.5 h-3.5" />Search</>
                  }
                </button>
              </div>

              {/* Source + result count controls */}
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-xs text-slate-500 font-medium">Search in:</span>

                {/* Drive toggle */}
                <button
                  type="button"
                  onClick={() => setSources(s => ({ ...s, drive: !s.drive }))}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    sources.drive
                      ? 'bg-yellow-500/15 border-yellow-500/40 text-yellow-400'
                      : 'bg-white/5 border-white/10 text-slate-500'
                  }`}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  Google Drive
                  {sources.drive && <Check className="w-3 h-3" />}
                </button>

                {/* Gmail toggle */}
                <button
                  type="button"
                  onClick={() => setSources(s => ({ ...s, gmail: !s.gmail }))}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    sources.gmail
                      ? 'bg-blue-500/15 border-blue-500/40 text-blue-400'
                      : 'bg-white/5 border-white/10 text-slate-500'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  Gmail
                  {sources.gmail && <Check className="w-3 h-3" />}
                </button>

                {/* Max results */}
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-xs text-slate-500">Max results:</span>
                  <select
                    value={maxResults}
                    onChange={e => setMaxResults(Number(e.target.value))}
                    className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:border-purple-500/60 focus:outline-none"
                  >
                    {[5, 10, 20].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
            </form>

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 flex items-start gap-3">
                <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {/* Searching skeleton */}
            {searching && (
              <div className="space-y-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-purple-400 animate-spin flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white">Searching your workspace…</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Scanning {sources.drive ? 'Google Drive' : ''}{sources.drive && sources.gmail ? ' and ' : ''}{sources.gmail ? 'Gmail' : ''}, then asking Gemini to rank results
                    </p>
                  </div>
                </div>
                {[1, 2, 3].map(i => (
                  <div key={i} className="rounded-xl border border-white/5 bg-white/[0.02] p-4 animate-pulse">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/5" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-white/5 rounded w-2/3" />
                        <div className="h-2.5 bg-white/5 rounded w-1/3" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Results */}
            {!searching && response && (
              <div className="space-y-4">
                {/* Stats bar */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-white">
                      {response.totalFound} result{response.totalFound !== 1 ? 's' : ''} for
                      <span className="text-purple-400 ml-1">"{response.query}"</span>
                    </span>
                    <div className="flex items-center gap-2">
                      {response.breakdown.drive > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                          {response.breakdown.drive} Drive
                        </span>
                      )}
                      {response.breakdown.gmail > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {response.breakdown.gmail} Gmail
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Gemini summary */}
                {response.summary && (
                  <div className="rounded-xl border border-purple-500/25 bg-purple-500/5 p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-purple-400 mb-1.5 uppercase tracking-wide">Gemini Summary</p>
                        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{response.summary}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Result cards */}
                {response.results.length > 0 ? (
                  <div className="space-y-3">
                    {response.results.map((r, i) => (
                      <ResultCard key={r.id} result={r} index={i} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
                    <Search className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-400">No matching documents found</p>
                    <p className="text-xs text-slate-500 mt-1">Try different keywords or broader terms</p>
                  </div>
                )}
              </div>
            )}

            {/* Empty state when not yet searched */}
            {!searching && !response && !error && isConnected && (
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-10 text-center">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                  <Search className="w-6 h-6 text-slate-500" />
                </div>
                <p className="text-sm font-medium text-slate-400">Type a query to search your workspace</p>
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  {[
                    'project proposal',
                    'invoice 2026',
                    'meeting notes',
                    'contract signed',
                    'budget Q4',
                  ].map(s => (
                    <button
                      key={s}
                      onClick={() => { setQuery(s); searchInputRef.current?.focus() }}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-400 hover:text-white transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CHAT TAB ─────────────────────────────────────────────────── */}
        {token && activeTab === 'chat' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <p className="text-sm font-semibold text-white">Ask Gemini 1.5 Flash</p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">SLM</span>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Direct conversation with Google Gemini — no workspace search. Ask anything.
              </p>

              <form onSubmit={handleChat} className="space-y-3">
                <textarea
                  value={chatMsg}
                  onChange={e => setChatMsg(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleChat() }}
                  placeholder="Ask anything… e.g. 'Summarise what a quarterly business review should include'"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 focus:outline-none text-sm text-white placeholder-slate-500 resize-none transition-all"
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">Ctrl+Enter to send</p>
                  <button
                    type="submit"
                    disabled={chatLoading || !chatMsg.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-medium transition-all"
                  >
                    {chatLoading
                      ? <><Loader2 className="w-4 h-4 animate-spin" />Thinking…</>
                      : <><Sparkles className="w-4 h-4" />Ask Gemini</>
                    }
                  </button>
                </div>
              </form>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 flex items-start gap-3">
                <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {chatReply && (
              <div className="rounded-xl border border-purple-500/25 bg-purple-500/5 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-purple-400" />
                  </div>
                  <p className="text-xs font-semibold text-purple-400 uppercase tracking-wide">Gemini</p>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{chatReply}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Setup guide ──────────────────────────────────────────────── */}
        <details className="group rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-slate-300">Setup guide — configure Google OAuth &amp; Gemini</span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-500 group-open:rotate-180 transition-transform" />
          </summary>
          <div className="px-4 pb-4 border-t border-white/5 pt-4 space-y-4 text-xs text-slate-400">

            <div className="space-y-1.5">
              <p className="font-semibold text-white text-sm">1. Google Cloud Console</p>
              <ol className="space-y-1 ml-4 list-decimal">
                <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-purple-400 underline">console.cloud.google.com</a></li>
                <li>Create a project (or use existing)</li>
                <li>Enable <strong className="text-white">Google Drive API</strong> and <strong className="text-white">Gmail API</strong></li>
                <li>Go to <strong>APIs &amp; Services → Credentials → Create OAuth 2.0 Client ID</strong></li>
                <li>Application type: <strong className="text-white">Web application</strong></li>
                <li>Authorized redirect URI: <code className="bg-white/5 px-1 rounded text-purple-300">https://non-prod.apkaai.com/api/llm/auth/callback</code></li>
                <li>Copy the <strong className="text-white">Client ID</strong> and <strong className="text-white">Client Secret</strong></li>
              </ol>
            </div>

            <div className="space-y-1.5">
              <p className="font-semibold text-white text-sm">2. Gemini API Key</p>
              <ol className="space-y-1 ml-4 list-decimal">
                <li>Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-purple-400 underline">aistudio.google.com/app/apikey</a></li>
                <li>Click <strong>Create API Key</strong> (free tier available)</li>
                <li>Copy the key</li>
              </ol>
            </div>

            <div className="space-y-1.5">
              <p className="font-semibold text-white text-sm">3. Add to server .env</p>
              <pre className="bg-black/40 rounded-lg p-3 overflow-x-auto text-green-400 text-xs leading-relaxed">
{`GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GEMINI_API_KEY=your_gemini_api_key`}
              </pre>
              <p className="text-slate-500">Then restart the backend: <code className="bg-white/5 px-1 rounded">pm2 restart apkaai-api</code></p>
            </div>

          </div>
        </details>

      </div>
    </div>
  )
}
