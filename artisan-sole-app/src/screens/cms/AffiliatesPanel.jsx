/**
 * AffiliatesPanel — Affiliate anlegen und verwalten.
 *
 * Zum Anlegen genügt die E-Mail. Alles Weitere trägt der Affiliate nach der
 * Einladung selbst ein — er ist der Einzige, der es sicher weiß. Vorher
 * verlangte diese Maske Anschrift, Geburtsdatum, Steuerstatus und
 * Bankverbindung von der Verwaltung, die davon nichts wissen kann: Die
 * Angaben wurden geschätzt oder leer gelassen, und die Gutschrift lief auf
 * eine Anschrift, die niemand geprüft hatte.
 *
 * Geändert werden kann hinterher alles — unter „Bearbeiten" liegen dieselben
 * Felder, samt Konditionen. Was der Affiliate selbst nicht darf: seinen Code,
 * seine Provision und seinen Status setzen. Das sind Zusagen des Hauses.
 *
 * Ein Affiliate ist eine Person, kein Firmenkonto. Für die Abrechnung gehört
 * dazu:
 *
 *   Pflicht    E-Mail — mehr nicht.
 *   Vertrag    Anschrift und Geburtsdatum laut Ausweis. Beides ist nötig, um
 *              eine Gutschrift auszustellen und die Person eindeutig zu
 *              identifizieren; das Geburtsdatum trennt Namensgleiche.
 *   Steuer     Kleinunternehmer oder umsatzsteuerpflichtig, dazu Steuernummer
 *              beziehungsweise USt-IdNr. Wer Umsatzsteuer ausweist, braucht
 *              die Nummer auf der Gutschrift.
 *   Bank       IBAN und Kontoinhaber. Ohne beides darf nicht ausgezahlt werden.
 *   Konditionen Provision, Deckel je Paar, Zugabe — und getrennt davon, was
 *              der geworbene Kunde bekommt.
 *
 * Angelegt wird immer beides: der Affiliate-Datensatz und ein Login. Ohne
 * Login sieht die Person ihren Stand nie.
 */
import { useState, useEffect } from 'react'
import { Users, Plus, Copy, Check, X, Mail, AlertTriangle, Link2, Percent, Gift, KeyRound, Lock, Unlock } from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'

const APP_ORIGIN = (import.meta.env.VITE_API_URL ?? '') || (typeof window !== 'undefined' ? window.location.origin : '')

// Zum Anlegen wird nur die Adresse gebraucht; der Rest kommt vom Affiliate.
const neuesFormular = { _modus: 'neu', email: '', note: '' }

// Muss zu DECKEL_STANDARD in utils/affiliate.js passen: der Deckel je Paar,
// wenn prozentual vergütet wird und nichts anderes eingetragen ist.
const DECKEL_STANDARD = 50

const leeresFormular = {
  full_name: '', email: '', phone: '', code: '',
  street: '', postal_code: '', city: '', country: 'DE', birth_date: '',
  tax_status: 'small_business', tax_number: '', vat_id: '',
  iban: '', account_holder: '',
  commission_type: 'fixed', commission_value: 50, cap_per_shoe: DECKEL_STANDARD,
  customer_benefit: 'none', customer_discount_pct: 10, gift_key: 'care_kit_leather',
  note: '',
}

// Beträge, die in der Praxis vergeben werden. Als Knöpfe, damit niemand
// tippen muss — der Wert lässt sich daneben trotzdem frei setzen.
const BETRAG_VORSCHLAEGE = [30, 40, 45, 50]

// Falls das Zubehör nicht geladen werden konnte: Die Auswahl soll nicht leer
// dastehen, sonst lässt sich eine bestehende Zusage nicht einmal ansehen.
const ZUGABE_RUECKFALL = [
  { key: 'care_kit_leather',  name: 'Lederpflege-Set' },
  { key: 'care_kit_suede',    name: 'Wildlederpflege-Set' },
  { key: 'shoe_tree_cedar',   name: 'Zedernholz-Schuhspanner' },
  { key: 'shoe_tree_black',   name: 'Schuhspanner Schwarz' },
  { key: 'boot_tree_cedar',   name: 'Zedernholz-Stiefelspanner' },
]

// Preis, an dem die Vorschau rechnet. Ein mittleres Paar — bei prozentualer
// Vergütung hängt der Topf am Preis, und irgendeine Zahl muss darunter stehen.
const BEISPIELPREIS = 340

/**
 * Eine Zeile aus der Liste in ein Formular überführen.
 *
 * NULL aus der Datenbank wird zu einer leeren Zeichenkette: React beschwert
 * sich sonst über ein Eingabefeld ohne Wert, und beim Speichern ginge aus
 * „nicht gesetzt" ein wörtliches null in die Maske ein.
 */
