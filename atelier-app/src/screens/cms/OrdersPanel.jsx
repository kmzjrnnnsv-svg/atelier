// @refresh reset
import { useState, useEffect, useCallback } from 'react'
import { ShoppingBag, RefreshCw, CheckCircle2, Clock, Package, Truck, XCircle, Banknote, ChevronDown, ChevronUp, User } from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import MFAModal from '../../components/MFAModal'

const STATUS_CONFIG = {
 pending_payment: { label: 'Zahlung ausstehend', color: 'bg-black/15 text-black/70', dot: 'bg-black/15' },
 pending: { label: 'Ausstehend', color: 'bg-black/8 text-black/50', dot: 'bg-black/15' },
 processing: { label: 'In Fertigung', color: 'bg-black/8 text-black/50', dot: 'bg-black/25' },
 shipped: { label: 'Versendet', color: 'bg-black/8 text-black/50', dot: 'bg-black/40' },
 delivered: { label: 'Geliefert', color: 'bg-black/8 text-black/50', dot: 'bg-black/60' },
 cancelled: { label: 'Storniert', color: 'bg-black/8 text-black/50', dot: 'bg-black/10' },
}

const FILTERS = [
 { key: 'all', label: 'Alle' },
 { key: 'pending_payment', label: 'Zahlung offen' },
 { key: 'processing', label: 'In Fertigung' },
 { key: 'shipped', label: 'Versendet' },
 { key: 'delivered', label: 'Geliefert' },
 { key: 'cancelled', label: 'Storniert' },
]

const NEXT_STATUSES = {
 pending_payment: ['processing', 'cancelled'],
 pending: ['processing', 'cancelled'],
 processing: ['shipped', 'cancelled'],
 shipped: ['delivered', 'cancelled'],
 delivered: [],
 cancelled: [],
}

