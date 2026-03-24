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

  const inp = 'w-full bg-white border border-black/8 px-3.5 py-2.5 text-sm text-black/80 placeholder-black/15 focus:outline-none focus:border-black/20'

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Gift size={18} strokeWidth={1.5} className="text-black/35" />
            <h1 className="text-xl font-bold text-black/85" style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>Zubehör</h1>
          </div>
          <p className="text-black/45 text-sm">Zubehör & Accessoires verwalten</p>
        </div>
        {!mode && (
          <button onClick={startAdd} className="flex items-center gap-2 bg-black text-white text-[11px] font-semibold px-5 py-2.5 border-0 uppercase tracking-wider hover:bg-black/85 transition-colors">
            <Plus size={14} strokeWidth={1.5} /> Neues Zubehör
          </button>
        )}
      </div>

      {/* Form */}
      {mode && (
        <div className="bg-white border border-black/6 p-6 space-y-4 mb-6">
          <h3 className="text-[11px] font-semibold text-black/50 uppercase tracking-wider">{mode === 'add' ? 'Neues Zubehör' : 'Zubehör bearbeiten'}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-medium text-black/30 mb-1.5 uppercase tracking-wider">Schlüssel *</label>
              <input value={form.key} onChange={e => set('key', e.target.value)} placeholder="shoetrees" className={inp} disabled={mode !== 'add'} />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-black/30 mb-1.5 uppercase tracking-wider">Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Zedernholz Schuhspanner" className={inp} />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-medium text-black/30 mb-1.5 uppercase tracking-wider">Beschreibung</label>
            <input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Kurze Beschreibung" className={inp} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-medium text-black/30 mb-1.5 uppercase tracking-wider">Preis (€) *</label>
              <input type="number" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} placeholder="45" className={inp} />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-black/30 mb-1.5 uppercase tracking-wider">Sortierung</label>
              <input type="number" value={form.sort_order} onChange={e => set('sort_order', e.target.value)} className={inp} />
            </div>
            <div className="flex items-end">
              <button onClick={() => set('is_active', form.is_active ? 0 : 1)} className={`flex items-center gap-2 px-3 py-2.5 border text-xs transition-all ${form.is_active ? 'border-black bg-black text-white' : 'border-black/10 bg-white text-black/40'}`}>
                {form.is_active ? <Check size={12} /> : null} {form.is_active ? 'Aktiv' : 'Inaktiv'}
              </button>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={!valid} className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[11px] font-semibold transition-all border-0 uppercase tracking-wider ${valid ? 'bg-black text-white' : 'bg-black/5 text-black/25 cursor-not-allowed'}`}>
              <Check size={14} strokeWidth={1.5} /> Speichern
            </button>
            <button onClick={() => setMode(null)} className="px-5 py-2.5 text-[11px] font-medium text-black/40 hover:text-black/70 bg-black/4 hover:bg-black/8 transition-all border-0">Abbrechen</button>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-black/15 border-t-black animate-spin-custom" />
        </div>
      )}

      {!loading && (
        <div className="bg-white border border-black/6 overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 bg-[#f6f5f3] border-b border-black/6">
            {['Zubehör', 'Preis', 'Status', 'Sortierung', 'Aktionen'].map(h => (
              <p key={h} className="text-[10px] font-medium text-black/30 uppercase tracking-wider">{h}</p>
            ))}
          </div>
          <div className="divide-y divide-black/6">
            {items.map(item => (
              <div key={item.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-4 items-center hover:bg-black/3 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-black/90">{item.name}</p>
                  <p className="text-[10px] text-black/40">{item.key} — {item.description || '–'}</p>
                </div>
                <p className="text-sm font-bold text-black/70">€ {item.price}</p>
                <span className={`text-[10px] font-medium px-2 py-0.5 ${item.is_active ? 'bg-black/8 text-black/50' : 'bg-black/4 text-black/25'}`}>
                  {item.is_active ? 'Aktiv' : 'Inaktiv'}
                </span>
                <p className="text-[10px] text-black/35">{item.sort_order}</p>
                <div className="flex gap-1.5">
                  <button onClick={() => startEdit(item)} className="w-7 h-7 bg-black/4 hover:bg-black/8 flex items-center justify-center border-0 transition-colors">
                    <Pencil size={12} strokeWidth={1.5} className="text-black/40" />
                  </button>
                  <button onClick={() => handleDelete(item.id, item.name)} className="w-7 h-7 bg-black/4 hover:bg-black/8 flex items-center justify-center border-0 transition-colors">
                    <Trash2 size={12} strokeWidth={1.5} className="text-black/30" />
                  </button>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="text-center py-12 text-black/30 text-sm">Kein Zubehör vorhanden</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
