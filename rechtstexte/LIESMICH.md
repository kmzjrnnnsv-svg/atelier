# Rechtstexte — Anleitung und Vorbehalte

Drei Entwürfe für Artisan Sole, zugeschnitten auf **maßgefertigte Schuhe**:

- `AGB.md`
- `Impressum.md`
- `Datenschutzerklaerung.md`

## Das Wichtigste zuerst

**Das ist keine Rechtsberatung.** Ich bin kein Anwalt. Diese Entwürfe sind
sorgfältig auf euren konkreten Fall geschrieben, ersetzen aber keine Prüfung.

Der Grund, warum ich darauf bestehe, ist wirtschaftlich, nicht formal: Eine
fehlerhafte AGB-Klausel oder ein unvollständiges Impressum kostet bei einer
Abmahnung schnell **mehrere hundert bis über tausend Euro** — deutlich mehr,
als eine Erstprüfung kostet. Gerade wenn die Mittel knapp sind, ist das der
falsche Posten zum Sparen.

## So kommen die Texte auf die Seite

1. Platzhalter `[…]` in allen drei Dateien ersetzen
2. Die eckigen Hinweisblöcke (`[**Variante …**]`, `[**Nur behalten, wenn …**]`)
   entscheiden und **restlos entfernen**
3. Im CMS unter **Rechtliches** je Dokument einfügen — die Typen heißen
   `agb`, `datenschutz`, `impressum`
4. Prüfen, dass alle drei aus dem Footer heraus **ohne Anmeldung** erreichbar
   sind. Ein Impressum hinter einem Login ist kein Impressum.

## Was ich nicht so umsetzen konnte, wie du es beschrieben hast

Drei deiner Wünsche gehen rechtlich nicht. Ich habe sie jeweils so nah wie
möglich umgesetzt.

### 1. Gewährleistung auf 14 Tage begrenzen — nicht möglich

Bei neuer Ware an Verbraucher sind **zwei Jahre zwingend** (§ 438 Abs. 1
Nr. 3 BGB). Eine Verkürzung ist nach § 476 Abs. 2 BGB unwirksam und ein
klassischer Abmahngrund. Die Klausel wäre nicht nur wirkungslos, sondern
gefährlich.

**Stattdessen umgesetzt:** Die 14 Tage stehen als *Bitte* um zeitnahe Meldung
(Ziffer 6 Abs. 4) und als *freiwillige Kulanzfrist* (Ziffer 7). Beides ist
zulässig, weil es deine gesetzlichen Pflichten nicht beschneidet, sondern
etwas obendrauf legt.

### 2. „Bei Nichtgefallen Gegenwert gutschreiben" — geht, aber als Kulanz

Umgesetzt in Ziffer 7: ausdrücklich freiwillig, ohne Rechtsanspruch, nur als
Gutschrift auf ein künftiges Paar, keine Auszahlung in Geld, Entscheidung im
Einzelfall. So bindet es dich nicht.

**Wichtig:** Wenn du das dauerhaft und automatisch gewährst, kann daraus mit
der Zeit eine betriebliche Übung werden. Die Klausel schließt das aus
(Ziffer 7 Abs. 4) — halte dich in der Praxis auch daran.

### 3. Datenschutz „ohne Gewähr" — nicht möglich

Die DSGVO gilt zwingend. Es gibt keine Formulierung, die Pflichten abbedingt.
Was schützt, ist Ehrlichkeit und Vollständigkeit: Wer korrekt beschreibt, was
er tut, ist im Beschwerdefall in einer erheblich besseren Lage.

## Deine stärkste Absicherung

**Der Ausschluss des Widerrufsrechts** (AGB Ziffer 5) ist der wertvollste
Punkt der gesamten AGB. Er greift, weil Maßanfertigung nach § 312g Abs. 2
Nr. 1 BGB ausgenommen ist.

Damit er hält, müssen zwei Dinge stimmen:

1. **Die Schuhe müssen wirklich individuell sein.** Fußmaß, Leistenwahl,
   Konfiguration — das trägt. Würdest du irgendwann Standardgrößen aus dem
   Regal verkaufen, gilt der Ausschluss für diese Artikel **nicht**.
2. **Der Hinweis muss im Bestellvorgang erscheinen**, nicht nur in den AGB.
   Vor dem Absenden der Bestellung, deutlich sichtbar, mit Bestätigung.

**Der zweite Punkt ist inzwischen eingebaut.** Unmittelbar über der
Bestellschaltfläche steht ein eigenes, nicht vorangekreuztes Kästchen:

