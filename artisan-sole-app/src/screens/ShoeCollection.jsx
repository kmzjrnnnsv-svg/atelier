/**
 * ShoeCollection.jsx, Louis Vuitton-style product listing
 * Clean grid, generous whitespace, minimal product cards
 * Modeled after LV's collection pages
 */
import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Heart, Footprints, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import useStore from '../store/store'
import CtaBanner from '../components/CtaBanner'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../hooks/useApi'
import { SHOES } from '../lib/editorialImages'
import ShoeName from '../lib/shoeName'
import { useShoeColors, useHoverImage } from '../lib/shoeCards'
import { shoePath } from '../lib/shoePath'

// Anlass-basierte Kategorien. Jeder Anlass bildet auf mehrere Schuh-Typen ab
// (ein Modell kann in mehreren Anlässen erscheinen). `cats` = enthaltene
// shoe.category-Werte; ohne `cats` (nur ALL) zählt alles.
const BASE_CATEGORIES = [
  { label: 'Alle Modelle',    value: 'ALL' },
  { label: 'Büro & Business', value: 'BUSINESS',     cats: ['OXFORD', 'WHOLECUT', 'DERBY', 'MONK', 'DOUBLE_MONK'] },
  { label: 'Smart Casual',    value: 'SMART_CASUAL', cats: ['LOAFER', 'MONK', 'DOUBLE_MONK', 'DERBY', 'CHELSEA'] },
  { label: 'Freizeit',        value: 'LEISURE',      cats: ['SNEAKER', 'SNEAKER_LACED', 'SNEAKER_BOOT', 'LACELESS_TRAINER', 'LOAFER', 'CHUKKA', 'BOOT', 'JODHPUR'] },
  { label: 'Abend & Gala',    value: 'EVENING',      cats: ['WHOLECUT', 'OXFORD', 'BELGIAN_SLIPPER', 'WELLINGTON', 'DRAKE'] },
  { label: 'Outdoor',         value: 'OUTDOOR',      cats: ['BOOT', 'CHELSEA', 'BALMORAL', 'JODHPUR', 'CHUKKA'] },
]
const CATEGORY_CAT_MAP = Object.fromEntries(BASE_CATEGORIES.filter(c => c.cats).map(c => [c.value, c.cats]))
// Trifft ein Schuh (shoe.category) auf die gewählte Anlass-Kategorie zu?
const shoeInCategory = (catValue, shoeCategory) => {
  if (catValue === 'ALL') return true
  const cats = CATEGORY_CAT_MAP[catValue]
  return cats ? cats.includes(shoeCategory) : shoeCategory === catValue
}

