/**
 * guertel.mjs — der Gürtel, vom Angebot bis zur Bestellung.
 *
 * ── Was hier auf dem Spiel steht ─────────────────────────────────────────
 *
 * Der Gürtel ist das erste Zubehör, bei dem eine Position mehr trägt als
 * Name und Betrag: fünf Schlüssel, aus denen Preis und Beschreibung erst
 * entstehen. Und er ist das erste, das allein reisen darf.
 *
 * Beides sind Stellen, an denen ein Fehler nicht auffällt, sondern kostet:
 *
 *   • Käme der Preis aus dem Browser, wäre ein Gürtel für 1 € eine Frage von
 *     zwei Zeilen in der Entwicklerkonsole.
 *   • Dürfte der Gürtel allein reisen, ohne dass die Prüfung an ihn gebunden
 *     ist, ginge auch ein Pflegeset für 23 € mit 30 € Porto einzeln hinaus.
 *   • Und stünde er in der Liste des Zurückgebbaren, hätten wir einen auf
 *     Länge geschnittenen Gürtel zurück, den niemand sonst tragen kann.
 *
 * Alle drei prüft dieses Skript gegen den laufenden Server — nichts
 * nachgebaut.
 *
 *   DB_PATH=./pruef.db node tests/guertel.mjs
 */
const BASIS = 'http://localhost:3099'
let ok = 0
const fehler = []
const p = (was, bed, zus = '') => {
  if (bed) { ok++; console.log(`  OK     ${was}${zus ? ' — ' + zus : ''}`) }
  else { fehler.push(was); console.log(`  FEHLER ${was}${zus ? ' — ' + zus : ''}`) }
}
const abschnitt = (t) => console.log(`\n── ${t} ${'─'.repeat(Math.max(0, 58 - t.length))}`)

