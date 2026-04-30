import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
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
    <div className="px-10 py-10 lg:px-14 lg:py-12">
      <div className="flex items-center justify-between mb-10">
        <div>
          <p className="text-[9px] text-black/20 uppercase tracking-[0.3em] mb-3 font-light">Verwaltung</p>
          <h1 className="text-[28px] font-extralight text-black/85 tracking-tight">Gutscheine</h1>
          <p className="text-[13px] text-black/30 mt-2 font-light">Gutschein-Codes erstellen und verwalten</p>
        </div>
        <button
          onClick={() => startEdit(null)}
          className="flex items-center gap-2 px-6 h-10 border border-black/15 text-black/50 hover:border-black hover:text-black text-[11px] transition-all bg-transparent uppercase tracking-[0.2em] font-light"
        >
          <Plus size={13} strokeWidth={1.25} /> Neuer Gutschein
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-8">
        {['all', 'active', 'expired'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-[10px] px-0 py-1 border-0 border-b transition-all bg-transparent uppercase tracking-[0.2em] font-light ${filter === f ? 'border-b border-black text-black/70' : 'text-black/25 hover:text-black/50'}`}
          >
            {f === 'all' ? 'Alle' : f === 'active' ? 'Aktiv' : 'Abgelaufen'}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-5 h-5 border border-black/10 border-t-black/40 rounded-full animate-spin" />
        </div>
      )}

      {!loading && (
        <div className="space-y-6">
          {/* New/Edit form */}
          {editing === 'new' && (
            <FormBlock form={form} set={set} onSave={save} onCancel={() => setEditing(null)} title="Neuer Gutschein" />
          )}

          {/* Table */}
          <div className="bg-white overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-6 py-4 border-b border-black/[0.04]">
              {['Code', 'Typ', 'Wert', 'Nutzungen', 'Ablauf', 'Aktionen'].map(h => (
                <p key={h} className="text-[9px] text-black/20 uppercase tracking-[0.25em] font-light">{h}</p>
              ))}
            </div>

            {filtered.map(c => {
              const expired = c.expires_at && c.expires_at <= now
              const active = c.is_active && !expired

              if (editing === c.id) {
                return <FormBlock key={c.id} form={form} set={set} onSave={save} onCancel={() => setEditing(null)} title="Bearbeiten" />
              }

              return (
                <div key={c.id} className={`grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-6 py-4 hover:bg-black/[0.01] border-b border-black/[0.04] items-center ${!active ? 'opacity-40' : ''}`}>
                  <div>
                    <span className="text-[13px] font-light tracking-[0.08em] text-black/85">{c.code}</span>
                    {c.min_order_value && <span className="text-[9px] text-black/20 ml-2 font-light">ab {'\u20AC'}{c.min_order_value}</span>}
                  </div>
                  <span className="text-[11px] text-black/35 font-light">{typeLabel(c.type)}</span>
                  <span className="text-[13px] text-black/60 font-light">
                    {c.type === 'percentage' ? `${c.value}%` :
                     c.type === 'fixed' ? `\u20AC${c.value}` :
                     c.type === 'free_shipping' ? '\u2014' :
                     ACCESSORIES.find(a => a.id === c.free_accessory_id)?.name || c.free_accessory_id}
                  </span>
                  <span className="text-[11px] text-black/35 font-light">
                    {c.used_count}{c.max_uses ? `/${c.max_uses}` : ''}
                    {c.single_use ? ' (1\u00D7/User)' : ''}
                  </span>
                  <span className="text-[11px] text-black/30 font-light">
                    {c.expires_at ? new Date(c.expires_at).toLocaleDateString('de-DE') : '\u221E'}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(c)} className="w-7 h-7 flex items-center justify-center hover:bg-black/[0.04] border-0 bg-transparent">
                      <Pencil size={12} strokeWidth={1.25} className="text-black/25" />
                    </button>
                    <button onClick={() => remove(c.id)} className="w-7 h-7 flex items-center justify-center hover:bg-black/[0.04] border-0 bg-transparent">
                      <Trash2 size={12} strokeWidth={1.25} className="text-black/25" />
                    </button>
                  </div>
                </div>
              )
            })}

            {!filtered.length && !editing && (
              <p className="text-center text-black/20 text-[13px] font-light py-12">Keine Gutscheine vorhanden</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function FormBlock({ form, set, onSave, onCancel, title }) {
  return (
    <div className="bg-white p-7">
      <p className="text-[9px] text-black/20 uppercase tracking-[0.3em] mb-5 font-light">{title}</p>
      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Code</label>
          <input value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} placeholder="z.B. SOMMER20" className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 font-light text-black/70 placeholder-black/15" />
        </div>
        <div>
          <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Typ</label>
          <select value={form.type} onChange={e => set('type', e.target.value)} className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 font-light text-black/70">
            {TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </div>
        {(form.type === 'percentage' || form.type === 'fixed') && (
          <div>
            <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Wert</label>
            <input type="number" step={form.type === 'percentage' ? '1' : '0.01'} value={form.value} onChange={e => set('value', e.target.value)} placeholder={form.type === 'percentage' ? 'Prozent (z.B. 20)' : 'Betrag in \u20AC (z.B. 50)'} className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 font-light text-black/70 placeholder-black/15" />
          </div>
        )}
        {form.type === 'free_accessory' && (
          <div>
            <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Zubehor</label>
            <select value={form.free_accessory_id} onChange={e => set('free_accessory_id', e.target.value)} className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 font-light text-black/70">
              <option value="">Zubehor wahlen...</option>
              {ACCESSORIES.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Mindestbestellwert</label>
          <input type="number" step="1" value={form.min_order_value} onChange={e => set('min_order_value', e.target.value)} placeholder="\u20AC" className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 font-light text-black/70 placeholder-black/15" />
        </div>
        <div>
          <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Max. Nutzungen</label>
          <input type="number" step="1" value={form.max_uses} onChange={e => set('max_uses', e.target.value)} placeholder="Leer = unbegrenzt" className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 font-light text-black/70 placeholder-black/15" />
        </div>
        <div>
          <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Ablaufdatum</label>
          <input type="date" value={form.expires_at} onChange={e => set('expires_at', e.target.value)} className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 font-light text-black/70 placeholder-black/15" />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2.5 text-[11px] text-black/40 font-light cursor-pointer">
            <input type="checkbox" checked={form.single_use} onChange={e => set('single_use', e.target.checked)} className="accent-black" /> Einmalig pro Nutzer
          </label>
        </div>
      </div>
      <div className="flex gap-3 mt-7">
        <button onClick={onSave} disabled={!form.code} className="px-8 h-11 border border-black text-black text-[11px] bg-transparent hover:bg-black hover:text-white transition-all uppercase tracking-[0.2em] font-light disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-black flex items-center gap-2">
          <Check size={12} strokeWidth={1.25} /> Speichern
        </button>
        <button onClick={onCancel} className="flex items-center gap-2 px-6 h-10 border border-black/15 text-black/50 hover:border-black hover:text-black text-[11px] transition-all bg-transparent uppercase tracking-[0.2em] font-light">
          <X size={12} strokeWidth={1.25} /> Abbrechen
        </button>
      </div>
    </div>
  )
}
