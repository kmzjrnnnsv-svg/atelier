# Der Konfigurator auf dem Handy — Vorschläge

> Stand: 24. August 2026. Recherche und Entwurf, **noch nicht umgesetzt.**
> Die Punkte 1 bis 5 desselben Auftrags sind gebaut; dieser Punkt wartet auf
> eine Entscheidung.

## 1. Was gemessen wurde

Gemessen im echten Browser (Chromium, 390 × 844 px, das Format eines iPhone 14),
am Oxford, nach dem Umbau der Punkte 1 bis 5:

| | Wert |
|---|---|
| Fensterhöhe | 844 px |
| Höhe der Konfigurationsspalte | **4.268 px** |
| entspricht | **gut fünf Bildschirmen Bildlauf** |
| Aufnahme des Schuhs | 390 × 488 px, also **58 % des ersten Bildschirms** |
| Kacheln je Reihe | 3 (am Schreibtisch 6 bis 8) |
| Schritte insgesamt | Leder, Farbe, 5 Optionsgruppen, Gürtel, Passform, Zubehör |

Daraus folgen drei Beobachtungen, und alle drei sind dasselbe Problem aus
verschiedenen Richtungen:

**a) Der Schuh ist weg, sobald gewählt wird.** Die Aufnahme steht ganz oben und
scrollt beim ersten Wisch aus dem Bild. Von der zweiten Bildschirmhöhe an
konfiguriert der Kunde blind. Am Schreibtisch steht das Bild links fest
daneben — auf dem Handy gibt es diese zweite Spalte nicht.

**b) Fünf Bildschirme sind keine Übersicht.** Es gibt keinen Ort, an dem der
Kunde sieht, wie viele Schritte noch kommen oder wo er gerade ist. Ein
Fortschritt ohne Anzeige fühlt sich endlos an, und die Passform — der einzige
Schritt, ohne den nicht bestellt werden kann — liegt am weitesten unten.

**c) Die Kacheln sind zu klein für das, was sie zeigen sollen.** Bei drei
Kacheln je Reihe bleiben 88 px Breite. Genau das war der Grund für die neuen
Leder- und Farbbilder aus Punkt 5 — auf 88 px ist von einer Narbung nichts zu
erkennen. Die Bilder sind jetzt da; auf dem Handy kommen sie nicht zur Geltung.

## 2. Drei Wege, mit einer Empfehlung

### Weg A — Schritt für Schritt, ein Schritt je Bildschirm *(Empfehlung)*

Der Konfigurator wird auf dem Handy zu einer Abfolge: **oben der Schuh (fest,
etwa 40 % der Höhe), darunter genau ein Schritt, unten eine Leiste mit
„Zurück / Weiter" und dem laufenden Preis.** Gewischt wird waagerecht zwischen
den Schritten, nicht senkrecht durch alle.

- Der Schuh bleibt sichtbar, weil er nicht mitscrollt. Wer ein Leder antippt,
  sieht die Aufnahme oben wechseln — dieselbe Mechanik wie am Schreibtisch
  (`schrittBild`), nur dass sie hier durch das Antippen ausgelöst wird statt
  durch den Zeiger.
- Ein Schritt allein hat Platz: **zwei Kacheln je Reihe zu je ~170 px**, viermal
  die Fläche von heute. Die neuen Leder- und Farbbilder werden damit erst
  brauchbar.
- Über den Kacheln eine schmale Punktreihe (● ○ ○ ○ ○ ○ ○) — der Kunde weiß,
  wo er ist und was noch kommt.
- Antippen einer Kachel wählt **und** geht weiter. Ein Schritt, der nach der
  Wahl von selbst umblättert, spart je Schritt einen Griff; wer vergleichen
  will, wischt zurück.

*Dafür:* Löst alle drei Beobachtungen auf einmal. Ist auf dem Handy die
gewohnte Form (jeder Bestellvorgang, jede Kasse arbeitet so).
*Dagegen:* Der größte Eingriff. Die Reihenfolge der Schritte wird verbindlich,
was heute nur eine Empfehlung ist (`configStep`, die Abblendung).
*Aufwand:* mittel bis groß — eine eigene Hülle um die bestehenden Blöcke, die
Blöcke selbst bleiben, wie sie sind.

### Weg B — Der Schuh bleibt oben kleben, der Rest scrollt weiter

Nur die Aufnahme wird auf dem Handy `sticky` und schrumpft beim Scrollen auf
etwa 30 % der Höhe zusammen. Alles andere bleibt, wie es ist.

*Dafür:* Kleiner Eingriff, ein paar Zeilen CSS und ein Beobachter für die
Schrumpfung. Löst Beobachtung (a) vollständig.
*Dagegen:* Die fünf Bildschirme bleiben fünf Bildschirme, und der Platz für die
Kacheln wird sogar kleiner, weil der Schuh oben Höhe wegnimmt. (b) und (c)
bleiben ungelöst.
*Aufwand:* klein.

