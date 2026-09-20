/**
 * StapelFolge — der Schuh legt sich auseinander, während man scrollt.
 *
 * ── Warum es diesen Abschnitt neben dem Handwerk gibt ─────────────────────
 *
 * Das Handwerkskapitel zeigt den Querschnitt: wie die Lagen ineinander-
 * greifen und wo die beiden Nähte sitzen. Es beantwortet „wie hält das
 * zusammen?". Offen bleibt „woraus besteht das eigentlich?" — denn ein
 * Querschnitt ist zwei Millimeter Schuh, und die Form eines Teils sieht man
 * darin nicht.
 *
 * Dieser Abschnitt legt dieselben Teile flach übereinander, mit ihren
 * eigenen Konturen, und läuft auf die Trennlinie hinaus: oben, was bleibt;
 * unten, was gewechselt wird. Das ist der Satz, an dem der Preis hängt, und
 * im Schnitt steht er nur zwischen den Zeilen.
 *
 * ── Warum ein drittes Mal dieselbe Mechanik ───────────────────────────────
 *
 * Weil sie stimmt: Eine Folge, die man mit dem Daumen steuert, liest sich
 * schneller als drei Absätze. Damit es trotzdem nicht dreimal dasselbe Bild
 * ist, liegt die Tafel hier links und hoch statt breit, und rechts steht nur
 * der eine Schritt, der gerade dran ist — kein Laufband, keine Liste. Die
 * Tafel selbst zählt mit: Man sieht am Stapel, wie viel noch fehlt.
 *
 * Ohne Bewegung und im Vorrenderer: der fertige Stapel und alle Schritte
 * als Liste.
 */
import { useMemo, useRef } from 'react'
import SohlenStapel from './SohlenStapel'
import Enthuellen from './Enthuellen'
import { STAPEL } from '../lib/stapelSchritte'
import { useWenigerBewegung, useSchmal } from '../lib/bewegung'
import { useScrollBuehne } from '../lib/scrollbuehne'

const VORLAUF = 0.08
const NACHLAUF = 0.12

/* Etwas mehr als bei den anderen beiden Folgen: Jeder Schritt legt hier ein
   ganzes Teil hin, und das will man ansehen, bevor das nächste kommt.

   Seit die Teile 92 Einheiten weit reisen und dafür gut acht Zehntelsekunden
   brauchen, ist das auch eine Frage der Ruhe: Bei 0,34 Bildschirmen je
   Schritt schnitt ein zügiger Daumen die Bewegung ab, und abgeschnittene
   Bewegung ist das Gegenteil von weich. */
const PRO_SCHRITT = 0.42

function schrittAus(fortschritt) {
  const roh = (fortschritt - VORLAUF) / (1 - VORLAUF - NACHLAUF)
  const n = Math.floor(roh * STAPEL.length)
  return Math.min(STAPEL.length - 1, Math.max(0, n))
}

/** Der Zähler: wie viele Teile liegen, wie viele kommen noch. */
function Zaehler({ schritt }) {
  return (
    <div className="flex items-center gap-2" aria-hidden="true">
      {STAPEL.map((s, i) => (
        <span
          key={s.titel}
          className="block h-px transition-all duration-500"
          style={{
            width: i === schritt ? 26 : 12,
            background: i <= schritt ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.16)',
          }}
        />
      ))}
    </div>
  )
}

/** Die Fassung ohne Bewegung: fertiger Stapel, alle Schritte als Liste. */
function OhneBewegung({ kopf, fuss }) {
  return (
    <div className="px-5 lg:px-16 py-16 lg:py-28">
      <div className="max-w-5xl mx-auto">
        {kopf}
        {/* Breiter als in der Folge: Hier trägt die Tafel die Beschriftung
            an beiden Rändern und hat keinen Text daneben, der ihr Platz
            wegnimmt. Bei max-w-md stießen „wird gewechselt" und die
            Laufsohle aneinander. */}
        <div className="mt-12 lg:mt-16">
          <SohlenStapel className="max-w-2xl mx-auto" />
        </div>
        <ol className="grid sm:grid-cols-2 gap-x-14 gap-y-8 mt-12 lg:mt-16 max-w-3xl">
          {STAPEL.map((s, i) => (
            <li key={s.titel}>
              <p className="text-[10px] tracking-[0.3em] text-black/30">
                {String(i + 1).padStart(2, '0')}
              </p>
              <p className="satz-titel text-[19px] lg:text-[22px] text-black mt-2">{s.titel}</p>
              <p className="text-[13px] text-black/50 font-light leading-[1.85] mt-2">{s.text}</p>
            </li>
          ))}
        </ol>
        {fuss && <div className="mt-14 lg:mt-20">{fuss}</div>}
      </div>
    </div>
  )
}

/**
 * @param {React.ReactNode} kopf Marke, Überschrift und Vorspann.
 * @param {React.ReactNode} fuss Was unter der Folge steht.
 */
export default function StapelFolge({ kopf, fuss }) {
  const ref = useRef(null)
  const ruhig = useWenigerBewegung()
  const schmal = useSchmal()
  const { fortschritt, buehnenHoehe } = useScrollBuehne(ref, ruhig)

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
        className="relative h-[340vh] lg:h-[360vh]"
        style={buehnenHoehe ? { height: buehnenHoehe * (1 + STAPEL.length * PRO_SCHRITT) } : undefined}
      >
        <div
          className="sticky top-0 flex flex-col justify-center overflow-hidden px-5 lg:px-16 py-10 lg:py-14"
          style={buehnenHoehe ? { height: buehnenHoehe } : undefined}
        >
          <div className="w-full max-w-6xl mx-auto lg:grid lg:grid-cols-12 lg:gap-10 lg:items-center">
            {/* Die Tafel steht links und hoch. Sie zählt selbst mit: Wie
                viel noch fehlt, sieht man am Stapel.

                Sieben von zwölf Spalten, nicht sechs: Seit die Teile
                beschriftet sind, trägt die Tafel an beiden Rändern Schrift,
                und die will gelesen werden. */}
            <div className="lg:col-span-7 text-black flex justify-center">
              <SohlenStapel
                schritt={schritt}
                schmal={schmal}
                className="w-full max-w-[300px] sm:max-w-[340px] lg:max-w-none"
              />
            </div>

            {/* Rechts nur der Schritt, der gerade dran ist. */}
            <div className="lg:col-span-4 lg:col-start-9 mt-8 lg:mt-0">
              <Zaehler schritt={schritt} />
              <div className="relative mt-6 min-h-[150px] sm:min-h-[120px]">
                {STAPEL.map((s, i) => (
                  <div
                    key={s.titel}
                    aria-hidden={i !== schritt}
                    className="absolute inset-0 transition-opacity duration-500"
                    style={{
                      opacity: i === schritt ? 1 : 0,
                      pointerEvents: i === schritt ? 'auto' : 'none',
                    }}
                  >
                    <p className="text-[10px] tracking-[0.3em] text-black/30">
                      {String(i + 1).padStart(2, '0')}
                    </p>
                    <p className="satz-titel text-[22px] lg:text-[30px] text-black leading-[1.2] mt-3">
                      {s.titel}
                    </p>
                    <p className="text-[13px] lg:text-[14px] text-black/55 font-light leading-[1.85] mt-3 max-w-sm">
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
