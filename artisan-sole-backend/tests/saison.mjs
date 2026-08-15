/**
 * saison.mjs — die drei Rubriken des Ladens.
 *
 * ── Was hier auf dem Spiel steht ─────────────────────────────────────────
 *
 * Die Saison ist ab jetzt die EINZIGE Ordnung, die ein Kunde sieht. Fehlt
 * sie an einem Modell, liegt dieses Modell unter keiner Rubrik — es ist im
 * Laden schlicht nicht zu finden, ohne dass irgendwo ein Fehler erscheint.
 * Das ist die Sorte Mangel, die niemand meldet: Der Kunde sucht kurz und
 * geht dann woandershin.
 *
 * Geprüft wird deshalb vor allem Vollständigkeit — jedes Modell hat eine —
 * und dass die Regel das trifft, was der Betreiber vorgegeben hat: Stiefel
 * in den Winter, Mokassins und Walks in den Sommer, alles andere ins ganze
 * Jahr.
 *
 * Und die Gegenrichtung: dass eine im CMS gesetzte Saison NICHT vom
 * nächsten Serverstart überschrieben wird. Ein ungefütterter Sommerstiefel
 * ist ein Sommerschuh, und das weiß nur, wer ihn gebaut hat.
 *
 *   DB_PATH=./pruef.db node tests/saison.mjs
 */
import { saisonFuerKategorie, SAISONS, SAISON_KEYS, istSaison } from '../src/utils/saison.js'

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

// ════════════════════════════════════════════════════════════════════════
abschnitt('1. Die Regel')

p('Drei Rubriken', SAISONS.length === 3, SAISONS.map(s => s.label).join(', '))
p('Die Schlüssel sind summer, winter, all',
  SAISON_KEYS.slice().sort().join(',') === 'all,summer,winter', SAISON_KEYS.join(', '))

for (const [kat, soll] of [
  ['BOOT', 'winter'], ['CHELSEA', 'winter'], ['CHUKKA', 'winter'],
  ['JODHPUR', 'winter'], ['BALMORAL', 'winter'], ['WELLINGTON', 'winter'],
  ['MOCCASIN', 'summer'], ['MOC_SPORT', 'summer'], ['MOC_SPORT_BOOT', 'summer'],
  ['SNEAKER', 'summer'], ['LACELESS_TRAINER', 'summer'],
  ['OXFORD', 'all'], ['DERBY', 'all'], ['LOAFER', 'all'], ['DOUBLE_MONK', 'all'],
]) {
  p(`${kat} → ${soll}`, saisonFuerKategorie(kat) === soll, saisonFuerKategorie(kat))
}
// Eine Machart, die es noch nicht gibt, darf nicht ins Leere fallen.
p('Unbekannte Machart geht ins ganze Jahr', saisonFuerKategorie('IRGENDWAS') === 'all')
p('Ohne Angabe ebenso', saisonFuerKategorie(null) === 'all')
p('istSaison erkennt nur die drei',
  istSaison('winter') && !istSaison('herbst') && !istSaison('') && !istSaison(null))

// ════════════════════════════════════════════════════════════════════════
abschnitt('2. Jedes Modell hat eine')

const { daten: schuhe } = await ruf('/api/shoes')
p('Katalog abrufbar', Array.isArray(schuhe) && schuhe.length > 0, `${schuhe?.length} Modelle`)

const ohne = (schuhe || []).filter(s => !istSaison(s.season))
p('Kein Modell ohne Saison', ohne.length === 0,
  ohne.map(s => `${s.name} (${s.category})`).slice(0, 6).join(', ') || 'alle gesetzt')

const zaehler = {}
for (const s of schuhe || []) zaehler[s.season] = (zaehler[s.season] || 0) + 1
p('Alle drei Rubriken sind belegt',
  SAISON_KEYS.every(k => (zaehler[k] || 0) > 0),
  SAISON_KEYS.map(k => `${k}: ${zaehler[k] || 0}`).join(' · '))

