/**
 * Strichpfeil — der Pfeil an den Türen dieser Seite.
 *
 * ── Warum nicht der aus dem Symbolsatz ────────────────────────────────────
 *
 * An jeder Tür stand ein `ArrowRight` aus lucide: 14 Pixel, Strichstärke
 * 1,5, runde Enden. Das ist ein guter Pfeil und der falsche für dieses Haus.
 * Diese Seite besteht aus Haarlinien — die Unterstreichung unter jedem Wort,
 * die Trennlinien zwischen den Kapiteln, die Konturen der Zeichnungen. Alle
 * sind einen Pixel stark und laufen spitz aus. Der Pfeil daneben war
 * anderthalb Pixel stark und rund, und damit sah er aus wie aus einem
 * anderen Programm hineinkopiert — dieselbe Diagnose wie bei den
 * Stockfotos und den Strichsymbolen über den drei Zahlen.
 *
 * Er besteht deshalb aus zwei Teilen in derselben Stärke wie alles andere:
 * einem Haarstrich und einer Spitze aus zwei Rändern, um 45 Grad gedreht.
 * Beides nimmt `currentColor`, läuft also auf hellem wie auf dunklem Grund
 * mit der Schriftfarbe mit.
 *
 * ── Warum er wächst und nicht rutscht ─────────────────────────────────────
 *
 * Der alte Pfeil schob sich beim Überfahren sechs Pixel nach rechts. Das
 * ist die übliche Geste und sie sagt „gleich geht es los". Ein Strich, der
 * länger wird, sagt dasselbe, ohne dass sich etwas vom Wort entfernt — und
 * er tut, was die Unterstreichung darunter auch tut. Zwei Bewegungen,
 * dieselbe Sprache.
 *
 * Die Bedingung dafür steht am Knopf: Er braucht `group`, sonst wächst
 * nichts. Ohne die Klasse steht der Pfeil still, und das ist kein Fehler,
 * nur weniger.
 */
export default function Strichpfeil({ className = '' }) {
  return (
    <span className={`inline-flex items-center shrink-0 ${className}`} aria-hidden="true">
      <span className="block h-px w-4 bg-current transition-[width] duration-500 ease-out group-hover:w-7" />
      <span className="block w-[5px] h-[5px] -ml-[4px] border-t border-r border-current rotate-45" />
    </span>
  )
}
