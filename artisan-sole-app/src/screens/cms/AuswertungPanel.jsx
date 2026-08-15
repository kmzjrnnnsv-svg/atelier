/**
 * AuswertungPanel.jsx — die Zahlen, die immer schon da waren.
 *
 * Es fehlte nie an Daten. Umsatz, Modelle, Express-Anteil, Wirkung der
 * Vermittler stehen in der Datenbank, seit es den Laden gibt — es fehlte die
 * Ansicht. Ohne sie war jede Entscheidung darüber, welche Modelle in die
 * Express-Linie gehören oder welcher Provisionssatz sich trägt, eine
 * Vermutung.
 *
 * Vier Blöcke, in der Reihenfolge, in der man sie braucht: Wie läuft es, wo
 * bleibt etwas hängen, was verkauft sich, wer bringt es. Dazu der Bestand,
 * weil er über eine Zusage entscheidet, und das Protokoll, weil man es genau
 * dann sucht, wenn etwas strittig ist.
 */
import { useState, useEffect } from 'react'
import { TrendingUp, AlertTriangle, Package, Users, ScrollText, Boxes } from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'

const geld = (n) =>
  `${(Number(n) || 0).toLocaleString('de-DE', { maximumFractionDigits: 0 })} €`
const geldGenau = (n) =>
  `${(Number(n) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`

const MONATSNAME = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
const monatKurz = (s) => {
  const [j, m] = String(s).split('-')
  return `${MONATSNAME[Number(m) - 1]} ${String(j).slice(2)}`
}

const STUFEN_NAMEN = {
  pending_payment: 'Zahlung offen', pending: 'Bezahlt', processing: 'In Fertigung',
  quality_check: 'Endkontrolle', shipped: 'Versandt', delivered: 'Zugestellt',
  cancelled: 'Storniert',
}

// ── Kennzahl ────────────────────────────────────────────────────────────────
function Kennzahl({ label, wert, zusatz, warnung }) {
  return (
    <div className={`border p-5 ${warnung ? 'border-amber-300 bg-amber-50/40' : 'border-black/[0.08]'}`}>
      <p className="text-[9px] uppercase tracking-[0.2em] text-black/30 font-light mb-2">{label}</p>
      <p className="text-[24px] font-extralight text-black tracking-tight tabular-nums leading-none">{wert}</p>
      {zusatz && <p className="text-[11px] text-black/35 font-light mt-2">{zusatz}</p>}
    </div>
  )
}

