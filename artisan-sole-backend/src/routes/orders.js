import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { getDb } from '../db/database.js'
import { commissionFor, shoetreeCost } from '../utils/affiliate.js'
import { authenticate, requireRole, requireMFA } from '../middleware/auth.js'
import { sendOrderConfirmation, sendPaymentInstructions, sendOrderConfirmed, sendManufacturerNotification, sendShippingNotification, sendQualityCheckNotification } from '../utils/email.js'
import { totpVerify } from '../utils/totp.js'
import { validateBusinessCode, validateCampaignForUser } from './business.js'
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

    // ── Zubehör reist mit, es reist nicht allein ─────────────────────────
    //
    // Ein Pflegeset einzeln zu verschicken kostet uns rund 30 € Porto — mehr
    // als der Artikel. Das ist niemandem zuzumuten, und deshalb gibt es
    // Zubehör nur zusammen mit einem Paar: Es steht in orders.accessories der
    // Schuhbestellung und geht mit demselben Paket hinaus.
    //
    // Die Prüfung gehört hierher und nicht nur in die Kasse. Eine Regel, die
    // allein im Browser lebt, ist keine Regel — sie ist eine Bitte.
    if (!req.body.shoe_id) {
      return res.status(400).json({
        error: 'Zubehör versenden wir nur zusammen mit einem Paar Schuhe. Bitte legen Sie ein Modell dazu.',
        code: 'ACCESSORY_ONLY',
      })
    }

    const {
      shoe_id, shoe_name, material, color, price, eu_size,
      delivery_address, billing_address, accessories, scan_id,
      foot_notes, shipping_method, shipping_cost, coupon_code, business_code, business_campaign_id,
      size_type, last_key, last_label, last_width, fit_measurements,
      sole, extras, config_id, fit_profile_id,
    } = req.body

    // Translate foot notes to English for manufacturer
    const foot_notes_en = foot_notes ? await translateToEnglish(foot_notes) : null

    const db  = getDb()
    const uid = req.user.id

    // ── Die gespeicherte Konfiguration ist maßgeblich ────────────────────
    // Liegt eine vor, werden die Fertigungsangaben von dort genommen und nicht
    // aus dem, was der Browser mitschickt. Vorher baute jede Oberfläche das
    // Produktobjekt neu zusammen; wer ein Feld vergaß, verlor es lautlos —
    // beim Direktkauf fehlten so sämtliche Zusatzoptionen.
    const spec = { sole, extras, size_type, eu_size, last_key, last_label, last_width, fit_measurements, fit_profile_id }
    let configRow = null
    if (config_id) {
      configRow = db.prepare('SELECT * FROM shoe_configs WHERE id = ?').get(config_id)
      if (configRow) {
        // Fremde Entwürfe nicht annehmen.
        if (configRow.user_id && configRow.user_id !== req.user.id) {
          return res.status(403).json({ error: 'Diese Konfiguration gehört zu einem anderen Konto.' })
        }
        spec.sole             = configRow.sole             ?? spec.sole
        spec.extras           = configRow.extras           ?? spec.extras
        spec.size_type        = configRow.size_type        ?? spec.size_type
        spec.eu_size          = configRow.eu_size          ?? spec.eu_size
        spec.last_key         = configRow.last_key         ?? spec.last_key
        spec.last_label       = configRow.last_label       ?? spec.last_label
        spec.last_width       = configRow.last_width       ?? spec.last_width
        spec.fit_measurements = configRow.fit_measurements ?? spec.fit_measurements
        spec.fit_profile_id   = configRow.fit_profile_id   ?? fit_profile_id
      }
    }


    // Check promotion order limit
    const userRow = db.prepare('SELECT is_promotion, promotion_max_orders, promotion_orders_used FROM users WHERE id = ?').get(uid)
    if (userRow?.is_promotion && userRow.promotion_max_orders != null) {
      if (userRow.promotion_orders_used >= userRow.promotion_max_orders) {
        return res.status(403).json({ error: 'Bestelllimit für Promotion-Account erreicht' })
      }
    }

    // Validate coupon if provided
    let couponRow = null
    let discount_amount = null
    let original_price = null
    if (coupon_code) {
      couponRow = db.prepare('SELECT * FROM coupons WHERE code = ? AND is_active = 1').get(coupon_code.toUpperCase())
      if (couponRow) {
        if (couponRow.expires_at && new Date(couponRow.expires_at) < new Date()) couponRow = null
        if (couponRow && couponRow.max_uses && couponRow.used_count >= couponRow.max_uses) couponRow = null
        if (couponRow && couponRow.single_use) {
          const usage = db.prepare('SELECT id FROM coupon_usages WHERE coupon_id = ? AND user_id = ?').get(couponRow.id, uid)
          if (usage) couponRow = null
        }
      }
      if (couponRow) {
        const priceNum = parseFloat(String(price).replace(/[^0-9.,]/g, '').replace('.', '').replace(',', '.')) || 0
        original_price = price
        if (couponRow.type === 'percentage') {
          discount_amount = `€ ${Math.round(priceNum * (couponRow.value / 100))}`
        } else if (couponRow.type === 'fixed') {
          discount_amount = `€ ${Math.min(couponRow.value, priceNum)}`
        }
      }
    }

    // Validate business code (B2B-Einmal-Code) if provided — authoritative gate
    let bizCode = null
    if (business_code) {
      const r = validateBusinessCode(db, business_code, shoe_id != null ? Number(shoe_id) : null)
      if (!r.valid) return res.status(400).json({ error: r.reason || 'Firmencode ungültig' })
      bizCode = r.code
    }

    // Validate B2B-Kampagne (Mitgliedschaft + Modell-Scope) — autoritatives Gate.
    // Verhindert, dass Nicht-Mitglieder den Kampagnen-Rabatt erhalten.
    let bizCampaign = null
    if (business_campaign_id) {
      const r = validateCampaignForUser(db, Number(business_campaign_id), uid, shoe_id != null ? Number(shoe_id) : null)
      if (!r.valid) return res.status(400).json({ error: r.reason || 'Kampagne ungültig' })
      bizCampaign = r.campaign
    }
    // Order-Business-Felder: Code hat Vorrang, sonst Kampagne.
    const orderBusinessId = bizCode ? bizCode.business_id : (bizCampaign ? bizCampaign.business_id : null)
    const orderCoverage   = bizCode ? bizCode.coverage_type
      : (bizCampaign ? (bizCampaign.payment_mode === 'company' ? 'campaign_full' : 'campaign_discount') : null)

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

    const insertOrder = db.prepare(`
      INSERT INTO orders
        (user_id, shoe_id, shoe_name, material, color, price, eu_size,
         delivery_address, billing_address, accessories, scan_id, user_order_number, status, order_ref,
         foot_notes, foot_notes_en, shipping_method, shipping_cost, coupon_code, discount_amount, original_price,
         size_type, last_key, last_label, last_width, fit_measurements,
         business_id, business_code_id, business_coverage, business_campaign_id,
         sole, extras, config_id, fit_profile_id)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `)
    const insertParams = [
      uid,
      shoe_id    || null,
      shoe_name,
      material,
      color,
      price,
      spec.eu_size || null,
      delivery_address ? JSON.stringify(delivery_address) : null,
      billing_address  ? JSON.stringify(billing_address)  : null,
      JSON.stringify(accessories || []),
      scan_id    || null,
      user_order_number,
      'pending_payment',
      order_ref,
      foot_notes || null,
      foot_notes_en || null,
      shipping_method || null,
      shipping_cost || null,
      couponRow ? coupon_code.toUpperCase() : null,
      discount_amount || null,
      original_price || null,
      spec.size_type || 'standard',
      spec.last_key   || null,
      spec.last_label || null,
      spec.last_width || null,
      typeof spec.fit_measurements === 'string' ? spec.fit_measurements
        : (spec.fit_measurements ? JSON.stringify(spec.fit_measurements) : null),
      orderBusinessId,
      bizCode ? bizCode.id : null,
      orderCoverage,
      bizCampaign ? bizCampaign.id : null,
      spec.sole || null,
      // Die gewählten Zusatzoptionen als Liste. Für die Fertigung ist das die
      // eigentliche Spezifikation — ohne sie steht in der Bestellung nur
      // Modell, Leder und Farbe, und die Manufaktur weiß nicht, was zu bauen ist.
      typeof spec.extras === 'string' ? spec.extras
        : (Array.isArray(spec.extras) && spec.extras.length ? JSON.stringify(spec.extras) : null),
      config_id || null,
      spec.fit_profile_id || null,
    ]

    let result
    if (bizCode) {
      // Bestellung + Code-Einlösung atomar — verhindert Doppeleinlösung (Race).
      try {
        result = db.transaction(() => {
          const r = insertOrder.run(...insertParams)
          const upd = db.prepare(`
            UPDATE business_codes
            SET status = 'redeemed', redeemed_by = ?, redeemed_order_id = ?, redeemed_at = datetime('now')
            WHERE id = ? AND status = 'issued'
          `).run(uid, r.lastInsertRowid, bizCode.id)
          if (upd.changes === 0) throw new Error('REDEEM_RACE')
          return r
        })()
      } catch (e) {
        if (e.message === 'REDEEM_RACE') return res.status(409).json({ error: 'Dieser Code wurde bereits eingelöst' })
        throw e
      }
    } else {
      result = insertOrder.run(...insertParams)
    }

    // Der Entwurf gehört jetzt zur Bestellung und wird festgeschrieben — ab
    // hier lässt sich nicht mehr umschreiben, was gefertigt werden soll.
    if (configRow) {
      db.prepare("UPDATE shoe_configs SET status = 'ordered', user_id = COALESCE(user_id, ?), updated_at = datetime('now') WHERE id = ?")
        .run(req.user.id, configRow.id)
    }

    // Record coupon usage + increment promotion orders
    if (couponRow) {
      db.prepare('INSERT INTO coupon_usages (coupon_id, user_id, order_id) VALUES (?, ?, ?)')
        .run(couponRow.id, uid, result.lastInsertRowid)
      db.prepare("UPDATE coupons SET used_count = used_count + 1, updated_at = datetime('now') WHERE id = ?")
        .run(couponRow.id)
    }
    // ── Vermittler-Provision festhalten ──────────────────────────────────
    // Direkt bei der Bestellung, damit die Konditionen des Vermittlers zum
    // Zeitpunkt des Kaufs gelten. Ändert er später seinen Satz, bleiben ältere
    // Vermittlungen davon unberührt.
    //
    // Eigenbestellungen bringen keine Provision — gleiche E-Mail wie der
    // Vermittler ist der häufigste Missbrauchsfall und hier mit einer
    // Bedingung abgedeckt.
    const affCode = String(req.body.affiliate_code || '').trim().toLowerCase()
    if (affCode) {
      try {
        const aff = db.prepare("SELECT * FROM affiliates WHERE code = ? AND status = 'active'").get(affCode)
        const buyerEmail = String(userRow?.email || '').toLowerCase()
        const selfOrder = aff && (
          String(aff.email || '').toLowerCase() === buyerEmail ||
          (aff.user_id && aff.user_id === uid)
        )
        // Firmenkampagnen schlagen den Vermittlercode: Den Kunden hat dann die
        // Firma gebracht, nicht der Vermittler.
        if (aff && !selfOrder && !bizCampaign && !bizCode) {
          const shoeRow = shoe_id ? db.prepare('SELECT category FROM shoes WHERE id = ?').get(shoe_id) : null
          const c = commissionFor(aff, { price }, {
            giftCost: shoetreeCost(db),
            shoeCategory: shoeRow?.category || null,
          })
          db.prepare(`
            INSERT INTO affiliate_commissions
              (affiliate_id, order_id, status, shoe_price, gross_amount, gift_cost, amount)
            VALUES (?, ?, 'pending', ?, ?, ?, ?)
          `).run(aff.id, result.lastInsertRowid, c.shoe_price, c.gross_amount, c.gift_cost, c.amount)
          db.prepare('UPDATE orders SET affiliate_code = ? WHERE id = ?').run(aff.code, result.lastInsertRowid)
        }
      } catch (e) {
        // Eine fehlgeschlagene Provisionserfassung darf die Bestellung nicht
        // scheitern lassen — der Kauf ist wichtiger als die Vermittlung.
        console.error('[affiliate commission]', e.message)
      }
    }

    if (userRow?.is_promotion) {
      db.prepare("UPDATE users SET promotion_orders_used = promotion_orders_used + 1, updated_at = datetime('now') WHERE id = ?")
        .run(uid)
    }

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
  body('status').isIn(['pending_payment','pending','processing','quality_check','shipped','delivered','cancelled']),
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

    // Track last order date for loyalty expiration
    db.prepare("UPDATE users SET last_order_at = datetime('now'), updated_at = datetime('now') WHERE id = ?")
      .run(row.user_id)

    // Award loyalty points when order is delivered (kept) — 1€ = 1 point
    if (req.body.status === 'delivered' && existing.status !== 'delivered') {
      const priceNum = parseInt(String(row.price).replace(/[^0-9]/g, ''), 10) || 0
      if (priceNum > 0) {
        const userRow = db.prepare('SELECT loyalty_points FROM users WHERE id = ?').get(row.user_id)
        const newPoints = (userRow?.loyalty_points || 0) + priceNum
        // Determine new tier
        const tiers = db.prepare('SELECT key, min_points FROM loyalty_tiers ORDER BY min_points DESC').all()
        let newTier = 'bronze'
        for (const t of tiers) {
          if (newPoints >= t.min_points) { newTier = t.key; break }
        }
        db.prepare("UPDATE users SET loyalty_points = ?, loyalty_tier = ?, updated_at = datetime('now') WHERE id = ?")
          .run(newPoints, newTier, row.user_id)
      }
    }

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

    // When marked as quality_check → notify customer
    if (req.body.status === 'quality_check' && existing.status !== 'quality_check') {
      sendQualityCheckNotification(row, user).catch(e => console.error('[email qc]', e.message))
    }

    // When admin/curator marks as shipped → notify customer
    if (req.body.status === 'shipped' && existing.status !== 'shipped') {
      sendShippingNotification(row, user).catch(e => console.error('[email shipping]', e.message))
    }

    res.json(row)
  }
)


