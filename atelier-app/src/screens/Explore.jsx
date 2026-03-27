/**
 * Explore.jsx — LV-style angular editorial & discovery page
 * Sharp edges, product-grid-style layout, minimal editorial
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import useAtelierStore from '../store/atelierStore'
import { apiFetch } from '../hooks/useApi'
import { HEROES, EXPLORE, CRAFT, LIFESTYLE } from '../lib/editorialImages'
import { isMobileWeb } from '../App'

const DEFAULT_SECTIONS = [
  { id: 'editorial', label: 'Editorial', title: 'Saisonale Editorials', description: 'Inszenierte Lookbooks und fotografische Geschichten rund um jede neue Kollektion.', previewItems: ['Herbst / Winter 2025', 'The Riviera Collection', 'Made in Florence'], visible: true },
  { id: 'craft', label: 'Handwerk', title: 'Handwerk trifft Technologie', description: 'Kurz-Dokumentationen über die Herstellung jedes Modells — vom Leisten bis zur letzten Naht.', previewItems: ['Wie ein Leisten entsteht', 'Das Leder von Bontoni', 'Stitching mit Gefühl'], visible: true },
  { id: 'styleguide', label: 'Style Guide', title: 'Outfit-Inspirationen', description: 'Kuratierte Kombinationsvorschläge auf Basis Ihrer Garderobe und Ihres Stils.', previewItems: ['Oxford trifft Flanell', 'Derby & Chino', 'Loafer im Business-Look'], visible: true },
  { id: 'trends', label: 'Trends', title: 'Material- & Stil-Trends', description: 'Saisonale Reports zu Lederarten, Sohlenformen und den Farbtönen der Saison.', previewItems: ['Patina als Statement', 'Crepe Soles 2026', 'Naturfarben dominieren'], visible: true },
  { id: 'collabs', label: 'Kollaborationen', title: 'Limited Editions', description: 'Exklusive Capsule Collections mit Designern, Architekten und Künstlern.', previewItems: ['× Mailänder Architekt', '× Toskana Tannery', 'Member Exclusive Drop'], visible: true },
  { id: 'community', label: 'Community', title: 'Style Community', description: 'ATELIER-Träger weltweit zeigen ihre Kombinationen und teilen ihre Erfahrungen.', previewItems: ['Riviera Loafer in Tokyo', 'Oxford in New York', 'Derby im Alltag'], visible: true },
]

// ── Article Detail ───────────────────────────────────────────────────────
function ArticleDetail({ article, onBack }) {
  return (
    <div className="flex-1 overflow-y-auto bg-white">
      <div className="w-full overflow-hidden" style={{ aspectRatio: isMobileWeb ? '4 / 3' : '21 / 9' }}>
        <img src={article.image || CRAFT.hands} alt="" className="w-full h-full object-cover" />
      </div>
      <div className="px-4 lg:px-16 xl:px-24 py-8 lg:py-14 max-w-3xl">
        <p className="text-[9px] text-black/20 uppercase tracking-[0.25em] mb-2">{article.category}</p>
        <h1 className="text-[24px] lg:text-[36px] font-extralight text-black leading-[1.15] tracking-tight">{article.title}</h1>
        {article.excerpt && (
          <p className="text-[14px] lg:text-[16px] text-black/30 mt-4 leading-[1.7] font-light">{article.excerpt}</p>
        )}
        <div className="h-px bg-black/[0.04] my-8 lg:my-10" />
        {article.content?.split('\n\n').map((block, i) => {
          const isHeading = block.split('\n').length === 1 && block.length < 60 && i > 0
          if (isHeading) return <h3 key={i} className="text-[14px] lg:text-[16px] font-normal text-black mt-10 mb-3 tracking-tight">{block}</h3>
          return <p key={i} className="text-[13px] lg:text-[14px] text-black/35 leading-[1.8] mb-5 font-light">{block}</p>
        })}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
export default function Explore() {
  const navigate = useNavigate()
  const { exploreSections, articles } = useAtelierStore()
  const [selectedArticle, setSelectedArticle] = useState(null)

  const sections = exploreSections.length > 0
    ? exploreSections.filter(s => s.visible).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    : DEFAULT_SECTIONS

  const featuredSection = sections[0]
  const moreSections = sections.slice(1)
  const [serviceSections, setServiceSections] = useState([
    { label: 'Editorials', title: 'Geschichten hinter der Kollektion', text: 'Inszenierte Lookbooks und fotografische Geschichten rund um jede neue Saison.' },
    { label: 'Handwerk', title: 'Vom Leisten bis zur Naht', text: 'Kurz-Dokumentationen über die Herstellung jedes Modells in über 200 Schritten.' },
    { label: 'Community', title: 'Atelier-Träger weltweit', text: 'Erfahrungen, Kombinationen und Stilinspirationen unserer Community.' },
  ])

  useEffect(() => {
    apiFetch('/api/settings/footer')
      .then(data => { if (data?.service_sections) setServiceSections(data.service_sections) })
      .catch(() => {})
  }, [])

  const featuredArticles = articles.filter(a => a.featured)
  const regularArticles = articles.filter(a => !a.featured)

  // Article detail view
  if (selectedArticle) {
    return (
      <div className="flex flex-col min-h-full bg-white">
        <div className="flex items-center gap-3 px-4 lg:px-16 pt-4 pb-2 flex-shrink-0">
          <button onClick={() => setSelectedArticle(null)} className="w-10 h-10 flex items-center justify-center bg-transparent border-0">
            <ArrowLeft size={16} strokeWidth={1.25} className="text-black" />
          </button>
          <span className="text-[10px] text-black/20 uppercase tracking-[0.2em]">{selectedArticle.category}</span>
        </div>
        <ArticleDetail article={selectedArticle} onBack={() => setSelectedArticle(null)} />
      </div>
    )
  }

  return (
    <div className="min-h-full bg-white">

      {/* ══════════════════════════════════════════════════════════
          1. HERO — Full-bleed angular banner
          ══════════════════════════════════════════════════════════ */}
      {featuredSection && (
        <div className="relative cursor-pointer group">
          <div className="w-full overflow-hidden bg-[#f7f6f4]" style={{ aspectRatio: isMobileWeb ? '3 / 4' : '21 / 9' }}>
            <img src={featuredSection.image || HEROES.explore} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-5 lg:p-14" style={{ background: 'linear-gradient(transparent 0%, rgba(0,0,0,0.5) 100%)' }}>
            <p className="text-[9px] lg:text-[10px] text-white/35 uppercase tracking-[0.3em] mb-1.5 lg:mb-2">{featuredSection.label}</p>
            <h2 className="text-[22px] lg:text-[38px] font-extralight text-white leading-[1.05] tracking-tight">{featuredSection.title}</h2>
            <p className="text-[11px] lg:text-[13px] text-white/30 mt-1.5 lg:mt-2 font-light max-w-lg">{featuredSection.description}</p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          2. TOPICS — Angular grid with 1px gaps
          ══════════════════════════════════════════════════════════ */}
      {moreSections.length > 0 && (
        <div className="py-10 lg:py-20">
          <div className="px-4 lg:px-16 xl:px-24 mb-6 lg:mb-10">
            <p className="text-[9px] lg:text-[10px] text-black/20 uppercase tracking-[0.3em] mb-1.5">Entdecken</p>
            <h2 className="text-[18px] lg:text-[26px] font-extralight text-black tracking-tight">Themen</h2>
          </div>
          <div className="px-4 lg:px-16 xl:px-24">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-[1px] bg-black/[0.04]">
              {moreSections.map(section => (
                <div key={section.id} className="group cursor-pointer bg-white">
                  <div
                    className="w-full overflow-hidden bg-[#f7f6f4]"
                    style={{ aspectRatio: '4 / 3' }}
                  >
                    <img src={section.image || EXPLORE[section.id] || LIFESTYLE.detail} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                  </div>
                  <div className="p-3 lg:p-4">
                    <p className="text-[8px] lg:text-[9px] text-black/20 uppercase tracking-[0.2em] mb-1">{section.label}</p>
                    <p className="text-[12px] lg:text-[14px] text-black font-light leading-snug">{section.title}</p>
                    <p className="text-[10px] lg:text-[11px] text-black/25 mt-1 leading-relaxed font-light line-clamp-2 hidden lg:block">{section.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          3. FEATURED ARTICLES — Two-column angular split
          ══════════════════════════════════════════════════════════ */}
      {featuredArticles.length > 0 && (
        <div className="grid grid-cols-2 gap-[1px] bg-black/[0.04]">
          {featuredArticles.slice(0, 2).map(article => (
            <div key={article.id} className="relative cursor-pointer group bg-white" onClick={() => setSelectedArticle(article)}>
              <div className="w-full overflow-hidden bg-[#f7f6f4]" style={{ aspectRatio: isMobileWeb ? '3 / 4' : '4 / 5' }}>
                <img src={article.image || CRAFT[['workshop', 'hands', 'leather', 'stitching'][article.id % 4]]} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
              </div>
              <div className="p-3 lg:p-6">
                <p className="text-[8px] lg:text-[9px] text-black/20 uppercase tracking-[0.25em] mb-1">{article.category}</p>
                <p className="text-[13px] lg:text-[18px] font-extralight text-black leading-tight tracking-tight">{article.title}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          4. ALL ARTICLES — Angular grid
          ══════════════════════════════════════════════════════════ */}
      {regularArticles.length > 0 && (
        <div className="py-10 lg:py-20">
          <div className="px-4 lg:px-16 xl:px-24 mb-6 lg:mb-10">
            <p className="text-[9px] lg:text-[10px] text-black/20 uppercase tracking-[0.3em] mb-1.5">Atelier Journal</p>
            <h2 className="text-[18px] lg:text-[26px] font-extralight text-black tracking-tight">Alle Artikel</h2>
          </div>
          <div className="px-4 lg:px-16 xl:px-24">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-[1px] bg-black/[0.04]">
              {regularArticles.map(article => (
                <div key={article.id} className="group cursor-pointer bg-white" onClick={() => setSelectedArticle(article)}>
                  <div
                    className="w-full overflow-hidden bg-[#f7f6f4]"
                    style={{ aspectRatio: '4 / 3' }}
                  >
                    <img src={article.image || LIFESTYLE[['walking', 'elegance', 'store', 'detail'][article.id % 4]]} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                  </div>
                  <div className="p-3 lg:p-4">
                    <p className="text-[8px] lg:text-[9px] text-black/20 uppercase tracking-[0.2em] mb-1">{article.category}</p>
                    <p className="text-[11px] lg:text-[14px] text-black font-light leading-snug">{article.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          5. JOURNAL CTA — Angular full-bleed banner
          ══════════════════════════════════════════════════════════ */}
      <div className="relative">
        <div className="w-full overflow-hidden" style={{ aspectRatio: isMobileWeb ? '4 / 3' : '21 / 9' }}>
          <img src={CRAFT.leather} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/55" />
        </div>
        <div className="absolute bottom-0 left-0 p-5 lg:p-14">
          <p className="text-[9px] lg:text-[10px] text-white/30 uppercase tracking-[0.3em] mb-1.5 lg:mb-2">Atelier Journal</p>
          <h2 className="text-[20px] lg:text-[32px] font-extralight text-white leading-[1.1] tracking-tight">
            Die Welt hinter jedem Schuh
          </h2>
          <p className="text-[11px] lg:text-[13px] text-white/25 mt-1.5 lg:mt-2 font-light max-w-md">
            Editorials, Handwerkskunst und Inspirationen — entdecken Sie die Geschichten.
          </p>
        </div>
      </div>

      {/* ── Service Promise ──────────────────────────────────── */}
      <div className="border-t border-black/[0.04] py-10 lg:py-16">
        <div className="px-4 lg:px-16 xl:px-24">
          <div className="grid grid-cols-3 gap-[1px] bg-black/[0.04]">
            {serviceSections.map(item => (
              <div key={item.label} className="bg-white p-4 lg:p-8">
                <p className="text-[8px] lg:text-[9px] uppercase tracking-[0.3em] text-black/20 mb-2 lg:mb-3">{item.label}</p>
                <p className="text-[12px] lg:text-[15px] text-black font-light leading-snug">{item.title}</p>
                <p className="text-[10px] lg:text-[12px] text-black/25 mt-1.5 lg:mt-2 font-light leading-relaxed hidden lg:block">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
