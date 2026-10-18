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
      {/* ── Im Neuentwurf ─────────────────────────────────────────────
          Der Hinweis ist das Erste, was jeder Besucher liest, und er war
          das Kälteste auf der Seite: ein Etikett in 9 px gesperrten
          Versalien, Text in 13 px Grau, ein schwarzer Knopf in 10 px. Und
          er lag mit 210 Pixeln Höhe über dem halben Aufmacher.

          Jetzt in der Schrift und den Farben des Hauses, lesbar ab 14 px,
          und flacher: Text und Knöpfe auf dem Schreibtisch in einer Zeile.
          Das Etikett ist weg — was es sagte, sagt der Satz selbst. */}
      <div className="mx-auto max-w-5xl g-angebot shadow-[0_8px_40px_rgba(35,28,23,0.14)]">
        <div className="px-5 py-4 sm:px-7 sm:py-5 lg:flex lg:items-center lg:gap-8">
          <div className="flex items-start justify-between gap-4 lg:flex-1">
            <div className="min-w-0">
              {/* ── Warum hier nicht mehr „keine Analyse" steht ──────────────

                  Der Satz stand so lange, wie überhaupt nichts gezählt wurde.
                  Seit es einen Seitenzähler gibt, wäre er spitzfindig: Der
                  Zähler legt nichts im Gerät ab und kennt niemanden, aber
                  „keine Analyse" würde ein Leser so verstehen, dass auch
                  nicht gezählt wird.

                  Also steht es jetzt da. Lieber ein Satz mehr als eine Zusage,
                  die man verteidigen muss — dasselbe Argument wie im Kapitel
                  „In eigener Sache" über das Wort „handgefertigt".

                  Was bleibt, ist das Entscheidende: kein Wiedererkennen. Die
                  Zahl weiß, dass eine Seite aufgerufen wurde, und nicht, von
                  wem. Siehe lib/seitenzaehler.js. */}
              <p className="t-klein c-tinte max-w-2xl">
                Wir speichern nur, was der Laden zum Arbeiten braucht: deine Anmeldung,
                deinen Warenkorb und diese Entscheidung.{' '}
                <span className="font-medium">Keine Werbung, kein Tracking, kein Wiedererkennen</span>,
                und was wir speichern, bleibt bei uns. Wie oft eine Seite aufgerufen
                wird, zählen wir — als nackte Zahl, ohne Kennung und ohne etwas in
                deinem Gerät.
              </p>
            </div>
            <button
              onClick={() => waehlen(wahl ? 'notwendig' : 'notwendig')}
              aria-label="Hinweis schließen"
              className="w-11 h-11 -mt-2 -mr-2 flex-shrink-0 flex items-center justify-center c-leise hover:text-black bg-transparent border-0 lg:hidden"
            >
              <X size={18} strokeWidth={1.4} />
            </button>
          </div>

          {details && (
            <div className="mt-5 space-y-4 lg:order-last lg:basis-full">
              {KATEGORIEN.map(k => (
                <div key={k.key} className="flex items-start gap-3">
                  <span className="t-klein c-tinte g-erzaehlung px-2.5 py-1 whitespace-nowrap">
                    {k.aktivierbar ? 'Wählbar' : 'Immer an'}
                  </span>
                  <div className="min-w-0">
                    <p className="t-klein c-tinte font-medium">{k.titel}</p>
                    <p className="t-klein c-tinte">{k.text}</p>
                    <p className="t-klein c-leise mt-0.5">{k.beispiele}</p>
                  </div>
                </div>
              ))}
              {/* Ehrlich bis zum Rand: Solange auf einzelnen Flächen noch
                  Platzhalterfotos eines fremden Anbieters liegen, gehört das
                  hierher und nicht nur ins Kleingedruckte. */}
              <p className="t-klein c-leise">
                Auf einzelnen Flächen liegen noch Platzhalter-Fotos von Unsplash,
                bis eigene Aufnahmen hinterlegt sind. Deren Server erfährt dabei
                Deine IP-Adresse. Cookies setzt er nicht.
              </p>
              <p className="t-klein c-leise">
                Deine Entscheidung halten wir zum Nachweis fest, mit Zeitpunkt und
                Wortlaut, aber ohne deinen Namen. Du kannst sie jederzeit über die
                Fußzeile widerrufen. Mehr dazu in der{' '}
                <Link to="/legal/datenschutz" className="underline underline-offset-4 c-tinte">
                  Datenschutzerklärung
                </Link>.
              </p>
            </div>
          )}

          <div className="mt-4 lg:mt-0 flex flex-wrap items-center gap-x-5 gap-y-2 shrink-0">
            {wahl && (
              <button
                onClick={() => waehlen('notwendig')}
                disabled={gespeichert}
                className="t-klein h-11 c-tinte underline underline-offset-4 bg-transparent border-0 p-0 hover:opacity-70 disabled:opacity-40"
              >
                Nur notwendige
              </button>
            )}
            <button
              onClick={() => waehlen(wahl ? 'alle' : 'notwendig')}
              disabled={gespeichert}
              className="t-klein h-11 px-7 g-akzent border-0 hover:opacity-90 disabled:opacity-40"
            >
              {wahl ? 'Alle annehmen' : 'Verstanden'}
            </button>
            <button
              onClick={() => setDetails(d => !d)}
              className="t-klein h-11 c-tinte underline underline-offset-4 bg-transparent border-0 p-0 hover:opacity-70"
            >
              {details ? 'Weniger' : 'Was heißt das?'}
            </button>
            <Link
              to="/legal/datenschutz"
              className="t-klein h-11 flex items-center c-tinte underline underline-offset-4 hover:opacity-70"
            >
              Datenschutz
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
