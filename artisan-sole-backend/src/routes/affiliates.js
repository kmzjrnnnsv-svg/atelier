import { Router } from 'express'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import QRCode from 'qrcode'
import { body, param, validationResult } from 'express-validator'
import { getDb } from '../db/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import {
  affiliateStanding, matureCommissions,
  PAYOUT_BATCH_SIZE, PROTECTION_DAYS,
} from '../utils/affiliate.js'
import { sendAffiliateInvitation } from '../utils/email.js'

const router = Router()
const canAdmin = [authenticate, requireRole('admin', 'curator')]

// Was ein Affiliate von sich selbst sehen darf. Bankdaten ja (sind seine),
// aber nirgends Kundennamen oder Adressen — für die Abrechnung nicht nötig
// und datenschutzrechtlich unnötiger Ballast.
const selfFields = `
  id, code, status, full_name, email, phone, street, postal_code, city, country,
  tax_status, tax_number, vat_id, iban, account_holder, birth_date,
  commission_type, commission_value, cap_per_shoe,
  customer_benefit, customer_discount_pct, gift_key, created_at, terms_accepted_at
`

const normCode = (s) => String(s || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '')

/**
 * Ein freier Werbecode, abgeleitet aus der Adresse.
 *
 * Beim Anlegen ist außer der E-Mail nichts bekannt — der Name kommt erst,
 * wenn der Affiliate seine Daten selbst einträgt. Der Code muss aber sofort
 * stehen, weil er die Kennung des Kontos ist. Er lässt sich später in der
 * Verwaltung ändern, solange er noch nirgends im Umlauf ist.
 */
function codeVorschlag(db, email) {
  const frei = (c) => c.length >= 3 && !db.prepare('SELECT 1 FROM affiliates WHERE code = ?').get(c)
  const basis = normCode(
    String(email || '').split('@')[0]
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
  ).replace(/^-+|-+$/g, '').slice(0, 16)

  if (frei(basis)) return basis
  for (let i = 0; i < 50; i++) {
    const kandidat = `${basis || 'partner'}-${crypto.randomBytes(2).toString('hex')}`.slice(0, 24)
    if (frei(kandidat)) return kandidat
  }
  // Sollte nie eintreten; lieber ein sperriger Code als gar kein Konto.
  return `partner-${crypto.randomBytes(6).toString('hex')}`.slice(0, 24)
}

// ── Öffentlich: Code prüfen (Warenkorb) ───────────────────────────────────
// Gibt bewusst wenig preis: ob der Code gilt und ob eine Zugabe dranhängt.
// Weder Name noch Konditionen des Affiliates gehen den Käufer etwas an.
router.get('/validate/:code', (req, res) => {
  const code = normCode(req.params.code)
  if (!code) return res.status(400).json({ valid: false, error: 'Code fehlt' })

  const db = getDb()
  const a = db.prepare(
    "SELECT code, customer_benefit, customer_discount_pct, gift_key FROM affiliates WHERE code = ? AND status = 'active'"
  ).get(code)
  if (!a) return res.status(404).json({ valid: false, error: 'Dieser Code ist nicht gültig.' })

  // Entweder ein Nachlass oder eine Zugabe — nie beides. Der Kunde soll sehen,
  // was er bekommt; was der Affiliate dafür erhält, geht ihn nichts an.
  res.json({
    valid: true,
    code: a.code,
    benefit: a.customer_benefit || 'none',
    customer_discount_pct: a.customer_benefit === 'discount' ? Number(a.customer_discount_pct) || 0 : 0,
    gift: a.customer_benefit === 'gift' ? (a.gift_key || null) : null,
  })
})

// ── Öffentlich: Bewerbung als Affiliate ──────────────────────────────────
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

