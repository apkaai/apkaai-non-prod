'use client'
import { useState, useEffect, useCallback } from 'react'
import { Star, ThumbsUp, Trash2, Loader2, AlertCircle, PenLine, CheckCircle } from 'lucide-react'

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

// ─── Types ────────────────────────────────────────────────────────────────────
interface Review {
  id: string
  rating: number
  title: string | null
  body: string | null
  helpful: number
  created_at: string
  user_name: string
  user_email_masked: string
}
interface Distribution { rating: number; count: string }

// ─── Star selector ────────────────────────────────────────────────────────────
function StarSelector({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(n => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          className="p-0.5 transition-transform hover:scale-110"
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          <Star
            className={`w-6 h-6 transition-colors ${
              n <= (hover || value)
                ? 'text-amber-400 fill-amber-400'
                : 'text-slate-600'
            }`}
          />
        </button>
      ))}
      <span className="text-slate-400 text-sm ml-1">
        {['','Terrible','Poor','Average','Good','Excellent'][hover || value] || 'Select rating'}
      </span>
    </div>
  )
}

// ─── Rating bar ───────────────────────────────────────────────────────────────
function RatingBar({ star, count, total }: { star: number; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-slate-400 w-3 text-right">{star}</span>
      <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />
      <div className="flex-1 h-1.5 bg-purple-900/30 rounded-full overflow-hidden">
        <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-slate-500 w-6 text-right">{count}</span>
    </div>
  )
}

