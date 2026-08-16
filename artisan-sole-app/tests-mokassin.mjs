/**
 * tests-mokassin.mjs — der Mokassin-Konfigurator im echten Browser.
 *
 * Die Datenseite ist an anderer Stelle geprüft (tests/mokassin.mjs im
 * Backend): drei Leder, 17/13/7 Farben, sechs Schritte. Was von dort nicht
 * zu sehen ist: ob der Konfigurator die Farbtafel beim Wechsel des Leders
 * wirklich austauscht.
 *
 * Genau daran hing der Fehler, der beim Bauen auffiel: Solange kein Leder
 * gewählt war, galt „jede Farbe passt zu allem" — und die Tafel zeigte
 * zweiundzwanzig Mokassin-Töne auch am Oxford. Ein Zustand, den weder ein
 * Build noch ein API-Abruf sichtbar macht, weil beide keine Reihenfolge
 * kennen.
 *
 *   BASIS=https://localhost:5173 node tests-mokassin.mjs
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

const br = await chromium.launch({
  executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
})
const c = await br.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 1000 } })
const page = await c.newPage()
const konsole = []
page.on('pageerror', e => konsole.push(String(e)))
page.on('console', m => { if (m.type() === 'error') konsole.push(m.text()) })
const schlimm = () => konsole.filter(t =>
  /is not a function|Cannot read|undefined is not|is not defined|Minified React error/.test(t))

/**
 * Die Farbtafel auslesen.
 *
 * Die Felder tragen den Farbnamen als `title` — das ist der einzige Ort, an
 * dem er steht, solange das Feld nur ein farbiger Kreis ist. Die Maße im
 * Klassennamen gehören dazu: Auch die Werte der übrigen Schritte tragen
 * einen `title`, und ohne diese Einschränkung zählte die Tafel die
 * Beschreibung der Sohle als Farbe mit.
 */
const FARBFELD = 'button.w-9.h-9.rounded-lg[title]'
const farbtafel = () => page.$$eval(FARBFELD, els => els.map(e => e.getAttribute('title')).filter(Boolean))

// ════════════════════════════════════════════════════════════════════════
abschnitt('1. Der Mokassin steht in der Kollektion')

