/**
 * machartFamilien — die zwanzig Macharten des Katalogs in fünf Gruppen.
 *
 * ── Warum gruppiert ───────────────────────────────────────────────────────
 *
 * Der Laden führt achtundvierzig Modelle in zwanzig Macharten, und in
 * dreizehn davon steht genau ein Schuh. Zwanzig Knöpfe nebeneinander sind
 * keine Auswahl, sondern eine Inventarliste — man liest sie durch, statt
 * sich zu entscheiden.
 *
 * Fünf Gruppen sind die Zahl, bei der ein Mensch noch auf einen Blick
 * vergleicht, und sie sind nicht erfunden: Es sind die Gruppen, in denen
 * ein Herrenausstatter sein Regal sortiert. Ein Wholecut ist ein
 * Schnürschuh, ein Belgian Slipper ist ein Loafer, ein Jodhpur ist ein
 * Stiefel.
 *
 * ── Wer eine Machart ergänzt ──────────────────────────────────────────────
 *
 * Kommt im CMS eine neue Kategorie dazu, die hier nicht steht, fällt ihr
 * Modell aus der Auswahl heraus — es erscheint dann nur noch im vollen
 * Katalog. `ohneFamilie` sagt beim Entwickeln, welche das sind, damit es
 * nicht still passiert.
 */
export const FAMILIEN = [
  {
    key: 'schnuer',
    name: 'Schnürschuh',
    satz: 'Oxford, Derby, Wholecut. Was man zum Anzug trägt.',
    kategorien: ['OXFORD', 'DERBY', 'WHOLECUT', 'BALMORAL'],
  },
  {
    key: 'monk',
    name: 'Monk',
    satz: 'Eine Schnalle oder zwei, kein Senkel.',
    kategorien: ['MONK', 'DOUBLE_MONK'],
  },
  {
    key: 'loafer',
    name: 'Loafer',
    satz: 'Hineinschlüpfen. Gehalten wird er von seiner Form.',
    kategorien: ['LOAFER', 'BELGIAN_SLIPPER', 'MOCCASIN', 'DRAKE'],
  },
  {
    key: 'stiefel',
    name: 'Stiefel',
    satz: 'Über dem Knöchel, für den Teil des Jahres, der nass ist.',
    kategorien: ['BOOT', 'CHELSEA', 'JODHPUR', 'CHUKKA', 'WELLINGTON', 'MOC_SPORT_BOOT'],
  },
  {
    key: 'sneaker',
    name: 'Sneaker',
    satz: 'Gebaut wie ein Herrenschuh, gedacht für lange Wege.',
    kategorien: ['SNEAKER', 'SNEAKER_LACED', 'LACELESS_TRAINER', 'MOC_SPORT'],
  },
]

const ZU_FAMILIE = new Map(
  FAMILIEN.flatMap(f => f.kategorien.map(k => [k, f.key])),
)

/** Die Familie eines Modells, oder null. */
export const familieVon = (schuh) => ZU_FAMILIE.get(String(schuh?.category || '')) || null

/** Macharten, die in keiner Familie stehen — beim Entwickeln zu sehen. */
export const ohneFamilie = (schuhe) =>
  [...new Set(schuhe.map(s => String(s?.category || '')).filter(k => k && !ZU_FAMILIE.has(k)))]
