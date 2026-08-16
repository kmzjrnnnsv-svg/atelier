/**
 * wortlaut.mjs — der Laden sagt „Custom Made", nicht „maßgefertigt"
 * oder „maßgeschneidert".
 *
 * ── Warum das eine Prüfung wert ist ──────────────────────────────────────
 *
 * Ein Begriff, den der Betreiber abgeschafft hat, kommt auf zwei Wegen
 * zurück: über eine neue Zeile im Programm und über einen Text, der in der
 * Datenbank liegt und den niemand mehr ansieht. Der zweite Weg ist der
 * gefährlichere — dort steht der alte Wortlaut still weiter und erscheint
 * beim nächsten Kunden, ohne dass irgendwo etwas rot wird.
 *
 * Geprüft wird deshalb beides: die Quelltexte, die im Laden erscheinen, und
 * das, was der Server nach seinem Start tatsächlich ausliefert.
 *
 * ── Warum „Custom Made" unverändert stehen bleibt ────────────────────────
 *
 * „maßgefertigt" beugt sich (maßgefertigte, maßgefertigter, maßgefertigtes),
 * „Custom Made" nicht — es steht vor dem Substantiv wie „prima" oder „rosa".
 * Das geht in allen Fällen auf bis auf den Genitiv Plural, wo der Fall AM
 * ADJEKTIV steckt: „die Präzision maßgefertigter Schuhe". Dort wird die
 * ganze Wendung ersetzt, mit „von" und Dativ. Genau das prüft Abschnitt 3.
 *
 * Aufruf (Server auf 3099, eigene Datenbank):
 *   DB_PATH=./pruef.db node tests/wortlaut.mjs
 */
import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'

const API = process.env.API || 'http://127.0.0.1:3099'
const DB_PATH = process.env.DB_PATH || './pruef.db'
const WURZEL = path.resolve(new URL('..', import.meta.url).pathname, '..')

let ok = 0, fail = 0
const gut = (t, extra = '') => { ok++; console.log(`  OK     ${t}${extra ? ` — ${extra}` : ''}`) }
const schlecht = (t, extra = '') => { fail++; console.log(`  FEHLER ${t}${extra ? ` — ${extra}` : ''}`) }
const pruefe = (bed, t, extra) => bed ? gut(t, extra) : schlecht(t, extra)
const teil = (t) => console.log(`\n── ${t} ${'─'.repeat(Math.max(0, 56 - t.length))}`)

// Beide Wörter, die es nicht mehr geben soll, in allen Beugungen und auch
// in der Schreibung ohne Eszett.
const VERPOENT = /\b[Mm]a(?:ß|ss)ge(?:fertigt|schneidert)(?:e[rsnm]?)?\b/

// ═════════════════════════════════════════════════════════════════════════
teil('1. Im Quelltext')

// Nur Dateien, deren Text im Laden landen kann. Die Bereinigungsregel selbst
// MUSS das Wort nennen — sonst könnte sie es nicht ersetzen —, und die
// Prüfung hier ebenso. Beide sind ausgenommen.
const AUSGENOMMEN = ['src/db/seed.js', 'tests/wortlaut.mjs']

function dateien(verzeichnis, treffer = []) {
  for (const eintrag of fs.readdirSync(verzeichnis, { withFileTypes: true })) {
    const voll = path.join(verzeichnis, eintrag.name)
    if (eintrag.isDirectory()) {
      if (['node_modules', 'dist', '.git', 'uploads'].includes(eintrag.name)) continue
      dateien(voll, treffer)
    } else if (/\.(jsx?|mjs|json)$/.test(eintrag.name)) {
      treffer.push(voll)
    }
  }
  return treffer
}

const funde = []
for (const ordner of ['artisan-sole-app/src', 'artisan-sole-backend/src']) {
  const wurzel = path.join(WURZEL, ordner)
  if (!fs.existsSync(wurzel)) continue
  for (const datei of dateien(wurzel)) {
    const relativ = path.relative(WURZEL, datei)
    if (AUSGENOMMEN.some(a => relativ.endsWith(a))) continue
    const inhalt = fs.readFileSync(datei, 'utf8')
    inhalt.split('\n').forEach((zeile, i) => {
      if (VERPOENT.test(zeile)) funde.push(`${relativ}:${i + 1}`)
    })
  }
}
pruefe(funde.length === 0, 'Weder „maßgefertigt" noch „maßgeschneidert" im Quelltext',
  funde.length ? funde.slice(0, 4).join(', ') : `${WURZEL.split('/').pop()} durchsucht`)

// Und die Gegenprobe: Der neue Begriff ist auch wirklich angekommen. Ohne
// sie ginge die Prüfung oben auch dann durch, wenn jemand die Sätze
// ersatzlos gelöscht hätte.
const nenntCustomMade = fs
  .readFileSync(path.join(WURZEL, 'artisan-sole-app/src/screens/Ruecksendungen.jsx'), 'utf8')
  .includes('Custom Made Schuhe')
pruefe(nenntCustomMade, 'An seiner Stelle steht „Custom Made Schuhe"')

// ═════════════════════════════════════════════════════════════════════════
teil('2. In dem, was der Server ausliefert')

