import { useState } from 'react'
import { Plus, Pencil, Trash2, Check, X, Star, BookOpen, ChevronDown, ChevronUp } from 'lucide-react'
import useAtelierStore from '../../store/atelierStore'

const CATEGORIES = ['Gesundheit', 'Tipps', 'Wissen', 'Allgemein']

const emptyForm = {
 title: '',
 slug: '',
 excerpt: '',
 content: '',
 category: 'Allgemein',
 featured: false,
 image: null,
 sortOrder: 0,
}

function generateSlug(title) {
 return title
 .toLowerCase()
 .replace(/[äöüß]/g, c => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' }[c]))
 .replace(/[^\w\s-]/g, '')
 .trim()
 .replace(/\s+/g, '-')
 .replace(/-+/g, '-')
}

function ArticleForm({ initial = emptyForm, onSave, onCancel, saving }) {
 const [form, setForm] = useState({ ...emptyForm, ...initial })
 const [slugManual, setSlugManual] = useState(!!initial.slug)

 const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

 const handleTitle = (v) => {
 setField('title', v)
 if (!slugManual) setField('slug', generateSlug(v))
 }

 const isValid = form.title.trim() && form.content.trim()

 return (
 <div className="bg-white border border-black/6 p-6 space-y-4">
 <div className="flex items-center justify-between mb-1">
 <h3 className="text-sm font-semibold text-black/65">
 {initial.id ? 'Artikel bearbeiten' : 'Neuer Artikel'}
 </h3>
 <button onClick={onCancel} className="w-7 h-7 bg-black/5 flex items-center justify-center border-0 hover:bg-black/10">
 <X size={13} className="text-black/45" />
 </button>
 </div>

 {/* Title */}
 <div>
 <label className="block text-xs font-medium text-black/35 mb-1.5">Titel *</label>
 <input
 value={form.title}
 onChange={e => handleTitle(e.target.value)}
 placeholder="Artikel-Titel"
 className="w-full bg-white border border-black/10 px-3.5 py-2.5 text-sm text-black/90 placeholder-black/20 focus:outline-none focus:border-black/20"
 />
 </div>

 {/* Slug */}
 <div>
 <label className="block text-xs font-medium text-black/35 mb-1.5">Slug</label>
 <input
 value={form.slug}
 onChange={e => { setSlugManual(true); setField('slug', e.target.value) }}
 placeholder="artikel-titel"
 className="w-full bg-white border border-black/10 px-3.5 py-2.5 text-xs text-black/65 font-mono placeholder-black/20 focus:outline-none focus:border-black/20"
 />
 </div>

 {/* Category & Featured row */}
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-xs font-medium text-black/35 mb-1.5">Kategorie</label>
 <select
 value={form.category}
 onChange={e => setField('category', e.target.value)}
 className="w-full bg-white border border-black/10 px-3 py-2.5 text-sm text-black/90 focus:outline-none focus:border-black/20"
 >
 {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
 </select>
 </div>
 <div>
 <label className="block text-xs font-medium text-black/35 mb-1.5">Sort-Order</label>
 <input
 type="number"
 min="0"
 value={form.sortOrder}
 onChange={e => setField('sortOrder', parseInt(e.target.value) || 0)}
 className="w-full bg-white border border-black/10 px-3.5 py-2.5 text-sm text-black/90 focus:outline-none focus:border-black/20"
 />
 </div>
 </div>

 {/* Featured toggle */}
 <label className="flex items-center gap-3 cursor-pointer select-none">
 <div
 onClick={() => setField('featured', !form.featured)}
 className={`w-10 h-5 transition-colors relative flex-shrink-0 ${form.featured ? 'bg-black/50' : 'bg-black/20'}`}
 >
 <div className={`absolute top-0.5 w-4 h-4 bg-white transition-transform shadow-sm ${form.featured ? 'translate-x-5' : 'translate-x-0.5'}`} />
 </div>
 <div className="flex items-center gap-1.5">
 <Star size={12} className={form.featured ? 'text-black/40 fill-black/40' : 'text-black/45'} />
 <span className="text-sm text-black/90">Featured (wird oben im Learn-Tab angezeigt)</span>
 </div>
 </label>

 {/* Excerpt */}
 <div>
 <label className="block text-xs font-medium text-black/35 mb-1.5">
 Kurzbeschreibung <span className="text-black/35 normal-case">(max 400 Zeichen)</span>
 </label>
 <textarea
 value={form.excerpt}
 onChange={e => setField('excerpt', e.target.value)}
 placeholder="Kurze Zusammenfassung für die Artikelliste..."
 maxLength={400}
 rows={2}
 className="w-full bg-white border border-black/10 px-3.5 py-2.5 text-sm text-black/90 placeholder-black/20 resize-none focus:outline-none focus:border-black/20"
 />
 <p className="text-[9px] text-black/35 mt-1">{form.excerpt.length}/400</p>
 </div>

 {/* Content */}
 <div>
 <label className="block text-xs font-medium text-black/35 mb-1.5">
 Inhalt * <span className="text-black/35 normal-case">(Leerzeilen trennen Absätze)</span>
 </label>
 <textarea
 value={form.content}
 onChange={e => setField('content', e.target.value)}
 placeholder={"Abschnittsüberschrift\nAbsatztext...\n\nNächster Abschnitt\nWeiterer Text..."}
 rows={10}
 className="w-full bg-white border border-black/10 px-3.5 py-2.5 text-sm text-black/90 placeholder-black/20 resize-y font-mono text-xs leading-relaxed focus:outline-none focus:border-black/20"
 />
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
 {saving
 ? <div className="w-4 h-4 border-2 border-black/20 border-t-transparent animate-spin" />
 : <><Check size={13} /> Speichern</>
 }
 </button>
 <button
 onClick={onCancel}
 className="px-4 py-2.5 text-xs font-medium text-black/45 bg-black/5 border-0 hover:bg-black/10"
 >
 Abbrechen
 </button>
 </div>
 </div>
 )
}

function ArticleRow({ article, onEdit, onDelete }) {
 const [expanded, setExpanded] = useState(false)
 const catColor = {
 'Gesundheit': 'text-black/40 bg-black/5',
 'Tipps': 'text-black/40 bg-black/5',
 'Wissen': 'text-black/40 bg-black/5',
 'Allgemein': 'text-black/45 bg-black/10',
 }[article.category] || 'text-black/45 bg-black/10'

 return (
 <div className="bg-white border border-black/6 overflow-hidden hover:border-black/10 transition-all">
 <div className="flex items-center gap-3 px-5 py-4">
 {/* Icon */}
 <div className="w-9 h-9 bg-black/5 flex items-center justify-center flex-shrink-0">
 <BookOpen size={15} className="text-black/45" />
 </div>

 {/* Info */}
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <p className="text-sm font-semibold text-black/90 truncate">{article.title}</p>
 {article.featured && (
 <span className="flex items-center gap-0.5 text-[10px] bg-black/4 text-black/40 px-2 py-0.5 font-medium flex-shrink-0">
 <Star size={7} className="fill-black/40 text-black/40" /> Featured
 </span>
 )}
 </div>
 <div className="flex items-center gap-2 mt-0.5">
 <span className={`text-[10px] font-medium px-2 py-0.5 ${catColor}`}>
 {article.category}
 </span>
 {article.slug && (
 <span className="text-[8px] text-black/35 font-mono truncate">{article.slug}</span>
 )}
 </div>
 </div>

 {/* Actions */}
 <div className="flex items-center gap-1.5 flex-shrink-0">
 <button
 onClick={() => setExpanded(e => !e)}
 className="w-8 h-8 bg-black/5 flex items-center justify-center hover:bg-black/10 border-0 transition-all"
 >
 {expanded ? <ChevronUp size={13} className="text-black/45" /> : <ChevronDown size={13} className="text-black/45" />}
 </button>
 <button
 onClick={onEdit}
 className="w-8 h-8 bg-black/5 flex items-center justify-center hover:bg-black/10 border-0 transition-all"
 >
 <Pencil size={13} className="text-black/65" />
 </button>
 <button
 onClick={onDelete}
 className="w-8 h-8 bg-black/4 flex items-center justify-center hover:bg-black/8 border-0 transition-all"
 >
 <Trash2 size={13} className="text-black/35" />
 </button>
 </div>
 </div>

 {/* Expandable preview */}
 {expanded && (
 <div className="px-5 pb-4 border-t border-black/10 pt-3">
 {article.excerpt && (
 <p className="text-xs text-black/45 italic mb-2 leading-relaxed">{article.excerpt}</p>
 )}
 <pre className="text-[10px] text-black/45 font-mono leading-relaxed whitespace-pre-wrap line-clamp-6 bg-[#f6f5f3] p-3">
 {article.content.slice(0, 400)}{article.content.length > 400 ? '…' : ''}
 </pre>
 </div>
 )}
 </div>
 )
}

export default function ArticleEditor() {
 const { articles, addArticle, updateArticle, deleteArticle } = useAtelierStore()
 const [mode, setMode] = useState(null) // null | 'add' | { editing: article }
 const [saving, setSaving] = useState(false)
 const [search, setSearch] = useState('')
 const [filterCat, setFilterCat] = useState('Alle')

 const filtered = articles.filter(a => {
 const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.category.toLowerCase().includes(search.toLowerCase())
 const matchCat = filterCat === 'Alle' || a.category === filterCat
 return matchSearch && matchCat
 })

 const handleSave = async (form) => {
 setSaving(true)
 try {
 if (mode?.editing) {
 await updateArticle(mode.editing.id, form)
 } else {
 await addArticle(form)
 }
 setMode(null)
 } catch (e) {
 console.error(e)
 } finally {
 setSaving(false)
 }
 }

 const handleDelete = async (article) => {
 if (!confirm(`Artikel „${article.title}" löschen?`)) return
 try {
 await deleteArticle(article.id)
 } catch (e) {
 console.error(e)
 }
 }

 const cats = ['Alle', ...CATEGORIES]

 return (
 <div className="p-8">
 {/* Header */}
 <div className="flex items-center justify-between mb-6">
 <div>
 <h1 className="text-xl font-bold text-black/85" style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}>Artikel</h1>
 <p className="text-black/45 text-sm mt-1">
 {articles.length} Artikel · sichtbar im Learn-Tab der App
 </p>
 </div>
 {!mode && (
 <button
 onClick={() => setMode('add')}
 className="flex items-center gap-2 bg-black hover:bg-black text-white text-xs font-medium px-4 py-2 border-0 transition-all"
 >
 <Plus size={14} /> Neuer Artikel
 </button>
 )}
 </div>

 {/* Form (add / edit) */}
 {mode && (
 <div className="mb-6">
 <ArticleForm
 initial={mode?.editing || emptyForm}
 onSave={handleSave}
 onCancel={() => setMode(null)}
 saving={saving}
 />
 </div>
 )}

 {/* Filters */}
 {!mode && (
 <div className="flex flex-col sm:flex-row gap-3 mb-5">
 <input
 value={search}
 onChange={e => setSearch(e.target.value)}
 placeholder="Artikel suchen…"
 className="flex-1 bg-white border border-black/10 px-3.5 py-2.5 text-sm text-black/90 placeholder-black/20 focus:outline-none focus:border-black/20"
 />
 <div className="flex gap-1.5 flex-wrap">
 {cats.map(c => (
 <button
 key={c}
 onClick={() => setFilterCat(c)}
 className={`text-xs font-medium px-3 py-2 border-0 transition-all ${
 filterCat === c ? 'bg-black text-white' : 'bg-black/5 text-black/45 hover:bg-black/10'
 }`}
 >
 {c}
 </button>
 ))}
 </div>
 </div>
 )}

 {/* Article list */}
 {!mode && (
 <div className="space-y-2">
 {filtered.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-16 text-center">
 <BookOpen size={40} className="text-black/20 mb-3" />
 <p className="text-black/45 text-sm">
 {search || filterCat !== 'Alle' ? 'Keine Artikel gefunden' : 'Noch keine Artikel — erstelle den ersten!'}
 </p>
 </div>
 ) : (
 filtered.map(article => (
 mode?.editing?.id === article.id ? null : (
 <ArticleRow
 key={article.id}
 article={article}
 onEdit={() => setMode({ editing: article })}
 onDelete={() => handleDelete(article)}
 />
 )
 ))
 )}
 </div>
 )}
 </div>
 )
}
