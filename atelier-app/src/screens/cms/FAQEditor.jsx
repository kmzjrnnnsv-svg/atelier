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
 <div className="bg-white border border-black/8 p-6 space-y-4 mb-4">
 <div className="flex items-center justify-between">
 <h3 className="text-sm font-semibold text-black/65">
 {initial.id ? 'FAQ bearbeiten' : 'Neue FAQ'}
 </h3>
 <button onClick={onCancel} className="w-7 h-7 bg-black/5 flex items-center justify-center border-0 hover:bg-black/10">
 <X size={13} className="text-black/45" />
 </button>
 </div>

 {/* Question */}
 <div>
 <label className="block text-xs font-medium text-black/35 mb-1.5">Frage *</label>
 <textarea
 value={form.question}
 onChange={e => setField('question', e.target.value)}
 placeholder="Welche Frage beantwortet dieser Eintrag?"
 rows={2}
 className="w-full bg-white border border-black/10 px-3.5 py-2.5 text-sm text-black/90 placeholder-black/20 resize-none focus:outline-none focus:border-black/20"
 />
 </div>

 {/* Answer */}
 <div>
 <label className="block text-xs font-medium text-black/35 mb-1.5">Antwort *</label>
 <textarea
 value={form.answer}
 onChange={e => setField('answer', e.target.value)}
 placeholder="Ausführliche Antwort auf die Frage..."
 rows={6}
 className="w-full bg-white border border-black/10 px-3.5 py-2.5 text-sm text-black/90 placeholder-black/20 resize-y font-mono text-xs leading-relaxed focus:outline-none focus:border-black/20"
 />
 </div>

 {/* Category + Sort Order */}
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-xs font-medium text-black/35 mb-1.5">Kategorie</label>
 <select
 value={form.category}
 onChange={e => setField('category', e.target.value)}
 className="w-full bg-white border border-black/10 px-3 py-2.5 text-sm text-black/90 focus:outline-none focus:border-black/20"
 >
 {FAQ_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
 </select>
 </div>
 <div>
 <label className="block text-xs font-medium text-black/35 mb-1.5">Reihenfolge</label>
 <input
 type="number"
 min="0"
 value={form.sort_order}
 onChange={e => setField('sort_order', parseInt(e.target.value) || 0)}
 className="w-full bg-white border border-black/10 px-3.5 py-2.5 text-sm text-black/90 focus:outline-none focus:border-black/20"
 />
 </div>
 </div>

 {/* Actions */}
 <div className="flex gap-3 pt-1">
 <button
 onClick={() => isValid && !saving && onSave(form)}
 disabled={!isValid || saving}
 className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium border-0 transition-all ${
 isValid && !saving ? 'bg-black text-white hover:bg-black' : 'bg-black/5 text-black/35 cursor-not-allowed'
 }`}
 >
 {saving ? 'Speichern…' : (initial.id ? 'Aktualisieren' : 'FAQ hinzufügen')}
 </button>
 <button
 onClick={onCancel}
 className="px-4 py-2.5 text-xs font-medium bg-black/5 text-black/45 hover:bg-black/10 border-0 transition-all"
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
 <div className="p-8 max-w-4xl mx-auto">
 {/* Header */}
 <div className="flex items-center justify-between mb-6">
 <div>
 <div className="flex items-center gap-2 mb-1">
 <HelpCircle size={18} className="text-purple-400" />
 <h1 className="text-xl font-semibold text-black/90 tracking-tight" style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}>FAQ & Support</h1>
 </div>
 <p className="text-xs text-black/45">{faqs.length} Einträge · in der App unter Hilfe & Support sichtbar</p>
 </div>
 {mode === null && (
 <button
 onClick={() => setMode('add')}
 className="flex items-center gap-2 bg-black hover:bg-black text-white text-xs font-medium px-4 py-2 border-0 transition-all"
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

 {/* Search + Category filter */}
 <div className="flex gap-3 mb-4">
 <input
 value={search}
 onChange={e => setSearch(e.target.value)}
 placeholder="FAQ durchsuchen…"
 className="flex-1 bg-white border border-black/10 px-3.5 py-2.5 text-sm text-black/90 placeholder-black/20 focus:outline-none focus:border-black/20"
 />
 </div>

 <div className="flex gap-2 mb-5 flex-wrap">
 {categories.map(cat => (
 <button
 key={cat}
 onClick={() => setActiveCategory(cat)}
 className={`px-3 py-1.5 text-xs font-medium border-0 transition-all ${
 activeCategory === cat ? 'bg-black text-white' : 'bg-black/5 text-black/45 hover:bg-black/10'
 }`}
 >
 {cat}
 </button>
 ))}
 </div>

 {/* FAQ List */}
 {filtered.length === 0 ? (
 <div className="text-center py-16 text-black/35">
 <HelpCircle size={36} className="mx-auto mb-3 opacity-30" />
 <p className="text-sm">Keine FAQ-Einträge gefunden</p>
 <button onClick={() => setMode('add')} className="mt-3 text-xs text-black/90 underline bg-transparent border-0">
 Ersten Eintrag erstellen →
 </button>
 </div>
 ) : (
 <div className="space-y-2">
 {filtered.map(faq => (
 <div key={faq.id} className="bg-white border border-black/8 overflow-hidden">
 <div className="flex items-center gap-3 p-4">
 <button
 onClick={() => setExpanded(expanded === faq.id ? null : faq.id)}
 className="flex-1 text-left flex items-start gap-3 bg-transparent border-0 p-0"
 >
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-0.5">
 <span className="text-xs font-medium text-purple-400">{faq.category}</span>
 <span className="text-[8px] text-black/35">#{faq.sort_order}</span>
 </div>
 <p className="text-sm font-medium text-black/90 leading-snug">
 {faq.question.length > 80 ? faq.question.substring(0, 80) + '…' : faq.question}
 </p>
 </div>
 <div className="flex-shrink-0 mt-0.5">
 {expanded === faq.id
 ? <ChevronUp size={14} className="text-black/45" />
 : <ChevronDown size={14} className="text-black/45" />
 }
 </div>
 </button>

 <div className="flex items-center gap-1 flex-shrink-0">
 <button
 onClick={() => { setMode({ editing: faq }); setExpanded(null) }}
 className="w-7 h-7 bg-black/5 hover:bg-black/10 flex items-center justify-center border-0 transition-all"
 >
 <Pencil size={12} className="text-black/45" />
 </button>
 <button
 onClick={() => handleDelete(faq.id)}
 className="w-7 h-7 bg-black/5 hover:bg-red-100 flex items-center justify-center border-0 transition-all"
 >
 <Trash2 size={12} className="text-black/45 hover:text-red-400" />
 </button>
 </div>
 </div>

 {/* Expanded Answer */}
 {expanded === faq.id && (
 <div className="px-4 pb-4 border-t border-black/10 pt-3">
 <p className="text-sm text-black/65 leading-relaxed whitespace-pre-wrap">{faq.answer}</p>
 </div>
 )}
 </div>
 ))}
 </div>
 )}
 </div>
 )
}
