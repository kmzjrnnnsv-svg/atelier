/**
 * fussFormen.js — die Umrisse eines Fußes, an einer Stelle.
 *
 * ── Warum sie hier liegen und nicht im Bauteil ────────────────────────────
 *
 * Zwei Zeichnungen brauchen denselben Fuß: FussMass zeigt, WELCHE zwei Maße
 * genommen werden, MassAnleitung zeigt, WIE man sie nimmt. Läge der Umriss
 * zweimal im Code, wären es nach der ersten Korrektur zwei verschiedene Füße
 * — und zwei verschiedene Füße auf einer Seite sind ein Fehler, den man erst
 * sieht, wenn ihn jemand anders sieht.
 *
 * Es ist ein rechter Fuß, Innenkante links. Die Zehenlinie läuft schräg: Die
 * große Zehe steht am weitesten vorn, die kleine am weitesten hinten. Ein Fuß
 * mit rundem Vorderende sieht aus wie ein Brot.
 */

/** Der Fuß von oben. Umschließendes Rechteck rund x 60–158, y 34–236. */
export const FUSS_OBEN =
  'M 92 36 '
  + 'C 76 36, 64 48, 62 70 '            /* Ballen innen, breiteste Stelle */
  + 'C 60 84, 64 96, 66 110 '
  + 'C 68 132, 74 140, 76 156 '         /* Gewölbe zieht sich ein */
  + 'C 78 176, 68 190, 68 206 '
  + 'C 68 224, 84 236, 104 236 '        /* Ferse */
  + 'C 124 236, 138 224, 138 206 '
  + 'C 138 188, 140 172, 144 154 '
  + 'C 148 132, 154 110, 156 88 '
  + 'C 158 70, 154 58, 146 52 '         /* kleine Zehe, außen */
  + 'L 128 44 '
  + 'C 116 38, 104 34, 92 36 Z'

/**
 * Derselbe Fuß im Schnitt am Ballen: breiter als hoch, innen höher als außen
 * — der Spann liegt nicht mittig. Rechteck rund x 312–450, y 98–166.
 */
export const FUSS_SCHNITT =
  'M 312 164 '
  + 'C 312 128, 332 106, 368 104 '
  + 'C 406 102, 440 122, 446 148 '
  + 'C 450 160, 448 164, 444 164 Z'

/**
 * Das Maßband um diesen Schnitt: ein paar Punkte außerhalb der Kontur — es
 * liegt an, es schneidet nicht ein, und es geht einmal ganz herum, auch unten
 * am Boden. Der Umfang ist nicht die Breite.
 */
export const MASSBAND_UM_DEN_BALLEN =
  'M 306 166 '
  + 'C 306 124, 328 100, 368 98 '
  + 'C 408 96, 444 118, 450 146 '
  + 'C 455 160, 452 166, 448 166 Z'
