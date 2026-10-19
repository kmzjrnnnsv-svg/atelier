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
import Enthuellen from './Enthuellen'
import Strichpfeil from './Strichpfeil'
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
 * @param {number} [gehoben=0] Welches Paar groß steht. Direkt unter dem
 *   Aufmacher nicht das erste: Das steht dort schon groß im Bild.
 */
export default function ModellStreifen({ schuhe, satz, oeffnen, zumKatalog, gesamt, randOben = true, gehoben = 0 }) {
  if (!schuhe?.length) return null
  const oben = Math.min(gehoben, schuhe.length - 1)

  return (
    <Enthuellen richtung="ruhig">
      <div className={`px-5 lg:px-16 ${randOben ? 'pb-16 lg:pb-24' : 'pt-12 lg:pt-16 pb-14 lg:pb-20'}`}>
        <div className={`max-w-6xl mx-auto ${randOben ? ' pt-10 lg:pt-14' : ''}`}>
          {/* Zeile und Tür in einer Zeile, auf dem Telefon untereinander.
              `items-baseline`, damit der kleine Knopf auf der Schriftlinie
              des Satzes sitzt und nicht auf halber Höhe schwebt. */}
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4">
            <p className="t-text c-tinte max-w-md">
              {satz}
            </p>
            <button
              type="button"
              onClick={zumKatalog}
              className="t-klein group shrink-0 bg-transparent border-0 p-0 inline-flex items-center gap-3 c-tinte hover:text-black transition-colors"
            >
              <span className="underline underline-offset-[6px] decoration-1">
                {gesamt ? `Alle ${gesamt} Modelle` : 'Alle Modelle'}
              </span>
              <Strichpfeil />
            </button>
          </div>

          {/* Eine Bildreihe, kein Kachelraster: Ein Paar steht groß, die
              anderen drei laufen kleiner daneben und sitzen mit ihm auf
              derselben Unterkante, wie Schuhe auf einem Regalbrett. Vier
              gleich große Felder sagen „Auswahl"; eines, das größer ist,
              sagt „dieses hier zuerst" und gibt dem Auge einen Anfang.

              Am Schreibtisch über die Spaltenbreiten (das gehobene Paar
              bekommt 1,8 Anteile), auf dem Telefon steht es allein über
              einer Dreierreihe. */}
          <div
            className="grid grid-cols-3 gap-x-4 gap-y-8 lg:gap-x-10 items-end mt-10 lg:mt-12 lg:[grid-template-columns:var(--spalten)]"
            style={{ '--spalten': schuhe.map((_, i) => (i === oben ? '1.8fr' : '1fr')).join(' ') }}
          >
            {schuhe.map((schuh, i) => {
              const gross = i === oben
              return (
                <div
                  key={schuh.id}
                  className={gross ? 'col-span-3 lg:col-span-1 order-first lg:order-none' : ''}
                >
                  <Enthuellen verzoegerung={Math.min(i, 3) * 80}>
                    <button
                      type="button"
                      onClick={() => oeffnen(schuh)}
                      className="group block w-full bg-transparent border-0 p-0 text-left"
                    >
                      <div className={`${gross ? 'aspect-[5/4]' : 'aspect-square'} overflow-hidden bild-im-grund`}>
                        <img
                          src={resolveMediaUrl(schuh.image)}
                          alt={`${schuh.name}, nach Maß gefertigt`}
                          loading="lazy"
                          className="w-full h-full object-contain transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
                        />
                      </div>
                      <p className={`${gross ? 't-lead mt-5' : 't-klein mt-3 line-clamp-2 min-h-[3em]'} c-tinte`}>
                        {schuh.name}
                      </p>
                      <p className={`${gross ? 't-text' : 't-klein'} c-leise mt-1 tabular-nums`}>
                        {schuh.price ? `ab ${schuh.price}` : 'auf Anfrage'}
                      </p>
                    </button>
                  </Enthuellen>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Enthuellen>
  )
}
