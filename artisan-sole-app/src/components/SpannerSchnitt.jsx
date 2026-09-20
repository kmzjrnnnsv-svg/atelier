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

/* ── Der Schuh ─────────────────────────────────────────────────────────────

   Ein Loafer, weil der Laden vor allem Loafer baut und weil er im Profil
   das dankbarste Modell ist: kein Schnürsenkel, dafür der Sattel als
   Erkennungszeichen.

   Diese Zeichnung ist mehrmals danebengegangen, bevor sie ein Schuh wurde.
   Vier Dinge machen den Unterschied, und alle vier sind unscheinbar:

   1. DIE FUTTERKANTE. Ohne sie ist jeder Umriss ein Gegenstand — eine Maus,
      ein Bügeleisen. Die schmale Sichel vom Fersenrand bis zum Rist ist das
      Einzige, was aus der Fläche einen Schuh macht, und sie ist nebenbei die
      Stelle, durch die der Spanner hineinfährt.

   2. DIE SPITZE IST STUMPF. Die Blattlinie bleibt bis etwa neunzig Prozent
      der Länge oben und fällt erst dann. Läuft sie gleichmäßig aus, entsteht
      ein Keil, der aussieht wie ein Schlittschuh.

   3. DIE LINIE FÄLLT DURCHGEHEND. Vom Fersenrand bis zur Kappe geht es immer
      abwärts. Lässt man sie dazwischen ansteigen, entsteht ein Buckel, den
      kein Schuh hat.

   4. DER SATTEL SITZT VORN. Bei etwa sechzig Prozent der Länge, nicht in der
      Mitte, und er ragt über die Futterkante hinaus — sonst liegt er wie ein
      Pflaster auf dem Blatt.

   Maße: Sohlenoberkante y = 238, Länge x = 90 … 428, Kappenhöhe 87. */
const SACKT = 'M 90 238 '
            + 'C 83 214, 85 182, 98 164 '
            + 'C 105 154, 115 149, 128 152 '
            + 'C 170 158, 214 166, 256 174 '
            + 'C 292 181, 318 190, 340 200 '
            + 'C 362 206, 380 208, 396 212 '
            + 'C 412 218, 424 227, 428 238 Z'

const STRAFF = 'M 90 238 '
             + 'C 83 212, 85 176, 98 158 '
             + 'C 105 148, 115 143, 128 145 '
             + 'C 170 150, 214 156, 256 162 '
             + 'C 292 168, 318 177, 340 190 '
             + 'C 362 196, 380 200, 396 207 '
             + 'C 412 215, 424 226, 428 238 Z'

/* Die Futterkante, zu jeder der beiden Fassungen. Sie liegt auf der
   Blattkante und ist nur sechs Einheiten dick — mehr wäre ein Schlitz,
   weniger ein Strich. */
const SPALT_SACKT = 'M 128 152 C 170 158, 214 166, 256 174 C 278 177, 296 182, 308 188 '
                  + 'C 292 189, 268 186, 244 182 C 204 175, 164 167, 124 158 Z'

const SPALT_STRAFF = 'M 128 145 C 170 150, 214 156, 256 162 C 278 165, 296 170, 308 176 '
                   + 'C 292 177, 268 174, 244 170 C 204 164, 164 158, 124 151 Z'

/* Der Sattel mit dem Schlitz. Er sitzt bei sechzig Prozent der Länge und
   ragt über die Futterkante hinaus, wie beim echten Penny Loafer. */
const SATTEL_SACKT = 'M 278 194 L 286 169 Q 288 164 294 164 L 306 165 Q 311 165 312 170 '
                   + 'L 314 180 L 326 179 L 327 169 Q 328 164 334 164 L 346 166 '
                   + 'Q 351 167 352 172 L 358 200 Z'

const SATTEL_STRAFF = 'M 278 184 L 286 159 Q 288 154 294 154 L 306 155 Q 311 155 312 160 '
                    + 'L 314 170 L 326 169 L 327 159 Q 328 154 334 154 L 346 156 '
                    + 'Q 351 157 352 162 L 358 192 Z'

