# Rechts-Check Website & App (Stand 2026-09-27)

Technische Prüfung von Code und Rechtstexten gegen DSGVO, TDDDG, BGB/EGBGB
(Fernabsatz), UWG, BFSG. **Keine Rechtsberatung.** Die mit ⚖️ markierten Punkte
sollten mit einer Anwältin/einem Anwalt geklärt werden.

Pfade relativ zum Repo. `app/` = `artisan-sole-app/src/`, `backend/` = `artisan-sole-backend/src/`.

---

## 🔴 Priorität 1: aktuell falsch oder abmahngefährdet

### 1. Fußscan: Einwilligungstext ist sachlich falsch
- `app/screens/FootScan.jsx:3279`: „Ohne Haken bleiben die Bilder auf diesem Gerät“.
  Das stimmt nicht:
  - Fotos gehen **immer** an `/api/scans/analyze` (`FootScan.jsx:1802`).
  - Diese Route schickt sie an **Anthropic/Claude (USA)** (`backend/routes/scans.js:342, 422, 657–683`).
  - Photogrammetrie-Bilder gehen immer an den Server (`FootScan.jsx:1628`).
- LiDAR-Route: Fotos landen **ohne Einwilligung** als Trainingsdaten (`backend/routes/scans.js:1836–1877, 1255–1285`).
- Vor dem Kamerastart gibt es **keinen Datenschutzhinweis**. Scans werden ohne Hinweis gespeichert (`FootScan.jsx:1889–1940`).
- **Zu tun:**
  - Vor dem Scan einen Hinweis plus eine ausdrückliche Einwilligung einbauen (⚖️ Art. 9 DSGVO, siehe Punkt 2).
  - Text korrigieren.
  - Trainings-Upload strikt an `consent_at` koppeln.
  - Widerruf der Einwilligung in der App ermöglichen, nicht nur per E-Mail.

### 2. Gesundheitsdaten (Art. 9 DSGVO) ⚖️
- Die Datenschutzerklärung sagt, Art. 9 sei nicht betroffen (`rechtstexte/Datenschutzerklaerung.md:96–102`).
- Gespeichert werden aber:
  - Fußfotos und 3D-Punktwolken
  - Fußtyp und Gewölbehöhe
  - das Freitextfeld „Persönliche Notizen zu deinen Füßen“ (`FootScan.jsx:3228–3245`). Dort landen typischerweise Hallux, Diabetes, Einlagen usw.
- **Empfehlung:** ausdrückliche Einwilligung nach Art. 9 Abs. 2 lit. a mit Zeitstempel und Textversion (`foot_scans` und `users.foot_notes` haben kein Einwilligungsfeld).

### 3. Datenschutzerklärung stimmt nicht mit der Technik überein
- **Anthropic (USA)** fehlt komplett:
  - Fußfotos gehen dorthin (siehe Punkt 1).
  - Die `foot_notes` jeder Bestellung gehen zur Übersetzung dorthin (`backend/routes/orders.js:19–37, 181`).
- Abschnitt 11 behauptet „keine Drittlandübermittlung“. Das widerspricht Anthropic **und** Unsplash (8b).
- **E-Mail:**
  - Laut Text läuft der Versand über Hetzner.
  - Der Code nutzt standardmäßig **Brevo** oder Resend/Postmark/Mailgun (`backend/utils/mailHttp.js`), Fallback `smtp.gmail.com` (`backend/utils/email.js`).
  - → Tatsächlichen Anbieter eintragen.
- „AV-Verträge geschlossen“ (Z. 311): laut `rechtstexte/LIESMICH.md:142–143` noch **nicht erledigt**.
- **Fehlt ganz:**
  - B2B/Arbeitgeber-Kampagnen
  - iOS-App (Kamera, LiDAR, Foto-Mediathek, Apple)
  - Hersteller in Spanien (erhält Name, Adresse, **Telefon**, Maße, Fußnotizen, Kaufhistorie; `backend/utils/email.js:926–1091`)
  - WhatsApp (Meta)
  - Paketdienste
  - Chat, Feedback, Maßanfragen, Bewertungen, Treueprogramm, Passkeys/MFA, Affiliate/Vermittler
- **Speicher-/Cookie-Tabelle unvollständig.** Es fehlen:
  - `as_fm`-Cookie plus `as_foot_measurements` (Fußmaße, 1 Jahr)
  - `as_ref`, `as_klick:*` (Affiliate)
  - `as_owner`
  - `as_gutschein`
  - `as_newsletter_*`
- Tippfehler Z. 229: „Affiliate oder Affiliate“.

