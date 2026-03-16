// @refresh reset
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, CheckCircle2, Download, AlertCircle, CloudUpload, ChevronRight, Scan } from 'lucide-react'
import * as THREE from 'three'
import { apiFetch } from '../hooks/useApi'
import { useAuth } from '../context/AuthContext'
import useAtelierStore from '../store/atelierStore'
import { buildFootGeoAsync, downloadSTL } from '../utils/footSTL'
import { SHOE_TYPES, buildShoeLastGeo, downloadSTL as downloadLastSTL, downloadOBJ, generateMassblatt } from '../utils/footLast'
import LidarScanNative, { lidarAvailable } from '../plugins/lidarScan'

// ─── Size lookup ───────────────────────────────────────────────────────────────
const r1 = x => Math.round(x * 10) / 10

function sizeFromLength(mm) {
  const table = [
    { eu: '35',   uk: '2.5', us: '4',    mm: 218.0 },
    { eu: '35.5', uk: '3',   us: '4.5',  mm: 221.0 },
    { eu: '36',   uk: '3.5', us: '5',    mm: 224.0 },
    { eu: '36.5', uk: '4',   us: '5.5',  mm: 227.0 },
    { eu: '37',   uk: '4',   us: '5.5',  mm: 230.0 },
    { eu: '37.5', uk: '4.5', us: '6',    mm: 233.0 },
    { eu: '38',   uk: '5',   us: '6.5',  mm: 236.0 },
    { eu: '38.5', uk: '5.5', us: '7',    mm: 239.5 },
    { eu: '39',   uk: '5.5', us: '7',    mm: 243.0 },
    { eu: '39.5', uk: '6',   us: '7.5',  mm: 246.0 },
    { eu: '40',   uk: '6.5', us: '8',    mm: 249.0 },
    { eu: '40.5', uk: '7',   us: '8.5',  mm: 252.0 },
    { eu: '41',   uk: '7',   us: '8.5',  mm: 255.0 },
    { eu: '41.5', uk: '7.5', us: '9',    mm: 258.0 },
    { eu: '42',   uk: '8',   us: '9.5',  mm: 261.0 },
    { eu: '42.5', uk: '8.5', us: '10',   mm: 264.0 },
    { eu: '43',   uk: '9',   us: '10',   mm: 267.0 },
    { eu: '43.5', uk: '9.5', us: '10.5', mm: 270.0 },
    { eu: '44',   uk: '9.5', us: '11',   mm: 273.0 },
    { eu: '44.5', uk: '10',  us: '11.5', mm: 276.0 },
    { eu: '45',   uk: '10.5',us: '11.5', mm: 279.0 },
    { eu: '45.5', uk: '11',  us: '12',   mm: 282.0 },
    { eu: '46',   uk: '11',  us: '12',   mm: 285.0 },
    { eu: '46.5', uk: '11.5',us: '12.5', mm: 288.0 },
    { eu: '47',   uk: '12',  us: '13',   mm: 291.0 },
    { eu: '47.5', uk: '12.5',us: '13.5', mm: 294.0 },
    { eu: '48',   uk: '13',  us: '14',   mm: 297.0 },
  ]
  let best = table[table.length - 1], bestDist = Infinity
  for (const row of table) {
    const dist = Math.abs(mm - row.mm)
    if (dist < bestDist) { bestDist = dist; best = row }
  }
  return { eu: best.eu, uk: best.uk, us: best.us }
}

// ─── Image helpers ─────────────────────────────────────────────────────────────
function buildLuma(data) {
  const luma = new Float32Array(data.length >> 2)
  for (let i = 0; i < data.length; i += 4)
    luma[i >> 2] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
  return luma
}
function adaptiveThreshold(luma, darkFraction = 0.5) {
  const sample = []
  for (let i = 0; i < luma.length; i += 8) sample.push(luma[i])
  sample.sort((a, b) => a - b)
  return sample[Math.floor(sample.length * darkFraction)] ?? 128
}
function compressImage(dataUrl, maxWidth = 1200) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width)
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * scale)
      c.height = Math.round(img.height * scale)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      resolve(c.toDataURL('image/jpeg', 0.82))
    }
    img.src = dataUrl
  })
}
async function measureTop(dataUrl, ppm) {
  if (!dataUrl || !ppm) {
    return null  // No image or calibration → cannot measure
  }
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.width; c.height = img.height
      const ctx = c.getContext('2d')
      ctx.drawImage(img, 0, 0)
      const { data } = ctx.getImageData(0, 0, c.width, c.height)
      const luma = buildLuma(data)
      const threshold = adaptiveThreshold(luma)
      const W = c.width, H = c.height
      let minRow = H, maxRow = 0, footRows = 0
      const colMin = new Array(W).fill(H), colMax = new Array(W).fill(0)
      for (let y = 0; y < H; y++) {
        let rowHasFoot = false
        for (let x = 0; x < W; x++) {
          if (luma[y * W + x] < threshold) {
            minRow = Math.min(minRow, y); maxRow = Math.max(maxRow, y)
            colMin[x] = Math.min(colMin[x], y); colMax[x] = Math.max(colMax[x], y)
            rowHasFoot = true
          }
        }
        if (rowHasFoot) footRows++
      }
      if (footRows < 30) {
        return resolve(null)  // Too few foot pixels detected
      }
      const lengthPx = maxRow - minRow
      let minCol = W, maxCol = 0
      for (let x = 0; x < W; x++) if (colMin[x] < colMax[x]) { minCol = Math.min(minCol, x); maxCol = Math.max(maxCol, x) }
      const widthPx = maxCol - minCol
      resolve({ length: r1(lengthPx / ppm), width: r1(widthPx / ppm) })
    }
    img.src = dataUrl
  })
}
async function analyzeFrame(dataUrl, refSizeMm) {
  if (!dataUrl) return null
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.width; c.height = img.height
      const ctx = c.getContext('2d')
      ctx.drawImage(img, 0, 0)
      const { data } = ctx.getImageData(0, 0, c.width, c.height)
      const luma = buildLuma(data)
      const threshold = adaptiveThreshold(luma, 0.3)
      const W = c.width, H = c.height
      let minR = H, maxR = 0, minC = W, maxC = 0
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (luma[y * W + x] < threshold) {
          minR = Math.min(minR, y); maxR = Math.max(maxR, y)
          minC = Math.min(minC, x); maxC = Math.max(maxC, x)
        }
      }
      const hPx = maxR - minR, wPx = maxC - minC
      if (hPx < 20 || wPx < 20) return resolve(null)
      const ppmH = hPx / refSizeMm.h, ppmW = wPx / refSizeMm.w
      resolve((ppmH + ppmW) / 2)
    }
    img.src = dataUrl
  })
}

// ─── 3D Preview ────────────────────────────────────────────────────────────────
function FootMini3D({ length, width, arch, label }) {
  const mountRef = useRef(null)
  useEffect(() => {
    const el = mountRef.current
    if (!el) return
    const w = el.clientWidth, h = el.clientHeight || 160
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x111111)
    const isLeft = label === 'Left'
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 2000)
    camera.up.set(0, 0, 1)
    camera.position.set(0, isLeft ? 380 : -380, 0); camera.lookAt(0, 0, 0)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(w, h); renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    el.appendChild(renderer.domElement)
    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const d = new THREE.DirectionalLight(0xffffff, 1.0)
    d.position.set(150, isLeft ? 300 : -300, 200); scene.add(d)
    const r = new THREE.DirectionalLight(0x2dd4bf, 0.35)
    r.position.set(-150, isLeft ? 200 : -200, -100); scene.add(r)
    let cancelled = false
    buildFootGeoAsync(length, width, arch, isLeft ? 'left' : 'right').then(geo => {
      if (cancelled) { geo.dispose(); return }
      scene.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xc8997a, roughness: 0.6, metalness: 0.04 })))
      scene.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x2dd4bf, wireframe: true, transparent: true, opacity: 0.07 })))
      renderer.render(scene, camera)
    })
    return () => { cancelled = true; renderer.dispose(); if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement) }
  }, [length, width, arch, label])
  return <div ref={mountRef} className="w-full" style={{ height: 160 }} />
}