> ☐ Mir ist bekannt, dass mein Paar nach meinen persönlichen Maßen
> angefertigt wird und deshalb **kein Widerrufsrecht** besteht (§ 312g
> Abs. 2 Nr. 1 BGB). Ich verlange ausdrücklich, dass die Fertigung sofort
> beginnt.

Daneben ein zweites für AGB und Datenschutzerklärung, beide verlinkt. Ohne
beide Haken lässt sich nicht bestellen, und zwar nicht nur im Browser: Der
Server weist eine Bestellung ohne Bestätigung ab (`BESTAETIGUNG_FEHLT`). Der
Zeitpunkt steht danach an der Bestellung (`withdrawal_ack_at`,
`terms_ack_at`) — eine Zustimmung, die sich nicht belegen lässt, nützt im
Streitfall nichts.

## Zwei Punkte, die dein Anwalt prüfen sollte

**Fußscans und Art. 9 DSGVO.** Ich habe in der Erklärung begründet, warum die
Maße *keine* besonderen Daten sind: keine Identifizierung, keine medizinische
Auswertung. Das halte ich für tragfähig, es ist aber der Punkt mit dem
größten Diskussionsspielraum.

**Scans für die Verbesserung der Messfunktion.** Eure Datenbank sieht das vor
(`scan_training_data`). Dafür braucht es eine **aktive Einwilligung** im
Scanvorgang — ein nicht vorangekreuztes Kästchen. Ein Absatz in der
Datenschutzerklärung reicht dafür nicht. Solange das Kästchen fehlt, dürft
ihr die Aufnahmen nicht zur Verbesserung auswerten. Auch das kann ich
einbauen.

## Umsatzsteuer: was jetzt eingestellt ist

Entschieden ist **Regelbesteuerung mit 19 %**, passend zur
Umsatzsteuer-Identifikationsnummer im Impressum und zu Ziffer 8 der AGB.

Wie es zusammenhängt:

- Der Laden zeigt **Bruttopreise**. Die Beträge ändern sich dadurch nicht —
  in 1.450 € stecken 231,51 € Umsatzsteuer, der Kunde zahlt weiterhin
  1.450 €.
- Unter jedem Preis steht jetzt „inkl. MwSt., zzgl. Versand" (§ 6 Abs. 1
  PAngV). In der Kasse steht zusätzlich, wie viel von der Summe Steuer ist.
- Die Rechnung weist Entgelt, Steuersatz und Steuerbetrag getrennt aus
  (§ 14 Abs. 4 Nr. 8 UStG).
- Die Angaben zum Aussteller (Name, Anschrift, USt-IdNr.) liest die
  Anwendung beim ersten Start aus `Impressum.md`. Ändern lassen sie sich in
  der Verwaltung unter **Rechnungsangaben**; von dort wird die Datei nicht
  mehr gelesen.

**Umstellen ist eine bewusste Handlung.** In der Verwaltung, mit Zweitfaktor.
Und sie wirkt nur nach vorn: Was bei der Ausstellung galt, steht an der
Bestellung und bleibt dort. Eine Rechnung vom letzten Jahr bekommt durch
einen Wechsel keine 19 % aufgedruckt — sonst hätte der Kunde Vorsteuer aus
einem Umsatz gezogen, für den nie Steuer erhoben wurde.

## Vor dem Livegang

- [x] Alle `[…]` ersetzt, alle Hinweisblöcke entfernt
- [x] Impressum vollständig, mit **Telefonnummer**
- [x] Umsatzsteuer-Variante entschieden (Regelbesteuerung, 19 %)
- [x] Preise mit Hinweis auf enthaltene Umsatzsteuer und Versandkosten
- [x] Widerrufs-Hinweis im Checkout eingebaut, mit Nachweis an der Bestellung
- [x] Schaltfläche nach der Button-Lösung beschriftet (§ 312j Abs. 3 BGB)
- [ ] Zuständige Landesdatenschutzbehörde eingetragen
- [ ] Alle Dienstleister in der Empfängertabelle ergänzt
- [ ] Auftragsverarbeitungsverträge mit Hoster und Versand abgeschlossen
- [ ] Alle drei Seiten ohne Login erreichbar
- [ ] Einwilligung für die Scan-Auswertung eingebaut (oder Abschnitt 6.4 gestrichen)
- [ ] Anwaltliche Prüfung

Der letzte Punkt ist der wichtigste.
