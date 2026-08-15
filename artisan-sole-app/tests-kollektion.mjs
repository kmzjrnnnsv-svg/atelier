/**
 * tests-kollektion.mjs — die Kollektionsseite: Rubriken, Suche, Ladezeit.
 *
 * ── Warum die Ladezeit hier steht und nicht im Gefühl ────────────────────
 *
 * „Zu lange" ist keine Zahl, und ohne Zahl lässt sich nicht sagen, ob eine
 * Änderung geholfen hat. Gemessen wird deshalb, was der Kunde erlebt: die
 * Zeit vom Aufruf bis zur ersten sichtbaren Kachel — nicht bis zum Ende
 * aller Abrufe.
 *
 * Der Unterschied ist der ganze Punkt der Änderung. Vorher wartete die Seite
 * auf ALLE siebzehn Abrufe des Ladens, bevor sie einen einzigen Schuh
 * zeigte; die Treuepunkte und die Fußabdrücke hielten den Katalog auf, obwohl
 * auf dieser Seite keiner von beiden vorkommt.
 *
 * ── Und die Rubriken ─────────────────────────────────────────────────────
 *
 * Die Saison ist ab jetzt die einzige Ordnung, die ein Kunde sieht. Steht ein
 * Modell unter keiner, ist es im Laden nicht zu finden — ohne dass irgendwo
 * ein Fehler erscheint.
 *
 *   BASIS=https://localhost:5173 node tests-kollektion.mjs
 */
import { chromium } from 'playwright'
import { saisonsSortiert, laufendeSaison } from './src/lib/saison.js'

const BASIS = process.env.BASIS || 'https://localhost:5173'
let ok = 0
const fehler = []
const p = (was, bed, zus = '') => {
  if (bed) { ok++; console.log(`  OK     ${was}${zus ? ' — ' + zus : ''}`) }
  else { fehler.push(was); console.log(`  FEHLER ${was}${zus ? ' — ' + zus : ''}`) }
}
const abschnitt = t => console.log(`\n── ${t} ${'─'.repeat(Math.max(0, 54 - t.length))}`)
const hat = (t, w) => String(t).toLowerCase().replace(/ß/g, 'ss').includes(String(w).toLowerCase().replace(/ß/g, 'ss'))

const br = await chromium.launch({
  executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
})
const c = await br.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 1100 } })
const page = await c.newPage()
const konsole = []
page.on('pageerror', e => konsole.push(String(e)))
page.on('console', m => { if (m.type() === 'error') konsole.push(m.text()) })
const schlimm = () => konsole.filter(t =>
  /is not a function|Cannot read|undefined is not|is not defined|Minified React error/.test(t))

/**
 * Die Kacheln des Rasters.
 *
 * Kein `<a href>`: Die Kachel ist ein `div` mit Klick-Handler, der über den
 * Router navigiert. Wer hier nach Links sucht, findet nichts und hält das
 * für eine leere Seite.
 */
const KACHEL = 'div.grid > div.group'
const kacheln = () => page.locator(KACHEL).count()

// ════════════════════════════════════════════════════════════════════════
abschnitt('1. Wie lange bis zur ersten Kachel')

// Jeder Abruf des Ladens wird gezählt. Der Katalog darf genau einmal über
// die Leitung gehen — er ging zweimal, weil die Seite sich mit einem
// zweiten Abruf vergewisserte, dass der Server antwortet.
let katalogAbrufe = 0
page.on('request', r => { if (/\/api\/shoes(\?|$)/.test(r.url())) katalogAbrufe++ })

const start = Date.now()
await page.goto(`${BASIS}/collection`, { waitUntil: 'commit' })
// Auf die erste Kachel warten, nicht auf „networkidle": Der Kunde sieht die
// Seite, sobald etwas dasteht, und nicht, wenn der letzte Abruf zurück ist.
await page.locator(KACHEL).first().waitFor({ timeout: 20000 }).catch(() => {})
const bisKachel = Date.now() - start

p('Die erste Kachel steht', await kacheln() > 0, `${await kacheln()} Kacheln`)
// Zwei Sekunden ist großzügig für eine Testmaschine mit Vite im
// Entwicklungsbetrieb; es geht darum, eine Größenordnung festzuhalten.
p('Unter zwei Sekunden bis zur ersten Kachel', bisKachel < 2000, `${bisKachel} ms`)

