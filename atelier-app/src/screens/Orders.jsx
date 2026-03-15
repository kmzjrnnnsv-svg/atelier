import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Package, ShoppingBag, Clock, Truck, CheckCircle2, XCircle, ChevronDown, ChevronUp, MapPin, Gift, Banknote } from 'lucide-react'
import useAtelierStore from '../store/atelierStore'

const STATUS_CONFIG = {
  pending_payment: { label: 'Zahlung ausstehend', icon: Banknote,      bg: 'bg-yellow-50', text: 'text-yellow-700' },
  pending:         { label: 'Ausstehend',          icon: Clock,         bg: 'bg-gray-100',  text: 'text-gray-600'  },
  processing:      { label: 'In Fertigung',        icon: Package,       bg: 'bg-amber-50',  text: 'text-amber-600' },
  shipped:         { label: 'Versendet',           icon: Truck,         bg: 'bg-blue-50',   text: 'text-blue-600'  },
  delivered:       { label: 'Geliefert',           icon: CheckCircle2,  bg: 'bg-teal-50',   text: 'text-teal-600'  },
  cancelled:       { label: 'Storniert',           icon: XCircle,       bg: 'bg-red-50',    text: 'text-red-500'   },
}

function OrderCard({ order }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
  const StatusIcon = cfg.icon

  const delivery    = order.delivery_address ? JSON.parse(order.delivery_address) : null
  const accessories = order.accessories      ? JSON.parse(order.accessories)      : []

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="p-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-black leading-tight truncate">{order.shoe_name}</p>
              {order.user_order_number > 0 && (
                <span className="text-[9px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
                  #{order.user_order_number}. Schuh
                </span>
              )}
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">{order.material}</p>
            {order.eu_size && (
              <p className="text-[10px] text-teal-600 mt-0.5">EU {order.eu_size} — aus 3D-Scan</p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-bold text-black">{order.price}</p>
            <p className="text-[9px] text-gray-400 mt-0.5">
              {new Date(order.created_at.replace(' ', 'T') + 'Z').toLocaleDateString('de-DE')}
            </p>
          </div>
        </div>

        {/* Status + expand */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${cfg.bg}`}>
            <StatusIcon size={10} className={cfg.text} />
            <span className={`text-[9px] font-semibold uppercase tracking-wide ${cfg.text}`}>{cfg.label}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[9px] text-gray-400 uppercase tracking-widest">{order.order_ref || `#${order.id}`}</span>
            <button
              onClick={() => setExpanded(v => !v)}
              className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center border-0"
            >
              {expanded
                ? <ChevronUp size={13} className="text-gray-500" strokeWidth={2} />
                : <ChevronDown size={13} className="text-gray-500" strokeWidth={2} />}
            </button>
          </div>
        </div>
      </div>

      {/* Expandable details */}
      {expanded && (
        <div className="border-t border-gray-50 px-4 py-4 bg-gray-50/50 space-y-4">

          {accessories.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Gift size={11} className="text-gray-400" strokeWidth={1.8} />
                <p className="text-[9px] uppercase tracking-widest text-gray-400 font-semibold">Zubehör</p>
              </div>
              {accessories.map((a, i) => (
                <div key={i} className="flex justify-between py-1">
                  <span className="text-[12px] text-gray-600">{a.name}</span>
                  <span className="text-[12px] font-semibold text-black">{a.price}</span>
                </div>
              ))}
            </div>
          )}

          {delivery && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <MapPin size={11} className="text-gray-400" strokeWidth={1.8} />
                <p className="text-[9px] uppercase tracking-widest text-gray-400 font-semibold">Lieferadresse</p>
              </div>
              <p className="text-[12px] text-gray-600 leading-relaxed">
                {delivery.name}<br />
                {delivery.street}<br />
                {delivery.zip} {delivery.city}<br />
                {delivery.country}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Orders() {
  const navigate = useNavigate()
  const { orders } = useAtelierStore()

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      <div className="bg-white flex items-center justify-between px-5 pt-4 pb-4 border-b border-gray-100 flex-shrink-0">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center border-0">
          <ArrowLeft size={18} strokeWidth={1.8} className="text-gray-800" />
        </button>
        <span className="text-sm font-bold tracking-wide text-black">Meine Bestellungen</span>
        <div className="w-9" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <ShoppingBag size={28} className="text-gray-300" strokeWidth={1.5} />
            </div>
            <p className="text-base font-semibold text-black">Noch keine Bestellungen</p>
            <p className="text-[11px] text-gray-400 mt-1.5 max-w-[200px] leading-relaxed">
              Ihre Maßschuhe erscheinen hier nach der Bestellung
            </p>
            <button
              onClick={() => navigate('/collection')}
              className="mt-5 px-6 py-3 bg-black text-white text-[10px] font-bold uppercase tracking-widest rounded-2xl border-0"
            >
              Kollektion erkunden
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => <OrderCard key={order.id} order={order} />)}
          </div>
        )}
      </div>
    </div>
  )
}
