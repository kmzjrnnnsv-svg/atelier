import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isNative } from '../App'
import { ArrowRight, Footprints, Sparkles, Ruler, ShoppingBag } from 'lucide-react'

const STEPS = [
  {
    icon: Footprints,
    title: 'Präzise Fußvermessung',
    desc: 'Scanne deine Füße mit der Kamera — unsere KI berechnet millimetergenaue Maße für den perfekten Sitz.',
  },
  {
    icon: Sparkles,
    title: 'Individuelle Schuhleisten',
    desc: 'Auf Basis deiner Maße erstellen wir einen digitalen Leisten — die Grundlage für maßgefertigte Schuhe.',
  },
  {
    icon: Ruler,
    title: 'Deine perfekte Größe',
    desc: 'Nie wieder falsche Schuhgrößen. Wir zeigen dir deine exakte Größe in EU, UK und US.',
  },
  {
    icon: ShoppingBag,
    title: 'Deine Kollektion erwartet dich',
    desc: 'Entdecke handverlesene Luxusschuhe, speichere Favoriten und stelle Outfits zusammen.',
  },
]

export default function Welcome() {
  const navigate = useNavigate()
  const [current, setCurrent] = useState(0)
  const step = STEPS[current]
  const isLast = current === STEPS.length - 1

  const next = () => {
    if (isLast) {
      navigate('/scan', { replace: true })
    } else {
      setCurrent(c => c + 1)
    }
  }

  const skip = () => navigate('/foryou', { replace: true })

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Skip */}
      <div className="flex justify-end px-5 pt-4 pb-2 flex-shrink-0">
        <button onClick={skip} className={`text-[10px] bg-transparent border-0 ${!isLast ? 'text-black/35' : 'text-transparent pointer-events-none'}`}
          style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Überspringen
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="w-20 h-20 bg-black/[0.03] flex items-center justify-center mb-6">
          <step.icon size={32} strokeWidth={1.5} className="text-black" />
        </div>
        <h1 className="text-[13px] text-black leading-tight mb-3" style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>{step.title}</h1>
        <p className="text-[11px] text-black/40 leading-relaxed max-w-xs">{step.desc}</p>
      </div>

      {/* Dots + Button */}
      <div className="px-5 space-y-5 flex-shrink-0" style={{ paddingBottom: isNative ? 'max(env(safe-area-inset-bottom, 0px), 24px)' : '24px' }}>
        {/* Dots */}
        <div className="flex justify-center gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 transition-all ${
                i === current ? 'w-6 bg-black' : 'w-1.5 bg-black/15'
              }`}
            />
          ))}
        </div>

        <button
          onClick={next}
          className="w-full bg-black text-white text-[10px] border-0 flex items-center justify-center gap-2"
          style={{ height: '48px', letterSpacing: '0.18em', textTransform: 'uppercase' }}
        >
          {isLast ? 'Scan starten' : 'Weiter'}
          <ArrowRight size={16} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  )
}