function zumFormular(a) {
  const rein = Object.fromEntries(
    Object.entries(a).map(([k, v]) => [k, v === null ? '' : v])
  )
  return { ...leeresFormular, ...rein, _modus: 'bearbeiten' }
}

/**
 * Welche Angaben der Affiliate selbst pflegen darf — und welche davon die
 * Verwaltung festgeschrieben hat.
 *
 * Sperren ist keine Bevormundung: Sobald jemand die Anschrift gegen den
 * Ausweis und die IBAN gegen den Kontoauszug geprüft hat, darf sich beides
 * nicht mehr still ändern. Eine geprüfte Bankverbindung, die nachts eine
 * andere wird, ist der klassische Weg, eine Gutschrift umzuleiten.
 */
const SPERRBARE_FELDER = [
  { key: 'full_name',      label: 'Name' },
  { key: 'street',         label: 'Straße' },
  { key: 'postal_code',    label: 'PLZ' },
  { key: 'city',           label: 'Ort' },
  { key: 'birth_date',     label: 'Geburtsdatum' },
  { key: 'tax_status',     label: 'Steuerstatus' },
  { key: 'tax_number',     label: 'Steuernummer' },
  { key: 'vat_id',         label: 'USt-IdNr.' },
  { key: 'iban',           label: 'IBAN' },
  { key: 'account_holder', label: 'Kontoinhaber' },
]

const sperrliste = (a) => {
  try { const l = JSON.parse(a?.locked_fields || '[]'); return Array.isArray(l) ? l : [] }
  catch { return [] }
}

/** Die Konditionen einer Zeile in einem Satzfragment. */
function konditionenText(a) {
  const topf = a.commission_type === 'fixed'
    ? `${Number(a.commission_value) || 0} € je Paar`
    : `${Number(a.commission_value) || 0} % · max. ${Number(a.cap_per_shoe) || DECKEL_STANDARD} €`
  const zusage =
    a.customer_benefit === 'discount' ? `Nachlass ${Number(a.customer_discount_pct) || 0} %`
    : a.customer_benefit === 'gift'   ? 'Zugabe'
    : 'ohne Zusage'
  return `${topf} · ${zusage}`
}

/**
 * Der Topf je Paar: Was eine Vermittlung das Haus höchstens kostet.
 *
 * Dieselbe Rechnung wie im Server (utils/affiliate.js). Sie steht hier ein
 * zweites Mal, weil die Vorschau im Formular sonst raten müsste — und eine
 * Vorschau, die anders rechnet als die Abrechnung, ist schlimmer als keine.
 */
function topfVon(form, preis) {
  if (form.commission_type === 'fixed') return Math.max(0, Number(form.commission_value) || 0)
  const roh = preis * (Number(form.commission_value) || 0) / 100
  return Math.max(0, Math.min(roh, Number(form.cap_per_shoe) || DECKEL_STANDARD))
}

// Aus dem Namen einen brauchbaren Codevorschlag machen.
const codeVorschlag = (name) =>
  String(name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24)

