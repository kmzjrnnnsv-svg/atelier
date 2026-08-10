/**
 * Ablauf — nummerierte Schritt-für-Schritt-Erklärung.
 *
 * Vier Stellen erklären, wie etwas läuft: der Bestellvorgang unter der
 * Kollektion, die Firmenseite, der Vermittlerbereich und die beiden
 * Übersichten nach der Anmeldung. Dieselbe Darstellung überall, damit die
 * Erklärung nicht an jeder Stelle anders aussieht und man sie
 * wiedererkennt.
 *
 * Bewusst ohne Aufklapp-Mechanik: Eine Anleitung, die man erst öffnen muss,
 * liest niemand. Sie steht da und ist kurz genug, um sie zu überfliegen.
 */

/**
 * @param {string}  titel     Überschrift, klein und gesperrt gesetzt.
 * @param {string}  [intro]   Ein Satz darüber, worum es geht.
 * @param {Array}   schritte  [{ titel, text }] — die Schritte in ihrer Reihenfolge.
 * @param {string}  [fuss]    Nachsatz, meist eine Einschränkung oder ein Hinweis.
 * @param {boolean} [hell]    Heller Kasten statt weißem Grund.
 */
export default function Ablauf({ titel, intro, schritte = [], fuss, hell = false }) {
  if (!schritte.length) return null

  return (
    <section className={hell ? 'border border-black/[0.06] bg-[#fafaf9] p-6 lg:p-8' : ''}>
      <p className="text-[10px] text-black/35 uppercase tracking-[0.22em] mb-2">{titel}</p>
      {intro && (
        <p className="text-[12px] lg:text-[13px] text-black/50 font-light leading-relaxed max-w-2xl mb-6">
          {intro}
        </p>
      )}

      <ol className="space-y-5 max-w-2xl">
        {schritte.map((s, i) => (
          <li key={s.titel} className="flex gap-4">
            {/* Die Zahl trägt die Reihenfolge — sie ist der eigentliche Inhalt
                der Liste, deshalb steht sie außen und nicht als Aufzählung. */}
            <span
              className="shrink-0 w-6 h-6 border border-black/15 flex items-center justify-center text-[10px] text-black/45 tabular-nums mt-0.5"
              aria-hidden="true"
            >
              {i + 1}
            </span>
            <div>
              <p className="text-[13px] text-black font-normal leading-snug">{s.titel}</p>
              <p className="text-[12px] text-black/50 font-light leading-relaxed mt-1">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>

      {fuss && (
        <p className="text-[11px] text-black/40 font-light leading-relaxed max-w-2xl mt-6 pt-5 border-t border-black/[0.07]">
          {fuss}
        </p>
      )}
    </section>
  )
}
