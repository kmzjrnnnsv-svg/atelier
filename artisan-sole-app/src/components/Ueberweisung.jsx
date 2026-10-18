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
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-black/[0.08] last:border-0">
      <span className="t-klein c-leise flex-shrink-0">{label}</span>
      <div className="flex items-center gap-1 min-w-0">
        <span className="t-feld text-right break-all">{wert}</span>
        {kopierbar && (
          <button
            onClick={kopieren}
            aria-label={`${label} kopieren`}
            className="w-9 h-9 flex items-center justify-center bg-transparent border-0 p-0 c-leise hover:text-black flex-shrink-0"
          >
            {kopiert ? <Check size={15} strokeWidth={2} /> : <Copy size={15} strokeWidth={1.5} />}
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
      <div className="rounded-md bg-white shadow-[0_0_0_1px_rgba(35,28,23,0.15)] p-5">
        <p className="t-text c-tinte">{fehler}</p>
      </div>
    )
  }
  if (!daten) {
    return <div className="rounded-md bg-white shadow-[0_0_0_1px_rgba(35,28,23,0.15)] p-5"><p className="t-klein c-leise">Wird geladen …</p></div>
  }

  return (
    <div className="rounded-md bg-white shadow-[0_0_0_1px_rgba(35,28,23,0.15)]">
      <div className="flex items-center gap-2 px-5 pt-5">
        <Landmark size={16} strokeWidth={1.4} className="c-leise" />
        <p className="t-klein c-leise">Überweisung</p>
      </div>

      <div className="px-5 pt-2 pb-1">
        <p className="t-kopf c-tinte tabular-nums">{euro(daten.betrag)}</p>
        <p className="t-klein c-tinte mt-2">
          Deine Schuhe gehen nach Zahlungseingang in die Fertigung. Bitte gib den
          Verwendungszweck genau so an, daran erkennen wir, zu welcher Bestellung deine
          Zahlung gehört.
        </p>
      </div>

      {daten.giro_qr ? (
        <div className="flex flex-col sm:flex-row gap-5 px-5 py-4">
          <div className="flex-shrink-0 self-center sm:self-start">
            <img
              src={daten.giro_qr}
              alt="GiroCode zum Scannen mit der Banking-App"
              className="w-[176px] h-[176px] rounded-md shadow-[0_0_0_1px_rgba(35,28,23,0.12)]"
            />
            <p className="t-klein c-leise text-center mt-2 max-w-[176px]">
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
          <div className="flex items-start gap-2.5 rounded-md bg-[#FBF1E4] shadow-[0_0_0_1px_#C9A46A] p-4 mb-4">
            <AlertTriangle size={16} className="text-[#8A5A12] flex-shrink-0 mt-0.5" strokeWidth={1.6} />
            <p className="t-klein text-[#5C3B0A]">
              Für diese Bestellung liegt uns noch keine vollständige Bankverbindung vor.
              Bitte meld dich kurz bei uns, dann schicken wir sie dir zu.
            </p>
          </div>
          <Zeile label="Betrag" wert={euro(daten.betrag)} />
          <Zeile label="Zweck" wert={daten.referenz} />
        </div>
      )}
    </div>
  )
}
