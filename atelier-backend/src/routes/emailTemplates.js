import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { getDb } from '../db/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()
const canAccess = [authenticate, requireRole('admin', 'curator')]

// GET /api/email-templates — all templates
router.get('/', ...canAccess, (req, res) => {
  const rows = getDb().prepare('SELECT * FROM email_templates ORDER BY rowid').all()
  res.json(rows)
})

// GET /api/email-templates/:type — single template
router.get('/:type', ...canAccess, (req, res) => {
  const row = getDb().prepare('SELECT * FROM email_templates WHERE type = ?').get(req.params.type)
  if (!row) return res.status(404).json({ error: 'Not found' })
  res.json(row)
})

// PUT /api/email-templates/:type — update subject/intro/body
router.put('/:type',
  ...canAccess,
  body('subject').trim().notEmpty().withMessage('Subject erforderlich'),
  body('intro').trim().notEmpty().withMessage('Intro erforderlich'),
  body('body').trim().notEmpty().withMessage('Body erforderlich'),
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const db = getDb()
    const existing = db.prepare('SELECT type FROM email_templates WHERE type = ?').get(req.params.type)
    if (!existing) return res.status(404).json({ error: 'Vorlage nicht gefunden' })

    db.prepare(`
      UPDATE email_templates
      SET subject = ?, intro = ?, body = ?, updated_by = ?, updated_at = datetime('now')
      WHERE type = ?
    `).run(req.body.subject, req.body.intro, req.body.body, req.user.id, req.params.type)

    const row = db.prepare('SELECT * FROM email_templates WHERE type = ?').get(req.params.type)
    res.json(row)
  }
)

export default router
