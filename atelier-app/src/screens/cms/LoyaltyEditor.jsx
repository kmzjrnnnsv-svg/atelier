import { useState } from 'react'
import { Plus, Pencil, Trash2, Check, X, Eye, EyeOff, Award, Crown, Gem, Shield, Star } from 'lucide-react'
import useAtelierStore from '../../store/atelierStore'

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
    <div className="bg-white border border-black/8 p-5 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 flex items-center justify-center" style={{ backgroundColor: form.color }}>
          {(() => { const I = ICON_MAP[form.icon] || Award; return <I size={16} color="white" /> })()}
        </div>
        <h3 className="text-sm font-semibold text-black/65">{isNew ? 'Neuer Tier' : `${form.label} bearbeiten`}</h3>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-black/35 mb-1.5">Key *</label>
          <input value={form.key} onChange={e => s('key', e.target.value)} placeholder="gold"
            className="w-full bg-white border border-black/10 px-3.5 py-2.5 text-sm text-black/90 placeholder-black/20 focus:outline-none focus:border-black/20"
            disabled={!isNew} />
        </div>
        <div>
          <label className="block text-xs font-medium text-black/35 mb-1.5">Label *</label>
          <input value={form.label} onChange={e => s('label', e.target.value)} placeholder="Gold"
            className="w-full bg-white border border-black/10 px-3.5 py-2.5 text-sm text-black/90 placeholder-black/20 focus:outline-none focus:border-black/20" />
        </div>
        <div>
          <label className="block text-xs font-medium text-black/35 mb-1.5">Min. Punkte</label>
          <input type="number" value={form.minPoints} onChange={e => s('minPoints', Number(e.target.value))}
            className="w-full bg-white border border-black/10 px-3.5 py-2.5 text-sm text-black/90 focus:outline-none" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-black/35 mb-1.5">Farbe</label>
          <div className="flex items-center gap-2">
            <input type="color" value={form.color} onChange={e => s('color', e.target.value)}
              className="w-10 h-10 border border-black/15 bg-transparent cursor-pointer" />
            <input value={form.color} onChange={e => s('color', e.target.value)}
              className="flex-1 bg-white border border-black/10 px-2 py-2.5 text-xs text-black/90 font-mono focus:outline-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-black/35 mb-1.5">Icon</label>
          <select value={form.icon} onChange={e => s('icon', e.target.value)}
            className="w-full bg-white border border-black/10 px-3.5 py-2.5 text-sm text-black/90 focus:outline-none">
            {ICON_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-black/35 mb-1.5">Sortierung</label>
          <input type="number" value={form.sortOrder} onChange={e => s('sortOrder', Number(e.target.value))}
            className="w-full bg-white border border-black/10 px-3.5 py-2.5 text-sm text-black/90 focus:outline-none" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-black/35 mb-1.5">Beschreibung</label>
        <textarea value={form.description || ''} onChange={e => s('description', e.target.value)} rows={2}
          placeholder="Beschreibung des Tiers für die App (leer lassen = verborgen bis erreicht)"
          className="w-full bg-white border border-black/10 px-3.5 py-2.5 text-sm text-black/90 placeholder-black/20 focus:outline-none resize-none" />
      </div>

      {/* Benefits */}
      <div>
        <label className="block text-xs font-medium text-black/35 mb-1.5">Vorteile</label>
        <div className="space-y-2">
          {form.benefits.map((b, i) => (
            <div key={i} className="flex gap-2">
              <input value={b} onChange={e => updateBenefit(i, e.target.value)} placeholder={`Vorteil ${i + 1}`}
                className="flex-1 bg-white border border-black/10 px-3.5 py-2 text-sm text-black/90 placeholder-black/20 focus:outline-none" />
              {form.benefits.length > 1 && (
                <button onClick={() => removeBenefit(i)} className="w-8 h-8 bg-red-500/10 flex items-center justify-center border-0 flex-shrink-0 mt-0.5">
                  <X size={12} className="text-red-400" />
                </button>
              )}
            </div>
          ))}
          <button onClick={addBenefit} className="text-[10px] text-black/40 hover:text-black/70 bg-transparent border-0 px-0">+ Vorteil hinzufügen</button>
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.visible} onChange={e => s('visible', e.target.checked)} className="w-4 h-4" />
        <span className="text-xs text-black/60">Sichtbar in der App (deaktiviert = wird erst bei Erreichen angezeigt)</span>
      </label>

      <div className="flex gap-3">
        <button onClick={() => valid && onSave({ ...form, benefits: form.benefits.filter(b => b.trim()) })} disabled={!valid}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium border-0 ${valid ? 'bg-black text-white' : 'bg-black/5 text-black/35 cursor-not-allowed'}`}>
          <Check size={14} /> Speichern
        </button>
        <button onClick={onCancel}
          className="px-4 py-2.5 text-xs font-medium text-black/45 hover:text-black/90 bg-black/5 border-0">
          Abbrechen
        </button>
      </div>
    </div>
  )
}

export default function LoyaltyEditor() {
  const { loyaltyTiers, addLoyaltyTier, updateLoyaltyTier, deleteLoyaltyTier } = useAtelierStore()
  const [mode, setMode] = useState(null)

  const sorted = [...loyaltyTiers].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-black/90 tracking-tight" style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}>Loyalty & Membership</h1>
          <p className="text-black/45 text-sm mt-1">Punkte-System, Tier-Stufen und Vorteile</p>
        </div>
        {!mode && (
          <button onClick={() => setMode('add')}
            className="flex items-center gap-2 bg-black text-white text-xs font-medium px-4 py-2 border-0">
            <Plus size={14} /> Neuer Tier
          </button>
        )}
      </div>

      {/* Info box */}
      <div className="bg-[#f6f5f3] border border-black/5 p-4 mb-6">
        <p className="text-[10px] text-black/40 uppercase tracking-wider font-semibold mb-2">Punkte-System</p>
        <p className="text-xs text-black/55 leading-relaxed">
          Kunden sammeln Punkte durch Bestellungen. Die Tier-Stufe wird automatisch basierend auf der Punktzahl aktualisiert.
          Tiers mit deaktivierter Sichtbarkeit (z.B. Executive) werden erst angezeigt, wenn der Kunde die Stufe erreicht hat.
          Die Beschreibung für verborgene Tiers bleibt leer, bis der Status erreicht ist.
        </p>
      </div>

      {/* Add form */}
      {mode === 'add' && (
        <div className="mb-6">
          <TierForm isNew onSave={t => { addLoyaltyTier(t); setMode(null) }} onCancel={() => setMode(null)} />
        </div>
      )}

      {/* Tiers list */}
      <div className="space-y-2">
        {sorted.map(tier => (
          mode?.editing?.id === tier.id ? (
            <TierForm key={tier.id} initial={tier}
              onSave={t => { updateLoyaltyTier(tier.id, t); setMode(null) }}
              onCancel={() => setMode(null)} />
          ) : (
            <div key={tier.id} className="bg-white border border-black/8 flex items-center gap-4 px-5 py-4 group hover:border-black/10 transition-all">
              <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: tier.color }}>
                {(() => { const I = ICON_MAP[tier.icon] || Award; return <I size={18} color="white" /> })()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-black/90">{tier.label}</p>
                  {!tier.visible && <EyeOff size={12} className="text-black/25" />}
                  <span className="text-[9px] text-black/30 font-mono">{tier.minPoints.toLocaleString()} Pkt.</span>
                </div>
                <p className="text-[10px] text-black/45 mt-0.5 truncate">{tier.benefits?.length || 0} Vorteile · {tier.description ? 'Beschreibung vorhanden' : 'Keine Beschreibung (verborgen)'}</p>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setMode({ editing: tier })}
                  className="w-8 h-8 bg-black/5 flex items-center justify-center hover:bg-black/10 border-0">
                  <Pencil size={13} className="text-black/65" />
                </button>
                <button onClick={() => { if (confirm(`"${tier.label}" löschen?`)) deleteLoyaltyTier(tier.id) }}
                  className="w-8 h-8 bg-red-500/10 flex items-center justify-center hover:bg-red-500/20 border-0">
                  <Trash2 size={13} className="text-red-400" />
                </button>
              </div>
            </div>
          )
        ))}
        {sorted.length === 0 && (
          <div className="text-center py-16 text-black/35 text-sm">Keine Loyalty-Tiers konfiguriert</div>
        )}
      </div>
    </div>
  )
}
