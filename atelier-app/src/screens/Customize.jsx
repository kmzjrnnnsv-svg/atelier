import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Heart, Share2, ShoppingBag, Check, ZoomIn, Box, BadgeCheck, RotateCcw, Star, ChevronDown, ChevronUp, Send, ScanLine } from 'lucide-react'
import useAtelierStore from '../store/atelierStore'
import { apiFetch } from '../hooks/useApi'
import { useAuth } from '../context/AuthContext'

const materials = [
  { id: 'calfskin', label: 'CALFSKIN',  sub: 'Full-Grain', color: '#b45309' },
  { id: 'suede',    label: 'SUEDE',     sub: 'Nubuck',     color: '#78716c' },
  { id: 'patent',   label: 'PATENT',    sub: 'High-Gloss', color: '#111827' },
]

const colors = [
  { id: 'black',   hex: '#111827', name: 'Midnight Black' },
  { id: 'cognac',  hex: '#92400e', name: 'Cognac'         },
  { id: 'oxblood', hex: '#7b1e1e', name: 'Oxblood'        },
  { id: 'tan',     hex: '#b45309', name: 'Tan'            },
  { id: 'navy',    hex: '#1e3a5f', name: 'Navy'           },
  { id: 'forest',  hex: '#14532d', name: 'Forest'         },
]

// ── Star Picker ──────────────────────────────────────────────────────────────
function StarPicker({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(n => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className="bg-transparent border-0 p-0"
        >
          <Star
            size={22}
            className={n <= value ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  )
}

// ── Star Display (read-only) ──────────────────────────────────────────────────
function StarDisplay({ value, size = 12 }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(n => (
        <Star
          key={n}
          size={size}
          className={n <= Math.round(value) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}
          strokeWidth={1}
        />
      ))}
    </span>
  )
}

