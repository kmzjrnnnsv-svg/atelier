/**
 * ShoeCollection.jsx — LV-inspired product listing
 * Clean grid, warm tones, elegant typography, generous whitespace
 */
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart } from 'lucide-react'
import useAtelierStore from '../store/atelierStore'
import CtaBanner from '../components/CtaBanner'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../hooks/useApi'

const CATEGORIES = [
  { label: 'Alle Modelle', value: 'ALL' },
  { label: 'Oxford',       value: 'OXFORD' },
  { label: 'Derby',        value: 'DERBY' },
  { label: 'Loafer',       value: 'LOAFER' },
  { label: 'Chelsea Boot', value: 'BOOT' },
  { label: 'Sneaker',      value: 'SNEAKER' },
  { label: 'Monk',         value: 'MONK' },
]

// ── Product Card ──────────────────────────────────────────────────────────
function ProductCard({ product, onSelect, isFav, onToggleFav, isPromo, featured }) {
  const displayPrice = isPromo && product.promotion_price ? product.promotion_price : product.price
  return (
    <div className="group cursor-pointer" onClick={() => onSelect(product)}>
      {/* Image */}
      <div
        className="w-full overflow-hidden flex items-center justify-center bg-[#f6f5f3] relative transition-all duration-500 group-hover:bg-[#efeee9]"
        style={{ aspectRatio: featured ? '3 / 2' : '3 / 4' }}
      >
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        ) : (
          <svg viewBox="0 0 260 130" className={`${featured ? 'w-2/3' : 'w-3/5'} opacity-60`}>
            <ellipse cx="130" cy="120" rx="100" ry="8" fill="#00000008" />
            <path d="M20 100 Q17 108 38 112 L222 112 Q238 112 238 100 L232 80 Q226 62 210 60 L72 60 Q47 60 42 68 Z" fill={product.color || '#374151'} />
            <path d="M42 68 Q37 48 62 36 L120 30 Q155 27 178 42 Q198 54 232 80 L210 60 Q180 50 148 52 L90 53 Q60 55 42 68 Z" fill={product.color || '#374151'} opacity="0.85" />
          </svg>
        )}

        {/* Wishlist */}
        <button
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center border-0 bg-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          onClick={e => { e.stopPropagation(); onToggleFav() }}
        >
          <Heart size={16} strokeWidth={1.5} className={isFav ? 'text-black fill-black' : 'text-black/30'} />
        </button>

        {/* Match badge */}
        {product.match && (
          <div className="absolute bottom-3 left-3">
            <span className="text-[10px] text-black/40 bg-white/80 backdrop-blur-sm px-2 py-1" style={{ letterSpacing: '0.05em' }}>
              {product.match} Passform
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className={`${featured ? 'pt-4' : 'pt-3'}`}>
        <p className={`${featured ? 'text-[15px] lg:text-[17px]' : 'text-[12px] lg:text-[13px]'} text-black font-normal leading-snug`}>
          {product.name}
        </p>
        {featured && product.material && (
          <p className="text-[12px] lg:text-[13px] text-black/30 mt-1 font-light">{product.material}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          {isPromo && product.promotion_price ? (
            <p className={`${featured ? 'text-[14px]' : 'text-[12px] lg:text-[13px]'} text-black/50 font-light`}>
              <span className="line-through text-black/25 mr-1.5">{product.price}</span>
              {product.promotion_price}
            </p>
          ) : (
            <p className={`${featured ? 'text-[14px]' : 'text-[12px] lg:text-[13px]'} text-black/50 font-light`}>
              {displayPrice}
            </p>
          )}
        </div>
      </div>
    </div>
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
  const selectShoe = (product) => navigate('/customize', { state: { product } })

  // Split: first product as featured hero, rest as grid
  const [hero, ...rest] = filtered

  return (
    <div className="min-h-full bg-white">

      {/* ── Hero header ─────────────────────────────────────────── */}
      <div className="px-5 lg:px-16 pt-8 lg:pt-14 pb-4 lg:pb-6">
        <p className="text-[10px] lg:text-[11px] text-black/30 uppercase tracking-[0.25em] mb-3">Atelier Kollektion</p>
        <h1 className="text-[32px] lg:text-[44px] font-extralight text-black leading-[1.1] tracking-tight">
          Maßschuhe
        </h1>
        <p className="text-[13px] lg:text-[15px] text-black/40 mt-3 lg:mt-4 max-w-lg leading-[1.7] font-light">
          Individuell angepasst an Ihren Fuß. Jedes Paar wird in über 200 Arbeitsschritten von Hand gefertigt.
        </p>
      </div>

      {/* ── Category navigation (LV tab style) ──────────────────── */}
      <div className="px-5 lg:px-16 pb-5 lg:pb-8 border-b border-black/[0.06]">
        <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {CATEGORIES.map(cat => {
            const count = cat.value === 'ALL' ? enriched.length : enriched.filter(p => p.category === cat.value).length
            return (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={`flex-shrink-0 px-4 py-2 text-[11px] lg:text-[12px] border-0 bg-transparent transition-all ${
                  activeCategory === cat.value
                    ? 'text-black font-medium'
                    : 'text-black/30 hover:text-black/60'
                }`}
                style={{
                  letterSpacing: '0.06em',
                  borderBottom: activeCategory === cat.value ? '2px solid black' : '2px solid transparent',
                }}
              >
                {cat.label}
                {count > 0 && <span className="text-black/20 ml-1.5 font-light">{count}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Product count ───────────────────────────────────────── */}
      <div className="px-5 lg:px-16 pt-5 lg:pt-6 pb-2">
        <p className="text-[11px] text-black/25 font-light">{filtered.length} {filtered.length === 1 ? 'Modell' : 'Modelle'}</p>
      </div>

      {/* ── Products ────────────────────────────────────────────── */}
      <div className="px-5 lg:px-16 pb-16">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-[14px] font-light text-black/60">Diese Kategorie wird gerade kuratiert.</p>
            <p className="text-[12px] text-black/25 mt-2">Bald verfügbar.</p>
          </div>
        ) : (
          <div className="space-y-8 lg:space-y-12">

            {/* Featured hero product */}
            {hero && (
              <ProductCard
                product={hero}
                onSelect={selectShoe}
                isFav={favorites.includes(String(hero.id))}
                onToggleFav={() => toggleFavorite(hero.id)}
                isPromo={isPromo}
                featured
              />
            )}

            {/* Product grid */}
            {rest.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-8 lg:gap-x-6 lg:gap-y-12">
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
