import { useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, Clock, TrendingUp, TrendingDown, Activity, Bone, Heart, Zap } from 'lucide-react'

const sections = [
  {
    id: 'short',
    title: 'Kurzfristig',
    subtitle: 'Sofortige Auswirkungen',
    timeframe: '0–4 Wochen',
    color: '#d97706',
    accent: '#f59e0b',
    icon: Zap,
    items: [
      { icon: AlertTriangle, title: 'Blasen & Druckstellen', desc: 'Enger Zehenraum oder harter Absatz verursacht Reibung und schmerzhafte Hautverletzungen.' },
      { icon: Activity,      title: 'Muskelermüdung',       desc: 'Falsche Dämpfung zwingt die Bein- und Fußmuskeln zur Überkompensation und ermüdet schneller.' },
      { icon: Zap,           title: 'Akute Schmerzen',       desc: 'Sofortige Schmerzen in Ferse, Spann oder Zehen — besonders bei flachen Sohlen ohne Stütze.' },
    ],
  },
  {
    id: 'mid',
    title: 'Mittelfristig',
    subtitle: 'Schleichende Schäden',
    timeframe: '1–12 Monate',
    color: '#dc2626',
    accent: '#ef4444',
    icon: TrendingUp,
    items: [
      { icon: Bone,     title: 'Fehlstellungen',    desc: 'Hallux valgus, Hammerzehen und Spreizfuß entstehen durch dauerhaften Druck auf die falsche Stelle.' },
      { icon: Activity, title: 'Gelenkschmerzen',   desc: 'Knie und Sprunggelenk passen ihre Mechanik an — das führt zu Entzündungen und chronischen Schmerzen.' },
      { icon: Heart,    title: 'Haltungsschäden',   desc: 'Die Wirbelsäule kompensiert eine veränderte Fußstellung und verschiebt schrittweise das gesamte Körpergleichgewicht.' },
    ],
  },
  {
    id: 'long',
    title: 'Langfristig',
    subtitle: 'Chronische Folgeschäden',
    timeframe: '1+ Jahre',
    color: '#7c3aed',
    accent: '#a855f7',
    icon: TrendingDown,
    items: [
      { icon: Bone,     title: 'Chronische Fußprobleme', desc: 'Plantarfasziitis, Metatarsalgie und dauerhafter Nervenschmerz (Morton-Neurom) können irreversibel werden.' },
      { icon: Activity, title: 'Knie- & Rückenprobleme',  desc: 'Arthrose in Knie und Hüfte sowie Bandscheibenvorfälle werden durch jahrelange Fehlbelastung begünstigt.' },
      { icon: Heart,    title: 'Systemische Haltungsschäden', desc: 'Skoliose, Beckenschiefstand und chronische Rückenschmerzen als Langzeitfolge dauerhafter Fehlstellungen.' },
    ],
  },
]

const tips = [
  'Fußlänge regelmäßig nachmessen — Füße können sich im Laufe des Lebens verändern.',
  'Mindestens 1 cm Spielraum vor der großen Zehe sicherstellen.',
  'Schuhwerk dem Zweck anpassen: Büro, Sport, Freizeit.',
  'Täglich Schuhe wechseln, damit das Material Zeit zum Lüften hat.',
  'Hochhackige Schuhe max. 2–3 Stunden täglich tragen.',
  '3D-Fußscan für präzise Maßfertigung — exakte Passform, keine Kompromisse.',
]

