/**
 * Explore.jsx — Entdecken & Inspiration (LV-style with hero, search, cart, articles)
 */

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Compass, Lock, BookOpen, Film, Layers, Sparkles, Users, TrendingUp,
  Bell, BellRing, ChevronRight, Search, ShoppingBag, X, Star, ArrowLeft,
} from 'lucide-react'
import useAtelierStore from '../store/atelierStore'
import { useAuth } from '../context/AuthContext'

const ICON_MAP = { BookOpen, Film, Layers, Sparkles, Users, TrendingUp, Compass }

const DEFAULT_SECTIONS = [
  {
    id: 'editorial', icon: 'BookOpen', label: 'Editorial', tag: 'Demnächst',
    color: '#1e3a5f', accent: '#3b82f6',
    title: 'Saisonale Editorials',
    description: 'Inszenierte Lookbooks und fotografische Geschichten rund um jede neue Kollektion.',
    previewItems: ['Herbst / Winter 2025', 'The Riviera Collection', 'Made in Florence'],
    visible: true,
  },
  {
    id: 'craft', icon: 'Film', label: 'Behind the Craft', tag: 'In Produktion',
    color: '#422006', accent: '#f59e0b',
    title: 'Handwerk trifft Technologie',
    description: 'Kurz-Dokumentationen über die Herstellung jedes Modells.',
    previewItems: ['Wie ein Leisten entsteht', 'Das Leder von Bontoni', 'Stitching mit Gefühl'],
    visible: true,
  },
  {
    id: 'styleguide', icon: 'Layers', label: 'Style Guide', tag: 'Demnächst',
    color: '#14532d', accent: '#22c55e',
    title: 'Outfit-Inspirationen',
    description: 'Kuratierte Kombinationsvorschläge auf Basis deiner Garderobe.',
    previewItems: ['Oxford trifft Flanell', 'Derby & Chino', 'Loafer im Business-Look'],
    visible: true,
  },
  {
    id: 'trends', icon: 'TrendingUp', label: 'Trends', tag: 'Demnächst',
    color: '#3b0764', accent: '#a855f7',
    title: 'Material- & Stil-Trends',
    description: 'Saisonale Trend-Reports zu Lederarten und Sohlenformen.',
    previewItems: ['Patina als Statement', 'Crepe Soles 2026', 'Naturfarben dominieren'],
    visible: true,
  },
  {
    id: 'collabs', icon: 'Sparkles', label: 'Kollaborationen', tag: 'Geheim',
    color: '#1a1a2e', accent: '#f59e0b',
    title: 'Limited Editions & Kollabs',
    description: 'Exklusive Capsule Collections mit Designern und Künstlern.',
    previewItems: ['× Mailänder Architekt', '× Toskana Tannery', 'Member Exclusive Drop'],
    visible: true,
  },
  {
    id: 'community', icon: 'Users', label: 'Community', tag: 'Beta',
    color: '#0f172a', accent: '#38bdf8',
    title: 'Style Community',
    description: 'ATELIER-Träger weltweit zeigen ihre Kombinationen.',
    previewItems: ['Riviera Loafer in Tokyo', 'Oxford in New York', 'Derby im Alltag'],
    visible: true,
  },
]

const TAG_STYLES = {
  'Demnächst':     { bg: 'bg-black/5',       text: 'text-black/45'  },
  'In Produktion': { bg: 'bg-amber-500/10',  text: 'text-amber-600' },
  'Beta':          { bg: 'bg-blue-500/10',   text: 'text-blue-600'  },
  'Geheim':        { bg: 'bg-purple-500/10', text: 'text-purple-600' },
  'Neu':           { bg: 'bg-green-500/10',  text: 'text-green-600' },
  'Live':          { bg: 'bg-emerald-500/10', text: 'text-emerald-600' },
}

const categoryColors = {
  'Gesundheit': { bg: 'bg-red-500/8',   text: 'text-red-600'   },
  'Tipps':      { bg: 'bg-amber-500/8', text: 'text-amber-600' },
  'Wissen':     { bg: 'bg-blue-500/8',  text: 'text-blue-600'  },
  'Allgemein':  { bg: 'bg-black/5',     text: 'text-black/50'  },
}

