/**
 * SpannerSchnitt — der Loafer mit dem Spanner darin, in fünf Schritten.
 *
 * ── Was hier steht und was nicht ──────────────────────────────────────────
 *
 * Nur die Angaben, die diese Szene ausmachen: wann welches Teil kommt, woher
 * es kommt, und was auf der Tafel daneben steht. Die Bewegung selbst — Dauer,
 * Kurve, Weg — liegt in Zeichentafel.jsx, damit sie mit der anderen Szene
 * dieselbe ist. Die Teile liegen in zeichnungen/pflegeTeile.js.
 *
 * ── Warum die Teile aus verschiedenen Richtungen kommen ───────────────────
 *
 * Weil sie es in Wirklichkeit auch tun. Das Vorderteil des Spanners wird von
 * hinten durch die Öffnung geschoben, das Fersenteil von oben eingesetzt, die
 * Feder dazwischen gespannt. Eine Folge, in der alles von unten einblendet,
 * ist eine Diaschau; eine, in der jedes Stück den Weg nimmt, den eine Hand
 * ihm gäbe, ist ein Vorgang.
 *
 * ── Zur Beschriftung ──────────────────────────────────────────────────────
 *
 * Vier Marken, und jede sagt etwas, das im Text daneben NICHT steht: dass
 * der Spanner zweiteilig ist, woher die Feuchtigkeit kommt, wo genau die
 * Falte sitzt, wofür die Bürste gedacht ist. Eine Beschriftung, die den
 * Absatz daneben wiederholt, ist Zierrat.
 *
 * Ihre Plätze sind gesucht, nicht gerechnet: Der Schuh füllt die Fläche
 * fast ganz, und die vier freien Ecken sind oben links (über der Ferse),
 * oben über dem Rist, oben rechts (über dem Werkzeug) und rechts über dem
 * Blatt. Die Maße der Teile stehen in der Mappe unter MASSE.
 */
import Zeichentafel from './Zeichentafel'
import { STIL, TEILE, REIHENFOLGE } from '../zeichnungen/pflegeTeile'
import { TAFELFARBEN } from '../zeichnungen/farben'

/* Szenenausschnitt der Mappe ist `12 26 766 328`. Oben kommen 50 Einheiten
   für die Beschriftung dazu, unten 14 für den Schatten der Sohle. */
const AUSSCHNITT = '12 -24 766 372'

/* Ohne Beschriftung braucht die Tafel den Rand oben nicht. */
const AUSSCHNITT_SCHMAL = '12 22 766 336'

const PLAN = {
  'sohle':              { ab: 1, aus: 'still' },
  'oberschuh':          { ab: 1, aus: 'still' },
  'riemen':             { ab: 1, aus: 'still' },
  // Die Falte ist der Grund für den ganzen Abschnitt — und verschwindet,
  // sobald der Spanner seine Arbeit getan hat.
  'falten':             { ab: 1, bis: 2, aus: 'still' },
  // Der Spanner: Ferse von oben eingesetzt, Vorderteil von hinten durch die
  // Öffnung geschoben, die Feder dazwischen. In dieser Reihenfolge, mit
  // einem Achtelsekunden-Abstand, damit man drei Handgriffe sieht und nicht
  // ein Aufblitzen.
  'spanner-vorderteil': { ab: 2, aus: 'links' },
  'spanner-ferse':      { ab: 2, aus: 'oben',  verzug: 130 },
  'spanner-feder':      { ab: 2, aus: 'links', verzug: 260 },
  'feuchtigkeit':       { ab: 4, aus: 'unten' },
  'buerste':            { ab: 5, aus: 'oben' },
  'creme':              { ab: 5, aus: 'oben',  verzug: 120 },
  'glanz':              { ab: 5, aus: 'still', verzug: 380 },
}

const MARKEN = [
  {
    name: 'Falte', zusatz: 'über dem Ballen',
    ab: 1, bis: 2, punkt: [582, 200], text: [660, 112],
  },
  {
    name: 'Zedernholz', zusatz: 'zweiteilig, mit Feder',
    ab: 2, punkt: [112, 152], text: [22, 40],
  },
  {
    name: 'Feuchtigkeit', zusatz: 'aus dem Futter',
    ab: 4, punkt: [216, 52], text: [198, 2],
  },
  {
    name: 'Bürste und Creme', zusatz: 'für glatte Leder',
    ab: 5, punkt: [520, 50], text: [470, 2],
  },
]

/**
 * @param {number|null} [schritt] 0 … 4. `null` zeigt den letzten Schritt —
 *   den gespannten, gepflegten Schuh. Das ist der Fall des Vorrenderers und
 *   der Fall „keine Bewegung": Wer die Folge nicht sieht, soll das fertige
 *   Bild sehen und nicht das erste.
 */
export default function SpannerSchnitt({ className = '', schritt = null, schmal = false }) {
  return (
    <Zeichentafel
      kennung="pf"
      viewBox={AUSSCHNITT}
      viewBoxSchmal={AUSSCHNITT_SCHMAL}
      schmal={schmal}
      stil={STIL}
      teile={TEILE}
      reihenfolge={REIHENFOLGE}
      plan={PLAN}
      marken={MARKEN}
      schritt={schritt}
      schritte={5}
      farben={TAFELFARBEN}
      className={className}
    />
  )
}
