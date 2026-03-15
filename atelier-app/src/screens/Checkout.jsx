import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Check, ChevronRight, MapPin, Receipt, Gift, ShoppingBag, Plus, Minus, CheckCircle2 } from 'lucide-react'
import { apiFetch } from '../hooks/useApi'
import useAtelierStore from '../store/atelierStore'

// ── Accessories catalogue ─────────────────────────────────────────────────────
const ACCESSORIES = [
  { id: 'shoetrees',   name: 'Zedernholz Schuhspanner',  desc: 'Formerhalt & Feuchtigkeitskontrolle',  price: '€ 45',  priceNum: 45  },
  { id: 'carekit',    name: 'Lederpflege-Set',            desc: 'Creme, Bürste & Tuch',                price: '€ 35',  priceNum: 35  },
  { id: 'dustbag',    name: 'Samtbeutel',                 desc: 'Schutzaufbewahrung aus Baumwolle',    price: '€ 25',  priceNum: 25  },
  { id: 'shoehorn',   name: 'Messing-Schuhlöffel',        desc: 'Handgraviert, 38 cm',                  price: '€ 20',  priceNum: 20  },
  { id: 'belt',       name: 'Passendes Ledergürtel',      desc: 'Gleiche Haut & Farbe wie der Schuh',  price: '€ 180', priceNum: 180 },
]

// ── Step indicator ────────────────────────────────────────────────────────────
const STEPS = ['Lieferung', 'Rechnung', 'Zubehör', 'Übersicht']

