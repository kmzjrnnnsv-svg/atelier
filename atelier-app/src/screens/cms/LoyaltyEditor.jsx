import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Check, X, Eye, EyeOff, Award, Crown, Gem, Shield, Star, Save, Loader, Timer } from 'lucide-react'
import useAtelierStore from '../../store/atelierStore'
import { apiFetch } from '../../hooks/useApi'

const ICON_MAP = { Award, Crown, Gem, Shield, Star }
const ICON_OPTIONS = Object.keys(ICON_MAP)

const emptyForm = {
  key: '', label: '', minPoints: 0, color: '#000000', icon: 'Award',
  description: '', benefits: [''], visible: true, sortOrder: 0,
}

function TierForm({ initial = emptyForm, onSave, onCancel, isNew }) {
  const [form, setForm] = useState({
    ...initial,
    benefits: initial.benefits?.length ? [...initial.benefits] : [''],
  })
  const s = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const valid = form.key.trim() && form.label.trim()

  const updateBenefit = (i, val) => {
    const b = [...form.benefits]; b[i] = val
    setForm(f => ({ ...f, benefits: b }))
  }
  const addBenefit = () => setForm(f => ({ ...f, benefits: [...f.benefits, ''] }))
  const removeBenefit = (i) => setForm(f => ({ ...f, benefits: f.benefits.filter((_, j) => j !== i) }))

  return (
    <div className="bg-white p-7 space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: form.color }} />
        <h3 className="text-[13px] font-light text-black/60 tracking-wide">{isNew ? 'Neuer Tier' : `${form.label} bearbeiten`}</h3>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div>
          <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Key *</label>
          <input value={form.key} onChange={e => s('key', e.target.value)} placeholder="gold"
            className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 font-light text-black/70 placeholder-black/15"
            disabled={!isNew} />
        </div>
        <div>
          <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Label *</label>
          <input value={form.label} onChange={e => s('label', e.target.value)} placeholder="Gold"
            className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 font-light text-black/70 placeholder-black/15" />
        </div>
        <div>
          <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Min. Punkte</label>
          <input type="number" value={form.minPoints} onChange={e => s('minPoints', Number(e.target.value))}
            className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 font-light text-black/70 placeholder-black/15" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div>
          <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Farbe</label>
          <div className="flex items-center gap-3">
            <input type="color" value={form.color} onChange={e => s('color', e.target.value)}
              className="w-10 h-10 border-0 bg-transparent cursor-pointer" />
            <input value={form.color} onChange={e => s('color', e.target.value)}
              className="flex-1 h-10 px-4 border-b border-black/[0.08] text-[11px] bg-transparent outline-none focus:border-black/25 font-light text-black/70 font-mono" />
          </div>
        </div>
        <div>
          <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Icon</label>
          <select value={form.icon} onChange={e => s('icon', e.target.value)}
            className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 font-light text-black/70">
            {ICON_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Sortierung</label>
          <input type="number" value={form.sortOrder} onChange={e => s('sortOrder', Number(e.target.value))}
            className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 font-light text-black/70 placeholder-black/15" />
        </div>
      </div>

      <div>
        <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Beschreibung</label>
        <textarea value={form.description || ''} onChange={e => s('description', e.target.value)} rows={2}
          placeholder="Beschreibung des Tiers für die App (leer lassen = verborgen bis erreicht)"
          className="w-full px-4 py-3 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 font-light text-black/70 placeholder-black/15 resize-none" />
      </div>

      {/* Benefits */}
      <div>
        <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Vorteile</label>
        <div className="space-y-2">
          {form.benefits.map((b, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input value={b} onChange={e => updateBenefit(i, e.target.value)} placeholder={`Vorteil ${i + 1}`}
                className="flex-1 h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 font-light text-black/70 placeholder-black/15" />
              {form.benefits.length > 1 && (
                <button onClick={() => removeBenefit(i)} className="w-7 h-7 flex items-center justify-center hover:bg-black/[0.04] border-0 bg-transparent flex-shrink-0">
                  <X size={12} strokeWidth={1.25} className="text-black/25" />
                </button>
              )}
            </div>
          ))}
          <button onClick={addBenefit} className="text-[10px] text-black/30 hover:text-black/60 bg-transparent border-0 px-0 font-light tracking-wide">+ Vorteil hinzufügen</button>
        </div>
      </div>

      <label className="flex items-center gap-2.5 cursor-pointer">
        <input type="checkbox" checked={form.visible} onChange={e => s('visible', e.target.checked)} className="w-4 h-4" />
        <span className="text-[12px] text-black/40 font-light">Sichtbar in der App (deaktiviert = wird erst bei Erreichen angezeigt)</span>
      </label>

      <div className="flex gap-3 pt-2">
        <button onClick={() => valid && onSave({ ...form, benefits: form.benefits.filter(b => b.trim()) })} disabled={!valid}
          className="px-8 h-11 border border-black text-black text-[11px] bg-transparent hover:bg-black hover:text-white transition-all uppercase tracking-[0.2em] font-light disabled:opacity-30 flex items-center justify-center gap-2">
          <Check size={13} strokeWidth={1.25} /> Speichern
        </button>
        <button onClick={onCancel}
          className="px-6 h-11 text-[11px] text-black/30 hover:text-black/60 bg-transparent border-0 font-light">
          Abbrechen
        </button>
      </div>
    </div>
  )
}

export default function LoyaltyEditor() {
  const { loyaltyTiers, addLoyaltyTier, updateLoyaltyTier, deleteLoyaltyTier } = useAtelierStore()
  const [mode, setMode] = useState(null)
  const [expiryDays, setExpiryDays] = useState(365)
  const [expirySaving, setExpirySaving] = useState(false)
  const [expiryMsg, setExpiryMsg] = useState(null)
  const [expireResult, setExpireResult] = useState(null)

  useEffect(() => {
    apiFetch('/api/loyalty/settings').then(d => setExpiryDays(d.expiry_days)).catch(() => {})
  }, [])

  async function saveExpiry() {
    setExpirySaving(true)
    setExpiryMsg(null)
    try {
      await apiFetch('/api/loyalty/settings', { method: 'PUT', body: JSON.stringify({ expiry_days: expiryDays }) })
      setExpiryMsg('Gespeichert')
      setTimeout(() => setExpiryMsg(null), 2000)
    } catch { setExpiryMsg('Fehler') }
    finally { setExpirySaving(false) }
  }

  async function runExpire() {
    try {
      const r = await apiFetch('/api/loyalty/expire', { method: 'POST' })
      setExpireResult(r.message)
      setTimeout(() => setExpireResult(null), 4000)
    } catch { setExpireResult('Fehler beim Ausführen') }
  }

  const sorted = [...loyaltyTiers].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div className="px-10 py-10 lg:px-14 lg:py-12">
      <div className="flex items-center justify-between mb-10">
        <div>
          <p className="text-[9px] text-black/20 uppercase tracking-[0.3em] mb-3 font-light">Programme</p>
          <h1 className="text-[28px] font-extralight text-black/85 tracking-tight">Loyalty & Membership</h1>
          <p className="text-[13px] text-black/30 mt-2 font-light">Punkte-System, Tier-Stufen und Vorteile</p>
        </div>
        {!mode && (
          <button onClick={() => setMode('add')}
            className="flex items-center gap-2 px-6 h-10 border border-black/15 text-black/50 hover:border-black hover:text-black text-[11px] bg-transparent uppercase tracking-[0.2em] font-light">
            <Plus size={13} strokeWidth={1.25} /> Neuer Tier
          </button>
        )}
      </div>

      {/* Info box */}
      <div className="bg-white p-7 mb-6">
        <p className="text-[9px] text-black/20 uppercase tracking-[0.3em] mb-3 font-light">Punkte-System</p>
        <p className="text-[13px] text-black/40 leading-relaxed font-light">
          Kunden sammeln Punkte durch Bestellungen (Einkaufswert = Punkte, nur bei gelieferten/behaltenen Bestellungen).
          Punkte verfallen, wenn innerhalb der eingestellten Frist keine neue Bestellung aufgegeben wird —
          außer der Kunde hat bereits Gold-Status oder höher erreicht.
        </p>
      </div>

      {/* Expiry settings */}
      <div className="bg-white p-7 mb-6">
        <div className="flex items-center gap-2.5 mb-5">
          <Timer size={13} strokeWidth={1.25} className="text-black/25" />
          <p className="text-[9px] text-black/20 uppercase tracking-[0.3em] font-light">Punkteverfall</p>
        </div>
        <div className="flex items-end gap-4">
          <div>
            <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Verfall-Frist (Tage)</label>
            <input type="number" value={expiryDays} onChange={e => setExpiryDays(Number(e.target.value))} min={0}
              className="w-32 h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 font-light text-black/70 placeholder-black/15" />
          </div>
          <button onClick={saveExpiry} disabled={expirySaving}
            className="px-8 h-11 border border-black text-black text-[11px] bg-transparent hover:bg-black hover:text-white transition-all uppercase tracking-[0.2em] font-light disabled:opacity-30 flex items-center gap-2">
            {expirySaving ? <Loader size={12} strokeWidth={1.25} className="animate-spin" /> : <Save size={12} strokeWidth={1.25} />} Speichern
          </button>
          <button onClick={runExpire}
            className="flex items-center gap-2 px-6 h-10 border border-black/15 text-black/50 hover:border-black hover:text-black text-[11px] bg-transparent uppercase tracking-[0.2em] font-light">
            Verfall jetzt prüfen
          </button>
          {expiryMsg && <span className="text-[11px] text-black/30 font-light">{expiryMsg}</span>}
          {expireResult && <span className="text-[11px] text-black/30 font-light">{expireResult}</span>}
        </div>
        <p className="text-[11px] text-black/25 mt-3 leading-relaxed font-light">
          0 = Verfall deaktiviert. Punkte verfallen nur für Mitglieder unterhalb des Gold-Status.
        </p>
      </div>

      {/* Add form */}
      {mode === 'add' && (
        <div className="mb-6">
          <TierForm isNew onSave={t => { addLoyaltyTier(t); setMode(null) }} onCancel={() => setMode(null)} />
        </div>
      )}

      {/* Tiers list */}
      <div>
        {sorted.map(tier => (
          mode?.editing?.id === tier.id ? (
            <TierForm key={tier.id} initial={tier}
              onSave={t => { updateLoyaltyTier(tier.id, t); setMode(null) }}
              onCancel={() => setMode(null)} />
          ) : (
            <div key={tier.id} className="bg-white px-6 py-4 group hover:bg-black/[0.01] border-b border-black/[0.04] flex items-center gap-4">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: tier.color }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <p className="text-[13px] font-light text-black/70 tracking-wide">{tier.label}</p>
                  {!tier.visible && <EyeOff size={11} strokeWidth={1.25} className="text-black/20" />}
                  <span className="text-[10px] text-black/25 font-light">{tier.minPoints.toLocaleString()} Pkt.</span>
                </div>
                <p className="text-[11px] text-black/30 mt-0.5 truncate font-light">{tier.benefits?.length || 0} Vorteile · {tier.description ? 'Beschreibung vorhanden' : 'Keine Beschreibung (verborgen)'}</p>
              </div>
              <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setMode({ editing: tier })}
                  className="w-7 h-7 flex items-center justify-center hover:bg-black/[0.04] border-0 bg-transparent">
                  <Pencil size={12} strokeWidth={1.25} className="text-black/25" />
                </button>
                <button onClick={() => { if (confirm(`"${tier.label}" löschen?`)) deleteLoyaltyTier(tier.id) }}
                  className="w-7 h-7 flex items-center justify-center hover:bg-black/[0.04] border-0 bg-transparent">
                  <Trash2 size={12} strokeWidth={1.25} className="text-black/25" />
                </button>
              </div>
            </div>
          )
        ))}
        {sorted.length === 0 && (
          <div className="text-center py-20 text-[13px] text-black/25 font-light">Keine Loyalty-Tiers konfiguriert</div>
        )}
      </div>
    </div>
  )
}
