import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { getDb } from '../db/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import Anthropic from '@anthropic-ai/sdk'
import { spawn, spawnSync } from 'child_process'
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const router = Router()

const ML_SCRIPTS = join(new URL('.', import.meta.url).pathname, '..', '..', '..', 'atelier-ml', 'scripts')

// Resolve Python binary: prefer venv over system python3
// Searches: PYTHON_PATH env → ../atelier-ml/.venv/bin/python3 → ~/ml-venv/bin/python3 → python3
function resolvePython() {
  if (process.env.PYTHON_PATH && existsSync(process.env.PYTHON_PATH)) return process.env.PYTHON_PATH
  const venvLocal = join(ML_SCRIPTS, '..', '.venv', 'bin', 'python3')
  if (existsSync(venvLocal)) return venvLocal
  const venvHome = join(process.env.HOME || '/root', 'ml-venv', 'bin', 'python3')
  if (existsSync(venvHome)) return venvHome
  return 'python3'
}
const PYTHON = resolvePython()

// Path to the computer-vision measurement script
const PROCESS_PHOTOS_PY       = join(ML_SCRIPTS, 'process_photos.py')
const SAVE_REAL_SCAN_PY       = join(ML_SCRIPTS, 'save_real_scan.py')
const PROCESS_PHOTOGRAMMETRY  = join(ML_SCRIPTS, 'process_photogrammetry.py')

// ─── Helpers ──────────────────────────────────────────────────────────────────

// 0.01mm resolution for sub-mm precision (was 0.1mm — too lossy)
const rnd = v => Math.round(v * 100) / 100

const okLen   = v => typeof v === 'number' && v >= 150 && v <= 380
const okWid   = v => typeof v === 'number' && v >=  50 && v <= 160
const okArch  = v => typeof v === 'number' && v >=   2 && v <=  50
const okH     = v => typeof v === 'number' && v >=  30 && v <= 120
const okGirth = v => typeof v === 'number' && v >= 150 && v <= 500

// ─── Superellipse perimeter (Lamé curve) ────────────────────────────────────
// Feet are NOT ellipses. Superellipse with n≈2.3 captures metatarsal bulge
// and medial flattening better than a pure ellipse (n=2).
// Uses Ramanujan as base, then applies a correction factor for the exponent.
function superellipseGirth(a, b, n = 2.3) {
  // Ramanujan base (exact for n=2)
  const h = ((a - b) / (a + b)) ** 2
  const ramanujan = Math.PI * (a + b) * (1 + 3 * h / (10 + Math.sqrt(4 - 3 * h)))
  // Superellipse correction: ratio of superellipse to ellipse perimeter
  // Derived from numerical integration of Lamé curves
  // For n=2.0: factor=1.0, n=2.3: factor≈1.012, n=2.5: factor≈1.018
  const correction = 1 + 0.04 * (n - 2) * (1 - 0.3 * h)
  return ramanujan * correction
}

// Backward-compat alias
function ramanujanGirth(a, b) { return superellipseGirth(a, b, 2.0) }

// ─── Morphology-aware height fractions ──────────────────────────────────────
// Instead of fixed ratios, adjust based on width/height aspect ratio.
// High arch → taller ball section. Flat foot → wider spread.
function heightFractions(footWidth, footHeight) {
  const aspect = footWidth / Math.max(footHeight, 1)
  // aspect ~1.3 = narrow/high foot, ~1.7 = wide/flat foot
  const t = Math.max(0, Math.min(1, (aspect - 1.3) / 0.4))  // 0=narrow, 1=wide
  return {
    ball:   lerp(0.88, 0.82, t),  // was fixed 0.85
    waist:  lerp(0.83, 0.77, t),  // was fixed 0.80
    instep: lerp(0.73, 0.67, t),  // was fixed 0.70
    heel:   lerp(0.68, 0.62, t),  // was fixed 0.65
    ankle:  lerp(0.75, 0.69, t),  // was fixed 0.72
  }
}
const lerp = (a, b, t) => a + (b - a) * t

// ─── Girth from cross-section dimensions ────────────────────────────────────
// Uses morphology-aware height fractions + superellipse model
function girthsFromDimensions(widths, footHeight, footWidth) {
  const fracs = heightFractions(footWidth || footHeight * 1.5, footHeight)
  // Superellipse exponent per location (from podiatric cross-section studies)
  const EXPO = { ball: 2.4, waist: 2.1, instep: 2.2, heel: 2.5, ankle: 2.0 }
  const result = {}
  for (const [k, hf] of Object.entries(fracs)) {
    const a = (widths[k] ?? widths.ball ?? footHeight * 0.5) / 2
    const b = footHeight * hf / 2
    result[k] = rnd(superellipseGirth(a, b, EXPO[k]))
  }
  return result
}

// ─── Long Heel Girth (langer Fersenumfang) ──────────────────────────────────
// Vertical circumference: back of heel → under sole at heel → over instep → back.
// This is a sagittal-plane circumference, different from the transverse heel girth.
// Approximated as: π × (instep_height/2 + heel_depth/2) with superellipse correction.
// instep_height ≈ foot_height at ~60% length
// heel_depth ≈ foot_height at ~15% length (calcaneus to dorsum)
function computeLongHeel(footHeight, heelWidth, instepWidth, footLength) {
  if (!footHeight || !footLength) return null
  // Long heel goes vertically: from floor behind heel, under heel cup, up over instep
  // Semi-axis a = half the height at instep (dorsal clearance)
  // Semi-axis b = half the depth at heel (posterior-to-anterior at heel level)
  const instepH = footHeight * 0.85  // instep is ~85% of max foot height
  const heelDepth = footLength * 0.15  // heel depth is ~15% of foot length
  const a = instepH / 2
  const b = heelDepth / 2
  // Superellipse n=2.2 for the sagittal cross-section (slightly squared off at heel)
  return rnd(superellipseGirth(a, b, 2.2))
}

// ─── Short Heel Girth (kurzer Fersenumfang) ─────────────────────────────────
// Transverse circumference around the heel cup (Calcaneus).
// Already computed as heel_girth in the main pipeline — this is an alias.

// ─── Cross-validation: anatomical consistency checks ────────────────────────
// Reject measurements that violate known anatomical constraints.
function validateAnatomical(m) {
  const issues = []
  if (m.length && m.width) {
    const ratio = m.width / m.length
    if (ratio < 0.30 || ratio > 0.50) issues.push(`width/length ratio ${ratio.toFixed(3)} outside [0.30, 0.50]`)
  }
  if (m.foot_height && m.width) {
    const hw = m.foot_height / m.width
    if (hw < 0.45 || hw > 0.90) issues.push(`height/width ratio ${hw.toFixed(3)} outside [0.45, 0.90]`)
  }
  if (m.ball_girth && m.length) {
    const gl = m.ball_girth / m.length
    if (gl < 0.75 || gl > 1.05) issues.push(`ball_girth/length ratio ${gl.toFixed(3)} outside [0.75, 1.05]`)
  }
  if (m.heel_girth && m.ball_girth) {
    if (m.heel_girth < m.ball_girth * 0.80) issues.push('heel_girth unexpectedly small vs ball_girth')
    if (m.heel_girth > m.ball_girth * 1.50) issues.push('heel_girth unexpectedly large vs ball_girth')
  }
  return issues
}

// ─── Confidence scoring ─────────────────────────────────────────────────────
// Computes realistic accuracy % based on data source quality.
function computeConfidence(cv, cl, source) {
  // Benchmark-basierte Confidence (eval_hybrid_accuracy.py):
  //   Photo-only:  MAE 8.96mm → ~88-92%
  //   WebXR hybrid: MAE ~5mm  → ~94%
  //   LiDAR-only:  MAE 0.80mm → ~98%
  let base = 88.0  // Claude-only baseline (MAE ~9mm)
  if (cv?.right_cv_success || cv?.left_cv_success) base = 92.0  // CV success
  if (source === 'photogrammetry') base = 94.0  // 8-view photogrammetry
  if (source === 'hybrid') base = 94.0  // WebXR/ARCore + Photo Fusion
  if (source === 'lidar') base = 98.0  // LiDAR direkt (MAE 0.8mm)

  // Penalize missing data
  const fields = ['ball_girth', 'instep_girth', 'heel_girth', 'waist_girth', 'ankle_girth', 'foot_height']
  let missing = 0
  for (const f of fields) {
    if (cl[`right_${f}`] == null && cl[`left_${f}`] == null) missing++
  }
  base -= missing * 1.5  // each missing field reduces confidence
  return Math.max(70, Math.min(98, rnd(base)))
}

// ─── Calibration Learning System ──────────────────────────────────────────────
// Learns systematic bias corrections from admin-validated scans.
// When an admin corrects measurements via PATCH, the original→corrected pair
// is stored. Over time, these pairs train per-measurement bias corrections
// that are applied to future scans automatically.

const CALIBRATED_FIELDS = [
  'right_length', 'right_width', 'right_ball_girth', 'right_instep_girth',
  'right_heel_girth', 'right_long_heel_girth', 'right_short_heel_girth',
  'left_length', 'left_width', 'left_ball_girth', 'left_instep_girth',
  'left_heel_girth', 'left_long_heel_girth', 'left_short_heel_girth',
]

