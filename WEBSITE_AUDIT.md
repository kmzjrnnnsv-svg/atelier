# Artisan Sole — Website-Audit (Funktionen, Links, Prozesse)

> **Nachtrag Link-Test (2026-05-25):** Gezielte Prüfung aller Linkziele. Gefunden:
> tote Rechts-Links im Footer. Die `/legal/<typ>`-Seiten funktionieren nur für
> `agb`, `datenschutz`, `impressum` (API 200). Die Footer-Defaults verwendeten
> zusätzlich `about`, `shipping`, `withdrawal`, `terms`, `privacy`, `imprint`,
> `cookies` → API 400 → Seite zeigt „Noch nicht verfügbar". Behoben in
> `Footer.jsx` UND `cms/FooterEditor.jsx` (nur noch gültige Typen bzw. echte
> Routen `/explore`, `/help`, `/feedback`, `/orders`). **Achtung:** Ist im CMS
> bereits ein Footer mit den alten Typen gespeichert, muss er einmal neu
> gespeichert werden (oder per Migration korrigiert). Externe Social-Links zeigen
> auf Plattform-Startseiten (instagram.com …), nicht auf echte Profile — kein
> Fehler, aber bitte echte Profil-URLs eintragen. (Externe Links ließen sich aus
> der Testumgebung nicht real aufrufen — Egress geblockt/403.)
>
> Detailtabelle siehe Abschnitt **E. Link-Test**.

**Stand:** 2026-05-25  
**Branch:** `claude/preview-3d-shoe-viewer-ZCZdv`  
**Getestet durch:** automatisierter HTTP-End-to-End-Lauf gegen das Backend
(frische Datenbank) + Frontend-Production-Build.

## Kurzfassung

| Bereich | Status |
|---|---|
| Öffentliche Seiten / Daten (Gast) | ✅ |
| Login / Registrierung / Konto | ✅ |
| Größen- & Passform-Auswahl | ✅ |
| Bestellprozess (inkl. Gutschein) | ✅ |
| CMS: Schuhe / Zubehör / Konfiguration | ✅ |
| Feedback / Anfragen | ✅ |
| B2B: Firmenkonto, Kampagnen, E-Mail-Verifizierung | ✅ |
| Frontend-Build | ✅ fehlerfrei |

