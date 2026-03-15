import { useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, Clock, TrendingUp, TrendingDown, Activity, Bone, Heart, Zap } from 'lucide-react'

const sections = [
  {
    id: 'short',
    title: 'Kurzfristig',
    subtitle: 'Sofortige Auswirkungen',
    timeframe: '0–4 Wochen',
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
    icon: Zap,
    items: [
      { icon: AlertTriangle, title: 'Blasen & Druckstellen', desc: 'Enger Zehenraum oder harter Absatz verursacht Reibung und schmerzhafteHautverletzungen.' },
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
    bg: '#fff1f2',
    border: '#fecdd3',
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
    bg: '#f5f3ff',
    border: '#ddd6fe',
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
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white px-5 pt-4 pb-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => navigate(-1)} className="bg-transparent border-0 p-0">
            <ArrowLeft size={20} strokeWidth={1.5} className="text-gray-700" />
          </button>
          <div>
            <p className="text-[8px] uppercase tracking-widest text-gray-400">Schuh-Info</p>
            <h1 className="font-playfair text-lg font-semibold text-black leading-tight">Falsches Schuhwerk</h1>
          </div>
        </div>
        <p className="text-[10px] text-gray-400 mt-2 leading-relaxed pl-8">
          Wie falsch sitzende Schuhe Fuß, Gelenke und Körperhaltung dauerhaft beeinflussen.
        </p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">

        {/* Intro card */}
        <div className="mx-4 mt-4 rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)' }}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Activity size={18} className="text-teal-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white leading-snug">
                Der Fuß ist das Fundament des Körpers.
              </p>
              <p className="text-[9px] text-gray-400 mt-1.5 leading-relaxed">
                Über 26 Knochen, 33 Gelenke und 100 Muskeln, Sehnen und Bänder arbeiten täglich zusammen.
                Falsches Schuhwerk stört dieses präzise System — mit Folgen weit über den Fuß hinaus.
              </p>
            </div>
          </div>
        </div>

        {/* Timeline sections */}
        {sections.map((sec) => {
          const HeaderIcon = sec.icon
          return (
            <div key={sec.id} className="mx-4 mt-4">
              {/* Section header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: sec.bg, border: `1px solid ${sec.border}` }}>
                    <HeaderIcon size={14} style={{ color: sec.color }} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-black">{sec.title}</p>
                    <p className="text-[8px] text-gray-400">{sec.subtitle}</p>
                  </div>
                </div>
                <span className="text-[8px] uppercase tracking-widest px-2 py-0.5 rounded-full font-medium"
                  style={{ background: sec.bg, color: sec.color, border: `1px solid ${sec.border}` }}>
                  {sec.timeframe}
                </span>
              </div>

              {/* Items */}
              <div className="space-y-2">
                {sec.items.map(({ icon: ItemIcon, title, desc }) => (
                  <div key={title} className="bg-white rounded-xl p-3.5 border flex items-start gap-3"
                    style={{ borderColor: sec.border }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: sec.bg }}>
                      <ItemIcon size={13} style={{ color: sec.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-black leading-snug">{title}</p>
                      <p className="text-[9px] text-gray-500 mt-1 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {/* Prevention tips */}
        <div className="mx-4 mt-5 mb-3">
          <p className="text-[9px] uppercase tracking-widest text-gray-400 mb-2">Prävention & Tipps</p>
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
            {tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <span className="w-5 h-5 rounded-full bg-black text-white text-[8px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-[10px] text-gray-600 leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA — foot scan */}
        <div
          className="mx-4 mt-2 mb-8 rounded-2xl p-4 flex items-center justify-between cursor-pointer active:opacity-80"
          style={{ background: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)' }}
          onClick={() => navigate('/scan')}
        >
          <div>
            <p className="text-[8px] uppercase tracking-widest text-teal-400 mb-1">Die Lösung</p>
            <p className="text-sm font-semibold text-white leading-tight">3D Foot Scan starten</p>
            <p className="text-[9px] text-gray-400 mt-1">Maßgefertigte Schuhe — perfekte Passform garantiert.</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-teal-500/20 border border-teal-500/30 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
