/**
 * fussTeile — das Messen eines Fußes, in Einzelteilen.
 *
 * Die acht Teile kommen als einzelne Dateien aus der Zeichenmappe, alle mit
 * demselben Ausschnitt und schon an der richtigen Stelle. Hier liegen sie
 * nebeneinander; wer sie benutzt (MassAnleitung.jsx), setzt sie in ein SVG
 * und schaltet sie je Schritt.
 *
 * REIHENFOLGE ist die Stapelreihenfolge von unten nach oben, und sie zu
 * ändern heißt, das Bild zu ändern: Das Papier liegt unten, darüber die
 * Bleistiftlinie, darüber der Fuß, und ganz oben Maßband und Stift — sonst
 * verschwände der Stift unter dem Fuß, den er gerade umfährt.
 *
 * ── Kein Stilblatt ────────────────────────────────────────────────────────
 *
 * Diese Mappe malt ausschließlich mit `currentColor` und Deckkraft, ohne
 * Klassen und ohne `<style>`. Damit entfällt das Prefixen, das bei den
 * anderen Szenen nötig war (SVG-Stilblätter gelten dokumentweit), und STIL
 * bleibt leer. Die Farbe kommt von außen, siehe farben.js.
 *
 * Die Markierungen an Ferse und Spitze malen mit `--as-accent` und fallen
 * auf `currentColor` zurück. Diese Seite ist einfarbig; sie setzt deshalb
 * keinen eigenen Farbton, sondern lässt den Rückfall greifen. Die
 * Markierungen heben sich trotzdem ab, weil sie als Einzige mit voller
 * Deckkraft und 2,2 Einheiten Strichstärke gezeichnet sind.
 *
 * ── Die Kontur wird gezeichnet ────────────────────────────────────────────
 *
 * `kontur` trägt `pathLength="1"`. Damit lässt sich die Bleistiftlinie über
 * `stroke-dashoffset` von 1 nach 0 nachziehen, statt sie einzublenden — der
 * Unterschied zwischen „da ist eine Linie" und „hier wird gezeichnet".
 */
export const VIEWBOX = '47 63 450 569'

/* Diese Mappe braucht keines — siehe oben. */
export const STIL = ''

export const REIHENFOLGE = [
  'papier',
  'kontur',
  'markierung-ferse',
  'markierung-spitze',
  'lineal',
  'fuss',
  'massband',
  'stift',
]

