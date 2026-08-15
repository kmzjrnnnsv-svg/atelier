import { Router } from 'express'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import QRCode from 'qrcode'
import { body, param, validationResult } from 'express-validator'
import { getDb } from '../db/database.js'
import { authenticate, authenticateOptional, requireRole } from '../middleware/auth.js'
import {
  affiliateStanding, matureCommissions, deckelVon, zugabeKosten, DECKEL_STANDARD,
  PAYOUT_BATCH_SIZE, PROTECTION_DAYS,
} from '../utils/affiliate.js'
import { sendAffiliateInvitation } from '../utils/email.js'
import rateLimit from 'express-rate-limit'
import { gutschriftPdf, vergibGutschriftsnummer } from '../utils/beleg.js'
import { protokoll } from '../utils/auftragslauf.js'

const router = Router()
const canAdmin = [authenticate, requireRole('admin', 'curator')]

// Was ein Affiliate von sich selbst sehen darf. Bankdaten ja (sind seine),
// aber nirgends Kundennamen oder Adressen — für die Abrechnung nicht nötig
// und datenschutzrechtlich unnötiger Ballast.
const selfFields = `
  id, code, status, full_name, email, phone, street, postal_code, city, country,
  tax_status, tax_number, vat_id, iban, account_holder, birth_date,
  commission_type, commission_value, cap_per_shoe,
  customer_benefit, customer_discount_pct, gift_key, locked_fields,
  created_at, terms_accepted_at, payout_requested_at
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
//
// Die Anmeldung wird gelesen, aber nicht verlangt: Der Werbelink führt Gäste
// in den Laden, und die sollen den Vorteil sehen, bevor sie ein Konto haben.
// Wer angemeldet ist, wird geprüft — siehe unten.
router.get('/validate/:code', authenticateOptional, (req, res) => {
  const code = normCode(req.params.code)
  if (!code) return res.status(400).json({ valid: false, error: 'Code fehlt' })

  const db = getDb()
  const a = db.prepare(`
    SELECT code, customer_benefit, customer_discount_pct, gift_key,
           commission_type, commission_value, cap_per_shoe, user_id, email,
           display_name
    FROM affiliates WHERE code = ? AND status = 'active'
  `).get(code)
  if (!a) return res.status(404).json({ valid: false, error: 'Dieser Code ist nicht gültig.' })

  // Der eigene Code beim eigenen Einkauf zählt nicht.
  //
  // Die Bestellung wies Eigenbestellungen schon immer ab — es entstand keine
  // Provision. Der Nachlass wurde aber trotzdem gewährt, denn er wird vorne
  // im Warenkorb gerechnet und hier ausgegeben. Der Affiliate kaufte also
  // günstiger, ohne dass es von seinem Topf abging: Bezahlt hat es das Haus.
  //
  // Auffällig wurde das erst jetzt. Solange ein Affiliate seinen eigenen
  // Bereich nicht verlassen konnte, kam er auf diesem Weg gar nicht in den
  // Laden; mit dem Wechsel zwischen den Bereichen ist es ein Klick. Dieselbe
  // Bedingung wie bei der Provision — gleiches Konto oder gleiche Adresse.
  const kaeufer = req.user
  const selbst = kaeufer && (
    (a.user_id && a.user_id === kaeufer.id) ||
    (a.email && String(a.email).toLowerCase() === String(kaeufer.email || '').toLowerCase())
  )
  if (selbst) {
    return res.status(409).json({
      valid: false,
      code: 'EIGENER_CODE',
      error: 'Das ist Ihr eigener Code. Für eigene Bestellungen gilt er nicht.',
    })
  }

  // Entweder ein Nachlass oder eine Zugabe — nie beides. Der Kunde soll sehen,
  // was er bekommt; was der Affiliate dafür erhält, geht ihn nichts an.
  //
  // discount_cap begleitet den Prozentsatz: Der Nachlass geht vom Topf des
  // Affiliates ab und ist damit auf dessen Höhe begrenzt. Der Betrag gehört
  // zur Zusage — der Konfigurator muss ihn kennen, sonst zeigt er einen Preis
  // an, den die Bestellung hinterher nicht bestätigt.
  //
  // Bei einem festen Betrag je Paar ist dieser Betrag die Grenze; beim
  // Prozentsatz der Deckel. Die Höhe der Provision selbst bleibt drinnen.
  const grenze = a.commission_type === 'fixed'
    ? Math.max(0, Number(a.commission_value) || 0)
    : deckelVon(a)

  // Die Zugabe mit Namen und Bild, damit sie im Warenkorb nicht bloß als
  // Schlüssel dasteht. Der Ladenpreis geht mit: Er zeigt dem Kunden, was die
  // Beigabe wert ist — bezahlt wird sie nicht von ihm.
  let zugabe = null
  if (a.customer_benefit === 'gift' && a.gift_key) {
    try {
      const z = db.prepare(
        'SELECT key, name, price, image_data, images FROM accessories WHERE key = ?'
      ).get(String(a.gift_key))
      if (z) {
        let bild = z.image_data || null
        try {
          const strecke = JSON.parse(z.images || '[]')
          if (Array.isArray(strecke) && strecke[0]) bild = strecke[0]
        } catch { /* ohne Strecke bleibt es beim Einzelbild */ }
        zugabe = { key: z.key, name: z.name, price: z.price || null, image: bild }
      } else {
        // Der Artikel wurde aus dem Zubehör entfernt, die Zusage steht noch.
        // Lieber ohne Bild anzeigen als die Zusage stillschweigend fallen zu
        // lassen — sie wurde im Laden gegeben.
        zugabe = { key: String(a.gift_key), name: 'Zugabe', price: null, image: null }
      }
    } catch { /* Zubehör nicht lesbar — dann ohne Bild */ }
  }

  res.json({
    valid: true,
    code: a.code,
    // Der Anzeigename, wenn einer gepflegt ist — sonst nichts. Der Klarname
    // aus full_name geht hier ausdrücklich NICHT hinaus.
    display_name: (a.display_name || '').trim() || null,
    benefit: a.customer_benefit || 'none',
    customer_discount_pct: a.customer_benefit === 'discount' ? Number(a.customer_discount_pct) || 0 : 0,
    discount_cap: a.customer_benefit === 'discount' ? grenze : 0,
    gift: zugabe ? zugabe.key : null,
    gift_item: zugabe,
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
      Number(b.cap_per_shoe) || DECKEL_STANDARD,
      b.gift_shoetree ? 1 : 0,
    )
    res.status(201).json({ id: info.lastInsertRowid, code, status: 'pending' })
  }
)

// ── Affiliate: eigener Stand ─────────────────────────────────────────────
// Werbelink des Affiliates. Der Code steckt als ?ref= darin; die Seite legt
// ihn in den Warenkorb, wo der Käufer ihn sieht und überschreiben kann — das
// hält die Zuordnung nachvollziehbar und kommt ohne stilles Cookie aus.
/**
 * Die Adresse des Affiliate-Bereichs.
 *
 * Aus der App-Adresse abgeleitet, damit Entwicklung und Betrieb ohne
 * Sonderbehandlung funktionieren. Auf localhost bleibt es bei der Hauptadresse
 * — dort gibt es keine Unterdomänen.
 */
function affiliateBasis() {
  const basis = (process.env.APP_URL || 'https://artisansole.com').replace(/\/+$/, '')
  try {
    const u = new URL(basis)
    if (/^(localhost|127\.)/.test(u.hostname)) return basis
    const nackt = u.hostname.replace(/^(www|business|affiliate)\./i, '')
    return `${u.protocol}//affiliate.${nackt}`
  } catch { return basis }
}

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
           c.benefit_kind, c.payable_at, c.created_at, o.shoe_name
    FROM affiliate_commissions c
    JOIN orders o ON o.id = c.order_id
    WHERE c.affiliate_id = ?
    ORDER BY c.created_at DESC
    LIMIT 100
  `).all(a.id)

  const payouts = db.prepare(`
    SELECT id, reference, pair_count, amount, paid_at, created_at, document_no
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
    // Ohne die Klicks ist die Übersicht eine Erfolgsmeldung ohne Nenner: Man
    // sieht, was ankam, aber nicht, wie viele es versucht haben.
    klicks: klickBilanz(db, a.id),
    rules: {
      batchSize: PAYOUT_BATCH_SIZE,
      protectionDays: PROTECTION_DAYS,
      // Der Deckel ist zugleich die Obergrenze der eigenen Zusage — im Portal
      // steht beides in einem Satz, also kommt es in einem Feld.
      capPerShoe: deckelVon(a),
      giftCost: a.customer_benefit === 'gift' ? zugabeKosten(db, a.gift_key) : 0,
      giftName: a.customer_benefit === 'gift' && a.gift_key
        ? (db.prepare('SELECT name FROM accessories WHERE key = ?').get(a.gift_key)?.name || null)
        : null,
    },
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

