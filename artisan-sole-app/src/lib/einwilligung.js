/**
 * einwilligung.js — was im Endgerät gespeichert wird, und wer dazu ja gesagt hat.
 *
 * ── Was hier ehrlich sein muss ────────────────────────────────────────────
 *
 * Ein Hinweis, der behauptet, es gäbe keine Übermittlung an Dritte, während
 * die Seite eine Schrift von einem fremden Server nachlädt, ist schlimmer als
 * kein Hinweis: Er ist falsch, und zwar nachweisbar. Deshalb steht die Liste
 * der Kategorien hier im Code an einer Stelle — was dazukommt, kommt hier
 * dazu, und der Hinweistext liest sich daraus.
 *
 * Heute gibt es genau eine Kategorie: das Notwendige. Die Anwendung braucht
 * einen Platz für die Anmeldung, für den Warenkorb und für diese Entscheidung
 * selbst. Analyse, Reichweitenmessung, Werbung: nichts davon ist eingebaut.
 * Nach § 25 Abs. 2 Nr. 2 TDDDG braucht das keine Einwilligung — aufklären
 * muss man trotzdem, und genau das tut der Hinweis.
 *
 * ── Warum die Entscheidung trotzdem festgehalten wird ─────────────────────
 *
 * Weil „wir haben aufgeklärt" sonst eine Behauptung ohne Beleg bleibt. Und
 * weil an dem Tag, an dem hier eine zweite Kategorie steht, das Verfahren
 * schon vorhanden sein muss statt erst gebaut zu werden.
 *
 * Zugeordnet wird über eine zufällige Kennung, die im Browser liegt. Kein
 * Name, keine Adresse: Das Protokoll soll belegen, was entschieden wurde,
 * nicht, wer hier war.
 */
import { apiFetch } from '../hooks/useApi'

export const HINWEIS_FASSUNG = '2026-08-16'

const SPEICHER = 'as_einwilligung'
const KENNUNG  = 'as_einwilligung_kennung'

/**
 * Was die Anwendung im Endgerät ablegt.
 *
 * `aktivierbar: false` heißt: Es gibt hier nichts zu wählen, das Notwendige
 * ist notwendig. Kommt einmal Analyse oder Werbung dazu, steht sie hier mit
 * `aktivierbar: true` — dann zeigt der Hinweis von allein zwei Knöpfe statt
 * einem, und die Entscheidung wird zu einer echten Einwilligung.
 */
export const KATEGORIEN = [
  {
    key: 'notwendig',
    titel: 'Notwendig',
    aktivierbar: false,
    text: 'Hält Ihre Anmeldung aufrecht, merkt sich Warenkorb und Merkliste und ' +
          'speichert diese Entscheidung. Ohne das funktioniert der Laden nicht.',
    beispiele: 'Anmelde-Cookie, Warenkorb, diese Auswahl',
  },
]

export const gibtEsWahl = () => KATEGORIEN.some(k => k.aktivierbar)

/** Zufällige Kennung, einmal je Browser. Sie ist der einzige Faden zum Protokoll. */
export function kennung() {
  try {
    let k = localStorage.getItem(KENNUNG)
    if (!k) {
      k = (crypto.randomUUID?.() || String(Math.random()).slice(2) + Date.now())
      localStorage.setItem(KENNUNG, k)
    }
    return k
  } catch {
    // Privater Modus ohne Speicher: Dann gibt es keine Kennung und keinen
    // Eintrag. Der Hinweis erscheint bei jedem Besuch neu — unschön, aber
    // ehrlicher als so zu tun, als hätten wir uns etwas gemerkt.
    return null
  }
}

/** Die gespeicherte Entscheidung, oder null. */
export function entscheidung() {
  try {
    const roh = localStorage.getItem(SPEICHER)
    if (!roh) return null
    const wert = JSON.parse(roh)
    // Ein neuer Wortlaut ist eine neue Frage. Alte Zustimmung gilt dafür nicht.
    if (wert?.fassung !== HINWEIS_FASSUNG) return null
    return wert
  } catch { return null }
}

/**
 * Entscheidung festhalten: erst im Browser, dann am Server.
 *
 * Die Reihenfolge ist Absicht. Der Server kann ausfallen, das Netz kann weg
 * sein — die Entscheidung des Besuchers darf davon nicht abhängen, sonst
 * fragt der Hinweis beim nächsten Aufruf wieder.
 */
export async function festhalten(art) {
  const kategorien = Object.fromEntries(
    KATEGORIEN.map(k => [k.key, k.aktivierbar ? art === 'alle' : true])
  )
  const eintrag = {
    entscheidung: art,
    kategorien,
    fassung: HINWEIS_FASSUNG,
    zeit: new Date().toISOString(),
    kennung: kennung(),
  }
  try { localStorage.setItem(SPEICHER, JSON.stringify(eintrag)) } catch { /* kein Speicher */ }

  if (eintrag.kennung) {
    await apiFetch('/api/consent', {
      method: 'POST',
      body: JSON.stringify({
        kennung: eintrag.kennung,
        entscheidung: art,
        kategorien,
        text_fassung: HINWEIS_FASSUNG,
      }),
    }).catch(() => { /* Der Beleg fehlt dann, die Entscheidung gilt trotzdem. */ })
  }
  return eintrag
}

/** Widerruf: löscht die Wahl im Browser und vermerkt ihn am Server. */
export async function widerrufen() {
  const k = kennung()
  try { localStorage.removeItem(SPEICHER) } catch { /* egal */ }
  if (k) {
    await apiFetch('/api/consent', {
      method: 'POST',
      body: JSON.stringify({
        kennung: k, entscheidung: 'widerrufen', kategorien: {}, text_fassung: HINWEIS_FASSUNG,
      }),
    }).catch(() => {})
  }
  fenster()
}

/** Den Hinweis von außen wieder aufrufen (Fußzeile, Datenschutzseite). */
export function fenster() {
  window.dispatchEvent(new CustomEvent('as:einwilligung-oeffnen'))
}
