/**
 * loaferTafel — der Loafer allein: ohne Spanner, ohne Werkzeug, ohne Falten.
 *
 * ── Warum sie hier liegt, obwohl niemand sie benutzt ──────────────────────
 *
 * Sie kam mit der Zeichenmappe und ist das saubere Grundbild, aus dem die
 * Pflegetafel gebaut ist. Auf der Seite steht sie heute nirgends: Die
 * Modellkapitel tragen die echten Aufnahmen aus dem Katalog, und ein
 * gezeichneter Schuh daneben wäre ein zweiter Schuh, nicht derselbe.
 *
 * Sie bleibt trotzdem liegen, weil sie eine Vorlage ist und keine tote
 * Zeile Programm: Wer eine Seite braucht, auf der ein Schuh stehen soll und
 * kein Foto da ist — ein Größenratgeber, ein Pflegeblatt, eine E-Mail —,
 * hat sie hier und muss sie nicht neu zeichnen lassen.
 *
 * Alle Klassen und Kennungen tragen `as-` und das Kürzel `-lo`; die Farben
 * stehen als CSS-Eigenschaften (siehe farben.js).
 */
export const VIEWBOX = '12 26 766 328'

export const MARKUP = `
<title>Penny Loafer</title><style>
  .as-upper, .as-strap, .as-sole, .as-tree, .as-tool, .as-lining,
  .as-fa, .as-fb, .as-fc, .as-fd, .as-fe, .as-sa, .as-sb, .as-sc, .as-sd, .as-se
          { stroke: var(--as-line, #2b2b2b); stroke-width: 1.25; stroke-linejoin: round; }
  .as-upper  { fill: var(--as-light, #ecebe8); }
  .as-strap  { fill: var(--as-light, #ecebe8); }
  .as-ghost  { fill-opacity: .5; }
  .as-lining { fill: var(--as-mid, #d6d5d1); stroke-width: 1.0; }
  .as-sole   { fill: var(--as-tone, #c3c2bd); }
  .as-tree, .as-tool { fill: var(--as-tone, #c3c2bd); stroke-width: 1.0625; }
  .as-fa { fill: var(--as-light, #ecebe8); } .as-fb { fill: var(--as-mid, #d6d5d1); } .as-fc { fill: var(--as-tone, #c3c2bd); }
  .as-fd { fill: var(--as-deep, #a5a4a0); }  .as-fe { fill: var(--as-light, #ecebe8); }
  .as-sa, .as-sb, .as-sc, .as-se { fill: var(--as-deep, #a5a4a0); } .as-sd { fill: var(--as-dark, #8a8985); }
  .as-welt   { fill: none; stroke: var(--as-deep, #a5a4a0); stroke-width: 2.2; stroke-linecap: round; }
  .as-fine   { fill: none; stroke: var(--as-line, #2b2b2b); stroke-width: .7; opacity: .45; }
  .as-seam   { fill: none; stroke: var(--as-line, #2b2b2b); stroke-width: .9; opacity: .7; }
  .as-stitch { fill: none; stroke: var(--as-stitch, #7c7b77); stroke-width: 1; stroke-dasharray: 3.5 2.5; stroke-linecap: round; }
  .as-rib    { fill: none; stroke: var(--as-line, #2b2b2b); stroke-width: .9; stroke-dasharray: 1.5 3; stroke-linecap: round; opacity: .7; }
  .as-grain  { fill: none; stroke: var(--as-line, #2b2b2b); stroke-width: .6; opacity: .25; }
  .as-hole, .as-speck { fill: var(--as-line, #2b2b2b); opacity: .5; }
  .as-speck  { opacity: .25; }
  .as-crease, .as-shine { fill: none; stroke: var(--as-line, #2b2b2b); stroke-width: 1.3; stroke-linecap: round; }
  .as-bristle{ fill: none; stroke: var(--as-line, #2b2b2b); stroke-width: .9; opacity: .8; }
  .as-steam  { fill: none; stroke: url(#as-fade-lo); stroke-width: 1.4; stroke-linecap: round; }
  .as-leader { fill: none; stroke: var(--as-label, #6b6a66); stroke-width: .75; }
  .as-dot    { fill: var(--as-label, #6b6a66); }
  .as-label  { font-family: Jost, Futura, "Helvetica Neue", Arial, sans-serif; font-size: 12px;
            letter-spacing: 2.6px; fill: var(--as-label, #6b6a66); }
  .as-nss *  { vector-effect: non-scaling-stroke; }
</style>
<defs><linearGradient id="as-fade-lo" gradientUnits="userSpaceOnUse" x1="0" y1="150" x2="0" y2="30">
  <stop offset="0" stop-color="#2b2b2b" stop-opacity=".9"/><stop offset="1" stop-color="#2b2b2b" stop-opacity="0"/>
</linearGradient></defs><path class="as-sole" d="M 40,270 C 110,274 180,280 250,289 C 330,300 420,309 520,309 C 600,308 660,300 722,289 C 740,290 752,294 751,302 C 750,310 740,313 722,316 C 680,321 620,326 530,326 C 440,326 360,322 320,316 C 300,313 290,311 282,311 L 258,306 L 256,318 L 230,321 L 228,334 L 42,334 C 39,334 38,332 38,330 Z"/><path class="as-welt" d="M 42,273 C 110,277 180,283 250,291 C 330,302 420,311 520,311 C 600,310 660,302 724,291 C 738,292 746,295 748,299"/><path class="as-fine" d="M 39,312 L 228,312"/><path class="as-fine" d="M 39,324 L 228,324"/><path class="as-upper" d="M 66,101 C 130,111 250,133 372,153 C 371,128 377,97 389,92 C 400,88 410,102 416,112 L 440,113 L 447,120 L 458,150 L 470,137 C 486,145 498,155 506,165 C 509,168 512,170 515,172 C 560,193 620,208 680,216 C 714,221 737,241 738,265 C 739,281 733,288 722,289 C 660,300 600,308 520,309 C 420,309 330,300 250,289 C 180,280 110,274 40,270 C 32,258 28,238 28,212 C 28,172 38,128 66,101 Z"/><path class="as-lining" d="M 72,107 C 160,121 280,143 376,160 L 395,161 L 385,178 L 381,177 C 300,163 200,139 100,116 Z"/><path class="as-stitch" d="M 106,124 C 200,145 300,168 378,184"/><path class="as-stitch" d="M 379,160 C 378,128 382,103 389,98 C 396,95 404,103 410,112"/><path class="as-stitch" d="M 486,207 C 560,210 640,215 690,220 C 706,222 717,227 723,234"/><path class="as-strap" d="M 372,203 L 424,116 C 430,113 436,112 441,113 L 447,120 L 458,150 L 470,137 C 486,145 498,155 506,165 L 482,217 C 446,213 406,208 372,203 Z"/><path class="as-stitch" d="M 497,169 L 476,209 C 448,205 412,200 383,197 L 427,124 L 437,121"/><path class="as-stitch" d="M 441,121 L 451,149"/>
`

