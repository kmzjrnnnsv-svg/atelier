/**
 * chat.js · Ein Gespräch zwischen dem Haus und seinem Gegenüber.
 *
 * Warum überhaupt: Anfragen landeten in custom_requests und wurden per E-Mail
 * beantwortet, Tickets in feedback_tickets bekamen eine Notiz, auf die niemand
 * antworten konnte. Beides sind Einbahnstraßen. Wer nachfragen wollte, schrieb
 * ein neues Ticket, und der Verlauf lag über zwei Tabellen und ein fremdes
 * Postfach verstreut.
 *
 * Ein Verlauf je Person: Es ist ein Gespräch mit dem Haus, kein Ticketsystem.
 *
 * Die Kategorie (Firma, Affiliate, Kunde) wird bei jeder Abfrage aus dem Konto
 * abgeleitet, nicht gespeichert — sie kann sich ändern, und eine eingefrorene
 * wäre ab dann falsch.
 */
import { Router } from 'express'
import { body, param, validationResult } from 'express-validator'
import rateLimit from 'express-rate-limit'
import { getDb } from '../db/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()
const imTeam = [authenticate, requireRole('admin', 'curator')]

const MAX_LAENGE = 4000

// Schreiben ist günstig, aber nicht kostenlos: Jede Nachricht landet in der
// Verwaltung und meldet sich dort. 60/Stunde lassen ein normales Gespräch zu
// und verhindern, dass jemand den Posteingang flutet.
const schreibBremse = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: process.env.NODE_ENV !== 'production' ? 1000 : 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Nachrichten in kurzer Zeit. Bitte einen Moment warten.' },
})

/**
 * In welchen Reiter der Verwaltung gehört dieses Konto?
 *
 * Ein Firmenkonto wiegt schwerer als eine Affiliate-Freigabe: Wer beides hat,
 * erscheint bei den Firmen, sonst stünde derselbe Verlauf zweimal.
 */
const KATEGORIE_SQL = `
  CASE
    WHEN b.id IS NOT NULL THEN 'business'
    WHEN a.id IS NOT NULL THEN 'affiliate'
    ELSE 'user'
  END
`
const KATEGORIE_JOIN = `
  LEFT JOIN businesses b ON b.owner_user_id = u.id
  LEFT JOIN affiliates  a ON a.user_id = u.id AND a.status = 'active'
`

/** Der Verlauf einer Person; legt ihn beim ersten Mal an. */
function threadFuer(db, userId, anlegen = false) {
  const vorhanden = db.prepare('SELECT * FROM chat_threads WHERE user_id = ?').get(userId)
  if (vorhanden || !anlegen) return vorhanden || null
  db.prepare('INSERT INTO chat_threads (user_id) VALUES (?)').run(userId)
  return db.prepare('SELECT * FROM chat_threads WHERE user_id = ?').get(userId)
}

function nachrichtenVon(db, threadId) {
  return db.prepare(`
    SELECT m.id, m.von, m.text, m.created_at, m.gelesen_am, u.name AS autor_name
    FROM chat_messages m
    LEFT JOIN users u ON u.id = m.autor_id
    WHERE m.thread_id = ?
    ORDER BY m.id ASC
  `).all(threadId)
}

const textPruefung = body('text')
  .isString().withMessage('Nachricht erforderlich')
  .trim()
  .notEmpty().withMessage('Bitte schreiben Sie eine Nachricht')
  .isLength({ max: MAX_LAENGE }).withMessage(`Höchstens ${MAX_LAENGE} Zeichen`)

// ── Seite des Gegenübers ────────────────────────────────────────────────────

// GET /api/chat/mine — eigener Verlauf. Öffnen heißt gelesen: Alles vom Team
// wird dabei als gelesen vermerkt, damit die Glocke nicht stehen bleibt.
router.get('/mine', authenticate, (req, res) => {
  const db = getDb()
  const thread = threadFuer(db, req.user.id)
  if (!thread) return res.json({ messages: [] })

  db.prepare("UPDATE chat_messages SET gelesen_am = datetime('now') WHERE thread_id = ? AND von = 'team' AND gelesen_am IS NULL")
    .run(thread.id)

  res.json({ messages: nachrichtenVon(db, thread.id) })
})

// GET /api/chat/mine/ungelesen — Zähler für die Anzeige
router.get('/mine/ungelesen', authenticate, (req, res) => {
  const db = getDb()
  const thread = threadFuer(db, req.user.id)
  if (!thread) return res.json({ ungelesen: 0 })
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM chat_messages WHERE thread_id = ? AND von = 'team' AND gelesen_am IS NULL").get(thread.id)
  res.json({ ungelesen: n })
})

