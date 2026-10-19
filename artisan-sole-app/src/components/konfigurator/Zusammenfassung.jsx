/**
 * Zusammenfassung — die Leiste am unteren Rand, wie beim Rolex-Konfigurator:
 * Modell, was bisher gewählt ist, der Preis, und rechts der eine Knopf, der
 * jetzt dran ist.
 *
 * Sie steht immer da, auch mitten in der Passform: Der Preis ändert sich mit
 * jeder Wahl, und wer ihn erst am Ende sieht, rechnet die ganze Zeit mit.
 */
export default function Zusammenfassung({ name, zeilen, preis, preisVorher, hinweis, children }) {
  return (
    <div>
      <div className="flex items-center gap-4 sm:gap-8">
        <div className="min-w-0 flex-1">
          <p className="t-text c-tinte truncate">
            <span className="hidden sm:inline">{name} · </span>
            <span className="tabular-nums">
              {preisVorher && <span className="c-leise line-through mr-2">{preisVorher}</span>}
              {preis}
            </span>
          </p>
          {zeilen.length > 0 && (
            <p className="t-klein c-leise truncate">{zeilen.join(' · ')}</p>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {children}
        </div>
      </div>
      {hinweis}
    </div>
  )
}
