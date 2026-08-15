/**
 * saison.js — zu welcher Jahreszeit ein Schuh gehört.
 *
 * ── Warum das eine eigene Angabe ist ─────────────────────────────────────
 *
 * Der Laden führte bisher zwei Ordnungen nebeneinander: die Machart
 * (OXFORD, LOAFER, CHELSEA …) und darüber gelegte Anlässe („Büro &
 * Business", „Smart Casual", „Abend & Gala"). Die Machart braucht das
 * Programm — an ihr hängen Leisten, Optionsgruppen und Vorlagen. Die
 * Anlässe brauchte niemand: Ein Loafer stand unter „Smart Casual" UND unter
 * „Freizeit", ein Oxford unter „Büro" UND unter „Abend", und wer einen Schuh
 * suchte, musste raten, unter welchem der beiden er liegt.
 *
 * An seine Stelle tritt eine Frage, die sich beantworten lässt, ohne den
 * Kunden zu kennen: Wann trägt man ihn?
 *
 *   Winter        die Stiefel
 *   Sommer        die Mokassins und die Walks
 *   Ganzjährig    alles andere
 *
 * ── Warum die Machart bleibt ─────────────────────────────────────────────
 *
 * Sie verschwindet nur aus der Ansicht des Kunden. Im Programm ist sie der
 * Schlüssel, an dem hängt, welcher Leisten passt und welche Schritte der
 * Konfigurator zeigt — sie zu entfernen hieße, den Konfigurator zu
 * entfernen.
 *
 * ── Warum am Schuh und nicht nur als Regel ───────────────────────────────
 *
 * Die Zuordnung unten ist die Vorgabe, nicht das Gesetz. Ein Chelsea Boot
 * aus ungefüttertem Wildleder kann sehr wohl ein Sommerschuh sein, und das
 * weiß nur, wer ihn gebaut hat. Deshalb steht die Saison als Feld am Modell
 * und ist im CMS zu ändern; die Regel füllt sie einmal vor.
 */

/** Die drei Saisons, in der Reihenfolge, in der sie im Laden stehen. */
export const SAISONS = [
  { key: 'summer', label: 'Sommer',     kurz: 'Frühling & Sommer',
    text: 'Leichte Machart, ungefüttert oder dünn gefüttert — für warme Tage.' },
  { key: 'winter', label: 'Winter',     kurz: 'Herbst & Winter',
    text: 'Über dem Knöchel, geschlossen, mit Profil unter der Sohle.' },
  { key: 'all',    label: 'Ganzjährig', kurz: 'Das ganze Jahr',
    text: 'Trägt sich zu jeder Jahreszeit — die Schuhe, die immer gehen.' },
]

export const SAISON_KEYS = SAISONS.map(s => s.key)
export const istSaison = (v) => SAISON_KEYS.includes(String(v || ''))

/**
 * Die Stiefel. Alles, was über den Knöchel geht.
 *
 * Wellington und Balmoral stehen ausdrücklich mit dabei: Beides sind
 * Stiefel, auch wenn ihre Namen nach etwas anderem klingen.
 */
const WINTER = ['BOOT', 'CHELSEA', 'CHUKKA', 'JODHPUR', 'BALMORAL', 'WELLINGTON']

/**
 * Die Mokassins und die Walks.
 *
 * „Walks" ist die Sneaker-Familie — die Modelle auf der weißen Laufsohle.
 * Dass zwei davon „Boot" heißen, macht sie nicht zu Winterstiefeln: Es sind
 * höher geschnittene Walks, und sie gehören zu ihren flachen Brüdern.
 */
const SOMMER = [
  'MOCCASIN', 'MOC_SPORT', 'MOC_SPORT_BOOT',
  'SNEAKER', 'SNEAKER_LACED', 'SNEAKER_BOOT', 'LACELESS_TRAINER',
]

/** Die Vorgabe für eine Machart. Was nicht genannt ist, geht das ganze Jahr. */
export function saisonFuerKategorie(kategorie) {
  const k = String(kategorie || '').toUpperCase()
  if (WINTER.includes(k)) return 'winter'
  if (SOMMER.includes(k)) return 'summer'
  return 'all'
}

/** Die Beschriftung zu einem Schlüssel — oder „Ganzjährig", wenn nichts steht. */
export const saisonLabel = (key) =>
  SAISONS.find(s => s.key === key)?.label || 'Ganzjährig'
