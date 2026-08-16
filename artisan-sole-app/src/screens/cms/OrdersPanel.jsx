// @refresh reset
import { useState, useEffect, useCallback } from 'react'
import { ShoppingBag, RefreshCw, CheckCircle2, Clock, Package, Truck, XCircle, Banknote, ChevronDown, ChevronUp, User } from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import MFAModal from '../../components/MFAModal'
import { orderSpec } from '../../lib/orderSpec'
import { streetLine } from '../../lib/address'

const STATUS_CONFIG = {
 pending_payment: { label: 'Zahlung ausstehend', color: 'bg-black/[0.06] text-black/50', dot: 'bg-black/15' },
 pending: { label: 'Ausstehend', color: 'bg-black/[0.04] text-black/40', dot: 'bg-black/15' },
 processing: { label: 'In Fertigung', color: 'bg-black/[0.04] text-black/40', dot: 'bg-black/25' },
 quality_check: { label: 'Qualitätskontrolle', color: 'bg-black/[0.04] text-black/40', dot: 'bg-black/35' },
 shipped: { label: 'Versendet', color: 'bg-black/[0.04] text-black/40', dot: 'bg-black/40' },
 delivered: { label: 'Geliefert', color: 'bg-black/[0.04] text-black/40', dot: 'bg-black/60' },
 cancelled: { label: 'Storniert', color: 'bg-black/[0.04] text-black/30', dot: 'bg-black/10' },
}

const FILTERS = [
 { key: 'all', label: 'Alle' },
 { key: 'pending_payment', label: 'Zahlung offen' },
 { key: 'processing', label: 'In Fertigung' },
 { key: 'quality_check', label: 'Qualitätskontrolle' },
 { key: 'shipped', label: 'Versendet' },
 { key: 'delivered', label: 'Geliefert' },
 { key: 'cancelled', label: 'Storniert' },
]

// 'cancelled' steht hier nicht mehr.
//
// Eine Stornierung ist kein Statuswechsel, sondern eine Abrechnung: Sie hat
// eine Gebühr nach AGB 7.2, einen Erstattungsbetrag und einen Grund. Ginge
// sie über den Statusweg, stünde am Ende eine stornierte Bestellung ohne
// Angabe, was dem Kunden zurückgezahlt wurde. Der Server weist diesen Weg
// inzwischen ab; hier ist der eigene Knopf dafür.
const NEXT_STATUSES = {
 pending_payment: ['processing'],
 pending: ['processing'],
 processing: ['quality_check'],
 quality_check: ['shipped'],
 shipped: ['delivered'],
 delivered: [],
 cancelled: [],
}

const STATUS_LABELS = {
 processing: 'Zahlung bestätigen → Fertigung',
 quality_check: 'Zur Qualitätskontrolle',
 shipped: 'QC bestanden → Versand',
 delivered: 'Als geliefert markieren',
}

const ZUSTELLER = [
 { key: 'dhl', name: 'DHL' },
 { key: 'dpd', name: 'DPD' },
 { key: 'ups', name: 'UPS' },
 { key: 'gls', name: 'GLS' },
 { key: 'fedex', name: 'FedEx' },
 { key: 'hermes', name: 'Hermes' },
 { key: 'sonstige', name: 'Sonstiger Zusteller' },
]

const geld = (n) =>
 `${(Number(n) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`

// Was der Kunde zurückbekommen kann — absteigend, weil die volle Erstattung
// der Normalfall ist und oben stehen soll.
//
// Welche Stufen in einer Phase tatsächlich angeboten werden, entscheidet der
// Höchstsatz aus AGB 7.2: vor der Freigabe nur 100 %, in der Fertigung auch
// 50 %, in der Endkontrolle auch 25 %. Die 0 % erscheinen nirgends, weil es
// keine Phase gibt, in der wir alles einbehalten und trotzdem stornieren —
// nach dem Versand ist die Stornierung beendet, dann greift die Kulanz.
const ERSTATTUNGSSTUFEN = [100, 50, 25, 0]

/**
 * Sendungsnummer eintragen.
 *
 * Ein Vorgang, nicht zwei: Wer die Nummer einträgt, hat das Paket abgegeben.
 * Der Status springt mit, und die Versandmail trägt den Verfolgungslink.
 */
