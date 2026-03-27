import { useState } from 'react'
import { Plus, Pencil, Trash2, Check } from 'lucide-react'
import useAtelierStore from '../../store/atelierStore'

const emptyForm = { name: '', color: '#7b1e1e', badge: 'Limited' }

function CuratedForm({ initial = emptyForm, onSave, onCancel }) {
 const [form, setForm] = useState(initial)
 const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
 const valid = form.name.trim().length > 0

 return (
 <div className="bg-white p-7 space-y-4">
 <h3 className="text-[9px] text-black/25 uppercase tracking-[0.25em] mb-5 font-light">{initial.id ? 'Bearbeiten' : 'Neues Curated Item'}</h3>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Name *</label>
 <input
 value={form.name}
 onChange={(e) => set('name', e.target.value)}
 placeholder="Oxblood"
 className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15"
 />
 </div>
 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Badge</label>
 <input
 value={form.badge}
 onChange={(e) => set('badge', e.target.value)}
 placeholder="Limited"
 className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15"
 />
 </div>
 </div>

 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Farbe</label>
 <div className="flex items-center gap-3">
 <input type="color" value={form.color} onChange={(e) => set('color', e.target.value)}
 className="w-10 h-10 border-b border-black/[0.08] bg-transparent cursor-pointer" />
 <input value={form.color} onChange={(e) => set('color', e.target.value)}
 className="flex-1 h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 font-mono" />
 <div className="w-10 h-10 flex-shrink-0" style={{ backgroundColor: form.color }} />
 </div>
 </div>

 <div className="flex gap-3">
 <button onClick={() => valid && onSave(form)} disabled={!valid}
 className="px-8 h-11 border border-black text-black text-[11px] bg-transparent hover:bg-black hover:text-white transition-all duration-300 uppercase tracking-[0.2em] font-light disabled:opacity-30 flex-1 flex items-center justify-center gap-2">
 <Check size={14} /> Speichern
 </button>
 <button onClick={onCancel}
 className="px-6 h-11 text-[11px] text-black/30 hover:text-black/60 bg-transparent border-0 transition-colors font-light">
 Abbrechen
 </button>
 </div>
 </div>
 )
}

export default function CuratedEditor() {
 const { curated, addCurated, updateCurated, deleteCurated } = useAtelierStore()
 const [mode, setMode] = useState(null)

 return (
 <div className="px-10 py-10 lg:px-14 lg:py-12">
 <div className="flex items-center justify-between mb-6">
 <div>
 <p className="text-[9px] text-black/20 uppercase tracking-[0.3em] mb-3 font-light">Collection</p>
 <h1 className="text-[28px] font-extralight text-black/85 tracking-tight">Curated Sections</h1>
 <p className="text-[13px] text-black/30 mt-2 font-light">Farb-Kollektionen für „Curated for You"</p>
 </div>
 {!mode && (
 <button onClick={() => setMode('add')}
 className="flex items-center gap-2 px-6 h-10 border border-black/15 text-black/50 hover:border-black hover:text-black text-[11px] transition-all bg-transparent uppercase tracking-[0.2em] font-light">
 <Plus size={14} /> Neues Item
 </button>
 )}
 </div>

 {mode === 'add' && (
 <div className="mb-6">
 <CuratedForm onSave={(f) => { addCurated(f); setMode(null) }} onCancel={() => setMode(null)} />
 </div>
 )}

 {/* Preview of how it looks in the app */}
 <div className="bg-white p-7 mb-6">
 <p className="text-[9px] text-black/25 uppercase tracking-[0.25em] mb-5 font-light">Vorschau (App)</p>
 <div className="flex gap-3 overflow-x-auto pb-1">
 {curated.map((item) => (
 <div key={item.id} className="flex-shrink-0 bg-black/[0.02] p-3 w-24">
 <div className="w-full h-12 mb-2" style={{ backgroundColor: item.color }} />
 <p className="text-[9px] font-light text-black/70 truncate">{item.name}</p>
 <p className="text-[8px] text-black/30 font-light">{item.badge}</p>
 </div>
 ))}
 </div>
 </div>

 {/* List */}
 <div className="space-y-0">
 {curated.map((item) => (
 mode?.editing?.id === item.id ? (
 <CuratedForm key={item.id} initial={item}
 onSave={(f) => { updateCurated(item.id, f); setMode(null) }}
 onCancel={() => setMode(null)} />
 ) : (
 <div key={item.id} className="bg-white flex items-center gap-4 px-6 py-4 group hover:bg-black/[0.01] transition-all border-b border-black/[0.04]">
 <div className="w-12 h-12 flex-shrink-0" style={{ backgroundColor: item.color }} />
 <div className="flex-1 min-w-0">
 <p className="text-[13px] font-light text-black/70">{item.name}</p>
 <p className="text-[10px] text-black/30 mt-0.5 font-light">{item.color} · {item.badge}</p>
 </div>
 <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
 <button onClick={() => setMode({ editing: item })}
 className="w-7 h-7 flex items-center justify-center hover:bg-black/[0.04] transition-colors border-0 bg-transparent">
 <Pencil size={12} strokeWidth={1.25} className="text-black/25" />
 </button>
 <button onClick={() => { if (confirm(`"${item.name}" löschen?`)) deleteCurated(item.id) }}
 className="w-7 h-7 flex items-center justify-center hover:bg-black/[0.04] transition-colors border-0 bg-transparent">
 <Trash2 size={12} strokeWidth={1.25} className="text-black/25" />
 </button>
 </div>
 </div>
 )
 ))}
 {curated.length === 0 && (
 <div className="text-center py-20">
 <p className="text-[13px] text-black/25 font-light">Keine Curated Items</p>
 </div>
 )}
 </div>
 </div>
 )
}
