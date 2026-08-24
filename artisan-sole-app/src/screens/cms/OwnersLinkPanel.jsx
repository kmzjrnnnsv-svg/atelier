/**
 * OwnersLinkPanel — der Bestelllink des Inhabers.
 *
 * ── Warum dieser Bereich neben den Affiliates steht und nicht darin ──────
 *
 * Weil er das Gegenteil tut. Ein Affiliate vermittelt: Er bekommt Provision,
 * sein Kunde einen Prozentsatz vom Katalogpreis, und sein Link gilt beliebig
 * oft. Dieser Link verkauft: keine Provision, keine Prozente, sondern
 * Festpreise, die der Inhaber setzt, und genau ein Paar je Link.
 *
 * Als Reiter innerhalb der Affiliates gelesen, hätte jeder die falsche
 * Erwartung mitgebracht — und beim ersten „wo trage ich die Provision ein"
 * wäre klar geworden, dass die Einordnung nicht stimmt.
 *
 * ── Die drei Dinge, die diese Seite können muss ──────────────────────────
 *
 *  1. Den gültigen Link zeigen und zum Kopieren anbieten. Er ist der Zweck
 *     der Seite; alles andere ist Beiwerk.
 *  2. Die Preise setzen. Ein leeres Feld heißt „Katalogpreis", nicht
 *     „kostenlos" — das steht auch so daneben, weil der Unterschied teuer ist.
 *  3. Zeigen, was verkauft wurde. Ein Link, der stirbt, ohne dass irgendwo
 *     stünde warum, ist ein Rätsel für den Inhaber.
 */
import { useState, useEffect } from 'react'
import { KeyRound, Copy, Check, RefreshCw, AlertTriangle, ShoppingBag } from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'

const APP_ORIGIN = (typeof window !== 'undefined' ? window.location.origin : '')

