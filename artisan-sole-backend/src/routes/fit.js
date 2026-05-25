/**
 * fit.js — Passform-Matcher
 *
 * GET /api/fit/match — ermittelt die best-passende Leisten×Weite×Größe-Kombination
 *   aus last_size_chart anhand von Fußlänge + Ballenumfang (mm). Öffentlich
 *   (auch Gäste matchen, Maße kommen als Query-Param).
 */
import { Router } from 'express'
import { getDb } from '../db/database.js'
import { CATEGORY_LASTS } from '../db/seed.js'

const router = Router()

// Passgenauigkeit aus den mm-Abweichungen der best passenden Leiste×Weite×Größe.
// Vorgabe: ±0,5 cm (5 mm) in Länge UND Breite gelten als gute Passform → der
// gesamte Toleranzbereich (max. 5+5 = 10 mm Gesamtabweichung) bleibt ≥ 95 %.
// 0 mm → 99,9 %, 10 mm → 95,0 %. Faktor 0.49 = Strafpunkte pro mm Gesamtabweichung.
export function fitPercent(dLenMm, dGirthMm) {
  const pct = 99.9 - (Math.abs(dLenMm) + Math.abs(dGirthMm)) * 0.49
  return Math.round(Math.max(95, Math.min(99.9, pct)) * 10) / 10
}


const LAST_LABELS = {
  monti: 'Monti', zurigo: 'Zurigo', savile: 'Savile', belgravia: 'Belgravia',
  wellington: 'Wellington', drake: 'Drake', sneaker: 'Sneaker',
  moc_sport: 'Moc Sport', chunky: 'Chunky', drivers: 'Drivers',
  venetian: 'Venetian', penny_loafer: 'Penny Loafer',
  audrey_rose: 'Audrey & Rose', chenoa: 'Chenoa', carola: 'Carola B',
}

// GET /api/fit/match?category=OXFORD&length=270&girth=260&tolerance=5
router.get('/match', (req, res) => {
  const db = getDb()
  const category = (req.query.category || '').toString().toUpperCase()
  const length = Number(req.query.length)
  const girth = Number(req.query.girth)
  const tolerance = Number.isFinite(Number(req.query.tolerance)) ? Number(req.query.tolerance) : 5

  if (!Number.isFinite(length) || !Number.isFinite(girth)) {
    return res.status(400).json({ error: 'length und girth (mm) erforderlich' })
  }

  // 1) Erlaubte Leisten für die Kategorie. Unbekannte Kategorie → alle Leisten.
  const allowed = CATEGORY_LASTS[category] || null

  // 2) Chart-Zeilen laden.
  let rows
  if (allowed && allowed.length) {
    const placeholders = allowed.map(() => '?').join(',')
    rows = db.prepare(
      `SELECT last_key, width, size_system, size_label, foot_length_mm, ball_girth_mm
       FROM last_size_chart WHERE last_key IN (${placeholders})`
    ).all(...allowed)
  } else {
    rows = db.prepare(
      `SELECT last_key, width, size_system, size_label, foot_length_mm, ball_girth_mm
       FROM last_size_chart`
    ).all()
  }

  if (!rows.length) {
    return res.json({ matches: [], tolerance })
  }

  // 3) Länge zuerst auf die nächstgelegene Größe je (last,width,size_system)-Reihe
  //    snappen. Für jede Leisten/Weite die Größe mit minimalem |dLen| nehmen,
  //    sofern innerhalb Toleranz (verhindert "kein Treffer" zwischen zwei Größen).
  const byProfile = new Map() // key = last|width|system → rows[]
  for (const r of rows) {
    const k = `${r.last_key}|${r.width}|${r.size_system}`
    if (!byProfile.has(k)) byProfile.set(k, [])
    byProfile.get(k).push(r)
  }

  const candidates = []
  for (const profileRows of byProfile.values()) {
    // nächste Größe nach Länge
    let best = null
    let bestDLen = Infinity
    for (const r of profileRows) {
      const dLen = Math.abs(r.foot_length_mm - length)
      if (dLen < bestDLen) { bestDLen = dLen; best = r }
    }
    if (!best || bestDLen > tolerance) continue
    // 4) Ballenumfang innerhalb Toleranz?
    const dGirth = Math.abs(best.ball_girth_mm - girth)
    if (dGirth > tolerance) continue
    candidates.push({
      last_key: best.last_key,
      last_label: LAST_LABELS[best.last_key] || best.last_key,
      width: best.width,
      size_system: best.size_system,
      size_label: best.size_label,
      foot_length_mm: best.foot_length_mm,
      ball_girth_mm: best.ball_girth_mm,
      deltaLength: Math.round((best.foot_length_mm - length) * 10) / 10,
      deltaGirth: Math.round((best.ball_girth_mm - girth) * 10) / 10,
      score: Math.round(Math.sqrt(bestDLen * bestDLen + dGirth * dGirth) * 100) / 100,
      fitPercent: fitPercent(best.foot_length_mm - length, best.ball_girth_mm - girth),
    })
  }

  // 5) Ranking nach kombiniertem Delta (kleinster score zuerst).
  candidates.sort((a, b) => a.score - b.score)

  res.json({ matches: candidates, tolerance })
})

