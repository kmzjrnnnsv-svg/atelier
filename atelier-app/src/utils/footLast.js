/**
 * footLast.js — Shoe Last (Schuhleisten) Generation from Foot Scan Data
 *
 * Transforms foot measurements + cross-section contours into a shoe last geometry
 * using industry-standard Leisten parameters:
 *
 *   - Zugabe (allowance): 5–15 mm depending on shoe type
 *   - Spitzenverlängerung (toe extension): elongation beyond toes
 *   - Spannhöhen-Anpassung (instep height adjustment)
 *   - Gelenkfeder (shank spring): curvature of the bottom
 *   - Fersensprengung (heel pitch): heel elevation angle
 *
 * Coordinate system (same as footSTL.js):
 *   X — foot length (heel = −L/2, toe = +L/2)
 *   Y — mediolateral (big-toe side = positive for right foot)
 *   Z — height (plantar plane = 0, dorsal = positive)
 *
 * Exports:
 *   SHOE_TYPES                          → available shoe type presets
 *   buildShoeLastGeo(scanData, options)  → THREE.BufferGeometry
 *   downloadSTL(geo, euSize, side)       → void (browser download)
 *   downloadOBJ(geo, euSize, side)       → void (browser download)
 *   generateMassblatt(scanData, options) → object (measurement sheet)
 */

import * as THREE from 'three'

// ─── Shoe Type Presets ──────────────────────────────────────────────────────

// Industry-standard Leisten presets (values from German Schuhmacher-Handwerk)
// CMS can override these — these are sensible defaults for production.
//
// HINWEIS: Scan erfolgt MIT Socken (dünn, ~2mm Umfang).
// girth_ease = reine Material-/Bewegungszugabe (Socke bereits im Scanmaß enthalten).
// width_ease  = dito, Sockendicke (~1mm pro Seite) ist im Scan enthalten.
export const SHOE_TYPES = {
  oxford: {
    name: 'Oxford / Halbschuh',
    zugabe_mm: 12,           // 10–15mm standard for closed lacing
    toe_extension_mm: 8,     // moderate toe spring for classic shape
    heel_pitch_mm: 18,       // 15–20mm standard heel
    instep_raise_mm: 2,      // slight instep accommodation
    shank_spring_mm: 5,      // moderate shank curvature
    width_ease_mm: 2,        // Lederdehnung (Socke im Scan enthalten)
    girth_ease_mm: 3,        // Material-/Bewegungszugabe ohne Socke
  },
  derby: {
    name: 'Derby / Blücher',
    zugabe_mm: 13,           // slightly more than oxford (open lacing)
    toe_extension_mm: 6,     // less toe extension, rounder shape
    heel_pitch_mm: 18,
    instep_raise_mm: 3,      // more instep room (open lacing adjustable)
    shank_spring_mm: 4,
    width_ease_mm: 3,        // slightly more width ease
    girth_ease_mm: 4,
  },
  stiefel: {
    name: 'Stiefel / Boot',
    zugabe_mm: 15,           // more room for thicker socks
    toe_extension_mm: 10,
    heel_pitch_mm: 25,       // higher heel for boots
    instep_raise_mm: 4,      // more vertical room
    shank_spring_mm: 6,
    width_ease_mm: 3,
    girth_ease_mm: 5,        // dickere Socke beim Tragen → extra Zugabe bleibt
  },
  sneaker: {
    name: 'Sneaker / Sportschuh',
    zugabe_mm: 15,           // athletic footwear needs more toe room
    toe_extension_mm: 5,
    heel_pitch_mm: 12,       // lower heel drop
    instep_raise_mm: 3,
    shank_spring_mm: 3,
    width_ease_mm: 4,        // more room for foot splay during movement
    girth_ease_mm: 4,
  },
  pumps: {
    name: 'Pumps / Damenschuh',
    zugabe_mm: 8,            // less room, fitted silhouette
    toe_extension_mm: 12,    // elongated toe shape
    heel_pitch_mm: 55,       // 50–70mm heel height
    instep_raise_mm: 1,      // minimal instep raise
    shank_spring_mm: 8,      // pronounced shank curve for high heel
    width_ease_mm: 1,        // eng anliegend (dünne Socke/Strumpf im Scan)
    girth_ease_mm: 1,
  },
  sandale: {
    name: 'Sandale / Pantolette',
    zugabe_mm: 5,            // minimal — open shoe
    toe_extension_mm: 3,
    heel_pitch_mm: 10,       // low heel
    instep_raise_mm: 2,
    shank_spring_mm: 2,
    width_ease_mm: 1,        // foot visible, close fit desired
    girth_ease_mm: 0,        // barfuß getragen — Socke im Scan muss kompensiert werden
  },
}

