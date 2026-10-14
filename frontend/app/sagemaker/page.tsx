'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import {
  Brain, Play, Square, Trash2, Plus, RefreshCw, Loader2,
  CheckCircle2, AlertCircle, Clock, Server, Database,
  BookOpen, Activity, DollarSign, ChevronDown, ExternalLink,
  Cpu, HardDrive, Zap, Settings, Info, Copy, Check, X
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface TrainingJob {
  TrainingJobName:   string
  TrainingJobStatus: string
  CreationTime:      string
  TrainingEndTime?:  string
  LastModifiedTime?: string
}

interface Endpoint {
  EndpointName:   string
  EndpointStatus: string
  CreationTime:   string
  LastModifiedTime?: string
}

interface Notebook {
  NotebookInstanceName:   string
  NotebookInstanceStatus: string
  InstanceType:           string
  CreationTime:           string
  Url?:                   string
}

interface Model {
  ModelName:   string
  CreationTime: string
}

interface AWSStatus {
  sdkAvailable:     boolean
  awsConnected?:    boolean
  region:           string
  roleConfigured:   boolean
  bucketConfigured: boolean
  missing:          string[]
  awsError?:        string
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const API = process.env.NEXT_PUBLIC_API_URL || ''

function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('apkaai_token') || sessionStorage.getItem('apkaai_token')
}
function authH(): Record<string, string> {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }
           : { 'Content-Type': 'application/json' }
}

function statusColor(s: string) {
  const map: Record<string, string> = {
    InProgress: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    Completed:  'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    Failed:     'text-red-400 bg-red-500/10 border-red-500/20',
    Stopped:    'text-slate-400 bg-slate-500/10 border-slate-500/20',
    InService:  'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    Creating:   'text-blue-400 bg-blue-500/10 border-blue-500/20',
    Deleting:   'text-orange-400 bg-orange-500/10 border-orange-500/20',
    OutOfService:'text-red-400 bg-red-500/10 border-red-500/20',
    Pending:    'text-blue-400 bg-blue-500/10 border-blue-500/20',
    Stopping:   'text-orange-400 bg-orange-500/10 border-orange-500/20',
    Starting:   'text-blue-400 bg-blue-500/10 border-blue-500/20',
  }
  return map[s] || 'text-slate-400 bg-slate-500/10 border-slate-500/20'
}

function statusIcon(s: string) {
  if (['InProgress','Creating','Starting','Pending'].includes(s))
    return <Loader2 className="w-3 h-3 animate-spin" />
  if (['Completed','InService'].includes(s))
    return <CheckCircle2 className="w-3 h-3" />
  if (['Failed','OutOfService'].includes(s))
    return <AlertCircle className="w-3 h-3" />
  return <Clock className="w-3 h-3" />
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${statusColor(status)}`}>
      {statusIcon(status)}{status}
    </span>
  )
}

function relTime(d: string) {
  try {
    const diff = Date.now() - new Date(d).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h/24)}d ago`
  } catch { return d }
}

// ── Instance type options ─────────────────────────────────────────────────────
const INSTANCE_TYPES = [
  'ml.t3.medium','ml.t3.large','ml.t3.xlarge',
  'ml.m5.large','ml.m5.xlarge','ml.m5.2xlarge','ml.m5.4xlarge',
  'ml.c5.xlarge','ml.c5.2xlarge','ml.c5.4xlarge',
  'ml.p3.2xlarge','ml.p3.8xlarge',
  'ml.g4dn.xlarge','ml.g4dn.2xlarge','ml.g4dn.4xlarge',
]

