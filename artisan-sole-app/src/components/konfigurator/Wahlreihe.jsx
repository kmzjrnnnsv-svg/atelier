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
 * `ausrichtung="start"` setzt die Reihe linksbündig — in der schmalen Spalte
 * auf großen Bildschirmen steht alles bündig unter dem Namen des Schuhs.
 *
 * Zeigen genügt, Klicken ist nicht nötig: Fährt der Zeiger über ein Muster
 * (oder liegt der Tastaturfokus darauf), steht es groß in der Bühne. Wer
 * vergleicht, will sehen, ohne sich bei jedem Blick festzulegen.
 */
import { Check, Star } from 'lucide-react'

const preisText = (p) => (p > 0 ? `+ € ${Number(p).toLocaleString('de-DE')}` : null)

export default function Wahlreihe({ werte, gewaehlt, onWahl, onZeigen, form = 'rund', mitNamen = false, beschriftung, ausrichtung = 'mitte' }) {
  const links = ausrichtung === 'start'
  if (form === 'text') {
    // Jede Option ein umrandetes Feld. Vorher standen hier nur zwei Wörter,
    // eins unterstrichen — das las sich wie ein Satz oder eine Navigation,
    // nicht wie eine Frage mit zwei Antworten. Bis drei Optionen gleich
    // breit nebeneinander, mehr brechen um.
    const spalten = Math.min(werte.length, 3)
    // Kostet keine Option etwas, sagt „inklusive" unter jeder nichts und
    // kostet nur Höhe.
    const mitPreis = werte.some(w => Number(w.preis) > 0)
    return (
      <div className={`w-full ${links ? '' : 'max-w-md mx-auto'}`}>
        {gewaehlt == null && (
          <p className="t-klein c-leise mb-2.5">Bitte eine Option wählen</p>
        )}
        <div
          role="radiogroup"
          aria-label={beschriftung}
          className="grid gap-2.5"
          style={{ gridTemplateColumns: `repeat(${spalten}, minmax(0, 1fr))` }}
        >
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
                className={`relative px-4 flex ${mitPreis ? 'min-h-14 py-3' : 'min-h-12 py-2.5'} flex-col items-start justify-center text-left bg-transparent transition-colors disabled:opacity-35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  an
                    ? 'border-[1.5px] border-[var(--tinte)]'
                    : 'border border-black/15 hover:border-black/40'
                }`}
              >
                <span className="t-klein c-tinte pr-5 leading-snug">{w.label}</span>
                {/* Nur Optionen mit Preisangabe: Beim Gürtel hat „Nein,
                    danke" keine — „inklusive" wäre dort falsch. */}
                {mitPreis && 'preis' in w && (
                  <span className="t-klein c-leise tabular-nums leading-snug">
                    {preisText(w.preis) || 'inklusive'}
                  </span>
                )}
                {an && (
                  <Check size={14} strokeWidth={2} aria-hidden className="absolute top-2.5 right-2.5 c-tinte" />
                )}
                {w.empfohlen && !an && (
                  <Star size={12} strokeWidth={1.4} fill="currentColor" className="absolute top-3 right-3 c-leise" aria-label="Unsere Empfehlung" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // In der Spalte rechts (großer Bildschirm) und ohne Namen darunter: kleinere
  // Muster, dichter gesetzt. Zwölf Sohlenfarben passen so in zwei Reihen statt
  // drei, und der Schritt muss nicht scrollen.
  const dicht = links && !mitNamen
  return (
    <div
      role="radiogroup"
      aria-label={beschriftung}
      // Seitwärts nur innerhalb der Fläche. `w-full` ist nötig: In einer
      // zentrierten Spalte wüchse die Reihe sonst auf die Breite aller
      // Muster, und das Telefon zoomte die ganze Seite heraus, um sie zu
      // zeigen. Dann rutschte auch die Leiste am unteren Rand weg.
      className={`w-full max-w-full flex overflow-x-auto py-2 px-1 sm:flex-wrap sm:overflow-visible snap-x ${dicht ? 'gap-2.5' : 'gap-3 sm:gap-4'} ${links ? 'sm:justify-start' : 'sm:justify-center'}`}
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
            // Steht der Name schon darunter, legte sich der Tooltip des
            // Browsers nur noch über die Beschriftung der Nachbarn.
            title={mitNamen ? undefined : w.label}
            disabled={w.gesperrt}
            onClick={() => onWahl(w.id)}
            onMouseEnter={() => onZeigen?.(w.bild || null)}
            onMouseLeave={() => onZeigen?.(null)}
            onFocus={() => onZeigen?.(w.bild || null)}
            onBlur={() => onZeigen?.(null)}
            className="snap-start shrink-0 flex flex-col items-center gap-2 bg-transparent border-0 p-0 disabled:opacity-35"
          >
            <span
              className={`relative block rounded-full overflow-hidden transition-shadow duration-200 ${dicht ? 'w-11 h-11' : 'w-14 h-14 lg:w-16 lg:h-16'} ${
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
