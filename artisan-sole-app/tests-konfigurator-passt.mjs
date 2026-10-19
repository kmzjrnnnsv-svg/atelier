/**
 * tests-konfigurator-passt.mjs — der Konfigurator passt ins Fenster.
 *
 * Auf großen Fenstern (ab 1024 px Breite) soll die Seite nicht scrollen:
 * Bühne, Schritt und die Leiste unten teilen sich die Höhe. Geprüft wird
 * jeder Schritt einzeln, auf iPad (Dokument-Scroll) und Schreibtisch
 * (innerer Scroll-Container), dazu ob das Bild die linke Hälfte randlos
 * füllt und die Leiste unten verschwunden ist.
 * Auf dem Telefon bleibt alles beim Alten: dort darf gescrollt werden.
 *
 *   BASIS=https://localhost:5173 node tests-konfigurator-passt.mjs
 *   BILDER=/pfad node tests-konfigurator-passt.mjs   (Screenshots je Schritt)
 */
import { chromium } from 'playwright'

const BASIS = process.env.BASIS || 'https://localhost:5173'
const BILDER = process.env.BILDER || ''
const SLUG = process.env.SLUG || 'whole-cut'
let ok = 0
const fehler = []
const p = (was, bed, zus = '') => {
  if (bed) { ok++; console.log(`  OK     ${was}${zus ? ' — ' + zus : ''}`) }
  else { fehler.push(was); console.log(`  FEHLER ${was}${zus ? ' — ' + zus : ''}`) }
}

const IPAD = 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
const FAELLE = [
  // iPad Pro 11" quer in Safari mit Tableiste: 1194 breit, ~720 hoch
  { name: 'ipad-safari-quer', w: 1194, h: 720, ua: IPAD },
  { name: 'ipad-klein-quer', w: 1024, h: 640, ua: IPAD },
  { name: 'ipad-quer', w: 1180, h: 820, ua: IPAD },
  { name: 'ipad-pro-quer', w: 1366, h: 1024, ua: IPAD },
  { name: 'desktop-1280', w: 1280, h: 720 },
  { name: 'desktop-1440', w: 1440, h: 900 },
  { name: 'desktop-1920', w: 1920, h: 1080 },
]

const MASSE = { foot_length_mm: 270, ball_girth_mm: 250, source: 'manual' }

/** Wie weit lässt sich scrollen — Dokument und innerer Container. */
const ueberstand = (page) => page.evaluate(() => {
  const doc = document.scrollingElement
  const innen = [...document.querySelectorAll('.overflow-y-auto')]
    .filter(e => e.closest('#konfig-wahl') == null)
    .map(e => e.scrollHeight - e.clientHeight)
  return Math.max(doc.scrollHeight - doc.clientHeight, 0, ...innen)
})

/**
 * Großer Bildschirm: Das Bild füllt die linke Hälfte randlos, und unten
 * gibt es keine zweite Leiste mit Name und Preis mehr.
 */
const aufbau = (page) => page.evaluate(() => {
  const flaeche = document.querySelector('[data-buehne-bild]')?.parentElement
  if (!flaeche) return { ok: false, grund: 'keine Bildfläche' }
  const r = flaeche.getBoundingClientRect()
  const leiste = [...document.querySelectorAll('.sticky.bottom-0')].filter(e => e.offsetParent)
  const fehler = []
  if (r.left > 1) fehler.push(`Bild beginnt bei ${Math.round(r.left)}px`)
  if (r.width < innerWidth * 0.5) fehler.push(`Bild nur ${Math.round(r.width)}px breit`)
  if (r.bottom < innerHeight - 1) fehler.push(`Bild endet ${Math.round(innerHeight - r.bottom)}px über dem Rand`)
  if (leiste.length) fehler.push('Leiste unten noch da')
  return { ok: fehler.length === 0, grund: fehler.join(', ') }
})

/** Telefon: Liegen Pfeile und Zoom innerhalb des sichtbaren Bildes? */
const knoepfeAufBild = (page) => page.evaluate(() => {
  const img = document.querySelector('[data-buehne-bild] img')
  if (!img) return { ok: true, grund: 'kein Bild' }
  const r = img.getBoundingClientRect()
  // Sichtbares Bild bei object-contain
  const s = Math.min(r.width / img.naturalWidth, r.height / img.naturalHeight)
  const w = img.naturalWidth * s, h = img.naturalHeight * s
  const bx = r.left + (r.width - w) / 2, by = r.top + (r.height - h) / 2
  const knoepfe = [...document.querySelectorAll('[aria-label="Vorheriges Bild"],[aria-label="Nächstes Bild"],[aria-label="Vergrößern"],[aria-label="Verkleinern"]')]
  const raus = knoepfe.filter(k => {
    const q = k.getBoundingClientRect()
    return q.left < bx - 1 || q.right > bx + w + 1 || q.top < by - 1 || q.bottom > by + h + 1
  }).map(k => k.getAttribute('aria-label'))
  return { ok: raus.length === 0, grund: raus.join(', ') }
})

/**
 * Die Testdatenbank hat keine Schuhfotos, nur die Zeichnung. Eingesetzt
 * werden deshalb zwei gezeichnete „Studiofotos" auf einfarbigem Grund —
 * Stein und Grau, wie die echten —, damit die Fläche ihre Farbe übernehmen
 * kann und die Knöpfe einen Rahmen haben.
 */
