/**
 * Accessories.jsx — Customer-facing accessories browsing page
 * Each accessory shows which shoes it's recommended for (horizontal scroll)
 * Layout: full-width accessory cards with shoe recommendations
 */
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingBag, Plus, Check, ChevronRight, ThumbsUp, ThumbsDown } from 'lucide-react'
import useAtelierStore from '../store/atelierStore'
import { apiFetch } from '../hooks/useApi'

const CATEGORY_LABELS = {
  OXFORD: 'Oxford', DERBY: 'Derby', LOAFER: 'Loafer',
  MONK: 'Wholecut', BOOT: 'Chelsea', SNEAKER: 'Sneaker',
}

// ── Horizontal shoe scroll (right-to-left initial position) ──────────────
function ShoeScroll({ shoes, label, color }) {
  const ref = useRef(null)

  // Scroll to end on mount (right side first)
  const handleRef = (el) => {
    if (el && !ref.current) {
      ref.current = el
      // Start scrolled to right, user scrolls left to discover
      requestAnimationFrame(() => {
        el.scrollLeft = el.scrollWidth - el.clientWidth
      })
    }
  }

  if (!shoes.length) return null

  return (
    <div className="mt-2">
      <p className="text-[9px] font-semibold uppercase tracking-widest mb-1.5" style={{ color, letterSpacing: '0.12em' }}>
        {label}
      </p>
      <div
        ref={handleRef}
        className="flex gap-2 overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {shoes.map(shoe => (
          <div key={shoe.id} className="flex-shrink-0 w-20">
            <div className="w-20 h-20 overflow-hidden bg-black/[0.02] flex items-center justify-center">
              {shoe.image ? (
                <img src={shoe.image} alt={shoe.name} className="w-full h-full object-cover" />
              ) : (
                <svg viewBox="0 0 200 90" className="w-14 opacity-50">
                  <path d="M15 75 Q12 80 28 84 L172 84 Q186 84 186 75 L182 62 Q178 50 165 48 L55 48 Q36 48 31 54 Z" fill={shoe.color || '#666'} />
                  <path d="M31 54 Q27 37 50 28 L100 24 Q128 22 150 33 Q168 42 182 62 L165 48 L55 48 Q36 48 31 54 Z" fill={shoe.color || '#666'} opacity="0.85" />
                </svg>
              )}
            </div>
            <p className="text-[9px] text-black/50 mt-1 leading-tight truncate">{shoe.name}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Accessory Detail Card ────────────────────────────────────────────────
function AccessoryDetail({ acc, shoes, inCart, onAdd, onNavigateShoe }) {
  const recommended = JSON.parse(acc.recommended_for || '[]')
  const notRecommended = JSON.parse(acc.not_recommended_for || '[]')

  const recShoes = shoes.filter(s => recommended.includes(s.category))
  const notShoes = shoes.filter(s => notRecommended.includes(s.category))

  return (
    <div className="border-b border-black/5 last:border-b-0">
      <div className="px-5 lg:px-8 py-6">
        <div className="flex gap-4 lg:gap-6">
          {/* Image */}
          <div className="w-28 h-28 lg:w-36 lg:h-36 flex-shrink-0 bg-black/[0.02] flex items-center justify-center overflow-hidden">
            {acc.image_data ? (
              <img src={acc.image_data} alt={acc.name} className="w-full h-full object-cover" />
            ) : (
              <ShoppingBag size={32} strokeWidth={0.8} className="text-black/10" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[15px] lg:text-[17px] font-semibold text-black leading-snug">{acc.name}</p>
                {acc.description && (
                  <p className="text-[12px] lg:text-[13px] text-black/40 mt-1 leading-relaxed line-clamp-3">{acc.description}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 mt-3">
              <p className="text-[15px] font-semibold text-black">€ {parseFloat(acc.price) || 0}</p>
              <button
                onClick={() => onAdd(acc)}
                disabled={inCart}
                className={`h-8 px-3.5 flex items-center gap-1.5 border-0 text-[11px] font-semibold transition-all ${
                  inCart ? 'bg-black/5 text-black/30' : 'bg-black text-white active:opacity-80'
                }`}
              >
                {inCart ? <><Check size={12} strokeWidth={2.5} /> Hinzugefügt</> : <><Plus size={12} strokeWidth={2} /> Warenkorb</>}
              </button>
            </div>
          </div>
        </div>

        {/* Shoe recommendations — horizontal scroll */}
        <div className="mt-4 flex flex-col lg:flex-row gap-3 lg:gap-6">
          {recShoes.length > 0 && (
            <div className="flex-1 min-w-0">
              <ShoeScroll shoes={recShoes} label="Empfohlen für" color="#34C759" />
            </div>
          )}
          {notShoes.length > 0 && (
            <div className="flex-1 min-w-0">
              <ShoeScroll shoes={notShoes} label="Nicht empfohlen" color="#FF3B30" />
            </div>
          )}
        </div>

        {/* Category tags */}
        {recommended.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {recommended.map(cat => (
              <span key={cat} className="text-[8px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-[#34C759]/10 text-[#34C759]">
                {CATEGORY_LABELS[cat] || cat}
              </span>
            ))}
            {notRecommended.map(cat => (
              <span key={cat} className="text-[8px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-black/[0.03] text-black/25 line-through">
                {CATEGORY_LABELS[cat] || cat}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
export default function Accessories() {
  const navigate = useNavigate()
  const { accessories: storeAccessories, shoes, cart, addToCart } = useAtelierStore()
  const [fetchedAccessories, setFetchedAccessories] = useState(null)

  // Fallback: fetch directly from API if store is empty
  useEffect(() => {
    if (!storeAccessories || storeAccessories.length === 0) {
      apiFetch('/api/accessories')
        .then(data => setFetchedAccessories(Array.isArray(data) ? data : []))
        .catch(() => setFetchedAccessories([]))
    }
  }, [storeAccessories])

  const allAccessories = (storeAccessories && storeAccessories.length > 0) ? storeAccessories : (fetchedAccessories || [])
  const activeAccessories = allAccessories.filter(a => a.is_active !== 0 && a.is_active !== false)
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

  return (
    <div className="min-h-full bg-white">

      {/* ── Large Title Header ────────────────────────────────────── */}
      <div className="px-5 lg:px-8 pt-3 lg:pt-8 pb-2">
        <p className="text-[34px] lg:text-[40px] font-bold text-black leading-tight tracking-tight">Zubehör</p>
        <p className="text-[15px] lg:text-[17px] text-black/45 mt-1">Pflege, Schutz und Extras für deine Maßschuhe.</p>
      </div>

      {/* ── Accessory count ──────────────────────────────────────── */}
      <div className="px-5 lg:px-8 pb-4">
        <p className="text-[11px] text-black/30 uppercase tracking-wider">{activeAccessories.length} Produkte</p>
      </div>

      {/* ── Accessory List ───────────────────────────────────────── */}
      {activeAccessories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-5">
          <div className="w-14 h-14 bg-black/[0.03] flex items-center justify-center mb-4">
            <ShoppingBag size={24} className="text-black/20" strokeWidth={1.5} />
          </div>
          <p className="text-[15px] font-semibold text-black">Kein Zubehör verfügbar</p>
          <p className="text-[13px] text-black/40 mt-1 max-w-[220px] leading-relaxed">Bald findest du hier passendes Zubehör.</p>
        </div>
      ) : (
        <div>
          {activeAccessories.map(acc => (
            <AccessoryDetail
              key={acc.id}
              acc={acc}
              shoes={shoes}
              inCart={cartIds.includes(`acc-${acc.id}`)}
              onAdd={handleAdd}
              onNavigateShoe={(shoe) => navigate('/customize', { state: { product: shoe } })}
            />
          ))}
        </div>
      )}

      {/* ── Bottom spacer ──────────────────────────────────────── */}
      <div className="h-12" />
    </div>
  )
}
