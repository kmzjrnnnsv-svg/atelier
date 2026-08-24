/**
 * ownerlink.mjs — der Bestelllink des Inhabers.
 *
 * ── Warum das geprüft wird ────────────────────────────────────────────────
 *
 * Hinter diesem Link stehen Preise weit unter dem Katalog. Drei Dinge dürfen
 * deshalb nicht schiefgehen, und keines davon fällt beim Hinsehen auf:
 *
 *   1. Der Link muss nach EINEM Verkauf tot sein. Er wird weitergereicht;
 *      ein Link, der zweimal geht, ist ein Sonderpreis für eine Gruppe.
 *   2. Der Nachfolger muss von allein entstehen. Sonst steht der Inhaber
 *      nach dem ersten Verkauf ohne Link da und merkt es beim zweiten.
 *   3. Ohne Link muss der Katalogpreis gelten. Der Owner-Preis darf nicht
 *      dadurch für alle gelten, dass ihn jemand einmal gesehen hat.
 *
 *     node tests/ownerlink.mjs
 *
 * Braucht keinen DB-Zugriff: Alles, was hier geprüft wird, geht über
 * dieselben Routen wie im Betrieb.
 */
const BASIS = 'http://localhost:3099'
let ok = 0; const fehler = []
const p = (was, b, z = '') => { if (b) { ok++; console.log(`  OK     ${was}${z ? ' — ' + z : ''}`) } else { fehler.push(was); console.log(`  FEHLER ${was}${z ? ' — ' + z : ''}`) } }
const abschnitt = t => console.log(`\n── ${t} ${'─'.repeat(Math.max(0, 56 - t.length))}`)
const zufall = () => Math.random().toString(36).slice(2, 8)

async function ruf(pfad, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${BASIS}${pfad}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'ArtisanSole', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const t = await res.text()
  let d = null; try { d = JSON.parse(t) } catch { d = t }
  return { status: res.status, daten: d }
}

