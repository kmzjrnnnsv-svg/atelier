# Plan: Schuhe im Laden, QR-Code, geführter Einstieg

Ein Aufsteller mit echten Schuhen steht in einem fremden Laden. Daneben ein
QR-Code. Wer ihn scannt, soll in zwei Minuten verstanden haben, warum dieses
Paar anders ist — und mit einem Vorteil im Konfigurator landen, der dem Laden
zugerechnet wird.

---

## Was dafür schon existiert

Der größere Teil ist gebaut. Das ist wichtig für die Reihenfolge unten: Wir
bauen keinen zweiten Weg, sondern hängen uns in den vorhandenen ein.

| Baustein | Zustand | Wo |
|---|---|---|
| Werbecode je Partner | fertig | `affiliates.code` |
| QR-Code je Partner | fertig, wird im Partner-Bereich erzeugt | `routes/affiliates.js` → `/me` |
| `?ref=CODE` aus der Adresse lesen und 30 Tage merken | fertig | `lib/affiliateCode.js` |
| **Nachlass für den Geworbenen** (Prozent) | fertig, je Partner einstellbar | `affiliates.customer_discount_pct` |
| **Zedernholz-Schuhspanner als Zugabe** | fertig, je Partner einstellbar | `affiliates.gift_shoetree` |
| Öffentliche Code-Prüfung (gibt Nachlass + Zugabe zurück) | fertig | `GET /api/affiliates/validate/:code` |
| Provision, Deckel, Auszahlung in Fünferrunden | fertig | `utils/affiliate.js` |

**Folge:** „10 % Rabatt **oder** Pflegeset" muss nicht gebaut werden. Es ist
bereits eine Einstellung je Partner. Ein Laden in München bekommt 10 %, einer in
Hamburg die Zugabe — ohne eine Zeile Code.

Was fehlt, ist ausschließlich der **Einstieg**: die Folien, die Begrüßung mit
Namen und die Übergabe in den Shop.

---

## 1. Der Weg vom Aufsteller in den Shop

```
QR-Code auf dem Aufsteller
   │   https://artisansole.com/entdecken?ref=schuhhaus-mueller
   ▼
Folie 0   Name eingeben  →  „Schön, dass Sie da sind, Herr Müller."
   ▼      (überspringbar — niemand wird zum Tippen gezwungen)
Folie 1–5 Die Geschichte
   ▼
Abschluss „Ihr Vorteil bei Schuhhaus Müller: 10 % auf Ihr erstes Paar"
   ▼
Kollektion — Code liegt im Warenkorb, Nachlass greift im Konfigurator
```

**Warum eine eigene Adresse (`/entdecken`) und nicht die Startseite:** Die
Startseite führt heute direkt in die Kollektion. Wer aus einem Laden kommt, hat
den Schuh gerade in der Hand und braucht keine Kachelübersicht, sondern eine
Erklärung. Der bestehende Weg über `/?ref=` bleibt unangetastet — er gilt weiter
für Links, die ein Partner selbst verschickt.

**Der Code überlebt den Weg:** `refMerken()` legt ihn für 30 Tage ab, bevor die
erste Folie erscheint. Bricht jemand ab und kommt abends wieder, zählt der Laden
trotzdem.

---

## 2. Die Folien

Knapp halten. Eine Aussage je Folie, ein Bild, ein Satz, ein Knopf. Auf dem
Telefon vollflächig, Wischen und „Weiter" gleichwertig, Fortschritt als Punkte.
Zielzeit für den ganzen Durchlauf: **unter 90 Sekunden.**

### Folie 0 — Name
> **Wie dürfen wir Sie nennen?**
> [ Vorname ]  → *Weiter*  ·  *Ohne Namen fortfahren*

Der Name wird **nur im Browser gehalten** (siehe Abschnitt 4).

### Folie 1 — Was Sie hier vor sich haben
> **Kein Schuh von der Stange.**
> Jedes Paar entsteht nach Ihren Maßen in einer Manufaktur in Spanien.
> Es gibt kein Lager, aus dem wir greifen — Ihr Paar beginnt erst, wenn Sie es
> bestellen. *(4 bis 6 Wochen)*

