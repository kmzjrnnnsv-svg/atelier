/**
 * AnfragenPanel — alle Anfragen an einer Stelle, nach Herkunft getrennt.
 *
 * Vorher lagen sie verstreut: Hilfe-Tickets im Feedback-Bereich, Firmen- und
 * Maßanfragen zusammen in einem Topf im Firmenkonten-Bereich, Affiliate
 * nirgends. Die drei Wege werden unterschiedlich beantwortet — eine
 * Firmenanfrage führt zu einem Angebot, ein Hilfe-Ticket zu einer Antwort —
 * deshalb stehen sie hier nebeneinander, aber nicht durcheinander.
 *
 * Die Reiter tragen die Anzahl offener Vorgänge, damit man sieht, wo etwas
 * liegen geblieben ist, ohne durchzuklicken.
 */
import { useState, useEffect, useCallback } from 'react'
import {
  Inbox, Building2, Users, Footprints, LifeBuoy, Mail, Phone, Clock, Check, X, AlertTriangle,
} from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'

// Herkunft → Reiter. `quelle` ist der Filterwert der API, `feedback` markiert
// den einen Reiter, der aus einer anderen Tabelle kommt.
const REITER = [
  { id: 'help',      label: 'Hilfe & Support', icon: LifeBuoy,   feedback: true,
    hinweis: 'Fragen und Meldungen aus dem Hilfebereich. Antwort per E-Mail an den Absender.' },
  { id: 'business',  label: 'Unternehmen',     icon: Building2,  quelle: 'business',
    hinweis: 'Anfragen von der Firmenseite. Aus einer angenommenen Anfrage entsteht ein Firmenkonto.' },
  { id: 'affiliate', label: 'Affiliate',      icon: Users,      quelle: 'affiliate',
    hinweis: 'Anfragen von der Affiliate-Seite. Affiliate-Konten werden unter Affiliate angelegt.' },
  { id: 'shop',      label: 'Maßanfragen',     icon: Footprints, quelle: 'shop',
    hinweis: 'Sonderwünsche aus dem Konfigurator, etwa wenn keine Standardleiste passt.' },
]

const STATUS = [
  { value: 'open',        label: 'Offen' },
  { value: 'contacted',   label: 'Kontaktiert' },
  { value: 'in_progress', label: 'In Arbeit' },
  { value: 'quoted',      label: 'Angebot raus' },
  { value: 'accepted',    label: 'Angenommen' },
  { value: 'declined',    label: 'Abgelehnt' },
  { value: 'closed',      label: 'Erledigt' },
]
const STATUS_LABEL = Object.fromEntries(STATUS.map(s => [s.value, s.label]))

// Als „offen" zählt, was noch Arbeit bedeutet.
const istOffen = (r) => !['closed', 'declined', 'accepted', 'resolved'].includes(r.status)

