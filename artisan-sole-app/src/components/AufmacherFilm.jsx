/**
 * AufmacherFilm — der Film über der Startseite.
 *
 * Bis er läuft, steht sein erstes Bild da (die Zeitung mit der
 * Schlagzeile), dann spielt er von genau dort stumm in Schleife weiter.
 * Vorher war die Fläche bis zum Start schwarz — auf dem Telefon, wo er
 * erst beim Scrollen startet, war das der erste Eindruck der Seite. Kein Text, kein Verlauf, kein Knopf
 * darüber: Der Film trägt seine Schlagzeile selbst (die Zeitung), und alles,
 * was man darauf legte, machte aus ihm eine Vorlage.
 *
 * ── Wann er startet ───────────────────────────────────────────────────────
 *
 * Am Schreibtisch (Maus, `hover: hover`) sofort. Auf Telefon und Tablet,
 * sobald jemand scrollt oder den Bildschirm berührt.
 *
 * Drei Dinge, an denen das in der ersten Fassung scheiterte:
 *
 *   • Gescrollt wird nicht immer im Fenster. Das iPad meldet sich in Safari
 *     als Mac und bekommt das Schreibtisch-Layout, in dem ein innerer
 *     Container scrollt; dessen `scroll` steigt nicht bis `window` auf. Gehört
 *     wird deshalb in der Capture-Phase am Dokument, dort kommt jedes an.
 *   • Im Stromsparmodus spielt iOS stumme Filme nur nach einer echten
 *     Aktivierung ab — einem Tippen, nicht einem Wischen. Ein play() beim
 *     Scrollen wird dann abgelehnt.
 *   • Danach wurden alle Listener entfernt, ob play() geklappt hatte oder
 *     nicht; auch ein späteres Tippen startete nichts mehr. Jetzt wird erst
 *     aufgeräumt, wenn der Film läuft.
 *
 * Lehnt der Browser ab, steht unter dem ersten Bild leise „Zum Abspielen
 * tippen" — ein Tippen auf die Fläche ist die Aktivierung, die iOS verlangt.
 *
 * Aus dem Bild gescrollt hält er an und läuft weiter, wenn er wiederkommt.
 *
 * Breitbild (2206 × 946), überall in voller Breite und im eigenen Format.
 * Je zwei Fassungen, 1920 und 1080 Pixel breit, als WebM (VP9) und MP4
 * (H.264), ohne Tonspur.
 */
import { useEffect, useRef, useState } from 'react'

const istSchreibtisch = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches

// Ereignisse, nach denen ein Start versucht wird. `touchend`, `click`,
// `pointerup` und `keydown` zählen als Aktivierung, Scrollen und das Rad
// nicht — mit ihnen startet er überall dort, wo keine verlangt wird.
const AM_FENSTER = ['touchend', 'click', 'pointerup', 'keydown', 'wheel']

export default function AufmacherFilm() {
  const film = useRef(null)
  const flaeche = useRef(null)
  const [laeuft, setLaeuft] = useState(false)
  const [gesperrt, setGesperrt] = useState(false)
  const [breite] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 900 ? 1080 : 1920
  )

  const abspielen = () => {
    const v = film.current
    if (!v) return Promise.resolve(false)
    return v.play().then(() => true, () => { setGesperrt(true); return false })
  }

  useEffect(() => {
    let fertig = false
    const aufraeumen = () => {
      fertig = true
      document.removeEventListener('scroll', los, true)
      AM_FENSTER.forEach(e => window.removeEventListener(e, los))
    }
    function los() {
      if (fertig) return
      abspielen().then(ok => { if (ok) aufraeumen() })
    }
    document.addEventListener('scroll', los, { capture: true, passive: true })
    AM_FENSTER.forEach(e => window.addEventListener(e, los, { passive: true }))
    if (istSchreibtisch()) los()
    return aufraeumen
  }, [])

  // Aus dem Bild: anhalten. Zurück im Bild: weiter, aber nur, wenn er schon
  // einmal lief — sonst bliebe es beim Warten aufs erste Scrollen.
  useEffect(() => {
    const el = flaeche.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => {
      const v = film.current
      if (!v || !laeuft) return
      if (e.isIntersecting) v.play().catch(() => {})
      else v.pause()
    }, { threshold: 0.05 })
    io.observe(el)
    return () => io.disconnect()
  }, [laeuft])

  return (
    <section
      ref={flaeche}
      className="relative bg-black overflow-hidden"
      aria-label="Film: Artisan Sole"
      onClick={gesperrt && !laeuft ? () => { abspielen() } : undefined}
      style={gesperrt && !laeuft ? { cursor: 'pointer' } : undefined}
    >
      <video
        ref={film}
        muted
        loop
        playsInline
        preload="auto"
        poster="/video/aufmacher-erstes-bild.jpg"
        onPlaying={() => { setLaeuft(true); setGesperrt(false) }}
        aria-hidden="true"
        className="block w-full h-auto aspect-[2206/946] max-h-[calc(100svh-13rem)] object-cover"
      >
        {/* WebM (VP9) zuerst — kleiner und auch in Chromium ohne H.264;
            MP4 für Safari und alles, was WebM nicht kann. */}
        <source src={`/video/aufmacher-${breite}.webm`} type="video/webm" />
        <source src={`/video/aufmacher-${breite}.mp4`} type="video/mp4" />
      </video>
      {gesperrt && !laeuft && (
        <p className="t-klein absolute left-4 lg:left-16 bottom-3 lg:bottom-6 text-white/90 pointer-events-none [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]">
          Zum Abspielen tippen
        </p>
      )}
    </section>
  )
}
