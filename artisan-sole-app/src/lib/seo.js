import { useEffect } from 'react'

/**
 * seo.js — was im Reiter des Browsers steht und was Google zitiert.
 *
 * ── Das Problem, das hier gelöst wird ────────────────────────────────────
 *
 * Diese Anwendung ist eine einzige Seite. `index.html` trägt genau einen
 * Titel und eine Beschreibung, und die galten bisher für alles: für die
 * Kollektion, für jede der achtundvierzig Modellseiten, für die AGB. Für
 * eine Suchmaschine waren das achtundvierzig Dokumente mit demselben Namen
 * — sie kann dann nicht entscheiden, welches sie zu „Oxford nach Maß"
 * anzeigen soll, und zeigt im Zweifel keines.
 *
 * Auch im Browser sah man es: Wer drei Modelle in drei Reitern öffnete,
 * hatte dreimal „ARTISAN SOLE" nebeneinander.
 *
 * ── Was diese Datei kann und was nicht ───────────────────────────────────
 *
 * Sie setzt Titel und Beschreibung, NACHDEM die Seite im Browser aufgebaut
 * wurde. Google führt JavaScript aus und sieht sie deshalb. Ein Messenger,
 * der eine Linkvorschau baut, tut das NICHT: Er liest das ausgelieferte
 * HTML und findet dort weiter den allgemeinen Titel.
 *
 * Das ist keine Nachlässigkeit, sondern die Grenze dieses Ansatzes. Sie
 * fällt erst, wenn die Seiten beim Bauen vorgerendert werden. Bis dahin ist
 * das hier die Hälfte, die ohne Umbau zu haben ist — und die für Google die
 * wichtigere ist.
 *
 * ── Warum die Marke hinten steht ─────────────────────────────────────────
 *
 * „Heritage Oxford · Artisan Sole" und nicht umgekehrt. In einem
 * Suchergebnis wird nach etwa sechzig Zeichen abgeschnitten; steht die
 * Marke vorn, verliert man das Wort, nach dem gesucht wurde. Und in einer
 * Reiterleiste sind nur die ersten Zeichen zu sehen.
 */

const MARKE = 'Artisan Sole'
const STANDARD_BESCHREIBUNG =
  'Rahmengenähte Schuhe, Custom Made nach Ihren Maßen. Leder, Sohle und Details bestimmen Sie.'

/** Setzt ein `<meta>`-Element oder legt es an, wenn es noch fehlt. */
function setzeMeta(auswahl, attribut, wert, inhalt) {
  if (typeof document === 'undefined') return
  let el = document.head.querySelector(auswahl)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attribut, wert)
    document.head.appendChild(el)
  }
  el.setAttribute('content', inhalt)
}

/**
 * Die Adresse, unter der genau diese Seite zu erreichen ist.
 *
 * Ohne sie gilt eine Seite, die über zwei Wege erreichbar ist, als zwei
 * Seiten mit gleichem Inhalt — und beide werden schwächer bewertet als eine.
 * Der Konfigurator ist genau so ein Fall: `/schuhe/heritage-oxford` und
 * `/customize?id=13` zeigen dasselbe.
 */
function setzeKanonisch(pfad) {
  if (typeof document === 'undefined') return
  let el = document.head.querySelector('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', `${window.location.origin}${pfad || window.location.pathname}`)
}

/**
 * Eine Beschreibung auf ein Maß bringen, das ein Suchergebnis auch zeigt.
 *
 * Google schneidet bei rund 160 Zeichen ab. Abgeschnitten wird an einem
 * Wortende und nicht mitten im Wort, und der Punkt am Ende bleibt: Ein Satz,
 * der mit drei Punkten aufhört, sieht nach einem Fehler aus.
 */
export function kuerze(text, max = 160) {
  const t = String(text || '').replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  const teil = t.slice(0, max)
  const schnitt = teil.lastIndexOf(' ')
  return (schnitt > max * 0.6 ? teil.slice(0, schnitt) : teil).replace(/[,;:.]$/, '') + '.'
}

/**
 * Titel und Beschreibung dieser Seite.
 *
 * `titel` ohne Marke übergeben, sie wird angehängt. Wer `null` übergibt,
 * bekommt den allgemeinen Titel — das ist der richtige Wert für eine Seite,
 * die noch lädt und deren Namen wir noch nicht kennen.
 */
export function useSeo({ titel, beschreibung, pfad } = {}) {
  useEffect(() => {
    if (typeof document === 'undefined') return
    const voll = titel ? `${titel} · ${MARKE}` : `ARTISAN SOLE · Rahmengenähte Schuhe, Custom Made`
    const text = kuerze(beschreibung || STANDARD_BESCHREIBUNG)

    document.title = voll
    setzeMeta('meta[name="description"]', 'name', 'description', text)
    setzeMeta('meta[property="og:title"]', 'property', 'og:title', voll)
    setzeMeta('meta[property="og:description"]', 'property', 'og:description', text)
    setzeKanonisch(pfad)
  }, [titel, beschreibung, pfad])
}

/**
 * Der Satz, der unter einem Modell im Suchergebnis steht.
 *
 * Zuerst die Beschreibung aus dem CMS — sie ist für Menschen geschrieben und
 * damit besser als alles, was sich aus Feldern zusammensetzen ließe. Fehlt
 * sie, entsteht ein Satz aus dem, was das Modell ohnehin trägt: Leder,
 * Machart, Preis. Auch der sagt mehr als der allgemeine Text, denn er nennt
 * die Wörter, nach denen jemand sucht.
 */
export function schuhBeschreibung(schuh) {
  const eigen = String(schuh?.description || schuh?.tagline || '').trim()
  if (eigen.length > 60) return eigen
  const teile = [
    schuh?.name && `${schuh.name}, rahmengenäht und nach Ihren Maßen gefertigt`,
    schuh?.material && `Leder: ${schuh.material}`,
    schuh?.price && `ab ${schuh.price}`,
  ].filter(Boolean)
  return teile.length ? `${teile.join('. ')}. Leder, Farbe und Sohle stellen Sie selbst zusammen.` : ''
}
