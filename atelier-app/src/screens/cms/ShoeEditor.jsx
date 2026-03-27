import React, { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, X, Check, Upload, Gift, ChevronDown, ChevronUp } from 'lucide-react'
import useAtelierStore from '../../store/atelierStore'
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

function AccessoryAssigner({ shoeId }) {
 const { accessories } = useAtelierStore()
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
 const { shoes, addShoe, updateShoe, deleteShoe } = useAtelierStore()
 const [mode, setMode] = useState(null)
 const [filterCat, setFilterCat] = useState('ALL')
 const [expandedAcc, setExpandedAcc] = useState(null)

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
 onClick={() => setExpandedAcc(expandedAcc === shoe.id ? null : shoe.id)}
 className="w-7 h-7 flex items-center justify-center hover:bg-black/[0.04] transition-colors border-0 bg-transparent"
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
 {expandedAcc === shoe.id && (
 <div className="bg-white px-6 py-5 border-b border-black/[0.04]">
 <div className="flex items-center gap-2 mb-3">
 <Gift size={12} className="text-black/30" strokeWidth={1.25} />
 <p className="text-[9px] text-black/25 uppercase tracking-[0.25em] font-light">Zubehör für {shoe.name}</p>
 </div>
 <AccessoryAssigner shoeId={shoe.id} />
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
