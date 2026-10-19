import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { isNative } from '../App'
import { ArrowLeft, Check, ShoppingBag, Plus, Minus, Lock, ChevronDown, PackageOpen, Landmark } from 'lucide-react'
import { apiFetch } from '../hooks/useApi'
import useStore from '../store/store'
import { useAuth } from '../context/AuthContext'
import { shoePath } from '../lib/shoePath'
import { toFormAddress, isAddressComplete } from '../lib/address'
import { specFromCartItem } from '../lib/orderSpec'
import { accessoryImages } from '../lib/accessoryImages'
import { resolveMediaUrl } from '../lib/mediaUrl'
import { Preishinweis } from '../lib/preisangabe'
import { useFensterHoehe } from '../lib/fensterHoehe'
import AffiliateVorteil from '../components/AffiliateVorteil'
import Ueberweisung from '../components/Ueberweisung'
import Adressfelder from '../components/kasse/Adressfelder'
import Auswahlkarte from '../components/kasse/Auswahlkarte'
import Bestaetigung from '../components/kasse/Bestaetigung'

/*
 * ── Der Bestellvorgang ──────────────────────────────────────────────────────
 *
 * Zwei Ansichten statt fünf Schritten. Vorher führte eine Schrittleiste durch
 * Warenkorb, Lieferung, Rechnung, Zubehör und Übersicht; wer bestellen
 * wollte, klickte viermal „Weiter", um am Ende auf einer Seite zu landen, die
 * alles noch einmal zusammenfasste.
 *
 *   Tasche  Was drin ist, mit Bild und Konfiguration, dazu das Zubehör.
 *   Kasse   Eine Seite wie bei Stripe: links (am Telefon oben, aufklappbar)
 *           die Bestellübersicht, rechts das Formular von der Anschrift bis
 *           zum Bezahlknopf. Was bestätigt wird, steht im selben Blick wie
 *           der Betrag.
 *
 * Gezahlt wird weiter per Überweisung. Die Bankverbindung samt GiroCode
 * steht auf der Danke-Seite (components/Ueberweisung.jsx) und in der Mail.
 */

// Merkt sich den Direktkauf über die Anmeldung hinweg. Vorher stand der Gast
// nach dem Anmelden vor einer leeren Tasche: Das konfigurierte Paar reiste
// nur im Zustand der Navigation mit, und der geht beim Umweg verloren.
const DIREKTKAUF = 'as_direktkauf'

// ── Zubehörkarte ─────────────────────────────────────────────────────────────
/**
 * Dieselben Artikel und Bilder wie auf der Zubehörseite, mit Anzahl statt
 * eines bloßen Hakens: Wer zweimal hinzufügt, sieht die 2.
 */
