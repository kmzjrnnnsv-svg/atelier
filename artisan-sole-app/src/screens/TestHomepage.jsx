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
 *   3  Das Handwerk    Warum hält das länger als Geklebtes?
 *   4  Die Modelle     Wofür ist es gemacht, und was wird daraus?
 *   5  Das Leder       Woraus besteht es?
 *   6  Der Weg         Wie viele Entscheidungen kommen auf mich zu?
 *   7  In eigener Sache Was behaupten wir NICHT?
 *   8  Der Anfang      Wo fange ich an?
 *
 * Am Ende ist keine Frage offen, die vor dem Kauf zählt. Das ist gemeint,
 * wenn hier von einer geschlossenen Geschichte die Rede ist.
 *
 * ── Warum diese Reihenfolge und nicht die erste ───────────────────────────
 *
 * Die erste Fassung stellte die Modelle an dritte Stelle und das Handwerk an
 * vierte. Damit stand der Beweis hinter der Auswahl: Man las vier lange
 * Kapitel über Schuhe, bevor irgendetwas erklärte, warum diese Schuhe das
 * Geld wert sind. Wer an dieser Stelle absprang — und an dieser Stelle
 * springen die meisten ab —, nahm von der Seite nichts mit als vier
 * Stimmungsbilder.
 *
 * Jetzt kommt der Schnitt, der sich beim Scrollen zusammensetzt, direkt nach
 * den drei Zahlen. Er ist der stärkste Abschnitt der Seite und er kostet
 * keinen Absatz Lesen: Man sieht in zwanzig Sekunden, dass hier etwas anderes
 * gebaut wird. Danach tragen die Modelle mehr, weil man weiß, was in ihnen
 * steckt.
 *
 * Und „In eigener Sache" steht jetzt unmittelbar vor dem Knopf statt in der
 * Mitte. Was jemand zuletzt liest, bevor er sich entscheidet, sollte das
 * sein, was ihm zeigt, dass hier niemand zu viel verspricht.
 *
 * ── Zum Ton ───────────────────────────────────────────────────────────────
 *
 * Eine Regel, und sie ist wichtiger als sie klingt: KEINE ZANGENSÄTZE.
 *
 * Gemeint ist die Bauform „X ist nicht A. Es ist B." — „Leder ist kein
 * Material. Es ist eine Schichtung.", „Das ist kein Verschleiß. Das ist die
 * Form.", „Bequem ist kein Gegenteil von gut gemacht." Sie klingt beim
 * Schreiben klug und liest sich beim Lesen wie eine Maschine: Der Satz nimmt
 * erst etwas weg, um es dann zurückzugeben, und der Leser muss beide Hälften
 * zusammenrechnen, um bei dem anzukommen, was gemeint war. Einmal ist das
 * eine Pointe. Neunmal auf einer Seite ist es ein Tic.
 *
 * Stattdessen: Sagen, was ist. „Das Beste an einer Haut liegt ganz oben."
 * „Zwei Nähte halten diesen Schuh zusammen." „Gehalten wird er allein von
 * seiner Form."
 *
 * Die Stimme ist die eines guten Herrenausstatters: Er redet mit dir und
 * nicht über die Ware, er sagt dir eine Sache, die du noch nicht wusstest,
 * als Höflichkeit und nicht als Belehrung, und er wird nie laut. Was er
 * verkauft, verkauft sich über das, was es kann — deshalb kann er es ruhig
 * aussprechen.
 *
 * Daraus folgt auch: „dein Paar" statt „das Paar", wo es passt. Ein Schuh,
 * der jemandem gehört, liest sich anders als einer, der beschrieben wird.
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
import { ArrowRight, Footprints, Check } from 'lucide-react'
import useStore from '../store/store'
import { useSeo } from '../lib/seo'
import { shoePath } from '../lib/shoePath'
import { PreisFuss } from '../lib/preisangabe'
import { preisAlsZahl, preisAlsText } from '../lib/preis'
import { resolveMediaUrl } from '../lib/mediaUrl'
import { SHOES, CRAFT, LIFESTYLE } from '../lib/editorialImages'
import Enthuellen from '../components/Enthuellen'
import { Tafelflaeche, Schiebehinweis } from '../components/Zeichnung'
import SchuhAufbau from '../components/SchuhAufbau'
import LederSchnitt from '../components/LederSchnitt'
import FussMass from '../components/FussMass'

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
/**
 * Die Faktenzeile unter der Überschrift.
 *
 * Keine Werbeworte, keine Sätze — fünf Angaben, von denen jede anderswo auf
 * dieser Seite belegt wird. „Neu besohlbar" ist nicht Behauptung, sondern die
 * Folge der Machart und im Handwerk-Abschnitt gezeigt; „Made in Spain" ist
 * die einzige Ortsangabe, die dieses Haus über sich macht, und sie steht so
 * schon im Untertitel.
 */
const FAKTEN = [
  'Rahmengenäht',
  'Nach Maß gebaut',
  'Made in Spain',
  '4–6 Wochen',
  'Neu besohlbar',
]

const ZAHLEN = [
  { zahl: '2',    einheit: 'Maße',            text: 'Fußlänge und Ballenumfang. Daraus bauen wir Leisten, Größe und Weite für genau deinen Fuß.' },
  { zahl: '200+', einheit: 'Arbeitsschritte', text: 'Vom Zuschnitt bis zur Endkontrolle. An einem einzelnen Paar.' },
  { zahl: '4–6',  einheit: 'Wochen',          text: 'So lange dauert ein Paar, das es vorher nicht gab. Wir fangen an, wenn du bestellst.' },
]

