/**
 * auswertung.js — die Zahlen, die schon da waren.
 *
 * ── Warum es das nicht gab ────────────────────────────────────────────────
 *
 * Nicht, weil die Daten fehlten. Umsatz, Modelle, Express-Anteil, Wirkung der
 * Vermittler — alles steht in der Datenbank, seit es den Laden gibt. Es fehlte
 * die Ansicht, und ohne sie sind alle Entscheidungen darüber, welche Modelle
 * in die Express-Linie gehören oder welcher Provisionssatz sich trägt,
 * Vermutungen.
 *
 * ── Was hier bewusst NICHT passiert ───────────────────────────────────────
 *
 * Es werden keine Kennzahlen zwischengespeichert und keine Tabellen
 * mitgeschrieben. Bei der Größenordnung dieses Ladens — Bestellungen im
 * zwei- bis dreistelligen Bereich je Jahr — rechnet SQLite das in
 * Millisekunden, und ein Zwischenspeicher, der einmal falsch steht, ist
 * schlimmer als eine Abfrage, die eine Zehntelsekunde braucht.
 *
 * ── Zur Bemessung ─────────────────────────────────────────────────────────
 *
 * Umsatz zählt, was bezahlt wurde, nicht was bestellt wurde. Eine Bestellung
 * in Zahlungswartung ist eine Absicht; eine stornierte ist keine. Beide
 * gehören nicht in eine Umsatzzahl, an der man abliest, wie es läuft.
 */
import { Router } from 'express'
import { getDb } from '../db/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { betragAusText } from '../utils/zahlung.js'

const router = Router()
const canRead = [authenticate, requireRole('admin', 'curator')]

const runden = (n) => Math.round((Number(n) || 0) * 100) / 100

/** Die Summe einer Zeilenmenge. Preise stehen als Text („€ 1.450") in der DB. */
const summe = (rows, feld = 'price') =>
  runden(rows.reduce((s, r) => s + betragAusText(r[feld]), 0))

/**
 * GET /api/auswertung — alles auf einen Blick.
 *
 * Ein Aufruf statt sechs: Die Seite zeigt alles zusammen, und sechs Abfragen
 * nacheinander machen aus einer schnellen Ansicht eine langsame.
 */
