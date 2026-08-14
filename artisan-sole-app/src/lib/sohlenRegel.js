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
export function sichtbareGruppen(gruppen, { product, soleKey } = {}) {
  const frei = expressFreigabe(product)
  const rand = hatLederrand(soleKey)
  return (Array.isArray(gruppen) ? gruppen : []).filter(g => {
    if (frei && !frei.has(g.key)) return false
    if (!rand && FARBGRUPPEN_SOHLE.includes(g.key)) return false
    return true
  })
}
