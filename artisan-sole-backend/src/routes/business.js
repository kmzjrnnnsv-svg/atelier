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

// ── Kampagnen-Helfer ─────────────────────────────────────────────────────────
function slugify(s) {
  return String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'kampagne'
}
function genUniqueSlug(db, name) {
  const base = slugify(name)
  for (let i = 0; i < 12; i++) {
    const slug = i === 0 ? base : `${base}-${genCode(4).toLowerCase()}`
    if (!db.prepare('SELECT 1 FROM business_campaigns WHERE slug = ?').get(slug)) return slug
  }
  return `${base}-${Date.now().toString(36)}`
}
const emailDomain = (email) => String(email || '').split('@')[1]?.toLowerCase() || ''

const shapeCampaign = (c) => ({
  id: c.id,
  name: c.name,
  slug: c.slug,
  payment_mode: c.payment_mode,
  discount_pct: c.discount_pct,
  moq_per_model: c.moq_per_model,
  allowed_shoe_ids: c.allowed_shoe_ids ? JSON.parse(c.allowed_shoe_ids) : null,
  access_mode: c.access_mode,
  allowed_email_domain: c.allowed_email_domain || null,
  status: c.status,
  deadline: c.deadline || null,
  created_at: c.created_at,
})

// Autoritative Prüfung, ob ein User in einer Kampagne ein Modell bestellen darf.
// Geteilt von der Order-Route (orders.js) und dem Member-Endpoint.
export function validateCampaignForUser(db, campaignId, userId, shoeId) {
  const c = db.prepare('SELECT * FROM business_campaigns WHERE id = ?').get(campaignId)
  if (!c) return { valid: false, reason: 'Kampagne nicht gefunden' }
  if (c.status !== 'open') return { valid: false, reason: 'Diese Kampagne ist nicht aktiv' }
  if (c.deadline) {
    const today = new Date().toISOString().slice(0, 10)
    if (String(c.deadline).slice(0, 10) < today) return { valid: false, reason: 'Die Kampagne ist abgelaufen' }
  }
  const member = db.prepare('SELECT 1 FROM business_campaign_members WHERE campaign_id = ? AND user_id = ?').get(campaignId, userId)
  if (!member) return { valid: false, reason: 'Kein Zugang zu dieser Kampagne' }
  if (c.allowed_shoe_ids && shoeId != null) {
    const ids = JSON.parse(c.allowed_shoe_ids)
    if (ids.length && !ids.includes(Number(shoeId))) return { valid: false, reason: 'Dieses Modell ist nicht Teil der Kampagne' }
  }
  return { valid: true, campaign: c }
}

// Validiert allowed_shoe_ids gegen existierende Schuhe; gibt JSON oder null.
function validateShoeIds(db, allowed_shoe_ids) {
  if (allowed_shoe_ids == null) return { json: null }
  if (!Array.isArray(allowed_shoe_ids)) return { error: 'Ungültige Design-Liste' }
  const ids = [...new Set(allowed_shoe_ids.map(Number).filter(Number.isInteger))]
  if (ids.length === 0) return { json: null }   // leer = ganzer Katalog
  const ph = ids.map(() => '?').join(',')
  const found = db.prepare(`SELECT COUNT(*) AS c FROM shoes WHERE id IN (${ph})`).get(...ids).c
  if (found !== ids.length) return { error: 'Mindestens ein Design ist unbekannt' }
  return { json: JSON.stringify(ids) }
}

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

// ── Kampagnen: Firmenkonto-Inhaber ──────────────────────────────────────────

// GET /api/business/me/campaigns — eigene Kampagnen + leichte Fortschritts-Info
router.get('/me/campaigns', authenticate, loadOwnBusiness, (req, res) => {
  const rows = getDb().prepare('SELECT * FROM business_campaigns WHERE business_id = ? ORDER BY created_at DESC, id DESC').all(req.business.id)
  const db = getDb()
  res.json(rows.map(c => {
    const stats = db.prepare('SELECT COUNT(*) AS units, COUNT(DISTINCT user_id) AS participants FROM orders WHERE business_campaign_id = ?').get(c.id)
    const members = db.prepare('SELECT COUNT(*) AS c FROM business_campaign_members WHERE campaign_id = ?').get(c.id).c
    return { ...shapeCampaign(c), units: stats.units, participants: stats.participants, members }
  }))
})

