/**
 * MassNehmen — die zwei Maße, Schritt für Schritt beim Scrollen.
 *
 * ── Dieselbe Mechanik, das dritte Mal ─────────────────────────────────────
 *
 * Aufbau, Stapel und Pflege kleben schon auf einer Bühne (lib/scrollbuehne.js).
 * Eine vierte Folge derselben Bauart ist die Stelle, an der ein Mittel zur
 * Masche wird — deshalb ist diese hier bewusst die kürzeste: drei Schritte
 * statt fünf bis sieben, und die Bühne bekommt je Schritt weniger Strecke.
 * Der Abschnitt ist damit rund zweieinhalb Bildschirme lang und nicht fünf.
 *
 * Der Grund, sie trotzdem zu bauen: An dieser Stelle bricht ein Kauf ab.
 * „Fußlänge und Ballenumfang" steht viermal auf der Seite, und bis hierher
 * stand nirgends, wie man drankommt. Ein Absatz beantwortet das schlechter
 * als eine Zeichnung, auf der nacheinander genau das hervortritt, wovon
 * gerade die Rede ist — auf einer Skizze mit zwei Maßen weiß sonst niemand,
 * welches gemeint ist.
 *
 * ── Warum die Liste links steht und nicht ein Balken ──────────────────────
 *
 * Wie bei der Pflege: Die Frage lautet nicht „wie weit bin ich", sondern
 * „wie viel kommt noch". Drei Zeilen untereinander beantworten das im
 * Moment, in dem der Abschnitt ins Bild kommt — ein Balken erst am Ende.
 *
 * ── Ohne Bewegung ────────────────────────────────────────────────────────
 *
 * Wer `prefers-reduced-motion` meldet, bekommt die fertige Zeichnung und die
 * drei Schritte als Liste. Nicht eine abgespeckte Fassung, sondern eine, die
 * ohne Bewegung vollständig ist — dasselbe sieht der Vorrenderer.
 */
import { useMemo, useRef } from 'react'
import MassAnleitung from './MassAnleitung'
import Enthuellen from './Enthuellen'
import { MASSNEHMEN, BEIDE_FUESSE } from '../lib/massSchritte'
import { useWenigerBewegung } from '../lib/bewegung'
import { useScrollBuehne } from '../lib/scrollbuehne'

/* Vor- und Nachlauf, damit die Folge nicht anfängt, bevor der Abschnitt im
   Bild ist, und am Ende einen Moment stehen bleibt.

   Der Nachlauf war 0,12 und ist kürzer geworden — siehe die Rechnung unten.
   Er und der Vorlauf nehmen dem mittleren Schritt am meisten weg: Der erste
   und der letzte bekommen zusätzlich die Strecke, auf der die Bühne noch
   nicht oder nicht mehr klebt, der mittlere nichts davon. */
const VORLAUF = 0.10
const NACHLAUF = 0.08

/* Strecke je Schritt.

   Hier stand 0,34 — knapper als bei den anderen Folgen, mit dem Gedanken,
   dass hier nichts aufgebaut wird, sondern nur das Bild wechselt. Nachgemessen
   war das falsch: Bei 0,34 und drei Schritten bleiben nach Abzug der
   Bühnenhöhe rund 870 Pixel zum Verteilen, und davon fielen auf den
   MITTLEREN Schritt 240. Ein Schritt, der 240 Pixel lang ist, wird bei
   jedem zügigen Wischen übersprungen — wer schnell scrollt, sah „Umriss"
   und dann „Ballenumfang", und das Lineal nie.
   
   Der erste und der letzte Schritt fallen das nicht auf, weil sie die
   Strecke davor und danach mitbekommen, auf der die Bühne noch nicht oder
   nicht mehr klebt. Gemessen wird deshalb am mittleren. Mit 0,60 bekommt
   er rund 400 Pixel, also etwa einen halben Bildschirm. */
const PRO_SCHRITT = 0.60

function schrittAus(fortschritt) {
  const roh = (fortschritt - VORLAUF) / (1 - VORLAUF - NACHLAUF)
  const n = Math.floor(roh * MASSNEHMEN.length)
  return Math.min(MASSNEHMEN.length - 1, Math.max(0, n))
}

/** Die drei Schritte als Liste, der aktuelle vorn. */
function Folgeliste({ schritt }) {
  return (
    <ol className="space-y-5">
      {MASSNEHMEN.map((s, i) => {
        const jetzt = i === schritt
        return (
          <li key={s.titel} className="transition-opacity duration-500" style={{ opacity: jetzt ? 1 : 0.3 }}>
            <p className="text-[10px] uppercase tracking-[0.24em] text-black/45">{s.wann}</p>
            <p className={`satz-titel leading-[1.3] mt-1.5 transition-all duration-500 ${
              jetzt ? 'text-[19px] lg:text-[22px] text-black' : 'text-[17px] lg:text-[19px] text-black/70'
            }`}>
              {s.titel}
            </p>
          </li>
        )
      })}
    </ol>
  )
}

