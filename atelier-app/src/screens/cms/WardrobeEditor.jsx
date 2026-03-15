import { useState } from 'react'
import { Plus, Pencil, Trash2, Check } from 'lucide-react'
import useAtelierStore from '../../store/atelierStore'

const emptyForm = { name: '', color: '#374151' }

function ItemForm({ initial = emptyForm, title, onSave, onCancel }) {
 const [form, setForm] = useState(initial)
 const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
 const valid = form.name.trim().length > 0

 return (
 <div className="bg-white border border-black/8 p-5 space-y-4">
 <h3 className="text-sm font-semibold text-black/65">{title}</h3>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-xs font-medium text-black/35 mb-1.5">Name *</label>
 <input value={form.name} onChange={(e) => set('name', e.target.value)}
 placeholder="Charcoal Suit"
 className="w-full bg-white border border-black/10 px-3.5 py-2.5 text-sm text-black/90 placeholder-black/20 focus:outline-none" />
 </div>
 <div>
 <label className="block text-xs font-medium text-black/35 mb-1.5">Farbe</label>
 <div className="flex items-center gap-2">
 <input type="color" value={form.color} onChange={(e) => set('color', e.target.value)}
 className="w-10 h-10 border border-black/10 bg-transparent cursor-pointer" />
 <input value={form.color} onChange={(e) => set('color', e.target.value)}
 className="flex-1 bg-white border border-black/10 px-3 py-2.5 text-xs text-black/90 font-mono focus:outline-none" />
 </div>
 </div>
 </div>
 <div className="flex gap-3">
 <button onClick={() => valid && onSave(form)} disabled={!valid}
 className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium border-0 ${valid ? 'bg-black text-white hover:bg-black' : 'bg-black/5 text-black/35 cursor-not-allowed'}`}>
 <Check size={14} /> Speichern
 </button>
 <button onClick={onCancel} className="px-4 py-2.5 text-xs font-medium text-black/45 bg-black/5 border-0">
 Abbrechen
 </button>
 </div>
 </div>
 )
}

function Section({ title, description, items, onAdd, onUpdate, onDelete, editMode, setEditMode, sectionKey }) {
 const [showAdd, setShowAdd] = useState(false)

 return (
 <div className="bg-white border border-black/8 overflow-hidden mb-4">
 <div className="flex items-center justify-between px-5 py-4 border-b border-black/8">
 <div>
 <p className="text-sm font-semibold text-black/65">{title}</p>
 <p className="text-xs text-black/35 mt-0.5">{description}</p>
 </div>
 <button onClick={() => setShowAdd(true)}
 className="flex items-center gap-1.5 bg-black/5 hover:bg-black/10 text-black/65 px-3 py-2 text-xs font-medium border-0 transition-colors">
 <Plus size={11} /> Hinzufügen
 </button>
 </div>

 {showAdd && (
 <div className="p-4 border-b border-black/10">
 <ItemForm title={`Neues ${title} Item`}
 onSave={(f) => { onAdd(f); setShowAdd(false) }}
 onCancel={() => setShowAdd(false)} />
 </div>
 )}

 <div className="divide-y divide-black/8">
 {items.map((item) => (
 editMode?.key === sectionKey && editMode?.id === item.id ? (
 <div key={item.id} className="p-4">
 <ItemForm initial={item} title="Bearbeiten"
 onSave={(f) => { onUpdate(item.id, f); setEditMode(null) }}
 onCancel={() => setEditMode(null)} />
 </div>
 ) : (
 <div key={item.id} className="flex items-center gap-4 px-5 py-3 group hover:bg-black/5 transition-colors">
 <div className="w-10 h-10 flex-shrink-0" style={{ backgroundColor: item.color }} />
 <div className="flex-1 min-w-0">
 <p className="text-sm font-medium text-black/90">{item.name}</p>
 <p className="text-[9px] text-black/35 font-mono">{item.color}</p>
 </div>
 <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
 <button onClick={() => setEditMode({ key: sectionKey, id: item.id })}
 className="w-7 h-7 bg-black/10 flex items-center justify-center hover:bg-black/15 border-0">
 <Pencil size={11} className="text-black/65" />
 </button>
 <button onClick={() => { if (confirm(`"${item.name}" löschen?`)) onDelete(item.id) }}
 className="w-7 h-7 bg-red-500/10 flex items-center justify-center hover:bg-red-500/20 border-0">
 <Trash2 size={11} className="text-red-400" />
 </button>
 </div>
 </div>
 )
 ))}
 {items.length === 0 && (
 <p className="text-center py-8 text-black/35 text-xs">Noch keine Einträge</p>
 )}
 </div>
 </div>
 )
}

export default function WardrobeEditor() {
 const { wardrobe, addWardrobeItem, updateWardrobeItem, deleteWardrobeItem } = useAtelierStore()
 const [editMode, setEditMode] = useState(null)

 return (
 <div className="p-8 max-w-3xl">
 <div className="mb-6">
 <h1 className="text-xl font-semibold text-black/90 tracking-tight" style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}>Garderobe</h1>
 <p className="text-black/45 text-sm mt-1">Kleidungsstücke für den Outfit Visualizer</p>
 </div>

 {/* Live Preview */}
 <div className="bg-white border border-black/8 p-4 mb-6">
 <p className="text-xs font-medium text-black/35 mb-3">Vorschau (App)</p>
 <div className="flex gap-2 overflow-x-auto pb-1">
 {wardrobe.map((item) => (
 <div key={item.id} className="flex-shrink-0 bg-black/5 p-2 text-center w-20">
 <div className="w-full h-10 mx-auto mb-1" style={{ backgroundColor: item.color }} />
 <p className="text-[8px] text-black/45 leading-tight">{item.name}</p>
 </div>
 ))}
 {wardrobe.length === 0 && <p className="text-xs text-black/35">Keine Garderobe-Items</p>}
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