// Nur öffentliche Routen. Eine Route, die ohne Anmeldung mit einem leeren
// Rumpf antwortet, ginge sonst durch, ohne etwas geprüft zu haben — die
// Prüfung stünde auf OK und hätte nichts angesehen. Deshalb muss jede
// Antwort hier auch tatsächlich Text enthalten.
for (const [name, pfad] of [
  ['Der Katalog', '/api/shoes'],
  ['Die Fragen und Antworten', '/api/faqs'],
  ['Die Leder', '/api/materials'],
]) {
  const r = await fetch(`${API}${pfad}`)
  const text = r.ok ? JSON.stringify(await r.json()) : ''
  pruefe(text.length > 500 && !VERPOENT.test(text), `${name} nennt es nicht mehr`,
    VERPOENT.test(text) ? (text.match(VERPOENT) || [])[0] : `${text.length} Zeichen geprüft`)
}

// Alles Übrige über die Datenbank statt über angemeldete Routen: Was hinter
// einer Anmeldung liegt (Treuestufen, Konfigurator-Optionen, Einstellungen),
// steht dort genauso — und hier lässt es sich vollständig durchsehen, Spalte
// für Spalte, statt nur die Felder, die eine Route zufällig herausgibt.
{
  const db = new Database(DB_PATH, { readonly: true })
  const treffer = []
  let spalten = 0
  for (const { name: tabelle } of db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()) {
    const textSpalten = db.prepare(`PRAGMA table_info(${tabelle})`).all()
      .filter(s => /TEXT|VARCHAR|CHAR|CLOB/i.test(s.type || ''))
      .map(s => s.name)
    if (!textSpalten.length) continue
    spalten += textSpalten.length
    for (const zeile of db.prepare(`SELECT ${textSpalten.map(s => `"${s}"`).join(', ')} FROM ${tabelle}`).all()) {
      for (const [spalte, wert] of Object.entries(zeile)) {
        if (typeof wert === 'string' && VERPOENT.test(wert)) treffer.push(`${tabelle}.${spalte}`)
      }
    }
  }
  pruefe(treffer.length === 0, 'Keine Spalte der Datenbank nennt es mehr',
    treffer.length ? [...new Set(treffer)].slice(0, 4).join(', ') : `${spalten} Textspalten durchsucht`)
  db.close()
}

// ═════════════════════════════════════════════════════════════════════════
teil('3. Die Bereinigung im Bestand')

{
  // Auf einer Kopie: Der Zustand von vorher wird nachgestellt, dann läuft
  // der Start darüber. So wird geprüft, was auf einer bestehenden Anlage
  // wirklich passiert — nicht, was auf einer frischen ohnehin stimmt.
  const kopie = `${DB_PATH}.wortlaut-pruefung`
  for (const suffix of ['', '-wal', '-shm']) {
    try { fs.copyFileSync(`${DB_PATH}${suffix}`, `${kopie}${suffix}`) } catch { /* kein WAL da */ }
  }
  const db = new Database(kopie)
  const { cleanupLegacyWording } = await import('../src/db/seed.js')

  db.prepare("UPDATE faqs SET answer = ? WHERE id = (SELECT MIN(id) FROM faqs)")
    .run('Maßgefertigte Schuhe brauchen Zeit. Die Präzision maßgefertigter Schuhe hat ihren Preis.')
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('product-texts', ?)")
    .run(JSON.stringify({ badges: ['Handgenäht', 'Maßgefertigt', '200+ Schritte'] }))

  cleanupLegacyWording(db)

  const antwort = db.prepare('SELECT answer FROM faqs WHERE id = (SELECT MIN(id) FROM faqs)').get().answer
  pruefe(!VERPOENT.test(antwort), 'Der Text in der Datenbank ist umgestellt', `„${antwort}"`)
  pruefe(antwort.startsWith('Custom Made Schuhe brauchen Zeit'),
    'Die einfache Beugung fällt weg, das Substantiv trägt den Fall')
  pruefe(antwort.includes('Die Präzision von Custom Made Schuhen'),
    'Der Genitiv Plural wird zu „von … Schuhen" — sonst stünde dort ein Satz ohne Fall')

  const texte = JSON.parse(db.prepare("SELECT value FROM settings WHERE key = 'product-texts'").get().value)
  pruefe(texte.badges.includes('Custom Made') && !texte.badges.includes('Maßgefertigt'),
    'Auch die Auszeichnung unter dem Konfigurator', texte.badges.join(' · '))

  // Ein zweiter Durchgang darf nichts mehr ändern — sonst liefe die
  // Bereinigung bei jedem Start über dieselben Zeilen.
  const vorher = db.prepare("SELECT answer FROM faqs WHERE id = (SELECT MIN(id) FROM faqs)").get().answer
  cleanupLegacyWording(db)
  pruefe(db.prepare("SELECT answer FROM faqs WHERE id = (SELECT MIN(id) FROM faqs)").get().answer === vorher,
    'Ein zweiter Durchgang lässt alles, wie es ist')

  db.close()
  for (const suffix of ['', '-wal', '-shm']) { try { fs.unlinkSync(`${kopie}${suffix}`) } catch { /* nicht da */ } }
}

console.log(`\n── Ergebnis ${'─'.repeat(46)}\n`)
console.log(`  ${ok} bestanden, ${fail} fehlgeschlagen\n`)
process.exit(fail ? 1 : 0)
