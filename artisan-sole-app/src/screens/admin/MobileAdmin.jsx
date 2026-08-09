/**
 * MobileAdmin.jsx — Verwaltung für das Telefon.
 *
 * Das CMS ist für den Schreibtisch gebaut: eine feste Seitenleiste mit 28
 * Einträgen, Tabellen mit sechs Spalten, Formulare in zwei Spalten. Auf einem
 * Telefon ist das unbenutzbar.
 *
 * Diese Oberfläche macht nicht dasselbe in klein, sondern etwas anderes:
 * Sie deckt die Handgriffe ab, die unterwegs anfallen — nachsehen, was
 * bestellt wurde, einen Gutschein ausstellen, einen Vermittler anlegen. Alles
 * Weitere (Schuhe pflegen, Bilder hochladen, Leisten justieren) bleibt dem
 * großen Bildschirm vorbehalten, und dafür gibt es unten einen Verweis.
 *
 * Grundsätze:
 *   • ein Bildschirm, eine Aufgabe — keine verschachtelten Ansichten
 *   • Bedienelemente mindestens 44 px hoch, damit sie mit dem Daumen treffbar sind
 *   • lesen ohne Risiko, schreiben nur, wo es ausdrücklich gewollt ist
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShoppingBag, Truck, Ticket, Users, Landmark, ShieldCheck, Mail,
  ChevronRight, ChevronLeft, Plus, Check, Monitor, LogOut, AlertCircle,
} from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { HOME_PATH } from '../../lib/homePath'
import { orderSpec } from '../../lib/orderSpec'
import { formatAddress } from '../../lib/address'

// ── Bausteine ───────────────────────────────────────────────────────────────

const money = (v) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/[^0-9,.-]/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n.toFixed(2).replace('.', ',') : '0,00'
}

const STATUS_LABEL = {
  pending_payment: 'Zahlung offen',
  pending: 'Offen',
  processing: 'In Arbeit',
  quality_check: 'Qualitätsprüfung',
  shipped: 'Versendet',
  delivered: 'Zugestellt',
  cancelled: 'Storniert',
}

function Screen({ title, onBack, children, action }) {
  return (
    <div className="min-h-screen bg-[#faf9f7] pb-24">
      {/* Kopfzeile bleibt stehen: Auf dem Telefon ist der Zurück-Weg sonst
          nach ein paar Zeilen Scrollen nicht mehr erreichbar. */}
      <header className="sticky top-0 z-20 bg-white border-b border-black/[0.06] flex items-center h-14 px-2">
        {onBack && (
          <button onClick={onBack} aria-label="Zurück"
            className="w-11 h-11 flex items-center justify-center bg-transparent border-0 text-black/50">
            <ChevronLeft size={22} strokeWidth={1.5} />
          </button>
        )}
        <h1 className={`text-[15px] font-light text-black/80 flex-1 ${onBack ? '' : 'px-3'}`}>{title}</h1>
        {action}
      </header>
      <div className="px-4 pt-4">{children}</div>
    </div>
  )
}

function Empty({ children }) {
  return <p className="text-[13px] text-black/30 font-light text-center py-14">{children}</p>
}

function Spinner() {
  return (
    <div className="flex justify-center py-14">
      <div className="w-5 h-5 border border-black/10 border-t-black/40 rounded-full animate-spin" />
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <label className="block mb-4">
      <span className="text-[11px] text-black/40 uppercase tracking-[0.14em] block mb-1.5">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-black/30 font-light block mt-1 leading-relaxed">{hint}</span>}
    </label>
  )
}

// h-12 statt h-10: Ein 40-px-Feld trifft man auf dem Telefon nicht zuverlässig.
const INPUT = 'w-full h-12 px-3.5 bg-white border border-black/[0.12] text-[15px] font-light text-black/80 outline-none focus:border-black/40 transition-colors'
const BUTTON = 'w-full h-12 flex items-center justify-center gap-2 text-[12px] tracking-[0.18em] uppercase transition-colors disabled:opacity-30'

