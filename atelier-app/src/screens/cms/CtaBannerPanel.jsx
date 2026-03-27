/**
 * CtaBannerPanel — CMS panel to configure the CTA banner
 */
import { useState, useEffect } from 'react'
import { apiFetch } from '../../hooks/useApi'

const ALL_PAGES = [
  { key: 'explore', label: 'Entdecken' },
  { key: 'collection', label: 'Kollektion' },
  { key: 'accessories', label: 'Zubeh\u00f6r' },
  { key: 'foryou', label: 'F\u00fcr dich' },
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
    <div className="px-10 py-10 lg:px-14 lg:py-12 max-w-xl">
      <p className="text-[9px] text-black/20 uppercase tracking-[0.3em] mb-3 font-light">Marketing</p>
      <h2 className="text-[28px] font-extralight text-black/85 tracking-tight">CTA-Banner</h2>
      <p className="text-[13px] text-black/30 mt-2 font-light mb-10">Konfiguriere den Call-to-Action-Banner am Ende der Seiten.</p>

      <div className="bg-white p-7 mb-6">
        <div className="space-y-5">
          <div>
            <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">{'\u00dc'}berschrift-Label</label>
            <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15" placeholder="Pers\u00f6nliche Beratung" />
          </div>
          <div>
            <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Titel</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15" placeholder="Besuchen Sie das Atelier" />
          </div>
          <div>
            <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Text</label>
            <textarea value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
              className="w-full px-4 py-3 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15 resize-y" rows={3}
              placeholder="Erleben Sie Ihr pers\u00f6nliches Fitting..." />
          </div>
          <div className="flex gap-5">
            <div className="flex-1">
              <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Button-Text</label>
              <input value={form.button} onChange={e => setForm(f => ({ ...f, button: e.target.value }))}
                className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15" placeholder="Termin vereinbaren" />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Link / Pfad</label>
              <input value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
                className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15" placeholder="/scan" />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-3 font-light">Anzeigen auf</label>
            <div className="flex flex-wrap gap-2">
              {ALL_PAGES.map(p => (
                <button
                  key={p.key}
                  onClick={() => togglePage(p.key)}
                  className={`px-4 h-9 text-[11px] uppercase tracking-[0.15em] font-light transition-all duration-300 ${
                    form.pages.includes(p.key)
                      ? 'bg-black text-white border border-black'
                      : 'bg-transparent text-black/30 border border-black/10 hover:border-black/30 hover:text-black/60'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-8 h-11 border border-black text-black text-[11px] bg-transparent hover:bg-black hover:text-white transition-all duration-300 uppercase tracking-[0.2em] font-light disabled:opacity-30"
      >
        {saving ? 'Speichern...' : saved ? 'Gespeichert' : 'Speichern'}
      </button>
    </div>
  )
}