export default function Customize() {
  const navigate   = useNavigate()
  const location   = useLocation()
  const { favorites, toggleFavorite, placeOrder, latestScan } = useAtelierStore()
  const { user }   = useAuth()
  const product    = location.state?.product || {
    name:     'The Heritage Oxford',
    price:    '€ 1.450',
    material: 'Full-Grain Calfskin',
    match:    '99.4%',
    color:    '#1f2937',
    image:    null,
  }

  const [selectedMaterial, setSelectedMaterial] = useState('calfskin')
  const [selectedColor,    setSelectedColor]    = useState('black')
  const [added,            setAdded]            = useState(false)
  const [addError,         setAddError]         = useState('')

  // 3D viewer state
  const [is3D,  setIs3D]  = useState(false)
  const [rotY,  setRotY]  = useState(0)
  const drag = useRef({ on: false, x0: 0, a0: 0 })

  // Reviews state
  const [reviews,        setReviews]        = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [myRating,       setMyRating]       = useState(0)
  const [myComment,      setMyComment]      = useState('')
  const [submitting,     setSubmitting]     = useState(false)
  const [reviewError,    setReviewError]    = useState('')

  const shoeColor    = colors.find(c => c.id === selectedColor)?.hex || product.color
  const matchPct     = product.match || '98.4%'
  const selectedMat  = materials.find(m => m.id === selectedMaterial)
  const isFav        = favorites.includes(String(product.id))
  const avgRating    = reviews.length ? (reviews.reduce((s,r) => s + r.rating, 0) / reviews.length) : 0
  const myReview     = reviews.find(r => r.user_id === user?.id)

  // Load reviews
  useEffect(() => {
    if (!product.id) return
    setReviewsLoading(true)
    apiFetch(`/api/reviews/shoe/${product.id}`)
      .then(rows => setReviews(rows))
      .catch(() => {})
      .finally(() => setReviewsLoading(false))
  }, [product.id])

  // Pointer events for 3D drag
  const onPointerDown = (e) => {
    if (!is3D) return
    drag.current = { on: true, x0: e.clientX, a0: rotY }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e) => {
    if (!drag.current.on) return
    setRotY(drag.current.a0 + (e.clientX - drag.current.x0) * 0.5)
  }
  const onPointerUp = () => { drag.current.on = false }

  const toggle3D = () => {
    setIs3D(v => !v)
    setRotY(0)
  }

  const handleAddToBag = () => {
    navigate('/checkout', {
      state: {
        product: {
          id:       product.id,
          name:     product.name,
          material: selectedMat?.label || product.material || 'Calfskin',
          color:    shoeColor,
          price:    product.price,
        },
      },
    })
  }

  const handleSubmitReview = async () => {
    if (!myRating) { setReviewError('Please select a rating'); return }
    setSubmitting(true)
    setReviewError('')
    try {
      const row = await apiFetch('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({ shoe_id: Number(product.id), rating: myRating, comment: myComment.trim() || null }),
      })
      setReviews(prev => [row, ...prev])
      setShowReviewForm(false)
      setMyRating(0)
      setMyComment('')
    } catch (e) {
      setReviewError(e?.error || 'Could not submit review')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center border-0">
          <ArrowLeft size={18} strokeWidth={1.8} className="text-gray-800" />
        </button>

        <div className="text-center flex-1 px-2">
          <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-black leading-tight">
            {product.name}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">{product.price}</p>
        </div>

        <button
          onClick={() => toggleFavorite(product.id)}
          className="w-9 h-9 rounded-full flex items-center justify-center border-0"
          style={{ background: isFav ? '#fee2e2' : '#f3f4f6' }}
        >
          <Heart size={16} className={isFav ? 'text-red-500 fill-red-500' : 'text-gray-700'} />
        </button>
      </div>

      {/* ── Hero Viewer ─────────────────────────────────────────────────── */}
      <div
        className="relative mx-4 mt-2 bg-gradient-to-b from-gray-50 to-gray-100 rounded-3xl overflow-hidden select-none"
        style={{ height: 'clamp(160px, 25dvh, 240px)', cursor: is3D ? 'grab' : 'default' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <div
          className="absolute inset-0 flex items-center justify-center px-6 py-4"
          style={{
            transform: is3D ? `perspective(800px) rotateY(${rotY}deg)` : 'none',
            transition: drag.current.on ? 'none' : 'transform 0.3s ease',
          }}
        >
          {product.image ? (
            <img src={product.image} alt={product.name} className="w-full h-full object-contain" />
          ) : (
            <svg viewBox="0 0 260 130" className="w-64 transition-all duration-500">
              <ellipse cx="130" cy="118" rx="112" ry="10" fill="#d1d5db" />
              <path d="M20 100 Q17 108 38 112 L222 112 Q238 112 238 100 L232 80 Q226 62 210 60 L72 60 Q47 60 42 68 Z" fill={shoeColor} />
              <path d="M42 68 Q37 48 62 36 L120 30 Q155 27 178 42 Q198 54 232 80 L210 60 Q180 50 148 52 L90 53 Q60 55 42 68 Z" fill={shoeColor} opacity="0.85" />
              <path d="M42 68 Q36 55 53 44 Q68 34 87 34 L87 53 Q63 55 42 68 Z" fill={shoeColor} />
              <path d="M87 53 L210 60 Q210 50 178 42 Q155 27 120 30 L87 34 Z" fill="white" opacity="0.1" />
              <path d="M90 38 Q115 30 148 31 Q175 31 198 44" stroke="white" strokeWidth="1.5" fill="none" opacity="0.2" />
            </svg>
          )}
        </div>

        {/* 3D mode indicator */}
        {is3D && (
          <div className="absolute top-3 left-0 right-0 flex justify-center pointer-events-none">
            <div className="bg-black/60 text-white text-[8px] uppercase tracking-widest px-3 py-1 rounded-full">
              Drag to rotate 3D
            </div>
          </div>
        )}

        {/* 360° badge */}
        <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
          <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-sm">
            <RotateCcw size={10} className="text-gray-600" />
            <span className="text-[9px] uppercase tracking-[0.14em] text-gray-700 font-semibold">
              {is3D ? '3D Turntable Active' : '360° Studio View'}
            </span>
          </div>
        </div>

        {/* Right-side icon buttons */}
        <div className="absolute right-3 top-3 flex flex-col gap-2">
          <button
            onClick={toggle3D}
            className={`w-9 h-9 rounded-full shadow-md flex items-center justify-center border-0 transition-colors ${is3D ? 'bg-black' : 'bg-white/90'}`}
          >
            <Box size={15} className={is3D ? 'text-white' : 'text-gray-700'} strokeWidth={1.5} />
          </button>
          <button className="w-9 h-9 rounded-full bg-white/90 shadow-md flex items-center justify-center border-0">
            <ZoomIn size={15} className="text-gray-700" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* ── AI Precision Profile ─────────────────────────────────────────── */}
      <div className="mx-4 mt-3 bg-black rounded-2xl px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#f59e0b" strokeWidth="1.5">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
              </svg>
            </div>
            <div>
              <p className="text-[8px] uppercase tracking-[0.16em] text-gray-400 font-semibold">AI Precision Profile</p>
              <p className="text-sm font-bold text-white leading-tight">
                {matchPct} <span className="text-[10px] font-normal text-gray-300">Passgenauigkeit</span>
              </p>
            </div>
          </div>
          <BadgeCheck size={22} className="text-teal-400 flex-shrink-0" strokeWidth={1.5} />
        </div>
        <p className="text-[9px] text-gray-500 mt-2 leading-relaxed pl-12">
          Basierend auf deinem 3D-Scan und der Schuhgeometrie — je höher, desto besser der Sitz.
        </p>
      </div>

      {/* ── Scrollable Config ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 mt-4 pb-4">

        {/* Material Selection */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] uppercase tracking-[0.18em] text-gray-400 font-semibold">Material Selection</span>
            <span className="text-[10px] italic text-gray-500">{selectedMat?.label} Selected</span>
          </div>
          <div className="flex gap-3">
            {materials.map((mat) => (
              <button
                key={mat.id}
                onClick={() => setSelectedMaterial(mat.id)}
                className={`flex-1 flex flex-col items-center gap-2 py-3 rounded-2xl border-2 transition-all bg-transparent ${
                  selectedMaterial === mat.id ? 'border-black' : 'border-gray-100 bg-gray-50'
                }`}
              >
                <div
                  className="w-11 h-11 rounded-full shadow-sm"
                  style={{ background: `radial-gradient(circle at 35% 35%, ${mat.color}bb, ${mat.color})` }}
                />
                <div className="text-center">
                  <p className={`text-[8px] uppercase tracking-widest font-bold ${selectedMaterial === mat.id ? 'text-black' : 'text-gray-400'}`}>
                    {mat.label}
                  </p>
                  <p className="text-[7px] text-gray-400 italic mt-0.5">{mat.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Color Palette */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] uppercase tracking-[0.18em] text-gray-400 font-semibold">Color Palette</span>
            <span className="text-[10px] italic text-gray-500">{colors.find(c => c.id === selectedColor)?.name}</span>
          </div>
          <div className="flex gap-3 flex-wrap">
            {colors.map((col) => (
              <button
                key={col.id}
                onClick={() => setSelectedColor(col.id)}
                className={`w-10 h-10 rounded-full border-2 transition-all bg-transparent flex items-center justify-center ${
                  selectedColor === col.id ? 'border-gray-800 scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: col.hex }}
              >
                {selectedColor === col.id && <Check size={14} className="text-white" strokeWidth={2.5} />}
              </button>
            ))}
          </div>
        </div>

        {/* Size from scan */}
        {latestScan ? (
          <div className="bg-gray-50 rounded-2xl p-4 mb-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[8px] uppercase tracking-widest text-gray-400">Size (from 3D Profile)</p>
                <p className="text-base font-bold text-black mt-0.5">
                  EU {latestScan.eu_size} · US {latestScan.us_size} · UK {latestScan.uk_size}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[8px] uppercase tracking-widest text-gray-400">Accuracy</p>
                <p className="text-sm font-semibold text-black mt-0.5">{latestScan.accuracy}%</p>
              </div>
            </div>
            <p className="text-[9px] text-teal-600 mt-2 italic">Automatically set from your 3D foot scan</p>
          </div>
        ) : (
          <button
            onClick={() => navigate('/scan')}
            className="w-full rounded-2xl p-4 mb-5 border-2 border-dashed border-teal-300 bg-teal-50 flex items-center gap-3 active:bg-teal-100 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center flex-shrink-0">
              <ScanLine size={20} className="text-white" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-teal-800 uppercase tracking-wide">Fuß scannen für perfekte Größe</p>
              <p className="text-[9px] text-teal-600 mt-0.5">Kein Scan gefunden — jetzt AI-Fußscan starten →</p>
            </div>
          </button>
        )}

        {/* ── Reviews Section ──────────────────────────────────────────── */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase tracking-[0.18em] text-gray-400 font-semibold">Reviews</span>
              {reviews.length > 0 && (
                <div className="flex items-center gap-1">
                  <StarDisplay value={avgRating} size={10} />
                  <span className="text-[9px] text-gray-500">({reviews.length})</span>
                </div>
              )}
            </div>
            {!myReview && product.id && (
              <button
                onClick={() => setShowReviewForm(v => !v)}
                className="text-[9px] uppercase tracking-widest text-black font-bold bg-transparent border-0 p-0 flex items-center gap-1"
              >
                {showReviewForm ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {showReviewForm ? 'Close' : 'Write Review'}
              </button>
            )}
          </div>

          {/* Write Review Form */}
          {showReviewForm && !myReview && (
            <div className="bg-gray-50 rounded-2xl p-4 mb-3">
              <p className="text-[9px] uppercase tracking-widest text-gray-400 mb-2">Your Rating</p>
              <StarPicker value={myRating} onChange={setMyRating} />
              <textarea
                value={myComment}
                onChange={e => setMyComment(e.target.value)}
                placeholder="Share your experience (optional)..."
                className="w-full mt-3 text-sm text-black bg-white border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-black resize-none"
                rows={3}
                style={{ fontFamily: 'inherit' }}
              />
              {reviewError && <p className="text-[10px] text-red-500 mt-1">{reviewError}</p>}
              <button
                onClick={handleSubmitReview}
                disabled={submitting || !myRating}
                className="mt-3 w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-black text-white text-[10px] font-bold uppercase tracking-widest border-0 disabled:opacity-40"
              >
                <Send size={13} />
                {submitting ? 'Submitting…' : 'Submit Review'}
              </button>
            </div>
          )}

          {/* Reviews list */}
          {reviewsLoading ? (
            <p className="text-[10px] text-gray-400 text-center py-3">Loading reviews…</p>
          ) : reviews.length === 0 ? (
            <div className="bg-gray-50 rounded-2xl p-4 text-center">
              <p className="text-[10px] text-gray-400">No reviews yet. Be the first!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {reviews.slice(0, 3).map(rev => (
                <div key={rev.id} className="bg-gray-50 rounded-2xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                        <span className="text-[9px] font-bold text-gray-600">{rev.user_name?.[0]?.toUpperCase()}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-black">{rev.user_name}</span>
                    </div>
                    <StarDisplay value={rev.rating} size={10} />
                  </div>
                  {rev.comment && <p className="text-[10px] text-gray-500 leading-relaxed">{rev.comment}</p>}
                  <p className="text-[8px] text-gray-400 mt-1">{new Date(rev.created_at).toLocaleDateString('de-DE')}</p>
                </div>
              ))}
              {reviews.length > 3 && (
                <p className="text-[9px] text-gray-400 text-center pt-1">+{reviews.length - 3} more reviews</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Actions ───────────────────────────────────────────────── */}
      <div className="bg-white border-t border-gray-100 px-4 pt-3 flex-shrink-0"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)' }}>
        {addError && <p className="text-[10px] text-red-500 text-center mb-2">{addError}</p>}
        <div className="flex items-center gap-3">
          <button
            onClick={handleAddToBag}
            disabled={added}
            className={`flex-1 h-14 rounded-2xl flex items-center justify-center gap-2.5 text-sm font-bold uppercase tracking-widest transition-all border-0 ${
              added ? 'bg-green-600 text-white' : 'bg-black text-white active:bg-gray-800'
            }`}
          >
            {added
              ? <><Check size={18} /><span>Order Placed!</span></>
              : <><ShoppingBag size={18} /><span>Add to Bag</span></>
            }
          </button>
          <button
            onClick={() => navigate('/visualizer')}
            className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center border-0"
            title="Outfit Visualizer"
          >
            <Share2 size={18} className="text-gray-700" strokeWidth={1.5} />
          </button>
        </div>
        <p className="text-center text-[8px] uppercase tracking-[0.13em] text-gray-400 mt-3">
          Ready for Production · Handcrafted Delivery in 4 Weeks
        </p>
      </div>
    </div>
  )
}
