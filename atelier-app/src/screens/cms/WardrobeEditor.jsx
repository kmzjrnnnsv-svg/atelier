import { useState } from 'react'
import { Plus, Pencil, Trash2, Check } from 'lucide-react'
import useAtelierStore from '../../store/atelierStore'

const emptyForm = { name: '', color: '#374151' }

function ItemForm({ initial = emptyForm, title, onSave, onCancel }) {
 const [form, setForm] = useState(initial)
 const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
 const valid = form.name.trim().length > 0

 return (
 <div className="bg-white p-7 space-y-4">
 <h3 className="text-[9px] text-black/25 uppercase tracking-[0.25em] mb-5 font-light">{title}</h3>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Name *</label>
 <input value={form.name} onChange={(e) => set('name', e.target.value)}
 placeholder="Charcoal Suit"
 className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15" />
 </div>
 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Farbe</label>
 <div className="flex items-center gap-2">
 <input type="color" value={form.color} onChange={(e) => set('color', e.target.value)}
 className="w-10 h-10 border-b border-black/[0.08] bg-transparent cursor-pointer" />
 <input value={form.color} onChange={(e) => set('color', e.target.value)}
 className="flex-1 h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 font-mono" />
 </div>
 </div>
 </div>
 <div className="flex gap-3">
 <button onClick={() => valid && onSave(form)} disabled={!valid}
 className="px-8 h-11 border border-black text-black text-[11px] bg-transparent hover:bg-black hover:text-white transition-all duration-300 uppercase tracking-[0.2em] font-light disabled:opacity-30 flex-1 flex items-center justify-center gap-2">
 <Check size={14} /> Speichern
 </button>
 <button onClick={onCancel} className="px-6 h-11 text-[11px] text-black/30 hover:text-black/60 bg-transparent border-0 transition-colors font-light">
 Abbrechen
 </button>
 </div>
 </div>
 )
}

function Section({ title, description, items, onAdd, onUpdate, onDelete, editMode, setEditMode, sectionKey }) {
 const [showAdd, setShowAdd] = useState(false)

 return (
 <div className="bg-white overflow-hidden mb-4">
 <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.04]">
 <div>
 <p className="text-[13px] font-light text-black/70">{title}</p>
 <p className="text-[10px] text-black/30 mt-0.5 font-light">{description}</p>
 </div>
 <button onClick={() => setShowAdd(true)}
 className="flex items-center gap-2 px-6 h-10 border border-black/15 text-black/50 hover:border-black hover:text-black text-[11px] transition-all bg-transparent uppercase tracking-[0.2em] font-light">
 <Plus size={11} /> Hinzufügen
 </button>
 </div>

 {showAdd && (
 <div className="p-7 border-b border-black/[0.04]">
 <ItemForm title={`Neues ${title} Item`}
 onSave={(f) => { onAdd(f); setShowAdd(false) }}
 onCancel={() => setShowAdd(false)} />
 </div>
 )}

 <div>
 {items.map((item) => (
 editMode?.key === sectionKey && editMode?.id === item.id ? (
 <div key={item.id} className="p-7">
 <ItemForm initial={item} title="Bearbeiten"
 onSave={(f) => { onUpdate(item.id, f); setEditMode(null) }}
 onCancel={() => setEditMode(null)} />
 </div>
 ) : (
 <div key={item.id} className="bg-white flex items-center gap-4 px-6 py-4 group hover:bg-black/[0.01] transition-all border-b border-black/[0.04]">
 <div className="w-10 h-10 flex-shrink-0" style={{ backgroundColor: item.color }} />
 <div className="flex-1 min-w-0">
 <p className="text-[13px] font-light text-black/70">{item.name}</p>
 <p className="text-[9px] text-black/30 font-mono font-light">{item.color}</p>
 </div>
 <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
 <button onClick={() => setEditMode({ key: sectionKey, id: item.id })}
 className="w-7 h-7 flex items-center justify-center hover:bg-black/[0.04] transition-colors border-0 bg-transparent">
 <Pencil size={12} strokeWidth={1.25} className="text-black/25" />
 </button>
 <button onClick={() => { if (confirm(`"${item.name}" löschen?`)) onDelete(item.id) }}
 className="w-7 h-7 flex items-center justify-center hover:bg-black/[0.04] transition-colors border-0 bg-transparent">
 <Trash2 size={12} strokeWidth={1.25} className="text-black/25" />
 </button>
 </div>
 </div>
 )
 ))}
 {items.length === 0 && (
 <div className="text-center py-20">
 <p className="text-[13px] text-black/25 font-light">Noch keine Einträge</p>
 </div>
 )}
 </div>
 </div>
 )
}

export default function WardrobeEditor() {
 const { wardrobe, addWardrobeItem, updateWardrobeItem, deleteWardrobeItem } = useAtelierStore()
 const [editMode, setEditMode] = useState(null)

 return (
 <div className="px-10 py-10 lg:px-14 lg:py-12">
 <div className="mb-6">
 <p className="text-[9px] text-black/20 uppercase tracking-[0.3em] mb-3 font-light">Wardrobe</p>
 <h1 className="text-[28px] font-extralight text-black/85 tracking-tight">Garderobe</h1>
 <p className="text-[13px] text-black/30 mt-2 font-light">Kleidungsstücke für den Outfit Visualizer</p>
 </div>

 {/* Live Preview */}
 <div className="bg-white p-7 mb-6">
 <p className="text-[9px] text-black/25 uppercase tracking-[0.25em] mb-5 font-light">Vorschau (App)</p>
 <div className="flex gap-2 overflow-x-auto pb-1">
 {wardrobe.map((item) => (
 <div key={item.id} className="flex-shrink-0 bg-black/[0.02] p-2 text-center w-20">
 <div className="w-full h-10 mx-auto mb-1" style={{ backgroundColor: item.color }} />
 <p className="text-[8px] text-black/30 leading-tight font-light">{item.name}</p>
 </div>
 ))}
 {wardrobe.length === 0 && <p className="text-[13px] text-black/25 font-light">Keine Garderobe-Items</p>}
 </div>
 </div>

 <Section
 title="Garderobe"
 description={`${wardrobe.length} Kleidungsstücke`}
 items={wardrobe}
 onAdd={addWardrobeItem}
 onUpdate={updateWardrobeItem}
 onDelete={deleteWardrobeItem}
 editMode={editMode}
 setEditMode={setEditMode}
 sectionKey="wardrobe"
 />
 </div>
 )
}