/** Die zwei Falten über dem Ballen — das, was bleibt, wenn nichts passiert. */
function Falten() {
  return (
    <g stroke="currentColor" strokeWidth="1.4" fill="none" opacity="0.5" strokeLinecap="round">
      <path d="M 366 212 Q 374 225 370 238" />
      <path d="M 386 215 Q 394 227 390 238" />
    </g>
  )
}

/** Die Feuchtigkeit, die das Holz durch die Öffnung abgibt. */
function Feuchte() {
  return (
    <g stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.45" strokeLinecap="round">
      <path d="M 150 140 q 7 -13 0 -24 q -7 -12 0 -22" />
      <path d="M 178 148 q 7 -13 0 -24 q -7 -12 0 -22" />
      <path d="M 206 156 q 7 -13 0 -24 q -7 -12 0 -22" />
    </g>
  )
}

/**
 * Bürste und Cremetiegel.
 *
 * Die erste Fassung war ein Rechteck mit siebzehn gleich langen Strichen
 * darunter — ein Kamm. Eine Bürste erkennt man an zwei Dingen: am
 * gerundeten Holzblock, der in der Hand liegt, und daran, dass die Borsten
 * nicht alle gleich lang sind. Die Längen kommen aus einem Sinus und nicht
 * aus Math.random, damit die Zeichnung bei jedem Bild dieselbe ist.
 *
 * Und daneben steht der Tiegel. Der Schritt heißt „Creme, dann Bürste" —
 * dann sollte die Creme auch zu sehen sein.
 */
function Pflegezeug() {
  return (
    <g>
      {/* Der Block: ein Oval, kein Kasten */}
      <Lage d="M 296 100 L 376 100 Q 388 100 388 112 Q 388 124 376 124 L 296 124 Q 284 124 284 112 Q 284 100 296 100 Z" fuellung={0.22} kante={0.5} />
      <g stroke="currentColor" strokeWidth="1.2" opacity="0.42" strokeLinecap="round">
        {Array.from({ length: 27 }, (_, i) => 292 + i * 3.4).map((x, i) => (
          <path key={x} d={`M ${x} 124 L ${x} ${146 + Math.sin(i * 1.7) * 2.4}`} />
        ))}
      </g>

      {/* Der Tiegel: flache Dose mit übergreifendem Deckel */}
      <Lage d="M 404 104 L 448 104 Q 452 104 452 108 L 452 114 L 400 114 L 400 108 Q 400 104 404 104 Z" fuellung={0.28} kante={0.5} />
      <Lage d="M 402 114 L 450 114 L 450 132 Q 450 136 446 136 L 406 136 Q 402 136 402 132 Z" fuellung={0.14} kante={0.45} />
    </g>
  )
}

