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
import { ArrowRight } from 'lucide-react'
import Enthuellen from './Enthuellen'
import Kapitelmarke from './Kapitelmarke'

/**
 * @param {Array} zeilen `{ key, name, satz, anzahl, preis, einstieg }` je
 *   Machart. `einstieg` ist das Modell hinter dem Preis — ein Klick auf die
 *   Zeile öffnet genau dieses, damit der Preis hält, was die Zeile sagt.
 * @param {Object|null} express `{ anzahl, wochen, aufpreis }` oder null.
 * @param {number} [gesamt] Die echte Zahl für die Tür.
 */
export default function Angebot({ zeilen, express, oeffnen, zumKatalog, gesamt }) {
  if (!zeilen?.length) return null

  return (
    <section className="px-5 lg:px-16 py-16 lg:py-28 border-b border-black/[0.07]">
      <div className="max-w-5xl mx-auto">
        <Enthuellen>
          <Kapitelmarke>Das Angebot</Kapitelmarke>
          <h2 className="satz-titel text-[29px] lg:text-[48px] leading-[1.14] mt-4 max-w-2xl">
            Fünf Macharten.<br className="hidden sm:block" /> Und was jede kostet.
          </h2>
        </Enthuellen>

        <Enthuellen verzoegerung={120}>
          <p className="text-[13px] lg:text-[15px] text-black/50 font-light leading-[1.95] mt-7 max-w-lg">
            Gebaut wird jede gleich. Den Preis machen die Form, das Leder und wie
            viel Arbeit in der Sohle steckt.
          </p>
        </Enthuellen>

        <div className="mt-12 lg:mt-16">
          {zeilen.map((z, i) => (
            <Enthuellen key={z.key} verzoegerung={Math.min(i, 4) * 70}>
              <button
                type="button"
                onClick={() => z.einstieg && oeffnen(z.einstieg)}
                disabled={!z.einstieg}
                className="group block w-full bg-transparent border-0 border-t border-black/[0.10] p-0 text-left py-6 lg:py-7 disabled:cursor-default"
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
                  <p className="lg:col-span-4 text-[12px] lg:text-[13px] uppercase text-black group-hover:text-black/55 transition-colors"
                     style={{ letterSpacing: '0.22em' }}>
                    {z.name}
                    <span className="ml-2.5 text-[10px] tabular-nums text-black/30 tracking-normal">
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
                  <p className="text-right tabular-nums text-[15px] lg:text-[16px] text-black/70 font-light lg:col-span-2 lg:col-start-11">
                    {z.preis ? `ab ${z.preis}` : 'auf Anfrage'}
                  </p>

                  {/* Der Satz zur Machart: auf dem Telefon über beide Spalten
                      unter der Kopfzeile, am Bildschirm in derselben Zeile
                      zwischen Name und Preis. Ohne ihn wäre das Register
                      eine Preisliste. */}
                  <p className="col-span-2 text-[13px] text-black/45 font-light leading-[1.8] lg:col-span-5 lg:col-start-6 lg:row-start-1">
                    {z.satz}
                  </p>
                </div>
              </button>
            </Enthuellen>
          ))}
          <div className="border-t border-black/[0.10]" />
        </div>

        {/* Die schnellere Fassung. Sie steht hier und nicht weiter unten, weil
            sie zum Angebot gehört und nicht zur Machart — und sie nennt den
            Haken in derselben Zeile wie den Vorteil. Was genau vorbereitet
            ist, steht am Modell (siehe ExpressHinweis). */}
        {express && (
          <Enthuellen verzoegerung={140}>
            <div className="mt-12 lg:mt-16 max-w-2xl">
              <p className="text-[10px] uppercase tracking-[0.28em] text-black/35">Schneller</p>
              <p className="text-[13px] lg:text-[15px] text-black/55 font-light leading-[1.95] mt-3">
                {express.anzahl} Modelle gibt es als Express-Fassung: rund{' '}
                {express.wochen} Wochen statt rund vier
                {express.aufpreis ? `, € ${express.aufpreis} Aufpreis` : ''}. Möglich wird
                das durch vorbereitete Bauteile — welche Entscheidungen damit schon
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
            <p className="order-2 sm:order-none text-[12px] text-black/40 font-light leading-[1.9] max-w-md">
              Im Preis: Versand innerhalb Deutschlands. Stimmt die Passform nicht,
              fertigen wir neu, ohne Kosten für dich.
            </p>
            <button
              type="button"
              onClick={zumKatalog}
              className="group order-1 sm:order-none shrink-0 self-start bg-transparent border-0 p-0 inline-flex items-center gap-3 text-[11px] uppercase text-black hover:text-black/60 transition-colors"
              style={{ letterSpacing: '0.22em' }}
            >
              <span className="relative pb-1">
                {gesamt ? `Alle ${gesamt} Modelle` : 'Alle Modelle'}
                <span className="absolute left-0 bottom-0 h-px w-full bg-black/25 group-hover:bg-black/50 transition-colors" />
              </span>
              <ArrowRight size={14} strokeWidth={1.5} className="transition-transform duration-500 group-hover:translate-x-1.5" />
            </button>
          </div>
        </Enthuellen>
      </div>
    </section>
  )
}
