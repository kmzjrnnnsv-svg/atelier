import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { getDb } from '../db/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import Anthropic from '@anthropic-ai/sdk'
import { spawnSync } from 'child_process'
import { writeFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const router = Router()

const ML_SCRIPTS = join(new URL('.', import.meta.url).pathname, '..', '..', '..', 'atelier-ml', 'scripts')

// Path to the computer-vision measurement script
const PROCESS_PHOTOS_PY       = join(ML_SCRIPTS, 'process_photos.py')
const SAVE_REAL_SCAN_PY       = join(ML_SCRIPTS, 'save_real_scan.py')
const PROCESS_PHOTOGRAMMETRY  = join(ML_SCRIPTS, 'process_photogrammetry.py')

// ─── Helpers ──────────────────────────────────────────────────────────────────

const rnd = v => Math.round(v * 10) / 10

const okLen   = v => typeof v === 'number' && v >= 150 && v <= 380
const okWid   = v => typeof v === 'number' && v >=  50 && v <= 160
const okArch  = v => typeof v === 'number' && v >=   2 && v <=  50
const okH     = v => typeof v === 'number' && v >=  30 && v <= 120
const okGirth = v => typeof v === 'number' && v >= 150 && v <= 450

// Ramanujan ellipse perimeter — JS port used for fallback girth computation
function ramanujanGirth(a, b) {
  const h = ((a - b) / (a + b)) ** 2
  return Math.PI * (a + b) * (1 + 3 * h / (10 + Math.sqrt(4 - 3 * h)))
}

// Compute all girths given measured cross-section width + foot height (both mm)
// height_frac: fraction of foot height at that location
function girthsFromDimensions(widths, footHeight) {
  const FRAC = { ball: 0.85, waist: 0.80, instep: 0.70, heel: 0.65, ankle: 0.72 }
  const result = {}
  for (const [k, hf] of Object.entries(FRAC)) {
    const a = (widths[k] ?? widths.ball ?? footHeight * 0.5) / 2
    const b = footHeight * hf / 2
    result[k] = rnd(ramanujanGirth(a, b))
  }
  return result
}

// ─── Phase 1: Computer-vision pipeline (process_photos.py) ───────────────────

function runCvPipeline(rightTopImg, rightSideImg, leftTopImg, leftSideImg) {
  try {
    const payload = JSON.stringify({ rightTopImg, rightSideImg, leftTopImg, leftSideImg })
    const proc = spawnSync('python3', [PROCESS_PHOTOS_PY, '--data', payload], {
      timeout: 30_000,
      maxBuffer: 2 * 1024 * 1024,
    })
    if (proc.status !== 0) return null
    return JSON.parse(proc.stdout.toString())
  } catch {
    return null
  }
}

// ─── Phase 2: Claude Vision fallback (improved prompt) ───────────────────────

async function runClaudeFallback(client, toB64, rightTopImg, rightSideImg, leftTopImg, leftSideImg, cvData) {
  // Build context from CV results if partially available
  const cvHint = cvData
    ? `Computer-Vision hat folgende Rohwerte ermittelt (verwende diese als Ausgangspunkt):
Rechts: Länge=${cvData.right_length ?? '?'}mm, Breite=${cvData.right_width ?? '?'}mm, Höhe=${cvData.right_foot_height ?? '?'}mm
Links:  Länge=${cvData.left_length  ?? '?'}mm, Breite=${cvData.left_width  ?? '?'}mm, Höhe=${cvData.left_foot_height  ?? '?'}mm

`
    : ''

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 800,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Du bist ein hochpräzises Fußvermessungs-System. Analysiere diese 4 Bilder.

Jedes Bild enthält ein A4-Papier (297 mm × 210 mm) als Maßstab.
- Bild 1: RECHTER Fuß von OBEN   (A4 daneben)
- Bild 2: RECHTER Fuß von der SEITE (A4 daneben)
- Bild 3: LINKER Fuß von OBEN    (A4 daneben)
- Bild 4: LINKER Fuß von der SEITE (A4 daneben)

${cvHint}MESSVERFAHREN (präzise, Schritt für Schritt):

TOP-ANSICHT (Bilder 1 + 3):
1. Identifiziere das A4-Papier. Miss seine Länge in Bildpixeln → berechne Pixel/mm.
2. Fußlänge = Abstand Ferse → längster Zeh × Pixel/mm
3. Fußbreite = breiteste Stelle (Ballenbereich) × Pixel/mm
4. Ballenbreite = Breite an der breitesten Zehengrundgelenk-Linie × Pixel/mm
5. Taillenbreite = schmalste Stelle zwischen Ballen und Ferse × Pixel/mm
6. Ristbreite = Breite bei 60% der Fußlänge × Pixel/mm
7. Fersenbreite = Breite bei 85% der Fußlänge × Pixel/mm
8. Knöchelbreite = Breite bei 88% der Fußlänge × Pixel/mm

SEITEN-ANSICHT (Bilder 2 + 4):
1. A4-Papier als Höhen-Referenz (210 mm hoch wenn hochkant)
2. Fußhöhe = höchster Punkt des Fußrückens × Pixel/mm
3. Gewölbehöhe = Höhe des Innenbogens vom Boden
4. Ballenquerschnitts-Höhe = Höhe des Fußes im Ballenbereich × Pixel/mm

UMFANGSBERECHNUNG (verwende Ramanujan-Ellipse: π × (3(a+b) − √((3a+b)(a+3b)))):
- Ballenumfang:     a = Ballenbreite/2,      b = Ballenquerschnitts-Höhe × 0.85 / 2
- Taillenumfang:    a = Taillenbreite/2,     b = Fußhöhe × 0.80 / 2
- Ristumfang:       a = Ristbreite/2,        b = Fußhöhe × 0.70 / 2
- Fersenumfang:     a = Fersenbreite/2,      b = Fußhöhe × 0.65 / 2
- Knöchelumfang:    a = Knöchelbreite/2,     b = Fußhöhe × 0.72 / 2

Typische Werte (EU 38–46): Länge 240–295 | Breite 85–105 | Höhe 50–75 | Ballen-G 210–260 | Rist-G 230–280

Antworte NUR mit diesem JSON (keine Erklärung):
{"right_length":<mm>,"right_width":<mm>,"right_arch_height":<mm>,"right_foot_height":<mm>,"right_ball_width":<mm>,"right_waist_width":<mm>,"right_instep_width":<mm>,"right_heel_width":<mm>,"right_ankle_width":<mm>,"right_ball_girth":<mm>,"right_instep_girth":<mm>,"right_heel_girth":<mm>,"right_waist_girth":<mm>,"right_ankle_girth":<mm>,"left_length":<mm>,"left_width":<mm>,"left_arch_height":<mm>,"left_foot_height":<mm>,"left_ball_width":<mm>,"left_waist_width":<mm>,"left_instep_width":<mm>,"left_heel_width":<mm>,"left_ankle_width":<mm>,"left_ball_girth":<mm>,"left_instep_girth":<mm>,"left_heel_girth":<mm>,"left_waist_girth":<mm>,"left_ankle_girth":<mm>}`
        },
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: toB64(rightTopImg)  } },
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: toB64(rightSideImg) } },
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: toB64(leftTopImg)   } },
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: toB64(leftSideImg)  } },
      ],
    }],
  })

  const text = response.content[0]?.text?.trim() ?? ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Kein JSON in Claude-Antwort')
  return JSON.parse(jsonMatch[0])
}

// ─── Merge CV + Claude results ────────────────────────────────────────────────
// CV is trusted for length/width (direct pixel measurement).
// Claude is used for cross-section widths → precise Ramanujan girths.
// If a field is missing from one source, fall back to the other.

function mergeResults(cv, cl, side) {
  const p = s => `${s}_`   // prefix helper

  // Length + width: prefer CV (pixel-accurate) over Claude
  const length = cv?.[`${side}_cv_success`]
    ? (cv[`${side}_length`] ?? cl[`${side}_length`])
    : cl[`${side}_length`]
  const width = cv?.[`${side}_cv_success`]
    ? (cv[`${side}_width`]  ?? cl[`${side}_width`])
    : cl[`${side}_width`]

  const height    = cv?.[`${side}_cv_success`] ? (cv[`${side}_foot_height`]  ?? cl[`${side}_foot_height`])  : cl[`${side}_foot_height`]
  const archHt    = cv?.[`${side}_cv_success`] ? (cv[`${side}_arch_height`]  ?? cl[`${side}_arch_height`])  : cl[`${side}_arch_height`]

  // Cross-section widths from Claude (Claude is better at identifying specific locations)
  const clWidths = {
    ball:   cl[`${side}_ball_width`],
    waist:  cl[`${side}_waist_width`],
    instep: cl[`${side}_instep_width`],
    heel:   cl[`${side}_heel_width`],
    ankle:  cl[`${side}_ankle_width`],
  }
  // Fill missing widths from Claude girths with fallback
  const footH = okH(height) ? height : 60

  // Recompute girths using Ramanujan formula + cross-section widths
  // Prefer Claude's widths (more specific) → Ramanujan → Claude girth directly
  const computeGirth = (key, hFrac, clGirth) => {
    const w = clWidths[key]
    if (okWid(w)) {
      const g = ramanujanGirth(w / 2, footH * hFrac / 2)
      return rnd(g)
    }
    return okGirth(clGirth) ? rnd(clGirth) : null
  }

  return {
    length:       okLen(length)  ? rnd(length)  : null,
    width:        okWid(width)   ? rnd(width)   : null,
    foot_height:  okH(height)    ? rnd(height)  : (okH(footH) ? rnd(footH) : null),
    arch_height:  okArch(archHt) ? rnd(archHt)  : null,
    ball_girth:   computeGirth('ball',   0.85, cl[`${side}_ball_girth`]),
    waist_girth:  computeGirth('waist',  0.80, cl[`${side}_waist_girth`]),
    instep_girth: computeGirth('instep', 0.70, cl[`${side}_instep_girth`]),
    heel_girth:   computeGirth('heel',   0.65, cl[`${side}_heel_girth`]),
    ankle_girth:  computeGirth('ankle',  0.72, cl[`${side}_ankle_girth`]),
  }
}

// ─── AI Vision Analyze ────────────────────────────────────────────────────────
// POST /api/scans/analyze
// 4 Bilder: rightTopImg, rightSideImg, leftTopImg, leftSideImg
// A4-Papier (297×210mm) als Maßstab-Referenz in jedem Bild
//
// Pipeline:
//   1. CV (process_photos.py): A4 detection → precise pixel measurement
//   2. Claude Vision: cross-section widths → Ramanujan girth computation
//   3. Merge: CV length/width + Claude-driven girths
router.post('/analyze', authenticate, async (req, res) => {
  const { rightTopImg, rightSideImg, leftTopImg, leftSideImg } = req.body

  if (!rightTopImg || !rightSideImg || !leftTopImg || !leftSideImg) {
    return res.status(400).json({ error: 'Alle 4 Bilder erforderlich' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY nicht konfiguriert' })
  }

  try {
    const client = new Anthropic({ apiKey })
    const toB64  = dataUrl => dataUrl.replace(/^data:image\/\w+;base64,/, '')

    // ── Phase 1: Computer-vision pipeline ──────────────────────────────────
    const cv = runCvPipeline(rightTopImg, rightSideImg, leftTopImg, leftSideImg)

    // ── Phase 2: Claude Vision (improved prompt with Ramanujan formula) ────
    const cl = await runClaudeFallback(client, toB64, rightTopImg, rightSideImg, leftTopImg, leftSideImg, cv)

    // ── Phase 3: Merge ─────────────────────────────────────────────────────
    const R = mergeResults(cv, cl, 'right')
    const L = mergeResults(cv, cl, 'left')

    // Final sanity: length must be present
    if (!R.length || !L.length)
      throw new Error(`Fußlänge nicht bestimmbar: R=${R.length} L=${L.length}`)
    if (!R.width  || !L.width)
      throw new Error(`Fußbreite nicht bestimmbar: R=${R.width} L=${L.width}`)

    // Girth fallback ratios (if Ramanujan computation also failed)
    const dgR = { ball: R.length*0.84, instep: R.length*0.91, heel: R.length*1.11, waist: R.length*0.82, ankle: R.length*0.86 }
    const dgL = { ball: L.length*0.84, instep: L.length*0.91, heel: L.length*1.11, waist: L.length*0.82, ankle: L.length*0.86 }

    res.json({
      right_length:       R.length,
      right_width:        R.width,
      right_arch_height:  R.arch_height,
      right_foot_height:  R.foot_height,
      right_ball_girth:   R.ball_girth   ?? rnd(dgR.ball),
      right_instep_girth: R.instep_girth ?? rnd(dgR.instep),
      right_heel_girth:   R.heel_girth   ?? rnd(dgR.heel),
      right_waist_girth:  R.waist_girth  ?? rnd(dgR.waist),
      right_ankle_girth:  R.ankle_girth  ?? rnd(dgR.ankle),
      left_length:        L.length,
      left_width:         L.width,
      left_arch_height:   L.arch_height,
      left_foot_height:   L.foot_height,
      left_ball_girth:    L.ball_girth   ?? rnd(dgL.ball),
      left_instep_girth:  L.instep_girth ?? rnd(dgL.instep),
      left_heel_girth:    L.heel_girth   ?? rnd(dgL.heel),
      left_waist_girth:   L.waist_girth  ?? rnd(dgL.waist),
      left_ankle_girth:   L.ankle_girth  ?? rnd(dgL.ankle),
      _cv_right: cv?.right_cv_success ?? false,
      _cv_left:  cv?.left_cv_success  ?? false,
    })
  } catch (err) {
    console.error('[scan/analyze]', err.message)
    res.status(500).json({ error: 'KI-Analyse fehlgeschlagen', detail: err.message })
  }
})

// ─── Save training images ─────────────────────────────────────────────────────
// POST /api/scans/:id/training-images
// Called after scan is saved — stores compressed foot images for ML training.
router.post('/:id/training-images', authenticate, async (req, res) => {
  const scanId = Number(req.params.id)
  const { rightTopImg, rightSideImg, leftTopImg, leftSideImg } = req.body

  if (!rightTopImg && !leftTopImg) {
    return res.status(400).json({ error: 'Mindestens ein Bild erforderlich' })
  }

  const db = getDb()
  const scan = db.prepare('SELECT id, user_id FROM foot_scans WHERE id = ?').get(scanId)
  if (!scan) return res.status(404).json({ error: 'Scan nicht gefunden' })
  if (scan.user_id !== req.user.id && !['admin','curator'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Zugriff verweigert' })
  }

  // Delete existing training data for this scan (re-upload)
  db.prepare('DELETE FROM scan_training_data WHERE scan_id = ?').run(scanId)

  db.prepare(`
    INSERT INTO scan_training_data (scan_id, right_top_img, right_side_img, left_top_img, left_side_img)
    VALUES (?, ?, ?, ?, ?)
  `).run(scanId, rightTopImg ?? null, rightSideImg ?? null, leftTopImg ?? null, leftSideImg ?? null)

  res.json({ ok: true, scan_id: scanId })
})

// ─── Validate training data (admin only) ──────────────────────────────────────
// PATCH /api/scans/:id/validate
// Also saves photos + LiDAR ground truth to atelier-ml/data/real/ for model fine-tuning.
router.patch('/:id/validate', authenticate, requireRole('admin', 'curator'), (req, res) => {
  const db = getDb()
  const result = db.prepare('UPDATE scan_training_data SET validated = 1 WHERE scan_id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Keine Trainingsdaten für diesen Scan' })

  // Export scan photos + measurements to ML training dataset (fire-and-forget)
  try {
    const row = db.prepare(`
      SELECT td.right_top_img, td.right_side_img, td.left_top_img, td.left_side_img,
             fs.right_length, fs.right_width, fs.right_arch AS right_arch_height,
             fs.right_ball_girth, fs.right_instep_girth, fs.right_heel_girth,
             fs.right_waist_girth, fs.right_ankle_girth, fs.ppm AS px_per_mm,
             fs.left_length, fs.left_width, fs.left_arch AS left_arch_height,
             fs.left_ball_girth, fs.left_instep_girth, fs.left_heel_girth,
             fs.left_waist_girth, fs.left_ankle_girth
      FROM scan_training_data td
      JOIN foot_scans fs ON fs.id = td.scan_id
      WHERE td.scan_id = ?
    `).get(req.params.id)

    if (row?.right_top_img && row?.right_length) {
      const payload = JSON.stringify({
        scan_id: `real_${req.params.id}`,
        rightTopImg:  row.right_top_img,
        rightSideImg: row.right_side_img,
        leftTopImg:   row.left_top_img,
        leftSideImg:  row.left_side_img,
        px_per_mm:    row.px_per_mm ?? 0,
        lidar: {
          right_length:       row.right_length,       right_width:       row.right_width,
          right_arch_height:  row.right_arch_height,
          right_ball_girth:   row.right_ball_girth,   right_instep_girth: row.right_instep_girth,
          right_heel_girth:   row.right_heel_girth,   right_waist_girth:  row.right_waist_girth,
          right_ankle_girth:  row.right_ankle_girth,
          left_length:        row.left_length,         left_width:        row.left_width,
          left_arch_height:   row.left_arch_height,
          left_ball_girth:    row.left_ball_girth,     left_instep_girth: row.left_instep_girth,
          left_heel_girth:    row.left_heel_girth,     left_waist_girth:  row.left_waist_girth,
          left_ankle_girth:   row.left_ankle_girth,
        },
      })
      spawnSync('python3', [SAVE_REAL_SCAN_PY, '--data', payload], { timeout: 15_000 })
    }
  } catch (e) {
    console.warn('[validate] ML-Export fehlgeschlagen (nicht kritisch):', e.message)
  }

  res.json({ ok: true, validated: true })
})

// ─── Export training dataset (admin only) ─────────────────────────────────────
// GET /api/scans/training-export
router.get('/training-export', authenticate, requireRole('admin'), (req, res) => {
  const db = getDb()
  const rows = db.prepare(`
    SELECT td.*, fs.right_length, fs.right_width, fs.right_arch,
           fs.left_length, fs.left_width, fs.left_arch,
           fs.eu_size, fs.accuracy, fs.created_at AS scan_date
    FROM scan_training_data td
    JOIN foot_scans fs ON fs.id = td.scan_id
    WHERE td.validated = 1
    ORDER BY td.created_at DESC
  `).all()
  res.json({ count: rows.length, data: rows })
})

const saveValidators = [
  body('reference_type').isIn(['card', 'a4', 'lidar']),
  body('ppm').optional().isFloat({ min: 0 }),
  body('right_length').isFloat({ min: 100, max: 400 }),
  body('right_width').isFloat({ min: 50, max: 200 }),
  body('right_arch').isFloat({ min: 0, max: 80 }),
  body('left_length').isFloat({ min: 100, max: 400 }),
  body('left_width').isFloat({ min: 50, max: 200 }),
  body('left_arch').isFloat({ min: 0, max: 80 }),
  body('right_ball_girth').optional().isFloat({ min: 100, max: 450 }),
  body('right_instep_girth').optional().isFloat({ min: 100, max: 450 }),
  body('right_heel_girth').optional().isFloat({ min: 150, max: 500 }),
  body('right_waist_girth').optional().isFloat({ min: 100, max: 450 }),
  body('right_ankle_girth').optional().isFloat({ min: 100, max: 450 }),
  body('left_ball_girth').optional().isFloat({ min: 100, max: 450 }),
  body('left_instep_girth').optional().isFloat({ min: 100, max: 450 }),
  body('left_heel_girth').optional().isFloat({ min: 150, max: 500 }),
  body('left_waist_girth').optional().isFloat({ min: 100, max: 450 }),
  body('left_ankle_girth').optional().isFloat({ min: 100, max: 450 }),
  body('right_foot_height').optional().isFloat({ min: 30, max: 120 }),
  body('left_foot_height').optional().isFloat({ min: 30, max: 120 }),
  body('eu_size').trim().notEmpty(),
  body('uk_size').trim().notEmpty(),
  body('us_size').trim().notEmpty(),
  body('accuracy').isFloat({ min: 0, max: 100 }),
  body('notes').optional().trim().isLength({ max: 500 }),
]

// POST /api/scans — save a scan (any authenticated user)
router.post('/', authenticate, ...saveValidators, (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

  const { reference_type, ppm, right_length, right_width, right_arch,
          left_length, left_width, left_arch,
          right_ball_girth, right_instep_girth, right_heel_girth, right_waist_girth, right_ankle_girth,
          left_ball_girth,  left_instep_girth,  left_heel_girth,  left_waist_girth,  left_ankle_girth,
          right_foot_height, left_foot_height,
          eu_size, uk_size, us_size, accuracy, notes } = req.body

  const result = getDb().prepare(`
    INSERT INTO foot_scans
      (user_id, reference_type, ppm, right_length, right_width, right_arch,
       left_length, left_width, left_arch,
       right_ball_girth, right_instep_girth, right_heel_girth, right_waist_girth, right_ankle_girth,
       left_ball_girth,  left_instep_girth,  left_heel_girth,  left_waist_girth,  left_ankle_girth,
       right_foot_height, left_foot_height,
       eu_size, uk_size, us_size, accuracy, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user.id, reference_type, ppm ?? null,
    right_length, right_width, right_arch,
    left_length,  left_width,  left_arch,
    right_ball_girth ?? null, right_instep_girth ?? null, right_heel_girth ?? null,
    right_waist_girth ?? null, right_ankle_girth ?? null,
    left_ball_girth  ?? null,  left_instep_girth ?? null,  left_heel_girth ?? null,
    left_waist_girth ?? null,  left_ankle_girth ?? null,
    right_foot_height ?? null, left_foot_height ?? null,
    eu_size, uk_size, us_size, accuracy, notes ?? null
  )

  const row = getDb().prepare('SELECT * FROM foot_scans WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json(row)
})

// ─── Training data list (admin/curator) ───────────────────────────────────────
// GET /api/scans/training-data
router.get('/training-data', authenticate, requireRole('admin', 'curator'), (req, res) => {
  const db = getDb()
  const rows = db.prepare(`
    SELECT
      fs.id,
      fs.right_length, fs.right_width, fs.right_arch,
      fs.right_ball_girth, fs.right_instep_girth, fs.right_heel_girth,
      fs.right_waist_girth, fs.right_ankle_girth,
      fs.left_length, fs.left_width, fs.left_arch,
      fs.left_ball_girth, fs.left_instep_girth, fs.left_heel_girth,
      fs.left_waist_girth, fs.left_ankle_girth,
      fs.eu_size, fs.created_at,
      u.name  AS user_name,
      u.email AS user_email,
      td.id       AS td_id,
      td.validated,
      td.right_top_img,
      td.right_side_img,
      td.left_top_img,
      td.left_side_img
    FROM foot_scans fs
    JOIN users u ON u.id = fs.user_id
    LEFT JOIN scan_training_data td ON td.scan_id = fs.id
    ORDER BY td.validated ASC, fs.created_at DESC
  `).all()

  const total     = rows.length
  const validated = rows.filter(r => r.validated === 1).length
  const pending   = rows.filter(r => r.validated !== 1 && r.td_id != null).length

  res.json({ total, validated, pending, scans: rows })
})

// ─── Update measurements + validate (admin only) ───────────────────────────────
// PATCH /api/scans/:id/measurements
router.patch(
  '/:id/measurements',
  authenticate,
  requireRole('admin'),
  [
    body('right_length').optional().isFloat({ min: 100, max: 400 }),
    body('right_width').optional().isFloat({ min: 50, max: 200 }),
    body('right_arch').optional().isFloat({ min: 0, max: 80 }),
    body('right_ball_girth').optional().isFloat({ min: 100, max: 450 }),
    body('right_instep_girth').optional().isFloat({ min: 100, max: 450 }),
    body('right_heel_girth').optional().isFloat({ min: 150, max: 500 }),
    body('right_waist_girth').optional().isFloat({ min: 100, max: 450 }),
    body('right_ankle_girth').optional().isFloat({ min: 100, max: 450 }),
    body('left_length').optional().isFloat({ min: 100, max: 400 }),
    body('left_width').optional().isFloat({ min: 50, max: 200 }),
    body('left_arch').optional().isFloat({ min: 0, max: 80 }),
    body('left_ball_girth').optional().isFloat({ min: 100, max: 450 }),
    body('left_instep_girth').optional().isFloat({ min: 100, max: 450 }),
    body('left_heel_girth').optional().isFloat({ min: 150, max: 500 }),
    body('left_waist_girth').optional().isFloat({ min: 100, max: 450 }),
    body('left_ankle_girth').optional().isFloat({ min: 100, max: 450 }),
    body('right_foot_height').optional().isFloat({ min: 30, max: 120 }),
    body('left_foot_height').optional().isFloat({ min: 30, max: 120 }),
    body('validated').optional().isInt({ min: 0, max: 1 }),
  ],
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const db  = getDb()
    const id  = req.params.id
    const row = db.prepare('SELECT id FROM foot_scans WHERE id = ?').get(id)
    if (!row) return res.status(404).json({ error: 'Scan nicht gefunden' })

    const {
      right_length, right_width, right_arch,
      right_ball_girth, right_instep_girth, right_heel_girth, right_waist_girth, right_ankle_girth,
      right_foot_height,
      left_length,  left_width,  left_arch,
      left_ball_girth,  left_instep_girth,  left_heel_girth,  left_waist_girth,  left_ankle_girth,
      left_foot_height,
      validated,
    } = req.body

    // Build dynamic UPDATE for foot_scans
    const updates = []
    const params  = []
    const fieldMap = {
      right_length, right_width, right_arch,
      right_ball_girth, right_instep_girth, right_heel_girth, right_waist_girth, right_ankle_girth,
      right_foot_height,
      left_length,  left_width,  left_arch,
      left_ball_girth,  left_instep_girth,  left_heel_girth,  left_waist_girth,  left_ankle_girth,
      left_foot_height,
    }
    for (const [key, val] of Object.entries(fieldMap)) {
      if (val !== undefined) { updates.push(`${key} = ?`); params.push(val) }
    }

    if (updates.length > 0) {
      params.push(id)
      db.prepare(`UPDATE foot_scans SET ${updates.join(', ')} WHERE id = ?`).run(...params)
    }

    // Update validated flag in scan_training_data
    if (validated !== undefined) {
      db.prepare('UPDATE scan_training_data SET validated = ? WHERE scan_id = ?').run(validated, id)
    }

    const updated = db.prepare('SELECT * FROM foot_scans WHERE id = ?').get(id)
    res.json({ ok: true, scan: updated })
  }
)