function SendungFeld({ order, onFertig }) {
 const [code, setCode] = useState(order.tracking_code || '')
 const [dienst, setDienst] = useState(order.carrier || 'dhl')
 const [laeuft, setLaeuft] = useState(false)
 const [fehler, setFehler] = useState(null)

 const speichern = async () => {
  setLaeuft(true); setFehler(null)
  try {
   const neu = await apiFetch(`/api/orders/${order.id}/sendung`, {
    method: 'PATCH',
    body: JSON.stringify({ tracking_code: code.trim(), carrier: dienst }),
   })
   onFertig(neu)
  } catch (e) {
   setFehler(e.error || 'Konnte nicht gespeichert werden.')
  } finally {
   setLaeuft(false)
  }
 }

 return (
  <div className="pt-3 border-t border-black/[0.04]">
   <p className="text-[10px] text-black/30 uppercase tracking-[0.2em] mb-2 font-light">Sendung</p>
   <div className="flex flex-wrap gap-2 items-center">
    <select
     value={dienst} onChange={(e) => setDienst(e.target.value)}
     className="h-9 border border-black/10 px-2 text-[11px] font-light bg-white"
    >
     {ZUSTELLER.map(z => <option key={z.key} value={z.key}>{z.name}</option>)}
    </select>
    <input
     value={code} onChange={(e) => setCode(e.target.value)}
     placeholder="Sendungsnummer"
     className="h-9 flex-1 min-w-[180px] border border-black/10 px-2 text-[11px] font-light"
    />
    <button
     onClick={speichern} disabled={laeuft || code.trim().length < 3}
     className="h-9 px-4 text-[10px] font-light border border-black text-black hover:bg-black hover:text-white bg-transparent disabled:opacity-40"
    >
     {laeuft ? '…' : order.tracking_code ? 'Ändern' : 'Eintragen & versenden'}
    </button>
   </div>
   {fehler && <p className="text-[10px] text-red-700 font-light mt-1.5">{fehler}</p>}
   {order.tracking_code && (
    <p className="text-[10px] text-black/30 font-light mt-1.5">
     Der Kunde hat den Verfolgungslink per E-Mail bekommen.
    </p>
   )}
  </div>
 )
}

/**
 * Stornieren, mit der Staffel aus AGB 7.2.
 *
 * Der vorgeschlagene Satz ist die Obergrenze, nicht der Betrag. Ziffer 7.2
 * Abs. 5 sagt ausdrücklich, dass wir weniger einbehalten dürfen, wenn die
 * Arbeit noch nicht begonnen hat — deshalb ist das Feld überschreibbar. Nach
 * oben deckelt der Server.
 */
