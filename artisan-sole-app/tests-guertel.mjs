/**
 * tests-guertel.mjs — der Gürtel im Browser, an beiden Stellen.
 *
 * ── Warum das nicht die API-Prüfung mit erledigt ─────────────────────────
 *
 * Die Regeln stehen am Server und sind dort geprüft. Was von dort nicht zu
 * sehen ist, ist die Reihenfolge — und der Gürtel besteht aus Reihenfolge:
 *
 *   • Im Konfigurator soll die Frage aus einem Ja oder Nein bestehen, weil
 *     Leder und Farbe schon feststehen. Zeigt die Maske sie trotzdem zur
 *     Wahl, ist die Übernahme kaputt, ohne dass eine Anfrage fehlschlägt.
 *   • Beim Double Monk soll der Metallton übernommen werden, beim Oxford
 *     gefragt. Das hängt an einem einzigen Feld, und beide Fälle sehen aus
 *     der Ferne gleich aus.
 *   • Auf der Zubehörseite darf der Knopf nicht „In den Warenkorb" heißen:
 *     Es gibt keinen Gürtel, den man ohne Angaben legen könnte.
 *
 *   BASIS=https://localhost:5173 node tests-guertel.mjs
 */
import { chromium } from 'playwright'

const BASIS = process.env.BASIS || 'https://localhost:5173'
const API = process.env.API || 'http://localhost:3099'
let ok = 0
const fehler = []
const p = (was, bed, zus = '') => {
  if (bed) { ok++; console.log(`  OK     ${was}${zus ? ' — ' + zus : ''}`) }
  else { fehler.push(was); console.log(`  FEHLER ${was}${zus ? ' — ' + zus : ''}`) }
}
const abschnitt = t => console.log(`\n── ${t} ${'─'.repeat(Math.max(0, 54 - t.length))}`)

/**
 * Steht das auf der Seite?
 *
 * Ohne Rücksicht auf Groß- und Kleinschreibung: Die Beschriftungen der
 * Schritte werden per Stylesheet in Versalien gesetzt, und `innerText` gibt
 * zurück, was zu SEHEN ist — „PASSENDER GÜRTEL", nicht „Passender Gürtel".
 * Eine Prüfung auf die Schreibweise im Quelltext schlägt hier immer fehl und
 * sagt nichts über die Seite aus.
 *
 * Dasselbe gilt für das Eszett: Aus „Schließe" wird in Versalien „SCHLIESSE",
 * und ein Vergleich ohne Rücksicht darauf findet es nie.
 */
const flach = (t) => String(t).toLowerCase().replace(/ß/g, 'ss')
const hat = (text, was) => flach(text).includes(flach(was))

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

/** Ein Modell einer Kategorie finden, ohne durch den Katalog zu klicken. */
async function slugFuer(kategorie) {
  const res = await fetch(`${API}/api/shoes`, { headers: { 'X-Requested-With': 'ArtisanSole' } })
  const alle = await res.json()
  const treffer = (alle || []).find(s => s.category === kategorie && s.collection !== 'express')
  return treffer?.slug || null
}

/**
 * Bis zum Gürtelschritt durchklicken.
 *
 * `zusatz` sind Beschriftungen, die unterwegs noch angeklickt werden sollen
 * — etwa der Metallton am Double Monk. Ohne ihn steht am Schuh keine
 * Schnallenfarbe, und dann gibt es auch nichts zu übernehmen: Der Fall, den
 * Abschnitt 3 prüft, träte gar nicht erst ein.
 */
