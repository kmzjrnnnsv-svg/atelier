/**
 * LederSchnitt — warum „vollnarbig" das einzige Wort ist, auf das es ankommt.
 *
 * ── Warum eine Zeichnung und kein Foto ────────────────────────────────────
 *
 * Der Abschnitt „Das Leder" bestand aus drei Aufnahmen von Lederoberflächen
 * und drei Absätzen daneben. Alle drei sahen aus wie Leder, und eine zeigte
 * in Wahrheit eine Naht. Ein Foto einer Oberfläche zeigt eine Struktur und
 * sonst nichts: Wer den Unterschied zwischen vollnarbigem Leder und
 * geschliffenem nicht kennt, kennt ihn danach immer noch nicht — und genau
 * dieser Unterschied ist es, der einen Schuh alt werden lässt oder
 * abblättern.
 *
 * Man sieht ihn am fertigen Schuh nicht. Das ist dieselbe Lage wie beim
 * Rahmen, und deshalb dasselbe Mittel: ein Schnitt.
 *
 * ── Was dargestellt ist ───────────────────────────────────────────────────
 *
 * Eine Haut im Querschnitt, von der Narbenseite (oben) zur Fleischseite
 * (unten). Die Fasern sind keine Verzierung, sie sind die Aussage: Oben
 * stehen sie dicht und senkrecht, nach unten werden sie lose und wirr. Das
 * ist der Grund für alles Weitere.
 *
 *   • Narbe          Die gewachsene Oberfläche. Dichteste Faser.
 *   • Vollnarbig     Die oberste Schicht, ganz geblieben — nicht
 *                    abgeschliffen, nicht überzogen.
 *   • Spaltlinie     Wo die Haut geteilt wird.
 *   • Spaltleder     Was darunter bleibt. Keine gewachsene Oberfläche;
 *                    was danach wie Narbe aussieht, ist aufgeprägt.
 *
 * ── Warum das hierhergehört ───────────────────────────────────────────────
 *
 * Es erklärt alle drei Leder dieses Abschnitts in einem Bild: vollnarbiges
 * Kalbsleder ist die oberste Schicht unversehrt; Nubuk ist dieselbe Schicht,
 * nur angeschliffen; Shell Cordovan kommt aus einer besonders dichten Lage
 * unterhalb der Narbe einer Pferdehaut.
 *
 * ── Was hier nicht behauptet wird ─────────────────────────────────────────
 *
 * Nichts über dieses Haus. Keine Gerberei, kein Lieferant, keine Dicke in
 * Millimetern. Das ist Sachwissen über Häute und gilt für jeden, der Schuhe
 * baut.
 */
import { Fuehrung, Beschriftung, Lage, Tafel } from './Zeichnung'

const LINKS = 118
const RECHTS = 402
const OBEN = 86
const UNTEN = 232
const SPALT = 150

/**
 * Eine Faser, von der Narbe nach unten.
 *
 * Oben steht sie senkrecht und eng bei ihren Nachbarn, unten wandert sie
 * aus. Der Ausschlag wächst mit der Tiefe — das ist die ganze Aussage der
 * Zeichnung, in einer Kurve.
 *
 * Die Abweichung ist gerechnet und nicht gewürfelt: Eine Zeichnung, die bei
 * jedem Neuzeichnen anders aussieht, ist keine Zeichnung, sondern ein
 * Rauschen.
 */
function faser(i) {
  const streu = (k) => {
    const n = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453
    return (n - Math.floor(n)) - 0.5      // −0,5 … +0,5, aber immer dieselbe
  }
  const x = LINKS + 6 + i * 8.2
  return `M ${x} ${OBEN} `
    + `C ${(x + streu(1) * 7).toFixed(1)} 122, `
    + `${(x + streu(2) * 30).toFixed(1)} 178, `
    + `${(x + streu(3) * 52).toFixed(1)} ${UNTEN}`
}

