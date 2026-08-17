/**
 * newsletter.js — Anmeldung im Verfahren der doppelten Bestätigung.
 *
 * ── Warum der Umweg über das Postfach ─────────────────────────────────────
 *
 * Eine E-Mail-Adresse in einem Feld auf einer Website beweist nichts. Sie
 * kann jedem gehören, und wer sie einträgt, muss nicht ihr Inhaber sein.
 * Würden wir sofort werben, wären wir im Zweifel im Unrecht — und der, dem
 * die Adresse gehört, bekäme Post, die er nie wollte.
 *
 * Deshalb geht nach dem Eintragen nur eines hinaus: die Bitte, den Eintrag zu
 * bestätigen. Erst der Klick aus dem Postfach macht daraus eine Einwilligung.
 * Danach, und erst danach, folgt die Willkommensnachricht mit dem Gutschein.
 *
 * ── Was mitgeschrieben wird ───────────────────────────────────────────────
 *
 * Zeitpunkt und Herkunft beider Schritte und der Wortlaut, dem zugestimmt
 * wurde. Wer wirbt, muss die Einwilligung belegen können (Art. 7 Abs. 1
 * DSGVO), und belegen lässt sie sich nur mit dem Text, der damals dastand.
 *
 * ── Warum jede Antwort gleich klingt ──────────────────────────────────────
 *
 * Ob eine Adresse bei uns schon bekannt ist, geht den nichts an, der sie in
 * ein Formular tippt. Deshalb antwortet die Anmeldung immer dasselbe; was
 * sich unterscheidet, unterscheidet sich in der Nachricht, die ins Postfach
 * geht — dorthin kommt nur, wem es gehört.
 */
import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import rateLimit from 'express-rate-limit'
import crypto from 'crypto'
import { getDb } from '../db/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import {
  sendNewsletterBestaetigung,
  sendNewsletterWillkommen,
  sendNewsletterBereitsAngemeldet,
  EmailNotConfiguredError,
} from '../utils/email.js'

const router = Router()

// Der Wortlaut, dem zugestimmt wird. Ändert er sich, ändert sich die Kennung
// mit — alte Einwilligungen behalten dann ihren eigenen Text, statt vom neuen
// überschrieben zu werden.
export const EINWILLIGUNG_FASSUNG = '2026-08-16'
export const EINWILLIGUNG_TEXT =
  'Ich möchte den Newsletter von Artisan Sole per E-Mail erhalten (Neuheiten, ' +
  'Modelle, Angebote) und bin damit einverstanden, dass Artisan Sole mich dazu ' +
  'per E-Mail kontaktiert. Die Einwilligung kann ich jederzeit widerrufen, ' +
  'etwa über den Abmeldelink in jeder Nachricht.'

const RABATT_PROZENT = 10
const GUTSCHEIN_TAGE = 90     // wie lange der Willkommensgutschein gilt
const BESTAETIGUNG_TAGE = 30  // wie lange der Bestätigungslink gilt

// Ein Formular, das E-Mails auslöst, ist ein Werkzeug für fremde Postfächer.
// Deshalb eng begrenzt, unabhängig vom allgemeinen Limit.
const anmeldeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Anmeldeversuche. Bitte versuchen Sie es später erneut.' },
})

const hash = (t) => crypto.createHash('sha256').update(t).digest('hex')
const neuerSchluessel = () => crypto.randomBytes(32).toString('base64url')
const jetzt = () => new Date().toISOString()

/** Die Adresse des Absenders, so gut wie der Server sie kennt. */
function herkunft(req) {
  return (req.headers['x-forwarded-for']?.split(',')[0] || req.ip || '').trim() || null
}

/**
 * Ein Gutschein, der nur einem gehört.
 *
 * Der Code trägt einen Zufallsteil, damit er sich nicht erraten und nicht
 * weitergeben lässt: Er ist einmal einlösbar und danach verbraucht. Wer ihn
 * weitergibt, verschenkt seinen eigenen.
 */
function gutscheinAnlegen(db, email) {
  for (let versuch = 0; versuch < 5; versuch++) {
    const code = `WILLKOMMEN${crypto.randomBytes(3).toString('hex').toUpperCase()}`
    const belegt = db.prepare('SELECT id FROM coupons WHERE code = ?').get(code)
    if (belegt) continue
    const gueltigBis = new Date(Date.now() + GUTSCHEIN_TAGE * 864e5).toISOString()
    db.prepare(`
      INSERT INTO coupons (code, type, value, max_uses, single_use, expires_at, is_active)
      VALUES (?, 'percentage', ?, 1, 1, ?, 1)
    `).run(code, RABATT_PROZENT, gueltigBis)
    return { code, gueltigBis }
  }
  throw new Error('Kein freier Gutscheincode gefunden')
}

