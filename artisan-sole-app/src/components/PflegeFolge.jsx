/**
 * PflegeFolge — der Spanner fährt ein, während man scrollt.
 *
 * ── Warum dieselbe Mechanik und trotzdem ein anderes Bild ─────────────────
 *
 * Der Schuhaufbau ist der Abschnitt, der diese Seite trägt: eine klebende
 * Bühne, auf der sich ein Schnitt Lage für Lage zusammensetzt. Es lag nahe,
 * die Pflege genauso zu bauen — und genau darin liegt die Gefahr. Derselbe
 * Trick zum zweiten Mal ist kein Trick mehr, sondern eine Schablone, und
 * eine Seite, die zweimal dasselbe macht, wirkt beim zweiten Mal gemacht.
 *
 * Deshalb: dieselbe Mechanik (lib/scrollbuehne.js), anderes Bild. Der Aufbau
 * ist dunkel, mittig und zählt einen Balken hoch; hier steht die Folge links
 * als Liste — alle fünf Schritte auf einmal sichtbar, der aktuelle hell, die
 * anderen zurückgenommen. Das ist kein Zierrat: Die Frage, die bei Pflege
 * jeder hat, lautet „wie oft?", und eine Liste mit fünf Abständen beantwortet
 * sie in dem Moment, in dem der Abschnitt ins Bild kommt — nicht erst, wenn
 * man bis zum Ende gescrollt hat.
 *
 * ── Was hier NICHT passiert ───────────────────────────────────────────────
 *
 * Es wird nichts entführt. Die Seite scrollt normal weiter; was klebt, ist
 * nur die Bühne, und der Abschnitt ist so lang, wie die Folge dauert.
 *
 * Wer keine Bewegung will (`prefers-reduced-motion`), bekommt gar keine
 * Bühne, sondern den gespannten Schuh und die fünf Schritte als Liste. Nicht
 * eine abgeschwächte Fassung — eine andere, die ohne Bewegung vollständig
 * ist. Dasselbe sieht der Vorrenderer, der nicht scrollt.
 */
import { useMemo, useRef } from 'react'
import SpannerSchnitt from './SpannerSchnitt'
import Enthuellen from './Enthuellen'
import { PFLEGE } from '../lib/pflegeSchritte'
import { useWenigerBewegung, useSchmal } from '../lib/bewegung'
import { useScrollBuehne } from '../lib/scrollbuehne'

/* Vorlauf und Nachlauf: Am Anfang steht der eingesackte Schuh einen Moment
   allein da, am Ende der gespannte. Ohne diese Ruhe beginnt die Folge, bevor
   der Abschnitt richtig im Bild ist. */
const VORLAUF = 0.08
const NACHLAUF = 0.10

/* Wie viel Bildschirmhöhe ein Schritt bekommt.

   0,32 war zu knapp, seit der Spanner von links einfährt: Er ist gut eine
   Sekunde unterwegs, und bei 0,32 Bildschirmen je Schritt schnitt ein
   zügiger Daumen ihn auf halbem Weg ab. Eine abgeschnittene Bewegung ist
   das Gegenteil von weich. */
const PRO_SCHRITT = 0.40

function schrittAus(fortschritt) {
  const roh = (fortschritt - VORLAUF) / (1 - VORLAUF - NACHLAUF)
  const n = Math.floor(roh * PFLEGE.length)
  return Math.min(PFLEGE.length - 1, Math.max(0, n))
}

/**
 * Die Folge als Liste: alle fünf Abstände auf einmal.
 *
 * Der aktuelle Schritt steht in voller Deckkraft, die anderen zurückgenommen
 * — man sieht, wo man ist, und gleichzeitig, wie lang der ganze Rhythmus
 * ist. Ein Balken könnte das Erste, aber nicht das Zweite.
 */
function Folgeliste({ schritt }) {
  return (
    <ol className="space-y-5">
      {PFLEGE.map((s, i) => {
        const jetzt = i === schritt
        return (
          <li
            key={s.titel}
            className="transition-opacity duration-500"
            style={{ opacity: jetzt ? 1 : 0.3 }}
          >
            <p className="text-[10px] uppercase tracking-[0.24em] text-white/45">{s.wann}</p>
            <p className={`satz-titel leading-[1.3] mt-1.5 transition-all duration-500 ${
              jetzt ? 'text-[19px] lg:text-[22px] text-white' : 'text-[17px] lg:text-[19px] text-white/70'
            }`}>
              {s.titel}
            </p>
          </li>
        )
      })}
    </ol>
  )
}

