/**
 * kontoLoeschung.js — Konten löschen, im Vier-Augen-Prinzip.
 *
 * Eigener Router, und das aus einem Grund: Die übrigen Benutzerrouten sind
 * Administratoren vorbehalten. Beim Löschen ist genau das hinderlich — mit nur
 * einem Administrator gäbe es keine zweite Person, und das Verfahren ließe
 * sich nie zu Ende führen. Hier dürfen deshalb Verwaltung UND Kuratoren
 * mitwirken; entscheidend ist nicht die Rolle, sondern dass es zwei
 * verschiedene Menschen sind.
 *
 * Die Regeln selbst stehen in utils/loeschung.js.
 */
import { Router } from 'express'
import { param, validationResult } from 'express-validator'
import { getDb } from '../db/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { FRIST_TAGE, abgelaufeneEndgueltigLoeschen, sofortLoeschen, PLATZHALTER_MAIL } from '../utils/loeschung.js'

const router = Router()
// Verwaltung und Kuratoren. Wer bestätigen darf, muss nicht mehr Rechte haben
// als der, der beantragt — er muss nur ein anderer sein.
router.use(authenticate, requireRole('admin', 'curator'))

/**
 * ── Konto löschen: beantragen, bestätigen, Frist ──────────────────────────
 *
 * Der frühere DELETE hat ohne Rückfrage und ohne Umweg gelöscht. Ein Klick auf
 * die falsche Zeile, und Bestellungen, Passformen und Nachrichten waren weg —
 * ohne dass es etwas gegeben hätte, was man noch hätte tun können.
 *
 * Jetzt in drei Schritten (siehe utils/loeschung.js). Der DELETE bleibt als
 * letzter davon bestehen, greift aber nur noch bei Konten, die den Weg
 * gegangen sind.
 */

