/**
 * ScansPanel.jsx — Benutzer-Scan-Datenbank
 *
 * Zeigt alle Fußscans gruppiert nach Benutzer.
 * Admin/Curator können STL-Modelle herunterladen und Scans löschen.
 */

import { useState, useEffect, useRef } from 'react'
import * as THREE from 'three'
import {
 Footprints, Trash2, RefreshCw, User, Calendar, Ruler,
 ChevronDown, ChevronUp, Download, Search, Box,
 LayoutList, Users, TrendingUp, CheckCircle2, AlertCircle,
 Brain, Filter, ImageIcon, Edit3, X as XIcon,
} from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { buildFootGeo, estimateSTLSizeKB, downloadSTL } from '../../utils/footSTL'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(dateStr) {
 if (!dateStr) return '—'
 const d = new Date(dateStr.replace(' ', 'T') + 'Z')
 return d.toLocaleString('de-DE', {
 day: '2-digit', month: '2-digit', year: 'numeric',
 hour: '2-digit', minute: '2-digit',
 })
}

function fmtDate(dateStr) {
 if (!dateStr) return '—'
 const d = new Date(dateStr.replace(' ', 'T') + 'Z')
 return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function roleBadge(role) {
 if (role === 'admin') return 'bg-black text-white border-black/20'
 if (role === 'curator') return 'bg-black/15 text-black/60 border-black/10'
 return 'bg-black/5 text-black/45 border-black/10'
}

// Group scans by user
function groupByUser(scans) {
 const map = {}
 for (const scan of scans) {
 if (!map[scan.user_id]) {
 map[scan.user_id] = {
 user_id: scan.user_id,
 user_name: scan.user_name,
 user_email: scan.user_email,
 user_role: scan.user_role,
 scans: [],
 }
 }
 map[scan.user_id].scans.push(scan)
 }
 // Sort each user's scans newest first
 for (const u of Object.values(map)) {
 u.scans.sort((a, b) => b.id - a.id)
 }
 return Object.values(map).sort((a, b) => b.scans[0].id - a.scans[0].id)
}

// ─── Inline 3D mini-preview ───────────────────────────────────────────────────
function FootMini({ length, width, arch }) {
 const mountRef = useRef(null)
 useEffect(() => {
 const el = mountRef.current
 if (!el) return
 const w = el.clientWidth, h = el.clientHeight
 const scene = new THREE.Scene()
 scene.background = new THREE.Color(0xfafaf9)
 const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 2000)
 camera.position.set(0, -300, 90); camera.lookAt(0, 0, 0)
 const renderer = new THREE.WebGLRenderer({ antialias: true })
 renderer.setSize(w, h); renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
 el.appendChild(renderer.domElement)
 scene.add(new THREE.AmbientLight(0xffffff, 0.5))
 const d = new THREE.DirectionalLight(0xffffff, 1.1)
 d.position.set(200, -100, 280); scene.add(d)
 const geo = buildFootGeo(length, width, arch)
 const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xd4a88a, roughness: 0.55 }))
 const wire = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true, transparent: true, opacity: 0.04 }))
 mesh.rotation.z = -Math.PI / 2; wire.rotation.z = -Math.PI / 2
 scene.add(mesh); scene.add(wire)
 let ry = 0, id
 const animate = () => {
 id = requestAnimationFrame(animate)
 ry += 0.009; mesh.rotation.y = ry; wire.rotation.y = ry
 renderer.render(scene, camera)
 }
 animate()
 return () => { cancelAnimationFrame(id); renderer.dispose(); if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement) }
 }, [length, width, arch])
 return <div ref={mountRef} className="w-full h-full" />
}

