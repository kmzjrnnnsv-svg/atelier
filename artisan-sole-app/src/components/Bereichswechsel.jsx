/**
 * Bereichswechsel — der Weg von einem Bereich in den anderen.
 *
 * Wer sowohl Kunde als auch Affiliate ist, hat zwei Bereiche und braucht
 * zwischen ihnen eine Tür. Vorher gab es keine: Die Anmeldung führte in einen
 * der beiden, und dort blieb man. Ein Affiliate, der selbst ein Paar bestellen
 * wollte, musste sich abmelden und die Adresse von Hand ändern.
 *
 * Zwei Formen, derselbe Inhalt:
 *
 *   • als Liste im Seitenmenü des Ladens — dort ist Platz für den Zusatz,
 *     was einen im jeweiligen Bereich erwartet, und der aktuelle Bereich ist
 *     mit aufgeführt, damit man sieht, wo man steht.
 *   • kompakt in der Kopfzeile des Affiliate-Bereichs — dort ist kein Platz,
 *     also stehen nur die anderen Bereiche als schmale Knöpfe.
 *
 * Ein Konto mit nur einem Bereich sieht nichts davon. Ein Schalter mit einer
 * Stellung ist kein Schalter, sondern eine Behauptung.
 */
import { useNavigate, useLocation } from 'react-router-dom'
import { Store, BadgePercent, Building2, ArrowUpRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { bereicheFuer, aktuellerBereich } from '../lib/bereiche'

const SYMBOL = {
  laden: Store,
  affiliate: BadgePercent,
  firma: Building2,
}

// Adressen auf eine andere Domain müssen den Browser verlassen; der Router
// kennt nur die eigene. Beides sieht gleich aus, verhält sich aber anders.
const istExtern = (pfad) => /^https?:\/\//i.test(pfad)

/**
 * `oeffne` übernimmt das Ansteuern eines Pfades innerhalb der Anwendung.
 *
 * Das Seitenmenü braucht das: Es fährt beim Schließen eine Animation, und
 * gewechselt werden darf erst danach — sonst schiebt sich die neue Seite unter
 * das noch offene Menü. Wer nichts übergibt, bekommt den geraden Weg.
 * Adressen auf eine andere Domain gehen immer direkt; dort endet die
 * Zuständigkeit des Routers.
 */
export default function Bereichswechsel({ kompakt = false, oeffne, className = '' }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const bereiche = bereicheFuer(user)
  if (bereiche.length < 2) return null

  const hier = aktuellerBereich(bereiche, pathname)

  const gehZu = (b) => {
    if (istExtern(b.pfad)) window.location.assign(b.pfad)
    else if (oeffne) oeffne(b.pfad)
    else navigate(b.pfad)
  }

  if (kompakt) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {bereiche.filter(b => b.schluessel !== hier?.schluessel).map(b => {
          const Symbol = SYMBOL[b.schluessel] || ArrowUpRight
          return (
            <button
              key={b.schluessel}
              onClick={() => gehZu(b)}
              className="flex items-center gap-2 h-11 px-2 bg-transparent border-0 text-[11px] text-black/40 hover:text-black/70 uppercase tracking-[0.16em]"
            >
              <Symbol size={14} strokeWidth={1.4} /> {b.name}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className={className}>
      <p className="text-[10px] uppercase tracking-[0.25em] text-black/25 mb-3">Ihre Bereiche</p>
      {bereiche.map(b => {
        const Symbol = SYMBOL[b.schluessel] || ArrowUpRight
        const offen = b.schluessel === hier?.schluessel
        return (
          <button
            key={b.schluessel}
            onClick={() => { if (!offen) gehZu(b) }}
            aria-current={offen ? 'page' : undefined}
            className={`flex w-full items-start gap-3 text-left bg-transparent border-0 py-2.5 group ${offen ? 'cursor-default' : ''}`}
          >
            <Symbol
              size={15} strokeWidth={1.4}
              className={`mt-0.5 flex-shrink-0 ${offen ? 'text-black' : 'text-black/30 group-hover:text-black/60'}`}
            />
            <span className="min-w-0">
              <span className={`block text-[14px] font-light transition-colors ${offen ? 'text-black' : 'text-black/50 group-hover:text-black'}`}>
                {b.name}
                {offen && <span className="text-[11px] text-black/30 ml-2">Sie sind hier</span>}
              </span>
              <span className="block text-[11px] text-black/30 font-light mt-0.5 leading-snug">{b.hinweis}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
