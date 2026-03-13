import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { getDb } from '../db/database.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

// GET /api/reviews/shoe/:shoeId
router.get('/shoe/:shoeId', authenticate, (req, res) => {
  const rows = getDb()
    .prepare(`SELECT r.*, u.name as user_name
              FROM reviews r JOIN users u ON u.id = r.user_id
              WHERE r.shoe_id = ?
              ORDER BY r.created_at DESC`)
    .all(req.params.shoeId)
  res.json(rows)
})

// POST /api/reviews
router.post('/',
  authenticate,
  body('shoe_id').isInt().withMessage('shoe_id must be integer'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('rating 1–5 required'),
  body('comment').optional().trim().isLength({ max: 1000 }),
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const db = getDb()
    try {
      const result = db
        .prepare('INSERT INTO reviews (user_id, shoe_id, rating, comment) VALUES (?,?,?,?)')
        .run(req.user.id, req.body.shoe_id, req.body.rating, req.body.comment || null)
      const row = db
        .prepare(`SELECT r.*, u.name as user_name
                  FROM reviews r JOIN users u ON u.id = r.user_id
                  WHERE r.id = ?`)
        .get(result.lastInsertRowid)
      res.status(201).json(row)
    } catch (err) {
      if (err.message?.includes('UNIQUE')) {
        return res.status(409).json({ error: 'You already reviewed this shoe' })
      }
      throw err
    }
  }
)

// PUT /api/reviews/:id (own review only)
router.put('/:id',
  authenticate,
  body('rating').isInt({ min: 1, max: 5 }),
  body('comment').optional().trim().isLength({ max: 1000 }),
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const db = getDb()
    const rev = db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id)
    if (!rev) return res.status(404).json({ error: 'Not found' })
    if (rev.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' })

    db.prepare("UPDATE reviews SET rating = ?, comment = ?, updated_at = datetime('now') WHERE id = ?")
      .run(req.body.rating, req.body.comment || null, req.params.id)

    const row = db
      .prepare(`SELECT r.*, u.name as user_name
                FROM reviews r JOIN users u ON u.id = r.user_id
                WHERE r.id = ?`)
      .get(req.params.id)
    res.json(row)
  }
)

// DELETE /api/reviews/:id (own or admin)
router.delete('/:id', authenticate, (req, res) => {
  const db = getDb()
  const rev = db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id)
  if (!rev) return res.status(404).json({ error: 'Not found' })
  if (rev.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' })
  }
  db.prepare('DELETE FROM reviews WHERE id = ?').run(req.params.id)
  res.json({ message: 'Deleted' })
})

export default router