// ── Monatsbalken ────────────────────────────────────────────────────────────
//
// Bewusst als CSS-Balken und nicht als Diagrammbibliothek: Zwölf Werte
// rechtfertigen keine weitere Abhängigkeit, und was hier zu sehen sein muss —
// Höhe, Monat, Betrag — steht so vollständig im Markup.
function Monatsverlauf({ daten }) {
  const hoechst = Math.max(1, ...daten.map(d => d.umsatz))
  return (
    <div className="border border-black/[0.08] p-5">
      <p className="text-[9px] uppercase tracking-[0.2em] text-black/30 font-light mb-5">Umsatz je Monat</p>
      <div className="flex items-end gap-1.5 h-40">
        {daten.map(d => (
          <div key={d.monat} className="flex-1 flex flex-col items-center justify-end h-full group">
            <span className="text-[9px] text-black/45 font-light tabular-nums mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {geld(d.umsatz)}
            </span>
            <div
              className="w-full bg-black/80 min-h-[2px] transition-all"
              style={{ height: `${(d.umsatz / hoechst) * 100}%` }}
              title={`${monatKurz(d.monat)}: ${geld(d.umsatz)} · ${d.paare} Paar`}
            />
            <span className="text-[9px] text-black/30 font-light mt-2 whitespace-nowrap">{monatKurz(d.monat)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Protokoll ───────────────────────────────────────────────────────────────
function Protokoll() {
  const [zeilen, setZeilen] = useState(null)
  useEffect(() => {
    apiFetch('/api/auswertung/protokoll?limit=60').then(setZeilen).catch(() => setZeilen([]))
  }, [])

  if (!zeilen) return <p className="text-[12px] text-black/30 font-light">Wird geladen …</p>
  if (!zeilen.length) return <p className="text-[12px] text-black/30 font-light">Noch keine Einträge.</p>

  return (
    <div className="border border-black/[0.08]">
      {zeilen.map((z, i) => (
        <div key={z.id} className={`px-4 py-2.5 flex items-start justify-between gap-4 ${i > 0 ? 'border-t border-black/[0.05]' : ''}`}>
          <div className="min-w-0">
            <p className="text-[12px] text-black/70 font-light">{z.detail || z.action}</p>
            <p className="text-[10px] text-black/30 font-light mt-0.5">
              {z.entity}{z.entity_id ? ` ${z.entity_id}` : ''} · {z.action}
              {z.user_name ? ` · ${z.user_name}` : ''}
            </p>
          </div>
          <span className="text-[10px] text-black/30 font-light tabular-nums flex-shrink-0">
            {new Date(String(z.created_at).replace(' ', 'T') + 'Z').toLocaleString('de-DE', {
              day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
            })}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Bestand ─────────────────────────────────────────────────────────────────
//
// Der Bestand wird am Modell gepflegt (Schuhe › Express). Hier steht er nur,
// weil man ihn im Zusammenhang mit den Zahlen liest: Ein Modell, das sich gut
// verkauft und dessen Bestand bei null steht, ist ein verlorener Auftrag.
function Bestand() {
  const [zeilen, setZeilen] = useState(null)
  useEffect(() => {
    apiFetch('/api/auswertung/bestand').then(setZeilen).catch(() => setZeilen([]))
  }, [])

  if (!zeilen) return <p className="text-[12px] text-black/30 font-light">Wird geladen …</p>
  if (!zeilen.length) return <p className="text-[12px] text-black/30 font-light">Keine Express-Modelle geführt.</p>

  const ungefuehrt = zeilen.filter(z => z.express_stock === null).length

  return (
    <>
      {ungefuehrt > 0 && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 px-3 py-2.5 mb-3">
          <AlertTriangle size={13} strokeWidth={1.4} className="text-amber-700 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-amber-900 font-light leading-relaxed">
            Bei {ungefuehrt} von {zeilen.length} Express-Modellen wird kein Bestand geführt. Diese
            Modelle nehmen unbegrenzt Bestellungen an — die Zusage „rund zwei Wochen"
            ist dort nicht gedeckt. Den Bestand setzen Sie unter <em>Schuhe</em> am Modell.
          </p>
        </div>
      )}
      <div className="border border-black/[0.08]">
        {zeilen.map((z, i) => (
          <div key={z.id} className={`px-4 py-2.5 flex items-center justify-between gap-4 ${i > 0 ? 'border-t border-black/[0.05]' : ''}`}>
            <div className="min-w-0">
              <p className="text-[12px] text-black/70 font-light">{z.name}</p>
              <p className="text-[10px] text-black/30 font-light">{z.category} · rund {z.express_weeks} Wochen</p>
            </div>
            <span className={`text-[12px] tabular-nums flex-shrink-0 ${
              z.express_stock === null ? 'text-black/25 font-light'
                : z.express_stock === 0 ? 'text-red-700'
                : z.express_stock <= 2 ? 'text-amber-700' : 'text-black/60 font-light'
            }`}>
              {z.express_stock === null ? 'nicht geführt' : `${z.express_stock} vorrätig`}
            </span>
          </div>
        ))}
      </div>
    </>
  )
}

// ── Seite ───────────────────────────────────────────────────────────────────
export default function AuswertungPanel() {
  const [daten, setDaten] = useState(null)
  const [monate, setMonate] = useState(12)
  const [fehler, setFehler] = useState(null)
  const [reiter, setReiter] = useState('zahlen')

  // Der Zeitraum steht im Schlüssel der geladenen Daten, statt sie beim
  // Wechsel erst auf null zu setzen: Ein synchrones setState im Effekt löst
  // eine zweite Renderrunde aus, und der alte Stand blitzte dabei kurz auf.
  useEffect(() => {
    let verworfen = false
    apiFetch(`/api/auswertung?monate=${monate}`)
      .then(d => { if (!verworfen) setDaten({ ...d, fuer: monate }) })
      .catch(e => { if (!verworfen) setFehler(e.error || 'Die Auswertung konnte nicht geladen werden.') })
    return () => { verworfen = true }
  }, [monate])

  const k = daten?.kennzahlen

  return (
    <div className="max-w-4xl">
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <p className="text-[9px] text-black/25 uppercase tracking-[0.25em] mb-2 font-light">Verwaltung</p>
          <h1 className="text-[26px] font-extralight text-black tracking-tight">Auswertung</h1>
        </div>
        <div className="flex gap-1">
          {[3, 12, 24].map(m => (
            <button
              key={m} onClick={() => setMonate(m)}
              className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] border transition-all ${
                monate === m ? 'bg-black text-white border-black' : 'bg-transparent text-black/40 border-black/10'
              }`}
            >
              {m} Monate
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b border-black/[0.06]">
        {[
          { key: 'zahlen', label: 'Zahlen', icon: TrendingUp },
          { key: 'bestand', label: 'Express-Bestand', icon: Boxes },
          { key: 'protokoll', label: 'Protokoll', icon: ScrollText },
        ].map(t => (
          <button
            key={t.key} onClick={() => setReiter(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-light bg-transparent border-0 border-b-2 -mb-px transition-all ${
              reiter === t.key ? 'border-black text-black' : 'border-transparent text-black/35'
            }`}
          >
            <t.icon size={12} strokeWidth={1.4} /> {t.label}
          </button>
        ))}
      </div>

      {fehler && <p className="text-[12px] text-red-700 font-light">{fehler}</p>}

      {reiter === 'bestand' && <Bestand />}
      {reiter === 'protokoll' && <Protokoll />}

      {reiter === 'zahlen' && (!daten || daten.fuer !== monate ? (
        <p className="text-[12px] text-black/30 font-light">Wird geladen …</p>
      ) : (
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kennzahl label="Umsatz" wert={geld(k.umsatz)} zusatz={`${k.paare} Paar · ⌀ ${geld(k.durchschnitt)}`} />
            <Kennzahl
              label="Zahlung offen" wert={geld(k.offen)}
              zusatz={`${k.offenAnzahl} Bestellungen${k.offenUeberfaellig ? ` · ${k.offenUeberfaellig} über 10 Tage` : ''}`}
              warnung={k.offenUeberfaellig > 0}
            />
            <Kennzahl label="Express-Anteil" wert={`${daten.linien.anteil} %`} zusatz={`${daten.linien.express.paare} von ${k.paare} Paaren`} />
            <Kennzahl
              label="Storniert" wert={String(k.storniert)}
              zusatz={k.stornoGebuehren > 0 ? `${geldGenau(k.stornoGebuehren)} einbehalten` : 'ohne Gebühren'}
            />
          </div>

          <Monatsverlauf daten={daten.monatlich} />

          {/* Trichter: wo Bestellungen stehen bleiben */}
          <div className="border border-black/[0.08] p-5">
            <p className="text-[9px] uppercase tracking-[0.2em] text-black/30 font-light mb-4">Wo die Bestellungen stehen</p>
            <div className="flex flex-col gap-2">
              {daten.trichter.map(t => {
                const gesamt = daten.trichter.reduce((s, x) => s + x.anzahl, 0) || 1
                return (
                  <div key={t.status} className="flex items-center gap-3">
                    <span className="text-[11px] text-black/45 font-light w-32 flex-shrink-0">
                      {STUFEN_NAMEN[t.status] || t.status}
                    </span>
                    <div className="flex-1 h-4 bg-black/[0.04]">
                      <div className="h-full bg-black/70" style={{ width: `${(t.anzahl / gesamt) * 100}%` }} />
                    </div>
                    <span className="text-[11px] text-black/50 font-light tabular-nums w-8 text-right">{t.anzahl}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Modelle */}
          <div className="border border-black/[0.08]">
            <p className="text-[9px] uppercase tracking-[0.2em] text-black/30 font-light px-5 pt-5 pb-3 flex items-center gap-1.5">
              <Package size={11} strokeWidth={1.4} /> Modelle nach Umsatz
            </p>
            {daten.modelle.length === 0 ? (
              <p className="text-[12px] text-black/30 font-light px-5 pb-5">Noch nichts verkauft.</p>
            ) : daten.modelle.map((m, i) => (
              <div key={m.modell} className={`px-5 py-2.5 flex items-center justify-between gap-4 ${i > 0 ? 'border-t border-black/[0.05]' : ''}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[12px] text-black/70 font-light truncate">{m.modell}</span>
                  {m.express && (
                    <span className="text-[8px] uppercase tracking-[0.15em] px-1.5 py-0.5 bg-black/[0.06] text-black/45 flex-shrink-0">Express</span>
                  )}
                </div>
                <span className="text-[11px] text-black/45 font-light tabular-nums flex-shrink-0">
                  {m.paare} × · {geld(m.umsatz)}
                </span>
              </div>
            ))}
          </div>

          {/* Vermittler */}
          <div className="border border-black/[0.08] p-5">
            <p className="text-[9px] uppercase tracking-[0.2em] text-black/30 font-light mb-4 flex items-center gap-1.5">
              <Users size={11} strokeWidth={1.4} /> Vermittler
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
              <div>
                <p className="text-[17px] font-extralight text-black tabular-nums">{daten.vermittler.anteil} %</p>
                <p className="text-[10px] text-black/30 font-light mt-0.5">der Paare vermittelt</p>
              </div>
              <div>
                <p className="text-[17px] font-extralight text-black tabular-nums">{geld(daten.vermittler.umsatz)}</p>
                <p className="text-[10px] text-black/30 font-light mt-0.5">Umsatz daraus</p>
              </div>
              <div>
                <p className="text-[17px] font-extralight text-black tabular-nums">{geldGenau(daten.vermittler.provision)}</p>
                <p className="text-[10px] text-black/30 font-light mt-0.5">Provision</p>
              </div>
              <div>
                <p className="text-[17px] font-extralight text-black tabular-nums">{daten.vermittler.quote} %</p>
                <p className="text-[10px] text-black/30 font-light mt-0.5">vom vermittelten Umsatz</p>
              </div>
            </div>
            {daten.vermittler.beste.length > 0 && (
              <div className="border-t border-black/[0.05] pt-3">
                {daten.vermittler.beste.map(v => (
                  <div key={v.code} className="flex items-center justify-between gap-4 py-1.5">
                    <span className="text-[12px] text-black/60 font-light truncate">
                      {v.full_name} <span className="text-black/25">· {v.code}</span>
                    </span>
                    <span className="text-[11px] text-black/45 font-light tabular-nums flex-shrink-0">
                      {v.paare} × · {geld(v.umsatz)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
