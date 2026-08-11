# Ablauf-Prüfungen

Zwei Skripte, die die Anwendung über HTTP durchspielen — dieselben Routen wie
im Betrieb, nichts nachgebaut.

    tests/ablaeufe.mjs   62 Prüfungen: Registrierung, Katalog, Fußmaße,
                         Entwurf, Bestellung, Rücksendung, Verwaltung,
                         Anfragen, Vermittler, Firmenkonto
    tests/preise.mjs     21 Prüfungen: Kampagnenrabatt, Vermittler-Nachlass,
                         Provision samt Deckel, Preis-Untergrenze

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
    DB_PATH=/tmp/pruef.db node tests/preise.mjs

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

Für die Oberfläche liegt daneben `artisan-sole-app/tests-browser.mjs`
(Playwright, 23 Prüfungen). Es braucht einen laufenden Entwicklungsserver und
den Chromium-Pfad des Systems; siehe Kopf der Datei.
