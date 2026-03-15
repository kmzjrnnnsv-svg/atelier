/**
 * Explore.jsx — Entdecken & Inspiration
 */

import { useState } from 'react'
import { Compass, Lock, BookOpen, Film, Layers, Sparkles, Users, TrendingUp, Bell, BellRing } from 'lucide-react'

const SECTIONS = [
  {
    id: 'editorial', icon: BookOpen, label: 'Editorial', tag: 'Demnächst',
    color: '#1e3a5f', accent: '#3b82f6',
    title: 'Saisonale Editorials',
    description: 'Inszenierte Lookbooks und fotografische Geschichten rund um jede neue Kollektion. Gestylt von internationalen Art Directors — direkt in der App erlebbar.',
    preview: ['Herbst / Winter 2025', 'The Riviera Collection', 'Made in Florence'],
  },
  {
    id: 'craft', icon: Film, label: 'Behind the Craft', tag: 'In Produktion',
    color: '#422006', accent: '#f59e0b',
    title: 'Handwerk trifft Technologie',
    description: 'Kurz-Dokumentationen über die Herstellung jedes Modells. Vom Ledergerber in der Toskana bis zum letzten Handstich im Atelier.',
    preview: ['Wie ein Leisten entsteht', 'Das Leder von Bontoni', 'Stitching mit Gefühl'],
  },
  {
    id: 'styleguide', icon: Layers, label: 'Style Guide', tag: 'Demnächst',
    color: '#14532d', accent: '#22c55e',
    title: 'Outfit-Inspirationen',
    description: 'Kuratierte Kombinationsvorschläge: welche Hose passt zu welchem Schuh. Dynamisch generiert auf Basis deiner Garderobe.',
    preview: ['Oxford trifft Flanell', 'Derby & Chino', 'Loafer im Business-Look'],
  },
  {
    id: 'trends', icon: TrendingUp, label: 'Trends', tag: 'Demnächst',
    color: '#3b0764', accent: '#a855f7',
    title: 'Material- & Stil-Trends',
    description: 'Saisonale Trend-Reports: Welche Lederarten sind im Kommen, welche Sohlenformen setzen neue Akzente.',
    preview: ['Patina als Statement', 'Crepe Soles 2026', 'Naturfarben dominieren'],
  },
  {
    id: 'collabs', icon: Sparkles, label: 'Kollaborationen', tag: 'Geheim',
    color: '#1a1a2e', accent: '#f59e0b',
    title: 'Limited Editions & Kollabs',
    description: 'Exklusive Capsule Collections mit Designern, Marken und Künstlern. Nur für ATELIER-Mitglieder.',
    preview: ['× Mailänder Architekt', '× Toskana Tannery', 'Member Exclusive Drop'],
  },
  {
    id: 'community', icon: Users, label: 'Community', tag: 'Beta',
    color: '#0f172a', accent: '#38bdf8',
    title: 'Style Community',
    description: 'ATELIER-Träger weltweit zeigen ihre Kombinationen. Echte Outfits, echte Menschen.',
    preview: ['Riviera Loafer in Tokyo', 'Oxford in New York', 'Derby im Alltag'],
  },
]

const TAG_STYLES = {
  'Demnächst':     { bg: 'bg-black/5',      text: 'text-black/45'  },
  'In Produktion': { bg: 'bg-amber-500/10', text: 'text-amber-600' },
  'Beta':          { bg: 'bg-blue-500/10',  text: 'text-blue-600'  },
  'Geheim':        { bg: 'bg-purple-500/10', text: 'text-purple-600' },
}

export default function Explore() {
  const [notifyOn, setNotifyOn] = useState(false)

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">

      {/* Header */}
      <div className="px-5 pt-4 pb-4 border-b border-black/5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[9px] text-black/30 mb-1" style={{ letterSpacing: '0.22em', textTransform: 'uppercase' }}>
              ATELIER
            </p>
            <h1 className="text-[11px] text-black" style={{ letterSpacing: '0.18em', textTransform: 'uppercase' }}>Explore</h1>
          </div>
          <button
            onClick={() => setNotifyOn(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 border transition-colors ${
              notifyOn ? 'bg-black text-white border-black' : 'bg-transparent border-black/10 text-black/40'
            }`}
          >
            {notifyOn
              ? <BellRing size={12} className="text-white" />
              : <Bell size={12} className="text-black/40" />
            }
            <span className="text-[9px]" style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {notifyOn ? 'Aktiv' : 'Erinnern'}
            </span>
          </button>
        </div>
        <p className="text-[10px] text-black/35 mt-2 leading-relaxed">
          Editorials, Handwerksgeschichten und Style-Inspiration.
        </p>
      </div>

      {/* Section Cards */}
      <div className="flex-1 overflow-y-auto py-0 space-y-0">

        {SECTIONS.map(section => {
          const Icon   = section.icon
          const tag    = TAG_STYLES[section.tag] || TAG_STYLES['Demnächst']
          const isLocked = section.tag === 'Geheim'

          return (
            <div key={section.id} className="border-b border-black/5">
              {/* Card header bar */}
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

              {/* Description */}
              <div className="px-5 pt-4 pb-3">
                <p className="text-[10px] text-black/45 leading-relaxed">{section.description}</p>
              </div>

              {/* Preview pills */}
              <div className="flex gap-2 px-5 pb-4 flex-wrap">
                {section.preview.map(item => (
                  <div key={item} className="flex items-center gap-1 bg-[#f6f5f3] px-3 py-1.5">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: section.accent }} />
                    <span className="text-[9px] text-black/45">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {/* Bottom note */}
        <div className="px-5 py-5 text-center bg-[#f6f5f3]">
          <p className="text-[10px] text-black/40" style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>Wir arbeiten daran</p>
          <p className="text-[9px] text-black/30 leading-relaxed mt-1">
            Neue Inhalte werden regelmäßig freigeschaltet.
          </p>
        </div>

      </div>
    </div>
  )
}
