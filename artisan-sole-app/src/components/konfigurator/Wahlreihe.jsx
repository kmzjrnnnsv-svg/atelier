/**
 * Wahlreihe — die Werte eines Schritts.
 *
 * Zwei Formen, je nachdem, was es zu sehen gibt:
 *
 *   rund   Runde Muster wie bei Nike: Farbe, Futter, Laufsohle, Leder. Groß
 *          genug, dass man die Narbung erkennt (56 px, auf dem Schreibtisch
 *          64), und mit dem Namen der gewählten Farbe darüber. Das Muster
 *          ist ein Foto des Leders, keine Farbfläche — „Dunkelbraun" und
 *          „Ochsenblut" unterscheidet man an der Fläche nicht, am Leder schon.
 *
 *   text   Wörter wie bei Rolex: Absatz, Leisten, alles ohne Bild. Eine Wahl
 *          zwischen „Standard" und „Höher" ist eine Wahl zwischen zwei
 *          Wörtern, und ein leeres Kästchen daneben machte sie nicht klarer.
 *
 * Zeigen genügt, Klicken ist nicht nötig: Fährt der Zeiger über ein Muster
 * (oder liegt der Tastaturfokus darauf), steht es groß in der Bühne. Wer
 * vergleicht, will sehen, ohne sich bei jedem Blick festzulegen.
 */
import { Check, Star } from 'lucide-react'

const preisText = (p) => (p > 0 ? `+ € ${Number(p).toLocaleString('de-DE')}` : null)

export default function Wahlreihe({ werte, gewaehlt, onWahl, onZeigen, form = 'rund', mitNamen = false, beschriftung }) {
  if (form === 'text') {
    return (
      <div role="radiogroup" aria-label={beschriftung} className="w-full flex flex-wrap items-baseline justify-center gap-x-7 gap-y-3">
        {werte.map(w => {
          const an = w.id === gewaehlt
          return (
            <button
              key={w.id}
              type="button"
              role="radio"
              aria-checked={an}
              disabled={w.gesperrt}
              onClick={() => onWahl(w.id)}
              onMouseEnter={() => onZeigen?.(w.bild || null)}
              onMouseLeave={() => onZeigen?.(null)}
              onFocus={() => onZeigen?.(w.bild || null)}
              onBlur={() => onZeigen?.(null)}
              className={`group t-text inline-flex items-baseline gap-2 min-h-11 bg-transparent border-0 p-0 transition-colors disabled:opacity-35 ${
                an ? 'c-tinte' : 'c-leise hover:text-black'
              }`}
            >
              <span className={an ? 'underline underline-offset-[7px] decoration-1' : ''}>{w.label}</span>
              {an && <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-current self-center" />}
              {preisText(w.preis) && <span className="t-klein c-leise tabular-nums">{preisText(w.preis)}</span>}
              {w.empfohlen && <Star size={12} strokeWidth={1.4} fill="currentColor" className="c-leise self-center" aria-label="Unsere Empfehlung" />}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div
      role="radiogroup"
      aria-label={beschriftung}
      // Seitwärts nur innerhalb der Fläche. `w-full` ist nötig: In einer
      // zentrierten Spalte wüchse die Reihe sonst auf die Breite aller
      // Muster, und das Telefon zoomte die ganze Seite heraus, um sie zu
      // zeigen. Dann rutschte auch die Leiste am unteren Rand weg.
      className="w-full max-w-full flex gap-3 sm:gap-4 overflow-x-auto py-2 px-1 sm:flex-wrap sm:justify-center sm:overflow-visible snap-x"
      style={{ scrollbarWidth: 'none' }}
    >
      {werte.map(w => {
        const an = w.id === gewaehlt
        return (
          <button
            key={w.id}
            type="button"
            role="radio"
            aria-checked={an}
            aria-label={[w.label, preisText(w.preis)].filter(Boolean).join(', ')}
            title={w.label}
            disabled={w.gesperrt}
            onClick={() => onWahl(w.id)}
            onMouseEnter={() => onZeigen?.(w.bild || null)}
            onMouseLeave={() => onZeigen?.(null)}
            onFocus={() => onZeigen?.(w.bild || null)}
            onBlur={() => onZeigen?.(null)}
            className="snap-start shrink-0 flex flex-col items-center gap-2 bg-transparent border-0 p-0 disabled:opacity-35"
          >
            <span
              className={`relative block w-14 h-14 lg:w-16 lg:h-16 rounded-full overflow-hidden transition-shadow duration-200 ${
                an
                  ? 'shadow-[0_0_0_2px_var(--grund-angebot),0_0_0_3.5px_var(--tinte)]'
                  : 'shadow-[0_0_0_1px_rgba(35,28,23,0.12)] hover:shadow-[0_0_0_2px_var(--grund-angebot),0_0_0_3.5px_rgba(35,28,23,0.35)]'
              }`}
              style={{ backgroundColor: w.hex || '#E2DCD3' }}
            >
              {w.bild && <img src={w.bild} alt="" loading="lazy" className="w-full h-full object-cover" />}
              {an && !w.bild && (
                <Check size={18} strokeWidth={2} className="absolute inset-0 m-auto text-white mix-blend-difference" />
              )}
              {w.empfohlen && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full g-angebot flex items-center justify-center" aria-hidden>
                  <Star size={10} strokeWidth={1.4} fill="currentColor" className="c-leise" />
                </span>
              )}
            </span>
            {(mitNamen || preisText(w.preis)) && (
              <span className="t-klein text-center leading-tight max-w-[5.5rem]">
                {mitNamen && <span className={an ? 'c-tinte' : 'c-leise'}>{w.label}</span>}
                {preisText(w.preis) && <span className="block c-leise tabular-nums">{preisText(w.preis)}</span>}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