// ── Rücksendungen ───────────────────────────────────────────────────────────
//
// Was zurückgehen kann und was nicht, ist keine Kulanzfrage: Der Schuh entsteht
// auf Maß für einen bestimmten Fuß und ist danach für niemanden sonst zu
// gebrauchen — vom Widerruf ausgenommen (§ 312g Abs. 2 Nr. 1 BGB). Zubehör ist
// Lagerware und geht regulär zurück. Deshalb prüft der Server jede Position
// gegen orders.accessories, statt sich auf das Formular zu verlassen.

const WIDERRUF_TAGE = 14

// Die zurückgebbaren Positionen einer Bestellung: das Zubehör, abzüglich
// dessen, was in einer bestehenden Rücksendung schon steckt.
function ruecksendbar(db, order) {
  let acc = []
  try { acc = JSON.parse(order.accessories || '[]') } catch { acc = [] }
  if (!Array.isArray(acc)) acc = []

  const schonAngemeldet = new Map()
  const offene = db.prepare("SELECT items FROM return_requests WHERE order_id = ? AND status != 'rejected'").all(order.id)
  for (const r of offene) {
    let items = []
    try { items = JSON.parse(r.items || '[]') } catch { items = [] }
    for (const i of items) schonAngemeldet.set(i.name, (schonAngemeldet.get(i.name) || 0) + (Number(i.qty) || 1))
  }

  return acc
    .map(a => {
      const gekauft = Number(a.qty) || 1
      const offen = gekauft - (schonAngemeldet.get(a.name) || 0)
      return { name: a.name, price: Number(a.price) || 0, qty: offen }
    })
    .filter(a => a.qty > 0)
}

