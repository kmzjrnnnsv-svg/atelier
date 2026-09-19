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

export default function RahmenSchnitt({ className = '' }) {
  return (
    <Tafel viewBox="0 62 520 214" className={className}>
      {/* ── Laufsohle ───────────────────────────────────────────────── */}
      <Lage d="M 118 232 L 402 232 L 402 252 Q 402 258 396 258 L 124 258 Q 118 258 118 252 Z" fuellung={0.22} kante={0.5} />

      {/* ── Rahmen: der Lederstreifen, der seitlich heraussteht ─────── */}
      <Lage d="M 118 214 L 176 214 L 176 232 L 118 232 Z" fuellung={0.34} kante={0.55} />
      <Lage d="M 344 214 L 402 214 L 402 232 L 344 232 Z" fuellung={0.34} kante={0.55} />

      {/* ── Korkbettung ─────────────────────────────────────────────── */}
      <Lage d="M 176 214 L 344 214 L 344 232 L 176 232 Z" fuellung={0.07} kante={0.28} />

      {/* ── Brandsohle mit aufgestellter Rippe ──────────────────────── */}
      <Lage d="M 150 200 L 370 200 L 370 214 L 150 214 Z" fuellung={0.16} kante={0.42} />
      <Lage d="M 172 178 L 180 178 L 180 200 L 172 200 Z" fuellung={0.26} kante={0.5} />
      <Lage d="M 340 178 L 348 178 L 348 200 L 340 200 Z" fuellung={0.26} kante={0.5} />

      {/* ── Schaft, über den Leisten gezogen und nach innen gezwickt ── */}
      <Lage d="M 152 78 Q 152 178 160 196 L 176 196 Q 170 176 170 78 Z" fuellung={0.30} kante={0.55} />
      <Lage d="M 368 78 Q 368 178 360 196 L 344 196 Q 350 176 350 78 Z" fuellung={0.30} kante={0.55} />

      {/* ── Futter, innen daneben ───────────────────────────────────── */}
      <Lage d="M 170 78 L 180 78 Q 180 172 186 192 L 176 196 Q 170 176 170 78 Z" fuellung={0.13} kante={0.32} />
      <Lage d="M 350 78 L 340 78 Q 340 172 334 192 L 344 196 Q 350 176 350 78 Z" fuellung={0.13} kante={0.32} />

      {/* ── Die beiden Nähte ────────────────────────────────────────────
          Gestrichelt und in voller Deckkraft: Sie sind der Punkt der
          ganzen Zeichnung und müssen sich von jeder Fläche abheben. */}
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="2.5 4.5" opacity="0.95">
        {/* Einstechnaht: Schaft, Futter und Rahmen an der Rippe */}
        <path d="M 158 190 L 184 190" />
        <path d="M 336 190 L 362 190" />
        {/* Doppelnaht: Rahmen an Laufsohle */}
        <path d="M 126 243 L 170 243" />
        <path d="M 350 243 L 394 243" />
      </g>

      {/* ── Beschriftung, links ─────────────────────────────────────── */}
      <Beschriftung x="12" y="96">Schaft</Beschriftung>
      <Fuehrung x1="66" y1="92" x2="155" y2="115" />

      <Beschriftung x="12" y="148">Futter</Beschriftung>
      <Fuehrung x1="60" y1="144" x2="174" y2="148" />

      <Beschriftung x="12" y="198">Brandsohle</Beschriftung>
      <Fuehrung x1="92" y1="194" x2="152" y2="206" />

      <Beschriftung x="12" y="249">Doppelnaht</Beschriftung>
      <Fuehrung x1="94" y1="245" x2="126" y2="243" />

      {/* ── Beschriftung, rechts ────────────────────────────────────── */}
      <Beschriftung x="508" y="96" anker="end">Einstechnaht</Beschriftung>
      <Fuehrung x1="434" y1="92" x2="358" y2="186" />

      <Beschriftung x="508" y="148" anker="end">Kork</Beschriftung>
      <Fuehrung x1="484" y1="144" x2="300" y2="220" />

      <Beschriftung x="508" y="198" anker="end">Rahmen</Beschriftung>
      <Fuehrung x1="466" y1="194" x2="378" y2="220" />

      <Beschriftung x="508" y="249" anker="end">Laufsohle</Beschriftung>
      <Fuehrung x1="456" y1="245" x2="398" y2="247" />
    </Tafel>
  )
}