/**
 * Die Leder. Sachwissen über Häute, nicht über dieses Haus.
 *
 * ── Warum hier keine Fotos mehr stehen ────────────────────────────────────
 *
 * Neben jedem dieser Absätze stand eine Aufnahme einer Lederoberfläche. Drei
 * Fotos, die alle aussahen wie Leder, und von denen eines — eine Naht in
 * Nahaufnahme — gar kein Nubuk zeigte, sondern eine Naht. Ein Foto einer
 * Oberfläche zeigt eine Struktur und sonst nichts; wer den Unterschied
 * zwischen Kalbsleder und Cordovan nicht kennt, kennt ihn danach immer noch
 * nicht.
 *
 * Was ihn erklärt, ist die Herkunft: aus welcher Schicht, von welchem Tier,
 * wie lange gegerbt. Das steht im Text, und die Zeichnung darüber zeigt den
 * Teil davon, der jeden Preis dieser Seite mitbestimmt.
 *
 * Die Auswahl im Konfigurator ist größer und ändert sich; hier stehen die
 * drei, an denen sich der Unterschied erklären lässt.
 */
const LEDER = [
  {
    name: 'Vollnarbiges Kalbsleder',
    herkunft: 'Äußerste Schicht, ungeschliffen',
    text: 'Die dichteste Lage der Haut, mit ihrer gewachsenen Narbung. Sie nimmt mit '
        + 'den Jahren die Bewegung deines Fußes an und bekommt dabei eine Patina, für '
        + 'die es keine Abkürzung gibt.',
  },
  {
    name: 'Shell Cordovan',
    herkunft: 'Pferdehaut, Monate in der Gerbung',
    text: 'Aus einer besonders dichten Lage unter der Haut der Kruppe. Es legt sich in '
        + 'weiche, runde Wellen und gewinnt beim Tragen an Tiefe. Die Gerbdauer '
        + 'erklärt den Aufpreis.',
  },
  {
    name: 'Nubuk und Velours',
    herkunft: 'Angeschliffen, kurzer matter Flor',
    text: 'Die gebürstete Oberfläche nimmt der Form die Strenge. Damit wird aus einem '
        + 'strengen Schuh einer, den du auch am Samstag anziehst.',
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
 * Deshalb steht über jedem Modell kein Name, sondern ein Satz. Die harten
 * Angaben bleiben — als eine ruhige Zeile, nicht als Aufstellung.
 *
 * Ein dritter Satz stand einmal dazwischen: der Anlass („Für den Termin, bei
 * dem …"). Er ist weg. Neben dem Gedanken darüber sagte er fast überall
 * dasselbe noch einmal, und drei Stimmungssätze übereinander sind keine
 * Erzählung mehr, sondern Geschwafel. Geblieben sind ein Gedanke, die Sache
 * und die Zukunft — und dazwischen atmet die Fläche.
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
    zeit: 'Nach zwei Jahren ist das Leder dort dunkler, wo dein Fuß arbeitet. Man '
        + 'sieht dem Paar dann an, wem es gehört.',
  },
  DERBY: {
    titel: 'Der Tag wird länger als geplant.',
    zeit: 'Wenn die Sohle durch ist, kommt eine neue. Der Schaft bleibt, und den kennst '
        + 'du dann schon besser als jeden Schuh, den du je gekauft hast.',
  },
  LOAFER: {
    titel: 'Gehalten wird er allein von seiner Form.',
    zeit: 'Ein Loafer verrät seinen Träger schneller als jeder andere Schuh. Er nimmt '
        + 'die Bewegung des Fußes an, und das sieht man ihm nach einem Sommer an.',
  },
  BOOT: {
    titel: 'Das Wetter darf von mir aus schlecht sein.',
    zeit: 'Wenn die Sohle durch ist, kommt eine neue. Ein Stiefel, der zehn Winter '
        + 'gesehen hat, sieht danach besser aus als am ersten Tag.',
  },
  MONK: {
    titel: 'Eine Schnalle sagt mehr als zwei Reihen Ösen.',
    zeit: 'Der Riemen bekommt mit den Jahren eine eigene Falte, dort wo er täglich '
        + 'schließt. Sie gehört ab dann zum Schuh.',
  },
  SNEAKER: {
    titel: 'Manche Tage sind länger als ihr Anlass.',
    zeit: 'Weiches Leder legt sich nach wenigen Wochen um den Fuß. Ab da sitzt es, '
        + 'als wäre es für dich gebaut worden — was es ja auch ist.',
  },
  MOCCASIN: {
    titel: 'Ein Schuh, der nichts von dir verlangt.',
    zeit: 'Ungefüttertes Leder nimmt die Form des Fußes am schnellsten an — nach einem '
        + 'Sommer sitzt es, als wäre es darauf gebaut worden.',
  },
  STANDARD: {
    titel: 'Eine Form, die älter ist als jedes Haus, das sie verkauft.',
    zeit: 'Gutes Leder nimmt mit den Jahren eine eigene Farbe an. Zwei gleiche Paare '
        + 'sehen nach drei Jahren verschieden aus.',
  },
}

const erzaehlungZu = (machart) =>
  ERZAEHLUNG[String(machart || '').toUpperCase()] || ERZAEHLUNG.STANDARD

/* ── Bausteine der Modellkapitel ────────────────────────────────────────── */

/**
 * Warum es vier verschiedene Kapitelformen gibt und nicht eine gespiegelte.
 *
 * Die Fassung davor setzte jedes Modell in dieselbe Zweiteilung und drehte
 * nur die Seite. Genau das ist der Eindruck „nach Vorlage gemacht": Wer das
 * erste Kapitel gelesen hat, kennt das Muster, und ab da scrollt er, statt zu
 * lesen. Ein gespiegeltes Raster ist keine Abwechslung, es ist dasselbe
 * Raster von hinten.
 *
 * Ein Heft komponiert stattdessen jede Doppelseite eigens: einmal groß und
 * mittig, einmal als Diptychon, einmal übereinandergeschoben, einmal als
 * breites Band. Die vier Formen unten sind genau das. Sie tragen dieselben
 * Bausteine — Marke, Überschrift, Geschichte, Anlass, Angaben, Nachsatz —
 * und setzen sie jedes Mal anders zusammen, auch der Nachsatz sitzt jedes
 * Mal woanders.
 *
 * Die Reihenfolge ist fest und nicht zufällig: Der erste Auftritt trägt am
 * meisten (mittig, viel Luft), das Band am Ende leitet zur Auswahl über.
 * Gäbe es ein fünftes Kapitel, begänne die Folge von vorn — das ist
 * hingenommen, weil vier die sinnvolle Zahl ist und niemand acht Kapitel
 * liest.
 */

/**
 * Die Zeile über jeder Überschrift: Nummer, Machart — und, falls vorhanden,
 * der Hinweis („Neu", „Bestseller").
 *
 * Der Hinweis stand vorher als weißer Aufkleber in der Ecke der Aufnahme.
 * Das ist die Geste eines Katalogs, und sie stand ausgerechnet auf dem
 * einzigen Bild des Kapitels. Hier steht sie in der Zeile, in der ohnehin
 * die Einordnung steht, und lässt das Foto in Ruhe.
 */
function Kapitelzeile({ nummer, machart, hinweis, hell = false }) {
  const machartText = String(machart || 'Custom Made').replace(/_/g, ' ')
  return (
    <Kapitelmarke hell={hell}>
      {[`${nummer} — ${machartText}`, hinweis].filter(Boolean).join('   ·   ')}
    </Kapitelmarke>
  )
}

/**
 * Kapitelbild — die Aufnahme, klickbar, mit dem ruhigen Heranzoomen.
 *
 * ── Warum hier nichts beschnitten wird ────────────────────────────────────
 *
 * Diese Fassung hat zuvor jede Aufnahme mit `object-cover` in ein fest
 * vorgegebenes Seitenverhältnis gezwungen — 16/10, 4/5, 21/9, einmal 82 vh
 * Höhe. Das funktioniert bei Reportagefotos, die man überall anschneiden
 * kann. Die Modellaufnahmen sind das Gegenteil davon: Studioaufnahmen, bei
 * denen der Schuh mittig steht und die Luft um ihn herum mitkomponiert ist.
 * Ein erzwungener Ausschnitt nimmt genau diese Luft weg und schneidet im
 * schlimmsten Fall die Ferse ab.
 *
 * Deshalb bestimmt jetzt das Bild seine Höhe selbst (`h-auto`). Die Breite
 * gibt die Spalte vor, eine Obergrenze in Bildschirmhöhen verhindert, dass
 * ein hochformatiges Bild die ganze Seite füllt; greift sie, sorgt
 * `object-contain` dafür, dass verkleinert und nicht abgeschnitten wird.
 * Beschnitten wird in keinem Fall.
 *
 * ── Warum kein eigener Grund mehr ─────────────────────────────────────────
 *
 * Die Kachel hatte eine eigene Hintergrundfarbe (#EDEAE3). Solange das Bild
 * die Fläche füllte, sah man sie nie; sobald es das nicht mehr tut, wäre sie
 * ein zweiter Farbton neben dem des Abschnitts und dem der Aufnahme selbst.
 * Der Grund ist jetzt der des Abschnitts, und die Aufnahme liegt darauf wie
 * eine Tafel in einem Buch.
 */
function Kapitelbild({ schuh, oeffnen, className = '', hoehe = 'max-h-[62vh]' }) {
  return (
    <button
      type="button"
      onClick={oeffnen}
      className={`group block w-full bg-transparent border-0 p-0 text-left ${className}`}
      aria-label={`${schuh.name} ansehen und konfigurieren`}
    >
      <span className="block overflow-hidden">
        <img
          src={resolveMediaUrl(schuh.image)}
          alt={`${schuh.name}, nach Maß gefertigt`}
          loading="lazy"
          className={`block w-full h-auto object-contain ${hoehe} transition-transform duration-[1600ms] ease-out group-hover:scale-[1.03]`}
        />
      </span>
    </button>
  )
}

/** Name, Angaben und der Weg in den Konfigurator. */
function Kapitelfuss({ schuh, oeffnen, mittig = false }) {
  return (
    <div className={`pt-6 border-t border-black/[0.09] ${mittig ? 'text-center' : ''}`}>
      <p className="text-[11px] uppercase tracking-[0.24em] text-black/50">{schuh.name}</p>
      <p className="text-[11px] text-black/35 font-light mt-2">
        {[
          schuh.material,
          Number(schuh.express) === 1
            ? `rund ${schuh.express_weeks || 2} Wochen`
            : 'vier bis sechs Wochen',
          schuh.price ? `ab ${schuh.price}` : null,
        ].filter(Boolean).join('   ·   ')}
      </p>
      <button
        type="button"
        onClick={oeffnen}
        className="group mt-6 bg-transparent border-0 p-0 inline-flex items-center gap-3 text-[11px] uppercase text-black hover:text-black/60 transition-colors"
        style={{ letterSpacing: '0.22em' }}
      >
        <span className="relative pb-1">
          Konfigurieren
          <span className="absolute left-0 bottom-0 h-px w-full bg-black/25 group-hover:bg-black/50 transition-colors" />
        </span>
        <ArrowRight size={14} strokeWidth={1.5} className="transition-transform duration-500 group-hover:translate-x-1.5" />
      </button>
    </div>
  )
}

/** Der Satz darüber, was nach Jahren aus dem Paar wird. */
function Nachsatz({ text, className = '', gross = false }) {
  return (
    <p
      className={`satz-titel italic text-black/50 leading-[1.7] ${
        gross ? 'text-[18px] lg:text-[24px]' : 'text-[17px] lg:text-[20px]'
      } ${className}`}
    >
      {text}
    </p>
  )
}

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
        text: 'Die Form zuerst: Welche Leder, Sohlen und Details zur Wahl stehen, '
            + 'hängt an der Machart.',
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
        text: 'Dieselbe Farbe fällt auf Velours anders aus als auf Box Calf — deshalb '
            + 'hängt die Auswahl am Leder und nicht am Modell.',
        farben: farbtoene.length ? farbtoene : null,
        hinweis: farbtoene.length ? `${farbtoene.length} Töne, hier ohne Namen.` : null,
      },
      {
        titel: 'Sohle, Rahmen und Details',
        text: 'Jeder Schritt zeigt sofort, was er am Preis ändert. Und was am Ende '
            + 'dasteht, hast du selbst gewählt.',
        schlagworte: ['Sohlen-Art', 'Rahmen', 'Nahtfarbe', 'Sohlenrand', 'Laufsohle', 'Innenfutter', 'Zehenkappe'],
        hinweis: 'Welche Schritte erscheinen, hängt vom Modell ab.',
      },
      {
        titel: 'Deine Maße',
        text: 'Fußlänge und Ballenumfang, mehr brauchen wir nicht. Daraus bestimmen '
            + 'wir Leisten, Größe und Weite — für deinen Fuß und für keinen anderen.',
        // Der Beleg zu dieser Station ist eine Zeichnung und keine Zeile.
        //
        // „Ballenumfang" ist das Wort, an dem ein Kauf hängen bleibt: Wer noch
        // nie Maß genommen hat, weiß nicht, was gemeint ist, und wer es nicht
        // weiß, glaubt auch nicht, dass zwei Maße reichen. Ein Absatz mehr
        // hilft dagegen nicht — eine Skizze mit beiden Maßen schon.
        //
        // Sie steht außerdem an der einzigen Station, die eine hat. Sechs
        // gleich gebaute Stationen untereinander sind eine Aufzählung; eine,
        // die aus der Reihe fällt, macht daraus einen Weg.
        zeichnung: FussMass,
        hinweis: '±0,5 cm genügen. Ein Schnürsenkel und ein Lineal reichen zum Messen.',
      },
      {
        titel: 'Prüfen und bestellen',
        text: 'Deine ganze Zusammenstellung steht noch einmal da, jede Farbe, jede '
            + 'Option. Erst dieser Klick ist verbindlich.',
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

        <div className="relative w-full px-5 lg:px-16 pb-10 lg:pb-14">
          <Enthuellen>
            <Kapitelmarke hell>Custom Made · Made in Spain</Kapitelmarke>
          </Enthuellen>

          <Enthuellen verzoegerung={120}>
            <h1 className="satz-titel text-[38px] lg:text-[76px] text-white leading-[1.04] mt-5 max-w-3xl">
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

          {/* Die Faktenzeile.

              Fünf Angaben, keine davon ein Satz. Sie beantwortet in zwei
              Sekunden, was sonst drei Absätze brauchen: was das ist, wo es
              herkommt, wie lange es dauert und was in zehn Jahren damit ist.

              Jede der fünf steht weiter unten ausführlich — hier steht sie
              nur als Wort. Das ist der Unterschied zwischen „wir versprechen
              viel" und „du weißt, was du bekommst": Das Versprechen wird
              nicht lauter, es wird kürzer.

              Getrennt durch Mittelpunkte und nicht durch Striche: Ein Strich
              ist ein eigenes Element und steht nach einem Zeilenumbruch als
              Erstes in der neuen Zeile — ein Trennzeichen, das nichts trennt.
              Ein Mittelpunkt gehört zum Text und bricht mit ihm um. */}
          <Enthuellen verzoegerung={420} richtung="ruhig">
            <p
              className="text-[9px] lg:text-[10px] uppercase text-white/45 mt-10 lg:mt-12 max-w-2xl leading-[2.2]"
              style={{ letterSpacing: '0.22em' }}
            >
              {FAKTEN.join('   ·   ')}
            </p>
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
          weiterscrollt und die Frage mitnimmt.

          Über jeder Zahl stand ein Strichsymbol aus dem Symbolsatz: Lineal,
          Hammer, Kalenderblatt. Genau diese drei stehen in jedem Baukasten
          über genau solchen Zahlen, und sie sagten nichts, was die Zahl
          darunter nicht schon sagte. Ohne sie trägt die Zahl den Abschnitt,
          und das ist der Sinn eines Abschnitts, der aus drei Zahlen besteht.

          Statt drei Kacheln nebeneinander jetzt ein Band mit senkrechten
          Haarlinien dazwischen — ein Register, keine Karten. */}
      <section className="px-5 lg:px-16 py-14 lg:py-24 border-b border-black/[0.07]">
        <div className="grid sm:grid-cols-3 max-w-5xl mx-auto">
          {ZAHLEN.map((z, i) => (
            <Enthuellen key={z.einheit} verzoegerung={i * 90}>
              {/* Die Trennlinie gehört links an die zweite und dritte Zahl —
                  eine Linie rechts an der letzten wäre ein Rand ohne Nachbarn.
                  Auf dem Telefon stehen die drei untereinander, dort trennt
                  eine waagerechte Linie oben. */}
              <div className={`py-8 sm:py-0 ${
                i > 0
                  ? 'border-t border-black/[0.08] sm:border-t-0 sm:border-l sm:pl-10 lg:pl-16'
                  : ''
              } ${i < 2 ? 'sm:pr-10 lg:pr-16' : ''} sm:border-black/[0.08]`}>
                <p className="satz-titel text-[52px] lg:text-[76px] leading-[0.9] tracking-[-0.02em]">
                  {z.zahl}
                </p>
                <p className="text-[10px] uppercase tracking-[0.28em] text-black/40 mt-4">
                  {z.einheit}
                </p>
                <p className="text-[12px] lg:text-[13px] text-black/50 font-light leading-[1.85] mt-5 max-w-xs">
                  {z.text}
                </p>
              </div>
            </Enthuellen>
          ))}
        </div>
      </section>


      {/* ══ 3 · Das Handwerk ══════════════════════════════════════════════
          Der Abschnitt, der den Preis trägt. „Rahmengenäht statt geklebt"
          ist der entscheidende Satz und zugleich der unanschaulichste — was
          ein Rahmen ist, sieht man am fertigen Schuh nicht. Deshalb der
          Schnitt.

          Und deshalb setzt er sich jetzt zusammen, statt fertig dazustehen:
          Ein Schnitt besteht aus Lagen, und diese Lagen entstehen in einer
          Reihenfolge — in der, in der ein Schuhmacher sie anlegt. Wer sie
          scrollend sieht, versteht in zwanzig Sekunden, wofür sonst zwei
          Absätze nötig waren. Die zwei Absätze sind deshalb weg; ihr Inhalt
          steht in den sechs Schritten (lib/aufbauSchritte.js).

          Was bleibt, bleibt aus gutem Grund: Wer keine Bewegung will,
          bekommt denselben Abschnitt ohne Bühne, mit allen sechs Schritten
          als Liste. Siehe SchuhAufbau. */}
      <section className="bg-[#111] text-white">
        <SchuhAufbau
          kopf={
            <>
              <Kapitelmarke hell>Das Handwerk</Kapitelmarke>
              <h2 className="satz-titel text-[29px] lg:text-[48px] leading-[1.14] mt-4 max-w-2xl">
                Zwei Nähte halten<br className="hidden sm:block" /> diesen Schuh zusammen.
              </h2>
            </>
          }
          fuss={
            <p className="text-[12px] text-white/35 font-light leading-relaxed max-w-2xl">
              Zwischen Brand- und Laufsohle liegt Kork. Er gibt unter dem Gewicht nach
              und nimmt nach einigen Wochen die Form deines Fußes an. Das ist der Grund,
              warum so ein Paar mit der Zeit bequemer wird.
            </p>
          }
        />
      </section>


      {/* ══ 4 · Die Modelle ═══════════════════════════════════════════════
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
            <h2 className="satz-titel text-[31px] lg:text-[54px] leading-[1.14] mt-6 max-w-3xl mx-auto">
              Jede Form hat einen Grund. Meist einen älteren als wir.
            </h2>
          </Enthuellen>
          <Enthuellen verzoegerung={140}>
            <p className="text-[13px] lg:text-[15px] text-black/45 font-light leading-[2] mt-8 max-w-xl mx-auto">
              Jede dieser Formen ist aus einer Notwendigkeit entstanden: die
              geschlossene Schnürung für die Strenge der Etikette, die offene für den
              kräftigen Spann, der Riemen für den Steigbügel.
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
              const nummer = String(i + 1).padStart(2, '0')
              const erz = erzaehlungZu(schuh.category)
              const oeffnen = () => navigate(shoePath(schuh))
              const marke = <Kapitelzeile nummer={nummer} machart={schuh.category} hinweis={schuh.tag} />

              /* ══ Form A · Mittig ══════════════════════════════════════
                 Der erste Auftritt. Die Aufnahme steht in der Fläche statt
                 an ihrem Rand, mit Luft ringsum, und alles darunter ist
                 mittig gesetzt. Die ruhigste der vier Formen — sie trägt am
                 meisten, weil sie am wenigsten tut. */
              if (i % 4 === 0) {
                return (
                  <section key={schuh.id} className="bg-white px-5 lg:px-16 py-16 lg:py-28">
                    <Enthuellen>
                      <Kapitelbild
                        schuh={schuh}
                        oeffnen={oeffnen}
                        className="max-w-4xl mx-auto"
                        hoehe="max-h-[56vh] lg:max-h-[62vh]"
                      />
                    </Enthuellen>
                    <Enthuellen verzoegerung={140}>
                      <div className="max-w-2xl mx-auto text-center mt-14 lg:mt-20">
                        {marke}
                        <h3 className="satz-titel text-[33px] lg:text-[54px] leading-[1.14] mt-6">
                          {erz.titel}
                        </h3>
                        <p className="text-[13px] lg:text-[15px] text-black/50 font-light leading-[2] mt-8">
                          {schuh.description}
                        </p>
                        <Nachsatz text={erz.zeit} className="mt-10" />
                        <div className="max-w-xs mx-auto mt-12">
                          <Kapitelfuss schuh={schuh} oeffnen={oeffnen} mittig />
                        </div>
                      </div>
                    </Enthuellen>
                  </section>
                )
              }

              /* ══ Form B · Diptychon ═══════════════════════════════════
                 Zwei Hälften, aber beide eingefasst: Die Aufnahme reicht
                 nicht bis an den Seitenrand, sondern steht wie ein Blatt auf
                 dem farbigen Grund. Der Text beginnt oben statt in der
                 Mitte, dadurch entsteht unter ihm eine offene Ecke. */
              if (i % 4 === 1) {
                return (
                  <section key={schuh.id} className="bg-[#F5F3F0] px-5 lg:px-16 py-16 lg:py-28">
                    <div className="lg:grid lg:grid-cols-12 lg:gap-16 items-start max-w-6xl mx-auto">
                      <Enthuellen verzoegerung={120} className="lg:col-span-5 lg:pt-10">
                        {marke}
                        <h3 className="satz-titel text-[32px] lg:text-[50px] leading-[1.14] mt-6">
                          {erz.titel}
                        </h3>
                        <p className="text-[13px] lg:text-[14px] text-black/50 font-light leading-[2] mt-8 max-w-[24rem]">
                          {schuh.description}
                        </p>
                        <div className="mt-12 max-w-[24rem]">
                          <Kapitelfuss schuh={schuh} oeffnen={oeffnen} />
                        </div>
                      </Enthuellen>

                      <Enthuellen richtung="rechts" className="lg:col-span-7 mt-12 lg:mt-0">
                        <Kapitelbild
                          schuh={schuh}
                          oeffnen={oeffnen}
                          hoehe="max-h-[60vh] lg:max-h-[68vh]"
                        />
                      </Enthuellen>
                    </div>

                    {/* Der Nachsatz sitzt hier am Fuß, quer über beide
                        Hälften — und nicht in einer davon. */}
                    <Enthuellen richtung="ruhig">
                      <div className="max-w-6xl mx-auto mt-16 lg:mt-24 pt-10 border-t border-black/[0.08]">
                        <Nachsatz text={erz.zeit} className="max-w-2xl" gross />
                      </div>
                    </Enthuellen>
                  </section>
                )
              }

              /* ══ Form C · Versetzt ════════════════════════════════════
                 Die Aufnahme läuft bis an den rechten Seitenrand, der Text
                 steht schmal daneben und beginnt deutlich tiefer. Die
                 unruhigste der vier Formen, deshalb steht sie in der Mitte
                 der Folge.

                 Sie hat einmal anders funktioniert: Das Textblatt lag mit
                 `z-10` ÜBER dem Bild. Auf dem Entwurf war das eine schöne
                 Geste, mit den echten Aufnahmen legte es sich dem Schuh auf
                 die Ferse. Eine Komposition, die ihr eigenes Motiv verdeckt,
                 ist keine. Der Versatz bleibt, die Überdeckung nicht: Die
                 beiden Spalten stehen jetzt nebeneinander, nur eben auf
                 verschiedener Höhe. */
              if (i % 4 === 2) {
                return (
                  <section key={schuh.id} className="bg-white py-16 lg:py-28 px-5 lg:pl-16 lg:pr-0">
                    <div className="lg:grid lg:grid-cols-12 lg:gap-x-14 lg:items-start">
                      <Enthuellen richtung="rechts" className="lg:col-span-7 lg:col-start-6 lg:row-start-1">
                        <Kapitelbild
                          schuh={schuh}
                          oeffnen={oeffnen}
                          hoehe="max-h-[62vh] lg:max-h-[74vh]"
                        />
                      </Enthuellen>

                      <Enthuellen
                        verzoegerung={160}
                        className="lg:col-span-5 lg:col-start-1 lg:row-start-1 lg:pt-28 mt-12 lg:mt-0"
                      >
                        {marke}
                        <h3 className="satz-titel text-[32px] lg:text-[50px] leading-[1.14] mt-6">
                          {erz.titel}
                        </h3>
                        <p className="text-[13px] lg:text-[14px] text-black/50 font-light leading-[2] mt-8">
                          {schuh.description}
                        </p>
                        {/* Hier steht der Nachsatz mit in der Spalte — die
                            Form hat keinen Fuß, über den er laufen könnte. */}
                        <Nachsatz text={erz.zeit} className="mt-9" />
                        <div className="mt-11">
                          <Kapitelfuss schuh={schuh} oeffnen={oeffnen} />
                        </div>
                      </Enthuellen>
                    </div>
                  </section>
                )
              }

              /* ══ Form D · Breitband ═══════════════════════════════════
                 Eine breite Aufnahme über die volle Seite, Überschrift
                 darüber, und darunter drei Spalten: Geschichte, Anlass,
                 Nachsatz. Die Form leitet zur Auswahl über — sie liest sich
                 schon wie eine Seite, auf der mehreres nebeneinander steht. */
              return (
                <section key={schuh.id} className="bg-[#F5F3F0] py-16 lg:py-28">
                  <Enthuellen>
                    <div className="px-5 lg:px-16 text-center max-w-3xl mx-auto">
                      {marke}
                      <h3 className="satz-titel text-[32px] lg:text-[52px] leading-[1.14] mt-6">
                        {erz.titel}
                      </h3>
                    </div>
                  </Enthuellen>

                  <Enthuellen verzoegerung={140} className="mt-12 lg:mt-16 px-5 lg:px-16">
                    {/* Auf derselben Breite wie die drei Spalten darunter —
                        eine Aufnahme, die über sie hinausragt, liest sich
                        nicht als Kopf der Seite, sondern als Ausrutscher. */}
                    <Kapitelbild
                      schuh={schuh}
                      oeffnen={oeffnen}
                      className="max-w-6xl mx-auto"
                      hoehe="max-h-[54vh] lg:max-h-[66vh]"
                    />
                  </Enthuellen>

                  <Enthuellen verzoegerung={200}>
                    <div className="px-5 lg:px-16 mt-14 lg:mt-20">
                      <div className="max-w-6xl mx-auto grid gap-10 lg:gap-20 lg:grid-cols-2">
                        <p className="text-[13px] lg:text-[14px] text-black/50 font-light leading-[2]">
                          {schuh.description}
                        </p>
                        <Nachsatz text={erz.zeit} />
                      </div>
                      <div className="max-w-6xl mx-auto mt-14 lg:mt-20">
                        <Kapitelfuss schuh={schuh} oeffnen={oeffnen} />
                      </div>
                    </div>
                  </Enthuellen>
                </section>
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
              <p className="satz-titel text-[24px] lg:text-[40px] leading-[1.4] text-white">
                Die letzte Woche Arbeit an deinem Paar machst du selbst.
                Sie beginnt, wenn du es zum ersten Mal anziehst.
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
                    {/* Hier ist ein festes Maß richtig — vier Kacheln
                        nebeneinander müssen auf einer Linie stehen. Der
                        Schuh wird trotzdem nicht beschnitten: `contain`
                        verkleinert ihn in die Kachel, statt ihn an ihren
                        Kanten abzuschneiden. Das Querformat ist gewählt,
                        weil ein Schuh breiter als hoch ist. */}
                    <div className="aspect-[4/3] overflow-hidden bg-[#EDEAE3]">
                      <img
                        src={resolveMediaUrl(schuh.image)}
                        alt={`${schuh.name}, nach Maß gefertigt`}
                        loading="lazy"
                        className="w-full h-full object-contain transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
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


      {/* ══ 5 · Das Leder ═════════════════════════════════════════════════
          Hier standen drei Stockfotos von Lederoberflächen nebeneinander.
          Sie füllten die Fläche und erklärten nichts: Drei Oberflächen sehen
          aus wie Leder, und der Unterschied zwischen ihnen liegt nicht in
          der Struktur, sondern in der Herkunft.

          Also dasselbe Mittel wie beim Handwerk, das als einziger Abschnitt
          dieser Seite getragen hat: ein Schnitt durch etwas, das man am
          fertigen Schuh nicht sieht. Dort der Rahmen, hier die Haut — dass
          sie eine Schichtung ist und nicht ein Material, ist der Grund für
          jeden Lederpreis dieser Seite und für das Wort „vollnarbig".

          Der Aufbau ist bewusst ein anderer als beim Handwerk, damit die
          beiden Abschnitte nicht zur Schablone werden: dort mittig gesetzt
          mit der Zeichnung in der Mitte, hier ein Kopf aus zwei ungleichen
          Spalten und die drei Leder als nummerierte Blätter am Fuß. */}
      <section className="px-5 lg:px-16 py-16 lg:py-28">
        <div className="max-w-6xl mx-auto">
          <div className="lg:grid lg:grid-cols-12 lg:gap-16 lg:items-end">
            <Enthuellen className="lg:col-span-6">
              <Kapitelmarke>Das Leder</Kapitelmarke>
              <h2 className="satz-titel text-[29px] lg:text-[48px] leading-[1.14] mt-4">
                Das Beste an einer Haut liegt ganz oben.
              </h2>
            </Enthuellen>

            <Enthuellen verzoegerung={120} className="lg:col-span-5 lg:col-start-8 mt-7 lg:mt-0">
              <p className="text-[13px] lg:text-[15px] text-black/55 font-light leading-[1.95]">
                Ganz oben liegt die Narbe — die Seite, die gewachsen ist, mit der
                dichtesten Faser. Darunter wird das Gefüge mit jedem Millimeter
                lockerer. Wo eine Gerberei die Haut teilt, entscheidet sich, wie dein
                Paar in zehn Jahren aussieht.
              </p>
            </Enthuellen>
          </div>

          <Enthuellen verzoegerung={180}>
            <div className="mt-14 lg:mt-20 text-black">
              <Tafelflaeche randlos>
                <LederSchnitt className="max-w-3xl mx-auto" />
              </Tafelflaeche>
              <Schiebehinweis />
            </div>
          </Enthuellen>

          <Enthuellen verzoegerung={220}>
            <p className="satz-titel text-[18px] lg:text-[24px] text-black/85 leading-[1.5] mt-12 lg:mt-16 max-w-2xl mx-auto text-center">
              „Vollnarbig" heißt, dass diese oberste Schicht ganz geblieben ist —
              ungeschliffen, ohne Folie darüber. Sie ist der Grund, warum ein gutes
              Paar mit den Jahren schöner wird.
            </p>
          </Enthuellen>

          {/* Die drei Leder als Blätter, nicht als Kacheln: eine Nummer, ein
              Name, eine Herkunftszeile, ein Absatz. Getrennt durch eine feine
              Linie oben, nicht durch einen Rahmen ringsum — ein Rahmen macht
              aus einem Absatz eine Karte, und aus drei Karten ein Regal. */}
          <div className="grid sm:grid-cols-3 gap-10 lg:gap-14 mt-16 lg:mt-24">
            {LEDER.map((l, i) => (
              <Enthuellen key={l.name} verzoegerung={i * 90}>
                <div className="pt-6 border-t border-black/[0.12]">
                  <p className="text-[10px] tracking-[0.3em] text-black/30">
                    {String(i + 1).padStart(2, '0')}
                  </p>
                  <p className="satz-titel text-[19px] lg:text-[23px] text-black leading-[1.3] mt-4">
                    {l.name}
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-black/40 mt-3">
                    {l.herkunft}
                  </p>
                  <p className="text-[12px] lg:text-[13px] text-black/50 font-light leading-[1.9] mt-5">
                    {l.text}
                  </p>
                </div>
              </Enthuellen>
            ))}
          </div>

          <Enthuellen verzoegerung={140}>
            <p className="text-[12px] text-black/40 font-light mt-12 lg:mt-16 max-w-xl">
              Auch was unterhalb der Spaltlinie bleibt, wird zu Schuhen verarbeitet,
              mit aufgeprägter Narbung. Im Laden sieht man den Unterschied kaum, im
              dritten Jahr sieht ihn jeder. Welche Leder an welchem Modell zur Wahl
              stehen, zeigt der Konfigurator.
            </p>
          </Enthuellen>
        </div>
      </section>


      {/* ══ 6 · Der Weg ═══════════════════════════════════════════════════
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
            <h2 className="satz-titel text-[29px] lg:text-[48px] leading-[1.14] mt-4">
              Sechs Entscheidungen,<br className="hidden sm:block" /> dann gehört er dir.
            </h2>
          </Enthuellen>
          <Enthuellen verzoegerung={120}>
            <p className="text-[13px] lg:text-[15px] text-black/50 font-light leading-[1.9] mt-6">
              Du musst keine davon auf einmal treffen. Der Konfigurator merkt sich
              jeden Stand, und verbindlich wird es erst an der letzten Station.
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
                    {st.zeichnung && (
                      <div className="mt-6 text-black">
                        <Tafelflaeche>
                          <st.zeichnung className="max-w-md" />
                        </Tafelflaeche>
                        <Schiebehinweis />
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
                    Ein Paar, das für einen bestimmten Fuß gebaut ist, lässt sich nicht
                    zurückgeben. Stimmt etwas nicht, fertigen wir es neu, ohne Kosten
                    für dich. Die Einzelheiten stehen in den AGB.
                  </p>
                </div>
              </li>
            </Enthuellen>
          </ol>
        </div>
      </section>

      {/* ══ 7 · In eigener Sache ══════════════════════════════════════════
          Der Abschnitt, der diese Fassung von jeder anderen trennt. Die
          Offenheit über die Machart war bisher eine Selbstauskunft im
          Kleingedruckten; hier ist sie das Verkaufsargument. Wer „handmade"
          liest und später erfährt, dass Maschinen im Spiel waren, zieht den
          Rest der Zusagen in Zweifel — auch die, die stimmen. */}
      <section className="bg-[#fafaf9] border-y border-black/[0.06] px-5 lg:px-16 py-16 lg:py-28">
        <div className="max-w-2xl mx-auto">
          <Enthuellen>
            <Kapitelmarke>In eigener Sache</Kapitelmarke>
            <h2 className="satz-titel text-[25px] lg:text-[38px] leading-[1.18] mt-4">
              Bevor es jemand anders sagt
            </h2>
          </Enthuellen>

          <Enthuellen verzoegerung={100}>
            <p className="text-[14px] lg:text-[16px] text-black/60 font-light leading-[1.9] mt-7">
              Wir schreiben nicht „handgefertigt". Der Rahmen wird maschinell genäht,
              so wie in jeder Manufaktur dieser Preisklasse. Von Hand kommen Zuschnitt,
              Zwicken, Finish und die Endkontrolle — und das sind die Schritte, an
              denen sich ein Schuh entscheidet.
            </p>
          </Enthuellen>

          <Enthuellen verzoegerung={180}>
            <p className="text-[14px] lg:text-[16px] text-black/60 font-light leading-[1.9] mt-5">
              Wir sagen es, weil der Unterschied zwischen einem rahmengenähten und
              einem geklebten Schuh für sich spricht. Er braucht kein Wort, das ihn
              größer macht.
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
            <h2 className="satz-titel text-[29px] lg:text-[50px] leading-[1.14] text-white max-w-2xl mx-auto">
              Sechs Entscheidungen.<br className="hidden sm:block" /> Fang mit der ersten an.
            </h2>
          </Enthuellen>
          <Enthuellen verzoegerung={120}>
            <p className="text-[13px] lg:text-[14px] text-white/55 font-light mt-5 max-w-md mx-auto leading-relaxed">
              Die Form zuerst, alles andere baut darauf auf. Konfigurieren kostet
              nichts.
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
