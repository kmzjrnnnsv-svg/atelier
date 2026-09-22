/**
 * MassAnleitung — wie man die zwei Maße nimmt, in drei Bildern.
 *
 * ── Was hier vorher stand ─────────────────────────────────────────────────
 *
 * Eine selbstgezeichnete Fassung: Papier als Viereck, Fuß aus der
 * Maßskizze, ein Bleistift aus vier Linien. Sie hat ihren Zweck erfüllt und
 * ist ersetzt, sobald die richtige Mappe da war. Hier liegen jetzt acht
 * Teile aus der Zeichenmappe (zeichnungen/fussTeile.js), alle im selben
 * Ausschnitt und schon an der richtigen Stelle.
 *
 * ── Der Ablauf ────────────────────────────────────────────────────────────
 *
 * 1  Papier liegt da, der Fuß kommt von oben darauf, der Bleistift
 *    erscheint an der Kontur — und die Kontur wird gezeichnet, nicht
 *    eingeblendet (`zeichnen`, siehe Zeichentafel).
 * 2  Fuß und Stift gehen weg, die Bleistiftlinie bleibt stehen. Die zwei
 *    Markierungen kommen nacheinander, dann schiebt sich das Lineal längs
 *    herein.
 * 3  Markierungen und Lineal gehen, der Fuß kommt zurück, das Maßband legt
 *    sich quer über den Ballen.
 *
 * Der Fuß steht damit in Schritt 1 und 3, aber nicht in 2. Dafür gibt es
 * `nur` im Plan — eine Aufzählung statt einer Strecke. Ohne das müsste
 * derselbe Fuß zweimal in der Mappe liegen.
 *
 * ── Einfarbig ─────────────────────────────────────────────────────────────
 *
 * Die Mappe sieht für Markierungen und Maßband einen Akzentton vor
 * (`--as-accent`, vorgeschlagen war ein Terrakotta). Diese Seite setzt ihn
 * nicht: Sie ist von der ersten Zeichnung an einfarbig, und ein zweiter
 * Farbton wäre hier das einzige Bunt auf der ganzen Seite. Der Rückfall auf
 * `currentColor` genügt — die Markierungen heben sich ab, weil sie als
 * Einzige voll deckend und doppelt so stark gezeichnet sind.
 */
import Zeichentafel from './Zeichentafel'
import { VIEWBOX, STIL, TEILE, REIHENFOLGE } from '../zeichnungen/fussTeile'
import { TAFELFARBEN_HELL, TAFELFARBEN_DUNKEL } from '../zeichnungen/farben'

/* Die Szene ist 569 Einheiten hoch. Ein Achtel davon ist der Weg, den ein
   Teil reist — dieselbe Regel wie in den anderen Tafeln dieser Seite. */
const WEG = 70
const DAUER = 700

/* Die Kontur ist lang. In der üblichen Dauer herumgefahren sieht es aus wie
   ein Zucken, nicht wie jemand, der zeichnet. */
const KONTUR_DAUER = 1600

const PLAN = {
  'papier':            { ab: 1, aus: 'still' },
  'kontur':            { ab: 1, aus: 'still', zeichnen: true, dauer: KONTUR_DAUER },
  // Der Fuß steht auf dem Papier, geht zum Messen weg und kommt fürs
  // Maßband zurück.
  'fuss':              { nur: [1, 3], ab: 1, aus: 'oben', dauer: 760 },
  // Der Stift kommt eine Idee später als der Fuß: erst steht man, dann
  // greift man zum Bleistift.
  'stift':             { nur: [1], ab: 1, aus: 'oben', verzug: 240 },
  'markierung-ferse':  { nur: [2], ab: 2, aus: 'still', verzug: 120 },
  'markierung-spitze': { nur: [2], ab: 2, aus: 'still', verzug: 300 },
  // Das Lineal schiebt sich längs herein, in der Richtung, in der es misst.
  'lineal':            { nur: [2], ab: 2, aus: 'unten', verzug: 460, dauer: 820 },
  'massband':          { nur: [3], ab: 3, aus: 'rechts', verzug: 300, dauer: 820 },
}

/**
 * @param {number|null} [schritt] 0 Kontur, 1 Länge, 2 Umfang — von null an
 *   gezählt wie bei allen Tafeln dieser Seite, weil Zeichentafel selbst
 *   eins dazuzählt. Hier stand kurzzeitig eine Zählung von eins an, und die
 *   beiden Erhöhungen summierten sich: Aus Schritt 3 wurde `data-schritt=4`,
 *   und weil es dafür keine Regel gibt, stand die Tafel leer da.
 *
 *   `null` zeigt den letzten Schritt — der Fall ohne Folge und der des
 *   Vorrenderers.
 * @param {boolean} [dunkel] Für den dunklen Grund des Kapitels auf der
 *   Startseite. Dieselbe Zeichnung steht auch im Konfigurator, und dort
 *   steht sie auf Weiß — deshalb hängt die Farbe an einem Übergabewert und
 *   nicht fest im Bauteil.
 */
export default function MassAnleitung({ className = '', schritt = null, dunkel = false }) {
  return (
    <Zeichentafel
      kennung="fm"
      viewBox={VIEWBOX}
      weg={WEG}
      dauer={DAUER}
      stil={STIL}
      teile={TEILE}
      reihenfolge={REIHENFOLGE}
      plan={PLAN}
      schritt={schritt}
      schritte={3}
      farben={dunkel ? TAFELFARBEN_DUNKEL : TAFELFARBEN_HELL}
      className={className}
    />
  )
}
