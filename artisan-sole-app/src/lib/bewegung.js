/**
 * bewegung.js — eine einzige Stelle, an der gefragt wird, ob jemand Bewegung
 * will.
 *
 * Für Menschen mit vestibulären Beschwerden ist eine wischende, sich beim
 * Scrollen aufbauende Seite nicht Geschmackssache, sondern Übelkeit. Diese
 * Seite hat inzwischen drei Stellen, die das beachten müssen (Enthuellen, die
 * beiden Regeln in index.css und der Schuhaufbau). Drei eigene Abfragen wären
 * drei Gelegenheiten, es an einer davon zu vergessen.
 */
import { useEffect, useState } from 'react'

const FRAGE = '(prefers-reduced-motion: reduce)'

/** Einmal gefragt, für den Augenblick. */
export function wenigerBewegung() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia(FRAGE).matches
}

/**
 * Dasselbe, aber mitlaufend: Wer die Einstellung während des Besuchs ändert,
 * bekommt die Seite sofort ohne Bewegung — und nicht erst beim nächsten Mal.
 */
export function useWenigerBewegung() {
  const [wert, setWert] = useState(wenigerBewegung)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia(FRAGE)
    const auf = (e) => setWert(e.matches)
    mq.addEventListener('change', auf)
    return () => mq.removeEventListener('change', auf)
  }, [])

  return wert
}

/**
 * Ob das Gerät schmal ist.
 *
 * Nicht für Gestaltung — dafür sind die Klassen da —, sondern für die
 * wenigen Fälle, in denen der Inhalt selbst ein anderer sein muss: Der
 * Schuhaufbau zeigt auf dem Telefon einen engeren Ausschnitt ohne
 * Beschriftung, weil eine Beschriftung, die dort sieben Pixel hoch wäre,
 * keine ist.
 *
 * @param {string} [frage] Eine Medienabfrage.
 */
export function useSchmal(frage = '(max-width: 1023px)') {
  const [schmal, setSchmal] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(frage).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia(frage)
    const auf = (e) => setSchmal(e.matches)
    mq.addEventListener('change', auf)
    return () => mq.removeEventListener('change', auf)
  }, [frage])

  return schmal
}
