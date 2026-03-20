import { Router } from 'express'
import { body, param, validationResult } from 'express-validator'
import { getDb } from '../db/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()
const canWrite = [authenticate, requireRole('admin', 'curator')]

// GET /api/loyalty/tiers — all tiers (auth required)
router.get('/tiers', authenticate, (req, res) => {
  const rows = getDb().prepare('SELECT * FROM loyalty_tiers ORDER BY sort_order ASC').all()
  res.json(rows)
})

// GET /api/loyalty/my-status — current user's loyalty status
router.get('/my-status', authenticate, (req, res) => {
  const user = getDb().prepare('SELECT loyalty_points, loyalty_tier FROM users WHERE id = ?').get(req.user.id)
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json({ points: user.loyalty_points, tier: user.loyalty_tier })
})

// POST /api/loyalty/tiers — create tier (admin/curator)
router.post('/tiers', ...canWrite,
  body('key').trim().notEmpty(),
  body('label').trim().notEmpty(),
  body('min_points').isInt({ min: 0 }),
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const { key, label, min_points, color, icon, description, benefits, visible, sort_order } = req.body
    const db = getDb()
    const result = db.prepare(`
      INSERT INTO loyalty_tiers (key, label, min_points, color, icon, description, benefits, visible, sort_order, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(key, label, min_points, color || '#000000', icon || 'Award', description || null, benefits || '[]', visible ?? 1, sort_order || 0, req.user.id)

    const row = db.prepare('SELECT * FROM loyalty_tiers WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(row)
  }
)

// PUT /api/loyalty/tiers/:id — update tier (admin/curator)
router.put('/tiers/:id', ...canWrite, param('id').isInt(), (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM loyalty_tiers WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Not found' })

  const fields = ['key', 'label', 'min_points', 'color', 'icon', 'description', 'benefits', 'visible', 'sort_order']
  const updates = fields.filter(f => req.body[f] !== undefined)
  if (updates.length === 0) return res.json(db.prepare('SELECT * FROM loyalty_tiers WHERE id = ?').get(req.params.id))

  const set = updates.map(f => `${f} = ?`).join(', ')
  const vals = updates.map(f => req.body[f])
  db.prepare(`UPDATE loyalty_tiers SET ${set}, updated_at = datetime('now') WHERE id = ?`).run(...vals, req.params.id)

  const row = db.prepare('SELECT * FROM loyalty_tiers WHERE id = ?').get(req.params.id)
  res.json(row)
})

// DELETE /api/loyalty/tiers/:id — delete tier (admin/curator)
router.delete('/tiers/:id', ...canWrite, param('id').isInt(), (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM loyalty_tiers WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Not found' })
  db.prepare('DELETE FROM loyalty_tiers WHERE id = ?').run(req.params.id)
  res.json({ message: 'Deleted' })
})

// PUT /api/loyalty/users/:id/points — admin manually set points
router.put('/users/:id/points', ...canWrite, param('id').isInt(),
  body('points').isInt({ min: 0 }),
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const db = getDb()
    const points = req.body.points

    // Determine new tier based on points
    const tiers = db.prepare('SELECT key, min_points FROM loyalty_tiers ORDER BY min_points DESC').all()
    let newTier = 'bronze'
    for (const t of tiers) {
      if (points >= t.min_points) { newTier = t.key; break }
    }

    db.prepare('UPDATE users SET loyalty_points = ?, loyalty_tier = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(points, newTier, req.params.id)

    res.json({ points, tier: newTier })
  }
)

// GET /api/loyalty/settings — get expiry settings
router.get('/settings', ...canWrite, (req, res) => {
  const db = getDb()
  const row = db.prepare("SELECT value FROM settings WHERE key = 'loyalty_expiry_days'").get()
  res.json({ expiry_days: row ? parseInt(row.value, 10) : 365 })
})

// PUT /api/loyalty/settings — update expiry settings
router.put('/settings', ...canWrite, (req, res) => {
  const db = getDb()
  const { expiry_days } = req.body
  const days = parseInt(expiry_days, 10)
  if (isNaN(days) || days < 0) return res.status(400).json({ error: 'Ungültige Tage' })

  db.prepare(`
    INSERT INTO settings (key, value, updated_by, updated_at)
    VALUES ('loyalty_expiry_days', ?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at
  `).run(String(days), req.user.id)

  res.json({ expiry_days: days })
})

// POST /api/loyalty/expire — run expiration check (admin/curator trigger)
router.post('/expire', ...canWrite, (req, res) => {
  const db = getDb()
  const expiryRow = db.prepare("SELECT value FROM settings WHERE key = 'loyalty_expiry_days'").get()
  const expiryDays = expiryRow ? parseInt(expiryRow.value, 10) : 365
  if (expiryDays <= 0) return res.json({ expired: 0, message: 'Verfall deaktiviert' })

  // Find gold tier threshold to exclude gold+ users
  const goldTier = db.prepare("SELECT min_points FROM loyalty_tiers WHERE key = 'gold'").get()
  const goldThreshold = goldTier?.min_points || 1500

  // Users below gold threshold whose last order was > expiryDays ago
  const expired = db.prepare(`
    UPDATE users SET loyalty_points = 0, loyalty_tier = 'bronze', updated_at = datetime('now')
    WHERE loyalty_points > 0
      AND loyalty_points < ?
      AND (last_order_at IS NULL OR last_order_at < datetime('now', ?))
  `).run(goldThreshold, `-${expiryDays} days`)

  res.json({ expired: expired.changes, message: `${expired.changes} Benutzer-Punkte verfallen.` })
})

export default router