/* ── Article Detail (inline) ──────────────────────────────────────────────── */
function ArticleDetail({ article, onBack }) {
  const cat = categoryColors[article.category] || categoryColors['Allgemein']
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-5 pt-5 pb-4">
        <span className={`inline-block text-[8px] px-2 py-1 ${cat.bg} ${cat.text}`} style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          {article.category}
        </span>
        {article.featured && (
          <span className="ml-2 inline-flex items-center gap-1 text-[8px] px-2 py-1 bg-amber-500/10 text-amber-600" style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            <Star size={8} className="fill-amber-400 text-amber-400" /> Featured
          </span>
        )}
        <h1 className="text-[15px] text-black mt-3 leading-tight">{article.title}</h1>
        {article.excerpt && <p className="text-[11px] text-black/40 mt-2 leading-relaxed">{article.excerpt}</p>}
      </div>
      <div className="mx-0 h-px bg-black/5" />
      <div className="px-5 pt-4 pb-6">
        {article.content.split('\n\n').map((block, i) => {
          const isHeading = block.split('\n').length === 1 && block.length < 60 && !block.startsWith('–') && !block.match(/^\d+\./) && i > 0
          if (isHeading) return <h3 key={i} className="text-[12px] text-black mt-5 mb-2" style={{ letterSpacing: '0.05em' }}>{block}</h3>
          return <p key={i} className="text-[11px] text-black/50 leading-relaxed mb-3">{block}</p>
        })}
      </div>
      <div className="mx-0 mb-0 p-5 flex items-center justify-between cursor-pointer bg-black" onClick={onBack}>
        <div>
          <p className="text-[8px] text-white/40" style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>Mehr entdecken</p>
          <p className="text-[12px] text-white leading-tight mt-0.5">Zurück zur Übersicht</p>
        </div>
        <div className="w-9 h-9 bg-white/10 flex items-center justify-center flex-shrink-0">
          <BookOpen size={15} className="text-white/60" />
        </div>
      </div>
    </div>
  )
}

