import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Package, ShoppingBag, Clock, Truck, CheckCircle2, XCircle, Banknote, Award, CreditCard, Scissors, SearchCheck, MapPin } from 'lucide-react'
import useAtelierStore from '../store/atelierStore'

// ── Journey stages ────────────────────────────────────────────────────────────
const JOURNEY_STAGES = [
  { key: 'ordered',    label: 'Bestellung aufgegeben', icon: ShoppingBag,  desc: 'Ihre Bestellung wurde erfolgreich registriert' },
  { key: 'paid',       label: 'Zahlung bestätigt',     icon: CreditCard,   desc: 'Der Zahlungseingang wurde verifiziert' },
  { key: 'crafting',   label: 'In Fertigung',          icon: Scissors,     desc: 'Ihr Schuh wird von Hand gefertigt' },
  { key: 'quality',    label: 'Qualitätskontrolle',    icon: SearchCheck,  desc: 'Jedes Detail wird geprüft' },
  { key: 'shipped',    label: 'Auf dem Weg zu dir',    icon: Truck,        desc: 'Ihr Schuh ist unterwegs' },
  { key: 'delivered',  label: 'Angekommen',            icon: CheckCircle2, desc: 'Viel Freude mit Ihrem Schuh' },
]

function getActiveIndex(status) {
  switch (status) {
    case 'pending_payment': return 0
    case 'pending':         return 1
    case 'processing':      return 2
    case 'quality_check':   return 3
    case 'shipped':         return 4
    case 'delivered':       return 5
    case 'cancelled':       return -1
    default:                return 0
  }
}

// ── Shoe SVG icon for the path ────────────────────────────────────────────────
function ShoeIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M21.5 13.5c0-.5-.2-1-.5-1.3l-3-3c-.4-.4-1-.7-1.5-.7h-3l-1.5-3c-.3-.5-.8-.8-1.3-.8H7.5c-.8 0-1.5.7-1.5 1.5v2.3c0 .5.2 1 .5 1.3l.5.5v1.7c0 .8-.3 1.5-.8 2H3c-.6 0-1 .4-1 1s.4 1 1 1h17c1.1 0 2-.9 2-2v-1.5h-.5z" />
    </svg>
  )
}

