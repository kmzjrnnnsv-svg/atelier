/**
 * Adressen: Straße und Hausnummer getrennt führen — und Altbestand mitnehmen.
 *
 * Bis hierher lag beides in einem Feld („Robert Mayer Straße 29"). Für den
 * Versand ist das riskant: Fehlt die Hausnummer, fällt es niemandem auf, weil
 * das Feld ja ausgefüllt ist. Getrennte Felder lassen sich einzeln prüfen.
 *
 * Bestehende Adressen bleiben lesbar. Beim Öffnen des Formulars wird eine
 * alte Angabe einmal aufgeteilt; beim Anzeigen werden beide Teile wieder
 * zusammengefügt.
 */

/**
 * Trennt eine zusammengeschriebene Anschrift in Straße und Hausnummer.
 * Die Nummer steht im Deutschen hinten und beginnt mit einer Ziffer —
 * „29", „29a", „29-31", „29 a". Alles davor ist der Straßenname.
 */
export function splitStreet(raw) {
  const s = String(raw || '').trim()
  if (!s) return { street: '', house_number: '' }
  const m = s.match(/^(.*?)[\s,]+(\d+\s*[a-zA-Z]?(?:\s*[-/]\s*\d+\s*[a-zA-Z]?)?)$/)
  if (!m) return { street: s, house_number: '' }
  return { street: m[1].trim(), house_number: m[2].replace(/\s+/g, '') }
}

/** Adresse aus der Datenbank für das Formular aufbereiten. */
export function toFormAddress(a) {
  if (!a) return null
  // Schon getrennt gespeichert? Dann nichts anfassen.
  if (a.house_number) return { ...a }
  const { street, house_number } = splitStreet(a.street)
  return { ...a, street, house_number }
}

/** Straße und Hausnummer als eine Zeile, wie sie auf den Umschlag gehört. */
export function streetLine(a) {
  return [a?.street, a?.house_number].filter(Boolean).join(' ').trim()
}

/**
 * Vollständige Anschrift als Textblock. Eine Adresse ohne Postleitzahl ist
 * keine, deshalb werden beide Schreibweisen berücksichtigt: ältere
 * Bestellungen führen zip, neuere postal_code.
 */
export function formatAddress(raw) {
  let a = raw
  if (typeof a === 'string') {
    try { a = JSON.parse(a) } catch { return String(raw ?? '') }
  }
  if (!a || typeof a !== 'object') return String(raw ?? '')
  return [
    [a.first_name, a.last_name].filter(Boolean).join(' ') || a.name,
    streetLine(a),
    [a.postal_code || a.zip, a.city].filter(Boolean).join(' '),
    a.country,
    a.phone,
  ].filter(Boolean).join('\n')
}

/** Pflichtfelder. Die Hausnummer zählt ausdrücklich dazu. */
export function isAddressComplete(a) {
  return !!(a && a.name && a.street && a.house_number && (a.postal_code || a.zip) && a.city && a.country)
}
