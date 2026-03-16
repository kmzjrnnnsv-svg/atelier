import { useState } from 'react'
import { Plus, Pencil, Trash2, X, Check, Upload } from 'lucide-react'
import useAtelierStore from '../../store/atelierStore'

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
 <div className="bg-white border border-black/6 p-6 space-y-4">
 <h3 className="text-[11px] font-semibold text-black/50 uppercase tracking-wider">{initial.id ? 'Schuh bearbeiten' : 'Neuer Schuh'}</h3>

 {/* Image Upload */}
 <div>
 <label className="block text-[10px] font-medium text-black/30 mb-1.5 uppercase tracking-wider">Produktbild</label>
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
 <label className="flex-1 flex items-center gap-2 bg-white border border-black/8 px-3.5 py-3 cursor-pointer hover:bg-black/3 transition-colors">
 <Upload size={14} className="text-black/35" strokeWidth={1.5} />
 <span className="text-[11px] text-black/40">Bild hochladen</span>
 <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
 </label>
 </div>
 </div>

 {/* Name */}
 <div>
 <label className="block text-[10px] font-medium text-black/30 mb-1.5 uppercase tracking-wider">Name *</label>
 <input
 value={form.name}
 onChange={(e) => set('name', e.target.value)}
 placeholder="The Heritage Oxford"
 className="w-full bg-white border border-black/8 px-3.5 py-2.5 text-sm text-black/80 placeholder-black/15 focus:outline-none focus:border-black/20"
 />
 </div>

 {/* Category + Tag row */}
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-[10px] font-medium text-black/30 mb-1.5 uppercase tracking-wider">Kategorie *</label>
 <select
 value={form.category}
 onChange={(e) => set('category', e.target.value)}
 className="w-full bg-white border border-black/8 px-3.5 py-2.5 text-sm text-black/80 focus:outline-none focus:border-black/20"
 >
 {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
 </select>
 </div>
 <div>
 <label className="block text-[10px] font-medium text-black/30 mb-1.5 uppercase tracking-wider">Badge</label>
 <select
 value={form.tag ?? ''}
 onChange={(e) => set('tag', e.target.value || null)}
 className="w-full bg-white border border-black/8 px-3.5 py-2.5 text-sm text-black/80 focus:outline-none focus:border-black/20"
 >
 <option value="">Kein Badge</option>
 {TAGS.filter(Boolean).map((t) => <option key={t} value={t}>{t}</option>)}
 </select>
 </div>
 </div>

 {/* Price + Match row */}
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-[10px] font-medium text-black/30 mb-1.5 uppercase tracking-wider">Preis *</label>
 <input
 value={form.price}
 onChange={(e) => set('price', e.target.value)}
 placeholder="€ 1.450"
 className="w-full bg-white border border-black/8 px-3.5 py-2.5 text-sm text-black/80 placeholder-black/15 focus:outline-none focus:border-black/20"
 />
 </div>
 <div>
 <label className="block text-[10px] font-medium text-black/30 mb-1.5 uppercase tracking-wider">Biometric Match</label>
 <input
 value={form.match}
 onChange={(e) => set('match', e.target.value)}
 placeholder="99.4%"
 className="w-full bg-white border border-black/8 px-3.5 py-2.5 text-sm text-black/80 placeholder-black/15 focus:outline-none focus:border-black/20"
 />
 </div>
 </div>

 {/* Material */}
 <div>
 <label className="block text-[10px] font-medium text-black/30 mb-1.5 uppercase tracking-wider">Material *</label>
 <input
 value={form.material}
 onChange={(e) => set('material', e.target.value)}
 placeholder="Full-Grain Calfskin"
 className="w-full bg-white border border-black/8 px-3.5 py-2.5 text-sm text-black/80 placeholder-black/15 focus:outline-none focus:border-black/20"
 />
 </div>

 {/* Color */}
 <div>
 <label className="block text-[10px] font-medium text-black/30 mb-1.5 uppercase tracking-wider">Schuh-Farbe</label>
 <div className="flex items-center gap-3">
 <input
 type="color"
 value={form.color}
 onChange={(e) => set('color', e.target.value)}
 className="w-10 h-10 border border-black/10 bg-transparent cursor-pointer"
 />
 <input
 value={form.color}
 onChange={(e) => set('color', e.target.value)}
 className="flex-1 bg-white border border-black/8 px-3.5 py-2.5 text-sm text-black/80 font-mono focus:outline-none focus:border-black/20"
 />
 <div className="w-10 h-10 flex-shrink-0" style={{ backgroundColor: form.color }} />
 </div>
 </div>

 {/* Actions */}
 <div className="flex gap-3 pt-2">
 <button
 onClick={() => valid && onSave(form)}
 disabled={!valid}
 className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[11px] font-semibold transition-all border-0 uppercase tracking-wider ${
 valid ? 'bg-black text-white' : 'bg-black/5 text-black/25 cursor-not-allowed'
 }`}
 >
 <Check size={14} strokeWidth={1.5} /> Speichern
 </button>
 <button
 onClick={onCancel}
 className="px-5 py-2.5 text-[11px] font-medium text-black/40 hover:text-black/70 bg-black/4 hover:bg-black/8 transition-all border-0"
 >
 Abbrechen
 </button>
 </div>
 </div>
 )
}

export default function ShoeEditor() {
 const { shoes, addShoe, updateShoe, deleteShoe } = useAtelierStore()
 const [mode, setMode] = useState(null)
 const [filterCat, setFilterCat] = useState('ALL')

 const filtered = filterCat === 'ALL' ? shoes : shoes.filter((s) => s.category === filterCat)

 return (
 <div className="p-6 w-full max-w-full overflow-hidden">
 <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
 <div>
 <h1 className="text-xl font-bold text-black/85" style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>Schuhe</h1>
 <p className="text-black/35 text-sm mt-1">{shoes.length} Produkte verwalten</p>
 </div>
 {!mode && (
 <button
 onClick={() => setMode('add')}
 className="flex items-center gap-2 bg-black text-white text-[11px] font-semibold px-5 py-2.5 transition-colors border-0 uppercase tracking-wider hover:bg-black/85"
 >
 <Plus size={14} strokeWidth={1.5} /> Neuer Schuh
 </button>
 )}
 </div>

 {/* Add Form */}
 {mode === 'add' && (
 <div className="mb-6">
 <ShoeForm
 onSave={(f) => { addShoe(f); setMode(null) }}
 onCancel={() => setMode(null)}
 />
 </div>
 )}

 {/* Category filter */}
 <div className="flex gap-1.5 mb-5 flex-wrap">
 {['ALL', ...CATEGORIES].map((c) => (
 <button
 key={c}
 onClick={() => setFilterCat(c)}
 className={`px-3 py-1.5 text-[10px] font-semibold transition-all border-0 uppercase tracking-wider ${
 filterCat === c ? 'bg-black text-white' : 'bg-black/4 text-black/35 hover:text-black/60 hover:bg-black/8'
 }`}
 >
 {c === 'ALL' ? 'Alle' : c}
 </button>
 ))}
 </div>

 {/* Shoe List */}
 <div className="space-y-1.5">
 {filtered.map((shoe) => (
 mode?.editing?.id === shoe.id ? (
 <ShoeForm
 key={shoe.id}
 initial={shoe}
 onSave={(f) => { updateShoe(shoe.id, f); setMode(null) }}
 onCancel={() => setMode(null)}
 />
 ) : (
 <div
 key={shoe.id}
 className="bg-white border border-black/6 flex items-center gap-4 px-5 py-4 group hover:border-black/12 transition-all min-w-0"
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
 <p className="text-[13px] font-semibold text-black/80">{shoe.name}</p>
 {shoe.tag && (
 <span className="text-[9px] font-semibold bg-black/5 text-black/40 px-2 py-0.5 uppercase tracking-wider">
 {shoe.tag}
 </span>
 )}
 </div>
 <p className="text-[10px] text-black/35 mt-0.5">{shoe.category} · {shoe.material}</p>
 {shoe.match && (
 <p className="text-[9px] text-black/30 mt-0.5">{shoe.match} Biometric Match</p>
 )}
 </div>

 {/* Price */}
 <p className="text-sm font-bold text-black/70 flex-shrink-0">{shoe.price}</p>

 {/* Actions */}
 <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
 <button
 onClick={() => setMode({ editing: shoe })}
 className="w-8 h-8 bg-black/4 flex items-center justify-center hover:bg-black/10 transition-colors border-0"
 >
 <Pencil size={13} className="text-black/45" strokeWidth={1.5} />
 </button>
 <button
 onClick={() => { if (confirm(`"${shoe.name}" löschen?`)) deleteShoe(shoe.id) }}
 className="w-8 h-8 bg-black/4 flex items-center justify-center hover:bg-black/10 transition-colors border-0"
 >
 <Trash2 size={13} className="text-black/35" strokeWidth={1.5} />
 </button>
 </div>
 </div>
 )
 ))}

 {filtered.length === 0 && (
 <div className="text-center py-16 text-black/30">
 <p className="text-sm">Keine Schuhe in dieser Kategorie</p>
 </div>
 )}
 </div>
 </div>
 )
}