// ── Journey Map Component ─────────────────────────────────────────────────────
function JourneyMap({ order, onBack }) {
  const activeIdx = getActiveIndex(order.status)
  const isCancelled = order.status === 'cancelled'

  return (
    <div className="flex flex-col bg-[#f9f7f4]" style={{ height: 'calc(100dvh - 48px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-3 pb-2 border-b border-black/5 flex-shrink-0 bg-white">
        <button onClick={onBack} className="w-9 h-9 bg-black/3 flex items-center justify-center border-0">
          <ArrowLeft size={18} strokeWidth={1.8} className="text-black/70" />
        </button>
        <div className="text-center">
          <p className="text-[10px] font-bold text-black uppercase" style={{ letterSpacing: '0.15em' }}>{order.shoe_name}</p>
          <p className="text-[8px] text-black/35" style={{ letterSpacing: '0.1em' }}>{order.order_ref || `#${order.id}`}</p>
        </div>
        <div className="w-9" />
      </div>

      {/* Journey */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {isCancelled ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <XCircle size={40} strokeWidth={1} className="text-black/15 mb-3" />
            <p className="text-sm font-bold text-black/40">Bestellung storniert</p>
            <p className="text-[10px] text-black/25 mt-1">Diese Bestellung wurde storniert</p>
          </div>
        ) : (
          <div className="relative">
            {/* Title */}
            <div className="text-center mb-6">
              <p className="text-[8px] uppercase tracking-widest text-black/30 mb-1">Die Reise Ihres Schuhs</p>
              <p className="text-lg font-bold text-black font-playfair">{order.shoe_name}</p>
              <p className="text-[9px] text-black/40 mt-0.5">{order.material} · {order.color}</p>
            </div>

            {/* Path */}
            <div className="relative ml-5">
              {/* SVG dashed path line */}
              <div className="absolute left-[11px] top-0 bottom-0 w-px">
                {/* Background dashed line */}
                <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                  <line x1="0.5" y1="0" x2="0.5" y2="100%" stroke="rgba(0,0,0,0.1)" strokeWidth="1" strokeDasharray="4 4" />
                </svg>
                {/* Filled progress line */}
                <div
                  className="absolute top-0 left-0 w-full bg-black transition-all duration-1000 ease-out animate-draw-path"
                  style={{ height: `${Math.min(100, (activeIdx / (JOURNEY_STAGES.length - 1)) * 100)}%` }}
                />
              </div>

              {/* Stages */}
              {JOURNEY_STAGES.map((stage, i) => {
                const Icon = stage.icon
                const isComplete = i <= activeIdx
                const isActive = i === activeIdx
                const isFuture = i > activeIdx

                return (
                  <div
                    key={stage.key}
                    className="relative flex items-start gap-4 pb-8 last:pb-0 animate-fade-up"
                    style={{ animationDelay: `${i * 120}ms` }}
                  >
                    {/* Node */}
                    <div className="relative flex-shrink-0 z-10">
                      {isActive && (
                        <div className="absolute inset-0 -m-1.5 rounded-full border-2 border-black/20 animate-pulse-ring" />
                      )}
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                        isComplete
                          ? 'bg-black text-white shadow-md'
                          : 'bg-white border-2 border-dashed border-black/15 text-black/20'
                      } ${isActive ? 'w-7 h-7 -ml-0.5' : ''}`}>
                        <Icon size={isActive ? 14 : 12} strokeWidth={isComplete ? 2 : 1.5} />
                      </div>
                    </div>

                    {/* Content */}
                    <div className={`pt-0.5 transition-all ${isFuture ? 'opacity-30' : ''}`}>
                      <p className={`text-xs leading-tight ${isActive ? 'font-bold text-black' : isComplete ? 'font-semibold text-black/70' : 'font-medium text-black/30'}`}>
                        {stage.label}
                      </p>
                      {(isComplete || isActive) && (
                        <p className="text-[9px] text-black/35 mt-0.5">{stage.desc}</p>
                      )}
                      {isActive && !isCancelled && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <ShoeIcon className="w-3.5 h-3.5 text-black/50 animate-walk-shoe" />
                          <span className="text-[8px] uppercase tracking-widest text-black/35 font-bold">Aktuell</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Order info footer */}
            <div className="mt-6 pt-4 border-t border-black/8">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[8px] uppercase tracking-widest text-black/30">Bestellt am</span>
                <span className="text-[10px] text-black/50">
                  {new Date(order.created_at.replace(' ', 'T') + 'Z').toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[8px] uppercase tracking-widest text-black/30">Preis</span>
                <span className="text-xs font-bold text-black">{order.price}</span>
              </div>
              {order.eu_size && (
                <div className="flex justify-between items-center">
                  <span className="text-[8px] uppercase tracking-widest text-black/30">Größe</span>
                  <span className="text-[10px] text-black/50">EU {order.eu_size}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Status config for list cards ──────────────────────────────────────────────
const STATUS_CONFIG = {
  pending_payment: { label: 'Zahlung ausstehend', icon: Banknote,      bg: 'bg-amber-50',  text: 'text-amber-600' },
  pending:         { label: 'Ausstehend',          icon: Clock,         bg: 'bg-black/5',   text: 'text-black/40' },
  processing:      { label: 'In Fertigung',        icon: Package,       bg: 'bg-teal-50',   text: 'text-teal-600' },
  quality_check:   { label: 'Qualitätskontrolle',  icon: SearchCheck,   bg: 'bg-purple-50', text: 'text-purple-600' },
  shipped:         { label: 'Versendet',           icon: Truck,         bg: 'bg-blue-50',   text: 'text-blue-600' },
  delivered:       { label: 'Geliefert',           icon: CheckCircle2,  bg: 'bg-green-50',  text: 'text-green-600' },
  cancelled:       { label: 'Storniert',           icon: XCircle,       bg: 'bg-black/4',   text: 'text-black/30' },
}

const FILTER_TABS = [
  { key: 'all',       label: 'Alle' },
  { key: 'active',    label: 'Aktiv' },
  { key: 'delivered', label: 'Geliefert' },
  { key: 'cancelled', label: 'Storniert' },
]

// ── Order list card ───────────────────────────────────────────────────────────
function OrderCard({ order, onSelect }) {
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
  const StatusIcon = cfg.icon
  const activeIdx = getActiveIndex(order.status)
  const progress = order.status === 'cancelled' ? 0 : Math.round((activeIdx / (JOURNEY_STAGES.length - 1)) * 100)

  return (
    <button onClick={() => onSelect(order)} className="w-full text-left bg-white border-0 p-4 transition-all active:bg-black/[0.02]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-black leading-tight truncate">{order.shoe_name}</p>
          <p className="text-[9px] text-black/35 mt-0.5">{order.material} · {order.color}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs font-bold text-black">{order.price}</p>
          <p className="text-[8px] text-black/25 mt-0.5">
            {new Date(order.created_at.replace(' ', 'T') + 'Z').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Progress bar + status */}
      <div className="mt-3 pt-2.5 border-t border-black/5">
        <div className="flex items-center justify-between mb-1.5">
          <div className={`flex items-center gap-1 px-2 py-0.5 ${cfg.bg}`}>
            <StatusIcon size={9} className={cfg.text} strokeWidth={1.5} />
            <span className={`text-[8px] font-semibold ${cfg.text}`} style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}>{cfg.label}</span>
          </div>
          <span className="text-[8px] text-black/25" style={{ letterSpacing: '0.08em' }}>{order.order_ref || `#${order.id}`}</span>
        </div>
        {/* Mini progress track */}
        <div className="h-1 bg-black/5 overflow-hidden">
          <div
            className="h-full bg-black transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[7px] text-black/20">Bestellt</span>
          <span className="text-[7px] text-black/20">Geliefert</span>
        </div>
      </div>
    </button>
  )
}

// ── Main Orders ───────────────────────────────────────────────────────────────
export default function Orders() {
  const navigate = useNavigate()
  const { orders, loyaltyStatus } = useAtelierStore()
  const [filter, setFilter] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState(null)

  // If an order is selected, show journey map
  if (selectedOrder) {
    return <JourneyMap order={selectedOrder} onBack={() => setSelectedOrder(null)} />
  }

  const filtered = orders.filter(o => {
    if (filter === 'all') return true
    if (filter === 'active') return ['pending_payment', 'pending', 'processing', 'quality_check', 'shipped'].includes(o.status)
    if (filter === 'delivered') return o.status === 'delivered'
    if (filter === 'cancelled') return o.status === 'cancelled'
    return true
  })

  const totalSpent = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + (parseInt(String(o.price).replace(/[^0-9]/g, ''), 10) || 0), 0)

  return (
    <div className="flex flex-col bg-white" style={{ height: 'calc(100dvh - 48px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-3 pb-2.5 border-b border-black/5 flex-shrink-0">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center border-0 bg-transparent">
          <ArrowLeft size={18} className="text-black" strokeWidth={1.5} />
        </button>
        <div className="text-center">
          <p className="text-[10px] font-bold text-black" style={{ letterSpacing: '0.18em', textTransform: 'uppercase' }}>Bestellungen</p>
        </div>
        <div className="w-9" />
      </div>

      <div className="flex-1 overflow-y-auto">
        {orders.length > 0 && (
          <>
            {/* Stats */}
            <div className="flex items-center justify-between px-5 py-2.5 border-b border-black/5">
              <div className="text-center flex-1">
                <p className="text-sm text-black font-medium">{orders.length}</p>
                <p className="text-[7px] text-black/30" style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>Bestellungen</p>
              </div>
              <div className="w-px h-7 bg-black/5" />
              <div className="text-center flex-1">
                <p className="text-sm text-black font-medium">{totalSpent > 0 ? `${totalSpent}€` : '—'}</p>
                <p className="text-[7px] text-black/30" style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>Geliefert</p>
              </div>
              <div className="w-px h-7 bg-black/5" />
              <div className="text-center flex-1">
                <p className="text-sm text-black font-medium">{loyaltyStatus.points.toLocaleString()}</p>
                <p className="text-[7px] text-black/30" style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>Punkte</p>
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 px-5 py-2.5 overflow-x-auto border-b border-black/5">
              {FILTER_TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`px-3 py-1.5 text-[8px] whitespace-nowrap border transition-all ${
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
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 bg-black/5 flex items-center justify-center mb-3">
                <ShoppingBag size={24} className="text-black/20" strokeWidth={1.5} />
              </div>
              <p className="text-xs text-black">Noch keine Bestellungen</p>
              <p className="text-[9px] text-black/35 mt-1 max-w-[200px] leading-relaxed">
                Ihre Maßschuhe erscheinen hier nach der Bestellung
              </p>
              <button
                onClick={() => navigate('/collection')}
                className="mt-4 px-5 py-2.5 bg-black text-white text-[9px] border-0"
                style={{ letterSpacing: '0.18em', textTransform: 'uppercase' }}
              >
                Kollektion erkunden
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[10px] text-black/35">Keine Bestellungen in dieser Kategorie</p>
            </div>
          ) : (
            <div className="divide-y divide-black/5">
              {filtered.map(order => (
                <OrderCard key={order.id} order={order} onSelect={setSelectedOrder} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
