/**
 * OwnerBanner.jsx — der Streifen für den Bestelllink des Inhabers.
 *
 * ── Warum ein eigener Streifen ───────────────────────────────────────────
 *
 * Der Vermittlerstreifen sagt „Sie erhalten bis zu 34 € Nachlass". Hier
 * stimmt kein Wort davon: Es gibt keinen Nachlass, es gibt andere Preise,
 * und es gibt sie für genau ein Paar. Denselben Streifen mit einer
 * Fallunterscheidung zu füttern hätte einen Text ergeben, der beides halb
 * sagt.
 *
 * ── Was er sagen muss ────────────────────────────────────────────────────
 *
 *  1. **Dass es ein Paar ist.** Das ist die Bedingung, und sie fällt sonst
 *     erst an der Kasse auf, nachdem zwei Paare konfiguriert wurden. Der
 *     Server weist das ab; hier steht es vorher.
 *
 *  2. **Dass er sich wieder loswerden lässt.** Wie beim Vermittlercode:
 *     Etwas, das im Browser liegt und Preise verändert, muss sichtbar und
 *     widerruflich sein.
 *
 * Der Code selbst steht bewusst nicht darin. Er ist kein Vorteil zum
 * Vorzeigen, sondern ein Schlüssel — und wer über die Schulter sieht, soll
 * ihn nicht abschreiben können.
 */
import { useState } from 'react'
import { X, KeyRound } from 'lucide-react'
import useStore from '../store/store'

export default function OwnerBanner() {
  const ownerLink = useStore(s => s.ownerLink)
  const ownerEntfernen = useStore(s => s.ownerEntfernen)
  const [weg, setWeg] = useState(false)

  if (!ownerLink || weg) return null

  // Ein Link ohne einen einzigen Festpreis ändert nichts. Ihn anzukündigen
  // wäre ein Versprechen auf Preise, die der Kunde nirgends findet.
  const anzahl = Object.keys(ownerLink.preise || {}).length
  if (!anzahl) return null

  const entfernen = () => { ownerEntfernen?.(); setWeg(true) }

  return (
    <div className="w-full bg-[#1c1917] text-white">
      <div className="max-w-[1400px] mx-auto px-5 lg:px-16 py-2 flex items-center gap-3">
        <KeyRound size={13} strokeWidth={1.4} className="flex-shrink-0 text-white/60" />
        <p className="text-[11px] sm:text-[12px] font-light leading-snug flex-1 min-w-0">
          Sie sind über einen persönlichen Bestelllink hier.{' '}
          <span className="text-white/70">
            Die Preise unten gelten für Sie und sind bereits angepasst. Der Link
            gilt für <span className="text-white">ein Paar</span>; danach verfällt er.
          </span>
        </p>
        <button
          onClick={entfernen}
          title="Bestelllink entfernen"
          className="flex-shrink-0 w-7 h-7 flex items-center justify-center bg-transparent border-0 text-white/35 hover:text-white/80 transition-colors"
        >
          <X size={13} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  )
}
