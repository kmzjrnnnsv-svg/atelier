/**
 * Zeichentafel — eine Szene aus Einzelteilen, die beim Scrollen entsteht.
 *
 * ── Wofür es dieses Bauteil gibt ──────────────────────────────────────────
 *
 * Zwei Abschnitte der Startseite zeigen dasselbe Verfahren: Teile kommen
 * nacheinander ins Bild, und zu jedem gehört eine Beschriftung mit einem
 * feinen Strich darauf. Wären das zwei Bauteile, liefen sie nach einem
 * halben Jahr verschieden — eine andere Dauer hier, eine andere Kurve dort,
 * und was als ein Heft gedacht war, sähe aus wie zwei Einfälle.
 *
 * Deshalb steht die Bewegung an einer Stelle: eine Dauer, eine Kurve, ein
 * Weg. Was sich je Szene unterscheidet, ist nur die Angabe, WANN ein Teil
 * kommt und WOHER — und die steht bei der Szene, wo sie hingehört.
 *
 * ── Warum die Steuerung CSS erzeugt und nicht Eigenschaften setzt ─────────
 *
 * Die Teile kommen als Zeichenketten aus der Zeichenmappe und werden als
 * Ganzes eingesetzt. Von außen lässt sich einzelnen Gruppen darin nichts
 * anheften — wohl aber über ihre Kennung. Das Blatt Regeln wird erzeugt und
 * nicht abgetippt: Elf Teile mal fünf Schritte wären fünfzig Zeilen, in
 * denen genau ein Fehler steckt, den niemand findet.
 *
 * ── Wo ein Führungsstrich anfängt ────────────────────────────────────────
 *
 * Nicht dort, wo es der Rechnung am leichtesten fällt, sondern an der Kante
 * der Marke, die zum Punkt zeigt. Klingt selbstverständlich und war es
 * nicht: Der Strich begann an der Grundlinie des Namens, und wenn der Punkt
 * unter der Marke lag, lief er quer durch die Zeile darunter. „Bürste und
 * Creme" hatte einen Strich mitten durch „für glatte Leder".
 *
 * Zuerst die Frage, die alles entscheidet: Liegt der Punkt auf der Seite,
 * auf der die Marke NICHT steht? Bei `anker="end"` läuft die Schrift von
 * ihrem x nach links, bei `start` nach rechts. Liegt der Punkt auf der
 * anderen Seite, tritt der Strich seitlich aus — immer, egal wie weit oben
 * oder unten der Punkt liegt.
 *
 * Das ist der Fall, den die erste Fassung übersah, und er ist gemessen und
 * nicht vermutet: „Einstechnaht" steht rechts oben, sein Punkt liegt tief
 * links davon. Der Strich trat deshalb unten aus, lief nach links unten —
 * und mitten durch „Kork", das zwei Zeilen tiefer in derselben Spalte
 * steht.
 *
 * Liegt der Punkt dagegen unter oder über der Marke, tritt der Strich dort
 * aus: unter der zweiten Zeile oder über dem Namen, um ein Drittel der
 * Marke eingerückt.
 *
 * Und der Zeilenabstand: 17 Einheiten waren zu eng. Der Name ist 16 groß
 * und reicht sechs unter seine Grundlinie, die Zusatzzeile 12 und dreizehn
 * darüber — macht neunzehn, und damit lag jede zweite Zeile auf ihrem
 * Namen. Jetzt 22.
 *
 * ── Zur Beschriftung ──────────────────────────────────────────────────────
 *
 * Jede Marke ist ein Name, eine Zeile darunter und ein Strich zu einem Punkt
 * auf dem Teil. Der Strich wird gezeichnet, nicht eingeblendet: Er läuft von
 * der Schrift zum Punkt, so wie eine Hand ihn zöge. Das kostet nichts —
 * `pathLength="1"` macht jeden Strich gleich lang für die Rechnung — und ist
 * der Unterschied zwischen einer Tafel, die erscheint, und einer, die
 * entsteht.
 *
 * Die Marke kommt eine Viertelsekunde nach ihrem Teil. Erst liegt das Stück,
 * dann wird es benannt; umgekehrt liest man einen Namen für etwas, das noch
 * nicht da ist.
 *
 * ── Warum jede Szene ein Kürzel braucht ──────────────────────────────────
 *
 * Beide Szenen stehen auf derselben Seite, und beide haben ein Teil namens
 * `oberschuh`. Ohne Kürzel hießen die Gruppen zweimal `#as-teil-oberschuh`
 * und die Marken zweimal `#as-marke-0` — und weil ein <style> im SVG für das
 * ganze Dokument gilt, schaltete die Regel der einen Szene die Teile der
 * anderen mit. Es kostet eine Stunde, das zu finden: Die Falte im
 * Pflegeabschnitt blieb stehen, obwohl sie zwei Schritte vorher gehen
 * sollte, weil die Laufsohle der Nachbarszene bei derselben Zahl auftaucht.
 *
 * `kennung` ist deshalb keine Bequemlichkeit, sondern Pflicht.
 *
 * ── Warum das Markup eingefroren wird ────────────────────────────────────
 *
 * Das hier ist der Fehler, der die ganze Bewegung stillgelegt hat, und er
 * ist von außen nicht zu sehen: Die Tafel kommt als Zeichenkette herein und
 * wird über `dangerouslySetInnerHTML` gesetzt. Wird sie bei jedem Zeichnen
 * neu zusammengesetzt, ist das Objekt `{ __html: … }` jedes Mal ein anderes,
 * und React schreibt das Innenleben des <svg> neu — auch wenn derselbe Text
 * darin steht.
 *
 * Neu geschrieben heißt: neue Knoten. Ein Knoten, der gerade erst entstanden
 * ist, hat keinen vorherigen Wert, von dem aus er laufen könnte; er steht
 * sofort da, wo er hin soll. Der Spanner fuhr deshalb nicht ein — er war
 * einfach da, und zwar genau in dem Bild, in dem der Schritt wechselte.
 *
 * Die Tafel wird deshalb eingefroren und hängt nur noch an dem, was sie
 * wirklich ausmacht. Was sich je Schritt ändert, ist ein einziges Attribut
 * am <svg>: `data-schritt`. Alles andere macht das Blatt Regeln.
 *
 * ── Auf dem Telefon ──────────────────────────────────────────────────────
 *
 * Dort fällt die Beschriftung weg, und der Ausschnitt rückt an die Zeichnung
 * heran. Das ist keine Sparfassung: Sechzehn Einheiten Schrift sind auf 350
 * Pixeln Breite knapp sieben Pixel hoch, und eine Beschriftung, die man
 * nicht lesen kann, ist ein Muster. Was sie sagt, steht im Text daneben —
 * der ist dort ohnehin unter der Zeichnung und hat Platz.
 *
 * ── Ohne Bewegung ────────────────────────────────────────────────────────
 *
 * `prefers-reduced-motion` schaltet jede Verschiebung ab — dann wird nur
 * überblendet. Und wer die Folge gar nicht sieht (Vorrenderer, keine
 * Bewegung), bekommt `schritt = null` und damit das vollständige Bild mit
 * allen Marken.
 */