// ── Affiliate: eigener Stand ─────────────────────────────────────────────
// Werbelink des Affiliates. Der Code steckt als ?ref= darin; die Seite legt
// ihn in den Warenkorb, wo der Käufer ihn sieht und überschreiben kann — das
// hält die Zuordnung nachvollziehbar und kommt ohne stilles Cookie aus.
function affiliateLink(code) {
  const base = process.env.APP_URL || 'https://artisansole.com'
  return `${base.replace(/\/$/, '')}/?ref=${encodeURIComponent(code)}`
}

router.get('/me', authenticate, async (req, res) => {
  const db = getDb()
  const a = db.prepare(`SELECT ${selfFields} FROM affiliates WHERE user_id = ?`).get(req.user.id)
  if (!a) return res.status(404).json({ error: 'Kein Affiliate-Konto zu diesem Benutzer' })

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
  // QR als Data-URL: Ein Affiliate soll ihn ausdrucken und auslegen können,
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
    rules: { batchSize: PAYOUT_BATCH_SIZE, protectionDays: PROTECTION_DAYS },
  })
})

// ── Affiliate: eigene Stammdaten eintragen ───────────────────────────────
//
// Beim Anlegen kennt das Haus nur die E-Mail. Anschrift, Geburtsdatum,
// Steuerstatus und Bankverbindung stehen hier — eingetragen von dem, der sie
// kennt. Vorher tippte die Verwaltung sie ab, und die Gutschrift lief auf
// Angaben, die niemand geprüft hatte.
//
// Was der Affiliate NICHT ändern kann: seinen Code, seine Konditionen und
// seinen Status. Das sind die Zusagen des Hauses, keine Selbstauskunft.
const SELBST_FELDER = [
  'full_name', 'phone', 'street', 'postal_code', 'city', 'country', 'birth_date',
  'tax_status', 'tax_number', 'vat_id', 'iban', 'account_holder',
]

router.patch('/me', authenticate,
  body('full_name').optional({ values: 'falsy' }).trim().isLength({ min: 2 }).withMessage('Bitte Vor- und Nachnamen angeben'),
  body('iban').optional({ values: 'falsy' }).trim().isLength({ min: 15, max: 34 }).withMessage('Diese IBAN sieht nicht vollständig aus'),
  (req, res) => {
    const fehler = validationResult(req)
    if (!fehler.isEmpty()) return res.status(400).json({ error: fehler.array()[0].msg })

    const db = getDb()
    const a = db.prepare('SELECT id FROM affiliates WHERE user_id = ?').get(req.user.id)
    if (!a) return res.status(404).json({ error: 'Kein Affiliate-Konto zu diesem Benutzer' })

    const patch = {}
    for (const k of SELBST_FELDER) {
      if (req.body[k] === undefined) continue
      patch[k] = req.body[k] === '' ? null : req.body[k]
    }
    if (patch.tax_status && !['small_business', 'vat_liable'].includes(patch.tax_status)) {
      return res.status(400).json({ error: 'Unbekannter Steuerstatus' })
    }
    // Ohne Angabe bleibt das Land, wie es war — NULL wäre gegen die Spalte.
    if (patch.country === null) delete patch.country

    // Zustimmung nur, wenn sie ausdrücklich mitkommt, und nur einmal.
    if (req.body.terms_accepted) {
      const vorhanden = db.prepare('SELECT terms_accepted_at FROM affiliates WHERE id = ?').get(a.id)
      if (!vorhanden?.terms_accepted_at) patch.terms_accepted_at = new Date().toISOString()
    }

    if (!Object.keys(patch).length) {
      return res.status(400).json({ error: 'Keine Änderungen angegeben' })
    }

    const set = Object.keys(patch).map(k => `${k} = ?`).join(', ')
    db.prepare(`UPDATE affiliates SET ${set}, updated_at = datetime('now') WHERE id = ?`)
      .run(...Object.values(patch), a.id)

    // Der Name steht auch am Benutzerkonto — sonst grüßt der Laden weiter mit
    // einer leeren Zeile, während im Affiliate-Bereich der richtige Name steht.
    if (patch.full_name) {
      db.prepare("UPDATE users SET name = ?, updated_at = datetime('now') WHERE id = ?")
        .run(patch.full_name, req.user.id)
    }

    res.json(db.prepare(`SELECT ${selfFields} FROM affiliates WHERE id = ?`).get(a.id))
  }
)

