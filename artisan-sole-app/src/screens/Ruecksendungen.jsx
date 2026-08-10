/**
 * Ruecksendungen — Rücksendungen im eigenen Bereich.
 *
 * Der maßgefertigte Schuh entsteht für einen bestimmten Fuß und ist danach für
 * niemanden sonst zu gebrauchen — er ist vom Widerruf ausgenommen. Zubehör ist
 * Lagerware und geht regulär zurück.
 *
 * Diese Seite sagt das, statt es zu verschweigen: Der Schuh steht in jeder
 * Bestellung mit dabei, ausgegraut und mit Begründung. Wer die Schaltfläche
 * sucht, die es nicht gibt, soll erfahren warum, statt zu suchen.
 *
 * Angemeldet wird positionsweise. Der Server prüft jede Position noch einmal
 * gegen die Bestellung und zieht bereits angemeldete Mengen ab — was hier
 * angezeigt wird, ist eine Bequemlichkeit, keine Zusicherung.
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, PackageOpen, Lock, Check, Clock, AlertTriangle, Minus, Plus,
} from 'lucide-react'
import { apiFetch } from '../hooks/useApi'

const euro = (n) => `€ ${Number(n || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const STATUS = {
  requested: { text: 'Angemeldet',  hint: 'Wir melden uns mit dem Rücksendeschein.' },
  approved:  { text: 'Bestätigt',   hint: 'Bitte senden Sie die Ware zurück.' },
  received:  { text: 'Eingegangen', hint: 'Die Rücksendung ist bei uns angekommen.' },
  refunded:  { text: 'Erstattet',   hint: 'Der Betrag ist erstattet.' },
  rejected:  { text: 'Abgelehnt',   hint: '' },
}

const datum = (s) => {
  if (!s) return null
  const d = new Date(String(s).replace(' ', 'T') + (String(s).endsWith('Z') ? '' : 'Z'))
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Eine zugestellte Bestellung mit dem, was daraus zurückgehen kann. */
function Bestellung({ eintrag, onSenden, sendet }) {
  const [mengen, setMengen] = useState({})     // { name: anzahl }
  const [grund, setGrund] = useState('')
  const b = eintrag

  const setzen = (name, wert, max) =>
    setMengen(m => ({ ...m, [name]: Math.max(0, Math.min(max, wert)) }))

  const gewaehlt = b.items
    .map(i => ({ ...i, qty: mengen[i.name] || 0 }))
    .filter(i => i.qty > 0)
  const summe = gewaehlt.reduce((s, i) => s + i.price * i.qty, 0)

  const senden = async () => {
    const ok = await onSenden(b.order_id, gewaehlt, grund)
    if (ok) { setMengen({}); setGrund('') }
  }

  return (
    <div className="border border-black/10 bg-white">
      <div className="px-5 py-4 border-b border-black/[0.06] flex items-start justify-between gap-4">
        <div>
          <p className="text-[13px] text-black">{b.shoe_name}</p>
          <p className="text-[11px] text-black/35 font-light mt-0.5">
            {b.order_ref ? `${b.order_ref} · ` : ''}
            Zugestellt {datum(b.delivered_at) || '—'}
          </p>
        </div>
        <span className={`text-[10px] uppercase tracking-[0.14em] px-2 py-0.5 border shrink-0 ${b.open ? 'border-black/25 text-black/60' : 'border-black/10 text-black/30'}`}>
          {b.days_left == null
            ? 'Frist läuft noch nicht'
            : b.days_left > 0
              ? `noch ${b.days_left} ${b.days_left === 1 ? 'Tag' : 'Tage'}`
              : 'Frist abgelaufen'}
        </span>
      </div>

      <div className="px-5 py-4 space-y-3">
        {/* Der Schuh — bewusst sichtbar, damit die Frage gar nicht erst
            entsteht. */}
        <div className="flex items-start gap-3 opacity-50">
          <Lock size={14} strokeWidth={1.5} className="text-black/40 mt-0.5 shrink-0" />
          <div>
            <p className="text-[12px] text-black/70">{b.shoe_name}</p>
            <p className="text-[11px] text-black/40 font-light leading-relaxed">
              Maßanfertigung — keine Rückgabe. Bei einem Mangel fertigen wir das
              Paar neu; gefällt es Ihnen nicht, sehen wir uns das an.
            </p>
          </div>
        </div>

        {b.items.length === 0 ? (
          <p className="text-[11px] text-black/35 font-light pt-1">
            Aus dieser Bestellung ist nichts (mehr) zurückzusenden.
          </p>
        ) : !b.open ? (
          <p className="text-[11px] text-black/35 font-light pt-1">
            {b.days_left == null
              ? 'Sobald die Bestellung zugestellt ist, beginnt die Rücksendefrist.'
              : `Die Frist von ${b.window_days} Tagen ist abgelaufen.`}
          </p>
        ) : (
          <>
            {b.items.map(i => {
              const anzahl = mengen[i.name] || 0
              return (
                <div key={i.name} className="flex items-center justify-between gap-4 pt-1">
                  <div className="min-w-0">
                    <p className="text-[12px] text-black/80 truncate">{i.name}</p>
                    <p className="text-[11px] text-black/35 font-light">
                      {euro(i.price)} · {i.qty} {i.qty === 1 ? 'Stück' : 'Stück'} rücksendbar
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button" onClick={() => setzen(i.name, anzahl - 1, i.qty)} disabled={anzahl === 0}
                      className="w-8 h-8 flex items-center justify-center border border-black/12 bg-white disabled:opacity-25"
                      aria-label={`${i.name} weniger`}
                    >
                      <Minus size={12} strokeWidth={2} />
                    </button>
                    <span className="w-7 text-center text-[13px] tabular-nums">{anzahl}</span>
                    <button
                      type="button" onClick={() => setzen(i.name, anzahl + 1, i.qty)} disabled={anzahl >= i.qty}
                      className="w-8 h-8 flex items-center justify-center border border-black/12 bg-white disabled:opacity-25"
                      aria-label={`${i.name} mehr`}
                    >
                      <Plus size={12} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              )
            })}

            {gewaehlt.length > 0 && (
              <div className="pt-3 mt-1 border-t border-black/[0.07] space-y-3">
                <label className="block">
                  <span className="block text-[10px] uppercase tracking-[0.14em] text-black/35 mb-1.5">
                    Grund <span className="text-black/20">· freiwillig</span>
                  </span>
                  <textarea
                    rows={2} value={grund} onChange={e => setGrund(e.target.value)}
                    placeholder="Hilft uns, muss aber nicht sein."
                    className="w-full p-2.5 border border-black/15 text-[13px] outline-none focus:border-black/40 resize-none"
                  />
                </label>
                <div className="flex items-center justify-between gap-4">
                  <p className="text-[12px] text-black/60">
                    {gewaehlt.reduce((s, i) => s + i.qty, 0)} Position(en) · {euro(summe)}
                  </p>
                  <button
                    type="button" onClick={senden} disabled={sendet}
                    className="h-10 px-5 bg-black text-white text-[11px] tracking-[0.14em] uppercase border-0 disabled:opacity-30"
                  >
                    {sendet ? 'Wird gesendet…' : 'Rücksendung anmelden'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {b.requests.length > 0 && (
          <div className="pt-3 mt-1 border-t border-black/[0.07] space-y-2">
            <p className="text-[10px] uppercase tracking-[0.14em] text-black/30">Bereits angemeldet</p>
            {b.requests.map(r => (
              <div key={r.id} className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[12px] text-black/70">
                    {r.items.map(i => `${i.qty}× ${i.name}`).join(', ')}
                  </p>
                  <p className="text-[11px] text-black/35 font-light">
                    {datum(r.created_at)} · {euro(r.amount)}
                    {STATUS[r.status]?.hint ? ` · ${STATUS[r.status].hint}` : ''}
                  </p>
                  {r.note && <p className="text-[11px] text-black/45 font-light mt-0.5">{r.note}</p>}
                </div>
                <span className="text-[10px] uppercase tracking-[0.14em] text-black/45 shrink-0">
                  {STATUS[r.status]?.text || r.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Ruecksendungen() {
  const navigate = useNavigate()
  const [daten, setDaten] = useState(null)
  const [fehler, setFehler] = useState(null)
  const [sendet, setSendet] = useState(false)
  const [erfolg, setErfolg] = useState(null)

  const laden = useCallback(async () => {
    try {
      setDaten(await apiFetch('/api/orders/ruecksendungen/meine'))
    } catch (e) {
      setFehler(e?.error || 'Die Rücksendungen konnten nicht geladen werden.')
    }
  }, [])
  useEffect(() => { laden() }, [laden])

  const anmelden = async (orderId, items, reason) => {
    setSendet(true); setFehler(null); setErfolg(null)
    try {
      await apiFetch(`/api/orders/${orderId}/ruecksendung`, {
        method: 'POST',
        body: JSON.stringify({ items, reason: reason || undefined }),
      })
      setErfolg('Ihre Rücksendung ist angemeldet. Wir melden uns mit dem Rücksendeschein.')
      await laden()
      return true
    } catch (e) {
      setFehler(e?.error || 'Die Rücksendung konnte nicht angemeldet werden.')
      return false
    } finally { setSendet(false) }
  }

  const bestellungen = daten?.orders || []

  return (
    <div className="min-h-full bg-white pb-20">
      <div className="px-5 lg:px-16 pt-8 lg:pt-12">
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 text-[11px] text-black/40 hover:text-black bg-transparent border-0 p-0 mb-6 uppercase tracking-[0.14em]"
        >
          <ArrowLeft size={14} strokeWidth={1.5} /> Profil
        </button>

        <p className="text-[10px] uppercase tracking-[0.3em] text-black/25 mb-3">Rücksendungen</p>
        <h1 className="text-[26px] lg:text-[32px] font-extralight text-black tracking-tight">Etwas zurücksenden</h1>
        <p className="text-[13px] text-black/45 font-light leading-relaxed max-w-xl mt-3">
          {daten?.shoe_note || 'Maßgefertigte Schuhe können nicht zurückgegeben werden. Zubehör geht regulär zurück.'}
          {daten?.window_days ? ` Zubehör innerhalb von ${daten.window_days} Tagen nach Zustellung.` : ''}
        </p>
      </div>

      <div className="px-5 lg:px-16 pt-8 max-w-3xl space-y-4">
        {fehler && (
          <div className="flex items-start gap-2 border border-black/15 bg-black/[0.02] p-3">
            <AlertTriangle size={13} className="text-black/50 mt-0.5 shrink-0" />
            <p className="text-[12px] text-black/70 leading-relaxed">{fehler}</p>
          </div>
        )}
        {erfolg && (
          <div className="flex items-start gap-2 border border-black/15 p-3">
            <Check size={13} className="text-black/50 mt-0.5 shrink-0" />
            <p className="text-[12px] text-black/70 leading-relaxed">{erfolg}</p>
          </div>
        )}

        {!daten ? (
          <p className="text-[12px] text-black/35">Wird geladen…</p>
        ) : bestellungen.length === 0 ? (
          <div className="border border-black/10 px-5 py-12 text-center">
            <PackageOpen size={18} strokeWidth={1.4} className="text-black/20 mx-auto mb-3" />
            <p className="text-[13px] text-black/50 font-light">Noch keine zugestellte Bestellung.</p>
            <p className="text-[11px] text-black/35 font-light mt-1.5">
              Die Rücksendefrist beginnt mit der Zustellung.
            </p>
            <button
              onClick={() => navigate('/orders')}
              className="mt-5 text-[11px] text-black/45 hover:text-black underline underline-offset-4 bg-transparent border-0 uppercase tracking-[0.14em]"
            >
              Zu meinen Bestellungen
            </button>
          </div>
        ) : (
          bestellungen.map(b => (
            <Bestellung key={b.order_id} eintrag={b} onSenden={anmelden} sendet={sendet} />
          ))
        )}

        {bestellungen.length > 0 && (
          <p className="flex items-start gap-2 text-[11px] text-black/35 font-light leading-relaxed pt-2">
            <Clock size={12} strokeWidth={1.5} className="mt-0.5 shrink-0" />
            Die Frist läuft ab Zustellung. Nach der Anmeldung erhalten Sie den
            Rücksendeschein per E-Mail; erstattet wird, sobald die Ware bei uns
            eingegangen ist.
          </p>
        )}
      </div>
    </div>
  )
}
