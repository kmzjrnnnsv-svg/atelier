/**
 * Hinweisband — was gerade gilt, und wohin man schreiben kann.
 *
 * ── Warum es ganz oben steht ──────────────────────────────────────────────
 *
 * Ein Laden, der noch nicht verkauft, muss das an der Stelle sagen, an der
 * jeder hinsieht, und nicht im Kleingedruckten. Wer erst im Warenkorb merkt,
 * dass es noch nicht losgeht, kommt nicht wieder — und wer es gleich weiß,
 * sieht sich trotzdem um, weil die Seite ihm dann nichts vorgemacht hat.
 *
 * Deshalb direkt unter dem Aufmacher, vor der ersten Modellzeile: die einzige
 * Stelle, die man nicht verpassen kann, ohne zu scrollen.
 *
 * ── Warum ein Band und kein Kasten ────────────────────────────────────────
 *
 * Ein Kasten mit Rahmen und Ausrufezeichen ist ein Werbebanner, und
 * Werbebanner werden übersehen, weil jeder gelernt hat, sie zu übersehen.
 * Eine Zeile in der Schrift der Seite, auf dem Grund der Seite, zwischen zwei
 * Haarlinien — die liest man, weil sie aussieht wie der Rest.
 *
 * ── Warum beide Teile zusammen ────────────────────────────────────────────
 *
 * „Wir fangen im Februar an" ist eine halbe Nachricht. Die andere Hälfte ist
 * „und bis dahin erreichst du uns hier". Getrennt stünde da eine Absage; so
 * steht da ein Termin und eine Tür.
 *
 * Der Inhalt kommt aus der Verwaltung (CMS → Kontakt & Hinweis), weil er ein
 * Datum enthält. Ein Satz über den Februar, der im April noch im Quelltext
 * steht, lässt den Laden verlassen aussehen.
 *
 * Fehlt beides — Band aus und keine Nummer —, erscheint nichts. Kein leerer
 * Streifen, keine Haarlinie ohne Inhalt darüber.
 */
import { useState, useEffect } from 'react'
import Enthuellen from './Enthuellen'
import Strichpfeil from './Strichpfeil'
import { apiFetch } from '../hooks/useApi'

/* Was wa.me erwartet: nur Ziffern mit Landesvorwahl. Was jemand im CMS
   einträgt, hat Leerzeichen, Klammern oder ein Plus davor. */
const waZiffern = (s) => String(s || '').replace(/[^0-9]/g, '')

export default function Hinweisband() {
  const [stand, setStand] = useState(null)

  useEffect(() => {
    let verworfen = false
    apiFetch('/api/settings/hinweis')
      .then(d => { if (!verworfen) setStand(d) })
      .catch(() => { /* Ohne Antwort bleibt das Band weg. Siehe oben. */ })
    return () => { verworfen = true }
  }, [])

  if (!stand) return null

  const text = stand.an ? String(stand.text || '').trim() : ''
  const ziffern = waZiffern(stand.whatsapp)
  if (!text && !ziffern) return null

  return (
    <Enthuellen richtung="ruhig">
      <div className="px-5 lg:px-16 pt-10 lg:pt-12 pb-9 lg:pb-11 border-b border-black/[0.07]">
        {/* Nebeneinander, sobald Platz ist: Der Termin links, die Tür rechts.
            Auf dem Telefon untereinander — zwei Zeilen nebeneinander auf 390
            Pixel wären zwei Spalten mit je drei Wörtern. */}
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-5 sm:gap-10">
          {text && (
            <p className="text-[13px] lg:text-[15px] text-black/65 font-light leading-[1.8] max-w-xl">
              {text}
            </p>
          )}

          {ziffern && (
            <div className="shrink-0">
              {stand.whatsappSatz && (
                <p className="text-[12px] lg:text-[13px] text-black/40 font-light leading-[1.8] mb-2 sm:text-right">
                  {stand.whatsappSatz}
                </p>
              )}
              {/* Ein echter Link und kein Knopf: Das Ziel liegt außerhalb der
                  Seite, und wer lange drückt, soll es kopieren können.
                  `noreferrer` lässt WhatsApp nicht erfahren, von welcher
                  Seite aus geschrieben wurde. */}
              <a
                href={`https://wa.me/${ziffern}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-3 text-[11px] uppercase text-black hover:text-black/60 transition-colors no-underline"
                style={{ letterSpacing: '0.22em' }}
              >
                <span className="relative pb-1">
                  Auf WhatsApp schreiben
                  <span className="absolute left-0 bottom-0 h-px w-full bg-black/25 group-hover:bg-black/50 transition-colors" />
                </span>
                <Strichpfeil />
              </a>
            </div>
          )}
        </div>
      </div>
    </Enthuellen>
  )
}
