/**
 * FooterEditor, CMS-Panel für den Lemaire-Style Footer
 * Vier Link-Spalten (Über uns / Hilfe / Social / Rechtliches) +
 * Copyright + Land/Sprache.
 */
import { useState, useEffect } from 'react'
import { apiFetch } from '../../hooks/useApi'

const DEFAULT_CONFIG = {
  about_label: 'Über uns',
  about_links: [
    { label: 'Boutiquen',    path: '/help' },
  ],
  help_label: 'Hilfe',
  help_links: [
    { label: 'Versand & Lieferung', path: '/help' },
    { label: 'Kundenbetreuung',     path: '/help' },
    { label: 'FAQ',                 path: '/help' },
    { label: 'Rückgabeanfrage',     path: '/feedback' },
    { label: 'Rückverfolgbarkeit',  path: '/orders' },
  ],
  social_label: 'Social',
  social_links: [
    { label: 'Instagram', path: 'https://instagram.com' },
    { label: 'Facebook',  path: 'https://facebook.com' },
    { label: 'Pinterest', path: 'https://pinterest.com' },
    { label: 'YouTube',   path: 'https://youtube.com' },
  ],
  legal_label: 'Rechtliches',
  // Nur Typen, die das Backend kennt: agb / datenschutz / impressum.
  legal_links: [
    { label: 'Allgemeine Geschäftsbedingungen', path: '/legal/agb' },
    { label: 'Datenschutzerklärung',           path: '/legal/datenschutz' },
    { label: 'Impressum',                       path: '/legal/impressum' },
  ],
  country: 'Deutschland',
  language: 'Deutsch',
  copyright: 'Artisan Sole',
}

const COLUMNS = [
  { labelKey: 'about_label',  linksKey: 'about_links',  title: 'Über uns' },
  { labelKey: 'help_label',   linksKey: 'help_links',   title: 'Hilfe' },
  { labelKey: 'social_label', linksKey: 'social_links', title: 'Social' },
  { labelKey: 'legal_label',  linksKey: 'legal_links',  title: 'Rechtliches' },
]

export default function FooterEditor() {
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    apiFetch('/api/settings/footer')
      .then(data => { if (data) setConfig({ ...DEFAULT_CONFIG, ...data }) })
      .catch(() => {})
  }, [])

  const set = (field, value) => setConfig(prev => ({ ...prev, [field]: value }))

  const updateLink = (listKey, index, field, value) => {
    setConfig(prev => ({
      ...prev,
      [listKey]: prev[listKey].map((item, i) => i === index ? { ...item, [field]: value } : item),
    }))
  }

  const addLink = (listKey) => {
    setConfig(prev => ({
      ...prev,
      [listKey]: [...prev[listKey], { label: '', path: '/' }],
    }))
  }

  const removeLink = (listKey, index) => {
    setConfig(prev => ({
      ...prev,
      [listKey]: prev[listKey].filter((_, i) => i !== index),
    }))
  }

  const handleSave = async () => {
    setSaving(true); setSaved(false)
    try {
      await apiFetch('/api/settings/footer', {
        method: 'PUT',
        body: JSON.stringify({ config }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {}
    setSaving(false)
  }

  const inputCls = 'w-full border-b border-black/[0.08] h-10 px-0 bg-transparent text-[13px] text-black/70 font-light outline-none focus:border-black/25 transition-colors placeholder-black/15'
  const labelCls = 'text-[10px] font-light text-black/30 uppercase tracking-[0.2em] mb-1'

  return (
    <div className="px-10 py-10 lg:px-14 lg:py-12 max-w-3xl">
      <div className="mb-10">
        <p className="text-[9px] text-black/20 uppercase tracking-[0.3em] mb-3 font-light">Inhalte</p>
        <h1 className="text-[28px] font-extralight text-black/85 tracking-tight">Footer</h1>
        <p className="text-[13px] text-black/30 mt-2 font-light">
          Vier Spalten im Lemaire-Stil. Externe Links beginnen mit „http", interne mit „/".
        </p>
      </div>

      <div className="space-y-8">
        {COLUMNS.map(({ labelKey, linksKey, title }) => (
          <div key={linksKey} className="bg-white p-7">
            <div className="flex items-center justify-between mb-5">
              <p className="text-[9px] text-black/25 uppercase tracking-[0.25em] font-light">{title}</p>
              <input
                value={config[labelKey] || ''}
                onChange={e => set(labelKey, e.target.value)}
                placeholder="Spalten-Überschrift"
                className="text-right text-[11px] text-black/60 bg-transparent border-0 outline-none font-light"
              />
            </div>
            <div className="space-y-3">
              {(config[linksKey] || []).map((link, i) => (
                <div key={i} className="flex items-end gap-3">
                  <div className="flex-1">
                    <p className={labelCls}>Label</p>
                    <input value={link.label} onChange={e => updateLink(linksKey, i, 'label', e.target.value)} className={inputCls} />
                  </div>
                  <div className="flex-1">
                    <p className={labelCls}>Pfad / URL</p>
                    <input value={link.path} onChange={e => updateLink(linksKey, i, 'path', e.target.value)} className={inputCls} />
                  </div>
                  <button
                    onClick={() => removeLink(linksKey, i)}
                    className="text-[10px] text-black/20 hover:text-black/50 transition-colors pb-2 font-light"
                  >
                    Entfernen
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => addLink(linksKey)}
              className="mt-4 text-[10px] text-black/30 hover:text-black/60 transition-colors font-light uppercase tracking-[0.15em]"
            >
              + Link hinzufügen
            </button>
          </div>
        ))}

        {/* Land + Sprache + Copyright */}
        <div className="bg-white p-7">
          <p className="text-[9px] text-black/25 uppercase tracking-[0.25em] mb-5 font-light">Unten rechts & Copyright</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className={labelCls}>Land</p>
              <input value={config.country} onChange={e => set('country', e.target.value)} className={inputCls} />
            </div>
            <div>
              <p className={labelCls}>Sprache</p>
              <input value={config.language} onChange={e => set('language', e.target.value)} className={inputCls} />
            </div>
            <div>
              <p className={labelCls}>Copyright</p>
              <input value={config.copyright} onChange={e => set('copyright', e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>
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
