/**
 * useFensterHoehe — wie viel Platz vom oberen Rand einer Seite bis zum
 * unteren Rand des Fensters bleibt.
 *
 * Gemessen statt per `h-full` oder `min-h-full`: Zwischen Seite und Fenster
 * liegen je nach Umgebung andere Hüllen — auf iPad und Telefon scrollt das
 * Dokument, am Schreibtisch ein Container —, und darüber manchmal ein
 * Streifen, der sich schließen lässt. Eine Prozenthöhe greift in keiner
 * davon: Die Hüllen haben selbst keine feste Höhe. Sichtbar wurde das als
 * weißer Streifen unter der Kasse und als Seite, die nicht ins Fenster passt.
 *
 * `ab` ist die Mindestbreite des Fensters; darunter gibt der Hook `null`
 * zurück (der Konfigurator nutzt das, um auf dem Telefon normal zu scrollen).
 * `visualViewport` folgt den Leisten von Safari.
 */
import { useEffect, useState } from 'react'

export function useFensterHoehe(ref, ab = 0) {
  const [hoehe, setHoehe] = useState(null)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const messen = () => {
      // Jedes Mal neu nachsehen: Seiten wie die Kasse tauschen ihr äußeres
      // Element je nach Zustand aus, der Verweis zeigt dann woandershin.
      const el = ref.current
      if (!el) return
      if (window.innerWidth < ab) { setHoehe(null); return }
      const oben = el.getBoundingClientRect().top
      const huelle = el.parentElement?.closest('.overflow-y-auto')
      let frei
      if (huelle) {
        const r = huelle.getBoundingClientRect()
        frei = huelle.clientHeight - (oben - r.top + huelle.scrollTop)
      } else {
        const fenster = window.visualViewport?.height || window.innerHeight
        frei = fenster - (oben + window.scrollY)
      }
      const h = Math.max(480, Math.floor(frei))
      setHoehe(v => (v === h ? v : h))
    }
    messen()
    window.addEventListener('resize', messen)
    window.visualViewport?.addEventListener('resize', messen)
    // Die Seite blendet beim Aufruf mit einer kleinen Verschiebung ein
    // (PageTransition). Gemessen mitten darin fehlten unten ein paar Pixel —
    // also nach dem Ende noch einmal.
    document.addEventListener('animationend', messen)
    const spaeter = setTimeout(messen, 700)
    // Ein Streifen darüber, der aufgeht oder sich schließt, verschiebt den
    // oberen Rand, ohne dass das Fenster sich ändert.
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(messen) : null
    ro?.observe(document.body)
    return () => {
      window.removeEventListener('resize', messen)
      window.visualViewport?.removeEventListener('resize', messen)
      document.removeEventListener('animationend', messen)
      clearTimeout(spaeter)
      ro?.disconnect()
    }
  }, [ref, ab])
  return hoehe
}
