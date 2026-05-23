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

// Ohne mehrdeutige Zeichen (0/O, 1/I/L), damit Codes gut vorlesbar/abtippbar sind.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
function genCode(len = 8) {
  const bytes = crypto.randomBytes(len)
  let out = ''
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]
  return out
}

// Effektiver Status: abgelaufene, noch nicht eingelöste Codes als 'expired' zeigen.
function effectiveStatus(row) {
  if (row.status === 'issued' && row.expires_at) {
    const today = new Date().toISOString().slice(0, 10)
    if (String(row.expires_at).slice(0, 10) < today) return 'expired'
  }
  return row.status
}

// Prüft einen Einmal-Code für die Einlösung. Wird von der Validate-Route und
// vom Bestell-Endpoint (orders.js) geteilt — eine Quelle der Wahrheit.
export function validateBusinessCode(db, code, shoeId) {
  if (!code) return { valid: false, reason: 'Kein Code angegeben' }
  const row = db.prepare('SELECT * FROM business_codes WHERE code = ?').get(String(code).trim())
  if (!row) return { valid: false, reason: 'Code nicht gefunden' }
  if (row.status === 'redeemed') return { valid: false, reason: 'Dieser Code wurde bereits eingelöst' }
  if (row.status === 'revoked') return { valid: false, reason: 'Dieser Code wurde gesperrt' }
  if (row.expires_at) {
    const today = new Date().toISOString().slice(0, 10)
    if (String(row.expires_at).slice(0, 10) < today) return { valid: false, reason: 'Dieser Code ist abgelaufen' }
  }
  if (row.status !== 'issued') return { valid: false, reason: 'Code nicht einlösbar' }
  if (row.design_scope === 'fixed' && shoeId != null) {
    const ids = row.allowed_shoe_ids ? JSON.parse(row.allowed_shoe_ids) : []
    if (!ids.includes(Number(shoeId))) return { valid: false, reason: 'Code gilt nicht für dieses Design' }
  }
  return { valid: true, code: row }
}