### Folie 2 — Warum es darauf ankommt
> **Ihr Fuß trägt Sie 100.000 Kilometer.**
> Zu enge Schuhe drücken Zehen dauerhaft in eine Fehlstellung; zu weite lassen
> den Fuß arbeiten und führen zu Druckstellen. Beides merkt man erst nach
> Jahren — und dann bleibt es.

*Ton: erklärend, nicht drohend. Keine Krankheitsbilder aufzählen, kein
Arztspiel. Ein Satz, der aufhorchen lässt, dann weiter.*

### Folie 3 — Goodyear-Rahmen
> **Ein Schuh, der zwanzig Jahre hält.**
> Rahmengenäht statt geklebt: Sohle und Schaft sind über einen Lederstreifen
> vernäht. Ist die Sohle in zehn Jahren durch, wird sie erneuert — der Schuh
> bleibt. Geklebte Schuhe kann man an dieser Stelle nur wegwerfen.

### Folie 4 — Die Passform
> **Ein Bett für den Fuß.**
> Wir arbeiten auf einem Leisten, der zu Ihrer Fußform passt — Länge, Ballenweite
> und Rist getrennt. Deshalb fragen wir Maße ab, nicht nur eine Größe.

### Folie 5 — Ihr Vorteil
> **Herr Müller, Ihr Vorteil bei Schuhhaus Müller**
> 10 % auf Ihr erstes Paar. *(oder: Ein Zedernholz-Spanner liegt Ihrem ersten
> Paar bei.)*
> → **Kollektion ansehen**

Text und Zahl kommen aus `validate/:code`. Steht dort weder Nachlass noch
Zugabe, verschwindet die Folie — dann endet Folie 4 direkt mit dem Knopf.

