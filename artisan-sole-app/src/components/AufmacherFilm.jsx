/**
 * AufmacherFilm — der Film über der Startseite.
 *
 * Schwarz, bis das erste Bild wirklich läuft, dann blendet der Film weich
 * auf und spielt stumm in Schleife. Kein Text, kein Verlauf, kein Knopf
 * darüber: Der Film trägt seine Schlagzeile selbst (die Zeitung), und alles,
 * was man darauf legte, machte aus ihm eine Vorlage.
 *
 * Breitbild (2206 × 946), überall in voller Breite und im eigenen Format —
 * auch auf dem Telefon, wo er ein flacher Streifen ist. Höher und seitlich
 * beschnitten fehlte dort links und rechts das halbe Bild.
 *
 * Je zwei Fassungen, 1920 und 1080 Pixel breit, als WebM (VP9) und MP4
 * (H.264), ohne Tonspur, weil er ohnehin stumm läuft. Das Original war HEVC,
 * das Firefox und viele Chrome gar nicht abspielen. Wer weniger
 * Bewegung eingestellt hat, sieht ein stehendes Bild und kann den Film
 * selbst starten.
 */
import { useEffect, useRef, useState } from 'react'
import { useWenigerBewegung } from '../lib/bewegung'

export default function AufmacherFilm() {
  const film = useRef(null)
  const [laeuft, setLaeuft] = useState(false)
  const [bereit, setBereit] = useState(false)
  const ruhig = useWenigerBewegung()
  const [breite] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 900 ? 1080 : 1920
  )

  useEffect(() => {
    const v = film.current
    if (!v || ruhig) return
    // Manche Browser ignorieren `autoPlay` nach einem Zurück aus dem
    // Verlauf; ein ausdrückliches play() holt das nach. Schlägt es fehl
    // (Stromsparmodus), bleibt die Fläche schwarz statt halb geladen.
    v.play().catch(() => {})
  }, [ruhig])

  return (
    <section className="relative bg-black overflow-hidden" aria-label="Film: Artisan Sole">
      <video
        ref={film}
        muted
        loop
        playsInline
        autoPlay={!ruhig}
        preload={ruhig ? 'metadata' : 'auto'}
        onLoadedData={() => setBereit(true)}
        onPlaying={() => setLaeuft(true)}
        aria-hidden="true"
        className={`block w-full h-auto aspect-[2206/946] max-h-[calc(100svh-13rem)] object-cover transition-opacity duration-[1600ms] ease-out ${
          laeuft || (ruhig && bereit) ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* WebM (VP9) zuerst — kleiner und auch in Chromium ohne H.264;
            MP4 für Safari und alles, was WebM nicht kann. */}
        <source src={`/video/aufmacher-${breite}.webm`} type="video/webm" />
        <source src={`/video/aufmacher-${breite}.mp4`} type="video/mp4" />
      </video>
      {ruhig && !laeuft && (
        <button
          type="button"
          onClick={() => film.current?.play().catch(() => {})}
          className="t-klein absolute left-5 lg:left-16 bottom-5 lg:bottom-8 text-white/85 hover:text-white bg-transparent border-0 p-0 underline underline-offset-[6px] decoration-1"
        >
          Film abspielen
        </button>
      )}
    </section>
  )
}
