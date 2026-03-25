/**
 * ShoeCollection.jsx — "Kollektion" tab (Apple Store "Products" style)
 * Large hero product card + browsable category grid with clean Apple aesthetic
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart } from 'lucide-react'
import useAtelierStore from '../store/atelierStore'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../hooks/useApi'

const CATEGORIES = [
  { label: 'Alle',       value: 'ALL' },
  { label: 'Loafers',    value: 'LOAFER' },
  { label: 'Oxfords',    value: 'OXFORD' },
  { label: 'Derby',      value: 'DERBY' },
  { label: 'Chelsea',    value: 'BOOT' },
  { label: 'Sneaker',    value: 'SNEAKER' },
  { label: 'Wholecuts',  value: 'MONK' },
]

// ── Hero Product Card (large, Apple-style) ──────────────────────────────────
function HeroCard({ product, onSelect, isFav, onToggleFav, isPromo }) {
  const displayPrice = isPromo && product.promotion_price ? product.promotion_price : product.price
  return (
    <button onClick={() => onSelect(product)} className="w-full bg-transparent border-0 text-left p-0 mb-6">
      <div className="w-full overflow-hidden" style={{ background: '#FFFFFF' }}>
        <div className="relative aspect-[4/3] flex items-center justify-center">
          {product.image ? (
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <svg viewBox="0 0 300 130" className="w-3/4 opacity-70">
              <ellipse cx="150" cy="118" rx="130" ry="10" fill="#d1d5db" />
              <path d="M20 100 Q16 108 45 112 L255 112 Q280 112 280 100 L274 78 Q266 58 245 56 L75 56 Q48 56 42 66 Z" fill={product.color || '#374151'} />
              <path d="M42 66 Q36 42 65 30 L140 24 Q180 20 210 38 Q235 52 274 78 L245 56 L75 56 Q48 56 42 66 Z" fill={product.color || '#374151'} opacity="0.85" />
            </svg>
          )}
          <button
            className="absolute top-3 right-3 w-9 h-9 rounded-lg bg-white/80 backdrop-blur-sm flex items-center justify-center border-0 shadow-sm"
            onClick={e => { e.stopPropagation(); onToggleFav() }}
          >
            <Heart size={16} strokeWidth={1.5} className={isFav ? 'text-red-500 fill-red-500' : 'text-black/40'} />
          </button>
        </div>
        <div className="px-4 py-3.5">
          {product.tag && (
            <p className="text-[11px] font-medium text-[#FF9500] mb-1">{product.tag}</p>
          )}
          <p className="text-[17px] font-semibold text-black leading-snug">{product.name}</p>
          <p className="text-[13px] text-black/50 mt-0.5">{product.material}</p>
          <div className="flex items-center justify-between mt-2">
            {isPromo && product.promotion_price ? (
              <p className="text-[15px] font-medium text-black">
                <span className="line-through text-black/30 mr-1.5">{product.price}</span>
                {product.promotion_price}
              </p>
            ) : (
              <p className="text-[15px] font-medium text-black">{product.price}</p>
            )}
            {product.match && (
              <span className="text-[12px] text-[#34C759] font-medium">{product.match} Match</span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

// ── Grid Product Card ───────────────────────────────────────────────────────
function ProductCard({ product, onSelect, isFav, onToggleFav, isPromo }) {
  return (
    <button onClick={() => onSelect(product)} className="w-full bg-transparent border-0 text-left p-0">
      <div className="w-full overflow-hidden" style={{ background: '#FFFFFF' }}>
        <div className="relative aspect-square flex items-center justify-center">
          {product.image ? (
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <svg viewBox="0 0 200 90" className="w-3/4 opacity-60">
              <path d="M15 75 Q12 80 28 84 L172 84 Q186 84 186 75 L182 62 Q178 50 165 48 L55 48 Q36 48 31 54 Z" fill={product.color || '#666'} />
              <path d="M31 54 Q27 37 50 28 L100 24 Q128 22 150 33 Q168 42 182 62 L165 48 L55 48 Q36 48 31 54 Z" fill={product.color || '#666'} opacity="0.85" />
            </svg>
          )}
          <button
            className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-white/80 backdrop-blur-sm flex items-center justify-center border-0"
            onClick={e => { e.stopPropagation(); onToggleFav() }}
          >
            <Heart size={13} strokeWidth={1.5} className={isFav ? 'text-red-500 fill-red-500' : 'text-black/30'} />
          </button>
        </div>
        <div className="px-3 py-2.5">
          <p className="text-[13px] font-medium text-black leading-snug line-clamp-2">{product.name}</p>
          {isPromo && product.promotion_price ? (
            <p className="text-[13px] text-black/50 mt-0.5">
              <span className="line-through mr-1">{product.price}</span>
              {product.promotion_price}
            </p>
          ) : (
            <p className="text-[13px] text-black/50 mt-0.5">{product.price}</p>
          )}
        </div>
      </div>
    </button>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
export default function ShoeCollection() {
  const navigate = useNavigate()
  const { shoes, favorites, toggleFavorite } = useAtelierStore()
  const { user } = useAuth()
  const [activeCategory, setActiveCategory] = useState('ALL')
  const [scanAccuracy, setScanAccuracy] = useState(null)
  const isPromo = !!user?.is_promotion
  const tabsRef = useRef(null)

  useEffect(() => {
    apiFetch('/api/scans/mine')
      .then(scans => { if (scans?.length) setScanAccuracy(scans[0].accuracy) })
      .catch(() => {})
  }, [])

  const enriched = shoes.map(s => ({
    ...s,
    match: s.match || (scanAccuracy ? `${Math.min(99.9, scanAccuracy + ((s.id * 13 + 7) % 17) * 0.03).toFixed(1)}%` : null),
  }))

  const filtered = activeCategory === 'ALL' ? enriched : enriched.filter(p => p.category === activeCategory)
  const [hero, ...rest] = filtered

  const selectShoe = (product) => navigate('/customize', { state: { product } })

  return (
    <div className="min-h-full bg-white">

      {/* ── Large Title Header ────────────────────────────────────── */}
      <div className="px-5 lg:px-8 pt-3 lg:pt-8 pb-2">
        <p className="text-[34px] lg:text-[40px] font-bold text-black leading-tight tracking-tight">Kollektion</p>
        <p className="text-[15px] lg:text-[17px] text-black/45 mt-1">Schuhe, individuell angepasst an deinen Fuß.</p>
      </div>

      {/* ── Category Tabs (pill style like Apple) ─────────────────── */}
      <div ref={tabsRef} className="px-5 lg:px-8 pb-4 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
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
          <div className="text-center py-20">
            <p className="text-[17px] font-semibold text-black/80 mb-1">Bald verfügbar</p>
            <p className="text-[15px] text-black/40">Diese Kategorie wird gerade kuratiert.</p>
          </div>
        ) : (
          <>
            {hero && (
              <HeroCard
                product={hero}
                onSelect={selectShoe}
                isFav={favorites.includes(String(hero.id))}
                onToggleFav={() => toggleFavorite(hero.id)}
                isPromo={isPromo}
              />
            )}

            {rest.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
                {rest.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onSelect={selectShoe}
                    isFav={favorites.includes(String(product.id))}
                    onToggleFav={() => toggleFavorite(product.id)}
                    isPromo={isPromo}
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
