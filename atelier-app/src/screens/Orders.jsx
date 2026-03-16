import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Package, ShoppingBag, Clock, Truck, CheckCircle2, XCircle, ChevronDown, ChevronUp, MapPin, Gift, Banknote, Award } from 'lucide-react'
import useAtelierStore from '../store/atelierStore'

const STATUS_CONFIG = {
  pending_payment: { label: 'Zahlung ausstehend', icon: Banknote,      bg: 'bg-black/8',  text: 'text-black/50' },
  pending:         { label: 'Ausstehend',          icon: Clock,         bg: 'bg-black/5',  text: 'text-black/40' },
  processing:      { label: 'In Fertigung',        icon: Package,       bg: 'bg-black/8',  text: 'text-black/50' },
  shipped:         { label: 'Versendet',           icon: Truck,         bg: 'bg-black/10', text: 'text-black/60' },
  delivered:       { label: 'Geliefert',           icon: CheckCircle2,  bg: 'bg-black/5',  text: 'text-black/50' },
  cancelled:       { label: 'Storniert',           icon: XCircle,       bg: 'bg-black/4',  text: 'text-black/30' },
}

const FILTER_TABS = [
  { key: 'all',       label: 'Alle' },
  { key: 'active',    label: 'Aktiv' },
  { key: 'delivered', label: 'Geliefert' },
  { key: 'cancelled', label: 'Storniert' },
]

function OrderCard({ order }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
  const StatusIcon = cfg.icon

  const delivery    = order.delivery_address ? JSON.parse(order.delivery_address) : null
  const accessories = order.accessories      ? JSON.parse(order.accessories)      : []
  const pointsEarned = order.status === 'delivered' ? parseInt(String(order.price).replace(/[^0-9]/g, ''), 10) || 0 : 0

  return (
    <div className="bg-white border border-black/5 overflow-hidden">
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
            <p className="text-[10px] text-black/35 mt-0.5">{order.material} · {order.color}</p>
            {order.eu_size && (
              <p className="text-[10px] text-black/45 mt-0.5">EU {order.eu_size}</p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[12px] text-black">{order.price}</p>
            <p className="text-[9px] text-black/30 mt-0.5">
              {new Date(order.created_at.replace(' ', 'T') + 'Z').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Status + expand */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/5">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 ${cfg.bg}`}>
            <StatusIcon size={10} className={cfg.text} strokeWidth={1.5} />
            <span className={`text-[9px] font-medium ${cfg.text}`} style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>{cfg.label}</span>
          </div>
          <div className="flex items-center gap-3">
            {pointsEarned > 0 && (
              <div className="flex items-center gap-1 text-black/30">
                <Award size={9} strokeWidth={1.5} />
                <span className="text-[8px]">+{pointsEarned} Pkt.</span>
              </div>
            )}
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

          {/* Order timeline */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Clock size={11} className="text-black/30" strokeWidth={1.5} />
              <p className="text-[9px] text-black/35" style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>Verlauf</p>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-[10px] text-black/50">Bestellt</span>
                <span className="text-[10px] text-black/35">
                  {new Date(order.created_at.replace(' ', 'T') + 'Z').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {order.updated_at !== order.created_at && (
                <div className="flex justify-between">
                  <span className="text-[10px] text-black/50">Letztes Update</span>
                  <span className="text-[10px] text-black/35">
                    {new Date(order.updated_at.replace(' ', 'T') + 'Z').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </div>
          </div>

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

          {pointsEarned > 0 && (
            <div className="flex items-center gap-2 pt-2 border-t border-black/5">
              <Award size={12} className="text-black/30" strokeWidth={1.5} />
              <span className="text-[10px] text-black/40">+{pointsEarned} Loyalty-Punkte verdient</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Orders() {
  const navigate = useNavigate()
  const { orders, loyaltyStatus } = useAtelierStore()
  const [filter, setFilter] = useState('all')

  const filtered = orders.filter(o => {
    if (filter === 'all') return true
    if (filter === 'active') return ['pending_payment', 'pending', 'processing', 'shipped'].includes(o.status)
    if (filter === 'delivered') return o.status === 'delivered'
    if (filter === 'cancelled') return o.status === 'cancelled'
    return true
  })

  const totalSpent = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + (parseInt(String(o.price).replace(/[^0-9]/g, ''), 10) || 0), 0)

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-black/5 flex-shrink-0">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center border-0 bg-transparent">
          <ArrowLeft size={18} className="text-black" strokeWidth={1.5} />
        </button>
        <div className="text-center">
          <p className="text-[11px] text-black" style={{ letterSpacing: '0.18em', textTransform: 'uppercase' }}>Bestellungen</p>
          <p className="text-[9px] text-black/30" style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}>Historie</p>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto">
        {orders.length > 0 && (
          <>
            {/* Stats summary */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-black/5">
              <div className="text-center flex-1">
                <p className="text-[14px] text-black font-medium">{orders.length}</p>
                <p className="text-[8px] text-black/30" style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>Bestellungen</p>
              </div>
              <div className="w-px h-8 bg-black/5" />
              <div className="text-center flex-1">
                <p className="text-[14px] text-black font-medium">{totalSpent > 0 ? `${totalSpent}€` : '—'}</p>
                <p className="text-[8px] text-black/30" style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>Geliefert</p>
              </div>
              <div className="w-px h-8 bg-black/5" />
              <div className="text-center flex-1">
                <p className="text-[14px] text-black font-medium">{loyaltyStatus.points.toLocaleString()}</p>
                <p className="text-[8px] text-black/30" style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>Punkte</p>
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 px-5 py-3 overflow-x-auto border-b border-black/5">
              {FILTER_TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`px-3 py-1.5 text-[9px] whitespace-nowrap border transition-all ${
                    filter === tab.key ? 'bg-black text-white border-black' : 'bg-transparent text-black/40 border-black/10'
                  }`}
                  style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="pb-4">
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
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[11px] text-black/35">Keine Bestellungen in dieser Kategorie</p>
            </div>
          ) : (
            <div className="space-y-px bg-black/3">
              {filtered.map(order => <OrderCard key={order.id} order={order} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
