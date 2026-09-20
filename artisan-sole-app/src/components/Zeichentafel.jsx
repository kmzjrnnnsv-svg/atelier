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

/** Die Schritte, in denen ein Eintrag sichtbar ist. */
const sichtbarIn = (eintrag, schritte) =>
  Array.from({ length: schritte }, (_, i) => i + 1)
    .filter(s => s >= eintrag.ab && s <= (eintrag.bis ?? schritte))

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
 * @param {Object} plan Name → `{ ab, bis?, aus, verzug?, weg?, dauer?,
 *   rueckenAb?, ruecken? }`. `ab` ist der erste Schritt (eins-basiert), in
 *   dem das Teil dasteht. `aus` sagt, woher es kommt. `verzug` in
 *   Millisekunden, für Teile, die zusammen kommen und trotzdem nacheinander
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
export default function Zeichentafel({
  kennung, viewBox, viewBoxSchmal, schmal = false,
  weg = WEG, dauer = DAUER,
  stil, teile, reihenfolge, plan, marken: markenRoh = [],
  extra = '', extraAb = null, schritt = null, schritte, className = '', farben,
}) {
  const marken = schmal ? [] : markenRoh
  const jetzt = schritt == null ? schritte : schritt + 1
  const teilId = n => `as-teil-${kennung}-${n}`
  const markeId = i => `as-marke-${kennung}-${i}`

  const teileMarkup = reihenfolge
    .map(n => `<g class="as-teil" id="${teilId(n)}">${teile[n]}</g>`)
    .join('')

  const markenMarkup = marken.map((m, i) => `
    <g class="as-marke" id="${markeId(i)}">
      <path class="as-strich" pathLength="1"
            d="M ${m.text[0] + (m.anker === 'end' ? -6 : 6)} ${m.text[1] - 4} L ${m.punkt[0]} ${m.punkt[1]}"/>
      <circle class="as-punkt" cx="${m.punkt[0]}" cy="${m.punkt[1]}" r="2.6"/>
      <text class="as-marke-name" x="${m.text[0]}" y="${m.text[1]}" text-anchor="${m.anker || 'start'}">${m.name}</text>
      <text class="as-marke-zusatz" x="${m.text[0]}" y="${m.text[1] + 17}" text-anchor="${m.anker || 'start'}">${m.zusatz}</text>
    </g>`).join('')

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

    // Woher jedes Teil kommt, und wie lange es sich Zeit lässt
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
      + '.as-strich{transition:none;stroke-dashoffset:0}}',
  ].filter(Boolean).join('')

  return (
    <svg
      viewBox={(schmal && viewBoxSchmal) || viewBox}
      className={className}
      role="img"
      aria-hidden="true"
      data-schritt={jetzt}
      style={{ width: '100%', height: 'auto', ...farben }}
      dangerouslySetInnerHTML={{
        __html: `${stil}${teileMarkup}`
          + (extra ? `<g class="as-extra" id="as-extra-${kennung}">${extra}</g>` : '')
          + `${markenMarkup}<style>${regeln}</style>`,
      }}
    />
  )
}
