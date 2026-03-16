import { useState, useRef } from 'react'
import { Plus, Pencil, Trash2, Check, Upload, X, Eye, EyeOff, GripVertical, Image } from 'lucide-react'
import useAtelierStore from '../../store/atelierStore'

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
    <div className="bg-white border border-black/8 p-5 space-y-4">
      <h3 className="text-sm font-semibold text-black/65">{isNew ? 'Neue Section' : 'Bearbeiten'}</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-black/35 mb-1.5">Key *</label>
          <input value={form.key} onChange={e => set('key', e.target.value)} placeholder="editorial"
            className="w-full bg-white border border-black/10 px-3.5 py-2.5 text-sm text-black/90 placeholder-black/20 focus:outline-none focus:border-black/20"
            disabled={!isNew} />
        </div>
        <div>
          <label className="block text-xs font-medium text-black/35 mb-1.5">Label *</label>
          <input value={form.label} onChange={e => set('label', e.target.value)} placeholder="Editorial"
            className="w-full bg-white border border-black/10 px-3.5 py-2.5 text-sm text-black/90 placeholder-black/20 focus:outline-none focus:border-black/20" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-black/35 mb-1.5">Titel *</label>
        <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Saisonale Editorials"
          className="w-full bg-white border border-black/10 px-3.5 py-2.5 text-sm text-black/90 placeholder-black/20 focus:outline-none focus:border-black/20" />
      </div>

      <div>
        <label className="block text-xs font-medium text-black/35 mb-1.5">Beschreibung</label>
        <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
          className="w-full bg-white border border-black/10 px-3.5 py-2.5 text-sm text-black/90 placeholder-black/20 focus:outline-none focus:border-black/20 resize-none" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-black/35 mb-1.5">Tag</label>
          <select value={form.tag} onChange={e => set('tag', e.target.value)}
            className="w-full bg-white border border-black/10 px-3.5 py-2.5 text-sm text-black/90 focus:outline-none">
            {TAG_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-black/35 mb-1.5">Icon</label>
          <select value={form.icon} onChange={e => set('icon', e.target.value)}
            className="w-full bg-white border border-black/10 px-3.5 py-2.5 text-sm text-black/90 focus:outline-none">
            {ICON_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-black/35 mb-1.5">Sortierung</label>
          <input type="number" value={form.sortOrder} onChange={e => set('sortOrder', Number(e.target.value))}
            className="w-full bg-white border border-black/10 px-3.5 py-2.5 text-sm text-black/90 focus:outline-none" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-black/35 mb-1.5">Farbe</label>
          <div className="flex items-center gap-2">
            <input type="color" value={form.color} onChange={e => set('color', e.target.value)}
              className="w-10 h-10 border border-black/15 bg-transparent cursor-pointer" />
            <input value={form.color} onChange={e => set('color', e.target.value)}
              className="flex-1 bg-white border border-black/10 px-3.5 py-2.5 text-sm text-black/90 font-mono focus:outline-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-black/35 mb-1.5">Akzentfarbe</label>
          <div className="flex items-center gap-2">
            <input type="color" value={form.accent} onChange={e => set('accent', e.target.value)}
              className="w-10 h-10 border border-black/15 bg-transparent cursor-pointer" />
            <input value={form.accent} onChange={e => set('accent', e.target.value)}
              className="flex-1 bg-white border border-black/10 px-3.5 py-2.5 text-sm text-black/90 font-mono focus:outline-none" />
          </div>
        </div>
      </div>

      {/* Section Image */}
      <div>
        <label className="block text-xs font-medium text-black/35 mb-1.5">Section-Bild</label>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
        {form.image ? (
          <div className="relative">
            <img src={form.image} alt="" className="w-full h-32 object-cover border border-black/10" />
            <button onClick={() => set('image', null)}
              className="absolute top-2 right-2 w-6 h-6 bg-black/60 text-white flex items-center justify-center border-0">
              <X size={12} />
            </button>
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()}
            className="w-full py-6 border border-dashed border-black/15 text-black/30 text-xs flex items-center justify-center gap-2 bg-transparent hover:border-black/25">
            <Upload size={14} /> Bild hochladen
          </button>
        )}
      </div>

      {/* Preview Items */}
      <div>
        <label className="block text-xs font-medium text-black/35 mb-1.5">Vorschau-Items</label>
        <div className="space-y-2">
          {form.previewItems.map((item, i) => (
            <div key={i} className="flex gap-2">
              <input value={item} onChange={e => updatePreview(i, e.target.value)} placeholder={`Item ${i + 1}`}
                className="flex-1 bg-white border border-black/10 px-3.5 py-2 text-sm text-black/90 placeholder-black/20 focus:outline-none" />
              {form.previewItems.length > 1 && (
                <button onClick={() => removePreview(i)} className="w-8 h-8 bg-red-500/10 flex items-center justify-center border-0 flex-shrink-0 mt-0.5">
                  <X size={12} className="text-red-400" />
                </button>
              )}
            </div>
          ))}
          <button onClick={addPreview} className="text-[10px] text-black/40 hover:text-black/70 bg-transparent border-0 px-0">+ Item hinzufügen</button>
        </div>
      </div>

      {/* Visible toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.visible} onChange={e => set('visible', e.target.checked)}
          className="w-4 h-4" />
        <span className="text-xs text-black/60">Sichtbar in der App</span>
      </label>

      <div className="flex gap-3">
        <button onClick={() => valid && onSave({ ...form, previewItems: form.previewItems.filter(p => p.trim()) })} disabled={!valid}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium border-0 ${valid ? 'bg-black text-white hover:bg-black' : 'bg-black/5 text-black/35 cursor-not-allowed'}`}>
          <Check size={14} /> Speichern
        </button>
        <button onClick={onCancel}
          className="px-4 py-2.5 text-xs font-medium text-black/45 hover:text-black/90 bg-black/5 border-0">
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
    <div className="bg-white border border-black/8 p-5 space-y-4 mb-6">
      <h3 className="text-sm font-semibold text-black/65">Hero-Bereich</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-black/35 mb-1.5">Hero-Titel</label>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="EXPLORE"
            className="w-full bg-white border border-black/10 px-3.5 py-2.5 text-sm text-black/90 placeholder-black/20 focus:outline-none focus:border-black/20" />
        </div>
        <div>
          <label className="block text-xs font-medium text-black/35 mb-1.5">Untertitel</label>
          <input value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))}
            placeholder="Inspiration & Handwerk"
            className="w-full bg-white border border-black/10 px-3.5 py-2.5 text-sm text-black/90 placeholder-black/20 focus:outline-none focus:border-black/20" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-black/35 mb-1.5">Hero-Bild</label>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
        {form.image ? (
          <div className="relative">
            <img src={form.image} alt="" className="w-full h-40 object-cover border border-black/10" />
            <button onClick={() => setForm(f => ({ ...f, image: null }))}
              className="absolute top-2 right-2 w-6 h-6 bg-black/60 text-white flex items-center justify-center border-0">
              <X size={12} />
            </button>
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()}
            className="w-full py-8 border border-dashed border-black/15 text-black/30 text-xs flex items-center justify-center gap-2 bg-transparent hover:border-black/25">
            <Image size={16} /> Hero-Bild hochladen (empfohlen: 860×400)
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
        className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium bg-black text-white border-0">
        <Check size={14} /> {saving ? 'Speichern…' : 'Hero speichern'}
      </button>
    </div>
  )
}

export default function ExploreEditor() {
  const { exploreSections, exploreHero, addExploreSection, updateExploreSection, deleteExploreSection, updateExploreHero } = useAtelierStore()
  const [mode, setMode] = useState(null)

  const sorted = [...exploreSections].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-black/90 tracking-tight" style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}>Explore</h1>
          <p className="text-black/45 text-sm mt-1">Hero-Bild & Sektionen der Explore-Seite</p>
        </div>
        {!mode && (
          <button onClick={() => setMode('add')}
            className="flex items-center gap-2 bg-black hover:bg-black text-white text-xs font-medium px-4 py-2 border-0">
            <Plus size={14} /> Neue Section
          </button>
        )}
      </div>

      {/* Hero Editor */}
      <HeroEditor hero={exploreHero} onSave={updateExploreHero} />

      {/* Add form */}
      {mode === 'add' && (
        <div className="mb-6">
          <SectionForm isNew onSave={f => { addExploreSection(f); setMode(null) }} onCancel={() => setMode(null)} />
        </div>
      )}

      {/* Sections list */}
      <div className="space-y-2">
        {sorted.map(section => (
          mode?.editing?.id === section.id ? (
            <SectionForm key={section.id} initial={section}
              onSave={f => { updateExploreSection(section.id, f); setMode(null) }}
              onCancel={() => setMode(null)} />
          ) : (
            <div key={section.id} className="bg-white border border-black/8 flex items-center gap-4 px-5 py-4 group hover:border-black/10 transition-all">
              <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: section.color }}>
                <span className="text-white text-[10px] font-medium" style={{ letterSpacing: '0.1em' }}>
                  {section.label?.slice(0, 3).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-black/90">{section.title}</p>
                  {!section.visible && <EyeOff size={12} className="text-black/25" />}
                </div>
                <p className="text-[10px] text-black/45 mt-0.5">{section.key} · {section.tag} · {section.previewItems?.length || 0} Items</p>
              </div>
              {section.image && (
                <img src={section.image} alt="" className="w-16 h-12 object-cover flex-shrink-0 border border-black/10" />
              )}
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setMode({ editing: section })}
                  className="w-8 h-8 bg-black/5 flex items-center justify-center hover:bg-black/10 border-0">
                  <Pencil size={13} className="text-black/65" />
                </button>
                <button onClick={() => { if (confirm(`"${section.title}" löschen?`)) deleteExploreSection(section.id) }}
                  className="w-8 h-8 bg-red-500/10 flex items-center justify-center hover:bg-red-500/20 border-0">
                  <Trash2 size={13} className="text-red-400" />
                </button>
              </div>
            </div>
          )
        ))}
        {sorted.length === 0 && (
          <div className="text-center py-16 text-black/35 text-sm">Keine Explore-Sektionen</div>
        )}
      </div>
    </div>
  )
}
