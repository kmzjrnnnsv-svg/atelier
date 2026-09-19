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

/** Der nächste Vorfahre, in dem wirklich gescrollt wird. */
function scrollBehaelter(el) {
  let n = el?.parentElement
  while (n && n !== document.body) {
    const style = getComputedStyle(n)
    if (/(auto|scroll)/.test(style.overflowY) && n.scrollHeight > n.clientHeight + 1) return n
    n = n.parentElement
  }
  return null
}

const klemmen = (n) => (n < 0 ? 0 : n > 1 ? 1 : n)

/**
 * @param {React.RefObject<HTMLElement>} ref Der hohe Abschnitt, in dem die
 *   Bühne klebt.
 * @param {boolean} [aus=false] Schaltet die Messung ab (z. B. wenn jemand
 *   keine Bewegung will). Der Fortschritt bleibt dann auf 1 — nicht auf 0:
 *   Wer die Folge nicht sieht, soll das fertige Bild sehen und nicht das
 *   leere.
 * @returns {{fortschritt: number, buehnenHoehe: number|null}}
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
  const laeuft = useRef(0)

  useEffect(() => {
    const el = ref.current
    if (aus || !kannMessen || !el) return

    const behaelter = scrollBehaelter(el)

    const messen = () => {
      const r = el.getBoundingClientRect()
      const oben = behaelter ? behaelter.getBoundingClientRect().top : 0
      const hoehe = behaelter ? behaelter.clientHeight : window.innerHeight

      setBuehnenHoehe((alt) => (alt === hoehe ? alt : hoehe))

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
  }
}
