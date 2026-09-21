/**
 * scrollbuehne.js — wie weit ein Abschnitt durchgescrollt ist.
 *
 * ── Warum das hier nicht in drei Zeilen geht ──────────────────────────────
 *
 * Die übliche Rechnung lautet `window.scrollY / irgendwas`. In diesem Laden
 * ergibt sie immer null: Die Anwendung scrollt nicht das Dokument, sondern
 * einen Kasten in ihrer Mitte (`flex-1 overflow-y-auto` in App.jsx, für die
 * feste Kopfleiste und die native Hülle). `document.documentElement.scrollTop`
 * bleibt dort den ganzen Besuch über 0.
 *
 * Deshalb wird hier zweierlei gesucht: der Kasten, in dem tatsächlich
 * gescrollt wird, und die Höhe, die er hat — die ist nicht 100 vh, sondern
 * 100 vh minus Kopfleiste und etwaiger Banner. Eine Bühne, die höher ist als
 * ihr Scrollbehälter, bleibt nicht stehen, sondern wandert mit; das ist der
 * häufigste Fehler bei `position: sticky` und sieht aus wie ein Wackler.
 *
 * ── Warum eine Bildschleife und kein Scroll-Ereignis ──────────────────────
 *
 * Scroll-Ereignisse blasen nicht auf (`bubble: false`), und welcher Kasten
 * sie auslöst, kann sich mit der Route ändern. Statt an drei Stellen zu
 * lauschen, wird gemessen — aber nur, solange der Abschnitt überhaupt in
 * Sichtweite ist. Ein IntersectionObserver schaltet die Schleife an und aus;
 * auf dem Rest der Seite läuft nichts.
 */
import { useEffect, useRef, useState } from 'react'

/**
 * Der nächste Vorfahre, in dem wirklich gescrollt wird.
 *
 * ── Warum die Höhe mitgeprüft wird ────────────────────────────────────────
 *
 * Hier stand einmal nur: computed `overflow-y` ist `auto` oder `scroll`, und
 * es gibt mehr Inhalt als Platz. Das hat die Seite auf dem Telefon zerlegt,
 * und zwar so gründlich, dass man es kaum glaubt.
 *
 * Der Grund ist eine Regel, die man nicht im Kopf hat: Steht auf einem
 * Element `overflow-x: hidden` und daneben `overflow-y: visible`, macht CSS
 * aus dem `visible` ein `auto`. Der Kasten scrollt nicht, er sieht nur so
 * aus. Auf der Telefonfassung (Dokumentscroll, siehe App.jsx) ist der
 * Seitenrahmen genau so ein Element — und sein `clientHeight` ist nicht die
 * Höhe eines Fensters, sondern die der ganzen Seite.
 *
 * Damit wurde die Bühnenhöhe ein Vielfaches der Seitenhöhe. Der Abschnitt
 * wuchs, dadurch wuchs die Seite, dadurch die nächste Messung — in ein paar
 * Bildern war das Dokument 2,9 Millionen Pixel hoch. Wer scrollte, landete
 * nach dem dritten Kapitel in einer endlosen weißen Fläche.
 *
 * Deshalb zwei Bedingungen mehr: Ein Kasten, in dem gescrollt wird, ist nie
 * höher als das Fenster (sonst müsste man ihn nicht scrollen), und er hat
 * überhaupt eine Höhe. Beides zusammen schließt die Scheinbehälter aus.
 */
function scrollBehaelter(el) {
  const sicht = window.innerHeight
  let n = el?.parentElement
  while (n && n !== document.body && n !== document.documentElement) {
    const style = getComputedStyle(n)
    if (/(auto|scroll)/.test(style.overflowY)
      && n.clientHeight > 0
      && n.clientHeight <= sicht + 1
      && n.scrollHeight > n.clientHeight + 1) return n
    n = n.parentElement
  }
  return null
}

/**
 * Wie weit oben im Fenster die Bühne anfangen kann.
 *
 * In der Telefonfassung scrollt das Dokument, und die Kopfleiste klebt mit
 * `position: sticky` oben im Bild (siehe TopBar). Eine Bühne, die bei 0
 * klebt, liegt dann unter ihr: Die oberen sechzig Pixel jeder Zeichnung sind
 * verdeckt. In der Bildschirmfassung steht die Kopfleiste außerhalb des
 * Scrollkastens, dort ist der Wert 0.
 *
 * Gemessen wird an `[data-kopfleiste]` und nicht an „irgendetwas, das oben
 * klebt": Eine Suche über alle Elemente je Bild wäre teuer, und sie fände
 * beim nächsten eingeblendeten Banner das Falsche.
 */
function kopfHoehe() {
  const kopf = document.querySelector('[data-kopfleiste]')
  if (!kopf) return 0
  const r = kopf.getBoundingClientRect()
  return r.top <= 1 && r.bottom > 0 ? Math.round(r.bottom) : 0
}

