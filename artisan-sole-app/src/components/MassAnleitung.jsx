/**
 * MassAnleitung — wie man die zwei Maße nimmt, in drei Bildern.
 *
 * ── Warum nicht dieselbe Zeichnung wie FussMass ───────────────────────────
 *
 * FussMass zeigt, WELCHE zwei Maße genommen werden: eine Skizze mit Länge
 * und Umfang, beide eingetragen. Das beantwortet „was misst ihr" und nichts
 * weiter. Wer noch nie Maß genommen hat, steht danach vor der Frage, die
 * wirklich zählt: wie denn.
 *
 * Deshalb hier drei Bilder statt eines: Blatt und Stift, dann die zwei
 * Striche und das Lineal, dann das Maßband. Es ist dasselbe Verfahren, das
 * jeder Schuhmacher aufschreibt — Umriss nachzeichnen, Länge zwischen zwei
 * Marken messen, Umfang mit dem Band.
 *
 * ── Drei Bilder in einem Rahmen ───────────────────────────────────────────
 *
 * Alle drei liegen übereinander im selben Ausschnitt und werden geblendet,
 * statt nebeneinanderzustehen. Nebeneinander wäre jedes ein Drittel so groß
 * — auf dem Telefon unlesbar —, und die Folge würde ihren Sinn verlieren:
 * Man soll einen Handgriff nach dem anderen sehen, nicht drei auf einmal.
 *
 * Der Rahmen bleibt dabei fest. Springt der Ausschnitt zwischen den Bildern,
 * sieht es aus, als wechselte das Thema, und nicht, als ginge es weiter.
 *
 * ── Was nicht dargestellt ist ─────────────────────────────────────────────
 *
 * Keine Zahlen, keine Millimeter, keine Größentabelle. Die Zeichnung zeigt
 * Handgriffe; was dabei herauskommt und wie genau es sein muss, steht im
 * Text daneben (lib/massSchritte.js).
 */
import { Beschriftung, Lage, Massband, Tafel } from './Zeichnung'
import { FUSS_OBEN, FUSS_SCHNITT, MASSBAND_UM_DEN_BALLEN } from '../zeichnungen/fussFormen'

/* Der Fuß von oben, hineingerückt und etwas verkleinert. Ein Wert an einer
   Stelle: Wer die Zahlen in jedes Bild einzeln schreibt, hat nach der ersten
   Korrektur drei verschieden große Füße. */
const FUSS_LAGE = 'translate(152 26) scale(0.82)'

/* Der abgezeichnete Umriss: derselbe Fuß, eine Spur größer. Genau so sieht
   es aus, wenn man mit dem Stift außen herumfährt — ein Bleistift hat eine
   Dicke, und man hält ihn nie ganz senkrecht. */
const UMRISS_LAGE = 'translate(146 20) scale(0.855)'

/* Das Blatt Papier. Leicht gedreht, weil ein Blatt auf dem Boden nie gerade
   liegt — und weil eine Zeichnung, in der alles rechtwinklig steht, wie ein
   Bauplan aussieht und nicht wie eine Anleitung. */
const BLATT = 'M 168 30 L 344 38 L 336 246 L 160 238 Z'

/* Der Bleistift, rechts am Fuß, Spitze auf dem Umriss. Sechseckig angedeutet
   durch den Mittelstrich — ohne ihn ist es ein Stab. */
const STIFT_KOERPER = 'M 322 96 L 338 100 L 314 186 L 298 182 Z'
const STIFT_SPITZE  = 'M 298 182 L 314 186 L 302 206 Z'
const STIFT_MITTE   = 'M 330 98 L 306 184'

const SZENEN = [1, 2, 3]
const UEBERBLENDUNG = { transition: 'opacity 620ms cubic-bezier(.22,1,.36,1)' }

/**
 * @param {number|null} [schritt] 1 Umriss, 2 Länge, 3 Umfang. `null` zeigt
 *   das letzte Bild — der Fall ohne Folge und der des Vorrenderers.
 */
