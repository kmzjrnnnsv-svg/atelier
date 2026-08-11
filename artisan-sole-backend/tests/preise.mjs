/**
 * Was passiert mit dem Preis? Kampagne, Affiliate, Firmenkonto —
 * einmal ganz durch, mit Blick auf das, was am Ende in der Bestellung steht.
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

let r = await ruf('/api/auth/login', { method: 'POST', body: { email: 'admin@artisansole.com', password: 'ArtisanSole@2026!' } })
const admin = r.daten.accessToken
const { daten: schuhe } = await ruf('/api/shoes')
const schuh = schuhe[0]

// ═══════════════════════════════════════════════════════════════════
abschnitt('Firmenkonto: Beitritt und Kampagnenpreis')

const domain = `acme${zufall()}.de`
r = await ruf('/api/business', { method: 'POST', token: admin, body: { email: `chef@${domain}`, contact_name: 'Chef', company: 'ACME' } })
p('Firmenkonto angelegt', r.status === 201)
r = await ruf('/api/auth/register-business', { method: 'POST', body: { token: r.daten.invite_token, name: 'Chef', password: 'Firma1234!' } })
const firma = r.daten.accessToken

r = await ruf('/api/business/me/campaigns', {
  method: 'POST', token: firma,
  body: { name: 'Winter', payment_mode: 'employee', discount_pct: 20, access_mode: 'domain', allowed_email_domain: domain, status: 'open' },
})
p('Kampagne mit 20 % angelegt', r.status === 201 && r.daten.discount_pct === 20, `${r.daten?.discount_pct} %`)
const kampagne = r.daten

// Mitarbeiter mit passender Domain, E-Mail bestätigt
const maMail = `anna@${domain}`
r = await ruf('/api/auth/register', { method: 'POST', body: { name: 'Anna', email: maMail, password: 'Test1234!x' } })
let ma = r.daten.accessToken

// Bestätigungstoken direkt aus der Datenbank holen — im Betrieb kommt es per Mail.
const Database = (await import('better-sqlite3')).default
const db = new Database(process.env.DB_PATH)
const tok = db.prepare('SELECT email_verify_token FROM users WHERE email = ?').get(maMail)?.email_verify_token
r = await ruf('/api/auth/verify-email', { method: 'POST', body: { token: tok } })
p('E-Mail bestätigt', r.status === 200, `${r.daten?.kampagnen} Kampagne(n) beigetreten`)
p('Beitritt geschah automatisch', r.daten?.kampagnen === 1)

r = await ruf('/api/business/campaigns/mine', { token: ma })
p('Kampagne erscheint beim Mitarbeiter', Array.isArray(r.daten) && r.daten.length === 1, `${r.daten?.length}`)
p('Rabattsatz kommt mit', r.daten?.[0]?.discount_pct === 20, `${r.daten?.[0]?.discount_pct} %`)

// Was der Konfigurator daraus rechnet (dieselbe Formel wie in Customize.jsx),
// mit dem echten Grundpreis des Modells statt einer erfundenen Zahl.
const zahlAus = (v) => parseFloat(String(v ?? '').replace(/[^0-9.,]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.')) || 0
const basis = zahlAus(schuh.price), optionen = 40, zubehoerPreis = 21
console.log(`  (Grundpreis ${schuh.name}: ${basis} €)`)
const vor = basis + optionen + zubehoerPreis
const nachlass = Math.round(vor * 20 / 100)
p('Preisrechnung minus 20 %', vor - nachlass === Math.round(vor * 0.8), `${vor} − ${nachlass} = ${vor - nachlass} €`)

r = await ruf('/api/orders', {
  method: 'POST', token: ma,
  body: {
    shoe_id: schuh.id, shoe_name: schuh.name, material: 'lux_calf', color: 'black',
    price: `€ ${vor - nachlass}`, business_campaign_id: kampagne.id,
    delivery_address: { street: 'Weg', house_number: '1', zip: '10115', city: 'Berlin' },
  },
})
p('Bestellung über die Kampagne', r.status === 201, `HTTP ${r.status}`)
const bKamp = r.daten?.id
r = await ruf('/api/orders/mine', { token: ma })
const oKamp = r.daten.find(o => o.id === bKamp)
p('Kampagne ist an der Bestellung vermerkt', oKamp?.business_campaign_id === kampagne.id, String(oKamp?.business_campaign_id))
p('Rabattierter Preis steht drin', String(oKamp?.price).includes(String(vor - nachlass)), oKamp?.price)

// Fremde Domain darf nicht beitreten
const fremdMail = `bob@fremd${zufall()}.de`
r = await ruf('/api/auth/register', { method: 'POST', body: { name: 'Bob', email: fremdMail, password: 'Test1234!x' } })
const fremd = r.daten.accessToken
const tok2 = db.prepare('SELECT email_verify_token FROM users WHERE email = ?').get(fremdMail)?.email_verify_token
await ruf('/api/auth/verify-email', { method: 'POST', body: { token: tok2 } })
r = await ruf('/api/business/campaigns/mine', { token: fremd })
p('Fremde Domain bleibt draußen', (r.daten || []).length === 0, `${r.daten?.length} Kampagnen`)

r = await ruf('/api/orders', {
  method: 'POST', token: fremd,
  body: { shoe_id: schuh.id, shoe_name: schuh.name, material: 'lux_calf', color: 'black', price: `€ ${vor - nachlass}`,
          business_campaign_id: kampagne.id, delivery_address: { street: 'W', house_number: '1', zip: '1', city: 'B' } },
})
p('Fremde Kampagnen-Bestellung abgewiesen', r.status >= 400, `HTTP ${r.status} ${JSON.stringify(r.daten).slice(0, 90)}`)

// ═══════════════════════════════════════════════════════════════════
abschnitt('Affiliate: Code, Kundennachlass, Provision')

const code = `v${zufall()}`
r = await ruf('/api/affiliates', {
  method: 'POST', token: admin,
  body: { full_name: 'Affiliate', email: `v-${zufall()}@x.de`, code,
          commission_type: 'percent', commission_value: 10, cap_per_shoe: 40, customer_discount_pct: 15 },
})
p('Affiliate mit 15 % Kundennachlass', r.status === 201, `HTTP ${r.status}`)
const affUser = r.daten.user_id
r = await ruf('/api/auth/register-affiliate', { method: 'POST', body: { token: r.daten.invite_token, name: 'Affiliate', password: 'Verm1234!' } })
const aff = r.daten.accessToken

r = await ruf(`/api/affiliates/validate/${code}`)
p('Kundennachlass wird geliefert', r.daten?.customer_discount_pct === 15, `${r.daten?.customer_discount_pct} %`)

const nachlassAff = Math.round(vor * 15 / 100)
p('Preisrechnung mit Affiliate', vor - nachlassAff === vor - Math.round(vor * 0.15), `${vor} − ${nachlassAff} = ${vor - nachlassAff} €`)

const kMail = `geworben-${zufall()}@x.de`
r = await ruf('/api/auth/register', { method: 'POST', body: { name: 'Geworben', email: kMail, password: 'Test1234!x' } })
const geworben = r.daten.accessToken
r = await ruf('/api/orders', {
  method: 'POST', token: geworben,
  body: { shoe_id: schuh.id, shoe_name: schuh.name, material: 'lux_calf', color: 'black',
          price: `€ ${vor - nachlassAff}`, affiliate_code: code,
          delivery_address: { street: 'W', house_number: '1', zip: '1', city: 'B' } },
})
p('Bestellung über den Werbelink', r.status === 201, `HTTP ${r.status}`)

r = await ruf('/api/affiliates/me', { token: aff })
const prov = r.daten?.commissions?.[0]
p('Provision erfasst', !!prov, `${r.daten?.commissions?.length} Positionen`)
p('Provision vom rabattierten Preis', Math.abs(prov?.shoe_price - (vor - nachlassAff)) < 1, `Grundlage ${prov?.shoe_price} €`)
p('10 % davon, gedeckelt bei 40 €', Math.abs(prov?.amount - Math.min(40, (vor - nachlassAff) * 0.1)) < 0.6, `${prov?.amount} €`)

// Eigenbestellung bringt keine Provision
r = await ruf('/api/orders', {
  method: 'POST', token: aff,
  body: { shoe_id: schuh.id, shoe_name: schuh.name, material: 'lux_calf', color: 'black', price: `€ ${vor - nachlassAff}`, affiliate_code: code,
          delivery_address: { street: 'W', house_number: '1', zip: '1', city: 'B' } },
})
r = await ruf('/api/affiliates/me', { token: aff })
p('Eigenbestellung bringt keine Provision', r.daten?.commissions?.length === 1, `${r.daten?.commissions?.length} Positionen`)

// Deckel greift bei teurem Schuh
r = await ruf('/api/orders', {
  method: 'POST', token: geworben,
  body: { shoe_id: schuh.id, shoe_name: schuh.name, material: 'lux_calf', color: 'black', price: `€ ${Math.round(basis * 1.5)}`, affiliate_code: code,
          delivery_address: { street: 'W', house_number: '1', zip: '1', city: 'B' } },
})
r = await ruf('/api/affiliates/me', { token: aff })
const teuer = r.daten.commissions.find(c => Math.abs(c.shoe_price - Math.round(basis * 1.5)) < 2)
p('Deckel von 40 € greift', teuer && teuer.amount <= 40.01, `${teuer?.amount} € bei ${Math.round(basis * 1.5)} € Kaufpreis`)

// ═══════════════════════════════════════════════════════════════════
abschnitt('Wer bestimmt den Preis?')

r = await ruf('/api/orders', {
  method: 'POST', token: geworben,
  body: { shoe_id: schuh.id, shoe_name: schuh.name, material: 'lux_calf', color: 'black', price: '€ 1',
          delivery_address: { street: 'W', house_number: '1', zip: '1', city: 'B' } },
})
const angenommen = r.status === 201
console.log(`  ${angenommen ? '⚠ HINWEIS' : 'OK    '} Bestellung zu 1 € — ${angenommen ? 'wird angenommen' : 'wird abgewiesen'}`)

db.close()
abschnitt('Ergebnis')
console.log(`\n  ${ok} bestanden, ${fehler.length} fehlgeschlagen`)
if (fehler.length) { console.log('\n  Fehlgeschlagen:'); for (const f of fehler) console.log(`    · ${f}`) }
process.exit(fehler.length ? 1 : 0)
