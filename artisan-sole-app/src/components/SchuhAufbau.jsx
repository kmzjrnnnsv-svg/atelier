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
import Enthuellen from './Enthuellen'
import { AUFBAU } from '../lib/aufbauSchritte'
import { useWenigerBewegung, useSchmal } from '../lib/bewegung'
import { useScrollBuehne } from '../lib/scrollbuehne'

/* Vorlauf und Nachlauf: Am Anfang steht die Brandsohle einen Moment allein
   da, am Ende der fertige Schuh. Ohne diese Ruhe beginnt die Folge, bevor
   der Abschnitt richtig im Bild ist, und endet, bevor man sie gesehen hat. */
const VORLAUF = 0.1
const NACHLAUF = 0.14

function schrittAus(fortschritt) {
  const roh = (fortschritt - VORLAUF) / (1 - VORLAUF - NACHLAUF)
  const n = Math.floor(roh * AUFBAU.length)
  return Math.min(AUFBAU.length - 1, Math.max(0, n))
}

/**
 * Das Laufband: Phasenname, Zähler, Balken.
 *
 * Es sagt dreierlei auf einmal — woran gerade gearbeitet wird, wie weit die
 * Folge ist, und dass sie ein Ende hat. Das Letzte ist das Wichtigste: Eine
 * klebende Bühne ohne sichtbares Ende fühlt sich an wie eine Seite, die
 * hängt. Mit einem Balken, der auf 100 zuläuft, scrollt man weiter, um ihn
 * vollzumachen.
 *
 * Der Zähler zählt den echten Fortschritt und nicht die Schritte: Er läuft
 * durch, während der Name springt, und genau dieser Unterschied macht, dass
 * es sich nach Maschine anfühlt und nicht nach Diaschau.
 */
function Laufband({ schritt, fortschritt }) {
  const stand = Math.round(fortschritt * 100)
  return (
    <div className="w-full max-w-xs">
      <div className="flex items-baseline justify-between gap-6">
        <p className="text-[10px] uppercase tracking-[0.26em] text-white/70 truncate">
          {AUFBAU[schritt].titel}
        </p>
        <p className="text-[11px] tabular-nums text-white/40 tracking-[0.1em] shrink-0">
          {String(stand).padStart(3, '0')}
        </p>
      </div>
      <div className="relative h-px bg-white/15 mt-3" aria-hidden="true">
        <div
          className="absolute left-0 top-0 h-px bg-white/70"
          style={{ width: `${stand}%` }}
        />
      </div>
    </div>
  )
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
        {fuss}
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
  const { fortschritt, buehnenHoehe } = useScrollBuehne(ref, ruhig)

  const schritt = useMemo(() => schrittAus(fortschritt), [fortschritt])

  if (ruhig) return <OhneBewegung kopf={kopf} fuss={fuss} />

  return (
    <>
      <div
        ref={ref}
        /* Die Höhe des Abschnitts ist die Strecke der Folge: eine Bühne für
           das Bild plus gut eine halbe je Schritt. Steht die gemessene Höhe
           noch nicht fest (erster Anlauf), trägt die Klasse. */
        className="relative h-[360vh] lg:h-[460vh]"
        style={buehnenHoehe ? { height: buehnenHoehe * (1 + AUFBAU.length * 0.62) } : undefined}
      >
        <div
          className="sticky top-0 flex flex-col justify-center overflow-hidden px-5 lg:px-16 py-12 lg:py-16"
          style={buehnenHoehe ? { height: buehnenHoehe } : undefined}
        >
          {/* Die Bühne ist eine Fläche, kein Raster: Überschrift oben
              links, der Schnitt mittig und groß, die Bildunterschrift unten
              rechts, das Laufband unten links. Ein Raster verteilt; eine
              Bühne komponiert — und nur so bekommt der Schnitt die Größe,
              die ihn zur Hauptsache macht.

              Auf dem Telefon fällt das weg: Dort stehen dieselben vier
              Dinge untereinander, weil überlagerte Ecken auf 390 Pixeln
              kein Bild ergeben, sondern ein Gedränge. */}
          <div className="relative h-full w-full max-w-6xl mx-auto flex flex-col lg:block">
            <div className="lg:absolute lg:top-0 lg:left-0 lg:max-w-[54%] lg:z-10">
              {kopf}
            </div>

            {/* Der Schnitt. Er liegt über allem anderen und darf die
                Überschrift an ihrer Unterkante streifen — diese Überlagerung
                ist es, die aus zwei Elementen ein Bild macht. */}
            <div className="mt-10 lg:mt-0 lg:absolute lg:inset-0 lg:flex lg:items-center lg:justify-center lg:pointer-events-none">
              <RahmenSchnitt
                schritt={schritt}
                ausschnitt={schmal ? 'eng' : 'weit'}
                className="w-full lg:max-w-4xl"
              />
            </div>

            {/* Die Bildunterschrift. Alle sechs stehen im Dokument und liegen
                übereinander — nur so bleibt die Höhe ruhig, während der Text
                wechselt, und nur so steht der ganze Inhalt auch dann da, wenn
                niemand scrollt. */}
            <div className="relative mt-8 lg:mt-0 lg:absolute lg:bottom-0 lg:right-0 lg:w-[23rem] lg:text-right lg:z-10 min-h-[150px] sm:min-h-[128px] lg:min-h-[164px]">
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
                  <p className="text-[10px] tracking-[0.3em] text-white/35">
                    {String(i + 1).padStart(2, '0')} / {String(AUFBAU.length).padStart(2, '0')}
                  </p>
                  <p className="satz-titel text-[23px] lg:text-[30px] text-white leading-[1.2] mt-3">
                    {s.titel}
                  </p>
                  <p className="text-[13px] lg:text-[14px] text-white/55 font-light leading-[1.85] mt-3">
                    {s.text}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-10 lg:mt-0 lg:absolute lg:bottom-0 lg:left-0 lg:z-10">
              <Laufband schritt={schritt} fortschritt={fortschritt} />
            </div>
          </div>
        </div>
      </div>

      {/* Der Nachsatz steht unter der Bühne und nicht darauf: Er gilt für den
          ganzen Aufbau, nicht für einen Schritt. */}
      {fuss && (
        <Enthuellen>
          <div className="px-5 lg:px-16 pb-16 lg:pb-28">
            <div className="max-w-5xl mx-auto">{fuss}</div>
          </div>
        </Enthuellen>
      )}
    </>
  )
}
