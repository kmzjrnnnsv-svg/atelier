/**
 * AffiliateStammdaten — was der Affiliate über sich selbst einträgt.
 *
 * Beim Anlegen kennt das Haus nur die E-Mail. Anschrift, Geburtsdatum,
 * Steuerstatus und Bankverbindung stehen hier, eingetragen von dem, der sie
 * kennt. Vorher tippte die Verwaltung sie ab — die Gutschrift lief dann auf
 * Angaben, die niemand geprüft hatte, und eine falsche IBAN fiel erst bei der
 * Auszahlung auf.
 *
 * Konditionen und Code stehen bewusst nicht zur Auswahl: Das sind Zusagen des
 * Hauses, keine Selbstauskunft. Sie werden weiter oben im Portal angezeigt.
 *
 * Solange etwas für die Auszahlung Nötiges fehlt, steht der Block offen und
 * sagt, was fehlt. Wer fertig ist, klappt ihn zu und sieht ihn nur noch als
 * Zeile.
 */
import { useState } from 'react'
import { ChevronDown, ChevronUp, Check, AlertTriangle, Lock } from 'lucide-react'
import { apiFetch } from '../hooks/useApi'

const eingabe = 'w-full border border-black/12 px-3 py-2.5 text-[13px] outline-none focus:border-black/40 bg-white'
const gesperrtStil = 'w-full border border-black/[0.06] bg-black/[0.03] px-3 py-2.5 text-[13px] text-black/50'
const beschriftung = 'block text-[10px] uppercase tracking-[0.14em] text-black/40 mb-1'

/**
 * Ein Feld — oder, wenn die Verwaltung es festgeschrieben hat, der Wert zum
 * Ablesen mit Schloss.
 *
 * Ein gesperrtes Feld auszugrauen und stumm zu lassen wäre die schlechtere
 * Wahl: Wer hineintippt und nichts geschieht, hält es für kaputt. Hier steht,
 * dass es geprüft wurde und wie man es ändert.
 */
function Feld({ label, hinweis, children, gesperrt, wert }) {
  if (gesperrt) {
    return (
      <div className="block">
        <span className={`${beschriftung} flex items-center gap-1.5`}>
          {label}
          <Lock size={10} strokeWidth={1.6} className="text-black/30" />
        </span>
        <p className={gesperrtStil}>{wert || <span className="text-black/25">—</span>}</p>
        <span className="block text-[10px] text-black/30 mt-1 leading-relaxed">
          Von uns geprüft und festgeschrieben. Hat sich etwas geändert? Schreiben Sie uns kurz,
          wir tragen es nach.
        </span>
      </div>
    )
  }
  return (
    <label className="block">
      <span className={beschriftung}>{label}</span>
      {children}
      {hinweis && <span className="block text-[10px] text-black/30 mt-1 leading-relaxed">{hinweis}</span>}
    </label>
  )
}

/** Welche Felder die Verwaltung festgeschrieben hat. */
function gesperrteFelder(a) {
  try { const l = JSON.parse(a?.locked_fields || '[]'); return Array.isArray(l) ? l : [] }
  catch { return [] }
}

/** Was für eine Auszahlung vorliegen muss. */
function fehlendeAngaben(a) {
  return [
    !a?.full_name && 'Name',
    !a?.street && 'Anschrift',
    !a?.city && 'Ort',
    !a?.iban && 'IBAN',
    !a?.account_holder && 'Kontoinhaber',
    !a?.tax_number && a?.tax_status === 'small_business' && 'Steuernummer',
    !a?.vat_id && a?.tax_status === 'vat_liable' && 'USt-IdNr.',
  ].filter(Boolean)
}