async function bisZumGuertel(zusatz = []) {
  // Vor der Lederwahl steht bei Modellen mit beiden Familien noch ein
  // Schritt: „Aesthetic oder Durable". Wer ihn überspringt, klickt gleich
  // darauf die Familienkarte statt der Lederkarte — sie enthält die
  // Lederbezeichnungen in ihrer Beschreibung — und wundert sich, warum die
  // Farbtafel gesperrt bleibt.
  //
  // `force`, weil die Schritte gestaffelt eingeblendet werden und ein noch
  // halbdurchsichtiger Nachbar den Klick abfängt. Geprüft wird hier die
  // Verdrahtung, nicht die Trefferfläche — die steht in der Kontrastprüfung.
  const familie = page.getByRole('button', { name: /^aesthetic/i }).first()
  if (await familie.count()) { await familie.click({ force: true }); await page.waitForTimeout(700) }

  const leder = page.getByRole('button', { name: /^lux calf/i }).first()
  if (await leder.count()) { await leder.click({ force: true }); await page.waitForTimeout(700) }
  const farbe = page.locator('button.w-9.h-9.rounded-lg[title]').first()
  if (await farbe.count()) { await farbe.click({ force: true }); await page.waitForTimeout(900) }

  // Die Optionsgruppen gehen der Reihe nach auf: Jede ist gesperrt, bis die
  // davor beantwortet ist. Ein Zusatzschritt, der weiter hinten liegt — die
  // Schnallenfarbe am Double Monk zum Beispiel —, ist also nicht erreichbar,
  // solange die vorderen offen sind. Deshalb wird durchgeklickt, bis er da
  // ist, und nicht bis der Gürtel erscheint.
  // Die Optionsgruppen gehen der Reihe nach auf: Jede ist gesperrt, bis die
  // davor beantwortet ist. Ein Zusatzschritt, der weiter hinten liegt — die
  // Schnallenfarbe am Double Monk zum Beispiel —, ist also nicht erreichbar,
  // solange die vorderen offen sind.
  //
  // Deshalb wird jede Runde in JEDER offenen Gruppe der erste Wert
  // angeklickt. Einen bereits gewählten noch einmal anzuklicken ändert
  // nichts; mit jeder Runde geht dafür eine Gruppe weiter auf.
  if (zusatz.length) {
    for (let runde = 0; runde < 10; runde++) {
      const gruppen = page.locator('div.mb-6[style*="opacity: 1"]')
      const n = await gruppen.count()
      for (let i = 0; i < n; i++) {
        const knopf = gruppen.nth(i).locator('button').first()
        if (await knopf.count()) await knopf.click({ force: true, timeout: 1500 }).catch(() => {})
      }
      await page.waitForTimeout(350)
    }
    for (const name of zusatz) {
      const k = page.getByRole('button', { name }).first()
      if (await k.count()) { await k.click({ force: true }); await page.waitForTimeout(600) }
    }
  }
  return hat(await page.locator('body').innerText(), 'Passender Gürtel')
}

/** Der Text NUR aus dem Gürtelschritt — nicht der der ganzen Seite. */
async function guertelText() {
  return page.evaluate(() => {
    const p = [...document.querySelectorAll('p')].find(e => /passender gürtel/i.test(e.innerText || ''))
    return p?.parentElement?.innerText || ''
  })
}

// ════════════════════════════════════════════════════════════════════════
abschnitt('1. Im Konfigurator, an einem Oxford')

