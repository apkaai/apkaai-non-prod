'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Shield, LogOut, Activity, RefreshCw, AlertTriangle,
  Server, Database, Cloud, HardDrive, BarChart3,
  Users, Mail, Clock, CheckCircle2, XCircle, Cpu,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MonitoringData {
  ok: boolean
  status: string
  issues: string[]
  timestamp: string
  region: string
  ec2Id?: string
  rdsId?: string
  error?: string
  resources: {
    ec2:        { status: string; cpu?: number | null }
    rds:        { status: string; cpu?: number | null; connections?: number | null; freeStorageGB?: number | null; readLatencyMs?: number | null }
    cloudfront: { status: string }
    s3:         { status: string }
  }
  series?: Record<string, { timestamps: string[]; values: number[] }>
}

// ─── Auth guard ───────────────────────────────────────────────────────────────
function useAdminGuard() {
  const router = useRouter()
  const [authed, setAuthed] = useState(false)
  const [token,  setToken]  = useState('')

  useEffect(() => {
    try {
      const u = localStorage.getItem('apkaai_user') || sessionStorage.getItem('apkaai_user')
      const t = localStorage.getItem('apkaai_token') || sessionStorage.getItem('apkaai_token') || ''
      if (!u) { router.replace('/admin/login'); return }
      const user = JSON.parse(u)
      if (user?.role !== 'admin') { router.replace('/admin/login'); return }
      setAuthed(true); setToken(t)
    } catch { router.replace('/admin/login') }
  }, [router])

  return { authed, token }
}

function signOut() {
  try {
    ['apkaai_token','apkaai_user'].forEach(k => {
      localStorage.removeItem(k); sessionStorage.removeItem(k)
    })
  } catch {}
  window.location.href = '/admin/login'
}

