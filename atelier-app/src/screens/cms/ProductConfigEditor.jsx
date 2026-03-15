import { useState } from 'react'
import { Plus, Pencil, Trash2, Check, Circle, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import useAtelierStore from '../../store/atelierStore'

// ── Ampel-Rating Badge ──────────────────────────────────────────────────────
const ratingConfig = {
 good: { label: 'Empfohlen', color: 'bg-green-500', textColor: 'text-green-700', bgColor: 'bg-green-50', icon: CheckCircle2 },
 neutral: { label: 'Neutral', color: 'bg-amber-400', textColor: 'text-amber-700', bgColor: 'bg-amber-50', icon: Circle },
 warn: { label: 'Achtung', color: 'bg-red-500', textColor: 'text-red-700', bgColor: 'bg-red-50', icon: AlertTriangle },
}

function RatingBadge({ rating }) {
 const cfg = ratingConfig[rating] || ratingConfig.neutral
 const Icon = cfg.icon
 return (
 <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold ${cfg.bgColor} ${cfg.textColor}`}>
 <Icon size={10} />
 {cfg.label}
 </span>
 )
}

function RatingPicker({ value, onChange }) {
 return (
 <div className="flex gap-2">
 {Object.entries(ratingConfig).map(([key, cfg]) => {
 const Icon = cfg.icon
 return (
 <button
 key={key}
 onClick={() => onChange(key)}
 className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-2 transition-all bg-transparent ${
 value === key ? `${cfg.bgColor} ${cfg.textColor} border-current` : 'border-black/8 text-black/35'
 }`}
 >
 <Icon size={12} />
 {cfg.label}
 </button>
 )
 })}
 </div>
 )
}

// ── Shared input styles ─────────────────────────────────────────────────────
const inp = 'w-full bg-white border border-black/10 px-3.5 py-2.5 text-sm text-black/90 placeholder-black/20 focus:outline-none focus:border-black/20'
const labelCls = 'block text-xs font-medium text-black/35 mb-1.5'

// ═══════════════════════════════════════════════════════════════════════════
// MATERIAL FORM
// ═══════════════════════════════════════════════════════════════════════════
const emptyMat = { key: '', label: '', sub: '', color: '#b45309', available: 1, tip: '', season: '', rating: 'neutral', sort_order: 0 }

function MaterialForm({ initial = emptyMat, onSave, onCancel }) {
 const [f, setF] = useState(initial)
 const s = (k, v) => setF(p => ({ ...p, [k]: v }))
 const valid = f.key.trim() && f.label.trim()

 return (
 <div className="bg-white border border-black/8 p-5 space-y-4">
 <h3 className="text-sm font-semibold text-black/65">{initial.id ? 'Material bearbeiten' : 'Neues Material'}</h3>
 <div className="grid grid-cols-3 gap-3">
 <div>
 <label className={labelCls}>Schlüssel *</label>
 <input value={f.key} onChange={e => s('key', e.target.value)} placeholder="calfskin" className={inp} />
 </div>
 <div>
 <label className={labelCls}>Label *</label>
 <input value={f.label} onChange={e => s('label', e.target.value)} placeholder="CALFSKIN" className={inp} />
 </div>
 <div>
 <label className={labelCls}>Untertitel</label>
 <input value={f.sub || ''} onChange={e => s('sub', e.target.value)} placeholder="Full-Grain" className={inp} />
 </div>
 </div>
 <div className="grid grid-cols-3 gap-3">
 <div>
 <label className={labelCls}>Farbe</label>
 <div className="flex items-center gap-2">
 <input type="color" value={f.color} onChange={e => s('color', e.target.value)} className="w-10 h-10 border border-black/10 bg-transparent cursor-pointer" />
 <input value={f.color} onChange={e => s('color', e.target.value)} className={inp + ' font-mono'} />
 </div>
 </div>
 <div>
 <label className={labelCls}>Saison</label>
 <input value={f.season || ''} onChange={e => s('season', e.target.value)} placeholder="Ganzjährig" className={inp} />
 </div>
 <div>
 <label className={labelCls}>Verfügbar</label>
 <button onClick={() => s('available', f.available ? 0 : 1)}
 className={`w-full py-2.5 text-xs font-medium border-0 ${f.available ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
 {f.available ? 'Verfügbar' : 'Nicht verfügbar'}
 </button>
 </div>
 </div>
 <div>
 <label className={labelCls}>Ampel-Bewertung</label>
 <RatingPicker value={f.rating} onChange={v => s('rating', v)} />
 </div>
 <div>
 <label className={labelCls}>Empfehlungstext (Info-Box in der App)</label>
 <textarea value={f.tip || ''} onChange={e => s('tip', e.target.value)} rows={2} placeholder="Wann passt dieses Material am besten?" className={inp + ' resize-none'} style={{ fontFamily: 'inherit' }} />
 </div>
 <div className="flex gap-3">
 <button onClick={() => valid && onSave(f)} disabled={!valid}
 className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium border-0 ${valid ? 'bg-black text-white' : 'bg-black/5 text-black/35 cursor-not-allowed'}`}>
 <Check size={14} /> Speichern
 </button>
 <button onClick={onCancel} className="px-4 py-2.5 text-xs font-medium text-black/45 bg-black/5 border-0">Abbrechen</button>
 </div>
 </div>
 )
}