export default function HealthInfo() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col min-h-full bg-white">
      {/* Header */}
      <div className="bg-white px-5 pt-4 pb-4 border-b border-black/5 flex-shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => navigate(-1)} className="bg-transparent border-0 p-0">
            <ArrowLeft size={20} strokeWidth={1.5} className="text-black" />
          </button>
          <div>
            <p className="text-[8px] uppercase tracking-widest text-black/30" style={{ letterSpacing: '0.2em' }}>Schuh-Info</p>
            <h1 className="text-[14px] text-black leading-tight" style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}>Falsches Schuhwerk</h1>
          </div>
        </div>
        <p className="text-[10px] text-black/35 mt-2 leading-relaxed pl-8">
          Wie falsch sitzende Schuhe Fuß, Gelenke und Körperhaltung dauerhaft beeinflussen.
        </p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1">

        {/* Intro card — section-style header */}
        <div className="flex items-center gap-3 px-5 py-4" style={{ background: '#0f172a' }}>
          <div className="w-9 h-9 flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(45,212,191,0.15)' }}>
            <Activity size={17} className="text-teal-400" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[8px] text-teal-400" style={{ letterSpacing: '0.18em', textTransform: 'uppercase' }}>Grundlagen</p>
            <p className="text-[13px] text-white leading-tight mt-0.5">Der Fuß ist das Fundament</p>
          </div>
        </div>
        <div className="px-5 pt-3 pb-4 border-b border-black/5">
          <p className="text-[10px] text-black/45 leading-relaxed">
            Über 26 Knochen, 33 Gelenke und 100 Muskeln, Sehnen und Bänder arbeiten täglich zusammen.
            Falsches Schuhwerk stört dieses präzise System — mit Folgen weit über den Fuß hinaus.
          </p>
        </div>

        {/* Timeline sections — explore section card style */}
        {sections.map((sec) => {
          const HeaderIcon = sec.icon
          return (
            <div key={sec.id} className="border-b border-black/5">
              {/* Section header bar */}
              <div className="flex items-center justify-between px-5 py-4" style={{ background: sec.color }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.12)' }}>
                    <HeaderIcon size={17} color="white" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-[8px]" style={{ color: sec.accent, letterSpacing: '0.18em', textTransform: 'uppercase' }}>{sec.subtitle}</p>
                    <p className="text-[13px] text-white leading-tight mt-0.5">{sec.title}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 bg-white/10">
                  <span className="text-[7px] text-white/60" style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>{sec.timeframe}</span>
                </div>
              </div>

              {/* Items */}
              <div className="px-5 pt-3 pb-4 space-y-2">
                {sec.items.map(({ icon: ItemIcon, title, desc }) => (
                  <div key={title} className="bg-[#f6f5f3] p-3.5 flex items-start gap-3">
                    <div className="w-7 h-7 flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${sec.color}15` }}>
                      <ItemIcon size={13} style={{ color: sec.color }} strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-black leading-snug">{title}</p>
                      <p className="text-[9px] text-black/45 mt-1 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {/* Prevention tips — preview pills style */}
        <div className="border-b border-black/5">
          <div className="flex items-center gap-3 px-5 py-4" style={{ background: '#14532d' }}>
            <div className="w-9 h-9 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.12)' }}>
              <Heart size={17} color="white" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[8px] text-emerald-400" style={{ letterSpacing: '0.18em', textTransform: 'uppercase' }}>Vorsorge</p>
              <p className="text-[13px] text-white leading-tight mt-0.5">Prävention & Tipps</p>
            </div>
          </div>

          <div className="px-5 pt-3 pb-4 space-y-0 divide-y divide-black/5">
            {tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-3 py-3">
                <span className="w-5 h-5 bg-black text-white text-[8px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-[10px] text-black/50 leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA — foot scan */}
        <button
          className="w-full p-5 flex items-center justify-between bg-black border-0 text-left active:opacity-80"
          onClick={() => navigate('/scan')}
        >
          <div>
            <p className="text-[8px] text-teal-400" style={{ letterSpacing: '0.18em', textTransform: 'uppercase' }}>Die Lösung</p>
            <p className="text-[13px] text-white leading-tight mt-0.5">3D Foot Scan starten</p>
            <p className="text-[9px] text-white/35 mt-1">Maßgefertigte Schuhe — perfekte Passform garantiert.</p>
          </div>
          <div className="w-9 h-9 flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(45,212,191,0.15)' }}>
            <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 text-teal-400" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
        </button>

        <div className="h-4" />
      </div>
    </div>
  )
}
