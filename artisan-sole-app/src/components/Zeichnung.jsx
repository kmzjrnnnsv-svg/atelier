/**
 * Zeichnung — die gemeinsame Hand aller Schnitte und Skizzen dieser Seite.
 *
 * ── Warum es diese Datei gibt ─────────────────────────────────────────────
 *
 * Der erste Schnitt (RahmenSchnitt) ist der einzige Abschnitt der Startseite,
 * der nicht aus Überschrift, Absatz und Stockfoto besteht, sondern aus einer
 * Zeichnung, die einen Vorgang erklärt — und genau der trägt die Seite. Der
 * Schluss daraus ist nicht „noch ein Schnitt", sondern: Überall dort, wo die
 * Seite etwas behauptet, das man sehen können müsste, gehört eine Zeichnung
 * hin statt eines Fotos, das danebensteht.
 *
 * Damit die drei Zeichnungen wie aus einem Heft wirken und nicht wie drei
 * Einfälle, liegen ihre Bestandteile hier: derselbe Strich, dieselbe
 * Beschriftung, dieselben Deckkraftstufen.
 *
 * ── Die Regeln ────────────────────────────────────────────────────────────
 *
 *   • Alles ist `currentColor` in abgestufter Deckkraft. Eine Zeichnung nimmt
 *     damit die Schriftfarbe ihrer Umgebung an und trägt auf hellem wie auf
 *     dunklem Grund. Eine fest eingetragene Farbe hatte genau den Fehler, den
 *     der erste Schnitt zuerst hatte: schwarz auf schwarzem Grund.
 *   • Die Beschriftung steht außen, mit feinen Strichen an ihre Stelle
 *     geführt. Auf dem Telefon ist eine Zeichnung keine 340 Pixel breit;
 *     Schrift zwischen den Lagen wäre dort unleserlich.
 *   • Für eine Vorleseroutine ist jede Zeichnung Beiwerk (`aria-hidden`). Was
 *     sie zeigt, sagt der Text daneben in Worten — sonst ist die Zeichnung
 *     nicht fertig.
 */

/** Ein Strich von der Beschriftung zu der Stelle, die sie meint. */
export function Fuehrung({ x1, y1, x2, y2 }) {
  return (
    <path
      d={`M ${x1} ${y1} L ${x2} ${y2}`}
      stroke="currentColor" strokeWidth="0.7" opacity="0.28" fill="none"
    />
  )
}

/** Eine Bezeichnung am Rand der Zeichnung. */
export function Beschriftung({ x, y, anker = 'start', stark = false, children }) {
  return (
    <text
      x={x} y={y}
      textAnchor={anker}
      fill="currentColor"
      opacity={stark ? 0.9 : 0.7}
      fontSize="10"
      letterSpacing="1.8"
      style={{ textTransform: 'uppercase', fontWeight: 300 }}
    >
      {children}
    </text>
  )
}

/** Eine Fläche: Füllung in gedämpfter, Kante in klarer Deckkraft. */
export function Lage({ d, fuellung = 0.14, kante = 0.4, strich = 1 }) {
  return (
    <path
      d={d}
      fill="currentColor" fillOpacity={fuellung}
      stroke="currentColor" strokeOpacity={kante} strokeWidth={strich}
      strokeLinejoin="round"
    />
  )
}

/**
 * Eine Maßlinie mit Endstrichen — wie auf einer Werkstattzeichnung.
 *
 * Keine Pfeilspitzen: Die brauchen ein `marker`-Element mit eigener Kennung,
 * und zwei Zeichnungen auf derselben Seite teilen sich dann versehentlich
 * eine. Zwei kurze Querstriche sagen dasselbe und können nicht kollidieren.
 */