// Die Zuordnung muss der Regel folgen — sonst hat irgendwo jemand geraten.
const abweichend = (schuhe || []).filter(s => s.season !== saisonFuerKategorie(s.category))
p('Die Zuordnung folgt der Regel', abweichend.length === 0,
  abweichend.map(s => `${s.name}: ${s.season} statt ${saisonFuerKategorie(s.category)}`).slice(0, 5).join(', ') || 'überall')

// Stichproben, die der Betreiber ausdrücklich genannt hat.
const nach = (name) => (schuhe || []).find(s => s.name === name)
for (const [name, soll] of [
  ['Chelsea Boot', 'winter'], ['Jodhpur Boot', 'winter'],
  ['Driver', 'summer'], ['Moc Flex Sport', 'summer'], ['Moc Flex Sport Boot', 'summer'],
  ['Oxford', 'all'], ['Loafer', 'all'],
]) {
  const s = nach(name)
  if (s) p(`„${name}" ist ${soll}`, s.season === soll, s.season)
}

// ════════════════════════════════════════════════════════════════════════
abschnitt('3. Eine gesetzte Saison bleibt gesetzt')

const an = await ruf('/api/auth/login', { method: 'POST',
  body: { email: 'admin@artisansole.com', password: 'ArtisanSole@2026!' } })
const token = an.daten?.accessToken
p('Als Verwaltung angemeldet', !!token, `HTTP ${an.status}`)

// Ein Winterstiefel, der ausdrücklich in den Sommer gestellt wird — der
// ungefütterte Chelsea, den es in jedem Katalog gibt.
const stiefel = (schuhe || []).find(s => s.season === 'winter')
if (stiefel && token) {
  let r = await ruf(`/api/shoes/${stiefel.id}`, { method: 'PUT', token,
    body: { ...stiefel, season: 'summer' } })
  p('Die Saison lässt sich umstellen', r.status === 200 && r.daten?.season === 'summer',
    `${stiefel.name} → ${r.daten?.season}`)

  // Ein Speichern, das die Saison NICHT mitschickt, darf sie nicht
  // zurücksetzen: Die Regel ist die Vorgabe, nicht das Gesetz.
  const ohneFeld = { ...stiefel }
  delete ohneFeld.season
  r = await ruf(`/api/shoes/${stiefel.id}`, { method: 'PUT', token, body: ohneFeld })
  p('Ein Speichern ohne das Feld überschreibt sie nicht', r.daten?.season === 'summer',
    `${r.daten?.season}`)

  // Zurückstellen, damit das Skript wiederholbar bleibt.
  await ruf(`/api/shoes/${stiefel.id}`, { method: 'PUT', token, body: { ...stiefel, season: 'winter' } })
  const { daten: zurueck } = await ruf(`/api/shoes/${stiefel.id}`)
  p('Und wieder zurück', zurueck?.season === 'winter', zurueck?.season)
}

// Ein neues Modell ohne Saison bekommt sie beim Anlegen — nicht erst beim
// nächsten Serverstart. Bis dahin stünde es unter keiner Rubrik.
if (token) {
  const name = `Prüfstiefel ${Math.random().toString(36).slice(2, 7)}`
  const r = await ruf('/api/shoes', { method: 'POST', token,
    body: { name, category: 'CHELSEA', price: '€ 100', material: 'Lux Calf' } })
  p('Ein neues Modell bekommt seine Saison sofort', r.daten?.season === 'winter',
    `${r.daten?.season}`)
  if (r.daten?.id) await ruf(`/api/shoes/${r.daten.id}`, { method: 'DELETE', token })
}

// ════════════════════════════════════════════════════════════════════════
console.log(`\n── Ergebnis ${'─'.repeat(48)}\n`)
console.log(`  ${ok} bestanden, ${fehler.length} fehlgeschlagen`)
if (fehler.length) { console.log('\n  ' + fehler.join('\n  ')); process.exit(1) }
