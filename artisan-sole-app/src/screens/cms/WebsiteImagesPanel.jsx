/**
 * WebsiteImagesPanel, Zentrale Stelle für alle Website-Bilder
 * (kein Produktbild, keine Schuh-Variant-Bilder).
 *
 * Aggregiert alle benannten Bild-Slots der öffentlichen Seiten:
 * Homepage-Sektionen, CTA-Banner, Footer-Help, Explore-Hero & Journal.
 * Lese-/Schreibvorgänge gehen direkt auf die bestehenden Settings-
 * Endpoints, keine Doppel-Datenhaltung.
 */
import { useState, useEffect } from 'react'
import { Loader2, Save, Check } from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'
import ImagePicker from '../../components/ImagePicker'

// Beschreibung aller Homepage-Sektionen mit Bildslot
const HOMEPAGE_LABELS = {
  hero:           { label: 'Hero-Banner',          fields: ['image'] },
  featured:       { label: 'Empfohlene Produkte',  fields: ['image'] },
  editorial:      { label: 'Editorial Split',      fields: ['image', 'image2'] },
  savoir_faire:   { label: 'Savoir-Faire',         fields: ['image'] },
  collection_cta: { label: 'Kollektion CTA',       fields: ['image'] },
  accessories:    { label: 'Zubehör & Pflege',     fields: ['image'] },
  scan:           { label: '3D-Fußscan',           fields: ['image'] },
  service_1:      { label: 'Service-Versprechen 1', fields: ['image'] },
  service_2:      { label: 'Service-Versprechen 2', fields: ['image'] },
  service_3:      { label: 'Service-Versprechen 3', fields: ['image'] },
}

const FIELD_LABEL = { image: 'Hauptbild', image2: 'Zweites Bild (rechts)' }

// Kopfbilder der öffentlichen Seiten. Lagen bis dahin fest im Frontend-Code,
// jeder Wechsel brauchte ein Deployment; sie sind jetzt hier austauschbar.
const HERO_LABELS = [
  { key: 'collection',  label: 'Kollektion',        sub: 'Kopf der Modellübersicht' },
  { key: 'explore',     label: 'Entdecken',         sub: 'Kopf der Explore-Seite' },
  { key: 'accessories', label: 'Zubehör & Pflege',  sub: 'Kopf der Zubehörseite' },
  { key: 'profile',     label: 'Profil',            sub: 'Schmaler Streifen über dem Namen' },
  { key: 'help',        label: 'Hilfe & Service',   sub: 'Kopf der Servicesseite' },
  { key: 'business',    label: 'Für Unternehmen',   sub: 'Kopf der B2B-Seite' },
  { key: 'wishlist',    label: 'Wunschliste',       sub: 'Kopf der Merkliste' },
]

// object-position: entscheidet, welcher Ausschnitt beim Zuschnitt stehen bleibt.
const HERO_POSITIONS = [
  { value: 'center', label: 'Mitte' },
  { value: 'top',    label: 'Oben' },
  { value: 'bottom', label: 'Unten' },
  { value: 'left',   label: 'Links' },
  { value: 'right',  label: 'Rechts' },
]

function Section({ title, subtitle, children }) {
  return (
    <div className="mb-12">
      <div className="mb-5">
        <p className="text-[9px] text-black/20 uppercase tracking-[0.3em] mb-1.5 font-light">{subtitle}</p>
        <h2 className="text-[20px] font-extralight text-black/85 tracking-tight">{title}</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {children}
      </div>
    </div>
  )
}