/** Gesperrte Felder eines Affiliates als Liste. */
export function gesperrteFelder(a) {
  try {
    const l = JSON.parse(a?.locked_fields || '[]')
    return Array.isArray(l) ? l.filter(f => SELBST_FELDER.includes(f)) : []
  } catch { return [] }
}

router.patch('/me', authenticate,
  body('full_name').optional({ values: 'falsy' }).trim().isLength({ min: 2 }).withMessage('Bitte Vor- und Nachnamen angeben'),
  body('iban').optional({ values: 'falsy' }).trim().isLength({ min: 15, max: 34 }).withMessage('Diese IBAN sieht nicht vollständig aus'),
  (req, res) => {
    const fehler = validationResult(req)
    if (!fehler.isEmpty()) return res.status(400).json({ error: fehler.array()[0].msg })

    const db = getDb()
    const a = db.prepare('SELECT id FROM affiliates WHERE user_id = ?').get(req.user.id)
    if (!a) return res.status(404).json({ error: 'Kein Affiliate-Konto zu diesem Benutzer' })

    // Gesperrte Felder still zu übergehen wäre die schlechtere Wahl: Der
    // Affiliate sähe seine Eingabe verschwinden und wüsste nicht, warum.
    const gesperrt = gesperrteFelder(db.prepare('SELECT locked_fields FROM affiliates WHERE id = ?').get(a.id))
    const verletzt = gesperrt.filter(k => req.body[k] !== undefined)
    if (verletzt.length) {
      return res.status(403).json({
        error: 'Diese Angaben hat die Verwaltung geprüft und festgeschrieben. Bitte schreiben Sie uns, wenn sich etwas geändert hat.',
        code: 'FELD_GESPERRT',
        felder: verletzt,
      })
    }

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
    -- Vollständig, nicht ausschnittsweise: Die Verwaltung bearbeitet einen
    -- Affiliate aus dieser Liste heraus. Kämen die Vertragsfelder hier nicht
    -- mit, stünden sie in der Maske leer da und würden beim Speichern über
    -- die hinterlegten Angaben geschrieben.
    SELECT a.id, a.code, a.status, a.full_name, a.display_name, a.email, a.phone, a.user_id,
           a.street, a.postal_code, a.city, a.country, a.birth_date,
           a.commission_type, a.commission_value, a.cap_per_shoe, a.gift_shoetree,
           a.customer_benefit, a.customer_discount_pct, a.gift_key, a.locked_fields,
           a.tax_status, a.tax_number, a.vat_id, a.iban, a.account_holder,
           a.note, a.created_at,
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
      // Niemals ein Konto ohne Namen anlegen.
      //
      // Beim Anlegen über die E-Mail-Adresse allein ist `full_name` leer, und
      // ein leerer Name war bis eben kein Schönheitsfehler, sondern ein
      // Ausfall: Die Benutzerliste der Verwaltung griff auf den ersten
      // Buchstaben zu und stürzte ab — an die ganze Seite kam danach niemand
      // mehr heran. Ersatzweise gilt der Teil vor dem @; den ersetzt der
      // Affiliate mit seinen Stammdaten ohnehin selbst.
      const anzeigeName = String(b.full_name || '').trim()
        || String(email).split('@')[0].replace(/[._-]+/g, ' ').trim()
        || 'Neues Konto'
      const userId = bestehend
        ? bestehend.id
        : db.prepare("INSERT INTO users (name, email, password_hash, role, is_active) VALUES (?, ?, ?, 'user', 0)")
            .run(anzeigeName, email, tempHash).lastInsertRowid

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
        Number(b.cap_per_shoe) || DECKEL_STANDARD,
        vorteil,
        Math.min(100, Math.max(0, Number(b.customer_discount_pct) || 0)),
        // Ohne ausdrückliche Wahl gilt, was der alte Schalter meinte: der
        // Zedernholz-Spanner. Sonst bekäme ein Aufrufer, der noch
        // gift_shoetree schickt, stillschweigend ein Pflegeset.
        vorteil === 'gift' ? (b.gift_key || (b.gift_shoetree ? 'shoe_tree_cedar' : 'care_kit_leather')) : null,
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

  const allowed = ['status', 'full_name', 'display_name', 'email', 'phone', 'street', 'postal_code', 'city',
    'country', 'birth_date', 'tax_status', 'tax_number', 'vat_id', 'iban', 'account_holder',
    'commission_type', 'commission_value', 'cap_per_shoe',
    'customer_benefit', 'customer_discount_pct', 'gift_key', 'note', 'user_id',
    'locked_fields']
  const patch = {}
  for (const k of allowed) if (req.body[k] !== undefined) patch[k] = req.body[k]
  if (patch.gift_shoetree !== undefined) patch.gift_shoetree = patch.gift_shoetree ? 1 : 0

  // Die Sperrliste kommt in zwei Gestalten, und das war ein stiller Verlust.
  //
  // Die Maske hält sie als JSON-Zeichenkette (so steht sie auch in der
  // Datenbank und so kommt sie aus der Liste zurück). Geprüft wurde hier aber
  // nur auf ein Array — eine Zeichenkette fiel deshalb auf die leere Liste
  // zurück, und JEDES Speichern eines Affiliates hob sämtliche Sperren auf.
  // Niemandem fiel es auf, weil nichts fehlschlug: Die Antwort war 200, und
  // die Häkchen waren beim nächsten Öffnen einfach weg.
  if (patch.locked_fields !== undefined) {
    let roh = patch.locked_fields
    if (typeof roh === 'string') {
      try { roh = JSON.parse(roh || '[]') } catch { roh = [] }
    }
    patch.locked_fields = JSON.stringify(
      (Array.isArray(roh) ? roh : []).filter(f => SELBST_FELDER.includes(f))
    )
  }

  // SQLite bindet nur Zahlen, Zeichenketten, null und Puffer. Alles andere —
  // ein `true` aus einem Kontrollkästchen, ein verschachteltes Objekt aus
  // einem Formular — ließ `run()` werfen, und der allgemeine Fehlerbehandler
  // antwortete mit „Internal server error". Für den, der davorsitzt, ist das
  // keine Auskunft: Er weiß nicht, welches Feld gemeint ist, und die Maske
  // bleibt mit ungespeicherten Änderungen stehen.
  //
  // Bekannte Formen werden umgesetzt, alles Übrige benannt und abgewiesen.
  for (const [k, v] of Object.entries(patch)) {
    if (typeof v === 'boolean') { patch[k] = v ? 1 : 0; continue }
    if (v === null || ['string', 'number', 'bigint'].includes(typeof v)) continue
    return res.status(400).json({
      error: `Das Feld „${k}" hat einen Wert, den die Datenbank nicht annehmen kann.`,
      code: 'FELD_UNGUELTIG',
      feld: k,
    })
  }

  if (!Object.keys(patch).length) return res.json(a)

  const set = Object.keys(patch).map(k => `${k} = ?`).join(', ')
  try {
    db.prepare(`UPDATE affiliates SET ${set}, updated_at = datetime('now') WHERE id = ?`)
      .run(...Object.values(patch), req.params.id)
  } catch (e) {
    // Eine verletzte Bedingung (CHECK auf status, UNIQUE auf code) ist ein
    // Bedienfehler und keine Panne — sie gehört als Satz zurück, nicht als 500.
    console.error('[affiliate PUT]', req.params.id, e.message, Object.keys(patch).join(','))
    return res.status(400).json({
      error: `Speichern nicht möglich: ${e.message}`,
      code: 'SPEICHERN_FEHLGESCHLAGEN',
    })
  }

  const neu = db.prepare('SELECT * FROM affiliates WHERE id = ?').get(req.params.id)
  protokoll(db, {
    entity: 'affiliate', entityId: neu.id, action: 'geaendert',
    detail: `Geändert: ${Object.keys(patch).join(', ')}`, user: req.user,
  })
  res.json(neu)
})