// Merge CMS-configured values over defaults
export function mergePreset(shoeType, cmsValues) {
  const base = SHOE_TYPES[shoeType] ?? SHOE_TYPES.oxford
  if (!cmsValues) return base
  return { ...base, ...cmsValues }
}

// ─── Smooth-step helpers ────────────────────────────────────────────────────

const ss = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const lerp = (a, b, t) => a + (b - a) * t

// ─── Ramanujan ellipse perimeter ────────────────────────────────────────────

function ramanujanGirth(a, b) {
  const h = ((a - b) / (a + b)) ** 2
  return Math.PI * (a + b) * (1 + 3 * h / (10 + Math.sqrt(4 - 3 * h)))
}

// ─── Cross-section from contour points ──────────────────────────────────────

function crossSectionFromContour(contourPts, easeWidth, easeHeight) {
  if (!contourPts || contourPts.length < 3) return null

  // Apply ease (expand outward from centroid)
  const cy = contourPts.reduce((s, p) => s + p[0], 0) / contourPts.length
  const cz = contourPts.reduce((s, p) => s + p[1], 0) / contourPts.length

  return contourPts.map(([y, z]) => {
    const dy = y - cy
    const dz = z - cz
    const dist = Math.sqrt(dy * dy + dz * dz)
    if (dist < 0.1) return [y, z]
    const scaleY = 1 + easeWidth / (2 * Math.max(Math.abs(dy), 1))
    const scaleZ = 1 + easeHeight / (2 * Math.max(Math.abs(dz), 1))
    return [cy + dy * scaleY, cz + dz * scaleZ]
  })
}

// ─── Build shoe last geometry ───────────────────────────────────────────────

/**
 * Generate a shoe last (Schuhleisten) geometry from foot scan data.
 *
 * @param {object} scanData - Foot measurements
 * @param {number} scanData.length - Foot length in mm
 * @param {number} scanData.width - Foot width in mm
 * @param {number} [scanData.foot_height] - Foot height in mm
 * @param {number} [scanData.arch] - Arch height in mm
 * @param {object} [scanData.crossSections] - Cross-section contours from DB
 * @param {object} options
 * @param {string} [options.shoeType='oxford'] - Key from SHOE_TYPES
 * @param {string} [options.side='right'] - 'right' or 'left'
 * @param {object} [options.customPreset] - CMS-configured values (overrides defaults)
 * @returns {THREE.BufferGeometry}
 */
