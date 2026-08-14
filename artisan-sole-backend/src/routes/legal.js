import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { getDb } from '../db/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { rechtstextAusDatei, rechtstextDatei } from '../db/seed.js'

const router = Router()
const TYPES    = ['datenschutz', 'agb', 'impressum']
const canWrite = [authenticate, requireRole('admin', 'curator')]

/**
 * GET /api/legal/:type/vorlage — was in der Datei steht.
 *
 * ── Warum es das braucht ──────────────────────────────────────────────────
 *
 * Die Rechtstexte werden im Projekt gepflegt und beim Start in die Datenbank
 * gelegt — aber nur, solange dort nichts steht. Das ist richtig so: Was in
 * der Verwaltung geändert wurde, darf ein Neustart nicht überschreiben.
 *
 * Die Kehrseite fiel erst auf, als sich die AGB tatsächlich änderten: Der
 * neue Text lag in der Datei, ging aus, wurde ausgerollt — und auf der
 * Website stand weiter die alte Fassung. Ohne Fehler, ohne Meldung. Eine
 * Änderung, die niemand sieht, ist keine Änderung.
 *
 * Deshalb hier der Weg dazwischen: Die Verwaltung kann sich ansehen, was in
 * der Datei steht, und sie mit einem Klick übernehmen. Kein automatisches
 * Überschreiben — die Entscheidung bleibt bei einem Menschen, der beide
 * Fassungen gesehen hat.
 */
router.get('/:type/vorlage', ...canWrite, (req, res) => {
  const eintrag = rechtstextDatei(req.params.type)
  if (!eintrag) return res.status(400).json({ error: 'Unbekannter Rechtstext' })

  const { text, fehler, offen } = rechtstextAusDatei(eintrag.datei)
  if (fehler) return res.status(409).json({ error: fehler, offen: offen || [], datei: eintrag.datei })

  const aktuell = getDb().prepare('SELECT content FROM legal_docs WHERE type = ?').get(req.params.type)
  res.json({
    datei: eintrag.datei,
    titel: eintrag.titel,
    text,
    // Damit die Verwaltung nicht raten muss, ob sich überhaupt etwas geändert
    // hat. Zeichenweise verglichen — für „steht schon so drin" reicht das.
    abweichend: (aktuell?.content || '').trim() !== text.trim(),
  })
})

// GET /api/legal/:type — öffentlich (Impressum/Datenschutz/AGB müssen ohne
// Login erreichbar sein).
router.get('/:type', (req, res) => {
  if (!TYPES.includes(req.params.type)) {
    return res.status(400).json({ error: 'Invalid type. Must be: datenschutz, agb, impressum' })
  }
  const row = getDb()
    .prepare('SELECT * FROM legal_docs WHERE type = ?')
    .get(req.params.type)
  if (!row) return res.json({ type: req.params.type, title: '', content: '' })
  res.json(row)
})

// PUT /api/legal/:type (upsert)
router.put('/:type',
  ...canWrite,
  body('title').trim().notEmpty().withMessage('Title required'),
  body('content').trim().notEmpty().withMessage('Content required'),
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    if (!TYPES.includes(req.params.type)) {
      return res.status(400).json({ error: 'Invalid type' })
    }

    const db = getDb()
    db.prepare(`
      INSERT INTO legal_docs (type, title, content, updated_by)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(type) DO UPDATE SET
        title      = excluded.title,
        content    = excluded.content,
        updated_by = excluded.updated_by,
        updated_at = datetime('now')
    `).run(req.params.type, req.body.title, req.body.content, req.user.id)

    res.json(db.prepare('SELECT * FROM legal_docs WHERE type = ?').get(req.params.type))
  }
)

export default router
