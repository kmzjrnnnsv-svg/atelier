/**
 * SpannerSchnitt — was ein Schuhspanner im Schuh tut.
 *
 * ── Warum eine Zeichnung ──────────────────────────────────────────────────
 *
 * „Zedernholz hält die Form und zieht Feuchtigkeit" steht auf jeder Packung
 * und sagt niemandem etwas, der noch nie einen Schuh ohne Spanner altern
 * gesehen hat. Was passiert, passiert innen und über Monate: Der Schaft
 * sackt über dem Ballen ein, die Falte gräbt sich fest, und irgendwann ist
 * sie im Leder wie eine Narbe.
 *
 * Im Schnitt sieht man es in fünf Bildern. Erst der Schuh am Abend, mit
 * hängendem Schaft und zwei Falten; dann das Holz, das hineinfährt; dann die
 * Linie, die sich wieder streckt. Das ist derselbe Gedanke wie beim
 * Rahmenschnitt: Zeig den Vorgang, nicht das Ergebnis.
 *
 * ── Wie sie gebaut ist ────────────────────────────────────────────────────
 *
 * Der Schuh steht im Profil, Spitze nach rechts. Zwei Fassungen desselben
 * Schafts liegen übereinander — eine eingesackte und eine straffe —, und der
 * Schritt blendet die eine gegen die andere. Der Spanner fährt von hinten
 * ein, wie man ihn wirklich hineinschiebt.
 *
 * Alles ist `currentColor` in abgestufter Deckkraft, damit die Zeichnung die
 * Schriftfarbe ihrer Umgebung annimmt (siehe Zeichnung.jsx). Für eine
 * Vorleseroutine ist sie Beiwerk; was sie zeigt, steht daneben in Worten.
 *
 * Ohne `schritt` (Vorrenderer, keine Bewegung) steht das Ende da: der
 * gespannte Schuh mit dem Holz darin. Eine Zeichnung, die ohne JavaScript
 * einen hängenden Schaft zeigt, wäre die falsche Werbung.
 */
import { Fuehrung, Beschriftung, Lage, Tafel } from './Zeichnung'

/* Die Schritte, auf die sich die Angaben hier beziehen, stehen in
   lib/pflegeSchritte.js — zusammen mit den Sätzen daneben. */