function AccessoryCard({ item, anzahl, onPlus, onMinus }) {
  return (
    <div className="flex items-center gap-4 py-3">
      <div className="w-16 h-16 shrink-0 rounded-md overflow-hidden bild-im-grund g-angebot flex items-center justify-center">
        {item.image
          ? <img src={item.image} alt="" className="w-full h-full object-cover" />
          : <ShoppingBag size={18} strokeWidth={1} className="c-leise" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="t-feld">{item.name}</p>
        {item.desc && <p className="t-klein c-leise line-clamp-2">{item.desc}</p>}
        <p className="t-klein c-tinte mt-0.5 tabular-nums">{item.price}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {anzahl > 0 && (
          <>
            <button onClick={onMinus} aria-label={`${item.name}: eins weniger`}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-transparent border border-black/15 c-tinte hover:border-black/40">
              <Minus size={14} strokeWidth={1.6} />
            </button>
            <span className="t-feld w-7 text-center tabular-nums" aria-live="polite">{anzahl}</span>
          </>
        )}
        <button onClick={onPlus} aria-label={`${item.name} hinzufügen`}
          className={`w-10 h-10 rounded-full flex items-center justify-center border-0 transition-colors ${
            anzahl > 0 ? 'g-akzent' : 'bg-black/[0.05] c-tinte hover:bg-black/[0.09]'}`}>
          <Plus size={15} strokeWidth={1.6} />
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

/**
 * Beträge, bei denen die Cents zählen.
 *
 * Die Preise im Laden sind runde Zahlen, deshalb zeigt `fmtPrice` keine
 * Nachkommastellen. Die enthaltene Umsatzsteuer ist keine runde Zahl: In
 * 1.450 € stecken 231,51 €. Als „232 €" gerundet wäre sie eine andere Zahl
 * als die auf der Rechnung, und wer beide nebeneinanderlegt, findet einen
 * Fehler, wo keiner ist.
 */
function fmtCent(n) {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── Main Checkout ─────────────────────────────────────────────────────────────
export default function Checkout() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { user, logout } = useAuth()
  const { latestScan, placeOrder, footNotes, cart, removeFromCart, updateCartQty, clearCart, savedDeliveryAddress, savedBillingAddress, saveAddresses, validateCoupon, validateBusinessCode, fetchMyCampaigns, accessories: storeAccessories, shoes, affiliate, ownerLink } = useStore()
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

  const emptyAddr = { name:'', street:'', house_number:'', zip:'', city:'', country:'Deutschland', phone:'' }
  const [ansicht,     setAnsicht]     = useState(product.id ? 'kasse' : 'tasche')
  const [uebersichtOffen, setUebersichtOffen] = useState(false)
  const [codeOffen,   setCodeOffen]   = useState(false)
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

  // ── Was vor dem Absenden bestätigt sein muss ──────────────────────────
  //
  // Zwei getrennte Haken, kein gemeinsamer. Der Ausschluss des
  // Widerrufsrechts ist eine schwerwiegende Folge und muss ausdrücklich
  // bestätigt werden (§ 312g Abs. 2 Nr. 1 BGB); ihn mit der AGB-Zustimmung
  // in einen Satz zu packen, hieße ihn zu verstecken, und genau daran
  // scheitern solche Klauseln vor Gericht.
  const [widerrufAkzeptiert, setWiderrufAkzeptiert] = useState(false)
  const [agbAkzeptiert, setAgbAkzeptiert] = useState(false)

  // Der Steuersatz für die Aufschlüsselung. Er kommt aus den Einstellungen
  // des Ladens, nicht als Zahl aus dem Programm: Wer ihn dort umstellt, soll
  // nicht auch noch die Kasse anfassen müssen.
  const [steuer, setSteuer] = useState(null)
  useEffect(() => {
    apiFetch('/api/settings/steuer')
      .then(d => setSteuer(d))
      .catch(() => setSteuer(null))
  }, [])

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

  /**
   * Der Willkommensgutschein setzt sich selbst ein.
   *
   * Wer sich über den Banner eingetragen und im Postfach bestätigt hat, hat
   * seine zehn Prozent bereits verdient. Sie ihn danach aus einer E-Mail
   * abschreiben zu lassen, ist die Stelle, an der ein Rabatt in der Praxis
   * verlorengeht — nicht weil etwas kaputt wäre, sondern weil niemand
   * abtippt. Also holt die Kasse ihn sich selbst.
   *
   * Nur einmal je Seitenaufruf, und still: Geht es schief, weil er schon
   * verbraucht oder abgelaufen ist, verschwindet er, ohne den Kunden mit
   * einer Fehlermeldung zu behelligen, die er nicht verursacht hat.
   */
  const gutscheinGeholt = useRef(false)
  useEffect(() => {
    if (gutscheinGeholt.current || couponCode || couponResult?.valid || subtotal <= 0) return
    let gespeichert = null
    try { gespeichert = localStorage.getItem('as_gutschein') } catch { /* kein Speicher */ }
    if (!gespeichert) return
    gutscheinGeholt.current = true
    setCouponCode(gespeichert)
    validateCoupon(gespeichert, subtotal)
      .then(res => {
        if (res?.valid) setCouponResult(res)
        else {
          setCouponCode('')
          try { localStorage.removeItem('as_gutschein') } catch { /* egal */ }
        }
      })
      .catch(() => setCouponCode(''))
  }, [subtotal, couponCode, couponResult, validateCoupon])

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


  // Sobald die Lieferanschrift vollständig ist, wandert sie ins Konto —
  // nicht erst mit der Bestellung. Wer den Vorgang abbricht, findet sie beim
  // nächsten Mal trotzdem vor.
  useEffect(() => {
    if (!user || !isAddressComplete(delivery)) return
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
  const zurAnmeldung = () => {
    if (product.id) {
      try { sessionStorage.setItem(DIREKTKAUF, JSON.stringify(location.state)) } catch { /* ohne Speicher bleibt der Umweg */ }
    }
    navigate('/login', { state: { from: '/checkout' } })
  }
  const zurKasse = () => {
    if (!user) { zurAnmeldung(); return }
    setAnsicht('kasse')
  }

  // Zurück von der Anmeldung: den gemerkten Direktkauf wieder einsetzen.
  useEffect(() => {
    if (location.state?.product) return
    let gemerkt = null
    try { gemerkt = sessionStorage.getItem(DIREKTKAUF) } catch { /* kein Speicher */ }
    if (!gemerkt) return
    try { sessionStorage.removeItem(DIREKTKAUF) } catch { /* egal */ }
    try { navigate('/checkout', { replace: true, state: JSON.parse(gemerkt) }) } catch { /* unlesbar, dann eben nicht */ }
  }, [])
  // Kommt der Direktkauf nachträglich an (siehe oben), gehört er in die Kasse.
  useEffect(() => { if (product.id) setAnsicht('kasse') }, [product.id])

  // Jede Ansicht beginnt oben. Am Schreibtisch scrollt nicht das Fenster,
  // sondern ein Behälter darin; `scrollIntoView` erreicht beide.
  const anfang = useRef(null)
  // Die Kasse reicht bis zum unteren Fensterrand. `min-h-full` griff auf
  // dem iPad nicht (das Dokument scrollt, die Hüllen haben keine Höhe), und
  // unter den beiden Flächen stand ein weißer Streifen.
  const restHoehe = useFensterHoehe(anfang)
  const fuellen = restHoehe ? { minHeight: restHoehe } : undefined
  const [placedFuerAnker, setPlacedFuerAnker] = useState(null)
  useEffect(() => {
    anfang.current?.scrollIntoView?.({ block: 'start' })
  }, [ansicht, placedFuerAnker])

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

      // Die beiden Bestätigungen gehen an jede Bestellung dieses Kaufs. Der
      // Server weist ohne sie ab, und er schreibt den Zeitpunkt selbst — was
      // hier steht, ist die Angabe, dass zugestimmt wurde, nicht der Beleg.
      const bestaetigungen = { widerruf_bestaetigt: true, agb_bestaetigt: true }

      // Der Bestelllink des Inhabers. Er geht nur an die Bestellung mit dem
      // Schuh: Er trägt genau ein Paar, und eine zweite Bestellung desselben
      // Einkaufs würde der Server mit ihm abweisen. Welche das ist, entscheidet
      // sich unten je Weg; hier steht nur, was mitzugeben wäre.
      const ownerCode = ownerLink?.code || null

      const shippingData = shippingOpt ? { shipping_method: shippingOpt.key, shipping_cost: `€ ${fmtPrice(shippingCost)}` } : {}

      if (product.id) {
        lastRow = await placeOrder({
          ...bestaetigungen,
          owner_code: ownerCode,
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
            ...bestaetigungen,
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
            ...bestaetigungen,
            // Nur das erste Paar. Der Link trägt eines; an das zweite gehängt
            // wiese der Server die ganze Bestellung ab, und der Kunde stünde
            // im letzten Schritt vor einer Absage, die er nicht versteht.
            owner_code: i === 0 ? ownerCode : null,
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
      // Der Willkommensgutschein ist einmal einlösbar. Ist er verbraucht,
      // gehört er weg — sonst setzt die Kasse beim nächsten Einkauf einen
      // Code ein, den der Server zu Recht abweist, und der Kunde sucht den
      // Fehler bei sich.
      if (appliedCoupon) { try { localStorage.removeItem('as_gutschein') } catch { /* egal */ } }
      setPlaced(lastRow)
      setPlacedFuerAnker(lastRow?.id || 'ok')
    } catch (e) {
      setError(e?.error || 'Bestellung fehlgeschlagen. Bitte erneut versuchen.')
    } finally { setPlacing(false) }
  }

  // ── Was in der Übersicht steht ──────────────────────────────────────────
  //
  // Eine Liste für beide Wege (Direktkauf und Tasche) und beide Orte (Tasche
  // und Kasse). Die Konfiguration kommt aus derselben Quelle wie später in
  // der Bestellung und beim Betreiber (lib/orderSpec.js).
  //
  // Ohne „Modell" (steht im Namen) und ohne die Zeilen, die nur die
  // Werkstatt braucht. In der Tasche steht alles als Liste, in der
  // Übersicht der Kasse nur Leder, Farbe, Sohle und Größe.
  const WEG = ['Modell', 'Leisten-Empfehlung', 'Welt', 'Maße']
  const KURZ = ['Leder', 'Farbe', 'Sohlen-Art', 'Größe']
  const konfiguration = (it) => specFromCartItem(it)
    .filter(([k, v]) => v && !WEG.includes(k))
    // „EU 42 · Leisten-Empfehlung": Der Zusatz sagt, woher die Größe kommt,
    // und ist für den Käufer ein Wort ohne Inhalt.
    .map(([k, v]) => [k, k === 'Größe' ? String(v).replace(/\s*·\s*Leisten-Empfehlung$/, '') : v])
  const zubehoerZaehler = chosenAccessories.reduce((m, a) => {
    const z = m.get(a.id) || { ...a, menge: 0 }
    z.menge += 1
    m.set(a.id, z)
    return m
  }, new Map())
  const positionen = [
    ...(product.id
      ? [{ key: 'direkt', bild: product.image ? resolveMediaUrl(product.image) : null,
           name: product.name || product.shoe_name, details: konfiguration(product), menge: 1, betrag: shoePrice }]
      : cart.map(it => ({
          key: it.id, cartId: it.id, zubehoer: !!it.isAccessory,
          bild: it.image ? resolveMediaUrl(it.image) : null,
          name: it.name,
          details: it.isAccessory ? (it.material && it.material !== 'Zubehör' ? [['', it.material]] : []) : konfiguration(it),
          menge: it.qty || 1, betrag: parsePrice(it.price) * (it.qty || 1),
        }))),
    ...[...zubehoerZaehler.values()].map(a => ({
      key: `acc-${a.id}`, bild: a.image ? resolveMediaUrl(a.image) : null, name: a.name, details: [], menge: a.menge, betrag: a.priceNum * a.menge, zubehoer: true,
    })),
    ...(guertelDirekt ? [{ key: 'guertel', bild: null, name: guertelDirekt.name, details: [], menge: 1, betrag: guertelPreis, zubehoer: true }] : []),
    ...(hatSchuh && affiliate?.gift_item
      ? [{ key: 'zugabe', bild: null, name: affiliate.gift_item.name, details: [['', `Zugabe ${String(affiliate.code || '').toUpperCase()}`]], menge: 1, betrag: 0, zubehoer: true }]
      : []),
  ]
  const euro = (n) => `€ ${fmtPrice(n)}`

  // Was dem Bezahlknopf noch fehlt, in Worten. Ein gesperrter Knopf ohne
  // Grund ist eine Sackgasse.
  const lieferungFertig = isAddressComplete(delivery)
  const rechnungFertig = sameBilling || isAddressComplete(billing)
  const offen = [
    !lieferungFertig && 'Lieferadresse',
    !rechnungFertig && 'Rechnungsadresse',
    (!widerrufAkzeptiert || !agbAkzeptiert || (ohnePassform.length > 0 && !passformAkzeptiert)) && 'die Bestätigungen',
  ].filter(Boolean)
  const bestellbar = !!user && offen.length === 0 && !placing

  // ── Danke ──────────────────────────────────────────────────────────────────
  if (placed) {
    return (
      <div ref={anfang} className="haus min-h-full scroll-mt-24 flex flex-col" style={fuellen}>
        <div className="g-angebot min-h-full flex-1 px-5 py-12 lg:py-20">
          <div className="max-w-[560px] mx-auto">
            <span className="w-14 h-14 rounded-full g-akzent flex items-center justify-center">
              <Check size={26} strokeWidth={1.6} />
            </span>
            <h1 className="t-kopf c-tinte mt-6">Danke. Deine Bestellung ist da.</h1>
            <p className="t-text c-leise mt-2">Bestellung {placed.id} · {placed.shoe_name}</p>

            {/* Die Bankverbindung mit GiroCode: dieselbe Komponente wie unter
                „Meine Bestellungen". Vorher stand hier eine eigene Fassung
                ohne Code zum Scannen, die man abtippen musste. */}
            <div className="mt-10">
              <Ueberweisung orderId={placed.id} />
            </div>

            <h2 className="t-lead c-tinte mt-12">Was jetzt passiert</h2>
            <ol className="mt-4 space-y-4">
              {[
                ['Deine Überweisung kommt an', 'Wir bestätigen den Eingang per Mail. Die Angaben stehen auch in deinem Postfach.'],
                ['Gefertigt wird in Almansa', 'Rahmengenäht, 4 bis 6 Wochen. Du hörst von uns, wenn die Fertigung beginnt.'],
                ['Dein Paar reist zu dir', 'Mit Sendungsnummer, sobald es die Werkstatt verlässt.'],
              ].map(([t, x], n) => (
                <li key={t} className="flex gap-4">
                  <span className="t-klein c-leise tabular-nums w-5 shrink-0 pt-1">{n + 1}</span>
                  <span>
                    <span className="block t-text c-tinte">{t}</span>
                    <span className="block t-klein c-leise">{x}</span>
                  </span>
                </li>
              ))}
            </ol>

            <div className="mt-12 flex flex-col sm:flex-row gap-3">
              <button onClick={() => navigate('/orders')}
                className="t-klein h-12 px-8 rounded-md g-akzent border-0 hover:opacity-90">
                Meine Bestellungen
              </button>
              <button onClick={() => navigate('/collection')}
                className="t-klein h-12 px-8 rounded-md bg-transparent c-tinte border border-black/20 hover:border-black/50">
                Weiter stöbern
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Leere Tasche ───────────────────────────────────────────────────────────
  if (cart.length === 0 && !product.id) {
    return (
      <div ref={anfang} className="haus min-h-full scroll-mt-24 flex flex-col" style={fuellen}>
        <div className="g-angebot min-h-full flex-1 px-5 py-16 lg:py-24">
          <div className="max-w-[560px] mx-auto text-center">
            <ShoppingBag size={34} strokeWidth={1} className="c-leise mx-auto" />
            <h1 className="t-kopf c-tinte mt-6">Deine Tasche ist leer</h1>
            <p className="t-text c-leise mt-3">Such dir eine Form aus. Leder, Farbe und Sohle bestimmst du danach selbst.</p>
            <button onClick={() => navigate('/collection')}
              className="t-klein mt-8 h-12 px-8 rounded-md g-akzent border-0 hover:opacity-90">
              Kollektion ansehen
            </button>
          </div>
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
      <div ref={anfang} className="haus min-h-full scroll-mt-24 flex flex-col" style={fuellen}>
        <div className="g-angebot min-h-full flex-1 px-5 py-14 lg:py-20">
          <div className="max-w-[640px] mx-auto">
            <PackageOpen size={26} strokeWidth={1.2} className="c-leise" />
            <h1 className="t-kopf c-tinte mt-5">Zubehör gibt es nur zusammen mit einem Paar.</h1>
            <p className="t-text c-tinte mt-4">
              Der Versand eines einzelnen Pflegesets kostet uns rund 30 €, mehr als
              der Artikel selbst. Das wollen wir niemandem berechnen. Leg ein
              Modell dazu, dann geht dein Zubehör im selben Paket mit, ohne
              zusätzlichen Versand.
            </p>
            <div className="mt-8">
              <p className="t-klein c-leise mb-2">In deiner Tasche</p>
              {cart.map(c => (
                <div key={c.id} className="flex items-center justify-between py-2">
                  <span className="t-feld">{c.qty} × {c.name}</span>
                  <button onClick={() => removeFromCart(c.id)}
                    className="t-klein c-leise hover:text-black bg-transparent border-0 p-0 underline underline-offset-4">
                    Entfernen
                  </button>
                </div>
              ))}
              <p className="t-klein c-leise mt-2">Es bleibt liegen, bis du ein Paar dazulegst.</p>
            </div>
            <button onClick={() => navigate('/collection')}
              className="t-klein mt-8 h-12 px-8 rounded-md g-akzent border-0 hover:opacity-90">
              Kollektion ansehen
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Die Summen ───────────────────────────────────────────────────────────
  // Am Schreibtisch links neben dem Formular, am Telefon in der
  // aufklappbaren Leiste. Ein Block, an zwei Stellen eingesetzt.
  const gruen = 'text-[#2F6B3A]'
  const summen = (
    <div className="space-y-2">
      <div className="flex justify-between t-feld">
        <span className="c-leise">Zwischensumme</span>
        <span className="tabular-nums">{euro(subtotal + accPromoDiscount)}</span>
      </div>
      {accPromoDiscount > 0 && (
        <div className={`flex justify-between t-feld ${gruen}`}>
          <span>Promo-Rabatt ({promoDiscountPct} % auf Zubehör)</span>
          <span className="tabular-nums">− {euro(accPromoDiscount)}</span>
        </div>
      )}
      <div className="flex justify-between t-feld">
        <span className="c-leise">Versand{shippingOpt ? ` · ${shippingOpt.label}` : ''}</span>
        <span className="tabular-nums">
          {isFreeShipping || Number(shippingOpt?.price || 0) === 0 ? 'Inklusive' : euro(shippingCost)}
        </span>
      </div>
      {couponResult?.valid && (
        <div className={`flex justify-between t-feld ${gruen}`}>
          <span>Gutschein {couponCode.toUpperCase()}</span>
          <span className="tabular-nums">− {euro(discountAmount)}</span>
        </div>
      )}
      {bizDiscount > 0 && (
        <div className={`flex justify-between t-feld ${gruen}`}>
          <span>Firmencode{bizResult?.coverage_type === 'full' ? ' (voll gedeckt)' : ''}</span>
          <span className="tabular-nums">− {euro(bizDiscount)}</span>
        </div>
      )}
      {campaignDiscount > 0 && (
        <div className={`flex justify-between t-feld ${gruen}`}>
          <span>{activeCampaign?.name || 'Firmenkampagne'}{activeCampaign?.payment_mode === 'company' ? ' (Firma zahlt)' : ` (−${activeCampaign?.discount_pct} %)`}</span>
          <span className="tabular-nums">− {euro(campaignDiscount)}</span>
        </div>
      )}
      <div className="flex justify-between items-baseline pt-3 mt-1 border-t border-black/[0.12]">
        <span className="t-text c-tinte">Gesamt</span>
        <span className="t-lead c-tinte tabular-nums">{euro(total)}</span>
      </div>
      {/* Was von der Summe Umsatzsteuer ist. Der Betrag ändert sich nicht,
          die Preise sind Bruttopreise; herausgerechnet gehört sie trotzdem,
          der Firmenkunde braucht sie für seine Vorsteuer. */}
      {steuer && (steuer.kleinunternehmer ? (
        <p className="t-klein c-leise">Kein Ausweis von Umsatzsteuer gemäß § 19 UStG.</p>
      ) : steuer.satz > 0 && (
        <div className="flex justify-between t-klein c-leise">
          <span>darin enthaltene MwSt. {steuer.satz} %</span>
          <span className="tabular-nums">€ {fmtCent(total - total / (1 + steuer.satz / 100))}</span>
        </div>
      ))}
    </div>
  )

  // Gutschein und Firmencode, wie das Feld „Code hinzufügen" bei Stripe:
  // zugeklappt eine Zeile, denn die meisten haben keinen.
  const codes = (
    <div>
      {couponResult?.valid ? (
        <div className="flex items-center justify-between t-feld">
          <span className={gruen}>{couponCode.toUpperCase()} · {couponResult.description}</span>
          <button onClick={handleRemoveCoupon} className="t-klein c-leise underline underline-offset-4 bg-transparent border-0 p-0">Entfernen</button>
        </div>
      ) : !codeOffen ? (
        <button onClick={() => setCodeOffen(true)}
          className="t-klein c-tinte underline underline-offset-4 bg-transparent border-0 p-0 min-h-11">
          Gutschein{product.id ? ' oder Firmencode' : ''} hinzufügen
        </button>
      ) : (
        <div>
          <label htmlFor="gutschein" className="t-klein c-leise block mb-1.5">Gutschein</label>
          <div className="flex gap-2">
            <input id="gutschein"
              className="t-feld flex-1 min-w-0 h-12 px-3.5 rounded-md bg-white border-0 shadow-[0_0_0_1px_rgba(35,28,23,0.18)] outline-none uppercase focus-visible:shadow-[0_0_0_2px_var(--tinte)]"
              placeholder="Code" value={couponCode}
              onChange={e => setCouponCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()} />
            <button onClick={handleApplyCoupon} disabled={couponLoading || !couponCode.trim()}
              className="t-klein h-12 px-5 rounded-md bg-transparent c-tinte border border-black/25 disabled:opacity-40">
              {couponLoading ? '…' : 'Einlösen'}
            </button>
          </div>
          {couponError && <p className="t-klein text-[#9B1C1C] mt-1.5" role="alert">{couponError}</p>}
        </div>
      )}

      {product.id && codeOffen && (
        <div className="mt-4">
          {bizResult?.valid ? (
            <div className="flex items-center justify-between t-feld">
              <span className={gruen}>
                {bizCode.toUpperCase()} · {bizResult.coverage_type === 'full' ? 'voll gedeckt' : `Rabatt ${bizResult.discount_value}${bizResult.discount_type === 'percentage' ? ' %' : ' €'}`}
                {bizResult.business_name ? ` · ${bizResult.business_name}` : ''}
              </span>
              <button onClick={handleRemoveBizCode} className="t-klein c-leise underline underline-offset-4 bg-transparent border-0 p-0">Entfernen</button>
            </div>
          ) : (
            <>
              <label htmlFor="firmencode" className="t-klein c-leise block mb-1.5">Firmencode</label>
              <div className="flex gap-2">
                <input id="firmencode"
                  className="t-feld flex-1 min-w-0 h-12 px-3.5 rounded-md bg-white border-0 shadow-[0_0_0_1px_rgba(35,28,23,0.18)] outline-none uppercase focus-visible:shadow-[0_0_0_2px_var(--tinte)]"
                  placeholder="Code deines Unternehmens" value={bizCode}
                  onChange={e => setBizCode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleApplyBizCode()} />
                <button onClick={handleApplyBizCode} disabled={bizLoading || !bizCode.trim()}
                  className="t-klein h-12 px-5 rounded-md bg-transparent c-tinte border border-black/25 disabled:opacity-40">
                  {bizLoading ? '…' : 'Einlösen'}
                </button>
              </div>
              {bizError && <p className="t-klein text-[#9B1C1C] mt-1.5" role="alert">{bizError}</p>}
            </>
          )}
        </div>
      )}
    </div>
  )

  // Eine Position: Bild, Name, Konfiguration, Betrag.
  const zeile = (pos, { gross = false } = {}) => (
    <div key={pos.key} className="flex gap-4">
      <div className={`relative shrink-0 rounded-md overflow-hidden bild-im-grund g-angebot flex items-center justify-center ${gross ? 'w-24 h-24' : 'w-16 h-16'}`}>
        {pos.bild
          ? <img src={pos.bild} alt="" className="w-full h-full object-contain" />
          : <ShoppingBag size={18} strokeWidth={1} className="c-leise" />}
        {!gross && pos.menge > 1 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-6 h-6 px-1.5 rounded-full g-dunkel c-hell t-klein flex items-center justify-center tabular-nums">{pos.menge}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={gross ? 't-lead c-tinte' : 't-feld'}>{pos.name}</p>
        {pos.details.length > 0 && (gross ? (
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 t-klein">
            {pos.details.map(([k, v]) => (
              <div key={k + v} className="contents">
                <dt className="c-leise">{k}</dt>
                <dd className="c-tinte">{v}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="t-klein c-leise mt-0.5">
            {(pos.details.some(([k]) => KURZ.includes(k)) ? pos.details.filter(([k]) => KURZ.includes(k)) : pos.details)
              .map(([, v]) => v).join(' · ')}
          </p>
        ))}
      </div>
      <p className="t-feld tabular-nums shrink-0">{pos.betrag === 0 ? 'Gratis' : euro(pos.betrag)}</p>
    </div>
  )

  // ═══ Ansicht 1: die Tasche ══════════════════════════════════════════════
  if (ansicht === 'tasche') {
    return (
      <div ref={anfang} className="haus min-h-full scroll-mt-24 flex flex-col" style={fuellen}>
        <div className="g-angebot min-h-full flex-1 px-5 lg:px-10 pt-6 lg:pt-12 pb-16">
          <div className="max-w-[1120px] mx-auto lg:grid lg:grid-cols-12 lg:gap-14">
            <section className="lg:col-span-7">
              <button
                onClick={() => {
                  const lastShoe = [...cart].reverse().find(c => !c.isAccessory && c.shoeId)
                  const schuh = lastShoe && shoes.find(x => x.id === lastShoe.shoeId)
                  if (schuh) navigate(shoePath(schuh), { state: { product: schuh } })
                  else navigate(-1)
                }}
                className="t-klein c-leise hover:text-black inline-flex items-center gap-2 bg-transparent border-0 p-0 min-h-11">
                <ArrowLeft size={16} strokeWidth={1.4} /> Weiter einkaufen
              </button>
              <h1 className="t-kopf c-tinte mt-2">Einkaufstasche</h1>

              <ul className="mt-8">
                {cart.map(item => {
                  const pos = positionen.find(p => p.cartId === item.id)
                  return (
                    <li key={item.id} className="py-6 border-t border-black/[0.1] first:border-t-0 first:pt-0">
                      {zeile(pos, { gross: true })}
                      <div className="flex items-center gap-5 mt-4 pl-28">
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateCartQty(item.id, item.qty - 1)} aria-label={`${item.name}: eins weniger`}
                            className="w-10 h-10 rounded-full flex items-center justify-center bg-transparent border border-black/15 c-tinte hover:border-black/40">
                            <Minus size={14} strokeWidth={1.6} />
                          </button>
                          <span className="t-feld w-8 text-center tabular-nums" aria-live="polite">{item.qty}</span>
                          <button onClick={() => updateCartQty(item.id, item.qty + 1)} aria-label={`${item.name}: eins mehr`}
                            className="w-10 h-10 rounded-full flex items-center justify-center bg-transparent border border-black/15 c-tinte hover:border-black/40">
                            <Plus size={14} strokeWidth={1.6} />
                          </button>
                        </div>
                        <button onClick={() => removeFromCart(item.id)}
                          className="t-klein c-leise hover:text-black underline underline-offset-4 bg-transparent border-0 p-0 min-h-11">
                          Entfernen
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>

              {allAccessories.length > 0 && (
                <div className="mt-12">
                  <h2 className="t-lead c-tinte">Passend dazu</h2>
                  <p className="t-klein c-leise mt-1">Geht im selben Paket mit, ohne zusätzlichen Versand.</p>
                  <div className="mt-3 divide-y divide-black/[0.08]">
                    {allAccessories.map(a => (
                      <AccessoryCard key={a.id} item={a} anzahl={anzahlVon(a.id)}
                        onPlus={() => accPlus(a.id)} onMinus={() => accMinus(a.id)} />
                    ))}
                  </div>
                </div>
              )}
            </section>

            <aside className="lg:col-span-5 mt-10 lg:mt-0">
              <div className="lg:sticky lg:top-6 rounded-md g-erzaehlung p-6 lg:p-8">
                <h2 className="t-lead c-tinte">Zusammenfassung</h2>
                <div className="mt-5 space-y-2">
                  <div className="flex justify-between t-feld">
                    <span className="c-leise">Zwischensumme</span>
                    <span className="tabular-nums">{euro(subtotal)}</span>
                  </div>
                  <div className="flex justify-between t-feld">
                    <span className="c-leise">Versand</span>
                    <span>an der Kasse</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-3 mt-1 border-t border-black/[0.12]">
                    <span className="t-text c-tinte">Summe</span>
                    <span className="t-lead c-tinte tabular-nums">{euro(subtotal)}</span>
                  </div>
                </div>
                <Preishinweis className="mt-2" mitVersandlink />

                {/* Was der Werbecode zusagt — hier, nicht erst am Ende. */}
                {hatSchuh && <div className="mt-5"><AffiliateVorteil affiliate={affiliate} /></div>}

                <button onClick={zurKasse}
                  className="t-klein mt-6 w-full h-14 rounded-md g-akzent border-0 inline-flex items-center justify-center gap-2 hover:opacity-90">
                  <Lock size={15} strokeWidth={1.6} /> {user ? 'Zur Kasse' : 'Anmelden und zur Kasse'}
                </button>
                {/* Für Gäste: Der Korb bleibt liegen, die Anmeldung kommt
                    dazwischen. Ohne diesen Satz wirkt der Knopf wie eine Falle. */}
                {!user && (
                  <p className="t-klein c-leise mt-3">
                    Zum Bestellen brauchen wir ein Konto, für Lieferadresse und Fertigungsstand.
                    Deine Tasche bleibt dabei erhalten{affiliate?.code ? ', dein Vorteil ebenfalls' : ''}.
                  </p>
                )}
                <p className="t-klein c-leise mt-5">Rahmengenäht · Almansa, Spanien · 4 bis 6 Wochen Produktion</p>
              </div>
            </aside>
          </div>
        </div>
      </div>
    )
  }

  // ═══ Ansicht 2: die Kasse ═══════════════════════════════════════════════
  const zurueck = () => {
    if (!product.id && cart.length) { setAnsicht('tasche'); return }
    navigate(-1)
  }
  const uebersicht = (
    <>
      <div className="space-y-5">
        {positionen.map(pos => zeile(pos))}
      </div>
      <div className="mt-6 pt-6 border-t border-black/[0.12]">{codes}</div>
      <div className="mt-6 pt-6 border-t border-black/[0.12]">{summen}</div>
      {hatSchuh && <div className="mt-6"><AffiliateVorteil affiliate={affiliate} kompakt /></div>}
    </>
  )

  return (
    <div ref={anfang} className="haus min-h-full scroll-mt-24 flex flex-col" style={fuellen}>
      <div className="min-h-full flex-1 lg:grid lg:grid-cols-2">

        {/* ── Übersicht, Schreibtisch ─────────────────────────────────── */}
        <aside className="hidden lg:block g-erzaehlung">
          <div className="sticky top-0 max-w-[480px] ml-auto px-10 xl:px-14 py-12">
            <button onClick={zurueck}
              className="t-klein c-leise hover:text-black inline-flex items-center gap-2 bg-transparent border-0 p-0 min-h-11">
              <ArrowLeft size={16} strokeWidth={1.4} /> {product.id ? 'Zurück zum Modell' : 'Einkaufstasche'}
            </button>
            <p className="t-klein c-leise mt-6">Du bezahlst</p>
            <p className="t-kopf c-tinte tabular-nums">{euro(total)}</p>
            <div className="mt-10">{uebersicht}</div>
            <p className="t-klein c-leise mt-10">Rahmengenäht · Almansa, Spanien · 4 bis 6 Wochen Produktion</p>
          </div>
        </aside>

        {/* ── Übersicht, Telefon: aufklappbar ─────────────────────────── */}
        <div className="lg:hidden g-erzaehlung">
          <div className="px-5 pt-3">
            <button onClick={zurueck}
              className="t-klein c-leise inline-flex items-center gap-2 bg-transparent border-0 p-0 min-h-11">
              <ArrowLeft size={16} strokeWidth={1.4} /> {product.id ? 'Zurück zum Modell' : 'Einkaufstasche'}
            </button>
          </div>
          <button
            onClick={() => setUebersichtOffen(v => !v)}
            aria-expanded={uebersichtOffen}
            className="w-full flex items-center justify-between gap-3 px-5 py-4 bg-transparent border-0 text-left"
          >
            <span className="t-feld inline-flex items-center gap-2">
              {uebersichtOffen ? 'Bestellübersicht ausblenden' : 'Bestellübersicht anzeigen'}
              <ChevronDown size={16} strokeWidth={1.6} className={`transition-transform ${uebersichtOffen ? 'rotate-180' : ''}`} />
            </span>
            <span className="t-lead c-tinte tabular-nums">{euro(total)}</span>
          </button>
          {uebersichtOffen && <div className="px-5 pb-8">{uebersicht}</div>}
        </div>

        {/* ── Das Formular ────────────────────────────────────────────── */}
        <main className="g-angebot">
          <div className="max-w-[480px] mr-auto lg:ml-0 mx-auto px-5 lg:px-10 xl:px-14 py-8 lg:py-12"
            style={{ paddingBottom: isNative ? 'max(env(safe-area-inset-bottom, 0px), 32px)' : undefined }}>

            {!user ? (
              <section>
                <h1 className="t-kopf c-tinte">Fast geschafft</h1>
                <p className="t-text c-tinte mt-3">
                  Zum Bestellen brauchen wir ein Konto, für Lieferadresse und Fertigungsstand.
                  Deine Auswahl bleibt erhalten{affiliate?.code ? ', dein Vorteil ebenfalls' : ''}.
                </p>
                <button onClick={zurAnmeldung}
                  className="t-klein mt-6 w-full h-14 rounded-md g-akzent border-0 hover:opacity-90">
                  Anmelden oder Konto anlegen
                </button>
              </section>
            ) : (
              <>
                {/* Kontakt */}
                <section>
                  <h2 className="t-text c-tinte">Kontakt</h2>
                  <div className="mt-3 rounded-md bg-white shadow-[0_0_0_1px_rgba(35,28,23,0.18)] px-3.5 h-12 flex items-center justify-between gap-3">
                    <span className="t-feld truncate">{user.email}</span>
                    <button onClick={() => { logout?.(); navigate('/login', { state: { from: '/checkout' } }) }}
                      className="t-klein c-leise underline underline-offset-4 bg-transparent border-0 p-0 shrink-0">
                      Nicht du?
                    </button>
                  </div>
                </section>

                {/* Lieferadresse */}
                <section className="mt-9">
                  <h2 className="t-text c-tinte">Lieferadresse</h2>
                  <div className="mt-3">
                    <Adressfelder praefix="shipping" wert={delivery} onChange={setDelivery} />
                  </div>
                  <p className="t-klein c-leise mt-2">Wird in deinem Konto gespeichert, fürs nächste Mal.</p>
                  <label className="mt-4 flex items-center gap-3 cursor-pointer min-h-11">
                    <input type="checkbox" checked={sameBilling} onChange={e => setSameBilling(e.target.checked)}
                      className="w-5 h-5 accent-[#231C17] cursor-pointer" />
                    <span className="t-feld">Rechnungsadresse wie Lieferadresse</span>
                  </label>
                  {!sameBilling && (
                    <div className="mt-3">
                      <p className="t-klein c-leise mb-2">Rechnungsadresse</p>
                      <Adressfelder praefix="billing" wert={billing} onChange={setBilling} />
                    </div>
                  )}
                </section>

                {/* Versand */}
                {shippingOptions.length > 0 && (
                  <section className="mt-9">
                    <h2 className="t-text c-tinte">Versand</h2>
                    <div className="mt-3 space-y-3" role="radiogroup" aria-label="Versand">
                      {shippingOptions.map(opt => {
                        const optFree = (opt.free_above && subtotal >= opt.free_above) || (couponResult?.valid && couponResult.type === 'free_shipping')
                        return (
                          <Auswahlkarte key={opt.id} name="versand" wert={opt.id} gewaehlt={selectedShipping}
                            onWahl={setSelectedShipping}
                            titel={opt.label}
                            text={[opt.description, opt.free_above && !optFree ? `Gratis ab ${euro(opt.free_above)}` : null].filter(Boolean).join(' · ') || null}
                            rechts={Number(opt.price) === 0 || optFree ? 'Inklusive' : euro(opt.price)} />
                        )
                      })}
                    </div>
                  </section>
                )}

                {/* Zahlung */}
                <section className="mt-9">
                  <h2 className="t-text c-tinte">Zahlung</h2>
                  <div className="mt-3" role="radiogroup" aria-label="Zahlung">
                    <Auswahlkarte name="zahlung" wert="ueberweisung" gewaehlt="ueberweisung" onWahl={() => {}}
                      titel={<span className="inline-flex items-center gap-2"><Landmark size={16} strokeWidth={1.4} /> Überweisung (Vorkasse)</span>}>
                      <span className="block t-klein c-leise">
                        Nach der Bestellung bekommst du Bankverbindung, Verwendungszweck und einen
                        QR-Code für deine Banking-App. Gefertigt wird nach Zahlungseingang.
                      </span>
                    </Auswahlkarte>
                  </div>
                </section>

                {/* Passform: festgeschrieben, nicht mehr änderbar. Die Maße
                    kommen aus der Konfiguration, nicht aus dem Profil. */}
                {product.id && (() => {
                  const m = typeof product.footMeasurementsUsed === 'string'
                    ? (() => { try { return JSON.parse(product.footMeasurementsUsed) } catch { return null } })()
                    : product.footMeasurementsUsed
                  if (!m?.foot_length_mm) return null
                  return (
                    <section className="mt-9">
                      <h2 className="t-text c-tinte">Passform</h2>
                      <p className="t-feld mt-2">
                        {m.foot_length_mm} mm Länge{m.ball_girth_mm ? ` · ${m.ball_girth_mm} mm Ballenumfang` : ''}
                      </p>
                      <p className="t-klein c-leise mt-1">
                        Diese Maße gehören zur Konfiguration. Für andere Maße{' '}
                        <button
                          onClick={() => {
                            const shoe = shoes.find(x => String(x.id) === String(product.id))
                            navigate(shoe ? shoePath(shoe) : '/collection')
                          }}
                          className="underline underline-offset-4 bg-transparent border-0 p-0 c-tinte">
                          neu konfigurieren
                        </button>.
                      </p>
                    </section>
                  )
                })()}

                {/* Bestätigungen: unmittelbar über dem Knopf, im selben Blick
                    wie das, was er auslöst. Zwei getrennte Haken: Der
                    Ausschluss des Widerrufsrechts muss ausdrücklich bestätigt
                    werden (§ 312g Abs. 2 Nr. 1 BGB). */}
                <section className="mt-9 space-y-4">
                  {ohnePassform.length > 0 && (
                    <Bestaetigung id="passform" an={passformAkzeptiert} onChange={setPassformAkzeptiert} warnung>
                      <strong className="font-medium">Dieser Schuh passt nicht zu deinen Maßen.</strong>{' '}
                      Für die hinterlegten Maße können wir bei diesem Modell keine passende Form
                      anbieten; ein Umtausch aus diesem Grund ist bei Maßanfertigungen nicht möglich.
                      Ich möchte ihn trotzdem bestellen.
                    </Bestaetigung>
                  )}
                  <Bestaetigung id="widerruf" an={widerrufAkzeptiert} onChange={setWiderrufAkzeptiert}>
                    Mir ist bekannt, dass mein Paar nach meinen persönlichen Maßen angefertigt
                    wird und deshalb <strong className="font-medium">kein Widerrufsrecht</strong>{' '}
                    besteht (§ 312g Abs. 2 Nr. 1 BGB). Ich verlange ausdrücklich, dass die
                    Fertigung sofort beginnt.
                  </Bestaetigung>
                  <Bestaetigung id="agb" an={agbAkzeptiert} onChange={setAgbAkzeptiert}>
                    Ich habe die{' '}
                    <Link to="/legal/agb" target="_blank" className="underline underline-offset-4">AGB</Link>
                    {' '}und die{' '}
                    <Link to="/legal/datenschutz" target="_blank" className="underline underline-offset-4">Datenschutzerklärung</Link>
                    {' '}gelesen und stimme ihnen zu.
                  </Bestaetigung>
                </section>

                {error && <p className="t-klein text-[#9B1C1C] mt-6" role="alert">{error}</p>}

                {/* Die Beschriftung ist Gesetz, nicht Geschmack: § 312j Abs. 3
                    BGB verlangt, dass der Knopf ausdrücklich auf die
                    Zahlungspflicht hinweist. */}
                <button onClick={handlePlace} disabled={!bestellbar}
                  className="t-feld mt-8 w-full h-14 rounded-md g-akzent border-0 inline-flex items-center justify-center gap-2.5 hover:opacity-90 disabled:opacity-40 transition-opacity"
                  style={{ color: 'var(--akzent-tinte)' }}>
                  {placing ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Wird verarbeitet …</>
                  ) : (
                    <><Lock size={16} strokeWidth={1.6} /> Zahlungspflichtig bestellen · {euro(total)}</>
                  )}
                </button>
                {offen.length > 0 && (
                  <p className="t-klein c-leise mt-2.5 text-center">Noch offen: {offen.join(', ')}.</p>
                )}
                <p className="t-klein c-leise mt-4 text-center">
                  Verschlüsselte Übertragung · keine Kartendaten nötig
                </p>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
