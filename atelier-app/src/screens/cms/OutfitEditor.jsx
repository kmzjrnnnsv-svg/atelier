import { useState } from 'react'
import { Plus, Pencil, Trash2, Check } from 'lucide-react'
import useAtelierStore from '../../store/atelierStore'

const emptyForm = {
 style: '',
 description: '',
 top: '',
 bottom: '',
 shoe: '',
 shoeColor: '#111827',
 bgColor: '#f8f9fa',
}

function OutfitForm({ initial = emptyForm, onSave, onCancel }) {
 const [form, setForm] = useState(initial)
 const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
 const valid = form.style && form.description && form.top && form.bottom && form.shoe

 return (
 <div className="bg-white p-7 space-y-4">
 <h3 className="text-[9px] text-black/25 uppercase tracking-[0.25em] mb-5 font-light">{initial.id ? 'Outfit bearbeiten' : 'Neues Outfit'}</h3>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Style-Name *</label>
 <input value={form.style} onChange={(e) => set('style', e.target.value)}
 placeholder="Modern Business"
 className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15" />
 </div>
 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Beschreibung *</label>
 <input value={form.description} onChange={(e) => set('description', e.target.value)}
 placeholder="Power Meeting Look"
 className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15" />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Oberteil *</label>
 <input value={form.top} onChange={(e) => set('top', e.target.value)}
 placeholder="Charcoal Suit"
 className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15" />
 </div>
 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Hose/Unterteil *</label>
 <input value={form.bottom} onChange={(e) => set('bottom', e.target.value)}
 placeholder="Slim Trousers"
 className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15" />
 </div>
 </div>

 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Schuh-Name *</label>
 <input value={form.shoe} onChange={(e) => set('shoe', e.target.value)}
 placeholder="Heritage Oxford"
 className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15" />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Schuh-Farbe</label>
 <div className="flex items-center gap-2">
 <input type="color" value={form.shoeColor} onChange={(e) => set('shoeColor', e.target.value)}
 className="w-10 h-10 border-b border-black/[0.08] bg-transparent cursor-pointer" />
 <input value={form.shoeColor} onChange={(e) => set('shoeColor', e.target.value)}
 className="flex-1 h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 font-mono" />
 </div>
 </div>
 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Hintergrund-Farbe</label>
 <div className="flex items-center gap-2">
 <input type="color" value={form.bgColor} onChange={(e) => set('bgColor', e.target.value)}
 className="w-10 h-10 border-b border-black/[0.08] bg-transparent cursor-pointer" />
 <input value={form.bgColor} onChange={(e) => set('bgColor', e.target.value)}
 className="flex-1 h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 font-mono" />
 </div>
 </div>
 </div>

 {/* Mini Preview */}
 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Live-Vorschau</label>
 <div className=" overflow-hidden p-4 flex items-center justify-center" style={{ backgroundColor: form.bgColor, height: '100px' }}>
 <svg viewBox="0 0 80 100" className="w-16">
 <circle cx="40" cy="12" r="8" fill="#d4a88a" />
 <path d="M22 22 Q32 20 40 20 Q48 20 58 22 L62 55 Q50 60 40 60 Q30 60 18 55 Z" fill="#555" />
 <path d="M18 55 Q30 60 40 60 Q50 60 62 55 L66 90 L50 90 L40 70 L30 90 L14 90 Z" fill="#333" />
 <path d="M14 90 L30 90 L32 100 Q30 102 20 102 L10 102 Q8 101 8 99 Z" fill={form.shoeColor} />
 <path d="M50 90 L66 90 L70 100 Q68 102 58 102 L48 102 Q46 101 46 99 Z" fill={form.shoeColor} />
 </svg>
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

export default function OutfitEditor() {
 const { outfits, addOutfit, updateOutfit, deleteOutfit } = useAtelierStore()
 const [mode, setMode] = useState(null)

 return (
 <div className="px-10 py-10 lg:px-14 lg:py-12">
 <div className="flex items-center justify-between mb-6">
 <div>
 <p className="text-[9px] text-black/20 uppercase tracking-[0.3em] mb-3 font-light">Styling</p>
 <h1 className="text-[28px] font-extralight text-black/85 tracking-tight">Outfits</h1>
 <p className="text-[13px] text-black/30 mt-2 font-light">{outfits.length} Outfit-Kombinationen</p>
 </div>
 {!mode && (
 <button onClick={() => setMode('add')}
 className="flex items-center gap-2 px-6 h-10 border border-black/15 text-black/50 hover:border-black hover:text-black text-[11px] transition-all bg-transparent uppercase tracking-[0.2em] font-light">
 <Plus size={14} /> Neues Outfit
 </button>
 )}
 </div>

 {mode === 'add' && (
 <div className="mb-6">
 <OutfitForm onSave={(f) => { addOutfit(f); setMode(null) }} onCancel={() => setMode(null)} />
 </div>
 )}

 <div className="space-y-0">
 {outfits.map((outfit) => (
 mode?.editing?.id === outfit.id ? (
 <OutfitForm key={outfit.id} initial={outfit}
 onSave={(f) => { updateOutfit(outfit.id, f); setMode(null) }}
 onCancel={() => setMode(null)} />
 ) : (
 <div key={outfit.id} className="bg-white flex items-center gap-4 px-6 py-4 group hover:bg-black/[0.01] transition-all border-b border-black/[0.04]">
 {/* Mini preview */}
 <div className="w-14 h-14 overflow-hidden flex-shrink-0 flex items-center justify-center"
 style={{ backgroundColor: outfit.bgColor }}>
 <svg viewBox="0 0 40 50" className="w-8">
 <circle cx="20" cy="6" r="4" fill="#d4a88a" />
 <path d="M11 10 Q16 9 20 9 Q24 9 29 10 L31 27 Q25 30 20 30 Q15 30 9 27 Z" fill="#555" />
 <path d="M9 27 Q15 30 20 30 Q25 30 31 27 L33 45 L25 45 L20 35 L15 45 L7 45 Z" fill="#333" />
 <path d="M7 45 L15 45 L16 50 Q15 51 10 51 L5 51 Q4 50 4 49 Z" fill={outfit.shoeColor} />
 <path d="M25 45 L33 45 L35 50 Q34 51 29 51 L24 51 Q23 50 23 49 Z" fill={outfit.shoeColor} />
 </svg>
 </div>

 <div className="flex-1 min-w-0">
 <p className="text-[13px] font-light text-black/70">{outfit.style}</p>
 <p className="text-[10px] text-black/30 mt-0.5 font-light italic">{outfit.description}</p>
 <p className="text-[9px] text-black/25 mt-1 font-light">{outfit.top} · {outfit.bottom} · {outfit.shoe}</p>
 </div>

 {/* Color swatches */}
 <div className="flex gap-1.5">
 <div className="w-5 h-5" style={{ backgroundColor: outfit.shoeColor }} title="Schuhfarbe" />
 <div className="w-5 h-5" style={{ backgroundColor: outfit.bgColor }} title="Hintergrund" />
 </div>

 <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
 <button onClick={() => setMode({ editing: outfit })}
 className="w-7 h-7 flex items-center justify-center hover:bg-black/[0.04] transition-colors border-0 bg-transparent">
 <Pencil size={12} strokeWidth={1.25} className="text-black/25" />
 </button>
 <button onClick={() => { if (confirm(`"${outfit.style}" löschen?`)) deleteOutfit(outfit.id) }}
 className="w-7 h-7 flex items-center justify-center hover:bg-black/[0.04] transition-colors border-0 bg-transparent">
 <Trash2 size={12} strokeWidth={1.25} className="text-black/25" />
 </button>
 </div>
 </div>
 )
 ))}
 {outfits.length === 0 && (
 <div className="text-center py-20">
 <p className="text-[13px] text-black/25 font-light">Keine Outfits</p>
 </div>
 )}
 </div>
 </div>
 )
}
