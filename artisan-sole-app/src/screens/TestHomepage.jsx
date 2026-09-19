/**
 * TestHomepage — eine Startseite zur Ansicht, unter /test-homepage.
 *
 * ── Warum es sie gibt ─────────────────────────────────────────────────────
 *
 * Der Laden hat keine Startseite. `/` leitet weiter auf `/collection`
 * (siehe StartRoute), das heißt: Wer artisansole.com eintippt, steht sofort
 * im Regal. Das ist für jemanden, der die Marke schon kennt, der kürzeste
 * Weg — und für alle anderen der Moment, in dem die Seite nichts erklärt.
 * Warum rahmengenäht besser ist als geklebt, warum es vier bis sechs Wochen
 * dauert und was „nach deinen Maßen" bedeutet, steht verstreut auf
 * /entdecken und unter dem Raster der Kollektion.
 *
 * Für die Suche ist die Weiterleitung zusätzlich ungünstig: Die Adresse mit
 * dem stärksten Gewicht trägt keinen eigenen Inhalt, und in der sitemap.xml
 * stehen `/` und `/collection` als zwei Einträge für dieselbe Seite.
 *
 * ── Was sie anders macht ──────────────────────────────────────────────────
 *
 * Drei Entscheidungen, über die es sich zu streiten lohnt:
 *
 *   1. Der erste Bildschirm nennt den Einwand, statt ihn zu umgehen.
 *      „Rahmengenäht, nicht geklebt" und der Preis stehen oben, nicht
 *      hinter einem Klick. Wer 450 Euro für Schuhe nicht ausgeben will,
 *      soll das hier erfahren und nicht erst im Konfigurator.
 *   2. Die Modelle kommen vor der Erklärung. Ein Laden, der zuerst von sich
 *      erzählt, verliert die Hälfte; die Kacheln stehen deshalb direkt unter
 *      dem Kopf und führen in den Konfigurator.
 *   3. Die Offenheit über die Machart ist das Verkaufsargument, nicht das
 *      Kleingedruckte. Der Abschnitt „Was wir nicht behaupten" sagt
 *      ausdrücklich, dass maschinell rahmengenäht wird — dieselbe Zusage,
 *      die überall sonst im Laden steht, hier aber als Haltung.
 *
 * ── Was bewusst fehlt ─────────────────────────────────────────────────────
 *
 * Keine Kopfbild-Fotostrecke. Die Aufnahmen im Bestand sind Stockfotos
 * (siehe lib/editorialImages.js); ein bildschirmfüllendes fremdes Foto
 * verspricht eine Marke, die es noch nicht gibt. Bis es eigene Aufnahmen
 * gibt, trägt der Kopf Schrift — dieselbe Entscheidung wie beim
 * Vorschaubild.
 *
 * ── Nicht indexieren ──────────────────────────────────────────────────────
 *
 * `indexieren: false`. Solange zwei Startseiten nebeneinander stehen, darf
 * nur eine in den Index: Sonst konkurrieren sie um dieselben Suchbegriffe
 * und schwächen sich gegenseitig. In der robots.txt steht der Pfad
 * zusätzlich unter Disallow — die Angabe hier gilt für den, der die Seite
 * doch abruft, die robots.txt für den, der sie gar nicht erst besucht.
 *
 * Wird aus dieser Fassung die echte Startseite, gehört sie an `/` statt an
 * StartRoute, `indexieren` fällt weg, der Disallow-Eintrag fällt weg, und
 * `/collection` verliert seinen Eintrag in der sitemap.xml an `/`.
 */
import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Footprints, Ruler, Scissors, Truck, RefreshCw } from 'lucide-react'
import useStore from '../store/store'
import { useSeo } from '../lib/seo'
import { shoePath } from '../lib/shoePath'
import { PreisFuss } from '../lib/preisangabe'
import { preisAlsZahl, preisAlsText } from '../lib/preis'
import Ablauf from '../components/Ablauf'

/**
 * Die Machart in vier Sätzen, je einer pro Punkt.
 *
 * Bewusst keine Kacheln mit Symbolen und drei Wörtern: Was einen
 * rahmengenähten Schuh von einem geklebten unterscheidet, lässt sich in drei
 * Wörtern nicht sagen, und wer es nicht weiß, kauft nicht.
 */
