import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingBag, Heart, RotateCcw, ScanLine, Info, X, Minus, Plus, Trash2 } from 'lucide-react'
import useAtelierStore from '../store/atelierStore'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../hooks/useApi'

// Category display labels → backend filter values
const CATEGORIES = [
  { label: 'ALLE',       value: 'ALL'     },
  { label: 'LOAFERS',    value: 'LOAFER'  },
  { label: 'OXFORDS',    value: 'OXFORD'  },
  { label: 'DERBY',      value: 'DERBY'   },
  { label: 'CHELSEA',    value: 'BOOT'    },
  { label: 'SNEAKER',    value: 'SNEAKER' },
  { label: 'WHOLECUTS',  value: 'MONK'    },
]

// ── Swipe hook ─────────────────────────────────────────────────────────────
function useSwipeTabs(items, activeKey, setActiveKey) {
  const startX = useRef(0)
  const startY = useRef(0)
  const onTouchStart = useCallback(e => {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
  }, [])
  const onTouchEnd = useCallback(e => {
    const dx = e.changedTouches[0].clientX - startX.current
    const dy = e.changedTouches[0].clientY - startY.current
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return
    const idx = items.indexOf(activeKey)
    if (dx < 0 && idx < items.length - 1) setActiveKey(items[idx + 1])
    if (dx > 0 && idx > 0) setActiveKey(items[idx - 1])
  }, [items, activeKey, setActiveKey])
  return { onTouchStart, onTouchEnd }
}

function personalMatch(baseMatch, scanAccuracy, shoeId) {
  if (!scanAccuracy) return baseMatch
  const variation = ((shoeId * 13 + 7) % 17) * 0.03
  const pct = Math.min(99.9, scanAccuracy + variation)
  return `${pct.toFixed(1)}%`
}

// ── Match Tooltip ───────────────────────────────────────────────────────────
function MatchBadge({ match, variant = 'dark' }) {
  const [showTip, setShowTip] = useState(false)
  if (!match) return null
  const isDark = variant === 'dark'
  return (
    <div className="relative">
      <button
        onClick={e => { e.stopPropagation(); setShowTip(v => !v) }}
        className={`flex items-center gap-1 px-2.5 py-2 border-0 ${
          isDark
            ? 'bg-teal-500/20 border border-teal-400/40'
            : 'bg-white/90'
        }`}
      >
        <div className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-teal-400' : 'bg-teal-500'}`} />
        <span className={`text-[9px] font-light ${isDark ? 'text-teal-300' : 'text-teal-700'}`}>{match}</span>
        <Info size={8} strokeWidth={1.5} className={isDark ? 'text-teal-400/60' : 'text-teal-600/50'} />
      </button>
      {showTip && (
        <div
          className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-52 bg-black text-white px-3 py-2.5 shadow-lg z-50"
          onClick={e => e.stopPropagation()}
        >
          <p className="text-[10px] font-light uppercase tracking-[0.15em] mb-1">Passgenauigkeit</p>
          <p className="text-[9px] text-white/50 leading-relaxed">
            Berechnet aus deinem 3D-Fußscan und der Schuhgeometrie. Je höher der Wert, desto besser passt der Schuh zu deiner Fußform.
          </p>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-black rotate-45" />
        </div>
      )}
    </div>
  )
}

