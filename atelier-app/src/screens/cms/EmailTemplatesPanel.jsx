import { useState, useEffect } from 'react'
import { Mail, Save, CheckCircle2, AlertCircle, Loader, Info, ChevronDown, ChevronUp, ShoppingBag } from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'

const TEMPLATE_TYPES = [
 { type: 'order_confirmation', label: 'Bestellbestätigung', color: 'text-black/40', bg: 'bg-black/5' },
 { type: 'payment', label: 'Zahlungsanweisung', color: 'text-black/40', bg: 'bg-black/5' },
 { type: 'order_confirmed', label: 'Zahlung bestätigt', color: 'text-black/40', bg: 'bg-black/5' },
 { type: 'shipping', label: 'Versandbestätigung', color: 'text-black/40', bg: 'bg-black/5' },
 { type: 'manufacturer', label: 'Hersteller-Benachrichtigung', color: 'text-black/40', bg: 'bg-black/5' },
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
 pending_payment: { label: 'Zahlung ausstehend', color: 'text-black/40', bg: 'bg-black/5' },
 pending: { label: 'Ausstehend', color: 'text-black/40', bg: 'bg-black/5' },
 processing: { label: 'In Fertigung', color: 'text-black/40', bg: 'bg-black/5' },
 shipped: { label: 'Versandt', color: 'text-black/40', bg: 'bg-black/5' },
 delivered: { label: 'Geliefert', color: 'text-black/40',bg: 'bg-black/5'},
 cancelled: { label: 'Storniert', color: 'text-black/40', bg: 'bg-black/5' },
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

 const inp = 'w-full bg-white border border-black/10 px-3.5 py-2.5 text-sm text-black/90 placeholder-black/20 focus:outline-none focus:border-black/20 transition-colors'
 const area = inp + ' resize-none leading-relaxed'
 const activeTpl = TEMPLATE_TYPES.find(t => t.type === activeType)

 if (loading) {
 return (
 <div className="p-8 flex items-center gap-3 text-black/45">
 <Loader size={16} className="animate-spin" /> Laden…
 </div>
 )
 }

 return (
 <div className="p-8">
 {/* Header */}
 <div className="flex items-center gap-3 mb-2">
 <Mail size={18} className="text-black/35" />
 <h1 className="text-xl font-bold text-black/85" style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}>E-Mail Vorlagen</h1>
 </div>
 <p className="text-sm text-black/35 mb-8 ml-7 leading-relaxed">
 Bearbeiten Sie die Texte aller automatischen Kunden-E-Mails. Änderungen sind sofort aktiv —
 kein Neustart erforderlich. Verwenden Sie <code className="bg-black/5 px-1 text-xs text-black/55">{'{{variable}}'}</code> für dynamische Inhalte.
 </p>

 {/* Template type tabs */}
 <div className="flex flex-wrap gap-2 mb-6">
 {TEMPLATE_TYPES.map(({ type, label, color, bg }) => (
 <button
 key={type}
 onClick={() => selectType(type)}
 className={`px-3 py-1.5 text-xs font-medium transition-all border-0 ${
 activeType === type
 ? `${bg} ${color}`
 : 'bg-[#f6f5f3] text-black/35 hover:text-black/65 hover:bg-black/5'
 }`}
 >
 {label}
 </button>
 ))}
 </div>

 {/* Editor card */}
 <div className="border border-black/6 p-6 mb-6">
 <div className="flex items-center justify-between mb-5">
 <div>
 <h2 className="text-sm font-semibold text-black/80">{activeTpl?.label}</h2>
 {templates[activeType]?.updated_at && (
 <p className="text-xs text-black/35 mt-0.5">
 Zuletzt geändert: {new Date(templates[activeType].updated_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
 </p>
 )}
 </div>
 <button
 onClick={() => setShowVars(v => !v)}
 className="flex items-center gap-1.5 text-xs text-black/35 hover:text-black/65 transition-colors bg-transparent border-0 px-2 py-1"
 >
 <Info size={12} />
 Variablen
 {showVars ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
 </button>
 </div>

 {/* Variables reference */}
 {showVars && (
 <div className="mb-5 bg-[#f6f5f3] p-4">
 <p className="text-xs font-medium text-black/45 mb-3">Verfügbare Variablen — klicken zum Einfügen in Body:</p>
 <div className="flex flex-wrap gap-2">
 {VARIABLES.map(({ key, desc }) => (
 <button
 key={key}
 onClick={() => insertVar(key)}
 title={desc}
 className="font-mono text-[10px] bg-white border border-black/10 text-black/55 hover:text-black/90 hover:border-black/20 px-2 py-1 transition-colors"
 >
 {key}
 </button>
 ))}
 </div>
 </div>
 )}

 {/* Status message */}
 {msg && (
 <div className={`flex items-start gap-2 px-4 py-3 mb-5 ${
 msg.type === 'ok' ? 'bg-black/5 border border-black/10' : 'bg-black/5 border border-black/10'
 }`}>
 {msg.type === 'ok'
 ? <CheckCircle2 size={14} className="text-black/40 flex-shrink-0 mt-0.5" />
 : <AlertCircle size={14} className="text-black/40 flex-shrink-0 mt-0.5" />
 }
 <p className={`text-xs leading-relaxed ${msg.type === 'ok' ? 'text-black/50' : 'text-black/40'}`}>
 {msg.text}
 </p>
 </div>
 )}

 <div className="space-y-4">
 {/* Subject */}
 <div>
 <label className="text-xs font-medium text-black/35 block mb-1.5">Betreff (Subject)</label>
 <input
 className={inp}
 value={form.subject}
 onChange={e => setForm(prev => ({ ...prev, subject: e.target.value }))}
 placeholder="E-Mail Betreff..."
 />
 </div>

 {/* Intro */}
 <div>
 <label className="text-xs font-medium text-black/35 block mb-1.5">Einleitungstext (Intro)</label>
 <textarea
 className={area}
 rows={3}
 value={form.intro}
 onChange={e => setForm(prev => ({ ...prev, intro: e.target.value }))}
 placeholder="Eröffnungstext der E-Mail..."
 />
 <p className="text-[9px] text-black/35 mt-1">Wird als erste Zeile direkt nach dem Header angezeigt.</p>
 </div>

 {/* Body */}
 <div>
 <label className="text-xs font-medium text-black/35 block mb-1.5">Abschlusstext (Body)</label>
 <textarea
 className={area}
 rows={4}
 value={form.body}
 onChange={e => setForm(prev => ({ ...prev, body: e.target.value }))}
 placeholder="Abschluss und zusätzliche Hinweise..."
 />
 <p className="text-[9px] text-black/35 mt-1">Wird als letzter Absatz vor dem Footer angezeigt. Neue Zeile = Zeilenumbruch in der E-Mail.</p>
 </div>

 {/* Save */}
 <div className="pt-2">
 <button
 onClick={handleSave}
 disabled={saving}
 className="flex items-center gap-2 bg-black hover:bg-black text-white text-xs font-medium px-4 py-2.5 border-0 transition-colors disabled:opacity-50"
 >
 {saving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
 Vorlage speichern
 </button>
 </div>
 </div>
 </div>

 {/* Orders reference section */}
 <div className="border border-black/6 overflow-hidden">
 <button
 onClick={() => setShowOrders(v => !v)}
 className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-black/5 transition-colors border-0 text-left"
 >
 <div className="flex items-center gap-2.5">
 <ShoppingBag size={14} className="text-black/35" />
 <span className="text-sm font-medium text-black/65">Bestellungen — Referenz</span>
 <span className="text-xs text-black/35">({orders.length} neueste)</span>
 </div>
 {showOrders ? <ChevronUp size={14} className="text-black/35" /> : <ChevronDown size={14} className="text-black/35" />}
 </button>

 {showOrders && (
 <div className="border-t border-black/6">
 {ordersLoading ? (
 <div className="p-6 flex items-center gap-3 text-black/35">
 <Loader size={14} className="animate-spin" /> Laden…
 </div>
 ) : orders.length === 0 ? (
 <div className="p-6 text-center text-sm text-black/35">Noch keine Bestellungen vorhanden.</div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-xs">
 <thead>
 <tr className="border-b border-black/6">
 <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-black/35 font-medium">#</th>
 <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-black/35 font-medium">Kunde</th>
 <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-black/35 font-medium">Schuh</th>
 <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-black/35 font-medium">Preis</th>
 <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-black/35 font-medium">Status</th>
 <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-black/35 font-medium">Datum</th>
 </tr>
 </thead>
 <tbody>
 {orders.map(order => {
 const st = STATUS_LABELS[order.status] || { label: order.status, color: 'text-black/45', bg: 'bg-[#f6f5f3]' }
 return (
 <tr key={order.id} className="border-b border-black/5 hover:bg-black/5/50 transition-colors">
 <td className="px-5 py-3 font-mono text-black/45">#{order.id}</td>
 <td className="px-4 py-3">
 <p className="text-black/80 font-medium">{order.user_name}</p>
 <p className="text-black/35">{order.user_email}</p>
 </td>
 <td className="px-4 py-3">
 <p className="text-black/65">{order.shoe_name}</p>
 <p className="text-black/35">{order.material} · {order.color}</p>
 </td>
 <td className="px-4 py-3 text-black/65 font-medium">{order.price}</td>
 <td className="px-4 py-3">
 <span className={`text-[10px] font-medium px-2 py-0.5 ${st.bg} ${st.color}`}>
 {st.label}
 </span>
 </td>
 <td className="px-4 py-3 text-black/35">
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
