import { Router } from 'express'
import { body, param, validationResult } from 'express-validator'
import { getDb } from '../db/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { uniqueShoeSlug } from '../utils/slug.js'
import { saisonFuerKategorie, istSaison } from '../utils/saison.js'
import { sauberName, nameKollision } from '../utils/schuhname.js'
import {
  guertelArtikel, wahlmoeglichkeiten as guertelWahl, preis as guertelPreis,
} from '../utils/guertel.js'

const router = Router()
const canWrite = [authenticate, requireRole('admin', 'curator')]
const mustRead = [authenticate]

// Spalten-Whitelist je Tabelle, einmal aus dem Schema gelesen und gecacht.
// req.body-Keys werden als SQL-Identifier in INSERT/UPDATE eingesetzt; ohne
// diese Prüfung könnte ein Redakteur (admin/curator) beliebige Bezeichner
// einschleusen (Identifier-Injection) oder nicht vorgesehene Spalten
// beschreiben (Mass Assignment). `table` ist stets ein fest verdrahteter
// interner Name, kein Nutzereingang.
const _columnCache = new Map()
function tableColumns(table) {
  if (!_columnCache.has(table)) {
    const cols = getDb().prepare(`PRAGMA table_info(${table})`).all().map(c => c.name)
    _columnCache.set(table, new Set(cols))
  }
  return _columnCache.get(table)
}
function pickValidColumns(table, obj) {
  const valid = tableColumns(table)
  const out = {}
  for (const k of Object.keys(obj || {})) if (valid.has(k)) out[k] = obj[k]
  return out
}

/**
 * Ein Grund, das Schreiben abzulehnen.
 *
 * `onWrite` durfte den Rumpf bisher nur ergänzen. Für „diesen Namen gibt es
 * schon" reicht das nicht: Die Prüfung braucht die Datenbank, sitzt damit
 * genau dort — und muss abbrechen können. Ein geworfener Fehler landete sonst
 * im allgemeinen Fänger und käme als 500 zurück, aus der niemand liest, was
 * zu tun ist.
 */
class SchreibAbbruch extends Error {
  constructor(status, nutzlast) {
    super(nutzlast?.message || 'Abgelehnt')
    this.status = status
    this.nutzlast = nutzlast
  }
}

// Ruft `onWrite` und übersetzt einen Abbruch in eine Antwort. Liefert true,
// wenn geschrieben werden darf.
function anreichern(onWrite, ziel, ctx, res, durchWhitelist = null) {
  if (!onWrite) return true
  try {
    const zusatz = onWrite(ziel, ctx)
    Object.assign(ziel, durchWhitelist ? pickValidColumns(durchWhitelist, zusatz) : zusatz)
    return true
  } catch (e) {
    if (e instanceof SchreibAbbruch) { res.status(e.status).json(e.nutzlast); return false }
    throw e
  }
}

