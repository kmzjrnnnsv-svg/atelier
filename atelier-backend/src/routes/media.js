import { Router } from 'express'
import { getDb } from '../db/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

// GET /api/media — list all CMS media (returns id, name, image_data, created_at)
router.get('/', (req, res) => {
  const db = getDb()
  const rows = db.prepare('SELECT id, name, image_data, created_at FROM cms_media ORDER BY created_at DESC').all()
  res.json(rows)
})

// POST /api/media — upload a new CMS image (base64 data URI)
router.post('/', authenticate, requireRole('admin', 'curator'), (req, res) => {
  const { name, image_data } = req.body
  if (!name || !image_data) return res.status(400).json({ error: 'Name und Bild erforderlich' })

  const sizeBytes = Buffer.byteLength(image_data, 'utf8')
  if (sizeBytes > 5 * 1024 * 1024) return res.status(400).json({ error: 'Bild zu groß (max 5 MB)' })

  const db = getDb()
  const result = db.prepare(
    'INSERT INTO cms_media (name, image_data, created_by, created_at) VALUES (?, ?, ?, datetime(\'now\'))'
  ).run(name, image_data, req.user.id)

  res.json({ id: result.lastInsertRowid, name, image_data, message: 'Bild hochgeladen' })
})

// DELETE /api/media/:id — delete a CMS image
router.delete('/:id', authenticate, requireRole('admin', 'curator'), (req, res) => {
  const db = getDb()
  db.prepare('DELETE FROM cms_media WHERE id = ?').run(req.params.id)
  res.json({ message: 'Bild gelöscht' })
})

export default router
