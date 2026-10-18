/**
 * Die Lederbilder aus dem Paket vom 18. Oktober 2026 — welches Bild zu
 * welchem Leder, welcher Farbe, welchem Futter und welcher Laufsohle gehört.
 *
 * Die Bilder liegen als WebP im Frontend (artisan-sole-app/public/leder/)
 * und werden hier nur als Pfad geführt. In den Datenbankzeilen stand bisher
 * Base64; für 50 Muster hieße das rund ein Megabyte in jeder Antwort von
 * /api/colors und /api/options, die jeder Besucher lädt.
 *
 * Der Farbwert ist der Mittelwert der Bildmitte. Er dient als Rückfall, wenn
 * ein Bild nicht lädt, und als Eingang für die Sohlenrandregel
 * (randfarbeFuer in artisan-sole-app/src/lib/sohlenRegel.js), die aus der
 * Farbe des Oberleders den Rand ableitet.
 *
 * Erzeugt aus den PNG-Dateien des Pakets; von Hand nur die deutschen Namen.
 */

/** Je Leder die Farben, die es mit Bild gibt. Reihenfolge = Anzeige. */
export const LEDER_FARBEN = {
  box_calf: [
    { key: 'black', name: 'Schwarz', hex: '#323232', bild: '/leder/box_calf/black.webp' },
    { key: 'darkbrown', name: 'Dunkelbraun', hex: '#5c4945', bild: '/leder/box_calf/darkbrown.webp' },
    { key: 'cognac', name: 'Cognac', hex: '#926134', bild: '/leder/box_calf/cognac.webp' },
    { key: 'burgundy', name: 'Bordeaux', hex: '#594142', bild: '/leder/box_calf/burgundy.webp' },
  ],
  lux_calf: [
    { key: 'black', name: 'Schwarz', hex: '#252525', bild: '/leder/lux_calf/black.webp' },
    { key: 'darkbrown', name: 'Dunkelbraun', hex: '#41302c', bild: '/leder/lux_calf/darkbrown.webp' },
    { key: 'medbrown', name: 'Mittelbraun', hex: '#804a2f', bild: '/leder/lux_calf/medbrown.webp' },
    { key: 'cognac', name: 'Cognac', hex: '#a26836', bild: '/leder/lux_calf/cognac.webp' },
    { key: 'green', name: 'Grün', hex: '#696a3f', bild: '/leder/lux_calf/green.webp' },
    { key: 'forestgreen', name: 'Waldgrün', hex: '#2e4d35', bild: '/leder/lux_calf/forestgreen.webp' },
    { key: 'safran', name: 'Safran', hex: '#e58545', bild: '/leder/lux_calf/safran.webp' },
    { key: 'red', name: 'Rot', hex: '#6e323a', bild: '/leder/lux_calf/red.webp' },
    { key: 'oxblood', name: 'Ochsenblut', hex: '#533e3f', bild: '/leder/lux_calf/oxblood.webp' },
  ],
  lux_suede: [
    { key: 'black', name: 'Schwarz', hex: '#1b1b1b', bild: '/leder/lux_suede/black.webp' },
    { key: 'darkbrown', name: 'Dunkelbraun', hex: '#241713', bild: '/leder/lux_suede/darkbrown.webp' },
    { key: 'medbrown', name: 'Mittelbraun', hex: '#593617', bild: '/leder/lux_suede/medbrown.webp' },
    { key: 'camel', name: 'Kamel', hex: '#846641', bild: '/leder/lux_suede/camel.webp' },
    { key: 'sand', name: 'Sand', hex: '#c9b084', bild: '/leder/lux_suede/sand.webp' },
    { key: 'khaki', name: 'Khaki', hex: '#382d1b', bild: '/leder/lux_suede/khaki.webp' },
    { key: 'burgundy', name: 'Bordeaux', hex: '#561b1b', bild: '/leder/lux_suede/burgundy.webp' },
    { key: 'navy', name: 'Marine', hex: '#1b1b37', bild: '/leder/lux_suede/navy.webp' },
    { key: 'grey', name: 'Grau', hex: '#474747', bild: '/leder/lux_suede/grey.webp' },
  ],
  painted_full_grain: [
    { key: 'black', name: 'Schwarz', hex: '#2b2b2b', bild: '/leder/painted_full_grain/black.webp' },
    { key: 'darkbrown', name: 'Dunkelbraun', hex: '#44362f', bild: '/leder/painted_full_grain/darkbrown.webp' },
    { key: 'medbrown', name: 'Mittelbraun', hex: '#8d512e', bild: '/leder/painted_full_grain/medbrown.webp' },
    { key: 'cognac', name: 'Cognac', hex: '#c26d34', bild: '/leder/painted_full_grain/cognac.webp' },
    { key: 'oliv', name: 'Oliv', hex: '#7c673d', bild: '/leder/painted_full_grain/oliv.webp' },
    { key: 'red', name: 'Rot', hex: '#9b3530', bild: '/leder/painted_full_grain/red.webp' },
    { key: 'burgundy', name: 'Bordeaux', hex: '#4c2a29', bild: '/leder/painted_full_grain/burgundy.webp' },
  ],
}

