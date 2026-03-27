import { useState, useRef, useEffect } from 'react'
import { Plus, Pencil, Trash2, Check, Upload, X, Eye, EyeOff, GripVertical, Image, ChevronDown, Loader2 } from 'lucide-react'
import useAtelierStore from '../../store/atelierStore'
import { apiFetch } from '../../hooks/useApi'

// ── Reusable Image Picker with dropdown + upload ───────────────────────────
function ImagePicker({ value, onChange, label }) {
  const [open, setOpen] = useState(false)
  const [media, setMedia] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()
  const dropRef = useRef()

  // close on outside click
  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false) }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const loadMedia = () => {
    if (media.length) return
    setLoading(true)
    apiFetch('/api/media')
      .then(data => setMedia(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const handleOpen = () => {
    setOpen(!open)
    if (!open) loadMedia()
  }

  const handleUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUri = reader.result
      try {
        const res = await apiFetch('/api/media', {
          method: 'POST',
          body: JSON.stringify({ name: file.name, image_data: dataUri }),
        })
        if (res?.id) {
          setMedia(prev => [{ id: res.id, name: res.name, image_data: res.image_data }, ...prev])
          onChange(dataUri)
        }
      } catch {}
      setUploading(false)
      setOpen(false)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleSelect = (item) => {
    onChange(item.image_data)
    setOpen(false)
  }

  const handleRemove = () => {
    onChange('')
  }

  return (
    <div ref={dropRef} className="relative">
      <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">{label}</label>

      {/* Selected preview or trigger */}
      {value ? (
        <div className="relative group">
          <div className="w-full overflow-hidden bg-[#fafaf9]" style={{ aspectRatio: '16 / 5', maxHeight: 140 }}>
            <img src={value} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <button
              onClick={handleOpen}
              className="px-4 h-8 bg-white text-[10px] text-black uppercase tracking-[0.15em] font-light border-0 hover:bg-black hover:text-white transition-all"
            >
              Ändern
            </button>
            <button
              onClick={handleRemove}
              className="w-8 h-8 bg-white text-black flex items-center justify-center border-0 hover:bg-red-500 hover:text-white transition-all"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={handleOpen}
          className="w-full py-6 border border-dashed border-black/[0.08] text-black/25 text-[11px] flex items-center justify-center gap-2 bg-transparent hover:border-black/25 font-light uppercase tracking-[0.15em] transition-all"
        >
          <Image size={14} strokeWidth={1.25} />
          Bild auswählen
          <ChevronDown size={12} strokeWidth={1.25} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-black/[0.08] shadow-lg max-h-[320px] overflow-y-auto">
          {/* Upload row */}
          <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full px-4 py-3 flex items-center gap-2.5 text-[11px] text-black/50 hover:bg-black/[0.02] border-0 border-b border-black/[0.04] bg-transparent font-light uppercase tracking-[0.15em] transition-all disabled:opacity-40"
          >
            {uploading ? <Loader2 size={13} strokeWidth={1.25} className="animate-spin" /> : <Upload size={13} strokeWidth={1.25} />}
            {uploading ? 'Wird hochgeladen …' : 'Neues Bild hochladen'}
          </button>

          {/* Media grid */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={16} strokeWidth={1.25} className="animate-spin text-black/20" />
            </div>
          ) : media.length === 0 ? (
            <p className="text-center text-[11px] text-black/20 py-8 font-light">Noch keine Bilder vorhanden</p>
          ) : (
            <div className="grid grid-cols-3 gap-[1px] bg-black/[0.04] p-[1px]">
              {media.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className="relative group/item bg-white border-0 p-0 cursor-pointer overflow-hidden"
                  style={{ aspectRatio: '1' }}
                >
                  <img src={item.image_data} alt={item.name} className="w-full h-full object-cover transition-transform duration-300 group-hover/item:scale-[1.05]" />
                  <div className="absolute inset-0 bg-black/0 group-hover/item:bg-black/20 transition-colors" />
                  <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity">
                    <p className="text-[8px] text-white/80 truncate font-light">{item.name}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const ICON_OPTIONS = ['BookOpen', 'Film', 'Layers', 'Sparkles', 'Users', 'TrendingUp', 'Compass', 'Star', 'Heart', 'Globe']
const TAG_OPTIONS = ['Demnächst', 'In Produktion', 'Beta', 'Geheim', 'Neu', 'Live']

const emptyForm = {
  key: '', label: '', title: '', description: '', tag: 'Demnächst',
  color: '#1a1a1a', accent: '#ffffff', icon: 'BookOpen',
  image: null, previewItems: [''], visible: true, sortOrder: 0,
}

function SectionForm({ initial = emptyForm, onSave, onCancel, isNew }) {
  const [form, setForm] = useState({ ...initial, previewItems: initial.previewItems?.length ? [...initial.previewItems] : [''] })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const fileRef = useRef()

  const valid = form.key.trim() && form.label.trim() && form.title.trim()

  const handleImage = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => set('image', reader.result)
    reader.readAsDataURL(file)
  }

  const updatePreview = (i, val) => {
    const items = [...form.previewItems]
    items[i] = val
    setForm(f => ({ ...f, previewItems: items }))
  }
  const addPreview = () => setForm(f => ({ ...f, previewItems: [...f.previewItems, ''] }))
  const removePreview = (i) => setForm(f => ({ ...f, previewItems: f.previewItems.filter((_, j) => j !== i) }))

  return (
    <div className="bg-white p-7 space-y-5">
      <p className="text-[9px] text-black/20 uppercase tracking-[0.3em] font-light">{isNew ? 'Neue Section' : 'Bearbeiten'}</p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Key *</label>
          <input value={form.key} onChange={e => set('key', e.target.value)} placeholder="editorial"
            className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 font-light text-black/70 placeholder-black/15"
            disabled={!isNew} />
        </div>
        <div>
          <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Label *</label>
          <input value={form.label} onChange={e => set('label', e.target.value)} placeholder="Editorial"
            className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 font-light text-black/70 placeholder-black/15" />
        </div>
      </div>

      <div>
        <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Titel *</label>
        <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Saisonale Editorials"
          className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 font-light text-black/70 placeholder-black/15" />
      </div>

      <div>
        <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Beschreibung</label>
        <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
          className="w-full py-3 border-b border-black/[0.08] bg-transparent resize-y text-[13px] font-light text-black/70 placeholder-black/15 outline-none focus:border-black/25 px-4" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Tag</label>
          <select value={form.tag} onChange={e => set('tag', e.target.value)}
            className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 font-light text-black/70">
            {TAG_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Icon</label>
          <select value={form.icon} onChange={e => set('icon', e.target.value)}
            className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 font-light text-black/70">
            {ICON_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Sortierung</label>
          <input type="number" value={form.sortOrder} onChange={e => set('sortOrder', Number(e.target.value))}
            className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 font-light text-black/70" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Farbe</label>
          <div className="flex items-center gap-3">
            <input type="color" value={form.color} onChange={e => set('color', e.target.value)}
              className="w-10 h-10 border border-black/[0.08] bg-transparent cursor-pointer" />
            <input value={form.color} onChange={e => set('color', e.target.value)}
              className="flex-1 h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 font-light text-black/70 font-mono" />
          </div>
        </div>
        <div>
          <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Akzentfarbe</label>
          <div className="flex items-center gap-3">
            <input type="color" value={form.accent} onChange={e => set('accent', e.target.value)}
              className="w-10 h-10 border border-black/[0.08] bg-transparent cursor-pointer" />
            <input value={form.accent} onChange={e => set('accent', e.target.value)}
              className="flex-1 h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 font-light text-black/70 font-mono" />
          </div>
        </div>
      </div>

      {/* Section Image */}
      <div>
        <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Section-Bild</label>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
        {form.image ? (
          <div className="relative">
            <img src={form.image} alt="" className="w-full h-32 object-cover" />
            <button onClick={() => set('image', null)}
              className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white flex items-center justify-center border-0">
              <X size={12} />
            </button>
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()}
            className="w-full py-6 border border-dashed border-black/[0.08] text-black/25 text-[11px] flex items-center justify-center gap-2 bg-transparent hover:border-black/25 font-light uppercase tracking-[0.15em] transition-all">
            <Upload size={13} strokeWidth={1.25} /> Bild hochladen
          </button>
        )}
      </div>

      {/* Preview Items */}
      <div>
        <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Vorschau-Items</label>
        <div className="space-y-2">
          {form.previewItems.map((item, i) => (
            <div key={i} className="flex gap-2">
              <input value={item} onChange={e => updatePreview(i, e.target.value)} placeholder={`Item ${i + 1}`}
                className="flex-1 h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 font-light text-black/70 placeholder-black/15" />
              {form.previewItems.length > 1 && (
                <button onClick={() => removePreview(i)} className="w-7 h-7 hover:bg-black/[0.04] border-0 bg-transparent flex items-center justify-center flex-shrink-0 mt-1.5">
                  <X size={12} strokeWidth={1.25} className="text-black/25" />
                </button>
              )}
            </div>
          ))}
          <button onClick={addPreview} className="flex items-center gap-2 text-[11px] text-black/30 hover:text-black/60 bg-transparent border-0 px-0 font-light uppercase tracking-[0.15em] transition-all">+ Item hinzufugen</button>
        </div>
      </div>

      {/* Visible toggle */}
      <label className="flex items-center gap-2.5 cursor-pointer">
        <input type="checkbox" checked={form.visible} onChange={e => set('visible', e.target.checked)}
          className="w-4 h-4" />
        <span className="text-[13px] text-black/40 font-light">Sichtbar in der App</span>
      </label>

      <div className="flex gap-3 pt-2">
        <button onClick={() => valid && onSave({ ...form, previewItems: form.previewItems.filter(p => p.trim()) })} disabled={!valid}
          className="px-8 h-11 border border-black text-black text-[11px] bg-transparent hover:bg-black hover:text-white transition-all uppercase tracking-[0.2em] font-light disabled:opacity-30 flex items-center justify-center gap-2">
          <Check size={13} strokeWidth={1.25} /> Speichern
        </button>
        <button onClick={onCancel}
          className="px-6 h-11 text-[11px] text-black/30 hover:text-black/60 bg-transparent border-0 font-light">
          Abbrechen
        </button>
      </div>
    </div>
  )
}

function HeroEditor({ hero, onSave }) {
  const [form, setForm] = useState({ ...hero })
  const [saving, setSaving] = useState(false)
  const fileRef = useRef()

  const handleImage = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setForm(f => ({ ...f, image: reader.result }))
    reader.readAsDataURL(file)
  }

  const save = async () => {
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div className="bg-white p-7 space-y-5 mb-8">
      <p className="text-[9px] text-black/20 uppercase tracking-[0.3em] font-light">Hero-Bereich</p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Hero-Titel</label>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="EXPLORE"
            className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 font-light text-black/70 placeholder-black/15" />
        </div>
        <div>
          <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Untertitel</label>
          <input value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))}
            placeholder="Inspiration & Handwerk"
            className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 font-light text-black/70 placeholder-black/15" />
        </div>
      </div>

      <div>
        <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Hero-Bild</label>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
        {form.image ? (
          <div className="relative">
            <img src={form.image} alt="" className="w-full h-40 object-cover" />
            <button onClick={() => setForm(f => ({ ...f, image: null }))}
              className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white flex items-center justify-center border-0">
              <X size={12} />
            </button>
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()}
            className="w-full py-8 border border-dashed border-black/[0.08] text-black/25 text-[11px] flex items-center justify-center gap-2 bg-transparent hover:border-black/25 font-light uppercase tracking-[0.15em] transition-all">
            <Image size={14} strokeWidth={1.25} /> Hero-Bild hochladen (empfohlen: 860x400)
          </button>
        )}
      </div>

      {/* Preview */}
      {(form.image || form.title) && (
        <div className="relative overflow-hidden" style={{ height: 120 }}>
          {form.image && <img src={form.image} alt="" className="absolute inset-0 w-full h-full object-cover" />}
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative h-full flex flex-col justify-end p-4">
            <p className="text-[7px] text-white/50" style={{ letterSpacing: '0.2em', textTransform: 'uppercase' }}>ATELIER</p>
            <p className="text-[13px] text-white font-light" style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>{form.title || 'EXPLORE'}</p>
            {form.subtitle && <p className="text-[9px] text-white/50 mt-0.5">{form.subtitle}</p>}
          </div>
        </div>
      )}

      <button onClick={save} disabled={saving}
        className="px-8 h-11 border border-black text-black text-[11px] bg-transparent hover:bg-black hover:text-white transition-all uppercase tracking-[0.2em] font-light disabled:opacity-30 flex items-center justify-center gap-2">
        <Check size={13} strokeWidth={1.25} /> {saving ? 'Speichern...' : 'Hero speichern'}
      </button>
    </div>
  )
}

const inputCls = 'w-full h-10 px-0 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15'
const labelCls = 'text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light'

const PAGE_TEXT_FIELDS = [
  { key: 'topics_label', label: 'Themen — Label', placeholder: 'Entdecken' },
  { key: 'topics_title', label: 'Themen — Titel', placeholder: 'Themen' },
  { key: 'articles_label', label: 'Artikel — Label', placeholder: 'Atelier Journal' },
  { key: 'articles_title', label: 'Artikel — Titel', placeholder: 'Alle Artikel' },
  { key: 'journal_cta_label', label: 'Journal-CTA — Label', placeholder: 'Atelier Journal' },
  { key: 'journal_cta_title', label: 'Journal-CTA — Titel', placeholder: 'Die Welt hinter jedem Schuh' },
  { key: 'journal_cta_description', label: 'Journal-CTA — Beschreibung', placeholder: 'Editorials, Handwerkskunst und Inspirationen...' },
]

function PageTextsEditor() {
  const [texts, setTexts] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    apiFetch('/api/settings/explore')
      .then(data => { if (data) setTexts(data) })
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await apiFetch('/api/settings/explore', {
        method: 'PUT',
        body: JSON.stringify({ config: texts }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {}
    setSaving(false)
  }

  return (
    <div className="bg-white p-7 mb-8">
      <p className="text-[9px] text-black/25 uppercase tracking-[0.25em] mb-5 font-light">Seiten-Texte</p>
      <div className="space-y-4">
        {PAGE_TEXT_FIELDS.map(field => (
          <div key={field.key} className={field.key.includes('label') && PAGE_TEXT_FIELDS.find(f => f.key === field.key.replace('label', 'title')) ? 'flex gap-5' : ''}>
            {field.key.includes('label') && PAGE_TEXT_FIELDS.find(f => f.key === field.key.replace('label', 'title')) ? (
              <>
                <div className="flex-1">
                  <label className={labelCls}>{field.label}</label>
                  <input
                    value={texts[field.key] || ''}
                    onChange={e => setTexts(prev => ({ ...prev, [field.key]: e.target.value }))}
                    className={inputCls}
                    placeholder={field.placeholder}
                  />
                </div>
                {(() => {
                  const titleField = PAGE_TEXT_FIELDS.find(f => f.key === field.key.replace('label', 'title'))
                  return titleField ? (
                    <div className="flex-1">
                      <label className={labelCls}>{titleField.label}</label>
                      <input
                        value={texts[titleField.key] || ''}
                        onChange={e => setTexts(prev => ({ ...prev, [titleField.key]: e.target.value }))}
                        className={inputCls}
                        placeholder={titleField.placeholder}
                      />
                    </div>
                  ) : null
                })()}
              </>
            ) : !field.key.includes('title') || !PAGE_TEXT_FIELDS.find(f => f.key === field.key.replace('title', 'label')) ? (
              <div>
                <label className={labelCls}>{field.label}</label>
                <input
                  value={texts[field.key] || ''}
                  onChange={e => setTexts(prev => ({ ...prev, [field.key]: e.target.value }))}
                  className={inputCls}
                  placeholder={field.placeholder}
                />
              </div>
            ) : null}
          </div>
        ))}

        {/* Image Picker for Journal CTA */}
        <div className="pt-2">
          <ImagePicker
            value={texts.journal_cta_image || ''}
            onChange={(val) => setTexts(prev => ({ ...prev, journal_cta_image: val }))}
            label="Journal-CTA — Bild"
          />
        </div>
      </div>
      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-8 h-10 border border-black text-[10px] uppercase tracking-[0.2em] font-light hover:bg-black hover:text-white transition-all disabled:opacity-30"
        >
          {saving ? 'Speichert …' : 'Texte speichern'}
        </button>
        {saved && <span className="text-[11px] text-black/35 font-light">Gespeichert</span>}
      </div>
    </div>
  )
}

export default function ExploreEditor() {
  const { exploreSections, exploreHero, addExploreSection, updateExploreSection, deleteExploreSection, updateExploreHero } = useAtelierStore()
  const [mode, setMode] = useState(null)

  const sorted = [...exploreSections].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div className="px-10 py-10 lg:px-14 lg:py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[9px] text-black/20 uppercase tracking-[0.3em] mb-3 font-light">Content</p>
          <h1 className="text-[28px] font-extralight text-black/85 tracking-tight">Explore</h1>
          <p className="text-[13px] text-black/30 mt-2 font-light">Hero-Bild, Seiten-Texte & Sektionen der Explore-Seite</p>
        </div>
        {!mode && (
          <button onClick={() => setMode('add')}
            className="flex items-center gap-2 px-6 h-10 border border-black/15 text-black/50 hover:border-black hover:text-black text-[11px] bg-transparent uppercase tracking-[0.2em] font-light transition-all">
            <Plus size={13} strokeWidth={1.25} /> Neue Section
          </button>
        )}
      </div>

      {/* Page Texts Editor */}
      <PageTextsEditor />

      {/* Hero Editor */}
      <HeroEditor hero={exploreHero} onSave={updateExploreHero} />

      {/* Add form */}
      {mode === 'add' && (
        <div className="mb-8">
          <SectionForm isNew onSave={f => { addExploreSection(f); setMode(null) }} onCancel={() => setMode(null)} />
        </div>
      )}

      {/* Sections list */}
      <div>
        {sorted.map(section => (
          mode?.editing?.id === section.id ? (
            <SectionForm key={section.id} initial={section}
              onSave={f => { updateExploreSection(section.id, f); setMode(null) }}
              onCancel={() => setMode(null)} />
          ) : (
            <div key={section.id} className="bg-white px-6 py-4 group hover:bg-black/[0.01] border-b border-black/[0.04] flex items-center gap-4 transition-all">
              <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: section.color }}>
                <span className="text-white text-[10px] font-light" style={{ letterSpacing: '0.1em' }}>
                  {section.label?.slice(0, 3).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-light text-black/70">{section.title}</p>
                  {!section.visible && <EyeOff size={12} strokeWidth={1.25} className="text-black/25" />}
                </div>
                <p className="text-[10px] text-black/30 mt-0.5 font-light">{section.key} · {section.tag} · {section.previewItems?.length || 0} Items</p>
              </div>
              {section.image && (
                <img src={section.image} alt="" className="w-16 h-12 object-cover flex-shrink-0" />
              )}
              <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setMode({ editing: section })}
                  className="w-7 h-7 hover:bg-black/[0.04] border-0 bg-transparent flex items-center justify-center">
                  <Pencil size={12} strokeWidth={1.25} className="text-black/25" />
                </button>
                <button onClick={() => { if (confirm(`"${section.title}" löschen?`)) deleteExploreSection(section.id) }}
                  className="w-7 h-7 hover:bg-black/[0.04] border-0 bg-transparent flex items-center justify-center">
                  <Trash2 size={12} strokeWidth={1.25} className="text-black/25" />
                </button>
              </div>
            </div>
          )
        ))}
        {sorted.length === 0 && (
          <div className="text-center py-20 text-[13px] text-black/25 font-light">Keine Explore-Sektionen</div>
        )}
      </div>
    </div>
  )
}