export default function MassAnleitung({ className = '', schritt = null }) {
  const jetzt = schritt == null ? 3 : Math.min(3, Math.max(1, schritt))

  return (
    <Tafel viewBox="0 0 520 268" className={className}>
      {SZENEN.map(n => (
        <g
          key={n}
          style={{ ...UEBERBLENDUNG, opacity: n === jetzt ? 1 : 0 }}
          aria-hidden={n !== jetzt}
          pointerEvents="none"
        >
          {/* ── Das Blatt. In allen drei Bildern dasselbe, damit der Boden
                unter der Folge nicht wechselt. Im dritten fehlt es: Dort
                steht man nicht mehr auf dem Papier. */}
          {n < 3 && (
            <path d={BLATT} fill="currentColor" fillOpacity="0.045"
                  stroke="currentColor" strokeOpacity="0.28" strokeWidth="1" />
          )}

          {/* ── 1 · Der Umriss wird gezeichnet ───────────────────────── */}
          {n === 1 && (
            <>
              <g transform={UMRISS_LAGE}>
                <path d={FUSS_OBEN} fill="none" stroke="currentColor"
                      strokeOpacity="0.5" strokeWidth="1.4" strokeDasharray="5 4" />
              </g>
              <g transform={FUSS_LAGE}>
                <Lage d={FUSS_OBEN} fuellung={0.12} kante={0.45} />
              </g>
              <path d={STIFT_KOERPER} fill="currentColor" fillOpacity="0.12"
                    stroke="currentColor" strokeOpacity="0.55" strokeWidth="1" />
              <path d={STIFT_SPITZE} fill="currentColor" fillOpacity="0.55"
                    stroke="currentColor" strokeOpacity="0.55" strokeWidth="1" />
              <path d={STIFT_MITTE} stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" fill="none" />
              <Beschriftung x="20" y="44">Umriss</Beschriftung>
              <Beschriftung x="380" y="120">Stift senkrecht</Beschriftung>
            </>
          )}

          {/* ── 2 · Zwei Striche, dazwischen gemessen ────────────────── */}
          {n === 2 && (
            <>
              <g transform={UMRISS_LAGE}>
                <path d={FUSS_OBEN} fill="none" stroke="currentColor"
                      strokeOpacity="0.4" strokeWidth="1.4" strokeDasharray="5 4" />
              </g>
              {/* Die zwei Marken: an der Ferse und an der längsten Zehe.
                  Quer über das Blatt, wie man sie mit dem Lineal zieht. */}
              <path d="M 166 220 L 340 226" stroke="currentColor" strokeOpacity="0.75" strokeWidth="1.6" fill="none" />
              <path d="M 170 52 L 344 60" stroke="currentColor" strokeOpacity="0.75" strokeWidth="1.6" fill="none" />
              <Massband x1="390" y1="58" x2="390" y2="224" quer={9} />
              <Beschriftung x="406" y="146" stark>Länge</Beschriftung>
              <Beschriftung x="20" y="238">Ferse</Beschriftung>
              <Beschriftung x="20" y="44">Längste Zehe</Beschriftung>
            </>
          )}

          {/* ── 3 · Das Maßband um den Ballen ────────────────────────── */}
          {n === 3 && (
            <g transform="translate(-388 -66) scale(1.7)">
              <Lage d={FUSS_SCHNITT} fuellung={0.12} kante={0.45} />
              <path d="M 292 164 L 470 164" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" fill="none" />
              <path
                d={MASSBAND_UM_DEN_BALLEN}
                stroke="currentColor" strokeOpacity="0.85" strokeWidth="1.5"
                strokeDasharray="3 3.5" fill="none" strokeLinecap="round"
              />
            </g>
          )}
          {n === 3 && (
            <>
              <Beschriftung x="20" y="44">Breiteste Stelle</Beschriftung>
              <Beschriftung x="500" y="44" anker="end" stark>Ballenumfang</Beschriftung>
              <Beschriftung x="260" y="248" anker="middle">Einmal ganz herum</Beschriftung>
            </>
          )}
        </g>
      ))}
    </Tafel>
  )
}
