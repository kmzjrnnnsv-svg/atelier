/**
 * AuftragsAbschluss.jsx — was nach dem Bestellen zu sehen und zu tun ist.
 *
 * Drei Dinge, die bisher fehlten und die alle an derselben Stelle hingehören:
 * wo das Paket ist, wo die Rechnung ist, und wie man den Auftrag wieder
 * loswird. Das Letzte stand bis heute nur in den AGB — der Kunde musste
 * schreiben, ausgerechnet in der Phase, in der eine Stornierung kostenfrei
 * ist und eine liegengebliebene Nachricht deshalb am meisten kostet.
 */
import { useState } from 'react'
import { Truck, FileText, XCircle, AlertTriangle, ExternalLink } from 'lucide-react'
import { apiFetch } from '../hooks/useApi'

const geld = (n) =>
  `${(Number(n) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`

// ── Sendung ─────────────────────────────────────────────────────────────────
function Sendung({ sendung }) {
  if (!sendung) return null
  return (
    <div className="max-w-lg mx-auto mt-6 pt-6 border-t border-black/[0.06]">
      <p className="text-[10px] uppercase tracking-[0.2em] text-black/25 font-light mb-3">Ihre Sendung</p>
      <div className="flex items-start gap-3">
        <Truck size={16} strokeWidth={1.2} className="text-black/40 mt-0.5 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-black/70 font-light">{sendung.dienst}</p>
          <p className="text-[12px] text-black/40 font-light break-all mt-0.5">{sendung.code}</p>
          {sendung.url && (
            <a
              href={sendung.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 px-4 py-2.5 bg-black text-white text-[11px] uppercase tracking-[0.18em] no-underline"
            >
              Sendung verfolgen <ExternalLink size={11} strokeWidth={1.5} />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Rechnung ────────────────────────────────────────────────────────────────
//
// Der Knopf öffnet die Adresse in einem neuen Fenster statt sie als Datei zu
// holen: Der Server liefert das PDF mit Zugangstoken aus, und ein Fenster,
// das der Browser selbst öffnet, trägt keines mit. Deshalb wird die Datei
// hier geholt und als Objekt-Adresse geöffnet.
function Rechnung({ rechnung }) {
  const [laed, setLaed] = useState(false)
  const [fehler, setFehler] = useState(null)
  if (!rechnung) return null

  const oeffnen = async () => {
    setLaed(true); setFehler(null)
    try {
      const res = await apiFetch(rechnung.url, { raw: true })
      if (!res.ok) throw new Error('Die Rechnung konnte nicht geladen werden.')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener')
      // Erst freigeben, wenn das Fenster sie sicher gelesen hat.
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (e) {
      setFehler(e.message || 'Die Rechnung konnte nicht geladen werden.')
    } finally {
      setLaed(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto mt-6 pt-6 border-t border-black/[0.06]">
      <p className="text-[10px] uppercase tracking-[0.2em] text-black/25 font-light mb-3">Rechnung</p>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[13px] text-black/70 font-light">{rechnung.nummer}</p>
          {rechnung.datum && (
            <p className="text-[11px] text-black/35 font-light mt-0.5">
              vom {new Date(String(rechnung.datum).replace(' ', 'T') + 'Z').toLocaleDateString('de-DE')}
            </p>
          )}
        </div>
        <button
          onClick={oeffnen} disabled={laed}
          className="flex items-center gap-2 px-4 py-2.5 border border-black/15 bg-white text-[11px] uppercase tracking-[0.18em] text-black/70 disabled:opacity-40"
        >
          <FileText size={12} strokeWidth={1.5} />
          {laed ? 'Öffnet …' : 'Ansehen'}
        </button>
      </div>
      {fehler && <p className="text-[11px] text-red-700 font-light mt-2">{fehler}</p>}
    </div>
  )
}

// ── Stornierung ─────────────────────────────────────────────────────────────
function Storno({ orderId, storno, aufFrisch }) {
  const [offen, setOffen] = useState(false)
  const [grund, setGrund] = useState('')
  const [laeuft, setLaeuft] = useState(false)
  const [fehler, setFehler] = useState(null)

  // Bereits storniert: nur noch die Abrechnung zeigen.
  if (storno?.am) {
    return (
      <div className="max-w-lg mx-auto mt-6 pt-6 border-t border-black/[0.06]">
        <p className="text-[10px] uppercase tracking-[0.2em] text-black/25 font-light mb-3">Stornierung</p>
        <div className="bg-black/[0.03] px-4 py-3.5">
          <div className="flex justify-between py-1">
            <span className="text-[11px] text-black/40 font-light">Einbehalten</span>
            <span className="text-[12px] text-black/70 font-light">
              {geld(storno.gebuehr)}{storno.satz ? ` (${storno.satz} %)` : ''}
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-[11px] text-black/40 font-light">Erstattung</span>
            <span className="text-[13px] text-black font-normal">{geld(storno.erstattung)}</span>
          </div>
        </div>
        {storno.erstattung > 0 && (
          <p className="text-[11px] text-black/35 font-light mt-2.5 leading-relaxed">
            Wir überweisen den Betrag innerhalb von fünf Werktagen auf das Konto,
            von dem Ihre Zahlung kam.
          </p>
        )}
      </div>
    )
  }

  if (!storno) return null

  // Nicht mehr stornierbar — der Hinweis bleibt trotzdem stehen, sonst sucht
  // der Kunde weiter nach dem Knopf.
  if (!storno.moeglich) {
    return (
      <div className="max-w-lg mx-auto mt-6 pt-6 border-t border-black/[0.06]">
        <p className="text-[11px] text-black/35 font-light leading-relaxed">{storno.hinweis}</p>
      </div>
    )
  }

  const stornieren = async () => {
    setLaeuft(true); setFehler(null)
    try {
      await apiFetch(`/api/orders/${orderId}/storno`, {
        method: 'POST', body: JSON.stringify({ grund: grund.trim() || undefined }),
      })
      setOffen(false)
      aufFrisch?.()
    } catch (e) {
      setFehler(e.message || 'Die Stornierung ist nicht durchgegangen.')
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto mt-6 pt-6 border-t border-black/[0.06]">
      {!offen ? (
        <button
          onClick={() => setOffen(true)}
          className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-black/40 bg-transparent border-0 p-0"
        >
          <XCircle size={12} strokeWidth={1.4} /> Auftrag stornieren
        </button>
      ) : (
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-black/25 font-light mb-3">Auftrag stornieren</p>

          {/* Der Betrag zuerst. Was es kostet, ist die Frage — nicht, wie das
              Formular aussieht. */}
          <div className={`px-4 py-3.5 ${storno.gebuehr > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-black/[0.03]'}`}>
            {storno.gebuehr > 0 ? (
              <>
                <div className="flex items-start gap-2 mb-3">
                  <AlertTriangle size={13} strokeWidth={1.4} className="text-amber-700 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-amber-900 font-light leading-relaxed">{storno.hinweis}</p>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[11px] text-black/45 font-light">Auftragswert</span>
                  <span className="text-[12px] text-black/70 font-light">{geld(storno.betrag)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[11px] text-black/45 font-light">Einbehalten ({storno.pct} %)</span>
                  <span className="text-[12px] text-black/70 font-light">− {geld(storno.gebuehr)}</span>
                </div>
                <div className="flex justify-between py-1 border-t border-amber-200 mt-1 pt-2">
                  <span className="text-[11px] text-black/60 font-light">Sie erhalten zurück</span>
                  <span className="text-[14px] text-black font-normal">{geld(storno.erstattung)}</span>
                </div>
              </>
            ) : (
              <p className="text-[12px] text-black/60 font-light leading-relaxed">{storno.hinweis}</p>
            )}
          </div>

          <textarea
            value={grund} onChange={(e) => setGrund(e.target.value)}
            rows={2} maxLength={500}
            placeholder="Grund (freiwillig) — hilft uns, es besser zu machen"
            className="w-full mt-3 px-3 py-2.5 border border-black/10 text-[12px] font-light resize-none focus:outline-none focus:border-black/30"
          />

          {fehler && <p className="text-[11px] text-red-700 font-light mt-2">{fehler}</p>}

          <div className="flex gap-2 mt-3">
            <button
              onClick={stornieren} disabled={laeuft}
              className="flex-1 py-3 bg-black text-white text-[11px] uppercase tracking-[0.18em] border-0 disabled:opacity-40"
            >
              {laeuft ? 'Wird storniert …' : 'Verbindlich stornieren'}
            </button>
            <button
              onClick={() => { setOffen(false); setFehler(null) }} disabled={laeuft}
              className="px-5 py-3 border border-black/15 bg-white text-[11px] uppercase tracking-[0.18em] text-black/50"
            >
              Zurück
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AuftragsAbschluss({ orderId, lauf, aufFrisch }) {
  if (!lauf) return null
  return (
    <>
      <Sendung sendung={lauf.sendung} />
      <Rechnung rechnung={lauf.rechnung} />
      <Storno orderId={orderId} storno={lauf.storno} aufFrisch={aufFrisch} />
    </>
  )
}
