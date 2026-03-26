/**
 * Wishlist.jsx — LV-inspired wishlist page
 * Warm tones, elegant typography, generous whitespace
 */
import { useNavigate } from 'react-router-dom'
import { Heart, ShoppingBag } from 'lucide-react'
import useAtelierStore from '../store/atelierStore'
import CtaBanner from '../components/CtaBanner'
import { SHOES, HEROES } from '../lib/editorialImages'

export default function Wishlist() {
  const navigate = useNavigate()
  const { shoes, favorites, toggleFavorite } = useAtelierStore()

  const wishlist = shoes.filter(s => favorites.includes(s.id))

  return (
    <div className="min-h-full bg-white">

      {/* ── Hero banner — compact, LV-style ─────────────────────── */}
      <div className="relative">
        <div className="w-full overflow-hidden" style={{ aspectRatio: '16 / 4' }}>
          <img src={SHOES.hero} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 flex items-end" style={{ background: 'linear-gradient(transparent 20%, rgba(0,0,0,0.5) 100%)' }}>
          <div className="px-5 lg:px-16 pb-6 lg:pb-10">
            <p className="text-[10px] text-white/40 uppercase tracking-[0.25em] mb-2">Atelier Kollektion</p>
            <h1 className="text-[22px] lg:text-[28px] font-extralight text-white leading-[1.1] tracking-tight">
              Wunschliste
            </h1>
          </div>
        </div>
      </div>

      {/* ── Product count ───────────────────────────────────────── */}
      <div className="px-5 lg:px-16 pb-2 border-b border-black/[0.06]">
        <p className="text-[11px] text-black/25 font-light pb-5">{wishlist.length} {wishlist.length === 1 ? 'Modell' : 'Modelle'}</p>
      </div>

      {/* ── Content ─────────────────────────────────────────────── */}
      {wishlist.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center px-5">
          <Heart size={32} className="text-black/10 mb-4" strokeWidth={1} />
          <p className="text-[14px] font-light text-black/60">Noch keine Favoriten</p>
          <p className="text-[12px] text-black/30 mt-2 max-w-[260px] leading-relaxed font-light">
            Markieren Sie Schuhe in der Kollektion mit einem Herz.
          </p>
          <button
            onClick={() => navigate('/collection')}
            className="mt-6 px-8 h-12 bg-[#19110B] text-white text-[11px] border border-[#19110B] hover:bg-white hover:text-[#19110B] transition-all duration-300"
            style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}
          >
            Kollektion entdecken
          </button>
        </div>
      ) : (
        <div className="px-5 lg:px-16 pb-16 pt-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-8 lg:gap-x-6 lg:gap-y-12">
            {wishlist.map(product => (
              <div key={product.id} className="group">
                {/* Product image */}
                <div
                  className="w-full overflow-hidden flex items-center justify-center bg-[#f6f5f3] mb-3 lg:mb-4 relative cursor-pointer transition-all duration-500 group-hover:bg-[#efeee9]"
                  style={{ aspectRatio: '3 / 4' }}
                  onClick={() => navigate('/customize', { state: { product } })}
                >
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                  ) : (
                    <svg viewBox="0 0 260 130" className="w-3/5 opacity-60">
                      <ellipse cx="130" cy="120" rx="100" ry="8" fill="#00000008" />
                      <path d="M20 100 Q17 108 38 112 L222 112 Q238 112 238 100 L232 80 Q226 62 210 60 L72 60 Q47 60 42 68 Z" fill={product.color || '#374151'} />
                      <path d="M42 68 Q37 48 62 36 L120 30 Q155 27 178 42 Q198 54 232 80 L210 60 Q180 50 148 52 L90 53 Q60 55 42 68 Z" fill={product.color || '#374151'} opacity="0.85" />
                    </svg>
                  )}

                  {/* Wishlist button */}
                  <button
                    className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center border-0 bg-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    onClick={e => { e.stopPropagation(); toggleFavorite(product.id) }}
                  >
                    <Heart size={16} strokeWidth={1.5} className="text-black fill-black" />
                  </button>
                </div>

                {/* Info */}
                <div className="cursor-pointer" onClick={() => navigate('/customize', { state: { product } })}>
                  <p className="text-[10px] text-black/25 uppercase tracking-[0.15em] font-light">{product.category}</p>
                  <p className="text-[12px] lg:text-[13px] text-black font-normal leading-snug mt-1">{product.name}</p>
                  {product.material && (
                    <p className="text-[11px] text-black/30 mt-0.5 font-light">{product.material}</p>
                  )}
                  <p className="text-[12px] lg:text-[13px] text-black/50 mt-1.5 font-light">{product.price}</p>
                </div>

                {/* Configure button */}
                <button
                  onClick={() => navigate('/customize', { state: { product } })}
                  className="mt-3 w-full h-10 lg:h-11 flex items-center justify-center gap-2 text-[11px] lg:text-[12px] bg-white text-black border border-black/15 hover:bg-black hover:text-white hover:border-black transition-all duration-300"
                  style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}
                >
                  Konfigurieren
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CTA Banner (CMS-controlled) ──────────────────────── */}
      <div className="px-5 lg:px-16 pb-16">
        <CtaBanner page="wishlist" />
      </div>
    </div>
  )
}
