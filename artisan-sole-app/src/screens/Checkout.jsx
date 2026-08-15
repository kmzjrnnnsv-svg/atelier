import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { isNative } from '../App'
import { ArrowLeft, Check, ChevronRight, ShoppingBag, Plus, Minus, CheckCircle2, X, Ticket, Truck, Building2, PackageOpen } from 'lucide-react'
import { apiFetch } from '../hooks/useApi'
import useStore from '../store/store'
import { useAuth } from '../context/AuthContext'
import { shoePath } from '../lib/shoePath'
import { toFormAddress, streetLine } from '../lib/address'
import { specFromCartItem } from '../lib/orderSpec'
import { accessoryImages } from '../lib/accessoryImages'
import AffiliateVorteil from '../components/AffiliateVorteil'

// Zubehör kommt aus dem Store (dieselbe Quelle wie die Zubehörseite).

// ── Step indicator ────────────────────────────────────────────────────────────
const STEPS = ['Warenkorb', 'Lieferung', 'Rechnung', 'Zubehör', 'Übersicht']

// Der Bestellvorgang lief über die volle Fensterbreite. Auf einem breiten
// Schirm zog das die Eingabefelder auf zwei Meter auseinander — man musste die
// Augen wandern lassen, um eine Postleitzahl einzutippen. Ein Formular liest
// sich in einer Spalte besser, deshalb eine feste, mittige Breite.
const SHELL = 'w-full max-w-[680px] mx-auto px-5'

function StepBar({ current }) {
  return (
    <div className={`flex items-center gap-1 ${SHELL} py-5`}>
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center" style={{ flex: i < STEPS.length - 1 ? '1 1 0' : 'none' }}>
          <div className="flex flex-col items-center gap-1">
            <div className={`w-7 h-7 flex items-center justify-center text-[11px] transition-all ${
              i < current  ? 'bg-black text-white' :
              i === current ? 'bg-black text-white' :
              'bg-[#f6f5f3] text-black/25'
            }`} style={{ fontWeight: 300 }}>
              {i < current ? <Check size={12} strokeWidth={2} /> : i + 1}
            </div>
            <span className={`text-[9px] uppercase whitespace-nowrap ${i === current ? 'text-black font-normal' : 'text-black/35 font-light'}`} style={{ letterSpacing: '0.12em' }}>
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
        {/* Getrennt, weil sich eine fehlende Hausnummer sonst nicht bemerken
            lässt: In einem gemeinsamen Feld ist „Robert Mayer Straße" ausgefüllt
            und trotzdem unzustellbar. */}
        <div className="flex gap-2">
          <input className={inp} placeholder="Straße" value={value.street || ''} onChange={e => f('street', e.target.value)} style={{ flex: 1 }} autoComplete="address-line1" />
          <input className={inp} placeholder="Nr." value={value.house_number || ''} onChange={e => f('house_number', e.target.value)} style={{ width: '30%' }} autoComplete="address-line2" />
        </div>
        <div className="flex gap-2">
          <input className={inp} placeholder="PLZ" value={value.zip || ''} onChange={e => f('zip', e.target.value)} style={{ width: '35%' }} autoComplete="postal-code" />
          <input className={inp} placeholder="Stadt" value={value.city || ''} onChange={e => f('city', e.target.value)} style={{ flex: 1 }} autoComplete="address-level2" />
        </div>
        <input className={inp} placeholder="Land" value={value.country || ''} onChange={e => f('country', e.target.value)} />
        <input className={inp} placeholder="Telefon (optional)" value={value.phone || ''} onChange={e => f('phone', e.target.value)} />
      </div>
    </div>
  )
}

function isAddrComplete(a) {
  // Die Hausnummer zählt ausdrücklich dazu — ohne sie kommt nichts an.
  return !!(a.name && a.street && a.house_number && a.zip && a.city && a.country)
}

// ── Accessory card ────────────────────────────────────────────────────────────
/**
 * Zubehör im Bestellvorgang — dieselben Artikel und Bilder wie auf der
 * Zubehörseite. Vorher stand hier nur ein Pluszeichen in einem grauen Kasten,
 * und Artikel, die schon im Warenkorb lagen, fehlten ganz; man konnte nicht
 * sehen, was man bereits hatte.
 */
