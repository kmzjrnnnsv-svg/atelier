import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { getDb } from '../db/database.js'
import { authenticate, requireRole, requireMFA } from '../middleware/auth.js'
import { verifyEmailSetup, sendTestEmail, diagnoseSmtp } from '../utils/email.js'

const router = Router()

const BANK_KEYS  = ['bank_iban', 'bank_bic', 'bank_holder', 'bank_name']
const EMAIL_KEYS = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_manufacturer_email', 'business_inquiry_email', 'app_url']

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
    business_inquiry_email:  s.business_inquiry_email  || process.env.BUSINESS_INQUIRY_EMAIL  || '',
    app_url:                 s.app_url                 || process.env.APP_URL                 || '',
  })
})

// ─── PUT /api/settings/email — admin only + MFA ───────────────────────────────
// ─── GET /api/settings/email/check — Verbindung prüfen, ohne zu senden ──────
// Ohne das ließ sich nicht feststellen, ob der Versand funktioniert: Fehlte
// die Zugangskennung, schrieb das System stillschweigend auf die Konsole und
// meldete nach außen Erfolg.
router.get('/email/check', authenticate, requireRole('admin'), async (req, res) => {
  res.json(await verifyEmailSetup())
})

// ─── GET /api/settings/email/diagnose — wo genau es klemmt ─────────────────
// Rohe TCP-Verbindungen zum hinterlegten Mailserver, je Port über IPv4 und
// IPv6 getrennt. Damit lässt sich eine gesperrte Portfreigabe von einer
// IPv6-Sackgasse unterscheiden — ohne Zugang zur Kommandozeile des Servers.
// Die Prüfung dauert bis zu einigen Sekunden, deshalb ein eigener Aufruf und
// kein Teil von /check.
router.get('/email/diagnose', authenticate, requireRole('admin'), async (req, res) => {
  try {
    res.json(await diagnoseSmtp())
  } catch (e) {
    res.status(500).json({ ok: false, reason: e.message })
  }
})

// ─── POST /api/settings/email/test — Testnachricht verschicken ─────────────
router.post('/email/test', authenticate, requireRole('admin'),
  body('to').trim().isEmail().withMessage('Gültige Empfängeradresse nötig'),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg })
    try {
      await sendTestEmail(req.body.to)
      res.json({ ok: true })
    } catch (e) {
      res.status(502).json({ ok: false, error: e.message })
    }
  }
)

router.put('/email',
  authenticate,
  requireRole('admin'),
  requireMFA,
  body('smtp_user').optional({ checkFalsy: true }).isEmail().withMessage('Ungültige Absender-E-Mail'),
  body('smtp_manufacturer_email').optional({ checkFalsy: true }).isEmail().withMessage('Ungültige Hersteller-E-Mail'),
  body('business_inquiry_email').optional({ checkFalsy: true }).isEmail().withMessage('Ungültige Anfrage-E-Mail'),
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

    const { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_manufacturer_email, business_inquiry_email, app_url } = req.body

    if (smtp_host               !== undefined) upsert.run('smtp_host',               smtp_host               || '', uid)
    if (smtp_port               !== undefined) upsert.run('smtp_port',               smtp_port               || '587', uid)
    if (smtp_user               !== undefined) upsert.run('smtp_user',               smtp_user               || '', uid)
    if (smtp_manufacturer_email !== undefined) upsert.run('smtp_manufacturer_email', smtp_manufacturer_email || '', uid)
    if (business_inquiry_email  !== undefined) upsert.run('business_inquiry_email',  business_inquiry_email  || '', uid)
    if (app_url                 !== undefined) upsert.run('app_url',                 app_url                 || '', uid)
    // Only overwrite password if a new one was explicitly provided
    if (smtp_pass && smtp_pass.trim()) upsert.run('smtp_pass', smtp_pass.trim(), uid)

    res.json({ message: 'E-Mail-Einstellungen gespeichert' })
  }
)


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
const CTA_KEYS = ['cta_label', 'cta_title', 'cta_text', 'cta_button', 'cta_link', 'cta_pages', 'cta_image']
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
    pages:  result.cta_pages  ? JSON.parse(result.cta_pages) : ['collection', 'accessories'],
    image:  result.cta_image  || '',
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
  const { label, title, text, button, link, pages, image } = req.body
  if (label !== undefined) upsert.run('cta_label', label, uid)
  if (title !== undefined) upsert.run('cta_title', title, uid)
  if (text !== undefined)  upsert.run('cta_text', text, uid)
  if (button !== undefined) upsert.run('cta_button', button, uid)
  if (link !== undefined) upsert.run('cta_link', link, uid)
  if (pages !== undefined) upsert.run('cta_pages', JSON.stringify(pages), uid)
  if (image !== undefined) upsert.run('cta_image', image, uid)
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

