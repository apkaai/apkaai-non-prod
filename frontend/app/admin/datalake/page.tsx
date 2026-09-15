'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  Database, Play, Download, Upload, Table2, RefreshCw,
  Trash2, Code2, FileText, Cloud, X, CheckCircle, AlertCircle,
  BarChart3, ArrowLeft, Copy, Clock, Search, Settings,
  HardDrive, Layers, TrendingUp, Users, Mail, Zap,
  FolderOpen, Globe, Shield, ChevronRight, ChevronDown,
  PieChart, Activity, Archive, Eye, Plus
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────
interface QueryResult {
  rows:     Record<string, unknown>[]
  columns:  string[]
  rowCount: number
  duration: number
  sql:      string
  error?:   string
  truncated?: boolean
  scanMB?:  string
  engine?:  string
}
interface ETLTable    { name: string; rows: number; columns: { column_name: string; data_type: string }[]; source?: string; size?: string }
interface Template    { label: string; sql: string }
interface TemplateGroup { category: string; emoji: string; queries: Template[] }
interface AnalyticsOverview {
  stats:  Record<string, number | string>
  charts: {
    signupsByDay:    { day: string; count: number }[]
    contactsByDay:   { day: string; count: number }[]
    roleBreakdown:   { role: string; count: number }[]
    toolsByCategory: { category: string; count: number }[]
    toolsByPricing:  { pricing: string; count: number }[]
    topRatedTools:   { name: string; category: string; rating: number; reviews: number }[]
  }
}
interface S3Summary { folder: string; fileCount: number; totalSize: string; latestFile: string | null }

function getToken() {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('apkaai_token') || sessionStorage.getItem('apkaai_token') || ''
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState(false)
  useEffect(() => {
    const u = localStorage.getItem('apkaai_user') || sessionStorage.getItem('apkaai_user')
    if (!u) { window.location.href = '/admin/login'; return }
    try { const p = JSON.parse(u); if (p.role !== 'admin') { window.location.href = '/admin/login'; return } setOk(true) } catch { window.location.href = '/admin/login' }
  }, [])
  if (!ok) return <div className="min-h-screen bg-[#08051A] flex items-center justify-center"><div className="text-slate-400 animate-pulse">Verifying admin access...</div></div>
  return <>{children}</>
}

// ── Mini bar chart ─────────────────────────────────────────────────────────────
function MiniBarChart({ data, color = '#8B5CF6', height = 60 }: { data: { day: string; count: number }[]; color?: string; height?: number }) {
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div className="flex items-end gap-0.5" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 rounded-sm transition-all hover:opacity-80 group relative" style={{ height: `${Math.max((d.count / max) * 100, d.count > 0 ? 8 : 2)}%`, backgroundColor: color, opacity: 0.7 + (i / data.length) * 0.3 }}>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-[#1a1040] border border-purple-700/40 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 z-10 pointer-events-none">{d.day.slice(5)}: {d.count}</div>
        </div>
      ))}
    </div>
  )
}