function Row({ onClick, children }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick}
      className={`w-full text-left bg-white border border-black/[0.06] px-4 py-3.5 mb-2 flex items-center gap-3 ${onClick ? 'active:bg-black/[0.03]' : ''}`}>
      {children}
    </Tag>
  )
}

// ── Startbildschirm ─────────────────────────────────────────────────────────

const TASKS = [
  { key: 'orders',     label: 'Bestellungen', hint: 'ansehen und Status setzen', icon: ShoppingBag },
  { key: 'shipping',   label: 'Versand',      hint: 'Arten und Kosten',          icon: Truck },
  { key: 'coupons',    label: 'Gutscheine',   hint: 'ausstellen und ansehen',    icon: Ticket },
  { key: 'affiliates', label: 'Vermittler',   hint: 'anlegen und Stand prüfen',  icon: Users },
]

const ADMIN_TASKS = [
  { key: 'bank',  label: 'Bankverbindung', icon: Landmark },
  { key: 'smtp',  label: 'E-Mail-Versand', icon: Mail },
  { key: 'mfa',   label: 'Zwei-Faktor',    icon: ShieldCheck },
]

function Home({ go, user, onLogout }) {
  const navigate = useNavigate()
  return (
    <Screen title="Verwaltung">
      <p className="text-[12px] text-black/35 font-light mb-5">
        Angemeldet als {user?.name || user?.email}
      </p>

      {TASKS.map(t => (
        <Row key={t.key} onClick={() => go(t.key)}>
          <t.icon size={18} strokeWidth={1.3} className="text-black/35 flex-shrink-0" />
          <span className="flex-1 min-w-0">
            <span className="text-[15px] font-light text-black/80 block">{t.label}</span>
            <span className="text-[11px] text-black/30 font-light">{t.hint}</span>
          </span>
          <ChevronRight size={16} strokeWidth={1.4} className="text-black/20 flex-shrink-0" />
        </Row>
      ))}

      {user?.role === 'admin' && (
        <>
          <p className="text-[10px] text-black/25 uppercase tracking-[0.22em] mt-7 mb-2.5">Administration</p>
          {ADMIN_TASKS.map(t => (
            <Row key={t.key} onClick={() => go(t.key)}>
              <t.icon size={18} strokeWidth={1.3} className="text-black/35 flex-shrink-0" />
              <span className="flex-1 text-[15px] font-light text-black/80">{t.label}</span>
              <ChevronRight size={16} strokeWidth={1.4} className="text-black/20 flex-shrink-0" />
            </Row>
          ))}
        </>
      )}

      <p className="text-[10px] text-black/25 uppercase tracking-[0.22em] mt-7 mb-2.5">Mehr</p>
      {/* Bewusst der volle Bereich und nicht eine abgespeckte Fassung: Schuhe
          pflegen oder Leisten justieren ist auf dem Telefon keine Freude, aber
          gar kein Weg dorthin wäre schlimmer. */}
      <Row onClick={() => navigate('/cms')}>
        <Monitor size={18} strokeWidth={1.3} className="text-black/35 flex-shrink-0" />
        <span className="flex-1 min-w-0">
          <span className="text-[15px] font-light text-black/80 block">Vollständiges CMS</span>
          <span className="text-[11px] text-black/30 font-light">Schuhe, Inhalte, Scans — besser am Rechner</span>
        </span>
        <ChevronRight size={16} strokeWidth={1.4} className="text-black/20 flex-shrink-0" />
      </Row>
      <Row onClick={onLogout}>
        <LogOut size={18} strokeWidth={1.3} className="text-black/35 flex-shrink-0" />
        <span className="flex-1 text-[15px] font-light text-black/80">Abmelden</span>
      </Row>
    </Screen>
  )
}

