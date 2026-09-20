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
 *   3  Die Teile       Woraus besteht ein Schuh?
 *   4  Die Machart     Was hält ihn zusammen, und warum so?
 *   5  Die Kollektionen Wofür ist es gemacht, und wann trägt man es?
 *   6  Das Leder       Woraus ist die Haut?
 *   7  Der Weg         Wie viele Entscheidungen kommen auf mich zu?
 *   8  Almansa         Wer baut es, und was passiert in den Wochen?
 *   9  Die Pflege      Wie sieht ein Tag mit diesen Schuhen aus?
 *  10  In eigener Sache Was behaupten wir NICHT?
 *  11  Der Anfang      Wo fange ich an?
 *
 * ── Die drei Folgen ───────────────────────────────────────────────────────
 *
 * Drei Abschnitte bewegen sich beim Scrollen, und ihre Reihenfolge ist die
 * eines Werkstücks und nicht die eines Zufalls:
 *
 *   3  Die Teile    Woraus — der Stapel, flach, bis zur Trennlinie
 *   4  Die Machart  Wie — der Schnitt, Lage für Lage, plus der Vergleich
 *   9  Die Pflege   Und du — ein Tag, von morgens bis über Nacht
 *
 * Die ersten beiden gehören zusammen und stehen deshalb nebeneinander: Erst
 * sieht man, was da ist, dann, was es zusammenhält. Die dritte steht am
 * anderen Ende der Seite, weil sie nicht mehr vom Schuh handelt, sondern von
 * dem, der ihn trägt.
 *
 * Am Ende ist keine Frage offen, die vor dem Kauf zählt. Das ist gemeint,
 * wenn hier von einer geschlossenen Geschichte die Rede ist.
 *
 * ── Warum jedes Kapitel eine Tür hat ──────────────────────────────────────
 *
 * Überzeugt wird nicht am Ende, sondern irgendwo unterwegs: Der eine ist es
 * beim Schnitt, der nächste beim Leder, der dritte bei dem Satz darüber, was
 * wir nicht behaupten. Wer an seiner Stelle überzeugt ist und dort nichts
 * findet, wohin er gehen kann, scrollt weiter und verliert sie wieder.
 *
 * Deshalb steht am Fuß jedes Kapitels dieselbe Tür (siehe ZurKollektion):
 * ein Wort mit einer Haarlinie darunter, ein Pfeil, und darüber ein Satz in
 * der Sprache des Kapitels — beim Leder „Welches dieser Leder zur Wahl
 * steht, hängt am Modell", beim Handwerk „So aufgebaut ist jedes Paar, das
 * hier steht". Das Wort bleibt jedes Mal dasselbe, damit man es beim zweiten
 * Mal wiedererkennt und nicht mehr liest.
 *
 * Kapitel 1, 5 und 11 haben ihre eigene: den Knopf im Aufmacher, „Alle N
 * Modelle" unter den Kollektionen (die trägt die echte Zahl und ist an der
 * Stelle die bessere) und den Abschluss. Kapitel 9 führt ins Zubehör und
 * sagt das auch — eine Tür, die anderswo hingeht und trotzdem dasselbe Wort
 * trägt, wäre eine Falle. Die übrigen bekommen diese.
 *
 * ── Und einmal stehen Schuhe dazwischen ───────────────────────────────────
 *
 * Zwischen Kapitel 3 und 4 lagen zwei Bildschirme Weiß: die Pause nach dem
 * Stapel, bevor der Schnitt beginnt. Genau dort hat jemand gerade begriffen,
 * dass die Sohle ein eigenes Teil ist — und fand nichts, wohin er damit
 * gehen kann. Dort steht jetzt ein Band aus vier Paaren, quer durch die
 * Macharten, mit Namen und Preis (siehe ModellStreifen).
 *
 * Es ist keine zweite Modellwahl. Die steht am Ende von Kapitel 5 mit allen
 * achtundvierzig und zum Durchklicken; dieselbe Geste zweimal wäre ein
 * Katalog an zwei Stellen. Das Band hat weder Überschrift noch Reiter: eine
 * Zeile, vier Bilder, eine Tür.
 *
 * ── Warum die Haut zweimal vorkommt ───────────────────────────────────────
 *
 * Kapitel 6 sagt, dass ein Leder eine Haut ist wie die eigene: dieselben
 * Poren, dieselbe Patina, ein Kratzer, der sich auspolieren lässt wie eine
 * Schramme verheilt. Kapitel 9 zieht daraus die Folgerung, die sich jeder
 * selbst schon gedacht hat — eine Haut, die getragen wird, will gepflegt
 * werden. Ohne das erste wäre das zweite ein Zubehörregal.
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
 * Und die Regel darüber, die noch wichtiger ist: JEDER SATZ SAGT EINE SACHE.
 *
 * Es gab hier einen Satz, der lautete: „Die letzte Woche Arbeit an deinem
 * Paar machst du selbst. Sie beginnt, wenn du es zum ersten Mal anziehst."
 * Er klingt nach etwas. Er bedeutet nichts. Wer ihn liest, weiß danach
 * genauso viel wie vorher, und er merkt es — das ist der Moment, in dem eine
 * Seite anfängt, nach Werbetext zu klingen.
 *
 * An derselben Stelle steht jetzt: „Die ersten Wochen fühlt sich ein
 * rahmengenähter Schuh fest an. Das ist der Kork, der noch nachgibt — trag
 * ihn anfangs nur ein paar Stunden am Tag." Das ist dieselbe Länge und
 * dasselbe Thema, aber es ist ein Rat. Wer ihn liest, weiß etwas, das er
 * vorher nicht wusste, und traut dem Absender ab da ein Handwerk zu.
 *
 * Die Probe ist einfach: Streiche den Satz und frage, ob jemand etwas
 * verliert. Verliert niemand etwas, war es Schmuck.
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
 * was eine Vollnarbe von einem Spaltleder unterscheidet, warum ein Leisten
 * zählt, warum gespanntes Leder Tage braucht. Das ist Sachwissen über Schuhe
 * und gilt unabhängig von diesem Haus.
 *
 * Bewusst NICHT erfunden ist alles, was sich nachprüfen ließe und dem Haus
 * zugeschrieben würde: kein Gründungsjahr, kein Name einer Werkstatt, keine
 * Auszeichnung, keine Stückzahl, keine Kundenstimme. Eine Marke, deren
 * Alleinstellung die Offenheit über die Machart ist, darf sich keine
 * Geschichte erfinden — der erste, der nachfragt, nimmt ihr damit auch das,
 * was stimmt.
 *
 * ── Warum Almansa jetzt dasteht ───────────────────────────────────────────
 *
 * Lange stand hier nur „Spanien", weil mehr nicht gesichert war. Der Ort ist
 * inzwischen vom Haus selbst bestätigt: Almansa, Provinz Albacete. Er steht
 * deshalb ausgeschrieben — in der Faktenzeile, im Aufmacher und als eigenes
 * Kapitel.
 *
 * Das ist keine Lockerung der Regel, sondern ihr Sinn: Eine Seite, die ihre
 * Machart offenlegt, gewinnt an der Stelle am meisten, an der sie konkret
 * wird. „Made in Spain" schreibt jeder; einen Ort, den man nachschlagen
 * kann, nennt nur, wer ihn hat.
 *
 * Was daraus NICHT folgt: der Name der Werkstatt, ihr Alter, ihre Größe, wie
 * viele Hände an einem Paar arbeiten. Über Almansa selbst steht hier nur,
 * was über die Stadt nachzulesen ist.
 *
 * ── Die Bilder ────────────────────────────────────────────────────────────
 *
 * Auf dieser Seite steht nur, was der Laden selbst hat: die Aufnahmen aus dem
 * Katalog und die Zeichnungen. Die Stimmungsflächen aus fremden Beständen
 * sind weg — ein Lastwagenparkplatz unter einer Überschrift über Handwerk
 * kostet mehr Glaubwürdigkeit, als er Fläche füllt. Wo nichts Eigenes da ist,
 * steht lieber nichts.
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
import { Fragment, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Footprints, Check } from 'lucide-react'
import useStore from '../store/store'
import { useSeo } from '../lib/seo'
import { shoePath } from '../lib/shoePath'
import { PreisFuss } from '../lib/preisangabe'
import { preisAlsZahl, preisAlsText } from '../lib/preis'
import { resolveMediaUrl } from '../lib/mediaUrl'
import { familieVon } from '../lib/machartFamilien'
import Enthuellen from '../components/Enthuellen'
import Kapitelmarke from '../components/Kapitelmarke'
import { Tafelflaeche, Schiebehinweis } from '../components/Zeichnung'
import SchuhAufbau from '../components/SchuhAufbau'
import PflegeFolge from '../components/PflegeFolge'
import StapelFolge from '../components/StapelFolge'
import Modellwahl from '../components/Modellwahl'
import ModellStreifen from '../components/ModellStreifen'
import LederSchnitt from '../components/LederSchnitt'
import FussMass from '../components/FussMass'

/* ── Bausteine ──────────────────────────────────────────────────────────── */

/**
 * Die Faktenzeile unter der Überschrift.
 *
 * Keine Werbeworte, keine Sätze — fünf Angaben, von denen jede anderswo auf
 * dieser Seite belegt wird. Bei den Wochen steht das Wort „Produktion"
 * dabei: Eine nackte Zahl liest sich wie eine Lieferfrist, und eine
 * Lieferfrist ist etwas, das man abwartet. Die Zeit, in der gebaut wird, ist
 * das Gegenteil davon — aber das muss dastehen, und zwar hier oben und nicht
 * erst in Kapitel 8.
 *
 * „Rund" und nicht „bis zu": „Bis zu vier Wochen" ist eine Obergrenze, und
 * eine Obergrenze, die eine Werkstatt manchmal reißt, ist schlimmer als gar
 * keine Angabe — sie macht aus einer normalen Verzögerung einen gebrochenen
 * Satz. „Rund vier Wochen" sagt dasselbe und hält auch dann, wenn es fünf
 * werden. Dass das vorkommt, steht in Kapitel 8 ausdrücklich da. „Neu besohlbar" ist nicht Behauptung, sondern die
 * Folge der Machart und im Handwerk-Abschnitt gezeigt; „Almansa, Spanien"
 * ist die Ortsangabe, die dieses Haus über sich macht, und sie steht so schon
 * im Untertitel. Sie hieß hier lange „Made in Spain" — dieselbe Auskunft,
 * nur unschärfer.
 */