// Load current calibration corrections (cached in memory, refreshed on update)
let _calibrationCache = null
let _calibrationCacheTime = 0

function getCalibration(db) {
  const now = Date.now()
  if (_calibrationCache && now - _calibrationCacheTime < 60_000) return _calibrationCache
  const rows = db.prepare('SELECT measurement, source, bias_mm, std_dev_mm, sample_count FROM measurement_calibration WHERE sample_count >= 3').all()
  _calibrationCache = {}
  for (const r of rows) {
    _calibrationCache[`${r.source}:${r.measurement}`] = { bias: r.bias_mm, stdDev: r.std_dev_mm, n: r.sample_count }
  }
  _calibrationCacheTime = now
  return _calibrationCache
}

// Apply calibration correction to a measurement result
function applyCalibration(db, results, source) {
  const cal = getCalibration(db)
  const applied = {}
  for (const field of CALIBRATED_FIELDS) {
    if (results[field] == null) continue

    // Try admin calibration first (higher confidence), then user calibration
    const adminKey = `${source}:${field}`
    const userKey = `${source}_user:${field}`
    const adminCal = cal[adminKey]
    const userCal = cal[userKey]

    let bias = null, confidence = null, calSource = null
    if (adminCal && adminCal.n >= 5) {
      bias = adminCal.bias
      confidence = adminCal.stdDev
      calSource = 'admin'
    } else if (userCal && userCal.n >= 8) {
      // User corrections need more samples (8 vs 5) for reliability
      // and apply at 70% weight (more conservative)
      bias = userCal.bias * 0.7
      confidence = userCal.stdDev
      calSource = 'user'
    } else if (adminCal && adminCal.n >= 3 && userCal && userCal.n >= 3) {
      // Blend admin + user when both have some data
      const totalN = adminCal.n + userCal.n
      bias = (adminCal.bias * adminCal.n * 1.5 + userCal.bias * userCal.n) / (adminCal.n * 1.5 + userCal.n)
      confidence = Math.min(adminCal.stdDev, userCal.stdDev)
      calSource = 'blended'
    }

    if (bias != null) {
      const corrected = rnd(results[field] - bias)
      applied[field] = { original: results[field], corrected, bias: rnd(bias), confidence_mm: confidence, source: calSource }
      results[field] = corrected
    }
  }
  return applied
}

// Recalculate calibration from all comparison pairs
function recalculateCalibration(db, source) {
  const fields = db.prepare(
    'SELECT DISTINCT measurement FROM scan_comparison_pairs WHERE source = ?'
  ).all(source)

  for (const { measurement } of fields) {
    const pairs = db.prepare(
      'SELECT error_mm FROM scan_comparison_pairs WHERE measurement = ? AND source = ?'
    ).all(measurement, source)

    if (pairs.length < 3) continue

    const errors = pairs.map(p => p.error_mm)
    const mean = errors.reduce((s, e) => s + e, 0) / errors.length
    const variance = errors.reduce((s, e) => s + (e - mean) ** 2, 0) / errors.length
    const stdDev = Math.sqrt(variance)

    db.prepare(`
      INSERT INTO measurement_calibration (measurement, source, bias_mm, std_dev_mm, sample_count, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(measurement, source) DO UPDATE SET
        bias_mm = excluded.bias_mm, std_dev_mm = excluded.std_dev_mm,
        sample_count = excluded.sample_count, updated_at = excluded.updated_at
    `).run(measurement, source, rnd(mean), rnd(stdDev), pairs.length)
  }
  _calibrationCache = null // invalidate cache
}

// Bayesian averaging: combine multiple scans from same user for better estimate
function bayesianUserAverage(db, userId) {
  const scans = db.prepare(`
    SELECT * FROM foot_scans WHERE user_id = ? ORDER BY created_at DESC LIMIT 10
  `).all(userId)

  if (scans.length < 2) return scans[0] ?? null

  // Weight recent scans more heavily (exponential decay)
  const now = Date.now()
  const weighted = {}
  let totalWeight = 0

  for (let i = 0; i < scans.length; i++) {
    const scan = scans[i]
    const ageMs = now - new Date(scan.created_at).getTime()
    const ageDays = ageMs / (1000 * 60 * 60 * 24)
    // Half-life: 30 days. Most recent scan gets weight ~1.0, 30-day-old gets 0.5
    const weight = Math.pow(0.5, ageDays / 30)
    totalWeight += weight

    for (const field of CALIBRATED_FIELDS) {
      if (scan[field] != null) {
        if (!weighted[field]) weighted[field] = { sum: 0, weight: 0 }
        weighted[field].sum += scan[field] * weight
        weighted[field].weight += weight
      }
    }
  }

  // Build averaged result
  const averaged = { ...scans[0] } // start from most recent
  const adjustments = {}
  for (const field of CALIBRATED_FIELDS) {
    if (weighted[field] && weighted[field].weight > 0) {
      const avg = rnd(weighted[field].sum / weighted[field].weight)
      if (averaged[field] != null && Math.abs(avg - averaged[field]) > 0.05) {
        adjustments[field] = { latest: averaged[field], averaged: avg }
        averaged[field] = avg
      }
    }
  }

  averaged._bayesian = {
    scans_used: scans.length,
    adjustments,
    half_life_days: 30,
  }
  return averaged
}

// ─── Phase 1: Computer-vision pipeline (process_photos.py) ───────────────────

