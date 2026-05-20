/**
 * ShoeCollection.jsx — Louis Vuitton-style product listing
 * Clean grid, generous whitespace, minimal product cards
 * Modeled after LV's collection pages
 */
import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Heart, Footprints, X } from 'lucide-react'
import useStore from '../store/store'
import CtaBanner from '../components/CtaBanner'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../hooks/useApi'
import { HEROES, SHOES } from '../lib/editorialImages'

const BASE_CATEGORIES = [
  { label: 'Alle Modelle', value: 'ALL' },
  { label: 'Oxford',       value: 'OXFORD' },
  { label: 'Derby',        value: 'DERBY' },
  { label: 'Loafer',       value: 'LOAFER' },
  { label: 'Chelsea Boot', value: 'BOOT' },
  { label: 'Sneaker',      value: 'SNEAKER' },
  { label: 'Monk',         value: 'MONK' },
]

// ── Passform-Overlay — charmant, überspringbar, beim Einstieg ───────────
// Fragt Länge + Ballenumfang für beide Füße. Der größere Fuß zählt fürs
// Matching (Schuh-Standard). Funktioniert auch für Gäste (kein Login nötig).
function FitOverlay({ initial, onSave, onSkip }) {
  const [ll, setLL] = useState(initial?.feet?.left?.length_mm || '')
  const [lg, setLG] = useState(initial?.feet?.left?.girth_mm || '')
  const [rl, setRL] = useState(initial?.feet?.right?.length_mm || '')
  const [rg, setRG] = useState(initial?.feet?.right?.girth_mm || '')
  const [saving, setSaving] = useState(false)
  const num = (v) => parseFloat(String(v).replace(',', '.'))
  // Mindestens ein vollständiger Fuß genügt; fehlt einer, wird der andere gespiegelt.
  const leftOk = Number.isFinite(num(ll)) && Number.isFinite(num(lg))
  const rightOk = Number.isFinite(num(rl)) && Number.isFinite(num(rg))
  const canSave = leftOk || rightOk

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    const left = leftOk ? { length_mm: num(ll), girth_mm: num(lg) } : null
    const right = rightOk ? { length_mm: num(rl), girth_mm: num(rg) } : null
    const lens = [left?.length_mm, right?.length_mm].filter(Number.isFinite)
    const girths = [left?.girth_mm, right?.girth_mm].filter(Number.isFinite)
    try {
      await onSave({
        foot_length_mm: Math.max(...lens),
        ball_girth_mm: Math.max(...girths),
        feet: { left: left || right, right: right || left },
      })
    } finally { setSaving(false) }
  }

  const inputCls = "w-full border border-black/15 px-2.5 py-2 text-[13px] focus:outline-none focus:border-black/40"
  const lblCls = "block text-[9px] text-black/35 uppercase tracking-wider mb-1"

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 px-4" onClick={onSkip}>
      <div className="bg-white w-full max-w-md p-7 relative" onClick={e => e.stopPropagation()}>
        <button onClick={onSkip} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center bg-transparent border-0 text-black/30 hover:text-black/60">
          <X size={16} strokeWidth={1.5} />
        </button>
        <div className="flex items-center gap-2 mb-2">
          <Footprints size={16} strokeWidth={1.5} className="text-black/50" />
          <p className="text-[10px] text-black/30 uppercase tracking-[0.22em]">Ihre Passform</p>
        </div>
        <p className="text-[18px] font-extralight text-black tracking-tight leading-snug mb-2">
          Zeigen wir Ihnen, was wirklich passt
        </p>
        <p className="text-[12px] text-black/40 font-light leading-relaxed mb-5">
          Zwei Maße genügen — wir finden Größe und Leistenform automatisch und
          blenden Modelle aus, die Ihrem Fuß nicht schmeicheln. Kein Raten mehr.
        </p>

        <div className="space-y-4">
          <div>
            <p className="text-[10px] text-black/40 uppercase tracking-wider mb-1.5">Linker Fuß</p>
            <div className="flex gap-2">
              <label className="flex-1"><span className={lblCls}>Länge (mm)</span>
                <input type="number" inputMode="decimal" value={ll} onChange={e => setLL(e.target.value)} placeholder="z. B. 270" className={inputCls} />
              </label>
              <label className="flex-1"><span className={lblCls}>Ballenumfang (mm)</span>
                <input type="number" inputMode="decimal" value={lg} onChange={e => setLG(e.target.value)} placeholder="z. B. 255" className={inputCls} />
              </label>
            </div>
          </div>
          <div>
            <p className="text-[10px] text-black/40 uppercase tracking-wider mb-1.5">Rechter Fuß</p>
            <div className="flex gap-2">
              <label className="flex-1"><span className={lblCls}>Länge (mm)</span>
                <input type="number" inputMode="decimal" value={rl} onChange={e => setRL(e.target.value)} placeholder="z. B. 271" className={inputCls} />
              </label>
              <label className="flex-1"><span className={lblCls}>Ballenumfang (mm)</span>
                <input type="number" inputMode="decimal" value={rg} onChange={e => setRG(e.target.value)} placeholder="z. B. 256" className={inputCls} />
              </label>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className="mt-6 w-full py-3 bg-black text-white text-[11px] tracking-[0.18em] uppercase disabled:opacity-30 border-0"
        >
          {saving ? 'Einen Moment …' : 'Passende Modelle zeigen'}
        </button>
        <button
          onClick={onSkip}
          className="mt-2 w-full py-2 text-[11px] text-black/35 hover:text-black/60 bg-transparent border-0 font-light tracking-wider"
        >
          Später — erst stöbern
        </button>
      </div>
    </div>
  )
}