/** Eine Lage, die zu einem Schritt erscheint oder verschwindet. */
function Teil({ da, aus = 'still', children }) {
  const versatz = {
    hinten: 'translateX(-34px)',
    oben:   'translateY(-18px)',
    still:  'none',
  }[aus]

  return (
    <g
      style={{
        opacity: da ? 1 : 0,
        transform: da ? 'none' : versatz,
        transition: 'opacity 620ms cubic-bezier(0.22, 1, 0.36, 1), '
                  + 'transform 620ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      {children}
    </g>
  )
}

/* ── Der Schaft in zwei Fassungen ──────────────────────────────────────────

   Diese Zeichnung ist dreimal danebengegangen, bevor sie ein Schuh wurde.
   Drei Dinge machen den Unterschied, und alle drei sind unscheinbar:

   1. DIE ÖFFNUNG. Ohne sie ist jeder Umriss ein Gegenstand — eine Maus, ein
      Bügeleisen, ein Auto. Die schmale Sichel vom Fersenrand bis zum Rist
      ist das Einzige, was aus der Fläche einen Schuh macht, und sie ist
      nebenbei die Stelle, durch die der Spanner hineinfährt.

   2. DIE FERSENKAPPE IST SCHMAL. Sie steht über den ersten vierzehn Prozent
      der Länge fast senkrecht. Als Kuppel über dem ersten Drittel sah das
      Ganze aus wie eine Computermaus.

   3. DIE LINIE FÄLLT DURCHGEHEND. Vom Fersenrand bis zur Spitze geht es
      immer abwärts — erst schnell, dann flach, dann wieder etwas steiler.
      Lässt man sie über der Kappe noch einmal ansteigen, entsteht ein
      Buckel, den kein Schuh hat.

   Beide Wege haben denselben Anfang, dasselbe Ende und dieselbe Fersenlinie
   — nur zwischen Rist und Kappe hängt der eine durch. Nur so blendet die
   eine Fassung sauber in die andere.

   Maße: Sohlenoberkante y = 238, Länge x = 96 … 424, Kappenhöhe 92. */
const SACKT = 'M 96 238 '
            + 'C 90 210, 94 176, 110 158 '
            + 'C 118 149, 132 146, 146 150 '
            + 'C 158 163, 176 178, 200 189 '
            + 'C 232 201, 262 208, 292 210 '
            + 'C 330 218, 372 220, 402 226 '
            + 'Q 420 231, 424 238 Z'

const STRAFF = 'M 96 238 '
             + 'C 90 208, 94 172, 110 154 '
             + 'C 118 145, 132 142, 146 146 '
             + 'C 158 158, 176 172, 200 182 '
             + 'C 232 194, 262 200, 292 200 '
             + 'C 330 202, 372 212, 402 224 '
             + 'Q 420 230, 424 238 Z'

/* Die Öffnung, zu jeder der beiden Fassungen. Sie liegt auf der Blattkante
   und ist nur sieben Einheiten dick — mehr wäre ein Schlitz, weniger ein
   Strich. */
const SPALT_SACKT = 'M 146 150 C 160 164, 180 178, 204 188 C 236 200, 264 206, 292 210 '
                  + 'C 262 212, 228 208, 196 195 C 170 185, 152 168, 142 154 Z'

const SPALT_STRAFF = 'M 146 146 C 160 160, 180 174, 204 184 C 236 196, 264 200, 292 200 '
                   + 'C 262 204, 228 200, 196 188 C 170 178, 152 162, 142 150 Z'

/** Die zwei Falten über dem Ballen — das, was bleibt, wenn nichts passiert. */
function Falten() {
  return (
    <g stroke="currentColor" strokeWidth="1.4" fill="none" opacity="0.5" strokeLinecap="round">
      <path d="M 316 216 Q 326 227 322 238" />
      <path d="M 340 219 Q 350 229 346 238" />
    </g>
  )
}

/** Die Feuchtigkeit, die das Holz durch die Öffnung abgibt. */
function Feuchte() {
  return (
    <g stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.45" strokeLinecap="round">
      <path d="M 152 142 q 7 -13 0 -24 q -7 -12 0 -22" />
      <path d="M 178 164 q 7 -13 0 -24 q -7 -12 0 -22" />
      <path d="M 204 178 q 7 -13 0 -24 q -7 -12 0 -22" />
    </g>
  )
}

/** Die Bürste, während gebürstet wird. */
function Buerste() {
  return (
    <g>
      <Lage d="M 290 152 Q 290 140 304 140 L 400 140 Q 414 140 414 152 L 414 166 L 290 166 Z" fuellung={0.3} kante={0.5} />
      <g stroke="currentColor" strokeWidth="1.1" opacity="0.4" strokeLinecap="round">
        {Array.from({ length: 18 }, (_, i) => 296 + i * 6.7).map(x => (
          <path key={x} d={`M ${x} 166 L ${x} 188`} />
        ))}
      </g>
    </g>
  )
}

const AUSSCHNITT = {
  weit: '0 80 540 228',    // mit der Beschriftung am Rand
  eng:  '84 126 358 162',  // nur der Schuh — für schmale Geräte
}

/**
 * @param {number|null} [schritt] Wie weit die Folge ist (0 … PFLEGE.length-1).
 *   `null` zeigt den gespannten, gepflegten Schuh.
 * @param {'weit'|'eng'} [ausschnitt] `eng` lässt die Beschriftung weg.
 */
export default function SpannerSchnitt({ className = '', schritt = null, ausschnitt = 'weit' }) {
  const eng = ausschnitt === 'eng'
  const ab = (n) => schritt == null || schritt >= n

  const straff = ab(2)
  const spanner = ab(1)
  const blende = 'opacity 620ms cubic-bezier(0.22, 1, 0.36, 1)'

  return (
    <Tafel viewBox={AUSSCHNITT[eng ? 'eng' : 'weit']} className={className}>
      {/* ── Laufsohle und Absatz ──────────────────────────────────────
          Der Absatz sitzt hinten und trägt bis unter die Ferse; davor
          läuft die Sohle als schmaler Streifen bis über die Spitze
          hinaus — der Rand, der bei einem gerahmten Schuh übersteht. */}
      <Lage
        d="M 92 238 L 424 238 Q 434 238 434 245 Q 434 252 424 252 L 156 252 L 156 274 Q 156 278 152 278 L 96 278 Q 92 278 92 274 Z"
        fuellung={0.2} kante={0.5}
      />

      {/* ── Der Spanner, von hinten eingeschoben ─────────────────────── */}
      <Teil da={spanner} aus="hinten">
        {/* Fersenteil: füllt den hinteren Kegel bis unter die Kappe */}
        <Lage d="M 106 236 C 100 208, 106 178, 120 162 C 128 154, 140 154, 148 166 L 160 188 L 160 236 Z" fuellung={0.16} kante={0.45} />
        {/* Vorderteil, das in die Spitze greift */}
        <Lage d="M 286 214 C 324 210, 368 217, 398 227 Q 408 231, 410 236 L 286 236 Z" fuellung={0.16} kante={0.45} />
        {/* Die Spindel dazwischen, die beide auseinanderdrückt */}
        <Lage d="M 160 214 L 288 214 L 288 224 L 160 224 Z" fuellung={0.24} kante={0.5} />
        <circle cx="224" cy="219" r="9" fill="currentColor" fillOpacity="0.24" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1" />
      </Teil>

      {/* ── Der Schaft: zwei Fassungen, eine blendet in die andere ───── */}
      <g style={{ opacity: straff ? 0 : 1, transition: blende }}>
        <Lage d={SACKT} fuellung={0.09} kante={0.5} />
        <Lage d={SPALT_SACKT} fuellung={0.3} kante={0.45} strich={0.8} />
        <Falten />
      </g>
      <g style={{ opacity: straff ? 1 : 0, transition: blende }}>
        <Lage d={STRAFF} fuellung={0.09} kante={0.55} />
        <Lage d={SPALT_STRAFF} fuellung={0.3} kante={0.45} strich={0.8} />
      </g>

      {/* ── Die Nähte ─────────────────────────────────────────────────
          Kappennaht vorn, Fersenkappe hinten, drei Striche für die
          Schnürung. Sie gehören zu keinem Schritt — sie sind immer da. */}
      <g stroke="currentColor" strokeWidth="1" fill="none" opacity="0.36" strokeLinecap="round">
        <path d="M 362 213 Q 369 226 367 238" />
        <path d="M 144 150 Q 132 194 137 238" />
        <path d="M 186 188 L 199 179" />
        <path d="M 204 197 L 217 188" />
        <path d="M 224 203 L 237 195" />
      </g>

      {/* ── Der Glanz auf der Kappe, wenn gepflegt ist ───────────────── */}
      <Teil da={ab(4)}>
        <path
          d="M 376 217 C 388 214, 400 219, 408 227"
          stroke="currentColor" strokeOpacity="0.55" strokeWidth="2.6" fill="none" strokeLinecap="round"
        />
      </Teil>

      {/* ── Die Feuchtigkeit ─────────────────────────────────────────── */}
      <Teil da={ab(3)} aus="oben"><Feuchte /></Teil>

      {/* ── Die Bürste, nur solange gebürstet wird ───────────────────── */}
      <Teil da={schritt === 4} aus="oben"><Buerste /></Teil>

      {/* ── Beschriftung ─────────────────────────────────────────────── */}
      {!eng && (
        <>
          <Teil da={!straff}>
            <Beschriftung x="524" y="266" anker="end">Falte über dem Ballen</Beschriftung>
            <Fuehrung x1={372} y1={262} x2={330} y2={240} />
          </Teil>
          <Teil da={spanner}>
            <Beschriftung x="12" y="296">Zedernholz</Beschriftung>
            <Fuehrung x1={88} y1={292} x2={130} y2={232} />
          </Teil>
          <Teil da={ab(3)}>
            <Beschriftung x="12" y="98">Feuchtigkeit</Beschriftung>
            <Fuehrung x1={86} y1={94} x2={148} y2={104} />
          </Teil>
        </>
      )}
    </Tafel>
  )
}
