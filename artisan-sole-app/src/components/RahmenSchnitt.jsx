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
 * Der Aufbau, nicht die Form. Schaft und Futter laufen über den Leisten und
 * werden nach innen gezwickt; die Brandsohle trägt eine aufgestellte Rippe,
 * durch die die Einstechnaht läuft und Schaft, Futter und Rahmen fasst. Der
 * Rahmen steht seitlich heraus, durch ihn geht die Doppelnaht in die
 * Laufsohle. Dazwischen liegt die Korkbettung.
 *
 * Daran hängt das Versprechen: Die Laufsohle hängt an der Doppelnaht, nicht
 * am Schaft. Wer sie auftrennt, lässt den Schuh unversehrt — deshalb lässt
 * sich ein rahmengenähter Schuh neu besohlen und ein geklebter nicht.
 *
 * ── Warum er sich zusammensetzen kann ─────────────────────────────────────
 *
 * Die Zeichnung zeigte den fertigen Aufbau auf einmal. Das ist richtig für
 * ein Nachschlagewerk und verschenkt, was ein Schnitt eigentlich kann: Er
 * besteht aus Lagen, und diese Lagen entstehen in einer Reihenfolge — genau
 * in der, in der ein Schuhmacher sie anlegt. Wer die Reihenfolge sieht,
 * versteht in zwanzig Sekunden, wofür sonst zwei Absätze nötig sind.
 *
 * Deshalb kennt jede Lage den Schritt, in dem sie dazukommt. `schritt` sagt,
 * wie weit der Aufbau ist; ohne diese Angabe (der Normalfall, und der Fall
 * des Vorrenderers) steht alles da wie vorher. Eine Zeichnung, die ohne
 * JavaScript leer wäre, wäre keine.
 *
 * ── Warum alles in einer Farbe ────────────────────────────────────────────
 *
 * Jede Fläche ist `currentColor` in einer eigenen Deckkraft. Die Zeichnung
 * nimmt damit die Schriftfarbe ihrer Umgebung an und trägt auf hellem wie
 * auf dunklem Grund. Eine fest eingetragene Farbe hätte genau den Fehler,
 * den diese Fassung zuerst hatte: Auf dem dunklen Abschnitt stand ein
 * schwarzer Schnitt auf schwarzem Grund.
 *
 * ── Warum die Beschriftung außen steht ────────────────────────────────────
 *
 * Auf dem Telefon ist der Schnitt keine 340 Pixel breit; Schrift zwischen
 * den Lagen wäre dort unleserlich. Die Bezeichnungen stehen außen, mit
 * feinen Strichen an ihre Stelle geführt — wie in einem Werkstattbuch.
 *
 * Für eine Vorleseroutine ist die Zeichnung Beiwerk (`aria-hidden`); der
 * Text daneben sagt dasselbe in Worten.
 */
import { Fuehrung, Beschriftung, Lage, Tafel } from './Zeichnung'

/* Die Schritte, auf die sich die `ab`-Angaben unten beziehen, stehen in
   lib/aufbauSchritte.js — zusammen mit den Sätzen, die im Aufbau daneben
   erscheinen. Wer hier eine Lage verschiebt, muss dort nachsehen. */

/**
 * Eine Lage, die eintritt.
 *
 * `ab` ist der Schritt, ab dem sie dasteht. Davor ist sie durchsichtig und um
 * ein Stück verschoben — aus der Richtung, aus der sie in Wirklichkeit kommt:
 * die Laufsohle von unten, der Schaft von oben, der Rahmen von der Seite.
 *
 * Ohne `schritt` (null) ist alles sofort da. Das ist der Normalfall.
 */
