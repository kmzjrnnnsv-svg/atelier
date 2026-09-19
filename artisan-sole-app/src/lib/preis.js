/**
 * preis.js — aus „€ 1.450" wird 1450 und zurück.
 *
 * Die Preise kommen als fertig gesetzte Zeichenkette aus dem Katalog, nicht
 * als Zahl: „€ 1.450", mit Währungszeichen und deutschem Tausenderpunkt. Das
 * ist für die Anzeige richtig — man kann sie unverändert hinschreiben — und
 * für jede Rechnung falsch. `Number('€ 1.450')` ergibt NaN, und wer das
 * übersieht, schreibt „ab € NaN" in seinen Laden.
 *
 * Denselben Umrechner trägt ShoeCollection.jsx noch einmal als lokale
 * Funktion. Er wird hier nicht dort herausgezogen, weil das eine Änderung an
 * der meistbesuchten Seite des Ladens für einen Nebeneffekt wäre; wer das
 * nächste Mal an den Preisen dieser Seite arbeitet, sollte sie auf diese
 * Datei umstellen und die Kopie löschen.
 */

/**
 * Der Zahlenwert hinter einer Preisangabe. 0, wenn nichts Brauchbares
 * dasteht — ein Preis, den man nicht lesen kann, darf keine Seite abstürzen
 * lassen.
 */
export function preisAlsZahl(wert) {
  if (wert == null || wert === '') return 0
  return parseFloat(
    String(wert)
      .replace(/[^0-9.,]/g, '')   // Währungszeichen und Leerraum weg
      .replace(/\./g, '')          // Tausenderpunkt weg
      .replace(',', '.'),          // Dezimalkomma auf Punkt
  ) || 0
}

/** Eine Zahl als Betrag in deutscher Schreibweise, ohne Nachkommastellen. */
export const preisAlsText = (n) =>
  Number(n).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
