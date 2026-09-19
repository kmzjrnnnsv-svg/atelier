/**
 * TestHomepage — eine Startseite zur Ansicht, unter /test-homepage.
 *
 * ── Warum es sie gibt ─────────────────────────────────────────────────────
 *
 * Der Laden hat keine Startseite. `/` leitet weiter auf `/collection`
 * (siehe StartRoute): Wer artisansole.com eintippt, steht sofort im Regal.
 * Für jemanden, der die Marke kennt, ist das der kürzeste Weg — für alle
 * anderen der Moment, in dem die Seite nichts erklärt. Und für die Suche ist
 * es ungünstig: Die Adresse mit dem stärksten Gewicht trägt keinen eigenen
 * Inhalt.
 *
 * ── Was diese Fassung versucht ────────────────────────────────────────────
 *
 * Bei einem Paar Schuhe in dieser Preisklasse entscheidet nicht der Preis,
 * sondern ob jemand versteht, wofür er ihn zahlt — und ob er sich vorstellen
 * kann, wie es ist, damit zu leben. Diese Seite erzählt das in Kapiteln, und
 * jedes beantwortet eine Frage, die sonst offenbliebe:
 *
 *   1  Erster Blick    Was ist das, und was kostet es?
 *   2  Drei Zahlen     Woran hängt der Preis?
 *   3  Die Modelle     Wofür ist es gemacht, und was wird daraus?
 *   4  Das Handwerk    Warum hält das länger als Geklebtes?
 *   5  Das Leder       Woraus besteht es?
 *   6  In eigener Sache Was behaupten wir NICHT?
 *   7  Der Weg         Wie viele Entscheidungen kommen auf mich zu?
 *   8  Der Anfang      Wo fange ich an?
 *
 * Am Ende ist keine Frage offen, die vor dem Kauf zählt. Das ist gemeint,
 * wenn hier von einer geschlossenen Geschichte die Rede ist.
 *
 * ── Woher die Texte kommen ────────────────────────────────────────────────
 *
 * Die Geschichte zu jedem Modell ist NICHT erfunden: Sie steht als
 * `description` im Katalog, geschrieben für genau dieses Modell, und wird
 * hier nur größer gesetzt. Fehlt sie, entfällt das Kapitel — lieber drei
 * Modelle mit Geschichte als sechs mit Füllsatz.
 *
 * Erfunden ist das, was über die Machart gesagt wird: was ein Rahmen ist,
 * was Shell Cordovan von Kalbsleder unterscheidet, warum ein Leisten zählt.
 * Das ist Sachwissen über Schuhe und gilt unabhängig von diesem Haus.
 *
 * Bewusst NICHT erfunden ist alles, was sich nachprüfen ließe und dem Haus
 * zugeschrieben würde: kein Gründungsjahr, kein Name einer Manufaktur, kein
 * Ort außer Spanien, keine Auszeichnung, keine Stückzahl, keine Kundenstimme.
 * Eine Marke, deren Alleinstellung die Offenheit über die Machart ist, darf
 * sich keine Geschichte erfinden — der erste, der nachfragt, nimmt ihr damit
 * auch das, was stimmt.
 *
 * ── Die Bilder ────────────────────────────────────────────────────────────
 *
 * Die Modellkapitel tragen die echte Aufnahme aus dem Katalog. Die
 * Stimmungsflächen greifen auf `lib/editorialImages.js` zurück — Stockfotos,
 * als solche im Bestand vermerkt. Sie sind ein Platzhalter, kein Ziel: Was
 * diese Seite trägt, sind eigene Aufnahmen, und dieser Aufbau ist so
 * gebaut, dass sie nur ausgetauscht werden müssen.
 *
 * ── Bewegung ──────────────────────────────────────────────────────────────
 *
 * Über `Enthuellen` und zwei Regeln in index.css, beide zurückhaltend und
 * beide abgeschaltet, wenn das Gerät `prefers-reduced-motion` meldet. Nichts
 * hält jemanden auf — der Inhalt ist von der ersten Sekunde an da. Aus
 * diesem Laden ist einmal eine blockierende Animation entfernt worden, und
 * das zu Recht.
 *
 * ── Nicht indexieren ──────────────────────────────────────────────────────
 *
 * `indexieren: false`, dazu ein Disallow in der robots.txt. Solange zwei
 * Startseiten nebeneinander stehen, gehört nur eine in den Index.
 *
 * Wird dies die echte Startseite: Route auf `/` statt StartRoute,
 * `indexieren` weg, Disallow weg, und `/collection` gibt seinen
 * Sitemap-Eintrag an `/` ab.
 */
import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Footprints, Ruler, Hammer, CalendarDays, Check } from 'lucide-react'
import useStore from '../store/store'
import { useSeo } from '../lib/seo'
import { shoePath } from '../lib/shoePath'
import { PreisFuss } from '../lib/preisangabe'
import { preisAlsZahl, preisAlsText } from '../lib/preis'
import { resolveMediaUrl } from '../lib/mediaUrl'
import { SHOES, CRAFT, LIFESTYLE } from '../lib/editorialImages'
import Enthuellen from '../components/Enthuellen'
import RahmenSchnitt from '../components/RahmenSchnitt'

/* ── Bausteine ──────────────────────────────────────────────────────────── */

/** Die kleine gesperrte Zeile über jeder Überschrift. Gliedert die Seite. */
function Kapitelmarke({ children, hell = false }) {
  return (
    <p
      className={`text-[10px] uppercase tracking-[0.3em] ${hell ? 'text-white/45' : 'text-black/30'}`}
    >
      {children}
    </p>
  )
}

/**
 * Drei Zahlen, die den Preis erklären.
 *
 * Keine Werbeworte — Zahlen, die jeder nachhalten kann. „Über 200
 * Arbeitsschritte" steht auch im Konfigurator und im Ablauf; sie hier zu
 * nennen ist keine neue Behauptung, sondern dieselbe an der Stelle, an der
 * jemand zum ersten Mal auf den Preis trifft.
 */
const ZAHLEN = [
  { icon: Ruler,        zahl: '2',      einheit: 'Maße',           text: 'Fußlänge und Ballenumfang. Daraus Leisten, Größe und Weite — keine Konfektionsnummer.' },
  { icon: Hammer,       zahl: '200+',   einheit: 'Arbeitsschritte', text: 'Vom Zuschnitt über das Zwicken bis zur Endkontrolle. Jeder einzeln, an einem einzelnen Paar.' },
  { icon: CalendarDays, zahl: '4–6',    einheit: 'Wochen',         text: 'So lange dauert ein Paar, das es vorher nicht gab. Wir haben kein Lager, aus dem wir greifen.' },
]

