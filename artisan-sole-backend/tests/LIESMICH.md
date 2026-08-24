# Ablauf-Prüfungen

Vierzehn Skripte, die die Anwendung durchspielen — dieselben Routen wie
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
                         52 Prüfungen: welche Auswahlgruppen ein Kunde
                         angeboten bekommt — Express-Freigabe und die Regel,
                         dass an einer Gummisohle keine Randfarbe zur Wahl
                         steht —, dass der Metallton nur erscheint, wo
                         auch Metall sitzt, und dass der festgelegte Rahmen
                         (Welt: City) zwar kein Schritt mehr ist, aber in der
                         Bestellung steht. Ebenfalls ohne Server: eine reine
                         Funktion, die sich nicht durch einen Konfigurator mit
                         einem Dutzend Schritten prüfen lassen sollte.
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
    tests/mokassin.mjs   78 Prüfungen: die drei Mokassins — der Driver — drei eigene Leder mit
                         genau 17, 13 und 7 Farben (die Zahlen aus dem
                         Konfigurator der Manufaktur), die sechs Schritte,
                         der Drivers-Leisten, und in beide Richtungen die
                         Abgrenzung zur Dress-Linie: kein Lux Calf am
                         Mokassin, kein Nappa am Oxford. Dazu der Moc Flex
                         Sport: ein Leder, neun Farben, vier Aufsätze, und
                         dass der alte Name „Mov" nicht zurückkommt. Und der
                         Boot dazu — Fersenriemen, sechzehn Nahtfarben, und
                         die Probe, dass sein Leder das Dress-Velours nicht
                         mit umfärbt.
    tests/guertel.mjs    44 Prüfungen: der konfigurierte Gürtel — Preis und
                         Beschreibungssatz entstehen am Server (ein Gürtel für
                         1 € wird abgewiesen), unvollständige Angaben ebenso,
                         die Farbe muss es am gewählten Leder geben, allein
                         reisen darf nur, wer `ships_alone` trägt (ein Gürtel
                         ja, ein Pflegeset nicht), Vorlagen aus eigenen
                         Bestellungen sind nicht fremd einsehbar, und der
                         Gürtel steht nicht unter dem Zurückgebbaren.
    tests/ownerlink.mjs  21 Prüfungen: der Bestelllink des Inhabers. Dass er
                         von allein bereitliegt, dass nur der Inhaber ihn
                         sieht, dass ein leeres Preisfeld „Katalogpreis"
                         heißt und nicht „kostenlos", und die drei Dinge, an
                         denen alles hängt: Der Link ist nach EINEM Verkauf
                         tot, der Nachfolger entsteht von allein, und ohne
                         Link gilt weiter der Katalogpreis. Braucht keinen
                         DB-Zugriff.
    tests/saison.mjs     36 Prüfungen: die drei Rubriken des Ladens — Sommer,
                         Winter, Ganzjährig. Dass die Regel trifft, was der
                         Betreiber vorgegeben hat (Stiefel in den Winter,
                         Mokassins und Walks in den Sommer), dass KEIN Modell
                         ohne Rubrik dasteht — ein solches wäre im Laden nicht
                         zu finden, ohne dass irgendwo ein Fehler erscheint —
                         und dass eine im CMS gesetzte Saison weder vom
                         nächsten Start noch von einem Speichern ohne das Feld
                         überschrieben wird.
    tests/eindeutig.mjs  29 Prüfungen: ein Modellname gehört genau einem
                         Modell. Der eindeutige Index in der Datenbank (er
                         ist das Eigentliche — er gilt auch für ein INSERT von
                         Hand), die Abweisung durch die Schreibroute samt
                         lesbarem Satz, und dass „derselbe Name" auch dann
                         gilt, wenn er groß geschrieben ist oder ein
                         Leerzeichen zu viel trägt. Dazu der Weg über eine
                         Datenbank, die schon Doppelte enthält: Sie werden
                         beim Start unterscheidbar benannt, aber NICHT
                         gelöscht — was der Betreiber angelegt hat, räumt er
                         selbst weg. Braucht DB_PATH.
    tests/wortlaut.mjs   11 Prüfungen: der Laden sagt „Custom Made", nicht
                         „maßgefertigt". Im Quelltext, in dem, was der Server
                         ausliefert, und über alle Textspalten der Datenbank
                         hinweg. Dazu die Umstellung eines Bestands, der den
                         alten Wortlaut noch trägt: Die einfache Beugung fällt
                         weg, der Genitiv Plural wird zu „von … Schuhen" —
                         dort steckt der Fall AM ADJEKTIV, und ohne Ersatz
                         stünde da ein Satz ohne Fall. Ein zweiter Durchgang
                         darf nichts mehr ändern. Braucht DB_PATH.

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
    node tests/guertel.mjs
    node tests/saison.mjs
    DB_PATH=/tmp/pruef.db node tests/eindeutig.mjs
    DB_PATH=/tmp/pruef.db node tests/wortlaut.mjs
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
    artisan-sole-app/tests-striche.mjs
                         10 Prüfungen: auf keiner Seite steht mehr ein
                         Gedankenstrich. Gemessen wird der gezeichnete Text,
                         nicht der Quelltext: In den Kommentaren dieses
                         Projekts steht der Strich hundertfach, und die
                         stehen nicht auf der Seite. Geprüft werden Kollektion,
                         Startseite, Hilfe, die drei Rechtstexte, An- und
                         Abmeldung sowie eine Modellseite mit ihrer
                         Beschreibung, denn die liegt in der Datenbank und
                         trug dort die meisten.
    artisan-sole-app/tests-kollektion.mjs
                         62 Prüfungen: die Kollektionsseite. Die Reihenfolge
                         der Rubriken über zwölf Monate hinweg (erst die
                         ganzjährigen, dann die laufende Jahreszeit), die
                         Suche samt Saison-Treffern, die Zeit bis zur ersten
                         Kachel — und was an ihrer Stelle steht, solange sie
                         unterwegs ist. Der Katalog wird dafür künstlich
                         aufgehalten: „Diese Rubrik wird gerade kuratiert"
                         darf in diesem Moment NICHT dastehen, denn er stimmt
                         nicht, und wer ihn liest, geht wieder.
    artisan-sole-app/tests-neue-seiten.mjs
                         32 Prüfungen: dass die Seiten nach dem Kauf und die
                         neuen Verwaltungsansichten überhaupt aufgehen. Ein
                         erfolgreicher Build sagt nur, dass sich die Dateien
                         übersetzen lassen — ob eine Seite beim Öffnen
                         abstürzt, sagt er nicht, und genau dort sitzen die
                         Fehler, die im Betrieb ein weißes Fenster ergeben.

Der Entwicklungsserver spricht standardmäßig mit Port 3001. Für einen Lauf
gegen die Wegwerf-Datenbank auf 3099: `API_PORT=3099 npx vite`.
