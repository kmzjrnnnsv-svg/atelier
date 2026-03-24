import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { getDb } from '../db/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()
const adminOnly = [authenticate, requireRole('admin')]

// GET /api/coupons (admin)
router.get('/', ...adminOnly, (req, res) => {
  const rows = getDb().prepare('SELECT * FROM coupons ORDER BY created_at DESC').all()
  res.json(rows)
})

// POST /api/coupons (admin)
router.post('/',
  ...adminOnly,
  body('code').trim().notEmpty().withMessage('Code erforderlich'),
  body('type').isIn(['percentage', 'fixed', 'free_shipping', 'free_accessory']),
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const { code, type, value, free_accessory_id, min_order_value, max_uses, single_use, expires_at } = req.body
    const db = getDb()

    // Check uniqueness
    const existing = db.prepare('SELECT id FROM coupons WHERE code = ?').get(code.toUpperCase())
    if (existing) return res.status(409).json({ error: 'Code existiert bereits' })

    const result = db.prepare(`
      INSERT INTO coupons (code, type, value, free_accessory_id, min_order_value, max_uses, single_use, expires_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      code.toUpperCase(), type, value || 0, free_accessory_id || null,
      min_order_value || null, max_uses || null, single_use ? 1 : 0,
      expires_at || null, req.user.id
    )

    const row = db.prepare('SELECT * FROM coupons WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(row)
  }
)

// PUT /api/coupons/:id (admin)
router.put('/:id', ...adminOnly, (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM coupons WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Not found' })

  const { code, type, value, free_accessory_id, min_order_value, max_uses, single_use, expires_at, is_active } = req.body

  db.prepare(`
    UPDATE coupons
    SET code = ?, type = ?, value = ?, free_accessory_id = ?,
        min_order_value = ?, max_uses = ?, single_use = ?,
        expires_at = ?, is_active = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    (code || existing.code).toUpperCase(),
    type || existing.type,
    value !== undefined ? value : existing.value,
    free_accessory_id !== undefined ? free_accessory_id : existing.free_accessory_id,
    min_order_value !== undefined ? min_order_value : existing.min_order_value,
    max_uses !== undefined ? max_uses : existing.max_uses,
    single_use !== undefined ? (single_use ? 1 : 0) : existing.single_use,
    expires_at !== undefined ? expires_at : existing.expires_at,
    is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
    req.params.id
  )

  const row = db.prepare('SELECT * FROM coupons WHERE id = ?').get(req.params.id)
  res.json(row)
})

// DELETE /api/coupons/:id (admin) — soft delete
router.delete('/:id', ...adminOnly, (req, res) => {
  getDb().prepare("UPDATE coupons SET is_active = 0, updated_at = datetime('now') WHERE id = ?")
    .run(req.params.id)
  res.json({ ok: true })
})

// POST /api/coupons/validate (authenticated)
router.post('/validate', authenticate, (req, res) => {
  const { code, order_total } = req.body
  if (!code) return res.status(400).json({ valid: false, reason: 'Kein Code angegeben' })

  const db = getDb()
  const coupon = db.prepare('SELECT * FROM coupons WHERE code = ? AND is_active = 1').get(code.toUpperCase())

  if (!coupon) return res.json({ valid: false, reason: 'Ungültiger Gutscheincode' })

  // Check expiry
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return res.json({ valid: false, reason: 'Gutschein ist abgelaufen' })
  }

  // Check max uses
  if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
    return res.json({ valid: false, reason: 'Gutschein wurde bereits eingelöst (max. Nutzungen erreicht)' })
  }

  // Check single use per user
  if (coupon.single_use) {
    const usage = db.prepare('SELECT id FROM coupon_usages WHERE coupon_id = ? AND user_id = ?')
      .get(coupon.id, req.user.id)
    if (usage) return res.json({ valid: false, reason: 'Gutschein wurde bereits von Ihnen eingelöst' })
  }

  // Check min order value
  const total = parseFloat(order_total) || 0
  if (coupon.min_order_value && total < coupon.min_order_value) {
    return res.json({ valid: false, reason: `Mindestbestellwert: €${coupon.min_order_value}` })
  }

  // Calculate discount
  let discount_amount = 0
  let description = ''

  switch (coupon.type) {
    case 'percentage':
      discount_amount = Math.round(total * (coupon.value / 100) * 100) / 100
      description = `${coupon.value}% Rabatt`
      break
    case 'fixed':
      discount_amount = Math.min(coupon.value, total)
      description = `€${coupon.value} Rabatt`
      break
    case 'free_shipping':
      discount_amount = 0 // Handled in checkout
      description = 'Kostenloser Versand'
      break
    case 'free_accessory':
      discount_amount = 0 // Handled in checkout
      description = 'Gratis Zubehör'
      break
  }

  res.json({
    valid: true,
    type: coupon.type,
    value: coupon.value,
    discount_amount,
    description,
    free_accessory_id: coupon.free_accessory_id,
    coupon_id: coupon.id,
  })
})

export default router
