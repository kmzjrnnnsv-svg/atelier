/**
 * ChatFenster — das Gespräch mit dem Haus, von der Seite eingeschoben.
 *
 * Dieselbe Ansicht für Kunden, Firmen und Affiliates: Es ist für alle drei
 * dasselbe Gespräch mit derselben Stelle, nur der Einstieg unterscheidet sich.
 *
 * Auf dem Telefon nimmt es den ganzen Bildschirm ein. Ein 400 Pixel breites
 * Fenster am Rand ist dort nicht schmal, sondern unbenutzbar: Die Tastatur
 * verdeckt die Hälfte, und zum Schreiben bleibt eine Spalte von wenigen
 * Zeichen.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Send, MessageSquare } from 'lucide-react'
import { apiFetch } from '../hooks/useApi'

const zeit = (s) => {
  if (!s) return ''
  const d = new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z')
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

/**
 * Zahl der ungelesenen Antworten, regelmäßig nachgefragt.
 *
 * Ohne das Nachfragen erführe der Kunde von einer Antwort erst, wenn er von
 * sich aus nachsieht — und genau das tut niemand, der auf Antwort wartet.
 */
export function useUngelesen(aktiv = true) {
  const [n, setN] = useState(0)
  const holen = useCallback(() => {
    if (!aktiv) return
    apiFetch('/api/chat/mine/ungelesen').then(d => setN(d?.ungelesen || 0)).catch(() => {})
  }, [aktiv])
  useEffect(() => {
    if (!aktiv) return
    holen()
    const t = setInterval(holen, 45000)
    return () => clearInterval(t)
  }, [aktiv, holen])
  return { ungelesen: n, neuLaden: holen }
}

export default function ChatFenster({ offen, onClose, onGelesen }) {
  const [nachrichten, setNachrichten] = useState(null)
  const [text, setText] = useState('')
  const [sendet, setSendet] = useState(false)
  const [fehler, setFehler] = useState(null)
  const endeRef = useRef(null)

  const laden = useCallback(async () => {
    try {
      const d = await apiFetch('/api/chat/mine')
      setNachrichten(d.messages || [])
      onGelesen?.()
    } catch (e) {
      setFehler(e?.error || 'Der Verlauf konnte nicht geladen werden.')
      setNachrichten([])
    }
  }, [onGelesen])

  useEffect(() => { if (offen) { setFehler(null); laden() } }, [offen, laden])
  useEffect(() => { if (offen) endeRef.current?.scrollIntoView({ block: 'end' }) }, [nachrichten, offen])

  // Solange das Fenster offen ist, bleibt die Seite dahinter stehen.
  useEffect(() => {
    if (!offen) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [offen])

  useEffect(() => {
    if (!offen) return
    const zu = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', zu)
    return () => window.removeEventListener('keydown', zu)
  }, [offen, onClose])

  const senden = async (e) => {
    e.preventDefault()
    const inhalt = text.trim()
    if (!inhalt || sendet) return
    setSendet(true); setFehler(null)
    try {
      const d = await apiFetch('/api/chat/mine', { method: 'POST', body: JSON.stringify({ text: inhalt }) })
      setNachrichten(d.messages || [])
      setText('')
    } catch (e) {
      setFehler(e?.error || 'Die Nachricht konnte nicht gesendet werden.')
    } finally { setSendet(false) }
  }

  if (!offen) return null

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div
        className="relative bg-white flex flex-col w-full sm:w-[420px] h-full shadow-xl"
        style={{ animation: 'chatEin 240ms ease both' }}
      >
        <style>{`@keyframes chatEin { from { transform: translateX(20px); opacity: .6 } to { transform: none; opacity: 1 } }`}</style>

        <div className="flex-shrink-0 flex items-center justify-between px-5 border-b border-black/8" style={{ height: 56 }}>
          <div className="flex items-center gap-2.5">
            <MessageSquare size={16} strokeWidth={1.4} className="text-black/70" />
            <div>
              <p className="text-[12px] tracking-[0.16em] uppercase text-black">Artisan Sole</p>
              <p className="text-[10px] text-black/35 font-light">Wir antworten persönlich.</p>
            </div>
          </div>
          <button onClick={onClose} className="bg-transparent border-0 p-1.5 text-black/50 hover:text-black" aria-label="Chat schließen">
            <X size={18} strokeWidth={1.4} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {nachrichten === null ? (
            <p className="text-[12px] text-black/30">Wird geladen …</p>
          ) : nachrichten.length === 0 ? (
            <div className="py-8">
              <p className="text-[13px] text-black/60 font-light leading-relaxed">
                Schreiben Sie uns — zu Ihrer Bestellung, zur Passform oder zu allem, was offen ist.
              </p>
              <p className="text-[11px] text-black/30 font-light mt-2">
                Ihre Nachricht landet direkt bei uns, nicht in einem Postfach.
              </p>
            </div>
          ) : nachrichten.map(m => (
            <div key={m.id} className={`flex ${m.von === 'kunde' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-3.5 py-2.5 ${
                m.von === 'kunde' ? 'bg-black text-white' : 'bg-black/[0.04] text-black'
              }`}>
                <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">{m.text}</p>
                <p className={`text-[9px] mt-1.5 ${m.von === 'kunde' ? 'text-white/40' : 'text-black/30'}`}>
                  {m.von === 'kunde' ? 'Sie' : (m.autor_name || 'Artisan Sole')} · {zeit(m.created_at)}
                </p>
              </div>
            </div>
          ))}
          <div ref={endeRef} />
        </div>

        <form
          onSubmit={senden}
          className="flex-shrink-0 border-t border-black/8 p-3"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          {fehler && <p className="text-[11px] text-red-600/80 mb-2">{fehler}</p>}
          <div className="flex items-end gap-2">
            <textarea
              rows={2}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Ihre Nachricht …"
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
    </div>,
    document.body
  )
}
