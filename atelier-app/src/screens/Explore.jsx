/**
 * Explore.jsx — "Entdecken" tab (Apple Store "Go Further" style)
 * Editorial content, articles, style guides with Apple's clean card aesthetic
 */
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight, ArrowLeft, BookOpen, Film, Layers, Sparkles, Users, TrendingUp, Compass, Play, Star,
} from 'lucide-react'
import useAtelierStore from '../store/atelierStore'
import { useAuth } from '../context/AuthContext'

const ICON_MAP = { BookOpen, Film, Layers, Sparkles, Users, TrendingUp, Compass }

const DEFAULT_SECTIONS = [
  { id: 'editorial', icon: 'BookOpen', label: 'Editorial', color: '#1D1D1F', accent: '#007AFF', title: 'Saisonale Editorials', description: 'Inszenierte Lookbooks und fotografische Geschichten rund um jede neue Kollektion.', previewItems: ['Herbst / Winter 2025', 'The Riviera Collection', 'Made in Florence'], visible: true },
  { id: 'craft', icon: 'Film', label: 'Behind the Craft', color: '#1D1D1F', accent: '#FF9500', title: 'Handwerk trifft Technologie', description: 'Kurz-Dokumentationen über die Herstellung jedes Modells.', previewItems: ['Wie ein Leisten entsteht', 'Das Leder von Bontoni', 'Stitching mit Gefühl'], visible: true },
  { id: 'styleguide', icon: 'Layers', label: 'Style Guide', color: '#1D1D1F', accent: '#34C759', title: 'Outfit-Inspirationen', description: 'Kuratierte Kombinationsvorschläge auf Basis deiner Garderobe.', previewItems: ['Oxford trifft Flanell', 'Derby & Chino', 'Loafer im Business-Look'], visible: true },
  { id: 'trends', icon: 'TrendingUp', label: 'Trends', color: '#1D1D1F', accent: '#AF52DE', title: 'Material- & Stil-Trends', description: 'Saisonale Trend-Reports zu Lederarten und Sohlenformen.', previewItems: ['Patina als Statement', 'Crepe Soles 2026', 'Naturfarben dominieren'], visible: true },
  { id: 'collabs', icon: 'Sparkles', label: 'Kollaborationen', color: '#1D1D1F', accent: '#FF9500', title: 'Limited Editions & Kollabs', description: 'Exklusive Capsule Collections mit Designern und Künstlern.', previewItems: ['× Mailänder Architekt', '× Toskana Tannery', 'Member Exclusive Drop'], visible: true },
  { id: 'community', icon: 'Users', label: 'Community', color: '#1D1D1F', accent: '#5AC8FA', title: 'Style Community', description: 'ATELIER-Träger weltweit zeigen ihre Kombinationen.', previewItems: ['Riviera Loafer in Tokyo', 'Oxford in New York', 'Derby im Alltag'], visible: true },
]

const ARTICLE_THEME = {
  'Gesundheit': { color: '#FF3B30', icon: 'BookOpen' },
  'Tipps':      { color: '#FF9500', icon: 'Sparkles' },
  'Wissen':     { color: '#007AFF', icon: 'BookOpen' },
  'Allgemein':  { color: '#8E8E93', icon: 'BookOpen' },
}

// ── Featured Content Card (large, image-based) ──────────────────────────────
function FeaturedCard({ section, onClick }) {
  const Icon = ICON_MAP[section.icon] || Compass
  return (
    <button onClick={onClick} className="w-full bg-transparent border-0 text-left p-0">
      <div className="rounded-2xl overflow-hidden" style={{ background: section.color }}>
        {section.image ? (
          <div className="relative aspect-[16/10]">
            <img src={section.image} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.7) 100%)' }} />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: section.accent }}>{section.label}</p>
              <p className="text-[22px] font-bold text-white leading-tight mt-1">{section.title}</p>
              <p className="text-[13px] text-white/60 mt-1.5 line-clamp-2">{section.description}</p>
            </div>
          </div>
        ) : (
          <div className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: section.accent + '20' }}>
                <Icon size={20} strokeWidth={1.5} style={{ color: section.accent }} />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: section.accent }}>{section.label}</p>
            </div>
            <p className="text-[22px] font-bold text-white leading-tight">{section.title}</p>
            <p className="text-[15px] text-white/60 mt-2 leading-relaxed">{section.description}</p>
          </div>
        )}
      </div>
    </button>
  )
}

