// @refresh reset
import { useState, useEffect, useCallback } from 'react'
import { ShoppingBag, RefreshCw, CheckCircle2, Clock, Package, Truck, XCircle, Banknote, ChevronDown, ChevronUp, User } from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import MFAModal from '../../components/MFAModal'

const STATUS_CONFIG = {
 pending_payment: { label: 'Zahlung ausstehend', color: 'bg-black/[0.06] text-black/50', dot: 'bg-black/15' },
 pending: { label: 'Ausstehend', color: 'bg-black/[0.04] text-black/40', dot: 'bg-black/15' },
 processing: { label: 'In Fertigung', color: 'bg-black/[0.04] text-black/40', dot: 'bg-black/25' },
 quality_check: { label: 'Qualitätskontrolle', color: 'bg-black/[0.04] text-black/40', dot: 'bg-black/35' },
 shipped: { label: 'Versendet', color: 'bg-black/[0.04] text-black/40', dot: 'bg-black/40' },
 delivered: { label: 'Geliefert', color: 'bg-black/[0.04] text-black/40', dot: 'bg-black/60' },
 cancelled: { label: 'Storniert', color: 'bg-black/[0.04] text-black/30', dot: 'bg-black/10' },
}

const FILTERS = [
 { key: 'all', label: 'Alle' },
 { key: 'pending_payment', label: 'Zahlung offen' },
 { key: 'processing', label: 'In Fertigung' },
 { key: 'quality_check', label: 'Qualitätskontrolle' },
 { key: 'shipped', label: 'Versendet' },
 { key: 'delivered', label: 'Geliefert' },
 { key: 'cancelled', label: 'Storniert' },
]

const NEXT_STATUSES = {
 pending_payment: ['processing', 'cancelled'],
 pending: ['processing', 'cancelled'],
 processing: ['quality_check', 'cancelled'],
 quality_check: ['shipped', 'cancelled'],
 shipped: ['delivered', 'cancelled'],
 delivered: [],
 cancelled: [],
}

const STATUS_LABELS = {
 processing: 'Zahlung bestätigen → Fertigung',
 quality_check: 'Zur Qualitätskontrolle',
 shipped: 'QC bestanden → Versand',
 delivered: 'Als geliefert markieren',
 cancelled: 'Stornieren',
}

