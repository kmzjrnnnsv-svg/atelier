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
 * der eine Schritt, der gerade dran ist, statt der ganzen Liste.
 *
 * Der Stand steht seit Neuestem im gemeinsamen Laufband (siehe Laufband.jsx).
 * Vorher waren es sieben Haarstriche, einer je Teil. Das Argument dafür war,
 * die Tafel zaehle ohnehin selbst mit: Man sehe am Stapel, wie viel fehlt.
 * Das stimmt, wenn man weiß, dass sieben Teile kommen, und sonst nicht, und
 * die Striche sagten es nicht.
 *
 * Ohne Bewegung und im Vorrenderer: der fertige Stapel und alle Schritte
 * als Liste.
 */
import { useMemo, useRef } from 'react'
import SohlenStapel from './SohlenStapel'
import Enthuellen from './Enthuellen'
import Laufband from './Laufband'
import { STAPEL } from '../lib/stapelSchritte'
import { useWenigerBewegungFolge, useSchmal } from '../lib/bewegung'
import { useScrollBuehne } from '../lib/scrollbuehne'

const VORLAUF = 0.08
const NACHLAUF = 0.12

/* Etwas mehr als bei den anderen beiden Folgen: Jeder Schritt legt hier ein
   ganzes Teil hin, und das will man ansehen, bevor das nächste kommt.

   Seit die Teile 92 Einheiten weit reisen und dafür gut acht Zehntelsekunden
   brauchen, ist das auch eine Frage der Ruhe: Bei 0,34 Bildschirmen je
   Schritt schnitt ein zügiger Daumen die Bewegung ab, und abgeschnittene
   Bewegung ist das Gegenteil von weich. */
/* Nachgemessen auf einem iPhone 13: Bei diesem Wert bekam jeder Schritt der
   Folge noch zweihundertvierzig bis zweihundertachtzig Pixel Scrollweg. Ein
   normaler Wisch mit dem Daumen legt achthundert bis fünfzehnhundert zurück
   — er übersprang also ein bis zwei Schritte vollständig, und die Abnahme
   fand auf diesem Gerät nur fünf von sechs.

   0,65 gibt jedem Schritt rund eine halbe Bildschirmhöhe. Das ist der Wert,
   bei dem das Maßnehmen schon stand, und dort war es richtig. Die Seite wird
   dadurch rund ein Zehntel länger; eine Folge, die man überspringt, ist aber
   keine Folge, sondern nur Höhe.

   Die beiden Randschritte sind davon unberührt: Sie schlucken, was vor und
   nach der klebenden Strecke liegt, und sind deshalb immer am längsten. Zu
   messen ist einer aus der Mitte. */
const PRO_SCHRITT = 0.65

function schrittAus(fortschritt) {
  const roh = (fortschritt - VORLAUF) / (1 - VORLAUF - NACHLAUF)
  const n = Math.floor(roh * STAPEL.length)
  return Math.min(STAPEL.length - 1, Math.max(0, n))
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
          {STAPEL.map(s => (
            <li key={s.titel}>
              <p className="t-lead satz-titel c-hell mt-2">{s.titel}</p>
              <p className="t-text c-hell mt-2">{s.text}</p>
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
  const ruhig = useWenigerBewegungFolge()
  const schmal = useSchmal()
  const { fortschritt, buehnenHoehe, buehnenOben } = useScrollBuehne(ref, ruhig)

  const schritt = useMemo(() => schrittAus(fortschritt), [fortschritt])

  /* Wie hoch die Zeichnung höchstens sein darf.

     Die klebende Bühne ist so hoch wie das Fenster, und ihr Inhalt war es
     nicht: Die Zeichnung stand in fester Größe da, darunter Laufband, Text
     und Nachsatz. Auf einem hohen Fenster ging das auf. Auf einem niedrigen
     — iPhone SE, oder jedes iPhone, solange Safari seine beiden Leisten
     zeigt — lief der Inhalt unten aus der Bühne heraus, und weil die Bühne
     `overflow-hidden` trägt, war er einfach weg. Gemessen: 163 Pixel
     abgeschnitten bei 375×527.

     Jetzt bekommt die Zeichnung eine Obergrenze, die sich nach der Bühne
     richtet. Eine Tafel mit viewBox wird dadurch kleiner und bleibt mittig,
     nicht verzerrt. Steht die Bühnenhöhe noch nicht fest, gilt keine
     Grenze — dann ist die Seite ohnehin noch beim ersten Messen. */
  /* Auf breiten Fenstern steht der Text NEBEN der Zeichnung, nicht darunter
     — dort braucht er ihr keine Höhe abzunehmen. Die erste Fassung dieser
     Grenze galt überall und machte die Tafeln am Schreibtisch klein und
     matt, mitten auf einer dunklen Fläche. Jetzt gilt am Schreibtisch nur,
     dass die Zeichnung in die Bühne passt (82 % ihrer Höhe), und die enge
     Rechnung bleibt den Telefonen. */
  const tafelHoehe = !buehnenHoehe ? 0
    : schmal ? Math.max(100, Math.round(Math.min(buehnenHoehe * 0.46, buehnenHoehe - 290)))
    : Math.round(buehnenHoehe * 0.82)

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
          className="sticky flex flex-col justify-center overflow-hidden px-5 lg:px-16 py-5 sm:py-10 lg:py-14"
          style={{ top: buehnenOben, ...(buehnenHoehe ? { height: buehnenHoehe } : null) }}
        >
          <div className="w-full max-w-6xl mx-auto lg:grid lg:grid-cols-12 lg:gap-10 lg:items-center">
            {/* Die Tafel steht links und hoch. Sie zählt selbst mit: Wie
                viel noch fehlt, sieht man am Stapel.

                Sieben von zwölf Spalten, nicht sechs: Seit die Teile
                beschriftet sind, trägt die Tafel an beiden Rändern Schrift,
                und die will gelesen werden. */}
            <div className="lg:col-span-7 text-white flex justify-center">
              <SohlenStapel
                maxHoehe={tafelHoehe}
                schritt={schritt}
                schmal={schmal}
                className="w-full max-w-[300px] sm:max-w-[340px] lg:max-w-none"
              />
            </div>

            {/* Rechts nur der Schritt, der gerade dran ist. */}
            <div className="lg:col-span-4 lg:col-start-9 mt-8 lg:mt-0">
              <Laufband
                titel={`Teil ${schritt + 1} von ${STAPEL.length}`}
                fortschritt={fortschritt}
              />
              <div className="relative [@media(max-height:600px)]:min-h-0 mt-6 min-h-[150px] sm:min-h-[120px]">
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
                    {/* Ohne eigene Ziffer: Die steht seit dem Laufband
                        darüber, und zwar mit der Gesamtzahl dazu. */}
                    <p className="t-lead satz-titel c-hell">
                      {s.titel}
                    </p>
                    <p className="t-text c-hell mt-3 max-w-sm">
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
