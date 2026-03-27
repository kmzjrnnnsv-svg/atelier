/**
 * FooterEditor — CMS panel to edit all footer texts
 * Help banner, link columns, newsletter, service section, copyright
 */
import { useState, useEffect } from 'react'
import { apiFetch } from '../../hooks/useApi'

const DEFAULT_CONFIG = {
  // Help banner
  help_label: 'Brauchen Sie Hilfe?',
  help_title: 'Wir sind für Sie da',
  help_text: 'Unser Team hilft Ihnen gerne — persönlich und diskret.',
  help_button: 'Kontakt',
  help_image: '',

  // Contact column
  contact_phone: '+49 123 456 789',
  contact_email: 'service@atelier.de',

  // Shop links
  shop_links: [
    { label: 'Für dich', path: '/foryou' },
    { label: 'Kollektion', path: '/collection' },
    { label: 'Zubehör', path: '/accessories' },
    { label: 'Entdecken', path: '/explore' },
  ],

  // Account links
  account_links: [
    { label: 'Wunschliste', path: '/wishlist' },
    { label: 'Bestellungen', path: '/orders' },
    { label: 'Hilfe & Kontakt', path: '/help' },
    { label: 'Einstellungen', path: '/settings' },
  ],

  // Legal links
  legal_links: [
    { label: 'AGB', path: '/legal/terms' },
    { label: 'Datenschutz', path: '/legal/privacy' },
    { label: 'Impressum', path: '/legal/imprint' },
    { label: 'Widerrufsbelehrung', path: '/legal/withdrawal' },
    { label: 'Versand & Lieferung', path: '/legal/shipping' },
  ],

  // Newsletter
  newsletter_title: 'Newsletter',
  newsletter_text: 'Erhalten Sie als Erster exklusive Neuigkeiten und Angebote.',
  newsletter_placeholder: 'IHRE E-MAIL ADRESSE',

  // Copyright
  copyright: 'Atelier',

  // Explore service section
  service_sections: [
    { label: 'Editorials', title: 'Geschichten hinter der Kollektion', text: 'Inszenierte Lookbooks und fotografische Geschichten rund um jede neue Saison.' },
    { label: 'Handwerk', title: 'Vom Leisten bis zur Naht', text: 'Kurz-Dokumentationen über die Herstellung jedes Modells in über 200 Schritten.' },
    { label: 'Community', title: 'Atelier-Träger weltweit', text: 'Erfahrungen, Kombinationen und Stilinspirationen unserer Community.' },
  ],
}

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

  const updateService = (index, field, value) => {
    setConfig(prev => ({
      ...prev,
      service_sections: prev.service_sections.map((item, i) => i === index ? { ...item, [field]: value } : item),
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
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
        <h1 className="text-[28px] font-extralight text-black/85 tracking-tight">Footer & Service</h1>
        <p className="text-[13px] text-black/30 mt-2 font-light">Alle Texte im Footer und der Service-Sektion bearbeiten.</p>
      </div>

      <div className="space-y-8">

        {/* ── Help Banner ───────────────────────────────────── */}
        <div className="bg-white p-7">
          <p className="text-[9px] text-black/25 uppercase tracking-[0.25em] mb-5 font-light">Hilfe-Banner</p>
          <div className="space-y-4">
            <div>
              <p className={labelCls}>Label</p>
              <input value={config.help_label} onChange={e => set('help_label', e.target.value)} className={inputCls} />
            </div>
            <div>
              <p className={labelCls}>Titel</p>
              <input value={config.help_title} onChange={e => set('help_title', e.target.value)} className={inputCls} />
            </div>
            <div>
              <p className={labelCls}>Text</p>
              <input value={config.help_text} onChange={e => set('help_text', e.target.value)} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className={labelCls}>Button-Text</p>
                <input value={config.help_button} onChange={e => set('help_button', e.target.value)} className={inputCls} />
              </div>
              <div>
                <p className={labelCls}>Bild-URL</p>
                <input value={config.help_image} onChange={e => set('help_image', e.target.value)} className={inputCls} placeholder="https://..." />
              </div>
            </div>
          </div>
        </div>

        {/* ── Contact ───────────────────────────────────────── */}
        <div className="bg-white p-7">
          <p className="text-[9px] text-black/25 uppercase tracking-[0.25em] mb-5 font-light">Kontakt</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className={labelCls}>Telefon</p>
              <input value={config.contact_phone} onChange={e => set('contact_phone', e.target.value)} className={inputCls} />
            </div>
            <div>
              <p className={labelCls}>E-Mail</p>
              <input value={config.contact_email} onChange={e => set('contact_email', e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>

        {/* ── Link Columns ──────────────────────────────────── */}
        {[
          { key: 'shop_links', title: 'Shop-Links' },
          { key: 'account_links', title: 'Konto-Links' },
          { key: 'legal_links', title: 'Rechtliches' },
        ].map(({ key, title }) => (
          <div key={key} className="bg-white p-7">
            <p className="text-[9px] text-black/25 uppercase tracking-[0.25em] mb-5 font-light">{title}</p>
            <div className="space-y-3">
              {config[key].map((link, i) => (
                <div key={i} className="flex items-end gap-3">
                  <div className="flex-1">
                    <p className={labelCls}>Label</p>
                    <input value={link.label} onChange={e => updateLink(key, i, 'label', e.target.value)} className={inputCls} />
                  </div>
                  <div className="flex-1">
                    <p className={labelCls}>Pfad</p>
                    <input value={link.path} onChange={e => updateLink(key, i, 'path', e.target.value)} className={inputCls} />
                  </div>
                  <button
                    onClick={() => removeLink(key, i)}
                    className="text-[10px] text-black/20 hover:text-black/50 transition-colors pb-2 font-light"
                  >
                    Entfernen
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => addLink(key)}
              className="mt-4 text-[10px] text-black/30 hover:text-black/60 transition-colors font-light uppercase tracking-[0.15em]"
            >
              + Link hinzufügen
            </button>
          </div>
        ))}

        {/* ── Newsletter ────────────────────────────────────── */}
        <div className="bg-white p-7">
          <p className="text-[9px] text-black/25 uppercase tracking-[0.25em] mb-5 font-light">Newsletter</p>
          <div className="space-y-4">
            <div>
              <p className={labelCls}>Überschrift</p>
              <input value={config.newsletter_title} onChange={e => set('newsletter_title', e.target.value)} className={inputCls} />
            </div>
            <div>
              <p className={labelCls}>Beschreibung</p>
              <input value={config.newsletter_text} onChange={e => set('newsletter_text', e.target.value)} className={inputCls} />
            </div>
            <div>
              <p className={labelCls}>Platzhalter</p>
              <input value={config.newsletter_placeholder} onChange={e => set('newsletter_placeholder', e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>

        {/* ── Service Sections (Explore page) ───────────────── */}
        <div className="bg-white p-7">
          <p className="text-[9px] text-black/25 uppercase tracking-[0.25em] mb-5 font-light">Service-Sektionen (Explore-Seite)</p>
          <div className="space-y-6">
            {config.service_sections.map((section, i) => (
              <div key={i} className="border-b border-black/[0.04] pb-5 last:border-0 last:pb-0">
                <div className="space-y-3">
                  <div>
                    <p className={labelCls}>Label</p>
                    <input value={section.label} onChange={e => updateService(i, 'label', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <p className={labelCls}>Titel</p>
                    <input value={section.title} onChange={e => updateService(i, 'title', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <p className={labelCls}>Text</p>
                    <input value={section.text} onChange={e => updateService(i, 'text', e.target.value)} className={inputCls} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Copyright ─────────────────────────────────────── */}
        <div className="bg-white p-7">
          <p className="text-[9px] text-black/25 uppercase tracking-[0.25em] mb-5 font-light">Copyright</p>
          <div>
            <p className={labelCls}>Firmenname</p>
            <input value={config.copyright} onChange={e => set('copyright', e.target.value)} className={inputCls} />
          </div>
        </div>
      </div>

      {/* ── Save ──────────────────────────────────────────── */}
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
