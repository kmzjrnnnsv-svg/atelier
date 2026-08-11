// @refresh reset
/**
 * NachrichtenPanel — die Gespräche des Hauses an einer Stelle.
 *
 * Getrennt nach Firmen, Affiliates und Kunden, weil die drei verschieden
 * beantwortet werden: Eine Firma fragt nach Konditionen, ein Affiliate nach
 * seiner Abrechnung, ein Kunde nach seinem Paar. In einer gemeinsamen Liste
 * geht das durcheinander.
 *
 * Zwei Spalten: links die Verläufe, rechts der offene. Auf dem Telefon ist
 * dafür kein Platz — dort tritt der Verlauf an die Stelle der Liste, mit einem
 * Weg zurück.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { MessageSquare, RefreshCw, Send, ChevronLeft, Building2, Users, User } from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'

const REITER = [
  { key: 'business',  label: 'Firmen',     icon: Building2 },
  { key: 'affiliate', label: 'Affiliates', icon: Users },
  { key: 'user',      label: 'Kunden',     icon: User },
]

const zeit = (s) => {
  if (!s) return ''
  const d = new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z')
  if (Number.isNaN(d.getTime())) return ''
  const heute = new Date()
  const gleicherTag = d.toDateString() === heute.toDateString()
  return gleicherTag
    ? d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

/** Name für die Liste: Die Firma steht über der Person, die dort schreibt. */
function anzeigeName(t) {
  if (t.kategorie === 'business' && t.business_name) return t.business_name
  if (t.kategorie === 'affiliate' && t.affiliate_code) return `${t.user_name} · ${t.affiliate_code}`
  return t.user_name || t.user_email
}

