/**
 * SchrittMenue — alle Schritte auf einen Blick, mit dem, was gewählt ist.
 *
 * Wer bei Schritt 7 merkt, dass er das Leder doch anders will, soll nicht
 * sechsmal zurückklicken. Erreichbar ist jeder Schritt, vor dem alles
 * gewählt ist; die übrigen stehen da, damit man sieht, was noch kommt.
 */
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Check, X } from 'lucide-react'

export default function SchrittMenue({ offen, schritte, aktuell, erreichbar, onSprung, onClose }) {
  const flaeche = useRef(null)

  useEffect(() => {
    if (!offen) return
    const taste = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', taste)
    flaeche.current?.querySelector('button')?.focus()
    return () => window.removeEventListener('keydown', taste)
  }, [offen, onClose])

  if (!offen) return null

  return createPortal((
    <div className="fixed inset-0 z-[120] flex items-end sm:items-stretch sm:justify-end" role="dialog" aria-modal="true" aria-label="Alle Schritte">
      <div className="absolute inset-0 bg-[rgba(29,23,20,0.45)]" onClick={onClose} />
      <div ref={flaeche} className="haus relative w-full sm:w-[420px] max-h-[85vh] sm:max-h-none overflow-y-auto g-angebot shadow-[0_-12px_60px_rgba(29,23,20,0.3)]">
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <p className="t-lead c-tinte">Alle Schritte</p>
          <button type="button" onClick={onClose} aria-label="Schließen"
            className="w-11 h-11 -mr-2 flex items-center justify-center bg-transparent border-0 c-leise hover:text-black">
            <X size={20} strokeWidth={1.4} />
          </button>
        </div>
        <ol className="px-3 pb-6">
          {schritte.map((s, i) => {
            const frei = erreichbar(i)
            const jetzt = s.key === aktuell
            return (
              <li key={s.key}>
                <button
                  type="button"
                  disabled={!frei}
                  onClick={() => { onSprung(s.key); onClose() }}
                  aria-current={jetzt ? 'step' : undefined}
                  className={`w-full min-h-14 flex items-center gap-4 px-3 py-3 text-left bg-transparent border-0 transition-colors disabled:opacity-40 ${
                    jetzt ? 'g-erzaehlung' : 'hover:bg-black/[0.04]'
                  }`}
                >
                  <span className="t-klein c-leise tabular-nums w-6 shrink-0">{i + 1}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block t-text c-tinte">{s.titel}</span>
                    {s.wahl && <span className="block t-klein c-leise truncate">{s.wahl}</span>}
                  </span>
                  {s.fertig && <Check size={18} strokeWidth={1.6} className="c-tinte shrink-0" />}
                </button>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  ), document.body)
}