/**
 * Futter (Gruppe inner_color) und Laufsohle (sole_bottom_color).
 *
 * Wo es die Farbe schon als Wert gab, bleibt dessen Schlüssel — bestehende
 * Bestellungen und Entwürfe zeigen sonst ins Leere. „brown" war im Futter
 * ein Mittelbraun, in der Laufsohle ein Dunkelbraun; „ochre" ist das Gelb,
 * „lila" das Purpur des Pakets.
 */
export const FUTTER_FARBEN = [
  { key: 'black', name: 'Schwarz', hex: '#020202', bild: '/leder/inner_color/black.webp' },
  { key: 'dark_brown', name: 'Dunkelbraun', hex: '#251004', bild: '/leder/inner_color/darkbrown.webp' },
  { key: 'brown', name: 'Mittelbraun', hex: '#4b2408', bild: '/leder/inner_color/medbrown.webp' },
  { key: 'beige', name: 'Beige', hex: '#6f6147', bild: '/leder/inner_color/beige.webp' },
  { key: 'ochre', name: 'Gelb', hex: '#a66902', bild: '/leder/inner_color/yellow.webp' },
  { key: 'orange', name: 'Orange', hex: '#bb5518', bild: '/leder/inner_color/orange.webp' },
  { key: 'red', name: 'Rot', hex: '#5d0202', bild: '/leder/inner_color/red.webp' },
  { key: 'lila', name: 'Lila', hex: '#40255e', bild: '/leder/inner_color/purple.webp' },
  { key: 'navy', name: 'Marine', hex: '#020627', bild: '/leder/inner_color/navy.webp' },
]

export const LAUFSOHLE_FARBEN = [
  { key: 'black', name: 'Schwarz', hex: '#181818', bild: '/leder/sole_bottom_color/black.webp' },
  { key: 'brown', name: 'Dunkelbraun', hex: '#46271c', bild: '/leder/sole_bottom_color/darkbrown.webp' },
  { key: 'cognac', name: 'Cognac', hex: '#853900', bild: '/leder/sole_bottom_color/cognac.webp' },
  { key: 'natural', name: 'Natur', hex: '#a57358', bild: '/leder/sole_bottom_color/natural.webp' },
  { key: 'forest_green', name: 'Waldgrün', hex: '#202813', bild: '/leder/sole_bottom_color/forest.webp' },
  { key: 'orange', name: 'Orange', hex: '#c2451f', bild: '/leder/sole_bottom_color/orange.webp' },
  { key: 'red', name: 'Rot', hex: '#9b0d0d', bild: '/leder/sole_bottom_color/red.webp' },
  { key: 'dark_red', name: 'Dunkelrot', hex: '#5f1d24', bild: '/leder/sole_bottom_color/darkred.webp' },
  { key: 'pale_rose', name: 'Altrosa', hex: '#7d4d4d', bild: '/leder/sole_bottom_color/palerose.webp' },
  { key: 'lila', name: 'Lila', hex: '#3f314d', bild: '/leder/sole_bottom_color/purple.webp' },
  { key: 'ultramarine', name: 'Ultramarin', hex: '#162262', bild: '/leder/sole_bottom_color/ultramarine.webp' },
  { key: 'turquoise', name: 'Türkis', hex: '#003f49', bild: '/leder/sole_bottom_color/tuerkis.webp' },
]

/** Die Lederart steht im Kachelfeld mit diesem Muster statt mit einer Fläche. */
export const LEDER_MUSTER = {
  lux_calf: '/leder/lux_calf/cognac.webp',
  lux_suede: '/leder/lux_suede/camel.webp',
  painted_full_grain: '/leder/painted_full_grain/cognac.webp',
  box_calf: '/leder/box_calf/black.webp',
}

/**
 * Ohne Bilder, deshalb aus der Auswahl genommen. Einmal, nicht bei jedem
 * Start: Wer eines davon im CMS wieder einschaltet, behält es.
 */
export const LEDER_OHNE_BILD = ['patina', 'urban_suede', 'painted_calf', 'velvet']