// POST /api/users/:id/loeschung — Antrag stellen
router.post('/:id/loeschung', param('id').isInt(), (req, res) => {
  const db = getDb()
  const id = parseInt(req.params.id)
  if (id === req.user.id) return res.status(400).json({ error: 'Das eigene Konto lässt sich hier nicht löschen.' })

  const user = db.prepare('SELECT id, name, email, role, deleted_at, deletion_requested_at FROM users WHERE id = ?').get(id)
  if (!user) return res.status(404).json({ error: 'Konto nicht gefunden' })
  // An diesem Konto hängen die Bestellungen bereits gelöschter Kunden. Es zu
  // löschen nähme ihnen den Anker und damit die Aufbewahrung.
  if (user.email === PLATZHALTER_MAIL) {
    return res.status(400).json({ error: 'Das ist der Platzhalter für gelöschte Konten, an ihm hängen aufzubewahrende Bestellungen.' })
  }
  if (user.deleted_at) return res.status(409).json({ error: 'Dieses Konto ist bereits gesperrt.' })
  if (user.deletion_requested_at) return res.status(409).json({ error: 'Für dieses Konto liegt bereits ein Antrag vor.' })

  const grund = String(req.body?.reason || '').trim().slice(0, 300)
  if (grund.length < 4) {
    return res.status(400).json({ error: 'Bitte den Grund festhalten, etwa „Löschwunsch des Kunden vom 13.08.".' })
  }

  db.prepare(`
    UPDATE users SET deletion_requested_at = datetime('now'), deletion_requested_by = ?,
                     deletion_reason = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(req.user.id, grund, id)

  res.json({ ok: true, wartet_auf_bestaetigung: true })
})

// POST /api/users/:id/loeschung/bestaetigen — zweite Person
router.post('/:id/loeschung/bestaetigen', param('id').isInt(), (req, res) => {
  const db = getDb()
  const id = parseInt(req.params.id)
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id)
  if (!user) return res.status(404).json({ error: 'Konto nicht gefunden' })
  if (!user.deletion_requested_at) return res.status(409).json({ error: 'Für dieses Konto liegt kein Antrag vor.' })
  if (user.deleted_at) return res.status(409).json({ error: 'Dieses Konto ist bereits gesperrt.' })

  // Der Kern des Vier-Augen-Prinzips. Er schützt nicht vor Böswilligkeit —
  // wer beide Zugänge hat, hat beide — sondern vor dem Versehen: der falschen
  // Zeile, dem Klick um 23 Uhr, zwei Kunden mit ähnlichem Namen.
  if (user.deletion_requested_by === req.user.id) {
    return res.status(403).json({
      error: 'Den Antrag muss eine zweite Person bestätigen. Bitte lassen Sie das jemanden aus der Verwaltung tun.',
      code: 'VIER_AUGEN',
    })
  }

  const sofort = req.body?.sofort === true
  if (sofort) {
    // Auf ausdrücklichen Wunsch ohne Frist. Die DSGVO verlangt Löschung
    // „unverzüglich"; wer darauf besteht, bekommt sie.
    sofortLoeschen(db, id)
    return res.json({ ok: true, endgueltig: true })
  }

  db.prepare(`
    UPDATE users SET deleted_at = datetime('now'), deleted_by = ?, is_active = 0,
                     updated_at = datetime('now')
    WHERE id = ?
  `).run(req.user.id, id)
  // Offene Sitzungen enden mit der Sperre, sonst arbeitet das Konto weiter,
  // bis das Zugangstoken von selbst abläuft.
  db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(id)

  res.json({ ok: true, frist_tage: FRIST_TAGE })
})

// POST /api/users/:id/loeschung/zuruecknehmen — Antrag oder Sperre aufheben
router.post('/:id/loeschung/zuruecknehmen', param('id').isInt(), (req, res) => {
  const db = getDb()
  const id = parseInt(req.params.id)
  const user = db.prepare('SELECT id, deleted_at, deletion_requested_at FROM users WHERE id = ?').get(id)
  if (!user) return res.status(404).json({ error: 'Konto nicht gefunden' })
  if (!user.deleted_at && !user.deletion_requested_at) {
    return res.status(409).json({ error: 'Für dieses Konto läuft keine Löschung.' })
  }

  db.prepare(`
    UPDATE users SET deletion_requested_at = NULL, deletion_requested_by = NULL,
                     deletion_reason = NULL, deleted_at = NULL, deleted_by = NULL,
                     is_active = 1, updated_at = datetime('now')
    WHERE id = ?
  `).run(id)
  res.json({ ok: true })
})

// GET /api/users/geloescht — was in der Frist steht
//
// Räumt zugleich auf, was fällig ist. Eine eigene Zeitsteuerung wäre für ein
// Ereignis, das alle paar Monate eintritt, mehr Betriebsteil als Nutzen —
// dasselbe Muster wie bei der Reifung der Provisionen.
router.get('/geloescht', (req, res) => {
  const db = getDb()
  const entfernt = abgelaufeneEndgueltigLoeschen(db)

  const rows = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.deleted_at, u.deletion_reason,
           u.deletion_requested_at,
           a.name AS beantragt_von, b.name AS bestaetigt_von,
           CAST(julianday(u.deleted_at, '+${FRIST_TAGE} days') - julianday('now') AS INTEGER) AS tage_uebrig
    FROM users u
    LEFT JOIN users a ON a.id = u.deletion_requested_by
    LEFT JOIN users b ON b.id = u.deleted_by
    WHERE (u.deleted_at IS NOT NULL OR u.deletion_requested_at IS NOT NULL)
      AND u.email != '${PLATZHALTER_MAIL}'
    ORDER BY COALESCE(u.deleted_at, u.deletion_requested_at) DESC
  `).all()

  res.json({ konten: rows, frist_tage: FRIST_TAGE, endgueltig_entfernt: entfernt })
})

// DELETE /api/users/:id — der letzte Schritt, von Hand vorgezogen
router.delete('/:id', param('id').isInt(), (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

  const targetId = parseInt(req.params.id)
  if (targetId === req.user.id) {
    return res.status(400).json({ error: 'Das eigene Konto lässt sich hier nicht löschen.' })
  }

  const db = getDb()
  const user = db.prepare('SELECT id, deleted_at, deletion_requested_by FROM users WHERE id = ?').get(targetId)
  if (!user) return res.status(404).json({ error: 'Konto nicht gefunden' })

  // Kein Weg am Verfahren vorbei. Wer hier direkt löschen könnte, hätte das
  // Vier-Augen-Prinzip mit einem anderen Aufruf umgangen.
  if (!user.deleted_at) {
    return res.status(409).json({
      error: 'Dieses Konto steht nicht in der Löschfrist. Bitte erst beantragen und von einer zweiten Person bestätigen lassen.',
      code: 'VERFAHREN',
    })
  }
  if (user.deletion_requested_by === req.user.id) {
    return res.status(403).json({ error: 'Die endgültige Löschung muss eine andere Person auslösen als die, die sie beantragt hat.' })
  }

  sofortLoeschen(db, targetId)
  res.json({ message: 'Konto endgültig gelöscht' })
})
export default router