function StepBar({ current }) {
  return (
    <div className="flex items-center px-6 py-4">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center" style={{ flex: i < STEPS.length - 1 ? '1 1 0' : 'none' }}>
          <div className="flex flex-col items-center gap-1">
            <div className={`w-7 h-7 flex items-center justify-center text-[10px] font-bold transition-all ${
              i < current  ? 'bg-black text-white' :
              i === current ? 'bg-black text-white ring-2 ring-black ring-offset-2' :
              'bg-black/5 text-black/30'
            }`}>
              {i < current ? <Check size={12} strokeWidth={2.5} /> : i + 1}
            </div>
            <span className={`text-[8px] uppercase whitespace-nowrap ${i === current ? 'text-black font-bold' : 'text-black/30'}`} style={{ letterSpacing: '0.12em' }}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-px flex-1 mx-2 mb-4 transition-all ${i < current ? 'bg-black' : 'bg-black/10'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Address form ──────────────────────────────────────────────────────────────
function AddressForm({ title, value, onChange, sameToggle }) {
  const f = (field, val) => onChange({ ...value, [field]: val })
  const inp = 'w-full border border-black/10 px-4 py-3 text-sm placeholder-black/20 focus:outline-none focus:border-black transition-colors'
  return (
    <div>
      <h2 className="text-base font-bold text-black mb-4 uppercase" style={{ letterSpacing: '0.12em' }}>{title}</h2>
      {sameToggle}
      <div className="space-y-3">
        <input className={inp} placeholder="Vollständiger Name" value={value.name || ''} onChange={e => f('name', e.target.value)} />
        <input className={inp} placeholder="Straße + Hausnummer" value={value.street || ''} onChange={e => f('street', e.target.value)} />
        <div className="flex gap-3">
          <input className={inp} placeholder="PLZ" value={value.zip || ''} onChange={e => f('zip', e.target.value)} style={{ width: '35%' }} />
          <input className={inp} placeholder="Stadt" value={value.city || ''} onChange={e => f('city', e.target.value)} style={{ flex: 1 }} />
        </div>
        <input className={inp} placeholder="Land" value={value.country || ''} onChange={e => f('country', e.target.value)} />
        <input className={inp} placeholder="Telefon (optional)" value={value.phone || ''} onChange={e => f('phone', e.target.value)} />
      </div>
    </div>
  )
}

function isAddrComplete(a) {
  return a.name && a.street && a.zip && a.city && a.country
}

// ── Accessory card ────────────────────────────────────────────────────────────
function AccessoryCard({ item, selected, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-4 p-4 border-2 transition-all text-left ${
        selected ? 'border-black bg-black/3' : 'border-black/8 bg-white'
      }`}
    >
      <div className={`w-10 h-10 flex items-center justify-center flex-shrink-0 ${
        selected ? 'bg-black text-white' : 'bg-black/5 text-black/30'
      }`}>
        {selected ? <Check size={16} strokeWidth={2.5} /> : <Plus size={16} strokeWidth={2} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-black leading-tight">{item.name}</p>
        <p className="text-[10px] text-black/40 mt-0.5">{item.desc}</p>
      </div>
      <span className="text-sm font-bold text-black flex-shrink-0">{item.price}</span>
    </button>
  )
}

// ── Main Checkout ─────────────────────────────────────────────────────────────
export default function Checkout() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { latestScan, placeOrder } = useAtelierStore()

  // Product from navigation state
  const product = location.state?.product || {}

  const [step,        setStep]        = useState(0)
  const [delivery,    setDelivery]    = useState({ name:'', street:'', zip:'', city:'', country:'Deutschland', phone:'' })
  const [sameBilling, setSameBilling] = useState(true)
  const [billing,     setBilling]     = useState({ name:'', street:'', zip:'', city:'', country:'Deutschland', phone:'' })
  const [selectedAcc, setSelectedAcc] = useState([])
  const [placing,     setPlacing]     = useState(false)
  const [placed,      setPlaced]      = useState(null)
  const [error,       setError]       = useState(null)

  const toggleAcc = id =>
    setSelectedAcc(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const chosenAccessories = ACCESSORIES.filter(a => selectedAcc.includes(a.id))

  // Parse shoe price to compute total
  const shoePrice = parseFloat((product.price || '€ 0').replace(/[^0-9.]/g, '')) || 0
  const accTotal  = chosenAccessories.reduce((sum, a) => sum + a.priceNum, 0)
  const total     = shoePrice + accTotal

  const canNext = step === 0 ? isAddrComplete(delivery)
    : step === 1 ? (sameBilling || isAddrComplete(billing))
    : true

  const handleNext = () => {
    if (step < 3) setStep(s => s + 1)
  }

  const handlePlace = async () => {
    setPlacing(true)
    setError(null)
    try {
      const billingAddr = sameBilling ? delivery : billing
      const row = await placeOrder({
        shoe_id:          product.id,
        shoe_name:        product.name || product.shoe_name,
        material:         product.material,
        color:            product.color || product.selectedColor || '',
        price:            `€ ${total.toLocaleString('de-DE')}`,
        eu_size:          latestScan?.eu_size || null,
        scan_id:          latestScan?.id || null,
        delivery_address: delivery,
        billing_address:  billingAddr,
        accessories:      chosenAccessories.map(a => ({ name: a.name, price: a.price })),
      })
      setPlaced(row)
    } catch (e) {
      setError(e?.error || 'Bestellung fehlgeschlagen. Bitte erneut versuchen.')
    } finally {
      setPlacing(false)
    }
  }

  // ── Order success ──
  if (placed) {
    return (
      <div className="flex flex-col h-full bg-white overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 pt-16 pb-8">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 bg-black flex items-center justify-center mb-4">
              <CheckCircle2 size={28} className="text-white" strokeWidth={1.5} />
            </div>
            <h1 className="text-xl font-bold text-black mb-1 uppercase" style={{ letterSpacing: '0.12em' }}>Bestellung aufgegeben</h1>
            <p className="text-[11px] text-black/40">
              #{placed.id} · Ihr {placed.user_order_number}. Schuh bei ATELIER
            </p>
          </div>

          {/* Bank transfer card */}
          <div className="bg-teal-50 border border-teal-200 p-5 mb-4">
            <p className="text-[9px] uppercase tracking-widest text-teal-700 font-bold mb-3">Banküberweisung</p>
            <p className="text-[11px] text-black/50 mb-4 leading-relaxed">
              Bitte überweisen Sie den Betrag — Ihre Bestellung wird nach Zahlungseingang freigegeben.
            </p>
            <div className="space-y-2.5">
              {[
                { label: 'Betrag',       value: `€ ${total.toLocaleString('de-DE')}`, big: true },
                { label: 'Kontoinhaber', value: placed.bank_holder },
                { label: 'Bank',         value: placed.bank_name   },
                { label: 'IBAN',         value: placed.bank_iban, mono: true },
                { label: 'BIC',          value: placed.bank_bic,  mono: true },
              ].map(({ label, value, big, mono }) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <span className="text-[9px] uppercase tracking-widest text-black/40 flex-shrink-0">{label}</span>
                  <span className={`text-right break-all ${big ? 'text-base font-bold text-teal-700' : mono ? 'text-[11px] font-mono font-semibold text-black/70' : 'text-[11px] font-semibold text-black/70'}`}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-teal-200">
              <p className="text-[9px] uppercase tracking-widest text-black/50 mb-2">Verwendungszweck (pflicht)</p>
              <div className="bg-black px-4 py-2.5 text-center">
                <span className="text-white font-mono font-bold tracking-widest text-base">ATELIER-{placed.id}</span>
              </div>
            </div>
          </div>

          {/* Order summary */}
          <div className="bg-[#f6f5f3] p-4 mb-4">
            <p className="text-[9px] uppercase tracking-widest text-black/40 mb-3">Bestellung</p>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-semibold text-black">{placed.shoe_name}</span>
              <span className="text-sm font-bold text-black">{product.price}</span>
            </div>
            {chosenAccessories.map(a => (
              <div key={a.id} className="flex justify-between">
                <span className="text-[11px] text-black/50">{a.name}</span>
                <span className="text-[11px] text-black/50">{a.price}</span>
              </div>
            ))}
            <div className="border-t border-black/10 mt-3 pt-3 flex justify-between">
              <span className="text-sm font-bold text-black">Total</span>
              <span className="text-sm font-bold text-black">€ {total.toLocaleString('de-DE')}</span>
            </div>
          </div>

          <p className="text-[10px] text-black/40 text-center mb-6">
            Zahlungsanweisung wurde an Ihre E-Mail-Adresse gesendet.
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/orders')}
              className="flex-1 py-3.5 border-2 border-black text-sm font-bold text-black bg-white uppercase" style={{ letterSpacing: '0.18em' }}
            >
              Meine Bestellungen
            </button>
            <button
              onClick={() => navigate('/collection')}
              className="flex-1 py-3.5 bg-black text-sm font-bold text-white border-0 uppercase" style={{ letterSpacing: '0.18em' }}
            >
              Weiter shoppen
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-black/5 flex-shrink-0">
        <button
          onClick={() => step > 0 ? setStep(s => s - 1) : navigate(-1)}
          className="w-9 h-9 bg-black/3 flex items-center justify-center border-0"
        >
          <ArrowLeft size={18} strokeWidth={1.8} className="text-black/70" />
        </button>
        <span className="text-sm font-bold text-black uppercase" style={{ letterSpacing: '0.12em' }}>Checkout</span>
        <div className="w-9" />
      </div>

      <StepBar current={step} />

      <div className="flex-1 overflow-y-auto px-5 pb-4">

        {/* ── Step 0: Delivery Address ── */}
        {step === 0 && (
          <AddressForm
            title="Lieferadresse"
            value={delivery}
            onChange={setDelivery}
            sameToggle={null}
          />
        )}

        {/* ── Step 1: Billing Address ── */}
        {step === 1 && (
          <div>
            <button
              onClick={() => setSameBilling(v => !v)}
              className="w-full flex items-center gap-3 p-4 border-2 mb-5 transition-all text-left bg-transparent"
              style={{ border: sameBilling ? '2px solid #000' : '2px solid rgba(0,0,0,0.08)' }}
            >
              <div className={`w-5 h-5 border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                sameBilling ? 'bg-black border-black' : 'border-black/20'
              }`}>
                {sameBilling && <Check size={11} strokeWidth={3} className="text-white" />}
              </div>
              <span className="text-sm font-semibold text-black">Rechnungsadresse = Lieferadresse</span>
            </button>
            {!sameBilling && (
              <AddressForm
                title="Rechnungsadresse"
                value={billing}
                onChange={setBilling}
                sameToggle={null}
              />
            )}
          </div>
        )}

        {/* ── Step 2: Accessories ── */}
        {step === 2 && (
          <div>
            <h2 className="text-base font-bold text-black mb-1 uppercase" style={{ letterSpacing: '0.12em' }}>Zubehör & Accessoires</h2>
            <p className="text-[11px] text-black/40 mb-5">Ergänzen Sie Ihre Bestellung mit passendem Zubehör.</p>
            <div className="space-y-3">
              {ACCESSORIES.map(item => (
                <AccessoryCard
                  key={item.id}
                  item={item}
                  selected={selectedAcc.includes(item.id)}
                  onToggle={() => toggleAcc(item.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Step 3: Summary ── */}
        {step === 3 && (
          <div>
            <h2 className="text-base font-bold text-black mb-5 uppercase" style={{ letterSpacing: '0.12em' }}>Bestellübersicht</h2>

            {/* Shoe */}
            <div className="bg-[#f6f5f3] p-4 mb-4">
              <p className="text-[9px] uppercase tracking-widest text-black/40 mb-3">Schuh</p>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-bold text-black">{product.name || product.shoe_name}</p>
                  <p className="text-[10px] text-black/40 mt-0.5">{product.material}{product.sole ? ` · ${product.sole}` : ''}</p>
                  {latestScan && (
                    <p className="text-[10px] text-teal-600 mt-0.5">EU {latestScan.eu_size} — aus 3D-Scan</p>
                  )}
                </div>
                <p className="text-sm font-bold text-black">{product.price}</p>
              </div>
            </div>

            {/* Accessories */}
            {chosenAccessories.length > 0 && (
              <div className="bg-[#f6f5f3] p-4 mb-4">
                <p className="text-[9px] uppercase tracking-widest text-black/40 mb-3">Zubehör</p>
                {chosenAccessories.map(a => (
                  <div key={a.id} className="flex justify-between py-1.5 border-b border-black/5 last:border-0">
                    <span className="text-sm text-black/60">{a.name}</span>
                    <span className="text-sm font-semibold text-black">{a.price}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Addresses */}
            <div className="bg-[#f6f5f3] p-4 mb-4">
              <p className="text-[9px] uppercase tracking-widest text-black/40 mb-2">Lieferadresse</p>
              <p className="text-[12px] text-black/60 leading-relaxed">
                {delivery.name}<br />{delivery.street}<br />{delivery.zip} {delivery.city}<br />{delivery.country}
              </p>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between py-4 border-t-2 border-black">
              <span className="text-base font-bold text-black">Gesamtbetrag</span>
              <span className="text-xl font-bold text-black">€ {total.toLocaleString('de-DE')}</span>
            </div>

            {error && (
              <p className="text-[11px] text-red-500 mt-2 text-center">{error}</p>
            )}
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="px-5 pt-3 border-t border-black/5 flex-shrink-0" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 20px)' }}>
        {step < 3 ? (
          <button
            onClick={handleNext}
            disabled={!canNext}
            className={`w-full py-4 flex items-center justify-center gap-2 font-bold text-sm transition-all border-0 uppercase ${
              canNext ? 'bg-black text-white active:scale-[.98]' : 'bg-black/5 text-black/20'
            }`}
            style={{ letterSpacing: '0.18em' }}
          >
            {STEPS[step + 1]} <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        ) : (
          <button
            onClick={handlePlace}
            disabled={placing}
            className="w-full py-4 flex items-center justify-center gap-2 bg-black text-white font-bold text-sm uppercase active:scale-[.98] border-0 disabled:opacity-60"
            style={{ letterSpacing: '0.18em' }}
          >
            {placing ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin" /> Wird verarbeitet…</>
            ) : (
              <><ShoppingBag size={16} strokeWidth={2} /> Jetzt bestellen — € {total.toLocaleString('de-DE')}</>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
