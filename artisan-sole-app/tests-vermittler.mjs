/**
 * tests-vermittler.mjs — was ein Besucher sieht, der über eine Empfehlung kommt.
 *
 * Der Streifen über der Navigation und die durchgestrichenen Preise sind
 * nichts, was ein Build prüfen könnte: Beides hängt an einem Zustand, der
 * erst entsteht, wenn ein gültiger Code aus der Adresse gelesen und beim
 * Server bestätigt wurde. Nur im Browser ist das zu sehen.
 *
 *   BASIS=https://127.0.0.1:5190 CODE=schuhhaus node tests-vermittler.mjs
 */
import { chromium } from 'playwright'

const BASIS = process.env.BASIS || 'https://127.0.0.1:5190'
const CODE = process.env.CODE || 'schuhhaus'
let ok = 0
const fehler = []
const p = (was, bed, zus = '') => {
  if (bed) { ok++; console.log(`  OK     ${was}${zus ? ' — ' + zus : ''}`) }
  else { fehler.push(was); console.log(`  FEHLER ${was}${zus ? ' — ' + zus : ''}`) }
}
const abschnitt = t => console.log(`\n── ${t} ${'─'.repeat(Math.max(0, 54 - t.length))}`)

const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const c = await br.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 1000 } })
const page = await c.newPage()
const konsole = []
page.on('pageerror', e => konsole.push(String(e)))
page.on('console', m => { if (m.type() === 'error') konsole.push(m.text()) })
const schlimm = () => konsole.filter(t => /is not a function|Cannot read|undefined is not|is not defined|Minified React error/.test(t))

abschnitt('1. Ohne Empfehlung')
await page.goto(`${BASIS}/collection`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
p('Kein Streifen ohne Code', (await page.locator('text=Sie sind über').count()) === 0)
const preiseVorher = await page.locator('.line-through').count()

abschnitt('2. Mit Empfehlung')
konsole.length = 0
await page.goto(`${BASIS}/collection?ref=${CODE}`, { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
const text = await page.locator('body').innerText()
p('Der Streifen steht da', /Sie sind über/i.test(text), text.split('\n').find(z => /Sie sind über/i.test(z))?.slice(0, 90))
p('Er nennt den Vermittler', /Schuhhaus Müller/.test(text))
p('Er nennt den Betrag, nicht nur den Satz', /bis zu/.test(text) && /€/.test(text))

// Steht er wirklich ÜBER der Navigation?
const reihenfolge = await page.evaluate(() => {
  const streifen = [...document.querySelectorAll('div')].find(d => d.textContent?.startsWith('Sie sind über'))
  // Nur was gezeichnet wird: Das <title> im Kopf trägt denselben Text und
  // hätte sonst als Vergleichspunkt gedient — es liegt bei 0 und macht jede
  // Aussage über „darüber" wertlos.
  const marke = [...document.querySelectorAll('header *, nav *, span')]
    .find(e => e.textContent?.trim() === 'ARTISAN SOLE' && e.children.length === 0
               && e.getBoundingClientRect().height > 0)
  if (!streifen || !marke) return null
  return streifen.getBoundingClientRect().top < marke.getBoundingClientRect().top
})
p('Er steht über der Navigation', reihenfolge === true, String(reihenfolge))

const durchgestrichen = await page.locator('.line-through').count()
p('Preise sind durchgestrichen', durchgestrichen > preiseVorher, `${preiseVorher} → ${durchgestrichen}`)

// Alter und neuer Preis in derselben Zeile, alter zuerst.
const paare = await page.evaluate(() => {
  const raus = []
  for (const el of document.querySelectorAll('.line-through')) {
    const zeile = el.parentElement?.innerText?.replace(/\s+/g, ' ').trim()
    if (zeile && /€/.test(zeile)) raus.push(zeile)
  }
  return raus.slice(0, 3)
})
console.log('  Preiszeilen:', JSON.stringify(paare))
p('Alter und neuer Preis nebeneinander', paare.length > 0 && paare.every(z => (z.match(/€/g) || []).length >= 2))
p('Der neue Preis ist niedriger', paare.length > 0 && paare.every(z => {
  const zahlen = [...z.matchAll(/€\s*([\d.]+)/g)].map(m => Number(m[1].replace(/\./g, '')))
  return zahlen.length >= 2 && zahlen[1] < zahlen[0]
}), paare[0])
p('Ohne Laufzeitfehler', schlimm().length === 0, schlimm()[0]?.slice(0, 100) || '')

abschnitt('3. Auf der Modellseite')
konsole.length = 0
const ersteKachel = page.locator('.group.cursor-pointer').first()
await ersteKachel.click().catch(() => {})
await page.waitForTimeout(2500)
const kText = await page.locator('body').innerText()
p('Streifen bleibt beim Seitenwechsel', /Sie sind über/i.test(kText))
p('Auch hier ein durchgestrichener Preis', await page.locator('.line-through').count() > 0)
p('Ohne Laufzeitfehler', schlimm().length === 0, schlimm()[0]?.slice(0, 100) || '')

abschnitt('4. Der Streifen lässt sich entfernen')
await page.goto(`${BASIS}/collection`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
const schliessen = page.locator('button[title="Empfehlung entfernen"]')
p('Ein Knopf zum Entfernen ist da', await schliessen.count() > 0)
if (await schliessen.count()) {
  await schliessen.click()
  await page.waitForTimeout(600)
  p('Streifen ist weg', (await page.locator('body').innerText()).includes('Sie sind über') === false)
  p('Und die Preise wieder normal', await page.locator('.line-through').count() === preiseVorher,
    `${await page.locator('.line-through').count()} statt ${preiseVorher}`)
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  p('Er kommt auch nach dem Neuladen nicht zurück', !(await page.locator('body').innerText()).includes('Sie sind über'))
}

abschnitt('5. Ein ungültiger Code ändert nichts')
await page.goto(`${BASIS}/collection?ref=gibtesnicht`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
p('Kein Streifen', !(await page.locator('body').innerText()).includes('Sie sind über'))
p('Keine falschen Preise', await page.locator('.line-through').count() === preiseVorher)

console.log(`\n── Ergebnis ${'─'.repeat(44)}\n`)
console.log(`  ${ok} bestanden, ${fehler.length} fehlgeschlagen`)
await br.close()
if (fehler.length) { console.log('\n  ' + fehler.join('\n  ')); process.exit(1) }