// ─── Camera guide overlays ─────────────────────────────────────────────────────
function GuideOverlay({ phase }) {
  // ── Top views: A4 + foot ellipse ──
  if (phase === 'right-top' || phase === 'left-top') {
    const isRight = phase === 'right-top'
    // A4 portrait: ~85px wide, ~120px tall (ratio 210:297 ≈ 0.71)
    const a4X = isRight ? 18 : 252, a4Y = 330, a4W = 90, a4H = 127
    const footCx = isRight ? 270 : 110, footCy = 400
    return (
      <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none" viewBox="0 0 390 844" preserveAspectRatio="none">
        {/* A4 guide */}
        <rect x={a4X} y={a4Y} width={a4W} height={a4H} rx="6"
          stroke="white" strokeWidth="2.5" fill="rgba(255,255,255,0.07)" strokeDasharray="12 6">
          <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
        </rect>
        {/* Corner marks A4 */}
        {[[a4X,a4Y],[a4X+a4W,a4Y],[a4X,a4Y+a4H],[a4X+a4W,a4Y+a4H]].map(([cx,cy],i) => (
          <g key={i} stroke="white" strokeWidth="3" fill="none" strokeLinecap="round">
            <line x1={cx + (i%2===0?6:-6)} y1={cy} x2={cx} y2={cy} />
            <line x1={cx} y1={cy + (i<2?6:-6)} x2={cx} y2={cy} />
          </g>
        ))}
        <text x={a4X + a4W/2} y={a4Y + a4H/2 - 4} textAnchor="middle" fill="rgba(255,255,255,0.85)"
          fontSize="11" fontFamily="system-ui,sans-serif" fontWeight="700" letterSpacing="1.5">A4</text>
        <text x={a4X + a4W/2} y={a4Y + a4H/2 + 10} textAnchor="middle" fill="rgba(255,255,255,0.55)"
          fontSize="9" fontFamily="system-ui,sans-serif" fontWeight="500">297×210mm</text>

        {/* Foot ellipse */}
        <ellipse cx={footCx} cy={footCy} rx="58" ry="138"
          stroke="white" strokeWidth="2.5" fill="rgba(255,255,255,0.05)" strokeDasharray="12 6">
          <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" />
        </ellipse>
        <text x={footCx} y={footCy + 165} textAnchor="middle" fill="rgba(255,255,255,0.9)"
          fontSize="13" fontFamily="system-ui,sans-serif" fontWeight="700" letterSpacing="2">
          {isRight ? 'RECHTER FUß' : 'LINKER FUß'}
        </text>

        {/* Arrow hinting placement */}
        <text x="195" y="620" textAnchor="middle" fill="rgba(255,255,255,0.4)"
          fontSize="11" fontFamily="system-ui,sans-serif" fontWeight="500">
          Kamera senkrecht von oben · ca. 35 cm Abstand
        </text>
      </svg>
    )
  }

  // ── Side views: foot silhouette + A4 ──
  if (phase === 'right-side' || phase === 'left-side') {
    const isRight = phase === 'right-side'
    // Simplified side-foot silhouette path (pointing right for right foot)
    const flip = isRight ? 1 : -1
    const cx = 195
    return (
      <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none" viewBox="0 0 390 844" preserveAspectRatio="none">
        {/* Foot silhouette side view */}
        <g transform={`translate(${cx}, 380) scale(${flip}, 1)`}>
          {/* Ground line */}
          <line x1="-155" y1="95" x2="155" y2="95" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
          {/* Foot outline */}
          <path d="M -120 95 C -120 95 -115 20 -80 0 C -50 -16 0 -18 40 -10 C 80 -2 110 15 120 40 C 128 60 120 82 110 90 C 95 95 -110 95 -120 95 Z"
            stroke="white" strokeWidth="2.5" fill="rgba(255,255,255,0.07)" strokeDasharray="12 6">
            <animate attributeName="opacity" values="1;0.35;1" dur="2s" repeatCount="indefinite" />
          </path>
          {/* Arch indicator */}
          <path d="M -90 95 C -60 55 -20 50 20 95"
            stroke="rgba(255,255,255,0.5)" strokeWidth="2" fill="none" strokeDasharray="6 4" />
          <text x="0" y="-30" textAnchor="middle" fill="rgba(255,255,255,0.85)"
            fontSize="13" fontFamily="system-ui,sans-serif" fontWeight="700" letterSpacing="1.5">
            {isRight ? 'RECHTER FUß' : 'LINKER FUß'}
          </text>
          {/* A4 reference (small, on far side) */}
          <rect x="128" y="-60" width="22" height="155" rx="3"
            stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" fill="rgba(255,255,255,0.05)" strokeDasharray="6 4" />
          <text x="139" y="-68" textAnchor="middle" fill="rgba(255,255,255,0.55)"
            fontSize="9" fontFamily="system-ui,sans-serif" fontWeight="600" letterSpacing="1">A4</text>
        </g>
        {/* Double arrow for arch */}
        <text x="195" y="510" textAnchor="middle" fill="rgba(255,255,255,0.5)"
          fontSize="11" fontFamily="system-ui,sans-serif">📐 Gewölbehöhe wird automatisch gemessen</text>
        <text x="195" y="620" textAnchor="middle" fill="rgba(255,255,255,0.4)"
          fontSize="11" fontFamily="system-ui,sans-serif">
          Kamera auf Bodenhöhe seitlich halten
        </text>
      </svg>
    )
  }

  return null
}