export const TEILE = {
  'papier': `<path d="M415.3 75.3L58.8 125.4L128.4 620.6L484.9 570.5L415.3 75.3Z" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.7" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"/>`,

  'kontur': `<path d="M300.1 554.0L304.0 553.6L308.0 552.9L316.1 550.5L320.4 548.7L324.2 546.9L327.8 544.8L331.2 542.4L333.9 540.3L336.6 537.6L338.8 534.7L340.7 531.8L342.2 528.6L343.4 525.4L344.9 518.1L345.6 510.8L346.0 502.1L346.0 497.0L345.6 486.1L337.7 399.7L336.6 385.6L335.8 371.9L335.7 351.0L336.7 311.5L336.6 295.4L336.1 285.8L334.8 278.2L333.3 272.2L331.6 266.1L328.2 257.0L324.2 247.9L319.3 238.9L313.6 229.9L307.4 221.4L300.9 213.9L293.7 207.0L286.1 200.7L275.8 193.3L267.4 188.3L256.3 182.8L242.8 177.7L234.5 175.4L228.4 174.7L225.6 174.7L220.8 175.3L215.8 176.8L210.7 179.2L206.5 182.0L204.5 183.7L201.3 187.0L198.1 191.4L195.5 196.1L192.7 203.8L191.2 209.8L190.2 216.7L189.6 227.4L189.7 235.3L190.2 247.8L191.1 261.5L192.7 276.3L194.2 287.1L196.3 298.4L199.0 310.6L202.4 323.6L225.2 405.2L230.6 425.4L234.9 444.7L240.2 476.4L242.6 488.4L249.4 514.7L252.4 524.1L254.2 528.6L256.2 532.8L258.6 536.7L261.4 540.3L265.2 544.0L268.8 546.6L272.0 548.5L276.5 550.5L280.6 551.8L284.7 552.8L292.4 553.9L300.1 554.0Z" fill="none" stroke="currentColor" stroke-opacity="0.9" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" pathLength="1"/>`,

  'markierung-ferse': `<path d="M208.6 567.0L396.8 540.6" fill="none" stroke="currentColor" stroke-opacity="1" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" style="stroke: var(--as-accent, currentColor)"/>`,

  'markierung-spitze': `<path d="M154.9 184.6L343.0 158.1" fill="none" stroke="currentColor" stroke-opacity="1" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" style="stroke: var(--as-accent, currentColor)"/>`,

  'lineal': `<path d="M291.8 569.5L234.1 159.3L259.9 155.7L317.5 565.9Z" fill="currentColor" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.85" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"/><path d="M289.8 555.6L300.7 554.1M288.8 548.2L294.7 547.4M287.7 540.8L293.7 540.0M286.7 533.4L292.6 532.6M285.7 526.0L291.6 525.2M284.6 518.6L295.5 517.1M283.6 511.2L289.5 510.4M282.5 503.8L288.5 502.9M281.5 496.4L287.4 495.5M280.5 489.0L286.4 488.1M279.4 481.6L290.3 480.0M278.4 474.1L284.3 473.3M277.3 466.7L283.3 465.9M276.3 459.3L282.2 458.5M275.2 451.9L281.2 451.1M274.2 444.5L285.1 443.0M273.2 437.1L279.1 436.3M272.1 429.7L278.1 428.9M271.1 422.3L277.0 421.5M270.0 414.9L276.0 414.1M269.0 407.5L279.9 406.0M268.0 400.1L273.9 399.2M266.9 392.7L272.9 391.8M265.9 385.3L271.8 384.4M264.8 377.9L270.8 377.0M263.8 370.4L274.7 368.9M262.8 363.0L268.7 362.2M261.7 355.6L267.7 354.8M260.7 348.2L266.6 347.4M259.6 340.8L265.6 340.0M258.6 333.4L269.5 331.9M257.6 326.0L263.5 325.2M256.5 318.6L262.5 317.8M255.5 311.2L261.4 310.4M254.4 303.8L260.4 302.9M253.4 296.4L264.3 294.8M252.3 289.0L258.3 288.1M251.3 281.6L257.2 280.7M250.3 274.2L256.2 273.3M249.2 266.7L255.2 265.9M248.2 259.3L259.1 257.8M247.1 251.9L253.1 251.1M246.1 244.5L252.0 243.7M245.1 237.1L251.0 236.3M244.0 229.7L250.0 228.9M243.0 222.3L253.9 220.8M241.9 214.9L247.9 214.1M240.9 207.5L246.8 206.7M239.9 200.1L245.8 199.2M238.8 192.7L244.8 191.8M237.8 185.3L248.7 183.7M236.7 177.9L242.7 177.0" fill="none" stroke="currentColor" stroke-opacity="0.7" stroke-width="1" stroke-linejoin="round" stroke-linecap="round"/>`,

  'fuss': `<path d="M300.0 548.0L303.4 547.7L307.0 547.0L310.6 546.0L317.8 543.4L324.5 539.8L327.4 537.8L330.1 535.6L332.3 533.4L334.1 531.0L335.6 528.6L336.8 526.1L338.4 520.5L339.3 514.0L339.8 506.4L340.0 497.2L339.6 486.4L331.7 400.3L330.6 386.0L329.8 372.1L329.7 350.9L330.7 311.4L330.6 295.5L330.1 286.4L328.9 279.4L325.8 267.9L322.7 259.1L318.8 250.5L314.1 241.9L308.7 233.3L302.8 225.2L296.5 218.0L289.7 211.4L282.5 205.4L272.5 198.3L264.6 193.6L253.9 188.4L243.5 184.2L235.7 181.8L230.8 180.9L228.4 180.7L226.2 180.7L221.8 181.3L217.7 182.5L213.8 184.3L210.3 186.6L208.7 188.0L205.8 191.0L202.1 196.4L200.1 200.7L198.4 205.6L197.1 211.0L196.2 217.2L195.6 227.5L195.7 235.1L196.2 247.5L197.1 261.0L198.6 275.6L200.1 286.0L202.1 297.2L204.8 309.2L208.2 322.0L231.0 403.6L236.4 423.9L240.8 443.5L246.1 475.4L248.5 487.0L255.1 513.0L258.1 522.2L259.8 526.3L261.6 530.2L263.7 533.6L266.1 536.6L268.8 539.2L271.8 541.4L275.0 543.3L278.5 544.8L282.0 546.0L285.7 546.9L293.0 547.9L300.0 548.0Z" fill="currentColor" fill-opacity="0.3" stroke="currentColor" stroke-opacity="0.8" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"/><path d="M306.1 232.1L274.4 222.4L241.1 215.0L207.1 217.7" fill="none" stroke="currentColor" stroke-opacity="0.55" stroke-width="1.1" stroke-linejoin="round" stroke-linecap="round"/><path d="M281.7 403.1L273.6 359.8L261.2 315.1L247.7 276.6" fill="none" stroke="currentColor" stroke-opacity="0.35" stroke-width="1" stroke-linejoin="round" stroke-linecap="round"/><path d="M326.1 439.3L326.4 443.2L326.3 447.2L325.6 451.1L324.4 455.0L322.8 458.7L320.8 462.3L318.3 465.7L315.5 468.9L312.2 471.8L308.7 474.4L304.8 476.7L300.8 478.6L296.5 480.2L292.1 481.3L287.6 482.1L283.0 482.4L278.4 482.3L273.9 481.8L269.6 480.9L265.3 479.5L261.3 477.8L257.5 475.7L254.1 473.3L250.9 470.5L248.1 467.5L245.8 464.2L243.8 460.7L242.3 457.0L241.3 453.2L240.8 449.3L240.7 445.4L241.1 441.4L242.0 437.5L243.4 433.7L245.2 430.0L247.5 426.5L250.1 423.2L253.2 420.2L256.6 417.4L260.3 415.0L264.3 412.9L268.4 411.1L272.8 409.8L277.3 408.8L281.8 408.3L286.4 408.2L290.9 408.5L295.4 409.2L299.7 410.3L303.8 411.9L307.7 413.8L311.3 416.0L314.7 418.6L317.6 421.5L320.2 424.7L322.4 428.1L324.1 431.7L325.3 435.4L326.1 439.3Z" fill="currentColor" fill-opacity="0.42" stroke="currentColor" stroke-opacity="0.8" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"/><path d="M315.9 438.7L316.2 441.7L316.0 444.7L315.5 447.7L314.6 450.6L313.4 453.4L311.8 456.2L309.9 458.7L307.7 461.2L305.2 463.4L302.5 465.3L299.6 467.1L296.4 468.5L293.2 469.7L289.8 470.6L286.3 471.1L282.8 471.4L279.3 471.3L275.8 471.0L272.5 470.3L269.2 469.3L266.2 468.0L263.3 466.4L260.6 464.5L258.2 462.5L256.1 460.2L254.3 457.7L252.8 455.0L251.6 452.3L250.8 449.4L250.4 446.4L250.4 443.4L250.7 440.4L251.4 437.5L252.5 434.6L253.9 431.8L255.6 429.1L257.7 426.6L260.0 424.3L262.6 422.2L265.5 420.4L268.5 418.8L271.7 417.5L275.1 416.4L278.5 415.7L282.0 415.3L285.5 415.2L289.0 415.4L292.4 416.0L295.7 416.8L298.9 418.0L301.9 419.4L304.6 421.1L307.2 423.1L309.4 425.3L311.4 427.7L313.1 430.2L314.4 433.0L315.3 435.8L315.9 438.7Z" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.1" stroke-linejoin="round" stroke-linecap="round"/><path d="M319.8 455.5L318.0 459.1L315.8 462.5L313.1 465.7L310.1 468.6L306.6 471.2L302.9 473.5L298.9 475.4L294.7 476.8L290.4 477.9L286.0 478.5L281.5 478.7L277.1 478.4L272.7 477.7L268.5 476.6L264.5 475.0L260.7 473.0L257.3 470.7L254.2 468.0L251.5 465.1" fill="none" stroke="currentColor" stroke-opacity="0.35" stroke-width="0.8" stroke-linejoin="round" stroke-linecap="round"/><path d="M321.8 456.0L319.9 459.8L317.6 463.4L314.8 466.8L311.5 469.9L307.9 472.7L304.0 475.0L299.8 477.0L295.4 478.6L290.8 479.7L286.1 480.4L281.4 480.6L276.7 480.3L272.1 479.5L267.7 478.3L263.4 476.7L259.5 474.6L255.8 472.1L252.6 469.3L249.7 466.2" fill="none" stroke="currentColor" stroke-opacity="0.35" stroke-width="0.8" stroke-linejoin="round" stroke-linecap="round"/>`,

  'massband': `<path d="M127.3 283.7L388.6 283.8L388.6 298.8L127.3 298.7Z" fill="currentColor" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.85" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"/><path d="M133.3 283.7L133.3 287.7M139.3 283.7L139.3 287.7M145.3 283.7L145.3 287.7M151.3 283.7L151.3 287.7M157.3 283.7L157.3 290.7M163.3 283.7L163.3 287.7M169.3 283.7L169.3 287.7M175.3 283.7L175.3 287.7M181.3 283.7L181.3 287.7M187.3 283.7L187.3 290.7M193.3 283.7L193.3 287.7M199.3 283.7L199.3 287.7M205.3 283.7L205.3 287.7M211.3 283.7L211.3 287.7M217.3 283.7L217.3 290.7M223.3 283.7L223.3 287.7M229.3 283.7L229.3 287.7M235.3 283.7L235.3 287.7M241.3 283.7L241.3 287.7M247.3 283.7L247.3 290.7M253.3 283.7L253.3 287.7M259.3 283.7L259.3 287.7M265.3 283.7L265.3 287.7M271.3 283.7L271.3 287.7M277.3 283.7L277.3 290.7M283.3 283.7L283.3 287.7M289.3 283.7L289.3 287.7M295.3 283.7L295.3 287.7M301.3 283.7L301.3 287.7M307.3 283.7L307.3 290.7M313.3 283.7L313.3 287.7M319.3 283.7L319.3 287.7M325.3 283.7L325.3 287.7M331.3 283.7L331.3 287.7M337.3 283.7L337.3 290.7M343.3 283.7L343.3 287.7M349.3 283.7L349.3 287.7M355.3 283.7L355.3 287.7M361.3 283.8L361.3 287.8M367.3 283.8L367.3 290.8M373.3 283.8L373.3 287.8M379.3 283.8L379.3 287.8" fill="none" stroke="currentColor" stroke-opacity="0.6" stroke-width="0.9" stroke-linejoin="round" stroke-linecap="round"/><path d="M127.3 301.2L127.3 281.2L121.3 281.2L121.3 301.2Z" fill="currentColor" fill-opacity="0.5" stroke="currentColor" stroke-opacity="0.85" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="412.6" cy="291.3" r="26" fill="currentColor" fill-opacity=".38" stroke="currentColor" stroke-opacity=".85" stroke-width="1.4"/><circle cx="412.6" cy="291.3" r="15" fill="none" stroke="currentColor" stroke-opacity=".5" stroke-width="1"/><circle cx="412.6" cy="291.3" r="3.5" fill="currentColor"/><path d="M201.3 291.2m0.0 -12.0l-0.0 24.0M330.6 291.2m0.0 -12.0l-0.0 24.0" fill="none" stroke="currentColor" stroke-opacity="1" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" style="stroke: var(--as-accent, currentColor)"/>`,

  'stift': `<path d="M342.8 370.3L422.3 243.1L434.2 250.5L354.7 377.7Z" fill="currentColor" fill-opacity="0.32" stroke="currentColor" stroke-opacity="0.85" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"/><path d="M348.7 374.0L428.2 246.8" fill="none" stroke="currentColor" stroke-opacity="0.35" stroke-width="0.8" stroke-linejoin="round" stroke-linecap="round"/><path d="M337.1 392.6L342.8 370.3L354.7 377.7Z" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.85" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"/><path d="M337.1 392.6L338.8 385.5L342.7 387.9Z" fill="currentColor" fill-opacity="0.9" stroke="currentColor" stroke-opacity="0.9" stroke-width="1" stroke-linejoin="round" stroke-linecap="round"/><path d="M422.3 243.1L427.6 234.6L439.5 242.0L434.2 250.5Z" fill="currentColor" fill-opacity="0.55" stroke="currentColor" stroke-opacity="0.85" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"/><path d="M427.6 234.6L431.6 230.0Q438.8 229.8 441.8 236.4L439.5 242.0Z" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.85" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"/>`,
}
