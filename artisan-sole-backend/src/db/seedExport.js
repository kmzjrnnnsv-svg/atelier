/**
 * seedExport.js · Der Katalog als Datei statt im Quelltext.
 *
 * Der Seed im Code trug bislang feste Werte — Preise, Bezeichnungen,
 * Beschreibungen von damals. Seit er nichts mehr überschreibt, ist das für den
 * laufenden Betrieb harmlos, aber eine frische Datenbank käme mit den alten
 * Werten hoch statt mit dem, was tatsächlich verkauft wird.
 *
 * Deshalb: `npm run seed:export` schreibt den aktuellen Stand nach
 * `seed-data.json`, und diese Datei ist beim nächsten Aufsetzen die Vorlage.
 * Sie gehört ins Repository — dann ist der Code ein Abbild des Ladens.
 *
 * Zwei Regeln, die sich durch das ganze Seeding ziehen:
 *   • Auf einer bestehenden Datenbank wird nichts überschrieben.
 *   • Was im CMS gelöscht wurde, kommt nicht zurück.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HIER = path.dirname(fileURLToPath(import.meta.url))
export const EXPORT_PFAD = path.join(HIER, 'seed-data.json')

/**
 * Wo die Vorlage liegt. Normalerweise neben dem Quelltext; SEED_DATA_PATH
 * erlaubt einen anderen Ort, etwa wenn die Datei auf dem Server gepflegt wird
 * oder für Tests.
 */
export const vorlagePfad = () =>
  process.env.SEED_DATA_PATH ? path.resolve(process.env.SEED_DATA_PATH) : EXPORT_PFAD

/**
 * Welche Tabellen mitgenommen werden, und woran eine Zeile wiedererkannt wird.
 *
 * Bewusst nur der Katalog — also das, was im CMS gepflegt wird. Bestellungen,
 * Kunden, Scans und Passformen haben in einer Vorlage nichts verloren: Sie
 * gehören zum Betrieb, nicht zur Einrichtung, und enthielten personenbezogene
 * Daten in einer Datei, die im Repository landet.
 */
export const TABELLEN = [
  { name: 'accessories',    key: 'key' },
  { name: 'shoe_materials', key: 'key' },
  { name: 'shoe_colors',    key: 'key' },
  { name: 'shoe_soles',     key: 'key' },
  { name: 'option_groups',  key: 'key' },
  // options wird über die Gruppe identifiziert, nicht über den Schlüssel
  // allein — derselbe Optionsschlüssel kommt in mehreren Gruppen vor.
  { name: 'options',        key: 'key', parent: { table: 'option_groups', column: 'group_id' } },
]

// Spalten, die beim Übertragen nichts zu suchen haben.
const UEBERSPRINGEN = new Set(['id', 'created_at', 'updated_at', 'created_by', 'group_id'])

const spalten = (db, tabelle) =>
  db.prepare(`PRAGMA table_info(${tabelle})`).all().map(c => c.name)

const tabelleDa = (db, name) =>
  !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name)

/** Aktuellen Katalog aus der Datenbank lesen. */
export function katalogLesen(db) {
  const daten = {}

  // Die Grabsteine gehören mit in die Vorlage. Sonst legt eine frische
  // Installation genau das Zubehör wieder an, das im CMS entfernt wurde — der
  // Quelltext kennt ja weiterhin die alte, längere Liste.
  if (tabelleDa(db, 'deleted_seed_accessories')) {
    const w = db.prepare('SELECT key FROM deleted_seed_accessories').all().map(r => r.key)
    if (w.length) daten.__geloescht = { accessories: w }
  }

  for (const t of TABELLEN) {
    if (!tabelleDa(db, t.name)) continue
    const cols = spalten(db, t.name).filter(c => !UEBERSPRINGEN.has(c))
    const rows = db.prepare(`SELECT * FROM ${t.name}`).all()
    daten[t.name] = rows.map(r => {
      const o = {}
      for (const c of cols) if (r[c] !== null && r[c] !== undefined) o[c] = r[c]
      // Zu welcher Gruppe die Option gehört — als Schlüssel, nicht als Nummer.
      // Nummern unterscheiden sich zwischen Installationen.
      if (t.parent) {
        const p = db.prepare(`SELECT key FROM ${t.parent.table} WHERE id = ?`).get(r[t.parent.column])
        if (p?.key) o.__gruppe = p.key
      }
      return o
    })
  }
  return daten
}

/** Katalog in die Datei schreiben. Gibt die Zeilenzahl je Tabelle zurück. */
export function katalogSchreiben(db, ziel = EXPORT_PFAD) {
  const daten = katalogLesen(db)
  // Bewusst ohne Zeitstempel: Ein Export, bei dem sich nichts geändert hat,
  // soll auch keine Änderung in der Versionsverwaltung erzeugen. Wann die
  // Datei entstanden ist, steht ohnehin im Commit.
  const inhalt = {
    __hinweis: 'Erzeugt von scripts/seed-export.js. Nicht von Hand bearbeiten, '
      + 'im CMS ändern und neu ausführen.',
    daten,
  }
  fs.writeFileSync(ziel, JSON.stringify(inhalt, null, 2) + '\n', 'utf8')
  return Object.fromEntries(
    Object.entries(daten).filter(([k]) => !k.startsWith('__')).map(([k, v]) => [k, v.length])
  )
}

