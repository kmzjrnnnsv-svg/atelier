import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { body, param, validationResult } from 'express-validator'
import { getDb } from '../db/database.js'
import { authenticate, authenticateOptional, requireRole } from '../middleware/auth.js'
import { sendInquiryNotification, sendInquiryAck } from '../utils/email.js'

const router = Router()
const canManage = [authenticate, requireRole('admin', 'curator')]

// Die Anfrage ist öffentlich und verschickt zwei E-Mails — ohne eigene Bremse
// ein Spam-/Missbrauchsvektor. Eigener Limiter (nicht der globale apiLimiter),
// damit ein Angreifer nicht die Mail-Auslösung, aber der normale Betrieb die
// Katalog-Abrufe teilen.
const inquiryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: process.env.NODE_ENV !== 'production' ? 100 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Anfragen, bitte später erneut versuchen' },
})

const VALID_STATUS = ['open', 'contacted', 'in_progress', 'quoted', 'accepted', 'declined', 'closed']

// POST /api/custom-requests, guests + users may submit a Custom-Anfrage
router.post('/',
  inquiryLimiter,
  authenticateOptional,
  body('customer_name').trim().notEmpty().withMessage('Name erforderlich'),
  body('customer_email').trim().isEmail().withMessage('Gültige E-Mail erforderlich'),
  // Telefon ist freiwillig: Die E-Mail-Adresse genügt, um zu antworten, und
  // eine Pflichtnummer kostet Anfragen von Leuten, die nicht angerufen werden
  // wollen. Steht etwas drin, muss es aber eine Nummer sein.
  body('customer_phone').optional({ values: 'falsy' }).trim()
    .matches(/^[+0-9 ()/-]{6,}$/).withMessage('Ungültige Telefonnummer'),
  // Ohne Anliegen ist eine Anfrage nicht zu beantworten.
  body('notes').trim().notEmpty().withMessage('Bitte schildern Sie kurz Ihr Anliegen'),
  // `values: 'null'` statt des bloßen `optional()`: Das Formular schickt für
  // nicht ausgefüllte Angaben ausdrücklich `null` (etwa eu_size, solange keine
  // Maße hinterlegt sind, oder sole bei Modellen ohne Sohlenwahl). Ein nacktes
  // `optional()` überspringt aber nur `undefined` — `null` lief in die Prüfung
  // und die Anfrage scheiterte mit „Invalid value", ohne dass der Kunde
  // erkennen konnte, woran.
  body('shoe_id').optional({ values: 'null' }).isInt(),
  body('scan_id').optional({ values: 'null' }).isInt(),
  body('shoe_name').optional({ values: 'null' }).isString(),
  body('material').optional({ values: 'null' }).isString(),
  body('color').optional({ values: 'null' }).isString(),
  body('sole').optional({ values: 'null' }).isString(),
  body('eu_size').optional({ values: 'null' }).isString(),
  body('accessories').optional({ values: 'null' }).isArray(),
  body('source').optional({ values: 'null' }).isIn(['shop', 'business', 'affiliate']),
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const {
      customer_name, customer_email, customer_phone,
      shoe_id, shoe_name, material, color, sole, eu_size, scan_id,
      accessories, notes, source,
    } = req.body

    const db = getDb()
    const result = db.prepare(`
      INSERT INTO custom_requests
        (user_id, customer_name, customer_email, customer_phone,
         shoe_id, shoe_name, material, color, sole, eu_size, scan_id,
         accessories, notes, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user?.id ?? null,
      customer_name, customer_email,
      // Leerer Text statt NULL: Die Spalte ist NOT NULL, und dafür die Tabelle
      // umzubauen wäre für ein freiwilliges Feld unverhältnismäßig. In der
      // Verwaltung wird leer ohnehin wie „nicht angegeben" behandelt.
      customer_phone?.trim() || '',
      shoe_id ?? null, shoe_name ?? null, material ?? null, color ?? null,
      sole ?? null, eu_size ?? null, scan_id ?? null,
      accessories ? JSON.stringify(accessories) : null,
      notes ?? null,
      ['shop', 'business', 'affiliate'].includes(source) ? source : 'shop',
    )

    const row = db.prepare('SELECT * FROM custom_requests WHERE id = ?').get(result.lastInsertRowid)

    Promise.allSettled([
      sendInquiryNotification(row),
      sendInquiryAck(row),
    ]).then(results => {
      for (const r of results) {
        if (r.status === 'rejected') console.error('Anfrage-Mail fehlgeschlagen:', r.reason)
      }
    })

    res.status(201).json(row)
  }
)

// GET /api/custom-requests/mine — user's own requests
router.get('/mine', authenticate, (req, res) => {
  const rows = getDb()
    .prepare(`SELECT * FROM custom_requests WHERE user_id = ? ORDER BY created_at DESC`)
    .all(req.user.id)
  res.json(rows)
})

// GET /api/custom-requests — admin/curator
router.get('/', ...canManage, (req, res) => {
  // ?source=business|affiliate|shop — die Verwaltung zeigt die drei Wege
  // getrennt, weil sie unterschiedlich beantwortet werden.
  const quelle = ['shop', 'business', 'affiliate'].includes(req.query.source) ? req.query.source : null
  const rows = getDb()
    .prepare(`SELECT cr.*, u.name as user_name, u.email as user_email
              FROM custom_requests cr
              LEFT JOIN users u ON u.id = cr.user_id
              ${quelle ? 'WHERE cr.source = ?' : ''}
              ORDER BY
                CASE cr.status
                  WHEN 'open' THEN 0
                  WHEN 'contacted' THEN 1
                  WHEN 'in_progress' THEN 2
                  WHEN 'quoted' THEN 3
                  WHEN 'accepted' THEN 4
                  ELSE 5 END,
                cr.created_at DESC`)
    .all(...(quelle ? [quelle] : []))
  res.json(rows)
})

// PUT /api/custom-requests/:id — admin/curator updates status, notes, assignment
router.put('/:id', ...canManage, param('id').isInt(), (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

  const db = getDb()
  const existing = db.prepare('SELECT id FROM custom_requests WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Not found' })

  const { status, admin_notes, assigned_to } = req.body
  const updates = []
  const vals = []
  if (status !== undefined) {
    if (!VALID_STATUS.includes(status)) return res.status(400).json({ error: 'Invalid status' })
    updates.push('status = ?'); vals.push(status)
  }
  if (admin_notes !== undefined) { updates.push('admin_notes = ?'); vals.push(admin_notes) }
  if (assigned_to !== undefined) { updates.push('assigned_to = ?'); vals.push(assigned_to || null) }
  updates.push("updated_at = datetime('now')")

  if (updates.length > 1) {
    db.prepare(`UPDATE custom_requests SET ${updates.join(', ')} WHERE id = ?`)
      .run(...vals, req.params.id)
  }

  const row = db.prepare('SELECT * FROM custom_requests WHERE id = ?').get(req.params.id)
  res.json(row)
})

// DELETE /api/custom-requests/:id — admin/curator
router.delete('/:id', ...canManage, param('id').isInt(), (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM custom_requests WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Not found' })
  db.prepare('DELETE FROM custom_requests WHERE id = ?').run(req.params.id)
  res.json({ message: 'Deleted' })
})

export default router
