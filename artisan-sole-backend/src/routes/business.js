/**
 * business.js — B2B-Firmenkonten (business.artisansole.com)
 *
 * Zwei Zugriffsebenen:
 *   • Firmenkonto-Inhaber (eingeloggt, besitzt eine businesses-Zeile):
 *     GET/PUT /api/business/me — eigenes Profil + Logo verwalten.
 *   • Admin/Curator: Firmenkonten auflisten und „aus einer Anfrage" anlegen
 *     (erzeugt Login + Einladungslink, der Empfänger setzt sein Passwort).
 */
import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { getDb } from '../db/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { sendBusinessInvitation } from '../utils/email.js'

const router = Router()

// Maximale Logo-Größe (base64-String). ~2 MB Rohdaten ≈ 2.8 MB base64.
const MAX_LOGO_LEN = 3_000_000

// Lädt das Firmenkonto des eingeloggten Users oder bricht mit 403 ab.
function loadOwnBusiness(req, res, next) {
  const biz = getDb().prepare('SELECT * FROM businesses WHERE owner_user_id = ?').get(req.user.id)
  if (!biz) return res.status(403).json({ error: 'Kein Firmenkonto für diesen Account' })
  req.business = biz
  next()
}

const publicShape = (b) => ({
  id: b.id,
  name: b.name,
  contact_email: b.contact_email || null,
  contact_phone: b.contact_phone || null,
  logo_data: b.logo_data || null,
  status: b.status,
})

// ── Firmenkonto-Inhaber ─────────────────────────────────────────────────────

// GET /api/business/me
router.get('/me', authenticate, loadOwnBusiness, (req, res) => {
  res.json(publicShape(req.business))
})

// PUT /api/business/me — Profil + Logo aktualisieren
router.put('/me', authenticate, loadOwnBusiness, (req, res) => {
  const { name, contact_email, contact_phone, logo_data } = req.body || {}

  if (name != null && (typeof name !== 'string' || name.trim().length < 2)) {
    return res.status(400).json({ error: 'Firmenname min. 2 Zeichen' })
  }
  if (logo_data != null && logo_data !== '') {
    if (typeof logo_data !== 'string' || !/^data:image\/(png|jpe?g|svg\+xml|webp);base64,/.test(logo_data)) {
      return res.status(400).json({ error: 'Logo muss ein PNG/JPG/SVG/WEBP-Bild sein' })
    }
    if (logo_data.length > MAX_LOGO_LEN) {
      return res.status(413).json({ error: 'Logo ist zu groß (max. ~2 MB)' })
    }
  }

  const db = getDb()
  const cols = []
  const params = []
  if (name != null)          { cols.push('name = ?');          params.push(name.trim()) }
  if (contact_email != null) { cols.push('contact_email = ?'); params.push(contact_email || null) }
  if (contact_phone != null) { cols.push('contact_phone = ?'); params.push(contact_phone || null) }
  if (logo_data != null)     { cols.push('logo_data = ?');     params.push(logo_data === '' ? null : logo_data) }

  if (cols.length === 0) return res.status(400).json({ error: 'Keine Änderungen angegeben' })

  cols.push("updated_at = datetime('now')")
  params.push(req.business.id)
  db.prepare(`UPDATE businesses SET ${cols.join(', ')} WHERE id = ?`).run(...params)

  const updated = db.prepare('SELECT * FROM businesses WHERE id = ?').get(req.business.id)
  res.json(publicShape(updated))
})

// ── Admin / Curator ─────────────────────────────────────────────────────────
const canManage = [authenticate, requireRole('admin', 'curator')]

// GET /api/business — alle Firmenkonten auflisten
router.get('/', ...canManage, (req, res) => {
  const rows = getDb().prepare(`
    SELECT b.id, b.name, b.contact_email, b.contact_phone, b.status,
           b.invite_token, b.source_request_id, b.created_at,
           u.email AS owner_email, u.name AS owner_name, u.is_active AS owner_active
    FROM businesses b
    JOIN users u ON u.id = b.owner_user_id
    ORDER BY b.created_at DESC
  `).all()
  res.json(rows.map(r => ({
    id: r.id,
    name: r.name,
    contact_email: r.contact_email,
    contact_phone: r.contact_phone,
    status: r.status,
    owner_email: r.owner_email,
    owner_name: r.owner_name,
    owner_active: !!r.owner_active,
    pending: !!r.invite_token,
    invite_token: r.invite_token || null,
    source_request_id: r.source_request_id || null,
    created_at: r.created_at,
  })))
})

// POST /api/business — Firmenkonto anlegen (typ. aus einer Anfrage heraus)
router.post('/', ...canManage,
  body('email').isEmail().withMessage('Gültige E-Mail erforderlich'),
  body('contact_name').trim().isLength({ min: 2 }).withMessage('Ansprechpartner erforderlich'),
  body('company').trim().isLength({ min: 2 }).withMessage('Firmenname erforderlich'),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const { email, contact_name, company, contact_phone, source_request_id } = req.body
    const db = getDb()

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    if (existing) return res.status(409).json({ error: 'E-Mail bereits vergeben' })

    const inviteToken = crypto.randomBytes(32).toString('hex')
    const tempPassword = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 12)

    const tx = db.transaction(() => {
      const u = db.prepare(`
        INSERT INTO users (name, email, password_hash, role, is_active)
        VALUES (?, ?, ?, 'user', 0)
      `).run(contact_name, email, tempPassword)

      db.prepare(`
        INSERT INTO businesses (owner_user_id, name, contact_email, contact_phone, status, source_request_id, invite_token)
        VALUES (?, ?, ?, ?, 'pending', ?, ?)
      `).run(u.lastInsertRowid, company, email, contact_phone || null, source_request_id || null, inviteToken)

      if (source_request_id) {
        db.prepare("UPDATE custom_requests SET status = 'in_progress', updated_at = datetime('now') WHERE id = ?").run(source_request_id)
      }
      return u.lastInsertRowid
    })
    const ownerId = tx()

    sendBusinessInvitation(email, company, inviteToken).catch(e => console.error('[email business invite]', e.message))

    const row = db.prepare(`
      SELECT b.*, u.email AS owner_email, u.name AS owner_name, u.is_active AS owner_active
      FROM businesses b JOIN users u ON u.id = b.owner_user_id WHERE b.owner_user_id = ?
    `).get(ownerId)
    res.status(201).json({
      id: row.id, name: row.name, contact_email: row.contact_email, contact_phone: row.contact_phone,
      status: row.status, owner_email: row.owner_email, owner_name: row.owner_name,
      owner_active: !!row.owner_active, pending: !!row.invite_token, invite_token: row.invite_token,
      source_request_id: row.source_request_id, created_at: row.created_at,
    })
  }
)

export default router
