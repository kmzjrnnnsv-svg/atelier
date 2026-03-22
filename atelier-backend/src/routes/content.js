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

export default router