const oxford = await slugFuer('OXFORD')
konsole.length = 0
await page.goto(`${BASIS}/schuhe/${oxford}`, { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
const erreicht = await bisZumGuertel()
p('Der Schritt „Passender Gürtel" erscheint', erreicht)

let text = await page.locator('body').innerText()
p('Beide Preise stehen dabei', /125/.test(text) && /150/.test(text))
p('Die Frage ist ein Ja oder Nein', hat(text, 'Ja, dazu') && hat(text, 'Nein, danke'))
// Solange nicht gefragt wurde, steht auch keine Maske da.
p('Vorher keine Maske', !hat(text, 'Form der Schließe'))

await page.getByText('Ja, dazu').first().click({ force: true })
await page.waitForTimeout(1400)
text = await page.locator('body').innerText()
p('Nach „Ja" kommt die Maske', hat(text, 'Form der Schließe'))
// Der Kern der Sache: Leder und Farbe werden übernommen, nicht gefragt.
p('Leder und Farbe sind übernommen', hat(text, 'Leder und Farbe') && hat(text, 'wie Ihr Schuh'))
// Die übernommene Angabe heißt „Leder und Farbe"; ein zweiter Schritt hieße
// schlicht „Leder". Steht der da, wurde nichts übernommen.
// Auf der ganzen Seite steht „LEDER WÄHLEN" — das ist der Schritt des
// SCHUHS. Gemeint ist, dass der Gürtel keinen eigenen hat, also wird nur
// sein Block gelesen.
const blockText = await guertelText()
p('Kein zweiter Lederschritt im Gürtelblock',
  !/^leder$/mi.test(blockText.toLowerCase().replace('leder und farbe', '')),
  blockText.split('\n').filter(z => /^leder/i.test(z)).join(' | ') || 'keiner')
// Am Oxford sitzt keine Schnalle — hier MUSS nach dem Metall gefragt werden.
p('Am Oxford wird nach dem Metall gefragt', hat(text, 'Farbe des Metalls'))
p('Die Längen stehen zur Wahl', hat(text, 'Länge') && hat(text, '180'))
p('Ohne Laufzeitfehler', schlimm().length === 0, schlimm()[0]?.slice(0, 110) || '')

abschnitt('2. Die Länge sagt, wofür sie taugt')

await page.getByText('Round Buckle', { exact: true }).first().click({ force: true }).catch(() => {})
await page.waitForTimeout(300)
const metallKnopf = page.locator('button:has-text("Nickel")').first()
if (await metallKnopf.count()) { await metallKnopf.click({ force: true }); await page.waitForTimeout(300) }
await page.getByRole('button', { name: '100', exact: true }).first().click({ force: true }).catch(() => {})
await page.waitForTimeout(600)
text = await page.locator('body').innerText()
// Eine Zahl allein sagt niemandem, ob er richtig liegt.
p('Die Spanne steht neben der Länge', hat(text, 'Sitzt von 94 bis 106 cm'),
  text.split('\n').find(z => /Sitzt von/.test(z)) || '')
p('Der fertige Gürtel steht als Satz da', hat(text, 'Ihr Gürtel'))
p('Der Satz nennt alle fünf Angaben',
  hat(text, 'Round Buckle in Nickel') && hat(text, 'Länge 100 cm') && hat(text, 'passt von 94 bis 106'))

// Die Hilfe steht eingeklappt da und geht auf.
await page.getByText('Welche Länge brauche ich?').first().click({ force: true }).catch(() => {})
await page.waitForTimeout(400)
text = await page.locator('body').innerText()
p('Die Hilfe zur Länge lässt sich öffnen', hat(text, 'mittleren Loch'))

abschnitt('3. Am Double Monk wird das Metall übernommen')

const monk = await slugFuer('DOUBLE_MONK')
konsole.length = 0
await page.goto(`${BASIS}/schuhe/${monk}`, { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
const erreicht2 = await bisZumGuertel([/^graphite/i])
p('Der Schritt erscheint auch hier', erreicht2)
if (erreicht2) {
  await page.getByText('Ja, dazu').first().click({ force: true })
  await page.waitForTimeout(1400)
  text = await page.locator('body').innerText()
  // Das ist der Unterschied zum Oxford, und er hängt an einem einzigen Feld.
  p('Der Metallton kommt vom Schuh', /wie die Schnalle Ihres Schuhs/.test(text))
  p('Und wird nicht noch einmal gefragt', !hat(text, 'Farbe des Metalls'))
}
p('Ohne Laufzeitfehler', schlimm().length === 0, schlimm()[0]?.slice(0, 110) || '')

abschnitt('4. Auf der Zubehörseite')

konsole.length = 0
await page.goto(`${BASIS}/accessories`, { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
text = await page.locator('body').innerText()
p('Der Gürtel steht im Zubehör', hat(text, 'Gürtel'))
p('Sein Preis ist der einzelne', hat(text, '150'))
// „In den Warenkorb" wäre hier gelogen — es gibt keinen Gürtel ohne Angaben.
p('Der Knopf heißt „Zusammenstellen"', hat(text, 'Zusammenstellen'))

await page.getByText('Zusammenstellen', { exact: false }).first().click()
await page.waitForTimeout(1200)
text = await page.locator('body').innerText()
p('Das Fenster geht auf', hat(text, 'Form der Schließe') || hat(text, 'Frei zusammenstellen'))
// Ohne Anmeldung gibt es keine eigenen Bestellungen — dann steht die freie
// Zusammenstellung nicht als eine von zwei Möglichkeiten da, sondern als die
// einzige, und zwar ohne dass man erst eine leere Liste wegklickt.
p('Ohne Anmeldung sofort die freie Wahl', hat(text, 'Leder') && hat(text, 'Farbe des Metalls'))
p('Der Knopf bleibt gesperrt, solange etwas fehlt', hat(text, 'Bitte alle Angaben wählen'))
p('Ohne Laufzeitfehler', schlimm().length === 0, schlimm()[0]?.slice(0, 110) || '')

abschnitt('5. Ein Gürtel wandert in den Korb')

// Leder → Farbe → Form → Metall → Länge, in dieser Reihenfolge.
// Das Fenster liegt als Overlay über der Seite. Ohne diese Eingrenzung
// greift jeder Klick den Knopf der Kachel dahinter — der ist zwar sichtbar,
// aber vom Overlay abgedeckt.
const dialog = page.locator('div.fixed.inset-0').last()
await dialog.getByRole('button', { name: /^lux calf/i }).first().click({ force: true }).catch(() => {})
await page.waitForTimeout(500)
const farbknopf = dialog.locator('button.w-9.h-9.rounded-lg[title]').first()
if (await farbknopf.count()) { await farbknopf.click({ force: true }); await page.waitForTimeout(400) }
await page.getByText('Square Buckle', { exact: true }).first().click({ force: true }).catch(() => {})
await page.waitForTimeout(300)
await page.locator('button:has-text("Graphite")').first().click({ force: true }).catch(() => {})
await page.waitForTimeout(300)
await page.getByRole('button', { name: '95', exact: true }).first().click({ force: true }).catch(() => {})
await page.waitForTimeout(600)

text = await page.locator('body').innerText()
p('Jetzt steht der Betrag auf dem Knopf', hat(text, 'In den Warenkorb · € 150'),
  text.split('\n').find(z => /In den Warenkorb/.test(z)) || '')

await dialog.getByText('In den Warenkorb', { exact: false }).first().click({ force: true })
await page.waitForTimeout(1200)
await page.goto(`${BASIS}/checkout`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1800)
text = await page.locator('body').innerText()
// Der Gürtel darf allein reisen — die Sperre für Pflegesets gilt für ihn nicht.
p('Die Kasse lässt ihn allein durch', !hat(text, 'nur zusammen mit einem Paar'))
p('Er steht mit seiner Konfiguration da', hat(text, 'Square Buckle in Graphite') || hat(text, 'Länge 95 cm'),
  text.split('\n').find(z => /Buckle/.test(z)) || '')
p('Ohne Laufzeitfehler', schlimm().length === 0, schlimm()[0]?.slice(0, 110) || '')

// ════════════════════════════════════════════════════════════════════════
console.log(`\n── Ergebnis ${'─'.repeat(46)}\n`)
console.log(`  ${ok} bestanden, ${fehler.length} fehlgeschlagen`)
await br.close()
if (fehler.length) { console.log('\n  ' + fehler.join('\n  ')); process.exit(1) }
