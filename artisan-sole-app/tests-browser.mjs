/**
 * Die Oberfläche im echten Browser (23 Prüfungen).
 *
 *   # Terminal 1: Server auf einer Wegwerf-Datenbank, Port 3099
 *   # Terminal 2: vite mit Proxy auf 3099  (vite.config.js anpassen)
 *   # Terminal 3:
 *   npm i -D playwright --no-save        # PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
 *   node tests-browser.mjs
 *
 * Die Oberfläche im echten Browser. Klickt die Wege, die ein Kunde geht,
 * und meldet jeden Fehler aus der Konsole mit — die fallen sonst niemandem auf.
 */
import { chromium } from 'playwright'

const BASIS = 'https://localhost:5173'
let ok = 0
const fehler = []
const p = (was, bedingung, zusatz = '') => {
  if (bedingung) { ok++; console.log(`  OK     ${was}${zusatz ? ' — ' + zusatz : ''}`) }
  else { fehler.push(was); console.log(`  FEHLER ${was}${zusatz ? ' — ' + zusatz : ''}`) }
}
const abschnitt = (t) => console.log(`\n── ${t} ${'─'.repeat(Math.max(0, 56 - t.length))}`)

// Chromium-Pfad je nach System. Playwright bringt hier keinen eigenen mit,
// deshalb der Systempfad — über CHROMIUM überschreibbar.
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
})
const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 1000 } })
const page = await ctx.newPage()

// Konsolenfehler und abgestürzte Netzabrufe einsammeln.
const konsole = []
page.on('console', m => { if (m.type() === 'error') konsole.push(m.text().slice(0, 200)) })
page.on('pageerror', e => konsole.push('PAGEERROR: ' + e.message.slice(0, 200)))
const fehlgeschlagen = []
page.on('response', r => { if (r.status() >= 400 && r.url().includes('/api/')) fehlgeschlagen.push(`${r.status()} ${r.url().replace(BASIS, '')}`) })

const zufall = () => Math.random().toString(36).slice(2, 8)
const sichtbar = async (sel) => (await page.locator(sel).count()) > 0

// ═══════════════════════════════════════════════════════════════════
abschnitt('Startseite und Kollektion')

await page.goto(`${BASIS}/collection`, { waitUntil: 'networkidle', timeout: 45000 })
p('Kollektion lädt', await page.title() !== '', await page.title())
const karten = await page.locator('img').count()
p('Modelle werden gezeigt', karten > 3, `${karten} Bilder`)
p('Bestellablauf steht unten', await page.getByText('So läuft eine Bestellung').count() > 0)

// ═══════════════════════════════════════════════════════════════════
abschnitt('Registrierung')

const mail = `browser-${zufall()}@example.de`
await page.goto(`${BASIS}/register`, { waitUntil: 'networkidle' })
const felder = await page.locator('input').count()
p('Registrierung erreichbar', felder >= 3, `${felder} Felder`)

// ═══════════════════════════════════════════════════════════════════
abschnitt('Zubehör')

await page.goto(`${BASIS}/accessories`, { waitUntil: 'networkidle' })
p('Zubehör-Seite lädt', await page.getByText('Zubehör & Pflege').count() > 0)
p('Regel steht sichtbar dabei', await page.getByText(/nur zusammen mit einem Paar|zusammen mit einem Paar Schuhe/).count() > 0)

// ═══════════════════════════════════════════════════════════════════
abschnitt('Konfigurator')

await page.goto(`${BASIS}/collection`, { waitUntil: 'networkidle' })
const ersteKarte = page.locator('a[href*="/schuhe/"], [role="button"]').first()
await page.locator('img').nth(1).click({ timeout: 15000 }).catch(() => {})
await page.waitForTimeout(3000)
const aufKonfigurator = page.url().includes('/schuhe/') || page.url().includes('/customize')
p('Modell öffnet den Konfigurator', aufKonfigurator, page.url().replace(BASIS, ''))

