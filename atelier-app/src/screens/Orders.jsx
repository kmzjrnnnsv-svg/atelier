/**
 * Orders.jsx — LV-inspired orders page
 * Warm tones, elegant typography, generous whitespace
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Package, ShoppingBag, Clock, Truck, CheckCircle2, XCircle, Banknote, CreditCard, Scissors, SearchCheck } from 'lucide-react'
import useAtelierStore from '../store/atelierStore'
import CtaBanner from '../components/CtaBanner'

// ── Journey stages ────────────────────────────────────────────────────────────
const JOURNEY_STAGES = [
  { key: 'ordered',    label: 'Bestellung aufgegeben', icon: ShoppingBag,  desc: 'Ihre Bestellung wurde erfolgreich registriert' },
  { key: 'paid',       label: 'Zahlung bestätigt',     icon: CreditCard,   desc: 'Der Zahlungseingang wurde verifiziert' },
  { key: 'crafting',   label: 'In Fertigung',          icon: Scissors,     desc: 'Ihr Schuh wird von Hand gefertigt' },
  { key: 'quality',    label: 'Qualitätskontrolle',    icon: SearchCheck,  desc: 'Jedes Detail wird geprüft' },
  { key: 'shipped',    label: 'Auf dem Weg zu Ihnen',  icon: Truck,        desc: 'Ihr Schuh ist unterwegs' },
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

// ── Journey Map Component ─────────────────────────────────────────────────────
function JourneyMap({ order, onBack }) {
  const activeIdx = getActiveIndex(order.status)
  const isCancelled = order.status === 'cancelled'

  return (
    <div className="min-h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 lg:px-16 pt-4 pb-4 border-b border-black/[0.06] flex-shrink-0">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center bg-transparent border-0">
          <ArrowLeft size={18} strokeWidth={1.5} className="text-black" />
        </button>
        <div>
          <p className="text-[10px] text-black/30 uppercase tracking-[0.2em]">{order.order_ref || `#${order.id}`}</p>
          <p className="text-[13px] text-black font-normal">{order.shoe_name}</p>
        </div>
      </div>

      {/* Journey */}
      <div className="px-5 lg:px-16 py-8 lg:py-12">
        {isCancelled ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <XCircle size={40} strokeWidth={0.8} className="text-black/10 mb-4" />
            <p className="text-[15px] font-light text-black/50">Bestellung storniert</p>
            <p className="text-[12px] text-black/25 mt-2 font-light">Diese Bestellung wurde storniert</p>
          </div>
        ) : (
          <div>
            {/* Title */}
            <div className="text-center mb-10">
              <p className="text-[10px] uppercase tracking-[0.25em] text-black/30 mb-3">Die Reise Ihres Schuhs</p>
              <p className="text-[24px] lg:text-[28px] font-extralight text-black tracking-tight">{order.shoe_name}</p>
              <p className="text-[12px] text-black/35 mt-2 font-light">{order.material} · {order.color}</p>
            </div>

            {/* Path */}
            <div className="relative ml-5 max-w-lg mx-auto">
              {/* Line */}
              <div className="absolute left-[11px] top-0 bottom-0 w-px">
                <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                  <line x1="0.5" y1="0" x2="0.5" y2="100%" stroke="rgba(0,0,0,0.06)" strokeWidth="1" strokeDasharray="4 4" />
                </svg>
                <div
                  className="absolute top-0 left-0 w-full bg-black transition-all duration-1000 ease-out"
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
                  <div key={stage.key} className="relative flex items-start gap-5 pb-8 last:pb-0">
                    {/* Node */}
                    <div className="relative flex-shrink-0 z-10">
                      {isActive && (
                        <div className="absolute inset-0 -m-1.5 rounded-full border border-black/15 animate-pulse" />
                      )}
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                        isComplete
                          ? 'bg-black text-white'
                          : 'bg-white border border-dashed border-black/10 text-black/15'
                      } ${isActive ? 'w-7 h-7 -ml-0.5' : ''}`}>
                        <Icon size={isActive ? 13 : 11} strokeWidth={isComplete ? 1.5 : 1} />
                      </div>
                    </div>

                    {/* Content */}
                    <div className={`pt-0.5 transition-all ${isFuture ? 'opacity-25' : ''}`}>
                      <p className={`text-[13px] leading-tight ${isActive ? 'text-black font-normal' : isComplete ? 'text-black/60 font-light' : 'text-black/25 font-light'}`}>
                        {stage.label}
                      </p>
                      {(isComplete || isActive) && (
                        <p className="text-[11px] text-black/30 mt-1 font-light">{stage.desc}</p>
                      )}
                      {isActive && (
                        <span className="inline-block mt-2 text-[9px] uppercase tracking-[0.2em] text-black/30 font-light">Aktuell</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Order info */}
            <div className="max-w-lg mx-auto mt-10 pt-6 border-t border-black/[0.06]">
              {[
                { label: 'Bestellt am', value: new Date(order.created_at.replace(' ', 'T') + 'Z').toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' }) },
                { label: 'Preis', value: order.price },
                ...(order.eu_size ? [{ label: 'Größe', value: `EU ${order.eu_size}` }] : []),
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center py-2">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-black/25 font-light">{row.label}</span>
                  <span className="text-[13px] text-black/60 font-light">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_LABELS = {
  pending_payment: 'Zahlung ausstehend',
  pending:         'Ausstehend',
  processing:      'In Fertigung',
  quality_check:   'Qualitätskontrolle',
  shipped:         'Versendet',
  delivered:       'Geliefert',
  cancelled:       'Storniert',
}

const FILTER_TABS = [
  { key: 'all',       label: 'Alle' },
  { key: 'active',    label: 'Aktiv' },
  { key: 'delivered', label: 'Geliefert' },
  { key: 'cancelled', label: 'Storniert' },
]

// ── Order Card ───────────────────────────────────────────────────────────────
function OrderCard({ order, onSelect }) {
  const activeIdx = getActiveIndex(order.status)
  const progress = order.status === 'cancelled' ? 0 : Math.round((activeIdx / (JOURNEY_STAGES.length - 1)) * 100)

  return (
    <button onClick={() => onSelect(order)} className="w-full text-left bg-transparent border-0 py-5 px-5 lg:px-16 transition-all hover:bg-black/[0.01] border-b border-black/[0.06]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-black font-normal leading-tight truncate">{order.shoe_name}</p>
          <p className="text-[11px] text-black/30 mt-1 font-light">{order.material} · {order.color}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[13px] text-black font-normal">{order.price}</p>
          <p className="text-[10px] text-black/25 mt-0.5 font-light">
            {new Date(order.created_at.replace(' ', 'T') + 'Z').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="mt-3 pt-3 border-t border-black/[0.04]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-[0.15em] text-black/30 font-light">{STATUS_LABELS[order.status] || order.status}</span>
          <span className="text-[10px] text-black/20 font-light">{order.order_ref || `#${order.id}`}</span>
        </div>
        <div className="h-px bg-black/[0.06] overflow-hidden">
          <div className="h-full bg-black transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[9px] text-black/15 font-light">Bestellt</span>
          <span className="text-[9px] text-black/15 font-light">Geliefert</span>
        </div>
      </div>
    </button>
  )
}

