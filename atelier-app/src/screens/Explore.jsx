/**
 * Explore.jsx — Entdecken & Inspiration
 *
 * Platzhalter-Screen mit beschriebenen Sektionen für zukünftige Inhalte.
 */

import { Compass, Lock, BookOpen, Film, Layers, Sparkles, Users, TrendingUp } from 'lucide-react'

// ── Placeholder-Sektionen ─────────────────────────────────────────────────────

const SECTIONS = [
  {
    id: 'editorial',
    icon: BookOpen,
    label: 'Editorial',
    tag: 'Demnächst',
    color: '#1e3a5f',
    accent: '#3b82f6',
    title: 'Saisonale Editorials',
    description:
      'Inszenierte Lookbooks und fotografische Geschichten rund um jede neue Kollektion. Gestylt von internationalen Art Directors — direkt in der App erlebbar.',
    preview: ['Herbst / Winter 2025', 'The Riviera Collection', 'Made in Florence'],
  },
  {
    id: 'craft',
    icon: Film,
    label: 'Behind the Craft',
    tag: 'In Produktion',
    color: '#422006',
    accent: '#f59e0b',
    title: 'Handwerk trifft Technologie',
    description:
      'Kurz-Dokumentationen über die Herstellung jedes Modells. Vom Ledergerber in der Toskana bis zum letzten Handstich im Atelier — die Geschichte hinter dem Schuh.',
    preview: ['Wie ein Leisten entsteht', 'Das Leder von Bontoni', 'Stitching mit Gefühl'],
  },
  {
    id: 'styleguide',
    icon: Layers,
    label: 'Style Guide',
    tag: 'Demnächst',
    color: '#14532d',
    accent: '#22c55e',
    title: 'Outfit-Inspirationen',
    description:
      'Kuratierte Kombinationsvorschläge: welche Hose passt zu welchem Schuh, welches Material harmoniert mit welcher Farbe. Dynamisch generiert auf Basis deiner Garderobe.',
    preview: ['Oxford trifft Flanell', 'Derby & Chino', 'Loafer im Business-Look'],
  },
  {
    id: 'trends',
    icon: TrendingUp,
    label: 'Trends',
    tag: 'Demnächst',
    color: '#3b0764',
    accent: '#a855f7',
    title: 'Material- & Stil-Trends',
    description:
      'Saisonale Trend-Reports: Welche Lederarten sind im Kommen, welche Sohlenformen setzen neue Akzente. Einblicke aus Mailand, Paris und Florenz — kuratiert vom ATELIER-Team.',
    preview: ['Patina als Statement', 'Crepe Soles 2026', 'Naturfarben dominieren'],
  },
  {
    id: 'collabs',
    icon: Sparkles,
    label: 'Kollaborationen',
    tag: 'Geheim',
    color: '#1a1a2e',
    accent: '#f59e0b',
    title: 'Limited Editions & Kollabs',
    description:
      'Exklusive Capsule Collections mit Designern, Marken und Künstlern. Nur für ATELIER-Mitglieder — mit frühzeitigem Zugang und personalisierten Angeboten.',
    preview: ['× Mailänder Architekt', '× Toskana Tannery', 'Member Exclusive Drop'],
  },
  {
    id: 'community',
    icon: Users,
    label: 'Community',
    tag: 'Beta',
    color: '#0f172a',
    accent: '#38bdf8',
    title: 'Style Community',
    description:
      'ATELIER-Träger weltweit zeigen ihre Kombinationen. Echte Outfits, echte Menschen — gefiltert nach Modell, Material oder Anlass. Teile dein eigenes Look.',
    preview: ['Riviera Loafer in Tokyo', 'Oxford in New York', 'Derby im Alltag'],
  },
]

const TAG_STYLES = {
  'Demnächst':     { bg: 'bg-gray-100',       text: 'text-gray-500'   },
  'In Produktion': { bg: 'bg-amber-50',        text: 'text-amber-600'  },
  'Beta':          { bg: 'bg-blue-50',         text: 'text-blue-600'   },
  'Geheim':        { bg: 'bg-purple-50',       text: 'text-purple-600' },
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function Explore() {

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">

      {/* Header */}
      <div className="px-5 pt-14 pb-5 border-b border-gray-100">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[9px] uppercase tracking-[0.22em] font-bold text-gray-400 mb-1">
              ATELIER
            </p>
            <h1 className="text-2xl font-bold text-black leading-tight">Explore</h1>
          </div>
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-full px-3 py-1.5">
            <Compass size={12} className="text-gray-400" />
            <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide">
              Coming Soon
            </span>
          </div>
        </div>
        <p className="text-sm text-gray-400 mt-2 leading-relaxed">
          Editorials, Handwerksgeschichten und Style-Inspiration — alles was über den Schuh hinausgeht.
        </p>
      </div>

      {/* Section Cards */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-6">

        {SECTIONS.map(section => {
          const Icon   = section.icon
          const tag    = TAG_STYLES[section.tag] || TAG_STYLES['Demnächst']
          const isLocked = section.tag === 'Geheim'

          return (
            <div
              key={section.id}
              className="rounded-3xl overflow-hidden border border-gray-100 bg-white"
              style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.05)' }}
            >
              {/* Card header bar */}
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ background: section.color }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.12)' }}
                  >
                    <Icon size={17} color="white" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-[8px] uppercase tracking-[0.18em] font-bold"
                      style={{ color: section.accent }}>
                      {section.label}
                    </p>
                    <p className="text-sm font-bold text-white leading-tight mt-0.5">
                      {section.title}
                    </p>
                  </div>
                </div>

                {/* Tag */}
                <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 ${tag.bg}`}>
                  {isLocked && <Lock size={8} className={tag.text} strokeWidth={2.5} />}
                  <span className={`text-[7px] font-bold uppercase tracking-widest ${tag.text}`}>
                    {section.tag}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="px-5 pt-4 pb-3">
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  {section.description}
                </p>
              </div>

              {/* Preview pills */}
              <div className="flex gap-2 px-5 pb-4 flex-wrap">
                {section.preview.map(item => (
                  <div
                    key={item}
                    className="flex items-center gap-1 bg-gray-50 rounded-full px-3 py-1.5"
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: section.accent }}
                    />
                    <span className="text-[9px] text-gray-500 font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {/* Bottom note */}
        <div className="mx-1 mt-2 bg-gray-50 rounded-2xl px-5 py-4 text-center">
          <p className="text-[10px] text-gray-400 leading-relaxed">
            Diese Sektionen befinden sich in aktiver Entwicklung.<br />
            Inhalte werden schrittweise über das CMS befüllt.
          </p>
        </div>

      </div>
    </div>
  )
}
