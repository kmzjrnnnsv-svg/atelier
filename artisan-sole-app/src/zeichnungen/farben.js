/**
 * Die Farben der Zeichenmappe.
 *
 * Die gelieferten Tafeln malen nicht mit festen Farben, sondern mit
 * CSS-Eigenschaften und einem neutralen Grau als Rückfallwert. Das ist
 * genau die richtige Bauweise, und hier steht, was diese Seite daraus
 * macht: dieselbe Stufenleiter, nur ins Warme gezogen.
 *
 * Warum warm und nicht neutral: Der Grund dieser Seite ist #fafaf9 und
 * #fff, also gebrochenes Weiß mit einem Stich ins Gelbe. Ein neutralgrauer
 * Schnitt darauf sieht nicht sachlich aus, sondern kalt — wie ein
 * Bildschirmfoto aus einem anderen Programm. Dieselben Werte mit ein paar
 * Prozent Rot und Gelb darin, und die Tafel gehört zur Seite.
 *
 * Die Reihenfolge ist eine Leiter von hell nach dunkel; wer einen Wert
 * ändert, sollte die Nachbarn mitbewegen, sonst fällt die Abstufung um.
 */
export const TAFELFARBEN = {
  '--as-line':   '#33302a',  // Umrisse
  '--as-light':  '#efece4',  // Schaft, Sattel
  '--as-mid':    '#ded9cd',  // Futter
  '--as-tone':   '#cbc5b6',  // Sohle, Holz, Werkzeug
  '--as-deep':   '#b0a996',  // Rahmen, Kanten
  '--as-dark':   '#918a78',  // Absatzkante
  '--as-stitch': '#7d7668',  // Nähte
  '--as-label':  '#6d6658',  // Beschriftung
}