// `listExclude` hält schwere Spalten aus der Listenantwort heraus, ohne sie
// beim Einzelabruf zu verstecken. Nötig, seit Schuhe eine zweite Ansicht als
// base64-Data-URL tragen: über alle Modelle summiert wäre das ein Vielfaches
// der eigentlichen Nutzlast, und auf dem Telefon gäbe es dafür nicht einmal
// eine Verwendung.
// `onWrite` darf den Rumpf vor dem Schreiben ergänzen (etwa um einen aus dem
// Namen abgeleiteten Slug). Bekommt (body, { db, id }); id ist beim Anlegen null.
// `onDelete` läuft in derselben Transaktion wie das Löschen und bekommt den
// Datensatz, bevor er verschwindet.
function makeContentRouter(table, writeValidators = [], { publicRead = false, listExclude = [], onWrite = null, onDelete = null, vorabRouten = null } = {}) {
  const r = Router()
  const readGuard = publicRead ? [] : mustRead

  // Eigene Routen mit festem Namen müssen VOR dem allgemeinen `/:id` stehen.
  //
  // Express nimmt den ersten Treffer. Wurde eine Route wie `/by-shoe` erst
  // weiter unten in der Datei angehängt, landete der Aufruf im `/:id`-Zweig,
  // suchte eine Zeile mit der Kennung „by-shoe" und antwortete mit 404 — die
  // Route war da, aber unerreichbar. Aufgefallen ist das erst im Browser, weil
  // der Laden den Fehlschlag stillschweigend abfing.
  if (vorabRouten) vorabRouten(r, readGuard)

  // GET all
  r.get('/', ...readGuard, (req, res) => {
    const rows = getDb().prepare(`SELECT * FROM ${table} ORDER BY id ASC`).all()
    res.json(listExclude.length
      ? rows.map(row => {
          const copy = { ...row }
          for (const col of listExclude) delete copy[col]
          return copy
        })
      : rows)
  })

  // GET one
  r.get('/:id', ...readGuard, param('id').isInt(), (req, res) => {
    const row = getDb().prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.params.id)
    if (!row) return res.status(404).json({ error: 'Not found' })
    res.json(row)
  })

  // POST
  r.post('/', ...canWrite, ...writeValidators, (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const body = { ...req.body, created_by: req.user.id }
    if (!anreichern(onWrite, body, { db: getDb(), id: null }, res)) return
    // Ein zuvor gelöschter Name wird wieder freigegeben, sobald jemand ihn
    // bewusst neu anlegt — sonst bliebe er für den Seed dauerhaft gesperrt.
    if (table === 'shoes' && body.name) {
      getDb().prepare('DELETE FROM deleted_seed_shoes WHERE name = ?').run(body.name)
    }
    const safeBody = pickValidColumns(table, body)
    const cols = Object.keys(safeBody).join(', ')
    const vals = Object.keys(safeBody).map(() => '?').join(', ')
    const result = getDb()
      .prepare(`INSERT INTO ${table} (${cols}) VALUES (${vals})`)
      .run(...Object.values(safeBody))

    const row = getDb().prepare(`SELECT * FROM ${table} WHERE id = ?`).get(result.lastInsertRowid)
    res.status(201).json(row)
  })

  // PUT
  r.put('/:id', ...canWrite, param('id').isInt(), ...writeValidators, (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const db = getDb()
    const existing = db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(req.params.id)
    if (!existing) return res.status(404).json({ error: 'Not found' })

    const writeBody = pickValidColumns(table, req.body)
    if (!anreichern(onWrite, writeBody, { db, id: Number(req.params.id) }, res, table)) return
    delete writeBody.id
    delete writeBody.created_by

    const keys = Object.keys(writeBody)
    if (keys.length === 0) return res.status(400).json({ error: 'Keine gültigen Felder' })
    const set  = keys.map(k => `${k} = ?`).join(', ')
    const vals = keys.map(k => writeBody[k])

    db.prepare(`UPDATE ${table} SET ${set}, updated_at = datetime('now') WHERE id = ?`)
      .run(...vals, req.params.id)

    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.params.id)
    res.json(row)
  })

  // DELETE
  r.delete('/:id', ...canWrite, param('id').isInt(), (req, res) => {
    const db = getDb()
    const existing = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.params.id)
    if (!existing) return res.status(404).json({ error: 'Not found' })
    // Gemeinsam ausführen: Ein Vermerk ohne Löschung (oder umgekehrt) wäre
    // schlimmer als beides nicht zu tun.
    db.transaction(() => {
      if (onDelete) onDelete(existing, { db })
      db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(req.params.id)
    })()
    res.json({ message: 'Deleted' })
  })

  return r
}

// Shoes validators
const shoeValidators = [
  body('name').trim().notEmpty().withMessage('Name required'),
  // Kategorie ist Admin-Inhalt (Seed nutzt u. a. WHOLECUT, DOUBLE_MONK, BALMORAL,
  // CHELSEA, CHUKKA …). Keine enge Whitelist — sonst scheitert das Speichern
  // bestehender Schuhe mit HTTP 400. Nur Format prüfen.
  body('category').trim().notEmpty().withMessage('Category required')
    .matches(/^[A-Z][A-Z_]*$/).withMessage('Category muss GROSSBUCHSTABEN/Unterstrich sein'),
  body('price').trim().notEmpty().withMessage('Price required'),
  body('material').trim().notEmpty().withMessage('Material required'),
  body('image_data').optional().custom(v => {
    if (v && Buffer.byteLength(v, 'base64') > 3 * 1024 * 1024)
      throw new Error('Image too large (max 3MB)')
    return true
  }),
]