// ── Bestellungen ────────────────────────────────────────────────────────────

const FLOW = ['pending_payment', 'processing', 'quality_check', 'shipped', 'delivered']

function Orders({ back }) {
  const [rows, setRows] = useState(null)
  const [open, setOpen] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const load = () => apiFetch('/api/orders/all').then(setRows).catch(() => setRows([]))
  useEffect(() => { load() }, [])

  const setStatus = async (order, status) => {
    setBusy(true); setError(null)
    try {
      await apiFetch(`/api/orders/${order.id}`, { method: 'PUT', body: JSON.stringify({ status }) })
      await load()
      setOpen(o => (o ? { ...o, status } : o))
    } catch (e) {
      // Der Zustand „Qualitätsprüfung" wird von der Datenbank derzeit
      // abgelehnt. Die Meldung durchreichen statt sie zu verschlucken.
      setError(e?.error || 'Status konnte nicht gesetzt werden')
    } finally { setBusy(false) }
  }

  if (open) {
    const idx = FLOW.indexOf(open.status)
    return (
      <Screen title={open.order_ref || `Bestellung ${open.id}`} onBack={() => { setOpen(null); setError(null) }}>
        <div className="bg-white border border-black/[0.06] p-4 mb-4">
          <p className="text-[15px] font-light text-black/80">{open.shoe_name}</p>
          <p className="text-[17px] font-light text-black/80 mt-2">€ {money(open.price)}</p>
          <p className="text-[11px] text-black/30 font-light mt-1">{open.created_at?.slice(0, 16).replace('T', ' ')}</p>
        </div>

        {/* Dieselbe Aufstellung wie im CMS, aus derselben Quelle — was die
            Manufaktur braucht, muss auch unterwegs ablesbar sein. */}
        <div className="bg-white border border-black/[0.06] p-4 mb-4">
          <p className="text-[10px] text-black/25 uppercase tracking-[0.2em] mb-2.5">Fertigung</p>
          {orderSpec(open).map(([k, v]) => (
            <div key={k} className="flex gap-3 py-[3px]">
              <span className="text-[12px] text-black/35 font-light w-[104px] flex-shrink-0">{k}</span>
              <span className="text-[12px] text-black/75 font-light flex-1 min-w-0">{v}</span>
            </div>
          ))}
          {open.foot_notes && (
            <div className="mt-3 bg-amber-50 border border-amber-200 px-3 py-2.5">
              <p className="text-[9px] text-amber-800 uppercase tracking-[0.18em] mb-1">Hinweis des Kunden</p>
              <p className="text-[12px] text-amber-900 font-light leading-relaxed whitespace-pre-line">{open.foot_notes}</p>
            </div>
          )}
        </div>

        {open.delivery_address && (
          <div className="bg-white border border-black/[0.06] p-4 mb-4">
            <p className="text-[10px] text-black/25 uppercase tracking-[0.2em] mb-2">Lieferung</p>
            <p className="text-[13px] font-light text-black/70 whitespace-pre-line leading-relaxed">
              {formatAddress(open.delivery_address)}
            </p>
          </div>
        )}

        <p className="text-[10px] text-black/25 uppercase tracking-[0.2em] mb-2.5">Status</p>
        {error && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-300/60 px-3 py-2.5 mb-3">
            <AlertCircle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" strokeWidth={1.6} />
            <p className="text-[12px] text-amber-900 font-light leading-relaxed">{error}</p>
          </div>
        )}
        {FLOW.map((s, i) => {
          const done = i <= idx
          const next = i === idx + 1
          return (
            <button key={s} disabled={busy || (!next && !done)} onClick={() => setStatus(open, s)}
              className={`w-full h-12 mb-2 px-4 flex items-center gap-3 border text-left transition-colors ${
                done ? 'bg-black text-white border-black'
                     : next ? 'bg-white text-black/80 border-black/25'
                            : 'bg-white text-black/25 border-black/[0.06]'}`}>
              <span className={`w-5 h-5 flex items-center justify-center flex-shrink-0 ${done ? 'bg-white/20' : 'border border-current'}`}>
                {done && <Check size={12} strokeWidth={2.5} />}
              </span>
              <span className="text-[14px] font-light">{STATUS_LABEL[s]}</span>
            </button>
          )
        })}
        <button disabled={busy} onClick={() => setStatus(open, 'cancelled')}
          className={`${BUTTON} bg-white text-red-700 border border-red-200 mt-4`}>
          Stornieren
        </button>
      </Screen>
    )
  }

  return (
    <Screen title="Bestellungen" onBack={back}>
      {rows === null ? <Spinner />
        : rows.length === 0 ? <Empty>Noch keine Bestellungen.</Empty>
        : rows.map(o => (
          <Row key={o.id} onClick={() => setOpen(o)}>
            <span className="flex-1 min-w-0">
              <span className="text-[14px] font-light text-black/80 block truncate">{o.shoe_name}</span>
              <span className="text-[11px] text-black/30 font-light">
                {o.order_ref || `#${o.id}`} · {STATUS_LABEL[o.status] || o.status}
              </span>
            </span>
            <span className="text-[14px] font-light text-black/70 flex-shrink-0">€ {money(o.price)}</span>
            <ChevronRight size={15} strokeWidth={1.4} className="text-black/20 flex-shrink-0" />
          </Row>
        ))}
    </Screen>
  )
}


