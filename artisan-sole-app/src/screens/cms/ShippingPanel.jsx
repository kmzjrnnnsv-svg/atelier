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
    <div className="px-10 py-10 lg:px-14 lg:py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[9px] text-black/20 uppercase tracking-[0.3em] mb-3 font-light">Logistik</p>
          <h1 className="text-[28px] font-extralight text-black/85 tracking-tight">Versandoptionen</h1>
          <p className="text-[13px] text-black/30 mt-2 font-light">Versandarten und Kosten verwalten</p>
        </div>
        <button
          onClick={() => startEdit(null)}
          className="flex items-center gap-2 px-6 h-10 border border-black/15 text-black/50 hover:border-black hover:text-black text-[11px] transition-all bg-transparent uppercase tracking-[0.2em] font-light"
        >
          <Plus size={13} strokeWidth={1.25} /> Neue Option
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <p className="text-[13px] text-black/30 font-light opacity-50">Laden...</p>
        </div>
      )}

      {!loading && (
        <div className="space-y-0">
          {editing === 'new' && (
            <div className="bg-white p-7 mb-6">
              <p className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-4 font-light">Neue Versandoption</p>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Key</label>
                  <input value={form.key} onChange={e => set('key', e.target.value)} placeholder="z.B. express" className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15" />
                </div>
                <div>
                  <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Label</label>
                  <input value={form.label} onChange={e => set('label', e.target.value)} placeholder="z.B. Expressversand" className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15" />
                </div>
                <div>
                  <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Beschreibung</label>
                  <input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Beschreibung" className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15" />
                </div>
                <div>
                  <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Preis</label>
                  <input type="number" step="0.01" value={form.price} onChange={e => set('price', parseFloat(e.target.value) || 0)} placeholder="Preis (EUR)" className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15" />
                </div>
                <div>
                  <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Gratis ab</label>
                  <input type="number" step="1" value={form.free_above} onChange={e => set('free_above', e.target.value === '' ? '' : parseFloat(e.target.value))} placeholder="Gratis ab EUR (leer = nie)" className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15" />
                </div>
                <label className="flex items-center gap-2 text-[13px] text-black/50 font-light">
                  <input type="checkbox" checked={form.is_default} onChange={e => set('is_default', e.target.checked)} /> Standard
                </label>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={save} disabled={!form.key || !form.label} className="px-8 h-11 border border-black text-black text-[11px] bg-transparent hover:bg-black hover:text-white transition-all duration-300 uppercase tracking-[0.2em] font-light disabled:opacity-30">Speichern</button>
                <button onClick={() => setEditing(null)} className="px-6 h-11 text-[11px] text-black/30 hover:text-black/60 bg-transparent border-0 transition-colors font-light">Abbrechen</button>
              </div>
            </div>
          )}

          <div className="bg-white overflow-hidden">
            {options.map((opt, idx) => (
              <div key={opt.id} className={`${!opt.is_active ? 'opacity-50' : ''}`}>
                {editing === opt.id ? (
                  <div className="px-6 py-5 border-b border-black/[0.04]">
                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Label</label>
                        <input value={form.label} onChange={e => set('label', e.target.value)} className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15" />
                      </div>
                      <div>
                        <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Beschreibung</label>
                        <input value={form.description || ''} onChange={e => set('description', e.target.value)} placeholder="Beschreibung" className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15" />
                      </div>
                      <div>
                        <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Preis</label>
                        <input type="number" step="0.01" value={form.price} onChange={e => set('price', parseFloat(e.target.value) || 0)} placeholder="Preis (EUR)" className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15" />
                      </div>
                      <div>
                        <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Gratis ab</label>
                        <input type="number" step="1" value={form.free_above ?? ''} onChange={e => set('free_above', e.target.value === '' ? null : parseFloat(e.target.value))} placeholder="Gratis ab EUR" className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15" />
                      </div>
                      <label className="flex items-center gap-2 text-[13px] text-black/50 font-light">
                        <input type="checkbox" checked={form.is_default} onChange={e => set('is_default', e.target.checked)} /> Standard
                      </label>
                      <label className="flex items-center gap-2 text-[13px] text-black/50 font-light">
                        <input type="checkbox" checked={form.is_active !== false && form.is_active !== 0} onChange={e => set('is_active', e.target.checked)} /> Aktiv
                      </label>
                    </div>
                    <div className="flex gap-3 mt-6">
                      <button onClick={save} className="px-8 h-11 border border-black text-black text-[11px] bg-transparent hover:bg-black hover:text-white transition-all duration-300 uppercase tracking-[0.2em] font-light disabled:opacity-30">Speichern</button>
                      <button onClick={() => setEditing(null)} className="px-6 h-11 text-[11px] text-black/30 hover:text-black/60 bg-transparent border-0 transition-colors font-light">Abbrechen</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 px-6 py-4 hover:bg-black/[0.01] border-b border-black/[0.04]">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-light text-black/70">{opt.label}</span>
                        {opt.is_default ? <span className="text-[9px] text-black/20 uppercase tracking-[0.25em] font-light border border-black/10 px-1.5 py-0.5">Default</span> : null}
                        {!opt.is_active ? <span className="text-[9px] text-black/20 uppercase tracking-[0.25em] font-light">Inaktiv</span> : null}
                      </div>
                      {opt.description && <p className="text-[11px] text-black/25 mt-0.5 font-light">{opt.description}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[13px] font-light text-black/70">{'\u20AC'}{opt.price.toFixed(2)}</p>
                      {opt.free_above && <p className="text-[10px] text-black/25 font-light">Gratis ab {'\u20AC'}{opt.free_above}</p>}
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={() => startEdit(opt)} className="w-7 h-7 flex items-center justify-center hover:bg-black/[0.04] border-0 bg-transparent">
                        <Pencil size={12} strokeWidth={1.25} className="text-black/25" />
                      </button>
                      <button onClick={() => remove(opt.id)} className="w-7 h-7 flex items-center justify-center hover:bg-black/[0.04] border-0 bg-transparent">
                        <Trash2 size={12} strokeWidth={1.25} className="text-black/25" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