// ─── GET /api/settings/footer — public (footer content) ─────────────────────
router.get('/footer', (req, res) => {
  const db = getDb()
  const row = db.prepare("SELECT value FROM settings WHERE key = 'footer_config'").get()
  const config = row?.value ? JSON.parse(row.value) : null
  res.json(config)
})

// ─── PUT /api/settings/footer — admin/curator ──────────────────────────────
router.put('/footer', authenticate, requireRole('admin', 'curator'), (req, res) => {
  const db = getDb()
  const uid = req.user.id
  db.prepare(`
    INSERT INTO settings (key, value, updated_by, updated_at)
    VALUES ('footer_config', ?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at
  `).run(JSON.stringify(req.body.config), uid)
  res.json({ message: 'Footer-Einstellungen gespeichert' })
})

// ─── GET /api/settings/product-texts — public (Produktseiten-Texte) ─────────
router.get('/product-texts', (req, res) => {
  const db = getDb()
  const row = db.prepare("SELECT value FROM settings WHERE key = 'product_page_texts'").get()
  res.json(row?.value ? JSON.parse(row.value) : null)
})

// ─── PUT /api/settings/product-texts — admin/curator ───────────────────────
router.put('/product-texts', authenticate, requireRole('admin', 'curator'), (req, res) => {
  const db = getDb()
  db.prepare(`
    INSERT INTO settings (key, value, updated_by, updated_at)
    VALUES ('product_page_texts', ?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at
  `).run(JSON.stringify(req.body.config), req.user.id)
  res.json({ message: 'Produktseiten-Texte gespeichert' })
})

// ─── Seiten-Header (Hero-Bilder der öffentlichen Seiten) ───────────────────
// Bis hierher steckten diese Bilder fest im Frontend-Code, jeder Wechsel
// brauchte ein Deployment. Sie liegen jetzt wie alle anderen Website-Bilder
// in den Settings und sind über /cms/website-images austauschbar.
//
// Form: { [slot]: { image: '/uploads/…', position: 'center', tint: false } }
// `position` ist die CSS object-position und entscheidet, welcher Ausschnitt
// beim Zuschnitt stehen bleibt.
// `tint` legt eine freigestellte Aufnahme multiplikativ auf die greige Fläche
// der Kopfzeile. Weiß wird dadurch zum Greige, Schlagschatten bleiben als
// getönte Schatten stehen — dieselbe Rechnung wie scripts/greige-bg.py, nur
// im Browser statt vorab auf der Datei. Nur für Aufnahmen auf weißem Grund
// sinnvoll; ein Lifestyle-Foto würde davon nur trüb.
const HERO_SLOTS = ['collection', 'accessories', 'profile', 'help', 'business', 'wishlist']
const HERO_POSITIONS = ['top', 'center', 'bottom', 'left', 'right']

router.get('/page-heroes', (req, res) => {
  const db = getDb()
  const row = db.prepare("SELECT value FROM settings WHERE key = 'page_heroes'").get()
  res.json(row?.value ? JSON.parse(row.value) : null)
})

router.put('/page-heroes', authenticate, requireRole('admin', 'curator'), (req, res) => {
  const incoming = req.body?.heroes
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
    return res.status(400).json({ error: 'heroes-Objekt erforderlich' })
  }

  // Nur bekannte Slots übernehmen, damit über diesen Endpoint keine
  // beliebigen Schlüssel in den Settings landen.
  const clean = {}
  for (const slot of HERO_SLOTS) {
    const entry = incoming[slot]
    if (!entry || typeof entry !== 'object') continue
    const image = String(entry.image ?? '').trim()
    const position = HERO_POSITIONS.includes(entry.position) ? entry.position : 'center'
    const tint = entry.tint === true
    if (image) clean[slot] = { image, position, tint }
  }

  const db = getDb()
  db.prepare(`
    INSERT INTO settings (key, value, updated_by, updated_at)
    VALUES ('page_heroes', ?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at
  `).run(JSON.stringify(clean), req.user.id)

  res.json({ message: 'Seiten-Header gespeichert', heroes: clean })
})

// ─── GET /api/settings/whatsapp, public (used by Custom-Anfrage) ────────────
router.get('/whatsapp', (req, res) => {
  const db = getDb()
  const row = db.prepare("SELECT value FROM settings WHERE key = 'whatsapp_business_number'").get()
  res.json({ number: row?.value || '' })
})

// ─── PUT /api/settings/whatsapp — admin only ────────────────────────────────
router.put('/whatsapp', authenticate, requireRole('admin'), (req, res) => {
  const number = String(req.body.number ?? '').trim()
  if (number && !/^\+?[0-9 ()/-]{6,}$/.test(number)) {
    return res.status(400).json({ error: 'Ungültige Telefonnummer' })
  }
  const db = getDb()
  db.prepare(`
    INSERT INTO settings (key, value, updated_by, updated_at)
    VALUES ('whatsapp_business_number', ?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = datetime('now')
  `).run(number, req.user.id)
  res.json({ number })
})

export default router