// ═══════════════════════════════════════════════════════════════════════════
// COLOR FORM
// ═══════════════════════════════════════════════════════════════════════════
const emptyCol = { key: '', hex: '#000000', name: '', available: 1, tip: '', pairs_with: '', rating: 'neutral', sort_order: 0 }

function ColorForm({ initial = emptyCol, onSave, onCancel }) {
 const [f, setF] = useState(initial)
 const s = (k, v) => setF(p => ({ ...p, [k]: v }))
 const valid = f.key.trim() && f.name.trim()

 return (
 <div className="bg-white border border-black/8 p-5 space-y-4">
 <h3 className="text-sm font-semibold text-black/65">{initial.id ? 'Farbe bearbeiten' : 'Neue Farbe'}</h3>
 <div className="grid grid-cols-3 gap-3">
 <div>
 <label className={labelCls}>Schlüssel *</label>
 <input value={f.key} onChange={e => s('key', e.target.value)} placeholder="navy" className={inp} />
 </div>
 <div>
 <label className={labelCls}>Name *</label>
 <input value={f.name} onChange={e => s('name', e.target.value)} placeholder="Navy" className={inp} />
 </div>
 <div>
 <label className={labelCls}>Hex-Farbe</label>
 <div className="flex items-center gap-2">
 <input type="color" value={f.hex} onChange={e => s('hex', e.target.value)} className="w-10 h-10 border border-black/10 bg-transparent cursor-pointer" />
 <input value={f.hex} onChange={e => s('hex', e.target.value)} className={inp + ' font-mono'} />
 </div>
 </div>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className={labelCls}>Verfügbar</label>
 <button onClick={() => s('available', f.available ? 0 : 1)}
 className={`w-full py-2.5 text-xs font-medium border-0 ${f.available ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
 {f.available ? 'Verfügbar' : 'Nicht verfügbar'}
 </button>
 </div>
 <div>
 <label className={labelCls}>Ampel-Bewertung</label>
 <RatingPicker value={f.rating} onChange={v => s('rating', v)} />
 </div>
 </div>
 <div>
 <label className={labelCls}>Empfehlungstext</label>
 <textarea value={f.tip || ''} onChange={e => s('tip', e.target.value)} rows={2} placeholder="Wann passt diese Farbe am besten?" className={inp + ' resize-none'} style={{ fontFamily: 'inherit' }} />
 </div>
 <div>
 <label className={labelCls}>Passt zu (Outfit-Empfehlung)</label>
 <input value={f.pairs_with || ''} onChange={e => s('pairs_with', e.target.value)} placeholder="Grau, Navy, Beige" className={inp} />
 </div>
 <div className="flex gap-3">
 <button onClick={() => valid && onSave(f)} disabled={!valid}
 className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium border-0 ${valid ? 'bg-black text-white' : 'bg-black/5 text-black/35 cursor-not-allowed'}`}>
 <Check size={14} /> Speichern
 </button>
 <button onClick={onCancel} className="px-4 py-2.5 text-xs font-medium text-black/45 bg-black/5 border-0">Abbrechen</button>
 </div>
 </div>
 )
}

// ═══════════════════════════════════════════════════════════════════════════
// SOLE FORM
// ═══════════════════════════════════════════════════════════════════════════
const emptySole = { key: '', label: '', sub: '', description: '', tip: '', price_extra: 0, rating: 'good', recommended: 0, categories: '*', sort_order: 0 }

