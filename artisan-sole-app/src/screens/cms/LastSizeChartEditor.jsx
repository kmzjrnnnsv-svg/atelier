/**
 * LastSizeChartEditor.jsx, CMS-Panel für die Leisten-Maßtabelle.
 *
 * Zeigt je Leiste × Weite eine Größentabelle (Größen als Spalten, Fußlänge +
 * Ballenumfang als editierbare Zeilen), im Format der Hersteller-Tabelle.
 * Aus diesen Werten ermittelt das Auto-Matching die passende Leisten/Weite/Größe.
 *
 * GET  /api/last-size-chart       , alle Zeilen
 * PUT  /api/last-size-chart       , Bulk-Update geänderter Werte
 * POST /api/last-size-chart/reset , zurück auf die Tabellen-Werte (admin)
 */
import { useState, useEffect, useMemo } from 'react'
import { Save, RefreshCw, RotateCcw } from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'

// Anzeigereihenfolge + Labels + Gruppierung (Spiegel von fit.js LAST_LABELS).
const LAST_META = [
  { key: 'monti',        label: 'Monti',         group: 'Herren' },
  { key: 'zurigo',       label: 'Zurigo',        group: 'Herren' },

  { key: 'wellington',   label: 'Wellington',    group: 'Herren' },
  { key: 'drake',        label: 'Drake',         group: 'Herren' },
  { key: 'venetian',     label: 'Venetian',      group: 'Herren' },
  { key: 'drivers',      label: 'Drivers & Mocs', group: 'Herren' },
  { key: 'penny_loafer', label: 'Penny Loafer',  group: 'Herren' },
  { key: 'sneaker',      label: 'Sneaker',       group: 'Herren' },
  { key: 'moc_sport',    label: 'Moc Sport',     group: 'Herren' },
  { key: 'chunky',       label: 'Chunky Trainer', group: 'Herren' },
  { key: 'audrey_rose',  label: 'Audrey & Rose', group: 'Damen' },
  { key: 'chenoa',       label: 'Chenoa',        group: 'Damen' },
  { key: 'carola',       label: 'Carola B',      group: 'Damen' },
]
const WIDTH_ORDER = ['D', 'EE', 'EEE']

