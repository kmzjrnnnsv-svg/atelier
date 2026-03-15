import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Heart, ShoppingBag, Check, Star, ChevronDown, ChevronUp, Send, ScanLine, BellRing, Lock, ShieldCheck } from 'lucide-react'
import useAtelierStore from '../store/atelierStore'
import { apiFetch } from '../hooks/useApi'
import { useAuth } from '../context/AuthContext'

// ── Swipe: wische links/rechts um Option zu wechseln ────────────────────────
function useSwipe(items, selectedId, onSelect) {
  const touchRef = useRef({ x0: 0, y0: 0, swiping: false })
  const onTouchStart = useCallback((e) => {
    const t = e.touches[0]
    touchRef.current = { x0: t.clientX, y0: t.clientY, swiping: false }
  }, [])
  const onTouchMove = useCallback((e) => {
    const t = e.touches[0]
    const dx = t.clientX - touchRef.current.x0
    const dy = t.clientY - touchRef.current.y0
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) touchRef.current.swiping = true
  }, [])
  const onTouchEnd = useCallback((e) => {
    if (!touchRef.current.swiping) return
    const dx = e.changedTouches[0].clientX - touchRef.current.x0
    if (Math.abs(dx) < 40) return
    const avail = items.filter(i => i.available !== 0 && i.available !== false)
    if (avail.length < 2) return
    const cur = avail.findIndex(i => (i.key || String(i.id)) === selectedId)
    if (cur < 0) return
    const next = dx < 0 ? (cur + 1) % avail.length : (cur - 1 + avail.length) % avail.length
    onSelect(avail[next].key || String(avail[next].id))
  }, [items, selectedId, onSelect])
  return { onTouchStart, onTouchMove, onTouchEnd }
}

// ── Sterne (nur Anzeige) ────────────────────────────────────────────────────
function Stars({ value, size = 14 }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(n => (
        <Star key={n} size={size} className={n <= Math.round(value) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'} strokeWidth={1} />
      ))}
    </span>
  )
}

// ── Ampel-Punkt: grün / gelb / rot ─────────────────────────────────────────
function Dot({ rating }) {
  const c = rating === 'good' ? 'bg-green-400' : rating === 'warn' ? 'bg-red-400' : 'bg-amber-300'
  return <div className={`w-2 h-2 rounded-full ${c}`} />
}

// ── Sohlen für Kategorie filtern ────────────────────────────────────────────
function getSolesForCategory(allSoles, category) {
  if (!allSoles.length) return []
  return allSoles.filter(s => {
    if (!s.categories || s.categories === '*') return true
    return s.categories.split(',').map(c => c.trim().toUpperCase()).includes(category)
  })
}

function getDefaultSole(soles) {
  const rec = soles.find(s => s.recommended === 1 || s.recommended === true)
  return rec ? (rec.key || String(rec.id)) : (soles[0]?.key || String(soles[0]?.id) || '')
}