// Outfit validators

// Article validators

// Explore section validators

export const shoesRouter      = makeContentRouter('shoes', shoeValidators, {
  publicRead: true,
  listExclude: ['hover_image_data', 'default_images'],
  // Slug aus dem Namen ableiten. Nur wenn ein Name im Rumpf steht — ein PUT,
  // das etwa nur Bilder aktualisiert, lässt die Adresse unangetastet.
  //
  // Und die Saison vorbelegen, wenn keine mitkommt: Ein im CMS angelegtes
  // Modell stünde sonst unter keiner der drei Rubriken, bis jemand den
  // Server neu startet. Eine mitgeschickte Angabe hat Vorrang — die Regel
  // ist die Vorgabe, nicht das Gesetz.
  onWrite: (body, { db, id }) => {
    const zusatz = {}
    if (body.name) {
      // Der Name wird auf seine Schreibform gebracht, bevor irgendetwas mit
      // ihm geschieht. Sonst hinge die Frage, ob zwei Modelle dasselbe heißen,
      // an einem Leerzeichen, das niemand sieht.
      const sauber = sauberName(body.name)
      const belegt = nameKollision(db, sauber, id)
      if (belegt) {
        // `detail` trägt den Satz, `error` den Schlüssel: Der Laden zeigt das
        // erste Feld an, das eine Meldung enthält, und `detail` steht davor.
        // Stünde der Schlüssel dort, läse der Redakteur „SHOE_NAME_DOPPELT".
        throw new SchreibAbbruch(409, {
          error: 'SHOE_NAME_DOPPELT',
          detail: `„${belegt.name}" gibt es bereits (Modell Nr. ${belegt.id}). `
            + 'Zwei Modelle mit demselben Namen wären im Laden nicht auseinanderzuhalten, '
            + 'bitte einen anderen Namen wählen oder das vorhandene Modell bearbeiten.',
          conflictId: belegt.id,
        })
      }
      zusatz.name = sauber
      zusatz.slug = uniqueShoeSlug(db, sauber, id)
    }
    if (!istSaison(body.season)) {
      const vorhanden = id ? db.prepare('SELECT season FROM shoes WHERE id = ?').get(id)?.season : null
      if (!istSaison(vorhanden)) zusatz.season = saisonFuerKategorie(body.category)
    }
    return zusatz
  },
  // Löschung vormerken, damit der Seed das Modell nicht beim nächsten Start
  // wieder anlegt — er kennt seine Modelle über den Namen.
  onDelete: (row, { db }) => {
    db.prepare('INSERT OR REPLACE INTO deleted_seed_shoes (name, deleted_at) VALUES (?, datetime(\'now\'))').run(row.name)
  },
})
/**
 * Die Kollektionen — die Angebote, in die der Katalog zerfällt.
 *
 * Öffentlich lesbar, denn der Laden gliedert seine Übersicht danach. Es sind
 * Regalbeschriftungen, nichts Schützenswertes: „Maßanfertigung", „Express".
 * Das Feld `visible` kommt mit; ausgeblendet wird im Laden, nicht hier —
 * die Verwaltung braucht dieselbe Liste einschließlich der vorbereiteten.
 */
export const collectionsRouter = makeContentRouter('collections', [
  body('key').trim().notEmpty().withMessage('Schlüssel erforderlich')
    .matches(/^[a-z][a-z0-9_]*$/).withMessage('Nur Kleinbuchstaben, Ziffern und Unterstrich'),
  body('label').trim().notEmpty().withMessage('Bezeichnung erforderlich'),
], { publicRead: true })

/**
 * Werbemittel für Vermittler.
 *
 * Nicht öffentlich lesbar: Das Material ist für Partner freigegeben, nicht
 * für den Laden. Der Abruf durch den Vermittler läuft über
 * GET /api/affiliates/me/werbemittel, das prüft, dass es ein Partner ist.
 */
export const affiliateAssetsRouter = makeContentRouter('affiliate_assets', [
  body('title').trim().notEmpty().withMessage('Bezeichnung erforderlich'),
  body('kind').optional().isIn(['bild', 'text']).withMessage('Art: Bild oder Text'),
])