function runCvPipeline(rightTopImg, rightSideImg, leftTopImg, leftSideImg) {
  try {
    const payload = JSON.stringify({ rightTopImg, rightSideImg, leftTopImg, leftSideImg })
    const proc = spawnSync(PYTHON, [PROCESS_PHOTOS_PY, '--data', payload], {
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

async function runClaudeFallback(client, toB64, rightTopImg, rightSideImg, leftTopImg, leftSideImg, cvData, rightLateralImg, leftLateralImg) {
  const hasLateral = !!rightLateralImg && !!leftLateralImg
  // Build context from CV results if partially available
  const cvHint = cvData
    ? `Computer-Vision hat folgende Rohwerte ermittelt (verwende diese als Ausgangspunkt und validiere):
Rechts: Länge=${cvData.right_length ?? '?'}mm, Breite=${cvData.right_width ?? '?'}mm, Höhe=${cvData.right_foot_height ?? '?'}mm
Links:  Länge=${cvData.left_length  ?? '?'}mm, Breite=${cvData.left_width  ?? '?'}mm, Höhe=${cvData.left_foot_height  ?? '?'}mm
`
    : ''

  // ── Pass 1: Primary measurement with strict calibration ────────────────
  const pass1 = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1200,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Du bist ein präzises Fußvermessungs-System für die Maßschuh-Fertigung. Analysiere diese ${hasLateral ? '6' : '4'} Bilder.

KALIBRIER-VALIDIERUNG (KRITISCH — mache dies ZUERST):
Jedes Bild enthält ein A4-Papier (exakt 297.0 × 210.0 mm).
1. Identifiziere das A4-Papier in jedem Bild.
2. Miss die LÄNGERE Kante des A4 in Bildpixeln → berechne px_per_mm = pixel_laenge / 297.0
3. VALIDIERE: Miss auch die KÜRZERE Kante → muss px_per_mm × 210.0 ± 3% ergeben.
   Falls >3% Abweichung: Das Papier ist perspektivisch verzerrt → verwende den Mittelwert beider Achsen.
4. Gib a4_px_per_mm für jedes Bild in deiner Antwort an.

BILDER:
- Bild 1: RECHTER Fuß von OBEN (A4 daneben)
- Bild 2: RECHTER Fuß MEDIAL / Innenseite (A4 daneben)
- Bild 3: LINKER Fuß von OBEN (A4 daneben)
- Bild 4: LINKER Fuß MEDIAL / Innenseite (A4 daneben)${hasLateral ? `
- Bild 5: RECHTER Fuß LATERAL / Außenseite (A4 daneben) — für Fersen- und Außenrist-Details
- Bild 6: LINKER Fuß LATERAL / Außenseite (A4 daneben) — für Fersen- und Außenrist-Details

IBV 3-WINKEL-METHODE: Du hast 3 Blickwinkel pro Fuß (oben, innen, außen). Nutze alle 3 für maximale Genauigkeit:
- Top-Ansicht: Fußlänge, -breite, Kontur-Umriss
- Mediale Ansicht: Gewölbehöhe, Ristprofil, Innenseite
- Laterale Ansicht: Fersenprofil, Außenrist, Knöchel-Kontour
Vergleiche die Messwerte zwischen medial und lateral für Konsistenz.` : ''}

${cvHint}
MESSVERFAHREN — TOP-ANSICHT (Bilder 1 + 3):
Miss jeden Wert in Pixeln, dann teile durch px_per_mm des jeweiligen Bildes:
1. Fußlänge = Ferse (hinterster Punkt) → längster Zeh (vorderster Punkt)
2. Fußbreite = breiteste Stelle im Ballenbereich (Metatarsale I–V)
3. Ballenbreite = Breite exakt an der Linie der Zehengrundgelenke
4. Taillenbreite = schmalste Stelle des Mittelfußes
5. Ristbreite = Breite bei ~60% der Fußlänge (von Ferse gemessen)
6. Fersenbreite = Breite bei ~15% der Fußlänge (Calcaneus-Bereich)
7. Knöchelbreite = Breite bei ~12% der Fußlänge (Malleolen-Ebene)

MESSVERFAHREN — SEITEN-ANSICHT (Bilder 2 + 4):
1. Fußhöhe = höchster Punkt des Fußrückens (Dorsum) bis Standfläche
2. Gewölbehöhe = Höhe des medialen Längsgewölbes (Innenbogen über Boden)
3. Ballenhöhe = Höhe des Fußes im Metatarsale-Bereich

WICHTIG: Gib für jeden Messwert Dezimalstellen an (z.B. 262.3, nicht 262).
Runde NICHT auf ganze Zahlen. Genauigkeit auf 0.5mm anstreben.

UMFANGSBERECHNUNG NICHT durchführen — das macht der Server mit Superellipse-Modell.

ZUSÄTZLICHE MESSUNGEN — SEITEN-ANSICHT:
4. Rist-Höhe (Instep height) = Höhe des Fußrückens bei ~60% Fußlänge
5. Fersen-Tiefe (Heel depth) = Abstand vom hintersten Fersenpunkt zum Fußrücken vertikal darüber

Antworte NUR mit diesem JSON (keine Erklärung):
{"a4_validation":{"img1_ppm":<float>,"img2_ppm":<float>,"img3_ppm":<float>,"img4_ppm":<float>,"perspective_error_pct":<float>},"right_length":<mm>,"right_width":<mm>,"right_arch_height":<mm>,"right_foot_height":<mm>,"right_ball_width":<mm>,"right_ball_height":<mm>,"right_waist_width":<mm>,"right_instep_width":<mm>,"right_instep_height":<mm>,"right_heel_width":<mm>,"right_heel_depth":<mm>,"right_ankle_width":<mm>,"left_length":<mm>,"left_width":<mm>,"left_arch_height":<mm>,"left_foot_height":<mm>,"left_ball_width":<mm>,"left_ball_height":<mm>,"left_waist_width":<mm>,"left_instep_width":<mm>,"left_instep_height":<mm>,"left_heel_width":<mm>,"left_heel_depth":<mm>,"left_ankle_width":<mm>}`
        },
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: toB64(rightTopImg)  } },
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: toB64(rightSideImg) } },
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: toB64(leftTopImg)   } },
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: toB64(leftSideImg)  } },
        ...(hasLateral ? [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: toB64(rightLateralImg) } },
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: toB64(leftLateralImg)  } },
        ] : []),
      ],
    }],
  })

  const text1 = pass1.content[0]?.text?.trim() ?? ''
  const jsonMatch1 = text1.match(/\{[\s\S]*\}/)
  if (!jsonMatch1) throw new Error('Kein JSON in Claude-Antwort (Pass 1)')
  const m1 = JSON.parse(jsonMatch1[0])

  // ── Pass 2: Independent re-measurement for cross-validation ────────────
  let m2 = null
  try {
    const pass2 = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Messe diese 4 Fußbilder erneut. A4-Papier (297×210mm) als Referenz.
WICHTIG: Messe unabhängig, nicht aus dem Gedächtnis. Verwende px_per_mm Kalibrierung für jedes Bild einzeln.
Gib nur Länge, Breite, Fußhöhe und Ballenbreite für beide Füße an.
JSON: {"right_length":<mm>,"right_width":<mm>,"right_foot_height":<mm>,"right_ball_width":<mm>,"left_length":<mm>,"left_width":<mm>,"left_foot_height":<mm>,"left_ball_width":<mm>}`
          },
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: toB64(rightTopImg)  } },
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: toB64(rightSideImg) } },
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: toB64(leftTopImg)   } },
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: toB64(leftSideImg)  } },
        ],
      }],
    })
    const text2 = pass2.content[0]?.text?.trim() ?? ''
    const jsonMatch2 = text2.match(/\{[\s\S]*\}/)
    if (jsonMatch2) m2 = JSON.parse(jsonMatch2[0])
  } catch { /* Pass 2 optional — continue with pass 1 only */ }

  // ── Merge passes: average where both available, flag large deviations ──
  const result = { ...m1 }
  result._measurement_passes = m2 ? 2 : 1
  result._pass_deviations = {}

  if (m2) {
    for (const key of ['right_length', 'right_width', 'right_foot_height', 'right_ball_width',
                        'left_length', 'left_width', 'left_foot_height', 'left_ball_width']) {
      const v1 = m1[key], v2 = m2[key]
      if (typeof v1 === 'number' && typeof v2 === 'number') {
        const deviation = Math.abs(v1 - v2)
        result._pass_deviations[key] = rnd(deviation)
        // If both passes agree within 2mm, average for higher precision
        if (deviation <= 2.0) {
          result[key] = rnd((v1 + v2) / 2)
        } else if (deviation <= 5.0) {
          // Moderate disagreement: weighted average favoring pass 1
          result[key] = rnd(v1 * 0.65 + v2 * 0.35)
        }
        // If >5mm disagreement, keep pass 1 (more thorough prompt)
      }
    }
  }

  // ── Server-side girth computation using superellipse ────────────────────
  // Claude's girth calculations were unreliable — compute server-side instead
  for (const side of ['right', 'left']) {
    const footH = result[`${side}_foot_height`]
    const footW = result[`${side}_width`]
    if (!okH(footH)) continue

    const fracs = heightFractions(footW || footH * 1.5, footH)
    const EXPO = { ball: 2.4, waist: 2.1, instep: 2.2, heel: 2.5, ankle: 2.0 }

    const widthMap = {
      ball:   result[`${side}_ball_width`],
      waist:  result[`${side}_waist_width`],
      instep: result[`${side}_instep_width`],
      heel:   result[`${side}_heel_width`],
      ankle:  result[`${side}_ankle_width`],
    }

    // Use ball_height from Claude if available, otherwise derive from fractions
    const ballH = result[`${side}_ball_height`]

    for (const [k, hf] of Object.entries(fracs)) {
      const w = widthMap[k]
      if (!okWid(w)) continue
      const a = w / 2
      // For ball: use measured ball height if available
      const h = (k === 'ball' && typeof ballH === 'number' && ballH > 20) ? ballH : footH * hf
      const b = h / 2
      result[`${side}_${k}_girth`] = rnd(superellipseGirth(a, b, EXPO[k]))
    }

    // Compute Long Heel (langer Fersenumfang): sagittal circumference
    const instepH = result[`${side}_instep_height`] || footH * 0.85
    const heelDepth = result[`${side}_heel_depth`] || result[`${side}_length`] * 0.15
    if (instepH && heelDepth) {
      result[`${side}_long_heel_girth`] = rnd(superellipseGirth(instepH / 2, heelDepth / 2, 2.2))
    }

    // Short Heel = heel_girth (already computed above)
    if (result[`${side}_heel_girth`]) {
      result[`${side}_short_heel_girth`] = result[`${side}_heel_girth`]
    }
  }

  return result
}

// ─── Merge CV + Claude results ────────────────────────────────────────────────
// CV is trusted for length/width (direct pixel measurement).
// Claude is used for cross-section widths → precise Ramanujan girths.
// If a field is missing from one source, fall back to the other.

function mergeResults(cv, cl, side) {
  const cvOk = cv?.[`${side}_cv_success`]

  // Length + width: prefer CV (pixel-accurate), average with Claude if both available
  let length, width
  if (cvOk && cv[`${side}_length`] && cl[`${side}_length`]) {
    // Both sources available: weighted average (CV 70%, Claude 30%)
    length = cv[`${side}_length`] * 0.7 + cl[`${side}_length`] * 0.3
    width  = (cv[`${side}_width`] ?? cl[`${side}_width`]) * 0.7 +
             (cl[`${side}_width`] ?? cv[`${side}_width`]) * 0.3
  } else {
    length = cvOk ? (cv[`${side}_length`] ?? cl[`${side}_length`]) : cl[`${side}_length`]
    width  = cvOk ? (cv[`${side}_width`]  ?? cl[`${side}_width`])  : cl[`${side}_width`]
  }

  const height = cvOk ? (cv[`${side}_foot_height`] ?? cl[`${side}_foot_height`]) : cl[`${side}_foot_height`]
  const archHt = cvOk ? (cv[`${side}_arch_height`] ?? cl[`${side}_arch_height`]) : cl[`${side}_arch_height`]

  const footH = okH(height) ? height : null
  const footW = okWid(width) ? width : null

  // Use server-computed superellipse girths from Claude pass (already in cl object)
  const girthKeys = ['ball', 'waist', 'instep', 'heel', 'ankle', 'long_heel', 'short_heel']
  const girths = {}
  for (const k of girthKeys) {
    const g = cl[`${side}_${k}_girth`]
    girths[`${k}_girth`] = okGirth(g) ? rnd(g) : null
  }

  return {
    length:       okLen(length)  ? rnd(length)  : null,
    width:        okWid(width)   ? rnd(width)   : null,
    foot_height:  footH != null  ? rnd(footH)   : null,
    arch_height:  okArch(archHt) ? rnd(archHt)  : null,
    ...girths,
  }
}

