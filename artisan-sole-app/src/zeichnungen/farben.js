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

/**
 * Die Mappe auf hellem Grund.
 *
 * Wie die dunkle Fassung darunter, nur andersherum: Teile, die mit
 * `currentColor` malen, brauchen eine Farbe für die Zeichnung und eine für
 * die Beschriftung. Gebraucht wird sie beim Maßnehmen — das Kapitel steht
 * auf #fafaf9.
 *
 * Der Wert ist nicht schwarz, sondern dasselbe warme Dunkel wie `--as-line`
 * oben, eine Spur aufgehellt. Reines Schwarz auf gebrochenem Weiß sieht
 * hart aus und gehört nicht zu dieser Seite.
 */
export const TAFELFARBEN_HELL = {
  color: '#3a362e',         // die Zeichnung selbst
  '--as-label': '#6d6658',  // Beschriftung und Führungsstriche
}

/**
 * Dieselbe Tafel auf dunklem Grund.
 *
 * Der Querschnitt im Handwerkskapitel steht auf #111. Seine Teile malen mit
 * `currentColor` und brauchen deshalb nur zweierlei: eine Farbe für die
 * Zeichnung und eine für die Beschriftung. Beide sind warm gebrochen, damit
 * sie zum gebrochenen Weiß der übrigen Seite passen und nicht nach
 * Bildschirmgrau aussehen.
 */
export const TAFELFARBEN_DUNKEL = {
  color: '#dcd9d0',      // die Zeichnung selbst
  '--as-label': '#9b968a',  // Beschriftung und Führungsstriche
}