/**
 * GET /api/affiliates/:id/einladung — Einladung zum Weitergeben.
 *
 * Die Einladung ging bislang nur per Mail hinaus, und der Link stand allein
 * dann in der Verwaltung, wenn der Versand fehlgeschlagen war. Solange Mails
 * überhaupt nicht hinausgehen, ist das die falsche Reihenfolge: Der Link ist
 * der Weg, die Mail nur eine Zustellart davon.
 *
 * Deshalb hier jederzeit abrufbar, mit QR-Code dazu — ein Partner, der im
 * Laden steht, scannt ihn vom Bildschirm ab, statt eine Adresse abzutippen.
 *
 * Fehlt die Kennung, weil das Konto bereits vollständig ist, sagt die Antwort
 * das: Ein Link, der nirgendwohin führt, wäre schlimmer als keiner.
 */
router.get('/:id/einladung', ...canAdmin, param('id').isInt(), async (req, res) => {
  const db = getDb()
  const a = db.prepare('SELECT id, code, full_name, email, invite_token, user_id FROM affiliates WHERE id = ?')
    .get(req.params.id)
  if (!a) return res.status(404).json({ error: 'Not found' })

  const konto = a.user_id ? db.prepare('SELECT is_active FROM users WHERE id = ?').get(a.user_id) : null

  // Kein Token mehr: entweder schon eingelöst oder von Anfang an keins nötig
  // (die Adresse hatte bereits ein Konto).
  if (!a.invite_token) {
    return res.json({
      offen: false,
      grund: konto?.is_active
        ? 'Dieses Konto ist bereits aktiv — der Affiliate meldet sich wie gewohnt an.'
        : 'Für dieses Konto liegt keine offene Einladung vor.',
      code: a.code,
      email: a.email,
    })
  }

  // Der Affiliate gehört auf seine Unterdomäne, nicht in den Laden. Wer den
  // QR-Code im Geschäft scannt, soll dort landen, wo er künftig arbeitet.
  const link = `${affiliateBasis()}/affiliate-konto?token=${a.invite_token}`
  const qr = await QRCode.toDataURL(link, { margin: 1, width: 480, color: { dark: '#111111', light: '#FFFFFF' } })
    .catch(() => null)

  res.json({ offen: true, link, qr, code: a.code, email: a.email, name: a.full_name })
})

