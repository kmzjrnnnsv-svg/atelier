/**
 * SpannerSchnitt — der Loafer mit dem Spanner darin, in fünf Schritten.
 *
 * ── Woher die Zeichnung kommt ─────────────────────────────────────────────
 *
 * Aus der Zeichenmappe (zeichnungen/pflegeTafel.js), nicht mehr aus diesem
 * Bauteil. Hier standen vorher von Hand gesetzte Pfade; sie waren dreimal
 * nachgezogen worden und wurden trotzdem kein Schuh, den man wiedererkennt.
 * Die gelieferte Tafel ist ein gezeichneter Penny Loafer mit Sattel,
 * Futterkante, Mokassinnaht und flachem Absatz, dazu der zweiteilige
 * Zedernspanner mit Spindel und Bohrungen, die Feuchtigkeit, die Bürste und
 * der Cremetiegel.
 *
 * ── Wie die Schritte laufen ───────────────────────────────────────────────
 *
 * Die Tafel bringt ihre eigene Folge mit: `data-step="1"` bis `"5"` am
 * <svg>, und im Blatt schaltet eine Regel je Schritt die Gruppen
 * `.as-s1` … `.as-s5`. Dieses Bauteil setzt also nur eine Zahl — es
 * zeichnet nichts und rechnet nichts.
 *
 * Das ist der Grund, warum hier nur noch dreißig Zeilen stehen: Die
 * Zeichnung gehört in die Mappe, die Steuerung in die Folge (PflegeFolge),
 * und dazwischen liegt eine Zahl.
 *
 * ── Farbe ─────────────────────────────────────────────────────────────────
 *
 * Die Tafel malt mit CSS-Eigenschaften und hat neutrales Grau als
 * Rückfallwert. Gesetzt werden sie hier, aus zeichnungen/farben.js — ein
 * warmes Beigegrau, damit die Tafel auf dem gebrochenen Weiß dieser Seite
 * nicht kalt wirkt.
 *
 * Für eine Vorleseroutine ist die Zeichnung Beiwerk; was sie zeigt, sagt
 * der Text daneben in Worten.
 */
import { VIEWBOX, MARKUP } from '../zeichnungen/pflegeTafel'
import { TAFELFARBEN } from '../zeichnungen/farben'

/**
 * @param {number|null} [schritt] 0 … 4. `null` zeigt den letzten Schritt —
 *   den gespannten, gepflegten Schuh. Das ist der Fall des Vorrenderers und
 *   der Fall „keine Bewegung": Wer die Folge nicht sieht, soll das fertige
 *   Bild sehen und nicht das erste.
 */
export default function SpannerSchnitt({ className = '', schritt = null }) {
  return (
    <svg
      viewBox={VIEWBOX}
      className={className}
      role="img"
      aria-hidden="true"
      data-step={schritt == null ? 5 : schritt + 1}
      style={{ width: '100%', height: 'auto', ...TAFELFARBEN }}
      dangerouslySetInnerHTML={{ __html: MARKUP }}
    />
  )
}