export function Massband({ x1, y1, x2, y2, quer = 5 }) {
  // ── Warum hier umgerechnet wird ──────────────────────────────────────
  //
  // Weil es sonst falsch war, und zwar unbemerkt. Geschrieben wird dieses
  // Bauteil als `<Massband x1="196" y1="34" … />` — die Werte kommen also
  // als Zeichenketten herein. In `x2 - x1` macht das nichts, das Minus
  // rechnet von sich aus um. In `x1 + qx` macht es alles kaputt: Aus
  // "390" + (-9) wird die Zeichenkette "390-9", und der Pfad lautet dann
  // `M 399 58 L 390-9 580`. So etwas zeichnet der Browser nicht, er
  // verschluckt es — die Maßlinie stand da, ihre beiden Endstriche nicht.
  //
  // Der Fehler saß von Anfang an drin und hat in jeder Zeichnung dieser
  // Seite die Endstriche gefressen. Deshalb steht die Umrechnung hier und
  // nicht bei den Aufrufern: Ein Baustein, der nur mit Zahlen umgehen
  // kann, aber wie Schriftzeichen geschrieben wird, ist eine Falle, die
  // beim nächsten Mal wieder zuschnappt.
  const ax = Number(x1), ay = Number(y1)
  const bx = Number(x2), by = Number(y2)

  // Der Endstrich steht senkrecht auf der Maßlinie, gleich in welche
  // Richtung sie läuft.
  const dx = bx - ax
  const dy = by - ay
  const laenge = Math.hypot(dx, dy) || 1
  const qx = (-dy / laenge) * quer
  const qy = (dx / laenge) * quer

  return (
    <g stroke="currentColor" strokeOpacity="0.55" strokeWidth="1" fill="none">
      <path d={`M ${ax} ${ay} L ${bx} ${by}`} />
      <path d={`M ${ax - qx} ${ay - qy} L ${ax + qx} ${ay + qy}`} />
      <path d={`M ${bx - qx} ${by - qy} L ${bx + qx} ${by + qy}`} />
    </g>
  )
}

/** Der Rahmen um jede Zeichnung: Seitenverhältnis, Breite, Beiwerk-Status. */
export function Tafel({ viewBox, className = '', children }) {
  return (
    <svg
      viewBox={viewBox}
      className={className}
      role="img"
      aria-hidden="true"
      style={{ width: '100%', height: 'auto' }}
    >
      {children}
    </svg>
  )
}

/**
 * Tafelflaeche — die Fläche, auf der eine Zeichnung liegt.
 *
 * ── Das Problem ───────────────────────────────────────────────────────────
 *
 * Jede dieser Zeichnungen ist 520 Einheiten breit, und ihre Beschriftung ist
 * 10 Einheiten hoch. Auf dem Schreibtisch, wo die Tafel 670 Pixel breit
 * liegt, sind das lesbare 13 Pixel. Auf einem Telefon mit 390 Pixeln sind es
 * sieben — die Beschriftung ist dann da, aber niemand liest sie, und eine
 * Werkstattzeichnung ohne Beschriftung ist ein Muster.
 *
 * Die Schrift größer zu setzen hilft nicht: Sie wächst mit der Tafel, also
 * wäre sie auf dem Schreibtisch zu groß. Es geht nicht um die Schrift, es
 * geht um die Fläche.
 *
 * ── Die Lösung ────────────────────────────────────────────────────────────
 *
 * Auf schmalen Geräten bekommt die Tafel eine Mindestbreite und darf über
 * den Bildschirmrand hinausgehen; man schiebt sie seitwärts, wie ein großes
 * Blatt auf einem kleinen Tisch. Das Schieben bleibt in diesem Kasten — die
 * Seite selbst wandert nicht mit.
 *
 * Ab `lg` fällt beides weg: Dort passt die Tafel, und ein Kasten mit
 * Überlauf, der nie überläuft, ist nur eine Gelegenheit für Fehler.
 *
 * @param {boolean} [randlos=false] Zieht die Fläche auf schmalen Geräten bis
 *   an den Bildschirmrand. Nur für Abschnitte mit `px-5` — anderswo säße die
 *   Tafel sonst neben ihrem Abschnitt.
 */
export function Tafelflaeche({ children, randlos = false, className = '' }) {
  return (
    <div
      className={`overflow-x-auto lg:overflow-visible ${
        randlos ? '-mx-5 px-5 lg:mx-0 lg:px-0' : ''
      } ${className}`}
    >
      <div className="min-w-[540px] lg:min-w-0">{children}</div>
    </div>
  )
}

/**
 * Der Hinweis, dass die Tafel breiter ist als der Bildschirm.
 *
 * Ohne ihn sieht man auf dem Telefon die halbe Zeichnung und hält sie für
 * die ganze. Er steht nur dort, wo geschoben werden muss, und verschwindet,
 * sobald die Tafel passt.
 */
export function Schiebehinweis({ className = '' }) {
  return (
    <p
      className={`lg:hidden text-[10px] uppercase opacity-40 mt-3 ${className}`}
      style={{ letterSpacing: '0.22em' }}
    >
      Seitwärts schieben →
    </p>
  )
}
