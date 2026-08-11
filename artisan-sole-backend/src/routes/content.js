import { Router } from 'express'
import { body, param, validationResult } from 'express-validator'
import { getDb } from '../db/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { uniqueShoeSlug } from '../utils/slug.js'

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
    if (onWrite) Object.assign(body, onWrite(body, { db: getDb(), id: null }))
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
    if (onWrite) Object.assign(writeBody, pickValidColumns(table, onWrite(writeBody, { db, id: Number(req.params.id) })))
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
  onWrite: (body, { db, id }) =>
    body.name ? { slug: uniqueShoeSlug(db, body.name, id) } : {},
  // Löschung vormerken, damit der Seed das Modell nicht beim nächsten Start
  // wieder anlegt — er kennt seine Modelle über den Namen.
  onDelete: (row, { db }) => {
    db.prepare('INSERT OR REPLACE INTO deleted_seed_shoes (name, deleted_at) VALUES (?, datetime(\'now\'))').run(row.name)
  },
})
export const materialsRouter  = makeContentRouter('shoe_materials', [], { publicRead: true })
export const colorsRouter     = makeContentRouter('shoe_colors', [], { publicRead: true })
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