if (aufKonfigurator) {
  p('Passform-Block vorhanden', await page.getByText('Passform').count() > 0)
  const groessenLink = page.getByText(/Zur Größentabelle/)
  p('Link zur Größentabelle', await groessenLink.count() > 0)

  if (await groessenLink.count() > 0) {
    await groessenLink.first().click()
    await page.waitForTimeout(1500)
    p('Größentabelle öffnet', await page.getByRole('dialog').count() > 0)
    p('Drei Register', await page.getByText('Umrechnung').count() > 0 && await page.getByText('Marken').count() > 0)
    // Der Reiter mit den echten Daten — vorher zeigte er nichts, weil der Pfad falsch war.
    const leer = await page.getByText('Derzeit keine Werte hinterlegt').count()
    p('Unsere Größen zeigt Werte', leer === 0, leer ? 'leer!' : 'Tabelle gefüllt')
    await page.getByText('Umrechnung').first().click()
    await page.waitForTimeout(600)
    p('Umrechnung zeigt Zeilen', await page.getByText('240 mm').count() > 0)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
    p('Esc schließt', await page.getByRole('dialog').count() === 0)
  }

  // Maße eingeben — der Fall „neues Konto"
  const massKnopf = page.getByRole('button', { name: /Maße eingeben/i })
  if (await massKnopf.count() > 0) {
    const vorher = await page.locator('input[inputmode="decimal"]').count()
    await massKnopf.first().click()
    await page.waitForTimeout(800)
    const nachher = await page.locator('input[inputmode="decimal"]').count()
    p('Maßeingabe erscheint beim Klick', nachher > vorher, `${vorher} → ${nachher} Felder`)
  }
}

// ═══════════════════════════════════════════════════════════════════
abschnitt('Kasse mit nur Zubehör')

await page.goto(`${BASIS}/checkout`, { waitUntil: 'networkidle' })
p('Kasse lädt', !(await page.getByText('Etwas ist schiefgelaufen').count()))

// ═══════════════════════════════════════════════════════════════════
abschnitt('Firmen- und Affiliate-Seiten')

for (const [pfad, text] of [['/business', 'Von der Anfrage bis zum ersten Paar'], ['/business/uebersicht', 'Preise und Prozess'], ['/affiliate/uebersicht', 'Konditionen und Ablauf']]) {
  await page.goto(`${BASIS}${pfad}`, { waitUntil: 'networkidle' }).catch(() => {})
  await page.waitForTimeout(800)
  p(`${pfad} lädt`, await page.getByText(text).count() > 0, text)
}

// ═══════════════════════════════════════════════════════════════════
abschnitt('Verwaltung')

await page.goto(`${BASIS}/login`, { waitUntil: 'networkidle' })
await page.locator('input[type="email"], input[name="email"]').first().fill('admin@artisansole.com')
await page.locator('input[type="password"]').first().fill('ArtisanSole@2026!')
await page.locator('button[type="submit"]').first().click()
await page.waitForTimeout(3500)
p('Admin angemeldet', !page.url().includes('/login'), page.url().replace(BASIS, ''))

for (const [pfad, text] of [['/cms/anfragen', 'Anfragen'], ['/cms/ruecksendungen', 'Rücksendungen'], ['/cms/affiliate', 'Affiliate']]) {
  await page.goto(`${BASIS}${pfad}`, { waitUntil: 'networkidle' }).catch(() => {})
  await page.waitForTimeout(1200)
  p(`${pfad} lädt`, await page.getByText(text).first().count() > 0)
}

// ═══════════════════════════════════════════════════════════════════
abschnitt('Ergebnis')

console.log(`\n  ${ok} bestanden, ${fehler.length} fehlgeschlagen`)
if (fehler.length) { console.log('\n  Fehlgeschlagen:'); for (const f of fehler) console.log(`    · ${f}`) }

const echteKonsolenfehler = [...new Set(konsole)].filter(k => !k.includes('favicon') && !k.includes('Download the React DevTools'))
if (echteKonsolenfehler.length) {
  console.log('\n  Konsolenfehler:')
  for (const k of echteKonsolenfehler.slice(0, 12)) console.log(`    · ${k}`)
}
const echteAbrufe = [...new Set(fehlgeschlagen)].filter(f => !f.startsWith('401') && !f.startsWith('404 /api/configs/offen'))
if (echteAbrufe.length) {
  console.log('\n  Fehlgeschlagene Abrufe:')
  for (const f of echteAbrufe.slice(0, 12)) console.log(`    · ${f}`)
}

await browser.close()
process.exit(fehler.length ? 1 : 0)
