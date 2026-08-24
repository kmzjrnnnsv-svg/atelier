/**
 * RechnungsAngaben.jsx — wer die Rechnung stellt.
 *
 * Die Rechnung selbst entsteht seit Neuestem von allein, sobald eine Zahlung
 * verbucht ist. Was der Server dafür nicht wissen kann, steht hier: Name,
 * Anschrift, Steuernummer — und die eine Entscheidung, die keine
 * Formalität ist.
 *
 * ── Zur Kleinunternehmerregelung ─────────────────────────────────────────
 *
 * Voreingestellt ist „kein Steuerausweis". Das ist die vorsichtige Annahme:
 * Wer Umsatzsteuer ausweist, ohne sie zu schulden, schuldet sie trotzdem
 * (§ 14c Abs. 2 UStG) — er zahlt sie also aus eigener Tasche. Andersherum
 * lässt sich eine Rechnung nachbessern. Deshalb ist das Umstellen eine
 * bewusste Handlung und kein Häkchen, das man übersieht.
 *
 * Die Steuernummer verlangt das Gesetz in beiden Fällen (§ 14 Abs. 4 Nr. 2).
 * Auch der Kleinunternehmer, der keine Steuer ausweist, muss sie auf den
 * Beleg setzen — das wird regelmäßig übersehen, deshalb weist der Server das
 * Speichern ohne sie ab.
 */
import { useState, useEffect } from 'react'
import { FileText, CheckCircle2, AlertTriangle, Info } from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'
import MFAModal from '../../components/MFAModal'

const LEER = {
  firma_name: '', firma_strasse: '', firma_ort: '', firma_land: 'Deutschland',
  firma_email: '', firma_telefon: '', firma_ust_id: '', firma_steuernummer: '',
  firma_kleinunternehmer: '1', ust_satz: '19',
}

