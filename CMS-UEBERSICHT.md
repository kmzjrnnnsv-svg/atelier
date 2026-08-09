# Artisan Sole — Der Verwaltungsbereich (CMS)

Bestandsaufnahme zum **9. August 2026**, gelesen aus dem Quellcode.
Erreichbar unter `/cms`, im Seitentitel „Content Studio".

**Umfang:** 31 Bereiche in fünf Gruppen, dazu ein Einstiegsbildschirm.

---

## Wer darf was

Zwei Rollen haben Zugang, und sie sehen nicht dasselbe.

| Rolle | Zugang |
|---|---|
| **Kurator** | Produkte, Bestellungen, Inhalte, Kunden — 27 Bereiche |
| **Administrator** | zusätzlich die Gruppe *Administration* — Benutzer, Bankverbindung, SMTP, MFA |

Wichtig: Die Rollenprüfung findet **nicht nur im Browser** statt. Das Backend
verlangt sie bei jedem schreibenden Zugriff erneut (`requireRole`). Wer die
Navigationsleiste umgeht, kommt trotzdem nicht weiter — 15 Endpunkte sind für
Administrator und Kurator freigegeben, 7 ausschließlich für Administratoren.

---

## 1. Einstieg

**Dashboard** — Zählwerte für Schuhe, Curated Sections, Garderobe, Outfits,
Bestellungen und Artikel, dazu Schnellzugriffe („Schuh hinzufügen",
„Outfit erstellen", „Bestellungen", „Foot Scans").

Es sind reine Bestandszahlen, keine Auswertung: kein Umsatz, kein Zeitverlauf,
kein Vergleich zum Vormonat.

---

## 2. Produkte

### Schuhe
Der größte Editor im Projekt (1107 Zeilen) und das Herzstück des Bereichs.

- Name, Kategorie, Material, Beschreibung, Tagline, Badge
- **Preis, Promotion-Preis und Einkaufspreis** — letzterer nur intern
- **Standardbilder** als Strecke: Das erste Bild steht in der Übersicht, das
  zweite erscheint beim Überfahren, alle zusammen bilden die Slideshow auf der
  Produktseite. Reihenfolge per Pfeil änderbar.
- **Farben mit eigenen Bildern** — hat eine Farbvariante eigene Aufnahmen,
  gehen diese auf der Produktseite vor
- **3D-Modell** (.glb/.gltf, bis 40 MB). Nur wenn eines hinterlegt ist,
  erscheint auf der Produktseite überhaupt der Knopf für die 3D-Ansicht.
- Zubehör-Zuordnung je Modell
- Biometrische Passform-Kennwerte

### Produkt-Konfiguration
Materialien, Farben und Sohlen als Stammdaten — die Bausteine, aus denen der
Konfigurator schöpft.

### Konfigurator-Optionen
Optionsgruppen und ihre Einzeloptionen (Kappe, Verzierung, Absatz …).

### Modell-Matrix
Legt fest, welche Materialien und Optionen je Modell **zulässig** sind.
Verhindert Unsinn wie Patina auf einem Sneaker. Der stille Wächter des
Konfigurators.

### Leisten-Parameter
Die Größentabelle, aus der die Passgenauigkeit in Prozent berechnet wird.
Mit Rücksetzfunktion auf die Werkseinstellung.

### Zubehör
Fünf geführte Artikel. Je Artikel: Schlüssel, Name, mehrzeilige Beschreibung,
Preis, Einkaufspreis, Sortierung, Aktiv-Schalter, **Bilderstrecke** (gleiche
Regeln wie beim Schuh) und die Zuordnung, bei welchen Lederarten und Farben
das Zubehör im Konfigurator empfohlen wird.

---

## 3. Bestellungen

### Bestellungen
Alle Bestellungen mit Statuswechsel entlang der Kette:

> Zahlung offen → in Bearbeitung → **Qualitätsprüfung** → versendet → zugestellt

dazu „storniert".

> ⚠️ **Der Schritt „Qualitätsprüfung" lässt sich zurzeit nicht setzen.** Die
> Datenbank weist ihn ab — eine abgebrochene Migration hat ihn nie in die
> erlaubten Werte aufgenommen. Die Korrektur liegt bereit, ist aber noch nicht
> ausgerollt. Bis dahin führt der Weg von „in Bearbeitung" direkt zu
> „versendet".

### Versand
Versandarten und -kosten.

### Gutscheine
Vier Arten: Prozent-Rabatt, Festbetrag, Gratis Versand, Gratis Zubehör.
Dazu Mindestbestellwert, maximale Einlösungen, Einmal-Nutzung und Ablaufdatum.

---

## 4. Inhalte

Elf Bereiche, alle nach demselben Muster: bearbeiten, speichern, sofort live.

| Bereich | Was er steuert |
|---|---|
| **Homepage** | Aufbau und Texte der Startseite |
| **Empfehlungen** | welche Modelle hervorgehoben werden |
| **Curated Sections** | kuratierte Themenstrecken |
| **Garderobe** | Kleidungsstücke für die Outfit-Ansicht |
| **Outfits** | Zusammenstellungen aus Schuh und Garderobe |
| **Artikel** | Journal- und Magazinbeiträge |
| **CTA-Banner** | der Aufruf-Streifen quer über die Seiten |
| **Produktseite-Texte** | wiederkehrende Texte auf allen Produktseiten |
| **Footer & Service** | Fußzeile samt Verlinkung |
| **Website-Bilder** | die redaktionellen Flächen von Homepage, Explore, Footer und CTA |
| **Mediathek** | zentrale Bildablage |

---

## 5. Kunden

### Foot Scans
Mit 972 Zeilen der zweitgrößte Bereich, und fachlich der anspruchsvollste.

- Scan-Datenbank mit Maßen, Größe, Fotos und **STL-Dateien beider Füße**
- **Freigabe (`validated`)** — ein Administrator bestätigt die gemessenen
  Werte. Erst freigegebene Scans zählen für die Verbesserung der Messung.
- Trainingsdaten getrennt einsehbar
- **CSV-Export**
- Löschen einzelner Scans

### Firmenkonten
Firmenkunden, ihre Kampagnen und die eingehenden Einzelanfragen.

### Loyalty & Tiers
Stufen des Treueprogramms, dazu ein Werkzeug zum Verfallenlassen von Punkten.

### Feedback & Tickets
Rückmeldungen und Anfragen aus dem Hilfebereich.

---

## 6. Kommunikation

**E-Mail-Vorlagen** — Betreff, Einleitung und Textkörper je Vorlage
(Bestellbestätigung, Zahlungseingang, Statuswechsel). Mit Vorschau an echten
Bestelldaten.

**FAQ & Support** — Fragen und Antworten des Hilfebereichs.

**Rechtliches** — AGB, Datenschutzerklärung, Impressum.

> ⚠️ Die Entwürfe liegen im Verzeichnis `rechtstexte/`, sind hier aber **noch
> nicht eingepflegt**. Ein fehlendes Impressum ist der billigste Abmahngrund
> überhaupt.

---

## 7. Administration *(nur Administrator)*

**Benutzer** — Konten verwalten, Rollen vergeben (Kurator, Administrator),
Scans einem Konto zuweisen, Beförderungen nachvollziehen.

**Bankverbindung** — die Daten für die Vorkasse-Überweisung.

**E-Mail / SMTP** — Zugangsdaten des Versandservers. Zeigt beim Öffnen, ob
die Verbindung steht, und warnt, wenn die Adresse der Anwendung noch auf
localhost steht (dann führen Links in Mails beim Empfänger ins Leere).
Mit Testversand.

**MFA-Sicherheit** — **Passkeys** (Fingerabdruck, Gesicht, Geräte-PIN) für
Verwaltungszugänge, mit Geräteliste und Hinweis auf den zweiten Passkey.
Darunter der zweite Faktor per TOTP als Rückfallebene.

---

## 8. Was fehlt

**1. Ein Bereich für das Vermittlerprogramm.** Es gibt keinen. Die
Provisionslogik ist fertig und rechnet korrekt, die Endpunkte für Rangliste
und Auszahlung stehen — aber niemand kann sie bedienen. Du siehst weder, wer
am meisten vermittelt hat, noch wer auf Geld wartet.

**2. Auswertungen.** Das Dashboard zählt Datensätze. Es beantwortet nicht,
was ein Betreiber morgens wissen will: Was wurde diesen Monat verkauft?
Welches Modell läuft? Wie viel Umsatz steht offen?

**3. Bestandsführung.** Für Zubehör gibt es keine Stückzahlen. Der Laden
verkauft weiter, auch wenn die Schachtel leer ist.

**4. Rechnungen als PDF.** Nicht vorhanden.

**5. Ein Protokoll, wer was geändert hat.** Bei zwei Rollen und einem
Betreiber heute verschmerzbar — sobald ein zweiter Mensch mitarbeitet, nicht
mehr.

---

## 9. Einschätzung

**Was stark ist:** Die Tiefe bei Produkt und Passform. Modell-Matrix,
Leisten-Parameter und die Scan-Freigabe sind Werkzeuge, die man in einem
Standard-Shopsystem nicht bekommt — sie bilden ab, wie Maßschuhe tatsächlich
entstehen. Auch die Rollentrennung ist sauber: Sie wird serverseitig
durchgesetzt, nicht nur in der Navigationsleiste versteckt.

**Was schwach ist:** Das Verhältnis von Pflege zu Erkenntnis. 31 Bereiche zum
Eintragen, aber kaum einer zum Nachsehen. Ein Betreiber, der wissen will, wie
das Geschäft läuft, findet hier nur Zählwerte.

**Was ich zuerst bauen würde:**

1. Den Vermittler-Bereich — die Rechenarbeit ist getan, es fehlt die Oberfläche
2. Eine Umsatzansicht im Dashboard: Monat, Modell, offene Zahlungen
3. Die Rechtstexte einpflegen

Punkt 3 kostet eine halbe Stunde und beseitigt ein echtes Risiko.
