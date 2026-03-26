/**
 * ForYou.jsx — Louis Vuitton-style homepage
 * Edge-to-edge editorial banners alternating with padded, breathing product sections.
 * Rhythm: FULL-BLEED → generous whitespace → PADDED content → FULL-BLEED → …
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
  const publishedArticles = (articles || []).filter(a => a.status === 'published').slice(0, 4)
  const activeAccessories = (accessories || []).filter(a => a.is_active !== 0)

  return (
    <div className="min-h-full bg-white">

      {/* ══════════════════════════════════════════════════════════
          HERO — Full-bleed editorial banner, edge-to-edge
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
          <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-16" style={{ background: 'linear-gradient(transparent 0%, rgba(0,0,0,0.45) 100%)' }}>
            <p className="text-[10px] lg:text-[11px] text-white/50 uppercase tracking-[0.3em] mb-2 lg:mb-3">Atelier Kollektion</p>
            <h2 className="text-[28px] lg:text-[46px] font-extralight text-white leading-[1.05] tracking-tight">{heroShoe.name}</h2>
            <p className="text-[13px] lg:text-[15px] text-white/40 mt-2 lg:mt-3 font-light">{heroShoe.material}</p>
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
          EDITORIAL SPLIT — Two-column, edge-to-edge, no gap
          ══════════════════════════════════════════════════════════ */}
      {shoes.length >= 3 && (
        <div className="grid grid-cols-2">
          {shoes.slice(1, 3).map(shoe => (
            <div key={shoe.id} className="relative cursor-pointer group" onClick={() => selectShoe(shoe)}>
              <div className="w-full overflow-hidden bg-[#f6f5f3]" style={{ aspectRatio: '3 / 4' }}>
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
              <div className="absolute bottom-0 left-0 right-0 p-4 lg:p-8" style={{ background: 'linear-gradient(transparent 0%, rgba(0,0,0,0.35) 100%)' }}>
                <p className="text-[18px] lg:text-[26px] font-extralight text-white leading-tight tracking-tight">{shoe.name}</p>
                <p className="text-[11px] lg:text-[13px] text-white/45 mt-1 font-light">{shoe.price}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          COLLECTION CTA — Full-bleed dark banner
          ══════════════════════════════════════════════════════════ */}
      <div className="bg-[#1a1a1a] cursor-pointer" onClick={() => navigate('/collection')}>
        <div className="max-w-4xl mx-auto px-8 lg:px-16 py-16 lg:py-28 text-center">
          <p className="text-[10px] text-white/25 uppercase tracking-[0.3em] mb-4 lg:mb-5">Handgefertigt in über 200 Schritten</p>
          <h2 className="text-[28px] lg:text-[44px] font-extralight text-white leading-[1.1] tracking-tight">
            Die Kollektion entdecken
          </h2>
          <p className="text-[13px] lg:text-[15px] text-white/30 mt-4 lg:mt-5 font-light leading-relaxed max-w-md mx-auto">
            Maßschuhe, individuell angepasst an Ihren Fuß. Jedes Paar ein Unikat.
          </p>
          <button
            className="mt-7 lg:mt-10 px-8 py-3 bg-white text-black text-[11px] border-0 hover:bg-black hover:text-white hover:outline hover:outline-1 hover:outline-white transition-all duration-300"
            style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}
            onClick={e => { e.stopPropagation(); navigate('/collection') }}
          >
            Kollektion
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          FEATURED PRODUCTS — Padded with generous whitespace
          ══════════════════════════════════════════════════════════ */}
      {featuredShoes.length > 0 && (
        <div className="py-16 lg:py-28">
          <div className="text-center mb-10 lg:mb-14">
            <p className="text-[10px] text-black/25 uppercase tracking-[0.3em]">Empfohlen für Sie</p>
          </div>
          <div className="px-8 lg:px-24 xl:px-32">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 lg:gap-x-6 gap-y-10 lg:gap-y-14">
              {featuredShoes.slice(0, 8).map(shoe => (
                <div key={shoe.id} className="group cursor-pointer" onClick={() => selectShoe(shoe)}>
                  <div className="w-full overflow-hidden bg-[#f6f5f3] mb-4 transition-all duration-500 group-hover:bg-[#efeee9]" style={{ aspectRatio: '3 / 4' }}>
                    {shoe.image ? (
                      <img src={shoe.image} alt={shoe.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag size={28} strokeWidth={0.5} className="text-black/[0.06]" />
                      </div>
                    )}
                  </div>
                  <p className="text-[12px] lg:text-[13px] text-black font-normal leading-snug">{shoe.name}</p>
                  <p className="text-[12px] lg:text-[13px] text-black/40 mt-1 font-light">{shoe.price || `€ ${shoe.base_price || ''}`}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="text-center mt-10 lg:mt-14">
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
          EDITORIAL BANNER — Full-bleed, edge-to-edge
          ══════════════════════════════════════════════════════════ */}
      {!isMobileWeb && (
        <div className="relative cursor-pointer" onClick={() => navigate(isNative ? '/scan' : '/explore')}>
          <div className="w-full bg-[#f6f5f3]" style={{ aspectRatio: '16 / 6' }}>
            <div className="w-full h-full flex items-center justify-center">
              <Footprints size={60} strokeWidth={0.3} className="text-black/[0.04]" />
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center text-center px-6">
            <div>
              <p className="text-[10px] text-black/25 uppercase tracking-[0.3em] mb-3">
                {isNative ? '3D-Technologie' : 'Savoir-Faire'}
              </p>
              <h2 className="text-[26px] lg:text-[40px] font-extralight text-black leading-[1.1] tracking-tight">
                {isNative ? 'Der perfekte Scan' : 'Handwerkskunst erleben'}
              </h2>
              <button
                className="mt-6 px-8 py-3 bg-black text-white text-[11px] border border-black hover:bg-white hover:text-black transition-all duration-300"
                style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}
              >
                Entdecken
              </button>
            </div>
          </div>
        </div>
      )}

      {isMobileWeb && (
        <div className="border-t border-b border-black/[0.06]">
          <div className="px-6 py-5 flex items-center gap-4" onClick={() => navigate('/explore')}>
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
          <div className="px-6 py-5 flex items-center gap-4">
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
          FAVORITES — Padded with generous whitespace
          ══════════════════════════════════════════════════════════ */}
      {favShoes.length > 0 && (
        <div className="py-16 lg:py-24">
          <div className="flex items-center justify-between px-8 lg:px-24 xl:px-32 mb-8 lg:mb-12">
            <p className="text-[10px] text-black/25 uppercase tracking-[0.3em]">Ihre Favoriten</p>
            <button onClick={() => navigate('/wishlist')} className="text-[11px] text-black/30 bg-transparent border-0 hover:text-black transition-colors font-light underline underline-offset-4 decoration-black/15">
              Alle anzeigen
            </button>
          </div>
          <div className="px-8 lg:px-24 xl:px-32">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 lg:gap-x-6 gap-y-10 lg:gap-y-14">
              {favShoes.slice(0, 4).map(shoe => (
                <div key={shoe.id} className="group cursor-pointer" onClick={() => selectShoe(shoe)}>
                  <div className="w-full overflow-hidden bg-[#f6f5f3] mb-4 transition-all duration-500 group-hover:bg-[#efeee9]" style={{ aspectRatio: '3 / 4' }}>
                    {shoe.image ? (
                      <img src={shoe.image} alt={shoe.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Heart size={24} strokeWidth={0.5} className="text-black/[0.06]" />
                      </div>
                    )}
                  </div>
                  <p className="text-[12px] lg:text-[13px] text-black font-normal leading-snug">{shoe.name}</p>
                  <p className="text-[12px] lg:text-[13px] text-black/40 mt-1 font-light">{shoe.price}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          ORDERS — Padded minimal list
          ══════════════════════════════════════════════════════════ */}
      {recentOrders.length > 0 && (
        <div className="border-t border-black/[0.06] py-14 lg:py-20">
          <div className="flex items-center justify-between px-8 lg:px-24 xl:px-32 mb-6 lg:mb-8">
            <p className="text-[10px] text-black/25 uppercase tracking-[0.3em]">Ihre Bestellungen</p>
            <button onClick={() => navigate('/orders')} className="text-[11px] text-black/30 bg-transparent border-0 hover:text-black transition-colors font-light underline underline-offset-4 decoration-black/15">
              Alle anzeigen
            </button>
          </div>
          <div className="px-8 lg:px-24 xl:px-32">
            {recentOrders.map(order => (
              <button key={order.id} onClick={() => navigate('/orders')} className="w-full bg-transparent border-0 text-left py-4 border-b border-black/[0.04] flex items-center justify-between gap-3 hover:bg-black/[0.01] transition-colors">
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
          ACCESSORIES — Full-bleed editorial banner + padded grid
          ══════════════════════════════════════════════════════════ */}
      {activeAccessories.length > 0 && (
        <>
          {/* Full-bleed editorial banner for accessories */}
          <div className="relative cursor-pointer" onClick={() => navigate('/accessories')}>
            <div className="w-full bg-[#f6f5f3]" style={{ aspectRatio: isMobileWeb ? '4 / 3' : '16 / 5' }}>
              <div className="w-full h-full flex items-center justify-center">
                <Gift size={48} strokeWidth={0.3} className="text-black/[0.04]" />
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center text-center px-6">
              <div>
                <p className="text-[10px] text-black/25 uppercase tracking-[0.3em] mb-3">Zubehör & Pflege</p>
                <h2 className="text-[26px] lg:text-[40px] font-extralight text-black leading-[1.1] tracking-tight">
                  Das Beste für Ihre Schuhe
                </h2>
              </div>
            </div>
          </div>

          {/* Padded product grid */}
          <div className="py-14 lg:py-20">
            <div className="px-8 lg:px-24 xl:px-32">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 lg:gap-x-6 gap-y-10 lg:gap-y-14">
                {activeAccessories.slice(0, 4).map(acc => (
                  <div key={acc.id} className="group cursor-pointer" onClick={() => navigate('/accessories')}>
                    <div className="w-full overflow-hidden flex items-center justify-center bg-[#f6f5f3] mb-4 transition-all duration-500 group-hover:bg-[#efeee9]" style={{ aspectRatio: '3 / 4' }}>
                      {acc.image_data ? (
                        <img src={acc.image_data} alt={acc.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                      ) : (
                        <Gift size={28} strokeWidth={0.5} className="text-black/[0.06]" />
                      )}
                    </div>
                    <p className="text-[12px] lg:text-[13px] text-black font-normal leading-snug">{acc.name}</p>
                    <p className="text-[12px] lg:text-[13px] text-black/40 mt-1 font-light">€ {parseFloat(acc.price) || 0}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-center mt-10 lg:mt-14">
              <button
                onClick={() => navigate('/accessories')}
                className="px-8 py-3 bg-black text-white text-[11px] border border-black hover:bg-white hover:text-black transition-all duration-300"
                style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}
              >
                Alle Produkte
              </button>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════
          JOURNAL — Full-bleed featured article + padded grid
          ══════════════════════════════════════════════════════════ */}
      {publishedArticles.length > 0 && (
        <>
          {/* Full-bleed first article */}
          <div className="relative cursor-pointer" onClick={() => navigate('/explore')}>
            <div className="w-full overflow-hidden bg-[#f6f5f3]" style={{ aspectRatio: isMobileWeb ? '4 / 3' : '16 / 6' }}>
              {publishedArticles[0].image_data ? (
                <img src={publishedArticles[0].image_data} alt={publishedArticles[0].title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen size={48} strokeWidth={0.3} className="text-black/[0.04]" />
                </div>
              )}
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-16" style={{ background: 'linear-gradient(transparent 0%, rgba(0,0,0,0.4) 100%)' }}>
              <p className="text-[10px] text-white/40 uppercase tracking-[0.3em] mb-2">Atelier Journal</p>
              <h2 className="text-[24px] lg:text-[36px] font-extralight text-white leading-[1.1] tracking-tight">{publishedArticles[0].title}</h2>
            </div>
          </div>

          {/* Padded article cards */}
          {publishedArticles.length > 1 && (
            <div className="py-14 lg:py-20">
              <div className="px-8 lg:px-24 xl:px-32">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                  {publishedArticles.slice(1, 4).map(article => (
                    <div key={article.id} className="group cursor-pointer" onClick={() => navigate('/explore')}>
                      <div className="w-full overflow-hidden bg-[#f6f5f3] mb-4 transition-all duration-500 group-hover:bg-[#efeee9]" style={{ aspectRatio: '4 / 3' }}>
                        {article.image_data ? (
                          <img src={article.image_data} alt={article.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen size={32} strokeWidth={0.5} className="text-black/[0.06]" />
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-black/25 uppercase tracking-[0.2em] mb-1">{article.category}</p>
                      <p className="text-[14px] lg:text-[16px] text-black font-light leading-snug">{article.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════
          SERVICE PROMISE — Padded three-column
          ══════════════════════════════════════════════════════════ */}
      <div className="border-t border-black/[0.06] py-16 lg:py-24">
        <div className="px-8 lg:px-24 xl:px-32">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-20">
            {[
              { label: 'Handgefertigt', title: 'Jeder Schuh ein Unikat', text: 'Von Hand gefertigt aus erlesenen Materialien in über 200 Arbeitsschritten.' },
              { label: '3D-Fußscan', title: 'Perfekte Passform', text: 'Millimetergenau vermessen für maximalen Komfort und Langlebigkeit.' },
              { label: 'Versand', title: 'Kostenlos ab € 500', text: 'Sicher verpackt und versichert direkt zu Ihnen geliefert.' },
            ].map(item => (
              <div key={item.label} className="text-center">
                <p className="text-[9px] uppercase tracking-[0.3em] text-black/20 mb-3">{item.label}</p>
                <p className="text-[15px] text-black font-light">{item.title}</p>
                <p className="text-[12px] text-black/25 mt-2 font-light leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA Banner (CMS-controlled) ──────────────────────── */}
      <div className="px-8 lg:px-24 xl:px-32 pb-20">
        <CtaBanner page="foryou" />
      </div>
    </div>
  )
}