/* Die Bewegung, einmal für alle Tafeln dieser Seite. Wer hier etwas ändert,
   ändert beide Abschnitte — und das ist der Sinn.

   Die Kurve ist dieselbe wie beim Schnitt im Handwerkskapitel: schnell los,
   lang aus. Sie ist der Grund, warum sich das dort weich anfühlt, und nicht
   die Dauer.

   Der Weg dagegen MUSS je Szene anders sein, und das ist der Fehler, der
   hier zuerst drinsteckte: 34 Einheiten sind im Schnitt (214 hoch) ein
   Sechstel der Tafel und gut zu sehen — im Stapel (742 hoch) sind sie ein
   Zweiundzwanzigstel, und dann erscheint ein Teil einfach, statt zu kommen.
   Der Weg gehört deshalb zur Szene und wird nach ihrer Höhe bemessen: rund
   ein Achtel, wie im Schnitt. */
const KURVE = 'cubic-bezier(.22,1,.36,1)'
const DAUER = 620
const WEG = 34

const richtungAus = (aus, weg) => ({
  unten:  `translateY(${weg}px)`,
  oben:   `translateY(-${weg}px)`,
  links:  `translateX(-${weg}px)`,
  rechts: `translateX(${weg}px)`,
  still:  'none',
}[aus] || 'none')