### 4. Widerrufsrecht für Zubehör fehlt
- AGB §5(1) sagt pauschal „kein Widerrufsrecht“. Das gilt aber nur für Maßschuhe.
- Zubehör (z. B. Gürtel, einzeln bestellbar, `backend/routes/orders.js:121–141`) ist Lagerware → **gesetzliches Widerrufsrecht**.
- Die Checkout-Checkbox sagt auch bei Zubehör- und Mischbestellungen „kein Widerrufsrecht“ (`app/screens/Checkout.jsx:1358–1361`).
- **Zu tun:**
  - Widerrufsbelehrung (Anlage 1 zu Art. 246a EGBGB) plus Muster-Widerrufsformular (Anlage 2) als eigene Seite anlegen.
  - Beides in AGB und Bestellbestätigung aufnehmen.
  - Checkbox-Text je nach Warenkorb anpassen.
  - Ohne Belehrung verlängert sich die Frist auf 12 Monate + 14 Tage.
- **Widerrufsbutton (§ 356a BGB, Pflicht seit 19.06.2026):** fehlt. Er muss für alle widerrufbaren Verträge gut sichtbar erreichbar sein.

### 5. Rechtslinks fehlen auf den meisten Seiten
- Der Footer erscheint nur auf `/collection` und `/accessories` (`app/App.jsx:319`).
  - Auf `/business` erscheint er praktisch nie, weil dort die Navigation ausgeblendet ist.
  - Auch die **Startseite**, der Konfigurator, der Checkout und die Hilfe haben keine Links zu Impressum, Datenschutz und AGB.
- Die Business- und Affiliate-Seiten haben eigene Footer **ohne** Rechtslinks:
  - `CorporateGifting.jsx:449`
  - `business/CorporateOverview.jsx:273`
  - `AffiliateLanding.jsx:243`
- **Zu tun:** Impressum und Datenschutz müssen von jeder Seite mit einem Klick erreichbar sein.

### 6. Konto löschen und Datenauskunft
- „Konto löschen“ zeigt nur einen Toast „wende dich an den Support“ (`app/screens/Settings.jsx:487`).
- Es gibt keine Selbstlöschung und keinen Datenexport (Art. 15/20).
- Nutzer können eigene Scans nicht löschen (die Lösch-Route ist nur für Admins, `backend/routes/scans.js:1905`).
- **Apple verlangt** für Apps mit Kontoerstellung eine In-App-Kontolöschung (App Store Guideline 5.1.1(v)).
- Die endgültige Löschung läuft **nie automatisch**. Kein Cron, der Aufruf „beim Start“ fehlt in `backend/index.js` (`backend/utils/loeschung.js:71`).
- Vermutlich scheitert die Löschung an Foreign Keys: `orders.scan_id`, `fit_profile_id` und `business_id` haben kein `ON DELETE` (`backend/db/schema.js:338, 497, 1895`). **Testen.**
- ML-Fotos unter `artisan-sole-ml/data/real/scans/` werden beim Löschen nicht entfernt.

### 7. Checkout: Pflichtinformationen vor der Bestellung
- **In Ordnung:**
  - Button „Zahlungspflichtig bestellen“
  - MwSt.- und Versandangabe
  - Checkboxen nicht vorausgewählt
  - Server prüft sie
- **Fehlt:**
  - **Lieferzeit** in der Bestellübersicht.
    - AGB sagt „4–6 Wochen, unverbindlicher Richtwert“ → unzulässig unbestimmt (§ 308 Nr. 1 BGB).
    - Besser: „spätestens X Wochen nach Zahlungseingang“.
  - **Zahlungsart** (Vorkasse/Überweisung) vor dem Klick. Sie erscheint erst danach.
- „Datenschutzerklärung … stimme zu“ in der Checkbox raus. Die Datenschutzerklärung wird zur Kenntnis genommen, nicht akzeptiert. Betrifft auch `Registration.jsx:236–243`.
- Preise ohne MwSt./Versand-Hinweis:
  - `Startseite.jsx:936`
  - `Wishlist.jsx:86`
  - `ModellStreifen.jsx:99`
  - `Modellwahl.jsx:136`

---

## 🟠 Priorität 2: rechtlich zu klären bzw. nachzurüsten

### 8. Mindestalter ⚖️
- Es gibt nirgends eine Altersabfrage (Registrierung, Passkey-Signup, Checkout, Scan, Newsletter).
- Beim Onlinekauf ist das nicht zwingend, weil Minderjährige nach §§ 106 ff. BGB beschränkt geschäftsfähig sind.
- Wegen der Gesundheitsdaten-Einwilligung (Art. 8 DSGVO: in DE ab 16) aber sinnvoll.
- **Empfehlung:**
  - Checkbox „Ich bin mindestens 18 Jahre alt“ bei der Registrierung, alternativ mindestens 16 mit elterlicher Zustimmung.
  - Klausel in den AGB.
  - Nicht als Geburtsdatum speichern (Datensparsamkeit).

