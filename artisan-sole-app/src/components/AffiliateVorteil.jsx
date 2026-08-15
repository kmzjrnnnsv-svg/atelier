/**
 * Was der Werbecode dem Kunden bringt — sichtbar, wo er es braucht.
 *
 * Die Zusage wurde bislang nur auf der Einstiegsfolie genannt und danach
 * stillschweigend in den Preis gerechnet. Wer über einen QR-Code aus einem
 * Laden kam, sah im Warenkorb keinen Hinweis mehr darauf, dass ein Pflegeset
 * beiliegt — er musste sich darauf verlassen, dass es schon stimmen wird.
 * Eine Zusage, die man nicht nachlesen kann, ist keine.
 *
 * Deshalb steht sie hier: im Warenkorb, in der Übersicht vor dem Bestellen
 * und, bei einer Zugabe, mit dem Bild des Artikels. Der Ladenpreis ist
 * durchgestrichen — er zeigt den Wert, ohne ihn zu berechnen.
 */
import { Check, Gift, Percent } from 'lucide-react'

export default function AffiliateVorteil({ affiliate, kompakt = false }) {
  if (!affiliate) return null

  const zugabe  = affiliate.gift_item || null
  const rabatt  = Number(affiliate.customer_discount_pct) || 0
  const deckel  = Number(affiliate.discount_cap) || 0
  if (!zugabe && rabatt <= 0) return null

  const code = String(affiliate.code || '').toUpperCase()

  return (
    <div className="border border-black/[0.12] bg-[#faf9f7]">
      <div className="flex items-center gap-2 px-4 pt-3.5">
        {zugabe
          ? <Gift size={12} strokeWidth={1.6} className="text-black/45" />
          : <Percent size={12} strokeWidth={1.6} className="text-black/45" />}
        <p className="text-[10px] uppercase tracking-[0.18em] text-black/35">
          Ihr Vorteil{code ? ` · ${code}` : ''}
        </p>
      </div>

      {zugabe ? (
        <div className="flex items-center gap-3.5 p-4">
          {zugabe.image ? (
            <img
              src={zugabe.image}
              alt={zugabe.name}
              className="w-16 h-16 object-cover flex-shrink-0 bg-white"
            />
          ) : (
            <div className="w-16 h-16 bg-black/[0.04] flex items-center justify-center flex-shrink-0">
              <Gift size={18} strokeWidth={1.2} className="text-black/20" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[14px] text-black leading-tight">{zugabe.name}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-[13px] text-black">Kostenlos</span>
              {zugabe.price && (
                <span className="text-[12px] text-black/30 line-through">{zugabe.price}</span>
              )}
            </div>
            {!kompakt && (
              <p className="text-[10px] text-black/40 font-light mt-1 leading-relaxed">
                Liegt Ihrem Paar bei. Sie müssen nichts hinzufügen.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 p-4">
          <Check size={15} strokeWidth={1.6} className="text-black/55 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[14px] text-black leading-tight">
              {String(rabatt).replace('.', ',')} % auf Ihr Paar
            </p>
            {!kompakt && (
              <p className="text-[10px] text-black/40 font-light mt-1 leading-relaxed">
                Bereits im Preis abgezogen, Sie müssen nichts eingeben.
                {deckel > 0 && ` Höchstens € ${deckel} je Paar.`}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