/**
 * Die Schritte, in denen ein Eintrag sichtbar ist.
 *
 * Normalfall ist eine Strecke: ab hier, bis dort. `nur` bricht damit und
 * zählt die Schritte einzeln auf — gebraucht für Teile, die zwischendurch
 * weggehen und wiederkommen. Beim Maßnehmen ist das der Fuß: Er steht im
 * ersten Bild auf dem Papier, geht im zweiten weg, damit man die
 * Bleistiftlinie ausmessen kann, und kommt im dritten für das Maßband
 * zurück. Als Strecke ließe sich das nur beschreiben, indem man dasselbe
 * Teil zweimal in die Mappe legt.
 */
const sichtbarIn = (eintrag, schritte) =>
  Array.from({ length: schritte }, (_, i) => i + 1)
    .filter(s => (Array.isArray(eintrag.nur)
      ? eintrag.nur.includes(s)
      : s >= eintrag.ab && s <= (eintrag.bis ?? schritte)))

/**
 * @param {string} kennung Zwei Buchstaben je Szene, damit die erzeugten
 *   Kennungen sich nicht mit denen der Nachbarszene überschneiden.
 * @param {string} viewBox Der Ausschnitt — meist der Szenenausschnitt plus
 *   Rand für die Beschriftung.
 * @param {string} [viewBoxSchmal] Der Ausschnitt ohne diesen Rand, für
 *   schmale Geräte. Fehlt er, gilt `viewBox` überall.
 * @param {boolean} [schmal] Lässt die Beschriftung weg und nimmt den engen
 *   Ausschnitt.
 * @param {string} stil Verlauf und Stilblatt der Szene (aus der Mappe).
 * @param {Object} teile Name → Markup, aus der Mappe.
 * @param {string[]} reihenfolge Stapelreihenfolge, unten zuerst.
 * @param {number} [weg] Wie weit ein Teil reist, in Einheiten der Szene.
 *   Rund ein Achtel ihrer Höhe.
 * @param {number} [dauer] Wie lange es dafür braucht.
 * @param {Object} plan Name → `{ ab, bis?, nur?, aus, verzug?, weg?, dauer?,
 *   zeichnen?, rueckenAb?, ruecken? }`. `ab` ist der erste Schritt
 *   (eins-basiert), in dem das Teil dasteht; `nur` zählt stattdessen
 *   einzelne Schritte auf, für Teile, die zwischendurch weggehen.
 *   `zeichnen` zieht die Linien des Teils nach, statt sie einzublenden —
 *   das Teil braucht dafür `pathLength="1"`. `aus` sagt, woher es kommt.
 *   `verzug` in Millisekunden, für Teile, die zusammen kommen und trotzdem nacheinander
 *   landen sollen. `weg` und `dauer` überschreiben die Werte der Szene — für
 *   das eine Stück, das nicht einblendet, sondern einfährt.
 * @param {Array} marken `{ name, zusatz, ab, bis?, punkt: [x,y], text: [x,y],
 *   anker?, ruecken? }`.
 * @param {string} [extra] Markup, das hinter die Teile kommt (z. B. eine
 *   Trennlinie). Trägt die Klasse `as-extra` und erscheint bei `extraAb`.
 * @param {number} [extraAb]
 * @param {number|null} schritt 0-basiert, wie die Folge zählt. `null` zeigt
 *   alles.
 * @param {number} schritte Anzahl der Schritte.
 */
import { useMemo } from 'react'

/**
 * Baut Tafel und Regelblatt.
 *
 * Steht außerhalb des Bauteils und bekommt alles als Argumente, damit klar
 * ist, woran das Ergebnis hängt — und damit useMemo genau diese Dinge als
 * Abhängigkeiten führen kann. `schritt` gehört ausdrücklich NICHT dazu: Was
 * sich je Schritt ändert, ist das Attribut am <svg>, nicht die Tafel.
 */