// ── Toast ─────────────────────────────────────────────────────────────────────
function useToast() {
  const [msg, setMsg] = useState('')
  const show = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500) }
  return { msg, show }
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SageMakerPage() {
  const [tab, setTab] = useState<'overview'|'training'|'endpoints'|'notebooks'|'models'|'cost'>('overview')
  const [awsStatus, setAwsStatus] = useState<AWSStatus | null>(null)
  const [trainingJobs, setTrainingJobs] = useState<TrainingJob[]>([])
  const [endpoints,    setEndpoints]    = useState<Endpoint[]>([])
  const [notebooks,    setNotebooks]    = useState<Notebook[]>([])
  const [models,       setModels]       = useState<Model[]>([])
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [isSignedIn, setIsSignedIn] = useState(false)
  const { msg: toast, show: showToast } = useToast()

  // Create forms
  const [showCreateJob,      setShowCreateJob]      = useState(false)
  const [showCreateEndpoint, setShowCreateEndpoint] = useState(false)
  const [showCreateNotebook, setShowCreateNotebook] = useState(false)
  const [showCreateModel,    setShowCreateModel]    = useState(false)

  // Cost estimator
  const [costInstance, setCostInstance] = useState('ml.m5.xlarge')
  const [costCount,    setCostCount]    = useState(1)
  const [costHours,    setCostHours]    = useState(1)
  const [costResult,   setCostResult]   = useState<any>(null)

  useEffect(() => { setIsSignedIn(!!getToken()) }, [])

  const setLoad = (key: string, v: boolean) => setLoading(p => ({ ...p, [key]: v }))

  // ── Fetch helpers ────────────────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    if (!getToken()) return
    setLoad('status', true)
    try {
      const r = await fetch(`${API}/api/sagemaker/status`, { headers: authH() })
      const d = await r.json()
      setAwsStatus(d)
    } catch { setAwsStatus({ sdkAvailable: false, region: 'unknown', roleConfigured: false, bucketConfigured: false, missing: ['API unreachable'] }) }
    finally { setLoad('status', false) }
  }, [])

  const fetchTraining = useCallback(async () => {
    setLoad('training', true)
    try {
      const r = await fetch(`${API}/api/sagemaker/training-jobs?maxResults=20`, { headers: authH() })
      const d = await r.json()
      setTrainingJobs(d.jobs || [])
    } catch { showToast('Failed to load training jobs') }
    finally { setLoad('training', false) }
  }, [])

  const fetchEndpoints = useCallback(async () => {
    setLoad('endpoints', true)
    try {
      const r = await fetch(`${API}/api/sagemaker/endpoints?maxResults=20`, { headers: authH() })
      const d = await r.json()
      setEndpoints(d.endpoints || [])
    } catch { showToast('Failed to load endpoints') }
    finally { setLoad('endpoints', false) }
  }, [])

  const fetchNotebooks = useCallback(async () => {
    setLoad('notebooks', true)
    try {
      const r = await fetch(`${API}/api/sagemaker/notebooks?maxResults=20`, { headers: authH() })
      const d = await r.json()
      setNotebooks(d.notebooks || [])
    } catch { showToast('Failed to load notebooks') }
    finally { setLoad('notebooks', false) }
  }, [])

  const fetchModels = useCallback(async () => {
    setLoad('models', true)
    try {
      const r = await fetch(`${API}/api/sagemaker/models?maxResults=20`, { headers: authH() })
      const d = await r.json()
      setModels(d.models || [])
    } catch { showToast('Failed to load models') }
    finally { setLoad('models', false) }
  }, [])

  useEffect(() => {
    if (!isSignedIn) return
    fetchStatus()
    if (tab === 'overview' || tab === 'training')   fetchTraining()
    if (tab === 'overview' || tab === 'endpoints')  fetchEndpoints()
    if (tab === 'overview' || tab === 'notebooks')  fetchNotebooks()
    if (tab === 'overview' || tab === 'models')     fetchModels()
  }, [tab, isSignedIn])

  // ── Actions ──────────────────────────────────────────────────────────────
  const stopJob = async (name: string) => {
    try {
      await fetch(`${API}/api/sagemaker/training-jobs/${name}/stop`, { method: 'POST', headers: authH() })
      showToast(`Stopping ${name}`)
      setTimeout(fetchTraining, 2000)
    } catch { showToast('Failed to stop job') }
  }

  const deleteEndpoint = async (name: string) => {
    if (!confirm(`Delete endpoint "${name}"?`)) return
    try {
      await fetch(`${API}/api/sagemaker/endpoints/${name}`, { method: 'DELETE', headers: authH() })
      showToast(`Deleting ${name}`)
      setTimeout(fetchEndpoints, 2000)
    } catch { showToast('Failed to delete endpoint') }
  }

  const notebookAction = async (name: string, action: 'start'|'stop'|'delete') => {
    if (action === 'delete' && !confirm(`Delete notebook "${name}"?`)) return
    try {
      const url = action === 'delete'
        ? `${API}/api/sagemaker/notebooks/${name}`
        : `${API}/api/sagemaker/notebooks/${name}/${action}`
      await fetch(url, { method: action === 'delete' ? 'DELETE' : 'POST', headers: authH() })
      showToast(`${action.charAt(0).toUpperCase() + action.slice(1)}ing ${name}`)
      setTimeout(fetchNotebooks, 2000)
    } catch { showToast(`Failed to ${action} notebook`) }
  }

  const deleteModel = async (name: string) => {
    if (!confirm(`Delete model "${name}"?`)) return
    try {
      await fetch(`${API}/api/sagemaker/models/${name}`, { method: 'DELETE', headers: authH() })
      showToast(`Model ${name} deleted`)
      setTimeout(fetchModels, 1500)
    } catch { showToast('Failed to delete model') }
  }

  const estimateCost = async () => {
    try {
      const r = await fetch(`${API}/api/sagemaker/cost-estimate`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ instanceType: costInstance, instanceCount: costCount, durationHours: costHours }),
      })
      const d = await r.json()
      setCostResult(d)
    } catch { showToast('Cost estimate failed') }
  }

  // ── Auth guard ────────────────────────────────────────────────────────────
  if (!isSignedIn) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center px-6 max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-orange-900/30 border border-orange-700/30 flex items-center justify-center mx-auto mb-4">
            <Brain className="w-8 h-8 text-orange-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Sign in required</h2>
          <p className="text-slate-400 text-sm mb-6">Please sign in to ApkaAI to access the SageMaker dashboard.</p>
          <a href="/signin" className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold">
            Sign in to ApkaAI
          </a>
        </div>
      </div>
    )
  }

  const tabs = [
    { key: 'overview',   label: 'Overview',        icon: <Activity className="w-4 h-4" /> },
    { key: 'training',   label: 'Training Jobs',   icon: <Brain className="w-4 h-4" />,  count: trainingJobs.length },
    { key: 'endpoints',  label: 'Endpoints',        icon: <Server className="w-4 h-4" />, count: endpoints.length },
    { key: 'notebooks',  label: 'Notebooks',        icon: <BookOpen className="w-4 h-4" />, count: notebooks.length },
    { key: 'models',     label: 'Models',           icon: <Database className="w-4 h-4" />, count: models.length },
    { key: 'cost',       label: 'Cost Estimator',   icon: <DollarSign className="w-4 h-4" /> },
  ] as const

  return (
    <div className="min-h-screen pt-20">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] bg-[#1A1035] border border-orange-700/60 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-extrabold text-white">AWS SageMaker</h1>
            </div>
            <p className="text-slate-400 text-sm">ML training jobs · model endpoints · notebook instances · cost estimation</p>
          </div>
          <button onClick={() => { fetchStatus(); if (tab !== 'cost') fetchTraining(), fetchEndpoints(), fetchNotebooks(), fetchModels() }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-orange-700/40 text-slate-300 hover:text-white text-sm transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading.training ? 'animate-spin' : ''}`} />Refresh
          </button>
        </div>

        {/* AWS Status bar */}
        {awsStatus && (
          <div className={`mb-5 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap text-sm border ${
            awsStatus.awsConnected ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
            : awsStatus.sdkAvailable ? 'bg-yellow-500/5 border-yellow-500/20 text-yellow-300'
            : 'bg-red-500/5 border-red-500/20 text-red-300'
          }`}>
            {awsStatus.awsConnected ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
             : awsStatus.sdkAvailable ? <AlertCircle className="w-4 h-4 flex-shrink-0" />
             : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            <span className="font-medium">
              {awsStatus.awsConnected ? `Connected — Region: ${awsStatus.region}`
               : awsStatus.awsError   ? `AWS Error: ${awsStatus.awsError}`
               : awsStatus.sdkAvailable ? `SDK ready — configure credentials`
               : 'SDK not installed'}
            </span>
            {awsStatus.missing.length > 0 && (
              <span className="text-xs opacity-75 ml-auto">Missing: {awsStatus.missing.slice(0,2).join(' · ')}</span>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-purple-900/30 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg border-b-2 whitespace-nowrap transition-all ${
                tab === t.key ? 'text-orange-300 border-orange-500 bg-orange-900/10'
                              : 'text-slate-400 border-transparent hover:text-white hover:bg-white/[0.03]'
              }`}>
              {t.icon}{t.label}
              {'count' in t && (t.count ?? 0) > 0 && (
                <span className="bg-orange-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {/* Stats cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Training Jobs', value: trainingJobs.length, icon: <Brain className="w-5 h-5 text-orange-400" />, sub: `${trainingJobs.filter(j => j.TrainingJobStatus === 'InProgress').length} running` },
                { label: 'Endpoints',     value: endpoints.length,    icon: <Server className="w-5 h-5 text-blue-400" />,   sub: `${endpoints.filter(e => e.EndpointStatus === 'InService').length} in service` },
                { label: 'Notebooks',     value: notebooks.length,    icon: <BookOpen className="w-5 h-5 text-green-400" />,sub: `${notebooks.filter(n => n.NotebookInstanceStatus === 'InService').length} running` },
                { label: 'Models',        value: models.length,       icon: <Database className="w-5 h-5 text-purple-400" />, sub: 'registered' },
              ].map(c => (
                <div key={c.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-xs font-medium">{c.label}</span>
                    {c.icon}
                  </div>
                  <div className="text-2xl font-bold text-white">{loading.training || loading.endpoints ? '...' : c.value}</div>
                  <div className="text-slate-500 text-xs mt-1">{c.sub}</div>
                </div>
              ))}
            </div>

            {/* Recent training jobs */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                <h3 className="text-white font-semibold flex items-center gap-2"><Brain className="w-4 h-4 text-orange-400" />Recent Training Jobs</h3>
                <button onClick={() => setTab('training')} className="text-orange-400 hover:text-orange-300 text-xs">View all →</button>
              </div>
              {trainingJobs.length === 0 ? (
                <div className="py-10 text-center text-slate-500 text-sm">No training jobs yet</div>
              ) : (
                <div className="divide-y divide-white/5">
                  {trainingJobs.slice(0, 5).map(j => (
                    <div key={j.TrainingJobName} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-white text-sm font-medium">{j.TrainingJobName}</p>
                        <p className="text-slate-500 text-xs">{relTime(j.CreationTime)}</p>
                      </div>
                      <StatusBadge status={j.TrainingJobStatus} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Setup guide if not connected */}
            {awsStatus && !awsStatus.awsConnected && (
              <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-5">
                <h3 className="text-orange-300 font-semibold mb-3 flex items-center gap-2"><Info className="w-4 h-4" />Setup Guide</h3>
                <ol className="text-slate-300 text-sm space-y-2 list-decimal list-inside">
                  <li>Ensure the EC2 IAM role has <code className="text-orange-300">AmazonSageMakerFullAccess</code> policy</li>
                  <li>Add to <code className="text-orange-300">.env</code>: <code className="text-slate-200">SAGEMAKER_EXECUTION_ROLE=arn:aws:iam::ACCOUNT:role/SageMakerRole</code></li>
                  <li>Add to <code className="text-orange-300">.env</code>: <code className="text-slate-200">SAGEMAKER_S3_BUCKET=your-ml-bucket</code></li>
                  <li>Install SDK: <code className="text-orange-300">npm install @aws-sdk/client-sagemaker</code></li>
                  <li>Restart API: <code className="text-orange-300">pm2 restart apkaai-api</code></li>
                </ol>
              </div>
            )}
          </div>
        )}

        {/* ── TRAINING JOBS ── */}
        {tab === 'training' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-white font-bold text-lg">Training Jobs</h2>
              <button onClick={() => setShowCreateJob(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold transition-colors">
                <Plus className="w-4 h-4" />New Training Job
              </button>
            </div>

            {loading.training ? (
              <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 text-orange-400 animate-spin" /></div>
            ) : trainingJobs.length === 0 ? (
              <div className="py-20 text-center">
                <Brain className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No training jobs found.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="border-b border-white/10 bg-white/[0.02]">
                    <tr>
                      {['Job Name','Status','Created','Actions'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-slate-400 text-xs font-semibold uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {trainingJobs.map(j => (
                      <tr key={j.TrainingJobName} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-white font-medium">{j.TrainingJobName}</td>
                        <td className="px-4 py-3"><StatusBadge status={j.TrainingJobStatus} /></td>
                        <td className="px-4 py-3 text-slate-400">{relTime(j.CreationTime)}</td>
                        <td className="px-4 py-3">
                          {j.TrainingJobStatus === 'InProgress' && (
                            <button onClick={() => stopJob(j.TrainingJobName)}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs hover:bg-red-500/20 transition-colors">
                              <Square className="w-3 h-3" />Stop
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Create Training Job Modal */}
            {showCreateJob && <CreateTrainingJobForm onClose={() => setShowCreateJob(false)} onCreated={() => { setShowCreateJob(false); setTimeout(fetchTraining, 2000); showToast('Training job created!') }} showToast={showToast} />}
          </div>
        )}

        {/* ── ENDPOINTS ── */}
        {tab === 'endpoints' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-white font-bold text-lg">Endpoints</h2>
              <button onClick={() => setShowCreateEndpoint(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors">
                <Plus className="w-4 h-4" />Deploy Endpoint
              </button>
            </div>
            {loading.endpoints ? (
              <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 text-blue-400 animate-spin" /></div>
            ) : endpoints.length === 0 ? (
              <div className="py-20 text-center">
                <Server className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No endpoints deployed.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {endpoints.map(e => (
                  <div key={e.EndpointName} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-white font-semibold text-sm truncate max-w-[160px]">{e.EndpointName}</p>
                      <StatusBadge status={e.EndpointStatus} />
                    </div>
                    <p className="text-slate-500 text-xs mb-3">Created {relTime(e.CreationTime)}</p>
                    <button onClick={() => deleteEndpoint(e.EndpointName)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs hover:bg-red-500/20 transition-colors">
                      <Trash2 className="w-3 h-3" />Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
            {showCreateEndpoint && <CreateEndpointForm onClose={() => setShowCreateEndpoint(false)} onCreated={() => { setShowCreateEndpoint(false); setTimeout(fetchEndpoints, 2000); showToast('Endpoint deployment started!') }} showToast={showToast} />}
          </div>
        )}

        {/* ── NOTEBOOKS ── */}
        {tab === 'notebooks' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-white font-bold text-lg">Notebook Instances</h2>
              <button onClick={() => setShowCreateNotebook(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition-colors">
                <Plus className="w-4 h-4" />New Notebook
              </button>
            </div>
            {loading.notebooks ? (
              <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 text-green-400 animate-spin" /></div>
            ) : notebooks.length === 0 ? (
              <div className="py-20 text-center">
                <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No notebook instances.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {notebooks.map(n => (
                  <div key={n.NotebookInstanceName} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-white font-semibold text-sm truncate max-w-[150px]">{n.NotebookInstanceName}</p>
                      <StatusBadge status={n.NotebookInstanceStatus} />
                    </div>
                    <p className="text-slate-400 text-xs mb-1 flex items-center gap-1"><Cpu className="w-3 h-3" />{n.InstanceType}</p>
                    <p className="text-slate-500 text-xs mb-3">Created {relTime(n.CreationTime)}</p>
                    <div className="flex gap-2 flex-wrap">
                      {n.NotebookInstanceStatus === 'Stopped' && (
                        <button onClick={() => notebookAction(n.NotebookInstanceName, 'start')}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 text-xs hover:bg-green-500/20">
                          <Play className="w-3 h-3" />Start
                        </button>
                      )}
                      {n.NotebookInstanceStatus === 'InService' && (
                        <>
                          {n.Url && <a href={`https://${n.Url}`} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs hover:bg-blue-500/20">
                            <ExternalLink className="w-3 h-3" />Open
                          </a>}
                          <button onClick={() => notebookAction(n.NotebookInstanceName, 'stop')}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs hover:bg-orange-500/20">
                            <Square className="w-3 h-3" />Stop
                          </button>
                        </>
                      )}
                      {['Stopped','Failed'].includes(n.NotebookInstanceStatus) && (
                        <button onClick={() => notebookAction(n.NotebookInstanceName, 'delete')}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs hover:bg-red-500/20">
                          <Trash2 className="w-3 h-3" />Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {showCreateNotebook && <CreateNotebookForm onClose={() => setShowCreateNotebook(false)} onCreated={() => { setShowCreateNotebook(false); setTimeout(fetchNotebooks, 2000); showToast('Notebook instance creating...') }} showToast={showToast} />}
          </div>
        )}

        {/* ── MODELS ── */}
        {tab === 'models' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-white font-bold text-lg">Models</h2>
              <button onClick={() => setShowCreateModel(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors">
                <Plus className="w-4 h-4" />Register Model
              </button>
            </div>
            {loading.models ? (
              <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 text-purple-400 animate-spin" /></div>
            ) : models.length === 0 ? (
              <div className="py-20 text-center">
                <Database className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No models registered.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="border-b border-white/10 bg-white/[0.02]">
                    <tr>
                      {['Model Name','Created','Actions'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-slate-400 text-xs font-semibold uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {models.map(m => (
                      <tr key={m.ModelName} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 text-white font-medium">{m.ModelName}</td>
                        <td className="px-4 py-3 text-slate-400">{relTime(m.CreationTime)}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => deleteModel(m.ModelName)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs hover:bg-red-500/20">
                            <Trash2 className="w-3 h-3" />Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {showCreateModel && <CreateModelForm onClose={() => setShowCreateModel(false)} onCreated={() => { setShowCreateModel(false); setTimeout(fetchModels, 1500); showToast('Model registered!') }} showToast={showToast} />}
          </div>
        )}

        {/* ── COST ESTIMATOR ── */}
        {tab === 'cost' && (
          <div className="max-w-xl">
            <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-orange-400" />Cost Estimator
            </h2>
            <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-6 space-y-4">
              <div>
                <label className="text-slate-300 text-sm font-medium mb-1.5 block">Instance Type</label>
                <select value={costInstance} onChange={e => setCostInstance(e.target.value)}
                  className="w-full bg-purple-950/40 border border-purple-800/30 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500">
                  {INSTANCE_TYPES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 text-sm font-medium mb-1.5 block">Instance Count</label>
                  <input type="number" min={1} max={100} value={costCount} onChange={e => setCostCount(Number(e.target.value))}
                    className="w-full bg-purple-950/40 border border-purple-800/30 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="text-slate-300 text-sm font-medium mb-1.5 block">Duration (hours)</label>
                  <input type="number" min={0.1} step={0.5} value={costHours} onChange={e => setCostHours(Number(e.target.value))}
                    className="w-full bg-purple-950/40 border border-purple-800/30 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500" />
                </div>
              </div>
              <button onClick={estimateCost}
                className="w-full btn-primary py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2">
                <DollarSign className="w-4 h-4" />Calculate Cost
              </button>

              {costResult && (
                <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Per Hour (USD)', value: `$${costResult.pricePerHrUSD}` },
                      { label: 'Per Hour (INR)', value: `₹${costResult.pricePerHrINR}` },
                      { label: 'Total (USD)',    value: `$${costResult.totalUSD}`,    highlight: true },
                      { label: 'Total (INR)',    value: `₹${costResult.totalINR}`,    highlight: true },
                    ].map(r => (
                      <div key={r.label} className={`p-3 rounded-lg ${r.highlight ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-white/[0.03]'}`}>
                        <p className="text-slate-400 text-xs mb-1">{r.label}</p>
                        <p className={`font-bold text-lg ${r.highlight ? 'text-orange-300' : 'text-white'}`}>{r.value}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-slate-500 text-xs">{costResult.note}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Create Forms ──────────────────────────────────────────────────────────────
const API2 = typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || '') : ''
function authH2() {
  const t = typeof window !== 'undefined' ? (localStorage.getItem('apkaai_token') || sessionStorage.getItem('apkaai_token')) : null
  return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
}

function ModalWrap({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-lg bg-[#0F0A1E] border border-orange-700/40 rounded-2xl shadow-[0_0_60px_rgba(249,115,22,0.2)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-orange-900/30">
          <h3 className="text-white font-bold">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-slate-300 text-sm font-medium mb-1.5 block">{label}</label>
      {children}
    </div>
  )
}

const inputCls = "w-full bg-purple-950/40 border border-purple-800/30 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-slate-500"

function CreateTrainingJobForm({ onClose, onCreated, showToast }: any) {
  const [form, setForm] = useState({ name: '', algorithmImage: '', instanceType: 'ml.m5.xlarge', instanceCount: 1, volumeSizeGB: 50, outputPath: '' })
  const [loading, setLoading] = useState(false)
  const submit = async () => {
    if (!form.name || !form.algorithmImage) { showToast('Name and Algorithm Image are required'); return }
    setLoading(true)
    try {
      const r = await fetch(`${API2}/api/sagemaker/training-jobs`, { method: 'POST', headers: authH2(), body: JSON.stringify(form) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed')
      onCreated()
    } catch (e: any) { showToast(e.message) }
    finally { setLoading(false) }
  }
  return (
    <ModalWrap title="New Training Job" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Job Name *"><input className={inputCls} placeholder="my-training-job" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} /></Field>
        <Field label="Algorithm Docker Image *"><input className={inputCls} placeholder="763104351884.dkr.ecr.ap-south-1.amazonaws.com/pytorch-training:2.0.0-gpu-py310" value={form.algorithmImage} onChange={e => setForm(p => ({...p, algorithmImage: e.target.value}))} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Instance Type">
            <select className={inputCls} value={form.instanceType} onChange={e => setForm(p => ({...p, instanceType: e.target.value}))}>
              {INSTANCE_TYPES.map(i => <option key={i}>{i}</option>)}
            </select>
          </Field>
          <Field label="Volume (GB)"><input type="number" className={inputCls} value={form.volumeSizeGB} onChange={e => setForm(p => ({...p, volumeSizeGB: +e.target.value}))} /></Field>
        </div>
        <Field label="S3 Output Path"><input className={inputCls} placeholder="s3://your-bucket/output/" value={form.outputPath} onChange={e => setForm(p => ({...p, outputPath: e.target.value}))} /></Field>
        <button onClick={submit} disabled={loading} className="w-full btn-primary py-2.5 rounded-xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Creating...</> : <><Play className="w-4 h-4" />Start Training Job</>}
        </button>
      </div>
    </ModalWrap>
  )
}

function CreateEndpointForm({ onClose, onCreated, showToast }: any) {
  const [form, setForm] = useState({ name: '', modelName: '', instanceType: 'ml.t2.medium' })
  const [loading, setLoading] = useState(false)
  const submit = async () => {
    if (!form.name || !form.modelName) { showToast('Name and Model Name are required'); return }
    setLoading(true)
    try {
      const r = await fetch(`${API2}/api/sagemaker/endpoints`, { method: 'POST', headers: authH2(), body: JSON.stringify(form) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed')
      onCreated()
    } catch (e: any) { showToast(e.message) }
    finally { setLoading(false) }
  }
  return (
    <ModalWrap title="Deploy Endpoint" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Endpoint Name *"><input className={inputCls} placeholder="my-endpoint" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} /></Field>
        <Field label="Model Name *"><input className={inputCls} placeholder="my-model" value={form.modelName} onChange={e => setForm(p => ({...p, modelName: e.target.value}))} /></Field>
        <Field label="Instance Type">
          <select className={inputCls} value={form.instanceType} onChange={e => setForm(p => ({...p, instanceType: e.target.value}))}>
            {INSTANCE_TYPES.map(i => <option key={i}>{i}</option>)}
          </select>
        </Field>
        <button onClick={submit} disabled={loading} className="w-full btn-primary py-2.5 rounded-xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Deploying...</> : <><Server className="w-4 h-4" />Deploy Endpoint</>}
        </button>
      </div>
    </ModalWrap>
  )
}

function CreateNotebookForm({ onClose, onCreated, showToast }: any) {
  const [form, setForm] = useState({ name: '', instanceType: 'ml.t3.medium', volumeSizeGB: 5, defaultRepoUrl: '' })
  const [loading, setLoading] = useState(false)
  const submit = async () => {
    if (!form.name) { showToast('Name is required'); return }
    setLoading(true)
    try {
      const r = await fetch(`${API2}/api/sagemaker/notebooks`, { method: 'POST', headers: authH2(), body: JSON.stringify(form) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed')
      onCreated()
    } catch (e: any) { showToast(e.message) }
    finally { setLoading(false) }
  }
  return (
    <ModalWrap title="New Notebook Instance" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Instance Name *"><input className={inputCls} placeholder="my-notebook" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Instance Type">
            <select className={inputCls} value={form.instanceType} onChange={e => setForm(p => ({...p, instanceType: e.target.value}))}>
              {INSTANCE_TYPES.filter(i => i.startsWith('ml.t') || i.startsWith('ml.m')).map(i => <option key={i}>{i}</option>)}
            </select>
          </Field>
          <Field label="Volume (GB)"><input type="number" className={inputCls} value={form.volumeSizeGB} onChange={e => setForm(p => ({...p, volumeSizeGB: +e.target.value}))} /></Field>
        </div>
        <Field label="Git Repo URL (optional)"><input className={inputCls} placeholder="https://github.com/..." value={form.defaultRepoUrl} onChange={e => setForm(p => ({...p, defaultRepoUrl: e.target.value}))} /></Field>
        <button onClick={submit} disabled={loading} className="w-full btn-primary py-2.5 rounded-xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Creating...</> : <><BookOpen className="w-4 h-4" />Create Notebook</>}
        </button>
      </div>
    </ModalWrap>
  )
}

function CreateModelForm({ onClose, onCreated, showToast }: any) {
  const [form, setForm] = useState({ name: '', imageUri: '', modelDataUrl: '' })
  const [loading, setLoading] = useState(false)
  const submit = async () => {
    if (!form.name || !form.imageUri) { showToast('Name and Image URI are required'); return }
    setLoading(true)
    try {
      const r = await fetch(`${API2}/api/sagemaker/models`, { method: 'POST', headers: authH2(), body: JSON.stringify(form) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed')
      onCreated()
    } catch (e: any) { showToast(e.message) }
    finally { setLoading(false) }
  }
  return (
    <ModalWrap title="Register Model" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Model Name *"><input className={inputCls} placeholder="my-model" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} /></Field>
        <Field label="Container Image URI *"><input className={inputCls} placeholder="763104351884.dkr.ecr.ap-south-1.amazonaws.com/pytorch-inference:2.0.0-cpu-py310" value={form.imageUri} onChange={e => setForm(p => ({...p, imageUri: e.target.value}))} /></Field>
        <Field label="Model Data S3 URL (optional)"><input className={inputCls} placeholder="s3://your-bucket/model.tar.gz" value={form.modelDataUrl} onChange={e => setForm(p => ({...p, modelDataUrl: e.target.value}))} /></Field>
        <button onClick={submit} disabled={loading} className="w-full btn-primary py-2.5 rounded-xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Registering...</> : <><Database className="w-4 h-4" />Register Model</>}
        </button>
      </div>
    </ModalWrap>
  )
}
