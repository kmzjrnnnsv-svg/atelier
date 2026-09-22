/**
 * massSchritte.js — wie man die zwei Zahlen bekommt, nach denen der Laden
 * fragt.
 *
 * ── Warum das eine eigene Datei ist ───────────────────────────────────────
 *
 * Wie beim Aufbau und bei der Pflege: Die Zeichnung (FussMass) und die Folge
 * auf der Seite (MassNehmen) brauchen dieselben Schritte, und ein Bauteil,
 * das nebenbei Daten ausführt, lässt sich nicht neu laden, ohne dass die
 * Entwicklungsumgebung meckert.
 *
 * ── Warum es diesen Abschnitt überhaupt gibt ──────────────────────────────
 *
 * Die Seite sagt an vier Stellen „Fußlänge und Ballenumfang, mehr brauchen
 * wir nicht". Das ist ihr stärkster Satz über die Passform — und bis hierher
 * blieb er eine Behauptung, weil nirgends stand, wie man an die zwei Zahlen
 * kommt. Genau dort bricht ein Kauf ab: nicht am Preis, sondern an der
 * Frage, ob es passt.
 *
 * Ein Paar entsteht für einen bestimmten Fuß und ist danach für niemanden
 * sonst zu gebrauchen. Wer daneben misst, hat ein Paar, das niemandem passt
 * — deshalb steht hier kein Versprechen, sondern eine Anleitung.
 *
 * ── Was hier steht und was nicht ──────────────────────────────────────────
 *
 * Handgriffe, die jeder zu Hause machen kann, mit Dingen, die jeder hat:
 * Papier, Stift, Lineal, ein Maßband oder ein Schnürsenkel. Kein Gerät,
 * keine App, keine Genauigkeit in Millimetern — was der Laden dazu zusagt
 * (±0,5 cm genügen), steht im Abschnitt und nicht hier.
 *
 * ── Warum der Umriss und nicht die Wand ───────────────────────────────────
 *
 * Hier stand einmal „Ferse an die Wand, längste Zehe anzeichnen". Das geht
 * auch, ist aber der schlechtere Weg: Man steht schief, sieht an sich herab
 * und zeichnet dabei einen Strich neben den eigenen Fuß. Wer stattdessen
 * einmal ganz herumfährt, bekommt eine Linie, die er danach in Ruhe
 * betrachten kann — und die Marken setzt er nicht am Fuß, sondern am Papier.
 *
 * Das ist auch das Verfahren, das die Werkstatt selbst aufschreibt.
 *
 * ── Die drei Dinge, an denen es sonst scheitert ───────────────────────────
 *
 * Die Socken, mit denen der Schuh getragen wird (eine dicke Socke ist eine
 * halbe Größe). Der Stift senkrecht (schräg gehalten wird der Fuß größer,
 * als er ist). Und beide Füße, am Abend — sie sind selten gleich, und sie
 * sind abends größer. Jeder dieser drei Punkte steht deshalb in dem
 * Schritt, in dem er gebraucht wird, und nicht gesammelt am Ende, wo ihn
 * niemand mehr liest.
 *
 * `schritt` in components/FussMass.jsx sind die Nummern dieser Liste, von
 * eins an gezählt: 1 hebt die Länge hervor, 2 den Umfang, 3 beides.
 */
export const MASSNEHMEN = [
  {
    wann: 'Erstens',
    titel: 'Den Umriss zeichnen',
    text: 'Ein Blatt Papier auf den Boden, draufstellen, mit den Socken, die '
        + 'du auch im Schuh trägst. Einmal mit dem Stift ganz herumfahren, und '
        + 'dabei senkrecht halten: Schräg gehalten wird der Fuß größer, als er '
        + 'ist.',
  },
  {
    wann: 'Zweitens',
    titel: 'Die Länge messen',
    text: 'Zwei Striche quer über das Blatt: einer an der Ferse, einer an der '
        + 'längsten Zehe. Das ist nicht bei jedem die große. Der Abstand '
        + 'dazwischen ist die Fußlänge.',
  },
  {
    wann: 'Drittens',
    titel: 'Der Ballenumfang',
    text: 'Das Maßband einmal ganz um die breiteste Stelle, dort, wo der Fuß '
        + 'beim Gehen knickt. Anliegend, nicht stramm, und im Stehen: Unter dem '
        + 'Gewicht wird der Ballen breiter, und getragen wird der Schuh stehend.',
  },
]

/**
 * Der Satz, der unter der Folge steht — und der wichtigste von allen.
 *
 * Füße sind selten gleich groß, und abends sind sie größer als morgens. Wer
 * das nicht weiß, misst morgens den kleineren und bestellt ein Paar, das ab
 * drei Uhr nachmittags drückt. Es steht bewusst NICHT als vierter Schritt:
 * Es ist kein Handgriff, sondern eine Bedingung für alle drei.
 */
export const BEIDE_FUESSE =
  'Miss beide Füße, und miss am Abend. Sie sind selten gleich groß und '
  + 'abends größer als morgens. Gebaut wird nach dem größeren.' 
