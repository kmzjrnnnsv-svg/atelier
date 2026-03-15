import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Heart, Share2, ShoppingBag, Check, ZoomIn, Box, BadgeCheck, RotateCcw, Star, ChevronDown, ChevronUp, Send, ScanLine, BellRing, Bell, Lock, Lightbulb, CloudRain, Sun, Snowflake, ShieldCheck, CheckCircle2, Circle, AlertTriangle } from 'lucide-react'
import useAtelierStore from '../store/atelierStore'
import { apiFetch } from '../hooks/useApi'
import { useAuth } from '../context/AuthContext'

// ── Ampel Rating Badge (inline) ────────────────────────────────────────────
const ratingStyles = {
  good:    { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500',  label: 'Empfohlen' },
  neutral: { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-400',  label: 'Neutral' },
  warn:    { bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500',    label: 'Achtung' },
}

function AmpelDot({ rating, size = 8 }) {
  const s = ratingStyles[rating]
  if (!s) return null
  return <div className={`rounded-full ${s.dot} flex-shrink-0`} style={{ width: size, height: size }} title={s.label} />
}

// ── Hint component ──────────────────────────────────────────────────────────
function Hint({ text, icon: Icon, variant = 'default' }) {
  if (!text) return null
  const styles = {
    default: 'bg-amber-50 border-amber-100 text-amber-800',
    recommend: 'bg-teal-50 border-teal-100 text-teal-800',
    warn: 'bg-orange-50 border-orange-100 text-orange-700',
    info: 'bg-blue-50 border-blue-100 text-blue-700',
  }
  return (
    <div className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 mt-2 ${styles[variant]}`}>
      {Icon ? <Icon size={12} className="flex-shrink-0 mt-0.5 opacity-70" /> : <Lightbulb size={12} className="flex-shrink-0 mt-0.5 opacity-70" />}
      <p className="text-[9px] leading-relaxed">{text}</p>
    </div>
  )
}

// ── Swipe Hook ──────────────────────────────────────────────────────────────
function useSwipe(items, selectedId, onSelect, { enabled = true } = {}) {
  const ref = useRef(null)
  const touchRef = useRef({ x0: 0, y0: 0, swiping: false })

  const currentIndex = items.findIndex(i => (i.id || i.key) === selectedId)

  const onTouchStart = useCallback((e) => {
    if (!enabled) return
    const t = e.touches[0]
    touchRef.current = { x0: t.clientX, y0: t.clientY, swiping: false }
  }, [enabled])

  const onTouchMove = useCallback((e) => {
    if (!enabled) return
    const t = e.touches[0]
    const dx = t.clientX - touchRef.current.x0
    const dy = t.clientY - touchRef.current.y0
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      touchRef.current.swiping = true
    }
  }, [enabled])

  const onTouchEnd = useCallback((e) => {
    if (!enabled || !touchRef.current.swiping) return
    const dx = e.changedTouches[0].clientX - touchRef.current.x0
    if (Math.abs(dx) < 40) return
    const available = items.filter(i => i.available !== 0 && i.available !== false)
    if (available.length < 2) return
    const curIdx = available.findIndex(i => (i.id || i.key) === selectedId)
    if (curIdx < 0) return
    const nextIdx = dx < 0
      ? (curIdx + 1) % available.length
      : (curIdx - 1 + available.length) % available.length
    onSelect(available[nextIdx].id || available[nextIdx].key)
  }, [enabled, items, selectedId, onSelect])

  return { ref, onTouchStart, onTouchMove, onTouchEnd }
}

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

// ── Sole helpers ─────────────────────────────────────────────────────────────
function getSolesForCategory(allSoles, category) {
  if (!allSoles.length) return []
  return allSoles.filter(sole => {
    if (!sole.categories || sole.categories === '*') return true
    const cats = sole.categories.split(',').map(c => c.trim().toUpperCase())
    return cats.includes(category)
  })
}

function getDefaultSole(soles) {
  const recommended = soles.find(s => s.recommended === 1 || s.recommended === true)
  return recommended ? (recommended.key || recommended.id) : (soles[0]?.key || soles[0]?.id || '')
}

export default function Customize() {
  const navigate   = useNavigate()
  const location   = useLocation()
  const { favorites, toggleFavorite, placeOrder, latestScan, addReminder, hasReminder, removeReminder, shoeMaterials, shoeColors, shoeSoles } = useAtelierStore()
  const { user }   = useAuth()
  const product    = location.state?.product || {
    name:     'The Heritage Oxford',
    price:    '€ 1.450',
    material: 'Full-Grain Calfskin',
    match:    '99.4%',
    color:    '#1f2937',
    image:    null,
  }

  const category = product.category || 'OXFORD'
  const availableSoles = getSolesForCategory(shoeSoles, category)

  // Fallback to hardcoded data if store is empty (first load)
  const matList = shoeMaterials.length ? shoeMaterials : [
    { id: 1, key: 'calfskin', label: 'CALFSKIN', sub: 'Full-Grain', color: '#b45309', available: 1, tip: 'Robust und langlebig.', season: 'Ganzjährig', rating: 'good' },
  ]
  const colList = shoeColors.length ? shoeColors : [
    { id: 1, key: 'schwarz', hex: '#000000', name: 'Schwarz', available: 1, tip: 'Der Klassiker.', pairs_with: 'Alles', rating: 'good' },
  ]
  const soleList = availableSoles.length ? availableSoles : [
    { id: 1, key: 'rubber-grip', label: 'ANTI-RUTSCH', sub: 'Gummi-Profil', description: 'Gummibeschichtete Profilsohle.', tip: 'Empfohlen für den Alltag.', price_extra: 35, rating: 'good', recommended: 1 },
  ]

  const [selectedMaterial, setSelectedMaterial] = useState(() => matList[0]?.key || '')
  const [selectedColor,    setSelectedColor]    = useState(() => colList[0]?.key || '')
  const [selectedSole,     setSelectedSole]     = useState(() => getDefaultSole(soleList))
  const [added,            setAdded]            = useState(false)
  const [addError,         setAddError]         = useState('')

  // Update defaults when store loads
  useEffect(() => {
    if (shoeMaterials.length && !shoeMaterials.find(m => m.key === selectedMaterial)) {
      setSelectedMaterial(shoeMaterials[0]?.key || '')
    }
  }, [shoeMaterials])
  useEffect(() => {
    if (shoeColors.length && !shoeColors.find(c => c.key === selectedColor)) {
      setSelectedColor(shoeColors[0]?.key || '')
    }
  }, [shoeColors])
  useEffect(() => {
    if (availableSoles.length) {
      const current = availableSoles.find(s => s.key === selectedSole)
      if (!current) setSelectedSole(getDefaultSole(availableSoles))
    }
  }, [shoeSoles, category])

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

  const selectedMat  = matList.find(m => m.key === selectedMaterial) || matList[0]
  const selectedColorObj = colList.find(c => c.key === selectedColor) || colList[0]
  const selectedSoleObj  = soleList.find(s => s.key === selectedSole) || soleList[0]
  const shoeColor    = selectedColorObj?.hex || product.color
  const matchPct     = product.match || '98.4%'
  const isFav        = favorites.includes(String(product.id))
  const avgRating    = reviews.length ? (reviews.reduce((s,r) => s + r.rating, 0) / reviews.length) : 0
  const myReview     = reviews.find(r => r.user_id === user?.id)

  // Swipe gestures
  const matSwipe  = useSwipe(matList, selectedMaterial, setSelectedMaterial)
  const colSwipe  = useSwipe(colList, selectedColor, setSelectedColor)
  const soleSwipe = useSwipe(soleList, selectedSole, setSelectedSole)

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
          sole:     selectedSoleObj?.label || 'Ledersohle',
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

  // Hint variant from rating
  const hintVariant = (rating) => {
    if (rating === 'good') return 'recommend'
    if (rating === 'warn') return 'warn'
    return 'default'
  }
  const hintIcon = (rating) => {
    if (rating === 'good') return ShieldCheck
    if (rating === 'warn') return CloudRain
    return Lightbulb
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

        {is3D && (
          <div className="absolute top-3 left-0 right-0 flex justify-center pointer-events-none">
            <div className="bg-black/60 text-white text-[8px] uppercase tracking-widest px-3 py-1 rounded-full">
              Drag to rotate 3D
            </div>
          </div>
        )}

        <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
          <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-sm">
            <RotateCcw size={10} className="text-gray-600" />
            <span className="text-[9px] uppercase tracking-[0.14em] text-gray-700 font-semibold">
              {is3D ? '3D Turntable Active' : '360° Studio View'}
            </span>
          </div>
        </div>

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

        {/* Material Selection — swipeable */}
        <div className="mb-5"
          onTouchStart={matSwipe.onTouchStart}
          onTouchMove={matSwipe.onTouchMove}
          onTouchEnd={matSwipe.onTouchEnd}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase tracking-[0.18em] text-gray-400 font-semibold">Lederart</span>
              {selectedMat?.rating && <AmpelDot rating={selectedMat.rating} />}
            </div>
            <span className="text-[10px] italic text-gray-500">{selectedMat?.label} · {selectedMat?.season || 'Ganzjährig'}</span>
          </div>
          <div className="flex gap-3">
            {matList.map((mat) => {
              const id = mat.key || String(mat.id)
              const isAvailable = mat.available !== 0 && mat.available !== false
              const reminded = hasReminder('material', id)
              return (
                <button
                  key={id}
                  onClick={() => {
                    if (isAvailable) setSelectedMaterial(id)
                    else if (!reminded) addReminder({ type: 'material', itemId: id, label: mat.label })
                    else removeReminder('material', id)
                  }}
                  className={`flex-1 flex flex-col items-center gap-2 py-3 rounded-2xl border-2 transition-all bg-transparent relative ${
                    !isAvailable ? 'border-gray-100 opacity-60' :
                    selectedMaterial === id ? 'border-black' : 'border-gray-100 bg-gray-50'
                  }`}
                >
                  {!isAvailable && (
                    <div className="absolute top-1.5 right-1.5">
                      {reminded
                        ? <BellRing size={10} className="text-teal-500" />
                        : <Lock size={9} className="text-gray-400" />
                      }
                    </div>
                  )}
                  <div className="relative">
                    <div
                      className="w-11 h-11 rounded-full shadow-sm"
                      style={{ background: `radial-gradient(circle at 35% 35%, ${mat.color}bb, ${mat.color})` }}
                    />
                    {isAvailable && mat.rating && (
                      <div className="absolute -bottom-0.5 -right-0.5">
                        <AmpelDot rating={mat.rating} size={6} />
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <p className={`text-[8px] uppercase tracking-widest font-bold ${
                      !isAvailable ? 'text-gray-400' :
                      selectedMaterial === id ? 'text-black' : 'text-gray-400'
                    }`}>
                      {mat.label}
                    </p>
                    <p className="text-[7px] text-gray-400 italic mt-0.5">
                      {!isAvailable ? (reminded ? 'Erinnerung aktiv' : 'Bald verfügbar') : mat.sub}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
          {selectedMat?.tip && (
            <Hint
              text={selectedMat.tip}
              variant={hintVariant(selectedMat.rating)}
              icon={hintIcon(selectedMat.rating)}
            />
          )}
          <p className="text-[7px] text-gray-300 text-center mt-1.5 italic">← Wischen zum Wechseln →</p>
        </div>

        {/* Color Palette — swipeable */}
        <div className="mb-5"
          onTouchStart={colSwipe.onTouchStart}
          onTouchMove={colSwipe.onTouchMove}
          onTouchEnd={colSwipe.onTouchEnd}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase tracking-[0.18em] text-gray-400 font-semibold">Farbpalette</span>
              {selectedColorObj?.rating && <AmpelDot rating={selectedColorObj.rating} />}
            </div>
            <span className="text-[10px] italic text-gray-500">{selectedColorObj?.name}</span>
          </div>
          <div className="flex gap-3 flex-wrap">
            {colList.map((col) => {
              const id = col.key || String(col.id)
              const isAvailable = col.available !== 0 && col.available !== false
              const reminded = hasReminder('color', id)
              return (
                <div key={id} className="relative">
                  <button
                    onClick={() => {
                      if (isAvailable) setSelectedColor(id)
                      else if (!reminded) addReminder({ type: 'color', itemId: id, label: col.name })
                      else removeReminder('color', id)
                    }}
                    className={`w-10 h-10 rounded-full border-2 transition-all bg-transparent flex items-center justify-center ${
                      !isAvailable ? 'border-dashed border-gray-300 opacity-50' :
                      selectedColor === id ? 'border-gray-800 scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: col.hex }}
                  >
                    {isAvailable && selectedColor === id && <Check size={14} className="text-white" strokeWidth={2.5} />}
                    {!isAvailable && !reminded && <Lock size={10} className="text-white/70" />}
                    {!isAvailable && reminded && <BellRing size={10} className="text-white" />}
                  </button>
                  {isAvailable && col.rating && (
                    <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2">
                      <AmpelDot rating={col.rating} size={5} />
                    </div>
                  )}
                  {!isAvailable && (
                    <p className="text-[6px] text-gray-400 text-center mt-0.5 leading-tight">
                      {reminded ? 'Erinnert' : 'Bald'}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
          {selectedColorObj?.tip && (
            <Hint text={selectedColorObj.tip} variant={hintVariant(selectedColorObj.rating)} icon={hintIcon(selectedColorObj.rating)} />
          )}
          {selectedColorObj?.pairs_with && (
            <div className="flex items-center gap-2 mt-1.5 px-1">
              <span className="text-[8px] text-gray-400 font-semibold uppercase tracking-wide">Passt zu:</span>
              <span className="text-[8px] text-gray-500 italic">{selectedColorObj.pairs_with}</span>
            </div>
          )}
          <p className="text-[7px] text-gray-300 text-center mt-1.5 italic">← Wischen zum Wechseln →</p>
        </div>

        {/* Sole Selection — swipeable */}
        <div className="mb-5"
          onTouchStart={soleSwipe.onTouchStart}
          onTouchMove={soleSwipe.onTouchMove}
          onTouchEnd={soleSwipe.onTouchEnd}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase tracking-[0.18em] text-gray-400 font-semibold">Sohle</span>
              {selectedSoleObj?.rating && <AmpelDot rating={selectedSoleObj.rating} />}
            </div>
            <span className="text-[10px] italic text-gray-500">{selectedSoleObj?.label}</span>
          </div>

          {/* Category-specific sole notice */}
          {category === 'BOOT' && (
            <div className="flex items-start gap-2 bg-gray-900 text-white rounded-xl px-3 py-2.5 mb-2">
              <Snowflake size={12} className="flex-shrink-0 mt-0.5 text-blue-300" />
              <p className="text-[9px] leading-relaxed">
                <span className="font-semibold">Wintermodell:</span> Chelsea-Boots werden ausschließlich mit der Anti-Rutsch Gummiprofilsohle gefertigt — für sicheren Halt auf Eis, Schnee und nassen Böden.
              </p>
            </div>
          )}
          {category === 'SNEAKER' && (
            <div className="flex items-start gap-2 bg-gray-900 text-white rounded-xl px-3 py-2.5 mb-2">
              <ShieldCheck size={12} className="flex-shrink-0 mt-0.5 text-teal-300" />
              <p className="text-[9px] leading-relaxed">
                <span className="font-semibold">Sneaker-Sohle:</span> Dieses Modell wird mit der speziell entwickelten EVA-Komfortsohle gefertigt — ultraleicht, stoßdämpfend und perfekt auf den Sneaker-Leisten abgestimmt.
              </p>
            </div>
          )}

          <div className="space-y-2">
            {soleList.map(sole => {
              const id = sole.key || String(sole.id)
              const isSelected = selectedSole === id
              const isFixed = soleList.length === 1
              return (
                <button
                  key={id}
                  onClick={() => !isFixed && setSelectedSole(id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-all bg-transparent text-left ${
                    isSelected ? 'border-black' : 'border-gray-100'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'bg-black' : 'bg-gray-100'
                  }`}>
                    <ShieldCheck size={18} className={isSelected ? 'text-white' : 'text-gray-500'} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-[9px] uppercase tracking-widest font-bold ${isSelected ? 'text-black' : 'text-gray-500'}`}>
                        {sole.label}
                      </p>
                      <span className="text-[7px] text-gray-400 italic">{sole.sub}</span>
                      {sole.rating && <AmpelDot rating={sole.rating} />}
                      {(sole.recommended === 1 || sole.recommended === true) && !isFixed && (
                        <span className="text-[6px] uppercase tracking-wide font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded-full">Empfohlen</span>
                      )}
                    </div>
                    <p className="text-[9px] text-gray-400 mt-0.5 leading-relaxed">{sole.description}</p>
                  </div>
                  {sole.price_extra > 0 && (
                    <span className="text-[9px] font-semibold text-teal-600 flex-shrink-0">+ € {sole.price_extra}</span>
                  )}
                  {isSelected && (
                    <Check size={14} className="text-black flex-shrink-0" strokeWidth={2.5} />
                  )}
                </button>
              )
            })}
          </div>

          {/* Sole recommendation hint */}
          {selectedSoleObj?.tip && (
            <Hint
              text={selectedSoleObj.tip}
              variant={hintVariant(selectedSoleObj.rating)}
              icon={hintIcon(selectedSoleObj.rating)}
            />
          )}

          {/* Extra warning if user picks a warn-rated sole */}
          {selectedSoleObj?.rating === 'warn' && soleList.length > 1 && (
            <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2.5 mt-2">
              <CloudRain size={12} className="flex-shrink-0 mt-0.5 text-orange-500" />
              <div>
                <p className="text-[9px] text-orange-800 leading-relaxed font-semibold">Achtung bei Nässe</p>
                <p className="text-[9px] text-orange-700 leading-relaxed mt-0.5">
                  Die Ledersohle ist nur bei trockenem Wetter empfehlenswert — ideal im Sommer oder für Indoor-Anlässe.
                  Für den Alltag und bei wechselhaftem Wetter empfehlen wir die Anti-Rutsch Gummiprofilsohle.
                </p>
                {(() => {
                  const recommended = soleList.find(s => s.recommended === 1 || s.recommended === true)
                  if (!recommended || (recommended.key || String(recommended.id)) === selectedSole) return null
                  return (
                    <button
                      onClick={() => setSelectedSole(recommended.key || String(recommended.id))}
                      className="mt-2 text-[9px] font-bold text-orange-800 underline bg-transparent border-0 p-0"
                    >
                      Zur {recommended.label} wechseln →
                    </button>
                  )
                })()}
              </div>
            </div>
          )}
          <p className="text-[7px] text-gray-300 text-center mt-1.5 italic">← Wischen zum Wechseln →</p>
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