/**
 * DELETE /api/affiliates/:id — einen Affiliate-Datensatz entfernen.
 *
 * Nur für Zeilen OHNE Benutzerkonto: versehentlich angelegte, nie eingelöste
 * Einladungen. Hängt ein Konto daran, führt der Weg über das Löschverfahren
 * für Konten — Antrag, Bestätigung durch eine zweite Person, dreißig Tage
 * Frist. Zwei Wege zum selben Ziel, von denen einer die Sicherung umgeht,
 * wäre keine Sicherung.
 *
 * Ebenfalls gesperrt, sobald Provisionen erfasst sind: Sie gehören zur
 * Abrechnung und überleben den Datensatz nicht.
 */
router.delete('/:id', ...canAdmin, param('id').isInt(), (req, res) => {
  const db = getDb()
  const a = db.prepare('SELECT id, user_id, full_name, email FROM affiliates WHERE id = ?').get(req.params.id)
  if (!a) return res.status(404).json({ error: 'Nicht gefunden' })

  if (a.user_id) {
    return res.status(409).json({
      error: 'Zu diesem Affiliate gehört ein Konto. Bitte über „Konto löschen" gehen — dort mit Bestätigung durch eine zweite Person und dreißig Tagen Frist.',
      code: 'UEBER_KONTO',
      user_id: a.user_id,
    })
  }

  const provisionen = db.prepare('SELECT COUNT(*) n FROM affiliate_commissions WHERE affiliate_id = ?').get(a.id).n
  if (provisionen > 0) {
    return res.status(409).json({
      error: `Zu diesem Affiliate sind ${provisionen} Provisionen erfasst. Setzen Sie ihn auf „ended", statt die Abrechnung zu entfernen.`,
      code: 'HAT_PROVISIONEN',
    })
  }

  db.prepare('DELETE FROM affiliates WHERE id = ?').run(a.id)
  res.json({ ok: true })
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
    // Die Anforderung ist erledigt — sonst stünde sie für immer offen und die
    // Verwaltung sähe eine Bitte, der sie längst nachgekommen ist.
    db.prepare('UPDATE affiliates SET payout_requested_at = NULL WHERE id = ?').run(a.id)
    return { id: info.lastInsertRowid, reference, pair_count: selected.length, amount }
  })()

  // Die Belegnummer erst nach der Buchung: Sie gehört zu einer Auszahlung, die
  // es gibt, nicht zu einer, die vielleicht scheitert.
  let belegNr = null
  try { belegNr = vergibGutschriftsnummer(db, result.id) }
  catch (e) { console.error('[gutschriftsnummer]', e.message) }

  protokoll(db, {
    entity: 'affiliate', entityId: a.id, action: 'auszahlung',
    detail: `${result.pair_count} Paare, ${result.amount.toFixed(2)} € — ${reference}`,
    user: req.user,
  })

  res.status(201).json({ ...result, document_no: belegNr })
})

