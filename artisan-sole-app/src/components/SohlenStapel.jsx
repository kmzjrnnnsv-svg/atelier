/**
 * SohlenStapel — derselbe Schuh, in seine sechs Teile gelegt.
 *
 * ── Woher die Zeichnung kommt ─────────────────────────────────────────────
 *
 * Aus der Zeichenmappe (zeichnungen/aufbauTafel.js). Hier standen vorher von
 * Hand gesetzte Konturen; die gelieferte Tafel zeichnet dieselben sechs
 * Teile sauberer, mit Dicke, Rippe, Körnung und Doppelnaht.
 *
 * Die sechs Gruppen tragen Kennungen — `as-oberschuh-au`, `as-brandsohle-au`,
 * `as-rahmen-au`, `as-kork-au`, `as-laufsohle-au`, `as-absatz-au` —, und
 * genau daran hängt die Folge.
 *
 * ── Warum die Steuerung hier als CSS steht und nicht als Eigenschaften ────
 *
 * Die Tafel kommt als Zeichenkette herein und wird als Ganzes eingesetzt.
 * Von außen lässt sich einzelnen Gruppen darin nichts anheften — wohl aber
 * über ihre Kennung. Deshalb schreibt dieses Bauteil ein Blatt Regeln, das
 * mit der Tafel zusammen eingesetzt wird: `[data-schritt="n"] #teil`.
 *
 * Die Regeln werden erzeugt und nicht abgetippt. Sechs Teile mal sieben
 * Schritte wären achtzig Zeilen, in denen genau ein Fehler steckt, den
 * niemand findet.
 *
 * ── Der siebte Schritt ────────────────────────────────────────────────────
 *
 * Der Grund für die ganze Tafel: Laufsohle und Absatz rücken ab, dazwischen
 * läuft eine Strichlinie, und zwei Klammern sagen, was gemeint ist — oben
 * bleibt, unten wird gewechselt. Diese Teile zeichnet das Bauteil selbst
 * und hängt sie hinten an die Tafel; in der gelieferten Mappe stehen sie
 * nicht, weil sie keine Schuhteile sind, sondern eine Aussage darüber.
 *
 * Die Beschriftung steht senkrecht neben den Klammern. Waagerecht bräuchte
 * „wird gewechselt" hundertfünfunddreißig Einheiten Rand, und die gingen
 * der Zeichnung verloren.
 *
 * ── Eine Falle, die zweimal zuschlägt ─────────────────────────────────────
 *
 * Ein <style> in einem SVG gilt für das ganze Dokument, nicht für sein SVG.
 * Die Pflegetafel bringt eine Regel mit, die den Schaft zurücknimmt, solange
 * ihre Folge läuft — und die griff auch auf den Oberschuh hier, weil er
 * dieselbe Klasse trägt. In zeichnungen/pflegeTafel.js steht deshalb
 * `svg[data-step]:not(…)` statt `svg:not(…)`: Eine Tafel ohne `data-step`
 * ist dann nicht gemeint.
 *
 * Wer eine weitere Tafel dazunimmt, prüfe dasselbe. Die Klassen tragen alle
 * `as-`, aber innerhalb dieses Präfixes teilen sie sich einen Namensraum.
 */
import { MARKUP } from '../zeichnungen/aufbauTafel'
import { TAFELFARBEN } from '../zeichnungen/farben'

/* Ab welchem Schritt (eins-basiert) jedes Teil dasteht. Laufsohle und
   Absatz kommen zusammen — sie sind ein Schritt, weil sie zusammen
   gewechselt werden. */
const AB = {
  'as-oberschuh-au': 1,
  'as-brandsohle-au': 2,
  'as-rahmen-au': 3,
  'as-kork-au': 4,
  'as-laufsohle-au': 5,
  'as-absatz-au': 5,
}

/* Die Höhen aus der Tafel, gemessen: Unterkante Kork 473, Oberkante
   Laufsohle 488, Unterkante Absatz 662. Wer die Tafel austauscht, muss hier
   nachmessen — deshalb stehen die Zahlen an einer Stelle und nicht verteilt. */
