/**
 * Explore.jsx — Entdecken & Inspiration (LV-style with hero header)
 */

import { useState, useEffect } from 'react'
import { Compass, Lock, BookOpen, Film, Layers, Sparkles, Users, TrendingUp, Bell, BellRing, ChevronRight } from 'lucide-react'
import useAtelierStore from '../store/atelierStore'

const ICON_MAP = {
  BookOpen, Film, Layers, Sparkles, Users, TrendingUp, Compass,
}

const DEFAULT_SECTIONS = [
  {
    id: 'editorial', icon: 'BookOpen', label: 'Editorial', tag: 'Demnächst',
    color: '#1e3a5f', accent: '#3b82f6',
    title: 'Saisonale Editorials',
    description: 'Inszenierte Lookbooks und fotografische Geschichten rund um jede neue Kollektion. Gestylt von internationalen Art Directors — direkt in der App erlebbar.',
    previewItems: ['Herbst / Winter 2025', 'The Riviera Collection', 'Made in Florence'],
    visible: true,
  },
  {
    id: 'craft', icon: 'Film', label: 'Behind the Craft', tag: 'In Produktion',
    color: '#422006', accent: '#f59e0b',
    title: 'Handwerk trifft Technologie',
    description: 'Kurz-Dokumentationen über die Herstellung jedes Modells. Vom Ledergerber in der Toskana bis zum letzten Handstich im Atelier.',
    previewItems: ['Wie ein Leisten entsteht', 'Das Leder von Bontoni', 'Stitching mit Gefühl'],
    visible: true,
  },
  {
    id: 'styleguide', icon: 'Layers', label: 'Style Guide', tag: 'Demnächst',
    color: '#14532d', accent: '#22c55e',
    title: 'Outfit-Inspirationen',
    description: 'Kuratierte Kombinationsvorschläge: welche Hose passt zu welchem Schuh. Dynamisch generiert auf Basis deiner Garderobe.',
    previewItems: ['Oxford trifft Flanell', 'Derby & Chino', 'Loafer im Business-Look'],
    visible: true,
  },
  {
    id: 'trends', icon: 'TrendingUp', label: 'Trends', tag: 'Demnächst',
    color: '#3b0764', accent: '#a855f7',
    title: 'Material- & Stil-Trends',
    description: 'Saisonale Trend-Reports: Welche Lederarten sind im Kommen, welche Sohlenformen setzen neue Akzente.',
    previewItems: ['Patina als Statement', 'Crepe Soles 2026', 'Naturfarben dominieren'],
    visible: true,
  },
  {
    id: 'collabs', icon: 'Sparkles', label: 'Kollaborationen', tag: 'Geheim',
    color: '#1a1a2e', accent: '#f59e0b',
    title: 'Limited Editions & Kollabs',
    description: 'Exklusive Capsule Collections mit Designern, Marken und Künstlern. Nur für ATELIER-Mitglieder.',
    previewItems: ['× Mailänder Architekt', '× Toskana Tannery', 'Member Exclusive Drop'],
    visible: true,
  },
  {
    id: 'community', icon: 'Users', label: 'Community', tag: 'Beta',
    color: '#0f172a', accent: '#38bdf8',
    title: 'Style Community',
    description: 'ATELIER-Träger weltweit zeigen ihre Kombinationen. Echte Outfits, echte Menschen.',
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

export default function Explore() {
  const { exploreSections, exploreHero } = useAtelierStore()
  const [notifyOn, setNotifyOn] = useState(false)

  // Use CMS sections if available, otherwise fallback to defaults
  const sections = exploreSections.length > 0
    ? exploreSections.filter(s => s.visible).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    : DEFAULT_SECTIONS

  const heroImage = exploreHero?.image || null
  const heroTitle = exploreHero?.title || 'EXPLORE'
  const heroSubtitle = exploreHero?.subtitle || 'Editorials, Handwerksgeschichten und Style-Inspiration.'

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">

      <div className="flex-1 overflow-y-auto">

        {/* Hero Header */}
        <div className="relative" style={{ minHeight: heroImage ? 220 : 140 }}>
          {heroImage ? (
            <>
              <img src={heroImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 100%)' }} />
            </>
          ) : (
            <div className="absolute inset-0 bg-[#1a1a1a]" />
          )}

          <div className="relative h-full flex flex-col justify-end p-5" style={{ minHeight: heroImage ? 220 : 140 }}>
            <p className="text-[7px] text-white/40 mb-1" style={{ letterSpacing: '0.25em', textTransform: 'uppercase' }}>
              ATELIER
            </p>
            <h1 className="text-[18px] text-white font-light tracking-wider" style={{ letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              {heroTitle}
            </h1>
            <p className="text-[10px] text-white/45 mt-1.5 leading-relaxed max-w-[280px]">
              {heroSubtitle}
            </p>

            {/* Notify toggle */}
            <button
              onClick={() => setNotifyOn(v => !v)}
              className={`mt-3 self-start flex items-center gap-1.5 px-3 py-1.5 border transition-colors ${
                notifyOn ? 'bg-white text-black border-white' : 'bg-transparent border-white/20 text-white/60'
              }`}
            >
              {notifyOn
                ? <BellRing size={11} className="text-black" />
                : <Bell size={11} className="text-white/60" />
              }
              <span className="text-[8px]" style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                {notifyOn ? 'Aktiv' : 'Erinnern'}
              </span>
            </button>
          </div>
        </div>

        {/* Section Cards */}
        <div className="space-y-0">
          {sections.map(section => {
            const Icon = ICON_MAP[section.icon] || Compass
            const tag = TAG_STYLES[section.tag] || TAG_STYLES['Demnächst']
            const isLocked = section.tag === 'Geheim'
            const previews = section.previewItems || []

            return (
              <div key={section.id || section.key} className="border-b border-black/5">
                {/* Section image (if CMS-provided) */}
                {section.image && (
                  <div className="relative h-32 overflow-hidden">
                    <img src={section.image} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, transparent 40%, ${section.color} 100%)` }} />
                    <div className="absolute bottom-0 left-0 right-0 px-5 pb-3">
                      <p className="text-[8px]" style={{ color: section.accent, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                        {section.label}
                      </p>
                      <p className="text-[14px] text-white leading-tight mt-0.5">{section.title}</p>
                    </div>
                  </div>
                )}

                {/* Card header bar (no image or below image) */}
                {!section.image && (
                  <div className="flex items-center justify-between px-5 py-4" style={{ background: section.color }}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.12)' }}>
                        <Icon size={17} color="white" strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-[8px]" style={{ color: section.accent, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                          {section.label}
                        </p>
                        <p className="text-[13px] text-white leading-tight mt-0.5">{section.title}</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 px-2.5 py-1 ${tag.bg}`}>
                      {isLocked && <Lock size={8} className={tag.text} strokeWidth={2} />}
                      <span className={`text-[7px] ${tag.text}`} style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>{section.tag}</span>
                    </div>
                  </div>
                )}

                {/* Tag badge (when image is present) */}
                {section.image && (
                  <div className="px-5 pt-3 flex items-center gap-2">
                    <div className={`flex items-center gap-1 px-2.5 py-1 ${tag.bg}`}>
                      {isLocked && <Lock size={8} className={tag.text} strokeWidth={2} />}
                      <span className={`text-[7px] ${tag.text}`} style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>{section.tag}</span>
                    </div>
                  </div>
                )}

                {/* Description */}
                {section.description && (
                  <div className="px-5 pt-3 pb-2">
                    <p className="text-[10px] text-black/45 leading-relaxed">{section.description}</p>
                  </div>
                )}

                {/* Preview pills */}
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

        {/* Bottom note */}
        <div className="px-5 py-5 text-center bg-[#f6f5f3]">
          <p className="text-[10px] text-black/40" style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>Wir arbeiten daran</p>
          <p className="text-[9px] text-black/30 leading-relaxed mt-1">
            Neue Inhalte werden regelmäßig freigeschaltet.
          </p>
        </div>

        <div className="h-20" />
      </div>
    </div>
  )
}