// ─── POST /api/scans/lidar-measurements ──────────────────────────────────────
// Receives an iPhone LiDAR point cloud, runs process_lidar.py, returns mm measurements.
// The client can then call  POST /api/scans  with these values to save a full scan.
router.post('/lidar-measurements', authenticate, async (req, res) => {
  const { pointCloud, side } = req.body   // side: 'right' | 'left' | 'both'

  if (!Array.isArray(pointCloud) || pointCloud.length < 200) {
    return res.status(400).json({ error: 'pointCloud must be an array with ≥200 points' })
  }

  // Write point cloud to a temp file so Python can read it
  const tmpFile = join(tmpdir(), `lidar_${Date.now()}_${req.user.id}.json`)
  try {
    writeFileSync(tmpFile, JSON.stringify(pointCloud))
  } catch (e) {
    return res.status(500).json({ error: 'Failed to write temp file' })
  }

  // Resolve path to process_lidar.py relative to this backend's parent
  const scriptPath = new URL(
    '../../../atelier-ml/scripts/process_lidar.py',
    import.meta.url
  ).pathname

  const proc = spawnSync('python3', [scriptPath, '--cloud', tmpFile], {
    encoding: 'utf8',
    timeout: 30_000,
  })

  try { unlinkSync(tmpFile) } catch { /* ignore */ }

  if (proc.status !== 0) {
    const err = proc.stderr?.trim() || 'Unknown Python error'
    return res.status(422).json({ error: 'LiDAR processing failed', detail: err })
  }

  let measurements
  try {
    measurements = JSON.parse(proc.stdout)
  } catch {
    return res.status(500).json({ error: 'Invalid JSON from process_lidar.py' })
  }

  // Return measurements keyed by side prefix for direct use in  POST /api/scans
  const prefix = (s) => side === 'left' ? `left_${s}` : `right_${s}`
  res.json({
    source: 'lidar',
    side: side ?? 'right',
    raw: measurements,
    // Scan-ready fields:
    [`${side ?? 'right'}_length`]:       measurements.length,
    [`${side ?? 'right'}_width`]:        measurements.width,
    [`${side ?? 'right'}_arch`]:         measurements.arch_height ?? null,
    [`${side ?? 'right'}_foot_height`]:  measurements.height,
    [`${side ?? 'right'}_ball_girth`]:   measurements.ball_girth,
    [`${side ?? 'right'}_instep_girth`]: measurements.instep_girth,
    [`${side ?? 'right'}_waist_girth`]:  measurements.waist_girth,
    [`${side ?? 'right'}_heel_girth`]:   measurements.heel_girth,
    [`${side ?? 'right'}_ankle_girth`]:  measurements.ankle_girth,
    point_count: measurements.point_count,
    // Phase 5: cross-section geometries for shoe last production
    cross_sections: measurements.cross_sections ?? {},
    // Point cloud included for client-side storage after scan save
    _has_point_cloud: !!measurements.point_cloud_mm,
    _point_cloud_count: measurements.point_cloud_mm?.length ?? 0,
  })
})

