# Artisan Sole — Funktionsübersicht

Bestandsaufnahme zum **9. August 2026**, erstellt aus dem Quellcode, nicht
aus Planungsunterlagen. Zweck: einen Überblick geben, was tatsächlich da ist,
was halb fertig ist und was fehlt.

**Größenordnung:** 30 Backend-Routengruppen, 52 Datenbanktabellen, 32
CMS-Bereiche, rund 30 öffentliche Seiten. Das ist kein Schaufenster, sondern
ein Warenwirtschafts- und Fertigungssystem mit angeschlossenem Laden.

---

## 1. Für Kundinnen und Kunden

### Kaufen

| Bereich | Zustand | Anmerkung |
|---|---|---|
| Modellübersicht mit Anlass-Filtern | ✅ | Büro, Smart Casual, Freizeit, Abend, Outdoor |
| Produktseite mit sprechender Adresse | ✅ | `/schuhe/heritage-oxford` |
| Bilderstrecke mit Slideshow | ✅ | wechselt auf die Bilder der gewählten Farbe |
| Zweitansicht beim Überfahren | ✅ | in der Übersicht |
| 3D-Modell drehen | ✅ | erscheint nur, wenn eine Datei hinterlegt ist |
| Konfigurator | ✅ | Material, Farbe, Sohle, Absatz, Kappe, Verzierung |
| Zubehör dazubuchen | ✅ | Schuhspanner, Pflegeset u. a. |
| Warenkorb, Kasse, Bestellung | ✅ | inkl. Liefer- und Rechnungsanschrift |
| Gutscheincodes | ✅ | eigenes Gutscheinsystem im CMS |
| Bestellverfolgung | ✅ | Zahlung → Fertigung → Qualitätsprüfung → Versand |
| Merkliste | ✅ | |
| Suche | ✅ | |
| Bewertungen | ✅ | Sterne und Text je Modell |
| Individuelle Anfrage | ✅ | Formular und WhatsApp, landet im CMS |

### Passform — das Herzstück

| Bereich | Zustand | Anmerkung |
|---|---|---|
| Maße von Hand eingeben | ✅ | Länge und Ballenumfang, beide Füße |
| 3D-Fußscan | ✅ | LiDAR-gestützt, mit Punktwolke und Querschnitten |
| Leistenempfehlung | ✅ | aus Maßen wird Leisten und Weite bestimmt |
| Passgenauigkeit in Prozent | ✅ | je Modell, aus der Leisten-Tabelle |
| Unpassende Modelle kennzeichnen | ✅ | mit Warnhinweis statt Ausblenden |
| Fußtyp bestimmen | ✅ | ägyptisch, römisch, griechisch, germanisch, keltisch |
| Gewölbehöhe | ✅ | |
| Mittelung mehrerer Scans | ✅ | bayessche Zusammenführung |
| Rückmeldung zur Passform | ✅ | fließt in die Korrektur ein |
| Scan-Verlauf | ✅ | unter „Meine Scans" |

**Das ist der eigentliche Wert des Systems.** Ein Konfigurator mit Warenkorb
ist Standardware; die Verbindung aus Fußvermessung, Leistenzuordnung und
Fertigungsvorgabe ist es nicht.

### Konto

| Bereich | Zustand |
|---|---|
| Registrierung mit E-Mail-Bestätigung | ✅ |
| Profil mit Maßen, Notizen, Fußtyp | ✅ |
| Gespeicherte Konfigurationen | ✅ |
| Adressbuch und gespeicherter Warenkorb | ✅ |
| Treueprogramm mit Stufen | ✅ |
| Bestellübersicht | ✅ |
| Einstellungen | ✅ |

### Redaktionelles

| Bereich | Zustand | Anmerkung |
|---|---|---|
| Entdecken-Seite | ✅ | Themenkacheln, im CMS pflegbar |
| Artikel und Journal | ✅ | |
| Wissensbereich | ✅ | |
| Outfit-Visualisierung | ✅ | Garderobe und Kombinationen |
| Spiegel-Ansicht | ✅ | |
| FAQ und Hilfe | ✅ | |
| Rechtstexte | ⚠️ | Entwürfe liegen in `rechtstexte/`, noch nicht eingepflegt |