// ── Hero Card (featured first shoe) ────────────────────────────────────────
function HeroCard({ product, onSelect, isFav, onToggleFav }) {
  return (
    <div
      className="relative overflow-hidden mb-5 cursor-pointer active:scale-[0.98] transition-transform"
      style={{ height: 'clamp(180px, 30dvh, 280px)' }}
      onClick={() => onSelect(product)}
    >
      {product.image ? (
        <img src={product.image} alt={product.name} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: '#f6f5f3' }}>
          <svg viewBox="0 0 260 120" className="w-56 opacity-90">
            <ellipse cx="130" cy="108" rx="112" ry="9" fill="#d1d5db" />
            <path d="M20 92 Q17 100 38 104 L222 104 Q238 104 238 92 L232 72 Q226 55 210 53 L72 53 Q47 53 42 61 Z" fill={product.color || '#374151'} />
            <path d="M42 61 Q37 42 62 30 L120 24 Q155 21 178 36 Q198 48 232 72 L210 53 Q180 44 148 46 L90 47 Q60 49 42 61 Z" fill={product.color || '#374151'} opacity="0.85" />
            <path d="M87 47 L210 53 Q210 44 178 36 Q155 21 120 24 L87 28 Z" fill="white" opacity="0.1" />
          </svg>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {product.tag && (
        <div className="absolute top-4 left-4 bg-black text-white text-[8px] uppercase tracking-[0.16em] font-light px-2.5 py-1">
          {product.tag}
        </div>
      )}

      <button
        className="absolute top-4 right-4 w-8 h-8 bg-white/20 backdrop-blur-sm flex items-center justify-center border-0"
        onClick={e => { e.stopPropagation(); onToggleFav() }}
      >
        <Heart size={15} strokeWidth={1.5} className={isFav ? 'text-black fill-black' : 'text-white'} />
      </button>

      <div className="absolute bottom-0 left-0 right-0 p-4">
        <p className="text-[9px] uppercase tracking-[0.16em] text-white/50 mb-0.5">{product.material}</p>
        <h3 className="text-lg font-light text-white leading-tight uppercase tracking-[0.06em]">{product.name}</h3>
        <p className="text-sm text-white/50 mt-0.5">{product.price}</p>

        <div className="flex items-center gap-2 mt-3">
          <button
            className="flex items-center gap-1.5 bg-white text-black text-[9px] font-light uppercase tracking-widest px-3.5 py-2 border-0"
            onClick={e => { e.stopPropagation(); onSelect(product) }}
          >
            <ScanLine size={13} strokeWidth={1.5} />
            3D Visualize
          </button>
          <MatchBadge match={product.match} variant="dark" />
        </div>
      </div>
    </div>
  )
}

