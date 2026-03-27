import { useState, useEffect } from 'react'
import { Save, CheckCircle2, AlertCircle, Info, ChevronDown, ChevronUp, ShoppingBag } from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'

const TEMPLATE_TYPES = [
 { type: 'order_confirmation', label: 'Bestellbestätigung' },
 { type: 'payment', label: 'Zahlungsanweisung' },
 { type: 'order_confirmed', label: 'Zahlung bestätigt' },
 { type: 'shipping', label: 'Versandbestätigung' },
 { type: 'manufacturer', label: 'Hersteller-Benachrichtigung' },
]

const VARIABLES = [
 { key: '{{name}}', desc: 'Kundenname' },
 { key: '{{order_id}}', desc: 'Bestell-ID' },
 { key: '{{shoe_name}}', desc: 'Schuhmodell' },
 { key: '{{material}}', desc: 'Material' },
 { key: '{{color}}', desc: 'Farbe' },
 { key: '{{price}}', desc: 'Preis' },
 { key: '{{eu_size}}', desc: 'EU-Größe' },
 { key: '{{user_order_number}}',desc: 'Bestellnummer des Kunden' },
 { key: '{{reference}}', desc: 'Zahlungsreferenz (ATELIER-ID)' },
 { key: '{{bank_iban}}', desc: 'Bank IBAN' },
 { key: '{{bank_bic}}', desc: 'Bank BIC' },
 { key: '{{bank_holder}}', desc: 'Kontoinhaber' },
 { key: '{{bank_name}}', desc: 'Bankname' },
 { key: '{{user_id_padded}}', desc: 'Kunden-ID (5-stellig, nur Hersteller-Mail)' },
]

const STATUS_LABELS = {
 pending_payment: { label: 'Zahlung ausstehend' },
 pending: { label: 'Ausstehend' },
 processing: { label: 'In Fertigung' },
 shipped: { label: 'Versandt' },
 delivered: { label: 'Geliefert' },
 cancelled: { label: 'Storniert' },
}

