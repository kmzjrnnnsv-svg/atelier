import { useState } from 'react'
import { Plus, Pencil, Trash2, Check, X, Star, BookOpen, ChevronDown, ChevronUp, Upload, ImageIcon } from 'lucide-react'
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
    <div className="bg-white p-7 space-y-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-[13px] font-light text-black/70 uppercase tracking-[0.2em]">
          {initial.id ? 'Artikel bearbeiten' : 'Neuer Artikel'}
        </h3>
        <button onClick={onCancel} className="w-7 h-7 flex items-center justify-center hover:bg-black/[0.04] transition-colors border-0 bg-transparent">
          <X size={13} className="text-black/30" />
        </button>
      </div>

      {/* Title */}
      <div>
        <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Titel *</label>
        <input
          value={form.title}
          onChange={e => handleTitle(e.target.value)}
          placeholder="Artikel-Titel"
          className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15"
        />
      </div>

      {/* Slug */}
      <div>
        <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Slug</label>
        <input
          value={form.slug}
          onChange={e => { setSlugManual(true); setField('slug', e.target.value) }}
          placeholder="artikel-titel"
          className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15 font-mono"
        />
      </div>

      {/* Category & Sort Order row */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Kategorie</label>
          <select
            value={form.category}
            onChange={e => setField('category', e.target.value)}
            className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Sort-Order</label>
          <input
            type="number"
            min="0"
            value={form.sortOrder}
            onChange={e => setField('sortOrder', parseInt(e.target.value) || 0)}
            className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15"
          />
        </div>
      </div>

      {/* Featured toggle */}
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <div
          onClick={() => setField('featured', !form.featured)}
          className={`w-10 h-5 transition-colors relative flex-shrink-0 ${form.featured ? 'bg-black/40' : 'bg-black/10'}`}
        >
          <div className={`absolute top-0.5 w-4 h-4 bg-white transition-transform shadow-sm ${form.featured ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </div>
        <div className="flex items-center gap-1.5">
          <Star size={12} className={form.featured ? 'text-black/40 fill-black/40' : 'text-black/25'} />
          <span className="text-[13px] text-black/70 font-light">Featured (wird oben im Learn-Tab angezeigt)</span>
        </div>
      </label>

      {/* Header Image */}
      <div>
        <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Header-Bild (optional)</label>
        <div className="flex gap-4 items-start">
          {form.image ? (
            <div className="relative w-32 h-20 flex-shrink-0 bg-black/[0.02] overflow-hidden">
              <img src={form.image} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => setField('image', null)}
                className="absolute top-1 right-1 w-5 h-5 bg-black/60 flex items-center justify-center border-0 hover:bg-black/80"
              >
                <X size={10} className="text-white" />
              </button>
            </div>
          ) : (
            <div className="w-32 h-20 flex-shrink-0 bg-black/[0.02] flex items-center justify-center border border-dashed border-black/[0.08]">
              <ImageIcon size={18} className="text-black/15" />
            </div>
          )}
          <label className="flex-1 flex items-center gap-2 px-4 py-3 cursor-pointer border-b border-black/[0.08] hover:border-black/25 transition-colors bg-transparent">
            <Upload size={14} className="text-black/25" strokeWidth={1.5} />
            <span className="text-[11px] text-black/30 font-light">{form.image ? 'Bild ersetzen' : 'Bild hochladen'}</span>
            <input type="file" accept="image/*" className="hidden" onChange={e => {
              const file = e.target.files[0]
              if (!file) return
              const reader = new FileReader()
              reader.onload = ev => setField('image', ev.target.result)
              reader.readAsDataURL(file)
            }} />
          </label>
        </div>
      </div>

      {/* Excerpt */}
      <div>
        <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">
          Kurzbeschreibung <span className="normal-case">(max 400 Zeichen)</span>
        </label>
        <textarea
          value={form.excerpt}
          onChange={e => setField('excerpt', e.target.value)}
          placeholder="Kurze Zusammenfassung für die Artikelliste..."
          maxLength={400}
          rows={2}
          className="w-full px-4 py-3 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15 resize-y"
        />
        <p className="text-[9px] text-black/25 font-light uppercase tracking-wider mt-1.5">{form.excerpt.length}/400</p>
      </div>

      {/* Content */}
      <div>
        <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">
          Inhalt * <span className="normal-case">(Leerzeilen trennen Absätze)</span>
        </label>
        <textarea
          value={form.content}
          onChange={e => setField('content', e.target.value)}
          placeholder={"Abschnittsüberschrift\nAbsatztext...\n\nNächster Abschnitt\nWeiterer Text..."}
          rows={10}
          className="w-full px-4 py-3 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15 resize-y font-mono leading-relaxed"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => isValid && !saving && onSave(form)}
          disabled={!isValid || saving}
          className={`px-8 h-11 text-[11px] uppercase tracking-[0.2em] font-light transition-all duration-300 ${
            isValid && !saving
              ? 'border border-black text-black bg-transparent hover:bg-black hover:text-white'
              : 'border border-black/10 text-black/25 bg-transparent cursor-not-allowed'
          }`}
        >
          {saving
            ? <div className="w-4 h-4 border border-black/20 border-t-transparent animate-spin" />
            : <span className="flex items-center gap-2"><Check size={13} /> Speichern</span>
          }
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

function ArticleRow({ article, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white overflow-hidden">
      <div className="flex items-center gap-4 px-6 py-4 group hover:bg-black/[0.01] transition-all border-b border-black/[0.04]">
        {/* Thumbnail / Icon */}
        {article.image ? (
          <div className="w-9 h-9 flex-shrink-0 overflow-hidden bg-black/[0.02]">
            <img src={article.image} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-9 h-9 bg-black/[0.02] flex items-center justify-center flex-shrink-0">
            <BookOpen size={15} className="text-black/20" />
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <p className="text-[13px] font-light text-black/70 truncate">{article.title}</p>
            {article.featured && (
              <span className="flex items-center gap-1 text-[9px] text-black/25 font-light uppercase tracking-wider flex-shrink-0">
                <Star size={7} className="fill-black/25 text-black/25" /> Featured
              </span>
            )}
          </div>
          <div className="flex items-center gap-2.5 mt-1">
            <span className="text-[9px] text-black/25 font-light uppercase tracking-wider">
              {article.category}
            </span>
            {article.slug && (
              <span className="text-[9px] text-black/20 font-mono font-light truncate">{article.slug}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-7 h-7 flex items-center justify-center hover:bg-black/[0.04] transition-colors border-0 bg-transparent opacity-0 group-hover:opacity-100"
          >
            {expanded ? <ChevronUp size={13} className="text-black/30" /> : <ChevronDown size={13} className="text-black/30" />}
          </button>
          <button
            onClick={onEdit}
            className="w-7 h-7 flex items-center justify-center hover:bg-black/[0.04] transition-colors border-0 bg-transparent opacity-0 group-hover:opacity-100"
          >
            <Pencil size={13} className="text-black/30" />
          </button>
          <button
            onClick={onDelete}
            className="w-7 h-7 flex items-center justify-center hover:bg-black/[0.04] transition-colors border-0 bg-transparent opacity-0 group-hover:opacity-100"
          >
            <Trash2 size={13} className="text-black/30" />
          </button>
        </div>
      </div>

      {/* Expandable preview */}
      {expanded && (
        <div className="px-6 pb-5 border-b border-black/[0.04] pt-4">
          {article.image && (
            <img src={article.image} alt="" className="w-full max-h-40 object-cover mb-4" />
          )}
          {article.excerpt && (
            <p className="text-[13px] text-black/35 font-light italic mb-3 leading-relaxed">{article.excerpt}</p>
          )}
          <pre className="text-[11px] text-black/35 font-mono font-light leading-relaxed whitespace-pre-wrap line-clamp-6 bg-black/[0.015] p-4">
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
    <div className="px-10 py-10 lg:px-14 lg:py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[9px] text-black/20 uppercase tracking-[0.3em] mb-3 font-light">Content Management</p>
          <h1 className="text-[28px] font-extralight text-black/85 tracking-tight">Artikel</h1>
          <p className="text-[13px] text-black/30 mt-2 font-light">
            {articles.length} Artikel · sichtbar im Learn-Tab der App
          </p>
        </div>
        {!mode && (
          <button
            onClick={() => setMode('add')}
            className="flex items-center gap-2 px-6 h-10 border border-black/15 text-black/50 hover:border-black hover:text-black text-[11px] transition-all bg-transparent uppercase tracking-[0.2em] font-light"
          >
            <Plus size={14} /> Neuer Artikel
          </button>
        )}
      </div>

      {/* Form (add / edit) */}
      {mode && (
        <div className="mb-8">
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
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Artikel suchen..."
            className="flex-1 h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15"
          />
          <div className="flex gap-1 flex-wrap items-center">
            {cats.map(c => (
              <button
                key={c}
                onClick={() => setFilterCat(c)}
                className={filterCat === c
                  ? 'px-3.5 py-1.5 text-[10px] bg-black text-white border-0 transition-all tracking-wider font-light'
                  : 'px-3.5 py-1.5 text-[10px] text-black/25 hover:text-black/50 bg-transparent border-0 transition-all tracking-wider font-light'
                }
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Article list */}
      {!mode && (
        <div>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <BookOpen size={36} className="text-black/10 mb-4" strokeWidth={1} />
              <p className="text-[13px] text-black/30 font-light">
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