/**
 * Die Leder. Sachwissen über Häute, nicht über dieses Haus.
 *
 * Die Auswahl im Konfigurator ist größer und ändert sich; hier stehen die
 * drei, an denen sich der Unterschied erklären lässt. Wer mehr will, findet
 * alles im Konfigurator — darauf verweist der Abschnitt auch.
 */
const LEDER = [
  {
    bild: CRAFT.leather,
    name: 'Vollnarbiges Kalbsleder',
    text: 'Die äußerste, dichteste Schicht der Haut, ungeschliffen. Sie trägt ihre Narbung noch, '
        + 'nimmt mit den Jahren die Bewegung des Fußes an und bekommt dabei eine Patina, '
        + 'die kein neues Paar hat.',
  },
  {
    bild: LIFESTYLE.darkLeather,
    name: 'Shell Cordovan',
    text: 'Aus einer besonderen, sehr dichten Lage der Pferdehaut. Es knittert nicht in scharfen '
        + 'Falten, sondern legt sich in weiche Wellen, und es gewinnt beim Tragen an Tiefe. '
        + 'Die Gerbung dauert Monate — daran hängt der Aufpreis.',
  },
  {
    bild: CRAFT.stitching,
    name: 'Nubuk und Velours',
    text: 'Angeschliffene Oberflächen mit kurzem, mattem Flor. Sie nehmen der Form die Strenge '
        + 'und machen einen strengen Schuh tragbar an Tagen, an denen Sorgfalt nicht nach '
        + 'Anstrengung aussehen soll.',
  },
]

/**
 * Was ein Modell erzählt, jenseits dessen, was es ist.
 *
 * ── Warum es das braucht ──────────────────────────────────────────────────
 *
 * Die erste Fassung dieser Kapitel stellte unter jede Geschichte eine
 * Aufstellung: Leder, Grundton, Fertigung, Preis. Sie füllte die Fläche und
 * machte aus einem Kapitel ein Datenblatt — „das sind unsere Produkte" statt
 * „so ist es, damit zu leben". Genau der Unterschied, den Häuser dieser
 * Preisklasse ausmacht: Sie zeigen das Stück nicht für sich, sondern in
 * einer Welt, und sie verkaufen nicht die Eigenschaft, sondern das Gefühl,
 * das sie erzeugt.
 *
 * Deshalb steht jetzt über jedem Modell kein Name, sondern ein Satz, und
 * unter der Geschichte nicht eine Tabelle, sondern zwei Gedanken: wofür die
 * Form gemacht ist, und was nach Jahren aus dem Paar geworden ist. Die harten
 * Angaben bleiben — als eine ruhige Zeile, nicht als Aufstellung.
 *
 * ── Was hier erfunden ist ─────────────────────────────────────────────────
 *
 * Die Sätze. Sie sind Interpretation einer Schuhform, nicht Auskunft über
 * dieses Haus: Ein Derby gibt dem Spann Raum, also trägt er sich länger; ein
 * Oxford ist die formellste Machart, also steht er für Räume, in denen die
 * Kleidung vorher spricht. Das ist Sachwissen, in Erfahrung übersetzt.
 *
 * Was NICHT erfunden ist, bleibt wie gehabt: keine Geschichte über das Haus,
 * kein Gründungsjahr, kein Name, kein Ort außer Spanien.
 *
 * ── Zur Alterung ──────────────────────────────────────────────────────────
 *
 * Der zweite Gedanke („nach Jahren") ist der stärkste, den ein Schuh hat, und
 * der einzige, den ein Foto nicht zeigen kann. Er gilt für Leder und für die
 * rahmengenähte Machart — deshalb steht der Satz übers Neubesohlen nur bei
 * den Macharten, für die er zutrifft. Ein Mokassin bekommt ihn nicht.
 */
const ERZAEHLUNG = {
  OXFORD: {
    titel: 'Es gibt Räume, in denen man nichts erklären muss.',
    wofuer: 'Für den Termin, bei dem das Erste, was zählt, nicht gesagt wird.',
    zeit: 'Nach zwei Jahren ist das Leder an den Stellen dunkler, an denen dein Fuß arbeitet. '
        + 'Das ist kein Verschleiß. Das ist die Form, die er angenommen hat.',
  },
  DERBY: {
    titel: 'Der Tag wird länger als geplant.',
    wofuer: 'Für das Büro — und für alles, was danach noch dazukommt.',
    zeit: 'Wenn die Sohle durch ist, kommt eine neue. Der Schaft bleibt, und den kennst '
        + 'du dann schon besser als jeden Schuh, den du je gekauft hast.',
  },
  LOAFER: {
    titel: 'Kein Verschluss. Nur die Form, die hält.',
    wofuer: 'Für die Monate, in denen niemand mehr fragt, ob es formell genug ist.',
    zeit: 'Ein Loafer verrät seinen Träger schneller als jeder andere Schuh: Er nimmt '
        + 'die Bewegung des Fußes an, weil ihn nichts anderes hält.',
  },
  BOOT: {
    titel: 'Das Wetter entscheidet nicht mehr mit.',
    wofuer: 'Für die Jahreszeit, in der andere Schuhe im Schrank bleiben.',
    zeit: 'Wenn die Sohle durch ist, kommt eine neue. Ein Stiefel, der zehn Winter '
        + 'gesehen hat, sieht danach besser aus als am ersten Tag.',
  },
  MONK: {
    titel: 'Eine Schnalle sagt mehr als zwei Reihen Ösen.',
    wofuer: 'Für den, der einmal anders aussehen will, ohne aufzufallen.',
    zeit: 'Der Riemen bekommt mit den Jahren eine eigene Falte, dort wo er täglich '
        + 'schließt. Sie gehört ab dann zum Schuh.',
  },
  SNEAKER: {
    titel: 'Bequem ist kein Gegenteil von gut gemacht.',
    wofuer: 'Für die Tage, an denen der Weg länger ist als der Anlass.',
    zeit: 'Weiches Leder legt sich nach wenigen Wochen um den Fuß. Ab da ist es dein '
        + 'Paar und keins mehr aus dem Regal.',
  },
  MOCCASIN: {
    titel: 'Ein Schuh, der nichts von dir verlangt.',
    wofuer: 'Für alles, was kein Anzug ist.',
    zeit: 'Ungefüttertes Leder nimmt die Form des Fußes am schnellsten an — nach einem '
        + 'Sommer sitzt es, als wäre es darauf gebaut worden.',
  },
  STANDARD: {
    titel: 'Eine Form, die älter ist als jedes Haus, das sie verkauft.',
    wofuer: 'Für die Tage, an denen es auf die Füße ankommt.',
    zeit: 'Gutes Leder wird nicht alt, es wird eigen. Nach zwei Jahren sieht man, '
        + 'wem das Paar gehört.',
  },
}

