'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard, ShoppingBag, Heart, Star, ArrowLeft,
  IndianRupee, TrendingUp, Package, CheckCircle, Clock,
  XCircle, AlertCircle, RefreshCw, ArrowRight, Zap
} from 'lucide-react'

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

interface DashStats {
  totalOrders:     number
  completedOrders: number
  pendingOrders:   number
  cancelledOrders: number
  totalSpent:      number
  wishlistCount:   number
  reviewCount:     number
  referralCount:   number
}

interface RecentOrder {
  order_id:   string
  status:     string
  total:      number
  created_at: string
  item_count: number
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  completed:  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />,
  confirmed:  <CheckCircle className="w-3.5 h-3.5 text-blue-400" />,
  pending:    <Clock className="w-3.5 h-3.5 text-yellow-400" />,
  cancelled:  <XCircle className="w-3.5 h-3.5 text-red-400" />,
  processing: <RefreshCw className="w-3.5 h-3.5 text-purple-400" />,
  refunded:   <RefreshCw className="w-3.5 h-3.5 text-slate-400" />,
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats]             = useState<DashStats | null>(null)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const user = typeof window !== 'undefined' ? getUser() : null

  function getInitials(name: string) {
    return name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U'
  }

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const token = getToken()

      // Fetch all data in parallel
      const [ordersRes, wishlistRes, referralRes, reviewsRes] = await Promise.all([
        fetch(`${API}/orders/my?page=1&limit=5`,   { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/wishlist/ids`,                { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/referral/me`,                 { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/reviews/mine/count`,          { headers: { Authorization: `Bearer ${token}` } }),
      ])

      if (ordersRes.status === 401) { router.replace('/signin'); return }

      const ordersData   = await ordersRes.json()
      const wishlistData = wishlistRes.ok  ? await wishlistRes.json()  : { ids: [] }
      const referralData = referralRes.ok  ? await referralRes.json()  : { stats: null }
      const reviewsData  = reviewsRes.ok   ? await reviewsRes.json()   : { count: 0 }

      const orders: RecentOrder[] = (ordersData.orders || []).map((o: Record<string, unknown>) => ({
        order_id:   o.order_id,
        status:     o.status,
        total:      Number(o.total),
        created_at: o.created_at as string,
        item_count: Array.isArray(o.items) ? (o.items as unknown[]).length : 0,
      }))

      const allOrders  = ordersData.orders || []
      const totalSpent = allOrders
        .filter((o: Record<string, unknown>) => o.status === 'completed')
        .reduce((sum: number, o: Record<string, unknown>) => sum + Number(o.total), 0)

      setStats({
        totalOrders:     ordersData.total || 0,
        completedOrders: allOrders.filter((o: Record<string, unknown>) => o.status === 'completed').length,
        pendingOrders:   allOrders.filter((o: Record<string, unknown>) => ['pending','confirmed','processing'].includes(o.status as string)).length,
        cancelledOrders: allOrders.filter((o: Record<string, unknown>) => o.status === 'cancelled').length,
        totalSpent,
        wishlistCount:   (wishlistData.ids || []).length,
        reviewCount:     reviewsData.count || 0,
        referralCount:   parseInt(referralData.stats?.total_referrals || '0'),
      })
      setRecentOrders(orders.slice(0, 5))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    }
    setLoading(false)
  }, [router])

  useEffect(() => {
    const u = getUser()
    if (!u) { router.replace('/signin'); return }
    fetchDashboard()
  }, [router, fetchDashboard])

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-5xl mx-auto">

        {/* Back */}
        <Link href="/profile" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-8 transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Profile
        </Link>

        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {user && (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-violet-700 flex items-center justify-center text-white font-extrabold text-lg">
                {getInitials(user.name)}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-extrabold text-white">
                {user ? `Hey, ${user.name.split(' ')[0]}! 👋` : 'My Dashboard'}
              </h1>
              <p className="text-slate-400 text-sm mt-0.5">Here's your ApkaAI activity at a glance</p>
            </div>
          </div>
          <button
            onClick={fetchDashboard}
            disabled={loading}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white border border-purple-800/40 hover:border-purple-600 px-3 py-2 rounded-lg transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-900/20 border border-red-700/40 text-red-400 mb-6 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
          </div>
        )}

        {/* Stats grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[1,2,3,4].map(i => <div key={i} className="h-28 rounded-2xl bg-purple-900/10 border border-purple-900/30 animate-pulse" />)}
          </div>
        ) : stats && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total Orders',  value: stats.totalOrders,     icon: <ShoppingBag className="w-5 h-5" />,  color: 'text-purple-400',  href: '/orders' },
                { label: 'Total Spent',   value: `₹${stats.totalSpent.toLocaleString('en-IN')}`, icon: <IndianRupee className="w-5 h-5" />, color: 'text-emerald-400', href: '/orders' },
                { label: 'Saved Tools',   value: stats.wishlistCount,   icon: <Heart className="w-5 h-5" />,        color: 'text-red-400',     href: '/wishlist' },
                { label: 'My Reviews',    value: stats.reviewCount,     icon: <Star className="w-5 h-5" />,         color: 'text-amber-400',   href: '/tools' },
              ].map(s => (
                <Link key={s.label} href={s.href} className="glow-border rounded-2xl p-5 bg-[#0F0A1E] hover:bg-purple-950/20 transition-all group">
                  <div className={`${s.color} mb-3 group-hover:scale-110 transition-transform`}>{s.icon}</div>
                  <div className="text-2xl font-extrabold text-white">{s.value}</div>
                  <div className="text-slate-400 text-xs mt-1">{s.label}</div>
                </Link>
              ))}
            </div>

            {/* Order breakdown */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Completed', value: stats.completedOrders, color: 'text-emerald-400', bg: 'bg-emerald-900/10 border-emerald-800/30' },
                { label: 'Pending',   value: stats.pendingOrders,   color: 'text-yellow-400',  bg: 'bg-yellow-900/10 border-yellow-800/30' },
                { label: 'Cancelled', value: stats.cancelledOrders, color: 'text-red-400',     bg: 'bg-red-900/10 border-red-800/30' },
              ].map(s => (
                <div key={s.label} className={`rounded-xl p-4 border ${s.bg}`}>
                  <div className={`text-xl font-extrabold ${s.color}`}>{s.value}</div>
                  <div className="text-slate-400 text-xs mt-0.5">{s.label} Orders</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Recent orders */}
        <div className="glow-border rounded-2xl bg-[#0F0A1E] overflow-hidden mb-6">
          <div className="flex items-center justify-between p-5 border-b border-purple-900/30">
            <h2 className="text-white font-bold flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-400" /> Recent Orders
            </h2>
            <Link href="/orders" className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1 transition-colors">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="p-5 space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-12 rounded-xl bg-purple-900/10 animate-pulse" />)}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="p-10 text-center">
              <ShoppingBag className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No orders yet</p>
              <Link href="/tools" className="inline-flex items-center gap-1.5 text-purple-400 hover:text-purple-300 text-sm mt-3 transition-colors">
                <Zap className="w-3.5 h-3.5" /> Browse AI Tools
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-purple-900/20">
              {recentOrders.map(order => (
                <div key={order.order_id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-900/40 flex items-center justify-center">
                      <Package className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-semibold font-mono">#{order.order_id.slice(0,8).toUpperCase()}</p>
                      <p className="text-slate-500 text-xs">{new Date(order.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })} · {order.item_count} {order.item_count === 1 ? 'item' : 'items'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-purple-300 font-bold text-sm">₹{Number(order.total).toLocaleString('en-IN')}</span>
                    <span className="flex items-center gap-1 text-xs capitalize text-slate-400">
                      {STATUS_ICON[order.status]} {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { href: '/tools',    icon: <Zap className="w-5 h-5" />,          label: 'Browse Tools',    desc: '100+ AI tools', color: 'text-purple-400' },
            { href: '/wishlist', icon: <Heart className="w-5 h-5" />,         label: 'My Wishlist',     desc: 'Saved tools',   color: 'text-red-400' },
            { href: '/referral', icon: <TrendingUp className="w-5 h-5" />,    label: 'Refer & Earn',    desc: 'Share & reward',color: 'text-amber-400' },
            { href: '/orders',   icon: <ShoppingBag className="w-5 h-5" />,   label: 'Order History',   desc: 'Past orders',   color: 'text-blue-400' },
            { href: '/compare',  icon: <LayoutDashboard className="w-5 h-5" />, label: 'Compare Tools', desc: 'Side by side',  color: 'text-emerald-400' },
            { href: '/profile',  icon: <Star className="w-5 h-5" />,          label: 'My Profile',      desc: 'Account info',  color: 'text-violet-400' },
          ].map(l => (
            <Link key={l.href} href={l.href} className="glow-border rounded-xl p-4 bg-[#0F0A1E] hover:bg-purple-950/20 transition-all group">
              <div className={`${l.color} mb-2 group-hover:scale-110 transition-transform`}>{l.icon}</div>
              <p className="text-white font-semibold text-sm">{l.label}</p>
              <p className="text-slate-400 text-xs mt-0.5">{l.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
