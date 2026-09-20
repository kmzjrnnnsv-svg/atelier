/**
 * Die Pflege eines rahmengenähten Schuhs, in fünf Handgriffen.
 *
 * ── Warum diese Datei getrennt liegt ──────────────────────────────────────
 *
 * Wie beim Aufbau (lib/aufbauSchritte.js): Die Zeichnung (SpannerSchnitt)
 * und die Folge auf der Seite (PflegeFolge) brauchen dieselben Schritte, und
 * ein Bauteil, das nebenbei Daten ausführt, lässt sich nicht neu laden, ohne
 * dass die Entwicklungsumgebung meckert.
 *
 * ── Was hier steht und was nicht ──────────────────────────────────────────
 *
 * Jeder Schritt sagt, WANN er dran ist, und das ist die Angabe, nach der
 * gefragt wird. „Regelmäßig pflegen" hat noch niemandem geholfen; „nach
 * jedem Tragen" und „alle zehn bis fünfzehn Male" schon.
 *
 * Die Abstände sind Erfahrungswerte aus dem Handwerk, keine Zusage dieses
 * Hauses — deshalb steht nirgends eine Zahl, die nur für ein bestimmtes
 * Mittel gilt. Was im Pflege-Set liegt, steht im Katalog und wird von dort
 * geholt, nicht hier gepflegt.
 */
export const PFLEGE = [
  {
    wann: 'Am Abend',
    titel: 'Der Schuh kommt feucht nach Hause',
    text: 'Ein Fuß gibt am Tag Feuchtigkeit ab, und sie steht im Futter. Leder, '
        + 'das feucht zusammenfällt, behält diese Form — genau da, wo der Schuh '
        + 'sich beim Gehen biegt.',
  },
  {
    wann: 'Sofort danach',
    titel: 'Der Spanner kommt hinein',
    text: 'Solange der Schuh noch warm ist. Dann legt sich das Leder über das Holz '
        + 'und nicht über die Falte, die es sich gerade gemerkt hat.',
  },
  {
    wann: 'Über Nacht',
    titel: 'Die Form kommt zurück',
    text: 'Der Spanner drückt Ferse und Spitze auseinander und streckt den Schaft. '
        + 'Was am Abend noch eine Kerbe war, ist am Morgen wieder eine Linie.',
  },
  {
    wann: 'Einen Tag lang',
    titel: 'Das Zedernholz zieht',
    text: 'Unbehandeltes Zedernholz nimmt die Feuchtigkeit aus dem Futter auf. Zwei '
        + 'Paar im Wechsel geben jedem davon diesen Tag.',
  },
  {
    wann: 'Alle zehn bis fünfzehn Male',
    titel: 'Bürste und Creme',
    text: 'Erst den Staub aus der Narbung bürsten, dann dünn Creme auftragen und '
        + 'ziehen lassen. Der Glanz kommt danach vom Bürsten, nicht von der Menge.',
  },
]