function tafelBauen({ kennung, stil, teile, reihenfolge, plan, marken, extra, extraAb, schritte, weg, dauer }) {
  const teilId = n => `as-teil-${kennung}-${n}`
  const markeId = i => `as-marke-${kennung}-${i}`

  const teileMarkup = reihenfolge
    .map(n => `<g class="as-teil" id="${teilId(n)}">${teile[n]}</g>`)
    .join('')

  const markenMarkup = marken.map((m, i) => {
    const [px, py] = m.punkt
    const [tx, ty] = m.text
    // Läuft die Schrift von ihrem x nach rechts?
    const blockRechts = m.anker !== 'end'
    // Liegt der Punkt auf der Seite, auf der die Schrift NICHT steht?
    const abseits = blockRechts ? px < tx : px > tx
    const start = abseits ? [tx + (blockRechts ? -8 : 8), ty + 4]
      : py > ty + 45 ? [tx + (blockRechts ? 34 : -34), ty + 32]
        : py < ty - 45 ? [tx + (blockRechts ? 34 : -34), ty - 22]
          : [tx + (blockRechts ? -8 : 8), ty + 4]
    return `
    <g class="as-marke" id="${markeId(i)}">
      <path class="as-strich" pathLength="1"
            d="M ${start[0]} ${start[1]} L ${px} ${py}"/>
      <circle class="as-punkt" cx="${m.punkt[0]}" cy="${m.punkt[1]}" r="2.6"/>
      <text class="as-marke-name" x="${tx}" y="${ty}" text-anchor="${m.anker || 'start'}">${m.name}</text>
      <text class="as-marke-zusatz" x="${tx}" y="${ty + 22}" text-anchor="${m.anker || 'start'}">${m.zusatz}</text>
    </g>`
  }).join('')

  const regeln = [
    // Grundzustand und gemeinsame Bewegung
    `.as-teil,.as-marke,.as-extra{opacity:0;transition:opacity ${dauer}ms ease,transform ${dauer + 120}ms ${KURVE}}`,
    '.as-strich{fill:none;stroke:var(--as-label,#6d6658);stroke-width:.9;opacity:.5;'
      + `stroke-dasharray:1;stroke-dashoffset:1;transition:stroke-dashoffset ${dauer + 200}ms ${KURVE} 240ms}`,
    '.as-punkt{fill:var(--as-label,#6d6658);opacity:.75}',
    // 16 und nicht 19: Bei 19 ist „Brandsohle" 135 Einheiten breit, und so
    // viel Rand kostet die Zeichnung mehr, als die größere Schrift bringt.
    '.as-marke-name{font-family:Jost,Futura,"Helvetica Neue",Arial,sans-serif;font-size:16px;'
      + 'letter-spacing:2.2px;text-transform:uppercase;fill:var(--as-label,#6d6658)}',
    '.as-marke-zusatz{font-family:Jost,Futura,"Helvetica Neue",Arial,sans-serif;font-size:12px;'
      + 'letter-spacing:.3px;fill:var(--as-label,#6d6658);opacity:.72}',

    // Woher, wie weit, wie lange. Die Reihenfolge der Angaben ist wichtig:
    // Das Kurzschreiben `transition` setzt die Verzögerung auf null zurück,
    // also muss `transition-delay` danach kommen.
    ...reihenfolge.map((n) => {
      const p = plan[n]
      const eigen = p.dauer ?? dauer
      return `#${teilId(n)}{transform:${richtungAus(p.aus, p.weg ?? weg)}`
        + (p.dauer ? `;transition:opacity ${Math.min(eigen, 700)}ms ease,transform ${eigen}ms ${KURVE}` : '')
        + (p.verzug ? `;transition-delay:${p.verzug}ms` : '') + '}'
    }),

    // In welchen Schritten es dasteht
    ...reihenfolge.map((n) => {
      const auf = sichtbarIn(plan[n], schritte)
      if (!auf.length) return ''
      return auf.map(s => `[data-schritt="${s}"] #${teilId(n)}`).join(',')
        + '{opacity:1;transform:none}'
    }).filter(Boolean),

    // Teile, die gezeichnet werden statt aufzublenden.
    //
    // Eine Bleistiftlinie, die erscheint, ist eine Linie; eine, die sich
    // aufbaut, ist jemand, der zeichnet. Möglich wird das durch
    // `pathLength="1"` in der Mappe: Damit ist die Länge jedes Pfades
    // rechnerisch eins, und ein Strichmuster von 1 mit einem Versatz von 1
    // versteckt ihn ganz. Läuft der Versatz auf 0, wächst er von vorn.
    //
    // Die Dauer ist ein Vielfaches der üblichen: Ein Umriss ist lang, und
    // in 620 Millisekunden herumgefahren sieht es aus wie ein Zucken.
    ...reihenfolge.filter(n => plan[n].zeichnen).flatMap((n) => {
      const auf = sichtbarIn(plan[n], schritte)
      const eigen = plan[n].dauer ?? dauer
      return [
        `#${teilId(n)} path{stroke-dasharray:1;stroke-dashoffset:1;`
          + `transition:stroke-dashoffset ${eigen}ms ${KURVE}}`,
        auf.length
          ? auf.map(s => `[data-schritt="${s}"] #${teilId(n)} path`).join(',')
            + '{stroke-dashoffset:0}'
          : '',
      ].filter(Boolean)
    }),

    // Was im letzten Schritt abrückt — nach den Regeln oben, damit es gewinnt
    ...reihenfolge.filter(n => plan[n].rueckenAb).map(n =>
      `[data-schritt="${plan[n].rueckenAb}"] #${teilId(n)}{transform:translateY(${plan[n].ruecken}px)}`),

    // Die Marken, eine Viertelsekunde nach ihrem Teil
    ...marken.map((m, i) => {
      const auf = sichtbarIn(m, schritte)
      if (!auf.length) return ''
      const wahl = auf.map(s => `[data-schritt="${s}"] #${markeId(i)}`)
      return `#${markeId(i)}{transition-delay:${m.verzug ?? 220}ms}`
        + wahl.join(',') + '{opacity:1}'
        + wahl.map(s => `${s} .as-strich`).join(',') + '{stroke-dashoffset:0}'
    }).filter(Boolean),

    // Marken, die mit ihrem Teil abrücken
    ...marken.map((m, i) => m.rueckenAb
      ? `[data-schritt="${m.rueckenAb}"] #${markeId(i)}{transform:translateY(${m.ruecken}px)}`
      : '').filter(Boolean),

    extraAb ? `[data-schritt="${extraAb}"] #as-extra-${kennung}{opacity:1;transform:none}` : '',

    // Wer keine Bewegung will, bekommt nur die Überblendung.
    '@media (prefers-reduced-motion:reduce){.as-teil,.as-marke,.as-extra{transform:none!important}'
      + '.as-strich{transition:none;stroke-dashoffset:0}'
      + '.as-teil path{transition:none!important;stroke-dashoffset:0!important}}',
  ].filter(Boolean).join('')

  return `${stil}${teileMarkup}`
    + (extra ? `<g class="as-extra" id="as-extra-${kennung}">${extra}</g>` : '')
    + `${markenMarkup}<style>${regeln}</style>`
}

