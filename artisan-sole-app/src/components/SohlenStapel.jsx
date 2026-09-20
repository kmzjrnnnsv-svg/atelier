/**
 * SohlenStapel — derselbe Schuh, von oben auseinandergenommen.
 *
 * ── Warum es diese Zeichnung zusätzlich gibt ──────────────────────────────
 *
 * Der Rahmenschnitt (RahmenSchnitt.jsx) zeigt den Aufbau als Querschnitt:
 * Man sieht, wie die Lagen ineinandergreifen, und man sieht die beiden
 * Nähte. Was er NICHT zeigt, ist die Form. Ein Querschnitt ist zwei
 * Millimeter Schuh; wie eine Brandsohle aussieht, wie schmal ein Gelenk
 * wird, wie eine Laufsohle geschnitten ist — davon steht dort nichts.
 *
 * Diese Zeichnung macht das Gegenteil: Sie legt die Teile flach
 * übereinander, wie auf dem Tisch eines Schuhmachers, und jedes hat seine
 * eigene Kontur. Beide zusammen sind erst der ganze Schuh — der Schnitt
 * sagt, WIE es zusammenhängt, der Stapel sagt, WAS zusammenkommt.
 *
 * ── Worauf sie hinausläuft ────────────────────────────────────────────────
 *
 * Auf die Trennlinie. Die vier oberen Teile — Oberschuh, Brandsohle, Rahmen,
 * Kork — bleiben ein Leben lang beieinander; die beiden unteren, Laufsohle
 * und Absatz, sind Verschleiß und werden gewechselt. Genau dort läuft die
 * Doppelnaht, und genau deshalb lässt sich ein rahmengenähter Schuh neu
 * besohlen: Man trennt eine Naht auf, die nichts hält außer der Sohle.
 *
 * Beim geklebten Schuh gibt es diese Linie nicht. Dort ist die Sohle mit dem
 * Schaft verklebt, und was verklebt ist, geht nur kaputt zusammen.
 *
 * ── Wie sie gebaut ist ────────────────────────────────────────────────────
 *
 * Eine Kontur, sechsmal verwendet. Der Oberschuh steht im Profil darüber —
 * so wie auf den Tafeln in Werkstattbüchern, wo das fertige Stück oben steht
 * und die Teile darunter. Jede Lage bekommt eine Dicke, indem dieselbe
 * Kontur ein paar Einheiten tiefer noch einmal darunterliegt.
 *
 * Alles ist `currentColor` in abgestufter Deckkraft (siehe Zeichnung.jsx).
 * Ohne `schritt` steht alles da — der Fall des Vorrenderers und der Fall
 * „keine Bewegung".
 */
import { Fuehrung, Beschriftung, Lage, Tafel } from './Zeichnung'

/* Die Kontur einer Sohle von oben, Spitze rechts: runde Ferse, schmales
   Gelenk, breiter Ballen, stumpfe Kappe. Sie liegt um (0,0) und ist 376
   Einheiten lang — alle Lagen benutzen dieselbe, weil sie im Schuh auch
   dieselbe ist. */
const SOHLE = 'M 74 -23 '
            + 'C 46 -23, 30 -13, 30 0 C 30 13, 46 23, 74 23 '
            + 'C 114 23, 152 16, 184 13 '
            + 'C 226 10, 268 23, 302 31 '
            + 'C 346 41, 386 33, 400 14 '
            + 'C 406 6, 406 -6, 400 -14 '
            + 'C 386 -33, 346 -41, 302 -31 '
            + 'C 268 -23, 226 -10, 184 -13 '
            + 'C 152 -16, 114 -23, 74 -23 Z'

/* Der Absatz deckt nur die Ferse ab, bis ans Gelenk. */
const ABSATZ = 'M 74 -23 '
             + 'C 46 -23, 30 -13, 30 0 C 30 13, 46 23, 74 23 '
             + 'C 106 23, 134 20, 156 18 L 158 -18 '
             + 'C 134 -20, 106 -23, 74 -23 Z'

/* Der Mittelpunkt der Kontur — gebraucht, um sie für Rippe und Innenkante
   um sich selbst zu stauchen. */
const MITTE = 'translate(218 2) scale(0.87) translate(-218 -2)'

