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
 * ── Der Spanner fährt ein ─────────────────────────────────────────────────
 *
 * Er blendet nicht auf, er kommt von links ins Bild und schiebt sich durch
 * die Öffnung nach vorn — genau die Bewegung, die eine Hand macht. Dafür
 * reist er weit: Das Vorderteil beginnt 440 Einheiten links vom Bild, also
 * außerhalb, und braucht gut eine Sekunde. Mit den 46 Einheiten, die für die
 * übrigen Teile dieser Szene gelten, wäre es ein Rutscher und kein Einfahren.
 *
 * Die drei Stücke kommen nacheinander, mit je 160 Millisekunden Abstand und
 * in der Reihenfolge, in der man sie einsetzt: erst das Vorderteil in die
 * Spitze, dann die Ferse, dann die Feder dazwischen. Drei Handgriffe, nicht
 * ein Aufblitzen.
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

/* Szenenausschnitt der Mappe ist `12 26 766 328`. Oben kommen 78 Einheiten
   für die Beschriftung dazu, unten 14 für den Schatten der Sohle.

   Warum so viel: Die Marken standen dicht am Schuh und wirkten, als klebten
   sie daran. Eine Beschriftung braucht Luft zwischen sich und dem Ding, das
   sie benennt — der Strich dazwischen ist der Teil, der die Arbeit macht. */
const AUSSCHNITT = '12 -52 766 400'

/* Ohne Beschriftung braucht die Tafel den Rand oben nicht. */
const AUSSCHNITT_SCHMAL = '12 22 766 336'

/* Ein Achtel der Szenenhöhe, wie im Schnitt des Handwerkskapitels. */
const WEG = 46
const DAUER = 700

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
  'spanner-vorderteil': { ab: 2, aus: 'links', weg: 440, dauer: 1150 },
  'spanner-ferse':      { ab: 2, aus: 'links', weg: 300, dauer: 1000, verzug: 160 },
  'spanner-feder':      { ab: 2, aus: 'links', weg: 380, dauer: 1050, verzug: 320 },
  'feuchtigkeit':       { ab: 4, aus: 'unten' },
  'buerste':            { ab: 5, aus: 'oben' },
  'creme':              { ab: 5, aus: 'oben',  verzug: 120 },
  'glanz':              { ab: 5, aus: 'still', verzug: 380 },
}

const MARKEN = [
  {
    name: 'Falte', zusatz: 'über dem Ballen',
    ab: 1, bis: 2, punkt: [578, 198], text: [646, 58],
  },
  {
    name: 'Zedernholz', zusatz: 'zweiteilig, mit Feder',
    ab: 2, punkt: [112, 152], text: [22, 12],
  },
  {
    name: 'Feuchtigkeit', zusatz: 'aus dem Futter',
    ab: 4, punkt: [216, 52], text: [198, -22],
  },
  {
    name: 'Bürste und Creme', zusatz: 'für glatte Leder',
    ab: 5, punkt: [520, 50], text: [470, -22],
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
      weg={WEG}
      dauer={DAUER}
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
