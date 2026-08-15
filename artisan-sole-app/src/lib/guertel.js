/**
 * guertel.js — die Angaben zum Gürtel in Worte fassen.
 *
 * Steht getrennt von der Maske, weil beides an mehreren Stellen gebraucht
 * wird: im Konfigurator, im Fenster auf der Zubehörseite und beim Ablegen im
 * Warenkorb. Eine Datei mit Bauteilen UND Hilfsfunktionen bringt außerdem das
 * Neuladen im Betrieb durcheinander.
 *
 * Der Satz entsteht hier ein zweites Mal — dieselbe Form wie am Server
 * (`utils/guertel.js`). Das ist Absicht: Der Kunde soll ihn schon sehen,
 * bevor er bestellt. Maßgeblich ist trotzdem der vom Server; er ist es, der
 * in der Bestellung landet.
 */

/** Der Spielraum je Richtung: zwei Löcher à 3 cm. */
export const SPIELRAUM_CM = 6

export const eur = (v) => `€ ${Number(v || 0).toLocaleString('de-DE')}`

/** Von wo bis wo eine Länge sitzt. */
export function spanne(cm, spielraum = SPIELRAUM_CM) {
  const n = Number(cm)
  return Number.isFinite(n) ? { von: n - spielraum, bis: n + spielraum } : null
}

/** Die Konfiguration als Satz — oder leer, solange etwas fehlt. */
export function guertelSatz(w, spielraum = SPIELRAUM_CM) {
  if (!w?.leder_label || !w?.farbe_name || !w?.form_label || !w?.metall_label || !w?.groesse) return ''
  const s = spanne(w.groesse, spielraum)
  return `${w.leder_label} in ${w.farbe_name} · ${w.form_label} in ${w.metall_label}`
    + ` · Länge ${w.groesse} cm (passt von ${s.von} bis ${s.bis} cm)`
}

/** Gibt es diese Farbe an diesem Leder? */
export const farbePasstZuLeder = (farbe, lederKey) => {
  const gilt = String(farbe?.applicable_materials || '*')
  return gilt === '*' || gilt.split(',').map(s => s.trim()).includes(lederKey)
}
