/**
 * zahlung.js — Überweisungsdaten und GiroCode.
 *
 * ── Warum das hier steht ──────────────────────────────────────────────────
 *
 * Die Bankverbindung stand ausschließlich in der Zahlungs-Mail. Solange die
 * hinausging, fiel das nicht auf; als sie es nicht mehr tat, hatte ein Kunde
 * eine Bestellung im Zustand „Zahlung ausstehend" und keine Möglichkeit
 * herauszufinden, wohin er überweisen soll. Kein Fehler, keine Meldung —
 * einfach eine Bestellung, die nie bezahlt wird.
 *
 * Eine Bestellseite, die den Betrag nennt, aber nicht das Konto, ist keine
 * Rechnung. Deshalb gehören die Daten in die Anwendung, und die Mail wird zur
 * Zugabe statt zur einzigen Quelle.
 *
 * ── GiroCode ──────────────────────────────────────────────────────────────
 *
 * Dazu ein QR-Code nach EPC069-12, dem europäischen Standard, den jede
 * Banking-App in Deutschland liest. Der Kunde scannt ihn, und Empfänger,
 * IBAN, Betrag und Verwendungszweck stehen ausgefüllt im Formular. Das ist
 * nicht nur bequemer als eine Mail — es ist genauer: Der Verwendungszweck
 * ist die Zuordnung zur Bestellung, und abgetippte Verwendungszwecke sind
 * die häufigste Ursache für Zahlungen, die sich nicht zuordnen lassen.
 *
 * Aufbau der Nutzlast (jede Zeile ein Feld, Reihenfolge ist vorgeschrieben):
 *
 *   BCD              Kennung
 *   002              Version 2 — erst ab ihr ist der BIC entbehrlich
 *   1                Zeichensatz UTF-8
 *   SCT              SEPA Credit Transfer
 *   <BIC>            optional in Version 2
 *   <Empfänger>      max. 70 Zeichen
 *   <IBAN>           ohne Leerzeichen
 *   EUR<Betrag>      Punkt als Dezimaltrennzeichen, 0,01 bis 999999999,99
 *   <Zweckcode>      optional, bleibt leer
 *   <Referenz>       strukturiert; entweder diese ODER die nächste Zeile
 *   <Verwendungszweck> unstrukturiert, max. 140 Zeichen
 *   <Hinweis>        optional, bleibt leer
 *
 * Die Fehlerkorrektur muss laut Norm auf Stufe M stehen — nicht kosmetisch:
 * Ein Code, der von einem Bildschirm abfotografiert wird, verliert Kontrast.
 */
import QRCode from 'qrcode'

/** „€ 1.471" → 1471. Preise stehen als Text in der Datenbank. */
export function betragAusText(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  const sauber = String(v ?? '')
    .replace(/[^0-9,.-]/g, '')
    .replace(/\./g, '')      // Tausenderpunkte fallen weg
    .replace(',', '.')       // Komma wird zum Dezimalpunkt
  const n = parseFloat(sauber)
  return Number.isFinite(n) ? n : 0
}

const kuerzen = (s, n) => String(s ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, n)
const ibanEng  = (s) => String(s ?? '').replace(/\s+/g, '').toUpperCase()

/**
 * Die Nutzlast des GiroCodes. Gibt null zurück, wenn Pflichtangaben fehlen —
 * ein QR-Code mit halber Bankverbindung wäre schlimmer als keiner: Die
 * Banking-App füllt aus, was da ist, und der Kunde überweist ins Nichts.
 */
export function epcNutzlast({ empfaenger, iban, bic, betrag, verwendungszweck }) {
  const konto = ibanEng(iban)
  const name  = kuerzen(empfaenger, 70)
  const summe = Math.round(betragAusText(betrag) * 100) / 100

  if (!konto || !name) return null
  // Ein Platzhalter-IBAN aus der Grundeinstellung darf nicht in einen
  // Zahlungscode geraten. Sie ist an den vielen Nullen zu erkennen.
  if (/^DE0{2,}/.test(konto) || konto.length < 15) return null
  if (!(summe > 0) || summe > 999999999.99) return null

  return [
    'BCD',
    '002',
    '1',
    'SCT',
    kuerzen(bic, 11),
    name,
    konto,
    `EUR${summe.toFixed(2)}`,
    '',
    '',
    kuerzen(verwendungszweck, 140),
    '',
  ].join('\n')
}

/** Der GiroCode als Data-URL, oder null, wenn die Angaben nicht reichen. */
export async function giroCode(daten) {
  const nutzlast = epcNutzlast(daten)
  if (!nutzlast) return null
  return QRCode.toDataURL(nutzlast, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 512,
    color: { dark: '#111111', light: '#FFFFFF' },
  }).catch(() => null)
}
