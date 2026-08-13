import { Router } from 'express'
import { body, param, validationResult } from 'express-validator'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { getDb } from '../db/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import QRCode from 'qrcode'
import { sendPromotionInvitation } from '../utils/email.js'
import { kennungAusstellen } from './recovery.js'

const router = Router()
router.use(authenticate, requireRole('admin'))

// GET /api/users
/**
 * POST /api/users/:id/wiederherstellung — Notausgang für ein Konto.
 *
 * Der letzte Weg zurück, wenn ein Kunde alle Geräte verloren hat und auch
 * über Bestellnummer und Postleitzahl nicht weiterkommt. Herausgegeben wird
 * ein Link, der genau eines erlaubt: einen neuen Passkey anzulegen. Eine
 * Stunde gültig, einmalig, und im Protokoll steht, wer ihn ausgestellt hat.
 *
 * Genau hier fallen Unternehmen, nicht an der Verschlüsselung: Jemand ruft
 * an, klingt überzeugend, bekommt einen Link. Deshalb verlangt die Oberfläche
 * eine Notiz, wie die Identität geprüft wurde — nicht als Formalie, sondern
 * damit die Frage überhaupt gestellt wird.
 */
router.post('/:id/wiederherstellung', param('id').isInt(), async (req, res) => {
  const db = getDb()
  const user = db.prepare('SELECT id, name, email, is_active FROM users WHERE id = ?').get(req.params.id)
  if (!user) return res.status(404).json({ error: 'Konto nicht gefunden' })
  if (!user.is_active) return res.status(400).json({ error: 'Dieses Konto ist deaktiviert.' })

  const notiz = String(req.body?.note || '').trim().slice(0, 300)
  if (notiz.length < 4) {
    return res.status(400).json({ error: 'Bitte kurz festhalten, wie Sie die Identität geprüft haben.' })
  }

  const token = kennungAusstellen(db, user.id, { issuedBy: req.user.id, note: notiz })
  const basis = process.env.APP_URL || 'https://artisansole.com'
  const link = `${basis}/konto-wiederherstellen?token=${token}`
  const qr = await QRCode.toDataURL(link, { margin: 1, width: 480, color: { dark: '#111111', light: '#FFFFFF' } })
    .catch(() => null)

  res.json({ link, qr, name: user.name, email: user.email, gueltig_minuten: 60 })
})

router.get('/', (req, res) => {
  const users = getDb().prepare(`
    SELECT id, name, email, role, is_active, is_promotion,
           promotion_discount_pct, promotion_max_orders, promotion_orders_used,
           created_at, updated_at
    FROM users ORDER BY created_at DESC
  `).all()
  res.json(users)
})

// GET /api/users/promotion — list all promotion accounts
router.get('/promotion', (req, res) => {
  const users = getDb().prepare(`
    SELECT id, name, email, role, is_active, is_promotion,
           promotion_discount_pct, promotion_max_orders, promotion_orders_used,
           created_at, updated_at
    FROM users WHERE is_promotion = 1 ORDER BY created_at DESC
  `).all()
  res.json(users)
})

// POST /api/users/promotion — create promotion account
router.post('/promotion',
  body('email').isEmail().withMessage('Gültige E-Mail erforderlich'),
  body('name').trim().isLength({ min: 2 }).withMessage('Name erforderlich'),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const { email, name, discount_pct, max_orders } = req.body
    const db = getDb()

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    if (existing) return res.status(409).json({ error: 'E-Mail bereits vergeben' })

    const inviteToken = crypto.randomBytes(32).toString('hex')
    const tempPassword = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 12)

    const result = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, is_promotion, promotion_discount_pct, promotion_max_orders, promotion_invite_token, promotion_invited_by)
      VALUES (?, ?, ?, 'user', 1, ?, ?, ?, ?)
    `).run(name, email, tempPassword, discount_pct || null, max_orders || null, inviteToken, req.user.id)

    // Der Versand wird abgewartet und das Ergebnis mitgeteilt. Vorher lief er
    // nebenher und landete im Fehlerfall nur im Log — die Oberfläche meldete
    // Erfolg, obwohl nie eine Einladung ankam. Das Konto bleibt trotzdem
    // bestehen: Es ist angelegt, und der Link lässt sich erneut schicken.
    let emailSent = true
    let emailError = null
    try {
      await sendPromotionInvitation(email, name, inviteToken, discount_pct)
    } catch (e) {
      emailSent = false
      emailError = e.message
      console.error('[email promo invite]', e.message)
    }

    const user = db.prepare('SELECT id, name, email, role, is_active, is_promotion, promotion_discount_pct, promotion_max_orders, promotion_orders_used, created_at FROM users WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json({ ...user, email_sent: emailSent, email_error: emailError })
  }
)

// PATCH /api/users/:id/promotion — toggle promotion + update settings
router.patch('/:id/promotion', param('id').isInt(), (req, res) => {
  const db = getDb()
  const targetId = parseInt(req.params.id)
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(targetId)
  if (!user) return res.status(404).json({ error: 'User not found' })

  const { is_promotion, discount_pct, max_orders } = req.body
  db.prepare(`
    UPDATE users SET is_promotion = ?, promotion_discount_pct = ?, promotion_max_orders = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    is_promotion !== undefined ? (is_promotion ? 1 : 0) : null,
    discount_pct !== undefined ? discount_pct : null,
    max_orders !== undefined ? max_orders : null,
    targetId
  )

  res.json({ message: 'Promotion-Status aktualisiert' })
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
