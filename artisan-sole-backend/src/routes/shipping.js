import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { getDb } from '../db/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()
const adminOnly = [authenticate, requireRole('admin')]

// GET /api/shipping — active options (public)
router.get('/', (req, res) => {
  const rows = getDb()
    .prepare('SELECT * FROM shipping_config WHERE is_active = 1 ORDER BY price ASC')
    .all()
  res.json(rows)
})

// GET /api/shipping/all — all options (admin)
router.get('/all', ...adminOnly, (req, res) => {
  const rows = getDb()
    .prepare('SELECT * FROM shipping_config ORDER BY price ASC')
    .all()
  res.json(rows)
})

// POST /api/shipping — create (admin)
router.post('/',
  ...adminOnly,
  body('key').trim().notEmpty(),
  body('label').trim().notEmpty(),
  body('price').isFloat({ min: 0 }),
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const { key, label, description, price, free_above, is_default } = req.body
    const db = getDb()

    if (is_default) {
      db.prepare('UPDATE shipping_config SET is_default = 0').run()
    }

    const result = db.prepare(`
      INSERT INTO shipping_config (key, label, description, price, free_above, is_default, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(key, label, description || null, price, free_above || null, is_default ? 1 : 0, req.user.id)

    const row = db.prepare('SELECT * FROM shipping_config WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(row)
  }
)

// PUT /api/shipping/:id — update (admin)
router.put('/:id', ...adminOnly, (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM shipping_config WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Not found' })

  const { label, description, price, free_above, is_default, is_active } = req.body

  if (is_default) {
    db.prepare('UPDATE shipping_config SET is_default = 0').run()
  }

  db.prepare(`
    UPDATE shipping_config
    SET label = ?, description = ?, price = ?, free_above = ?, is_default = ?, is_active = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    label ?? existing.label,
    description ?? existing.description,
    price ?? existing.price,
    free_above !== undefined ? free_above : existing.free_above,
    is_default !== undefined ? (is_default ? 1 : 0) : existing.is_default,
    is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
    req.params.id
  )

  const row = db.prepare('SELECT * FROM shipping_config WHERE id = ?').get(req.params.id)
  res.json(row)
})

// DELETE /api/shipping/:id — deactivate (admin)
router.delete('/:id', ...adminOnly, (req, res) => {
  const db = getDb()
  db.prepare("UPDATE shipping_config SET is_active = 0, updated_at = datetime('now') WHERE id = ?")
    .run(req.params.id)
  res.json({ ok: true })
})

export default router
