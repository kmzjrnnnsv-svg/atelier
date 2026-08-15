# Ablauf-Prüfungen

Neun Skripte, die die Anwendung durchspielen — dieselben Routen wie
im Betrieb, nichts nachgebaut.

    tests/ablaeufe.mjs   95 Prüfungen: Registrierung, Katalog, Fußmaße,
                         Entwurf, Bestellung, Rücksendung, Verwaltung,
                         Anfragen, Affiliate, Firmenkonto, Kollektionen, Zahlung je
                         Warenkorb, Rechtstexte
    tests/chat.mjs       18 Prüfungen: Nachrichtenverlauf zwischen Kunde und
                         Verwaltung, Kategorien, Ungelesen-Zähler, Zugriffsschutz
    tests/preise.mjs     38 Prüfungen: Kampagnenrabatt, Affiliate-Nachlass,
                         Provision samt Deckel, alle drei Kundenvorteile
                         (nichts/Nachlass/Zugabe), Preis-Untergrenze
    tests/affiliate-anlegen.mjs
                         18 Prüfungen: Anlegen mit nur einer E-Mail-Adresse,
                         Einladung, Selbsteintrag der Stammdaten, unveränderbare
                         Konditionen, eigener Code beim eigenen Einkauf
    tests/mailwege.mjs   40 Prüfungen: der Versand über HTTPS — Form der Anfrage
                         je Dienst, Deutung abschlägiger Antworten, Prüfung ohne
                         Versand. Braucht KEINEN Server und keine Zugangsdaten:
                         Das Skript legt ein eigenes `fetch` unter und hält die
                         Anfrage fest, statt sie hinauszugeben.
    tests/sohlenregel.mjs
                         34 Prüfungen: welche Auswahlgruppen ein Kunde
                         angeboten bekommt — Express-Freigabe und die Regel,
                         dass an einer Gummisohle keine Randfarbe zur Wahl
                         steht. Ebenfalls ohne Server: eine reine Funktion,
                         die sich nicht durch einen Konfigurator mit einem
                         Dutzend Schritten prüfen lassen sollte.
    tests/nachdemkauf.mjs
                         131 Prüfungen: alles, was nach dem Bestellen kommt —
                         Verlauf mit Datum je Stufe, Zahlungseingang über den
                         Verwendungszweck buchen, Rechnung als PDF samt
                         fortlaufender Nummer, Stornostaffel nach AGB 7.2 auf
                         jeder Stufe, Sendungsnummer, Express-Bestand,
                         Auswertung, Protokoll, Klickzählung und Gutschrift
                         für Vermittler, Rechnungsangaben samt § 19 UStG,
                         Anzeigename des Vermittlers, Passwort zurücksetzen.
                         Braucht DB_PATH — für den Zweitfaktor des Admins und
                         die Prüfsumme des Zurücksetzen-Tokens gibt es keine
                         Route, und geraten wird hier nichts.
    tests/bestaetigung.mjs
                         16 Prüfungen: was in der Bestellbestätigung stehen
                         MUSS — Belehrung über das nicht bestehende
                         Widerrufsrecht und die AGB im Volltext, weil beides
                         dem Kunden auf einem dauerhaften Datenträger zugehen
                         muss. Braucht DB_PATH; fängt die Nachricht ab, statt
                         sie zu verschicken.
    tests/mokassin.mjs   36 Prüfungen: der Driver — drei eigene Leder mit
                         genau 17, 13 und 7 Farben (die Zahlen aus dem
                         Konfigurator der Manufaktur), die sechs Schritte,
                         der Drivers-Leisten, und in beide Richtungen die
                         Abgrenzung zur Dress-Linie: kein Lux Calf am
                         Mokassin, kein Nappa am Oxford.

## Aufrufen

Sie brauchen einen laufenden Server auf Port 3099 mit **eigener** Datenbank.
Niemals gegen die Produktivdatenbank laufen lassen — die Skripte legen Konten,
Bestellungen und Kampagnen an.

    # Terminal 1 — Server auf einer Wegwerf-Datenbank
    cd artisan-sole-backend
    rm -f /tmp/pruef.db*
    DB_PATH=/tmp/pruef.db PORT=3099 NODE_ENV=development \
      JWT_ACCESS_SECRET=$(openssl rand -hex 32) \
      JWT_REFRESH_SECRET=$(openssl rand -hex 32) \
      node src/index.js

    # Terminal 2 — Prüfungen
    node tests/ablaeufe.mjs
    node tests/mokassin.mjs
    DB_PATH=/tmp/pruef.db node tests/preise.mjs
    DB_PATH=/tmp/pruef.db node tests/nachdemkauf.mjs