// ═══ Selbstbedienung für Vermittler ═══════════════════════════════════════
//
// Bisher konnte ein Vermittler zusehen und sonst nichts: Er sah seine
// Provisionen, aber nicht, ob sein Link überhaupt geklickt wird; er bekam kein
// Material, mit dem er hätte werben können; er konnte seine Auszahlung nicht
// anstoßen und hatte hinterher keinen Beleg für sein Finanzamt.

// ── Klicks ───────────────────────────────────────────────────────────────
//
// POST /api/affiliates/klick — öffentlich, absichtlich anonym.
//
// Kein Cookie, keine IP, keine Wiedererkennung. Gespeichert werden Tag, Ziel
// und der Host, von dem der Besucher kam. Das beantwortet „wirkt mein Link"
// und macht die Zählung nicht einwilligungspflichtig — es entstehen keine
// personenbezogenen Daten, also gibt es auch nichts, wozu jemand Ja sagen
// müsste.
const klickLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
})

/**
 * Nur der Host der Herkunft. Der volle Pfad verriete, was jemand gelesen hat.
 *
 * Leerer String statt NULL, wenn nichts mitkam — und dasselbe gilt unten für
 * den Modellnamen. In SQLite gelten zwei NULL in einem UNIQUE-Index als
 * verschieden: Mit NULL hätte jeder Direktaufruf eine neue Zeile angelegt,
 * statt den Zähler zu erhöhen, und die Tabelle wäre unbegrenzt gewachsen.
 * Beim Lesen wird der leere String wieder zu „direkt".
 */