/**
 * Lederarten und Farben — beide mit eigenem Bild.
 *
 * Die Grenze ist enger als bei den Schuhbildern (3 MB), und zwar aus einem
 * Grund, den man der Zahl nicht ansieht: Diese beiden Listen werden als
 * Ganzes ausgeliefert. `GET /api/colors` gibt jedem Besucher alle Farben,
 * und ein Konfigurator, der vierzig Bilder zu je drei Megabyte herunterlädt,
 * geht auf dem Telefon nicht mehr auf. Ein Plättchen von wenigen Hundert
 * Pixeln bleibt weit darunter.
 *
 * Dieselbe Grenze steht im Laden (BildFeld, MAX_BILD_LISTE) — dort, damit
 * der Redakteur es erfährt, bevor er wartet; hier, weil eine Grenze, die
 * nur im Browser gilt, keine ist.
 */
const LISTENBILD_MAX = 1024 * 1024
/**
 * Geprüft wird in `onWrite`, nicht mit einem express-validator.
 *
 * Der Grund ist die Fehlermeldung: express-validator legt den beanstandeten
 * Wert in die Antwort. Bei einem zu großen Bild wären das zwei Megabyte
 * Base64, zurückgeschickt an denjenigen, der sie gerade geschickt hat — eine
 * Antwort, die das Problem wiederholt, das sie meldet.
 */
function bildPruefen(body) {
  const v = body?.image
  if (!v) return {}
  // Data-URL: Nur der Nutzlast-Teil zählt, der Kopf („data:image/png;base64,")
  // sind ein paar Dutzend Zeichen.
  const nutzlast = String(v).includes(',') ? String(v).split(',').pop() : String(v)
  if (Buffer.byteLength(nutzlast, 'base64') > LISTENBILD_MAX) {
    throw new SchreibAbbruch(400, {
      error: 'BILD_ZU_GROSS',
      detail: 'Das Bild ist zu groß. Höchstens 1 MB — die Liste wird als Ganzes '
        + 'an jeden Besucher ausgeliefert, ein Foto in voller Größe läge dort in jeder Antwort.',
    })
  }
  return {}
}

export const materialsRouter  = makeContentRouter('shoe_materials', [], { publicRead: true, onWrite: bildPruefen })
export const colorsRouter     = makeContentRouter('shoe_colors', [], { publicRead: true, onWrite: bildPruefen })
export const solesRouter      = makeContentRouter('shoe_soles', [], { publicRead: true })
/**
 * Alle Zuordnungen Modell → Zubehör auf einmal.
 *
 * Der Laden holt sie beim Start einmal, statt je Modell nachzufragen. Als
 * Vorabroute registriert, weil `/by-shoe` sonst vom allgemeinen `/:id`
 * verschluckt wird.
 */
function zubehoerNachModell(r) {
  r.get('/by-shoe', (req, res) => {
    const rows = getDb().prepare(`
      SELECT sa.shoe_id, a.*
      FROM shoe_accessories sa
      JOIN accessories a ON a.id = sa.accessory_id
      WHERE a.is_active = 1
      ORDER BY sa.shoe_id, sa.sort_order ASC, a.sort_order ASC
    `).all()
    const map = {}
    for (const row of rows) {
      if (!map[row.shoe_id]) map[row.shoe_id] = []
      map[row.shoe_id].push(row)
    }
    res.json(map)
  })

  /**
   * Alles, was die Gürtelmaske braucht — in einem Aufruf.
   *
   * Die Maske gibt es an zwei Stellen: im Konfigurator neben dem Schuh und
   * auf der Zubehörseite für sich. Beide holen ihre Auswahl von hier, damit
   * es nicht zwei Listen gibt, die sich mit der Zeit unterscheiden.
   *
   * Die Preise stehen bewusst mit dabei: Der Kunde soll sehen, dass der
   * Gürtel zum Paar günstiger ist, BEVOR er sich entscheidet — und nicht
   * erst an der Kasse.
   */
  r.get('/guertel', (req, res) => {
    const db = getDb()
    const artikel = guertelArtikel(db)
    if (!artikel) return res.status(404).json({ error: 'Den Gürtel führen wir derzeit nicht.' })
    res.json({
      artikel: {
        id: artikel.id, key: artikel.key, name: artikel.name,
        description: artikel.description, image_data: artikel.image_data,
        config_kind: artikel.config_kind,
      },
      preis_einzeln: guertelPreis(artikel, { mitSchuh: false }),
      preis_zum_paar: guertelPreis(artikel, { mitSchuh: true }),
      ...guertelWahl(db),
    })
  })
}

