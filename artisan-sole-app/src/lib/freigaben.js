/**
 * Was schon offen ist und was noch wartet.
 *
 * Ein Schalter an einer Stelle, keine Bedingung an dreißig. Wer den Bereich
 * öffnen will, setzt hier `true` und rollt aus — es muss nichts gesucht und
 * nichts rückgebaut werden.
 */

/**
 * Der Firmenbereich (Anmeldung, Übersicht, Kampagnen, Profil).
 *
 * Steht auf `false`: Die Erklärseiten bleiben erreichbar — sie sollen ja
 * Interesse wecken —, aber wer sich anmeldet, sieht einen Hinweis statt eines
 * halb betreuten Bereichs. Eine Sammelbestellung anzunehmen, die niemand
 * ausführen kann, kostet mehr Vertrauen als ein ehrliches „bald".
 *
 * Verwaltungsrollen kommen weiterhin durch. Sonst könnte niemand prüfen, was
 * er da freischaltet.
 */
export const FIRMENBEREICH_OFFEN = false