function herkunft(req) {
  const roh = req.body?.referrer || req.get('referer') || ''
  if (!roh) return ''
  try {
    const host = new URL(String(roh)).hostname.replace(/^www\./, '')
    // Der eigene Laden ist keine Herkunft, sondern der Weg dorthin.
    return host.includes('artisansole') ? '' : host.slice(0, 80)
  } catch { return '' }
}

router.post('/klick', klickLimiter, (req, res) => {
  const code = normCode(req.body?.code)
  if (!code) return res.status(400).json({ error: 'Code fehlt' })

  const db = getDb()
  const a = db.prepare("SELECT id FROM affiliates WHERE code = ? AND status = 'active'").get(code)
  // Kein 404: Ein unbekannter Code ist für den Zähler kein Fehler, sondern
  // nichts zu tun. Eine Fehlermeldung verriete außerdem, welche Codes es gibt.
  if (!a) return res.json({ ok: true })

  const ziel = req.body?.target === 'modell' ? 'modell' : 'seite'
  const slug = ziel === 'modell' ? String(req.body?.shoe_slug || '').slice(0, 120) : ''
  const tag = new Date().toISOString().slice(0, 10)

  try {
    db.prepare(`
      INSERT INTO affiliate_clicks (affiliate_id, day, target, shoe_slug, referrer, count)
      VALUES (?, ?, ?, ?, ?, 1)
      ON CONFLICT(affiliate_id, day, target, shoe_slug, referrer)
      DO UPDATE SET count = count + 1
    `).run(a.id, tag, ziel, slug, herkunft(req))
  } catch (e) {
    // Ein verlorener Klick ist kein Grund, dem Besucher einen Fehler zu zeigen.
    console.error('[klick]', e.message)
  }
  res.json({ ok: true })
})

/**
 * Die Klickzahlen eines Vermittlers, aufbereitet.
 *
 * Die Konversion steht dabei — sie ist die eigentliche Auskunft. 200 Klicks
 * ohne Bestellung und 3 Klicks mit einer Bestellung sind zwei völlig
 * verschiedene Lagen, und die nackte Klickzahl unterscheidet sie nicht.
 */
