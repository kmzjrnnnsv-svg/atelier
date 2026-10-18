/**
 * sohlenRegel.js — welche Auswahlgruppen einem Kunden tatsächlich offenstehen.
 *
 * Zwei Einschränkungen laufen hier zusammen, und beide haben verschiedene
 * Ursachen:
 *
 *   1. Die Express-Linie. Am Modell steht, was trotz vorbereiteter Bauteile
 *      noch wählbar ist. Alles andere ist festgelegt, bevor der Kunde kommt.
 *
 *   2. Die Sohle. An einer durchgehenden Gummisohle gibt es keine Kante, die
 *      sich einfärben ließe, und keine Lederfläche darunter. Sohlenrand und
 *      Laufsohle sind dort gegenstandslos.
 *
 * Die zweite gilt für BEIDE Linien. Sie ist keine Regel des Angebots, sondern
 * eine des Schuhs: Auch am Maßschuh konnte man bisher eine Randfarbe wählen,
 * die es an einer Gummisohle nirgends gibt.
 *
 * Als eigene Datei, weil sich eine Regel, die darüber entscheidet, was
 * bestellbar ist, prüfen lassen muss — ohne dafür einen Konfigurator mit
 * einem Dutzend Schritten durchzuklicken.
 */

/**
 * Sohlen ohne Lederrand.
 *
 * Dainite steht bewusst nicht in dieser Liste: Die Gummistollen sitzen dort
 * üblicherweise auf einer Ledersohle, deren Rand sehr wohl gefärbt wird.
 * Ebenso wenig `leather_rubber` — eine Ledersohle mit Gummieinlage hat ihren
 * Rand behalten.
 */
export const OHNE_LEDERRAND = ['rubber', 'gummy_sole', 'commando', 'crepe', 'dots', 'rocky']

/** Die beiden Farbangaben an der Sohle — Kante und Lauffläche. */
export const FARBGRUPPEN_SOHLE = ['sole_color', 'sole_bottom_color']

/**
 * Gruppen, die feststehen: nicht gewählt, sondern gesetzt.
 *
 * Der Rahmen (Welt) ist an jedem Schuh des Hauses die schmale City-Naht.
 * „Country" und „Storm" standen im Konfigurator zur Wahl, ohne dass sie
 * gebaut werden — ein Schritt, der eine Entscheidung verlangte, die es nicht
 * gibt, und drei Kacheln, die vom Wesentlichen ablenkten.
 *
 * Der Wert verschwindet aus der Maske, nicht aus der Bestellung: Die
 * Werkstatt braucht die Angabe, und eine Bestellung, in der sie fehlt, wäre
 * unvollständig. Deshalb hier und nicht per Löschen der Gruppe —
 * `festeWerte()` trägt sie in die Spezifikation ein.
 */
export const FESTE_WERTE = { welt: 'city' }

/**
 * Was der Kunde nicht wählt, aber trotzdem bekommt.
 *
 * Liefert je festgelegter Gruppe die Zeile, die in Entwurf und Bestellung
 * geht — dieselbe Form wie ein gewählter Wert. Fehlt die Gruppe am Modell
 * oder der festgelegte Wert in ihr, fällt sie weg: Lieber keine Angabe als
 * eine erfundene.
 */
export function festeWerte(gruppen) {
  const liste = Array.isArray(gruppen) ? gruppen : []
  const raus = []
  for (const [gKey, vKey] of Object.entries(FESTE_WERTE)) {
    const g = liste.find(x => x.key === gKey)
    const v = g?.values?.find(x => x.key === vKey)
    if (g && v) raus.push({ group: g.label, key: g.key, value: v.label, price: 0 })
  }
  return raus
}