### 9. Cookies / Speicher (§ 25 TDDDG)
- Ein Banner ist vorhanden, mit nur der Kategorie „Notwendig“. Das passt, **wenn** wirklich alles notwendig ist.
- **Fraglich:**
  - Affiliate-Code `as_ref` (30 Tage) und Klickzählung `as_klick:*` mit `document.referrer`. Die Provisionszuordnung ist kaum „unbedingt erforderlich“ → Einwilligung oder weglassen ⚖️.
  - **Unsplash-Bilder** laden ohne Einwilligung von einem US-Server (IP-Übermittlung, `app/lib/editorialImages.js:18`) → Bilder selbst hosten.
  - Fußmaße im Cookie `as_fm`, 1 Jahr, bei jedem Request mitgeschickt → besser nur localStorage und kürzer.
- Bannertext um alle gespeicherten Schlüssel ergänzen.

### 10. Formulare ohne Datenschutzhinweis
- Betroffen:
  - RegisterBusiness
  - RegisterAffiliate
  - RegisterPromotion
  - Feedback
  - Maßanfrage (`CustomRequestModal`)
  - B2B-Anfrage (`CorporateGifting`)
  - Affiliate-Anfrage
  - Chat
- **Zu tun:** kurzer Satz mit Link zur Datenschutzerklärung (Art. 13 DSGVO).

### 11. AGB-Klauseln ⚖️
- Maßtoleranz ±0,3 cm „kein Mangel“ und „Größenempfehlung keine zugesicherte Eigenschaft“ sind negative Beschaffenheitsvereinbarungen. Sie brauchen bei Verbrauchern einen **gesonderten Hinweis und eine ausdrückliche Vereinbarung** (§ 476 Abs. 1 S. 2 BGB). Die AGB allein reichen nicht.
- „Ist ein Schuh mangelhaft, liefern wir Ersatz“ nimmt das Wahlrecht Nachbesserung/Neulieferung (§ 439 BGB). Das ist gegenüber Verbrauchern unzulässig.
- Stornostaffel 50/75/100 %: Der Nachweis eines geringeren Schadens muss ausdrücklich erlaubt sein (§ 309 Nr. 5 b BGB).
- Widerspruch zum Fertigungsstart: „nach Zahlung **und** Freigabe“ (Z. 32) vs. „automatisch bei Zahlung“ (Z. 249).
- **Fehlt:**
  - Angaben nach Art. 246c EGBGB (Vertragssprache, Speicherung des Vertragstexts, technische Schritte, Korrektur von Eingabefehlern)
  - B2B-/Kampagnen-Bedingungen (Firma zahlt, Rechnung)
  - eine eigene Versand- und Zahlungsseite

### 12. B2B / Mitarbeiterkampagnen
- Mitarbeitende werden per E-Mail-Domain **automatisch** in Kampagnen aufgenommen (`backend/routes/business.js:135–168`).
- Die Firma sieht in der Einladungsliste, wer teilgenommen hat (`business.js:209`). Einen Hinweis dazu gibt es nicht.
- **Sicherheitslücke:** Die E-Mail-Änderung in `PATCH /me` läuft ohne Passwort und ohne Neu-Verifizierung, `email_verified` bleibt stehen (`backend/routes/auth.js:313–321`). Damit kann man sich in fremde Firmenkampagnen einschleusen, auch in solche, bei denen die Firma zahlt.
- ⚖️ Klären:
  - Vertrag mit der Firma
  - eigener Datenschutzhinweis für Teilnehmende
  - Beitritt aktiv bestätigen lassen statt automatisch

### 13. Bestellbestätigung und Rechnung
- **Bestellbestätigung:** Anbieteridentität und Anschrift fehlen als eigener Block (Art. 246a § 1 EGBGB). Die Widerrufsbelehrung für Zubehör fehlt ebenfalls.
- **Rechnungen** werden nicht archiviert, das PDF wird jedes Mal neu erzeugt.
  - Nach einer Kontolöschung sind die Adressen auf NULL gesetzt, die Rechnung ist dann nicht mehr reproduzierbar.
  - Das ist ein Konflikt mit § 14b UStG, § 147 AO und § 257 HGB (8 bzw. 10 Jahre).
  - → Rechnungs-PDF bei Ausstellung unveränderlich ablegen.
- **Dummy-Bankdaten** in `backend/utils/email.js:50–59`: „Artisan Sole **GmbH**“, „Musterbank“, `DE00…`. Das ist irreführend, falls die Einstellungen leer sind.
- Die akzeptierte AGB-Version wird nicht gespeichert, nur ein Zeitstempel. `legal_docs` hat keine Historie.

