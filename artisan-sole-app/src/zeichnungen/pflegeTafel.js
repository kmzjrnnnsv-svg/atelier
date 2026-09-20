/**
 * pflegeTafel — der Loafer mit Spanner, Bürste und Creme, in fünf Schritten.
 *
 * Die Tafel kommt als Datei aus der Zeichenmappe und wird hier nur
 * hereingereicht: viewBox und Innenleben, sonst nichts. Die <svg>-Hülle baut
 * das Bauteil, das sie benutzt (SpannerSchnitt.jsx) — es braucht sie, um `data-step`
 * zu setzen, und es soll die Datei dafür nicht anfassen müssen.
 *
 * Alle Klassen und Kennungen tragen `as-`. Ein <style> im SVG gilt für das
 * ganze Dokument, und Namen wie `.label` oder `.tool` wären in einer
 * Anwendung eine Falle für den Nächsten, der eine Klasse so nennt.
 *
 * Die Farben stehen als CSS-Eigenschaften (--as-line, --as-light, --as-mid,
 * --as-tone, --as-deep, --as-dark, --as-stitch, --as-label) und werden vom
 * Bauteil gesetzt. Deshalb hier keine feste Farbe ändern.
 */
export const VIEWBOX = '12 26 766 328'

export const MARKUP = `
<title>Schuhpflege in fünf Schritten</title><style>
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
  .as-steam  { fill: none; stroke: url(#as-fade-pf); stroke-width: 1.4; stroke-linecap: round; }
  .as-leader { fill: none; stroke: var(--as-label, #6b6a66); stroke-width: .75; }
  .as-dot    { fill: var(--as-label, #6b6a66); }
  .as-label  { font-family: Jost, Futura, "Helvetica Neue", Arial, sans-serif; font-size: 12px;
            letter-spacing: 2.6px; fill: var(--as-label, #6b6a66); }
  .as-nss *  { vector-effect: non-scaling-stroke; }
</style>
<defs><linearGradient id="as-fade-pf" gradientUnits="userSpaceOnUse" x1="0" y1="150" x2="0" y2="30">
  <stop offset="0" stop-color="#2b2b2b" stop-opacity=".9"/><stop offset="1" stop-color="#2b2b2b" stop-opacity="0"/>
</linearGradient></defs><style>
  .as-layer { opacity: 0; transition: opacity .6s ease; }
  .as-upper, .as-strap { transition: fill-opacity .6s ease; }
  svg[data-step]:not([data-step="1"]) .as-upper, svg[data-step]:not([data-step="1"]) .as-strap { fill-opacity: .5; }
  [data-step="1"] .as-s1, [data-step="2"] .as-s2, [data-step="3"] .as-s3, [data-step="4"] .as-s4, [data-step="5"] .as-s5 { opacity: 1; }
  [data-step="5"] .as-s5-dim { opacity: .35; }
  @media (prefers-reduced-motion: reduce) { .as-layer, .as-upper, .as-strap { transition: none; } }
</style><path class="as-sole" d="M 40,270 C 110,274 180,280 250,289 C 330,300 420,309 520,309 C 600,308 660,300 722,289 C 740,290 752,294 751,302 C 750,310 740,313 722,316 C 680,321 620,326 530,326 C 440,326 360,322 320,316 C 300,313 290,311 282,311 L 258,306 L 256,318 L 230,321 L 228,334 L 42,334 C 39,334 38,332 38,330 Z"/><path class="as-welt" d="M 42,273 C 110,277 180,283 250,291 C 330,302 420,311 520,311 C 600,310 660,302 724,291 C 738,292 746,295 748,299"/><path class="as-fine" d="M 39,312 L 228,312"/><path class="as-fine" d="M 39,324 L 228,324"/><path class="as-upper" d="M 66,101 C 130,111 250,133 372,153 C 371,128 377,97 389,92 C 400,88 410,102 416,112 L 440,113 L 447,120 L 458,150 L 470,137 C 486,145 498,155 506,165 C 509,168 512,170 515,172 C 560,193 620,208 680,216 C 714,221 737,241 738,265 C 739,281 733,288 722,289 C 660,300 600,308 520,309 C 420,309 330,300 250,289 C 180,280 110,274 40,270 C 32,258 28,238 28,212 C 28,172 38,128 66,101 Z"/><path class="as-lining" d="M 72,107 C 160,121 280,143 376,160 L 395,161 L 385,178 L 381,177 C 300,163 200,139 100,116 Z"/><g class="as-layer as-s2 as-s3 as-s4 as-s5"><g id="as-tree-pf"><path class="as-tree" d="M 60,264 C 44,222 46,166 78,141 C 100,124 140,128 148,150 C 154,166 142,178 128,182 C 136,196 156,200 190,200 L 190,238 C 176,246 166,258 164,272 C 130,270 94,266 60,264 Z"/><path class="as-tree" d="M 190,204 L 362,204 L 362,211 L 190,211 Z"/><path class="as-tree" d="M 190,222 L 362,222 L 362,229 L 190,229 Z"/><path class="as-tree" d="M 360,298 L 360,214 C 360,203 368,197 380,197 C 420,197 452,202 480,204 C 560,210 630,226 686,242 C 716,252 728,272 716,284 C 680,292 620,300 540,303 C 460,304 400,300 360,298 Z"/><path class="as-grain" d="M 64,240 C 60,210 66,176 88,156"/><path class="as-grain" d="M 80,250 C 76,220 82,190 102,170"/><path class="as-grain" d="M 420,280 C 480,276 560,280 640,276"/><path class="as-grain" d="M 440,292 C 520,290 600,292 680,284"/><path class="as-grain" d="M 470,236 C 520,234 560,240 600,244"/><path class="as-seam" d="M 718,272 C 660,264 590,258 520,258" opacity=".7"/><circle class="as-hole" cx="548" cy="234" r="2.8"/><circle class="as-hole" cx="578" cy="239" r="3.4"/><circle class="as-hole" cx="608" cy="244" r="2.8"/></g></g><path class="as-stitch" d="M 106,124 C 200,145 300,168 378,184"/><path class="as-stitch" d="M 379,160 C 378,128 382,103 389,98 C 396,95 404,103 410,112"/><path class="as-stitch" d="M 486,207 C 560,210 640,215 690,220 C 706,222 717,227 723,234"/><path class="as-strap" d="M 372,203 L 424,116 C 430,113 436,112 441,113 L 447,120 L 458,150 L 470,137 C 486,145 498,155 506,165 L 482,217 C 446,213 406,208 372,203 Z"/><path class="as-stitch" d="M 497,169 L 476,209 C 448,205 412,200 383,197 L 427,124 L 437,121"/><path class="as-stitch" d="M 441,121 L 451,149"/><g class="as-layer as-s1 as-s2"><path class="as-crease" d="M 566,196 C 559,212 570,226 563,242 C 559,254 566,265 563,278"/><path class="as-crease" d="M 597,205 C 590,221 601,235 594,251 C 590,263 597,273 594,286"/><path class="as-crease" d="M 581,201 C 578,211 585,219 580,229"/></g><g class="as-layer as-s4 as-s5-dim"><path class="as-steam" d="M 196,124 C 184,106 206,94 196,76 C 188,62 202,52 197,38" opacity="1"/><path class="as-steam" d="M 250,134 C 238,116 260,104 250,86 C 242,72 256,62 251,48" opacity="1"/><path class="as-steam" d="M 304,144 C 292,126 314,114 304,96 C 296,82 310,72 305,58" opacity="1"/></g><g class="as-layer as-s5"><path class="as-tool" d="M 470,72 C 470,54 490,46 552,46 C 614,46 632,54 632,72 Z"/><rect class="as-tool" x="474" y="72" width="154" height="9" rx="2"/><path class="as-grain" d="M 490,60 C 530,55 580,55 616,60"/><line class="as-bristle" x1="480" y1="81" x2="479.4" y2="104"/><line class="as-bristle" x1="485" y1="81" x2="485.6" y2="104"/><line class="as-bristle" x1="490" y1="81" x2="489.4" y2="104"/><line class="as-bristle" x1="495" y1="81" x2="495.6" y2="104"/><line class="as-bristle" x1="500" y1="81" x2="499.4" y2="104"/><line class="as-bristle" x1="505" y1="81" x2="505.6" y2="104"/><line class="as-bristle" x1="510" y1="81" x2="509.4" y2="104"/><line class="as-bristle" x1="515" y1="81" x2="515.6" y2="104"/><line class="as-bristle" x1="520" y1="81" x2="519.4" y2="104"/><line class="as-bristle" x1="525" y1="81" x2="525.6" y2="104"/><line class="as-bristle" x1="530" y1="81" x2="529.4" y2="104"/><line class="as-bristle" x1="535" y1="81" x2="535.6" y2="104"/><line class="as-bristle" x1="540" y1="81" x2="539.4" y2="104"/><line class="as-bristle" x1="545" y1="81" x2="545.6" y2="104"/><line class="as-bristle" x1="550" y1="81" x2="549.4" y2="104"/><line class="as-bristle" x1="555" y1="81" x2="555.6" y2="104"/><line class="as-bristle" x1="560" y1="81" x2="559.4" y2="104"/><line class="as-bristle" x1="565" y1="81" x2="565.6" y2="104"/><line class="as-bristle" x1="570" y1="81" x2="569.4" y2="104"/><line class="as-bristle" x1="575" y1="81" x2="575.6" y2="104"/><line class="as-bristle" x1="580" y1="81" x2="579.4" y2="104"/><line class="as-bristle" x1="585" y1="81" x2="585.6" y2="104"/><line class="as-bristle" x1="590" y1="81" x2="589.4" y2="104"/><line class="as-bristle" x1="595" y1="81" x2="595.6" y2="104"/><line class="as-bristle" x1="600" y1="81" x2="599.4" y2="104"/><line class="as-bristle" x1="605" y1="81" x2="605.6" y2="104"/><line class="as-bristle" x1="610" y1="81" x2="609.4" y2="104"/><line class="as-bristle" x1="615" y1="81" x2="615.6" y2="104"/><line class="as-bristle" x1="620" y1="81" x2="619.4" y2="104"/><rect class="as-tool" x="652" y="70" width="80" height="32" rx="3"/><rect class="as-tool" x="648" y="62" width="88" height="12" rx="3"/><path class="as-fine" d="M 660,86 L 724,86"/><path class="as-shine" d="M 704,230 C 720,236 731,248 734,261"/><path class="as-shine" d="M 694,239 C 707,244 715,252 718,262" opacity=".55"/><path class="as-shine" d="M 748,214 L 748,226 M 742,220 L 754,220" opacity=".7"/></g><g class="as-layer as-s1 as-s2"></g><g class="as-layer as-s2 as-s3 as-s4 as-s5"></g><g class="as-layer as-s4"></g>
`

