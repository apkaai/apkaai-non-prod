'use client'
/**
 * /admin/monitoring-grafana
 * 
 * Grafana dashboard embedded inside the ApkaAI Admin Console.
 * Auth: AdminGuard (same as all admin pages)
 * Grafana: anonymous viewer access via /grafana/ Nginx proxy
 * Dashboard: apkaai-aws-monitoring (20 panels, CloudWatch data)
 */
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Shield, LogOut, Activity, BarChart3, Users,
  Mail, HardDrive, ExternalLink, RefreshCw,
  CheckCircle2, AlertCircle, Loader2,
} from 'lucide-react'

// ─── Auth guard ────────────────────────────────────────────────────────────────
function useAdminGuard() {
  const router = useRouter()
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    try {
      const u = localStorage.getItem('apkaai_user') || sessionStorage.getItem('apkaai_user')
      if (!u) { router.replace('/admin/login'); return }
      const user = JSON.parse(u)
      if (user?.role !== 'admin') { router.replace('/admin/login'); return }
      setAuthed(true)
    } catch { router.replace('/admin/login') }
  }, [router])

  return authed
}

function signOut() {
  try {
    ['apkaai_token', 'apkaai_user'].forEach(k => {
      localStorage.removeItem(k); sessionStorage.removeItem(k)
    })
  } catch {}
  window.location.href = '/admin/login'
}

// ─── Grafana connection state ──────────────────────────────────────────────────
type GrafanaState = 'checking' | 'connected' | 'offline'

