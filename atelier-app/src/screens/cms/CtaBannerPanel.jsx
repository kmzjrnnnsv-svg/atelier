/**
 * CtaBannerPanel — CMS panel to configure the CTA banner
 */
import { useState, useEffect } from 'react'
import { apiFetch } from '../../hooks/useApi'

const ALL_PAGES = [
  { key: 'explore', label: 'Entdecken' },
  { key: 'collection', label: 'Kollektion' },
  { key: 'accessories', label: 'Zubehör' },
  { key: 'foryou', label: 'Für dich' },
]

export default function CtaBannerPanel() {
  const [form, setForm] = useState({ label: '', title: '', text: '', button: '', link: '', pages: [] })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    apiFetch('/api/settings/cta-banner')
      .then(data => setForm(data))
      .catch(() => {})
  }, [])

  const togglePage = (key) => {
    setForm(f => ({
      ...f,
      pages: f.pages.includes(key) ? f.pages.filter(p => p !== key) : [...f.pages, key]
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await apiFetch('/api/settings/cta-banner', { method: 'PUT', body: JSON.stringify(form) })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {}
    setSaving(false)
  }

  return (
    <div className="p-6 max-w-xl">
      <h2 className="text-lg font-semibold mb-1">CTA-Banner</h2>
      <p className="text-sm text-black/40 mb-6">Konfiguriere den Call-to-Action-Banner am Ende der Seiten.</p>

      <div className="space-y-4">
        <div>
          <label className="text-xs text-black/50 uppercase tracking-wider block mb-1">Überschrift-Label</label>
          <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
            className="w-full h-10 px-3 border border-black/10 text-sm bg-white outline-none focus:border-black/30" placeholder="Persönliche Beratung" />
        </div>
        <div>
          <label className="text-xs text-black/50 uppercase tracking-wider block mb-1">Titel</label>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full h-10 px-3 border border-black/10 text-sm bg-white outline-none focus:border-black/30" placeholder="Besuchen Sie das Atelier" />
        </div>
        <div>
          <label className="text-xs text-black/50 uppercase tracking-wider block mb-1">Text</label>
          <textarea value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
            className="w-full px-3 py-2 border border-black/10 text-sm bg-white outline-none focus:border-black/30 resize-none" rows={3}
            placeholder="Erleben Sie Ihr persönliches Fitting..." />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-black/50 uppercase tracking-wider block mb-1">Button-Text</label>
            <input value={form.button} onChange={e => setForm(f => ({ ...f, button: e.target.value }))}
              className="w-full h-10 px-3 border border-black/10 text-sm bg-white outline-none focus:border-black/30" placeholder="Termin vereinbaren" />
          </div>
          <div className="flex-1">
            <label className="text-xs text-black/50 uppercase tracking-wider block mb-1">Link / Pfad</label>
            <input value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
              className="w-full h-10 px-3 border border-black/10 text-sm bg-white outline-none focus:border-black/30" placeholder="/scan" />
          </div>
        </div>

        <div>
          <label className="text-xs text-black/50 uppercase tracking-wider block mb-2">Anzeigen auf</label>
          <div className="flex flex-wrap gap-2">
            {ALL_PAGES.map(p => (
              <button
                key={p.key}
                onClick={() => togglePage(p.key)}
                className={`px-3 py-1.5 text-xs border transition-all ${
                  form.pages.includes(p.key)
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black/40 border-black/10'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
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