// ─── Single review card ───────────────────────────────────────────────────────
function ReviewCard({
  review, currentUserId, isAdmin, onDelete, onHelpful,
}: {
  review: Review
  currentUserId: string | null
  isAdmin: boolean
  onDelete: (id: string) => void
  onHelpful: (id: string) => void
}) {
  const [helpfulCount, setHelpfulCount] = useState(review.helpful)
  const [voted, setVoted]               = useState(false)
  const [deleting, setDeleting]         = useState(false)

  async function handleHelpful() {
    if (voted) return
    setVoted(true)
    setHelpfulCount(p => p + 1)
    onHelpful(review.id)
  }

  async function handleDelete() {
    if (!confirm('Delete this review?')) return
    setDeleting(true)
    try {
      const res = await fetch(`${API}/reviews/${review.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (res.ok) onDelete(review.id)
    } catch {}
    setDeleting(false)
  }

  function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div className="p-5 rounded-2xl bg-purple-950/20 border border-purple-900/30">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-violet-700 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">{getInitials(review.user_name)}</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{review.user_name}</p>
            <p className="text-slate-500 text-xs">{new Date(review.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {[1,2,3,4,5].map(n => (
            <Star key={n} className={`w-3.5 h-3.5 ${n <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}`} />
          ))}
        </div>
      </div>

      {/* Content */}
      {review.title && <p className="text-white font-semibold text-sm mb-1">{review.title}</p>}
      {review.body  && <p className="text-slate-300 text-sm leading-relaxed mb-3">{review.body}</p>}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleHelpful}
          disabled={voted}
          className={`flex items-center gap-1.5 text-xs transition-colors ${voted ? 'text-purple-400' : 'text-slate-500 hover:text-purple-400'}`}
        >
          <ThumbsUp className="w-3.5 h-3.5" />
          Helpful ({helpfulCount})
        </button>
        {(isAdmin) && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-500/50 hover:text-red-400 transition-colors"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main ReviewSection ───────────────────────────────────────────────────────
interface ReviewSectionProps { toolId: string; toolSlug: string }

export default function ReviewSection({ toolId, toolSlug }: ReviewSectionProps) {
  const [reviews, setReviews]         = useState<Review[]>([])
  const [total, setTotal]             = useState(0)
  const [avgRating, setAvgRating]     = useState(0)
  const [distribution, setDist]       = useState<Distribution[]>([])
  const [page, setPage]               = useState(1)
  const [loading, setLoading]         = useState(true)
  const [submitting, setSubmitting]   = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)
  // Form
  const [rating, setRating]   = useState(0)
  const [title, setTitle]     = useState('')
  const [body, setBody]       = useState('')
  const [myReview, setMyReview] = useState<Review | null>(null)
  const [showForm, setShowForm] = useState(false)

  const user    = typeof window !== 'undefined' ? getUser() : null
  const isAdmin = user?.role === 'admin'
  const LIMIT   = 5

  const fetchReviews = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const res  = await fetch(`${API}/reviews/${toolSlug}?page=${p}&limit=${LIMIT}`)
      const data = await res.json()
      setReviews(data.reviews || [])
      setTotal(data.total || 0)
      setAvgRating(data.avgRating || 0)
      setDist(data.distribution || [])
      setPage(p)
    } catch {}
    setLoading(false)
  }, [toolSlug])

  const fetchMyReview = useCallback(async () => {
    const token = getToken()
    if (!token) return
    try {
      const res  = await fetch(`${API}/reviews/${toolSlug}/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.review) {
        setMyReview(data.review)
        setRating(data.review.rating)
        setTitle(data.review.title || '')
        setBody(data.review.body || '')
      }
    } catch {}
  }, [toolSlug])

  useEffect(() => { fetchReviews(1) }, [fetchReviews])
  useEffect(() => { if (user) fetchMyReview() }, [fetchMyReview, user?.userId])

  async function submitReview(e: React.FormEvent) {
    e.preventDefault()
    if (rating === 0) { setSubmitError('Please select a rating'); return }
    const token = getToken()
    if (!token) { setSubmitError('Please sign in to leave a review'); return }

    setSubmitting(true)
    setSubmitError('')
    try {
      const res  = await fetch(`${API}/reviews/${toolSlug}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ toolId, rating, title, body }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit review')
      setSubmitSuccess(true)
      setShowForm(false)
      fetchReviews(1)
      fetchMyReview()
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit')
    }
    setSubmitting(false)
  }

  function handleDelete(id: string) {
    setReviews(prev => prev.filter(r => r.id !== id))
    setTotal(p => p - 1)
    if (myReview?.id === id) { setMyReview(null); setSubmitSuccess(false) }
  }

  async function handleHelpful(id: string) {
    const token = getToken()
    if (!token) return
    await fetch(`${API}/reviews/${id}/helpful`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="glow-border rounded-2xl bg-[#0F0A1E] overflow-hidden">
      <div className="p-6 border-b border-purple-900/30">
        <h2 className="text-white font-bold text-lg">Reviews & Ratings</h2>
      </div>

      <div className="p-6 space-y-6">
        {/* ── Summary ── */}
        {total > 0 && (
          <div className="flex flex-col sm:flex-row gap-6 p-5 rounded-xl bg-purple-950/20 border border-purple-900/20">
            {/* Big avg number */}
            <div className="text-center flex-shrink-0">
              <p className="text-5xl font-extrabold text-white">{avgRating.toFixed(1)}</p>
              <div className="flex items-center justify-center gap-0.5 my-1">
                {[1,2,3,4,5].map(n => (
                  <Star key={n} className={`w-4 h-4 ${n <= Math.round(avgRating) ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}`} />
                ))}
              </div>
              <p className="text-slate-400 text-xs">{total} {total === 1 ? 'review' : 'reviews'}</p>
            </div>
            {/* Distribution bars */}
            <div className="flex-1 space-y-1.5">
              {[5,4,3,2,1].map(star => {
                const found = distribution.find(d => Number(d.rating) === star)
                return <RatingBar key={star} star={star} count={found ? Number(found.count) : 0} total={total} />
              })}
            </div>
          </div>
        )}

        {/* ── Write a review ── */}
        {user ? (
          <div>
            {submitSuccess && !showForm && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-900/20 border border-emerald-700/30 text-emerald-400 text-sm mb-4">
                <CheckCircle className="w-4 h-4" /> Your review has been submitted!
              </div>
            )}
            {myReview && !showForm ? (
              <div className="p-4 rounded-xl bg-purple-900/20 border border-purple-700/30 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-purple-300 text-sm font-semibold">Your Review</p>
                  <button onClick={() => setShowForm(true)} className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors">
                    <PenLine className="w-3.5 h-3.5" /> Edit
                  </button>
                </div>
                <div className="flex items-center gap-1 mb-1">
                  {[1,2,3,4,5].map(n => (
                    <Star key={n} className={`w-3.5 h-3.5 ${n <= myReview.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}`} />
                  ))}
                </div>
                {myReview.title && <p className="text-white text-sm font-medium">{myReview.title}</p>}
                {myReview.body  && <p className="text-slate-300 text-sm mt-0.5">{myReview.body}</p>}
              </div>
            ) : !showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="w-full flex items-center justify-center gap-2 border border-purple-700/40 hover:border-purple-500 text-purple-300 hover:text-white font-semibold py-3 rounded-xl text-sm transition-all hover:bg-purple-900/20 mb-4"
              >
                <PenLine className="w-4 h-4" /> Write a Review
              </button>
            )}

            {showForm && (
              <form onSubmit={submitReview} className="space-y-4 p-5 rounded-xl bg-purple-950/20 border border-purple-900/30 mb-4">
                <h3 className="text-white font-semibold text-sm">{myReview ? 'Update your review' : 'Write a review'}</h3>

                <StarSelector value={rating} onChange={setRating} />

                <input
                  type="text"
                  placeholder="Review title (optional)"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  maxLength={200}
                  className="w-full bg-purple-950/40 border border-purple-800/40 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                />
                <textarea
                  placeholder="Share your experience with this tool... (optional)"
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  className="w-full bg-purple-950/40 border border-purple-800/40 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition resize-none"
                />

                {submitError && (
                  <div className="flex items-center gap-2 text-red-400 text-xs">
                    <AlertCircle className="w-4 h-4" /> {submitError}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 btn-primary text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    {myReview ? 'Update Review' : 'Submit Review'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)}
                    className="flex-1 border border-purple-800/40 text-slate-300 hover:text-white font-semibold py-2.5 rounded-xl text-sm transition-all hover:border-purple-600">
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 rounded-xl bg-purple-950/20 border border-purple-900/20 mb-4">
            <p className="text-slate-400 text-sm">Sign in to leave a review</p>
            <a href="/signin" className="text-purple-400 hover:text-purple-300 text-sm font-semibold transition-colors">Sign In →</a>
          </div>
        )}

        {/* ── Review list ── */}
        {loading ? (
          <div className="space-y-3">
            {[1,2].map(i => <div key={i} className="h-24 rounded-2xl bg-purple-900/10 border border-purple-900/30 animate-pulse" />)}
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-10">
            <Star className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No reviews yet. Be the first to review!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map(review => (
              <ReviewCard
                key={review.id}
                review={review}
                currentUserId={user?.userId || null}
                isAdmin={isAdmin}
                onDelete={handleDelete}
                onHelpful={handleHelpful}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <button onClick={() => fetchReviews(page - 1)} disabled={page === 1}
              className="px-4 py-2 rounded-lg border border-purple-800/40 text-slate-400 hover:text-white hover:border-purple-600 disabled:opacity-30 text-sm transition-all">
              Previous
            </button>
            <span className="text-slate-400 text-sm">Page {page} of {totalPages}</span>
            <button onClick={() => fetchReviews(page + 1)} disabled={page === totalPages}
              className="px-4 py-2 rounded-lg border border-purple-800/40 text-slate-400 hover:text-white hover:border-purple-600 disabled:opacity-30 text-sm transition-all">
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