// ── CMS: Übersicht mit Rangliste ──────────────────────────────────────────
router.get('/', ...canAdmin, (req, res) => {
  const db = getDb()
  matureCommissions(db)

  // Ein Durchgang statt einer Abfrage je Affiliate: Bei „unzähligen"
  // Affiliates wäre das sonst eine Abfrage pro Zeile.
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

// ── CMS: Affiliate anlegen ───────────────────────────────────────────────
// Anders als /register: Der Betreiber legt selbst an, also ist der Zugang
// sofort aktiv — die Freigabe, die /register abwartet, hat hier schon
// stattgefunden. Verlangt werden nur Name, E-Mail und Code; alles Weitere
// (Anschrift, Steuerangaben, Bankverbindung) lässt sich später ergänzen.
// Ohne IBAN bleibt die Auszahlung ohnehin gesperrt, siehe payout_blocked.
router.post('/',
  ...canAdmin,
  // Zum Anlegen genügt die E-Mail.
  //
  // Vorher verlangte die Maske Name, Anschrift, Geburtsdatum, Steuerstatus und
  // Bankverbindung — Angaben, die das Haus zu diesem Zeitpunkt gar nicht hat.
  // Sie wurden geschätzt, aus einer Mail zusammengesucht oder leer gelassen,
  // und die Gutschrift lief später auf eine Anschrift, die niemand geprüft
  // hatte. Wer sie kennt, ist der Affiliate selbst: Er trägt sie nach der
  // Einladung ein, die Verwaltung sieht sie und kann sie ändern.
  body('email').trim().isEmail().withMessage('Gültige E-Mail erforderlich'),
  body('full_name').optional({ values: 'falsy' }).trim().isLength({ min: 2 }).withMessage('Name: mindestens 2 Zeichen'),
  body('code').optional({ values: 'falsy' }).trim().isLength({ min: 3, max: 24 }).withMessage('Code: 3 bis 24 Zeichen'),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg })

    const db = getDb()
    // Ohne eigenen Code einen aus der Adresse ableiten — er ist die Kennung
    // des Kontos und muss sofort stehen.
    const code = req.body.code ? normCode(req.body.code) : codeVorschlag(db, req.body.email)
    if (!code) return res.status(400).json({ error: 'Code darf nur Buchstaben, Ziffern und Bindestriche enthalten.' })
    if (db.prepare('SELECT 1 FROM affiliates WHERE code = ?').get(code)) {
      return res.status(409).json({ error: 'Dieser Code ist bereits vergeben.' })
    }

    const b = req.body
    const email = String(b.email).trim()
    const type = b.commission_type === 'fixed' ? 'fixed' : 'percent'

    // Die Wahl darf mitkommen; tut sie es nicht, leiten wir sie aus dem ab,
    // was dasteht. Sonst müsste jeder bestehende Aufrufer zugleich umgestellt
    // werden, nur weil zwei Felder zu einem wurden.
    const vorteil = ['none', 'discount', 'gift'].includes(b.customer_benefit)
      ? b.customer_benefit
      : (Number(b.customer_discount_pct) > 0 ? 'discount'
        : (b.gift_key || b.gift_shoetree ? 'gift' : 'none'))

    // Ein Affiliate ist eine Person, kein Firmenkonto: Zum Datensatz gehört
    // ein Login, sonst sieht er seinen Stand nie. Gibt es die Adresse schon
    // als Benutzer, wird sie verknüpft statt ein zweites Konto anzulegen.
    const bestehend = db.prepare('SELECT id, is_active FROM users WHERE email = ? COLLATE NOCASE').get(email)
    if (bestehend && db.prepare('SELECT 1 FROM affiliates WHERE user_id = ?').get(bestehend.id)) {
      return res.status(409).json({ error: 'Zu dieser Adresse besteht bereits ein Affiliate-Konto.' })
    }

    const inviteToken = bestehend ? null : crypto.randomBytes(32).toString('hex')
    const tempHash = bestehend ? null : await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 12)

    const tx = db.transaction(() => {
      const userId = bestehend
        ? bestehend.id
        : db.prepare("INSERT INTO users (name, email, password_hash, role, is_active) VALUES (?, ?, ?, 'user', 0)")
            .run(String(b.full_name || '').trim(), email, tempHash).lastInsertRowid

      const info = db.prepare(`
        INSERT INTO affiliates
          (user_id, code, status, full_name, email, phone, street, postal_code, city, country, birth_date,
           tax_status, tax_number, vat_id, iban, account_holder,
           commission_type, commission_value, cap_per_shoe,
           customer_benefit, customer_discount_pct, gift_key,
           invite_token, note, terms_accepted_at)
        -- terms_accepted_at bleibt leer: Zustimmen kann nur der Affiliate
        -- selbst, und zwar wenn er seine Daten einträgt. Die Verwaltung kann
        -- das nicht für ihn tun.
        VALUES (?, ?, 'active', ?,?,?,?,?,?,?,?, ?,?,?,?,?, ?,?,?, ?,?,?, ?,?, NULL)
      `).run(
        userId, code,
        String(b.full_name || '').trim(), email, b.phone || null,
        b.street || null, b.postal_code || null, b.city || null, b.country || 'DE', b.birth_date || null,
        b.tax_status === 'vat_liable' ? 'vat_liable' : 'small_business',
        b.tax_number || null, b.vat_id || null, b.iban || null, b.account_holder || null,
        type,
        Number(b.commission_value) || (type === 'fixed' ? 25 : 10),
        Number(b.cap_per_shoe) || 40,
        vorteil,
        Math.min(100, Math.max(0, Number(b.customer_discount_pct) || 0)),
        vorteil === 'gift' ? (b.gift_key || 'care_kit_leather') : null,
        inviteToken, b.note || null,
      )
      return { id: info.lastInsertRowid, userId }
    })
    const { id, userId } = tx()

    // Abwarten und melden statt verschlucken: Eine Einladung, die nicht
    // ankommt, ist ein angelegtes Konto, das niemand nutzen kann.
    let emailSent = false
    let emailError = null
    if (inviteToken) {
      try {
        await sendAffiliateInvitation(email, String(b.full_name).trim(), inviteToken, code)
        emailSent = true
      } catch (e) {
        emailError = e.message
        console.error('[email affiliate invite]', e.message)
      }
    }

    res.status(201).json({
      id, code, status: 'active', user_id: userId,
      pending: !!inviteToken,
      invite_token: inviteToken,
      // Bestehende Konten brauchen keine Einladung — sie melden sich wie bisher an.
      email_sent: emailSent,
      email_error: emailError,
      existing_user: !!bestehend,
    })
  }
)

// ── CMS: einzelnen Affiliate ändern ──────────────────────────────────────
router.put('/:id', ...canAdmin, param('id').isInt(), (req, res) => {
  const db = getDb()
  const a = db.prepare('SELECT * FROM affiliates WHERE id = ?').get(req.params.id)
  if (!a) return res.status(404).json({ error: 'Not found' })

  const allowed = ['status', 'full_name', 'email', 'phone', 'street', 'postal_code', 'city',
    'country', 'birth_date', 'tax_status', 'tax_number', 'vat_id', 'iban', 'account_holder',
    'commission_type', 'commission_value', 'cap_per_shoe',
    'customer_benefit', 'customer_discount_pct', 'gift_key', 'note', 'user_id']
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
