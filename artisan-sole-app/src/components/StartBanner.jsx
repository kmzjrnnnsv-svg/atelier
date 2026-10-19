/**
 * StartBanner.jsx — der Streifen ganz oben, auf jeder Seite des Ladens.
 *
 * ── Warum er von unter dem Aufmacher hierher gewandert ist ────────────────
 *
 * Der Hinweis auf den Verkaufsstart stand zuerst als Band unter dem
 * Aufmacher der Startseite, später zusätzlich auf der Kollektionsseite und
 * in der Kasse. Drei Einbauten, drei Stellen zum Vergessen — und immer noch
 * Seiten ohne ihn: Modellseiten, Zubehör, der Konfigurator.
 *
 * Hier steht er einmal, über der Navigation, und gilt überall. Das ist
 * dieselbe Stelle und dieselbe Bauart wie der Streifen für Empfehlungen
 * (siehe VermittlerBanner.jsx); zwei Streifen an zwei verschiedenen Orten
 * wären zwei Gestaltungen für dieselbe Sache.
 *
 * ── Warum er mitscrollt und nicht klebt ──────────────────────────────────
 *
 * Er steht im Fluss, über der klebenden Kopfzeile. Wer ihn gelesen hat,
 * scrollt ihn weg und bekommt die volle Höhe zurück. Ein zweiter klebender
 * Streifen über der Kopfzeile nähme auf einem Telefon dauerhaft ein Zehntel
 * des Bildes — und die klebenden Bühnen der Startseite messen ihren Anfang
 * an `data-kopfleiste`, nicht an diesem Band.
 *
 * ── Kein Kreuz zum Schließen ─────────────────────────────────────────────
 *
 * Bewusst nicht: Es ist kein Angebot, dem man ausweichen können muss,
 * sondern die Angabe, ab wann der Laden liefert. Wer sie wegklickt und zwei
 * Seiten später bestellt, hat sie nie gesehen. Der Schalter dafür sitzt in
 * der Verwaltung (CMS → Kontakt & Hinweis), wo er hingehört.
 *
 * Inhalt und Nummer kommen aus derselben Einstellung wie zuvor. Ist beides
 * leer, erscheint nichts — kein leerer Streifen über der Navigation.
 */
import { useState, useEffect } from 'react'
import { apiFetch } from '../hooks/useApi'

/* wa.me will nur Ziffern mit Landesvorwahl. Im CMS steht die Nummer so, wie
   ein Mensch sie schreibt. */
const waZiffern = (s) => String(s || '').replace(/[^0-9]/g, '')

export default function StartBanner() {
  const [stand, setStand] = useState(null)

  useEffect(() => {
    let verworfen = false
    apiFetch('/api/settings/hinweis')
      .then(d => { if (!verworfen) setStand(d) })
      .catch(() => { /* Ohne Antwort bleibt der Streifen weg. */ })
    return () => { verworfen = true }
  }, [])

  if (!stand) return null
  const text = stand.an ? String(stand.text || '').trim() : ''
  const ziffern = waZiffern(stand.whatsapp)
  if (!text && !ziffern) return null

  return (
    // `role="region"` mit Namen: Wer mit einer Vorlesehilfe durch die
    // Bereiche springt, soll wissen, was dieser Streifen ist, statt eine
    // namenlose Zeile vor der Navigation zu finden.
    <aside aria-label="Hinweis zum Verkaufsstart" className="w-full g-dunkel c-hell">
      <div className="max-w-[1400px] mx-auto px-5 lg:px-16 py-2.5 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-6">
        {text && (
          <p className="t-klein c-hell flex-1 min-w-0">
            {text}
          </p>
        )}

        {ziffern && (
          // Ein echter Link, kein Knopf mit onClick: Das Ziel liegt außerhalb
          // der Seite, und wer lange drückt, soll es kopieren können.
          // `noreferrer` sagt WhatsApp nicht, von welcher Seite aus geschrieben
          // wurde.
          <a
            href={`https://wa.me/${ziffern}`}
            target="_blank"
            rel="noopener noreferrer"
            className="t-klein group shrink-0 inline-flex items-center gap-2 c-hell hover:text-white"
          >
            <span className="underline underline-offset-4 decoration-1">
              {stand.whatsappSatz || 'Fragen? Schreib uns auf WhatsApp.'}
            </span>
            {/* Haarstrich mit Spitze, wie an den Türen der Startseite.
                `aria-hidden`, weil der Link seinen Namen schon im Text hat. */}
            <span className="inline-flex items-center" aria-hidden="true">
              <span className="block h-px w-3 bg-current transition-[width] duration-500 ease-out group-hover:w-5" />
              <span className="block w-[4px] h-[4px] -ml-[3px] border-t border-r border-current rotate-45" />
            </span>
          </a>
        )}
      </div>
    </aside>
  )
}