/** Die Fassung ohne Bewegung: fertige Zeichnung, drei Schritte als Liste. */
function OhneBewegung({ kopf, fuss }) {
  return (
    <div className="px-5 lg:px-16 py-16 lg:py-28">
      <div className="max-w-5xl mx-auto">
        {kopf}
        <div className="mt-12 lg:mt-16 text-black">
          <MassAnleitung className="max-w-[300px] mx-auto" />
        </div>
        <ol className="grid sm:grid-cols-3 gap-x-12 gap-y-8 mt-12 lg:mt-16">
          {MASSNEHMEN.map(s => (
            <li key={s.titel}>
              <p className="text-[10px] uppercase tracking-[0.24em] text-black/45">{s.wann}</p>
              <p className="satz-titel text-[19px] lg:text-[22px] text-black mt-2">{s.titel}</p>
              <p className="text-[13px] text-black/50 font-light leading-[1.85] mt-2">{s.text}</p>
            </li>
          ))}
        </ol>
        <p className="text-[13px] text-black/45 font-light leading-[1.9] mt-10 max-w-lg">
          {BEIDE_FUESSE}
        </p>
        {fuss && <div className="mt-14 lg:mt-20">{fuss}</div>}
      </div>
    </div>
  )
}

/**
 * @param {React.ReactNode} kopf Marke, Überschrift, Vorspann.
 * @param {React.ReactNode} fuss Was unter der Folge steht.
 */
export default function MassNehmen({ kopf, fuss }) {
  const ref = useRef(null)
  const ruhig = useWenigerBewegung()
  const { fortschritt, buehnenHoehe, buehnenOben } = useScrollBuehne(ref, ruhig)

  const schritt = useMemo(() => schrittAus(fortschritt), [fortschritt])

  if (ruhig) return <OhneBewegung kopf={kopf} fuss={fuss} />

  return (
    <>
      <Enthuellen>
        <div className="px-5 lg:px-16 pt-16 lg:pt-28 pb-6 lg:pb-10">
          <div className="max-w-6xl mx-auto">{kopf}</div>
        </div>
      </Enthuellen>

      <div
        ref={ref}
        className="relative h-[200vh] lg:h-[210vh]"
        style={buehnenHoehe ? { height: buehnenHoehe * (1 + MASSNEHMEN.length * PRO_SCHRITT) } : undefined}
      >
        <div
          className="sticky flex flex-col justify-center overflow-hidden px-5 lg:px-16 py-12 lg:py-16"
          style={{ top: buehnenOben, ...(buehnenHoehe ? { height: buehnenHoehe } : null) }}
        >
          <div className="w-full max-w-6xl mx-auto lg:grid lg:grid-cols-12 lg:gap-14 lg:items-center">
            {/* Links der ganze Ablauf. Auf dem Telefon hat er keinen Platz
                neben der Zeichnung — dort steht unter dem Bild nur der
                Schritt, der gerade dran ist. */}
            <div className="hidden lg:block lg:col-span-4">
              <Folgeliste schritt={schritt} />
            </div>

            <div className="lg:col-span-8 text-black">
              {/* Hochformat, 450 zu 569. Ohne Deckel wird aus der vollen
                  Spaltenbreite eine Zeichnung, die höher ist als das
                  Fenster — die anderen Tafeln dieser Seite sind breit und
                  vertragen `w-full`, diese nicht. */}
              <MassAnleitung
                schritt={schritt}
                className="w-full max-w-[236px] sm:max-w-[272px] lg:max-w-[312px] mx-auto"
              />

              {/* Fester Kasten, damit die Zeichnung nicht springt, wenn ein
                  Text eine Zeile länger ist als der andere. */}
              <div className="relative mt-8 lg:mt-6 min-h-[168px] sm:min-h-[124px] lg:min-h-[104px]">
                {MASSNEHMEN.map((s, i) => (
                  <div
                    key={s.titel}
                    aria-hidden={i !== schritt}
                    className="absolute inset-0 transition-opacity duration-500"
                    style={{ opacity: i === schritt ? 1 : 0, pointerEvents: i === schritt ? 'auto' : 'none' }}
                  >
                    <p className="lg:hidden text-[10px] uppercase tracking-[0.24em] text-black/45">{s.wann}</p>
                    <p className="lg:hidden satz-titel text-[20px] text-black leading-[1.3] mt-1.5">{s.titel}</p>
                    <p className="text-[13px] lg:text-[14px] text-black/55 font-light leading-[1.85] mt-2.5 lg:mt-0 max-w-xl">
                      {s.text}
                    </p>
                  </div>
                ))}
              </div>

              {/* Gilt für alle drei Schritte und steht deshalb fest da,
                  nicht in der wechselnden Folge. */}
              <p className="text-[12px] lg:text-[13px] text-black/40 font-light leading-[1.85] mt-5 max-w-xl">
                {BEIDE_FUESSE}
              </p>
            </div>
          </div>
        </div>
      </div>

      {fuss && (
        <Enthuellen>
          <div className="px-5 lg:px-16 pt-4 pb-16 lg:pb-28">
            <div className="max-w-6xl mx-auto">{fuss}</div>
          </div>
        </Enthuellen>
      )}
    </>
  )
}
