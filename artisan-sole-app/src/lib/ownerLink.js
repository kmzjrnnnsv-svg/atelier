/**
 * ownerLink.js — der Bestelllink des Inhabers im Browser.
 *
 * ── Warum das nicht der Affiliate-Code ist ────────────────────────────────
 *
 * Es sieht gleich aus: eine Kennung in der Adresse, gemerkt bis zum Kauf.
 * Es wirkt aber anders, und deshalb liegt es getrennt.
 *
 *   Der Affiliate-Code zieht einen PROZENTSATZ vom Katalogpreis ab. Er darf
 *   sich mit anderen Nachlässen messen, es gewinnt der günstigste.
 *
 *   Der Owners Link ERSETZT den Preis. Es gibt keinen Katalogpreis mehr, von
 *   dem etwas abzuziehen wäre, und deshalb auch nichts zu vergleichen.
 *
 * In einen gemeinsamen Speicher gelegt, müsste jede Stelle im Laden fragen
 * „was für eine Art Code ist das denn", und irgendwo würde es jemand
 * vergessen. Zwei Schlüssel, zwei Bedeutungen.
 *
 * ── Zur Frist ─────────────────────────────────────────────────────────────
 *
 * Kürzer als beim Affiliate. Der Werbelink ist eine Empfehlung, die auch nach
 * Wochen noch trägt; dieser Link ist ein Angebot an eine bestimmte Person für
 * ein bestimmtes Paar. Sieben Tage sind großzügig genug für „ich überleg es
 * mir übers Wochenende" und kurz genug, dass er nicht Monate später eine
 * Bestellung verbilligt, an die niemand mehr gedacht hat.
 */
const SCHLUESSEL = 'as_owner'
const FRIST_TAGE = 7

/** Dieselbe Normalisierung wie im Server (normOwnerCode). */
export function ownerAusUrl(search = window.location.search) {
  const roh = new URLSearchParams(search).get('owner')
  if (!roh) return null
  const code = String(roh).trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
  return code.length >= 3 ? code : null
}

export function ownerMerken(code) {
  try {
    localStorage.setItem(SCHLUESSEL, JSON.stringify({ code, seit: Date.now() }))
  } catch { /* privater Modus, dann gilt er nur für diesen Seitenaufruf */ }
}

export function ownerLesen() {
  try {
    const roh = localStorage.getItem(SCHLUESSEL)
    if (!roh) return null
    const { code, seit } = JSON.parse(roh)
    if (!code) return null
    if (Date.now() - (seit || 0) > FRIST_TAGE * 86400000) {
      ownerVergessen()
      return null
    }
    return code
  } catch { return null }
}

export function ownerVergessen() {
  try { localStorage.removeItem(SCHLUESSEL) } catch { /* nichts zu tun */ }
}

/**
 * Der Preis, den dieses Modell über den Link kostet.
 *
 * Gibt `null` zurück, wenn es keinen gibt — und das ist ausdrücklich NICHT
 * dasselbe wie 0. Ein Modell ohne Festpreis kostet den Katalogpreis; ein
 * fehlender Eintrag als „kostenlos" zu lesen wäre der teuerste Fehler, den
 * diese Datei machen könnte.
 */
export function ownerPreisFuer(preise, shoeId) {
  if (!preise || shoeId == null) return null
  const p = preise[String(shoeId)] ?? preise[Number(shoeId)]
  return Number.isFinite(Number(p)) ? Number(p) : null
}

/** „890" → „€ 890", in der Schreibweise des Ladens. */
export function alsPreisText(zahl) {
  return `€ ${Number(zahl).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}
