/**
 * Größensysteme — von der Fußlänge zur Zahl, die anderswo draufsteht.
 *
 * ── Warum gerechnet und nicht abgetippt ───────────────────────────────────
 *
 * Der naheliegende Weg wäre eine Tabelle je Haus: „Bei Crockett & Jones
 * tragen Sie 8, bei Church's 8½." Solche Tabellen kursieren zuhauf, nur
 * stammen sie fast nie vom Hersteller, widersprechen einander um bis zu einer
 * ganzen Größe und altern still. Bei einem Schuh, der eigens gefertigt wird
 * und nicht umgetauscht werden kann, ist eine falsche halbe Größe kein
 * Schönheitsfehler, sondern der Grund für eine Rücksendung.
 *
 * Deshalb steht hier kein abgeschriebener Tabellensatz, sondern das, was den
 * Tabellen zugrunde liegt — drei veröffentlichte Rechenregeln und die
 * Auskunft der Häuser, in welchem System sie nummerieren:
 *
 *   Barleycorn (UK)   Eine Größe ist ein Gerstenkorn, ein Drittel Zoll
 *                     (8,47 mm). Erwachsenengröße = 3 × Fußlänge in Zoll − 23.
 *   Brannock (US)     Dieselbe Schrittweite, anderer Nullpunkt:
 *                     US Herren = 3 × Zoll − 22. Also stets UK + 1.
 *   Pariser Stich (EU) Eine Größe ist zwei Drittel Zentimeter (6,67 mm), und
 *                     gemessen wird der LEISTEN, nicht der Fuß. Zwischen
 *                     beiden liegt die Zugabe für die Zehen — je nach Haus
 *                     rund 1,5 bis 2 cm. Genau daher rührt die Streuung.
 *   Mondopoint (JP)   Die Größe IST die Fußlänge in Zentimetern. Nichts zu
 *                     rechnen, nichts zu glauben.
 *
 * ── Zwei Gegenproben, und was die zweite ergab ────────────────────────────
 *
 * Nike gibt für US 10 einen Fuß von 27,1 cm an. Brannock ergibt
 * (10 + 22) / 3 = 10,67 Zoll = 27,09 cm. Die Regel trägt also auch dort, wo
 * niemand sie erwähnt.
 *
 * Die veröffentlichte Tabelle von Crockett & Jones dagegen weicht ab — und
 * zwar aufschlussreich. Ihre Schrittweite (UK 5 bis 13 über 6,7 cm) sind
 * 8,4 mm je Größe, das Gerstenkorn auf den Zehntelmillimeter. Der Nullpunkt
 * liegt aber durchgehend eine halbe Größe höher: Wo die Formel zu 259 mm
 * UK 7½ sagt, führt C&J dieselbe Zahl unter UK 8. Der Versatz ist über die
 * ganze Tabelle konstant, also kein Fehler, sondern Absicht — ihre
 * Fußlängenspalte enthält bereits etwas Luft.
 *
 * Deshalb geben wir UK und US als halbe Spanne aus, nicht als eine Zahl. Sie
 * umfasst beides: die reine Rechnung und die Hausangabe. Das ist keine
 * Ungenauigkeit, die wir uns leisten — es ist die Genauigkeit, die es gibt.
 * Eine einzelne Zahl zu nennen hieße, sich für eine der beiden zu
 * entscheiden, und die falsche Wahl schickt jemanden eine halbe Größe zu
 * klein in einen Schuh, den er nicht zurückgeben kann.
 *
 * Was hier bewusst NICHT steht: eine Zahl je Modell („bei Ihrem Sneaker X
 * nehmen Sie Y"). Die hängt am Leisten, nicht am System, und ließe sich nur
 * behaupten.
 *
 * Quellen (Stand August 2026):
 *   Gerstenkorn und UK-Formel        procalculator.co.uk, themetricmaven.com
 *   Brannock, US = 3 × Zoll − 22     brannock.com, calculator.net
 *   Pariser Stich, 2/3 cm, Zugabe    en.wikipedia.org/wiki/Paris_point
 *   Nike, US 10 ≙ 27,1 cm Fuß        nike.com/size-fit/mens-footwear
 *   C&J: UK-Nummerierung, E und G    crockettandjones.com/pages/size-guide-men
 *   Loake: UK, E/F/G/H               loake.com/pages/size-fit
 *   Church's: Herren UK, F/G/H       church-footwear.com
 *   Meermin: durchgehend UK          meermin.com/pages/size-guide-men
 */

const ZOLL_MM = 25.4

/** Halbe Größen, wie sie gehandelt werden. */
const aufHalbe = (n) => Math.round(n * 2) / 2

/** 7 → „7", 7.5 → „7½" */
export function groessenText(n) {
  if (!Number.isFinite(n)) return '—'
  const ganz = Math.floor(n)
  return n - ganz >= 0.5 ? `${ganz}½` : String(ganz)
}