const euro = (v) => `€ ${Number(v || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function Feld({ label, hint, children, required }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-[0.14em] text-black/40 mb-1">
        {label}{required && <span className="text-black/25"> ·&nbsp;Pflicht</span>}
      </span>
      {children}
      {hint && <span className="block text-[10px] text-black/35 mt-1 leading-relaxed">{hint}</span>}
    </label>
  )
}

const eingabe = 'w-full h-9 px-2.5 border border-black/15 text-[13px] outline-none focus:border-black/40 bg-white'

/**
 * Was unter dem Strich herauskommt — in Zahlen, nicht als Erklärung.
 *
 * Die Konditionen bestehen aus drei Feldern, deren Zusammenspiel man sich
 * sonst im Kopf ausrechnen müsste: Topf minus Zusage gleich Auszahlung. Wer
 * hier einen Nachlass von 10 % neben einer Vergütung von 10 % einträgt, sieht
 * sofort, dass für den Affiliate nichts übrig bleibt — und nicht erst bei der
 * ersten Abrechnung.
 */
function Rechenbeispiel({ form, zubehoer }) {
  const topf = topfVon(form, BEISPIELPREIS)

  const artikel = zubehoer.find(z => z.key === form.gift_key)
  const zugabeEk = artikel
    ? Number(artikel.cost_price ?? String(artikel.price || '').replace(/[^0-9,.]/g, '').replace(',', '.')) || 0
    : 0

  const zusage =
    form.customer_benefit === 'gift'     ? Math.min(zugabeEk, topf)
    : form.customer_benefit === 'discount' ? Math.min(BEISPIELPREIS * (Number(form.customer_discount_pct) || 0) / 100, topf)
    : 0

  const auszahlung = Math.max(0, topf - zusage)

  const zusageText =
    form.customer_benefit === 'gift'
      ? `Zugabe${artikel ? ` · ${artikel.name}` : ''}${zugabeEk ? ' (Einkauf)' : ' (kein Einkaufspreis hinterlegt)'}`
      : form.customer_benefit === 'discount'
        ? `Nachlass ${Number(form.customer_discount_pct) || 0} % auf ${euro(BEISPIELPREIS)}`
        : 'Keine Zusage an den Kunden'

  return (
    <div className="mt-4 border border-black/12 bg-black/[0.015] p-4">
      <p className="text-[10px] uppercase tracking-[0.16em] text-black/35 mb-2.5">
        Ein Paar zu {euro(BEISPIELPREIS)}
      </p>
      <table className="w-full">
        <tbody>
          <tr>
            <td className="text-[12px] text-black/55 py-[3px]">Topf je Paar</td>
            <td className="text-[12px] text-black/80 py-[3px] text-right tabular-nums">{euro(topf)}</td>
          </tr>
          <tr>
            <td className="text-[12px] text-black/55 py-[3px]">{zusageText}</td>
            <td className="text-[12px] text-black/80 py-[3px] text-right tabular-nums">
              {zusage > 0 ? `− ${euro(zusage)}` : euro(0)}
            </td>
          </tr>
          <tr className="border-t border-black/10">
            <td className="text-[12px] text-black pt-2">Auszahlung an den Affiliate</td>
            <td className="text-[12px] text-black pt-2 text-right tabular-nums">{euro(auszahlung)}</td>
          </tr>
        </tbody>
      </table>
      <p className="text-[10px] text-black/35 mt-2.5 leading-relaxed">
        Das Haus zahlt in jedem Fall {euro(topf)} — was davon der Kunde bekommt und was
        der Affiliate, entscheidet die Zusage.
        {form.commission_type === 'percent' && ' Bei prozentualer Vergütung ändert sich der Topf mit dem Preis des Modells.'}
      </p>
    </div>
  )
}

export default function AffiliatesPanel() {
  const [liste, setListe] = useState([])
  const [laedt, setLaedt] = useState(true)
  const [form, setForm] = useState(null)      // null = geschlossen
  const [busy, setBusy] = useState(false)
  const [fehler, setFehler] = useState(null)
  const [hinweis, setHinweis] = useState(null)
  const [kopiert, setKopiert] = useState(null)
  const [zubehoer, setZubehoer] = useState([])
  const [einladung, setEinladung] = useState(null)   // { offen, link, qr, … }
  // Zugang zurücksetzen — derselbe Weg wie bei den Benutzern, nur von hier
  // aus erreichbar. Ein Affiliate, der sein Gerät verliert, bekommt keine
  // Mail von uns; der QR-Code ist der einzige Weg zurück.
  const [zugang, setZugang] = useState(null)

  const zugangFreigeben = async (a) => {
    const notiz = prompt(`Zugang für ${a.full_name || a.email} zurücksetzen.\n\nWie haben Sie die Identität geprüft?`)
    if (notiz === null) return
    if (notiz.trim().length < 4) { setFehler('Bitte kurz festhalten, wie Sie die Identität geprüft haben.'); return }
    setFehler(null); setHinweis(null)
    setZugang({ laedt: true, name: a.full_name || a.email })
    try {
      const d = await apiFetch(`/api/users/${a.user_id}/wiederherstellung`, {
        method: 'POST', body: JSON.stringify({ note: notiz.trim() }),
      })
      setZugang({ ...d, name: a.full_name || a.email })
    } catch (e) {
      setZugang(null)
      setFehler(e?.error || 'Zugang konnte nicht zurückgesetzt werden.')
    }
  }


  // Das Zubehör wird für die Zugabe gebraucht: Namen für die Auswahl,
  // Einkaufspreise für die Vorschau. Schlägt der Abruf fehl, greift die feste
  // Liste — die Maske soll deshalb nicht unbedienbar werden.
  useEffect(() => {
    apiFetch('/api/accessories')
      .then(r => setZubehoer(Array.isArray(r) ? r.filter(z => z.key) : []))
      .catch(() => setZubehoer([]))
  }, [])

  const laden = async () => {
    try {
      const rows = await apiFetch('/api/affiliates')
      setListe(Array.isArray(rows) ? rows : [])
    } catch (e) {
      setFehler(e?.error || 'Affiliate konnten nicht geladen werden.')
    } finally { setLaedt(false) }
  }
  useEffect(() => { laden() }, [])

  const setzen = (k, v) => setForm(f => ({ ...f, [k]: v }))

  /**
   * Einladung eines Affiliates holen und anzeigen.
   *
   * Als eigener Aufruf und nicht in der Liste: Der QR-Code ist ein halbes
   * Dutzend Kilobyte je Zeile, und gebraucht wird er für eine.
   */
  const einladungHolen = async (a) => {
    setFehler(null); setHinweis(null)
    setEinladung({ laedt: true, name: a.full_name || a.email, code: a.code })
    try {
      const d = await apiFetch(`/api/affiliates/${a.id}/einladung`)
      setEinladung({ ...d, name: a.full_name || a.email })
    } catch (e) {
      setEinladung(null)
      setFehler(e?.error || 'Einladung konnte nicht geladen werden.')
    }
  }

  const kopieren = async (text, id) => {
    try { await navigator.clipboard.writeText(text); setKopiert(id); setTimeout(() => setKopiert(null), 1600) } catch { /* ohne Zwischenablage */ }
  }

  const anlegen = async (e) => {
    e.preventDefault()
    setBusy(true); setFehler(null); setHinweis(null)
    try {
      if (form._modus === 'bearbeiten') {
        const { _modus, id, ...rumpf } = form
        await apiFetch(`/api/affiliates/${id}`, { method: 'PUT', body: JSON.stringify(rumpf) })
        setForm(null)
        await laden()
        setHinweis('Änderungen gespeichert.')
        return
      }
      const res = await apiFetch('/api/affiliates', { method: 'POST', body: JSON.stringify(form) })
      setForm(null)
      await laden()
      if (res.existing_user) {
        setHinweis(`${res.code} angelegt. Die Adresse hatte bereits ein Konto — es wurde verknüpft, eine Einladung war nicht nötig.`)
      } else if (res.email_sent) {
        setHinweis(`${res.code} angelegt. Die Einladung ist unterwegs.`)
      } else {
        setHinweis(`${res.code} angelegt, aber die Einladung ging nicht raus${res.email_error ? ` (${res.email_error})` : ''}. Link zum Weitergeben: ${APP_ORIGIN}/affiliate-konto?token=${res.invite_token}`)
      }
    } catch (e) {
      setFehler(e?.error || 'Anlegen fehlgeschlagen.')
    } finally { setBusy(false) }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <Users size={18} className="text-black/50" />
          <h1 className="text-[15px] tracking-[0.06em]">Affiliate</h1>
          {!laedt && <span className="text-[11px] text-black/35">{liste.length}</span>}
        </div>
        <button
          onClick={() => setForm(form ? null : { ...neuesFormular })}
          className="flex items-center gap-1.5 h-8 px-3 bg-black text-white text-[11px] tracking-[0.12em] uppercase border-0"
        >
          {form ? <X size={12} /> : <Plus size={12} />}
          {form ? 'Abbrechen' : 'Affiliate anlegen'}
        </button>
      </div>

      {fehler && (
        <div className="flex items-start gap-2 border border-black/15 bg-black/[0.02] p-3 mb-4">
          <AlertTriangle size={13} className="text-black/50 mt-0.5 shrink-0" />
          <p className="text-[12px] text-black/70 leading-relaxed">{fehler}</p>
        </div>
      )}
      {hinweis && (
        <div className="flex items-start gap-2 border border-black/15 p-3 mb-4">
          <Mail size={13} className="text-black/50 mt-0.5 shrink-0" />
          <p className="text-[12px] text-black/70 leading-relaxed break-all">{hinweis}</p>
        </div>
      )}

      {/* Einladung zum Weitergeben — Link zum Kopieren, QR zum Abscannen.
          Ohne funktionierenden Mailversand ist das der einzige Weg ins Konto;
          mit Mailversand der schnellere, wenn der Partner ohnehin vor einem
          steht. */}
      {einladung && (
        <div className="border border-black/12 p-5 mb-8 max-w-2xl">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-black/30">Einladung</p>
              <p className="text-[13px] text-black/70 mt-0.5">{einladung.name} · {einladung.code}</p>
            </div>
            <button
              onClick={() => setEinladung(null)}
              className="text-[11px] text-black/40 hover:text-black bg-transparent border-0"
            >
              Schließen
            </button>
          </div>

          {einladung.laedt ? (
            <p className="text-[12px] text-black/35">Wird geladen …</p>
          ) : einladung.offen === false ? (
            <p className="text-[12px] text-black/55 font-light leading-relaxed">{einladung.grund}</p>
          ) : (
            <div className="flex flex-col sm:flex-row gap-5">
              {einladung.qr && (
                <div className="flex-shrink-0">
                  <img src={einladung.qr} alt="QR-Code zur Einladung" className="w-[150px] h-[150px] border border-black/[0.07]" />
                  <p className="text-[10px] text-black/35 font-light text-center mt-1.5 max-w-[150px] leading-relaxed">
                    Vom Bildschirm abscannen lassen
                  </p>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-black/45 font-light leading-relaxed mb-2">
                  Dieser Link führt einmalig in das Konto von {einladung.name}. Dort trägt der
                  Affiliate seine Daten selbst ein. Bitte nicht öffentlich teilen.
                </p>
                <p className="text-[11px] text-black/70 break-all bg-black/[0.02] border border-black/[0.06] p-2.5">
                  {einladung.link}
                </p>
                <button
                  onClick={() => kopieren(einladung.link, 'einladung')}
                  className="mt-2.5 flex items-center gap-1.5 h-8 px-3 border border-black/15 text-[11px] tracking-[0.1em] uppercase text-black/60 hover:border-black hover:text-black bg-transparent"
                >
                  {kopiert === 'einladung' ? <Check size={12} /> : <Link2 size={12} />}
                  {kopiert === 'einladung' ? 'Kopiert' : 'Link kopieren'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Zugang zurücksetzen: Link und QR. Dieselbe Kennung wie bei den
          Benutzern, eine Stunde gültig, einmal benutzbar. */}
      {zugang && (
        <div className="border border-black/12 p-5 mb-8 max-w-2xl">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-black/30">Anmeldung zurücksetzen</p>
              <p className="text-[13px] text-black/70 mt-0.5">{zugang.name}</p>
            </div>
            <button onClick={() => setZugang(null)} className="text-[11px] text-black/40 hover:text-black bg-transparent border-0">Schließen</button>
          </div>
          {zugang.laedt ? (
            <p className="text-[12px] text-black/35">Wird erzeugt …</p>
          ) : (
            <div className="flex flex-col sm:flex-row gap-5">
              {zugang.qr && (
                <img src={zugang.qr} alt="QR-Code zum Zurücksetzen" className="w-[150px] h-[150px] border border-black/[0.07] flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-black/45 font-light leading-relaxed mb-2">
                  Eine Stunde gültig, einmal benutzbar. Damit hinterlegt der Affiliate ein
                  neues Gerät. Bisherige Geräte bleiben gültig, offene Sitzungen enden.
                </p>
                <p className="text-[11px] text-black/70 break-all bg-black/[0.02] border border-black/[0.06] p-2.5">{zugang.link}</p>
                <button
                  onClick={() => kopieren(zugang.link, 'zugang')}
                  className="mt-2.5 flex items-center gap-1.5 h-8 px-3 border border-black/15 text-[11px] tracking-[0.1em] uppercase text-black/60 hover:border-black hover:text-black bg-transparent"
                >
                  {kopiert === 'zugang' ? <Check size={12} /> : <KeyRound size={12} />}
                  {kopiert === 'zugang' ? 'Kopiert' : 'Link kopieren'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {form?._modus === 'neu' && (
        <form onSubmit={anlegen} className="border border-black/10 p-5 mb-8 space-y-4 max-w-xl">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-black/30 mb-3">Neuer Affiliate</p>
            <Feld label="E-Mail" required hint="Mehr wird nicht gebraucht. An diese Adresse geht die Einladung; Name, Anschrift, Steuer und Bankverbindung trägt der Affiliate danach selbst ein.">
              <input type="email" className={eingabe} value={form.email} required autoFocus onChange={e => setzen('email', e.target.value)} />
            </Feld>
          </div>
          <Feld label="Notiz (intern)" hint="Nur für die Verwaltung sichtbar.">
            <textarea rows={2} className={`${eingabe} resize-y`} value={form.note} onChange={e => setzen('note', e.target.value)} />
          </Feld>
          <div className="flex items-center gap-3 pt-1">
            <button type="submit" disabled={busy} className="h-9 px-5 bg-black text-white text-[11px] tracking-[0.14em] uppercase border-0 disabled:opacity-40">
              {busy ? 'Wird angelegt …' : 'Einladen'}
            </button>
            <p className="text-[11px] text-black/40">Der Code wird aus der Adresse abgeleitet und ist später änderbar.</p>
          </div>
        </form>
      )}

      {form?._modus === 'bearbeiten' && (
        <form onSubmit={anlegen} className="border border-black/10 p-5 mb-8 space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-black/60">{form.full_name || form.email} bearbeiten</p>
            <button type="button" onClick={() => setForm(null)} className="text-[11px] text-black/40 hover:text-black bg-transparent border-0">Schließen</button>
          </div>
          <section>
            <p className="text-[10px] uppercase tracking-[0.18em] text-black/30 mb-3">Person</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Feld label="Vor- und Nachname" required>
                <input
                  className={eingabe} value={form.full_name} required
                  onChange={e => {
                    const v = e.target.value
                    setForm(f => ({ ...f, full_name: v, code: f.code || codeVorschlag(v) }))
                  }}
                />
              </Feld>
              <Feld label="E-Mail" required hint="Zugleich die Anmeldung. Die Einladung geht an diese Adresse.">
                <input type="email" className={eingabe} value={form.email} required onChange={e => setzen('email', e.target.value)} />
              </Feld>
              <Feld label="Telefon">
                <input className={eingabe} value={form.phone} onChange={e => setzen('phone', e.target.value)} />
              </Feld>
              <Feld label="Geburtsdatum" hint="Laut Ausweis. Trennt Namensgleiche und gehört auf die Gutschrift.">
                <input type="date" className={eingabe} value={form.birth_date} onChange={e => setzen('birth_date', e.target.value)} />
              </Feld>
              <Feld label="Straße und Hausnummer" hint="Meldeanschrift laut Ausweis.">
                <input className={eingabe} value={form.street} onChange={e => setzen('street', e.target.value)} />
              </Feld>
              <div className="grid grid-cols-3 gap-3">
                <Feld label="PLZ"><input className={eingabe} value={form.postal_code} onChange={e => setzen('postal_code', e.target.value)} /></Feld>
                <Feld label="Ort"><input className={eingabe} value={form.city} onChange={e => setzen('city', e.target.value)} /></Feld>
                <Feld label="Land"><input className={eingabe} value={form.country} maxLength={2} onChange={e => setzen('country', e.target.value.toUpperCase())} /></Feld>
              </div>
            </div>
          </section>

          <section>
            <p className="text-[10px] uppercase tracking-[0.18em] text-black/30 mb-3">Steuer und Bank</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Feld label="Steuerlicher Status">
                <select className={eingabe} value={form.tax_status} onChange={e => setzen('tax_status', e.target.value)}>
                  <option value="small_business">Kleinunternehmer (§ 19 UStG)</option>
                  <option value="vat_liable">Umsatzsteuerpflichtig</option>
                </select>
              </Feld>
              <Feld label="Steuernummer" hint="Für die Gutschrift. Bei Kleinunternehmern genügt sie.">
                <input className={eingabe} value={form.tax_number} onChange={e => setzen('tax_number', e.target.value)} />
              </Feld>
              <Feld label="USt-IdNr." hint="Nur bei Umsatzsteuerpflicht.">
                <input className={eingabe} value={form.vat_id} onChange={e => setzen('vat_id', e.target.value)} />
              </Feld>
              <Feld label="IBAN" hint="Ohne IBAN und Kontoinhaber ist keine Auszahlung möglich.">
                <input className={eingabe} value={form.iban} onChange={e => setzen('iban', e.target.value.toUpperCase())} />
              </Feld>
              <Feld label="Kontoinhaber">
                <input className={eingabe} value={form.account_holder} placeholder={form.full_name} onChange={e => setzen('account_holder', e.target.value)} />
              </Feld>
            </div>
          </section>

          <section>
            <p className="text-[10px] uppercase tracking-[0.18em] text-black/30 mb-3">Code und Konditionen</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Feld label="Code" required hint="Steckt im Werbelink als ?ref= — Kleinbuchstaben, Ziffern, Bindestriche.">
                <input
                  className={eingabe} value={form.code} required minLength={3} maxLength={24}
                  onChange={e => setzen('code', codeVorschlag(e.target.value))}
                />
              </Feld>
              <Feld label="Vergütung" hint="Der Betrag je Paar ist der Topf: alles, was diese Vermittlung kosten darf.">
                <select className={eingabe} value={form.commission_type} onChange={e => setzen('commission_type', e.target.value)}>
                  <option value="fixed">Betrag je Paar</option>
                  <option value="percent">Prozent vom Kaufpreis</option>
                </select>
              </Feld>
              <Feld label={form.commission_type === 'fixed' ? 'Betrag je Paar (€)' : 'Prozentsatz (%)'}>
                <input type="number" step="0.5" min="0" className={eingabe} value={form.commission_value} onChange={e => setzen('commission_value', e.target.value)} />
              </Feld>
              {form.commission_type === 'fixed' ? (
                <Feld label="Üblich" hint="Setzt den Betrag je Paar. Frei änderbar.">
                  <div className="flex gap-1.5">
                    {BETRAG_VORSCHLAEGE.map(v => (
                      <button
                        key={v} type="button"
                        onClick={() => setzen('commission_value', v)}
                        className={`h-9 flex-1 text-[12px] border transition-colors ${
                          Number(form.commission_value) === v
                            ? 'bg-black text-white border-black'
                            : 'bg-white text-black/60 border-black/15 hover:border-black/40'
                        }`}
                      >
                        {v} €
                      </button>
                    ))}
                  </div>
                </Feld>
              ) : (
                <Feld label="Deckel je Paar (€)" hint="Was eine Vermittlung höchstens kostet — Auszahlung und Kundenvorteil zusammen.">
                  <input type="number" step="1" min="0" className={eingabe} value={form.cap_per_shoe} onChange={e => setzen('cap_per_shoe', e.target.value)} />
                </Feld>
              )}
              <Feld label="Was der Geworbene bekommt" hint="Zahlt der Affiliate aus seinem Topf. Sagt er nichts zu, bekommt er den vollen Betrag.">
                <select className={eingabe} value={form.customer_benefit} onChange={e => setzen('customer_benefit', e.target.value)}>
                  <option value="none">Nichts</option>
                  <option value="discount">Nachlass in Prozent</option>
                  <option value="gift">Zugabe zum ersten Paar</option>
                </select>
              </Feld>
              {form.customer_benefit === 'discount' && (
                <Feld label="Nachlass (%)" hint={`Wirkt im Konfigurator, ohne dass der Kunde etwas eingibt. Höchstens ${euro(topfVon(form, 340))} je Paar — mehr gibt der Topf nicht her.`}>
                  <input type="number" step="1" min="0" max="100" className={eingabe} value={form.customer_discount_pct} onChange={e => setzen('customer_discount_pct', e.target.value)} />
                </Feld>
              )}
              {form.customer_benefit === 'gift' && (
                <Feld label="Welche Zugabe" hint="Liegt dem ersten Paar bei. Einbehalten wird der Einkaufspreis aus dem Zubehör.">
                  <select className={eingabe} value={form.gift_key} onChange={e => setzen('gift_key', e.target.value)}>
                    {(zubehoer.length ? zubehoer : ZUGABE_RUECKFALL).map(z => (
                      <option key={z.key} value={z.key}>{z.name}</option>
                    ))}
                  </select>
                </Feld>
              )}
            </div>

            <Rechenbeispiel form={form} zubehoer={zubehoer} />
            <Feld label="Notiz (intern)">
              <textarea rows={2} className="w-full p-2.5 border border-black/15 text-[13px] outline-none focus:border-black/40 bg-white" value={form.note} onChange={e => setzen('note', e.target.value)} />
            </Feld>

            {/* Festgeschriebene Angaben. Der Affiliate pflegt seine Daten
                selbst — das ist richtig, er ist der Einzige, der sie sicher
                weiß. Sobald jemand die Anschrift gegen den Ausweis und die
                IBAN gegen den Kontoauszug geprüft hat, darf sich beides aber
                nicht mehr still ändern. */}
            {form.id && (
              <div className="mt-5 pt-4 border-t border-black/[0.08]">
                <p className="text-[10px] uppercase tracking-[0.14em] text-black/40 mb-1">Geprüft und festgeschrieben</p>
                <p className="text-[10px] text-black/35 mb-2.5 leading-relaxed max-w-xl">
                  Was Sie hier sperren, kann der Affiliate nicht mehr selbst ändern — er sieht
                  einen Hinweis und wird gebeten, sich zu melden. Sie selbst ändern es
                  weiterhin oben in dieser Maske.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SPERRBARE_FELDER.map(f => {
                    const zu = sperrliste(form).includes(f.key)
                    return (
                      <button
                        key={f.key} type="button"
                        onClick={() => setzen('locked_fields', JSON.stringify(
                          zu ? sperrliste(form).filter(x => x !== f.key) : [...sperrliste(form), f.key]
                        ))}
                        className={`flex items-center gap-1.5 h-8 px-2.5 text-[11px] border transition-colors ${
                          zu ? 'bg-black text-white border-black' : 'bg-white text-black/50 border-black/15 hover:border-black/40'
                        }`}
                      >
                        {zu ? <Lock size={11} strokeWidth={1.6} /> : <Unlock size={11} strokeWidth={1.4} />}
                        {f.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </section>

          <div className="flex items-center gap-3 pt-1">
            <button type="submit" disabled={busy} className="h-9 px-5 bg-black text-white text-[11px] tracking-[0.12em] uppercase border-0 disabled:opacity-30">
              {busy ? 'Wird angelegt…' : 'Anlegen und einladen'}
            </button>
            <p className="text-[10px] text-black/40">Es entsteht ein Affiliate-Konto samt Anmeldung. Die Einladung geht per E-Mail raus.</p>
          </div>
        </form>
      )}

      {laedt ? (
        <p className="text-[12px] text-black/35">Wird geladen…</p>
      ) : liste.length === 0 ? (
        <p className="text-[12px] text-black/35">Noch keine Affiliate angelegt.</p>
      ) : (
        <div className="border border-black/10">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-black/10 text-[10px] uppercase tracking-[0.12em] text-black/35">
                <th className="text-left font-normal p-2.5">Name</th>
                <th className="text-left font-normal p-2.5">Code</th>
                <th className="text-left font-normal p-2.5">Status</th>
                <th className="text-right font-normal p-2.5">Paare</th>
                <th className="text-right font-normal p-2.5">Umsatz</th>
                <th className="text-right font-normal p-2.5">Offen</th>
                <th className="text-right font-normal p-2.5">Rückgaben</th>
                <th className="text-left font-normal p-2.5">Link</th>
                <th className="text-right font-normal p-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {liste.map(a => {
                const link = `${APP_ORIGIN}/?ref=${a.code}`
                return (
                  <tr key={a.id} className="border-b border-black/5 last:border-0">
                    <td className="p-2.5">
                      <span className="text-black/80">{a.full_name || <span className="text-black/30 italic">trägt Daten noch ein</span>}</span>
                      <span className="block text-[10px] text-black/35">{a.email}</span>
                    </td>
                    <td className="p-2.5 tabular-nums text-black/60">
                      {a.code}
                      {/* Die Konditionen gehören neben den Code: Ohne sie lässt
                          sich eine Zeile in der Liste nicht beurteilen — man
                          müsste jeden Eintrag einzeln aufklappen. */}
                      <span className="block text-[10px] text-black/35">{konditionenText(a)}</span>
                    </td>
                    <td className="p-2.5">
                      <span className={`text-[10px] uppercase tracking-wider ${a.status === 'active' ? 'text-black/60' : 'text-black/30'}`}>{a.status}</span>
                      {a.payout_blocked && (
                        <span className="block text-[10px] text-black/40" title="Steuerangaben oder Bankverbindung fehlen">Auszahlung gesperrt</span>
                      )}
                    </td>
                    <td className="p-2.5 text-right tabular-nums">{a.pairs_total}</td>
                    <td className="p-2.5 text-right tabular-nums">{euro(a.revenue)}</td>
                    <td className="p-2.5 text-right tabular-nums">{euro(a.open_amount)}</td>
                    <td className="p-2.5 text-right tabular-nums">{a.return_rate} %</td>
                    <td className="p-2.5">
                      <button onClick={() => kopieren(link, a.id)} className="flex items-center gap-1.5 text-[11px] text-black/50 hover:text-black bg-transparent border-0 p-0">
                        {kopiert === a.id ? <Check size={11} /> : <Link2 size={11} />}
                        {kopiert === a.id ? 'kopiert' : 'kopieren'}
                      </button>
                    </td>
                    <td className="p-2.5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {/* Die Einladung zum Weitergeben — unabhängig davon,
                            ob je eine Mail hinausging. Sie ist der Weg; die
                            Mail war nur eine Zustellart davon. */}
                        <button
                          onClick={() => einladungHolen(a)}
                          className="text-[11px] text-black/50 hover:text-black bg-transparent border-0 p-0"
                        >
                          Einladung
                        </button>
                        {/* Zugang zurücksetzen — ein Affiliate bekommt keine
                            Mail von uns; der QR-Code ist sein Weg zurück. */}
                        {a.user_id ? (
                          <button
                            onClick={() => zugangFreigeben(a)}
                            title="Anmeldung zurücksetzen (Link + QR)"
                            className="text-[11px] text-black/50 hover:text-black bg-transparent border-0 p-0"
                          >
                            Zugang
                          </button>
                        ) : null}
                        <button
                          onClick={() => { setForm(zumFormular(a)); setHinweis(null); setFehler(null) }}
                          className="text-[11px] text-black/50 hover:text-black bg-transparent border-0 p-0"
                        >
                          bearbeiten
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-start gap-2 mt-6 text-[11px] text-black/40 leading-relaxed">
        <Percent size={12} className="mt-0.5 shrink-0" />
        <p>
          Die Provision reift mit der Bestellung: angelegt bei Bestellung, bestätigt bei
          Zustellung, auszahlbar nach der Schutzfrist. Ausgezahlt wird in Fünferschritten.
        </p>
      </div>
      <div className="flex items-start gap-2 mt-2 text-[11px] text-black/40 leading-relaxed">
        <Gift size={12} className="mt-0.5 shrink-0" />
        <p>
          Zugabe und Nachlass sind ein Entweder-oder, und beides zahlt der Affiliate
          aus seinem Topf: Der Betrag je Paar ist alles, was eine Vermittlung kosten
          darf. Sagt er dem Kunden nichts zu, bekommt er ihn ganz.
        </p>
      </div>
    </div>
  )
}
