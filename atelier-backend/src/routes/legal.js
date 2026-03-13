import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { getDb } from '../db/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()
const TYPES    = ['datenschutz', 'agb', 'impressum']
const canWrite = [authenticate, requireRole('admin', 'curator')]

// GET /api/legal/:type
router.get('/:type', authenticate, (req, res) => {
  if (!TYPES.includes(req.params.type)) {
    return res.status(400).json({ error: 'Invalid type. Must be: datenschutz, agb, impressum' })
  }
  const row = getDb()
    .prepare('SELECT * FROM legal_docs WHERE type = ?')
    .get(req.params.type)
  if (!row) return res.json({ type: req.params.type, title: '', content: '' })
  res.json(row)
})

// PUT /api/legal/:type (upsert)
router.put('/:type',
  ...canWrite,
  body('title').trim().notEmpty().withMessage('Title required'),
  body('content').trim().notEmpty().withMessage('Content required'),
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    if (!TYPES.includes(req.params.type)) {
      return res.status(400).json({ error: 'Invalid type' })
    }

    const db = getDb()
    db.prepare(`
      INSERT INTO legal_docs (type, title, content, updated_by)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(type) DO UPDATE SET
        title      = excluded.title,
        content    = excluded.content,
        updated_by = excluded.updated_by,
        updated_at = datetime('now')
    `).run(req.params.type, req.body.title, req.body.content, req.user.id)

    res.json(db.prepare('SELECT * FROM legal_docs WHERE type = ?').get(req.params.type))
  }
)

export default router