/**
 * UK-Größe nach Gerstenkorn, als halbe Spanne.
 *
 * Untere Zahl: die reine Rechnung (3 × Zoll − 23). Obere Zahl: eine halbe
 * Größe darüber — dort führen die englischen Häuser dieselbe Fußlänge in
 * ihren eigenen Tabellen (siehe Kopfkommentar).
 */
export const ukAus = (mm) => {
  const roh = aufHalbe(3 * (mm / ZOLL_MM) - 23)
  return { von: roh, bis: roh + 0.5 }
}

/**
 * US-Herrengröße nach Brannock — dieselbe Schrittweite, Nullpunkt um eine
 * Größe versetzt. Deshalb liegt US immer genau eine Nummer über UK; die
 * verbreitete Angabe „UK + ½" ist die Damenrechnung.
 */
export const usAus = (mm) => {
  const roh = aufHalbe(3 * (mm / ZOLL_MM) - 22)
  return { von: roh, bis: roh + 0.5 }
}

/** Mondopoint: die Größe ist die Fußlänge in Zentimetern. */
export const jpAus = (mm) => Math.round(mm / 5) / 2

/**
 * EU nach Pariser Stich — als Spanne, nicht als Zahl.
 *
 * Gemessen wird der Leisten: (Fußlänge + Zehenzugabe) / 0,667. Die Zugabe
 * liegt je nach Haus bei etwa 1,5 bis 2 cm, und schon diese fünf Millimeter
 * machen eine dreiviertel Größe aus. Eine einzelne EU-Zahl zu nennen wäre
 * eine Genauigkeit, die es nicht gibt.
 */
export function euAus(mm) {
  const cm = mm / 10
  return {
    von: Math.round(1.5 * (cm + 1.5)),
    bis: Math.round(1.5 * (cm + 2.0)),
  }
}

/** Alles auf einmal, für die Vergleichsansicht. */
export function umrechnen(mm) {
  if (!Number.isFinite(mm) || mm <= 0) return null
  return { mm, uk: ukAus(mm), us: usAus(mm), jp: jpAus(mm), eu: euAus(mm) }
}

/**
 * Eine Spanne als Text. Fallen beide Enden zusammen, steht dort eine Zahl —
 * „42–42" liest sich wie ein Fehler.
 */
export const spanneText = (s, fmt = groessenText) =>
  !s ? '—' : (s.von === s.bis ? fmt(s.von) : `${fmt(s.von)}–${fmt(s.bis)}`)

/**
 * Wer in welchem System nummeriert — und was die Weitenbuchstaben dort
 * bedeuten.
 *
 * Der Weitenteil ist der eigentlich nützliche: Dieselben Buchstaben stehen je
 * nach Haus für verschiedene Weiten. Ein E ist bei Crockett & Jones die
 * Normalweite, bei Loake die schmale und bei Carmina liegt die Normalweite
 * erst bei EE. Wer seinen Buchstaben mitbringt, bringt ihn deshalb nicht
 * unbesehen zu uns herüber.
 */
export const HAEUSER = [
  {
    gruppe: 'Englische Rahmengenähte',
    beispiele: 'Crockett & Jones, Church’s, Loake, Meermin',
    system: 'uk',
    weiten: 'C&J: E normal, G weit · Loake: E schmal, F normal, G weit, H extraweit · Church’s: F, G, H',
    hinweis: 'Alle vier nummerieren in UK-Größen. Wer von dort kommt, hat seine Zahl bereits im richtigen System — die Umrechnung nach EU ist die Stelle, an der üblicherweise eine Größe verloren geht.',
  },
  {
    gruppe: 'Spanische Manufakturen',
    beispiele: 'Carmina, Meermin',
    system: 'uk',
    weiten: 'Carmina: D/E schmal, EE normal, EEE weit',
    hinweis: 'Ebenfalls UK-Nummerierung. Achtung bei den Weiten: Was dort EE heißt, ist die Normalweite — nicht die weite.',
  },
  {
    gruppe: 'Amerikanische Klassiker',
    beispiele: 'Allen Edmonds, Alden',
    system: 'us',
    weiten: 'B bis EEE, Weite gleichberechtigt neben der Länge',
    hinweis: 'Rechnen nach Brannock, also genau eine Nummer über UK. Die Weite steht dort wie bei uns als eigene Angabe — nicht als Zugabe zur Länge.',
  },
  {
    gruppe: 'Sneaker',
    beispiele: 'Nike, adidas, New Balance',
    system: 'us',
    weiten: 'meist nur eine Weite, teils D und 2E',
    hinweis: 'Nummeriert wird nach Brannock wie oben. Die Zentimeterzahl auf dem Karton ist aber die LEISTENLÄNGE, nicht Ihre Fußlänge — sie liegt gut einen Zentimeter darüber. Wer sie für seinen Fuß hält, bestellt eine Nummer zu klein.',
  },
]