const anmelden = async (name) => {
  // Die Adresse aus dem Namen, aber ohne dessen Leerzeichen: „Otto Owner"
  // ergäbe sonst „Otto Owner-ab12@example.de", und die Registrierung weist
  // das zu Recht ab.
  const mail = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${zufall()}@example.de`
  const r = await ruf('/api/auth/register', { method: 'POST', body: { name, email: mail, password: 'Test1234!x' } })
  if (!r.daten?.accessToken) console.log(`  (Anmeldung für ${name} fehlgeschlagen: HTTP ${r.status})`)
  return { token: r.daten?.accessToken, mail }
}

// ════════════════════════════════════════════════════════════════════════
abschnitt('1. Der Link liegt bereit, ohne dass jemand ihn anlegt')

let r = await ruf('/api/auth/login', { method: 'POST', body: { email: 'admin@artisansole.com', password: 'ArtisanSole@2026!' } })
const admin = r.daten?.accessToken
p('Admin angemeldet', !!admin, `HTTP ${r.status}`)

r = await ruf('/api/owner-links', { token: admin })
p('Bereich abrufbar', r.status === 200, `HTTP ${r.status}`)
const link1 = r.daten?.aktiv
p('Ein gültiger Link steht da', !!link1?.code && link1.status === 'active', link1?.code)

const modelle = r.daten?.modelle || []
const oxford = modelle.find(m => m.name === 'Oxford')
p('Die Modelle stehen mit Katalogpreis dabei', modelle.length > 0 && !!oxford?.katalogpreis,
  `${modelle.length} Modelle, Oxford ${oxford?.katalogpreis}`)
p('Ohne gesetzten Preis bleibt das Feld leer', oxford?.owner_preis == null)

// ════════════════════════════════════════════════════════════════════════
abschnitt('2. Nur der Inhaber sieht den Bereich')

const { token: kunde } = await anmelden('Otto Owner')
r = await ruf('/api/owner-links', { token: kunde })
p('Ein Kunde bekommt ihn nicht', r.status === 403, `HTTP ${r.status}`)
r = await ruf('/api/owner-links/preise', { method: 'PUT', token: kunde, body: { preise: [] } })
p('Und darf erst recht keine Preise setzen', r.status === 403, `HTTP ${r.status}`)

// ════════════════════════════════════════════════════════════════════════
abschnitt('3. Preise setzen')

r = await ruf('/api/owner-links/preise', { method: 'PUT', token: admin, body: { preise: [{ shoe_id: oxford.id, price: 890 }] } })
p('Festpreis gespeichert', r.status === 200 && r.daten?.gesetzt === 1, `gesetzt ${r.daten?.gesetzt}`)

r = await ruf(`/api/owner-links/${link1.code}`)
p('Die öffentliche Auskunft nennt ihn', r.daten?.preise?.[oxford.id] === 890, JSON.stringify(r.daten?.preise))
p('Sie braucht keine Anmeldung', r.status === 200)

// Ein leeres Feld heißt „kein Owner-Preis", nicht „kostenlos". Der
// Unterschied entscheidet, ob ein vergessenes Modell verschenkt wird.
r = await ruf('/api/owner-links/preise', { method: 'PUT', token: admin, body: { preise: [{ shoe_id: oxford.id, price: '' }] } })
p('Ein leeres Feld nimmt den Preis zurück', r.daten?.entfernt === 1, `entfernt ${r.daten?.entfernt}`)
r = await ruf(`/api/owner-links/${link1.code}`)
p('Danach gilt wieder der Katalogpreis', r.daten?.preise?.[oxford.id] === undefined)
await ruf('/api/owner-links/preise', { method: 'PUT', token: admin, body: { preise: [{ shoe_id: oxford.id, price: 890 }] } })

r = await ruf('/api/owner-links/own-gibtsnicht')
p('Ein unbekannter Code wird abgewiesen', r.status === 404 && r.daten?.code === 'UNBEKANNT', r.daten?.code)

// ════════════════════════════════════════════════════════════════════════
abschnitt('4. Ein Paar, ein Link')

const bestellung = (code) => ({
  shoe_id: oxford.id, shoe_name: 'Oxford', material: 'Lux Calf', color: 'Schwarz',
  price: '€ 890', eu_size: '43', accessories: [],
  delivery_address: { name: 'Otto Owner', street: 'Weg 1', zip: '10115', city: 'Berlin', country: 'DE' },
  widerruf_bestaetigt: true, agb_bestaetigt: true,
  ...(code ? { owner_code: code } : {}),
})

r = await ruf('/api/orders', { method: 'POST', token: kunde, body: bestellung(link1.code) })
p('Die Bestellung zum Owner-Preis geht durch', r.status === 201, `HTTP ${r.status} ${r.daten?.error || ''}`)

r = await ruf(`/api/owner-links/${link1.code}`)
p('Der Link ist danach verbraucht', r.status === 404 && r.daten?.code === 'VERBRAUCHT', r.daten?.code)

r = await ruf('/api/orders', { method: 'POST', token: kunde, body: bestellung(link1.code) })
p('Ein zweiter Kauf darüber wird abgewiesen', r.status === 400, `${r.status} ${r.daten?.code || ''}`)

// ════════════════════════════════════════════════════════════════════════
abschnitt('5. Der Nachfolger entsteht von allein')

r = await ruf('/api/owner-links', { token: admin })
const link2 = r.daten?.aktiv
p('Ein neuer Link steht bereit', !!link2?.code && link2.code !== link1.code, `${link1.code} → ${link2?.code}`)
p('Der Verlauf zeigt den Verkauf mit Käufer',
  (r.daten?.verlauf || []).some(v => v.code === link1.code && v.status === 'used' && v.kaeufer),
  r.daten?.verlauf?.[0]?.kaeufer)

const { token: kunde2 } = await anmelden('Zwei Zwei')
r = await ruf('/api/orders', { method: 'POST', token: kunde2, body: bestellung(link2.code) })
p('Neuer Link, anderes Konto, geht durch', r.status === 201, `HTTP ${r.status} ${r.daten?.error || ''}`)

// ════════════════════════════════════════════════════════════════════════
abschnitt('6. Ohne Link gilt der Katalogpreis')

r = await ruf('/api/orders', { method: 'POST', token: kunde, body: bestellung(null) })
p('890 € ohne Link werden abgewiesen', r.status === 400 && r.daten?.code === 'PRICE_MISMATCH', r.daten?.code)

r = await ruf('/api/owner-links', { token: admin })
const link3 = r.daten?.aktiv
r = await ruf('/api/orders', {
  method: 'POST', token: kunde,
  body: { ...bestellung(link3.code), shoe_id: null, shoe_name: 'Zubehör' },
})
p('Der Link greift nicht ohne Paar', r.status === 400, `${r.status} ${r.daten?.code || ''}`)

// ════════════════════════════════════════════════════════════════════════
abschnitt('Ergebnis')
console.log(`\n  ${ok} bestanden, ${fehler.length} fehlgeschlagen`)
if (fehler.length) { for (const f of fehler) console.log('   -', f); process.exit(1) }
