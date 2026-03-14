/**
 * LastSettings.jsx — CMS-Panel für Leisten-Parameter (Schuhtyp-Einstellungen)
 *
 * Admin/Curator kann hier für jeden Schuhtyp die Zugabe-Werte konfigurieren:
 *   - Zugabe (mm) — Längen-Zugabe
 *   - Spitzenverlängerung (mm) — Verlängerung über Zehen hinaus
 *   - Fersensprengung (mm) — Fersenerhöhung
 *   - Spannhöhen-Zuschlag (mm) — Instep-Erhöhung
 *   - Gelenkfeder (mm) — Bodenkrümmung im Mittelfuß
 *   - Breiten-Zugabe (mm) — Breiten-Komfortzugabe
 *   - Umfangs-Zugabe (mm) — Umfangs-Komfortzugabe
 */

import { useState, useEffect } from 'react'
import { Save, RefreshCw, Footprints } from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'

const PARAM_FIELDS = [
  { key: 'zugabe_mm',        label: 'Zugabe',              unit: 'mm', desc: 'Gesamte Längenzugabe' },
  { key: 'toe_extension_mm', label: 'Spitzenverlängerung', unit: 'mm', desc: 'Über längsten Zeh hinaus' },
  { key: 'heel_pitch_mm',    label: 'Fersensprengung',     unit: 'mm', desc: 'Fersenerhöhung (Absatzhöhe)' },
  { key: 'instep_raise_mm',  label: 'Spannhöhen-Zuschlag', unit: 'mm', desc: 'Instep-Erhöhung' },
  { key: 'shank_spring_mm',  label: 'Gelenkfeder',         unit: 'mm', desc: 'Bodenkrümmung Mittelfuß' },
  { key: 'width_ease_mm',    label: 'Breiten-Zugabe',      unit: 'mm', desc: 'Breiten-Komfortzugabe' },
  { key: 'girth_ease_mm',    label: 'Umfangs-Zugabe',      unit: 'mm', desc: 'Umfangs-Komfortzugabe' },
]

export default function LastSettings() {
  const [types, setTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)  // shoe_type being saved
  const [editValues, setEditValues] = useState({})  // { [shoe_type]: { ...fields } }
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
      <div className="flex items-center justify-center h-64 text-gray-400 gap-2">
        <RefreshCw size={16} className="animate-spin" /> Lade Schuhtypen...
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
          <Footprints size={18} className="text-teal-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-800">Leisten-Parameter</h2>
          <p className="text-xs text-gray-400">Zugabe-Werte je Schuhtyp für die Leistenberechnung</p>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`mb-4 px-4 py-2.5 rounded-xl text-sm font-medium ${
          toast.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Shoe type cards */}
      <div className="space-y-4">
        {types.map(t => {
          const vals = editValues[t.shoe_type] ?? t
          const isSaving = saving === t.shoe_type
          const hasChanges = PARAM_FIELDS.some(
            f => Number(vals[f.key] ?? 0) !== Number(t[f.key] ?? 0)
          )

          return (
            <div key={t.shoe_type}
              className="bg-white border border-gray-100 rounded-xl overflow-hidden">

              {/* Card header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">{t.name}</h3>
                  <span className="text-[10px] text-gray-400 font-mono">{t.shoe_type}</span>
                </div>
                <button
                  onClick={() => handleSave(t.shoe_type)}
                  disabled={isSaving || !hasChanges}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    hasChanges
                      ? 'bg-teal-500 text-white border-teal-500 hover:bg-teal-600'
                      : 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                  }`}
                >
                  {isSaving
                    ? <><RefreshCw size={12} className="animate-spin" /> Speichern...</>
                    : <><Save size={12} /> Speichern</>
                  }
                </button>
              </div>

              {/* Parameter grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
                {PARAM_FIELDS.map(({ key, label, unit, desc }) => (
                  <div key={key}>
                    <label className="block text-[10px] font-medium text-gray-400 mb-1" title={desc}>
                      {label}
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={vals[key] ?? 0}
                        onChange={e => setField(t.shoe_type, key, e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-900 text-right focus:outline-none focus:border-teal-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-[10px] text-gray-400 w-6">{unit}</span>
                    </div>
                    <p className="text-[9px] text-gray-300 mt-0.5">{desc}</p>
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
