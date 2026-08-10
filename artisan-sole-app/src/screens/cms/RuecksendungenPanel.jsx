/**
 * RuecksendungenPanel — angemeldete Rücksendungen entscheiden.
 *
 * Der Weg einer Rücksendung ist geradlinig: angemeldet → bestätigt →
 * eingegangen → erstattet, mit „abgelehnt" als Ausweg an jeder Stelle. Die
 * Oberfläche bildet genau das ab — je Vorgang der nächste Schritt als
 * Schaltfläche, statt einer Auswahlliste aller Zustände, aus der man den
 * richtigen heraussuchen müsste.
 *
 * Schuhe stehen hier nie: Sie sind vom Widerruf ausgenommen, und der Server
 * lässt sie gar nicht erst in eine Rücksendung.
 */
import { useState, useEffect, useCallback } from 'react'
import { PackageOpen, Check, X, AlertTriangle, Mail, Clock } from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'

const euro = (n) => `€ ${Number(n || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const ZUSTAND = {
  requested: { text: 'Angemeldet',  weiter: 'approved', weiterText: 'Bestätigen' },
  approved:  { text: 'Bestätigt',   weiter: 'received', weiterText: 'Als eingegangen buchen' },
  received:  { text: 'Eingegangen', weiter: 'refunded', weiterText: 'Als erstattet buchen' },
  refunded:  { text: 'Erstattet',   weiter: null },
  rejected:  { text: 'Abgelehnt',   weiter: null },
}
const ERLEDIGT = ['refunded', 'rejected']

const datum = (s) => {
  if (!s) return '—'
  const d = new Date(String(s).replace(' ', 'T') + (String(s).endsWith('Z') ? '' : 'Z'))
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function RuecksendungenPanel() {
  const [zeilen, setZeilen] = useState([])
  const [laedt, setLaedt] = useState(true)
  const [fehler, setFehler] = useState(null)
  const [busy, setBusy] = useState(null)          // id, der gerade gespeichert wird
  const [notizen, setNotizen] = useState({})      // { id: text }
  const [zeigeErledigte, setZeigeErledigte] = useState(false)

  const laden = useCallback(async () => {
    setLaedt(true)
    try {
      const rows = await apiFetch('/api/orders/ruecksendungen/alle')
      setZeilen(Array.isArray(rows) ? rows : [])
    } catch (e) {
      setFehler(e?.error || 'Rücksendungen konnten nicht geladen werden.')
    } finally { setLaedt(false) }
  }, [])
  useEffect(() => { laden() }, [laden])

  const setzen = async (id, status) => {
    setBusy(id); setFehler(null)
    try {
      const neu = await apiFetch(`/api/orders/ruecksendungen/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status, note: notizen[id] ?? undefined }),
      })
      setZeilen(z => z.map(r => r.id === id ? { ...r, ...neu } : r))
      setNotizen(n => { const k = { ...n }; delete k[id]; return k })
    } catch (e) {
      setFehler(e?.error || 'Der Stand konnte nicht gespeichert werden.')
    } finally { setBusy(null) }
  }

  const offene = zeilen.filter(r => !ERLEDIGT.includes(r.status))
  const erledigte = zeilen.filter(r => ERLEDIGT.includes(r.status))
  const sichtbar = zeigeErledigte ? zeilen : offene

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <PackageOpen size={18} className="text-black/50" />
          <h1 className="text-[15px] tracking-[0.06em]">Rücksendungen</h1>
          {!laedt && <span className="text-[11px] text-black/35">{offene.length} offen</span>}
        </div>
        {erledigte.length > 0 && (
          <button
            onClick={() => setZeigeErledigte(v => !v)}
            className="text-[11px] text-black/40 hover:text-black bg-transparent border-0 underline underline-offset-4"
          >
            {zeigeErledigte ? 'Nur offene zeigen' : `Erledigte zeigen (${erledigte.length})`}
          </button>
        )}
      </div>

      {fehler && (
        <div className="flex items-start gap-2 border border-black/15 bg-black/[0.02] p-3 mb-4">
          <AlertTriangle size={13} className="text-black/50 mt-0.5 shrink-0" />
          <p className="text-[12px] text-black/70 leading-relaxed flex-1">{fehler}</p>
          <button onClick={() => setFehler(null)} className="bg-transparent border-0 text-black/30 hover:text-black p-0"><X size={13} /></button>
        </div>
      )}

      <p className="text-[11px] text-black/40 font-light leading-relaxed mb-5">
        Zubehör geht innerhalb von 14 Tagen nach Zustellung zurück. Maßgefertigte
        Schuhe sind vom Widerruf ausgenommen und tauchen hier deshalb nie auf.
      </p>

      {laedt ? (
        <p className="text-[12px] text-black/35">Wird geladen…</p>
      ) : sichtbar.length === 0 ? (
        <div className="border border-black/10 px-4 py-12 text-center">
          <Check size={16} strokeWidth={1.4} className="text-black/20 mx-auto mb-3" />
          <p className="text-[12px] text-black/35">Keine offenen Rücksendungen.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sichtbar.map(r => {
            const z = ZUSTAND[r.status] || { text: r.status, weiter: null }
            const fertig = ERLEDIGT.includes(r.status)
            return (
              <div key={r.id} className={`border border-black/10 bg-white ${fertig ? 'opacity-60' : ''}`}>
                <div className="px-4 py-3.5 flex items-start justify-between gap-4 border-b border-black/[0.06]">
                  <div className="min-w-0">
                    <p className="text-[13px] text-black">
                      {r.items.map(i => `${i.qty}× ${i.name}`).join(', ') || 'Ohne Position'}
                    </p>
                    <p className="text-[11px] text-black/35 font-light mt-0.5">
                      {r.order_ref ? `${r.order_ref} · ` : ''}{r.shoe_name} · angemeldet {datum(r.created_at)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[13px] text-black tabular-nums">{euro(r.amount)}</p>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-black/40 mt-0.5">{z.text}</p>
                  </div>
                </div>

                <div className="px-4 py-3.5">
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-black/45">
                    {r.user_email && (
                      <a href={`mailto:${r.user_email}`} className="flex items-center gap-1.5 text-black/50 hover:text-black no-underline">
                        <Mail size={12} strokeWidth={1.5} /> {r.user_name || r.user_email}
                      </a>
                    )}
                    {r.decided_at && (
                      <span className="flex items-center gap-1.5"><Clock size={12} strokeWidth={1.5} /> zuletzt {datum(r.decided_at)}</span>
                    )}
                  </div>

                  {r.reason && (
                    <p className="text-[12px] text-black/60 font-light leading-relaxed mt-3 whitespace-pre-wrap">
                      <span className="text-black/35">Grund: </span>{r.reason}
                    </p>
                  )}
                  {r.note && (
                    <p className="text-[12px] text-black/60 font-light leading-relaxed mt-2 whitespace-pre-wrap">
                      <span className="text-black/35">Notiz: </span>{r.note}
                    </p>
                  )}

                  {!fertig && (
                    <div className="mt-4 pt-3.5 border-t border-black/[0.07] space-y-2.5">
                      <input
                        value={notizen[r.id] ?? ''}
                        onChange={e => setNotizen(n => ({ ...n, [r.id]: e.target.value }))}
                        placeholder="Notiz für den Kunden (optional)"
                        className="w-full h-9 px-2.5 border border-black/15 text-[12px] outline-none focus:border-black/40"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        {z.weiter && (
                          <button
                            onClick={() => setzen(r.id, z.weiter)}
                            disabled={busy === r.id}
                            className="h-9 px-4 bg-black text-white text-[11px] tracking-[0.12em] uppercase border-0 disabled:opacity-30"
                          >
                            {busy === r.id ? '…' : z.weiterText}
                          </button>
                        )}
                        <button
                          onClick={() => setzen(r.id, 'rejected')}
                          disabled={busy === r.id}
                          className="h-9 px-4 bg-white text-black/60 text-[11px] tracking-[0.12em] uppercase border border-black/15 hover:border-black/40 disabled:opacity-30"
                        >
                          Ablehnen
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
