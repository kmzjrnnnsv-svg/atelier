/**
 * Affiliate-Provisionen: Berechnung und Reifung.
 *
 * Die Regeln an einer Stelle, damit sie nicht über Routen verstreut liegen:
 *
 *  • Provision nur auf Schuhe, nicht auf Zubehör oder Versand.
 *  • Grundlage ist der Kaufpreis NACH Rabatt. Sonst zahlt man Provision auf
 *    Geld, das nie geflossen ist.
 *  • Gedeckelt je Paar (Standard 40 €), nicht je Bestellung — ein Einkauf mit
 *    drei Paaren wird dreifach vergütet.
 *  • Schenkt der Affiliate eine Zugabe, wird deren EINKAUFSPREIS einbehalten.
 *    Der Ladenpreis des Schuhspanners liegt mit 45 € über der Provision
 *    selbst; mit ihm zu rechnen ergäbe negative Auszahlungen.
 *  • Ausgezahlt wird erst, wenn fünf auszahlbare Paare zusammenkommen, danach
 *    in Fünferschritten.
 *  • Auszahlbar wird ein Paar erst nach Ablauf der Schutzfrist ab ZUSTELLUNG.
 *    Ab Bestellung gerechnet wäre die Frist bei Maßanfertigung längst
 *    verstrichen, bevor der Kunde den Schuh in der Hand hält.
 */

export const PAYOUT_BATCH_SIZE = 5      // Auszahlung je fünf Paare
export const PROTECTION_DAYS   = 14     // Schutzfrist ab Zustellung
export const DORMANT_MONTHS    = 12     // Rest darunter nach dieser Zeit auszahlen

const num = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  // Preise liegen als Text vor ("€ 1.450"), deutsche Schreibweise.
  const cleaned = String(v ?? '').replace(/[^0-9,.-]/g, '').replace(/\./g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : 0
}

/**
 * Einkaufspreis der Zugabe; ohne hinterlegten Wert wird nichts einbehalten.
 *
 * Der Schlüssel lautet shoe_tree_cedar. Vorher stand hier 'shoetrees' — ein
 * Artikel, den es nicht mehr gibt. Die Abfrage lieferte nichts, num(undefined)
 * ergibt 0, und damit wäre die Zugabe dem Affiliate geschenkt worden, ohne
 * dass irgendetwas fehlgeschlagen wäre.
 */
export function shoetreeCost(db) {
  const row = db.prepare("SELECT cost_price FROM accessories WHERE key = 'shoe_tree_cedar'").get()
  return num(row?.cost_price)
}

/**
 * Provision für ein einzelnes Paar.
 * `order` braucht price (nach Rabatt) und optional die Kategorie des Schuhs.
 */
export function commissionFor(affiliate, order, { giftCost = 0, shoeCategory = null } = {}) {
  const price = num(order.price)
  const gross = affiliate.commission_type === 'fixed'
    ? num(affiliate.commission_value)
    : price * num(affiliate.commission_value) / 100

  const capped = Math.min(gross, num(affiliate.cap_per_shoe) || Infinity)

  // Die Zugabe gibt es nur, wo sie auch passt. Der Schuhspanner ist für
  // Sneaker ausgeschlossen (siehe accessories.not_recommended_for); dort
  // entfällt sie und der Affiliate behält die volle Provision.
  const giftApplies = affiliate.gift_shoetree === 1
    && affiliate.commission_type === 'percent'
    && shoeCategory !== 'SNEAKER'
    && shoeCategory !== 'SNEAKER_LACED'
    && shoeCategory !== 'SNEAKER_BOOT'
    && shoeCategory !== 'LACELESS_TRAINER'

  const withheld = giftApplies ? Math.min(giftCost, capped) : 0

  return {
    shoe_price: round2(price),
    gross_amount: round2(capped),
    gift_cost: round2(withheld),
    amount: round2(Math.max(0, capped - withheld)),
    gift_applies: giftApplies,
  }
}

