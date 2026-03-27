/**
 * HomepageEditor — CMS panel to configure ForYou page section headers
 * Each section has: image URL, label (small caps), title, description, button text, link
 */
import { useState, useEffect } from 'react'
import ImagePicker from '../../components/ImagePicker'
import { apiFetch } from '../../hooks/useApi'

const DEFAULT_SECTIONS = [
  { key: 'hero', label: 'Atelier Kollektion', title: '', description: '', image: '', button: 'Entdecken', link: '' },
  { key: 'featured', label: 'Herren', title: 'Empfohlen für Sie', description: '', image: '', button: 'Kollektion entdecken', link: '/collection' },
  { key: 'editorial', label: '', title: '', description: '', image: '', image2: '', button: '', link: '' },
  { key: 'savoir_faire', label: 'Savoir-Faire', title: 'Handwerkskunst erleben', description: '', image: '', button: 'Entdecken', link: '/explore' },
  { key: 'collection_cta', label: 'Handgefertigt in über 200 Schritten', title: 'Die Kollektion entdecken', description: '', image: '', button: 'Kollektion', link: '/collection' },
  { key: 'favorites', label: 'Herren', title: 'Ihre Favoriten', description: '', image: '', button: 'Alle Favoriten', link: '/wishlist' },
  { key: 'accessories', label: 'Zubehör & Pflege', title: 'Das Beste für Ihre Schuhe', description: '', image: '', button: 'Alle Produkte', link: '/accessories' },
  { key: 'orders', label: 'Bestellungen', title: 'Ihre Bestellungen', description: '', image: '', button: 'Alle anzeigen', link: '/orders' },
  { key: 'journal', label: 'Atelier Journal', title: '', description: '', image: '', button: '', link: '/explore' },
  { key: 'scan', label: '', title: 'Ihr 3D-Fußscan', description: 'Jetzt scannen für perfekte Passform', image: '', button: '', link: '/scan' },
  { key: 'service_1', label: 'Handgefertigt', title: 'Jeder Schuh ein Unikat', description: 'Von Hand gefertigt aus erlesenen Materialien in über 200 Arbeitsschritten.', image: '', button: '', link: '' },
  { key: 'service_2', label: '3D-Fußscan', title: 'Perfekte Passform', description: 'Millimetergenau vermessen für maximalen Komfort und Langlebigkeit.', image: '', button: '', link: '' },
  { key: 'service_3', label: 'Versand', title: 'Kostenlos ab € 500', description: 'Sicher verpackt und versichert direkt zu Ihnen geliefert.', image: '', button: '', link: '' },
]

const SECTION_LABELS = {
  hero: 'Hero-Banner',
  featured: 'Empfohlene Produkte',
  editorial: 'Editorial Split (2 Spalten)',
  savoir_faire: 'Savoir-Faire / Handwerk',
  collection_cta: 'Kollektion CTA',
  favorites: 'Favoriten',
  accessories: 'Zubehör & Pflege',
  orders: 'Bestellungen',
  journal: 'Journal / Artikel',
  scan: '3D-Fußscan (Native)',
  service_1: 'Service-Versprechen 1',
  service_2: 'Service-Versprechen 2',
  service_3: 'Service-Versprechen 3',
}

// Fields to show per section type
const FIELDS = {
  hero:           ['image', 'label', 'title', 'button'],
  featured:       ['image', 'label', 'title', 'button', 'link'],
  editorial:      ['image', 'image2'],
  savoir_faire:   ['image', 'label', 'title', 'button', 'link'],
  collection_cta: ['image', 'label', 'title', 'button', 'link'],
  favorites:      ['label', 'title', 'button', 'link'],
  accessories:    ['image', 'label', 'title', 'button', 'link'],
  orders:         ['label', 'title', 'button', 'link'],
  journal:        ['label', 'title'],
  scan:           ['title', 'description'],
  service_1:      ['label', 'title', 'description'],
  service_2:      ['label', 'title', 'description'],
  service_3:      ['label', 'title', 'description'],
}

const inputCls = 'w-full h-10 px-0 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15'
const labelCls = 'text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light'

const FIELD_LABELS = {
  image: 'Bild-URL',
  image2: 'Bild-URL (rechts)',
  label: 'Label (Kleintext)',
  title: 'Titel',
  description: 'Beschreibung',
  button: 'Button-Text',
  link: 'Link / Pfad',
}

