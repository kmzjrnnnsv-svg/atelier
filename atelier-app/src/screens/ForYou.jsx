/**
 * ForYou.jsx — "Für dich" homepage (LV-inspired luxury layout)
 * Full-width hero, edge-to-edge sections, clean product grids
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Heart, Package, Award, Star, Footprints, Smartphone } from 'lucide-react'
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
function ProductCard({ product, onSelect, large }) {
  return (
    <button onClick={() => onSelect(product)} className="bg-transparent border-0 text-left p-0 w-full active:opacity-80 transition-opacity">
      <div className={`w-full ${large ? 'aspect-[3/4]' : 'aspect-square'} overflow-hidden flex items-center justify-center mb-3 bg-white`}>
        {product.image ? (
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <svg viewBox="0 0 200 90" className="w-3/4 opacity-60">
            <path d="M15 75 Q12 80 28 84 L172 84 Q186 84 186 75 L182 62 Q178 50 165 48 L55 48 Q36 48 31 54 Z" fill={product.color || '#666'} />
            <path d="M31 54 Q27 37 50 28 L100 24 Q128 22 150 33 Q168 42 182 62 L165 48 L55 48 Q36 48 31 54 Z" fill={product.color || '#666'} opacity="0.85" />
          </svg>
        )}
      </div>
      <div className="px-2">
        <p className="text-[13px] text-black leading-tight line-clamp-2">{product.name}</p>
        <p className="text-[13px] text-black/40 mt-1">{product.price}</p>
      </div>
    </button>
  )
}

// ── Order Card ──────────────────────────────────────────────────────────────
function OrderCard({ order, onClick }) {
  const statusLabels = {
    pending: 'In Bearbeitung', confirmed: 'Bestätigt',
    quality_check: 'Qualitätskontrolle', shipped: 'Versandt', delivered: 'Zugestellt',
  }
  return (
    <button onClick={onClick} className="bg-transparent border-0 text-left p-0 w-full active:opacity-80">
      <div className="w-full aspect-[4/3] overflow-hidden flex items-center justify-center mb-2 bg-white">
        <Package size={32} strokeWidth={1} className="text-black/15" />
      </div>
      <p className="text-[13px] text-black leading-tight">Bestellung #{order.id}</p>
      <p className="text-[13px] text-black/40 mt-0.5">{statusLabels[order.status] || order.status}</p>
    </button>
  )
}

// ── Loyalty Banner ──────────────────────────────────────────────────────────
function LoyaltyBanner({ status, tiers }) {
  const currentTier = tiers?.find(t => t.name?.toLowerCase() === status?.tier?.toLowerCase()) || tiers?.[0]
  return (
    <div style={{ background: 'linear-gradient(135deg, #1D1D1F 0%, #3A3A3C 100%)' }}>
      <div className="px-5 py-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-white/40 font-medium uppercase tracking-wider">Treueprogramm</p>
            <p className="text-[22px] font-bold text-white mt-1">{status?.points || 0} Punkte</p>
          </div>
          <div className="w-11 h-11 bg-white/10 flex items-center justify-center">
            <Award size={22} strokeWidth={1.5} className="text-amber-400" />
          </div>
        </div>
        {currentTier && (
          <div className="flex items-center gap-2 mt-3">
            <div className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.min(100, ((status?.points || 0) / (currentTier.min_points + 500)) * 100)}%` }} />
            </div>
            <span className="text-[11px] text-white/40 font-medium">{currentTier.name}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── App Download Banner (mobile web only, replaces scan banner) ──────────
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

// ═════════════════════════════════════════════════════════════════════════════
export default function ForYou() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { shoes, favorites, orders, latestScan, loyaltyTiers, loyaltyStatus } = useAtelierStore()
  const [recentOrders, setRecentOrders] = useState([])

  useEffect(() => {
    apiFetch('/api/orders').then(o => setRecentOrders((o || []).slice(0, 4))).catch(() => {})
  }, [])

  const favShoes = shoes.filter(s => favorites.includes(String(s.id)))
  const recommended = shoes.filter(s => s.match && parseFloat(s.match) > 90).slice(0, 6)
  const recentlyViewed = shoes.slice(0, 4)

  const selectShoe = (product) => navigate('/customize', { state: { product } })

  // Hero shoe for full-width banner
  const heroShoe = shoes.find(s => s.tag === 'BESTSELLER') || shoes[0]

  return (
    <div className="min-h-full bg-[#F2F2F7]">

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

      {/* ── Empfohlen für dich ─────────────────────────────────────── */}
      {recommended.length > 0 && (
        <div className="mt-10">
          <div className="px-5 lg:px-8">
            <SectionLabel icon={Star} color="#FF9500" label="Empfohlen für dich" onTap={() => navigate('/collection')} />
          </div>
          <div className="flex gap-3 overflow-x-auto pl-5 lg:pl-8 lg:pr-8 lg:grid lg:grid-cols-4 lg:gap-3 lg:overflow-visible" style={{ scrollSnapType: 'x mandatory' }}>
            {recommended.map(shoe => (
              <div key={shoe.id} className="flex-shrink-0 lg:flex-shrink lg:!w-auto" style={{ width: '44vw', scrollSnapAlign: 'start' }}>
                <ProductCard product={shoe} onSelect={selectShoe} />
              </div>
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

      {/* ── Zuletzt angesehen ──────────────────────────────────────── */}
      {recentlyViewed.length > 0 && (
        <div className="mt-10">
          <div className="px-5 lg:px-8">
            <SectionLabel icon={Heart} color="#FF3B30" label="Zuletzt angesehen" onTap={() => navigate('/collection')} />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-5 lg:px-8">
            {recentlyViewed.map(shoe => (
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
          <div className="flex gap-3 overflow-x-auto pl-5 lg:pl-8 lg:pr-8 lg:grid lg:grid-cols-4 lg:gap-3 pb-1" style={{ scrollSnapType: 'x mandatory' }}>
            {recentOrders.map(order => (
              <div key={order.id} className="flex-shrink-0 lg:flex-shrink lg:!w-auto" style={{ width: '44vw', scrollSnapAlign: 'start' }}>
                <OrderCard order={order} onClick={() => navigate('/orders')} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Loyalty (edge-to-edge) ─────────────────────────────────── */}
      <div className="mt-10">
        <LoyaltyBanner status={loyaltyStatus} tiers={loyaltyTiers} />
      </div>

      {/* ── Bottom spacer ──────────────────────────────────────────── */}
      <div className="h-12" />
    </div>
  )
}
