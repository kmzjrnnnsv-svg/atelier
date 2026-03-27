import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { isNative } from '../App'
import { ArrowLeft, Check, ChevronRight, ShoppingBag, Plus, Minus, CheckCircle2, X, Ticket, Truck } from 'lucide-react'
import { apiFetch } from '../hooks/useApi'
import useAtelierStore from '../store/atelierStore'

// Accessories are loaded from the DB via shoeAccessoryMap in the store

// ── Step indicator ────────────────────────────────────────────────────────────
const STEPS = ['Warenkorb', 'Lieferung', 'Rechnung', 'Zubehör', 'Übersicht']

function StepBar({ current }) {
  return (
    <div className="flex items-center gap-1 px-5 lg:px-16 py-4">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center" style={{ flex: i < STEPS.length - 1 ? '1 1 0' : 'none' }}>
          <div className="flex flex-col items-center gap-1">
            <div className={`w-6 h-6 flex items-center justify-center text-[9px] transition-all ${
              i < current  ? 'bg-black text-white' :
              i === current ? 'bg-black text-white' :
              'bg-[#f6f5f3] text-black/25'
            }`} style={{ fontWeight: 300 }}>
              {i < current ? <Check size={10} strokeWidth={2} /> : i + 1}
            </div>
            <span className={`text-[8px] uppercase whitespace-nowrap font-light ${i === current ? 'text-black' : 'text-black/25'}`} style={{ letterSpacing: '0.1em' }}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-px flex-1 mx-1.5 mb-4 transition-all ${i < current ? 'bg-black' : 'bg-black/[0.06]'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Cart item with swipe-to-remove ───────────────────────────────────────────
function CartItem({ id, onRemove, children }) {
  const ref = useRef(null)
  const [removing, setRemoving] = useState(false)

  const handleRemove = useCallback(() => {
    setRemoving(true)
    setTimeout(() => onRemove(id), 250)
  }, [id, onRemove])

  return (
    <div
      ref={ref}
      className="relative overflow-hidden"
      style={{
        transition: removing ? 'max-height 250ms ease, opacity 200ms ease, margin 250ms ease' : 'none',
        maxHeight: removing ? '0px' : '200px',
        opacity: removing ? 0 : 1,
        marginBottom: removing ? '0px' : undefined,
      }}
    >
      <button
        onClick={handleRemove}
        className="absolute top-2 right-2 z-10 p-1 bg-transparent border-0 text-black/25 hover:text-red-500 active:text-red-500 transition-colors"
      >
        <X size={14} strokeWidth={1.5} />
      </button>
      {children}
    </div>
  )
}

// ── Address form ──────────────────────────────────────────────────────────────
function AddressForm({ title, value, onChange }) {
  const f = (field, val) => onChange({ ...value, [field]: val })
  const inp = 'w-full bg-[#f6f5f3] border border-black/[0.06] px-4 py-3 text-[13px] text-black placeholder-black/25 focus:outline-none focus:border-black/15 transition-all font-light'
  return (
    <div>
      <h2 className="text-[10px] text-black/30 mb-4 uppercase font-light" style={{ letterSpacing: '0.2em' }}>{title}</h2>
      <div className="space-y-2">
        <input className={inp} placeholder="Vollständiger Name" value={value.name || ''} onChange={e => f('name', e.target.value)} />
        <input className={inp} placeholder="Straße + Hausnummer" value={value.street || ''} onChange={e => f('street', e.target.value)} />
        <div className="flex gap-2">
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
      className={`w-full flex items-center gap-3.5 p-4 transition-all text-left ${
        selected ? 'bg-white border-l-2 border-l-black' : 'bg-white'
      }`}
    >
      <div className={`w-8 h-8 flex items-center justify-center flex-shrink-0 transition-all ${
        selected ? 'bg-black text-white' : 'bg-black/[0.03] text-black/30'
      }`}>
        {selected ? <Check size={14} strokeWidth={2.5} /> : <Plus size={14} strokeWidth={2} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-black leading-tight">{item.name}</p>
        <p className="text-[10px] text-black/40 mt-0.5">{item.desc}</p>
      </div>
      <span className="text-[13px] font-bold text-black flex-shrink-0">{item.price}</span>
    </button>
  )
}

// Parse German-formatted price string: "€ 1.485" → 1485, "€ 1.485,50" → 1485.5
function parsePrice(str) {
  if (!str) return 0
  const cleaned = str.replace(/[^0-9.,]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
  return parseFloat(cleaned) || 0
}

function fmtPrice(n) {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

// ── Main Checkout ─────────────────────────────────────────────────────────────
export default function Checkout() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { latestScan, placeOrder, footNotes, cart, removeFromCart, updateCartQty, clearCart, savedDeliveryAddress, savedBillingAddress, saveAddresses, validateCoupon, shoeAccessoryMap, accessories: storeAccessories, shoes } = useAtelierStore()

  const product = location.state?.product || {}
  const incomingAccessories = location.state?.accessories || []
  const startStep = product.id ? 1 : 0

  const emptyAddr = { name:'', street:'', zip:'', city:'', country:'Deutschland', phone:'' }
  const [step,        setStep]        = useState(startStep)
  const [delivery,    setDelivery]    = useState(savedDeliveryAddress || emptyAddr)
  const [sameBilling, setSameBilling] = useState(true)
  const [billing,     setBilling]     = useState(savedBillingAddress || emptyAddr)
  const [saveAddr,    setSaveAddr]    = useState(true)
  const [selectedAcc, setSelectedAcc] = useState([])
  const [placing,     setPlacing]     = useState(false)
  const [placed,      setPlaced]      = useState(null)
  const [error,       setError]       = useState(null)
  const [couponCode,    setCouponCode]    = useState('')
  const [couponResult,  setCouponResult]  = useState(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError,   setCouponError]   = useState(null)
  const [shippingOptions, setShippingOptions] = useState([])
  const [selectedShipping, setSelectedShipping] = useState(null)

  useEffect(() => {
    apiFetch('/api/shipping').then(opts => {
      setShippingOptions(opts || [])
      const def = (opts || []).find(o => o.is_default) || opts?.[0]
      if (def) setSelectedShipping(def.id)
    }).catch(() => {})
  }, [])

  // Collect accessories for all shoes (single product OR cart items)
  const cartShoeIds = cart.filter(c => !c.isAccessory).map(c => c.shoeId)
  const cartAccessoryIds = new Set(cart.filter(c => c.isAccessory).map(c => {
    const m = String(c.shoeId).match(/^acc-(\d+)$/)
    return m ? Number(m[1]) : null
  }).filter(Boolean))

  const shoeIds = product.id ? [product.id] : cartShoeIds
  const seen = new Set()
  const dbAccessories = shoeIds.flatMap(sid => (shoeAccessoryMap[sid] || []))
    .filter(a => { if (seen.has(a.id)) return false; seen.add(a.id); return true })
    .filter(a => !cartAccessoryIds.has(a.id))
    .map(a => ({
      id: a.id, name: a.name, desc: a.description || '', price: `€ ${parseFloat(a.price) || 0}`, priceNum: parseFloat(a.price) || 0,
    }))

  // If no shoe-specific accessories, fall back to all store accessories
  const fallbackAccessories = dbAccessories.length === 0
    ? storeAccessories
        .filter(a => !cartAccessoryIds.has(a.id) && !seen.has(a.id))
        .map(a => ({
          id: a.id, name: a.name, desc: a.description || '', price: `€ ${parseFloat(a.price) || 0}`, priceNum: parseFloat(a.price) || 0,
        }))
    : []

  const extraAccessories = incomingAccessories
    .filter(a => !dbAccessories.find(x => x.id === a.id) && !cartAccessoryIds.has(a.id))
    .map(a => ({ id: a.id, name: a.name, desc: '', price: `€ ${a.price}`, priceNum: a.price }))
  const allAccessories = [...dbAccessories, ...fallbackAccessories, ...extraAccessories]

  const [initialized, setInitialized] = useState(false)
  if (!initialized && incomingAccessories.length > 0) {
    setSelectedAcc(incomingAccessories.map(a => a.id))
    setInitialized(true)
  }

  const toggleAcc = id =>
    setSelectedAcc(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const chosenAccessories = allAccessories.filter(a => selectedAcc.includes(a.id))

  const shoePrice = parsePrice(product.price)
  const cartTotal = cart.reduce((sum, item) => sum + parsePrice(item.price) * item.qty, 0)
  const accTotal  = chosenAccessories.reduce((sum, a) => sum + a.priceNum, 0)
  const subtotal  = (product.id ? shoePrice : cartTotal) + accTotal
  const discountAmount = couponResult?.valid ? couponResult.discount_amount : 0
  const shippingOpt = shippingOptions.find(o => o.id === selectedShipping)
  const isFreeShipping = (couponResult?.valid && couponResult.type === 'free_shipping') ||
    (shippingOpt?.free_above && subtotal >= shippingOpt.free_above)
  const shippingCost = isFreeShipping ? 0 : (shippingOpt?.price || 0)
  const total     = Math.max(0, subtotal + shippingCost - discountAmount)

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return
    setCouponLoading(true)
    setCouponError(null)
    try {
      const res = await validateCoupon(couponCode.trim(), subtotal)
      if (res.valid) { setCouponResult(res); setCouponError(null) }
      else { setCouponResult(null); setCouponError(res.reason) }
    } catch { setCouponError('Fehler bei der Gutschein-Validierung') }
    finally { setCouponLoading(false) }
  }

  const handleRemoveCoupon = () => { setCouponResult(null); setCouponCode(''); setCouponError(null) }

  const canNext = step === 0 ? cart.length > 0
    : step === 1 ? isAddrComplete(delivery)
    : step === 2 ? (sameBilling || isAddrComplete(billing))
    : true

  const handleNext = () => { if (step < 4) setStep(s => s + 1) }

  const handlePlace = async () => {
    setPlacing(true)
    setError(null)
    try {
      const billingAddr = sameBilling ? delivery : billing
      const accList = chosenAccessories.map(a => ({ name: a.name, price: a.price }))
      let lastRow
      const appliedCoupon = couponResult?.valid ? couponCode.trim().toUpperCase() : null

      const shippingData = shippingOpt ? { shipping_method: shippingOpt.key, shipping_cost: `€ ${fmtPrice(shippingCost)}` } : {}

      if (product.id) {
        lastRow = await placeOrder({
          shoe_id: product.id, shoe_name: product.name || product.shoe_name,
          material: product.material, color: product.color || product.selectedColor || '',
          price: `€ ${fmtPrice(total)}`, eu_size: latestScan?.eu_size || null,
          scan_id: latestScan?.id || null, delivery_address: delivery,
          billing_address: billingAddr, accessories: accList,
          foot_notes: footNotes || null, coupon_code: appliedCoupon,
          ...shippingData,
        })
      } else {
        for (let i = 0; i < cart.length; i++) {
          const item = cart[i]
          const itemTotal = parsePrice(item.price) * item.qty
          lastRow = await placeOrder({
            shoe_id: item.shoeId || null, shoe_name: item.name,
            material: item.material || '', color: item.color || '',
            price: `€ ${fmtPrice(itemTotal)}`, eu_size: latestScan?.eu_size || null,
            scan_id: latestScan?.id || null, delivery_address: delivery,
            billing_address: billingAddr, accessories: accList,
            foot_notes: footNotes || null, coupon_code: i === 0 ? appliedCoupon : null,
            ...shippingData,
          })
        }
        clearCart()
      }
      if (saveAddr) saveAddresses(delivery, sameBilling ? null : billing).catch(() => {})
      setPlaced(lastRow)
    } catch (e) {
      setError(e?.error || 'Bestellung fehlgeschlagen. Bitte erneut versuchen.')
    } finally { setPlacing(false) }
  }

  // ── Order success ──
  if (placed) {
    return (
      <div className="min-h-full bg-white">
        <div className="flex flex-col items-center justify-center px-5 pt-16 pb-8">
          <div className="w-14 h-14 bg-black flex items-center justify-center mb-5">
            <CheckCircle2 size={22} className="text-white" strokeWidth={1.5} />
          </div>
          <p className="text-[24px] font-extralight text-black tracking-tight">Bestellt</p>
          <p className="text-[12px] text-black/30 mt-2 font-light">#{placed.id} · {placed.shoe_name}</p>
        </div>

        <div className="px-5 pb-8 space-y-3">
          <div className="bg-white p-5 border border-black/[0.06]">
            <p className="text-[10px] text-black/30 uppercase tracking-[0.2em] font-light mb-4">Überweisung</p>
            <div className="space-y-2.5">
              <div className="flex justify-between">
                <span className="text-[13px] text-black/40">Betrag</span>
                <span className="text-[15px] font-bold text-black">€ {fmtPrice(total)}</span>
              </div>
              <div className="h-px bg-black/5" />
              <div className="flex justify-between">
                <span className="text-[13px] text-black/40">Empfänger</span>
                <span className="text-[13px] font-medium text-black">{placed.bank_holder}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[13px] text-black/40">IBAN</span>
                <span className="text-[12px] font-mono font-medium text-black">{placed.bank_iban}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[13px] text-black/40">BIC</span>
                <span className="text-[12px] font-mono font-medium text-black">{placed.bank_bic}</span>
              </div>
              <div className="h-px bg-black/5" />
              <div>
                <p className="text-[10px] text-black/30 uppercase tracking-wider mb-2">Verwendungszweck</p>
                <div className="bg-black px-4 py-2.5 text-center">
                  <span className="text-white font-mono font-bold tracking-widest text-[14px]">ATELIER-{placed.id}</span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-[12px] text-black/35 text-center leading-relaxed">
            Nach Zahlungseingang startet die Fertigung.
          </p>

          <button onClick={() => navigate('/orders')}
            className="w-full py-3.5 bg-black text-white text-[12px] font-light border border-black hover:bg-white hover:text-black transition-all duration-300"
            style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Bestellung verfolgen
          </button>
          <button onClick={() => navigate('/collection')}
            className="w-full py-3.5 bg-white text-black text-[12px] font-light border border-black/15 hover:border-black hover:bg-black hover:text-white transition-all duration-300"
            style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Weiter shoppen
          </button>
        </div>
      </div>
    )
  }

  // ── Empty cart — simple, clean ──
  if (step === 0 && cart.length === 0 && !product.id) {
    return (
      <div className="min-h-full bg-white">
        <div className="px-5 lg:px-16 pt-8 lg:pt-14 pb-1">
          <p className="text-[10px] text-black/25 uppercase tracking-[0.3em] mb-3">Atelier</p>
          <p className="text-[28px] lg:text-[36px] font-extralight text-black tracking-tight">Einkaufstasche</p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center px-5">
          <ShoppingBag size={32} strokeWidth={0.8} className="text-black/10 mb-4" />
          <p className="text-[14px] font-light text-black/50">Noch keine Artikel</p>
          <p className="text-[12px] text-black/25 mt-2 max-w-[240px] leading-relaxed font-light">Entdecken Sie unsere Kollektion und finden Sie Ihren Schuh.</p>
          <button onClick={() => navigate('/collection')}
            className="mt-6 px-8 py-3 bg-black text-white text-[11px] font-light border border-black hover:bg-white hover:text-black transition-all duration-300"
            style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Kollektion entdecken
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full bg-white">

      {/* Header */}
      <div className="px-5 lg:px-16 pt-4 pb-2 flex items-center gap-3 flex-shrink-0">
        <button onClick={() => {
            if (step > 0) { setStep(s => s - 1); return }
            // Navigate back to the last configured shoe
            const lastShoe = [...cart].reverse().find(c => !c.isAccessory && c.shoeId)
            if (lastShoe) {
              const product = shoes.find(s => s.id === lastShoe.shoeId)
              if (product) {
                navigate('/customize', { state: { product } })
                return
              }
            }
            navigate(-1)
          }}
          className="w-8 h-8 bg-transparent flex items-center justify-center border-0 active:opacity-60 flex-shrink-0">
          <ArrowLeft size={16} strokeWidth={1.5} className="text-black" />
        </button>
        <span className="text-[15px] font-light text-black tracking-tight">{step === 0 ? 'Einkaufstasche' : 'Checkout'}</span>
      </div>

      <StepBar current={step} />

      <div className="flex-1 overflow-y-auto pb-6">

        {/* ── Step 0: Cart ── */}
        {step === 0 && (
          <div className="px-5 space-y-2">
            {cart.map(item => {
              const itemPrice = parsePrice(item.price)
              return (
                <CartItem key={item.id} id={item.id} onRemove={removeFromCart}>
                  <div className="bg-white p-3.5 flex gap-3.5 border border-black/[0.06]">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-16 h-16 object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-16 h-16 bg-black/[0.03] flex items-center justify-center flex-shrink-0">
                        <ShoppingBag size={18} className="text-black/15" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[14px] font-semibold text-black leading-tight truncate">{item.name}</p>
                          {item.material && <p className="text-[11px] text-black/40 mt-0.5">{item.material}</p>}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => updateCartQty(item.id, item.qty - 1)} className="w-7 h-7 flex items-center justify-center border-0 bg-black/[0.03] text-black active:bg-black/10">
                            <Minus size={12} strokeWidth={2} />
                          </button>
                          <span className="text-[14px] font-semibold text-black w-5 text-center">{item.qty}</span>
                          <button onClick={() => updateCartQty(item.id, item.qty + 1)} className="w-7 h-7 flex items-center justify-center border-0 bg-black/[0.03] text-black active:bg-black/10">
                            <Plus size={12} strokeWidth={2} />
                          </button>
                        </div>
                        <span className="text-[15px] font-bold text-black">€ {fmtPrice(itemPrice * item.qty)}</span>
                      </div>
                    </div>
                  </div>
                </CartItem>
              )
            })}
            <div className="bg-white px-4 py-3 flex items-center justify-between border border-black/[0.06]">
              <span className="text-[13px] text-black/50">Zwischensumme</span>
              <span className="text-[15px] font-bold text-black">€ {fmtPrice(cartTotal)}</span>
            </div>
          </div>
        )}

        {/* ── Step 1: Delivery Address ── */}
        {step === 1 && (
          <div className="px-5">
            <div className="bg-white p-5 border border-black/[0.06]">
              {savedDeliveryAddress && isAddrComplete(delivery) && (
                <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-[#34C759]/10">
                  <Check size={12} className="text-[#34C759] flex-shrink-0" strokeWidth={2.5} />
                  <span className="text-[11px] text-[#34C759] font-medium">Gespeicherte Adresse geladen</span>
                </div>
              )}
              <AddressForm title="Lieferadresse" value={delivery} onChange={setDelivery} />
              <button onClick={() => setSaveAddr(v => !v)}
                className="w-full flex items-center gap-3 mt-4 p-3 text-left bg-transparent border-0"
                style={{ background: saveAddr ? 'rgba(0,0,0,0.02)' : 'transparent' }}>
                <div className={`w-4 h-4 flex items-center justify-center flex-shrink-0 transition-all ${
                  saveAddr ? 'bg-black' : 'border-[1.5px] border-black/15'}`}>
                  {saveAddr && <Check size={9} strokeWidth={3} className="text-white" />}
                </div>
                <span className="text-[12px] text-black/45">Adresse speichern</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Billing Address ── */}
        {step === 2 && (
          <div className="px-5">
            <div className="bg-white p-5 border border-black/[0.06]">
              <button onClick={() => setSameBilling(v => !v)}
                className="w-full flex items-center gap-3 p-3 mb-4 text-left border-0"
                style={{ background: sameBilling ? 'rgba(0,0,0,0.02)' : 'transparent' }}>
                <div className={`w-4 h-4 flex items-center justify-center flex-shrink-0 transition-all ${
                  sameBilling ? 'bg-black' : 'border-[1.5px] border-black/15'}`}>
                  {sameBilling && <Check size={9} strokeWidth={3} className="text-white" />}
                </div>
                <span className="text-[14px] font-medium text-black">Rechnungsadresse = Lieferadresse</span>
              </button>
              {!sameBilling && <AddressForm title="Rechnungsadresse" value={billing} onChange={setBilling} />}
            </div>
          </div>
        )}

        {/* ── Step 3: Accessories ── */}
        {step === 3 && (
          <div className="px-5">
            <p className="text-[12px] text-black/40 mb-3">Passendes Zubehör für deine Bestellung.</p>
            {allAccessories.length > 0 ? (
              <div className="space-y-px">
                {allAccessories.map(item => (
                  <AccessoryCard key={item.id} item={item}
                    selected={selectedAcc.includes(item.id)} onToggle={() => toggleAcc(item.id)} />
                ))}
              </div>
            ) : cartAccessoryIds.size > 0 ? (
              <div className="bg-white p-5 border border-black/[0.06] text-center">
                <div className="w-10 h-10 bg-black/[0.03] flex items-center justify-center mx-auto mb-3">
                  <Check size={18} strokeWidth={1.5} className="text-black/30" />
                </div>
                <p className="text-[13px] text-black/60 font-light">Alles Zubehör ist bereits im Warenkorb.</p>
                <p className="text-[11px] text-black/25 mt-1 font-light">Sie können direkt zur Übersicht fortfahren.</p>
              </div>
            ) : (
              <div className="bg-white p-5 border border-black/[0.06] text-center">
                <p className="text-[13px] text-black/40 font-light">Kein passendes Zubehör verfügbar.</p>
              </div>
            )}
          </div>
        )}

        {/* ── Step 4: Summary ── */}
        {step === 4 && (
          <div className="px-5 space-y-2">
            {/* Products */}
            <div className="bg-white p-4 border border-black/[0.06]">
              <p className="text-[10px] font-bold text-black/30 uppercase tracking-wider mb-2">{product.id ? 'Schuh' : 'Artikel'}</p>
              {product.id ? (
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[14px] font-semibold text-black">{product.name || product.shoe_name}</p>
                    <p className="text-[11px] text-black/40 mt-0.5">{product.material}{product.sole ? ` · ${product.sole}` : ''}</p>
                    {latestScan && <p className="text-[11px] text-[#007AFF] mt-0.5">EU {latestScan.eu_size} — 3D-Scan</p>}
                  </div>
                  <p className="text-[14px] font-bold text-black">{product.price}</p>
                </div>
              ) : cart.map(item => (
                <div key={item.id} className="flex justify-between items-center py-1.5 border-b border-black/5 last:border-0">
                  <div>
                    <span className="text-[13px] text-black">{item.name}</span>
                    {item.qty > 1 && <span className="text-[11px] text-black/40 ml-1">×{item.qty}</span>}
                  </div>
                  <span className="text-[13px] font-semibold text-black">€ {fmtPrice(parsePrice(item.price) * item.qty)}</span>
                </div>
              ))}
            </div>

            {/* Accessories */}
            {chosenAccessories.length > 0 && (
              <div className="bg-white p-4 border border-black/[0.06]">
                <p className="text-[10px] font-bold text-black/30 uppercase tracking-wider mb-2">Zubehör</p>
                {chosenAccessories.map(a => (
                  <div key={a.id} className="flex justify-between items-center py-1.5 border-b border-black/5 last:border-0">
                    <span className="text-[13px] text-black/60">{a.name}</span>
                    <span className="text-[13px] font-semibold text-black">{a.price}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Address */}
            <div className="bg-white p-4 border border-black/[0.06]">
              <p className="text-[10px] font-bold text-black/30 uppercase tracking-wider mb-2">Lieferadresse</p>
              <p className="text-[12px] text-black/55 leading-relaxed">
                {delivery.name}<br />{delivery.street}<br />{delivery.zip} {delivery.city}<br />{delivery.country}
              </p>
            </div>

            {/* Shipping */}
            {shippingOptions.length > 0 && (
              <div className="bg-white p-4 border border-black/[0.06]">
                <p className="text-[10px] font-bold text-black/30 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Truck size={11} /> Versand
                </p>
                <div className="space-y-1.5">
                  {shippingOptions.map(opt => {
                    const isSelected = selectedShipping === opt.id
                    const optFree = opt.free_above && subtotal >= opt.free_above
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setSelectedShipping(opt.id)}
                        className={`w-full flex items-center justify-between p-3 text-left border-0 transition-all ${
                          isSelected ? 'bg-black/3 border-l-2 border-l-black' : 'bg-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 flex items-center justify-center flex-shrink-0 transition-all ${
                            isSelected ? 'bg-black' : 'border-[1.5px] border-black/15'}`}>
                            {isSelected && <Check size={9} strokeWidth={3} className="text-white" />}
                          </div>
                          <div>
                            <p className="text-[13px] font-medium text-black">{opt.label}</p>
                            {opt.description && <p className="text-[10px] text-black/35 mt-0.5">{opt.description}</p>}
                          </div>
                        </div>
                        <div className="text-right">
                          {optFree || (couponResult?.valid && couponResult.type === 'free_shipping') ? (
                            <span className="text-[13px] font-semibold text-[#34C759]">Gratis</span>
                          ) : (
                            <span className="text-[13px] font-semibold text-black">€ {fmtPrice(opt.price)}</span>
                          )}
                          {opt.free_above && !optFree && !(couponResult?.valid && couponResult.type === 'free_shipping') && (
                            <p className="text-[9px] text-black/30 mt-0.5">Gratis ab € {fmtPrice(opt.free_above)}</p>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Coupon */}
            <div className="bg-white p-4 border border-black/[0.06]">
              <p className="text-[10px] font-bold text-black/30 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Ticket size={11} /> Gutschein
              </p>
              {couponResult?.valid ? (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[13px] font-bold text-[#34C759]">{couponCode.toUpperCase()}</span>
                    <span className="text-[11px] text-[#34C759] ml-2">{couponResult.description}</span>
                  </div>
                  <button onClick={handleRemoveCoupon} className="text-black/25 border-0 bg-transparent"><X size={14} /></button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-black/[0.03] border-0 px-3 py-2.5 text-[14px] uppercase placeholder-black/25 focus:outline-none"
                    placeholder="Code eingeben" value={couponCode}
                    onChange={e => setCouponCode(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()} />
                  <button onClick={handleApplyCoupon} disabled={couponLoading || !couponCode.trim()}
                    className="px-4 py-2.5 bg-black text-white text-[12px] font-semibold border-0 disabled:opacity-30">
                    {couponLoading ? '…' : 'Einlösen'}
                  </button>
                </div>
              )}
              {couponError && <p className="text-[11px] text-red-500 mt-2">{couponError}</p>}
            </div>

            {/* Total */}
            <div className="bg-white p-4 border border-black/[0.06]">
              {(couponResult?.valid || shippingCost > 0 || isFreeShipping) && (
                <>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[13px] text-black/40">Zwischensumme</span>
                    <span className="text-[13px] text-black/40">€ {fmtPrice(subtotal)}</span>
                  </div>
                  {shippingOpt && (
                    <div className="flex justify-between mb-1.5">
                      <span className="text-[13px] text-black/40">Versand ({shippingOpt.label})</span>
                      {isFreeShipping ? (
                        <span className="text-[13px] text-[#34C759]">Gratis</span>
                      ) : (
                        <span className="text-[13px] text-black/40">€ {fmtPrice(shippingCost)}</span>
                      )}
                    </div>
                  )}
                  {couponResult?.valid && (
                    <div className="flex justify-between mb-2">
                      <span className="text-[13px] text-[#34C759]">Gutschein</span>
                      <span className="text-[13px] text-[#34C759]">- € {fmtPrice(discountAmount)}</span>
                    </div>
                  )}
                  <div className="h-px bg-black/5 mb-2" />
                </>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-bold text-black">Gesamt</span>
                <span className="text-[20px] font-bold text-black">€ {fmtPrice(total)}</span>
              </div>
            </div>

            {error && <p className="text-[12px] text-red-500 text-center">{error}</p>}
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="px-5 lg:px-16 pt-3 flex-shrink-0" style={{ paddingBottom: isNative ? 'max(env(safe-area-inset-bottom, 0px), 12px)' : '12px' }}>
        {step < 4 ? (
          <button onClick={handleNext} disabled={!canNext}
            className={`w-full py-3.5 flex items-center justify-center gap-2 text-[12px] font-light transition-all border ${
              canNext ? 'bg-black text-white border-black hover:bg-white hover:text-black' : 'bg-[#f6f5f3] text-black/20 border-transparent'}`}
            style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Weiter <ChevronRight size={14} strokeWidth={1.5} />
          </button>
        ) : (
          <button onClick={handlePlace} disabled={placing}
            className="w-full py-3.5 flex items-center justify-center gap-2 bg-black text-white text-[12px] font-light border border-black hover:bg-white hover:text-black transition-all duration-300 disabled:opacity-50"
            style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            {placing ? (
              <><div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" /> Wird verarbeitet…</>
            ) : (
              <>Bestellen — € {fmtPrice(total)}</>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