const euro = (n) => `€ ${Number(n || 0).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
const zahlAus = (v) => {
  const n = parseFloat(String(v ?? '').replace(/[^0-9.,]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export default function OwnersLinkPanel() {
  const [daten, setDaten]     = useState(null)
  const [laedt, setLaedt]     = useState(true)
  const [fehler, setFehler]   = useState(null)
  const [kopiert, setKopiert] = useState(false)
  const [preise, setPreise]   = useState({})   // { shoe_id: '890' | '' }
  const [speichert, setSpeichert] = useState(false)
  const [gemeldet, setGemeldet]   = useState('')

  const laden = async () => {
    setLaedt(true)
    try {
      const d = await apiFetch('/api/owner-links')
      setDaten(d)
      setPreise(Object.fromEntries((d.modelle || []).map(m => [m.id, m.owner_preis != null ? String(m.owner_preis) : ''])))
      setFehler(null)
    } catch (e) {
      setFehler(e?.message || 'Der Bereich lässt sich gerade nicht laden.')
    } finally { setLaedt(false) }
  }
  useEffect(() => { laden() }, [])

  const adresse = daten?.aktiv ? `${APP_ORIGIN}/collection?owner=${daten.aktiv.code}` : ''

  const kopieren = async () => {
    try {
      await navigator.clipboard.writeText(adresse)
      setKopiert(true); setTimeout(() => setKopiert(false), 1800)
    } catch { /* ohne Zwischenablage bleibt der Text zum Markieren stehen */ }
  }

  const neuErzeugen = async () => {
    if (!confirm('Der bisherige Link wird ungültig und lässt sich nicht wiederherstellen. Neuen Link erzeugen?')) return
    try { await apiFetch('/api/owner-links/neu', { method: 'POST' }); await laden() }
    catch (e) { setFehler(e?.message || 'Der Link ließ sich nicht ersetzen.') }
  }

  const speichern = async () => {
    setSpeichert(true); setGemeldet('')
    try {
      const liste = Object.entries(preise).map(([shoe_id, price]) => ({ shoe_id: Number(shoe_id), price }))
      const r = await apiFetch('/api/owner-links/preise', { method: 'PUT', body: JSON.stringify({ preise: liste }) })
      setGemeldet(`${r.gesetzt} Modell(e) mit Festpreis, ${r.entfernt} zurück auf Katalogpreis.`)
      await laden()
    } catch (e) {
      setFehler(e?.message || 'Die Preise ließen sich nicht speichern.')
    } finally { setSpeichert(false) }
  }

  const lbl = 'text-[9px] uppercase tracking-[0.15em] text-black/40 font-medium'
  const modelle = daten?.modelle || []
  const mitPreis = modelle.filter(m => String(preise[m.id] ?? '').trim() !== '').length

  if (laedt) return <div className="p-8 text-[12px] text-black/40 font-light">Wird geladen…</div>

  return (
    <div className="p-6 lg:p-8 max-w-4xl space-y-8">

      <div>
        <div className="flex items-center gap-2.5 mb-1.5">
          <KeyRound size={16} strokeWidth={1.4} className="text-black/50" />
          <h1 className="text-[17px] font-light text-black tracking-tight">Owners Link</h1>
        </div>
        {/* Der Satz, der die Verwechslung mit einem Affiliate verhindert. Er
            steht ganz oben, weil er sonst zu spät käme. */}
        <p className="text-[12px] text-black/45 font-light leading-relaxed max-w-2xl">
          Ihr eigener Bestelllink mit eigenen Preisen. Das ist kein Affiliate:
          Es fließt keine Provision, und es wird kein Prozentsatz abgezogen. Was
          Sie unten je Modell eintragen, ist der Preis, den der Kunde über
          diesen Link zahlt. Jeder Link gilt für <strong className="font-normal text-black/70">ein
          Paar</strong>; sobald damit gekauft wurde, entsteht automatisch ein neuer.
        </p>
      </div>

      {fehler && (
        <div className="flex items-start gap-2.5 px-4 py-3 border border-red-200 bg-red-50">
          <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
          <p className="text-[12px] text-red-700 font-light">{fehler}</p>
        </div>
      )}

      {/* ── Der gültige Link ─────────────────────────────────────────── */}
      <section className="border border-black/[0.08] p-5">
        <div className="flex items-baseline justify-between mb-3">
          <label className={lbl}>Gültiger Link</label>
          <span className="text-[11px] text-black/35 font-light">
            {daten?.verkauft ? `${daten.verkauft} Paar bereits darüber verkauft` : 'noch kein Verkauf'}
          </span>
        </div>
        <div className="flex gap-2">
          <input
            readOnly
            value={adresse}
            onFocus={e => e.target.select()}
            className="flex-1 border border-black/12 px-3 py-2.5 text-[12px] text-black/70 bg-black/[0.02] font-mono"
          />
          <button
            onClick={kopieren}
            className="px-4 flex items-center gap-2 bg-black text-white text-[11px] border-0 hover:bg-black/85 transition-colors"
          >
            {kopiert ? <><Check size={13} strokeWidth={2} /> Kopiert</> : <><Copy size={13} strokeWidth={1.5} /> Kopieren</>}
          </button>
        </div>
        <div className="flex items-center justify-between mt-3">
          <p className="text-[11px] text-black/35 font-light leading-relaxed max-w-lg">
            Weitergeben können Sie ihn, wie Sie möchten. Er verfällt mit dem
            ersten Kauf, ein zweites Mal lässt er sich nicht einlösen.
          </p>
          <button
            onClick={neuErzeugen}
            className="flex items-center gap-1.5 text-[11px] text-black/40 hover:text-black bg-transparent border-0 whitespace-nowrap"
          >
            <RefreshCw size={12} strokeWidth={1.5} /> Neuen erzeugen
          </button>
        </div>
      </section>

      {/* ── Die Preise ───────────────────────────────────────────────── */}
      <section className="border border-black/[0.08] p-5">
        <div className="flex items-baseline justify-between mb-1">
          <label className={lbl}>Ihre Preise</label>
          <span className="text-[11px] text-black/35 font-light">
            {mitPreis} von {modelle.length} Modellen
          </span>
        </div>
        {/* Der teuerste denkbare Irrtum auf dieser Seite, deshalb steht er
            direkt über den Feldern und nicht in einer Fußnote. */}
        <p className="text-[11px] text-black/40 font-light leading-relaxed mb-4">
          Ein leeres Feld heißt <strong className="font-normal text-black/60">Katalogpreis</strong>,
          nicht kostenlos. Aufpreise für Optionen, Gürtel und Zubehör kommen wie
          gewohnt obendrauf.
        </p>

        <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1">
          {modelle.map(m => {
            const wert = preise[m.id] ?? ''
            const gesetzt = String(wert).trim() !== ''
            const katalog = zahlAus(m.katalogpreis)
            const eingetragen = zahlAus(wert)
            return (
              <div key={m.id} className="flex items-center gap-3 py-1.5 border-b border-black/[0.04]">
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-black/75 font-light truncate">{m.name}</p>
                  <p className="text-[10px] text-black/30 font-light">
                    Katalog {m.katalogpreis}
                    {m.collection && m.collection !== 'standard' ? ` · ${m.collection}` : ''}
                  </p>
                </div>
                {/* Was der Kunde spart, sofort sichtbar. Ohne diese Zahl müsste
                    der Inhaber im Kopf rechnen, und ein vertippter Preis fiele
                    erst beim Verkauf auf. */}
                {gesetzt && katalog > 0 && (
                  <span className={`text-[10px] font-light tabular-nums ${
                    eingetragen > katalog ? 'text-amber-700' : 'text-black/35'}`}>
                    {eingetragen > katalog
                      ? `${euro(eingetragen - katalog)} über Katalog`
                      : `${euro(katalog - eingetragen)} günstiger`}
                  </span>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-black/30">€</span>
                  <input
                    type="number" min="0" step="1" placeholder="Katalog"
                    value={wert}
                    onChange={e => setPreise(p => ({ ...p, [m.id]: e.target.value }))}
                    className={`w-24 border px-2 py-1.5 text-[12px] text-right tabular-nums focus:outline-none ${
                      gesetzt ? 'border-black/30 text-black' : 'border-black/10 text-black/40'}`}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex items-center gap-4 mt-5">
          <button
            onClick={speichern} disabled={speichert}
            className="px-6 py-2.5 bg-black text-white text-[11px] uppercase tracking-[0.15em] border-0 disabled:opacity-40"
          >
            {speichert ? 'Wird gespeichert…' : 'Preise speichern'}
          </button>
          {gemeldet && <p className="text-[11px] text-black/45 font-light">{gemeldet}</p>}
        </div>
      </section>

      {/* ── Was verkauft wurde ───────────────────────────────────────── */}
      <section className="border border-black/[0.08] p-5">
        <label className={lbl}>Verlauf</label>
        {(daten?.verlauf || []).length === 0 ? (
          <p className="text-[12px] text-black/35 font-light mt-3">
            Noch nichts. Sobald über einen Link gekauft wurde, steht hier, wer
            und zu welchem Preis.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {daten.verlauf.map(v => (
              <div key={v.id} className="flex items-center gap-3 py-2 border-b border-black/[0.04]">
                <ShoppingBag size={13} strokeWidth={1.4} className={v.status === 'used' ? 'text-black/40' : 'text-black/15'} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-black/70 font-light truncate">
                    {v.status === 'used'
                      ? <>{v.shoe_name || 'Paar'} an {v.kaeufer || 'unbekannt'}</>
                      : <span className="text-black/40">Ersetzt, ohne Verkauf</span>}
                  </p>
                  <p className="text-[10px] text-black/30 font-mono truncate">{v.code}</p>
                </div>
                {v.status === 'used' && (
                  <div className="text-right">
                    <p className="text-[12px] text-black/70 tabular-nums">{v.price}</p>
                    <p className="text-[10px] text-black/30">{(v.used_at || '').slice(0, 10)}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
