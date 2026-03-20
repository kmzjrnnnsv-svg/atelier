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
 scene.background = new THREE.Color(0x111827)
 const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 2000)
 camera.position.set(0, -300, 90); camera.lookAt(0, 0, 0)
 const renderer = new THREE.WebGLRenderer({ antialias: true })
 renderer.setSize(w, h); renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
 el.appendChild(renderer.domElement)
 scene.add(new THREE.AmbientLight(0x2dd4bf, 0.35))
 const d = new THREE.DirectionalLight(0xffffff, 1.1)
 d.position.set(200, -100, 280); scene.add(d)
 const geo = buildFootGeo(length, width, arch)
 const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xd4a88a, roughness: 0.55 }))
 const wire = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x2dd4bf, wireframe: true, transparent: true, opacity: 0.06 }))
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
 <div className="bg-black/5 border border-black/10 overflow-hidden">
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
 <span className="text-[9px] text-black/50 font-semibold">{scan.accuracy?.toFixed(1)}%</span>
 </div>
 {/* Measurements mini */}
 <div className="flex items-center gap-3 mt-1">
 {[
 ['R', scan.right_length, scan.right_width, scan.right_arch],
 ['L', scan.left_length, scan.left_width, scan.left_arch],
 ].map(([s, l, w, a]) => (
 <span key={s} className="text-[8px] text-black/45 font-mono">
 <span className="text-black/35 font-bold">{s}</span> {l}×{w}×{a}mm
 </span>
 ))}
 </div>
 </div>

 {/* EU size */}
 <div className="text-right flex-shrink-0">
 <span className="text-lg font-bold text-black/90">EU {scan.eu_size}</span>
 <p className="text-[8px] text-black/35">UK {scan.uk_size} · US {scan.us_size}</p>
 </div>

 {/* Actions */}
 <div className="flex items-center gap-1.5 flex-shrink-0">
 {/* 3D toggle */}
 <button
 onClick={() => setShow3D(v => !v)}
 title="3D-Vorschau"
 className={`w-7 h-7 flex items-center justify-center border transition-colors ${
 show3D ? 'bg-black/10 border-black/15 text-black/50' : 'bg-black/5 border-black/10 text-black/45 hover:text-black/65'
 }`}
 >
 <Box size={12} strokeWidth={1.5} />
 </button>

 {/* STL downloads */}
 {canDownload && (
 <>
 <button
 onClick={() => handleDownload('right')}
 title={`Rechter Fuß STL (~${estimateSTLSizeKB(geoR)} KB)`}
 className="w-7 h-7 bg-[#f6f5f3] border border-black/6 flex items-center justify-center text-black/45 hover:text-black/50 hover:border-black/15 transition-colors"
 >
 <span className="text-xs font-bold">R</span>
 </button>
 <button
 onClick={() => handleDownload('left')}
 title={`Linker Fuß STL (~${estimateSTLSizeKB(geoL)} KB)`}
 className="w-7 h-7 bg-[#f6f5f3] border border-black/6 flex items-center justify-center text-black/45 hover:text-black/50 hover:border-black/15 transition-colors"
 >
 <span className="text-xs font-bold">L</span>
 </button>
 <button
 onClick={() => {
 handleDownload('right')
 setTimeout(() => handleDownload('left'), 400)
 }}
 title="Beide Füße als STL herunterladen"
 className="w-7 h-7 bg-black/8 border border-black/10 flex items-center justify-center text-black/50 hover:bg-black/12 transition-colors"
 >
 <Download size={11} strokeWidth={1.5} />
 </button>
 </>
 )}

 {/* Delete */}
 {canDelete && (
 <button
 onClick={() => onDelete(scan.id)}
 title="Scan löschen"
 className="w-7 h-7 bg-[#f6f5f3] border border-black/6 flex items-center justify-center text-black/35 hover:text-black/40 hover:border-black/15 transition-colors"
 >
 <Trash2 size={11} strokeWidth={1.5} />
 </button>
 )}
 </div>
 </div>

 {/* 3D preview panel */}
 {show3D && (
 <div className="border-t border-black/10 p-3">
 <div className="grid grid-cols-2 gap-3">
 {[
 { side: 'right', label: 'Rechter Fuß', m: { length: scan.right_length, width: scan.right_width, arch: scan.right_arch } },
 { side: 'left', label: 'Linker Fuß', m: { length: scan.left_length, width: scan.left_width, arch: scan.left_arch } },
 ].map(({ side, label, m }) => (
 <div key={side} className=" overflow-hidden border border-black/10" style={{ height: 100 }}>
 <FootMini length={m.length} width={m.width} arch={m.arch} />
 <div className="bg-[#f6f5f3] px-2 py-1 flex items-center justify-between">
 <span className="text-[8px] text-black/50 font-semibold">{label}</span>
 <span className="text-[7px] text-black/35 font-mono">{m.length}×{m.width}×{m.arch} mm</span>
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
 className="flex items-center gap-1.5 px-3 py-1.5 bg-black/6 border border-black/10 text-black/50 hover:bg-black/10 transition-colors"
 >
 <Download size={10} strokeWidth={1.5} />
 <span className="text-xs font-medium">Beide STL</span>
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
 <div className="bg-white border border-black/6 overflow-hidden">
 {/* User header */}
 <button
 onClick={() => setExpanded(e => !e)}
 className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-black/5 transition-colors bg-transparent border-0"
 >
 {/* Avatar */}
 <div className="w-10 h-10 bg-black/8 border border-black/10 flex items-center justify-center flex-shrink-0">
 <span className="text-sm font-bold text-black/50">
 {group.user_name?.[0]?.toUpperCase() ?? '?'}
 </span>
 </div>

 {/* User info */}
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <p className="text-sm font-semibold text-black/90">{group.user_name}</p>
 <span className={`text-[10px] font-medium px-2 py-0.5 border ${roleBadge(group.user_role)}`}>
 {group.user_role}
 </span>
 </div>
 <p className="text-[9px] text-black/45 truncate mt-0.5">{group.user_email}</p>
 </div>

 {/* Stats */}
 <div className="flex items-center gap-4 flex-shrink-0">
 <div className="text-center">
 <p className="text-xs font-medium text-black/35">Scans</p>
 <p className="text-base font-bold text-black/90">{group.scans.length}</p>
 </div>
 <div className="text-center">
 <p className="text-xs font-medium text-black/35">Größe</p>
 <p className="text-base font-bold text-black/50">EU {latest.eu_size}</p>
 </div>
 <div className="text-center">
 <p className="text-xs font-medium text-black/35">Letzter Scan</p>
 <p className="text-[9px] font-semibold text-black/35">{fmtDate(latest.created_at)}</p>
 </div>
 <div className="w-6 h-6 flex items-center justify-center text-black/45">
 {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
 </div>
 </div>
 </button>

 {/* Expanded scans */}
 {expanded && (
 <div className="border-t border-black/10 p-3 space-y-2">
 <p className="text-xs font-medium text-black/35 px-1 mb-2">
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
 className="w-full flex items-center justify-center gap-2 py-2.5 bg-black/5 border border-black/10 text-black/50 hover:bg-black/8 transition-colors mt-1"
 >
 <Download size={12} strokeWidth={1.5} />
 <span className="text-xs font-medium">
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

 <div className="border border-black/6 overflow-hidden mb-2">
 {/* Card header */}
 <div
 className="flex items-center gap-3 px-4 py-3 hover:bg-black/5 cursor-pointer transition-colors"
 onClick={() => setExpanded(e => !e)}
 >
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <span className="text-sm font-medium text-black/90 truncate">{row.user_email}</span>
 <span className="text-xs text-black/35">{fmtDate(row.created_at)}</span>
 {!hasTd && (
 <span className="text-[10px] font-medium px-2 py-0.5 bg-black/5 text-black/35">
 Keine Fotos
 </span>
 )}
 {hasTd && isValidated && (
 <span className="text-[10px] font-medium px-2 py-0.5 bg-black/5 text-black/50">
 ✓ Validiert
 </span>
 )}
 {hasTd && !isValidated && (
 <span className="text-[10px] font-medium px-2 py-0.5 bg-black/5 text-black/40">
 Ausstehend
 </span>
 )}
 </div>
 <div className="flex items-center gap-3 mt-0.5">
 <span className="text-xs text-black/35">
 R: {row.right_length ?? '?'}×{row.right_width ?? '?'}×{row.right_arch ?? '?'}mm
 </span>
 <span className="text-xs text-black/35">
 L: {row.left_length ?? '?'}×{row.left_width ?? '?'}×{row.left_arch ?? '?'}mm
 </span>
 </div>
 </div>
 <div className="flex items-center gap-2 flex-shrink-0">
 <span className="text-xs font-bold text-black/65">EU {row.eu_size}</span>
 {expanded ? <ChevronUp size={14} className="text-black/35" /> : <ChevronDown size={14} className="text-black/35" />}
 </div>
 </div>

 {/* Expanded */}
 {expanded && (
 <div className="border-t border-black/6 p-4 space-y-4">
 {/* Photo thumbnails */}
 {hasPhotos && (
 <div>
 <p className="text-xs font-medium text-black/35 mb-2">Fotos</p>
 <div className="flex gap-2">
 {photos.map(({ key, label }) => (
 <div key={key} className="flex flex-col items-center gap-1">
 {row[key] ? (
 <img
 src={row[key]}
 alt={label}
 className="w-20 h-20 object-cover border border-black/6 cursor-pointer hover:opacity-80 transition-opacity"
 onClick={() => setPhotoSrc(row[key])}
 />
 ) : (
 <div className="w-20 h-20 bg-black/5 border border-black/10 flex items-center justify-center">
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
 <p className="text-xs font-medium text-black/35">Maße</p>
 <button
 onClick={() => setEditing(e => !e)}
 className="flex items-center gap-1 text-xs text-black/35 hover:text-black/65"
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
 <div key={lbl} className="flex items-center justify-between py-1 border-b border-black/5">
 <span className="text-xs text-black/35">{lbl}</span>
 <span className="text-xs font-medium text-black/65">{val || '—'} {val ? 'mm' : ''}</span>
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
 <p className="text-xs font-medium text-black/55 mb-2">{label}</p>
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
 <label className="text-[9px] text-black/35">{lbl}</label>
 <input
 type="number"
 step="0.1"
 value={vals[key]}
 onChange={e => setVals(v => ({ ...v, [key]: e.target.value }))}
 className="w-full bg-white border border-black/10 px-2 py-1.5 text-xs text-center text-black/90 focus:outline-none focus:border-black/20"
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
 <div className="flex items-center justify-between pt-1">
 <button
 onClick={() => handleValidate(0)}
 disabled={saving}
 className="text-black/35 text-xs hover:text-black/60 transition-colors disabled:opacity-50"
 >
 ✗ Ablehnen
 </button>
 <button
 onClick={() => handleValidate(1)}
 disabled={saving}
 className="bg-black hover:bg-black text-white text-xs font-medium px-4 py-2 transition-colors disabled:opacity-50"
 >
 {saving ? 'Wird gespeichert…' : '✓ Validieren'}
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
 <div className="flex items-center justify-between mb-4">
 <div>
 <div className="flex items-center gap-2">
 <Brain size={16} className="text-black/40" />
 <h2 className="text-base font-semibold text-black/90" style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}>Training-Daten</h2>
 </div>
 {data && (
 <p className="text-xs text-black/35 mt-0.5">
 Validiert: <span className="font-semibold text-black/50">{data.validated}</span> / {data.total}
 {' · '}Ausstehend: <span className="font-semibold text-black/40">{data.pending}</span>
 </p>
 )}
 </div>
 <div className="flex items-center gap-2">
 <button
 onClick={exportCSV}
 className="flex items-center gap-1.5 text-xs font-medium text-black/45 hover:text-black/80 px-3 py-1.5 border border-black/10 hover:border-black/20 transition-colors"
 >
 <Download size={12} />
 Export CSV
 </button>
 <button
 onClick={load}
 className="flex items-center gap-1.5 text-xs text-black/35 hover:text-black/65 px-3 py-1.5 border border-black/10 transition-colors"
 >
 <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
 </button>
 </div>
 </div>

 {/* Filter tabs */}
 <div className="flex gap-1.5 mb-4">
 {[
 { key: 'all', label: 'Alle', count: data?.total ?? 0 },
 { key: 'pending', label: 'Ausstehend', count: data?.pending ?? 0 },
 { key: 'validated', label: 'Validiert', count: data?.validated ?? 0 },
 ].map(({ key, label, count }) => (
 <button
 key={key}
 onClick={() => setFilter(key)}
 className={`text-xs font-medium px-3 py-1.5 hover:bg-black/5 transition-colors ${
 filter === key ? 'bg-black/5 text-black/90' : 'text-black/35'
 }`}
 >
 {label} <span className="ml-1 text-black/35">{count}</span>
 </button>
 ))}
 </div>

 {/* Loading/Error */}
 {loading && (
 <div className="flex justify-center py-12">
 <div className="w-6 h-6 border-2 border-black/10 border-t-black/35 animate-spin" />
 </div>
 )}
 {error && !loading && (
 <div className="flex items-center gap-2 text-black/40 text-sm py-8 justify-center">
 <AlertCircle size={14} /> {error}
 </div>
 )}

 {/* List */}
 {!loading && !error && filtered.length === 0 && (
 <div className="text-center py-12">
 <Brain size={28} className="text-black/10 mx-auto mb-2" />
 <p className="text-sm text-black/35">Keine Einträge für diesen Filter.</p>
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
 <p className="text-center text-xs text-black/35 pt-2">
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
 <div className="p-8 min-h-full">

 {/* ── Header ── */}
 <div className="flex items-start justify-between mb-6">
 <div>
 <div className="flex items-center gap-2 mb-1">
 <Footprints size={20} className="text-black/50" />
 <h1 className="text-xl font-bold text-black/85" style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}>Scan-Datenbank</h1>
 </div>
 <p className="text-sm text-black/35">
 3D-Fußscans · ML Training-Daten
 </p>
 </div>
 <button
 onClick={load}
 className="flex items-center gap-2 px-3 py-2 bg-black/5 border border-black/10 text-xs text-black/65 hover:text-black/90 hover:border-black/20 transition-all"
 >
 <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
 Aktualisieren
 </button>
 </div>

 {/* ── Tab Navigation ── */}
 <div className="flex gap-1 border-b border-black/6 mb-6">
 {[
 { key: 'scans', label: 'Scans', icon: Footprints },
 { key: 'training', label: 'Training-Daten', icon: Brain },
 ].map(({ key, label, icon: Icon }) => (
 <button
 key={key}
 onClick={() => setActiveTab(key)}
 className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors border-0 bg-transparent ${
 activeTab === key
 ? 'border-black text-black/90'
 : 'border-transparent text-black/35 hover:text-black/65'
 }`}
 >
 <Icon size={14} />
 {label}
 </button>
 ))}
 </div>

 {activeTab === 'scans' && (
 <>
 {/* ── Stats ── */}
 <div className="grid grid-cols-4 gap-3 mb-6">
 {[
 { label: 'Benutzer', value: totalUsers, icon: Users, color: 'text-black/40' },
 { label: 'Scans gesamt', value: totalScans, icon: Footprints, color: 'text-black/50' },
 { label: 'Ø EU-Größe', value: avgEU ? `EU ${avgEU}` : '—', icon: Ruler, color: 'text-black/40' },
 { label: 'Häufigste Größe', value: mostCommonEU ? `EU ${mostCommonEU}` : '—', icon: TrendingUp, color: 'text-black/40' },
 ].map(({ label, value, icon: Icon, color }) => (
 <div key={label} className="bg-white border border-black/10 px-4 py-3">
 <div className="flex items-center gap-2 mb-1">
 <Icon size={13} className={color} />
 <span className="text-xs font-medium text-black/35">{label}</span>
 </div>
 <p className="text-xl font-bold text-black/90">{value}</p>
 </div>
 ))}
 </div>

 {/* ── Toolbar ── */}
 <div className="flex items-center gap-3 mb-4">
 {/* Search */}
 <div className="flex-1 relative">
 <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/35" />
 <input
 value={search}
 onChange={e => setSearch(e.target.value)}
 placeholder="Suche nach Name, E-Mail oder EU-Größe…"
 className="w-full bg-white border border-black/10 pl-9 pr-4 py-2.5 text-sm text-black/90 placeholder-black/20 outline-none focus:border-black/20 transition-colors"
 />
 </div>

 {/* View mode toggle */}
 <div className="flex border border-black/10 overflow-hidden">
 <button
 onClick={() => setViewMode('users')}
 className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-0 ${
 viewMode === 'users' ? 'bg-black/8 text-black/50' : 'bg-white text-black/45 hover:text-black/65'
 }`}
 >
 <Users size={12} />
 Benutzer
 </button>
 <button
 onClick={() => setViewMode('list')}
 className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-0 border-l border-black/10 ${
 viewMode === 'list' ? 'bg-black/8 text-black/50' : 'bg-white text-black/45 hover:text-black/65'
 }`}
 >
 <LayoutList size={12} />
 Alle Scans
 </button>
 </div>
 </div>

 {/* ── Download hint for admins ── */}
 {canDownload && (
 <div className="flex items-center gap-2.5 bg-black/4 border border-black/10 px-4 py-2.5 mb-4">
 <Box size={13} className="text-black/50 flex-shrink-0" strokeWidth={1.5} />
 <p className="text-[10px] text-black/50">
 {isAdmin ? 'Admin' : 'Curator'}: Klicke auf <strong>R</strong> / <strong>L</strong> oder{' '}
 <Download size={9} className="inline" /> um STL-Modelle herunterzuladen.
 Öffne einen Scan für die 3D-Vorschau.
 </p>
 </div>
 )}

 {/* ── Loading / Error ── */}
 {loading && (
 <div className="flex items-center justify-center py-16">
 <div className="w-8 h-8 border-2 border-black/10 border-t-black/35 animate-spin" />
 </div>
 )}
 {error && !loading && (
 <div className="flex items-center gap-2 text-black/40 text-sm py-12 justify-center">
 <AlertCircle size={16} />
 {error}
 </div>
 )}

 {/* ── Empty ── */}
 {!loading && !error && filtered.length === 0 && (
 <div className="text-center py-16">
 <Footprints size={32} className="text-black/20 mx-auto mb-3" />
 <p className="text-black/45 text-sm">
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
 <div key={scan.id} className="bg-white border border-black/6 overflow-hidden">
 {/* User mini-header */}
 <div className="flex items-center gap-2 px-4 pt-3 pb-1">
 <div className="w-5 h-5 bg-black/8 flex items-center justify-center flex-shrink-0">
 <span className="text-[8px] font-bold text-black/50">{scan.user_name?.[0]?.toUpperCase()}</span>
 </div>
 <span className="text-[9px] font-semibold text-black/45">{scan.user_name}</span>
 <span className="text-[8px] text-black/35">{scan.user_email}</span>
 <span className={`text-[10px] font-medium px-2 py-0.5 border ml-auto ${roleBadge(scan.user_role)}`}>
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
