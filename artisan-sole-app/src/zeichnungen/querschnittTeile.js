/**
 * querschnittTeile — der Schnitt quer durch den Vorfuß, in zehn Teilen.
 *
 * Aus der Zeichenmappe, eine Datei je Teil, alle mit demselben Ausschnitt.
 * Übereinandergelegt (Laufsohle unten, Fuß oben) ergibt sich der vollständige
 * Querschnitt.
 *
 * Die Lippe ist ein eigenes Teil und nicht Teil der Brandsohle: Sie ist ein
 * aufgeklebtes Rippenband mit L-Profil, und dass sie aufgeklebt und nicht
 * ausgeschnitten ist, ist der Unterschied zwischen einem Goodyear-Rahmen und
 * einem handgenähten. Im Aufbau kommt sie deshalb einen Wimpernschlag nach
 * der Brandsohle.
 *
 * ── Warum hier kein Stilblatt steht ───────────────────────────────────────
 *
 * Anders als die beiden anderen Szenen bringen diese Teile keine Klassen und
 * keine CSS-Eigenschaften mit. Sie malen ausschließlich mit `currentColor`
 * in abgestufter Deckkraft — eine einzige Farbe am umgebenden <svg> färbt
 * die ganze Tafel. Für den dunklen Abschnitt, in dem sie steht, ist das
 * genau richtig.
 *
 * MASSE hält die gemessenen Kästen — [links, oben, rechts, unten] im
 * Koordinatensystem der Szene. Daran hängen die Führungsstriche der
 * Beschriftung. Wer ein Teil austauscht, misst hier nach.
 */
export const VIEWBOX = '158 16 484 300'

/** Stapelreihenfolge, unten zuerst. */
export const REIHENFOLGE = [
  'laufsohle',
  'kork',
  'brandsohle',
  'lippe',
  'rahmen',
  'futter',
  'schaft',
  'einstechnaht',
  'doppelnaht',
  'fuss',
]

export const MASSE = {
  'laufsohle': [176, 272, 624, 304],
  'kork': [246, 228, 554, 272],
  'brandsohle': [240, 200, 560, 228],
  'lippe': [270, 228, 530, 251],
  'rahmen': [176, 250, 624, 272],
  'futter': [230, 48, 570, 257],
  'schaft': [214, 32, 586, 257],
  'einstechnaht': [206, 242, 594, 266],
  'doppelnaht': [194, 256, 606, 301],
  'fuss': [252, 74, 548, 198],
}

/* Kein Verlauf, kein Stilblatt — siehe oben. */
export const STIL = ''