const erzaehlungZu = (machart) =>
  ERZAEHLUNG[String(machart || '').toUpperCase()] || ERZAEHLUNG.STANDARD

/* ── Die Seite ──────────────────────────────────────────────────────────── */

export default function TestHomepage() {
  const navigate = useNavigate()
  const shoes = useStore(s => s.shoes)
  const shoeMaterials = useStore(s => s.shoeMaterials)
  const shoeColors = useStore(s => s.shoeColors)
  const katalogStatus = useStore(s => s.katalogStatus)
  const initStore = useStore(s => s.initStore)

  useSeo({
    titel: 'Rahmengenähte Schuhe nach deinen Maßen',
    beschreibung: 'Rahmengenäht statt geklebt, einzeln gefertigt in einer spanischen '
      + 'Manufaktur, nach deinen Maßen. Leder, Sohle und Details stellst du selbst zusammen.',
    pfad: '/test-homepage',
    indexieren: false,
  })

  // Der Katalog wird sonst erst von der Kollektionsseite geholt; diese Seite
  // kann die erste sein, die jemand öffnet.
  useEffect(() => { initStore?.() }, [initStore])

  /**
   * Die Modelle, die ein eigenes Kapitel bekommen.
   *
   * Bedingung: eine Aufnahme UND eine eigene Beschreibung. Ein Kapitel ohne
   * Bild ist eine leere Fläche, eines ohne Text eine Überschrift ohne
   * Geschichte — beides ist schlechter als ein Kapitel weniger. Vier, weil
   * die Seite danach noch fünf Kapitel trägt und niemand acht Modelle liest,
   * bevor er das Handwerk verstanden hat.
   */
  const kapitel = useMemo(() => {
    // Höchstens eines je Machart, und jede Geschichte nur einmal.
    //
    // Ohne die erste Regel standen hier vier Loafer: Der Katalog führt zehn
    // davon, und sie kommen zuerst. Vier Kapitel, die sich in einer
    // Schnallenform unterscheiden, zeigen keine Bandbreite — sie zeigen,
    // dass niemand ausgewählt hat.
    //
    // Die zweite fängt die Express-Fassungen: Sie tragen denselben
    // Beschreibungstext wie ihr Grundmodell, und zwei Kapitel mit demselben
    // Absatz lassen eine Seite kaputt wirken.
    const machartGesehen = new Set()
    const textGesehen = new Set()
    const treffer = []
    for (const s of shoes) {
      const text = String(s.description || '').trim()
      const machart = String(s.category || '').toUpperCase()
      if (!s.image || text.length < 80) continue
      if (textGesehen.has(text) || machartGesehen.has(machart)) continue
      machartGesehen.add(machart)
      textGesehen.add(text)
      treffer.push(s)
      if (treffer.length === 4) break
    }
    return treffer
  }, [shoes])

  /** Der Rest der Auswahl, klein und in einer Reihe. */
  const weitere = useMemo(() => {
    const gezeigt = new Set(kapitel.map(s => s.id))
    return shoes.filter(s => s.image && !gezeigt.has(s.id)).slice(0, 6)
  }, [shoes, kapitel])

  const abPreis = useMemo(() => {
    const preise = shoes.map(s => preisAlsZahl(s.price)).filter(p => p > 0)
    return preise.length ? Math.min(...preise) : null
  }, [shoes])

  /**
   * Die sechs Stationen des Wegs.
   *
   * Reihenfolge und Inhalt folgen dem Konfigurator: erst Leder, dann Farbe,
   * dann die Optionsgruppen, dann die Passform, dann die Kasse (siehe
   * `sichtbareGruppen` in Customize.jsx). Wer hier eine Station erfindet,
   * setzt eine Erwartung, die der Laden nicht einlöst.
   *
   * Die Zahlen kommen aus dem Katalog und nicht aus einer gepflegten Zeile.
   * Solange er lädt, stehen sie noch nicht fest — dann entfällt der Beleg,
   * statt eine 0 zu zeigen.
   */
  const stationen = useMemo(() => {
    const leder = shoeMaterials.filter(m => m.available !== 0 && m.available !== false)
    // Nach Farbwert eindeutig: Der Katalog führt „Schwarz" und „Black", beide
    // auf #000000. Zwei gleiche Punkte nebeneinander sehen nach einem Fehler
    // aus, nicht nach Auswahl.
    const farbtoene = [...new Map(
      shoeColors
        .filter(c => (c.available !== 0 && c.available !== false) && c.hex)
        .map(c => [String(c.hex).toLowerCase(), c.hex]),
    ).values()].slice(0, 16)

    return [
      {
        titel: 'Das Modell',
        text: 'Die Form zuerst, denn sie entscheidet über alles Weitere: Welche Leder, '
            + 'welche Sohlen und welche Details zur Wahl stehen, hängt an der Machart.',
        schlagworte: ['Oxford', 'Derby', 'Monk', 'Loafer', 'Boot', 'Sneaker'],
        hinweis: shoes.length ? `${shoes.length} Modelle im Katalog.` : null,
      },
      {
        titel: 'Das Leder',
        text: 'Kalbsleder, Cordovan, Nubuk, Velours, Lackleder. Es bestimmt, wie das '
            + 'Paar aussieht, wie es altert und was es kostet.',
        hinweis: leder.length
          ? `${leder.length} Leder im Katalog, je nach Modell eine Auswahl daraus.`
          : null,
      },
      {
        titel: 'Die Farbe',
        text: 'Zu jedem Leder die Töne, die es in dieser Gerbung gibt. Dieselbe Farbe '
            + 'fällt auf Velours anders aus als auf Box Calf — deshalb hängt die Auswahl '
            + 'am Leder und nicht am Modell.',
        farben: farbtoene.length ? farbtoene : null,
        hinweis: farbtoene.length ? `${farbtoene.length} Töne, hier ohne Namen.` : null,
      },
      {
        titel: 'Sohle, Rahmen und Details',
        text: 'Ab hier wird es fein. Jeder Schritt zeigt sofort, was er am Preis ändert, '
            + 'und keiner ist vorausgewählt — was dasteht, hast du gewählt.',
        schlagworte: ['Sohlen-Art', 'Rahmen', 'Nahtfarbe', 'Sohlenrand', 'Laufsohle', 'Innenfutter', 'Zehenkappe'],
        hinweis: 'Welche Schritte erscheinen, hängt vom Modell ab.',
      },
      {
        titel: 'Deine Maße',
        text: 'Fußlänge und Ballenumfang, mehr nicht. Daraus bestimmen wir Leisten, '
            + 'Größe und Weite. Eine Größentabelle brauchst du nicht, weil wir nicht raten.',
        hinweis: '±0,5 cm genügen. Ein Schnürsenkel und ein Lineal reichen zum Messen.',
      },
      {
        titel: 'Prüfen und bestellen',
        text: 'Vor dem Abschluss steht deine vollständige Zusammenstellung noch einmal da, '
            + 'jede Farbe, jede Option, jedes Zubehör. Erst dieser Klick ist verbindlich.',
        hinweis: 'Bis hierher kostet nichts und verpflichtet nichts.',
      },
    ]
  }, [shoes.length, shoeMaterials, shoeColors])

  const zurKollektion = () => navigate('/collection')

  return (
    <div className="min-h-full bg-white">

      {/* ══ 1 · Erster Blick ══════════════════════════════════════════════
          Bildschirmfüllend, ein Bild, ein Satz, zwei Wege. Die Überschrift
          nennt das Produkt und nicht die Marke: Der Name steht ohnehin in
          der Leiste, und wer ihn nicht kennt, sucht auch nicht danach. */}
      <header className="relative min-h-[82vh] flex items-end overflow-hidden bg-[#111]">
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={SHOES.hero}
            alt=""
            aria-hidden="true"
            className="bild-heran w-full h-full object-cover opacity-[0.55]"
          />
        </div>
        {/* Der Verlauf trägt die Schrift. Ohne ihn hinge die Lesbarkeit am
            Motiv, und ein ausgetauschtes Bild machte die Seite unlesbar. */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.15) 100%)' }}
        />

        <div className="relative w-full px-5 lg:px-16 pb-14 lg:pb-20">
          <Enthuellen>
            <Kapitelmarke hell>Custom Made · Made in Spain</Kapitelmarke>
          </Enthuellen>

          <Enthuellen verzoegerung={120}>
            <h1 className="text-[34px] lg:text-[64px] font-extralight text-white leading-[1.02] tracking-tight mt-4 max-w-3xl">
              Ein Paar, das es<br />vorher nicht gab.
            </h1>
          </Enthuellen>

          <Enthuellen verzoegerung={220}>
            <p className="text-[14px] lg:text-[17px] text-white/70 font-light leading-relaxed mt-6 max-w-lg">
              Rahmengenäht, nach deinen Maßen gebaut, einzeln gefertigt in einer
              spanischen Manufaktur.
              {abPreis ? <> Ab <span className="text-white">€&nbsp;{preisAlsText(abPreis)}</span>.</> : null}
            </p>
          </Enthuellen>

          <Enthuellen verzoegerung={320}>
            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 mt-8 max-w-md sm:max-w-none">
              <button
                type="button"
                onClick={zurKollektion}
                className="w-full sm:w-auto bg-white text-black border-0 px-9 h-12 text-[11px] uppercase flex items-center justify-center gap-2 whitespace-nowrap hover:bg-white/85 transition-colors"
                style={{ letterSpacing: '0.18em' }}
              >
                Modelle ansehen
                <ArrowRight size={15} strokeWidth={1.5} />
              </button>
              <button
                type="button"
                onClick={() => navigate('/scan')}
                className="w-full sm:w-auto bg-transparent border border-white/30 text-white/85 px-9 h-12 text-[11px] uppercase flex items-center justify-center gap-2 whitespace-nowrap hover:border-white/70 hover:text-white transition-colors"
                style={{ letterSpacing: '0.18em' }}
              >
                <Footprints size={15} strokeWidth={1.5} />
                Passform bestimmen
              </button>
            </div>
          </Enthuellen>
        </div>

        {/* Der Hinweis, dass es weitergeht. Auf dem Telefon steht er im Weg
            und entfällt dort. */}
        <div className="hidden lg:block absolute right-16 bottom-20 w-px h-14 bg-white/25 overflow-hidden">
          <div className="strich-wandert w-px h-full bg-white/80" />
        </div>
      </header>

      {/* ══ 2 · Drei Zahlen ═══════════════════════════════════════════════
          Der Preis steht oben. Hier steht, woran er hängt — bevor jemand
          weiterscrollt und die Frage mitnimmt. */}
      <section className="px-5 lg:px-16 py-14 lg:py-24 border-b border-black/[0.07]">
        <div className="grid sm:grid-cols-3 gap-10 lg:gap-16 max-w-5xl mx-auto">
          {ZAHLEN.map((z, i) => (
            <Enthuellen key={z.einheit} verzoegerung={i * 90}>
              <z.icon size={18} strokeWidth={1.3} className="text-black/35" />
              <p className="text-[34px] lg:text-[44px] font-extralight leading-none tracking-tight mt-4">
                {z.zahl}
              </p>
              <p className="text-[10px] uppercase tracking-[0.24em] text-black/40 mt-2">{z.einheit}</p>
              <p className="text-[12px] lg:text-[13px] text-black/50 font-light leading-relaxed mt-4 max-w-xs">
                {z.text}
              </p>
            </Enthuellen>
          ))}
        </div>
      </section>

      {/* ══ 3 · Die Modelle ═══════════════════════════════════════════════
          Der Abschnitt, an dem sich entscheidet, ob die Seite ein Katalog ist
          oder ein Heft.

          Drei Regeln, abgeschaut bei Häusern, die davon leben:

          LUFT IST DER STOFF. Eine Fläche wirkt nicht teuer, weil viel darauf
          steht, sondern weil wenig darauf steht und das wenige Platz hat.
          Jedes Kapitel füllt deshalb fast einen Bildschirm, und die Textspalte
          ist schmaler als der Platz, den sie hätte — kurze Zeilen lesen sich
          ruhiger, und der Rand ist kein verschenkter Raum, sondern der
          eigentliche Eindruck.

          EIN GEDANKE JE FLÄCHE. In der ersten Fassung standen sieben Dinge
          untereinander: Marke, Überschrift, Name, Geschichte, Anlass,
          Alterung, Angaben, Knopf. Das ist eine Produktseite. Der Gedanke zur
          Alterung steht jetzt für sich, mittig, in einem eigenen ruhigen Band
          unter dem Kapitel — er ist der stärkste Satz, den ein Schuh hat, und
          im Stapel ging er unter.

          DIE PAUSE GEHÖRT DAZU. Zwischen Kapiteln und Auswahl liegt eine
          Fläche ohne Produkt, ohne Preis, ohne Knopf. */}
      <section>
        {/* Der Einstieg: mittig, viel Luft, ein Gedanke. Er stand links mit
            Vorspann daneben — das liest sich wie ein Artikel, nicht wie der
            Beginn eines Kapitels. */}
        <div className="px-5 lg:px-16 pt-20 pb-16 lg:pt-36 lg:pb-28 text-center">
          <Enthuellen>
            <Kapitelmarke>Die Modelle</Kapitelmarke>
            <h2 className="text-[28px] lg:text-[46px] font-extralight leading-[1.12] tracking-tight mt-5 max-w-3xl mx-auto">
              Jede Form hat einen Grund. Meist einen älteren als wir.
            </h2>
          </Enthuellen>
          <Enthuellen verzoegerung={140}>
            <p className="text-[13px] lg:text-[15px] text-black/45 font-light leading-[2] mt-8 max-w-xl mx-auto">
              Keine dieser Formen ist als Entwurf entstanden. Jede kommt aus einer
              Notwendigkeit — die geschlossene Schnürung für die Strenge der Etikette,
              die offene für den kräftigen Spann, der Riemen für den Steigbügel.
            </p>
          </Enthuellen>
        </div>

        {katalogStatus === 'loading' && !kapitel.length ? (
          <p className="px-5 lg:px-16 py-24 text-center text-[12px] text-black/30 font-light">
            Modelle werden geladen …
          </p>
        ) : katalogStatus === 'error' && !kapitel.length ? (
          <div className="px-5 lg:px-16 py-20 text-center">
            <p className="text-[12px] text-black/45 font-light">Die Modelle lassen sich gerade nicht laden.</p>
            <button
              type="button"
              onClick={() => initStore?.()}
              className="mt-4 bg-transparent border border-black/15 text-black/70 px-6 h-10 text-[11px] uppercase hover:border-black/40 hover:text-black transition-colors"
              style={{ letterSpacing: '0.16em' }}
            >
              Noch einmal versuchen
            </button>
          </div>
        ) : (
          <div>
            {kapitel.map((schuh, i) => {
              const bildLinks = i % 2 === 0
              const grund = i % 2 === 1 ? 'bg-[#F5F3F0]' : 'bg-white'
              const nummer = String(i + 1).padStart(2, '0')
              const erz = erzaehlungZu(schuh.category)
              const oeffnen = () => navigate(shoePath(schuh))

              return (
                <div key={schuh.id} className={grund}>
                  <article
                    className={`lg:flex lg:items-stretch lg:min-h-[86vh] ${
                      bildLinks ? '' : 'lg:flex-row-reverse'
                    }`}
                  >
                    {/* ── Die Aufnahme ──────────────────────────────────── */}
                    <Enthuellen
                      richtung={bildLinks ? 'links' : 'rechts'}
                      className="lg:w-[56%] relative"
                    >
                      <button
                        type="button"
                        onClick={oeffnen}
                        className="group block w-full h-full bg-transparent border-0 p-0 text-left"
                        aria-label={`${schuh.name} ansehen und konfigurieren`}
                      >
                        <div className="relative aspect-[4/3] lg:aspect-auto lg:h-full overflow-hidden bg-[#EDEAE3]">
                          <img
                            src={resolveMediaUrl(schuh.image)}
                            alt={`${schuh.name}, nach Maß gefertigt`}
                            loading="lazy"
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1600ms] ease-out group-hover:scale-[1.04]"
                          />
                          {schuh.tag && (
                            <span
                              className="absolute top-6 right-6 lg:top-10 lg:right-10 text-[9px] uppercase text-black bg-white/90 px-3 py-1.5"
                              style={{ letterSpacing: '0.22em' }}
                            >
                              {schuh.tag}
                            </span>
                          )}
                        </div>
                      </button>
                    </Enthuellen>

                    {/* ── Das Kapitel ───────────────────────────────────────
                        Schmaler als die Spalte, die zur Verfügung stünde: Eine
                        Zeile von 45 Zeichen liest sich ruhig, eine von 75
                        hastig — und der Rand daneben ist der Eindruck. */}
                    <Enthuellen
                      verzoegerung={160}
                      className="lg:w-[44%] flex items-center px-5 lg:px-16 xl:px-24 py-16 lg:py-32"
                    >
                      <div className="w-full max-w-[26rem]">
                        <Kapitelmarke>
                          {`${nummer} — ${String(schuh.category || 'Custom Made').replace(/_/g, ' ')}`}
                        </Kapitelmarke>

                        <h3 className="text-[29px] lg:text-[40px] font-extralight leading-[1.14] tracking-tight mt-6">
                          {erz.titel}
                        </h3>

                        <p className="text-[13px] lg:text-[14px] text-black/50 font-light leading-[2] mt-8">
                          {schuh.description}
                        </p>

                        <p className="text-[15px] lg:text-[17px] text-black/80 font-light leading-[1.65] mt-10">
                          {erz.wofuer}
                        </p>

                        {/* Name, Angaben und Weg — eine Fußzeile, kein Block.
                            Der Name steht hier und nicht oben: Wer bis hierher
                            gelesen hat, will wissen, wie das Ding heißt; wer
                            oben ankommt, noch nicht. */}
                        <div className="mt-12 pt-6 border-t border-black/[0.09]">
                          <p className="text-[11px] uppercase tracking-[0.24em] text-black/50">
                            {schuh.name}
                          </p>
                          <p className="text-[11px] text-black/35 font-light mt-2">
                            {[
                              schuh.material,
                              Number(schuh.express) === 1
                                ? `rund ${schuh.express_weeks || 2} Wochen`
                                : 'vier bis sechs Wochen',
                              schuh.price ? `ab ${schuh.price}` : null,
                            ].filter(Boolean).join('   ·   ')}
                          </p>

                          {/* Ein Wortlink statt eines schwarzen Blocks. Ein
                              gefüllter Knopf in jedem Kapitel macht aus der
                              Reihe einen Verkaufsprospekt; der Strich, der
                              beim Überfahren aufzieht, tut dasselbe leiser. */}
                          <button
                            type="button"
                            onClick={oeffnen}
                            className="group mt-7 bg-transparent border-0 p-0 inline-flex items-center gap-3 text-[11px] uppercase text-black hover:text-black/60 transition-colors"
                            style={{ letterSpacing: '0.22em' }}
                          >
                            <span className="relative pb-1">
                              Konfigurieren
                              <span className="absolute left-0 bottom-0 h-px w-full bg-black/25 group-hover:bg-black/50 transition-colors" />
                            </span>
                            <ArrowRight
                              size={14}
                              strokeWidth={1.5}
                              className="transition-transform duration-500 group-hover:translate-x-1.5"
                            />
                          </button>
                        </div>
                      </div>
                    </Enthuellen>
                  </article>

                  {/* ── Der Nachsatz ────────────────────────────────────────
                      Was nach Jahren aus dem Paar wird — mittig, allein, mit
                      Luft. Im Stapel der Textspalte war er die sechste Zeile
                      von acht und ging unter; hier ist er das Letzte, was von
                      diesem Modell bleibt. */}
                  <Enthuellen richtung="ruhig">
                    {/* Kein negativer Abstand nach oben: Die Bildspalte
                        reicht bis zur Unterkante des Kapitels, und ein
                        Hochziehen schob den Satz über das Foto. */}
                    <div className="px-5 lg:px-16 pt-14 pb-20 lg:pt-20 lg:pb-32">
                      <p className="text-[15px] lg:text-[19px] text-black/55 font-extralight leading-[1.75] text-center max-w-2xl mx-auto">
                        {erz.zeit}
                      </p>
                    </div>
                  </Enthuellen>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Die Pause ───────────────────────────────────────────────────
            Eine Fläche ohne Produkt, ohne Preis, ohne Knopf. Vier Kapitel in
            gleichem Aufbau lesen sich wie ein Katalog, auch wenn jedes für
            sich trägt — hier hält die Seite an, bevor die Auswahl kommt. */}
        <Enthuellen richtung="ruhig">
          <section className="relative overflow-hidden bg-[#111] min-h-[62vh] lg:min-h-[72vh] flex items-center">
            <img
              src={CRAFT.hands}
              alt=""
              aria-hidden="true"
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover opacity-[0.34]"
            />
            <div className="relative px-5 lg:px-16 py-20 max-w-3xl mx-auto text-center">
              <p className="text-[21px] lg:text-[34px] font-extralight leading-[1.4] tracking-tight text-white">
                Ein Schuh wird nicht gekauft und dann getragen.
                Er wird getragen und dabei fertig.
              </p>
            </div>
          </section>
        </Enthuellen>

        {/* ── Und außerdem ───────────────────────────────────────────────
            Die restliche Auswahl. Sie darf klein sein — wer bis hierher
            gelesen hat, sucht keine vier weiteren Kapitel, sondern will
            sehen, was es sonst gibt.

            Vier statt sechs Kacheln, dafür größer und mit Abstand
            dazwischen: Ein Raster ohne Fugen ist ein Regal. Die Überschrift
            steht mittig darüber, wie an jeder anderen Stelle dieser Seite —
            links mit einem Verweis rechts daneben war die einzige Zeile der
            Seite, die nach Verwaltung aussah. */}
        {weitere.length > 0 && (
          <div className="px-5 lg:px-16 py-20 lg:py-32">
            <Enthuellen>
              <div className="text-center">
                <Kapitelmarke>Und außerdem</Kapitelmarke>
              </div>
            </Enthuellen>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-10 mt-10 lg:mt-14">
              {weitere.slice(0, 4).map((schuh, i) => (
                <Enthuellen key={schuh.id} verzoegerung={Math.min(i, 3) * 80}>
                  <button
                    type="button"
                    onClick={() => navigate(shoePath(schuh))}
                    className="group block w-full bg-transparent border-0 p-0 text-left"
                  >
                    <div className="aspect-[4/5] overflow-hidden bg-[#EDEAE3]">
                      <img
                        src={resolveMediaUrl(schuh.image)}
                        alt={`${schuh.name}, nach Maß gefertigt`}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
                      />
                    </div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-black/60 mt-5 line-clamp-2 min-h-[2.8em]">
                      {schuh.name}
                    </p>
                    <p className="text-[12px] text-black/40 font-light mt-1.5">
                      {schuh.price ? `ab ${schuh.price}` : 'auf Anfrage'}
                    </p>
                  </button>
                </Enthuellen>
              ))}
            </div>

            <Enthuellen verzoegerung={120}>
              <div className="text-center mt-14 lg:mt-20">
                <button
                  type="button"
                  onClick={zurKollektion}
                  className="group bg-transparent border-0 p-0 inline-flex items-center gap-3 text-[11px] uppercase text-black hover:text-black/60 transition-colors"
                  style={{ letterSpacing: '0.22em' }}
                >
                  <span className="relative pb-1">
                    {shoes.length ? `Alle ${shoes.length} Modelle` : 'Alle Modelle'}
                    <span className="absolute left-0 bottom-0 h-px w-full bg-black/25 group-hover:bg-black/50 transition-colors" />
                  </span>
                  <ArrowRight size={14} strokeWidth={1.5} className="transition-transform duration-500 group-hover:translate-x-1.5" />
                </button>
              </div>
              <PreisFuss className="mt-10 text-center" />
            </Enthuellen>
          </div>
        )}
      </section>

      {/* ══ 4 · Das Handwerk ══════════════════════════════════════════════
          Der Abschnitt, der den Preis trägt. „Rahmengenäht statt geklebt"
          ist der entscheidende Satz und zugleich der unanschaulichste — was
          ein Rahmen ist, sieht man am fertigen Schuh nicht. Deshalb der
          Schnitt. */}
      <section className="bg-[#111] text-white px-5 lg:px-16 py-16 lg:py-28">
        <div className="max-w-5xl mx-auto">
          <Enthuellen>
            <Kapitelmarke hell>Das Handwerk</Kapitelmarke>
            <h2 className="text-[26px] lg:text-[40px] font-extralight leading-[1.1] tracking-tight mt-3 max-w-2xl">
              Die Sohle hängt an einer Naht,<br className="hidden sm:block" /> nicht an einem Klebstoff.
            </h2>
          </Enthuellen>

          <Enthuellen verzoegerung={150}>
            <div className="mt-12 lg:mt-16 text-white">
              <RahmenSchnitt className="max-w-2xl mx-auto" />
            </div>
          </Enthuellen>

          <div className="grid sm:grid-cols-2 gap-x-14 gap-y-8 mt-12 lg:mt-16 max-w-3xl">
            <Enthuellen verzoegerung={80}>
              <p className="text-[13px] lg:text-[14px] text-white/60 font-light leading-[1.85]">
                Der Schaft wird über den Leisten gezogen und nach innen gezwickt. Eine
                aufgestellte Rippe auf der Brandsohle nimmt die Einstechnaht auf — sie
                fasst Schaft, Futter und den Rahmen, jenen schmalen Lederstreifen, der
                rundherum seitlich heraussteht.
              </p>
            </Enthuellen>
            <Enthuellen verzoegerung={160}>
              <p className="text-[13px] lg:text-[14px] text-white/60 font-light leading-[1.85]">
                Durch den Rahmen läuft die zweite Naht in die Laufsohle. Sie lässt sich
                auftrennen, ohne den Schaft zu berühren. Genau daran hängt der
                Unterschied: Ein geklebter Schuh ist am Ende seiner Sohle am Ende,
                dieser bekommt eine neue und läuft weiter.
              </p>
            </Enthuellen>
          </div>

          <Enthuellen verzoegerung={220}>
            <p className="text-[12px] text-white/35 font-light leading-relaxed mt-10 max-w-2xl">
              Zwischen Brand- und Laufsohle liegt Kork. Er gibt unter dem Gewicht nach
              und nimmt nach einigen Wochen die Form des Fußes an — der Grund, warum ein
              rahmengenähter Schuh mit der Zeit bequemer wird statt ausgelatschter.
            </p>
          </Enthuellen>
        </div>
      </section>

      {/* ══ 5 · Das Leder ═════════════════════════════════════════════════ */}
      <section className="px-5 lg:px-16 py-16 lg:py-28">
        <div className="max-w-5xl mx-auto">
          <Enthuellen>
            <Kapitelmarke>Das Leder</Kapitelmarke>
            <h2 className="text-[26px] lg:text-[40px] font-extralight leading-[1.1] tracking-tight mt-3 max-w-2xl">
              Die Haut entscheidet, wie das Paar altert.
            </h2>
          </Enthuellen>

          <div className="grid sm:grid-cols-3 gap-8 lg:gap-12 mt-12 lg:mt-16">
            {LEDER.map((l, i) => (
              <Enthuellen key={l.name} verzoegerung={i * 90}>
                <div className="aspect-[4/3] overflow-hidden bg-[#EDEAE3]">
                  <img src={l.bild} alt="" aria-hidden="true" loading="lazy" className="w-full h-full object-cover" />
                </div>
                <p className="text-[13px] lg:text-[14px] text-black font-normal mt-5">{l.name}</p>
                <p className="text-[12px] lg:text-[13px] text-black/50 font-light leading-[1.8] mt-2">
                  {l.text}
                </p>
              </Enthuellen>
            ))}
          </div>

          <Enthuellen verzoegerung={140}>
            <p className="text-[12px] text-black/40 font-light mt-10">
              Welche Leder und Farben an welchem Modell zur Wahl stehen, zeigt der
              Konfigurator — die Auswahl unterscheidet sich je nach Machart.
            </p>
          </Enthuellen>
        </div>
      </section>

      {/* ══ 6 · In eigener Sache ══════════════════════════════════════════
          Der Abschnitt, der diese Fassung von jeder anderen trennt. Die
          Offenheit über die Machart war bisher eine Selbstauskunft im
          Kleingedruckten; hier ist sie das Verkaufsargument. Wer „handmade"
          liest und später erfährt, dass Maschinen im Spiel waren, zieht den
          Rest der Zusagen in Zweifel — auch die, die stimmen. */}
      <section className="bg-[#fafaf9] border-y border-black/[0.06] px-5 lg:px-16 py-16 lg:py-28">
        <div className="max-w-2xl mx-auto">
          <Enthuellen>
            <Kapitelmarke>In eigener Sache</Kapitelmarke>
            <h2 className="text-[22px] lg:text-[32px] font-extralight leading-[1.15] tracking-tight mt-3">
              Was wir nicht behaupten
            </h2>
          </Enthuellen>

          <Enthuellen verzoegerung={100}>
            <p className="text-[14px] lg:text-[16px] text-black/60 font-light leading-[1.9] mt-7">
              Wir schreiben nicht „handgefertigt". Der Rahmen wird maschinell genäht, wie
              in fast jeder Manufaktur, die in dieser Preisklasse arbeitet. Von Hand
              kommen Zuschnitt, Zwicken, Finish und die Endkontrolle — über zweihundert
              Arbeitsschritte, von denen wir keinen erfunden haben.
            </p>
          </Enthuellen>

          <Enthuellen verzoegerung={180}>
            <p className="text-[14px] lg:text-[16px] text-black/60 font-light leading-[1.9] mt-5">
              Wir sagen es, weil der Unterschied zwischen einem rahmengenähten und einem
              geklebten Schuh groß genug ist. Er braucht kein Wort, das ihn größer macht.
            </p>
          </Enthuellen>

          <Enthuellen verzoegerung={240}>
            <p className="text-[12px] text-black/35 font-light leading-relaxed mt-8 pt-6 border-t border-black/[0.08]">
              Dasselbe gilt für alles andere auf dieser Seite: Wo eine Zahl steht, ist
              sie nachgehalten. Wo keine steht, haben wir keine.
            </p>
          </Enthuellen>
        </div>
      </section>

      {/* ══ 7 · Der Weg ═══════════════════════════════════════════════════
          Die Frage, die nach allem Vorherigen noch offen ist: „Und wie läuft
          das jetzt ab?" Sie stand bisher als vierstufige Aufzählung da —
          dieselbe Darstellung wie unter der Kollektion und im Firmenbereich,
          und für diese Seite zu wenig.

          Denn hier ist der Weg nicht eine Nebenauskunft, sondern die
          Handlung: Wer 1.300 Euro ausgibt, will vorher wissen, wie viele
          Entscheidungen auf ihn zukommen und an welcher Stelle es
          verbindlich wird. Deshalb eine eigene Darstellung — eine
          durchgehende Linie mit sechs Stationen und einem Ziel. Die
          gemeinsame Ablauf-Darstellung bleibt, wo sie hingehört: an den
          drei anderen Stellen, wo derselbe Vorgang nur erklärt und nicht
          erzählt wird.

          Die Stationen sind die echten Schritte des Konfigurators, in
          seiner Reihenfolge: erst Leder, dann Farbe, dann die Optionsgruppen
          (siehe sichtbareGruppen in Customize.jsx), dann die Passform, dann
          die Kasse. Die Zahlen darin kommen aus dem Katalog und nicht aus
          einer gepflegten Zeile — ein Leder mehr im CMS, und hier steht es. */}
      <section className="px-5 lg:px-16 py-16 lg:py-28">
        <div className="max-w-3xl mx-auto">
          <Enthuellen>
            <Kapitelmarke>Der Weg</Kapitelmarke>
            <h2 className="text-[26px] lg:text-[40px] font-extralight leading-[1.1] tracking-tight mt-3">
              Sechs Entscheidungen,<br className="hidden sm:block" /> dann gehört er dir.
            </h2>
          </Enthuellen>
          <Enthuellen verzoegerung={120}>
            <p className="text-[13px] lg:text-[15px] text-black/50 font-light leading-[1.9] mt-6">
              Keine davon musst du auf einmal treffen. Der Konfigurator merkt sich
              jeden Stand, und verbindlich wird nichts davon bis zur letzten Station.
            </p>
          </Enthuellen>

          <ol className="mt-12 lg:mt-16">
            {stationen.map((st, i) => (
              <Enthuellen key={st.titel} verzoegerung={Math.min(i, 5) * 70}>
                <li className="relative flex gap-5 lg:gap-8 pb-10 lg:pb-12">
                  {/* Die Linie zwischen den Stationen.
                      Sie hängt am <li> und nicht an der Marke: Die Marke ist
                      36 Pixel hoch, und eine Linie, die sich daran ausrichtet,
                      hört 36 Pixel weiter unten auf — sie endete im Leeren,
                      statt die nächste Station zu erreichen. 18 Pixel ist die
                      Mitte der Marke, die als erstes Kind am linken Rand
                      steht. */}
                  <span
                    className="absolute left-[18px] top-9 bottom-0 w-px bg-black/[0.12]"
                    aria-hidden="true"
                  />
                  <div className="relative shrink-0">
                    <span className="relative z-10 flex items-center justify-center w-9 h-9 rounded-full border border-black/15 bg-white text-[10px] text-black/55"
                          style={{ letterSpacing: '0.12em' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>

                  <div className="pt-1 min-w-0">
                    <p className="text-[15px] lg:text-[17px] text-black font-light leading-snug">{st.titel}</p>
                    <p className="text-[12px] lg:text-[13px] text-black/50 font-light leading-[1.8] mt-2">
                      {st.text}
                    </p>

                    {/* Der Beleg zur Station: echte Farbtöne aus dem Katalog,
                        die Namen der Optionsgruppen, eine Zahl. Eine
                        Aufzählung ohne Beleg ist eine Behauptung. */}
                    {st.farben && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-4">
                        {st.farben.map(hex => (
                          <span
                            key={hex}
                            className="inline-block w-5 h-5 rounded-full border border-black/10"
                            style={{ background: hex }}
                            aria-hidden="true"
                          />
                        ))}
                      </div>
                    )}
                    {st.schlagworte && (
                      <div className="flex flex-wrap gap-1.5 mt-4">
                        {st.schlagworte.map(w => (
                          <span
                            key={w}
                            className="text-[10px] uppercase tracking-[0.14em] text-black/45 border border-black/[0.12] px-2.5 py-1"
                          >
                            {w}
                          </span>
                        ))}
                      </div>
                    )}
                    {st.hinweis && (
                      <p className="text-[11px] text-black/35 font-light mt-3">{st.hinweis}</p>
                    )}
                  </div>
                </li>
              </Enthuellen>
            ))}

            {/* ── Das Ziel ──────────────────────────────────────────────
                Gefüllte Marke statt Umriss, und keine Linie darunter: Hier
                endet der Weg, und das soll man sehen, ohne es zu lesen. */}
            <Enthuellen verzoegerung={140}>
              <li className="relative flex gap-5 lg:gap-8">
                <span className="shrink-0 relative z-10 flex items-center justify-center w-9 h-9 rounded-full bg-black text-white" aria-hidden="true">
                  <Check size={15} strokeWidth={1.8} />
                </span>
                <div className="pt-1">
                  <p className="text-[17px] lg:text-[20px] text-black font-light leading-snug">Dein Paar</p>
                  <p className="text-[12px] lg:text-[13px] text-black/50 font-light leading-[1.8] mt-2">
                    Vier bis sechs Wochen nach Zahlungseingang, einzeln gefertigt in
                    einer spanischen Manufaktur. Du bekommst Nachricht, wenn die
                    Fertigung beginnt, wenn dein Paar in die Endkontrolle geht und
                    wenn es das Haus verlässt. Der Versand innerhalb Deutschlands ist
                    inbegriffen.
                  </p>
                  <p className="text-[11px] text-black/35 font-light leading-relaxed mt-4 max-w-lg">
                    Ein Schuh für einen bestimmten Fuß lässt sich nicht zurückgeben.
                    Ist etwas mangelhaft, fertigen wir das Paar neu, ohne Kosten für
                    dich. Die Einzelheiten stehen in den AGB.
                  </p>
                </div>
              </li>
            </Enthuellen>
          </ol>
        </div>
      </section>

      {/* ══ 8 · Der Anfang ════════════════════════════════════════════════
          Ein Weg, nicht drei. Wer bis hierher gelesen hat, sucht keine
          Auswahl mehr, sondern die Stelle, an der es losgeht. */}
      <section className="relative overflow-hidden bg-[#111]">
        <img
          src={LIFESTYLE.walking}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover opacity-[0.32]"
        />
        <div className="relative px-5 lg:px-16 py-20 lg:py-32 text-center">
          <Enthuellen>
            <h2 className="text-[26px] lg:text-[42px] font-extralight leading-[1.1] tracking-tight text-white max-w-2xl mx-auto">
              Sechs Entscheidungen.<br className="hidden sm:block" /> Fang mit der ersten an.
            </h2>
          </Enthuellen>
          <Enthuellen verzoegerung={120}>
            <p className="text-[13px] lg:text-[14px] text-white/55 font-light mt-5 max-w-md mx-auto leading-relaxed">
              Die Form zuerst — alles andere baut darauf auf. Konfigurieren kostet
              nichts und verpflichtet zu nichts.
            </p>
          </Enthuellen>
          <Enthuellen verzoegerung={200}>
            <button
              type="button"
              onClick={zurKollektion}
              className="mt-9 bg-white text-black border-0 px-12 h-12 text-[11px] uppercase inline-flex items-center justify-center gap-2 hover:bg-white/85 transition-colors"
              style={{ letterSpacing: '0.18em' }}
            >
              Schuh konfigurieren
              <ArrowRight size={15} strokeWidth={1.5} />
            </button>
          </Enthuellen>
        </div>
      </section>
    </div>
  )
}