const MACHART = [
  {
    icon: Scissors,
    titel: 'Rahmengenäht, nicht geklebt',
    text: 'Sohle und Schaft sind über einen Lederstreifen vernäht, den Rahmen. '
        + 'Ein geklebter Schuh ist am Ende seiner Sohle am Ende; dieser wird neu besohlt '
        + 'und läuft weiter.',
  },
  {
    icon: Ruler,
    titel: 'Zwei Maße statt einer Größe',
    text: 'Fußlänge und Ballenumfang. Daraus bestimmen wir Leisten und Weite, '
        + 'statt dich in eine Nummer zu sortieren, die in jedem Haus etwas anderes bedeutet.',
  },
  {
    icon: Truck,
    titel: 'Erst bestellt, dann gebaut',
    text: 'Wir haben kein Lager. Dein Paar entsteht einzeln in einer spanischen Manufaktur, '
        + 'in vier bis sechs Wochen. Versand ist inbegriffen.',
  },
  {
    icon: RefreshCw,
    titel: 'Und wenn es nicht passt',
    text: 'Ein Schuh für einen bestimmten Fuß lässt sich nicht zurückgeben. '
        + 'Ist etwas mangelhaft, fertigen wir das Paar neu, ohne Kosten für dich. '
        + 'Die Einzelheiten stehen in den AGB.',
  },
]