export default function AffiliateStammdaten({ affiliate, onGespeichert }) {
  const fehlt = fehlendeAngaben(affiliate)
  const zu = gesperrteFelder(affiliate)
  const istZu = (k) => zu.includes(k)
  const [offen, setOffen] = useState(fehlt.length > 0)
  const [form, setForm] = useState({
    full_name: affiliate?.full_name || '',
    phone: affiliate?.phone || '',
    street: affiliate?.street || '',
    postal_code: affiliate?.postal_code || '',
    city: affiliate?.city || '',
    country: affiliate?.country || 'DE',
    birth_date: affiliate?.birth_date || '',
    tax_status: affiliate?.tax_status || 'small_business',
    tax_number: affiliate?.tax_number || '',
    vat_id: affiliate?.vat_id || '',
    iban: affiliate?.iban || '',
    account_holder: affiliate?.account_holder || '',
  })
  const [speichert, setSpeichert] = useState(false)
  const [fehler, setFehler] = useState(null)
  const [gespeichert, setGespeichert] = useState(false)

  const setzen = (k, v) => { setForm(f => ({ ...f, [k]: v })); setGespeichert(false) }

  const speichern = async (e) => {
    e.preventDefault()
    if (speichert) return
    setSpeichert(true); setFehler(null)
    try {
      const neu = await apiFetch('/api/affiliates/me', {
        method: 'PATCH',
        body: JSON.stringify({ ...form, terms_accepted: true }),
      })
      setGespeichert(true)
      onGespeichert?.(neu)
    } catch (e) {
      setFehler(e?.error || 'Die Angaben konnten nicht gespeichert werden.')
    } finally { setSpeichert(false) }
  }

  return (
    <section className="border border-black/[0.08] bg-white mb-8">
      <button
        onClick={() => setOffen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 bg-transparent border-0 text-left"
      >
        <div className="min-w-0">
          <p className="text-[12px] uppercase tracking-[0.16em] text-black/70">Ihre Daten</p>
          <p className="text-[11px] text-black/40 font-light mt-0.5">
            {fehlt.length
              ? `Für die Auszahlung fehlt noch: ${fehlt.join(', ')}.`
              : 'Vollständig. Änderungen jederzeit möglich.'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {fehlt.length
            ? <AlertTriangle size={15} strokeWidth={1.5} className="text-black/40" />
            : <Check size={15} strokeWidth={1.6} className="text-black/40" />}
          {offen ? <ChevronUp size={16} strokeWidth={1.4} className="text-black/30" />
                 : <ChevronDown size={16} strokeWidth={1.4} className="text-black/30" />}
        </div>
      </button>

      {offen && (
        <form onSubmit={speichern} className="px-5 pb-5 space-y-5 border-t border-black/[0.06] pt-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Feld label="Vor- und Nachname" hinweis="Laut Ausweis — er steht auf der Gutschrift." gesperrt={istZu('full_name')} wert={form.full_name}>
              <input className={eingabe} value={form.full_name} onChange={e => setzen('full_name', e.target.value)} />
            </Feld>
            <Feld label="Telefon">
              <input className={eingabe} value={form.phone} onChange={e => setzen('phone', e.target.value)} />
            </Feld>
            <Feld label="Straße und Hausnummer" gesperrt={istZu('street')} wert={form.street}>
              <input className={eingabe} value={form.street} onChange={e => setzen('street', e.target.value)} />
            </Feld>
            <div className="grid grid-cols-3 gap-2">
              <Feld label="PLZ" gesperrt={istZu('postal_code')} wert={form.postal_code}><input className={eingabe} value={form.postal_code} onChange={e => setzen('postal_code', e.target.value)} /></Feld>
              <Feld label="Ort" gesperrt={istZu('city')} wert={form.city}><input className={eingabe} value={form.city} onChange={e => setzen('city', e.target.value)} /></Feld>
              <Feld label="Land"><input className={eingabe} maxLength={2} value={form.country} onChange={e => setzen('country', e.target.value.toUpperCase())} /></Feld>
            </div>
            <Feld label="Geburtsdatum" hinweis="Trennt Namensgleiche." gesperrt={istZu('birth_date')} wert={form.birth_date}>
              <input type="date" className={eingabe} value={form.birth_date || ''} onChange={e => setzen('birth_date', e.target.value)} />
            </Feld>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Feld label="Steuerlicher Status">
              <select className={eingabe} value={form.tax_status} onChange={e => setzen('tax_status', e.target.value)}>
                <option value="small_business">Kleinunternehmer (§ 19 UStG)</option>
                <option value="vat_liable">Umsatzsteuerpflichtig</option>
              </select>
            </Feld>
            {form.tax_status === 'vat_liable' ? (
              <Feld label="USt-IdNr." hinweis="Sie weisen Umsatzsteuer aus, deshalb gehört sie auf die Gutschrift." gesperrt={istZu('vat_id')} wert={form.vat_id}>
                <input className={eingabe} value={form.vat_id} onChange={e => setzen('vat_id', e.target.value)} />
              </Feld>
            ) : (
              <Feld label="Steuernummer" hinweis="Als Kleinunternehmer genügt sie." gesperrt={istZu('tax_number')} wert={form.tax_number}>
                <input className={eingabe} value={form.tax_number} onChange={e => setzen('tax_number', e.target.value)} />
              </Feld>
            )}
            <Feld label="IBAN" hinweis="Ohne IBAN und Kontoinhaber können wir nicht auszahlen." gesperrt={istZu('iban')} wert={form.iban}>
              <input className={eingabe} value={form.iban} onChange={e => setzen('iban', e.target.value.toUpperCase().replace(/\s+/g, ''))} />
            </Feld>
            <Feld label="Kontoinhaber" gesperrt={istZu('account_holder')} wert={form.account_holder}>
              <input className={eingabe} value={form.account_holder} placeholder={form.full_name} onChange={e => setzen('account_holder', e.target.value)} />
            </Feld>
          </div>

          {fehler && <p className="text-[12px] text-red-600/80">{fehler}</p>}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={speichert}
              className="h-10 px-6 bg-black text-white border-0 disabled:opacity-40"
              style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase' }}
            >
              {speichert ? 'Wird gespeichert …' : 'Speichern'}
            </button>
            {gespeichert && (
              <span className="flex items-center gap-1.5 text-[11px] text-black/50">
                <Check size={13} strokeWidth={1.6} /> Gespeichert
              </span>
            )}
          </div>
          <p className="text-[10px] text-black/30 leading-relaxed">
            Ihre Konditionen und Ihr Code werden vom Haus vergeben und stehen oben in Ihrem Bereich.
            Stimmt daran etwas nicht, schreiben Sie uns über „Nachrichten".
          </p>
        </form>
      )}
    </section>
  )
}
