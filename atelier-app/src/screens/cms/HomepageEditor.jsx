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
    <div className="p-6 max-w-2xl">
      <h2 className="text-lg font-semibold mb-1">Homepage-Sektionen</h2>
      <p className="text-sm text-black/40 mb-6">Bilder und Texte der Sektionen auf der „Für dich"-Seite anpassen.</p>

      <div className="space-y-6">
        {sections.map(section => (
          <div key={section.key} className="border border-black/[0.08] bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-black/50 mb-4">
              {SECTION_LABELS[section.key] || section.key}
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-black/40 uppercase tracking-wider block mb-1">Bild-URL</label>
                <input
                  value={section.image}
                  onChange={e => update(section.key, 'image', e.target.value)}
                  className="w-full h-9 px-3 border border-black/10 text-xs bg-white outline-none focus:border-black/30"
                  placeholder="https://images.unsplash.com/..."
                />
                {section.image && (
                  <div className="mt-2 w-full overflow-hidden bg-[#f6f5f3]" style={{ aspectRatio: '16 / 5', maxHeight: 120 }}>
                    <img src={section.image} alt="" className="w-full h-full object-cover" onError={e => e.target.style.display = 'none'} />
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] text-black/40 uppercase tracking-wider block mb-1">Label (Kleintext)</label>
                  <input
                    value={section.label}
                    onChange={e => update(section.key, 'label', e.target.value)}
                    className="w-full h-9 px-3 border border-black/10 text-xs bg-white outline-none focus:border-black/30"
                    placeholder="Herren"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-black/40 uppercase tracking-wider block mb-1">Titel</label>
                  <input
                    value={section.title}
                    onChange={e => update(section.key, 'title', e.target.value)}
                    className="w-full h-9 px-3 border border-black/10 text-xs bg-white outline-none focus:border-black/30"
                    placeholder="Empfohlen für Sie"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] text-black/40 uppercase tracking-wider block mb-1">Button-Text</label>
                  <input
                    value={section.button}
                    onChange={e => update(section.key, 'button', e.target.value)}
                    className="w-full h-9 px-3 border border-black/10 text-xs bg-white outline-none focus:border-black/30"
                    placeholder="Entdecken"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-black/40 uppercase tracking-wider block mb-1">Link / Pfad</label>
                  <input
                    value={section.link}
                    onChange={e => update(section.key, 'link', e.target.value)}
                    className="w-full h-9 px-3 border border-black/10 text-xs bg-white outline-none focus:border-black/30"
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
        className="mt-6 px-6 h-10 bg-black text-white text-xs border-0 disabled:opacity-30 uppercase tracking-wider"
      >
        {saving ? 'Speichern...' : saved ? 'Gespeichert!' : 'Speichern'}
      </button>
    </div>
  )
}
