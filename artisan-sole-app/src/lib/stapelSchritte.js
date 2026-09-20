/**
 * Derselbe Aufbau wie in lib/aufbauSchritte.js — nur von der anderen Seite
 * angesehen.
 *
 * Der Schnitt dort erzählt, WIE die Lagen ineinandergreifen. Dieser Stapel
 * erzählt, WAS zusammenkommt, und läuft auf etwas hinaus, das der Schnitt
 * nur nebenbei sagt: dass ein rahmengenähter Schuh aus zwei Teilen besteht,
 * von denen eines bleibt und eines gewechselt wird.
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
    text: 'Sie liegt unter dem Fuß. Aus ihr ist eine Rippe aufgestellt, die '
        + 'rundherum läuft — die gestrichelte Linie auf dem Blatt.',
  },
  {
    titel: 'Der Rahmen',
    text: 'Ein schmaler Lederstreifen, rundherum an die Rippe genäht. Er steht '
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
        + 'diese beiden — der Schaft hängt nicht daran.',
  },
  {
    titel: 'Und hier wird getrennt',
    text: 'Ein Schuhmacher trennt die Doppelnaht auf, nimmt Sohle und Absatz ab '
        + 'und näht neue an. Der Oberschuh bleibt dabei unberührt.',
  },
]
