/**
 * Bündel nachladen, ohne dass ein Funkloch die Seite kostet.
 *
 * ── Warum es das braucht ──────────────────────────────────────────────────
 *
 * Jede Seite dieser Anwendung wird erst beim Betreten geladen (`lazy`). Geht
 * dabei eine einzige Anfrage verloren — Aufzug, Tunnel, Mobilfunk, der kurz
 * aussetzt —, wirft der Browser „Failed to fetch dynamically imported module".
 * Bisher galt das sofort als Totalschaden: Die Seite lud sich hart neu, und
 * beim dritten Mal in dreißig Sekunden stand der Besucher vor „Seite kann
 * nicht geladen werden. Bitte leeren Sie den Browser-Cache". Auf einem
 * fremden Telefon ist dieser Rat sinnlos — dort gibt es weder die
 * Tastenkombination noch einen Zwischenspeicher, den man leeren könnte.
 * Genau daher kam das „mal geht es, mal nicht".
 *
 * ── Was jetzt geschieht ───────────────────────────────────────────────────
 *
 * Ein Fehlschlag wird zuerst befragt, statt beantwortet:
 *
 *   1. Nennt der Server inzwischen ein anderes Einstiegsbündel, hält dieser
 *      Browser eine veraltete index.html. Das Bündel ist dann wirklich fort,
 *      und nur ein Neuladen holt das neue. Genau einmal, dann steht es.
 *   2. Sonst war es ein Aussetzer. Ein zweiter Versuch nach kurzer Pause
 *      genügt fast immer, und der Besucher merkt nichts davon.
 *
 * Erst wenn auch das scheitert, sieht jemand eine Meldung — und die sagt
 * dann, was wirklich los ist.
 */

const CHUNK_MUSTER = [
  /Loading chunk \d+ failed/i,
  /Importing a module script failed/i,
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /Unable to preload CSS/i,
  /ChunkLoadError/i,
]

export function istChunkFehler(fehler) {
  const text = fehler?.message || String(fehler || '')
  return CHUNK_MUSTER.some(re => re.test(text))
}

const warte = (ms) => new Promise(r => setTimeout(r, ms))

/** Verspricht nichts. Hält Suspense am Ladezustand, während der Browser weg navigiert. */
const niemals = () => new Promise(() => {})

/**
 * Welches Einstiegsbündel läuft gerade? Es steht im Kopf der Seite — und
 * unterscheidet sich nach einem Deploy von dem, das der Server jetzt nennt.
 */
function laufendesBuendel() {
  if (typeof document === 'undefined') return null
  const tag = document.querySelector('script[type="module"][src*="/assets/"]')
  return tag?.getAttribute('src') || null
}

/**
 * Hält dieser Browser eine veraltete index.html?
 *
 * Im Zweifel `false`: Ein Neuladen ist der teure Weg (der Besucher verliert,
 * woran er gerade war). Er wird nur gegangen, wenn feststeht, dass er hilft.
 */
export async function seiteIstVeraltet() {
  const laufend = laufendesBuendel()
  if (!laufend) return false
  try {
    const antwort = await fetch(`/index.html?_=${Date.now()}`, { cache: 'no-store' })
    if (!antwort.ok) return false
    const html = await antwort.text()
    const frisch = html.match(/<script[^>]+src="(\/assets\/index-[^"]+\.js)"/)?.[1]
    return !!frisch && frisch !== laufend
  } catch {
    // Kein Netz, keine Antwort — dann ist die Ursache nicht die alte Seite.
    return false
  }
}

/** Neu laden und dabei jeden Zwischenspeicher umgehen. */
export function neuLadenMitBust() {
  try {
    if ('caches' in window) caches.keys().then(ks => ks.forEach(k => caches.delete(k))).catch(() => {})
  } catch { /* egal */ }
  const u = new URL(window.location.href)
  u.searchParams.set('_v', String(Date.now()))
  window.location.replace(u.toString())
}

/**
 * Zweiter Versuch.
 *
 * Ein fehlgeschlagener dynamischer Import bleibt im Modulspeicher des
 * Browsers als Fehlschlag stehen: Derselbe Aufruf liefert danach denselben
 * Fehler, ohne noch einmal ans Netz zu gehen. Steht die Adresse in der
 * Fehlermeldung — Chrome und Firefox nennen sie —, wird sie deshalb mit
 * einem Anhängsel neu geladen; für den Browser ist das ein anderes Modul.
 * Safari nennt sie nicht; dort bleibt der schlichte zweite Aufruf, der je
 * nach Fassung erneut lädt.
 */
async function zweiterVersuch(laden, fehler) {
  const adresse = String(fehler?.message || '').match(/https?:\/\/[^\s"')]+?\.js/i)?.[0]
  if (!adresse) return laden()
  const getrennt = adresse.includes('?') ? '&' : '?'
  return import(/* @vite-ignore */ `${adresse}${getrennt}erneut=${Date.now()}`)
}

/**
 * Umhüllt eine Import-Funktion für `lazy()`. Aus
 *   lazy(() => import('./screens/Customize'))
 * wird
 *   lazy(nachladen(() => import('./screens/Customize')))
 */
export function nachladen(laden) {
  return async () => {
    try {
      return await laden()
    } catch (fehler) {
      if (!istChunkFehler(fehler)) throw fehler
      if (await seiteIstVeraltet()) {
        neuLadenMitBust()
        return niemals()
      }
      await warte(600)
      return zweiterVersuch(laden, fehler)
    }
  }
}