// ─── Camera Step ───────────────────────────────────────────────────────────────
function CamStep({ videoRef, canvasRef, phase, onCapture, onBack, stepNum, totalSteps, camStatus }) {
  const [ready, setReady] = useState(false)
  const [flash, setFlash] = useState(false)
  const [count, setCount] = useState(3)

  useEffect(() => {
    setReady(false); setCount(3)
    const iv = setInterval(() => setCount(c => { if (c <= 1) { clearInterval(iv); setReady(true); return 0 } return c - 1 }), 1000)
    return () => clearInterval(iv)
  }, [phase])

  const handleTap = () => { if (!ready) return; setFlash(true); setTimeout(() => setFlash(false), 160); onCapture() }

  const INFO = {
    'right-top':  { emoji: '📄', title: 'A4-Blatt + rechten Fuß',     sub: 'A4-Papier links neben dem Fuß · Kamera senkrecht von oben ~35 cm' },
    'right-side': { emoji: '📐', title: 'Rechten Fuß von der Seite',   sub: 'A4-Blatt aufrecht daneben halten · Kamera auf Bodenhöhe' },
    'left-top':   { emoji: '📄', title: 'A4-Blatt + linken Fuß',      sub: 'A4-Papier rechts neben dem Fuß · Kamera senkrecht von oben ~35 cm' },
    'left-side':  { emoji: '📐', title: 'Linken Fuß von der Seite',    sub: 'A4-Blatt aufrecht daneben halten · Kamera auf Bodenhöhe' },
  }
  const { emoji, title, sub } = INFO[phase] || { emoji: '📷', title: 'Foto aufnehmen', sub: '' }

  return (
    <div className="absolute inset-0">
      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
      <canvas ref={canvasRef} className="hidden" />

      {/* Bottom vignette */}
      <div className="absolute bottom-0 left-0 right-0 h-72 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent)' }} />

      {camStatus === 'requesting' && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-30">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white animate-spin mx-auto mb-3" />
            <p className="text-xs text-white/60 uppercase tracking-widest">Kamera startet…</p>
          </div>
        </div>
      )}

      {flash && <div className="absolute inset-0 bg-white z-50 pointer-events-none" />}

      <GuideOverlay phase={phase} />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-4 pb-3 flex items-center justify-between">
        <button onClick={onBack}
          className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center border border-white/10">
          <X size={18} className="text-white" strokeWidth={1.8} />
        </button>
        <div className="flex gap-2 items-center">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={`h-2 rounded-full transition-all duration-300 ${
              i < stepNum - 1 ? 'w-5 bg-white' : i === stepNum - 1 ? 'w-8 bg-white' : 'w-5 bg-white/25'
            }`} />
          ))}
        </div>
        <div className="w-11" />
      </div>

      {/* Bottom sheet */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-white px-5 pt-5 pb-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-black flex items-center justify-center flex-shrink-0">
            <span className="text-white text-[11px] font-bold">{stepNum}</span>
          </div>
          <span className="text-xs text-black/40 font-medium">Schritt {stepNum} von {totalSteps}</span>
        </div>
        <p className="text-[15px] font-bold text-black leading-snug mb-1" style={{ letterSpacing: '0.03em' }}>{emoji} {title}</p>
        <p className="text-[11px] text-black/40 leading-relaxed mb-5">{sub}</p>

        {ready ? (
          <button onClick={handleTap}
            className="w-full py-4 bg-black text-white font-bold text-[13px] border-0 uppercase tracking-widest active:opacity-80 transition-opacity"
            style={{ letterSpacing: '0.12em' }}>
            Foto aufnehmen
          </button>
        ) : (
          <div className="w-full py-4 bg-[#f6f5f3] flex items-center justify-center gap-3">
            <div className="w-8 h-8 bg-black/10 flex items-center justify-center">
              <span className="text-base font-bold text-black/50">{count}</span>
            </div>
            <span className="text-[12px] font-semibold text-black/35">Positioniere dich…</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Photogrammetrie Camera Step (16 Aufnahmen) ────────────────────────────────
function PgCamStep({ videoRef, canvasRef, pgStep, pgImgs, viewInfo, onCapture, onBack, camStatus }) {
  const [flash, setFlash] = useState(false)
  const [ready, setReady] = useState(false)
  const [count, setCount] = useState(3)

  useEffect(() => {
    setReady(false); setCount(3)
    const iv = setInterval(() => setCount(c => {
      if (c <= 1) { clearInterval(iv); setReady(true); return 0 }
      return c - 1
    }), 1000)
    return () => clearInterval(iv)
  }, [pgStep])

  const handleTap = () => {
    if (!ready) return
    setFlash(true); setTimeout(() => setFlash(false), 160); onCapture()
  }

  const totalDone = pgImgs.right.length + pgImgs.left.length
  const info = viewInfo[pgStep] || { side: 'right', label: '–', sub: '' }

  return (
    <div className="absolute inset-0">
      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
      <canvas ref={canvasRef} className="hidden" />

      {/* Bottom vignette */}
      <div className="absolute bottom-0 left-0 right-0 h-72 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent)' }} />

      {camStatus === 'requesting' && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-30">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white animate-spin mx-auto mb-3" />
            <p className="text-xs text-white/60 uppercase tracking-widest">Kamera startet…</p>
          </div>
        </div>
      )}

      {flash && <div className="absolute inset-0 bg-white z-50 pointer-events-none" />}

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-4 pb-3 flex items-center justify-between">
        <button onClick={onBack}
          className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center border border-white/10">
          <X size={18} className="text-white" strokeWidth={1.8} />
        </button>
        {/* 16 progress dots */}
        <div className="flex gap-1 items-center">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${
              i < totalDone   ? 'w-4 bg-indigo-400' :
              i === pgStep    ? 'w-6 bg-white' :
              'w-3 bg-white/25'
            }`} />
          ))}
        </div>
        <div className="w-11" />
      </div>

      {/* Bottom sheet */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-white px-5 pt-5 pb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-black flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[11px] font-bold">{pgStep + 1}</span>
            </div>
            <span className="text-xs text-black/40 font-medium">Aufnahme {pgStep + 1} von 16</span>
          </div>
          <span className="text-[10px] font-semibold text-black bg-[#f6f5f3] px-2.5 py-1 uppercase tracking-widest" style={{ letterSpacing: '0.12em' }}>
            {info.side === 'right' ? 'Rechts' : 'Links'}
          </span>
        </div>
        <p className="text-[15px] font-bold text-black leading-snug mb-1" style={{ letterSpacing: '0.03em' }}>{info.label}</p>
        <p className="text-[11px] text-black/40 leading-relaxed mb-5">{info.sub}</p>

        {ready ? (
          <button onClick={handleTap}
            className="w-full py-4 font-bold text-[13px] border-0 text-white bg-black uppercase tracking-widest active:opacity-80 transition-opacity"
            style={{ letterSpacing: '0.12em' }}>
            Foto aufnehmen
          </button>
        ) : (
          <div className="w-full py-4 bg-[#f6f5f3] flex items-center justify-center gap-3">
            <div className="w-8 h-8 bg-black/10 flex items-center justify-center">
              <span className="text-base font-bold text-black/50">{count}</span>
            </div>
            <span className="text-[12px] font-semibold text-black/35">Positioniere dich…</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Camera Error ──────────────────────────────────────────────────────────────
const CAM_ERRORS = {
  insecure: { emoji: '🔒', title: 'HTTPS erforderlich',        desc: 'Die Kamera funktioniert nur über eine sichere HTTPS-Verbindung.',                                                  retry: false },
  denied:   { emoji: '🚫', title: 'Kamerazugriff verweigert', desc: 'Erlaube den Kamerazugriff in den Browser-Einstellungen.\niPhone: Einstellungen → Safari → Kamera → Erlauben', retry: true  },
  notfound: { emoji: '📵', title: 'Keine Kamera gefunden',    desc: 'Bitte verwende ein Gerät mit Rückkamera.',                                                                            retry: false },
  inuse:    { emoji: '⏳', title: 'Kamera in Verwendung',     desc: 'Schließe FaceTime oder andere Kamera-Apps und versuche es erneut.',                                                   retry: true  },
  error:    { emoji: '⚠️', title: 'Kamera-Fehler',            desc: 'Die Kamera konnte nicht gestartet werden.',                                                                           retry: true  },
}

function CamError({ status, onRetry, onDemo, onBack }) {
  const err = CAM_ERRORS[status] || CAM_ERRORS.error
  return (
    <div className="absolute inset-0 flex flex-col bg-white">
      <div className="px-5 pt-4 pb-2 flex-shrink-0">
        <button onClick={onBack} className="bg-transparent border-0 p-0">
          <X size={20} className="text-black" strokeWidth={1.5} />
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-5">
        <div className="w-16 h-16 bg-[#f6f5f3] flex items-center justify-center">
          <span className="text-3xl">{err.emoji}</span>
        </div>
        <div>
          <p className="text-[14px] font-bold text-black mb-2" style={{ letterSpacing: '0.05em', textTransform: 'uppercase' }}>{err.title}</p>
          <p className="text-[11px] text-black/40 leading-relaxed whitespace-pre-line">{err.desc}</p>
        </div>
        <div className="w-full space-y-3 pt-2">
          {err.retry && (
            <button onClick={onRetry} className="w-full py-4 bg-black text-white font-bold text-[12px] border-0 uppercase tracking-widest" style={{ letterSpacing: '0.12em' }}>
              Erneut versuchen
            </button>
          )}
          <button onClick={onDemo} className="w-full py-4 bg-[#f6f5f3] text-black/60 font-semibold text-[12px] border-0">
            Demo-Modus (ohne Kamera)
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function FootScan() {
  const navigate    = useNavigate()
  const { user }    = useAuth()
  const refreshScan = useAtelierStore(s => s.refreshScan)
  const footNotes = useAtelierStore(s => s.footNotes)
  const saveFootNotes = useAtelierStore(s => s.saveFootNotes)

  const videoRef  = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  const [phase,      setPhase]     = useState('start')
  const [frames,     setFrames]    = useState({ rightTop: null, rightSide: null, leftTop: null, leftSide: null })
  const [progress,   setProgress]  = useState(0)
  const [result,     setResult]    = useState(null)
  const [saved,      setSaved]     = useState(false)
  const [saveErr,    setSaveErr]   = useState(null)
  const [camStatus,  setCamStatus] = useState('idle')
  const [aiStatus,   setAiStatus]  = useState('')
  // LiDAR
  const [lidarAvail, setLidarAvail] = useState(false)
  const [lidarData,  setLidarData]  = useState({ right: null, left: null })
  const [lidarError, setLidarError] = useState(null)
  const [walkProgress, setWalkProgress] = useState(0)
  // Photogrammetrie (8-Ansichten-Modus)
  const [pgMode,     setPgMode]    = useState(false)   // Photogrammetrie aktiv?
  const [pgStep,     setPgStep]    = useState(0)        // 0-15 (8 rechts + 8 links)
  const [pgImgs,     setPgImgs]    = useState({ right: [], left: [] })
  const [walkPoints,   setWalkPoints]   = useState(0)

  // ── Shoe last export state ──
  const [lastShoeType, setLastShoeType] = useState('oxford')
  const [lastFormat,   setLastFormat]   = useState('stl')
  const [shoeTypeSettings, setShoeTypeSettings] = useState(null)  // CMS-configured presets
  const [scanNotes,    setScanNotes]    = useState('')
  const [notesConfirmed, setNotesConfirmed] = useState(false)

  // Load shoe type settings from CMS when result screen shows
  useEffect(() => {
    if (phase !== 'result' || shoeTypeSettings) return
    apiFetch('/api/scans/shoe-types').then(data => {
      const map = {}
      for (const t of data) map[t.shoe_type] = t
      setShoeTypeSettings(map)
    }).catch(() => {})
  }, [phase]) // eslint-disable-line

  // Pre-populate notes from user-level foot notes when result screen shows
  useEffect(() => {
    if (phase === 'result' && footNotes && !scanNotes && !notesConfirmed) {
      setScanNotes(footNotes)
    }
  }, [phase, footNotes]) // eslint-disable-line

  // ── Camera ──
  const startCam = useCallback(async () => {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) { setCamStatus('insecure'); return }
    setCamStatus('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}) }
      setCamStatus('active')
    } catch (err) {
      const n = err?.name || ''
      if (n === 'NotAllowedError'  || n === 'PermissionDeniedError')  setCamStatus('denied')
      else if (n === 'NotFoundError'   || n === 'DevicesNotFoundError') setCamStatus('notfound')
      else if (n === 'NotReadableError'|| n === 'TrackStartError')      setCamStatus('inuse')
      else                                                               setCamStatus('error')
    }
  }, [])

  const stopCam = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null
  }, [])

  const capture = useCallback(() => {
    const v = videoRef.current, c = canvasRef.current
    if (!v || !c) return null
    c.width = v.videoWidth || 640; c.height = v.videoHeight || 480
    c.getContext('2d').drawImage(v, 0, 0)
    return c.toDataURL('image/jpeg', 0.85)
  }, [])

  const CAM_PHASES = ['right-top', 'right-side', 'left-top', 'left-side']
  const PG_PHASES  = Array.from({ length: 16 }, (_, i) => `pg-${i}`)  // pg-0 … pg-15
  const ALL_CAM_PHASES = [...CAM_PHASES, ...PG_PHASES]
  useEffect(() => {
    if (ALL_CAM_PHASES.includes(phase) && !streamRef.current) startCam()
  }, [phase, startCam]) // eslint-disable-line

  useEffect(() => () => stopCam(), [stopCam])

  // ── LiDAR availability check (runs once on mount) ──
  useEffect(() => { lidarAvailable().then(setLidarAvail) }, [])

  // ── LiDAR walk-around scan (one foot at a time) ──
  // Walk-around duration in ms
  const WALK_DURATION_MS = 20_000

  const runLidarSide = useCallback(async (side) => {
    setLidarError(null)
    setWalkProgress(0)
    setWalkPoints(0)
    setAiStatus(`📡 Scan läuft…`)

    try {
      await LidarScanNative.startWalkAround()

      // Poll progress every 500ms
      const startTime = Date.now()
      const pollInterval = setInterval(async () => {
        try {
          const prog = await LidarScanNative.getWalkAroundProgress()
          const elapsed = Date.now() - startTime
          setWalkProgress(Math.min(100, Math.round((elapsed / WALK_DURATION_MS) * 100)))
          setWalkPoints(prog.pointCount ?? 0)
        } catch { /* ignore */ }
      }, 500)

      await new Promise(resolve => setTimeout(resolve, WALK_DURATION_MS))
      clearInterval(pollInterval)
      setWalkProgress(100)

      setAiStatus('☁️ Punktwolke wird verarbeitet…')
      const raw = await LidarScanNative.finishWalkAround()

      const measurements = await apiFetch('/api/scans/lidar-measurements', {
        method: 'POST',
        body: JSON.stringify({ pointCloud: raw.pointCloud, side }),
      })
      setLidarData(d => ({ ...d, [side]: measurements }))

      if (side === 'right') { setWalkProgress(0); setWalkPoints(0); setPhase('lidar-left') }
      else                  { setPhase('processing') }
    } catch (e) {
      setLidarError(e.message ?? 'LiDAR-Fehler — bitte erneut versuchen')
      setWalkProgress(0)
    }
  }, []) // eslint-disable-line

  // ── Demo ──
  const startDemo = useCallback(() => {
    stopCam(); setCamStatus('idle')
    setFrames({ rightTop: null, rightSide: null, leftTop: null, leftSide: null })
    // Demo mode: generate sample values but mark as demo so they won't be saved
    const demoRight = { length: 260.0, width: 95.0, arch: 15.0, foot_height: 65.0, ball_girth: null, instep_girth: null, heel_girth: null, waist_girth: null, ankle_girth: null }
    const demoLeft  = { length: 258.0, width: 94.0, arch: 14.5, foot_height: 64.0, ball_girth: null, instep_girth: null, heel_girth: null, waist_girth: null, ankle_girth: null }
    setResult({ right: demoRight, left: demoLeft, sizes: sizeFromLength(259), usedAI: false, isDemo: true, accuracy: 0 })
    setProgress(100)
  }, [stopCam])

  // ── Capture handlers ──
  const handleRightTop  = useCallback(() => { const img = capture(); setFrames(f => ({ ...f, rightTop: img })); setPhase('right-side') }, [capture])
  const handleRightSide = useCallback(() => { const img = capture(); setFrames(f => ({ ...f, rightSide: img })); setPhase('left-top') }, [capture])
  const handleLeftTop   = useCallback(() => { const img = capture(); setFrames(f => ({ ...f, leftTop: img })); setPhase('left-side') }, [capture])
  const handleLeftSide  = useCallback(() => { const img = capture(); stopCam(); setFrames(f => ({ ...f, leftSide: img })); setPhase('processing') }, [capture, stopCam])

  // ── Photogrammetrie: 8 Ansichten je Fuß ──────────────────────────────────────
  // Ansichten: top, front, front_left, left, back_left, back, back_right, right
  const PG_VIEW_INFO = [
    { side: 'right', label: 'Rechts – Draufsicht',       sub: 'Direkt von oben, ~35 cm Abstand, A4-Papier daneben' },
    { side: 'right', label: 'Rechts – Vorne',             sub: 'Auf Zehnhöhe, leicht schräg nach unten' },
    { side: 'right', label: 'Rechts – Vorne-Links 45°',   sub: '45° Winkel, Zehen sichtbar' },
    { side: 'right', label: 'Rechts – Linke Seite',       sub: 'Seitenansicht links (Innenrist)' },
    { side: 'right', label: 'Rechts – Hinten-Links 45°',  sub: '45° Winkel, Ferse sichtbar' },
    { side: 'right', label: 'Rechts – Hinten',            sub: 'Direkt von hinten, Ferse zentriert' },
    { side: 'right', label: 'Rechts – Hinten-Rechts 45°', sub: '45° Winkel, Außenrist' },
    { side: 'right', label: 'Rechts – Rechte Seite',      sub: 'Seitenansicht rechts (Außenrist)' },
    { side: 'left',  label: 'Links – Draufsicht',         sub: 'Direkt von oben, ~35 cm Abstand, A4-Papier daneben' },
    { side: 'left',  label: 'Links – Vorne',              sub: 'Auf Zehnhöhe, leicht schräg nach unten' },
    { side: 'left',  label: 'Links – Vorne-Rechts 45°',   sub: '45° Winkel, Zehen sichtbar' },
    { side: 'left',  label: 'Links – Rechte Seite',       sub: 'Seitenansicht rechts (Außenrist)' },
    { side: 'left',  label: 'Links – Hinten-Rechts 45°',  sub: '45° Winkel, Ferse sichtbar' },
    { side: 'left',  label: 'Links – Hinten',             sub: 'Direkt von hinten, Ferse zentriert' },
    { side: 'left',  label: 'Links – Hinten-Links 45°',   sub: '45° Winkel, Innenrist' },
    { side: 'left',  label: 'Links – Linke Seite',        sub: 'Seitenansicht links (Innenrist)' },
  ]

  const handlePgCapture = useCallback(() => {
    const img = capture()
    if (!img) return
    const info = PG_VIEW_INFO[pgStep]
    setPgImgs(prev => {
      const updated = { ...prev }
      updated[info.side] = [...(updated[info.side] || []), img]
      return updated
    })
    const nextStep = pgStep + 1
    if (nextStep >= 16) {
      stopCam()
      setPhase('pg-processing')
    } else {
      setPgStep(nextStep)
      setPhase(`pg-${nextStep}`)
    }
  }, [capture, pgStep, stopCam])

  // ── Photogrammetrie-Processing: 8 Ansichten → 3D Visual Hull → Maße ──────────
  useEffect(() => {
    if (phase !== 'pg-processing') return
    setProgress(5); setResult(null); setAiStatus('3D-Rekonstruktion läuft…')
    let cancelled = false
    async function runPg() {
      try {
        setProgress(15); setAiStatus('Bilder werden hochgeladen…')
        // Komprimiere Bilder auf 1200px max (Bandbreite sparen)
        const compress = (b64) => {
          return new Promise(resolve => {
            const img = new Image()
            img.onload = () => {
              const scale = Math.min(1200 / Math.max(img.width, img.height), 1)
              const canvas = document.createElement('canvas')
              canvas.width  = Math.round(img.width  * scale)
              canvas.height = Math.round(img.height * scale)
              canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
              resolve(canvas.toDataURL('image/jpeg', 0.88))
            }
            img.src = b64
          })
        }
        const rightImgs = await Promise.all(pgImgs.right.map(compress))
        const leftImgs  = await Promise.all(pgImgs.left.map(compress))
        setProgress(30); setAiStatus('Shape-from-Silhouettes…')
        const data = await apiFetch('/api/scans/photogrammetry', {
          method: 'POST',
          body: JSON.stringify({ rightImgs, leftImgs }),
        })
        if (cancelled) return
        setProgress(85); setAiStatus('Maße berechnet!')
        if (!cancelled) {
          // Baue die verschachtelte right/left-Struktur auf (wie im normalen Scan-Ergebnis)
          const right = {
            length:       r1(data.right_length      ?? 255),
            width:        r1(data.right_width        ?? 92),
            arch:         data.right_arch_height != null ? r1(data.right_arch_height) : null,
            foot_height:  data.right_foot_height != null ? r1(data.right_foot_height) : null,
            ball_girth:   data.right_ball_girth   != null ? r1(data.right_ball_girth)   : null,
            instep_girth: data.right_instep_girth != null ? r1(data.right_instep_girth) : null,
            heel_girth:   data.right_heel_girth   != null ? r1(data.right_heel_girth)   : null,
            waist_girth:  data.right_waist_girth  != null ? r1(data.right_waist_girth)  : null,
            ankle_girth:  data.right_ankle_girth  != null ? r1(data.right_ankle_girth)  : null,
            long_heel_girth:  data.right_long_heel_girth  != null ? r1(data.right_long_heel_girth)  : null,
            short_heel_girth: data.right_short_heel_girth != null ? r1(data.right_short_heel_girth) : null,
            crossSections: data.right_cross_sections ?? {},
          }
          const left = {
            length:       r1(data.left_length       ?? 253),
            width:        r1(data.left_width         ?? 91),
            arch:         data.left_arch_height  != null ? r1(data.left_arch_height)  : null,
            foot_height:  data.left_foot_height  != null ? r1(data.left_foot_height)  : null,
            ball_girth:   data.left_ball_girth   != null ? r1(data.left_ball_girth)   : null,
            instep_girth: data.left_instep_girth != null ? r1(data.left_instep_girth) : null,
            heel_girth:   data.left_heel_girth   != null ? r1(data.left_heel_girth)   : null,
            waist_girth:  data.left_waist_girth  != null ? r1(data.left_waist_girth)  : null,
            ankle_girth:  data.left_ankle_girth  != null ? r1(data.left_ankle_girth)  : null,
            long_heel_girth:  data.left_long_heel_girth  != null ? r1(data.left_long_heel_girth)  : null,
            short_heel_girth: data.left_short_heel_girth != null ? r1(data.left_short_heel_girth) : null,
            crossSections: data.left_cross_sections ?? {},
          }
          const avgLen = (right.length + left.length) / 2
          const cvSuccess = data._cv_right || data._cv_left
          setResult({ right, left, sizes: sizeFromLength(avgLen), usedAI: true,
                      accuracy: data._confidence ?? (cvSuccess ? 94.0 : 91.0), source: 'photogrammetry' })
          setProgress(100)
        }
      } catch (err) {
        if (!cancelled) {
          setAiStatus('Rekonstruktion fehlgeschlagen')
          setResult({ error: err.message })
          setProgress(100)
        }
      }
    }
    runPg()
    return () => { cancelled = true }
  }, [phase]) // eslint-disable-line

  // ── Processing: Claude Vision (4 Bilder + A4) → CV fallback ──
  useEffect(() => {
    if (phase !== 'processing') return
    setProgress(0); setResult(null); setAiStatus('Wird vorbereitet…')

    let cancelled = false, ambientTimer = null

    async function process() {
      let rightM, leftM, archRight = null, archLeft = null, usedAI = false
      let footHeightRight = null, footHeightLeft = null
      let girthRight = {}, girthLeft = {}
      let aiConfidence = null

      // ── LiDAR fast path ──────────────────────────────────────────────────────
      if (lidarData.right && lidarData.left) {
        const R = lidarData.right, L = lidarData.left
        const right = {
          length:       r1(R.right_length ?? R.raw?.length ?? 255),
          width:        r1(R.right_width  ?? R.raw?.width  ?? 92),
          arch:         R.right_arch != null ? r1(R.right_arch) : null,
          foot_height:  R.right_foot_height != null ? r1(R.right_foot_height) : (R.raw?.height != null ? r1(R.raw.height) : null),
          ball_girth:   R.right_ball_girth   ?? null,
          instep_girth: R.right_instep_girth ?? null,
          heel_girth:   R.right_heel_girth   ?? null,
          waist_girth:  R.right_waist_girth  ?? null,
          ankle_girth:  R.right_ankle_girth  ?? null,
          long_heel_girth:  R.right_long_heel_girth  ?? null,
          short_heel_girth: R.right_short_heel_girth ?? null,
          crossSections: R.cross_sections ?? {},
          pointCloud:    R.raw?.point_cloud_mm ?? null,
        }
        const left = {
          length:       r1(L.left_length ?? L.raw?.length ?? 253),
          width:        r1(L.left_width  ?? L.raw?.width  ?? 91),
          arch:         L.left_arch != null ? r1(L.left_arch) : null,
          foot_height:  L.left_foot_height != null ? r1(L.left_foot_height) : (L.raw?.height != null ? r1(L.raw.height) : null),
          ball_girth:   L.left_ball_girth   ?? null,
          instep_girth: L.left_instep_girth ?? null,
          heel_girth:   L.left_heel_girth   ?? null,
          waist_girth:  L.left_waist_girth  ?? null,
          ankle_girth:  L.left_ankle_girth  ?? null,
          long_heel_girth:  L.left_long_heel_girth  ?? null,
          short_heel_girth: L.left_short_heel_girth ?? null,
          crossSections: L.cross_sections ?? {},
          pointCloud:    L.raw?.point_cloud_mm ?? null,
        }
        setProgress(100)
        setResult({ right, left, sizes: sizeFromLength(r1((right.length + left.length) / 2)), usedAI: true, source: 'lidar' })
        return
      }

      // Ambient drift to 65% while API call runs
      ambientTimer = setInterval(() => setProgress(p => p < 65 ? +(p + 0.4).toFixed(1) : p), 120)

      const hasAllFrames = frames.rightTop && frames.rightSide && frames.leftTop && frames.leftSide

      if (hasAllFrames) {
        try {
          setAiStatus('Bilder werden komprimiert…'); setProgress(6)
          const [rT, rS, lT, lS] = await Promise.all([
            compressImage(frames.rightTop,  1200),
            compressImage(frames.rightSide, 1000),
            compressImage(frames.leftTop,   1200),
            compressImage(frames.leftSide,  1000),
          ])
          if (cancelled) return
          setAiStatus('🤖 Claude KI analysiert 4 Bilder…'); setProgress(18)

          const ai = await apiFetch('/api/scans/analyze', {
            method: 'POST',
            body: JSON.stringify({ rightTopImg: rT, rightSideImg: rS, leftTopImg: lT, leftSideImg: lS }),
          })
          if (cancelled) return

          clearInterval(ambientTimer); setProgress(82); setAiStatus('Schuhgröße wird berechnet…')
          rightM     = { length: ai.right_length, width: ai.right_width }
          leftM      = { length: ai.left_length,  width: ai.left_width  }
          archRight       = ai.right_arch_height ?? null
          archLeft        = ai.left_arch_height  ?? null
          footHeightRight = ai.right_foot_height ?? null
          footHeightLeft  = ai.left_foot_height  ?? null
          girthRight = {
            ball:       ai.right_ball_girth       ?? null,
            instep:     ai.right_instep_girth     ?? null,
            heel:       ai.right_heel_girth       ?? null,
            waist:      ai.right_waist_girth      ?? null,
            ankle:      ai.right_ankle_girth      ?? null,
            long_heel:  ai.right_long_heel_girth  ?? null,
            short_heel: ai.right_short_heel_girth ?? null,
          }
          girthLeft = {
            ball:       ai.left_ball_girth        ?? null,
            instep:     ai.left_instep_girth      ?? null,
            heel:       ai.left_heel_girth        ?? null,
            waist:      ai.left_waist_girth       ?? null,
            ankle:      ai.left_ankle_girth       ?? null,
            long_heel:  ai.left_long_heel_girth   ?? null,
            short_heel: ai.left_short_heel_girth  ?? null,
          }
          usedAI     = true
          aiConfidence = ai._confidence ?? null
          if (ai._calibration_applied && Object.keys(ai._calibration_applied).length > 0) {
            console.info('[FootScan] Kalibrierung angewendet:', Object.keys(ai._calibration_applied).length, 'Felder korrigiert')
          }
        } catch (e) {
          console.warn('[FootScan] KI fehlgeschlagen, CV-Fallback:', e.message)
          setAiStatus('Lokale Analyse…')
        }
      }

      if (!usedAI) {
        clearInterval(ambientTimer)
        // No AI/CV measurement succeeded — report error instead of random values
        setAiStatus('Messung fehlgeschlagen')
        setResult({ error: 'Fußmaße konnten nicht bestimmt werden. Bitte erneut scannen mit A4-Papier als Referenz.' })
        setProgress(100)
        return
      }

      if (cancelled) return
      const right = {
        length:       r1(rightM.length), width: r1(rightM.width),
        arch:         archRight != null ? r1(archRight) : null,
        foot_height:  footHeightRight != null ? r1(footHeightRight) : null,
        ball_girth:   girthRight.ball   ? r1(girthRight.ball)   : null,
        instep_girth: girthRight.instep ? r1(girthRight.instep) : null,
        heel_girth:   girthRight.heel   ? r1(girthRight.heel)   : null,
        waist_girth:  girthRight.waist  ? r1(girthRight.waist)  : null,
        ankle_girth:  girthRight.ankle  ? r1(girthRight.ankle)  : null,
        long_heel_girth:  girthRight.long_heel  ? r1(girthRight.long_heel)  : null,
        short_heel_girth: girthRight.short_heel ? r1(girthRight.short_heel) : null,
      }
      const left = {
        length:       r1(leftM.length), width: r1(leftM.width),
        arch:         archLeft != null ? r1(archLeft) : null,
        foot_height:  footHeightLeft != null ? r1(footHeightLeft) : null,
        ball_girth:   girthLeft.ball   ? r1(girthLeft.ball)   : null,
        instep_girth: girthLeft.instep ? r1(girthLeft.instep) : null,
        heel_girth:   girthLeft.heel   ? r1(girthLeft.heel)   : null,
        waist_girth:  girthLeft.waist  ? r1(girthLeft.waist)  : null,
        ankle_girth:  girthLeft.ankle  ? r1(girthLeft.ankle)  : null,
        long_heel_girth:  girthLeft.long_heel  ? r1(girthLeft.long_heel)  : null,
        short_heel_girth: girthLeft.short_heel ? r1(girthLeft.short_heel) : null,
      }
      setProgress(100)
      setResult({ right, left, sizes: sizeFromLength(r1((right.length + left.length) / 2)), usedAI,
                  accuracy: aiConfidence ?? (usedAI ? 88.0 : 82.0) })
    }

    process()
    return () => { cancelled = true; clearInterval(ambientTimer) }
  }, [phase, lidarData]) // eslint-disable-line

  useEffect(() => { if (progress >= 100 && result) setTimeout(() => setPhase('result'), 450) }, [progress, result])

  // ── Auto-save + Training-Images Upload ──
  useEffect(() => {
    if (phase !== 'result' || !result || saved || result.isDemo) return
    async function save() {
      try {
        const payload = {
          reference_type: result.source === 'lidar' ? 'lidar' : 'a4',
          right_length: result.right.length, right_width: result.right.width,
          right_arch: result.right.arch ?? 14,
          left_length:  result.left.length,  left_width:  result.left.width,
          left_arch:  result.left.arch ?? 13,
          ...(result.right.foot_height  != null && { right_foot_height:  result.right.foot_height }),
          ...(result.left.foot_height   != null && { left_foot_height:   result.left.foot_height }),
          ...(result.right.ball_girth   != null && { right_ball_girth:   result.right.ball_girth }),
          ...(result.right.instep_girth != null && { right_instep_girth: result.right.instep_girth }),
          ...(result.right.heel_girth   != null && { right_heel_girth:   result.right.heel_girth }),
          ...(result.right.waist_girth  != null && { right_waist_girth:  result.right.waist_girth }),
          ...(result.right.ankle_girth      != null && { right_ankle_girth:      result.right.ankle_girth }),
          ...(result.right.long_heel_girth  != null && { right_long_heel_girth:  result.right.long_heel_girth }),
          ...(result.right.short_heel_girth != null && { right_short_heel_girth: result.right.short_heel_girth }),
          ...(result.left.ball_girth    != null && { left_ball_girth:    result.left.ball_girth }),
          ...(result.left.instep_girth  != null && { left_instep_girth:  result.left.instep_girth }),
          ...(result.left.heel_girth    != null && { left_heel_girth:    result.left.heel_girth }),
          ...(result.left.waist_girth   != null && { left_waist_girth:   result.left.waist_girth }),
          ...(result.left.ankle_girth       != null && { left_ankle_girth:       result.left.ankle_girth }),
          ...(result.left.long_heel_girth  != null && { left_long_heel_girth:  result.left.long_heel_girth }),
          ...(result.left.short_heel_girth != null && { left_short_heel_girth: result.left.short_heel_girth }),
          eu_size: result.sizes.eu, uk_size: String(result.sizes.uk), us_size: String(result.sizes.us),
          accuracy: result.accuracy ?? (result.source === 'lidar' ? 96.0 : result.source === 'photogrammetry' ? 94.0 : result.usedAI ? 88.0 : 82.0),
        }
        const saved_scan = await apiFetch('/api/scans', { method: 'POST', body: JSON.stringify(payload) })
        setSaved(true); refreshScan()

        // Upload compressed training images in background (für ML-Modell)
        if (frames.rightTop && frames.rightSide && frames.leftTop && frames.leftSide && saved_scan?.id) {
          const [rT, rS, lT, lS] = await Promise.all([
            compressImage(frames.rightTop,  800),
            compressImage(frames.rightSide, 800),
            compressImage(frames.leftTop,   800),
            compressImage(frames.leftSide,  800),
          ])
          apiFetch(`/api/scans/${saved_scan.id}/training-images`, {
            method: 'POST',
            body: JSON.stringify({ rightTopImg: rT, rightSideImg: rS, leftTopImg: lT, leftSideImg: lS }),
          }).catch(e => console.warn('[FootScan] Training-Upload fehlgeschlagen:', e.message))
        }

        // Phase 5: Store point clouds + cross-sections (fire-and-forget)
        if (saved_scan?.id) {
          for (const sd of ['right', 'left']) {
            const sideData = result[sd]
            // Store cross-sections if available
            if (sideData?.crossSections && Object.keys(sideData.crossSections).length > 0) {
              apiFetch(`/api/scans/${saved_scan.id}/cross-sections`, {
                method: 'POST',
                body: JSON.stringify({ side: sd, cross_sections: sideData.crossSections }),
              }).catch(e => console.warn(`[FootScan] Cross-section upload (${sd}) fehlgeschlagen:`, e.message))
            }
            // Store point cloud if available
            if (sideData?.pointCloud && sideData.pointCloud.length > 50) {
              apiFetch(`/api/scans/${saved_scan.id}/point-cloud`, {
                method: 'POST',
                body: JSON.stringify({ side: sd, point_cloud_mm: sideData.pointCloud }),
              }).catch(e => console.warn(`[FootScan] Point-cloud upload (${sd}) fehlgeschlagen:`, e.message))
            }
          }
        }
      } catch { setSaveErr('Verbindungsfehler — Scan nicht gespeichert.') }
    }
    save()
  }, [phase, result, saved]) // eslint-disable-line

  const LIDAR_PHASES = ['lidar-right', 'lidar-left']

  // ── Routing helpers ──
  const isCamPhase    = CAM_PHASES.includes(phase) || PG_PHASES.includes(phase)
  const isRegCamPhase = CAM_PHASES.includes(phase)
  const isPgCamPhase  = PG_PHASES.includes(phase)
  const isCamError    = ['denied', 'notfound', 'inuse', 'insecure', 'error'].includes(camStatus)
  const showCamError  = isCamPhase && isCamError
  const camStepNum    = { 'right-top': 1, 'right-side': 2, 'left-top': 3, 'left-side': 4 }[phase] ?? 1
  const captureHandler = {
    'right-top':  handleRightTop,
    'right-side': handleRightSide,
    'left-top':   handleLeftTop,
    'left-side':  handleLeftSide,
  }[phase]

  // ── Desktop guard: no scan on laptop/desktop ──
  const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches && !('ontouchstart' in window)
  if (isDesktop) {
    return (
      <div className="relative h-full overflow-hidden bg-black flex flex-col items-center justify-center text-center px-8">
        <Scan size={48} className="text-white/20 mb-4" />
        <h2 className="text-lg font-light text-white uppercase tracking-[0.15em] mb-2">3D Foot Scan</h2>
        <p className="text-[11px] text-white/40 leading-relaxed max-w-xs">
          Der Fußscan ist nur auf Smartphones und Tablets verfügbar. Bitte öffne die App auf deinem Mobilgerät, um einen Scan durchzuführen.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="mt-6 px-6 py-2.5 bg-white text-black text-[10px] uppercase tracking-[0.18em] font-medium border-0"
        >
          Zurück
        </button>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="relative h-full overflow-hidden bg-black">

      {/* Camera error */}
      {showCamError && (
        <CamError status={camStatus}
          onRetry={() => { setCamStatus('idle'); startCam() }}
          onDemo={startDemo}
          onBack={() => { stopCam(); setCamStatus('idle'); setPhase('start') }} />
      )}

      {/* Camera view (standard 4-shot mode) */}
      {isRegCamPhase && !showCamError && (
        <CamStep key={phase} videoRef={videoRef} canvasRef={canvasRef} phase={phase}
          onCapture={captureHandler}
          onBack={() => { stopCam(); navigate(-1) }}
          stepNum={camStepNum} totalSteps={4} camStatus={camStatus} />
      )}

      {/* ── Photogrammetrie camera view (16-shot mode) ── */}
      {isPgCamPhase && !showCamError && (
        <PgCamStep key={phase}
          videoRef={videoRef} canvasRef={canvasRef}
          pgStep={pgStep} pgImgs={pgImgs}
          viewInfo={PG_VIEW_INFO}
          onCapture={handlePgCapture}
          onBack={() => { stopCam(); setPgMode(false); setPgStep(0); setPgImgs({ right: [], left: [] }); setPhase('start') }}
          camStatus={camStatus} />
      )}

      {/* ── LiDAR scan screens ── */}
      {LIDAR_PHASES.includes(phase) && (
        <div className="absolute inset-0 flex flex-col bg-black">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-4 flex-shrink-0">
            <button onClick={() => { setPhase('start'); setWalkProgress(0) }}
              className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center border-0">
              <X size={17} className="text-white" strokeWidth={1.8} />
            </button>
            <span className="text-sm font-bold text-white tracking-wide">LiDAR-Scan</span>
            <div className="flex gap-1.5">
              <div className={`h-1.5 w-8 rounded-full ${phase === 'lidar-right' ? 'bg-teal-400' : 'bg-white'}`} />
              <div className={`h-1.5 w-8 rounded-full ${phase === 'lidar-left'  ? 'bg-teal-400' : 'bg-white/25'}`} />
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-6">
            {/* Circular progress ring */}
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
                <circle cx="50" cy="50" r="44" fill="none" stroke="#2dd4bf" strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 44}`}
                  strokeDashoffset={`${2 * Math.PI * 44 * (1 - walkProgress / 100)}`}
                  style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
              </svg>
              <div className="flex flex-col items-center">
                <Scan size={32} className="text-teal-400 mb-1" strokeWidth={1.2} />
                <span className="text-2xl font-bold text-white">{walkProgress}%</span>
                {walkPoints > 0 && (
                  <span className="text-xs text-gray-400 mt-0.5">{(walkPoints/1000).toFixed(0)}k Punkte</span>
                )}
              </div>
            </div>

            <div>
              <p className="text-2xl font-bold text-white mb-2">
                {phase === 'lidar-right' ? 'Rechten' : 'Linken'} Fuß scannen
              </p>
              <p className="text-sm text-gray-400 leading-relaxed">
                Fahre das iPhone langsam in einem Bogen<br />
                von oben und von der Seite um den Fuß.<br />
                <span className="text-teal-400 font-medium">20 Sekunden · möglichst alle Winkel</span>
              </p>
            </div>

            {/* Guide steps */}
            {walkProgress === 0 && !lidarError && (
              <div className="w-full space-y-2">
                {[
                  { icon: '⬆️', text: 'Von oben starten (30–50 cm Abstand)' },
                  { icon: '↗️', text: 'Langsam nach vorne kippen' },
                  { icon: '➡️', text: 'Seite scannen (Außen + Innen)' },
                  { icon: '↙️', text: 'Wieder nach oben zurück' },
                ].map(({ icon, text }) => (
                  <div key={text} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-base">{icon}</span>
                    <span className="text-xs text-gray-300">{text}</span>
                  </div>
                ))}
              </div>
            )}

            {lidarError && (
              <div className="w-full p-4 rounded-2xl bg-red-500/10 border border-red-400/30">
                <p className="text-sm text-red-400">{lidarError}</p>
                <button onClick={() => setPhase('start')}
                  className="mt-2 text-xs text-red-300 underline border-0 bg-transparent">
                  Zum Foto-Modus wechseln
                </button>
              </div>
            )}

            {aiStatus && !lidarError && walkProgress > 0 && (
              <p className="text-sm text-teal-400 font-medium">{aiStatus}</p>
            )}

            {!lidarError && walkProgress === 0 && (
              <button
                onClick={() => runLidarSide(phase === 'lidar-right' ? 'right' : 'left')}
                className="w-full py-4 rounded-2xl bg-teal-500 text-white font-bold text-base border-0 flex items-center justify-center gap-2">
                <Scan size={18} />
                Scan starten (20 Sek.)
              </button>
            )}

            {walkProgress > 0 && walkProgress < 100 && !lidarError && (
              <div className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center gap-3">
                <div className="w-4 h-4 rounded-full border-2 border-teal-400/40 border-t-teal-400 animate-spin" />
                <span className="text-sm text-gray-300 font-medium">Scannen läuft…</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* White screens: start / processing / pg-processing / result */}
      {['start', 'processing', 'pg-processing', 'result'].includes(phase) && (
        <div className="absolute inset-0 flex flex-col bg-white overflow-hidden">

          {/* Shared header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-4 border-b border-black/5 flex-shrink-0">
            <button onClick={() => { stopCam(); navigate(-1) }}
              className="bg-transparent border-0 p-0">
              <X size={20} className="text-black" strokeWidth={1.5} />
            </button>
            <div className="text-center">
              <p className="text-[8px] uppercase tracking-widest text-black/30" style={{ letterSpacing: '0.2em' }}>3D Scan</p>
              <span className="text-[13px] font-bold text-black" style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {phase === 'start' ? 'Fußscan' :
                 phase === 'processing' || phase === 'pg-processing' ? 'Auswertung' :
                 'Ergebnis'}
              </span>
            </div>
            <div className="w-5" />
          </div>

          {/* ── START ── */}
          {phase === 'start' && (
            <div className="flex-1 overflow-y-auto">
              {/* Hero header bar */}
              <div className="flex items-center gap-3 px-5 py-4" style={{ background: '#0f172a' }}>
                <div className="w-9 h-9 flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(45,212,191,0.15)' }}>
                  <Scan size={17} className="text-teal-400" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[8px] text-teal-400" style={{ letterSpacing: '0.18em', textTransform: 'uppercase' }}>Vermessung</p>
                  <p className="text-[13px] text-white leading-tight mt-0.5">3D Fußvermessung</p>
                </div>
                {lidarAvail && (
                  <div className="flex items-center gap-1 px-2.5 py-1 bg-white/10">
                    <span className="text-[7px] text-teal-400 uppercase" style={{ letterSpacing: '0.15em' }}>LiDAR</span>
                  </div>
                )}
              </div>
              <div className="px-5 pt-3 pb-4 border-b border-black/5">
                <p className="text-[10px] text-black/45 leading-relaxed">
                  {lidarAvail
                    ? 'iPhone LiDAR · Direkte 3D-Messung · ±0.5–1mm Präzision'
                    : '4 Fotos · A4-Papier als Referenz · ±1–2mm Präzision'}
                </p>
              </div>

              <div className="px-5 pt-4 pb-3 space-y-0 divide-y divide-black/5">
                {[
                  { n: '1', label: 'Rechter Fuß — oben',   desc: 'A4-Blatt links neben dem Fuß, Kamera senkrecht von oben' },
                  { n: '2', label: 'Rechter Fuß — Seite',  desc: 'A4-Blatt seitlich halten, Kamera auf Bodenhöhe' },
                  { n: '3', label: 'Linker Fuß — oben',    desc: 'A4-Blatt rechts neben dem Fuß, Kamera senkrecht von oben' },
                  { n: '4', label: 'Linker Fuß — Seite',   desc: 'A4-Blatt seitlich halten, Kamera auf Bodenhöhe' },
                ].map(({ n, label, desc }) => (
                  <div key={n} className="flex items-center gap-3 py-3">
                    <span className="w-7 h-7 bg-black text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                      {n}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-black">{label}</p>
                      <p className="text-[9px] text-black/40 mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* A4 tip */}
              <div className="mx-5 mt-3 p-3.5 bg-[#f6f5f3] border border-black/5 flex gap-3">
                <div className="w-7 h-7 bg-black/8 flex items-center justify-center flex-shrink-0">
                  <AlertCircle size={13} className="text-black/40" strokeWidth={1.5} />
                </div>
                <p className="text-[9px] text-black/45 leading-relaxed">
                  <strong className="text-black/60">Tipp:</strong> Ein normales A4-Druckerpapier reicht aus. Das Papier ist der Maßstab — Claude KI berechnet damit die Millimeter-genauen Maße.
                </p>
              </div>

              <div className="px-5 pt-4 pb-10 space-y-2.5">
                {lidarAvail ? (
                  <button onClick={() => { setLidarData({ right: null, left: null }); setLidarError(null); setPhase('lidar-right') }}
                    className="w-full py-4 bg-black text-white font-bold text-[12px] border-0 flex items-center justify-center gap-2 uppercase tracking-widest active:opacity-80"
                    style={{ letterSpacing: '0.12em' }}>
                    <Scan size={16} strokeWidth={1.5} />
                    LiDAR-Scan starten
                  </button>
                ) : null}
                <button onClick={() => setPhase('right-top')}
                  className={`w-full py-4 font-bold text-[12px] border-0 uppercase tracking-widest active:opacity-80 ${lidarAvail ? 'bg-[#f6f5f3] text-black/60' : 'bg-black text-white'}`}
                  style={{ letterSpacing: '0.12em' }}>
                  {lidarAvail ? 'Foto-Scan (4 Bilder)' : 'Scan starten'}
                </button>
                <button onClick={() => {
                  setPgMode(true); setPgStep(0)
                  setPgImgs({ right: [], left: [] })
                  setPhase('pg-0')
                }}
                  className="w-full py-4 font-bold text-[12px] border-0 bg-[#f6f5f3] text-black/60 flex items-center justify-center gap-2 uppercase tracking-widest active:opacity-80"
                  style={{ letterSpacing: '0.12em' }}>
                  8-Ansichten-Scan (±0,5 mm)
                </button>
                <button onClick={startDemo}
                  className="w-full py-3.5 bg-white text-black/35 font-semibold text-[11px] border border-black/8">
                  Demo-Modus (ohne Kamera)
                </button>
              </div>
            </div>
          )}

          {/* ── PROCESSING ── */}
          {phase === 'processing' && (
            <div className="flex-1 flex flex-col items-center justify-center px-8 gap-8">
              <div className="relative">
                <div className="w-24 h-24 bg-black flex items-center justify-center">
                  <span className="text-4xl">{progress < 20 ? '📷' : progress < 75 ? '🤖' : '📐'}</span>
                </div>
                <div className="absolute inset-0 border border-black/20 animate-ping" style={{ animationDuration: '2s' }} />
              </div>

              <div className="text-center w-full">
                <p className="text-[14px] font-bold text-black mb-1" style={{ letterSpacing: '0.05em', textTransform: 'uppercase' }}>KI analysiert 4 Bilder</p>
                <p className="text-[11px] text-black/40 min-h-[20px] mb-6">{aiStatus}</p>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] text-black/30 uppercase tracking-widest" style={{ letterSpacing: '0.15em' }}>Fortschritt</span>
                  <span className="text-[10px] font-bold text-black">{Math.round(progress)}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#f6f5f3] overflow-hidden">
                  <div className="h-full bg-black transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>

              <p className="text-[9px] text-black/25 text-center px-4">
                Claude KI erkennt das A4-Blatt und misst Länge, Breite und Gewölbe aus 4 Winkeln
              </p>
            </div>
          )}

          {/* ── PG-PROCESSING ── */}
          {phase === 'pg-processing' && (
            <div className="flex-1 flex flex-col items-center justify-center px-8 gap-8">
              <div className="relative">
                <div className="w-24 h-24 bg-black flex items-center justify-center">
                  <span className="text-4xl">
                    {progress < 30 ? '📸' : progress < 60 ? '🔺' : progress < 85 ? '📐' : '✅'}
                  </span>
                </div>
                <div className="absolute inset-0 border border-black/20 animate-ping" style={{ animationDuration: '2s' }} />
              </div>

              <div className="text-center w-full">
                <p className="text-[14px] font-bold text-black mb-1" style={{ letterSpacing: '0.05em', textTransform: 'uppercase' }}>3D-Rekonstruktion</p>
                <p className="text-[11px] text-black/40 min-h-[20px] mb-6">{aiStatus}</p>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] text-black/30 uppercase tracking-widest" style={{ letterSpacing: '0.15em' }}>Fortschritt</span>
                  <span className="text-[10px] font-bold text-black">{Math.round(progress)}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#f6f5f3] overflow-hidden">
                  <div className="h-full bg-black transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>

              <div className="w-full space-y-1.5">
                {[
                  { pct: 15,  label: '16 Fotos werden vorbereitet' },
                  { pct: 30,  label: 'A4-Kalibrierung & Silhouette-Segmentierung' },
                  { pct: 65,  label: 'Shape-from-Silhouettes 3D-Rekonstruktion' },
                  { pct: 85,  label: 'Maße aus 3D-Punktwolke berechnen' },
                ].map(({ pct, label }) => (
                  <div key={pct} className={`flex items-center gap-3 px-3.5 py-2.5 border transition-all ${
                    progress >= pct
                      ? 'bg-[#f6f5f3] border-black/8 text-black'
                      : 'bg-white border-black/5 text-black/30'
                  }`}>
                    <span className="text-[10px] font-medium">{label}</span>
                    {progress >= pct && <span className="ml-auto text-black/40 text-[9px]">✓</span>}
                  </div>
                ))}
              </div>

              <p className="text-[9px] text-black/25 text-center px-4">
                16 Aufnahmen aus 8 Winkeln → visueller Rumpf → sub-mm Maße
              </p>
            </div>
          )}

          {/* ── RESULT ── */}
          {phase === 'result' && result && (
            <div className="flex-1 overflow-y-auto">
              {/* Size hero header bar */}
              <div className="bg-black px-5 py-6 text-center">
                <p className="text-[8px] text-white/30 uppercase tracking-widest mb-2" style={{ letterSpacing: '0.2em' }}>Deine Schuhgröße</p>
                <p className="text-6xl font-bold text-white leading-none mb-1">{result.sizes.eu}</p>
                <p className="text-[11px] text-white/40 mb-3">EU · UK {result.sizes.uk} · US {result.sizes.us}</p>
                {result.isDemo ? (
                  <div className="inline-flex items-center gap-1.5 bg-amber-500/15 px-3 py-1.5">
                    <span className="text-[9px] text-amber-300 font-medium uppercase tracking-widest" style={{ letterSpacing: '0.12em' }}>Demo · Beispielwerte</span>
                  </div>
                ) : result.usedAI && (
                  <div className="inline-flex items-center gap-1.5 bg-white/8 px-3 py-1.5">
                    <span className="text-[9px] text-white/50 font-medium">Claude KI · 4-Foto A4-Scan</span>
                  </div>
                )}
              </div>

              <div className="px-5 pt-4 pb-10 space-y-4">
                {/* Save status */}
                {saved ? (
                  <div className="flex items-center gap-2.5 p-3.5 bg-[#f6f5f3] border border-black/5 text-black/60 text-[11px] font-medium">
                    <CheckCircle2 size={15} strokeWidth={1.5} /> In deinem Profil gespeichert
                  </div>
                ) : saveErr ? (
                  <div className="flex items-center gap-2.5 p-3.5 bg-[#f6f5f3] border border-black/5 text-red-600 text-[11px] font-medium">
                    <AlertCircle size={15} strokeWidth={1.5} /> {saveErr}
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 p-3.5 bg-[#f6f5f3] border border-black/5 text-black/40 text-[11px]">
                    <CloudUpload size={15} className="animate-pulse" strokeWidth={1.5} /> Wird gespeichert…
                  </div>
                )}

                {/* Measurements */}
                <div>
                  <p className="text-[9px] font-medium text-black/30 uppercase tracking-widest mb-2 px-1" style={{ letterSpacing: '0.15em' }}>Messwerte</p>
                  {[['Rechts', result.right], ['Links', result.left]].map(([label, m]) => (
                    <div key={label} className="border border-black/5 overflow-hidden mb-3">
                      <div className="px-4 py-2.5 bg-black border-b border-black/5">
                        <span className="text-[10px] font-semibold text-white uppercase tracking-widest" style={{ letterSpacing: '0.12em' }}>{label}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-0">
                        {[
                          { label: 'Länge',       value: m.length,       unit: 'mm' },
                          { label: 'Breite',       value: m.width,        unit: 'mm' },
                          { label: 'Ballenumfang', value: m.ball_girth,   unit: 'mm' },
                          { label: 'Ristumfang',   value: m.instep_girth, unit: 'mm' },
                          { label: 'Fersenumfang', value: m.heel_girth,   unit: 'mm' },
                          { label: 'Gewölbehöhe',  value: m.arch,         unit: 'mm' },
                          { label: 'Gelenkweite',  value: m.waist_girth,  unit: 'mm' },
                          { label: 'Knöchel',      value: m.ankle_girth,  unit: 'mm' },
                        ].map(({ label: lbl, value, unit }, i) => (
                          <div key={lbl} className={`px-4 py-3 flex items-center justify-between ${
                            i % 2 === 0 ? 'border-r border-black/5' : ''
                          } ${i >= 2 ? 'border-t border-black/5' : ''}`}>
                            <span className="text-[10px] text-black/35">{lbl}</span>
                            <span className="text-[11px] font-bold text-black">
                              {value != null ? `${Number(value).toFixed(1)} mm` : '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 3D Preview */}
                <div>
                  <p className="text-[9px] font-medium text-black/30 uppercase tracking-widest mb-2 px-1" style={{ letterSpacing: '0.15em' }}>3D-Vorschau</p>
                  <div className="overflow-hidden" style={{ background: '#111111' }}>
                    <div className="grid grid-cols-2 gap-px" style={{ background: '#222' }}>
                      <div>
                        <FootMini3D length={result.right.length} width={result.right.width} arch={result.right.arch ?? 14} label="Right" />
                        <p className="text-center text-[9px] text-white/40 py-2 uppercase tracking-widest" style={{ letterSpacing: '0.15em' }}>Rechts</p>
                      </div>
                      <div>
                        <FootMini3D length={result.left.length} width={result.left.width} arch={result.left.arch ?? 13} label="Left" />
                        <p className="text-center text-[9px] text-white/40 py-2 uppercase tracking-widest" style={{ letterSpacing: '0.15em' }}>Links</p>
                      </div>
                    </div>

                    {/* Shoe Last / STL / OBJ Export — admin/curator only */}
                    {(user?.role === 'admin' || user?.role === 'curator') && (
                      <div className="p-3 border-t border-white/5 space-y-2">
                        {/* Shoe type selector */}
                        <div className="flex items-center gap-2 mb-2">
                          <label className="text-[9px] text-white/40 uppercase tracking-widest" style={{ letterSpacing: '0.12em' }}>Schuhtyp:</label>
                          <select
                            value={lastShoeType}
                            onChange={e => setLastShoeType(e.target.value)}
                            className="flex-1 bg-white/5 border border-white/10 px-2 py-1.5 text-xs text-gray-300">
                            {Object.entries(SHOE_TYPES).map(([key, { name }]) => (
                              <option key={key} value={key}>{name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Export format selector */}
                        <div className="flex items-center gap-2 mb-2">
                          <label className="text-[9px] text-white/40 uppercase tracking-widest" style={{ letterSpacing: '0.12em' }}>Format:</label>
                          <div className="flex gap-1">
                            {['stl', 'obj'].map(fmt => (
                              <button key={fmt}
                                onClick={() => setLastFormat(fmt)}
                                className={`px-3 py-1 text-xs font-semibold border ${
                                  lastFormat === fmt
                                    ? 'bg-white/15 border-white/30 text-white'
                                    : 'bg-white/5 border-white/10 text-gray-400'
                                }`}>
                                .{fmt.toUpperCase()}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Export buttons */}
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { side: 'right', label: 'Leisten Rechts', m: result.right },
                            { side: 'left',  label: 'Leisten Links',  m: result.left  },
                          ].map(({ side, label, m }) => (
                            <button key={side}
                              onClick={() => {
                                const scanData = {
                                  length: m.length, width: m.width, arch: m.arch,
                                  foot_height: m.foot_height, ball_girth: m.ball_girth,
                                  instep_girth: m.instep_girth, waist_girth: m.waist_girth,
                                  heel_girth: m.heel_girth, ankle_girth: m.ankle_girth,
                                  crossSections: m.crossSections ?? null,
                                }
                                const customPreset = shoeTypeSettings?.[lastShoeType] ?? null
                                const geo = buildShoeLastGeo(scanData, { shoeType: lastShoeType, side, customPreset })
                                if (lastFormat === 'obj') {
                                  downloadOBJ(geo, result.sizes.eu, side)
                                } else {
                                  downloadLastSTL(geo, result.sizes.eu, side)
                                }
                              }}
                              className="flex items-center justify-between gap-2 bg-white/5 border border-white/8 px-3 py-2.5">
                              <span className="text-xs font-semibold text-gray-300">{label}</span>
                              <Download size={13} className="text-white/40 flex-shrink-0" strokeWidth={1.5} />
                            </button>
                          ))}
                        </div>

                        {/* Fuss-STL (raw foot, not last) */}
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
                          {[
                            { side: 'right', label: 'Fuß-STL Rechts', m: result.right },
                            { side: 'left',  label: 'Fuß-STL Links',  m: result.left  },
                          ].map(({ side, label, m }) => (
                            <button key={`foot-${side}`}
                              onClick={async () => { const geo = await buildFootGeoAsync(m.length, m.width, m.arch, side); downloadSTL(geo, result.sizes.eu, side) }}
                              className="flex items-center justify-between gap-2 bg-white/5 border border-white/8 px-3 py-2">
                              <span className="text-[10px] text-gray-400">{label}</span>
                              <Download size={11} className="text-gray-500 flex-shrink-0" strokeWidth={1.5} />
                            </button>
                          ))}
                        </div>

                        {/* Maßblatt download */}
                        <button
                          onClick={() => {
                            const blattR = generateMassblatt(
                              { length: result.right.length, width: result.right.width, arch: result.right.arch,
                                foot_height: result.right.foot_height, ball_girth: result.right.ball_girth,
                                instep_girth: result.right.instep_girth, waist_girth: result.right.waist_girth,
                                heel_girth: result.right.heel_girth, ankle_girth: result.right.ankle_girth },
                              { shoeType: lastShoeType, side: 'right', customPreset: shoeTypeSettings?.[lastShoeType] ?? null }
                            )
                            const blattL = generateMassblatt(
                              { length: result.left.length, width: result.left.width, arch: result.left.arch,
                                foot_height: result.left.foot_height, ball_girth: result.left.ball_girth,
                                instep_girth: result.left.instep_girth, waist_girth: result.left.waist_girth,
                                heel_girth: result.left.heel_girth, ankle_girth: result.left.ankle_girth },
                              { shoeType: lastShoeType, side: 'left', customPreset: shoeTypeSettings?.[lastShoeType] ?? null }
                            )
                            const text = JSON.stringify({ rechts: blattR, links: blattL }, null, 2)
                            const blob = new Blob([text], { type: 'application/json' })
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url; a.download = `massblatt_EU${result.sizes.eu}_${Date.now()}.json`
                            a.click(); URL.revokeObjectURL(url)
                          }}
                          className="w-full flex items-center justify-between bg-white/5 border border-white/8 px-3 py-2.5">
                          <span className="text-xs font-semibold text-gray-300">Maßblatt herunterladen</span>
                          <Download size={13} className="text-white/40 flex-shrink-0" strokeWidth={1.5} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes input — saves to user profile */}
                <div>
                  <p className="text-[9px] font-medium text-black/30 uppercase tracking-widest mb-2 px-1" style={{ letterSpacing: '0.15em' }}>
                    {footNotes && !notesConfirmed ? 'Deine hinterlegten Notizen — bestätigen oder anpassen' : 'Notizen'}
                  </p>
                  <textarea
                    value={scanNotes}
                    onChange={e => setScanNotes(e.target.value)}
                    maxLength={1000}
                    className="w-full border border-black/8 bg-[#f6f5f3] p-3 text-[11px] text-black leading-relaxed resize-none focus:outline-none focus:border-black/20"
                    rows={3}
                    placeholder="Persönliche Notizen zu deinen Füßen…"
                  />
                  {scanNotes.trim() && (
                    <button
                      onClick={async () => {
                        await saveFootNotes(scanNotes)
                        setNotesConfirmed(true)
                        // Also save to scan record
                        const scans = await apiFetch('/api/scans/mine').catch(() => [])
                        if (scans?.[0]?.id) {
                          await apiFetch(`/api/scans/${scans[0].id}/notes`, { method: 'PUT', body: JSON.stringify({ notes: scanNotes }) })
                          refreshScan()
                        }
                      }}
                      className="mt-1.5 px-3 py-1.5 text-[9px] text-white bg-black border-0 font-semibold"
                    >{footNotes && !notesConfirmed ? 'Bestätigen & Speichern' : 'Notiz speichern'}</button>
                  )}
                </div>

                <button onClick={() => navigate('/collection', { replace: true })}
                  className="w-full py-4 bg-black text-white font-bold text-[12px] border-0 uppercase tracking-widest active:opacity-80"
                  style={{ letterSpacing: '0.12em' }}>
                  Kollektion entdecken
                </button>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  )
}
