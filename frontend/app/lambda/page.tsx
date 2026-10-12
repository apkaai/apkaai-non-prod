'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Video, Upload, RefreshCw, Play, AlertCircle, CheckCircle2,
  Clock, Loader2, Trash2, Download, Zap, Link2, Link2Off,
  Film, HardDrive, Search, Filter, ExternalLink, X,
  ChevronDown, MonitorPlay, Settings, Info, Wifi
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Video {
  video_id:               string
  title:                  string
  source:                 'upload' | 'zoom'
  status:                 'uploading' | 'processing' | 'ready' | 'failed'
  available_resolutions:  string[]
  file_size:              number
  duration_seconds:       number | null
  error_message:          string | null
  created_at:             string
  updated_at:             string
  mediaconvert_job_id:    string | null
}

interface ZoomRecording {
  meetingId:  string
  uuid:       string
  topic:      string
  startTime:  string
  duration:   number
  files:      ZoomFile[]
}

interface ZoomFile {
  fileId:      string
  fileType:    string
  fileSize:    number
  status:      string
  downloadUrl: string
  recordingType: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const API = process.env.NEXT_PUBLIC_API_URL || ''

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('apkaai_token') || sessionStorage.getItem('apkaai_token')
}

function authHeaders(): Record<string, string> {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
}