const klemmen = (n) => (n < 0 ? 0 : n > 1 ? 1 : n)

/**
 * @param {React.RefObject<HTMLElement>} ref Der hohe Abschnitt, in dem die
 *   Bühne klebt.
 * @param {boolean} [aus=false] Schaltet die Messung ab (z. B. wenn jemand
 *   keine Bewegung will). Der Fortschritt bleibt dann auf 1 — nicht auf 0:
 *   Wer die Folge nicht sieht, soll das fertige Bild sehen und nicht das
 *   leere.
 * @returns {{fortschritt: number, buehnenHoehe: number|null, buehnenOben: number}}
 *   `buehnenOben` ist der Abstand von der Fensteroberkante, bei dem die Bühne
 *   kleben soll — 0 im Scrollkasten, sonst unter der Kopfleiste.
 */
export function useScrollBuehne(ref, aus = false) {
  // Ob überhaupt gemessen werden kann, steht schon beim ersten Zeichnen fest.
  // Das ist wichtig: Stünde der Fortschritt zunächst auf 1 und spränge dann
  // auf 0, sähe man den fertigen Schuh kurz aufblitzen, bevor die Folge
  // beginnt. Stünde er ohne Beobachter auf 0, bliebe die Zeichnung im
  // vorgerenderten HTML für immer leer.
  const kannMessen = typeof window !== 'undefined'
    && typeof IntersectionObserver !== 'undefined'
    && typeof requestAnimationFrame !== 'undefined'

  const [gemessen, setGemessen] = useState(0)
  const [buehnenHoehe, setBuehnenHoehe] = useState(null)
  const [buehnenOben, setBuehnenOben] = useState(0)
  const laeuft = useRef(0)

  useEffect(() => {
    const el = ref.current
    if (aus || !kannMessen || !el) return

    const behaelter = scrollBehaelter(el)

    const messen = () => {
      const r = el.getBoundingClientRect()

      // Zwei verschiedene Größen, die man leicht verwechselt:
      //
      // `oben` ist die Stelle IM FENSTER, an der das Band anfängt — im
      // Scrollkasten dessen Oberkante, sonst die Unterkante der klebenden
      // Kopfleiste. Sie geht in die Fortschrittsrechnung.
      //
      // `klebt` ist der Abstand, den `position: sticky` bekommt, und der
      // zählt im Scrollkasten von dessen eigener Oberkante — dort also 0,
      // egal wo der Kasten im Fenster sitzt. Nur beim Dokumentscroll sind
      // beide gleich.
      const kopf = behaelter ? 0 : kopfHoehe()
      const oben = behaelter ? behaelter.getBoundingClientRect().top : kopf

      // Und niemals höher als das, was man sieht. Der Riegel ist nicht
      // Vorsicht, sondern die zweite Sicherung gegen den Aufschaukler oben:
      // Selbst wenn ein Behälter falsch erkannt würde, kann der Abschnitt
      // dann nicht mehr wachsen, als ein Fenster hoch ist.
      const gemessenHoehe = behaelter ? behaelter.clientHeight : window.innerHeight - kopf
      const hoehe = Math.max(1, Math.min(gemessenHoehe, window.innerHeight))

      setBuehnenHoehe((alt) => (alt === hoehe ? alt : hoehe))
      setBuehnenOben((alt) => (alt === kopf ? alt : kopf))

      // Wie weit der Abschnitt schon hochgeschoben ist, geteilt durch die
      // Strecke, die er schieben kann. Ist der Abschnitt nicht höher als die
      // Bühne, gibt es nichts zu erzählen — dann gilt er als durchlaufen.
      const strecke = r.height - hoehe
      setGemessen(strecke <= 0 ? 1 : klemmen((oben - r.top) / strecke))
    }

    const schleife = () => {
      messen()
      laeuft.current = requestAnimationFrame(schleife)
    }

    const beobachter = new IntersectionObserver(
      ([eintrag]) => {
        if (eintrag.isIntersecting) {
          if (!laeuft.current) laeuft.current = requestAnimationFrame(schleife)
        } else {
          cancelAnimationFrame(laeuft.current)
          laeuft.current = 0
          // Beim Verlassen noch einmal messen: Wer nach oben herausscrollt,
          // soll die Folge beim Zurückkommen am Anfang vorfinden und nicht
          // mitten im Bild.
          messen()
        }
      },
      { threshold: 0 },
    )
    beobachter.observe(el)
    requestAnimationFrame(messen)

    return () => {
      beobachter.disconnect()
      cancelAnimationFrame(laeuft.current)
      laeuft.current = 0
    }
  }, [ref, aus, kannMessen])

  return {
    fortschritt: (aus || !kannMessen) ? 1 : gemessen,
    buehnenHoehe,
    buehnenOben,
  }
}
