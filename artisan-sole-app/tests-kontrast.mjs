/**
 * tests-kontrast.mjs — liest der Mensch, was da steht?
 *
 * Die Leiste der Verwaltung war dunkelgrau auf fast schwarz. Am Quelltext
 * ließ sich das nicht beurteilen: `text-white/25` sagt nichts darüber, was
 * am Ende gegen welchen Grund steht — erst der Browser rechnet die
 * Deckkraft gegen den Hintergrund und legt die Ränder darüber.
 *
 * Deshalb wird hier gemessen, was gezeichnet wurde. Maßstab ist WCAG 2.1:
 * 4,5:1 für Text, 3:1 für Bedienelemente, die keine Schrift sind.
 *
 *   BASIS=https://127.0.0.1:5201 node tests-kontrast.mjs
 */
import { chromium } from 'playwright'

const BASIS = process.env.BASIS || 'https://127.0.0.1:5201'
let ok = 0
const fehler = []
const p = (was, bed, zus = '') => {
  if (bed) { ok++; console.log(`  OK     ${was}${zus ? ' — ' + zus : ''}`) }
  else { fehler.push(was); console.log(`  FEHLER ${was}${zus ? ' — ' + zus : ''}`) }
}

const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const c = await br.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 1000 } })
const page = await c.newPage()

await page.goto(`${BASIS}/login`, { waitUntil: 'networkidle' })
const u = page.getByText('Mit Passwort anmelden'); if (await u.count()) await u.first().click()
await page.locator('input[type="email"]').fill('admin@artisansole.com')
await page.locator('input[type="password"]').fill('ArtisanSole@2026!')
await page.locator('button[type="submit"]').click()
await page.waitForTimeout(2500)
await page.goto(`${BASIS}/cms/orders`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)

// Im Browser rechnen: Der Wert, den getComputedStyle liefert, ist bereits
// die zusammengesetzte Farbe — Deckkraft und Hintergrund sind darin verrechnet.
const messwerte = await page.evaluate(() => {
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
  const L = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  // Jede CSS-Farbe vom Browser auflösen lassen, statt sie zu zerlegen.
  //
  // getComputedStyle gibt in Tailwind 4 `oklab(0.99 … / 0.55)` zurück. Ein
  // Regex über die Zahlen darin liest 0.99 als Rotwert — und jede Messung
  // wird zu Unsinn, ohne dass es auffällt. Die Leinwand kennt dagegen jede
  // Schreibweise, die der Browser kennt, und gibt Byte für Byte heraus, was
  // tatsächlich gemalt würde.
  const leinwand = document.createElement('canvas')
  leinwand.width = leinwand.height = 1
  const stift = leinwand.getContext('2d', { willReadFrequently: true })
  const zahlen = (farbe) => {
    stift.clearRect(0, 0, 1, 1)
    stift.fillStyle = '#000'
    stift.fillStyle = farbe            // ungültige Angabe lässt Schwarz stehen
    stift.fillRect(0, 0, 1, 1)
    const [r, g, b, a] = stift.getImageData(0, 0, 1, 1).data
    return [r, g, b, Math.round((a / 255) * 1000) / 1000]
  }
  /** Vordergrund mit Deckkraft über den Grund legen. */
  const legen = ([r, g, b, a], grund) =>
    a >= 1 ? [r, g, b] : [r, g, b].map((v, i) => Math.round(grund[i] + (v - grund[i]) * a))
  const kontrast = (a, b) => {
    const [x, y] = [L(a), L(b)].sort((m, n) => n - m)
    return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100
  }
  // Der tatsächliche Grund hinter einem Element: den ersten Vorfahren
  // suchen, der selbst deckend malt.
  const grundVon = (el) => {
    // Halbdurchsichtige Flächen liegen übereinander — jede wird auf den
    // Grund darunter gelegt, bis eine deckend malt. Der aktive Eintrag hat
    // genau so eine Fläche, und ohne diesen Schritt käme die Leiste darunter
    // als Grund heraus statt der aufgehellten Zeile.
    const schichten = []
    let n = el
    while (n && n !== document.documentElement) {
      const f = zahlen(getComputedStyle(n).backgroundColor)
      if (f[3] > 0) schichten.push(f)
      if (f[3] >= 1) break
      n = n.parentElement
    }
    let grund = [255, 255, 255]
    for (const f of schichten.reverse()) grund = legen(f, grund)
    return grund
  }
  const messen = (el, name) => {
    // Der Grund, auf dem dieses Element wirklich sitzt — beim aktiven
    // Eintrag ist das seine eigene aufgehellte Zeile, nicht die Leiste.
    const grund = grundVon(el)
    const vorne = legen(zahlen(getComputedStyle(el).color), grund)
    return {
      name, kontrast: kontrast(vorne, grund),
      groesse: parseFloat(getComputedStyle(el).fontSize),
      farbe: '#' + vorne.map(v => v.toString(16).padStart(2, '0')).join(''),
      grund: '#' + grund.map(v => v.toString(16).padStart(2, '0')).join(''),
    }
  }

  const raus = []
  const nav = document.querySelector('aside nav')
  const links = [...nav.querySelectorAll('a')]
  // Über aria-current, nicht über eine Klasse: NavLink setzt das Merkmal von
  // sich aus, und es überlebt jeden Farbwechsel. Die vorherige Fassung suchte
  // `border-white` — beim Umstellen auf helle Leiste fand sie nichts mehr und
  // meldete den fehlenden Balken statt der fehlenden Suche.
  const aktiv = links.find(a => a.getAttribute('aria-current') === 'page')
  const ruhend = links.find(a => a !== aktiv && a.offsetParent !== null)
  if (ruhend) raus.push(messen(ruhend, 'Eintrag, nicht aktiv'))
  if (aktiv) raus.push(messen(aktiv, 'Eintrag, aktiv'))
  const kopf = nav.querySelector('button')
  if (kopf) raus.push(messen(kopf, 'Gruppenüberschrift'))

  const fuss = document.querySelector('aside > div:last-child')
  const pS = [...fuss.querySelectorAll('p')]
  if (pS[0]) raus.push(messen(pS[0], 'Name im Fuß'))
  if (pS[1]) raus.push(messen(pS[1], 'Rolle im Fuß'))
  const knopf = fuss.querySelector('button')
  if (knopf) raus.push(messen(knopf, 'Abmelden / App ansehen'))

  const marke = document.querySelector('aside p.font-brand')
  if (marke?.nextElementSibling) raus.push(messen(marke.nextElementSibling, '„Content Studio"'))

  // Der Balken links am aktiven Eintrag ist kein Text, sondern eine Marke:
  // dafür verlangt WCAG 3:1.
  let balken = null
  if (aktiv) {
    const unten = grundVon(aktiv.parentElement)
    balken = kontrast(legen(zahlen(getComputedStyle(aktiv).borderLeftColor), unten), unten)
  }
  return { raus, balken }
})

