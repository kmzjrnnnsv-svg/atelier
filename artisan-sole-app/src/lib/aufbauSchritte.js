/**
 * aufbauSchritte.js — in welcher Reihenfolge ein rahmengenähter Schuh
 * entsteht, und was bei jedem Schritt danebensteht.
 */
/**
 * Die Reihenfolge, in der ein rahmengenähter Schuh entsteht — und damit die
 * Reihenfolge, in der die Zeichnung sich aufbaut.
 *
 * Sie steht in einer eigenen Datei, weil Zeichnung und Text sonst
 * auseinanderlaufen: Wer eine Lage verschiebt, muss den Satz daneben
 * mitverschieben, und das merkt man nur, wenn beides an einer Stelle steht.
 *
 * Die `ab`-Angaben in components/RahmenSchnitt.jsx sind die Indizes dieser
 * Liste.
 *
 * Die Reihenfolge ist die echte. Der Rahmen wird nicht nach der Einstechnaht
 * angesetzt, sondern von ihr gefasst — beide gehören deshalb in einen
 * Schritt.
 */
export const AUFBAU = [
  {
    titel: 'Die Brandsohle',
    text: 'Auf ihr steht alles. Aus ihr wird eine Rippe aufgestellt, die gleich '
        + 'die erste Naht aufnimmt.',
  },
  {
    titel: 'Schaft und Futter',
    text: 'Werden über den Leisten gezogen und nach innen gezwickt — so bekommt '
        + 'der Schuh seine Form, bevor irgendetwas hält.',
  },
  {
    titel: 'Rahmen und Einstechnaht',
    text: 'Ein schmaler Lederstreifen läuft rundherum. Die Einstechnaht fasst '
        + 'Schaft, Futter und Rahmen an der Rippe zusammen.',
  },
  {
    titel: 'Die Korkbettung',
    text: 'Füllt den Hohlraum. Kork gibt unter dem Gewicht nach und nimmt nach '
        + 'einigen Wochen die Form deines Fußes an.',
  },
  {
    titel: 'Die Laufsohle',
    text: 'Wird aufgelegt. Bis hierher ist kein Klebstoff im Spiel, der etwas '
        + 'tragen müsste.',
  },
  {
    titel: 'Die Doppelnaht',
    text: 'Läuft durch den Rahmen in die Laufsohle. Sie lässt sich auftrennen, '
        + 'ohne den Schaft zu berühren — deshalb bekommt dieser Schuh eine neue '
        + 'Sohle und ein geklebter nicht.',
  },
]
