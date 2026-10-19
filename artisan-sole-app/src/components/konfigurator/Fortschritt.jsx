/**
 * Fortschritt — der Fuß der Spalte auf großen Bildschirmen.
 *
 * Eine Linie aus Abschnitten, einer je Schritt: gefüllt, was erledigt ist,
 * dunkel der aktuelle. Jeder erreichbare Abschnitt lässt sich antippen, damit
 * ersetzt die Linie die Pfeile und die Pille „Alle Schritte" der alten
 * Leiste. Darunter „Zurück" als leises Wort und der eine Knopf, der jetzt
 * dran ist (als `children`).
 */
export default function Fortschritt({ schritte, aktuell, erreichbar, onSprung, onZurueck, onMenue, children }) {
  const nr = Math.max(0, schritte.findIndex(s => s.key === aktuell))
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="t-klein c-leise tabular-nums">
          Schritt {nr + 1} von {schritte.length}
        </span>
        <button
          type="button"
          onClick={onMenue}
          className="t-klein c-leise hover:text-black bg-transparent border-0 p-0 underline-offset-4 hover:underline"
        >
          Alle Schritte
        </button>
      </div>
      <div className="flex gap-1" role="list" aria-label="Schritte">
        {schritte.map((s, i) => {
          const frei = i <= nr || erreichbar(i)
          return (
            <button
              key={s.key}
              type="button"
              role="listitem"
              disabled={!frei}
              onClick={() => onSprung(s.key)}
              aria-label={`${s.titel}${i === nr ? ' (aktuell)' : ''}`}
              aria-current={i === nr ? 'step' : undefined}
              title={s.titel}
              className="group flex-1 h-5 flex items-center bg-transparent border-0 p-0 disabled:cursor-default"
            >
              <span
                className={`block w-full h-[2px] transition-colors duration-300 ${
                  i === nr ? 'bg-[var(--tinte)]'
                    : i < nr || s.fertig ? 'bg-[var(--tinte)] opacity-40 group-hover:opacity-70'
                      : 'bg-black/10'
                }`}
              />
            </button>
          )
        })}
      </div>
      <div className="mt-4 flex items-center gap-5">
        {nr > 0 && (
          <button
            type="button"
            onClick={onZurueck}
            className="t-klein c-leise hover:text-black bg-transparent border-0 p-0 shrink-0"
          >
            Zurück
          </button>
        )}
        {/* Der Knopf füllt die Breite: ein klares Ende der Spalte statt
            eines kleinen Kastens in der Ecke. */}
        <div className="flex-1 flex gap-2 [&>button]:flex-1 [&>button]:justify-center">{children}</div>
      </div>
    </div>
  )
}