// ─── Single scan row ──────────────────────────────────────────────────────────
function ScanRow({ scan, onDelete, canDownload, canDelete, euSize }) {
 const [show3D, setShow3D] = useState(false)

 const handleDownload = (side) => {
 const m = side === 'right'
 ? { length: scan.right_length, width: scan.right_width, arch: scan.right_arch }
 : { length: scan.left_length, width: scan.left_width, arch: scan.left_arch }
 downloadSTL(buildFootGeo(m.length, m.width, m.arch), scan.eu_size, side)
 }

 const geoR = buildFootGeo(scan.right_length, scan.right_width, scan.right_arch)
 const geoL = buildFootGeo(scan.left_length, scan.left_width, scan.left_arch)

 return (
 <div className="bg-[#fafaf9] overflow-hidden">
 {/* Row header */}
 <div className="flex items-center gap-3 px-4 py-2.5">
 {/* Date + size */}
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <span className="text-[9px] text-black/45 font-mono">{fmtDate(scan.created_at)}</span>
 <span className="text-[8px] text-black/35">·</span>
 <span className="text-[9px] text-black/45">
 {scan.reference_type === 'card' ? '💳 Karte' : '📄 A4'}
 </span>
 <span className="text-[8px] text-black/35">·</span>
 <span className="text-[9px] text-black/50 font-light">{scan.accuracy?.toFixed(1)}%</span>
 </div>
 {/* Measurements mini */}
 <div className="flex items-center gap-3 mt-1">
 {[
 ['R', scan.right_length, scan.right_width, scan.right_arch],
 ['L', scan.left_length, scan.left_width, scan.left_arch],
 ].map(([s, l, w, a]) => (
 <span key={s} className="text-[8px] text-black/45 font-mono">
 <span className="text-black/40 font-light">{s}</span> {l}×{w}×{a}mm
 </span>
 ))}
 </div>
 </div>

 {/* EU size */}
 <div className="text-right flex-shrink-0">
 <span className="text-lg font-extralight text-black/80">EU {scan.eu_size}</span>
 <p className="text-[8px] text-black/35">UK {scan.uk_size} · US {scan.us_size}</p>
 </div>

 {/* Actions */}
 <div className="flex items-center gap-1.5 flex-shrink-0">
 {/* 3D toggle */}
 <button
 onClick={() => setShow3D(v => !v)}
 title="3D-Vorschau"
 className={`w-7 h-7 flex items-center justify-center border transition-colors ${
 show3D ? 'bg-black/[0.06] border-black/[0.12] text-black/50' : 'bg-transparent border-black/[0.08] text-black/35 hover:text-black/55 hover:border-black/15'
 }`}
 >
 <Box size={12} strokeWidth={1.25} />
 </button>

 {/* STL downloads */}
 {canDownload && (
 <>
 <button
 onClick={() => handleDownload('right')}
 title={`Rechter Fuß STL (~${estimateSTLSizeKB(geoR)} KB)`}
 className="w-7 h-7 bg-transparent border border-black/[0.08] flex items-center justify-center text-black/35 hover:text-black/55 hover:border-black/15 transition-colors"
 >
 <span className="text-[10px] font-light tracking-wide">R</span>
 </button>
 <button
 onClick={() => handleDownload('left')}
 title={`Linker Fuß STL (~${estimateSTLSizeKB(geoL)} KB)`}
 className="w-7 h-7 bg-transparent border border-black/[0.08] flex items-center justify-center text-black/35 hover:text-black/55 hover:border-black/15 transition-colors"
 >
 <span className="text-[10px] font-light tracking-wide">L</span>
 </button>
 <button
 onClick={() => {
 handleDownload('right')
 setTimeout(() => handleDownload('left'), 400)
 }}
 title="Beide Füße als STL herunterladen"
 className="w-7 h-7 bg-transparent border border-black/[0.08] flex items-center justify-center text-black/35 hover:text-black/55 hover:border-black/15 transition-colors"
 >
 <Download size={11} strokeWidth={1.25} />
 </button>
 </>
 )}

 {/* Delete */}
 {canDelete && (
 <button
 onClick={() => onDelete(scan.id)}
 title="Scan löschen"
 className="w-7 h-7 bg-transparent border border-black/[0.08] flex items-center justify-center text-black/25 hover:text-black/45 hover:border-black/15 transition-colors"
 >
 <Trash2 size={11} strokeWidth={1.25} />
 </button>
 )}
 </div>
 </div>

 {/* 3D preview panel */}
 {show3D && (
 <div className="border-t border-black/[0.06] p-3">
 <div className="grid grid-cols-2 gap-3">
 {[
 { side: 'right', label: 'Rechter Fuß', m: { length: scan.right_length, width: scan.right_width, arch: scan.right_arch } },
 { side: 'left', label: 'Linker Fuß', m: { length: scan.left_length, width: scan.left_width, arch: scan.left_arch } },
 ].map(({ side, label, m }) => (
 <div key={side} className="overflow-hidden border border-black/[0.06]" style={{ height: 100 }}>
 <FootMini length={m.length} width={m.width} arch={m.arch} />
 <div className="bg-[#fafaf9] px-2 py-1 flex items-center justify-between">
 <span className="text-[8px] text-black/40 font-light">{label}</span>
 <span className="text-[7px] text-black/30 font-mono font-light">{m.length}×{m.width}×{m.arch} mm</span>
 </div>
 </div>
 ))}
 </div>
 {canDownload && (
 <div className="flex items-center gap-2 mt-2">
 <p className="text-[8px] text-black/35 flex-1">
 STL: Fusion 360, Blender, Slicer-kompatibel
 </p>
 <button
 onClick={() => {
 handleDownload('right')
 setTimeout(() => handleDownload('left'), 400)
 }}
 className="flex items-center gap-1.5 px-3 py-1.5 bg-transparent border border-black/[0.08] text-black/40 hover:border-black/15 hover:text-black/55 transition-colors"
 >
 <Download size={10} strokeWidth={1.25} />
 <span className="text-[10px] font-light">Beide STL</span>
 </button>
 </div>
 )}
 </div>
 )}
 </div>
 )
}