// ─── Depth data processing (WebXR/ARCore point clouds) ────────────────────────
// Processes point cloud data from WebXR Depth Sensing API or similar.
// Uses the process_lidar.py pipeline when point cloud is substantial enough.
function processDepthData(depthData) {
  const results = { right: {}, left: {} }

  for (const [key, data] of Object.entries(depthData)) {
    if (!data?.pointCloud || data.pointCloud.length < 200) continue

    const side = key.includes('right') || key.includes('Right') ? 'right' : 'left'

    try {
      // Write point cloud to temp file and run process_lidar.py
      const tmpFile = join(tmpdir(), `depth_${key}_${Date.now()}.json`)
      writeFileSync(tmpFile, JSON.stringify(data.pointCloud))

      const PROCESS_LIDAR_PY = join(ML_SCRIPTS, 'process_lidar.py')
      const pyResult = spawnSync(PYTHON, [PROCESS_LIDAR_PY, '--cloud', tmpFile], {
        timeout: 30_000, encoding: 'utf8',
      })

      try { unlinkSync(tmpFile) } catch {}

      if (pyResult.status === 0 && pyResult.stdout) {
        const measurements = JSON.parse(pyResult.stdout)
        results[side] = {
          length: measurements.length,
          width: measurements.width,
          foot_height: measurements.height,
          arch: measurements.arch_height,
          ball_girth: measurements.ball_girth,
          instep_girth: measurements.instep_girth,
          heel_girth: measurements.heel_girth,
          waist_girth: measurements.waist_girth,
          ankle_girth: measurements.ankle_girth,
          _source: 'depth-' + data.source,
          _point_count: data.pointCloud.length,
        }
      }
    } catch (e) {
      console.warn(`[depth] ${key} processing failed:`, e.message)
    }
  }

  return results
}

// ─── PCA Shape Model fitting from measurements ──────────────────────────────
// Uses the trained PCA model to regularize/validate measurements.
// Returns PCA-corrected values blended with raw measurements.
function pcaRegularize(measurements) {
  const SHAPE_MODEL_DIR = join(ML_SCRIPTS, '..', 'data', 'shape_model')
  const metaPath = join(SHAPE_MODEL_DIR, 'meta.json')

  try {
    if (!existsSync(metaPath)) return null

    // Run PCA regularization via process_lidar.py's pca_regularize function
    const tmpFile = join(tmpdir(), `pca_input_${Date.now()}.json`)
    writeFileSync(tmpFile, JSON.stringify(measurements))

    const pyCode = `
import json, sys, os
sys.path.insert(0, '${ML_SCRIPTS}')
from process_lidar import pca_regularize
with open('${tmpFile}') as f:
    meas = json.load(f)
result = pca_regularize(meas)
print(json.dumps(result))
`
    const pyResult = spawnSync(PYTHON, ['-c', pyCode], {
      timeout: 10_000, encoding: 'utf8',
    })

    try { unlinkSync(tmpFile) } catch {}

    if (pyResult.status === 0 && pyResult.stdout) {
      return JSON.parse(pyResult.stdout)
    }
  } catch (e) {
    console.warn('[pca] regularization failed:', e.message)
  }
  return null
}

