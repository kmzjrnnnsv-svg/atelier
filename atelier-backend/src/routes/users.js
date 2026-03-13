import { Router } from 'express'
import { body, param, validationResult } from 'express-validator'
import { getDb } from '../db/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()
router.use(authenticate, requireRole('admin'))

// GET /api/users
router.get('/', (req, res) => {
  const users = getDb().prepare(`
    SELECT id, name, email, role, is_active, created_at, updated_at
    FROM users ORDER BY created_at DESC
  `).all()
  res.json(users)
})

// PATCH /api/users/:id/role
router.patch('/:id/role',
  param('id').isInt(),
  body('role').isIn(['admin', 'curator', 'user']),
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const targetId = parseInt(req.params.id)
    if (targetId === req.user.id) {
      return res.status(400).json({ error: 'Cannot change your own role' })
    }

    const db = getDb()
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(targetId)
    if (!user) return res.status(404).json({ error: 'User not found' })

    db.prepare("UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?")
      .run(req.body.role, targetId)

    res.json({ message: 'Role updated' })
  }
)

// PATCH /api/users/:id/status
router.patch('/:id/status',
  param('id').isInt(),
  body('is_active').isBoolean(),
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const targetId = parseInt(req.params.id)
    if (targetId === req.user.id) {
      return res.status(400).json({ error: 'Cannot deactivate yourself' })
    }

    const db = getDb()
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(targetId)
    if (!user) return res.status(404).json({ error: 'User not found' })

    const active = req.body.is_active ? 1 : 0
    db.prepare("UPDATE users SET is_active = ?, updated_at = datetime('now') WHERE id = ?")
      .run(active, targetId)

    // Revoke all refresh tokens if deactivating
    if (!active) {
      db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(targetId)
    }

    res.json({ message: active ? 'User activated' : 'User deactivated' })
  }
)

// DELETE /api/users/:id
router.delete('/:id', param('id').isInt(), (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

  const targetId = parseInt(req.params.id)
  if (targetId === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete yourself' })
  }

  const db = getDb()
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(targetId)
  if (!user) return res.status(404).json({ error: 'User not found' })

  db.prepare('DELETE FROM users WHERE id = ?').run(targetId)
  res.json({ message: 'User deleted' })
})

export default router