export default function HomepageEditor() {
  const [sections, setSections] = useState(DEFAULT_SECTIONS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    apiFetch('/api/settings/homepage')
      .then(data => { if (data) setSections(mergeSections(data)) })
      .catch(() => {})
  }, [])

  function mergeSections(saved) {
    return DEFAULT_SECTIONS.map(def => {
      const s = saved.find(x => x.key === def.key)
      return s ? { ...def, ...s } : def
    })
  }

  const update = (key, field, value) => {
    setSections(prev => prev.map(s => s.key === key ? { ...s, [field]: value } : s))
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await apiFetch('/api/settings/homepage', {
        method: 'PUT',
        body: JSON.stringify({ sections }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {}
    setSaving(false)
  }

  return (
    <div className="px-10 py-10 lg:px-14 lg:py-12 max-w-3xl">
      <div className="mb-10">
        <p className="text-[9px] text-black/20 uppercase tracking-[0.3em] mb-3 font-light">Inhalte</p>
        <h1 className="text-[28px] font-extralight text-black/85 tracking-tight">Homepage-Sektionen</h1>
        <p className="text-[13px] text-black/30 mt-2 font-light">Alle Texte und Bilder der „Für dich"-Seite anpassen.</p>
      </div>

      <div className="space-y-8">
        {sections.map(section => {
          const fields = FIELDS[section.key] || ['image', 'label', 'title', 'description', 'button', 'link']
          const hasImage = fields.includes('image')
          const hasImage2 = fields.includes('image2')

          return (
            <div key={section.key} className="bg-white p-7">
              <p className="text-[9px] text-black/25 uppercase tracking-[0.25em] mb-5 font-light">
                {SECTION_LABELS[section.key] || section.key}
              </p>

              <div className="space-y-4">
                {/* Image previews */}
                {hasImage && (
                  <ImagePicker
                    value={section.image}
                    onChange={val => update(section.key, 'image', val)}
                    label="Bild"
                  />
                )}
                {hasImage2 && (
                  <ImagePicker
                    value={section.image2 || ''}
                    onChange={val => update(section.key, 'image2', val)}
                    label="Bild (rechts)"
                  />
                )}

                {/* Text fields in pairs */}
                {fields.includes('label') && fields.includes('title') && (
                  <div className="flex gap-5">
                    <div className="flex-1">
                      <label className={labelCls}>Label (Kleintext)</label>
                      <input value={section.label} onChange={e => update(section.key, 'label', e.target.value)} className={inputCls} placeholder="Label" />
                    </div>
                    <div className="flex-1">
                      <label className={labelCls}>Titel</label>
                      <input value={section.title} onChange={e => update(section.key, 'title', e.target.value)} className={inputCls} placeholder="Titel" />
                    </div>
                  </div>
                )}
                {fields.includes('title') && !fields.includes('label') && (
                  <div>
                    <label className={labelCls}>Titel</label>
                    <input value={section.title} onChange={e => update(section.key, 'title', e.target.value)} className={inputCls} placeholder="Titel" />
                  </div>
                )}

                {fields.includes('description') && (
                  <div>
                    <label className={labelCls}>Beschreibung</label>
                    <input value={section.description || ''} onChange={e => update(section.key, 'description', e.target.value)} className={inputCls} placeholder="Beschreibung" />
                  </div>
                )}

                {(fields.includes('button') || fields.includes('link')) && (
                  <div className="flex gap-5">
                    {fields.includes('button') && (
                      <div className="flex-1">
                        <label className={labelCls}>Button-Text</label>
                        <input value={section.button} onChange={e => update(section.key, 'button', e.target.value)} className={inputCls} placeholder="Entdecken" />
                      </div>
                    )}
                    {fields.includes('link') && (
                      <div className="flex-1">
                        <label className={labelCls}>Link / Pfad</label>
                        <input value={section.link} onChange={e => update(section.key, 'link', e.target.value)} className={inputCls} placeholder="/collection" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-10 flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-8 h-10 border border-black text-[10px] uppercase tracking-[0.2em] font-light hover:bg-black hover:text-white transition-all disabled:opacity-30"
        >
          {saving ? 'Speichert …' : 'Speichern'}
        </button>
        {saved && <span className="text-[11px] text-black/35 font-light">Gespeichert</span>}
      </div>
    </div>
  )
}
