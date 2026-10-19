/**
 * AufmacherFilm — der Film über der Startseite.
 *
 * Schwarz, bis das erste Bild wirklich läuft, dann blendet der Film weich
 * auf und spielt stumm in Schleife. Kein Text, kein Verlauf, kein Knopf
 * darüber: Der Film trägt seine Schlagzeile selbst (die Zeitung), und alles,
 * was man darauf legte, machte aus ihm eine Vorlage.
 *
 * ── Wann er startet ───────────────────────────────────────────────────────
 *
 * Am Schreibtisch (Maus, `hover: hover`) sofort und immer — auch bei
 * eingestellter „weniger Bewegung", auf Wunsch des Hauses: Der Film ist
 * der Aufmacher, ein stehendes Schwarz an seiner Stelle war das
 * Gegenteil davon.
 *
 * Auf Telefon und Tablet, sobald jemand anfängt zu scrollen oder den
 * Bildschirm berührt. Die Berührung zählt als Freigabe; damit läuft er
 * auch im Stromsparmodus von iOS, der stummes Abspielen ohne Berührung
 * verweigert. Vorher stand dort „Film abspielen" auf einer schwarzen
 * Fläche.
 *
 * Breitbild (2206 × 946), überall in voller Breite und im eigenen Format.
 * Je zwei Fassungen, 1920 und 1080 Pixel breit, als WebM (VP9) und MP4
 * (H.264), ohne Tonspur.
 */
import { useEffect, useRef, useState } from 'react'

const istSchreibtisch = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches

export default function AufmacherFilm() {
  const film = useRef(null)
  const [laeuft, setLaeuft] = useState(false)
  const [breite] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 900 ? 1080 : 1920
  )

  useEffect(() => {
    const v = film.current
    if (!v) return
    const abspielen = () => { v.play().catch(() => {}) }

    if (istSchreibtisch()) {
      // `autoPlay` allein greift nach einem Zurück aus dem Verlauf nicht
      // überall; ein ausdrückliches play() holt das nach. Beim ersten
      // Scrollen noch einmal, falls der Browser es beim Laden verweigert hat.
      abspielen()
      window.addEventListener('scroll', abspielen, { passive: true, once: true })
      return () => window.removeEventListener('scroll', abspielen)
    }

    // Telefon und Tablet: erst, wenn jemand die Seite bewegt.
    const ereignisse = ['scroll', 'touchstart', 'touchend', 'pointerdown', 'wheel']
    const los = () => {
      abspielen()
      ereignisse.forEach(e => window.removeEventListener(e, los))
    }
    ereignisse.forEach(e => window.addEventListener(e, los, { passive: true }))
    return () => ereignisse.forEach(e => window.removeEventListener(e, los))
  }, [])

  return (
    <section className="relative bg-black overflow-hidden" aria-label="Film: Artisan Sole">
      <video
        ref={film}
        muted
        loop
        playsInline
        preload="auto"
        onPlaying={() => setLaeuft(true)}
        aria-hidden="true"
        className={`block w-full h-auto aspect-[2206/946] max-h-[calc(100svh-13rem)] object-cover transition-opacity duration-[1600ms] ease-out ${
          laeuft ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* WebM (VP9) zuerst — kleiner und auch in Chromium ohne H.264;
            MP4 für Safari und alles, was WebM nicht kann. */}
        <source src={`/video/aufmacher-${breite}.webm`} type="video/webm" />
        <source src={`/video/aufmacher-${breite}.mp4`} type="video/mp4" />
      </video>
    </section>
  )
}
