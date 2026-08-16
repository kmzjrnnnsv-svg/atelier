/**
 * CookieHinweis — was wir im Endgerät ablegen, in einem Satz und in ganzer Länge.
 *
 * Kein Vorhang vor dem Laden: Der Hinweis liegt unten, verdeckt nichts und
 * hält niemanden auf. Das darf er, weil hier nichts zu erlauben ist, was ohne
 * Erlaubnis liefe — die Anwendung speichert nur, was sie zum Funktionieren
 * braucht (siehe lib/einwilligung.js). Ein Banner, das die Seite blockiert,
 * bis jemand „Alle akzeptieren" drückt, wäre für diesen Sachverhalt eine
 * Inszenierung.
 *
 * Was er tut: aufklären, die Entscheidung entgegennehmen und sie belegbar
 * festhalten. Und er kommt wieder, wenn sich der Wortlaut ändert.
 */
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { KATEGORIEN, gibtEsWahl, entscheidung, festhalten } from '../lib/einwilligung'

export default function CookieHinweis() {
  const [offen, setOffen]       = useState(false)
  const [details, setDetails]   = useState(false)
  const [gespeichert, setGesp]  = useState(false)

  useEffect(() => {
    // Nicht sofort: Der erste Eindruck gehört dem Laden, nicht der Verwaltung.
    const t = setTimeout(() => { if (!entscheidung()) setOffen(true) }, 900)
    const wieder = () => { setDetails(true); setOffen(true) }
    window.addEventListener('as:einwilligung-oeffnen', wieder)
    return () => { clearTimeout(t); window.removeEventListener('as:einwilligung-oeffnen', wieder) }
  }, [])

  const waehlen = async (art) => {
    setGesp(true)
    await festhalten(art)
    setOffen(false)
    setGesp(false)
    setDetails(false)
  }

  if (!offen) return null
  const wahl = gibtEsWahl()

  return (
    <div
      role="dialog"
      aria-label="Hinweis zur Speicherung im Endgerät"
      className="fixed inset-x-0 bottom-0 z-[900] p-3 sm:p-4"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto max-w-3xl bg-white border border-black/10 shadow-[0_2px_30px_rgba(0,0,0,0.08)]">
        <div className="px-5 py-4 sm:px-7 sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[9px] text-black/30 uppercase tracking-[0.25em] font-light mb-2">
                Speicherung im Endgerät
              </p>
              <p className="text-[13px] text-black/70 font-light leading-[1.7] max-w-xl">
                Wir speichern nur, was der Laden zum Arbeiten braucht: Ihre Anmeldung,
                Ihren Warenkorb und diese Entscheidung.{' '}
                <span className="text-black">Keine Analyse, keine Werbung, kein Tracking</span>{' '}
                — und was wir speichern, bleibt bei uns.
              </p>
            </div>
            <button
              onClick={() => waehlen(wahl ? 'notwendig' : 'notwendig')}
              aria-label="Hinweis schließen"
              className="w-8 h-8 flex-shrink-0 flex items-center justify-center text-black/30 hover:text-black bg-transparent border-0"
            >
              <X size={15} strokeWidth={1.4} />
            </button>
          </div>

          {details && (
            <div className="mt-4 border-t border-black/[0.06] pt-4 space-y-3">
              {KATEGORIEN.map(k => (
                <div key={k.key} className="flex items-start gap-3">
                  <span className="mt-0.5 text-[9px] tracking-[0.16em] uppercase border border-black/15 px-1.5 py-0.5 text-black/50 whitespace-nowrap">
                    {k.aktivierbar ? 'Wählbar' : 'Immer an'}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12px] text-black/75 font-light">{k.titel}</p>
                    <p className="text-[11px] text-black/40 font-light leading-[1.7]">{k.text}</p>
                    <p className="text-[10px] text-black/30 font-light mt-0.5">{k.beispiele}</p>
                  </div>
                </div>
              ))}
              {/* Ehrlich bis zum Rand: Solange auf einzelnen Flächen noch
                  Platzhalterfotos eines fremden Anbieters liegen, gehört das
                  hierher und nicht nur ins Kleingedruckte. */}
              <p className="text-[11px] text-black/40 font-light leading-[1.7]">
                Auf einzelnen Flächen liegen noch Platzhalter-Fotos von Unsplash,
                bis eigene Aufnahmen hinterlegt sind. Deren Server erfährt dabei
                Ihre IP-Adresse. Cookies setzt er nicht.
              </p>
              <p className="text-[11px] text-black/40 font-light leading-[1.7]">
                Ihre Entscheidung halten wir zum Nachweis fest — mit Zeitpunkt und
                Wortlaut, aber ohne Ihren Namen. Sie können sie jederzeit über die
                Fußzeile widerrufen. Mehr dazu in der{' '}
                <Link to="/legal/datenschutz" className="underline text-black/60 hover:text-black">
                  Datenschutzerklärung
                </Link>.
              </p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {wahl && (
              <button
                onClick={() => waehlen('notwendig')}
                disabled={gespeichert}
                className="h-11 px-6 border border-black/15 text-[10px] tracking-[0.18em] uppercase font-light text-black/55 hover:border-black hover:text-black bg-transparent disabled:opacity-40"
              >
                Nur notwendige
              </button>
            )}
            <button
              onClick={() => waehlen(wahl ? 'alle' : 'notwendig')}
              disabled={gespeichert}
              className="h-11 px-8 bg-black text-white text-[10px] tracking-[0.18em] uppercase font-light border-0 disabled:opacity-40"
            >
              {wahl ? 'Alle annehmen' : 'Verstanden'}
            </button>
            <button
              onClick={() => setDetails(d => !d)}
              className="h-11 px-3 text-[10px] tracking-[0.18em] uppercase font-light text-black/35 hover:text-black bg-transparent border-0"
            >
              {details ? 'Weniger' : 'Was heißt das?'}
            </button>
            <Link
              to="/legal/datenschutz"
              className="h-11 px-3 flex items-center text-[10px] tracking-[0.18em] uppercase font-light text-black/35 hover:text-black no-underline"
            >
              Datenschutz
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