const datum = (s) => {
  if (!s) return '—'
  const d = new Date(String(s).replace(' ', 'T') + (String(s).endsWith('Z') ? '' : 'Z'))
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function Zeile({ eintrag, onStatus, speichert }) {
  const [offen, setOffen] = useState(false)
  const e = eintrag

  return (
    <div className="border-b border-black/[0.06] last:border-0">
      <button
        onClick={() => setOffen(v => !v)}
        className="w-full text-left px-4 py-3.5 flex items-start justify-between gap-4 bg-transparent border-0 hover:bg-black/[0.015] transition-colors"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[13px] text-black">{e.customer_name || e.user_name || 'Ohne Namen'}</span>
            <span className="text-[11px] text-black/35">{e.customer_email || e.user_email}</span>
          </div>
          <p className="text-[11px] text-black/45 font-light mt-1 line-clamp-1">
            {(e.notes || e.message || e.subject || '').slice(0, 140) || 'Ohne Text'}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={`text-[10px] uppercase tracking-[0.14em] px-2 py-0.5 border ${istOffen(e) ? 'border-black/25 text-black/60' : 'border-black/10 text-black/30'}`}>
            {STATUS_LABEL[e.status] || e.status}
          </span>
          <span className="text-[11px] text-black/30 tabular-nums">{datum(e.created_at)}</span>
        </div>
      </button>

      {offen && (
        <div className="px-4 pb-4 -mt-1">
          <div className="border border-black/[0.07] bg-[#fafaf9] p-4">
            <p className="text-[12px] text-black/70 font-light leading-relaxed whitespace-pre-wrap">
              {e.notes || e.message || '—'}
            </p>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-[11px] text-black/45">
              {(e.customer_email || e.user_email) && (
                <a href={`mailto:${e.customer_email || e.user_email}`} className="flex items-center gap-1.5 text-black/50 hover:text-black no-underline">
                  <Mail size={12} strokeWidth={1.5} /> {e.customer_email || e.user_email}
                </a>
              )}
              {e.customer_phone && (
                <a href={`tel:${e.customer_phone}`} className="flex items-center gap-1.5 text-black/50 hover:text-black no-underline">
                  <Phone size={12} strokeWidth={1.5} /> {e.customer_phone}
                </a>
              )}
              <span className="flex items-center gap-1.5">
                <Clock size={12} strokeWidth={1.5} /> {datum(e.created_at)}
              </span>
              {e.shoe_name && <span className="text-black/35">{e.shoe_name}</span>}
            </div>

            {onStatus && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-black/[0.07]">
                <span className="text-[10px] uppercase tracking-[0.14em] text-black/35">Status</span>
                <select
                  value={e.status}
                  disabled={speichert}
                  onChange={ev => onStatus(e.id, ev.target.value)}
                  className="h-8 px-2 border border-black/15 text-[12px] bg-white outline-none focus:border-black/40 disabled:opacity-40"
                >
                  {STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AnfragenPanel() {
  const [aktiv, setAktiv] = useState('help')
  const [daten, setDaten] = useState({})       // { reiterId: rows[] }
  const [laedt, setLaedt] = useState(true)
  const [fehler, setFehler] = useState(null)
  const [speichert, setSpeichert] = useState(false)

  // Alle vier auf einmal holen: Die Reiter tragen die Anzahl offener Vorgänge,
  // und die kann man nicht zeigen, wenn nur der sichtbare Reiter geladen ist.
  const laden = useCallback(async () => {
    setLaedt(true); setFehler(null)
    try {
      const ergebnisse = await Promise.all(REITER.map(r =>
        r.feedback
          ? apiFetch('/api/feedback/all').catch(() => [])
          : apiFetch(`/api/custom-requests?source=${r.quelle}`).catch(() => [])
      ))
      setDaten(Object.fromEntries(REITER.map((r, i) => [r.id, Array.isArray(ergebnisse[i]) ? ergebnisse[i] : []])))
    } catch (e) {
      setFehler(e?.error || 'Anfragen konnten nicht geladen werden.')
    } finally { setLaedt(false) }
  }, [])
  useEffect(() => { laden() }, [laden])

  const statusSetzen = async (id, status) => {
    setSpeichert(true)
    try {
      await apiFetch(`/api/custom-requests/${id}`, { method: 'PUT', body: JSON.stringify({ status }) })
      setDaten(d => ({ ...d, [aktiv]: d[aktiv].map(r => r.id === id ? { ...r, status } : r) }))
    } catch (e) {
      setFehler(e?.error || 'Status konnte nicht gespeichert werden.')
    } finally { setSpeichert(false) }
  }

  const reiter = REITER.find(r => r.id === aktiv)
  const zeilen = daten[aktiv] || []

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-2.5 mb-6">
        <Inbox size={18} className="text-black/50" />
        <h1 className="text-[15px] tracking-[0.06em]">Anfragen</h1>
      </div>

      {fehler && (
        <div className="flex items-start gap-2 border border-black/15 bg-black/[0.02] p-3 mb-4">
          <AlertTriangle size={13} className="text-black/50 mt-0.5 shrink-0" />
          <p className="text-[12px] text-black/70 leading-relaxed flex-1">{fehler}</p>
          <button onClick={() => setFehler(null)} className="bg-transparent border-0 text-black/30 hover:text-black p-0"><X size={13} /></button>
        </div>
      )}

      {/* Reiter */}
      <div className="flex flex-wrap gap-px bg-black/[0.06] border border-black/[0.06] mb-5">
        {REITER.map(r => {
          const Icon = r.icon
          const rows = daten[r.id] || []
          const offen = rows.filter(istOffen).length
          const gewaehlt = r.id === aktiv
          return (
            <button
              key={r.id}
              onClick={() => setAktiv(r.id)}
              className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 px-4 py-3 border-0 transition-colors ${gewaehlt ? 'bg-black text-white' : 'bg-white text-black/60 hover:bg-black/[0.02]'}`}
            >
              <Icon size={14} strokeWidth={1.5} />
              <span className="text-[11px] uppercase tracking-[0.12em]">{r.label}</span>
              {offen > 0 && (
                <span className={`text-[10px] tabular-nums px-1.5 rounded-full ${gewaehlt ? 'bg-white/20' : 'bg-black/[0.07]'}`}>
                  {offen}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <p className="text-[11px] text-black/40 font-light leading-relaxed mb-4">{reiter?.hinweis}</p>

      {laedt ? (
        <p className="text-[12px] text-black/35">Wird geladen…</p>
      ) : zeilen.length === 0 ? (
        <div className="border border-black/10 px-4 py-10 text-center">
          <Check size={16} strokeWidth={1.4} className="text-black/20 mx-auto mb-3" />
          <p className="text-[12px] text-black/35">Hier liegt gerade nichts.</p>
        </div>
      ) : (
        <div className="border border-black/10">
          {zeilen.map(e => (
            <Zeile
              key={`${aktiv}-${e.id}`}
              eintrag={e}
              speichert={speichert}
              // Hilfe-Tickets werden im Feedback-Bereich bearbeitet, ihr
              // Status folgt einem anderen Satz von Zuständen. Hier nur lesen.
              onStatus={reiter?.feedback ? null : statusSetzen}
            />
          ))}
        </div>
      )}
    </div>
  )
}
