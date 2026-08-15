/**
 * saison.js — die drei Rubriken, unter denen der Laden seine Schuhe führt.
 *
 * ── Was hier an die Stelle wovon tritt ───────────────────────────────────
 *
 * Bis eben standen über dem Raster sechs Anlässe: „Büro & Business", „Smart
 * Casual", „Freizeit", „Abend & Gala", „Outdoor". Sie überschnitten sich —
 * ein Loafer lag unter „Smart Casual" UND unter „Freizeit", ein Oxford unter
 * „Büro" UND unter „Abend". Wer einen bestimmten Schuh suchte, musste raten,
 * unter welchem der beiden Reiter er liegt, und fand ihn im schlimmsten Fall
 * gar nicht.
 *
 * An ihre Stelle tritt eine Frage mit genau einer Antwort je Schuh: Wann
 * trägt man ihn? Sommer, Winter, oder das ganze Jahr.
 *
 * ── Die Gegenstücke am Server ────────────────────────────────────────────
 *
 * `utils/saison.js` im Backend führt dieselben drei Schlüssel und die Regel,
 * nach der ein neues Modell seine Saison bekommt. Hier stehen nur die Texte:
 * Was der Kunde liest, gehört in den Laden, nicht in die Datenbank.
 */

export const SAISONS = [
  {
    key: 'summer',
    label: 'Sommer',
    titel: 'Frühling & Sommer',
    text: 'Leicht gebaut, ungefüttert oder dünn gefüttert — für Tage, an denen nichts drücken darf.',
  },
  {
    key: 'winter',
    label: 'Winter',
    titel: 'Herbst & Winter',
    text: 'Über dem Knöchel, geschlossen, mit Profil unter der Sohle.',
  },
  {
    key: 'all',
    label: 'Ganzjährig',
    titel: 'Das ganze Jahr',
    text: 'Die Schuhe, die immer gehen — vom Besprechungsraum bis zum Abend.',
  },
]

/**
 * Die Saison eines Modells.
 *
 * Steht keine dran, gilt „ganzjährig". Ein Schuh ohne Rubrik wäre sonst
 * einer, den niemand findet — und das ist schlimmer als eine Rubrik, die
 * eine Spur zu weit gefasst ist.
 */
export const saisonVon = (schuh) => {
  const s = String(schuh?.season || '').trim()
  return SAISONS.some(x => x.key === s) ? s : 'all'
}

export const saisonLabel = (key) => SAISONS.find(s => s.key === key)?.label || 'Ganzjährig'

/**
 * Passt ein Schuh zum gewählten Reiter?
 *
 * 'ALL' ist kein Saison-Schlüssel, sondern die Auswahl „alles zeigen" — das
 * ist etwas anderes als die Rubrik „Ganzjährig" und darf nicht mit ihr
 * verwechselt werden. Deshalb steht sie in Großbuchstaben.
 */
export const passtZurSaison = (auswahl, schuh) =>
  auswahl === 'ALL' || saisonVon(schuh) === auswahl

/**
 * Findet dieser Suchbegriff den Schuh?
 *
 * Gesucht wird in dem, was auf der Kachel steht — Name, Leder, Farbe — und
 * zusätzlich in der Saison. Wer „winter" tippt, soll die Stiefel bekommen,
 * auch wenn das Wort an keinem einzelnen Modell steht.
 */
export function trifftSuche(schuh, begriff) {
  const q = String(begriff || '').trim().toLowerCase()
  if (!q) return true
  const heuhaufen = [
    schuh?.name, schuh?.material, schuh?.tagline, schuh?.tag,
    saisonLabel(saisonVon(schuh)),
    // Auch die englischen Schlüssel: Wer „summer" tippt, meint den Sommer.
    saisonVon(schuh),
  ].filter(Boolean).join(' ').toLowerCase()
  // Mehrere Wörter müssen alle vorkommen — „braun loafer" soll den braunen
  // Loafer finden und nicht jeden Schuh, der eines der beiden Wörter trägt.
  return q.split(/\s+/).every(teil => heuhaufen.includes(teil))
}