// ═════════════════════════════════════════════════════════════════════════════
export default function Customize() {
  const navigate = useNavigate()
  const location = useLocation()
  const { favorites, toggleFavorite, latestScan, addReminder, hasReminder, removeReminder, shoeMaterials, shoeColors, shoeSoles } = useAtelierStore()
  const { user } = useAuth()

  const product = location.state?.product || {
    name: 'The Heritage Oxford', price: '€ 1.450', material: 'Full-Grain Calfskin',
    match: '99.4%', color: '#1f2937', image: null,
  }
  const category = product.category || 'OXFORD'
  const availableSoles = getSolesForCategory(shoeSoles, category)

  // Daten aus dem Store (mit Fallback)
  const matList = shoeMaterials.length ? shoeMaterials : [
    { id: 1, key: 'calfskin', label: 'Kalbsleder', sub: 'Full-Grain', color: '#b45309', available: 1, tip: 'Robust und langlebig.', rating: 'good' },
  ]
  const colList = shoeColors.length ? shoeColors : [
    { id: 1, key: 'schwarz', hex: '#000000', name: 'Schwarz', available: 1, rating: 'good' },
  ]
  const soleList = availableSoles.length ? availableSoles : [
    { id: 1, key: 'rubber-grip', label: 'Anti-Rutsch', sub: 'Gummi', description: 'Profilsohle mit Grip.', price_extra: 35, rating: 'good', recommended: 1 },
  ]

  const [selMat,  setSelMat]  = useState(() => matList[0]?.key || '')
  const [selCol,  setSelCol]  = useState(() => colList[0]?.key || '')
  const [selSole, setSelSole] = useState(() => getDefaultSole(soleList))
  const [added,   setAdded]   = useState(false)

  // Reviews
  const [reviews, setReviews]       = useState([])
  const [showReview, setShowReview] = useState(false)
  const [myRating, setMyRating]     = useState(0)
  const [myComment, setMyComment]   = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Store-Daten aktualisieren
  useEffect(() => {
    if (shoeMaterials.length && !shoeMaterials.find(m => m.key === selMat)) setSelMat(shoeMaterials[0]?.key || '')
  }, [shoeMaterials])
  useEffect(() => {
    if (shoeColors.length && !shoeColors.find(c => c.key === selCol)) setSelCol(shoeColors[0]?.key || '')
  }, [shoeColors])
  useEffect(() => {
    if (availableSoles.length && !availableSoles.find(s => s.key === selSole)) setSelSole(getDefaultSole(availableSoles))
  }, [shoeSoles, category])

  const mat      = matList.find(m => m.key === selMat) || matList[0]
  const col      = colList.find(c => c.key === selCol) || colList[0]
  const sole     = soleList.find(s => s.key === selSole) || soleList[0]
  const color    = col?.hex || product.color
  const isFav    = favorites.includes(String(product.id))
  const avg      = reviews.length ? reviews.reduce((s,r) => s + r.rating, 0) / reviews.length : 0
  const myRev    = reviews.find(r => r.user_id === user?.id)

  // Swipe
  const matSwipe  = useSwipe(matList, selMat, setSelMat)
  const colSwipe  = useSwipe(colList, selCol, setSelCol)
  const soleSwipe = useSwipe(soleList, selSole, setSelSole)

  // Reviews laden
  useEffect(() => {
    if (!product.id) return
    apiFetch(`/api/reviews/shoe/${product.id}`).then(setReviews).catch(() => {})
  }, [product.id])

  const handleBuy = () => {
    navigate('/checkout', {
      state: {
        product: {
          id: product.id, name: product.name,
          material: mat?.label || product.material,
          color, price: product.price,
          sole: sole?.label || 'Sohle',
        },
      },
    })
  }

  const handleReview = async () => {
    if (!myRating) return
    setSubmitting(true)
    try {
      const row = await apiFetch('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({ shoe_id: Number(product.id), rating: myRating, comment: myComment.trim() || null }),
      })
      setReviews(prev => [row, ...prev])
      setShowReview(false); setMyRating(0); setMyComment('')
    } catch {} finally { setSubmitting(false) }
  }

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center border-0">
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <div className="text-center flex-1 px-3">
          <p className="text-sm font-bold text-black">{product.name}</p>
          <p className="text-xs text-gray-400">{product.price}</p>
        </div>
        <button
          onClick={() => toggleFavorite(product.id)}
          className="w-10 h-10 rounded-full flex items-center justify-center border-0"
          style={{ background: isFav ? '#fee2e2' : '#f3f4f6' }}
        >
          <Heart size={18} className={isFav ? 'text-red-500 fill-red-500' : 'text-gray-500'} />
        </button>
      </div>

      {/* ── Schuh-Bild ─────────────────────────────────────────── */}
      <div className="mx-4 mt-1 bg-gray-50 rounded-3xl overflow-hidden flex items-center justify-center"
        style={{ height: 'clamp(140px, 22dvh, 200px)' }}>
        {product.image ? (
          <img src={product.image} alt={product.name} className="w-full h-full object-contain p-4" />
        ) : (
          <svg viewBox="0 0 260 130" className="w-56">
            <ellipse cx="130" cy="118" rx="112" ry="10" fill="#e5e7eb" />
            <path d="M20 100 Q17 108 38 112 L222 112 Q238 112 238 100 L232 80 Q226 62 210 60 L72 60 Q47 60 42 68 Z" fill={color} />
            <path d="M42 68 Q37 48 62 36 L120 30 Q155 27 178 42 Q198 54 232 80 L210 60 Q180 50 148 52 L90 53 Q60 55 42 68 Z" fill={color} opacity="0.85" />
            <path d="M42 68 Q36 55 53 44 Q68 34 87 34 L87 53 Q63 55 42 68 Z" fill={color} />
            <path d="M87 53 L210 60 Q210 50 178 42 Q155 27 120 30 L87 34 Z" fill="white" opacity="0.1" />
          </svg>
        )}
      </div>

      {/* ── Passgenauigkeit ────────────────────────────────────── */}
      <div className="mx-4 mt-3 bg-black rounded-2xl px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400">Passgenauigkeit</p>
          <p className="text-lg font-bold text-white">{product.match || '98.4%'}</p>
        </div>
        {latestScan && (
          <div className="text-right">
            <p className="text-xs text-gray-400">Deine Größe</p>
            <p className="text-sm font-bold text-white">EU {latestScan.eu_size}</p>
          </div>
        )}
      </div>

      {/* ── Auswahl ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 mt-4 pb-4 space-y-6">

        {/* 1. Leder */}
        <div {...matSwipe}>
          <p className="text-xs font-semibold text-gray-500 mb-2">Leder wählen</p>
          <div className="flex gap-2">
            {matList.map(m => {
              const id = m.key || String(m.id)
              const avail = m.available !== 0 && m.available !== false
              const reminded = hasReminder('material', id)
              return (
                <button key={id}
                  onClick={() => {
                    if (avail) setSelMat(id)
                    else if (!reminded) addReminder({ type: 'material', itemId: id, label: m.label })
                    else removeReminder('material', id)
                  }}
                  className={`flex-1 py-3 rounded-2xl border-2 transition-all bg-transparent flex flex-col items-center gap-2 ${
                    !avail ? 'border-gray-100 opacity-50' : selMat === id ? 'border-black' : 'border-gray-100'
                  }`}
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full shadow-sm"
                      style={{ background: `radial-gradient(circle at 35% 35%, ${m.color}cc, ${m.color})` }} />
                    {!avail && <Lock size={12} className="absolute inset-0 m-auto text-white/80" />}
                    {!avail && reminded && <BellRing size={12} className="absolute inset-0 m-auto text-teal-400" />}
                  </div>
                  <span className="text-[11px] font-semibold text-gray-700">{m.label}</span>
                  {!avail && <span className="text-[10px] text-gray-400">{reminded ? 'Erinnert' : 'Bald da'}</span>}
                </button>
              )
            })}
          </div>
          {mat?.tip && (
            <p className="text-[11px] text-gray-400 mt-2 leading-relaxed px-1">{mat.tip}</p>
          )}
        </div>

        {/* 2. Farbe */}
        <div {...colSwipe}>
          <p className="text-xs font-semibold text-gray-500 mb-2">Farbe wählen</p>
          <div className="flex gap-3 flex-wrap">
            {colList.map(c => {
              const id = c.key || String(c.id)
              const avail = c.available !== 0 && c.available !== false
              const reminded = hasReminder('color', id)
              return (
                <button key={id}
                  onClick={() => {
                    if (avail) setSelCol(id)
                    else if (!reminded) addReminder({ type: 'color', itemId: id, label: c.name })
                    else removeReminder('color', id)
                  }}
                  className={`w-12 h-12 rounded-full border-3 transition-all flex items-center justify-center ${
                    !avail ? 'border-dashed border-gray-300 opacity-40' :
                    selCol === id ? 'border-black scale-110 shadow-lg' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                >
                  {avail && selCol === id && <Check size={18} className="text-white drop-shadow" strokeWidth={3} />}
                  {!avail && <Lock size={12} className="text-white/60" />}
                </button>
              )
            })}
          </div>
          {col && <p className="text-[11px] text-gray-500 mt-2 px-1 font-medium">{col.name}</p>}
          {col?.pairs_with && <p className="text-[11px] text-gray-400 px-1">Passt zu: {col.pairs_with}</p>}
        </div>

        {/* 3. Sohle */}
        <div {...soleSwipe}>
          <p className="text-xs font-semibold text-gray-500 mb-2">Sohle wählen</p>

          {soleList.length === 1 && (category === 'BOOT' || category === 'SNEAKER') && (
            <p className="text-[11px] text-gray-400 mb-2">
              {category === 'BOOT' ? 'Boots haben immer die Gummi-Profilsohle.' : 'Sneaker haben immer ihre eigene Sohle.'}
            </p>
          )}

          <div className="space-y-2">
            {soleList.map(s => {
              const id = s.key || String(s.id)
              const sel = selSole === id
              return (
                <button key={id}
                  onClick={() => soleList.length > 1 && setSelSole(id)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all bg-transparent text-left ${
                    sel ? 'border-black' : 'border-gray-100'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${sel ? 'bg-black' : 'bg-gray-100'}`}>
                    <ShieldCheck size={20} className={sel ? 'text-white' : 'text-gray-400'} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800">{s.label}</span>
                      {s.rating && <Dot rating={s.rating} />}
                      {(s.recommended === 1 || s.recommended === true) && soleList.length > 1 && (
                        <span className="text-[10px] font-semibold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">Empfohlen</span>
                      )}
                    </div>
                    {s.description && <p className="text-[11px] text-gray-400 mt-0.5">{s.description}</p>}
                  </div>
                  {s.price_extra > 0 && <span className="text-xs font-semibold text-teal-600">+€{s.price_extra}</span>}
                  {sel && <Check size={16} className="text-black" strokeWidth={2.5} />}
                </button>
              )
            })}
          </div>
          {sole?.rating === 'warn' && soleList.length > 1 && (() => {
            const rec = soleList.find(s => s.recommended === 1 || s.recommended === true)
            if (!rec || (rec.key || String(rec.id)) === selSole) return null
            return (
              <button
                onClick={() => setSelSole(rec.key || String(rec.id))}
                className="mt-2 w-full text-center text-xs font-semibold text-orange-600 bg-orange-50 rounded-xl py-2.5 border-0"
              >
                Lieber die {rec.label}? Besser bei Regen und Schnee.
              </button>
            )
          })()}
        </div>

        {/* Scan-Hinweis */}
        {!latestScan && (
          <button
            onClick={() => navigate('/scan')}
            className="w-full rounded-2xl p-4 border-2 border-dashed border-teal-200 bg-teal-50/50 flex items-center gap-3 text-left border-0-override"
            style={{ borderStyle: 'dashed' }}
          >
            <div className="w-11 h-11 rounded-xl bg-teal-500 flex items-center justify-center flex-shrink-0">
              <ScanLine size={22} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-teal-800">Fuß scannen</p>
              <p className="text-xs text-teal-600">Für die perfekte Größe →</p>
            </div>
          </button>
        )}

        {/* Reviews (kompakt) */}
        <div>
          <button
            onClick={() => setShowReview(v => !v)}
            className="w-full flex items-center justify-between bg-transparent border-0 p-0 mb-2"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500">Bewertungen</span>
              {reviews.length > 0 && (
                <>
                  <Stars value={avg} size={12} />
                  <span className="text-xs text-gray-400">({reviews.length})</span>
                </>
              )}
            </div>
            {showReview ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </button>

          {showReview && (
            <div className="space-y-2">
              {reviews.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-3">Noch keine Bewertungen.</p>
              )}
              {reviews.slice(0, 3).map(rev => (
                <div key={rev.id} className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-700">{rev.user_name}</span>
                    <Stars value={rev.rating} size={10} />
                  </div>
                  {rev.comment && <p className="text-xs text-gray-500 mt-1">{rev.comment}</p>}
                </div>
              ))}

              {!myRev && product.id && (
                <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-medium text-gray-500">Deine Bewertung</p>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(n => (
                      <button key={n} onClick={() => setMyRating(n)} className="bg-transparent border-0 p-0">
                        <Star size={26} className={n <= myRating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'} strokeWidth={1.5} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={myComment} onChange={e => setMyComment(e.target.value)}
                    placeholder="Kommentar (optional)"
                    className="w-full text-xs bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400 resize-none"
                    rows={2} style={{ fontFamily: 'inherit' }}
                  />
                  <button onClick={handleReview} disabled={submitting || !myRating}
                    className="w-full h-9 rounded-lg bg-black text-white text-xs font-semibold border-0 disabled:opacity-30 flex items-center justify-center gap-1.5">
                    <Send size={12} /> Absenden
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Kaufen ─────────────────────────────────────────────── */}
      <div className="bg-white border-t border-gray-100 px-4 pt-3 flex-shrink-0"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)' }}>
        <button
          onClick={handleBuy}
          disabled={added}
          className={`w-full h-14 rounded-2xl flex items-center justify-center gap-2 text-base font-bold transition-all border-0 ${
            added ? 'bg-green-500 text-white' : 'bg-black text-white active:bg-gray-800'
          }`}
        >
          {added
            ? <><Check size={20} /> Bestellt!</>
            : <><ShoppingBag size={20} /> In den Warenkorb</>
          }
        </button>
        <p className="text-center text-[10px] text-gray-300 mt-2">Handgefertigt · Lieferung in 4 Wochen</p>
      </div>
    </div>
  )
}
