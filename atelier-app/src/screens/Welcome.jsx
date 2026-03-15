import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

  const skip = () => navigate('/scan', { replace: true })

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Skip */}
      <div className="flex justify-end px-5 pt-14 pb-2 flex-shrink-0">
        <button onClick={skip} className={`text-xs bg-transparent border-0 font-medium ${!isLast ? 'text-gray-400' : 'text-transparent pointer-events-none'}`}>
          Überspringen
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mb-6">
          <step.icon size={32} strokeWidth={1.5} className="text-gray-800" />
        </div>
        <h1 className="font-playfair text-2xl text-black leading-tight mb-3">{step.title}</h1>
        <p className="text-sm text-gray-500 leading-relaxed max-w-xs">{step.desc}</p>
      </div>

      {/* Dots + Button */}
      <div className="px-5 pb-10 space-y-5 flex-shrink-0">
        {/* Dots */}
        <div className="flex justify-center gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === current ? 'w-6 bg-black' : 'w-1.5 bg-gray-200'
              }`}
            />
          ))}
        </div>

        <button
          onClick={next}
          className="w-full rounded-lg bg-black text-white font-semibold text-sm uppercase tracking-widest border-0 flex items-center justify-center gap-2"
          style={{ height: '52px' }}
        >
          {isLast ? 'Scan starten' : 'Weiter'}
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}