/** Der Oberschuh im Profil, stark verkleinert über dem Stapel. */
const OBERSCHUH = 'M 90 238 '
                + 'C 83 212, 85 176, 98 158 C 105 148, 115 143, 128 145 '
                + 'C 170 150, 214 156, 256 162 C 292 168, 318 177, 340 190 '
                + 'C 362 196, 380 200, 396 207 C 412 215, 424 226, 428 238 Z'
const FUTTERKANTE = 'M 128 145 C 170 150, 214 156, 256 162 C 278 165, 296 170, 308 176 '
                  + 'C 292 177, 268 174, 244 170 C 204 164, 164 158, 124 151 Z'
const SATTEL = 'M 278 184 L 286 159 Q 288 154 294 154 L 306 155 Q 311 155 312 160 '
             + 'L 314 170 L 326 169 L 327 159 Q 328 154 334 154 L 346 156 '
             + 'Q 351 157 352 162 L 358 192 Z'

/**
 * Eine Lage, die zu ihrem Schritt hereinkommt.
 *
 * `aus` sagt, woher — von unten die Sohlen, von der Seite der Rahmen, weil
 * er seitlich angelegt wird. `weg` schiebt sie am Ende wieder fort: Das ist
 * der letzte Schritt, in dem die Sohle den Schuh verlässt.
 */