export default function RechnungsAngaben() {
  const [form, setForm] = useState(LEER)
  const [fehlend, setFehlend] = useState([])
  const [laed, setLaed] = useState(true)
  const [speichert, setSpeichert] = useState(false)
  const [meldung, setMeldung] = useState(null)
  const [mfaOffen, setMfaOffen] = useState(false)
  const [mfaFehler, setMfaFehler] = useState(null)

  useEffect(() => { laden() }, [])

  async function laden() {
    setLaed(true)
    try {
      const { fehlend: f, ...werte } = await apiFetch('/api/settings/firma')
      setForm({ ...LEER, ...werte })
      setFehlend(f || [])
    } catch { /* leere Maske ist ein brauchbarer Ausgangspunkt */ }
    finally { setLaed(false) }
  }

  const f = (feld, wert) => { setForm(p => ({ ...p, [feld]: wert })); setMeldung(null) }
  const klein = String(form.firma_kleinunternehmer) === '1'

  async function speichern(code) {
    setSpeichert(true); setMfaFehler(null)
    try {
      // `message` wird bewusst herausgelöst und verworfen: Die Antwort trägt
      // sie mit, aber die Maske sagt es unten in eigenen Worten — sonst
      // landete der Serversatz zwischen den Formularfeldern.
      const { fehlend: neu, message: _quittung, ...werte } = await apiFetch('/api/settings/firma', {
        method: 'PUT',
        headers: { 'X-MFA-Code': code },
        body: JSON.stringify(form),
      })
      setMfaOffen(false)
      setForm({ ...LEER, ...werte })
      setFehlend(neu || [])
      setMeldung({ art: 'ok', text: 'Gespeichert. Neue Rechnungen tragen diese Angaben.' })
    } catch (e) {
      if (e?.code === 'MFA_INVALID') { setMfaFehler(e.error); return }
      setMfaOffen(false)
      setMeldung({
        art: 'fehler',
        text: e?.code === 'MFA_NOT_SETUP'
          ? 'Für diese Änderung ist ein zweiter Faktor nötig. Sie richten ihn unter MFA-Sicherheit ein.'
          : (e?.error || 'Speichern fehlgeschlagen.'),
      })
    } finally { setSpeichert(false) }
  }

  const inp = 'w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15'
  const lbl = 'text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light'

  if (laed) {
    return (
      <div className="flex items-center gap-3 text-black/30">
        <div className="w-5 h-5 border border-black/10 border-t-black/40 animate-spin rounded-full" /> Laden…
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '680px' }}>
      <div className="mb-8">
        <p className="text-[9px] text-black/20 uppercase tracking-[0.3em] mb-3 font-light">Administration</p>
        <h1 className="text-[28px] font-extralight text-black/85 tracking-tight">Rechnungsangaben</h1>
        <p className="text-[13px] text-black/35 mt-2 font-light leading-relaxed">
          Diese Angaben stehen auf jeder Rechnung und auf jeder Gutschrift an
          Ihre Vermittler. Änderungen wirken auf Belege, die danach entstehen,
          bereits ausgestellte bleiben, wie sie sind.
        </p>
      </div>

      {/* Der Stand zuerst. Wer diese Seite aufruft, will wissen, ob es passt. */}
      {fehlend.length > 0 ? (
        <div className="flex items-start gap-2.5 px-5 py-4 mb-6 bg-amber-50 border border-amber-200">
          <AlertTriangle size={14} className="text-amber-700 flex-shrink-0 mt-0.5" strokeWidth={1.4} />
          <div>
            <p className="text-[12px] font-normal text-amber-900">
              Ihre Rechnungen sind noch nicht vollständig.
            </p>
            <p className="text-[11px] text-amber-800 font-light mt-1 leading-relaxed">
              Es fehlt: {fehlend.map(x => x.text).join(', ')}. § 14 Abs. 4 UStG
              verlangt diese Angaben. Ausgestellt werden Rechnungen trotzdem,
              eine Nummer darf nicht warten, aber ein Firmenkunde kann daraus
              keine Vorsteuer ziehen und wird sie zurückschicken.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2.5 px-5 py-3.5 mb-6 bg-white border border-black/[0.06]">
          <CheckCircle2 size={13} className="text-black/40 flex-shrink-0 mt-0.5" strokeWidth={1.25} />
          <p className="text-[12px] font-light text-black/50">
            Die Pflichtangaben sind vollständig.
          </p>
        </div>
      )}

      {meldung && (
        <div className={`flex items-start gap-2.5 px-5 py-3.5 mb-6 border ${
          meldung.art === 'ok' ? 'bg-white border-black/[0.06]' : 'bg-red-50 border-red-200'
        }`}>
          {meldung.art === 'ok'
            ? <CheckCircle2 size={13} className="text-black/40 flex-shrink-0 mt-0.5" strokeWidth={1.25} />
            : <AlertTriangle size={13} className="text-red-700 flex-shrink-0 mt-0.5" strokeWidth={1.25} />}
          <p className={`text-[12px] font-light ${meldung.art === 'ok' ? 'text-black/50' : 'text-red-800'}`}>
            {meldung.text}
          </p>
        </div>
      )}

      {/* ── Aussteller ─────────────────────────────────────────────────── */}
      <div className="bg-white p-7 space-y-5 mb-5">
        <p className="text-[9px] text-black/25 uppercase tracking-[0.25em] font-light">Aussteller</p>

        <div>
          <label className={lbl}>Name des Unternehmens</label>
          <input className={inp} placeholder="Artisan Sole GmbH"
                 value={form.firma_name} onChange={e => f('firma_name', e.target.value)} />
        </div>
        <div>
          <label className={lbl}>Straße und Hausnummer</label>
          <input className={inp} placeholder="Musterweg 7"
                 value={form.firma_strasse} onChange={e => f('firma_strasse', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className={lbl}>Postleitzahl und Ort</label>
            <input className={inp} placeholder="10115 Berlin"
                   value={form.firma_ort} onChange={e => f('firma_ort', e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Land</label>
            <input className={inp} placeholder="Deutschland"
                   value={form.firma_land} onChange={e => f('firma_land', e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className={lbl}>E-Mail auf dem Beleg</label>
            <input className={inp} placeholder="kontakt@artisansole.com"
                   value={form.firma_email} onChange={e => f('firma_email', e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Telefon</label>
            <input className={inp} placeholder="+49 …"
                   value={form.firma_telefon} onChange={e => f('firma_telefon', e.target.value)} />
          </div>
        </div>
      </div>

      {/* ── Steuer ─────────────────────────────────────────────────────── */}
      <div className="bg-white p-7 space-y-5">
        <p className="text-[9px] text-black/25 uppercase tracking-[0.25em] font-light">Steuer</p>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className={lbl}>Steuernummer</label>
            <input className={inp} placeholder="12/345/67890"
                   value={form.firma_steuernummer} onChange={e => f('firma_steuernummer', e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Umsatzsteuer-IdNr.</label>
            <input className={inp} placeholder="DE123456789"
                   value={form.firma_ust_id} onChange={e => f('firma_ust_id', e.target.value)} />
          </div>
        </div>
        <p className="text-[11px] text-black/30 font-light leading-relaxed -mt-1">
          Eine von beiden muss auf jede Rechnung, auch dann, wenn Sie keine
          Umsatzsteuer ausweisen.
        </p>

        {/* Die eine Entscheidung, die keine Formalität ist. */}
        <div className="pt-2">
          <label className={lbl}>Umsatzsteuer</label>
          <div className="flex flex-col gap-2 mt-2">
            {[
              {
                wert: '1',
                titel: 'Kleinunternehmer nach § 19 UStG',
                text: 'Auf der Rechnung steht der Bruttobetrag und der Hinweis, dass keine Umsatzsteuer berechnet wird.',
              },
              {
                wert: '0',
                titel: 'Umsatzsteuer ausweisen',
                text: 'Die Rechnung weist Netto, Steuer und Brutto getrennt aus.',
              },
            ].map(o => (
              <label key={o.wert}
                     className={`flex items-start gap-3 px-4 py-3.5 border cursor-pointer transition-all ${
                       String(form.firma_kleinunternehmer) === o.wert
                         ? 'border-black/50 bg-black/[0.02]' : 'border-black/10'
                     }`}>
                <input
                  type="radio" name="kleinunternehmer" value={o.wert}
                  checked={String(form.firma_kleinunternehmer) === o.wert}
                  onChange={() => f('firma_kleinunternehmer', o.wert)}
                  className="mt-0.5 accent-black"
                />
                <span>
                  <span className="text-[13px] text-black/75 font-light block">{o.titel}</span>
                  <span className="text-[11px] text-black/35 font-light block mt-0.5 leading-relaxed">{o.text}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {!klein && (
          <div>
            <label className={lbl}>Steuersatz in Prozent</label>
            <input className={inp} type="number" step="0.1" min="0" max="100" placeholder="19"
                   value={form.ust_satz} onChange={e => f('ust_satz', e.target.value)} />
            <p className="text-[11px] text-black/30 font-light mt-1.5 leading-relaxed">
              Der Preis im Laden gilt als Bruttopreis. Netto und Steuer werden
              daraus herausgerechnet, die Kunden zahlen also weiterhin, was
              ausgezeichnet ist.
            </p>
          </div>
        )}

        {klein && (
          <div className="flex items-start gap-2.5 px-4 py-3 bg-black/[0.02] border border-black/[0.06]">
            <Info size={13} className="text-black/30 flex-shrink-0 mt-0.5" strokeWidth={1.4} />
            <p className="text-[11px] text-black/40 font-light leading-relaxed">
              Stellen Sie dies erst um, wenn Sie tatsächlich umsatzsteuerpflichtig
              sind. Wer Steuer ausweist, ohne sie zu schulden, schuldet sie
              trotzdem (§ 14c Abs. 2 UStG) und zahlt sie aus eigener Tasche.
            </p>
          </div>
        )}

        {/* Was eine Umstellung NICHT tut. Ohne diesen Satz ist die
            naheliegende Annahme, alle Rechnungen richteten sich nach der
            Einstellung — und wer das glaubt, stellt einmal um und wundert
            sich, dass der Steuerberater die Belege des Vorjahres
            unverändert vorfindet. Das ist der Sinn der Sache, nicht ein
            Versehen. */}
        <div className="flex items-start gap-2.5 px-4 py-3 bg-black/[0.02] border border-black/[0.06]">
          <Info size={13} className="text-black/30 flex-shrink-0 mt-0.5" strokeWidth={1.4} />
          <p className="text-[11px] text-black/40 font-light leading-relaxed">
            Eine Umstellung wirkt nur nach vorn. Was bei der Ausstellung galt,
            steht an der Bestellung und bleibt dort: Bereits ausgestellte
            Rechnungen ändern sich nicht, auch nicht beim erneuten Abruf. Eine
            Rechnung, die sich nachträglich ändert, wäre keine.
          </p>
        </div>
      </div>

      <button
        onClick={() => { setMfaFehler(null); setMfaOffen(true) }}
        disabled={speichert}
        className="mt-8 px-8 h-11 border border-black text-black text-[11px] bg-transparent hover:bg-black hover:text-white transition-all duration-300 uppercase tracking-[0.2em] font-light disabled:opacity-30 flex items-center gap-2"
      >
        {speichert ? <div className="w-4 h-4 border border-black/20 border-t-black/60 animate-spin rounded-full" /> : <FileText size={13} strokeWidth={1.4} />}
        Speichern (MFA)
      </button>

      <MFAModal
        open={mfaOffen}
        title="Rechnungsangaben speichern"
        onClose={() => setMfaOffen(false)}
        onConfirm={speichern}
        loading={speichert}
        error={mfaFehler}
      />
    </div>
  )
}