function ImageSlot({ label, sub, value, onChange, position, onPositionChange, tint, onTintChange }) {
  return (
    <div className="bg-white p-5 border border-black/[0.05]">
      <p className="text-[11px] font-light text-black/75 mb-1">{label}</p>
      {sub && <p className="text-[10px] text-black/30 mb-3 font-light">{sub}</p>}
      <ImagePicker label="" value={value || ''} onChange={onChange} />
      {onPositionChange && (
        <label className="block mt-3">
          <span className="block text-[9px] text-black/35 uppercase tracking-[0.2em] mb-1.5">Bildausschnitt</span>
          <select
            value={position || 'center'}
            onChange={e => onPositionChange(e.target.value)}
            className="w-full border border-black/15 px-2.5 py-2 text-[12px] bg-white focus:outline-none focus:border-black/40"
          >
            {HERO_POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </label>
      )}
      {onTintChange && (
        <label className="flex items-start gap-2.5 mt-3 cursor-pointer">
          <input
            type="checkbox"
            checked={!!tint}
            onChange={e => onTintChange(e.target.checked)}
            className="mt-0.5 accent-black"
          />
          <span className="text-[10px] text-black/45 font-light leading-relaxed">
            Freigestellt auf Weiß
            <span className="block text-black/25">
              Legt die Aufnahme auf den greigen Grund der Seite. Nur für Produktfotos
              vor weißem Hintergrund, nicht für Lifestyle-Bilder.
            </span>
          </span>
        </label>
      )}
    </div>
  )
}

export default function WebsiteImagesPanel() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [savedAt, setSavedAt] = useState(0)
  const [error, setError]     = useState(null)

  // Geladene Daten der vier Settings-Bereiche
  const [homepage, setHomepage] = useState([])  // Array von Section-Objekten
  const [footer,   setFooter]   = useState({})  // Objekt
  const [cta,      setCta]      = useState({})  // Objekt
  const [explore,  setExplore]  = useState({})  // { hero_image, journal_cta_image, ... }

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [hp, ft, ctaCfg, exp] = await Promise.all([
          apiFetch('/api/settings/homepage').catch(() => null),
          apiFetch('/api/settings/footer').catch(() => null),
          apiFetch('/api/settings/cta-banner').catch(() => null),
          apiFetch('/api/settings/explore').catch(() => null),
        ])
        if (cancelled) return
        setHomepage(Array.isArray(hp) ? hp : [])
        setFooter(ft || {})
        setCta(ctaCfg || {})
        setExplore(exp || {})
      } catch (e) {
        if (!cancelled) setError(e?.error || 'Laden fehlgeschlagen')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Update-Helper für eine Homepage-Sektion
  const updateHomepageImage = (sectionKey, field, value) => {
    setHomepage(prev => prev.map(s =>
      s.key === sectionKey ? { ...s, [field]: value } : s
    ))
  }

  const saveAll = async () => {
    setSaving(true); setError(null)
    try {
      // Jeder Bereich hat seinen eigenen PUT-Endpoint
      await Promise.all([
        apiFetch('/api/settings/homepage', { method: 'PUT', body: JSON.stringify({ sections: homepage }) }),
        apiFetch('/api/settings/footer',   { method: 'PUT', body: JSON.stringify({ config: footer }) }),
        apiFetch('/api/settings/cta-banner', { method: 'PUT', body: JSON.stringify(cta) }),
        apiFetch('/api/settings/explore',  { method: 'PUT', body: JSON.stringify({ config: explore }) }),
      ])
      setSavedAt(Date.now())
    } catch (e) {
      setError(e?.error || 'Speichern fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="">
        <div className="flex items-center gap-3 text-black/40 text-[12px]">
          <Loader2 size={16} strokeWidth={1.4} className="animate-spin" />
          Lade Bilder …
        </div>
      </div>
    )
  }

  // Sortiere Homepage-Sektionen nach den Labels-Keys (stabile Reihenfolge)
  const orderedHomepage = Object.keys(HOMEPAGE_LABELS)
    .map(k => homepage.find(s => s.key === k))
    .filter(Boolean)

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="text-[9px] text-black/20 uppercase tracking-[0.3em] mb-3 font-light">Inhalte</p>
          <h1 className="text-[28px] font-extralight text-black/85 tracking-tight">Website-Bilder</h1>
          <p className="text-[13px] text-black/30 mt-2 font-light max-w-xl">
            Alle Bilder der öffentlichen Seiten zentral verwalten, Homepage, Footer, CTA-Banner und
            Entdecken. Produktbilder bleiben im jeweiligen Schuh-Editor.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {savedAt > 0 && Date.now() - savedAt < 4000 && (
            <span className="text-[10px] text-green-700 tracking-[0.2em] uppercase flex items-center gap-1.5">
              <Check size={12} strokeWidth={1.6} /> Gespeichert
            </span>
          )}
          <button
            onClick={saveAll}
            disabled={saving}
            className={`flex items-center gap-2 px-7 h-11 border border-black text-black text-[11px] bg-transparent hover:bg-black hover:text-white uppercase tracking-[0.2em] font-light transition-all ${saving ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            {saving
              ? <><Loader2 size={13} strokeWidth={1.25} className="animate-spin" /> Speichert …</>
              : <><Save size={13} strokeWidth={1.25} /> Alle Änderungen speichern</>
            }
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 px-4 py-3 mb-6 text-[12px] text-red-700">{error}</div>
      )}

      {/* Homepage */}
      <Section title="Homepage" subtitle="Startseite (Für dich)">
        {orderedHomepage.map(section => {
          const def = HOMEPAGE_LABELS[section.key]
          if (!def) return null
          return def.fields.map(field => (
            <ImageSlot
              key={`${section.key}.${field}`}
              label={def.label + (def.fields.length > 1 ? `, ${FIELD_LABEL[field] || field}` : '')}
              sub={section.title || section.label || null}
              value={section[field] || ''}
              onChange={val => updateHomepageImage(section.key, field, val)}
            />
          ))
        })}
      </Section>

      {/* Footer hat im Lemaire-Stil kein Banner-Bild mehr, Abschnitt entfällt. */}

      {/* CTA-Banner */}
      <Section title="CTA-Banner" subtitle="Aktions-Banner auf Listenseiten">
        <ImageSlot
          label="Banner-Bild"
          sub={cta.title || 'Besuchen Sie das Atelier'}
          value={cta.image || ''}
          onChange={val => setCta(prev => ({ ...prev, image: val }))}
        />
      </Section>

      {/* Explore / Journal */}
      <Section title="Entdecken" subtitle="Explore-Seite & Journal">
        <ImageSlot
          label="Hero-Bild Entdecken"
          sub={explore.hero_title || 'Savoir-Faire'}
          value={explore.hero_image || ''}
          onChange={val => setExplore(prev => ({ ...prev, hero_image: val }))}
        />
        <ImageSlot
          label="Journal CTA"
          sub="Unten auf der Entdecken-Seite"
          value={explore.journal_cta_image || ''}
          onChange={val => setExplore(prev => ({ ...prev, journal_cta_image: val }))}
        />
      </Section>
    </div>
  )
}