/**
 * Gruppen, die aus einer anderen Wahl folgen: nicht gewählt, sondern
 * abgeleitet.
 *
 * Der Sohlenrand richtet sich nach dem Oberleder. So macht es jede Werkstatt:
 * schwarzes Leder bekommt einen schwarzen Rand, braunes einen braunen,
 * rötliches einen ziegelroten. Ein Kunde, der vier Farbfelder für eine
 * millimeterschmale Kante vorgesetzt bekommt, muss eine Entscheidung treffen,
 * die er nicht treffen kann und die ein Schuhmacher ohnehin für ihn träfe —
 * und wählt er „Natural" zu einem schwarzen Schuh, ist das ein Fehlkauf, den
 * die Seite ihm angeboten hat.
 *
 * Wie bei FESTE_WERTE verschwindet die Gruppe aus der Maske, nicht aus der
 * Bestellung: `abgeleiteteWerte()` trägt den Rand ein.
 */
export const ABGELEITET = ['sole_color']

/* Aus einer Hexfarbe Farbton (Grad), Sättigung und Helligkeit (je 0 … 1). */
function hsl(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  h = (h * 60 + 360) % 360
  return { h, s, l }
}

/**
 * Welcher Rand zu welchem Leder gehört.
 *
 * Die Reihenfolge der Fragen ist die einer Werkstatt:
 *
 *   1. Fast schwarz → schwarz. Ein dunkles Leder mit hellerem Rand sieht
 *      aus, als stünde der Schuh auf einer fremden Sohle.
 *   2. Sehr hell (Weiß, Creme, Sand) → natural. Ein schwarzer Rand unter
 *      einem hellen Schuh zieht eine Linie, die das Auge nicht mehr loslässt.
 *   3. Kühle Töne (Grau, Blau, Grün, Oliv) → schwarz. Braun unter Marine
 *      sieht nach Verwechslung aus, Schwarz nach Absicht.
 *   4. Fast farblos, also grau → schwarz.
 *   5. Rötlich und kräftig (Bordeaux, Oxblood, Rotbraun) → brick.
 *   6. Alles übrige Warme (Dunkelbraun bis Cognac, Taupe) → brown.
 *
 * Die Grenzen sind an den Farbfeldern des Katalogs ausgerichtet und in
 * tests/sohlenregel.mjs festgehalten. Wer eine verschiebt, sieht dort, welche
 * Farbe dadurch den Rand wechselt.
 *
 * Ohne lesbare Farbe gibt es `null`; was dann gilt, entscheidet
 * abgeleiteteWerte().
 */
export function randfarbeFuer(hex) {
  const f = hsl(hex)
  if (!f) return null
  const { h, s, l } = f
  if (l < 0.11) return 'black'
  if (l > 0.72) return 'natural'
  const warm = h <= 50 || h >= 330
  if (!warm) return 'black'
  if (s < 0.10) return 'black'
  if ((h <= 14 || h >= 330) && s >= 0.35) return 'brick'
  return 'brown'
}

/**
 * Was aus dem Oberleder folgt — dieselbe Form wie festeWerte().
 *
 * Nur an einer Sohle mit Lederrand: An einer durchgehenden Gummisohle gibt es
 * keine Kante, die sich färben ließe, also auch keine Angabe dazu.
 *
 * Ist die Farbe nicht lesbar, gilt Schwarz. Das ist keine erfundene Angabe,
 * sondern die Vorgabe jeder Werkstatt, und sie ist hier besser als keine:
 * Die Gruppe ist kein Schritt mehr, eine fehlende Zeile hieße also eine
 * Bestellung ohne Randfarbe, und nach der würde die Werkstatt fragen.
 * Praktisch kommt es nicht vor — jede Farbe im Katalog hat ein Farbfeld.
 *
 * Der Preis ist immer null. Was der Kunde nicht wählt, kann er nicht
 * bezahlen müssen; trüge ein Rand im CMS einmal einen Aufpreis, wäre er hier
 * ein Betrag auf der Rechnung, zu dem es auf der Seite keine Entscheidung gab.
 */
export function abgeleiteteWerte(gruppen, { oberHex, soleKey } = {}) {
  if (!hatLederrand(soleKey)) return []
  const g = (Array.isArray(gruppen) ? gruppen : []).find(x => x.key === 'sole_color')
  const key = randfarbeFuer(oberHex) || 'black'
  const v = g?.values?.find(x => x.key === key)
  return g && v ? [{ group: g.label, key: g.key, value: v.label, price: 0 }] : []
}

