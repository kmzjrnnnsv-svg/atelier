/**
 * MyScans.jsx — Eigene Fuß-Scan-Übersicht für alle User
 *
 * Zeigt die gespeicherten Fußscans des eingeloggten Users.
 * Jeder Scan zeigt: Datum, EU-Größe, Genauigkeit, Messwerte (0,1 mm)
 * und eine interaktive 3D-Vorschau beider Füße.
 *
 * Admin/Curator erhalten zusätzlich STL-Download-Buttons.
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Footprints, Box, Ruler, Calendar,
  RefreshCw, ChevronDown, ChevronUp, Download,
  Scan, AlertCircle, Loader,
} from 'lucide-react'
import * as THREE from 'three'
import { apiFetch } from '../hooks/useApi'
import { useAuth } from '../context/AuthContext'
import { buildFootGeoAsync, estimateSTLSizeKB, downloadSTL } from '../utils/footSTL'
import { SHOE_TYPES, buildShoeLastGeo, downloadSTL as downloadLastSTL, downloadOBJ } from '../utils/footLast'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr.replace(' ', 'T') + 'Z')
  return d.toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function refLabel(type) {
  return type === 'card' ? 'Bankkarte' : type === 'a4' ? 'A4-Blatt' : type || '—'
}

// ─── Mini 3D Foot Viewer ──────────────────────────────────────────────────────
function FootMiniPreview({ length, width, arch, side }) {
  const mountRef = useRef(null)

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    const w = el.clientWidth
    const h = el.clientHeight || 100
    const scene  = new THREE.Scene()
    scene.background = new THREE.Color(0x0d1117)

    // Mirror-pair side view: right foot camera on -Y, left foot camera on +Y
    const isLeft = side === 'left'
    const camY   = isLeft ? 380 : -380
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 2000)
    camera.up.set(0, 0, 1)               // Z is up when looking along Y axis
    camera.position.set(0, camY, 0)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    el.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0xffffff, 0.5))
    const dl = new THREE.DirectionalLight(0xffffff, 1.1)
    dl.position.set(150, isLeft ? 300 : -300, 200)
    scene.add(dl)
    const rl = new THREE.DirectionalLight(0x2dd4bf, 0.4)
    rl.position.set(-150, isLeft ? 200 : -200, -100)
    scene.add(rl)

    let cancelled = false

    buildFootGeoAsync(length, width, arch, side).then(geo => {
      if (cancelled) { geo.dispose(); return }
      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({ color: 0xd4a88a, roughness: 0.55, metalness: 0.05 })
      )
      const wire = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({ color: 0x2dd4bf, wireframe: true, transparent: true, opacity: 0.06 })
      )
      scene.add(mesh); scene.add(wire)
      renderer.render(scene, camera)
    })

    return () => {
      cancelled = true
      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [length, width, arch, side])

  return (
    <div className="relative rounded-xl overflow-hidden" style={{ height: 150 }}>
      <div ref={mountRef} className="w-full h-full" />
      <div className="absolute bottom-1.5 left-0 right-0 text-center pointer-events-none">
        <span className="text-[8px] uppercase tracking-widest text-teal-400 font-semibold">
          {side}
        </span>
      </div>
    </div>
  )
}

// ─── Single Scan Card ─────────────────────────────────────────────────────────
function ScanCard({ scan, canDownload }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-gray-900 border border-white/8 rounded-2xl overflow-hidden">
      {/* Collapsed header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left bg-transparent border-0"
      >
        {/* Size badge */}
        <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex flex-col items-center justify-center flex-shrink-0">
          <span className="text-[7px] uppercase tracking-widest text-teal-500 font-bold">EU</span>
          <span className="text-base font-bold text-white leading-tight">{scan.eu_size}</span>
        </div>

        {/* Meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Calendar size={9} className="text-gray-600" />
            <span className="text-[9px] text-gray-500">{fmt(scan.created_at)}</span>
          </div>
          <p className="text-[11px] font-semibold text-white">
            EU {scan.eu_size} · UK {scan.uk_size} · US {scan.us_size}
          </p>
          <p className="text-[9px] text-gray-500 mt-0.5">
            Genauigkeit {Number(scan.accuracy).toFixed(1)}% · {refLabel(scan.reference_type)}
          </p>
        </div>

        {expanded
          ? <ChevronUp size={15} className="text-gray-600 flex-shrink-0" />
          : <ChevronDown size={15} className="text-gray-600 flex-shrink-0" />
        }
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-white/5">
          {/* Measurements table — basic dimensions */}
          <div className="bg-black/30 rounded-xl overflow-hidden mt-3 mb-1">
            <div className="grid grid-cols-4 px-3 py-2 border-b border-white/5">
              {['', 'Länge', 'Breite', 'Gewölbe'].map(h => (
                <span key={h} className="text-[8px] uppercase tracking-widest text-gray-600 text-center first:text-left">
                  {h}
                </span>
              ))}
            </div>
            {[
              { label: 'Rechts', l: scan.right_length, w: scan.right_width, a: scan.right_arch },
              { label: 'Links',  l: scan.left_length,  w: scan.left_width,  a: scan.left_arch  },
            ].map(({ label, l, w, a }) => (
              <div key={label} className="grid grid-cols-4 px-3 py-2.5 border-b border-white/5 last:border-0">
                <span className="text-[10px] font-semibold text-white">{label}</span>
                <span className="text-[10px] text-gray-400 text-center">{Number(l).toFixed(1)} mm</span>
                <span className="text-[10px] text-gray-400 text-center">{Number(w).toFixed(1)} mm</span>
                <span className="text-[10px] text-gray-400 text-center">{Number(a).toFixed(1)} mm</span>
              </div>
            ))}
          </div>

          {/* Girth measurements (if available) */}
          {(scan.right_ball_girth || scan.left_ball_girth) && (
            <div className="bg-black/30 rounded-xl overflow-hidden mb-3">
              <div className="px-3 py-2 border-b border-white/5">
                <span className="text-[8px] uppercase tracking-widest text-gray-600">Umfänge (mm)</span>
              </div>
              {[
                { label: 'Rechts', ball: scan.right_ball_girth, instep: scan.right_instep_girth, heel: scan.right_heel_girth, waist: scan.right_waist_girth, ankle: scan.right_ankle_girth },
                { label: 'Links',  ball: scan.left_ball_girth,  instep: scan.left_instep_girth,  heel: scan.left_heel_girth,  waist: scan.left_waist_girth,  ankle: scan.left_ankle_girth  },
              ].map(({ label, ball, instep, heel, waist, ankle }) => (
                <div key={label} className="px-3 py-2 border-b border-white/5 last:border-0">
                  <span className="text-[10px] font-semibold text-white block mb-1">{label}</span>
                  <div className="grid grid-cols-5 gap-1">
                    {[
                      { name: 'Ballen', v: ball },
                      { name: 'Taille', v: waist },
                      { name: 'Rist',   v: instep },
                      { name: 'Ferse',  v: heel },
                      { name: 'Knöchel', v: ankle },
                    ].map(({ name, v }) => (
                      <div key={name} className="text-center">
                        <span className="text-[7px] uppercase tracking-widest text-gray-600 block">{name}</span>
                        <span className="text-[10px] text-gray-400">{v != null ? Number(v).toFixed(1) : '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 3D previews */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="rounded-xl overflow-hidden border border-white/5">
              <FootMiniPreview
                length={Number(scan.right_length)}
                width={Number(scan.right_width)}
                arch={Number(scan.right_arch)}
                side="Rechts"
              />
            </div>
            <div className="rounded-xl overflow-hidden border border-white/5">
              <FootMiniPreview
                length={Number(scan.left_length)}
                width={Number(scan.left_width)}
                arch={Number(scan.left_arch)}
                side="Links"
              />
            </div>
          </div>

          {/* Shoe Last Export — nur Admin/Curator */}
          {canDownload && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <select
                  defaultValue="oxford"
                  onChange={e => { scan._shoeType = e.target.value }}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-gray-300"
                >
                  {Object.entries(SHOE_TYPES).map(([key, { name }]) => (
                    <option key={key} value={key}>{name}</option>
                  ))}
                </select>
                <div className="flex gap-1">
                  {['stl', 'obj'].map(fmt => (
                    <button key={fmt}
                      onClick={() => { scan._fmt = fmt }}
                      className="px-2 py-1 rounded text-[9px] font-semibold bg-white/5 border border-white/10 text-gray-400 hover:bg-teal-500/20 hover:text-teal-300">
                      .{fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { side: 'right', label: 'Leisten Rechts', l: scan.right_length, w: scan.right_width, a: scan.right_arch, fh: scan.right_foot_height, bg: scan.right_ball_girth, ig: scan.right_instep_girth, wg: scan.right_waist_girth, hg: scan.right_heel_girth, ag: scan.right_ankle_girth },
                  { side: 'left',  label: 'Leisten Links',  l: scan.left_length,  w: scan.left_width,  a: scan.left_arch,  fh: scan.left_foot_height,  bg: scan.left_ball_girth,  ig: scan.left_instep_girth,  wg: scan.left_waist_girth,  hg: scan.left_heel_girth,  ag: scan.left_ankle_girth },
                ].map(({ side, label, l, w, a, fh, bg, ig, wg, hg, ag }) => (
                  <button
                    key={side}
                    onClick={() => {
                      const scanData = { length: Number(l), width: Number(w), arch: Number(a), foot_height: fh ? Number(fh) : undefined, ball_girth: bg ? Number(bg) : undefined, instep_girth: ig ? Number(ig) : undefined, waist_girth: wg ? Number(wg) : undefined, heel_girth: hg ? Number(hg) : undefined, ankle_girth: ag ? Number(ag) : undefined }
                      const st = scan._shoeType ?? 'oxford'
                      const geo = buildShoeLastGeo(scanData, { shoeType: st, side, customPreset: shoeTypeSettings?.[st] ?? null })
                      const format = scan._fmt ?? 'stl'
                      if (format === 'obj') downloadOBJ(geo, scan.eu_size, side)
                      else downloadLastSTL(geo, scan.eu_size, side)
                    }}
                    className="flex items-center justify-between gap-2 bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 active:bg-white/10 transition-colors"
                  >
                    <div className="text-left">
                      <p className="text-[10px] font-bold text-white">{label}</p>
                      <p className="text-[8px] text-gray-600 mt-0.5">Schuhleisten</p>
                    </div>
                    <Download size={13} className="text-teal-400 flex-shrink-0" strokeWidth={1.5} />
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { side: 'right', label: 'Fuß-STL R', l: scan.right_length, w: scan.right_width, a: scan.right_arch },
                  { side: 'left',  label: 'Fuß-STL L', l: scan.left_length,  w: scan.left_width,  a: scan.left_arch  },
                ].map(({ side, label, l, w, a }) => (
                  <button key={`foot-${side}`}
                    onClick={async () => { const geo = await buildFootGeoAsync(Number(l), Number(w), Number(a), side); downloadSTL(geo, scan.eu_size, side) }}
                    className="flex items-center justify-between gap-2 bg-white/5 border border-white/8 rounded-xl px-2 py-2 active:bg-white/10 transition-colors">
                    <p className="text-[9px] text-gray-400">{label}</p>
                    <Download size={11} className="text-gray-500 flex-shrink-0" strokeWidth={1.5} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MyScans() {
  const navigate       = useNavigate()
  const { user }       = useAuth()
  const [scans,   setScans]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const canDownload = user?.role === 'admin' || user?.role === 'curator'
  const [shoeTypeSettings, setShoeTypeSettings] = useState(null)

  // Load CMS shoe type settings for export
  useEffect(() => {
    if (!canDownload) return
    apiFetch('/api/scans/shoe-types').then(data => {
      const map = {}
      for (const t of data) map[t.shoe_type] = t
      setShoeTypeSettings(map)
    }).catch(() => {})
  }, [canDownload])

  const load = () => {
    setLoading(true); setError(null)
    apiFetch('/api/scans/mine')
      .then(data => { setScans(data); setLoading(false) })
      .catch(() => { setError('Scans konnten nicht geladen werden.'); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  return (
    <div className="flex flex-col h-full bg-gray-950 text-white overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 pt-14 pb-4 flex-shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="w-11 h-11 rounded-full bg-white/5 border border-white/8 flex items-center justify-center"
        >
          <ArrowLeft size={19} strokeWidth={1.5} className="text-gray-300" />
        </button>
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.22em] font-bold text-white">Meine Scans</p>
          {!loading && scans.length > 0 && (
            <p className="text-[9px] text-gray-500 mt-0.5">{scans.length} Scan{scans.length !== 1 ? 's' : ''} gespeichert</p>
          )}
        </div>
        <button
          onClick={load}
          className="w-11 h-11 rounded-full bg-white/5 border border-white/8 flex items-center justify-center"
        >
          <RefreshCw size={16} strokeWidth={1.5} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Loader size={28} className="text-teal-400 animate-spin" strokeWidth={1.5} />
            <p className="text-[10px] uppercase tracking-widest text-gray-600">Scans werden geladen…</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <AlertCircle size={24} className="text-red-400" strokeWidth={1.5} />
            </div>
            <p className="text-sm text-gray-400 text-center">{error}</p>
            <button
              onClick={load}
              className="px-5 py-2.5 rounded-xl bg-white/8 border border-white/10 text-[11px] font-bold uppercase tracking-widest text-white flex items-center gap-2"
            >
              <RefreshCw size={13} /> Erneut versuchen
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && scans.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 gap-5">
            <div className="w-20 h-20 rounded-full bg-white/5 border border-white/8 flex items-center justify-center">
              <Footprints size={32} className="text-gray-600" strokeWidth={1.2} />
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-white mb-1">Noch keine Scans</p>
              <p className="text-[11px] text-gray-500 leading-relaxed max-w-xs">
                Starte deinen ersten 3D Fußscan, um präzise Maße und ein 3D-Modell zu erhalten.
              </p>
            </div>
            <button
              onClick={() => navigate('/scan')}
              className="px-6 py-3 rounded-2xl bg-white text-black font-bold text-[11px] uppercase tracking-widest flex items-center gap-2"
            >
              <Scan size={14} /> Scan starten
            </button>
          </div>
        )}

        {/* Scan list */}
        {!loading && !error && scans.length > 0 && (
          <div className="space-y-3">
            {/* Info banner */}
            <div className="flex items-center gap-2 bg-teal-500/8 border border-teal-500/15 rounded-xl px-3.5 py-2.5 mb-2">
              <Box size={13} className="text-teal-400 flex-shrink-0" strokeWidth={1.5} />
              <p className="text-[9px] text-gray-400 leading-relaxed">
                3D-Modell · Sub-Pixel-Präzision ±0,1 mm · Tippe auf einen Scan für Details &amp; 3D-Vorschau
              </p>
            </div>

            {scans.map(scan => (
              <ScanCard key={scan.id} scan={scan} canDownload={canDownload} />
            ))}

            {/* New scan CTA */}
            <button
              onClick={() => navigate('/scan')}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-white/4 border border-dashed border-white/10 text-gray-500 text-[11px] font-semibold"
            >
              <Scan size={14} />
              Neuen Scan starten
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