### 14. Aufbewahrung und Löschfristen
Es gibt keine automatische Bereinigung für:
- abgelaufene Refresh-Tokens
- unbestätigte Newsletter-Einträge (die Datenschutzerklärung verspricht 30 Tage)
- abgemeldete Newsletter-Einträge (3 Jahre)
- Einwilligungs-Log
- Maßanfragen und Chats
- alte Scans
- inaktive Konten

Außerdem:
- PM2-, journald- und nginx-Logs werden nicht rotiert. Die „14 Tage“ in der Datenschutzerklärung sind nicht konfiguriert.
- Backups sind unverschlüsselt (`scripts/sicherung.sh`).
- **Zu tun:** Löschkonzept schreiben plus einen täglichen Aufräum-Job.

### 15. Sessions und Sicherheit
- **In Ordnung:**
  - Access-Token nur im Speicher, 15 Minuten
  - Refresh-Cookie `HttpOnly` und `Secure`
  - bcrypt
  - HSTS und CSP über helmet
- **Zu verbessern:**
  - Refresh-Token wird zusätzlich im JSON-Body ausgeliefert (`auth.js:69`). Damit ist es per XSS lesbar.
  - Keine maximale Sitzungsdauer: Jede Rotation gibt +7 Tage.
  - Passwortänderung beendet andere Sitzungen nicht.
  - Kein „Überall abmelden“.
  - Admin-Login ohne MFA, obwohl Admins alle Fußscans mit Namen sehen.
  - Kein eigenes Rate-Limit für Passkey-, MFA- und Registrierungs-Routen.
  - Einwilligungs-IP stammt aus dem ersten `X-Forwarded-For`-Eintrag und ist fälschbar. Besser `req.ip`.
  - nginx liefert die SPA ohne Security-Header aus. helmet greift nur für `/api`.
  - `webhook.js` läuft als root.

### 16. Barrierefreiheit (BFSG, seit 28.06.2025)
- **In Ordnung:**
  - `lang="de"`
  - Zoom erlaubt
  - Alt-Texte
  - `prefers-reduced-motion`
- **Fehlt:**
  - sichtbarer Tastaturfokus (167× `outline-none`, kein `focus-visible`)
  - Skip-Link und `<main>`
  - Checkboxen als `<button>` ohne `role="checkbox"`/`aria-checked`
  - Footer-Links als `<button>`
  - sehr kleine, kontrastarme Texte (`text-[9px] text-black/30`)
  - **Barrierefreiheitserklärung**
- ⚖️ Klären, ob die Kleinstunternehmer-Ausnahme greift (unter 10 Beschäftigte **und** höchstens 2 Mio. € Umsatz).

### 17. Sonstiges
- **iOS:** `PrivacyInfo.xcprivacy` fehlt. Apple verlangt es und prüft es bei der Einreichung. Die Berechtigungstexte in `Info.plist` sind sehr knapp.
- **Social-Links** im Footer zeigen auf die Startseiten der Plattformen, nicht auf eigene Profile.
- **Gesundheitsaussagen** in `app/screens/HealthInfo.jsx` (z. B. Hallux valgus) ⚖️ auf UWG/HWG prüfen.
- **Impressum:** vollständig (§ 5 DDG, USt-IdNr., VSBG-Hinweis, keine OS-Plattform). Nur prüfen, ob eine e.K.-Eintragung besteht.
- Die in der Datenbank veröffentlichten Rechtstexte können von den `.md`-Dateien abweichen, wenn im CMS bearbeitet wurde. Im CMS über „Fassung übernehmen“ abgleichen.

---

## Reihenfolge-Vorschlag

1. Scan-Text korrigieren, Einwilligung vor dem Scan, LiDAR-Upload ohne Einwilligung stoppen (Punkte 1–2).
2. Datenschutzerklärung an die Technik anpassen und AV-Verträge abschließen: Anthropic, Mail-Anbieter, Hersteller (Punkt 3).
3. Footer bzw. Rechtslinks überall (Punkt 5).
4. Widerrufsbelehrung, Formular und Widerrufsbutton für Zubehör; Checkout-Text nach Warenkorb (Punkt 4).
5. Lieferzeit und Zahlungsart im Checkout (Punkt 7).
6. Selbstlöschung, Datenexport, Lösch-Job (Punkte 6 und 14).
7. Sicherheitslücke bei der E-Mail-Änderung (Punkt 12).
8. Alterscheckbox, Formular-Hinweise, Unsplash lokal, Affiliate-Speicher (Punkte 8–10).
9. AGB-Klauseln anwaltlich überarbeiten (Punkt 11).
10. Barrierefreiheit (Punkt 16).