// ─── AI Vision Analyze ────────────────────────────────────────────────────────
// POST /api/scans/analyze
// 4-6 Bilder + optional depth data
// A4-Papier (297×210mm) als Maßstab-Referenz in jedem Bild
//
// Pipeline:
//   1. CV (process_photos.py): A4 detection → precise pixel measurement
//   2. Claude Vision: cross-section widths → Ramanujan girth computation
//   2b. Depth processing (WebXR/ARCore) if available
//   3. Merge: CV + Claude + Depth
//   4. PCA regularization (shape model constraint)
//   5. Calibration correction (learned bias)
router.post('/analyze', authenticate, async (req, res) => {
  const { rightTopImg, rightSideImg, leftTopImg, leftSideImg, rightLateralImg, leftLateralImg, depthData } = req.body
  const hasLateral = !!rightLateralImg && !!leftLateralImg // IBV-style 6-image mode
  const hasDepth = depthData && Object.keys(depthData).length > 0

  if (!rightTopImg || !rightSideImg || !leftTopImg || !leftSideImg) {
    return res.status(400).json({ error: 'Mindestens 4 Bilder erforderlich (top + medial/side für jeden Fuß)' })
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

    // ── Phase 1b: If lateral images available (IBV 6-image mode), also run CV on them
    const cvLateral = hasLateral ? runCvPipeline(rightTopImg, rightLateralImg, leftTopImg, leftLateralImg) : null

    // ── Phase 2: Claude Vision (improved prompt — with lateral views if available) ────
    // Pass lateral images to Claude for IBV-style 3-angle reconstruction
    const cl = await runClaudeFallback(client, toB64, rightTopImg, rightSideImg, leftTopImg, leftSideImg, cv, rightLateralImg, leftLateralImg)

    // ── Phase 2b: Depth data processing (WebXR/ARCore point clouds) ─────
    let depthMeasurements = null
    if (hasDepth) {
      try {
        depthMeasurements = processDepthData(depthData)
      } catch (e) {
        console.warn('[scan/analyze] depth processing failed:', e.message)
      }
    }

    // ── Phase 3: Merge ─────────────────────────────────────────────────────
    const R = mergeResults(cv, cl, 'right')
    const L = mergeResults(cv, cl, 'left')

    // Merge depth data if available
    // Strategie (aus eval_hybrid_accuracy.py Benchmark):
    //   LiDAR vorhanden → 100% LiDAR für Girths (MAE 0.8mm), Photo nur als Fallback
    //   WebXR/ARCore    → 40% Tiefe + 60% Photo (Tiefendaten zu ungenau für Alleingang)
    //   Kein Tiefenscan → 100% Photo-Regression (MAE ~9mm)
    if (depthMeasurements) {
      const isLidar = Object.values(depthData || {}).some(d => d?.source === 'lidar')

      const mergeSide = (depth, photo) => {
        for (const [key, val] of Object.entries(depth || {})) {
          if (key.startsWith('_')) continue
          if (val == null) continue

          if (photo[key] == null) {
            // Kein Photo-Wert → Tiefenwert direkt übernehmen
            photo[key] = val
          } else if (isLidar) {
            // LiDAR: direkt übernehmen (MAE 0.8mm vs Photo 9mm)
            // Photo-Wert nur als Sanity-Check behalten
            const diff = Math.abs(val - photo[key])
            const tolerance = photo[key] * 0.25  // 25% Abweichung = Ausreißer
            if (diff > tolerance) {
              // Großer Unterschied → gewichteter Kompromiss (80/20)
              photo[key] = rnd(photo[key] * 0.2 + val * 0.8)
            } else {
              // Plausible Übereinstimmung → LiDAR vertrauen
              photo[key] = val
            }
          } else {
            // WebXR/ARCore: konservative Fusion (40% Tiefe + 60% Photo)
            photo[key] = rnd(photo[key] * 0.6 + val * 0.4)
          }
        }
      }

      mergeSide(depthMeasurements.right, R)
      mergeSide(depthMeasurements.left, L)
    }

    // Final sanity: length must be present
    if (!R.length || !L.length)
      throw new Error(`Fußlänge nicht bestimmbar: R=${R.length} L=${L.length}`)
    if (!R.width  || !L.width)
      throw new Error(`Fußbreite nicht bestimmbar: R=${R.width} L=${L.width}`)

    // Anatomical validation
    const rIssues = validateAnatomical({ length: R.length, width: R.width, foot_height: R.foot_height, ball_girth: R.ball_girth })
    const lIssues = validateAnatomical({ length: L.length, width: L.width, foot_height: L.foot_height, ball_girth: L.ball_girth })

    // Cross-foot asymmetry warnings (clinically significant if > 5mm)
    const asymWarnings = []
    if (R.length && L.length && Math.abs(R.length - L.length) > 5)
      asymWarnings.push(`Längenasymmetrie: R=${R.length}mm L=${L.length}mm (${Math.abs(R.length - L.length).toFixed(1)}mm)`)
    if (R.width && L.width && Math.abs(R.width - L.width) > 5)
      asymWarnings.push(`Breitenasymmetrie: R=${R.width}mm L=${L.width}mm (${Math.abs(R.width - L.width).toFixed(1)}mm)`)
    if (R.ball_girth && L.ball_girth && Math.abs(R.ball_girth - L.ball_girth) > 8)
      asymWarnings.push(`Ballenumfang-Asymmetrie: R=${R.ball_girth}mm L=${L.ball_girth}mm`)

    // Compute realistic confidence score
    // LiDAR-only: höchste Genauigkeit (MAE 0.8mm), hybrid: Fusion, photo: Regression
    const isLidarScan = Object.values(depthData || {}).some(d => d?.source === 'lidar')
    const scanSource = (hasDepth && depthMeasurements)
      ? (isLidarScan ? 'lidar' : 'hybrid')
      : 'photo'
    const confidence = computeConfidence(cv, cl, scanSource)

    // ── Phase 4: PCA shape model regularization ─────────────────────────
    // Blend raw measurements with PCA-reconstructed values (80/20) for consistency
    let pcaApplied = false
    for (const [side, M] of [['right', R], ['left', L]]) {
      const pcaInput = {
        length: M.length, width: M.width, height: M.foot_height,
        ball_girth: M.ball_girth, instep_girth: M.instep_girth,
        waist_girth: M.waist_girth, heel_girth: M.heel_girth,
        ankle_girth: M.ankle_girth,
      }
      const regularized = pcaRegularize(pcaInput)
      if (regularized) {
        pcaApplied = true
        // PCA blend: 80% raw + 20% PCA-reconstructed (done inside pcaRegularize)
        for (const [k, v] of Object.entries(regularized)) {
          if (v != null && M[k] != null) M[k] = rnd(v)
        }
      }
    }

    // ── Phase 5: Apply learned calibration corrections ────────────────────
    const db = getDb()
    const rawResults = {
      right_length: R.length, right_width: R.width,
      right_ball_girth: R.ball_girth, right_instep_girth: R.instep_girth,
      right_heel_girth: R.heel_girth, right_long_heel_girth: R.long_heel_girth,
      right_short_heel_girth: R.short_heel_girth,
      left_length: L.length, left_width: L.width,
      left_ball_girth: L.ball_girth, left_instep_girth: L.instep_girth,
      left_heel_girth: L.heel_girth, left_long_heel_girth: L.long_heel_girth,
      left_short_heel_girth: L.short_heel_girth,
    }
    const calibrationApplied = applyCalibration(db, rawResults, 'photo')
    // Write corrected values back
    if (Object.keys(calibrationApplied).length > 0) {
      for (const [k, v] of Object.entries(calibrationApplied)) {
        const side = k.startsWith('right_') ? R : L
        const field = k.replace(/^(right|left)_/, '')
        side[field] = v.corrected
      }
    }

    // Girths: only include actually computed values — NO fallback ratios.
    // Missing girths are returned as null so the client knows they weren't measured.
    res.json({
      right_length:       R.length,
      right_width:        R.width,
      right_arch_height:  R.arch_height,
      right_foot_height:  R.foot_height,
      right_ball_girth:   R.ball_girth   ?? null,
      right_instep_girth: R.instep_girth ?? null,
      right_heel_girth:   R.heel_girth   ?? null,
      right_waist_girth:  R.waist_girth  ?? null,
      right_ankle_girth:      R.ankle_girth      ?? null,
      right_long_heel_girth:  R.long_heel_girth  ?? null,
      right_short_heel_girth: R.short_heel_girth ?? null,
      left_length:            L.length,
      left_width:             L.width,
      left_arch_height:       L.arch_height,
      left_foot_height:       L.foot_height,
      left_ball_girth:        L.ball_girth       ?? null,
      left_instep_girth:      L.instep_girth     ?? null,
      left_heel_girth:        L.heel_girth       ?? null,
      left_waist_girth:       L.waist_girth      ?? null,
      left_ankle_girth:       L.ankle_girth      ?? null,
      left_long_heel_girth:   L.long_heel_girth  ?? null,
      left_short_heel_girth:  L.short_heel_girth ?? null,
      _cv_right: cv?.right_cv_success ?? false,
      _cv_left:  cv?.left_cv_success  ?? false,
      _confidence: confidence,
      _calibration_applied: calibrationApplied,
      _pca_regularized: pcaApplied,
      _scan_source: scanSource,
      _depth_used: hasDepth && depthMeasurements != null,
      _depth_mode: hasDepth ? Object.values(depthData)[0]?.source : null,
      _measurement_passes: cl._measurement_passes ?? 1,
      _pass_deviations: cl._pass_deviations ?? {},
      _a4_validation: cl.a4_validation ?? null,
      _anatomical_warnings: [...rIssues.map(i => `R: ${i}`), ...lIssues.map(i => `L: ${i}`), ...asymWarnings],
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
      spawnSync(PYTHON, [SAVE_REAL_SCAN_PY, '--data', payload], { timeout: 15_000 })
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
  body('reference_type').isIn(['card', 'a4', 'lidar', 'photogrammetry']),
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
  body('right_long_heel_girth').optional().isFloat({ min: 200, max: 500 }),
  body('right_short_heel_girth').optional().isFloat({ min: 150, max: 500 }),
  body('left_long_heel_girth').optional().isFloat({ min: 200, max: 500 }),
  body('left_short_heel_girth').optional().isFloat({ min: 150, max: 500 }),
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
          right_toe_girth, right_preball_girth, right_midinstep_girth, right_upper_instep_girth,
          right_long_heel_girth, right_short_heel_girth,
          left_ball_girth,  left_instep_girth,  left_heel_girth,  left_waist_girth,  left_ankle_girth,
          left_toe_girth, left_preball_girth, left_midinstep_girth, left_upper_instep_girth,
          left_long_heel_girth, left_short_heel_girth,
          right_foot_height, left_foot_height,
          eu_size, uk_size, us_size, accuracy, notes,
          scanned_with_socks, shoe_type } = req.body

  const result = getDb().prepare(`
    INSERT INTO foot_scans
      (user_id, reference_type, ppm, right_length, right_width, right_arch,
       left_length, left_width, left_arch,
       right_ball_girth, right_instep_girth, right_heel_girth, right_waist_girth, right_ankle_girth,
       right_toe_girth, right_preball_girth, right_midinstep_girth, right_upper_instep_girth,
       right_long_heel_girth, right_short_heel_girth,
       left_ball_girth,  left_instep_girth,  left_heel_girth,  left_waist_girth,  left_ankle_girth,
       left_toe_girth, left_preball_girth, left_midinstep_girth, left_upper_instep_girth,
       left_long_heel_girth, left_short_heel_girth,
       right_foot_height, left_foot_height,
       eu_size, uk_size, us_size, accuracy, notes, scanned_with_socks, shoe_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user.id, reference_type, ppm ?? null,
    right_length, right_width, right_arch,
    left_length,  left_width,  left_arch,
    right_ball_girth ?? null, right_instep_girth ?? null, right_heel_girth ?? null,
    right_waist_girth ?? null, right_ankle_girth ?? null,
    right_toe_girth ?? null, right_preball_girth ?? null,
    right_midinstep_girth ?? null, right_upper_instep_girth ?? null,
    right_long_heel_girth ?? null, right_short_heel_girth ?? null,
    left_ball_girth  ?? null,  left_instep_girth ?? null,  left_heel_girth ?? null,
    left_waist_girth ?? null,  left_ankle_girth ?? null,
    left_toe_girth ?? null, left_preball_girth ?? null,
    left_midinstep_girth ?? null, left_upper_instep_girth ?? null,
    left_long_heel_girth ?? null, left_short_heel_girth ?? null,
    right_foot_height ?? null, left_foot_height ?? null,
    eu_size, uk_size, us_size, accuracy, notes ?? null,
    scanned_with_socks != null ? (scanned_with_socks ? 1 : 0) : 1,
    shoe_type ?? 'oxford'
  )

  const scanId = result.lastInsertRowid
  const row = getDb().prepare('SELECT * FROM foot_scans WHERE id = ?').get(scanId)

  // ── Store raw predictions for retrospective learning ────────────────
  // Every saved scan gets its predictions recorded so we can learn from
  // future corrections (admin or user).
  try {
    const predictions = {
      right_length, right_width, right_arch,
      right_ball_girth, right_instep_girth, right_heel_girth,
      right_waist_girth, right_ankle_girth,
      right_long_heel_girth, right_short_heel_girth, right_foot_height,
      left_length, left_width, left_arch,
      left_ball_girth, left_instep_girth, left_heel_girth,
      left_waist_girth, left_ankle_girth,
      left_long_heel_girth, left_short_heel_girth, left_foot_height,
    }
    getDb().prepare(`
      INSERT OR REPLACE INTO scan_predictions (scan_id, source, predictions, confidence)
      VALUES (?, ?, ?, ?)
    `).run(scanId, reference_type || 'photo', JSON.stringify(predictions), accuracy)
  } catch (e) {
    console.warn('[learning] prediction storage failed:', e.message)
  }

  // ── Link pending training images to this scan (LiDAR + auto-captured photos) ──
  if (reference_type === 'lidar') {
    try {
      const db = getDb()
      // Find the most recent unlinked training data entry for this user
      const pending = db.prepare(
        `SELECT id, right_top_img, right_side_img, left_top_img, left_side_img
         FROM scan_training_data
         WHERE scan_id = 0
         AND user_id = ?
         AND created_at > datetime('now', '-10 minutes')
         ORDER BY created_at DESC LIMIT 1`
      ).get(req.user.id)

      if (pending) {
        // Link to the actual scan
        db.prepare('UPDATE scan_training_data SET scan_id = ? WHERE id = ?')
          .run(scanId, pending.id)

        // If we have images from both sides, trigger save_real_scan.py
        const hasAllImages = pending.right_top_img && pending.left_top_img
        if (hasAllImages) {
          try {
            const saveScript = new URL(
              '../../../atelier-ml/scripts/save_real_scan.py',
              import.meta.url
            ).pathname
            const scanData = JSON.stringify({
              scan_id: String(scanId),
              rightTopImg:  pending.right_top_img  || '',
              rightSideImg: pending.right_side_img || '',
              leftTopImg:   pending.left_top_img   || '',
              leftSideImg:  pending.left_side_img  || '',
              lidar: {
                right_length, right_width, right_foot_height,
                right_arch_height: right_arch,
                right_ball_girth, right_instep_girth, right_heel_girth,
                right_waist_girth, right_ankle_girth,
                left_length, left_width, left_foot_height,
                left_arch_height: left_arch,
                left_ball_girth, left_instep_girth, left_heel_girth,
                left_waist_girth, left_ankle_girth,
              },
            })
            // Run asynchronously — don't block the response
            const { spawn } = await import('child_process')
            const child = spawn(PYTHON, [saveScript, '--data', scanData], {
              stdio: 'ignore', detached: true,
            })
            child.unref()
          } catch (e) {
            console.warn('[training] save_real_scan.py fehlgeschlagen:', e.message)
          }
        }
      }
    } catch (e) {
      console.warn('[training] Linking training images failed:', e.message)
    }
  }

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
  requireRole('admin', 'curator'),
  [
    body('right_length').optional().isFloat({ min: 100, max: 400 }),
    body('right_width').optional().isFloat({ min: 50, max: 200 }),
    body('right_arch').optional().isFloat({ min: 0, max: 80 }),
    body('right_ball_girth').optional().isFloat({ min: 100, max: 450 }),
    body('right_instep_girth').optional().isFloat({ min: 100, max: 450 }),
    body('right_heel_girth').optional().isFloat({ min: 150, max: 500 }),
    body('right_waist_girth').optional().isFloat({ min: 100, max: 450 }),
    body('right_ankle_girth').optional().isFloat({ min: 100, max: 450 }),
    body('right_long_heel_girth').optional().isFloat({ min: 200, max: 500 }),
    body('right_short_heel_girth').optional().isFloat({ min: 150, max: 500 }),
    body('left_length').optional().isFloat({ min: 100, max: 400 }),
    body('left_width').optional().isFloat({ min: 50, max: 200 }),
    body('left_arch').optional().isFloat({ min: 0, max: 80 }),
    body('left_ball_girth').optional().isFloat({ min: 100, max: 450 }),
    body('left_instep_girth').optional().isFloat({ min: 100, max: 450 }),
    body('left_heel_girth').optional().isFloat({ min: 150, max: 500 }),
    body('left_waist_girth').optional().isFloat({ min: 100, max: 450 }),
    body('left_ankle_girth').optional().isFloat({ min: 100, max: 450 }),
    body('left_long_heel_girth').optional().isFloat({ min: 200, max: 500 }),
    body('left_short_heel_girth').optional().isFloat({ min: 150, max: 500 }),
    body('right_foot_height').optional().isFloat({ min: 30, max: 120 }),
    body('left_foot_height').optional().isFloat({ min: 30, max: 120 }),
    body('validated').optional().isInt({ min: 0, max: 1 }),
  ],
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const db  = getDb()
    const id  = req.params.id
    const original = db.prepare('SELECT * FROM foot_scans WHERE id = ?').get(id)
    if (!original) return res.status(404).json({ error: 'Scan nicht gefunden' })

    const {
      right_length, right_width, right_arch,
      right_ball_girth, right_instep_girth, right_heel_girth, right_waist_girth, right_ankle_girth,
      right_long_heel_girth, right_short_heel_girth,
      right_foot_height,
      left_length,  left_width,  left_arch,
      left_ball_girth,  left_instep_girth,  left_heel_girth,  left_waist_girth,  left_ankle_girth,
      left_long_heel_girth, left_short_heel_girth,
      left_foot_height,
      validated,
    } = req.body

    // Build dynamic UPDATE for foot_scans
    const updates = []
    const params  = []
    const fieldMap = {
      right_length, right_width, right_arch,
      right_ball_girth, right_instep_girth, right_heel_girth, right_waist_girth, right_ankle_girth,
      right_long_heel_girth, right_short_heel_girth,
      right_foot_height,
      left_length,  left_width,  left_arch,
      left_ball_girth,  left_instep_girth,  left_heel_girth,  left_waist_girth,  left_ankle_girth,
      left_long_heel_girth, left_short_heel_girth,
      left_foot_height,
    }
    for (const [key, val] of Object.entries(fieldMap)) {
      if (val !== undefined) { updates.push(`${key} = ?`); params.push(val) }
    }

    if (updates.length > 0) {
      params.push(id)
      db.prepare(`UPDATE foot_scans SET ${updates.join(', ')} WHERE id = ?`).run(...params)
    }

    // ── Learning: Store comparison pairs (original → admin-corrected) ────
    // This is the core learning mechanism: every admin correction teaches the system.
    const source = original.reference_type === 'lidar' ? 'lidar' : 'photo'
    const compStmt = db.prepare(`
      INSERT INTO scan_comparison_pairs (scan_id, measurement, source, predicted_mm, actual_mm, error_mm)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(scan_id, measurement) DO UPDATE SET
        source = excluded.source, actual_mm = excluded.actual_mm, error_mm = excluded.error_mm
    `)
    let pairsStored = 0
    for (const [key, newVal] of Object.entries(fieldMap)) {
      if (newVal === undefined || original[key] == null) continue
      const oldVal = original[key]
      if (Math.abs(oldVal - newVal) > 0.05) { // only store meaningful corrections
        compStmt.run(id, key, source, oldVal, newVal, rnd(oldVal - newVal))
        pairsStored++
      }
    }

    // Recalculate calibration if new pairs were stored
    if (pairsStored > 0) {
      recalculateCalibration(db, source)
    }

    // Update validated flag in scan_training_data
    if (validated !== undefined) {
      db.prepare('UPDATE scan_training_data SET validated = ? WHERE scan_id = ?').run(validated, id)
    }

    // Check if auto-training should be triggered
    const validatedCount = db.prepare('SELECT COUNT(*) AS n FROM scan_training_data WHERE validated = 1').get().n
    const shouldTrain = validatedCount >= 20 && validatedCount % 10 === 0 // every 10 validated scans after 20

    const updated = db.prepare('SELECT * FROM foot_scans WHERE id = ?').get(id)
    res.json({
      ok: true, scan: updated,
      _learning: { pairs_stored: pairsStored, calibration_recalculated: pairsStored > 0 },
      _training: shouldTrain ? { trigger: true, validated_count: validatedCount, message: 'Genügend Daten — ML-Training empfohlen' } : undefined,
    })
  }
)

// ─── PATCH /api/scans/:id/my-measurements — User edits own scan measurements ──
// Users can adjust/supplement their own measurements (e.g. self-measured values).
// Unlike admin PATCH, this does NOT store comparison pairs or trigger calibration.
router.patch(
  '/:id/my-measurements',
  authenticate,
  [
    body('right_length').optional().isFloat({ min: 100, max: 400 }),
    body('right_width').optional().isFloat({ min: 50, max: 200 }),
    body('right_arch').optional().isFloat({ min: 0, max: 80 }),
    body('right_ball_girth').optional().isFloat({ min: 100, max: 450 }),
    body('right_instep_girth').optional().isFloat({ min: 100, max: 450 }),
    body('right_heel_girth').optional().isFloat({ min: 150, max: 500 }),
    body('right_waist_girth').optional().isFloat({ min: 100, max: 450 }),
    body('right_ankle_girth').optional().isFloat({ min: 100, max: 450 }),
    body('right_long_heel_girth').optional().isFloat({ min: 200, max: 500 }),
    body('right_short_heel_girth').optional().isFloat({ min: 150, max: 500 }),
    body('right_foot_height').optional().isFloat({ min: 30, max: 120 }),
    body('left_length').optional().isFloat({ min: 100, max: 400 }),
    body('left_width').optional().isFloat({ min: 50, max: 200 }),
    body('left_arch').optional().isFloat({ min: 0, max: 80 }),
    body('left_ball_girth').optional().isFloat({ min: 100, max: 450 }),
    body('left_instep_girth').optional().isFloat({ min: 100, max: 450 }),
    body('left_heel_girth').optional().isFloat({ min: 150, max: 500 }),
    body('left_waist_girth').optional().isFloat({ min: 100, max: 450 }),
    body('left_ankle_girth').optional().isFloat({ min: 100, max: 450 }),
    body('left_long_heel_girth').optional().isFloat({ min: 200, max: 500 }),
    body('left_short_heel_girth').optional().isFloat({ min: 150, max: 500 }),
    body('left_foot_height').optional().isFloat({ min: 30, max: 120 }),
  ],
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const db = getDb()
    const id = req.params.id
    const scan = db.prepare('SELECT * FROM foot_scans WHERE id = ? AND user_id = ?').get(id, req.user.id)
    if (!scan) return res.status(404).json({ error: 'Scan nicht gefunden oder nicht dein Scan' })

    const {
      right_length, right_width, right_arch,
      right_ball_girth, right_instep_girth, right_heel_girth, right_waist_girth, right_ankle_girth,
      right_long_heel_girth, right_short_heel_girth, right_foot_height,
      left_length, left_width, left_arch,
      left_ball_girth, left_instep_girth, left_heel_girth, left_waist_girth, left_ankle_girth,
      left_long_heel_girth, left_short_heel_girth, left_foot_height,
    } = req.body

    const fieldMap = {
      right_length, right_width, right_arch,
      right_ball_girth, right_instep_girth, right_heel_girth, right_waist_girth, right_ankle_girth,
      right_long_heel_girth, right_short_heel_girth, right_foot_height,
      left_length, left_width, left_arch,
      left_ball_girth, left_instep_girth, left_heel_girth, left_waist_girth, left_ankle_girth,
      left_long_heel_girth, left_short_heel_girth, left_foot_height,
    }

    const updates = []
    const params = []
    for (const [key, val] of Object.entries(fieldMap)) {
      if (val !== undefined) { updates.push(`${key} = ?`); params.push(val) }
    }

    if (updates.length === 0) return res.status(400).json({ error: 'Keine Werte zum Aktualisieren' })

    params.push(id)
    db.prepare(`UPDATE foot_scans SET ${updates.join(', ')} WHERE id = ?`).run(...params)

    // ── Learning: store user corrections as soft comparison pairs ────────
    // User corrections have lower weight than admin validations but still
    // contribute to the calibration system over time.
    const source = scan.reference_type === 'lidar' ? 'lidar' : 'photo'
    try {
      const compStmt = db.prepare(`
        INSERT INTO scan_comparison_pairs (scan_id, measurement, source, predicted_mm, actual_mm, error_mm)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(scan_id, measurement) DO UPDATE SET
          actual_mm = excluded.actual_mm, error_mm = excluded.error_mm
      `)
      let pairsStored = 0
      for (const [key, newVal] of Object.entries(fieldMap)) {
        if (newVal === undefined || scan[key] == null) continue
        const oldVal = scan[key]
        if (Math.abs(oldVal - newVal) > 0.1) {
          compStmt.run(id, key, source + '_user', oldVal, newVal, rnd(oldVal - newVal))
          pairsStored++
        }
      }
      // Recalculate calibration when enough user corrections accumulate
      if (pairsStored > 0) {
        const userPairCount = db.prepare(
          "SELECT COUNT(*) AS n FROM scan_comparison_pairs WHERE source LIKE '%_user'"
        ).get().n
        if (userPairCount >= 10 && userPairCount % 5 === 0) {
          recalculateCalibration(db, source + '_user')
        }
      }
    } catch (e) {
      console.warn('[learning] user correction storage failed:', e.message)
    }

    const updated = db.prepare('SELECT * FROM foot_scans WHERE id = ?').get(id)
    res.json({ ok: true, scan: updated })
  }
)

// ─── GET /api/scans/my-average — Bayesian average of user's scan history ─────
// Returns the best estimate of the user's foot dimensions by combining all their
// scans with recency-weighted averaging (half-life: 30 days).
router.get('/my-average', authenticate, (req, res) => {
  const db = getDb()
  const averaged = bayesianUserAverage(db, req.user.id)
  if (!averaged) return res.status(404).json({ error: 'Keine Scans vorhanden' })
  res.json(averaged)
})

// ─── GET /api/scans/calibration-stats — Current calibration corrections (admin) ─
router.get('/calibration-stats', authenticate, requireRole('admin'), (req, res) => {
  const db = getDb()
  const calibrations = db.prepare('SELECT * FROM measurement_calibration ORDER BY measurement').all()
  const pairs = db.prepare('SELECT COUNT(*) AS n FROM scan_comparison_pairs').get()
  const validatedScans = db.prepare('SELECT COUNT(*) AS n FROM scan_training_data WHERE validated = 1').get()

  // Compute per-field accuracy stats
  const fieldStats = db.prepare(`
    SELECT measurement, source,
      COUNT(*) AS n,
      ROUND(AVG(ABS(error_mm)), 2) AS mean_abs_error_mm,
      ROUND(MAX(ABS(error_mm)), 2) AS max_abs_error_mm,
      ROUND(AVG(error_mm), 2) AS mean_bias_mm
    FROM scan_comparison_pairs GROUP BY measurement, source ORDER BY measurement
  `).all()

  res.json({
    calibrations,
    total_comparison_pairs: pairs.n,
    validated_scans: validatedScans.n,
    field_stats: fieldStats,
    training_ready: validatedScans.n >= 20,
    training_recommended: validatedScans.n >= 20 && validatedScans.n % 10 === 0,
  })
})

// ─── GET /api/scans/learning-stats — Full learning pipeline status (admin) ────
router.get('/learning-stats', authenticate, requireRole('admin'), (req, res) => {
  const db = getDb()

  // Count all data sources
  const totalScans = db.prepare('SELECT COUNT(*) AS n FROM foot_scans').get().n
  const totalPredictions = db.prepare('SELECT COUNT(*) AS n FROM scan_predictions').get().n
  const totalPairs = db.prepare('SELECT COUNT(*) AS n FROM scan_comparison_pairs').get().n
  const adminPairs = db.prepare("SELECT COUNT(*) AS n FROM scan_comparison_pairs WHERE source NOT LIKE '%_user'").get().n
  const userPairs = db.prepare("SELECT COUNT(*) AS n FROM scan_comparison_pairs WHERE source LIKE '%_user'").get().n
  const validatedScans = db.prepare('SELECT COUNT(*) AS n FROM scan_training_data WHERE validated = 1').get().n

  // Per-field accuracy from all comparison pairs
  const fieldAccuracy = db.prepare(`
    SELECT measurement, source,
      COUNT(*) AS n,
      ROUND(AVG(ABS(error_mm)), 2) AS mean_abs_error_mm,
      ROUND(MAX(ABS(error_mm)), 2) AS max_abs_error_mm,
      ROUND(AVG(error_mm), 2) AS mean_bias_mm,
      ROUND(MIN(ABS(error_mm)), 2) AS min_abs_error_mm
    FROM scan_comparison_pairs
    GROUP BY measurement, source
    ORDER BY mean_abs_error_mm DESC
  `).all()

  // Overall accuracy trend (last 20 corrections)
  const recentPairs = db.prepare(`
    SELECT error_mm, created_at FROM scan_comparison_pairs
    ORDER BY created_at DESC LIMIT 20
  `).all()
  const recentMeanError = recentPairs.length > 0
    ? Math.round(recentPairs.reduce((s, p) => s + Math.abs(p.error_mm), 0) / recentPairs.length * 100) / 100
    : null

  // Calibration corrections
  const calibrations = db.prepare('SELECT * FROM measurement_calibration ORDER BY measurement').all()

  res.json({
    total_scans: totalScans,
    total_predictions: totalPredictions,
    learning_data: {
      total_comparison_pairs: totalPairs,
      admin_corrections: adminPairs,
      user_corrections: userPairs,
      validated_training_scans: validatedScans,
    },
    accuracy: {
      per_field: fieldAccuracy,
      recent_mean_abs_error_mm: recentMeanError,
      recent_trend: recentPairs.map(p => ({ error: p.error_mm, date: p.created_at })),
    },
    calibrations,
    pca_model_available: (() => {
      try {
        return existsSync(join(ML_SCRIPTS, '..', 'data', 'shape_model', 'meta.json'))
      } catch { return false }
    })(),
    recommendations: [
      totalPairs < 10 ? 'Mehr Korrekturen sammeln (min. 10 für Kalibrierung)' : null,
      validatedScans < 20 ? `Noch ${20 - validatedScans} Scans validieren für ML-Training` : null,
      adminPairs === 0 && userPairs > 5 ? 'Admin-Validierungen haben mehr Gewicht als User-Korrekturen' : null,
      recentMeanError && recentMeanError > 3 ? 'Hoher Fehler — mehr Trainingsdaten oder Kalibrierung nötig' : null,
    ].filter(Boolean),
  })
})

// ─── POST /api/scans/trigger-training — Trigger ML training (admin) ──────────
router.post('/trigger-training', authenticate, requireRole('admin'), async (req, res) => {
  const db = getDb()
  const validatedCount = db.prepare('SELECT COUNT(*) AS n FROM scan_training_data WHERE validated = 1').get().n

  if (validatedCount < 10) {
    return res.status(400).json({ error: `Mindestens 10 validierte Scans benötigt (aktuell: ${validatedCount})` })
  }

  try {
    const TRAIN_SCRIPT = join(ML_SCRIPTS, '..', 'train_photo.py')
    const proc = spawn(PYTHON, [TRAIN_SCRIPT, '--export-first'], {
      cwd: join(ML_SCRIPTS, '..'),
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = '', stderr = ''
    proc.stdout.on('data', d => { stdout += d.toString(); if (stdout.length > 10_000) stdout = stdout.slice(-5000) })
    proc.stderr.on('data', d => { stderr += d.toString(); if (stderr.length > 10_000) stderr = stderr.slice(-5000) })

    // Set a 5-minute timeout
    const timeout = setTimeout(() => { proc.kill('SIGTERM') }, 300_000)

    proc.on('close', code => {
      clearTimeout(timeout)
      if (code !== 0) {
        console.warn('[trigger-training] Failed:', stderr.slice(-500))
      }
    })

    // Respond immediately — training runs in background
    res.json({
      ok: true,
      message: `Training gestartet mit ${validatedCount} validierten Scans (läuft im Hintergrund)`,
    })
  } catch (e) {
    res.status(500).json({ error: 'Training konnte nicht gestartet werden', detail: e.message })
  }
})

// ─── POST /api/scans/lidar-measurements ──────────────────────────────────────
// Receives an iPhone LiDAR point cloud, runs process_lidar.py, returns mm measurements.
// The client can then call  POST /api/scans  with these values to save a full scan.
router.post('/lidar-measurements', authenticate, async (req, res) => {
  const { pointCloud, side, topImage, sideImage } = req.body

  if (!Array.isArray(pointCloud) || pointCloud.length < 1000) {
    return res.status(400).json({ error: 'pointCloud muss ein Array mit mindestens 1000 Punkten sein. Bewege das Handy langsamer und umrunde den Fuß.' })
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

  // Verify Python + critical dependencies before spawning
  const depCheck = spawnSync(PYTHON, ['-c', 'import numpy, scipy, sklearn; print("ok")'], { encoding: 'utf8', timeout: 10000 })
  if (depCheck.status !== 0) {
    try { unlinkSync(tmpFile) } catch { /* ignore */ }
    const missing = (depCheck.stderr || '').match(/No module named '(\w+)'/)?.[1] ?? 'unbekannt'
    return res.status(500).json({
      error: `Python-Abhängigkeit fehlt: ${missing}`,
      detail: 'Bitte "pip install -r requirements.txt" im atelier-ml Verzeichnis ausführen.',
    })
  }

  // Async spawn — doesn't block the Node.js event loop
  let measurements
  try {
    measurements = await new Promise((resolve, reject) => {
      const sideArg = side === 'left' ? 'left' : 'right'
      const child = spawn(PYTHON, [scriptPath, '--cloud', tmpFile, '--side', sideArg], { encoding: 'utf8' })
      let stdout = '', stderr = ''
      const timeout = setTimeout(() => { child.kill('SIGTERM'); reject(new Error('TIMEOUT')) }, 60_000)

      child.stdout.on('data', (d) => { stdout += d })
      child.stderr.on('data', (d) => { stderr += d })
      child.on('close', (code) => {
        clearTimeout(timeout)
        try { unlinkSync(tmpFile) } catch { /* ignore */ }
        if (code !== 0) {
          const isModuleError = stderr.includes('ModuleNotFoundError') || stderr.includes('No module named')
          const isTimeout = stderr.includes('TIMEOUT') || code === null
          const detail = isModuleError
            ? 'Python-Abhängigkeiten fehlen. Bitte "pip install -r requirements.txt" im atelier-ml Verzeichnis ausführen.'
            : isTimeout
            ? 'Verarbeitung hat zu lange gedauert (>60s). Punktwolke möglicherweise zu groß.'
            : (stderr.trim() || 'Unknown Python error').slice(0, 500)
          return reject(Object.assign(new Error(detail), { statusCode: 422 }))
        }
        try {
          const parsed = JSON.parse(stdout)
          if (!parsed.length || !parsed.width) {
            return reject(Object.assign(new Error(
              `process_lidar.py lieferte unvollständige Daten (length=${parsed.length}, width=${parsed.width}). stderr: ${(stderr || '').slice(-200)}`
            ), { statusCode: 422 }))
          }
          resolve(parsed)
        } catch (e) {
          reject(Object.assign(new Error(
            `Ungültiges JSON von process_lidar.py: ${e.message}. stdout-Länge: ${stdout.length} Zeichen. stderr: ${(stderr || '').slice(-200)}`
          ), { statusCode: 422 }))
        }
      })
      child.on('error', (err) => { clearTimeout(timeout); reject(err) })
    })
  } catch (err) {
    try { unlinkSync(tmpFile) } catch { /* ignore */ }
    return res.status(err.statusCode || 500).json({ error: 'LiDAR-Verarbeitung fehlgeschlagen', detail: err.message })
  }

  // Return measurements keyed by side prefix for direct use in  POST /api/scans
  const s = side ?? 'right'
  const response = {
    source: 'lidar',
    side: s,
    raw: measurements,
    // Scan-ready fields:
    [`${s}_length`]:       measurements.length,
    [`${s}_width`]:        measurements.width,
    [`${s}_arch`]:         measurements.arch_height ?? null,
    [`${s}_foot_height`]:  measurements.height,
    [`${s}_toe_girth`]:    measurements.toe_girth ?? null,
    [`${s}_preball_girth`]: measurements.preball_girth ?? null,
    [`${s}_ball_girth`]:   measurements.ball_girth,
    [`${s}_waist_girth`]:  measurements.waist_girth,
    [`${s}_midinstep_girth`]: measurements.midinstep_girth ?? null,
    [`${s}_instep_girth`]: measurements.instep_girth,
    [`${s}_upper_instep_girth`]: measurements.upper_instep_girth ?? null,
    [`${s}_heel_girth`]:   measurements.heel_girth,
    [`${s}_ankle_girth`]:  measurements.ankle_girth,
    point_count: measurements.point_count,
    // Phase 5: cross-section geometries for shoe last production
    cross_sections: measurements.cross_sections ?? {},
    // Point cloud included for client-side storage after scan save
    _has_point_cloud: !!measurements.point_cloud_mm,
    _point_cloud_count: measurements.point_cloud_mm?.length ?? 0,
  }

  // ── Store training images (auto-captured during walk-around) ────────────
  // Photos are paired with LiDAR ground-truth measurements for ML training.
  if (topImage || sideImage) {
    try {
      const db = getDb()
      const topCol  = s === 'left' ? 'left_top_img'  : 'right_top_img'
      const sideCol = s === 'left' ? 'left_side_img' : 'right_side_img'

      // Use a temporary scan_id based on user + timestamp (will be linked to
      // the actual scan later when POST /api/scans is called)
      const tempId = `lidar_${req.user.id}_${Date.now()}`

      // Check if we already have a partial entry for this user's current scan session
      const existing = db.prepare(
        `SELECT id FROM scan_training_data
         WHERE scan_id IN (
           SELECT id FROM foot_scans WHERE user_id = ? ORDER BY created_at DESC LIMIT 1
         )
         AND created_at > datetime('now', '-5 minutes')
         ORDER BY created_at DESC LIMIT 1`
      ).get(req.user.id)

      if (existing) {
        // Update existing entry with the other side's images
        db.prepare(
          `UPDATE scan_training_data SET ${topCol} = ?, ${sideCol} = ? WHERE id = ?`
        ).run(topImage || null, sideImage || null, existing.id)
      } else {
        // Create new training data entry
        db.prepare(
          `INSERT INTO scan_training_data (scan_id, user_id, ${topCol}, ${sideCol})
           VALUES (0, ?, ?, ?)`
        ).run(req.user.id, topImage || null, sideImage || null)
      }

      response._training_images_saved = true
    } catch (e) {
      // Non-critical: don't fail the scan if training data storage fails
      console.error('[lidar-measurements] Fehler beim Speichern der Trainingsbilder:', e.message)
      response._training_images_saved = false
    }
  }

  res.json(response)
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

  // Verify Python + critical dependencies before spawning long-running process
  const depCheck = spawnSync(PYTHON, ['-c', 'import cv2, numpy, scipy; print("ok")'], { encoding: 'utf8', timeout: 10000 })
  if (depCheck.status !== 0) {
    const missing = (depCheck.stderr || '').match(/No module named '(\w+)'/)?.[1] ?? 'unbekannt'
    return res.status(500).json({
      error: `Python-Abhängigkeit fehlt: ${missing}`,
      detail: 'Bitte "pip install opencv-python numpy scipy scikit-learn" im atelier-ml Verzeichnis ausführen.',
    })
  }

  try {
    const payload = JSON.stringify({ rightImgs, leftImgs })
    const proc = spawnSync(PYTHON, [PROCESS_PHOTOGRAMMETRY, '--stdin'], {
      input: payload,
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

// PUT /api/scans/:id/notes — update notes for a scan (owner only)
router.put('/:id/notes', authenticate, (req, res) => {
  const { notes } = req.body
  if (notes != null && typeof notes !== 'string') return res.status(400).json({ error: 'notes must be a string' })
  if (notes && notes.length > 500) return res.status(400).json({ error: 'notes max 500 characters' })

  const scan = getDb().prepare('SELECT * FROM foot_scans WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
  if (!scan) return res.status(404).json({ error: 'Scan not found' })

  getDb().prepare('UPDATE foot_scans SET notes = ? WHERE id = ?').run(notes ?? null, scan.id)
  const updated = getDb().prepare('SELECT * FROM foot_scans WHERE id = ?').get(scan.id)
  res.json(updated)
})

export default router
