/**
 * eindeutig.mjs — ein Modellname gehört genau einem Modell.
 *
 * Zwei Kacheln mit demselben Namen sind im Laden nicht auseinanderzuhalten:
 * dahinter liegen zwei verschiedene Konfigurationen, und wer die falsche
 * anklickt, bestellt etwas anderes als das, was er gesehen hat. Genau das ist
 * einmal passiert — der Umbenenner „Mov" → „Moc" lief nach dem Seed statt
 * davor, und beide Fassungen standen nebeneinander.
 *
 * Geprüft wird auf zwei Ebenen, weil die Zusage auf zweien ruht:
 *
 *   • Der eindeutige Index in der Datenbank. Er ist das Eigentliche: Er gilt
 *     für jeden INSERT, auch für den, den es heute noch nicht gibt.
 *   • Die Prüfung in der Schreibroute. Sie ist die Höflichkeit davor — damit
 *     der Redakteur einen Satz zu lesen bekommt und keinen Datenbankfehler.
 *
 * Dazu der Weg über eine Datenbank, die schon Doppelte enthält: Sie muss beim
 * Start unterscheidbar werden, ohne dass irgendetwas verschwindet.
 *
 * Aufruf (Server auf 3099, eigene Datenbank):
 *   DB_PATH=./pruef.db node tests/eindeutig.mjs
 */
import fs from 'fs'
import Database from 'better-sqlite3'
import { runMigrations } from '../src/db/schema.js'

const API = process.env.API || 'http://127.0.0.1:3099'
const DB_PATH = process.env.DB_PATH || './pruef.db'

let ok = 0, fail = 0
const gut = (t, extra = '') => { ok++; console.log(`  OK     ${t}${extra ? ` — ${extra}` : ''}`) }
const schlecht = (t, extra = '') => { fail++; console.log(`  FEHLER ${t}${extra ? ` — ${extra}` : ''}`) }
const pruefe = (bed, t, extra) => bed ? gut(t, extra) : schlecht(t, extra)
const teil = (t) => console.log(`\n── ${t} ${'─'.repeat(Math.max(0, 56 - t.length))}`)

