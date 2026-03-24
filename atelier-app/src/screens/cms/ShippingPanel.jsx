import { useState, useEffect } from 'react'
import { Truck, Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'

const empty = { key: '', label: '', description: '', price: 0, free_above: '', is_default: false }

export default function ShippingPanel() {
  const [options, setOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // null | 'new' | id
  const [form, setForm] = useState(empty)

  const load = async () => {
    try {
      const data = await apiFetch('/api/shipping/all')
      setOptions(data)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const startEdit = (opt) => {
    setEditing(opt ? opt.id : 'new')
    setForm(opt ? { ...opt, free_above: opt.free_above ?? '' } : { ...empty })
  }

  const save = async () => {
    try {
      if (editing === 'new') {
        await apiFetch('/api/shipping', { method: 'POST', body: JSON.stringify(form) })
      } else {
        await apiFetch(`/api/shipping/${editing}`, { method: 'PUT', body: JSON.stringify(form) })
      }
      setEditing(null)
      load()
    } catch (e) { alert(e?.error || 'Fehler') }
  }

  const remove = async (id) => {
    if (!confirm('Versandoption deaktivieren?')) return
    await apiFetch(`/api/shipping/${id}`, { method: 'DELETE' })
    load()
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Truck size={18} strokeWidth={1.5} className="text-black/35" />
            <h1 className="text-xl font-bold text-black/85" style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>Versandoptionen</h1>
          </div>
          <p className="text-black/45 text-sm">Versandarten und Kosten verwalten</p>
        </div>
        <button
          onClick={() => startEdit(null)}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white text-xs border-0 hover:bg-black/85"
          style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}
        >
          <Plus size={13} /> Neue Option
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-black/15 border-t-black animate-spin-custom" />
        </div>
      )}

      {!loading && (
        <div className="space-y-3">
          {editing === 'new' && (
            <div className="bg-white border border-black/10 p-5 space-y-3">
              <p className="text-[10px] font-semibold text-black/50 uppercase tracking-wider">Neue Versandoption</p>
              <div className="grid grid-cols-2 gap-3">
                <input value={form.key} onChange={e => set('key', e.target.value)} placeholder="Key (z.B. express)" className="border border-black/10 px-3 py-2 text-sm focus:outline-none focus:border-black/30" />
                <input value={form.label} onChange={e => set('label', e.target.value)} placeholder="Label (z.B. Expressversand)" className="border border-black/10 px-3 py-2 text-sm focus:outline-none focus:border-black/30" />
                <input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Beschreibung" className="border border-black/10 px-3 py-2 text-sm focus:outline-none focus:border-black/30" />
                <input type="number" step="0.01" value={form.price} onChange={e => set('price', parseFloat(e.target.value) || 0)} placeholder="Preis (€)" className="border border-black/10 px-3 py-2 text-sm focus:outline-none focus:border-black/30" />
                <input type="number" step="1" value={form.free_above} onChange={e => set('free_above', e.target.value === '' ? '' : parseFloat(e.target.value))} placeholder="Gratis ab € (leer = nie)" className="border border-black/10 px-3 py-2 text-sm focus:outline-none focus:border-black/30" />
                <label className="flex items-center gap-2 text-sm text-black/60">
                  <input type="checkbox" checked={form.is_default} onChange={e => set('is_default', e.target.checked)} /> Standard
                </label>
              </div>
              <div className="flex gap-2">
                <button onClick={save} disabled={!form.key || !form.label} className="px-4 py-2 bg-black text-white text-xs border-0 disabled:opacity-30"><Check size={12} /> Speichern</button>
                <button onClick={() => setEditing(null)} className="px-4 py-2 bg-black/5 text-black/50 text-xs border-0"><X size={12} /> Abbrechen</button>
              </div>
            </div>
          )}

          {options.map(opt => (
            <div key={opt.id} className={`bg-white border overflow-hidden ${opt.is_active ? 'border-black/6' : 'border-black/4 opacity-50'}`}>
              {editing === opt.id ? (
                <div className="p-5 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input value={form.label} onChange={e => set('label', e.target.value)} className="border border-black/10 px-3 py-2 text-sm focus:outline-none focus:border-black/30" />
                    <input value={form.description || ''} onChange={e => set('description', e.target.value)} placeholder="Beschreibung" className="border border-black/10 px-3 py-2 text-sm focus:outline-none focus:border-black/30" />
                    <input type="number" step="0.01" value={form.price} onChange={e => set('price', parseFloat(e.target.value) || 0)} placeholder="Preis (€)" className="border border-black/10 px-3 py-2 text-sm focus:outline-none focus:border-black/30" />
                    <input type="number" step="1" value={form.free_above ?? ''} onChange={e => set('free_above', e.target.value === '' ? null : parseFloat(e.target.value))} placeholder="Gratis ab €" className="border border-black/10 px-3 py-2 text-sm focus:outline-none focus:border-black/30" />
                    <label className="flex items-center gap-2 text-sm text-black/60">
                      <input type="checkbox" checked={form.is_default} onChange={e => set('is_default', e.target.checked)} /> Standard
                    </label>
                    <label className="flex items-center gap-2 text-sm text-black/60">
                      <input type="checkbox" checked={form.is_active !== false && form.is_active !== 0} onChange={e => set('is_active', e.target.checked)} /> Aktiv
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={save} className="px-4 py-2 bg-black text-white text-xs border-0"><Check size={12} /> Speichern</button>
                    <button onClick={() => setEditing(null)} className="px-4 py-2 bg-black/5 text-black/50 text-xs border-0"><X size={12} /> Abbrechen</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-black/90">{opt.label}</span>
                      {opt.is_default ? <span className="text-[9px] bg-black text-white px-1.5 py-0.5">DEFAULT</span> : null}
                      {!opt.is_active ? <span className="text-[9px] bg-black/10 text-black/40 px-1.5 py-0.5">INAKTIV</span> : null}
                    </div>
                    {opt.description && <p className="text-[11px] text-black/40 mt-0.5">{opt.description}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-medium text-black/80">€{opt.price.toFixed(2)}</p>
                    {opt.free_above && <p className="text-[10px] text-black/35">Gratis ab €{opt.free_above}</p>}
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => startEdit(opt)} className="w-7 h-7 bg-black/4 hover:bg-black/8 flex items-center justify-center border-0">
                      <Pencil size={12} strokeWidth={1.5} className="text-black/40" />
                    </button>
                    <button onClick={() => remove(opt.id)} className="w-7 h-7 bg-black/4 hover:bg-black/8 flex items-center justify-center border-0">
                      <Trash2 size={12} strokeWidth={1.5} className="text-black/30" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
