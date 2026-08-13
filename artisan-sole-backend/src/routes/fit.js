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

/**
 * GET /api/fit/match?category=OXFORD&length=270&girth=260&tolerance=5
 *
 * Der Ballenumfang ist seit jeher das zweite Maß — und für viele das eine zu
 * viel. Die Länge misst jeder in einer Minute mit Wand und Zollstock; für den
 * Ballenumfang braucht es ein Maßband und die Bereitschaft, es sich um den
 * Fuß zu legen. Wer nur die Länge hatte, bekam bislang eine 400er-Antwort:
 * kein Treffer, kein Hinweis, nichts.
 *
 * Deshalb ist `girth` jetzt optional. Ohne ihn wird nach der Länge auf die
 * Größe gerastet, und die Weite kommt nicht aus einer Messung, sondern aus
 * der Angabe des Kunden — `width`, ohne Angabe die Normalweite D. Die Antwort
 * sagt das auch: `girth_known: false` und `fitPercent: null`. Eine
 * Passgenauigkeit in Prozent auszuweisen, wenn die halbe Rechnung fehlt, wäre
 * eine Zahl, die niemand verantworten kann.
 */
router.get('/match', (req, res) => {
  const db = getDb()
  const category = (req.query.category || '').toString().toUpperCase()
  const length = Number(req.query.length)
  const girth = Number(req.query.girth)
  const tolerance = Number.isFinite(Number(req.query.tolerance)) ? Number(req.query.tolerance) : 5
  const nurLaenge = !Number.isFinite(girth)
  const weite = typeof req.query.width === 'string' && req.query.width ? req.query.width : null

  if (!Number.isFinite(length)) {
    return res.status(400).json({ error: 'length (mm) erforderlich' })
  }

  // 1) Erlaubte Leisten für die Kategorie. Unbekannte Kategorie → alle Leisten.
  const allowed = CATEGORY_LASTS[category] || null

  // 2) Chart-Zeilen laden. Ohne gemessenen Ballenumfang wird auf die
  //    angegebene Weite eingeschränkt (ohne Angabe: Normalweite) — sonst
  //    lägen dieselbe Leiste in drei Weiten gleichauf im Ergebnis, und die
  //    Reihenfolge entschiede der Zufall.
  const weiteFilter = weite || (nurLaenge ? 'D' : null)
  const bedingungen = []
  const werte = []
  if (allowed && allowed.length) {
    bedingungen.push(`last_key IN (${allowed.map(() => '?').join(',')})`)
    werte.push(...allowed)
  }
  if (weiteFilter) {
    bedingungen.push('width = ?')
    werte.push(weiteFilter)
  }
  const rows = db.prepare(
    `SELECT last_key, width, size_system, size_label, foot_length_mm, ball_girth_mm
     FROM last_size_chart${bedingungen.length ? ` WHERE ${bedingungen.join(' AND ')}` : ''}`
  ).all(...werte)

  /**
   * Was die Weiten bei DIESER Leiste und Größe bedeuten — in Millimetern.
   *
   * Nur im Fall ohne gemessenen Umfang, und dort ist es der eigentliche
   * Punkt: „Normal oder breit?" ist geraten, solange niemand sagt, woran man
   * es misst. Mit der Zahl daneben wird aus der Schätzung eine Prüfung —
   * ein Schnürsenkel um den Ballen, einmal ans Lineal gehalten, fertig.
   *
   * Bewusst die Werte aus der Tabelle und kein Faustwert: Das Verhältnis von
   * Umfang zu Länge schwankt über unsere Leisten zwischen 0,89 und 0,94
   * allein in der Normalweite. Ein Mittelwert wäre bei der Hälfte daneben.
   */
  const weitenNach = new Map()
  if (nurLaenge) {
    const alle = db.prepare(
      `SELECT last_key, width, size_system, size_label, ball_girth_mm
       FROM last_size_chart${allowed && allowed.length ? ` WHERE last_key IN (${allowed.map(() => '?').join(',')})` : ''}`
    ).all(...(allowed && allowed.length ? allowed : []))
    const RANG = { D: 0, EE: 1, EEE: 2 }
    for (const r of alle) {
      const k = `${r.last_key}|${r.size_system}|${r.size_label}`
      if (!weitenNach.has(k)) weitenNach.set(k, [])
      weitenNach.get(k).push({ width: r.width, ball_girth_mm: r.ball_girth_mm })
    }
    for (const liste of weitenNach.values()) {
      liste.sort((a, b) => (RANG[a.width] ?? 9) - (RANG[b.width] ?? 9))
    }
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
    // 4) Ballenumfang innerhalb Toleranz? Ohne gemessenen Umfang entfällt
    //    diese Prüfung — die Weite steht dann durch die Angabe des Kunden
    //    fest und ist keine Größe, die man verfehlen kann.
    const dGirth = nurLaenge ? null : Math.abs(best.ball_girth_mm - girth)
    if (dGirth !== null && dGirth > tolerance) continue
    candidates.push({
      last_key: best.last_key,
      last_label: LAST_LABELS[best.last_key] || best.last_key,
      width: best.width,
      size_system: best.size_system,
      size_label: best.size_label,
      foot_length_mm: best.foot_length_mm,
      ball_girth_mm: best.ball_girth_mm,
      deltaLength: Math.round((best.foot_length_mm - length) * 10) / 10,
      deltaGirth: dGirth === null ? null : Math.round((best.ball_girth_mm - girth) * 10) / 10,
      score: nurLaenge ? bestDLen : Math.round(Math.sqrt(bestDLen * bestDLen + dGirth * dGirth) * 100) / 100,
      // Ohne zweites Maß keine Prozentzahl. Sie stünde sonst für eine
      // Genauigkeit, von der die Hälfte geraten ist.
      fitPercent: nurLaenge ? null : fitPercent(best.foot_length_mm - length, best.ball_girth_mm - girth),
      girth_known: !nurLaenge,
      // Was die Weiten hier in Millimetern Ballenumfang bedeuten. Nur ohne
      // gemessenen Umfang — sonst steht die Weite ohnehin fest.
      weiten: nurLaenge
        ? (weitenNach.get(`${best.last_key}|${best.size_system}|${best.size_label}`) || [])
        : undefined,
    })
  }

  // 5) Ranking nach kombiniertem Delta (kleinster score zuerst).
  candidates.sort((a, b) => a.score - b.score)

  res.json({ matches: candidates, tolerance, girth_known: !nurLaenge })
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
