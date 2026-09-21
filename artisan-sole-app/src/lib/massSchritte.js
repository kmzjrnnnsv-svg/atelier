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
 * Papier, Stift, Lineal, ein Schnürsenkel. Kein Gerät, keine App, keine
 * Genauigkeit in Millimetern — was der Laden dazu zusagt (±0,5 cm genügen),
 * steht im Abschnitt und nicht hier.
 *
 * Der dritte Schritt ist der, den keine Anleitung im Netz weglässt und den
 * trotzdem jeder überliest: Füße sind abends größer und selten gleich groß.
 * Wer morgens den kleineren misst, bestellt ein Paar, das ab drei Uhr
 * nachmittags drückt.
 *
 * `schritt` in components/FussMass.jsx sind die Nummern dieser Liste, von
 * eins an gezählt: 1 hebt die Länge hervor, 2 den Umfang, 3 beides.
 */
export const MASSNEHMEN = [
  {
    wann: 'Erstens',
    titel: 'Die Länge',
    text: 'Ein Blatt Papier an die Wand legen, mit der Ferse dagegenstellen, '
        + 'im Stehen. Wo die längste Zehe endet, einen Strich — das ist nicht '
        + 'bei jedem die große. Dann vom Blattrand bis zum Strich messen.',
  },
  {
    wann: 'Zweitens',
    titel: 'Der Ballenumfang',
    text: 'Das Maßband einmal um die breiteste Stelle, dort, wo der Fuß beim '
        + 'Gehen knickt. Anliegend, nicht stramm, und ebenfalls im Stehen: '
        + 'Unter dem Gewicht wird der Ballen breiter, und getragen wird der '
        + 'Schuh stehend.',
  },
  {
    wann: 'Und dann',
    titel: 'Beide Füße, am Abend',
    text: 'Füße sind selten gleich groß, und abends sind sie größer als '
        + 'morgens. Gemessen wird der größere, und zwar dann. Ein Schuh, der '
        + 'um neun passt, drückt sonst um sechs.',
  },
]