export const accessoriesRouter    = makeContentRouter('accessories', [], {
  vorabRouten: zubehoerNachModell,
  publicRead: true,
  // Wie bei den Modellen: Löschung vormerken, sonst legt der Seed den Artikel
  // beim nächsten Start wieder an.
  onDelete: (row, { db }) => {
    if (row?.key) {
      db.prepare("INSERT OR REPLACE INTO deleted_seed_accessories (key, deleted_at) VALUES (?, datetime('now'))").run(row.key)
    }
  },
})

// ── Shoe ↔ Accessory relationship endpoints ────────────────────────────────

// GET /api/shoes/:id/accessories — public: get accessories assigned to a shoe
shoesRouter.get('/:id/accessories', param('id').isInt(), (req, res) => {
  const rows = getDb().prepare(`
    SELECT a.*, sa.sort_order as link_sort_order
    FROM shoe_accessories sa
    JOIN accessories a ON a.id = sa.accessory_id
    WHERE sa.shoe_id = ? AND a.is_active = 1
    ORDER BY sa.sort_order ASC, a.sort_order ASC
  `).all(req.params.id)
  res.json(rows)
})

// PUT /api/shoes/:id/accessories — admin/curator: set accessories for a shoe (full replace)
shoesRouter.put('/:id/accessories', ...canWrite, param('id').isInt(), (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

  const db = getDb()
  const shoeId = parseInt(req.params.id)
  const shoe = db.prepare('SELECT id FROM shoes WHERE id = ?').get(shoeId)
  if (!shoe) return res.status(404).json({ error: 'Shoe not found' })

  const accessoryIds = req.body.accessory_ids || []

  db.transaction(() => {
    db.prepare('DELETE FROM shoe_accessories WHERE shoe_id = ?').run(shoeId)
    const insert = db.prepare('INSERT INTO shoe_accessories (shoe_id, accessory_id, sort_order) VALUES (?, ?, ?)')
    accessoryIds.forEach((accId, i) => {
      insert.run(shoeId, accId, i)
    })
  })()

  // Return updated list
  const rows = db.prepare(`
    SELECT a.*, sa.sort_order as link_sort_order
    FROM shoe_accessories sa
    JOIN accessories a ON a.id = sa.accessory_id
    WHERE sa.shoe_id = ?
    ORDER BY sa.sort_order ASC
  `).all(shoeId)
  res.json(rows)
})

// ── Zusatzdaten für die Übersichtskacheln ─────────────────────────────────
// Muss in index.js VOR shoesRouter gemountet werden: dessen generisches
// GET /:id würde '/color-summary' sonst als id verschlucken.
//
// Warum getrennt und nicht in der Schuhliste: Varianten- und Hauptbilder
// liegen als base64-Data-URLs in der Datenbank. /api/shoes trägt davon
// schon eines pro Schuh; ein zweites würde die Antwort etwa verdoppeln.
// Farben (nur Hex + Name) sind dagegen winzig und kommen gebündelt vorab,
// das Hover-Bild holt die Kachel einzeln beim ersten Überfahren.
export const shoeCardRouter = Router()

// GET /api/shoes/by-slug/:slug — public. Auflösung der sprechenden Adresse.
// Muss wie die übrigen Zusatzrouten vor shoesRouter stehen, sonst schluckt
// dessen GET /:id den Pfad.
shoeCardRouter.get('/by-slug/:slug', (req, res) => {
  const row = getDb().prepare('SELECT * FROM shoes WHERE slug = ?').get(String(req.params.slug || ''))
  if (!row) return res.status(404).json({ error: 'Not found' })
  res.json(row)
})