await page.waitForTimeout(2500)
p('Der Katalog geht genau einmal über die Leitung', katalogAbrufe === 1, `${katalogAbrufe} Abruf(e)`)
p('Ohne Laufzeitfehler', schlimm().length === 0, schlimm()[0]?.slice(0, 110) || '')

// ════════════════════════════════════════════════════════════════════════
abschnitt('2. Die Rubriken')

let text = await page.locator('body').innerText()
for (const r of ['Alle Modelle', 'Sommer', 'Winter', 'Ganzjährig']) {
  p(`Reiter „${r}"`, hat(text, r))
}
// Die Anlässe sind weg. Sie überschnitten sich — ein Loafer lag unter zwei
// Reitern, und wer ihn suchte, musste raten.
for (const alt of ['Büro & Business', 'Smart Casual', 'Freizeit', 'Abend & Gala', 'Outdoor']) {
  p(`Kein Reiter „${alt}" mehr`, !hat(text, alt))
}

// Bei „Alle Modelle" bekommt jede Saison ihren eigenen Block.
for (const ueber of ['Frühling & Sommer', 'Herbst & Winter', 'Das ganze Jahr']) {
  p(`Abschnitt „${ueber}"`, hat(text, ueber))
}

// ── Die Reihenfolge richtet sich nach dem Datum ─────────────────────────
//
// Zuerst die ganzjährigen, dann die Jahreszeit, die gerade läuft, zuletzt
// die andere. Im August stehen die Sommerschuhe vor den Stiefeln, im Januar
// umgekehrt.
//
// Erst die reine Funktion über alle zwölf Monate — sonst prüfte dieses
// Skript nur den Tag, an dem es zufällig läuft, und die Umkehrung im
// Oktober fiele niemandem auf.
for (const [monat, sollJetzt] of [
  [1, 'winter'], [2, 'winter'], [3, 'winter'], [4, 'summer'], [5, 'summer'], [6, 'summer'],
  [7, 'summer'], [8, 'summer'], [9, 'summer'], [10, 'winter'], [11, 'winter'], [12, 'winter'],
]) {
  const d = new Date(Date.UTC(2026, monat - 1, 15))
  const reihe = saisonsSortiert(d).map(x => x.key)
  const soll = ['all', sollJetzt, sollJetzt === 'summer' ? 'winter' : 'summer']
  p(`Monat ${String(monat).padStart(2)}: ${soll.join(' · ')}`,
    laufendeSaison(d) === sollJetzt && reihe.join(',') === soll.join(','), reihe.join(' · '))
}

// Und dann, dass die Seite sich daran hält.
const erwartet = saisonsSortiert(new Date()).map(x => x.titel)
const gezeigt = await page.$$eval('section h2', els => els.map(e => e.innerText.trim()))
p('Die Abschnitte stehen in dieser Reihenfolge',
  gezeigt.length === erwartet.length
  && gezeigt.every((t, i) => t.toLowerCase().startsWith(erwartet[i].toLowerCase())),
  gezeigt.join(' | '))
p('Die ganzjährigen stehen oben', /ganze jahr/i.test(gezeigt[0] || ''), gezeigt[0] || '—')
// Der Vermerk sagt, warum dieser Block dort steht. Ohne ihn wirkt die
// Reihenfolge willkürlich — und im Januar, wenn sie sich umdreht, wie ein
// Fehler.
p('Die laufende Jahreszeit ist als „Jetzt" gekennzeichnet',
  (gezeigt[1] || '').toUpperCase().includes('JETZT'), gezeigt[1] || '—')
p('Und die andere nicht', !(gezeigt[2] || '').toUpperCase().includes('JETZT'), gezeigt[2] || '—')

// Auch die Reiterleiste folgt derselben Reihenfolge — zwei verschiedene
// Ordnungen auf einer Seite wären zwei Behauptungen.
const reiter = await page.$$eval('button', els =>
  els.map(e => e.innerText.trim()).filter(t => /^(Alle Modelle|Sommer|Winter|Ganzjährig)/.test(t)))
const reiterSoll = ['Alle Modelle', ...saisonsSortiert(new Date()).map(x => x.label)]
p('Die Reiterleiste in derselben Reihenfolge',
  reiter.length >= 4 && reiter.slice(0, 4).every((t, i) => t.startsWith(reiterSoll[i])),
  reiter.slice(0, 4).join(' · '))

