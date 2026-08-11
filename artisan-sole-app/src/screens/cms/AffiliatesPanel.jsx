/**
 * AffiliatesPanel — Affiliate anlegen und verwalten.
 *
 * Ein Affiliate ist eine Person, kein Firmenkonto. Erhoben wird deshalb, was
 * eine Abrechnung mit einer Privatperson braucht:
 *
 *   Pflicht    Name, E-Mail, Code — ohne die geht nichts.
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
import { Users, Plus, Copy, Check, X, Mail, AlertTriangle, Link2, Percent, Gift } from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'

const APP_ORIGIN = (import.meta.env.VITE_API_URL ?? '') || (typeof window !== 'undefined' ? window.location.origin : '')

const leeresFormular = {
  full_name: '', email: '', phone: '', code: '',
  street: '', postal_code: '', city: '', country: 'DE', birth_date: '',
  tax_status: 'small_business', tax_number: '', vat_id: '',
  iban: '', account_holder: '',
  commission_type: 'percent', commission_value: 10, cap_per_shoe: 40,
  gift_shoetree: false, customer_discount_pct: 0,
  note: '',
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

export default function AffiliatesPanel() {
  const [liste, setListe] = useState([])
  const [laedt, setLaedt] = useState(true)
  const [form, setForm] = useState(null)      // null = geschlossen
  const [busy, setBusy] = useState(false)
  const [fehler, setFehler] = useState(null)
  const [hinweis, setHinweis] = useState(null)
  const [kopiert, setKopiert] = useState(null)

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

  const kopieren = async (text, id) => {
    try { await navigator.clipboard.writeText(text); setKopiert(id); setTimeout(() => setKopiert(null), 1600) } catch { /* ohne Zwischenablage */ }
  }

  const anlegen = async (e) => {
    e.preventDefault()
    setBusy(true); setFehler(null); setHinweis(null)
    try {
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
          onClick={() => setForm(form ? null : { ...leeresFormular })}
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

      {form && (
        <form onSubmit={anlegen} className="border border-black/10 p-5 mb-8 space-y-6">
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
              <Feld label="Vergütung">
                <select className={eingabe} value={form.commission_type} onChange={e => setzen('commission_type', e.target.value)}>
                  <option value="percent">Prozent vom Kaufpreis</option>
                  <option value="fixed">Fester Betrag je Paar</option>
                </select>
              </Feld>
              <Feld label={form.commission_type === 'fixed' ? 'Betrag je Paar (€)' : 'Prozentsatz (%)'}>
                <input type="number" step="0.5" min="0" className={eingabe} value={form.commission_value} onChange={e => setzen('commission_value', e.target.value)} />
              </Feld>
              <Feld label="Deckel je Paar (€)" hint="Obergrenze der Provision, unabhängig vom Kaufpreis.">
                <input type="number" step="1" min="0" className={eingabe} value={form.cap_per_shoe} onChange={e => setzen('cap_per_shoe', e.target.value)} />
              </Feld>
              <Feld label="Nachlass für den Geworbenen (%)" hint="Was der Kunde über den Link erhält. Wirkt im Konfigurator, ohne dass er etwas eingibt.">
                <input type="number" step="1" min="0" max="100" className={eingabe} value={form.customer_discount_pct} onChange={e => setzen('customer_discount_pct', e.target.value)} />
              </Feld>
              <label className="flex items-center gap-2 mt-6">
                <input type="checkbox" checked={form.gift_shoetree} onChange={e => setzen('gift_shoetree', e.target.checked)} />
                <span className="text-[12px] text-black/70">Zedernholz-Schuhspanner als Zugabe</span>
              </label>
            </div>
            <Feld label="Notiz (intern)">
              <textarea rows={2} className="w-full p-2.5 border border-black/15 text-[13px] outline-none focus:border-black/40 bg-white" value={form.note} onChange={e => setzen('note', e.target.value)} />
            </Feld>
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
              </tr>
            </thead>
            <tbody>
              {liste.map(a => {
                const link = `${APP_ORIGIN}/?ref=${a.code}`
                return (
                  <tr key={a.id} className="border-b border-black/5 last:border-0">
                    <td className="p-2.5">
                      <span className="text-black/80">{a.full_name}</span>
                      <span className="block text-[10px] text-black/35">{a.email}</span>
                    </td>
                    <td className="p-2.5 tabular-nums text-black/60">{a.code}</td>
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
          Zugabe und Nachlass sind zweierlei: Die Zugabe wird dem Affiliate vom Honorar
          abgezogen, der Nachlass geht zulasten des Hauses.
        </p>
      </div>
    </div>
  )
}