// Wie lange noch. Gerechnet ab Zustellung; ohne Zustelldatum läuft die Frist
// noch nicht, die Rücksendung ist dann schlicht noch nicht fällig.
function fristTageRest(order) {
  if (!order.delivered_at) return null
  const zugestellt = new Date(String(order.delivered_at).replace(' ', 'T') + 'Z')
  const tage = Math.floor((Date.now() - zugestellt.getTime()) / 86400000)
  return WIDERRUF_TAGE - tage
}

// GET /api/orders/ruecksendungen/meine — Übersicht für den eigenen Bereich
//
// Ein Aufruf statt einer Abfrage je Bestellung: Die Seite im Profil zeigt alle
// zugestellten Bestellungen mit dem, was daraus noch zurückgehen kann, und die
// bereits angemeldeten Rücksendungen.
router.get('/ruecksendungen/meine', authenticate, (req, res) => {
  const db = getDb()
  const bestellungen = db.prepare(`
    SELECT * FROM orders
    WHERE user_id = ? AND status = 'delivered'
    ORDER BY COALESCE(delivered_at, created_at) DESC
  `).all(req.user.id)

  const antwort = bestellungen.map(o => {
    const rest = fristTageRest(o)
    return {
      order_id: o.id,
      order_ref: o.order_ref,
      shoe_name: o.shoe_name,
      delivered_at: o.delivered_at,
      created_at: o.created_at,
      items: ruecksendbar(db, o),
      window_days: WIDERRUF_TAGE,
      days_left: rest,
      open: rest != null && rest > 0,
      requests: db.prepare('SELECT id, status, items, amount, reason, note, created_at, decided_at FROM return_requests WHERE order_id = ? ORDER BY created_at DESC').all(o.id)
        .map(r => ({ ...r, items: JSON.parse(r.items || '[]') })),
    }
  })

  res.json({
    window_days: WIDERRUF_TAGE,
    orders: antwort,
    // Warum der Schuh fehlt, steht einmal zentral — sonst sucht man ihn in
    // jeder einzelnen Bestellung.
    shoe_note: 'Maßgefertigte Schuhe entstehen für einen bestimmten Fuß und lassen sich deshalb nicht zurückgeben. Passt etwas nicht, sehen wir uns das an.',
  })
})