Einmal sollte der Durchgang auf einer **wirklich frischen** Datei laufen (die
Datei vorher löschen, nicht nur den Server neu starten) und einmal auf einer,
die schon einen Start hinter sich hat. Beide Wege gehen durch verschiedenen
Code: Auf der frischen Datei überschreibt `katalogAnwenden` die Vorlage, auf
der bestehenden nicht. Zwei Fehler hingen genau daran und waren auf jeweils
nur einem der beiden Wege zu sehen.

Wichtig: Server und Prüfskript müssen **dieselbe Datei** sehen. Läuft der
Server in einer Sandbox oder einem Container mit eigenem `/tmp`, legen Sie die
Wegwerf-Datenbank stattdessen neben das Projekt (`DB_PATH=./pruef.db`) —
`*.db` steht in der `.gitignore`. Andernfalls schreibt das Prüfskript in eine
Datei, die der Server nie zu sehen bekommt, und die Fehlermeldungen führen in
die Irre.

`preise.mjs` braucht den DB-Pfad, weil es den E-Mail-Bestätigungstoken direkt
ausliest — im Betrieb kommt der per Mail, und ohne bestätigte Adresse gibt es
keinen Domain-Beitritt zu prüfen.

Beide enden mit `exit 1`, wenn etwas fehlschlägt. Damit taugen sie für einen
Haken vor dem Ausrollen.

## Was sie schon gefunden haben

Der erste Lauf war kein Selbstzweck. Gefunden wurden:

* `delivered_at` wurde nie geschrieben — die Rücksendefrist begann nie, und
  die Schutzfrist der Provision rechnete ab einem beliebigen Änderungsdatum.
* `/api/accessories/by-shoe` war vom allgemeinen `/:id` verschluckt und
  antwortete mit 404 — die Zuordnung Zubehör↔Modell blieb im Laden wirkungslos.
* Der Server nahm jeden Preis an, den der Browser schickte. Eine Bestellung
  über 1 € ging durch.
* Ohne `JWT_ACCESS_SECRET` startete der Server anstandslos und scheiterte erst
  beim ersten Anmeldeversuch mit einem 500er.

Für die Oberfläche liegen daneben zwei Playwright-Skripte. Beide brauchen
einen laufenden Entwicklungsserver und den Chromium-Pfad des Systems; siehe
Kopf der jeweiligen Datei.

    artisan-sole-app/tests-browser.mjs
                         23 Prüfungen: die Wege, die ein Kunde geht.
    artisan-sole-app/tests-kontrast.mjs
                         9 Prüfungen: ob die Leiste der Verwaltung lesbar ist.
                         Gemessen wird, was gezeichnet wurde, nicht was im
                         Quelltext steht — `text-white/25` sagt nichts darüber,
                         was am Ende gegen welchen Grund steht. Maßstab ist
                         WCAG 2.1: 4,5:1 für Text, 3:1 für Marken ohne Schrift.
    artisan-sole-app/tests-vermittler.mjs
                         18 Prüfungen: was ein Besucher sieht, der über eine
                         Empfehlung kommt — der Streifen über der Navigation,
                         durchgestrichene Preise auf Kachel und Modellseite,
                         und dass sich beides wieder loswerden lässt. Braucht
                         einen aktiven Code; das Skript nennt ihn über CODE=.
    artisan-sole-app/tests-neue-seiten.mjs
                         32 Prüfungen: dass die Seiten nach dem Kauf und die
                         neuen Verwaltungsansichten überhaupt aufgehen. Ein
                         erfolgreicher Build sagt nur, dass sich die Dateien
                         übersetzen lassen — ob eine Seite beim Öffnen
                         abstürzt, sagt er nicht, und genau dort sitzen die
                         Fehler, die im Betrieb ein weißes Fenster ergeben.

Der Entwicklungsserver spricht standardmäßig mit Port 3001. Für einen Lauf
gegen die Wegwerf-Datenbank auf 3099: `API_PORT=3099 npx vite`.
