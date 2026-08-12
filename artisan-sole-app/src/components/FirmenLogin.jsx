/**
 * Der Firmen-Login auf den Erklärseiten.
 *
 * Solange der Bereich nicht offen ist, führte der Link ins Leere: anmelden,
 * warten, und dann eine Seite, die sagt „noch nicht". Das ist der falsche
 * Zeitpunkt für diese Auskunft. Sie gehört an den Knopf selbst.
 *
 * Deshalb bleibt der Knopf stehen — er zeigt ja, dass es den Bereich gibt —,
 * ist aber sichtbar stillgelegt und nennt den Grund beim Darüberfahren. Am
 * Telefon gibt es kein Darüberfahren: Dort erscheint der Hinweis beim Tippen
 * und verschwindet von selbst wieder.
 *
 * Ist FIRMENBEREICH_OFFEN gesetzt, ist das hier ein gewöhnlicher Link.
 */
import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { LogIn, Clock } from 'lucide-react'
import { FIRMENBEREICH_OFFEN } from '../lib/freigaben'

const HINWEIS = 'Der Firmenbereich öffnet in Kürze. Schreiben Sie uns — wir melden uns, sobald er steht.'

export default function FirmenLogin({ className = '', groesse = 15, children }) {
  const [offen, setOffen] = useState(false)
  const zeitgeber = useRef(null)

  useEffect(() => () => clearTimeout(zeitgeber.current), [])

  if (FIRMENBEREICH_OFFEN) {
    return (
      <Link to="/login" className={className}>
        <LogIn size={groesse} strokeWidth={1.4} /> {children || 'Firmen-Login'}
      </Link>
    )
  }

  // Nach dem Tippen von selbst schließen: Ein Hinweis, der stehen bleibt,
  // verdeckt hinterher die Seite.
  const antippen = () => {
    setOffen(true)
    clearTimeout(zeitgeber.current)
    zeitgeber.current = setTimeout(() => setOffen(false), 4000)
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-disabled="true"
        title={HINWEIS}
        onClick={antippen}
        onMouseEnter={() => setOffen(true)}
        onMouseLeave={() => setOffen(false)}
        onFocus={() => setOffen(true)}
        onBlur={() => setOffen(false)}
        className={`${className} bg-transparent border-0 p-0 cursor-default opacity-45`}
      >
        <Clock size={groesse} strokeWidth={1.4} /> {children || 'Firmen-Login'}
        <span className="text-[9px] tracking-[0.2em] border border-current px-1.5 py-0.5 leading-none">
          Bald
        </span>
      </button>

      {offen && (
        <span
          role="status"
          className="absolute top-[calc(100%+8px)] right-0 z-40 w-[min(19rem,80vw)] bg-stone-900 text-white text-[11px] font-light leading-relaxed normal-case tracking-normal px-3.5 py-2.5 shadow-lg"
        >
          {HINWEIS}
        </span>
      )}
    </span>
  )
}
