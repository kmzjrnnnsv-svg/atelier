import { Router } from 'express'
import QRCode from 'qrcode'
import { body, param, validationResult } from 'express-validator'
import { getDb } from '../db/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import {
  affiliateStanding, matureCommissions, shoetreeCost,
  PAYOUT_BATCH_SIZE, PROTECTION_DAYS,
} from '../utils/affiliate.js'

const router = Router()
const canAdmin = [authenticate, requireRole('admin', 'curator')]

// Was ein Vermittler von sich selbst sehen darf. Bankdaten ja (sind seine),
// aber nirgends Kundennamen oder Adressen — für die Abrechnung nicht nötig
// und datenschutzrechtlich unnötiger Ballast.
const selfFields = `
  id, code, status, full_name, email, phone, street, postal_code, city, country,
  tax_status, tax_number, vat_id, iban, account_holder,
  commission_type, commission_value, cap_per_shoe, gift_shoetree, created_at
`

const normCode = (s) => String(s || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '')

// ── Öffentlich: Code prüfen (Warenkorb) ───────────────────────────────────
// Gibt bewusst wenig preis: ob der Code gilt und ob eine Zugabe dranhängt.
// Weder Name noch Konditionen des Vermittlers gehen den Käufer etwas an.
router.get('/validate/:code', (req, res) => {
  const code = normCode(req.params.code)
  if (!code) return res.status(400).json({ valid: false, error: 'Code fehlt' })

  const db = getDb()
  const a = db.prepare("SELECT code, gift_shoetree, commission_type FROM affiliates WHERE code = ? AND status = 'active'").get(code)
  if (!a) return res.status(404).json({ valid: false, error: 'Dieser Code ist nicht gültig.' })

  res.json({
    valid: true,
    code: a.code,
    // Zugabe gibt es nur bei der Prozentwahl — siehe utils/affiliate.js
    gift: a.gift_shoetree === 1 && a.commission_type === 'percent' ? 'shoe_tree_cedar' : null,
  })
})

// ── Öffentlich: Bewerbung als Vermittler ──────────────────────────────────
// Landet als 'pending' und wird im CMS freigegeben. Die Freigabe bleibt
// bewusst beim Betreiber: Der Code ist Teil der Außenwirkung.
router.post('/register',
  body('full_name').trim().isLength({ min: 2 }).withMessage('Name erforderlich'),
  body('email').trim().isEmail().withMessage('Gültige E-Mail erforderlich'),
  body('code').trim().isLength({ min: 3, max: 24 }).withMessage('Wunschcode: 3 bis 24 Zeichen'),
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg })

    const code = normCode(req.body.code)
    if (!code) return res.status(400).json({ error: 'Code darf nur Buchstaben, Ziffern und Bindestriche enthalten.' })

    const db = getDb()
    if (db.prepare('SELECT 1 FROM affiliates WHERE code = ?').get(code)) {
      return res.status(409).json({ error: 'Dieser Code ist bereits vergeben.' })
    }

    const b = req.body
    const info = db.prepare(`
      INSERT INTO affiliates
        (code, status, full_name, email, phone, street, postal_code, city, country, birth_date,
         tax_status, tax_number, vat_id, iban, account_holder,
         commission_type, commission_value, cap_per_shoe, gift_shoetree, terms_accepted_at)
      VALUES (?, 'pending', ?,?,?,?,?,?,?,?, ?,?,?,?,?, ?,?,?,?, datetime('now'))
    `).run(
      code,
      String(b.full_name).trim(), String(b.email).trim(), b.phone || null,
      b.street || null, b.postal_code || null, b.city || null, b.country || 'DE', b.birth_date || null,
      b.tax_status === 'vat_liable' ? 'vat_liable' : 'small_business',
      b.tax_number || null, b.vat_id || null, b.iban || null, b.account_holder || null,
      b.commission_type === 'fixed' ? 'fixed' : 'percent',
      Number(b.commission_value) || 10,
      Number(b.cap_per_shoe) || 40,
      b.gift_shoetree ? 1 : 0,
    )
    res.status(201).json({ id: info.lastInsertRowid, code, status: 'pending' })
  }
)

