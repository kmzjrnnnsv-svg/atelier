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
 * Ob die vier Scrollfolgen auch dann laufen, wenn das Gerät weniger Bewegung
 * verlangt.
 *
 * ── Wer das entschieden hat und warum es hier steht ───────────────────────
 *
 * Das ist eine Entscheidung des Betreibers, ausdrücklich und in Kenntnis des
 * Einwands. Der Einwand lautet: Für Menschen mit vestibulären Beschwerden ist
 * eine Seite, die sich beim Scrollen aufbaut, nicht Geschmackssache, sondern
 * Übelkeit — und `prefers-reduced-motion` ist genau das Mittel, mit dem sie
 * das sagen. Es zu übergehen hat einen Preis, und der trifft nicht uns.
 *
 * Der Grund dagegen: Vier von vier Folgen fielen bei eingeschalteter
 * Einstellung ersatzlos aus. Gemessen auf einem iPhone 13 — vier klebende
 * Bühnen gegen null. Wer „Bewegung reduzieren" anhat, und das sind auf iOS
 * nicht wenige, sah von der halben Seite nur Standbilder und wusste nicht,
 * dass ihm etwas fehlt.
 *
 * ── Was NICHT übergangen wird ─────────────────────────────────────────────
 *
 * Nur die vier Folgen. Das langsame Heranfahren des Aufmachers, der wandernde
 * Strich und die Einblendungen beim Scrollen (siehe index.css und
 * Enthuellen.jsx) beachten die Einstellung weiterhin. Das sind Bewegungen,
 * die von allein laufen; die Folgen laufen nur, solange ein Finger sie
 * schiebt, und hören auf, sobald er aufhört.
 *
 * ── Zurücknehmen ──────────────────────────────────────────────────────────
 *
 * Diese eine Zeile auf `false`. Dann greift wieder, was vorher galt: fertiges
 * Bild und alle Schritte als Liste, vollständig, nur ohne Bewegung.
 */
export const FOLGEN_TROTZDEM = true

/**
 * Wie useWenigerBewegung, aber für die vier Scrollfolgen.
 *
 * Eine eigene Abfrage statt eines Schalters an jeder der vier Stellen: Ein
 * Schalter, den man an vier Stellen setzen muss, ist an der fünften vergessen.
 */
export function useWenigerBewegungFolge() {
  const ruhig = useWenigerBewegung()
  return FOLGEN_TROTZDEM ? false : ruhig
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
