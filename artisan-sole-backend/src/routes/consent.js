/**
 * consent.js — das Protokoll zum Hinweis über Speicherung im Endgerät.
 *
 * ── Was hier festgehalten wird und was nicht ──────────────────────────────
 *
 * Festgehalten wird die Entscheidung: was gewählt wurde, wann, und zu
 * welchem Wortlaut. Nicht festgehalten wird, wer sie getroffen hat. Die
 * Zuordnung läuft über eine zufällige Kennung, die im Browser des Besuchers
 * liegt und sonst nirgends; ist jemand angemeldet, steht sein Konto daneben,
 * weil er dann ohnehin bekannt ist.
 *
 * Das ist kein Versehen, sondern der Punkt: Ein Hinweis, der aus jedem
 * Besucher einen Eintrag mit Namen machte, wäre selbst das, wovor er warnen
 * soll. Für den Nachweis genügt, dass sich zu einer Kennung sagen lässt, was
 * entschieden wurde — und der Besucher trägt die Kennung bei sich.
 *
 * Die Adresse des Absenders wird gekürzt gespeichert (letztes Feld auf Null).
 * Sie soll eine Entscheidung grob verorten können, nicht einen Menschen.
 */
import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import rateLimit from 'express-rate-limit'
import { getDb } from '../db/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

// Fassung des Hinweistextes. Ändert sich, was dort steht, ändert sich diese
// Angabe mit — sonst ließe sich später nicht mehr sagen, wozu jemand ja
// gesagt hat.
export const HINWEIS_FASSUNG = '2026-08-16'

const ENTSCHEIDUNGEN = ['notwendig', 'alle', 'widerrufen']

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Anfragen.' },
})

/** Letztes Feld auf Null: aus 203.0.113.42 wird 203.0.113.0. */
function gekuerzteHerkunft(req) {
  const roh = (req.headers['x-forwarded-for']?.split(',')[0] || req.ip || '').trim()
  if (!roh) return null
  if (roh.includes('.')) {
    const teile = roh.replace(/^::ffff:/, '').split('.')
    if (teile.length === 4) return `${teile[0]}.${teile[1]}.${teile[2]}.0`
  }
  // IPv6: die hinteren vier Gruppen fallen weg.
  const gruppen = roh.split(':')
  return gruppen.length > 4 ? `${gruppen.slice(0, 4).join(':')}::` : roh
}

// ── POST /api/consent ─────────────────────────────────────────────────────
// Wird bei jeder Entscheidung gerufen: annehmen, ablehnen, widerrufen.
router.post('/',
  limiter,
  body('kennung').isString().isLength({ min: 8, max: 64 }),
  body('entscheidung').isIn(ENTSCHEIDUNGEN),
  (req, res) => {
    const fehler = validationResult(req)
    if (!fehler.isEmpty()) return res.status(400).json({ error: 'Ungültige Angabe' })

    const { kennung, entscheidung } = req.body
    const kategorien = req.body.kategorien && typeof req.body.kategorien === 'object'
      ? req.body.kategorien
      : {}

    try {
      getDb().prepare(`
        INSERT INTO consent_log (kennung, user_id, entscheidung, kategorien, text_fassung, user_agent, ip)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        kennung,
        req.user?.id || null,
        entscheidung,
        JSON.stringify(kategorien),
        String(req.body.text_fassung || HINWEIS_FASSUNG).slice(0, 40),
        String(req.headers['user-agent'] || '').slice(0, 300) || null,
        gekuerzteHerkunft(req),
      )
      res.status(201).json({ message: 'Gespeichert', fassung: HINWEIS_FASSUNG })
    } catch (e) {
      console.error('[consent]', e)
      res.status(500).json({ error: 'Speichern fehlgeschlagen' })
    }
  }
)

// ── GET /api/consent/:kennung ─────────────────────────────────────────────
// Was zu dieser Kennung protokolliert ist. Öffentlich, weil die Kennung nur
// der hat, dem sie gehört — und weil Auskunft über die eigenen Daten kein
// Sonderrecht ist, das man sich erst freischalten lassen muss (Art. 15 DSGVO).
router.get('/:kennung', (req, res) => {
  const rows = getDb().prepare(`
    SELECT entscheidung, kategorien, text_fassung, created_at
      FROM consent_log WHERE kennung = ? ORDER BY created_at DESC LIMIT 50
  `).all(String(req.params.kennung))
  res.json(rows.map(r => ({ ...r, kategorien: JSON.parse(r.kategorien || '{}') })))
})

// ── GET /api/consent (admin) ──────────────────────────────────────────────
router.get('/', authenticate, requireRole('admin'), (req, res) => {
  const db = getDb()
  const rows = db.prepare(`
    SELECT id, kennung, user_id, entscheidung, kategorien, text_fassung, ip, created_at
      FROM consent_log ORDER BY created_at DESC LIMIT 500
  `).all()
  const zaehlung = db.prepare(`
    SELECT entscheidung, COUNT(*) AS anzahl FROM consent_log GROUP BY entscheidung
  `).all()
  res.json({ eintraege: rows, zaehlung, fassung: HINWEIS_FASSUNG })
})

export default router
