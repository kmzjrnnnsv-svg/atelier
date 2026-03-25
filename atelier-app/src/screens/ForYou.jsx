/**
 * ForYou.jsx — "Für dich" homepage (LV-inspired luxury layout)
 * Full-width hero, edge-to-edge sections, clean product grids
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Heart, Package, Smartphone, Footprints, BookOpen, ShoppingBag, Gift, ArrowRight } from 'lucide-react'
import useAtelierStore from '../store/atelierStore'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../hooks/useApi'
import { isNative, isMobileWeb } from '../App'

// ── Section Header ──────────────────────────────────────────────────────────
function SectionLabel({ icon: Icon, color, label, onTap }) {
  return (
    <button onClick={onTap} className="flex items-center gap-1.5 mb-4 bg-transparent border-0 p-0 text-left active:opacity-60">
      {Icon && <Icon size={14} strokeWidth={2} style={{ color }} />}
      <span className="text-[14px] font-semibold" style={{ color }}>{label}</span>
      <ChevronRight size={14} strokeWidth={2} style={{ color, opacity: 0.5 }} />
    </button>
  )
}

// ── Product Card ──────────────────────────────────────────────────────────
function ProductCard({ product, onSelect }) {
  return (
    <button onClick={() => onSelect(product)} className="bg-transparent border-0 text-left p-0 w-full active:opacity-80 transition-opacity">
      <div className="w-full aspect-square overflow-hidden flex items-center justify-center mb-2 bg-white">
        {product.image ? (
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <svg viewBox="0 0 200 90" className="w-3/4 opacity-60">
            <path d="M15 75 Q12 80 28 84 L172 84 Q186 84 186 75 L182 62 Q178 50 165 48 L55 48 Q36 48 31 54 Z" fill={product.color || '#666'} />
            <path d="M31 54 Q27 37 50 28 L100 24 Q128 22 150 33 Q168 42 182 62 L165 48 L55 48 Q36 48 31 54 Z" fill={product.color || '#666'} opacity="0.85" />
          </svg>
        )}
      </div>
      <div>
        <p className="text-[13px] text-black leading-tight line-clamp-2">{product.name}</p>
        <p className="text-[13px] text-black/40 mt-0.5">{product.price}</p>
      </div>
    </button>
  )
}

// ── App Download Banner (mobile web only) ──────────────────────────────────
function AppBanner() {
  return (
    <div style={{ background: 'linear-gradient(135deg, #1D1D1F 0%, #2C2C2E 100%)' }}>
      <div className="px-5 py-5 flex items-center gap-4">
        <div className="w-12 h-12 bg-white/10 flex items-center justify-center flex-shrink-0">
          <Smartphone size={24} strokeWidth={1.5} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-white">ATELIER App</p>
          <p className="text-[12px] text-white/50 mt-0.5">3D-Fußscan, AR-Anprobe und mehr</p>
        </div>
        <ChevronRight size={18} strokeWidth={1.5} className="text-white/30 flex-shrink-0" />
      </div>
    </div>
  )
}

// ── Scan Banner (native app only) ───────────────────────────────────────
function ScanBanner({ scan, onScanTap }) {
  return (
    <button onClick={onScanTap} className="w-full bg-transparent border-0 text-left p-0 active:opacity-80">
      <div style={{ background: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)' }}>
        <div className="px-5 py-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-white/15 flex items-center justify-center flex-shrink-0">
            <Footprints size={24} strokeWidth={1.5} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-white">Dein 3D-Fußscan</p>
            {scan ? (
              <p className="text-[12px] text-white/60 mt-0.5">EU {scan.eu_size || '-'} · Genauigkeit {scan.accuracy ? `${scan.accuracy.toFixed(1)}%` : '-'}</p>
            ) : (
              <p className="text-[12px] text-white/60 mt-0.5">Jetzt scannen für perfekte Passform</p>
            )}
          </div>
          <ChevronRight size={18} strokeWidth={1.5} className="text-white/40 flex-shrink-0" />
        </div>
      </div>
    </button>
  )
}

// ── Article Card ─────────────────────────────────────────────────────────
const ARTICLE_THEME = {
  'Gesundheit': { color: '#FF3B30' },
  'Tipps':      { color: '#FF9500' },
  'Wissen':     { color: '#007AFF' },
  'Allgemein':  { color: '#8E8E93' },
}

function ArticleCard({ article, onClick }) {
  const theme = ARTICLE_THEME[article.category] || ARTICLE_THEME.Allgemein
  return (
    <button onClick={onClick} className="w-full bg-white border-0 text-left p-0 active:opacity-80 overflow-hidden">
      {article.image_data ? (
        <div className="w-full aspect-[16/9] overflow-hidden">
          <img src={article.image_data} alt={article.title} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-full aspect-[16/9] flex items-center justify-center" style={{ background: theme.color + '10' }}>
          <BookOpen size={28} strokeWidth={1} style={{ color: theme.color, opacity: 0.3 }} />
        </div>
      )}
      <div className="p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: theme.color, letterSpacing: '0.1em' }}>{article.category}</p>
        <p className="text-[14px] font-semibold text-black leading-snug line-clamp-2">{article.title}</p>
        {article.subtitle && <p className="text-[12px] text-black/40 mt-1 line-clamp-2">{article.subtitle}</p>}
      </div>
    </button>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
export default function ForYou() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { shoes, favorites, orders, latestScan, articles, accessories } = useAtelierStore()
  const [recentOrders, setRecentOrders] = useState([])
  const [featuredShoes, setFeaturedShoes] = useState([])

  useEffect(() => {
    apiFetch('/api/orders').then(o => setRecentOrders((o || []).slice(0, 4))).catch(() => {})
    apiFetch('/api/settings/featured-shoes').then(data => setFeaturedShoes(data || [])).catch(() => {})
  }, [])

  const favShoes = shoes.filter(s => favorites.includes(String(s.id)))

  const selectShoe = (product) => navigate('/customize', { state: { product } })

  // Hero shoe for full-width banner
  const heroShoe = shoes.find(s => s.tag === 'BESTSELLER') || shoes[0]

  // Published articles for bottom section
  const publishedArticles = (articles || []).filter(a => a.status === 'published').slice(0, 4)

  return (
    <div className="min-h-full bg-white">

      {/* ── Hero Banner (edge-to-edge) ─────────────────────────────── */}
      {heroShoe && (
        <button onClick={() => selectShoe(heroShoe)} className="w-full bg-transparent border-0 p-0 text-left active:opacity-90 transition-opacity">
          <div className="w-full aspect-[3/4] lg:aspect-[16/7] overflow-hidden bg-white relative">
            {heroShoe.image ? (
              <img src={heroShoe.image} alt={heroShoe.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ background: heroShoe.color || '#1D1D1F' }}>
                <span className="text-white/20 text-[60px] font-bold">ATELIER</span>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 p-5 lg:p-8" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.5))' }}>
              <p className="text-[22px] lg:text-[28px] font-bold text-white">{heroShoe.name}</p>
              <p className="text-[14px] text-white/70 mt-1">{heroShoe.material} · {heroShoe.price}</p>
            </div>
          </div>
        </button>
      )}

      {/* ── Scan / App Banner (edge-to-edge) ──────────────────────── */}
      <div className="mt-4">
        {isNative ? (
          <ScanBanner scan={latestScan} onScanTap={() => navigate(latestScan ? '/my-scans' : '/scan')} />
        ) : (
          <AppBanner />
        )}
      </div>

      {/* ── Empfehlungen (CMS-curated) ─────────────────────────────── */}
      {featuredShoes.length > 0 && (
        <div className="mt-10">
          <div className="px-5 lg:px-8">
            <SectionLabel icon={Heart} color="#000" label="Empfohlen" onTap={() => navigate('/collection')} />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 px-5 lg:px-8">
            {featuredShoes.map(shoe => (
              <ProductCard key={shoe.id} product={{...shoe, price: shoe.price || `€ ${shoe.base_price || ''}`}} onSelect={selectShoe} />
            ))}
          </div>
        </div>
      )}

      {/* ── Gespeichert (Favorites) ────────────────────────────────── */}
      {favShoes.length > 0 && (
        <div className="mt-10">
          <div className="px-5 lg:px-8">
            <SectionLabel icon={Heart} color="#FF3B30" label="Gespeichert" onTap={() => navigate('/wishlist')} />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-5 lg:px-8">
            {favShoes.slice(0, 4).map(shoe => (
              <ProductCard key={shoe.id} product={shoe} onSelect={selectShoe} />
            ))}
          </div>
        </div>
      )}

      {/* ── Letzte Bestellungen ────────────────────────────────────── */}
      {recentOrders.length > 0 && (
        <div className="mt-10">
          <div className="px-5 lg:px-8">
            <SectionLabel icon={Package} color="#34C759" label="Deine Bestellungen" onTap={() => navigate('/orders')} />
          </div>
          <div className="px-5 lg:px-8 space-y-2">
            {recentOrders.map(order => (
              <button key={order.id} onClick={() => navigate('/orders')} className="w-full bg-white border-0 text-left p-4 active:opacity-80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-black/5 flex items-center justify-center flex-shrink-0">
                    <Package size={16} strokeWidth={1.5} className="text-black/30" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-black truncate">{order.shoe_name}</p>
                    <p className="text-[11px] text-black/40 mt-0.5">{order.material} · {order.price}</p>
                  </div>
                </div>
                <ChevronRight size={14} strokeWidth={1.5} className="text-black/20 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Artikel ────────────────────────────────────────────────── */}
      {publishedArticles.length > 0 && (
        <div className="mt-10">
          <div className="px-5 lg:px-8">
            <SectionLabel icon={BookOpen} color="#007AFF" label="Artikel" onTap={() => navigate('/explore')} />
          </div>
          <div className="px-5 lg:px-8 space-y-3">
            {publishedArticles.map(article => (
              <ArticleCard key={article.id} article={article} onClick={() => navigate('/explore')} />
            ))}
          </div>
        </div>
      )}

      {/* ── Kollektion CTA (desktop: fuller page) ───────────────────── */}
      <div className="mt-10">
        <button onClick={() => navigate('/collection')} className="w-full bg-transparent border-0 p-0 text-left active:opacity-90">
          <div className="w-full overflow-hidden relative" style={{ background: '#1D1D1F' }}>
            <div className="px-5 lg:px-8 py-8 lg:py-14 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-2">Handgefertigt</p>
                <p className="text-[22px] lg:text-[28px] font-bold text-white leading-tight">Die gesamte Kollektion</p>
                <p className="text-[14px] text-white/50 mt-2 max-w-md">Maßschuhe, individuell angepasst an deinen Fuß. Jedes Paar ein Unikat.</p>
              </div>
              <ArrowRight size={24} strokeWidth={1.5} className="text-white/40 flex-shrink-0 hidden lg:block" />
            </div>
          </div>
        </button>
      </div>

      {/* ── Alle Produkte (desktop: show full grid) ──────────────── */}
      {shoes.length > 0 && (
        <div className="mt-10 hidden lg:block">
          <div className="px-5 lg:px-8">
            <SectionLabel icon={ShoppingBag} color="#000" label="Unsere Schuhe" onTap={() => navigate('/collection')} />
          </div>
          <div className="grid grid-cols-3 lg:grid-cols-4 gap-3 px-5 lg:px-8">
            {shoes.slice(0, 8).map(shoe => (
              <ProductCard key={shoe.id} product={shoe} onSelect={selectShoe} />
            ))}
          </div>
        </div>
      )}

      {/* ── Zubehör Teaser ───────────────────────────────────────── */}
      {(accessories || []).filter(a => a.is_active !== 0).length > 0 && (
        <div className="mt-10">
          <div className="px-5 lg:px-8">
            <SectionLabel icon={Gift} color="#000" label="Zubehör" onTap={() => navigate('/accessories')} />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-5 lg:px-8">
            {(accessories || []).filter(a => a.is_active !== 0).slice(0, 4).map(acc => (
              <button key={acc.id} onClick={() => navigate('/accessories')} className="bg-transparent border-0 text-left p-0 w-full active:opacity-80 transition-opacity">
                <div className="w-full aspect-square overflow-hidden flex items-center justify-center mb-2 bg-black/[0.02]">
                  {acc.image_data ? (
                    <img src={acc.image_data} alt={acc.name} className="w-full h-full object-cover" />
                  ) : (
                    <Gift size={24} strokeWidth={1} className="text-black/10" />
                  )}
                </div>
                <div>
                  <p className="text-[13px] text-black leading-tight line-clamp-2">{acc.name}</p>
                  <p className="text-[13px] text-black/40 mt-0.5">€ {parseFloat(acc.price) || 0}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Service Promise Banner ────────────────────────────────── */}
      <div className="mt-10 border-t border-black/5">
        <div className="px-5 lg:px-8 py-8 lg:py-10 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="text-center lg:text-left">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-black/30 mb-1">Handgefertigt</p>
            <p className="text-[14px] font-semibold text-black">Jeder Schuh ein Unikat</p>
            <p className="text-[12px] text-black/40 mt-1">Von Hand gefertigt aus erlesenen Materialien.</p>
          </div>
          <div className="text-center lg:text-left">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-black/30 mb-1">3D-Fußscan</p>
            <p className="text-[14px] font-semibold text-black">Perfekte Passform</p>
            <p className="text-[12px] text-black/40 mt-1">Millimetergenau vermessen für maximalen Komfort.</p>
          </div>
          <div className="text-center lg:text-left">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-black/30 mb-1">Kostenloser Versand</p>
            <p className="text-[14px] font-semibold text-black">Ab € 500 Bestellwert</p>
            <p className="text-[12px] text-black/40 mt-1">Sicher verpackt und versichert direkt zu dir.</p>
          </div>
        </div>
      </div>

      {/* ── Bottom spacer ──────────────────────────────────────────── */}
      <div className="h-12" />
    </div>
  )
}