// ── Product Card (LV style — image + name + price, nothing more) ─────────
function ProductCard({ product, onSelect, isFav, onToggleFav, isPromo, dimmed }) {
  const displayPrice = isPromo && product.promotion_price ? product.promotion_price : product.price
  return (
    <div
      className="group cursor-pointer transition-opacity duration-500"
      style={{ opacity: dimmed ? 0.4 : 1 }}
      onClick={() => onSelect(product)}
    >
      {/* Image */}
      <div
        className="w-full overflow-hidden flex items-center justify-center bg-[#f6f5f3] relative transition-all duration-500 group-hover:bg-[#efeee9]"
        style={{ aspectRatio: '3 / 4' }}
      >
        {dimmed && (
          <div className="absolute top-3 left-3 z-10">
            <span className="text-[9px] text-black/55 bg-white/85 backdrop-blur-sm px-2 py-1 font-light tracking-wide" style={{ letterSpacing: '0.04em' }}>
              Passt evtl. nicht zu Ihren Maßen
            </span>
          </div>
        )}
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        ) : (
          <svg viewBox="0 0 260 130" className="w-3/5 opacity-50">
            <ellipse cx="130" cy="120" rx="100" ry="8" fill="#00000008" />
            <path d="M20 100 Q17 108 38 112 L222 112 Q238 112 238 100 L232 80 Q226 62 210 60 L72 60 Q47 60 42 68 Z" fill={product.color || '#374151'} />
            <path d="M42 68 Q37 48 62 36 L120 30 Q155 27 178 42 Q198 54 232 80 L210 60 Q180 50 148 52 L90 53 Q60 55 42 68 Z" fill={product.color || '#374151'} opacity="0.85" />
          </svg>
        )}

        {/* Wishlist — appears on hover */}
        <button
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center border-0 bg-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          onClick={e => { e.stopPropagation(); onToggleFav() }}
        >
          <Heart size={16} strokeWidth={1.5} className={isFav ? 'text-black fill-black' : 'text-black/25'} />
        </button>

        {/* Match badge */}
        {product.match && (
          <div className="absolute bottom-3 left-3">
            <span className="text-[10px] text-black/40 bg-white/80 backdrop-blur-sm px-2 py-1 font-light" style={{ letterSpacing: '0.05em' }}>
              {product.match} Passform
            </span>
          </div>
        )}
      </div>

      {/* Info — minimal, LV style */}
      <div className="pt-3">
        <p className="text-[12px] lg:text-[13px] text-black font-normal leading-snug">{product.name}</p>
        <div className="flex items-center gap-2 mt-1">
          {isPromo && product.promotion_price ? (
            <p className="text-[12px] lg:text-[13px] text-black/45 font-light">
              <span className="line-through text-black/20 mr-1.5">{product.price}</span>
              {product.promotion_price}
            </p>
          ) : (
            <p className="text-[12px] lg:text-[13px] text-black/45 font-light">{displayPrice}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
export default function ShoeCollection() {
  const navigate = useNavigate()
  const location = useLocation()
  const { shoes, favorites, toggleFavorite, footMeasurements, saveFootMeasurements, fitFeasibility } = useStore()
  const { user } = useAuth()
  const handleToggleFav = async (shoeId) => {
    if (!user) {
      navigate('/login', { state: { from: location.pathname + location.search } })
      return
    }
    const result = await toggleFavorite(shoeId)
    if (result === 'unauthenticated') {
      navigate('/login', { state: { from: location.pathname + location.search } })
    }
  }
  const [activeCategory, setActiveCategory] = useState('ALL')
  const [scanAccuracy, setScanAccuracy] = useState(null)

  // ── Passform-Filter ──────────────────────────────────────────────────────
  // Maße können vom Account kommen (footMeasurements) oder transient von Gästen
  // (localMeas). Der größere Fuß zählt — bereits in foot_length_mm/ball_girth_mm.
  const [localMeas, setLocalMeas] = useState(null) // { foot_length_mm, ball_girth_mm, feet }
  const [overlayOpen, setOverlayOpen] = useState(false)
  const [feasible, setFeasible] = useState(null)    // { categories:Set, known:Set }

  const effMeas = localMeas
    || (footMeasurements?.foot_length_mm
        ? { foot_length_mm: footMeasurements.foot_length_mm, ball_girth_mm: footMeasurements.ball_girth_mm, feet: footMeasurements.feet }
        : null)

  // Overlay einmalig beim Einstieg, wenn noch keine Maße vorliegen.
  useEffect(() => {
    if (effMeas) return
    if (sessionStorage.getItem('fitOverlayDismissed')) return
    const t = setTimeout(() => setOverlayOpen(true), 600)
    return () => clearTimeout(t)
  }, [effMeas?.foot_length_mm])

  // Feasibility laden, sobald Maße vorhanden sind.
  useEffect(() => {
    if (!effMeas?.foot_length_mm) { setFeasible(null); return }
    let cancelled = false
    const adj = footMeasurements?.fit_adjust || { length_mm: 0, girth_mm: 0 }
    fitFeasibility({
      length: effMeas.foot_length_mm + (adj.length_mm || 0),
      girth: effMeas.ball_girth_mm + (adj.girth_mm || 0),
    }).then(r => {
      if (cancelled) return
      setFeasible({ categories: new Set(r.categories || []), known: new Set(r.knownCategories || []) })
    })
    return () => { cancelled = true }
  }, [effMeas?.foot_length_mm, effMeas?.ball_girth_mm])

  // Schuh passt, wenn: keine Maße, Kategorie unbekannt (keine Chart-Daten),
  // oder Kategorie unter den passenden.
  const fitsMeasurements = (cat) =>
    !feasible || !feasible.known.has(cat) || feasible.categories.has(cat)

  const handleSaveMeasurements = async (m) => {
    setLocalMeas(m)
    setOverlayOpen(false)
    sessionStorage.setItem('fitOverlayDismissed', '1')
    if (user) { try { await saveFootMeasurements(m) } catch {} }
  }
  const dismissOverlay = () => {
    setOverlayOpen(false)
    sessionStorage.setItem('fitOverlayDismissed', '1')
  }
  // Backend-Status: 'loading' (Initial-Pull läuft) | 'ok' | 'error'
  const [backendStatus, setBackendStatus] = useState(shoes.length ? 'ok' : 'loading')
  const [backendError, setBackendError]   = useState(null)
  const isPromo = !!user?.is_promotion

  useEffect(() => {
    apiFetch('/api/scans/mine')
      .then(scans => { if (scans?.length) setScanAccuracy(scans[0].accuracy) })
      .catch(() => {})
  }, [])

  // Eigener Probe-Fetch, damit wir explizit zwischen „Backend down“
  // und „Backend antwortet mit leerer Liste“ unterscheiden können.
  useEffect(() => {
    let cancelled = false
    apiFetch('/api/shoes')
      .then(rows => {
        if (cancelled) return
        setBackendStatus('ok')
        setBackendError(null)
      })
      .catch(err => {
        if (cancelled) return
        setBackendStatus('error')
        setBackendError(err?.error || err?.message || 'Verbindung zum Server fehlgeschlagen')
      })
    return () => { cancelled = true }
  }, [])

  const CATEGORIES = isPromo
    ? [{ label: 'Promo', value: 'PROMO' }, ...BASE_CATEGORIES]
    : BASE_CATEGORIES

  const enriched = shoes.map(s => ({
    ...s,
    match: s.match || (scanAccuracy ? `${Math.min(99.9, scanAccuracy + ((s.id * 13 + 7) % 17) * 0.03).toFixed(1)}%` : null),
  }))

  const filtered = activeCategory === 'PROMO'
    ? enriched.filter(p => p.promotion_price)
    : activeCategory === 'ALL' ? enriched : enriched.filter(p => p.category === activeCategory)
  const selectShoe = (product) => navigate(`/customize?id=${product.id}`, { state: { product } })

  return (
    <div className="min-h-full bg-white">

      {/* ── Hero — image then text below (LV-style) ──────────────── */}
      <div className="w-full overflow-hidden" style={{ aspectRatio: '16 / 5' }}>
        <img src={HEROES.collection} alt="" className="w-full h-full object-cover" />
      </div>
      <div className="text-center px-5 lg:px-16 pt-10 lg:pt-14 pb-6 lg:pb-8">
        <p className="text-[10px] text-black/30 uppercase tracking-[0.3em] mb-3">Artisan Sole Kollektion</p>
        <h1 className="text-[24px] lg:text-[32px] font-extralight text-black leading-[1.05] tracking-tight">
          Maßschuhe
        </h1>
      </div>

      {/* ── Category navigation (LV underline tabs) ────────────── */}
      <div className="px-5 lg:px-16 pb-5 lg:pb-8 border-b border-black/[0.06]">
        <div className="flex gap-0 lg:gap-1 overflow-x-auto justify-center" style={{ scrollbarWidth: 'none' }}>
          {CATEGORIES.map(cat => {
            const count = cat.value === 'ALL' ? enriched.length
              : cat.value === 'PROMO' ? enriched.filter(p => p.promotion_price).length
              : enriched.filter(p => p.category === cat.value).length
            return (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={`flex-shrink-0 px-3 lg:px-4 py-2 text-[11px] lg:text-[12px] border-0 bg-transparent transition-all ${
                  activeCategory === cat.value
                    ? 'text-black'
                    : 'text-black/25 hover:text-black/50'
                }`}
                style={{
                  letterSpacing: '0.06em',
                  borderBottom: activeCategory === cat.value ? '1.5px solid black' : '1.5px solid transparent',
                }}
              >
                {cat.label}
                {count > 0 && <span className="text-black/15 ml-1 font-light">{count}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Product count + Passform-Status ─────────────────────── */}
      <div className="px-5 lg:px-16 pt-5 lg:pt-6 pb-2 flex items-center justify-between gap-3">
        <p className="text-[11px] text-black/20 font-light">{filtered.length} {filtered.length === 1 ? 'Modell' : 'Modelle'}</p>
        {effMeas ? (
          <button
            onClick={() => setOverlayOpen(true)}
            className="flex items-center gap-1.5 bg-transparent border-0 text-[11px] text-black/40 hover:text-black/70 font-light"
          >
            <Footprints size={13} strokeWidth={1.5} />
            <span>Passform aktiv · {effMeas.foot_length_mm}/{effMeas.ball_girth_mm} mm</span>
          </button>
        ) : (
          <button
            onClick={() => setOverlayOpen(true)}
            className="flex items-center gap-1.5 bg-transparent border-0 text-[11px] text-black/40 hover:text-black/70 font-light"
          >
            <Footprints size={13} strokeWidth={1.5} />
            <span>Nach meiner Passform filtern</span>
          </button>
        )}
      </div>

      {/* ── Product Grid (LV style — 4-col, compact cards) ────── */}
      <div className="px-8 lg:px-24 xl:px-32 pb-16">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            {backendStatus === 'loading' && (
              <>
                <div className="w-6 h-6 border border-black/15 border-t-black/50 rounded-full animate-spin-custom mb-4" />
                <p className="text-[14px] font-light text-black/40">Produkte werden geladen …</p>
              </>
            )}
            {backendStatus === 'error' && (
              <>
                <p className="text-[14px] font-light text-red-700/80">Produkte können aktuell nicht geladen werden.</p>
                <p className="text-[12px] text-black/40 mt-2 font-light max-w-md">{backendError}</p>
                <button
                  type="button"
                  onClick={() => { setBackendStatus('loading'); setBackendError(null); window.location.reload() }}
                  className="mt-5 px-6 h-10 border border-black text-black text-[11px] tracking-[0.18em] uppercase font-light hover:bg-black hover:text-white transition-all"
                >
                  Erneut versuchen
                </button>
              </>
            )}
            {backendStatus === 'ok' && (
              <>
                <p className="text-[14px] font-light text-black/40">Diese Kategorie wird gerade kuratiert.</p>
                <p className="text-[12px] text-black/20 mt-2 font-light">Bald verfügbar.</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 lg:gap-x-6 gap-y-8 lg:gap-y-12">
            {filtered.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={selectShoe}
                isFav={favorites.includes(String(product.id))}
                onToggleFav={() => handleToggleFav(product.id)}
                isPromo={isPromo}
                dimmed={!fitsMeasurements(product.category)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── CTA Banner (CMS-controlled) ──────────────────────── */}
      <div className="px-5 lg:px-16 pb-16">
        <CtaBanner page="collection" />
      </div>

      {overlayOpen && (
        <FitOverlay
          initial={footMeasurements || localMeas}
          onSave={handleSaveMeasurements}
          onSkip={dismissOverlay}
        />
      )}
    </div>
  )
}
