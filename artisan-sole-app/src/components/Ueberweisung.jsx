/**
 * Ueberweisung — wohin der Kunde überweist.
 *
 * Diese Angaben standen ausschließlich in der Zahlungs-Mail. Ging sie nicht
 * hinaus, sah der Kunde eine Bestellung im Zustand „Zahlung ausstehend" und
 * hatte keine Möglichkeit zu erfahren, wohin er überweisen soll. Keine
 * Fehlermeldung, kein Hinweis — einfach eine Bestellung, die nie bezahlt
 * wird. Eine Seite, die den Betrag nennt, aber nicht das Konto, ist keine
 * Rechnung.
 *
 * Der GiroCode ist dabei nicht die Zugabe, sondern der Hauptweg: Wer ihn mit
 * seiner Banking-App scannt, bekommt Empfänger, IBAN, Betrag und
 * Verwendungszweck ausgefüllt. Abgetippte Verwendungszwecke sind der
 * häufigste Grund für Zahlungen, die sich keiner Bestellung zuordnen lassen —
 * und jede solche Zahlung kostet Sie einen Vorgang und den Kunden Wartezeit.
 *
 * Darunter dieselben Angaben zum Ablesen, jede einzeln kopierbar. Am Rechner
 * gibt es keine Banking-App zum Scannen.
 */
import { useState, useEffect } from 'react'
import { Copy, Check, Landmark, AlertTriangle } from 'lucide-react'
import { apiFetch } from '../hooks/useApi'

const euro = (n) => `€ ${Number(n || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** IBAN in Vierergruppen — so steht sie auf jedem Kontoauszug. */
const ibanLesbar = (s) => String(s || '').replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim()

function Zeile({ label, wert, kopierbar = true }) {
  const [kopiert, setKopiert] = useState(false)
  if (!wert) return null
  const kopieren = async () => {
    try {
      await navigator.clipboard.writeText(String(wert).replace(/\s+/g, ' ').trim())
      setKopiert(true)
      setTimeout(() => setKopiert(false), 1600)
    } catch { /* ohne Zwischenablage bleibt das Ablesen */ }
  }
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-black/[0.05] last:border-0">
      <span className="text-[10px] uppercase tracking-[0.14em] text-black/35 pt-0.5 flex-shrink-0">{label}</span>
      <div className="flex items-start gap-2 min-w-0">
        <span className="text-[13px] text-black text-right break-all">{wert}</span>
        {kopierbar && (
          <button
            onClick={kopieren}
            aria-label={`${label} kopieren`}
            className="bg-transparent border-0 p-0 text-black/25 hover:text-black flex-shrink-0 mt-0.5"
          >
            {kopiert ? <Check size={12} strokeWidth={2} /> : <Copy size={12} strokeWidth={1.5} />}
          </button>
        )}
      </div>
    </div>
  )
}

export default function Ueberweisung({ orderId }) {
  const [daten, setDaten] = useState(null)
  const [fehler, setFehler] = useState(null)

  useEffect(() => {
    let abgebrochen = false
    apiFetch(`/api/orders/${orderId}/zahlung`)
      .then(d => { if (!abgebrochen) setDaten(d) })
      .catch(e => { if (!abgebrochen) setFehler(e?.error || 'Zahlungsdaten konnten nicht geladen werden.') })
    return () => { abgebrochen = true }
  }, [orderId])

  if (fehler) {
    return (
      <div className="border border-black/10 p-5">
        <p className="text-[12px] text-black/55 font-light leading-relaxed">{fehler}</p>
      </div>
    )
  }
  if (!daten) {
    return <div className="border border-black/10 p-5"><p className="text-[12px] text-black/30">Wird geladen…</p></div>
  }

  return (
    <div className="border border-black/12">
      <div className="flex items-center gap-2 px-5 pt-4">
        <Landmark size={13} strokeWidth={1.5} className="text-black/45" />
        <p className="text-[10px] uppercase tracking-[0.2em] text-black/35">Überweisung</p>
      </div>

      <div className="px-5 pt-3 pb-1">
        <p className="text-[22px] font-extralight tracking-tight text-black">{euro(daten.betrag)}</p>
        <p className="text-[11px] text-black/45 font-light mt-1 leading-relaxed">
          Ihre Schuhe gehen nach Zahlungseingang in die Fertigung. Bitte geben Sie den
          Verwendungszweck genau so an, daran erkennen wir, zu welcher Bestellung Ihre
          Zahlung gehört.
        </p>
      </div>

      {daten.giro_qr ? (
        <div className="flex flex-col sm:flex-row gap-5 px-5 py-4">
          <div className="flex-shrink-0 self-center sm:self-start">
            <img
              src={daten.giro_qr}
              alt="GiroCode zum Scannen mit der Banking-App"
              className="w-[168px] h-[168px] border border-black/[0.07]"
            />
            <p className="text-[10px] text-black/35 font-light text-center mt-1.5 leading-relaxed max-w-[168px]">
              Mit der Banking-App scannen, alles ausgefüllt.
            </p>
          </div>
          <div className="flex-1 min-w-0">
            <Zeile label="Empfänger" wert={daten.empfaenger} />
            <Zeile label="IBAN" wert={ibanLesbar(daten.iban)} />
            <Zeile label="BIC" wert={daten.bic} />
            <Zeile label="Betrag" wert={euro(daten.betrag)} />
            <Zeile label="Zweck" wert={daten.referenz} />
          </div>
        </div>
      ) : (
        <div className="px-5 py-4">
          {/* Ohne vollständige Bankverbindung keinen Code zeigen, der ins Leere
              führt. Die Banking-App füllt aus, was im Code steht — auch eine
              halbe Bankverbindung. */}
          <div className="flex items-start gap-2 border border-amber-300 bg-amber-50 p-3 mb-4">
            <AlertTriangle size={13} className="text-amber-600 flex-shrink-0 mt-0.5" strokeWidth={1.6} />
            <p className="text-[11px] text-amber-900 font-light leading-relaxed">
              Für diese Bestellung liegt uns noch keine vollständige Bankverbindung vor.
              Bitte melden Sie sich kurz bei uns, dann schicken wir sie Ihnen zu.
            </p>
          </div>
          <Zeile label="Betrag" wert={euro(daten.betrag)} />
          <Zeile label="Zweck" wert={daten.referenz} />
        </div>
      )}
    </div>
  )
}