export default function EmailTemplatesPanel() {
 const [templates, setTemplates] = useState({})
 const [activeType, setActiveType] = useState('order_confirmation')
 const [form, setForm] = useState({ subject: '', intro: '', body: '' })
 const [loading, setLoading] = useState(true)
 const [saving, setSaving] = useState(false)
 const [msg, setMsg] = useState(null)
 const [showVars, setShowVars] = useState(false)
 const [orders, setOrders] = useState([])
 const [ordersLoading,setOrdersLoading]= useState(true)
 const [showOrders, setShowOrders] = useState(true)

 useEffect(() => { loadAll() }, [])

 async function loadAll() {
 setLoading(true)
 setOrdersLoading(true)
 try {
 const [tmplData, ordersData] = await Promise.all([
 apiFetch('/api/email-templates'),
 apiFetch('/api/orders/all'),
 ])
 const map = {}
 for (const t of tmplData) map[t.type] = t
 setTemplates(map)
 if (map[activeType]) setForm({ subject: map[activeType].subject, intro: map[activeType].intro, body: map[activeType].body })
 setOrders(ordersData.slice(0, 20))
 } catch (e) {
 console.error(e)
 } finally {
 setLoading(false)
 setOrdersLoading(false)
 }
 }

 function selectType(type) {
 setActiveType(type)
 setMsg(null)
 if (templates[type]) {
 setForm({ subject: templates[type].subject, intro: templates[type].intro, body: templates[type].body })
 }
 }

 async function handleSave() {
 setSaving(true)
 setMsg(null)
 try {
 const updated = await apiFetch(`/api/email-templates/${activeType}`, {
 method: 'PUT',
 body: JSON.stringify(form),
 })
 setTemplates(prev => ({ ...prev, [activeType]: updated }))
 setMsg({ type: 'ok', text: 'Vorlage gespeichert.' })
 } catch (e) {
 setMsg({ type: 'err', text: e?.error || 'Speichern fehlgeschlagen.' })
 } finally {
 setSaving(false)
 }
 }

 function insertVar(varKey) {
 setForm(prev => ({ ...prev, body: prev.body + varKey }))
 }

 const activeTpl = TEMPLATE_TYPES.find(t => t.type === activeType)

 if (loading) {
 return (
 <div className="px-10 py-10 lg:px-14 lg:py-12 flex items-center gap-3">
 <p className="text-[13px] text-black/30 font-light opacity-50">Laden...</p>
 </div>
 )
 }

 return (
 <div className="px-10 py-10 lg:px-14 lg:py-12">
 {/* Header */}
 <div className="mb-10">
 <p className="text-[9px] text-black/20 uppercase tracking-[0.3em] mb-3 font-light">Kommunikation</p>
 <h1 className="text-[28px] font-extralight text-black/85 tracking-tight">E-Mail Vorlagen</h1>
 <p className="text-[13px] text-black/30 mt-2 font-light">
 Bearbeiten Sie die Texte aller automatischen Kunden-E-Mails. Verwenden Sie <code className="text-[11px] text-black/40 font-light">{'{{variable}}'}</code> für dynamische Inhalte.
 </p>
 </div>

 {/* Template type tabs */}
 <div className="flex flex-wrap gap-6 mb-8 border-b border-black/[0.04] pb-0">
 {TEMPLATE_TYPES.map(({ type, label }) => (
 <button
 key={type}
 onClick={() => selectType(type)}
 className={`bg-transparent border-0 cursor-pointer transition-colors ${
 activeType === type
 ? 'border-b border-black text-black/70 text-[11px] pb-2 font-light'
 : 'text-[11px] text-black/25 hover:text-black/50 pb-2 font-light'
 }`}
 >
 {label}
 </button>
 ))}
 </div>

 {/* Editor card */}
 <div className="bg-white p-7 mb-6">
 <div className="flex items-center justify-between mb-5">
 <div>
 <p className="text-[10px] text-black/30 uppercase tracking-[0.2em] font-light">{activeTpl?.label}</p>
 {templates[activeType]?.updated_at && (
 <p className="text-[10px] text-black/25 mt-1 font-light">
 Zuletzt geändert: {new Date(templates[activeType].updated_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
 </p>
 )}
 </div>
 <button
 onClick={() => setShowVars(v => !v)}
 className="flex items-center gap-1.5 text-[11px] text-black/25 hover:text-black/50 transition-colors bg-transparent border-0 px-2 py-1 font-light"
 >
 <Info size={12} strokeWidth={1.25} />
 Variablen
 {showVars ? <ChevronUp size={12} strokeWidth={1.25} /> : <ChevronDown size={12} strokeWidth={1.25} />}
 </button>
 </div>

 {/* Variables reference */}
 {showVars && (
 <div className="mb-5 py-4 border-b border-black/[0.04]">
 <p className="text-[10px] text-black/25 font-light mb-3">Verfügbare Variablen — klicken zum Einfügen in Body:</p>
 <div className="flex flex-wrap gap-2">
 {VARIABLES.map(({ key, desc }) => (
 <button
 key={key}
 onClick={() => insertVar(key)}
 title={desc}
 className="font-mono text-[10px] border border-black/[0.08] text-black/40 hover:text-black/70 hover:border-black/20 px-2 py-1 transition-colors bg-transparent"
 >
 {key}
 </button>
 ))}
 </div>
 </div>
 )}

 {/* Status message */}
 {msg && (
 <div className="flex items-start gap-2 mb-5">
 {msg.type === 'ok'
 ? <CheckCircle2 size={12} strokeWidth={1.25} className="text-black/25 flex-shrink-0 mt-0.5" />
 : <AlertCircle size={12} strokeWidth={1.25} className="text-black/25 flex-shrink-0 mt-0.5" />
 }
 <p className="text-[10px] text-black/25 font-light">
 {msg.text}
 </p>
 </div>
 )}

 <div className="space-y-5">
 {/* Subject */}
 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Betreff (Subject)</label>
 <input
 className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15"
 value={form.subject}
 onChange={e => setForm(prev => ({ ...prev, subject: e.target.value }))}
 placeholder="E-Mail Betreff..."
 />
 </div>

 {/* Intro */}
 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Einleitungstext (Intro)</label>
 <textarea
 className="w-full px-4 py-3 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15 resize-y"
 rows={3}
 value={form.intro}
 onChange={e => setForm(prev => ({ ...prev, intro: e.target.value }))}
 placeholder="Eröffnungstext der E-Mail..."
 />
 <p className="text-[10px] text-black/25 font-light mt-1">Wird als erste Zeile direkt nach dem Header angezeigt.</p>
 </div>

 {/* Body */}
 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Abschlusstext (Body)</label>
 <textarea
 className="w-full px-4 py-3 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15 resize-y"
 rows={4}
 value={form.body}
 onChange={e => setForm(prev => ({ ...prev, body: e.target.value }))}
 placeholder="Abschluss und zusätzliche Hinweise..."
 />
 <p className="text-[10px] text-black/25 font-light mt-1">Wird als letzter Absatz vor dem Footer angezeigt. Neue Zeile = Zeilenumbruch in der E-Mail.</p>
 </div>

 {/* Save */}
 <div className="pt-2">
 <button
 onClick={handleSave}
 disabled={saving}
 className="px-8 h-11 border border-black text-black text-[11px] bg-transparent hover:bg-black hover:text-white transition-all duration-300 uppercase tracking-[0.2em] font-light disabled:opacity-30"
 >
 {saving ? 'Speichern...' : 'Vorlage speichern'}
 </button>
 </div>
 </div>
 </div>

 {/* Orders reference section */}
 <div className="bg-white overflow-hidden">
 <button
 onClick={() => setShowOrders(v => !v)}
 className="w-full flex items-center justify-between px-6 py-4 bg-transparent hover:bg-black/[0.01] transition-colors border-0 text-left border-b border-black/[0.04]"
 >
 <div className="flex items-center gap-2.5">
 <ShoppingBag size={12} strokeWidth={1.25} className="text-black/25" />
 <span className="text-[11px] text-black/50 font-light">Bestellungen — Referenz</span>
 <span className="text-[10px] text-black/25 font-light">({orders.length} neueste)</span>
 </div>
 {showOrders ? <ChevronUp size={12} strokeWidth={1.25} className="text-black/25" /> : <ChevronDown size={12} strokeWidth={1.25} className="text-black/25" />}
 </button>

 {showOrders && (
 <div>
 {ordersLoading ? (
 <div className="px-6 py-6 flex items-center gap-3">
 <p className="text-[13px] text-black/30 font-light opacity-50">Laden...</p>
 </div>
 ) : orders.length === 0 ? (
 <div className="px-6 py-6 text-center text-[13px] text-black/30 font-light">Noch keine Bestellungen vorhanden.</div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-[13px]">
 <thead>
 <tr className="border-b border-black/[0.04]">
 <th className="text-left px-6 py-4 text-[9px] text-black/20 uppercase tracking-[0.25em] font-light">#</th>
 <th className="text-left px-6 py-4 text-[9px] text-black/20 uppercase tracking-[0.25em] font-light">Kunde</th>
 <th className="text-left px-6 py-4 text-[9px] text-black/20 uppercase tracking-[0.25em] font-light">Schuh</th>
 <th className="text-left px-6 py-4 text-[9px] text-black/20 uppercase tracking-[0.25em] font-light">Preis</th>
 <th className="text-left px-6 py-4 text-[9px] text-black/20 uppercase tracking-[0.25em] font-light">Status</th>
 <th className="text-left px-6 py-4 text-[9px] text-black/20 uppercase tracking-[0.25em] font-light">Datum</th>
 </tr>
 </thead>
 <tbody>
 {orders.map(order => {
 const st = STATUS_LABELS[order.status] || { label: order.status }
 return (
 <tr key={order.id} className="border-b border-black/[0.04] hover:bg-black/[0.01] transition-colors">
 <td className="px-6 py-4 font-mono text-black/30 text-[11px]">#{order.id}</td>
 <td className="px-6 py-4">
 <p className="text-[13px] font-light text-black/70">{order.user_name}</p>
 <p className="text-[11px] text-black/25 font-light">{order.user_email}</p>
 </td>
 <td className="px-6 py-4">
 <p className="text-[13px] font-light text-black/70">{order.shoe_name}</p>
 <p className="text-[11px] text-black/25 font-light">{order.material} · {order.color}</p>
 </td>
 <td className="px-6 py-4 text-[13px] font-light text-black/70">{order.price}</td>
 <td className="px-6 py-4">
 <span className="text-[9px] text-black/30 uppercase tracking-[0.15em] font-light">
 {st.label}
 </span>
 </td>
 <td className="px-6 py-4 text-[11px] text-black/25 font-light">
 {new Date(order.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
 </td>
 </tr>
 )
 })}
 </tbody>
 </table>
 </div>
 )}
 </div>
 )}
 </div>
 </div>
 )
}
