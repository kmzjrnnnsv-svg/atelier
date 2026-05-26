import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { isNative } from '../App'
import { ArrowLeft, Heart, ShoppingBag, Check, Star, ChevronDown, ChevronUp, Send, ScanLine, BellRing, Lock, ShieldCheck, Box, ZoomIn, ZoomOut, RotateCcw, Share2, Eye, Plus, Ruler, Footprints, Layers, CircleDashed, Diamond, CircleDot, Square, Gem, Palette, Sparkles, ArrowRightLeft } from 'lucide-react'

// Lucide-Icon-Lookup pro option_groups.icon (Lucide-Komponentenname)
const GROUP_ICONS = {
  Footprints, Layers, CircleDashed, ChevronUp, Diamond, CircleDot, Square, Gem,
  Palette, Sparkles, ArrowRightLeft,
}

// Leisten-Zehenform als Draufsicht-Silhouette. Visualisiert die Unterschiede
// zwischen Zurigo (rund), Monti (leicht eckig), Savile (Chisel) und
// Belgravia (scharfe Chisel). Wird angezeigt, wenn kein echtes Foto
// hochgeladen wurde.
const LAST_SHAPES = {
  zurigo:    'M9 56 L9 24 Q9 6 21 6 Q33 6 33 24 L33 56 Z',          // runde Spitze
  monti:     'M9 56 L9 22 Q9 9 15 8 L27 8 Q33 9 33 22 L33 56 Z',     // leicht eckig
  savile:    'M10 56 L10 18 L16 7 L26 7 L32 18 L32 56 Z',           // Chisel
  belgravia: 'M12 56 L12 17 L17 5 L25 5 L30 17 L30 56 Z',           // scharfe Chisel
}
function LastShapeIcon({ shapeKey, active }) {
  const path = LAST_SHAPES[shapeKey]
  if (!path) return null
  return (
    <svg viewBox="0 0 42 62" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <path d={path} fill={active ? '#1a1a1a' : '#d4cfc7'} stroke={active ? '#1a1a1a' : '#b8b2a8'} strokeWidth="1" />
      {/* feine Naht-Andeutung an der Spitze */}
      <path d={path} fill="none" stroke={active ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.4)'} strokeWidth="0.5" transform="scale(0.82) translate(4.5 6)" />
    </svg>
  )
}
import useStore from '../store/store'

