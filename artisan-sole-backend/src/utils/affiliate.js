/**
 * Affiliate-Provisionen: Berechnung und Reifung.
 *
 * ── Ein Topf je Paar ──────────────────────────────────────────────────────
 *
 * Für jedes vermittelte Paar stellt das Haus einen festen Betrag bereit:
 * einen Prozentsatz vom Kaufpreis (Standard 10 %), gedeckelt je Paar
 * (Standard 40 €). Das ist alles, was eine Vermittlung kosten darf — und
 * zwar einschließlich dessen, was der Kunde bekommt.
 *
 * Aus diesem Topf zahlt der Affiliate seine Zusage an den Kunden:
 *
 *   • nichts       → der Schuh kostet den Normalpreis, der Affiliate
 *                    erhält den vollen Topf.
 *   • eine Zugabe  → der Einkaufspreis des Artikels wird einbehalten.
 *   • ein Nachlass → der gewährte Nachlass wird einbehalten.
 *
 * Damit steht die Kalkulation im Voraus fest: Ein Affiliate kostet nie mehr
 * als seinen Deckel je Paar, gleich was er zusagt. Deshalb gilt der Deckel
 * auch für den Nachlass selbst — 10 % auf ein Paar zu 1.450 € wären 145 €
 * und ließen sich aus einem Topf von 40 € nicht bezahlen.
 *
 * Die übrigen Regeln:
 *
 *  • Provision nur auf Schuhe, nicht auf Zubehör oder Versand.
 *  • Grundlage ist der Kaufpreis NACH Rabatt. Sonst zahlt man Provision auf
 *    Geld, das nie geflossen ist.
 *  • Gedeckelt je PAAR, nicht je Bestellung — ein Einkauf mit drei Paaren
 *    wird dreifach vergütet.
 *  • Verrechnet wird der EINKAUFSPREIS der Zugabe, nicht ihr Ladenpreis.
 *    Mit dem Ladenpreis zu rechnen ergäbe negative Auszahlungen.
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

const round2 = (n) => Math.round(n * 100) / 100

/** Preise aus der Datenbank stehen als Text da („€ 1.450"). */
export const preisZahl = num

/**
 * Der Deckel je Paar. Ohne Angabe 40 € — bewusst nicht „unbegrenzt": Ein
 * fehlender Wert darf keine offene Rechnung ergeben.
 */
export const DECKEL_STANDARD = 40
export const deckelVon = (affiliate) => num(affiliate?.cap_per_shoe) || DECKEL_STANDARD

/**
 * Was ein vermitteltes Paar das Haus höchstens kostet — der Topf, aus dem
 * sowohl die Zusage an den Kunden als auch die Auszahlung an den Affiliate
 * bestritten wird.
 */
export function vermittlungsBudget(affiliate, price) {
  const roh = affiliate?.commission_type === 'fixed'
    ? num(affiliate.commission_value)
    : num(price) * num(affiliate?.commission_value) / 100
  return round2(Math.max(0, Math.min(roh, deckelVon(affiliate))))
}

/**
 * Der Nachlass in Euro, den dieser Affiliate auf einen Preis zusagt.
 *
 * Der Prozentsatz steht am Affiliate, die Euro-Grenze ist sein Deckel: Was
 * er verspricht, zahlt er aus seinem eigenen Topf, und der ist gedeckelt.
 * Ohne diese Grenze wäre ein Nachlass auf ein teures Paar teurer als die
 * ganze Vermittlung — 10 % von 1.450 € sind 145 €.
 */
export function kundenNachlass(affiliate, listenpreis) {
  if (!affiliate || affiliate.customer_benefit !== 'discount') return 0
  const pct = Math.min(100, Math.max(0, num(affiliate.customer_discount_pct)))
  if (!pct) return 0
  return round2(Math.max(0, Math.min(num(listenpreis) * pct / 100, deckelVon(affiliate))))
}

/**
 * Derselbe Nachlass, aber aus dem GEZAHLTEN Preis zurückgerechnet.
 *
 * Die Bestellung kennt nur, was der Kunde am Ende bezahlt hat — der Nachlass
 * lag auf der ganzen Konfiguration (Schuh, Optionen, Zubehör), nicht bloß auf
 * dem Grundpreis des Modells. Aus dem Endbetrag zurückzurechnen trifft daher
 * genauer als jeder Blick in die Modelltabelle. Der Deckel greift danach
 * genauso wie vorne im Konfigurator, also stimmen beide Seiten überein.
 */
export function nachlassAusKaufpreis(affiliate, kaufpreis) {
  if (!affiliate || affiliate.customer_benefit !== 'discount') return 0
  const pct = Math.min(99, Math.max(0, num(affiliate.customer_discount_pct)))
  if (!pct) return 0
  return kundenNachlass(affiliate, num(kaufpreis) / (1 - pct / 100))
}

/**
 * Einkaufspreis einer Zugabe. Fehlt er, gilt der Ladenpreis — lieber zu viel
 * einbehalten als eine Zugabe zu verschenken, die niemand verrechnet hat.
 */
export function zugabeKosten(db, giftKey) {
  if (!giftKey) return 0
  try {
    const a = db.prepare('SELECT price, cost_price FROM accessories WHERE key = ?').get(String(giftKey))
    if (!a) return 0
    return round2(Math.max(0, num(a.cost_price ?? a.price)))
  } catch {
    return 0
  }
}

/**
 * Was die Zusage dieses Affiliates bei diesem Kaufpreis kostet.
 * Braucht die Datenbank nur für die Zugabe.
 */
export function zusageKosten(db, affiliate, kaufpreis) {
  if (!affiliate) return 0
  if (affiliate.customer_benefit === 'gift')     return zugabeKosten(db, affiliate.gift_key)
  if (affiliate.customer_benefit === 'discount') return nachlassAusKaufpreis(affiliate, kaufpreis)
  return 0
}

/**
 * Provision für ein einzelnes Paar.
 *
 * `order` braucht den Kaufpreis (nach Rabatt) und optional `benefit_cost` —
 * was die Zusage an den Kunden gekostet hat. Ohne diese Angabe wird nichts
 * einbehalten; die Aufrufer ermitteln sie über `zusageKosten`.
 */
export function commissionFor(affiliate, order) {
  const price   = num(order.price)
  const budget  = vermittlungsBudget(affiliate, price)
  // Nie mehr einbehalten, als im Topf liegt: Eine negative Auszahlung wäre
  // eine Forderung an den Affiliate, und die will hier niemand stellen.
  const zusage  = round2(Math.max(0, Math.min(num(order.benefit_cost), budget)))

  return {
    shoe_price:   round2(price),
    gross_amount: budget,
    gift_cost:    zusage,
    amount:       round2(Math.max(0, budget - zusage)),
    // Wofür einbehalten wurde — für die Anzeige im Portal.
    benefit_kind: order.benefit_kind || affiliate?.customer_benefit || 'none',
  }
}

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
