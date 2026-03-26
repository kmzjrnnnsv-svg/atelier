/**
 * ForYou.jsx — Louis Vuitton-style homepage
 * Full-bleed editorial banners, alternating sections, minimal typography
 * Modeled after de.louisvuitton.com/deu-de/homepage
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, Package, Footprints, BookOpen, ShoppingBag, Gift, ArrowRight } from 'lucide-react'
import useAtelierStore from '../store/atelierStore'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../hooks/useApi'
import { isNative, isMobileWeb } from '../App'
import CtaBanner from '../components/CtaBanner'

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
  const heroShoe = shoes.find(s => s.tag === 'BESTSELLER') || shoes[0]
  const secondShoe = shoes[1]
  const publishedArticles = (articles || []).filter(a => a.status === 'published').slice(0, 4)
  const activeAccessories = (accessories || []).filter(a => a.is_active !== 0)

  return (
    <div className="min-h-full bg-white">

      {/* ══════════════════════════════════════════════════════════
          HERO — Full-viewport editorial banner (LV style)
          ══════════════════════════════════════════════════════════ */}
      {heroShoe && (
        <div className="relative cursor-pointer" onClick={() => selectShoe(heroShoe)}>
          <div className="w-full overflow-hidden bg-[#f6f5f3]" style={{ aspectRatio: isMobileWeb ? '3 / 4' : '16 / 8' }}>
            {heroShoe.image ? (
              <img src={heroShoe.image} alt={heroShoe.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#1a1a1a]">
                <span className="text-white/[0.06] text-[80px] lg:text-[120px] font-extralight tracking-[0.4em]">ATELIER</span>
              </div>
            )}
          </div>
          {/* Text overlay — bottom-left, LV style */}
          <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-12" style={{ background: 'linear-gradient(transparent 0%, rgba(0,0,0,0.4) 100%)' }}>
            <p className="text-[11px] lg:text-[12px] text-white/60 uppercase tracking-[0.3em] mb-2 lg:mb-3">Atelier Kollektion</p>
            <h2 className="text-[28px] lg:text-[42px] font-extralight text-white leading-[1.05] tracking-tight">{heroShoe.name}</h2>
            <p className="text-[13px] lg:text-[15px] text-white/50 mt-2 lg:mt-3 font-light">{heroShoe.material}</p>
            <button
              className="mt-4 lg:mt-6 px-6 lg:px-8 py-2.5 lg:py-3 bg-white text-black text-[11px] lg:text-[12px] border-0 hover:bg-black hover:text-white transition-all duration-300"
              style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}
              onClick={e => { e.stopPropagation(); selectShoe(heroShoe) }}
            >
              Entdecken
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          EDITORIAL SPLIT — Two-column image layout (LV style)
          ══════════════════════════════════════════════════════════ */}
      {shoes.length >= 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {shoes.slice(1, 3).map(shoe => (
            <div key={shoe.id} className="relative cursor-pointer group" onClick={() => selectShoe(shoe)}>
              <div className="w-full overflow-hidden bg-[#f6f5f3]" style={{ aspectRatio: isMobileWeb ? '4 / 5' : '4 / 5' }}>
                {shoe.image ? (
                  <img src={shoe.image} alt={shoe.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg viewBox="0 0 260 130" className="w-1/2 opacity-40">
                      <path d="M20 100 Q17 108 38 112 L222 112 Q238 112 238 100 L232 80 Q226 62 210 60 L72 60 Q47 60 42 68 Z" fill={shoe.color || '#374151'} />
                      <path d="M42 68 Q37 48 62 36 L120 30 Q155 27 178 42 Q198 54 232 80 L210 60 Q180 50 148 52 L90 53 Q60 55 42 68 Z" fill={shoe.color || '#374151'} opacity="0.85" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-5 lg:p-8" style={{ background: 'linear-gradient(transparent 0%, rgba(0,0,0,0.35) 100%)' }}>
                <p className="text-[20px] lg:text-[26px] font-extralight text-white leading-tight tracking-tight">{shoe.name}</p>
                <p className="text-[12px] text-white/50 mt-1 font-light">{shoe.price}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          COLLECTION CTA — Full-width dark banner (LV style)
          ══════════════════════════════════════════════════════════ */}
      <div className="bg-[#1a1a1a] cursor-pointer" onClick={() => navigate('/collection')}>
        <div className="max-w-4xl mx-auto px-6 lg:px-16 py-12 lg:py-20 text-center">
          <p className="text-[11px] text-white/30 uppercase tracking-[0.3em] mb-4">Handgefertigt in über 200 Schritten</p>
          <h2 className="text-[28px] lg:text-[40px] font-extralight text-white leading-[1.1] tracking-tight">
            Die Kollektion entdecken
          </h2>
          <p className="text-[13px] lg:text-[15px] text-white/35 mt-4 font-light leading-relaxed max-w-md mx-auto">
            Maßschuhe, individuell angepasst an Ihren Fuß. Jedes Paar ein Unikat.
          </p>
          <button
            className="mt-6 lg:mt-8 px-8 py-3 bg-white text-black text-[11px] border-0 hover:bg-black hover:text-white hover:outline hover:outline-1 hover:outline-white transition-all duration-300"
            style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}
            onClick={e => { e.stopPropagation(); navigate('/collection') }}
          >
            Kollektion
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          FEATURED PRODUCTS — Horizontal product row (LV style)
          ══════════════════════════════════════════════════════════ */}
      {featuredShoes.length > 0 && (
        <div className="py-12 lg:py-20">
          <div className="text-center mb-8 lg:mb-12">
            <p className="text-[11px] text-black/30 uppercase tracking-[0.3em]">Empfohlen für Sie</p>
          </div>
          <div className="px-5 lg:px-16">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 lg:gap-x-5 gap-y-8">
              {featuredShoes.slice(0, 8).map(shoe => (
                <div key={shoe.id} className="group cursor-pointer" onClick={() => selectShoe(shoe)}>
                  <div className="w-full overflow-hidden bg-[#f6f5f3] mb-3 transition-all duration-500 group-hover:bg-[#efeee9]" style={{ aspectRatio: '3 / 4' }}>
                    {shoe.image ? (
                      <img src={shoe.image} alt={shoe.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag size={28} strokeWidth={0.5} className="text-black/[0.06]" />
                      </div>
                    )}
                  </div>
                  <p className="text-[12px] lg:text-[13px] text-black font-normal leading-snug">{shoe.name}</p>
                  <p className="text-[12px] lg:text-[13px] text-black/45 mt-1 font-light">{shoe.price || `€ ${shoe.base_price || ''}`}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="text-center mt-8 lg:mt-10">
            <button
              onClick={() => navigate('/collection')}
              className="px-8 py-3 bg-black text-white text-[11px] border border-black hover:bg-white hover:text-black transition-all duration-300"
              style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}
            >
              Alle Modelle
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          EDITORIAL BANNER — Scan / Craftsmanship (LV story style)
          ══════════════════════════════════════════════════════════ */}
      {!isMobileWeb && (
        <div className="relative cursor-pointer" onClick={() => navigate(isNative ? '/scan' : '/explore')}>
          <div className="w-full bg-[#f6f5f3]" style={{ aspectRatio: '16 / 6' }}>
            <div className="w-full h-full flex items-center justify-center">
              <Footprints size={60} strokeWidth={0.3} className="text-black/[0.05]" />
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center text-center px-6">
            <div>
              <p className="text-[11px] text-black/30 uppercase tracking-[0.3em] mb-3">
                {isNative ? '3D-Technologie' : 'Savoir-Faire'}
              </p>
              <h2 className="text-[26px] lg:text-[36px] font-extralight text-black leading-[1.1] tracking-tight">
                {isNative ? 'Der perfekte Scan' : 'Handwerkskunst erleben'}
              </h2>
              <button
                className="mt-5 px-7 py-2.5 bg-black text-white text-[11px] border border-black hover:bg-white hover:text-black transition-all duration-300"
                style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}
              >
                Entdecken
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile: simple scan/app banner */}
      {isMobileWeb && (
        <div className="border-t border-b border-black/[0.06]">
          <div className="px-5 py-5 flex items-center gap-4" onClick={() => navigate('/explore')}>
            <div className="w-11 h-11 bg-[#f6f5f3] flex items-center justify-center flex-shrink-0">
              <span className="text-[12px] font-extralight text-black/30" style={{ fontFamily: 'Georgia, serif' }}>A</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-black font-normal">ATELIER App</p>
              <p className="text-[11px] text-black/30 mt-0.5 font-light">3D-Fußscan, AR-Anprobe und mehr</p>
            </div>
            <ArrowRight size={16} strokeWidth={1} className="text-black/15 flex-shrink-0" />
          </div>
        </div>
      )}

      {isNative && (
        <div className="border-b border-black/[0.06]" onClick={() => navigate(latestScan ? '/my-scans' : '/scan')}>
          <div className="px-5 py-5 flex items-center gap-4">
            <div className="w-11 h-11 bg-[#f6f5f3] flex items-center justify-center flex-shrink-0">
              <Footprints size={18} strokeWidth={1} className="text-black/30" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-black font-normal">Ihr 3D-Fußscan</p>
              {latestScan ? (
                <p className="text-[11px] text-black/30 mt-0.5 font-light">EU {latestScan.eu_size || '-'} · {latestScan.accuracy ? `${latestScan.accuracy.toFixed(1)}%` : '-'}</p>
              ) : (
                <p className="text-[11px] text-black/30 mt-0.5 font-light">Jetzt scannen für perfekte Passform</p>
              )}
            </div>
            <ArrowRight size={16} strokeWidth={1} className="text-black/15 flex-shrink-0" />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          FAVORITES — Product row (if any)
          ══════════════════════════════════════════════════════════ */}
      {favShoes.length > 0 && (
        <div className="py-12 lg:py-16">
          <div className="flex items-center justify-between px-5 lg:px-16 mb-6 lg:mb-8">
            <p className="text-[11px] text-black/30 uppercase tracking-[0.3em]">Ihre Favoriten</p>
            <button onClick={() => navigate('/wishlist')} className="text-[11px] text-black/30 bg-transparent border-0 hover:text-black transition-colors font-light underline underline-offset-4 decoration-black/15">
              Alle anzeigen
            </button>
          </div>
          <div className="px-5 lg:px-16">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 lg:gap-x-5 gap-y-8">
              {favShoes.slice(0, 4).map(shoe => (
                <div key={shoe.id} className="group cursor-pointer" onClick={() => selectShoe(shoe)}>
                  <div className="w-full overflow-hidden bg-[#f6f5f3] mb-3 transition-all duration-500 group-hover:bg-[#efeee9]" style={{ aspectRatio: '3 / 4' }}>
                    {shoe.image ? (
                      <img src={shoe.image} alt={shoe.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Heart size={24} strokeWidth={0.5} className="text-black/[0.06]" />
                      </div>
                    )}
                  </div>
                  <p className="text-[12px] lg:text-[13px] text-black font-normal leading-snug">{shoe.name}</p>
                  <p className="text-[12px] lg:text-[13px] text-black/45 mt-1 font-light">{shoe.price}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          ORDERS — Recent (minimal list)
          ══════════════════════════════════════════════════════════ */}
      {recentOrders.length > 0 && (
        <div className="border-t border-black/[0.06] py-10 lg:py-14">
          <div className="flex items-center justify-between px-5 lg:px-16 mb-5">
            <p className="text-[11px] text-black/30 uppercase tracking-[0.3em]">Ihre Bestellungen</p>
            <button onClick={() => navigate('/orders')} className="text-[11px] text-black/30 bg-transparent border-0 hover:text-black transition-colors font-light underline underline-offset-4 decoration-black/15">
              Alle anzeigen
            </button>
          </div>
          <div className="px-5 lg:px-16">
            {recentOrders.map(order => (
              <button key={order.id} onClick={() => navigate('/orders')} className="w-full bg-transparent border-0 text-left py-4 border-b border-black/[0.05] flex items-center justify-between gap-3 hover:bg-black/[0.01] transition-colors">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-[#f6f5f3] flex items-center justify-center flex-shrink-0">
                    <Package size={15} strokeWidth={1} className="text-black/20" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] text-black font-normal truncate">{order.shoe_name}</p>
                    <p className="text-[11px] text-black/25 mt-0.5 font-light">{order.material} · {order.price}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          ACCESSORIES — Editorial + product row
          ══════════════════════════════════════════════════════════ */}
      {activeAccessories.length > 0 && (
        <div className="border-t border-black/[0.06] py-12 lg:py-16">
          <div className="flex items-center justify-between px-5 lg:px-16 mb-6 lg:mb-8">
            <p className="text-[11px] text-black/30 uppercase tracking-[0.3em]">Zubehör & Pflege</p>
            <button onClick={() => navigate('/accessories')} className="text-[11px] text-black/30 bg-transparent border-0 hover:text-black transition-colors font-light underline underline-offset-4 decoration-black/15">
              Alle anzeigen
            </button>
          </div>
          <div className="px-5 lg:px-16">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 lg:gap-x-5 gap-y-8">
              {activeAccessories.slice(0, 4).map(acc => (
                <div key={acc.id} className="group cursor-pointer" onClick={() => navigate('/accessories')}>
                  <div className="w-full overflow-hidden flex items-center justify-center bg-[#f6f5f3] mb-3 transition-all duration-500 group-hover:bg-[#efeee9]" style={{ aspectRatio: '3 / 4' }}>
                    {acc.image_data ? (
                      <img src={acc.image_data} alt={acc.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                    ) : (
                      <Gift size={28} strokeWidth={0.5} className="text-black/[0.06]" />
                    )}
                  </div>
                  <p className="text-[12px] lg:text-[13px] text-black font-normal leading-snug">{acc.name}</p>
                  <p className="text-[12px] lg:text-[13px] text-black/45 mt-1 font-light">€ {parseFloat(acc.price) || 0}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          JOURNAL — Articles editorial (LV "Stories" style)
          ══════════════════════════════════════════════════════════ */}
      {publishedArticles.length > 0 && (
        <div className="border-t border-black/[0.06] py-12 lg:py-16">
          <div className="text-center mb-8 lg:mb-10">
            <p className="text-[11px] text-black/30 uppercase tracking-[0.3em]">Atelier Journal</p>
          </div>
          <div className="px-5 lg:px-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
              {publishedArticles.slice(0, 2).map(article => (
                <div key={article.id} className="group cursor-pointer" onClick={() => navigate('/explore')}>
                  <div className="w-full overflow-hidden bg-[#f6f5f3] mb-3 transition-all duration-500 group-hover:bg-[#efeee9]" style={{ aspectRatio: '16 / 9' }}>
                    {article.image_data ? (
                      <img src={article.image_data} alt={article.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen size={32} strokeWidth={0.5} className="text-black/[0.06]" />
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-black/25 uppercase tracking-[0.2em] mb-1">{article.category}</p>
                  <p className="text-[15px] lg:text-[17px] text-black font-light leading-snug">{article.title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          SERVICE PROMISE — Three-column (LV "Maison" style)
          ══════════════════════════════════════════════════════════ */}
      <div className="border-t border-black/[0.06] py-12 lg:py-16">
        <div className="px-5 lg:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-16">
            {[
              { label: 'Handgefertigt', title: 'Jeder Schuh ein Unikat', text: 'Von Hand gefertigt aus erlesenen Materialien in über 200 Arbeitsschritten.' },
              { label: '3D-Fußscan', title: 'Perfekte Passform', text: 'Millimetergenau vermessen für maximalen Komfort und Langlebigkeit.' },
              { label: 'Versand', title: 'Kostenlos ab € 500', text: 'Sicher verpackt und versichert direkt zu Ihnen geliefert.' },
            ].map(item => (
              <div key={item.label} className="text-center">
                <p className="text-[10px] uppercase tracking-[0.3em] text-black/20 mb-3">{item.label}</p>
                <p className="text-[15px] text-black font-light">{item.title}</p>
                <p className="text-[12px] text-black/30 mt-2 font-light leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA Banner (CMS-controlled) ──────────────────────── */}
      <div className="px-5 lg:px-16 pb-16">
        <CtaBanner page="foryou" />
      </div>
    </div>
  )
}
