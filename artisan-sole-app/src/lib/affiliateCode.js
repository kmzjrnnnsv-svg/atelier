/**
 * affiliateCode.js — der Code aus dem Werbelink eines Affiliates.
 *
 * Der Link lautet artisansole.com/?ref=<code>. Er wurde bislang von niemandem
 * gelesen: Die Adresse funktionierte, der Code fiel unter den Tisch, und weder
 * bekam der Kunde seine zugesagte Kondition noch der Affiliate seine
 * Provision. Diese Datei schließt die Lücke zwischen Link und Bestellung.
 *
 * Der Code wird gemerkt, weil zwischen dem Klick auf den Link und dem Kauf
 * mehrere Seiten liegen — Kollektion, Konfigurator, Warenkorb, Kasse. Ohne
 * Gedächtnis wäre er nach dem ersten Seitenwechsel weg.
 *
 * Gemerkt wird er sichtbar und widerruflich, nicht heimlich: Er steht im
 * Warenkorb, der Käufer sieht ihn und kann ihn entfernen. Das ist auch der
 * Grund für die Frist — ein Code, der ein halbes Jahr im Browser liegt und
 * irgendwann eine Bestellung zugeordnet bekommt, die mit der Empfehlung nichts
 * mehr zu tun hat, wäre keine Vermittlung mehr.
 */
const SCHLUESSEL = 'as_ref'
const FRIST_TAGE = 30

export function refAusUrl(search = window.location.search) {
  const roh = new URLSearchParams(search).get('ref')
  if (!roh) return null
  // Dieselbe Normalisierung wie im Server (routes/affiliates.js normCode),
  // sonst schlägt die Prüfung bei Großschreibung fehl.
  const code = String(roh).trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
  return code.length >= 3 ? code : null
}

export function refMerken(code) {
  try {
    localStorage.setItem(SCHLUESSEL, JSON.stringify({ code, seit: Date.now() }))
  } catch { /* privater Modus — dann gilt er nur für diesen Seitenaufruf */ }
}

export function refLesen() {
  try {
    const roh = localStorage.getItem(SCHLUESSEL)
    if (!roh) return null
    const { code, seit } = JSON.parse(roh)
    if (!code) return null
    if (Date.now() - (seit || 0) > FRIST_TAGE * 86400000) {
      refVergessen()
      return null
    }
    return code
  } catch { return null }
}

export function refVergessen() {
  try { localStorage.removeItem(SCHLUESSEL) } catch { /* nichts zu tun */ }
}

export const REF_FRIST_TAGE = FRIST_TAGE

/**
 * Den Klick melden.
 *
 * Damit ein Vermittler überhaupt beurteilen kann, ob sein Link wirkt: Bisher
 * wurde erst die Bestellung gezählt, und wer nichts verkaufte, erfuhr nicht,
 * ob niemand geklickt hat oder ob alle an der Kasse abgesprungen sind.
 *
 * Je Sitzung und Ziel einmal. React ruft Effekte in der Entwicklung doppelt
 * auf und bei jedem Zurück-Knopf erneut — ohne diese Sperre stünde in der
 * Auswertung ein Vielfaches dessen, was tatsächlich passiert ist.
 *
 * Der Aufruf ist bewusst ohne Anmeldung und ohne Fehlerbehandlung: Ein
 * verlorener Klick ist kein Grund, dem Besucher etwas anzuzeigen.
 */
export function refZaehlen({ code, target = 'seite', shoe_slug = null }) {
  if (!code) return
  const merkmal = `as_klick:${code}:${target}:${shoe_slug || ''}`
  try {
    if (sessionStorage.getItem(merkmal)) return
    sessionStorage.setItem(merkmal, '1')
  } catch { /* privater Modus — dann wird eben je Seitenaufruf gezählt */ }

  fetch('/api/affiliates/klick', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'ArtisanSole' },
    body: JSON.stringify({ code, target, shoe_slug, referrer: document.referrer || null }),
  }).catch(() => { /* still */ })
}
