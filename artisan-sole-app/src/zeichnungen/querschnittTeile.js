/**
 * querschnittTeile — der Schnitt quer durch den Vorfuß, in neun Teilen.
 *
 * Aus der Zeichenmappe, eine Datei je Teil, alle mit demselben Ausschnitt.
 * Übereinandergelegt (Laufsohle unten, Fuß oben) ergibt sich der vollständige
 * Querschnitt.
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
  'rahmen',
  'futter',
  'schaft',
  'einstechnaht',
  'doppelnaht',
  'fuss',
]

export const MASSE = {
  'laufsohle': [176, 272, 624, 304],
  'kork': [288, 228, 512, 272],
  'brandsohle': [240, 200, 560, 270],
  'rahmen': [176, 250, 624, 272],
  'futter': [230, 48, 570, 270],
  'schaft': [214, 32, 586, 270],
  'einstechnaht': [204, 256, 596, 265],
  'doppelnaht': [194, 256, 606, 301],
  'fuss': [252, 74, 548, 198],
}

/* Kein Verlauf, kein Stilblatt — siehe oben. */
export const STIL = ''

export const TEILE = {
  'laufsohle': `<path d="M176.0 272.0L176.0 299.9L176.4 301.4L177.0 302.5L178.0 303.3L180.1 304.0L619.0 304.0L620.7 303.8L622.5 303.0L623.6 301.4L624.0 299.9L624.0 272.0L176.0 272.0Z" fill="currentColor" fill-opacity="0.3" stroke="currentColor" stroke-opacity=".8" stroke-width="1.4" stroke-linejoin="round"/>`,

  'kork': `<path d="M512.0 228.0L512.0 272.0L288.0 272.0L288.0 228.0L512.0 228.0Z" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity=".8" stroke-width="1.4" stroke-linejoin="round"/><circle cx="344.4" cy="251.5" r="1.3" fill="currentColor" fill-opacity=".45"/><circle cx="488.2" cy="249.1" r="1.7" fill="currentColor" fill-opacity=".45"/><circle cx="307.9" cy="233.4" r="1.3" fill="currentColor" fill-opacity=".45"/><circle cx="349.0" cy="241.0" r="1.7" fill="currentColor" fill-opacity=".45"/><circle cx="393.7" cy="261.4" r="1.3" fill="currentColor" fill-opacity=".45"/><circle cx="378.2" cy="262.3" r="0.9" fill="currentColor" fill-opacity=".45"/><circle cx="428.6" cy="262.5" r="1.7" fill="currentColor" fill-opacity=".45"/><circle cx="376.7" cy="233.5" r="0.9" fill="currentColor" fill-opacity=".45"/><circle cx="327.8" cy="265.6" r="0.9" fill="currentColor" fill-opacity=".45"/><circle cx="357.9" cy="234.1" r="1.3" fill="currentColor" fill-opacity=".45"/><circle cx="394.2" cy="257.4" r="1.3" fill="currentColor" fill-opacity=".45"/><circle cx="445.4" cy="264.3" r="1.3" fill="currentColor" fill-opacity=".45"/><circle cx="448.4" cy="252.6" r="0.9" fill="currentColor" fill-opacity=".45"/><circle cx="480.3" cy="236.3" r="0.9" fill="currentColor" fill-opacity=".45"/><circle cx="398.9" cy="241.8" r="1.7" fill="currentColor" fill-opacity=".45"/><circle cx="386.5" cy="254.3" r="1.3" fill="currentColor" fill-opacity=".45"/><circle cx="383.3" cy="261.3" r="1.7" fill="currentColor" fill-opacity=".45"/><circle cx="368.4" cy="252.9" r="1.7" fill="currentColor" fill-opacity=".45"/><circle cx="343.3" cy="244.5" r="0.9" fill="currentColor" fill-opacity=".45"/><circle cx="475.6" cy="266.7" r="1.7" fill="currentColor" fill-opacity=".45"/><circle cx="441.5" cy="256.8" r="1.3" fill="currentColor" fill-opacity=".45"/><circle cx="498.5" cy="263.8" r="1.7" fill="currentColor" fill-opacity=".45"/><circle cx="316.1" cy="255.3" r="1.7" fill="currentColor" fill-opacity=".45"/><circle cx="470.3" cy="252.5" r="1.3" fill="currentColor" fill-opacity=".45"/><circle cx="320.4" cy="249.4" r="1.7" fill="currentColor" fill-opacity=".45"/><circle cx="503.8" cy="236.0" r="0.9" fill="currentColor" fill-opacity=".45"/><circle cx="381.0" cy="238.1" r="1.3" fill="currentColor" fill-opacity=".45"/><circle cx="384.6" cy="247.1" r="0.9" fill="currentColor" fill-opacity=".45"/><circle cx="303.4" cy="253.9" r="0.9" fill="currentColor" fill-opacity=".45"/><circle cx="374.1" cy="252.9" r="1.7" fill="currentColor" fill-opacity=".45"/><circle cx="480.8" cy="266.3" r="1.7" fill="currentColor" fill-opacity=".45"/><circle cx="344.0" cy="234.2" r="0.9" fill="currentColor" fill-opacity=".45"/><circle cx="310.3" cy="253.4" r="0.9" fill="currentColor" fill-opacity=".45"/><circle cx="495.2" cy="266.0" r="1.3" fill="currentColor" fill-opacity=".45"/><circle cx="423.4" cy="238.3" r="0.9" fill="currentColor" fill-opacity=".45"/><circle cx="501.7" cy="244.6" r="1.3" fill="currentColor" fill-opacity=".45"/>`,

  'brandsohle': `<path d="M560.0 228.0L560.0 200.0L522.0 202.5L478.6 204.6L440.7 205.6L402.7 206.0L364.7 205.7L321.4 204.6L278.0 202.5L240.0 200.0L240.0 228.0L270.0 228.0L270.0 270.0L288.0 270.0L288.0 228.0L512.0 228.0L512.0 270.0L530.0 270.0L530.0 228.0L560.0 228.0Z" fill="currentColor" fill-opacity="0.28" stroke="currentColor" stroke-opacity=".8" stroke-width="1.4" stroke-linejoin="round"/>`,

  'rahmen': `<path d="M246.0 270.0L244.0 270.0L244.0 254.0L240.4 253.8L235.6 253.0L231.8 251.8L227.2 249.6L180.1 253.7L178.6 254.2L177.5 254.9L176.7 256.0L176.2 257.3L176.0 259.0L176.0 272.0L246.0 272.0L246.0 270.0ZM624.0 258.1L623.6 256.6L623.0 255.4L622.0 254.5L619.9 253.7L572.8 249.6L568.2 251.8L564.4 253.0L559.6 253.8L556.0 254.0L556.0 270.0L554.0 270.0L554.0 272.0L624.0 272.0L624.0 258.1Z" fill="currentColor" fill-opacity="0.55" stroke="currentColor" stroke-opacity=".8" stroke-width="1.4" stroke-linejoin="round"/>`,

  'futter': `<path d="M240.0 228.0L240.1 159.8L240.4 152.8L240.9 146.8L241.6 141.3L242.5 136.3L243.5 131.5L246.1 122.8L247.7 118.7L251.4 111.1L253.5 107.6L258.2 100.8L263.7 94.6L269.9 88.8L276.9 83.5L280.7 81.0L289.0 76.4L293.4 74.2L303.0 70.3L308.1 68.5L319.0 65.4L324.9 64.0L337.4 61.7L344.1 60.7L358.7 59.2L366.7 58.7L385.6 58.1L414.4 58.1L424.5 58.3L433.3 58.7L448.8 59.9L455.9 60.7L469.0 62.8L475.1 64.0L486.6 66.9L491.9 68.5L501.9 72.2L506.6 74.2L515.2 78.6L519.3 81.0L526.7 86.1L530.1 88.8L536.3 94.6L541.8 100.8L544.2 104.1L548.6 111.1L550.5 114.9L553.9 122.8L555.3 127.0L557.5 136.3L558.4 141.3L559.1 146.8L559.6 152.8L559.9 159.8L560.0 170.1L560.0 228.0L554.7 228.0L551.2 228.2L547.7 228.8L544.9 229.7L541.6 231.2L539.0 232.9L536.3 235.4L534.8 237.2L533.2 239.6L531.8 242.6L530.8 245.7L530.3 248.9L530.0 252.9L530.0 270.0L540.0 270.0L540.0 253.1L540.2 250.3L541.1 246.3L542.0 244.4L543.4 242.4L544.7 241.2L546.1 240.2L548.6 239.0L552.3 238.2L557.6 237.9L560.0 237.5L562.1 237.0L564.3 236.1L566.1 234.8L567.8 232.9L568.9 230.9L569.5 228.6L569.9 226.3L570.0 223.8L570.0 170.0L569.9 159.4L569.6 152.3L569.1 145.9L568.3 140.0L567.4 134.4L566.2 129.2L564.9 124.3L563.3 119.5L561.6 115.0L559.6 110.6L557.3 106.2L554.9 102.2L549.7 94.8L546.6 91.0L543.4 87.5L536.6 81.2L532.8 78.2L528.6 75.2L524.4 72.5L515.6 67.5L510.8 65.2L500.4 60.9L489.4 57.3L483.5 55.7L470.8 52.9L457.1 50.8L442.2 49.2L424.9 48.3L414.5 48.1L385.5 48.1L366.2 48.7L350.2 49.9L335.7 51.8L322.8 54.2L310.7 57.3L299.6 60.9L289.4 65.1L280.0 69.9L271.4 75.2L263.6 81.1L260.0 84.2L256.4 87.7L250.4 94.6L247.5 98.5L242.7 106.2L240.5 110.4L238.4 115.0L236.7 119.5L235.2 124.0L233.8 129.2L232.6 134.4L231.7 140.0L230.9 145.9L230.4 152.3L230.1 159.4L230.0 223.8L230.1 226.3L230.6 229.2L231.1 230.9L232.0 232.5L233.3 234.3L235.4 235.9L237.2 236.8L240.0 237.5L242.4 237.9L247.7 238.2L251.4 239.0L253.9 240.2L255.3 241.2L256.8 242.7L258.0 244.4L258.9 246.3L259.8 250.3L260.0 253.1L260.0 270.0L270.0 270.0L270.0 252.9L269.7 248.9L269.2 245.7L268.2 242.6L266.8 239.6L265.2 237.2L263.7 235.4L261.0 232.9L258.4 231.2L255.1 229.7L252.3 228.8L248.8 228.2L245.3 228.0L240.0 228.0Z" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-opacity=".8" stroke-width="1.4" stroke-linejoin="round"/>`,

  'schaft': `<path d="M230.5 228.9L230.1 226.6L230.0 223.9L230.0 170.0L230.1 159.5L230.4 152.2L231.0 145.7L231.7 139.9L232.6 134.3L233.8 129.1L235.1 124.2L236.7 119.4L238.5 114.8L240.4 110.5L242.6 106.3L245.0 102.3L247.6 98.4L250.4 94.6L253.4 91.1L256.5 87.6L263.5 81.2L271.3 75.2L279.8 69.9L284.4 67.5L294.3 62.9L305.0 59.0L316.5 55.7L322.7 54.2L335.8 51.8L350.2 49.9L366.2 48.7L385.4 48.1L414.6 48.1L433.8 48.7L449.9 49.9L464.2 51.8L477.3 54.2L489.3 57.3L500.5 60.9L510.7 65.1L520.2 69.9L528.8 75.3L532.7 78.2L540.1 84.3L543.5 87.6L546.6 91.1L549.7 94.7L552.4 98.4L555.0 102.2L557.4 106.3L559.6 110.5L561.5 114.8L563.3 119.4L564.9 124.2L566.2 129.1L567.4 134.3L568.3 139.9L569.0 145.8L569.6 152.2L569.9 159.5L570.0 223.9L569.9 226.7L569.5 228.9L568.9 230.9L568.0 232.6L567.0 233.9L565.8 235.1L564.3 236.1L562.5 236.9L560.4 237.5L557.8 237.9L552.2 238.2L548.3 239.1L546.4 240.0L544.7 241.2L543.2 242.7L542.4 243.8L540.9 246.9L540.4 248.9L540.1 251.0L540.0 270.0L556.0 270.0L556.0 254.0L559.6 253.8L562.9 253.3L567.0 252.3L571.6 250.3L575.4 247.9L578.8 244.8L581.5 241.2L583.6 237.1L585.0 233.0L585.7 228.6L586.0 224.0L585.9 158.9L585.5 150.9L585.0 144.2L584.1 137.6L583.0 130.9L581.7 125.2L580.1 119.4L578.2 113.7L576.3 108.8L574.1 103.8L571.4 98.7L568.4 93.5L565.6 89.3L562.4 85.0L558.6 80.4L554.7 76.2L550.9 72.5L546.9 69.0L542.2 65.2L537.7 62.0L533.2 59.1L528.1 56.0L522.5 53.1L512.0 48.2L505.9 45.9L499.8 43.7L487.6 40.2L480.5 38.6L466.6 36.0L451.7 34.0L443.4 33.3L425.5 32.3L414.9 32.1L385.1 32.1L365.2 32.7L348.7 34.0L340.6 34.9L333.1 36.0L319.4 38.6L312.4 40.2L300.2 43.7L293.8 46.0L282.7 50.5L277.0 53.3L267.2 58.8L262.1 62.1L257.3 65.6L253.3 68.8L249.3 72.4L245.0 76.6L241.4 80.4L238.0 84.5L234.6 89.1L231.3 94.1L228.6 98.7L226.2 103.2L223.6 109.0L221.6 114.1L219.9 119.2L218.2 125.4L216.9 131.6L215.9 137.6L215.1 143.8L214.5 150.9L214.1 159.2L214.0 169.9L214.0 224.5L214.2 228.1L214.8 231.8L215.9 235.9L218.1 240.6L220.7 244.3L224.0 247.5L227.2 249.6L231.8 251.8L235.6 253.0L240.4 253.8L244.0 254.0L244.0 270.0L260.0 270.0L260.0 253.1L259.8 250.2L258.9 246.3L258.0 244.4L257.2 243.2L255.9 241.7L254.8 240.8L253.0 239.7L251.1 238.9L247.8 238.2L242.2 237.9L239.7 237.5L237.6 236.9L235.7 236.1L234.2 235.1L233.0 233.9L232.0 232.6L231.1 230.9L230.5 228.9Z" fill="currentColor" fill-opacity="0.42" stroke="currentColor" stroke-opacity=".8" stroke-width="1.4" stroke-linejoin="round"/>`,

  'einstechnaht': `<path d="M204 265L284 256" fill="none" stroke="currentColor" stroke-width="2.4" stroke-dasharray="6 4.5" stroke-linecap="round"/><path d="M596 265L516 256" fill="none" stroke="currentColor" stroke-width="2.4" stroke-dasharray="6 4.5" stroke-linecap="round"/>`,

  'doppelnaht': `<path d="M194 256L194 301" fill="none" stroke="currentColor" stroke-width="2.4" stroke-dasharray="6 4.5" stroke-linecap="round"/><path d="M606 256L606 301" fill="none" stroke="currentColor" stroke-width="2.4" stroke-dasharray="6 4.5" stroke-linecap="round"/>`,

  'fuss': `<path d="M548.0 138.0L547.9 147.5L547.5 152.7L546.8 156.9L545.9 160.6L544.8 163.9L543.4 166.9L541.7 169.8L539.7 172.4L537.5 174.8L535.1 177.1L532.3 179.2L529.3 181.2L522.5 184.9L514.6 188.0L510.2 189.4L500.4 191.9L489.3 194.0L476.6 195.6L461.9 196.8L444.2 197.6L419.7 198.0L390.1 198.0L361.0 197.7L351.0 197.4L334.2 196.6L320.0 195.2L307.8 193.5L297.0 191.4L287.6 188.8L279.4 185.7L272.3 182.2L269.1 180.3L266.3 178.2L263.7 176.0L261.3 173.6L259.3 171.1L257.5 168.4L255.9 165.5L254.6 162.3L253.6 158.8L252.8 154.9L252.3 150.3L252.0 144.2L252.0 131.4L252.3 124.9L252.8 120.0L253.6 115.8L254.6 112.1L255.9 108.7L257.5 105.6L259.3 102.7L261.3 100.0L263.7 97.5L266.3 95.1L269.1 92.9L272.3 90.9L275.7 88.9L283.3 85.4L292.2 82.4L302.2 79.9L313.7 77.8L326.8 76.2L342.1 75.0L361.0 74.3L372.9 74.1L419.7 74.0L433.4 74.2L444.2 74.4L461.9 75.3L476.6 76.5L489.3 78.3L500.4 80.5L510.2 83.1L518.7 86.3L526.1 89.9L529.3 91.9L532.3 94.0L535.1 96.3L537.5 98.7L539.7 101.3L541.7 104.1L543.4 107.1L544.8 110.4L545.9 113.9L546.8 117.8L547.5 122.3L547.9 127.8L548.0 138.0Z" fill="none" stroke="currentColor" stroke-opacity=".35" stroke-width="1.2" stroke-dasharray="2 4" stroke-linecap="round"/>`,

}
