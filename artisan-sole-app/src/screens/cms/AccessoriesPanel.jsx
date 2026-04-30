import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, X, Check, Gift } from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'

const emptyForm = { key: '', name: '', description: '', price: '', is_active: 1, sort_order: 0 }

export default function AccessoriesPanel() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState(null) // null | 'add' | { editing: item }
  const [form, setForm] = useState(emptyForm)

  const load = async () => {
    try {
      const data = await apiFetch('/api/accessories')
      setItems(data.sort((a, b) => a.sort_order - b.sort_order))
    } catch { /* */ } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const valid = form.key && form.name && form.price

  const handleSave = async () => {
    if (!valid) return
    const payload = { ...form, price: parseFloat(form.price) || 0, sort_order: parseInt(form.sort_order) || 0, is_active: form.is_active ? 1 : 0 }
    try {
      if (mode === 'add') {
        const row = await apiFetch('/api/accessories', { method: 'POST', body: JSON.stringify(payload) })
        setItems(prev => [...prev, row].sort((a, b) => a.sort_order - b.sort_order))
      } else {
        const row = await apiFetch(`/api/accessories/${mode.editing.id}`, { method: 'PUT', body: JSON.stringify(payload) })
        setItems(prev => prev.map(i => i.id === row.id ? row : i).sort((a, b) => a.sort_order - b.sort_order))
      }
      setMode(null)
    } catch (e) { alert(e?.error || 'Fehler') }
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`"${name}" wirklich löschen?`)) return
    try {
      await apiFetch(`/api/accessories/${id}`, { method: 'DELETE' })
      setItems(prev => prev.filter(i => i.id !== id))
    } catch (e) { alert(e?.error || 'Fehler') }
  }

  const startEdit = (item) => {
    setForm({ key: item.key, name: item.name, description: item.description || '', price: String(item.price), is_active: item.is_active, sort_order: item.sort_order || 0 })
    setMode({ editing: item })
  }

  const startAdd = () => {
    setForm(emptyForm)
    setMode('add')
  }

  const inp = 'w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15'

  return (
    <div className="px-10 py-10 lg:px-14 lg:py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[9px] text-black/20 uppercase tracking-[0.3em] mb-3 font-light">Kollektion</p>
          <h1 className="text-[28px] font-extralight text-black/85 tracking-tight">Zubehör</h1>
          <p className="text-[13px] text-black/30 mt-2 font-light">Zubehör & Accessoires verwalten</p>
        </div>
        {!mode && (
          <button onClick={startAdd} className="flex items-center gap-2 px-6 h-10 border border-black/15 text-black/50 hover:border-black hover:text-black text-[11px] transition-all bg-transparent uppercase tracking-[0.2em] font-light">
            <Plus size={14} strokeWidth={1.25} /> Neues Zubehör
          </button>
        )}
      </div>

      {/* Form */}
      {mode && (
        <div className="bg-white p-7 space-y-5 mb-8">
          <h3 className="text-[9px] text-black/20 uppercase tracking-[0.3em] font-light">{mode === 'add' ? 'Neues Zubehör' : 'Zubehör bearbeiten'}</h3>
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Schlüssel *</label>
              <input value={form.key} onChange={e => set('key', e.target.value)} placeholder="shoetrees" className={inp} disabled={mode !== 'add'} />
            </div>
            <div>
              <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Zedernholz Schuhspanner" className={inp} />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Beschreibung</label>
            <input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Kurze Beschreibung" className={inp} />
          </div>
          <div className="grid grid-cols-3 gap-5">
            <div>
              <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Preis (€) *</label>
              <input type="number" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} placeholder="45" className={inp} />
            </div>
            <div>
              <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Sortierung</label>
              <input type="number" value={form.sort_order} onChange={e => set('sort_order', e.target.value)} className={inp} />
            </div>
            <div className="flex items-end">
              <button onClick={() => set('is_active', form.is_active ? 0 : 1)} className={form.is_active ? 'flex items-center gap-2 px-4 py-2.5 border border-black text-black text-[11px] transition-all font-light' : 'flex items-center gap-2 px-4 py-2.5 border border-black/[0.08] text-black/30 text-[11px] transition-all font-light'}>
                {form.is_active ? <Check size={12} /> : null} {form.is_active ? 'Aktiv' : 'Inaktiv'}
              </button>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={!valid} className={`flex-1 h-11 border border-black text-black text-[11px] bg-transparent hover:bg-black hover:text-white transition-all duration-300 uppercase tracking-[0.2em] font-light flex items-center justify-center gap-2 ${!valid ? 'opacity-30 cursor-not-allowed' : ''}`}>
              <Check size={14} strokeWidth={1.25} /> Speichern
            </button>
            <button onClick={() => setMode(null)} className="px-6 h-11 text-[11px] text-black/30 hover:text-black/60 bg-transparent border-0 transition-colors font-light">Abbrechen</button>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-5 h-5 border border-black/10 border-t-black/40 animate-spin" />
        </div>
      )}

      {!loading && (
        <div className="bg-white overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-6 py-4 border-b border-black/[0.04]">
            {['Zubehör', 'Preis', 'Status', 'Sortierung', 'Aktionen'].map(h => (
              <p key={h} className="text-[9px] text-black/20 uppercase tracking-[0.25em] font-light">{h}</p>
            ))}
          </div>
          <div>
            {items.map(item => (
              <div key={item.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-6 py-4 items-center hover:bg-black/[0.01] transition-colors border-b border-black/[0.04]">
                <div className="min-w-0">
                  <p className="text-[13px] font-light text-black/85">{item.name}</p>
                  <p className="text-[10px] text-black/30 font-light mt-0.5">{item.key} — {item.description || '–'}</p>
                </div>
                <p className="text-[13px] font-light text-black/70">€ {item.price}</p>
                <span className={item.is_active ? 'text-[9px] text-black/40 uppercase tracking-wider font-light' : 'text-[9px] text-black/15 uppercase tracking-wider font-light'}>
                  {item.is_active ? 'Aktiv' : 'Inaktiv'}
                </span>
                <p className="text-[10px] text-black/30 font-light">{item.sort_order}</p>
                <div className="flex gap-1.5">
                  <button onClick={() => startEdit(item)} className="w-7 h-7 flex items-center justify-center hover:bg-black/[0.04] transition-colors border-0 bg-transparent">
                    <Pencil size={12} strokeWidth={1.25} className="text-black/25" />
                  </button>
                  <button onClick={() => handleDelete(item.id, item.name)} className="w-7 h-7 flex items-center justify-center hover:bg-black/[0.04] transition-colors border-0 bg-transparent">
                    <Trash2 size={12} strokeWidth={1.25} className="text-black/25" />
                  </button>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="text-center py-16 text-[13px] text-black/25 font-light">Kein Zubehör vorhanden</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
