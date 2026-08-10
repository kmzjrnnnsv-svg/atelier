#!/usr/bin/env node
/**
 * Schreibt den aktuellen Katalog aus der laufenden Datenbank in die Vorlage
 * src/db/seed-data.json.
 *
 *   npm run seed:export                 # nutzt DB_PATH bzw. die Standarddatei
 *   DB_PATH=/pfad/zur/app.db npm run seed:export
 *   npm run seed:export -- --dry        # nur anzeigen, nichts schreiben
 *
 * Danach die Datei einchecken. Beim nächsten Aufsetzen einer leeren Datenbank
 * entsteht daraus derselbe Katalog — mit den Preisen und Texten, die im CMS
 * gepflegt wurden, statt der alten Werte aus dem Quelltext.
 */
import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { katalogLesen, katalogSchreiben, vorlagePfad, TABELLEN } from '../src/db/seedExport.js'

const HIER = path.dirname(fileURLToPath(import.meta.url))
const trocken = process.argv.includes('--dry')

// Dieselbe Auflösung wie in src/db/database.js, damit man nicht aus Versehen
// eine andere Datenbank exportiert als die, die der Server benutzt.
const pfad = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(HIER, '..', 'atelier.db')

if (!fs.existsSync(pfad)) {
  console.error(`Keine Datenbank unter ${pfad}. Bitte DB_PATH setzen:`)
  console.error('  DB_PATH=/pfad/zur/app.db npm run seed:export')
  process.exit(1)
}

console.log(`Datenbank: ${pfad}`)
const db = new Database(pfad, { readonly: true })

if (trocken) {
  const daten = katalogLesen(db)
  console.log('\nWürde geschrieben werden:')
  for (const t of TABELLEN) {
    const n = daten[t.name]?.length ?? 0
    console.log(`  ${t.name.padEnd(16)} ${String(n).padStart(4)} Zeilen`)
  }
  const acc = daten.accessories || []
  if (acc.length) {
    console.log('\nZubehör im Einzelnen:')
    for (const a of acc) console.log(`  ${String(a.key).padEnd(20)} ${String(a.name).padEnd(28)} ${a.price} €`)
  }
  console.log('\nNichts geschrieben (--dry).')
  process.exit(0)
}

const bilanz = katalogSchreiben(db, vorlagePfad())
console.log(`\nGeschrieben: ${path.relative(process.cwd(), vorlagePfad())}`)
for (const [t, n] of Object.entries(bilanz)) console.log(`  ${t.padEnd(16)} ${String(n).padStart(4)} Zeilen`)
console.log('\nBitte die Datei einchecken — sie ist ab jetzt die Vorlage für neue Installationen.')