const AUSSCHNITT = {
  weit: '0 84 540 228',    // mit der Beschriftung am Rand
  eng:  '84 94 378 190',   // nur der Schuh — für schmale Geräte
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
      {/* ── Laufsohle und flacher Absatz ──────────────────────────────
          Ein Loafer trägt keinen hohen Absatz; der Block hinten ist
          niedrig, davor läuft die Sohle als schmaler Streifen aus. */}
      <Lage
        d="M 88 238 L 432 238 Q 440 238 440 243 Q 440 248 432 248 L 188 248 L 188 264 Q 188 268 184 268 L 92 268 Q 88 268 88 264 Z"
        fuellung={0.2} kante={0.5}
      />

      {/* ── Der Spanner, von hinten eingeschoben ──────────────────────
          Zwei Teile und eine Spindel, wie das Stück aus dem Katalog:
          hinten der Block mit dem Haken, vorn das Leistenstück mit der
          Finne und der Kerbe dahinter. Er liegt unter dem Schaft und
          scheint durch ihn hindurch — deshalb dünner Strich. */}
      <Teil da={spanner} aus="hinten">
        <Lage d="M 110 234 C 104 208, 112 182, 130 170 C 141 163, 152 168, 157 180 C 159 190, 151 198, 140 199 C 148 206, 159 210, 171 211 L 178 211 L 178 234 Z" fuellung={0.15} kante={0.34} strich={0.9} />
        <Lage d="M 176 204 L 238 204 L 238 211 L 176 211 Z" fuellung={0.22} kante={0.38} strich={0.9} />
        <Lage d="M 236 234 L 236 196 C 236 186, 246 182, 253 189 C 256 197, 257 204, 261 209 C 267 214, 275 213, 280 207 C 285 201, 292 200, 298 204 C 326 210, 356 216, 382 224 C 396 228, 404 232, 406 234 Z" fuellung={0.15} kante={0.34} strich={0.9} />
        {/* Die Bohrungen im Leistenstück */}
        <g fill="currentColor" fillOpacity="0.3">
          <circle cx="320" cy="220" r="2.4" />
          <circle cx="338" cy="223" r="3.4" />
          <circle cx="356" cy="226" r="2.4" />
        </g>
      </Teil>

      {/* ── Der Schaft: zwei Fassungen, eine blendet in die andere ───── */}
      <g style={{ opacity: straff ? 0 : 1, transition: blende }}>
        <Lage d={SACKT} fuellung={0.08} kante={0.7} strich={1.1} />
        <Lage d={SPALT_SACKT} fuellung={0.22} kante={0.45} strich={0.8} />
        <Lage d={SATTEL_SACKT} fuellung={0.2} kante={0.6} />
        <Falten />
      </g>
      <g style={{ opacity: straff ? 1 : 0, transition: blende }}>
        <Lage d={STRAFF} fuellung={0.08} kante={0.7} strich={1.1} />
        <Lage d={SPALT_STRAFF} fuellung={0.22} kante={0.45} strich={0.8} />
        <Lage d={SATTEL_STRAFF} fuellung={0.2} kante={0.6} />
      </g>

      {/* ── Mokassinnaht und Fersenkappe ──────────────────────────────
          Die Naht ist gestrichelt, weil sie genäht ist; die Fersenkappe
          steht durchgezogen. Ohne beides bliebe der Umriss eine Fläche. */}
      <g stroke="currentColor" strokeWidth="1" fill="none" opacity="0.4" strokeLinecap="round">
        <path
          d={straff
            ? 'M 358 192 C 376 198, 392 204, 406 214 C 418 223, 426 232, 428 238'
            : 'M 358 200 C 376 206, 392 212, 406 220 C 418 227, 426 234, 428 238'}
          strokeDasharray="3 3.5"
          style={{ transition: 'all 620ms cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
        <path d="M 124 151 Q 114 194 118 238" />
      </g>

      {/* ── Der Glanz auf der Kappe, wenn gepflegt ist ───────────────── */}
      <Teil da={ab(4)}>
        <path
          d="M 392 206 C 402 205, 412 210, 418 218"
          stroke="currentColor" strokeOpacity="0.55" strokeWidth="2.6" fill="none" strokeLinecap="round"
        />
      </Teil>

      {/* ── Die Feuchtigkeit ─────────────────────────────────────────── */}
      <Teil da={ab(3)} aus="oben"><Feuchte /></Teil>

      {/* ── Bürste und Creme, nur solange gepflegt wird ──────────────── */}
      <Teil da={schritt === 4} aus="oben"><Pflegezeug /></Teil>

      {/* ── Beschriftung ─────────────────────────────────────────────── */}
      {!eng && (
        <>
          <Teil da={!straff}>
            <Beschriftung x="524" y="286" anker="end">Falte über dem Ballen</Beschriftung>
            <Fuehrung x1={378} y1={282} x2={372} y2={242} />
          </Teil>
          <Teil da={spanner}>
            <Beschriftung x="12" y="300">Zedernholz</Beschriftung>
            <Fuehrung x1={88} y1={296} x2={140} y2={214} />
          </Teil>
          <Teil da={ab(3)}>
            <Beschriftung x="12" y="104">Feuchtigkeit</Beschriftung>
            <Fuehrung x1={86} y1={100} x2={146} y2={112} />
          </Teil>
        </>
      )}
    </Tafel>
  )
}
