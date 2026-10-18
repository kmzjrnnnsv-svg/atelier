/**
 * Adressfelder — ein Rahmen, darin die Zeilen, getrennt durch feine Linien.
 *
 * So setzt Stripe seine Kasse, und es hat einen Grund: Sechs einzelne graue
 * Kästen mit Abstand dazwischen sehen aus wie sechs Aufgaben. Ein Block mit
 * Zeilen sieht aus wie eine Anschrift, und das ist es.
 *
 * Jedes Feld trägt sein `autoComplete`, damit Browser und Passwortmanager
 * die Anschrift mit einem Tipp einsetzen. Auf dem Telefon ist das der
 * Unterschied zwischen zehn Sekunden und zwei Minuten.
 */

// Vorschläge für das Land. Ein freies Feld bleibt es trotzdem: Wer nach
// Norwegen liefern lassen will, soll nicht an einer Liste scheitern.
const LAENDER = [
  'Deutschland', 'Österreich', 'Schweiz', 'Belgien', 'Dänemark', 'Frankreich',
  'Italien', 'Liechtenstein', 'Luxemburg', 'Niederlande', 'Polen', 'Schweden',
  'Spanien', 'Tschechien', 'Vereinigtes Königreich',
]

// Ohne Breite: Die setzt jede Zeile selbst. Stand hier `w-full`, gewann es
// gegen `w-24` der Hausnummer, und die Straße schrumpfte auf null.
const feld = 't-feld h-12 px-3.5 bg-white border-0 outline-none placeholder:text-[#5B5148]/55 focus-visible:relative focus-visible:z-10 focus-visible:shadow-[inset_0_0_0_2px_var(--tinte)]'

export default function Adressfelder({ wert, onChange, praefix }) {
  const f = (k, v) => onChange({ ...wert, [k]: v })
  const id = (k) => `${praefix}-${k}`
  return (
    <div className="rounded-md overflow-hidden shadow-[0_0_0_1px_rgba(35,28,23,0.18)] bg-white">
      <label htmlFor={id('name')} className="sr-only">Vollständiger Name</label>
      <input id={id('name')} className={`${feld} w-full`} placeholder="Vor- und Nachname" autoComplete={`${praefix} name`}
        value={wert.name || ''} onChange={e => f('name', e.target.value)} />

      {/* Getrennt, weil sich eine fehlende Hausnummer sonst nicht bemerken
          lässt: In einem gemeinsamen Feld ist „Robert Mayer Straße" ausgefüllt
          und trotzdem unzustellbar. */}
      <div className="flex border-t border-black/[0.12]">
        <label htmlFor={id('street')} className="sr-only">Straße</label>
        <input id={id('street')} className={`${feld} flex-1 min-w-0`} placeholder="Straße" autoComplete={`${praefix} address-line1`}
          value={wert.street || ''} onChange={e => f('street', e.target.value)} />
        <label htmlFor={id('nr')} className="sr-only">Hausnummer</label>
        <input id={id('nr')} className={`${feld} w-20 shrink-0 border-l border-black/[0.12]`} placeholder="Nr." autoComplete={`${praefix} address-line2`}
          value={wert.house_number || ''} onChange={e => f('house_number', e.target.value)} />
      </div>

      <div className="flex border-t border-black/[0.12]">
        <label htmlFor={id('zip')} className="sr-only">Postleitzahl</label>
        <input id={id('zip')} className={`${feld} w-28 shrink-0`} placeholder="PLZ" inputMode="numeric" autoComplete={`${praefix} postal-code`}
          value={wert.zip || ''} onChange={e => f('zip', e.target.value)} />
        <label htmlFor={id('city')} className="sr-only">Ort</label>
        <input id={id('city')} className={`${feld} flex-1 min-w-0 border-l border-black/[0.12]`} placeholder="Ort" autoComplete={`${praefix} address-level2`}
          value={wert.city || ''} onChange={e => f('city', e.target.value)} />
      </div>

      <div className="border-t border-black/[0.12]">
        <label htmlFor={id('country')} className="sr-only">Land</label>
        <input id={id('country')} className={`${feld} w-full`} placeholder="Land" list={id('laender')} autoComplete={`${praefix} country-name`}
          value={wert.country || ''} onChange={e => f('country', e.target.value)} />
        <datalist id={id('laender')}>
          {LAENDER.map(l => <option key={l} value={l} />)}
        </datalist>
      </div>

      <div className="border-t border-black/[0.12]">
        <label htmlFor={id('phone')} className="sr-only">Telefon, freiwillig</label>
        <input id={id('phone')} className={`${feld} w-full`} placeholder="Telefon (freiwillig, für den Versand)" type="tel" autoComplete={`${praefix} tel`}
          value={wert.phone || ''} onChange={e => f('phone', e.target.value)} />
      </div>
    </div>
  )
}
