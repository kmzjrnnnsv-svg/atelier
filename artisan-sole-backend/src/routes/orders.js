import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { getDb } from '../db/database.js'
import { commissionFor, zusageKosten } from '../utils/affiliate.js'
import { authenticate, requireRole, requireMFA } from '../middleware/auth.js'
import { sendOrderConfirmation, sendPaymentInstructions, sendOrderConfirmed, sendManufacturerNotification, sendShippingNotification, sendQualityCheckNotification, sendCancellation, bankKonfiguration } from '../utils/email.js'
import { giroCode, betragAusText } from '../utils/zahlung.js'
import {
  STUFEN, stufeInfo, stornoVorschau, merkeEreignis, verlauf, sendungsLink,
  protokoll, ZUSTELLER,
} from '../utils/auftragslauf.js'
import { rechnungPdf, vergibRechnungsnummer } from '../utils/beleg.js'
import { GUERTEL_ART, ausSchuh as guertelAusSchuh, pruefe as guertelPruefen } from '../utils/guertel.js'
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

/**
 * GET /api/orders/mine/guertel-vorlagen
 *
 * Die eigenen Bestellungen, soweit sich aus ihnen ein Gürtel ableiten lässt.
 *
 * ── Wozu ─────────────────────────────────────────────────────────────────
 *
 * Wer den Gürtel erst später bestellt, soll nicht aus dem Gedächtnis
 * rekonstruieren müssen, welches Leder und welche Farbe seine Schuhe hatten.
 * Die Angabe steht in seiner Bestellung; hier wird sie zu einer Vorlage.
 *
 * Stornierte Bestellungen bleiben draußen — ein Schuh, den es nie gab, ist
 * keine Vorlage. Alles andere zählt, auch was noch in Fertigung ist: Wer
 * heute bestellt hat, darf den Gürtel morgen nachbestellen.
 */
