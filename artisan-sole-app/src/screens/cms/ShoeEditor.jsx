import React, { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, X, Check, Upload, Gift, ChevronDown, ChevronUp, Palette, Layers, AlertCircle } from 'lucide-react'
import useStore from '../../store/store'
import { apiFetch } from '../../hooks/useApi'

const CATEGORIES = ['OXFORD', 'LOAFER', 'DERBY', 'BOOT', 'SNEAKER', 'MONK']
const TAGS = [null, 'BESTSELLER', 'NEW', 'LIMITED']

const emptyForm = {
 name: '',
 category: 'OXFORD',
 price: '',
 material: '',
 match: '',
 color: '#1f2937',
 tag: null,
 image: null,
 cost_price: '',
 promotion_price: '',
}

function ShoeForm({ initial = emptyForm, onSave, onCancel }) {
 const [form, setForm] = useState(initial)
 const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
 const valid = form.name && form.price && form.material

 const handleImageUpload = (e) => {
 const file = e.target.files[0]
 if (!file) return
 const reader = new FileReader()
 reader.onload = (ev) => set('image', ev.target.result)
 reader.readAsDataURL(file)
 }

 return (
 <div className="bg-white p-7">
 <h3 className="text-[9px] text-black/25 uppercase tracking-[0.25em] mb-5 font-light">{initial.id ? 'Schuh bearbeiten' : 'Neuer Schuh'}</h3>

 {/* Image Upload */}
 <div className="mb-5">
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Produktbild</label>
 <div className="flex gap-3 items-start">
 <div
 className="w-20 h-20 flex items-center justify-center flex-shrink-0 overflow-hidden"
 style={{ backgroundColor: form.color }}
 >
 {form.image ? (
 <img src={form.image} alt="" className="w-full h-full object-cover" />
 ) : (
 <svg viewBox="0 0 80 45" className="w-16">
 <path d="M5 36 Q3 39 13 41 L67 41 Q74 41 74 36 L72 28 Q70 22 65 21 L22 21 Q14 21 12 24 Z" fill="white" opacity="0.3" />
 <path d="M12 24 Q10 16 20 12 L40 10 Q52 9 60 15 Q68 20 72 28 L65 21 L22 21 Q14 21 12 24 Z" fill="white" opacity="0.2" />
 </svg>
 )}
 </div>
 <label className="flex-1 flex items-center gap-2 px-6 h-10 border border-black/15 text-black/50 hover:border-black hover:text-black text-[11px] transition-all bg-transparent uppercase tracking-[0.2em] font-light cursor-pointer">
 <Upload size={14} className="text-black/30" strokeWidth={1.25} />
 <span>Bild hochladen</span>
 <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
 </label>
 </div>
 </div>

 {/* Name */}
 <div className="mb-5">
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Name *</label>
 <input
 value={form.name}
 onChange={(e) => set('name', e.target.value)}
 placeholder="The Heritage Oxford"
 className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15"
 />
 </div>

 {/* Category + Tag row */}
 <div className="grid grid-cols-2 gap-5 mb-5">
 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Kategorie *</label>
 <select
 value={form.category}
 onChange={(e) => set('category', e.target.value)}
 className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70"
 >
 {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
 </select>
 </div>
 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Badge</label>
 <select
 value={form.tag ?? ''}
 onChange={(e) => set('tag', e.target.value || null)}
 className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70"
 >
 <option value="">Kein Badge</option>
 {TAGS.filter(Boolean).map((t) => <option key={t} value={t}>{t}</option>)}
 </select>
 </div>
 </div>

 {/* Price + Match row */}
 <div className="grid grid-cols-2 gap-5 mb-5">
 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Preis *</label>
 <input
 value={form.price}
 onChange={(e) => set('price', e.target.value)}
 placeholder="€ 1.450"
 className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15"
 />
 </div>
 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Biometric Match</label>
 <input
 value={form.match}
 onChange={(e) => set('match', e.target.value)}
 placeholder="99.4%"
 className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15"
 />
 </div>
 </div>

 {/* Material */}
 <div className="mb-5">
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Material *</label>
 <input
 value={form.material}
 onChange={(e) => set('material', e.target.value)}
 placeholder="Full-Grain Calfskin"
 className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15"
 />
 </div>

 {/* Color */}
 <div className="mb-5">
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Schuh-Farbe</label>
 <div className="flex items-center gap-3">
 <input
 type="color"
 value={form.color}
 onChange={(e) => set('color', e.target.value)}
 className="w-10 h-10 border-b border-black/[0.08] bg-transparent cursor-pointer"
 />
 <input
 value={form.color}
 onChange={(e) => set('color', e.target.value)}
 className="flex-1 h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 font-mono"
 />
 <div className="w-10 h-10 flex-shrink-0" style={{ backgroundColor: form.color }} />
 </div>
 </div>

 {/* Cost & Promotion pricing */}
 <div className="border-t border-black/[0.04] pt-5 mt-2">
 <p className="text-[9px] text-black/25 uppercase tracking-[0.25em] mb-5 font-light">Kalkulation & Promotion</p>
 <div className="grid grid-cols-2 gap-5">
 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Einkaufspreis (EK)</label>
 <input
 type="number" step="0.01"
 value={form.cost_price}
 onChange={(e) => set('cost_price', e.target.value)}
 placeholder="z.B. 280"
 className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15"
 />
 </div>
 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Promotion-Preis</label>
 <input
 value={form.promotion_price}
 onChange={(e) => set('promotion_price', e.target.value)}
 placeholder="z.B. € 890"
 className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15"
 />
 </div>
 </div>
 </div>

 {/* Actions */}
 <div className="flex gap-3 pt-6">
 <button
 onClick={() => valid && onSave(form)}
 disabled={!valid}
 className={`px-8 h-11 border border-black text-black text-[11px] bg-transparent hover:bg-black hover:text-white transition-all duration-300 uppercase tracking-[0.2em] font-light flex items-center justify-center gap-2 ${
 !valid ? 'disabled:opacity-30 cursor-not-allowed' : ''
 }`}
 >
 <Check size={14} strokeWidth={1.25} /> Speichern
 </button>
 <button
 onClick={onCancel}
 className="px-6 h-11 text-[11px] text-black/30 hover:text-black/60 bg-transparent border-0 transition-colors font-light"
 >
 Abbrechen
 </button>
 </div>
 </div>
 )
}

// ── Material-Assigner: Mehrfachauswahl aus globaler shoe_materials-Liste ──
function MaterialAssigner({ shoeId }) {
  const { shoeMaterials } = useStore()
  const [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(0)

  useEffect(() => {
    apiFetch(`/api/shoes/${shoeId}/materials`)
      .then(keys => { setSelected(Array.isArray(keys) ? keys : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [shoeId])

  const toggle = (key) => {
    setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  const save = async () => {
    setSaving(true)
    try {
      await apiFetch(`/api/shoes/${shoeId}/materials`, {
        method: 'PUT',
        body: JSON.stringify({ material_keys: selected }),
      })
      setSavedAt(Date.now())
    } catch {} finally { setSaving(false) }
  }

  if (loading) return <p className="text-[10px] text-black/25 py-2 font-light">Laden…</p>
  if (!shoeMaterials.length) return (
    <p className="text-[10px] text-black/35 py-2 font-light">
      Keine globalen Materialien definiert. Lege sie unter „Produkt-Konfig" an.
    </p>
  )

  return (
    <div className="pt-3 pb-2 space-y-3">
      <p className="text-[10px] text-black/35 font-light leading-relaxed">
        Wähle aus, welche Lederarten für diesen Schuh im Konfigurator angezeigt werden.
        Wenn nichts ausgewählt ist, werden alle globalen Materialien angezeigt.
      </p>
      <div className="flex flex-wrap gap-2">
        {shoeMaterials.map(m => {
          const on = selected.includes(m.key)
          return (
            <button
              key={m.key}
              onClick={() => toggle(m.key)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-[10px] tracking-wider transition-all font-light ${
                on ? 'bg-black text-white border-0' : 'text-black/30 hover:text-black/70 bg-transparent border border-black/[0.08]'
              }`}
            >
              {on && <Check size={11} strokeWidth={1.5} />}
              {m.label}
              {m.sub && <span className="opacity-60">· {m.sub}</span>}
            </button>
          )
        })}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="px-8 h-11 border border-black text-black text-[11px] bg-transparent hover:bg-black hover:text-white transition-all uppercase tracking-[0.2em] font-light disabled:opacity-30"
        >
          {saving ? 'Speichern…' : 'Materialien speichern'}
        </button>
        {savedAt > 0 && Date.now() - savedAt < 3000 && (
          <span className="text-[10px] text-green-700 tracking-[0.18em] uppercase">Gespeichert</span>
        )}
      </div>
    </div>
  )
}

// ── Color-Variant-Editor: pro Farbe Pflicht-Bild + optionale Zusatzbilder ──
function ColorVariantEditor({ shoeId }) {
  const [variants, setVariants] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [savedAt, setSavedAt] = useState(0)

  useEffect(() => {
    apiFetch(`/api/shoes/${shoeId}/colors`)
      .then(rows => { setVariants(Array.isArray(rows) ? rows : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [shoeId])

  const addVariant = () => {
    setVariants(prev => [...prev, { hex: '#1f2937', name: '', images: [] }])
    setError(null)
  }

  const updateVariant = (idx, patch) => {
    setVariants(prev => prev.map((v, i) => i === idx ? { ...v, ...patch } : v))
    setError(null)
  }

  const removeVariant = (idx) => {
    setVariants(prev => prev.filter((_, i) => i !== idx))
  }

  const handleImage = async (idx, files) => {
    const list = Array.from(files || [])
    if (!list.length) return
    const dataUrls = await Promise.all(list.map(file => new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = e => resolve(e.target.result)
      reader.readAsDataURL(file)
    })))
    updateVariant(idx, { images: [...(variants[idx].images || []), ...dataUrls] })
  }

  const removeImage = (idx, imgIdx) => {
    updateVariant(idx, { images: variants[idx].images.filter((_, i) => i !== imgIdx) })
  }

  const validate = () => {
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i]
      if (!v.name?.trim()) return `Farbe ${i + 1}: Name fehlt`
      if (!v.images?.length)  return `Farbe „${v.name}": mindestens 1 Bild erforderlich`
    }
    return null
  }

  const save = async () => {
    const err = validate()
    if (err) { setError(err); return }
    setSaving(true); setError(null)
    try {
      const rows = await apiFetch(`/api/shoes/${shoeId}/colors`, {
        method: 'PUT',
        body: JSON.stringify({ variants: variants.map(v => ({ hex: v.hex, name: v.name.trim(), images: v.images })) }),
      })
      setVariants(Array.isArray(rows) ? rows : [])
      setSavedAt(Date.now())
    } catch (e) {
      setError(e?.error || 'Speichern fehlgeschlagen')
    } finally { setSaving(false) }
  }

  if (loading) return <p className="text-[10px] text-black/25 py-2 font-light">Laden…</p>

  return (
    <div className="pt-3 pb-2 space-y-4">
      <p className="text-[10px] text-black/35 font-light leading-relaxed">
        Füge Farbvarianten hinzu. Jede Farbe braucht mindestens 1 Bild — das erste Bild wird im
        Konfigurator als Hauptansicht verwendet, weitere als zusätzliche Ansichten.
      </p>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-2">
          <AlertCircle size={13} className="text-red-500" />
          <p className="text-[11px] text-red-700">{error}</p>
        </div>
      )}

      {variants.map((v, idx) => {
        const hasImage = (v.images?.length || 0) > 0
        return (
          <div key={idx} className="border border-black/[0.08] p-4 space-y-3 bg-white">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={v.hex}
                onChange={e => updateVariant(idx, { hex: e.target.value })}
                className="w-9 h-9 border border-black/10 bg-transparent cursor-pointer p-0"
              />
              <input
                value={v.name}
                onChange={e => updateVariant(idx, { name: e.target.value })}
                placeholder="Farbname (z. B. Cognac)"
                className="flex-1 h-9 px-3 border-b border-black/[0.1] text-[12px] bg-transparent outline-none focus:border-black/40 font-light"
              />
              <input
                value={v.hex}
                onChange={e => updateVariant(idx, { hex: e.target.value })}
                className="w-24 h-9 px-2 border-b border-black/[0.1] text-[11px] font-mono bg-transparent outline-none"
              />
              <button
                onClick={() => removeVariant(idx)}
                className="w-8 h-8 flex items-center justify-center text-black/30 hover:text-red-600 bg-transparent border-0"
                title="Variante entfernen"
              >
                <Trash2 size={13} strokeWidth={1.4} />
              </button>
            </div>

            {/* Image gallery */}
            <div className="flex flex-wrap gap-2">
              {v.images?.map((img, i) => (
                <div key={i} className="relative w-20 h-20 group">
                  <img src={img} alt="" className="w-full h-full object-cover border border-black/10" />
                  <button
                    onClick={() => removeImage(idx, i)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-white border border-black/20 text-black/60 hover:text-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Bild entfernen"
                  >
                    <X size={11} strokeWidth={1.5} />
                  </button>
                  {i === 0 && (
                    <span className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[8px] tracking-[0.2em] uppercase text-center py-0.5">
                      Hauptbild
                    </span>
                  )}
                </div>
              ))}
              <label className={`w-20 h-20 flex flex-col items-center justify-center border border-dashed cursor-pointer transition-colors ${
                hasImage ? 'border-black/15 text-black/30 hover:border-black/40 hover:text-black/60' : 'border-red-300 text-red-500 bg-red-50/40'
              }`}>
                <Upload size={14} strokeWidth={1.4} />
                <span className="text-[8px] tracking-[0.18em] uppercase mt-1">{hasImage ? 'Mehr' : 'Pflicht'}</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={e => handleImage(idx, e.target.files)} />
              </label>
            </div>
            {!hasImage && (
              <p className="text-[10px] text-red-500 font-light">Mindestens 1 Bild ist erforderlich, sonst kann diese Farbe nicht gespeichert werden.</p>
            )}
          </div>
        )
      })}

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={addVariant}
          className="flex items-center gap-2 px-5 h-9 border border-black/15 text-black/55 hover:border-black hover:text-black text-[11px] bg-transparent uppercase tracking-[0.18em] font-light"
        >
          <Plus size={13} strokeWidth={1.4} /> Farbe hinzufügen
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="px-8 h-11 border border-black text-black text-[11px] bg-transparent hover:bg-black hover:text-white transition-all uppercase tracking-[0.2em] font-light disabled:opacity-30"
        >
          {saving ? 'Speichern…' : 'Farben speichern'}
        </button>
        {savedAt > 0 && Date.now() - savedAt < 3000 && (
          <span className="text-[10px] text-green-700 tracking-[0.18em] uppercase">Gespeichert</span>
        )}
      </div>
    </div>
  )
}

function AccessoryAssigner({ shoeId }) {
 const { accessories } = useStore()
 const [assigned, setAssigned] = useState([])
 const [loading, setLoading] = useState(true)
 const [saving, setSaving] = useState(false)

 useEffect(() => {
  apiFetch(`/api/shoes/${shoeId}/accessories`).then(rows => {
   setAssigned(rows.map(r => r.id))
   setLoading(false)
  }).catch(() => setLoading(false))
 }, [shoeId])

 const toggle = (accId) => {
  setAssigned(prev => prev.includes(accId) ? prev.filter(id => id !== accId) : [...prev, accId])
 }

 const save = async () => {
  setSaving(true)
  try {
   await apiFetch(`/api/shoes/${shoeId}/accessories`, {
    method: 'PUT',
    body: JSON.stringify({ accessory_ids: assigned }),
   })
  } catch {} finally { setSaving(false) }
 }

 if (loading) return <p className="text-[10px] text-black/25 py-2 font-light">Laden…</p>
 if (!accessories.length) return <p className="text-[10px] text-black/25 py-2 font-light">Keine Zubehörteile vorhanden</p>

 return (
  <div className="pt-3 pb-2 space-y-3">
   <div className="flex flex-wrap gap-2">
    {accessories.filter(a => a.is_active !== 0).map(acc => {
     const on = assigned.includes(acc.id)
     return (
      <button
       key={acc.id}
       onClick={() => toggle(acc.id)}
       className={`flex items-center gap-1.5 text-[11px] transition-all font-light ${
        on ? 'px-3.5 py-1.5 text-[10px] bg-black text-white border-0 tracking-wider' : 'px-3.5 py-1.5 text-[10px] text-black/25 hover:text-black/50 bg-transparent border border-black/[0.08] tracking-wider'
       }`}
      >
       {on && <Check size={11} strokeWidth={1.5} />}
       {acc.name}
       {acc.price != null && <span className="opacity-60 ml-0.5">{acc.price}</span>}
      </button>
     )
    })}
   </div>
   <button
    onClick={save}
    disabled={saving}
    className="px-8 h-11 border border-black text-black text-[11px] bg-transparent hover:bg-black hover:text-white transition-all duration-300 uppercase tracking-[0.2em] font-light disabled:opacity-30 cursor-not-allowed"
   >
    {saving ? 'Speichern…' : 'Zubehör speichern'}
   </button>
  </div>
 )
}

export default function ShoeEditor() {
 const { shoes, addShoe, updateShoe, deleteShoe } = useStore()
 const [mode, setMode] = useState(null)
 const [filterCat, setFilterCat] = useState('ALL')
 const [expandedPanel, setExpandedPanel] = useState(null) // { id, panel: 'acc'|'mat'|'col' }
 const togglePanel = (id, panel) =>
   setExpandedPanel(p => (p?.id === id && p?.panel === panel) ? null : { id, panel })

 const filtered = filterCat === 'ALL' ? shoes : shoes.filter((s) => s.category === filterCat)

 return (
 <div className="px-10 py-10 lg:px-14 lg:py-12 w-full max-w-full overflow-hidden">
 <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
 <div>
 <p className="text-[9px] text-black/20 uppercase tracking-[0.3em] mb-3 font-light">Kollektion</p>
 <h1 className="text-[28px] font-extralight text-black/85 tracking-tight">Schuhe</h1>
 <p className="text-[13px] text-black/30 mt-2 font-light">{shoes.length} Produkte verwalten</p>
 </div>
 {!mode && (
 <button
 onClick={() => setMode('add')}
 className="flex items-center gap-2 px-6 h-10 border border-black/15 text-black/50 hover:border-black hover:text-black text-[11px] transition-all bg-transparent uppercase tracking-[0.2em] font-light"
 >
 <Plus size={14} strokeWidth={1.25} /> Neuer Schuh
 </button>
 )}
 </div>

 {/* Add Form */}
 {mode === 'add' && (
 <div className="mb-8">
 <ShoeForm
 onSave={(f) => { addShoe(f); setMode(null) }}
 onCancel={() => setMode(null)}
 />
 </div>
 )}

 {/* Category filter */}
 <div className="flex gap-1 mb-6 flex-wrap">
 {['ALL', ...CATEGORIES].map((c) => (
 <button
 key={c}
 onClick={() => setFilterCat(c)}
 className={filterCat === c
 ? "px-3.5 py-1.5 text-[10px] bg-black text-white border-0 transition-all tracking-wider font-light"
 : "px-3.5 py-1.5 text-[10px] text-black/25 hover:text-black/50 bg-transparent border-0 transition-all tracking-wider font-light"
 }
 >
 {c === 'ALL' ? 'Alle' : c}
 </button>
 ))}
 </div>

 {/* Shoe List */}
 <div>
 {filtered.map((shoe) => (
 mode?.editing?.id === shoe.id ? (
 <ShoeForm
 key={shoe.id}
 initial={shoe}
 onSave={(f) => { updateShoe(shoe.id, f); setMode(null) }}
 onCancel={() => setMode(null)}
 />
 ) : (
 <React.Fragment key={shoe.id}>
 <div
 className="bg-white flex items-center gap-4 px-6 py-4.5 group hover:bg-black/[0.01] transition-all border-b border-black/[0.04] min-w-0"
 >
 {/* Preview */}
 <div className="w-14 h-14 flex-shrink-0 overflow-hidden flex items-center justify-center" style={{ backgroundColor: shoe.color }}>
 {shoe.image ? (
 <img src={shoe.image} alt={shoe.name} className="w-full h-full object-cover" />
 ) : (
 <svg viewBox="0 0 60 35" className="w-12">
 <path d="M4 28 Q2 31 10 33 L50 33 Q56 33 56 28 L54 20 Q52 14 48 13 L16 13 Q10 13 9 17 Z" fill="white" opacity="0.3" />
 <path d="M9 17 Q7 10 14 7 L30 5 Q41 4 46 10 Q50 14 54 20 L48 13 L16 13 Q10 13 9 17 Z" fill="white" opacity="0.2" />
 </svg>
 )}
 </div>

 {/* Info */}
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <p className="text-[13px] font-light text-black/70">{shoe.name}</p>
 {shoe.tag && (
 <span className="text-[9px] font-light text-black/25 uppercase tracking-[0.2em]">
 {shoe.tag}
 </span>
 )}
 </div>
 <p className="text-[10px] text-black/25 mt-0.5 font-light">{shoe.category} · {shoe.material}</p>
 {shoe.match && (
 <p className="text-[9px] text-black/20 mt-0.5 font-light">{shoe.match} Biometric Match</p>
 )}
 </div>

 {/* Price */}
 <div className="flex-shrink-0 text-right">
 <p className="text-[13px] font-light text-black/70">{shoe.price}</p>
 {shoe.cost_price && <p className="text-[9px] text-black/25 font-light">EK: € {shoe.cost_price}</p>}
 {shoe.promotion_price && <p className="text-[9px] text-black/30 font-light">Promo: {shoe.promotion_price}</p>}
 </div>

 {/* Actions */}
 <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
 <button
 onClick={() => togglePanel(shoe.id, 'mat')}
 className={`w-7 h-7 flex items-center justify-center hover:bg-black/[0.04] transition-colors border-0 bg-transparent ${expandedPanel?.id === shoe.id && expandedPanel?.panel === 'mat' ? 'bg-black/[0.05]' : ''}`}
 title="Materialien zuweisen"
 >
 <Layers size={12} strokeWidth={1.25} className="text-black/30" />
 </button>
 <button
 onClick={() => togglePanel(shoe.id, 'col')}
 className={`w-7 h-7 flex items-center justify-center hover:bg-black/[0.04] transition-colors border-0 bg-transparent ${expandedPanel?.id === shoe.id && expandedPanel?.panel === 'col' ? 'bg-black/[0.05]' : ''}`}
 title="Farben & Bilder verwalten"
 >
 <Palette size={12} strokeWidth={1.25} className="text-black/30" />
 </button>
 <button
 onClick={() => togglePanel(shoe.id, 'acc')}
 className={`w-7 h-7 flex items-center justify-center hover:bg-black/[0.04] transition-colors border-0 bg-transparent ${expandedPanel?.id === shoe.id && expandedPanel?.panel === 'acc' ? 'bg-black/[0.05]' : ''}`}
 title="Zubehör zuweisen"
 >
 <Gift size={12} strokeWidth={1.25} className="text-black/30" />
 </button>
 <button
 onClick={() => setMode({ editing: shoe })}
 className="w-7 h-7 flex items-center justify-center hover:bg-black/[0.04] transition-colors border-0 bg-transparent"
 >
 <Pencil size={12} strokeWidth={1.25} className="text-black/30" />
 </button>
 <button
 onClick={() => { if (confirm(`"${shoe.name}" löschen?`)) deleteShoe(shoe.id) }}
 className="w-7 h-7 flex items-center justify-center hover:bg-black/[0.04] transition-colors border-0 bg-transparent"
 >
 <Trash2 size={12} strokeWidth={1.25} className="text-black/30" />
 </button>
 </div>
 </div>
 {expandedPanel?.id === shoe.id && (
 <div className="bg-white px-6 py-5 border-b border-black/[0.04]">
 {expandedPanel.panel === 'acc' && (
 <>
 <div className="flex items-center gap-2 mb-3">
 <Gift size={12} className="text-black/30" strokeWidth={1.25} />
 <p className="text-[9px] text-black/25 uppercase tracking-[0.25em] font-light">Zubehör für {shoe.name}</p>
 </div>
 <AccessoryAssigner shoeId={shoe.id} />
 </>
 )}
 {expandedPanel.panel === 'mat' && (
 <>
 <div className="flex items-center gap-2 mb-3">
 <Layers size={12} className="text-black/30" strokeWidth={1.25} />
 <p className="text-[9px] text-black/25 uppercase tracking-[0.25em] font-light">Materialien für {shoe.name}</p>
 </div>
 <MaterialAssigner shoeId={shoe.id} />
 </>
 )}
 {expandedPanel.panel === 'col' && (
 <>
 <div className="flex items-center gap-2 mb-3">
 <Palette size={12} className="text-black/30" strokeWidth={1.25} />
 <p className="text-[9px] text-black/25 uppercase tracking-[0.25em] font-light">Farben für {shoe.name}</p>
 </div>
 <ColorVariantEditor shoeId={shoe.id} />
 </>
 )}
 </div>
 )}
 </React.Fragment>
 )
 ))}

 {filtered.length === 0 && (
 <div className="text-center py-20">
 <p className="text-[13px] text-black/25 font-light">Keine Schuhe in dieser Kategorie</p>
 </div>
 )}
 </div>
 </div>
 )
}
