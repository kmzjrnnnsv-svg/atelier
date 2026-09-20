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
    // „Aus ihr wird eine Rippe aufgestellt" stand hier und war falsch. Das
    // macht der handgenähte Rahmen; beim Goodyear-Rahmen wird ein Band mit
    // L-Profil untergeklebt. Genau das ist der Unterschied zwischen den
    // beiden Macharten, und eine Seite, die mit Offenheit wirbt, darf ihn
    // nicht verwischen.
    text: 'Auf ihr steht alles. Unter sie wird eine Lippe geklebt — ein Band '
        + 'mit L-Profil, das rundherum läuft und die erste Naht aufnimmt.',
  },
  {
    titel: 'Schaft und Futter',
    text: 'Werden über den Leisten gezogen und nach innen gezwickt. Hier bekommt '
        + 'der Schuh die Form, die er behalten wird.',
  },
  {
    titel: 'Rahmen und Einstechnaht',
    text: 'Ein schmaler Lederstreifen läuft rundherum. Die Einstechnaht fasst '
        + 'Schaft, Futter und Rahmen an der Lippe zusammen.',
  },
  {
    titel: 'Die Korkbettung',
    text: 'Füllt den Hohlraum. Kork gibt unter dem Gewicht nach und nimmt nach '
        + 'einigen Wochen die Form deines Fußes an.',
  },
  {
    titel: 'Die Laufsohle',
    text: 'Wird aufgelegt und gleich darauf festgenäht. Was diesen Schuh '
        + 'zusammenhält, ist Garn.',
  },
  {
    titel: 'Die Doppelnaht',
    text: 'Läuft durch den Rahmen in die Laufsohle. Ein Schuhmacher trennt sie '
        + 'auf, ohne den Schaft zu berühren. Wie oft, hängt am Oberleder.',
  },
]