/** Die Fassung ohne Bewegung: gespannter Schuh, fünf Schritte als Liste. */
function OhneBewegung({ kopf, fuss }) {
  return (
    <div className="px-5 lg:px-16 py-16 lg:py-28">
      <div className="max-w-5xl mx-auto">
        {kopf}
        <div className="mt-12 lg:mt-16">
          <SpannerSchnitt className="max-w-2xl mx-auto" />
        </div>
        <ol className="grid sm:grid-cols-2 gap-x-14 gap-y-8 mt-12 lg:mt-16 max-w-3xl">
          {PFLEGE.map(s => (
            <li key={s.titel}>
              <p className="text-[10px] uppercase tracking-[0.24em] text-white/45">{s.wann}</p>
              <p className="satz-titel text-[19px] lg:text-[22px] text-white mt-2">{s.titel}</p>
              <p className="text-[13px] text-white/50 font-light leading-[1.85] mt-2">{s.text}</p>
            </li>
          ))}
        </ol>
        {fuss && <div className="mt-14 lg:mt-20">{fuss}</div>}
      </div>
    </div>
  )
}

/**
 * @param {React.ReactNode} kopf Marke, Überschrift und Vorspann. Sie stehen
 *   über der Bühne und kündigen an, was gleich passiert.
 * @param {React.ReactNode} fuss Was unter der Folge steht — hier das Zubehör.
 */
export default function PflegeFolge({ kopf, fuss }) {
  const ref = useRef(null)
  const ruhig = useWenigerBewegung()
  const schmal = useSchmal()
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
        className="relative h-[260vh] lg:h-[280vh]"
        style={buehnenHoehe ? { height: buehnenHoehe * (1 + PFLEGE.length * PRO_SCHRITT) } : undefined}
      >
        <div
          className="sticky flex flex-col justify-center overflow-hidden px-5 lg:px-16 py-12 lg:py-16"
          style={{ top: buehnenOben, ...(buehnenHoehe ? { height: buehnenHoehe } : null) }}
        >
          <div className="w-full max-w-6xl mx-auto lg:grid lg:grid-cols-12 lg:gap-14 lg:items-center">
            {/* Links der ganze Rhythmus. Auf dem Telefon hat er keinen Platz
                neben der Zeichnung — dort steht statt der Liste nur der
                Schritt, der gerade dran ist, unter dem Bild. */}
            <div className="hidden lg:block lg:col-span-4">
              <Folgeliste schritt={schritt} />
            </div>

            <div className="lg:col-span-8 text-white">
              <SpannerSchnitt schritt={schritt} schmal={schmal} className="w-full" />

              {/* Der Satz zum Schritt. Er steht in einem Kasten fester Höhe,
                  damit die Zeichnung nicht bei jedem Schritt springt, wenn
                  der eine Text eine Zeile länger ist als der andere. */}
              <div className="relative mt-8 lg:mt-6 min-h-[150px] sm:min-h-[112px] lg:min-h-[92px]">
                {PFLEGE.map((s, i) => (
                  <div
                    key={s.titel}
                    aria-hidden={i !== schritt}
                    className="absolute inset-0 transition-opacity duration-500"
                    style={{
                      opacity: i === schritt ? 1 : 0,
                      pointerEvents: i === schritt ? 'auto' : 'none',
                    }}
                  >
                    {/* Auf dem Telefon trägt dieser Kasten auch den Abstand
                        und den Titel — die Liste links gibt es dort nicht. */}
                    <p className="lg:hidden text-[10px] uppercase tracking-[0.24em] text-white/45">
                      {s.wann}
                    </p>
                    <p className="lg:hidden satz-titel text-[20px] text-white leading-[1.3] mt-1.5">
                      {s.titel}
                    </p>
                    <p className="text-[13px] lg:text-[14px] text-white/55 font-light leading-[1.85] mt-2.5 lg:mt-0 max-w-xl">
                      {s.text}
                    </p>
                  </div>
                ))}
              </div>
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
