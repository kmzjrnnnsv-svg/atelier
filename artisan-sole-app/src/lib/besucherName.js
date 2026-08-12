/**
 * Der Vorname, den jemand beim Einstieg nennt.
 *
 * Bewusst `sessionStorage` und nicht `localStorage`: Der Zwischenspeicher der
 * Sitzung ist leer, sobald der Tab geschlossen wird — von selbst, ohne dass
 * wir etwas löschen müssten. Was gar nicht erst dauerhaft abgelegt wird, kann
 * auch nicht vergessen werden.
 *
 * Und er geht **nie an den Server**. Er dient allein dazu, die nächsten Folien
 * anzusprechen. Ohne Übertragung gibt es keine Verarbeitung durch uns — das
 * ist datenschutzrechtlich der sauberste Fall, den es gibt, und genau so steht
 * es in der Datenschutzerklärung.
 *
 * Erst bei einer Registrierung wird daraus ein gespeicherter Name: Das
 * Formular liest ihn hier aus und füllt das Feld vor. Gespeichert wird er dann
 * durch das Absenden, wie jede andere Angabe auch.
 */
const SCHLUESSEL = 'as_vorname'

/** Nur der Vorname, gekürzt und von Unfug befreit. */
export function nameSaeubern(roh) {
  return String(roh || '')
    .replace(/[<>{}[\]\\/]/g, '')   // nichts, was in einer Überschrift stören könnte
    .trim()
    .split(/\s+/)[0] || ''          // ein Wort genügt; wir grüßen, wir adressieren nicht
}

export function nameMerken(vorname) {
  const sauber = nameSaeubern(vorname).slice(0, 30)
  try {
    if (sauber) sessionStorage.setItem(SCHLUESSEL, sauber)
    else sessionStorage.removeItem(SCHLUESSEL)
  } catch { /* privater Modus: dann eben nur für diese Seite */ }
  return sauber
}

export function nameLesen() {
  try { return sessionStorage.getItem(SCHLUESSEL) || '' } catch { return '' }
}

export function nameVergessen() {
  try { sessionStorage.removeItem(SCHLUESSEL) } catch { /* egal */ }
}