// GET /api/fit/feasible?length=270&girth=260&tolerance=5
// Ermittelt, welche Leisten & Kategorien zu den Maßen passen. Für die
// Collection-Filterung: breite Füße lassen z. B. Belgravia (max Weite EE)
// wegfallen. „Größerer Fuß zählt" wird vom Client vorab berechnet.
router.get('/feasible', (req, res) => {
  const db = getDb()
  const length = Number(req.query.length)
  const girth = Number(req.query.girth)
  const tolerance = Number.isFinite(Number(req.query.tolerance)) ? Number(req.query.tolerance) : 5

  if (!Number.isFinite(length) || !Number.isFinite(girth)) {
    return res.status(400).json({ error: 'length und girth (mm) erforderlich' })
  }

  const rows = db.prepare(
    `SELECT last_key, width, size_system, size_label, foot_length_mm, ball_girth_mm FROM last_size_chart`
  ).all()

  // Pro (last,width,system) die nächste Größe nach Länge snappen, dann Umfang prüfen.
  const byProfile = new Map()
  for (const r of rows) {
    const k = `${r.last_key}|${r.width}|${r.size_system}`
    if (!byProfile.has(k)) byProfile.set(k, [])
    byProfile.get(k).push(r)
  }
  const feasibleLasts = new Set()
  const bestPctByLast = new Map()   // last_key → höchste fitPercent
  for (const profileRows of byProfile.values()) {
    let best = null, bestDLen = Infinity
    for (const r of profileRows) {
      const dLen = Math.abs(r.foot_length_mm - length)
      if (dLen < bestDLen) { bestDLen = dLen; best = r }
    }
    if (!best || bestDLen > tolerance) continue
    if (Math.abs(best.ball_girth_mm - girth) > tolerance) continue
    feasibleLasts.add(best.last_key)
    const pct = fitPercent(best.foot_length_mm - length, best.ball_girth_mm - girth)
    if (!bestPctByLast.has(best.last_key) || pct > bestPctByLast.get(best.last_key)) {
      bestPctByLast.set(best.last_key, pct)
    }
  }

  const knownCategories = Object.keys(CATEGORY_LASTS)
  const categories = knownCategories.filter(cat =>
    CATEGORY_LASTS[cat].some(lk => feasibleLasts.has(lk))
  )
  // Beste Passgenauigkeit je machbarer Kategorie (für Kollektions-Badges).
  const percentByCategory = {}
  for (const cat of categories) {
    const pcts = CATEGORY_LASTS[cat].map(lk => bestPctByLast.get(lk)).filter(Number.isFinite)
    if (pcts.length) percentByCategory[cat] = Math.max(...pcts)
  }

  res.json({
    lasts: [...feasibleLasts],
    categories,
    knownCategories,
    percentByCategory,
    tolerance,
  })
})

export default router
