/**
 * RahmenSchnitt — der Querschnitt durch einen rahmengenähten Schuh.
 *
 * ── Warum eine Zeichnung und kein Foto ────────────────────────────────────
 *
 * „Rahmengenäht statt geklebt" ist der eine Satz, der den Preis erklärt, und
 * er ist unanschaulich: Was ein Rahmen ist, sieht man am fertigen Schuh
 * nicht — er steckt zwischen Schaft und Sohle. Ein Foto zeigt genau das
 * nicht. Ein Schnitt zeigt es in einem Blick.
 *
 * ── Was dargestellt ist ───────────────────────────────────────────────────
 *
 * Der Schnitt quer durch den Vorfuß. Schaft und Futter laufen über den
 * Leisten und werden nach innen gezwickt; die Brandsohle trägt an ihrer
 * Unterseite eine Lippe, durch die die Einstechnaht läuft und Schaft, Futter
 * und Rahmen fasst. Der Rahmen steht seitlich heraus, durch ihn geht die
 * Doppelnaht in die Laufsohle. Dazwischen liegt die Korkbettung.
 *
 * Daran hängt das Versprechen: Die Laufsohle hängt an der Doppelnaht, nicht
 * am Schaft. Wer sie auftrennt, lässt den Schuh unversehrt — deshalb lässt
 * sich ein rahmengenähter Schuh neu besohlen und ein geklebter nicht.
 *
 * ── Woher die Zeichnung kommt ─────────────────────────────────────────────
 *
 * Aus der Zeichenmappe (zeichnungen/querschnittTeile.js), neun Teile, alle
 * mit demselben Ausschnitt. Hier standen vorher von Hand gesetzte Pfade; was
 * sie zeigten, stimmte, aber ein gezeichneter Schnitt mit gewölbtem Fußbett,
 * geschlossenem Schaftbogen und einer Lippe, die wirklich wie eine Lippe
 * aussieht, erklärt in einem Blick, wofür sie zwei brauchten.
 *
 * ── Die Reihenfolge ist die der Werkstatt ─────────────────────────────────
 *
 * Brandsohle, dann Schaft und Futter von oben, dann der Rahmen mit der
 * Einstechnaht, dann Kork, dann die Laufsohle von unten, zuletzt die
 * Doppelnaht. Dieselben sechs Schritte wie in lib/aufbauSchritte.js — wer
 * dort etwas verschiebt, muss hier nachsehen.
 *
 * Für eine Vorleseroutine ist die Zeichnung Beiwerk; der Text daneben sagt
 * dasselbe in Worten.
 */
import Zeichentafel from './Zeichentafel'
import { VIEWBOX, STIL, TEILE, REIHENFOLGE } from '../zeichnungen/querschnittTeile'
import { TAFELFARBEN_DUNKEL } from '../zeichnungen/farben'

/* Szenenausschnitt der Mappe ist `158 16 484 300`. Links und rechts kommen
   je rund 150 Einheiten für die Beschriftung dazu, unten 80 für die beiden
   Marken unter der Sohle.

   Die Zusatzzeilen bestimmen die Breite, nicht die Namen: „EINSTECHNAHT" ist
   bei 16 Einheiten Schriftgröße 132 breit, „über den Leisten" bei 12 aber
   118 — und „außen, über den Leisten", wie es zuerst dahinterstand, 170.
   Damit ragte die Marke aus der Tafel heraus. Keine Zusatzzeile hier ist
   länger als siebzehn Zeichen; wer eine längere einträgt, muss den
   Ausschnitt mitziehen.

   Der Schnitt behält dabei drei Fünftel der Breite. Das ist hier zu
   verschmerzen: Die Bühne dieses Abschnitts ist breiter als die der beiden
   anderen Tafeln, und die Zeichnung steht darin allein. */
const AUSSCHNITT = '8 4 800 396'
const AUSSCHNITT_SCHMAL = '158 10 484 308'

/* Ein Achtel der Szenenhöhe. */
const WEG = 38
const DAUER = 700

const PLAN = {
  // Alles beginnt mit der Brandsohle: Auf ihr steht der Rest.
  'brandsohle':   { ab: 1, aus: 'unten' },
  // Die Lippe wird darunter geklebt — ein Rippenband mit L-Profil. Sie
  // kommt im selben Schritt, einen Wimpernschlag später, weil sie ohne die
  // Brandsohle nichts wäre, worauf sie kleben könnte.
  'lippe':        { ab: 1, aus: 'unten', verzug: 220 },
  // Der Fuß ist der Grund für die ganze Bauweise. Er kommt mit dem Schaft,
  // gestrichelt und zurückgenommen — eine Orientierung, kein Bauteil.
  'fuss':         { ab: 2, aus: 'oben', verzug: 260 },
  'schaft':       { ab: 2, aus: 'oben' },
  'futter':       { ab: 2, aus: 'oben', verzug: 130 },
  // Der Rahmen wird von außen angelegt und in einem Zug mit der Lippe
  // vernäht — deshalb steht die Einstechnaht in demselben Schritt.
  'rahmen':       { ab: 3, aus: 'unten' },
  'einstechnaht': { ab: 3, aus: 'still', verzug: 320 },
  'kork':         { ab: 4, aus: 'unten' },
  'laufsohle':    { ab: 5, aus: 'unten' },
  'doppelnaht':   { ab: 6, aus: 'still', verzug: 160 },
}

/* Links und rechts abwechselnd, und die beiden Nähte unter die Sohle: Acht
   Marken an zwei Rändern wären eine Legende. Die Punkte liegen auf den
   Teilen; ihre Maße stehen in der Mappe unter MASSE. */
const MARKEN = [
  { name: 'Schaft',       zusatz: 'über den Leisten',  ab: 2, punkt: [218, 132], text: [150, 112], anker: 'end' },
  { name: 'Futter',       zusatz: 'bis an die Lippe',  ab: 2, punkt: [238, 186], text: [150, 176], anker: 'end' },
  { name: 'Brandsohle',   zusatz: 'mit der Lippe',     ab: 1, punkt: [300, 214], text: [150, 240], anker: 'end' },
  { name: 'Einstechnaht', zusatz: 'fasst drei Lagen',  ab: 3, punkt: [570, 252], text: [650, 112] },
  { name: 'Kork',         zusatz: 'füllt den Raum',    ab: 4, punkt: [420, 252], text: [650, 176] },
  { name: 'Rahmen',       zusatz: 'steht heraus',      ab: 3, punkt: [606, 261], text: [650, 240] },
  { name: 'Laufsohle',    zusatz: 'hängt an der Naht', ab: 5, punkt: [250, 290], text: [188, 352] },
  { name: 'Doppelnaht',   zusatz: 'Rahmen und Sohle',  ab: 6, punkt: [604, 292], text: [612, 352], anker: 'end' },
]

/**
 * @param {number|null} [schritt] 0 … 5. `null` zeigt den fertigen Schnitt —
 *   der Fall des Vorrenderers und der Fall „keine Bewegung".
 * @param {boolean} [schmal] Lässt die Beschriftung weg und rückt an den
 *   Schnitt heran.
 */
export default function RahmenSchnitt({ className = '', schritt = null, schmal = false }) {
  return (
    <Zeichentafel
      kennung="qs"
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
      schritte={6}
      farben={TAFELFARBEN_DUNKEL}
      className={className}
    />
  )
}
