/**
 * OptionsEditor, Globale Konfigurator-Optionen.
 * Drei Spalten: Gruppen-Liste · Werte der ausgewählten Gruppe · Detail.
 */
import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Check, X, Loader2, Sliders, Star } from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'
import ImagePicker from '../../components/ImagePicker'

const CATEGORIES = ['*', 'OXFORD', 'WHOLECUT', 'DERBY', 'LOAFER', 'MOCCASIN', 'CHELSEA', 'MONK', 'DOUBLE_MONK', 'BOOT', 'SNEAKER']

export default function OptionsEditor() {
  const [groups, setGroups] = useState([])
  const [activeGroupId, setActiveGroupId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingGroup, setEditingGroup] = useState(null)   // null | 'new' | group object
  const [editingOption, setEditingOption] = useState(null) // null | 'new' | option object

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const data = await apiFetch('/api/option-groups')
      setGroups(Array.isArray(data) ? data : [])
      if (data?.length && !activeGroupId) setActiveGroupId(data[0].id)
    } catch (e) { setError(e?.error || 'Laden fehlgeschlagen') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const activeGroup = groups.find(g => g.id === activeGroupId)

  // ── Gruppe speichern ──
  const saveGroup = async (form) => {
    const isNew = !form.id
    try {
      if (isNew) await apiFetch('/api/option-groups', { method: 'POST', body: JSON.stringify(form) })
      else       await apiFetch(`/api/option-groups/${form.id}`, { method: 'PUT', body: JSON.stringify(form) })
      setEditingGroup(null)
      await load()
    } catch (e) { alert(e?.error || 'Fehler') }
  }
  const deleteGroup = async (id) => {
    if (!confirm('Gruppe und alle ihre Werte wirklich löschen?')) return
    await apiFetch(`/api/option-groups/${id}`, { method: 'DELETE' }).catch(e => alert(e?.error || 'Fehler'))
    await load()
  }

  // ── Option speichern ──
  const saveOption = async (form) => {
    const isNew = !form.id
    try {
      const payload = { ...form, group_id: activeGroupId }
      if (isNew) await apiFetch('/api/options', { method: 'POST', body: JSON.stringify(payload) })
      else       await apiFetch(`/api/options/${form.id}`, { method: 'PUT', body: JSON.stringify(payload) })
      setEditingOption(null)
      await load()
    } catch (e) { alert(e?.error || 'Fehler') }
  }
  /**
   * Empfehlung eines Wertes umschalten.
   *
   * Bewusst ohne Formular und ohne Begrenzung auf einen Wert je Gruppe: In
   * einer Gruppe dürfen mehrere empfohlen sein. Bei den Sohlen ist das der
   * Normalfall — zwei taugen fürs Büro, eine fürs Wetter, und alle drei
   * sollen den Hinweis tragen.
   */
  const empfehlungUmschalten = async (v) => {
    try {
      await apiFetch(`/api/options/${v.id}`, {
        method: 'PUT',
        body: JSON.stringify({ recommended: v.recommended ? 0 : 1 }),
      })
      await load()
    } catch (e) { alert(e?.error || 'Fehler') }
  }

  const deleteOption = async (id) => {
    if (!confirm('Wert löschen?')) return
    await apiFetch(`/api/options/${id}`, { method: 'DELETE' }).catch(e => alert(e?.error || 'Fehler'))
    await load()
  }

  if (loading) return <div className="p-10 text-[12px] text-black/40 font-light flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Lade …</div>

  return (
    <div className="min-h-full">
      <div className="mb-8">
        <p className="text-[9px] text-black/20 uppercase tracking-[0.3em] mb-3 font-light">Produkt-Konfig</p>
        <h1 className="text-[28px] font-extralight text-black/85 tracking-tight">Konfigurator-Optionen</h1>
        <p className="text-[13px] text-black/30 mt-2 font-light max-w-2xl">
          Globale Optionen für den Schuh-Konfigurator. Hier einmal pflegen, jede Gruppe und jeder Wert kann
          pro Schuh aktiviert oder mit eigenem Preis überschrieben werden.
        </p>
      </div>

      {error && <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 text-[12px] text-red-700">{error}</div>}

      <div className="grid grid-cols-[260px_1fr] gap-6">
        {/* ── Spalte 1: Gruppen ── */}
        <div className="bg-white border border-black/[0.05]">
          <div className="px-4 py-3 border-b border-black/[0.05] flex items-center justify-between">
            <p className="text-[9px] text-black/30 uppercase tracking-[0.2em] font-light">Gruppen</p>
            <button
              onClick={() => setEditingGroup('new')}
              className="text-black/50 hover:text-black bg-transparent border-0 p-0"
              title="Neue Gruppe"
            >
              <Plus size={14} strokeWidth={1.4} />
            </button>
          </div>
          <ul>
            {groups.map(g => (
              <li key={g.id}>
                <button
                  onClick={() => setActiveGroupId(g.id)}
                  className={`w-full text-left px-4 py-3 flex items-center justify-between border-b border-black/[0.04] transition-colors ${
                    activeGroupId === g.id ? 'bg-black/[0.04]' : 'bg-transparent hover:bg-black/[0.02]'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-[12px] font-light text-black/80 truncate">{g.label}</p>
                    <p className="text-[9px] text-black/30 tracking-wider uppercase mt-0.5">
                      {g.key} · {g.ui_type}{g.required ? ' · Pflicht' : ''} · {g.values?.length || 0} Werte
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Spalte 2: Werte der aktiven Gruppe ── */}
        <div className="bg-white border border-black/[0.05]">
          {activeGroup ? (
            <>
              <div className="px-5 py-4 border-b border-black/[0.05] flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-[9px] text-black/30 uppercase tracking-[0.25em] font-light">Gruppe</p>
                  <h2 className="text-[16px] font-light text-black mt-0.5">{activeGroup.label}</h2>
                  {activeGroup.description && (
                    <p className="text-[11px] text-black/40 mt-1 max-w-md font-light">{activeGroup.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingGroup(activeGroup)}
                    className="flex items-center gap-1.5 px-4 h-9 text-[10px] tracking-[0.18em] uppercase font-light text-black/55 border border-black/15 hover:border-black hover:text-black bg-transparent"
                  >
                    <Pencil size={12} strokeWidth={1.4} /> Gruppe bearbeiten
                  </button>
                  <button
                    onClick={() => deleteGroup(activeGroup.id)}
                    className="flex items-center gap-1.5 px-3 h-9 text-[10px] tracking-[0.18em] uppercase font-light text-red-500/70 hover:text-red-700 border border-red-200/60 bg-transparent"
                  >
                    <Trash2 size={12} strokeWidth={1.4} />
                  </button>
                </div>
              </div>

              {/* Werteliste */}
              <div className="px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[9px] text-black/30 uppercase tracking-[0.2em] font-light">
                    Werte ({activeGroup.values?.length || 0})
                  </p>
                  <button
                    onClick={() => setEditingOption('new')}
                    className="flex items-center gap-1.5 px-4 h-9 text-[10px] tracking-[0.18em] uppercase font-light text-black/55 border border-black/15 hover:border-black hover:text-black bg-transparent"
                  >
                    <Plus size={12} strokeWidth={1.4} /> Neuer Wert
                  </button>
                </div>
                <ul className="space-y-2">
                  {activeGroup.values?.map(v => (
                    <li key={v.id} className="flex items-center gap-3 p-2 border border-black/[0.06] bg-white">
                      <div
                        className="w-12 h-12 flex items-center justify-center overflow-hidden border border-black/[0.04] flex-shrink-0"
                        style={{ backgroundColor: v.color_hex || '#fafaf9' }}
                      >
                        {v.image_data
                          ? <img src={v.image_data} alt="" className="w-full h-full object-cover" />
                          : v.color_hex
                            ? null
                            : <Sliders size={14} strokeWidth={1.2} className="text-black/15" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[12px] font-light text-black/80">{v.label}</p>
                          {v.recommended ? (
                            <span className="text-[9px] uppercase tracking-[0.14em] text-black/45 border border-black/15 px-1.5 py-px">
                              Empfohlen
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[10px] text-black/35 font-light tracking-wider truncate">
                          {v.key}
                          {v.default_price_extra > 0 && ` · +${v.default_price_extra.toFixed(2).replace('.', ',')} €`}
                          {v.applicable_categories && v.applicable_categories !== '*' && ` · ${v.applicable_categories}`}
                          {v.recommended && v.recommendation_reason && ` · ${v.recommendation_reason}`}
                        </p>
                      </div>
                      {/* Direkt in der Liste umschaltbar: Eine Empfehlung
                          betrifft selten einen einzelnen Wert. Über das
                          Formular wären es je Wert vier Klicks — bei fünf
                          Sohlen zwanzig, nur um drei auszuzeichnen. */}
                      <button
                        onClick={() => empfehlungUmschalten(v)}
                        title={v.recommended ? 'Empfehlung zurücknehmen' : 'Als empfohlen auszeichnen'}
                        className="w-7 h-7 flex items-center justify-center hover:bg-black/[0.04] bg-transparent border-0"
                      >
                        <Star
                          size={13}
                          strokeWidth={1.3}
                          className={v.recommended ? 'text-black' : 'text-black/20'}
                          fill={v.recommended ? 'currentColor' : 'none'}
                        />
                      </button>
                      <button onClick={() => setEditingOption(v)} className="w-7 h-7 flex items-center justify-center hover:bg-black/[0.04] bg-transparent border-0">
                        <Pencil size={12} strokeWidth={1.3} className="text-black/30" />
                      </button>
                      <button onClick={() => deleteOption(v.id)} className="w-7 h-7 flex items-center justify-center hover:bg-black/[0.04] bg-transparent border-0">
                        <Trash2 size={12} strokeWidth={1.3} className="text-black/30" />
                      </button>
                    </li>
                  ))}
                  {(!activeGroup.values || activeGroup.values.length === 0) && (
                    <p className="text-[11px] text-black/30 py-4 font-light text-center">Noch keine Werte.</p>
                  )}
                </ul>
              </div>
            </>
          ) : (
            <div className="p-10 text-center text-[12px] text-black/30 font-light">Keine Gruppe ausgewählt.</div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {editingGroup && (
        <GroupForm
          initial={editingGroup === 'new' ? null : editingGroup}
          onSave={saveGroup}
          onCancel={() => setEditingGroup(null)}
        />
      )}
      {editingOption && (
        <OptionForm
          initial={editingOption === 'new' ? null : editingOption}
          onSave={saveOption}
          onCancel={() => setEditingOption(null)}
        />
      )}
    </div>
  )
}

// ── Gruppen-Formular ────────────────────────────────────────────────────────
function GroupForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || {
    key: '', label: '', description: '', ui_type: 'single', required: 1, sort_order: 0,
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const valid = form.key && form.label

  return (
    <Modal title={initial ? 'Gruppe bearbeiten' : 'Neue Gruppe'} onClose={onCancel}>
      <Field label="Key (technisch)" value={form.key} onChange={v => set('key', v)} placeholder="z. B. last" disabled={!!initial} />
      <Field label="Anzeige-Name"   value={form.label} onChange={v => set('label', v)} placeholder="z. B. Leisten" />
      <Field label="Beschreibung"   value={form.description} onChange={v => set('description', v)} placeholder="Kurze Erläuterung" />
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <Label>UI-Typ</Label>
          <select value={form.ui_type} onChange={e => set('ui_type', e.target.value)} className="w-full h-10 px-2 border-b border-black/[0.1] text-[13px] bg-transparent outline-none font-light">
            <option value="single">Einzelauswahl (Radio)</option>
            <option value="toggle">Ja / Nein</option>
            <option value="multi">Mehrfachauswahl</option>
          </select>
        </div>
        <div>
          <Label>Pflicht?</Label>
          <select value={form.required ? '1' : '0'} onChange={e => set('required', e.target.value === '1' ? 1 : 0)} className="w-full h-10 px-2 border-b border-black/[0.1] text-[13px] bg-transparent outline-none font-light">
            <option value="1">Ja</option>
            <option value="0">Nein</option>
          </select>
        </div>
        <div>
          <Label>Reihenfolge</Label>
          <input type="number" value={form.sort_order} onChange={e => set('sort_order', parseInt(e.target.value) || 0)} className="w-full h-10 px-2 border-b border-black/[0.1] text-[13px] bg-transparent outline-none font-light" />
        </div>
      </div>
      <ModalActions onCancel={onCancel} onSave={() => onSave(form)} valid={valid} />
    </Modal>
  )
}

// ── Optionen-Formular ───────────────────────────────────────────────────────
function OptionForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || {
    key: '', label: '', description: '', image_data: '', color_hex: '', icon: '',
    default_price_extra: 0, applicable_categories: '*', sort_order: 0,
    recommended: 0, recommendation_reason: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const valid = form.key && form.label

  // Multi-Select-Kategorien als Toggle-Chips
  const activeCats = form.applicable_categories === '*'
    ? ['*']
    : form.applicable_categories.split(',').map(s => s.trim()).filter(Boolean)
  const toggleCat = (c) => {
    if (c === '*') return set('applicable_categories', '*')
    const without = activeCats.filter(x => x !== '*' && x !== c)
    if (activeCats.includes(c)) {
      set('applicable_categories', without.length ? without.join(',') : '*')
    } else {
      set('applicable_categories', [...without, c].join(','))
    }
  }

  return (
    <Modal title={initial ? 'Wert bearbeiten' : 'Neuer Wert'} onClose={onCancel} wide>
      <div className="grid grid-cols-2 gap-5">
        <Field label="Key (technisch)" value={form.key} onChange={v => set('key', v)} placeholder="z. B. zurigo" disabled={!!initial} />
        <Field label="Anzeige-Name"    value={form.label} onChange={v => set('label', v)} placeholder="z. B. Zurigo" />
      </div>
      <Field label="Beschreibung" value={form.description} onChange={v => set('description', v)} placeholder="Kurze Erläuterung für Tooltip" />
      <ImagePicker label="Bild" value={form.image_data || ''} onChange={v => set('image_data', v)} />
      <div className="grid grid-cols-2 gap-5 mt-4">
        <div>
          <Label>Farbe (Hex)</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={form.color_hex || '#000000'}
              onChange={e => set('color_hex', e.target.value)}
              className="w-10 h-10 border border-black/10 bg-transparent cursor-pointer p-0"
            />
            <input
              value={form.color_hex || ''}
              onChange={e => set('color_hex', e.target.value)}
              placeholder="z. B. #5b3a1d (für Farb-Picker)"
              className="flex-1 h-10 px-2 border-b border-black/[0.1] text-[13px] bg-transparent outline-none font-mono font-light"
            />
            {form.color_hex && (
              <button type="button" onClick={() => set('color_hex', '')} className="text-[10px] text-black/30 hover:text-red-600 bg-transparent border-0 px-2">
                ✕
              </button>
            )}
          </div>
          <p className="text-[10px] text-black/35 mt-1 font-light">Optional, zeigt Farb-Vorschau statt Buchstaben.</p>
        </div>
        <div>
          <Label>Icon (Lucide-Name)</Label>
          <input
            value={form.icon || ''}
            onChange={e => set('icon', e.target.value)}
            placeholder="z. B. Footprints, Layers, Palette"
            className="w-full h-10 px-2 border-b border-black/[0.1] text-[13px] bg-transparent outline-none font-light"
          />
          <p className="text-[10px] text-black/35 mt-1 font-light">Optional, siehe lucide.dev/icons.</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-5 mt-4">
        <div>
          <Label>Aufpreis (€)</Label>
          <input type="number" step="0.01" value={form.default_price_extra} onChange={e => set('default_price_extra', parseFloat(e.target.value) || 0)} className="w-full h-10 px-2 border-b border-black/[0.1] text-[13px] bg-transparent outline-none font-light" />
        </div>
        <div>
          <Label>Reihenfolge</Label>
          <input type="number" value={form.sort_order} onChange={e => set('sort_order', parseInt(e.target.value) || 0)} className="w-full h-10 px-2 border-b border-black/[0.1] text-[13px] bg-transparent outline-none font-light" />
        </div>
      </div>
      {/* Empfehlung. Mehrere Werte einer Gruppe dürfen sie tragen — der
          Kunde soll eine Vorauswahl sehen, keine Vorschrift. */}
      <div className="mt-5">
        <Label>Empfehlung</Label>
        <button
          type="button"
          onClick={() => set('recommended', form.recommended ? 0 : 1)}
          className={`flex items-center gap-2 h-10 px-3 border text-[12px] font-light transition-colors ${
            form.recommended ? 'bg-black text-white border-black' : 'bg-transparent text-black/50 border-black/15 hover:border-black/40'
          }`}
        >
          <Star size={13} strokeWidth={1.4} fill={form.recommended ? 'currentColor' : 'none'} />
          {form.recommended ? 'Wird als empfohlen gezeigt' : 'Nicht empfohlen'}
        </button>
        {!!form.recommended && (
          <div className="mt-3">
            <Label>Warum (erscheint beim Kunden)</Label>
            <input
              value={form.recommendation_reason || ''}
              onChange={e => set('recommendation_reason', e.target.value)}
              placeholder="z. B. Unsere Wahl für den Alltag"
              className="w-full h-10 px-2 border-b border-black/[0.1] text-[13px] bg-transparent outline-none font-light"
            />
          </div>
        )}
      </div>
      <div className="mt-5">
        <Label>Gilt für Kategorien (* = alle)</Label>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {CATEGORIES.map(c => {
            const on = activeCats.includes(c)
            return (
              <button key={c} type="button" onClick={() => toggleCat(c)} className={`px-2.5 py-1 text-[10px] tracking-wider transition-all border ${on ? 'bg-black text-white border-black' : 'border-black/10 text-black/45 hover:border-black/30 bg-transparent'}`}>
                {c}
              </button>
            )
          })}
        </div>
      </div>
      <ModalActions onCancel={onCancel} onSave={() => onSave(form)} valid={valid} />
    </Modal>
  )
}

// ── Building blocks ─────────────────────────────────────────────────────────
function Modal({ title, onClose, wide, children }) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">
      <div className={`bg-white w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[92dvh] overflow-y-auto`}>
        <div className="px-5 py-4 border-b border-black/[0.05] flex items-center justify-between">
          <p className="text-[12px] tracking-[0.18em] uppercase font-light text-black/70">{title}</p>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-black/50 bg-transparent border-0">
            <X size={16} strokeWidth={1.4} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
function ModalActions({ onSave, onCancel, valid }) {
  return (
    <div className="flex gap-3 mt-6">
      <button onClick={onCancel} className="flex-1 h-11 text-[10px] tracking-[0.18em] uppercase font-light text-black/40 border border-black/15 bg-transparent hover:border-black hover:text-black">Abbrechen</button>
      <button onClick={onSave} disabled={!valid} className={`flex-[2] h-11 text-[10px] tracking-[0.18em] uppercase font-light border-0 flex items-center justify-center gap-1.5 ${valid ? 'bg-black text-white' : 'bg-black/20 text-white cursor-not-allowed'}`}>
        <Check size={13} strokeWidth={1.4} /> Speichern
      </button>
    </div>
  )
}
function Field({ label, value, onChange, placeholder, disabled }) {
  return (
    <label className="block mb-4">
      <Label>{label}</Label>
      <input
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full h-10 px-2 border-b border-black/[0.1] text-[13px] bg-transparent outline-none focus:border-black/40 font-light disabled:opacity-50"
      />
    </label>
  )
}
function Label({ children }) {
  return <span className="text-[10px] text-black/35 uppercase tracking-[0.18em] font-light mb-1.5 block">{children}</span>
}
