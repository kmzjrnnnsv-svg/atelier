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

// Bild-Upload: Die gespeicherte Endung wird vom Server aus dem (geprüften)
// MIME-Typ bestimmt — nie aus originalname übernommen. Sonst konnte eine Datei
// `x.html`/`x.svg` mit vorgetäuschtem `Content-Type: image/png` den Filter
// passieren, als HTML/SVG aus /uploads ausgeliefert werden und dort Skriptcode
// ausführen (Stored XSS). SVG ist bewusst nicht erlaubt (skriptfähig).
const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']
const MIME_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/png':  '.png',
  'image/webp': '.webp',
  'image/gif':  '.gif',
  'image/avif': '.avif',
}
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    // Endung ausschließlich aus dem MIME-Typ ableiten (im fileFilter geprüft).
    const ext = MIME_TO_EXT[file.mimetype] || '.bin'
    cb(null, `${crypto.randomUUID()}${ext}`)
  },
})

const upload = multer({
  storage: imageStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    // Beide müssen stimmen: bekannter Bild-MIME-Typ UND Bild-Endung.
    if (MIME_TO_EXT[file.mimetype] && IMAGE_EXT.includes(ext)) cb(null, true)
    else cb(new Error('Nur Bilder erlaubt (jpg, png, webp, gif, avif)'))
  },
})

// ── 3D-Modelle je Schuh ───────────────────────────────────────────────────
// Getrennt vom Bild-Upload: andere Dateitypen, anderes Größenlimit und die
// Dateien gehören zu einem Modell, nicht in die allgemeine Mediathek.
const MODEL_EXT = ['.glb', '.gltf']
const modelStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${crypto.randomUUID()}${MODEL_EXT.includes(ext) ? ext : '.glb'}`)
  },
})
const modelUpload = multer({
  storage: modelStorage,
  limits: { fileSize: 40 * 1024 * 1024 },   // 3D-Dateien sind deutlich größer
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    if (MODEL_EXT.includes(ext)) cb(null, true)
    else cb(new Error('Nur .glb oder .gltf erlaubt'))
  },
})

// POST /api/media/model — admin/curator. Liefert { url }.
router.post('/model', authenticate, requireRole('admin', 'curator'), (req, res) => {
  modelUpload.single('file')(req, res, (err) => {
    // Multer meldet Größen- und Typfehler über den Callback, nicht als Wurf.
    // Ohne diese Behandlung liefe ein zu großer Upload in einen 500er.
    if (err) return res.status(400).json({ error: err.message || 'Upload fehlgeschlagen' })
    if (!req.file) return res.status(400).json({ error: 'Keine Datei hochgeladen' })
    res.json({ url: `/uploads/${req.file.filename}`, name: req.file.originalname })
  })
})

// GET /api/media — list all CMS media (returns id, name, url, created_at)
router.get('/', authenticate, requireRole('admin', 'curator'), (req, res) => {
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