export function buildShoeLastGeo(scanData, options = {}) {
  const {
    length: footLen = 265,
    width: footWidth = 95,
    foot_height: footH = 65,
    arch: archH = 13,
    crossSections = null,
  } = scanData

  const shoeType = options.shoeType ?? 'oxford'
  const side = options.side ?? 'right'
  const preset = mergePreset(shoeType, options.customPreset)

  // Last dimensions with Zugabe
  const lastLen = footLen + preset.zugabe_mm + preset.toe_extension_mm
  const lastW = footWidth + preset.width_ease_mm
  const lastH = (footH || 65) + preset.instep_raise_mm

  const SL = 64  // slices along length
  const SC = 32  // circumference segments per slice

  const verts = []
  const indices = []

  // Precompute cross-section data lookup
  const csLookup = {}
  if (crossSections && Array.isArray(crossSections)) {
    for (const cs of crossSections) {
      csLookup[cs.level_name] = cs
    }
  }

  // Cross-section levels with their fractions (toe=0, heel=1 in foot coords)
  // Convert to last-fraction coords
  const footStartInLast = preset.toe_extension_mm / lastLen
  const footScale = footLen / lastLen

  for (let li = 0; li <= SL; li++) {
    const tLast = li / SL  // 0=toe tip, 1=heel
    const x = -lastLen / 2 + tLast * lastLen

    // Map last position to foot fraction
    const tFoot = (tLast - footStartInLast) / footScale
    const inFootRegion = tFoot >= 0 && tFoot <= 1

    // Cross-section dimensions at this slice
    let halfW, dorsalZ, plantarZ

    // Check if we have actual contour data for nearby level
    const contourCs = _findNearestContour(csLookup, tFoot)

    if (contourCs && contourCs.contour && contourCs.contour.length >= 6) {
      // Use actual contour shape — will be used for precise export
      // For the smooth last surface, interpolate dimensions
      halfW = (contourCs.width_mm + preset.width_ease_mm) / 2
      dorsalZ = (contourCs.height_mm + preset.instep_raise_mm) * 0.65
      plantarZ = (contourCs.height_mm + preset.instep_raise_mm) * 0.35
    } else {
      // Parametric cross-section (same as footSTL.js body but with Zugabe)
      const cs = _parametricCrossSection(tFoot, lastW, lastH, archH, preset)
      halfW = cs.halfW
      dorsalZ = cs.dorsalZ
      plantarZ = cs.plantarZ
    }

    // Toe taper region (before foot starts)
    if (tLast < footStartInLast) {
      const toeFrac = tLast / footStartInLast
      halfW *= toeFrac * 0.6
      dorsalZ *= toeFrac * 0.7
      plantarZ *= toeFrac * 0.5
    }

    // Heel pitch (Fersensprengung) — elevate heel region
    const heelLift = preset.heel_pitch_mm * ss(0.75, 1.0, tFoot)

    // Shank spring (Gelenkfeder) — bottom curvature at midfoot
    const shankLift = preset.shank_spring_mm * Math.sin(
      ss(0.30, 0.65, tFoot) * Math.PI
    )

    // Y-shift for medial/lateral asymmetry
    const yShift = lastW * 0.015 * Math.sin(ss(0.50, 0.80, tFoot) * Math.PI)

    for (let ci = 0; ci <= SC; ci++) {
      const theta = (ci / SC) * Math.PI * 2
      const cosT = Math.cos(theta)
      const sinT = Math.sin(theta)

      const y = halfW * cosT + yShift
      let z
      if (sinT >= 0) {
        z = dorsalZ * sinT + heelLift + shankLift
      } else {
        z = plantarZ * Math.abs(sinT) + heelLift + shankLift
      }

      verts.push(x, y, z)
    }
  }

  // Build index buffer
  for (let li = 0; li < SL; li++) {
    for (let ci = 0; ci < SC; ci++) {
      const a = li * (SC + 1) + ci
      const b = a + 1
      const c = a + (SC + 1)
      const d = c + 1
      indices.push(a, b, c, b, d, c)
    }
  }

  // Heel cap
  const heelCenter = verts.length / 3
  const heelX = lastLen / 2
  const heelLiftVal = preset.heel_pitch_mm
  verts.push(heelX, 0, heelLiftVal)
  const heelRing = SL * (SC + 1)
  for (let ci = 0; ci < SC; ci++) {
    indices.push(heelCenter, heelRing + (ci + 1) % SC, heelRing + ci)
  }

  // Toe cap
  const toeCenter = verts.length / 3
  verts.push(-lastLen / 2, 0, 0)
  for (let ci = 0; ci < SC; ci++) {
    indices.push(toeCenter, ci, (ci + 1) % SC)
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  geo.setIndex(indices)

  // Mirror for left foot
  if (side === 'left') {
    const pos = geo.attributes.position.array
    for (let i = 1; i < pos.length; i += 3) pos[i] *= -1
    geo.attributes.position.needsUpdate = true
    const idx = geo.index.array
    for (let i = 0; i < idx.length; i += 3) {
      const tmp = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = tmp
    }
    geo.index.needsUpdate = true
  }

  geo.computeVertexNormals()
  return geo
}


function _findNearestContour(csLookup, tFoot) {
  // Map foot fraction to nearest cross-section level
  // Tighter tolerance (0.04 instead of 0.08) to avoid mismatched contours
  const levels = [
    ['Ferse', 0.15], ['Gewölbe', 0.30], ['Ballen', 0.40],
    ['Taille', 0.45], ['Rist', 0.60], ['Knöchel', 0.88],
  ]
  let best = null, bestDist = Infinity
  for (const [name, frac] of levels) {
    const dist = Math.abs(tFoot - frac)
    if (dist < bestDist && dist < 0.04 && csLookup[name]) {
      bestDist = dist
      best = csLookup[name]
    }
  }
  return best
}


function _parametricCrossSection(tFoot, W, H, archH, preset) {
  const t = Math.max(0, Math.min(1, tFoot))

  // Width profile with anatomically-derived breakpoints
  // Based on mean foot shape from podiatric literature:
  //   Heel (t≈0.12-0.18): ~31% of total width
  //   Waist (t≈0.35-0.45): ~38% (narrowest midfoot)
  //   Ball (t≈0.60-0.72): ~50% (widest at MTP joints)
  //   Toes (t>0.85): ~45% tapering
  const wHeel  = W * 0.31
  const wWaist = W * 0.38
  const wBall  = W * 0.50
  const wToe   = W * 0.42

  let halfW
  if (t < 0.15) {
    // Heel region: rapid widening from zero
    halfW = wHeel * ss(0, 0.15, t)
  } else if (t < 0.40) {
    // Heel → waist: narrowing through midfoot
    halfW = lerp(wHeel, wWaist, ss(0.15, 0.40, t))
  } else if (t < 0.72) {
    // Waist → ball: widening to metatarsals
    halfW = lerp(wWaist, wBall, ss(0.40, 0.72, t))
  } else {
    // Ball → toe: tapering
    halfW = lerp(wBall, wToe, ss(0.72, 1.0, t))
  }

  // Height profile with arch influence
  // Arch height affects the dorsal profile in the midfoot region
  const archFactor = archH > 0 ? (archH / 15) : 1.0  // normalized to average 15mm arch
  let dorsalZ
  if (t < 0.06) {
    dorsalZ = H * 0.08 * ss(0, 0.06, t)
  } else if (t < 0.30) {
    // Heel → midfoot: rise influenced by arch height
    dorsalZ = H * lerp(0.08, 0.18 * archFactor, ss(0.06, 0.30, t))
  } else if (t < 0.55) {
    // Instep region: highest point of dorsum + instep raise
    const instepPeak = 0.24 + preset.instep_raise_mm / H
    dorsalZ = H * lerp(0.18 * archFactor, instepPeak, ss(0.30, 0.55, t))
  } else if (t < 0.75) {
    // Instep → ball: descending
    const instepPeak = 0.24 + preset.instep_raise_mm / H
    dorsalZ = H * lerp(instepPeak, 0.14, ss(0.55, 0.75, t))
  } else {
    // Ball → toe: final taper
    dorsalZ = H * lerp(0.14, 0.04, ss(0.75, 1.0, t))
  }

  // Plantar profile: arch curve
  const plantarZ = H * 0.035 * ss(0, 0.20, t) * archFactor

  return { halfW, dorsalZ, plantarZ }
}


// ─── STL Export (Binary) ────────────────────────────────────────────────────

/**
 * Export geometry as binary STL file (more compact than ASCII).
 */
export function downloadSTL(geo, euSize, side, prefix = 'leisten') {
  const pos = geo.attributes.position
  const indexed = !!geo.index
  const triCount = indexed ? geo.index.count / 3 : pos.count / 3
  const getV = indexed
    ? i => { const j = geo.index.getX(i); return new THREE.Vector3(pos.getX(j), pos.getY(j), pos.getZ(j)) }
    : i => new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i))

  // Binary STL: 80-byte header + 4-byte tri count + 50 bytes per triangle
  const bufSize = 80 + 4 + triCount * 50
  const buffer = new ArrayBuffer(bufSize)
  const view = new DataView(buffer)

  // Header (80 bytes)
  const header = `Atelier Schuhleisten ${side} EU${euSize}`
  for (let i = 0; i < 80; i++) {
    view.setUint8(i, i < header.length ? header.charCodeAt(i) : 0)
  }

  // Triangle count
  view.setUint32(80, triCount, true)

  let offset = 84
  const total = indexed ? geo.index.count : pos.count
  for (let i = 0; i < total; i += 3) {
    const [a, b, c] = [getV(i), getV(i + 1), getV(i + 2)]
    const n = new THREE.Vector3()
      .crossVectors(new THREE.Vector3().subVectors(b, a), new THREE.Vector3().subVectors(c, a))
      .normalize()

    // Normal
    view.setFloat32(offset, n.x, true); offset += 4
    view.setFloat32(offset, n.y, true); offset += 4
    view.setFloat32(offset, n.z, true); offset += 4
    // Vertices
    for (const v of [a, b, c]) {
      view.setFloat32(offset, v.x, true); offset += 4
      view.setFloat32(offset, v.y, true); offset += 4
      view.setFloat32(offset, v.z, true); offset += 4
    }
    // Attribute byte count
    view.setUint16(offset, 0, true); offset += 2
  }

  const blob = new Blob([buffer], { type: 'model/stl' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${prefix}_${side}_EU${euSize}_${Date.now()}.stl`
  a.click()
  URL.revokeObjectURL(url)
}


// ─── OBJ Export ─────────────────────────────────────────────────────────────

/**
 * Export geometry as Wavefront OBJ file.
 */
export function downloadOBJ(geo, euSize, side, prefix = 'leisten') {
  const pos = geo.attributes.position
  const normal = geo.attributes.normal
  const indexed = !!geo.index

  let obj = `# Atelier Schuhleisten - ${side} Fuß EU ${euSize}\n`
  obj += `# Generiert am ${new Date().toISOString()}\n`
  obj += `# Einheit: mm\n`
  obj += `o ${prefix}_${side}_EU${euSize}\n\n`

  // Vertices
  for (let i = 0; i < pos.count; i++) {
    obj += `v ${pos.getX(i).toFixed(4)} ${pos.getY(i).toFixed(4)} ${pos.getZ(i).toFixed(4)}\n`
  }
  obj += '\n'

  // Normals
  if (normal) {
    for (let i = 0; i < normal.count; i++) {
      obj += `vn ${normal.getX(i).toFixed(6)} ${normal.getY(i).toFixed(6)} ${normal.getZ(i).toFixed(6)}\n`
    }
    obj += '\n'
  }

  // Faces (1-indexed in OBJ format)
  if (indexed) {
    const idx = geo.index
    for (let i = 0; i < idx.count; i += 3) {
      const a = idx.getX(i) + 1
      const b = idx.getX(i + 1) + 1
      const c = idx.getX(i + 2) + 1
      if (normal) {
        obj += `f ${a}//${a} ${b}//${b} ${c}//${c}\n`
      } else {
        obj += `f ${a} ${b} ${c}\n`
      }
    }
  } else {
    for (let i = 0; i < pos.count; i += 3) {
      const a = i + 1, b = i + 2, c = i + 3
      if (normal) {
        obj += `f ${a}//${a} ${b}//${b} ${c}//${c}\n`
      } else {
        obj += `f ${a} ${b} ${c}\n`
      }
    }
  }

  const blob = new Blob([obj], { type: 'model/obj' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${prefix}_${side}_EU${euSize}_${Date.now()}.obj`
  a.click()
  URL.revokeObjectURL(url)
}


// ─── Measurement Sheet (Maßblatt) ──────────────────────────────────────────

/**
 * Generate a structured measurement sheet for traditional last makers.
 *
 * @param {object} scanData - Foot measurements (same as buildShoeLastGeo)
 * @param {object} options
 * @returns {object} - Structured measurement data
 */
export function generateMassblatt(scanData, options = {}) {
  const shoeType = options.shoeType ?? 'oxford'
  const side = options.side ?? 'right'
  const preset = mergePreset(shoeType, options.customPreset)

  const {
    length = 265, width = 95,
    foot_height = 65, arch = 13,
    ball_girth, instep_girth, waist_girth, heel_girth, ankle_girth,
    scanned_with_socks = true,
  } = scanData

  const rnd = v => v != null ? Math.round(v * 10) / 10 : null

  // Scan mit Socken: ~2mm Umfang, ~1mm Breite sind im Messwert enthalten.
  // Bei Schuhtypen die barfuß getragen werden (Sandalen), Sockendicke abziehen.
  const SOCK_GIRTH_MM = 2   // dünne Alltagssocke: ~2mm Umfang
  const SOCK_WIDTH_MM = 1   // ~0.5mm pro Seite
  const sockCorr = (scanned_with_socks && preset.girth_ease_mm === 0) ? -SOCK_GIRTH_MM : 0
  const sockWidthCorr = (scanned_with_socks && preset.width_ease_mm <= 1) ? -SOCK_WIDTH_MM : 0

  return {
    title: `Maßblatt Schuhleisten — ${side === 'right' ? 'Rechter' : 'Linker'} Fuß`,
    schuhtyp: preset.name,
    datum: new Date().toLocaleDateString('de-DE'),

    fussmasse: {
      laenge_mm: rnd(length),
      breite_mm: rnd(width),
      hoehe_mm: rnd(foot_height),
      gewoelbehoehe_mm: rnd(arch),
      ballen_umfang_mm: rnd(ball_girth),
      rist_umfang_mm: rnd(instep_girth),
      taillen_umfang_mm: rnd(waist_girth),
      fersen_umfang_mm: rnd(heel_girth),
      knoechel_umfang_mm: rnd(ankle_girth),
    },

    leisten_parameter: {
      zugabe_mm: preset.zugabe_mm,
      spitzenverlaengerung_mm: preset.toe_extension_mm,
      fersensprengung_mm: preset.heel_pitch_mm,
      spannhoehen_zuschlag_mm: preset.instep_raise_mm,
      gelenkfeder_mm: preset.shank_spring_mm,
      breiten_zugabe_mm: preset.width_ease_mm,
      umfangs_zugabe_mm: preset.girth_ease_mm,
    },

    leisten_masse: {
      gesamtlaenge_mm: rnd(length + preset.zugabe_mm + preset.toe_extension_mm),
      breite_mm: rnd(width + preset.width_ease_mm + sockWidthCorr),
      // Only include girth values that were actually measured — no guessing
      ballen_umfang_mm: ball_girth != null ? rnd(ball_girth + preset.girth_ease_mm + sockCorr) : null,
      rist_umfang_mm: instep_girth != null ? rnd(instep_girth + preset.girth_ease_mm + sockCorr) : null,
      taillen_umfang_mm: waist_girth != null ? rnd(waist_girth + preset.girth_ease_mm + sockCorr) : null,
      fersen_umfang_mm: heel_girth != null ? rnd(heel_girth + preset.girth_ease_mm + sockCorr) : null,
    },
    scan_mit_socken: scanned_with_socks,
  }
}