// ── Vermittler: eigener Stand ─────────────────────────────────────────────
// Werbelink des Vermittlers. Der Code steckt als ?ref= darin; die Seite legt
// ihn in den Warenkorb, wo der Käufer ihn sieht und überschreiben kann — das
// hält die Zuordnung nachvollziehbar und kommt ohne stilles Cookie aus.
function affiliateLink(code) {
  const base = process.env.APP_URL || 'https://artisansole.com'
  return `${base.replace(/\/$/, '')}/?ref=${encodeURIComponent(code)}`
}

router.get('/me', authenticate, async (req, res) => {
  const db = getDb()
  const a = db.prepare(`SELECT ${selfFields} FROM affiliates WHERE user_id = ?`).get(req.user.id)
  if (!a) return res.status(404).json({ error: 'Kein Vermittlerkonto zu diesem Benutzer' })

  matureCommissions(db)

  const standing = affiliateStanding(db, a.id)
  const commissions = db.prepare(`
    SELECT c.id, c.status, c.shoe_price, c.gross_amount, c.gift_cost, c.amount,
           c.payable_at, c.created_at, o.shoe_name
    FROM affiliate_commissions c
    JOIN orders o ON o.id = c.order_id
    WHERE c.affiliate_id = ?
    ORDER BY c.created_at DESC
    LIMIT 100
  `).all(a.id)

  const payouts = db.prepare(`
    SELECT id, reference, pair_count, amount, paid_at, created_at
    FROM affiliate_payouts WHERE affiliate_id = ? ORDER BY created_at DESC
  `).all(a.id)

  const link = affiliateLink(a.code)
  // QR als Data-URL: Ein Vermittler soll ihn ausdrucken und auslegen können,
  // ohne dass die Seite dafür eine weitere Abhängigkeit lädt.
  const qr = await QRCode.toDataURL(link, { margin: 1, width: 480, color: { dark: '#111111', light: '#FFFFFF' } })
    .catch(() => null)

  res.json({
    affiliate: a,
    link,
    qr,
    standing,
    commissions,
    payouts,
    rules: { batchSize: PAYOUT_BATCH_SIZE, protectionDays: PROTECTION_DAYS, giftCost: shoetreeCost(db) },
  })
})

// ── CMS: Übersicht mit Rangliste ──────────────────────────────────────────
router.get('/', ...canAdmin, (req, res) => {
  const db = getDb()
  matureCommissions(db)

  // Ein Durchgang statt einer Abfrage je Vermittler: Bei „unzähligen"
  // Vermittlern wäre das sonst eine Abfrage pro Zeile.
  const rows = db.prepare(`
    SELECT a.id, a.code, a.status, a.full_name, a.email, a.city,
           a.commission_type, a.commission_value, a.cap_per_shoe, a.gift_shoetree,
           a.tax_status, a.iban, a.created_at,
           COUNT(c.id)                                                   AS pairs_total,
           COALESCE(SUM(CASE WHEN c.status != 'cancelled' THEN c.shoe_price END), 0) AS revenue,
           COALESCE(SUM(CASE WHEN c.status = 'payable'   THEN c.amount END), 0)      AS open_amount,
           COALESCE(SUM(CASE WHEN c.status = 'payable'   THEN 1 END), 0)             AS open_pairs,
           COALESCE(SUM(CASE WHEN c.status = 'paid'      THEN c.amount END), 0)      AS paid_amount,
           COALESCE(SUM(CASE WHEN c.status = 'cancelled' THEN 1 END), 0)             AS returned_pairs
    FROM affiliates a
    LEFT JOIN affiliate_commissions c ON c.affiliate_id = a.id
    GROUP BY a.id
    ORDER BY revenue DESC, a.created_at ASC
  `).all()

  res.json(rows.map(r => ({
    ...r,
    // Rückgabequote: wichtiger als sie aussieht. Viel Umsatz bei hoher Quote
    // ist teurer als halber Umsatz bei niedriger.
    return_rate: r.pairs_total ? Math.round((r.returned_pairs / r.pairs_total) * 1000) / 10 : 0,
    // Auszahlung erfolgt in Fünferschritten; der Rest wartet auf die nächste Runde.
    payable_batches: Math.floor(r.open_pairs / PAYOUT_BATCH_SIZE),
    // Ohne Steuerangaben und Bankverbindung darf nicht ausgezahlt werden.
    payout_blocked: !r.iban || (r.tax_status === 'vat_liable' && !r.vat_id),
  })))
})