// ── POST /api/newsletter/anmelden ─────────────────────────────────────────
router.post('/anmelden',
  anmeldeLimiter,
  body('email').isEmail().withMessage('Bitte eine gültige E-Mail-Adresse angeben')
    .normalizeEmail({ gmail_remove_dots: false }),
  async (req, res) => {
    const fehler = validationResult(req)
    if (!fehler.isEmpty()) {
      return res.status(400).json({ error: fehler.array()[0]?.msg || 'Ungültige Angabe' })
    }
    const email = req.body.email
    const quelle = typeof req.body.quelle === 'string' ? req.body.quelle.slice(0, 60) : 'banner'
    const db = getDb()

    // Nach außen immer dieselbe Antwort — siehe Kopf dieser Datei.
    const antwort = {
      message: 'Fast geschafft: Wir haben Ihnen eine E-Mail geschickt. Bitte bestätigen Sie darin Ihre Anmeldung, dann kommt der Gutschein.',
    }

    try {
      const vorhanden = db.prepare('SELECT * FROM newsletter_subscribers WHERE email = ?').get(email)

      // Schon bestätigt: Es gibt nichts anzumelden. Die Erinnerung daran geht
      // ins Postfach, nicht in die Antwort des Formulars.
      if (vorhanden?.status === 'bestaetigt') {
        await sendNewsletterBereitsAngemeldet(email, vorhanden.coupon_code, vorhanden.unsubscribe_token)
          .catch(e => console.error('[newsletter] Hinweismail:', e.message))
        return res.json(antwort)
      }

      const schluessel = neuerSchluessel()

      if (vorhanden) {
        db.prepare(`
          UPDATE newsletter_subscribers
             SET status = 'offen', confirm_token = ?, consent_text = ?, quelle = ?,
                 angemeldet_am = ?, angemeldet_ip = ?, erinnerung_am = ?,
                 unsubscribe_token = COALESCE(unsubscribe_token, ?),
                 abgemeldet_am = NULL, updated_at = datetime('now')
           WHERE id = ?
        `).run(hash(schluessel), EINWILLIGUNG_TEXT, quelle, jetzt(), herkunft(req), jetzt(),
               neuerSchluessel(), vorhanden.id)
      } else {
        db.prepare(`
          INSERT INTO newsletter_subscribers
            (email, status, confirm_token, unsubscribe_token, consent_text, quelle,
             angemeldet_am, angemeldet_ip)
          VALUES (?, 'offen', ?, ?, ?, ?, ?, ?)
        `).run(email, hash(schluessel), neuerSchluessel(), EINWILLIGUNG_TEXT, quelle,
               jetzt(), herkunft(req))
      }

      await sendNewsletterBestaetigung(email, schluessel, EINWILLIGUNG_TEXT, RABATT_PROZENT)
      res.json(antwort)
    } catch (e) {
      if (e instanceof EmailNotConfiguredError) {
        // Ein Eintrag ohne Bestätigungsmail ist eine Anmeldung, die nie
        // ankommt. Das gehört gesagt, statt still zu versanden.
        return res.status(503).json({ error: 'Der E-Mail-Versand ist gerade nicht eingerichtet. Bitte versuchen Sie es später erneut.' })
      }
      console.error('[newsletter/anmelden]', e)
      res.status(500).json({ error: 'Anmeldung fehlgeschlagen' })
    }
  }
)