let fotos = null
async function fotosMalen(browser) {
  const ctx = await browser.newContext()
  const pg = await ctx.newPage()
  const bilder = await pg.evaluate(() => [['#c4bfb4', 1200, 1200], ['#b9b6b0', 1600, 1067]].map(([grund, w, h]) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h
    const x = c.getContext('2d')
    x.fillStyle = grund; x.fillRect(0, 0, w, h)
    x.fillStyle = '#3b2a22'
    x.beginPath(); x.ellipse(w * 0.5, h * 0.58, w * 0.3, h * 0.11, -0.08, 0, Math.PI * 2); x.fill()
    x.fillStyle = '#2a1e18'; x.fillRect(w * 0.22, h * 0.64, w * 0.56, h * 0.035)
    return c.toDataURL('image/png').split(',')[1]
  }))
  await ctx.close()
  return bilder.map(b => Buffer.from(b, 'base64'))
}
async function fotosEinsetzen(page) {
  await page.route('**/testfoto-*.png', (route) => {
    const n = route.request().url().includes('testfoto-2') ? 1 : 0
    route.fulfill({ status: 200, contentType: 'image/png', body: fotos[n] })
  })
  await page.route('**/api/shoes**', async (route) => {
    const res = await route.fetch()
    let body = await res.text()
    try {
      const fuellen = (o) => {
        if (Array.isArray(o)) return o.forEach(fuellen)
        if (!o || typeof o !== 'object') return
        if ('image_data' in o && 'hover_image_data' in o && !o.image_data) {
          o.image_data = '/testfoto-1.png'
          o.hover_image_data = '/testfoto-2.png'
        }
        if (Array.isArray(o.images) && !o.images.length) o.images = ['/testfoto-1.png', '/testfoto-2.png']
        Object.values(o).forEach(fuellen)
      }
      const j = JSON.parse(body); fuellen(j); body = JSON.stringify(j)
    } catch { /* kein JSON */ }
    await route.fulfill({ response: res, body })
  })
}

const browser = await chromium.launch({ args: ['--ignore-certificate-errors'] })
fotos = await fotosMalen(browser)

for (const fall of FAELLE) {
  console.log(`\n── ${fall.name} ${fall.w}×${fall.h}`)
  const ctx = await browser.newContext({
    viewport: { width: fall.w, height: fall.h },
    ignoreHTTPSErrors: true,
    ...(fall.ua ? { userAgent: fall.ua, hasTouch: true } : {}),
  })
  await ctx.addInitScript((m) => {
    try {
      localStorage.setItem('as_foot_measurements', JSON.stringify(m))
      localStorage.setItem('as_einwilligung', JSON.stringify({ notwendig: true, zeit: Date.now(), version: 1 }))
    } catch {}
  }, MASSE)
  const page = await ctx.newPage()
  await fotosEinsetzen(page)
  await page.goto(`${BASIS}/schuhe/${SLUG}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  // Der Cookie-Hinweis liegt über der Leiste unten; er ist nicht Gegenstand
  // dieser Prüfung.
  await page.addStyleTag({ content: '[aria-label="Hinweis zur Speicherung im Endgerät"]{display:none!important}' })
  // Entwurfs-Dialog wegklicken, falls einer kommt
  const neu = page.getByRole('button', { name: 'Nein, neu' })
  if (await neu.count()) await neu.first().click()

  const gesehen = new Set()
  for (let i = 0; i < 14; i++) {
    const titel = (await page.locator('#konfig-wahl h2, #konfig-wahl [aria-live="polite"]').first().innerText().catch(() => '?')).split('\n')[0].trim()
    if (gesehen.has(titel)) break
    gesehen.add(titel)

    // Etwas wählen, wenn noch nichts gewählt ist
    const wahl = page.locator('#konfig-wahl [role="radio"]')
    if (await wahl.count() && !(await page.locator('#konfig-wahl [role="radio"][aria-checked="true"]').count())) {
      await wahl.first().click({ force: true }).catch(() => {})
      await page.waitForTimeout(400)
    }
    const ja = page.locator('#konfig-wahl').getByText('Nein, danke', { exact: true })
    if (await ja.count()) { await ja.first().click({ force: true }).catch(() => {}); await page.waitForTimeout(300) }
    await page.waitForTimeout(500)

    const ue = await ueberstand(page)
    p(`${titel}: kein Scrollen`, ue <= 1, `${ue}px`)
    const ab = await aufbau(page)
    p(`${titel}: Bild links randlos, keine Leiste unten`, ab.ok, ab.grund)
    if (BILDER) await page.screenshot({ path: `${BILDER}/${fall.name}-${String(i).padStart(2, '0')}.png` })

    const weiter = page.getByRole('button', { name: /^Weiter/ }).last()
    if (!(await weiter.count()) || await weiter.isDisabled()) break
    await weiter.click()
    await page.waitForTimeout(600)
  }
  await ctx.close()
}

// Telefon: bleibt scrollbar, nichts geändert
{
  console.log('\n── iphone 390×844')
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true, userAgent: IPAD.replace('iPad', 'iPhone'), hasTouch: true })
  const page = await ctx.newPage()
  await fotosEinsetzen(page)
  await page.goto(`${BASIS}/schuhe/${SLUG}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.addStyleTag({ content: '[aria-label="Hinweis zur Speicherung im Endgerät"]{display:none!important}' })
  const ue = await ueberstand(page)
  p('Telefon scrollt weiterhin', ue > 100, `${ue}px`)
  const kb = await knoepfeAufBild(page)
  p('Telefon: Bild-Knöpfe auf dem Foto', kb.ok, kb.grund)
  if (BILDER) await page.screenshot({ path: `${BILDER}/iphone.png`, fullPage: true })
  await ctx.close()
}

await browser.close()
console.log(`\n${ok} OK, ${fehler.length} Fehler`)
if (fehler.length) process.exit(1)