console.log('\n── Gemessen im Browser ───────────────────────────────────────\n')
console.log(`  ${'Element'.padEnd(28)} ${'Größe'.padStart(6)} ${'Farbe'.padStart(8)} ${'auf'.padStart(8)} ${'Kontrast'.padStart(9)}`)
console.log('  ' + '─'.repeat(66))
for (const m of messwerte.raus) {
  console.log(`  ${m.name.padEnd(28)} ${(m.groesse + 'px').padStart(6)} ${m.farbe.padStart(8)} ${m.grund.padStart(8)} ${(m.kontrast + ':1').padStart(9)}`)
}
console.log()

for (const m of messwerte.raus) p(`${m.name} erreicht 4,5:1`, m.kontrast >= 4.5, `${m.kontrast}:1`)
p('Der Balken am aktiven Eintrag erreicht 3:1', messwerte.balken >= 3, `${messwerte.balken}:1`)

// Überfahren muss heller sein als Ruhe — sonst ist der Zustand nicht zu sehen.
const alsPixel = (el) => {
  const c = document.createElement('canvas'); c.width = c.height = 1
  const x = c.getContext('2d'); x.fillStyle = getComputedStyle(el).color; x.fillRect(0, 0, 1, 1)
  return [...x.getImageData(0, 0, 1, 1).data].join(',')
}
const ruhendFarbe = await page.locator('aside nav a:not([aria-current])').first().evaluate(alsPixel)
await page.locator('aside nav a:not([aria-current])').first().hover()
await page.waitForTimeout(300)
const hoverFarbe = await page.locator('aside nav a:not([aria-current])').first().evaluate(alsPixel)
p('Überfahren wird sichtbar heller', ruhendFarbe !== hoverFarbe, `${ruhendFarbe} → ${hoverFarbe}`)

console.log(`\n── Ergebnis ${'─'.repeat(44)}\n`)
console.log(`  ${ok} bestanden, ${fehler.length} fehlgeschlagen`)
await br.close()
if (fehler.length) { console.log('\n  ' + fehler.join('\n  ')); process.exit(1) }