function StornoDialog({ order, onSchliessen, onFertig }) {
 const [vorschau, setVorschau] = useState(null)
 const [satz, setSatz] = useState(null)
 const [grund, setGrund] = useState('')
 const [laeuft, setLaeuft] = useState(false)
 const [fehler, setFehler] = useState(null)

 useEffect(() => {
  apiFetch(`/api/orders/${order.id}/storno`)
   .then(v => { setVorschau(v); setSatz(v.pct ?? 0) })
   .catch(e => setFehler(e.error || 'Vorschau nicht abrufbar.'))
 }, [order.id])

 const betrag = vorschau?.betrag || 0
 // Ohne Zahlungseingang gibt es nichts zu erstatten und nichts einzubehalten.
 //
 // Das stand vorher nicht hier: Der Betrag wurde aus dem Auftragswert
 // gerechnet, und bei einer unbezahlten Bestellung bot die Maske an, den
 // vollen Preis zurückzuüberweisen — Geld, das nie eingegangen war. Der
 // Server hat es immer richtig gerechnet, die Maske hat ihn nur nicht gefragt.
 const bezahlt = vorschau?.bezahlt !== false
 const gebuehr = bezahlt ? Math.round(betrag * (Number(satz) || 0)) / 100 : 0
 const erstattung = bezahlt ? Math.round((betrag - gebuehr) * 100) / 100 : 0

 const stornieren = async () => {
  setLaeuft(true); setFehler(null)
  try {
   const erg = await apiFetch(`/api/orders/${order.id}/storno`, {
    method: 'PUT',
    body: JSON.stringify({ satz: Number(satz), grund: grund.trim() || undefined }),
   })
   onFertig(erg)
  } catch (e) {
   setFehler(e.error || 'Die Stornierung ist nicht durchgegangen.')
   setLaeuft(false)
  }
 }

 return (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40" onClick={onSchliessen}>
   <div className="bg-white mx-4 w-full max-w-md p-7" onClick={e => e.stopPropagation()}>
    <p className="text-[9px] text-black/25 uppercase tracking-[0.25em] mb-3 font-light">Stornierung</p>
    <p className="text-[16px] font-extralight text-black tracking-tight leading-snug mb-1">
     {order.shoe_name}
    </p>
    <p className="text-[11px] text-black/35 font-light mb-5">{order.order_ref || `#${order.id}`}</p>

    {!vorschau && !fehler && <p className="text-[12px] text-black/35 font-light">Wird geladen …</p>}

    {vorschau && !vorschau.moeglich && (
     <p className="text-[12px] text-black/50 font-light leading-relaxed mb-5">{vorschau.hinweis}</p>
    )}

    {vorschau?.moeglich && (
     <>
      <p className="text-[12px] text-black/45 font-light leading-relaxed mb-4">{vorschau.hinweis}</p>

      {bezahlt && (
       <>
        <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">
         Was der Kunde zurückbekommt
        </label>
        {/* Feste Stufen statt eines freien Feldes. Gedacht wird in dem, was
            zurückgeht — danach fragt der Kunde, und danach fragt man sich
            selbst. Der Einbehalt ist der Rest und steht unten in der
            Aufstellung.

            Angeboten wird nur, was die AGB in dieser Phase hergeben. Ziffer
            7.2 nennt einen Höchstsatz für den Einbehalt, weniger dürfen wir
            immer: Vor der Freigabe bleibt deshalb nur „alles zurück", in der
            Fertigung kommen 50 % dazu, in der Endkontrolle 25 %. */}
        <div className="flex flex-wrap gap-2 mb-4 mt-1">
         {ERSTATTUNGSSTUFEN
          .filter(e => 100 - e <= vorschau.hoechstsatz)
          .map(e => {
           const gewaehlt = (100 - (Number(satz) || 0)) === e
           return (
            <button
             key={e} type="button" onClick={() => setSatz(100 - e)}
             className={`px-4 h-10 text-[12px] border transition-all ${
              gewaehlt
               ? 'bg-black text-white border-black'
               : 'bg-white text-black/50 border-black/15 hover:border-black/40'
             }`}
            >
             {e} %{e === 100 ? ', alles' : ''}
            </button>
           )
          })}
        </div>
       </>
      )}

      <div className="bg-black/[0.03] px-4 py-3 mb-4">
       <div className="flex justify-between py-0.5">
        <span className="text-[11px] text-black/40 font-light">Auftragswert</span>
        <span className="text-[12px] text-black/70 font-light">{geld(betrag)}</span>
       </div>
       {bezahlt ? (
        <>
         <div className="flex justify-between py-0.5">
          <span className="text-[11px] text-black/40 font-light">Einbehalt ({satz ?? 0} %)</span>
          <span className="text-[12px] text-black/70 font-light">− {geld(gebuehr)}</span>
         </div>
         <div className="flex justify-between py-0.5 border-t border-black/[0.06] mt-1 pt-1.5">
          <span className="text-[11px] text-black/60 font-light">Zu erstatten</span>
          <span className="text-[14px] text-black font-normal">{geld(erstattung)}</span>
         </div>
        </>
       ) : (
        <div className="flex justify-between py-0.5 border-t border-black/[0.06] mt-1 pt-1.5">
         <span className="text-[11px] text-black/60 font-light">Zu erstatten</span>
         <span className="text-[13px] text-black/60 font-light">nichts, keine Zahlung eingegangen</span>
        </div>
       )}
      </div>

      <textarea
       value={grund} onChange={(e) => setGrund(e.target.value)}
       rows={2} maxLength={500} placeholder="Grund (erscheint im Protokoll)"
       className="w-full border border-black/10 px-3 py-2 text-[12px] font-light resize-none mb-4"
      />
     </>
    )}

    {fehler && <p className="text-[12px] text-red-700 font-light mb-3">{fehler}</p>}

    <div className="flex gap-3">
     <button
      onClick={onSchliessen}
      className="flex-1 h-11 border border-black/15 text-black/40 text-[10px] uppercase tracking-[0.15em] font-light bg-transparent"
     >
      Abbrechen
     </button>
     {vorschau?.moeglich && (
      <button
       onClick={stornieren} disabled={laeuft}
       className="flex-1 h-11 text-[10px] uppercase tracking-[0.15em] font-light border bg-red-600 text-white border-red-600 disabled:opacity-50"
      >
       {laeuft ? '…' : bezahlt ? `${geld(erstattung)} erstatten` : 'Auftrag aufheben'}
      </button>
     )}
    </div>
    <p className="text-[10px] text-black/25 font-light mt-3 leading-relaxed">
     {bezahlt
      ? 'Der Kunde bekommt eine Bestätigung mit dem Erstattungsbetrag. Überwiesen wird von Hand, das System löst keine Zahlung aus.'
      : 'Der Kunde bekommt eine Bestätigung. Zu erstatten ist nichts, weil keine Zahlung eingegangen ist.'}
    </p>
   </div>
  </div>
 )
}

