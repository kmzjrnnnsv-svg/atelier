/**
 * nachdemkauf.mjs — alles, was passiert, nachdem der Kunde bestellt hat.
 *
 * Bis vor Kurzem endete die Bestellung mit ihrem Status. Was jetzt dazukam,
 * lässt sich schlecht durch Hinsehen prüfen, weil es an Geld hängt: eine
 * Stornogebühr, die um eine Stufe verrutscht, fällt niemandem auf, bis sie
 * jemanden trifft.
 *
 * Deshalb geht dieses Skript den ganzen Weg ab — bestellen, buchen,
 * versenden, stornieren — über dieselben Routen wie im Betrieb.
 *
 *     DB_PATH=/tmp/pruef.db node tests/nachdemkauf.mjs
 *
 * Der DB-Pfad wird für zwei Dinge gebraucht, die es über HTTP nicht gibt:
 * den Zweitfaktor des Admins (sonst ließe sich keine Zahlung buchen) und den
 * Token zum Zurücksetzen des Passworts (der kommt sonst per Mail).
 */
import Database from 'better-sqlite3'
import crypto from 'crypto'
import { totpSecret, totpGenerate } from '../src/utils/totp.js'

const BASIS = 'http://localhost:3099'
const DB_PATH = process.env.DB_PATH || '/tmp/pruef.db'
let ok = 0
const fehler = []

const p = (was, bedingung, zusatz = '') => {
  if (bedingung) { ok++; console.log(`  OK     ${was}${zusatz ? ' — ' + zusatz : ''}`) }
  else { fehler.push(was); console.log(`  FEHLER ${was}${zusatz ? ' — ' + zusatz : ''}`) }
}
const abschnitt = (t) => console.log(`\n── ${t} ${'─'.repeat(Math.max(0, 58 - t.length))}`)

