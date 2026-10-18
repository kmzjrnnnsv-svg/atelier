/**
 * Auswahlkarte — eine Wahl aus mehreren, als Karte mit rundem Punkt.
 *
 * Für Versand und Zahlung. Ein echtes Radio im Inneren, damit Tastatur und
 * Bildschirmleser die Gruppe als Gruppe erkennen; die Karte ist nur, was man
 * sieht. Gewählt bekommt sie einen dunklen Rand, wie bei Stripe.
 */
export default function Auswahlkarte({ name, wert, gewaehlt, onWahl, titel, text, rechts, children }) {
  const an = gewaehlt === wert
  return (
    <label
      className={`block rounded-md bg-white cursor-pointer transition-shadow ${
        an ? 'shadow-[0_0_0_2px_var(--tinte)]' : 'shadow-[0_0_0_1px_rgba(35,28,23,0.18)] hover:shadow-[0_0_0_1px_rgba(35,28,23,0.45)]'
      }`}
    >
      <span className="flex items-start gap-3.5 px-4 py-3.5">
        <input
          type="radio"
          name={name}
          value={wert}
          checked={an}
          onChange={() => onWahl(wert)}
          className="mt-1 w-[18px] h-[18px] shrink-0 accent-[#231C17]"
        />
        <span className="flex-1 min-w-0">
          <span className="block t-feld">{titel}</span>
          {text && <span className="block t-klein c-leise mt-0.5">{text}</span>}
        </span>
        {rechts && <span className="t-feld tabular-nums shrink-0">{rechts}</span>}
      </span>
      {an && children && <span className="block px-4 pb-4 pl-[3.1rem]">{children}</span>}
    </label>
  )
}
