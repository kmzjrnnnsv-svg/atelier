import { useState, useEffect } from 'react'
import { apiFetch } from '../../hooks/useApi'
import { LIEFERUMFANG } from '../../lib/lieferumfang'

// Globale Produktseiten-Texte (für alle Schuhe). Tagline + Beschreibung sind
// dagegen pro Schuh im Schuh-Editor pflegbar.
// Die Texte zur „Qualitäts-Familie" (Aesthetic/Durable) sind hier
// verschwunden, weil der Schritt selbst verschwunden ist: Der Konfigurator
// zeigt alle Lederarten nebeneinander. Was ein Leder auszeichnet, steht am
// Leder — unter „Produkt-Konfiguration → Lederarten → Empfehlungstext".
//
// Bereits gespeicherte Werte bleiben in den Einstellungen liegen und stören
// dort nicht; gelesen werden sie nirgends mehr.
const DEFAULTS = {
  delivery_items: LIEFERUMFANG,
  badges: ['Handgenäht', 'Custom Made', '200+ Schritte'],
}

const lbl = 'text-[10px] uppercase tracking-[0.2em] text-black/30 block mb-1.5 font-light'
const inp = 'w-full px-3 py-2 border border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70'

export default function ProductTextsEditor() {
  const [form, setForm] = useState(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    apiFetch('/api/settings/product-texts')
      .then(cfg => { if (cfg) setForm({ ...DEFAULTS, ...cfg }) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setSaved(false) }
  const setLines = (k, text) => set(k, text.split('\n').map(s => s.trim()).filter(Boolean))

  const save = async () => {
    setSaving(true); setError(null)
    try {
      await apiFetch('/api/settings/product-texts', { method: 'PUT', body: JSON.stringify({ config: form }) })
      setSaved(true)
    } catch (e) { setError(e?.error || 'Speichern fehlgeschlagen') } finally { setSaving(false) }
  }

  if (loading) return <div className="p-8"><div className="w-7 h-7 border-2 border-black/15 border-t-black/60 rounded-full animate-spin-custom" /></div>

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <h1 className="text-[22px] font-extralight text-black tracking-tight mb-1">Produktseite-Texte</h1>
      <p className="text-[12px] text-black/45 font-light mb-7">Global für alle Schuhe. Tagline & Beschreibung je Schuh im Schuh-Editor.</p>

      {error && <div className="bg-red-50 border border-red-200 px-4 py-3 mb-5"><p className="text-xs text-red-600">{error}</p></div>}

      <div className="space-y-6">
        <div>
          <label className={lbl}>Badges (eine pro Zeile)</label>
          <textarea rows={3} className={`${inp} resize-none`} value={(form.badges || []).join('\n')} onChange={e => setLines('badges', e.target.value)} />
        </div>

        <div>
          <label className={lbl}>Lieferumfang (eine Position pro Zeile)</label>
          <textarea rows={4} className={`${inp} resize-none`} value={(form.delivery_items || []).join('\n')} onChange={e => setLines('delivery_items', e.target.value)} />
        </div>

        <button onClick={save} disabled={saving} className="px-8 h-10 border border-black text-black text-[11px] tracking-[0.18em] uppercase font-light hover:bg-black hover:text-white disabled:opacity-40 transition-all">
          {saved ? 'Gespeichert ✓' : (saving ? 'Speichert …' : 'Speichern')}
        </button>
      </div>
    </div>
  )
}