// ─── User card (grouped view) ─────────────────────────────────────────────────
function UserCard({ group, onDelete, canDownload, canDelete }) {
 const [expanded, setExpanded] = useState(false)
 const latest = group.scans[0]

 return (
 <div className="bg-white overflow-hidden">
 {/* User header */}
 <button
 onClick={() => setExpanded(e => !e)}
 className="w-full flex items-center gap-3 px-7 py-4 text-left hover:bg-black/[0.01] transition-colors bg-transparent border-0"
 >
 {/* Avatar */}
 <div className="w-10 h-10 bg-[#fafaf9] flex items-center justify-center flex-shrink-0">
 <span className="text-[13px] font-extralight text-black/40">
 {group.user_name?.[0]?.toUpperCase() ?? '?'}
 </span>
 </div>

 {/* User info */}
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <p className="text-[13px] font-light text-black/75">{group.user_name}</p>
 <span className={`text-[9px] font-light px-2 py-0.5 border ${roleBadge(group.user_role)}`}>
 {group.user_role}
 </span>
 </div>
 <p className="text-[9px] text-black/30 truncate mt-0.5 font-light">{group.user_email}</p>
 </div>

 {/* Stats */}
 <div className="flex items-center gap-5 flex-shrink-0">
 <div className="text-center">
 <p className="text-[9px] font-light text-black/25 uppercase tracking-[0.15em]">Scans</p>
 <p className="text-[18px] font-extralight text-black/75">{group.scans.length}</p>
 </div>
 <div className="text-center">
 <p className="text-[9px] font-light text-black/25 uppercase tracking-[0.15em]">Größe</p>
 <p className="text-[18px] font-extralight text-black/50">EU {latest.eu_size}</p>
 </div>
 <div className="text-center">
 <p className="text-[9px] font-light text-black/25 uppercase tracking-[0.15em]">Letzter Scan</p>
 <p className="text-[10px] font-light text-black/35">{fmtDate(latest.created_at)}</p>
 </div>
 <div className="w-6 h-6 flex items-center justify-center text-black/25">
 {expanded ? <ChevronUp size={13} strokeWidth={1.25} /> : <ChevronDown size={13} strokeWidth={1.25} />}
 </div>
 </div>
 </button>

 {/* Expanded scans */}
 {expanded && (
 <div className="border-t border-black/[0.04] p-5 space-y-2">
 <p className="text-[10px] font-light text-black/30 px-1 mb-2">
 {group.scans.length} Scan{group.scans.length > 1 ? 's' : ''} — neueste zuerst
 </p>
 {group.scans.map(scan => (
 <ScanRow
 key={scan.id}
 scan={scan}
 onDelete={onDelete}
 canDownload={canDownload}
 canDelete={canDelete}
 euSize={scan.eu_size}
 />
 ))}
 {/* Bulk download for this user */}
 {canDownload && group.scans.length > 0 && (
 <button
 onClick={() => {
 const latest = group.scans[0]
 const gR = buildFootGeo(latest.right_length, latest.right_width, latest.right_arch)
 const gL = buildFootGeo(latest.left_length, latest.left_width, latest.left_arch)
 downloadSTL(gR, latest.eu_size, 'right')
 setTimeout(() => downloadSTL(gL, latest.eu_size, 'left'), 400)
 }}
 className="w-full flex items-center justify-center gap-2 py-2.5 bg-transparent border border-black/[0.08] text-black/40 hover:border-black/15 hover:text-black/55 transition-colors mt-1"
 >
 <Download size={11} strokeWidth={1.25} />
 <span className="text-[10px] font-light tracking-wide">
 Neueste STL herunterladen ({group.user_name})
 </span>
 </button>
 )}
 </div>
 )}
 </div>
 )
}

// ─── Training Data Tab ─────────────────────────────────────────────────────
function PhotoModal({ src, onClose }) {
 if (!src) return null
 return (
 <div
 className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
 onClick={onClose}
 >
 <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
 <button
 onClick={onClose}
 className="absolute -top-10 right-0 text-white/70 hover:text-white"
 >
 <XIcon size={20} />
 </button>
 <img src={src} alt="Fuß-Foto" className="w-full max-h-[80vh] object-contain" />
 </div>
 </div>
 )
}

