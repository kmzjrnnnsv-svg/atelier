/**
 * bereiche.js — welche Bereiche einem Konto offenstehen.
 *
 * Ein Konto kann mehreres zugleich sein: Kunde und Affiliate, Kunde und
 * Firmenkonto. Das war schon immer so gedacht, nur führte kein Weg dorthin.
 * Wohin jemand gehört, entschied allein die Anmeldung — und danach saß er
 * fest. Ein Affiliate, der selbst ein Paar bestellen wollte, musste die
 * Adresse von Hand umschreiben; ein Kunde, der nebenbei vermittelt, kam an
 * seine Abrechnung nur über den Link aus der Einladung.
 *
 * Diese Datei sagt, welche Bereiche ein Konto tatsächlich hat und unter
 * welcher Adresse sie jeweils liegen. Wer nur einen hat, bekommt keinen
 * Umschalter zu sehen — ein Schalter mit einer Stellung ist kein Schalter.
 *
 * ── Warum die Adressen nicht überall gleich sind ──────────────────────────
 *
 * Der Affiliate-Bereich lebt auf affiliate.artisansole.com, der Laden auf der
 * Hauptdomain. Der Wechsel führt also über die Domaingrenze. Das trägt, weil
 * beide Seiten dieselbe Programmierschnittstelle unter artisansole.com
 * ansprechen: Die Sitzung hängt an deren Adresse, nicht an der, die im
 * Browserfenster steht. Wer auf der einen Seite angemeldet ist, ist es auf
 * der anderen auch.
 */
import { Capacitor } from '@capacitor/core'
import { FIRMENBEREICH_OFFEN } from './freigaben'

const HOST = typeof window !== 'undefined' ? window.location.hostname : ''
const istNativ = Capacitor.isNativePlatform()

// Nur auf der echten Affiliate-Domain führt der Weg in den Laden über eine
// vollständige Adresse. Auf dem Entwicklungsserver, in der Vorschau und in
// der App liegt beides unter demselben Ursprung — dort wäre ein Sprung auf
// artisansole.com ein Sprung aus der Anwendung heraus.
const aufAffiliateDomain = !istNativ && /^affiliate\.artisansole\.com$/i.test(HOST)

const LADEN_PFAD = aufAffiliateDomain ? 'https://artisansole.com/collection' : '/collection'

/**
 * Die Bereiche eines Kontos, in fester Reihenfolge.
 *
 * Der Laden steht vorn: Er ist der Bereich, den jedes Konto hat, und der
 * einzige, den man auch ohne Anmeldung sieht.
 */
export function bereicheFuer(user) {
  if (!user) return []

  const verwaltung = user.role === 'admin' || user.role === 'curator'
  const liste = [{
    schluessel: 'laden',
    name: 'Laden',
    hinweis: 'Kollektion ansehen, Maß nehmen, bestellen',
    pfad: LADEN_PFAD,
    // Alles unterhalb des Ladens gehört zum Laden — die Kollektion, das
    // Zubehör, der Warenkorb, das eigene Profil. Deshalb gilt hier nicht der
    // genaue Pfad, sondern alles, was nicht einem anderen Bereich gehört.
    passt: (pfad) => !pfad.startsWith('/affiliate') && !pfad.startsWith('/business/') && !pfad.startsWith('/cms'),
  }]

  if (user.is_affiliate) {
    liste.push({
      schluessel: 'affiliate',
      name: 'Affiliate-Bereich',
      hinweis: 'Ihr Code, vermittelte Paare, Auszahlungen',
      pfad: '/affiliate',
      passt: (pfad) => pfad.startsWith('/affiliate') && pfad !== '/affiliate-konto',
    })
  }

  // Der Firmenbereich ist noch nicht offen. Ihn hier trotzdem anzubieten,
  // führte auf den Hinweis „bald verfügbar" — ein Schalter, der nichts
  // schaltet. Verwaltungsrollen sehen ihn, weil sie prüfen müssen, was sie
  // freischalten. In der App fehlen die Firmenrouten ganz.
  if (user.is_business && !istNativ && (FIRMENBEREICH_OFFEN || verwaltung)) {
    liste.push({
      schluessel: 'firma',
      name: 'Firmenbereich',
      hinweis: 'Kampagnen und Sammelbestellungen',
      pfad: '/business/dashboard',
      passt: (pfad) => pfad.startsWith('/business/'),
    })
  }

  return liste
}

/** Welcher Bereich gerade offen ist. */
export function aktuellerBereich(bereiche, pfad) {
  return bereiche.find(b => b.passt(pfad)) || null
}
