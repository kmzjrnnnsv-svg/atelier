import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { isNative } from '../App'
import { ArrowLeft, Heart, ShoppingBag, Check, Star, ChevronDown, ChevronUp, Send, ScanLine, BellRing, Lock, ShieldCheck, Box, ZoomIn, ZoomOut, RotateCcw, Share2, Eye } from 'lucide-react'
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
  const { favorites, toggleFavorite, latestScan, addReminder, hasReminder, removeReminder, shoeMaterials, shoeColors, shoeSoles, addToCart } = useAtelierStore()
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

  // 3D Viewer
  const [is3D, setIs3D] = useState(false)
  const [rotY, setRotY] = useState(0)
  const [zoomed, setZoomed] = useState(false)
  const [imgIdx, setImgIdx] = useState(0)
  const drag = useRef({ on: false, x0: 0, a0: 0 })
  const imgCount = 3 // Platzhalter für Produktbilder-Galerie

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

  // Preis: Basispreis aus DB + Sohle-Aufpreis
  const basePrice = parseFloat(String(product.price).replace(/[^0-9.,]/g, '').replace('.', '').replace(',', '.')) || 0
  const soleExtra = sole?.price_extra || 0
  const totalPrice = basePrice + soleExtra
  const formatPrice = (v) => `€ ${v.toLocaleString('de-DE', { minimumFractionDigits: 0 })}`
  const displayPrice = formatPrice(totalPrice)

  // Swipe
  const matSwipe  = useSwipe(matList, selMat, setSelMat)
  const colSwipe  = useSwipe(colList, selCol, setSelCol)
  const soleSwipe = useSwipe(soleList, selSole, setSelSole)

  // Reviews laden
  useEffect(() => {
    if (!product.id) return
    apiFetch(`/api/reviews/shoe/${product.id}`).then(setReviews).catch(() => {})
  }, [product.id])

  // 3D drag
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

  const handleAddToCart = () => {
    addToCart({
      shoeId: product.id, name: product.name,
      material: mat?.label || product.material,
      color, price: displayPrice,
      sole: sole?.label || 'Sohle',
      image: product.image,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const handleBuyNow = () => {
    navigate('/checkout', {
      state: {
        product: {
          id: product.id, name: product.name,
          material: mat?.label || product.material,
          color, price: displayPrice,
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
    <div className="flex flex-col h-full bg-white overflow-y-auto lg:overflow-hidden">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white flex items-center justify-between px-4 pt-3 pb-1 lg:px-8 lg:max-w-7xl lg:mx-auto lg:w-full">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center border-0 bg-transparent">
          <ArrowLeft size={18} className="text-black" strokeWidth={1.5} />
        </button>
        <div className="text-center flex-1 px-2">
          <p className="text-[11px] lg:text-[13px] font-normal text-black" style={{ letterSpacing: '0.18em', textTransform: 'uppercase' }}>{product.name}</p>
        </div>
        <div className="flex items-center gap-1">
          <button className="w-10 h-10 flex items-center justify-center border-0 bg-transparent">
            <Share2 size={17} className="text-black" strokeWidth={1.5} />
          </button>
          <button
            onClick={() => toggleFavorite(product.id)}
            className="w-10 h-10 flex items-center justify-center border-0 bg-transparent"
          >
            <Heart size={17} className={isFav ? 'text-black fill-black' : 'text-black'} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* ── Desktop: Two-Column / Mobile: Stacked ────────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row lg:max-w-7xl lg:mx-auto lg:w-full lg:gap-12 lg:px-8 lg:pt-4 lg:min-h-0">

        {/* ── LEFT: Produkt-Viewer (fest auf Desktop) ─────────────── */}
        <div className="z-10 lg:w-1/2 lg:top-0 lg:self-stretch lg:overflow-hidden">
          <div
            className="relative overflow-hidden select-none lg:rounded-sm lg:h-full"
            style={{
              height: 'clamp(240px, 40dvh, 380px)',
              cursor: is3D ? 'grab' : 'default',
              background: '#f6f5f3',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                transform: is3D
                  ? `perspective(800px) rotateY(${rotY}deg)`
                  : zoomed ? 'scale(1.6)' : 'none',
                transition: drag.current.on ? 'none' : 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              {product.image ? (
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <svg viewBox="0 0 260 130" className="w-64 lg:w-80">
                  <ellipse cx="130" cy="120" rx="100" ry="8" fill="#00000008" />
                  <path d="M20 100 Q17 108 38 112 L222 112 Q238 112 238 100 L232 80 Q226 62 210 60 L72 60 Q47 60 42 68 Z" fill={color} />
                  <path d="M42 68 Q37 48 62 36 L120 30 Q155 27 178 42 Q198 54 232 80 L210 60 Q180 50 148 52 L90 53 Q60 55 42 68 Z" fill={color} opacity="0.88" />
                  <path d="M42 68 Q36 55 53 44 Q68 34 87 34 L87 53 Q63 55 42 68 Z" fill={color} />
                  <path d="M87 53 L210 60 Q210 50 178 42 Q155 27 120 30 L87 34 Z" fill="white" opacity="0.1" />
                  <path d="M90 38 Q115 30 148 31 Q175 31 198 44" stroke="white" strokeWidth="1" fill="none" opacity="0.12" />
                </svg>
              )}
            </div>

            {/* Steuerungs-Icons links unten */}
            <div className="absolute left-4 bottom-4 flex items-center gap-2">
              <button
                onClick={() => { setIs3D(v => !v); setRotY(0); setZoomed(false) }}
                className={`w-8 h-8 flex items-center justify-center border transition-all ${
                  is3D ? 'bg-black text-white border-black' : 'bg-white/90 text-black border-black/10'
                }`}
              >
                <Box size={14} strokeWidth={1.5} />
              </button>
              <button
                onClick={() => { setZoomed(v => !v); setIs3D(false) }}
                className={`w-8 h-8 flex items-center justify-center border transition-all ${
                  zoomed ? 'bg-black text-white border-black' : 'bg-white/90 text-black border-black/10'
                }`}
              >
                {zoomed ? <ZoomOut size={14} strokeWidth={1.5} /> : <ZoomIn size={14} strokeWidth={1.5} />}
              </button>
              <button className="w-8 h-8 bg-white/90 text-black border border-black/10 flex items-center justify-center transition-all">
                <Eye size={14} strokeWidth={1.5} />
              </button>
            </div>

            {/* 3D-Hinweis */}
            {is3D && (
              <div className="absolute top-4 left-0 right-0 flex justify-center pointer-events-none">
                <span className="text-[10px] text-black/40" style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                  Ziehen zum Drehen
                </span>
              </div>
            )}

            {/* Pagination Dots */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
              {Array.from({ length: imgCount }).map((_, i) => (
                <div key={i} className={`rounded-full transition-all ${i === imgIdx ? 'w-5 h-1.5 bg-black' : 'w-1.5 h-1.5 bg-black/20'}`} />
              ))}
            </div>

            {/* Swipe-Hinweis (nur mobil) */}
            <div className="absolute bottom-10 left-0 right-0 flex justify-center pointer-events-none lg:hidden">
              <span className="text-[9px] text-black/25" style={{ letterSpacing: '0.2em' }}>
                ← WISCHEN ZUM WECHSELN →
              </span>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Konfiguration (scrollbar auf Desktop) ─────── */}
        <div className="flex-1 flex flex-col lg:max-w-md lg:overflow-y-auto lg:min-h-0" style={{ scrollbarWidth: 'none' }}>

          {/* ── Produkt-Info ─────────────────────────────────────── */}
          <div className="px-5 pt-4 pb-2 lg:px-0 lg:pt-0">
            <p className="text-[13px] lg:text-[22px] font-light text-black leading-tight">{product.name}</p>
            <p className="text-[13px] lg:text-[17px] text-black mt-0.5 lg:mt-2" style={{ letterSpacing: '0.04em' }}>
              {displayPrice}
              {soleExtra > 0 && <span className="text-[10px] text-black/35 ml-2">(+€{soleExtra} Sohle)</span>}
            </p>
            <div className="flex items-center gap-4 mt-2 lg:mt-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] lg:text-[11px] text-black/40" style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}>Passgenauigkeit</span>
                <span className="text-[11px] lg:text-[12px] font-medium text-black">{product.match || '98.4%'}</span>
              </div>
              {latestScan && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] lg:text-[11px] text-black/40" style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}>Größe</span>
                  <span className="text-[11px] lg:text-[12px] font-medium text-black">EU {latestScan.eu_size}</span>
                </div>
              )}
            </div>
          </div>

          <div className="h-px bg-black/8 lg:my-4" />

          {/* ── Produktbeschreibung ────────────────────────────── */}
          <div className="px-5 py-4 lg:px-0 lg:py-2">
            <p className="text-[11px] lg:text-[12px] text-black/50 leading-[1.8]" style={{ letterSpacing: '0.02em' }}>
              {product.description || (
                <>
                  Jeder <span className="text-black/70">{product.name || 'Schuh'}</span> wird in unserer Manufaktur von Hand gefertigt — mit über 200 präzisen Arbeitsschritten.
                  Dank unserer <span className="text-black/70">3D-Fußvermessung</span> wird jedes Paar exakt auf Ihre Fußform zugeschnitten.
                  Ausgesuchtes europäisches Leder, durchgenähte Konstruktion und eine ergonomische Passform, die Sie vom ersten Schritt an spüren.
                </>
              )}
            </p>
            <div className="flex items-center gap-4 mt-3">
              <span className="text-[9px] text-black/30" style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}>Handgenäht</span>
              <span className="text-black/10">·</span>
              <span className="text-[9px] text-black/30" style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}>Maßgefertigt</span>
              <span className="text-black/10">·</span>
              <span className="text-[9px] text-black/30" style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}>200+ Schritte</span>
            </div>
          </div>

          <div className="h-px bg-black/8 lg:my-2" />

          {/* ── Auswahl ────────────────────────────────────────── */}
          <div className="pt-4 pb-4 space-y-5 lg:space-y-6 lg:pt-0 lg:pb-0">

            {/* 1. Leder */}
            <div {...matSwipe}>
              <p className="text-[10px] lg:text-[11px] text-black/40 mb-3 px-5 lg:px-0" style={{ letterSpacing: '0.18em', textTransform: 'uppercase' }}>Leder</p>
              <div className="flex gap-2 overflow-x-auto flex-nowrap lg:flex-wrap" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                {matList.map((m, i) => {
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
                      className={`w-20 flex-shrink-0 lg:flex-shrink py-2 transition-all bg-transparent flex flex-col items-center gap-1.5 border ${
                        !avail ? 'border-black/5 opacity-40' : selMat === id ? 'border-black' : 'border-black/8'
                      }${i === 0 ? ' ml-5 lg:ml-0' : ''}${i === matList.length - 1 ? ' mr-5 lg:mr-0' : ''}`}
                    >
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full"
                          style={{ background: m.color }} />
                        {!avail && <Lock size={10} className="absolute inset-0 m-auto text-white/80" />}
                        {!avail && reminded && <BellRing size={10} className="absolute inset-0 m-auto text-teal-500" />}
                      </div>
                      <span className="text-[10px] text-black/70" style={{ letterSpacing: '0.05em' }}>{m.label}</span>
                      {!avail && <span className="text-[9px] text-black/30">{reminded ? 'Erinnert' : 'Bald da'}</span>}
                    </button>
                  )
                })}
              </div>
              {mat?.tip && (
                <p className="text-[10px] text-black/35 mt-2 leading-relaxed px-5 lg:px-0">{mat.tip}</p>
              )}
            </div>

            {/* 2. Farbe */}
            <div {...colSwipe}>
              <div className="flex items-center justify-between mb-3 px-5 lg:px-0">
                <p className="text-[10px] lg:text-[11px] text-black/40" style={{ letterSpacing: '0.18em', textTransform: 'uppercase' }}>Farbe</p>
                {col && <span className="text-[10px] lg:text-[11px] text-black/50">{col.name}</span>}
              </div>
              <div className="flex gap-2 overflow-x-auto flex-nowrap lg:flex-wrap" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                {colList.map((c, i) => {
                  const id = c.key || String(c.id)
                  const avail = c.available !== 0 && c.available !== false
                  const reminded = hasReminder('color', id)
                  const sel = avail && selCol === id
                  return (
                    <div key={id}
                      className={`flex-shrink-0 w-12 h-12 flex items-center justify-center border-2 transition-all ${
                        sel ? 'border-black' : 'border-transparent'
                      }${i === 0 ? ' ml-5 lg:ml-0' : ''}${i === colList.length - 1 ? ' mr-5 lg:mr-0' : ''}`}
                    >
                      <button
                        onClick={() => {
                          if (avail) setSelCol(id)
                          else if (!reminded) addReminder({ type: 'color', itemId: id, label: c.name })
                          else removeReminder('color', id)
                        }}
                        className={`w-9 h-9 rounded-full transition-all flex items-center justify-center border-0 ${
                          !avail ? 'opacity-30' : ''
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      >
                        {sel && <Check size={14} className="text-white drop-shadow" strokeWidth={2.5} />}
                        {!avail && <Lock size={10} className="text-white/60" />}
                      </button>
                    </div>
                  )
                })}
              </div>
              {col?.pairs_with && <p className="text-[10px] text-black/35 mt-2 px-5 lg:px-0">Passt zu: {col.pairs_with}</p>}
            </div>

            {/* 3. Sohle */}
            <div {...soleSwipe}>
              <p className="text-[10px] lg:text-[11px] text-black/40 mb-3 px-5 lg:px-0" style={{ letterSpacing: '0.18em', textTransform: 'uppercase' }}>Sohle</p>

              {soleList.length === 1 && (category === 'BOOT' || category === 'SNEAKER') && (
                <p className="text-[10px] text-black/35 mb-2 px-5 lg:px-0">
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
                      className={`w-full flex items-center gap-3 p-3.5 transition-all bg-transparent text-left border-y lg:border lg:rounded-sm ${
                        sel ? 'border-black' : 'border-black/8'
                      }`}
                    >
                      <div className={`w-10 h-10 flex items-center justify-center flex-shrink-0 ${sel ? 'bg-black' : 'bg-black/5'}`}>
                        <ShieldCheck size={18} className={sel ? 'text-white' : 'text-black/30'} strokeWidth={1.5} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-black" style={{ letterSpacing: '0.03em' }}>{s.label}</span>
                          {s.rating && <Dot rating={s.rating} />}
                          {(s.recommended === 1 || s.recommended === true) && soleList.length > 1 && (
                            <span className="text-[9px] text-black/40 border border-black/15 px-1.5 py-0.5" style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}>Empfohlen</span>
                          )}
                        </div>
                        {s.description && <p className="text-[10px] text-black/35 mt-0.5">{s.description}</p>}
                      </div>
                      {s.price_extra > 0 && <span className="text-[10px] text-black/50">+€{s.price_extra}</span>}
                      {sel && <Check size={14} className="text-black" strokeWidth={2} />}
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
                    className="mt-2 w-full text-center text-[10px] text-black/50 border border-black/10 py-2 bg-transparent"
                    style={{ letterSpacing: '0.05em' }}
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
                className="w-full p-4 border-y lg:border lg:rounded-sm border-dashed border-black/15 bg-transparent flex items-center gap-3 text-left"
              >
                <div className="w-10 h-10 bg-black flex items-center justify-center flex-shrink-0">
                  <ScanLine size={18} className="text-white" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[11px] text-black" style={{ letterSpacing: '0.05em' }}>Fuß scannen</p>
                  <p className="text-[10px] text-black/35">Für die perfekte Größe</p>
                </div>
              </button>
            )}

            {/* Reviews (kompakt) */}
            <div className="px-5 lg:px-0">
              <button
                onClick={() => setShowReview(v => !v)}
                className="w-full flex items-center justify-between bg-transparent border-0 p-0 pb-2 border-b border-black/8"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] lg:text-[11px] text-black/40" style={{ letterSpacing: '0.18em', textTransform: 'uppercase' }}>Bewertungen</span>
                  {reviews.length > 0 && (
                    <>
                      <Stars value={avg} size={10} />
                      <span className="text-[10px] text-black/30">({reviews.length})</span>
                    </>
                  )}
                </div>
                {showReview ? <ChevronUp size={14} className="text-black/30" /> : <ChevronDown size={14} className="text-black/30" />}
              </button>

              {showReview && (
                <div className="space-y-2 mt-3">
                  {reviews.length === 0 && (
                    <p className="text-[10px] text-black/30 text-center py-3">Noch keine Bewertungen.</p>
                  )}
                  {reviews.slice(0, 3).map(rev => (
                    <div key={rev.id} className="border-b border-black/5 pb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-black/60">{rev.user_name}</span>
                        <Stars value={rev.rating} size={9} />
                      </div>
                      {rev.comment && <p className="text-[10px] text-black/40 mt-1">{rev.comment}</p>}
                    </div>
                  ))}

                  {!myRev && product.id && (
                    <div className="pt-2 space-y-2">
                      <p className="text-[10px] text-black/40" style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>Deine Bewertung</p>
                      <div className="flex gap-1">
                        {[1,2,3,4,5].map(n => (
                          <button key={n} onClick={() => setMyRating(n)} className="bg-transparent border-0 p-0">
                            <Star size={22} className={n <= myRating ? 'text-black fill-black' : 'text-black/15'} strokeWidth={1} />
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={myComment} onChange={e => setMyComment(e.target.value)}
                        placeholder="Kommentar (optional)"
                        className="w-full text-[11px] bg-transparent border border-black/10 px-3 py-2 outline-none focus:border-black/30 resize-none"
                        rows={2} style={{ fontFamily: 'inherit' }}
                      />
                      <button onClick={handleReview} disabled={submitting || !myRating}
                        className="w-full h-9 bg-black text-white text-[10px] border-0 disabled:opacity-20 flex items-center justify-center gap-1.5"
                        style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                        <Send size={11} /> Absenden
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Desktop: Buttons inline */}
            <div className="hidden lg:block lg:pt-4 lg:pb-8">
              <p className="text-[15px] font-medium text-black mb-3" style={{ letterSpacing: '0.04em' }}>
                {displayPrice}
                {soleExtra > 0 && <span className="text-[11px] text-black/35 ml-2">(+€{soleExtra} Sohle)</span>}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={added}
                  className={`flex-1 h-14 flex items-center justify-center gap-2.5 transition-all border ${
                    added ? 'bg-black/5 text-black border-black/20' : 'bg-white text-black border-black/20 hover:bg-black/5 active:bg-black/10'
                  }`}
                  style={{ letterSpacing: '0.18em', textTransform: 'uppercase', fontSize: '12px', borderRadius: 0 }}
                >
                  {added
                    ? <><Check size={16} strokeWidth={1.5} /> Hinzugefügt</>
                    : <><ShoppingBag size={16} strokeWidth={1.5} /> Warenkorb</>
                  }
                </button>
                <button
                  onClick={handleBuyNow}
                  className="flex-1 h-14 flex items-center justify-center gap-2.5 bg-black text-white border-0 hover:bg-black/90 active:bg-black/85"
                  style={{ letterSpacing: '0.18em', textTransform: 'uppercase', fontSize: '12px', borderRadius: 0 }}
                >
                  Jetzt kaufen
                </button>
              </div>
              <p className="text-center text-[10px] text-black/25 mt-3" style={{ letterSpacing: '0.12em' }}>Handgefertigt · Kostenlose Lieferung</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Kaufen: Fixed Bottom (nur mobil) ──────────────────── */}
      <div className="sticky bottom-0 z-20 bg-white border-t border-black/5 flex-shrink-0 lg:hidden px-4 pt-2"
        style={{ paddingBottom: isNative ? 'max(env(safe-area-inset-bottom, 0px), 8px)' : '8px' }}>
        <p className="text-center text-[12px] font-medium text-black mb-1.5" style={{ letterSpacing: '0.04em' }}>{displayPrice}</p>
        <div className="flex gap-2">
          <button
            onClick={handleAddToCart}
            disabled={added}
            className={`flex-1 h-12 flex items-center justify-center gap-2 transition-all border ${
              added ? 'bg-black/5 text-black border-black/20' : 'bg-white text-black border-black/20 active:bg-black/5'
            }`}
            style={{ letterSpacing: '0.14em', textTransform: 'uppercase', fontSize: '10px', borderRadius: 0 }}
          >
            {added
              ? <><Check size={14} strokeWidth={1.5} /> Hinzugefügt</>
              : <><ShoppingBag size={14} strokeWidth={1.5} /> Warenkorb</>
            }
          </button>
          <button
            onClick={handleBuyNow}
            className="flex-1 h-12 flex items-center justify-center gap-2 bg-black text-white border-0 active:bg-black/85"
            style={{ letterSpacing: '0.14em', textTransform: 'uppercase', fontSize: '10px', borderRadius: 0 }}
          >
            Jetzt kaufen
          </button>
        </div>
        <p className="text-center text-[9px] text-black/25 mt-2 pb-1" style={{ letterSpacing: '0.12em' }}>Handgefertigt · Kostenlose Lieferung</p>
      </div>
    </div>
  )
}