// ─── Safe sparkline (pure SVG, no crashes) ────────────────────────────────────
function MiniChart({ data, color = '#a855f7' }: { data: number[]; color?: string }) {
  const safe = (data || []).filter(v => typeof v === 'number' && isFinite(v) && !isNaN(v))
  if (safe.length < 2) return <div className="h-10 flex items-center justify-center text-slate-600 text-xs">No data</div>

  const W = 200; const H = 40; const PAD = 4
  const lo = Math.min(...safe); const hi = Math.max(...safe); const rng = (hi - lo) || 1

  const pts = safe.map((v, i) => {
    const x = PAD + (i / (safe.length - 1)) * (W - PAD * 2)
    const y = H - PAD - ((v - lo) / rng) * (H - PAD * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="mt-1">
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
    </svg>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, unit = '', color = 'text-white', chartData, chartColor }:
  { label: string; value: string | number | null; unit?: string; color?: string; chartData?: number[]; chartColor?: string }
) {
  return (
    <div className="glow-border rounded-xl bg-[#0F0A1E] p-4">
      <p className="text-slate-400 text-xs mb-1">{label}</p>
      <p className={`text-xl font-extrabold ${color}`}>
        {value !== null && value !== undefined && value !== '' ? `${value}${unit}` : '—'}
      </p>
      {chartData && chartData.length > 1 && <MiniChart data={chartData} color={chartColor || '#a855f7'} />}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function MonitoringPage() {
  const { authed, token } = useAdminGuard()

  const [data,        setData]        = useState<MonitoringData | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [errorMsg,    setErrorMsg]    = useState('')
  const [lastUpdated, setLastUpdated] = useState('')
  const [hours,       setHours]       = useState(3)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchData = useCallback(async () => {
    if (!token) return
    setLoading(true); setErrorMsg('')
    try {
      const r = await fetch(`/api/admin/monitoring/status?hours=${hours}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (r.status === 401 || r.status === 403) { window.location.href = '/admin/login'; return }
      const d: MonitoringData = await r.json()
      setData(d)
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (e) {
      setErrorMsg('Cannot reach monitoring API. Will retry in 30s.')
    } finally { setLoading(false) }
  }, [token, hours])

  useEffect(() => {
    if (!authed) return
    fetchData()
    timerRef.current = setInterval(fetchData, 30000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [authed, fetchData])

  if (!authed) return (
    <div className="min-h-screen flex items-center justify-center bg-[#08051A]">
      <div className="w-6 h-6 border-2 border-purple-500/40 border-t-purple-400 rounded-full animate-spin" />
    </div>
  )

  const ec2  = data?.resources?.ec2
  const rds  = data?.resources?.rds
  const cf   = data?.resources?.cloudfront
  const s3r  = data?.resources?.s3
  const ser  = data?.series || {}

  const statusColor = data?.status === 'healthy' ? 'text-emerald-400'
    : data?.status === 'degraded' ? 'text-amber-400'
    : data?.status === 'critical' ? 'text-red-400'
    : 'text-slate-400'

  const tabs = [
    { label: 'Overview',   icon: BarChart3, href: '/admin' },
    { label: 'Users',      icon: Users,     href: '/admin' },
    { label: 'Contacts',   icon: Mail,      href: '/admin' },
    { label: 'Data Lake',  icon: HardDrive, href: '/admin' },
    { label: 'Monitoring',            icon: Activity,  href: '/admin/monitoring', active: true },
    { label: 'Monitoring in Grafana', icon: BarChart3, href: '/admin/monitoring-grafana' },
  ]

  return (
    <div className="min-h-screen bg-[#08051A]">

      {/* Top bar */}
      <div className="border-b border-purple-900/30 bg-[#0F0A1E]/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-purple-400" />
            <span className="font-bold text-white">ApkaAI Admin</span>
            <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">Control Panel</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-slate-400 hover:text-white text-sm">View Site</Link>
            <button onClick={signOut} className="flex items-center gap-1.5 text-red-400 hover:text-red-300 text-sm">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map(t => (
            <Link key={t.label} href={t.href}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all flex-shrink-0 ${
                ('active' in t && t.active) ? 'bg-purple-600 border-purple-500 text-white' : 'bg-[#0F0A1E] border-purple-800/40 text-slate-300 hover:border-purple-600'
              }`}>
              <t.icon className="w-4 h-4" />
              {t.label}
            </Link>
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
              <Activity className="w-6 h-6 text-purple-400" />
              AWS Infrastructure Monitoring
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">CloudWatch metrics · EC2 · RDS · ap-south-1</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Time range */}
            <div className="flex items-center gap-1 bg-purple-950/40 border border-purple-800/30 rounded-xl p-1">
              {[1, 3, 6, 12].map(h => (
                <button key={h} onClick={() => setHours(h)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${hours === h ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                  {h}h
                </button>
              ))}
            </div>

            {lastUpdated && (
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Clock className="w-3.5 h-3.5" /> Updated: {lastUpdated}
              </div>
            )}

            <button onClick={fetchData} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 bg-purple-900/40 border border-purple-700/40 hover:border-purple-500 text-slate-300 hover:text-white rounded-xl text-xs font-medium disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Error */}
        {errorMsg && (
          <div className="rounded-xl border border-red-700/30 bg-red-900/10 p-4 flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-400 text-sm">{errorMsg}</p>
          </div>
        )}

        {/* Status banner */}
        {data && (
          <div className={`rounded-xl border p-4 ${
            data.status === 'healthy' ? 'bg-emerald-900/20 border-emerald-700/40'
            : data.status === 'degraded' ? 'bg-amber-900/20 border-amber-700/40'
            : data.status === 'critical' ? 'bg-red-900/20 border-red-700/40'
            : 'bg-slate-900/20 border-slate-700/40'
          }`}>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xl">{data.status === 'healthy' ? '✅' : data.status === 'degraded' ? '⚠️' : data.status === 'critical' ? '🔴' : '❓'}</span>
              <div>
                <p className={`font-bold text-sm ${statusColor}`}>
                  {data.status === 'healthy' ? 'All Systems Healthy'
                  : data.status === 'degraded' ? 'Degraded Performance'
                  : data.status === 'critical' ? 'Critical Issues'
                  : 'Status Unknown'}
                </p>
                <p className="text-slate-400 text-xs">Region: {data.region || 'ap-south-1'} · EC2: {(data.ec2Id || '').slice(-8)} · RDS: {data.rdsId || 'apkaai-db'}</p>
              </div>
              {(data.issues || []).map((issue, i) => (
                <span key={i} className="flex items-center gap-1 text-xs bg-amber-900/30 border border-amber-700/40 text-amber-300 px-2.5 py-1 rounded-lg">
                  <AlertTriangle className="w-3 h-3" /> {issue}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !data && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="glow-border rounded-xl bg-[#0F0A1E] p-4 h-28 animate-pulse">
                <div className="h-2 bg-purple-900/40 rounded w-1/2 mb-3" />
                <div className="h-6 bg-purple-900/40 rounded w-1/3" />
              </div>
            ))}
          </div>
        )}

        {/* EC2 metrics */}
        {data && (
          <>
            <div>
              <h2 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                <Server className="w-4 h-4 text-orange-400" /> EC2 Instance
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard label="CPU Utilization" value={ec2?.cpu ?? null} unit="%" color="text-orange-400"
                  chartData={ser.ec2_cpu?.values} chartColor="#f97316" />
                <StatCard label="Network In (KB/5min)"
                  value={(ser.ec2_netin?.values?.length) ? Math.round((ser.ec2_netin.values[ser.ec2_netin.values.length - 1] || 0) / 1024) : null}
                  unit="" color="text-purple-400" chartData={ser.ec2_netin?.values} chartColor="#a855f7" />
                <StatCard label="Network Out (KB/5min)"
                  value={(ser.ec2_netout?.values?.length) ? Math.round((ser.ec2_netout.values[ser.ec2_netout.values.length - 1] || 0) / 1024) : null}
                  unit="" color="text-violet-400" chartData={ser.ec2_netout?.values} chartColor="#7c3aed" />
              </div>
            </div>

            {/* RDS metrics */}
            <div>
              <h2 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-400" /> RDS PostgreSQL
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="CPU Utilization" value={rds?.cpu ?? null} unit="%" color="text-blue-400"
                  chartData={ser.rds_cpu?.values} chartColor="#3b82f6" />
                <StatCard label="DB Connections" value={rds?.connections ?? null} unit="" color="text-emerald-400"
                  chartData={ser.rds_conn?.values} chartColor="#10b981" />
                <StatCard label="Free Storage" value={rds?.freeStorageGB ?? null} unit=" GB" color="text-lime-400"
                  chartData={(ser.rds_free?.values || []).map(v => Math.round(v / 1073741824 * 10) / 10)} chartColor="#84cc16" />
                <StatCard label="Read Latency" value={rds?.readLatencyMs ?? null} unit=" ms" color="text-cyan-400"
                  chartData={(ser.rds_rl?.values || []).map(v => Math.round(v * 1000 * 10) / 10)} chartColor="#06b6d4" />
              </div>
            </div>

            {/* Other services */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: Cloud,    label: 'CloudFront',    status: cf?.status },
                { icon: HardDrive,label: 'S3 Storage',    status: s3r?.status },
                { icon: Server,   label: 'Region',        status: 'ap-south-1' },
                { icon: Database, label: 'DB Engine',     status: 'PostgreSQL' },
              ].map(item => (
                <div key={item.label} className="glow-border rounded-xl bg-[#0F0A1E] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <item.icon className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-400 text-xs">{item.label}</span>
                  </div>
                  <p className={`text-sm font-semibold ${
                    item.status === 'operational' || item.status === 'available' ? 'text-emerald-400'
                    : item.status === 'unknown' || !item.status ? 'text-slate-500'
                    : 'text-white'
                  }`}>
                    {item.status === 'operational' ? '● Operational'
                    : item.status === 'available' ? '● Available'
                    : item.status === 'unknown' || !item.status ? '○ Unknown'
                    : item.status}
                  </p>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { icon: <Cpu className="w-4 h-4 text-purple-400" />,         title: 'Data Source',  value: 'Amazon CloudWatch · EC2 IAM Role' },
                { icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,title: 'Security',     value: 'Admin-only · Bearer token auth' },
                { icon: <RefreshCw className="w-4 h-4 text-sky-400" />,       title: 'Refresh',      value: '5-min CloudWatch · 30s page refresh' },
              ].map(item => (
                <div key={item.title} className="rounded-xl border border-purple-900/30 bg-purple-950/10 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    {item.icon}
                    <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{item.title}</span>
                  </div>
                  <p className="text-slate-300 text-xs">{item.value}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
