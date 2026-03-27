import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { isNative } from '../App'
import { ArrowLeft, Heart, ShoppingBag, Check, Star, ChevronDown, ChevronUp, Send, ScanLine, BellRing, Lock, ShieldCheck, Box, ZoomIn, ZoomOut, RotateCcw, Share2, Eye, Plus } from 'lucide-react'
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
  const { favorites, toggleFavorite, latestScan, addReminder, hasReminder, removeReminder, shoeMaterials, shoeColors, shoeSoles, addToCart, cart, shoeAccessoryMap } = useAtelierStore()
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

  const [selMat,  setSelMat]  = useState('')
  const [selCol,  setSelCol]  = useState('')
  const [selSole, setSelSole] = useState('')
  const [added,   setAdded]   = useState(false)

  // Step-by-step guided flow: 0=nothing, 1=leather chosen, 2=color chosen, 3=sole chosen
  const configStep = selSole ? 3 : selCol ? 2 : selMat ? 1 : 0

  // Refs for scroll forwarding between panels
  const outerRef = useRef(null)
  const rightPanelRef = useRef(null)
  const leftPanelRef = useRef(null)
  const [rightFullyScrolled, setRightFullyScrolled] = useState(false)
  const [selectedAccessories, setSelectedAccessories] = useState([])
  const [duplicateDialog, setDuplicateDialog] = useState(false)
  const [duplicateBanner, setDuplicateBanner] = useState(false)

  const [directAccessories, setDirectAccessories] = useState([])
  const storeAcc = shoeAccessoryMap[product.id] || []

  // Fallback: fetch shoe-specific accessories directly if store is empty
  useEffect(() => {
    if (product.id && storeAcc.length === 0) {
      apiFetch(`/api/shoes/${product.id}/accessories`)
        .then(data => setDirectAccessories(Array.isArray(data) ? data : []))
        .catch(() => setDirectAccessories([]))
    }
  }, [product.id, storeAcc.length])

  const rawAcc = storeAcc.length > 0 ? storeAcc : directAccessories
  const accessories = rawAcc.map(a => ({
    id: a.id,
    name: a.name,
    price: parseFloat(a.price) || 0,
    image: a.image_data || null,
    color: a.color || '#888',
  }))

  const toggleAccessory = (id) => {
    setSelectedAccessories(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    )
  }

  // Sequenced scroll: right panel first (down), left panel first (up)
  const twoColRef = useRef(null)
  const [leftFullyScrolled, setLeftFullyScrolled] = useState(false)

  // On desktop: lock parent scroll container so panels scroll independently
  useEffect(() => {
    if (window.innerWidth < 1024) return
    // Lock the App-level scroller and all ancestors in the chain
    let el = outerRef.current?.parentElement
    while (el) {
      const style = getComputedStyle(el)
      if (style.overflow === 'auto' || style.overflowY === 'auto') {
        el.style.overflow = 'hidden'
        const lockedEl = el
        // Also make the intermediate wrapper fill height
        if (outerRef.current?.parentElement && outerRef.current.parentElement !== el) {
          outerRef.current.parentElement.style.height = '100%'
        }
        return () => { lockedEl.style.overflow = '' }
      }
      el = el.parentElement
    }
  }, [])

  // Sequenced scroll handler — captures wheel/touch anywhere on the page
  useEffect(() => {
    if (window.innerWidth < 1024) return
    const wrapper = outerRef.current
    if (!wrapper) return

    // Helper: route a vertical delta to the correct panel
    const routeScroll = (deltaY) => {
      const rp = rightPanelRef.current
      const lp = leftPanelRef.current
      if (!rp || !lp) return false

      const rpAtBottom = rp.scrollHeight - rp.scrollTop - rp.clientHeight < 2
      const rpAtTop = rp.scrollTop <= 0
      const lpAtTop = lp.scrollTop <= 0
      const lpAtBottom = lp.scrollHeight - lp.scrollTop - lp.clientHeight < 2

      if (deltaY > 0) {
        // DOWN: right first, then left
        if (!rpAtBottom) { rp.scrollTop += deltaY; return true }
        if (!lpAtBottom) { lp.scrollTop += deltaY; return true }
      } else {
        // UP: left first, then right
        if (!lpAtTop) { lp.scrollTop += deltaY; return true }
        if (!rpAtTop) { rp.scrollTop += deltaY; return true }
      }
      return false // both panels at boundary
    }

    // ── Wheel (MacBook trackpad / mouse) — always prevent default on desktop ──
    const onWheel = (e) => {
      e.preventDefault()
      routeScroll(e.deltaY)
    }

    // ── Touch (iPad) ──
    let touchY0 = 0
    let touchActive = false
    const onTouchStart = (e) => {
      touchY0 = e.touches[0].clientY
      touchActive = true
    }
    const onTouchMove = (e) => {
      if (!touchActive) return
      const y = e.touches[0].clientY
      const deltaY = touchY0 - y  // positive = finger moves up = scroll down
      touchY0 = y
      if (routeScroll(deltaY)) e.preventDefault()
    }
    const onTouchEnd = () => { touchActive = false }

    // Use capture phase so we intercept before child panels scroll natively
    wrapper.addEventListener('wheel', onWheel, { passive: false, capture: true })
    wrapper.addEventListener('touchstart', onTouchStart, { passive: true, capture: true })
    wrapper.addEventListener('touchmove', onTouchMove, { passive: false, capture: true })
    wrapper.addEventListener('touchend', onTouchEnd, { passive: true, capture: true })
    return () => {
      wrapper.removeEventListener('wheel', onWheel, { capture: true })
      wrapper.removeEventListener('touchstart', onTouchStart, { capture: true })
      wrapper.removeEventListener('touchmove', onTouchMove, { capture: true })
      wrapper.removeEventListener('touchend', onTouchEnd, { capture: true })
    }
  }, [])

  // Track right panel scroll position for accessories opacity
  useEffect(() => {
    const rp = rightPanelRef.current
    if (!rp) return
    const onScroll = () => {
      const atBottom = rp.scrollHeight - rp.scrollTop - rp.clientHeight < 2
      setRightFullyScrolled(atBottom)
    }
    onScroll()
    rp.addEventListener('scroll', onScroll, { passive: true })
    return () => rp.removeEventListener('scroll', onScroll)
  }, [])

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

  // Store-Daten aktualisieren (only reset if current value is invalid, not if empty)
  useEffect(() => {
    if (shoeMaterials.length && selMat && !shoeMaterials.find(m => m.key === selMat)) setSelMat('')
  }, [shoeMaterials])
  useEffect(() => {
    if (shoeColors.length && selCol && !shoeColors.find(c => c.key === selCol)) setSelCol('')
  }, [shoeColors])
  useEffect(() => {
    if (availableSoles.length && selSole && !availableSoles.find(s => s.key === selSole)) setSelSole('')
  }, [shoeSoles, category])

  const mat      = matList.find(m => m.key === selMat) || matList[0]
  const col      = colList.find(c => c.key === selCol) || colList[0]
  const sole     = soleList.find(s => s.key === selSole) || soleList[0]
  const color    = col?.hex || product.color
  const isFav    = favorites.includes(String(product.id))
  const avg      = reviews.length ? reviews.reduce((s,r) => s + r.rating, 0) / reviews.length : 0
  const myRev    = reviews.find(r => r.user_id === user?.id)

  // Preis: Basispreis aus DB + Sohle-Aufpreis + Zubehör
  const isPromo = !!user?.is_promotion
  const effectivePrice = isPromo && product.promotion_price ? product.promotion_price : product.price
  const basePrice = parseFloat(String(effectivePrice).replace(/[^0-9.,]/g, '').replace('.', '').replace(',', '.')) || 0
  const soleExtra = sole?.price_extra || 0
  const accessoryTotal = selectedAccessories.reduce((sum, id) => {
    const acc = accessories.find(a => a.id === id)
    return sum + (acc?.price || 0)
  }, 0)
  const totalPrice = basePrice + soleExtra + accessoryTotal
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

  const addAccessoriesToCart = () => {
    selectedAccessories.forEach(id => {
      const acc = accessories.find(a => a.id === id)
      if (acc) {
        addToCart({
          shoeId: `acc-${acc.id}`,
          name: acc.name,
          material: '',
          color: acc.color,
          price: formatPrice(acc.price),
          sole: '',
          image: null,
          isAccessory: true,
        })
      }
    })
  }

  const addShoeToCart = () => {
    addToCart({
      shoeId: product.id, name: product.name,
      material: mat?.label || product.material,
      color, price: formatPrice(basePrice + soleExtra),
      sole: sole?.label || 'Sohle',
      image: product.image,
    })
  }

  const handleAddToCart = () => {
    // Prüfe ob derselbe Schuh in gleicher Konfiguration bereits im Warenkorb liegt
    const sameConfig = cart.find(c =>
      !c.isAccessory &&
      c.shoeId === product.id &&
      c.material === (mat?.label || product.material) &&
      c.color === color &&
      c.sole === (sole?.label || 'Sohle')
    )

    if (sameConfig && selectedAccessories.length > 0) {
      // Gleiche Konfiguration + Zubehör ausgewählt → Modal
      setDuplicateDialog(true)
      return
    }

    if (sameConfig) {
      // Gleiche Konfiguration ohne Zubehör → Banner anzeigen
      setDuplicateBanner(true)
      return
    }

    // Neue Konfiguration → normal hinzufügen
    addShoeToCart()
    addAccessoriesToCart()
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const handleDuplicateChoice = (includeShoe) => {
    if (includeShoe) addShoeToCart()
    addAccessoriesToCart()
    setDuplicateDialog(false)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const handleBannerConfirm = () => {
    addShoeToCart()
    setDuplicateBanner(false)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const handleBuyNow = () => {
    const cartAccessories = selectedAccessories.map(id => {
      const acc = accessories.find(a => a.id === id)
      return acc ? { id: acc.id, name: acc.name, price: acc.price, color: acc.color } : null
    }).filter(Boolean)

    navigate('/checkout', {
      state: {
        product: {
          id: product.id, name: product.name,
          material: mat?.label || product.material,
          color, price: formatPrice(basePrice + soleExtra),
          sole: sole?.label || 'Sohle',
        },
        accessories: cartAccessories,
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
    <div className="flex flex-col bg-white overflow-y-auto lg:overflow-hidden lg:h-full" ref={outerRef}>

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white flex items-center justify-between px-4 pt-3 pb-1 lg:px-6 lg:w-full">
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
      <div ref={twoColRef} className="flex-1 flex flex-col lg:flex-row lg:w-full lg:min-h-0">

        {/* ── LEFT: Produkt-Viewer + Zubehör (4/6 der Breite) ────── */}
        <div
          ref={leftPanelRef}
          className="z-10 lg:w-4/6 lg:top-0 lg:self-stretch lg:min-h-0 lg:overflow-y-auto lg:px-6"
          style={{
            scrollbarWidth: 'none',
          }}
        >
          <div
            className="relative overflow-hidden select-none lg:rounded-sm lg:min-h-[500px]"
            style={{
              height: 'clamp(240px, 40dvh, 380px)',
              minHeight: '380px',
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

          {/* ── Lieferumfang (nur Desktop) ──────────────────────── */}
          <div className="hidden lg:block pt-6 px-1">
            <p className="text-[10px] text-black/30 uppercase mb-3" style={{ letterSpacing: '0.18em' }}>Lieferumfang</p>
            <div className="flex flex-col gap-1.5">
              {[
                'Handgefertigte Schuhe',
                'Schuhbeutel aus Baumwolle',
                'Schuhspanner aus Zedernholz',
                'Pflegeanleitung',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-black/15" />
                  <span className="text-[11px] text-black/40">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Zubehör (nur Desktop, Apple-style 2x2) ────────── */}
          <div
            className="hidden lg:block pt-10 pb-16"
            style={{
              opacity: rightFullyScrolled ? 1 : 0.3,
              transition: 'opacity 0.5s ease',
            }}
          >
            <p className="text-[10px] text-black/30 uppercase px-1 mb-4" style={{ letterSpacing: '0.18em' }}>Passend dazu</p>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {accessories.map((acc) => {
                const selected = selectedAccessories.includes(acc.id)
                return (
                  <button
                    key={acc.id}
                    onClick={() => toggleAccessory(acc.id)}
                    className="relative text-left group"
                  >
                    {/* Product image area */}
                    <div
                      className="w-full rounded-sm overflow-hidden flex items-center justify-center"
                      style={{
                        aspectRatio: '1',
                        background: '#f6f5f3',
                        border: selected ? '1.5px solid black' : '1.5px solid transparent',
                      }}
                    >
                      <div
                        className="w-12 h-12 rounded-lg transition-transform group-hover:scale-110"
                        style={{ background: acc.color, opacity: 0.7 }}
                      />
                      {/* Toggle badge */}
                      <div
                        className="absolute top-2 right-2 w-6 h-6 rounded-md flex items-center justify-center transition-all"
                        style={{
                          background: selected ? 'black' : 'white',
                          border: selected ? '1.5px solid black' : '1.5px solid rgba(0,0,0,0.12)',
                        }}
                      >
                        {selected
                          ? <Check size={11} className="text-white" strokeWidth={2.5} />
                          : <Plus size={11} className="text-black/30" strokeWidth={2} />
                        }
                      </div>
                    </div>

                    {/* Info below */}
                    <p className="text-[12px] text-black/70 font-light mt-2 px-0.5">{acc.name}</p>
                    <p className="text-[11px] text-black/35 px-0.5">€{acc.price}</p>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Konfiguration (2/6 der Breite, rechter Rand) ── */}
        <div
          ref={rightPanelRef}
          className="flex-1 flex flex-col lg:flex-initial lg:w-2/6 lg:overflow-y-auto lg:min-h-0 lg:border-l lg:border-black/5 lg:px-6"
          style={{ scrollbarWidth: 'none' }}
        >

          {/* ── Produkt-Info ─────────────────────────────────────── */}
          <div className="px-5 pt-4 pb-2 lg:px-0 lg:pt-0">
            <p className="text-[13px] lg:text-[22px] font-light text-black leading-tight">{product.name}</p>
            <p className="text-[13px] lg:text-[17px] text-black mt-0.5 lg:mt-2" style={{ letterSpacing: '0.04em' }}>
              {displayPrice}
              {(soleExtra > 0 || accessoryTotal > 0) && (
                <span className="text-[10px] text-black/35 ml-2">
                  ({[soleExtra > 0 && `+€${soleExtra} Sohle`, accessoryTotal > 0 && `+€${accessoryTotal} Zubehör`].filter(Boolean).join(' · ')})
                </span>
              )}
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

          {/* ── Auswahl (step-by-step guided flow) ────────────── */}
          <div className="pt-4 pb-4 space-y-5 lg:space-y-6 lg:pt-0 lg:pb-0">

            {/* Step indicator */}
            <div className="flex items-center gap-0 px-5 lg:px-0">
              {['Leder', 'Farbe', 'Sohle'].map((label, i) => {
                const done = configStep > i
                const active = configStep === i
                return (
                  <div key={label} className="flex items-center flex-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 flex items-center justify-center text-[10px] font-light transition-all duration-500"
                        style={{
                          background: done ? '#000' : active ? '#000' : '#f6f5f3',
                          color: done || active ? '#fff' : 'rgba(0,0,0,0.2)',
                        }}
                      >
                        {done ? <Check size={12} strokeWidth={2} /> : i + 1}
                      </div>
                      <span className={`text-[10px] tracking-[0.1em] uppercase transition-colors duration-500 ${
                        done || active ? 'text-black' : 'text-black/20'
                      }`}>{label}</span>
                    </div>
                    {i < 2 && (
                      <div className="flex-1 mx-3">
                        <div className="h-px bg-black/[0.06] relative">
                          <div
                            className="absolute inset-y-0 left-0 bg-black transition-all duration-700"
                            style={{ width: done ? '100%' : '0%' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* 1. Leder */}
            <div {...matSwipe}>
              <p className="text-[10px] lg:text-[11px] text-black/40 mb-3 px-5 lg:px-0" style={{ letterSpacing: '0.18em', textTransform: 'uppercase' }}>Leder wählen</p>
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
                        <div className="w-10 h-10 rounded-lg"
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
            <div
              {...(configStep >= 1 ? colSwipe : {})}
              className="transition-all duration-700 ease-out"
              style={{
                opacity: configStep >= 1 ? 1 : 0.25,
                transform: configStep >= 1 ? 'translateY(0)' : 'translateY(8px)',
                pointerEvents: configStep >= 1 ? 'auto' : 'none',
                filter: configStep >= 1 ? 'none' : 'grayscale(1)',
              }}
            >
              <div className="flex items-center justify-between mb-3 px-5 lg:px-0">
                <p className="text-[10px] lg:text-[11px] text-black/40" style={{ letterSpacing: '0.18em', textTransform: 'uppercase' }}>Farbe wählen</p>
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
                        className={`w-9 h-9 rounded-lg transition-all flex items-center justify-center border-0 ${
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
            <div
              {...(configStep >= 2 ? soleSwipe : {})}
              className="transition-all duration-700 ease-out"
              style={{
                opacity: configStep >= 2 ? 1 : 0.25,
                transform: configStep >= 2 ? 'translateY(0)' : 'translateY(8px)',
                pointerEvents: configStep >= 2 ? 'auto' : 'none',
                filter: configStep >= 2 ? 'none' : 'grayscale(1)',
              }}
            >
              <p className="text-[10px] lg:text-[11px] text-black/40 mb-3 px-5 lg:px-0" style={{ letterSpacing: '0.18em', textTransform: 'uppercase' }}>Sohle wählen</p>

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
                      onClick={() => setSelSole(id)}
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

            {/* ── Remaining sections (visible after all steps) ── */}

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

            {/* Desktop: Konfig-Zusammenfassung + Buttons */}
            <div
              className="hidden lg:block lg:pt-4 lg:pb-8 transition-all duration-700"
              style={{
                opacity: configStep >= 3 ? 1 : 0.15,
                transform: configStep >= 3 ? 'translateY(0)' : 'translateY(8px)',
                pointerEvents: configStep >= 3 ? 'auto' : 'none',
              }}
            >
              <div className="border border-black/8 p-4 mb-4">
                <p className="text-[10px] text-black/40 mb-2.5" style={{ letterSpacing: '0.18em', textTransform: 'uppercase' }}>Ihre Konfiguration</p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-black/50">Leder</span>
                    <span className="text-[11px] text-black">{mat?.label}{mat?.sub ? ` · ${mat.sub}` : ''}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-black/50">Farbe</span>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: color }} />
                      <span className="text-[11px] text-black">{col?.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-black/50">Sohle</span>
                    <span className="text-[11px] text-black">{sole?.label}{soleExtra > 0 ? ` (+€${soleExtra})` : ''}</span>
                  </div>
                  {latestScan && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-black/50">Größe</span>
                      <span className="text-[11px] text-black">EU {latestScan.eu_size}</span>
                    </div>
                  )}
                  {selectedAccessories.length > 0 && (
                    <div className="flex items-center justify-between pt-1 mt-1 border-t border-black/5">
                      <span className="text-[11px] text-black/50">Zubehör</span>
                      <span className="text-[11px] text-black">
                        {selectedAccessories.length}× (+€{accessoryTotal})
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-[15px] font-medium text-black mb-3" style={{ letterSpacing: '0.04em' }}>
                {displayPrice}
                {(soleExtra > 0 || accessoryTotal > 0) && (
                  <span className="text-[11px] text-black/35 ml-2">
                    ({[soleExtra > 0 && `+€${soleExtra} Sohle`, accessoryTotal > 0 && `+€${accessoryTotal} Zubehör`].filter(Boolean).join(' · ')})
                  </span>
                )}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={added ? () => navigate('/checkout') : handleAddToCart}
                  className={`flex-1 h-14 flex items-center justify-center gap-2.5 transition-all border ${
                    added ? 'bg-black text-white border-black' : 'bg-white text-black border-black/20 hover:bg-black/5 active:bg-black/10'
                  }`}
                  style={{ letterSpacing: '0.18em', textTransform: 'uppercase', fontSize: '12px', borderRadius: 0 }}
                >
                  {added
                    ? <><ShoppingBag size={16} strokeWidth={1.5} /> Zum Warenkorb</>
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
      <div
        className="sticky bottom-0 z-20 bg-white border-t border-black/5 flex-shrink-0 lg:hidden px-4 pt-2 transition-all duration-500"
        style={{
          paddingBottom: isNative ? 'max(env(safe-area-inset-bottom, 0px), 8px)' : '8px',
          opacity: configStep >= 3 ? 1 : 0.3,
          pointerEvents: configStep >= 3 ? 'auto' : 'none',
        }}
      >
        <div className="flex items-center justify-center gap-3 mb-1.5">
          <span className="text-[9px] text-black/40" style={{ letterSpacing: '0.05em' }}>{mat?.label}</span>
          <span className="text-black/15">·</span>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ backgroundColor: color }} />
            <span className="text-[9px] text-black/40">{col?.name}</span>
          </div>
          <span className="text-black/15">·</span>
          <span className="text-[9px] text-black/40" style={{ letterSpacing: '0.05em' }}>{sole?.label}</span>
        </div>
        <p className="text-center text-[12px] font-medium text-black mb-1.5" style={{ letterSpacing: '0.04em' }}>
          {displayPrice}
          {accessoryTotal > 0 && <span className="text-[9px] text-black/35 ml-1">(inkl. {selectedAccessories.length}× Zubehör)</span>}
        </p>
        <div className="flex gap-2">
          <button
            onClick={added ? () => navigate('/checkout') : handleAddToCart}
            className={`flex-1 h-12 flex items-center justify-center gap-2 transition-all border ${
              added ? 'bg-black text-white border-black' : 'bg-white text-black border-black/20 active:bg-black/5'
            }`}
            style={{ letterSpacing: '0.14em', textTransform: 'uppercase', fontSize: '10px', borderRadius: 0 }}
          >
            {added
              ? <><ShoppingBag size={14} strokeWidth={1.5} /> Zum Warenkorb</>
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

      {/* ── Duplikat-Banner (Schuh ohne Zubehör) ───────────────── */}
      {duplicateBanner && (
        <div className="fixed bottom-0 left-0 right-0 z-[90] animate-[slideUp_0.3s_ease-out]">
          <div className="bg-[#1a1a1a] mx-0 lg:mx-auto lg:max-w-lg">
            <div className="px-5 py-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-white/90 font-light leading-snug">
                  Dieser Schuh ist bereits im Warenkorb.
                </p>
                <p className="text-[10px] text-white/35 font-light mt-0.5">
                  Möchten Sie ihn erneut hinzufügen?
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => setDuplicateBanner(false)}
                  className="h-9 px-4 text-[9px] text-white/40 uppercase tracking-[0.15em] font-light bg-transparent border border-white/10 hover:border-white/25 transition-all"
                >
                  Nein
                </button>
                <button
                  onClick={handleBannerConfirm}
                  className="h-9 px-4 text-[9px] text-black uppercase tracking-[0.15em] font-light bg-white border border-white hover:bg-white/90 transition-all"
                >
                  Ja, hinzufügen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Duplikat-Dialog ────────────────────────────────────── */}
      {duplicateDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40" onClick={() => setDuplicateDialog(false)}>
          <div className="bg-white mx-4 w-full max-w-md p-7" onClick={e => e.stopPropagation()}>
            <p className="text-[9px] text-black/25 uppercase tracking-[0.25em] mb-3 font-light">Warenkorb</p>
            <p className="text-[16px] font-extralight text-black tracking-tight leading-snug mb-2">
              Dieser Schuh befindet sich bereits in Ihrem Warenkorb
            </p>
            <p className="text-[12px] text-black/35 font-light leading-relaxed mb-6">
              {product.name} in derselben Konfiguration liegt bereits im Warenkorb.
              Möchten Sie nur das Zubehör hinzufügen oder den Schuh erneut?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDuplicateChoice(false)}
                className="flex-1 h-12 border border-black text-black text-[10px] uppercase tracking-[0.15em] font-light bg-transparent hover:bg-black hover:text-white transition-all"
              >
                Nur Zubehör
              </button>
              <button
                onClick={() => handleDuplicateChoice(true)}
                className="flex-1 h-12 bg-black text-white text-[10px] uppercase tracking-[0.15em] font-light border border-black hover:bg-black/85 transition-all"
              >
                Schuh + Zubehör
              </button>
            </div>
            <button
              onClick={() => setDuplicateDialog(false)}
              className="w-full mt-3 h-9 text-[10px] text-black/30 hover:text-black/60 bg-transparent border-0 font-light uppercase tracking-[0.15em] transition-all"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