// POST /api/chat/mine — eine Nachricht ans Haus
router.post('/mine', schreibBremse, authenticate, textPruefung, (req, res) => {
  const fehler = validationResult(req)
  if (!fehler.isEmpty()) return res.status(400).json({ errors: fehler.array() })

  const db = getDb()
  const thread = threadFuer(db, req.user.id, true)
  db.transaction(() => {
    db.prepare("INSERT INTO chat_messages (thread_id, von, autor_id, text) VALUES (?, 'kunde', ?, ?)")
      .run(thread.id, req.user.id, req.body.text.trim())
    db.prepare("UPDATE chat_threads SET last_message_at = datetime('now') WHERE id = ?").run(thread.id)
  })()

  res.status(201).json({ messages: nachrichtenVon(db, thread.id) })
})

// ── Seite der Verwaltung ────────────────────────────────────────────────────

// GET /api/chat/threads?kategorie=business|affiliate|user
router.get('/threads', ...imTeam, (req, res) => {
  const db = getDb()
  const kategorie = String(req.query.kategorie || '').trim()
  const erlaubt = ['business', 'affiliate', 'user']

  const zeilen = db.prepare(`
    SELECT
      t.id, t.user_id, t.last_message_at,
      u.name AS user_name, u.email AS user_email,
      ${KATEGORIE_SQL} AS kategorie,
      b.name AS business_name,
      a.code AS affiliate_code,
      (SELECT COUNT(*) FROM chat_messages m
        WHERE m.thread_id = t.id AND m.von = 'kunde' AND m.gelesen_am IS NULL) AS ungelesen,
      (SELECT m.text FROM chat_messages m
        WHERE m.thread_id = t.id ORDER BY m.id DESC LIMIT 1) AS letzter_text,
      (SELECT m.von FROM chat_messages m
        WHERE m.thread_id = t.id ORDER BY m.id DESC LIMIT 1) AS letzter_von
    FROM chat_threads t
    JOIN users u ON u.id = t.user_id
    ${KATEGORIE_JOIN}
    ORDER BY COALESCE(t.last_message_at, t.created_at) DESC
  `).all()

  const gefiltert = erlaubt.includes(kategorie)
    ? zeilen.filter(z => z.kategorie === kategorie)
    : zeilen

  res.json(gefiltert)
})

// GET /api/chat/ungelesen — Zähler je Kategorie für die Navigation
router.get('/ungelesen', ...imTeam, (req, res) => {
  const db = getDb()
  const zeilen = db.prepare(`
    SELECT ${KATEGORIE_SQL} AS kategorie, COUNT(*) AS n
    FROM chat_messages m
    JOIN chat_threads t ON t.id = m.thread_id
    JOIN users u ON u.id = t.user_id
    ${KATEGORIE_JOIN}
    WHERE m.von = 'kunde' AND m.gelesen_am IS NULL
    GROUP BY kategorie
  `).all()

  const stand = { business: 0, affiliate: 0, user: 0 }
  for (const z of zeilen) if (z.kategorie in stand) stand[z.kategorie] = z.n
  res.json({ ...stand, gesamt: stand.business + stand.affiliate + stand.user })
})

// GET /api/chat/threads/:id — Verlauf lesen (und als gelesen vermerken)
router.get('/threads/:id', ...imTeam, param('id').isInt(), (req, res) => {
  const db = getDb()
  const thread = db.prepare(`
    SELECT t.*, u.name AS user_name, u.email AS user_email,
           ${KATEGORIE_SQL} AS kategorie, b.name AS business_name, a.code AS affiliate_code
    FROM chat_threads t
    JOIN users u ON u.id = t.user_id
    ${KATEGORIE_JOIN}
    WHERE t.id = ?
  `).get(req.params.id)
  if (!thread) return res.status(404).json({ error: 'Verlauf nicht gefunden' })

  db.prepare("UPDATE chat_messages SET gelesen_am = datetime('now') WHERE thread_id = ? AND von = 'kunde' AND gelesen_am IS NULL")
    .run(thread.id)

  res.json({ thread, messages: nachrichtenVon(db, thread.id) })
})

// POST /api/chat/threads/:id — Antwort des Hauses
router.post('/threads/:id', ...imTeam, param('id').isInt(), textPruefung, (req, res) => {
  const fehler = validationResult(req)
  if (!fehler.isEmpty()) return res.status(400).json({ errors: fehler.array() })

  const db = getDb()
  const thread = db.prepare('SELECT * FROM chat_threads WHERE id = ?').get(req.params.id)
  if (!thread) return res.status(404).json({ error: 'Verlauf nicht gefunden' })

  db.transaction(() => {
    db.prepare("INSERT INTO chat_messages (thread_id, von, autor_id, text) VALUES (?, 'team', ?, ?)")
      .run(thread.id, req.user.id, req.body.text.trim())
    db.prepare("UPDATE chat_threads SET last_message_at = datetime('now') WHERE id = ?").run(thread.id)
  })()

  res.status(201).json({ messages: nachrichtenVon(db, thread.id) })
})

export default router