async function ruf(pfad, { method = 'GET', body, token, mfa, roh } = {}) {
  const res = await fetch(`${BASIS}${pfad}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'ArtisanSole',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(mfa ? { 'X-MFA-Code': mfa } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (roh) return { status: res.status, puffer: Buffer.from(await res.arrayBuffer()) }
  const text = await res.text()
  let daten = null
  try { daten = JSON.parse(text) } catch { daten = text }
  return { status: res.status, daten }
}

const zufall = () => Math.random().toString(36).slice(2, 8)
const db = new Database(DB_PATH)

// ════════════════════════════════════════════════════════════════════════
abschnitt('1. Vorbereitung')

const mail = `nachkauf-${zufall()}@example.de`
let r = await ruf('/api/auth/register', { method: 'POST', body: { name: 'Wanda Probst', email: mail, password: 'Test1234!x' } })
const kunde = r.daten?.accessToken
p('Kunde angelegt', !!kunde, `HTTP ${r.status}`)

r = await ruf('/api/auth/login', { method: 'POST', body: { email: 'admin@artisansole.com', password: 'ArtisanSole@2026!' } })
const admin = r.daten?.accessToken
p('Admin angemeldet', !!admin, `HTTP ${r.status}`)

// Der Zweitfaktor. Ohne ihn lässt sich keine Zahlung buchen — genau so soll
// es sein, aber für die Prüfung brauchen wir einen gültigen Code.
//
// Eingerichtet wird er über die Routen und nicht per Griff in die Datenbank:
// Der Server hält seine eigene Verbindung, und im WAL-Modus sieht er einen
// von außen geschriebenen Wert nicht zuverlässig sofort. Über die Routen ist
// es ohnehin der ehrlichere Weg — so wird der Einrichtungspfad mitgeprüft.
r = await ruf('/api/auth/mfa/setup', { method: 'POST', token: admin })
const geheim = r.daten?.secret
const mfaCode = () => totpGenerate(geheim)
r = await ruf('/api/auth/mfa/confirm', { method: 'POST', token: admin, body: { code: mfaCode() } })
p('Zweitfaktor für den Admin eingerichtet', r.status === 200, `HTTP ${r.status}`)

const { daten: schuhe } = await ruf('/api/shoes')
const modell = schuhe.find(s => !s.express) || schuhe[0]
// „€ 1.450" ist deutsche Schreibweise: Der Punkt trennt Tausender. Ein naives
// parseFloat macht daraus 1,45 — und die Bestellung fliegt mit
// PRICE_MISMATCH heraus, was wie ein Fehler im Server aussieht.
const preis = (m) => Number(String(m.price).replace(/[^0-9,.]/g, '').replace(/\./g, '').replace(',', '.')) || 1450
p('Modell für die Prüfung gewählt', !!modell, `${modell?.name} zu ${preis(modell)} €`)

async function bestelle(m, extra = {}) {
  const res = await ruf('/api/orders', {
    method: 'POST', token: kunde,
    body: {
      shoe_id: m.id, shoe_name: m.name, material: 'Luxe Calf', color: 'Schwarz',
      price: `€ ${preis(m)}`, eu_size: '43', accessories: [],
      delivery_address: { name: 'Wanda Probst', street: 'Musterweg 7', zip: '10115', city: 'Berlin', country: 'DE' },
      ...extra,
    },
  })
  return res
}

// ════════════════════════════════════════════════════════════════════════
abschnitt('2. Der Verlauf — Datum je Stufe')

r = await bestelle(modell, { basket_id: `k-${zufall()}` })
p('Bestellung angelegt', r.status === 201, `HTTP ${r.status} ${r.daten?.error || ''}`)
const bestellung = r.daten
const zweck = bestellung?.verwendungszweck

r = await ruf(`/api/orders/${bestellung.id}/verlauf`, { token: kunde })
p('Verlauf abrufbar', r.status === 200, `HTTP ${r.status}`)
p('Erster Punkt ist gesetzt', (r.daten?.verlauf || []).length >= 1, `${r.daten?.verlauf?.length} Einträge`)
p('Der Eintrag trägt ein Datum', !!r.daten?.verlauf?.[0]?.created_at, r.daten?.verlauf?.[0]?.created_at)
p('Nächster Schritt wird benannt', r.daten?.naechstes === 'Zahlungseingang', r.daten?.naechstes)
p('Die Leiter hat sechs Stufen', (r.daten?.stufen || []).length === 6, `${r.daten?.stufen?.length}`)
p('Noch keine Rechnung', r.daten?.rechnung === null)
p('Noch keine Sendung', r.daten?.sendung === null)

r = await ruf(`/api/orders/${bestellung.id}/verlauf`, { token: admin })
p('Die Verwaltung darf auch hineinsehen', r.status === 200, `HTTP ${r.status}`)

// ════════════════════════════════════════════════════════════════════════
abschnitt('3. Stornostaffel vor der Zahlung')

r = await ruf(`/api/orders/${bestellung.id}/storno`, { token: kunde })
p('Vorschau abrufbar', r.status === 200, `HTTP ${r.status}`)
p('Stornierung ist möglich', r.daten?.moeglich === true)
p('Keine Gebühr vor der Zahlung', r.daten?.gebuehr === 0, `${r.daten?.gebuehr} €`)
p('Nichts zu erstatten, weil nichts gezahlt', r.daten?.erstattung === 0, `${r.daten?.erstattung} €`)

// ════════════════════════════════════════════════════════════════════════
abschnitt('4. Zahlungseingang buchen')

r = await ruf('/api/orders/zahlung/offen', { token: admin })
p('Offene Zahlungen sichtbar', r.status === 200, `HTTP ${r.status}`)
const offen = (r.daten || []).find(k => k.verwendungszweck === zweck)
p('Unser Korb steht in der Liste', !!offen, offen?.verwendungszweck)
p('Die Summe stimmt', Math.abs((offen?.summe || 0) - preis(modell)) < 1, `${offen?.summe} €`)

r = await ruf('/api/orders/zahlung/buchen', {
  method: 'POST', token: admin, body: { verwendungszweck: zweck },
})
p('Ohne Zweitfaktor wird nicht gebucht', r.status === 403, `HTTP ${r.status}`)

r = await ruf('/api/orders/zahlung/buchen', {
  method: 'POST', token: admin, mfa: mfaCode(),
  body: { verwendungszweck: `Ueberweisung ${zweck} vielen Dank` },
})
p('Der Zweck wird im Text gefunden', r.status === 200, `HTTP ${r.status} ${r.daten?.error || ''}`)
p('Der ganze Korb ist gebucht', r.daten?.anzahl >= 1, `${r.daten?.anzahl} Bestellung(en)`)
p('Status steht auf Fertigung', r.daten?.status === 'processing', r.daten?.status)

r = await ruf('/api/orders/zahlung/buchen', {
  method: 'POST', token: admin, mfa: mfaCode(),
  body: { verwendungszweck: 'ATL-19700101-ZZZZZZ' },
})
p('Unbekannter Zweck wird abgewiesen', r.status === 404, `HTTP ${r.status}`)

// ════════════════════════════════════════════════════════════════════════
abschnitt('5. Rechnung')

r = await ruf(`/api/orders/${bestellung.id}/verlauf`, { token: kunde })
const rechnung = r.daten?.rechnung
p('Rechnungsnummer vergeben', !!rechnung?.nummer, rechnung?.nummer)
p('Nummer folgt dem Kreis RE-JJJJ-NNNN', /^RE-\d{4}-\d{4}$/.test(rechnung?.nummer || ''), rechnung?.nummer)

const pdf = await ruf(`/api/orders/${bestellung.id}/rechnung`, { token: kunde, roh: true })
p('Rechnung wird ausgeliefert', pdf.status === 200, `HTTP ${pdf.status}`)
p('Es ist wirklich ein PDF', pdf.puffer?.slice(0, 5).toString() === '%PDF-', pdf.puffer?.slice(0, 8).toString())
p('Am Ende steht die Abschlussmarke', pdf.puffer?.toString('latin1').trimEnd().endsWith('%%EOF'))
const text = pdf.puffer.toString('latin1')
p('Die Bestellnummer steht drauf', text.includes(bestellung.order_ref.slice(0, 12)))
p('Das Wort Rechnung steht drauf', text.includes('Rechnung'))

// Eine zweite Bestellung darf nicht dieselbe Nummer bekommen.
r = await bestelle(modell, { basket_id: `k-${zufall()}` })
const zweite = r.daten
r = await ruf('/api/orders/zahlung/buchen', {
  method: 'POST', token: admin, mfa: mfaCode(), body: { verwendungszweck: zweite.verwendungszweck },
})
const nr2 = db.prepare('SELECT invoice_no FROM orders WHERE id = ?').get(zweite.id)?.invoice_no
p('Die nächste Rechnung bekommt die nächste Nummer', !!nr2 && nr2 !== rechnung.nummer, `${rechnung.nummer} → ${nr2}`)

// ════════════════════════════════════════════════════════════════════════
abschnitt('6. Stornostaffel in der Fertigung')

r = await ruf(`/api/orders/${bestellung.id}/storno`, { token: kunde })
p('In Fertigung greift die Staffel', r.daten?.pct === 50, `${r.daten?.pct} %`)
p('Die Hälfte wird einbehalten', Math.abs(r.daten?.gebuehr - preis(modell) / 2) < 1, `${r.daten?.gebuehr} €`)
p('Die andere Hälfte wird erstattet', Math.abs(r.daten?.erstattung - preis(modell) / 2) < 1, `${r.daten?.erstattung} €`)

// ════════════════════════════════════════════════════════════════════════
abschnitt('7. Sendungsnummer')

r = await ruf(`/api/orders/${bestellung.id}/sendung`, {
  method: 'PATCH', token: admin, body: { tracking_code: '00340434161094042557', carrier: 'dhl' },
})
p('Sendung eingetragen', r.status === 200, `HTTP ${r.status} ${r.daten?.error || ''}`)
p('Der Status springt auf versandt', r.daten?.status === 'shipped', r.daten?.status)
p('Ein Verfolgungslink entsteht', /dhl\.de/.test(r.daten?.sendung?.url || ''), r.daten?.sendung?.url?.slice(0, 60))

r = await ruf(`/api/orders/${bestellung.id}/sendung`, {
  method: 'PATCH', token: admin, body: { tracking_code: '123', carrier: 'nasapost' },
})
p('Unbekannter Zusteller wird abgewiesen', r.status === 400, `HTTP ${r.status}`)

r = await ruf(`/api/orders/${bestellung.id}/verlauf`, { token: kunde })
p('Die Sendung steht im Verlauf', !!r.daten?.sendung?.code, r.daten?.sendung?.code)
p('Der Verlauf ist gewachsen', (r.daten?.verlauf || []).length >= 3, `${r.daten?.verlauf?.length} Einträge`)
p('Nach dem Versand ist kein Storno mehr möglich', r.daten?.storno?.moeglich === false)

// ════════════════════════════════════════════════════════════════════════
abschnitt('8. Der Kunde storniert selbst')

r = await bestelle(modell, { basket_id: `k-${zufall()}` })
const dritte = r.daten
r = await ruf(`/api/orders/${dritte.id}/storno`, {
  method: 'POST', token: kunde, body: { grund: 'Doch die andere Farbe' },
})
p('Stornierung geht durch', r.status === 200, `HTTP ${r.status} ${r.daten?.error || ''}`)
p('Ohne Gebühr, weil noch nicht bezahlt', r.daten?.gebuehr === 0, `${r.daten?.gebuehr} €`)
p('Der Status steht auf storniert', r.daten?.order?.status === 'cancelled', r.daten?.order?.status)
p('Der Grund ist festgehalten', r.daten?.order?.cancel_reason === 'Doch die andere Farbe')

r = await ruf(`/api/orders/${dritte.id}/storno`, { method: 'POST', token: kunde })
p('Zweimal stornieren geht nicht', r.status === 409, `HTTP ${r.status}`)

r = await ruf(`/api/orders/${bestellung.id}`, {
  method: 'PUT', token: admin, body: { status: 'cancelled' },
})
p('Storno über den Statusweg wird abgewiesen', r.status === 400, r.daten?.code)

// Eine fremde Bestellung geht niemanden etwas an.
const fremdMail = `fremd-${zufall()}@example.de`
r = await ruf('/api/auth/register', { method: 'POST', body: { name: 'Fremd', email: fremdMail, password: 'Test1234!x' } })
const fremd = r.daten?.accessToken
r = await ruf(`/api/orders/${bestellung.id}/verlauf`, { token: fremd })
p('Fremder Verlauf bleibt verschlossen', r.status === 403, `HTTP ${r.status}`)
r = await ruf(`/api/orders/${bestellung.id}/storno`, { method: 'POST', token: fremd })
p('Fremde Bestellung lässt sich nicht stornieren', r.status === 403, `HTTP ${r.status}`)

// ════════════════════════════════════════════════════════════════════════
abschnitt('9. Express-Bestand')

const expressModell = schuhe.find(s => s.express)
if (!expressModell) {
  p('Express-Modell vorhanden', false, 'keines im Katalog')
} else {
  db.prepare('UPDATE shoes SET express_stock = 1 WHERE id = ?').run(expressModell.id)
  r = await bestelle(expressModell, { basket_id: `k-${zufall()}` })
  p('Das letzte vorbereitete Paar geht durch', r.status === 201, `HTTP ${r.status} ${r.daten?.error || ''}`)
  const jetzt = db.prepare('SELECT express_stock FROM shoes WHERE id = ?').get(expressModell.id).express_stock
  p('Der Bestand ist abgezogen', jetzt === 0, `${jetzt} Stück`)

  r = await bestelle(expressModell, { basket_id: `k-${zufall()}` })
  p('Das nächste wird abgewiesen', r.status === 409, `HTTP ${r.status} ${r.daten?.code || ''}`)
  p('Mit einer Begründung, die weiterhilft', /Maßanfertigung/.test(r.daten?.error || ''), r.daten?.error?.slice(0, 60))

  db.prepare('UPDATE shoes SET express_stock = NULL WHERE id = ?').run(expressModell.id)
  r = await bestelle(expressModell, { basket_id: `k-${zufall()}` })
  p('Ohne geführten Bestand gilt keine Grenze', r.status === 201, `HTTP ${r.status}`)
}

// ════════════════════════════════════════════════════════════════════════
abschnitt('10. Auswertung und Protokoll')

r = await ruf('/api/auswertung', { token: admin })
p('Auswertung abrufbar', r.status === 200, `HTTP ${r.status}`)
p('Umsatz wird beziffert', typeof r.daten?.kennzahlen?.umsatz === 'number', `${r.daten?.kennzahlen?.umsatz} €`)
p('Nur Bezahltes zählt als Umsatz', r.daten?.kennzahlen?.umsatz > 0 && r.daten.kennzahlen.paare >= 2, `${r.daten?.kennzahlen?.paare} Paare`)
p('Offene Zahlungen stehen getrennt', typeof r.daten?.kennzahlen?.offen === 'number', `${r.daten?.kennzahlen?.offen} €`)
p('Die Monatsreihe hat keine Lücken', (r.daten?.monatlich || []).length === 12, `${r.daten?.monatlich?.length} Monate`)
p('Modelle sind aufgeschlüsselt', (r.daten?.modelle || []).length > 0, `${r.daten?.modelle?.length}`)
p('Express und Maß getrennt ausgewiesen', typeof r.daten?.linien?.anteil === 'number', `${r.daten?.linien?.anteil} % Express`)
p('Stornierungen sind gezählt', r.daten?.kennzahlen?.storniert >= 1, `${r.daten?.kennzahlen?.storniert}`)

r = await ruf('/api/auswertung/protokoll', { token: admin })
p('Protokoll abrufbar', r.status === 200, `HTTP ${r.status}`)
p('Der Storno steht drin', (r.daten || []).some(e => e.action === 'storno'), `${r.daten?.length} Zeilen`)
p('Die Zahlungsbuchung steht drin', (r.daten || []).some(e => e.action === 'zahlung'))
p('Mit Namen des Bearbeiters', (r.daten || []).some(e => !!e.user_name))

r = await ruf('/api/auswertung/protokoll', { token: kunde })
p('Kunden sehen das Protokoll nicht', r.status === 403, `HTTP ${r.status}`)

r = await ruf('/api/auswertung/bestand', { token: admin })
p('Bestandsliste abrufbar', r.status === 200 && Array.isArray(r.daten), `${r.daten?.length} Express-Modelle`)

// ════════════════════════════════════════════════════════════════════════
abschnitt('11. Vermittler: Klicks, Links, Auszahlung')

const affCode = `pruef${zufall()}`
db.prepare(`
  INSERT INTO affiliates (code, status, full_name, email, iban, account_holder)
  VALUES (?, 'active', 'Prüf Vermittler', ?, 'DE02120300000000202051', 'Prüf Vermittler')
`).run(affCode, `aff-${zufall()}@example.de`)

r = await ruf('/api/affiliates/klick', { method: 'POST', body: { code: affCode, target: 'seite' } })
p('Klick wird angenommen', r.status === 200, `HTTP ${r.status}`)
// Zweimal dasselbe Modell: Der Zähler muss hochgehen, nicht eine zweite Zeile
// entstehen. Ohne Herkunft ist beides NULL-verdächtig — genau der Fall, der
// einen UNIQUE-Index in SQLite still unwirksam macht.
const klickSlug = 'heritage-oxford'
await ruf('/api/affiliates/klick', { method: 'POST', body: { code: affCode, target: 'modell', shoe_slug: klickSlug } })
await ruf('/api/affiliates/klick', { method: 'POST', body: { code: affCode, target: 'modell', shoe_slug: klickSlug } })

const affId = db.prepare('SELECT id FROM affiliates WHERE code = ?').get(affCode).id
const geklickt = db.prepare('SELECT COALESCE(SUM(count),0) AS n FROM affiliate_clicks WHERE affiliate_id = ?').get(affId).n
p('Drei Klicks gezählt', geklickt === 3, `${geklickt}`)
p('Gleiche Klicks werden zusammengefasst',
  db.prepare('SELECT COUNT(*) AS n FROM affiliate_clicks WHERE affiliate_id = ?').get(affId).n === 2, 'zwei Zeilen')

r = await ruf('/api/affiliates/klick', { method: 'POST', body: { code: 'gibtesnicht' } })
p('Unbekannter Code meldet keinen Fehler', r.status === 200, `HTTP ${r.status}`)

// Der Vermittler bekommt ein Konto, um seine eigene Seite zu sehen.
const affMail = `vermittler-${zufall()}@example.de`
r = await ruf('/api/auth/register', { method: 'POST', body: { name: 'Prüf Vermittler', email: affMail, password: 'Test1234!x' } })
const affToken = r.daten?.accessToken
db.prepare('UPDATE affiliates SET user_id = (SELECT id FROM users WHERE email = ?) WHERE code = ?').run(affMail, affCode)

r = await ruf('/api/affiliates/me/klicks', { token: affToken })
p('Der Vermittler sieht seine Klicks', r.daten?.gesamt === 3, `${r.daten?.gesamt}`)
p('Und seine Konversion', r.daten?.konversion === 0, `${r.daten?.konversion} %`)
p('Aufgeschlüsselt nach Modell', (r.daten?.modelle || []).length === 1, JSON.stringify(r.daten?.modelle))

r = await ruf('/api/affiliates/me/links', { token: affToken })
p('Fertige Modell-Links', (r.daten?.modelle || []).length > 0, `${r.daten?.modelle?.length} Links`)
const beispielLink = r.daten?.modelle?.[0]?.url || ''
p('Der Code steckt im Link', beispielLink.includes(`ref=${affCode}`), beispielLink)
p('Und der Link zeigt auf das Modell', /^https?:\/\/[^/]+\/schuhe\/[^?]+\?ref=/.test(beispielLink), beispielLink)

r = await ruf('/api/affiliates/me/werbemittel', { token: affToken })
p('Werbemittel abrufbar', r.status === 200 && Array.isArray(r.daten), `${r.daten?.length} Stück`)

r = await ruf('/api/affiliates/me/auszahlung', { method: 'POST', token: affToken })
p('Ohne auszahlbare Provision keine Anforderung', r.status === 400, r.daten?.code)

// Eine auszahlbare Provision unterschieben, um den Weg zu Ende zu gehen.
db.prepare(`
  INSERT INTO affiliate_commissions (affiliate_id, order_id, status, shoe_price, gross_amount, amount, payable_at)
  VALUES (?, ?, 'payable', 1450, 50, 50, datetime('now','-1 day'))
`).run(affId, zweite.id)

r = await ruf('/api/affiliates/me/auszahlung', { method: 'POST', token: affToken })
p('Anforderung wird angenommen', r.status === 200, `HTTP ${r.status} ${r.daten?.error || ''}`)
p('Mit Anzahl und Summe', r.daten?.paare === 1 && r.daten?.summe === 50, `${r.daten?.paare} Paar, ${r.daten?.summe} €`)

r = await ruf('/api/affiliates/me/auszahlung', { method: 'POST', token: affToken })
p('Zweimal anfordern geht nicht', r.status === 409, r.daten?.code)

r = await ruf(`/api/affiliates/${affId}/payout`, {
  method: 'POST', token: admin, body: { include_remainder: true },
})
p('Die Verwaltung zahlt aus', r.status === 201, `HTTP ${r.status} ${r.daten?.error || ''}`)
p('Belegnummer vergeben', /^GS-\d{4}-\d{4}$/.test(r.daten?.document_no || ''), r.daten?.document_no)
const payoutId = r.daten?.id
p('Die Anforderung ist erledigt',
  db.prepare('SELECT payout_requested_at FROM affiliates WHERE id = ?').get(affId).payout_requested_at === null)

const gutschrift = await ruf(`/api/affiliates/me/gutschrift/${payoutId}`, { token: affToken, roh: true })
p('Gutschrift wird ausgeliefert', gutschrift.status === 200, `HTTP ${gutschrift.status}`)
p('Auch sie ist ein PDF', gutschrift.puffer?.slice(0, 5).toString() === '%PDF-')
const gText = gutschrift.puffer.toString('latin1')
p('Das Wort Gutschrift steht drauf', gText.includes('Gutschrift'))
p('Der Hinweis auf § 14 UStG steht drauf', gText.includes('14 Abs. 2 UStG'))

// ════════════════════════════════════════════════════════════════════════
abschnitt('12. Rechnungsangaben')

r = await ruf('/api/settings/firma', { token: admin })
p('Angaben abrufbar', r.status === 200, `HTTP ${r.status}`)
p('Vorgabe ist der Kleinunternehmer', r.daten?.firma_kleinunternehmer === '1', r.daten?.firma_kleinunternehmer)
p('Pflichtangaben werden als fehlend gemeldet', (r.daten?.fehlend || []).length > 0,
  (r.daten?.fehlend || []).map(x => x.feld).join(', '))

const firma = {
  firma_name: 'Artisan Sole GmbH', firma_strasse: 'Musterweg 7',
  firma_ort: '10115 Berlin', firma_land: 'Deutschland',
  firma_email: 'kontakt@artisansole.com', firma_telefon: '+49 30 1234567',
  firma_steuernummer: '', firma_ust_id: '',
  firma_kleinunternehmer: '1', ust_satz: '19',
}

r = await ruf('/api/settings/firma', { method: 'PUT', token: admin, body: firma })
p('Ohne Zweitfaktor wird nicht gespeichert', r.status === 403, `HTTP ${r.status}`)

r = await ruf('/api/settings/firma', { method: 'PUT', token: admin, mfa: mfaCode(), body: firma })
p('Ohne Steuernummer wird abgewiesen', r.status === 400, r.daten?.code)

r = await ruf('/api/settings/firma', {
  method: 'PUT', token: admin, mfa: mfaCode(),
  body: { ...firma, firma_name: '' },
})
p('Ohne Namen wird abgewiesen', r.status === 400, r.daten?.error?.slice(0, 40))

r = await ruf('/api/settings/firma', {
  method: 'PUT', token: admin, mfa: mfaCode(),
  body: { ...firma, firma_steuernummer: '12/345/67890', firma_kleinunternehmer: '0', ust_satz: '0' },
})
p('Steuerausweis ohne Satz wird abgewiesen', r.status === 400, r.daten?.code)

r = await ruf('/api/settings/firma', {
  method: 'PUT', token: admin, mfa: mfaCode(),
  body: { ...firma, firma_steuernummer: '12/345/67890' },
})
p('Vollständige Angaben gehen durch', r.status === 200, `HTTP ${r.status} ${r.daten?.error || ''}`)
p('Nichts fehlt mehr', (r.daten?.fehlend || []).length === 0)

r = await ruf('/api/settings/firma', { method: 'PUT', token: kunde, mfa: mfaCode(), body: firma })
p('Kunden dürfen das nicht', r.status === 403, `HTTP ${r.status}`)

// Der Beleg muss die Angaben jetzt tragen.
const belegKlein = await ruf(`/api/orders/${bestellung.id}/rechnung`, { token: kunde, roh: true })
const bText = belegKlein.puffer.toString('latin1')
p('Der Firmenname steht auf der Rechnung', bText.includes('Artisan Sole GmbH'))
p('Die Anschrift steht darauf', bText.includes('Musterweg 7') && bText.includes('10115 Berlin'))
p('Die Steuernummer steht in der Fußzeile', bText.includes('12/345/67890'))
p('Hinweis auf § 19 UStG', bText.includes('19 UStG'))
p('Kein Steuerausweis', !bText.includes('Umsatzsteuer 19'))

// Umgestellt auf Steuerausweis: Der nächste Beleg rechnet heraus.
await ruf('/api/settings/firma', {
  method: 'PUT', token: admin, mfa: mfaCode(),
  body: { ...firma, firma_steuernummer: '12/345/67890', firma_kleinunternehmer: '0', ust_satz: '19' },
})
const belegUst = await ruf(`/api/orders/${bestellung.id}/rechnung`, { token: kunde, roh: true })
const uText = belegUst.puffer.toString('latin1')
p('Jetzt wird Steuer ausgewiesen', uText.includes('Umsatzsteuer 19'))
p('Mit Nettobetrag', uText.includes('Nettobetrag'))
p('Und ohne den §-19-Hinweis', !uText.includes('19 UStG wird keine'))

// ════════════════════════════════════════════════════════════════════════
abschnitt('13. Passwort vergessen')

r = await ruf('/api/auth/passwort-vergessen', { method: 'POST', body: { email: mail } })
p('Anforderung wird angenommen', r.status === 200, `HTTP ${r.status}`)
const gesetzt = db.prepare('SELECT reset_token_hash FROM users WHERE email = ?').get(mail)?.reset_token_hash
p('Ein Token ist hinterlegt', !!gesetzt)
p('Und zwar nur als Prüfsumme', (gesetzt || '').length === 64, `${gesetzt?.length} Zeichen`)

r = await ruf('/api/auth/passwort-vergessen', { method: 'POST', body: { email: 'niemand@example.invalid' } })
p('Unbekannte Adresse bekommt dieselbe Antwort', r.status === 200 && r.daten?.ok === true, `HTTP ${r.status}`)

// Das Token selbst kommt per Mail; für die Prüfung legen wir eines unter.
const token = crypto.randomBytes(32).toString('hex')
db.prepare(`
  UPDATE users SET reset_token_hash = ?, reset_expires_at = datetime('now', '+1 hour') WHERE email = ?
`).run(crypto.createHash('sha256').update(token).digest('hex'), mail)

r = await ruf('/api/auth/passwort-neu', { method: 'POST', body: { token, password: 'kurz' } })
p('Ein zu schwaches Passwort wird abgewiesen', r.status === 400, r.daten?.error)

r = await ruf('/api/auth/passwort-neu', { method: 'POST', body: { token, password: 'NeuesPasswort9!' } })
p('Das neue Passwort wird gesetzt', r.status === 200, `HTTP ${r.status} ${r.daten?.error || ''}`)

r = await ruf('/api/auth/passwort-neu', { method: 'POST', body: { token, password: 'NochEines9!' } })
p('Dasselbe Token gilt nur einmal', r.status === 400, r.daten?.code)

r = await ruf('/api/auth/login', { method: 'POST', body: { email: mail, password: 'NeuesPasswort9!' } })
p('Anmeldung mit dem neuen Passwort', r.status === 200, `HTTP ${r.status}`)

r = await ruf('/api/auth/login', { method: 'POST', body: { email: mail, password: 'Test1234!x' } })
p('Das alte Passwort gilt nicht mehr', r.status === 401, `HTTP ${r.status}`)

const abgelaufen = crypto.randomBytes(32).toString('hex')
db.prepare(`
  UPDATE users SET reset_token_hash = ?, reset_expires_at = datetime('now', '-1 minute') WHERE email = ?
`).run(crypto.createHash('sha256').update(abgelaufen).digest('hex'), mail)
r = await ruf('/api/auth/passwort-neu', { method: 'POST', body: { token: abgelaufen, password: 'NochEines9!' } })
p('Ein abgelaufenes Token wird abgewiesen', r.status === 400, r.daten?.code)

// ════════════════════════════════════════════════════════════════════════
console.log(`\n── Ergebnis ${'─'.repeat(48)}\n`)
console.log(`  ${ok} bestanden, ${fehler.length} fehlgeschlagen`)
if (fehler.length) {
  console.log('\n  ' + fehler.join('\n  '))
  process.exit(1)
}
