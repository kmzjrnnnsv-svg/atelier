/**
 * Adresse der Produktseite eines Modells.
 *
 * Bevorzugt die sprechende Form /schuhe/heritage-oxford. Sie ist lesbar,
 * lässt sich verschicken und sagt schon im Link, worum es geht.
 *
 * Der Rückfall auf /customize?id=13 bleibt bestehen, solange ein Modell noch
 * keinen Slug trägt — etwa unmittelbar nach dem Anlegen, bevor die Liste im
 * Store neu geladen wurde. Beide Formen führen zur selben Seite; die alte
 * schreibt sich dort selbst auf die neue um.
 */
export function shoePath(shoe) {
  if (shoe?.slug) return `/schuhe/${shoe.slug}`
  return `/customize?id=${shoe?.id ?? ''}`
}