function SoleForm({ initial = emptySole, onSave, onCancel }) {
 const [f, setF] = useState(initial)
 const s = (k, v) => setF(p => ({ ...p, [k]: v }))
 const valid = f.key.trim() && f.label.trim()

 return (
 <div className="bg-white border border-black/8 p-5 space-y-4">
 <h3 className="text-sm font-semibold text-black/65">{initial.id ? 'Sohle bearbeiten' : 'Neue Sohle'}</h3>
 <div className="grid grid-cols-3 gap-3">
 <div>
 <label className={labelCls}>Schlüssel *</label>
 <input value={f.key} onChange={e => s('key', e.target.value)} placeholder="rubber-grip" className={inp} />
 </div>
 <div>
 <label className={labelCls}>Label *</label>
 <input value={f.label} onChange={e => s('label', e.target.value)} placeholder="ANTI-RUTSCH" className={inp} />
 </div>
 <div>
 <label className={labelCls}>Untertitel</label>
 <input value={f.sub || ''} onChange={e => s('sub', e.target.value)} placeholder="Gummi-Profil" className={inp} />
 </div>
 </div>
 <div className="grid grid-cols-3 gap-3">
 <div>
 <label className={labelCls}>Aufpreis (€)</label>
 <input type="number" value={f.price_extra} onChange={e => s('price_extra', Number(e.target.value))} className={inp} />
 </div>
 <div>
 <label className={labelCls}>Empfohlen?</label>
 <button onClick={() => s('recommended', f.recommended ? 0 : 1)}
 className={`w-full py-2.5 text-xs font-medium border-0 ${f.recommended ? 'bg-teal-50 text-teal-700' : 'bg-black/5 text-black/35'}`}>
 {f.recommended ? 'Ja — Empfohlen' : 'Nein'}
 </button>
 </div>
 <div>
 <label className={labelCls}>Ampel-Bewertung</label>
 <RatingPicker value={f.rating} onChange={v => s('rating', v)} />
 </div>
 </div>
 <div>
 <label className={labelCls}>Kategorien (kommagetrennt, * = alle)</label>
 <input value={f.categories} onChange={e => s('categories', e.target.value)} placeholder="OXFORD,LOAFER,DERBY,MONK,BOOT" className={inp} />
 <p className="text-[10px] text-black/35 mt-1">Schuhtypen: OXFORD, LOAFER, DERBY, BOOT, SNEAKER, MONK</p>
 </div>
 <div>
 <label className={labelCls}>Beschreibung</label>
 <textarea value={f.description || ''} onChange={e => s('description', e.target.value)} rows={2} className={inp + ' resize-none'} style={{ fontFamily: 'inherit' }} />
 </div>
 <div>
 <label className={labelCls}>Empfehlungstext (Info-Box in App)</label>
 <textarea value={f.tip || ''} onChange={e => s('tip', e.target.value)} rows={2} className={inp + ' resize-none'} style={{ fontFamily: 'inherit' }} />
 </div>
 <div className="flex gap-3">
 <button onClick={() => valid && onSave(f)} disabled={!valid}
 className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium border-0 ${valid ? 'bg-black text-white' : 'bg-black/5 text-black/35 cursor-not-allowed'}`}>
 <Check size={14} /> Speichern
 </button>
 <button onClick={onCancel} className="px-4 py-2.5 text-xs font-medium text-black/45 bg-black/5 border-0">Abbrechen</button>
 </div>
 </div>
 )
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERIC SECTION LIST
// ═══════════════════════════════════════════════════════════════════════════
function Section({ title, subtitle, items, Form, emptyForm, onAdd, onUpdate, onDelete, renderItem }) {
 const [mode, setMode] = useState(null)

 return (
 <div className="mb-10">
 <div className="flex items-center justify-between mb-4">
 <div>
 <h2 className="text-lg font-semibold text-black/90" style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}>{title}</h2>
 <p className="text-sm text-black/35 mt-0.5">{subtitle}</p>
 </div>
 {!mode && (
 <button onClick={() => setMode('add')}
 className="flex items-center gap-2 bg-black hover:bg-black text-white text-xs font-medium px-4 py-2 border-0">
 <Plus size={14} /> Hinzufügen
 </button>
 )}
 </div>

 {mode === 'add' && (
 <div className="mb-4">
 <Form initial={emptyForm} onSave={f => { onAdd(f); setMode(null) }} onCancel={() => setMode(null)} />
 </div>
 )}

 <div className="space-y-2">
 {items.map(item => (
 mode?.editing?.id === item.id ? (
 <Form key={item.id} initial={item}
 onSave={f => { onUpdate(item.id, f); setMode(null) }}
 onCancel={() => setMode(null)} />
 ) : (
 <div key={item.id} className="bg-white border border-black/8 flex items-center gap-4 px-5 py-3.5 group hover:border-black/10 transition-all">
 {renderItem(item)}
 <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
 <button onClick={() => setMode({ editing: item })}
 className="w-8 h-8 bg-black/5 flex items-center justify-center hover:bg-black/10 border-0">
 <Pencil size={13} className="text-black/65" />
 </button>
 <button onClick={() => { if (confirm(`"${item.label || item.name}" löschen?`)) onDelete(item.id) }}
 className="w-8 h-8 bg-red-500/10 flex items-center justify-center hover:bg-red-500/20 border-0">
 <Trash2 size={13} className="text-red-400" />
 </button>
 </div>
 </div>
 )
 ))}
 {items.length === 0 && <div className="text-center py-10 text-black/35 text-sm">Keine Einträge</div>}
 </div>
 </div>
 )
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EDITOR
// ═══════════════════════════════════════════════════════════════════════════
export default function ProductConfigEditor() {
 const {
 shoeMaterials, addMaterial, updateMaterial, deleteMaterial,
 shoeColors, addColor, updateColor, deleteColor,
 shoeSoles, addSole, updateSole, deleteSole,
 } = useAtelierStore()

 return (
 <div className="p-8 max-w-4xl">
 <div className="mb-8">
 <h1 className="text-xl font-semibold text-black/90 tracking-tight" style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}>Produkt-Konfiguration</h1>
 <p className="text-black/45 text-sm mt-1">
 Materialien, Farben und Sohlen verwalten — inkl. Ampelbewertung und Empfehlungstexte für die App.
 </p>
 <div className="flex gap-4 mt-3">
 {Object.entries(ratingConfig).map(([key, cfg]) => (
 <div key={key} className="flex items-center gap-1.5">
 <div className={`w-2.5 h-2.5 ${cfg.color}`} />
 <span className="text-[10px] text-black/45">{cfg.label}</span>
 </div>
 ))}
 </div>
 </div>

 {/* Materials */}
 <Section
 title="Lederarten"
 subtitle="Materialien die der Kunde im Konfigurator auswählen kann"
 items={shoeMaterials}
 Form={MaterialForm}
 emptyForm={emptyMat}
 onAdd={addMaterial}
 onUpdate={updateMaterial}
 onDelete={deleteMaterial}
 renderItem={item => (
 <>
 <div className="w-12 h-12 flex-shrink-0" style={{ background: `radial-gradient(circle at 35% 35%, ${item.color}bb, ${item.color})` }} />
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2">
 <p className="text-sm font-semibold text-black/90">{item.label}</p>
 <RatingBadge rating={item.rating} />
 {!item.available && <span className="text-[10px] text-red-500 font-medium">Nicht verfügbar</span>}
 </div>
 <p className="text-[10px] text-black/45 mt-0.5">{item.sub} · {item.season || '–'}</p>
 {item.tip && <p className="text-[10px] text-black/35 mt-1 line-clamp-1">{item.tip}</p>}
 </div>
 </>
 )}
 />

 {/* Colors */}
 <Section
 title="Farbpalette"
 subtitle="Farben mit Outfit-Empfehlungen und Anlass-Tipps"
 items={shoeColors}
 Form={ColorForm}
 emptyForm={emptyCol}
 onAdd={addColor}
 onUpdate={updateColor}
 onDelete={deleteColor}
 renderItem={item => (
 <>
 <div className="w-12 h-12 flex-shrink-0 border border-black/8" style={{ backgroundColor: item.hex }} />
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2">
 <p className="text-sm font-semibold text-black/90">{item.name}</p>
 <span className="text-[10px] text-black/35 font-mono">{item.hex}</span>
 <RatingBadge rating={item.rating} />
 {!item.available && <span className="text-[10px] text-red-500 font-medium">Nicht verfügbar</span>}
 </div>
 {item.pairs_with && <p className="text-[10px] text-black/45 mt-0.5">Passt zu: {item.pairs_with}</p>}
 {item.tip && <p className="text-[10px] text-black/35 mt-1 line-clamp-1">{item.tip}</p>}
 </div>
 </>
 )}
 />

 {/* Soles */}
 <Section
 title="Sohlen"
 subtitle="Sohlentypen mit Kategorieeinschränkung und Wetterempfehlung"
 items={shoeSoles}
 Form={SoleForm}
 emptyForm={emptySole}
 onAdd={addSole}
 onUpdate={updateSole}
 onDelete={deleteSole}
 renderItem={item => (
 <>
 <div className={`w-12 h-12 flex-shrink-0 flex items-center justify-center ${item.recommended ? 'bg-teal-50' : 'bg-black/5'}`}>
 <span className="text-lg">{item.recommended ? '⭐' : '👟'}</span>
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2">
 <p className="text-sm font-semibold text-black/90">{item.label}</p>
 <span className="text-[10px] text-black/35">{item.sub}</span>
 <RatingBadge rating={item.rating} />
 {item.recommended === 1 && <span className="text-[10px] text-teal-600 font-semibold">Empfohlen</span>}
 </div>
 <p className="text-[10px] text-black/45 mt-0.5">
 Kategorien: {item.categories} · {item.price_extra > 0 ? `+ € ${item.price_extra}` : 'Inklusive'}
 </p>
 {item.tip && <p className="text-[10px] text-black/35 mt-1 line-clamp-1">{item.tip}</p>}
 </div>
 </>
 )}
 />
 </div>
 )
}
