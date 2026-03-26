/**
 * Explore.jsx — LV-inspired editorial & discovery page
 * Edge-to-edge hero, generous whitespace, padded content grids
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BookOpen, Compass } from 'lucide-react'
import useAtelierStore from '../store/atelierStore'
import CtaBanner from '../components/CtaBanner'
import { HEROES, EXPLORE, CRAFT, LIFESTYLE } from '../lib/editorialImages'

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
      <div className="w-full overflow-hidden" style={{ aspectRatio: '16 / 8' }}>
        <img src={article.image || CRAFT.hands} alt="" className="w-full h-full object-cover" />
      </div>
      <div className="px-8 lg:px-24 xl:px-32 py-10 lg:py-16 max-w-3xl">
        <p className="text-[10px] text-black/25 uppercase tracking-[0.25em] mb-3">{article.category}</p>
        <h1 className="text-[28px] lg:text-[40px] font-extralight text-black leading-[1.15] tracking-tight">{article.title}</h1>
        {article.excerpt && (
          <p className="text-[15px] lg:text-[17px] text-black/35 mt-5 leading-[1.7] font-light">{article.excerpt}</p>
        )}
        <div className="h-px bg-black/[0.06] my-8 lg:my-10" />
        {article.content?.split('\n\n').map((block, i) => {
          const isHeading = block.split('\n').length === 1 && block.length < 60 && i > 0
          if (isHeading) return <h3 key={i} className="text-[15px] lg:text-[17px] font-normal text-black mt-10 mb-3 tracking-tight">{block}</h3>
          return <p key={i} className="text-[13px] lg:text-[15px] text-black/40 leading-[1.8] mb-5 font-light">{block}</p>
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
  const featuredArticles = articles.filter(a => a.featured)
  const regularArticles = articles.filter(a => !a.featured)

  // Article detail view
  if (selectedArticle) {
    return (
      <div className="flex flex-col min-h-full bg-white">
        <div className="flex items-center gap-3 px-6 lg:px-16 pt-4 pb-2 flex-shrink-0">
          <button onClick={() => setSelectedArticle(null)} className="w-10 h-10 flex items-center justify-center bg-transparent border-0">
            <ArrowLeft size={18} strokeWidth={1.5} className="text-black" />
          </button>
          <span className="text-[11px] text-black/25 uppercase tracking-[0.2em]">{selectedArticle.category}</span>
        </div>
        <ArticleDetail article={selectedArticle} onBack={() => setSelectedArticle(null)} />
      </div>
    )
  }

  return (
    <div className="min-h-full bg-white">

      {/* ══════════════════════════════════════════════════════════
          HERO — Full-bleed featured section, edge-to-edge
          ══════════════════════════════════════════════════════════ */}
      {featuredSection && (
        <div className="relative cursor-pointer group">
          <div
            className="w-full overflow-hidden bg-[#f6f5f3]"
            style={{ aspectRatio: '16 / 8' }}
          >
            <img src={featuredSection.image || HEROES.explore} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-16" style={{ background: 'linear-gradient(transparent 0%, rgba(0,0,0,0.4) 100%)' }}>
            <p className="text-[10px] text-white/40 uppercase tracking-[0.3em] mb-2 lg:mb-3">{featuredSection.label}</p>
            <h2 className="text-[28px] lg:text-[46px] font-extralight text-white leading-[1.05] tracking-tight">{featuredSection.title}</h2>
            <p className="text-[13px] lg:text-[15px] text-white/40 mt-2 lg:mt-3 font-light max-w-lg">{featuredSection.description}</p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          FEATURED ARTICLES — Two-column, edge-to-edge
          ══════════════════════════════════════════════════════════ */}
      {featuredArticles.length > 0 && (
        <div className="grid grid-cols-2">
          {featuredArticles.slice(0, 2).map(article => (
            <div key={article.id} className="relative cursor-pointer group" onClick={() => setSelectedArticle(article)}>
              <div className="w-full overflow-hidden bg-[#f6f5f3]" style={{ aspectRatio: '3 / 4' }}>
                <img src={article.image || CRAFT[['workshop', 'hands', 'leather', 'stitching'][article.id % 4]]} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 lg:p-8" style={{ background: 'linear-gradient(transparent 0%, rgba(0,0,0,0.35) 100%)' }}>
                <p className="text-[9px] lg:text-[10px] text-white/40 uppercase tracking-[0.25em] mb-1">{article.category}</p>
                <p className="text-[16px] lg:text-[22px] font-extralight text-white leading-tight tracking-tight">{article.title}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          CTA — Full-bleed dark banner
          ══════════════════════════════════════════════════════════ */}
      <div className="relative">
        <div className="absolute inset-0 overflow-hidden">
          <img src={CRAFT.leather} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/65" />
        </div>
        <div className="relative max-w-4xl mx-auto px-8 lg:px-16 py-16 lg:py-28 text-center">
          <p className="text-[10px] text-white/25 uppercase tracking-[0.3em] mb-4 lg:mb-5">Atelier Journal</p>
          <h2 className="text-[28px] lg:text-[44px] font-extralight text-white leading-[1.1] tracking-tight">
            Die Welt hinter jedem Schuh
          </h2>
          <p className="text-[13px] text-white/30 mt-4 font-light leading-relaxed max-w-md mx-auto">
            Editorials, Handwerkskunst und Inspirationen — entdecken Sie die Geschichten.
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          TOPICS GRID — Padded with generous whitespace
          ══════════════════════════════════════════════════════════ */}
      {moreSections.length > 0 && (
        <div className="py-16 lg:py-28">
          <div className="text-center mb-10 lg:mb-14">
            <p className="text-[10px] text-black/25 uppercase tracking-[0.3em]">Themen</p>
          </div>
          <div className="px-8 lg:px-24 xl:px-32">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 lg:gap-x-8 gap-y-10 lg:gap-y-16">
              {moreSections.map(section => (
                <div key={section.id} className="group cursor-pointer">
                  <div
                    className="w-full overflow-hidden flex items-center justify-center bg-[#f6f5f3] mb-4 transition-all duration-500 group-hover:bg-[#efeee9]"
                    style={{ aspectRatio: '3 / 2' }}
                  >
                    <img src={section.image || EXPLORE[section.id] || LIFESTYLE.detail} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                  </div>
                  <p className="text-[10px] text-black/25 uppercase tracking-[0.2em] mb-1">{section.label}</p>
                  <p className="text-[14px] lg:text-[16px] text-black font-light leading-snug">{section.title}</p>
                  <p className="text-[12px] text-black/30 mt-1 leading-relaxed font-light line-clamp-2">{section.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          ARTICLES — First one full-bleed, rest padded
          ══════════════════════════════════════════════════════════ */}
      {regularArticles.length > 0 && (
        <>
          {/* Full-bleed first article */}
          <div className="relative cursor-pointer group" onClick={() => setSelectedArticle(regularArticles[0])}>
            <div className="w-full overflow-hidden bg-[#f6f5f3]" style={{ aspectRatio: '16 / 7' }}>
              <img src={regularArticles[0].image || LIFESTYLE.walking} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-16" style={{ background: 'linear-gradient(transparent 0%, rgba(0,0,0,0.4) 100%)' }}>
              <p className="text-[10px] text-white/40 uppercase tracking-[0.3em] mb-2">{regularArticles[0].category}</p>
              <h2 className="text-[24px] lg:text-[36px] font-extralight text-white leading-[1.1] tracking-tight">{regularArticles[0].title}</h2>
            </div>
          </div>

          {/* Padded remaining articles */}
          {regularArticles.length > 1 && (
            <div className="py-14 lg:py-24">
              <div className="px-8 lg:px-24 xl:px-32">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 lg:gap-x-8 gap-y-10 lg:gap-y-14">
                  {regularArticles.slice(1).map(article => (
                    <div key={article.id} className="group cursor-pointer" onClick={() => setSelectedArticle(article)}>
                      <div
                        className="w-full overflow-hidden flex items-center justify-center bg-[#f6f5f3] mb-4 transition-all duration-500 group-hover:bg-[#efeee9]"
                        style={{ aspectRatio: '3 / 2' }}
                      >
                        <img src={article.image || LIFESTYLE[['walking', 'suit', 'store', 'detail'][article.id % 4]]} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]" />
                      </div>
                      <p className="text-[10px] text-black/25 uppercase tracking-[0.2em] mb-1">{article.category}</p>
                      <p className="text-[13px] lg:text-[15px] text-black font-light leading-snug">{article.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── CTA Banner (CMS-controlled) — padded ──────────────── */}
      <div className="px-8 lg:px-24 xl:px-32 pb-20">
        <CtaBanner page="explore" />
      </div>
    </div>
  )
}