// ── Main Orders ───────────────────────────────────────────────────────────────
export default function Orders() {
  const navigate = useNavigate()
  const { orders } = useAtelierStore()
  const [filter, setFilter] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState(null)

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

  return (
    <div className="min-h-full bg-white">

      {/* ── Hero header ─────────────────────────────────────────── */}
      <div className="px-5 lg:px-16 pt-8 lg:pt-14 pb-6 lg:pb-10">
        <p className="text-[10px] lg:text-[11px] text-black/30 uppercase tracking-[0.25em] mb-3">Atelier Kollektion</p>
        <h1 className="text-[32px] lg:text-[44px] font-extralight text-black leading-[1.1] tracking-tight">
          Bestellungen
        </h1>
        <p className="text-[13px] lg:text-[15px] text-black/40 mt-3 lg:mt-4 max-w-lg leading-[1.7] font-light">
          Verfolgen Sie den Status Ihrer Maßanfertigungen.
        </p>
      </div>

      {/* ── Filter tabs ────────────────────────────────────────── */}
      {orders.length > 0 && (
        <div className="px-5 lg:px-16 pb-5 lg:pb-8 border-b border-black/[0.06]">
          <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {FILTER_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`flex-shrink-0 px-4 py-2 text-[11px] lg:text-[12px] border-0 bg-transparent transition-all ${
                  filter === tab.key
                    ? 'text-black font-medium'
                    : 'text-black/30 hover:text-black/60'
                }`}
                style={{
                  letterSpacing: '0.06em',
                  borderBottom: filter === tab.key ? '2px solid black' : '2px solid transparent',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────────── */}
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center px-5">
          <ShoppingBag size={32} className="text-black/10 mb-4" strokeWidth={1} />
          <p className="text-[14px] font-light text-black/60">Noch keine Bestellungen</p>
          <p className="text-[12px] text-black/30 mt-2 max-w-[260px] leading-relaxed font-light">
            Ihre Maßschuhe erscheinen hier nach der Bestellung.
          </p>
          <button
            onClick={() => navigate('/collection')}
            className="mt-6 px-8 h-12 bg-[#19110B] text-white text-[11px] border border-[#19110B] hover:bg-white hover:text-[#19110B] transition-all duration-300"
            style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}
          >
            Kollektion erkunden
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[12px] text-black/30 font-light">Keine Bestellungen in dieser Kategorie</p>
        </div>
      ) : (
        <div>
          {filtered.map(order => (
            <OrderCard key={order.id} order={order} onSelect={setSelectedOrder} />
          ))}
        </div>
      )}

      {/* ── CTA Banner (CMS-controlled) ──────────────────────── */}
      <div className="px-5 lg:px-16 pb-16 pt-8">
        <CtaBanner page="orders" />
      </div>
    </div>
  )
}