function TrainingScanCard({ row, onSave }) {
 const [expanded, setExpanded] = useState(false)
 const [editing, setEditing] = useState(false)
 const [saving, setSaving] = useState(false)
 const [photoSrc, setPhotoSrc] = useState(null)
 const [vals, setVals] = useState({
 right_length: row.right_length ?? '',
 right_width: row.right_width ?? '',
 right_arch: row.right_arch ?? '',
 right_ball_girth: row.right_ball_girth ?? '',
 right_instep_girth: row.right_instep_girth ?? '',
 right_heel_girth: row.right_heel_girth ?? '',
 right_waist_girth: row.right_waist_girth ?? '',
 right_ankle_girth: row.right_ankle_girth ?? '',
 left_length: row.left_length ?? '',
 left_width: row.left_width ?? '',
 left_arch: row.left_arch ?? '',
 left_ball_girth: row.left_ball_girth ?? '',
 left_instep_girth: row.left_instep_girth ?? '',
 left_heel_girth: row.left_heel_girth ?? '',
 left_waist_girth: row.left_waist_girth ?? '',
 left_ankle_girth: row.left_ankle_girth ?? '',
 })

 const isValidated = row.validated === 1
 const hasTd = row.td_id != null
 const hasPhotos = row.right_top_img || row.right_side_img || row.left_top_img || row.left_side_img

 const handleValidate = async (validatedVal) => {
 setSaving(true)
 try {
 await apiFetch(`/api/scans/${row.id}/measurements`, {
 method: 'PATCH',
 body: JSON.stringify({
 ...Object.fromEntries(
 Object.entries(vals).filter(([, v]) => v !== '' && v !== null)
 .map(([k, v]) => [k, parseFloat(v)])
 ),
 validated: validatedVal,
 }),
 })
 onSave(row.id, validatedVal)
 setEditing(false)
 } catch (e) {
 alert('Fehler: ' + e.message)
 } finally {
 setSaving(false)
 }
 }

 const photos = [
 { key: 'right_top_img', label: 'R Oben' },
 { key: 'right_side_img', label: 'R Seite' },
 { key: 'left_top_img', label: 'L Oben' },
 { key: 'left_side_img', label: 'L Seite' },
 ]

 return (
 <>
 {photoSrc && <PhotoModal src={photoSrc} onClose={() => setPhotoSrc(null)} />}

 <div className="bg-white overflow-hidden mb-2">
 {/* Card header */}
 <div
 className="flex items-center gap-3 px-7 py-4 hover:bg-black/[0.01] cursor-pointer transition-colors"
 onClick={() => setExpanded(e => !e)}
 >
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <span className="text-[13px] font-light text-black/75 truncate">{row.user_email}</span>
 <span className="text-[10px] text-black/25 font-light">{fmtDate(row.created_at)}</span>
 {!hasTd && (
 <span className="text-[9px] font-light px-2 py-0.5 bg-[#fafaf9] text-black/30">
 Keine Fotos
 </span>
 )}
 {hasTd && isValidated && (
 <span className="text-[9px] font-light px-2 py-0.5 bg-[#fafaf9] text-black/45">
 Validiert
 </span>
 )}
 {hasTd && !isValidated && (
 <span className="text-[9px] font-light px-2 py-0.5 bg-[#fafaf9] text-black/30">
 Ausstehend
 </span>
 )}
 </div>
 <div className="flex items-center gap-3 mt-0.5">
 <span className="text-[10px] text-black/30 font-light font-mono">
 R: {row.right_length ?? '?'}×{row.right_width ?? '?'}×{row.right_arch ?? '?'}mm
 </span>
 <span className="text-[10px] text-black/30 font-light font-mono">
 L: {row.left_length ?? '?'}×{row.left_width ?? '?'}×{row.left_arch ?? '?'}mm
 </span>
 </div>
 </div>
 <div className="flex items-center gap-2 flex-shrink-0">
 <span className="text-[13px] font-extralight text-black/60">EU {row.eu_size}</span>
 {expanded ? <ChevronUp size={13} className="text-black/25" strokeWidth={1.25} /> : <ChevronDown size={13} className="text-black/25" strokeWidth={1.25} />}
 </div>
 </div>

 {/* Expanded */}
 {expanded && (
 <div className="border-t border-black/[0.04] p-7 space-y-5">
 {/* Photo thumbnails */}
 {hasPhotos && (
 <div>
 <p className="text-[10px] font-light text-black/30 uppercase tracking-[0.2em] mb-2">Fotos</p>
 <div className="flex gap-2">
 {photos.map(({ key, label }) => (
 <div key={key} className="flex flex-col items-center gap-1">
 {row[key] ? (
 <img
 src={row[key]}
 alt={label}
 className="w-20 h-20 object-cover border border-black/[0.06] cursor-pointer hover:opacity-80 transition-opacity"
 onClick={() => setPhotoSrc(row[key])}
 />
 ) : (
 <div className="w-20 h-20 bg-[#fafaf9] border border-black/[0.06] flex items-center justify-center">
 <ImageIcon size={16} className="text-black/20" />
 </div>
 )}
 <span className="text-[9px] text-black/35">{label}</span>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Measurements editor */}
 <div>
 <div className="flex items-center justify-between mb-2">
 <p className="text-[10px] font-light text-black/30 uppercase tracking-[0.2em]">Maße</p>
 <button
 onClick={() => setEditing(e => !e)}
 className="flex items-center gap-1 text-[10px] font-light text-black/30 hover:text-black/55"
 >
 <Edit3 size={11} />
 {editing ? 'Schließen' : 'Bearbeiten'}
 </button>
 </div>

 {!editing ? (
 <div className="grid grid-cols-2 gap-x-6 gap-y-1">
 {[
 ['Rechts Länge', vals.right_length],
 ['Links Länge', vals.left_length],
 ['Rechts Breite', vals.right_width],
 ['Links Breite', vals.left_width],
 ['Rechts Ballenumfang', vals.right_ball_girth],
 ['Links Ballenumfang', vals.left_ball_girth],
 ['Rechts Ristumfang', vals.right_instep_girth],
 ['Links Ristumfang', vals.left_instep_girth],
 ['Rechts Fersenumfang', vals.right_heel_girth],
 ['Links Fersenumfang', vals.left_heel_girth],
 ['Rechts Gewölbe', vals.right_arch],
 ['Links Gewölbe', vals.left_arch],
 ['Rechts Gelenkweite', vals.right_waist_girth],
 ['Links Gelenkweite', vals.left_waist_girth],
 ['Rechts Knöchel', vals.right_ankle_girth],
 ['Links Knöchel', vals.left_ankle_girth],
 ].map(([lbl, val]) => (
 <div key={lbl} className="flex items-center justify-between py-1.5 border-b border-black/[0.04]">
 <span className="text-[11px] font-light text-black/30">{lbl}</span>
 <span className="text-[11px] font-light text-black/60">{val || '—'} {val ? 'mm' : ''}</span>
 </div>
 ))}
 </div>
 ) : (
 <div className="space-y-3">
 {[
 { label: 'Rechts', prefix: 'right' },
 { label: 'Links', prefix: 'left' },
 ].map(({ label, prefix }) => (
 <div key={prefix}>
 <p className="text-[10px] font-light text-black/45 mb-2 uppercase tracking-[0.15em]">{label}</p>
 <div className="grid grid-cols-4 gap-2">
 {[
 { key: `${prefix}_length`, lbl: 'Länge' },
 { key: `${prefix}_width`, lbl: 'Breite' },
 { key: `${prefix}_arch`, lbl: 'Gewölbe' },
 { key: `${prefix}_ball_girth`, lbl: 'Ballen∅' },
 { key: `${prefix}_instep_girth`, lbl: 'Rist∅' },
 { key: `${prefix}_heel_girth`, lbl: 'Ferse∅' },
 { key: `${prefix}_waist_girth`, lbl: 'Gelenk∅' },
 { key: `${prefix}_ankle_girth`, lbl: 'Knöchel∅' },
 ].map(({ key, lbl }) => (
 <div key={key} className="flex flex-col gap-1">
 <label className="text-[9px] text-black/25 font-light">{lbl}</label>
 <input
 type="number"
 step="0.1"
 value={vals[key]}
 onChange={e => setVals(v => ({ ...v, [key]: e.target.value }))}
 className="w-full bg-transparent border-b border-black/[0.08] px-2 py-1.5 text-[11px] text-center text-black/70 font-light focus:outline-none focus:border-black/25 transition-colors"
 placeholder="mm"
 />
 </div>
 ))}
 </div>
 </div>
 ))}
 </div>
 )}
 </div>

 {/* Action buttons */}
 {hasTd && (
 <div className="flex items-center justify-between pt-2">
 <button
 onClick={() => handleValidate(0)}
 disabled={saving}
 className="text-black/30 text-[10px] font-light hover:text-black/55 transition-colors disabled:opacity-50"
 >
 Ablehnen
 </button>
 <button
 onClick={() => handleValidate(1)}
 disabled={saving}
 className="border border-black text-black text-[10px] font-light px-5 py-2 hover:bg-black hover:text-white transition-all uppercase tracking-[0.15em] disabled:opacity-30"
 >
 {saving ? 'Wird gespeichert…' : 'Validieren'}
 </button>
 </div>
 )}
 </div>
 )}
 </div>
 </>
 )
}

function TrainingTab({ isAdmin }) {
 const [data, setData] = useState(null)
 const [loading, setLoading] = useState(true)
 const [filter, setFilter] = useState('all') // 'all' | 'pending' | 'validated'
 const [error, setError] = useState(null)

 const load = async () => {
 setLoading(true); setError(null)
 try {
 const res = await apiFetch('/api/scans/training-data')
 setData(res)
 } catch (e) {
 setError(e.message || 'Fehler beim Laden')
 } finally {
 setLoading(false)
 }
 }

 useEffect(() => { load() }, [])

 const handleSave = (scanId, validated) => {
 setData(d => ({
 ...d,
 validated: validated === 1 ? d.validated + 1 : Math.max(0, d.validated - 1),
 pending: validated === 1 ? Math.max(0, d.pending - 1) : d.pending,
 scans: d.scans.map(s => s.id === scanId ? { ...s, validated } : s),
 }))
 }

 const exportCSV = () => {
 if (!data?.scans) return
 const validated = data.scans.filter(s => s.validated === 1)
 const cols = ['id','user_email','right_length','right_width','right_arch',
 'right_ball_girth','right_instep_girth','right_heel_girth',
 'right_waist_girth','right_ankle_girth',
 'left_length','left_width','left_arch',
 'left_ball_girth','left_instep_girth','left_heel_girth',
 'left_waist_girth','left_ankle_girth','eu_size','created_at']
 const rows = [cols.join(','), ...validated.map(s => cols.map(c => s[c] ?? '').join(','))]
 const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
 const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
 a.download = `training_data_${new Date().toISOString().slice(0,10)}.csv`; a.click()
 }

 const filtered = data?.scans?.filter(s => {
 if (filter === 'pending') return s.td_id != null && s.validated !== 1
 if (filter === 'validated') return s.validated === 1
 return true
 }) ?? []

 return (
 <div>
 {/* Header */}
 <div className="flex items-center justify-between mb-6">
 <div>
 <h2 className="text-[15px] font-light text-black/75">Training-Daten</h2>
 {data && (
 <p className="text-[11px] text-black/30 mt-1 font-light">
 Validiert: <span className="text-black/45">{data.validated}</span> / {data.total}
 {' · '}Ausstehend: <span className="text-black/35">{data.pending}</span>
 </p>
 )}
 </div>
 <div className="flex items-center gap-2">
 <button
 onClick={exportCSV}
 className="flex items-center gap-1.5 text-[10px] font-light text-black/40 hover:text-black/70 px-3 py-1.5 border border-black/[0.08] hover:border-black/15 transition-colors uppercase tracking-[0.15em]"
 >
 <Download size={11} strokeWidth={1.25} />
 Export CSV
 </button>
 <button
 onClick={load}
 className="flex items-center gap-1.5 text-[10px] text-black/30 hover:text-black/55 px-2.5 py-1.5 border border-black/[0.08] hover:border-black/15 transition-colors"
 >
 <RefreshCw size={12} strokeWidth={1.25} className={loading ? 'animate-spin' : ''} />
 </button>
 </div>
 </div>

 {/* Filter tabs */}
 <div className="flex gap-1 mb-6">
 {[
 { key: 'all', label: 'Alle', count: data?.total ?? 0 },
 { key: 'pending', label: 'Ausstehend', count: data?.pending ?? 0 },
 { key: 'validated', label: 'Validiert', count: data?.validated ?? 0 },
 ].map(({ key, label, count }) => (
 <button
 key={key}
 onClick={() => setFilter(key)}
 className={`text-[10px] font-light px-3.5 py-1.5 transition-colors uppercase tracking-[0.15em] ${
 filter === key ? 'bg-black text-white' : 'text-black/25 hover:text-black/50'
 }`}
 >
 {label} <span className="ml-1 opacity-50">{count}</span>
 </button>
 ))}
 </div>

 {/* Loading/Error */}
 {loading && (
 <div className="flex justify-center py-12">
 <div className="w-5 h-5 border border-black/10 border-t-black/40 animate-spin rounded-full" />
 </div>
 )}
 {error && !loading && (
 <div className="flex items-center gap-2 text-black/30 text-[12px] font-light py-8 justify-center">
 <AlertCircle size={13} strokeWidth={1.25} /> {error}
 </div>
 )}

 {/* List */}
 {!loading && !error && filtered.length === 0 && (
 <div className="text-center py-16">
 <Brain size={28} className="text-black/10 mx-auto mb-3" strokeWidth={1} />
 <p className="text-[12px] text-black/25 font-light">Keine Einträge für diesen Filter.</p>
 </div>
 )}
 {!loading && !error && filtered.length > 0 && (
 <div>
 {filtered.map(row => (
 <TrainingScanCard
 key={row.id}
 row={row}
 onSave={handleSave}
 />
 ))}
 <p className="text-center text-[10px] text-black/25 font-light pt-3">
 {filtered.length} Scans angezeigt
 </p>
 </div>
 )}
 </div>
 )
}

// ─── Main Panel ───────────────────────────────────────────────────────────────
export default function ScansPanel() {
 const { user } = useAuth()
 const [scans, setScans] = useState([])
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState(null)
 const [search, setSearch] = useState('')
 const [viewMode, setViewMode] = useState('users') // 'users' | 'list'
 const [activeTab, setActiveTab] = useState('scans') // 'scans' | 'training'

 const isAdmin = user?.role === 'admin'
 const isCurator = user?.role === 'curator'
 const canDownload = isAdmin || isCurator
 const canDelete = isAdmin

 const load = async () => {
 setLoading(true); setError(null)
 try {
 const data = await apiFetch('/api/scans')
 setScans(data)
 } catch {
 setError('Scans konnten nicht geladen werden.')
 } finally {
 setLoading(false)
 }
 }

 useEffect(() => { load() }, [])

 const handleDelete = async (id) => {
 if (!window.confirm('Diesen Scan wirklich löschen?')) return
 try {
 await apiFetch(`/api/scans/${id}`, { method: 'DELETE' })
 setScans(s => s.filter(x => x.id !== id))
 } catch { alert('Löschen fehlgeschlagen.') }
 }

 // Filter
 const q = search.toLowerCase()
 const filtered = scans.filter(s =>
 !q ||
 s.user_name?.toLowerCase().includes(q) ||
 s.user_email?.toLowerCase().includes(q) ||
 s.eu_size?.includes(q)
 )

 const groups = groupByUser(filtered)

 // Stats
 const totalScans = scans.length
 const totalUsers = new Set(scans.map(s => s.user_id)).size
 const avgEU = totalScans
 ? Math.round(scans.map(s => +s.eu_size).reduce((a, b) => a + b, 0) / totalScans)
 : '—'
 const euDist = scans.reduce((acc, s) => {
 acc[s.eu_size] = (acc[s.eu_size] || 0) + 1; return acc
 }, {})
 const mostCommonEU = Object.keys(euDist).sort((a, b) => euDist[b] - euDist[a])[0] ?? '—'

 return (
 <div className="px-10 py-10 lg:px-14 lg:py-12 min-h-full">

 {/* ── Header ── */}
 <div className="flex items-start justify-between mb-10">
 <div>
 <p className="text-[9px] text-black/20 uppercase tracking-[0.3em] mb-3 font-light">Foot Scans</p>
 <h1 className="text-[28px] font-extralight text-black/85 tracking-tight">Scan-Datenbank</h1>
 <p className="text-[13px] text-black/30 mt-2 font-light">
 3D-Fußscans · ML Training-Daten
 </p>
 </div>
 <button
 onClick={load}
 className="flex items-center gap-2 px-5 h-9 border border-black/[0.08] text-[10px] text-black/40 hover:text-black/70 hover:border-black/15 transition-all uppercase tracking-[0.15em] font-light"
 >
 <RefreshCw size={12} strokeWidth={1.25} className={loading ? 'animate-spin' : ''} />
 Aktualisieren
 </button>
 </div>

 {/* ── Tab Navigation ── */}
 <div className="flex gap-1 border-b border-black/[0.06] mb-8">
 {[
 { key: 'scans', label: 'Scans', icon: Footprints },
 { key: 'training', label: 'Training-Daten', icon: Brain },
 ].map(({ key, label, icon: Icon }) => (
 <button
 key={key}
 onClick={() => setActiveTab(key)}
 className={`flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-light border-b -mb-px transition-colors bg-transparent uppercase tracking-[0.15em] ${
 activeTab === key
 ? 'border-black text-black/75'
 : 'border-transparent text-black/25 hover:text-black/50'
 }`}
 >
 <Icon size={13} strokeWidth={1.25} />
 {label}
 </button>
 ))}
 </div>

 {activeTab === 'scans' && (
 <>
 {/* ── Stats ── */}
 <div className="grid grid-cols-4 gap-4 mb-8">
 {[
 { label: 'Benutzer', value: totalUsers, icon: Users },
 { label: 'Scans gesamt', value: totalScans, icon: Footprints },
 { label: 'Ø EU-Größe', value: avgEU ? `EU ${avgEU}` : '—', icon: Ruler },
 { label: 'Häufigste Größe', value: mostCommonEU ? `EU ${mostCommonEU}` : '—', icon: TrendingUp },
 ].map(({ label, value, icon: Icon }) => (
 <div key={label} className="bg-white p-5">
 <div className="flex items-center gap-2 mb-3">
 <Icon size={13} className="text-black/20" strokeWidth={1.25} />
 </div>
 <p className="text-[22px] font-extralight text-black/75">{value}</p>
 <span className="text-[9px] text-black/25 mt-1.5 uppercase tracking-[0.2em] font-light">{label}</span>
 </div>
 ))}
 </div>

 {/* ── Toolbar ── */}
 <div className="flex items-center gap-3 mb-6">
 {/* Search */}
 <div className="flex-1 relative">
 <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/20" strokeWidth={1.25} />
 <input
 value={search}
 onChange={e => setSearch(e.target.value)}
 placeholder="Suche nach Name, E-Mail oder EU-Größe…"
 className="w-full bg-white border-b border-black/[0.08] pl-10 pr-4 h-10 text-[13px] font-light text-black/70 placeholder-black/15 outline-none focus:border-black/25 transition-colors"
 />
 </div>

 {/* View mode toggle */}
 <div className="flex gap-1">
 <button
 onClick={() => setViewMode('users')}
 className={`flex items-center gap-1.5 px-3.5 py-2 text-[10px] font-light transition-colors uppercase tracking-[0.15em] ${
 viewMode === 'users' ? 'bg-black text-white' : 'text-black/25 hover:text-black/50'
 }`}
 >
 <Users size={12} strokeWidth={1.25} />
 Benutzer
 </button>
 <button
 onClick={() => setViewMode('list')}
 className={`flex items-center gap-1.5 px-3.5 py-2 text-[10px] font-light transition-colors uppercase tracking-[0.15em] ${
 viewMode === 'list' ? 'bg-black text-white' : 'text-black/25 hover:text-black/50'
 }`}
 >
 <LayoutList size={12} strokeWidth={1.25} />
 Alle Scans
 </button>
 </div>
 </div>

 {/* ── Download hint for admins ── */}
 {canDownload && (
 <div className="flex items-center gap-2.5 bg-white px-5 py-3 mb-6">
 <Box size={12} className="text-black/25 flex-shrink-0" strokeWidth={1.25} />
 <p className="text-[10px] text-black/30 font-light">
 {isAdmin ? 'Admin' : 'Curator'}: Klicke auf R / L oder{' '}
 <Download size={9} className="inline" strokeWidth={1.25} /> um STL-Modelle herunterzuladen.
 Öffne einen Scan für die 3D-Vorschau.
 </p>
 </div>
 )}

 {/* ── Loading / Error ── */}
 {loading && (
 <div className="flex items-center justify-center py-16 gap-2 text-black/25 text-[13px] font-light">
 <div className="w-5 h-5 border border-black/10 border-t-black/40 animate-spin rounded-full" /> Lade Scans…
 </div>
 )}
 {error && !loading && (
 <div className="flex items-center gap-2 text-black/30 text-[12px] font-light py-12 justify-center">
 <AlertCircle size={13} strokeWidth={1.25} />
 {error}
 </div>
 )}

 {/* ── Empty ── */}
 {!loading && !error && filtered.length === 0 && (
 <div className="text-center py-16">
 <Footprints size={28} className="text-black/10 mx-auto mb-3" strokeWidth={1} />
 <p className="text-black/25 text-[12px] font-light">
 {search ? 'Keine Scans für diese Suche gefunden.' : 'Noch keine Scans. Benutzer können in der App scannen.'}
 </p>
 </div>
 )}

 {/* ── Users view ── */}
 {!loading && !error && filtered.length > 0 && viewMode === 'users' && (
 <div className="space-y-3">
 {groups.map(group => (
 <UserCard
 key={group.user_id}
 group={group}
 onDelete={handleDelete}
 canDownload={canDownload}
 canDelete={canDelete}
 />
 ))}
 <p className="text-center text-[9px] text-black/35 pt-2">
 {groups.length} Benutzer · {filtered.length} Scans gesamt
 </p>
 </div>
 )}

 {/* ── Flat list view ── */}
 {!loading && !error && filtered.length > 0 && viewMode === 'list' && (
 <div className="space-y-2">
 {filtered.map(scan => (
 <div key={scan.id} className="bg-white overflow-hidden">
 {/* User mini-header */}
 <div className="flex items-center gap-2 px-7 pt-4 pb-1">
 <div className="w-5 h-5 bg-[#fafaf9] flex items-center justify-center flex-shrink-0">
 <span className="text-[8px] font-extralight text-black/40">{scan.user_name?.[0]?.toUpperCase()}</span>
 </div>
 <span className="text-[10px] font-light text-black/50">{scan.user_name}</span>
 <span className="text-[9px] text-black/25 font-light">{scan.user_email}</span>
 <span className={`text-[9px] font-light px-2 py-0.5 border ml-auto ${roleBadge(scan.user_role)}`}>
 {scan.user_role}
 </span>
 </div>
 <div className="px-3 pb-3">
 <ScanRow
 scan={scan}
 onDelete={handleDelete}
 canDownload={canDownload}
 canDelete={canDelete}
 euSize={scan.eu_size}
 />
 </div>
 </div>
 ))}
 <p className="text-center text-[9px] text-black/35 pt-2">
 {filtered.length} Scans · {new Set(filtered.map(s => s.user_id)).size} Benutzer
 </p>
 </div>
 )}
 </>
 )}
 {activeTab === 'training' && (
 <TrainingTab isAdmin={isAdmin} />
 )}
 </div>
 )
}
