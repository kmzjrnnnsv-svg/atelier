/**
 * VermittlerBanner.jsx — der Streifen über der Navigation.
 *
 * ── Wozu ─────────────────────────────────────────────────────────────────
 *
 * Wer über eine Empfehlung in den Laden kommt, bringt eine Zusage mit — einen
 * Nachlass oder eine Zugabe. Bisher stand die erst im Warenkorb. Bis dahin
 * sah der Besucher dieselben Preise wie alle anderen und hatte keinen Grund
 * anzunehmen, dass die Empfehlung etwas wert war.
 *
 * Das Vorbild ist der Streifen, den Apple über der Seite zeigt, wenn man aus
 * einem Partnerprogramm kommt: eine Zeile, ganz oben, die sagt, wo man ist
 * und was man dadurch hat. Er schreit nicht, er steht einfach da.
 *
 * ── Zwei Dinge, die er richtig machen muss ───────────────────────────────
 *
 *  1. **Er nennt den Betrag, nicht den Prozentsatz.** Der Nachlass ist
 *     gedeckelt: Zehn Prozent auf ein Paar für 1.450 € wären 145 €, der Topf
 *     des Vermittlers gibt aber nur 34 € her. „10 %" wäre also ein
 *     Versprechen, das die Kasse nicht einlöst. Der Streifen nennt deshalb
 *     die Obergrenze in Euro.
 *
 *  2. **Er lässt sich wieder loswerden.** Der Code wird gespeichert, weil
 *     zwischen Klick und Kauf mehrere Seiten liegen. Etwas, das im Browser
 *     liegt und Preise verändert, muss sichtbar und widerruflich sein — sonst
 *     ist es kein Vorteil, sondern eine Wanze.
 */
import { useState } from 'react'
import { X, Gift, BadgePercent } from 'lucide-react'
import useStore from '../store/store'
import { refVergessen } from '../lib/affiliateCode'
import { alsPreis } from '../lib/vermittlerPreis'

export default function VermittlerBanner() {
  const affiliate = useStore(s => s.affiliate)
  const setzeAffiliate = useStore(s => s.affiliateEntfernen)
  const [weg, setWeg] = useState(false)

  if (!affiliate || weg) return null

  const nachlass = Number(affiliate.customer_discount_pct) || 0
  const deckel = Number(affiliate.discount_cap) || 0
  const zugabe = affiliate.gift_item || null
  if (nachlass <= 0 && !zugabe) return null

  const name = affiliate.display_name

  const entfernen = () => {
    refVergessen()
    setzeAffiliate?.()
    setWeg(true)
  }

  return (
    <div className="w-full bg-[#111] text-white">
      <div className="max-w-[1400px] mx-auto px-5 lg:px-16 py-2 flex items-center gap-3">
        {zugabe
          ? <Gift size={13} strokeWidth={1.4} className="flex-shrink-0 text-white/60" />
          : <BadgePercent size={13} strokeWidth={1.4} className="flex-shrink-0 text-white/60" />}

        <p className="text-[11px] sm:text-[12px] font-light leading-snug flex-1 min-w-0">
          {name
            ? <>Sie sind über <span className="text-white font-normal">{name}</span> hier. </>
            : <>Sie sind über eine Empfehlung hier. </>}
          {zugabe ? (
            <span className="text-white/70">
              Zu Ihrem Paar legen wir <span className="text-white">{zugabe.name}</span> dazu
              {zugabe.price ? <span className="text-white/50"> (Wert {alsPreis(zugabe.price)})</span> : null}.
            </span>
          ) : (
            <span className="text-white/70">
              Sie erhalten <span className="text-white">
                {deckel > 0 ? `bis zu ${alsPreis(deckel)}` : `${nachlass} %`}
              </span> Nachlass auf jedes Paar, die Preise unten sind bereits angepasst.
            </span>
          )}
        </p>

        <button
          onClick={entfernen}
          title="Empfehlung entfernen"
          className="flex-shrink-0 w-7 h-7 flex items-center justify-center bg-transparent border-0 text-white/35 hover:text-white/80 transition-colors"
        >
          <X size={13} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  )
}
