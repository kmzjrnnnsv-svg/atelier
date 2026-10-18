/**
 * Angebot — was es gibt und ab wann, als Register.
 *
 * ── Warum es diesen Abschnitt gibt ────────────────────────────────────────
 *
 * Nach den drei Zahlen weiß jemand, wie gebaut wird. Was er nicht weiß, ist
 * das Einfachste von allem: Was gibt es hier eigentlich, und was kostet das
 * Billigste? Diese Frage stand bisher bis Kapitel 5 offen — sieben
 * Bildschirme weit, und wer sie mitschleppt, liest alles andere durch sie
 * hindurch.
 *
 * Deshalb steht sie jetzt an zweiter Stelle beantwortet: fünf Macharten,
 * die echte Anzahl je Machart, der echte Einstiegspreis. Beides kommt aus
 * dem Katalog und nicht aus einer gepflegten Zeile — ein Modell mehr im CMS,
 * und hier steht es.
 *
 * ── Warum ein Register und keine Kacheln ──────────────────────────────────
 *
 * Auf dieser Seite stehen schon zwei Bildreihen: das Band zwischen den
 * beiden Tafeln und die Modellwahl am Ende des Kollektionskapitels. Eine
 * dritte wäre die Stelle, an der ein Heft zu einem Katalog wird.
 *
 * Ein Register kann außerdem, was Kacheln nicht können: fünf Zeilen
 * untereinander lassen sich vergleichen. „Sneaker ab 750, Schnürschuh ab
 * 1.350" ist eine Auskunft, die man in zwei Sekunden hat — und sie sagt
 * nebenbei, dass hier nicht alles dasselbe kostet.
 *
 * Preise stehen rechtsbündig und mit gleichen Ziffernbreiten
 * (`tabular-nums`). Eine Preisspalte, in der die Zahlen nicht untereinander
 * stehen, ist keine Spalte.
 *
 * ── Was hier NICHT steht ──────────────────────────────────────────────────
 *
 * Kein Rabatt, kein Streichpreis, kein „nur diese Woche". Der Laden führt
 * ein Feld für Aktionspreise (`promotion_price`), es ist bei allen
 * achtundvierzig leer, und es hängt ohnehin an einem Kundenkonto. Ein
 * erfundener Streichpreis wäre auf einer Seite, deren Argument die
 * Offenheit ist, der teuerste Satz überhaupt.
 *
 * „Angebot" heißt hier, was es im Schaufenster eines guten Hauses heißt:
 * das, was angeboten wird.
 */
import Enthuellen from './Enthuellen'
import Strichpfeil from './Strichpfeil'
import Kapitelmarke from './Kapitelmarke'

/**
 * @param {Array} zeilen `{ key, name, satz, anzahl, preis, einstieg }` je
 *   Machart. `einstieg` ist das Modell hinter dem Preis — ein Klick auf die
 *   Zeile öffnet genau dieses, damit der Preis hält, was die Zeile sagt.
 * @param {Object|null} express `{ anzahl, wochen, aufpreis }` oder null.
 * @param {number} [gesamt] Die echte Zahl für die Tür.
 * @param {() => void} [zurPassform] Der Weg zum Maßnehmen.
 */
