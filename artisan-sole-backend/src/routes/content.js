import { Router } from 'express'
import { body, param, validationResult } from 'express-validator'
import { getDb } from '../db/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()
const canWrite = [authenticate, requireRole('admin', 'curator')]
const mustRead = [authenticate]

function makeContentRouter(table, writeValidators = [], { publicRead = false } = {}) {
  const r = Router()
  const readGuard = publicRead ? [] : mustRead

  // GET all
  r.get('/', ...readGuard, (req, res) => {
    const rows = getDb().prepare(`SELECT * FROM ${table} ORDER BY id ASC`).all()
    res.json(rows)
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
    const cols = Object.keys(body).join(', ')
    const vals = Object.keys(body).map(() => '?').join(', ')
    const result = getDb()
      .prepare(`INSERT INTO ${table} (${cols}) VALUES (${vals})`)
      .run(...Object.values(body))

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

    const updates = { ...req.body, updated_at: "datetime('now')" }
    delete updates.created_by
    delete updates.id

    const set = Object.keys(req.body)
      .filter(k => k !== 'id' && k !== 'created_by')
      .map(k => `${k} = ?`).join(', ')
    const vals = Object.keys(req.body)
      .filter(k => k !== 'id' && k !== 'created_by')
      .map(k => req.body[k])

    db.prepare(`UPDATE ${table} SET ${set}, updated_at = datetime('now') WHERE id = ?`)
      .run(...vals, req.params.id)

    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.params.id)
    res.json(row)
  })

  // DELETE
  r.delete('/:id', ...canWrite, param('id').isInt(), (req, res) => {
    const db = getDb()
    const existing = db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(req.params.id)
    if (!existing) return res.status(404).json({ error: 'Not found' })
    db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(req.params.id)
    res.json({ message: 'Deleted' })
  })

  return r
}

// Shoes validators
const shoeValidators = [
  body('name').trim().notEmpty().withMessage('Name required'),
  body('category').isIn(['OXFORD','LOAFER','DERBY','BOOT','SNEAKER','MONK']),
  body('price').trim().notEmpty().withMessage('Price required'),
  body('material').trim().notEmpty().withMessage('Material required'),
  body('image_data').optional().custom(v => {
    if (v && Buffer.byteLength(v, 'base64') > 3 * 1024 * 1024)
      throw new Error('Image too large (max 3MB)')
    return true
  }),
]

// Outfit validators
const outfitValidators = [
  body('style').trim().notEmpty(),
  body('description').trim().notEmpty(),
  body('top').trim().notEmpty(),
  body('bottom').trim().notEmpty(),
  body('shoe').trim().notEmpty(),
]

// Article validators
const articleValidators = [
  body('title').trim().notEmpty().withMessage('Title required'),
  body('content').trim().notEmpty().withMessage('Content required'),
  body('category').optional().trim(),
  body('slug').optional().trim(),
  body('excerpt').optional().trim().isLength({ max: 400 }),
  body('featured').optional().isInt({ min: 0, max: 1 }),
  body('sort_order').optional().isInt({ min: 0 }),
  body('image_data').optional().custom(v => {
    if (v && Buffer.byteLength(v, 'base64') > 3 * 1024 * 1024)
      throw new Error('Image too large (max 3MB)')
    return true
  }),
]

// Explore section validators
const exploreValidators = [
  body('key').trim().notEmpty().withMessage('Key required'),
  body('label').trim().notEmpty().withMessage('Label required'),
  body('title').trim().notEmpty().withMessage('Title required'),
  body('description').optional().trim(),
  body('tag').optional().trim(),
  body('color').optional().trim(),
  body('accent').optional().trim(),
  body('icon').optional().trim(),
  body('image_data').optional().custom(v => {
    if (v && Buffer.byteLength(v, 'base64') > 3 * 1024 * 1024)
      throw new Error('Image too large (max 3MB)')
    return true
  }),
  body('preview_items').optional().trim(),
  body('visible').optional().isInt({ min: 0, max: 1 }),
  body('sort_order').optional().isInt({ min: 0 }),
]

export const shoesRouter      = makeContentRouter('shoes', shoeValidators, { publicRead: true })
export const curatedRouter    = makeContentRouter('curated_items')
export const wardrobeRouter   = makeContentRouter('wardrobe_items')
export const outfitsRouter    = makeContentRouter('outfits', outfitValidators)
export const articlesRouter   = makeContentRouter('articles', articleValidators, { publicRead: true })
export const materialsRouter  = makeContentRouter('shoe_materials', [], { publicRead: true })
export const colorsRouter     = makeContentRouter('shoe_colors', [], { publicRead: true })
export const solesRouter      = makeContentRouter('shoe_soles', [], { publicRead: true })
export const exploreSectionsRouter = makeContentRouter('explore_sections', exploreValidators, { publicRead: true })
export const accessoriesRouter    = makeContentRouter('accessories', [], { publicRead: true })

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

// GET /api/accessories/by-shoe — public: bulk fetch all shoe→accessory mappings
accessoriesRouter.get('/by-shoe', (req, res) => {
  const rows = getDb().prepare(`
    SELECT sa.shoe_id, a.*
    FROM shoe_accessories sa
    JOIN accessories a ON a.id = sa.accessory_id
    WHERE a.is_active = 1
    ORDER BY sa.shoe_id, sa.sort_order ASC, a.sort_order ASC
  `).all()
  // Group by shoe_id
  const map = {}
  for (const r of rows) {
    if (!map[r.shoe_id]) map[r.shoe_id] = []
    map[r.shoe_id].push(r)
  }
  res.json(map)
})

export default router