export default function Zeichentafel({
  kennung, viewBox, viewBoxSchmal, schmal = false,
  weg = WEG, dauer = DAUER,
  stil, teile, reihenfolge, plan, marken = [],
  extra = '', extraAb = null, schritt = null, schritte, className = '', farben,
}) {
  /* Eingefroren — siehe oben. `schritt` steht mit Absicht nicht in der
     Liste: Änderte sich die Tafel mit ihm, schriebe React das Innenleben
     neu, und die Bewegung fände nicht statt. */
  const innenHtml = useMemo(() => ({
    __html: tafelBauen({
      kennung, stil, teile, reihenfolge, plan,
      marken: schmal ? [] : marken,
      extra, extraAb, schritte, weg, dauer,
    }),
  }), [kennung, stil, teile, reihenfolge, plan, marken, schmal, extra, extraAb, schritte, weg, dauer])

  /* Aus demselben Grund: Ein neues Stilobjekt bei jedem Zeichnen ist für
     React eine Änderung, und die kostet hier zwar keine Knoten, aber Arbeit
     in jedem Bild — und die Schleife läuft sechzig Mal in der Sekunde. */
  const stilObjekt = useMemo(
    () => ({ width: '100%', height: 'auto', ...farben }),
    [farben],
  )

  return (
    <svg
      viewBox={(schmal && viewBoxSchmal) || viewBox}
      className={className}
      role="img"
      aria-hidden="true"
      data-schritt={schritt == null ? schritte : schritt + 1}
      style={stilObjekt}
      dangerouslySetInnerHTML={innenHtml}
    />
  )
}