// POST /api/business/me/campaigns — Kampagne anlegen
router.post('/me/campaigns', authenticate, loadOwnBusiness, (req, res) => {
  const db = getDb()
  const { name, payment_mode, discount_pct, moq_per_model, allowed_shoe_ids, access_mode, allowed_email_domain, deadline, status } = req.body || {}

  if (typeof name !== 'string' || name.trim().length < 2) return res.status(400).json({ error: 'Kampagnen-Name min. 2 Zeichen' })
  const pay = payment_mode === 'company' ? 'company' : 'employee'
  let pct = Number(discount_pct)
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) pct = 25
  let moq = parseInt(moq_per_model, 10); if (!Number.isInteger(moq) || moq < 1) moq = 10
  const access = ['domain', 'list', 'both'].includes(access_mode) ? access_mode : 'domain'
  const domain = (access === 'domain' || access === 'both')
    ? String(allowed_email_domain || '').trim().toLowerCase().replace(/^@/, '')
    : null
  if ((access === 'domain' || access === 'both') && !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain || '')) {
    return res.status(400).json({ error: 'Bitte eine gültige E-Mail-Domain angeben (z. B. firma.com)' })
  }
  const shoeRes = validateShoeIds(db, allowed_shoe_ids)
  if (shoeRes.error) return res.status(400).json({ error: shoeRes.error })
  const dl = deadline ? String(deadline).slice(0, 10) : null
  const st = ['draft', 'open', 'closed'].includes(status) ? status : 'draft'
  const slug = genUniqueSlug(db, name)

  const r = db.prepare(`
    INSERT INTO business_campaigns
      (business_id, name, slug, payment_mode, discount_pct, moq_per_model, allowed_shoe_ids, access_mode, allowed_email_domain, status, deadline)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.business.id, name.trim(), slug, pay, pct, moq, shoeRes.json, access, domain, st, dl)

  res.status(201).json(shapeCampaign(db.prepare('SELECT * FROM business_campaigns WHERE id = ?').get(r.lastInsertRowid)))
})

// PUT /api/business/me/campaigns/:id — aktualisieren (inkl. Status öffnen/schließen)
router.put('/me/campaigns/:id', authenticate, loadOwnBusiness, (req, res) => {
  const db = getDb()
  const c = db.prepare('SELECT * FROM business_campaigns WHERE id = ? AND business_id = ?').get(req.params.id, req.business.id)
  if (!c) return res.status(404).json({ error: 'Kampagne nicht gefunden' })
  const b = req.body || {}
  const cols = [], params = []
  if (b.name != null) { if (String(b.name).trim().length < 2) return res.status(400).json({ error: 'Name min. 2 Zeichen' }); cols.push('name = ?'); params.push(String(b.name).trim()) }
  if (b.payment_mode != null) { cols.push('payment_mode = ?'); params.push(b.payment_mode === 'company' ? 'company' : 'employee') }
  if (b.discount_pct != null) { const p = Number(b.discount_pct); if (!Number.isFinite(p) || p < 0 || p > 100) return res.status(400).json({ error: 'Rabatt 0–100' }); cols.push('discount_pct = ?'); params.push(p) }
  if (b.moq_per_model != null) { const m = parseInt(b.moq_per_model, 10); if (!Number.isInteger(m) || m < 1) return res.status(400).json({ error: 'MOQ min. 1' }); cols.push('moq_per_model = ?'); params.push(m) }
  if (b.allowed_shoe_ids !== undefined) { const sr = validateShoeIds(db, b.allowed_shoe_ids); if (sr.error) return res.status(400).json({ error: sr.error }); cols.push('allowed_shoe_ids = ?'); params.push(sr.json) }
  if (b.access_mode != null && ['domain', 'list', 'both'].includes(b.access_mode)) { cols.push('access_mode = ?'); params.push(b.access_mode) }
  if (b.allowed_email_domain !== undefined) { cols.push('allowed_email_domain = ?'); params.push(b.allowed_email_domain ? String(b.allowed_email_domain).trim().toLowerCase().replace(/^@/, '') : null) }
  if (b.status != null && ['draft', 'open', 'closed'].includes(b.status)) { cols.push('status = ?'); params.push(b.status) }
  if (b.deadline !== undefined) { cols.push('deadline = ?'); params.push(b.deadline ? String(b.deadline).slice(0, 10) : null) }
  if (cols.length === 0) return res.status(400).json({ error: 'Keine Änderungen' })
  cols.push("updated_at = datetime('now')"); params.push(c.id)
  db.prepare(`UPDATE business_campaigns SET ${cols.join(', ')} WHERE id = ?`).run(...params)
  res.json(shapeCampaign(db.prepare('SELECT * FROM business_campaigns WHERE id = ?').get(c.id)))
})

// GET /api/business/me/campaigns/:id/dashboard — Fortschritt je Modell (Wolt-Style)
router.get('/me/campaigns/:id/dashboard', authenticate, loadOwnBusiness, (req, res) => {
  const db = getDb()
  const c = db.prepare('SELECT * FROM business_campaigns WHERE id = ? AND business_id = ?').get(req.params.id, req.business.id)
  if (!c) return res.status(404).json({ error: 'Kampagne nicht gefunden' })
  const perModel = db.prepare(`
    SELECT shoe_id, shoe_name, COUNT(*) AS units
    FROM orders WHERE business_campaign_id = ?
    GROUP BY shoe_id, shoe_name ORDER BY units DESC
  `).all(c.id)
  const totals = db.prepare('SELECT COUNT(*) AS orders, COUNT(DISTINCT user_id) AS participants FROM orders WHERE business_campaign_id = ?').get(c.id)
  const members = db.prepare('SELECT COUNT(*) AS c FROM business_campaign_members WHERE campaign_id = ?').get(c.id).c
  res.json({
    campaign: shapeCampaign(c),
    moq_per_model: c.moq_per_model,
    per_model: perModel.map(m => ({ shoe_id: m.shoe_id, shoe_name: m.shoe_name, units: m.units, reached: m.units >= c.moq_per_model })),
    totals: { orders: totals.orders, participants: totals.participants, members },
  })
})

// POST /api/business/me/campaigns/:id/invites — E-Mail-Allow-Liste ergänzen
router.post('/me/campaigns/:id/invites', authenticate, loadOwnBusiness, (req, res) => {
  const db = getDb()
  const c = db.prepare('SELECT * FROM business_campaigns WHERE id = ? AND business_id = ?').get(req.params.id, req.business.id)
  if (!c) return res.status(404).json({ error: 'Kampagne nicht gefunden' })
  const emails = Array.isArray(req.body?.emails) ? req.body.emails : []
  const clean = [...new Set(emails.map(e => String(e || '').trim().toLowerCase()).filter(e => /\S+@\S+\.\S+/.test(e)))]
  if (clean.length === 0) return res.status(400).json({ error: 'Keine gültigen E-Mail-Adressen' })
  const ins = db.prepare("INSERT OR IGNORE INTO business_campaign_invites (campaign_id, email, token) VALUES (?, ?, ?)")
  let added = 0
  db.transaction(() => { for (const e of clean) { const r = ins.run(c.id, e, crypto.randomBytes(24).toString('hex')); added += r.changes } })()
  const all = db.prepare('SELECT email, status FROM business_campaign_invites WHERE campaign_id = ? ORDER BY email').all(c.id)
  res.status(201).json({ added, invites: all })
})

// ── Kampagnen: öffentlich + Mitglieder ──────────────────────────────────────

// GET /api/business/campaigns/by-slug/:slug — öffentliche Join-Landing-Daten
router.get('/campaigns/by-slug/:slug', (req, res) => {
  const db = getDb()
  const c = db.prepare('SELECT * FROM business_campaigns WHERE slug = ?').get(req.params.slug)
  if (!c) return res.status(404).json({ error: 'Kampagne nicht gefunden' })
  const biz = db.prepare('SELECT name, logo_data FROM businesses WHERE id = ?').get(c.business_id)
  res.json({
    name: c.name, slug: c.slug, status: c.status,
    payment_mode: c.payment_mode, discount_pct: c.discount_pct,
    access_mode: c.access_mode, allowed_email_domain: c.allowed_email_domain || null,
    business_name: biz?.name || null, business_logo: biz?.logo_data || null,
  })
})

// GET /api/business/campaigns/mine — offene Kampagnen, in denen der User Mitglied ist
router.get('/campaigns/mine', authenticate, (req, res) => {
  const db = getDb()
  const rows = db.prepare(`
    SELECT c.*, b.name AS business_name, b.logo_data AS business_logo
    FROM business_campaign_members m
    JOIN business_campaigns c ON c.id = m.campaign_id
    JOIN businesses b ON b.id = c.business_id
    WHERE m.user_id = ? AND c.status = 'open'
    ORDER BY m.joined_at DESC
  `).all(req.user.id)
  res.json(rows.map(c => ({ ...shapeCampaign(c), business_name: c.business_name, business_logo: c.business_logo || null })))
})

// POST /api/business/campaigns/:slug/join — Kampagne beitreten (Domain oder Invite)
router.post('/campaigns/:slug/join', authenticate, (req, res) => {
  const db = getDb()
  const c = db.prepare('SELECT * FROM business_campaigns WHERE slug = ?').get(req.params.slug)
  if (!c) return res.status(404).json({ error: 'Kampagne nicht gefunden' })
  if (c.status !== 'open') return res.status(403).json({ error: 'Diese Kampagne ist nicht aktiv' })

  const already = db.prepare('SELECT 1 FROM business_campaign_members WHERE campaign_id = ? AND user_id = ?').get(c.id, req.user.id)
  if (already) return res.json({ ok: true, joined: true })

  let eligible = false
  if ((c.access_mode === 'domain' || c.access_mode === 'both') && c.allowed_email_domain) {
    if (emailDomain(req.user.email) === c.allowed_email_domain.toLowerCase()) {
      // Domain-Zugang erfordert eine bestätigte E-Mail (gegen Spoofing).
      const v = db.prepare('SELECT email_verified FROM users WHERE id = ?').get(req.user.id)
      if (!v?.email_verified) {
        return res.status(403).json({ error: 'Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse.', code: 'EMAIL_UNVERIFIED' })
      }
      eligible = true
    }
  }
  let inviteRow = null
  if (!eligible && (c.access_mode === 'list' || c.access_mode === 'both')) {
    inviteRow = db.prepare("SELECT * FROM business_campaign_invites WHERE campaign_id = ? AND email = ? AND status != 'revoked'").get(c.id, req.user.email)
    if (inviteRow) eligible = true
  }
  if (!eligible) {
    const hint = c.allowed_email_domain ? ` Bitte mit einer @${c.allowed_email_domain}-Adresse anmelden.` : ''
    return res.status(403).json({ error: `Kein Zugang zu dieser Kampagne.${hint}` })
  }

  db.transaction(() => {
    db.prepare('INSERT OR IGNORE INTO business_campaign_members (campaign_id, user_id) VALUES (?, ?)').run(c.id, req.user.id)
    if (inviteRow) db.prepare("UPDATE business_campaign_invites SET status = 'joined', joined_user_id = ? WHERE id = ?").run(req.user.id, inviteRow.id)
  })()
  res.json({ ok: true, joined: true })
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

// GET /api/business/:id/campaigns — Kampagnen eines Kontos (Admin/Curator)
router.get('/:id/campaigns', ...canManage, (req, res) => {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM business_campaigns WHERE business_id = ? ORDER BY created_at DESC, id DESC').all(req.params.id)
  res.json(rows.map(c => {
    const stats = db.prepare('SELECT COUNT(*) AS units, COUNT(DISTINCT user_id) AS participants FROM orders WHERE business_campaign_id = ?').get(c.id)
    return { ...shapeCampaign(c), units: stats.units, participants: stats.participants }
  }))
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

    // Abwarten und melden statt verschlucken — siehe routes/users.js.
    let emailSent = true
    let emailError = null
    try {
      await sendBusinessInvitation(email, company, inviteToken)
    } catch (e) {
      emailSent = false
      emailError = e.message
      console.error('[email business invite]', e.message)
    }

    const row = db.prepare(`
      SELECT b.*, u.email AS owner_email, u.name AS owner_name, u.is_active AS owner_active
      FROM businesses b JOIN users u ON u.id = b.owner_user_id WHERE b.owner_user_id = ?
    `).get(ownerId)
    res.status(201).json({
      id: row.id, name: row.name, contact_email: row.contact_email, contact_phone: row.contact_phone,
      status: row.status, owner_email: row.owner_email, owner_name: row.owner_name,
      owner_active: !!row.owner_active, pending: !!row.invite_token, invite_token: row.invite_token,
      email_sent: emailSent, email_error: emailError,
      source_request_id: row.source_request_id, created_at: row.created_at,
    })
  }
)

export default router
