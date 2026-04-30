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
    <div className="relative overflow-hidden" style={{ height: 150 }}>
      <div ref={mountRef} className="w-full h-full" />
      <div className="absolute bottom-1.5 left-0 right-0 text-center pointer-events-none">
        <span className="text-[8px] uppercase tracking-widest text-teal-400 font-semibold" style={{ letterSpacing: '0.18em' }}>
          {side}
        </span>
      </div>
    </div>
  )
}

// ─── Single Scan Card ─────────────────────────────────────────────────────────
function ScanCard({ scan, canDownload, onNotesUpdate }) {
  const [expanded, setExpanded] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [noteText, setNoteText] = useState(scan.notes || '')

  return (
    <div className="bg-white border border-black/5 overflow-hidden">
      {/* Collapsed header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left bg-transparent border-0"
      >
        {/* Size badge */}
        <div className="w-12 h-12 bg-black flex flex-col items-center justify-center flex-shrink-0">
          <span className="text-[7px] uppercase tracking-widest text-white/50 font-bold" style={{ letterSpacing: '0.15em' }}>EU</span>
          <span className="text-base font-bold text-white leading-tight">{scan.eu_size}</span>
        </div>

        {/* Meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Calendar size={9} className="text-black/30" strokeWidth={1.5} />
            <span className="text-[9px] text-black/35">{fmt(scan.created_at)}</span>
          </div>
          <p className="text-[11px] font-semibold text-black">
            EU {scan.eu_size} · UK {scan.uk_size} · US {scan.us_size}
          </p>
          <p className="text-[9px] text-black/40 mt-0.5">
            Genauigkeit {Number(scan.accuracy).toFixed(1)}% · {refLabel(scan.reference_type)}
          </p>
        </div>

        {expanded
          ? <ChevronUp size={15} className="text-black/30 flex-shrink-0" strokeWidth={1.5} />
          : <ChevronDown size={15} className="text-black/30 flex-shrink-0" strokeWidth={1.5} />
        }
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-black/5">
          {/* Measurements table — basic dimensions */}
          <div className="bg-white border border-black/5 overflow-hidden mt-3 mb-1">
            <div className="grid grid-cols-4 px-3 py-2 border-b border-black/5 bg-black">
              {['', 'Breite', 'Gewölbe', 'Fußhöhe'].map(h => (
                <span key={h} className="text-[8px] uppercase tracking-widest text-white/50 text-center first:text-left" style={{ letterSpacing: '0.15em' }}>
                  {h}
                </span>
              ))}
            </div>
            {[
              { label: 'Rechts', w: scan.right_width, a: scan.right_arch, fh: scan.right_foot_height },
              { label: 'Links',  w: scan.left_width,  a: scan.left_arch,  fh: scan.left_foot_height  },
            ].map(({ label, w, a, fh }) => (
              <div key={label} className="grid grid-cols-4 px-3 py-2.5 border-b border-black/5 last:border-0">
                <span className="text-[10px] font-semibold text-black">{label}</span>
                <span className="text-[10px] text-black/45 text-center">
                  {Number(w).toFixed(1)}
                  <span className="text-[7px] text-black/20 block">±1.5 mm</span>
                </span>
                <span className="text-[10px] text-black/45 text-center">
                  {Number(a).toFixed(1)}
                  <span className="text-[7px] text-black/20 block">±4 mm</span>
                </span>
                <span className="text-[10px] text-black/45 text-center">
                  {fh != null ? Number(fh).toFixed(1) : '—'}
                  {fh != null && <span className="text-[7px] text-black/20 block">±4 mm</span>}
                </span>
              </div>
            ))}
          </div>

          {/* Girth measurements (if available) */}
          {(scan.right_ball_girth || scan.left_ball_girth) && (
            <div className="bg-white border border-black/5 overflow-hidden mb-3">
              <div className="px-3 py-2 border-b border-black/5 bg-black">
                <span className="text-[8px] uppercase tracking-widest text-white/50" style={{ letterSpacing: '0.15em' }}>Umfänge (mm)</span>
              </div>
              {[
                { label: 'Rechts', heel: scan.right_heel_girth, waist: scan.right_waist_girth, ankle: scan.right_ankle_girth },
                { label: 'Links',  heel: scan.left_heel_girth,  waist: scan.left_waist_girth,  ankle: scan.left_ankle_girth  },
              ].map(({ label, heel, waist, ankle }) => (
                <div key={label} className="px-3 py-2 border-b border-black/5 last:border-0">
                  <span className="text-[10px] font-semibold text-black block mb-1">{label}</span>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { name: 'Taille',  v: waist,  acc: '±2.5 mm' },
                      { name: 'Ferse',   v: heel,   acc: '±7 mm' },
                      { name: 'Knöchel', v: ankle,  acc: '±10 mm' },
                    ].map(({ name, v, acc }) => (
                      <div key={name} className="text-center">
                        <span className="text-[7px] uppercase tracking-widest text-black/30 block" style={{ letterSpacing: '0.15em' }}>{name}</span>
                        <span className="text-[10px] text-black/50">{v != null ? Number(v).toFixed(1) : '—'}</span>
                        {v != null && <span className="text-[7px] text-black/20 block">{acc}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Notes */}
          <div className="mb-3">
            {editingNotes ? (
              <div className="space-y-2">
                <textarea
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  maxLength={500}
                  className="w-full border border-black/10 bg-white p-3 text-[10px] text-black leading-relaxed resize-none focus:outline-none focus:border-black/30"
                  rows={3}
                  placeholder="Persönliche Notizen..."
                  autoFocus
                />
                <div className="flex items-center justify-between">
                  <span className="text-[8px] text-black/30">{noteText.length}/500</span>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingNotes(false)} className="px-2.5 py-1 text-[9px] text-black/40 bg-transparent border border-black/10">Abbrechen</button>
                    <button
                      onClick={async () => {
                        await apiFetch(`/api/scans/${scan.id}/notes`, { method: 'PUT', body: JSON.stringify({ notes: noteText }) })
                        scan.notes = noteText
                        if (onNotesUpdate) onNotesUpdate()
                        setEditingNotes(false)
                      }}
                      className="px-2.5 py-1 text-[9px] text-white bg-black border-0 font-semibold"
                    >Speichern</button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { setNoteText(scan.notes || ''); setEditingNotes(true) }}
                className="w-full text-left bg-white border border-black/5 p-3 group"
              >
                {scan.notes ? (
                  <p className="text-[9px] text-black/50 italic leading-relaxed">"{scan.notes}"</p>
                ) : (
                  <p className="text-[9px] text-black/25">Tippe, um Notizen hinzuzufügen…</p>
                )}
              </button>
            )}
          </div>

          {/* 3D previews */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="overflow-hidden border border-black/5">
              <FootMiniPreview
                length={Number(scan.right_length)}
                width={Number(scan.right_width)}
                arch={Number(scan.right_arch)}
                side="Rechts"
              />
            </div>
            <div className="overflow-hidden border border-black/5">
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
                  className="flex-1 bg-black/3 border border-black/8 px-2 py-1.5 text-[10px] text-black/60"
                >
                  {Object.entries(SHOE_TYPES).map(([key, { name }]) => (
                    <option key={key} value={key}>{name}</option>
                  ))}
                </select>
                <div className="flex gap-1">
                  {['stl', 'obj'].map(fmt => (
                    <button key={fmt}
                      onClick={() => { scan._fmt = fmt }}
                      className="px-2 py-1 text-[9px] font-semibold bg-black/3 border border-black/8 text-black/50 hover:bg-black hover:text-white transition-colors">
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
                    className="flex items-center justify-between gap-2 bg-white border border-black/8 px-3 py-2.5 active:bg-black/5 transition-colors"
                  >
                    <div className="text-left">
                      <p className="text-[10px] font-bold text-black">{label}</p>
                      <p className="text-[8px] text-black/30 mt-0.5" style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>Schuhleisten</p>
                    </div>
                    <Download size={13} className="text-black/40 flex-shrink-0" strokeWidth={1.5} />
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
                    className="flex items-center justify-between gap-2 bg-white border border-black/8 px-2 py-2 active:bg-black/5 transition-colors">
                    <p className="text-[9px] text-black/40">{label}</p>
                    <Download size={11} className="text-black/30 flex-shrink-0" strokeWidth={1.5} />
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
    <div className="flex flex-col min-h-screen bg-white">

      {/* ── Header ── */}
      <div className="bg-white px-5 pt-4 pb-4 border-b border-black/5 flex-shrink-0">
        <div className="flex items-center justify-end">
          <button
            onClick={load}
            className="bg-transparent border-0 p-0"
          >
            <RefreshCw size={18} strokeWidth={1.5} className={`text-black/40 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {!loading && scans.length > 0 && (
          <p className="text-[10px] text-black/35 mt-2 text-center">{scans.length} Scan{scans.length !== 1 ? 's' : ''} gespeichert</p>
        )}
      </div>

      {/* ── Content ── */}
      <div className="flex-1">

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Loader size={24} className="text-black/40 animate-spin" strokeWidth={1.5} />
            <p className="text-[10px] uppercase tracking-widest text-black/30" style={{ letterSpacing: '0.15em' }}>Scans werden geladen…</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center h-64 gap-4 px-8">
            <div className="w-14 h-14 bg-black/3 flex items-center justify-center">
              <AlertCircle size={24} className="text-black/30" strokeWidth={1.5} />
            </div>
            <p className="text-[11px] text-black/40 text-center">{error}</p>
            <button
              onClick={load}
              className="px-5 py-2.5 bg-black text-white text-[11px] font-bold uppercase tracking-widest border-0 flex items-center gap-2"
              style={{ letterSpacing: '0.15em' }}
            >
              <RefreshCw size={13} strokeWidth={1.5} /> Erneut versuchen
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && scans.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 gap-5 px-8">
            <div className="w-20 h-20 bg-black/3 flex items-center justify-center">
              <Footprints size={32} className="text-black/20" strokeWidth={1.2} />
            </div>
            <div className="text-center">
              <p className="text-[13px] font-semibold text-black mb-1" style={{ letterSpacing: '0.05em', textTransform: 'uppercase' }}>Noch keine Scans</p>
              <p className="text-[10px] text-black/40 leading-relaxed max-w-xs">
                Starte deinen ersten 3D Fußscan, um präzise Maße und ein 3D-Modell zu erhalten.
              </p>
            </div>
            <button
              onClick={() => navigate('/scan')}
              className="px-6 py-3 bg-black text-white font-bold text-[11px] uppercase tracking-widest border-0 flex items-center gap-2"
              style={{ letterSpacing: '0.15em' }}
            >
              <Scan size={14} strokeWidth={1.5} /> Scan starten
            </button>
          </div>
        )}

        {/* Scan list */}
        {!loading && !error && scans.length > 0 && (
          <div className="px-4 pt-3 pb-6 space-y-3">
            {/* Info banner */}
            <div className="flex items-center gap-2 bg-black/3 border border-black/5 px-3.5 py-2.5 mb-2">
              <Box size={13} className="text-black/30 flex-shrink-0" strokeWidth={1.5} />
              <p className="text-[9px] text-black/40 leading-relaxed">
                3D-Modell · Sub-Pixel-Präzision ±0,1 mm · Tippe auf einen Scan für Details &amp; 3D-Vorschau
              </p>
            </div>

            {scans.map(scan => (
              <ScanCard key={scan.id} scan={scan} canDownload={canDownload} onNotesUpdate={load} />
            ))}

            {/* New scan CTA */}
            <button
              onClick={() => navigate('/scan')}
              className="w-full flex items-center justify-center gap-2 py-4 bg-white border border-dashed border-black/10 text-black/40 text-[11px] font-semibold uppercase tracking-widest"
              style={{ letterSpacing: '0.12em' }}
            >
              <Scan size={14} strokeWidth={1.5} />
              Neuen Scan starten
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
