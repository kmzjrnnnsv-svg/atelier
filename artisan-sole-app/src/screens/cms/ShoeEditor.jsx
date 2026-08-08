import React, { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, X, Check, Upload, Gift, ChevronDown, ChevronUp, Layers, AlertCircle } from 'lucide-react'
import useStore from '../../store/store'
import { apiFetch } from '../../hooks/useApi'

const CATEGORIES = ['OXFORD', 'WHOLECUT', 'DERBY', 'MONK', 'DOUBLE_MONK', 'LOAFER', 'BALMORAL', 'BOOT', 'CHELSEA', 'CHUKKA', 'SNEAKER']
const TAGS = [null, 'BESTSELLER', 'NEW', 'LIMITED']

const emptyForm = {
 name: '',
 category: 'OXFORD',
 price: '',
 material: '',
 tagline: '',
 description: '',
 match: '',
 color: '#1f2937',
 tag: null,
 image: null,
 hover_image: null,
 default_images: [],
 cost_price: '',
 promotion_price: '',
}

function ShoeForm({ initial = emptyForm, onSave, onCancel }) {
 const [form, setForm] = useState(initial)
 const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
 const { shoeColors, shoeMaterials } = useStore()

 // Per-Schuh Farbvarianten, flach gespeichert: ein Eintrag pro
 // (Farbe × Material). material_key=null = Default für alle Materialien.
 const [variants, setVariants] = useState([])
 // Welche Materialien sind diesem Schuh zugewiesen?
 const [assignedMaterials, setAssignedMaterials] = useState([]) // string[] (keys)
 const [variantsLoaded, setVariantsLoaded] = useState(!initial.id)
 const [variantError, setVariantError] = useState(null)
 const [saving, setSaving] = useState(false)
 // Aktiver Tab pro Farbe: { [colorKey]: material_key|null }
 const [activeTab, setActiveTab] = useState({})

 // Globale Options-Gruppen + Werte (für die Konfigurator-Matrix)
 const [allGroups, setAllGroups] = useState([])
 // Aktive Auswahl: Map<option_id, { price_override, is_default, sort_order }>
 const [selectedOpts, setSelectedOpts] = useState(new Map())

 useEffect(() => {
   // Globale Optionen laden, egal ob neu oder bearbeiten
   apiFetch('/api/option-groups')
     .then(rows => setAllGroups(Array.isArray(rows) ? rows : []))
     .catch(() => {})
 }, [])

 useEffect(() => {
   if (!initial.id) {
     // Neuer Schuh: keine Farben/Materialien laden, aber Vorlage aus Kategorie laden
     return
   }
   Promise.all([
     apiFetch(`/api/shoes/${initial.id}/colors`).catch(() => []),
     apiFetch(`/api/shoes/${initial.id}/materials`).catch(() => []),
     apiFetch(`/api/shoes/${initial.id}/options`).catch(() => []),
     // Die zweite Standardansicht fehlt in der Schuhliste (dort bewusst
     // ausgespart, siehe listExclude im Backend). Ohne diesen Einzelabruf
     // stünde das Feld im Formular leer und würde beim Speichern das
     // hinterlegte Bild löschen.
     apiFetch(`/api/shoes/${initial.id}`).catch(() => null),
   ]).then(([cols, mats, optGroups, full]) => {
     // Die Strecke fehlt in der Schuhliste (listExclude im Backend). Ohne
     // diesen Einzelabruf stünde sie im Formular leer und ein Speichern
     // hätte die hinterlegten Bilder gelöscht.
     if (full) {
       let gallery = []
       try { gallery = JSON.parse(full.default_images || '[]') } catch { gallery = [] }
       // Ältere Modelle kennen die Strecke noch nicht — aus den beiden
       // Einzelfeldern eine aufbauen, damit nichts verloren geht.
       if (!gallery.length) {
         gallery = [full.image_data, full.hover_image_data].filter(Boolean)
       }
       setForm(f => (f.default_images?.length ? f : { ...f, default_images: gallery }))
     }
     setVariants((cols || []).map(r => ({
       _existingId: r.id, hex: r.hex, name: r.name,
       material_key: r.material_key || null,
       images: r.images || [],
     })))
     setAssignedMaterials(Array.isArray(mats) ? mats : [])
     // optGroups ist die per-Schuh Konfigurator-Struktur, wir flachen die
     // Auswahl in eine Map<option_id, …>.
     const m = new Map()
     if (Array.isArray(optGroups)) {
       optGroups.forEach(g => g.values?.forEach(v => {
         // price_extra ist hier schon der effektive Preis; wir wollen aber
         // wissen, ob es ein Override war. Vereinfacht: speichern als-is.
         m.set(v.id, { is_default: !!v.is_default, price_override: null, sort_order: v.sort_order })
       }))
     }
     setSelectedOpts(m)
     setVariantsLoaded(true)
   })
 }, [initial.id])

 // Vorlage anwenden, überschreibt die aktuelle Auswahl mit den Empfehlungen
 // für die gewählte Kategorie. Aufruf manuell, nicht automatisch beim
 // Kategoriewechsel (sonst frustrierende Datenverluste).
 const applyTemplate = async () => {
   if (!form.category) return
   try {
     const rows = await apiFetch(`/api/category-templates/${form.category}`)
     const m = new Map(selectedOpts)
     ;(rows || []).forEach(r => {
       m.set(r.option_id, { is_default: !!r.is_default, price_override: null, sort_order: r.sort_order })
     })
     setSelectedOpts(m)
   } catch (e) { alert(e?.error || 'Vorlage konnte nicht geladen werden') }
 }

 const toggleOption = (optionId, groupId) => {
   setSelectedOpts(prev => {
     const m = new Map(prev)
     if (m.has(optionId)) m.delete(optionId)
     else m.set(optionId, { is_default: false, price_override: null, sort_order: 0 })
     return m
   })
 }
 const setDefault = (optionId, groupId) => {
   setSelectedOpts(prev => {
     const m = new Map(prev)
     // Bei single-Auswahl-Gruppe: alle anderen Defaults der Gruppe zurücksetzen
     const group = allGroups.find(g => g.id === groupId)
     if (group?.ui_type === 'single' || group?.ui_type === 'toggle') {
       group.values?.forEach(v => {
         if (m.has(v.id)) m.set(v.id, { ...m.get(v.id), is_default: v.id === optionId })
       })
     } else if (m.has(optionId)) {
       m.set(optionId, { ...m.get(optionId), is_default: !m.get(optionId).is_default })
     }
     return m
   })
 }
 const setPriceOverride = (optionId, value) => {
   setSelectedOpts(prev => {
     const m = new Map(prev)
     if (!m.has(optionId)) return m
     m.set(optionId, { ...m.get(optionId), price_override: value === '' ? null : parseFloat(value) })
     return m
   })
 }

 // Gruppiere Varianten nach Farbe (Name+Hex). Jede Gruppe hat 1..n Buckets.
 const colorGroups = (() => {
   const map = new Map()
   variants.forEach((v, idx) => {
     const key = `${v.name}::${v.hex}`
     if (!map.has(key)) map.set(key, { key, hex: v.hex, name: v.name, buckets: [] })
     map.get(key).buckets.push({ ...v, _idx: idx })
   })
   return [...map.values()]
 })()

 const variantsValid = variants.every(v => v.name && Array.isArray(v.images) && v.images.length > 0)
 const valid = form.name && form.price && form.material && variantsValid

 // Material-Liste für die Tabs einer Farbe: nur wenn der Schuh ≥1 Material
 // zugewiesen hat. Sonst kein Material-Override sinnvoll.
 const materialOptions = assignedMaterials.length > 0
   ? shoeMaterials.filter(m => assignedMaterials.includes(m.key))
   : []

 const togglePaletteColor = (palette) => {
   setVariantError(null)
   setVariants(prev => {
     const existsAny = prev.some(v => v.name === palette.name && v.hex === palette.hex)
     if (existsAny) {
       return prev.filter(v => !(v.name === palette.name && v.hex === palette.hex))
     }
     return [...prev, { hex: palette.hex, name: palette.name, material_key: null, images: [] }]
   })
   setActiveTab(prev => ({ ...prev, [palette.name]: null }))
 }

 const findVariantIdx = (name, hex, material_key) =>
   variants.findIndex(v => v.name === name && v.hex === hex && (v.material_key || null) === (material_key || null))

 const ensureBucket = (group, material_key) => {
   const idx = findVariantIdx(group.name, group.hex, material_key)
   if (idx >= 0) return idx
   setVariants(prev => [...prev, { hex: group.hex, name: group.name, material_key, images: [] }])
   return -1
 }

 const removeBucket = (idx) => {
   const v = variants[idx]
   if (v.material_key === null) return // Default kann nicht via Tab entfernt werden
   setVariants(prev => prev.filter((_, i) => i !== idx))
   setActiveTab(prev => ({ ...prev, [v.name]: null }))
 }

 const addVariantImages = async (idx, files) => {
   const list = Array.from(files || [])
   if (!list.length) return
   const dataUrls = await Promise.all(list.map(file => new Promise(resolve => {
     const r = new FileReader(); r.onload = e => resolve(e.target.result); r.readAsDataURL(file)
   })))
   setVariants(prev => prev.map((v, i) => i === idx ? { ...v, images: [...(v.images || []), ...dataUrls] } : v))
 }

 const removeVariantImage = (idx, imgIdx) =>
   setVariants(prev => prev.map((v, i) => i === idx ? { ...v, images: v.images.filter((_, j) => j !== imgIdx) } : v))

 // Bilder an die Standard-Strecke anhängen. Reihenfolge zählt: das erste
 // steht in der Übersicht, das zweite erscheint beim Überfahren, alle
 // zusammen bilden die Slideshow auf der Produktseite.
 const addDefaultImages = async (files) => {
 const list = Array.from(files || [])
 if (!list.length) return
 const dataUrls = await Promise.all(list.map(file => new Promise(resolve => {
 const r = new FileReader(); r.onload = e => resolve(e.target.result); r.readAsDataURL(file)
 })))
 setForm(f => ({ ...f, default_images: [...(f.default_images || []), ...dataUrls] }))
 }

 const removeDefaultImage = (idx) =>
 setForm(f => ({ ...f, default_images: (f.default_images || []).filter((_, i) => i !== idx) }))

 // Reihenfolge ändern, damit sich Titel- und Hover-Bild ohne erneutes
 // Hochladen festlegen lassen.
 const moveDefaultImage = (idx, dir) =>
 setForm(f => {
 const arr = [...(f.default_images || [])]
 const to = idx + dir
 if (to < 0 || to >= arr.length) return f
 ;[arr[idx], arr[to]] = [arr[to], arr[idx]]
 return { ...f, default_images: arr }
 })

 const persistVariants = async (shoeId) => {
   await apiFetch(`/api/shoes/${shoeId}/colors`, {
     method: 'PUT',
     body: JSON.stringify({
       variants: variants.map(v => ({
         hex: v.hex, name: v.name,
         material_key: v.material_key || null,
         images: v.images,
       })),
     }),
   })
 }

 const persistOptions = async (shoeId) => {
   const selections = [...selectedOpts.entries()].map(([option_id, meta], i) => ({
     option_id,
     price_override: meta.price_override,
     is_default: meta.is_default,
     sort_order: meta.sort_order ?? i,
   }))
   await apiFetch(`/api/shoes/${shoeId}/options`, {
     method: 'PUT',
     body: JSON.stringify({ selections }),
   })
 }

 const handleSave = async () => {
   if (!valid || saving) return
   if (variants.length > 0 && !variantsValid) {
     setVariantError('Jede ausgewählte Farbe braucht mindestens 1 Bild.')
     return
   }
   setSaving(true); setVariantError(null)
   try {
     // Erstes Variant-Hex als Vorschau-Farbe übernehmen (für die Listen-Kachel),
     // ansonsten unverändert lassen.
     const preview = variants[0]?.hex || form.color
     await onSave({ ...form, color: preview }, async (savedShoe) => {
       const shoeId = savedShoe?.id || initial.id
       if (!shoeId) return
       if (variants.length > 0) await persistVariants(shoeId)
       if (selectedOpts.size > 0)  await persistOptions(shoeId)
     })
   } catch (e) {
     setVariantError(e?.error || 'Speichern fehlgeschlagen')
   } finally {
     setSaving(false)
   }
 }

 return (
 <div className="bg-white p-7">
 <h3 className="text-[9px] text-black/25 uppercase tracking-[0.25em] mb-5 font-light">{initial.id ? 'Schuh bearbeiten' : 'Neuer Schuh'}</h3>

 {/* Standard-Bilderstrecke des Modells */}
 <div className="mb-5">
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1 font-light">Standardbilder</label>
 <p className="text-[10px] text-black/25 font-light mb-3 leading-relaxed max-w-xl">
 Die Reihenfolge bestimmt die Rolle: Das <strong className="font-normal">erste</strong> Bild steht
 in der Übersicht, das <strong className="font-normal">zweite</strong> erscheint beim Überfahren,
 alle zusammen bilden die Slideshow auf der Produktseite. Hat eine Farbvariante eigene Bilder,
 gehen diese auf der Produktseite vor.
 </p>
 <div className="flex flex-wrap gap-2">
 {(form.default_images || []).map((img, i) => (
 <div key={i} className="relative w-24 group">
 <div className="w-24 h-32 overflow-hidden border border-black/10 bg-[#f6f5f3]">
 <img src={img} alt="" className="w-full h-full object-cover" />
 </div>
 <button
 type="button"
 onClick={() => removeDefaultImage(i)}
 className="absolute -top-2 -right-2 w-5 h-5 bg-white border border-black/20 text-black/60 hover:text-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
 aria-label="Bild entfernen"
 >
 <X size={10} strokeWidth={1.6} />
 </button>
 {(i === 0 || i === 1) && (
 <span className="absolute top-0 left-0 bg-black/70 text-white text-[7px] tracking-[0.16em] uppercase px-1.5 py-0.5">
 {i === 0 ? 'Übersicht' : 'Hover'}
 </span>
 )}
 <div className="flex mt-1">
 <button
 type="button" disabled={i === 0}
 onClick={() => moveDefaultImage(i, -1)}
 className="flex-1 h-6 border border-black/10 bg-transparent text-[10px] text-black/40 hover:text-black disabled:opacity-25"
 aria-label="nach vorne"
 >←</button>
 <button
 type="button" disabled={i === (form.default_images || []).length - 1}
 onClick={() => moveDefaultImage(i, 1)}
 className="flex-1 h-6 border border-black/10 border-l-0 bg-transparent text-[10px] text-black/40 hover:text-black disabled:opacity-25"
 aria-label="nach hinten"
 >→</button>
 </div>
 </div>
 ))}
 <label className="w-24 h-32 flex flex-col items-center justify-center border border-dashed border-black/15 text-black/30 hover:border-black/40 hover:text-black/60 cursor-pointer transition-colors">
 <Upload size={14} strokeWidth={1.4} />
 <span className="text-[8px] tracking-[0.16em] uppercase mt-1">Hinzufügen</span>
 <input type="file" accept="image/*" multiple className="hidden" onChange={e => addDefaultImages(e.target.files)} />
 </label>
 </div>
 </div>

 {/* Name */}
 <div className="mb-5">
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Name *</label>
 <input
 value={form.name}
 onChange={(e) => set('name', e.target.value)}
 placeholder={'Boardroom "Oxford"'}
 className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15"
 />
 <p className="text-[10px] text-black/35 font-light mt-1.5 leading-relaxed">
 Tipp: Teil in <span className="text-black/55">"Anführungszeichen"</span> wird auf der Seite GROSSGESCHRIEBEN hervorgehoben, der Rest erscheint gedämpft. Beispiel: <span className="text-black/55">Boardroom "Oxford"</span> → Boardroom <span className="uppercase tracking-wide">Oxford</span>. Die Anführungszeichen selbst werden nie angezeigt.
 </p>
 </div>

 {/* Category + Tag row */}
 <div className="grid grid-cols-2 gap-5 mb-5">
 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Kategorie *</label>
 <select
 value={form.category}
 onChange={(e) => set('category', e.target.value)}
 className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70"
 >
 {[...new Set([...CATEGORIES, form.category].filter(Boolean))].map((c) => <option key={c} value={c}>{c}</option>)}
 </select>
 </div>
 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Badge</label>
 <select
 value={form.tag ?? ''}
 onChange={(e) => set('tag', e.target.value || null)}
 className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70"
 >
 <option value="">Kein Badge</option>
 {TAGS.filter(Boolean).map((t) => <option key={t} value={t}>{t}</option>)}
 </select>
 </div>
 </div>

 {/* Price + Match row */}
 <div className="grid grid-cols-2 gap-5 mb-5">
 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Preis *</label>
 <input
 value={form.price}
 onChange={(e) => set('price', e.target.value)}
 placeholder="€ 1.450"
 className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15"
 />
 </div>
 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Biometric Match</label>
 <input
 value={form.match}
 onChange={(e) => set('match', e.target.value)}
 placeholder="99.4%"
 className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15"
 />
 </div>
 </div>

 {/* Material */}
 <div className="mb-5">
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Material *</label>
 <input
 value={form.material}
 onChange={(e) => set('material', e.target.value)}
 placeholder="Full-Grain Calfskin"
 className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15"
 />
 </div>

 {/* Tagline (kurzer Satz unter dem Namen) */}
 <div className="mb-5">
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Tagline (kurzer Satz)</label>
 <input
 value={form.tagline}
 onChange={(e) => set('tagline', e.target.value)}
 placeholder="z. B. Der zeitlose Begleiter für jeden Anlass."
 className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15"
 />
 </div>

 {/* Beschreibung (langer Text auf der Produktseite) */}
 <div className="mb-5">
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Beschreibung</label>
 <textarea
 value={form.description}
 onChange={(e) => set('description', e.target.value)}
 rows={4}
 placeholder="Frei lassen für den Standardtext. Eigener Text überschreibt diesen."
 className="w-full px-4 py-2.5 border border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15 resize-none"
 />
 </div>

 {/* Farben, Auswahl aus globaler Palette + Bild-Pflicht pro Farbe */}
 <div className="mb-5 border-t border-black/[0.04] pt-5">
 <div className="flex items-center justify-between mb-1.5">
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] font-light">Farben & Bilder</label>
 <span className="text-[9px] text-black/25 tracking-wider font-light">
 {variants.length > 0 ? `${variants.length} ausgewählt` : 'Keine Farbe gewählt'}
 </span>
 </div>
 <p className="text-[10px] text-black/35 mb-3 font-light">
 Wähle Farben aus der globalen Palette (Produkt-Konfig). Pro Farbe muss mindestens 1 Bild hochgeladen werden.
 </p>

 {/* Palette */}
 <div className="flex flex-wrap gap-2 mb-4">
 {(shoeColors || []).filter(c => c.available !== 0).map(c => {
 const on = variants.some(v => v.name === c.name && v.hex === c.hex)
 return (
 <button
 key={c.key}
 type="button"
 onClick={() => togglePaletteColor(c)}
 className={`flex items-center gap-2 px-3 h-9 transition-all text-[11px] tracking-wider font-light border ${
 on ? 'bg-black text-white border-black' : 'bg-transparent text-black/55 border-black/10 hover:border-black/40'
 }`}
 >
 <span className="w-3.5 h-3.5 border border-black/15" style={{ backgroundColor: c.hex }} />
 {c.name}
 {on && <Check size={11} strokeWidth={1.6} />}
 </button>
 )
 })}
 {(shoeColors || []).length === 0 && (
 <p className="text-[10px] text-black/30 font-light">Keine globalen Farben definiert. Lege sie unter „Produkt-Konfig" → Farben an.</p>
 )}
 </div>

 {/* Pro Farbe: Tabs (Default + pro Material) → Bild-Galerie */}
 {colorGroups.length > 0 && (
 <div className="space-y-3">
 {colorGroups.map(group => {
 const tab = activeTab[group.name] ?? null
 // Bucket des aktiven Tabs
 const activeBucket = group.buckets.find(b => (b.material_key || null) === tab)
 const activeIdx = activeBucket?._idx ?? -1
 const hasImage = (activeBucket?.images?.length || 0) > 0
 const groupValid = group.buckets.some(b => (b.images?.length || 0) > 0)
 const showMaterialTabs = materialOptions.length >= 2

 return (
 <div key={group.key} className={`border p-3 ${groupValid ? 'border-black/[0.08]' : 'border-red-200 bg-red-50/30'}`}>
 {/* Header */}
 <div className="flex items-center gap-2 mb-2">
 <span className="w-4 h-4 border border-black/15 flex-shrink-0" style={{ backgroundColor: group.hex }} />
 <p className="text-[12px] font-light text-black/75">{group.name}</p>
 <span className="text-[9px] text-black/30 ml-auto tracking-wider uppercase">
 {hasImage ? `${activeBucket.images.length} Bild${activeBucket.images.length === 1 ? '' : 'er'}` : 'Bild fehlt'}
 </span>
 </div>

 {/* Material-Tabs (nur wenn der Schuh ≥2 Materialien hat) */}
 {showMaterialTabs && (
 <div className="flex flex-wrap gap-1 mb-3 border-b border-black/[0.05] pb-2">
 <button
 type="button"
 onClick={() => setActiveTab(prev => ({ ...prev, [group.name]: null }))}
 className={`px-2.5 py-1 text-[9px] tracking-wider transition-all border-0 ${
 tab === null ? 'bg-black text-white' : 'bg-transparent text-black/40 hover:text-black/70'
 }`}
 >
 Alle Materialien
 {group.buckets.some(b => b.material_key === null && b.images?.length > 0) &&
   <Check size={9} strokeWidth={1.8} className="inline ml-1 -mt-0.5" />}
 </button>
 {materialOptions.map(m => {
 const has = group.buckets.some(b => b.material_key === m.key && b.images?.length > 0)
 const active = tab === m.key
 return (
 <button
 key={m.key}
 type="button"
 onClick={() => {
   setActiveTab(prev => ({ ...prev, [group.name]: m.key }))
   if (!group.buckets.find(b => b.material_key === m.key)) {
     setVariants(prev => [...prev, { hex: group.hex, name: group.name, material_key: m.key, images: [] }])
   }
 }}
 className={`flex items-center gap-1 px-2.5 py-1 text-[9px] tracking-wider transition-all border-0 ${
 active ? 'bg-black text-white' : 'bg-transparent text-black/40 hover:text-black/70'
 }`}
 title={`Bilder spezifisch für ${m.label}`}
 >
 {m.label}
 {has && <Check size={9} strokeWidth={1.8} />}
 </button>
 )
 })}
 {tab !== null && activeIdx >= 0 && (
 <button
 type="button"
 onClick={() => removeBucket(activeIdx)}
 className="ml-auto px-2 py-1 text-[9px] text-red-500 tracking-wider hover:text-red-700 bg-transparent border-0"
 >
 Override löschen
 </button>
 )}
 </div>
 )}

 {/* Bild-Galerie für aktiven Bucket */}
 {activeIdx >= 0 ? (
 <div className="flex flex-wrap gap-2">
 {activeBucket.images?.map((img, i) => (
 <div key={i} className="relative w-16 h-16 group">
 <img src={img} alt="" className="w-full h-full object-cover border border-black/10" />
 <button
 type="button"
 onClick={() => removeVariantImage(activeIdx, i)}
 className="absolute -top-2 -right-2 w-5 h-5 bg-white border border-black/20 text-black/60 hover:text-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
 >
 <X size={10} strokeWidth={1.6} />
 </button>
 {i === 0 && (
 <span className="absolute bottom-0 left-0 right-0 bg-black/65 text-white text-[7px] tracking-[0.18em] uppercase text-center py-0.5">
 Haupt
 </span>
 )}
 </div>
 ))}
 <label className={`w-16 h-16 flex flex-col items-center justify-center border border-dashed cursor-pointer transition-colors ${
 hasImage ? 'border-black/15 text-black/30 hover:border-black/40 hover:text-black/60' : 'border-red-300 text-red-500 bg-white'
 }`}>
 <Upload size={13} strokeWidth={1.4} />
 <span className="text-[7px] tracking-[0.18em] uppercase mt-0.5">{hasImage ? 'Mehr' : 'Pflicht'}</span>
 <input type="file" accept="image/*" multiple className="hidden" onChange={e => addVariantImages(activeIdx, e.target.files)} />
 </label>
 </div>
 ) : (
 <p className="text-[10px] text-black/30 font-light italic">
 Wähle einen Tab, um Bilder hochzuladen.
 </p>
 )}
 </div>
 )
 })}
 </div>
 )}

 {variantError && (
 <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-2">
 <AlertCircle size={13} className="text-red-500" />
 <p className="text-[11px] text-red-700">{variantError}</p>
 </div>
 )}
 </div>

 {/* Konfigurator-Optionen, Matrix mit Vorlagen-Anwendung */}
 <div className="border-t border-black/[0.04] pt-5 mt-2 mb-5">
   <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
     <div>
       <p className="text-[9px] text-black/25 uppercase tracking-[0.25em] font-light">Konfigurator</p>
       <p className="text-[11px] text-black/40 mt-1 font-light max-w-md">
         Welche Optionen darf der Kunde bei diesem Schuh wählen? Klick = aktiviert. Stern = Vorbelegung.
       </p>
     </div>
     <button
       type="button"
       onClick={applyTemplate}
       className="text-[10px] text-black/55 hover:text-black tracking-[0.18em] uppercase font-light border border-black/15 hover:border-black bg-transparent px-4 h-9"
     >
       Vorlage „{form.category}" anwenden
     </button>
   </div>
   <div className="space-y-3">
     {allGroups.map(group => {
       // Werte filtern: nur die, die zur Kategorie passen
       const cat = (form.category || '').toUpperCase()
       const groupValues = (group.values || []).filter(v => {
         if (!v.applicable_categories || v.applicable_categories === '*') return true
         return v.applicable_categories.split(',').map(s => s.trim()).includes(cat)
       })
       if (groupValues.length === 0) return null
       const anySelected = groupValues.some(v => selectedOpts.has(v.id))
       return (
         <div key={group.id} className={`border ${anySelected ? 'border-black/[0.08]' : 'border-black/[0.04] opacity-70'} bg-white p-3`}>
           <div className="flex items-center justify-between mb-2">
             <div>
               <p className="text-[11px] text-black/70 font-light">{group.label}</p>
               <p className="text-[9px] text-black/30 tracking-wider uppercase mt-0.5">
                 {group.ui_type === 'single' ? 'Einzelauswahl' : group.ui_type === 'toggle' ? 'Ja/Nein' : 'Mehrfach'}
                 {group.required ? ' · Pflicht' : ' · Optional'}
               </p>
             </div>
           </div>
           <div className="flex flex-wrap gap-1.5">
             {groupValues.map(v => {
               const sel = selectedOpts.get(v.id)
               const isOn = !!sel
               const effectivePrice = sel?.price_override !== null && sel?.price_override !== undefined
                 ? sel.price_override
                 : v.default_price_extra
               return (
                 <div key={v.id} className={`flex items-stretch border ${isOn ? 'border-black' : 'border-black/10'} bg-white`}>
                   <button
                     type="button"
                     onClick={() => toggleOption(v.id, group.id)}
                     className={`flex items-center gap-1.5 px-2.5 h-8 text-[10px] tracking-wider transition-all bg-transparent border-0 ${
                       isOn ? 'text-black font-medium' : 'text-black/45 hover:text-black/70'
                     }`}
                   >
                     {v.image_data && <img src={v.image_data} alt="" className="w-4 h-4 object-cover border border-black/10" />}
                     {v.label}
                     {effectivePrice > 0 && <span className="opacity-60">+{effectivePrice.toFixed(2).replace('.', ',')}€</span>}
                   </button>
                   {isOn && (
                     <>
                       <button
                         type="button"
                         onClick={() => setDefault(v.id, group.id)}
                         className={`px-2 border-l border-black/10 ${sel.is_default ? 'text-yellow-600' : 'text-black/25 hover:text-black/50'} bg-transparent`}
                         title="Als Vorbelegung markieren"
                       >
                         ★
                       </button>
                       <input
                         type="number" step="0.01" placeholder={`${v.default_price_extra}`}
                         value={sel.price_override ?? ''}
                         onChange={e => setPriceOverride(v.id, e.target.value)}
                         className="w-14 px-1 border-l border-black/10 text-[10px] text-black/70 bg-transparent outline-none text-right font-light"
                         title="Preis-Override (leer = Default)"
                       />
                     </>
                   )}
                 </div>
               )
             })}
           </div>
         </div>
       )
     })}
     {allGroups.length === 0 && (
       <p className="text-[11px] text-black/30 font-light text-center py-4">
         Keine Konfigurator-Optionen definiert. Lege sie unter „Produkt-Konfig" → „Konfigurator-Optionen" an.
       </p>
     )}
   </div>
 </div>

 {/* Cost & Promotion pricing */}
 <div className="border-t border-black/[0.04] pt-5 mt-2">
 <p className="text-[9px] text-black/25 uppercase tracking-[0.25em] mb-5 font-light">Kalkulation & Promotion</p>
 <div className="grid grid-cols-2 gap-5">
 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Einkaufspreis (EK)</label>
 <input
 type="number" step="0.01"
 value={form.cost_price}
 onChange={(e) => set('cost_price', e.target.value)}
 placeholder="z.B. 280"
 className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15"
 />
 </div>
 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Promotion-Preis</label>
 <input
 value={form.promotion_price}
 onChange={(e) => set('promotion_price', e.target.value)}
 placeholder="z.B. € 890"
 className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15"
 />
 </div>
 </div>
 </div>

 {/* Actions */}
 <div className="flex gap-3 pt-6 items-center">
 <button
 onClick={handleSave}
 disabled={!valid || saving || !variantsLoaded}
 className={`px-8 h-11 border border-black text-black text-[11px] bg-transparent hover:bg-black hover:text-white transition-all duration-300 uppercase tracking-[0.2em] font-light flex items-center justify-center gap-2 ${
 (!valid || saving || !variantsLoaded) ? 'opacity-30 cursor-not-allowed' : ''
 }`}
 >
 <Check size={14} strokeWidth={1.25} /> {saving ? 'Speichert…' : 'Speichern'}
 </button>
 <button
 onClick={onCancel}
 className="px-6 h-11 text-[11px] text-black/30 hover:text-black/60 bg-transparent border-0 transition-colors font-light"
 >
 Abbrechen
 </button>
 {!variantsValid && variants.length > 0 && (
 <span className="text-[10px] text-red-500 tracking-wider font-light ml-2">
 Bild für jede Farbe erforderlich
 </span>
 )}
 </div>
 </div>
 )
}