/** Hat ein Wert etwas, das man sehen kann? Ein Farbfeld zählt als Bild. */
export const hatBild = (v) => Boolean(v?.image || v?.color_hex)

/**
 * Nur zur Wahl, was man sehen kann — aber nur dort, wo es etwas zu sehen gibt.
 *
 * In einer Gruppe mit Fotos standen Werte ohne Bild als Kachel mit drei
 * Buchstaben da: „DAI", „DOT", „BEV" neben „Leather" mit Foto. Das las sich
 * nicht als Auswahl, sondern als Lücke im Katalog, und wer eine Sohle wählt,
 * die er nie gesehen hat, kauft blind. Diese Werte fallen heraus.
 *
 * Was NICHT herausfällt, und warum jede Ausnahme zählt:
 *
 *   - Gruppen ganz ohne Bilder. Der Absatz (Standard / Höher) ist eine Wahl
 *     zwischen zwei Wörtern, nicht zwischen zwei Fotos. Die erste Fassung
 *     dieser Regel hat ihn gestrichen, und damit die Absatzwahl.
 *   - Festgelegte und abgeleitete Gruppen (Rahmen, Sohlenrand). Sie sind
 *     kein Schritt, gehen aber in die Bestellung. Fiele der Rahmen heraus,
 *     weil er kein Bild hat, fehlte er still auf dem Werkstattzettel.
 *   - Ein ausdrücklich festgelegter Wert (`behalten`), etwa die feste
 *     Ausführung eines Stil-Loafers. Sie gehört zum Modell.
 *
 * Bekommt ein Wert im CMS ein Bild, steht er beim nächsten Laden wieder da.
 */
export function nurMitBild(gruppe, { behalten = null } = {}) {
  if (!gruppe) return gruppe
  if (gruppe.key in FESTE_WERTE || ABGELEITET.includes(gruppe.key)) return gruppe
  const werte = Array.isArray(gruppe.values) ? gruppe.values : []
  if (!werte.some(hatBild)) return gruppe
  return { ...gruppe, values: werte.filter(v => hatBild(v) || (behalten && v.key === behalten)) }
}

/** Hat eine Lederfarbe ein Bild: ein eigenes Muster oder eine Aufnahme des Modells. */
export const hatFarbBild = (c) => Boolean(
  c?.image || c?.images?.length || c?.buckets?.some(b => b?.images?.length)
)

/**
 * Dieselbe Regel für die Lederfarben: Hat ein Leder Farben mit Bild, stehen
 * nur diese zur Wahl. Die alten Farbflächen ohne Muster sahen neben den
 * Ledertexturen aus wie Platzhalter, und ein Schwarz stand doppelt da, einmal
 * als Fläche, einmal als Leder. Ein Leder ganz ohne Bilder (die Mokassins,
 * bis es ihre Muster gibt) behält seine Flächen.
 */
export function farbenMitBild(farben) {
  const liste = Array.isArray(farben) ? farben : []
  return liste.some(hatFarbBild) ? liste.filter(hatFarbBild) : liste
}

/** Englische und deutsche Farbnamen auf ein Wort gebracht, für den Abgleich. */
const FARBWORT = {
  black: 'schwarz', 'dark brown': 'dunkelbraun', darkbrown: 'dunkelbraun',
  'medium brown': 'mittelbraun', medbrown: 'mittelbraun', brown: 'mittelbraun', braun: 'mittelbraun',
  burgundy: 'bordeaux', camel: 'kamel', grey: 'grau', gray: 'grau', navy: 'marine',
  'navy blue': 'marine', dunkelblau: 'marine', red: 'rot', green: 'grün', olive: 'oliv',
  'forest green': 'waldgrün', oxblood: 'ochsenblut', yellow: 'gelb', purple: 'lila',
  beige: 'beige', sand: 'sand', khaki: 'khaki', cognac: 'cognac', tan: 'cognac',
}
export const farbWort = (name) => {
  const n = String(name || '').trim().toLowerCase().replace(/\s+/g, ' ')
  return FARBWORT[n] || n
}