const round2 = (n) => Math.round(n * 100) / 100

/**
 * Zustände nachziehen: zugestellt → confirmed, Frist um → payable,
 * zurückgegeben → cancelled. Läuft beim Start und über eine tägliche Routine.
 * Gibt zurück, wie viele Zeilen sich geändert haben.
 */
export function matureCommissions(db) {
  const now = "datetime('now')"

  // 1. Zurückgegeben oder reklamiert → verfällt. Bereits ausgezahlte bleiben
  //    unangetastet; ein Rückgriff auf ausgezahltes Geld wäre mehr Ärger als
  //    Ertrag. Solche Fälle werden mit künftigen Provisionen verrechnet.
  const cancelled = db.prepare(`
    UPDATE affiliate_commissions SET status = 'cancelled',
           cancel_reason = COALESCE(cancel_reason, 'Rückgabe oder Reklamation'),
           updated_at = ${now}
    WHERE status IN ('pending','confirmed','payable')
      AND order_id IN (SELECT id FROM orders WHERE returned_at IS NOT NULL OR status = 'cancelled')
  `).run().changes

  // 2. Zugestellt → Frist beginnt.
  const confirmed = db.prepare(`
    UPDATE affiliate_commissions SET status = 'confirmed',
           payable_at = (
             SELECT datetime(COALESCE(o.delivered_at, o.updated_at), '+${PROTECTION_DAYS} days')
             FROM orders o WHERE o.id = affiliate_commissions.order_id
           ),
           updated_at = ${now}
    WHERE status = 'pending'
      AND order_id IN (SELECT id FROM orders WHERE status = 'delivered' AND returned_at IS NULL)
  `).run().changes

  // 3. Frist verstrichen → auszahlbar.
  const payable = db.prepare(`
    UPDATE affiliate_commissions SET status = 'payable', updated_at = ${now}
    WHERE status = 'confirmed' AND payable_at IS NOT NULL AND payable_at <= ${now}
  `).run().changes

  return { cancelled, confirmed, payable }
}

/**
 * Stand eines Affiliates — die Zahlen, aus denen die Fortschrittsanzeige
 * im Portal entsteht.
 */
export function affiliateStanding(db, affiliateId) {
  const rows = db.prepare(`
    SELECT status, COUNT(*) AS n, COALESCE(SUM(amount), 0) AS sum
    FROM affiliate_commissions WHERE affiliate_id = ? GROUP BY status
  `).all(affiliateId)

  const by = Object.fromEntries(rows.map(r => [r.status, r]))
  const count = (s) => by[s]?.n ?? 0
  const sum   = (s) => round2(by[s]?.sum ?? 0)

  const payablePairs = count('payable')
  // Wie viele Paare fehlen bis zur nächsten Auszahlung. Bei genau fünf (oder
  // einem Vielfachen) ist die Runde voll und es fehlt keines mehr.
  const inCurrentBatch = payablePairs % PAYOUT_BATCH_SIZE
  const pairsUntilPayout = payablePairs >= PAYOUT_BATCH_SIZE && inCurrentBatch === 0
    ? 0
    : PAYOUT_BATCH_SIZE - inCurrentBatch

  return {
    pending:   { pairs: count('pending'),   amount: sum('pending') },
    confirmed: { pairs: count('confirmed'), amount: sum('confirmed') },
    payable:   { pairs: payablePairs,       amount: sum('payable') },
    paid:      { pairs: count('paid'),      amount: sum('paid') },
    cancelled: { pairs: count('cancelled') },

    // Für die Fortschrittsanzeige
    batchSize: PAYOUT_BATCH_SIZE,
    pairsInBatch: payablePairs >= PAYOUT_BATCH_SIZE && inCurrentBatch === 0 ? PAYOUT_BATCH_SIZE : inCurrentBatch,
    pairsUntilPayout,
    readyForPayout: payablePairs >= PAYOUT_BATCH_SIZE,
  }
}