// Relative Bild-URLs (/uploads/…) gegen die API-Base auflösen, base64/http
// bleiben unverändert.
const IMG_API_BASE = import.meta.env.VITE_API_URL || ''
const resolveImg = (url) => {
  if (!url) return url
  if (url.startsWith('http') || url.startsWith('data:')) return url
  return `${IMG_API_BASE}${url}`
}
import { apiFetch } from '../hooks/useApi'
import { useAuth } from '../context/AuthContext'
import ShoeName, { cleanShoeName } from '../lib/shoeName'
import CustomRequestModal from '../components/CustomRequestModal'

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
  const { favorites, toggleFavorite, latestScan, addReminder, hasReminder, removeReminder, shoeMaterials, shoeColors, shoeSoles, addToCart, cart, accessories: allAccessories, shoes, footMeasurements, saveFootMeasurements, matchFit } = useStore()
  const { user } = useAuth()

  // Schuh-Auflösung mit mehreren Fallbacks, damit product IMMER eine echte
  // id + category hat (sonst fehlen Whitelist und Optionsschritte):
  //  1) location.state.product (normale Navigation)
  //  2) ?id=-URL → Schuh aus dem Store
  //  3) erster echter Schuh aus dem Store (z. B. Direktaufruf /customize)
  //  4) Fake-Default nur, solange der Store noch leer ist
  const urlShoeId = new URLSearchParams(location.search).get('id')
  const product = location.state?.product
    || (urlShoeId && shoes?.find(s => String(s.id) === String(urlShoeId)))
    || (shoes && shoes.length > 0 ? shoes[0] : null)
    || {
      name: 'The Heritage Oxford', price: '€ 1.450', material: 'Full-Grain Calfskin',
      match: '99.4%', color: '#1f2937', image: null,
    }
  const category = product.category || 'OXFORD'

  // Frontend-Whitelist nach Kategorie, greift auch ohne Backend-Daten,
  // damit z. B. Oxford nie Patina/Velvet zeigt.
  const MATRIX_MATERIALS_BY_CAT = {
    OXFORD:           ['lux_calf', 'lux_suede', 'painted_full_grain', 'box_calf', 'urban_suede', 'painted_calf'],
    WHOLECUT:         ['lux_calf', 'lux_suede', 'painted_full_grain', 'patina', 'box_calf', 'urban_suede', 'painted_calf'],
    LOAFER:           ['lux_calf', 'lux_suede', 'painted_full_grain', 'box_calf', 'urban_suede', 'painted_calf'],
    DERBY:            ['lux_calf', 'lux_suede', 'painted_full_grain', 'box_calf', 'urban_suede', 'painted_calf'],
    DOUBLE_MONK:      ['lux_calf', 'lux_suede', 'painted_full_grain', 'box_calf', 'urban_suede', 'painted_calf'],
    MONK:             ['lux_calf', 'lux_suede', 'painted_full_grain', 'box_calf', 'urban_suede', 'painted_calf'],
    CHELSEA:          ['lux_calf', 'box_calf', 'velvet', 'painted_full_grain', 'urban_suede', 'painted_calf'],
    BOOT:             ['lux_calf', 'box_calf', 'velvet', 'painted_full_grain', 'urban_suede', 'painted_calf'],
    BALMORAL:         ['lux_calf', 'box_calf', 'velvet', 'painted_full_grain', 'urban_suede', 'painted_calf'],
    JODHPUR:          ['lux_calf', 'box_calf', 'velvet', 'painted_full_grain', 'urban_suede', 'painted_calf'],
    CHUKKA:           ['lux_calf', 'box_calf', 'velvet', 'painted_full_grain', 'urban_suede', 'painted_calf'],
    BELGIAN_SLIPPER:  ['lux_calf', 'box_calf', 'velvet', 'painted_full_grain', 'urban_suede', 'painted_calf'],
    WELLINGTON:       ['lux_calf', 'box_calf', 'velvet', 'painted_full_grain', 'urban_suede', 'painted_calf'],
    DRAKE:            ['lux_calf', 'box_calf', 'velvet', 'painted_full_grain', 'urban_suede', 'painted_calf'],
    SNEAKER:          ['lux_suede'],
    SNEAKER_LACED:    ['lux_suede'],
    SNEAKER_BOOT:     ['lux_suede'],
    LACELESS_TRAINER: ['lux_suede'],
  }
  const availableSoles = getSolesForCategory(shoeSoles, category)

  // Per-Schuh konfigurierte Farben/Materialien (vom CMS gepflegt). Sind sie
  // gesetzt, ersetzen sie die globalen Listen, der Konfigurator zeigt nur
  // genau das, was der Admin für DIESEN Schuh freigegeben hat.
  const [perShoeMaterialKeys, setPerShoeMaterialKeys] = useState(null)   // null=loading, []=keine Beschränkung
  const [perShoeColorVariants, setPerShoeColorVariants] = useState(null) // null=loading
  // Dynamische Konfigurator-Gruppen (Last, Welt, Heel, Toe, Schnalle, …)
  // Mit eigenem System verwaltet, Material/Color/Sole bleiben separat.
  const [extraOptionGroups, setExtraOptionGroups] = useState([])
  const [selectedExtras, setSelectedExtras] = useState({}) // { group_key: option_id }

  useEffect(() => {
    if (product?.id) {
      apiFetch(`/api/shoes/${product.id}/materials`)
        .then(keys => setPerShoeMaterialKeys(Array.isArray(keys) ? keys : []))
        .catch(() => setPerShoeMaterialKeys([]))
      apiFetch(`/api/shoes/${product.id}/colors`)
        .then(rows => setPerShoeColorVariants(Array.isArray(rows) ? rows : []))
        .catch(() => setPerShoeColorVariants([]))
    } else {
      setPerShoeMaterialKeys([])
      setPerShoeColorVariants([])
    }

    // Material/Color haben eigene Spezial-UIs. `last` (Schuhform) entfällt als
    // manueller Schritt, die Leistenform wird über die Fußmaße automatisch
    // ermittelt (Auto-Match) und nur dezent im Checkout gezeigt.
    const filterGroups = (groups) =>
      (Array.isArray(groups) ? groups : []).filter(g => !['material', 'color', 'last'].includes(g.key))

    // Optionen laden: zuerst per-Schuh, bei leer → Kategorie-Vorlage.
    const loadOptions = async () => {
      let raw = []
      if (product?.id) raw = await apiFetch(`/api/shoes/${product.id}/options`).catch(() => [])
      let list = filterGroups(raw)
      if (list.length === 0 && category) {
        raw = await apiFetch(`/api/category-templates/${category}/config`).catch(() => [])
        list = filterGroups(raw)
      }
      // 'last' (Schuhform) separat halten — wird fit-gesteuert eingeblendet.
      setLastGroup((Array.isArray(raw) ? raw : []).find(g => g.key === 'last') || null)
      setExtraOptionGroups(list)
      setSelectedExtras({})  // keine Auto-Defaults: User klickt jeden Schritt
    }
    loadOptions()
  }, [product?.id, category])

  // Summe der Extra-Aufpreise
  const extrasPriceTotal = extraOptionGroups.reduce((sum, g) => {
    const sel = g.values.find(v => v.id === selectedExtras[g.key])
    return sum + (sel?.price_extra || 0)
  }, 0)

  // Daten aus dem Store (mit Fallback)
  // Nur als verfügbar markierte Materialien (available !== 0) anzeigen,
  // Legacy-Einträge wie CALFSKIN/SUEDE/PATENT sind im Seed deaktiviert.
  const globalMatList = shoeMaterials.length
    ? shoeMaterials.filter(m => m.available !== 0)
    : [{ id: 1, key: 'calfskin', label: 'Kalbsleder', sub: 'Full-Grain', color: '#b45309', available: 1, tip: 'Robust und langlebig.', rating: 'good' }]
  // Schritt 0 (neu): Familie wählen, Aesthetic vs. Durable.
  // Die Materialliste wird nach dieser Wahl gefiltert.
  // Backend-Whitelist hat Vorrang; sonst greift die Kategorie-Whitelist.
  const catWhitelist = MATRIX_MATERIALS_BY_CAT[category]
  const baseMatList = perShoeMaterialKeys && perShoeMaterialKeys.length > 0
    ? globalMatList.filter(m => perShoeMaterialKeys.includes(m.key))
    : (catWhitelist
        ? globalMatList.filter(m => catWhitelist.includes(m.key))
        : globalMatList)

  // Per-Schuh Farb-Varianten haben Vorrang. Mehrere Varianten können denselben
  // Farbnamen haben (eine pro Material). Wir gruppieren nach (name, hex), und
  // wählen pro Farbe später dynamisch die Bilder anhand des selektierten
  // Materials (selMat).
  // Auswahl-States müssen vor den Listen deklariert werden, damit der
  // Material-basierte Farb-Filter sie referenzieren kann.
  // Familie (Schritt 0), Aesthetic vs. Durable. Pre-Filter für matList.
  const [selFamily, setSelFamily] = useState('')
  const [selMat,  setSelMat]  = useState('')
  const [selCol,  setSelCol]  = useState('')
  const [selSole, setSelSole] = useState('')
  const [added,   setAdded]   = useState(false)

  // Materialien nach Familie filtern. Wenn ein Schuh nur Materialien einer
  // Familie hat (z. B. Sneaker → nur Lux Suede), wird die Familie automatisch
  // gesetzt und die Familienwahl entfällt.
  const familiesPresent = [...new Set(baseMatList.map(m => m.family).filter(Boolean))]
  const matList = selFamily
    ? baseMatList.filter(m => m.family === selFamily)
    : baseMatList

  useEffect(() => {
    if (familiesPresent.length === 1 && !selFamily) {
      setSelFamily(familiesPresent[0])
    } else if (familiesPresent.length > 1 && selFamily && !familiesPresent.includes(selFamily)) {
      setSelFamily('')
    }
  }, [familiesPresent.join(',')])

  // Globale Farben können per `applicable_materials` an einzelne Material-
  // Typen gebunden sein (z. B. Velvet-Farben nur bei Material 'velvet').
  // Wir filtern, sobald der Nutzer ein Material gewählt hat.
  const colorMatchesMaterial = (c, matKey) => {
    if (!c.applicable_materials || c.applicable_materials === '*') return true
    if (!matKey) return true
    return c.applicable_materials.split(',').map(s => s.trim()).includes(matKey)
  }

  const filteredGlobalColors = shoeColors.filter(c => colorMatchesMaterial(c, selMat))

  const colList = perShoeColorVariants && perShoeColorVariants.length > 0
    ? (() => {
        const groups = new Map()
        perShoeColorVariants.forEach(v => {
          const key = `${v.name}::${v.hex}`
          if (!groups.has(key)) groups.set(key, {
            id: v.id, key: `cms-${key}`, hex: v.hex, name: v.name,
            available: 1, rating: 'good',
            buckets: [],
          })
          groups.get(key).buckets.push({ material_key: v.material_key || null, images: v.images || [] })
        })
        return [...groups.values()]
      })()
    : (filteredGlobalColors.length ? filteredGlobalColors : [
        { id: 1, key: 'schwarz', hex: '#000000', name: 'Schwarz', available: 1, rating: 'good' },
      ])
  const soleList = availableSoles.length ? availableSoles : [
    { id: 1, key: 'rubber-grip', label: 'Anti-Rutsch', sub: 'Gummi', description: 'Profilsohle mit Grip.', price_extra: 35, rating: 'good', recommended: 1 },
  ]

  // Size selection: 'fit' (auto-match via Fußmaße), 'standard' (manueller
  // Notausgang), 'custom' (3D scan, Legacy)
  const [sizeType, setSizeType] = useState('')
  const [selectedSize, setSelectedSize] = useState('')
  // Maßanfertigungs-Anfragemodal (Pflicht: Telefon + WhatsApp Business)
  const [customRequestOpen, setCustomRequestOpen] = useState(false)
  const EU_SIZES = ['39', '39.5', '40', '40.5', '41', '41.5', '42', '42.5', '43', '43.5', '44', '44.5', '45', '46']

  // ── Passform (Auto-Match) ────────────────────────────────────────────────
  // Aus den gespeicherten Fußmaßen + fit_adjust ermittelt das System still die
  // best-passende Leisten×Weite×Größe. KEIN sichtbarer Auswahlschritt.
  const [fitMatches, setFitMatches] = useState([])      // alle passenden Leisten (gerankt)
  const [chosenLast, setChosenLast] = useState(null)    // vom Nutzer/Auto gewählter last_key
  const [lastGroup, setLastGroup]   = useState(null)    // 'last'-Optionsgruppe des Schuhs (Schuhform)
  const [fitState, setFitState] = useState('idle')      // 'idle'|'matching'|'matched'|'nomatch'
  // Global im CMS gepflegte Produktseiten-Texte (Familien, Lieferumfang, Badges).
  const [pageTexts, setPageTexts] = useState(null)
  useEffect(() => {
    apiFetch('/api/settings/product-texts').then(t => setPageTexts(t || null)).catch(() => {})
  }, [])
  const [showSizeEscape, setShowSizeEscape] = useState(false) // versteckter EU-Grid-Notausgang
  // Lokale Maß-Eingabe (falls noch keine Maße gespeichert)
  const [measLen, setMeasLen] = useState('')
  const [measGirth, setMeasGirth] = useState('')
  const [measSaving, setMeasSaving] = useState(false)
  const [measOpen, setMeasOpen] = useState(false)   // Inline-Maßeingabe an der Passgenauigkeit

  useEffect(() => {
    let cancelled = false
    if (!footMeasurements?.foot_length_mm || !footMeasurements?.ball_girth_mm) {
      setFitMatches([]); setChosenLast(null); setFitState('idle')
      return
    }
    const adj = footMeasurements.fit_adjust || { length_mm: 0, girth_mm: 0 }
    const effLen = footMeasurements.foot_length_mm + (adj.length_mm || 0)
    const effGirth = footMeasurements.ball_girth_mm + (adj.girth_mm || 0)
    setFitState('matching')
    matchFit({ category, length: effLen, girth: effGirth, tolerance: 5 })
      .then(matches => {
        if (cancelled) return
        const top = matches[0]
        if (!top) { setFitMatches([]); setChosenLast(null); setFitState('nomatch'); return }
        setFitMatches(matches)
        setChosenLast(top.last_key)
        setSizeType('fit')
        setSelectedSize(top.size_label)
        setFitState('matched')
        // Ermittelte Passform still im Profil als saved_fit hinterlegen.
        saveFootMeasurements({
          foot_length_mm: footMeasurements.foot_length_mm,
          ball_girth_mm: footMeasurements.ball_girth_mm,
          fit_adjust: adj,
          saved_fit: {
            last_key: top.last_key, last_label: top.last_label,
            width: top.width, size_system: top.size_system, size_label: top.size_label,
            set_at: new Date().toISOString(),
          },
        }).catch(() => {})
      })
      .catch(() => { if (!cancelled) { setFitMatches([]); setChosenLast(null); setFitState('nomatch') } })
    return () => { cancelled = true }
  }, [footMeasurements?.foot_length_mm, footMeasurements?.ball_girth_mm, footMeasurements?.fit_adjust?.length_mm, footMeasurements?.fit_adjust?.girth_mm, category])

  // Abgeleitet: beste Leiste je last_key, verfügbare (passende) Schuhformen,
  // und der aktuell gewählte Fit. selectedFit folgt der gewählten Schuhform.
  const bestPerLast = (() => { const m = new Map(); for (const x of fitMatches) if (!m.has(x.last_key)) m.set(x.last_key, x); return m })()
  const availableLasts = (() => {
    const vals = lastGroup?.values || []
    const fromShoe = vals
      .filter(v => bestPerLast.has(v.key))
      .map(v => ({ id: v.id, key: v.key, label: v.label, description: v.description, image: v.image, match: bestPerLast.get(v.key) }))
    const list = fromShoe.length
      ? fromShoe
      : [...bestPerLast.values()].map(mt => ({ id: 'last-' + mt.last_key, key: mt.last_key, label: mt.last_label, description: '', image: null, match: mt }))
    return list.sort((a, b) => (b.match.fitPercent || 0) - (a.match.fitPercent || 0))
  })()
  const selectedFit = chosenLast ? (bestPerLast.get(chosenLast) || null) : null

  // Falls die automatisch gewählte Leiste nicht unter den (Schuh-)verfügbaren ist,
  // auf die best-passende verfügbare umschalten.
  useEffect(() => {
    if (fitState !== 'matched') return
    if (availableLasts.length && !availableLasts.some(v => v.key === chosenLast)) {
      setChosenLast(availableLasts[0].key)
    }
  }, [fitState, availableLasts.map(v => v.key).join(','), chosenLast])

  // Maßeingabe öffnen, mit gespeicherten Werten vorbefüllen (zum Ändern).
  const openMeasEdit = () => {
    setMeasLen(footMeasurements?.foot_length_mm ? String(footMeasurements.foot_length_mm) : '')
    setMeasGirth(footMeasurements?.ball_girth_mm ? String(footMeasurements.ball_girth_mm) : '')
    setMeasOpen(true)
  }

  const saveMeasurements = async () => {
    const len = parseFloat(String(measLen).replace(',', '.'))
    const girth = parseFloat(String(measGirth).replace(',', '.'))
    if (!Number.isFinite(len) || !Number.isFinite(girth)) return
    setMeasSaving(true)
    try {
      await saveFootMeasurements({ foot_length_mm: len, ball_girth_mm: girth })
      setMeasLen(''); setMeasGirth(''); setMeasOpen(false)
    } catch {} finally { setMeasSaving(false) }
  }

  // Step-by-step guided flow: 0=nothing, 1=leather chosen, 2=color chosen, 3=sole chosen
  // Sohle ist pro Schuhmodell vorkonfiguriert (kein User-Step mehr).
  // selSole wird automatisch beim Laden gesetzt, configStep richtet sich
  // nach Material + Farbe + Extra-Konfigurator.
  const configStep = selCol ? 3 : selMat ? 1 : 0

  // Refs for scroll forwarding between panels
  const outerRef = useRef(null)
  const rightPanelRef = useRef(null)
  const leftPanelRef = useRef(null)
  const [rightFullyScrolled, setRightFullyScrolled] = useState(false)
  const [selectedAccessories, setSelectedAccessories] = useState([])
  const [duplicateDialog, setDuplicateDialog] = useState(false)

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
    const restored = []
    let el = outerRef.current?.parentElement
    while (el) {
      const style = getComputedStyle(el)
      // Make every intermediate wrapper fill its parent height
      if (!el.style.height || el.style.height === 'auto') {
        el.style.height = '100%'
        const ref = el
        restored.push(() => { ref.style.height = '' })
      }
      if (style.overflow === 'auto' || style.overflowY === 'auto') {
        el.style.overflow = 'hidden'
        const ref = el
        restored.push(() => { ref.style.overflow = '' })
      }
      el = el.parentElement
    }
    return () => restored.forEach(fn => fn())
  }, [])

  // Sequential scroll: right panel first, then left panel.
  // Both panels are set to overflow:hidden so we have full control.
  useEffect(() => {
    if (window.innerWidth < 1024) return
    const wrapper = outerRef.current
    const rp = rightPanelRef.current
    const lp = leftPanelRef.current
    if (!wrapper || !rp || !lp) return

    rp.style.overflowY = 'hidden'
    lp.style.overflowY = 'hidden'

    const clamp = (el, delta) => {
      const max = el.scrollHeight - el.clientHeight
      el.scrollTop = Math.max(0, Math.min(max, el.scrollTop + delta))
    }

    const scroll = (delta) => {
      const rpMax = rp.scrollHeight - rp.clientHeight
      const lpMax = lp.scrollHeight - lp.clientHeight

      if (delta > 0) {
        if (rp.scrollTop < rpMax - 1) { clamp(rp, delta) }
        else { clamp(lp, delta) }
      } else {
        if (lp.scrollTop > 1) { clamp(lp, delta) }
        else { clamp(rp, delta) }
      }
    }

    const onWheel = (e) => {
      e.preventDefault()
      scroll(e.deltaY)
    }

    let touchY0 = 0
    const onTouchStart = (e) => { touchY0 = e.touches[0].clientY }
    const onTouchMove = (e) => {
      e.preventDefault()
      const y = e.touches[0].clientY
      scroll(touchY0 - y)
      touchY0 = y
    }

    wrapper.addEventListener('wheel', onWheel, { passive: false, capture: true })
    wrapper.addEventListener('touchstart', onTouchStart, { passive: true, capture: true })
    wrapper.addEventListener('touchmove', onTouchMove, { passive: false, capture: true })
    return () => {
      rp.style.overflowY = ''
      lp.style.overflowY = ''
      wrapper.removeEventListener('wheel', onWheel, { capture: true })
      wrapper.removeEventListener('touchstart', onTouchStart, { capture: true })
      wrapper.removeEventListener('touchmove', onTouchMove, { capture: true })
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
  // Wenn nur ein Material verfügbar ist: automatisch wählen (Leder-Sektion entfällt).
  useEffect(() => {
    if (matList.length === 1 && !selMat) {
      setSelMat(matList[0].key)
    } else if (matList.length > 1 && selMat && !matList.find(m => m.key === selMat)) {
      setSelMat('')
    }
  }, [matList])
  useEffect(() => {
    if (shoeColors.length && selCol && !shoeColors.find(c => c.key === selCol)) setSelCol('')
  }, [shoeColors])
  useEffect(() => {
    // Sohle ist nicht mehr user-selectable: automatisch die KOSTENLOSE Sohle
    // wählen (price_extra 0), damit kein versteckter +35€-Aufpreis entsteht.
    // Die eigentliche Sohlen-Konfiguration läuft über „Sohle Unten" (Matrix).
    if (availableSoles.length && !selSole) {
      const freeSole = availableSoles.find(s => (s.price_extra || 0) === 0) || availableSoles[0]
      if (freeSole?.key) setSelSole(freeSole.key)
    } else if (availableSoles.length && selSole && !availableSoles.find(s => s.key === selSole)) {
      const fallback = availableSoles.find(s => (s.price_extra || 0) === 0) || availableSoles[0]
      if (fallback?.key) setSelSole(fallback.key)
    }
  }, [shoeSoles, category])

  const mat      = matList.find(m => m.key === selMat) || matList[0]
  const col      = colList.find(c => c.key === selCol) || colList[0]

  // Zubehör wird nach gewählter Lederart empfohlen (nicht mehr pro Schuhmodell):
  // material_keys '*'/leer = universell; sonst muss das gewählte Material (selMat)
  // enthalten sein. Zusätzlich optionale Farb-Zuordnung (z. B. schwarzer Spanner
  // nur bei schwarzen Schuhen).
  const matMatchesAccessory = (a) => {
    const mk = (a.material_keys || '').trim()
    if (!mk || mk === '*') return true
    if (!selMat) return false
    return mk.split(',').map(s => s.trim()).includes(selMat)
  }
  const colorMatchesAccessory = (a) => {
    const cm = (a.color_match || '').trim()
    if (!cm) return true
    const name = (col?.name || '').toLowerCase()
    if (!name) return false
    return cm.split(',').map(s => s.trim().toLowerCase()).filter(Boolean).some(kw => name.includes(kw))
  }
  const accessories = (Array.isArray(allAccessories) ? allAccessories : [])
    .filter(a => a.is_active !== 0 && matMatchesAccessory(a) && colorMatchesAccessory(a))
    .map(a => ({
      id: a.id,
      name: a.name,
      price: parseFloat(a.price) || 0,
      image: a.image_data || null,
      color: a.color || '#888',
    }))

  // Auswahl bereinigen, wenn nach Material-/Farbwechsel ein gewähltes Zubehör
  // nicht mehr angezeigt wird.
  useEffect(() => {
    const visible = new Set(accessories.map(a => a.id))
    setSelectedAccessories(prev => {
      const next = prev.filter(id => visible.has(id))
      return next.length === prev.length ? prev : next
    })
  }, [selMat, selCol])

  // Aktive Bild-Galerie für die Farbe, abhängig vom gewählten Material:
  // 1) Material-spezifischer Bucket (material_key === mat.key)
  // 2) Fallback: Default-Bucket (material_key === null)
  // 3) Fallback: legacy `col.images` (wenn keine Buckets vorhanden)
  const currentImages = (() => {
    if (!col) return []
    if (col.buckets) {
      const matBucket = col.buckets.find(b => b.material_key === mat?.key)
      if (matBucket?.images?.length) return matBucket.images
      const defBucket = col.buckets.find(b => b.material_key === null)
      if (defBucket?.images?.length) return defBucket.images
      return col.buckets[0]?.images || []
    }
    return col.images || []
  })()
  const sole     = soleList.find(s => s.key === selSole) || soleList[0]
  const color    = col?.hex || product.color
  const isFav    = favorites.includes(String(product.id))
  const avg      = reviews.length ? reviews.reduce((s,r) => s + r.rating, 0) / reviews.length : 0
  const myRev    = reviews.find(r => r.user_id === user?.id)

  // Preis: Basispreis aus DB + Sohle-Aufpreis + Zubehör
  const isPromo = !!user?.is_promotion
  const promoDiscountPct = user?.promotion_discount_pct || 0
  const effectivePrice = isPromo && product.promotion_price ? product.promotion_price : product.price
  const basePrice = parseFloat(String(effectivePrice).replace(/[^0-9.,]/g, '').replace('.', '').replace(',', '.')) || 0
  const soleExtra = sole?.price_extra || 0
  const accessoryTotal = selectedAccessories.reduce((sum, id) => {
    const acc = accessories.find(a => a.id === id)
    return sum + (acc?.price || 0)
  }, 0)
  const accDiscount = isPromo && promoDiscountPct > 0 ? Math.round(accessoryTotal * promoDiscountPct / 100) : 0
  const totalPrice = basePrice + soleExtra + accessoryTotal - accDiscount
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

  const chosenEU = sizeType === 'fit'
    ? selectedFit?.size_label
    : sizeType === 'custom'
      ? latestScan?.eu_size
      : selectedSize
  // Maße, die fürs Auto-Matching verwendet wurden (für Bestellung/Manufaktur)
  const footMeasurementsUsed = footMeasurements?.foot_length_mm
    ? { foot_length_mm: footMeasurements.foot_length_mm, ball_girth_mm: footMeasurements.ball_girth_mm }
    : null
  // Steht eine Größe fest? (Auto-Match, manueller Notausgang oder Legacy-Scan)
  const fitReady = (sizeType === 'fit' && !!selectedFit)
    || (sizeType === 'standard' && !!selectedSize)
    || sizeType === 'custom'
  // Maße vorhanden, aber kein Treffer & kein manueller Override → Maßanfertigung
  const needsCustomRequest = (fitState === 'nomatch' && sizeType !== 'standard') || sizeType === 'custom'
  // Extras als lesbare Liste mit Aufpreissumme, wird in der Bestellung
  // mitgeführt, damit Admin & Manufaktur die Spezifikation sehen.
  const extrasForCart = extraOptionGroups
    .map(g => {
      const sel = g.values.find(v => v.id === selectedExtras[g.key])
      return sel ? { group: g.label, key: g.key, value: sel.label, price: sel.price_extra || 0 } : null
    })
    .filter(Boolean)
  const addShoeToCart = () => {
    addToCart({
      shoeId: product.id, name: cleanShoeName(product.name),
      material: mat?.label || product.material,
      color, price: formatPrice(basePrice + soleExtra + extrasPriceTotal),
      sole: sole?.label || 'Sohle',
      image: product.image,
      sizeType, euSize: chosenEU,
      last: selectedFit?.last_key || null,
      lastLabel: selectedFit?.last_label || null,
      width: selectedFit?.width || null,
      sizeSystem: selectedFit?.size_system || 'EU',
      footMeasurementsUsed,
      extras: extrasForCart,
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

    if (sameConfig && selectedAccessories.length === 0) {
      // Schuh schon drin, kein Zubehör mehr → zum Warenkorb
      navigate('/checkout')
      return
    }

    // Neue Konfiguration → normal hinzufügen
    addShoeToCart()
    addAccessoriesToCart()
    setSelectedAccessories([])
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const handleDuplicateChoice = (includeShoe) => {
    if (includeShoe) addShoeToCart()
    addAccessoriesToCart()
    setSelectedAccessories([])
    setDuplicateDialog(false)
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
          id: product.id, name: cleanShoeName(product.name),
          material: mat?.label || product.material,
          color, price: formatPrice(basePrice + soleExtra),
          sole: sole?.label || 'Sohle',
          sizeType, euSize: chosenEU,
          last: selectedFit?.last_key || null,
          lastLabel: selectedFit?.last_label || null,
          width: selectedFit?.width || null,
          sizeSystem: selectedFit?.size_system || 'EU',
          footMeasurementsUsed,
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
          <p className="text-[11px] lg:text-[13px] font-normal text-black" style={{ letterSpacing: '0.18em', textTransform: 'uppercase' }}>{cleanShoeName(product.name)}</p>
        </div>
        <div className="flex items-center gap-1">
          <button className="w-10 h-10 flex items-center justify-center border-0 bg-transparent">
            <Share2 size={17} className="text-black" strokeWidth={1.5} />
          </button>
          <button
            onClick={async () => {
              if (!user) {
                navigate('/login', { state: { from: location.pathname + location.search } })
                return
              }
              const result = await toggleFavorite(product.id)
              if (result === 'unauthenticated') {
                navigate('/login', { state: { from: location.pathname + location.search } })
              }
            }}
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
              {(currentImages[0] || product.image) ? (
                <img src={currentImages[0] || product.image} alt={product.name} className="w-full h-full object-cover" />
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
              {(pageTexts?.delivery_items?.length ? pageTexts.delivery_items : [
                'Handgefertigte Schuhe',
                'Schuhbeutel aus Baumwolle',
                'Schuhspanner aus Zedernholz',
                'Pflegeanleitung',
              ]).map((item) => (
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
                    {isPromo && promoDiscountPct > 0 ? (
                      <div className="flex items-center gap-1.5 px-0.5">
                        <span className="text-[11px] text-black/25 line-through">€{acc.price}</span>
                        <span className="text-[11px] text-black/60">€{Math.round(acc.price * (1 - promoDiscountPct / 100))}</span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-black/35 px-0.5">€{acc.price}</p>
                    )}
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
            <p className="text-[13px] lg:text-[22px] font-light text-black leading-tight"><ShoeName name={product.name} /></p>
            {product.tagline && (
              <p className="text-[11px] lg:text-[13px] text-black/45 font-light mt-1 leading-snug">{product.tagline}</p>
            )}
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
                {fitState === 'matched' && selectedFit?.fitPercent != null ? (
                  <span className="flex items-center gap-2">
                    <span className="text-[11px] lg:text-[12px] font-medium text-black">{String(selectedFit.fitPercent).replace('.', ',')} %</span>
                    <button type="button" onClick={openMeasEdit} className="text-[10px] text-black/40 hover:text-black/70 underline underline-offset-2 bg-transparent border-0 p-0">ändern</button>
                  </span>
                ) : fitState === 'matching' ? (
                  <span className="text-[11px] lg:text-[12px] text-black/35">wird berechnet …</span>
                ) : fitState === 'nomatch' && footMeasurements?.foot_length_mm ? (
                  <span className="flex items-center gap-2">
                    <span className="text-[11px] lg:text-[12px] text-black/55">keine Standard-Passform</span>
                    <button type="button" onClick={openMeasEdit} className="text-[10px] text-black/40 hover:text-black/70 underline underline-offset-2 bg-transparent border-0 p-0">Maße ändern</button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={openMeasEdit}
                    className="text-[11px] lg:text-[12px] text-black/55 underline underline-offset-2 bg-transparent border-0 p-0"
                  >
                    Maße eingeben
                  </button>
                )}
              </div>
              {fitState === 'matched' && selectedFit?.last_label && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] lg:text-[11px] text-black/40" style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}>Leiste</span>
                  <span className="text-[11px] lg:text-[12px] font-medium text-black">{selectedFit.last_label} {selectedFit.width}</span>
                </div>
              )}
            </div>

            {/* Test-Detail: Leisten-Sollmaße vs. Fußmaße (zur Überprüfung) */}
            {fitState === 'matched' && selectedFit?.foot_length_mm != null && footMeasurements?.foot_length_mm && (
              <div className="mt-2 max-w-md">
                <table className="w-full text-[10px] text-black/45 font-light border-collapse">
                  <thead>
                    <tr className="text-black/35" style={{ letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      <th className="text-left font-normal py-1 pr-2"></th>
                      <th className="text-right font-normal py-1 px-2">Ihre Maße</th>
                      <th className="text-right font-normal py-1 px-2">Leiste {selectedFit.last_label} {selectedFit.width}</th>
                      <th className="text-right font-normal py-1 pl-2">Abweichung</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-black/10">
                      <td className="text-left py-1 pr-2">Länge</td>
                      <td className="text-right py-1 px-2 tabular-nums">{footMeasurements.foot_length_mm} mm</td>
                      <td className="text-right py-1 px-2 tabular-nums">{selectedFit.foot_length_mm} mm</td>
                      <td className="text-right py-1 pl-2 tabular-nums">{selectedFit.deltaLength > 0 ? '+' : ''}{String(selectedFit.deltaLength).replace('.', ',')} mm</td>
                    </tr>
                    <tr className="border-t border-black/10">
                      <td className="text-left py-1 pr-2">Ballenumfang</td>
                      <td className="text-right py-1 px-2 tabular-nums">{footMeasurements.ball_girth_mm} mm</td>
                      <td className="text-right py-1 px-2 tabular-nums">{selectedFit.ball_girth_mm} mm</td>
                      <td className="text-right py-1 pl-2 tabular-nums">{selectedFit.deltaGirth > 0 ? '+' : ''}{String(selectedFit.deltaGirth).replace('.', ',')} mm</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Nomatch: gespeicherte Maße bleiben sichtbar (zur Kontrolle/Änderung) */}
            {fitState === 'nomatch' && footMeasurements?.foot_length_mm && (
              <p className="text-[10px] text-black/40 font-light mt-1.5 leading-relaxed">
                Ihre gespeicherten Maße: {footMeasurements.foot_length_mm} mm Länge · {footMeasurements.ball_girth_mm} mm Ballenumfang.
                {' '}Für dieses Modell liegt keine Standard-Leiste in Ihrem Bereich — wir fertigen es als Maßanfertigung.
              </p>
            )}

            {/* Inline-Maßeingabe direkt an der Passgenauigkeit */}
            {measOpen && (
              <div className="mt-3 border border-black/10 p-3 max-w-md">
                <p className="text-[10px] text-black/40 font-light mb-2 leading-relaxed">
                  Zwei Maße genügen, ±0,5 cm sind völlig in Ordnung. Den passenden Leisten ermitteln wir automatisch.
                </p>
                <div className="flex items-end gap-2">
                  <label className="flex-1">
                    <span className="block text-[9px] text-black/35 uppercase tracking-wider mb-1">Fußlänge (mm)</span>
                    <input
                      type="number" inputMode="decimal" value={measLen}
                      onChange={(e) => setMeasLen(e.target.value)} placeholder="z. B. 270"
                      className="w-full h-9 px-2.5 border border-black/15 text-[13px] outline-none focus:border-black/40"
                    />
                  </label>
                  <label className="flex-1">
                    <span className="block text-[9px] text-black/35 uppercase tracking-wider mb-1">Ballenumfang (mm)</span>
                    <input
                      type="number" inputMode="decimal" value={measGirth}
                      onChange={(e) => setMeasGirth(e.target.value)} placeholder="z. B. 255"
                      className="w-full h-9 px-2.5 border border-black/15 text-[13px] outline-none focus:border-black/40"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={saveMeasurements}
                    disabled={measSaving || !measLen || !measGirth}
                    className="h-9 px-4 bg-black text-white text-[11px] tracking-[0.12em] uppercase border-0 disabled:opacity-30"
                  >
                    {measSaving ? '…' : 'Übernehmen'}
                  </button>
                </div>
                {footMeasurements?.foot_length_mm && (
                  <button type="button" onClick={() => setMeasOpen(false)} className="mt-2 text-[10px] text-black/35 hover:text-black/60 underline underline-offset-2 bg-transparent border-0 p-0">
                    Abbrechen
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="h-px bg-black/8 lg:my-4" />

          {/* ── Produktbeschreibung ────────────────────────────── */}
          <div className="px-5 py-4 lg:px-0 lg:py-2">
            <p className="text-[11px] lg:text-[12px] text-black/50 leading-[1.8]" style={{ letterSpacing: '0.02em' }}>
              {product.description || (
                <>
                  Jeder <span className="text-black/70">{product.name || 'Schuh'}</span> wird in unserer Manufaktur von Hand gefertigt, mit über 200 präzisen Arbeitsschritten.
                  Dank unserer <span className="text-black/70">3D-Fußvermessung</span> wird jedes Paar exakt auf Ihre Fußform zugeschnitten.
                  Ausgesuchtes europäisches Leder, durchgenähte Konstruktion und eine ergonomische Passform, die Sie vom ersten Schritt an spüren.
                </>
              )}
            </p>
            <div className="flex items-center gap-4 mt-3">
              {(pageTexts?.badges?.length ? pageTexts.badges : ['Handgenäht', 'Maßgefertigt', '200+ Schritte']).map((b, i, arr) => (
                <span key={b} className="flex items-center gap-4">
                  <span className="text-[9px] text-black/30" style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}>{b}</span>
                  {i < arr.length - 1 && <span className="text-black/10">·</span>}
                </span>
              ))}
            </div>
          </div>

          <div className="h-px bg-black/8 lg:my-2" />

          {/* ── Auswahl (step-by-step guided flow) ────────────── */}
          <div className="pt-4 pb-4 space-y-5 lg:space-y-6 lg:pt-0 lg:pb-0">

            {/* Step-Indicator (Leder/Farbe/Sohle) entfernt, der Konfigurator
                ist jetzt vollständig durch die dynamischen Optionsgruppen
                gesteuert; die Sektion „Leder" bleibt erhalten, aber ohne
                Top-Bar. */}
            {false && (
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
            )}

            {/* 0. Familie, Aesthetic vs. Durable. Nur sichtbar, wenn der
                Schuh beide Familien anbietet. */}
            {familiesPresent.length > 1 && (
            <div className="px-5 lg:px-0">
              <p className="text-[10px] lg:text-[11px] text-black/40 mb-2 flex items-center gap-2" style={{ letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                <span className="inline-flex items-center justify-center w-4 h-4 border border-black/30 text-[8px] font-normal">1</span>
                Qualitäts-Familie wählen
              </p>
              <p className="text-[10px] text-black/40 font-light leading-relaxed mb-4 max-w-2xl">
                {pageTexts?.family_intro ||
                  'Beide Familien genügen höchsten Qualitätsansprüchen und werden in der gleichen Manufaktur gefertigt. Sie unterscheiden sich nur in Charakter und Einsatzbereich.'}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {familiesPresent.includes('aesthetic') && (
                  <button
                    type="button"
                    onClick={() => { setSelFamily('aesthetic'); setSelMat(''); setSelCol('') }}
                    className={`text-left p-4 transition-all border ${
                      selFamily === 'aesthetic'
                        ? 'border-black bg-black/[0.02]'
                        : 'border-black/10 hover:border-black/30 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[12px] tracking-[0.18em] uppercase font-medium text-black">{pageTexts?.aesthetic_title || 'Aesthetic'}</p>
                      {selFamily === 'aesthetic' && <Check size={14} strokeWidth={2} className="text-black" />}
                    </div>
                    <p className="text-[11px] text-black/55 leading-relaxed font-light">
                      {pageTexts?.aesthetic_text ||
                        'Edelste Leder, Lux Calf, Lux Suede, Painted Full Grain, Patina und Samt. Maximale optische Veredelung mit handpatinierten Oberflächen. Ideal für formelle Anlässe und besondere Momente.'}
                    </p>
                  </button>
                )}
                {familiesPresent.includes('durable') && (
                  <button
                    type="button"
                    onClick={() => { setSelFamily('durable'); setSelMat(''); setSelCol('') }}
                    className={`text-left p-4 transition-all border ${
                      selFamily === 'durable'
                        ? 'border-black bg-black/[0.02]'
                        : 'border-black/10 hover:border-black/30 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[12px] tracking-[0.18em] uppercase font-medium text-black">{pageTexts?.durable_title || 'Durable'}</p>
                      {selFamily === 'durable' && <Check size={14} strokeWidth={2} className="text-black" />}
                    </div>
                    <p className="text-[11px] text-black/55 leading-relaxed font-light">
                      {pageTexts?.durable_text ||
                        'Robuste Leder, Box Calf, Urban Suede, Painted Calf und Painted Full Grain. Wetterfest, alltagstauglich und langlebig. Ideal für täglichen Einsatz und anspruchsvolle Bedingungen.'}
                    </p>
                  </button>
                )}
              </div>
            </div>
            )}

            {/* 1. Leder (Material), nur sichtbar, wenn mehr als 1 Material
                verfügbar. Bei einer einzigen Auswahl wird Material auto-
                gesetzt und der Block ausgeblendet.
                Zusätzlich: solange noch keine Qualitäts-Familie gewählt
                ist (und der Schuh beide anbietet), bleibt der Leder-Block
                samt allen Folgeschritten verborgen. */}
            {matList.length > 1 && (familiesPresent.length <= 1 || selFamily) && (
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
            )}

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

            {/* 3. Sohle, DEPRECATED (Sohle wird pro Schuhmodell vorkonfiguriert).
                Legacy-Picker bleibt im DOM, ist aber komplett ausgeblendet. */}
            {false && (
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
            )}

            {/* ── Remaining sections (visible after all steps) ── */}

            {/* ── Konfigurator-Extras (Schritt-für-Schritt) ─────────────
                Erst sichtbar, wenn Material+Farbe gewählt sind. Vor jedem
                Schritt ein Helper-Text; eine Option kann als „EMPFOHLEN"
                markiert sein, dann erscheint über der Auswahl ein Banner. */}
            {extraOptionGroups.map((group, gIdx) => {
              // Farb-Gruppen: passend zum gewählten Oberleder eine Farbe
              // empfehlen (z. B. schwarzes Oberleder → schwarze Sohlenfarbe).
              const isColorGroup = ['sole_color', 'inner_color', 'sole_bottom_color'].includes(group.key)
              const colorMatchRec = isColorGroup && col?.name
                ? group.values.find(v => {
                    const l = col.name.toLowerCase(), o = v.label.toLowerCase()
                    return l === o || l.includes(o) || o.includes(l)
                  })
                : null
              const recValue = colorMatchRec || group.values.find(v => v.recommended)
              const currentSelection = group.values.find(v => v.id === selectedExtras[group.key])
              // Step ist aktiv, wenn alle vorherigen Extras gewählt sind.
              const allBefore = extraOptionGroups.slice(0, gIdx).every(g => selectedExtras[g.key])
              const isActive = allBefore && configStep >= 3
              return (
              <div
                key={group.id}
                className="px-5 lg:px-0 mb-6 transition-all duration-500"
                style={{ opacity: isActive ? 1 : 0.3, pointerEvents: isActive ? 'auto' : 'none' }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] text-black/45 uppercase flex items-center gap-2" style={{ letterSpacing: '0.18em' }}>
                    <span className="inline-flex items-center justify-center w-4 h-4 border border-black/30 text-[8px] font-normal">
                      {gIdx + 1}
                    </span>
                    {(() => {
                      const Icon = GROUP_ICONS[group.icon]
                      return Icon ? <Icon size={12} strokeWidth={1.5} className="text-black/55" /> : null
                    })()}
                    {group.label}
                  </p>
                  {currentSelection && (
                    <span className="text-[10px] text-black/60 font-light tracking-wider">{currentSelection.label}</span>
                  )}
                </div>
                {group.helper_text && (
                  <p className="text-[10px] text-black/40 font-light leading-relaxed mb-3 max-w-2xl">{group.helper_text}</p>
                )}
                {recValue && (!currentSelection || currentSelection.id !== recValue.id) && (
                  <div className="flex items-start gap-2 mb-3 px-3 py-2 bg-green-50/60 border border-green-200/60">
                    <span className="text-[9px] text-green-700 tracking-wider uppercase font-medium flex-shrink-0">Empfohlen</span>
                    <span className="text-[10px] text-green-900/70 font-light leading-relaxed">
                      {colorMatchRec && colorMatchRec.id === recValue.id
                        ? `Passend zu Ihrem Oberleder „${col.name}" empfehlen wir ${recValue.label}.`
                        : (recValue.recommendation_reason || `${recValue.label} ist unsere Empfehlung.`)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedExtras(prev => ({ ...prev, [group.key]: recValue.id }))}
                      className="ml-auto text-[9px] text-green-800 underline tracking-wider uppercase bg-transparent border-0"
                    >
                      Übernehmen
                    </button>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {group.values.map(v => {
                    const isSel = selectedExtras[group.key] === v.id
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedExtras(prev => ({ ...prev, [group.key]: v.id }))}
                        className={`relative flex flex-col items-center w-[88px] py-2.5 px-2 transition-all border ${
                          isSel ? 'border-black bg-black/[0.02]' : 'border-black/10 hover:border-black/30 bg-white'
                        }`}
                        title={v.description || ''}
                      >
                        {v.recommended && !isSel && (
                          <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-green-500 rounded-full border border-white" />
                        )}
                        <div
                          className="w-12 h-12 mb-2 flex items-center justify-center overflow-hidden border border-black/[0.06]"
                          style={{ backgroundColor: v.color_hex || (v.image ? 'transparent' : '#fafaf9') }}
                        >
                          {v.image
                            ? <img src={resolveImg(v.image)} alt="" className="w-full h-full object-cover" />
                            : group.key === 'last' && LAST_SHAPES[v.key]
                              ? <div className="w-9 h-11"><LastShapeIcon shapeKey={v.key} active={isSel} /></div>
                              : v.color_hex
                                ? null
                                : <span className="text-[9px] text-black/25 tracking-wider uppercase">{v.label.slice(0, 3)}</span>}
                        </div>
                        <p className={`text-[9px] tracking-wider uppercase text-center ${isSel ? 'text-black font-medium' : 'text-black/60'}`}>{v.label}</p>
                        {v.price_extra > 0 && (
                          <p className="text-[9px] text-black/35 font-light mt-0.5">+{v.price_extra.toFixed(2).replace('.', ',')} €</p>
                        )}
                      </button>
                    )
                  })}
                </div>
                {/* Beschreibung der aktuell gewählten Option (z. B. Leisten-
                    Erklärung „Runde Zehenform …") */}
                {currentSelection?.description && (
                  <p className="text-[10px] text-black/45 font-light leading-relaxed mt-2.5">
                    {currentSelection.description}
                  </p>
                )}
              </div>
              )
            })}

            {/* ── Passform ──────────────────────────────────────────────
                Die richtige Größe + Leistenform wird aus den Fußmaßen
                automatisch ermittelt, kein manueller Größen-Schritt. */}
            <div className="px-5 lg:px-0">
              <p className="text-[10px] text-black/30 uppercase mb-3" style={{ letterSpacing: '0.18em' }}>Passform</p>

              {/* Keine Maße gespeichert → schlanke Eingabe */}
              {!footMeasurements?.foot_length_mm ? (
                <div className="border border-black/10 p-4">
                  <p className="text-[11px] text-black/55 font-light leading-relaxed mb-3">
                    Für die perfekte Passform messen wir Ihren Fuß statt zu raten.
                    Geben Sie Fußlänge und Ballenumfang ein, die passende Schuhform
                    und Größe ermitteln wir automatisch.
                  </p>
                  <button onClick={openMeasEdit} className="w-full py-2.5 bg-black text-white text-[11px] tracking-wider uppercase border-0">
                    Maße eingeben
                  </button>
                </div>
              ) : fitState === 'matching' ? (
                <p className="text-[11px] text-black/40 font-light">Passform wird ermittelt…</p>
              ) : fitState === 'matched' ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[11px] text-black/45 font-light">
                    <Check size={13} strokeWidth={2} className="text-black/40" />
                    <span>Passform automatisch ermittelt, keine Größenwahl nötig.</span>
                  </div>
                  {availableLasts.length >= 2 ? (
                    <div>
                      <p className="text-[9px] text-black/35 uppercase tracking-wider mb-2">Schuhform · mehrere passen zu Ihren Maßen</p>
                      <div className="flex gap-2 flex-wrap">
                        {availableLasts.map(v => {
                          const isSel = chosenLast === v.key
                          return (
                            <button
                              key={v.key} type="button" onClick={() => setChosenLast(v.key)}
                              title={v.description || ''}
                              className={`relative flex flex-col items-center w-[88px] py-2.5 px-2 transition-all border ${isSel ? 'border-black bg-black/[0.02]' : 'border-black/10 hover:border-black/30 bg-white'}`}
                            >
                              <div className="w-12 h-12 mb-2 flex items-center justify-center overflow-hidden border border-black/[0.06]" style={{ backgroundColor: v.image ? 'transparent' : '#fafaf9' }}>
                                {v.image
                                  ? <img src={resolveImg(v.image)} alt="" className="w-full h-full object-cover" />
                                  : LAST_SHAPES[v.key]
                                    ? <div className="w-9 h-11"><LastShapeIcon shapeKey={v.key} active={isSel} /></div>
                                    : <span className="text-[9px] text-black/25 tracking-wider uppercase">{v.label.slice(0, 3)}</span>}
                              </div>
                              <p className={`text-[9px] tracking-wider uppercase text-center ${isSel ? 'text-black font-medium' : 'text-black/60'}`}>{v.label}</p>
                              {v.match?.fitPercent != null && (
                                <p className="text-[9px] text-black/35 font-light mt-0.5">{String(v.match.fitPercent).replace('.', ',')} %</p>
                              )}
                            </button>
                          )
                        })}
                      </div>
                      {availableLasts.find(v => v.key === chosenLast)?.description && (
                        <p className="text-[10px] text-black/45 font-light leading-relaxed mt-2.5">{availableLasts.find(v => v.key === chosenLast).description}</p>
                      )}
                    </div>
                  ) : availableLasts.length === 1 ? (
                    <p className="text-[10px] text-black/40 font-light">Schuhform: <span className="text-black/70">{availableLasts[0].label}</span></p>
                  ) : null}
                  <button type="button" onClick={openMeasEdit} className="text-[10px] text-black/35 hover:text-black/60 underline underline-offset-2 bg-transparent border-0 p-0">Maße ändern</button>
                </div>
              ) : (
                /* Maße vorhanden, aber kein Treffer → Maßanfertigung */
                <div className="border border-black/10 p-4">
                  <p className="text-[11px] text-black/55 font-light leading-relaxed mb-3">
                    Für Ihre Maße finden wir keine Standard-Passform. Wir fertigen
                    diesen Schuh gerne als Maßanfertigung für Sie an.
                  </p>
                  <button
                    onClick={() => setCustomRequestOpen(true)}
                    className="w-full py-2.5 bg-black text-white text-[11px] tracking-wider uppercase border-0"
                  >
                    Maßanfertigung anfragen
                  </button>
                  <button type="button" onClick={openMeasEdit} className="block w-full mt-2 text-[10px] text-black/35 hover:text-black/60 text-center underline underline-offset-2 bg-transparent border-0 p-0">Maße ändern</button>
                </div>
              )}
            </div>

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
                  {/* Dynamische Extras (Last, Welt, Heel, Toe, Schnalle, …) */}
                  {extraOptionGroups.map(group => {
                    const sel = group.values.find(v => v.id === selectedExtras[group.key])
                    if (!sel) return null
                    return (
                      <div key={group.id} className="flex items-center justify-between">
                        <span className="text-[11px] text-black/50">{group.label}</span>
                        <div className="flex items-center gap-2">
                          {sel.color_hex && (
                            <div className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: sel.color_hex }} />
                          )}
                          <span className="text-[11px] text-black">
                            {sel.label}
                            {sel.price_extra > 0 && ` (+€${sel.price_extra})`}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                  {sizeType === 'custom' && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-black/50">Größe</span>
                      <span className="text-[11px] text-black">Maßanfertigung</span>
                    </div>
                  )}
                  {(sizeType === 'standard' && selectedSize) && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-black/50">Größe</span>
                      <span className="text-[11px] text-black">EU {selectedSize}</span>
                    </div>
                  )}
                  {selectedAccessories.length > 0 && (
                    <div className="flex items-center justify-between pt-1 mt-1 border-t border-black/5">
                      <span className="text-[11px] text-black/50">Zubehör</span>
                      <span className="text-[11px] text-black">
                        {selectedAccessories.length}×
                        {accDiscount > 0
                          ? <> <span className="line-through text-black/25">€{accessoryTotal}</span> €{accessoryTotal - accDiscount}</>
                          : <> (+€{accessoryTotal})</>
                        }
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
                {needsCustomRequest ? (
                  <button
                    onClick={() => setCustomRequestOpen(true)}
                    className="flex-1 h-14 flex items-center justify-center gap-2.5 bg-black text-white border-0 hover:bg-black/90 active:bg-black/85"
                    style={{ letterSpacing: '0.18em', textTransform: 'uppercase', fontSize: '12px', borderRadius: 0 }}
                  >
                    <Send size={16} strokeWidth={1.5} /> Maßanfertigung anfragen
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleAddToCart}
                      disabled={!fitReady}
                      className={`flex-1 h-14 flex items-center justify-center gap-2.5 transition-all border disabled:opacity-30 ${
                        added ? 'bg-black text-white border-black' : 'bg-white text-black border-black/20 hover:bg-black/5 active:bg-black/10'
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
                      disabled={!fitReady}
                      className="flex-1 h-14 flex items-center justify-center gap-2.5 bg-black text-white border-0 hover:bg-black/90 active:bg-black/85 disabled:opacity-30"
                      style={{ letterSpacing: '0.18em', textTransform: 'uppercase', fontSize: '12px', borderRadius: 0 }}
                    >
                      Jetzt kaufen
                    </button>
                  </>
                )}
              </div>
              <p className="text-center text-[10px] text-black/25 mt-3" style={{ letterSpacing: '0.12em' }}>
                {needsCustomRequest
                  ? 'Maßanfertigung · persönliche Beratung über WhatsApp Business'
                  : !fitReady
                    ? 'Bitte zuerst die Passform ermitteln'
                    : 'Handgefertigt · Kostenlose Lieferung'}
              </p>
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
          {needsCustomRequest ? (
            <button
              onClick={() => setCustomRequestOpen(true)}
              className="flex-1 h-12 flex items-center justify-center gap-2 bg-black text-white border-0 active:bg-black/85"
              style={{ letterSpacing: '0.14em', textTransform: 'uppercase', fontSize: '10px', borderRadius: 0 }}
            >
              <Send size={14} strokeWidth={1.5} /> Maßanfertigung anfragen
            </button>
          ) : (
            <>
              <button
                onClick={handleAddToCart}
                disabled={!fitReady}
                className={`flex-1 h-12 flex items-center justify-center gap-2 transition-all border disabled:opacity-30 ${
                  added ? 'bg-black text-white border-black' : 'bg-white text-black border-black/20 active:bg-black/5'
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
                disabled={!fitReady}
                className="flex-1 h-12 flex items-center justify-center gap-2 bg-black text-white border-0 active:bg-black/85 disabled:opacity-30"
                style={{ letterSpacing: '0.14em', textTransform: 'uppercase', fontSize: '10px', borderRadius: 0 }}
              >
                Jetzt kaufen
              </button>
            </>
          )}
        </div>
        <p className="text-center text-[9px] text-black/25 mt-2 pb-1" style={{ letterSpacing: '0.12em' }}>
          {needsCustomRequest
            ? 'Maßanfertigung · WhatsApp Business'
            : !fitReady
              ? 'Bitte zuerst die Passform ermitteln'
              : 'Handgefertigt · Kostenlose Lieferung'}
        </p>
      </div>

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

      <CustomRequestModal
        open={customRequestOpen}
        onClose={() => setCustomRequestOpen(false)}
        product={product}
        config={{
          material: mat?.label || product.material,
          color:    col?.name || color,
          sole:     sole?.label,
          euSize:   chosenEU,
          footMeasurements: footMeasurementsUsed,
          scanId:   sizeType === 'custom' ? latestScan?.id : null,
          accessories: selectedAccessories.map(id => {
            const acc = accessories.find(a => a.id === id)
            return acc ? { id: acc.id, name: acc.name, price: acc.price } : null
          }).filter(Boolean),
        }}
      />
    </div>
  )
}
