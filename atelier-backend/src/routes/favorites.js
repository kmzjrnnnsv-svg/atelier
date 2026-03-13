import { Router } from 'express'
import { getDb } from '../db/database.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

// GET /api/favorites/mine
router.get('/mine', authenticate, (req, res) => {
  const rows = getDb()
    .prepare('SELECT shoe_id, created_at FROM favorites WHERE user_id = ?')
    .all(req.user.id)
  res.json(rows)
})

// POST /api/favorites/:shoeId
router.post('/:shoeId', authenticate, (req, res) => {
  try {
    getDb()
      .prepare('INSERT OR IGNORE INTO favorites (user_id, shoe_id) VALUES (?, ?)')
      .run(req.user.id, req.params.shoeId)
    res.status(201).json({ shoe_id: Number(req.params.shoeId) })
  } catch {
    res.status(400).json({ error: 'Invalid shoe' })
  }
})

// DELETE /api/favorites/:shoeId
router.delete('/:shoeId', authenticate, (req, res) => {
  getDb()
    .prepare('DELETE FROM favorites WHERE user_id = ? AND shoe_id = ?')
    .run(req.user.id, req.params.shoeId)
  res.json({ message: 'Removed' })
})

export default router