export default function TestHomepage() {
  const navigate = useNavigate()
  const shoes = useStore(s => s.shoes)
  const katalogStatus = useStore(s => s.katalogStatus)
  const initStore = useStore(s => s.initStore)

  useSeo({
    titel: 'Rahmengenähte Schuhe nach deinen Maßen',
    beschreibung: 'Rahmengenäht statt geklebt, einzeln gefertigt in einer spanischen '
      + 'Manufaktur, nach deinen Maßen. Leder, Sohle und Details stellst du selbst zusammen.',
    pfad: '/test-homepage',
    indexieren: false,
  })

  // Der Katalog wird sonst erst von der Kollektionsseite geholt. Diese Seite
  // kann die erste sein, die jemand öffnet — dann ist er noch leer.
  useEffect(() => { initStore?.() }, [initStore])

  // Sechs Modelle, keine Auswahl nach Beliebtheit: Die gibt es in den Daten
  // nicht, und eine erfundene Reihenfolge wäre schlechter als die eigene.
  // Modelle ohne Bild fallen heraus — eine Kachel mit grauer Fläche verkauft
  // nichts und sieht nach einem Fehler aus.
  const gezeigt = useMemo(
    () => shoes.filter(s => s.image).slice(0, 6),
    [shoes],
  )

  // Der niedrigste Preis im Katalog. Er steht im Kopf, weil die Frage „was
  // kostet das" sonst bis zur Modellseite offen bleibt — und wer sie dort
  // zum ersten Mal beantwortet bekommt, ist zweimal enttäuscht.
  const abPreis = useMemo(() => {
    const preise = shoes.map(s => preisAlsZahl(s.price)).filter(p => p > 0)
    return preise.length ? Math.min(...preise) : null
  }, [shoes])

  return (
    <div className="min-h-full bg-white">

      {/* ── Kopf ──────────────────────────────────────────────────────
          Drei Zeilen und zwei Wege. Die Überschrift nennt das Produkt, nicht
          die Marke: „Artisan Sole" steht ohnehin in der Leiste darüber, und
          wer den Namen noch nicht kennt, sucht nicht danach. */}
      <header className="px-5 lg:px-16 pt-10 lg:pt-20 pb-9 lg:pb-14 text-center">
        <p className="text-[10px] text-black/30 uppercase tracking-[0.3em] mb-3">
          Custom Made · Made in Spain
        </p>
        <h1 className="text-[30px] lg:text-[46px] font-extralight text-black leading-[1.05] tracking-tight max-w-3xl mx-auto">
          Rahmengenähte Schuhe,<br className="hidden sm:block" /> nach deinen Maßen gebaut.
        </h1>
        <p className="text-[13px] lg:text-[15px] text-black/50 font-light leading-relaxed mt-5 max-w-xl mx-auto">
          Kein Lager, keine Konfektionsgröße. Du stellst Leder, Sohle und Details
          zusammen, wir messen deinen Fuß über zwei Maße.
          {abPreis ? <> Ab <span className="text-black/75">€&nbsp;{preisAlsText(abPreis)}</span>.</> : null}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 mt-7">
          <button
            type="button"
            onClick={() => navigate('/collection')}
            className="w-full sm:w-auto bg-black text-white border-0 px-8 h-11 text-[11px] uppercase flex items-center justify-center gap-2 hover:bg-black/85 transition-colors"
            style={{ letterSpacing: '0.18em' }}
          >
            Modelle ansehen
            <ArrowRight size={15} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={() => navigate('/scan')}
            className="w-full sm:w-auto bg-transparent border border-black/15 text-black/70 px-8 h-11 text-[11px] uppercase flex items-center justify-center gap-2 hover:border-black/40 hover:text-black transition-colors"
            style={{ letterSpacing: '0.18em' }}
          >
            <Footprints size={15} strokeWidth={1.5} />
            Passform bestimmen
          </button>
        </div>
      </header>

      {/* ── Modelle ───────────────────────────────────────────────────
          Vor der Erklärung, nicht danach. Wer schon weiß, was er will, soll
          nicht an einem Absatz über Handwerk vorbei müssen. */}
      <section className="px-5 lg:px-16 pb-12 lg:pb-20">
        <div className="flex items-end justify-between mb-4 lg:mb-6">
          <p className="text-[10px] text-black/35 uppercase tracking-[0.22em]">Aus der Kollektion</p>
          <button
            type="button"
            onClick={() => navigate('/collection')}
            className="bg-transparent border-0 p-0 text-[11px] text-black/45 hover:text-black transition-colors flex items-center gap-1.5"
          >
            Alle Modelle
            <ArrowRight size={13} strokeWidth={1.5} />
          </button>
        </div>

        {katalogStatus === 'loading' && !gezeigt.length ? (
          <div className="py-16 text-center text-[12px] text-black/30 font-light">
            Modelle werden geladen …
          </div>
        ) : katalogStatus === 'error' && !gezeigt.length ? (
          // Kein leeres Raster und kein Spinner ohne Ende: Sagen, was ist,
          // und den Weg offen lassen, der ohne Katalog funktioniert.
          <div className="py-12 text-center">
            <p className="text-[12px] text-black/45 font-light">
              Die Modelle lassen sich gerade nicht laden.
            </p>
            <button
              type="button"
              onClick={() => initStore?.()}
              className="mt-3 bg-transparent border border-black/15 text-black/70 px-6 h-10 text-[11px] uppercase hover:border-black/40 hover:text-black transition-colors"
              style={{ letterSpacing: '0.16em' }}
            >
              Noch einmal versuchen
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-px bg-black/[0.07]">
              {gezeigt.map(schuh => (
                <button
                  key={schuh.id}
                  type="button"
                  onClick={() => navigate(shoePath(schuh))}
                  className="group relative bg-white border-0 p-0 text-left overflow-hidden"
                >
                  <div className="aspect-[4/5] overflow-hidden bg-[#EDEAE3]">
                    <img
                      src={schuh.image}
                      alt={`${schuh.name}, rahmengenäht, nach Maß gefertigt`}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="px-3.5 py-3">
                    <p className="text-[12px] lg:text-[13px] text-black font-normal leading-snug line-clamp-2 min-h-[2.6em]">
                      {schuh.name}
                    </p>
                    <p className="text-[12px] lg:text-[13px] text-black/55 font-light mt-0.5">
                      {schuh.price ? `ab ${schuh.price}` : 'auf Anfrage'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
            {gezeigt.length > 0 && <PreisFuss className="mt-3" />}
          </>
        )}
      </section>

      {/* ── Machart ───────────────────────────────────────────────────
          Der Teil, der den Preis erklärt. Auf einem hellen Grund abgesetzt,
          damit er als zusammenhängender Text gelesen wird und nicht als
          weitere Reihe Kacheln. */}
      <section className="bg-[#fafaf9] border-y border-black/[0.06] px-5 lg:px-16 py-12 lg:py-20">
        <div className="max-w-4xl mx-auto">
          <p className="text-[10px] text-black/35 uppercase tracking-[0.22em] mb-2">Worin der Unterschied liegt</p>
          <h2 className="text-[22px] lg:text-[30px] font-extralight leading-[1.15] tracking-tight max-w-2xl">
            Ein Schuh, der sich reparieren lässt, ist ein anderes Produkt
            als einer, den man ersetzt.
          </h2>

          <div className="grid sm:grid-cols-2 gap-x-10 gap-y-8 mt-9 lg:mt-12">
            {/* `punkt.icon` als Element statt einer umbenannten Destrukturierung:
                ESLint hält das umbenannte `Icon` sonst für unbenutzt und meldet
                einen Fehler, den es nicht gibt — dieselbe Falschmeldung steht
                schon zweimal im CMS. */}
            {MACHART.map(punkt => (
              <div key={punkt.titel}>
                <punkt.icon size={17} strokeWidth={1.4} className="text-black/40" />
                <p className="text-[13px] lg:text-[14px] text-black font-normal mt-3">{punkt.titel}</p>
                <p className="text-[12px] lg:text-[13px] text-black/50 font-light leading-relaxed mt-1.5">
                  {punkt.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Was wir nicht behaupten ───────────────────────────────────
          Der Abschnitt, der diese Fassung von der bisherigen Seite trennt.
          Die Offenheit über die Machart war bisher eine Selbstauskunft im
          Kleingedruckten; hier ist sie ein Verkaufsargument. Wer „handmade"
          liest und später erfährt, dass Maschinen im Spiel waren, zieht den
          Rest der Zusagen in Zweifel — auch die, die stimmen. */}
      <section className="px-5 lg:px-16 py-12 lg:py-20">
        <div className="max-w-2xl mx-auto">
          <p className="text-[10px] text-black/35 uppercase tracking-[0.22em] mb-2">In eigener Sache</p>
          <h2 className="text-[20px] lg:text-[26px] font-extralight leading-[1.2] tracking-tight">
            Was wir nicht behaupten
          </h2>
          <p className="text-[13px] lg:text-[14px] text-black/55 font-light leading-relaxed mt-5">
            Wir schreiben nicht „handgefertigt". Der Rahmen wird maschinell genäht,
            wie in fast jeder Manufaktur, die in dieser Preisklasse arbeitet. Von Hand
            kommen Zuschnitt, Zwicken, Finish und die Endkontrolle — über zweihundert
            Arbeitsschritte, von denen wir keinen erfunden haben.
          </p>
          <p className="text-[13px] lg:text-[14px] text-black/55 font-light leading-relaxed mt-4">
            Wir sagen es, weil der Unterschied zwischen einem rahmengenähten und
            einem geklebten Schuh groß genug ist. Er braucht kein Wort, das ihn
            größer macht.
          </p>
        </div>
      </section>

      {/* ── Ablauf ────────────────────────────────────────────────────
          Dieselbe Darstellung wie unter der Kollektion und im Firmenbereich.
          Eine eigene Gestaltung nur für diese Seite hieße, dieselbe
          Erklärung an der vierten Stelle anders aussehen zu lassen. */}
      <section className="bg-[#fafaf9] border-y border-black/[0.06] px-5 lg:px-16 py-12 lg:py-20">
        <Ablauf
          titel="Vom Klick zum Paar"
          intro="Vier Schritte, und du weißt nach jedem, woran du bist."
          breite="max-w-2xl"
          schritte={[
            { titel: 'Modell und Ausführung',
              text: 'Leder, Farbe, Sohle, Absatz, Innenfutter und die Details. Jede Änderung ist sofort am Preis zu sehen. Unterbrechen und später weitermachen geht, der Stand bleibt gespeichert.' },
            { titel: 'Maße statt Größe',
              text: 'Fußlänge und Ballenumfang, ±0,5 cm genügen. Daraus ermitteln wir Leisten und Größe. Eine Größentabelle brauchst du nicht, weil wir nicht raten.' },
            { titel: 'Fertigung',
              text: 'Nach Zahlungseingang geht die Bestellung in die Manufaktur. Du bekommst Nachricht, wenn die Fertigung beginnt und wenn dein Paar in die Endkontrolle geht.' },
            { titel: 'Endkontrolle und Versand',
              text: 'Wir prüfen jedes Paar einzeln, bevor es das Haus verlässt. Mit dem Versand kommt die Sendungsverfolgung.' },
          ]}
          fuss="Vier bis sechs Wochen ab Zahlungseingang. Versand innerhalb Deutschlands ist inbegriffen."
        />
      </section>

      {/* ── Abschluss ─────────────────────────────────────────────────
          Ein Weg, nicht drei. Wer bis hierher gelesen hat, sucht keine
          Auswahl mehr, sondern den Anfang. */}
      <section className="px-5 lg:px-16 py-14 lg:py-24 text-center">
        <h2 className="text-[22px] lg:text-[30px] font-extralight leading-[1.15] tracking-tight max-w-lg mx-auto">
          Fang mit dem Modell an. Die Maße kommen später.
        </h2>
        <p className="text-[12px] lg:text-[13px] text-black/45 font-light mt-4 max-w-md mx-auto leading-relaxed">
          Konfigurieren kostet nichts und verpflichtet zu nichts. Erst am Ende
          stehen Preis und Lieferzeit fest.
        </p>
        <button
          type="button"
          onClick={() => navigate('/collection')}
          className="mt-7 bg-black text-white border-0 px-10 h-12 text-[11px] uppercase inline-flex items-center justify-center gap-2 hover:bg-black/85 transition-colors"
          style={{ letterSpacing: '0.18em' }}
        >
          Schuh konfigurieren
          <ArrowRight size={15} strokeWidth={1.5} />
        </button>
      </section>
    </div>
  )
}