const shapeCode = (c) => ({
  id: c.id,
  code: c.code,
  coverage_type: c.coverage_type,
  discount_type: c.discount_type || null,
  discount_value: c.discount_value ?? null,
  design_scope: c.design_scope,
  allowed_shoe_ids: c.allowed_shoe_ids ? JSON.parse(c.allowed_shoe_ids) : null,
  max_value: c.max_value ?? null,
  status: effectiveStatus(c),
  redeemed_at: c.redeemed_at || null,
  expires_at: c.expires_at || null,
  created_at: c.created_at,
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

// ── Code-Einlösung (Empfänger im Checkout) ──────────────────────────────────

// GET /api/business/codes/validate?code=&shoe_id= — Code im Checkout prüfen
router.get('/codes/validate', authenticate, (req, res) => {
  const { code, shoe_id } = req.query
  const db = getDb()
  const r = validateBusinessCode(db, code, shoe_id != null && shoe_id !== '' ? Number(shoe_id) : null)
  if (!r.valid) return res.json({ valid: false, reason: r.reason })
  const c = r.code
  const biz = db.prepare('SELECT name FROM businesses WHERE id = ?').get(c.business_id)
  res.json({
    valid: true,
    business_name: biz?.name || null,
    coverage_type: c.coverage_type,
    discount_type: c.discount_type || null,
    discount_value: c.discount_value ?? null,
    design_scope: c.design_scope,
    allowed_shoe_ids: c.allowed_shoe_ids ? JSON.parse(c.allowed_shoe_ids) : null,
    max_value: c.max_value ?? null,
  })
})

// ── Einmal-Codes (Firmenkonto-Inhaber) ──────────────────────────────────────

// GET /api/business/me/codes — eigene Codes auflisten
router.get('/me/codes', authenticate, loadOwnBusiness, (req, res) => {
  const rows = getDb()
    .prepare('SELECT * FROM business_codes WHERE business_id = ? ORDER BY created_at DESC, id DESC')
    .all(req.business.id)
  res.json(rows.map(shapeCode))
})

// POST /api/business/me/codes — Code-Batch erzeugen
router.post('/me/codes', authenticate, loadOwnBusiness, (req, res) => {
  const { count, coverage_type, discount_type, discount_value, design_scope, allowed_shoe_ids, max_value, expires_at } = req.body || {}
  const db = getDb()

  const n = parseInt(count, 10)
  if (!Number.isInteger(n) || n < 1 || n > 500) {
    return res.status(400).json({ error: 'Anzahl muss zwischen 1 und 500 liegen' })
  }
  if (!['full', 'discount'].includes(coverage_type)) {
    return res.status(400).json({ error: 'Ungültige Deckungsart' })
  }

  let dType = null, dValue = null
  if (coverage_type === 'discount') {
    if (!['percentage', 'fixed'].includes(discount_type)) {
      return res.status(400).json({ error: 'Rabattart erforderlich' })
    }
    dValue = Number(discount_value)
    if (!Number.isFinite(dValue) || dValue <= 0) {
      return res.status(400).json({ error: 'Rabattwert muss größer als 0 sein' })
    }
    if (discount_type === 'percentage' && dValue > 100) {
      return res.status(400).json({ error: 'Prozent-Rabatt max. 100' })
    }
    dType = discount_type
  }

  if (!['fixed', 'catalog'].includes(design_scope)) {
    return res.status(400).json({ error: 'Ungültige Design-Auswahl' })
  }
  let shoeIdsJson = null
  if (design_scope === 'fixed') {
    const ids = Array.isArray(allowed_shoe_ids)
      ? [...new Set(allowed_shoe_ids.map(Number).filter(Number.isInteger))]
      : []
    if (ids.length === 0) {
      return res.status(400).json({ error: 'Bitte mindestens ein Design festlegen' })
    }
    const placeholders = ids.map(() => '?').join(',')
    const found = db.prepare(`SELECT COUNT(*) AS c FROM shoes WHERE id IN (${placeholders})`).get(...ids).c
    if (found !== ids.length) {
      return res.status(400).json({ error: 'Mindestens ein Design ist unbekannt' })
    }
    shoeIdsJson = JSON.stringify(ids)
  }

  let mv = null
  if (max_value != null && max_value !== '') {
    mv = Number(max_value)
    if (!Number.isFinite(mv) || mv <= 0) return res.status(400).json({ error: 'Wert-Obergrenze ungültig' })
  }
  const exp = expires_at ? String(expires_at).slice(0, 10) : null

  const insert = db.prepare(`
    INSERT INTO business_codes
      (business_id, code, coverage_type, discount_type, discount_value, design_scope, allowed_shoe_ids, max_value, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const created = []
  try {
    db.transaction(() => {
      for (let i = 0; i < n; i++) {
        let ok = false, tries = 0
        while (!ok && tries < 12) {
          const code = genCode(8)
          try {
            insert.run(req.business.id, code, coverage_type, dType, dValue, design_scope, shoeIdsJson, mv, exp)
            created.push(code)
            ok = true
          } catch { tries++ }   // UNIQUE-Kollision → neuer Versuch
        }
        if (!ok) throw new Error('code generation failed')
      }
    })()
  } catch {
    return res.status(500).json({ error: 'Codes konnten nicht erzeugt werden' })
  }

  res.status(201).json({ created: created.length, codes: created })
})

// POST /api/business/me/codes/:id/revoke — Code sperren (nicht eingelöste)
router.post('/me/codes/:id/revoke', authenticate, loadOwnBusiness, (req, res) => {
  const db = getDb()
  const row = db.prepare('SELECT * FROM business_codes WHERE id = ? AND business_id = ?').get(req.params.id, req.business.id)
  if (!row) return res.status(404).json({ error: 'Code nicht gefunden' })
  if (row.status === 'redeemed') return res.status(409).json({ error: 'Eingelöste Codes können nicht gesperrt werden' })
  db.prepare("UPDATE business_codes SET status = 'revoked' WHERE id = ?").run(row.id)
  res.json({ ok: true })
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

// GET /api/business/:id/codes — Codes eines Kontos einsehen (Admin/Curator)
router.get('/:id/codes', ...canManage, (req, res) => {
  const rows = getDb()
    .prepare('SELECT * FROM business_codes WHERE business_id = ? ORDER BY created_at DESC, id DESC')
    .all(req.params.id)
  res.json(rows.map(shapeCode))
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