// ── Donut chart (CSS) ──────────────────────────────────────────────────────────
function DonutChart({ data, colors }: { data: { label: string; value: number }[]; colors: string[] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  let cumPct = 0
  const segments = data.map((d, i) => {
    const pct = (d.value / total) * 100
    const start = cumPct; cumPct += pct
    return { ...d, pct, start, color: colors[i % colors.length] }
  })
  const conicGradient = segments.map(s => `${s.color} ${s.start.toFixed(1)}% ${(s.start + s.pct).toFixed(1)}%`).join(', ')
  return (
    <div className="flex items-center gap-4">
      <div className="relative flex-shrink-0" style={{ width: 80, height: 80 }}>
        <div className="rounded-full" style={{ width: 80, height: 80, background: `conic-gradient(${conicGradient})` }} />
        <div className="absolute inset-0 rounded-full bg-[#0F0A1E] m-4" />
      </div>
      <div className="space-y-1.5 flex-1">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />
              <span className="text-slate-300 capitalize">{s.label}</span>
            </div>
            <span className="text-slate-400">{s.value} <span className="text-slate-600">({s.pct.toFixed(0)}%)</span></span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Result table ───────────────────────────────────────────────────────────────
function ResultTable({ result }: { result: QueryResult }) {
  const exportCSV = () => {
    if (!result.rows.length) return
    const header = result.columns.join(',')
    const rows   = result.rows.map(r => result.columns.map(c => JSON.stringify(r[c] ?? '')).join(','))
    const blob   = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'query-result.csv'; a.click()
  }
  return (
    <div className="border border-purple-900/30 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-purple-950/20 border-b border-purple-900/30 flex-wrap gap-2">
        <span className="text-sm text-slate-300 flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" />{result.rowCount} rows</span>
          <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-500" />{result.duration}ms</span>
          {result.scanMB && <span className="text-slate-500 text-xs">Athena scanned: {result.scanMB} MB</span>}
          {result.truncated && <span className="text-amber-400 text-xs">(truncated — results capped)</span>}
          {result.engine && <span className="text-xs bg-purple-900/40 text-purple-300 px-1.5 py-0.5 rounded-full">{result.engine}</span>}
        </span>
        <button onClick={exportCSV} className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>
      <div className="overflow-x-auto max-h-80">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#0F0A1E]">
              <th className="px-3 py-2 text-left text-slate-500 font-medium w-10">#</th>
              {result.columns.map(col => <th key={col} className="px-3 py-2 text-left text-slate-300 font-semibold whitespace-nowrap border-l border-purple-900/20">{col}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-purple-900/20">
            {result.rows.map((row, i) => (
              <tr key={i} className="hover:bg-purple-950/20 transition-colors">
                <td className="px-3 py-1.5 text-slate-600">{i + 1}</td>
                {result.columns.map(col => (
                  <td key={col} className="px-3 py-1.5 text-slate-300 whitespace-nowrap max-w-xs truncate border-l border-purple-900/10" title={String(row[col] ?? '')}>
                    {row[col] === null ? <span className="text-slate-600 italic">null</span> : String(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function DataLakePage() {
  const token = getToken()
  const apiFetch = useCallback((url: string, opts: RequestInit = {}) =>
    fetch(url, { ...opts, headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) } }), [token])

  // Tabs
  const [activeTab, setActiveTab] = useState<'analytics'|'query'|'athena'|'tables'|'etl'|'drive'|'s3'|'glue'>('analytics')

  // Analytics
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  // Query runner (PostgreSQL)
  const [sql, setSql]             = useState('SELECT * FROM users LIMIT 20')
  const [running, setRunning]     = useState(false)
  const [result, setResult]       = useState<QueryResult | null>(null)
  const [queryError, setQueryError] = useState<string | null>(null)
  const [history, setHistory]     = useState<string[]>([])
  const [templates, setTemplates] = useState<TemplateGroup[]>([])
  const [openGroup, setOpenGroup] = useState<string | null>('Users')

  // Athena
  const [athenaSql, setAthenaSql]     = useState('SHOW TABLES')
  const [athenaResult, setAthenaResult] = useState<QueryResult | null>(null)
  const [athenaError, setAthenaError] = useState<string | null>(null)
  const [athenaRunning, setAthenaRunning] = useState(false)
  const [athenaHistory, setAthenaHistory] = useState<{id:string;sql:string;state:string;duration:number;scanMB:string}[]>([])

  // Table browser
  const [tables, setTables]           = useState<{ etlTables: ETLTable[]; coreTables: ETLTable[] }>({ etlTables: [], coreTables: [] })
  const [tablesLoading, setTablesLoading] = useState(false)
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [preview, setPreview]         = useState<QueryResult | null>(null)
  const [tableSearch, setTableSearch] = useState('')

  // ETL
  const [etlFile, setEtlFile]         = useState<File | null>(null)
  const [etlText, setEtlText]         = useState('')
  const [etlFormat, setEtlFormat]     = useState('csv')
  const [etlTableName, setEtlTableName] = useState('')
  const [etlMode, setEtlMode]         = useState<'append'|'replace'>('append')
  const [etlLoading, setEtlLoading]   = useState(false)
  const [etlResult, setEtlResult]     = useState<{success:boolean;message?:string;error?:string;table?:string;rows?:number;sheets?:string[]} | null>(null)

  // Drive ETL
  const [driveFileId, setDriveFileId]   = useState('')
  const [driveFormat, setDriveFormat]   = useState('auto')
  const [driveTable, setDriveTable]     = useState('')
  const [driveLoading, setDriveLoading] = useState(false)
  const [driveResult, setDriveResult]   = useState<{success:boolean;message?:string;error?:string} | null>(null)

  // S3
  const [s3Summary, setS3Summary]     = useState<{bucket:string;summary:S3Summary[];configured:boolean} | null>(null)
  const [s3Files, setS3Files]         = useState<{key:string;size:number;lastModified:string;sizeHuman:string}[]>([])
  const [s3Prefix, setS3Prefix]       = useState('')
  const [s3Loading, setS3Loading]     = useState(false)

  // Glue
  const [glueTables, setGlueTables]   = useState<{name:string;database:string;location?:string;columns?:{name:string;type:string}[];createdAt?:string}[]>([])
  const [glueLoading, setGlueLoading] = useState(false)
  const [glueError, setGlueError]     = useState<string|null>(null)

  // Jobs
  const [jobs, setJobs] = useState<{id:number;source:string;file_name:string;format:string;rows_loaded:number;table_name:string;status:string;created_at:string}[]>([])

  const sqlRef    = useRef<HTMLTextAreaElement>(null)
  const athenaSqlRef = useRef<HTMLTextAreaElement>(null)

  // Load templates + tables on mount
  useEffect(() => {
    apiFetch('/api/datalake/query/templates').then(r => r.json()).then(d => setTemplates(d.templates || [])).catch(() => {})
    loadTables()
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    setAnalyticsLoading(true)
    try {
      const r = await apiFetch('/api/datalake/analytics/overview')
      const d = await r.json()
      setAnalytics(d)
    } catch {}
    setAnalyticsLoading(false)
  }

  const loadTables = async () => {
    setTablesLoading(true)
    try {
      const r = await apiFetch('/api/datalake/tables')
      const d = await r.json()
      setTables({ etlTables: d.etlTables || [], coreTables: d.coreTables || [] })
    } catch {}
    setTablesLoading(false)
  }

  const loadS3Summary = async () => {
    setS3Loading(true)
    try {
      const r = await apiFetch('/api/datalake/s3/summary')
      const d = await r.json()
      setS3Summary(d)
    } catch {}
    setS3Loading(false)
  }

  const browseS3 = async (prefix = '') => {
    setS3Prefix(prefix); setS3Loading(true)
    try {
      const r = await apiFetch(`/api/datalake/s3/browse?prefix=${encodeURIComponent(prefix)}`)
      const d = await r.json()
      setS3Files(d.files || [])
    } catch {}
    setS3Loading(false)
  }

  const loadGlueTables = async () => {
    setGlueLoading(true); setGlueError(null)
    try {
      const r = await apiFetch('/api/datalake/glue/tables')
      const d = await r.json()
      if (d.error) setGlueError(d.error)
      setGlueTables(d.tables || [])
    } catch (e: unknown) { setGlueError(e instanceof Error ? e.message : 'Failed') }
    setGlueLoading(false)
  }

  const runQuery = async () => {
    if (!sql.trim()) return
    setRunning(true); setResult(null); setQueryError(null)
    try {
      const r = await apiFetch('/api/datalake/query', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sql, limit: 500 }) })
      const d = await r.json()
      if (d.error) setQueryError(`${d.error}${d.hint ? `\nHint: ${d.hint}` : ''}${d.detail ? `\nDetail: ${d.detail}` : ''}`)
      else { setResult(d); setHistory(prev => [sql, ...prev.filter(h => h !== sql)].slice(0, 20)) }
    } catch (e: unknown) { setQueryError(e instanceof Error ? e.message : 'Network error') }
    setRunning(false)
  }

  const runAthena = async () => {
    if (!athenaSql.trim()) return
    setAthenaRunning(true); setAthenaResult(null); setAthenaError(null)
    try {
      const r = await apiFetch('/api/datalake/athena/query', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sql: athenaSql, maxRows: 1000 }) })
      const d = await r.json()
      if (d.error) setAthenaError(d.error)
      else setAthenaResult({ ...d, engine: 'athena' })
    } catch (e: unknown) { setAthenaError(e instanceof Error ? e.message : 'Athena error') }
    setAthenaRunning(false)
    // Refresh history
    apiFetch('/api/datalake/athena/history').then(r => r.json()).then(d => setAthenaHistory(d.queries || [])).catch(() => {})
  }

  const previewTable = async (name: string) => {
    setSelectedTable(name); setPreview(null)
    try {
      const r = await apiFetch(`/api/datalake/tables/${name}/preview?limit=50`)
      const d = await r.json()
      setPreview({ rows: d.rows, columns: d.columns, rowCount: d.rowCount, duration: 0, sql: `SELECT * FROM "${name}" LIMIT 50` })
    } catch {}
  }

  const dropTable = async (name: string) => {
    if (!confirm(`Drop table "${name}"? This cannot be undone.`)) return
    await apiFetch(`/api/datalake/tables/${name}`, { method: 'DELETE' })
    loadTables()
    if (selectedTable === name) { setSelectedTable(null); setPreview(null) }
  }

  const runETLUpload = async () => {
    if (!etlFile) return
    setEtlLoading(true); setEtlResult(null)
    const form = new FormData()
    form.append('file', etlFile)
    form.append('mode', etlMode)
    try {
      const r = await apiFetch('/api/datalake/etl/upload', { method: 'POST', body: form })
      const d = await r.json()
      setEtlResult(d)
      if (d.success) { loadTables(); setEtlFile(null) }
    } catch (e: unknown) { setEtlResult({ success: false, error: e instanceof Error ? e.message : 'Upload failed' }) }
    setEtlLoading(false)
  }

  const runETLText = async () => {
    if (!etlText.trim() || !etlTableName.trim()) return
    setEtlLoading(true); setEtlResult(null)
    try {
      const r = await apiFetch('/api/datalake/etl/text', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: etlText, format: etlFormat, tableName: etlTableName, mode: etlMode }) })
      const d = await r.json()
      setEtlResult(d)
      if (d.success) loadTables()
    } catch (e: unknown) { setEtlResult({ success: false, error: e instanceof Error ? e.message : 'ETL failed' }) }
    setEtlLoading(false)
  }

  const runDriveETL = async () => {
    if (!driveFileId.trim()) return
    setDriveLoading(true); setDriveResult(null)
    try {
      const r = await apiFetch('/api/datalake/etl/drive', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileId: driveFileId, format: driveFormat === 'auto' ? undefined : driveFormat, tableName: driveTable || undefined, mode: etlMode }) })
      const d = await r.json()
      setDriveResult(d)
      if (d.success) { loadTables(); setDriveFileId(''); setDriveTable('') }
    } catch (e: unknown) { setDriveResult({ success: false, error: e instanceof Error ? e.message : 'Drive ETL failed' }) }
    setDriveLoading(false)
  }

  const tabs = [
    { id: 'analytics', label: 'Analytics',       icon: BarChart3 },
    { id: 'query',     label: 'SQL Query',        icon: Code2 },
    { id: 'athena',    label: 'Athena',           icon: Zap },
    { id: 'tables',    label: 'Tables',           icon: Table2 },
    { id: 'etl',       label: 'ETL Upload',       icon: Upload },
    { id: 'drive',     label: 'Google Drive ETL', icon: Cloud },
    { id: 's3',        label: 'S3 Lake',          icon: HardDrive },
    { id: 'glue',      label: 'Glue Catalog',     icon: Layers },
  ] as const

  const COLORS = ['#8B5CF6','#06B6D4','#10B981','#F59E0B','#EF4444','#EC4899','#6366F1','#14B8A6']

  return (
    <AdminGuard>
      <div className="min-h-screen bg-[#08051A]">
        {/* Top bar */}
        <div className="border-b border-purple-900/30 bg-[#0F0A1E]/90 backdrop-blur-xl sticky top-0 z-40">
          <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin" className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-purple-900/20 rounded-lg">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <Database className="w-5 h-5 text-purple-400" />
              <span className="font-bold text-white">Data Lake</span>
              <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">AWS Powered</span>
              <span className="hidden sm:block text-xs bg-emerald-900/40 text-emerald-400 border border-emerald-700/30 px-2 py-0.5 rounded-full">Admin Only</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={loadAnalytics} className="p-2 text-slate-400 hover:text-white border border-purple-800/40 hover:border-purple-500 rounded-lg transition-all">
                <RefreshCw className={`w-4 h-4 ${analyticsLoading ? 'animate-spin' : ''}`} />
              </button>
              <Link href="/admin" className="text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-purple-900/20 transition-all">← Admin</Link>
            </div>
          </div>
        </div>

        <div className="max-w-screen-2xl mx-auto px-4 py-6">
          {/* Tab navigation */}
          <div className="flex gap-1.5 mb-6 overflow-x-auto pb-2 scrollbar-hide">
            {tabs.map(t => (
              <button key={t.id} onClick={() => {
                setActiveTab(t.id)
                if (t.id === 's3' && !s3Summary) loadS3Summary()
                if (t.id === 'glue' && !glueTables.length) loadGlueTables()
                if (t.id === 'athena' && !athenaHistory.length) apiFetch('/api/datalake/athena/history').then(r => r.json()).then(d => setAthenaHistory(d.queries || [])).catch(() => {})
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all flex-shrink-0 ${
                activeTab === t.id ? 'bg-purple-600 border-purple-500 text-white shadow-lg' : 'bg-[#0F0A1E] border-purple-800/40 text-slate-300 hover:border-purple-600 hover:text-white'
              }`}>
                <t.icon className="w-3.5 h-3.5" />{t.label}
              </button>
            ))}
          </div>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* ANALYTICS TAB */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {analyticsLoading && !analytics ? (
                <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" /></div>
              ) : analytics ? (
                <>
                  {/* KPI cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                    {[
                      { label: 'Total Users',    value: analytics.stats.totalUsers,    icon: Users,    color: 'text-purple-400', bg: 'bg-purple-900/20' },
                      { label: 'Contacts',       value: analytics.stats.totalContacts, icon: Mail,     color: 'text-blue-400',   bg: 'bg-blue-900/20' },
                      { label: 'AI Tools',       value: analytics.stats.totalTools,    icon: Database, color: 'text-emerald-400',bg: 'bg-emerald-900/20' },
                      { label: 'New Today',      value: analytics.stats.newUsersToday, icon: TrendingUp,color:'text-yellow-400',  bg: 'bg-yellow-900/20' },
                      { label: 'This Week',      value: analytics.stats.newUsersWeek,  icon: Activity, color: 'text-orange-400', bg: 'bg-orange-900/20' },
                      { label: 'This Month',     value: analytics.stats.newUsersMonth, icon: BarChart3,color: 'text-pink-400',   bg: 'bg-pink-900/20' },
                      { label: 'ETL Tables',     value: analytics.stats.etlTables,     icon: Layers,   color: 'text-cyan-400',   bg: 'bg-cyan-900/20' },
                      { label: 'DB Size',        value: analytics.stats.dbSize,        icon: HardDrive,color: 'text-slate-400',  bg: 'bg-slate-900/20' },
                    ].map(card => (
                      <div key={card.label} className={`glow-border rounded-xl p-4 bg-[#0F0A1E] flex flex-col gap-2`}>
                        <div className={`w-8 h-8 ${card.bg} rounded-lg flex items-center justify-center`}>
                          <card.icon className={`w-4 h-4 ${card.color}`} />
                        </div>
                        <div className={`text-2xl font-black ${card.color}`}>{String(card.value ?? 0)}</div>
                        <div className="text-slate-500 text-xs">{card.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Charts row 1 */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Signups trend */}
                    <div className="lg:col-span-2 glow-border rounded-xl bg-[#0F0A1E] p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-bold text-white">User Signups</h3>
                          <p className="text-slate-500 text-xs">Last 30 days</p>
                        </div>
                        <TrendingUp className="w-5 h-5 text-purple-400" />
                      </div>
                      <MiniBarChart data={analytics.charts.signupsByDay} color="#8B5CF6" height={80} />
                      <div className="flex justify-between text-xs text-slate-600 mt-1">
                        <span>{analytics.charts.signupsByDay[0]?.day.slice(5)}</span>
                        <span>{analytics.charts.signupsByDay[analytics.charts.signupsByDay.length-1]?.day.slice(5)}</span>
                      </div>
                    </div>

                    {/* Role breakdown donut */}
                    <div className="glow-border rounded-xl bg-[#0F0A1E] p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div><h3 className="font-bold text-white">User Roles</h3><p className="text-slate-500 text-xs">Distribution</p></div>
                        <PieChart className="w-5 h-5 text-cyan-400" />
                      </div>
                      <DonutChart
                        data={analytics.charts.roleBreakdown.map(r => ({ label: r.role, value: r.count }))}
                        colors={COLORS}
                      />
                    </div>
                  </div>

                  {/* Charts row 2 */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Contacts trend */}
                    <div className="glow-border rounded-xl bg-[#0F0A1E] p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div><h3 className="font-bold text-white">Contact Forms</h3><p className="text-slate-500 text-xs">Last 30 days</p></div>
                        <Mail className="w-5 h-5 text-blue-400" />
                      </div>
                      <MiniBarChart data={analytics.charts.contactsByDay} color="#06B6D4" height={60} />
                    </div>

                    {/* Tools by category */}
                    <div className="glow-border rounded-xl bg-[#0F0A1E] p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div><h3 className="font-bold text-white">Tools by Category</h3><p className="text-slate-500 text-xs">Top 10</p></div>
                        <Database className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div className="space-y-2">
                        {analytics.charts.toolsByCategory.slice(0, 6).map((t, i) => {
                          const max = analytics.charts.toolsByCategory[0]?.count || 1
                          return (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-slate-400 text-xs w-24 truncate">{t.category}</span>
                              <div className="flex-1 bg-purple-950/40 rounded-full h-1.5">
                                <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${(t.count/max)*100}%` }} />
                              </div>
                              <span className="text-slate-500 text-xs w-4 text-right">{t.count}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Top rated tools */}
                    <div className="glow-border rounded-xl bg-[#0F0A1E] p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div><h3 className="font-bold text-white">Top Rated Tools</h3><p className="text-slate-500 text-xs">By rating</p></div>
                        <Zap className="w-5 h-5 text-yellow-400" />
                      </div>
                      <div className="space-y-2.5">
                        {analytics.charts.topRatedTools.map((t, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-slate-600 text-xs w-4">{i+1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-slate-300 text-xs font-medium truncate">{t.name}</p>
                              <p className="text-slate-600 text-xs">{t.category}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-yellow-400 text-xs font-bold">⭐ {t.rating}</div>
                              <div className="text-slate-600 text-xs">{t.reviews} reviews</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Pricing breakdown */}
                  <div className="glow-border rounded-xl bg-[#0F0A1E] p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <PieChart className="w-4 h-4 text-orange-400" />
                      <h3 className="font-bold text-white">Tools by Pricing Model</h3>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {analytics.charts.toolsByPricing.map((p, i) => (
                        <div key={i} className="flex items-center gap-2 bg-purple-950/30 border border-purple-800/30 rounded-lg px-4 py-2.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="text-slate-300 text-sm">{p.pricing}</span>
                          <span className="text-white font-bold text-sm">{p.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-20 text-slate-500">Failed to load analytics. <button onClick={loadAnalytics} className="text-purple-400 hover:underline">Retry</button></div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* SQL QUERY RUNNER (PostgreSQL) */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'query' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
              {/* Templates panel */}
              <div className="lg:col-span-1 space-y-3">
                <div className="glow-border rounded-xl bg-[#0F0A1E] overflow-hidden">
                  <div className="px-4 py-3 border-b border-purple-900/30 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-purple-400" /><span className="text-white font-semibold text-sm">Templates</span>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {templates.map(group => (
                      <div key={group.category}>
                        <button onClick={() => setOpenGroup(openGroup === group.category ? null : group.category)}
                          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-purple-950/20 transition-colors">
                          <span className="text-slate-300 text-sm font-medium flex items-center gap-1.5"><span>{group.emoji}</span>{group.category}</span>
                          {openGroup === group.category ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
                        </button>
                        {openGroup === group.category && (
                          <div className="border-t border-purple-900/20">
                            {group.queries.map(q => (
                              <button key={q.label} onClick={() => setSql(q.sql)}
                                className="w-full px-4 py-2 text-left text-slate-400 hover:text-white hover:bg-purple-950/30 text-xs transition-colors pl-8">{q.label}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                {history.length > 0 && (
                  <div className="glow-border rounded-xl bg-[#0F0A1E] overflow-hidden">
                    <div className="px-4 py-3 border-b border-purple-900/30 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-500" /><span className="text-white font-semibold text-sm">Recent</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {history.slice(0, 10).map((h, i) => (
                        <button key={i} onClick={() => setSql(h)} className="w-full px-4 py-2 text-left text-slate-500 hover:text-slate-300 text-xs font-mono truncate transition-colors hover:bg-purple-950/20">
                          {h.slice(0, 50)}{h.length > 50 ? '…' : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* Editor + results */}
              <div className="lg:col-span-3 space-y-4">
                <div className="glow-border rounded-xl bg-[#0F0A1E] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-purple-900/30">
                    <div className="flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-purple-400" />
                      <span className="text-white font-semibold text-sm">PostgreSQL Query Runner</span>
                      <span className="text-slate-600 text-xs hidden sm:block">— SELECT, WITH, EXPLAIN</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => navigator.clipboard?.writeText(sql)} className="p-1.5 text-slate-500 hover:text-white transition-colors" title="Copy"><Copy className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setSql('')} className="p-1.5 text-slate-500 hover:text-white transition-colors" title="Clear"><X className="w-3.5 h-3.5" /></button>
                      <button onClick={runQuery} disabled={running || !sql.trim()}
                        className="flex items-center gap-2 btn-primary text-white text-sm font-bold px-5 py-2 rounded-lg disabled:opacity-50">
                        {running ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Running</> : <><Play className="w-3.5 h-3.5" fill="white" />Run</>}
                      </button>
                    </div>
                  </div>
                  <textarea ref={sqlRef} value={sql} onChange={e => setSql(e.target.value)}
                    onKeyDown={e => { if ((e.ctrlKey||e.metaKey) && e.key==='Enter') { e.preventDefault(); runQuery() }}}
                    placeholder="Write your SQL... (Ctrl+Enter to run)" rows={8} spellCheck={false}
                    className="w-full bg-transparent px-4 py-3 text-sm text-green-300 font-mono focus:outline-none resize-y placeholder-slate-700 leading-relaxed" style={{ minHeight: 160 }} />
                  <div className="px-4 py-2 border-t border-purple-900/30 text-xs text-slate-600">Ctrl+Enter to run · Tables: users, contacts, tools, categories + dl_* (ETL imports)</div>
                </div>
                {queryError && <div className="glow-border rounded-xl p-4 bg-red-900/10 border-red-700/40"><div className="flex gap-3"><AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" /><div><p className="text-red-300 font-semibold text-sm mb-1">Error</p><pre className="text-red-400 text-xs whitespace-pre-wrap font-mono">{queryError}</pre></div></div></div>}
                {result && !queryError && <div className="glow-border rounded-xl bg-[#0F0A1E] overflow-hidden"><ResultTable result={result} /></div>}
                {!result && !queryError && !running && <div className="glow-border rounded-xl p-10 bg-[#0F0A1E] text-center"><Code2 className="w-10 h-10 text-slate-700 mx-auto mb-3" /><p className="text-slate-500">Run a query to see results</p><p className="text-slate-600 text-sm mt-1">Pick a template or write your own SQL</p></div>}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* ATHENA TAB */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'athena' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 space-y-4">
                <div className="glow-border rounded-xl bg-[#0F0A1E] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-purple-900/30">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      <span className="text-white font-semibold">Athena — S3 Data Lake Query</span>
                      <span className="text-xs bg-yellow-900/30 text-yellow-400 border border-yellow-700/30 px-2 py-0.5 rounded-full">Serverless SQL</span>
                    </div>
                    <button onClick={runAthena} disabled={athenaRunning || !athenaSql.trim()}
                      className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-bold px-5 py-2 rounded-lg disabled:opacity-50 transition-colors">
                      {athenaRunning ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Querying</> : <><Zap className="w-3.5 h-3.5" />Run Athena</>}
                    </button>
                  </div>
                  <textarea ref={athenaSqlRef} value={athenaSql} onChange={e => setAthenaSql(e.target.value)}
                    onKeyDown={e => { if ((e.ctrlKey||e.metaKey) && e.key==='Enter') { e.preventDefault(); runAthena() }}}
                    placeholder="SHOW TABLES or SELECT * FROM my_table LIMIT 10" rows={8} spellCheck={false}
                    className="w-full bg-transparent px-4 py-3 text-sm text-yellow-200 font-mono focus:outline-none resize-y placeholder-slate-700 leading-relaxed" style={{ minHeight: 160 }} />
                  <div className="px-4 py-2 border-t border-purple-900/30 text-xs text-slate-600 flex flex-wrap gap-4">
                    <span>Ctrl+Enter to run</span>
                    <span>Database: <span className="text-yellow-400">apkaai_datalake</span></span>
                    <span>Workgroup: <span className="text-yellow-400">apkaai-datalake</span></span>
                  </div>
                </div>
                {athenaError && <div className="glow-border rounded-xl p-4 bg-red-900/10 border-red-700/40"><div className="flex gap-3"><AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" /><pre className="text-red-400 text-xs whitespace-pre-wrap font-mono">{athenaError}</pre></div></div>}
                {athenaResult && <div className="glow-border rounded-xl bg-[#0F0A1E] overflow-hidden"><ResultTable result={athenaResult} /></div>}
                {!athenaResult && !athenaError && !athenaRunning && (
                  <div className="glow-border rounded-xl p-8 bg-[#0F0A1E]">
                    <div className="text-center mb-6"><Zap className="w-8 h-8 text-yellow-400/50 mx-auto mb-2" /><p className="text-slate-400 font-medium">Query your S3 data lake with standard SQL</p><p className="text-slate-600 text-sm mt-1">Files in S3 become instantly queryable — no servers to manage</p></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { label: 'Show all tables', sql: 'SHOW TABLES' },
                        { label: 'Show databases', sql: 'SHOW DATABASES' },
                        { label: 'Query uploaded file', sql: "SELECT * FROM my_uploaded_data LIMIT 10" },
                        { label: 'Describe table', sql: 'DESCRIBE my_table' },
                      ].map(t => (
                        <button key={t.label} onClick={() => setAthenaSql(t.sql)}
                          className="text-left p-3 rounded-lg border border-purple-800/30 hover:border-yellow-500/50 bg-purple-950/20 transition-all">
                          <p className="text-slate-300 text-xs font-medium">{t.label}</p>
                          <code className="text-yellow-400/70 text-xs font-mono">{t.sql}</code>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* Athena history */}
              <div className="space-y-4">
                <div className="glow-border rounded-xl bg-[#0F0A1E] overflow-hidden">
                  <div className="px-4 py-3 border-b border-purple-900/30 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-500" /><span className="text-white font-semibold text-sm">Query History</span>
                  </div>
                  {athenaHistory.length === 0 ? (
                    <div className="px-4 py-6 text-center text-slate-600 text-sm">No recent queries</div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto divide-y divide-purple-900/20">
                      {athenaHistory.map((h, i) => (
                        <button key={i} onClick={() => setAthenaSql(h.sql || '')}
                          className="w-full px-4 py-3 text-left hover:bg-purple-950/20 transition-colors">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${h.state==='SUCCEEDED'?'bg-emerald-900/40 text-emerald-400':h.state==='FAILED'?'bg-red-900/40 text-red-400':'bg-slate-800 text-slate-400'}`}>{h.state}</span>
                            <span className="text-slate-600 text-xs">{h.scanMB} MB scanned</span>
                          </div>
                          <p className="text-slate-400 text-xs font-mono truncate">{h.sql}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="glow-border rounded-xl bg-[#0F0A1E] p-4">
                  <h4 className="text-white font-semibold text-sm mb-3">Setup Guide</h4>
                  <div className="space-y-2 text-xs text-slate-400">
                    <div className="flex gap-2"><span className="text-purple-400 font-mono">1.</span> Add DATALAKE_BUCKET to .env</div>
                    <div className="flex gap-2"><span className="text-purple-400 font-mono">2.</span> Upload files via ETL tab → goes to S3</div>
                    <div className="flex gap-2"><span className="text-purple-400 font-mono">3.</span> Create Glue crawler to catalog files</div>
                    <div className="flex gap-2"><span className="text-purple-400 font-mono">4.</span> Query with standard SQL here</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* TABLE BROWSER */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'tables' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-1 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <input value={tableSearch} onChange={e => setTableSearch(e.target.value)} placeholder="Search tables..."
                      className="w-full bg-[#0F0A1E] border border-purple-800/40 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500" />
                  </div>
                  <button onClick={loadTables} className="p-2 text-slate-400 hover:text-white border border-purple-800/40 rounded-xl hover:border-purple-500">
                    <RefreshCw className={`w-4 h-4 ${tablesLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                {/* Core tables */}
                <div className="glow-border rounded-xl bg-[#0F0A1E] overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-purple-900/30 flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-400" /><span className="text-white text-sm font-semibold">PostgreSQL Core</span>
                  </div>
                  {tables.coreTables.filter(t => !tableSearch || t.name.includes(tableSearch)).map(t => (
                    <button key={t.name} onClick={() => previewTable(t.name)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-purple-950/20 transition-colors ${selectedTable===t.name?'bg-purple-950/30 border-l-2 border-purple-500':''}`}>
                      <div className="flex items-center gap-2"><Table2 className="w-3.5 h-3.5 text-slate-500" /><span className="text-slate-300 text-sm font-mono">{t.name}</span></div>
                      <span className="text-slate-500 text-xs">{t.rows}</span>
                    </button>
                  ))}
                </div>
                {/* ETL tables */}
                <div className="glow-border rounded-xl bg-[#0F0A1E] overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-purple-900/30 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-purple-400" /><span className="text-white text-sm font-semibold">ETL Imported</span>
                    <span className="text-xs bg-purple-900/50 text-purple-300 px-1.5 py-0.5 rounded-full">{tables.etlTables.length}</span>
                  </div>
                  {tables.etlTables.length === 0 ? (
                    <div className="px-4 py-6 text-center text-slate-600 text-sm">No ETL tables yet<br/>Upload via ETL tab</div>
                  ) : tables.etlTables.filter(t => !tableSearch || t.name.includes(tableSearch)).map(t => (
                    <div key={t.name} className={`flex items-center justify-between px-4 py-2.5 hover:bg-purple-950/20 transition-colors ${selectedTable===t.name?'bg-purple-950/30':''}`}>
                      <button onClick={() => previewTable(t.name)} className="flex items-center gap-2 flex-1 text-left">
                        <Table2 className="w-3.5 h-3.5 text-purple-400" /><span className="text-slate-300 text-sm font-mono">{t.name}</span>
                      </button>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-xs">{t.rows}</span>
                        <button onClick={() => { setSql(`SELECT * FROM "${t.name}" LIMIT 100`); setActiveTab('query') }} className="p-1 text-slate-600 hover:text-purple-400 transition-colors" title="Query"><Play className="w-3 h-3" /></button>
                        <button onClick={() => dropTable(t.name)} className="p-1 text-slate-600 hover:text-red-400 transition-colors" title="Drop"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Preview panel */}
              <div className="lg:col-span-2">
                {selectedTable && preview ? (
                  <div className="glow-border rounded-xl bg-[#0F0A1E] overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-purple-900/30">
                      <div>
                        <h3 className="font-bold text-white font-mono">{selectedTable}</h3>
                        <p className="text-slate-500 text-xs mt-0.5">{preview.rowCount} rows shown · {preview.columns.length} columns</p>
                      </div>
                      <button onClick={() => { setSql(`SELECT * FROM "${selectedTable}" LIMIT 500`); setActiveTab('query') }}
                        className="flex items-center gap-1.5 btn-primary text-white text-xs font-semibold px-4 py-2 rounded-lg">
                        <Play className="w-3.5 h-3.5" />Open in SQL Editor
                      </button>
                    </div>
                    <div className="px-5 py-3 border-b border-purple-900/20">
                      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Columns</p>
                      <div className="flex flex-wrap gap-1.5">
                        {preview.columns.map(col => (
                          <span key={col} className="px-2 py-0.5 bg-purple-950/40 border border-purple-800/30 rounded text-xs font-mono text-purple-300">{col}</span>
                        ))}
                      </div>
                    </div>
                    <ResultTable result={preview} />
                  </div>
                ) : (
                  <div className="glow-border rounded-xl p-16 bg-[#0F0A1E] text-center">
                    <Table2 className="w-10 h-10 text-slate-700 mx-auto mb-3" /><p className="text-slate-500">Select a table to preview its data</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* ETL UPLOAD TAB */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'etl' && (
            <div className="max-w-3xl space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">ETL — Extract, Transform, Load</h2>
                <p className="text-slate-400 text-sm">Upload any file. It gets automatically parsed, typed, and loaded into a queryable PostgreSQL table. Also backed up to S3.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Load Mode</label>
                  <select value={etlMode} onChange={e => setEtlMode(e.target.value as 'append'|'replace')}
                    className="w-full bg-purple-950/30 border border-purple-800/40 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500">
                    <option value="append" className="bg-[#0F0A1E]">Append — add to existing table</option>
                    <option value="replace" className="bg-[#0F0A1E]">Replace — drop and recreate</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <div className="text-xs text-slate-500 space-y-1 pb-0.5">
                    <p className="text-slate-300 font-medium">Supported formats:</p>
                    {['CSV', 'TSV', 'JSON', 'NDJSON', 'Excel (.xlsx/.xls)', 'Plain text'].map(f => (
                      <span key={f} className="inline-block mr-1.5 px-2 py-0.5 bg-purple-950/30 rounded-md text-purple-300">{f}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* File upload zone */}
              <div className="glow-border rounded-2xl p-6 bg-[#0F0A1E]">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Upload className="w-4 h-4 text-purple-400" />Upload File</h3>
                <div
                  className="border-2 border-dashed border-purple-800/40 rounded-xl p-8 text-center hover:border-purple-500/60 transition-colors cursor-pointer"
                  onClick={() => document.getElementById('etl-file-input')?.click()}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setEtlFile(f) }}
                  onDragOver={e => e.preventDefault()}>
                  <input id="etl-file-input" type="file" className="hidden"
                    accept=".csv,.tsv,.json,.ndjson,.jsonl,.xlsx,.xls,.txt"
                    onChange={e => { if (e.target.files?.[0]) setEtlFile(e.target.files[0]) }} />
                  {etlFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileText className="w-8 h-8 text-purple-400" />
                      <div className="text-left">
                        <p className="text-white font-semibold">{etlFile.name}</p>
                        <p className="text-slate-400 text-sm">{(etlFile.size/1024).toFixed(1)} KB · {etlFile.name.split('.').pop()?.toUpperCase()}</p>
                      </div>
                      <button onClick={e => { e.stopPropagation(); setEtlFile(null) }} className="text-slate-500 hover:text-red-400"><X className="w-5 h-5" /></button>
                    </div>
                  ) : (
                    <><Upload className="w-10 h-10 text-slate-700 mx-auto mb-3" /><p className="text-white font-medium mb-1">Drop file here or click to browse</p><p className="text-slate-500 text-sm">CSV · TSV · JSON · NDJSON · Excel · Text (max 100MB)</p></>
                  )}
                </div>
                {etlFile && (
                  <button onClick={runETLUpload} disabled={etlLoading}
                    className="mt-4 btn-primary w-full flex items-center justify-center gap-2 text-white font-bold py-3 rounded-xl disabled:opacity-60">
                    {etlLoading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing…</> : <><Play className="w-4 h-4" fill="white" />Run ETL</>}
                  </button>
                )}
              </div>

              {/* Paste raw data */}
              <div className="glow-border rounded-2xl p-6 bg-[#0F0A1E]">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Code2 className="w-4 h-4 text-purple-400" />Paste Raw Data</h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Table Name</label>
                    <input value={etlTableName} onChange={e => setEtlTableName(e.target.value)} placeholder="my_data_table"
                      className="w-full bg-purple-950/30 border border-purple-800/40 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Format</label>
                    <select value={etlFormat} onChange={e => setEtlFormat(e.target.value)}
                      className="w-full bg-purple-950/30 border border-purple-800/40 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500">
                      <option value="csv" className="bg-[#0F0A1E]">CSV</option>
                      <option value="tsv" className="bg-[#0F0A1E]">TSV</option>
                      <option value="json" className="bg-[#0F0A1E]">JSON</option>
                      <option value="ndjson" className="bg-[#0F0A1E]">NDJSON</option>
                    </select>
                  </div>
                </div>
                <textarea value={etlText} onChange={e => setEtlText(e.target.value)} rows={6}
                  placeholder={`name,email,role\nAlice,alice@example.com,admin\nBob,bob@example.com,user`}
                  className="w-full bg-purple-950/20 border border-purple-800/40 rounded-xl p-3 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-purple-500 resize-y" />
                <button onClick={runETLText} disabled={etlLoading || !etlText.trim() || !etlTableName.trim()}
                  className="mt-3 btn-primary w-full flex items-center justify-center gap-2 text-white font-bold py-2.5 rounded-xl disabled:opacity-60">
                  {etlLoading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing…</> : <><Play className="w-4 h-4" fill="white" />Load Data</>}
                </button>
              </div>

              {/* ETL result */}
              {etlResult && (
                <div className={`glow-border rounded-xl p-5 ${etlResult.success ? 'bg-emerald-900/10 border-emerald-700/40' : 'bg-red-900/10 border-red-700/40'}`}>
                  <div className="flex items-start gap-3">
                    {etlResult.success ? <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />}
                    <div className="flex-1">
                      <p className={`font-semibold ${etlResult.success ? 'text-emerald-300' : 'text-red-300'}`}>{etlResult.success ? 'ETL Successful!' : 'ETL Failed'}</p>
                      <p className="text-slate-300 text-sm mt-1">{etlResult.message || etlResult.error}</p>
                      {etlResult.success && etlResult.table && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="text-xs bg-purple-900/40 text-purple-300 px-2 py-1 rounded">Table: <strong>{etlResult.table}</strong></span>
                          <span className="text-xs bg-purple-900/40 text-purple-300 px-2 py-1 rounded">Rows: <strong>{etlResult.rows}</strong></span>
                          {etlResult.sheets && <span className="text-xs bg-blue-900/40 text-blue-300 px-2 py-1 rounded">Sheets: {etlResult.sheets.join(', ')}</span>}
                          <button onClick={() => { previewTable(etlResult.table!); setActiveTab('tables') }} className="text-xs text-purple-400 hover:text-purple-300 underline">View table →</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* GOOGLE DRIVE ETL TAB */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'drive' && (
            <div className="max-w-2xl space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2"><Cloud className="w-5 h-5 text-blue-400" />Google Drive ETL</h2>
                <p className="text-slate-400 text-sm">Import files directly from Google Drive into the data lake. Supports Sheets (→CSV), Excel, CSV, JSON, and plain text.</p>
              </div>

              <div className="glow-border rounded-2xl p-6 bg-[#0F0A1E] space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Google Drive File ID <span className="text-slate-500 font-normal">— from the URL</span></label>
                  <input value={driveFileId} onChange={e => setDriveFileId(e.target.value)} placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                    className="w-full bg-purple-950/30 border border-purple-800/40 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 font-mono" />
                  <p className="text-slate-600 text-xs mt-1.5">From URL: drive.google.com/file/d/<span className="text-purple-400">FILE_ID</span>/view</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Format <span className="text-slate-600">(auto-detects)</span></label>
                    <select value={driveFormat} onChange={e => setDriveFormat(e.target.value)}
                      className="w-full bg-purple-950/30 border border-purple-800/40 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500">
                      <option value="auto" className="bg-[#0F0A1E]">Auto-detect</option>
                      <option value="csv"  className="bg-[#0F0A1E]">CSV</option>
                      <option value="xlsx" className="bg-[#0F0A1E]">Excel (.xlsx)</option>
                      <option value="json" className="bg-[#0F0A1E]">JSON</option>
                      <option value="txt"  className="bg-[#0F0A1E]">Text / Unstructured</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Table Name <span className="text-slate-600">(optional)</span></label>
                    <input value={driveTable} onChange={e => setDriveTable(e.target.value)} placeholder="auto from filename"
                      className="w-full bg-purple-950/30 border border-purple-800/40 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Load Mode</label>
                  <select value={etlMode} onChange={e => setEtlMode(e.target.value as 'append'|'replace')}
                    className="w-full bg-purple-950/30 border border-purple-800/40 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500">
                    <option value="append"  className="bg-[#0F0A1E]">Append</option>
                    <option value="replace" className="bg-[#0F0A1E]">Replace</option>
                  </select>
                </div>
                <button onClick={runDriveETL} disabled={driveLoading || !driveFileId.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 transition-colors">
                  {driveLoading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Importing from Drive…</> : <><Cloud className="w-4 h-4" />Import from Google Drive</>}
                </button>
              </div>

              {driveResult && (
                <div className={`glow-border rounded-xl p-5 ${driveResult.success ? 'bg-emerald-900/10 border-emerald-700/40' : 'bg-red-900/10 border-red-700/40'}`}>
                  <div className="flex gap-3">
                    {driveResult.success ? <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
                    <div>
                      <p className={`font-semibold text-sm ${driveResult.success ? 'text-emerald-300' : 'text-red-300'}`}>{driveResult.success ? 'Import Successful!' : 'Import Failed'}</p>
                      <p className="text-slate-300 text-sm mt-1">{driveResult.message || driveResult.error}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="glow-border rounded-xl p-5 bg-[#0F0A1E]">
                <h4 className="text-white font-semibold text-sm mb-3 flex items-center gap-2"><Settings className="w-4 h-4 text-slate-400" />Setup Requirements</h4>
                <div className="space-y-2 text-xs text-slate-400">
                  <p className="text-slate-300 font-medium mb-2">Add to server .env to enable live Drive access:</p>
                  <div className="bg-[#08051A] rounded-lg p-3 font-mono space-y-1">
                    <p className="text-green-400">GOOGLE_SERVICE_KEY='{`{"type":"service_account","project_id":"..."}`}'</p>
                    <p className="text-slate-500"># Full Google Service Account JSON (one line)</p>
                  </div>
                  <p className="mt-3">Create a Service Account in Google Cloud Console → Enable Drive API → Share your Drive folder with the service account email.</p>
                </div>
              </div>

              <div className="glow-border rounded-xl p-5 bg-[#0F0A1E]">
                <h4 className="text-white font-semibold text-sm mb-3">Our Drive Folder</h4>
                <a href="https://drive.google.com/drive/folders/1DSp2WaZVTRwacJLkHv2rsqRcLAOu8jsy" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm transition-colors">
                  <FolderOpen className="w-4 h-4" />apkaai Google Drive
                  <Globe className="w-3.5 h-3.5" />
                </a>
                <p className="text-slate-500 text-xs mt-2">Copy file IDs from individual files in this folder and paste above to import.</p>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* S3 LAKE BROWSER */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 's3' && (
            <div className="space-y-5">
              {/* Summary cards */}
              {s3Summary?.configured ? (
                <>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-5 h-5 text-purple-400" />
                      <span className="text-white font-bold">{s3Summary.bucket}</span>
                      <span className="text-xs bg-emerald-900/40 text-emerald-400 border border-emerald-700/30 px-2 py-0.5 rounded-full">Active</span>
                    </div>
                    <button onClick={loadS3Summary} className="p-2 text-slate-400 hover:text-white border border-purple-800/40 rounded-lg hover:border-purple-500">
                      <RefreshCw className={`w-4 h-4 ${s3Loading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {s3Summary.summary.map(f => (
                      <button key={f.folder} onClick={() => browseS3(f.folder)}
                        className="glow-border rounded-xl p-4 bg-[#0F0A1E] text-left hover:border-purple-500/60 transition-all">
                        <FolderOpen className="w-5 h-5 text-yellow-400 mb-2" />
                        <p className="text-slate-300 text-xs font-medium truncate">{f.folder.replace(/\/$/, '')}</p>
                        <p className="text-purple-400 font-bold mt-1">{f.fileCount} files</p>
                        <p className="text-slate-500 text-xs">{f.totalSize}</p>
                      </button>
                    ))}
                  </div>

                  {/* File browser */}
                  <div className="glow-border rounded-xl bg-[#0F0A1E] overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-purple-900/30 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Archive className="w-4 h-4 text-purple-400" />
                        <span className="text-white font-semibold text-sm">S3 Browser</span>
                        <span className="text-slate-500 text-xs font-mono">{s3Prefix || '/'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {s3Prefix && <button onClick={() => browseS3('')} className="text-slate-400 hover:text-white text-xs px-2 py-1 border border-purple-800/40 rounded-lg">← Root</button>}
                        <button onClick={() => browseS3(s3Prefix)} className="text-slate-400 hover:text-white p-1.5 border border-purple-800/40 rounded-lg">
                          <RefreshCw className={`w-3.5 h-3.5 ${s3Loading ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </div>
                    {s3Files.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <FolderOpen className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                        <p className="text-slate-500 text-sm">Click a folder above to browse files</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-purple-900/20">
                        {s3Files.map(f => (
                          <div key={f.key} className="flex items-center justify-between px-4 py-2.5 hover:bg-purple-950/20 transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                              <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
                              <span className="text-slate-300 text-sm font-mono truncate">{f.key.split('/').pop()}</span>
                            </div>
                            <div className="flex items-center gap-4 flex-shrink-0">
                              <span className="text-slate-500 text-xs">{f.sizeHuman}</span>
                              <span className="text-slate-600 text-xs">{new Date(f.lastModified).toLocaleDateString()}</span>
                              <button onClick={async () => {
                                const r = await apiFetch(`/api/datalake/s3/presign?key=${encodeURIComponent(f.key)}`)
                                const d = await r.json()
                                if (d.url) window.open(d.url, '_blank')
                              }} className="p-1.5 text-slate-500 hover:text-purple-400 transition-colors" title="Download">
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="glow-border rounded-xl p-10 bg-[#0F0A1E] text-center max-w-lg mx-auto">
                  <HardDrive className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                  <h3 className="text-white font-bold text-lg mb-2">S3 Data Lake Not Configured</h3>
                  <p className="text-slate-400 text-sm mb-4">{s3Summary?.error || 'Add DATALAKE_BUCKET to your server .env to enable the S3 data lake.'}</p>
                  <div className="bg-[#08051A] rounded-lg p-3 font-mono text-left">
                    <p className="text-green-400 text-xs">DATALAKE_BUCKET=apkaai-datalake-123456789</p>
                    <p className="text-green-400 text-xs">ATHENA_WORKGROUP=apkaai-datalake</p>
                    <p className="text-green-400 text-xs">ATHENA_OUTPUT=s3://apkaai-datalake-123456789/athena-results/</p>
                    <p className="text-green-400 text-xs">GLUE_DATABASE=apkaai_datalake</p>
                  </div>
                  <button onClick={loadS3Summary} className="mt-4 btn-primary text-white px-6 py-2.5 rounded-xl text-sm font-semibold">
                    <RefreshCw className="w-4 h-4 inline mr-2" />Retry
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* GLUE CATALOG TAB */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'glue' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2"><Layers className="w-5 h-5 text-cyan-400" />AWS Glue Data Catalog</h2>
                  <p className="text-slate-400 text-sm mt-0.5">Catalog of all S3-backed tables for Athena querying</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={loadGlueTables} className="flex items-center gap-2 px-4 py-2 border border-purple-800/40 text-slate-300 hover:text-white hover:border-purple-500 rounded-xl text-sm transition-all">
                    <RefreshCw className={`w-4 h-4 ${glueLoading ? 'animate-spin' : ''}`} />Refresh
                  </button>
                  <button onClick={async () => {
                    const r = await apiFetch('/api/datalake/glue/crawl', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
                    const d = await r.json()
                    alert(d.message || d.error)
                  }} className="flex items-center gap-2 px-4 py-2 bg-cyan-700 hover:bg-cyan-600 text-white rounded-xl text-sm transition-colors">
                    <Zap className="w-4 h-4" />Run Crawler
                  </button>
                </div>
              </div>

              {glueError && <div className="glow-border rounded-xl p-4 bg-red-900/10 border-red-700/40 flex gap-3"><AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" /><p className="text-red-400 text-sm">{glueError}</p></div>}

              {glueTables.length === 0 && !glueLoading && !glueError ? (
                <div className="glow-border rounded-xl p-10 bg-[#0F0A1E] text-center">
                  <Layers className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <h3 className="text-white font-bold mb-2">No Glue Tables Found</h3>
                  <p className="text-slate-400 text-sm mb-4">Upload files via ETL, then run a Glue crawler to automatically catalog them for Athena queries.</p>
                  <div className="text-slate-500 text-xs space-y-1">
                    <p>1. Upload CSV/Excel files in the ETL tab</p>
                    <p>2. Click "Run Crawler" above to catalog S3 files</p>
                    <p>3. Query with Athena</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {glueTables.map(t => (
                    <div key={t.name} className="glow-border rounded-xl bg-[#0F0A1E] p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-white font-mono">{t.name}</h3>
                          <p className="text-slate-500 text-xs mt-0.5">{t.database} · {t.location?.split('/').slice(-2).join('/')}</p>
                        </div>
                        <button onClick={() => { setAthenaSql(`SELECT * FROM "${t.name}" LIMIT 100`); setActiveTab('athena') }}
                          className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors border border-cyan-800/40 hover:border-cyan-500 px-2.5 py-1.5 rounded-lg">
                          <Zap className="w-3 h-3" />Query
                        </button>
                      </div>
                      {t.columns && (
                        <div className="flex flex-wrap gap-1.5">
                          {t.columns.slice(0, 8).map(c => (
                            <span key={c.name} className="text-xs px-2 py-0.5 bg-purple-950/40 border border-purple-800/30 rounded font-mono text-purple-300">
                              {c.name} <span className="text-slate-600">({c.type})</span>
                            </span>
                          ))}
                          {(t.columns.length > 8) && <span className="text-xs text-slate-600">+{t.columns.length - 8} more</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  )
}
