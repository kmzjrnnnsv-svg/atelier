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

export default router
