/**
 * footSTL.js — 3D foot geometry (all measurements in mm)
 *
 * Coordinate system:
 *   X  — foot length  (heel = −L/2, toe = +L/2)
 *   Y  — mediolateral (big-toe side = positive for right foot)
 *   Z  — height       (plantar plane = 0, dorsal = positive)
 *
 * Exports:
 *   buildFootGeoAsync(length, width, arch, side)  → Promise<THREE.BufferGeometry>
 *   buildFootGeo(length, width, arch, side)        → THREE.BufferGeometry (procedural fallback)
 *   estimateSTLSizeKB(geo)                         → number
 *   downloadSTL(geo, euSize, side)                 → void
 */

import * as THREE from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'

// ─── OBJ-based geometry ────────────────────────────────────────────────────────
// Parse once, reuse for every foot instance
let _baseGeoCache = null

function _loadBase() {
  if (_baseGeoCache) return _baseGeoCache

  _baseGeoCache = new Promise((resolve, reject) => {
    new OBJLoader().load('/models/foot_base.obj', obj => {
      const src = obj.children[0].geometry

      // Remap OBJ axes → our coordinate system:
      //   OBJ X (mediolateral, ≈ ±5.6 units) → our Y
      //   OBJ Y (length, heel→toe, ≈ 27.7 units) → our X
      //   OBJ Z (height, 0→18 units) → our Z (no change)
      const pos = src.attributes.position
      const arr = pos.array
      for (let i = 0; i < arr.length; i += 3) {
        const ox = arr[i], oy = arr[i + 1]
        arr[i]     = oy   // length → X
        arr[i + 1] = ox   // mediolateral → Y
        // arr[i + 2] stays as Z
      }
      pos.needsUpdate = true
      if (src.attributes.normal) src.deleteAttribute('normal')

      resolve(src)
    }, undefined, reject)
  })

  return _baseGeoCache
}

// ─── Public: async OBJ-based foot geometry ────────────────────────────────────
export async function buildFootGeoAsync(length = 265, width = 95, _arch = 13, side = 'right') {
  let base
  try {
    base = await _loadBase()
  } catch {
    // OBJ failed to load (offline, missing file) — fall back to procedural mesh
    return buildFootGeo(length, width, _arch, side)
  }
  const geo  = base.clone()
  const pos  = geo.attributes.position
  const arr  = pos.array

  // Scale to user measurements
  geo.computeBoundingBox()
  const box    = geo.boundingBox
  const curLen = box.max.x - box.min.x
  const curWid = box.max.y - box.min.y
  const sx = length / curLen
  const sy = width  / curWid
  const sz = sx   // height proportional to length
  for (let i = 0; i < arr.length; i += 3) {
    arr[i]     *= sx
    arr[i + 1] *= sy
    arr[i + 2] *= sz
  }
  pos.needsUpdate = true

  // Centre at origin
  geo.computeBoundingBox()
  const bc = new THREE.Vector3()
  geo.boundingBox.getCenter(bc)
  geo.translate(-bc.x, -bc.y, -bc.z)

  // Mirror for left foot: negate Y + restore CCW winding
  if (side === 'left') {
    for (let i = 1; i < arr.length; i += 3) arr[i] *= -1
    pos.needsUpdate = true
    if (geo.index) {
      const idx = geo.index.array
      for (let i = 0; i < idx.length; i += 3) {
        const tmp = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = tmp
      }
      geo.index.needsUpdate = true
    } else {
      // Non-indexed: swap vertex 1 ↔ vertex 2 in each triangle
      for (let i = 0; i < arr.length; i += 9) {
        for (let k = 0; k < 3; k++) {
          const tmp = arr[i + 3 + k]; arr[i + 3 + k] = arr[i + 6 + k]; arr[i + 6 + k] = tmp
        }
      }
    }
  }

  geo.computeVertexNormals()
  return geo
}

// ─── Smooth-step interpolation ─────────────────────────────────────────────────
const ss = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const lerp = (a, b, t) => a + (b - a) * t