// ── Material-Assigner: Mehrfachauswahl aus globaler shoe_materials-Liste ──
function MaterialAssigner({ shoeId }) {
  const { shoeMaterials } = useStore()
  const [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(0)

  useEffect(() => {
    apiFetch(`/api/shoes/${shoeId}/materials`)
      .then(keys => { setSelected(Array.isArray(keys) ? keys : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [shoeId])

  const toggle = (key) => {
    setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  const save = async () => {
    setSaving(true)
    try {
      await apiFetch(`/api/shoes/${shoeId}/materials`, {
        method: 'PUT',
        body: JSON.stringify({ material_keys: selected }),
      })
      setSavedAt(Date.now())
    } catch {} finally { setSaving(false) }
  }

  if (loading) return <p className="text-[10px] text-black/25 py-2 font-light">Laden…</p>
  if (!shoeMaterials.length) return (
    <p className="text-[10px] text-black/35 py-2 font-light">
      Keine globalen Materialien definiert. Lege sie unter „Produkt-Konfig" an.
    </p>
  )

  return (
    <div className="pt-3 pb-2 space-y-3">
      <p className="text-[10px] text-black/35 font-light leading-relaxed">
        Wähle aus, welche Lederarten für diesen Schuh im Konfigurator angezeigt werden.
        Wenn nichts ausgewählt ist, werden alle globalen Materialien angezeigt.
      </p>
      <div className="flex flex-wrap gap-2">
        {shoeMaterials.map(m => {
          const on = selected.includes(m.key)
          return (
            <button
              key={m.key}
              onClick={() => toggle(m.key)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-[10px] tracking-wider transition-all font-light ${
                on ? 'bg-black text-white border-0' : 'text-black/30 hover:text-black/70 bg-transparent border border-black/[0.08]'
              }`}
            >
              {on && <Check size={11} strokeWidth={1.5} />}
              {m.label}
              {m.sub && <span className="opacity-60">· {m.sub}</span>}
            </button>
          )
        })}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="px-8 h-11 border border-black text-black text-[11px] bg-transparent hover:bg-black hover:text-white transition-all uppercase tracking-[0.2em] font-light disabled:opacity-30"
        >
          {saving ? 'Speichern…' : 'Materialien speichern'}
        </button>
        {savedAt > 0 && Date.now() - savedAt < 3000 && (
          <span className="text-[10px] text-green-700 tracking-[0.18em] uppercase">Gespeichert</span>
        )}
      </div>
    </div>
  )
}

function AccessoryAssigner({ shoeId }) {
 const { accessories } = useStore()
 const [assigned, setAssigned] = useState([])
 const [loading, setLoading] = useState(true)
 const [saving, setSaving] = useState(false)

 useEffect(() => {
  apiFetch(`/api/shoes/${shoeId}/accessories`).then(rows => {
   setAssigned(rows.map(r => r.id))
   setLoading(false)
  }).catch(() => setLoading(false))
 }, [shoeId])

 const toggle = (accId) => {
  setAssigned(prev => prev.includes(accId) ? prev.filter(id => id !== accId) : [...prev, accId])
 }

 const save = async () => {
  setSaving(true)
  try {
   await apiFetch(`/api/shoes/${shoeId}/accessories`, {
    method: 'PUT',
    body: JSON.stringify({ accessory_ids: assigned }),
   })
  } catch {} finally { setSaving(false) }
 }

 if (loading) return <p className="text-[10px] text-black/25 py-2 font-light">Laden…</p>
 if (!accessories.length) return <p className="text-[10px] text-black/25 py-2 font-light">Keine Zubehörteile vorhanden</p>

 return (
  <div className="pt-3 pb-2 space-y-3">
   <div className="flex flex-wrap gap-2">
    {accessories.filter(a => a.is_active !== 0).map(acc => {
     const on = assigned.includes(acc.id)
     return (
      <button
       key={acc.id}
       onClick={() => toggle(acc.id)}
       className={`flex items-center gap-1.5 text-[11px] transition-all font-light ${
        on ? 'px-3.5 py-1.5 text-[10px] bg-black text-white border-0 tracking-wider' : 'px-3.5 py-1.5 text-[10px] text-black/25 hover:text-black/50 bg-transparent border border-black/[0.08] tracking-wider'
       }`}
      >
       {on && <Check size={11} strokeWidth={1.5} />}
       {acc.name}
       {acc.price != null && <span className="opacity-60 ml-0.5">{acc.price}</span>}
      </button>
     )
    })}
   </div>
   <button
    onClick={save}
    disabled={saving}
    className="px-8 h-11 border border-black text-black text-[11px] bg-transparent hover:bg-black hover:text-white transition-all duration-300 uppercase tracking-[0.2em] font-light disabled:opacity-30 cursor-not-allowed"
   >
    {saving ? 'Speichern…' : 'Zubehör speichern'}
   </button>
  </div>
 )
}

export default function ShoeEditor() {
 const { shoes, addShoe, updateShoe, deleteShoe } = useStore()
 const [mode, setMode] = useState(null)
 const [filterCat, setFilterCat] = useState('ALL')
 const [expandedPanel, setExpandedPanel] = useState(null) // { id, panel: 'acc'|'mat'|'col' }
 const togglePanel = (id, panel) =>
   setExpandedPanel(p => (p?.id === id && p?.panel === panel) ? null : { id, panel })

 const filtered = filterCat === 'ALL' ? shoes : shoes.filter((s) => s.category === filterCat)

 return (
 <div className="px-10 py-10 lg:px-14 lg:py-12 w-full max-w-full overflow-hidden">
 <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
 <div>
 <p className="text-[9px] text-black/20 uppercase tracking-[0.3em] mb-3 font-light">Kollektion</p>
 <h1 className="text-[28px] font-extralight text-black/85 tracking-tight">Schuhe</h1>
 <p className="text-[13px] text-black/30 mt-2 font-light">{shoes.length} Produkte verwalten</p>
 </div>
 {!mode && (
 <button
 onClick={() => setMode('add')}
 className="flex items-center gap-2 px-6 h-10 border border-black/15 text-black/50 hover:border-black hover:text-black text-[11px] transition-all bg-transparent uppercase tracking-[0.2em] font-light"
 >
 <Plus size={14} strokeWidth={1.25} /> Neuer Schuh
 </button>
 )}
 </div>

 {/* Add Form */}
 {mode === 'add' && (
 <div className="mb-8">
 <ShoeForm
 onSave={async (f, afterSave) => {
   const saved = await addShoe(f)
   if (afterSave) await afterSave(saved)
   setMode(null)
 }}
 onCancel={() => setMode(null)}
 />
 </div>
 )}

 {/* Category filter */}
 <div className="flex gap-1 mb-6 flex-wrap">
 {['ALL', ...CATEGORIES].map((c) => (
 <button
 key={c}
 onClick={() => setFilterCat(c)}
 className={filterCat === c
 ? "px-3.5 py-1.5 text-[10px] bg-black text-white border-0 transition-all tracking-wider font-light"
 : "px-3.5 py-1.5 text-[10px] text-black/25 hover:text-black/50 bg-transparent border-0 transition-all tracking-wider font-light"
 }
 >
 {c === 'ALL' ? 'Alle' : c}
 </button>
 ))}
 </div>

 {/* Shoe List */}
 <div>
 {filtered.map((shoe) => (
 mode?.editing?.id === shoe.id ? (
 <ShoeForm
 key={shoe.id}
 initial={shoe}
 onSave={async (f, afterSave) => {
   const saved = await updateShoe(shoe.id, f)
   if (afterSave) await afterSave(saved || { id: shoe.id })
   setMode(null)
 }}
 onCancel={() => setMode(null)}
 />
 ) : (
 <React.Fragment key={shoe.id}>
 <div
 className="bg-white flex items-center gap-4 px-6 py-4.5 group hover:bg-black/[0.01] transition-all border-b border-black/[0.04] min-w-0"
 >
 {/* Preview */}
 <div className="w-14 h-14 flex-shrink-0 overflow-hidden flex items-center justify-center" style={{ backgroundColor: shoe.color }}>
 {shoe.image ? (
 <img src={shoe.image} alt={shoe.name} className="w-full h-full object-cover" />
 ) : (
 <svg viewBox="0 0 60 35" className="w-12">
 <path d="M4 28 Q2 31 10 33 L50 33 Q56 33 56 28 L54 20 Q52 14 48 13 L16 13 Q10 13 9 17 Z" fill="white" opacity="0.3" />
 <path d="M9 17 Q7 10 14 7 L30 5 Q41 4 46 10 Q50 14 54 20 L48 13 L16 13 Q10 13 9 17 Z" fill="white" opacity="0.2" />
 </svg>
 )}
 </div>

 {/* Info */}
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <p className="text-[13px] font-light text-black/70">{shoe.name}</p>
 {shoe.tag && (
 <span className="text-[9px] font-light text-black/25 uppercase tracking-[0.2em]">
 {shoe.tag}
 </span>
 )}
 </div>
 <p className="text-[10px] text-black/25 mt-0.5 font-light">{shoe.category} · {shoe.material}</p>
 {shoe.match && (
 <p className="text-[9px] text-black/20 mt-0.5 font-light">{shoe.match} Biometric Match</p>
 )}
 </div>

 {/* Price */}
 <div className="flex-shrink-0 text-right">
 <p className="text-[13px] font-light text-black/70">{shoe.price}</p>
 {shoe.cost_price && <p className="text-[9px] text-black/25 font-light">EK: € {shoe.cost_price}</p>}
 {shoe.promotion_price && <p className="text-[9px] text-black/30 font-light">Promo: {shoe.promotion_price}</p>}
 </div>

 {/* Actions */}
 <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
 <button
 onClick={() => togglePanel(shoe.id, 'mat')}
 className={`w-7 h-7 flex items-center justify-center hover:bg-black/[0.04] transition-colors border-0 bg-transparent ${expandedPanel?.id === shoe.id && expandedPanel?.panel === 'mat' ? 'bg-black/[0.05]' : ''}`}
 title="Materialien zuweisen"
 >
 <Layers size={12} strokeWidth={1.25} className="text-black/30" />
 </button>
 <button
 onClick={() => togglePanel(shoe.id, 'acc')}
 className={`w-7 h-7 flex items-center justify-center hover:bg-black/[0.04] transition-colors border-0 bg-transparent ${expandedPanel?.id === shoe.id && expandedPanel?.panel === 'acc' ? 'bg-black/[0.05]' : ''}`}
 title="Zubehör zuweisen"
 >
 <Gift size={12} strokeWidth={1.25} className="text-black/30" />
 </button>
 <button
 onClick={() => setMode({ editing: shoe })}
 className="w-7 h-7 flex items-center justify-center hover:bg-black/[0.04] transition-colors border-0 bg-transparent"
 >
 <Pencil size={12} strokeWidth={1.25} className="text-black/30" />
 </button>
 <button
 onClick={() => { if (confirm(`"${shoe.name}" löschen?`)) deleteShoe(shoe.id) }}
 className="w-7 h-7 flex items-center justify-center hover:bg-black/[0.04] transition-colors border-0 bg-transparent"
 >
 <Trash2 size={12} strokeWidth={1.25} className="text-black/30" />
 </button>
 </div>
 </div>
 {expandedPanel?.id === shoe.id && (
 <div className="bg-white px-6 py-5 border-b border-black/[0.04]">
 {expandedPanel.panel === 'acc' && (
 <>
 <div className="flex items-center gap-2 mb-3">
 <Gift size={12} className="text-black/30" strokeWidth={1.25} />
 <p className="text-[9px] text-black/25 uppercase tracking-[0.25em] font-light">Zubehör für {shoe.name}</p>
 </div>
 <AccessoryAssigner shoeId={shoe.id} />
 </>
 )}
 {expandedPanel.panel === 'mat' && (
 <>
 <div className="flex items-center gap-2 mb-3">
 <Layers size={12} className="text-black/30" strokeWidth={1.25} />
 <p className="text-[9px] text-black/25 uppercase tracking-[0.25em] font-light">Materialien für {shoe.name}</p>
 </div>
 <MaterialAssigner shoeId={shoe.id} />
 </>
 )}
 </div>
 )}
 </React.Fragment>
 )
 ))}

 {filtered.length === 0 && (
 <div className="text-center py-20">
 <p className="text-[13px] text-black/25 font-light">Keine Schuhe in dieser Kategorie</p>
 </div>
 )}
 </div>
 </div>
 )
}
