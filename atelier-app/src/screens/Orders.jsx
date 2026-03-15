import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Package, ShoppingBag, Clock, Truck, CheckCircle2, XCircle, ChevronDown, ChevronUp, MapPin, Gift, Banknote } from 'lucide-react'
import useAtelierStore from '../store/atelierStore'

const STATUS_CONFIG = {
  pending_payment: { label: 'Zahlung ausstehend', icon: Banknote,      bg: 'bg-amber-500/10', text: 'text-amber-700' },
  pending:         { label: 'Ausstehend',          icon: Clock,         bg: 'bg-black/5',      text: 'text-black/50'  },
  processing:      { label: 'In Fertigung',        icon: Package,       bg: 'bg-amber-500/10', text: 'text-amber-600' },
  shipped:         { label: 'Versendet',           icon: Truck,         bg: 'bg-blue-500/10',  text: 'text-blue-600'  },
  delivered:       { label: 'Geliefert',           icon: CheckCircle2,  bg: 'bg-teal-500/10',  text: 'text-teal-600'  },
  cancelled:       { label: 'Storniert',           icon: XCircle,       bg: 'bg-red-500/10',   text: 'text-red-500'   },
}

function OrderCard({ order }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
  const StatusIcon = cfg.icon

  const delivery    = order.delivery_address ? JSON.parse(order.delivery_address) : null
  const accessories = order.accessories      ? JSON.parse(order.accessories)      : []

  return (
    <div className="bg-white border border-black/8 overflow-hidden">
      <div className="p-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[12px] text-black leading-tight truncate">{order.shoe_name}</p>
              {order.user_order_number > 0 && (
                <span className="text-[9px] bg-black/5 text-black/40 px-2 py-0.5 flex-shrink-0" style={{ letterSpacing: '0.05em' }}>
                  #{order.user_order_number}
                </span>
              )}
            </div>
            <p className="text-[10px] text-black/35 mt-0.5">{order.material}</p>
            {order.eu_size && (
              <p className="text-[10px] text-black/45 mt-0.5">EU {order.eu_size}</p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[12px] text-black">{order.price}</p>
            <p className="text-[9px] text-black/30 mt-0.5">
              {new Date(order.created_at.replace(' ', 'T') + 'Z').toLocaleDateString('de-DE')}
            </p>
          </div>
        </div>

        {/* Status + expand */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/5">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 ${cfg.bg}`}>
            <StatusIcon size={10} className={cfg.text} />
            <span className={`text-[9px] font-medium ${cfg.text}`} style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>{cfg.label}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[9px] text-black/30" style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>{order.order_ref || `#${order.id}`}</span>
            <button
              onClick={() => setExpanded(v => !v)}
              className="w-7 h-7 bg-black/5 flex items-center justify-center border-0"
            >
              {expanded
                ? <ChevronUp size={13} className="text-black/40" strokeWidth={1.5} />
                : <ChevronDown size={13} className="text-black/40" strokeWidth={1.5} />}
            </button>
          </div>
        </div>
      </div>

      {/* Expandable details */}
      {expanded && (
        <div className="border-t border-black/5 px-4 py-4 bg-[#f6f5f3] space-y-4">

          {accessories.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Gift size={11} className="text-black/30" strokeWidth={1.5} />
                <p className="text-[9px] text-black/35" style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>Zubehör</p>
              </div>
              {accessories.map((a, i) => (
                <div key={i} className="flex justify-between py-1">
                  <span className="text-[11px] text-black/60">{a.name}</span>
                  <span className="text-[11px] text-black">{a.price}</span>
                </div>
              ))}
            </div>
          )}

          {delivery && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <MapPin size={11} className="text-black/30" strokeWidth={1.5} />
                <p className="text-[9px] text-black/35" style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>Lieferadresse</p>
              </div>
              <p className="text-[11px] text-black/60 leading-relaxed">
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
    <div className="flex flex-col h-full bg-white overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-black/5 flex-shrink-0">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center border-0 bg-transparent">
          <ArrowLeft size={18} className="text-black" strokeWidth={1.5} />
        </button>
        <span className="text-[11px] text-black" style={{ letterSpacing: '0.18em', textTransform: 'uppercase' }}>Bestellungen</span>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto px-0 pt-0 pb-4">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-black/5 flex items-center justify-center mb-4">
              <ShoppingBag size={28} className="text-black/20" strokeWidth={1.5} />
            </div>
            <p className="text-[12px] text-black">Noch keine Bestellungen</p>
            <p className="text-[10px] text-black/35 mt-1.5 max-w-[200px] leading-relaxed">
              Ihre Maßschuhe erscheinen hier nach der Bestellung
            </p>
            <button
              onClick={() => navigate('/collection')}
              className="mt-5 px-6 py-3 bg-black text-white text-[10px] border-0"
              style={{ letterSpacing: '0.18em', textTransform: 'uppercase' }}
            >
              Kollektion erkunden
            </button>
          </div>
        ) : (
          <div className="space-y-px bg-black/5">
            {orders.map(order => <OrderCard key={order.id} order={order} />)}
          </div>
        )}
      </div>
    </div>
  )
}