const FASERN = Array.from({ length: 34 }, (_, i) => faser(i))

export default function LederSchnitt({ className = '' }) {
  return (
    <Tafel viewBox="0 50 520 210" className={className}>
      <defs>
        {/* Die Deckkraft nimmt nach unten ab — dichtes Gefüge oben, loses
            unten, ohne dass ein Wort dabeistehen muss. Der Verlauf rechnet
            gegen die Fläche jeder einzelnen Faser; sie reichen alle von
            oben nach unten, also sitzt er bei allen gleich. */}
        <linearGradient id="lederFaser" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.7" />
          <stop offset="0.22" stopColor="currentColor" stopOpacity="0.4" />
          <stop offset="0.6" stopColor="currentColor" stopOpacity="0.18" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.07" />
        </linearGradient>
      </defs>

      {/* Der Block, den der Schnitt zeigt. */}
      <Lage
        d={`M ${LINKS} ${OBEN} L ${RECHTS} ${OBEN} L ${RECHTS} ${UNTEN} L ${LINKS} ${UNTEN} Z`}
        fuellung={0.04} kante={0.18}
      />

      {/* Das Gefüge. */}
      <g fill="none" stroke="url(#lederFaser)" strokeWidth="1.1" strokeLinecap="round">
        {FASERN.map((d, i) => <path key={i} d={d} />)}
      </g>

      {/* Die Narbe: die gewachsene Oberfläche, als einzige Linie in voller
          Deckkraft. Sie ist das, was ein geschliffenes Leder verloren hat. */}
      <path
        d={`M ${LINKS} ${OBEN} L ${RECHTS} ${OBEN}`}
        stroke="currentColor" strokeOpacity="0.9" strokeWidth="2.4" fill="none"
      />

      {/* Die Spaltlinie. Gestrichelt, weil sie nicht im Material liegt,
          sondern eine Entscheidung ist. */}
      <path
        d={`M ${LINKS - 10} ${SPALT} L ${RECHTS + 10} ${SPALT}`}
        stroke="currentColor" strokeOpacity="0.75" strokeWidth="1.4"
        strokeDasharray="7 5" fill="none"
      />

      {/* Die Klammer über dem Teil, der vollnarbig heißt. */}
      <g stroke="currentColor" strokeOpacity="0.5" strokeWidth="1" fill="none">
        <path d={`M 104 ${OBEN} L 104 ${SPALT}`} />
        <path d={`M 99 ${OBEN} L 109 ${OBEN}`} />
        <path d={`M 99 ${SPALT} L 109 ${SPALT}`} />
      </g>

      {/* ── Beschriftung, links ─────────────────────────────────────── */}
      <Beschriftung x="12" y="70">Narbe</Beschriftung>
      <Fuehrung x1="58" y1="66" x2="128" y2="84" />

      <Beschriftung x="12" y="122" stark>Vollnarbig</Beschriftung>
      <Fuehrung x1="90" y1="118" x2="104" y2="118" />

      <Beschriftung x="12" y="248">Fleischseite</Beschriftung>
      <Fuehrung x1="92" y1="244" x2="130" y2="230" />

      {/* ── Beschriftung, rechts ────────────────────────────────────── */}
      <Beschriftung x="508" y="70" anker="end">Dicht</Beschriftung>
      <Fuehrung x1="470" y1="66" x2="398" y2="92" />

      <Beschriftung x="508" y="146" anker="end">Spaltlinie</Beschriftung>
      <Fuehrung x1="446" y1="142" x2="418" y2="149" />

      <Beschriftung x="508" y="200" anker="end">Spaltleder</Beschriftung>
      <Fuehrung x1="446" y1="196" x2="404" y2="190" />

      <Beschriftung x="508" y="248" anker="end">Lose</Beschriftung>
      <Fuehrung x1="478" y1="244" x2="400" y2="228" />
    </Tafel>
  )
}
