import { useState } from 'react'
import { Plus, Pencil, Trash2, Check } from 'lucide-react'
import useAtelierStore from '../../store/atelierStore'

const emptyForm = { name: '', color: '#7b1e1e', badge: 'Limited' }

function CuratedForm({ initial = emptyForm, onSave, onCancel }) {
 const [form, setForm] = useState(initial)
 const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
 const valid = form.name.trim().length > 0

 return (
 <div className="bg-white border border-black/6 p-5 space-y-4">
 <h3 className="text-sm font-semibold text-black/65">{initial.id ? 'Bearbeiten' : 'Neues Curated Item'}</h3>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-xs font-medium text-black/35 mb-1.5">Name *</label>
 <input
 value={form.name}
 onChange={(e) => set('name', e.target.value)}
 placeholder="Oxblood"
 className="w-full bg-white border border-black/10 px-3.5 py-2.5 text-sm text-black/90 placeholder-black/20 focus:outline-none focus:border-black/20"
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-black/35 mb-1.5">Badge</label>
 <input
 value={form.badge}
 onChange={(e) => set('badge', e.target.value)}
 placeholder="Limited"
 className="w-full bg-white border border-black/10 px-3.5 py-2.5 text-sm text-black/90 placeholder-black/20 focus:outline-none focus:border-black/20"
 />
 </div>
 </div>

 <div>
 <label className="block text-xs font-medium text-black/35 mb-1.5">Farbe</label>
 <div className="flex items-center gap-3">
 <input type="color" value={form.color} onChange={(e) => set('color', e.target.value)}
 className="w-10 h-10 border border-black/15 bg-transparent cursor-pointer" />
 <input value={form.color} onChange={(e) => set('color', e.target.value)}
 className="flex-1 bg-white border border-black/10 px-3.5 py-2.5 text-sm text-black/90 font-mono focus:outline-none" />
 <div className="w-10 h-10 flex-shrink-0" style={{ backgroundColor: form.color }} />
 </div>
 </div>

 <div className="flex gap-3">
 <button onClick={() => valid && onSave(form)} disabled={!valid}
 className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium border-0 ${valid ? 'bg-black text-white hover:bg-black' : 'bg-black/5 text-black/35 cursor-not-allowed'}`}>
 <Check size={14} /> Speichern
 </button>
 <button onClick={onCancel}
 className="px-4 py-2.5 text-xs font-medium text-black/45 hover:text-black/90 bg-black/5 border-0">
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
 <div className="p-8">
 <div className="flex items-center justify-between mb-6">
 <div>
 <h1 className="text-xl font-bold text-black/85" style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>Curated Sections</h1>
 <p className="text-black/45 text-sm mt-1">Farb-Kollektionen für „Curated for You"</p>
 </div>
 {!mode && (
 <button onClick={() => setMode('add')}
 className="flex items-center gap-2 bg-black hover:bg-black text-white text-xs font-medium px-4 py-2 border-0">
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
 <div className="bg-white border border-black/6 p-4 mb-6">
 <p className="text-xs font-medium text-black/35 mb-3">Vorschau (App)</p>
 <div className="flex gap-3 overflow-x-auto pb-1">
 {curated.map((item) => (
 <div key={item.id} className="flex-shrink-0 bg-black/5 p-3 w-24">
 <div className="w-full h-12 mb-2" style={{ backgroundColor: item.color }} />
 <p className="text-[9px] font-semibold text-black/90 truncate">{item.name}</p>
 <p className="text-[8px] text-black/45">{item.badge}</p>
 </div>
 ))}
 </div>
 </div>

 {/* List */}
 <div className="space-y-2">
 {curated.map((item) => (
 mode?.editing?.id === item.id ? (
 <CuratedForm key={item.id} initial={item}
 onSave={(f) => { updateCurated(item.id, f); setMode(null) }}
 onCancel={() => setMode(null)} />
 ) : (
 <div key={item.id} className="bg-white border border-black/6 flex items-center gap-4 px-5 py-4 group hover:border-black/10 transition-all">
 <div className="w-12 h-12 flex-shrink-0" style={{ backgroundColor: item.color }} />
 <div className="flex-1 min-w-0">
 <p className="text-sm font-semibold text-black/90">{item.name}</p>
 <p className="text-[10px] text-black/45 mt-0.5">{item.color} · {item.badge}</p>
 </div>
 <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
 <button onClick={() => setMode({ editing: item })}
 className="w-8 h-8 bg-black/5 flex items-center justify-center hover:bg-black/10 border-0">
 <Pencil size={13} className="text-black/65" />
 </button>
 <button onClick={() => { if (confirm(`"${item.name}" löschen?`)) deleteCurated(item.id) }}
 className="w-8 h-8 bg-black/4 flex items-center justify-center hover:bg-black/8 border-0">
 <Trash2 size={13} className="text-black/35" />
 </button>
 </div>
 </div>
 )
 ))}
 {curated.length === 0 && (
 <div className="text-center py-16 text-black/35 text-sm">Keine Curated Items</div>
 )}
 </div>
 </div>
 )
}