router.get('/mine/guertel-vorlagen', authenticate, (req, res) => {
  const db = getDb()
  const rows = db.prepare(`
    SELECT * FROM orders
    WHERE user_id = ? AND status != 'cancelled' AND shoe_id IS NOT NULL
    ORDER BY created_at DESC LIMIT 40
  `).all(req.user.id)

  const vorlagen = rows.map(r => guertelAusSchuh(db, r)).filter(v => v?.brauchbar)

  // Zweimal dasselbe Leder in derselben Farbe ergibt zweimal denselben
  // Gürtel. Die Liste zeigt jede Kombination einmal, mit der jüngsten
  // Bestellung als Beleg — sonst stünde dort dreimal „Lux Calf in Cognac"
  // und der Kunde müsste raten, welches davon er anklickt.
  const gesehen = new Set()
  const eindeutig = vorlagen.filter(v => {
    const kennung = `${v.leder}|${v.farbe}|${v.metall || ''}`
    if (gesehen.has(kennung)) return false
    gesehen.add(kennung)
    return true
  })

  res.json(eindeutig)
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
    //
    // Die Ausnahme steht am Artikel, nicht hier: `ships_alone`. Der Gürtel
    // trägt sein Porto selbst, und wer ein halbes Jahr nach den Schuhen den
    // passenden Gürtel nachbestellt, soll dafür nicht ein zweites Paar
    // kaufen müssen. Eine Bestellung ohne Schuh geht durch, wenn ALLES darin
    // allein reisen darf — ein Gürtel zieht kein Pflegeset mit hinaus.
    if (!req.body.shoe_id) {
      const db0 = getDb()
      const positionen = Array.isArray(req.body.accessories) ? req.body.accessories : []
      const alleineErlaubt = positionen.length > 0 && positionen.every(a => {
        const key = String(a?.key || '').trim()
        if (!key) return false
        const row = db0.prepare('SELECT ships_alone FROM accessories WHERE key = ? AND is_active = 1').get(key)
        return Number(row?.ships_alone) === 1
      })
      if (!alleineErlaubt) {
        return res.status(400).json({
          error: 'Dieses Zubehör versenden wir nur zusammen mit einem Paar Schuhe. Bitte legen Sie ein Modell dazu.',
          code: 'ACCESSORY_ONLY',
        })
      }
    }

    const {
      shoe_id, shoe_name, material, color, price, eu_size,
      delivery_address, billing_address, accessories, scan_id,
      foot_notes, shipping_method, shipping_cost, coupon_code, business_code, business_campaign_id,
      size_type, last_key, last_label, last_width, fit_measurements,
      sole, extras, config_id, fit_profile_id,
      // Klammer um alles, was in einem Kauf zusammen bestellt wurde. Der
      // Warenkorb legt sie an und schickt sie an jede Bestellung mit; der
      // Server macht daraus eine gemeinsame Zahlung.
      basket_id,
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
        // ── Was hier vorher schieflief ──────────────────────────────────
        //
        // `price` ist der Betrag, den der Kunde zahlt — der Nachlass ist da
        // längst abgezogen. Er wurde trotzdem als `original_price` abgelegt
        // und der Rabatt ein zweites Mal von ihm berechnet. Bei 1.450 € und
        // zehn Prozent stand in der Bestellung: ursprünglich 1.305 €,
        // Nachlass 131 €. Beides falsch, und die Rechnung baut darauf auf
        // (utils/beleg.js: Position = original_price, davon ab der Rabatt) —
        // sie wies also eine Summe aus, die niemand bezahlt hat.
        //
        // Richtig ist die Rückrechnung: Aus dem, was nach dem Abzug übrig
        // ist, ergibt sich der Abzug selbst. netto = brutto · (1 − p/100),
        // also rabatt = netto · p/(100 − p). Der Versand bleibt außen vor,
        // er hat am Nachlass nicht teilgenommen.
        //
        // Die eine Eigenschaft, auf die es ankommt: original − rabatt = price.
        const priceNum   = parseFloat(String(price).replace(/[^0-9.,]/g, '').replace('.', '').replace(',', '.')) || 0
        const versandNum = parseFloat(String(shipping_cost ?? '').replace(/[^0-9.,]/g, '').replace(',', '.')) || 0
        const warenwert  = Math.max(0, priceNum - versandNum)

        let rabatt = 0
        if (couponRow.type === 'percentage') {
          const satz = Math.min(99.9, Math.max(0, Number(couponRow.value) || 0))
          rabatt = satz > 0 ? warenwert * satz / (100 - satz) : 0
        } else if (couponRow.type === 'fixed') {
          rabatt = Math.max(0, Number(couponRow.value) || 0)
        }
        rabatt = Math.round(rabatt * 100) / 100

        if (rabatt > 0) {
          const geld = (n) => `€ ${n.toFixed(2).replace('.', ',')}`
          discount_amount = geld(rabatt)
          original_price  = geld(priceNum + rabatt)
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
    // ── Untergrenze für den Preis ────────────────────────────────────────
    //
    // Der Preis kommt aus dem Browser. Der Konfigurator rechnet ihn richtig
    // aus, aber wer die Anfrage von Hand stellt, schickt, was er will — eine
    // Bestellung über 1 € wurde bis hierher anstandslos angenommen.
    //
    // Den ganzen Konfigurator im Server nachzubauen (Optionen, Sohlen,
    // Zubehör, Staffeln) wäre eine zweite Wahrheit, die mit der ersten
    // auseinanderläuft. Eine Untergrenze genügt und ist sicher: Optionen und
    // Zubehör addieren nur, also kann der Endpreis nie unter dem
    // Grundpreis abzüglich des höchsten Nachlasses liegen, der diesem
    // Kunden wirklich zusteht — geprüft an Kampagne, Affiliate und Konto,
    // nicht an dem, was der Browser behauptet.
    if (shoe_id) {
      const modell = db.prepare('SELECT price, promotion_price FROM shoes WHERE id = ?').get(shoe_id)
      const zahl = (v) => parseFloat(String(v ?? '').replace(/[^0-9.,]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.')) || 0

      const nutzer = db.prepare('SELECT is_promotion, promotion_discount_pct FROM users WHERE id = ?').get(uid)
      const aff = req.body.affiliate_code
        ? db.prepare("SELECT customer_benefit, customer_discount_pct FROM affiliates WHERE code = ? AND status = 'active'").get(String(req.body.affiliate_code).trim().toLowerCase())
        : null

      const saetze = [
        bizCampaign ? Number(bizCampaign.discount_pct) || 0 : 0,
        // Nur wenn der Affiliate auch wirklich einen Nachlass zugesagt hat —
        // bei einer Zugabe steht der Prozentsatz womöglich noch aus früherer
        // Zeit in der Spalte, wirkt aber nicht mehr.
        aff?.customer_benefit === 'discount' ? Number(aff.customer_discount_pct) || 0 : 0,
        nutzer?.is_promotion ? Number(nutzer.promotion_discount_pct) || 0 : 0,
        // Gutscheine kommen oben noch dazu; großzügig gerechnet, damit eine
        // gültige Bestellung nie an dieser Prüfung scheitert.
        coupon_code ? 50 : 0,
      ]
      const hoechster = Math.min(100, Math.max(0, ...saetze))

      const grund = zahl(modell?.promotion_price) || zahl(modell?.price)
      // Zehn Prozent Luft nach unten: Rundungen, Staffelpreise und künftige
      // Nachlässe sollen keine ehrliche Bestellung abweisen. Es geht darum,
      // grobe Manipulation zu stoppen, nicht darum, auf den Cent zu prüfen.
      const untergrenze = grund * (1 - hoechster / 100) * 0.9
      const gezahlt = zahl(price)

      if (grund > 0 && gezahlt < untergrenze) {
        console.warn(`[preis] Bestellung abgewiesen: ${gezahlt} € für Modell ${shoe_id} (Grundpreis ${grund} €, zulässig ab ${Math.round(untergrenze)} €, Nutzer ${uid})`)
        return res.status(400).json({
          error: 'Der übermittelte Preis passt nicht zu diesem Modell. Bitte laden Sie die Seite neu und versuchen Sie es erneut.',
          code: 'PRICE_MISMATCH',
        })
      }
    }

    // ── Konfiguriertes Zubehör: Preis und Text macht der Server ──────────
    //
    // Der Gürtel ist das erste Zubehör mit einer Konfiguration, und damit das
    // erste, bei dem eine Position mehr trägt als Name und Betrag. Beides
    // käme sonst aus dem Browser — und ein Gürtel für 1 € wäre eine Frage von
    // zwei Zeilen in der Entwicklerkonsole.
    //
    // Deshalb: Die Schlüssel kommen von außen, alles andere entsteht hier.
    // Der Betrag wird gegen den mitgeschickten geprüft, statt ihn still zu
    // ersetzen — sonst zahlte der Kunde am Ende einen anderen Betrag als den,
    // den er vor dem Absenden gesehen hat.
    let zubehoerZeilen = Array.isArray(accessories) ? accessories : []
    for (let i = 0; i < zubehoerZeilen.length; i++) {
      const zeile = zubehoerZeilen[i]
      if (zeile?.belt?.art !== GUERTEL_ART && zeile?.config_kind !== GUERTEL_ART) continue

      const gepruef = guertelPruefen(db, zeile.belt || {}, { mitSchuh: !!shoe_id })
      if (!gepruef.ok) {
        return res.status(400).json({ error: gepruef.fehler, code: 'GUERTEL_UNVOLLSTAENDIG', feld: gepruef.feld })
      }

      const genannt = betragAusText(zeile.price)
      if (Math.abs(genannt - gepruef.preis) > 0.01) {
        return res.status(400).json({
          error: `Der Preis des Gürtels hat sich geändert (${gepruef.preis.toFixed(2)} €). Bitte laden Sie die Seite neu.`,
          code: 'PRICE_MISMATCH',
        })
      }

      zubehoerZeilen[i] = {
        key: gepruef.artikel.key,
        name: gepruef.artikel.name,
        price: `€ ${gepruef.preis.toFixed(2).replace('.', ',')}`,
        qty: Math.max(1, Number(zeile.qty) || 1),
        config_kind: GUERTEL_ART,
        belt: gepruef.wert,
        // Der Satz, den Kunde, Werkstatt und Beleg lesen. Er steht hier
        // ausgeschrieben in der Bestellung und wird nicht jedes Mal neu aus
        // Schlüsseln zusammengesetzt: Ändert jemand später eine Bezeichnung
        // im CMS, soll auf einer alten Bestellung stehen, was bestellt wurde.
        beschreibung: gepruef.wert.beschreibung,
      }
    }

    // ── Deckt der Bestand die Express-Zusage? ────────────────────────────
    //
    // Die zwei Wochen setzen voraus, dass ein vorbereiteter Schaft in der
    // Werkstatt liegt (AGB 2.1 Abs. 4). Ohne Zähler nahm der Laden beliebig
    // viele Express-Bestellungen an, und jede weitere war ein Versprechen
    // ohne Deckung.
    //
    // NULL heißt „nicht geführt" und lässt alles durch — wer den Bestand
    // nicht pflegen will, merkt von dieser Prüfung nichts.
    if (shoe_id) {
      const vorrat = db.prepare('SELECT express, express_stock, name FROM shoes WHERE id = ?').get(shoe_id)
      if (vorrat?.express && vorrat.express_stock !== null && vorrat.express_stock <= 0) {
        return res.status(409).json({
          error: `Von „${vorrat.name}" ist zurzeit kein vorbereitetes Paar vorrätig. Wir können die zwei Wochen deshalb nicht zusagen, als Maßanfertigung ist das Modell weiterhin bestellbar.`,
          code: 'EXPRESS_AUSVERKAUFT',
        })
      }
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

    // ── Eine Zahlung je Warenkorb ────────────────────────────────────────
    //
    // Gehört diese Bestellung zu einem Kauf, für den schon eine angelegt wurde,
    // übernimmt sie deren Verwendungszweck. Sonst wird ihr eigener zur Klammer.
    //
    // Die Suche geht über das eigene Konto und über einen engen Zeitraum: Eine
    // Korbkennung, die aus einem alten Browser-Tab zurückkommt, soll keine
    // Bestellung von heute an die Zahlung von vorletzter Woche hängen.
    const zahlungsKennung = (() => {
      if (!basket_id) return order_ref
      const geschwister = db.prepare(`
        SELECT payment_ref FROM orders
        WHERE user_id = ? AND basket_id = ? AND payment_ref IS NOT NULL
          AND created_at >= datetime('now', '-2 hours')
        ORDER BY id LIMIT 1
      `).get(uid, String(basket_id))
      return geschwister?.payment_ref || order_ref
    })()

    const insertOrder = db.prepare(`
      INSERT INTO orders
        (user_id, shoe_id, shoe_name, material, color, price, eu_size,
         delivery_address, billing_address, accessories, scan_id, user_order_number, status, order_ref,
         foot_notes, foot_notes_en, shipping_method, shipping_cost, coupon_code, discount_amount, original_price,
         size_type, last_key, last_label, last_width, fit_measurements,
         business_id, business_code_id, business_coverage, business_campaign_id,
         sole, extras, config_id, fit_profile_id, payment_ref, basket_id)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
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
      JSON.stringify(zubehoerZeilen || []),
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
      zahlungsKennung,
      basket_id ? String(basket_id).slice(0, 64) : null,
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
    // ── Affiliate-Provision festhalten ──────────────────────────────────
    // Direkt bei der Bestellung, damit die Konditionen des Affiliates zum
    // Zeitpunkt des Kaufs gelten. Ändert er später seinen Satz, bleiben ältere
    // Vermittlungen davon unberührt.
    //
    // Eigenbestellungen bringen keine Provision — gleiche E-Mail wie der
    // Affiliate ist der häufigste Missbrauchsfall und hier mit einer
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
        // Firmenkampagnen schlagen den Affiliate-Code: Den Kunden hat dann die
        // Firma gebracht, nicht der Affiliate.
        if (aff && !selfOrder && !bizCampaign && !bizCode) {
          // Was der Affiliate seinem Kunden zugesagt hat, zahlt er aus seinem
          // eigenen Topf. Der Betrag wird hier festgehalten, damit eine
          // spätere Änderung seiner Zusage ältere Vermittlungen nicht rückwirkend
          // verteuert oder verbilligt.
          const zusage = zusageKosten(db, aff, price)
          const c = commissionFor(aff, { price, benefit_cost: zusage })
          db.prepare(`
            INSERT INTO affiliate_commissions
              (affiliate_id, order_id, status, shoe_price, gross_amount, gift_cost, amount, benefit_kind)
            VALUES (?, ?, 'pending', ?, ?, ?, ?, ?)
          `).run(aff.id, result.lastInsertRowid, c.shoe_price, c.gross_amount, c.gift_cost, c.amount, c.benefit_kind)
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

    // Der erste Punkt im Verlauf. Ohne ihn begänne die Geschichte der
    // Bestellung erst bei der ersten Änderung durch die Verwaltung.
    merkeEreignis(db, order.id, 'pending_payment', { actor: 'kunde', actorId: uid })

    // Das Bauteil ist jetzt vergeben. Abgezogen wird beim Bestellen und nicht
    // erst beim Bezahlen: Ein Schaft, der für eine offene Bestellung
    // reserviert ist, steht der nächsten nicht mehr zur Verfügung. Bei einer
    // Stornierung geht er zurück in den Bestand.
    if (order.shoe_id) {
      try {
        db.prepare(`
          UPDATE shoes SET express_stock = express_stock - 1
          WHERE id = ? AND express = 1 AND express_stock IS NOT NULL AND express_stock > 0
        `).run(order.shoe_id)
      } catch (e) { console.error('[express bestand]', e.message) }
    }

    // Send order confirmation + payment instructions async — don't block the response
    sendOrderConfirmation(order, user).catch(e => console.error('[email confirmation]', e.message))

    // Die Zahlungsanweisung geht NICHT hier hinaus.
    //
    // Sie nennt den Betrag des ganzen Korbs, und der steht erst fest, wenn die
    // letzte Bestellung angelegt ist — bei der ersten kennt der Server die
    // Geschwister noch nicht. Eine Mail von hier trüge den Preis des ersten
    // Paars und wäre für jeden Korb mit zwei Paaren falsch.
    //
    // Der Warenkorb ruft nach seiner letzten Bestellung POST /zahlung/abschluss
    // auf. Bleibt der Aufruf aus — abgebrochene Verbindung, geschlossener Tab —,
    // fehlt nur die Mail: Die Zahlungsseite unter „Meine Bestellungen" rechnet
    // dieselbe Summe und zeigt denselben Verwendungszweck.

    // Read bank details from DB settings (admin-editable)
    const bankRows = db.prepare(
      'SELECT key, value FROM settings WHERE key IN (?,?,?,?)'
    ).all('bank_iban', 'bank_bic', 'bank_holder', 'bank_name')
    const bank = Object.fromEntries(bankRows.map(r => [r.key, r.value]))

    res.status(201).json({
      ...order,
      // Der Verwendungszweck kommt vom Server, nicht aus der Oberfläche.
      // Dort stand zuletzt „AS-42" — eine Kennung, die in keiner Bestellung
      // vorkommt und zu der sich folglich keine Zahlung zuordnen ließ.
      verwendungszweck: [order.payment_ref || order.order_ref, (user?.name || '').trim()]
        .filter(Boolean).join(' ').slice(0, 140),
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

    // Jeder Übergang aus 'pending_payment' heraus (außer Storno) bestätigt
    // faktisch den Zahlungseingang und ist daher Admins vorbehalten. Zuvor war
    // nur der Weg nach 'processing' abgesichert — ein Kurator konnte eine noch
    // unbezahlte Bestellung direkt auf 'shipped'/'delivered' setzen und damit
    // Versandmail und Treuepunkte auslösen.
    const verlaesstZahlungswartung =
      existing.status === 'pending_payment' &&
      req.body.status !== 'pending_payment' &&
      req.body.status !== 'cancelled'
    if (verlaesstZahlungswartung && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Nur Admins können unbezahlte Bestellungen freigeben' })
    }

    // Stornieren geht nicht über diesen Weg.
    //
    // Eine Stornierung ist kein Statuswechsel, sondern eine Abrechnung: Sie
    // hat eine Gebühr nach der Staffel, einen Erstattungsbetrag und einen
    // Grund, und all das muss festgehalten werden. Ginge es hier durch, stünde
    // am Ende eine stornierte Bestellung ohne Angabe, was dem Kunden
    // zurückgezahlt wurde.
    if (req.body.status === 'cancelled') {
      return res.status(400).json({
        error: 'Stornierungen laufen über PUT /api/orders/:id/storno, dort wird die Gebühr nach AGB 7.2 berechnet und festgehalten.',
        code: 'STORNO_EIGENER_WEG',
      })
    }

    // Die ausdrückliche Zahlungsbestätigung verlangt zusätzlich MFA. MFA ist
    // ansonsten optionale Step-up-Auth und wird für andere Statuswechsel nicht
    // erzwungen.
    //
    // Seit die Zahlung getrennt gebucht werden kann ('pending'), gilt das für
    // beide Wege aus der Zahlungswartung heraus — sonst führte der neue,
    // kürzere Weg an der Prüfung vorbei.
    if (existing.status === 'pending_payment' && ['pending', 'processing'].includes(req.body.status)) {
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

    // Der Zustellzeitpunkt wird festgehalten, sobald der Zustand ihn behauptet.
    //
    // Die Spalte gab es, geschrieben hat sie niemand. Zwei Dinge hingen daran
    // und liefen ins Leere: Die Rücksendefrist beginnt mit der Zustellung — ohne
    // Datum begann sie nie, und Zubehör ließ sich nie zurückgeben. Und die
    // Schutzfrist der Affiliate-Provision rechnete ersatzweise ab updated_at,
    // also ab der letzten beliebigen Änderung an der Bestellung.
    //
    // COALESCE, damit ein späterer Statuswechsel (etwa zurück und wieder vor)
    // das ursprüngliche Datum nicht verschiebt — sonst verlängerte sich die
    // Frist des Kunden mit jedem Klick in der Verwaltung.
    //
    // `paid_at` folgt derselben Überlegung: Wer die Zahlungswartung verlässt,
    // hat bezahlt. Bislang trug allein der Status diese Information, und der
    // lässt sich zurückdrehen — womit sich nicht mehr feststellen ließ, ob
    // Geld geflossen ist.
    const zahltJetzt = existing.status === 'pending_payment'
    db.prepare(`
      UPDATE orders
      SET status = ?,
          delivered_at = CASE WHEN ? = 'delivered' THEN COALESCE(delivered_at, datetime('now')) ELSE delivered_at END,
          paid_at      = CASE WHEN ? = 1          THEN COALESCE(paid_at, datetime('now'))      ELSE paid_at      END,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(req.body.status, req.body.status, zahltJetzt ? 1 : 0, req.params.id)

    merkeEreignis(db, Number(req.params.id), req.body.status, {
      actor: 'verwaltung', actorId: req.user.id,
    })
    protokoll(db, {
      entity: 'order', entityId: req.params.id, action: 'status',
      detail: `${stufeInfo(existing.status).label} → ${stufeInfo(req.body.status).label}`,
      user: req.user,
    })

    // Die Rechnungsnummer wird bei Zahlungseingang vergeben, nicht bei der
    // Bestellung: Vorher steht nicht fest, dass es zu einem Umsatz kommt, und
    // eine stornierte Bestellung risse eine Lücke in die fortlaufende Reihe.
    if (zahltJetzt) {
      try { vergibRechnungsnummer(db, Number(req.params.id)) }
      catch (e) { console.error('[rechnungsnummer]', e.message) }
    }

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


// ── Nach dem Kauf ───────────────────────────────────────────────────────────
//
// Bis hierher endete die Bestellung mit ihrem Status. Was der Kunde sah, war
// ein Wort ohne Datum und ohne Aussicht; wo das Paket ist, stand nirgends; und
// eine Stornierung rechnete ein Mensch nach der Tabelle in den AGB.

/** Die Bestellung, wenn sie dem Anfragenden gehört oder er sie verwalten darf. */
function bestellungFuer(req, id) {
  const db = getDb()
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id)
  if (!order) return { fehler: 404 }
  const darf = order.user_id === req.user.id || ['admin', 'curator'].includes(req.user.role)
  if (!darf) return { fehler: 403 }
  return { order, db }
}

// GET /api/orders/:id/verlauf — wo das Paar steht, seit wann, und was folgt
router.get('/:id/verlauf', authenticate, (req, res) => {
  const { order, db, fehler } = bestellungFuer(req, req.params.id)
  if (fehler) return res.status(fehler).json({ error: fehler === 404 ? 'Not found' : 'Kein Zugriff' })

  const jetzt = stufeInfo(order.status)
  res.json({
    status: order.status,
    label: jetzt.label,
    text: jetzt.kunde,
    naechstes: jetzt.naechstes,
    // Die Leiter, an der sich der Fortschritt ablesen lässt. Eine stornierte
    // Bestellung hat keine — sie steht nicht auf halbem Weg, sie ist beendet.
    stufen: order.status === 'cancelled' ? [] : STUFEN.map(s => ({ key: s.key, label: s.label })),
    verlauf: verlauf(db, order),
    sendung: sendungsLink(order),
    rechnung: order.invoice_no
      ? { nummer: order.invoice_no, datum: order.invoice_issued_at, url: `/api/orders/${order.id}/rechnung` }
      : null,
    storno: order.cancelled_at
      ? { am: order.cancelled_at, gebuehr: order.cancel_fee, erstattung: order.refund_amount, satz: order.cancel_fee_pct }
      : stornoVorschau(order),
  })
})

// GET /api/orders/:id/rechnung — der Beleg als PDF
router.get('/:id/rechnung', authenticate, (req, res) => {
  const { order, db, fehler } = bestellungFuer(req, req.params.id)
  if (fehler) return res.status(fehler).json({ error: fehler === 404 ? 'Not found' : 'Kein Zugriff' })

  // Keine Rechnung vor der Zahlung. Ein Beleg über einen Umsatz, den es noch
  // nicht gibt, wäre falsch — bis dahin gilt die Zahlungsanweisung.
  if (!order.invoice_no) {
    return res.status(409).json({
      error: 'Für diese Bestellung ist noch keine Rechnung ausgestellt. Sie entsteht, sobald die Zahlung verbucht ist.',
      code: 'NOCH_KEINE_RECHNUNG',
    })
  }

  const kunde = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(order.user_id)
  const pdf = rechnungPdf(db, order, kunde)
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename="${order.invoice_no}.pdf"`)
  res.send(pdf)
})

// PATCH /api/orders/:id/sendung — Sendungsnummer eintragen (Verwaltung)
//
// Ein Vorgang, nicht zwei: Wer die Nummer einträgt, hat das Paket abgegeben.
// Der Status springt mit, und die Versandmail trägt den Link — bisher ging
// sie ohne hinaus, weil es nichts einzutragen gab.
router.patch('/:id/sendung', ...canWrite,
  body('tracking_code').trim().isLength({ min: 3, max: 60 }),
  body('carrier').trim().isIn(Object.keys(ZUSTELLER)),
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const db = getDb()
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id)
    if (!order) return res.status(404).json({ error: 'Not found' })
    if (order.status === 'cancelled') {
      return res.status(409).json({ error: 'Die Bestellung ist storniert.' })
    }

    const versendetJetzt = !['shipped', 'delivered'].includes(order.status)
    db.prepare(`
      UPDATE orders SET tracking_code = ?, carrier = ?,
        status = CASE WHEN ? = 1 THEN 'shipped' ELSE status END,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(req.body.tracking_code.trim(), req.body.carrier, versendetJetzt ? 1 : 0, order.id)

    const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id)
    merkeEreignis(db, order.id, row.status, {
      note: `${ZUSTELLER[row.carrier].name} ${row.tracking_code}`,
      actor: 'verwaltung', actorId: req.user.id,
    })
    protokoll(db, {
      entity: 'order', entityId: order.id, action: 'sendung',
      detail: `${ZUSTELLER[row.carrier].name} ${row.tracking_code}`, user: req.user,
    })

    if (versendetJetzt) {
      const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(row.user_id)
      sendShippingNotification(row, user).catch(e => console.error('[email shipping]', e.message))
    }
    res.json({ ...row, sendung: sendungsLink(row) })
  }
)

// ── Stornierung ─────────────────────────────────────────────────────────────
//
// Die Staffel stand in den AGB und nirgends im Programm. Auslösen konnte der
// Kunde sie nicht — er musste schreiben, und zwar ausgerechnet in der Phase,
// in der eine Stornierung kostenfrei ist und eine liegengebliebene Nachricht
// deshalb am meisten kostet.

// GET /api/orders/:id/storno — was es jetzt kosten würde
router.get('/:id/storno', authenticate, (req, res) => {
  const { order, fehler } = bestellungFuer(req, req.params.id)
  if (fehler) return res.status(fehler).json({ error: fehler === 404 ? 'Not found' : 'Kein Zugriff' })
  res.json({ ...stornoVorschau(order), status: order.status, label: stufeInfo(order.status).label })
})

/**
 * Die Stornierung selbst. Ein Weg für beide Seiten — der Kunde kann nur den
 * Höchstsatz bekommen, die Verwaltung darf nach Ziffer 7.2 Abs. 5 darunter
 * bleiben. Darüber kann niemand: `stornoVorschau` deckelt.
 */
function fuehreStornoAus({ db, order, satz, grund, durch, user }) {
  const v = stornoVorschau(order, { pctUeberschreiben: satz })
  if (!v.moeglich) return { fehler: 409, meldung: v.hinweis }

  db.prepare(`
    UPDATE orders
    SET status = 'cancelled', cancelled_at = datetime('now'),
        cancel_fee_pct = ?, cancel_fee = ?, refund_amount = ?,
        cancel_reason = ?, cancelled_by = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(v.pct, v.gebuehr, v.erstattung, grund || null, durch, order.id)

  merkeEreignis(db, order.id, 'cancelled', {
    note: v.gebuehr > 0
      ? `Storno mit ${v.pct} % Gebühr (${v.gebuehr.toFixed(2)} €), Erstattung ${v.erstattung.toFixed(2)} €`
      : 'Storno ohne Gebühr',
    actor: durch, actorId: user?.id ?? null,
  })
  protokoll(db, {
    entity: 'order', entityId: order.id, action: 'storno',
    detail: `${v.pct} % einbehalten, ${v.erstattung.toFixed(2)} € zu erstatten${grund ? `, ${grund}` : ''}`,
    user,
  })

  // Die Provision fällt mit der Bestellung. Sie wurde für eine Vermittlung
  // gezahlt, die nicht zustande kam — bliebe sie stehen, entstünde ein
  // Anreiz, der niemandem nützt.
  try {
    db.prepare(`
      UPDATE affiliate_commissions
      SET status = 'cancelled', cancel_reason = 'Bestellung storniert', updated_at = datetime('now')
      WHERE order_id = ? AND status IN ('pending','confirmed','payable')
    `).run(order.id)
  } catch (e) { console.error('[storno provision]', e.message) }

  // Das vorgehaltene Bauteil geht zurück in den Bestand — sonst schrumpft er
  // mit jeder Stornierung, ohne dass etwas verbraucht wurde.
  try {
    if (order.shoe_id) {
      db.prepare(`
        UPDATE shoes SET express_stock = express_stock + 1
        WHERE id = ? AND express = 1 AND express_stock IS NOT NULL
      `).run(order.shoe_id)
    }
  } catch (e) { console.error('[storno bestand]', e.message) }

  return { ergebnis: { ...v, order: db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id) } }
}

// POST /api/orders/:id/storno — der Kunde storniert selbst
router.post('/:id/storno', authenticate,
  body('grund').optional({ values: 'falsy' }).trim().isLength({ max: 500 }),
  (req, res) => {
    const db = getDb()
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id)
    if (!order) return res.status(404).json({ error: 'Not found' })
    if (order.user_id !== req.user.id) return res.status(403).json({ error: 'Kein Zugriff' })

    const { fehler, meldung, ergebnis } = fuehreStornoAus({
      db, order, satz: null, grund: req.body.grund, durch: 'kunde', user: req.user,
    })
    if (fehler) return res.status(fehler).json({ error: meldung, code: 'STORNO_NICHT_MOEGLICH' })

    const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(order.user_id)
    sendCancellation(ergebnis.order, user, ergebnis).catch(e => console.error('[email storno]', e.message))
    res.json(ergebnis)
  }
)

// PUT /api/orders/:id/storno — die Verwaltung storniert, ggf. mit weniger Gebühr
router.put('/:id/storno', ...canWrite,
  body('satz').optional({ values: 'null' }).isFloat({ min: 0, max: 100 }),
  body('grund').optional({ values: 'falsy' }).trim().isLength({ max: 500 }),
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const db = getDb()
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id)
    if (!order) return res.status(404).json({ error: 'Not found' })

    const { fehler, meldung, ergebnis } = fuehreStornoAus({
      db, order,
      satz: req.body.satz === undefined || req.body.satz === null ? null : Number(req.body.satz),
      grund: req.body.grund, durch: 'verwaltung', user: req.user,
    })
    if (fehler) return res.status(fehler).json({ error: meldung, code: 'STORNO_NICHT_MOEGLICH' })

    const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(order.user_id)
    sendCancellation(ergebnis.order, user, ergebnis).catch(e => console.error('[email storno]', e.message))
    res.json(ergebnis)
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
    // Konfiguriertes Zubehör ist keine Lagerware.
    //
    // Der Gürtel wird aus dem gewählten Leder geschnitten und auf die
    // gewählte Länge gebracht — für einen anderen Kunden ist er danach so
    // wenig zu gebrauchen wie ein Maßschuh. Er fällt damit unter dieselbe
    // Ausnahme wie die Schuhe (§ 312g Abs. 2 Nr. 1 BGB) und steht nicht in
    // der Liste des Zurückgebbaren.
    .filter(a => !a?.config_kind && !a?.belt)
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
/**
 * GET /api/orders/:id/zahlung — wohin überwiesen wird.
 *
 * Diese Angaben standen ausschließlich in der Zahlungs-Mail. Ging sie nicht
 * hinaus, hatte der Kunde eine Bestellung im Zustand „Zahlung ausstehend" und
 * keine Möglichkeit zu erfahren, wohin er überweisen soll — ohne Fehler, ohne
 * Meldung, einfach eine Bestellung, die nie bezahlt wird. Eine Seite, die den
 * Betrag nennt, aber nicht das Konto, ist keine Rechnung.
 *
 * Zurück kommt zusätzlich ein GiroCode: Der Kunde scannt ihn mit seiner
 * Banking-App und hat Empfänger, IBAN, Betrag und Verwendungszweck ausgefüllt
 * im Formular. Das ist nicht bloß bequemer, es ist genauer — abgetippte
 * Verwendungszwecke sind der häufigste Grund für Zahlungen, die sich keiner
 * Bestellung zuordnen lassen.
 */
/**
 * POST /api/orders/zahlung/abschluss — der Korb ist vollständig, eine Mail.
 *
 * ── Warum ein eigener Aufruf ──────────────────────────────────────────────
 *
 * Die Zahlungsanweisung nennt den Betrag des ganzen Kaufs. Der steht erst
 * fest, wenn die letzte Bestellung angelegt ist — beim Anlegen der ersten
 * kennt der Server die Geschwister noch nicht. Eine Mail von dort trüge den
 * Preis des ersten Paars und wäre für jeden Korb mit zwei Paaren falsch.
 *
 * Der Warenkorb ruft diesen Punkt deshalb an, nachdem er seine letzte
 * Bestellung abgesetzt hat.
 *
 * ── Was passiert, wenn der Aufruf ausbleibt ───────────────────────────────
 *
 * Nichts Schlimmes. Es fehlt die Mail, nicht die Zahlung: Unter „Meine
 * Bestellungen" rechnet dieselbe Stelle dieselbe Summe und zeigt denselben
 * Verwendungszweck samt GiroCode. Deshalb darf dieser Aufruf auch scheitern,
 * ohne dass der Kauf scheitert.
 */
// ── Zahlungseingang abgleichen ──────────────────────────────────────────────
//
// Es gibt keinen Bankabruf und keinen Zahlungsdienstleister — der Abgleich
// geschieht von Hand am Kontoauszug. Was ihn bisher mühsam machte, war nicht
// das Buchen, sondern das Suchen: In der Bestellliste stehen Namen und
// Nummern, auf dem Auszug steht der Verwendungszweck.
//
// Diese beiden Routen drehen das um. Man liest eine Zeile vom Auszug ab, fügt
// sie ein, und der Server findet den ganzen Warenkorb dazu.

// GET /api/orders/zahlung/offen — was auf Zahlung wartet, nach Korb gebündelt
router.get('/zahlung/offen', ...canWrite, (req, res) => {
  const db = getDb()
  const rows = db.prepare(`
    SELECT o.*, u.name AS user_name, u.email AS user_email
    FROM orders o JOIN users u ON u.id = o.user_id
    WHERE o.status = 'pending_payment'
    ORDER BY o.created_at
  `).all()

  const koerbe = new Map()
  for (const o of rows) {
    const schluessel = o.payment_ref || o.order_ref
    if (!koerbe.has(schluessel)) {
      koerbe.set(schluessel, {
        referenz: schluessel,
        verwendungszweck: [schluessel, (o.user_name || '').trim()].filter(Boolean).join(' ').slice(0, 140),
        kunde: o.user_name, email: o.user_email,
        seit: o.created_at, summe: 0, positionen: [],
      })
    }
    const korb = koerbe.get(schluessel)
    korb.summe += betragAusText(o.price) + betragAusText(o.shipping_cost)
    korb.positionen.push({ id: o.id, order_ref: o.order_ref, shoe_name: o.shoe_name, price: o.price })
  }
  res.json([...koerbe.values()].map(k => ({ ...k, summe: Math.round(k.summe * 100) / 100 })))
})

/**
 * POST /api/orders/zahlung/buchen — eine Zeile vom Kontoauszug verbuchen.
 *
 * Gesucht wird über die Referenz, die im Verwendungszweck steckt. Der Kunde
 * schreibt sie selten sauber ab: Sie steht irgendwo im Text, oft klein
 * geschrieben, oft mit seinem Namen dahinter. Deshalb wird der eingefügte
 * Text durchsucht und nicht verglichen.
 *
 * Gebucht wird der ganze Korb — es ist eine Überweisung, und alles andere
 * hieße, dieselbe Zahlung mehrfach zuzuordnen.
 *
 * MFA: Das Buchen ist die Bestätigung eines Geldeingangs. Dieselbe Schwelle
 * wie bei der Freigabe über PUT /:id, sonst führte der bequemere Weg an der
 * Prüfung vorbei.
 */
router.post('/zahlung/buchen',
  authenticate, requireRole('admin'), requireMFA,
  body('verwendungszweck').trim().isLength({ min: 4, max: 200 }),
  body('freigeben').optional().isBoolean(),
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const db = getDb()
    const text = req.body.verwendungszweck.trim()

    // Alle offenen Referenzen gegen den eingefügten Text halten. Die längste
    // Übereinstimmung gewinnt — eine Referenz, die in einer anderen enthalten
    // ist, darf nicht die falsche Bestellung treffen.
    const offen = db.prepare(`
      SELECT DISTINCT COALESCE(payment_ref, order_ref) AS referenz
      FROM orders WHERE status = 'pending_payment'
    `).all().map(r => r.referenz).filter(Boolean)

    const klein = text.toLowerCase()
    const treffer = offen
      .filter(r => klein.includes(String(r).toLowerCase()))
      .sort((a, b) => b.length - a.length)[0]

    if (!treffer) {
      return res.status(404).json({
        error: 'Zu diesem Verwendungszweck ist keine offene Bestellung zu finden.',
        code: 'KEIN_TREFFER',
      })
    }

    const posten = db.prepare(`
      SELECT * FROM orders
      WHERE status = 'pending_payment' AND COALESCE(payment_ref, order_ref) = ?
    `).all(treffer)

    const zielStatus = req.body.freigeben === false ? 'pending' : 'processing'
    const gebucht = []

    for (const o of posten) {
      db.prepare(`
        UPDATE orders SET status = ?, paid_at = COALESCE(paid_at, datetime('now')),
          updated_at = datetime('now')
        WHERE id = ?
      `).run(zielStatus, o.id)
      merkeEreignis(db, o.id, zielStatus, { note: 'Zahlungseingang verbucht', actor: 'verwaltung', actorId: req.user.id })
      protokoll(db, {
        entity: 'order', entityId: o.id, action: 'zahlung',
        detail: `Zahlungseingang zu „${treffer}" verbucht`, user: req.user,
      })
      try { vergibRechnungsnummer(db, o.id) } catch (e) { console.error('[rechnungsnummer]', e.message) }
      gebucht.push(db.prepare('SELECT * FROM orders WHERE id = ?').get(o.id))
    }

    // Die Freigabemail geht je Bestellung hinaus, wie beim Weg über PUT /:id.
    if (zielStatus === 'processing') {
      for (const row of gebucht) {
        const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(row.user_id)
        const scan = row.scan_id ? db.prepare('SELECT * FROM foot_scans WHERE id = ?').get(row.scan_id) : null
        sendOrderConfirmed(row, user).catch(e => console.error('[email confirmed]', e.message))
        sendManufacturerNotification(row, user, scan).catch(e => console.error('[email mfr]', e.message))
      }
    }

    res.json({
      referenz: treffer,
      status: zielStatus,
      anzahl: gebucht.length,
      summe: Math.round(gebucht.reduce((s, o) => s + betragAusText(o.price) + betragAusText(o.shipping_cost), 0) * 100) / 100,
      bestellungen: gebucht,
    })
  }
)

router.post('/zahlung/abschluss', authenticate, async (req, res) => {
  const db = getDb()
  const korb = String(req.body?.basket_id || '').slice(0, 64)
  if (!korb) return res.status(400).json({ error: 'basket_id fehlt' })

  const teile = db.prepare(`
    SELECT * FROM orders
    WHERE user_id = ? AND basket_id = ?
      AND created_at >= datetime('now', '-2 hours')
    ORDER BY id
  `).all(req.user.id, korb)
  if (!teile.length) return res.status(404).json({ error: 'Zu dieser Kennung gibt es keine Bestellung' })

  // Die erste Bestellung stiftet den Verwendungszweck und trägt den Vermerk,
  // dass die Mail hinaus ist. Ein zweiter Aufruf — Doppelklick, wiederholte
  // Anfrage — schickt sie deshalb nicht noch einmal.
  const erste = teile.find(o => o.payment_ref === o.order_ref) || teile[0]
  if (erste.payment_mailed_at) return res.json({ ok: true, bereits_verschickt: true })

  const summe = Math.round(teile.reduce((s, o) => s + betragAusText(o.price), 0) * 100) / 100
  const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(req.user.id)

  db.prepare("UPDATE orders SET payment_mailed_at = datetime('now') WHERE id = ?").run(erste.id)
  try {
    // Der Vorlage wird der Gesamtbetrag untergeschoben — sie zeigt `price`,
    // und das ist hier die Summe des Korbs, nicht der Preis eines Paars.
    await sendPaymentInstructions({ ...erste, price: `€ ${summe.toLocaleString('de-DE', { minimumFractionDigits: 2 })}` }, user)
    res.json({ ok: true, referenz: erste.payment_ref || erste.order_ref, betrag: summe, positionen: teile.length })
  } catch (e) {
    // Vermerk zurücknehmen, damit ein späterer Versuch es erneut darf.
    db.prepare('UPDATE orders SET payment_mailed_at = NULL WHERE id = ?').run(erste.id)
    console.error('[email payment]', e.message)
    res.status(502).json({ ok: false, error: e.message })
  }
})

router.get('/:id/zahlung', authenticate, async (req, res) => {
  const db = getDb()
  const bestellung = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id)
  if (!bestellung) return res.status(404).json({ error: 'Bestellung nicht gefunden' })

  const darf = bestellung.user_id === req.user.id
    || req.user.role === 'admin' || req.user.role === 'curator'
  if (!darf) return res.status(403).json({ error: 'Kein Zugriff auf diese Bestellung' })

  const bank = bankKonfiguration()
  const referenz = bestellung.payment_ref || bestellung.order_ref || `ARTISANSOLE-${bestellung.id}`

  // Bezahlt wird der ganze Kauf, nicht das einzelne Paar. Wer zwei Paare in
  // einem Korb hatte, bekommt hier eine Summe und einen Verwendungszweck —
  // vorher zeigte die Bestätigungsseite die Gesamtsumme und daneben den
  // Verwendungszweck nur einer der Bestellungen.
  const geschwister = db.prepare(
    'SELECT id, price, status, shoe_name FROM orders WHERE payment_ref = ? AND user_id = ? ORDER BY id'
  ).all(referenz, bestellung.user_id)
  const teile = geschwister.length ? geschwister : [bestellung]
  const betrag = Math.round(teile.reduce((s, o) => s + betragAusText(o.price), 0) * 100) / 100

  // Der Name gehört in den Verwendungszweck: Auf dem Kontoauszug steht sonst
  // nur eine Kennung, und die Zuordnung von Hand wird zur Sucharbeit. Die
  // Kennung bleibt vorn, damit sie maschinell zuerst gefunden wird.
  const kaeufer = db.prepare('SELECT name FROM users WHERE id = ?').get(bestellung.user_id)
  const zweck = [referenz, (kaeufer?.name || '').trim()].filter(Boolean).join(' ').slice(0, 140)

  const qr = await giroCode({
    empfaenger: bank.holder,
    iban: bank.iban,
    bic: bank.bic,
    betrag,
    verwendungszweck: zweck,
  })

  res.json({
    empfaenger: bank.holder,
    iban: bank.iban,
    bic: bank.bic,
    bank: bank.bank,
    betrag,
    referenz,
    verwendungszweck: zweck,
    // Woraus sich der Betrag zusammensetzt. Ohne diese Aufstellung sähe der
    // Kunde eine Summe, die höher ist als der Preis der Bestellung, die er
    // gerade offen hat.
    positionen: teile.map(o => ({ id: o.id, name: o.shoe_name, preis: betragAusText(o.price) })),
    // Bezahlt ist der Kauf erst, wenn keine Bestellung mehr darauf wartet.
    bezahlt: teile.every(o => o.status !== 'pending_payment'),
    // Ohne vollständige Bankverbindung gibt es keinen Code. Dann steht in der
    // Anwendung ein Hinweis statt eines Codes, der ins Leere führt.
    giro_qr: qr,
  })
})

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
    shoe_note: 'Custom Made Schuhe entstehen für einen bestimmten Fuß und lassen sich deshalb nicht zurückgeben. Passt etwas nicht, sehen wir uns das an.',
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
    shoe: { name: order.shoe_name, returnable: false, reason: 'Maßanfertigung, keine Rückgabe möglich.' },
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
        return res.status(409).json({ error: 'Custom Made Schuhe lassen sich nicht zurückgeben. Passt etwas nicht, sehen wir uns das an, bitte melden Sie sich.' })
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
