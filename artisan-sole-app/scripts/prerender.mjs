/**
 * prerender.mjs — aus der leeren Hülle werden fertige Seiten.
 *
 * ── Das Problem ──────────────────────────────────────────────────────────
 *
 * `dist/index.html` enthält ein leeres `<div id="root">` und ein Skript.
 * Alles, was ein Besucher sieht, entsteht erst im Browser. Google führt das
 * Skript aus, aber verzögert und nicht zuverlässig; jeder andere Abnehmer —
 * die Linkvorschau eines Messengers, Bing, eine KI-Suche — sieht gar nichts.
 * Eine Modellseite mit einer sorgfältig geschriebenen Beschreibung ist für
 * sie ein leeres Dokument.
 *
 * ── Der Weg ──────────────────────────────────────────────────────────────
 *
 * Nach dem Bauen wird `dist/` von einem kleinen Server ausgeliefert, jede
 * öffentliche Adresse einmal mit einem Browser geöffnet, gewartet, bis der
 * Inhalt steht, und das Ergebnis als `dist/<pfad>/index.html` abgelegt.
 * Der Webserver liefert künftig diese Datei aus, wenn es sie gibt, und
 * fällt sonst auf `index.html` zurück — die Anwendung übernimmt danach wie
 * bisher.
 *
 * ── Warum ein eigenes Skript und kein Plugin im Bauprozess ───────────────
 *
 * Weil es NICHTS ändert. Der Bau läuft wie zuvor; dieses Skript legt
 * hinterher Dateien daneben. Schlägt es fehl, ist `dist/` trotzdem
 * vollständig und ausliefertbar — die Seite verliert ihre Vorrenderung,
 * aber niemand steht vor einem kaputten Laden. Ein Plugin, das sich in den
 * Bau hängt, hätte diese Eigenschaft nicht.
 *
 * ── Was es braucht ───────────────────────────────────────────────────────
 *
 * Einen erreichbaren Backend-Server: Die Liste der Modelle kommt aus dem
 * Katalog, und die Seiten holen ihre Inhalte von dort. Ist er nicht da,
 * werden nur die festen Seiten vorgerendert und das Skript sagt es
 * ausdrücklich — eine halbe Vorrenderung ist besser als keine, aber sie
 * darf nicht unbemerkt bleiben.
 *
 *   node scripts/prerender.mjs
 *   API=http://127.0.0.1:3099 node scripts/prerender.mjs
 *
 * ── Was noch fehlt ───────────────────────────────────────────────────────
 *
 * Der kleine Server hier liefert nur Dateien aus `dist/` aus. Er reicht
 * KEINE `/api`-Anfragen an das Backend weiter. Seiten, die ihren Inhalt
 * vollständig von dort holen — die drei Rechtstexte und die Hilfe —, werden
 * deshalb leer vorgerendert; das Skript meldet sie als „auffällig leer".
 *
 * Die Modellseiten sind davon nicht betroffen: Sie tragen Name,
 * Beschreibung und Preis aus dem Zustand, den die Anwendung beim Laden
 * aufbaut, und stehen mit rund tausend Zeichen im HTML. Sie sind auch die,
 * auf die es ankommt.
 *
 * Der nächste Schritt ist deshalb ein Weiterreichen von `/api` in diesem
 * Server. Bis dahin gilt: Was hier als leer gemeldet wird, ist im Laden
 * trotzdem in Ordnung — es wird nur nicht vorgerendert.
 */
import fs from 'fs'
import path from 'path'
import http from 'http'
import { chromium } from 'playwright'

const WURZEL = path.resolve(new URL('..', import.meta.url).pathname)
const DIST = path.join(WURZEL, 'dist')
const API = process.env.API || 'http://127.0.0.1:3099'
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'

// Feste Adressen. Dieselbe Liste wie in der `sitemap.xml` des Servers, und
// aus demselben Grund: Was eine Suchmaschine besuchen soll, soll sie auch
// fertig vorfinden.
const FESTE = ['/', '/collection', '/accessories', '/help',
               '/legal/agb', '/legal/datenschutz', '/legal/impressum']