function OrderRow({ order, onStatusChange, onOrderChange, isAdmin }) {
 const [expanded, setExpanded] = useState(false)
 const [updating, setUpdating] = useState(false)
 const [mfaOpen, setMfaOpen] = useState(false)
 const [mfaErr, setMfaErr] = useState(null)
 const [pendingStatus, setPendingStatus] = useState(null)
 const [confirmDialog, setConfirmDialog] = useState(null)
 const [stornoOffen, setStornoOffen] = useState(false)
 const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending

 const delivery = order.delivery_address ? JSON.parse(order.delivery_address) : null
 const accessories = order.accessories ? JSON.parse(order.accessories) : []
 const spec = orderSpec(order)

 // Build visible actions, payment confirmation is admin-only
 const nextOptions = (NEXT_STATUSES[order.status] || []).filter(s => {
 if (s === 'processing' && order.status === 'pending_payment') return isAdmin
 return true
 })

 const doStatusUpdate = async (newStatus, mfaCode) => {
 setUpdating(true)
 try {
 const headers = mfaCode ? { 'X-MFA-Code': mfaCode } : {}
 await apiFetch(`/api/orders/${order.id}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }), headers })
 onStatusChange(order.id, newStatus)
 setMfaOpen(false)
 } catch (e) {
 if (e?.code === 'MFA_INVALID') { setMfaErr(e.error); return }
 if (e?.code === 'MFA_NOT_SETUP') {
 setMfaOpen(false)
 alert('MFA nicht eingerichtet. Bitte zuerst MFA in Admin-Einstellungen aktivieren.')
 return
 }
 if (e?.code === 'MFA_REQUIRED') { setMfaErr('Code erforderlich'); return }
 console.error(e)
 } finally { setUpdating(false) }
 }

 const CONFIRM_MESSAGES = {
   shipped: {
     title: 'Versand bestätigen',
     text: `Soll die Bestellung ${order.order_ref || `#${order.id}`} wirklich als versendet markiert werden? Dieser Schritt informiert den Kunden.`,
     confirm: 'Ja, versenden',
   },
   cancelled: {
     title: 'Stornierung bestätigen',
     text: `Soll die Bestellung ${order.order_ref || `#${order.id}`} wirklich storniert werden? Diese Aktion kann nicht rückgängig gemacht werden.`,
     confirm: 'Ja, stornieren',
   },
 }

 const handleStatus = (newStatus) => {
 // Payment confirmation requires MFA modal
 if (newStatus === 'processing' && order.status === 'pending_payment') {
 setPendingStatus(newStatus)
 setMfaErr(null)
 setMfaOpen(true)
 return
 }
 // Shipped & cancelled require explicit confirmation
 if (CONFIRM_MESSAGES[newStatus]) {
 setConfirmDialog(newStatus)
 return
 }
 doStatusUpdate(newStatus, null)
 }

 const handleConfirm = () => {
   doStatusUpdate(confirmDialog, null)
   setConfirmDialog(null)
 }

 const handleMfaConfirm = (code) => {
 doStatusUpdate(pendingStatus, code)
 }

 return (
 <div className="bg-white overflow-hidden border-b border-black/[0.04]">
 {/* Row header */}
 <div className="bg-white px-6 py-4 hover:bg-black/[0.01] transition-all flex items-center gap-3 cursor-pointer" onClick={() => setExpanded(v => !v)}>
 {/* Status dot */}
 <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />

 {/* Order info */}
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2.5 flex-wrap">
 <span className="text-[11px] font-light text-black/85 tracking-wide">{order.order_ref || `#${order.id}`}</span>
 <span className="text-[10px] text-black/30 font-light truncate">{order.shoe_name}</span>
 {order.user_order_number > 0 && (
 <span className="text-[9px] text-black/25 font-light px-2 py-0.5 bg-black/[0.03] tracking-wider uppercase">
 {order.user_order_number}. Schuh
 </span>
 )}
 </div>
 <div className="flex items-center gap-3 mt-1">
 <span className="text-[10px] text-black/30 font-light flex items-center gap-1">
 <User size={9} strokeWidth={1.5} /> {order.user_name}
 </span>
 <span className="text-[10px] text-black/30 font-light">{order.price}</span>
 <span className="text-[10px] text-black/20 font-light">
 {new Date(order.created_at.replace(' ', 'T') + 'Z').toLocaleDateString('de-DE')}
 </span>
 </div>
 </div>

 {/* Status badge */}
 <span className={`text-[9px] font-light px-2.5 py-1 uppercase tracking-wider flex-shrink-0 ${cfg.color}`}>
 {cfg.label}
 </span>

 {/* Expand */}
 <button
 onClick={(e) => { e.stopPropagation(); setExpanded(v => !v) }}
 className="w-7 h-7 flex items-center justify-center flex-shrink-0 border-0 bg-transparent hover:bg-black/[0.03] transition-colors"
 >
 {expanded
 ? <ChevronUp size={12} strokeWidth={1} className="text-black/25" />
 : <ChevronDown size={12} strokeWidth={1} className="text-black/25" />}
 </button>
 </div>

 {/* Expanded details */}
 {expanded && (
 <div className="px-6 py-5 bg-[#fafaf9] border-t border-black/[0.04] space-y-4">

 {/* Customer */}
 <div>
 <p className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Kunde</p>
 <p className="text-[12px] text-black/60 font-light">{order.user_name}</p>
 <p className="text-[10px] text-black/35 font-light">{order.user_email}</p>
 <p className="text-[9px] text-black/20 mt-0.5 font-light">USER-{String(order.user_id).padStart(5, '0')}</p>
 </div>

 {/* Shoe details */}
 <div>
 <p className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Bestellung</p>
 <p className="text-[12px] text-black/60 font-light">{order.shoe_name}</p>
 <p className="text-[10px] text-black/35 font-light">{order.order_ref || `#${order.id}`} · {order.price}</p>
 </div>

 {/* Fertigungsspezifikation — alles, was der Kunde gewählt hat.
     Genau das braucht die Manufaktur; vorher standen hier nur Modell,
     Leder und Farbe, und Sohle wie Zusatzoptionen fehlten ganz. */}
 <div>
 <p className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Fertigung</p>
 <table className="w-full">
 <tbody>
 {spec.map(([k, v]) => (
 <tr key={k}>
 <td className="text-[10px] text-black/35 font-light align-top pr-3 py-[1px] whitespace-nowrap">{k}</td>
 <td className="text-[10px] text-black/60 font-light align-top py-[1px]">{v}</td>
 </tr>
 ))}
 </tbody>
 </table>
 {order.foot_notes && (
 <div className="mt-2 bg-amber-50 border border-amber-200 px-2.5 py-2">
 <p className="text-[9px] text-amber-800 uppercase tracking-[0.18em] mb-1">Hinweis des Kunden</p>
 <p className="text-[10px] text-amber-900 font-light leading-relaxed whitespace-pre-line">{order.foot_notes}</p>
 {order.foot_notes_en && order.foot_notes_en !== order.foot_notes && (
 <p className="text-[10px] text-amber-700/70 font-light leading-relaxed mt-1 whitespace-pre-line">{order.foot_notes_en}</p>
 )}
 </div>
 )}
 </div>

 {/* Accessories */}
 {accessories.length > 0 && (
 <div>
 <p className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Zubehör</p>
 {accessories.map((a, i) => (
 <div key={i} className="flex justify-between text-[10px]">
 <span className="text-black/35 font-light">{a.name}</span>
 <span className="text-black/50 font-light">{a.price}</span>
 </div>
 ))}
 </div>
 )}

 {/* Delivery address */}
 {delivery && (
 <div>
 <p className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Lieferadresse</p>
 <p className="text-[10px] text-black/35 font-light leading-relaxed">
 {delivery.name}<br />
 {streetLine(delivery)}<br />
 {delivery.postal_code || delivery.zip} {delivery.city}<br />
 {delivery.country}
 {delivery.phone && <><br />{delivery.phone}</>}
 </p>
 </div>
 )}

 {/* Sendung — sobald das Paar die Werkstatt verlassen kann */}
 {['processing', 'quality_check', 'shipped', 'delivered'].includes(order.status) && (
 <SendungFeld order={order} onFertig={(neu) => onOrderChange?.(neu)} />
 )}

 {/* Bereits storniert: die Abrechnung bleibt sichtbar */}
 {order.cancelled_at && (
 <div className="pt-3 border-t border-black/[0.04]">
 <p className="text-[10px] text-black/30 uppercase tracking-[0.2em] mb-1.5 font-light">Stornierung</p>
 <p className="text-[11px] text-black/45 font-light">
 {order.cancel_fee_pct} % einbehalten ({geld(order.cancel_fee)}) · {geld(order.refund_amount)} zu erstatten
 </p>
 {order.cancel_reason && (
 <p className="text-[10px] text-black/30 font-light mt-1">Grund: {order.cancel_reason}</p>
 )}
 </div>
 )}

 {/* Actions */}
 {(nextOptions.length > 0 || (!order.cancelled_at && order.status !== 'cancelled')) && (
 <div className="pt-3 border-t border-black/[0.04] flex flex-wrap gap-2">
 {nextOptions.map(s => (
 <button
 key={s}
 disabled={updating}
 onClick={() => handleStatus(s)}
 className="text-[10px] font-light px-4 py-2 border border-black text-black hover:bg-black hover:text-white bg-transparent disabled:opacity-50 transition-all"
 >
 {updating ? '...' : STATUS_LABELS[s] || s}
 </button>
 ))}
 {!order.cancelled_at && order.status !== 'cancelled' && (
 <button
 onClick={() => setStornoOffen(true)}
 className="text-[10px] font-light px-4 py-2 border border-black/10 text-black/30 hover:border-black/25 hover:text-black/50 bg-transparent transition-all"
 >
 Stornieren …
 </button>
 )}
 </div>
 )}
 </div>
 )}

 {stornoOffen && (
 <StornoDialog
 order={order}
 onSchliessen={() => setStornoOffen(false)}
 onFertig={(erg) => { setStornoOffen(false); onOrderChange?.(erg.order) }}
 />
 )}

 {/* Confirmation dialog */}
 {confirmDialog && CONFIRM_MESSAGES[confirmDialog] && (
   <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40" onClick={() => setConfirmDialog(null)}>
     <div className="bg-white mx-4 w-full max-w-sm p-7" onClick={e => e.stopPropagation()}>
       <p className="text-[9px] text-black/25 uppercase tracking-[0.25em] mb-3 font-light">Bestätigung</p>
       <p className="text-[16px] font-extralight text-black tracking-tight leading-snug mb-2">
         {CONFIRM_MESSAGES[confirmDialog].title}
       </p>
       <p className="text-[12px] text-black/35 font-light leading-relaxed mb-6">
         {CONFIRM_MESSAGES[confirmDialog].text}
       </p>
       <div className="flex gap-3">
         <button
           onClick={() => setConfirmDialog(null)}
           className="flex-1 h-11 border border-black/15 text-black/40 text-[10px] uppercase tracking-[0.15em] font-light bg-transparent hover:border-black/30 hover:text-black/60 transition-all"
         >
           Abbrechen
         </button>
         <button
           onClick={handleConfirm}
           disabled={updating}
           className={`flex-1 h-11 text-[10px] uppercase tracking-[0.15em] font-light border transition-all disabled:opacity-50 ${
             confirmDialog === 'cancelled'
               ? 'bg-red-600 text-white border-red-600 hover:bg-red-700'
               : 'bg-black text-white border-black hover:bg-black/85'
           }`}
         >
           {updating ? '...' : CONFIRM_MESSAGES[confirmDialog].confirm}
         </button>
       </div>
     </div>
   </div>
 )}

 <MFAModal
 open={mfaOpen}
 title="Zahlung bestätigen"
 onClose={() => setMfaOpen(false)}
 onConfirm={handleMfaConfirm}
 loading={updating}
 error={mfaErr}
 />
 </div>
 )
}

export default function OrdersPanel() {
 const { user } = useAuth()
 const isAdmin = user?.role === 'admin'
 const [orders, setOrders] = useState([])
 const [loading, setLoading] = useState(true)
 const [filter, setFilter] = useState('all')

 const load = useCallback(async () => {
 setLoading(true)
 try {
 const rows = await apiFetch('/api/orders/all')
 setOrders(Array.isArray(rows) ? rows : [])
 } catch (e) {
 console.error(e)
 } finally {
 setLoading(false)
 }
 }, [])

 useEffect(() => { load() }, [load])

 const handleStatusChange = (id, newStatus) => {
 setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o))
 }

 // Sendung und Stornierung geben die geänderte Bestellung zurück. Sie wird
 // eingesetzt statt die Liste neu zu laden — sonst klappt die aufgeklappte
 // Zeile beim Speichern zu, und man verliert die Stelle.
 const handleOrderChange = (neu) => {
 if (!neu?.id) return
 setOrders(prev => prev.map(o => o.id === neu.id ? { ...o, ...neu } : o))
 }

 const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)

 const counts = {}
 for (const o of orders) counts[o.status] = (counts[o.status] || 0) + 1
 const pendingPaymentCount = counts['pending_payment'] || 0

 return (
 <div className="min-h-full">
 {/* Header */}
 <div className="flex items-center justify-between mb-8">
 <div>
 <p className="text-[9px] text-black/20 uppercase tracking-[0.3em] mb-3 font-light">Verwaltung</p>
 <div className="flex items-center gap-3 mb-0">
 <h1 className="text-[28px] font-extralight text-black/85 tracking-tight">Bestellungen</h1>
 {pendingPaymentCount > 0 && (
 <span className="text-[9px] font-light px-2.5 py-1 uppercase tracking-wider bg-black/[0.06] text-black/50">
 {pendingPaymentCount} Zahlung offen
 </span>
 )}
 </div>
 <p className="text-[13px] text-black/30 mt-2 font-light">{orders.length} Bestellungen gesamt</p>
 </div>
 <button
 onClick={load}
 disabled={loading}
 className="flex items-center gap-2 px-4 h-9 text-[11px] text-black/25 hover:text-black/50 bg-transparent border-0 transition-colors font-light disabled:opacity-50"
 >
 <RefreshCw size={12} strokeWidth={1.5} className={loading ? 'animate-spin' : ''} />
 Aktualisieren
 </button>
 </div>

 {/* Filter tabs */}
 <div className="flex gap-1 flex-wrap mb-6">
 {FILTERS.map(f => (
 <button
 key={f.key}
 onClick={() => setFilter(f.key)}
 className={`transition-all ${
 filter === f.key
 ? 'px-3.5 py-1.5 text-[10px] bg-black text-white border-0 tracking-wider font-light'
 : 'px-3.5 py-1.5 text-[10px] text-black/25 hover:text-black/50 bg-transparent border-0 tracking-wider font-light'
 }`}
 >
 {f.label}
 {f.key !== 'all' && counts[f.key] ? ` (${counts[f.key]})` : ''}
 {f.key === 'all' ? ` (${orders.length})` : ''}
 </button>
 ))}
 </div>

 {/* List */}
 {loading ? (
 <div className="flex items-center justify-center py-20">
 <div className="w-5 h-5 rounded-full border border-black/10 border-t-black/40 animate-spin" />
 </div>
 ) : filtered.length === 0 ? (
 <div className="text-center py-20">
 <ShoppingBag size={28} strokeWidth={1} className="text-black/15 mx-auto mb-3" />
 <p className="text-[13px] text-black/25 font-light">Keine Bestellungen</p>
 </div>
 ) : (
 <div className="bg-white">
 {filtered.map(order => (
 <OrderRow key={order.id} order={order} onStatusChange={handleStatusChange} onOrderChange={handleOrderChange} isAdmin={isAdmin} />
 ))}
 </div>
 )}
 </div>
 )
}