---

## 2. Für Firmenkunden

Eine eigene Domain (`business.artisansole.com`) mit eigenem Einstieg.

| Bereich | Zustand |
|---|---|
| Anfrageformular und WhatsApp-Weg | ✅ |
| Preis- und Prozessübersicht | ✅ |
| Firmenkonto mit Logo für die Sohle | ✅ |
| Kampagnen anlegen | ✅ |
| Beitritt per Link oder E-Mail-Domain | ✅ |
| Einmal-Codes ausgeben und einlösen | ✅ |
| Kostenübernahme durch die Firma oder Rabatt | ✅ |
| Auswahl auf bestimmte Modelle begrenzen | ✅ |
| Firmen-Dashboard | ✅ |

---

## 3. Vermittlerprogramm

Neu und **noch nicht vollständig**.

| Bereich | Zustand | Anmerkung |
|---|---|---|
| Provisionsberechnung | ✅ | Prozent oder Festbetrag, gedeckelt je Paar |
| Zugabe für den Käufer | ✅ | Einkaufspreis wird von der Provision einbehalten |
| Reifung der Provision | ✅ | zugestellt → Frist → auszahlbar |
| Rückgabe lässt Provision verfallen | ✅ | |
| Auszahlung in Fünferrunden | ✅ | |
| Eigenbestellung gesperrt | ✅ | |
| Vermittlerportal mit Fortschrittsanzeige | ✅ | „Noch ein Paar bis zur Auszahlung" |
| Werbelink mit QR-Code | ✅ | |
| Bewerbungs-Endpunkt | ✅ | Formular fehlt noch |
| **Code-Eingabe im Warenkorb** | ❌ | Endpunkt fertig, Eingabefeld fehlt |
| **`?ref=`-Link verarbeiten** | ❌ | Link wird erzeugt, aber nicht ausgewertet |
| **CMS-Ansicht mit Rangliste** | ❌ | Daten liegen bereit, Oberfläche fehlt |

**Ohne die drei fehlenden Teile entstehen keine Provisionen** — der Code
lässt sich nirgends eingeben.

---

## 4. Verwaltung (CMS)

32 Bereiche, gegliedert in fünf Gruppen.

**Produkte** — Schuhe, Produkt-Konfiguration, Konfigurator-Optionen,
Modell-Matrix, Leisten-Parameter, Zubehör

**Bestellungen** — Bestellungen, Versand, Gutscheine

**Inhalte** — Homepage, Empfehlungen, Curated Sections, Garderobe, Outfits,
Artikel, CTA-Banner, Produktseite-Texte, Footer, Website-Bilder, Mediathek

**Kunden** — Foot Scans, Firmenkonten, Treueprogramm, Feedback und Tickets

**Kommunikation und Administration** — E-Mail-Vorlagen, FAQ, Rechtliches,
Benutzer, Bankverbindung, SMTP, MFA

Besonders erwähnenswert:

- **Modell-Matrix** — legt fest, welche Materialien und Optionen je Modell
  zulässig sind. Verhindert unsinnige Kombinationen wie Patina auf einem
  Sneaker.
- **Leisten-Parameter** — die Größentabelle, aus der die Passgenauigkeit
  berechnet wird. 519 Zeilen.
- **Foot Scans** — Verwaltung der Kundenscans samt Freigabe für die
  Verbesserung der Messung.
- **MFA** — Zweifaktor für Administratoren, mit TOTP.

---

## 5. Technisches Fundament