// ════════════════════════════════════════════════════════════════════════
abschnitt('3. Ein Reiter zeigt seine Rubrik')

const zaehle = async () => {
  await page.waitForTimeout(700)
  return page.locator(KACHEL).count()
}
const alle = await zaehle()

await page.getByRole('button', { name: /^winter/i }).first().click({ force: true })
const winter = await zaehle()
text = await page.locator('body').innerText()
p('Winter zeigt weniger als alles', winter > 0 && winter < alle, `${winter} von ${alle}`)
// Im Reiter selbst keine Überschriften mehr: Die Rubrik steht schon oben.
p('Ohne Abschnittsüberschriften', !hat(text, 'Das ganze Jahr'))

await page.getByRole('button', { name: /^sommer/i }).first().click({ force: true })
const sommer = await zaehle()
const sommerText = await page.locator('body').innerText()
// Nicht über die Anzahl: Sommer und Winter haben in der Maßanfertigung
// zufällig gleich viele Modelle, und eine Prüfung auf „ungleich viele" wäre
// dann fehlgeschlagen, ohne dass etwas falsch ist. Es zählt, WAS dasteht.
p('Sommer zeigt die Mokassins', sommer > 0 && hat(sommerText, 'Driver'), `${sommer} Modelle`)
p('Und keine Stiefel', !hat(sommerText, 'Chelsea Boot'))

await page.getByRole('button', { name: /^ganzjährig/i }).first().click({ force: true })
const ganzjahr = await zaehle()
p('Ganzjährig ebenso', ganzjahr > 0, `${ganzjahr} Modelle`)
// Jedes Modell liegt in genau einer Rubrik — die drei zusammen ergeben alles.
p('Die drei ergeben zusammen den ganzen Katalog', winter + sommer + ganzjahr === alle,
  `${winter} + ${sommer} + ${ganzjahr} = ${winter + sommer + ganzjahr}, erwartet ${alle}`)

await page.getByRole('button', { name: /^alle modelle/i }).first().click({ force: true })
await page.waitForTimeout(700)

// ════════════════════════════════════════════════════════════════════════
abschnitt('4. Die Suche')

const feld = page.locator('input[type="search"]')
p('Ein Suchfeld ist da', await feld.count() > 0)

await feld.fill('oxford')
await page.waitForTimeout(600)
const nachOxford = await kacheln()
text = await page.locator('body').innerText()
p('„oxford" findet Modelle', nachOxford > 0 && nachOxford < alle, `${nachOxford} Treffer`)
p('Die Trefferzahl steht dabei', /Treffer/.test(text))

// Der eigentliche Punkt: Die Saison ist mitdurchsuchbar. „winter" steht an
// keinem einzelnen Modell — der Schuh weiß nur, dass er ein Stiefel ist.
await feld.fill('winter')
await page.waitForTimeout(600)
const nachWinter = await kacheln()
p('„winter" findet die Stiefel über die Saison', nachWinter === winter,
  `${nachWinter}, erwartet ${winter}`)

await feld.fill('chelsea')
await page.waitForTimeout(600)
p('Ein Modellname wird gefunden', await kacheln() > 0)

await feld.fill('xyzgibtsnicht')
await page.waitForTimeout(600)
text = await page.locator('body').innerText()
p('Nichts gefunden wird gesagt', hat(text, 'haben wir nichts'))
p('Und ein Weg zurück angeboten', hat(text, 'Suche zurücksetzen'))

await page.getByText('Suche zurücksetzen').first().click({ force: true })
await page.waitForTimeout(700)
p('Zurücksetzen bringt alles wieder', await kacheln() === alle, `${await kacheln()} von ${alle}`)
p('Ohne Laufzeitfehler', schlimm().length === 0, schlimm()[0]?.slice(0, 110) || '')

// ════════════════════════════════════════════════════════════════════════
console.log(`\n── Ergebnis ${'─'.repeat(46)}\n`)
console.log(`  ${ok} bestanden, ${fehler.length} fehlgeschlagen`)
await br.close()
if (fehler.length) { console.log('\n  ' + fehler.join('\n  ')); process.exit(1) }