// ── Small Section Card (side-scroll) ────────────────────────────────────────
function SmallSectionCard({ section }) {
  const Icon = ICON_MAP[section.icon] || Compass
  return (
    <div className="flex-shrink-0 rounded-2xl overflow-hidden" style={{ width: '260px', background: '#F5F5F7' }}>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: section.accent + '20' }}>
            <Icon size={16} strokeWidth={1.5} style={{ color: section.accent }} />
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: section.accent }}>{section.label}</span>
        </div>
        <p className="text-[15px] font-semibold text-black leading-snug">{section.title}</p>
        <p className="text-[13px] text-black/50 mt-1 line-clamp-2">{section.description}</p>
        {section.previewItems && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {section.previewItems.slice(0, 2).map(item => (
              <span key={item} className="text-[11px] text-black/40 bg-white rounded-full px-2.5 py-1">{item}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Article Card (Apple "Today at Apple" style) ─────────────────────────────
function ArticleCard({ article, onClick }) {
  const theme = ARTICLE_THEME[article.category] || ARTICLE_THEME['Allgemein']
  return (
    <button onClick={onClick} className="w-full bg-transparent border-0 text-left p-0">
      <div className="rounded-2xl overflow-hidden" style={{ background: '#F5F5F7' }}>
        {article.image ? (
          <div className="aspect-[16/9] overflow-hidden">
            <img src={article.image} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="aspect-[16/9] flex items-center justify-center" style={{ background: '#E8E8ED' }}>
            <BookOpen size={32} strokeWidth={1} className="text-black/15" />
          </div>
        )}
        <div className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: theme.color }}>{article.category}</p>
          <p className="text-[17px] font-semibold text-black leading-snug mt-1">{article.title}</p>
          {article.excerpt && (
            <p className="text-[13px] text-black/50 mt-1 line-clamp-2">{article.excerpt}</p>
          )}
        </div>
      </div>
    </button>
  )
}

// ── Article Detail ──────────────────────────────────────────────────────────
function ArticleDetail({ article, onBack }) {
  const theme = ARTICLE_THEME[article.category] || ARTICLE_THEME['Allgemein']
  return (
    <div className="flex-1 overflow-y-auto bg-white">
      {article.image ? (
        <div className="aspect-[16/10] overflow-hidden">
          <img src={article.image} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="h-24" style={{ background: theme.color }} />
      )}
      <div className="px-5 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: theme.color }}>{article.category}</p>
        <h1 className="text-[28px] font-bold text-black leading-tight mt-2">{article.title}</h1>
        {article.excerpt && (
          <p className="text-[17px] text-black/50 mt-3 leading-relaxed">{article.excerpt}</p>
        )}
        <div className="h-px bg-black/8 my-5" />
        {article.content?.split('\n\n').map((block, i) => {
          const isHeading = block.split('\n').length === 1 && block.length < 60 && i > 0
          if (isHeading) return <h3 key={i} className="text-[17px] font-semibold text-black mt-6 mb-2">{block}</h3>
          return <p key={i} className="text-[15px] text-black/60 leading-relaxed mb-4">{block}</p>
        })}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
export default function Explore() {
  const navigate = useNavigate()
  const { user } = useAuth()
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
        <div className="flex items-center gap-3 px-4 pt-3 pb-2 flex-shrink-0">
          <button onClick={() => setSelectedArticle(null)} className="w-10 h-10 flex items-center justify-center bg-transparent border-0">
            <ArrowLeft size={20} strokeWidth={1.5} className="text-[#007AFF]" />
          </button>
          <span className="text-[17px] font-semibold text-black flex-1 truncate">{selectedArticle.category}</span>
        </div>
        <ArticleDetail article={selectedArticle} onBack={() => setSelectedArticle(null)} />
      </div>
    )
  }

  return (
    <div className="min-h-full bg-white">

      {/* ── Large Title Header ────────────────────────────────────── */}
      <div className="px-5 lg:px-8 pt-3 lg:pt-8 pb-4 flex items-start justify-between">
        <div>
          <p className="text-[34px] lg:text-[40px] font-bold text-black leading-tight tracking-tight">Entdecken</p>
          <p className="text-[15px] lg:text-[17px] text-black/45 mt-1">Lass dich inspirieren.</p>
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

      <div className="px-5 lg:px-8 pb-8 space-y-6 lg:space-y-10">

        {/* ── Featured Section (hero card) ────────────────────────── */}
        {featuredSection && <FeaturedCard section={featuredSection} />}

        {/* ── Featured Articles ────────────────────────────────────── */}
        {featuredArticles.length > 0 && (
          <div>
            <p className="text-[20px] lg:text-[24px] font-bold text-black mb-3 lg:mb-5">Empfohlen</p>
            <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
              {featuredArticles.map(article => (
                <ArticleCard key={article.id} article={article} onClick={() => setSelectedArticle(article)} />
              ))}
            </div>
          </div>
        )}

        {/* ── More Sections (horizontal scroll) ───────────────────── */}
        {moreSections.length > 0 && (
          <div>
            <p className="text-[20px] lg:text-[24px] font-bold text-black mb-3 lg:mb-5">Themen</p>
            <div className="flex gap-3 overflow-x-auto -mx-5 px-5 pb-1" style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none' }}>
              {moreSections.map(section => (
                <SmallSectionCard key={section.id} section={section} />
              ))}
            </div>
          </div>
        )}

        {/* ── Articles Grid ───────────────────────────────────────── */}
        {regularArticles.length > 0 && (
          <div>
            <p className="text-[20px] lg:text-[24px] font-bold text-black mb-3 lg:mb-5">Artikel</p>
            <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
              {regularArticles.map(article => (
                <ArticleCard key={article.id} article={article} onClick={() => setSelectedArticle(article)} />
              ))}
            </div>
          </div>
        )}

        {/* ── Atelier Session Promo ───────────────────────────────── */}
        <div className="rounded-2xl overflow-hidden" style={{ background: '#F5F5F7' }}>
          <div className="p-5 text-center">
            <p className="text-[11px] font-semibold text-[#007AFF] uppercase tracking-wider mb-2">Atelier Session</p>
            <p className="text-[22px] font-bold text-black leading-tight">Besuche das Atelier</p>
            <p className="text-[15px] text-black/50 mt-2 leading-relaxed">
              Erlebe dein persönliches Fitting mit 3D-Scan. Kostenlos und unverbindlich.
            </p>
            <button
              onClick={() => navigate('/scan')}
              className="mt-4 px-6 py-2.5 rounded-full bg-[#007AFF] text-white text-[15px] font-medium border-0"
            >
              Termin vereinbaren
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
