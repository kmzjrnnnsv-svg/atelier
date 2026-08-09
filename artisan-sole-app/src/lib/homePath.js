/**
 * Startseite der jeweiligen Domain.
 *
 * Nach dem Abmelden landet man hier statt auf der Anmeldemaske: Wer sich
 * abmeldet, will die Seite meist weiter ansehen, nicht sofort wieder ein
 * Formular sehen.
 *
 * Bewusst als eigene Datei und nicht als weiterer Export in App.jsx — dort
 * stehen bereits die Komponenten, und jeder zusätzliche Nicht-Komponenten-
 * Export kostet dem Entwicklungsserver das schnelle Nachladen.
 */
// Immer die Wurzel der jeweiligen Domain, unabhängig von der Rolle. Vorher
// führte das Abmelden auf der Hauptdomain nach /collection — für einen
// Kunden dasselbe Ziel, aber ein Firmenkonto oder ein Vermittler landete
// damit im Verkauf, den beide gerade nicht sehen sollen. Die Wurzel leitet
// selbst weiter, wohin es gehört: artisansole.com in die Kollektion,
// business.artisansole.com auf die Firmenseite.
export const HOME_PATH = '/'
