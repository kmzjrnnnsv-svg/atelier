import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { isNative } from '../App'
import { ArrowLeft, Check, ChevronRight, ShoppingBag, Plus, Minus, CheckCircle2, X, Ticket, Package } from 'lucide-react'
import { apiFetch } from '../hooks/useApi'
import useAtelierStore from '../store/atelierStore'

// Accessories are loaded from the DB via shoeAccessoryMap in the store

// ── Step indicator ────────────────────────────────────────────────────────────
const STEPS = ['Warenkorb', 'Lieferung', 'Rechnung', 'Zubehör', 'Übersicht']

function StepBar({ current }) {
  return (
    <div className="flex items-center gap-1 px-5 py-3">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center" style={{ flex: i < STEPS.length - 1 ? '1 1 0' : 'none' }}>
          <div className="flex flex-col items-center gap-0.5">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all ${
              i < current  ? 'bg-black text-white' :
              i === current ? 'bg-black text-white ring-2 ring-black ring-offset-2' :
              'bg-black/5 text-black/30'
            }`}>
              {i < current ? <Check size={11} strokeWidth={2.5} /> : i + 1}
            </div>
            <span className={`text-[8px] uppercase whitespace-nowrap ${i === current ? 'text-black font-bold' : 'text-black/30'}`} style={{ letterSpacing: '0.08em' }}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-px flex-1 mx-1 mb-3 transition-all ${i < current ? 'bg-black' : 'bg-black/10'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Address form ──────────────────────────────────────────────────────────────
function AddressForm({ title, value, onChange, sameToggle }) {
  const f = (field, val) => onChange({ ...value, [field]: val })
  const inp = 'w-full bg-[#F2F2F7] border-0 rounded-lg px-4 py-3 text-[15px] text-black placeholder-black/30 focus:outline-none focus:ring-2 focus:ring-black/10 transition-all'
  return (
    <div>
      <h2 className="text-[13px] font-bold text-black mb-3 uppercase" style={{ letterSpacing: '0.1em' }}>{title}</h2>
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
      className={`w-full flex items-center gap-3.5 p-4 rounded-xl transition-all text-left border ${
        selected ? 'border-black bg-black/[0.03]' : 'border-transparent bg-white'
      }`}
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
        selected ? 'bg-black text-white' : 'bg-[#F2F2F7] text-black/30'
      }`}>
        {selected ? <Check size={15} strokeWidth={2.5} /> : <Plus size={15} strokeWidth={2} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-black leading-tight">{item.name}</p>
        <p className="text-[11px] text-black/40 mt-0.5">{item.desc}</p>
      </div>
      <span className="text-[13px] font-bold text-black flex-shrink-0">{item.price}</span>
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

  // ── Order success ──
  if (placed) {
    return (
      <div className="min-h-full bg-[#F2F2F7]">
        <div className="flex flex-col items-center justify-center px-5 pt-16 pb-8">
          <div className="w-16 h-16 rounded-xl bg-[#34C759] flex items-center justify-center mb-5">
            <CheckCircle2 size={28} className="text-white" strokeWidth={1.5} />
          </div>
          <p className="text-[28px] font-bold text-black tracking-tight">Bestellt</p>
          <p className="text-[15px] text-black/45 mt-1 text-center">
            #{placed.id} · {placed.shoe_name}
          </p>
        </div>

        <div className="px-5 pb-8 space-y-4">
          {/* Bank transfer card */}
          <div className="bg-white rounded-xl p-5">
            <p className="text-[11px] font-semibold text-[#34C759] uppercase tracking-wider mb-3">Überweisung</p>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-[13px] text-black/45">Betrag</span>
                <span className="text-[17px] font-bold text-black">€ {fmtPrice(total)}</span>
              </div>
              <div className="h-px bg-black/5" />
              <div className="flex justify-between">
                <span className="text-[13px] text-black/45">Empfänger</span>
                <span className="text-[13px] font-medium text-black">{placed.bank_holder}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[13px] text-black/45">IBAN</span>
                <span className="text-[13px] font-mono font-medium text-black">{placed.bank_iban}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[13px] text-black/45">BIC</span>
                <span className="text-[13px] font-mono font-medium text-black">{placed.bank_bic}</span>
              </div>
              <div className="h-px bg-black/5" />
              <div>
                <p className="text-[11px] text-black/35 uppercase tracking-wider mb-2">Verwendungszweck</p>
                <div className="bg-black rounded-lg px-4 py-2.5 text-center">
                  <span className="text-white font-mono font-bold tracking-widest text-[15px]">ATELIER-{placed.id}</span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-[13px] text-black/35 text-center leading-relaxed px-4">
            Nach Zahlungseingang startet die Fertigung.<br />
            Den Fortschritt kannst du jederzeit verfolgen.
          </p>

          <div className="space-y-2.5">
            <button
              onClick={() => navigate('/orders')}
              className="w-full py-3.5 bg-black text-white text-[15px] font-semibold rounded-xl border-0 active:opacity-80 transition-opacity"
            >
              Bestellung verfolgen
            </button>
            <button
              onClick={() => navigate('/collection')}
              className="w-full py-3.5 bg-white text-black text-[15px] font-semibold rounded-xl border-0 active:opacity-80 transition-opacity"
            >
              Weiter shoppen
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full bg-[#F2F2F7]">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-3 pb-1 flex-shrink-0">
        <button
          onClick={() => step > 0 ? setStep(s => s - 1) : navigate(-1)}
          className="w-9 h-9 rounded-lg bg-white flex items-center justify-center border-0 active:opacity-60 transition-opacity"
        >
          <ArrowLeft size={18} strokeWidth={1.8} className="text-black" />
        </button>
        <span className="text-[17px] font-semibold text-black">{step === 0 ? 'Einkaufstasche' : 'Checkout'}</span>
        <div className="w-9" />
      </div>

      <StepBar current={step} />

      <div className="flex-1 overflow-y-auto px-5 pb-6">

        {/* ── Step 0: Cart ── */}
        {step === 0 && (
          <div>
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 rounded-xl bg-white flex items-center justify-center mb-4">
                  <ShoppingBag size={32} strokeWidth={1} className="text-black/15" />
                </div>
                <p className="text-[17px] font-semibold text-black mb-1">Noch keine Artikel</p>
                <p className="text-[13px] text-black/40 mb-6">Entdecke unsere Kollektion und finde deinen Schuh.</p>
                <button
                  onClick={() => navigate('/collection')}
                  className="px-6 py-3 bg-black text-white text-[15px] font-semibold rounded-xl border-0 active:opacity-80 transition-opacity"
                >
                  Zur Kollektion
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map(item => {
                  const itemPrice = parsePrice(item.price)
                  return (
                    <div key={item.id} className="bg-white rounded-xl p-4 flex gap-4">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-20 h-20 rounded-lg bg-[#F2F2F7] flex items-center justify-center flex-shrink-0">
                          <ShoppingBag size={20} className="text-black/15" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[15px] font-semibold text-black leading-tight truncate">{item.name}</p>
                            {item.material && <p className="text-[12px] text-black/40 mt-0.5">{item.material}{item.color ? ` · ${item.color}` : ''}</p>}
                          </div>
                          <button onClick={() => removeFromCart(item.id)} className="p-1 bg-transparent border-0 text-black/25 active:text-red-500 flex-shrink-0">
                            <X size={16} strokeWidth={1.5} />
                          </button>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => updateCartQty(item.id, item.qty - 1)} className="w-8 h-8 rounded-lg flex items-center justify-center border-0 bg-[#F2F2F7] text-black active:bg-black/10 transition-colors">
                              <Minus size={14} strokeWidth={2} />
                            </button>
                            <span className="text-[15px] font-semibold text-black w-5 text-center">{item.qty}</span>
                            <button onClick={() => updateCartQty(item.id, item.qty + 1)} className="w-8 h-8 rounded-lg flex items-center justify-center border-0 bg-[#F2F2F7] text-black active:bg-black/10 transition-colors">
                              <Plus size={14} strokeWidth={2} />
                            </button>
                          </div>
                          <span className="text-[17px] font-bold text-black">€ {fmtPrice(itemPrice * item.qty)}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Subtotal */}
                <div className="bg-white rounded-xl px-4 py-3.5 flex items-center justify-between">
                  <span className="text-[15px] font-medium text-black/60">Zwischensumme</span>
                  <span className="text-[17px] font-bold text-black">€ {fmtPrice(cartTotal)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 1: Delivery Address ── */}
        {step === 1 && (
          <div className="bg-white rounded-xl p-5">
            {savedDeliveryAddress && isAddrComplete(delivery) && (
              <div className="flex items-center gap-2 mb-4 px-3 py-2.5 bg-[#34C759]/10 rounded-lg">
                <Check size={13} className="text-[#34C759] flex-shrink-0" strokeWidth={2.5} />
                <span className="text-[12px] text-[#34C759] font-medium">Gespeicherte Adresse geladen</span>
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
              className="w-full flex items-center gap-3 mt-4 p-3 rounded-lg transition-all text-left bg-transparent border-0"
              style={{ background: saveAddr ? 'rgba(0,0,0,0.03)' : 'transparent' }}
            >
              <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all ${
                saveAddr ? 'bg-black' : 'border-2 border-black/15'
              }`}>
                {saveAddr && <Check size={11} strokeWidth={3} className="text-white" />}
              </div>
              <span className="text-[13px] text-black/50">Adresse für nächste Bestellung speichern</span>
            </button>
          </div>
        )}

        {/* ── Step 2: Billing Address ── */}
        {step === 2 && (
          <div className="bg-white rounded-xl p-5">
            <button
              onClick={() => setSameBilling(v => !v)}
              className={`w-full flex items-center gap-3 p-3.5 rounded-lg mb-4 transition-all text-left border-0 ${
                sameBilling ? 'bg-black/[0.03]' : 'bg-transparent'
              }`}
            >
              <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all ${
                sameBilling ? 'bg-black' : 'border-2 border-black/15'
              }`}>
                {sameBilling && <Check size={11} strokeWidth={3} className="text-white" />}
              </div>
              <span className="text-[15px] font-medium text-black">Rechnungsadresse = Lieferadresse</span>
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
            <p className="text-[13px] text-black/40 mb-3">Passendes Zubehör für deine Bestellung.</p>
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
          <div className="space-y-3">
            {/* Products */}
            <div className="bg-white rounded-xl p-4">
              <p className="text-[11px] font-semibold text-black/35 uppercase tracking-wider mb-3">{product.id ? 'Schuh' : 'Artikel'}</p>
              {product.id ? (
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[15px] font-semibold text-black">{product.name || product.shoe_name}</p>
                    <p className="text-[12px] text-black/40 mt-0.5">{product.material}{product.sole ? ` · ${product.sole}` : ''}</p>
                    {latestScan && (
                      <p className="text-[12px] text-[#007AFF] mt-0.5">EU {latestScan.eu_size} — 3D-Scan</p>
                    )}
                  </div>
                  <p className="text-[15px] font-bold text-black">{product.price}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center py-1.5 border-b border-black/5 last:border-0">
                      <div>
                        <span className="text-[13px] text-black">{item.name}</span>
                        {item.qty > 1 && <span className="text-[12px] text-black/40 ml-1">{'\u00D7'}{item.qty}</span>}
                      </div>
                      <span className="text-[13px] font-semibold text-black">€ {fmtPrice(parsePrice(item.price) * item.qty)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Accessories */}
            {chosenAccessories.length > 0 && (
              <div className="bg-white rounded-xl p-4">
                <p className="text-[11px] font-semibold text-black/35 uppercase tracking-wider mb-3">Zubehör</p>
                <div className="space-y-2">
                  {chosenAccessories.map(a => (
                    <div key={a.id} className="flex justify-between items-center py-1.5 border-b border-black/5 last:border-0">
                      <span className="text-[13px] text-black/60">{a.name}</span>
                      <span className="text-[13px] font-semibold text-black">{a.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Address */}
            <div className="bg-white rounded-xl p-4">
              <p className="text-[11px] font-semibold text-black/35 uppercase tracking-wider mb-2">Lieferadresse</p>
              <p className="text-[13px] text-black/60 leading-relaxed">
                {delivery.name}<br />{delivery.street}<br />{delivery.zip} {delivery.city}<br />{delivery.country}
              </p>
            </div>

            {/* Coupon */}
            <div className="bg-white rounded-xl p-4">
              <p className="text-[11px] font-semibold text-black/35 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Ticket size={12} /> Gutschein
              </p>
              {couponResult?.valid ? (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[13px] font-bold text-[#34C759]">{couponCode.toUpperCase()}</span>
                    <span className="text-[12px] text-[#34C759] ml-2">{couponResult.description}</span>
                  </div>
                  <button onClick={handleRemoveCoupon} className="text-black/25 active:text-black border-0 bg-transparent"><X size={16} /></button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-[#F2F2F7] border-0 rounded-lg px-4 py-2.5 text-[15px] uppercase placeholder-black/25 focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
                    placeholder="Code eingeben"
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className="px-4 py-2.5 bg-black text-white text-[13px] font-semibold rounded-lg border-0 disabled:opacity-30 active:opacity-80 transition-opacity"
                  >
                    {couponLoading ? '…' : 'Einlösen'}
                  </button>
                </div>
              )}
              {couponError && <p className="text-[12px] text-red-500 mt-2">{couponError}</p>}
            </div>

            {/* Total */}
            <div className="bg-white rounded-xl p-4">
              {couponResult?.valid && (
                <>
                  <div className="flex justify-between mb-2">
                    <span className="text-[13px] text-black/45">Zwischensumme</span>
                    <span className="text-[13px] text-black/45">€ {fmtPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-[13px] text-[#34C759]">Gutschein ({couponCode.toUpperCase()})</span>
                    <span className="text-[13px] text-[#34C759]">- € {fmtPrice(discountAmount)}</span>
                  </div>
                  <div className="h-px bg-black/5 mb-2" />
                </>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[17px] font-bold text-black">Gesamtbetrag</span>
                <span className="text-[22px] font-bold text-black">€ {fmtPrice(total)}</span>
              </div>
            </div>

            {error && (
              <p className="text-[13px] text-red-500 text-center">{error}</p>
            )}
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="px-5 pt-3 flex-shrink-0" style={{ paddingBottom: isNative ? 'max(env(safe-area-inset-bottom, 0px), 16px)' : '16px' }}>
        {step < 4 ? (
          <button
            onClick={handleNext}
            disabled={!canNext}
            className={`w-full py-4 flex items-center justify-center gap-2 font-semibold text-[17px] transition-all border-0 rounded-xl ${
              canNext ? 'bg-black text-white active:opacity-80' : 'bg-black/5 text-black/20'
            }`}
          >
            Weiter <ChevronRight size={18} strokeWidth={2} />
          </button>
        ) : (
          <button
            onClick={handlePlace}
            disabled={placing}
            className="w-full py-4 flex items-center justify-center gap-2 bg-black text-white font-semibold text-[17px] rounded-xl active:opacity-80 border-0 disabled:opacity-50 transition-opacity"
          >
            {placing ? (
              <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Wird verarbeitet…</>
            ) : (
              <>Jetzt bestellen — € {fmtPrice(total)}</>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
