/**
 * ForYou.jsx — Louis Vuitton-style homepage
 * Alternating rhythm: EDGE-TO-EDGE image → PADDED white section → EDGE-TO-EDGE → PADDED → …
 * Like LV: image on top, then category label + title + product grid on white below.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, Package, Footprints, BookOpen, ShoppingBag, Gift, ArrowRight } from 'lucide-react'
import useAtelierStore from '../store/atelierStore'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../hooks/useApi'
import { isNative, isMobileWeb } from '../App'
import CtaBanner from '../components/CtaBanner'
import { SHOES, CRAFT, CARE, LIFESTYLE, HEROES } from '../lib/editorialImages'

// ═════════════════════════════════════════════════════════════════════════════
export default function ForYou() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { shoes, favorites, orders, latestScan, articles, accessories } = useAtelierStore()
  const [recentOrders, setRecentOrders] = useState([])
  const [featuredShoes, setFeaturedShoes] = useState([])
  const [cms, setCms] = useState(null) // CMS homepage sections

  useEffect(() => {
    apiFetch('/api/orders').then(o => setRecentOrders((o || []).slice(0, 4))).catch(() => {})
    apiFetch('/api/settings/featured-shoes').then(data => setFeaturedShoes(data || [])).catch(() => {})
    apiFetch('/api/settings/homepage').then(data => { if (data) setCms(Object.fromEntries(data.map(s => [s.key, s]))) }).catch(() => {})
  }, [])

  // Helper: get CMS value for a section field, with fallback
  const c = (section, field, fallback) => cms?.[section]?.[field] || fallback

  const favShoes = shoes.filter(s => favorites.includes(String(s.id)))
  const selectShoe = (product) => navigate('/customize', { state: { product } })
  const heroShoe = shoes.find(s => s.tag === 'BESTSELLER') || shoes[0]
  const publishedArticles = (articles || []).filter(a => a.status === 'published').slice(0, 4)
  const activeAccessories = (accessories || []).filter(a => a.is_active !== 0)

  return (
    <div className="min-h-full bg-white">

      {/* ══════════════════════════════════════════════════════════
          1. HERO — Full-bleed editorial banner (edge-to-edge)
          ══════════════════════════════════════════════════════════ */}
      {heroShoe && (
        <div className="relative cursor-pointer" onClick={() => selectShoe(heroShoe)}>
          <div className="w-full overflow-hidden bg-[#f6f5f3]" style={{ aspectRatio: isMobileWeb ? '3 / 4' : '16 / 8' }}>
            <img src={heroShoe.image || HEROES.foryou} alt={heroShoe.name} className="w-full h-full object-cover" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-5 lg:p-16" style={{ background: 'linear-gradient(transparent 0%, rgba(0,0,0,0.45) 100%)' }}>
            <p className="text-[9px] lg:text-[11px] text-white/50 uppercase tracking-[0.3em] mb-1.5 lg:mb-3">{c('hero', 'label', 'Atelier Kollektion')}</p>
            <h2 className="text-[24px] lg:text-[46px] font-extralight text-white leading-[1.05] tracking-tight">{heroShoe.name}</h2>
            <p className="text-[12px] lg:text-[15px] text-white/40 mt-1.5 lg:mt-3 font-light">{heroShoe.material}</p>
            <button
              className="mt-3 lg:mt-6 px-5 lg:px-8 py-2 lg:py-3 bg-white text-black text-[10px] lg:text-[12px] border-0 hover:bg-black hover:text-white transition-all duration-300"
              style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}
              onClick={e => { e.stopPropagation(); selectShoe(heroShoe) }}
            >
              Entdecken
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          2. FEATURED PRODUCTS — Padded, white breathing room
          ══════════════════════════════════════════════════════════ */}
      {featuredShoes.length > 0 && (
        <div className="py-12 lg:py-28">
          <div className="text-center mb-7 lg:mb-14">
            <p className="text-[9px] lg:text-[10px] text-black/25 uppercase tracking-[0.3em] mb-2 lg:mb-3">{c('featured', 'label', 'Herren')}</p>
            <h2 className="text-[20px] lg:text-[30px] font-extralight text-black tracking-tight">{c('featured', 'title', 'Empfohlen für Sie')}</h2>
          </div>
          <div className="px-4 lg:px-24 xl:px-32">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 lg:gap-x-6 gap-y-6 lg:gap-y-14">
              {featuredShoes.slice(0, 4).map(shoe => (
                <div key={shoe.id} className="group cursor-pointer" onClick={() => selectShoe(shoe)}>
                  <div className="w-full overflow-hidden bg-[#f6f5f3] mb-3 lg:mb-4 transition-all duration-500 group-hover:bg-[#efeee9]" style={{ aspectRatio: '3 / 4' }}>
                    <img src={shoe.image || SHOES[['dressShoes', 'oxfords', 'loafers', 'boots'][shoe.id % 4]]} alt={shoe.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                  </div>
                  <p className="text-[11px] lg:text-[13px] text-black font-normal leading-snug">{shoe.name}</p>
                  <p className="text-[11px] lg:text-[13px] text-black/40 mt-0.5 lg:mt-1 font-light">{shoe.price || `€ ${shoe.base_price || ''}`}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="text-center mt-8 lg:mt-14">
            <button
              onClick={() => navigate('/collection')}
              className="px-8 lg:px-10 py-3 lg:py-3.5 bg-white text-black text-[10px] lg:text-[11px] border border-black hover:bg-black hover:text-white transition-all duration-300"
              style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}
            >
              {c('featured', 'button', 'Entdecken Sie die Kollektion')}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          3. EDITORIAL SPLIT — Two-column, edge-to-edge
          ══════════════════════════════════════════════════════════ */}
      {shoes.length >= 3 && (
        <div className="grid grid-cols-2 gap-[2px]">
          {shoes.slice(1, 3).map(shoe => (
            <div key={shoe.id} className="relative cursor-pointer group" onClick={() => selectShoe(shoe)}>
              <div className="w-full overflow-hidden bg-[#f6f5f3]" style={{ aspectRatio: isMobileWeb ? '3 / 4' : '4 / 5' }}>
                <img src={shoe.image || (shoe.id % 2 === 0 ? SHOES.editorial1 : SHOES.editorial2)} alt={shoe.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-3 lg:p-6" style={{ background: 'linear-gradient(transparent 0%, rgba(0,0,0,0.35) 100%)' }}>
                <p className="text-[13px] lg:text-[20px] font-extralight text-white leading-tight tracking-tight">{shoe.name}</p>
                <p className="text-[9px] lg:text-[11px] text-white/45 mt-0.5 lg:mt-1 font-light">{shoe.price}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          4. SAVOIR-FAIRE — Padded section (image + text below, contained)
          ══════════════════════════════════════════════════════════ */}
      <div className="py-12 lg:py-28 cursor-pointer" onClick={() => navigate(isNative ? '/scan' : '/explore')}>
        <div className="px-4 lg:px-16 xl:px-24">
          <div className="w-full overflow-hidden" style={{ aspectRatio: isMobileWeb ? '4 / 3' : '21 / 9' }}>
            <img src={c('savoir_faire', 'image', '') || CRAFT.hands} alt="" className="w-full h-full object-cover" />
          </div>
        </div>
        <div className="text-center px-5 lg:px-16 pt-8 lg:pt-14 pb-2 lg:pb-4">
          <p className="text-[9px] lg:text-[10px] text-black/25 uppercase tracking-[0.3em] mb-2 lg:mb-3">
            {isNative ? '3D-Technologie' : c('savoir_faire', 'label', 'Savoir-Faire')}
          </p>
          <h2 className="text-[20px] lg:text-[30px] font-extralight text-black leading-[1.1] tracking-tight">
            {isNative ? 'Der perfekte Scan' : c('savoir_faire', 'title', 'Handwerkskunst erleben')}
          </h2>
          <button
            className="mt-4 lg:mt-6 px-8 lg:px-10 py-3 lg:py-3.5 bg-white text-black text-[10px] lg:text-[11px] border border-black hover:bg-black hover:text-white transition-all duration-300"
            style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}
          >
            Entdecken
          </button>
        </div>
      </div>

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
          5. COLLECTION CTA — Full-bleed dark banner (edge-to-edge)
          ══════════════════════════════════════════════════════════ */}
      <div className="relative cursor-pointer" onClick={() => navigate('/collection')}>
        <div className="absolute inset-0 overflow-hidden">
          <img src={c('collection_cta', 'image', '') || CRAFT.workshop} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/65" />
        </div>
        <div className="relative max-w-4xl mx-auto px-5 lg:px-16 py-12 lg:py-28 text-center">
          <p className="text-[9px] lg:text-[10px] text-white/25 uppercase tracking-[0.3em] mb-3 lg:mb-5">{c('collection_cta', 'label', 'Handgefertigt in über 200 Schritten')}</p>
          <h2 className="text-[20px] lg:text-[36px] font-extralight text-white leading-[1.1] tracking-tight">
            {c('collection_cta', 'title', 'Die Kollektion entdecken')}
          </h2>
          <button
            className="mt-5 lg:mt-10 px-8 lg:px-10 py-3 lg:py-3.5 bg-white text-black text-[10px] lg:text-[11px] border-0 hover:bg-black hover:text-white hover:outline hover:outline-1 hover:outline-white transition-all duration-300"
            style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}
            onClick={e => { e.stopPropagation(); navigate('/collection') }}
          >
            {c('collection_cta', 'button', 'Kollektion')}
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          6. FAVORITES — Padded with generous whitespace
          ══════════════════════════════════════════════════════════ */}
      {favShoes.length > 0 && (
        <div className="py-12 lg:py-28">
          <div className="text-center mb-7 lg:mb-14">
            <p className="text-[9px] lg:text-[10px] text-black/25 uppercase tracking-[0.3em] mb-2 lg:mb-3">{c('favorites', 'label', 'Herren')}</p>
            <h2 className="text-[20px] lg:text-[30px] font-extralight text-black tracking-tight">{c('favorites', 'title', 'Ihre Favoriten')}</h2>
          </div>
          <div className="px-4 lg:px-24 xl:px-32">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 lg:gap-x-6 gap-y-6 lg:gap-y-14">
              {favShoes.slice(0, 4).map(shoe => (
                <div key={shoe.id} className="group cursor-pointer" onClick={() => selectShoe(shoe)}>
                  <div className="w-full overflow-hidden bg-[#f6f5f3] mb-3 lg:mb-4 transition-all duration-500 group-hover:bg-[#efeee9]" style={{ aspectRatio: '3 / 4' }}>
                    <img src={shoe.image || SHOES[['dressShoes', 'oxfords', 'loafers', 'boots'][shoe.id % 4]]} alt={shoe.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                  </div>
                  <p className="text-[11px] lg:text-[13px] text-black font-normal leading-snug">{shoe.name}</p>
                  <p className="text-[11px] lg:text-[13px] text-black/40 mt-0.5 lg:mt-1 font-light">{shoe.price}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="text-center mt-8 lg:mt-14">
            <button
              onClick={() => navigate('/wishlist')}
              className="px-8 lg:px-10 py-3 lg:py-3.5 bg-white text-black text-[10px] lg:text-[11px] border border-black hover:bg-black hover:text-white transition-all duration-300"
              style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}
            >
              {c('favorites', 'button', 'Alle Favoriten anzeigen')}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          7. ACCESSORIES — Image then text below + padded grid
          ══════════════════════════════════════════════════════════ */}
      {activeAccessories.length > 0 && (
        <div className="cursor-pointer" onClick={() => navigate('/accessories')}>
          <div className="w-full overflow-hidden" style={{ aspectRatio: isMobileWeb ? '4 / 3' : '16 / 5' }}>
            <img src={c('accessories', 'image', '') || CARE.polish} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="text-center px-5 lg:px-16 pt-7 lg:pt-14 pb-3 lg:pb-6">
            <p className="text-[9px] lg:text-[10px] text-black/25 uppercase tracking-[0.3em] mb-2 lg:mb-3">{c('accessories', 'label', 'Zubehör & Pflege')}</p>
            <h2 className="text-[20px] lg:text-[30px] font-extralight text-black leading-[1.1] tracking-tight">
              {c('accessories', 'title', 'Das Beste für Ihre Schuhe')}
            </h2>
          </div>

          <div className="py-8 lg:py-14">
            <div className="px-4 lg:px-24 xl:px-32">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 lg:gap-x-6 gap-y-6 lg:gap-y-14">
                {activeAccessories.slice(0, 4).map(acc => (
                  <div key={acc.id} className="group" onClick={e => e.stopPropagation()}>
                    <div className="w-full overflow-hidden flex items-center justify-center bg-[#f6f5f3] mb-3 lg:mb-4 transition-all duration-500 group-hover:bg-[#efeee9]" style={{ aspectRatio: '3 / 4' }}>
                      <img src={acc.image_data || CARE[['polish', 'brushes', 'cream'][acc.id % 3]]} alt={acc.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                    </div>
                    <p className="text-[11px] lg:text-[13px] text-black font-normal leading-snug">{acc.name}</p>
                    <p className="text-[11px] lg:text-[13px] text-black/40 mt-0.5 lg:mt-1 font-light">€ {parseFloat(acc.price) || 0}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-center mt-8 lg:mt-14">
              <button
                onClick={e => { e.stopPropagation(); navigate('/accessories') }}
                className="px-8 lg:px-10 py-3 lg:py-3.5 bg-white text-black text-[10px] lg:text-[11px] border border-black hover:bg-black hover:text-white transition-all duration-300"
                style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}
              >
                {c('accessories', 'button', 'Alle Produkte')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          8. ORDERS — Padded minimal list
          ══════════════════════════════════════════════════════════ */}
      {recentOrders.length > 0 && (
        <div className="py-12 lg:py-24">
          <div className="flex items-center justify-between px-4 lg:px-24 xl:px-32 mb-5 lg:mb-8">
            <p className="text-[9px] lg:text-[10px] text-black/25 uppercase tracking-[0.3em]">Ihre Bestellungen</p>
            <button onClick={() => navigate('/orders')} className="text-[10px] lg:text-[11px] text-black/30 bg-transparent border-0 hover:text-black transition-colors font-light underline underline-offset-4 decoration-black/15">
              Alle anzeigen
            </button>
          </div>
          <div className="px-4 lg:px-24 xl:px-32">
            {recentOrders.map(order => (
              <button key={order.id} onClick={() => navigate('/orders')} className="w-full bg-transparent border-0 text-left py-3.5 lg:py-4 border-b border-black/[0.04] flex items-center justify-between gap-3 hover:bg-black/[0.01] transition-colors">
                <div className="flex items-center gap-3 lg:gap-4 flex-1 min-w-0">
                  <div className="w-9 h-9 lg:w-10 lg:h-10 bg-[#f6f5f3] flex items-center justify-center flex-shrink-0">
                    <Package size={14} strokeWidth={1} className="text-black/20" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] lg:text-[13px] text-black font-normal truncate">{order.shoe_name}</p>
                    <p className="text-[10px] lg:text-[11px] text-black/25 mt-0.5 font-light">{order.material} · {order.price}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          9. JOURNAL — Image then text below + padded article grid
          ══════════════════════════════════════════════════════════ */}
      {publishedArticles.length > 0 && (
        <div className="cursor-pointer" onClick={() => navigate('/explore')}>
          <div className="w-full overflow-hidden bg-[#f6f5f3]" style={{ aspectRatio: isMobileWeb ? '4 / 3' : '16 / 5' }}>
            <img src={publishedArticles[0].image_data || CRAFT.leather} alt={publishedArticles[0].title} className="w-full h-full object-cover" />
          </div>
          <div className="text-center px-5 lg:px-16 pt-7 lg:pt-14 pb-3 lg:pb-6">
            <p className="text-[9px] lg:text-[10px] text-black/25 uppercase tracking-[0.3em] mb-2 lg:mb-3">{c('journal', 'label', 'Atelier Journal')}</p>
            <h2 className="text-[20px] lg:text-[30px] font-extralight text-black leading-[1.1] tracking-tight">{publishedArticles[0].title}</h2>
          </div>

          {publishedArticles.length > 1 && (
            <div className="py-6 lg:py-14">
              <div className="px-4 lg:px-24 xl:px-32">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-8">
                  {publishedArticles.slice(1, 4).map(article => (
                    <div key={article.id} className="group" onClick={e => e.stopPropagation()}>
                      <div className="w-full overflow-hidden bg-[#f6f5f3] mb-3 lg:mb-4 transition-all duration-500 group-hover:bg-[#efeee9]" style={{ aspectRatio: '4 / 3' }}>
                        <img src={article.image_data || CRAFT[['workshop', 'stitching', 'tools'][article.id % 3]]} alt={article.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]" />
                      </div>
                      <p className="text-[9px] lg:text-[10px] text-black/25 uppercase tracking-[0.2em] mb-0.5 lg:mb-1">{article.category}</p>
                      <p className="text-[12px] lg:text-[16px] text-black font-light leading-snug">{article.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          10. SERVICE PROMISE — Padded three-column
          ══════════════════════════════════════════════════════════ */}
      <div className="py-12 lg:py-28">
        <div className="px-4 lg:px-24 xl:px-32">
          <div className="grid grid-cols-3 gap-4 lg:gap-20">
            {[
              { label: 'Handgefertigt', title: 'Jeder Schuh ein Unikat', text: 'Von Hand gefertigt aus erlesenen Materialien in über 200 Arbeitsschritten.' },
              { label: '3D-Fußscan', title: 'Perfekte Passform', text: 'Millimetergenau vermessen für maximalen Komfort und Langlebigkeit.' },
              { label: 'Versand', title: 'Kostenlos ab € 500', text: 'Sicher verpackt und versichert direkt zu Ihnen geliefert.' },
            ].map(item => (
              <div key={item.label} className="text-center">
                <p className="text-[8px] lg:text-[9px] uppercase tracking-[0.3em] text-black/20 mb-2 lg:mb-3">{item.label}</p>
                <p className="text-[12px] lg:text-[15px] text-black font-light leading-snug">{item.title}</p>
                <p className="text-[10px] lg:text-[12px] text-black/25 mt-1.5 lg:mt-2 font-light leading-relaxed hidden lg:block">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA Banner (CMS-controlled) ──────────────────────── */}
      <div className="px-4 lg:px-24 xl:px-32 pb-14 lg:pb-20">
        <CtaBanner page="foryou" />
      </div>
    </div>
  )
}
