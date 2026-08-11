import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, X, Check, Gift, Footprints, Upload } from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'
import useStore from '../../store/store'
import { accessoryImages } from '../../lib/accessoryImages'

const emptyForm = { key: '', name: '', description: '', price: '', is_active: 1, sort_order: 0, images: [] }

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

  // Dateien als base64 anhängen — dasselbe Verfahren wie beim Schuh-Editor.
  const addImages = async (files) => {
    const list = Array.from(files || [])
    if (!list.length) return
    const dataUrls = await Promise.all(list.map(file => new Promise(resolve => {
      const r = new FileReader()
      r.onload = e => resolve(e.target.result)
      r.readAsDataURL(file)
    })))
    setForm(f => ({ ...f, images: [...(f.images || []), ...dataUrls] }))
  }

  const removeImage = (idx) =>
    setForm(f => ({ ...f, images: (f.images || []).filter((_, i) => i !== idx) }))

  // Umsortieren, damit sich Titel- und Hover-Bild ohne erneutes Hochladen
  // festlegen lassen.
  const moveImage = (idx, dir) =>
    setForm(f => {
      const arr = [...(f.images || [])]
      const to = idx + dir
      if (to < 0 || to >= arr.length) return f
      ;[arr[idx], arr[to]] = [arr[to], arr[idx]]
      return { ...f, images: arr }
    })

  const handleSave = async () => {
    if (!valid) return
    // images trägt die Strecke, image_data bleibt gefüllt, damit ältere
    // Ansichten und der Warenkorb weiterhin ein Bild finden.
    const imgs = form.images || []
    const payload = {
      ...form,
      images: JSON.stringify(imgs),
      image_data: imgs[0] || '',
      price: parseFloat(form.price) || 0,
      sort_order: parseInt(form.sort_order) || 0,
      is_active: form.is_active ? 1 : 0,
    }
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
      images: accessoryImages(item),
    })
    setMode({ editing: item })
  }

  const startAdd = () => {
    setForm(emptyForm)
    setMode('add')
  }

  const inp = 'w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15'

  return (
    <div className="">
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
              <input value={form.key} onChange={e => set('key', e.target.value)} placeholder="shoe_tree_cedar" className={inp} disabled={mode !== 'add'} />
            </div>
            <div>
              <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Zedernholz Schuhspanner" className={inp} />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Beschreibung</label>
            {/* Mehrzeilig: Die Pflegesets führen auf, was in der Schachtel
                liegt — in einer einzeiligen Eingabe ließe sich das nicht
                vernünftig bearbeiten. Leerzeile trennt Absätze. */}
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={6}
              placeholder="Beschreibung. Eine Leerzeile beginnt einen neuen Absatz."
              className="w-full px-4 py-3 border border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15 leading-relaxed resize-y"
            />
          </div>

          {/* Bilderstrecke, gleiche Regeln wie beim Schuh */}
          <div>
            <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1 font-light">Produktbilder</label>
            <p className="text-[10px] text-black/25 font-light mb-3 leading-relaxed max-w-xl">
              Die Reihenfolge bestimmt die Rolle: Das <strong className="font-normal">erste</strong> Bild
              steht in der Übersicht, das <strong className="font-normal">zweite</strong> erscheint beim
              Überfahren. Mehrere Aufnahmen sind erlaubt.
            </p>
            <div className="flex flex-wrap gap-2">
              {(form.images || []).map((img, i) => (
                <div key={i} className="relative w-24 group">
                  <div className="w-24 h-32 overflow-hidden border border-black/10 bg-[#f6f5f3]">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-white border border-black/20 text-black/60 hover:text-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Bild entfernen"
                  >
                    <X size={10} strokeWidth={1.6} />
                  </button>
                  {(i === 0 || i === 1) && (
                    <span className="absolute top-0 left-0 bg-black/70 text-white text-[7px] tracking-[0.16em] uppercase px-1.5 py-0.5">
                      {i === 0 ? 'Übersicht' : 'Hover'}
                    </span>
                  )}
                  <div className="flex mt-1">
                    <button type="button" disabled={i === 0} onClick={() => moveImage(i, -1)}
                      className="flex-1 h-6 border border-black/10 bg-transparent text-[10px] text-black/40 hover:text-black disabled:opacity-25" aria-label="nach vorne">←</button>
                    <button type="button" disabled={i === (form.images || []).length - 1} onClick={() => moveImage(i, 1)}
                      className="flex-1 h-6 border border-black/10 border-l-0 bg-transparent text-[10px] text-black/40 hover:text-black disabled:opacity-25" aria-label="nach hinten">→</button>
                  </div>
                </div>
              ))}
              <label className="w-24 h-32 flex flex-col items-center justify-center border border-dashed border-black/15 text-black/30 hover:border-black/40 hover:text-black/60 cursor-pointer transition-colors">
                <Upload size={14} strokeWidth={1.4} />
                <span className="text-[8px] tracking-[0.16em] uppercase mt-1">Hinzufügen</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={e => addImages(e.target.files)} />
              </label>
            </div>
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
          {accessoryImages(item)[0] ? (
            <img src={accessoryImages(item)[0]} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <Gift size={16} strokeWidth={1.2} className="text-black/15" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-light text-black/85">{item.name}</p>
          <p className="text-[10px] text-black/30 font-light mt-0.5">{item.key}, {item.description || 'keine Beschreibung'}</p>
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
              Lederarten für „{item.name}"
            </p>
          </div>
          <MaterialAssigner accessory={item} />
        </div>
      )}
    </>
  )
}