### Weg C — Zusammengeklappte Schritte (Akkordeon)

Jeder Schritt ist auf dem Handy eine Zeile: Name links, Gewähltes rechts. Nur
der offene Schritt zeigt seine Kacheln; wer wählt, schließt ihn und öffnet den
nächsten.

*Dafür:* Die ganze Konfiguration passt auf einen Bildschirm, sobald alles
gewählt ist — eine echte Zusammenfassung. Zum Ändern tippt man die Zeile an.
*Dagegen:* Der Schuh scrollt weiter weg, sobald ein Schritt offen ist. Und ein
Akkordeon versteckt: Wer nicht weiß, was in einem Schritt steckt, tippt ihn
nicht an. Beim ersten Durchgang ist das der falsche Ton für ein Paar zu 1.450 €.
*Aufwand:* mittel.

**Empfehlung: Weg A**, mit einem Zusatz aus Weg C — auf dem **letzten** Schritt
steht die Zusammenfassung als Liste „Leder · Farbe · Sohle · …", jede Zeile
antippbar, die zum jeweiligen Schritt zurückführt. Damit hat der Kunde beides:
geführt beim ersten Mal, überblickbar am Ende.

## 3. Was Weg A im Einzelnen bedeutet

**Nur auf dem Handy.** Ab `lg` bleibt der Konfigurator, wie er ist — dort
funktioniert er. Es entsteht kein zweiter Konfigurator, sondern eine zweite
Hülle um dieselben Blöcke.

**Die Schritte** (in dieser Reihenfolge, wie heute):

| # | Schritt | Bemerkung |
|---|---|---|
| 1 | Leder | Bild groß, zwei je Reihe |
| 2 | Farbe | dito |
| 3–7 | Absatz, Sohlen-Art, Sohlenrand, Innenfarbe, Laufsohle | aus `sichtbareGruppen`, also weiterhin datengetrieben |
| 8 | Gürtel | nur wenn Leder und Farbe stehen |
| 9 | Passform | der Schritt, ohne den nicht bestellt werden kann |
| 10 | Übersicht | Zusammenfassung, Zubehör, Kaufen |

Die Zahl der Schritte ist nicht fest: Sie ergibt sich aus `sichtbareGruppen`,
und die richtet sich nach Modell, Sohle und Express-Freigabe. An einer
Gummisohle fallen Sohlenrand und Laufsohle weg — die Punktreihe wird dann
kürzer, nicht grau.

**Was aus dem Bestehenden übernommen wird:**

- `schrittBild` entscheidet weiter, was oben steht. Auf dem Handy tritt an die
  Stelle von „Zeiger über der Kachel" das „Kachel angetippt".
- `configStep`, `fitReady`, `guertelUnfertig` bleiben die Bedingungen dafür,
  ob „Weiter" führt oder erst noch etwas fehlt.
- Der Entwurf (`saveDraft`) speichert wie bisher nach jeder Wahl. Wer den
  Vorgang unterbricht, kommt an derselben Stelle zurück.

**Was neu entschieden werden muss:**

1. **Darf man Schritte überspringen?** Vorschlag: ja, über die Punktreihe.
   Nur die Passform ist Pflicht, und das sagt die Kaufen-Leiste ohnehin.
2. **Was steht in der unteren Leiste?** Vorschlag: links der Preis samt
   Aufschlägen (die Zeile aus Punkt 3 dieses Auftrags), rechts „Weiter"; auf
   dem letzten Schritt „Warenkorb" und „Jetzt kaufen".
3. **Bleibt der senkrechte Bildlauf als Rückfall?** Vorschlag: nein. Zwei
   Bedienweisen nebeneinander sind schwerer zu erklären als eine.

## 4. Was zuerst geprüft werden sollte

- **Die Bilder fehlen noch.** Punkt 5 hat die Felder geschaffen, nicht die
  Aufnahmen. Weg A lebt davon, dass zu jedem Leder und jeder Farbe ein Bild
  hinterlegt ist — ohne sie zeigt ein Schritt je Bildschirm ein großes
  Farbquadrat, und das ist schlechter als heute. **Die Aufnahmen gehören vor
  den Umbau**, nicht danach.
- **Ein Blick auf die Zahlen.** Wie viele Bestellungen kommen heute vom Handy,
  und wie viele Konfigurationen brechen dort ab? Die Antwort steht in
  `shoe_configs` (angefangene Entwürfe) gegen `orders`. Sie ändert nichts an
  der Richtung, aber sie sagt, wie dringend es ist.
- **Die Reihenfolge.** Gehört die Passform wirklich an den Schluss? Sie ist der
  einzige Pflichtschritt; sie an den Anfang zu stellen hieße, den Kunden zuerst
  nach Maßen zu fragen und erst dann etwas zeigen zu dürfen. Vermutlich richtig
  so, aber es ist eine Entscheidung und keine Selbstverständlichkeit.
