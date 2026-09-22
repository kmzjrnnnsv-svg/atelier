/**
 * SchuhAufbau — der Schnitt setzt sich zusammen, während man scrollt.
 *
 * ── Warum ─────────────────────────────────────────────────────────────────
 *
 * Von allen Abschnitten dieser Startseite trägt einer, und es ist der mit der
 * Zeichnung. Sie zeigte bisher den fertigen Aufbau auf einmal — richtig für
 * ein Nachschlagewerk, aber sie verschenkte, was ein Schnitt eigentlich kann:
 * Er besteht aus Lagen, und diese Lagen entstehen in einer Reihenfolge. Genau
 * in der, in der ein Schuhmacher sie anlegt.
 *
 * Wer diese Reihenfolge sieht, versteht in zwanzig Sekunden, wofür sonst zwei
 * Absätze nötig sind — und er bleibt dabei, weil er das Ende sehen will. Das
 * ist der ganze Trick der Seiten, die man gern besucht: Sie geben dem
 * Scrollen eine Aufgabe.
 *
 * ── Was hier NICHT passiert ───────────────────────────────────────────────
 *
 * Es wird nichts entführt. Die Seite scrollt normal weiter; was klebt, ist
 * nur die Bühne, und der Abschnitt ist so lang, wie die Folge dauert — sechs
 * Schritte, dann geht es weiter. Kein Scroll-Jacking, keine erzwungene
 * Geschwindigkeit, keine Stelle, an der man festhängt.
 *
 * Und wer keine Bewegung will (`prefers-reduced-motion`), bekommt gar keine
 * Bühne: Dann steht der fertige Schnitt da, mit allen sechs Schritten als
 * Liste darunter. Nicht eine abgeschwächte Fassung — eine andere, die ohne
 * Bewegung vollständig ist. Dasselbe gilt für den Vorrenderer, der nicht
 * scrollt: Er sieht denselben vollständigen Zustand.
 *
 * ── Warum die Bühnenhöhe gemessen und nicht gesetzt wird ──────────────────
 *
 * `h-screen` wäre falsch. Diese Anwendung scrollt nicht das Dokument, sondern
 * einen Kasten zwischen Kopfleiste und Rand (App.jsx). Eine Bühne von 100 vh
 * ist höher als dieser Kasten und bleibt deshalb nicht stehen, sondern
 * wandert beim Scrollen mit — der Wackler, den man auf vielen Seiten sieht.
 * Die Höhe kommt daher aus der Messung (siehe lib/scrollbuehne.js).
 */
import { useMemo, useRef } from 'react'
import RahmenSchnitt from './RahmenSchnitt'
import Kapitelmarke from './Kapitelmarke'
import Enthuellen from './Enthuellen'
import Laufband from './Laufband'
import { AUFBAU } from '../lib/aufbauSchritte'
import { useWenigerBewegung, useSchmal } from '../lib/bewegung'
import { useScrollBuehne } from '../lib/scrollbuehne'

/* Vorlauf und Nachlauf: Am Anfang steht die Brandsohle einen Moment allein
   da, am Ende der fertige Schuh. Ohne diese Ruhe beginnt die Folge, bevor
   der Abschnitt richtig im Bild ist, und endet, bevor man sie gesehen hat. */
const VORLAUF = 0.08
const NACHLAUF = 0.10

/* Wie viel Bildschirmhöhe ein Schritt bekommt.
   0,62 war zu viel: Sechs Schritte ergaben fast fünf Bildschirme Scrollen,
   und weil die Bühne dabei stehen bleibt, fühlte sich das an wie eine Seite,
   die klemmt. 0,38 sind rund drei Mausrad-Rasten je Schritt — zügig genug,
   dass es läuft, langsam genug, dass man die Beschriftung liest. */
const PRO_SCHRITT = 0.38

function schrittAus(fortschritt) {
  const roh = (fortschritt - VORLAUF) / (1 - VORLAUF - NACHLAUF)
  const n = Math.floor(roh * AUFBAU.length)
  return Math.min(AUFBAU.length - 1, Math.max(0, n))
}

/**
 * Die Fassung ohne Bewegung: fertiger Schnitt, sechs Schritte als Liste.
 *
 * Sie ist keine Notlösung. Wer sie bekommt, hat denselben Inhalt vor sich —
 * nur nacheinander zu lesen statt nacheinander zu sehen.
 */
function OhneBewegung({ kopf, fuss }) {
  return (
    <div className="px-5 lg:px-16 py-16 lg:py-28">
      <div className="max-w-5xl mx-auto">
        {kopf}
        <div className="mt-12 lg:mt-16">
          <RahmenSchnitt className="max-w-2xl mx-auto" />
        </div>
        <ol className="grid sm:grid-cols-2 gap-x-14 gap-y-8 mt-12 lg:mt-16 max-w-3xl">
          {AUFBAU.map((s, i) => (
            <li key={s.titel}>
              <p className="text-[10px] tracking-[0.3em] text-white/30">
                {String(i + 1).padStart(2, '0')}
              </p>
              <p className="satz-titel text-[19px] lg:text-[22px] text-white mt-3">{s.titel}</p>
              <p className="text-[13px] text-white/55 font-light leading-[1.85] mt-2">{s.text}</p>
            </li>
          ))}
        </ol>
        {fuss && <div className="mt-14 lg:mt-20">{fuss}</div>}
      </div>
    </div>
  )
}