| Bereich | Zustand | Anmerkung |
|---|---|---|
| Anmeldung mit Zugriffs- und Erneuerungstoken | ✅ | Token rotiert bei jeder Erneuerung |
| Rollen | ✅ | Kunde, Kurator, Administrator, Firma |
| Zweifaktor für Administratoren | ✅ | |
| Ratenbegrenzung | ✅ | |
| E-Mail-Versand über SMTP | ✅ | Bestellbestätigung, Zahlung, Status |
| iOS-App über Capacitor | ✅ | |
| Atomares Ausrollen | ✅ | baut daneben, schaltet erst danach um |
| **Datenbanksicherung** | ✅ | seit Kurzem, vor jedem Ausrollen |
| Fehlerbehandlung im Browser | ✅ | fängt Ladefehler ab und lädt neu |

---

## 6. Was fehlt oder schwach ist

Ehrliche Liste, nach Dringlichkeit.

### Dringend

**1. Zwölf Änderungen sind nicht ausgerollt.** Darunter der Fix, der das
Speichern im CMS repariert, und die Datenbanksicherung. Das ist der wichtigste
offene Punkt.

**2. Der Widerrufs-Hinweis fehlt im Bestellvorgang.** Der Ausschluss des
Widerrufsrechts ist eure stärkste rechtliche Absicherung, hält aber nur mit
deutlichem Hinweis vor dem Absenden der Bestellung.

**3. Rechtstexte sind nicht eingepflegt.** Entwürfe liegen bereit, aber
Impressum, AGB und Datenschutzerklärung sind auf der Seite noch nicht
vorhanden. Ein fehlendes Impressum ist der billigste Abmahngrund überhaupt.

**4. Keine Einwilligung für die Auswertung der Fußscans.** Die Datenbank
sieht die Verwendung zur Verbesserung der Messung vor; ohne Einwilligung im
Scanvorgang darf sie nicht stattfinden.

### Wichtig

**5. Zahlung läuft über Vorkasse.** Kein Zahlungsdienstleister angebunden.
Für den Anfang tragfähig, aber eine spürbare Hürde im Kaufabschluss.

**6. Produktbilder liegen als base64 in der Datenbank.** Sie blähen die
Antworten auf und lassen sich nicht zwischenspeichern. Bei wachsendem Katalog
wird das zum Engpass; Dateien unter `/uploads` wären der übliche Weg.

**7. Rückgaben sind nur rudimentär abgebildet.** Es gibt ein Datum und einen
Grund, aber keinen geführten Ablauf.

**8. Keine Testabdeckung.** Kein einziger automatischer Test im Projekt.
Bei 52 Tabellen und dieser Regeldichte ist jede Änderung ein Blindflug.

### Später

- Vermittlerprogramm fertigstellen (drei fehlende Teile, siehe oben)
- Mehrsprachigkeit
- Bestandsführung für Zubehör
- Rechnungserstellung als PDF
- Auswertungen für den Betreiber

---

## 7. Einschätzung

**Was ungewöhnlich gut ist:** Die Passform-Kette. Fußvermessung, Leisten,
Toleranzen, Rückmeldung — das ist durchdacht und der eigentliche Grund, warum
jemand hier statt anderswo kauft. Ebenso das Firmenkundengeschäft, das
vollständig da ist und einen zweiten Absatzweg öffnet.

**Was Sorge macht:** Das Missverhältnis zwischen Umfang und Absicherung. 52
Tabellen ohne einen einzigen Test, betrieben von einer Person. Jede der
Störungen der letzten Zeit — leeres CMS, nicht speicherbare Einstellungen,
Ladefehler — hätte ein Test gefunden, bevor sie beim Kunden ankam.

**Was ich zuerst täte, in dieser Reihenfolge:**

1. Die zwölf offenen Änderungen ausrollen
2. Rechtstexte einpflegen und den Widerrufs-Hinweis einbauen
3. Eine Handvoll Tests für die Kernwege: Bestellung, Passformberechnung,
   Provision
4. Einen Zahlungsdienstleister anbinden
5. Erst dann das Vermittlerprogramm zu Ende bauen

Punkt 3 ist der unbeliebteste und der mit dem größten Hebel. Zehn Tests für
die drei Kernwege kosten einen Tag und ersparen die Klasse von Fehlern, die
in dieser Sitzung mehrfach aufgetreten ist.