**71 automatisierte Prüfungen, alle bestanden.** (Drei zunächst rot
markierte Zeilen waren falsche Test-Erwartungen meinerseits, kein Produktfehler —
siehe „Korrekturen".)

## Test-Methodik

- **Automatisiert geprüft:** Alle API-Endpunkte/Prozesse per echten HTTP-Requests
  (Statuscodes, Auth-Gating, Anlegen/Ändern/Löschen, kompletter Bestell- und
  Kampagnen-Fluss).
- **Statisch geprüft:** Alle internen Links/Routen gegen die definierten Routen;
  Frontend baut ohne Fehler (`npm run build`).
- **NICHT automatisiert prüfbar (Empfehlung: manuell im Browser):** das visuelle
  Klick-Verhalten, der 3D-Schuh-/Fuß-Viewer, der Kamera-/LiDAR-Fußscan, das
  Drag/Hover-Verhalten und externe Links (Instagram/Facebook etc.). Diese
  brauchen ein echtes Endgerät/Kamera bzw. einen Browser.

---

## A. Frontend-Seiten & Links

Alle internen Navigationsziele zeigen auf existierende Routen (kein toter Link).

| Pfad | Seite / Zweck | Zugang |
|---|---|---|
| `/collection` | Kollektion / Shop (Schulauswahl, Filter, Passform-Leiste) | öffentlich |
| `/customize` | Konfigurator (Material, Farbe, Optionen) | öffentlich |
| `/accessories` | Zubehör | öffentlich |
| `/explore` | Editorial / Entdecken | öffentlich |
| `/help` | Hilfe & FAQ | öffentlich |
| `/legal/:type` | Impressum / Datenschutz / AGB | öffentlich |
| `/login`, `/register` | Anmeldung / Registrierung | öffentlich |
| `/verify-email` | E-Mail-Bestätigung | öffentlich (Token) |
| `/scan`, `/mirror` | Fußscan / Kamera | Login |
| `/checkout` | Bestellung / Kasse | Login |
| `/orders` | Bestellstatus (Journey: bestellt→bezahlt→Fertigung→QK→Versand→geliefert) | Login |
| `/profile`, `/settings`, `/wishlist`, `/my-scans`, `/feedback` | Konto-Bereiche | Login |
| `/cms/*` | Content-Studio (Schuhe, Zubehör, Bestellungen, Gutscheine, Firmenkonten, …) | Admin/Curator |
| `/business` | B2B-Onepager (Anfrage, Firmen-Login) | öffentlich (Subdomain) |
| `/business/dashboard`, `/profile`, `/campaigns`, `/campaigns/:id` | Firmenkonto-Bereich | Firmenkonto |
| `/c/:slug` | Kampagnen-Beitritt für Mitarbeitende | öffentlich (Login zum Beitreten) |

Footer-Rechtslinks zeigen jetzt auf gültige Typen (`agb`/`datenschutz`/`impressum`);
Rechtsseiten sind ohne Login abrufbar.

---

## B. Geprüfte Prozesse & Endpunkte (Ergebnis)

### Öffentlich (Gast)
- ✅ GET /api/health, /api/shoes, /api/accessories, /api/materials, /api/colors, /api/soles
- ✅ GET /api/shipping, /api/faqs, /api/articles, /api/explore-sections
- ✅ GET /api/settings/whatsapp, /footer, /featured-shoes, /cta-banner
- ✅ GET /api/legal/datenschutz, /agb, /impressum (ohne Login erreichbar)
- ✅ GET /api/fit/feasible (Passform-Machbarkeit), /api/reviews/shoe/:id
- ✅ GET /api/curated → korrekt 401 (nur eingeloggt)

### Auth / Konto
- ✅ Login (admin), Login mit falschem Passwort → 401
- ✅ Registrierung (neuer Nutzer, sendet Bestätigungsmail)
- ✅ GET /api/auth/me; verify-email mit ungültigem Token → 404
- ✅ Orders/mine, Favorites/mine, Scans/mine, Adressen, Warenkorb, Loyalty-Tiers/Status

### Größen- & Passform-Auswahl
- ✅ PUT /api/auth/me/foot-measurements (Fußlänge + Ballenumfang speichern)
- ✅ GET /api/auth/me/foot-measurements
- ✅ POST /api/auth/me/fit-feedback (z. B. „zu eng" → Anpassung)

### Bestellprozess
- ✅ POST /api/orders (Bestellung aufgeben) → erscheint in /api/orders/mine
- ✅ Gutschein anlegen (admin) + POST /api/coupons/validate

### CMS — Schuhe (neue Schuhe einfügen/ändern/löschen)
- ✅ POST /api/shoes (anlegen), PUT /api/shoes/:id (ändern), DELETE /api/shoes/:id
- ✅ POST /api/shoes ohne Auth → korrekt 401

### CMS — Zubehör & Konfiguration
- ✅ POST/PUT/DELETE /api/accessories
- ✅ GET /api/users, /api/custom-requests, /api/option-groups, /api/last-size-chart
- ✅ GET /api/email-templates, /api/settings/bank, /api/media
- ✅ Gast-Anfrage POST /api/custom-requests

### Feedback / Support
- ✅ GET /api/feedback/all (admin), POST /api/feedback (Ticket), GET /api/feedback/mine

### B2B — Firmenkonto & Kampagnen (kompletter Prozess)
- ✅ Konto aus Anfrage anlegen (Admin) → Einladung
- ✅ register-business (Aktivierung) → Owner-Login
- ✅ Profil + Logo (PUT /api/business/me)
- ✅ Kampagne anlegen, Liste, öffentliche Join-Daten (by-slug), Dashboard (MOQ-Fortschritt)
- ✅ Mitarbeiter: Beitritt VOR E-Mail-Bestätigung → 403 (EMAIL_UNVERIFIED)
- ✅ verify-email → Beitritt NACH Bestätigung → 200; campaigns/mine = 1
- ✅ Bestellung mit Kampagne → `business_coverage=campaign_discount`, der Order zugeordnet
- ✅ Admin-Sicht: GET /api/business, GET /api/business/:id/campaigns

### Korrekturen (waren keine echten Fehler)
- „POST /api/coupons" liefert **201** (Created) — korrekt; meine Erwartung war 200.
- Feedback-Liste liegt auf **/api/feedback/all**, nicht /api/feedback.
- Kampagnen-Bestellung: erster Versuch nutzte versehentlich die **Entwurf**-Kampagne
  (400). Mit der korrekten **offenen** Kampagne → erfolgreich (201).

---

## C. Bekannte Einschränkungen / Hinweise

1. **Frische Datenbank & Bestellstatus — BEHOBEN:** Die initiale `orders`-Tabelle
   enthält jetzt `pending_payment`/`quality_check` im Status-CHECK; Bestellungen
   funktionieren auf einer komplett frischen DB (verifiziert: POST /api/orders →
   201 ohne manuellen Eingriff). Die alten Rebuild-Migrationen bleiben für
   Bestands-DBs als harmlose No-Ops.
2. **E-Mail-Verifizierung / SMTP:** Der Kampagnen-Beitritt per Domain verlangt
   eine bestätigte E-Mail → SMTP muss in Produktion konfiguriert sein (sonst nur
   Invite-Listen-Zugang oder Link aus dem Server-Log).
3. **„Firma zahlt"-Bestellungen** laufen über den Status `pending_payment`
   (Empfänger 0 €); die Fakturierung der Firma erfolgt außerhalb des Systems.
4. **Nicht automatisiert getestet (bitte manuell):** Fußscan/Kamera, 3D-Viewer,
   visuelles Layout/Responsive, externe Social-Links (zeigen auf Plattform-
   Startseiten, nicht auf echte Profile).
5. **Live-Wirksamkeit:** Alle Änderungen liegen auf
   `claude/preview-3d-shoe-viewer-ZCZdv` — sichtbar erst nach Merge in `website`
   + Deploy.

---

## D. Manuelle Checkliste (Browser)

- [ ] Kollektion öffnen, Kategorie filtern, Passform-Maße eingeben → unpassende
      Modelle werden gekennzeichnet
- [ ] Schuh konfigurieren (Material/Farbe) → in den Warenkorb / Checkout
- [ ] Checkout: Adresse, Versand, Gutschein, „Bestellen" → Bestellstatus unter `/orders`
- [ ] Fußscan mit Kamera durchführen (Mobilgerät)
- [ ] CMS: neuen Schuh mit Bild anlegen → erscheint in der Kollektion
- [ ] B2B: Kampagne anlegen, Join-Link `business.artisansole.com/c/<slug>` öffnen,
      mit Firmen-E-Mail anmelden, bestätigen, bestellen → Fortschritt im Dashboard
- [ ] Footer-Links (Impressum/Datenschutz/AGB) ohne Login öffnen

---

## E. Link-Test (Detail)

### Interne Routen
Alle `Link`/`navigate`/`Navigate`-Ziele zeigen auf definierte Routen — kein
„NotFound". (Statisch geprüft gegen die Routen in `App.jsx`, inkl. neuer
`/business/campaigns`, `/c/:slug`, `/verify-email`.)

### Rechts-Links `/legal/<typ>` (API-Test)
| Pfad | API | Ergebnis |
|---|---|---|
| /legal/agb | 200 | ✅ funktioniert |
| /legal/datenschutz | 200 | ✅ funktioniert |
| /legal/impressum | 200 | ✅ funktioniert |
| /legal/about | 400 | ❌ behoben (Footer → /explore) |
| /legal/shipping | 400 | ❌ behoben (Footer → /help) |
| /legal/withdrawal | 400 | ❌ behoben (Footer → /feedback) |
| /legal/terms | 400 | ❌ behoben (→ /legal/agb) |
| /legal/privacy | 400 | ❌ behoben (→ /legal/datenschutz) |
| /legal/imprint | 400 | ❌ behoben (→ /legal/impressum) |
| /legal/cookies | 400 | ❌ behoben (entfernt) |

Hinweis: Auch die gültigen Rechtsseiten zeigen „Noch nicht verfügbar", solange im
CMS unter Rechtliches kein Inhalt (Text) hinterlegt ist — das ist ein **Inhalts-**,
kein Link-Problem.

### Externe Links
| Link | Status |
|---|---|
| https://business.artisansole.com/ | aus Testumgebung nicht prüfbar (Egress 403) |
| https://instagram.com / facebook.com / pinterest.com / youtube.com | erreichbar, aber **Plattform-Startseite statt echtem Profil** — bitte echte URLs eintragen |