export default function MonitoringGrafanaPage() {
  const authed = useAdminGuard()

  const [grafanaState, setGrafanaState] = useState<GrafanaState>('checking')
  const [iframeKey, setIframeKey]       = useState(0)  // increment to force reload
  const [timeRange, setTimeRange]       = useState('3h')
  const [refreshInterval, setRefreshInterval] = useState('30s')
  const checkRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Check Grafana health
  const checkGrafana = async () => {
    try {
      const r = await fetch('/grafana/api/health', { cache: 'no-store' })
      setGrafanaState(r.ok ? 'connected' : 'offline')
    } catch {
      setGrafanaState('offline')
    }
  }

  useEffect(() => {
    if (!authed) return
    checkGrafana()
    // Re-check every 60 seconds
    checkRef.current = setInterval(checkGrafana, 60000)
    return () => { if (checkRef.current) clearInterval(checkRef.current) }
  }, [authed])

  const grafanaUrl = `/grafana/d/apkaai-aws-monitoring/apkaai-aws-monitoring?orgId=1&theme=dark&from=now-${timeRange}&to=now&refresh=${refreshInterval}`

  if (!authed) return (
    <div className="min-h-screen flex items-center justify-center bg-[#08051A]">
      <div className="w-6 h-6 border-2 border-purple-500/40 border-t-purple-400 rounded-full animate-spin" />
    </div>
  )

  const tabs = [
    { label: 'Overview',              icon: BarChart3,  href: '/admin' },
    { label: 'Users',                 icon: Users,      href: '/admin' },
    { label: 'Contacts',              icon: Mail,       href: '/admin' },
    { label: 'Data Lake',             icon: HardDrive,  href: '/admin' },
    { label: 'Monitoring',            icon: Activity,   href: '/admin/monitoring' },
    { label: 'Monitoring in Grafana', icon: BarChart3,  href: '/admin/monitoring-grafana', active: true },
  ]

  return (
    <div className="min-h-screen bg-[#08051A] flex flex-col">

      {/* ── Top bar ── */}
      <div className="border-b border-purple-900/30 bg-[#0F0A1E]/80 backdrop-blur-xl sticky top-0 z-30 flex-shrink-0">
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

      <div className="max-w-7xl mx-auto px-4 pt-6 pb-4 flex-shrink-0 w-full">

        {/* ── Tabs ── */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-5">
          {tabs.map(t => (
            <Link key={t.label} href={t.href}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all flex-shrink-0 ${
                ('active' in t && t.active)
                  ? 'bg-purple-600 border-purple-500 text-white'
                  : 'bg-[#0F0A1E] border-purple-800/40 text-slate-300 hover:border-purple-600'
              }`}>
              <t.icon className="w-4 h-4" />
              {t.label}
            </Link>
          ))}
        </div>

        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-3">
            {/* Grafana logo */}
            <div className="w-9 h-9 rounded-xl bg-[#F46800]/15 border border-[#F46800]/40 flex items-center justify-center flex-shrink-0">
              <span className="text-[#F46800] font-black text-base">G</span>
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white">Monitoring in Grafana</h1>
              <p className="text-slate-500 text-xs">ApkaAI AWS Monitoring · EC2 · RDS · CloudFront · S3</p>
            </div>
            {/* Connection badge */}
            {grafanaState === 'checking' && (
              <span className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/40 border border-slate-700/40 px-3 py-1 rounded-full">
                <Loader2 className="w-3 h-3 animate-spin" /> Connecting…
              </span>
            )}
            {grafanaState === 'connected' && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-900/20 border border-emerald-700/40 px-3 py-1 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Grafana Connected
              </span>
            )}
            {grafanaState === 'offline' && (
              <span className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-900/20 border border-amber-700/40 px-3 py-1 rounded-full">
                <AlertCircle className="w-3 h-3" /> Grafana Offline
              </span>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Time range */}
            <div className="flex items-center gap-1 bg-purple-950/40 border border-purple-800/30 rounded-xl p-1">
              {['1h','3h','6h','12h','24h'].map(t => (
                <button key={t} onClick={() => { setTimeRange(t); setIframeKey(k => k + 1) }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${timeRange === t ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                  {t}
                </button>
              ))}
            </div>

            {/* Refresh rate */}
            <select value={refreshInterval} onChange={e => { setRefreshInterval(e.target.value); setIframeKey(k => k + 1) }}
              className="bg-purple-950/40 border border-purple-800/30 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500">
              <option value="30s">Auto 30s</option>
              <option value="1m">Auto 1m</option>
              <option value="5m">Auto 5m</option>
              <option value="off">No auto-refresh</option>
            </select>

            {/* Reload button */}
            <button onClick={() => setIframeKey(k => k + 1)}
              className="flex items-center gap-1.5 px-3 py-2 bg-purple-900/40 border border-purple-700/40 hover:border-purple-500 text-slate-300 hover:text-white rounded-xl text-xs font-medium transition-all">
              <RefreshCw className="w-3.5 h-3.5" /> Reload
            </button>

            {/* Open in Grafana */}
            <a href={`/grafana/d/apkaai-aws-monitoring/apkaai-aws-monitoring?orgId=1&theme=dark&from=now-${timeRange}&to=now`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 border border-[#F46800]/40 hover:border-[#F46800] text-[#F46800] hover:text-orange-300 rounded-xl text-xs font-medium transition-all">
              <ExternalLink className="w-3.5 h-3.5" /> Open in Grafana
            </a>
          </div>
        </div>
      </div>

      {/* ── Grafana iframe — fills remaining screen height ── */}
      <div className="flex-1 px-4 pb-4 w-full">
        {grafanaState === 'offline' ? (
          /* Offline state */
          <div className="h-full min-h-[500px] glow-border rounded-2xl bg-[#0F0A1E] flex flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-900/20 border border-amber-700/30 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-amber-400 opacity-70" />
            </div>
            <h3 className="text-white font-bold text-lg">Grafana is temporarily unavailable</h3>
            <p className="text-slate-400 text-sm max-w-md">
              Grafana may be starting up. Your CloudWatch metrics are still available on the
              {' '}<Link href="/admin/monitoring" className="text-purple-400 hover:text-purple-300 underline">Monitoring</Link> tab.
            </p>
            <div className="flex gap-3">
              <button onClick={() => { checkGrafana(); setIframeKey(k => k + 1) }}
                className="flex items-center gap-2 btn-primary text-white text-sm font-semibold px-5 py-2.5 rounded-xl">
                <RefreshCw className="w-4 h-4" /> Retry
              </button>
              <Link href="/admin/monitoring"
                className="flex items-center gap-2 border border-purple-700/40 hover:border-purple-500 text-slate-300 hover:text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all">
                <Activity className="w-4 h-4" /> CloudWatch Dashboard
              </Link>
            </div>
          </div>
        ) : (
          <div className="relative w-full rounded-2xl overflow-hidden border border-purple-900/30" style={{ height: 'calc(100vh - 260px)', minHeight: '600px' }}>
            {/* Loading overlay while iframe loads */}
            {grafanaState === 'checking' && (
              <div className="absolute inset-0 bg-[#0F0A1E] z-10 flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F46800]/15 border border-[#F46800]/40 flex items-center justify-center">
                  <span className="text-[#F46800] font-black text-lg">G</span>
                </div>
                <div className="w-6 h-6 border-2 border-[#F46800]/30 border-t-[#F46800] rounded-full animate-spin" />
                <p className="text-slate-400 text-sm">Loading Grafana dashboard…</p>
              </div>
            )}

            {/*
              Grafana iframe
              - Served via /grafana/ Nginx proxy (localhost:3002 internal)
              - Anonymous viewer access (auth.anonymous = true in grafana.ini)
              - CloudWatch datasource uses EC2 IAM role credentials
              - No Grafana credentials exposed in URL
            */}
            <iframe
              key={iframeKey}
              src={grafanaUrl}
              className="w-full h-full border-0 bg-[#161722]"
              title="Grafana — ApkaAI AWS Monitoring"
              allow="fullscreen"
              onLoad={() => setGrafanaState('connected')}
              onError={() => setGrafanaState('offline')}
            />
          </div>
        )}
      </div>

      {/* ── Footer info strip ── */}
      <div className="flex-shrink-0 px-4 pb-4 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-slate-600">
          <span>📊 Grafana 10.4.3 · CloudWatch datasource · EC2 IAM role · ap-south-1</span>
          <span>🔒 Admin-only · Anonymous viewer · /grafana Nginx proxy</span>
          <span>⏱ Auto-refresh: {refreshInterval} · Time range: last {timeRange}</span>
        </div>
      </div>
    </div>
  )
}