router.get('/', ...canRead, (req, res) => {
  const db = getDb()

  // Der Zeitraum in Monaten, voreingestellt zwölf. Mehr als drei Jahre gibt
  // die Ansicht nicht her — die Balken wären nicht mehr zu unterscheiden.
  const monate = Math.min(Math.max(parseInt(req.query.monate, 10) || 12, 1), 36)
  const ab = new Date()
  ab.setMonth(ab.getMonth() - (monate - 1))
  ab.setDate(1)
  const abTag = ab.toISOString().slice(0, 10)

  const bestellungen = db.prepare(`
    SELECT o.id, o.shoe_id, o.shoe_name, o.price, o.shipping_cost, o.status,
           o.created_at, o.paid_at, o.affiliate_code, o.cancel_fee,
           s.express AS express_flag
    FROM orders o LEFT JOIN shoes s ON s.id = o.shoe_id
    WHERE date(o.created_at) >= ?
  `).all(abTag)

  const bezahlt = bestellungen.filter(o => !['pending_payment', 'cancelled'].includes(o.status))

  // ── Monatsverlauf ────────────────────────────────────────────────────────
  // Lücken werden aufgefüllt. Ein Monat ohne Umsatz ist eine Aussage; ein
  // Monat, der im Diagramm fehlt, sieht aus wie ein Fehler.
  const proMonat = new Map()
  for (let i = 0; i < monate; i++) {
    const d = new Date(ab); d.setMonth(d.getMonth() + i)
    proMonat.set(d.toISOString().slice(0, 7), { monat: d.toISOString().slice(0, 7), umsatz: 0, paare: 0 })
  }
  for (const o of bezahlt) {
    const m = String(o.created_at).slice(0, 7)
    const eintrag = proMonat.get(m)
    if (!eintrag) continue
    eintrag.umsatz = runden(eintrag.umsatz + betragAusText(o.price))
    eintrag.paare += 1
  }

  // ── Modelle ──────────────────────────────────────────────────────────────
  const proModell = new Map()
  for (const o of bezahlt) {
    const name = o.shoe_name || 'Unbekannt'
    if (!proModell.has(name)) proModell.set(name, { modell: name, paare: 0, umsatz: 0, express: !!o.express_flag })
    const e = proModell.get(name)
    e.paare += 1
    e.umsatz = runden(e.umsatz + betragAusText(o.price))
  }

  // ── Express gegen Maßanfertigung ─────────────────────────────────────────
  const express = bezahlt.filter(o => o.express_flag)
  const mass    = bezahlt.filter(o => !o.express_flag)

  // ── Vermittler ───────────────────────────────────────────────────────────
  const vermittelt = bezahlt.filter(o => o.affiliate_code)
  const provision = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) AS n FROM affiliate_commissions
    WHERE status != 'cancelled' AND created_at >= ?
  `).get(abTag).n

  // ── Trichter ─────────────────────────────────────────────────────────────
  // Wo Bestellungen hängen bleiben. Die Zahl in 'pending_payment' ist die
  // wichtigste des ganzen Berichts: Das sind Käufe, die zugesagt und nie
  // bezahlt wurden.
  const trichter = db.prepare(`
    SELECT status, COUNT(*) AS anzahl FROM orders
    WHERE date(created_at) >= ? GROUP BY status
  `).all(abTag)

  const offenLange = db.prepare(`
    SELECT COUNT(*) AS anzahl FROM orders
    WHERE status = 'pending_payment' AND created_at < datetime('now', '-10 days')
  `).get().anzahl

  const storniert = bestellungen.filter(o => o.status === 'cancelled')

  res.json({
    zeitraum: { monate, ab: abTag },
    kennzahlen: {
      umsatz:        summe(bezahlt),
      paare:         bezahlt.length,
      durchschnitt:  bezahlt.length ? runden(summe(bezahlt) / bezahlt.length) : 0,
      versand:       summe(bezahlt, 'shipping_cost'),
      offen:         summe(bestellungen.filter(o => o.status === 'pending_payment')),
      offenAnzahl:   bestellungen.filter(o => o.status === 'pending_payment').length,
      offenUeberfaellig: offenLange,
      storniert:     storniert.length,
      stornoGebuehren: runden(storniert.reduce((s, o) => s + (Number(o.cancel_fee) || 0), 0)),
    },
    monatlich: [...proMonat.values()],
    modelle: [...proModell.values()].sort((a, b) => b.umsatz - a.umsatz).slice(0, 15),
    linien: {
      express: { paare: express.length, umsatz: summe(express) },
      mass:    { paare: mass.length,    umsatz: summe(mass) },
      anteil:  bezahlt.length ? Math.round((express.length / bezahlt.length) * 1000) / 10 : 0,
    },
    vermittler: {
      paare:     vermittelt.length,
      umsatz:    summe(vermittelt),
      anteil:    bezahlt.length ? Math.round((vermittelt.length / bezahlt.length) * 1000) / 10 : 0,
      provision: runden(provision),
      // Was von einem vermittelten Euro nach Abzug der Provision bleibt.
      // Das ist die Zahl, an der sich entscheidet, ob der Satz trägt.
      quote: summe(vermittelt) > 0 ? Math.round((provision / summe(vermittelt)) * 1000) / 10 : 0,
      beste: db.prepare(`
        SELECT a.code, a.full_name, COUNT(c.id) AS paare,
               COALESCE(SUM(c.shoe_price), 0) AS umsatz,
               COALESCE(SUM(c.amount), 0)     AS provision
        FROM affiliates a
        JOIN affiliate_commissions c ON c.affiliate_id = a.id AND c.status != 'cancelled'
        WHERE c.created_at >= ?
        GROUP BY a.id ORDER BY umsatz DESC LIMIT 10
      `).all(abTag),
    },
    trichter,
  })
})

/**
 * GET /api/auswertung/protokoll — wer hat was wann geändert.
 *
 * Nur Admins. Ein Kurator darf Inhalte pflegen, aber nicht nachlesen, was
 * andere getan haben — das Protokoll ist ein Aufsichtsmittel, kein Werkzeug.
 */
router.get('/protokoll', authenticate, requireRole('admin'), (req, res) => {
  const db = getDb()
  const grenze = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500)
  const wo = []
  const werte = []
  if (req.query.entity)   { wo.push('entity = ?');    werte.push(String(req.query.entity)) }
  if (req.query.entityId) { wo.push('entity_id = ?'); werte.push(String(req.query.entityId)) }
  if (req.query.action)   { wo.push('action = ?');    werte.push(String(req.query.action)) }

  const rows = db.prepare(`
    SELECT id, entity, entity_id, action, detail, user_name, created_at
    FROM audit_log
    ${wo.length ? `WHERE ${wo.join(' AND ')}` : ''}
    ORDER BY id DESC LIMIT ?
  `).all(...werte, grenze)

  res.json(rows)
})

/**
 * GET /api/auswertung/bestand — was für die Express-Linie noch da ist.
 *
 * Die zwei Wochen sind eine Zusage, und sie hängt an vorbereiteten Bauteilen.
 * Diese Liste ist die einzige Stelle, an der sich prüfen lässt, ob sie
 * gedeckt ist.
 */
router.get('/bestand', ...canRead, (req, res) => {
  const db = getDb()
  res.json(db.prepare(`
    SELECT id, name, slug, category, express_stock, express_weeks, express_surcharge
    FROM shoes WHERE express = 1
    ORDER BY (express_stock IS NULL), express_stock, name
  `).all())
})

export default router