const STATUS_LABELS = {
 processing: 'Zahlung bestätigen → Fertigung',
 shipped: 'Als versendet markieren',
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
 <div className="bg-white border border-black/6 overflow-hidden hover:bg-black/3 transition-colors">
 {/* Row header */}
 <div className="flex items-center gap-3 px-4 py-3">
 {/* Status dot */}
 <div className={`w-2 h-2 flex-shrink-0 ${cfg.dot}`} />

 {/* Order info */}
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <span className="text-xs font-bold text-black/90">{order.order_ref || `#${order.id}`}</span>
 <span className="text-[10px] text-black/45 truncate">{order.shoe_name}</span>
 {order.user_order_number > 0 && (
 <span className="text-[9px] bg-black/8 text-black/50 px-1.5 py-0.5">
 {order.user_order_number}. Schuh
 </span>
 )}
 </div>
 <div className="flex items-center gap-3 mt-0.5">
 <span className="text-[10px] text-black/45 flex items-center gap-1">
 <User size={9} strokeWidth={1.5} /> {order.user_name}
 </span>
 <span className="text-[10px] text-black/45">{order.price}</span>
 <span className="text-[10px] text-black/35">
 {new Date(order.created_at.replace(' ', 'T') + 'Z').toLocaleDateString('de-DE')}
 </span>
 </div>
 </div>

 {/* Status badge */}
 <span className={`text-[10px] font-medium px-2 py-0.5 flex-shrink-0 ${cfg.color}`}>
 {cfg.label}
 </span>

 {/* Expand */}
 <button
 onClick={() => setExpanded(v => !v)}
 className="w-7 h-7 bg-black/5 flex items-center justify-center flex-shrink-0 border-0 hover:bg-black/10 transition-colors"
 >
 {expanded
 ? <ChevronUp size={12} strokeWidth={1.5} className="text-black/45" />
 : <ChevronDown size={12} strokeWidth={1.5} className="text-black/45" />}
 </button>
 </div>

 {/* Expanded details */}
 {expanded && (
 <div className="border-t border-black/6 px-4 py-4 space-y-4 bg-[#f6f5f3]">

 {/* Customer */}
 <div>
 <p className="text-[10px] font-medium text-black/30 uppercase tracking-wider mb-1.5">Kunde</p>
 <p className="text-xs text-black/65">{order.user_name}</p>
 <p className="text-[10px] text-black/45">{order.user_email}</p>
 <p className="text-[9px] text-black/35 mt-0.5">USER-{String(order.user_id).padStart(5, '0')}</p>
 </div>

 {/* Shoe details */}
 <div>
 <p className="text-[10px] font-medium text-black/30 uppercase tracking-wider mb-1.5">Bestellung</p>
 <p className="text-xs text-black/65">{order.shoe_name}</p>
 <p className="text-[10px] text-black/45">{order.material} · {order.color}</p>
 {order.eu_size && (
 <p className="text-[10px] text-black/50 mt-0.5">EU {order.eu_size} · 3D-Scan</p>
 )}
 </div>

 {/* Accessories */}
 {accessories.length > 0 && (
 <div>
 <p className="text-[10px] font-medium text-black/30 uppercase tracking-wider mb-1.5">Zubehör</p>
 {accessories.map((a, i) => (
 <div key={i} className="flex justify-between text-[10px]">
 <span className="text-black/45">{a.name}</span>
 <span className="text-black/65">{a.price}</span>
 </div>
 ))}
 </div>
 )}

 {/* Delivery address */}
 {delivery && (
 <div>
 <p className="text-[10px] font-medium text-black/30 uppercase tracking-wider mb-1.5">Lieferadresse</p>
 <p className="text-[10px] text-black/45 leading-relaxed">
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
 <div className="pt-2 border-t border-black/6 flex flex-wrap gap-2">
 {nextOptions.map(s => (
 <button
 key={s}
 disabled={updating}
 onClick={() => handleStatus(s)}
 className={`text-[10px] font-medium px-3 py-2 border-0 transition-all disabled:opacity-50 ${
 s === 'cancelled'
 ? 'bg-black/8 text-black/40 hover:bg-black/12'
 : s === 'processing'
 ? 'bg-black text-white hover:bg-black/85'
 : 'bg-black/8 text-black/50 hover:bg-black/12'
 }`}
 >
 {updating ? '…' : STATUS_LABELS[s] || s}
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
 <div className="p-8 min-h-full">
 {/* Header */}
 <div className="flex items-center justify-between mb-6">
 <div>
 <div className="flex items-center gap-3 mb-1">
 <ShoppingBag size={18} strokeWidth={1.5} className="text-black/35" />
 <h1 className="text-xl font-bold text-black/85" style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>Bestellungen</h1>
 {pendingPaymentCount > 0 && (
 <span className="bg-black/15 text-black/70 text-[10px] font-medium px-2 py-0.5">
 {pendingPaymentCount} Zahlung offen
 </span>
 )}
 </div>
 <p className="text-xs text-black/45">{orders.length} Bestellungen gesamt</p>
 </div>
 <button
 onClick={load}
 disabled={loading}
 className="flex items-center gap-2 bg-black/5 hover:bg-black/10 text-black/65 text-xs px-3 py-2 border-0 transition-colors disabled:opacity-50"
 >
 <RefreshCw size={12} strokeWidth={1.5} className={loading ? 'animate-spin' : ''} />
 Aktualisieren
 </button>
 </div>

 {/* Filter tabs */}
 <div className="flex gap-1.5 flex-wrap mb-5">
 {FILTERS.map(f => (
 <button
 key={f.key}
 onClick={() => setFilter(f.key)}
 className={`text-xs font-medium px-3 py-1.5 border-0 transition-all ${
 filter === f.key
 ? 'bg-black text-white'
 : 'bg-black/5 text-black/45 hover:bg-black/10 hover:text-black/90'
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
 <div className="w-6 h-6 border-2 border-black/15 border-t-black animate-spin" />
 </div>
 ) : filtered.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-20 text-center">
 <ShoppingBag size={32} strokeWidth={1.5} className="text-black/20 mb-3" />
 <p className="text-sm text-black/45">Keine Bestellungen</p>
 </div>
 ) : (
 <div className="space-y-2">
 {filtered.map(order => (
 <OrderRow key={order.id} order={order} onStatusChange={handleStatusChange} isAdmin={isAdmin} />
 ))}
 </div>
 )}
 </div>
 )
}
