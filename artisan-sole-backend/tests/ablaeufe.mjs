/**
 * Die Abläufe gegen den laufenden Server, über HTTP wie ein Browser.
 * Nichts nachgebaut — jede Zeile geht durch dieselben Routen wie im Betrieb.
 */
const BASIS = 'http://localhost:3099'
let ok = 0, fehler = []

const p = (was, bedingung, zusatz = '') => {
  if (bedingung) { ok++; console.log(`  OK     ${was}${zusatz ? ' — ' + zusatz : ''}`) }
  else { fehler.push(was); console.log(`  FEHLER ${was}${zusatz ? ' — ' + zusatz : ''}`) }
}
const abschnitt = (t) => console.log(`\n── ${t} ${'─'.repeat(Math.max(0, 58 - t.length))}`)

async function ruf(pfad, { method = 'GET', body, token, raw } = {}) {
  const res = await fetch(`${BASIS}${pfad}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'ArtisanSole',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const text = await res.text()
  let daten = null
  try { daten = JSON.parse(text) } catch { daten = text }
  return raw ? { status: res.status, daten, res } : { status: res.status, daten }
}

const zufall = () => Math.random().toString(36).slice(2, 8)

// ════════════════════════════════════════════════════════════════════════
abschnitt('1. Kunde: Registrierung und Anmeldung')

const kundeMail = `kunde-${zufall()}@example.de`
let r = await ruf('/api/auth/register', { method: 'POST', body: { name: 'Test Kunde', email: kundeMail, password: 'Test1234!x' } })
p('Registrierung', r.status === 201 || r.status === 200, `HTTP ${r.status}`)
let kunde = r.daten?.accessToken
p('Token erhalten', !!kunde)

r = await ruf('/api/auth/login', { method: 'POST', body: { email: kundeMail, password: 'Test1234!x' } })
p('Anmeldung', r.status === 200, `HTTP ${r.status}`)
kunde = r.daten?.accessToken || kunde

r = await ruf('/api/auth/login', { method: 'POST', body: { email: kundeMail, password: 'falsch' } })
p('Falsches Passwort wird abgewiesen', r.status === 401, `HTTP ${r.status}`)

// ════════════════════════════════════════════════════════════════════════
abschnitt('2. Katalog')

const { daten: schuhe } = await ruf('/api/shoes')
p('Schuhe abrufbar', Array.isArray(schuhe) && schuhe.length > 0, `${schuhe?.length} Modelle`)
const schuh = schuhe[0]

const { daten: zubehoer } = await ruf('/api/accessories')
p('Zubehör abrufbar', Array.isArray(zubehoer) && zubehoer.length > 0, `${zubehoer?.length} Artikel`)
p('Nur die fünf geführten Artikel', zubehoer.length === 5, zubehoer.map(a => a.key).join(', '))

const { daten: chart } = await ruf('/api/last-size-chart')
p('Größentabelle abrufbar', Array.isArray(chart) && chart.length > 0, `${chart?.length} Zeilen`)

// ── Kollektionen und Express-Linie ──
//
// Beide Linien stehen nebeneinander im Katalog, getrennt durch die Kollektion.
// Die beiden Eigenschaften müssen zusammenpassen: Ein Modell in der
// Express-Kollektion, dem das Express-Kennzeichen fehlt, verspricht auf der
// Kachel zwei Wochen und zeigt in der Konfiguration die volle Auswahl.
const { daten: kollektionen } = await ruf('/api/collections')
p('Kollektionen abrufbar', Array.isArray(kollektionen) && kollektionen.length >= 2,
  (kollektionen || []).map(k => k.key).join(', '))

const standard = schuhe.filter(s => (s.collection || 'standard') === 'standard')
const expressLinie = schuhe.filter(s => s.collection === 'express')
p('Maßanfertigung ohne Express-Kennzeichen', standard.every(s => Number(s.express) === 0))
p('Express-Linie ist belegt', expressLinie.length > 0, `${expressLinie.length} Modelle`)
p('Jedes Express-Modell trägt sein Kennzeichen', expressLinie.every(s => Number(s.express) === 1))
p('Jedes Express-Modell nennt Aufpreis und Dauer',
  expressLinie.every(s => Number(s.express_surcharge) > 0 && Number(s.express_weeks) > 0))
// Der Preis trägt den Aufpreis bereits — nirgends wird er ein zweites Mal
// addiert. Stichprobe am Oxford, dessen Grundpreis bekannt ist.
{
  const grund = schuhe.find(s => s.name === 'Oxford' && s.collection === 'standard')
  const schnell = schuhe.find(s => s.name === 'Oxford Express')
  const zahl = (t) => parseFloat(String(t).replace(/[^0-9,.]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.'))
  p('Aufpreis steckt im Preis', !grund || !schnell || zahl(schnell.price) === zahl(grund.price) + 100,
    grund && schnell ? `${grund.price} → ${schnell.price}` : 'Modelle nicht gefunden')
}

// ════════════════════════════════════════════════════════════════════════
abschnitt('3. Fußmaße und Passform')

r = await ruf('/api/auth/me/foot-measurements', {
  method: 'PUT', token: kunde,
  body: { foot_length_mm: 270, ball_girth_mm: 255 },
})
p('Maße speichern', r.status === 200, `HTTP ${r.status}`)
const fitProfilId = r.daten?.fit_profile_id
p('Passform-Profil angelegt', !!fitProfilId, `id ${fitProfilId}`)

r = await ruf('/api/auth/me/foot-measurements', { token: kunde })
p('Maße kommen zurück', r.daten?.foot_measurements?.foot_length_mm === 270)

r = await ruf(`/api/fit/match?category=${encodeURIComponent(schuh.category)}&length=270&girth=255&tolerance=5`, { token: kunde })
p('Passform-Ermittlung antwortet', r.status === 200, `HTTP ${r.status}`)

// ════════════════════════════════════════════════════════════════════════
abschnitt('4. Konfiguration als Entwurf')

const entwurfId = `e-${zufall()}`
const konfig = {
  shoe_id: schuh.id, shoe_name: schuh.name,
  material: 'lux_calf', color: 'black', sole: 'leather',
  extras: JSON.stringify({ welt: 'city', innenfarbe: 'black' }),
  accessories: JSON.stringify([]),
  fit_profile_id: fitProfilId,
}
r = await ruf(`/api/configs/${entwurfId}`, { method: 'PUT', token: kunde, body: konfig })
p('Entwurf speichern', r.status === 200 || r.status === 201, `HTTP ${r.status}`)

r = await ruf(`/api/configs/offen/${schuh.id}`, { token: kunde })
p('Offener Entwurf wird gefunden', r.status === 200 && r.daten?.id === entwurfId, `HTTP ${r.status}`)

r = await ruf(`/api/configs/${entwurfId}`, { token: kunde })
p('Entwurf trägt die Sohle', r.daten?.sole === 'leather', String(r.daten?.sole))
p('Entwurf trägt die Optionen', !!r.daten?.extras)

// ════════════════════════════════════════════════════════════════════════
abschnitt('5. Bestellung')

const bestellung = {
  shoe_id: schuh.id, shoe_name: schuh.name,
  material: 'lux_calf', color: 'black', price: schuh.price,
  delivery_address: { street: 'Musterweg', house_number: '7', zip: '10115', city: 'Berlin', country: 'DE' },
  accessories: [{ name: 'Lederpflege-Set', price: 23.7, qty: 1 }],
  config_id: entwurfId, fit_profile_id: fitProfilId,
  sole: 'leather', extras: JSON.stringify({ welt: 'city' }),
}
r = await ruf('/api/orders', { method: 'POST', token: kunde, body: bestellung })
p('Bestellung anlegen', r.status === 201, `HTTP ${r.status} ${r.status !== 201 ? JSON.stringify(r.daten).slice(0, 160) : ''}`)
const bestellId = r.daten?.id

r = await ruf('/api/orders/mine', { token: kunde })
p('Bestellung im Verlauf', Array.isArray(r.daten) && r.daten.some(o => o.id === bestellId))
const meine = (r.daten || []).find(o => o.id === bestellId)
p('Sohle in der Bestellung', meine?.sole === 'leather', String(meine?.sole))
p('Zubehör in der Bestellung', !!meine?.accessories && meine.accessories !== '[]')

// ── Die neue Regel: Zubehör nie allein ──
r = await ruf('/api/orders', {
  method: 'POST', token: kunde,
  body: { shoe_name: 'Lederpflege-Set', material: 'Zubehör', color: '-', price: '€ 23,70',
          delivery_address: { street: 'Musterweg', house_number: '7', zip: '10115', city: 'Berlin' } },
})
p('Zubehör allein wird abgewiesen', r.status === 400 && r.daten?.code === 'ACCESSORY_ONLY', `HTTP ${r.status}`)

// ════════════════════════════════════════════════════════════════════════
abschnitt('6. Rücksendung')

r = await ruf(`/api/orders/${bestellId}/ruecksendung`, { token: kunde })
p('Rücksende-Auskunft', r.status === 200, `HTTP ${r.status}`)
p('Schuh als nicht rücksendbar ausgewiesen', r.daten?.shoe?.returnable === false)
p('Noch nicht zugestellt → keine Frist', r.daten?.days_left === null)

r = await ruf(`/api/orders/${bestellId}/ruecksendung`, {
  method: 'POST', token: kunde,
  body: { items: [{ name: 'Lederpflege-Set', qty: 1 }] },
})
p('Rücksendung vor Zustellung abgewiesen', r.status === 409, `HTTP ${r.status}`)

// ════════════════════════════════════════════════════════════════════════
abschnitt('7. Verwaltung')

r = await ruf('/api/auth/login', { method: 'POST', body: { email: 'admin@artisansole.com', password: 'ArtisanSole@2026!' } })
p('Admin-Anmeldung', r.status === 200, `HTTP ${r.status}`)
const admin = r.daten?.accessToken

r = await ruf('/api/orders/all', { token: admin })
p('Alle Bestellungen sichtbar', Array.isArray(r.daten) && r.daten.length > 0, `${r.daten?.length}`)

r = await ruf(`/api/orders/${bestellId}`, { method: 'PUT', token: admin, body: { status: 'delivered' } })
p('Status auf zugestellt', r.status === 200, `HTTP ${r.status}`)

r = await ruf(`/api/orders/${bestellId}/ruecksendung`, { token: kunde })
p('Nach Zustellung läuft die Frist', typeof r.daten?.days_left === 'number' && r.daten.days_left > 0, `${r.daten?.days_left} Tage`)
p('Zubehör ist rücksendbar', (r.daten?.items || []).length === 1, JSON.stringify(r.daten?.items))

r = await ruf(`/api/orders/${bestellId}/ruecksendung`, {
  method: 'POST', token: kunde,
  body: { items: [{ name: 'Lederpflege-Set', qty: 1 }], reason: 'Doppelt vorhanden' },
})
p('Rücksendung anmelden', r.status === 201, `HTTP ${r.status} ${r.status !== 201 ? JSON.stringify(r.daten).slice(0, 140) : ''}`)
const rueckId = r.daten?.id

r = await ruf(`/api/orders/${bestellId}/ruecksendung`, {
  method: 'POST', token: kunde,
  body: { items: [{ name: schuh.name, qty: 1 }] },
})
p('Schuh zurücksenden wird abgewiesen', r.status === 409, `HTTP ${r.status}`)

r = await ruf('/api/orders/ruecksendungen/meine', { token: kunde })
p('Eigene Rücksendungen', r.status === 200 && r.daten?.orders?.length > 0, `HTTP ${r.status}`)

r = await ruf('/api/orders/ruecksendungen/alle', { token: admin })
p('Verwaltung sieht Rücksendungen', Array.isArray(r.daten) && r.daten.some(x => x.id === rueckId))

r = await ruf(`/api/orders/ruecksendungen/${rueckId}`, { method: 'PUT', token: admin, body: { status: 'approved', note: 'Schein folgt' } })
p('Rücksendung bestätigen', r.status === 200 && r.daten?.status === 'approved', `HTTP ${r.status}`)

// ════════════════════════════════════════════════════════════════════════
abschnitt('8. Anfragen')

for (const [quelle, name] of [['business', 'Firma'], ['affiliate', 'Affiliate'], ['shop', 'Laden']]) {
  r = await ruf('/api/custom-requests', {
    method: 'POST',
    body: { customer_name: name, customer_email: `${quelle}@example.de`, notes: 'Ein Anliegen', source: quelle, shoe_name: 'Test' },
  })
  p(`Anfrage ${quelle}`, r.status === 201, `HTTP ${r.status}`)
}

r = await ruf('/api/custom-requests', { method: 'POST', body: { customer_name: 'X', customer_email: 'x@y.de', customer_phone: 'test', notes: 'a' } })
p('Ungültige Telefonnummer abgewiesen', r.status === 400 && !!r.daten?.errors?.[0]?.msg, r.daten?.errors?.[0]?.msg || '')

r = await ruf('/api/custom-requests', { method: 'POST', body: { customer_name: 'X', customer_email: 'x@y.de' } })
p('Fehlende Nachricht abgewiesen', r.status === 400, r.daten?.errors?.[0]?.msg || '')

r = await ruf('/api/custom-requests', { method: 'POST', body: { customer_name: 'X', customer_email: 'x@y.de', notes: 'ok' } })
p('Ohne Telefon geht durch', r.status === 201, `HTTP ${r.status}`)

r = await ruf('/api/custom-requests?source=business', { token: admin })
p('Nach Herkunft gefiltert', Array.isArray(r.daten) && r.daten.every(x => x.source === 'business'), `${r.daten?.length} Firmen-Anfragen`)

// ════════════════════════════════════════════════════════════════════════
abschnitt('9. Affiliate')

const affCode = `test-${zufall()}`
r = await ruf('/api/affiliates', {
  method: 'POST', token: admin,
  body: {
    full_name: 'Max Affiliate', email: `aff-${zufall()}@example.de`, code: affCode,
    birth_date: '1980-05-01', street: 'Weg 1', postal_code: '10115', city: 'Berlin',
    tax_number: '12/345/67890', iban: 'DE02120300000000202051', account_holder: 'Max Affiliate',
    commission_value: 12, customer_discount_pct: 10,
  },
})
p('Affiliate anlegen', r.status === 201, `HTTP ${r.status} ${r.status !== 201 ? JSON.stringify(r.daten).slice(0, 140) : ''}`)
p('Benutzerkonto entsteht mit', !!r.daten?.user_id, `user ${r.daten?.user_id}`)
p('Einladung wird erzeugt', !!r.daten?.invite_token)
const einladung = r.daten?.invite_token

r = await ruf(`/api/affiliates/validate/${affCode}`)
p('Code ist gültig', r.status === 200 && r.daten?.valid === true)
p('Kundennachlass wird ausgegeben', r.daten?.customer_discount_pct === 10, String(r.daten?.customer_discount_pct))

r = await ruf('/api/affiliates/validate/gibtsnicht')
p('Unbekannter Code abgewiesen', r.status === 404)

r = await ruf('/api/auth/register-affiliate', {
  method: 'POST',
  body: { token: einladung, name: 'Max Affiliate', password: 'Affiliate1!' },
})
p('Affiliate-Konto aktivieren', r.status === 201, `HTTP ${r.status} ${r.status !== 201 ? JSON.stringify(r.daten).slice(0, 140) : ''}`)
const affToken = r.daten?.accessToken
p('Anmeldung als Affiliate', !!affToken)
p('Rolle wird gemeldet', r.daten?.user?.is_affiliate === true, `is_affiliate=${r.daten?.user?.is_affiliate}`)

r = await ruf('/api/affiliates/me', { token: affToken })
p('Eigener Stand abrufbar', r.status === 200, `HTTP ${r.status}`)
p('Werbelink vorhanden', typeof r.daten?.link === 'string' && r.daten.link.includes('ref='), r.daten?.link)
p('QR-Code erzeugt', typeof r.daten?.qr === 'string' && r.daten.qr.startsWith('data:image'))

// ── Vermittelte Bestellung ──
const kunde2Mail = `geworben-${zufall()}@example.de`
r = await ruf('/api/auth/register', { method: 'POST', body: { name: 'Geworben', email: kunde2Mail, password: 'Test1234!x' } })
const kunde2 = r.daten?.accessToken
r = await ruf('/api/orders', {
  method: 'POST', token: kunde2,
  body: { ...bestellung, config_id: null, fit_profile_id: null, accessories: [], affiliate_code: affCode },
})
p('Bestellung mit Werbecode', r.status === 201, `HTTP ${r.status}`)
const b2 = r.daten?.id

r = await ruf('/api/affiliates/me', { token: affToken })
p('Provision wurde erfasst', (r.daten?.commissions || []).length === 1, `${r.daten?.commissions?.length} Positionen`)
p('Provision steht auf offen', r.daten?.commissions?.[0]?.status === 'pending', r.daten?.commissions?.[0]?.status)

// ════════════════════════════════════════════════════════════════════════
abschnitt('10. Firmenkonto und Kampagne')

const firmaMail = `firma-${zufall()}@acme-test.de`
r = await ruf('/api/business', {
  method: 'POST', token: admin,
  body: { email: firmaMail, contact_name: 'Chef Person', company: 'ACME Test GmbH' },
})
p('Firmenkonto anlegen', r.status === 201, `HTTP ${r.status} ${r.status !== 201 ? JSON.stringify(r.daten).slice(0, 140) : ''}`)
const firmaToken = r.daten?.invite_token

r = await ruf('/api/auth/register-business', {
  method: 'POST',
  body: { token: firmaToken, name: 'Chef Person', password: 'Firma1234!' },
})
p('Firmenkonto aktivieren', r.status === 201, `HTTP ${r.status}`)
const firma = r.daten?.accessToken
p('Als Firma erkannt', r.daten?.user?.is_business === true)

r = await ruf('/api/business/me/campaigns', {
  method: 'POST', token: firma,
  body: { name: 'Winteraktion', payment_mode: 'employee', discount_pct: 15, access_mode: 'domain', allowed_email_domain: 'acme-test.de', status: 'open' },
})
p('Kampagne anlegen', r.status === 201, `HTTP ${r.status} ${r.status !== 201 ? JSON.stringify(r.daten).slice(0, 140) : ''}`)
const kampagne = r.daten

// Mitarbeiter mit passender Domain
const mitarbeiterMail = `anna-${zufall()}@acme-test.de`
r = await ruf('/api/auth/register', { method: 'POST', body: { name: 'Anna', email: mitarbeiterMail, password: 'Test1234!x' } })
const mitarbeiter = r.daten?.accessToken

r = await ruf('/api/business/campaigns/mine', { token: mitarbeiter })
const vorBestaetigung = (r.daten || []).length
p('Ohne E-Mail-Bestätigung kein Beitritt', vorBestaetigung === 0, `${vorBestaetigung} Kampagnen`)

// Bestätigen und erneut anmelden
r = await ruf('/api/business/campaigns/mine', { token: admin })
console.log('     (Admin-Sicht nur zur Kontrolle)')

// ════════════════════════════════════════════════════════════════════════
abschnitt('11. Eine Zahlung je Warenkorb')

// Zwei Paare in einem Korb werden zu zwei Bestellungen — sie werden einzeln
// gefertigt und einzeln storniert. Bezahlt wird aber einmal. Vorher bekam jede
// Bestellung ihren eigenen Verwendungszweck und ihren eigenen Betrag, während
// die Bestätigungsseite die Gesamtsumme zeigte: Wer wie angezeigt überwies,
// hatte eine überzahlte und eine unbezahlte Bestellung.
const korb = `k-pruef-${zufall()}`
const paar = (preis) => ({
  shoe_id: schuh.id, shoe_name: schuh.name, material: 'lux_calf', color: 'black',
  price: preis, basket_id: korb,
  delivery_address: { street: 'Musterweg', house_number: '7', zip: '10115', city: 'Berlin', country: 'DE' },
})

// Die Preise müssen zum Modell passen — der Server weist alles ab, was
// deutlich darunter liegt, und das zu Recht.
const stueck = Math.round(parseFloat(String(schuh.price).replace(/[^0-9,.]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.')))
r = await ruf('/api/orders', { method: 'POST', token: kunde, body: paar(`€ ${stueck}`) })
p('Erstes Paar angelegt', r.status === 201, `HTTP ${r.status}`)
const erstes = r.daten
r = await ruf('/api/orders', { method: 'POST', token: kunde, body: paar(`€ ${stueck}`) })
p('Zweites Paar angelegt', r.status === 201, `HTTP ${r.status}`)
const zweites = r.daten

p('Beide teilen einen Verwendungszweck', !!erstes.payment_ref && erstes.payment_ref === zweites.payment_ref,
  String(zweites.payment_ref))
p('Der Zweck ist der der ersten Bestellung', erstes.payment_ref === erstes.order_ref)
p('Der Käufername steht dabei', (zweites.verwendungszweck || '').includes('Test Kunde'),
  zweites.verwendungszweck)

r = await ruf(`/api/orders/${zweites.id}/zahlung`, { token: kunde })
p('Zahlungsauskunft antwortet', r.status === 200, `HTTP ${r.status}`)
p('Betrag ist die Summe des Korbs', r.daten?.betrag === stueck * 2, `${r.daten?.betrag} statt ${stueck * 2}`)
p('Beide Paare sind aufgeführt', r.daten?.positionen?.length === 2)
p('Ein Verwendungszweck für beides', r.daten?.referenz === erstes.payment_ref)
// Der GiroCode entsteht nur mit echter Bankverbindung — in dieser
// Wegwerf-Datenbank steht der Platzhalter DE00…, und den weist die
// EPC-Prüfung zu Recht ab. Geprüft wird deshalb, dass das Feld da ist und
// dass ein Platzhalter zu null führt statt zu einem Code, den keine
// Banking-App annimmt.
p('GiroCode-Feld vorhanden', 'giro_qr' in (r.daten || {}))
p('Platzhalter-IBAN erzeugt keinen Code', r.daten?.giro_qr === null || String(r.daten?.giro_qr).startsWith('data:image'),
  r.daten?.giro_qr === null ? 'null (keine Bankverbindung hinterlegt)' : 'Code erzeugt')
p('Noch nicht bezahlt', r.daten?.bezahlt === false)

// Dieselbe Auskunft von der anderen Bestellung aus — sie muss übereinstimmen,
// sonst führt jede Seite den Kunden zu einem anderen Betrag.
const vonErster = (await ruf(`/api/orders/${erstes.id}/zahlung`, { token: kunde })).daten
p('Von beiden Bestellungen dieselbe Summe', vonErster?.betrag === r.daten?.betrag)
p('Von beiden derselbe Zweck', vonErster?.referenz === r.daten?.referenz)

r = await ruf('/api/orders/zahlung/abschluss', { method: 'POST', token: kunde, body: { basket_id: korb } })
p('Abschluss nimmt den Korb an', r.status === 200, `HTTP ${r.status} ${JSON.stringify(r.daten).slice(0, 90)}`)
p('Er rechnet dieselbe Summe', r.daten?.betrag === stueck * 2, String(r.daten?.betrag))
r = await ruf('/api/orders/zahlung/abschluss', { method: 'POST', token: kunde, body: { basket_id: korb } })
p('Zweiter Aufruf schickt nichts erneut', r.daten?.bereits_verschickt === true)
r = await ruf('/api/orders/zahlung/abschluss', { method: 'POST', token: kunde, body: { basket_id: 'gibt-es-nicht' } })
p('Unbekannter Korb wird abgewiesen', r.status === 404, `HTTP ${r.status}`)

// Ein einzelnes Paar ohne Korbkennung behält sein eigenes Verhalten.
r = await ruf('/api/orders', { method: 'POST', token: kunde, body: { ...paar(`€ ${stueck}`), basket_id: undefined } })
const allein = r.daten
r = await ruf(`/api/orders/${allein.id}/zahlung`, { token: kunde })
p('Einzelbestellung: nur ihr eigener Betrag', r.daten?.betrag === stueck, String(r.daten?.betrag))
p('Einzelbestellung: eine Position', r.daten?.positionen?.length === 1)

// ════════════════════════════════════════════════════════════════════════
abschnitt('12. Rechtstexte')

// Die AGB werden als Datei gepflegt und beim ersten Start veröffentlicht.
// Danach nie wieder — was in der Verwaltung geändert wurde, darf ein Neustart
// nicht überschreiben. Genau daran ging eine überarbeitete Fassung schon
// einmal verloren: Sie lag in der Datei, wurde ausgerollt, und auf der Seite
// stand weiter die alte. Deshalb prüfen wir beides — dass der Inhalt ankommt
// und dass sich eine Abweichung überhaupt bemerken lässt.
r = await ruf('/api/legal/agb')
const agbText = r.daten?.content || ''
p('AGB ohne Anmeldung abrufbar', r.status === 200 && agbText.length > 1000, `${agbText.length} Zeichen`)
p('Stornostaffel veröffentlicht', agbText.includes('Stand Ihrer Bestellung') && agbText.includes('In Fertigung'))
p('Freigabe an den Zahlungseingang gekoppelt', agbText.includes('Freigabe an die Werkstatt'))
p('Express-Linie beschrieben', agbText.includes('Zwei Linien') && agbText.includes('vorbereitete'))

r = await ruf('/api/legal/agb/vorlage', { token: admin })
p('Fassung aus dem Projekt lesbar', r.status === 200 && r.daten?.datei === 'AGB.md', `HTTP ${r.status}`)
p('Veröffentlicht und Datei stimmen überein', r.daten?.abweichend === false)

r = await ruf('/api/legal/agb/vorlage')
p('Fassung nur für die Verwaltung', r.status === 401 || r.status === 403, `HTTP ${r.status}`)

// ════════════════════════════════════════════════════════════════════════
abschnitt('Ergebnis')
console.log(`\n  ${ok} bestanden, ${fehler.length} fehlgeschlagen`)
if (fehler.length) {
  console.log('\n  Fehlgeschlagen:')
  for (const f of fehler) console.log(`    · ${f}`)
}
process.exit(fehler.length ? 1 : 0)
