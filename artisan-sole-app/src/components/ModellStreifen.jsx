/**
 * ModellStreifen — vier Paare als schmales Band zwischen zwei Kapiteln.
 *
 * ── Warum es ihn gibt ─────────────────────────────────────────────────────
 *
 * Zwischen dem Stapel und dem Schnitt lagen zwei Bildschirme Weiß. Auf einer
 * Seite, die erklärt, ist das richtig — eine Pause nach einem langen Gedanken
 * gehört dazu. Auf einer Seite, die verkauft, ist es die Stelle, an der
 * jemand überzeugt ist und nichts findet, wohin er gehen kann.
 *
 * Der Streifen füllt sie mit dem Einzigen, was an dieser Stelle etwas zu
 * suchen hat: vier echten Paaren, klein gesetzt, mit Namen und Preis.
 *
 * ── Warum er kein zweites Auswahlfeld ist ─────────────────────────────────
 *
 * Am Ende des Kollektionskapitels steht die Modellwahl mit allen
 * achtundvierzig, nach Macharten geordnet und zum Durchklicken. Dieselbe
 * Geste hier noch einmal wäre ein Katalog an zwei Stellen. Deshalb hat
 * dieser Streifen keine Überschrift, keine Reiter und keine Auswahl: eine
 * Zeile, vier Bilder, eine Tür. Wer scrollt, scrollt vorbei; wer eben etwas
 * verstanden hat, greift zu.
 *
 * Auch deshalb vier und nicht acht. Ein Band ist eine Nebenbemerkung; sobald
 * es eine zweite Reihe bekommt, ist es ein Regal und hält die Seite an.
 *
 * ── Warum je ein Paar je Machart ──────────────────────────────────────────
 *
 * Die Auswahl trifft die Seite (siehe streifenModelle in TestHomepage), und
 * zwar quer durch die Macharten: ein Schnürschuh, ein Loafer, ein Stiefel,
 * ein Sneaker. Vier Oxfords nebeneinander sähen aus, als gäbe es hier nur
 * Oxfords — vier verschiedene Formen sagen in einem Blick, wie weit das
 * Feld ist, ohne dass ein Wort darüber fällt.
 */
import { ArrowRight } from 'lucide-react'
import Enthuellen from './Enthuellen'
import { resolveMediaUrl } from '../lib/mediaUrl'

/**
 * @param {Array} schuhe Die Paare, die im Band stehen. Ist es leer — der
 *   Katalog lädt noch oder hat keine Bilder —, rendert der Streifen nichts.
 *   Ein Band mit einer Lücke ist schlechter als kein Band.
 * @param {string} satz Die Zeile links, in der Sprache des Kapitels darüber.
 * @param {(schuh: Object) => void} oeffnen
 * @param {() => void} zumKatalog
 * @param {number} [gesamt] Die echte Zahl für die Tür rechts.
 * @param {boolean} [randOben=true] Die Haarlinie über dem Band. Sie trennt
 *   es vom Kapitel darüber. Direkt unter dem dunklen Aufmacher wäre sie
 *   falsch: Dort trennt schon die Farbkante, und eine Linie zwei Millimeter
 *   darunter sieht aus wie ein Versehen.
 */
export default function ModellStreifen({ schuhe, satz, oeffnen, zumKatalog, gesamt, randOben = true }) {
  if (!schuhe?.length) return null

  return (
    <Enthuellen richtung="ruhig">
      <div className={`px-5 lg:px-16 ${randOben ? 'pb-16 lg:pb-24' : 'pt-12 lg:pt-16 pb-14 lg:pb-20'}`}>
        <div className={`max-w-6xl mx-auto ${randOben ? 'border-t border-black/[0.10] pt-10 lg:pt-14' : ''}`}>
          {/* Zeile und Tür in einer Zeile, auf dem Telefon untereinander.
              `items-baseline`, damit der kleine Knopf auf der Schriftlinie
              des Satzes sitzt und nicht auf halber Höhe schwebt. */}
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4">
            <p className="text-[13px] lg:text-[15px] text-black/45 font-light leading-[1.8] max-w-md">
              {satz}
            </p>
            <button
              type="button"
              onClick={zumKatalog}
              className="group shrink-0 bg-transparent border-0 p-0 inline-flex items-center gap-3 text-[11px] uppercase text-black/60 hover:text-black transition-colors"
              style={{ letterSpacing: '0.22em' }}
            >
              <span className="relative pb-1">
                {gesamt ? `Alle ${gesamt} Modelle` : 'Alle Modelle'}
                <span className="absolute left-0 bottom-0 h-px w-full bg-black/20 group-hover:bg-black/45 transition-colors" />
              </span>
              <ArrowRight size={14} strokeWidth={1.5} className="transition-transform duration-500 group-hover:translate-x-1.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-10 mt-10 lg:mt-12">
            {schuhe.map((schuh, i) => (
              <Enthuellen key={schuh.id} verzoegerung={Math.min(i, 3) * 80}>
                <button
                  type="button"
                  onClick={() => oeffnen(schuh)}
                  className="group block w-full bg-transparent border-0 p-0 text-left"
                >
                  <div className="aspect-square overflow-hidden">
                    <img
                      src={resolveMediaUrl(schuh.image)}
                      alt={`${schuh.name}, nach Maß gefertigt`}
                      loading="lazy"
                      className="w-full h-full object-contain transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
                    />
                  </div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-black/60 mt-3 line-clamp-2 min-h-[2.4em]">
                    {schuh.name}
                  </p>
                  <p className="text-[12px] text-black/40 font-light mt-0.5">
                    {schuh.price ? `ab ${schuh.price}` : 'auf Anfrage'}
                  </p>
                </button>
              </Enthuellen>
            ))}
          </div>
        </div>
      </div>
    </Enthuellen>
  )
}