// GET /api/orders/:id/ruecksendung — was geht zurück, was nicht, und warum
router.get('/:id/ruecksendung', authenticate, (req, res) => {
  const db = getDb()
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id)
  if (!order) return res.status(404).json({ error: 'Bestellung nicht gefunden' })
  const darf = order.user_id === req.user.id || ['admin', 'curator'].includes(req.user.role)
  if (!darf) return res.status(403).json({ error: 'Kein Zugriff auf diese Bestellung' })

  const rest = fristTageRest(order)
  res.json({
    order_id: order.id,
    items: ruecksendbar(db, order),
    // Der Schuh steht bewusst mit dabei, mit Begründung — sonst sucht der
    // Kunde die Schaltfläche, die es nicht gibt.
    shoe: { name: order.shoe_name, returnable: false, reason: 'Maßanfertigung — keine Rückgabe möglich.' },
    window_days: WIDERRUF_TAGE,
    days_left: rest,
    open: order.status === 'delivered' && rest != null && rest > 0,
    requests: db.prepare('SELECT id, status, items, amount, reason, note, created_at, decided_at FROM return_requests WHERE order_id = ? ORDER BY created_at DESC').all(order.id)
      .map(r => ({ ...r, items: JSON.parse(r.items || '[]') })),
  })
})

