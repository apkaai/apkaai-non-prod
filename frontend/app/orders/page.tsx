'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ShoppingBag, Package, ChevronDown, ChevronUp, ExternalLink,
  ArrowLeft, RefreshCw, Clock, CheckCircle, XCircle, AlertCircle,
  Zap, RotateCcw, Receipt, Download, Ban, Loader2
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface OrderItem {
  id: string
  tool_id: string
  tool_name: string
  tool_slug: string
  tool_logo: string
  tool_category: string
  plan_name: string
  plan_price: string
  plan_monthly: number
  billing_cycle: string
  quantity: number
}

interface Order {
  order_id: string
  status: 'pending' | 'confirmed' | 'processing' | 'completed' | 'cancelled' | 'refunded'
  subtotal: number
  discount: number
  tax: number
  total: number
  coupon_code: string | null
  payment_method: string
  created_at: string
  items: OrderItem[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'

function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('apkaai_token') || sessionStorage.getItem('apkaai_token')
}
function getUser() {
  if (typeof window === 'undefined') return null
  try {
    const u = localStorage.getItem('apkaai_user') || sessionStorage.getItem('apkaai_user')
    return u ? JSON.parse(u) : null
  } catch { return null }
}
function fmt(n: number) {
  return `₹${Number(n).toLocaleString('en-IN')}`
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
function canCancel(order: Order) {
  if (['cancelled', 'refunded', 'completed'].includes(order.status)) return false
  const hours = (Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60)
  return hours <= 24
}
function hoursLeft(iso: string) {
  const h = 24 - (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60)
  return h > 0 ? Math.ceil(h) : 0
}

// ─── Status badge ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<Order['status'], { label: string; color: string; icon: React.ReactNode }> = {
  pending:    { label: 'Pending',    color: 'bg-yellow-900/30 text-yellow-400 border-yellow-700/40',    icon: <Clock className="w-3 h-3" /> },
  confirmed:  { label: 'Confirmed',  color: 'bg-blue-900/30 text-blue-400 border-blue-700/40',          icon: <CheckCircle className="w-3 h-3" /> },
  processing: { label: 'Processing', color: 'bg-purple-900/30 text-purple-400 border-purple-700/40',    icon: <RefreshCw className="w-3 h-3" /> },
  completed:  { label: 'Completed',  color: 'bg-emerald-900/30 text-emerald-400 border-emerald-700/40', icon: <CheckCircle className="w-3 h-3" /> },
  cancelled:  { label: 'Cancelled',  color: 'bg-red-900/30 text-red-400 border-red-700/40',             icon: <XCircle className="w-3 h-3" /> },
  refunded:   { label: 'Refunded',   color: 'bg-slate-700/30 text-slate-400 border-slate-600/40',       icon: <RotateCcw className="w-3 h-3" /> },
}

function StatusBadge({ status }: { status: Order['status'] }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

// ─── Confirm cancel dialog ────────────────────────────────────────────────────
function CancelConfirmDialog({ orderId, onConfirm, onClose, loading }: {
  orderId: string; onConfirm: () => void; onClose: () => void; loading: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(8,5,26,0.85)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm bg-[#0F0A1E] border border-red-800/50 rounded-2xl p-6 shadow-2xl">
        <div className="w-12 h-12 rounded-full bg-red-900/30 border border-red-700/40 flex items-center justify-center mx-auto mb-4">
          <Ban className="w-6 h-6 text-red-400" />
        </div>
        <h3 className="text-white font-bold text-lg text-center mb-2">Cancel Order?</h3>
        <p className="text-slate-400 text-sm text-center mb-6">
          Order <span className="text-purple-300 font-mono">#{orderId.slice(0,8).toUpperCase()}</span> will be
          cancelled. This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
            Yes, Cancel
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 border border-purple-800/40 text-slate-300 hover:text-white font-semibold py-3 rounded-xl text-sm transition-all hover:border-purple-600"
          >
            Keep Order
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Single order card ────────────────────────────────────────────────────────
function OrderCard({
  order,
  onCancelled,
}: {
  order: Order
  onCancelled: (orderId: string) => void
}) {
  const [expanded, setExpanded]         = useState(false)
  const [cancelling, setCancelling]     = useState(false)
  const [showConfirm, setShowConfirm]   = useState(false)
  const [cancelError, setCancelError]   = useState('')
  const [downloading, setDownloading]   = useState(false)
  const cancellable = canCancel(order)

  async function confirmCancel() {
    setCancelling(true)
    setCancelError('')
    try {
      const res = await fetch(`${API}/orders/${order.order_id}/cancel`, {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Cancellation failed')
      setShowConfirm(false)
      onCancelled(order.order_id)
    } catch (err: unknown) {
      setCancelError(err instanceof Error ? err.message : 'Cancellation failed')
      setShowConfirm(false)
    }
    setCancelling(false)
  }

  async function downloadInvoice() {
    setDownloading(true)
    try {
      const res = await fetch(`${API}/orders/${order.order_id}/invoice`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (!res.ok) throw new Error('Failed to generate invoice')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `apkaai-invoice-${order.order_id.slice(0,8).toUpperCase()}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {}
    setDownloading(false)
  }

  return (
    <>
      <div className="rounded-2xl bg-[#0F0A1E] border border-purple-900/40 hover:border-purple-700/50 transition-all overflow-hidden">
        {/* Header row */}
        <button
          onClick={() => setExpanded(p => !p)}
          className="w-full flex items-center justify-between gap-4 p-5 text-left"
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-purple-900/40 border border-purple-700/30 flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5 text-purple-400" />
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm">
                Order <span className="text-purple-300 font-mono">#{order.order_id.slice(0, 8).toUpperCase()}</span>
              </p>
              <p className="text-slate-500 text-xs mt-0.5">{fmtDate(order.created_at)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-purple-300 font-extrabold">{fmt(order.total)}</p>
              <p className="text-slate-500 text-xs">{order.items.length} {order.items.length === 1 ? 'item' : 'items'}</p>
            </div>
            <StatusBadge status={order.status} />
            {expanded
              ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
              : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
          </div>
        </button>

        {/* Expanded detail */}
        {expanded && (
          <div className="border-t border-purple-900/30 px-5 pb-5">

            {/* Cancel error */}
            {cancelError && (
              <div className="flex items-center gap-2 mt-4 p-3 rounded-xl bg-red-900/20 border border-red-700/40 text-red-400 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {cancelError}
              </div>
            )}

            {/* Items list */}
            <div className="space-y-3 mt-4">
              {order.items.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-purple-950/20 border border-purple-900/20">
                  <span className="text-2xl flex-shrink-0">{item.tool_logo}</span>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/tools/${item.tool_slug}`}
                      className="text-white font-semibold text-sm hover:text-purple-300 transition-colors flex items-center gap-1"
                    >
                      {item.tool_name}
                      <ExternalLink className="w-3 h-3 opacity-50" />
                    </Link>
                    <p className="text-slate-400 text-xs mt-0.5 capitalize">
                      {item.plan_name} Plan · {item.billing_cycle} billing
                    </p>
                  </div>
                  <p className="text-purple-300 font-bold text-sm flex-shrink-0">{item.plan_price}</p>
                </div>
              ))}
            </div>

            {/* Price breakdown */}
            <div className="mt-4 pt-4 border-t border-purple-900/20 space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span className="text-white">{fmt(order.subtotal)}</span>
              </div>
              {Number(order.discount) > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>
                    Discount
                    {order.coupon_code && (
                      <span className="text-xs font-mono bg-emerald-900/30 px-1.5 py-0.5 rounded ml-1">{order.coupon_code}</span>
                    )}
                  </span>
                  <span>−{fmt(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400">
                <span>GST (18%)</span>
                <span className="text-white">{fmt(order.tax)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-white border-t border-purple-900/30 pt-2 mt-1 text-base">
                <span>Total Paid</span>
                <span className="text-purple-300">{fmt(order.total)}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 mt-5 flex-wrap">
              {/* Download Invoice */}
              <button
                onClick={downloadInvoice}
                disabled={downloading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-purple-700/40 hover:border-purple-500 text-purple-300 hover:text-white text-xs font-semibold transition-all disabled:opacity-50"
              >
                {downloading
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Download className="w-3.5 h-3.5" />}
                Download Invoice
              </button>

              {/* Cancel — only within 24h and cancellable status */}
              {cancellable && (
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={cancelling}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-700/40 hover:border-red-500 text-red-400 hover:text-red-300 text-xs font-semibold transition-all disabled:opacity-50 ml-auto"
                >
                  {cancelling
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Ban className="w-3.5 h-3.5" />}
                  Cancel Order
                </button>
              )}

              {/* Time remaining hint */}
              {cancellable && (
                <p className="text-slate-600 text-xs w-full">
                  Cancellable for {hoursLeft(order.created_at)}h more
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Cancel confirm dialog */}
      {showConfirm && (
        <CancelConfirmDialog
          orderId={order.order_id}
          onConfirm={confirmCancel}
          onClose={() => setShowConfirm(false)}
          loading={cancelling}
        />
      )}
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders]   = useState<Order[]>([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const LIMIT = 10

  const fetchOrders = useCallback(async (p = 1) => {
    setLoading(true)
    setError('')
    try {
      const token = getToken()
      const res = await fetch(`${API}/orders/my?page=${p}&limit=${LIMIT}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) { router.replace('/signin'); return }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load orders')
      setOrders(data.orders || [])
      setTotal(data.total || 0)
      setPage(p)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
    setLoading(false)
  }, [router])

  useEffect(() => {
    const u = getUser()
    if (!u) { router.replace('/signin'); return }
    fetchOrders(1)
  }, [router, fetchOrders])

  // Update order status locally after cancellation (no full refetch needed)
  const handleCancelled = useCallback((orderId: string) => {
    setOrders(prev => prev.map(o =>
      o.order_id === orderId ? { ...o, status: 'cancelled' as const } : o
    ))
  }, [])

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Back */}
        <Link href="/profile" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-8 transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Profile
        </Link>

        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-7 h-7 text-purple-400" />
            <div>
              <h1 className="text-3xl font-extrabold text-white">Order History</h1>
              {total > 0 && (
                <p className="text-slate-400 text-sm mt-0.5">{total} {total === 1 ? 'order' : 'orders'} placed</p>
              )}
            </div>
          </div>
          <button
            onClick={() => fetchOrders(page)}
            disabled={loading}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white border border-purple-800/40 hover:border-purple-600 px-3 py-2 rounded-lg transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-900/20 border border-red-700/40 text-red-400 mb-6 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-2xl bg-purple-900/10 border border-purple-900/30 animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && orders.length === 0 && (
          <div className="text-center py-24">
            <div className="w-24 h-24 rounded-3xl bg-purple-900/20 border border-purple-800/30 flex items-center justify-center mx-auto mb-6">
              <Receipt className="w-10 h-10 text-purple-400/50" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">No orders yet</h2>
            <p className="text-slate-400 max-w-sm mx-auto mb-8">
              Browse our 70+ AI tools, add them to your cart and place your first order.
            </p>
            <Link href="/tools" className="inline-flex items-center gap-2 btn-primary text-white font-bold px-8 py-3.5 rounded-xl">
              <Zap className="w-4 h-4" /> Explore AI Tools
            </Link>
          </div>
        )}

        {/* Orders list */}
        {!loading && orders.length > 0 && (
          <div className="space-y-4">
            {orders.map(order => (
              <OrderCard key={order.order_id} order={order} onCancelled={handleCancelled} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => fetchOrders(page - 1)}
              disabled={page === 1 || loading}
              className="px-4 py-2 rounded-lg border border-purple-800/40 text-slate-400 hover:text-white hover:border-purple-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm"
            >
              Previous
            </button>
            <span className="text-slate-400 text-sm px-2">Page {page} of {totalPages}</span>
            <button
              onClick={() => fetchOrders(page + 1)}
              disabled={page === totalPages || loading}
              className="px-4 py-2 rounded-lg border border-purple-800/40 text-slate-400 hover:text-white hover:border-purple-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
