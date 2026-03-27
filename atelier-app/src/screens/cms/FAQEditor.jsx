import { useState } from 'react'
import { Plus, Pencil, Trash2, X, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react'
import useAtelierStore from '../../store/atelierStore'

const FAQ_CATEGORIES = ['Allgemein', 'Bestellung', 'Produkt', 'Versand', 'Konto']

const emptyForm = {
 question: '',
 answer: '',
 category: 'Allgemein',
 sort_order: 0,
}

function FAQForm({ initial = emptyForm, onSave, onCancel, saving }) {
 const [form, setForm] = useState({ ...emptyForm, ...initial })
 const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))
 const isValid = form.question.trim() && form.answer.trim()

 return (
 <div className="bg-white p-7 space-y-4 mb-4">
 <div className="flex items-center justify-between">
 <h3 className="text-[9px] text-black/25 uppercase tracking-[0.25em] font-light">
 {initial.id ? 'FAQ bearbeiten' : 'Neue FAQ'}
 </h3>
 <button onClick={onCancel} className="w-7 h-7 flex items-center justify-center hover:bg-black/[0.04] transition-colors border-0 bg-transparent">
 <X size={12} strokeWidth={1.25} className="text-black/25" />
 </button>
 </div>

 {/* Question */}
 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Frage *</label>
 <textarea
 value={form.question}
 onChange={e => setField('question', e.target.value)}
 placeholder="Welche Frage beantwortet dieser Eintrag?"
 rows={2}
 className="w-full py-3 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15 resize-y"
 />
 </div>

 {/* Answer */}
 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Antwort *</label>
 <textarea
 value={form.answer}
 onChange={e => setField('answer', e.target.value)}
 placeholder="Ausführliche Antwort auf die Frage..."
 rows={6}
 className="w-full py-3 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15 resize-y font-mono leading-relaxed"
 />
 </div>

 {/* Category + Sort Order */}
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Kategorie</label>
 <select
 value={form.category}
 onChange={e => setField('category', e.target.value)}
 className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 font-light text-black/70 appearance-none"
 >
 {FAQ_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
 </select>
 </div>
 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Reihenfolge</label>
 <input
 type="number"
 min="0"
 value={form.sort_order}
 onChange={e => setField('sort_order', parseInt(e.target.value) || 0)}
 className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15"
 />
 </div>
 </div>

 {/* Actions */}
 <div className="flex gap-3 pt-1">
 <button
 onClick={() => isValid && !saving && onSave(form)}
 disabled={!isValid || saving}
 className="px-8 h-11 border border-black text-black text-[11px] bg-transparent hover:bg-black hover:text-white transition-all duration-300 uppercase tracking-[0.2em] font-light disabled:opacity-30 flex-1 flex items-center justify-center gap-2"
 >
 {saving ? 'Speichern...' : (initial.id ? 'Aktualisieren' : 'FAQ hinzufügen')}
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

export default function FAQEditor() {
 const { faqs, addFaq, updateFaq, deleteFaq } = useAtelierStore()
 const [mode, setMode] = useState(null) // null | 'add' | { editing: faq }
 const [saving, setSaving] = useState(false)
 const [search, setSearch] = useState('')
 const [activeCategory, setActiveCategory] = useState('Alle')
 const [expanded, setExpanded] = useState(null)

 const categories = ['Alle', ...FAQ_CATEGORIES.filter(c => faqs.some(f => f.category === c))]

 const filtered = faqs.filter(f => {
 const matchSearch = !search || f.question.toLowerCase().includes(search.toLowerCase()) || f.answer.toLowerCase().includes(search.toLowerCase())
 const matchCat = activeCategory === 'Alle' || f.category === activeCategory
 return matchSearch && matchCat
 })

 async function handleSave(form) {
 setSaving(true)
 try {
 if (mode?.editing) {
 await updateFaq(mode.editing.id, form)
 } else {
 await addFaq(form)
 }
 setMode(null)
 } finally {
 setSaving(false)
 }
 }

 async function handleDelete(id) {
 if (!confirm('Diese FAQ wirklich löschen?')) return
 await deleteFaq(id)
 if (expanded === id) setExpanded(null)
 }

 return (
 <div className="px-10 py-10 lg:px-14 lg:py-12">
 {/* Header */}
 <div className="flex items-center justify-between mb-6">
 <div>
 <p className="text-[9px] text-black/20 uppercase tracking-[0.3em] mb-3 font-light">Support</p>
 <h1 className="text-[28px] font-extralight text-black/85 tracking-tight">FAQ & Support</h1>
 <p className="text-[13px] text-black/30 mt-2 font-light">{faqs.length} Einträge · in der App unter Hilfe & Support sichtbar</p>
 </div>
 {mode === null && (
 <button
 onClick={() => setMode('add')}
 className="flex items-center gap-2 px-6 h-10 border border-black/15 text-black/50 hover:border-black hover:text-black text-[11px] transition-all bg-transparent uppercase tracking-[0.2em] font-light"
 >
 <Plus size={14} />
 Neue FAQ
 </button>
 )}
 </div>

 {/* Add/Edit Form */}
 {mode === 'add' && (
 <FAQForm onSave={handleSave} onCancel={() => setMode(null)} saving={saving} />
 )}
 {mode?.editing && (
 <FAQForm initial={mode.editing} onSave={handleSave} onCancel={() => setMode(null)} saving={saving} />
 )}

 {/* Search */}
 <div className="flex gap-3 mb-4">
 <input
 value={search}
 onChange={e => setSearch(e.target.value)}
 placeholder="FAQ durchsuchen..."
 className="flex-1 h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15"
 />
 </div>

 {/* Category filter pills */}
 <div className="flex gap-2 mb-5 flex-wrap">
 {categories.map(cat => (
 <button
 key={cat}
 onClick={() => setActiveCategory(cat)}
 className={
 activeCategory === cat
 ? 'px-3.5 py-1.5 text-[10px] bg-black text-white border-0 tracking-wider font-light'
 : 'px-3.5 py-1.5 text-[10px] text-black/25 hover:text-black/50 bg-transparent border-0 tracking-wider font-light'
 }
 >
 {cat}
 </button>
 ))}
 </div>

 {/* FAQ List */}
 {filtered.length === 0 ? (
 <div className="text-center py-20">
 <p className="text-[13px] text-black/25 font-light">Keine FAQ-Einträge gefunden</p>
 <button onClick={() => setMode('add')} className="mt-3 text-[11px] text-black/30 hover:text-black/60 bg-transparent border-0 font-light transition-colors">
 Ersten Eintrag erstellen
 </button>
 </div>
 ) : (
 <div className="space-y-0">
 {filtered.map(faq => (
 <div key={faq.id} className="bg-white border-b border-black/[0.04] overflow-hidden">
 <div className="flex items-center gap-3 px-6 py-4 group hover:bg-black/[0.01] transition-all">
 <button
 onClick={() => setExpanded(expanded === faq.id ? null : faq.id)}
 className="flex-1 text-left flex items-start gap-3 bg-transparent border-0 p-0"
 >
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-0.5">
 <span className="text-[10px] font-light text-black/30">{faq.category}</span>
 <span className="text-[8px] text-black/20 font-light">#{faq.sort_order}</span>
 </div>
 <p className="text-[13px] font-light text-black/70 leading-snug">
 {faq.question.length > 80 ? faq.question.substring(0, 80) + '...' : faq.question}
 </p>
 </div>
 <div className="flex-shrink-0 mt-0.5">
 {expanded === faq.id
 ? <ChevronUp size={12} strokeWidth={1.25} className="text-black/25" />
 : <ChevronDown size={12} strokeWidth={1.25} className="text-black/25" />
 }
 </div>
 </button>

 <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
 <button
 onClick={() => { setMode({ editing: faq }); setExpanded(null) }}
 className="w-7 h-7 flex items-center justify-center hover:bg-black/[0.04] transition-colors border-0 bg-transparent"
 >
 <Pencil size={12} strokeWidth={1.25} className="text-black/25" />
 </button>
 <button
 onClick={() => handleDelete(faq.id)}
 className="w-7 h-7 flex items-center justify-center hover:bg-black/[0.04] transition-colors border-0 bg-transparent"
 >
 <Trash2 size={12} strokeWidth={1.25} className="text-black/25" />
 </button>
 </div>
 </div>

 {/* Expanded Answer */}
 {expanded === faq.id && (
 <div className="px-6 pb-4 border-t border-black/[0.04] pt-3">
 <p className="text-[13px] text-black/40 font-light leading-relaxed whitespace-pre-wrap">{faq.answer}</p>
 </div>
 )}
 </div>
 ))}
 </div>
 )}
 </div>
 )
}