// ─── Geometry merge (no external deps) ─────────────────────────────────────────
function mergeGeos(geos) {
  const gs = geos.filter(Boolean)
  let totalV = 0, totalI = 0
  for (const g of gs) { totalV += g.attributes.position.count; totalI += g.index.count }

  const pos = new Float32Array(totalV * 3)
  const idx = new Uint32Array(totalI)
  let vOff = 0, iOff = 0

  for (const g of gs) {
    pos.set(g.attributes.position.array, vOff * 3)
    const gi = g.index.array
    for (let i = 0; i < gi.length; i++) idx[iOff++] = gi[i] + vOff
    vOff += g.attributes.position.count
  }

  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  out.setIndex(new THREE.BufferAttribute(idx, 1))
  out.computeVertexNormals()
  return out
}

// ─── Foot body ─────────────────────────────────────────────────────────────────
function buildFootBody(L, W, A) {
  const SL = 56, SC = 28

  function cs(t) {
    const wHeel = W * 0.295, wBall = W * 0.495, wEnd = W * 0.47
    const halfW = t < 0.72
      ? wHeel + (wBall - wHeel) * ss(0.06, 0.72, t)
      : wBall + (wEnd  - wBall) * ss(0.72, 1.00, t)

    let dorsalZ
    if      (t < 0.06) dorsalZ = W * 0.09  * ss(0, 0.06, t)
    else if (t < 0.45) dorsalZ = W * lerp(0.09, 0.23, ss(0.06, 0.45, t))
    else if (t < 0.70) dorsalZ = W * lerp(0.23, 0.15, ss(0.45, 0.70, t))
    else               dorsalZ = W * lerp(0.15, 0.05, ss(0.70, 1.00, t))

    const plantarZ = W * 0.035 * ss(0, 0.20, t)
    const archLift = A * Math.sin(ss(0.18, 0.74, t) * Math.PI)
    const yShift   = W * 0.022 * Math.sin(ss(0.50, 0.80, t) * Math.PI)
    return { halfW, dorsalZ, plantarZ, archLift, yShift }
  }

  const verts = [], indices = []
  const bodyLen = L * 0.76

  for (let li = 0; li <= SL; li++) {
    const t = li / SL, x = -L / 2 + t * bodyLen
    const { halfW, dorsalZ, plantarZ, archLift, yShift } = cs(t)
    for (let ci = 0; ci <= SC; ci++) {
      const theta = (ci / SC) * Math.PI * 2
      const cosT = Math.cos(theta), sinT = Math.sin(theta)
      verts.push(x, halfW * cosT + yShift,
        archLift + (sinT >= 0 ? dorsalZ * sinT : plantarZ * Math.abs(sinT)))
    }
  }
  for (let li = 0; li < SL; li++) {
    for (let ci = 0; ci < SC; ci++) {
      const a = li * (SC + 1) + ci
      const b = a + 1, c = a + (SC + 1), d = c + 1
      indices.push(a, b, c, b, d, c)
    }
  }
  const hci = verts.length / 3
  verts.push(-L / 2, 0, 0)
  for (let ci = 0; ci < SC; ci++) indices.push(hci, (ci + 1) % SC, ci)

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  g.setIndex(indices)
  g.computeVertexNormals()
  return g
}

