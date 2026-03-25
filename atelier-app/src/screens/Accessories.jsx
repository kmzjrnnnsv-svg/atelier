/**
 * Accessories.jsx — Customer-facing accessories browsing page
 * Layout matches ShoeCollection: large title, category tabs, hero + grid
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingBag, Plus, Check } from 'lucide-react'
import useAtelierStore from '../store/atelierStore'

const CATEGORIES = [
  { label: 'Alle',        value: 'ALL' },
  { label: 'Pflege',      value: 'CARE' },
  { label: 'Schutz',      value: 'PROTECTION' },
  { label: 'Aufbewahrung', value: 'STORAGE' },
  { label: 'Extras',      value: 'EXTRAS' },
]

// Map accessory keys to categories for filtering
const KEY_CATEGORY = {
  shoetrees: 'STORAGE', dustbag: 'STORAGE', boot_jack: 'STORAGE',
  carekit: 'CARE', horsehair_brush: 'CARE', cream_dark: 'CARE', cream_cognac: 'CARE',
  cordovan_balm: 'CARE', patent_care: 'CARE', sole_oil: 'CARE', exotic_care: 'CARE',
  polishing_cloth: 'CARE', suede_brush: 'CARE', suede_eraser: 'CARE', buckle_cloth: 'CARE',
  sneaker_kit: 'CARE',
  suede_spray: 'PROTECTION',
  shoehorn: 'EXTRAS', belt: 'EXTRAS', waxed_laces: 'EXTRAS',
}

// ── Hero Card (first item, large) ──────────────────────────────────────────
function HeroCard({ acc, inCart, onAdd }) {
  return (
    <div className="w-full overflow-hidden mb-6" style={{ background: '#FFFFFF' }}>
      <div className="relative aspect-[4/3] flex items-center justify-center bg-black/[0.02]">
        {acc.image_data ? (
          <img src={acc.image_data} alt={acc.name} className="w-full h-full object-cover" />
        ) : (
          <ShoppingBag size={48} strokeWidth={0.8} className="text-black/10" />
        )}
      </div>
      <div className="px-4 py-3.5">
        <p className="text-[17px] font-semibold text-black leading-snug">{acc.name}</p>
        {acc.description && <p className="text-[13px] text-black/40 mt-0.5">{acc.description}</p>}
        <div className="flex items-center justify-between mt-2.5">
          <p className="text-[15px] font-medium text-black">€ {parseFloat(acc.price) || 0}</p>
          <button
            onClick={() => onAdd(acc)}
            disabled={inCart}
            className={`h-9 px-4 flex items-center gap-1.5 border-0 text-[12px] font-semibold transition-all ${
              inCart ? 'bg-black/5 text-black/30' : 'bg-black text-white active:opacity-80'
            }`}
          >
            {inCart ? <><Check size={13} strokeWidth={2} /> Hinzugefügt</> : <><Plus size={13} strokeWidth={2} /> In den Warenkorb</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Grid Card ──────────────────────────────────────────────────────────────
function AccessoryCard({ acc, inCart, onAdd }) {
  return (
    <div className="w-full overflow-hidden" style={{ background: '#FFFFFF' }}>
      <div className="relative aspect-square flex items-center justify-center bg-black/[0.02]">
        {acc.image_data ? (
          <img src={acc.image_data} alt={acc.name} className="w-full h-full object-cover" />
        ) : (
          <ShoppingBag size={24} strokeWidth={1} className="text-black/10" />
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onAdd(acc) }}
          disabled={inCart}
          className={`absolute bottom-2 right-2 w-8 h-8 flex items-center justify-center border-0 transition-all ${
            inCart ? 'bg-black/10 text-black/30' : 'bg-black text-white active:opacity-80'
          }`}
        >
          {inCart ? <Check size={13} strokeWidth={2} /> : <Plus size={13} strokeWidth={2} />}
        </button>
      </div>
      <div className="px-3 py-2.5">
        <p className="text-[13px] font-medium text-black leading-snug line-clamp-2">{acc.name}</p>
        <p className="text-[13px] text-black/50 mt-0.5">€ {parseFloat(acc.price) || 0}</p>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
export default function Accessories() {
  const navigate = useNavigate()
  const { accessories, cart, addToCart } = useAtelierStore()
  const [activeCategory, setActiveCategory] = useState('ALL')

  const activeAccessories = (accessories || []).filter(a => a.is_active !== 0)
  const cartIds = cart.filter(c => c.isAccessory).map(c => c.id)

  const handleAdd = (acc) => {
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

  const filtered = activeCategory === 'ALL'
    ? activeAccessories
    : activeAccessories.filter(a => KEY_CATEGORY[a.key] === activeCategory)

  const [hero, ...rest] = filtered

  return (
    <div className="min-h-full bg-white">

      {/* ── Large Title Header ────────────────────────────────────── */}
      <div className="px-5 lg:px-8 pt-3 lg:pt-8 pb-2">
        <p className="text-[34px] lg:text-[40px] font-bold text-black leading-tight tracking-tight">Zubehör</p>
        <p className="text-[15px] lg:text-[17px] text-black/45 mt-1">Pflege, Schutz und Extras für deine Schuhe.</p>
      </div>

      {/* ── Category Tabs ─────────────────────────────────────────── */}
      <div className="px-5 lg:px-8 pb-4 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-[13px] font-medium transition-all border-0 ${
              activeCategory === cat.value
                ? 'bg-black text-white'
                : 'bg-white text-black/50 border border-black/10'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* ── Product Grid ──────────────────────────────────────────── */}
      <div className="px-5 lg:px-8 pb-8">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 bg-black/[0.03] flex items-center justify-center mb-4">
              <ShoppingBag size={24} className="text-black/20" strokeWidth={1.5} />
            </div>
            <p className="text-[15px] font-semibold text-black">Kein Zubehör verfügbar</p>
            <p className="text-[13px] text-black/40 mt-1 max-w-[220px] leading-relaxed">Bald findest du hier passendes Zubehör.</p>
          </div>
        ) : (
          <>
            {hero && (
              <HeroCard
                acc={hero}
                inCart={cartIds.includes(`acc-${hero.id}`)}
                onAdd={handleAdd}
              />
            )}

            {rest.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
                {rest.map(acc => (
                  <AccessoryCard
                    key={acc.id}
                    acc={acc}
                    inCart={cartIds.includes(`acc-${acc.id}`)}
                    onAdd={handleAdd}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