function klickBilanz(db, affiliateId) {
  const seit = (tage) => {
    const d = new Date(); d.setDate(d.getDate() - tage)
    return d.toISOString().slice(0, 10)
  }
  const summe = (ab) => db.prepare(
    'SELECT COALESCE(SUM(count), 0) AS n FROM affiliate_clicks WHERE affiliate_id = ? AND day >= ?'
  ).get(affiliateId, ab).n

  const gesamt = db.prepare(
    'SELECT COALESCE(SUM(count), 0) AS n FROM affiliate_clicks WHERE affiliate_id = ?'
  ).get(affiliateId).n
  const bestellungen = db.prepare(
    'SELECT COUNT(*) AS n FROM affiliate_commissions WHERE affiliate_id = ?'
  ).get(affiliateId).n

  return {
    gesamt,
    dreissigTage: summe(seit(30)),
    siebenTage: summe(seit(7)),
    bestellungen,
    konversion: gesamt > 0 ? Math.round((bestellungen / gesamt) * 1000) / 10 : null,
    proTag: db.prepare(`
      SELECT day, SUM(count) AS anzahl FROM affiliate_clicks
      WHERE affiliate_id = ? AND day >= ?
      GROUP BY day ORDER BY day
    `).all(affiliateId, seit(30)),
    herkunft: db.prepare(`
      SELECT CASE WHEN COALESCE(referrer, '') = '' THEN 'direkt' ELSE referrer END AS quelle,
             SUM(count) AS anzahl
      FROM affiliate_clicks WHERE affiliate_id = ?
      GROUP BY quelle ORDER BY anzahl DESC LIMIT 8
    `).all(affiliateId),
    modelle: db.prepare(`
      SELECT shoe_slug, SUM(count) AS anzahl FROM affiliate_clicks
      WHERE affiliate_id = ? AND target = 'modell' AND COALESCE(shoe_slug, '') != ''
      GROUP BY shoe_slug ORDER BY anzahl DESC LIMIT 10
    `).all(affiliateId),
  }
}

// GET /api/affiliates/me/klicks
router.get('/me/klicks', authenticate, (req, res) => {
  const db = getDb()
  const a = db.prepare('SELECT id FROM affiliates WHERE user_id = ?').get(req.user.id)
  if (!a) return res.status(404).json({ error: 'Kein Affiliate-Konto zu diesem Benutzer' })
  res.json(klickBilanz(db, a.id))
})

// ── Fertige Links auf einzelne Modelle ───────────────────────────────────
//
// Der Code hat immer überall gewirkt, aber es gab nichts zum Kopieren. Wer
// ein bestimmtes Paar empfehlen wollte, musste sich die Adresse selbst
// zusammensetzen — und tat es dann meistens ohne Code.
router.get('/me/links', authenticate, (req, res) => {
  const db = getDb()
  const a = db.prepare('SELECT id, code FROM affiliates WHERE user_id = ?').get(req.user.id)
  if (!a) return res.status(404).json({ error: 'Kein Affiliate-Konto zu diesem Benutzer' })

  const basis = (process.env.APP_URL || 'https://artisansole.com').replace(/\/$/, '')
  const modelle = db.prepare(`
    SELECT slug, name, category, collection, express, image_data
    FROM shoes WHERE slug IS NOT NULL AND slug != ''
    ORDER BY collection, category, name
  `).all()

  res.json({
    seite: affiliateLink(a.code),
    modelle: modelle.map(m => ({
      slug: m.slug, name: m.name, category: m.category,
      collection: m.collection, express: !!m.express,
      bild: m.image_data || null,
      url: `${basis}/schuhe/${m.slug}?ref=${encodeURIComponent(a.code)}`,
    })),
  })
})

// ── Werbemittel ──────────────────────────────────────────────────────────
router.get('/me/werbemittel', authenticate, (req, res) => {
  const db = getDb()
  const a = db.prepare('SELECT id FROM affiliates WHERE user_id = ?').get(req.user.id)
  if (!a) return res.status(404).json({ error: 'Kein Affiliate-Konto zu diesem Benutzer' })
  res.json(db.prepare(`
    SELECT id, title, kind, body, image_data, note
    FROM affiliate_assets WHERE visible = 1 ORDER BY sort_order, id
  `).all())
})