async function ruf(pfad, opts = {}) {
  const r = await fetch(`${API}${pfad}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  })
  let body = null
  try { body = await r.json() } catch { /* leer */ }
  return { status: r.status, body }
}

// ── Anmeldung ────────────────────────────────────────────────────────────
const anmeldung = await ruf('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email: 'admin@artisansole.com', password: 'ArtisanSole@2026!' }),
})
const token = anmeldung.body?.accessToken || anmeldung.body?.token
if (!token) {
  console.error('Keine Anmeldung möglich — läuft der Server auf', API, '?', JSON.stringify(anmeldung.body))
  process.exit(1)
}
const alsAdmin = { Authorization: `Bearer ${token}` }

const angelegt = []
const anlegen = (rumpf) => ruf('/api/shoes', { method: 'POST', headers: alsAdmin, body: JSON.stringify(rumpf) })
const VORLAGE = { category: 'OXFORD', price: '€ 1.000', material: 'Lux Calf' }

// ═════════════════════════════════════════════════════════════════════════
teil('1. Der Index in der Datenbank')

{
  const db = new Database(DB_PATH, { readonly: true })
  const idx = db.prepare("SELECT sql FROM sqlite_master WHERE type='index' AND name='idx_shoes_name_eindeutig'").get()
  pruefe(!!idx, 'Ein eindeutiger Index über den Namen liegt vor')
  pruefe(/unique/i.test(idx?.sql || ''), 'Und er ist eindeutig, nicht nur ein Suchindex')
  pruefe(/lower\s*\(\s*trim\s*\(\s*name/i.test(idx?.sql || ''),
    'Er vergleicht ohne Groß-/Kleinschreibung und ohne Randleerzeichen')

  const doppelte = db.prepare(`
    SELECT lower(trim(name)) n, count(*) c FROM shoes GROUP BY 1 HAVING c > 1
  `).all()
  pruefe(doppelte.length === 0, 'Im Bestand steht kein Modellname zweimal',
    doppelte.length ? doppelte.map(d => `${d.n}×${d.c}`).join(', ') : `${db.prepare('SELECT count(*) c FROM shoes').get().c} Modelle`)

  const roh = db.prepare("SELECT count(*) c FROM shoes WHERE name != trim(name) OR name LIKE '%  %'").get().c
  pruefe(roh === 0, 'Kein Name trägt Leerzeichen am Rand oder doppelt in der Mitte')
  db.close()
}

// ═════════════════════════════════════════════════════════════════════════
teil('2. Die Route weist den zweiten zurück')

const einmalig = `Prüfmodell ${Date.now()}`
{
  const erst = await anlegen({ ...VORLAGE, name: einmalig })
  pruefe(erst.status === 201, 'Ein neuer Name geht durch', `HTTP ${erst.status}`)
  if (erst.body?.id) angelegt.push(erst.body.id)

  const zweit = await anlegen({ ...VORLAGE, name: einmalig })
  pruefe(zweit.status === 409, 'Derselbe Name ein zweites Mal wird abgewiesen', `HTTP ${zweit.status}`)
  pruefe(zweit.body?.error === 'SHOE_NAME_DOPPELT', 'Mit einem benannten Grund', zweit.body?.error)
  // Der Laden zeigt das erste gefüllte von detail/error/message an. Stünde der
  // Satz nur unter `message`, läse der Redakteur den Schlüssel.
  pruefe(typeof zweit.body?.detail === 'string' && zweit.body.detail.length > 40,
    'Und einem Satz an der Stelle, die der Laden anzeigt')
  pruefe((zweit.body?.detail || '').includes(einmalig),
    'Der Satz nennt den Namen, um den es geht')
  pruefe(zweit.body?.conflictId === erst.body?.id, 'Der Hinweis nennt das vorhandene Modell',
    `Nr. ${zweit.body?.conflictId}`)
  if (zweit.body?.id) angelegt.push(zweit.body.id)

  // Der eigentliche Punkt: Es reicht nicht, dass die Zeichenkette gleich ist.
  const gross = await anlegen({ ...VORLAGE, name: einmalig.toUpperCase() })
  pruefe(gross.status === 409, 'Auch in Großbuchstaben ist es derselbe Name', `HTTP ${gross.status}`)
  if (gross.body?.id) angelegt.push(gross.body.id)

  const luft = await anlegen({ ...VORLAGE, name: `  ${einmalig}  ` })
  pruefe(luft.status === 409, 'Auch mit Leerzeichen davor und dahinter', `HTTP ${luft.status}`)
  if (luft.body?.id) angelegt.push(luft.body.id)

  const innen = await anlegen({ ...VORLAGE, name: einmalig.replace(' ', '   ') })
  pruefe(innen.status === 409, 'Auch mit drei Leerzeichen statt einem in der Mitte', `HTTP ${innen.status}`)
  if (innen.body?.id) angelegt.push(innen.body.id)
}

// ═════════════════════════════════════════════════════════════════════════
teil('3. Der Name wird aufgeräumt gespeichert')

{
  const roh = `  Prüfmodell   Luft ${Date.now()}  `
  const r = await anlegen({ ...VORLAGE, name: roh })
  pruefe(r.status === 201, 'Ein Name mit Leerzeichen lässt sich anlegen', `HTTP ${r.status}`)
  if (r.body?.id) angelegt.push(r.body.id)
  pruefe(r.body?.name === roh.replace(/\s+/g, ' ').trim(),
    'Gespeichert wird er ohne die überzähligen Leerzeichen', `„${r.body?.name}"`)
  pruefe(!/--|\s\s/.test(r.body?.slug || ''), 'Und der Slug hat keine leeren Glieder', r.body?.slug)
}

// ═════════════════════════════════════════════════════════════════════════
teil('4. Umbenennen kollidiert genauso')

{
  const a = await anlegen({ ...VORLAGE, name: `Prüfmodell A ${Date.now()}` })
  const b = await anlegen({ ...VORLAGE, name: `Prüfmodell B ${Date.now()}` })
  if (a.body?.id) angelegt.push(a.body.id)
  if (b.body?.id) angelegt.push(b.body.id)

  const kollision = await ruf(`/api/shoes/${b.body.id}`, {
    method: 'PUT', headers: alsAdmin,
    body: JSON.stringify({ ...VORLAGE, name: a.body.name }),
  })
  pruefe(kollision.status === 409, 'B auf den Namen von A umzubenennen wird abgewiesen', `HTTP ${kollision.status}`)

  const nachher = await ruf(`/api/shoes/${b.body.id}`)
  pruefe(nachher.body?.name === b.body.name, 'B heißt danach unverändert wie zuvor', `„${nachher.body?.name}"`)

  // Der Fallstrick der ganzen Prüfung: Ein Speichern ohne Namensänderung
  // darf sich nicht selbst verbieten. Genau daran scheitern solche Regeln.
  const selbst = await ruf(`/api/shoes/${b.body.id}`, {
    method: 'PUT', headers: alsAdmin,
    body: JSON.stringify({ ...VORLAGE, name: b.body.name, price: '€ 1.111' }),
  })
  pruefe(selbst.status === 200, 'B mit seinem eigenen Namen zu speichern geht', `HTTP ${selbst.status}`)
  pruefe(selbst.body?.price === '€ 1.111', 'Und die Änderung kommt an', selbst.body?.price)
}

// ═════════════════════════════════════════════════════════════════════════
teil('5. Eine Datenbank, die schon Doppelte enthält')

{
  // Auf einer Kopie, damit die laufende Datenbank unberührt bleibt.
  const kopie = `${DB_PATH}.doppelt-pruefung`
  for (const suffix of ['', '-wal', '-shm']) {
    try { fs.copyFileSync(`${DB_PATH}${suffix}`, `${kopie}${suffix}`) } catch { /* kein WAL da */ }
  }
  const db = new Database(kopie)

  // Den Zustand herstellen, den es vor dieser Änderung gab: kein Index,
  // und zwei Modelle, die gleich heißen.
  db.prepare('DROP INDEX IF EXISTS idx_shoes_name_eindeutig').run()
  const vorbild = db.prepare("SELECT * FROM shoes WHERE name = 'The Oxford'").get()
    || db.prepare('SELECT * FROM shoes ORDER BY id ASC LIMIT 1').get()
  db.prepare(`
    INSERT INTO shoes (name, category, price, material, color, slug, collection, season)
    VALUES (?, ?, ?, ?, '#111111', 'pruef-doppelt', 'standard', 'all')
  `).run(`  ${vorbild.name.toUpperCase()} `, vorbild.category, vorbild.price, vorbild.material)
  const vorher = db.prepare('SELECT count(*) c FROM shoes').get().c
  pruefe(db.prepare('SELECT count(*) c FROM shoes WHERE lower(trim(name)) = ?')
    .get(vorbild.name.toLowerCase()).c === 2, 'Vorbereitet: zwei Modelle heißen gleich')

  runMigrations(db)

  const nachher = db.prepare('SELECT count(*) c FROM shoes').get().c
  pruefe(nachher === vorher, 'Nach dem Start ist kein Modell verschwunden', `${vorher} → ${nachher}`)

  const doppelt = db.prepare('SELECT lower(trim(name)) n, count(*) c FROM shoes GROUP BY 1 HAVING c > 1').all()
  pruefe(doppelt.length === 0, 'Und keines heißt mehr wie ein anderes')

  const umbenannt = db.prepare('SELECT name, slug FROM shoes WHERE slug = ?').get('pruef-doppelt')
  pruefe(umbenannt?.name === `${vorbild.name.toUpperCase()} (2)`,
    'Das jüngere trägt eine Nummer und ist damit im CMS zu finden', `„${umbenannt?.name}"`)
  pruefe(umbenannt?.slug === 'pruef-doppelt',
    'Sein Slug bleibt — verschickte Links sollen halten', umbenannt?.slug)
  pruefe(db.prepare('SELECT name FROM shoes WHERE id = ?').get(vorbild.id)?.name === vorbild.name,
    'Das ältere behält seinen Namen unverändert', `„${vorbild.name}"`)

  const idx = db.prepare("SELECT sql FROM sqlite_master WHERE name='idx_shoes_name_eindeutig'").get()
  pruefe(!!idx, 'Der eindeutige Index steht danach')

  let abgewiesen = false
  try {
    db.prepare("INSERT INTO shoes (name, category, price, material) VALUES (?, 'OXFORD', '€ 1', 'x')")
      .run(vorbild.name.toLowerCase())
  } catch { abgewiesen = true }
  pruefe(abgewiesen, 'Ein Doppelter lässt sich danach nicht einmal von Hand einfügen')

  db.close()
  for (const suffix of ['', '-wal', '-shm']) { try { fs.unlinkSync(`${kopie}${suffix}`) } catch { /* nicht da */ } }
}

// ── Aufräumen ────────────────────────────────────────────────────────────
for (const id of angelegt) {
  await ruf(`/api/shoes/${id}`, { method: 'DELETE', headers: alsAdmin }).catch(() => {})
  // Die Löschvormerkung wieder abräumen, sonst legt der Seed diese Namen nie
  // wieder an — sie sind Prüfnamen und sollen keine Spur hinterlassen.
}
try {
  const db = new Database(DB_PATH)
  db.prepare("DELETE FROM deleted_seed_shoes WHERE name LIKE 'Prüfmodell%'").run()
  db.close()
} catch { /* nicht so wichtig */ }

console.log(`\n── Ergebnis ${'─'.repeat(46)}\n`)
console.log(`  ${ok} bestanden, ${fail} fehlgeschlagen\n`)
process.exit(fail ? 1 : 0)
