/**
 * Explore.jsx — LV-inspired editorial & discovery page
 * Warm tones, generous whitespace, elegant typography
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BookOpen, Compass } from 'lucide-react'
import useAtelierStore from '../store/atelierStore'
import CtaBanner from '../components/CtaBanner'

const ARTICLE_THEME = {
  'Gesundheit': '#19110B',
  'Tipps':      '#19110B',
  'Wissen':     '#19110B',
  'Allgemein':  '#19110B',
}

const DEFAULT_SECTIONS = [
  { id: 'editorial', label: 'Editorial', title: 'Saisonale Editorials', description: 'Inszenierte Lookbooks und fotografische Geschichten rund um jede neue Kollektion.', previewItems: ['Herbst / Winter 2025', 'The Riviera Collection', 'Made in Florence'], visible: true },
  { id: 'craft', label: 'Handwerk', title: 'Handwerk trifft Technologie', description: 'Kurz-Dokumentationen über die Herstellung jedes Modells — vom Leisten bis zur letzten Naht.', previewItems: ['Wie ein Leisten entsteht', 'Das Leder von Bontoni', 'Stitching mit Gefühl'], visible: true },
  { id: 'styleguide', label: 'Style Guide', title: 'Outfit-Inspirationen', description: 'Kuratierte Kombinationsvorschläge auf Basis Ihrer Garderobe und Ihres Stils.', previewItems: ['Oxford trifft Flanell', 'Derby & Chino', 'Loafer im Business-Look'], visible: true },
  { id: 'trends', label: 'Trends', title: 'Material- & Stil-Trends', description: 'Saisonale Reports zu Lederarten, Sohlenformen und den Farbtönen der Saison.', previewItems: ['Patina als Statement', 'Crepe Soles 2026', 'Naturfarben dominieren'], visible: true },
  { id: 'collabs', label: 'Kollaborationen', title: 'Limited Editions', description: 'Exklusive Capsule Collections mit Designern, Architekten und Künstlern.', previewItems: ['× Mailänder Architekt', '× Toskana Tannery', 'Member Exclusive Drop'], visible: true },
  { id: 'community', label: 'Community', title: 'Style Community', description: 'ATELIER-Träger weltweit zeigen ihre Kombinationen und teilen ihre Erfahrungen.', previewItems: ['Riviera Loafer in Tokyo', 'Oxford in New York', 'Derby im Alltag'], visible: true },
]

// ── Section Card (editorial topic) ───────────────────────────────────────
function SectionCard({ section, featured }) {
  return (
    <div className="group cursor-pointer">
      <div
        className={`w-full overflow-hidden flex items-center justify-center bg-[#f6f5f3] transition-all duration-500 group-hover:bg-[#efeee9] ${
          featured ? 'mb-4 lg:mb-5' : 'mb-3'
        }`}
        style={{ aspectRatio: featured ? '16 / 7' : '3 / 2' }}
      >
        {section.image ? (
          <img src={section.image} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
        ) : (
          <div className="flex flex-col items-center gap-2 opacity-[0.07]">
            <Compass size={featured ? 48 : 32} strokeWidth={0.6} className="text-black" />
          </div>
        )}
      </div>
      <p className="text-[10px] text-black/30 uppercase tracking-[0.2em] mb-1">{section.label}</p>
      <p className={`${featured ? 'text-[20px] lg:text-[24px]' : 'text-[14px] lg:text-[15px]'} text-black font-light leading-snug`}>
        {section.title}
      </p>
      <p className={`${featured ? 'text-[13px] lg:text-[14px] mt-2' : 'text-[12px] mt-1'} text-black/35 leading-relaxed font-light line-clamp-2`}>
        {section.description}
      </p>
      {section.previewItems && featured && (
        <div className="flex flex-wrap gap-2 mt-3">
          {section.previewItems.map(item => (
            <span key={item} className="text-[10px] text-black/25 border border-black/[0.06] px-2.5 py-1 font-light">{item}</span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Article Card ─────────────────────────────────────────────────────────
function ArticleCard({ article, onClick, featured }) {
  return (
    <div className="group cursor-pointer" onClick={onClick}>
      <div
        className={`w-full overflow-hidden flex items-center justify-center bg-[#f6f5f3] transition-all duration-500 group-hover:bg-[#efeee9] ${
          featured ? 'mb-4' : 'mb-3'
        }`}
        style={{ aspectRatio: featured ? '16 / 9' : '3 / 2' }}
      >
        {article.image ? (
          <img src={article.image} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
        ) : (
          <BookOpen size={featured ? 36 : 28} strokeWidth={0.6} className="text-black/[0.07]" />
        )}
      </div>
      <p className="text-[10px] text-black/30 uppercase tracking-[0.2em] mb-1">{article.category}</p>
      <p className={`${featured ? 'text-[17px] lg:text-[20px]' : 'text-[13px] lg:text-[14px]'} text-black font-light leading-snug`}>
        {article.title}
      </p>
      {article.excerpt && (
        <p className={`${featured ? 'text-[13px] mt-2' : 'text-[11px] mt-1'} text-black/30 leading-relaxed font-light line-clamp-2`}>
          {article.excerpt}
        </p>
      )}
    </div>
  )
}

// ── Article Detail ───────────────────────────────────────────────────────
function ArticleDetail({ article, onBack }) {
  return (
    <div className="flex-1 overflow-y-auto bg-white">
      {article.image ? (
        <div className="aspect-[16/8] overflow-hidden">
          <img src={article.image} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="h-32 bg-[#f6f5f3]" />
      )}
      <div className="px-5 lg:px-16 py-8 lg:py-12 max-w-3xl">
        <p className="text-[10px] text-black/30 uppercase tracking-[0.25em] mb-3">{article.category}</p>
        <h1 className="text-[28px] lg:text-[36px] font-extralight text-black leading-[1.15] tracking-tight">{article.title}</h1>
        {article.excerpt && (
          <p className="text-[15px] lg:text-[17px] text-black/40 mt-4 leading-[1.7] font-light">{article.excerpt}</p>
        )}
        <div className="h-px bg-black/[0.06] my-6 lg:my-8" />
        {article.content?.split('\n\n').map((block, i) => {
          const isHeading = block.split('\n').length === 1 && block.length < 60 && i > 0
          if (isHeading) return <h3 key={i} className="text-[15px] lg:text-[17px] font-normal text-black mt-8 mb-3 tracking-tight">{block}</h3>
          return <p key={i} className="text-[13px] lg:text-[15px] text-black/45 leading-[1.8] mb-5 font-light">{block}</p>
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
        <div className="flex items-center gap-3 px-5 lg:px-16 pt-4 pb-2 flex-shrink-0">
          <button onClick={() => setSelectedArticle(null)} className="w-10 h-10 flex items-center justify-center bg-transparent border-0">
            <ArrowLeft size={18} strokeWidth={1.5} className="text-black" />
          </button>
          <span className="text-[11px] text-black/30 uppercase tracking-[0.2em]">{selectedArticle.category}</span>
        </div>
        <ArticleDetail article={selectedArticle} onBack={() => setSelectedArticle(null)} />
      </div>
    )
  }

  return (
    <div className="min-h-full bg-white">

      {/* ── Hero header ─────────────────────────────────────────── */}
      <div className="px-5 lg:px-16 pt-8 lg:pt-14 pb-6 lg:pb-10">
        <p className="text-[10px] lg:text-[11px] text-black/30 uppercase tracking-[0.25em] mb-3">Atelier Journal</p>
        <h1 className="text-[32px] lg:text-[44px] font-extralight text-black leading-[1.1] tracking-tight">
          Entdecken
        </h1>
        <p className="text-[13px] lg:text-[15px] text-black/40 mt-3 lg:mt-4 max-w-lg leading-[1.7] font-light">
          Editorials, Handwerkskunst und Inspirationen — die Welt hinter jedem Schuh.
        </p>
      </div>

      <div className="px-5 lg:px-16 pb-16 space-y-10 lg:space-y-16">

        {/* ── Featured Section (hero) ───────────────────────────── */}
        {featuredSection && <SectionCard section={featuredSection} featured />}

        {/* ── Featured Articles ──────────────────────────────────── */}
        {featuredArticles.length > 0 && (
          <div>
            <p className="text-[10px] lg:text-[11px] text-black/30 uppercase tracking-[0.25em] mb-5 lg:mb-6">Empfohlen</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              {featuredArticles.map(article => (
                <ArticleCard key={article.id} article={article} onClick={() => setSelectedArticle(article)} featured />
              ))}
            </div>
          </div>
        )}

        {/* ── Topics grid ───────────────────────────────────────── */}
        {moreSections.length > 0 && (
          <div>
            <p className="text-[10px] lg:text-[11px] text-black/30 uppercase tracking-[0.25em] mb-5 lg:mb-6">Themen</p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-8 lg:gap-x-6 lg:gap-y-10">
              {moreSections.map(section => (
                <SectionCard key={section.id} section={section} />
              ))}
            </div>
          </div>
        )}

        {/* ── Articles ──────────────────────────────────────────── */}
        {regularArticles.length > 0 && (
          <div>
            <p className="text-[10px] lg:text-[11px] text-black/30 uppercase tracking-[0.25em] mb-5 lg:mb-6">Artikel</p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-8 lg:gap-x-6 lg:gap-y-10">
              {regularArticles.map(article => (
                <ArticleCard key={article.id} article={article} onClick={() => setSelectedArticle(article)} />
              ))}
            </div>
          </div>
        )}

        {/* ── CTA Banner (CMS-controlled) ──────────────────────── */}
        <CtaBanner page="explore" />

      </div>
    </div>
  )
}