// ── Auszahlung selbst anfordern ──────────────────────────────────────────
//
// Die Verwaltung löst weiterhin aus — geprüft wird die Bankverbindung, und
// Geld verlässt das Haus nicht auf Knopfdruck eines Dritten. Was der
// Vermittler jetzt kann, ist Bescheid geben, und das sichtbar.
router.post('/me/auszahlung', authenticate, (req, res) => {
  const db = getDb()
  const a = db.prepare('SELECT * FROM affiliates WHERE user_id = ?').get(req.user.id)
  if (!a) return res.status(404).json({ error: 'Kein Affiliate-Konto zu diesem Benutzer' })

  matureCommissions(db)
  const offen = db.prepare(`
    SELECT COUNT(*) AS n, COALESCE(SUM(amount), 0) AS summe
    FROM affiliate_commissions WHERE affiliate_id = ? AND status = 'payable'
  `).get(a.id)

  if (offen.n === 0) {
    return res.status(400).json({
      error: 'Zurzeit ist nichts auszahlbar. Provisionen werden auszahlbar, wenn die Schutzfrist nach der Zustellung abgelaufen ist.',
      code: 'NICHTS_OFFEN',
    })
  }
  if (!a.iban) {
    return res.status(400).json({
      error: 'Bitte tragen Sie zuerst Ihre Bankverbindung ein — ohne sie können wir nicht überweisen.',
      code: 'KEINE_BANKVERBINDUNG',
    })
  }
  if (a.payout_requested_at) {
    return res.status(409).json({
      error: 'Ihre Anforderung liegt bereits vor. Wir melden uns.',
      code: 'SCHON_ANGEFORDERT',
      seit: a.payout_requested_at,
    })
  }

  db.prepare("UPDATE affiliates SET payout_requested_at = datetime('now') WHERE id = ?").run(a.id)
  protokoll(db, {
    entity: 'affiliate', entityId: a.id, action: 'auszahlung-angefordert',
    detail: `${offen.n} Paare, ${Number(offen.summe).toFixed(2)} €`, user: req.user,
  })
  res.json({ angefordert: true, paare: offen.n, summe: Math.round(offen.summe * 100) / 100 })
})

// ── Gutschrift als PDF ───────────────────────────────────────────────────
//
// Eine Bildschirmansicht ist kein Beleg. Wer Provisionen versteuert, braucht
// ein Dokument, das er weiterreichen kann.
router.get('/me/gutschrift/:payoutId', authenticate, param('payoutId').isInt(), (req, res) => {
  const db = getDb()
  const a = db.prepare('SELECT * FROM affiliates WHERE user_id = ?').get(req.user.id)
  if (!a) return res.status(404).json({ error: 'Kein Affiliate-Konto zu diesem Benutzer' })
  liefereGutschrift(res, db, a, req.params.payoutId)
})

// Dieselbe Gutschrift aus Sicht der Verwaltung — etwa um sie nachzusenden.
router.get('/:id/gutschrift/:payoutId', ...canAdmin,
  param('id').isInt(), param('payoutId').isInt(), (req, res) => {
    const db = getDb()
    const a = db.prepare('SELECT * FROM affiliates WHERE id = ?').get(req.params.id)
    if (!a) return res.status(404).json({ error: 'Not found' })
    liefereGutschrift(res, db, a, req.params.payoutId)
  }
)

function liefereGutschrift(res, db, affiliate, payoutId) {
  const payout = db.prepare('SELECT * FROM affiliate_payouts WHERE id = ? AND affiliate_id = ?')
    .get(payoutId, affiliate.id)
  if (!payout) return res.status(404).json({ error: 'Diese Auszahlung gibt es nicht.' })

  // Auszahlungen von vor der Einführung der Belegnummern bekommen ihre jetzt.
  if (!payout.document_no) {
    try { payout.document_no = vergibGutschriftsnummer(db, payout.id) }
    catch (e) { console.error('[gutschriftsnummer]', e.message) }
  }

  const positionen = db.prepare(`
    SELECT c.amount, c.benefit_kind, o.shoe_name, o.order_ref, o.delivered_at
    FROM affiliate_commissions c
    JOIN orders o ON o.id = c.order_id
    WHERE c.payout_id = ? ORDER BY c.id
  `).all(payout.id)

  const pdf = gutschriftPdf(db, payout, affiliate, positionen)
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename="${payout.document_no || payout.reference}.pdf"`)
  res.send(pdf)
}

export default router
