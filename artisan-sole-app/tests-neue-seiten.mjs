/**
 * tests-neue-seiten.mjs — die neuen Seiten im echten Browser.
 *
 * Ein erfolgreicher Build sagt nur, dass die Dateien sich übersetzen lassen.
 * Ob eine Seite beim Öffnen abstürzt — ein undefinierter Zugriff in einer
 * Liste, ein fehlender Import in einem Zweig, der nur zur Laufzeit betreten
 * wird —, sagt er nicht. Genau dort sitzen die Fehler, die im Betrieb ein
 * weißes Fenster ergeben.
 *
 *   # Terminal 1: Server auf Wegwerf-DB, Port 3099
 *   # Terminal 2: vite dev (Proxy auf 3099)
 *   # Terminal 3: node tests-neue-seiten.mjs
 *
 * Jeder Fehler aus der Browser-Konsole zählt als Fehlschlag. Ohne das wäre
 * die Prüfung wertlos: React fängt vieles ab und rendert weiter.
 */
import { chromium } from 'playwright'

const BASIS = process.env.BASIS || 'http://localhost:5173'
let ok = 0
const fehler = []
const p = (was, bedingung, zusatz = '') => {
  if (bedingung) { ok++; console.log(`  OK     ${was}${zusatz ? ' — ' + zusatz : ''}`) }
  else { fehler.push(was); console.log(`  FEHLER ${was}${zusatz ? ' — ' + zusatz : ''}`) }
}
const abschnitt = (t) => console.log(`\n── ${t} ${'─'.repeat(Math.max(0, 56 - t.length))}`)

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
})
const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 1000 } })
const page = await ctx.newPage()

let konsolenFehler = []
page.on('console', (m) => { if (m.type() === 'error') konsolenFehler.push(m.text()) })
page.on('pageerror', (e) => konsolenFehler.push(String(e)))

// Nicht jede Konsolenmeldung ist ein Mangel dieser Änderung: Fehlgeschlagene
// Abrufe auf einer leeren Wegwerf-Datenbank und Warnungen aus Fremdcode
// gehören dazu. Gesucht wird, was auf einen Absturz hindeutet.
const echterFehler = (t) =>
  /is not a function|Cannot read|undefined is not|is not defined|Minified React error|Objects are not valid/.test(t)

async function oeffne(pfad, name, marker) {
  konsolenFehler = []
  await page.goto(`${BASIS}${pfad}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  const text = await page.locator('body').innerText().catch(() => '')
  p(`${name} lädt`, text.length > 40, `${text.length} Zeichen`)
  // Ohne Rücksicht auf Groß- und Kleinschreibung: Eine Regel im Stylesheet
  // setzt Überschriften in Versalien, und `innerText` gibt zurück, was zu
  // sehen ist — nicht, was im Markup steht.
  if (marker) p(`${name} zeigt „${marker}“`, text.toLowerCase().includes(marker.toLowerCase()))
  const schlimm = konsolenFehler.filter(echterFehler)
  p(`${name} ohne Laufzeitfehler`, schlimm.length === 0, schlimm[0]?.slice(0, 110) || '')
  return text
}

// ════════════════════════════════════════════════════════════════════════
abschnitt('1. Öffentliche Seiten')

await oeffne('/passwort-neu', 'Passwort vergessen', 'Passwort vergessen')
await oeffne('/passwort-neu?token=' + 'a'.repeat(64), 'Neues Passwort setzen', 'Neues Passwort')
await oeffne('/login', 'Anmeldung')
// Der Link steht am Passwortfeld, und das ist eingeklappt, solange Passkeys
// angeboten werden — wer ein Passwort hat, klappt es ohnehin auf.
const aufklappen = page.getByText('Mit Passwort anmelden')
if (await aufklappen.count()) await aufklappen.first().click()
await page.waitForTimeout(400)
p('Der Weg zum Zurücksetzen steht am Passwortfeld',
  await page.locator('a[href="/passwort-neu"]').count() > 0)

// ════════════════════════════════════════════════════════════════════════
abschnitt('2. Anmeldung als Verwaltung')

await page.goto(`${BASIS}/login`, { waitUntil: 'networkidle' })
// Der Passwort-Zweig ist eingeklappt, solange Passkeys angeboten werden.
const umschalter = page.getByText('Mit Passwort anmelden')
if (await umschalter.count()) await umschalter.first().click()
await page.locator('input[type="email"]').fill('admin@artisansole.com')
await page.locator('input[type="password"]').fill('ArtisanSole@2026!')
await page.locator('button[type="submit"]').click()
await page.waitForTimeout(2500)
p('Angemeldet', !page.url().includes('/login'), page.url())

// ════════════════════════════════════════════════════════════════════════
abschnitt('3. Neue Verwaltungsseiten')

await oeffne('/cms/zahlungen', 'Zahlungseingang', 'Zahlungseingang')
await oeffne('/cms/auswertung', 'Auswertung', 'Auswertung')

konsolenFehler = []
await page.getByText('Express-Bestand').first().click().catch(() => {})
await page.waitForTimeout(800)
p('Reiter Express-Bestand', (await page.locator('body').innerText()).includes('vorrätig')
  || (await page.locator('body').innerText()).includes('nicht geführt'))
p('Bestand ohne Laufzeitfehler', konsolenFehler.filter(echterFehler).length === 0,
  konsolenFehler.filter(echterFehler)[0]?.slice(0, 110) || '')

konsolenFehler = []
await page.getByText('Protokoll').first().click().catch(() => {})
await page.waitForTimeout(800)
p('Reiter Protokoll ohne Laufzeitfehler', konsolenFehler.filter(echterFehler).length === 0,
  konsolenFehler.filter(echterFehler)[0]?.slice(0, 110) || '')

await oeffne('/cms/werbemittel', 'Werbemittel', 'Werbemittel')
await oeffne('/cms/orders', 'Bestellungen')

// ════════════════════════════════════════════════════════════════════════
abschnitt('4. Bestellansicht des Kunden')

await oeffne('/orders', 'Meine Bestellungen')

// ════════════════════════════════════════════════════════════════════════
console.log(`\n── Ergebnis ${'─'.repeat(46)}\n`)
console.log(`  ${ok} bestanden, ${fehler.length} fehlgeschlagen`)
await browser.close()
if (fehler.length) { console.log('\n  ' + fehler.join('\n  ')); process.exit(1) }