// ── Grid Card ───────────────────────────────────────────────────────────────
function GridCard({ product, onSelect, isFav, onToggleFav }) {
  return (
    <div
      className="bg-white overflow-hidden cursor-pointer active:scale-95 transition-transform border border-black/8"
      onClick={() => onSelect(product)}
    >
      <div className="relative h-36 flex items-center justify-center" style={{ background: '#f6f5f3' }}>
        <button
          className="absolute top-2 right-2 w-7 h-7 bg-white/80 flex items-center justify-center border-0 z-10"
          onClick={e => { e.stopPropagation(); onToggleFav() }}
        >
          <Heart size={13} strokeWidth={1.5} className={isFav ? 'text-black fill-black' : 'text-black/35'} />
        </button>

        {product.image ? (
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <svg viewBox="0 0 200 90" className="w-40 opacity-80">
            <ellipse cx="100" cy="82" rx="88" ry="9" fill="#e5e7eb" />
            <path d="M15 75 Q12 80 28 84 L172 84 Q186 84 186 75 L182 62 Q178 50 165 48 L55 48 Q36 48 31 54 Z" fill={product.color || '#374151'} />
            <path d="M31 54 Q27 37 50 28 L100 24 Q128 22 150 33 Q168 42 182 62 L165 48 Q140 41 112 42 L68 43 Q45 44 31 54 Z" fill={product.color || '#374151'} opacity="0.85" />
          </svg>
        )}

        {product.match && (
          <div className="absolute bottom-2 right-2">
            <MatchBadge match={product.match} variant="light" />
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="text-[8px] uppercase tracking-widest text-black/35">{product.category}</p>
        <p className="text-sm font-light text-black mt-0.5 leading-tight">{product.name}</p>
        <p className="text-[10px] text-black/35 italic mt-0.5">{product.material}</p>
        <p className="text-sm font-normal text-black mt-1.5">{product.price}</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ShoeCollection() {
  const navigate     = useNavigate()
  const { shoes, favorites, toggleFavorite, cart, removeFromCart, updateCartQty } = useAtelierStore()
  const { user }     = useAuth()
  const [activeCategory, setActiveCategory] = useState('ALL')
  const [scanAccuracy,   setScanAccuracy]   = useState(null)
  const [cartOpen,       setCartOpen]       = useState(false)
  const catValues = CATEGORIES.map(c => c.value)
  const swipeHandlers = useSwipeTabs(catValues, activeCategory, setActiveCategory)

  useEffect(() => {
    apiFetch('/api/scans/mine')
      .then(scans => { if (scans?.length) setScanAccuracy(scans[0].accuracy) })
      .catch(() => {})
  }, [])

  const enriched = shoes.map(s => ({
    ...s,
    match: personalMatch(s.match, scanAccuracy, Number(s.id)),
  }))

  const filtered = activeCategory === 'ALL' ? enriched : enriched.filter(p => p.category === activeCategory)
  const [hero, ...rest] = filtered

  return (
    <div className="flex flex-col min-h-full bg-white relative">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between bg-white">
        <div>
          <p className="text-[17px] font-normal text-black leading-tight uppercase tracking-[0.15em]">{user?.name || 'My Studio'}</p>
        </div>
        <button
          className="w-9 h-9 flex items-center justify-center border border-black/10 bg-transparent relative"
          onClick={() => setCartOpen(v => !v)}
        >
          <ShoppingBag size={17} strokeWidth={1.5} className="text-black/60" />
          {cart.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-black border-2 border-white flex items-center justify-center">
              <span className="text-[8px] font-bold text-white">{cart.reduce((s, c) => s + c.qty, 0)}</span>
            </span>
          )}
        </button>
      </div>

      {/* ── Warenkorb (slide in from right) ────────────────────────────── */}
      <div className="fixed top-0 right-0 bottom-0 bg-white shadow-2xl z-50 flex flex-col"
        style={{ width: 'min(340px, 85vw)', transform: cartOpen ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1)' }}>
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-black/5">
          <h3 className="text-[12px] uppercase tracking-[0.18em] text-black font-medium">Warenkorb</h3>
          <button onClick={() => setCartOpen(false)} className="w-9 h-9 flex items-center justify-center border border-black/10 bg-transparent">
            <X size={17} strokeWidth={1.5} className="text-black/60" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingBag size={32} className="text-black/10 mb-3" />
              <p className="text-[11px] text-black/40">Dein Warenkorb ist leer</p>
              <p className="text-[9px] text-black/30 mt-1">Konfiguriere einen Schuh und füge ihn hinzu.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map(item => (
                <div key={item.id} className="border border-black/8 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-medium text-black">{item.name}</p>
                    <button onClick={() => removeFromCart(item.id)} className="bg-transparent border-0 p-0">
                      <Trash2 size={13} className="text-black/25" strokeWidth={1.5} />
                    </button>
                  </div>
                  <p className="text-[9px] text-black/40 mt-0.5">{item.material} · {item.color}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateCartQty(item.id, item.qty - 1)} className="w-6 h-6 flex items-center justify-center border border-black/10 bg-transparent">
                        <Minus size={11} className="text-black/50" />
                      </button>
                      <span className="text-[10px] font-semibold text-black w-4 text-center">{item.qty}</span>
                      <button onClick={() => updateCartQty(item.id, item.qty + 1)} className="w-6 h-6 flex items-center justify-center border border-black/10 bg-transparent">
                        <Plus size={11} className="text-black/50" />
                      </button>
                    </div>
                    <span className="text-[11px] font-semibold text-black">{item.price}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="px-5 pb-5 pt-3 border-t border-black/5">
          <button onClick={() => { setCartOpen(false); navigate('/checkout') }}
            disabled={cart.length === 0}
            className={`w-full py-3 text-[10px] uppercase tracking-[0.18em] font-medium border-0 ${cart.length > 0 ? 'bg-black text-white' : 'bg-black/10 text-black/30'}`}>
            Zur Kasse
          </button>
        </div>
      </div>
      {cartOpen && <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setCartOpen(false)} />}

      {/* ── Title + Category Tabs ──────────────────────────────────────── */}
      <div className="px-5 pb-3 bg-white border-b border-black/8">
        <h2 className="text-2xl font-light text-black leading-tight uppercase tracking-[0.15em]">Collection</h2>
        <p className="text-[10px] text-black/35 mt-0.5">Luxury footwear precisely crafted to your 3D biometric scan.</p>

        <div className="flex gap-5 mt-3 overflow-x-auto pb-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`text-[9px] uppercase tracking-widest whitespace-nowrap pb-2 font-normal border-b-2 transition-all bg-transparent border-l-0 border-r-0 border-t-0 px-0 ${
                activeCategory === cat.value ? 'text-black border-black' : 'text-black/35 border-black/0'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="flex-1 px-4 pt-4 pb-4" {...swipeHandlers}>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-black/35">
            <ShoppingBag size={32} strokeWidth={1} className="mx-auto mb-3 text-black/25" />
            <p className="text-sm font-normal text-black/45">Bald verfügbar</p>
            <p className="text-xs text-black/35 mt-1">Diese Kategorie wird gerade kuratiert.</p>
            <button
              onClick={() => setActiveCategory(CATEGORIES[0].value)}
              className="mt-4 text-xs text-black font-normal bg-black/5 px-4 py-2 border-0"
            >
              Andere Modelle entdecken
            </button>
          </div>
        ) : (
          <>
            {hero && (
              <HeroCard
                product={hero}
                onSelect={() => navigate('/customize', { state: { product: hero } })}
                isFav={favorites.includes(hero.id)}
                onToggleFav={() => toggleFavorite(hero.id)}
              />
            )}

            {rest.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-light text-black uppercase tracking-[0.15em]">Curated for you</h3>
                  <button
                    onClick={() => navigate('/wishlist')}
                    className="text-[9px] uppercase tracking-widest text-black/35 font-normal bg-transparent border-0 p-0 flex items-center gap-1"
                  >
                    <Heart size={10} strokeWidth={1.5} className={favorites.length > 0 ? 'text-black fill-black' : 'text-black/35'} />
                    Wishlist {favorites.length > 0 ? `(${favorites.length})` : ''}
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-5">
                  {rest.map(product => (
                    <GridCard
                      key={product.id}
                      product={product}
                      onSelect={() => navigate('/customize', { state: { product } })}
                      isFav={favorites.includes(product.id)}
                      onToggleFav={() => toggleFavorite(product.id)}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* YOUR 3D PROFILE row */}
        <div
          className="flex items-center justify-between px-4 py-3.5 mb-4 cursor-pointer active:bg-black/5 transition-colors border border-black/8"
          style={{ background: '#f6f5f3' }}
          onClick={() => navigate('/scan')}
        >
          <div>
            <p className="text-[8px] uppercase tracking-[0.16em] text-black/35 font-normal">Your 3D Profile</p>
            <p className="text-[10px] text-black font-normal mt-0.5">
              {scanAccuracy ? `Last Scan · Size EU 43 · ${scanAccuracy.toFixed(1)}% accuracy` : 'Scan your feet for a perfect fit'}
            </p>
          </div>
          <button className="w-8 h-8 bg-white shadow-sm flex items-center justify-center border border-black/8">
            <RotateCcw size={14} className="text-black/45" strokeWidth={1.5} />
          </button>
        </div>
      </div>

    </div>
  )
}