/**
 * Das Ledermuster für eine Farbe, die selbst keins hat.
 *
 * Modelle mit eigenen Farbstrecken (Fotos des Schuhs je Farbe) führen ihre
 * Farben als Varianten. Deren erstes Foto taugt als Großbild, nicht als
 * Muster: Ein kleiner Kreis mit einem ganzen Schuh darin ist nicht zu lesen.
 * Gesucht wird deshalb die gleichnamige Farbe desselben Leders aus dem
 * Musterkatalog; gibt es keine, bleibt es beim Foto.
 */
export function musterFuer(farbe, lederKey, katalog) {
  if (!farbe || farbe.image) return farbe?.image || null
  if (!lederKey || !Array.isArray(katalog)) return null
  const wort = farbWort(farbe.name)
  const treffer = katalog.find(c => c.image
    && String(c.applicable_materials || '').split(',').map(x => x.trim()).includes(lederKey)
    && farbWort(c.name) === wort)
  return treffer?.image || null
}

/**
 * Aufsätze auf dem Spann, an denen Metall sitzt.
 *
 * Nur bei ihnen gibt es einen Metallton zu wählen. „Ohne", „Maske" und
 * „Quasten" tragen keines — die Frage nach Gold oder Nickel ginge dort ins
 * Leere, und der Kunde bekäme eine Angabe in die Bestellung, die an seinem
 * Schuh nirgends zu sehen ist.
 */
export const AUFSATZ_MIT_METALL = ['metal_bit', 'horsebit']

/**
 * Steht am Modell überhaupt ein Metallton zur Wahl?
 *
 * `deko` ist die gewählte Ausführung, `hatDekoGruppe` sagt, ob es diese Wahl
 * an dem Modell gibt. Der Unterschied zählt: Am Double Monk gibt es keine
 * Ausführung zu wählen, dort sitzt IMMER eine Schnalle — die Frage nach dem
 * Metall bleibt also stehen. Am Loafer und am Sport-Mokassin hängt sie
 * davon ab, was auf dem Spann sitzt.
 */
export const hatMetall = (deko, hatDekoGruppe) =>
  !hatDekoGruppe || !deko || AUFSATZ_MIT_METALL.includes(deko)

/** Hat diese Sohlen-Art einen Rand, den man färben kann? */
export const hatLederrand = (soleKey) => !soleKey || !OHNE_LEDERRAND.includes(soleKey)

/**
 * Was die Express-Linie eines Modells offenlässt.
 *
 * Gibt `null` zurück, wenn das Modell keiner Express-Linie angehört — dann
 * gilt keine Einschränkung. Ein leeres Set dagegen heißt: nichts ist wählbar,
 * der Kunde bestimmt nur Größe und Weite.
 */
export function expressFreigabe(product) {
  if (Number(product?.express) !== 1) return null
  try {
    const l = JSON.parse(product?.express_groups || '[]')
    return new Set(Array.isArray(l) ? l.filter(x => typeof x === 'string') : [])
  } catch {
    // Ein unlesbarer Wert schränkt auf nichts ein statt auf alles: Lieber
    // zeigt der Konfigurator zu wenig, als dass er etwas verspricht, das die
    // Werkstatt nicht halten kann.
    return new Set()
  }
}

/**
 * Die Gruppen, die dem Kunden wirklich angeboten werden.
 *
 * `gruppen` sind die am Modell hinterlegten Auswahlgruppen, `soleKey` die
 * gerade gewählte Sohlen-Art (oder null, solange keine gewählt ist).
 */
export function sichtbareGruppen(gruppen, { product, soleKey, dekoKey } = {}) {
  const frei = expressFreigabe(product)
  const rand = hatLederrand(soleKey)
  const liste = Array.isArray(gruppen) ? gruppen : []
  const hatDeko = liste.some(g => g.key === 'loafer_decoration')
  const metall = hatMetall(dekoKey, hatDeko)
  return liste.filter(g => {
    if (g.key in FESTE_WERTE) return false
    if (ABGELEITET.includes(g.key)) return false
    if (frei && !frei.has(g.key)) return false
    if (!rand && FARBGRUPPEN_SOHLE.includes(g.key)) return false
    if (!metall && g.key === 'buckle_color') return false
    return true
  })
}
