import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { getDb } from '../db/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()
const canWrite = [authenticate, requireRole('admin', 'curator')]

// GET /api/feedback/mine — user's own tickets
router.get('/mine', authenticate, (req, res) => {
  const rows = getDb()
    .prepare(`SELECT ft.*, o.shoe_name, o.order_ref
              FROM feedback_tickets ft
              LEFT JOIN orders o ON o.id = ft.order_id
              WHERE ft.user_id = ?
              ORDER BY ft.created_at DESC`)
    .all(req.user.id)
  res.json(rows)
})

// GET /api/feedback/all — admin/curator view
router.get('/all', ...canWrite, (req, res) => {
  const rows = getDb()
    .prepare(`SELECT ft.*, u.name as user_name, u.email as user_email,
                     o.shoe_name, o.order_ref
              FROM feedback_tickets ft
              JOIN users u ON u.id = ft.user_id
              LEFT JOIN orders o ON o.id = ft.order_id
              ORDER BY
                CASE ft.status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 WHEN 'resolved' THEN 2 ELSE 3 END,
                ft.created_at DESC`)
    .all()
  res.json(rows)
})

// POST /api/feedback — user creates ticket
router.post('/',
  authenticate,
  body('subject').trim().notEmpty().withMessage('Betreff erforderlich'),
  body('message').trim().notEmpty().withMessage('Nachricht erforderlich'),
  body('type').optional().isIn(['feedback', 'complaint', 'question', 'return']),
  body('order_id').optional({ nullable: true }).isInt(),
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const { subject, message, type, order_id } = req.body
    const db = getDb()

    const result = db.prepare(`
      INSERT INTO feedback_tickets (user_id, order_id, type, subject, message)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.user.id, order_id || null, type || 'feedback', subject, message)

    const row = db.prepare('SELECT * FROM feedback_tickets WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(row)
  }
)

// PUT /api/feedback/:id — admin updates ticket (status, notes)
router.put('/:id', ...canWrite, (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM feedback_tickets WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Not found' })

  const { status, admin_notes } = req.body
  const updates = []
  const vals = []

  if (status) { updates.push('status = ?'); vals.push(status) }
  if (admin_notes !== undefined) { updates.push('admin_notes = ?'); vals.push(admin_notes) }
  if (status === 'resolved' || status === 'closed') {
    updates.push('resolved_by = ?'); vals.push(req.user.id)
  }
  updates.push("updated_at = datetime('now')")

  if (updates.length > 1) {
    db.prepare(`UPDATE feedback_tickets SET ${updates.join(', ')} WHERE id = ?`).run(...vals, req.params.id)
  }

  const row = db.prepare(`SELECT ft.*, u.name as user_name, u.email as user_email,
                           o.shoe_name, o.order_ref
                    FROM feedback_tickets ft
                    JOIN users u ON u.id = ft.user_id
                    LEFT JOIN orders o ON o.id = ft.order_id
                    WHERE ft.id = ?`).get(req.params.id)
  res.json(row)
})

// DELETE /api/feedback/:id — admin deletes ticket
router.delete('/:id', ...canWrite, (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM feedback_tickets WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Not found' })
  db.prepare('DELETE FROM feedback_tickets WHERE id = ?').run(req.params.id)
  res.json({ message: 'Deleted' })
})

export default router