// ── Versand (nur lesen) ─────────────────────────────────────────────────────

function Shipping({ back }) {
  const [rows, setRows] = useState(null)
  useEffect(() => { apiFetch('/api/shipping/all').catch(() => apiFetch('/api/shipping')).then(setRows).catch(() => setRows([])) }, [])
  return (
    <Screen title="Versand" onBack={back}>
      {rows === null ? <Spinner />
        : rows.length === 0 ? <Empty>Keine Versandarten hinterlegt.</Empty>
        : rows.map(s => (
          <Row key={s.id}>
            <span className="flex-1 min-w-0">
              <span className="text-[14px] font-light text-black/80 block">{s.name || s.label}</span>
              {s.description && <span className="text-[11px] text-black/30 font-light">{s.description}</span>}
            </span>
            <span className="text-[14px] font-light text-black/70 flex-shrink-0">
              {Number(s.price) === 0 ? 'gratis' : `€ ${money(s.price)}`}
            </span>
          </Row>
        ))}
      <p className="text-[11px] text-black/25 font-light mt-4 leading-relaxed">
        Versandarten werden am Rechner bearbeitet.
      </p>
    </Screen>
  )
}

// ── Gutscheine ──────────────────────────────────────────────────────────────

function Coupons({ back }) {
  const [rows, setRows] = useState(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ code: '', type: 'percentage', value: '10', max_uses: '', expires_at: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const load = () => apiFetch('/api/coupons').then(setRows).catch(() => setRows([]))
  useEffect(() => { load() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const valid = form.code.trim().length >= 3 && (form.type === 'free_shipping' || Number(form.value) > 0)

  const save = async () => {
    setBusy(true); setError(null)
    try {
      await apiFetch('/api/coupons', {
        method: 'POST',
        body: JSON.stringify({
          code: form.code.trim().toUpperCase(),
          type: form.type,
          value: form.type === 'free_shipping' ? 0 : Number(form.value),
          max_uses: form.max_uses ? Number(form.max_uses) : null,
          expires_at: form.expires_at || null,
        }),
      })
      setAdding(false)
      setForm({ code: '', type: 'percentage', value: '10', max_uses: '', expires_at: '' })
      load()
    } catch (e) { setError(e?.error || 'Konnte nicht gespeichert werden') }
    finally { setBusy(false) }
  }

  if (adding) {
    return (
      <Screen title="Gutschein ausstellen" onBack={() => { setAdding(false); setError(null) }}>
        <Field label="Code" hint="Wird in Großbuchstaben gespeichert.">
          <input value={form.code} onChange={e => set('code', e.target.value)}
            autoCapitalize="characters" placeholder="WILLKOMMEN10" className={INPUT} />
        </Field>

        <Field label="Art">
          <div className="grid grid-cols-3 gap-1.5">
            {[['percentage', 'Prozent'], ['fixed', 'Betrag'], ['free_shipping', 'Versand']].map(([k, l]) => (
              <button key={k} onClick={() => set('type', k)}
                className={`h-12 text-[12px] font-light border transition-colors ${
                  form.type === k ? 'bg-black text-white border-black' : 'bg-white text-black/60 border-black/[0.12]'}`}>
                {l}
              </button>
            ))}
          </div>
        </Field>

        {form.type !== 'free_shipping' && (
          <Field label={form.type === 'percentage' ? 'Rabatt in Prozent' : 'Betrag in Euro'}>
            <input type="number" inputMode="decimal" value={form.value}
              onChange={e => set('value', e.target.value)} className={INPUT} />
          </Field>
        )}

        <Field label="Höchstzahl Einlösungen" hint="Leer lassen für unbegrenzt.">
          <input type="number" inputMode="numeric" value={form.max_uses}
            onChange={e => set('max_uses', e.target.value)} placeholder="unbegrenzt" className={INPUT} />
        </Field>

        <Field label="Gültig bis" hint="Leer lassen für kein Ablaufdatum.">
          <input type="date" value={form.expires_at} onChange={e => set('expires_at', e.target.value)} className={INPUT} />
        </Field>

        {error && <p className="text-[12px] text-red-700 font-light mb-3">{error}</p>}
        <button disabled={!valid || busy} onClick={save} className={`${BUTTON} bg-black text-white border border-black`}>
          {busy ? 'Speichern…' : 'Ausstellen'}
        </button>
      </Screen>
    )
  }

  return (
    <Screen title="Gutscheine" onBack={back}
      action={
        <button onClick={() => setAdding(true)} aria-label="Neuer Gutschein"
          className="w-11 h-11 flex items-center justify-center bg-transparent border-0 text-black/50">
          <Plus size={20} strokeWidth={1.5} />
        </button>
      }>
      {rows === null ? <Spinner />
        : rows.length === 0 ? <Empty>Noch keine Gutscheine.</Empty>
        : rows.map(c => (
          <Row key={c.id}>
            <span className="flex-1 min-w-0">
              <span className="text-[14px] font-light text-black/80 block tracking-wide">{c.code}</span>
              <span className="text-[11px] text-black/30 font-light">
                {c.type === 'percentage' ? `${c.value} % Rabatt`
                  : c.type === 'fixed' ? `€ ${money(c.value)} Rabatt`
                  : c.type === 'free_shipping' ? 'Gratis Versand' : 'Gratis Zubehör'}
                {c.max_uses ? ` · ${c.used_count || 0}/${c.max_uses}` : ''}
              </span>
            </span>
            {c.expires_at && (
              <span className="text-[11px] text-black/30 font-light flex-shrink-0">
                bis {String(c.expires_at).slice(0, 10)}
              </span>
            )}
          </Row>
        ))}
    </Screen>
  )
}

// ── Vermittler ──────────────────────────────────────────────────────────────

function Affiliates({ back }) {
  const [rows, setRows] = useState(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({
    full_name: '', email: '', code: '',
    commission_type: 'percent', commission_value: '10', cap_per_shoe: '40', gift_shoetree: false,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const load = () => apiFetch('/api/affiliates').then(setRows).catch(() => setRows([]))
  useEffect(() => { load() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const valid = form.full_name.trim().length >= 2
    && /\S+@\S+\.\S+/.test(form.email)
    && form.code.trim().length >= 3

  const save = async () => {
    setBusy(true); setError(null)
    try {
      await apiFetch('/api/affiliates', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          commission_value: Number(form.commission_value),
          cap_per_shoe: Number(form.cap_per_shoe),
          gift_shoetree: form.gift_shoetree ? 1 : 0,
        }),
      })
      setAdding(false)
      setForm({ full_name: '', email: '', code: '', commission_type: 'percent', commission_value: '10', cap_per_shoe: '40', gift_shoetree: false })
      load()
    } catch (e) { setError(e?.error || 'Konnte nicht angelegt werden') }
    finally { setBusy(false) }
  }

  if (adding) {
    return (
      <Screen title="Vermittler anlegen" onBack={() => { setAdding(false); setError(null) }}>
        <Field label="Name">
          <input value={form.full_name} onChange={e => set('full_name', e.target.value)} className={INPUT} />
        </Field>
        <Field label="E-Mail">
          <input type="email" inputMode="email" autoCapitalize="none" value={form.email}
            onChange={e => set('email', e.target.value)} className={INPUT} />
        </Field>
        <Field label="Werbecode" hint="Erscheint im Link und im Warenkorb. Buchstaben, Ziffern, Bindestriche.">
          <input value={form.code} onChange={e => set('code', e.target.value)}
            autoCapitalize="none" placeholder="max-mustermann" className={INPUT} />
        </Field>

        <Field label="Provision">
          <div className="grid grid-cols-2 gap-1.5 mb-2">
            {[['percent', 'Prozent'], ['fixed', 'Festbetrag']].map(([k, l]) => (
              <button key={k} onClick={() => set('commission_type', k)}
                className={`h-12 text-[12px] font-light border transition-colors ${
                  form.commission_type === k ? 'bg-black text-white border-black' : 'bg-white text-black/60 border-black/[0.12]'}`}>
                {l}
              </button>
            ))}
          </div>
          <input type="number" inputMode="decimal" value={form.commission_value}
            onChange={e => set('commission_value', e.target.value)} className={INPUT} />
        </Field>

        <Field label="Höchstbetrag je Paar (€)">
          <input type="number" inputMode="decimal" value={form.cap_per_shoe}
            onChange={e => set('cap_per_shoe', e.target.value)} className={INPUT} />
        </Field>

        {form.commission_type === 'percent' && (
          <button onClick={() => set('gift_shoetree', !form.gift_shoetree)}
            className="w-full flex items-center gap-3 bg-white border border-black/[0.12] px-3.5 py-3 mb-4 text-left">
            <span className={`w-5 h-5 flex items-center justify-center flex-shrink-0 ${form.gift_shoetree ? 'bg-black' : 'border border-black/25'}`}>
              {form.gift_shoetree && <Check size={12} strokeWidth={2.5} className="text-white" />}
            </span>
            <span className="min-w-0">
              <span className="text-[14px] font-light text-black/80 block">Schuhspanner als Zugabe</span>
              <span className="text-[11px] text-black/30 font-light">Einkaufspreis wird von der Provision einbehalten</span>
            </span>
          </button>
        )}

        <p className="text-[11px] text-black/30 font-light mb-4 leading-relaxed">
          Anschrift, Steuerangaben und Bankverbindung lassen sich später ergänzen.
          Ohne IBAN bleibt die Auszahlung gesperrt.
        </p>

        {error && <p className="text-[12px] text-red-700 font-light mb-3">{error}</p>}
        <button disabled={!valid || busy} onClick={save} className={`${BUTTON} bg-black text-white border border-black`}>
          {busy ? 'Anlegen…' : 'Anlegen'}
        </button>
      </Screen>
    )
  }

  return (
    <Screen title="Vermittler" onBack={back}
      action={
        <button onClick={() => setAdding(true)} aria-label="Neuer Vermittler"
          className="w-11 h-11 flex items-center justify-center bg-transparent border-0 text-black/50">
          <Plus size={20} strokeWidth={1.5} />
        </button>
      }>
      {rows === null ? <Spinner />
        : rows.length === 0 ? <Empty>Noch keine Vermittler.</Empty>
        : rows.map(a => (
          <Row key={a.id}>
            <span className="flex-1 min-w-0">
              <span className="text-[14px] font-light text-black/80 block truncate">{a.full_name}</span>
              <span className="text-[11px] text-black/30 font-light">
                {a.code} · {a.pairs_total} {a.pairs_total === 1 ? 'Paar' : 'Paare'}
                {a.payout_blocked && ' · Auszahlung gesperrt'}
              </span>
            </span>
            <span className="text-right flex-shrink-0">
              <span className="text-[14px] font-light text-black/80 block">€ {money(a.open_amount)}</span>
              <span className="text-[10px] text-black/30 font-light">offen</span>
            </span>
          </Row>
        ))}
    </Screen>
  )
}

// ── Administration, nur lesen ───────────────────────────────────────────────

function ReadOnly({ title, back, endpoint, fields, note }) {
  const [data, setData] = useState(null)
  useEffect(() => { apiFetch(endpoint).then(setData).catch(() => setData({})) }, [endpoint])
  return (
    <Screen title={title} onBack={back}>
      {data === null ? <Spinner /> : (
        <>
          {fields.map(f => (
            <div key={f.key} className="bg-white border border-black/[0.06] px-4 py-3 mb-2">
              <p className="text-[10px] text-black/25 uppercase tracking-[0.2em] mb-1">{f.label}</p>
              <p className="text-[14px] font-light text-black/75 break-all">
                {f.render ? f.render(data) : (data[f.key] || '—')}
              </p>
            </div>
          ))}
          <p className="text-[11px] text-black/25 font-light mt-4 leading-relaxed">{note}</p>
        </>
      )}
    </Screen>
  )
}

// ── Zusammenbau ─────────────────────────────────────────────────────────────

export default function MobileAdmin() {
  const [view, setView] = useState('home')
  const { user, logout } = useAuth()
  const back = () => setView('home')

  const handleLogout = async () => {
    try { await logout() } finally { window.location.replace(HOME_PATH) }
  }

  switch (view) {
    case 'orders':     return <Orders back={back} />
    case 'shipping':   return <Shipping back={back} />
    case 'coupons':    return <Coupons back={back} />
    case 'affiliates': return <Affiliates back={back} />
    case 'bank':
      return <ReadOnly title="Bankverbindung" back={back} endpoint="/api/settings/bank"
        fields={[
          { key: 'account_holder', label: 'Kontoinhaber' },
          { key: 'iban', label: 'IBAN' },
          { key: 'bic', label: 'BIC' },
          { key: 'bank_name', label: 'Bank' },
        ]}
        note="Änderungen an der Bankverbindung nur am Rechner — sie stehen auf jeder Rechnung." />
    case 'smtp':
      return <ReadOnly title="E-Mail-Versand" back={back} endpoint="/api/settings/email"
        fields={[
          { key: 'host', label: 'Server' },
          { key: 'port', label: 'Port' },
          { key: 'user', label: 'Benutzer' },
          { key: 'from_email', label: 'Absender' },
          { key: 'secure', label: 'Verschlüsselt', render: d => (d.secure ? 'ja' : 'nein') },
        ]}
        note="Das Kennwort wird nicht ausgeliefert. Einrichtung und Testversand am Rechner." />
    case 'mfa':
      return <ReadOnly title="Zwei-Faktor" back={back} endpoint="/api/auth/mfa/status"
        fields={[{ key: 'enabled', label: 'Status', render: d => (d.enabled ? 'aktiv' : 'nicht eingerichtet') }]}
        note="Einrichten und Abschalten am Rechner — dafür wird der QR-Code gebraucht." />
    default:
      return <Home go={setView} user={user} onLogout={handleLogout} />
  }
}