// GET /api/shoes/color-summary — public. { [shoeId]: [{ hex, name }] }
shoeCardRouter.get('/color-summary', (req, res) => {
  const rows = getDb().prepare(`
    SELECT shoe_id, hex, name FROM shoe_color_variants
    ORDER BY shoe_id ASC, sort_order ASC, id ASC
  `).all()

  const out = {}
  for (const r of rows) {
    const list = (out[r.shoe_id] ||= [])
    // Eine Farbe kann mehrfach vorkommen, einmal je Material. Für die
    // Kachel zählt nur der Farbton, sonst stünden dort Dubletten.
    if (!list.some(c => c.hex === r.hex)) list.push({ hex: r.hex, name: r.name })
  }
  res.json(out)
})

// GET /api/shoes/:id/hover-image — public. { image: <data-url|null> }
// Zweitansicht für den Hover-Wechsel: bevorzugt das zweite Bild der ersten
// Farbvariante, sonst das erste Bild der zweiten Variante.
shoeCardRouter.get('/:id/hover-image', param('id').isInt(), (req, res) => {
  const db = getDb()

  // Das am Modell hinterlegte Standardbild hat Vorrang — es ist bewusst für
  // die Kollektionsseite gewählt. Erst wenn keines gesetzt ist, wird aus den
  // Farbvarianten abgeleitet, damit bestehende Modelle ohne Pflege trotzdem
  // einen Wechsel zeigen.
  const own = db.prepare('SELECT hover_image_data, default_images FROM shoes WHERE id = ?').get(req.params.id)
  const gallery = safeJsonArray(own?.default_images)
  if (gallery[1]) return res.json({ image: gallery[1] })
  if (own?.hover_image_data) return res.json({ image: own.hover_image_data })

  const rows = db.prepare(`
    SELECT images FROM shoe_color_variants WHERE shoe_id = ?
    ORDER BY sort_order ASC, id ASC
  `).all(req.params.id)

  const perVariant = rows.map(r => safeJsonArray(r.images)).filter(a => a.length)
  const image = perVariant[0]?.[1] || perVariant[1]?.[0] || null
  res.json({ image })
})

// ── Per-Shoe Material-Optionen ────────────────────────────────────────────
// GET /api/shoes/:id/materials — public
shoesRouter.get('/:id/materials', param('id').isInt(), (req, res) => {
  const rows = getDb().prepare(`
    SELECT material_key FROM shoe_material_options
    WHERE shoe_id = ? ORDER BY sort_order ASC
  `).all(req.params.id)
  res.json(rows.map(r => r.material_key))
})

// PUT /api/shoes/:id/materials — admin/curator (Vollersatz)
shoesRouter.put('/:id/materials', ...canWrite, param('id').isInt(), (req, res) => {
  const db = getDb()
  const shoeId = parseInt(req.params.id)
  if (!db.prepare('SELECT id FROM shoes WHERE id = ?').get(shoeId)) {
    return res.status(404).json({ error: 'Shoe not found' })
  }
  const keys = Array.isArray(req.body.material_keys) ? req.body.material_keys : []
  db.transaction(() => {
    db.prepare('DELETE FROM shoe_material_options WHERE shoe_id = ?').run(shoeId)
    const ins = db.prepare('INSERT INTO shoe_material_options (shoe_id, material_key, sort_order) VALUES (?, ?, ?)')
    keys.forEach((k, i) => { if (typeof k === 'string' && k) ins.run(shoeId, k, i) })
  })()
  res.json({ material_keys: keys })
})

// ── Per-Shoe Farb-Varianten (mit Bildern, mind. 1 Bild Pflicht) ───────────
// material_key (optional): bindet eine Variante an ein bestimmtes Material
// (z. B. „suede", „calfskin"). null = gilt für alle Materialien (Fallback).
// GET /api/shoes/:id/colors — public
shoesRouter.get('/:id/colors', param('id').isInt(), (req, res) => {
  const rows = getDb().prepare(`
    SELECT id, hex, name, images, sort_order, material_key
    FROM shoe_color_variants WHERE shoe_id = ?
    ORDER BY sort_order ASC, id ASC
  `).all(req.params.id)
  res.json(rows.map(r => ({
    id: r.id, hex: r.hex, name: r.name, sort_order: r.sort_order,
    material_key: r.material_key || null,
    images: safeJsonArray(r.images),
  })))
})

