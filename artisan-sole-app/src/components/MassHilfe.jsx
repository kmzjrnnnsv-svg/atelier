/**
 * MassHilfe — dieselbe Anleitung, aber dort, wo die Zahlen eingetippt werden.
 *
 * ── Warum nicht die Folge von der Startseite ──────────────────────────────
 *
 * Auf der Startseite läuft die Anleitung beim Scrollen (MassNehmen). Das ist
 * dort richtig: Man liest, man kommt vorbei, die Bilder ziehen mit.
 *
 * Im Konfigurator steht sie in einem Formular. Wer dort Hilfe braucht, hat
 * den Cursor schon im Feld — der scrollt nicht, der klickt. Eine klebende
 * Bühne mitten in einem Formular wäre außerdem eine Falle: Sie nimmt den
 * Bildschirm, und das Feld, um das es geht, ist weg.
 *
 * Also dieselben Bilder und dieselben Texte, aber mit drei Reitern und einem
 * langsamen Durchlauf, der beim ersten Klick stehen bleibt. Wer nur sehen
 * will, wie es geht, muss nichts tun; wer einen bestimmten Handgriff sucht,
 * tippt ihn an und bleibt dort.
 *
 * Wer `prefers-reduced-motion` meldet, bekommt keinen Durchlauf — nur die
 * Reiter. Eine Anleitung, die von allein weiterspringt, ist genau das, was
 * diese Einstellung meint.
 */
import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import MassAnleitung from './MassAnleitung'
import { MASSNEHMEN, BEIDE_FUESSE } from '../lib/massSchritte'
import { useWenigerBewegung } from '../lib/bewegung'

/* Wie lange ein Bild stehen bleibt. Lang genug, um den Satz darunter zu
   lesen — drei Sekunden reichen dafür nicht. */
const TAKT = 4200

export default function MassHilfe({ className = '' }) {
  const [offen, setOffen] = useState(false)
  const [schritt, setSchritt] = useState(0)
  const [angehalten, setAngehalten] = useState(false)
  const ruhig = useWenigerBewegung()

  useEffect(() => {
    if (!offen || angehalten || ruhig) return
    const t = setInterval(() => setSchritt(s => (s + 1) % MASSNEHMEN.length), TAKT)
    return () => clearInterval(t)
  }, [offen, angehalten, ruhig])

  const jetzt = MASSNEHMEN[schritt]

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOffen(o => !o)}
        aria-expanded={offen}
        className="group bg-transparent border-0 p-0 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-black/45 hover:text-black transition-colors"
      >
        So misst du richtig
        <ChevronDown
          size={13} strokeWidth={1.5}
          className="transition-transform duration-300"
          style={{ transform: offen ? 'rotate(180deg)' : 'none' }}
        />
      </button>

      {offen && (
        <div className="mt-3 border-t border-black/10 pt-3">
          {/* Die Reiter. Anklicken hält den Durchlauf an — wer sucht, will
              nicht weitergeschoben werden. */}
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {MASSNEHMEN.map((s, i) => (
              <button
                key={s.titel}
                type="button"
                onClick={() => { setSchritt(i); setAngehalten(true) }}
                aria-pressed={i === schritt}
                className={`bg-transparent border-0 p-0 text-[10px] uppercase tracking-[0.14em] transition-colors ${
                  i === schritt ? 'text-black' : 'text-black/30 hover:text-black/60'
                }`}
              >
                <span className="tabular-nums">{i + 1}</span>
                <span className="ml-1.5 normal-case tracking-normal text-[11px]">{s.titel}</span>
              </button>
            ))}
          </div>

          <div className="mt-3 text-black">
            <MassAnleitung schritt={schritt + 1} className="w-full max-w-sm" />
          </div>

          {/* Fester Kasten, damit das Bild beim Wechsel nicht springt. */}
          <div className="relative mt-2 min-h-[76px] sm:min-h-[62px]">
            {MASSNEHMEN.map((s, i) => (
              <p
                key={s.titel}
                aria-hidden={i !== schritt}
                className="absolute inset-0 text-[11px] text-black/50 font-light leading-[1.7] transition-opacity duration-500"
                style={{ opacity: i === schritt ? 1 : 0 }}
              >
                {s.text}
              </p>
            ))}
          </div>

          <p className="text-[10px] text-black/35 font-light leading-[1.7] mt-1">
            {BEIDE_FUESSE}
          </p>
          <span className="sr-only">{jetzt.titel}</span>
        </div>
      )}
    </div>
  )
}
