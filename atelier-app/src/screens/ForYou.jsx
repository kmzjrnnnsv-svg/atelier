/**
 * ForYou.jsx — "Für dich" tab (Apple Store "For You" style)
 * Shows: personalized recommendations, favorites, recent orders, loyalty status, scan results
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Heart, Package, Award, Star, Footprints, Bookmark } from 'lucide-react'
import useAtelierStore from '../store/atelierStore'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../hooks/useApi'

// ── Section Header ──────────────────────────────────────────────────────────
function SectionLabel({ icon: Icon, color, label }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      {Icon && <Icon size={13} strokeWidth={2} style={{ color }} />}
      <span className="text-[13px] font-semibold" style={{ color }}>{label}</span>
      <ChevronRight size={13} strokeWidth={2} style={{ color, opacity: 0.6 }} />
    </div>
  )
}

// ── Small Product Card ──────────────────────────────────────────────────────
function ProductCard({ product, onSelect }) {
  return (
    <button
      onClick={() => onSelect(product)}
      className="bg-transparent border-0 text-left p-0 w-full"
    >
      <div className="w-full aspect-square rounded-2xl overflow-hidden flex items-center justify-center mb-2" style={{ background: '#F5F5F7' }}>
        {product.image ? (
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <svg viewBox="0 0 200 90" className="w-3/4 opacity-60">
            <path d="M15 75 Q12 80 28 84 L172 84 Q186 84 186 75 L182 62 Q178 50 165 48 L55 48 Q36 48 31 54 Z" fill={product.color || '#666'} />
            <path d="M31 54 Q27 37 50 28 L100 24 Q128 22 150 33 Q168 42 182 62 L165 48 L55 48 Q36 48 31 54 Z" fill={product.color || '#666'} opacity="0.85" />
          </svg>
        )}
      </div>
      <p className="text-[12px] text-black/90 leading-tight line-clamp-2">{product.name}</p>
      <p className="text-[12px] text-black/40 mt-0.5">{product.price}</p>
    </button>
  )
}

// ── Order Card ──────────────────────────────────────────────────────────────
function OrderCard({ order, onClick }) {
  const statusLabels = {
    pending: 'In Bearbeitung',
    confirmed: 'Bestätigt',
    quality_check: 'Qualitätskontrolle',
    shipped: 'Versandt',
    delivered: 'Zugestellt',
  }
  return (
    <button onClick={onClick} className="bg-transparent border-0 text-left p-0 w-full">
      <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden flex items-center justify-center mb-2" style={{ background: '#F5F5F7' }}>
        <Package size={32} strokeWidth={1} className="text-black/20" />
      </div>
      <p className="text-[12px] text-black/90 leading-tight line-clamp-2">Bestellung #{order.id}</p>
      <p className="text-[12px] text-black/40 mt-0.5">{statusLabels[order.status] || order.status}</p>
    </button>
  )
}

// ── Loyalty Banner ──────────────────────────────────────────────────────────
function LoyaltyBanner({ status, tiers }) {
  const currentTier = tiers?.find(t => t.name?.toLowerCase() === status?.tier?.toLowerCase()) || tiers?.[0]
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #1D1D1F 0%, #3A3A3C 100%)' }}>
      <div className="px-5 py-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-white/50 font-medium uppercase tracking-wider">Treueprogramm</p>
            <p className="text-[22px] font-bold text-white mt-1">{status?.points || 0} Punkte</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
            <Award size={24} strokeWidth={1.5} className="text-amber-400" />
          </div>
        </div>
        {currentTier && (
          <div className="flex items-center gap-2 mt-3">
            <div className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.min(100, ((status?.points || 0) / (currentTier.min_points + 500)) * 100)}%` }} />
            </div>
            <span className="text-[11px] text-white/50 font-medium">{currentTier.name}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Scan Banner ─────────────────────────────────────────────────────────────
function ScanBanner({ scan, onScanTap }) {
  return (
    <button onClick={onScanTap} className="w-full bg-transparent border-0 text-left p-0">
      <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)' }}>
        <div className="px-5 py-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
            <Footprints size={28} strokeWidth={1.5} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold text-white">Dein 3D-Fußscan</p>
            {scan ? (
              <p className="text-[13px] text-white/70 mt-0.5">
                EU {scan.eu_size || '–'} · Genauigkeit {scan.accuracy ? `${scan.accuracy.toFixed(1)}%` : '–'}
              </p>
            ) : (
              <p className="text-[13px] text-white/70 mt-0.5">Jetzt scannen für perfekte Passform</p>
            )}
          </div>
          <ChevronRight size={20} strokeWidth={1.5} className="text-white/50 flex-shrink-0" />
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
  const recentlyViewed = shoes.slice(0, 4) // placeholder — would use real view history

  const selectShoe = (product) => navigate('/customize', { state: { product } })

  return (
    <div className="min-h-full bg-white">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="px-5 lg:px-8 pt-3 lg:pt-8 pb-4 flex items-start justify-between">
        <div>
          <p className="text-[34px] lg:text-[40px] font-bold text-black leading-tight tracking-tight">Für dich</p>
        </div>
        <button
          onClick={() => navigate('/profile')}
          className="w-9 h-9 rounded-full bg-[#F5F5F7] flex items-center justify-center border-0 mt-1 flex-shrink-0"
        >
          <span className="text-[14px] font-semibold text-[#007AFF]">
            {user?.name?.charAt(0)?.toUpperCase() || 'A'}
          </span>
        </button>
      </div>

      <div className="px-5 lg:px-8 pb-8 space-y-7 lg:space-y-10">

        {/* ── 3D Scan Banner ──────────────────────────────────────── */}
        <ScanBanner scan={latestScan} onScanTap={() => navigate(latestScan ? '/my-scans' : '/scan')} />

        {/* ── Saved by you (Favorites) ────────────────────────────── */}
        {favShoes.length > 0 && (
          <div>
            <SectionLabel icon={Bookmark} color="#007AFF" label="Gespeichert" />
            <div className="flex gap-3 overflow-x-auto lg:grid lg:grid-cols-4 lg:overflow-visible pb-1" style={{ scrollSnapType: 'x mandatory' }}>
              {favShoes.map(shoe => (
                <div key={shoe.id} className="flex-shrink-0 lg:!w-auto" style={{ width: '140px', scrollSnapAlign: 'start' }}>
                  <ProductCard product={shoe} onSelect={selectShoe} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Empfohlen für dich (Fit Match) ──────────────────────── */}
        {recommended.length > 0 && (
          <div>
            <SectionLabel icon={Star} color="#FF9500" label="Empfohlen für dich" />
            <div className="flex gap-3 overflow-x-auto lg:grid lg:grid-cols-4 lg:overflow-visible pb-1" style={{ scrollSnapType: 'x mandatory' }}>
              {recommended.map(shoe => (
                <div key={shoe.id} className="flex-shrink-0 lg:!w-auto" style={{ width: '140px', scrollSnapAlign: 'start' }}>
                  <ProductCard product={shoe} onSelect={selectShoe} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Letzte Bestellungen ─────────────────────────────────── */}
        {recentOrders.length > 0 && (
          <div>
            <SectionLabel icon={Package} color="#34C759" label="Deine Bestellungen" />
            <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollSnapType: 'x mandatory' }}>
              {recentOrders.map(order => (
                <div key={order.id} className="flex-shrink-0" style={{ width: '140px', scrollSnapAlign: 'start' }}>
                  <OrderCard order={order} onClick={() => navigate('/orders')} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Loyalty Banner ──────────────────────────────────────── */}
        <LoyaltyBanner status={loyaltyStatus} tiers={loyaltyTiers} />

        {/* ── Zuletzt angesehen ───────────────────────────────────── */}
        {recentlyViewed.length > 0 && (
          <div>
            <SectionLabel icon={Heart} color="#FF3B30" label="Zuletzt angesehen" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
              {recentlyViewed.map(shoe => (
                <ProductCard key={shoe.id} product={shoe} onSelect={selectShoe} />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
