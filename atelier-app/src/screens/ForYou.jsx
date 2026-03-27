/**
 * ForYou.jsx — Louis Vuitton-style homepage
 * Sharp angular design, product-focused grid layout
 * Clean white background, minimal editorial, strong product presentation
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
          <div className="w-full overflow-hidden bg-[#f6f5f3]" style={{ aspectRatio: isMobileWeb ? '3 / 4' : '21 / 9' }}>
            <img src={heroShoe.image || HEROES.foryou} alt={heroShoe.name} className="w-full h-full object-cover" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-5 lg:p-14" style={{ background: 'linear-gradient(transparent 0%, rgba(0,0,0,0.5) 100%)' }}>
            <p className="text-[9px] lg:text-[10px] text-white/40 uppercase tracking-[0.3em] mb-1.5 lg:mb-2">{c('hero', 'label', 'Atelier Kollektion')}</p>
            <h2 className="text-[22px] lg:text-[38px] font-extralight text-white leading-[1.05] tracking-tight">{heroShoe.name}</h2>
            <p className="text-[11px] lg:text-[13px] text-white/35 mt-1 lg:mt-2 font-light">{heroShoe.material}</p>
            <button
              className="mt-3 lg:mt-5 px-5 lg:px-7 py-2 lg:py-2.5 bg-white text-black text-[10px] lg:text-[11px] border-0 hover:bg-black hover:text-white transition-all duration-300"
              style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}
              onClick={e => { e.stopPropagation(); selectShoe(heroShoe) }}
            >
              Entdecken
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          2. FEATURED PRODUCTS — Sharp angular product grid
          ══════════════════════════════════════════════════════════ */}
      {featuredShoes.length > 0 && (
        <div className="py-10 lg:py-20">
          <div className="px-4 lg:px-16 xl:px-24 mb-6 lg:mb-10">
            <p className="text-[9px] lg:text-[10px] text-black/20 uppercase tracking-[0.3em] mb-1.5">{c('featured', 'label', 'Herren')}</p>
            <h2 className="text-[18px] lg:text-[26px] font-extralight text-black tracking-tight">{c('featured', 'title', 'Empfohlen für Sie')}</h2>
          </div>
          <div className="px-4 lg:px-16 xl:px-24">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-[1px] bg-black/[0.04]">
              {featuredShoes.slice(0, 4).map(shoe => (
                <div key={shoe.id} className="group cursor-pointer bg-white" onClick={() => selectShoe(shoe)}>
                  <div className="w-full overflow-hidden bg-[#f7f6f4]" style={{ aspectRatio: '1 / 1' }}>
                    <img src={shoe.image || SHOES[['dressShoes', 'oxfords', 'loafers', 'boots'][shoe.id % 4]]} alt={shoe.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                  </div>
                  <div className="p-3 lg:p-4">
                    <p className="text-[11px] lg:text-[13px] text-black font-normal leading-snug">{shoe.name}</p>
                    <p className="text-[11px] lg:text-[12px] text-black/35 mt-1 font-light">{shoe.price || `€ ${shoe.base_price || ''}`}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="px-4 lg:px-16 xl:px-24 mt-6 lg:mt-10">
            <button
              onClick={() => navigate('/collection')}
              className="px-6 lg:px-8 py-2.5 lg:py-3 bg-white text-black text-[10px] lg:text-[11px] border border-black hover:bg-black hover:text-white transition-all duration-300"
              style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}
            >
              {c('featured', 'button', 'Kollektion entdecken')}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          3. EDITORIAL SPLIT — Two-column angular grid
          ══════════════════════════════════════════════════════════ */}
      {shoes.length >= 3 && (
        <div className="grid grid-cols-2 gap-[1px] bg-black/[0.04]">
          {shoes.slice(1, 3).map(shoe => (
            <div key={shoe.id} className="relative cursor-pointer group bg-white" onClick={() => selectShoe(shoe)}>
              <div className="w-full overflow-hidden bg-[#f7f6f4]" style={{ aspectRatio: isMobileWeb ? '3 / 4' : '4 / 5' }}>
                <img src={shoe.image || (shoe.id % 2 === 0 ? SHOES.editorial1 : SHOES.editorial2)} alt={shoe.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
              </div>
              <div className="p-3 lg:p-6">
                <p className="text-[13px] lg:text-[18px] font-extralight text-black leading-tight tracking-tight">{shoe.name}</p>
                <p className="text-[10px] lg:text-[12px] text-black/35 mt-1 font-light">{shoe.price}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          4. SAVOIR-FAIRE — Angular banner with text below
          ══════════════════════════════════════════════════════════ */}
      <div className="py-10 lg:py-20 cursor-pointer" onClick={() => navigate(isNative ? '/scan' : '/explore')}>
        <div className="px-4 lg:px-16 xl:px-24">
          <div className="w-full overflow-hidden" style={{ aspectRatio: isMobileWeb ? '4 / 3' : '21 / 9' }}>
            <img src={c('savoir_faire', 'image', '') || CRAFT.hands} alt="" className="w-full h-full object-cover" />
          </div>
        </div>
        <div className="px-4 lg:px-16 xl:px-24 pt-5 lg:pt-8">
          <p className="text-[9px] lg:text-[10px] text-black/20 uppercase tracking-[0.3em] mb-1.5">
            {isNative ? '3D-Technologie' : c('savoir_faire', 'label', 'Savoir-Faire')}
          </p>
          <h2 className="text-[18px] lg:text-[26px] font-extralight text-black leading-[1.1] tracking-tight">
            {isNative ? 'Der perfekte Scan' : c('savoir_faire', 'title', 'Handwerkskunst erleben')}
          </h2>
          <button
            className="mt-3 lg:mt-5 px-6 lg:px-8 py-2.5 lg:py-3 bg-white text-black text-[10px] lg:text-[11px] border border-black hover:bg-black hover:text-white transition-all duration-300"
            style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}
          >
            Entdecken
          </button>
        </div>
      </div>

      {isNative && (
        <div className="border-b border-black/[0.06]" onClick={() => navigate(latestScan ? '/my-scans' : '/scan')}>
          <div className="px-4 lg:px-16 xl:px-24 py-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-[#f7f6f4] flex items-center justify-center flex-shrink-0">
              <Footprints size={16} strokeWidth={1} className="text-black/25" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-black font-normal">Ihr 3D-Fußscan</p>
              {latestScan ? (
                <p className="text-[10px] text-black/30 mt-0.5 font-light">EU {latestScan.eu_size || '-'} · {latestScan.accuracy ? `${latestScan.accuracy.toFixed(1)}%` : '-'}</p>
              ) : (
                <p className="text-[10px] text-black/30 mt-0.5 font-light">Jetzt scannen für perfekte Passform</p>
              )}
            </div>
            <ArrowRight size={14} strokeWidth={1} className="text-black/15 flex-shrink-0" />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          5. COLLECTION CTA — Full-bleed angular banner
          ══════════════════════════════════════════════════════════ */}
      <div className="relative cursor-pointer" onClick={() => navigate('/collection')}>
        <div className="w-full overflow-hidden" style={{ aspectRatio: isMobileWeb ? '4 / 3' : '21 / 9' }}>
          <img src={c('collection_cta', 'image', '') || CRAFT.workshop} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/55" />
        </div>
        <div className="absolute bottom-0 left-0 p-5 lg:p-14">
          <p className="text-[9px] lg:text-[10px] text-white/30 uppercase tracking-[0.3em] mb-1.5 lg:mb-2">{c('collection_cta', 'label', 'Handgefertigt in über 200 Schritten')}</p>
          <h2 className="text-[20px] lg:text-[32px] font-extralight text-white leading-[1.1] tracking-tight">
            {c('collection_cta', 'title', 'Die Kollektion entdecken')}
          </h2>
          <button
            className="mt-3 lg:mt-6 px-6 lg:px-8 py-2.5 lg:py-3 bg-white text-black text-[10px] lg:text-[11px] border-0 hover:bg-black hover:text-white transition-all duration-300"
            style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}
            onClick={e => { e.stopPropagation(); navigate('/collection') }}
          >
            {c('collection_cta', 'button', 'Kollektion')}
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          6. FAVORITES — Angular product grid
          ══════════════════════════════════════════════════════════ */}
      {favShoes.length > 0 && (
        <div className="py-10 lg:py-20">
          <div className="px-4 lg:px-16 xl:px-24 mb-6 lg:mb-10">
            <p className="text-[9px] lg:text-[10px] text-black/20 uppercase tracking-[0.3em] mb-1.5">{c('favorites', 'label', 'Herren')}</p>
            <h2 className="text-[18px] lg:text-[26px] font-extralight text-black tracking-tight">{c('favorites', 'title', 'Ihre Favoriten')}</h2>
          </div>
          <div className="px-4 lg:px-16 xl:px-24">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-[1px] bg-black/[0.04]">
              {favShoes.slice(0, 4).map(shoe => (
                <div key={shoe.id} className="group cursor-pointer bg-white" onClick={() => selectShoe(shoe)}>
                  <div className="w-full overflow-hidden bg-[#f7f6f4]" style={{ aspectRatio: '1 / 1' }}>
                    <img src={shoe.image || SHOES[['dressShoes', 'oxfords', 'loafers', 'boots'][shoe.id % 4]]} alt={shoe.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                  </div>
                  <div className="p-3 lg:p-4">
                    <p className="text-[11px] lg:text-[13px] text-black font-normal leading-snug">{shoe.name}</p>
                    <p className="text-[11px] lg:text-[12px] text-black/35 mt-1 font-light">{shoe.price}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="px-4 lg:px-16 xl:px-24 mt-6 lg:mt-10">
            <button
              onClick={() => navigate('/wishlist')}
              className="px-6 lg:px-8 py-2.5 lg:py-3 bg-white text-black text-[10px] lg:text-[11px] border border-black hover:bg-black hover:text-white transition-all duration-300"
              style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}
            >
              {c('favorites', 'button', 'Alle Favoriten')}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          7. ACCESSORIES — Angular image + product grid
          ══════════════════════════════════════════════════════════ */}
      {activeAccessories.length > 0 && (
        <div>
          <div className="cursor-pointer" onClick={() => navigate('/accessories')}>
            <div className="w-full overflow-hidden" style={{ aspectRatio: isMobileWeb ? '4 / 3' : '21 / 9' }}>
              <img src={c('accessories', 'image', '') || CARE.polish} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="px-4 lg:px-16 xl:px-24 pt-5 lg:pt-8 pb-6 lg:pb-10">
              <p className="text-[9px] lg:text-[10px] text-black/20 uppercase tracking-[0.3em] mb-1.5">{c('accessories', 'label', 'Zubehör & Pflege')}</p>
              <h2 className="text-[18px] lg:text-[26px] font-extralight text-black leading-[1.1] tracking-tight">
                {c('accessories', 'title', 'Das Beste für Ihre Schuhe')}
              </h2>
            </div>
          </div>

          <div className="px-4 lg:px-16 xl:px-24 pb-10 lg:pb-20">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-[1px] bg-black/[0.04]">
              {activeAccessories.slice(0, 4).map(acc => (
                <div key={acc.id} className="group cursor-pointer bg-white">
                  <div className="w-full overflow-hidden bg-[#f7f6f4]" style={{ aspectRatio: '1 / 1' }}>
                    <img src={acc.image_data || CARE[['polish', 'brushes', 'cream'][acc.id % 3]]} alt={acc.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                  </div>
                  <div className="p-3 lg:p-4">
                    <p className="text-[11px] lg:text-[13px] text-black font-normal leading-snug">{acc.name}</p>
                    <p className="text-[11px] lg:text-[12px] text-black/35 mt-1 font-light">€ {parseFloat(acc.price) || 0}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 lg:mt-10">
              <button
                onClick={() => navigate('/accessories')}
                className="px-6 lg:px-8 py-2.5 lg:py-3 bg-white text-black text-[10px] lg:text-[11px] border border-black hover:bg-black hover:text-white transition-all duration-300"
                style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}
              >
                {c('accessories', 'button', 'Alle Produkte')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          8. ORDERS — Angular minimal list
          ══════════════════════════════════════════════════════════ */}
      {recentOrders.length > 0 && (
        <div className="py-10 lg:py-20 border-t border-black/[0.04]">
          <div className="px-4 lg:px-16 xl:px-24 mb-5 lg:mb-8 flex items-center justify-between">
            <div>
              <p className="text-[9px] lg:text-[10px] text-black/20 uppercase tracking-[0.3em] mb-1.5">Bestellungen</p>
              <h2 className="text-[18px] lg:text-[26px] font-extralight text-black tracking-tight">Ihre Bestellungen</h2>
            </div>
            <button onClick={() => navigate('/orders')} className="text-[10px] lg:text-[11px] text-black/30 bg-transparent border-0 hover:text-black transition-colors font-light underline underline-offset-4 decoration-black/15">
              Alle anzeigen
            </button>
          </div>
          <div className="px-4 lg:px-16 xl:px-24">
            {recentOrders.map(order => (
              <button key={order.id} onClick={() => navigate('/orders')} className="w-full bg-transparent border-0 text-left py-3.5 lg:py-4 border-b border-black/[0.04] flex items-center justify-between gap-3 hover:bg-black/[0.01] transition-colors">
                <div className="flex items-center gap-3 lg:gap-4 flex-1 min-w-0">
                  <div className="w-9 h-9 lg:w-10 lg:h-10 bg-[#f7f6f4] flex items-center justify-center flex-shrink-0">
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
          9. JOURNAL — Angular image + article grid
          ══════════════════════════════════════════════════════════ */}
      {publishedArticles.length > 0 && (
        <div className="border-t border-black/[0.04]">
          <div className="cursor-pointer" onClick={() => navigate('/explore')}>
            <div className="w-full overflow-hidden bg-[#f7f6f4]" style={{ aspectRatio: isMobileWeb ? '4 / 3' : '21 / 9' }}>
              <img src={publishedArticles[0].image_data || CRAFT.leather} alt={publishedArticles[0].title} className="w-full h-full object-cover" />
            </div>
            <div className="px-4 lg:px-16 xl:px-24 pt-5 lg:pt-8 pb-6 lg:pb-10">
              <p className="text-[9px] lg:text-[10px] text-black/20 uppercase tracking-[0.3em] mb-1.5">{c('journal', 'label', 'Atelier Journal')}</p>
              <h2 className="text-[18px] lg:text-[26px] font-extralight text-black leading-[1.1] tracking-tight">{publishedArticles[0].title}</h2>
            </div>
          </div>

          {publishedArticles.length > 1 && (
            <div className="px-4 lg:px-16 xl:px-24 pb-10 lg:pb-20">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-[1px] bg-black/[0.04]">
                {publishedArticles.slice(1, 4).map(article => (
                  <div key={article.id} className="group cursor-pointer bg-white" onClick={() => navigate('/explore')}>
                    <div className="w-full overflow-hidden bg-[#f7f6f4]" style={{ aspectRatio: '4 / 3' }}>
                      <img src={article.image_data || CRAFT[['workshop', 'stitching', 'tools'][article.id % 3]]} alt={article.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                    </div>
                    <div className="p-3 lg:p-4">
                      <p className="text-[8px] lg:text-[9px] text-black/20 uppercase tracking-[0.2em] mb-1">{article.category}</p>
                      <p className="text-[11px] lg:text-[14px] text-black font-light leading-snug">{article.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          10. SERVICE PROMISE — Angular three-column
          ══════════════════════════════════════════════════════════ */}
      <div className="border-t border-black/[0.04] py-10 lg:py-20">
        <div className="px-4 lg:px-16 xl:px-24">
          <div className="grid grid-cols-3 gap-[1px] bg-black/[0.04]">
            {[
              { label: 'Handgefertigt', title: 'Jeder Schuh ein Unikat', text: 'Von Hand gefertigt aus erlesenen Materialien in über 200 Arbeitsschritten.' },
              { label: '3D-Fußscan', title: 'Perfekte Passform', text: 'Millimetergenau vermessen für maximalen Komfort und Langlebigkeit.' },
              { label: 'Versand', title: 'Kostenlos ab € 500', text: 'Sicher verpackt und versichert direkt zu Ihnen geliefert.' },
            ].map(item => (
              <div key={item.label} className="bg-white p-4 lg:p-8">
                <p className="text-[8px] lg:text-[9px] uppercase tracking-[0.3em] text-black/20 mb-2 lg:mb-3">{item.label}</p>
                <p className="text-[12px] lg:text-[15px] text-black font-light leading-snug">{item.title}</p>
                <p className="text-[10px] lg:text-[12px] text-black/25 mt-1.5 lg:mt-2 font-light leading-relaxed hidden lg:block">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA Banner (CMS-controlled) ──────────────────────── */}
      <div className="px-4 lg:px-16 xl:px-24 pb-10 lg:pb-20">
        <CtaBanner page="foryou" />
      </div>
    </div>
  )
}
