import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { getDb } from '../db/database.js'
import { authenticate, requireRole, requireMFA } from '../middleware/auth.js'
import { sendOrderConfirmation, sendPaymentInstructions, sendOrderConfirmed, sendManufacturerNotification, sendShippingNotification } from '../utils/email.js'
import { totpVerify } from '../utils/totp.js'
import Anthropic from '@anthropic-ai/sdk'

async function translateToEnglish(text) {
  if (!text) return ''
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return text
  try {
    const client = new Anthropic({ apiKey })
    const resp = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Translate the following German foot/shoe notes to English. Return ONLY the translation, nothing else.\n\n${text}`,
      }],
    })
    return resp.content[0]?.text?.trim() || text
  } catch {
    return text
  }
}

const router = Router()
const canWrite = [authenticate, requireRole('admin', 'curator')]

// GET /api/orders/mine
router.get('/mine', authenticate, (req, res) => {
  const rows = getDb()
    .prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.user.id)
  res.json(rows)
})

// GET /api/orders/all (admin/curator)
router.get('/all', ...canWrite, (req, res) => {
  const rows = getDb()
    .prepare(`SELECT o.*, u.name as user_name, u.email as user_email
              FROM orders o JOIN users u ON u.id = o.user_id
              ORDER BY o.created_at DESC`)
    .all()
  res.json(rows)
})

// POST /api/orders — place an order (full checkout)
router.post('/',
  authenticate,
  body('shoe_name').trim().notEmpty().withMessage('Shoe name required'),
  body('material').trim().notEmpty().withMessage('Material required'),
  body('color').trim().notEmpty().withMessage('Color required'),
  body('price').trim().notEmpty().withMessage('Price required'),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const {
      shoe_id, shoe_name, material, color, price, eu_size,
      delivery_address, billing_address, accessories, scan_id,
      foot_notes,
    } = req.body

    // Translate foot notes to English for manufacturer
    const foot_notes_en = foot_notes ? await translateToEnglish(foot_notes) : null

    const db  = getDb()
    const uid = req.user.id

    // Sequential order number for this user
    const { count } = db
      .prepare('SELECT COUNT(*) as count FROM orders WHERE user_id = ?')
      .get(uid)
    const user_order_number = count + 1

    // Human-readable order reference: ATL-YYYYMMDD-XXXXXX
    const now   = new Date()
    const date  = now.toISOString().slice(0, 10).replace(/-/g, '')
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let suffix  = ''
    for (let i = 0; i < 6; i++) suffix += chars[Math.floor(Math.random() * chars.length)]
    const order_ref = `ATL-${date}-${suffix}`

    const result = db.prepare(`
      INSERT INTO orders
        (user_id, shoe_id, shoe_name, material, color, price, eu_size,
         delivery_address, billing_address, accessories, scan_id, user_order_number, status, order_ref,
         foot_notes, foot_notes_en)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      uid,
      shoe_id    || null,
      shoe_name,
      material,
      color,
      price,
      eu_size    || null,
      delivery_address ? JSON.stringify(delivery_address) : null,
      billing_address  ? JSON.stringify(billing_address)  : null,
      JSON.stringify(accessories || []),
      scan_id    || null,
      user_order_number,
      'pending_payment',
      order_ref,
      foot_notes || null,
      foot_notes_en || null,
    )

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(result.lastInsertRowid)
    const user  = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(uid)

    // Send order confirmation + payment instructions async — don't block the response
    sendOrderConfirmation(order, user).catch(e => console.error('[email confirmation]', e.message))
    sendPaymentInstructions(order, user).catch(e => console.error('[email payment]', e.message))

    // Read bank details from DB settings (admin-editable)
    const bankRows = db.prepare(
      'SELECT key, value FROM settings WHERE key IN (?,?,?,?)'
    ).all('bank_iban', 'bank_bic', 'bank_holder', 'bank_name')
    const bank = Object.fromEntries(bankRows.map(r => [r.key, r.value]))

    res.status(201).json({
      ...order,
      bank_iban:   bank.bank_iban   || process.env.BANK_IBAN   || 'DE00 0000 0000 0000 0000 00',
      bank_bic:    bank.bank_bic    || process.env.BANK_BIC    || 'XXXXXXXX',
      bank_holder: bank.bank_holder || process.env.BANK_HOLDER || 'ATELIER GmbH',
      bank_name:   bank.bank_name   || process.env.BANK_NAME   || 'Musterbank',
    })
  }
)

// PUT /api/orders/:id — update status (admin/curator)
router.put('/:id',
  ...canWrite,
  body('status').isIn(['pending_payment','pending','processing','shipped','delivered','cancelled']),
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const db = getDb()
    const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id)
    if (!existing) return res.status(404).json({ error: 'Not found' })

    // Confirming payment (pending_payment → processing) requires admin + MFA
    if (req.body.status === 'processing' && existing.status === 'pending_payment') {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Nur Admins können Zahlungen bestätigen' })
      }
      // Inline MFA check (avoid redirect on 401 from middleware)
      const mfaRow = db.prepare('SELECT mfa_secret, mfa_enabled FROM users WHERE id = ?').get(req.user.id)
      if (!mfaRow?.mfa_enabled) {
        return res.status(403).json({ error: 'MFA nicht eingerichtet', code: 'MFA_NOT_SETUP' })
      }
      const mfaCode = req.headers['x-mfa-code']
      if (!mfaCode) {
        return res.status(403).json({ error: 'MFA-Code erforderlich', code: 'MFA_REQUIRED' })
      }
      if (!totpVerify(mfaCode, mfaRow.mfa_secret)) {
        return res.status(400).json({ error: 'Ungültiger MFA-Code', code: 'MFA_INVALID' })
      }
    }

    db.prepare("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?")
      .run(req.body.status, req.params.id)
    const row  = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id)
    const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(row.user_id)

    // When admin confirms payment → notify customer + manufacturer
    if (req.body.status === 'processing' && existing.status !== 'processing') {
      const scan = row.scan_id
        ? db.prepare('SELECT * FROM foot_scans WHERE id = ?').get(row.scan_id)
        : null
      Promise.all([
        sendOrderConfirmed(row, user).catch(e => console.error('[email confirmed]', e.message)),
        sendManufacturerNotification(row, user, scan).catch(e => console.error('[email mfr]', e.message)),
      ])
    }

    // When admin/curator marks as shipped → notify customer
    if (req.body.status === 'shipped' && existing.status !== 'shipped') {
      sendShippingNotification(row, user).catch(e => console.error('[email shipping]', e.message))
    }

    res.json(row)
  }
)

export default router
