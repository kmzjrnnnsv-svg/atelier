import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { getDb } from '../db/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

// Uploads directory — next to the DB file
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads')
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true })

// Multer storage: random filename, keep extension
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg'
    cb(null, `${crypto.randomUUID()}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Nur Bilder erlaubt'))
  },
})

// GET /api/media — list all CMS media (returns id, name, url, created_at)
router.get('/', (req, res) => {
  const db = getDb()
  const rows = db.prepare('SELECT id, name, filename, created_at FROM cms_media ORDER BY created_at DESC').all()
  res.json(rows.map(r => ({
    id: r.id,
    name: r.name,
    url: `/uploads/${r.filename}`,
    created_at: r.created_at,
  })))
})

// POST /api/media — upload a new CMS image (multipart file)
router.post('/', authenticate, requireRole('admin', 'curator'), upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Keine Datei hochgeladen' })

  const db = getDb()
  const result = db.prepare(
    "INSERT INTO cms_media (name, filename, created_by, created_at) VALUES (?, ?, ?, datetime('now'))"
  ).run(req.file.originalname, req.file.filename, req.user.id)

  res.json({
    id: result.lastInsertRowid,
    name: req.file.originalname,
    url: `/uploads/${req.file.filename}`,
    message: 'Bild hochgeladen',
  })
})

// DELETE /api/media/:id — delete a CMS image (DB + file)
router.delete('/:id', authenticate, requireRole('admin', 'curator'), (req, res) => {
  const db = getDb()
  const row = db.prepare('SELECT filename FROM cms_media WHERE id = ?').get(req.params.id)
  if (row?.filename) {
    const filePath = path.join(UPLOADS_DIR, row.filename)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  }
  db.prepare('DELETE FROM cms_media WHERE id = ?').run(req.params.id)
  res.json({ message: 'Bild gelöscht' })
})

export default router