// ── Passform-Leiste, inline unter den Reitern, kein Overlay ────────────
// Fragt Länge + Ballenumfang für beide Füße. Der größere Fuß zählt fürs
// Matching (Schuh-Standard). Werte werden persistiert (Konto + lokal), sind
// jederzeit auf-/zuklappbar und leicht änderbar. Auch für Gäste nutzbar.
function FitBar({ value, open, onToggle, onSave, onReset }) {
  const [ll, setLL] = useState('')
  const [lg, setLG] = useState('')
  const [rl, setRL] = useState('')
  const [rg, setRG] = useState('')
  const [saving, setSaving] = useState(false)

  // Felder aus gespeicherten Werten vorbefüllen, wenn das Panel geöffnet wird.
  useEffect(() => {
    if (!open) return
    setLL(value?.feet?.left?.length_mm ?? value?.foot_length_mm ?? '')
    setLG(value?.feet?.left?.girth_mm ?? value?.ball_girth_mm ?? '')
    setRL(value?.feet?.right?.length_mm ?? value?.foot_length_mm ?? '')
    setRG(value?.feet?.right?.girth_mm ?? value?.ball_girth_mm ?? '')
  }, [open])

  const num = (v) => parseFloat(String(v).replace(',', '.'))
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
    <div className="border-b border-black/[0.06]">
      {/* Zusammenfassungs-/Toggle-Zeile */}
      <div className="px-5 lg:px-16 py-3 flex items-center justify-center gap-3">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 bg-transparent border-0 text-[11px] lg:text-[12px] text-black/45 hover:text-black/75 transition-colors"
        >
          <Footprints size={14} strokeWidth={1.5} />
          {value?.foot_length_mm ? (
            <span className="font-light tracking-wide">
              Passform: {value.foot_length_mm}/{value.ball_girth_mm} mm
              <span className="text-black/30 ml-1.5 underline underline-offset-2">ändern</span>
            </span>
          ) : (
            <span className="font-light tracking-wide">
              Für die richtige Passform: Maße eingeben
            </span>
          )}
          {open ? <ChevronUp size={13} strokeWidth={1.5} /> : <ChevronDown size={13} strokeWidth={1.5} />}
        </button>
      </div>

      {/* Ausklappbares Eingabe-Panel */}
      {open && (
        <div className="px-5 lg:px-16 pb-5 pt-1">
          <div className="max-w-2xl mx-auto">
            <p className="text-[11px] text-black/40 font-light leading-relaxed mb-4 text-center">
              Zwei Maße genügen, wir finden Größe und Leistenform automatisch und
              blenden Modelle aus, die Ihrem Fuß nicht schmeicheln.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
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
              <div className="flex-1">
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
            <div className="flex items-center gap-3 mt-4 justify-center">
              <button
                onClick={handleSave}
                disabled={!canSave || saving}
                className="px-8 py-2.5 bg-black text-white text-[11px] tracking-[0.18em] uppercase disabled:opacity-30 border-0"
              >
                {saving ? 'Einen Moment …' : 'Übernehmen'}
              </button>
              {value?.foot_length_mm && (
                <button
                  onClick={onReset}
                  className="px-4 py-2.5 text-[11px] text-black/35 hover:text-black/60 bg-transparent border-0 font-light tracking-wider"
                >
                  Zurücksetzen
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Preis-Helfer (deutsches Format "€ 1.485").
function parsePrice(str) {
  if (!str) return 0
  return parseFloat(String(str).replace(/[^0-9.,]/g, '').replace(/\./g, '').replace(',', '.')) || 0
}
const fmtPrice = (n) => n.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

// ── Product Card (LV style, image + name + price, nothing more) ─────────
// Produktaufnahmen haben rundum viel Luft — ohne Anschnitt steht der Schuh
// klein und verloren in der Kachel. Der Zoom holt ihn näher heran, ohne dass
// neu fotografiert werden muss.
//
// 1.12 ist bewusst zurückhaltend: Der Anschnitt frisst sich von allen vier
// Seiten nach innen und darf nur den leeren Rand erwischen. Bei 1.22 stand
// der rechte Schuh bereits über der Kante. Wer enger gefasste Aufnahmen
// einsetzt, senkt den Wert weiter.
const CARD_ZOOM = 'scale-[1.12]'
const CARD_ZOOM_HOVER = 'group-hover:scale-[1.16]'

function ProductCard({ product, onSelect, isFav, onToggleFav, isPromo, dimmed, campaign }) {
  const displayPrice = isPromo && product.promotion_price ? product.promotion_price : product.price
  const campPriceNum = campaign ? (campaign.payment_mode === 'company' ? 0 : Math.round(parsePrice(product.price) * (1 - campaign.discount_pct / 100))) : null

  // `touched` bleibt true, sobald der Zeiger die Kachel einmal berührt hat —
  // die Zweitansicht wird also nur für tatsächlich betrachtete Modelle geholt,
  // aber nach dem ersten Mal nicht erneut.
  const [hovered, setHovered] = useState(false)
  const [touched, setTouched] = useState(false)
  const hoverImage = useHoverImage(product.id, touched)
  const colors = useShoeColors(product.id)

  const enter = () => { setHovered(true); setTouched(true) }
  const leave = () => setHovered(false)

  // Overlays nur zeigen, wenn es auch etwas zu wechseln gibt.
  const showSecond = hovered && !!hoverImage

  const priceLine = campaign ? (
    <>
      <span className="line-through opacity-50 mr-1.5">{product.price}</span>
      {campaign.payment_mode === 'company' ? 'von Ihrer Firma übernommen' : `€ ${fmtPrice(campPriceNum)}`}
    </>
  ) : isPromo && product.promotion_price ? (
    <>
      <span className="line-through opacity-50 mr-1.5">{product.price}</span>
      {product.promotion_price}
    </>
  ) : displayPrice

  return (
    <div
      className="group cursor-pointer"
      onClick={() => onSelect(product)}
      onMouseEnter={enter}
      onMouseLeave={leave}
      onFocus={enter}
      onBlur={leave}
    >
      {/* Bildfläche. 3/4 hochkant wie bei den großen Häusern: der Schuh steht
          im Bild, statt in einem breiten Streifen zu schwimmen. */}
      {/* Quadratisch, weil die Produktaufnahmen quadratisch sind. Im vorherigen
          3:4-Hochformat musste object-cover links und rechts abschneiden — beim
          rechten Schuh fehlte die Spitze. Gleiches Seitenverhältnis heißt: kein
          erzwungener Beschnitt, nur der bewusste Zoom. */}
      <div className="w-full aspect-square overflow-hidden flex items-center justify-center bg-[#f6f5f3] relative transition-colors duration-500 group-hover:bg-[#efeee9]">
        {product.image ? (
          <>
            <img
              src={product.image}
              alt={product.name}
              className={`w-full h-full object-cover transition-transform duration-700 ${CARD_ZOOM} ${CARD_ZOOM_HOVER}`}
              style={{ opacity: dimmed ? 0.6 : 1 }}
            />
            {/* Zweitansicht liegt darüber und wird eingeblendet. Ein Wechsel
                der src würde flackern, weil das neue Bild erst dekodiert wird. */}
            {hoverImage && (
              <img
                src={hoverImage}
                alt=""
                aria-hidden="true"
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${CARD_ZOOM}`}
                style={{ opacity: showSecond ? (dimmed ? 0.6 : 1) : 0 }}
              />
            )}
          </>
        ) : (
          <svg viewBox="0 0 260 130" className="w-3/5" style={{ opacity: dimmed ? 0.3 : 0.5 }}>
            <ellipse cx="130" cy="120" rx="100" ry="8" fill="#00000008" />
            <path d="M20 100 Q17 108 38 112 L222 112 Q238 112 238 100 L232 80 Q226 62 210 60 L72 60 Q47 60 42 68 Z" fill={product.color || '#374151'} />
            <path d="M42 68 Q37 48 62 36 L120 30 Q155 27 178 42 Q198 54 232 80 L210 60 Q180 50 148 52 L90 53 Q60 55 42 68 Z" fill={product.color || '#374151'} opacity="0.85" />
          </svg>
        )}

        {/* Kopfzeile der Kachel: Name, Preis und der Passform-Hinweis liegen
            oben auf dem Bild und weichen gemeinsam, sobald die Zweitansicht
            einblendet. Vorher saß die Beschriftung unten und lag damit über
            Sohle und Schlagschatten — genau dort, wo bei einer Produktaufnahme
            das Motiv endet. Oben ist bei zentriert stehenden Schuhen Luft.
            Ohne aufhellenden Verlauf: Der weiße Schleier lag über dem oberen
            Bildrand und nahm der Aufnahme dort die Farbe. Lesbarkeit kommt
            stattdessen aus dem Textschatten — er wirkt nur um die Buchstaben
            herum und lässt das Bild unangetastet. */}
        <div
          className="absolute inset-x-0 top-0 z-10 px-3.5 pt-3 pb-9 pointer-events-none transition-opacity duration-500"
          style={{ opacity: showSecond ? 0 : (dimmed ? 0.8 : 1) }}
        >
          {/* pr-9 hält die Zeile frei von der Wunschlisten-Schaltfläche
              rechts oben, die beim Überfahren an derselben Stelle erscheint. */}
          <p
            className="text-[12px] lg:text-[13px] text-black font-normal leading-snug pr-9"
            style={{ textShadow: '0 1px 3px rgba(255,255,255,0.85), 0 0 10px rgba(255,255,255,0.7)' }}
          >
            <ShoeName name={product.name} />
          </p>
          <p
            className="text-[12px] lg:text-[13px] text-black/55 font-light mt-0.5"
            style={{ textShadow: '0 1px 3px rgba(255,255,255,0.85), 0 0 10px rgba(255,255,255,0.7)' }}
          >
            {priceLine}
          </p>

          {/* Hinweis direkt unter dem Preis, in derselben Fläche — so
              verschwindet er beim Überfahren mit, statt allein stehen zu
              bleiben. */}
          {dimmed ? (
            <span className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] text-amber-900 bg-amber-50/95 border border-amber-300/70 px-2 py-0.5 font-normal" style={{ letterSpacing: '0.02em' }}>
              <AlertTriangle size={11} strokeWidth={1.8} className="text-amber-600 flex-shrink-0" />
              Passt nicht zu Ihren Maßen
            </span>
          ) : campaign ? (
            <span className="mt-1.5 inline-block text-[10px] text-white bg-stone-900/90 px-2 py-0.5 font-normal" style={{ letterSpacing: '0.05em' }}>
              {campaign.payment_mode === 'company' ? 'Firma zahlt' : `-${campaign.discount_pct}%`}
            </span>
          ) : product.match ? (
            <span className="mt-1.5 inline-block text-[10px] text-black/50 font-light" style={{ letterSpacing: '0.05em', textShadow: '0 1px 3px rgba(255,255,255,0.85)' }}>
              {product.match} Passform
            </span>
          ) : null}
        </div>

        {/* Wunschliste, erscheint beim Überfahren */}
        <button
          className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center border-0 bg-transparent opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-300"
          onClick={e => { e.stopPropagation(); onToggleFav() }}
          aria-label={isFav ? 'Von der Wunschliste entfernen' : 'Auf die Wunschliste'}
        >
          <Heart size={16} strokeWidth={1.5} className={isFav ? 'text-black fill-black' : 'text-black/25'} />
        </button>

        {/* Farbtöne, rechts unten, erscheinen beim Überfahren. Sie zeigen, was
            konfigurierbar ist, ohne die Kachel im Ruhezustand zu beladen. */}
        {colors.length > 0 && (
          <div
            className="absolute bottom-3.5 right-4 z-20 flex items-center gap-1.5 transition-opacity duration-500"
            style={{ opacity: showSecond ? 1 : 0 }}
          >
            {colors.slice(0, 4).map(c => (
              <span
                key={c.hex}
                title={c.name}
                className="w-3.5 h-3.5 rounded-full border border-black/15"
                style={{ backgroundColor: c.hex }}
              />
            ))}
            {colors.length > 4 && (
              <span className="text-[10px] text-black/40 font-light ml-0.5">+{colors.length - 4}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
export default function ShoeCollection() {
  const navigate = useNavigate()
  const location = useLocation()
  const { shoes, favorites, toggleFavorite, footMeasurements, saveFootMeasurements, fitFeasibility, fetchMyCampaigns } = useStore()
  const { user } = useAuth()
  const [campaigns, setCampaigns] = useState([])
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
  // Maße kommen aus dem Store (footMeasurements), für eingeloggte Nutzer vom
  // Konto, für Gäste aus localStorage (beides via saveFootMeasurements). Der
  // größere Fuß zählt, bereits in foot_length_mm/ball_girth_mm.
  const [fitOpen, setFitOpen] = useState(false)
  const [feasible, setFeasible] = useState(null)    // { categories:Set, known:Set }

  // Feasibility laden, sobald Maße vorhanden sind.
  useEffect(() => {
    if (!footMeasurements?.foot_length_mm) { setFeasible(null); return }
    let cancelled = false
    const adj = footMeasurements?.fit_adjust || { length_mm: 0, girth_mm: 0 }
    fitFeasibility({
      length: footMeasurements.foot_length_mm + (adj.length_mm || 0),
      girth: footMeasurements.ball_girth_mm + (adj.girth_mm || 0),
    }).then(r => {
      if (cancelled) return
      setFeasible({ categories: new Set(r.categories || []), known: new Set(r.knownCategories || []), percent: r.percentByCategory || {} })
    })
    return () => { cancelled = true }
  }, [footMeasurements?.foot_length_mm, footMeasurements?.ball_girth_mm, footMeasurements?.fit_adjust?.length_mm, footMeasurements?.fit_adjust?.girth_mm])

  // Schuh passt, wenn: keine Maße, Kategorie unbekannt (keine Chart-Daten),
  // oder Kategorie unter den passenden.
  const fitsMeasurements = (cat) =>
    !feasible || !feasible.known.has(cat) || feasible.categories.has(cat)

  const handleSaveMeasurements = async (m) => {
    await saveFootMeasurements(m)  // persistiert Konto + localStorage
    setFitOpen(false)
  }
  const handleResetMeasurements = async () => {
    await saveFootMeasurements({ foot_length_mm: null, ball_girth_mm: null }).catch(() => {})
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

  // Aktive Firmen-Kampagne des Mitarbeiters laden.
  useEffect(() => {
    if (!user) { setCampaigns([]); return }
    fetchMyCampaigns().then(rows => setCampaigns(Array.isArray(rows) ? rows : [])).catch(() => {})
  }, [user])
  const activeCampaign = campaigns[0] || null

  const CATEGORIES = isPromo
    ? [{ label: 'Promo', value: 'PROMO' }, ...BASE_CATEGORIES]
    : BASE_CATEGORIES

  // Bei aktiver Kampagne mit festen Designs den Katalog darauf beschränken.
  const scopedShoes = activeCampaign?.allowed_shoe_ids?.length
    ? shoes.filter(s => activeCampaign.allowed_shoe_ids.includes(s.id))
    : shoes

  // Echte Passgenauigkeit aus den Leisten-Maßen (nur wenn Fußmaße vorliegen).
  const enriched = scopedShoes.map(s => {
    const pct = feasible?.percent?.[s.category]
    return { ...s, match: pct != null ? `${String(pct).replace('.', ',')} %` : null }
  })

  const filtered = activeCategory === 'PROMO'
    ? enriched.filter(p => p.promotion_price)
    : enriched.filter(p => shoeInCategory(activeCategory, p.category))
  const selectShoe = (product) => navigate(shoePath(product), { state: { product } })

  return (
    <div className="min-h-full bg-white">

      {/* ── Hero, image then text below (LV-style) ──────────────── */}
      <div className="text-center px-5 lg:px-16 pt-10 lg:pt-14 pb-6 lg:pb-8">
        <p className="text-[10px] text-black/30 uppercase tracking-[0.3em] mb-3">Artisan Sole Kollektion</p>
        <h1 className="text-[24px] lg:text-[32px] font-extralight text-black leading-[1.05] tracking-tight">
          Custom Made
        </h1>
      </div>

      {/* ── Category navigation (LV underline tabs) ────────────── */}
      <div className="px-5 lg:px-16 pb-5 lg:pb-8">
        <div className="flex gap-0 lg:gap-1 overflow-x-auto justify-center" style={{ scrollbarWidth: 'none' }}>
          {CATEGORIES.map(cat => {
            const count = cat.value === 'ALL' ? enriched.length
              : cat.value === 'PROMO' ? enriched.filter(p => p.promotion_price).length
              : enriched.filter(p => shoeInCategory(cat.value, p.category)).length
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

      {/* ── Passform-Leiste (inline, unter den Reitern) ─────────── */}
      <FitBar
        value={footMeasurements}
        open={fitOpen}
        onToggle={() => setFitOpen(o => !o)}
        onSave={handleSaveMeasurements}
        onReset={handleResetMeasurements}
      />

      {/* ── Kampagnen-Banner (Firmen-Aktion) ─────────────────────── */}
      {activeCampaign && (
        <div className="px-5 lg:px-16 pt-5">
          <div className="max-w-3xl mx-auto bg-stone-900 text-white px-5 py-3.5 flex items-center justify-between gap-4">
            <div>
              <p className="text-[12px] lg:text-[13px] font-normal">
                {activeCampaign.business_name ? `${activeCampaign.business_name} · ` : ''}{activeCampaign.name}
              </p>
              <p className="text-[11px] text-white/60 font-light mt-0.5">
                {activeCampaign.payment_mode === 'company'
                  ? 'Ihr Schuh wird von Ihrer Firma übernommen.'
                  : `${activeCampaign.discount_pct}% Firmenrabatt auf Ihren Custom-made Schuh.`}
                {activeCampaign.allowed_shoe_ids?.length ? ' Auswahl auf die Aktionsmodelle beschränkt.' : ''}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Product count ───────────────────────────────────────── */}
      <div className="px-5 lg:px-16 pt-5 lg:pt-6 pb-2">
        <p className="text-[11px] text-black/20 font-light">{filtered.length} {filtered.length === 1 ? 'Modell' : 'Modelle'}</p>
      </div>

      {/* ── Product Grid (LV style, 4-col, compact cards) ────── */}
      {/* Randlos auf dem Telefon: die Bilder tragen die Seite bis an die
          Displaykante, wie in den Apps der großen Häuser. Erst ab lg gibt es
          wieder Seitenränder, sonst würde das Raster auf großen Schirmen
          auseinanderlaufen. */}
      <div className="px-0 lg:px-24 xl:px-32 pb-16">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            {shoes.length === 0 && backendStatus === 'loading' && (
              <>
                <div className="w-6 h-6 border border-black/15 border-t-black/50 rounded-full animate-spin-custom mb-4" />
                <p className="text-[14px] font-light text-black/40">Produkte werden geladen …</p>
              </>
            )}
            {shoes.length === 0 && backendStatus === 'error' && (
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
            {/* Schuhe sind geladen, diese Kategorie ist nur (noch) leer,
                niemals als Fehler darstellen. */}
            {(shoes.length > 0 || backendStatus === 'ok') && (
              <>
                <p className="text-[14px] font-light text-black/40">Diese Kategorie wird gerade kuratiert.</p>
                <p className="text-[12px] text-black/20 mt-2 font-light">Bald verfügbar.</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-px lg:gap-x-5 lg:gap-y-5">
            {filtered.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={selectShoe}
                isFav={favorites.includes(String(product.id))}
                onToggleFav={() => handleToggleFav(product.id)}
                isPromo={isPromo}
                dimmed={!fitsMeasurements(product.category)}
                campaign={activeCampaign}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── CTA Banner (CMS-controlled) ──────────────────────── */}
      <div className="px-5 lg:px-16 pb-16">
        <CtaBanner page="collection" />
      </div>
    </div>
  )
}
