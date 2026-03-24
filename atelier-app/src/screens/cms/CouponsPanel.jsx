import { useState, useEffect } from 'react'
import { Ticket, Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'

const TYPES = [
  { key: 'percentage', label: 'Prozent-Rabatt' },
  { key: 'fixed', label: 'Festbetrag' },
  { key: 'free_shipping', label: 'Gratis Versand' },
  { key: 'free_accessory', label: 'Gratis Zubehör' },
]

const ACCESSORIES = [
  { id: 'shoetrees', name: 'Zedernholz Schuhspanner' },
  { id: 'carekit', name: 'Lederpflege-Set' },
  { id: 'dustbag', name: 'Samtbeutel' },
  { id: 'shoehorn', name: 'Messing-Schuhlöffel' },
  { id: 'belt', name: 'Passendes Ledergürtel' },
]

const empty = { code: '', type: 'percentage', value: 0, free_accessory_id: '', min_order_value: '', max_uses: '', single_use: false, expires_at: '' }

const typeLabel = (t) => TYPES.find(x => x.key === t)?.label || t

export default function CouponsPanel() {
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty)

  const load = async () => {
    try {
      const data = await apiFetch('/api/coupons')
      setCoupons(data)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const startEdit = (c) => {
    setEditing(c ? c.id : 'new')
    setForm(c ? {
      code: c.code, type: c.type, value: c.value,
      free_accessory_id: c.free_accessory_id || '',
      min_order_value: c.min_order_value ?? '',
      max_uses: c.max_uses ?? '',
      single_use: !!c.single_use,
      expires_at: c.expires_at ? c.expires_at.slice(0, 10) : '',
    } : { ...empty })
  }

  const save = async () => {
    try {
      const payload = {
        ...form,
        value: parseFloat(form.value) || 0,
        min_order_value: form.min_order_value === '' ? null : parseFloat(form.min_order_value),
        max_uses: form.max_uses === '' ? null : parseInt(form.max_uses),
        expires_at: form.expires_at || null,
        free_accessory_id: form.type === 'free_accessory' ? form.free_accessory_id : null,
      }
      if (editing === 'new') {
        await apiFetch('/api/coupons', { method: 'POST', body: JSON.stringify(payload) })
      } else {
        await apiFetch(`/api/coupons/${editing}`, { method: 'PUT', body: JSON.stringify(payload) })
      }
      setEditing(null)
      load()
    } catch (e) { alert(e?.error || 'Fehler') }
  }

  const remove = async (id) => {
    if (!confirm('Gutschein deaktivieren?')) return
    await apiFetch(`/api/coupons/${id}`, { method: 'DELETE' })
    load()
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const now = new Date().toISOString()
  const filtered = coupons.filter(c => {
    if (filter === 'active') return c.is_active && (!c.expires_at || c.expires_at > now)
    if (filter === 'expired') return !c.is_active || (c.expires_at && c.expires_at <= now)
    return true
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Ticket size={18} strokeWidth={1.5} className="text-black/35" />
            <h1 className="text-xl font-bold text-black/85" style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>Gutscheine</h1>
          </div>
          <p className="text-black/45 text-sm">Gutschein-Codes erstellen und verwalten</p>
        </div>
        <button
          onClick={() => startEdit(null)}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white text-xs border-0 hover:bg-black/85"
          style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}
        >
          <Plus size={13} /> Neuer Gutschein
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5">
        {['all', 'active', 'expired'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-[10px] px-3 py-1.5 border-0 transition-colors ${filter === f ? 'bg-black text-white' : 'bg-black/5 text-black/40 hover:bg-black/10'}`}
            style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}
          >
            {f === 'all' ? 'Alle' : f === 'active' ? 'Aktiv' : 'Abgelaufen'}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-black/15 border-t-black animate-spin-custom" />
        </div>
      )}

      {!loading && (
        <div className="space-y-3">
          {/* New/Edit form */}
          {editing === 'new' && (
            <FormBlock form={form} set={set} onSave={save} onCancel={() => setEditing(null)} title="Neuer Gutschein" />
          )}

          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-2 bg-[#f6f5f3]">
            {['Code', 'Typ', 'Wert', 'Nutzungen', 'Ablauf', 'Aktionen'].map(h => (
              <p key={h} className="text-[10px] font-medium text-black/30 uppercase tracking-wider">{h}</p>
            ))}
          </div>

          {filtered.map(c => {
            const expired = c.expires_at && c.expires_at <= now
            const active = c.is_active && !expired

            if (editing === c.id) {
              return <FormBlock key={c.id} form={form} set={set} onSave={save} onCancel={() => setEditing(null)} title="Bearbeiten" />
            }

            return (
              <div key={c.id} className={`grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-3 bg-white border items-center ${active ? 'border-black/6' : 'border-black/4 opacity-50'}`}>
                <div>
                  <span className="text-sm font-mono font-bold text-black/85">{c.code}</span>
                  {c.min_order_value && <span className="text-[9px] text-black/30 ml-2">ab €{c.min_order_value}</span>}
                </div>
                <span className="text-[10px] text-black/50">{typeLabel(c.type)}</span>
                <span className="text-sm text-black/70">
                  {c.type === 'percentage' ? `${c.value}%` :
                   c.type === 'fixed' ? `€${c.value}` :
                   c.type === 'free_shipping' ? '—' :
                   ACCESSORIES.find(a => a.id === c.free_accessory_id)?.name || c.free_accessory_id}
                </span>
                <span className="text-[11px] text-black/50">
                  {c.used_count}{c.max_uses ? `/${c.max_uses}` : ''}
                  {c.single_use ? ' (1×/User)' : ''}
                </span>
                <span className="text-[11px] text-black/40">
                  {c.expires_at ? new Date(c.expires_at).toLocaleDateString('de-DE') : '∞'}
                </span>
                <div className="flex gap-1.5">
                  <button onClick={() => startEdit(c)} className="w-7 h-7 bg-black/4 hover:bg-black/8 flex items-center justify-center border-0">
                    <Pencil size={12} strokeWidth={1.5} className="text-black/40" />
                  </button>
                  <button onClick={() => remove(c.id)} className="w-7 h-7 bg-black/4 hover:bg-black/8 flex items-center justify-center border-0">
                    <Trash2 size={12} strokeWidth={1.5} className="text-black/30" />
                  </button>
                </div>
              </div>
            )
          })}

          {!filtered.length && !editing && (
            <p className="text-center text-black/30 text-sm py-8">Keine Gutscheine vorhanden</p>
          )}
        </div>
      )}
    </div>
  )
}

function FormBlock({ form, set, onSave, onCancel, title }) {
  return (
    <div className="bg-white border border-black/10 p-5 space-y-3">
      <p className="text-[10px] font-semibold text-black/50 uppercase tracking-wider">{title}</p>
      <div className="grid grid-cols-2 gap-3">
        <input value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} placeholder="CODE (z.B. SOMMER20)" className="border border-black/10 px-3 py-2 text-sm font-mono focus:outline-none focus:border-black/30" />
        <select value={form.type} onChange={e => set('type', e.target.value)} className="border border-black/10 px-3 py-2 text-sm focus:outline-none focus:border-black/30 bg-white">
          {TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
        {(form.type === 'percentage' || form.type === 'fixed') && (
          <input type="number" step={form.type === 'percentage' ? '1' : '0.01'} value={form.value} onChange={e => set('value', e.target.value)} placeholder={form.type === 'percentage' ? 'Prozent (z.B. 20)' : 'Betrag in € (z.B. 50)'} className="border border-black/10 px-3 py-2 text-sm focus:outline-none focus:border-black/30" />
        )}
        {form.type === 'free_accessory' && (
          <select value={form.free_accessory_id} onChange={e => set('free_accessory_id', e.target.value)} className="border border-black/10 px-3 py-2 text-sm focus:outline-none focus:border-black/30 bg-white">
            <option value="">Zubehör wählen…</option>
            {ACCESSORIES.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        )}
        <input type="number" step="1" value={form.min_order_value} onChange={e => set('min_order_value', e.target.value)} placeholder="Mindestbestellwert (€)" className="border border-black/10 px-3 py-2 text-sm focus:outline-none focus:border-black/30" />
        <input type="number" step="1" value={form.max_uses} onChange={e => set('max_uses', e.target.value)} placeholder="Max. Nutzungen (leer = ∞)" className="border border-black/10 px-3 py-2 text-sm focus:outline-none focus:border-black/30" />
        <input type="date" value={form.expires_at} onChange={e => set('expires_at', e.target.value)} className="border border-black/10 px-3 py-2 text-sm focus:outline-none focus:border-black/30" />
        <label className="flex items-center gap-2 text-sm text-black/60">
          <input type="checkbox" checked={form.single_use} onChange={e => set('single_use', e.target.checked)} /> Einmalig pro Nutzer
        </label>
      </div>
      <div className="flex gap-2">
        <button onClick={onSave} disabled={!form.code} className="flex items-center gap-1.5 px-4 py-2 bg-black text-white text-xs border-0 disabled:opacity-30"><Check size={12} /> Speichern</button>
        <button onClick={onCancel} className="flex items-center gap-1.5 px-4 py-2 bg-black/5 text-black/50 text-xs border-0"><X size={12} /> Abbrechen</button>
      </div>
    </div>
  )
}