/**
 * @param {React.ReactNode} kopf Marke und Überschrift. Sie stehen auf der
 *   Bühne und bleiben die ganze Folge über stehen.
 * @param {React.ReactNode} fuss Der Nachsatz unter der Folge.
 */
export default function SchuhAufbau({ kopf, fuss }) {
  const ref = useRef(null)
  const ruhig = useWenigerBewegung()
  const schmal = useSchmal()
  const { fortschritt, buehnenHoehe, buehnenOben } = useScrollBuehne(ref, ruhig)

  const schritt = useMemo(() => schrittAus(fortschritt), [fortschritt])

  if (ruhig) return <OhneBewegung kopf={kopf} fuss={fuss} />

  return (
    <>
      {/* Der Vorspann. Er sagt, was gleich passiert — ohne ihn beginnt die
          Folge unangekündigt, und eine klebende Bühne, die man nicht
          erwartet hat, liest sich als Fehler. */}
      <Enthuellen>
        <div className="px-5 lg:px-16 pt-16 lg:pt-28 pb-6 lg:pb-10">
          <div className="max-w-6xl mx-auto">{kopf}</div>
        </div>
      </Enthuellen>

      <div
        ref={ref}
        /* Die Höhe des Abschnitts ist die Strecke der Folge: eine Bühne für
           das Bild plus gut eine halbe je Schritt. Steht die gemessene Höhe
           noch nicht fest (erster Anlauf), trägt die Klasse. */
        className="relative h-[300vh] lg:h-[330vh]"
        style={buehnenHoehe ? { height: buehnenHoehe * (1 + AUFBAU.length * PRO_SCHRITT) } : undefined}
      >
        <div
          className="sticky flex flex-col justify-center overflow-hidden px-5 lg:px-16 py-12 lg:py-16"
          style={{ top: buehnenOben, ...(buehnenHoehe ? { height: buehnenHoehe } : null) }}
        >
          {/* Auf der Bühne steht nur noch, was sich bewegt.

              Vorher stand hier auch die Überschrift. Sie nahm die obere
              Hälfte, und der Schnitt — das Einzige, worum es geht — saß
              klein in der Mitte zwischen zwei Textecken. Jetzt steht die
              Überschrift im Vorspann darüber, wo sie ankündigt, was kommt,
              und die Bühne gehört der Zeichnung. */}
          <div className="relative h-full w-full max-w-6xl mx-auto flex flex-col justify-center">
            <div className="hidden lg:block absolute top-0 left-0">
              <Kapitelmarke hell>Rahmengenäht · Goodyear welted</Kapitelmarke>
            </div>

            <RahmenSchnitt
              schritt={schritt}
              schmal={schmal}
              className="w-full lg:max-w-5xl lg:mx-auto"
            />

            {/* Unten eine Zeile: links das Laufband, rechts der Schritt.
                Nebeneinander statt in zwei Ecken — so liest man beides in
                einer Augenbewegung. */}
            <div className="mt-10 lg:mt-0 lg:absolute lg:bottom-0 lg:inset-x-0 lg:flex lg:items-end lg:justify-between lg:gap-16">
              <Laufband titel={AUFBAU[schritt].titel} fortschritt={fortschritt} />

              <div className="relative mt-8 lg:mt-0 lg:w-[24rem] lg:text-right min-h-[120px] sm:min-h-[104px]">
                {AUFBAU.map((s, i) => (
                  <div
                    key={s.titel}
                    aria-hidden={i !== schritt}
                    className="absolute inset-0 transition-opacity duration-500"
                    style={{
                      opacity: i === schritt ? 1 : 0,
                      pointerEvents: i === schritt ? 'auto' : 'none',
                    }}
                  >
                    <p className="satz-titel text-[22px] lg:text-[28px] text-white leading-[1.2]">
                      {s.titel}
                    </p>
                    <p className="text-[13px] lg:text-[14px] text-white/55 font-light leading-[1.8] mt-3">
                      {s.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Der Nachsatz steht unter der Bühne und nicht darauf: Er gilt für den
          ganzen Aufbau, nicht für einen Schritt. */}
      {fuss && (
        <Enthuellen>
          <div className="px-5 lg:px-16 pt-10 lg:pt-16 pb-16 lg:pb-28">
            <div className="max-w-5xl mx-auto">{fuss}</div>
          </div>
        </Enthuellen>
      )}
    </>
  )
}