const KORK_UNTEN = 473
const SOHLE_OBEN = 488
const ABSATZ_UNTEN = 662
const OBERSCHUH_OBEN = 36

/** Um wie viel die Sohle im letzten Schritt abrückt. */
const ABRUECKEN = 40

/* Der Oberschuh trägt in der Tafel schon ein eigenes `transform`. Eine
   CSS-Regel würde es überschreiben und ihn verschieben — er bekommt
   deshalb nie eine, und er braucht auch keine: Er ist ab Schritt eins da. */
const REGELN = [
  Object.keys(AB).map(id => `#${id}{transition:opacity .62s ease,transform .78s cubic-bezier(.22,1,.36,1)}`).join(''),
  Object.entries(AB).flatMap(([id, ab]) =>
    Array.from({ length: ab - 1 }, (_, i) =>
      `[data-schritt="${i + 1}"] #${id}{opacity:0${id === 'as-oberschuh-au' ? '' : ';transform:translateY(34px)'}}`),
  ).join(''),
  `[data-schritt="7"] #as-laufsohle-au,[data-schritt="7"] #as-absatz-au{transform:translateY(${ABRUECKEN}px)}`,
  '.as-trennung{opacity:0;transition:opacity .62s ease}',
  '[data-schritt="7"] .as-trennung{opacity:1}',
  '@media (prefers-reduced-motion:reduce){[id^="as-"],.as-trennung{transition:none}}',
].join('')

const MITTE_BLEIBT = (OBERSCHUH_OBEN + KORK_UNTEN) / 2
const MITTE_WEG = (SOHLE_OBEN + ABRUECKEN + ABSATZ_UNTEN + ABRUECKEN) / 2

const TRENNUNG = `
<g class="as-trennung">
  <path class="as-leader" d="M 205 ${(KORK_UNTEN + SOHLE_OBEN + ABRUECKEN) / 2} L 780 ${(KORK_UNTEN + SOHLE_OBEN + ABRUECKEN) / 2}"
        stroke-dasharray="7 6"/>
  <path class="as-leader" d="M 770 ${OBERSCHUH_OBEN} L 780 ${OBERSCHUH_OBEN} L 780 ${KORK_UNTEN} L 770 ${KORK_UNTEN}"/>
  <path class="as-leader" d="M 770 ${SOHLE_OBEN + ABRUECKEN} L 780 ${SOHLE_OBEN + ABRUECKEN} L 780 ${ABSATZ_UNTEN + ABRUECKEN} L 770 ${ABSATZ_UNTEN + ABRUECKEN}"/>
  <text class="as-label" text-anchor="middle" transform="translate(802 ${MITTE_BLEIBT}) rotate(90)">bleibt</text>
  <text class="as-label" text-anchor="middle" transform="translate(802 ${MITTE_WEG}) rotate(90)">wird gewechselt</text>
</g>`

/* Der Ausschnitt der Tafel ist 198 22 586 660. Rechts kommen die Klammern
   dazu, unten die vierzig Einheiten, um die die Sohle abrückt.

   Die Ränder sind mit Absicht fast gleich breit — links 29 Einheiten,
   rechts 51. Ein Blatt, das in sechs von sieben Schritten rechts einen
   handbreiten leeren Streifen hat, sieht aus, als wäre es verrutscht. */
const AUSSCHNITT = '190 14 626 710'

/**
 * @param {number|null} [schritt] 0 … 6. `null` zeigt den fertigen Stapel
 *   ohne Trennung — der Fall des Vorrenderers und der Fall „keine Bewegung".
 */
export default function SohlenStapel({ className = '', schritt = null }) {
  return (
    <svg
      viewBox={AUSSCHNITT}
      className={className}
      role="img"
      aria-hidden="true"
      data-schritt={schritt == null ? 6 : schritt + 1}
      style={{ width: '100%', height: 'auto', ...TAFELFARBEN }}
      dangerouslySetInnerHTML={{ __html: `${MARKUP}${TRENNUNG}<style>${REGELN}</style>` }}
    />
  )
}
