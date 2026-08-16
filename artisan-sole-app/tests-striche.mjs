/**
 * tests-striche.mjs — auf der Seite steht kein Gedankenstrich mehr.
 *
 * ── Warum das im Browser geprüft wird und nicht im Quelltext ─────────────
 *
 * Ein Gedankenstrich erreicht die Seite auf drei Wegen: über eine
 * Zeichenkette im Programm, über einen Text, der in der Datenbank liegt,
 * und über einen Text, den jemand im CMS eingetippt hat. Eine Suche im
 * Quelltext findet nur den ersten.
 *
 * Und sie findet zu viel: In den Kommentaren dieses Projekts steht der
 * Strich hundertfach. Kommentare stehen nicht auf der Seite. Eine Prüfung,
 * die sie mitzählt, meldet Fehler, die keine sind — und wird dann
 * abgeschaltet.
 *
 * Gemessen wird deshalb der gezeichnete Text: `innerText` der Seite. Was
 * dort steht, hat ein Kunde vor Augen; was dort nicht steht, ist gleich,
 * wo es herkommt.
 *
 * ── Was an die Stelle des Strichs tritt ──────────────────────────────────
 *
 * Ein Komma. Nicht der Doppelpunkt, obwohl er sich an manchen Stellen
 * besser läse: Nach einem Doppelpunkt wird großgeschrieben, WENN ein
 * ganzer Satz folgt, und kleingeschrieben, wenn nur ein Satzteil folgt
 * (Duden D 26). Welcher Fall vorliegt, lässt sich nicht maschinell
 * entscheiden, und beide Fehler sieht man. Das Komma verlangt keine solche
 * Entscheidung: Zwei Hauptsätze dürfen im Deutschen durch ein Komma
 * verbunden werden, ein nachgestellter Satzteil ebenso.
 *
 *   BASIS=https://localhost:5173 node tests-striche.mjs
 */
import { chromium } from 'playwright'

const BASIS = process.env.BASIS || 'https://localhost:5173'
let ok = 0
const fehler = []
const p = (was, bed, zus = '') => {
  if (bed) { ok++; console.log(`  OK     ${was}${zus ? ' — ' + zus : ''}`) }
  else { fehler.push(was); console.log(`  FEHLER ${was}${zus ? ' — ' + zus : ''}`) }
}
const abschnitt = t => console.log(`\n── ${t} ${'─'.repeat(Math.max(0, 54 - t.length))}`)

// Geviert- und Halbgeviertstrich. Der Bindestrich (-) bleibt: Er verbindet
// Wörter („Custom-Made-Schuh") und ist kein Gedankenstrich.
const STRICH = /[—–]/

const br = await chromium.launch({
  executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
})
const c = await br.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 1100 } })
const page = await c.newPage()

// Die Seiten, die ein Besucher ohne Anmeldung erreicht. Sie tragen den
// meisten Fließtext: Kollektion, Modellseite, Rechtstexte, Hilfe.
const SEITEN = [
  ['Die Kollektion', '/collection'],
  ['Die Startseite', '/'],
  ['Die Hilfe', '/help'],
  ['Die AGB', '/legal/agb'],
  ['Der Datenschutz', '/legal/datenschutz'],
  ['Das Impressum', '/legal/impressum'],
  ['Die Anmeldung', '/login'],
  ['Die Registrierung', '/register'],
]

abschnitt('1. Was auf den Seiten steht')

for (const [name, pfad] of SEITEN) {
  await page.goto(`${BASIS}${pfad}`, { waitUntil: 'domcontentloaded' })
  // Kurz warten, bis nachgeladene Texte da sind — Rechtstexte und die
  // Kollektion kommen erst mit der Antwort des Servers.
  await page.waitForTimeout(1600)
  const text = await page.locator('body').innerText()
  const stelle = text.split('\n').find(z => STRICH.test(z))
  p(`${name} kommt ohne Gedankenstrich aus`, !stelle && text.length > 200,
    stelle ? `„${stelle.trim().slice(0, 90)}"` : `${text.length} Zeichen`)
}

abschnitt('2. Eine Modellseite, mit ihrer Beschreibung')

// Die Modellbeschreibungen liegen in der Datenbank und trugen dort die
// meisten Striche. Sie sind der eigentliche Grund für diese Prüfung.
await page.goto(`${BASIS}/collection`, { waitUntil: 'domcontentloaded' })
await page.locator('div.grid > div.group').first().waitFor({ timeout: 25000 })
await page.locator('div.grid > div.group').first().click()
await page.waitForTimeout(2200)
const modell = await page.locator('body').innerText()
const treffer = modell.split('\n').find(z => STRICH.test(z))
p('Die Modellseite kommt ohne Gedankenstrich aus', !treffer && modell.length > 200,
  treffer ? `„${treffer.trim().slice(0, 90)}"` : `${modell.length} Zeichen`)
p('Und sie zeigt wirklich eine Beschreibung', modell.length > 800, `${modell.length} Zeichen`)

console.log(`\n── Ergebnis ${'─'.repeat(46)}\n`)
console.log(`  ${ok} bestanden, ${fehler.length} fehlgeschlagen`)
await br.close()
if (fehler.length) { console.log('\n  ' + fehler.join('\n  ')); process.exit(1) }