// ── Lederart-Zuordnung: zeigt alle Materialien als Chips ───────────────────
// Zubehör wird im Konfigurator gezeigt, wenn das gewählte Material zutrifft.
// '*' (Universell) = bei jedem Material zeigen.
function MaterialAssigner({ accessory }) {
  const { shoeMaterials } = useStore()
  const materials = (shoeMaterials || []).filter(m => m.available !== 0)
  const parse = (csv) => (csv || '').split(',').map(s => s.trim()).filter(Boolean)

  const initial = parse(accessory.material_keys)
  const [universal, setUniversal] = useState(initial.length === 0 || initial.includes('*'))
  const [keys, setKeys] = useState(initial.filter(k => k !== '*'))
  const [colorMatch, setColorMatch] = useState(accessory.color_match || '')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(0)

  const toggle = (key) =>
    setKeys(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])

  const save = async () => {
    setSaving(true)
    try {
      const material_keys = universal ? '*' : keys.join(',')
      await apiFetch(`/api/accessories/${accessory.id}`, {
        method: 'PUT',
        body: JSON.stringify({ material_keys, color_match: colorMatch.trim() || null }),
      })
      setSavedAt(Date.now())
    } catch (e) { alert(e?.error || 'Fehler') }
    finally { setSaving(false) }
  }

  if (!materials.length) return <p className="text-[10px] text-black/35 py-2 font-light">Keine Materialien vorhanden.</p>

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-black/40 font-light leading-relaxed">
        Wähle die Lederarten, bei denen dieses Pflege-Zubehör im Konfigurator empfohlen
        werden soll. „Universell" zeigt es bei jedem Material.
      </p>

      {/* Universell-Schalter */}
      <button
        onClick={() => setUniversal(v => !v)}
        className={`flex items-center gap-2.5 px-3 py-2 border transition-all ${
          universal ? 'border-black bg-white' : 'border-black/[0.08] bg-white/60 hover:border-black/30'
        }`}
      >
        <div className={`w-4 h-4 flex items-center justify-center ${universal ? 'bg-black' : 'border border-black/20'}`}>
          {universal && <Check size={10} strokeWidth={2.5} className="text-white" />}
        </div>
        <span className="text-[11px] font-light text-black/75">Universell · bei jedem Material zeigen</span>
      </button>

      {/* Material-Chips */}
      <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 transition-opacity ${universal ? 'opacity-30 pointer-events-none' : ''}`}>
        {materials.map(m => {
          const on = keys.includes(m.key)
          return (
            <button
              key={m.key}
              onClick={() => toggle(m.key)}
              className={`flex items-center gap-2.5 px-3 py-2 transition-all border text-left ${
                on ? 'border-black bg-white' : 'border-black/[0.08] bg-white/60 hover:border-black/30'
              }`}
            >
              <div className="w-7 h-7 flex-shrink-0 rounded-sm" style={{ backgroundColor: m.color || '#f6f5f3' }} />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-light text-black/80 truncate">{m.label}</p>
                <p className="text-[9px] text-black/35 tracking-wider">{m.family || m.key}</p>
              </div>
              {on && <Check size={12} strokeWidth={1.6} className="text-black flex-shrink-0" />}
            </button>
          )
        })}
      </div>

      {/* Optionale Farb-Zuordnung */}
      <div>
        <label className="text-[9px] text-black/35 uppercase tracking-[0.2em] block mb-1.5 font-light">
          Nur bei Farbe (optional)
        </label>
        <input
          type="text"
          value={colorMatch}
          onChange={e => setColorMatch(e.target.value)}
          placeholder="z. B. schwarz,black, leer = jede Farbe"
          className="w-full max-w-md h-9 px-3 border border-black/[0.12] text-[12px] bg-white outline-none focus:border-black/30 transition-colors font-light text-black/70"
        />
        <p className="text-[9px] text-black/25 mt-1 font-light">
          Schlüsselwörter (kommagetrennt), Zubehör wird nur empfohlen, wenn der gewählte Farbname eines davon enthält.
        </p>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={save}
          disabled={saving}
          className="px-7 h-10 border border-black text-black text-[11px] bg-transparent hover:bg-black hover:text-white transition-all uppercase tracking-[0.2em] font-light disabled:opacity-30"
        >
          {saving ? 'Speichern…' : `Zuweisung speichern (${universal ? 'Universell' : keys.length})`}
        </button>
        {savedAt > 0 && Date.now() - savedAt < 3000 && (
          <span className="text-[10px] text-green-700 tracking-[0.18em] uppercase">Gespeichert</span>
        )}
      </div>
    </div>
  )
}