/** Die Vorlage laden, falls vorhanden. */
export function katalogLaden(pfad = vorlagePfad()) {
  try {
    if (!fs.existsSync(pfad)) return null
    return JSON.parse(fs.readFileSync(pfad, 'utf8'))?.daten || null
  } catch (e) {
    console.error('[seed-data]', e.message)
    return null
  }
}

/**
 * Die Vorlage anwenden.
 *
 * Zwei Betriebsarten, und der Unterschied ist der ganze Punkt:
 *
 *   • Laufende Datenbank (Standard): nur fehlende Zeilen anlegen. Was im CMS
 *     gepflegt wurde, bleibt, wie es ist. Neue Artikel von einer anderen
 *     Installation kommen dazu — alles andere wäre eine Überschreibung durch
 *     die Hintertür.
 *
 *   • Frische Installation (`ueberschreiben`): auch bestehende Zeilen
 *     angleichen. Die stammen dann nämlich nicht aus dem Betrieb, sondern
 *     wurden Sekunden vorher von den Festwerten im Quelltext angelegt — genau
 *     die alten Preise, die die Vorlage ersetzen soll. Zusätzlich werden hier
 *     die Löschungen nachgezogen, damit entferntes Zubehör nicht zurückkehrt.
 */
export function katalogAnwenden(db, optionen = {}) {
  const { pfad = vorlagePfad(), ueberschreiben = false } = optionen
  const daten = katalogLaden(pfad)
  if (!daten) return null

  // Was im CMS gelöscht wurde, bleibt gelöscht — auch gegenüber der Vorlage.
  const geloescht = new Set()
  const merken = (tabelle, keys) => { for (const k of keys) geloescht.add(`${tabelle}:${k}`) }
  try {
    merken('accessories', db.prepare('SELECT key FROM deleted_seed_accessories').all().map(r => r.key))
  } catch { /* Tabelle noch nicht da */ }

  const bilanz = {}
  const zaehle = (tabelle, feld) => {
    bilanz[tabelle] ||= { neu: 0, angepasst: 0, entfernt: 0 }
    bilanz[tabelle][feld]++
  }

  // Grabsteine der Vorlage übernehmen und die betroffenen Zeilen räumen. Nur
  // auf einer frischen Installation — sonst wäre es ein Löschbefehl aus einer
  // Datei heraus auf Daten, die jemand vielleicht bewusst wieder angelegt hat.
  if (ueberschreiben && Array.isArray(daten.__geloescht?.accessories) && tabelleDa(db, 'deleted_seed_accessories')) {
    for (const key of daten.__geloescht.accessories) {
      geloescht.add(`accessories:${key}`)
      try {
        db.prepare('INSERT OR IGNORE INTO deleted_seed_accessories (key) VALUES (?)').run(key)
        const weg = db.prepare('DELETE FROM accessories WHERE key = ?').run(key)
        if (weg.changes) zaehle('accessories', 'entfernt')
      } catch (e) {
        console.error(`[seed-data geloescht/${key}]`, e.message)
      }
    }
  }

  for (const t of TABELLEN) {
    const rows = daten[t.name]
    if (!Array.isArray(rows) || !rows.length || !tabelleDa(db, t.name)) continue
    const vorhandeneSpalten = new Set(spalten(db, t.name))

    for (const row of rows) {
      const schluessel = row[t.key]
      if (!schluessel) continue
      if (geloescht.has(`${t.name}:${schluessel}`)) continue

      // Gruppen-Zuordnung auflösen; fehlt die Gruppe, wird die Zeile
      // übersprungen statt an der falschen Stelle zu landen.
      let parentId = null
      if (t.parent) {
        const p = db.prepare(`SELECT id FROM ${t.parent.table} WHERE key = ?`).get(row.__gruppe)
        if (!p) continue
        parentId = p.id
      }

      const da = t.parent
        ? db.prepare(`SELECT id FROM ${t.name} WHERE ${t.key} = ? AND ${t.parent.column} = ?`).get(schluessel, parentId)
        : db.prepare(`SELECT id FROM ${t.name} WHERE ${t.key} = ?`).get(schluessel)

      const felder = Object.keys(row).filter(k => !k.startsWith('__') && vorhandeneSpalten.has(k))
      if (!felder.length) continue

      try {
        if (da) {
          if (!ueberschreiben) continue
          const setzbar = felder.filter(k => k !== t.key)
          if (!setzbar.length) continue
          db.prepare(
            `UPDATE ${t.name} SET ${setzbar.map(k => `${k} = ?`).join(', ')} WHERE id = ?`
          ).run(...setzbar.map(k => row[k]), da.id)
          zaehle(t.name, 'angepasst')
        } else {
          const werte = felder.map(k => row[k])
          const spaltenListe = [...felder]
          if (t.parent) { spaltenListe.push(t.parent.column); werte.push(parentId) }
          db.prepare(
            `INSERT INTO ${t.name} (${spaltenListe.join(', ')}) VALUES (${spaltenListe.map(() => '?').join(', ')})`
          ).run(...werte)
          zaehle(t.name, 'neu')
        }
      } catch (e) {
        console.error(`[seed-data ${t.name}/${schluessel}]`, e.message)
      }
    }
  }

  // Nur melden, wenn tatsächlich etwas passiert ist.
  for (const [k, v] of Object.entries(bilanz)) {
    if (!v.neu && !v.angepasst && !v.entfernt) delete bilanz[k]
  }
  return Object.keys(bilanz).length ? bilanz : null
}