async function ruf(pfad, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${BASIS}${pfad}`, {
    method,
    headers: {
      'Content-Type': 'application/json', 'X-Requested-With': 'ArtisanSole',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const t = await res.text()
  let daten = null
  try { daten = JSON.parse(t) } catch { daten = t }
  return { status: res.status, daten }
}
const zufall = () => Math.random().toString(36).slice(2, 8)

const ADRESSE = {
  name: 'Test Kunde', street: 'Weg', house_number: '1',
  zip: '10115', city: 'Berlin', country: 'Deutschland',
}

// ════════════════════════════════════════════════════════════════════════
abschnitt('1. Das Angebot')

const { status: st1, daten: angebot } = await ruf('/api/accessories/guertel')
p('Die Gürtelangaben sind öffentlich abrufbar', st1 === 200, `HTTP ${st1}`)
if (st1 !== 200) { console.log('\n  Ohne Angebot ist der Rest gegenstandslos.'); process.exit(1) }

p('Ein Artikel dahinter', !!angebot.artikel?.key, angebot.artikel?.name)
p('Er ist als Gürtel gekennzeichnet', angebot.artikel?.config_kind === 'belt')
p('Eine Beschreibung steht dabei', (angebot.artikel?.description || '').length > 80,
  `${(angebot.artikel?.description || '').length} Zeichen`)

// Zwei Preise, und der zum Paar ist der günstigere. Wäre er es nicht, wäre
// die Zusage im Konfigurator („günstiger zum Paar") schlicht falsch.
p('Zwei Preise', Number(angebot.preis_einzeln) > 0 && Number(angebot.preis_zum_paar) > 0,
  `${angebot.preis_einzeln} € einzeln / ${angebot.preis_zum_paar} € zum Paar`)
p('Zum Paar ist günstiger', Number(angebot.preis_zum_paar) < Number(angebot.preis_einzeln))

p('Formen der Schließe', (angebot.formen || []).length >= 2,
  (angebot.formen || []).map(f => f.label).join(', '))
p('Metalltöne mit Farbwert', (angebot.metalle || []).length >= 2
  && (angebot.metalle || []).every(m => m.color_hex),
  (angebot.metalle || []).map(m => m.label).join(', '))

// 80 bis 180 in Schritten von 5 — die Reihe aus dem Back Office.
const g = angebot.groessen || []
p('21 Längen von 80 bis 180', g.length === 21 && g[0] === 80 && g[20] === 180, `${g.length} Werte`)
p('In Schritten von 5', g.every((v, i) => i === 0 || v - g[i - 1] === 5))

// Ohne Hilfe zur Länge ist die Auswahl eine Zahlenreihe ohne Bedeutung.
p('Eine Hilfe zur Länge liegt bei', (angebot.hilfe?.wege || []).length >= 2,
  (angebot.hilfe?.wege || []).map(w => w.titel).join(' / '))
p('Der Spielraum ist beziffert', Number(angebot.spielraum_cm) > 0, `${angebot.spielraum_cm} cm`)

// ════════════════════════════════════════════════════════════════════════
abschnitt('2. Ein Kunde und ein Paar Schuhe')

const mail = `guertel-${zufall()}@example.de`
let r = await ruf('/api/auth/register', { method: 'POST', body: { name: 'Gürtel Kunde', email: mail, password: 'Test1234!x' } })
const token = r.daten?.accessToken
p('Kunde angelegt', !!token, `HTTP ${r.status}`)

const { daten: schuhe } = await ruf('/api/shoes')
const schuh = (schuhe || []).find(s => s.collection !== 'express') || schuhe[0]
p('Ein Modell im Katalog', !!schuh, schuh?.name)

const form = angebot.formen[0]
const metall = angebot.metalle[0]

// Leder und Farbe wie im Konfigurator: die des Modells.
const { daten: leder } = await ruf(`/api/shoes/${schuh.id}/materials`)
const { daten: alleLeder } = await ruf('/api/materials')
const lederKey = (leder || [])[0] || 'lux_calf'
const lederRow = (alleLeder || []).find(m => m.key === lederKey)
const { daten: alleFarben } = await ruf('/api/colors')
const farbeRow = (alleFarben || []).find(c => {
  const gilt = String(c.applicable_materials || '*')
  return gilt === '*' || gilt.split(',').map(s => s.trim()).includes(lederKey)
})
p('Ein Leder und eine dazu passende Farbe', !!lederRow && !!farbeRow,
  `${lederRow?.label} / ${farbeRow?.name}`)

const konfig = {
  art: 'belt',
  leder: lederKey, farbe: farbeRow.key,
  form: form.key, metall: metall.key, groesse: 100,
}

// Der Gesamtbetrag muss zum Modell passen — dafür gibt es eine eigene
// Prüfung, die vor der des Gürtels greift. Sie ist hier nicht das Thema,
// deshalb steht der Katalogpreis drin.
const schuhPreis = parseFloat(String(schuh.price).replace(/[^0-9.,]/g, '').replace(/\./g, '').replace(',', '.')) || 1000
const bestellung = (extra = {}) => ({
  shoe_id: schuh.id, shoe_name: schuh.name,
  material: lederRow.label, color: farbeRow.hex,
  price: `€ ${schuhPreis + Number(angebot.preis_zum_paar)}`,
  delivery_address: ADRESSE, billing_address: ADRESSE,
  ...extra,
})

// ════════════════════════════════════════════════════════════════════════
abschnitt('3. Der Preis kommt vom Server')

// Der Angriff in seiner einfachsten Form: derselbe Gürtel für einen Euro.
r = await ruf('/api/orders', { method: 'POST', token, body: bestellung({
  accessories: [{ key: angebot.artikel.key, name: 'Gürtel', price: '€ 1', config_kind: 'belt', belt: konfig }],
}) })
p('Ein Gürtel für 1 € wird abgewiesen', r.status === 400, `HTTP ${r.status} ${r.daten?.code || ''}`)
p('Mit dem richtigen Betrag in der Meldung',
  String(r.daten?.error || '').includes(String(angebot.preis_zum_paar)), r.daten?.error?.slice(0, 90))

// Und die Gegenprobe: mit dem richtigen Betrag geht dieselbe Bestellung durch.
r = await ruf('/api/orders', { method: 'POST', token, body: bestellung({
  accessories: [{ key: angebot.artikel.key, name: 'x', price: `€ ${angebot.preis_zum_paar}`, config_kind: 'belt', belt: konfig }],
}) })
p('Mit dem richtigen Betrag geht sie durch', r.status === 201 || r.status === 200, `HTTP ${r.status}`)
const mitSchuh = r.daten

// ════════════════════════════════════════════════════════════════════════
abschnitt('4. Was in der Bestellung steht')

const zeile = (() => {
  let a = []
  try { a = JSON.parse(mitSchuh?.accessories || '[]') } catch { a = [] }
  return a.find(x => x.config_kind === 'belt')
})()
p('Die Position steht in der Bestellung', !!zeile, zeile?.name)
p('Der Name kommt aus dem Bestand, nicht aus dem Aufruf',
  zeile?.name === angebot.artikel.name, `„${zeile?.name}" statt „x"`)
p('Die Konfiguration ist gespeichert', !!zeile?.belt?.leder && !!zeile?.belt?.groesse)
// Der Satz ist das, was Kunde und Werkstatt lesen — er muss dastehen und
// jede der fünf Angaben nennen.
p('Ein Beschreibungssatz liegt dabei', (zeile?.beschreibung || '').length > 30, zeile?.beschreibung)
p('Er nennt Leder, Farbe, Schließe, Metall und Länge', !!zeile?.belt
  && ['leder_label', 'farbe_name', 'form_label', 'metall_label'].every(k => zeile.beschreibung.includes(zeile.belt[k]))
  && zeile.beschreibung.includes(String(zeile.belt.groesse)))
// „Passt von … bis …" ist die Angabe, die eine Zahl erst nützlich macht.
p('Und die Spanne, in der er sitzt', /passt von \d+ bis \d+ cm/.test(zeile?.beschreibung || ''))

// ════════════════════════════════════════════════════════════════════════
abschnitt('5. Unvollständiges wird abgewiesen')

for (const [was, kaputt] of [
  ['ohne Form',   { ...konfig, form: '' }],
  ['ohne Metall', { ...konfig, metall: '' }],
  ['ohne Länge',  { ...konfig, groesse: null }],
  ['ohne Leder',  { ...konfig, leder: '' }],
  ['mit einer Länge, die es nicht gibt', { ...konfig, groesse: 83 }],
  ['mit einem Leder, das es nicht gibt', { ...konfig, leder: 'drachenhaut' }],
]) {
  r = await ruf('/api/orders', { method: 'POST', token, body: bestellung({
    accessories: [{ key: angebot.artikel.key, name: 'x', price: `€ ${angebot.preis_zum_paar}`, config_kind: 'belt', belt: kaputt }],
  }) })
  p(`Ein Gürtel ${was}`, r.status === 400, `HTTP ${r.status} · ${String(r.daten?.error || '').slice(0, 60)}`)
}

// Eine Farbe, die es an diesem Leder nicht gibt: Über die Übernahme vom Schuh
// käme sonst eine Paarung zustande, die der Konfigurator nie angeboten hätte.
const fremdeFarbe = (alleFarben || []).find(c => {
  const gilt = String(c.applicable_materials || '*')
  return gilt !== '*' && !gilt.split(',').map(s => s.trim()).includes(lederKey)
})
if (fremdeFarbe) {
  r = await ruf('/api/orders', { method: 'POST', token, body: bestellung({
    accessories: [{ key: angebot.artikel.key, name: 'x', price: `€ ${angebot.preis_zum_paar}`, config_kind: 'belt',
                    belt: { ...konfig, farbe: fremdeFarbe.key } }],
  }) })
  p('Eine Farbe, die es an diesem Leder nicht gibt', r.status === 400,
    String(r.daten?.error || '').slice(0, 70))
}

// ════════════════════════════════════════════════════════════════════════
abschnitt('6. Allein reisen darf nur, wer es darf')

// Der Gürtel: ja. Das ist die neue Ausnahme.
r = await ruf('/api/orders', { method: 'POST', token, body: {
  shoe_id: null, shoe_name: angebot.artikel.name,
  material: lederRow.label, color: farbeRow.hex,
  price: `€ ${angebot.preis_einzeln}`, delivery_address: ADRESSE, billing_address: ADRESSE,
  accessories: [{ key: angebot.artikel.key, name: 'x', price: `€ ${angebot.preis_einzeln}`, config_kind: 'belt', belt: konfig }],
} })
p('Ein Gürtel geht auch ohne Paar', r.status === 201 || r.status === 200, `HTTP ${r.status}`)
const alleine = r.daten

// Einzeln gilt der volle Preis. Käme hier der Paarpreis durch, wäre der
// Nachlass fürs gemeinsame Paket ein Nachlass für jeden.
r = await ruf('/api/orders', { method: 'POST', token, body: {
  shoe_id: null, shoe_name: 'x', material: lederRow.label, color: farbeRow.hex,
  price: `€ ${angebot.preis_zum_paar}`, delivery_address: ADRESSE, billing_address: ADRESSE,
  accessories: [{ key: angebot.artikel.key, name: 'x', price: `€ ${angebot.preis_zum_paar}`, config_kind: 'belt', belt: konfig }],
} })
p('Allein zum Paarpreis wird abgewiesen', r.status === 400, `HTTP ${r.status}`)

// Das Pflegeset: nein. Die alte Regel gilt unverändert weiter.
const { daten: zubehoer } = await ruf('/api/accessories')
const pflege = (zubehoer || []).find(a => a.key === 'care_kit_leather')
r = await ruf('/api/orders', { method: 'POST', token, body: {
  shoe_id: null, shoe_name: pflege?.name || 'Pflegeset', material: 'Zubehör', color: '#000000',
  price: '€ 24', delivery_address: ADRESSE, billing_address: ADRESSE,
  accessories: [{ key: 'care_kit_leather', name: pflege?.name, price: '€ 24' }],
} })
p('Ein Pflegeset allein wird weiter abgewiesen', r.status === 400 && r.daten?.code === 'ACCESSORY_ONLY',
  `HTTP ${r.status} ${r.daten?.code || ''}`)

// Und gemischt: Der Gürtel zieht das Pflegeset nicht mit hinaus.
r = await ruf('/api/orders', { method: 'POST', token, body: {
  shoe_id: null, shoe_name: 'x', material: 'x', color: '#000000',
  price: '€ 174', delivery_address: ADRESSE, billing_address: ADRESSE,
  accessories: [
    { key: angebot.artikel.key, name: 'x', price: `€ ${angebot.preis_einzeln}`, config_kind: 'belt', belt: konfig },
    { key: 'care_kit_leather', name: pflege?.name, price: '€ 24' },
  ],
} })
p('Der Gürtel zieht kein Pflegeset mit hinaus', r.status === 400 && r.daten?.code === 'ACCESSORY_ONLY',
  `HTTP ${r.status} ${r.daten?.code || ''}`)

// ════════════════════════════════════════════════════════════════════════
abschnitt('7. Die Vorlagen aus eigenen Bestellungen')

const { status: stV, daten: vorlagen } = await ruf('/api/orders/mine/guertel-vorlagen', { token })
p('Vorlagen abrufbar', stV === 200 && Array.isArray(vorlagen), `${vorlagen?.length} Einträge`)
p('Die Schuhbestellung ist dabei', (vorlagen || []).some(v => v.order_id === mitSchuh?.id))
const vorlage = (vorlagen || []).find(v => v.order_id === mitSchuh?.id)
p('Sie nennt das Leder', vorlage?.leder === lederKey, `${vorlage?.leder_label}`)
p('Sie nennt die Farbe', !!vorlage?.farbe, `${vorlage?.farbe_name}`)
p('Und ist als brauchbar markiert', vorlage?.brauchbar === true)
// Die Gürtelbestellung selbst ist keine Vorlage für einen Gürtel.
p('Die Gürtelbestellung steht nicht als Vorlage drin',
  !(vorlagen || []).some(v => v.order_id === alleine?.id))

// Fremde Bestellungen bleiben fremd.
const mail2 = `fremd-${zufall()}@example.de`
const r2 = await ruf('/api/auth/register', { method: 'POST', body: { name: 'Fremd', email: mail2, password: 'Test1234!x' } })
const { daten: fremdeVorlagen } = await ruf('/api/orders/mine/guertel-vorlagen', { token: r2.daten?.accessToken })
p('Ein anderes Konto sieht sie nicht', (fremdeVorlagen || []).length === 0, `${fremdeVorlagen?.length} Einträge`)
p('Ohne Anmeldung gar nichts', (await ruf('/api/orders/mine/guertel-vorlagen')).status === 401)

// ════════════════════════════════════════════════════════════════════════
abschnitt('8. Zurückgeben')

// Ein auf Länge geschnittener Gürtel aus gewähltem Leder ist keine Lagerware.
// Er fällt unter dieselbe Ausnahme wie die Schuhe (§ 312g Abs. 2 Nr. 1 BGB)
// und darf deshalb nicht in der Liste des Zurückgebbaren stehen.
const { daten: rueck } = await ruf('/api/orders/ruecksendungen/meine', { token })
const eintraege = JSON.stringify(rueck || {})
p('Der Gürtel steht nicht unter dem Zurückgebbaren',
  !eintraege.includes(angebot.artikel.name), eintraege.length + ' Zeichen Antwort')

// ════════════════════════════════════════════════════════════════════════
console.log(`\n── Ergebnis ${'─'.repeat(48)}\n`)
console.log(`  ${ok} bestanden, ${fehler.length} fehlgeschlagen`)
if (fehler.length) { console.log('\n  ' + fehler.join('\n  ')); process.exit(1) }
