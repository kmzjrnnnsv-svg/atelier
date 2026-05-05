import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, X, Check, Gift, Footprints } from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'
import ImagePicker from '../../components/ImagePicker'
import useStore from '../../store/store'

const emptyForm = { key: '', name: '', description: '', price: '', is_active: 1, sort_order: 0, image_data: '' }

export default function AccessoriesPanel() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState(null) // null | 'add' | { editing: item }
  const [form, setForm] = useState(emptyForm)
  const [linkAccId, setLinkAccId] = useState(null) // expanded shoe-link panel

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
    setForm({
      key: item.key, name: item.name, description: item.description || '',
      price: String(item.price), is_active: item.is_active,
      sort_order: item.sort_order || 0,
      image_data: item.image_data || '',
    })
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
          <div>
            <ImagePicker
              label="Produktbild"
              value={form.image_data || ''}
              onChange={(val) => set('image_data', val)}
            />
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
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-6 py-4 border-b border-black/[0.04]">
            {['', 'Zubehör', 'Preis', 'Status', 'Sortierung', 'Aktionen'].map((h, i) => (
              <p key={i} className="text-[9px] text-black/20 uppercase tracking-[0.25em] font-light">{h}</p>
            ))}
          </div>
          <div>
            {items.map(item => (
              <ItemRow
                key={item.id}
                item={item}
                onEdit={() => startEdit(item)}
                onDelete={() => handleDelete(item.id, item.name)}
                isLinkOpen={linkAccId === item.id}
                onToggleLink={() => setLinkAccId(prev => prev === item.id ? null : item.id)}
              />
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

// ── Eine Zeile inkl. ausklappbarem Schuh-Linker ────────────────────────────
function ItemRow({ item, onEdit, onDelete, isLinkOpen, onToggleLink }) {
  return (
    <>
      <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-6 py-4 items-center hover:bg-black/[0.01] transition-colors border-b border-black/[0.04]">
        {/* Vorschau */}
        <div className="w-12 h-12 bg-[#fafaf9] flex items-center justify-center overflow-hidden border border-black/[0.04]">
          {item.image_data ? (
            <img src={item.image_data} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <Gift size={16} strokeWidth={1.2} className="text-black/15" />
          )}
        </div>
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
          <button
            onClick={onToggleLink}
            className={`w-7 h-7 flex items-center justify-center transition-colors border-0 ${
              isLinkOpen ? 'bg-black/[0.05]' : 'bg-transparent hover:bg-black/[0.04]'
            }`}
            title="Schuhe zuweisen"
          >
            <Footprints size={12} strokeWidth={1.25} className="text-black/25" />
          </button>
          <button onClick={onEdit} className="w-7 h-7 flex items-center justify-center hover:bg-black/[0.04] transition-colors border-0 bg-transparent">
            <Pencil size={12} strokeWidth={1.25} className="text-black/25" />
          </button>
          <button onClick={onDelete} className="w-7 h-7 flex items-center justify-center hover:bg-black/[0.04] transition-colors border-0 bg-transparent">
            <Trash2 size={12} strokeWidth={1.25} className="text-black/25" />
          </button>
        </div>
      </div>
      {isLinkOpen && (
        <div className="px-6 py-5 bg-[#fafaf9] border-b border-black/[0.04]">
          <div className="flex items-center gap-2 mb-3">
            <Footprints size={12} className="text-black/30" strokeWidth={1.25} />
            <p className="text-[9px] text-black/25 uppercase tracking-[0.25em] font-light">
              Schuhe für „{item.name}"
            </p>
          </div>
          <ShoeAssigner accessoryId={item.id} />
        </div>
      )}
    </>
  )
}

// ── Schuh-Auswahl: zeigt alle Schuhe als Chips mit Vorschau ────────────────
function ShoeAssigner({ accessoryId }) {
  const { shoes } = useStore()
  const [assigned, setAssigned] = useState([])   // Array von shoe_ids
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(0)
  const [filterCat, setFilterCat] = useState('ALL')

  useEffect(() => {
    apiFetch(`/api/accessories/${accessoryId}/shoes`)
      .then(rows => { setAssigned((rows || []).map(r => r.id)); setLoading(false) })
      .catch(() => setLoading(false))
  }, [accessoryId])

  const toggle = (shoeId) =>
    setAssigned(prev => prev.includes(shoeId) ? prev.filter(id => id !== shoeId) : [...prev, shoeId])

  const selectAll = () => setAssigned(filteredShoes.map(s => s.id))
  const clearAll  = () => setAssigned([])

  const save = async () => {
    setSaving(true)
    try {
      await apiFetch(`/api/accessories/${accessoryId}/shoes`, {
        method: 'PUT',
        body: JSON.stringify({ shoe_ids: assigned }),
      })
      setSavedAt(Date.now())
    } catch (e) { alert(e?.error || 'Fehler') }
    finally { setSaving(false) }
  }

  if (loading) return <p className="text-[10px] text-black/25 py-2 font-light">Laden…</p>
  if (!shoes?.length) return <p className="text-[10px] text-black/35 py-2 font-light">Keine Schuhe vorhanden.</p>

  const categories = ['ALL', ...new Set(shoes.map(s => s.category).filter(Boolean))]
  const filteredShoes = filterCat === 'ALL' ? shoes : shoes.filter(s => s.category === filterCat)

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-black/40 font-light leading-relaxed">
        Wähle alle Schuhe aus, bei denen dieses Zubehör im Konfigurator angezeigt werden soll.
      </p>

      {/* Kategorie-Filter + Bulk-Aktionen */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setFilterCat(c)}
              className={filterCat === c
                ? 'px-2.5 py-1 text-[9px] bg-black text-white border-0 tracking-wider font-light'
                : 'px-2.5 py-1 text-[9px] text-black/35 hover:text-black/60 bg-transparent border-0 tracking-wider font-light'
              }
            >
              {c === 'ALL' ? 'Alle' : c}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={selectAll} className="text-[10px] text-black/45 hover:text-black tracking-[0.15em] uppercase bg-transparent border-0">
            Alle wählen
          </button>
          <span className="text-black/15">·</span>
          <button onClick={clearAll} className="text-[10px] text-black/45 hover:text-black tracking-[0.15em] uppercase bg-transparent border-0">
            Auswahl leeren
          </button>
        </div>
      </div>

      {/* Schuh-Karten als Toggle */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {filteredShoes.map(s => {
          const on = assigned.includes(s.id)
          return (
            <button
              key={s.id}
              onClick={() => toggle(s.id)}
              className={`flex items-center gap-2.5 px-3 py-2 transition-all border text-left ${
                on ? 'border-black bg-white' : 'border-black/[0.08] bg-white/60 hover:border-black/30'
              }`}
            >
              <div className="w-9 h-9 flex-shrink-0 overflow-hidden flex items-center justify-center" style={{ backgroundColor: s.color || '#f6f5f3' }}>
                {s.image && <img src={s.image} alt={s.name} className="w-full h-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-light text-black/80 truncate">{s.name}</p>
                <p className="text-[9px] text-black/35 tracking-wider uppercase">{s.category}</p>
              </div>
              {on && <Check size={12} strokeWidth={1.6} className="text-black flex-shrink-0" />}
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={save}
          disabled={saving}
          className="px-7 h-10 border border-black text-black text-[11px] bg-transparent hover:bg-black hover:text-white transition-all uppercase tracking-[0.2em] font-light disabled:opacity-30"
        >
          {saving ? 'Speichern…' : `Zuweisung speichern (${assigned.length})`}
        </button>
        {savedAt > 0 && Date.now() - savedAt < 3000 && (
          <span className="text-[10px] text-green-700 tracking-[0.18em] uppercase">Gespeichert</span>
        )}
      </div>
    </div>
  )
}