export const TEILE = {
  'laufsohle': `<path d="M176.0 272.0L176.0 299.9L176.4 301.4L177.0 302.5L178.0 303.3L180.1 304.0L619.0 304.0L620.7 303.8L622.5 303.0L623.6 301.4L624.0 299.9L624.0 272.0L176.0 272.0Z" fill="currentColor" fill-opacity="0.3" stroke="currentColor" stroke-opacity=".8" stroke-width="1.4" stroke-linejoin="round"/>`,

  'kork': `<path d="M554.0 228.0L529.4 228.0L529.8 228.2L530.0 228.6L530.0 250.4L529.8 250.8L529.4 251.0L524.5 251.0L524.0 250.6L524.0 233.0L494.5 233.0L494.0 232.5L494.0 228.6L494.2 228.2L494.6 228.0L305.4 228.0L305.8 228.2L306.0 228.6L306.0 232.5L305.5 233.0L276.0 233.0L276.0 250.6L275.5 251.0L270.5 251.0L270.2 250.8L270.0 250.4L270.0 228.6L270.2 228.2L270.6 228.0L246.0 228.0L250.9 228.5L255.4 229.6L257.9 230.7L260.1 231.9L263.6 234.6L266.3 237.9L268.3 241.8L269.1 244.1L269.7 246.8L270.0 251.0L270.0 257.0L246.0 257.0L246.0 272.0L554.0 272.0L554.0 257.0L530.0 257.0L530.0 250.3L530.3 247.2L530.7 245.1L532.1 240.7L533.4 238.5L534.6 236.7L536.4 234.6L538.4 232.9L542.4 230.5L544.9 229.5L547.9 228.7L551.2 228.2L554.0 228.0Z" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity=".8" stroke-width="1.4" stroke-linejoin="round"/><circle cx="345.5" cy="252.9" r="1.3" fill="currentColor" fill-opacity=".45"/><circle cx="486.5" cy="250.7" r="1.7" fill="currentColor" fill-opacity=".45"/><circle cx="309.6" cy="236.4" r="1.3" fill="currentColor" fill-opacity=".45"/><circle cx="349.9" cy="243.3" r="1.7" fill="currentColor" fill-opacity=".45"/><circle cx="393.8" cy="261.9" r="1.3" fill="currentColor" fill-opacity=".45"/><circle cx="378.6" cy="262.7" r="0.9" fill="currentColor" fill-opacity=".45"/><circle cx="428.1" cy="262.9" r="1.7" fill="currentColor" fill-opacity=".45"/><circle cx="377.1" cy="236.5" r="0.9" fill="currentColor" fill-opacity=".45"/><circle cx="329.2" cy="265.7" r="0.9" fill="currentColor" fill-opacity=".45"/><circle cx="358.7" cy="237.0" r="1.3" fill="currentColor" fill-opacity=".45"/><circle cx="394.3" cy="258.3" r="1.3" fill="currentColor" fill-opacity=".45"/><circle cx="444.5" cy="264.6" r="1.3" fill="currentColor" fill-opacity=".45"/><circle cx="447.5" cy="253.9" r="0.9" fill="currentColor" fill-opacity=".45"/><circle cx="478.8" cy="239.0" r="0.9" fill="currentColor" fill-opacity=".45"/><circle cx="398.9" cy="244.0" r="1.7" fill="currentColor" fill-opacity=".45"/><circle cx="386.7" cy="255.4" r="1.3" fill="currentColor" fill-opacity=".45"/><circle cx="383.6" cy="261.8" r="1.7" fill="currentColor" fill-opacity=".45"/><circle cx="369.0" cy="254.1" r="1.7" fill="currentColor" fill-opacity=".45"/><circle cx="344.3" cy="246.4" r="0.9" fill="currentColor" fill-opacity=".45"/><circle cx="474.1" cy="266.7" r="1.7" fill="currentColor" fill-opacity=".45"/><circle cx="440.7" cy="257.7" r="1.3" fill="currentColor" fill-opacity=".45"/><circle cx="496.6" cy="264.0" r="1.7" fill="currentColor" fill-opacity=".45"/><circle cx="317.6" cy="256.3" r="1.7" fill="currentColor" fill-opacity=".45"/><circle cx="469.0" cy="253.8" r="1.3" fill="currentColor" fill-opacity=".45"/><circle cx="321.9" cy="250.9" r="1.7" fill="currentColor" fill-opacity=".45"/><circle cx="501.9" cy="238.7" r="0.9" fill="currentColor" fill-opacity=".45"/><circle cx="381.4" cy="240.7" r="1.3" fill="currentColor" fill-opacity=".45"/><circle cx="384.8" cy="248.9" r="0.9" fill="currentColor" fill-opacity=".45"/><circle cx="305.2" cy="255.1" r="0.9" fill="currentColor" fill-opacity=".45"/><circle cx="374.6" cy="254.2" r="1.7" fill="currentColor" fill-opacity=".45"/><circle cx="479.2" cy="266.4" r="1.7" fill="currentColor" fill-opacity=".45"/><circle cx="345.1" cy="237.1" r="0.9" fill="currentColor" fill-opacity=".45"/><circle cx="312.0" cy="254.6" r="0.9" fill="currentColor" fill-opacity=".45"/><circle cx="493.4" cy="266.1" r="1.3" fill="currentColor" fill-opacity=".45"/><circle cx="423.0" cy="240.8" r="0.9" fill="currentColor" fill-opacity=".45"/><circle cx="499.8" cy="246.5" r="1.3" fill="currentColor" fill-opacity=".45"/>`,

  'brandsohle': `<path d="M241.6 200.1L240.5 200.5L240.2 200.9L240.0 201.6L240.0 226.6L240.4 227.6L241.4 228.0L558.5 228.0L559.5 227.7L560.0 226.6L560.0 201.5L559.6 200.6L558.7 200.1L516.6 202.8L478.6 204.6L435.3 205.7L397.3 206.0L359.3 205.6L321.4 204.6L283.4 202.8L241.6 200.1Z" fill="currentColor" fill-opacity="0.28" stroke="currentColor" stroke-opacity=".8" stroke-width="1.4" stroke-linejoin="round"/>`,

  'lippe': `<path d="M270.5 228.0L270.2 228.2L270.0 228.6L270.0 250.4L270.2 250.8L270.5 251.0L275.5 251.0L276.0 250.6L276.0 233.0L305.4 233.0L305.8 232.9L306.0 232.5L306.0 228.5L305.8 228.2L305.5 228.0L270.5 228.0ZM494.6 228.0L494.2 228.2L494.0 228.6L494.0 232.5L494.5 233.0L524.0 233.0L524.0 250.6L524.6 251.0L529.5 251.0L529.9 250.7L530.0 228.6L529.7 228.1L494.6 228.0Z" fill="currentColor" fill-opacity="0.62" stroke="currentColor" stroke-opacity=".8" stroke-width="1.2" stroke-linejoin="round"/>`,

  'rahmen': `<path d="M246.0 257.0L244.0 257.0L244.0 254.0L240.4 253.8L235.6 253.0L231.8 251.8L227.2 249.6L180.1 253.7L178.6 254.2L177.5 254.9L176.7 256.0L176.2 257.3L176.0 259.0L176.0 272.0L246.0 272.0L246.0 257.0ZM624.0 258.1L623.6 256.6L623.0 255.4L622.0 254.5L619.9 253.7L572.8 249.6L568.2 251.8L564.4 253.0L559.6 253.8L556.0 254.0L556.0 257.0L554.0 257.0L554.0 272.0L624.0 272.0L624.0 258.1Z" fill="currentColor" fill-opacity="0.55" stroke="currentColor" stroke-opacity=".8" stroke-width="1.4" stroke-linejoin="round"/>`,

  'futter': `<path d="M240.1 226.9L240.1 159.8L240.4 152.8L240.9 146.8L241.6 141.3L242.5 136.3L243.5 131.5L246.1 122.8L247.7 118.7L251.4 111.1L253.5 107.6L258.2 100.8L263.7 94.6L269.9 88.8L276.9 83.5L280.7 81.0L289.0 76.4L293.4 74.2L303.0 70.3L308.1 68.5L319.0 65.4L324.9 64.0L337.4 61.7L344.1 60.7L358.7 59.2L366.7 58.7L385.6 58.1L414.4 58.1L424.5 58.3L433.3 58.7L448.8 59.9L455.9 60.7L469.0 62.8L475.1 64.0L486.6 66.9L491.9 68.5L501.9 72.2L506.6 74.2L515.2 78.6L519.3 81.0L526.7 86.1L530.1 88.8L536.3 94.6L541.8 100.8L544.2 104.1L548.6 111.1L550.5 114.9L553.9 122.8L555.3 127.0L557.5 136.3L558.4 141.3L559.1 146.8L559.6 152.8L559.9 159.8L560.0 170.1L560.0 226.8L559.6 227.6L558.8 228.0L551.2 228.2L548.2 228.6L544.9 229.5L542.4 230.5L539.9 231.9L538.2 233.1L536.1 235.0L534.4 236.9L533.2 238.7L532.0 241.1L530.9 244.1L530.1 248.5L530.0 257.0L540.0 257.0L540.0 250.8L540.4 247.2L541.3 244.7L542.1 243.4L543.4 241.9L544.9 240.6L546.3 239.8L548.8 238.8L552.4 238.1L557.6 237.9L560.0 237.5L562.1 237.0L564.3 236.1L566.1 234.8L567.8 232.9L568.9 230.9L569.5 228.6L569.9 226.3L570.0 223.8L570.0 170.0L569.9 159.4L569.6 152.3L569.1 145.9L568.3 140.0L567.4 134.4L566.2 129.2L564.9 124.3L563.3 119.5L561.6 115.0L559.6 110.6L557.3 106.2L554.9 102.2L549.7 94.8L546.6 91.0L543.4 87.5L536.6 81.2L532.8 78.2L528.6 75.2L524.4 72.5L515.6 67.5L510.8 65.2L500.4 60.9L489.4 57.3L483.5 55.7L470.8 52.9L457.1 50.8L442.2 49.2L424.9 48.3L414.5 48.1L385.5 48.1L366.2 48.7L350.2 49.9L335.7 51.8L322.8 54.2L310.7 57.3L299.6 60.9L289.4 65.1L280.0 69.9L271.4 75.2L263.6 81.1L256.6 87.5L253.2 91.2L247.7 98.3L244.9 102.4L242.6 106.4L240.5 110.4L238.4 115.0L236.7 119.5L235.2 124.0L233.8 129.2L232.6 134.4L231.7 140.0L230.9 145.9L230.4 152.3L230.1 159.4L230.0 223.8L230.1 226.3L230.6 229.2L231.1 230.9L232.0 232.5L233.9 234.8L235.7 236.1L237.9 237.0L240.0 237.5L242.4 237.9L247.6 238.1L251.2 238.8L253.7 239.8L255.1 240.6L256.6 241.9L257.9 243.4L258.7 244.7L259.6 247.2L260.0 250.8L260.0 257.0L270.0 257.0L269.9 248.5L269.1 244.1L268.0 241.1L266.8 238.7L265.6 236.9L263.9 235.0L261.8 233.1L260.1 231.9L257.6 230.5L255.1 229.5L251.8 228.6L248.8 228.2L241.2 228.0L240.4 227.6L240.1 226.9Z" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-opacity=".8" stroke-width="1.4" stroke-linejoin="round"/>`,

  'schaft': `<path d="M230.5 228.9L230.1 226.6L230.0 223.9L230.0 170.0L230.1 159.5L230.4 152.2L231.0 145.7L231.7 139.9L232.6 134.3L233.8 129.1L235.1 124.2L236.7 119.4L238.5 114.8L240.4 110.5L242.6 106.3L245.0 102.3L247.6 98.4L250.4 94.6L253.4 91.1L256.5 87.6L263.5 81.2L271.3 75.2L279.8 69.9L284.4 67.5L294.3 62.9L305.0 59.0L316.5 55.7L322.7 54.2L335.8 51.8L350.2 49.9L366.2 48.7L385.4 48.1L414.6 48.1L433.8 48.7L449.8 49.9L464.2 51.8L477.3 54.2L489.3 57.3L500.5 60.9L510.7 65.1L520.1 69.9L528.7 75.2L536.5 81.2L543.5 87.6L546.6 91.1L549.6 94.6L552.4 98.4L555.0 102.3L557.4 106.3L559.6 110.5L561.5 114.8L563.3 119.4L564.9 124.2L566.2 129.1L567.4 134.4L568.3 139.9L569.0 145.8L569.6 152.2L569.9 159.5L570.0 223.9L569.9 226.6L569.5 229.0L568.9 230.9L568.0 232.6L567.0 233.9L565.8 235.1L564.3 236.1L562.4 236.9L560.3 237.5L557.8 237.9L552.3 238.1L549.0 238.8L546.0 239.9L544.9 240.6L543.4 241.9L541.5 244.4L540.4 247.5L540.0 250.7L540.0 257.0L556.0 257.0L556.0 254.0L559.6 253.8L564.0 253.1L568.2 251.8L571.6 250.3L576.0 247.5L579.5 243.9L582.3 239.9L583.8 236.5L584.8 233.5L585.7 228.6L586.0 224.2L585.9 158.9L585.5 150.9L585.0 144.2L584.1 137.6L583.0 130.9L581.7 125.2L580.1 119.4L578.2 113.7L576.3 108.8L574.1 103.8L571.4 98.7L568.4 93.5L565.6 89.3L562.4 85.0L558.6 80.4L554.7 76.2L550.9 72.5L546.9 69.0L542.2 65.2L537.7 62.0L533.2 59.1L528.1 56.0L522.5 53.1L512.0 48.2L505.9 45.9L499.8 43.7L487.6 40.2L480.5 38.6L466.6 36.0L451.7 34.0L443.4 33.3L425.5 32.3L414.9 32.1L385.1 32.1L365.2 32.7L348.7 34.0L340.6 34.9L333.1 36.0L319.4 38.6L312.4 40.2L300.2 43.7L294.1 45.9L288.0 48.2L277.5 53.1L272.1 55.9L266.9 59.0L261.9 62.3L257.7 65.3L253.4 68.7L249.3 72.4L245.1 76.4L241.2 80.6L237.7 84.9L234.3 89.5L231.4 93.9L228.8 98.2L226.2 103.2L223.8 108.5L221.8 113.7L219.7 119.8L218.2 125.4L216.9 131.4L215.9 137.6L215.1 143.8L214.5 151.3L214.1 159.2L214.0 169.9L214.0 224.0L214.3 228.6L215.0 233.0L216.7 237.8L218.1 240.6L220.2 243.6L221.5 245.1L224.0 247.5L228.4 250.3L231.8 251.8L236.0 253.1L240.4 253.8L244.0 254.0L244.0 257.0L260.0 257.0L260.0 250.7L259.6 247.5L258.5 244.4L256.6 241.9L255.1 240.6L254.0 239.9L251.0 238.8L247.7 238.1L242.2 237.9L239.7 237.5L237.6 236.9L235.7 236.1L234.2 235.1L233.0 233.9L232.0 232.6L231.1 230.9L230.5 228.9Z" fill="currentColor" fill-opacity="0.42" stroke="currentColor" stroke-opacity=".8" stroke-width="1.4" stroke-linejoin="round"/>`,

  'einstechnaht': `<path d="M206 266L278 242" fill="none" stroke="currentColor" stroke-width="2.4" stroke-dasharray="6 4.5" stroke-linecap="round"/><path d="M594 266L522 242" fill="none" stroke="currentColor" stroke-width="2.4" stroke-dasharray="6 4.5" stroke-linecap="round"/>`,

  'doppelnaht': `<path d="M194 256L194 301" fill="none" stroke="currentColor" stroke-width="2.4" stroke-dasharray="6 4.5" stroke-linecap="round"/><path d="M606 256L606 301" fill="none" stroke="currentColor" stroke-width="2.4" stroke-dasharray="6 4.5" stroke-linecap="round"/>`,

  'fuss': `<path d="M548.0 138.0L547.9 147.5L547.5 152.7L546.8 156.9L545.9 160.6L544.8 163.9L543.4 166.9L541.7 169.8L539.7 172.4L537.5 174.8L535.1 177.1L532.3 179.2L529.3 181.2L522.5 184.9L514.6 188.0L510.2 189.4L500.4 191.9L489.3 194.0L476.6 195.6L461.9 196.8L444.2 197.6L419.7 198.0L390.1 198.0L361.0 197.7L351.0 197.4L334.2 196.6L320.0 195.2L307.8 193.5L297.0 191.4L287.6 188.8L279.4 185.7L272.3 182.2L269.1 180.3L266.3 178.2L263.7 176.0L261.3 173.6L259.3 171.1L257.5 168.4L255.9 165.5L254.6 162.3L253.6 158.8L252.8 154.9L252.3 150.3L252.0 144.2L252.0 131.4L252.3 124.9L252.8 120.0L253.6 115.8L254.6 112.1L255.9 108.7L257.5 105.6L259.3 102.7L261.3 100.0L263.7 97.5L266.3 95.1L269.1 92.9L272.3 90.9L275.7 88.9L283.3 85.4L292.2 82.4L302.2 79.9L313.7 77.8L326.8 76.2L342.1 75.0L361.0 74.3L372.9 74.1L419.7 74.0L433.4 74.2L444.2 74.4L461.9 75.3L476.6 76.5L489.3 78.3L500.4 80.5L510.2 83.1L518.7 86.3L526.1 89.9L529.3 91.9L532.3 94.0L535.1 96.3L537.5 98.7L539.7 101.3L541.7 104.1L543.4 107.1L544.8 110.4L545.9 113.9L546.8 117.8L547.5 122.3L547.9 127.8L548.0 138.0Z" fill="none" stroke="currentColor" stroke-opacity=".35" stroke-width="1.2" stroke-dasharray="2 4" stroke-linecap="round"/>`,

}