// ─── Single toe ────────────────────────────────────────────────────────────────
function makeToe(xStart, yCenter, toeLen, rW, rH) {
  const SL = 10, SR = 10
  const verts = [], indices = []

  for (let li = 0; li <= SL; li++) {
    const s = li / SL, taper = 1 - s * 0.65, curl = rH * 0.18 * s
    for (let ri = 0; ri <= SR; ri++) {
      const phi = (ri / SR) * Math.PI * 2
      verts.push(xStart + toeLen * s,
        yCenter + rW * taper * Math.cos(phi),
        rH * 0.28 + rH * 0.80 * taper * Math.sin(phi) + curl)
    }
  }
  const tipI = verts.length / 3
  verts.push(xStart + toeLen, yCenter, rH * 0.32)
  for (let ri = 0; ri < SR; ri++)
    indices.push(tipI, SL * (SR + 1) + ri, SL * (SR + 1) + (ri + 1) % SR)
  for (let li = 0; li < SL; li++) {
    for (let ri = 0; ri < SR; ri++) {
      const a = li * (SR + 1) + ri
      indices.push(a, a + 1, (li + 1) * (SR + 1) + ri, a + 1, (li + 1) * (SR + 1) + ri + 1, (li + 1) * (SR + 1) + ri)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  g.setIndex(indices)
  g.computeVertexNormals()
  return g
}

// ─── 5-toe assembly ────────────────────────────────────────────────────────────
function buildToes(L, W) {
  return [
    { xBase: L * 0.255, yC: +W * 0.370, len: L * 0.150, rW: W * 0.118, rH: W * 0.095 },
    { xBase: L * 0.262, yC: +W * 0.190, len: L * 0.165, rW: W * 0.090, rH: W * 0.082 },
    { xBase: L * 0.262, yC: +W * 0.025, len: L * 0.152, rW: W * 0.082, rH: W * 0.076 },
    { xBase: L * 0.255, yC: -W * 0.130, len: L * 0.135, rW: W * 0.075, rH: W * 0.070 },
    { xBase: L * 0.238, yC: -W * 0.285, len: L * 0.110, rW: W * 0.067, rH: W * 0.063 },
  ].map(({ xBase, yC, len, rW, rH }) => makeToe(xBase, yC, len, rW, rH))
}

// ─── Public: procedural foot (sync fallback) ───────────────────────────────────
export function buildFootGeo(length = 265, width = 95, arch = 13, side = 'right') {
  const geo = mergeGeos([buildFootBody(length, width, arch), ...buildToes(length, width)])
  if (side === 'left') {
    const pos = geo.attributes.position.array
    for (let i = 1; i < pos.length; i += 3) pos[i] *= -1
    geo.attributes.position.needsUpdate = true
    const idx = geo.index.array
    for (let i = 0; i < idx.length; i += 3) {
      const tmp = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = tmp
    }
    geo.index.needsUpdate = true
    geo.computeVertexNormals()
  }
  return geo
}

// ─── STL size estimate ─────────────────────────────────────────────────────────
export function estimateSTLSizeKB(geo) {
  const tris = geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3
  return Math.round(tris * 120 / 1024)
}

// ─── STL ASCII export + browser download ──────────────────────────────────────
export function downloadSTL(geo, euSize, side) {
  const pos     = geo.attributes.position
  const indexed = !!geo.index
  const total   = indexed ? geo.index.count : pos.count
  const getV    = indexed
    ? i => { const j = geo.index.getX(i); return new THREE.Vector3(pos.getX(j), pos.getY(j), pos.getZ(j)) }
    : i => new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i))

  let stl = `solid atelier_${side}_foot\n`
  for (let i = 0; i < total; i += 3) {
    const [a, b, c] = [getV(i), getV(i + 1), getV(i + 2)]
    const n = new THREE.Vector3()
      .crossVectors(new THREE.Vector3().subVectors(b, a), new THREE.Vector3().subVectors(c, a))
      .normalize()
    stl += `  facet normal ${n.x.toFixed(6)} ${n.y.toFixed(6)} ${n.z.toFixed(6)}\n    outer loop\n`
    ;[a, b, c].forEach(p => {
      stl += `      vertex ${p.x.toFixed(4)} ${p.y.toFixed(4)} ${p.z.toFixed(4)}\n`
    })
    stl += '    endloop\n  endfacet\n'
  }
  stl += `endsolid atelier_${side}_foot\n`

  const blob = new Blob([stl], { type: 'model/stl' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `atelier_${side}_foot_EU${euSize}_${Date.now()}.stl`
  a.click(); URL.revokeObjectURL(url)
}
