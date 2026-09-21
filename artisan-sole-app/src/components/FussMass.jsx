/**
 * FussMass — die zwei Maße, aus denen ein Leisten wird.
 *
 * ── Warum eine Zeichnung ──────────────────────────────────────────────────
 *
 * Die Seite sagt an drei Stellen „Fußlänge und Ballenumfang, mehr nicht".
 * Das ist der stärkste Satz, den sie über die Passform hat, und zugleich
 * einer, den man erst glaubt, wenn man ihn sieht: Wer noch nie Maß genommen
 * hat, weiß nicht, was ein Ballenumfang ist, und wer es nicht weiß, traut
 * dem Versprechen nicht.
 *
 * Genau da bricht ein Kauf ab. Ein Paar Schuhe nach Maß im Netz zu bestellen
 * scheitert nicht am Preis, sondern an der Frage, ob es passt — und die
 * beantwortet kein Absatz so schnell wie eine Skizze, auf der beide Maße
 * eingetragen sind.
 *
 * ── Was dargestellt ist ───────────────────────────────────────────────────
 *
 * Links der Fuß von oben: die Länge von der Ferse bis zur längsten Zehe —
 * das ist nicht immer die große — und die Linie über den Ballen, dort, wo
 * der Fuß am breitesten ist.
 *
 * Rechts derselbe Fuß im Schnitt an genau dieser Linie, mit dem Maßband
 * einmal herum. Der Umfang, nicht die Breite: Zwei Füße gleicher Breite
 * können unterschiedlich hoch sein, und ein Leisten, der nur die Breite
 * kennt, sitzt bei einem von beiden falsch.
 *
 * Die beiden Ansichten stehen nebeneinander und nicht untereinander, weil
 * die gestrichelte Linie sie verbindet: Sie läuft links über den Ballen und
 * rechts um ihn herum. Übereinander wäre das ein Zufall, nebeneinander ist
 * es ein Satz.
 *
 * ── Was hier nicht behauptet wird ─────────────────────────────────────────
 *
 * Kein Verfahren, keine Genauigkeit in Millimetern, kein Gerät. Was der
 * Laden dazu sagt — ±0,5 cm genügen, ein Schnürsenkel und ein Lineal reichen
 * — steht im Text daneben und nicht in der Zeichnung.
 *
 * ── Die Schritte ──────────────────────────────────────────────────────────
 *
 * Mit `schritt` zeigt dieselbe Zeichnung nacheinander, was gerade erklärt
 * wird: erst die Länge allein, dann der Umfang allein, am Ende beides. Das
 * ist kein Zierrat — auf einer Skizze mit zwei Maßen weiß niemand, welches
 * gerade gemeint ist, und die beiden sind das Einzige, worum es geht.
 *
 * Nichts verschwindet dabei, es tritt nur zurück (Deckkraft 0,12). Was ganz
 * weg ist, muss man beim nächsten Schritt neu suchen; was blass dasteht,
 * bleibt im Bild und kommt zurück.
 *
 * Der Fuß von oben gehört zu keinem Schritt — er ist das Motiv und steht
 * immer.
 */
import { Fuehrung, Beschriftung, Lage, Massband, Tafel } from './Zeichnung'
import { FUSS_OBEN, FUSS_SCHNITT, MASSBAND_UM_DEN_BALLEN } from '../zeichnungen/fussFormen'

/* Was bei welchem Schritt vorn steht. `null` heißt: alles, und das ist der
   Fall überall dort, wo die Zeichnung ohne Folge steht. */
const AUFTRITT = { transition: 'opacity 620ms cubic-bezier(.22,1,.36,1)' }
const deckkraft = (schritt, meins) =>
  schritt == null || schritt >= 3 || schritt === meins ? 1 : 0.12

/**
 * @param {number|null} [schritt] 1 Länge, 2 Umfang, 3 beides. `null` zeigt
 *   alles — der Fall ohne Folge und der des Vorrenderers.
 */
export default function FussMass({ className = '', schritt = null }) {
  return (
    <Tafel viewBox="0 20 520 230" className={className}>
      {/* ── Links: der Fuß von oben ─────────────────────────────────── */}
      <Lage d={FUSS_OBEN} fuellung={0.10} kante={0.42} />

      {/* Die Länge, von der Ferse bis zur längsten Zehe. Sie läuft neben
          dem Fuß, nicht darüber — eine Maßlinie im Motiv verdeckt, was sie
          misst. */}
      <g style={{ ...AUFTRITT, opacity: deckkraft(schritt, 1) }}>
      <Massband x1="196" y1="34" x2="196" y2="236" quer={9} />
      <Beschriftung x="212" y="139">Länge</Beschriftung>
      </g>

      <g style={{ ...AUFTRITT, opacity: deckkraft(schritt, 2) }}>
      {/* Die Ballenlinie: die breiteste Stelle des Fußes. */}
      <path
        d="M 46 76 L 172 76"
        stroke="currentColor" strokeOpacity="0.55" strokeWidth="1" strokeDasharray="4 4" fill="none"
      />
      <Beschriftung x="12" y="58">Ballen</Beschriftung>
      <Fuehrung x1="62" y1="62" x2="64" y2="74" />

      {/* Der Übergang zur zweiten Ansicht. Er knickt ab, weil die zweite
          Ansicht dieselbe Linie von vorn zeigt — ohne den Knick stünden
          dort zwei Zeichnungen nebeneinander statt einer in zwei Ansichten. */}
      <path
        d="M 232 76 L 262 76 L 262 134 L 294 134"
        stroke="currentColor" strokeOpacity="0.22" strokeWidth="1" strokeDasharray="2 6" fill="none"
      />

      {/* ── Rechts: der Schnitt an genau dieser Linie ───────────────── */}
      <Lage d={FUSS_SCHNITT} fuellung={0.10} kante={0.42} />
      <path
        d="M 292 164 L 470 164"
        stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" fill="none"
      />
      <path
        d={MASSBAND_UM_DEN_BALLEN}
        stroke="currentColor" strokeOpacity="0.85" strokeWidth="1.6"
        strokeDasharray="3 3.5" fill="none" strokeLinecap="round"
      />

      <Beschriftung x="508" y="58" anker="end" stark>Umfang</Beschriftung>
      <Fuehrung x1="452" y1="62" x2="420" y2="100" />

      <Beschriftung x="380" y="196" anker="middle">Schnitt am Ballen</Beschriftung>
      </g>
    </Tafel>
  )
}
