/**
 * ownerLinks.js — der Bestelllink des Inhabers.
 *
 * ── Was das ist, und was es ausdrücklich nicht ist ────────────────────────
 *
 * Ein Owners Link sieht aus wie ein Werbelink und ist etwas anderes. Der
 * Unterschied steht am Anfang, weil danach jede Entscheidung in dieser Datei
 * daraus folgt:
 *
 *   Ein Affiliate vermittelt. Er bekommt Provision, sein Kunde bekommt einen
 *   Prozentsatz vom Katalogpreis, und sein Link gilt unbegrenzt oft.
 *
 *   Ein Owners Link verkauft. Keine Provision, keine Prozente, sondern ein
 *   Festpreis je Modell, den der Inhaber setzt. Und er trägt genau ein Paar:
 *   Ist es verkauft, ist der Link verbraucht.
 *
 * ── Warum der Link nach einem Verkauf stirbt ──────────────────────────────
 *
 * Weil er weitergereicht wird. Ein Link zu einem Sonderpreis, der in einer
 * Nachrichtengruppe landet, wäre sonst ein Sonderpreis für die ganze Gruppe.
 * Ein Ticket löst genau einmal ein; danach entsteht ein neues mit einem neuen
 * Code, und wer den alten weitergibt, gibt eine tote Adresse weiter.
 *
 * Der Nachfolger entsteht automatisch, in derselben Transaktion wie der
 * Verbrauch. Ein Zustand ohne gültigen Link darf es nicht geben, sonst müsste
 * der Inhaber nach jedem Verkauf daran denken, einen neuen anzulegen.
 *
 * ── Warum die Preise nicht am Link hängen ─────────────────────────────────
 *
 * Der Link ist das Ticket, der Preis die Ansage des Hauses. Hingen die Preise
 * am Ticket, müssten sie bei jeder Ablösung mitkopiert werden, und eine
 * Preisänderung erreichte nur das gerade gültige Exemplar.
 */
import { Router } from 'express'
import crypto from 'crypto'
import { body, validationResult } from 'express-validator'
import { getDb } from '../db/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { protokoll } from '../utils/auftragslauf.js'

const router = Router()
const nurAdmin = [authenticate, requireRole('admin')]