// PUT /api/shoes/:id/colors — admin/curator (Vollersatz). Jede Variante
// muss mind. 1 Bild haben. material_key ist optional.
shoesRouter.put('/:id/colors', ...canWrite, param('id').isInt(), (req, res) => {
  const db = getDb()
  const shoeId = parseInt(req.params.id)
  if (!db.prepare('SELECT id FROM shoes WHERE id = ?').get(shoeId)) {
    return res.status(404).json({ error: 'Shoe not found' })
  }
  const variants = Array.isArray(req.body.variants) ? req.body.variants : []

  for (let i = 0; i < variants.length; i++) {
    const v = variants[i]
    if (!v?.name || typeof v.name !== 'string' || !v.name.trim()) {
      return res.status(400).json({ error: `Variante ${i + 1}: Name fehlt` })
    }
    if (!Array.isArray(v.images) || v.images.length === 0) {
      return res.status(400).json({ error: `Variante "${v.name}": mindestens 1 Bild erforderlich` })
    }
    if (v.images.some(img => typeof img !== 'string' || !img)) {
      return res.status(400).json({ error: `Variante "${v.name}": ungültiges Bild` })
    }
  }

  db.transaction(() => {
    db.prepare('DELETE FROM shoe_color_variants WHERE shoe_id = ?').run(shoeId)
    const ins = db.prepare(`
      INSERT INTO shoe_color_variants (shoe_id, hex, name, images, sort_order, material_key)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    variants.forEach((v, i) => {
      ins.run(shoeId, v.hex || '#000000', v.name.trim(), JSON.stringify(v.images), i, v.material_key || null)
    })
  })()

  const rows = db.prepare(`
    SELECT id, hex, name, images, sort_order, material_key FROM shoe_color_variants
    WHERE shoe_id = ? ORDER BY sort_order ASC, id ASC
  `).all(shoeId)
  res.json(rows.map(r => ({
    id: r.id, hex: r.hex, name: r.name, sort_order: r.sort_order,
    material_key: r.material_key || null,
    images: safeJsonArray(r.images),
  })))
})

function safeJsonArray(s) {
  try { const v = JSON.parse(s); return Array.isArray(v) ? v : [] } catch { return [] }
}

// ── Per-Accessory: Schuh-Zuweisung (Zubehör → Schuhe) ─────────────────────
// GET /api/accessories/:id/shoes — admin/curator
accessoriesRouter.get('/:id/shoes', ...canWrite, param('id').isInt(), (req, res) => {
  const rows = getDb().prepare(`
    SELECT s.id, s.name, s.category, sa.sort_order
    FROM shoe_accessories sa
    JOIN shoes s ON s.id = sa.shoe_id
    WHERE sa.accessory_id = ?
    ORDER BY sa.sort_order ASC, s.id ASC
  `).all(req.params.id)
  res.json(rows)
})

// PUT /api/accessories/:id/shoes — admin/curator (Vollersatz)
accessoriesRouter.put('/:id/shoes', ...canWrite, param('id').isInt(), (req, res) => {
  const db = getDb()
  const accId = parseInt(req.params.id)
  if (!db.prepare('SELECT id FROM accessories WHERE id = ?').get(accId)) {
    return res.status(404).json({ error: 'Accessory not found' })
  }
  const shoeIds = Array.isArray(req.body.shoe_ids) ? req.body.shoe_ids : []
  db.transaction(() => {
    db.prepare('DELETE FROM shoe_accessories WHERE accessory_id = ?').run(accId)
    const ins = db.prepare('INSERT INTO shoe_accessories (shoe_id, accessory_id, sort_order) VALUES (?, ?, ?)')
    shoeIds.forEach((sid, i) => { if (Number.isInteger(sid)) ins.run(sid, accId, i) })
  })()
  const rows = db.prepare(`
    SELECT s.id, s.name, s.category, sa.sort_order
    FROM shoe_accessories sa
    JOIN shoes s ON s.id = sa.shoe_id
    WHERE sa.accessory_id = ?
    ORDER BY sa.sort_order ASC, s.id ASC
  `).all(accId)
  res.json(rows)
})

export default router