// POST /api/orders/:id/ruecksendung — Zubehör zurückmelden
router.post('/:id/ruecksendung', authenticate, (req, res) => {
  const db = getDb()
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id)
  if (!order) return res.status(404).json({ error: 'Bestellung nicht gefunden' })
  if (order.user_id !== req.user.id) return res.status(403).json({ error: 'Kein Zugriff auf diese Bestellung' })
  if (order.status !== 'delivered') {
    return res.status(409).json({ error: 'Eine Rücksendung ist erst nach der Zustellung möglich.' })
  }
  const rest = fristTageRest(order)
  if (rest != null && rest <= 0) {
    return res.status(409).json({ error: `Die Rücksendefrist von ${WIDERRUF_TAGE} Tagen ist abgelaufen.` })
  }

  const verfuegbar = new Map(ruecksendbar(db, order).map(a => [a.name, a]))
  const gewuenscht = Array.isArray(req.body?.items) ? req.body.items : []
  if (!gewuenscht.length) return res.status(400).json({ error: 'Keine Position ausgewählt.' })

  const items = []
  for (const w of gewuenscht) {
    const name = String(w?.name || '').trim()
    const v = verfuegbar.get(name)
    if (!v) {
      // Der häufigste Fall: Jemand versucht den Schuh zurückzugeben.
      if (name && name === order.shoe_name) {
        return res.status(409).json({ error: 'Maßgefertigte Schuhe lassen sich nicht zurückgeben. Passt etwas nicht, sehen wir uns das an — bitte melden Sie sich.' })
      }
      return res.status(400).json({ error: `„${name}" gehört nicht zu den rücksendbaren Positionen dieser Bestellung.` })
    }
    const qty = Math.min(Math.max(1, Number(w?.qty) || 1), v.qty)
    items.push({ name: v.name, price: v.price, qty })
  }

  const amount = items.reduce((s, i) => s + i.price * i.qty, 0)
  const info = db.prepare(`
    INSERT INTO return_requests (order_id, user_id, status, items, amount, reason)
    VALUES (?, ?, 'requested', ?, ?, ?)
  `).run(order.id, req.user.id, JSON.stringify(items), amount, String(req.body?.reason || '').slice(0, 500) || null)

  res.status(201).json({ id: info.lastInsertRowid, status: 'requested', items, amount })
})