export default function Angebot({ zeilen, express, oeffnen, zumKatalog, gesamt, zurPassform }) {
  if (!zeilen?.length) return null

  return (
    <section className="px-5 lg:px-16 py-16 lg:py-28">
      <div className="max-w-5xl mx-auto">
        <Enthuellen>
          <Kapitelmarke>Das Angebot</Kapitelmarke>
          <h2 className="t-kopf satz-titel mt-4 max-w-2xl">
            Fünf Formen.<br className="hidden sm:block" /> Und was jede kostet.
          </h2>
        </Enthuellen>

        <Enthuellen verzoegerung={120}>
          <p className="t-text c-tinte mt-7 max-w-lg">
            Die fünf, nach denen am häufigsten gefragt wird. Gebaut wird jede
            gleich. Den Preis machen die Form, das Leder und wie viel Arbeit in
            der Sohle steckt.
          </p>
        </Enthuellen>

        <div className="mt-12 lg:mt-16">
          {zeilen.map((z, i) => (
            <Enthuellen key={z.key} verzoegerung={Math.min(i, 4) * 70}>
              <button
                type="button"
                onClick={() => z.einstieg && oeffnen(z.einstieg)}
                disabled={!z.einstieg}
                className="group block w-full bg-transparent border-0 p-0 text-left py-6 lg:py-7 disabled:cursor-default"
              >
                {/* Zwei Spalten auf dem Telefon, zwölf am Bildschirm — aber
                    dieselben vier Angaben und dieselbe DOM-Folge. Platziert
                    wird über `col-start` und `row-start`, nicht über zwei
                    Fassungen, von denen eine versteckt ist: Was doppelt im
                    Markup steht, läuft beim nächsten Textwechsel
                    auseinander. */}
                <div className="grid grid-cols-[1fr_auto] gap-x-5 gap-y-2.5 lg:grid-cols-12 lg:gap-8 lg:items-baseline">
                  {/* Name und Anzahl in einer Zeile — dieselbe Geste wie die
                      Wortreihe der Modellwahl in Kapitel 6. Eine eigene
                      Spalte für die Anzahl kostete auf dem Telefon eine
                      vierte Zeile und sagte nichts, was die Ziffer nicht
                      auch sagt. */}
                  <p className="t-lead lg:col-span-4 c-tinte group-hover:opacity-60 transition-opacity">
                    {z.name}
                    <span className="t-klein ml-3 tabular-nums c-leise align-middle">
                      {z.anzahl}
                    </span>
                  </p>

                  {/* Der Preis steht im Markup vor dem Satz, damit er auf dem
                      Telefon in dieselbe Zeile rutscht wie der Name. Am
                      Bildschirm setzt ihn `col-start-11` wieder ganz nach
                      rechts.

                      Rechtsbündig und mit gleichen Ziffernbreiten: Eine
                      Preisspalte, in der die Zahlen nicht untereinander
                      stehen, ist keine Spalte — und genau das Untereinander
                      ist der Grund, warum hier ein Register steht und keine
                      Kacheln. */}
                  <p className="t-lead text-right tabular-nums c-tinte lg:col-span-2 lg:col-start-11">
                    {z.preis ? `ab ${z.preis}` : 'auf Anfrage'}
                  </p>

                  {/* Der Satz zur Machart: auf dem Telefon über beide Spalten
                      unter der Kopfzeile, am Bildschirm in derselben Zeile
                      zwischen Name und Preis. Ohne ihn wäre das Register
                      eine Preisliste. */}
                  <p className="t-text col-span-2 c-tinte lg:col-span-5 lg:col-start-6 lg:row-start-1">
                    {z.satz}
                  </p>
                </div>
              </button>
            </Enthuellen>
          ))}
        </div>

        {/* Die schnellere Fassung. Sie steht hier und nicht weiter unten, weil
            sie zum Angebot gehört und nicht zur Machart — und sie nennt den
            Haken in derselben Zeile wie den Vorteil. Was genau vorbereitet
            ist, steht am Modell (siehe ExpressHinweis). */}
        {express && (
          <Enthuellen verzoegerung={140}>
            <div className="mt-12 lg:mt-16 max-w-2xl">
              <p className="t-klein c-leise">Schneller</p>
              <p className="t-text c-tinte mt-3">
                {express.anzahl} Modelle gibt es als Express-Fassung: rund{' '}
                {express.wochen} Wochen statt 4 bis 6
                {express.aufpreis ? `, € ${express.aufpreis} Aufpreis` : ''}. Möglich wird
                das durch vorbereitete Bauteile. Welche Entscheidungen damit schon
                getroffen sind, steht am Modell.
              </p>
            </div>
          </Enthuellen>
        )}

        <Enthuellen verzoegerung={180}>
          {/* Auf dem Telefon steht die Tür über dem Kleingedruckten
              (`order`): Wer bis hierher gescrollt ist, sucht den Weg in den
              Katalog und nicht den Satz über den Versand. Am Bildschirm
              stehen beide nebeneinander, und dort gilt die Leserichtung. */}
          <div className="mt-10 lg:mt-14 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-6 sm:gap-5">
            {/* ── Was hier NICHT mehr steht ────────────────────────────

                „Stimmt die Passform nicht, fertigen wir neu, ohne Kosten
                für dich." Das war eine Passform-Garantie, und der Laden
                gibt keine: Die maßgebliche Zusage (siehe ShoeCollection und
                die AGB) sagt „Ist etwas mangelhaft" — das ist
                Gewährleistung für einen Fehler am Schuh, nicht für einen
                Fehler beim Messen.

                Ein Paar entsteht für einen bestimmten Fuß; wer daneben
                misst, hat ein Paar, das niemandem passt. Deshalb steht hier
                jetzt kein Versprechen, sondern der Weg, es gar nicht erst
                so weit kommen zu lassen — die ehrlichere Auskunft und die
                nützlichere dazu. */}
            <div className="order-2 sm:order-none max-w-md">
              <p className="t-text c-leise">
                Im Preis: Versand innerhalb Deutschlands. Damit die Größe stimmt,
                nimm vorher Maß. Fußlänge und Ballenumfang genügen, ein
                Schnürsenkel und ein Lineal reichen dafür.
              </p>
              {zurPassform && (
                <button
                  type="button"
                  onClick={zurPassform}
                  className="t-klein group mt-4 bg-transparent border-0 p-0 inline-flex items-center gap-3 c-tinte hover:text-black transition-colors"
                >
                  <span className="underline underline-offset-[6px] decoration-1">
                    Passform bestimmen
                  </span>
                  <Strichpfeil />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={zumKatalog}
              className="t-klein group order-1 sm:order-none shrink-0 self-start bg-transparent border-0 p-0 inline-flex items-center gap-3 c-tinte hover:text-black/60 transition-colors"
            >
              <span className="underline underline-offset-[6px] decoration-1">
                {gesamt ? `Alle ${gesamt} Modelle` : 'Alle Modelle'}
              </span>
              <Strichpfeil />
            </button>
          </div>
        </Enthuellen>
      </div>
    </section>
  )
}