function Lagenteil({ da, aus = 'unten', weg = 0, children }) {
  const versatz = {
    unten:  'translateY(30px)',
    oben:   'translateY(-24px)',
    links:  'translateX(-40px)',
    still:  'none',
  }[aus]

  return (
    <g
      style={{
        opacity: da ? 1 : 0,
        transform: da ? `translateY(${weg}px)` : versatz,
        transition: 'opacity 620ms cubic-bezier(0.22, 1, 0.36, 1), '
                  + 'transform 760ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      {children}
    </g>
  )
}

/**
 * Eine flache Lage mit Dicke.
 *
 * Dieselbe Kontur liegt ein paar Einheiten tiefer noch einmal darunter und
 * schaut unten hervor. Das ist der ganze Trick, mit dem aus einem Umriss
 * ein Stück Leder wird, das man anfassen könnte.
 */
function Platte({ d = SOHLE, dicke = 6, fuellung = 0.1, children }) {
  return (
    <g>
      <path
        d={d}
        transform={`translate(0 ${dicke})`}
        fill="currentColor" fillOpacity={fuellung + 0.12}
        stroke="currentColor" strokeOpacity="0.35" strokeWidth="1"
        strokeLinejoin="round"
      />
      <Lage d={d} fuellung={fuellung} kante={0.55} strich={1.1} />
      {children}
    </g>
  )
}

/* Wo die Lagen liegen. Der Abstand ist überall gleich, nur zwischen Kork
   und Laufsohle ist er größer — dort läuft die Trennlinie, und ein Auge
   liest einen größeren Abstand als eine Grenze, bevor es die Beschriftung
   gelesen hat. */
const HOEHE = { brand: 168, rahmen: 232, kork: 296, lauf: 380, absatz: 444 }

/** Um wie viel die Sohle im letzten Schritt abrückt. */
const ABRUECKEN = 34

/* Der Ausschnitt muss den letzten Schritt mitnehmen: Dort rückt die Sohle
   um ABRÜCKEN nach unten ab, und was über den Rand hinausragt, schneidet
   das SVG ab. Deshalb unten Luft, die in den ersten sechs Schritten leer
   bleibt — lieber ein ruhiger Rand als ein abgeschnittener Absatz. */
const AUSSCHNITT = {
  weit: '0 12 600 550',
  eng:  '158 12 404 550',
}

/**
 * @param {number|null} [schritt] 0 … 6. `null` zeigt den fertigen Stapel.
 * @param {'weit'|'eng'} [ausschnitt] `eng` lässt die Beschriftung weg.
 */
export default function SohlenStapel({ className = '', schritt = null, ausschnitt = 'weit' }) {
  const eng = ausschnitt === 'eng'
  const ab = (n) => schritt == null || schritt >= n
  const getrennt = schritt === 6

  return (
    <Tafel viewBox={AUSSCHNITT[eng ? 'eng' : 'weit']} className={className}>
      {/* ── Der Oberschuh ─────────────────────────────────────────────
          Im Profil, weil man einen Schuh so kennt, und oben, weil dort
          hingehört, was aus dem Stapel darunter wird. */}
      <Lagenteil da={ab(0)} aus="oben">
        {/* Maßstab und Lage: Der Schuh ist im Profil 352 Einheiten lang, die
            Sohlenkontur von oben 376. Bei 0,82 sind beide fast gleich lang —
            so liest man den Stapel als denselben Schuh und nicht als zwei
            Zeichnungen. Der Versatz rückt ihn über die Mitte der Konturen. */}
        <g transform="translate(145 -90) scale(0.82)">
          <Lage d={OBERSCHUH} fuellung={0.08} kante={0.7} strich={1.6} />
          <Lage d={FUTTERKANTE} fuellung={0.22} kante={0.45} strich={1.2} />
          <Lage d={SATTEL} fuellung={0.2} kante={0.6} strich={1.4} />
        </g>
      </Lagenteil>

      {/* ── Die Lagen, von oben nach unten in der Reihenfolge, in der
             sie im Schuh liegen ───────────────────────────────────── */}
      <g transform="translate(140 0)">
        {/* Brandsohle mit aufgestellter Rippe */}
        <Lagenteil da={ab(1)} aus="unten">
          <g transform={`translate(0 ${HOEHE.brand})`}>
            <Platte fuellung={0.13}>
              <path
                d={SOHLE} transform={MITTE}
                fill="none" stroke="currentColor" strokeOpacity="0.5"
                strokeWidth="1.6" strokeDasharray="1 4" strokeLinecap="round"
              />
            </Platte>
          </g>
        </Lagenteil>

        {/* Der Rahmen: ein Band rundherum, kein Blatt. Deshalb nur ein
            dicker Strich auf der Kontur — genau das ist er auch. */}
        <Lagenteil da={ab(2)} aus="links">
          <g transform={`translate(0 ${HOEHE.rahmen})`}>
            <path
              d={SOHLE} transform="translate(0 5)"
              fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="11"
            />
            <path
              d={SOHLE}
              fill="none" stroke="currentColor" strokeOpacity="0.5" strokeWidth="11"
            />
            <path d={SOHLE} fill="none" stroke="currentColor" strokeOpacity="0.7" strokeWidth="1" />
            <path d={SOHLE} transform={MITTE} fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1" />
          </g>
        </Lagenteil>

        {/* Korkbettung: die Fläche, die der Rahmen umschließt */}
        <Lagenteil da={ab(3)} aus="unten">
          <g transform={`translate(0 ${HOEHE.kork})`}>
            <Platte fuellung={0.06} dicke={8}>
              {/* Die Körnung. Aus einem Sinus und nicht aus Math.random,
                  damit die Zeichnung bei jedem Bild dieselbe ist. */}
              <g fill="currentColor" fillOpacity="0.3">
                {Array.from({ length: 64 }, (_, i) => {
                  const x = 46 + ((i * 53) % 340)
                  const y = Math.sin(i * 2.4) * 22 + Math.sin(i * 0.7) * 6
                  return <circle key={i} cx={x} cy={y} r={1.1 + (i % 3) * 0.4} />
                })}
              </g>
            </Platte>
          </g>
        </Lagenteil>

        {/* Laufsohle — unterhalb der Trennlinie */}
        <Lagenteil da={ab(4)} aus="unten" weg={getrennt ? ABRUECKEN : 0}>
          <g transform={`translate(0 ${HOEHE.lauf})`}>
            <Platte fuellung={0.16} dicke={7}>
              {/* Die Doppelnaht sitzt im Rahmenbereich, also auf der
                  Kontur — nicht mittig auf dem Blatt. */}
              <Lagenteil da={ab(5)} aus="still">
                <path
                  d={SOHLE}
                  fill="none" stroke="currentColor" strokeOpacity="0.85"
                  strokeWidth="1.8" strokeDasharray="2.5 4.5" strokeLinecap="round"
                  transform="translate(218 2) scale(0.955) translate(-218 -2)"
                />
              </Lagenteil>
            </Platte>
          </g>
        </Lagenteil>

        {/* Absatz — ebenfalls unterhalb der Trennlinie */}
        <Lagenteil da={ab(4)} aus="unten" weg={getrennt ? ABRUECKEN : 0}>
          <g transform={`translate(0 ${HOEHE.absatz})`}>
            <Platte d={ABSATZ} fuellung={0.2} dicke={9} />
          </g>
        </Lagenteil>
      </g>

      {/* ── Beschriftung ─────────────────────────────────────────────── */}
      {!eng && (
        <>
          <Lagenteil da={ab(0)} aus="still">
            <Beschriftung x="14" y="66">Oberschuh</Beschriftung>
            <Fuehrung x1={92} y1={62} x2={168} y2={78} />
          </Lagenteil>
          <Lagenteil da={ab(1)} aus="still">
            <Beschriftung x="14" y={HOEHE.brand + 4}>Brandsohle</Beschriftung>
            <Fuehrung x1={94} y1={HOEHE.brand} x2={172} y2={HOEHE.brand} />
          </Lagenteil>
          <Lagenteil da={ab(2)} aus="still">
            <Beschriftung x="14" y={HOEHE.rahmen + 4}>Rahmen</Beschriftung>
            <Fuehrung x1={72} y1={HOEHE.rahmen} x2={170} y2={HOEHE.rahmen} />
          </Lagenteil>
          <Lagenteil da={ab(3)} aus="still">
            <Beschriftung x="14" y={HOEHE.kork + 4}>Kork</Beschriftung>
            <Fuehrung x1={58} y1={HOEHE.kork} x2={170} y2={HOEHE.kork} />
          </Lagenteil>
          <Lagenteil da={ab(4)} aus="still" weg={getrennt ? ABRUECKEN : 0}>
            <Beschriftung x="14" y={HOEHE.lauf + 4}>Laufsohle</Beschriftung>
            <Fuehrung x1={86} y1={HOEHE.lauf} x2={170} y2={HOEHE.lauf} />
          </Lagenteil>
          <Lagenteil da={ab(4)} aus="still" weg={getrennt ? ABRUECKEN : 0}>
            <Beschriftung x="14" y={HOEHE.absatz + 4}>Absatz</Beschriftung>
            <Fuehrung x1={68} y1={HOEHE.absatz} x2={176} y2={HOEHE.absatz} />
          </Lagenteil>
          {/* Die Doppelnaht steht bei den anderen Bezeichnungen links und
              nicht rechts am Blatt: Dort lag sie auf der Laufsohle, und eine
              Beschriftung, die im Bild liegt, ist keine. */}
          <Lagenteil da={ab(5)} aus="still" weg={getrennt ? ABRUECKEN : 0}>
            <Beschriftung x="14" y={HOEHE.lauf + 38} stark>Doppelnaht</Beschriftung>
            <Fuehrung x1={90} y1={HOEHE.lauf + 34} x2={190} y2={HOEHE.lauf + 16} />
          </Lagenteil>
        </>
      )}

      {/* ── Die Trennlinie ────────────────────────────────────────────
          Der letzte Schritt und der Grund für die ganze Tafel: oben,
          was bleibt; unten, was gewechselt wird. Zwei Klammern am
          rechten Rand, dazwischen die Linie, an der getrennt wird. */}
      <Lagenteil da={getrennt} aus="still">
        <path
          d={`M 140 ${HOEHE.lauf - 36} L 560 ${HOEHE.lauf - 36}`}
          stroke="currentColor" strokeOpacity="0.35" strokeWidth="1"
          strokeDasharray="6 5" fill="none"
        />
        {!eng && (
          <>
            <Beschriftung x="586" y="120" anker="end" stark>bleibt</Beschriftung>
            <Beschriftung x="586" y={HOEHE.absatz + 40} anker="end" stark>wird gewechselt</Beschriftung>
            <g stroke="currentColor" strokeOpacity="0.4" strokeWidth="1" fill="none">
              <path d="M 560 34 L 570 34 L 570 296 L 560 296" />
              <path d={`M 560 ${HOEHE.lauf - 20} L 570 ${HOEHE.lauf - 20} L 570 ${HOEHE.absatz + 26} L 560 ${HOEHE.absatz + 26}`} />
            </g>
          </>
        )}
      </Lagenteil>
    </Tafel>
  )
}
