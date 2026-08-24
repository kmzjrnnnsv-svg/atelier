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
    if (frei && !frei.has(g.key)) return false
    if (!rand && FARBGRUPPEN_SOHLE.includes(g.key)) return false
    if (!metall && g.key === 'buckle_color') return false
    return true
  })
}
