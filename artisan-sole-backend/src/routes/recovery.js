/**
 * recovery.js — Zugang wiederherstellen, wenn alle Geräte weg sind.
 *
 * ── Warum es diesen Weg geben muss ────────────────────────────────────────
 *
 * Ein Konto ohne Passwort hat nichts, was sich zurücksetzen ließe. Der
 * Schlüssel liegt auf den Geräten des Kunden und wandert über den
 * Schlüsselbund des Herstellers mit — in aller Regel geht deshalb nichts
 * verloren. Aber „in aller Regel" ist keine Antwort für den, bei dem es
 * schiefging.
 *
 * ── Womit sich jemand ausweist ────────────────────────────────────────────
 *
 * Nicht mit einer E-Mail. Der Versand steht ohnehin still, und eine Adresse
 * beweist ohnehin nur, dass man ein Postfach kontrolliert.
 *
 * Stattdessen mit dem, was dieses Haus vor anderen voraushat: einer
 * Bestellung. Wer Bestellnummer und Postleitzahl der Lieferung kennt, hat
 * höchstwahrscheinlich die Bestellbestätigung oder den Kontoauszug vor sich —
 * die Bestellnummer ist der Verwendungszweck der Überweisung. Ein Angreifer
 * müsste beides zusammen kennen und dazu die Adresse des Kontos.
 *
 * Das ist kein Bankschließfach, und es wird auch nicht als solches verkauft.
 * Es ist deutlich mehr, als eine Mail-Adresse beweist, und es kostet den
 * echten Kunden dreißig Sekunden.
 *
 * ── Was danach passiert ───────────────────────────────────────────────────
 *
 * Die Kennung erlaubt genau eines: einen neuen Passkey anzulegen. Sie gilt
 * eine Stunde und nur einmal.
 *
 * Bestehende Passkeys werden dabei NICHT gelöscht. Das wäre bequemer, machte
 * aber aus einer Wiederherstellung eine Waffe: Wer sie missbräuchlich
 * auslöste, sperrte den rechtmäßigen Inhaber aus. Stattdessen kommt ein
 * Schlüssel hinzu, alle Sitzungen werden beendet, und im Nachrichtenverlauf
 * des Kontos landet ein Eintrag. Der Kunde sieht beim nächsten Blick, dass
 * etwas geschehen ist — und weil er selbst keine Mail bekommt, ist das der
 * einzige Kanal, der ihn zuverlässig erreicht.
 */
import { Router } from 'express'
import crypto from 'crypto'
import rateLimit from 'express-rate-limit'
import { body, validationResult } from 'express-validator'
import { getDb } from '../db/database.js'

const router = Router()

// Gültigkeitsdauer. Kurz genug, dass eine abgefangene Kennung selten noch
// etwas nützt; lang genug, dass jemand zwischendurch sein Gerät suchen kann.
const GUELTIG_MINUTEN = 60

/**
 * Die Ausweisprüfung ist rate-begrenzt, nicht die Einlösung.
 *
 * Raten ließe sich nur beim Abgleich von Bestellnummer und Postleitzahl —
 * die Kennung selbst hat 256 Bit. Ein Limiter auf der Einlösung würde
 * dagegen jemanden aussperren, der gerade dabei ist, sein Konto zu retten.
 */
const pruefLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 5 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Versuche. Bitte in einer Stunde erneut probieren oder uns anrufen.' },
})

const hash = (t) => crypto.createHash('sha256').update(t).digest('hex')

/**
 * Eine Kennung ausstellen. Gibt die Klartext-Kennung zurück — sie existiert
 * genau einmal und wird nirgends gespeichert.
 */
export function kennungAusstellen(db, userId, { issuedBy = null, note = null } = {}) {
  const token = crypto.randomBytes(32).toString('base64url')
  db.prepare(`
    INSERT INTO account_recovery (user_id, token_hash, expires_at, issued_by, note)
    VALUES (?, ?, datetime('now', ?), ?, ?)
  `).run(userId, hash(token), `+${GUELTIG_MINUTEN} minutes`, issuedBy, note)
  return token
}

/** Prüfen und zurückgeben, ohne zu verbrauchen. */
export function kennungPruefen(db, token) {
  if (!token) return null
  return db.prepare(`
    SELECT * FROM account_recovery
    WHERE token_hash = ? AND used_at IS NULL AND expires_at > datetime('now')
  `).get(hash(String(token))) || null
}

/** Verbrauchen. Ein zweiter Aufruf findet nichts mehr. */
export function kennungEinloesen(db, id) {
  db.prepare("UPDATE account_recovery SET used_at = datetime('now') WHERE id = ?").run(id)
}

// Postleitzahlen stehen in verschiedenen Schreibweisen in den Adressen.
const nurZiffern = (s) => String(s ?? '').replace(/\D/g, '')

/**
 * POST /api/auth/recover/start — Ausweis über eine Bestellung.
 *
 * Antwortet bei Erfolg mit der Kennung. Kein Umweg über eine Mail: Wer die
 * Angaben zusammenbekommt, steht ohnehin vor dem Bildschirm, und ein Umweg
 * über einen Kanal, der gerade nicht funktioniert, hilft niemandem.
 */
router.post('/start',
  pruefLimiter,
  body('email').trim().isEmail().withMessage('Bitte die E-Mail-Adresse Ihres Kontos angeben.'),
  body('order_ref').trim().isLength({ min: 4 }).withMessage('Bitte die Bestellnummer angeben.'),
  body('zip').trim().isLength({ min: 4 }).withMessage('Bitte die Postleitzahl der Lieferadresse angeben.'),
  (req, res) => {
    const fehler = validationResult(req)
    if (!fehler.isEmpty()) return res.status(400).json({ error: fehler.array()[0].msg })

    const db = getDb()
    const email = String(req.body.email).trim()
    const ref   = String(req.body.order_ref).trim().toUpperCase()
    const plz   = nurZiffern(req.body.zip)

    // Eine einzige Absage für alle Fehlschläge. Getrennte Meldungen wären eine
    // Auskunft darüber, welche Adressen es gibt und welche Bestellnummern
    // stimmen — genau das, was ein Angreifer als Erstes sucht.
    const absage = () => res.status(404).json({
      error: 'Diese Angaben passen nicht zusammen. Bitte prüfen Sie Bestellnummer und Postleitzahl — beide finden Sie auf Ihrer Bestellbestätigung. Kommen Sie nicht weiter, schreiben Sie uns.',
    })

    const user = db.prepare('SELECT id, is_active FROM users WHERE email = ? COLLATE NOCASE').get(email)
    if (!user || !user.is_active) return absage()

    const bestellungen = db.prepare(
      'SELECT order_ref, delivery_address FROM orders WHERE user_id = ?'
    ).all(user.id)

    const treffer = bestellungen.some(o => {
      if (String(o.order_ref || '').toUpperCase() !== ref) return false
      let adresse = o.delivery_address
      if (typeof adresse === 'string') {
        try { adresse = JSON.parse(adresse) } catch { adresse = null }
      }
      return !!plz && nurZiffern(adresse?.zip) === plz
    })
    if (!treffer) return absage()

    const token = kennungAusstellen(db, user.id, { note: `Selbstauskunft über Bestellung ${ref}` })
    res.json({ token, gueltig_minuten: GUELTIG_MINUTEN })
  }
)

export default router
