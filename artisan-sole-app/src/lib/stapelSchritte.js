/**
 * Derselbe Aufbau wie in lib/aufbauSchritte.js — nur von der anderen Seite
 * angesehen, und auf der Seite VOR ihm.
 *
 * Dieser Stapel erzählt, WORAUS ein Schuh besteht: sieben Teile, flach
 * übereinandergelegt, jedes mit eigener Kontur. Er läuft auf eine Trennlinie
 * hinaus — oben, was bleibt; unten, was gewechselt wird. Der Schnitt danach
 * erzählt, WIE die Lagen ineinandergreifen, und beantwortet damit die Frage,
 * die diese Tafel offen lässt: warum es diese Linie überhaupt gibt.
 *
 * Die Reihenfolge war lange umgekehrt, und das war der Fehler. Wer den
 * Schnitt zuerst sieht, sieht sechs Lagen ineinandergreifen und weiß
 * hinterher nicht, welche davon zusammengehören. Wer den Stapel zuerst
 * sieht, weiß es — und schaut den Schnitt danach mit einer Frage an.
 *
 * Die Schritte müssen deshalb nicht dieselben sein wie dort. Hier sind es
 * sieben, und der siebte ist der eigentliche Grund für die ganze Tafel.
 */
export const STAPEL = [
  {
    titel: 'Der Oberschuh',
    text: 'Schaft und Futter, über den Leisten gezogen und nach innen gezwickt. '
        + 'Alles, was jetzt kommt, kommt darunter.',
  },
  {
    titel: 'Die Brandsohle',
    text: 'Sie liegt unter dem Fuß. Unter ihr klebt die Lippe, ein Band, das '
        + 'rundherum läuft: die gestrichelte Linie auf dem Blatt.',
  },
  {
    titel: 'Der Rahmen',
    text: 'Ein schmaler Lederstreifen, rundherum an die Lippe genäht. Er steht '
        + 'seitlich heraus; das ist der Rand, den man am fertigen Schuh sieht.',
  },
  {
    titel: 'Die Korkbettung',
    text: 'Füllt die Fläche, die der Rahmen umschließt. Kork gibt unter dem '
        + 'Gewicht nach und nimmt nach einigen Wochen die Form deines Fußes an.',
  },
  {
    titel: 'Laufsohle und Absatz',
    text: 'Beide kommen von unten dazu. Sie berühren den Boden, und sie sind '
        + 'das Einzige an diesem Schuh, das sich abläuft.',
  },
  {
    titel: 'Die Doppelnaht',
    text: 'Läuft rundherum durch den Rahmen in die Laufsohle. Sie fasst nur '
        + 'diese beiden. Der Schaft hängt nicht daran.',
  },
  {
    titel: 'Und hier wird getrennt',
    text: 'Ein Schuhmacher trennt die Doppelnaht auf, nimmt Sohle und Absatz ab '
        + 'und näht neue an. Der Oberschuh bleibt dabei unberührt.',
  },
]