function AccessoryCard({ item, anzahl, onPlus, onMinus }) {
  return (
    <div className={`w-full flex items-center gap-3.5 p-3 bg-white transition-all ${anzahl > 0 ? 'border-l-2 border-l-black' : 'border-l-2 border-l-transparent'}`}>
      {/* Bild wie auf der Zubehörseite, nur kleiner */}
      <div className="w-14 h-[74px] flex-shrink-0 bg-[#f6f5f3] overflow-hidden flex items-center justify-center">
        {item.image
          ? <img src={item.image} alt="" className="w-full h-full object-cover" />
          : <ShoppingBag size={16} strokeWidth={0.8} className="text-black/10" />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-black leading-tight">{item.name}</p>
        {item.desc && <p className="text-[10px] text-black/40 mt-0.5 line-clamp-2 leading-relaxed">{item.desc}</p>}
        <p className="text-[12px] text-black/70 mt-1">{item.price}</p>
      </div>

      {/* Anzahl statt eines bloßen Hakens: Wer zweimal hinzufügt, sieht die 2. */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {anzahl > 0 && (
          <>
            <button onClick={onMinus} aria-label="Eins weniger"
              className="w-8 h-8 flex items-center justify-center border border-black/12 bg-white text-black/50">
              <Minus size={13} strokeWidth={2} />
            </button>
            <span className="w-6 text-center text-[13px] font-medium text-black">{anzahl}</span>
          </>
        )}
        <button onClick={onPlus} aria-label="Hinzufügen"
          className={`w-8 h-8 flex items-center justify-center transition-all ${anzahl > 0 ? 'bg-black text-white' : 'bg-black/[0.04] text-black/40'}`}>
          <Plus size={14} strokeWidth={2} />
        </button>
      </div>
    </div>
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
  const { user } = useAuth()
  const { latestScan, placeOrder, footNotes, cart, removeFromCart, updateCartQty, clearCart, savedDeliveryAddress, savedBillingAddress, saveAddresses, validateCoupon, validateBusinessCode, fetchMyCampaigns, accessories: storeAccessories, shoes, affiliate } = useStore()
  const isPromo = !!user?.is_promotion
  const promoDiscountPct = user?.promotion_discount_pct || 0

  const product = location.state?.product || {}
  const incomingAccessories = location.state?.accessories || []
  /**
   * Der Gürtel aus dem Direktkauf.
   *
   * Er lässt sich nicht wie das übrige Zubehör über seine Kennung
   * mitführen: Von einem Pflegeset gibt es genau eines, von einem Gürtel
   * einen je Konfiguration. Er reist deshalb als fertige Position mit —
   * Name, Betrag und Konfiguration in einem.
   */
  const guertelDirekt = location.state?.guertel || null
  const startStep = product.id ? 1 : 0

  const emptyAddr = { name:'', street:'', house_number:'', zip:'', city:'', country:'Deutschland', phone:'' }
  const [step,        setStep]        = useState(startStep)
  const [delivery,    setDelivery]    = useState(toFormAddress(savedDeliveryAddress) || emptyAddr)
  const [sameBilling, setSameBilling] = useState(true)
  const [billing,     setBilling]     = useState(toFormAddress(savedBillingAddress) || emptyAddr)
  const [selectedAcc, setSelectedAcc] = useState([])
  const [placing,     setPlacing]     = useState(false)
  const [placed,      setPlaced]      = useState(null)
  const [error,       setError]       = useState(null)
  const [couponCode,    setCouponCode]    = useState('')
  const [couponResult,  setCouponResult]  = useState(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError,   setCouponError]   = useState(null)
  const [bizCode,       setBizCode]       = useState('')
  const [bizResult,     setBizResult]     = useState(null)
  const [bizLoading,    setBizLoading]    = useState(false)
  const [bizError,      setBizError]      = useState(null)
  const [shippingOptions, setShippingOptions] = useState([])
  const [selectedShipping, setSelectedShipping] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  // Passform-Maße auf der Bestellseite bestätigen/ändern
  /**
   * Passt der Schuh überhaupt? Ohne bestimmten Leisten gibt es keine Form,
   * die zu diesen Maßen gehört — der Schuh würde nicht sitzen.
   *
   * Die Warnung nennt bewusst keinen Grund. Welche Leisten es gibt und welche
   * Maße sie abdecken, ist Betriebswissen und geht den Käufer nichts an; er
   * braucht nur die Auskunft, dass es für ihn nicht passt.
   */
  const ohnePassform = (product.id ? [product] : cart.filter(c => !c.isAccessory))
    .filter(it => {
      const m = typeof it.footMeasurementsUsed === 'string'
        ? (() => { try { return JSON.parse(it.footMeasurementsUsed) } catch { return null } })()
        : it.footMeasurementsUsed
      // Nur wenn Maße vorliegen, aber kein Leisten dazu bestimmt wurde.
      return m?.foot_length_mm && !(it.last || it.lastLabel)
    })
  const [passformAkzeptiert, setPassformAkzeptiert] = useState(false)

  // Die Passform ist ab hier festgeschrieben. Wer andere Maße braucht, legt
  // eine neue Konfiguration an — sonst stünden Maße und bereits bestimmte
  // Leisten auseinander, und gefertigt würde nach dem einen, angezeigt das
  // andere.

  // Kampagnen des Mitarbeiters laden (für automatischen Kampagnen-Rabatt).
  useEffect(() => {
    if (!user) return
    fetchMyCampaigns().then(rows => setCampaigns(Array.isArray(rows) ? rows : [])).catch(() => {})
  }, [user])

  useEffect(() => {
    apiFetch('/api/shipping').then(opts => {
      setShippingOptions(opts || [])
      const def = (opts || []).find(o => o.is_default) || opts?.[0]
      if (def) setSelectedShipping(def.id)
    }).catch(() => {})
  }, [])


  // Immer der vollständige Katalog, in derselben Reihenfolge wie auf der
  // Zubehörseite. Vorher wurde nach Modell gefiltert und alles ausgeblendet,
  // was schon im Warenkorb lag — dadurch verschwanden Artikel aus der Liste,
  // statt mit ihrer Anzahl dazustehen.
  const allAccessories = (storeAccessories || [])
    .filter(a => a.is_active !== 0)
    .slice()
    .sort((x, y) => (x.sort_order ?? 0) - (y.sort_order ?? 0))
    .map(a => ({
      id: a.id,
      name: a.name,
      desc: a.description || '',
      // Deutsche Schreibweise mit zwei Nachkommastellen: „€ 23.7" sah aus
      // wie ein Tippfehler.
      price: `€ ${(parseFloat(a.price) || 0).toFixed(2).replace('.', ',')}`,
      priceNum: parseFloat(a.price) || 0,
      image: accessoryImages(a)[0] || null,
    }))

  // Wie oft liegt dieser Artikel schon im Warenkorb?
  const imWarenkorb = (id) => cart
    .filter(c => c.isAccessory && String(c.id) === `acc-${id}`)
    .reduce((n, c) => n + (c.qty || 1), 0)

  // Anzahl auf dieser Seite = im Warenkorb + hier gewählt.
  const anzahlVon = (id) => imWarenkorb(id) + selectedAcc.filter(x => x === id).length

  const [initialized, setInitialized] = useState(false)
  if (!initialized && incomingAccessories.length > 0) {
    setSelectedAcc(incomingAccessories.map(a => a.id))
    setInitialized(true)
  }

  // Mehrfach möglich: Der Eintrag darf mehrmals in der Liste stehen, sonst
  // liesse sich „zweimal dasselbe" nicht abbilden.
  const accPlus  = id => setSelectedAcc(prev => [...prev, id])
  const accMinus = id => setSelectedAcc(prev => {
    const i = prev.lastIndexOf(id)
    return i === -1 ? prev : [...prev.slice(0, i), ...prev.slice(i + 1)]
  })

  const chosenAccessories = selectedAcc.map(id => allAccessories.find(a => a.id === id)).filter(Boolean)

  const shoePrice = parsePrice(product.price)
  const cartTotal = cart.reduce((sum, item) => sum + parsePrice(item.price) * item.qty, 0)
  // Die Zusage des Affiliates hängt am Paar, nicht am Zubehör: Ohne Schuh
  // gibt es weder Nachlass noch Zugabe, und dann soll auch nichts davon
  // versprochen werden.
  const hatSchuh = !!product.id || cart.some(c => !c.isAccessory)
  const guertelPreis = guertelDirekt ? parsePrice(guertelDirekt.price) : 0
  const accTotal  = chosenAccessories.reduce((sum, a) => sum + a.priceNum, 0) + guertelPreis
  const accPromoDiscount = isPromo && promoDiscountPct > 0 ? Math.round(accTotal * promoDiscountPct / 100) : 0
  const subtotal  = (product.id ? shoePrice : cartTotal) + accTotal - accPromoDiscount
  const discountAmount = couponResult?.valid ? couponResult.discount_amount : 0
  // Firmencode deckt den Schuhpreis (voll) oder gewährt einen Rabatt darauf.
  const bizDiscount = (() => {
    if (!bizResult?.valid || !product.id) return 0
    if (bizResult.coverage_type === 'full') return shoePrice
    if (bizResult.coverage_type === 'discount') {
      return bizResult.discount_type === 'percentage'
        ? Math.round(shoePrice * (bizResult.discount_value / 100))
        : Math.min(bizResult.discount_value, shoePrice)
    }
    return 0
  })()
  // Aktive Kampagne für dieses Produkt (kein Firmencode aktiv → Kampagne greift).
  const activeCampaign = (!bizResult?.valid && product.id)
    ? campaigns.find(c => !c.allowed_shoe_ids || c.allowed_shoe_ids.includes(product.id)) || null
    : null
  const campaignDiscount = activeCampaign
    ? (activeCampaign.payment_mode === 'company'
        ? shoePrice
        : Math.round(shoePrice * (activeCampaign.discount_pct / 100)))
    : 0
  const shippingOpt = shippingOptions.find(o => o.id === selectedShipping)
  const isFreeShipping = (couponResult?.valid && couponResult.type === 'free_shipping') ||
    (shippingOpt?.free_above && subtotal >= shippingOpt.free_above)
  const shippingCost = isFreeShipping ? 0 : (shippingOpt?.price || 0)
  const total     = Math.max(0, subtotal + shippingCost - discountAmount - bizDiscount - campaignDiscount)

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

  const handleApplyBizCode = async () => {
    if (!bizCode.trim()) return
    setBizLoading(true)
    setBizError(null)
    try {
      const res = await validateBusinessCode(bizCode.trim(), product.id || null)
      if (res.valid) { setBizResult(res); setBizError(null) }
      else { setBizResult(null); setBizError(res.reason || 'Code ungültig') }
    } catch { setBizError('Fehler bei der Code-Prüfung') }
    finally { setBizLoading(false) }
  }
  const handleRemoveBizCode = () => { setBizResult(null); setBizCode(''); setBizError(null) }

  const canNext = step === 0 ? cart.length > 0
    : step === 1 ? isAddrComplete(delivery)
    : step === 2 ? (sameBilling || isAddrComplete(billing))
    : true

  // Sobald die Lieferanschrift vollständig ist, wandert sie ins Konto —
  // nicht erst mit der Bestellung. Wer den Vorgang abbricht, findet sie beim
  // nächsten Mal trotzdem vor.
  useEffect(() => {
    if (!user || !isAddrComplete(delivery)) return
    const t = setTimeout(() => {
      saveAddresses(delivery, sameBilling ? null : billing).catch(() => {})
    }, 800)
    return () => clearTimeout(t)
  }, [user, JSON.stringify(delivery), JSON.stringify(billing), sameBilling])

  /**
   * Weiter — oder erst zur Anmeldung.
   *
   * Der Warenkorb steht jedem offen: Wer im Laden einen QR-Code scannt, soll
   * sich einen Schuh zusammenstellen und den Preis samt Vorteil sehen können,
   * ohne vorher ein Konto anzulegen. Ab der Lieferadresse geht es nicht mehr
   * ohne — dort beginnen Daten, die zu einer Person gehören. Der Korb bleibt
   * dabei erhalten, und nach der Anmeldung geht es hier weiter.
   */
  const handleNext = () => {
    if (!user) {
      navigate('/login', { state: { from: '/checkout' } })
      return
    }
    if (step < 4) setStep(s => s + 1)
  }

  const handlePlace = async () => {
    setPlacing(true)
    setError(null)
    try {
      const billingAddr = sameBilling ? delivery : billing
      const accList = chosenAccessories.map(a => ({ name: a.name, price: a.price, key: a.key || null }))
      // Der Gürtel aus dem Direktkauf, als eigene Position.
      const guertelZeilen = guertelDirekt
        ? [{ name: guertelDirekt.name, price: guertelDirekt.price, key: guertelDirekt.key,
             config_kind: 'belt', belt: guertelDirekt.belt }]
        : []

      // Die Zugabe des Affiliates fährt als Position zu 0 € mit. Ohne sie
      // stünde sie nur im Warenkorb: Der Kunde hätte sie zugesagt bekommen,
      // in der Packliste wäre sie nicht aufgetaucht. Sie hängt am ersten
      // Paar — zugesagt ist eine, nicht eine je Schuh.
      const zugabeZeile = hatSchuh && affiliate?.gift_item
        ? [{ name: `${affiliate.gift_item.name} · Zugabe ${String(affiliate.code || '').toUpperCase()}`, price: '€ 0' }]
        : []

      let lastRow
      const appliedCoupon = couponResult?.valid ? couponCode.trim().toUpperCase() : null
      const appliedBizCode = bizResult?.valid && product.id ? bizCode.trim() : null
      const appliedCampaignId = activeCampaign?.id || null

      const shippingData = shippingOpt ? { shipping_method: shippingOpt.key, shipping_cost: `€ ${fmtPrice(shippingCost)}` } : {}

      if (product.id) {
        lastRow = await placeOrder({
          shoe_id: product.id, shoe_name: product.name || product.shoe_name,
          material: product.material, color: product.color || product.selectedColor || '',
          price: `€ ${fmtPrice(total)}`, eu_size: product.euSize || latestScan?.eu_size || null,
          scan_id: latestScan?.id || null, delivery_address: delivery,
          billing_address: billingAddr, accessories: [...accList, ...guertelZeilen, ...zugabeZeile],
          foot_notes: footNotes || null, coupon_code: appliedCoupon, business_code: appliedBizCode, business_campaign_id: appliedCampaignId,
          // Der Code aus dem Werbelink. Er wurde bislang nirgends
          // mitgeschickt — die Bestellung kam an, die Vermittlung ging
          // verloren. Firmenkampagnen schlagen ihn serverseitig.
          affiliate_code: affiliate?.code || null,
          last_key: product.last || null, last_label: product.lastLabel || null,
          last_width: product.width || null, fit_measurements: product.footMeasurementsUsed || null,
          // Sohle und Zusatzoptionen gehören zur Fertigungsspezifikation. Sie
          // wurden bislang im Warenkorb geführt und beim Bestellen verworfen.
          sole: product.sole || null, extras: product.extras || null,
          // Die Kennung des Entwurfs: Der Server liest die Fertigungsangaben
          // von dort und nicht aus dem, was hier zusammengestellt wurde.
          config_id: product.configId || null,
          ...shippingData,
        })
      } else {
        // Nur Schuhe werden zu Bestellungen. Zubehör hängt als `accessories`
        // an der Schuhbestellung — vorher wurde aus jedem Warenkorb-Eintrag
        // eine eigene Bestellung, auch aus einem Pflegeset, und dasselbe
        // Zubehör landete zusätzlich in accList. Doppelt gezählt und einzeln
        // verschickt.
        const schuhe = cart.filter(c => !c.isAccessory)

        // ── Zubehör AUS DEM WARENKORB ───────────────────────────────────
        //
        // Es gab zwei Töpfe, und nur einer kam an: das hier in der Kasse
        // gewählte Zubehör (accList) und das, was schon im Warenkorb lag.
        // Letzteres wurde angezeigt, in die Zwischensumme gerechnet — und
        // dann von cart.filter(!isAccessory) stillschweigend weggeworfen.
        // Der Kunde sah ein Pflegeset in seiner Bestellung, bezahlte es
        // nicht, und in der Packliste stand es nie.
        //
        // Mehrfache Anzahl wird ausgeschrieben: „2× Pflegeset" als eine
        // Zeile ließe sich in der Fertigung überlesen.
        const korbZubehoer = cart
          .filter(c => c.isAccessory)
          .flatMap(c => Array.from(
            { length: Math.max(1, c.qty || 1) },
            // Kennung und Konfiguration reisen mit. Der Server rechnet den
            // Preis des Gürtels aus den Schlüsseln nach und schreibt den
            // Beschreibungssatz — ohne sie käme dort eine Position ohne
            // Angaben an und würde abgewiesen.
            () => ({
              name: c.name, price: c.price, key: c.accKey || null,
              ...(c.belt ? { config_kind: 'belt', belt: c.belt } : {}),
            }),
          ))

        // ── Eine Zahlung je Korb ────────────────────────────────────────
        //
        // Zwei Paare werden zu zwei Bestellungen — sie werden einzeln
        // gefertigt, einzeln versandt, einzeln storniert. Bezahlt wird aber
        // einmal. Diese Kennung reist an jeder Bestellung mit; der Server
        // erkennt daran, was zusammengehört, und vergibt einen gemeinsamen
        // Verwendungszweck.
        //
        // Vorher zeigte diese Seite den Gesamtbetrag und daneben den
        // Verwendungszweck nur einer der Bestellungen: Wer wie angezeigt
        // überwies, hatte eine überzahlte und eine unbezahlte Bestellung.
        const korbKennung = `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

        // ── Nur Zubehör, das allein reisen darf ─────────────────────────
        //
        // Ohne Paar gibt es keine Schuhbestellung, an die sich das Zubehör
        // hängen könnte. Es wird dann selbst zur Bestellung — mit dem Namen
        // der ersten Position als Bezeichnung, damit in der Übersicht nicht
        // „(ohne Modell)" steht.
        //
        // Der Server prüft dasselbe noch einmal und weist ab, was nicht
        // allein reisen darf. Diese Stelle spart dem Kunden den Weg zur
        // Fehlermeldung, sie ersetzt die Prüfung nicht.
        if (schuhe.length === 0) {
          const erste = korbZubehoer[0]
          lastRow = await placeOrder({
            shoe_id: null,
            shoe_name: erste?.name || 'Zubehör',
            material: erste?.belt ? erste.belt.leder_label : 'Zubehör',
            color: erste?.belt ? erste.belt.farbe_hex : '#000000',
            price: `€ ${fmtPrice(total)}`,
            delivery_address: delivery, billing_address: billingAddr,
            accessories: [...korbZubehoer, ...accList, ...guertelZeilen],
            basket_id: korbKennung,
            ...shippingData,
          })
        }

        for (let i = 0; i < schuhe.length; i++) {
          const item = schuhe[i]
          const itemTotal = parsePrice(item.price) * item.qty

          // Der Preis der ERSTEN Bestellung trägt alles, was nicht an einem
          // einzelnen Paar hängt: Zubehör, Versand, Gutschein, Rabatte. Statt
          // das nachzurechnen — und dabei eine der Stellen zu vergessen —
          // wird vom angezeigten Gesamtbetrag abgezogen, was die anderen
          // Paare kosten. Damit stimmt die Summe der Bestellungen zwangsläufig
          // mit dem überein, was der Kunde vor dem Absenden gesehen hat.
          const andereSchuhe = schuhe
            .filter((_, j) => j !== 0)
            .reduce((s, x) => s + parsePrice(x.price) * x.qty, 0)
          const preis = i === 0 ? Math.max(0, total - andereSchuhe) : itemTotal

          lastRow = await placeOrder({
            shoe_id: item.shoeId || null, shoe_name: item.name,
            material: item.material || '', color: item.color || '',
            price: `€ ${fmtPrice(preis)}`, eu_size: item.euSize || latestScan?.eu_size || null,
            scan_id: latestScan?.id || null, delivery_address: delivery,
            // Zubehör und Zugabe hängen am ersten Paar. An jede Bestellung
            // gehängt wäre dasselbe Pflegeset dreimal in der Packliste.
            billing_address: billingAddr,
            accessories: i === 0 ? [...korbZubehoer, ...accList, ...guertelZeilen, ...zugabeZeile] : [],
            foot_notes: footNotes || null, coupon_code: i === 0 ? appliedCoupon : null,
            affiliate_code: affiliate?.code || null,
            last_key: item.last || null, last_label: item.lastLabel || null,
            last_width: item.width || null, fit_measurements: item.footMeasurementsUsed || null,
            sole: item.sole || null, extras: item.extras || null,
            config_id: item.configId || null,
            basket_id: korbKennung,
            // Versand fällt einmal an, nicht je Paar. Er hing bisher an jeder
            // Bestellung und wurde bei drei Paaren dreifach ausgewiesen.
            ...(i === 0 ? shippingData : {}),
          })
        }

        // Jetzt ist der Korb vollständig — erst jetzt kann der Server die
        // Summe bilden und eine einzige Zahlungsanweisung verschicken.
        // Scheitert der Aufruf, fehlt nur die Mail: Die Zahlungsseite unter
        // „Meine Bestellungen" rechnet dieselbe Summe.
        await apiFetch('/api/orders/zahlung/abschluss', {
          method: 'POST',
          body: JSON.stringify({ basket_id: korbKennung }),
        }).catch(() => {})

        clearCart()
      }
      saveAddresses(delivery, sameBilling ? null : billing).catch(() => {})
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
                {/* Vom Server, nicht hier gebaut. Hier stand zuletzt
                    „AS-42" — eine Kennung, die in keiner Bestellung vorkommt
                    und zu der sich keine Zahlung zuordnen ließ. */}
                <div className="bg-black px-4 py-2.5 text-center">
                  <span className="text-white font-mono font-bold tracking-widest text-[13px] break-all">
                    {placed.verwendungszweck || placed.payment_ref || placed.order_ref}
                  </span>
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

  // ── Empty cart, simple, clean ──
  if (step === 0 && cart.length === 0 && !product.id) {
    return (
      <div className="min-h-full bg-white">
        <div className={`${SHELL} pt-8 lg:pt-14 pb-1`}>
          <p className="text-[10px] text-black/25 uppercase tracking-[0.3em] mb-3">Artisan Sole</p>
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

  // Zubehör reist mit, es reist nicht allein: Ein Pflegeset einzeln zu
  // verschicken kostet rund 30 € Porto — mehr als der Artikel selbst. Statt
  // das am Ende als Fehler zu melden, steht es hier, bevor jemand Adresse und
  // Zahlung ausfüllt.
  /**
   * Zubehör allein — und die Ausnahme davon.
   *
   * Die Regel bleibt: Ein Pflegeset für 23 € einzeln zu verschicken kostet
   * mehr Porto als der Artikel wert ist. Der Gürtel ist die Ausnahme; er
   * trägt sein Porto selbst, und wer ein halbes Jahr nach den Schuhen den
   * passenden Gürtel nachbestellt, soll dafür kein zweites Paar kaufen
   * müssen.
   *
   * Welche Artikel allein reisen dürfen, steht an ihnen (`ships_alone`) und
   * nicht hier — sonst stünde dieselbe Entscheidung an zwei Stellen, und die
   * hier wäre die, die niemand pflegt.
   */
  const darfAllein = (c) => {
    // Am Korbeintrag steht, was beim Hineinlegen galt. Der Umweg über den
    // Bestand ist der Rückfall für ältere Einträge — und er greift nicht bei
    // einem Gast: Dessen Zubehörliste im Laden ist leer, weil sie erst mit
    // der Anmeldung geladen wird. Ohne den Eintrag am Korb hinge die Frage
    // „darf das allein reisen?" also daran, ob jemand angemeldet ist.
    if (typeof c.shipsAlone === 'boolean') return c.shipsAlone
    const artikel = allAccessories.find(a => a.key && a.key === c.accKey)
    return Number(artikel?.ships_alone) === 1
  }
  const nurZubehoer = !product.id && cart.length > 0
    && cart.every(c => c.isAccessory) && !cart.every(darfAllein)
  if (nurZubehoer) {
    return (
      <div className="min-h-full bg-white">
        <div className={`${SHELL} pt-8 lg:pt-14 pb-1`}>
          <p className="text-[10px] text-black/25 uppercase tracking-[0.3em] mb-3">Artisan Sole</p>
          <p className="text-[28px] lg:text-[36px] font-extralight text-black tracking-tight">Einkaufstasche</p>
        </div>
        <div className={`${SHELL} py-14`}>
          <div className="border border-black/10 p-6 lg:p-8">
            <PackageOpen size={22} strokeWidth={1.2} className="text-black/30 mb-4" />
            <p className="text-[15px] font-light text-black">Zubehör gibt es nur zusammen mit einem Paar.</p>
            <p className="text-[12px] text-black/50 font-light leading-relaxed mt-3 max-w-md">
              Der Versand eines einzelnen Pflegesets kostet uns rund 30 €, mehr als
              der Artikel selbst. Das wollen wir niemandem berechnen. Legen Sie ein
              Modell dazu, dann geht Ihr Zubehör im selben Paket mit, ohne
              zusätzlichen Versand.
            </p>

            <div className="mt-6 pt-5 border-t border-black/[0.07]">
              <p className="text-[10px] uppercase tracking-[0.14em] text-black/30 mb-2.5">In Ihrer Tasche</p>
              {cart.map(c => (
                <div key={c.id} className="flex items-center justify-between py-1.5">
                  <span className="text-[12px] text-black/70">{c.qty}× {c.name}</span>
                  <button
                    onClick={() => removeFromCart(c.id)}
                    className="text-[11px] text-black/35 hover:text-black bg-transparent border-0 p-0 underline underline-offset-2"
                  >
                    entfernen
                  </button>
                </div>
              ))}
              <p className="text-[11px] text-black/35 font-light mt-3">
                Es bleibt liegen, bis Sie ein Paar dazulegen.
              </p>
            </div>

            <button
              onClick={() => navigate('/collection')}
              className="mt-7 w-full sm:w-auto px-8 py-3 bg-black text-white text-[11px] font-light border-0"
              style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}
            >
              Kollektion ansehen
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full bg-white">

      {/* Header */}
      <div className={`${SHELL} pt-4 pb-2 flex items-center gap-3 flex-shrink-0`}>
        <button onClick={() => {
            if (step > 0) { setStep(s => s - 1); return }
            // Navigate back to the last configured shoe
            const lastShoe = [...cart].reverse().find(c => !c.isAccessory && c.shoeId)
            if (lastShoe) {
              const product = shoes.find(s => s.id === lastShoe.shoeId)
              if (product) {
                navigate(shoePath(product), { state: { product } })
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

      {/* Der Inhalt der Schritte teilt dieselbe Spaltenbreite wie Kopf- und
          Fußzeile — sonst stünden Felder und Knöpfe verschieden weit außen. */}
      <div className="flex-1 overflow-y-auto pb-6 w-full max-w-[680px] mx-auto">

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
                          {(item.lastLabel || item.euSize) && (
                            <p className="text-[10px] text-black/30 mt-0.5 font-light">
                              Passform: {[
                                item.lastLabel,
                                item.euSize && `${item.sizeSystem || 'EU'} ${item.euSize}`,
                                item.width && `Weite ${item.width}`,
                              ].filter(Boolean).join(' · ')}
                            </p>
                          )}
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

            {/* Was der Werbecode zusagt — hier, nicht erst am Ende. Wer über
                einen QR-Code aus einem Laden kam, soll es wiederfinden. */}
            {hatSchuh && <AffiliateVorteil affiliate={affiliate} />}

            {/* Für Gäste: Der Korb bleibt liegen, die Anmeldung kommt später.
                Ohne diesen Satz wirkt der Weiter-Knopf wie eine Falle. */}
            {!user && (
              <div className="border border-black/[0.06] px-4 py-3">
                <p className="text-[12px] text-black/55 font-light leading-relaxed">
                  Zum Bestellen brauchen wir ein Konto, für Lieferadresse und Fertigungsstand.
                  Ihr Warenkorb bleibt dabei erhalten{affiliate?.code ? ', Ihr Vorteil ebenfalls' : ''}.
                </p>
              </div>
            )}
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
              {/* Kein Kontrollkästchen mehr: Die Anschrift wird immer im Konto
                  hinterlegt. Wer bestellt, hat sie ohnehin angegeben, und beim
                  nächsten Mal steht sie sofort da. */}
              <p className="text-[11px] text-black/30 mt-3 font-light">
                Die Anschrift wird in Ihrem Konto gespeichert.
              </p>
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
                    anzahl={anzahlVon(item.id)}
                    onPlus={() => accPlus(item.id)}
                    onMinus={() => accMinus(item.id)} />
                ))}
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
                    {(product.lastLabel || product.euSize) && (
                      <p className="text-[10px] text-black/30 mt-0.5 font-light">
                        Passform: {[
                          product.lastLabel,
                          product.euSize && `${product.sizeSystem || 'EU'} ${product.euSize}`,
                          product.width && `Weite ${product.width}`,
                        ].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    {latestScan && <p className="text-[11px] text-[#007AFF] mt-0.5">EU {latestScan.eu_size}, 3D-Scan</p>}
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

            {/* Vollständige Aufstellung dessen, was gefertigt wird — dieselbe
                Quelle wie später in der Bestellung und beim Betreiber. Vorher
                stand hier nur Leder und Sohle; wer eine Verzierung oder eine
                Sohlenfarbe gewählt hatte, konnte vor dem Absenden nicht
                nachsehen, ob sie richtig übernommen wurde. */}
            {(product.id ? [product] : cart.filter(c => !c.isAccessory)).map((item, idx) => {
              const rows = specFromCartItem(item)
              if (!rows.length) return null
              return (
                <div key={item.id || idx} className="bg-white p-4 border border-black/[0.06]">
                  <p className="text-[10px] font-bold text-black/30 uppercase tracking-wider mb-2">
                    Ihre Konfiguration{(product.id ? false : cart.length > 1) ? ` · ${item.name}` : ''}
                  </p>
                  <table className="w-full">
                    <tbody>
                      {rows.map(([k, v]) => (
                        <tr key={k}>
                          <td className="text-[11px] text-black/40 align-top pr-3 py-[2px] whitespace-nowrap">{k}</td>
                          <td className="text-[11px] text-black/75 align-top py-[2px] text-right">{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })}

            {ohnePassform.length > 0 && (
              <div className="bg-amber-50 border border-amber-300 p-4">
                <p className="text-[11px] font-bold text-amber-900 uppercase tracking-wider mb-1.5">
                  Dieser Schuh passt nicht zu Ihren Maßen
                </p>
                <p className="text-[12px] text-amber-900 leading-relaxed font-light">
                  Für die hinterlegten Maße können wir bei diesem Modell keine passende Form
                  anbieten. Bestellen Sie trotzdem, wird der Schuh mit hoher Wahrscheinlichkeit
                  nicht richtig sitzen, ein Umtausch aus diesem Grund ist bei Maßanfertigungen
                  nicht möglich.
                </p>
                <p className="text-[12px] text-amber-900 leading-relaxed font-light mt-2">
                  Bitte prüfen Sie Ihre Maße oder wählen Sie ein anderes Modell. Gern beraten
                  wir Sie auch persönlich.
                </p>
                <button
                  onClick={() => setPassformAkzeptiert(v => !v)}
                  className="mt-3 flex items-start gap-2.5 text-left bg-transparent border-0 p-0"
                >
                  <span className={`w-4 h-4 mt-0.5 flex-shrink-0 flex items-center justify-center ${passformAkzeptiert ? 'bg-amber-800' : 'border border-amber-700'}`}>
                    {passformAkzeptiert && <Check size={11} strokeWidth={2.5} className="text-white" />}
                  </span>
                  <span className="text-[12px] text-amber-900 font-light leading-relaxed">
                    Ich habe verstanden, dass dieser Schuh voraussichtlich nicht passt, und
                    möchte ihn dennoch bestellen.
                  </span>
                </button>
              </div>
            )}

            {/* Passform — festgeschrieben, nicht mehr änderbar.
                Die Maße kommen aus der Konfiguration, nicht aus dem Profil.
                Vorher zeigte dieser Kasten die Profilmaße, während die
                Fertigung darüber die der Konfiguration führte: zwei
                verschiedene Zahlenpaare auf einer Seite, und gebaut worden
                wäre nach dem einen, geglaubt das andere. */}
            {product.id && (() => {
              const m = typeof product.footMeasurementsUsed === 'string'
                ? (() => { try { return JSON.parse(product.footMeasurementsUsed) } catch { return null } })()
                : product.footMeasurementsUsed
              return (
                <div className="bg-white p-4 border border-black/[0.06]">
                  <p className="text-[10px] font-bold text-black/30 uppercase tracking-wider">Passform</p>
                  {m?.foot_length_mm ? (
                    <>
                      <p className="text-[12px] text-black/60 mt-1">
                        {m.foot_length_mm} mm Länge{m.ball_girth_mm ? ` · ${m.ball_girth_mm} mm Ballenumfang` : ''}
                      </p>
                      <p className="text-[10px] text-black/30 mt-1.5 font-light leading-relaxed">
                        Diese Maße gehören zu dieser Konfiguration und lassen sich hier nicht mehr
                        ändern. Für andere Maße stellen Sie den Schuh bitte neu zusammen, nur so
                        werden Leisten, Weite und Größe passend dazu bestimmt.
                      </p>
                      <button
                        onClick={() => {
                          const shoe = shoes.find(s => String(s.id) === String(product.id))
                          navigate(shoe ? shoePath(shoe) : '/collection')
                        }}
                        className="mt-2 text-[10px] text-black/45 hover:text-black underline underline-offset-2 bg-transparent border-0 p-0"
                      >
                        Neu konfigurieren
                      </button>
                    </>
                  ) : (
                    <p className="text-[12px] text-black/45 mt-1">Für diese Konfiguration sind keine Maße hinterlegt.</p>
                  )}
                </div>
              )
            })()}

            {/* Accessories */}
            {chosenAccessories.length > 0 && (
              <div className="bg-white p-4 border border-black/[0.06]">
                <p className="text-[10px] font-bold text-black/30 uppercase tracking-wider mb-2">
                  Zubehör
                  {accPromoDiscount > 0 && <span className="text-[9px] text-black/40 normal-case ml-2">({promoDiscountPct}% Promo-Rabatt)</span>}
                </p>
                {chosenAccessories.map(a => {
                  const discounted = accPromoDiscount > 0 ? Math.round(a.priceNum * (1 - promoDiscountPct / 100)) : null
                  return (
                    <div key={a.id} className="flex justify-between items-center py-1.5 border-b border-black/5 last:border-0">
                      <span className="text-[13px] text-black/60">{a.name}</span>
                      {discounted !== null ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] text-black/25 line-through">{a.price}</span>
                          <span className="text-[13px] font-semibold text-black">€ {discounted}</span>
                        </div>
                      ) : (
                        <span className="text-[13px] font-semibold text-black">{a.price}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Der Vorteil aus dem Werbecode — noch einmal unmittelbar vor dem
                Bestellen. Er ist Teil dessen, was hier zugesagt wird, und
                gehört deshalb auf dieselbe Seite wie der Gesamtbetrag. */}
            {hatSchuh && <AffiliateVorteil affiliate={affiliate} kompakt />}

            {/* Address */}
            <div className="bg-white p-4 border border-black/[0.06]">
              <p className="text-[10px] font-bold text-black/30 uppercase tracking-wider mb-2">Lieferadresse</p>
              <p className="text-[12px] text-black/55 leading-relaxed">
                {delivery.name}<br />{streetLine(delivery)}<br />{delivery.zip} {delivery.city}<br />{delivery.country}
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

            {/* Firmencode (Einmal-Code), nur bei Einzelprodukt */}
            {product.id && (
              <div className="bg-white p-4 border border-black/[0.06]">
                <p className="text-[10px] font-bold text-black/30 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Building2 size={11} /> Firmencode
                </p>
                {bizResult?.valid ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[13px] font-bold text-[#34C759]">{bizCode.toUpperCase()}</span>
                      <span className="text-[11px] text-[#34C759] ml-2">
                        {bizResult.coverage_type === 'full' ? 'Voll gedeckt' : `Rabatt ${bizResult.discount_value}${bizResult.discount_type === 'percentage' ? ' %' : ' €'}`}
                        {bizResult.business_name ? ` · ${bizResult.business_name}` : ''}
                      </span>
                    </div>
                    <button onClick={handleRemoveBizCode} className="text-black/25 border-0 bg-transparent"><X size={14} /></button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      className="flex-1 bg-black/[0.03] border-0 px-3 py-2.5 text-[14px] uppercase placeholder-black/25 focus:outline-none"
                      placeholder="Code Ihres Unternehmens" value={bizCode}
                      onChange={e => setBizCode(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleApplyBizCode()} />
                    <button onClick={handleApplyBizCode} disabled={bizLoading || !bizCode.trim()}
                      className="px-4 py-2.5 bg-black text-white text-[12px] font-semibold border-0 disabled:opacity-30">
                      {bizLoading ? '…' : 'Einlösen'}
                    </button>
                  </div>
                )}
                {bizError && <p className="text-[11px] text-red-500 mt-2">{bizError}</p>}
              </div>
            )}

            {/* Total */}
            <div className="bg-white p-4 border border-black/[0.06]">
              {(couponResult?.valid || bizDiscount > 0 || campaignDiscount > 0 || shippingCost > 0 || isFreeShipping || accPromoDiscount > 0) && (
                <>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[13px] text-black/40">Zwischensumme</span>
                    <span className="text-[13px] text-black/40">€ {fmtPrice(subtotal + accPromoDiscount)}</span>
                  </div>
                  {accPromoDiscount > 0 && (
                    <div className="flex justify-between mb-1.5">
                      <span className="text-[13px] text-black/40">Promo-Rabatt ({promoDiscountPct}% auf Zubehör)</span>
                      <span className="text-[13px] text-[#34C759]">- € {fmtPrice(accPromoDiscount)}</span>
                    </div>
                  )}
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
                  {bizDiscount > 0 && (
                    <div className="flex justify-between mb-2">
                      <span className="text-[13px] text-[#34C759]">Firmencode{bizResult?.coverage_type === 'full' ? ' (voll gedeckt)' : ''}</span>
                      <span className="text-[13px] text-[#34C759]">- € {fmtPrice(bizDiscount)}</span>
                    </div>
                  )}
                  {campaignDiscount > 0 && (
                    <div className="flex justify-between mb-2">
                      <span className="text-[13px] text-[#34C759]">{activeCampaign?.name || 'Firmenkampagne'}{activeCampaign?.payment_mode === 'company' ? ' (Firma zahlt)' : ` (-${activeCampaign?.discount_pct}%)`}</span>
                      <span className="text-[13px] text-[#34C759]">- € {fmtPrice(campaignDiscount)}</span>
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
      <div className={`${SHELL} pt-3 flex-shrink-0`} style={{ paddingBottom: isNative ? 'max(env(safe-area-inset-bottom, 0px), 12px)' : '12px' }}>
        {step < 4 ? (
          <button onClick={handleNext} disabled={!canNext}
            className={`w-full py-3.5 flex items-center justify-center gap-2 text-[12px] font-light transition-all border ${
              canNext ? 'bg-black text-white border-black hover:bg-white hover:text-black' : 'bg-[#f6f5f3] text-black/20 border-transparent'}`}
            style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            {user ? 'Weiter' : 'Anmelden und fortfahren'} <ChevronRight size={14} strokeWidth={1.5} />
          </button>
        ) : (
          <button onClick={handlePlace} disabled={placing || (ohnePassform.length > 0 && !passformAkzeptiert)}
            className="w-full py-3.5 flex items-center justify-center gap-2 bg-black text-white text-[12px] font-light border border-black hover:bg-white hover:text-black transition-all duration-300 disabled:opacity-50"
            style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            {placing ? (
              <><div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" /> Wird verarbeitet…</>
            ) : (
              <>Bestellen, € {fmtPrice(total)}</>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