/* ── Main Component ───────────────────────────────────────────────────────── */
export default function Explore() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { exploreSections, exploreHero, articles, orders } = useAtelierStore()

  const [searchOpen, setSearchOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedArticle, setSelectedArticle] = useState(null)
  const [activeFilter, setActiveFilter] = useState('Alle')
  const searchRef = useRef(null)

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen && searchRef.current) searchRef.current.focus()
  }, [searchOpen])

  const sections = exploreSections.length > 0
    ? exploreSections.filter(s => s.visible).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    : DEFAULT_SECTIONS

  const heroImage = exploreHero?.image || null
  const heroTitle = exploreHero?.title || 'EXPLORE'
  const heroSubtitle = exploreHero?.subtitle || 'Editorials, Handwerksgeschichten und Style-Inspiration.'

  // Articles filtering
  const categories = ['Alle', ...Array.from(new Set(articles.map(a => a.category)))]
  const filteredArticles = activeFilter === 'Alle' ? articles : articles.filter(a => a.category === activeFilter)
  const featured = articles.filter(a => a.featured)
  const restArticles = (activeFilter === 'Alle' ? filteredArticles.filter(a => !a.featured) : filteredArticles)

  // Search filtering (across articles and sections)
  const q = searchQuery.toLowerCase().trim()
  const searchResults = q ? articles.filter(a =>
    a.title.toLowerCase().includes(q) ||
    a.excerpt?.toLowerCase().includes(q) ||
    a.category?.toLowerCase().includes(q)
  ) : []

  // If viewing an article detail
  if (selectedArticle) {
    return (
      <div className="flex flex-col h-full bg-white overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-black/5 flex-shrink-0">
          <button onClick={() => setSelectedArticle(null)} className="w-10 h-10 flex items-center justify-center bg-transparent border-0">
            <ArrowLeft size={18} strokeWidth={1.5} className="text-black" />
          </button>
          <span className="text-[11px] text-black flex-1 text-center truncate px-2" style={{ letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            {selectedArticle.title.slice(0, 22)}{selectedArticle.title.length > 22 ? '…' : ''}
          </span>
          <div className="w-10" />
        </div>
        <ArticleDetail article={selectedArticle} onBack={() => setSelectedArticle(null)} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">

      {/* ── Header (LV-style) ─────────────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between bg-white relative z-20">
        <div>
          <p className="text-[17px] font-normal text-black leading-tight uppercase tracking-[0.15em]">
            {user?.name || 'Atelier'}
          </p>
        </div>
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => { setSearchOpen(v => !v); setCartOpen(false) }}
            className="bg-transparent border-0 p-0"
          >
            {searchOpen
              ? <X size={20} strokeWidth={1.5} className="text-black/60" />
              : <Search size={20} strokeWidth={1.5} className="text-black/60" />
            }
          </button>
          <button
            onClick={() => { setCartOpen(v => !v); setSearchOpen(false) }}
            className="relative bg-transparent border-0 p-0"
          >
            <ShoppingBag size={20} strokeWidth={1.5} className="text-black/60" />
            {orders.length > 0 && (
              <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 bg-black flex items-center justify-center">
                <span className="text-[7px] font-bold text-white">{orders.length}</span>
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Search Panel (slide down from top) ────────────────────────────── */}
      <div
        className="overflow-hidden bg-white border-b border-black/5 relative z-10"
        style={{
          maxHeight: searchOpen ? 300 : 0,
          opacity: searchOpen ? 1 : 0,
          transform: searchOpen ? 'translateY(0)' : 'translateY(-20px)',
          transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease, transform 0.35s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <div className="px-5 pt-2 pb-3">
          <div className="flex items-center gap-2 bg-[#f6f5f3] px-3 py-2.5">
            <Search size={14} className="text-black/30 flex-shrink-0" />
            <input
              ref={searchRef}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Artikel, Themen, Inspirationen…"
              className="flex-1 bg-transparent border-0 outline-none text-sm text-black placeholder-black/30"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="bg-transparent border-0 p-0">
                <X size={14} className="text-black/30" />
              </button>
            )}
          </div>

          {/* Search results */}
          {q && (
            <div className="mt-2 max-h-48 overflow-y-auto">
              {searchResults.length === 0 ? (
                <p className="text-[10px] text-black/30 py-3 text-center">Keine Ergebnisse für „{searchQuery}"</p>
              ) : (
                searchResults.map(article => (
                  <button
                    key={article.id}
                    onClick={() => { setSelectedArticle(article); setSearchOpen(false); setSearchQuery('') }}
                    className="w-full text-left bg-transparent border-0 border-b border-black/5 py-2.5 px-1 flex items-center gap-3 active:bg-black/3"
                  >
                    <BookOpen size={13} className="text-black/25 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-black truncate">{article.title}</p>
                      <p className="text-[9px] text-black/30">{article.category}</p>
                    </div>
                    <ChevronRight size={12} className="text-black/15" />
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Cart Panel (slide in from right) ──────────────────────────────── */}
      <div
        className="fixed top-0 right-0 bottom-0 bg-white shadow-2xl z-50 flex flex-col"
        style={{
          width: 'min(340px, 85vw)',
          transform: cartOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-black/5">
          <h3 className="text-[12px] uppercase tracking-[0.18em] text-black font-medium">Bestellungen</h3>
          <button onClick={() => setCartOpen(false)} className="w-8 h-8 flex items-center justify-center bg-transparent border-0">
            <X size={18} strokeWidth={1.5} className="text-black/60" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingBag size={32} className="text-black/10 mb-3" />
              <p className="text-[11px] text-black/40">Keine Bestellungen</p>
              <p className="text-[9px] text-black/25 mt-1">Entdecken Sie unsere Kollektion</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.slice(0, 8).map(order => (
                <div key={order.id} className="border border-black/8 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-medium text-black">{order.shoe_name}</p>
                    <span className="text-[8px] uppercase tracking-wider text-black/30">{order.status}</span>
                  </div>
                  <p className="text-[9px] text-black/40 mt-0.5">{order.material} · {order.price}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="px-5 pb-5 pt-3 border-t border-black/5">
          <button
            onClick={() => { setCartOpen(false); navigate('/orders') }}
            className="w-full py-3 bg-black text-white text-[10px] uppercase tracking-[0.18em] font-medium border-0"
          >
            Alle Bestellungen anzeigen
          </button>
        </div>
      </div>
      {/* Cart backdrop */}
      {cartOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          style={{ transition: 'opacity 0.3s ease' }}
          onClick={() => setCartOpen(false)}
        />
      )}

      {/* ── Title bar ─────────────────────────────────────────────────────── */}
      <div className="px-5 pb-3 bg-white border-b border-black/8">
        <h2 className="text-2xl font-light text-black leading-tight uppercase tracking-[0.15em]">Explore</h2>
        <p className="text-[10px] text-black/35 mt-0.5">{heroSubtitle}</p>
      </div>

      {/* ── Scrollable Content ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* Hero Header */}
        <div className="relative" style={{ minHeight: heroImage ? 200 : 120 }}>
          {heroImage ? (
            <>
              <img src={heroImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.55) 100%)' }} />
            </>
          ) : (
            <div className="absolute inset-0 bg-[#1a1a1a]" />
          )}
          <div className="relative h-full flex flex-col justify-end p-5" style={{ minHeight: heroImage ? 200 : 120 }}>
            <p className="text-[7px] text-white/40 mb-1" style={{ letterSpacing: '0.25em', textTransform: 'uppercase' }}>ATELIER</p>
            <h1 className="text-[18px] text-white font-light" style={{ letterSpacing: '0.18em', textTransform: 'uppercase' }}>{heroTitle}</h1>
          </div>
        </div>

        {/* ── Section Cards ───────────────────────────────────────────────── */}
        <div className="space-y-0">
          {sections.map(section => {
            const Icon = ICON_MAP[section.icon] || Compass
            const tag = TAG_STYLES[section.tag] || TAG_STYLES['Demnächst']
            const isLocked = section.tag === 'Geheim'
            const previews = section.previewItems || []

            return (
              <div key={section.id || section.key} className="border-b border-black/5">
                {section.image && (
                  <div className="relative h-32 overflow-hidden">
                    <img src={section.image} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, transparent 40%, ${section.color} 100%)` }} />
                    <div className="absolute bottom-0 left-0 right-0 px-5 pb-3">
                      <p className="text-[8px]" style={{ color: section.accent, letterSpacing: '0.18em', textTransform: 'uppercase' }}>{section.label}</p>
                      <p className="text-[14px] text-white leading-tight mt-0.5">{section.title}</p>
                    </div>
                  </div>
                )}
                {!section.image && (
                  <div className="flex items-center justify-between px-5 py-4" style={{ background: section.color }}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.12)' }}>
                        <Icon size={17} color="white" strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-[8px]" style={{ color: section.accent, letterSpacing: '0.18em', textTransform: 'uppercase' }}>{section.label}</p>
                        <p className="text-[13px] text-white leading-tight mt-0.5">{section.title}</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 px-2.5 py-1 ${tag.bg}`}>
                      {isLocked && <Lock size={8} className={tag.text} strokeWidth={2} />}
                      <span className={`text-[7px] ${tag.text}`} style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>{section.tag}</span>
                    </div>
                  </div>
                )}
                {section.image && (
                  <div className="px-5 pt-3 flex items-center gap-2">
                    <div className={`flex items-center gap-1 px-2.5 py-1 ${tag.bg}`}>
                      {isLocked && <Lock size={8} className={tag.text} strokeWidth={2} />}
                      <span className={`text-[7px] ${tag.text}`} style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>{section.tag}</span>
                    </div>
                  </div>
                )}
                {section.description && (
                  <div className="px-5 pt-3 pb-2">
                    <p className="text-[10px] text-black/45 leading-relaxed">{section.description}</p>
                  </div>
                )}
                {previews.length > 0 && (
                  <div className="flex gap-2 px-5 pb-4 pt-1 flex-wrap">
                    {previews.map(item => (
                      <div key={item} className="flex items-center gap-1.5 bg-[#f6f5f3] px-3 py-1.5">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: section.accent }} />
                        <span className="text-[9px] text-black/45">{item}</span>
                        <ChevronRight size={9} className="text-black/20" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Learn / Articles Section ─────────────────────────────────────── */}
        <div className="border-b border-black/5">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <div>
              <p className="text-[8px] text-black/30" style={{ letterSpacing: '0.2em', textTransform: 'uppercase' }}>Wissen & Tipps</p>
              <h3 className="text-[14px] text-black mt-0.5" style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}>Learn</h3>
            </div>
            <span className="text-[9px] text-black/30 font-mono">{articles.length} Artikel</span>
          </div>

          {/* Featured article hero */}
          {featured.length > 0 && activeFilter === 'Alle' && (
            <button
              onClick={() => setSelectedArticle(featured[0])}
              className="w-full text-left border-0 p-0 active:opacity-90 transition-opacity"
              style={{ background: '#1a1a1a' }}
            >
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[7px] px-2 py-0.5 bg-white/10 text-white/60" style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    {featured[0].category}
                  </span>
                  <span className="flex items-center gap-1 text-[7px] px-2 py-0.5 bg-amber-500/20 text-amber-400" style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    <Star size={7} className="fill-amber-400 text-amber-400" /> Featured
                  </span>
                </div>
                <h2 className="text-[14px] text-white leading-snug mb-1">{featured[0].title}</h2>
                {featured[0].excerpt && <p className="text-[9px] text-white/35 leading-relaxed line-clamp-2">{featured[0].excerpt}</p>}
                <div className="flex items-center gap-1 mt-3">
                  <span className="text-[8px] text-white/50" style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>Lesen</span>
                  <ChevronRight size={11} className="text-white/50" />
                </div>
              </div>
            </button>
          )}

          {/* Category filter */}
          {categories.length > 2 && (
            <div className="flex gap-2 px-5 pt-4 pb-1 overflow-x-auto">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveFilter(cat)}
                  className={`flex-shrink-0 text-[8px] px-3 py-1.5 border transition-all ${
                    activeFilter === cat
                      ? 'bg-black text-white border-black'
                      : 'bg-transparent text-black/40 border-black/10'
                  }`}
                  style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Articles list */}
          {articles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 px-8 text-center">
              <BookOpen size={28} className="text-black/10 mb-2" />
              <p className="text-[11px] text-black/40">Noch keine Artikel</p>
            </div>
          ) : (
            <div className="pt-1 pb-2">
              {restArticles.map(article => {
                const cat = categoryColors[article.category] || categoryColors['Allgemein']
                return (
                  <button
                    key={article.id}
                    onClick={() => setSelectedArticle(article)}
                    className="w-full text-left border-0 border-b border-black/5 active:bg-black/3 transition-colors bg-transparent"
                  >
                    <div className="px-5 py-3.5 flex items-start gap-3">
                      <div className={`w-8 h-8 flex items-center justify-center flex-shrink-0 mt-0.5 ${cat.bg}`}>
                        <BookOpen size={14} className={cat.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`text-[7px] ${cat.text}`} style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                          {article.category}
                        </span>
                        <p className="text-[12px] text-black leading-snug mt-0.5">{article.title}</p>
                        {article.excerpt && <p className="text-[9px] text-black/35 mt-0.5 leading-relaxed line-clamp-2">{article.excerpt}</p>}
                      </div>
                      <ChevronRight size={14} className="text-black/20 flex-shrink-0 mt-1" strokeWidth={1.5} />
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Bottom note */}
        <div className="px-5 py-5 text-center bg-[#f6f5f3]">
          <p className="text-[10px] text-black/40" style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>Wir arbeiten daran</p>
          <p className="text-[9px] text-black/30 leading-relaxed mt-1">Neue Inhalte werden regelmäßig freigeschaltet.</p>
        </div>

        <div className="h-20" />
      </div>
    </div>
  )
}