// ── POST /api/newsletter/bestaetigen ──────────────────────────────────────
// Der Klick aus der E-Mail. Zweimal geklickt ist kein Fehler: Beim zweiten
// Mal steht derselbe Gutschein da, statt einer Fehlermeldung.
router.post('/bestaetigen', async (req, res) => {
  const schluessel = String(req.body?.token || '')
  if (!schluessel) return res.status(400).json({ error: 'Kein Bestätigungsschlüssel' })
  const db = getDb()

  const eintrag = db.prepare('SELECT * FROM newsletter_subscribers WHERE confirm_token = ?').get(hash(schluessel))
  if (!eintrag) {
    return res.status(404).json({ error: 'Dieser Bestätigungslink ist nicht (mehr) gültig. Bitte tragen Sie sich erneut ein.' })
  }

  if (eintrag.status === 'bestaetigt') {
    return res.json({
      message: 'Ihre Anmeldung ist bereits bestätigt.',
      code: eintrag.coupon_code, rabatt: RABATT_PROZENT, bereits: true,
    })
  }

  const alter = Date.now() - new Date(eintrag.angemeldet_am).getTime()
  if (alter > BESTAETIGUNG_TAGE * 864e5) {
    return res.status(410).json({ error: 'Dieser Bestätigungslink ist abgelaufen. Bitte tragen Sie sich erneut ein.' })
  }

  try {
    const { code, gueltigBis } = gutscheinAnlegen(db, eintrag.email)
    // Der Bestätigungsschlüssel bleibt stehen, statt gelöscht zu werden.
    //
    // Nicht aus Nachlässigkeit: Postfächer laden Links vor, bevor ein Mensch
    // sie anfasst — Outlook tut es zur Sicherheitsprüfung, andere zur
    // Vorschau. Gelöscht man den Schlüssel beim ersten Aufruf, sieht der
    // Empfänger anschließend „Link ungültig", obwohl alles geklappt hat und
    // sein Gutschein längst unterwegs ist. Ein Alarm, wo nichts ist.
    //
    // Stehengelassen kostet er nichts: Ein zweiter Aufruf legt keinen zweiten
    // Gutschein an (siehe oben), er zeigt denselben noch einmal — und den
    // kennt ohnehin nur, wer Zugang zu diesem Postfach hat.
    db.prepare(`
      UPDATE newsletter_subscribers
         SET status = 'bestaetigt', bestaetigt_am = ?, bestaetigt_ip = ?,
             coupon_code = ?, updated_at = datetime('now')
       WHERE id = ?
    `).run(jetzt(), herkunft(req), code, eintrag.id)

    // Der Abmeldeschlüssel bleibt im Klartext stehen — anders als der
    // Bestätigungsschlüssel. Er kann nichts, außer den Empfänger von der
    // Liste zu nehmen, und genau das muss aus jeder je verschickten Nachricht
    // heraus funktionieren, auch aus der von vorletztem Jahr. Ein Hash würde
    // bedeuten, dass jeder Versand einen neuen Link braucht und alte Links
    // ins Leere laufen: der falsche Preis für die falsche Vorsicht.
    const abmelden = eintrag.unsubscribe_token || neuerSchluessel()
    if (!eintrag.unsubscribe_token) {
      db.prepare('UPDATE newsletter_subscribers SET unsubscribe_token = ? WHERE id = ?')
        .run(abmelden, eintrag.id)
    }

    await sendNewsletterWillkommen(eintrag.email, code, RABATT_PROZENT, gueltigBis, abmelden)
      .catch(e => console.error('[newsletter] Willkommensmail:', e.message))

    res.json({
      message: 'Danke, Ihre Anmeldung ist bestätigt.',
      code, rabatt: RABATT_PROZENT, gueltig_bis: gueltigBis,
    })
  } catch (e) {
    console.error('[newsletter/bestaetigen]', e)
    res.status(500).json({ error: 'Bestätigung fehlgeschlagen' })
  }
})

// ── POST /api/newsletter/abmelden ─────────────────────────────────────────
// Der Weg hinaus muss so leicht sein wie der Weg hinein: ein Klick, keine
// Anmeldung, keine Rückfrage.
router.post('/abmelden', (req, res) => {
  const schluessel = String(req.body?.token || '')
  if (!schluessel) return res.status(400).json({ error: 'Kein Abmeldeschlüssel' })
  const db = getDb()
  const eintrag = db.prepare('SELECT * FROM newsletter_subscribers WHERE unsubscribe_token = ?').get(schluessel)
  // Auch ein unbekannter Schlüssel bekommt die freundliche Antwort: Wer sich
  // abmelden will, soll nicht rätseln müssen, ob es geklappt hat.
  if (eintrag && eintrag.status !== 'abgemeldet') {
    db.prepare(`
      UPDATE newsletter_subscribers
         SET status = 'abgemeldet', abgemeldet_am = ?, updated_at = datetime('now')
       WHERE id = ?
    `).run(jetzt(), eintrag.id)
  }
  res.json({ message: 'Sie sind abgemeldet. Wir schreiben Ihnen nicht mehr.' })
})

// ── GET /api/newsletter (admin) ───────────────────────────────────────────
// Für den Versand und für den Nachweis. Ohne Schlüssel — die gehören
// niemandem außer dem Postfach, dem sie geschickt wurden.
router.get('/', authenticate, requireRole('admin'), (req, res) => {
  const db = getDb()
  const rows = db.prepare(`
    SELECT id, email, status, quelle, consent_text,
           angemeldet_am, angemeldet_ip, bestaetigt_am, bestaetigt_ip,
           abgemeldet_am, coupon_code
      FROM newsletter_subscribers
     ORDER BY angemeldet_am DESC
  `).all()
  const zahl = (s) => rows.filter(r => r.status === s).length
  res.json({
    eintraege: rows,
    zusammenfassung: {
      bestaetigt: zahl('bestaetigt'), offen: zahl('offen'), abgemeldet: zahl('abgemeldet'),
    },
  })
})

export default router