// GET /api/scans/mine — current user's own scans
router.get('/mine', authenticate, (req, res) => {
  const rows = getDb().prepare(`
    SELECT * FROM foot_scans WHERE user_id = ? ORDER BY created_at DESC
  `).all(req.user.id)
  res.json(rows)
})

// GET /api/scans — admin/curator: all scans with user info
router.get('/', authenticate, requireRole('admin', 'curator'), (req, res) => {
  const rows = getDb().prepare(`
    SELECT fs.*,
           u.name  AS user_name,
           u.email AS user_email,
           u.role  AS user_role
    FROM foot_scans fs
    JOIN users u ON u.id = fs.user_id
    ORDER BY fs.created_at DESC
  `).all()
  res.json(rows)
})

// DELETE /api/scans/:id — admin only
router.delete('/:id', authenticate, requireRole('admin'), (req, res) => {
  const db = getDb()
  const row = db.prepare('SELECT id FROM foot_scans WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Not found' })
  db.prepare('DELETE FROM foot_scans WHERE id = ?').run(req.params.id)
  res.json({ message: 'Deleted' })
})

// ─── Photogrammetrie-Messung ───────────────────────────────────────────────────
// POST /api/scans/photogrammetry
// 8 Fotos je Fuß aus verschiedenen Winkeln + A4-Papier als Referenz.
// Shape-from-Silhouettes → Visual Hull → 3D-Maße (±0.1–0.3mm Länge/Breite).
//
// Body: {
//   rightImgs: [8 base64-JPEGs: top, front, front_left, left, back_left, back, back_right, right],
//   leftImgs:  [8 base64-JPEGs: gleiche Reihenfolge],
// }
router.post('/photogrammetry', authenticate, async (req, res) => {
  const { rightImgs, leftImgs } = req.body

  if (!Array.isArray(rightImgs) || rightImgs.length < 4) {
    return res.status(400).json({ error: 'rightImgs: mindestens 4 Bilder erforderlich' })
  }
  if (!Array.isArray(leftImgs) || leftImgs.length < 4) {
    return res.status(400).json({ error: 'leftImgs: mindestens 4 Bilder erforderlich' })
  }

  try {
    const payload = JSON.stringify({ rightImgs, leftImgs })
    const proc = spawnSync('python3', [PROCESS_PHOTOGRAMMETRY, '--data', payload], {
      timeout: 120_000,          // Rekonstruktion kann 60-90s dauern
      maxBuffer: 5 * 1024 * 1024,
    })

    if (proc.status !== 0) {
      const stderr = proc.stderr?.toString() ?? ''
      console.error('[photogrammetry]', stderr.slice(-500))
      return res.status(500).json({ error: 'Photogrammetrie fehlgeschlagen', detail: stderr.slice(-200) })
    }

    const result = JSON.parse(proc.stdout.toString())

    // Sanity-Check
    const R = result
    if (!R.right_pg_success && !R.left_pg_success) {
      return res.status(422).json({ error: 'Beide Füße konnten nicht rekonstruiert werden', raw: result })
    }

    // Einheitliches Antwort-Format (wie /analyze und /lidar-measurements)
    const rnd = v => Math.round((v ?? 0) * 10) / 10
    res.json({
      right_length:       rnd(R.right_length),
      right_width:        rnd(R.right_width),
      right_arch_height:  rnd(R.right_arch_height),
      right_foot_height:  rnd(R.right_height),
      right_ball_girth:   rnd(R.right_ball_girth),
      right_waist_girth:  rnd(R.right_waist_girth),
      right_instep_girth: rnd(R.right_instep_girth),
      right_heel_girth:   rnd(R.right_heel_girth),
      right_ankle_girth:  rnd(R.right_ankle_girth),
      left_length:        rnd(R.left_length),
      left_width:         rnd(R.left_width),
      left_arch_height:   rnd(R.left_arch_height),
      left_foot_height:   rnd(R.left_height),
      left_ball_girth:    rnd(R.left_ball_girth),
      left_waist_girth:   rnd(R.left_waist_girth),
      left_instep_girth:  rnd(R.left_instep_girth),
      left_heel_girth:    rnd(R.left_heel_girth),
      left_ankle_girth:   rnd(R.left_ankle_girth),
      _right_pg_success:  R.right_pg_success ?? false,
      _left_pg_success:   R.left_pg_success  ?? false,
      _point_count_right: R.right_point_count ?? 0,
      _point_count_left:  R.left_point_count  ?? 0,
      source: 'photogrammetry',
      // Phase 5: cross-section geometries
      right_cross_sections: R.right_cross_sections ?? {},
      left_cross_sections:  R.left_cross_sections  ?? {},
      _has_point_cloud_right: !!R.right_point_cloud_mm,
      _has_point_cloud_left:  !!R.left_point_cloud_mm,
    })
  } catch (err) {
    console.error('[photogrammetry]', err.message)
    res.status(500).json({ error: 'Photogrammetrie-Fehler', detail: err.message })
  }
})

