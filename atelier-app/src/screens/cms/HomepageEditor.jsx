/**
 * HomepageEditor — CMS panel to configure ForYou page section headers
 * Each section has: image URL, label (small caps), title, button text, link
 */
import { useState, useEffect } from 'react'
import { apiFetch } from '../../hooks/useApi'

const DEFAULT_SECTIONS = [
  { key: 'hero', label: 'Atelier Kollektion', title: '', image: '', button: 'Entdecken', link: '' },
  { key: 'featured', label: 'Herren', title: 'Empfohlen für Sie', image: '', button: 'Entdecken Sie die Kollektion', link: '/collection' },
  { key: 'savoir_faire', label: 'Savoir-Faire', title: 'Handwerkskunst erleben', image: '', button: 'Entdecken', link: '/explore' },
  { key: 'collection_cta', label: 'Handgefertigt in über 200 Schritten', title: 'Die Kollektion entdecken', image: '', button: 'Kollektion', link: '/collection' },
  { key: 'favorites', label: 'Herren', title: 'Ihre Favoriten', image: '', button: 'Alle Favoriten anzeigen', link: '/wishlist' },
  { key: 'accessories', label: 'Zubehör & Pflege', title: 'Das Beste für Ihre Schuhe', image: '', button: 'Alle Produkte', link: '/accessories' },
  { key: 'journal', label: 'Atelier Journal', title: '', image: '', button: '', link: '/explore' },
]

const SECTION_LABELS = {
  hero: 'Hero-Banner',
  featured: 'Empfohlene Produkte',
  savoir_faire: 'Savoir-Faire / Handwerk',
  collection_cta: 'Kollektion CTA',
  favorites: 'Favoriten',
  accessories: 'Zubehör & Pflege',
  journal: 'Journal / Artikel',
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

  // Merge saved data with defaults to ensure all keys exist
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
        <p className="text-[13px] text-black/30 mt-2 font-light">Bilder und Texte der Sektionen auf der „Für dich"-Seite anpassen.</p>
      </div>

      <div className="space-y-8">
        {sections.map(section => (
          <div key={section.key} className="bg-white p-7">
            <p className="text-[9px] text-black/25 uppercase tracking-[0.25em] mb-5 font-light">
              {SECTION_LABELS[section.key] || section.key}
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Bild-URL</label>
                <input
                  value={section.image}
                  onChange={e => update(section.key, 'image', e.target.value)}
                  className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15"
                  placeholder="https://images.unsplash.com/..."
                />
                {section.image && (
                  <div className="mt-3 w-full overflow-hidden bg-[#f6f5f3]" style={{ aspectRatio: '16 / 5', maxHeight: 120 }}>
                    <img src={section.image} alt="" className="w-full h-full object-cover" onError={e => e.target.style.display = 'none'} />
                  </div>
                )}
              </div>

              <div className="flex gap-5">
                <div className="flex-1">
                  <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Label (Kleintext)</label>
                  <input
                    value={section.label}
                    onChange={e => update(section.key, 'label', e.target.value)}
                    className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15"
                    placeholder="Herren"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Titel</label>
                  <input
                    value={section.title}
                    onChange={e => update(section.key, 'title', e.target.value)}
                    className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15"
                    placeholder="Empfohlen für Sie"
                  />
                </div>
              </div>

              <div className="flex gap-5">
                <div className="flex-1">
                  <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Button-Text</label>
                  <input
                    value={section.button}
                    onChange={e => update(section.key, 'button', e.target.value)}
                    className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15"
                    placeholder="Entdecken"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Link / Pfad</label>
                  <input
                    value={section.link}
                    onChange={e => update(section.key, 'link', e.target.value)}
                    className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15"
                    placeholder="/collection"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-8 px-8 h-11 border border-black text-black text-[11px] bg-transparent hover:bg-black hover:text-white transition-all duration-300 disabled:opacity-30 uppercase tracking-[0.2em] font-light"
      >
        {saving ? 'Speichern...' : saved ? 'Gespeichert' : 'Speichern'}
      </button>
    </div>
  )
}
