import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { getDb } from '../db/database.js'
import { authenticate, requireRole, requireMFA } from '../middleware/auth.js'

const router = Router()

const BANK_KEYS  = ['bank_iban', 'bank_bic', 'bank_holder', 'bank_name']
const EMAIL_KEYS = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_manufacturer_email', 'app_url']

// GET /api/settings/bank — admin + curator
router.get('/bank', authenticate, requireRole('admin', 'curator'), (req, res) => {
  const db   = getDb()
  const rows = db.prepare('SELECT key, value FROM settings WHERE key IN (?,?,?,?)')
    .all(...BANK_KEYS)
  const result = Object.fromEntries(rows.map(r => [r.key, r.value]))
  // fill any missing with env fallback
  if (!result.bank_iban)   result.bank_iban   = process.env.BANK_IBAN   || ''
  if (!result.bank_bic)    result.bank_bic    = process.env.BANK_BIC    || ''
  if (!result.bank_holder) result.bank_holder = process.env.BANK_HOLDER || ''
  if (!result.bank_name)   result.bank_name   = process.env.BANK_NAME   || ''
  res.json(result)
})

// PUT /api/settings/bank — admin only + MFA
router.put('/bank',
  authenticate,
  requireRole('admin'),
  requireMFA,
  body('bank_iban').trim().notEmpty().withMessage('IBAN erforderlich'),
  body('bank_bic').trim().notEmpty().withMessage('BIC erforderlich'),
  body('bank_holder').trim().notEmpty().withMessage('Kontoinhaber erforderlich'),
  body('bank_name').trim().notEmpty().withMessage('Bankname erforderlich'),
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const db = getDb()
    const uid = req.user.id
    const upsert = db.prepare(`
      INSERT INTO settings (key, value, updated_by, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at
    `)

    const keys = { bank_iban: req.body.bank_iban, bank_bic: req.body.bank_bic, bank_holder: req.body.bank_holder, bank_name: req.body.bank_name }
    for (const [key, value] of Object.entries(keys)) {
      upsert.run(key, value, uid)
    }

    res.json({ message: 'Bankdaten gespeichert', ...keys })
  }
)

// ─── GET /api/settings/email — admin only ─────────────────────────────────────
router.get('/email', authenticate, requireRole('admin'), (req, res) => {
  const db   = getDb()
  const rows = db.prepare(`SELECT key, value FROM settings WHERE key IN (${EMAIL_KEYS.map(() => '?').join(',')})`)
    .all(...EMAIL_KEYS)
  const s = Object.fromEntries(rows.map(r => [r.key, r.value]))

  res.json({
    smtp_host:               s.smtp_host               || process.env.SMTP_HOST               || '',
    smtp_port:               s.smtp_port               || process.env.SMTP_PORT               || '587',
    smtp_user:               s.smtp_user               || process.env.SMTP_USER               || '',
    smtp_pass_set:           !!(s.smtp_pass             || process.env.SMTP_PASS),   // never send password
    smtp_manufacturer_email: s.smtp_manufacturer_email || process.env.MANUFACTURER_EMAIL      || '',
    app_url:                 s.app_url                 || process.env.APP_URL                 || '',
  })
})

// ─── PUT /api/settings/email — admin only + MFA ───────────────────────────────
router.put('/email',
  authenticate,
  requireRole('admin'),
  requireMFA,
  body('smtp_user').optional({ checkFalsy: true }).isEmail().withMessage('Ungültige Absender-E-Mail'),
  body('smtp_manufacturer_email').optional({ checkFalsy: true }).isEmail().withMessage('Ungültige Hersteller-E-Mail'),
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const db  = getDb()
    const uid = req.user.id
    const upsert = db.prepare(`
      INSERT INTO settings (key, value, updated_by, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at
    `)

    const { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_manufacturer_email, app_url } = req.body

    if (smtp_host               !== undefined) upsert.run('smtp_host',               smtp_host               || '', uid)
    if (smtp_port               !== undefined) upsert.run('smtp_port',               smtp_port               || '587', uid)
    if (smtp_user               !== undefined) upsert.run('smtp_user',               smtp_user               || '', uid)
    if (smtp_manufacturer_email !== undefined) upsert.run('smtp_manufacturer_email', smtp_manufacturer_email || '', uid)
    if (app_url                 !== undefined) upsert.run('app_url',                 app_url                 || '', uid)
    // Only overwrite password if a new one was explicitly provided
    if (smtp_pass && smtp_pass.trim()) upsert.run('smtp_pass', smtp_pass.trim(), uid)

    res.json({ message: 'E-Mail-Einstellungen gespeichert' })
  }
)

// ─── GET /api/settings/explore — curators + admin ───────────────────────────
const EXPLORE_KEYS = ['explore_hero_image', 'explore_hero_title', 'explore_hero_subtitle']

