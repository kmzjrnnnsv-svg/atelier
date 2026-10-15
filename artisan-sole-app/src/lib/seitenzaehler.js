/**
 * seitenzaehler.js — eine Zahl je Tag und Seite, mehr nicht.
 *
 * ── Warum es überhaupt etwas zu zählen gibt ──────────────────────────────
 *
 * Der Laden hat Zahlen über alles, was bestellt wurde, und keine darüber, ob
 * überhaupt jemand kommt. Wer nicht weiß, ob die Startseite zehn oder
 * tausend Aufrufe hat, kann auch nicht beurteilen, ob der Weg in die
 * Kollektion zu lang ist.
 *
 * ── Warum es trotzdem kein Statistikwerkzeug ist ─────────────────────────
 *
 * Auf dem Hinweis zum Speichern steht in Fettschrift: „Keine Analyse, keine
 * Werbung, kein Tracking." Jedes übliche Werkzeug würde den Satz zur Lüge
 * machen, denn alle brauchen eine Kennung je Besucher — sonst lässt sich
 * „Besuch" nicht von „Aufruf" unterscheiden.
 *
 * Hier gibt es keine. Hinausgeschickt wird ein Pfad. Kein Kennzeichen, kein
 * Zeitstempel, keine Herkunft, keine Verweildauer, nichts im Speicher des
 * Geräts. Der Server legt die Zahl in eine Zeile aus Tag und Pfad, und der
 * Pfad wird vorher auf eine feste Liste gebracht — eine Adresse mit einer
 * Bestellnummer darin kommt dort nicht an.
 *
 * Deshalb gibt es hier auch nichts abzulehnen: Es wird nichts gespeichert,
 * was zu einem Menschen gehört. Ein Einwilligungsschalter davor würde
 * vortäuschen, es gäbe etwas zu entscheiden.
 *
 * ── Warum nicht apiFetch ─────────────────────────────────────────────────
 *
 * apiFetch hängt die Sitzung an, erneuert Token und wiederholt bei Fehlern.
 * Alles drei ist hier falsch: Der Zähler soll die Anmeldung nicht kennen,
 * und er darf nichts wiederholen und nichts aufhalten. Deshalb ein nacktes
 * fetch, ohne Zugangsdaten, mit `keepalive`, damit es auch noch rausgeht,
 * wenn die Seite gerade verlassen wird.
 *
 * `sendBeacon` wäre der naheliegende Weg und geht nicht: Der Server verlangt
 * bei schreibenden Aufrufen den Kopf `X-Requested-With`, und sendBeacon kann
 * keine Köpfe setzen.
 */
const BASIS = import.meta.env.VITE_API_URL ?? ''

/* Derselbe Pfad zweimal hintereinander ist meist React, das im
   Entwicklungsmodus jeden Effekt doppelt ausführt — und bei einem Zähler
   wäre das stillschweigend die doppelte Zahl. */
let zuletzt = null

export function seiteZaehlen(pfad) {
  if (!pfad || pfad === zuletzt) return
  zuletzt = pfad
  try {
    fetch(`${BASIS}/api/auswertung/aufruf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'ArtisanSole' },
      body: JSON.stringify({ pfad }),
      keepalive: true,
      credentials: 'omit',
    }).catch(() => {})
  } catch {
    /* Ein Zähler darf nie der Grund sein, dass eine Seite nicht erscheint. */
  }
}