function OrderRow({ order, onStatusChange, isAdmin }) {
 const [expanded, setExpanded] = useState(false)
 const [updating, setUpdating] = useState(false)
 const [mfaOpen, setMfaOpen] = useState(false)
 const [mfaErr, setMfaErr] = useState(null)
 const [pendingStatus, setPendingStatus] = useState(null)
 const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending

 const delivery = order.delivery_address ? JSON.parse(order.delivery_address) : null
 const accessories = order.accessories ? JSON.parse(order.accessories) : []

 // Build visible actions — payment confirmation is admin-only
 const nextOptions = (NEXT_STATUSES[order.status] || []).filter(s => {
 if (s === 'processing' && order.status === 'pending_payment') return isAdmin
 return true
 })

 const doStatusUpdate = async (newStatus, mfaCode) => {
 setUpdating(true)
 try {
 const headers = mfaCode ? { 'X-MFA-Code': mfaCode } : {}
 await apiFetch(`/api/orders/${order.id}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }), headers })
 onStatusChange(order.id, newStatus)
 setMfaOpen(false)
 } catch (e) {
 if (e?.code === 'MFA_INVALID') { setMfaErr(e.error); return }
 if (e?.code === 'MFA_NOT_SETUP') {
 setMfaOpen(false)
 alert('MFA nicht eingerichtet. Bitte zuerst MFA in Admin-Einstellungen aktivieren.')
 return
 }
 if (e?.code === 'MFA_REQUIRED') { setMfaErr('Code erforderlich'); return }
 console.error(e)
 } finally { setUpdating(false) }
 }

 const handleStatus = (newStatus) => {
 // Payment confirmation requires MFA modal
 if (newStatus === 'processing' && order.status === 'pending_payment') {
 setPendingStatus(newStatus)
 setMfaErr(null)
 setMfaOpen(true)
 return
 }
 doStatusUpdate(newStatus, null)
 }

 const handleMfaConfirm = (code) => {
 doStatusUpdate(pendingStatus, code)
 }

 return (
 <div className="bg-white overflow-hidden border-b border-black/[0.04]">
 {/* Row header */}
 <div className="bg-white px-6 py-4 hover:bg-black/[0.01] transition-all flex items-center gap-3 cursor-pointer" onClick={() => setExpanded(v => !v)}>
 {/* Status dot */}
 <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />

 {/* Order info */}
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2.5 flex-wrap">
 <span className="text-[11px] font-light text-black/85 tracking-wide">{order.order_ref || `#${order.id}`}</span>
 <span className="text-[10px] text-black/30 font-light truncate">{order.shoe_name}</span>
 {order.user_order_number > 0 && (
 <span className="text-[9px] text-black/25 font-light px-2 py-0.5 bg-black/[0.03] tracking-wider uppercase">
 {order.user_order_number}. Schuh
 </span>
 )}
 </div>
 <div className="flex items-center gap-3 mt-1">
 <span className="text-[10px] text-black/30 font-light flex items-center gap-1">
 <User size={9} strokeWidth={1.5} /> {order.user_name}
 </span>
 <span className="text-[10px] text-black/30 font-light">{order.price}</span>
 <span className="text-[10px] text-black/20 font-light">
 {new Date(order.created_at.replace(' ', 'T') + 'Z').toLocaleDateString('de-DE')}
 </span>
 </div>
 </div>

 {/* Status badge */}
 <span className={`text-[9px] font-light px-2.5 py-1 uppercase tracking-wider flex-shrink-0 ${cfg.color}`}>
 {cfg.label}
 </span>

 {/* Expand */}
 <button
 onClick={(e) => { e.stopPropagation(); setExpanded(v => !v) }}
 className="w-7 h-7 flex items-center justify-center flex-shrink-0 border-0 bg-transparent hover:bg-black/[0.03] transition-colors"
 >
 {expanded
 ? <ChevronUp size={12} strokeWidth={1} className="text-black/25" />
 : <ChevronDown size={12} strokeWidth={1} className="text-black/25" />}
 </button>
 </div>

 {/* Expanded details */}
 {expanded && (
 <div className="px-6 py-5 bg-[#fafaf9] border-t border-black/[0.04] space-y-4">

 {/* Customer */}
 <div>
 <p className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Kunde</p>
 <p className="text-[12px] text-black/60 font-light">{order.user_name}</p>
 <p className="text-[10px] text-black/35 font-light">{order.user_email}</p>
 <p className="text-[9px] text-black/20 mt-0.5 font-light">USER-{String(order.user_id).padStart(5, '0')}</p>
 </div>

 {/* Shoe details */}
 <div>
 <p className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Bestellung</p>
 <p className="text-[12px] text-black/60 font-light">{order.shoe_name}</p>
 <p className="text-[10px] text-black/35 font-light">{order.material} · {order.color}</p>
 {order.eu_size && (
 <p className="text-[10px] text-black/40 mt-0.5 font-light">EU {order.eu_size} · 3D-Scan</p>
 )}
 </div>

 {/* Accessories */}
 {accessories.length > 0 && (
 <div>
 <p className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Zubehör</p>
 {accessories.map((a, i) => (
 <div key={i} className="flex justify-between text-[10px]">
 <span className="text-black/35 font-light">{a.name}</span>
 <span className="text-black/50 font-light">{a.price}</span>
 </div>
 ))}
 </div>
 )}

 {/* Delivery address */}
 {delivery && (
 <div>
 <p className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Lieferadresse</p>
 <p className="text-[10px] text-black/35 font-light leading-relaxed">
 {delivery.name}<br />
 {delivery.street}<br />
 {delivery.zip} {delivery.city}<br />
 {delivery.country}
 {delivery.phone && <><br />{delivery.phone}</>}
 </p>
 </div>
 )}

 {/* Actions */}
 {nextOptions.length > 0 && (
 <div className="pt-3 border-t border-black/[0.04] flex flex-wrap gap-2">
 {nextOptions.map(s => (
 <button
 key={s}
 disabled={updating}
 onClick={() => handleStatus(s)}
 className={`disabled:opacity-50 transition-all ${
 s === 'cancelled'
 ? 'text-[10px] font-light px-4 py-2 border border-black/10 text-black/30 hover:border-black/25 hover:text-black/50 bg-transparent'
 : s === 'processing'
 ? 'text-[10px] font-light px-4 py-2 border border-black text-black hover:bg-black hover:text-white bg-transparent'
 : 'text-[10px] font-light px-4 py-2 border border-black text-black hover:bg-black hover:text-white bg-transparent'
 }`}
 >
 {updating ? '...' : STATUS_LABELS[s] || s}
 </button>
 ))}
 </div>
 )}
 </div>
 )}

 <MFAModal
 open={mfaOpen}
 title="Zahlung bestätigen"
 onClose={() => setMfaOpen(false)}
 onConfirm={handleMfaConfirm}
 loading={updating}
 error={mfaErr}
 />
 </div>
 )
}

export default function OrdersPanel() {
 const { user } = useAuth()
 const isAdmin = user?.role === 'admin'
 const [orders, setOrders] = useState([])
 const [loading, setLoading] = useState(true)
 const [filter, setFilter] = useState('all')

 const load = useCallback(async () => {
 setLoading(true)
 try {
 const rows = await apiFetch('/api/orders/all')
 setOrders(Array.isArray(rows) ? rows : [])
 } catch (e) {
 console.error(e)
 } finally {
 setLoading(false)
 }
 }, [])

 useEffect(() => { load() }, [load])

 const handleStatusChange = (id, newStatus) => {
 setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o))
 }

 const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)

 const counts = {}
 for (const o of orders) counts[o.status] = (counts[o.status] || 0) + 1
 const pendingPaymentCount = counts['pending_payment'] || 0

 return (
 <div className="px-10 py-10 lg:px-14 lg:py-12 min-h-full">
 {/* Header */}
 <div className="flex items-center justify-between mb-8">
 <div>
 <p className="text-[9px] text-black/20 uppercase tracking-[0.3em] mb-3 font-light">Verwaltung</p>
 <div className="flex items-center gap-3 mb-0">
 <h1 className="text-[28px] font-extralight text-black/85 tracking-tight">Bestellungen</h1>
 {pendingPaymentCount > 0 && (
 <span className="text-[9px] font-light px-2.5 py-1 uppercase tracking-wider bg-black/[0.06] text-black/50">
 {pendingPaymentCount} Zahlung offen
 </span>
 )}
 </div>
 <p className="text-[13px] text-black/30 mt-2 font-light">{orders.length} Bestellungen gesamt</p>
 </div>
 <button
 onClick={load}
 disabled={loading}
 className="flex items-center gap-2 px-4 h-9 text-[11px] text-black/25 hover:text-black/50 bg-transparent border-0 transition-colors font-light disabled:opacity-50"
 >
 <RefreshCw size={12} strokeWidth={1.5} className={loading ? 'animate-spin' : ''} />
 Aktualisieren
 </button>
 </div>

 {/* Filter tabs */}
 <div className="flex gap-1 flex-wrap mb-6">
 {FILTERS.map(f => (
 <button
 key={f.key}
 onClick={() => setFilter(f.key)}
 className={`transition-all ${
 filter === f.key
 ? 'px-3.5 py-1.5 text-[10px] bg-black text-white border-0 tracking-wider font-light'
 : 'px-3.5 py-1.5 text-[10px] text-black/25 hover:text-black/50 bg-transparent border-0 tracking-wider font-light'
 }`}
 >
 {f.label}
 {f.key !== 'all' && counts[f.key] ? ` (${counts[f.key]})` : ''}
 {f.key === 'all' ? ` (${orders.length})` : ''}
 </button>
 ))}
 </div>

 {/* List */}
 {loading ? (
 <div className="flex items-center justify-center py-20">
 <div className="w-5 h-5 rounded-full border border-black/10 border-t-black/40 animate-spin" />
 </div>
 ) : filtered.length === 0 ? (
 <div className="text-center py-20">
 <ShoppingBag size={28} strokeWidth={1} className="text-black/15 mx-auto mb-3" />
 <p className="text-[13px] text-black/25 font-light">Keine Bestellungen</p>
 </div>
 ) : (
 <div className="bg-white">
 {filtered.map(order => (
 <OrderRow key={order.id} order={order} onStatusChange={handleStatusChange} isAdmin={isAdmin} />
 ))}
 </div>
 )}
 </div>
 )
}
