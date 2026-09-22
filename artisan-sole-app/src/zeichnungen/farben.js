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
 * Die volle Leiter auf dunklem Grund.
 *
 * ── Warum es vier Paletten gibt und nicht zwei ────────────────────────────
 *
 * Die Mappen dieser Seite malen auf zweierlei Art. Die einen (Querschnitt,
 * Maßnehmen) kommen mit `currentColor` und Deckkraft aus; ihnen genügen zwei
 * Werte, und dafür stehen TAFELFARBEN_HELL und TAFELFARBEN_DUNKEL. Die
 * anderen (Aufbau, Stapel, Pflege) malen über die ganze Leiter — Umriss,
 * Schaft, Futter, Sohle, Rahmen, Kante, Naht.
 *
 * Als der Stapel auf schwarzen Grund wanderte, bekam er TAFELFARBEN_DUNKEL,
 * und das war zu wenig: Gesetzt wurden nur `color` und `--as-label`, alle
 * übrigen Stufen fielen auf ihre Vorgaben zurück — und die sind für weißen
 * Grund gemacht. Der Schuh leuchtete weiß statt zu liegen.
 *
 * ── Warum gespiegelt und nicht einfach heller ─────────────────────────────
 *
 * Auf Weiß ist der Umriss das Dunkelste und die große Fläche das Hellste.
 * Auf Schwarz ist es umgekehrt: Der Umriss trägt das Bild und muss hell
 * sein, die Fläche liegt knapp über dem Grund. Dieselben acht Stufen,
 * von der anderen Seite gelesen — und dieselbe warme Brechung, damit die
 * Tafel zu #111 gehört und nicht nach Bildschirmgrau aussieht.
 */
export const TAFELFARBEN_STUFEN_DUNKEL = {
  '--as-line':   '#d6d2c8',  // Umrisse — auf Schwarz das Hellste
  '--as-light':  '#2a2824',  // Schaft, Sattel — knapp über dem Grund
  '--as-mid':    '#35322c',  // Futter
  '--as-tone':   '#43403a',  // Sohle, Holz, Werkzeug
  '--as-deep':   '#565249',  // Rahmen, Kanten
  '--as-dark':   '#6d685c',  // Absatzkante
  '--as-stitch': '#8a8375',  // Nähte
  '--as-label':  '#9b968a',  // Beschriftung
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