function Verlauf({ threadId, onGelesen }) {
  const [daten, setDaten] = useState(null)
  const [text, setText] = useState('')
  const [sendet, setSendet] = useState(false)
  const [fehler, setFehler] = useState(null)
  const endeRef = useRef(null)

  const laden = useCallback(async () => {
    try {
      const d = await apiFetch(`/api/chat/threads/${threadId}`)
      setDaten(d)
      onGelesen?.(threadId)
    } catch (e) { setFehler(e?.error || 'Verlauf konnte nicht geladen werden.') }
  }, [threadId, onGelesen])

  useEffect(() => { setDaten(null); laden() }, [laden])
  useEffect(() => { endeRef.current?.scrollIntoView({ block: 'end' }) }, [daten])

  const senden = async (e) => {
    e.preventDefault()
    const inhalt = text.trim()
    if (!inhalt || sendet) return
    setSendet(true); setFehler(null)
    try {
      const d = await apiFetch(`/api/chat/threads/${threadId}`, {
        method: 'POST', body: JSON.stringify({ text: inhalt }),
      })
      setDaten(v => ({ ...v, messages: d.messages }))
      setText('')
    } catch (e) { setFehler(e?.error || 'Die Antwort konnte nicht gesendet werden.') }
    finally { setSendet(false) }
  }

  if (!daten) return <div className="p-6 text-[12px] text-black/30">Wird geladen …</div>

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-4 space-y-3">
        {daten.messages.length === 0 && (
          <p className="text-[12px] text-black/30">Noch keine Nachrichten in diesem Verlauf.</p>
        )}
        {daten.messages.map(m => (
          <div key={m.id} className={`flex ${m.von === 'team' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] lg:max-w-[70%] px-3.5 py-2.5 ${
              m.von === 'team' ? 'bg-black text-white' : 'bg-black/[0.04] text-black'
            }`}>
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">{m.text}</p>
              <p className={`text-[9px] mt-1.5 ${m.von === 'team' ? 'text-white/40' : 'text-black/30'}`}>
                {m.von === 'team' ? (m.autor_name || 'Artisan Sole') : anzeigeName(daten.thread)} · {zeit(m.created_at)}
              </p>
            </div>
          </div>
        ))}
        <div ref={endeRef} />
      </div>

      <form onSubmit={senden} className="flex-shrink-0 border-t border-black/8 p-3 lg:p-4">
        {fehler && <p className="text-[11px] text-red-600/80 mb-2">{fehler}</p>}
        <div className="flex items-end gap-2">
          <textarea
            rows={2}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) senden(e) }}
            placeholder="Antwort schreiben …"
            className="flex-1 border border-black/12 px-3 py-2 text-[13px] outline-none focus:border-black/40 resize-none"
          />
          <button
            type="submit"
            disabled={!text.trim() || sendet}
            className="bg-black text-white border-0 px-4 py-2.5 flex items-center gap-2 disabled:opacity-30 flex-shrink-0"
            style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' }}
          >
            <Send size={13} strokeWidth={1.6} /> {sendet ? 'Sendet' : 'Senden'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function NachrichtenPanel() {
  const [reiter, setReiter] = useState('business')
  const [threads, setThreads] = useState([])
  const [offen, setOffen] = useState(null)
  const [laedt, setLaedt] = useState(true)
  const [fehler, setFehler] = useState(null)

  const laden = useCallback(async () => {
    setLaedt(true); setFehler(null)
    try { setThreads(await apiFetch(`/api/chat/threads?kategorie=${reiter}`)) }
    catch (e) { setFehler(e?.error || 'Die Verläufe konnten nicht geladen werden.') }
    finally { setLaedt(false) }
  }, [reiter])

  useEffect(() => { setOffen(null); laden() }, [laden])

  // Der Zähler an der Liste soll nach dem Lesen sofort stimmen, ohne dass
  // jemand neu lädt.
  const alsGelesen = useCallback((id) => {
    setThreads(ts => ts.map(t => t.id === id ? { ...t, ungelesen: 0 } : t))
  }, [])

  const offenerThread = threads.find(t => t.id === offen)

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Kopf */}
      <div className="flex-shrink-0 px-5 lg:px-8 pt-6 pb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <MessageSquare size={17} strokeWidth={1.4} className="text-black/70" />
            <h1 className="text-[15px] tracking-[0.18em] uppercase text-black">Nachrichten</h1>
          </div>
          <button onClick={laden} className="bg-transparent border-0 p-1.5 text-black/40 hover:text-black" aria-label="Neu laden">
            <RefreshCw size={15} strokeWidth={1.5} />
          </button>
        </div>
        <p className="text-[11px] text-black/35 font-light mt-1.5">
          Gespräche mit Firmen, Affiliates und Kunden — getrennt, weil sie verschieden beantwortet werden.
        </p>

        <div className="flex gap-1 mt-4 border-b border-black/8">
          {REITER.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setReiter(key)}
              className={`flex items-center gap-2 px-4 py-2.5 bg-transparent border-0 border-b-2 -mb-px transition-colors ${
                reiter === key ? 'border-black text-black' : 'border-transparent text-black/35 hover:text-black/60'
              }`}
              style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' }}
            >
              <Icon size={14} strokeWidth={1.5} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Inhalt */}
      <div className="flex-1 min-h-0 px-5 lg:px-8 pb-6">
        {fehler && <p className="text-[12px] text-red-600/80">{fehler}</p>}
        {laedt ? (
          <p className="text-[12px] text-black/30">Wird geladen …</p>
        ) : threads.length === 0 ? (
          <p className="text-[12px] text-black/30">Hier gibt es noch keine Gespräche.</p>
        ) : (
          <div className="flex h-full min-h-0 border border-black/8">
            {/* Liste — auf dem Telefon nur, solange kein Verlauf offen ist */}
            <div className={`${offen ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-[320px] flex-shrink-0 lg:border-r border-black/8 overflow-y-auto`}>
              {threads.map(t => (
                <button
                  key={t.id}
                  onClick={() => setOffen(t.id)}
                  className={`text-left bg-transparent border-0 border-b border-black/5 px-4 py-3 hover:bg-black/[0.02] ${
                    offen === t.id ? 'lg:bg-black/[0.04]' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] text-black truncate">{anzeigeName(t)}</span>
                    <span className="text-[9px] text-black/30 flex-shrink-0">{zeit(t.last_message_at)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="text-[11px] text-black/40 font-light truncate">
                      {t.letzter_von === 'team' ? 'Sie: ' : ''}{t.letzter_text || '—'}
                    </span>
                    {t.ungelesen > 0 && (
                      <span className="flex-shrink-0 bg-black text-white text-[9px] min-w-[16px] h-4 px-1 flex items-center justify-center">
                        {t.ungelesen}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Verlauf */}
            <div className={`${offen ? 'flex' : 'hidden lg:flex'} flex-col flex-1 min-w-0 min-h-0`}>
              {offenerThread ? (
                <>
                  <div className="flex-shrink-0 flex items-center gap-2 px-4 lg:px-6 py-3 border-b border-black/8">
                    <button
                      onClick={() => setOffen(null)}
                      className="lg:hidden bg-transparent border-0 p-1 -ml-1 text-black"
                      aria-label="Zurück zur Liste"
                    >
                      <ChevronLeft size={18} strokeWidth={1.5} />
                    </button>
                    <div className="min-w-0">
                      <p className="text-[13px] text-black truncate">{anzeigeName(offenerThread)}</p>
                      <p className="text-[10px] text-black/35 truncate">{offenerThread.user_email}</p>
                    </div>
                  </div>
                  <Verlauf threadId={offenerThread.id} onGelesen={alsGelesen} />
                </>
              ) : (
                <div className="hidden lg:flex flex-1 items-center justify-center">
                  <p className="text-[12px] text-black/25">Wählen Sie links ein Gespräch.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