await page.goto(`${BASIS}/collection`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
const katalog = await page.locator('body').innerText()
p('„Driver" steht im Katalog', /Driver/i.test(katalog))

// ════════════════════════════════════════════════════════════════════════
abschnitt('2. Die Lederwahl')

konsole.length = 0
await page.goto(`${BASIS}/schuhe/driver`, { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
const seite = await page.locator('body').innerText()
p('Die Modellseite lädt', seite.length > 200, `${seite.length} Zeichen`)
p('Ohne Laufzeitfehler', schlimm().length === 0, schlimm()[0]?.slice(0, 110) || '')

for (const leder of ['Calf Suede', 'Nappa', 'Fullgrain']) {
  p(`„${leder}" steht zur Wahl`, seite.includes(leder))
}
// Die Gegenprobe: Was an diesem Schuh nichts zu suchen hat, darf auch nicht
// dastehen. Ein Mokassin aus Lux Calf ist nichts, was die Werkstatt baut.
for (const fremd of ['Lux Calf', 'Box Calf', 'Patina']) {
  p(`Kein „${fremd}" am Mokassin`, !seite.includes(fremd))
}
// Eine Familie: Steht die Wahl „Aesthetic oder Durable" davor, ist ein
// Schritt eingezogen, an dem es nichts zu entscheiden gibt.
p('Keine vorgeschaltete Familienwahl', !/Durable/.test(seite))

// ════════════════════════════════════════════════════════════════════════
abschnitt('3. Die Farbtafel folgt dem Leder')

const zahlen = {}
for (const [leder, soll] of [['Calf Suede', 17], ['Nappa', 13], ['Fullgrain', 7]]) {
  const knopf = page.getByText(leder, { exact: true }).first()
  if (await knopf.count()) { await knopf.click(); await page.waitForTimeout(900) }
  const namen = await farbtafel()
  zahlen[leder] = namen
  p(`${leder}: ${soll} Farben`, namen.length === soll, `${namen.length} — ${namen.join(', ')}`)
}

// Die drei Tafeln müssen sich unterscheiden — täten sie es nicht, griffe der
// Filter nicht, und die Zahl stimmte nur zufällig.
p('Nappa zeigt „Honey", Calf Suede nicht',
  (zahlen['Nappa'] || []).includes('Honey') && !(zahlen['Calf Suede'] || []).includes('Honey'))
p('Calf Suede zeigt „Turquoise", Fullgrain nicht',
  (zahlen['Calf Suede'] || []).includes('Turquoise') && !(zahlen['Fullgrain'] || []).includes('Turquoise'))
// Die Dress-Linie hängt an eigenen Farbzeilen. Geprüft wird über die Töne,
// die es NUR dort gibt: „Black" und „Dark Brown" heißen an beiden Linien
// gleich (sie meinen dasselbe) und taugen deshalb nicht zur Unterscheidung.
p('Keine Luxe-Calf-Töne in der Mokassin-Tafel',
  !Object.values(zahlen).flat().some(n => /^(Schwarz|Cognac|Oxblood|Forest|Light Brown)$/.test(n)),
  Object.values(zahlen).flat().filter(n => /^(Schwarz|Cognac|Oxblood|Forest|Light Brown)$/.test(n)).join(', ') || 'keiner')

// ════════════════════════════════════════════════════════════════════════
abschnitt('4. Die eigenen Schritte')

// Erst mit gewähltem Leder und gewählter Farbe geben die weiteren Schritte
// den Blick frei — vorher wäre die Frage nach der Nahtfarbe verfrüht.
const ersteFarbe = page.locator(FARBFELD).first()
if (await ersteFarbe.count()) { await ersteFarbe.click(); await page.waitForTimeout(900) }
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
await page.waitForTimeout(1200)
const unten = await page.locator('body').innerText()

for (const schritt of ['Vorderteil', 'Nahtfarbe', 'Weichfutter', 'Kragen']) {
  p(`Schritt „${schritt}" ist da`, unten.includes(schritt))
}
for (const nicht of ['Welt', 'Absatz', 'Zehenkappe', 'Buckle']) {
  p(`Kein Schritt „${nicht}"`, !new RegExp(`\\b${nicht}\\b`).test(unten))
}
p('Immer noch ohne Laufzeitfehler', schlimm().length === 0, schlimm()[0]?.slice(0, 110) || '')

// ════════════════════════════════════════════════════════════════════════
abschnitt('5. Die anderen Modelle bleiben unberührt')

konsole.length = 0
// Direkt über die Adresse statt über einen Klick in der Kachel: Über dem
// Kachelbild liegt eine Fläche, die den Klick abfängt — für die Prüfung ein
// Zeitverlust ohne Erkenntnis, denn dass die Kachel verlinkt, steht
// anderswo.
await page.goto(`${BASIS}/schuhe/oxford`, { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
const dress = await page.locator('body').innerText()
p('Ein Dress-Modell öffnet sich', dress.length > 200, `${dress.length} Zeichen`)
for (const fremd of ['Calf Suede', 'Nappa', 'Fullgrain']) {
  p(`Kein „${fremd}" am Dress-Modell`, !dress.includes(fremd))
}
const dressFarben = await farbtafel()
p('Keine Mokassin-Farbe in der Dress-Tafel',
  !dressFarben.some(n => ['Turquoise', 'Honey', 'Nude', 'Light Green'].includes(n)),
  dressFarben.join(', ') || 'keine Tafel sichtbar')
p('Ohne Laufzeitfehler', schlimm().length === 0, schlimm()[0]?.slice(0, 110) || '')

// ════════════════════════════════════════════════════════════════════════
abschnitt('6. Der Sport-Mokassin und sein Metall')

/*
 * Am „Moc Flex Sport" sitzt auf dem Spann entweder ein Metallbügel oder
 * eben keiner. Der Schritt nach dem Metallton darf deshalb nicht immer
 * dastehen — sonst wählt der Kunde Nickel zu einem Paar Quasten, und in der
 * Bestellung steht eine Angabe zu einem Teil, das der Schuh nicht hat.
 *
 * Die Regel selbst ist als reine Funktion geprüft (tests/sohlenregel.mjs).
 * Hier geht es um die Verdrahtung: dass der Konfigurator die gewählte
 * Ausführung überhaupt an sie weiterreicht. Beides sieht aus der Ferne
 * gleich aus, und nur eines davon merkt der Kunde.
 */
konsole.length = 0
await page.goto(`${BASIS}/schuhe/moc-flex-sport`, { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
const sportSeite = await page.locator('body').innerText()
p('Die Seite lädt', sportSeite.length > 200, `${sportSeite.length} Zeichen`)
p('Ungefüttertes Wildleder', sportSeite.includes('Unlined Suede'))
p('Kein Dress-Leder', !sportSeite.includes('Lux Calf') && !sportSeite.includes('Box Calf'))
p('Ohne Laufzeitfehler', schlimm().length === 0, schlimm()[0]?.slice(0, 110) || '')

// Neun Farben, wie im Back Office.
const swatch = page.locator(FARBFELD).first()
if (await swatch.count()) { await swatch.click({ force: true }); await page.waitForTimeout(900) }
const sportFarben = await farbtafel()
p('Neun Wildlederfarben', sportFarben.length === 9, `${sportFarben.length} — ${sportFarben.join(', ')}`)

const zeigtMetall = async () => /schnallen-farbe/i.test(await page.locator('body').innerText())
const waehle = async (txt) => {
  const el = page.getByText(txt, { exact: true }).first()
  if (await el.count()) await el.click({ force: true }).catch(() => {})
  await page.waitForTimeout(900)
}

await waehle('Metal Bit')
p('Mit Metallbügel steht der Metallton zur Wahl', await zeigtMetall())
await waehle('Tassels')
p('Bei Quasten verschwindet er', !(await zeigtMetall()))
await waehle('Albert Mask')
p('Bei der Maske ebenso', !(await zeigtMetall()))
await waehle('Bare')
p('Ohne Aufsatz ebenso', !(await zeigtMetall()))
await waehle('Metal Bit')
p('Und er kommt zurück', await zeigtMetall())
p('Immer noch ohne Laufzeitfehler', schlimm().length === 0, schlimm()[0]?.slice(0, 110) || '')

// ════════════════════════════════════════════════════════════════════════
abschnitt('7. Der Boot')

/*
 * Die Farbtafel des Boots ist die Probe aufs Exempel für die eigene
 * Lederzeile: Beim Hersteller heißt sein Leder „Lux Suede" wie unser
 * Dress-Velours, hingen beide an derselben Zeile, stünden hier die
 * Dress-Töne („Cognac", „Oxblood") statt der neun Mokassin-Farben.
 */
konsole.length = 0
await page.goto(`${BASIS}/schuhe/moc-flex-sport-boot`, { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
const bootSeite = await page.locator('body').innerText()
p('Die Seite lädt', bootSeite.length > 200, `${bootSeite.length} Zeichen`)
p('Gefüttertes Wildleder', bootSeite.includes('Lined Suede'))
p('Ohne Laufzeitfehler', schlimm().length === 0, schlimm()[0]?.slice(0, 110) || '')

const bootSwatch = page.locator(FARBFELD).first()
if (await bootSwatch.count()) { await bootSwatch.click({ force: true }); await page.waitForTimeout(900) }
const bootFarben = await farbtafel()
p('Neun Wildlederfarben', bootFarben.length === 9, `${bootFarben.length} — ${bootFarben.join(', ')}`)
p('Keine Dress-Töne darunter',
  !bootFarben.some(n => /^(Schwarz|Cognac|Oxblood|Forest|Light Brown)$/.test(n)),
  bootFarben.filter(n => /^(Schwarz|Cognac|Oxblood|Forest|Light Brown)$/.test(n)).join(', ') || 'keiner')

await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
await page.waitForTimeout(1200)
const bootUnten = await page.locator('body').innerText()
// Ohne Rücksicht auf die Schreibweise: Die Beschriftungen werden per
// Stylesheet in Versalien gesetzt, und `innerText` gibt zurück, was zu SEHEN
// ist — „FERSENRIEMEN", nicht „Fersenriemen".
const zeigt = (was) => bootUnten.toLowerCase().includes(was.toLowerCase())
for (const schritt of ['Fersenriemen', 'Nahtfarbe']) {
  p(`Schritt „${schritt}" ist da`, zeigt(schritt))
}
// Ein Boot trägt auf dem Spann nichts — und damit auch keinen Metallton.
p('Kein Aufsatz, kein Metall', !zeigt('Accessoires') && !zeigt('Schnallen-Farbe'))
p('Immer noch ohne Laufzeitfehler', schlimm().length === 0, schlimm()[0]?.slice(0, 110) || '')

// ════════════════════════════════════════════════════════════════════════
console.log(`\n── Ergebnis ${'─'.repeat(46)}\n`)
console.log(`  ${ok} bestanden, ${fehler.length} fehlgeschlagen`)
await br.close()
if (fehler.length) { console.log('\n  ' + fehler.join('\n  ')); process.exit(1) }
