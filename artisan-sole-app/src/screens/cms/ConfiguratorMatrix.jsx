/**
 * ConfiguratorMatrix, Tabellen-Ansicht analog der User-Excel-Matrix.
 *
 *  Zeilen   = Schuhmodelle
 *  Spalten  = Optionsgruppen (Style, Base, Heel, Accessoires, Sohle Unten,
 *             Sohlen Color, Welt, Buckle, Buckle Farbe, Farbe Innen,
 *             Sohle Farbe Unten, Zehenkappe, Beveled Waist)
 *  Zellen   = aktive Werte für dieses (Schuh, Gruppe), inline editierbar
 *
 *  Click auf Zelle → Popover mit Chip-Multi-Select aller Werte der Gruppe,
 *  vorgefiltert nach Schuh-Kategorie (applicable_categories). Speichern
 *  erfolgt sofort via PUT /api/shoes/:id/options.
 */
import { useState, useEffect, useMemo, useRef } from 'react'
import { Loader2, Check, ChevronDown, RefreshCw, Search } from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'
import useStore from '../../store/store'
import { FESTE_WERTE } from '../../lib/sohlenRegel'

const STAR = '★'

export default function ConfiguratorMatrix() {
  const { shoes } = useStore()
  const [groups, setGroups] = useState([])           // all option_groups + values
  const [perShoe, setPerShoe] = useState({})         // shoeId → { groupKey → [{ option_id, is_default, price_override }] }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeCell, setActiveCell] = useState(null) // { shoeId, groupId }
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const allGroups = await apiFetch('/api/option-groups')
      setGroups(Array.isArray(allGroups) ? allGroups : [])
      // Per-Shoe-Konfig parallel laden (max. parallele Calls = 4)
      const map = {}
      const batchSize = 4
      for (let i = 0; i < shoes.length; i += batchSize) {
        const batch = shoes.slice(i, i + batchSize)
        const results = await Promise.all(
          batch.map(s => apiFetch(`/api/shoes/${s.id}/options`).catch(() => []))
        )
        batch.forEach((s, idx) => {
          const byGroup = {}
          ;(results[idx] || []).forEach(g => {
            byGroup[g.key] = g.values.map(v => ({
              option_id: v.id, is_default: v.is_default, price_override: null,
            }))
          })
          map[s.id] = byGroup
        })
      }
      setPerShoe(map)
    } catch (e) {
      setError(e?.error || 'Laden fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { if (shoes.length) load() }, [shoes.length])

  // Werte für (shoe, group), filtern nach Kategorie
  const valuesForCell = (shoe, group) => {
    const cat = (shoe.category || '').toUpperCase()
    return (group.values || []).filter(v => {
      if (!v.applicable_categories || v.applicable_categories === '*') return true
      return v.applicable_categories.split(',').map(s => s.trim()).includes(cat)
    })
  }

  const cellSelection = (shoeId, groupKey) =>
    perShoe[shoeId]?.[groupKey] || []

  const isSelected = (shoeId, groupKey, optId) =>
    cellSelection(shoeId, groupKey).some(s => s.option_id === optId)

  const isDefault = (shoeId, groupKey, optId) =>
    cellSelection(shoeId, groupKey).find(s => s.option_id === optId)?.is_default

  const toggleOption = (shoeId, group, opt) => {
    setPerShoe(prev => {
      const next = { ...prev }
      const byGroup = { ...(next[shoeId] || {}) }
      const cur = byGroup[group.key] || []
      const exists = cur.some(s => s.option_id === opt.id)
      byGroup[group.key] = exists
        ? cur.filter(s => s.option_id !== opt.id)
        : [...cur, { option_id: opt.id, is_default: cur.length === 0, price_override: null }]
      next[shoeId] = byGroup
      return next
    })
  }

  const setDefault = (shoeId, group, opt) => {
    setPerShoe(prev => {
      const next = { ...prev }
      const byGroup = { ...(next[shoeId] || {}) }
      const cur = byGroup[group.key] || []
      byGroup[group.key] = cur.map(s => ({ ...s, is_default: s.option_id === opt.id }))
      next[shoeId] = byGroup
      return next
    })
  }

  const persistCell = async (shoeId) => {
    // Alle Gruppen dieses Schuhs zu einer flachen Selection-Liste mergen
    const byGroup = perShoe[shoeId] || {}
    const selections = []
    let i = 0
    Object.values(byGroup).forEach(arr =>
      arr.forEach(s => selections.push({ option_id: s.option_id, is_default: s.is_default, sort_order: i++ }))
    )
    try {
      await apiFetch(`/api/shoes/${shoeId}/options`, { method: 'PUT', body: JSON.stringify({ selections }) })
    } catch (e) { alert(e?.error || 'Speichern fehlgeschlagen') }
  }

  const applyTemplate = async (shoeId, category) => {
    if (!category) return
    const rows = await apiFetch(`/api/category-templates/${category}`).catch(() => [])
    setPerShoe(prev => {
      const next = { ...prev }
      const byGroup = {}
      ;(rows || []).forEach(r => {
        const gKey = r.group_key
        if (!byGroup[gKey]) byGroup[gKey] = []
        byGroup[gKey].push({ option_id: r.option_id, is_default: !!r.is_default, price_override: null })
      })
      next[shoeId] = byGroup
      return next
    })
    // Sofort speichern nach Apply
    setTimeout(() => persistCell(shoeId), 0)
  }

  const filteredShoes = useMemo(() => {
    if (!search) return shoes
    const q = search.toLowerCase()
    return shoes.filter(s =>
      s.name.toLowerCase().includes(q) || (s.category || '').toLowerCase().includes(q)
    )
  }, [shoes, search])

  if (loading) {
    return (
      <div className="">
        <div className="flex items-center gap-3 text-black/40 text-[12px]">
          <Loader2 size={14} className="animate-spin" /> Lade Matrix …
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="px-10 pt-10 lg:px-14 lg:pt-12 pb-4">
        <p className="text-[9px] text-black/20 uppercase tracking-[0.3em] mb-3 font-light">Konfigurator</p>
        <h1 className="text-[28px] font-extralight text-black/85 tracking-tight">Modell-Matrix</h1>
        <p className="text-[13px] text-black/30 mt-2 font-light max-w-3xl">
          Eine Zelle = welche Optionen sind für dieses Schuhmodell aktiv. Klicke auf eine Zelle, um Werte
          ein/auszuschalten. Stern = Vorbelegung. „Vorlage anwenden" pro Zeile setzt alle Gruppen auf
          die Defaults der Kategorie.
        </p>
      </div>

      {/* Toolbar */}
      <div className="px-10 lg:px-14 pb-4 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 h-9 border border-black/10 bg-white flex-1 max-w-sm">
          <Search size={13} className="text-black/30" strokeWidth={1.4} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Schuhmodell suchen …"
            className="flex-1 bg-transparent outline-none text-[12px] text-black/70 placeholder-black/25 font-light"
          />
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-4 h-9 border border-black/15 text-[10px] tracking-[0.18em] uppercase font-light text-black/55 hover:border-black hover:text-black bg-transparent"
        >
          <RefreshCw size={12} strokeWidth={1.4} /> Neu laden
        </button>
        {error && <span className="text-[11px] text-red-700">{error}</span>}
      </div>

      {/* Matrix */}
      <div className="px-10 lg:px-14 pb-12 overflow-x-auto">
        <table className="border-collapse text-[11px]" style={{ minWidth: '100%' }}>
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#fafaf9]">
              <th className="sticky left-0 z-20 bg-[#fafaf9] text-left font-light text-[9px] tracking-[0.2em] uppercase text-black/40 px-3 py-3 border border-black/[0.06] min-w-[180px]">Modell</th>
              <th className="text-left font-light text-[9px] tracking-[0.2em] uppercase text-black/40 px-3 py-3 border border-black/[0.06] min-w-[110px]">Kategorie</th>
              {groups.map(g => (
                <th
                  key={g.id}
                  className="text-left font-light text-[9px] tracking-[0.2em] uppercase text-black/40 px-3 py-3 border border-black/[0.06] min-w-[160px]"
                  title={g.helper_text || g.description}
                >
                  {g.label}
                  {/* Festgelegte Gruppen erscheinen im Laden nicht als
                      Schritt. Sie bleiben hier sichtbar, weil sie in der
                      Bestellung stehen — aber ohne diesen Hinweis wundert
                      sich der Redakteur, warum sein Häkchen nirgends
                      auftaucht. */}
                  {g.key in FESTE_WERTE && (
                    <span className="block text-[8px] tracking-[0.14em] text-black/25 normal-case mt-0.5">
                      fest auf {FESTE_WERTE[g.key]} · kein Schritt im Konfigurator
                    </span>
                  )}
                </th>
              ))}
              <th className="text-left font-light text-[9px] tracking-[0.2em] uppercase text-black/40 px-3 py-3 border border-black/[0.06] min-w-[100px]">Aktion</th>
            </tr>
          </thead>
          <tbody>
            {filteredShoes.map(shoe => (
              <tr key={shoe.id} className="hover:bg-black/[0.01]">
                <th className="sticky left-0 z-10 bg-white text-left font-normal px-3 py-2 border border-black/[0.06]">
                  <p className="text-[12px] text-black/80 font-light">{shoe.name}</p>
                  <p className="text-[9px] text-black/30 tracking-wider uppercase mt-0.5">{shoe.material}</p>
                </th>
                <td className="px-3 py-2 border border-black/[0.06] text-[10px] text-black/45 tracking-wider uppercase font-light">
                  {shoe.category}
                </td>
                {groups.map(group => {
                  const allowed = valuesForCell(shoe, group)
                  const selected = (perShoe[shoe.id]?.[group.key] || [])
                    .map(s => allowed.find(v => v.id === s.option_id))
                    .filter(Boolean)
                  const isActive = activeCell?.shoeId === shoe.id && activeCell?.groupId === group.id
                  return (
                    <td
                      key={group.id}
                      className={`px-2 py-1.5 border border-black/[0.06] align-top relative ${isActive ? 'bg-black/[0.04]' : ''}`}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveCell(isActive ? null : { shoeId: shoe.id, groupId: group.id })}
                        className="w-full text-left bg-transparent border-0 p-1 -m-1 hover:bg-black/[0.02] transition-colors"
                      >
                        {selected.length === 0 ? (
                          <span className="text-[10px] text-black/25 font-light italic">leer · klick zum Setzen</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {selected.map(v => {
                              const def = isDefault(shoe.id, group.key, v.id)
                              return (
                                <span
                                  key={v.id}
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] tracking-wider ${
                                    def ? 'bg-black text-white' : 'bg-black/[0.05] text-black/65'
                                  }`}
                                >
                                  {v.color_hex && (
                                    <span className="w-2.5 h-2.5 border border-white/30" style={{ backgroundColor: v.color_hex }} />
                                  )}
                                  {v.label}
                                  {def && <span className="ml-0.5">{STAR}</span>}
                                </span>
                              )
                            })}
                          </div>
                        )}
                      </button>
                      {isActive && (
                        <CellPopover
                          shoeId={shoe.id}
                          group={group}
                          allowed={allowed}
                          isSelected={(optId) => isSelected(shoe.id, group.key, optId)}
                          isDefault={(optId) => isDefault(shoe.id, group.key, optId)}
                          onToggle={(opt) => toggleOption(shoe.id, group, opt)}
                          onSetDefault={(opt) => setDefault(shoe.id, group, opt)}
                          onClose={async () => { await persistCell(shoe.id); setActiveCell(null) }}
                        />
                      )}
                    </td>
                  )
                })}
                <td className="px-3 py-2 border border-black/[0.06]">
                  <button
                    onClick={() => applyTemplate(shoe.id, shoe.category)}
                    className="text-[10px] text-black/55 hover:text-black tracking-[0.15em] uppercase font-light bg-transparent border-0 whitespace-nowrap"
                    title={`Lädt alle Standard-Werte aus der Vorlage ${shoe.category}`}
                  >
                    Vorlage anwenden
                  </button>
                </td>
              </tr>
            ))}
            {filteredShoes.length === 0 && (
              <tr>
                <td colSpan={3 + groups.length} className="text-center py-10 text-[12px] text-black/30 font-light">
                  Kein Schuhmodell entspricht dem Filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Popover-Dialog für eine Zelle ─────────────────────────────────────────
function CellPopover({ group, allowed, isSelected, isDefault, onToggle, onSetDefault, onClose }) {
  const popRef = useRef(null)
  useEffect(() => {
    const handler = (e) => { if (popRef.current && !popRef.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div
      ref={popRef}
      className="absolute left-0 top-full mt-1 z-50 bg-white border border-black/15 shadow-lg p-3 min-w-[320px] max-w-[420px]"
    >
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-black/[0.06]">
        <div>
          <p className="text-[10px] tracking-[0.2em] uppercase text-black/55 font-medium">{group.label}</p>
          {group.helper_text && (
            <p className="text-[10px] text-black/35 mt-0.5 font-light max-w-[280px] leading-relaxed">{group.helper_text}</p>
          )}
        </div>
        <button onClick={onClose} className="text-[10px] text-black/40 hover:text-black tracking-wider uppercase bg-transparent border-0">
          Schließen
        </button>
      </div>
      {allowed.length === 0 ? (
        <p className="text-[10px] text-black/30 font-light py-2">
          Keine Werte für diese Kategorie verfügbar.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {allowed.map(v => {
            const sel = isSelected(v.id)
            const def = isDefault(v.id)
            return (
              <div key={v.id} className="flex items-stretch border border-black/10">
                <button
                  type="button"
                  onClick={() => onToggle(v)}
                  className={`flex items-center gap-1.5 px-2.5 h-8 text-[10px] tracking-wider transition-all bg-transparent border-0 ${
                    sel ? 'text-black font-medium' : 'text-black/45 hover:text-black/70'
                  }`}
                >
                  {v.color_hex && (
                    <span className="w-3 h-3 border border-black/20" style={{ backgroundColor: v.color_hex }} />
                  )}
                  {v.image_data && (
                    <img src={v.image_data} alt="" className="w-4 h-4 object-cover border border-black/10" />
                  )}
                  {v.label}
                  {v.default_price_extra > 0 && <span className="opacity-50">+{v.default_price_extra}€</span>}
                  {sel && <Check size={10} strokeWidth={2} />}
                </button>
                {sel && (
                  <button
                    type="button"
                    onClick={() => onSetDefault(v)}
                    className={`px-1.5 border-l border-black/10 ${def ? 'text-yellow-600' : 'text-black/25 hover:text-black/50'} bg-transparent`}
                    title="Als Vorbelegung markieren"
                  >
                    ★
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