// ── CMS: einzelnen Vermittler ändern ──────────────────────────────────────
router.put('/:id', ...canAdmin, param('id').isInt(), (req, res) => {
  const db = getDb()
  const a = db.prepare('SELECT * FROM affiliates WHERE id = ?').get(req.params.id)
  if (!a) return res.status(404).json({ error: 'Not found' })

  const allowed = ['status', 'full_name', 'email', 'phone', 'street', 'postal_code', 'city',
    'country', 'birth_date', 'tax_status', 'tax_number', 'vat_id', 'iban', 'account_holder',
    'commission_type', 'commission_value', 'cap_per_shoe', 'gift_shoetree', 'note', 'user_id']
  const patch = {}
  for (const k of allowed) if (req.body[k] !== undefined) patch[k] = req.body[k]
  if (patch.gift_shoetree !== undefined) patch.gift_shoetree = patch.gift_shoetree ? 1 : 0
  if (!Object.keys(patch).length) return res.json(a)

  const set = Object.keys(patch).map(k => `${k} = ?`).join(', ')
  db.prepare(`UPDATE affiliates SET ${set}, updated_at = datetime('now') WHERE id = ?`)
    .run(...Object.values(patch), req.params.id)

  res.json(db.prepare('SELECT * FROM affiliates WHERE id = ?').get(req.params.id))
})

// ── CMS: Auszahlung anlegen ───────────────────────────────────────────────
// Zahlt volle Fünferrunden aus, älteste Paare zuerst. Der Rest bleibt stehen
// und zählt für die nächste Runde weiter.
router.post('/:id/payout', ...canAdmin, param('id').isInt(), (req, res) => {
  const db = getDb()
  const a = db.prepare('SELECT * FROM affiliates WHERE id = ?').get(req.params.id)
  if (!a) return res.status(404).json({ error: 'Not found' })
  if (!a.iban) return res.status(400).json({ error: 'Keine Bankverbindung hinterlegt.' })
  if (a.tax_status === 'vat_liable' && !a.vat_id) {
    return res.status(400).json({ error: 'Umsatzsteuer-ID fehlt.' })
  }

  matureCommissions(db)

  const payable = db.prepare(`
    SELECT id, amount FROM affiliate_commissions
    WHERE affiliate_id = ? AND status = 'payable'
    ORDER BY payable_at ASC, id ASC
  `).all(a.id)

  // Aufrunden wäre falsch: Ausgezahlt wird nur, was voll ist.
  const batches = Math.floor(payable.length / PAYOUT_BATCH_SIZE)
  const takeAll = req.body?.include_remainder === true   // Ventil für ruhende Konten
  const take = takeAll ? payable.length : batches * PAYOUT_BATCH_SIZE

  if (take === 0) {
    return res.status(400).json({
      error: `Noch keine volle Runde: ${payable.length} von ${PAYOUT_BATCH_SIZE} Paaren auszahlbar.`,
    })
  }

  const selected = payable.slice(0, take)
  const amount = Math.round(selected.reduce((s, c) => s + c.amount, 0) * 100) / 100
  const reference = `AFF-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${a.code.toUpperCase()}-${Date.now().toString(36).slice(-4)}`

  const result = db.transaction(() => {
    const info = db.prepare(`
      INSERT INTO affiliate_payouts (affiliate_id, reference, pair_count, amount, paid_at, note)
      VALUES (?, ?, ?, ?, datetime('now'), ?)
    `).run(a.id, reference, selected.length, amount, req.body?.note || null)

    const mark = db.prepare("UPDATE affiliate_commissions SET status = 'paid', payout_id = ?, updated_at = datetime('now') WHERE id = ?")
    for (const c of selected) mark.run(info.lastInsertRowid, c.id)
    return { id: info.lastInsertRowid, reference, pair_count: selected.length, amount }
  })()

  res.status(201).json(result)
})

export default router