// GET /api/orders/ruecksendungen/alle — Verwaltung
router.get('/ruecksendungen/alle', authenticate, requireRole('admin', 'curator'), (req, res) => {
  const rows = getDb().prepare(`
    SELECT r.*, o.order_ref, o.shoe_name, u.name AS user_name, u.email AS user_email
    FROM return_requests r
    JOIN orders o ON o.id = r.order_id
    LEFT JOIN users u ON u.id = r.user_id
    ORDER BY r.status = 'requested' DESC, r.created_at DESC
  `).all()
  res.json(rows.map(r => ({ ...r, items: JSON.parse(r.items || '[]') })))
})

// PUT /api/orders/ruecksendungen/:id — entscheiden
router.put('/ruecksendungen/:id', authenticate, requireRole('admin', 'curator'), (req, res) => {
  const db = getDb()
  const r = db.prepare('SELECT * FROM return_requests WHERE id = ?').get(req.params.id)
  if (!r) return res.status(404).json({ error: 'Rücksendung nicht gefunden' })

  const erlaubt = ['approved', 'rejected', 'received', 'refunded']
  const status = erlaubt.includes(req.body?.status) ? req.body.status : null
  if (!status) return res.status(400).json({ error: 'Ungültiger Status' })

  db.prepare(`
    UPDATE return_requests
    SET status = ?, note = COALESCE(?, note), decided_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `).run(status, req.body?.note ?? null, r.id)

  const neu = db.prepare('SELECT * FROM return_requests WHERE id = ?').get(r.id)
  res.json({ ...neu, items: JSON.parse(neu.items || '[]') })
})

export default router
