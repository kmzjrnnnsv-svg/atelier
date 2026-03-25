import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { isNative } from '../App'
import { ArrowLeft, Check, ChevronRight, MapPin, Receipt, Gift, ShoppingBag, Plus, Minus, CheckCircle2, X, Ticket } from 'lucide-react'
import { apiFetch } from '../hooks/useApi'
import useAtelierStore from '../store/atelierStore'

// Accessories are loaded from the DB via shoeAccessoryMap in the store

// ── Step indicator ────────────────────────────────────────────────────────────
const STEPS = ['Warenkorb', 'Lieferung', 'Rechnung', 'Zubehör', 'Übersicht']

function StepBar({ current }) {
  return (
    <div className="flex items-center px-6 py-3 flex-shrink-0">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center" style={{ flex: i < STEPS.length - 1 ? '1 1 0' : 'none' }}>
          <div className="flex flex-col items-center gap-0.5">
            <div className={`w-6 h-6 flex items-center justify-center text-[9px] font-bold transition-all ${
              i < current  ? 'bg-black text-white' :
              i === current ? 'bg-black text-white ring-2 ring-black ring-offset-2' :
              'bg-black/5 text-black/30'
            }`}>
              {i < current ? <Check size={10} strokeWidth={2.5} /> : i + 1}
            </div>
            <span className={`text-[7px] uppercase whitespace-nowrap ${i === current ? 'text-black font-bold' : 'text-black/30'}`} style={{ letterSpacing: '0.1em' }}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-px flex-1 mx-1.5 mb-3 transition-all ${i < current ? 'bg-black' : 'bg-black/10'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Address form ──────────────────────────────────────────────────────────────
function AddressForm({ title, value, onChange, sameToggle }) {
  const f = (field, val) => onChange({ ...value, [field]: val })
  const inp = 'w-full border border-black/10 px-3 py-2.5 text-sm placeholder-black/20 focus:outline-none focus:border-black transition-colors'
  return (
    <div>
      <h2 className="text-sm font-bold text-black mb-3 uppercase" style={{ letterSpacing: '0.12em' }}>{title}</h2>
      {sameToggle}
      <div className="space-y-2.5">
        <input className={inp} placeholder="Vollständiger Name" value={value.name || ''} onChange={e => f('name', e.target.value)} />
        <input className={inp} placeholder="Straße + Hausnummer" value={value.street || ''} onChange={e => f('street', e.target.value)} />
        <div className="flex gap-2.5">
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
      className={`w-full flex items-center gap-3 p-3 border-2 transition-all text-left ${
        selected ? 'border-black bg-black/3' : 'border-black/8 bg-white'
      }`}
    >
      <div className={`w-8 h-8 flex items-center justify-center flex-shrink-0 ${
        selected ? 'bg-black text-white' : 'bg-black/5 text-black/30'
      }`}>
        {selected ? <Check size={14} strokeWidth={2.5} /> : <Plus size={14} strokeWidth={2} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-black leading-tight">{item.name}</p>
        <p className="text-[9px] text-black/40 mt-0.5">{item.desc}</p>
      </div>
      <span className="text-xs font-bold text-black flex-shrink-0">{item.price}</span>
    </button>
  )
}

// Parse German-formatted price string: "€ 1.485" → 1485, "€ 1.485,50" → 1485.5
function parsePrice(str) {
  if (!str) return 0
  const cleaned = str.replace(/[^0-9.,]/g, '') // keep digits, dots, commas
    .replace(/\./g, '')           // remove dots (thousands separator)
    .replace(',', '.')            // comma → decimal point
  return parseFloat(cleaned) || 0
}

// Format price as German locale string: 8910 → "8.910"
function fmtPrice(n) {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

// ── Main Checkout ─────────────────────────────────────────────────────────────
export default function Checkout() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { latestScan, placeOrder, footNotes, cart, removeFromCart, updateCartQty, clearCart, savedDeliveryAddress, savedBillingAddress, saveAddresses, validateCoupon, shoeAccessoryMap } = useAtelierStore()

  // Product from navigation state (legacy single-product flow)
  const product = location.state?.product || {}
  const incomingAccessories = location.state?.accessories || []

  // If arriving from TopBar cart icon (no product in state), start at step 0 (cart view)
  // If arriving from Customize with a product, skip to step 1 (delivery)
  const startStep = product.id ? 1 : 0

  const emptyAddr = { name:'', street:'', zip:'', city:'', country:'Deutschland', phone:'' }
  const [step,        setStep]        = useState(startStep)
  const [delivery,    setDelivery]    = useState(savedDeliveryAddress || emptyAddr)
  const [sameBilling, setSameBilling] = useState(true)
  const [billing,     setBilling]     = useState(savedBillingAddress || emptyAddr)
  const [saveAddr,    setSaveAddr]    = useState(true) // offer to save addresses
  const [selectedAcc, setSelectedAcc] = useState([])
  const [placing,     setPlacing]     = useState(false)
  const [placed,      setPlaced]      = useState(null)
  const [error,       setError]       = useState(null)
  const [couponCode,    setCouponCode]    = useState('')
  const [couponResult,  setCouponResult]  = useState(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError,   setCouponError]   = useState(null)

  // Build accessories list from DB (shoe-specific) + any extras from Customize navigation
  const dbAccessories = (shoeAccessoryMap[product.id] || []).map(a => ({
    id: a.id, name: a.name, desc: a.description || '', price: `€ ${parseFloat(a.price) || 0}`, priceNum: parseFloat(a.price) || 0,
  }))
  const extraAccessories = incomingAccessories
    .filter(a => !dbAccessories.find(x => x.id === a.id))
    .map(a => ({ id: a.id, name: a.name, desc: '', price: `€ ${a.price}`, priceNum: a.price }))
  const allAccessories = [...dbAccessories, ...extraAccessories]

  // Pre-select incoming accessories on mount
  const [initialized, setInitialized] = useState(false)
  if (!initialized && incomingAccessories.length > 0) {
    setSelectedAcc(incomingAccessories.map(a => a.id))
    setInitialized(true)
  }

  const toggleAcc = id =>
    setSelectedAcc(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const chosenAccessories = allAccessories.filter(a => selectedAcc.includes(a.id))

  // Parse shoe price to compute total
  const shoePrice = parsePrice(product.price)
  const cartTotal = cart.reduce((sum, item) => sum + parsePrice(item.price) * item.qty, 0)
  const accTotal  = chosenAccessories.reduce((sum, a) => sum + a.priceNum, 0)
  const subtotal  = (product.id ? shoePrice : cartTotal) + accTotal
  const discountAmount = couponResult?.valid ? couponResult.discount_amount : 0
  const total     = Math.max(0, subtotal - discountAmount)

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return
    setCouponLoading(true)
    setCouponError(null)
    try {
      const res = await validateCoupon(couponCode.trim(), subtotal)
      if (res.valid) {
        setCouponResult(res)
        setCouponError(null)
      } else {
        setCouponResult(null)
        setCouponError(res.reason)
      }
    } catch {
      setCouponError('Fehler bei der Gutschein-Validierung')
    } finally {
      setCouponLoading(false)
    }
  }

  const handleRemoveCoupon = () => {
    setCouponResult(null)
    setCouponCode('')
    setCouponError(null)
  }

  const canNext = step === 0 ? cart.length > 0
    : step === 1 ? isAddrComplete(delivery)
    : step === 2 ? (sameBilling || isAddrComplete(billing))
    : true

  const handleNext = () => {
    if (step < 4) setStep(s => s + 1)
  }

  const handlePlace = async () => {
    setPlacing(true)
    setError(null)
    try {
      const billingAddr = sameBilling ? delivery : billing
      const accList = chosenAccessories.map(a => ({ name: a.name, price: a.price }))
      let lastRow

      const appliedCoupon = couponResult?.valid ? couponCode.trim().toUpperCase() : null

      if (product.id) {
        // Single-product flow (from Customize)
        lastRow = await placeOrder({
          shoe_id:          product.id,
          shoe_name:        product.name || product.shoe_name,
          material:         product.material,
          color:            product.color || product.selectedColor || '',
          price:            `€ ${fmtPrice(total)}`,
          eu_size:          latestScan?.eu_size || null,
          scan_id:          latestScan?.id || null,
          delivery_address: delivery,
          billing_address:  billingAddr,
          accessories:      accList,
          foot_notes:       footNotes || null,
          coupon_code:      appliedCoupon,
        })
      } else {
        // Cart flow — one order per cart item (coupon on first item only)
        for (let i = 0; i < cart.length; i++) {
          const item = cart[i]
          const itemTotal = parsePrice(item.price) * item.qty
          lastRow = await placeOrder({
            shoe_id:          item.shoeId || null,
            shoe_name:        item.name,
            material:         item.material || '',
            color:            item.color || '',
            price:            `€ ${fmtPrice(itemTotal)}`,
            eu_size:          latestScan?.eu_size || null,
            scan_id:          latestScan?.id || null,
            delivery_address: delivery,
            billing_address:  billingAddr,
            accessories:      accList,
            foot_notes:       footNotes || null,
            coupon_code:      i === 0 ? appliedCoupon : null,
          })
        }
        clearCart()
      }

      // Save addresses to profile if user opted in
      if (saveAddr) {
        saveAddresses(delivery, sameBilling ? null : billing).catch(() => {})
      }
      setPlaced(lastRow)
    } catch (e) {
      setError(e?.error || 'Bestellung fehlgeschlagen. Bitte erneut versuchen.')
    } finally {
      setPlacing(false)
    }
  }

  // ── Order success — compact, fits 100vh ──
  if (placed) {
    return (
      <div className="flex flex-col bg-white" style={{ height: 'calc(100dvh - 48px)' }}>
        <div className="flex-1 flex flex-col justify-center px-5">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-5">
            <div className="w-12 h-12 bg-black flex items-center justify-center mb-3">
              <CheckCircle2 size={22} className="text-white" strokeWidth={1.5} />
            </div>
            <h1 className="text-base font-bold text-black uppercase" style={{ letterSpacing: '0.12em' }}>Bestellung aufgegeben</h1>
            <p className="text-[10px] text-black/40 mt-1">
              #{placed.id} · {placed.shoe_name} · € {fmtPrice(total)}
            </p>
          </div>

          {/* Bank transfer — compact */}
          <div className="bg-[#f0fdf9] border border-teal-200/60 p-4 mb-4">
            <p className="text-[8px] uppercase tracking-widest text-teal-700 font-bold mb-2.5">Überweisung</p>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[8px] uppercase tracking-widest text-black/35">Betrag</span>
                <span className="text-sm font-bold text-teal-700">€ {fmtPrice(total)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[8px] uppercase tracking-widest text-black/35">Empfänger</span>
                <span className="text-[10px] font-semibold text-black/70">{placed.bank_holder}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[8px] uppercase tracking-widest text-black/35">IBAN</span>
                <span className="text-[10px] font-mono font-semibold text-black/70">{placed.bank_iban}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[8px] uppercase tracking-widest text-black/35">BIC</span>
                <span className="text-[10px] font-mono font-semibold text-black/70">{placed.bank_bic}</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-teal-200/60">
              <p className="text-[8px] uppercase tracking-widest text-black/40 mb-1.5">Verwendungszweck</p>
              <div className="bg-black px-3 py-2 text-center">
                <span className="text-white font-mono font-bold tracking-widest text-sm">ATELIER-{placed.id}</span>
              </div>
            </div>
          </div>

          <p className="text-[9px] text-black/35 text-center mb-5 leading-relaxed">
            Nach Zahlungseingang startet die Fertigung Ihres Schuhs.<br />
            Sie können den Fortschritt jederzeit verfolgen.
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/orders')}
              className="flex-1 py-3 bg-black text-xs font-bold text-white border-0 uppercase" style={{ letterSpacing: '0.15em' }}
            >
              Bestellung verfolgen
            </button>
            <button
              onClick={() => navigate('/collection')}
              className="flex-1 py-3 border-2 border-black text-xs font-bold text-black bg-white uppercase" style={{ letterSpacing: '0.15em' }}
            >
              Weiter shoppen
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col bg-white" style={{ height: 'calc(100dvh - 48px)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-3 pb-2 border-b border-black/5 flex-shrink-0">
        <button
          onClick={() => step > 0 ? setStep(s => s - 1) : navigate(-1)}
          className="w-9 h-9 bg-black/3 flex items-center justify-center border-0"
        >
          <ArrowLeft size={18} strokeWidth={1.8} className="text-black/70" />
        </button>
        <span className="text-sm font-bold text-black uppercase" style={{ letterSpacing: '0.12em' }}>{step === 0 ? 'Warenkorb' : 'Checkout'}</span>
        <div className="w-9" />
      </div>

      <StepBar current={step} />

      <div className="flex-1 overflow-y-auto px-5 pb-3">

        {/* ── Step 0: Cart ── */}
        {step === 0 && (
          <div>
            <h2 className="text-sm font-bold text-black mb-3 uppercase" style={{ letterSpacing: '0.12em' }}>Warenkorb</h2>
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ShoppingBag size={36} strokeWidth={1} className="text-black/15 mb-3" />
                <p className="text-sm text-black/40 mb-1">Dein Warenkorb ist leer</p>
                <p className="text-[11px] text-black/25 mb-5">Füge Schuhe aus der Kollektion hinzu</p>
                <button onClick={() => navigate('/collection')} className="px-5 py-2.5 bg-black text-white text-xs font-bold uppercase border-0" style={{ letterSpacing: '0.15em' }}>
                  Zur Kollektion
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {cart.map(item => {
                  const itemPrice = parsePrice(item.price)
                  return (
                    <div key={item.id} className="flex gap-3 p-3 bg-[#f6f5f3]">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-14 h-14 object-cover bg-white flex-shrink-0" />
                      ) : (
                        <div className="w-14 h-14 bg-black/5 flex items-center justify-center flex-shrink-0">
                          <ShoppingBag size={16} className="text-black/20" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-black leading-tight truncate">{item.name}</p>
                        {item.material && <p className="text-[9px] text-black/40 mt-0.5">{item.material}{item.color ? ` · ${item.color}` : ''}</p>}
                        <div className="flex items-center justify-between mt-1.5">
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => updateCartQty(item.id, item.qty - 1)} className="w-6 h-6 flex items-center justify-center border border-black/10 bg-white text-black">
                              <Minus size={10} strokeWidth={2} />
                            </button>
                            <span className="text-[10px] font-bold text-black w-4 text-center">{item.qty}</span>
                            <button onClick={() => updateCartQty(item.id, item.qty + 1)} className="w-6 h-6 flex items-center justify-center border border-black/10 bg-white text-black">
                              <Plus size={10} strokeWidth={2} />
                            </button>
                          </div>
                          <span className="text-xs font-bold text-black">€ {fmtPrice(itemPrice * item.qty)}</span>
                        </div>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="self-start p-1 bg-transparent border-0 text-black/30 hover:text-red-500">
                        <X size={12} strokeWidth={2} />
                      </button>
                    </div>
                  )
                })}
                <div className="flex items-center justify-between pt-2.5 border-t border-black/10">
                  <span className="text-xs font-bold text-black">Zwischensumme</span>
                  <span className="text-sm font-bold text-black">€ {fmtPrice(cartTotal)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 1: Delivery Address ── */}
        {step === 1 && (
          <div>
            {savedDeliveryAddress && isAddrComplete(delivery) && (
              <div className="flex items-center gap-2 mb-3 px-2 py-2 bg-teal-50 border border-teal-200/50">
                <Check size={12} className="text-teal-600 flex-shrink-0" strokeWidth={2} />
                <span className="text-[9px] text-teal-700 font-medium">Gespeicherte Adresse geladen</span>
              </div>
            )}
            <AddressForm
              title="Lieferadresse"
              value={delivery}
              onChange={setDelivery}
              sameToggle={null}
            />
            <button
              onClick={() => setSaveAddr(v => !v)}
              className="w-full flex items-center gap-2.5 mt-3 p-2.5 border transition-all text-left bg-transparent"
              style={{ border: saveAddr ? '1.5px solid #000' : '1.5px solid rgba(0,0,0,0.08)' }}
            >
              <div className={`w-4 h-4 border-[1.5px] flex items-center justify-center flex-shrink-0 transition-all ${
                saveAddr ? 'bg-black border-black' : 'border-black/20'
              }`}>
                {saveAddr && <Check size={9} strokeWidth={3} className="text-white" />}
              </div>
              <span className="text-[10px] text-black/60">Adresse für nächste Bestellung speichern</span>
            </button>
          </div>
        )}

        {/* ── Step 2: Billing Address ── */}
        {step === 2 && (
          <div>
            <button
              onClick={() => setSameBilling(v => !v)}
              className="w-full flex items-center gap-3 p-3.5 border-2 mb-4 transition-all text-left bg-transparent"
              style={{ border: sameBilling ? '2px solid #000' : '2px solid rgba(0,0,0,0.08)' }}
            >
              <div className={`w-5 h-5 border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                sameBilling ? 'bg-black border-black' : 'border-black/20'
              }`}>
                {sameBilling && <Check size={11} strokeWidth={3} className="text-white" />}
              </div>
              <span className="text-xs font-semibold text-black">Rechnungsadresse = Lieferadresse</span>
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

        {/* ── Step 3: Accessories ── */}
        {step === 3 && (
          <div>
            <h2 className="text-sm font-bold text-black mb-1 uppercase" style={{ letterSpacing: '0.12em' }}>Zubehör & Accessoires</h2>
            <p className="text-[10px] text-black/40 mb-3">Ergänzen Sie Ihre Bestellung mit passendem Zubehör.</p>
            <div className="space-y-2">
              {allAccessories.map(item => (
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

        {/* ── Step 4: Summary ── */}
        {step === 4 && (
          <div>
            <h2 className="text-sm font-bold text-black mb-3 uppercase" style={{ letterSpacing: '0.12em' }}>Bestellübersicht</h2>

            {/* Products */}
            <div className="bg-[#f6f5f3] p-3 mb-3">
              <p className="text-[8px] uppercase tracking-widest text-black/40 mb-2">{product.id ? 'Schuh' : 'Artikel'}</p>
              {product.id ? (
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-black">{product.name || product.shoe_name}</p>
                    <p className="text-[9px] text-black/40 mt-0.5">{product.material}{product.sole ? ` · ${product.sole}` : ''}</p>
                    {latestScan && (
                      <p className="text-[9px] text-teal-600 mt-0.5">EU {latestScan.eu_size} — aus 3D-Scan</p>
                    )}
                  </div>
                  <p className="text-xs font-bold text-black">{product.price}</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="flex justify-between py-1 border-b border-black/5 last:border-0">
                    <div>
                      <span className="text-xs text-black">{item.name}</span>
                      {item.qty > 1 && <span className="text-[9px] text-black/40 ml-1">{'\u00D7'}{item.qty}</span>}
                    </div>
                    <span className="text-xs font-semibold text-black">€ {fmtPrice(parsePrice(item.price) * item.qty)}</span>
                  </div>
                ))
              )}
            </div>

            {/* Accessories */}
            {chosenAccessories.length > 0 && (
              <div className="bg-[#f6f5f3] p-3 mb-3">
                <p className="text-[8px] uppercase tracking-widest text-black/40 mb-2">Zubehör</p>
                {chosenAccessories.map(a => (
                  <div key={a.id} className="flex justify-between py-1 border-b border-black/5 last:border-0">
                    <span className="text-xs text-black/60">{a.name}</span>
                    <span className="text-xs font-semibold text-black">{a.price}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Addresses */}
            <div className="bg-[#f6f5f3] p-3 mb-3">
              <p className="text-[8px] uppercase tracking-widest text-black/40 mb-1.5">Lieferadresse</p>
              <p className="text-[10px] text-black/60 leading-relaxed">
                {delivery.name}<br />{delivery.street}<br />{delivery.zip} {delivery.city}<br />{delivery.country}
              </p>
            </div>

            {/* Coupon */}
            <div className="bg-[#f6f5f3] p-3 mb-3">
              <p className="text-[8px] uppercase tracking-widest text-black/40 mb-2 flex items-center gap-1"><Ticket size={10} /> Gutschein-Code</p>
              {couponResult?.valid ? (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-green-700">{couponCode.toUpperCase()}</span>
                    <span className="text-[10px] text-green-600 ml-2">{couponResult.description}</span>
                  </div>
                  <button onClick={handleRemoveCoupon} className="text-black/30 hover:text-black border-0 bg-transparent"><X size={14} /></button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    className="flex-1 border border-black/10 px-3 py-2 text-sm uppercase placeholder-black/20 focus:outline-none focus:border-black transition-colors"
                    placeholder="Code eingeben"
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className="px-4 py-2 bg-black text-white text-[10px] font-bold uppercase tracking-wider border-0 disabled:opacity-40"
                  >
                    {couponLoading ? '…' : 'Einlösen'}
                  </button>
                </div>
              )}
              {couponError && <p className="text-[10px] text-red-500 mt-1.5">{couponError}</p>}
            </div>

            {/* Total */}
            <div className="py-3 border-t-2 border-black">
              {couponResult?.valid && (
                <>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-black/50">Zwischensumme</span>
                    <span className="text-xs text-black/50">€ {fmtPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-xs text-green-600">Gutschein ({couponCode.toUpperCase()})</span>
                    <span className="text-xs text-green-600">- € {fmtPrice(discountAmount)}</span>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-black">Gesamtbetrag</span>
                <span className="text-lg font-bold text-black">€ {fmtPrice(total)}</span>
              </div>
            </div>

            {error && (
              <p className="text-[10px] text-red-500 mt-1.5 text-center">{error}</p>
            )}
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="px-5 pt-2.5 border-t border-black/5 flex-shrink-0" style={{ paddingBottom: isNative ? 'max(env(safe-area-inset-bottom, 0px), 16px)' : '16px' }}>
        {step < 4 ? (
          <button
            onClick={handleNext}
            disabled={!canNext}
            className={`w-full py-3.5 flex items-center justify-center gap-2 font-bold text-sm transition-all border-0 uppercase ${
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
            className="w-full py-3.5 flex items-center justify-center gap-2 bg-black text-white font-bold text-sm uppercase active:scale-[.98] border-0 disabled:opacity-60"
            style={{ letterSpacing: '0.18em' }}
          >
            {placing ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin" /> Wird verarbeitet…</>
            ) : (
              <><ShoppingBag size={16} strokeWidth={2} /> Jetzt bestellen — € {fmtPrice(total)}</>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