function formatBytes(bytes: number): string {
  if (!bytes) return '—'
  if (bytes > 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`
  if (bytes > 1048576)    return `${(bytes / 1048576).toFixed(1)} MB`
  if (bytes > 1024)       return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

function formatDuration(secs: number | null): string {
  if (!secs) return '—'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
               : `${m}:${String(s).padStart(2,'0')}`
}

function relativeTime(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Video['status'] }) {
  const map = {
    uploading:  { icon: <Upload className="w-3 h-3" />,      color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',    label: 'Uploading'   },
    processing: { icon: <Loader2 className="w-3 h-3 animate-spin" />, color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', label: 'Processing'  },
    ready:      { icon: <CheckCircle2 className="w-3 h-3" />, color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', label: 'Ready'       },
    failed:     { icon: <AlertCircle className="w-3 h-3" />,  color: 'bg-red-500/10 text-red-400 border-red-500/20',        label: 'Failed'      },
  }
  const { icon, color, label } = map[status] || map.failed
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}>
      {icon}{label}
    </span>
  )
}

// ── Video Player Modal ────────────────────────────────────────────────────────
function VideoPlayerModal({ video, onClose }: { video: Video; onClose: () => void }) {
  const [resolution, setResolution] = useState(video.available_resolutions?.[video.available_resolutions.length - 1] || '')
  const [playUrl, setPlayUrl]       = useState<string | null>(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)

  const loadPlayUrl = useCallback(async (res: string) => {
    setLoading(true); setError('')
    try {
      const r = await fetch(`${API}/api/videos/${video.video_id}/playback/${res}`, { headers: authHeaders() })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Failed to get playback URL')
      setPlayUrl(data.url)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [video.video_id])

  useEffect(() => {
    if (resolution) loadPlayUrl(resolution)
  }, [resolution, loadPlayUrl])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4"
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-4xl bg-[#0F0A1E] border border-purple-800/40 rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(124,58,237,0.3)]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-purple-900/30">
          <div>
            <h2 className="text-white font-bold truncate max-w-lg">{video.title}</h2>
            <p className="text-slate-400 text-xs mt-0.5">{formatBytes(video.file_size)} · {formatDuration(video.duration_seconds)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-purple-900/30 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Player */}
        <div className="bg-black aspect-video flex items-center justify-center">
          {loading ? (
            <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
          ) : error ? (
            <div className="text-center px-6">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          ) : playUrl ? (
            <video
              ref={videoRef}
              src={playUrl}
              controls
              autoPlay
              className="w-full h-full"
              onError={() => setError('Video failed to load. The URL may have expired.')}
            />
          ) : (
            <p className="text-slate-500 text-sm">Select a resolution to play</p>
          )}
        </div>

        {/* Resolution selector */}
        <div className="px-5 py-4 border-t border-purple-900/30 flex items-center gap-3 flex-wrap">
          <span className="text-slate-400 text-sm font-medium">Resolution:</span>
          {video.available_resolutions?.map(res => (
            <button
              key={res}
              onClick={() => setResolution(res)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                resolution === res
                  ? 'bg-purple-600 text-white border-purple-500'
                  : 'bg-purple-950/20 text-slate-300 border-purple-800/30 hover:border-purple-500'
              }`}
            >
              {res}
            </button>
          ))}
          {(!video.available_resolutions || video.available_resolutions.length === 0) && (
            <span className="text-slate-500 text-sm">No resolutions available yet</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Video Card ────────────────────────────────────────────────────────────────
function VideoCard({
  video, onPlay, onRetry, onDelete
}: {
  video: Video
  onPlay:   (v: Video) => void
  onRetry:  (id: string) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] hover:border-purple-500/30 transition-all p-4">
      {/* Title + source */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-purple-900/40 border border-purple-700/30 flex items-center justify-center flex-shrink-0">
            {video.source === 'zoom' ? <Video className="w-4 h-4 text-purple-400" /> : <Film className="w-4 h-4 text-blue-400" />}
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm truncate">{video.title}</p>
            <p className="text-slate-500 text-xs capitalize">{video.source} · {relativeTime(video.created_at)}</p>
          </div>
        </div>
        <StatusBadge status={video.status} />
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-xs text-slate-400">
        <div className="flex items-center gap-1"><HardDrive className="w-3 h-3" />{formatBytes(video.file_size)}</div>
        <div className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDuration(video.duration_seconds)}</div>
      </div>

      {/* Resolutions */}
      {video.status === 'ready' && video.available_resolutions?.length > 0 && (
        <div className="flex gap-1 mb-3 flex-wrap">
          {video.available_resolutions.map(res => (
            <span key={res} className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-medium">{res}</span>
          ))}
        </div>
      )}

      {/* Error */}
      {video.status === 'failed' && video.error_message && (
        <p className="text-red-400 text-xs mb-3 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 line-clamp-2">{video.error_message}</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {video.status === 'ready' && (
          <button
            onClick={() => onPlay(video)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors"
          >
            <Play className="w-3.5 h-3.5" />Play
          </button>
        )}
        {video.status === 'failed' && (
          <button
            onClick={() => onRetry(video.video_id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 text-xs font-semibold border border-yellow-500/30 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />Retry
          </button>
        )}
        {['uploading', 'processing'].includes(video.status) && (
          <div className="flex-1 flex items-center justify-center gap-1.5 py-2 text-slate-400 text-xs">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {video.status === 'uploading' ? 'Uploading…' : 'Processing…'}
          </div>
        )}
        <button
          onClick={() => onDelete(video.video_id)}
          className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LambdaPage() {
  const [tab, setTab]                   = useState<'library' | 'upload' | 'zoom'>('library')
  const [videos, setVideos]             = useState<Video[]>([])
  const [total, setTotal]               = useState(0)
  const [loadingVideos, setLoadingVideos] = useState(true)
  const [zoomConnected, setZoomConnected] = useState(false)
  const [zoomEmail, setZoomEmail]       = useState('')
  const [zoomRecordings, setZoomRecordings] = useState<ZoomRecording[]>([])
  const [loadingZoom, setLoadingZoom]   = useState(false)
  const [playingVideo, setPlayingVideo] = useState<Video | null>(null)
  const [searchQuery, setSearchQuery]   = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [uploadFile, setUploadFile]     = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [uploadError, setUploadError]   = useState('')
  const [isSignedIn, setIsSignedIn]     = useState(false)
  const [toast, setToast]               = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollingRef   = useRef<NodeJS.Timeout | null>(null)

  // ── Auth check ──────────────────────────────────────────────────────────────
  useEffect(() => {
    setIsSignedIn(!!getToken())
  }, [])

  // ── Toast ───────────────────────────────────────────────────────────────────
  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  // ── Load videos ─────────────────────────────────────────────────────────────
  const loadVideos = useCallback(async () => {
    if (!getToken()) return
    setLoadingVideos(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (statusFilter) params.set('status', statusFilter)
      const r = await fetch(`${API}/api/videos?${params}`, { headers: authHeaders() })
      const data = await r.json()
      if (r.ok) { setVideos(data.videos || []); setTotal(data.total || 0) }
    } catch { /* ignore */ }
    finally { setLoadingVideos(false) }
  }, [statusFilter])

  useEffect(() => { loadVideos() }, [loadVideos])

  // ── Poll processing videos every 10s ─────────────────────────────────────
  useEffect(() => {
    const hasProcessing = videos.some(v => ['uploading','processing'].includes(v.status))
    if (hasProcessing && !pollingRef.current) {
      pollingRef.current = setInterval(loadVideos, 10000)
    }
    if (!hasProcessing && pollingRef.current) {
      clearInterval(pollingRef.current); pollingRef.current = null
    }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [videos, loadVideos])

  // ── Check Zoom status ─────────────────────────────────────────────────────
  const checkZoomStatus = useCallback(async () => {
    if (!getToken()) return
    try {
      const r = await fetch(`${API}/api/zoom/auth/status`, { headers: authHeaders() })
      const data = await r.json()
      setZoomConnected(data.connected)
      if (data.connected) setZoomEmail(data.zoomEmail || '')
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { checkZoomStatus() }, [checkZoomStatus])

  // ── Zoom OAuth connect ────────────────────────────────────────────────────
  const connectZoom = async () => {
    try {
      const r = await fetch(`${API}/api/zoom/auth/url`, { headers: authHeaders() })
      const data = await r.json()
      if (data.url) window.location.href = data.url
      else showToast(data.error || 'Could not get Zoom OAuth URL')
    } catch { showToast('Failed to connect Zoom') }
  }

  // ── Zoom disconnect ───────────────────────────────────────────────────────
  const disconnectZoom = async () => {
    try {
      await fetch(`${API}/api/zoom/auth/disconnect`, { method: 'POST', headers: authHeaders() })
      setZoomConnected(false); setZoomEmail(''); setZoomRecordings([])
      showToast('Zoom account disconnected')
    } catch { showToast('Failed to disconnect') }
  }

  // ── Load Zoom recordings ──────────────────────────────────────────────────
  const loadZoomRecordings = async () => {
    setLoadingZoom(true)
    try {
      const r = await fetch(`${API}/api/zoom/recordings?page_size=30`, { headers: authHeaders() })
      const data = await r.json()
      if (r.ok) setZoomRecordings(data.meetings || [])
      else showToast(data.error || 'Failed to load recordings')
    } catch { showToast('Failed to load recordings') }
    finally { setLoadingZoom(false) }
  }

  useEffect(() => {
    if (tab === 'zoom' && zoomConnected) loadZoomRecordings()
  }, [tab, zoomConnected])

  // ── Check for zoom callback params ────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('zoom_connected')) { checkZoomStatus(); showToast('Zoom connected successfully! 🎉') }
    if (params.get('zoom_error'))     { showToast(`Zoom error: ${params.get('zoom_error')}`) }
    if (params.get('zoom_connected') || params.get('zoom_error')) {
      window.history.replaceState({}, '', '/lambda')
    }
  }, [checkZoomStatus])

  // ── Import Zoom recording ─────────────────────────────────────────────────
  const importZoomRecording = async (meeting: ZoomRecording, file: ZoomFile) => {
    try {
      // Step 1: get import metadata from zoom route
      const importResp = await fetch(`${API}/api/zoom/import/${meeting.meetingId}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ fileId: file.fileId, topic: meeting.topic, startTime: meeting.startTime }),
      })
      const importData = await importResp.json()
      if (!importResp.ok) { showToast(importData.error || 'Import failed'); return }

      // Step 2: trigger video processing
      const zoomToken = getToken() // proxy token — server uses it to get Zoom token from DB
      await fetch(`${API}/api/videos/import-zoom`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          downloadUrl: importData.downloadUrl,
          title:       importData.topic,
          meetingId:   meeting.meetingId,
          fileId:      file.fileId,
          fileSize:    file.fileSize,
        }),
      })
      showToast('Recording import started. Check the video library.')
      setTab('library')
      setTimeout(loadVideos, 2000)
    } catch { showToast('Failed to import recording') }
  }

  // ── File upload ───────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!uploadFile) return
    setUploadStatus('uploading'); setUploadProgress(0); setUploadError('')
    try {
      // 1. Get presigned URL
      const urlResp = await fetch(`${API}/api/videos/upload-url`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ filename: uploadFile.name, contentType: uploadFile.type, fileSize: uploadFile.size }),
      })
      const urlData = await urlResp.json()
      if (!urlResp.ok) throw new Error(urlData.error || 'Failed to get upload URL')

      // 2. Upload to S3 via presigned PUT
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.onprogress = e => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 90))
        }
        xhr.onload  = () => xhr.status < 300 ? resolve() : reject(new Error(`S3 upload failed: ${xhr.status}`))
        xhr.onerror = () => reject(new Error('Upload network error'))
        xhr.open('PUT', urlData.uploadUrl)
        xhr.setRequestHeader('Content-Type', uploadFile.type || 'video/mp4')
        xhr.send(uploadFile)
      })
      setUploadProgress(95)

      // 3. Confirm upload → trigger processing
      const confirmResp = await fetch(`${API}/api/videos/confirm-upload`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ videoId: urlData.videoId }),
      })
      const confirmData = await confirmResp.json()
      if (!confirmResp.ok) throw new Error(confirmData.error || 'Failed to start processing')

      setUploadProgress(100)
      setUploadStatus('done')
      showToast('Upload complete! Processing started.')
      setTimeout(() => { setUploadFile(null); setUploadStatus('idle'); setUploadProgress(0); setTab('library'); loadVideos() }, 1500)
    } catch (e: any) {
      setUploadStatus('error')
      setUploadError(e.message || 'Upload failed')
    }
  }

  // ── Delete + Retry ────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this video? This cannot be undone.')) return
    try {
      await fetch(`${API}/api/videos/${id}`, { method: 'DELETE', headers: authHeaders() })
      setVideos(prev => prev.filter(v => v.video_id !== id))
      showToast('Video deleted')
    } catch { showToast('Delete failed') }
  }

  const handleRetry = async (id: string) => {
    try {
      await fetch(`${API}/api/videos/${id}/retry`, { method: 'POST', headers: authHeaders() })
      showToast('Retry started')
      loadVideos()
    } catch { showToast('Retry failed') }
  }

  // ── Filtered videos ───────────────────────────────────────────────────────
  const filtered = videos.filter(v => !searchQuery || v.title.toLowerCase().includes(searchQuery.toLowerCase()))

  // ── Not signed in guard ───────────────────────────────────────────────────
  if (!isSignedIn) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center px-6 max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-purple-900/30 border border-purple-700/30 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-purple-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Sign in required</h2>
          <p className="text-slate-400 text-sm mb-6">Please sign in to ApkaAI to use Lambda Video Processing.</p>
          <a href="/signin" className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold">
            Sign in to ApkaAI
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-20">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] bg-[#1A1035] border border-purple-700/60 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-glow-sm animate-[slideUp_0.3s_ease-out]">
          {toast}
        </div>
      )}

      {/* Player modal */}
      {playingVideo && (
        <VideoPlayerModal video={playingVideo} onClose={() => setPlayingVideo(null)} />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-violet-700 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-extrabold text-white">Lambda Video</h1>
            </div>
            <p className="text-slate-400 text-sm">Zoom recording import · AWS MediaConvert transcoding · CloudFront delivery</p>
          </div>
          <button onClick={loadVideos} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-purple-700/40 text-slate-300 hover:text-white text-sm transition-colors">
            <RefreshCw className="w-4 h-4" />Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-purple-900/30">
          {[
            { key: 'library', label: 'Video Library',  icon: <Film className="w-4 h-4" /> },
            { key: 'upload',  label: 'Upload',          icon: <Upload className="w-4 h-4" /> },
            { key: 'zoom',    label: 'Zoom Import',     icon: <Video className="w-4 h-4" /> },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg border-b-2 transition-all ${
                tab === t.key
                  ? 'text-purple-300 border-purple-500 bg-purple-900/10'
                  : 'text-slate-400 border-transparent hover:text-white hover:bg-purple-900/10'
              }`}
            >
              {t.icon}{t.label}
              {t.key === 'library' && total > 0 && (
                <span className="ml-1 bg-purple-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{total}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── VIDEO LIBRARY ── */}
        {tab === 'library' && (
          <div>
            {/* Search + filter bar */}
            <div className="flex gap-3 mb-6 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text" placeholder="Search videos…"
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-purple-950/30 border border-purple-800/30 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                />
              </div>
              <select
                value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="bg-purple-950/30 border border-purple-800/30 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition"
              >
                <option value="">All statuses</option>
                <option value="uploading">Uploading</option>
                <option value="processing">Processing</option>
                <option value="ready">Ready</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {loadingVideos ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <Film className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 font-medium mb-1">No videos yet</p>
                <p className="text-slate-500 text-sm mb-4">Upload a video or import from Zoom to get started.</p>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => setTab('upload')} className="btn-primary px-5 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center gap-2">
                    <Upload className="w-4 h-4" />Upload Video
                  </button>
                  <button onClick={() => setTab('zoom')} className="px-5 py-2.5 rounded-xl border border-purple-700/40 text-slate-300 hover:text-white text-sm font-semibold flex items-center gap-2">
                    <Video className="w-4 h-4" />Import from Zoom
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map(v => (
                  <VideoCard
                    key={v.video_id}
                    video={v}
                    onPlay={setPlayingVideo}
                    onRetry={handleRetry}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── UPLOAD ── */}
        {tab === 'upload' && (
          <div className="max-w-xl mx-auto">
            <div className="rounded-2xl border border-purple-800/30 bg-purple-950/10 p-8">
              <h2 className="text-white font-bold text-lg mb-1 flex items-center gap-2">
                <Upload className="w-5 h-5 text-purple-400" />Upload Video
              </h2>
              <p className="text-slate-400 text-sm mb-6">Supported formats: MP4, MOV, AVI, MKV, M4V</p>

              {/* Drop zone */}
              <div
                className={`border-2 border-dashed rounded-xl p-10 text-center mb-4 transition-all cursor-pointer ${
                  uploadFile ? 'border-purple-500 bg-purple-900/20' : 'border-purple-800/40 hover:border-purple-600/60 hover:bg-purple-900/10'
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setUploadFile(f) }}
              >
                <input
                  ref={fileInputRef} type="file"
                  accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/x-m4v"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && setUploadFile(e.target.files[0])}
                />
                {uploadFile ? (
                  <div>
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                    <p className="text-white font-semibold truncate">{uploadFile.name}</p>
                    <p className="text-slate-400 text-sm">{formatBytes(uploadFile.size)}</p>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-10 h-10 text-slate-500 mx-auto mb-2" />
                    <p className="text-slate-300 font-medium">Drop video here or click to browse</p>
                    <p className="text-slate-500 text-sm mt-1">Max 2 GB recommended</p>
                  </div>
                )}
              </div>

              {/* Progress */}
              {uploadStatus === 'uploading' && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Uploading…</span><span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 bg-purple-900/40 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-600 to-violet-500 transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}
              {uploadStatus === 'done' && (
                <div className="flex items-center gap-2 text-emerald-400 text-sm mb-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                  <CheckCircle2 className="w-4 h-4" />Upload complete! Processing started.
                </div>
              )}
              {uploadStatus === 'error' && (
                <div className="flex items-center gap-2 text-red-400 text-sm mb-4 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4" />{uploadError}
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={!uploadFile || uploadStatus === 'uploading' || uploadStatus === 'done'}
                className="w-full btn-primary py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadStatus === 'uploading' ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading…</> : <><Upload className="w-4 h-4" />Upload & Process</>}
              </button>

              {/* Architecture info */}
              <div className="mt-6 p-4 rounded-xl bg-white/[0.03] border border-white/10">
                <p className="text-slate-400 text-xs font-semibold mb-2 flex items-center gap-1"><Info className="w-3 h-3" />Processing Pipeline</p>
                <div className="flex items-center gap-1 text-[10px] text-slate-500 flex-wrap">
                  {['Upload → S3 (ci-video-input)', '→ Lambda trigger', '→ MediaConvert', '→ S3 (ci-video-new)', '→ CloudFront delivery'].map((s, i) => (
                    <span key={i} className="px-1.5 py-0.5 bg-white/[0.03] border border-white/10 rounded">{s}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ZOOM IMPORT ── */}
        {tab === 'zoom' && (
          <div>
            {/* Zoom connection status */}
            <div className="rounded-2xl border border-purple-800/30 bg-purple-950/10 p-5 mb-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${zoomConnected ? 'bg-emerald-500/20' : 'bg-slate-700/40'}`}>
                    <Video className={`w-5 h-5 ${zoomConnected ? 'text-emerald-400' : 'text-slate-400'}`} />
                  </div>
                  <div>
                    <p className="text-white font-semibold">Zoom Account</p>
                    <p className="text-slate-400 text-sm">
                      {zoomConnected ? `Connected as ${zoomEmail}` : 'Not connected'}
                    </p>
                  </div>
                </div>
                {zoomConnected ? (
                  <button onClick={disconnectZoom} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm font-medium transition-colors">
                    <Link2Off className="w-4 h-4" />Disconnect
                  </button>
                ) : (
                  <button onClick={connectZoom} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors">
                    <Link2 className="w-4 h-4" />Connect Zoom
                  </button>
                )}
              </div>
            </div>

            {!zoomConnected ? (
              <div className="text-center py-16">
                <Video className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-300 font-medium mb-1">Connect your Zoom account</p>
                <p className="text-slate-500 text-sm">to import cloud recordings directly into the video pipeline.</p>
              </div>
            ) : loadingZoom ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
              </div>
            ) : zoomRecordings.length === 0 ? (
              <div className="text-center py-16">
                <Video className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No cloud recordings found.</p>
                <button onClick={loadZoomRecordings} className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg border border-purple-700/40 text-slate-300 hover:text-white text-sm mx-auto">
                  <RefreshCw className="w-4 h-4" />Refresh
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {zoomRecordings.map(meeting => (
                  <div key={meeting.uuid} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-white font-semibold">{meeting.topic}</p>
                        <p className="text-slate-400 text-xs">{new Date(meeting.startTime).toLocaleString()} · {meeting.duration} min</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {meeting.files.map(file => (
                        <div key={file.fileId} className="flex items-center justify-between bg-white/[0.02] border border-white/10 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Film className="w-4 h-4 text-purple-400 flex-shrink-0" />
                            <div>
                              <p className="text-white text-xs font-medium">{file.recordingType || file.fileType}</p>
                              <p className="text-slate-500 text-[10px]">{formatBytes(file.fileSize)} · {file.fileType}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => importZoomRecording(meeting, file)}
                            disabled={file.status !== 'completed'}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 text-xs font-semibold border border-purple-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Download className="w-3 h-3" />Import
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
