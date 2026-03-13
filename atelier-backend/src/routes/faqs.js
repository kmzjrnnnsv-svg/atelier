import { Router } from 'express'
import { body, param, validationResult } from 'express-validator'
import { getDb } from '../db/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()
const canRead  = authenticate
const canWrite = [authenticate, requireRole('admin', 'curator')]

// GET /api/faqs
router.get('/', canRead, (req, res) => {
  const rows = getDb()
    .prepare('SELECT * FROM faqs ORDER BY sort_order ASC, id ASC')
    .all()
  res.json(rows)
})

// POST /api/faqs
router.post('/',
  ...canWrite,
  body('question').trim().notEmpty().withMessage('Question required'),
  body('answer').trim().notEmpty().withMessage('Answer required'),
  body('category').optional().trim(),
  body('sort_order').optional().isInt({ min: 0 }),
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const { question, answer, category, sort_order } = req.body
    const db = getDb()
    const result = db
      .prepare('INSERT INTO faqs (question, answer, category, sort_order, created_by) VALUES (?,?,?,?,?)')
      .run(question, answer, category || 'Allgemein', sort_order || 0, req.user.id)
    res.status(201).json(db.prepare('SELECT * FROM faqs WHERE id = ?').get(result.lastInsertRowid))
  }
)

// PUT /api/faqs/:id
router.put('/:id',
  ...canWrite,
  param('id').isInt(),
  body('question').trim().notEmpty().withMessage('Question required'),
  body('answer').trim().notEmpty().withMessage('Answer required'),
  body('category').optional().trim(),
  body('sort_order').optional().isInt({ min: 0 }),
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const db = getDb()
    if (!db.prepare('SELECT id FROM faqs WHERE id = ?').get(req.params.id)) {
      return res.status(404).json({ error: 'Not found' })
    }

    const { question, answer, category, sort_order } = req.body
    db.prepare("UPDATE faqs SET question=?, answer=?, category=?, sort_order=?, updated_at=datetime('now') WHERE id=?")
      .run(question, answer, category || 'Allgemein', sort_order || 0, req.params.id)
    res.json(db.prepare('SELECT * FROM faqs WHERE id = ?').get(req.params.id))
  }
)

// DELETE /api/faqs/:id
router.delete('/:id',
  ...canWrite,
  param('id').isInt(),
  (req, res) => {
    const db = getDb()
    if (!db.prepare('SELECT id FROM faqs WHERE id = ?').get(req.params.id)) {
      return res.status(404).json({ error: 'Not found' })
    }
    db.prepare('DELETE FROM faqs WHERE id = ?').run(req.params.id)
    res.json({ message: 'Deleted' })
  }
)

export default router