export default function LastSizeChartEditor() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [rows, setRows] = useState([])           // [{id, last_key, width, size_system, size_label, foot_length_mm, ball_girth_mm}]
  const [edits, setEdits] = useState({})         // { [id]: { foot_length_mm?, ball_girth_mm? } } (strings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)     // last_key being saved
  const [resetting, setResetting] = useState(false)
  const [toast, setToast] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const data = await apiFetch('/api/last-size-chart')
      setRows(Array.isArray(data) ? data : [])
      setEdits({})
    } catch (e) {
      setToast({ type: 'error', msg: e.message })
    }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function flash(msg, type = 'ok') {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 2200)
  }

  // Gruppierung: last_key → width → rows (sortiert nach Fußlänge).
  const grouped = useMemo(() => {
    const g = {}
    for (const r of rows) {
      ;(g[r.last_key] ||= {})[r.width] ||= []
      g[r.last_key][r.width].push(r)
    }
    for (const lk of Object.keys(g))
      for (const w of Object.keys(g[lk]))
        g[lk][w].sort((a, b) => a.foot_length_mm - b.foot_length_mm)
    return g
  }, [rows])

  // Reihenfolge: bekannte Leisten zuerst (Meta), dann unbekannte.
  const orderedLasts = useMemo(() => {
    const known = LAST_META.filter(m => grouped[m.key])
    const extra = Object.keys(grouped)
      .filter(lk => !LAST_META.some(m => m.key === lk))
      .map(lk => ({ key: lk, label: lk, group: 'Weitere' }))
    return [...known, ...extra]
  }, [grouped])

  const setField = (id, key, value) =>
    setEdits(e => ({ ...e, [id]: { ...e[id], [key]: value } }))

  const cellVal = (row, key) => {
    const e = edits[row.id]
    return e && e[key] !== undefined ? e[key] : String(row[key])
  }

  const lastHasChanges = (lastKey) => {
    const widths = grouped[lastKey] || {}
    return Object.values(widths).some(list => list.some(r => {
      const e = edits[r.id]
      if (!e) return false
      return (e.foot_length_mm !== undefined && Number(e.foot_length_mm) !== r.foot_length_mm)
        || (e.ball_girth_mm !== undefined && Number(e.ball_girth_mm) !== r.ball_girth_mm)
    }))
  }

  async function saveLast(lastKey) {
    const widths = grouped[lastKey] || {}
    const updates = []
    for (const list of Object.values(widths)) {
      for (const r of list) {
        const e = edits[r.id]
        if (!e) continue
        const len = e.foot_length_mm !== undefined ? Number(e.foot_length_mm) : r.foot_length_mm
        const girth = e.ball_girth_mm !== undefined ? Number(e.ball_girth_mm) : r.ball_girth_mm
        if (!Number.isFinite(len) || !Number.isFinite(girth)) continue
        if (len !== r.foot_length_mm || girth !== r.ball_girth_mm)
          updates.push({ id: r.id, foot_length_mm: len, ball_girth_mm: girth })
      }
    }
    if (!updates.length) return
    setSaving(lastKey)
    try {
      await apiFetch('/api/last-size-chart', { method: 'PUT', body: JSON.stringify({ updates }) })
      // lokale Zeilen aktualisieren + Edits dieser Leiste leeren
      const byId = new Map(updates.map(u => [u.id, u]))
      setRows(rs => rs.map(r => byId.has(r.id)
        ? { ...r, foot_length_mm: byId.get(r.id).foot_length_mm, ball_girth_mm: byId.get(r.id).ball_girth_mm }
        : r))
      setEdits(e => {
        const next = { ...e }
        for (const u of updates) delete next[u.id]
        return next
      })
      flash(`${updates.length} Wert(e) gespeichert`)
    } catch (e) {
      flash(e.message, 'error')
    }
    setSaving(null)
  }

  async function handleReset() {
    if (!window.confirm('Alle Werte auf die Original-Tabellenwerte zurücksetzen? Manuelle Änderungen gehen verloren.')) return
    setResetting(true)
    try {
      await apiFetch('/api/last-size-chart/reset', { method: 'POST' })
      await load()
      flash('Auf Tabellen-Werte zurückgesetzt')
    } catch (e) {
      flash(e.message, 'error')
    }
    setResetting(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-black/25 gap-2 font-light text-[13px]">
        <div className="w-5 h-5 border border-black/10 border-t-black/40 animate-spin rounded-full" /> Lade Maßtabelle…
      </div>
    )
  }

  let currentGroup = null

  return (
    <div className="">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-[9px] text-black/20 uppercase tracking-[0.3em] mb-3 font-light">Produkte</p>
          <h1 className="text-[28px] font-extralight text-black/85 tracking-tight">Leisten-Parameter</h1>
          <p className="text-[13px] text-black/30 mt-2 font-light max-w-2xl">
            Maßtabelle je Leiste × Weite (Fußlänge + Ballenumfang in mm). Aus diesen
            Werten wählt das System anhand der Kundenmaße automatisch die passende
            Leiste, Weite und Größe.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={handleReset}
            disabled={resetting}
            className="flex-shrink-0 flex items-center gap-2 px-5 h-9 text-[10px] uppercase tracking-[0.2em] font-light border border-black/15 text-black/45 hover:border-black/40 hover:text-black/70 transition-all"
          >
            {resetting
              ? <><RefreshCw size={11} className="animate-spin" strokeWidth={1.25} /> Zurücksetzen…</>
              : <><RotateCcw size={11} strokeWidth={1.25} /> Auf Tabellen-Werte</>}
          </button>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`mb-6 px-5 py-3 text-[12px] font-light bg-white ${toast.type === 'ok' ? 'text-black/50' : 'text-red-600/70'}`}>
          {toast.msg}
        </div>
      )}

      {/* Leisten */}
      <div className="space-y-8">
        {orderedLasts.map(meta => {
          const widths = grouped[meta.key]
          const widthKeys = WIDTH_ORDER.filter(w => widths[w]).concat(
            Object.keys(widths).filter(w => !WIDTH_ORDER.includes(w))
          )
          const changed = lastHasChanges(meta.key)
          const isSaving = saving === meta.key
          const showGroupHeader = meta.group !== currentGroup
          currentGroup = meta.group

          return (
            <div key={meta.key}>
              {showGroupHeader && (
                <p className="text-[10px] text-black/25 uppercase tracking-[0.25em] font-light mb-3 mt-2">{meta.group}</p>
              )}
              <div className="bg-white">
                {/* Leisten-Kopf */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.05]">
                  <div>
                    <h3 className="text-[15px] font-light text-black/75">{meta.label}</h3>
                    <span className="text-[10px] text-black/25 font-light font-mono">{meta.key}</span>
                  </div>
                  <button
                    onClick={() => saveLast(meta.key)}
                    disabled={isSaving || !changed}
                    className={`flex items-center gap-2 px-6 h-9 text-[10px] uppercase tracking-[0.2em] font-light transition-all ${
                      changed
                        ? 'border border-black text-black hover:bg-black hover:text-white'
                        : 'border border-black/[0.06] text-black/15 cursor-not-allowed'
                    }`}
                  >
                    {isSaving
                      ? <><RefreshCw size={11} className="animate-spin" strokeWidth={1.25} /> Speichern…</>
                      : <><Save size={11} strokeWidth={1.25} /> Speichern</>}
                  </button>
                </div>

                {/* Tabellen je Weite */}
                <div className="px-6 py-5 space-y-6">
                  {widthKeys.map(w => {
                    const list = widths[w]
                    const sys = list[0]?.size_system || 'EU'
                    return (
                      <div key={w}>
                        <p className="text-[10px] text-black/35 uppercase tracking-[0.18em] font-light mb-2">
                          Weite {w} · {sys}
                        </p>
                        <div className="overflow-x-auto">
                          <table className="border-collapse">
                            <thead>
                              <tr>
                                <th className="sticky left-0 z-10 bg-white text-left text-[9px] text-black/30 uppercase tracking-wider font-light px-2 py-1.5 min-w-[120px]">
                                  {sys}-Größe
                                </th>
                                {list.map(r => (
                                  <th key={r.id} className="text-[11px] text-black/55 font-normal px-1 py-1.5 min-w-[58px] text-center">
                                    {r.size_label}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {[
                                { key: 'foot_length_mm', label: 'Fußlänge (mm)' },
                                { key: 'ball_girth_mm', label: 'Ballenumfang (mm)' },
                              ].map(metric => (
                                <tr key={metric.key}>
                                  <td className="sticky left-0 z-10 bg-white text-[10px] text-black/40 font-light px-2 py-1 whitespace-nowrap">
                                    {metric.label}
                                  </td>
                                  {list.map(r => (
                                    <td key={r.id} className="px-0.5 py-1">
                                      <input
                                        type="number" step="0.1" inputMode="decimal"
                                        value={cellVal(r, metric.key)}
                                        onChange={e => setField(r.id, metric.key, e.target.value)}
                                        className="w-[56px] h-8 px-1 border-b border-black/[0.08] text-[12px] bg-transparent outline-none focus:border-black/30 transition-colors font-light text-black/70 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      />
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