router.get('/explore', (req, res) => {
  const db   = getDb()
  const rows = db.prepare(`SELECT key, value FROM settings WHERE key IN (${EXPLORE_KEYS.map(() => '?').join(',')})`)
    .all(...EXPLORE_KEYS)
  const result = Object.fromEntries(rows.map(r => [r.key, r.value]))
  res.json(result)
})

// ─── PUT /api/settings/explore — curators + admin ───────────────────────────
router.put('/explore', authenticate, requireRole('admin', 'curator'), (req, res) => {
  const db  = getDb()
  const uid = req.user.id
  const upsert = db.prepare(`
    INSERT INTO settings (key, value, updated_by, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at
  `)

  for (const key of EXPLORE_KEYS) {
    if (req.body[key] !== undefined) {
      upsert.run(key, req.body[key] || '', uid)
    }
  }

  res.json({ message: 'Explore-Einstellungen gespeichert' })
})

// ─── GET /api/settings/featured-shoes — public (used by ForYou page) ────────
router.get('/featured-shoes', (req, res) => {
  const db  = getDb()
  const row = db.prepare("SELECT value FROM settings WHERE key = 'featured_shoes'").get()
  const ids = row?.value ? JSON.parse(row.value) : []
  if (ids.length === 0) return res.json([])
  const placeholders = ids.map(() => '?').join(',')
  const shoes = db.prepare(`SELECT * FROM shoes WHERE id IN (${placeholders})`).all(...ids)
  // preserve order
  const ordered = ids.map(id => shoes.find(s => s.id === id)).filter(Boolean)
  res.json(ordered)
})

// ─── PUT /api/settings/featured-shoes — admin/curator ───────────────────────
router.put('/featured-shoes', authenticate, requireRole('admin', 'curator'), (req, res) => {
  const { shoe_ids } = req.body
  if (!Array.isArray(shoe_ids) || shoe_ids.length > 3) {
    return res.status(400).json({ error: 'Maximal 3 Schuhe erlaubt' })
  }
  const db  = getDb()
  const uid = req.user.id
  db.prepare(`
    INSERT INTO settings (key, value, updated_by, updated_at)
    VALUES ('featured_shoes', ?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at
  `).run(JSON.stringify(shoe_ids), uid)
  res.json({ message: 'Empfehlungen gespeichert', shoe_ids })
})

// ─── GET /api/settings/cta-banner — public ──────────────────────────────
const CTA_KEYS = ['cta_label', 'cta_title', 'cta_text', 'cta_button', 'cta_link', 'cta_pages']
router.get('/cta-banner', (req, res) => {
  const db = getDb()
  const rows = db.prepare(`SELECT key, value FROM settings WHERE key IN (${CTA_KEYS.map(() => '?').join(',')})`)
    .all(...CTA_KEYS)
  const result = Object.fromEntries(rows.map(r => [r.key, r.value]))
  res.json({
    label:  result.cta_label  || 'Persönliche Beratung',
    title:  result.cta_title  || 'Besuchen Sie das Atelier',
    text:   result.cta_text   || 'Erleben Sie Ihr persönliches Fitting mit 3D-Fußvermessung. Kostenlos und unverbindlich.',
    button: result.cta_button || 'Termin vereinbaren',
    link:   result.cta_link   || '/scan',
    pages:  result.cta_pages  ? JSON.parse(result.cta_pages) : ['explore', 'collection', 'accessories'],
  })
})

// ─── PUT /api/settings/cta-banner — admin/curator ───────────────────────
router.put('/cta-banner', authenticate, requireRole('admin', 'curator'), (req, res) => {
  const db = getDb()
  const uid = req.user.id
  const upsert = db.prepare(`
    INSERT INTO settings (key, value, updated_by, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at
  `)
  const { label, title, text, button, link, pages } = req.body
  if (label !== undefined) upsert.run('cta_label', label, uid)
  if (title !== undefined) upsert.run('cta_title', title, uid)
  if (text !== undefined)  upsert.run('cta_text', text, uid)
  if (button !== undefined) upsert.run('cta_button', button, uid)
  if (link !== undefined) upsert.run('cta_link', link, uid)
  if (pages !== undefined) upsert.run('cta_pages', JSON.stringify(pages), uid)
  res.json({ message: 'CTA-Banner gespeichert' })
})

// ─── GET /api/settings/homepage — public (ForYou page sections) ──────────────
router.get('/homepage', (req, res) => {
  const db = getDb()
  const row = db.prepare("SELECT value FROM settings WHERE key = 'homepage_sections'").get()
  const sections = row?.value ? JSON.parse(row.value) : null
  res.json(sections)
})

// ─── PUT /api/settings/homepage — admin/curator ─────────────────────────────
router.put('/homepage', authenticate, requireRole('admin', 'curator'), (req, res) => {
  const db = getDb()
  const uid = req.user.id
  db.prepare(`
    INSERT INTO settings (key, value, updated_by, updated_at)
    VALUES ('homepage_sections', ?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at
  `).run(JSON.stringify(req.body.sections), uid)
  res.json({ message: 'Homepage-Sektionen gespeichert' })
})

export default router