// ─── Phase 5: Shoe Type Settings (Leisten-Parameter) ─────────────────────
// GET /api/scans/shoe-types — list all shoe type settings (any authenticated user)
router.get('/shoe-types', authenticate, (req, res) => {
  const rows = getDb().prepare('SELECT * FROM shoe_type_settings ORDER BY shoe_type').all()
  res.json(rows)
})

// PUT /api/scans/shoe-types/:type — update shoe type settings (admin/curator only)
router.put('/shoe-types/:type', authenticate, requireRole('admin', 'curator'), (req, res) => {
  const { type } = req.params
  const { name, zugabe_mm, toe_extension_mm, heel_pitch_mm,
          instep_raise_mm, shank_spring_mm, width_ease_mm, girth_ease_mm } = req.body

  const db = getDb()
  const existing = db.prepare('SELECT shoe_type FROM shoe_type_settings WHERE shoe_type = ?').get(type)

  if (existing) {
    db.prepare(`
      UPDATE shoe_type_settings SET
        name = COALESCE(?, name),
        zugabe_mm = COALESCE(?, zugabe_mm),
        toe_extension_mm = COALESCE(?, toe_extension_mm),
        heel_pitch_mm = COALESCE(?, heel_pitch_mm),
        instep_raise_mm = COALESCE(?, instep_raise_mm),
        shank_spring_mm = COALESCE(?, shank_spring_mm),
        width_ease_mm = COALESCE(?, width_ease_mm),
        girth_ease_mm = COALESCE(?, girth_ease_mm),
        updated_by = ?,
        updated_at = datetime('now')
      WHERE shoe_type = ?
    `).run(
      name ?? null, zugabe_mm ?? null, toe_extension_mm ?? null,
      heel_pitch_mm ?? null, instep_raise_mm ?? null,
      shank_spring_mm ?? null, width_ease_mm ?? null,
      girth_ease_mm ?? null, req.user.id, type
    )
  } else {
    db.prepare(`
      INSERT INTO shoe_type_settings (shoe_type, name, zugabe_mm, toe_extension_mm,
        heel_pitch_mm, instep_raise_mm, shank_spring_mm, width_ease_mm, girth_ease_mm, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      type, name ?? type, zugabe_mm ?? 0, toe_extension_mm ?? 0,
      heel_pitch_mm ?? 0, instep_raise_mm ?? 0,
      shank_spring_mm ?? 0, width_ease_mm ?? 0, girth_ease_mm ?? 0, req.user.id
    )
  }

  const row = db.prepare('SELECT * FROM shoe_type_settings WHERE shoe_type = ?').get(type)
  res.json(row)
})

// DELETE /api/scans/shoe-types/:type — delete custom shoe type (admin only)
router.delete('/shoe-types/:type', authenticate, requireRole('admin'), (req, res) => {
  const db = getDb()
  const result = db.prepare('DELETE FROM shoe_type_settings WHERE shoe_type = ?').run(req.params.type)
  if (result.changes === 0) return res.status(404).json({ error: 'Schuhtyp nicht gefunden' })
  res.json({ ok: true })
})

// ─── Phase 5: Store point cloud + cross-sections ─────────────────────────
// POST /api/scans/:id/point-cloud
// Stores the PCA-aligned point cloud from LiDAR or photogrammetry.
router.post('/:id/point-cloud', authenticate, (req, res) => {
  const scanId = Number(req.params.id)
  const { side, point_cloud_mm } = req.body

  if (!['right', 'left'].includes(side)) {
    return res.status(400).json({ error: 'side must be "right" or "left"' })
  }
  if (!Array.isArray(point_cloud_mm) || point_cloud_mm.length < 50) {
    return res.status(400).json({ error: 'point_cloud_mm must have ≥50 points' })
  }

  const db = getDb()
  const scan = db.prepare('SELECT id, user_id FROM foot_scans WHERE id = ?').get(scanId)
  if (!scan) return res.status(404).json({ error: 'Scan nicht gefunden' })
  if (scan.user_id !== req.user.id && !['admin','curator'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Zugriff verweigert' })
  }

  // Upsert (replace existing for same scan+side)
  db.prepare('DELETE FROM scan_point_clouds WHERE scan_id = ? AND side = ?').run(scanId, side)
  db.prepare(`
    INSERT INTO scan_point_clouds (scan_id, side, format, point_count, data)
    VALUES (?, ?, 'xyz_mm', ?, ?)
  `).run(scanId, side, point_cloud_mm.length, JSON.stringify(point_cloud_mm))

  res.json({ ok: true, scan_id: scanId, side, point_count: point_cloud_mm.length })
})

// GET /api/scans/:id/point-cloud?side=right
router.get('/:id/point-cloud', authenticate, (req, res) => {
  const scanId = Number(req.params.id)
  const side = req.query.side ?? 'right'

  const db = getDb()
  const scan = db.prepare('SELECT id, user_id FROM foot_scans WHERE id = ?').get(scanId)
  if (!scan) return res.status(404).json({ error: 'Scan nicht gefunden' })
  if (scan.user_id !== req.user.id && !['admin','curator'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Zugriff verweigert' })
  }

  const row = db.prepare(
    'SELECT * FROM scan_point_clouds WHERE scan_id = ? AND side = ?'
  ).get(scanId, side)
  if (!row) return res.status(404).json({ error: 'Keine Punktwolke vorhanden' })

  res.json({ ...row, data: JSON.parse(row.data) })
})

// POST /api/scans/:id/cross-sections
// Stores cross-section contour geometries at the 6 measurement levels.
router.post('/:id/cross-sections', authenticate, (req, res) => {
  const scanId = Number(req.params.id)
  const { side, cross_sections } = req.body

  if (!['right', 'left'].includes(side)) {
    return res.status(400).json({ error: 'side must be "right" or "left"' })
  }
  if (!cross_sections || typeof cross_sections !== 'object') {
    return res.status(400).json({ error: 'cross_sections object required' })
  }

  const db = getDb()
  const scan = db.prepare('SELECT id, user_id FROM foot_scans WHERE id = ?').get(scanId)
  if (!scan) return res.status(404).json({ error: 'Scan nicht gefunden' })
  if (scan.user_id !== req.user.id && !['admin','curator'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Zugriff verweigert' })
  }

  // Delete existing cross-sections for this scan+side
  db.prepare('DELETE FROM scan_cross_sections WHERE scan_id = ? AND side = ?').run(scanId, side)

  const insert = db.prepare(`
    INSERT INTO scan_cross_sections (scan_id, side, level_name, level_frac, girth_mm, width_mm, height_mm, contour)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  let count = 0
  for (const [name, cs] of Object.entries(cross_sections)) {
    insert.run(
      scanId, side, name,
      cs.level_frac ?? 0,
      cs.girth_mm ?? null,
      cs.width_mm ?? null,
      cs.height_mm ?? null,
      JSON.stringify(cs.contour ?? [])
    )
    count++
  }

  res.json({ ok: true, scan_id: scanId, side, sections_stored: count })
})

// GET /api/scans/:id/cross-sections?side=right
router.get('/:id/cross-sections', authenticate, (req, res) => {
  const scanId = Number(req.params.id)
  const side = req.query.side ?? 'right'

  const db = getDb()
  const scan = db.prepare('SELECT id, user_id FROM foot_scans WHERE id = ?').get(scanId)
  if (!scan) return res.status(404).json({ error: 'Scan nicht gefunden' })
  if (scan.user_id !== req.user.id && !['admin','curator'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Zugriff verweigert' })
  }

  const rows = db.prepare(
    'SELECT * FROM scan_cross_sections WHERE scan_id = ? AND side = ? ORDER BY level_frac ASC'
  ).all(scanId, side)

  const sections = rows.map(r => ({
    ...r,
    contour: JSON.parse(r.contour),
  }))
  res.json({ scan_id: scanId, side, sections })
})

// ─── Phase 5: Shoe Last Export ───────────────────────────────────────────
// GET /api/scans/:id/shoe-last?side=right&format=stl&shoe_type=oxford
// Generates a shoe last (Schuhleisten) from scan data and exports as STL or OBJ.
router.get('/:id/shoe-last', authenticate, (req, res) => {
  const scanId = Number(req.params.id)
  const side = req.query.side ?? 'right'
  const format = req.query.format ?? 'stl'   // 'stl' or 'obj'
  const shoeType = req.query.shoe_type ?? 'oxford'

  if (!['stl', 'obj'].includes(format)) {
    return res.status(400).json({ error: 'format must be "stl" or "obj"' })
  }

  const db = getDb()
  const scan = db.prepare('SELECT * FROM foot_scans WHERE id = ?').get(scanId)
  if (!scan) return res.status(404).json({ error: 'Scan nicht gefunden' })
  if (scan.user_id !== req.user.id && !['admin','curator'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Zugriff verweigert' })
  }

  // Retrieve cross-sections if available
  const csRows = db.prepare(
    'SELECT * FROM scan_cross_sections WHERE scan_id = ? AND side = ? ORDER BY level_frac ASC'
  ).all(scanId, side)

  const crossSections = csRows.map(r => ({
    ...r,
    contour: JSON.parse(r.contour),
  }))

  // Retrieve point cloud if available
  const pcRow = db.prepare(
    'SELECT data, point_count FROM scan_point_clouds WHERE scan_id = ? AND side = ?'
  ).get(scanId, side)

  const prefix = side === 'left' ? 'left' : 'right'
  const scanData = {
    length: scan[`${prefix}_length`],
    width: scan[`${prefix}_width`],
    arch: scan[`${prefix}_arch`],
    foot_height: scan[`${prefix}_foot_height`],
    ball_girth: scan[`${prefix}_ball_girth`],
    instep_girth: scan[`${prefix}_instep_girth`],
    waist_girth: scan[`${prefix}_waist_girth`],
    heel_girth: scan[`${prefix}_heel_girth`],
    ankle_girth: scan[`${prefix}_ankle_girth`],
  }

  res.json({
    scan_id: scanId,
    side,
    format,
    shoe_type: shoeType,
    scan_data: scanData,
    cross_sections: crossSections,
    has_point_cloud: !!pcRow,
    point_count: pcRow?.point_count ?? 0,
    // The actual 3D shoe last generation is done client-side in footLast.js
    // This endpoint provides all data needed for the transformation
    message: 'Daten für Leistenberechnung bereitgestellt. 3D-Generierung erfolgt client-seitig.',
  })
})

export default router