// Wie lange nach dem Laden gewartet wird, bevor die Seite abgegriffen wird.
// Nicht `networkidle`: Der Laden holt im Hintergrund Bilder nach, und darauf
// zu warten hieße, auf etwas zu warten, das für den Text ohne Belang ist.
const RUHE_MS = Number(process.env.RUHE_MS || 2500)

const TYPEN = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript',
                '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json',
                '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' }

/**
 * Ein Server für `dist/`, der sich verhält wie der spätere Webserver:
 * Gibt es die Datei, wird sie ausgeliefert; sonst `index.html`.
 *
 * Ohne diesen Rückfall bekäme jede Adresse außer `/` eine 404 — und wir
 * würden achtundvierzig Fehlerseiten vorrendern statt achtundvierzig
 * Modellen.
 */
function starteServer(port) {
  return new Promise(fertig => {
    const server = http.createServer((req, res) => {
      const pfad = decodeURIComponent(req.url.split('?')[0])
      let datei = path.join(DIST, pfad)
      if (!fs.existsSync(datei) || fs.statSync(datei).isDirectory()) {
        datei = path.join(DIST, 'index.html')
      }
      res.writeHead(200, { 'Content-Type': TYPEN[path.extname(datei)] || 'application/octet-stream' })
      fs.createReadStream(datei).pipe(res)
    })
    server.listen(port, '127.0.0.1', () => fertig(server))
  })
}

async function modellAdressen() {
  try {
    const r = await fetch(`${API}/api/shoes`)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const schuhe = await r.json()
    const mit = schuhe.filter(s => s.slug)
    if (mit.length < schuhe.length) {
      console.warn(`⚠️  ${schuhe.length - mit.length} Modell(e) ohne Slug, sie werden nicht vorgerendert.`)
    }
    return mit.map(s => `/schuhe/${s.slug}`)
  } catch (e) {
    console.warn(`⚠️  Katalog nicht erreichbar (${API}): ${e.message}`)
    console.warn('    Nur die festen Seiten werden vorgerendert. Für die Modellseiten')
    console.warn('    muss das Backend beim Bauen laufen.')
    return []
  }
}

/** Wohin die fertige Seite geschrieben wird: `/collection` → `dist/collection/index.html`. */
const zielDatei = (route) =>
  route === '/' ? path.join(DIST, 'index.html')
                : path.join(DIST, route.replace(/^\//, ''), 'index.html')

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('✖  dist/index.html fehlt. Erst `npx vite build`, dann dieses Skript.')
  process.exit(1)
}

const port = Number(process.env.PORT || 4173)
const server = await starteServer(port)
const routen = [...FESTE, ...(await modellAdressen())]

const browser = await chromium.launch({ executablePath: CHROMIUM })
const kontext = await browser.newContext()
let fertig = 0, leer = 0
const fehler = []

for (const route of routen) {
  const seite = await kontext.newPage()
  try {
    await seite.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await seite.waitForTimeout(RUHE_MS)

    // Die Probe, ob es sich gelohnt hat. Eine Seite, auf der nichts steht,
    // ist keine vorgerenderte Seite — sie zu speichern hieße, die leere
    // Hülle mit mehr Schritten zu erzeugen.
    const text = await seite.locator('body').innerText()
    if (text.trim().length < 200) { leer++; fehler.push(`${route} (nur ${text.trim().length} Zeichen)`) }

    const html = await seite.content()
    const ziel = zielDatei(route)
    fs.mkdirSync(path.dirname(ziel), { recursive: true })
    fs.writeFileSync(ziel, html)
    fertig++
  } catch (e) {
    fehler.push(`${route}: ${e.message.split('\n')[0]}`)
  } finally {
    await seite.close()
  }
}

await browser.close()
server.close()

console.log(`\n✅ Vorgerendert: ${fertig} von ${routen.length} Seiten`)
if (leer) console.warn(`⚠️  Davon ${leer} auffällig leer.`)
if (fehler.length) {
  console.warn('   ' + fehler.slice(0, 6).join('\n   '))
  if (fehler.length > 6) console.warn(`   … und ${fehler.length - 6} weitere`)
}
// Kein `exit 1` bei einzelnen Ausfällen: `dist/` ist auch dann vollständig
// und ausliefertbar. Wer das Skript in eine Kette hängt, soll sie nicht
// wegen einer Seite abbrechen — aber die Warnung soll er sehen.