**Alle Folientexte gehören ins CMS** (wie „Produktseite-Texte"), damit du sie
ohne Deployment ändern kannst. Das ist die einzige Stelle, an der ich
zusätzlichen Aufwand empfehle, den man auch weglassen könnte — aber
Verkaufstexte will man am zweiten Tag umschreiben.

---

## 3. Die Firmen-Fassung

Gleiche Mechanik, **anderer Text**. Wer für dreißig Mitarbeiter einkauft, hat
andere Fragen als jemand, der ein Paar für sich sucht. Wortgleich wäre es
außerdem sofort erkennbar als Schablone.

| | Kunde | Firma |
|---|---|---|
| Einstieg | „Kein Schuh von der Stange." | „Dreißig Paar, dreißig Fußformen." |
| Nutzen | Haltbarkeit, Passform | Auftritt der Belegschaft, Wertigkeit als Geschenk |
| Schmerzpunkt | eigene Füße | Mitarbeiter, die ihre Schuhe nicht tragen |
| Besonderes | — | Logo auf der Sohle, Sammelbestellung, Mengenrabatt ab zehn Paar |
| Abschluss | Kollektion mit Nachlass | Kampagne anlegen / Anfrage stellen |

Läuft auf `business.artisansole.com` und **zusätzlich bei der Registrierung
eines Firmenkontos** — dort gekürzt auf drei Folien, weil die Entscheidung
schon gefallen ist.

---

## 4. Der Name — und was der Datenschutz dazu sagt

Dein Wunsch: Name nur temporär, gelöscht, und im Datenschutz niedergeschrieben.

**Umsetzung:**

- Ablage in `sessionStorage`, nicht `localStorage`. Der Unterschied ist der
  entscheidende: `sessionStorage` verschwindet, wenn der Tab geschlossen wird —
  ohne dass wir etwas löschen müssen. Was gar nicht erst dauerhaft abgelegt wird,
  kann auch nicht vergessen werden.
- **Nie an den Server.** Der Name wird ausschließlich im Browser angezeigt. Ohne
  Übertragung gibt es keine Verarbeitung durch uns — datenschutzrechtlich der
  sauberste Fall, den es gibt.
- Sichtbarer Hinweis unter dem Feld: *„Bleibt auf Ihrem Gerät, bis Sie den Tab
  schließen."*
- Bei Registrierung: Das Namensfeld ist vorausgefüllt. **Erst mit dem Absenden**
  wird daraus ein gespeicherter Name — mit derselben Einwilligung wie jede
  Registrierung.

**Ergänzung in der Datenschutzerklärung** (eigener kurzer Abschnitt):

> **Ihr Name beim geführten Einstieg.** Geben Sie zu Beginn Ihren Namen an,
> verwenden wir ihn ausschließlich, um Sie auf den folgenden Seiten anzusprechen.
> Er wird **nicht an unsere Server übertragen** und ausschließlich im
> Zwischenspeicher Ihres Browsers gehalten (`sessionStorage`). Sobald Sie den
> Tab schließen, ist er gelöscht. Erst wenn Sie sich registrieren, wird der Name
> Teil Ihres Kontos — dann auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO
> (Vertragserfüllung).

Das ist ehrlich formuliert und in dieser Form auch haltbar, weil es technisch
genau so ist.

---

## 5. Was gebaut werden muss

Sortiert nach Nutzen je Aufwand.

### Stufe 1 — der Kern (ohne den geht es nicht)

1. **Route `/entdecken`** mit `?ref=`; Code sofort merken, dann Folien.
2. **Folien-Komponente**, mobil zuerst: Wischen, Weiter, Punkte, Überspringen.
   Wiederverwendbar für beide Fassungen — die Folien sind Daten, nicht Code.
3. **Namensfeld** mit `sessionStorage` und dem Hinweis darunter.
4. **Abschlussfolie** aus `validate/:code`, mit Rückfall ohne Vorteil.
5. **Datenschutz-Abschnitt** wie oben.

### Stufe 2 — damit es sich lohnt

6. **Folientexte ins CMS**, Kunden- und Firmenfassung getrennt.
7. **Firmen-Fassung** auf der Firmen-Subdomain und in der Registrierung.
8. **Name in die Registrierung übernehmen.**

### Stufe 3 — damit du weißt, ob es wirkt

9. **QR-Aufsteller je Partner** im Partner-Bereich als Druckvorlage (PDF/A5):
   QR, Ladenname, ein Satz. Der QR-Code existiert bereits — es fehlt nur das
   Blatt drumherum.
10. **Abbruchzählung je Folie.** Ohne sie rätst du, welche Folie langweilt.
    Serverseitig zählen, ohne Personenbezug: nur „Folie 3 gesehen".

---

## 6. Wo ich widerspreche

Zwei Punkte aus deiner Beschreibung würde ich anders machen — beide betreffen
den Verkauf, nicht die Technik.

**„So attraktiv und knapp wie möglich" schlägt „möglichst viel erklären".**
Sechs Folien sind bereits an der Obergrenze. Wer im Laden steht, hat die Hände
voll und wenig Geduld. Ich würde mit **vier** Folien starten (Was · Warum ·
Haltbarkeit · Vorteil) und die Passform-Folie nur dann ergänzen, wenn die
Zahlen zeigen, dass die Leute bis zum Ende gehen.

**Der Schmerzpunkt darf nicht zu laut werden.** „Wie schlimm zu enges Schuhwerk
ist" trägt eine Folie, keine drei. Wer im Laden ein schönes Paar in der Hand
hält, ist in Kauflaune — eine Angstkette holt ihn da heraus statt hinein. Ein
sachlicher Satz wirkt stärker als eine Aufzählung von Folgeschäden.

---

## 7. Offene Entscheidungen

Vor dem Bauen zu klären:

1. **Vier oder sechs Folien** zum Start?
2. **Vorname oder ganzer Name** bei der Begrüßung? (Vorname wirkt wärmer und
   ist datensparsamer.)
3. **Ein Aufsteller je Laden oder je Modell?** Je Modell könnte der QR direkt
   auf den konfigurierten Schuh führen statt in die Kollektion — deutlich
   stärker, aber mehr Pflege.
4. **Vorteil einheitlich oder je Laden verhandelt?** Technisch ist beides schon
   möglich; es ist eine Frage deiner Marge.
