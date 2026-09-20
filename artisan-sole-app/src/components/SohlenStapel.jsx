/**
 * SohlenStapel — derselbe Schuh, in seine sechs Teile gelegt.
 *
 * ── Was hier steht und was nicht ──────────────────────────────────────────
 *
 * Nur die Angaben dieser Szene: wann welches Teil kommt, woher, und was
 * daneben steht. Die Bewegung liegt in Zeichentafel.jsx, damit sie mit dem
 * Pflegeabschnitt dieselbe ist. Die Teile liegen in
 * zeichnungen/aufbauTeile.js.
 *
 * ── Warum die Beschriftung die Seite wechselt ─────────────────────────────
 *
 * Sechs Marken untereinander an einem Rand ergeben eine Liste, und eine
 * Liste neben einer Zeichnung liest man als Legende — man geht sie durch,
 * statt hinzusehen. Wechseln sie die Seite, führt jeder Strich das Auge quer
 * über die Tafel, und man sieht dabei das Teil, um das es geht. So machen es
 * die Tafeln in Werkstattbüchern, und zwar nicht aus Laune.
 *
 * Die Ränder links und rechts sind deshalb gleich breit. Das kostet der
 * Zeichnung ein knappes Drittel der Fläche und ist es wert.
 *
 * ── Der siebte Schritt ────────────────────────────────────────────────────
 *
 * Der Grund für die ganze Tafel: Laufsohle und Absatz rücken ab, dazwischen
 * läuft eine Strichlinie, und zwei Wörter sagen, was gemeint ist. Sie
 * gehören nicht in die Zeichenmappe — das sind keine Schuhteile, sondern
 * eine Aussage darüber —, deshalb stehen sie hier.
 *
 * ── Eine Falle, die zweimal zuschlägt ─────────────────────────────────────
 *
 * Ein <style> in einem SVG gilt für das ganze Dokument, nicht für sein SVG.
 * Deshalb tragen alle Klassen und Kennungen der Mappe `as-` und das Kürzel
 * ihrer Szene. Wer eine weitere Tafel dazunimmt, prüfe dasselbe: Innerhalb
 * des Präfixes teilen sie sich einen Namensraum.
 */
import Zeichentafel from './Zeichentafel'
import { STIL, TEILE, REIHENFOLGE } from '../zeichnungen/aufbauTeile'
import { TAFELFARBEN } from '../zeichnungen/farben'

/* Szenenausschnitt der Mappe ist `198 22 586 660`. Links und rechts kommen
   je rund 135 Einheiten für die Beschriftung dazu, unten die vierzig, um
   die die Sohle im letzten Schritt abrückt.

   Die Zahlen sind gemessen und nicht geschätzt: Der längste Name ist
   „Brandsohle" und bei 16 Einheiten Schriftgröße mit 2,2 Sperrung 114
   Einheiten breit. Links endet die Beschriftung bei 186, rechts beginnt sie
   bei 798 — dreiunddreißig Einheiten Abstand zu den Blättern, die bei 219
   anfangen und bei 765 aufhören. Vorher waren es drei, und da sah es aus,
   als klebten die Namen an den Sohlen. Wer einen längeren Namen einträgt,
   muss hier nachziehen, sonst steht er halb außerhalb der Tafel. */
const AUSSCHNITT = '48 6 906 742'

/* Ohne Beschriftung fallen die beiden Ränder weg. Unten bleiben die
   sechzig Einheiten, um die die Sohle abrückt. */
const AUSSCHNITT_SCHMAL = '198 14 586 736'

/* Ein Achtel der Szenenhöhe, wie im Schnitt des Handwerkskapitels. Mit den
   34 Einheiten, die vorher galten, stand ein Blatt plötzlich da, statt
   aufzusteigen — auf 742 Einheiten Höhe sieht man so wenig Weg nicht. */
const WEG = 92
const DAUER = 820

/** Um wie viel Laufsohle und Absatz im letzten Schritt abrücken. */
/* Sechzig und nicht vierzig: In die Lücke kommen zwei Zeilen und eine
   Linie, und bei vierzig Einheiten stoßen sie oben an den Kork und unten an
   die Laufsohle. */
const ABRUECKEN = 60
const TRENNUNG = 7