const FAKTEN = [
  'Rahmengenäht',
  'Nach Maß gebaut',
  'Almansa, Spanien',
  'Rund 4 Wochen Produktion',
  'Neu besohlbar',
]

/**
 * Die fünf Angaben, fertig gesetzt.
 *
 * Innerhalb einer Angabe wird nicht umgebrochen: „Neu / besohlbar" über zwei
 * Zeilen liest sich als zwei Angaben, die es nicht gibt, und seit
 * „Produktionszeit" dabeisteht, passiert das auf jedem zweiten Fenster.
 * Geschützte Leerzeichen binden jede Angabe zusammen; umgebrochen wird nur
 * an den Mittelpunkten dazwischen, und genau dort gehört der Umbruch hin.
 */
const FAKTENZEILE = FAKTEN.map(f => f.replace(/ /g, '\u00A0')).join('   ·   ')

/**
 * Die drei Wege, eine Sohle an einen Schaft zu bringen.
 *
 * ── Warum das auf einer Verkaufsseite steht ───────────────────────────────
 *
 * „Rahmengenäht" ist das teuerste Wort dieser Seite und für die meisten ein
 * Fachwort ohne Gegenstück. Man kann es glauben oder nicht glauben — prüfen
 * kann man es nicht, solange nicht danebensteht, wogegen. Erst mit Blake und
 * geklebt daneben wird aus einer Behauptung ein Vergleich, und ein Vergleich
 * überzeugt jemanden, der Geld ausgibt, anders als ein Versprechen.
 *
 * ── Was hier nicht passiert ───────────────────────────────────────────────
 *
 * Die anderen beiden werden nicht schlechtgemacht. Blake ist eine gute
 * Machart für einen schlanken, biegsamen Schuh, und wer einen leichten
 * Sommerschuh sucht, ist damit richtig bedient. Jeder Eintrag sagt deshalb,
 * wofür die Machart taugt, bevor er sagt, was sie kostet.
 *
 * Eine vierte gibt es — den von Hand genähten Rahmen. Sie steht als Zeile
 * unter den dreien, obwohl dieses Haus sie nicht baut. Wer die Stufe über
 * sich verschweigt und anderswo davon liest, hat auch den Rest verspielt.
 *
 * Sachwissen über Schuhe, nicht Auskunft über dieses Haus.
 */
const MACHARTEN = [
  {
    name: 'Geklebt',
    zusatz: 'Cemented',
    text: 'Sohle und Schaft werden verklebt, ohne Naht. Leicht, biegsam und in '
        + 'jeder Preisklasse zu haben. Ist die Sohle durch, ist der Schuh durch.',
  },
  {
    name: 'Blake',
    zusatz: 'Eine Naht',
    text: 'Eine Naht führt von der Laufsohle durch die Brandsohle in den Schaft. '
        + 'Ergibt den schlanksten Rand, den es gibt. Sie läuft allerdings durch '
        + 'den Innenraum, und neu besohlen kann sie nur, wer die Maschine dafür hat.',
  },
  {
    name: 'Rahmengenäht',
    zusatz: 'Goodyear welted · unsere Wahl',
    text: 'Zwei Nähte statt einer. Die erste fasst Schaft, Futter und Rahmen an '
        + 'der Brandsohle, die zweite nur Rahmen und Laufsohle. Schwerer als die '
        + 'anderen beiden, und die ersten Wochen fester.',
  },
]

/**
 * Die drei Gründe. Drei und nicht fünf — der vierte wäre „Tradition", und
 * das ist kein Grund, sondern eine Ausrede für einen, den man nicht nennen
 * kann.
 *
 * Jeder folgt aus dem Schnitt darüber und ist dort zu sehen: die Trennlinie
 * im Stapel, die fehlende Durchstechung der Brandsohle, der Hohlraum, der
 * mit Kork gefüllt wird.
 */
const WARUM_RAHMEN = [
  {
    titel: 'Die Sohle ist ein eigenes Teil',
    text: 'Die Doppelnaht fasst nur Rahmen und Laufsohle. Ein Schuhmacher trennt '
        + 'sie auf, nimmt die Sohle ab und näht eine neue an — den Schaft fasst er '
        + 'dabei nicht an. Das ist die Linie aus dem Abschnitt davor.',
  },
  {
    titel: 'Nichts geht durch den Innenraum',
    text: 'Keine Naht durchstößt die Brandsohle. Wo kein Loch ist, kommt von unten '
        + 'auch kein Wasser herein, und unter deinem Fuß liegt kein Faden.',
  },
  {
    titel: 'Der Hohlraum wird zu deiner Form',
    text: 'Zwischen Brandsohle und Laufsohle bleibt Platz. Er wird mit Kork '
        + 'gefüllt, der unter dem Gewicht nachgibt und nach einigen Wochen den '
        + 'Abdruck deines Fußes behält.',
  },
]

