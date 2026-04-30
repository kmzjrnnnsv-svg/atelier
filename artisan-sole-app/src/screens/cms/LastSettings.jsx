/**
 * LastSettings.jsx — CMS-Panel für Leisten-Parameter (Schuhtyp-Einstellungen)
 *
 * Admin/Curator kann hier für jeden Schuhtyp die Zugabe-Werte konfigurieren:
 * - Zugabe (mm) — Längen-Zugabe
 * - Spitzenverlängerung (mm) — Verlängerung über Zehen hinaus
 * - Fersensprengung (mm) — Fersenerhöhung
 * - Spannhöhen-Zuschlag (mm) — Instep-Erhöhung
 * - Gelenkfeder (mm) — Bodenkrümmung im Mittelfuß
 * - Breiten-Zugabe (mm) — Breiten-Komfortzugabe
 * - Umfangs-Zugabe (mm) — Umfangs-Komfortzugabe
 */

import { useState, useEffect } from 'react'
import { Save, RefreshCw, Footprints } from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'

const PARAM_FIELDS = [
 { key: 'zugabe_mm', label: 'Zugabe', unit: 'mm', desc: 'Gesamte Längenzugabe' },
 { key: 'toe_extension_mm', label: 'Spitzenverlängerung', unit: 'mm', desc: 'Über längsten Zeh hinaus' },
 { key: 'heel_pitch_mm', label: 'Fersensprengung', unit: 'mm', desc: 'Fersenerhöhung (Absatzhöhe)' },
 { key: 'instep_raise_mm', label: 'Spannhöhen-Zuschlag', unit: 'mm', desc: 'Instep-Erhöhung' },
 { key: 'shank_spring_mm', label: 'Gelenkfeder', unit: 'mm', desc: 'Bodenkrümmung Mittelfuß' },
 { key: 'width_ease_mm', label: 'Breiten-Zugabe', unit: 'mm', desc: 'Breiten-Komfortzugabe' },
 { key: 'girth_ease_mm', label: 'Umfangs-Zugabe', unit: 'mm', desc: 'Umfangs-Komfortzugabe' },
]

export default function LastSettings() {
 const [types, setTypes] = useState([])
 const [loading, setLoading] = useState(true)
 const [saving, setSaving] = useState(null) // shoe_type being saved
 const [editValues, setEditValues] = useState({}) // { [shoe_type]: { ...fields } }
 const [toast, setToast] = useState(null)

 async function loadTypes() {
 setLoading(true)
 try {
 const data = await apiFetch('/api/scans/shoe-types')
 setTypes(data)
 const vals = {}
 for (const t of data) {
 vals[t.shoe_type] = { ...t }
 }
 setEditValues(vals)
 } catch (e) {
 setToast({ type: 'error', msg: e.message })
 }
 setLoading(false)
 }

 useEffect(() => { loadTypes() }, [])

 function setField(shoeType, key, value) {
 setEditValues(v => ({
 ...v,
 [shoeType]: { ...v[shoeType], [key]: value },
 }))
 }

 async function handleSave(shoeType) {
 setSaving(shoeType)
 try {
 const vals = editValues[shoeType]
 await apiFetch(`/api/scans/shoe-types/${shoeType}`, {
 method: 'PUT',
 body: JSON.stringify({
 name: vals.name,
 zugabe_mm: Number(vals.zugabe_mm) || 0,
 toe_extension_mm: Number(vals.toe_extension_mm) || 0,
 heel_pitch_mm: Number(vals.heel_pitch_mm) || 0,
 instep_raise_mm: Number(vals.instep_raise_mm) || 0,
 shank_spring_mm: Number(vals.shank_spring_mm) || 0,
 width_ease_mm: Number(vals.width_ease_mm) || 0,
 girth_ease_mm: Number(vals.girth_ease_mm) || 0,
 }),
 })
 setToast({ type: 'ok', msg: `${vals.name} gespeichert` })
 setTimeout(() => setToast(null), 2000)
 } catch (e) {
 setToast({ type: 'error', msg: e.message })
 }
 setSaving(null)
 }

 if (loading) {
 return (
 <div className="flex items-center justify-center h-64 text-black/25 gap-2 font-light text-[13px]">
 <div className="w-5 h-5 border border-black/10 border-t-black/40 animate-spin rounded-full" /> Lade Schuhtypen...
 </div>
 )
 }

 return (
 <div className="px-10 py-10 lg:px-14 lg:py-12">
 {/* Header */}
 <div className="mb-10">
 <p className="text-[9px] text-black/20 uppercase tracking-[0.3em] mb-3 font-light">Produkte</p>
 <h1 className="text-[28px] font-extralight text-black/85 tracking-tight">Leisten-Parameter</h1>
 <p className="text-[13px] text-black/30 mt-2 font-light">Zugabe-Werte je Schuhtyp für die Leistenberechnung</p>
 </div>

 {/* Toast */}
 {toast && (
 <div className={`mb-6 px-5 py-3 text-[12px] font-light bg-white ${
 toast.type === 'ok' ? 'text-black/50' : 'text-black/40'
 }`}>
 {toast.msg}
 </div>
 )}

 {/* Shoe type cards */}
 <div className="space-y-6">
 {types.map(t => {
 const vals = editValues[t.shoe_type] ?? t
 const isSaving = saving === t.shoe_type
 const hasChanges = PARAM_FIELDS.some(
 f => Number(vals[f.key] ?? 0) !== Number(t[f.key] ?? 0)
 )

 return (
 <div key={t.shoe_type} className="bg-white overflow-hidden">

 {/* Card header */}
 <div className="flex items-center justify-between px-7 py-5 border-b border-black/[0.04]">
 <div>
 <h3 className="text-[15px] font-light text-black/75">{t.name}</h3>
 <span className="text-[10px] text-black/25 font-light font-mono">{t.shoe_type}</span>
 </div>
 <button
 onClick={() => handleSave(t.shoe_type)}
 disabled={isSaving || !hasChanges}
 className={`flex items-center gap-2 px-6 h-9 text-[10px] transition-all uppercase tracking-[0.2em] font-light ${
 hasChanges
 ? 'border border-black text-black hover:bg-black hover:text-white'
 : 'border border-black/[0.06] text-black/15 cursor-not-allowed'
 }`}
 >
 {isSaving
 ? <><RefreshCw size={11} className="animate-spin" strokeWidth={1.25} /> Speichern...</>
 : <><Save size={11} strokeWidth={1.25} /> Speichern</>
 }
 </button>
 </div>

 {/* Parameter grid */}
 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 p-7">
 {PARAM_FIELDS.map(({ key, label, unit, desc }) => (
 <div key={key}>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light" title={desc}>
 {label}
 </label>
 <div className="flex items-center gap-1.5">
 <input
 type="number"
 step="0.1"
 min="0"
 max="100"
 value={vals[key] ?? 0}
 onChange={e => setField(t.shoe_type, key, e.target.value)}
 className="w-full h-9 px-3 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
 />
 <span className="text-[10px] text-black/25 font-light w-6">{unit}</span>
 </div>
 <p className="text-[9px] text-black/15 mt-1 font-light">{desc}</p>
 </div>
 ))}
 </div>
 </div>
 )
 })}
 </div>
 </div>
 )
}
