/**
 * Accessories.jsx — Customer-facing accessories browsing page
 * Clean grid layout with minimal cards
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingBag, Plus, Check } from 'lucide-react'
import useAtelierStore from '../store/atelierStore'
import { apiFetch } from '../hooks/useApi'

const CATEGORY_LABELS = {
  OXFORD: 'Oxford', DERBY: 'Derby', LOAFER: 'Loafer',
  MONK: 'Monk', BOOT: 'Boot', SNEAKER: 'Sneaker',
}

// ── Filter pills ─────────────────────────────────────────────────────────
const FILTERS = [
  { key: 'all', label: 'Alle' },
  { key: 'pflege', label: 'Pflege', match: ['carekit', 'cream_dark', 'cream_cognac', 'cordovan_balm', 'patent_care', 'exotic_care', 'sole_oil'] },
  { key: 'buersten', label: 'Bürsten', match: ['horsehair_brush', 'suede_brush', 'polishing_cloth', 'buckle_cloth'] },
  { key: 'schutz', label: 'Schutz', match: ['suede_spray', 'suede_eraser', 'dustbag', 'shoetrees'] },
  { key: 'extras', label: 'Extras', match: ['shoehorn', 'belt', 'boot_jack', 'waxed_laces', 'sneaker_kit'] },
]

// ═════════════════════════════════════════════════════════════════════════════
export default function Accessories() {
  const navigate = useNavigate()
  const { cart, addToCart } = useAtelierStore()
  const [accessoriesList, setAccessoriesList] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [expandedId, setExpandedId] = useState(null)

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

  const handleAdd = (acc, e) => {
    e.stopPropagation()
    if (cartIds.includes(`acc-${acc.id}`)) return
    addToCart({
      id: `acc-${acc.id}`,
      name: acc.name,
      price: `€ ${parseFloat(acc.price) || 0}`,
      material: 'Zubehör',
      image: acc.image_data || null,
      isAccessory: true,
      shoeId: null,
    })
  }

  return (
    <div className="min-h-full bg-white">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="px-5 lg:px-10 pt-4 lg:pt-10 pb-1">
        <p className="text-[11px] text-black/30 uppercase mb-1" style={{ letterSpacing: '0.18em' }}>Kollektion</p>
        <p className="text-[28px] lg:text-[36px] font-light text-black leading-tight">Zubehör</p>
        <p className="text-[13px] lg:text-[14px] text-black/40 mt-2 max-w-md leading-relaxed">
          Pflege, Schutz und Extras — abgestimmt auf handgefertigte Lederschuhe.
        </p>
      </div>

      {/* ── Filter pills ──────────────────────────────────────── */}
      <div className="px-5 lg:px-10 pt-4 pb-2">
        <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex-shrink-0 h-8 px-4 text-[11px] border transition-all ${
                filter === f.key
                  ? 'bg-black text-white border-black'
                  : 'bg-transparent text-black/50 border-black/10 hover:border-black/20'
              }`}
              style={{ letterSpacing: '0.06em' }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Count ──────────────────────────────────────────────── */}
      {!loading && (
        <div className="px-5 lg:px-10 pb-4 pt-2">
          <p className="text-[11px] text-black/25">{filtered.length} Produkte</p>
        </div>
      )}

      {/* ── Loading ────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 border-2 border-black/10 border-t-black animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-5">
          <div className="w-14 h-14 bg-black/[0.03] flex items-center justify-center mb-4">
            <ShoppingBag size={24} className="text-black/20" strokeWidth={1.5} />
          </div>
          <p className="text-[15px] font-medium text-black">Kein Zubehör gefunden</p>
          <p className="text-[13px] text-black/40 mt-1">Versuche einen anderen Filter.</p>
        </div>
      ) : (
        /* ── Product Grid ──────────────────────────────────────── */
        <div className="px-5 lg:px-10 pb-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
            {filtered.map(acc => {
              const inCart = cartIds.includes(`acc-${acc.id}`)
              const recommended = JSON.parse(acc.recommended_for || '[]')
              const expanded = expandedId === acc.id

              return (
                <div
                  key={acc.id}
                  className="group cursor-pointer"
                  onClick={() => setExpandedId(expanded ? null : acc.id)}
                >
                  {/* Image */}
                  <div className="w-full overflow-hidden flex items-center justify-center bg-black/[0.02]"
                    style={{ aspectRatio: '1' }}
                  >
                    {acc.image_data ? (
                      <img src={acc.image_data} alt={acc.name} className="w-full h-full object-cover" />
                    ) : (
                      <ShoppingBag size={28} strokeWidth={0.7} className="text-black/8" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="pt-2.5 pb-1">
                    <p className="text-[12px] lg:text-[13px] text-black leading-snug">{acc.name}</p>
                    <p className="text-[12px] lg:text-[13px] text-black/40 mt-0.5">€{parseFloat(acc.price) || 0}</p>
                  </div>

                  {/* Add to cart button — always visible */}
                  <button
                    onClick={(e) => handleAdd(acc, e)}
                    disabled={inCart}
                    className={`w-full h-9 flex items-center justify-center gap-1.5 border text-[11px] transition-all ${
                      inCart
                        ? 'bg-black/[0.03] text-black/30 border-black/5'
                        : 'bg-transparent text-black/60 border-black/10 hover:border-black/30 hover:text-black'
                    }`}
                    style={{ letterSpacing: '0.04em' }}
                  >
                    {inCart ? <><Check size={12} strokeWidth={2.5} /> Hinzugefügt</> : <><Plus size={12} strokeWidth={2} /> Warenkorb</>}
                  </button>

                  {/* Expanded: description + tags */}
                  {expanded && (
                    <div className="pb-3">
                      {acc.description && (
                        <p className="text-[11px] text-black/35 leading-relaxed mt-1">{acc.description}</p>
                      )}
                      {recommended.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {recommended.map(cat => (
                            <span key={cat} className="text-[8px] uppercase tracking-wider px-1.5 py-0.5 bg-black/[0.04] text-black/30">
                              {CATEGORY_LABELS[cat] || cat}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