const PLAN = {
  // Der Absatz liegt zuunterst und kommt zuletzt — man sieht die Laufsohle
  // aufsteigen und darunter den Absatz nachrücken.
  'absatz':     { ab: 5, aus: 'unten', verzug: 200, rueckenAb: TRENNUNG, ruecken: ABRUECKEN },
  'laufsohle':  { ab: 5, aus: 'unten',              rueckenAb: TRENNUNG, ruecken: ABRUECKEN },
  'kork':       { ab: 4, aus: 'unten' },
  // Der Rahmen wird seitlich angelegt und rundherum angenäht — er kommt
  // als einziges Teil von der Seite.
  'rahmen':     { ab: 3, aus: 'links', weg: 170, dauer: 900 },
  'brandsohle': { ab: 2, aus: 'unten' },
  'oberschuh':  { ab: 1, aus: 'still' },
}

/* Links, rechts, links … — siehe oben. Die Punkte liegen auf den Teilen;
   ihre Maße stehen in der Mappe unter MASSE. */
const MARKEN = [
  { name: 'Oberschuh',  zusatz: 'Schaft und Futter', ab: 1, punkt: [300, 150], text: [186, 112], anker: 'end' },
  { name: 'Brandsohle', zusatz: 'mit der Rippe',     ab: 2, punkt: [640, 272], text: [798, 264] },
  // Der Punkt sitzt auf dem Band und nicht im Loch: Der Rahmen IST das
  // Band, und ein Punkt in der Mitte zeigte auf nichts.
  { name: 'Rahmen',     zusatz: 'steht heraus',      ab: 3, punkt: [300, 330], text: [186, 348], anker: 'end' },
  { name: 'Kork',       zusatz: 'passt sich an',     ab: 4, punkt: [620, 440], text: [798, 432] },
  {
    name: 'Laufsohle', zusatz: 'mit Doppelnaht',
    ab: 5, punkt: [300, 528], text: [186, 520], anker: 'end',
    rueckenAb: TRENNUNG, ruecken: ABRUECKEN,
  },
  {
    name: 'Absatz', zusatz: 'geschichtet',
    ab: 5, punkt: [340, 624], text: [430, 616],
    rueckenAb: TRENNUNG, ruecken: ABRUECKEN,
  },
]

/* Unterkante Kork 473, Oberkante Laufsohle 488 — nach dem Abrücken liegt
   dazwischen eine Lücke von 75 Einheiten. Genau dort läuft die Linie.

   Sie ist kräftiger gesetzt als die Führungsstriche der Beschriftung: Die
   führen das Auge zu einem Teil, diese hier ist die Aussage des ganzen
   Abschnitts. Mit derselben Feinheit wie ein Führungsstrich war sie auf dem
   Bildschirm nicht zu sehen. */
const LINIE = 510

/* Die beiden Wörter standen über und unter dem rechten Ende der Linie — und
   damit über den Blättern, die bis 765 reichen, und quer über der Linie
   selbst. Jetzt stehen sie rechts DANEBEN, im Rand, in dem sonst die
   Beschriftung sitzt; auf dieser Höhe ist er frei. Die Linie hört vorher
   auf und läuft ihnen nicht mehr hinein. */
const TRENNMARKUP = `
  <path class="as-strich" pathLength="1" d="M 219 ${LINIE} L 752 ${LINIE}"
        style="stroke-dasharray:9 7;stroke-dashoffset:0;opacity:.7;stroke-width:1.5"/>
  <text class="as-marke-name" x="944" y="${LINIE - 14}" text-anchor="end">bleibt</text>
  <text class="as-marke-name" x="944" y="${LINIE + 24}" text-anchor="end">wird gewechselt</text>`

/**
 * @param {number|null} [schritt] 0 … 6. `null` zeigt den fertigen Stapel
 *   ohne Trennung — der Fall des Vorrenderers und der Fall „keine Bewegung".
 */
export default function SohlenStapel({ className = '', schritt = null, schmal = false }) {
  return (
    <Zeichentafel
      kennung="au"
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
      extra={TRENNMARKUP}
      extraAb={TRENNUNG}
      schritt={schritt}
      schritte={7}
      farben={TAFELFARBEN}
      className={className}
    />
  )
}