/** Dieselbe Normalisierung wie beim Affiliate-Code, damit Großschreibung nicht stört. */
export const normOwnerCode = (v) => String(v ?? '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '')

/**
 * Ein neuer Code.
 *
 * Lesbar genug, um ihn am Telefon durchzugeben, und lang genug, um ihn nicht
 * zu erraten. Geraten würde er sonst auch: Ein Code aus vier Zeichen wäre in
 * einer Nacht durchprobiert, und dahinter stehen Preise, die niemand sehen
 * soll, der den Link nicht bekommen hat.
 */
function neuerCode() {
  const roh = crypto.randomBytes(9).toString('base64url').toLowerCase().replace(/[^a-z0-9]/g, '')
  return `own-${roh.slice(0, 10)}`
}

/**
 * Der gültige Link, und wenn es keinen gibt, ein frischer.
 *
 * Es soll immer genau einen offenen geben. Der Inhaber öffnet die Verwaltung
 * und findet einen Link zum Weitergeben, ohne vorher etwas anlegen zu müssen.
 */
export function aktuellerLink(db, userId = null) {
  const offen = db.prepare("SELECT * FROM owner_links WHERE status = 'active' ORDER BY id DESC LIMIT 1").get()
  if (offen) return offen

  const code = neuerCode()
  const info = db.prepare('INSERT INTO owner_links (code, created_by) VALUES (?, ?)').run(code, userId)
  return db.prepare('SELECT * FROM owner_links WHERE id = ?').get(info.lastInsertRowid)
}

/** Die Festpreise als Zuordnung { shoe_id: preis }. */
export function ownerPreise(db) {
  const zeilen = db.prepare('SELECT shoe_id, price FROM owner_prices').all()
  return Object.fromEntries(zeilen.map(z => [z.shoe_id, Number(z.price)]))
}

/**
 * Taugt dieser Code gerade zum Einkaufen?
 *
 * Gemeinsam genutzt von der öffentlichen Auskunft und der Bestellroute. Zwei
 * Fassungen derselben Prüfung liefen früher oder später auseinander, und die
 * Bestellroute ist die, bei der es weh tut.
 */
export function pruefeOwnerCode(db, code) {
  const c = normOwnerCode(code)
  if (!c) return { gueltig: false, grund: 'KEIN_CODE' }
  const link = db.prepare('SELECT * FROM owner_links WHERE code = ?').get(c)
  if (!link) return { gueltig: false, grund: 'UNBEKANNT' }
  if (link.status === 'used') return { gueltig: false, grund: 'VERBRAUCHT', link }
  if (link.status !== 'active') return { gueltig: false, grund: 'GESPERRT', link }
  return { gueltig: true, link }
}

/**
 * Den Link einlösen und den Nachfolger anlegen.
 *
 * Wird aus der Bestellroute heraus aufgerufen, INNERHALB deren Transaktion.
 * Das ist keine Feinheit: Zwischen „Link ist noch offen" und „Bestellung ist
 * geschrieben" darf nichts liegen, sonst gehen zwei gleichzeitige Käufe durch
 * dasselbe Ticket. Die Bedingung am UPDATE ist der eigentliche Riegel —
 * ändert sie nichts, war jemand schneller, und der Aufrufer bricht ab.
 *
 * Der Nachfolger entsteht hier mit, damit es nie einen Moment ohne gültigen
 * Link gibt. Er erbt den Ersteller, nicht den Käufer: Der Link gehört dem
 * Inhaber, auch der neue.
 */
export function verbraucheOwnerLink(db, link, userId, orderId) {
  const upd = db.prepare(`
    UPDATE owner_links
       SET status = 'used', used_at = datetime('now'), used_by = ?, used_order_id = ?
     WHERE id = ? AND status = 'active'
  `).run(userId, orderId, link.id)
  if (upd.changes === 0) throw new Error('OWNER_RACE')

  const info = db.prepare('INSERT INTO owner_links (code, created_by) VALUES (?, ?)')
    .run(neuerCode(), link.created_by)
  db.prepare('UPDATE owner_links SET replaced_by_id = ? WHERE id = ?').run(info.lastInsertRowid, link.id)
  return info.lastInsertRowid
}

// ─── Öffentlich: was dieser Link wert ist ────────────────────────────────────
//
// Ohne Anmeldung erreichbar, denn der Link wird angeklickt, bevor sich jemand
// anmeldet. Herausgegeben wird nur, was der Laden ohnehin anzeigen muss: die
// Preise. Wer den Link hat, sieht sie; wer ihn nicht hat, bekommt eine
// Absage ohne Auskunft darüber, ob es den Code je gab.
router.get('/:code', (req, res) => {
  const db = getDb()
  const { gueltig, grund } = pruefeOwnerCode(db, req.params.code)

  if (!gueltig) {
    const texte = {
      VERBRAUCHT: 'Dieser Link wurde bereits eingelöst. Jeder Link gilt für genau ein Paar.',
      GESPERRT:   'Dieser Link ist nicht mehr gültig.',
    }
    return res.status(404).json({
      gueltig: false,
      code: grund,
      error: texte[grund] || 'Dieser Link ist nicht gültig.',
    })
  }

  res.json({ gueltig: true, preise: ownerPreise(db) })
})

// ─── Verwaltung ──────────────────────────────────────────────────────────────

// GET /api/owner-links — der aktuelle Link, die Preise, der Verlauf
router.get('/', ...nurAdmin, (req, res) => {
  const db = getDb()
  const aktiv = aktuellerLink(db, req.user.id)

  // Der Verlauf ist die eigentliche Auskunft: Wer hat wann zu welchem Preis
  // gekauft. Ohne ihn wäre der Bereich eine Seite mit einem Link darauf.
  const verlauf = db.prepare(`
    SELECT l.id, l.code, l.status, l.label, l.used_at,
           u.name AS kaeufer, u.email AS kaeufer_email,
           o.order_ref, o.shoe_name, o.price
      FROM owner_links l
      LEFT JOIN users  u ON u.id = l.used_by
      LEFT JOIN orders o ON o.id = l.used_order_id
     WHERE l.status != 'active'
     ORDER BY l.id DESC
     LIMIT 100
  `).all()

  // Alle Modelle mit ihrem Katalogpreis und, falls gesetzt, dem Owner-Preis.
  const modelle = db.prepare(`
    SELECT s.id, s.name, s.price AS katalogpreis, s.collection, p.price AS owner_preis
      FROM shoes s
      LEFT JOIN owner_prices p ON p.shoe_id = s.id
     ORDER BY s.collection, s.name
  `).all()

  res.json({ aktiv, verlauf, modelle, verkauft: verlauf.filter(v => v.status === 'used').length })
})

// POST /api/owner-links/neu — den aktuellen Link ersetzen
//
// Für den Fall, dass ein Link an die falsche Person ging. Der alte wird
// gesperrt, nicht gelöscht: Was einmal hinausgegeben wurde, gehört in den
// Verlauf, sonst fehlt später die Erklärung für einen toten Link.
router.post('/neu', ...nurAdmin, (req, res) => {
  const db = getDb()
  const ersetzen = db.transaction(() => {
    const alt = db.prepare("SELECT id FROM owner_links WHERE status = 'active' ORDER BY id DESC LIMIT 1").get()
    if (alt) db.prepare("UPDATE owner_links SET status = 'revoked' WHERE id = ?").run(alt.id)
    const code = neuerCode()
    const info = db.prepare('INSERT INTO owner_links (code, created_by) VALUES (?, ?)').run(code, req.user.id)
    if (alt) db.prepare('UPDATE owner_links SET replaced_by_id = ? WHERE id = ?').run(info.lastInsertRowid, alt.id)
    return db.prepare('SELECT * FROM owner_links WHERE id = ?').get(info.lastInsertRowid)
  })
  const neu = ersetzen()
  protokoll(db, {
    entity: 'owner_link', entityId: String(neu.id), action: 'neu erzeugt',
    detail: 'Der bisherige Link wurde gesperrt.', user: req.user,
  })
  res.json(neu)
})

// PUT /api/owner-links/preise — die Festpreise setzen
//
// Ein leeres Feld heißt „kein Owner-Preis", nicht „kostenlos": Der Eintrag
// wird dann entfernt und das Modell kostet über den Link den Katalogpreis.
router.put('/preise', ...nurAdmin,
  body('preise').isArray().withMessage('Liste erwartet'),
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg })

    const db = getDb()
    const setzen = db.prepare(`
      INSERT INTO owner_prices (shoe_id, price, updated_by, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(shoe_id) DO UPDATE
        SET price = excluded.price, updated_by = excluded.updated_by, updated_at = excluded.updated_at
    `)
    const loeschen = db.prepare('DELETE FROM owner_prices WHERE shoe_id = ?')

    let gesetzt = 0, entfernt = 0
    const schreiben = db.transaction((zeilen) => {
      for (const z of zeilen) {
        const id = Number(z.shoe_id)
        if (!Number.isInteger(id)) continue
        const roh = String(z.price ?? '').trim()
        if (roh === '') { entfernt += loeschen.run(id).changes; continue }
        const preis = Number(String(roh).replace(',', '.'))
        // Ein negativer Preis wäre eine Auszahlung an den Kunden. Die Tabelle
        // verbietet ihn ohnehin, hier kommt die lesbare Absage dazu.
        if (!Number.isFinite(preis) || preis < 0) continue
        setzen.run(id, preis, req.user.id)
        gesetzt++
      }
    })
    schreiben(req.body.preise)

    protokoll(db, {
      entity: 'owner_link', entityId: 'preise', action: 'Preise gesetzt',
      detail: `${gesetzt} Modell(e) mit Festpreis, ${entfernt} zurück auf Katalogpreis`,
      user: req.user,
    })
    res.json({ message: 'Preise gespeichert', gesetzt, entfernt, preise: ownerPreise(db) })
  },
)

export default router