const ZAHLEN = [
  { zahl: '2',    einheit: 'Maße',            text: 'Fußlänge und Ballenumfang. Die Weite sitzt am Ballen, nicht an der Länge — deshalb reichen zwei.' },
  { zahl: '200+', einheit: 'Arbeitsschritte', text: 'Vom Zuschnitt bis zur Endkontrolle. Für dieses eine Paar.' },
  { zahl: '4',    einheit: 'Wochen Produktion', text: 'So lange braucht ein rahmengenähter Schuh in Almansa. Angefangen wird, wenn du bestellst.' },
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
/**
 * Die drei Lederfamilien.
 *
 * ── Warum Familien und keine Namen ────────────────────────────────────────
 *
 * Hier standen drei Leder mit Namen, und eines davon — Shell Cordovan —
 * führt der Laden gar nicht. Das ist der schlimmste Fehler, den diese Seite
 * machen kann: Sie verspricht etwas, das im Konfigurator nicht auftaucht,
 * und nimmt damit auch allem anderen den Boden, was stimmt.
 *
 * Jetzt stehen drei Familien, und die Namen darunter kommen aus dem Katalog
 * (`keys` → `shoeMaterials`). Streicht jemand im CMS ein Leder, verschwindet
 * es hier; kommt eines dazu, muss es einmal in eine Familie eingetragen
 * werden. Das ist der Preis dafür, dass unter jedem Namen ein Satz steht,
 * der wirklich für ihn gilt.
 *
 * ── Warum die Haut vorkommt ───────────────────────────────────────────────
 *
 * Ein Leder ist eine Haut, und jeder, der das liest, trägt selbst eine. Wer
 * einmal begriffen hat, dass die Narbung dieselben Poren sind wie auf dem
 * eigenen Handrücken, sieht ein Paar Schuhe anders an — und begreift ohne
 * weiteres Wort, warum es gepflegt werden will. Deshalb hat jeder dieser
 * Absätze einen Satz, der beim Leser selbst anfängt.
 */
const LEDERFAMILIEN = [
  {
    name: 'Vollnarbig',
    herkunft: 'Oben geblieben, wie gewachsen',
    keys: ['box_calf', 'fullgrain', 'painted_full_grain', 'nappa'],
    text: 'Die Zeichnung darauf sind die Poren, aus denen einmal Haare kamen. Sie '
        + 'bekommt eine Patina, für die es keine Abkürzung gibt.',
  },
  {
    name: 'Patiniert',
    herkunft: 'Farbe von Hand, Schicht über Schicht',
    keys: ['patina', 'painted_calf', 'lux_calf'],
    text: 'An den Kanten heller, in den Tiefen dunkler, jedes Paar ein eigener '
        + 'Verlauf. So wird auch Haut in der Sonne dunkel: überall ein bisschen '
        + 'anders.',
  },
  {
    name: 'Velours und Nubuk',
    herkunft: 'Angeschliffen, kurzer matter Flor',
    keys: ['lux_suede', 'urban_suede', 'calf_suede', 'unlined_suede', 'lined_suede'],
    text: 'Das ist die Faserseite, die bei dir unter der Haut liegt. Sie ist weich, '
        + 'und aus demselben Grund nimmt sie Wasser — ein Leder für trockene Tage.',
  },
]

/**
 * Die drei Kollektionen, in der Reihenfolge, in der sie auf der Seite stehen.
 *
 * Die Schlüssel sind die des Ladens (lib/saison.js): Am Modell steht `season`,
 * vorbelegt nach der Machart — Stiefel in den Winter, Mokassins und Walks in
 * den Sommer, alles andere ganzjährig — und im CMS je Modell zu ändern.
 *
 * ── Die Notizen ───────────────────────────────────────────────────────────
 *
 * Vor jeder Kollektion außer der ersten steht eine Randnotiz: ein Stichwort
 * und eine Zeile. Sie sagt, worauf es in den Monaten ankommt, die gleich
 * kommen — und knüpft an den Aufbau an, den man zwei Abschnitte vorher hat
 * entstehen sehen: an das Futter und an die Sohle.
 *
 * Hier standen drei ausgewachsene Absätze auf schwarzem Grund. Was sie
 * sagten, stimmte; wie sie es sagten, war für die Sache zu feierlich. Eine
 * Zeile am Rand sagt dasselbe und hält die Seite nicht an.
 */
const SAISONFOLGE = [
  {
    key: 'all',
    marke: 'Ganzjährig',
    titel: 'Die Formen, die keine Jahreszeit kennen.',
  },
  {
    key: 'summer',
    marke: 'Sommer',
    titel: 'Leicht gebaut, dünn gefüttert.',
    notiz: { marke: 'Zum Futter', text: 'Ein ungefütterter Schaft trocknet über Nacht durch.' },
  },
  {
    key: 'winter',
    marke: 'Winter',
    titel: 'Über dem Knöchel, mit Profil darunter.',
    notiz: { marke: 'Zur Sohle', text: 'Eine Doppelsohle hält den nassen Boden weiter weg.' },
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
 * kein Gründungsjahr, kein Name einer Werkstatt, kein Ort außer Almansa.
 *
 * ── Warum der zweite Satz ein Hinweis ist und kein Bild ───────────────────
 *
 * Unter jeder Geschichte stand ein Satz darüber, was nach Jahren aus dem Paar
 * wird. Er war schön und sagte nichts: „Man sieht dem Paar dann an, wem es
 * gehört." Wer so etwas liest, weiß danach genauso viel wie vorher.
 *
 * Jetzt steht dort, was ein Schuhmacher sagen würde, wenn er das Paar in der
 * Hand hält: dass die Doppelnaht sich auftrennen lässt, dass Streusalz weiße
 * Ränder hinterlässt, wenn es eintrocknet, dass ungefütterte Schuhe sich
 * stärker dehnen. Lauter Kleinigkeiten, die niemand erfinden kann, ohne das
 * Handwerk zu kennen — und genau deshalb tragen sie mehr als jedes Bild.
 *
 * Es bleibt Sachwissen über Schuhe und wird nie zur Auskunft über dieses
 * Haus: kein Versprechen, keine Garantie, keine Frist.
 */
const ERZAEHLUNG = {
  OXFORD: {
    titel: 'Es gibt Räume, in denen man nichts erklären muss.',
    rat: 'Nach zwei Jahren ist das Leder dort dunkler, wo der Fuß beim Gehen knickt. '
       + 'Creme auf diese Falten aufzutragen bringt am meisten.',
  },
  WHOLECUT: {
    titel: 'Ein Stück Leder, eine Naht an der Ferse.',
    rat: 'Ohne Trennnähte hat ein Wholecut nichts, was eine Druckstelle abfangen '
       + 'könnte. Die Passform muss von Anfang an stimmen.',
  },
  DERBY: {
    titel: 'Der Tag wird länger als geplant.',
    rat: 'Ist die Sohle durch, trennt ein Schuhmacher die Doppelnaht auf und näht eine '
       + 'neue an. Der Schaft bleibt, wie er ist.',
  },
  BALMORAL: {
    titel: 'Eine Naht, die den Schuh in zwei Hälften teilt.',
    rat: 'Die umlaufende Naht über dem Rist ist die Stelle, an der sich der Schaft am '
       + 'wenigsten dehnt. Über den Spann muss der Schuh deshalb gleich passen.',
  },
  MONK: {
    titel: 'Eine Schnalle sagt mehr als zwei Reihen Ösen.',
    rat: 'Der Riemen bekommt dort eine Falte, wo er täglich schließt. Nach ein paar '
       + 'Wochen findest du das Loch, ohne hinzusehen.',
  },
  DOUBLE_MONK: {
    titel: 'Zweimal schließen, einmal entscheiden.',
    rat: 'Zieh die untere Schnalle fester als die obere. Sie hält den Fuß, die obere '
       + 'legt nur noch an.',
  },
  LOAFER: {
    titel: 'Gehalten wird er allein von seiner Form.',
    rat: 'Ein Loafer hat nichts, womit sich die Weite nachstellen ließe. Auf den '
       + 'Ballenumfang kommt es hier besonders an.',
  },
  BELGIAN_SLIPPER: {
    titel: 'Der leiseste Schuh, den es gibt.',
    rat: 'Weiche Machart, wenig Verstärkung: Er sitzt vom ersten Tag an, und er '
       + 'verzeiht einen halben Zentimeter zu viel nicht.',
  },
  MOCCASIN: {
    titel: 'Ein Schuh, der nichts von dir verlangt.',
    rat: 'Ungefütterte Schuhe dehnen sich stärker als gefütterte. Am Anfang dürfen sie '
       + 'deshalb ruhig eng sitzen.',
  },
  MOC_SPORT: {
    titel: 'Die Machart eines Mokassins, die Sohle eines Turnschuhs.',
    rat: 'Die helle Sohle nimmt Farbe an, wo sie am Rand aufsetzt. Mit einer weichen '
       + 'Bürste geht das meiste davon wieder weg.',
  },
  MOC_SPORT_BOOT: {
    titel: 'Derselbe Schuh, einen Knöchel höher.',
    rat: 'Der höhere Schaft hält den Fuß stärker. Öffne ihn beim Ausziehen ganz, sonst '
       + 'knickt die Ferse mit der Zeit ein.',
  },
  SNEAKER: {
    titel: 'Auch ein Sneaker kann rahmengenäht sein.',
    rat: 'Weiches Leder legt sich nach wenigen Wochen um den Fuß. Danach ändert sich '
       + 'an der Passform kaum noch etwas.',
  },
  SNEAKER_LACED: {
    titel: 'Geschnürt, aber nicht förmlich.',
    rat: 'Zieh die unteren Ösen fester als die oberen. Der Fuß wird am Ballen '
       + 'gehalten, nicht am Spann.',
  },
  LACELESS_TRAINER: {
    titel: 'Reinschlüpfen, losgehen.',
    rat: 'Ohne Schnürung arbeitet der Einstieg am meisten. Zieh ihn nie über die '
       + 'Ferse aus, sondern öffne ihn erst.',
  },
  BOOT: {
    titel: 'Das Wetter darf von mir aus schlecht sein.',
    rat: 'Gegen Streusalz hilft nur eines: abends mit klarem Wasser abwischen, '
       + 'solange der Rand feucht ist. Eingetrocknet bleibt es im Leder.',
  },
  CHELSEA: {
    titel: 'Kein Verschluss, zwei Gummizüge, drei Sekunden.',
    rat: 'Die elastischen Einsätze sind das Erste, was ermüdet. Fass beim Anziehen an '
       + 'die hintere Lasche und nicht an den Gummi.',
  },
  CHUKKA: {
    titel: 'Zwei Ösenpaare, mehr braucht es nicht.',
    rat: 'Der knappe Schaft lässt den Knöchel frei. Bei Nässe ist das die Stelle, an '
       + 'der Wasser zuerst hineinläuft.',
  },
  JODHPUR: {
    titel: 'Ein Riemen, der um den Knöchel läuft.',
    rat: 'Der Riemen hält den Schaft, nicht den Fuß. Zu fest geschlossen drückt er auf '
       + 'den Knöchel, statt zu stützen.',
  },
  WELLINGTON: {
    titel: 'Der Stiefel, der unter der Hose verschwindet.',
    rat: 'Der hohe Schaft steht, wenn er nicht getragen wird. Ein Spanner hält ihn '
       + 'gerade, sonst knickt er über dem Rist.',
  },
  DRAKE: {
    titel: 'Ein Schaft, der höher sitzt, als man denkt.',
    rat: 'Je höher der Schaft, desto mehr arbeitet das Leder über dem Rist. Genau dort '
       + 'braucht es die Creme.',
  },
  STANDARD: {
    titel: 'Eine Form, die älter ist als jedes Haus, das sie verkauft.',
    rat: 'Gutes Leder nimmt mit den Jahren eine eigene Farbe an. Zwei gleiche Paare '
       + 'sehen nach drei Jahren verschieden aus.',
  },
}

/**
 * Die ersten Sätze einer Beschreibung, bis rund 25 Wörter voll sind.
 *
 * Die Texte kommen aus dem Katalog und sind für die Produktseite
 * geschrieben, wo sie richtig sind: „Der Chelsea hat keinen Verschluss,
 * zwei elastische Einsätze halten ihn, ein Zug an der hinteren Lasche
 * genügt. Cognacfarbenes Cordovan gibt dem knappen Schaft …" — 39 Wörter,
 * der längste Block der ganzen Startseite.
 *
 * Ein Kapitel ist aber kein Datenblatt, sondern ein Anriss: Überschrift,
 * ein paar Sätze, der Hinweis vom Schuhmacher, der Weg in den
 * Konfigurator. Wer mehr will, klickt — und dort steht der ganze Text.
 *
 * Gekürzt wird an Satzgrenzen und nicht mitten im Wort. Ein Text, der mit
 * „…" aufhört, sieht aus wie ein Fehler; einer, der nach zwei Sätzen
 * aufhört, sieht aus wie eine Entscheidung.
 */
function anriss(text, hoechstens = 25) {
  const ganz = String(text || '').trim()
  const saetze = ganz.match(/[^.!?]+[.!?]+/g)
  if (!saetze) return ganz

  let aus = ''
  for (const satz of saetze) {
    const naechste = (aus + satz).trim()
    if (aus && naechste.split(/\s+/).length > hoechstens) break
    aus = naechste + ' '
  }
  return aus.trim() || saetze[0].trim()
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


/**
 * Der Kopf einer Kollektion.
 *
 * Mittig, viel Luft, und darüber ein Haarstrich über die ganze Breite: Er
 * trennt zwei Kollektionen deutlicher, als jeder Abstand es könnte, und
 * kostet eine Linie.
 */
function SaisonKopf({ marke, titel }) {
  return (
    <Enthuellen>
      <div className="px-5 lg:px-16 pt-14 pb-10 lg:pt-20 lg:pb-14">
        <div className="max-w-6xl mx-auto border-t border-black/[0.10] pt-10 lg:pt-14 text-center">
          <Kapitelmarke>{marke}</Kapitelmarke>
          <h3 className="satz-titel text-[26px] lg:text-[38px] leading-[1.16] mt-4 max-w-2xl mx-auto">
            {titel}
          </h3>
        </div>
      </div>
    </Enthuellen>
  )
}

/**
 * Die Randnotiz zwischen zwei Kollektionen.
 *
 * Hier lag eine schwarze Fläche über die volle Breite, mit einem Satz in
 * Schaugröße darauf. Dreimal hintereinander hielt die Seite damit an, wurde
 * dunkel und sagte einen Nebensatz, als wäre er ein Motto. Ein Hinweis über
 * das Futter verträgt diese Lautstärke nicht.
 *
 * Jetzt steht er, wo so etwas in einem Werkstattbuch steht: am Rand, an einer
 * feinen Senkrechten, klein. Ein Stichwort und eine Zeile. Wer sie überliest,
 * verliert nichts; wer sie liest, weiß, worauf er gleich achten kann.
 *
 * Senkrecht und nicht waagerecht, weil die Saisonüberschrift darunter schon
 * eine Linie über sich trägt — zwei Striche übereinander sind kein Register,
 * sondern ein Versehen. Und eingerückt, weil alles ringsum mittig steht: Eine
 * Notiz, die sich in die Achse stellt, ist keine Notiz mehr.
 *
 * @param {boolean} [letzte] Die Notiz nach der dritten Kollektion. Unter ihr
 *   kommt keine Saisonüberschrift mehr, sondern der Weg in den Katalog — der
 *   braucht mehr Abstand, sonst klebt der Knopf an der Zeile.
 */
function Notiz({ marke, text, letzte = false }) {
  return (
    <Enthuellen richtung="ruhig">
      <div className={`px-5 lg:px-16 pt-14 lg:pt-24 ${letzte ? 'pb-14 lg:pb-24' : 'pb-2 lg:pb-6'}`}>
        <div className="max-w-6xl mx-auto">
          <div className="max-w-md border-l border-black/[0.18] pl-5 lg:pl-8 lg:ml-[14%]">
            <p className="text-[10px] uppercase tracking-[0.28em] text-black/35">{marke}</p>
            {/* text-balance: Die Zeile ist so kurz, dass sie auf dem Telefon in
                zwei bricht — und ohne Ausgleich steht in der zweiten ein
                einzelnes Wort. Eine Notiz mit Schlepp ist keine. */}
            <p className="text-[15px] lg:text-[17px] text-black/70 font-light leading-[1.75] mt-3 text-balance">
              {text}
            </p>
          </div>
        </div>
      </div>
    </Enthuellen>
  )
}

/**
 * Die Tür zur Kollektion, am Fuß jedes Kapitels.
 *
 * ── Warum sie überall steht ───────────────────────────────────────────────
 *
 * Diese Seite erklärt sieben Kapitel lang, was ein rahmengenähter Schuh ist
 * und wie er entsteht — und ließ den Leser danach allein. Wer beim Leder
 * überzeugt war, musste bis ans Ende scrollen, um irgendwo hinzukommen. Das
 * ist der Fehler, den ein Herrenausstatter nie macht: Er lässt einen den
 * Schnitt betrachten und legt dabei die Hand auf den Türgriff.
 *
 * ── Warum sie leise ist ───────────────────────────────────────────────────
 *
 * Sechsmal derselbe schwarze Knopf wäre Verkäuferei. Hier ist es ein Wort
 * mit einer Haarlinie darunter und ein Pfeil — dieselbe Form, die schon
 * unter jedem Modellkapitel steht, damit die Seite eine Hand behält.
 *
 * Der Reiz liegt im Satz darüber, nicht im Knopf: Jedes Kapitel nimmt die
 * Tür mit seinen eigenen Worten auf, so wie jemand, der über Leder redet,
 * nicht „Jetzt kaufen" sagt, sondern „Welches du bekommst, hängt am Modell".
 * Das Wort auf der Tür bleibt dabei immer dasselbe — man soll es beim
 * zweiten Mal wiedererkennen und nicht lesen müssen.
 *
 * @param {string} satz Die Zeile darüber, in der Sprache des Kapitels.
 * @param {string} [wort] Was auf der Tür steht. Nur zu ändern, wenn sie
 *   woandershin führt als alle anderen — im Pflegekapitel ins Zubehör. Eine
 *   Tür, die anderswo hingeht und trotzdem dasselbe Wort trägt, ist eine
 *   Falle.
 * @param {boolean} [hell] Für die dunklen Abschnitte.
 * @param {boolean} [mittig] Für die mittig gesetzten Kapitel.
 */
/**
 * Ein Zubehörpreis.
 *
 * `preisAlsText` rundet auf ganze Euro — richtig für ein Paar Schuhe, falsch
 * für einen Tiegel Creme: Aus 23,70 würde 24, und wer dann 23,70 im
 * Warenkorb sieht, glaubt der Seite die nächste Zahl nicht mehr.
 */
const euro = (n) =>
  `€ ${Number(n).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function ZurKollektion({ satz, auf, wort = 'Kollektion ansehen', hell = false, mittig = false, className = '' }) {
  return (
    <Enthuellen verzoegerung={120} className={className}>
      <div className={mittig ? 'text-center' : ''}>
        <p className={`text-[13px] lg:text-[15px] font-light leading-[1.8] ${
          hell ? 'text-white/50' : 'text-black/45'
        }`}>
          {satz}
        </p>
        <button
          type="button"
          onClick={auf}
          className={`group mt-4 bg-transparent border-0 p-0 inline-flex items-center gap-3 text-[11px] uppercase transition-colors ${
            hell ? 'text-white hover:text-white/60' : 'text-black hover:text-black/60'
          }`}
          style={{ letterSpacing: '0.22em' }}
        >
          <span className="relative pb-1">
            {wort}
            <span className={`absolute left-0 bottom-0 h-px w-full transition-colors ${
              hell ? 'bg-white/30 group-hover:bg-white/60' : 'bg-black/25 group-hover:bg-black/50'
            }`} />
          </span>
          <ArrowRight size={14} strokeWidth={1.5} className="transition-transform duration-500 group-hover:translate-x-1.5" />
        </button>
      </div>
    </Enthuellen>
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
            ? `rund ${schuh.express_weeks || 2} Wochen Produktion`
            : 'rund vier Wochen Produktion',
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
  const accessories = useStore(s => s.accessories)
  const katalogStatus = useStore(s => s.katalogStatus)
  const initStore = useStore(s => s.initStore)

  useSeo({
    titel: 'Rahmengenähte Schuhe nach deinen Maßen',
    beschreibung: 'Rahmengenäht statt geklebt, einzeln gefertigt in Almansa in Spanien, '
      + 'nach deinen Maßen. Leder, Sohle und Details stellst du selbst zusammen.',
    pfad: '/test-homepage',
    indexieren: false,
  })

  // Der Katalog wird sonst erst von der Kollektionsseite geholt; diese Seite
  // kann die erste sein, die jemand öffnet.
  useEffect(() => { initStore?.() }, [initStore])

  /**
   * Die Kollektionen: drei Saisons, je zwei Kapitel.
   *
   * ── Warum nach Saison ─────────────────────────────────────────────────
   *
   * Vorher standen hier vier Kapitel hintereinander, ausgewählt nach der
   * Machart. Das las sich wie eine Auswahl ohne Grund: vier Schuhe, weil
   * vier Schuhe. Die Saison ist der einzige Ordnungsbegriff, den ein Käufer
   * ohnehin im Kopf hat — er weiß, ob er etwas für den Juli oder für den
   * Januar sucht —, und der Laden führt sie bereits als Feld am Modell
   * (utils/saison.js im Backend, lib/saison.js hier).
   *
   * Die Reihenfolge ist fest: ganzjährig, Sommer, Winter. Das Ganzjährige
   * zuerst, weil es auf die meisten zutrifft; danach die beiden Hälften des
   * Jahres. Zwischen ihnen steht je eine Randnotiz, die auf die nächste
   * Kollektion vorbereitet.
   *
   * ── Die Regeln für ein Kapitel ────────────────────────────────────────
   *
   * Eine Aufnahme UND eine eigene Beschreibung: Ein Kapitel ohne Bild ist
   * eine leere Fläche, eines ohne Text eine Überschrift ohne Geschichte.
   *
   * Höchstens eines je Machart, und jede Geschichte nur einmal — über alle
   * Saisons hinweg. Ohne die erste Regel stünden hier vier Loafer (der
   * Katalog führt zehn davon, und sie kommen zuerst); ohne die zweite
   * stünde ein Modell zweimal da, weil die Express-Fassungen denselben
   * Beschreibungstext tragen wie ihr Grundmodell.
   *
   * `form` läuft über alle Saisons durch und bestimmt die Komposition (A bis
   * D im Wechsel). Bliebe der Zähler je Saison bei null, begänne jede
   * Kollektion mit derselben Form.
   */
  const kollektionen = useMemo(() => {
    const machartGesehen = new Set()
    const textGesehen = new Set()
    let form = 0

    // Eine Machart bekommt auf der ganzen Seite ein Kapitel. Ohne diese
    // Regel stünden im ganzjährigen Block vier Loafer, weil der Katalog zehn
    // davon führt und sie zuerst kommen.
    //
    // Zwei Kapitel derselben Machart aufzufüllen wurde versucht und wieder
    // verworfen: Die Überschrift eines Kapitels kommt aus ERZAEHLUNG und
    // hängt an der Machart — zwei Stiefel hintereinander trugen dieselbe
    // Zeile. Sommer und Winter führen im Katalog je nur eine Machart und
    // bekommen deshalb ein Kapitel. Was dort sonst noch steht, steht als
    // Kachelreihe darunter.
    const waehlen = (key, anzahl) => {
      const treffer = []
      for (const sch of shoes) {
        if (treffer.length >= anzahl) break
        if ((sch.season || 'all') !== key) continue
        const text = String(sch.description || '').trim()
        const machart = String(sch.category || '').toUpperCase()
        if (!sch.image || text.length < 80) continue
        if (textGesehen.has(text) || machartGesehen.has(machart)) continue
        machartGesehen.add(machart)
        textGesehen.add(text)
        treffer.push({ schuh: sch, form: form++ })
      }
      return treffer
    }

    return SAISONFOLGE
      .map(def => {
        // Nur noch das Kapitelmodell: Der Rest derselben Saison stand
        // darunter als Kachelreihe und ist der Modellwahl am Ende des
        // Abschnitts gewichen — die zeigt alle achtundvierzig statt vier je
        // Jahreszeit, und zwar nach der Form geordnet, nach der ein Käufer
        // sucht.
        return { ...def, schuhe: waehlen(def.key, 1) }
      })
      // Eine Kollektion ohne Kapitel bekommt keine Überschrift. Führt der
      // Katalog einmal keine Sommermodelle mit Beschreibung, fehlt der
      // Abschnitt — er steht nicht leer da.
      .filter(k => k.schuhe.length > 0)
  }, [shoes])

  /**
   * Die vier Paare für das Band zwischen dem Stapel und dem Schnitt.
   *
   * Quer durch die Macharten und nicht nach Preis oder Reihenfolge: ein
   * Schnürschuh, ein Loafer, ein Stiefel, ein Sneaker. Vier Oxfords
   * nebeneinander sähen aus, als gäbe es hier nur Oxfords.
   *
   * Was weiter unten schon ein eigenes Kapitel hat, fällt heraus — sonst
   * steht dasselbe Modell zweimal auf derselben Seite, einmal groß und
   * einmal klein, und das sieht nach einem Fehler aus.
   *
   * Ohne Bild kommt keines ins Band: Eine Kachel ohne Aufnahme ist ein Loch.
   */
  const streifenModelle = useMemo(() => {
    const belegt = new Set(kollektionen.flatMap(k => k.schuhe.map(x => x.schuh.id)))
    const aus = []
    for (const key of ['schnuer', 'loafer', 'stiefel', 'sneaker']) {
      const treffer = shoes.find(
        sch => sch.image && !belegt.has(sch.id) && familieVon(sch) === key,
      )
      if (treffer) aus.push(treffer)
    }
    return aus
  }, [shoes, kollektionen])

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
  /**
   * Die Lederfamilien mit den Namen, die der Katalog wirklich führt.
   *
   * Solange er lädt, bleibt die Namenszeile leer — lieber kein Name als ein
   * erfundener. Die Familie selbst steht trotzdem da: Was eine Vollnarbe ist,
   * stimmt auch ohne Katalog.
   */
  const lederFamilien = useMemo(() => {
    const vorhanden = new Map(
      shoeMaterials
        .filter(m => m.available !== 0 && m.available !== false && m.key && m.label)
        .map(m => [String(m.key), String(m.label)]),
    )
    return LEDERFAMILIEN.map(f => ({
      ...f,
      namen: f.keys.map(k => vorhanden.get(k)).filter(Boolean),
    }))
  }, [shoeMaterials])

  /**
   * Das Pflege-Zubehör, wie es der Laden wirklich führt.
   *
   * Namen und Preise kommen aus `accessories` (CMS → /api/accessories), die
   * Zeile darunter steht hier: Die Katalogbeschreibungen sind Verkaufstexte
   * mit Maßangaben und Inhaltsverzeichnis, und an dieser Stelle braucht es
   * einen Satz, der sagt, wofür das Ding gut ist.
   *
   * Führt der Laden eines davon nicht mehr, fällt es hier heraus. Das ist
   * der Grund, warum die Liste nicht hier gepflegt wird: Ein Zubehör auf der
   * Startseite anzubieten, das im Warenkorb fehlt, ist schlimmer, als es
   * gar nicht zu zeigen.
   */
  const zubehoer = useMemo(() => {
    const nach = new Map(
      accessories
        .filter(a => a.is_active !== 0 && a.is_active !== false)
        .map(a => [String(a.key), a]),
    )
    return [
      { key: 'shoe_tree_cedar', satz: 'Unbehandeltes Zedernholz, für jeden Schuh außer Sneakern.' },
      { key: 'care_kit_leather', satz: 'Creme, Bürsten und Poliertuch für glatte Leder.' },
      { key: 'care_kit_suede', satz: 'Kreppbürste, Radierer und Auffrischer für Velours und Nubuk.' },
    ]
      .map(z => ({ ...z, ware: nach.get(z.key) }))
      .filter(z => z.ware)
  }, [accessories])

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
        text: 'Vollnarbig, patiniert oder als Velours. Es bestimmt, wie das Paar '
            + 'aussieht, wie es altert und was es kostet.',
        hinweis: leder.length
          ? `${leder.length} Leder im Katalog, je nach Modell eine Auswahl daraus.`
          : null,
      },
      {
        titel: 'Die Farbe',
        text: 'Dieselbe Farbe fällt auf Velours anders aus als auf Box Calf. Die '
            + 'Auswahl hängt deshalb am Leder.',
        farben: farbtoene.length ? farbtoene : null,
        hinweis: farbtoene.length ? `${farbtoene.length} Töne, hier ohne Namen.` : null,
      },
      {
        titel: 'Sohle, Rahmen und Details',
        text: 'Jeder Schritt zeigt sofort, was er am Preis ändert.',
        schlagworte: ['Sohlen-Art', 'Rahmen', 'Nahtfarbe', 'Sohlenrand', 'Laufsohle', 'Innenfutter', 'Zehenkappe'],
        hinweis: 'Welche Schritte erscheinen, hängt vom Modell ab.',
      },
      {
        titel: 'Deine Maße',
        text: 'Aus zwei Zahlen bestimmen wir Leisten, Größe und Weite — für deinen '
            + 'Fuß und für keinen anderen.',
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

  /**
   * Ein Modellkapitel.
   *
   * Der Rumpf stand als Rückgabewert direkt in der Schleife. Seit die
   * Kapitel nach Saison gruppiert sind, steht zwischen ihnen mal eine
   * Saisonüberschrift und mal eine Randnotiz — dafür muss sich das
   * Kapitel einzeln aufrufen lassen.
   *
   * `i` bestimmt weiter die Form (A bis D im Wechsel) und läuft über alle
   * Saisons hinweg durch: Sonst begänne jede Kollektion wieder mit Form A,
   * und drei gleich gebaute Auftakte hintereinander sind genau das Muster,
   * das hier vermieden werden soll.
   */
  const kapitelInhalt = (schuh, i) => {
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
              <section key={schuh.id} className="bg-white px-5 lg:px-16 py-14 lg:py-20">
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
                      {anriss(schuh.description)}
                    </p>
                    <Nachsatz text={erz.rat} className="mt-10" />
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
              <section key={schuh.id} className="bg-[#F5F3F0] px-5 lg:px-16 py-14 lg:py-20">
                <div className="lg:grid lg:grid-cols-12 lg:gap-16 items-start max-w-6xl mx-auto">
                  <Enthuellen verzoegerung={120} className="lg:col-span-5 lg:pt-10">
                    {marke}
                    <h3 className="satz-titel text-[32px] lg:text-[50px] leading-[1.14] mt-6">
                      {erz.titel}
                    </h3>
                    <p className="text-[13px] lg:text-[14px] text-black/50 font-light leading-[2] mt-8 max-w-[24rem]">
                      {anriss(schuh.description)}
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
                    <Nachsatz text={erz.rat} className="max-w-2xl" gross />
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
              <section key={schuh.id} className="bg-white py-14 lg:py-20 px-5 lg:pl-16 lg:pr-0">
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
                      {anriss(schuh.description)}
                    </p>
                    {/* Hier steht der Nachsatz mit in der Spalte — die
                        Form hat keinen Fuß, über den er laufen könnte. */}
                    <Nachsatz text={erz.rat} className="mt-9" />
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
            <section key={schuh.id} className="bg-[#F5F3F0] py-14 lg:py-20">
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
                      {anriss(schuh.description)}
                    </p>
                    <Nachsatz text={erz.rat} />
                  </div>
                  <div className="max-w-6xl mx-auto mt-14 lg:mt-20">
                    <Kapitelfuss schuh={schuh} oeffnen={oeffnen} />
                  </div>
                </div>
              </Enthuellen>
            </section>
          )
  }

  const zurKollektion = () => navigate('/collection')

  return (
    <div className="min-h-full bg-white">

      {/* ══ 1 · Erster Blick ══════════════════════════════════════════════
          Ein Satz, fünf Angaben, zwei Wege — und kein Bild.

          ── Warum kein Bild ───────────────────────────────────────────────

          Hier lag ein Stockfoto, und auf dieser Seite lagen sieben davon.
          Weil Unsplash seine Kennungen über die Jahre neu belegt, zeigten
          sie zuletzt einen LKW-Parkplatz, eine Fotokamera mit Postkarten
          und einen Sneaker einer anderen Marke — unter Sätzen über
          rahmengenähte Maßschuhe.

          Bessere Kennungen lösen das nicht. Dieses Haus hat noch keine
          eigene Fotografie, und geliehene Stimmung ist schlechter als
          keine: Eine dunkle Fläche behauptet nichts, ein fremdes Foto
          behauptet etwas Falsches.

          Was die Seite trägt, sind die echten Aufnahmen aus dem Katalog,
          die drei Zeichnungen und die Schrift. Kommen eigene Bilder, steht
          hier wieder eines — es ist eine Zeile. */}
      <header className="relative min-h-[76vh] flex items-end overflow-hidden bg-[#0E0E0E]">
        {/* Ein sehr flacher Lichtschein, damit die Fläche Tiefe bekommt,
            ohne dass man ihn als Verlauf erkennt. */}
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(120% 90% at 18% 0%, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 62%)' }}
          aria-hidden="true"
        />

        <div className="relative w-full px-5 lg:px-16 pb-10 lg:pb-14">
          <Enthuellen>
            <Kapitelmarke hell>Custom Made · Almansa, Spanien</Kapitelmarke>
          </Enthuellen>

          <Enthuellen verzoegerung={120}>
            <h1 className="satz-titel text-[38px] lg:text-[76px] text-white leading-[1.04] mt-5 max-w-3xl">
              Ein Paar, das es<br />vorher nicht gab.
            </h1>
          </Enthuellen>

          <Enthuellen verzoegerung={220}>
            <p className="text-[14px] lg:text-[17px] text-white/70 font-light leading-relaxed mt-6 max-w-lg">
              Rahmengenäht, auf deine Maße gebaut, einzeln gefertigt in Almansa.
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
              className="text-[9px] lg:text-[10px] uppercase text-white/45 mt-10 lg:mt-12 max-w-3xl leading-[2.2]"
              style={{ letterSpacing: '0.22em' }}
            >
              {FAKTENZEILE}
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

        <ZurKollektion
          className="max-w-5xl mx-auto mt-12 lg:mt-16"
          satz="Dieselben drei Zahlen stehen hinter jedem Paar."
          auf={zurKollektion}
        />
      </section>


      {/* ══ 3 · Die Teile ════════════════════════════════════════════════
          Die erste der beiden Tafeln, und jetzt die erste Bewegung der Seite
          überhaupt.

          Sie stand lange am Ende, als Nachtrag zum Pflegekapitel: „Und wenn
          die Sohle doch durch ist?" Das war eine gute Frage an der falschen
          Stelle. Denn diese Tafel beantwortet keine Frage über das Alter
          eines Schuhs, sondern die einfachste, die es gibt — woraus besteht
          das Ding? —, und eine Seite, die erklären will, warum ein Schuh
          teuer ist, beantwortet die zuerst.

          Die Reihenfolge der beiden Tafeln ist damit die eines Werkstücks:
          Hier liegen die Teile flach übereinander, jedes mit eigener Kontur,
          wie auf dem Tisch eines Schuhmachers. Am Ende läuft der Stapel auf
          eine Trennlinie hinaus — oben, was bleibt; unten, was gewechselt
          wird. Der Abschnitt danach zeigt im Schnitt, WARUM es diese Linie
          gibt: weil eine bestimmte Naht sie macht.

          Andersherum ging es nicht. Wer den Schnitt zuerst sieht, sieht
          sechs Lagen ineinandergreifen und weiß hinterher nicht, welche
          davon zusammengehören. */}
      <section className="bg-white border-t border-black/[0.06]">
        <StapelFolge
          kopf={
            <>
              <Kapitelmarke>Die Teile</Kapitelmarke>
              <h2 className="satz-titel text-[29px] lg:text-[48px] leading-[1.14] mt-4 max-w-2xl">
                Ein Schuh,<br className="hidden sm:block" /> zwei Teile.
              </h2>
              <p className="text-[13px] lg:text-[15px] text-black/50 font-light leading-[1.95] mt-7 max-w-lg">
                Sieben Lagen, flach übereinandergelegt. Scroll weiter — am Ende
                siehst du, welche davon ein Leben lang bleiben und welche ein
                Schuhmacher wechselt.
              </p>
            </>
          }
          fuss={
            <div className="max-w-3xl">
              <p className="satz-titel text-[18px] lg:text-[24px] text-black/85 leading-[1.5]">
                Oben, was bleibt. Unten, was gewechselt wird. Dass es diese Linie
                überhaupt gibt, liegt an einer einzigen Naht.
              </p>
              <p className="text-[13px] lg:text-[15px] text-black/50 font-light leading-[1.95] mt-6">
                Die kommt gleich — und mit ihr die Frage, warum wir uns
                ausgerechnet für diese Machart entschieden haben.
              </p>
              <ZurKollektion
                className="mt-10 lg:mt-12"
                satz="So gebaut ist jedes Paar, das hier steht."
                auf={zurKollektion}
              />
            </div>
          }
        />
      </section>

      {/* ── Zwischen den beiden Tafeln: vier Paare ────────────────────────
          Hier lagen zwei Bildschirme Weiß. Die Pause nach einem langen
          Gedanken gehört dazu — aber an dieser Stelle hat gerade jemand
          begriffen, dass die Sohle ein eigenes Teil ist, und findet nichts,
          wohin er damit gehen kann.

          Kein zweites Auswahlfeld: eine Zeile, vier Bilder, eine Tür. Die
          Modellwahl mit allen achtundvierzig steht weiter unten, und
          dieselbe Geste zweimal wäre ein Katalog an zwei Stellen. Siehe
          ModellStreifen. */}
      <ModellStreifen
        schuhe={streifenModelle}
        gesamt={shoes.length}
        satz="Jedes dieser Paare ist so gebaut — und lässt sich so wieder aufmachen."
        oeffnen={sch => navigate(shoePath(sch))}
        zumKatalog={zurKollektion}
      />


      {/* ══ 4 · Die Machart ══════════════════════════════════════════════
          Der Abschnitt, der den Preis trägt. „Rahmengenäht statt geklebt"
          ist der entscheidende Satz und zugleich der unanschaulichste — was
          ein Rahmen ist, sieht man am fertigen Schuh nicht. Deshalb der
          Schnitt.

          Und deshalb setzt er sich zusammen, statt fertig dazustehen: Ein
          Schnitt besteht aus Lagen, und diese Lagen entstehen in einer
          Reihenfolge — in der, in der ein Schuhmacher sie anlegt. Wer sie
          scrollend sieht, versteht in zwanzig Sekunden, wofür sonst zwei
          Absätze nötig waren. Die zwei Absätze sind deshalb weg; ihr Inhalt
          steht in den sechs Schritten (lib/aufbauSchritte.js).

          ── Warum hier ein Vergleich steht ────────────────────────────────

          Die Folge zeigt, WIE dieser Schuh gebaut ist. Was sie nicht zeigen
          kann, ist, wogegen — und ohne das ist „rahmengenäht" ein Fachwort,
          das man glauben oder nicht glauben kann. Deshalb steht unter der
          Bühne, welche drei Wege es gibt, eine Sohle an einen Schaft zu
          bringen, und was an jedem gut und schlecht ist.

          Der vierte, der handgenähte Rahmen, steht mit dazu, obwohl dieses
          Haus ihn nicht baut. Eine Seite, deren Argument die Offenheit ist,
          darf die Stufe über sich nicht verschweigen — wer sie anderswo
          findet, glaubt danach auch den Rest nicht mehr.

          Und die drei Gründe sind drei und nicht fünf. Der vierte wäre
          „Tradition", und Tradition ist kein Grund, sondern eine Ausrede
          für einen, den man nicht nennen kann.

          Was bleibt, bleibt aus gutem Grund: Wer keine Bewegung will,
          bekommt denselben Abschnitt ohne Bühne, mit allen sechs Schritten
          als Liste. Siehe SchuhAufbau. */}
      <section className="bg-[#111] text-white">
        <SchuhAufbau
          kopf={
            <>
              <Kapitelmarke hell>Die Machart</Kapitelmarke>
              <h2 className="satz-titel text-[29px] lg:text-[48px] leading-[1.14] mt-4 max-w-2xl">
                Zwei Nähte halten<br className="hidden sm:block" /> diesen Schuh zusammen.
              </h2>
              {/* Der Satz, der die Folge ankündigt. Ohne ihn beginnt die
                  Bühne unangekündigt zu kleben, und wer das nicht erwartet,
                  hält es für einen Fehler. Er nennt außerdem beide Wörter,
                  unter denen man diese Machart nachschlägt — das deutsche und
                  das englische. Ab hier steht auf der Seite immer eines von
                  beiden und nie etwas Drittes. */}
              <p className="text-[13px] lg:text-[15px] text-white/55 font-light leading-[1.95] mt-7 max-w-lg">
                Rahmengenäht, auf Englisch Goodyear welted. Sechs Schritte, von der
                Brandsohle bis zur Doppelnaht — scroll weiter, dann setzt er sich
                zusammen.
              </p>
            </>
          }
          fuss={
            <div>
              <p className="satz-titel text-[20px] lg:text-[30px] text-white/90 leading-[1.45] max-w-3xl">
                Eine Sohle lässt sich auf drei Arten an einen Schaft bringen.
                Wir haben uns für die aufwendigste entschieden.
              </p>

              {/* Die drei Macharten als Blätter, wie die Leder weiter unten:
                  eine Haarlinie oben, kein Rahmen ringsum. Die unsere steht
                  an dritter Stelle und nicht an erster — erst das Feld,
                  dann die Wahl. */}
              <div className="grid sm:grid-cols-3 gap-10 lg:gap-14 mt-12 lg:mt-16">
                {MACHARTEN.map((m, i) => {
                  const unsere = i === MACHARTEN.length - 1
                  return (
                    <div
                      key={m.name}
                      className={`pt-6 border-t ${unsere ? 'border-white/40' : 'border-white/[0.14]'}`}
                    >
                      <p className="text-[10px] tracking-[0.3em] text-white/25">
                        {String(i + 1).padStart(2, '0')}
                      </p>
                      <p className={`satz-titel text-[19px] lg:text-[23px] leading-[1.3] mt-4 ${
                        unsere ? 'text-white' : 'text-white/60'
                      }`}>
                        {m.name}
                      </p>
                      <p className={`text-[10px] uppercase tracking-[0.2em] mt-3 ${
                        unsere ? 'text-white/60' : 'text-white/30'
                      }`}>
                        {m.zusatz}
                      </p>
                      <p className="text-[12px] lg:text-[13px] text-white/50 font-light leading-[1.9] mt-5">
                        {m.text}
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* Die vierte Machart, die dieses Haus nicht baut. Sie steht
                  klein und trotzdem da. */}
              <p className="text-[12px] text-white/35 font-light leading-[1.9] mt-10 lg:mt-12 max-w-2xl">
                Es gibt eine vierte: den von Hand genähten Rahmen, bei dem die
                Lippe nicht aufgeklebt, sondern aus der Brandsohle
                herausgearbeitet wird. Dasselbe Prinzip, mehr Handarbeit, ein
                Preis in einer anderen Klasse. Wir bauen sie nicht.
              </p>

              <div className="mt-14 lg:mt-20 border-t border-white/[0.14] pt-10 lg:pt-14">
                <Kapitelmarke hell>Warum rahmengenäht</Kapitelmarke>
                <ol className="grid sm:grid-cols-3 gap-10 lg:gap-14 mt-8 lg:mt-10">
                  {WARUM_RAHMEN.map((g, i) => (
                    <li key={g.titel}>
                      <p className="text-[10px] tracking-[0.3em] text-white/25">
                        {String(i + 1).padStart(2, '0')}
                      </p>
                      <p className="text-[15px] lg:text-[17px] text-white font-light leading-snug mt-4">
                        {g.titel}
                      </p>
                      <p className="text-[12px] lg:text-[13px] text-white/50 font-light leading-[1.9] mt-4">
                        {g.text}
                      </p>
                    </li>
                  ))}
                </ol>

                {/* Was es kostet. Ohne diesen Satz wären die drei Gründe
                    Werbung; mit ihm sind sie eine Abwägung. */}
                <p className="text-[12px] lg:text-[13px] text-white/40 font-light leading-[1.9] mt-12 lg:mt-14 max-w-2xl">
                  Was es kostet: Ein rahmengenähter Schuh ist schwerer als ein
                  geklebter und die ersten Wochen fester. Beides legt sich, sobald
                  der Kork nachgegeben hat. Und er braucht länger in der Werkstatt
                  — auch deshalb sind es rund vier Wochen.
                </p>
              </div>

              <ZurKollektion
                className="mt-14 lg:mt-20"
                hell
                satz="So aufgebaut ist jedes Paar, das hier steht."
                auf={zurKollektion}
              />
            </div>
          }
        />
      </section>


      {/* ══ 5 · Die Kollektionen ══════════════════════════════════════════
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

          DIE PAUSE GEHÖRT DAZU. Zwischen zwei Kollektionen steht nichts zu
          kaufen — nur eine Zeile am Rand.

          ── Warum nach Saison geordnet ──────────────────────────────────

          Vorher standen hier vier Kapitel hintereinander, ausgewählt nach
          der Machart. Das las sich wie eine Auswahl ohne Grund: vier Schuhe,
          weil vier Schuhe. Jetzt stehen drei Kollektionen — ganzjährig,
          Sommer, Winter —, und dazwischen sagt je eine Randnotiz, worauf es
          in den Monaten ankommt, die gleich kommen. Damit liest man die
          nächste Kollektion als Antwort auf etwas, das man gerade erfahren
          hat, und nicht als „noch mehr Schuhe".

          Die Saison steht als Feld am Modell und ist im CMS zu ändern
          (lib/saison.js). Führt der Katalog zu einer Saison kein Modell mit
          Beschreibung, fällt die Kollektion weg — sie steht nicht leer da. */}
      <section>
        {/* Der Einstieg: mittig, viel Luft, ein Gedanke. Er stand links mit
            Vorspann daneben — das liest sich wie ein Artikel, nicht wie der
            Beginn eines Kapitels. */}
        <div className="px-5 lg:px-16 pt-16 pb-10 lg:pt-28 lg:pb-14 text-center">
          <Enthuellen>
            <Kapitelmarke>Die Kollektionen</Kapitelmarke>
            <h2 className="satz-titel text-[31px] lg:text-[54px] leading-[1.14] mt-6 max-w-3xl mx-auto">
              Jede Form hat einen Grund. Meist einen älteren als wir.
            </h2>
          </Enthuellen>
          <Enthuellen verzoegerung={140}>
            <p className="text-[13px] lg:text-[15px] text-black/45 font-light leading-[2] mt-8 max-w-xl mx-auto">
              Die geschlossene Schnürung kommt von der Etikette, die offene vom
              kräftigen Spann, der Riemen vom Steigbügel.
            </p>
          </Enthuellen>
        </div>

        {katalogStatus === 'loading' && !kollektionen.length ? (
          <p className="px-5 lg:px-16 py-24 text-center text-[12px] text-black/30 font-light">
            Modelle werden geladen …
          </p>
        ) : katalogStatus === 'error' && !kollektionen.length ? (
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
            {kollektionen.map((kol) => (
              <Fragment key={kol.key}>
                {/* Vor jeder Saison außer der ersten eine Randnotiz: ein
                    Stichwort und eine Zeile, die sagt, worauf es in den
                    nächsten Monaten ankommt. */}
                {kol.notiz && <Notiz {...kol.notiz} />}

                <SaisonKopf marke={kol.marke} titel={kol.titel} />

                {kol.schuhe.map(({ schuh, form }) => (
                  <Fragment key={schuh.id}>{kapitelInhalt(schuh, form)}</Fragment>
                ))}
              </Fragment>
            ))}
          </div>
        )}

        {/* Die Auswahl.

            Hier standen drei Kachelreihen, eine je Jahreszeit, mit dem
            Rest der Modelle dieser Saison. Sie hatten zwei Fehler: Sie
            zeigten immer nur einen Ausschnitt, und sie waren nach einem
            Begriff sortiert, nach dem niemand sucht — ein Käufer denkt
            „Loafer", nicht „Sommer".

            Jetzt steht am Ende des Kapitels eine Zeile, in der alle
            achtundvierzig Modelle liegen, geordnet nach der Form. Die
            Kapitel darüber führen heran, diese Zeile lässt wählen; das
            eine ersetzt das andere nicht. */}
        <Modellwahl
          shoes={shoes}
          oeffnen={sch => navigate(shoePath(sch))}
          zumKatalog={zurKollektion}
        />

        {/* Die letzte Notiz, nach der dritten Kollektion: der eine Hinweis,
            den jeder braucht, der zum ersten Mal ein solches Paar trägt. */}
        <Notiz
          letzte
          marke="Zur ersten Woche"
          text="Eine neue Ledersohle ist glatt. Auf nassem Stein die ersten Tage vorsichtig."
        />

        {/* Der Abschluss des Abschnitts: der Weg in den ganzen Katalog.

            „Und außerdem" stand hier als eigene Kachelreihe. Sie ist weg —
            seit die Modelle nach Saison geordnet sind, steht jedes in seiner
            Kollektion, und eine Restekiste dahinter hätte nur wiederholt,
            was oben schon steht. */}
        <Enthuellen verzoegerung={120}>
          <div className="px-5 lg:px-16 pb-20 lg:pb-32 text-center">
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
            <PreisFuss className="mt-10" />
          </div>
        </Enthuellen>
      </section>

      {/* ══ 6 · Das Leder ═════════════════════════════════════════════════
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
                Dein Handrücken ist genauso gebaut, nur dünner: oben die feine
                Zeichnung, darunter ein Geflecht aus Fasern. Wo die Gerberei eine Haut
                teilt, entscheidet sich, wie dein Paar in zehn Jahren aussieht.
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
              „Vollnarbig" heißt: Diese oberste Schicht ist ganz geblieben,
              ungeschliffen und ohne Folie darüber. Ein Kratzer darin lässt sich
              auspolieren, wie eine Schramme, die verheilt.
            </p>
          </Enthuellen>

          {/* Die drei Leder als Blätter, nicht als Kacheln: eine Nummer, ein
              Name, eine Herkunftszeile, ein Absatz. Getrennt durch eine feine
              Linie oben, nicht durch einen Rahmen ringsum — ein Rahmen macht
              aus einem Absatz eine Karte, und aus drei Karten ein Regal. */}
          <div className="grid sm:grid-cols-3 gap-10 lg:gap-14 mt-16 lg:mt-24">
            {lederFamilien.map((l, i) => (
              <Enthuellen key={l.name} verzoegerung={i * 90} className="h-full">
                {/* h-full und mt-auto: Die drei Absätze sind verschieden lang,
                    und ohne das säßen die drei Namenszeilen auf drei
                    verschiedenen Höhen. Drei Haarlinien, die nicht fluchten,
                    sehen aus wie ein Fehler. */}
                <div className="pt-6 border-t border-black/[0.12] h-full flex flex-col">
                  <p className="text-[10px] tracking-[0.3em] text-black/30">
                    {String(i + 1).padStart(2, '0')}
                  </p>
                  <p className="satz-titel text-[19px] lg:text-[23px] text-black leading-[1.3] mt-4">
                    {l.name}
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-black/40 mt-3">
                    {l.herkunft}
                  </p>
                  <p className="text-[12px] lg:text-[13px] text-black/50 font-light leading-[1.9] mt-5 mb-8">
                    {l.text}
                  </p>
                  {/* Die Namen aus dem Katalog. Sie stehen unter dem Absatz und
                      nicht darüber: Erst soll man wissen, worum es sich
                      handelt, dann, wie es im Konfigurator heißt. */}
                  {l.namen.length > 0 && (
                    <p className="text-[11px] text-black/40 font-light leading-[1.9] mt-auto pt-4 border-t border-black/[0.07]">
                      {l.namen.join('   ·   ')}
                    </p>
                  )}
                </div>
              </Enthuellen>
            ))}
          </div>

          <Enthuellen verzoegerung={140}>
            <p className="text-[12px] text-black/40 font-light mt-12 lg:mt-16 max-w-xl">
              Was unterhalb der Spaltlinie bleibt, wird auch zu Schuhen, mit
              aufgeprägter Narbung. Im Laden sieht man den Unterschied kaum, im
              dritten Jahr jeder.
            </p>
          </Enthuellen>

          <ZurKollektion
            className="mt-14 lg:mt-20"
            satz="Welches dieser Leder zur Wahl steht, hängt am Modell."
            auf={zurKollektion}
          />
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
            <h2 className="satz-titel text-[29px] lg:text-[48px] leading-[1.14] mt-4">
              Sechs Entscheidungen,<br className="hidden sm:block" /> dann gehört er dir.
            </h2>
          </Enthuellen>
          <Enthuellen verzoegerung={120}>
            <p className="text-[13px] lg:text-[15px] text-black/50 font-light leading-[1.9] mt-6">
              Der Konfigurator merkt sich jeden Stand. Verbindlich wird es erst an
              der letzten Station.
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
                    Rund vier Wochen, einzeln gefertigt in Almansa. Du hörst von uns,
                    wenn dein Paar die Werkstatt verlässt — und auch dann, wenn es
                    länger wird. Versand innerhalb Deutschlands inbegriffen.
                  </p>
                  <p className="text-[11px] text-black/35 font-light leading-relaxed mt-4 max-w-lg">
                    Ein Paar, das für einen bestimmten Fuß gebaut ist, lässt sich nicht
                    zurückgeben. Stimmt etwas nicht, fertigen wir neu, ohne Kosten für
                    dich. Einzelheiten in den AGB.
                  </p>
                </div>
              </li>
            </Enthuellen>
          </ol>

          <ZurKollektion
            className="mt-4"
            satz="Die erste dieser sechs Entscheidungen ist die Form."
            auf={zurKollektion}
          />
        </div>
      </section>

      {/* ══ 8 · Almansa ═══════════════════════════════════════════════════
          Die Frage, die jeder stellt, der eben sechs Entscheidungen gelesen
          hat: „Und dann warte ich einen Monat?"

          Sie lässt sich auf zwei Arten beantworten. Man kann sich
          entschuldigen — dann klingt die Wartezeit wie ein Mangel, den man in
          Kauf nimmt. Oder man sagt, woran die Wochen liegen. Genau das ist
          der Unterschied zwischen einer langen Lieferzeit und einem Schuh,
          der gebaut wird: Wer weiß, dass gespanntes Leder Tage braucht, bis
          es die Form behält, wartet nicht mehr auf eine Sendung, sondern auf
          ein Stück Arbeit, das noch läuft.

          Der Ort steht hier zum ersten Mal ausgeschrieben. Vorher hieß es
          „Spanien", und das ist die Angabe, die jede zweite Marke macht.
          Almansa ist überprüfbar, und überprüfbar ist der einzige Ton, den
          diese Seite hat.

          Was hier NICHT steht und auch nicht hineingehört: der Name der
          Werkstatt, ihr Alter, wie viele dort arbeiten. Was wir über den Ort
          sagen, gilt der Stadt und ist nachzulesen; was über das Warten
          gesagt wird, gilt dem Handwerk und nicht diesem Haus.

          Dunkel gesetzt wie der Aufmacher und das Handwerk. Die drei tragen
          die Seite, und sie sollen als dieselbe Stimme erkennbar sein. */}
      <section className="relative overflow-hidden bg-[#111] text-white">
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(110% 80% at 80% 0%, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0) 60%)' }}
          aria-hidden="true"
        />
        <div className="relative px-5 lg:px-16 py-16 lg:py-28">
          <div className="max-w-6xl mx-auto">
            <div className="lg:grid lg:grid-cols-12 lg:gap-16 lg:items-end">
              <Enthuellen className="lg:col-span-6">
                <Kapitelmarke hell>Almansa · Produktionszeit</Kapitelmarke>
                <h2 className="satz-titel text-[29px] lg:text-[48px] leading-[1.14] mt-4">
                  Was in diesen<br className="hidden sm:block" /> vier Wochen passiert.
                </h2>
              </Enthuellen>

              <Enthuellen verzoegerung={120} className="lg:col-span-5 lg:col-start-8 mt-7 lg:mt-0">
                <p className="text-[13px] lg:text-[15px] text-white/55 font-light leading-[1.95]">
                  Almansa liegt in der Provinz Albacete und ist eine der Städte, in
                  denen Spanien seine Schuhe macht. Dort wird deiner gebaut — nicht
                  aus einem Regal geholt, sondern angefangen, wenn deine Bestellung
                  ankommt.
                </p>
              </Enthuellen>
            </div>

            {/* Der Satz, der die Wartezeit umdreht.

                Er steht groß und allein, weil er das Einzige auf dieser Seite
                ist, was eine Schwäche in ein Argument verwandelt. Und weil er
                etwas sagt, das man nur weiß, wenn man zugesehen hat. */}
            <Enthuellen verzoegerung={180}>
              <p className="satz-titel text-[20px] lg:text-[30px] text-white/90 leading-[1.45] mt-14 lg:mt-24 max-w-3xl">
                Den längsten Teil dieser Zeit steht dein Schuh auf dem Leisten
                und tut nichts.
              </p>
            </Enthuellen>

            <div className="mt-10 lg:mt-14 lg:grid lg:grid-cols-12 lg:gap-16">
              <Enthuellen verzoegerung={220} className="lg:col-span-6">
                <p className="text-[13px] lg:text-[15px] text-white/55 font-light leading-[1.95]">
                  Zuschneiden und Zwicken sind eine Sache von Tagen. Danach muss das
                  Leder, das über die Form gespannt wurde, sie annehmen. Nimmt man es
                  zu früh herunter, zieht es sich zurück und die Kappe verliert ihre
                  Linie. Dieses Stehen lässt sich nicht abkürzen — es ist der Grund,
                  warum dein Paar nicht nächste Woche kommt, und derselbe Grund,
                  warum es in zehn Jahren noch seine Form hat.
                </p>
              </Enthuellen>

              <Enthuellen verzoegerung={280} className="lg:col-span-5 lg:col-start-8 mt-7 lg:mt-0">
                <p className="text-[13px] lg:text-[15px] text-white/55 font-light leading-[1.95]">
                  Bis dahin gibt es dein Paar nur als Bestellung. Es liegt in keinem
                  Lager, es wird für niemand sonst gebaut, und es verlässt Almansa in
                  einem einzigen Karton.
                </p>
                {/* Der Satz, der die Zahl ehrlich macht.

                    Eine Werkstatt, die einzeln baut, hat Wochen, in denen ein
                    Leder fehlt oder eine Sohle zweimal gemacht werden muss.
                    Wer das verschweigt und dann fünf Wochen braucht, hat
                    einen Satz gebrochen; wer es hinschreibt, hat keinen. Das
                    ist dieselbe Rechnung wie in Kapitel 10. */}
                <p className="text-[12px] lg:text-[13px] text-white/45 font-light leading-[1.9] mt-8">
                  Vier Wochen sind der Normalfall und keine Zusage. Fehlt ein Leder
                  oder muss eine Sohle zweimal gemacht werden, werden fünf daraus.
                  Dann hörst du das von uns, sobald wir es wissen — und nicht erst,
                  wenn du fragst.
                </p>
                <p className="text-[11px] text-white/30 font-light leading-[1.9] mt-5">
                  Einzelne Modelle sind vorbereitet und in rund zwei Wochen fertig.
                  Am Modell steht, welche.
                </p>
              </Enthuellen>
            </div>

            <ZurKollektion
              className="mt-14 lg:mt-20"
              hell
              satz="Angefangen wird, sobald du dich für eine Form entschieden hast."
              auf={zurKollektion}
            />
          </div>
        </div>
      </section>


      {/* ══ 9 · Die Pflege ════════════════════════════════════════════════
          Das Kapitel, das nach dem Kauf anfängt — und genau deshalb steht es
          davor.

          Wer 1.300 Euro für ein Paar ausgibt, will wissen, dass es hält. Die
          vorigen Kapitel haben das über die Machart beantwortet: Rahmen,
          Doppelnaht, neu besohlbar. Was sie offenlassen, ist der Teil, der an
          ihm selbst hängt. Und der entscheidet mehr über die nächsten zehn
          Jahre als jede Naht: Ein rahmengenähter Schuh ohne Spanner ist nach
          zwei Jahren ein Schuh mit einer Kerbe über dem Ballen, und die geht
          nicht mehr weg.

          Der Abschnitt schließt damit den Bogen, den das Lederkapitel
          aufmacht. Dort heißt es, eine Haut sei wie die eigene; hier kommt,
          was daraus folgt. Ohne das Lederkapitel wäre das ein Zubehörregal —
          mit ihm ist es der Satz, den man ohnehin schon denkt.

          ── Warum hier ein Tag erzählt wird ───────────────────────────────

          Die Folge hieß einmal: feucht nach Hause, Spanner hinein, Form
          kommt zurück, Zedernholz zieht, Creme. Fünf richtige Angaben über
          ein Ding — und damit eine Gebrauchsanweisung. Niemand liest eine
          Gebrauchsanweisung, bevor er gekauft hat.

          Jetzt ist es derselbe Inhalt als Tag: morgens, tagsüber, abends,
          über Nacht. Dieselben Abstände, dieselben Handgriffe, aber der, der
          sie liest, kommt darin vor. Das ist der Unterschied zwischen „so
          pflegt man Schuhe" und „so ist es, diese Schuhe zu haben" — und es
          ist der letzte Abschnitt vor dem Knopf, an dem sich jemand selbst
          in einem Paar sehen kann.

          Die Zeichnung macht denselben Tag mit: Sie beginnt jetzt mit dem
          Schuh in Ordnung, die Falte entsteht im zweiten Schritt beim Gehen,
          und erst im dritten fährt der Spanner ein. Vorher stand die Falte
          schon im ersten Bild — hübsch und falsch herum.

          Und es ist die ehrlichste Stelle, um Spanner und Pflege-Sets zu
          zeigen: nicht als Zusatzverkauf neben dem Knopf, sondern als
          Antwort auf eine Frage, die zwei Absätze vorher entstanden ist.
          Namen und Preise kommen aus dem Katalog (siehe zubehoer).

          Zur Folge selbst — warum sie dieselbe Mechanik hat wie der Aufbau
          und trotzdem anders aussieht — steht alles in PflegeFolge.jsx. */}
      <section className="bg-[#fafaf9] border-y border-black/[0.06]">
        <PflegeFolge
          kopf={
            <>
              <Kapitelmarke>Die Pflege</Kapitelmarke>
              <h2 className="satz-titel text-[29px] lg:text-[48px] leading-[1.14] mt-4 max-w-2xl">
                Auch diese Haut<br className="hidden sm:block" /> will gepflegt werden.
              </h2>
              <p className="text-[13px] lg:text-[15px] text-black/50 font-light leading-[1.95] mt-7 max-w-lg">
                Morgens schlüpfst du hinein, tagsüber denkst du nicht an sie, und
                abends entscheiden fünf Minuten, ob aus der Falte über dem Ballen
                eine Linie wird oder eine Kerbe.
              </p>
            </>
          }
          fuss={
            <>
              {zubehoer.length > 0 && (
                <div className="grid sm:grid-cols-3 gap-10 lg:gap-14">
                  {zubehoer.map(({ key, satz, ware }) => (
                    <div key={key} className="pt-6 border-t border-black/[0.12]">
                      <p className="satz-titel text-[18px] lg:text-[21px] text-black leading-[1.3]">
                        {ware.name}
                      </p>
                      <p className="text-[11px] text-black/40 font-light mt-2">
                        {euro(ware.price)}
                      </p>
                      <p className="text-[12px] lg:text-[13px] text-black/50 font-light leading-[1.9] mt-4">
                        {satz}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Die einzige Tür dieser Seite, die nicht in die Kollektion
                  führt — deshalb steht ein anderes Wort darauf. */}
              <ZurKollektion
                className="mt-14 lg:mt-20"
                satz="Für Stiefel gibt es den hohen Spanner, der auch den Schaft hält."
                wort="Zubehör ansehen"
                auf={() => navigate('/accessories')}
              />
            </>
          }
        />
      </section>


      {/* ══ 10 · In eigener Sache ══════════════════════════════════════════
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
              wie in jeder Manufaktur dieser Preisklasse. Von Hand kommen Zuschnitt,
              Zwicken und Finish.
            </p>
          </Enthuellen>

          <Enthuellen verzoegerung={180}>
            <p className="text-[14px] lg:text-[16px] text-black/60 font-light leading-[1.9] mt-5">
              Der Unterschied zum geklebten Schuh spricht für sich. Er braucht kein
              Wort, das ihn größer macht.
            </p>
          </Enthuellen>

          <ZurKollektion
            className="mt-10"
            satz="Und jetzt sieh es dir selbst an."
            auf={zurKollektion}
          />
        </div>
      </section>

      {/* ══ 11 · Der Anfang ═══════════════════════════════════════════════
          Ein Weg, nicht drei. Wer bis hierher gelesen hat, sucht keine
          Auswahl mehr, sondern die Stelle, an der es losgeht. */}
      <section className="relative overflow-hidden bg-[#0E0E0E]">
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(110% 80% at 50% 0%, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0) 60%)' }}
          aria-hidden="true"
        />
        <div className="relative px-5 lg:px-16 py-24 lg:py-36 text-center">
          <Enthuellen>
            <h2 className="satz-titel text-[29px] lg:text-[50px] leading-[1.14] text-white max-w-2xl mx-auto">
              Sechs Entscheidungen.<br className="hidden sm:block" /> Fang mit der ersten an.
            </h2>
          </Enthuellen>
          <Enthuellen verzoegerung={120}>
            <p className="text-[13px] lg:text-[14px] text-white/55 font-light mt-5 max-w-md mx-auto leading-relaxed">
              Die Form zuerst, alles andere baut darauf auf. Konfigurieren kostet
              nichts — gebaut wird erst, wenn du es sagst.
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
