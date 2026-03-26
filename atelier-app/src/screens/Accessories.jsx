/**
 * Accessories.jsx — LV-inspired accessories browsing page
 * Clean, luxurious grid with warm tones and elegant typography
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingBag, Plus, Check } from 'lucide-react'
import useAtelierStore from '../store/atelierStore'
import { apiFetch } from '../hooks/useApi'
import CtaBanner from '../components/CtaBanner'
import { HEROES, CARE } from '../lib/editorialImages'

const CATEGORY_LABELS = {
  OXFORD: 'Oxford', DERBY: 'Derby', LOAFER: 'Loafer',
  MONK: 'Monk', BOOT: 'Boot', SNEAKER: 'Sneaker',
}

const FILTERS = [
  { key: 'all', label: 'Alle Produkte' },
  { key: 'pflege', label: 'Pflege', match: ['carekit', 'cream_dark', 'cream_cognac', 'cordovan_balm', 'patent_care', 'exotic_care', 'sole_oil'] },
  { key: 'buersten', label: 'Bürsten & Tücher', match: ['horsehair_brush', 'suede_brush', 'polishing_cloth', 'buckle_cloth'] },
  { key: 'schutz', label: 'Schutz & Pflege', match: ['suede_spray', 'suede_eraser', 'dustbag', 'shoetrees'] },
  { key: 'extras', label: 'Accessoires', match: ['shoehorn', 'belt', 'boot_jack', 'waxed_laces', 'sneaker_kit'] },
]

export default function Accessories() {
  const navigate = useNavigate()
  const { cart, addToCart, removeFromCart } = useAtelierStore()
  const [accessoriesList, setAccessoriesList] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    setLoading(true)
    apiFetch('/api/accessories')
      .then(data => {
        const items = Array.isArray(data) ? data.filter(a => a.is_active) : []
        setAccessoriesList(items)
      })
      .catch(() => setAccessoriesList([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'all'
    ? accessoriesList
    : accessoriesList.filter(a => FILTERS.find(f => f.key === filter)?.match?.includes(a.key))

  const cartIds = cart.filter(c => c.isAccessory).map(c => c.id)

  const handleToggleCart = (acc, e) => {
    e.stopPropagation()
    const accId = `acc-${acc.id}`
    if (cartIds.includes(accId)) {
      removeFromCart(accId)
    } else {
      addToCart({
        id: accId,
        name: acc.name,
        price: `€ ${parseFloat(acc.price) || 0}`,
        material: 'Zubehör',
        image: acc.image_data || null,
        isAccessory: true,
        shoeId: null,
      })
    }
  }

  return (
    <div className="min-h-full bg-white">

      {/* ── Hero banner — full-bleed editorial ──────────────────── */}
      <div className="relative">
        <div className="w-full overflow-hidden" style={{ aspectRatio: '16 / 6' }}>
          <img src={HEROES.accessories} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 flex items-end" style={{ background: 'linear-gradient(transparent 30%, rgba(0,0,0,0.55) 100%)' }}>
          <div className="px-5 lg:px-16 pb-6 lg:pb-12">
            <p className="text-[10px] lg:text-[11px] text-white/40 uppercase tracking-[0.25em] mb-2">Atelier Kollektion</p>
            <h1 className="text-[28px] lg:text-[44px] font-extralight text-white leading-[1.1] tracking-tight">
              Zubehör & Pflege
            </h1>
            <p className="text-[13px] lg:text-[15px] text-white/40 mt-2 lg:mt-3 max-w-lg leading-[1.7] font-light">
              Ausgewählte Pflegeprodukte und Accessoires, abgestimmt auf die Ansprüche handgefertigter Lederschuhe.
            </p>
          </div>
        </div>
      </div>

      {/* ── Filter navigation ───────────────────────────────────── */}
      <div className="px-5 lg:px-16 pb-6 lg:pb-8 border-b border-black/[0.06]">
        <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex-shrink-0 px-4 py-2 text-[11px] lg:text-[12px] border-0 bg-transparent transition-all ${
                filter === f.key
                  ? 'text-black border-b-2 border-black font-medium'
                  : 'text-black/35 hover:text-black/60'
              }`}
              style={{ letterSpacing: '0.06em', borderBottom: filter === f.key ? '2px solid black' : '2px solid transparent' }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Product count ───────────────────────────────────────── */}
      {!loading && (
        <div className="px-5 lg:px-16 pt-5 lg:pt-6 pb-2">
          <p className="text-[11px] text-black/25 font-light">{filtered.length} {filtered.length === 1 ? 'Produkt' : 'Produkte'}</p>
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-5 h-5 border border-black/15 border-t-black/60 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center px-5">
          <ShoppingBag size={32} className="text-black/10 mb-4" strokeWidth={1} />
          <p className="text-[14px] font-light text-black/60">Keine Produkte in dieser Kategorie</p>
        </div>
      ) : (

        /* ── Product Grid ──────────────────────────────────────── */
        <div className="px-5 lg:px-16 pb-16 pt-2">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-8 lg:gap-x-6 lg:gap-y-12">
            {filtered.map(acc => {
              const inCart = cartIds.includes(`acc-${acc.id}`)
              const recommended = JSON.parse(acc.recommended_for || '[]')

              return (
                <div key={acc.id} className="group">

                  {/* Product image */}
                  <div
                    className="w-full overflow-hidden flex items-center justify-center bg-[#f6f5f3] mb-3 lg:mb-4 transition-all duration-500 group-hover:bg-[#efeee9]"
                    style={{ aspectRatio: '3 / 4' }}
                  >
                    {acc.image_data ? (
                      <img
                        src={acc.image_data}
                        alt={acc.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <ShoppingBag size={32} strokeWidth={0.6} className="text-black/[0.07]" />
                    )}
                  </div>

                  {/* Product info */}
                  <p className="text-[12px] lg:text-[13px] text-black font-normal leading-snug">{acc.name}</p>
                  {acc.description && (
                    <p className="text-[11px] text-black/30 mt-1 leading-relaxed line-clamp-2 font-light">{acc.description}</p>
                  )}
                  <p className="text-[12px] lg:text-[13px] text-black/60 mt-1.5 font-light">€ {parseFloat(acc.price) || 0}</p>

                  {/* Category tags */}
                  {recommended.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {recommended.slice(0, 3).map(cat => (
                        <span key={cat} className="text-[8px] lg:text-[9px] uppercase tracking-wider text-black/25 font-light">
                          {CATEGORY_LABELS[cat] || cat}{recommended.indexOf(cat) < Math.min(recommended.length, 3) - 1 ? ' ·' : ''}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Add to cart */}
                  <button
                    onClick={(e) => handleToggleCart(acc, e)}
                    className={`mt-3 w-full h-10 lg:h-11 flex items-center justify-center gap-2 text-[11px] lg:text-[12px] transition-all duration-300 border ${
                      inCart
                        ? 'bg-black text-white border-black hover:bg-white hover:text-black'
                        : 'bg-white text-black border-black/15 hover:bg-black hover:text-white hover:border-black'
                    }`}
                    style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}
                  >
                    {inCart
                      ? <><Check size={13} strokeWidth={2} /> Hinzugefügt</>
                      : 'In den Warenkorb'
                    }
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── CTA Banner (CMS-controlled) ──────────────────────── */}
      <div className="px-5 lg:px-16 pb-16">
        <CtaBanner page="accessories" />
      </div>
    </div>
  )
}