function Teil({ schritt, ab, aus = 'unten', children }) {
  const da = schritt == null || schritt >= ab
  const versatz = {
    unten:  'translateY(26px)',
    oben:   'translateY(-26px)',
    links:  'translateX(-30px)',
    rechts: 'translateX(30px)',
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

/** Eine Bezeichnung samt Führungsstrich, die mit ihrer Lage erscheint. */
function Marke({ schritt, ab, x, y, anker, fuehrung, children }) {
  return (
    <Teil schritt={schritt} ab={ab} aus="still">
      <Beschriftung x={x} y={y} anker={anker}>{children}</Beschriftung>
      <Fuehrung {...fuehrung} />
    </Teil>
  )
}

const AUSSCHNITT = {
  weit: '0 62 520 214',   // mit der Beschriftung am Rand
  eng:  '104 62 312 214', // nur der Schnitt — für schmale Geräte
}

/**
 * @param {number|null} [schritt] Wie weit der Aufbau ist (0 … AUFBAU.length-1).
 *   `null` zeigt alles.
 * @param {'weit'|'eng'} [ausschnitt] `eng` lässt die Beschriftung weg und
 *   rückt an den Schnitt heran.
 */
export default function RahmenSchnitt({ className = '', schritt = null, ausschnitt = 'weit' }) {
  const eng = ausschnitt === 'eng'

  return (
    <Tafel viewBox={AUSSCHNITT[eng ? 'eng' : 'weit']} className={className}>
      {/* ── 4 · Laufsohle ───────────────────────────────────────────── */}
      <Teil schritt={schritt} ab={4} aus="unten">
        <Lage d="M 118 232 L 402 232 L 402 252 Q 402 258 396 258 L 124 258 Q 118 258 118 252 Z" fuellung={0.22} kante={0.5} />
      </Teil>

      {/* ── 2 · Rahmen: der Lederstreifen, der seitlich heraussteht ─── */}
      <Teil schritt={schritt} ab={2} aus="links">
        <Lage d="M 118 214 L 176 214 L 176 232 L 118 232 Z" fuellung={0.34} kante={0.55} />
      </Teil>
      <Teil schritt={schritt} ab={2} aus="rechts">
        <Lage d="M 344 214 L 402 214 L 402 232 L 344 232 Z" fuellung={0.34} kante={0.55} />
      </Teil>

      {/* ── 3 · Korkbettung ─────────────────────────────────────────── */}
      <Teil schritt={schritt} ab={3} aus="oben">
        <Lage d="M 176 214 L 344 214 L 344 232 L 176 232 Z" fuellung={0.07} kante={0.28} />
      </Teil>

      {/* ── 0 · Brandsohle mit aufgestellter Rippe ──────────────────── */}
      <Teil schritt={schritt} ab={0} aus="unten">
        <Lage d="M 150 200 L 370 200 L 370 214 L 150 214 Z" fuellung={0.16} kante={0.42} />
        <Lage d="M 172 178 L 180 178 L 180 200 L 172 200 Z" fuellung={0.26} kante={0.5} />
        <Lage d="M 340 178 L 348 178 L 348 200 L 340 200 Z" fuellung={0.26} kante={0.5} />
      </Teil>

      {/* ── 1 · Schaft, über den Leisten gezogen und gezwickt ────────── */}
      <Teil schritt={schritt} ab={1} aus="oben">
        <Lage d="M 152 78 Q 152 178 160 196 L 176 196 Q 170 176 170 78 Z" fuellung={0.30} kante={0.55} />
        <Lage d="M 368 78 Q 368 178 360 196 L 344 196 Q 350 176 350 78 Z" fuellung={0.30} kante={0.55} />
        {/* Futter, innen daneben */}
        <Lage d="M 170 78 L 180 78 Q 180 172 186 192 L 176 196 Q 170 176 170 78 Z" fuellung={0.13} kante={0.32} />
        <Lage d="M 350 78 L 340 78 Q 340 172 334 192 L 344 196 Q 350 176 350 78 Z" fuellung={0.13} kante={0.32} />
      </Teil>

      {/* ── Die beiden Nähte ────────────────────────────────────────────
          Gestrichelt und in voller Deckkraft: Sie sind der Punkt der
          ganzen Zeichnung und müssen sich von jeder Fläche abheben. */}
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="2.5 4.5" opacity="0.95">
        {/* 2 · Einstechnaht: Schaft, Futter und Rahmen an der Rippe */}
        <Teil schritt={schritt} ab={2} aus="still">
          <path d="M 158 190 L 184 190" />
          <path d="M 336 190 L 362 190" />
        </Teil>
        {/* 5 · Doppelnaht: Rahmen an Laufsohle */}
        <Teil schritt={schritt} ab={5} aus="still">
          <path d="M 126 243 L 170 243" />
          <path d="M 350 243 L 394 243" />
        </Teil>
      </g>

      {/* ── Beschriftung ────────────────────────────────────────────────
          Jede Bezeichnung kommt mit ihrer Lage. Im engen Ausschnitt fällt
          sie weg: Dort sagt die Bildunterschrift, was gerade dazukommt. */}
      {!eng && (
        <>
          <Marke schritt={schritt} ab={1} x="12" y="96" fuehrung={{ x1: 66, y1: 92, x2: 155, y2: 115 }}>Schaft</Marke>
          <Marke schritt={schritt} ab={1} x="12" y="148" fuehrung={{ x1: 60, y1: 144, x2: 174, y2: 148 }}>Futter</Marke>
          <Marke schritt={schritt} ab={0} x="12" y="198" fuehrung={{ x1: 92, y1: 194, x2: 152, y2: 206 }}>Brandsohle</Marke>
          <Marke schritt={schritt} ab={5} x="12" y="249" fuehrung={{ x1: 94, y1: 245, x2: 126, y2: 243 }}>Doppelnaht</Marke>

          <Marke schritt={schritt} ab={2} x="508" y="96" anker="end" fuehrung={{ x1: 434, y1: 92, x2: 358, y2: 186 }}>Einstechnaht</Marke>
          <Marke schritt={schritt} ab={3} x="508" y="148" anker="end" fuehrung={{ x1: 484, y1: 144, x2: 300, y2: 220 }}>Kork</Marke>
          <Marke schritt={schritt} ab={2} x="508" y="198" anker="end" fuehrung={{ x1: 466, y1: 194, x2: 378, y2: 220 }}>Rahmen</Marke>
          <Marke schritt={schritt} ab={4} x="508" y="249" anker="end" fuehrung={{ x1: 456, y1: 245, x2: 398, y2: 247 }}>Laufsohle</Marke>
        </>
      )}
    </Tafel>
  )
}
