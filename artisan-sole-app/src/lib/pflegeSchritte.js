/**
 * Ein Tag mit einem rahmengenähten Schuh, in fünf Handgriffen.
 *
 * ── Warum diese Datei getrennt liegt ──────────────────────────────────────
 *
 * Wie beim Aufbau (lib/aufbauSchritte.js): Die Zeichnung (SpannerSchnitt)
 * und die Folge auf der Seite (PflegeFolge) brauchen dieselben Schritte, und
 * ein Bauteil, das nebenbei Daten ausführt, lässt sich nicht neu laden, ohne
 * dass die Entwicklungsumgebung meckert.
 *
 * ── Warum ein Tag und keine Pflegeanleitung ───────────────────────────────
 *
 * Hier standen fünf Handgriffe am Schuh: feucht nach Hause, Spanner hinein,
 * Form kommt zurück, Zedernholz zieht, Creme. Alles richtig, und alles über
 * das Ding. Wer das liest, bekommt eine Gebrauchsanweisung — und eine
 * Gebrauchsanweisung ist das Letzte, was jemand vor einem Kauf lesen will.
 *
 * Jetzt ist es derselbe Inhalt als Tag: morgens schlüpfst du hinein,
 * tagsüber denkst du nicht an sie, abends kommt der Spanner, über Nacht
 * arbeitet das Holz. Dieselben fünf Angaben, dieselben Abstände — aber der,
 * der sie liest, kommt darin vor. Das ist der Unterschied zwischen „so
 * pflegt man Schuhe" und „so ist es, diese Schuhe zu haben", und der
 * entscheidet, ob ein Abschnitt Zubehör verkauft oder eine Vorstellung.
 *
 * Der Rhythmus, nach dem gefragt wird, steht trotzdem da: „Regelmäßig
 * pflegen" hat noch niemandem geholfen; „abends" und „alle zehn bis fünfzehn
 * Male" schon.
 *
 * ── Was hier steht und was nicht ──────────────────────────────────────────
 *
 * Die Abstände sind Erfahrungswerte aus dem Handwerk, keine Zusage dieses
 * Hauses — deshalb steht nirgends eine Zahl, die nur für ein bestimmtes
 * Mittel gilt. Was im Pflege-Set liegt, steht im Katalog und wird von dort
 * geholt, nicht hier gepflegt.
 *
 * Die `ab`-Angaben in components/SpannerSchnitt.jsx sind die Nummern dieser
 * Schritte, von eins an gezählt. Wer hier einen einschiebt, verschiebt dort
 * die ganze Szene.
 */
export const PFLEGE = [
  {
    wann: 'Morgens',
    titel: 'Du schlüpfst hinein',
    text: 'Der Schuh stand über Nacht auf dem Spanner und hat seine Linie zurück. '
        + 'Wer zwei Paar im Wechsel trägt, greift dabei immer nach dem, das einen '
        + 'ganzen Tag Zeit hatte.',
  },
  {
    wann: 'Tagsüber',
    titel: 'Du denkst nicht an sie',
    text: 'Genau dafür sind sie gebaut. Unter dem Fuß gibt der Kork nach, über dem '
        + 'Ballen knickt das Leder bei jedem Schritt, und am Abend sitzt dort eine '
        + 'Falte.',
  },
  {
    wann: 'Abends',
    titel: 'Der Spanner kommt hinein',
    text: 'Solange der Schuh noch warm ist. Dann legt sich das Leder über das Holz '
        + 'und nicht über die Falte, die es sich gerade gemerkt hat.',
  },
  {
    wann: 'Über Nacht',
    titel: 'Das Zedernholz zieht',
    text: 'Ein Fuß gibt am Tag Feuchtigkeit ab, und sie steht im Futter. '
        + 'Unbehandeltes Zedernholz zieht sie heraus, während der Spanner den '
        + 'Schaft streckt. Was abends eine Kerbe war, ist morgens eine Linie.',
  },
  {
    wann: 'Alle zehn bis fünfzehn Male',
    titel: 'Creme, dann Bürste',
    text: 'Erst den Staub aus der Narbung bürsten, dann dünn Creme auftragen und zehn '
        + 'Minuten ziehen lassen. Der Glanz kommt danach vom Bürsten, nicht von der '
        + 'Menge.',
  },
]
