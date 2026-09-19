/**
 * Enthuellen — was ins Bild kommt, tritt ein, statt einfach dazustehen.
 *
 * ── Warum überhaupt Bewegung ──────────────────────────────────────────────
 *
 * Aus diesem Laden ist einmal eine Animation entfernt worden, und das zu
 * Recht: Beim Öffnen lief fünf Sekunden ein Logo, in denen niemand etwas tun
 * konnte (siehe Commit „Die Startseite beginnt mit der Handlung"). Was hier
 * entsteht, ist das Gegenteil davon.
 *
 *   • Sie hält niemanden auf. Der Inhalt ist da, bevor die Bewegung beginnt;
 *     wer sofort scrollt oder klickt, merkt nichts davon.
 *   • Sie hat einen Zweck. Ein Abschnitt, der beim Hereinscrollen ruhig
 *     aufzieht, sagt „hier beginnt etwas Neues" — bei einer Seite, die ihre
 *     Geschichte in Kapiteln erzählt, ist das die Gliederung.
 *   • Sie ist kurz. 700 ms und 18 Pixel. Alles darüber wirkt nicht
 *     hochwertig, sondern langsam.
 *
 * ── Warum niemand darauf warten muss ──────────────────────────────────────
 *
 * Der Inhalt steht im HTML, unabhängig davon, ob die Einblendung je
 * ausgelöst wird. Gibt es keinen IntersectionObserver, ist das Kind sofort
 * sichtbar. Das ist nicht nur Vorsicht: Der Vorrenderer (scripts/prerender.mjs)
 * greift die Seite ab, ohne zu scrollen — stünde die Sichtbarkeit allein an
 * der Bewegung, wäre das vorgerenderte HTML leer, und die ganze Arbeit an der
 * Auffindbarkeit wäre dahin.
 *
 * ── Wer keine Bewegung will ───────────────────────────────────────────────
 *
 * `prefers-reduced-motion` wird beachtet. Für Menschen mit vestibulären
 * Beschwerden ist eine wischende Seite nicht Geschmackssache, sondern
 * Übelkeit. Sie bekommen denselben Inhalt ohne jede Bewegung — nicht eine
 * abgeschwächte Fassung, gar keine.
 */
import { useEffect, useRef, useState } from 'react'
import { wenigerBewegung } from '../lib/bewegung'

/**
 * @param {number}  [verzoegerung=0]  Millisekunden. Für gestaffelte Reihen:
 *   Vier Kacheln, die gleichzeitig aufziehen, wirken wie ein Ruck; vier, die
 *   80 ms versetzt kommen, wie eine Bewegung.
 * @param {string}  [richtung='hoch'] 'hoch' (von unten herein), 'links',
 *   'rechts' oder 'ruhig' (nur Deckkraft, kein Versatz).
 */
export default function Enthuellen({
  children,
  verzoegerung = 0,
  richtung = 'hoch',
  className = '',
}) {
  const ref = useRef(null)
  // Ohne Beobachter (altes Gerät, Vorrenderer) gilt der Inhalt als sichtbar.
  const [sichtbar, setSichtbar] = useState(
    () => typeof IntersectionObserver === 'undefined' || wenigerBewegung(),
  )

  useEffect(() => {
    if (sichtbar || !ref.current) return
    const beobachter = new IntersectionObserver(
      ([eintrag]) => {
        if (!eintrag.isIntersecting) return
        setSichtbar(true)
        beobachter.disconnect()   // Einmal eingetreten, bleibt eingetreten.
      },
      // Erst bei 12 % Überschneidung, und 80 px vor der Unterkante: So beginnt
      // die Bewegung, während der Abschnitt hereinkommt, statt danach.
      { threshold: 0.12, rootMargin: '0px 0px -80px 0px' },
    )
    beobachter.observe(ref.current)
    return () => beobachter.disconnect()
  }, [sichtbar])

  const versatz = {
    hoch:   'translateY(18px)',
    links:  'translateX(-18px)',
    rechts: 'translateX(18px)',
    ruhig:  'none',
  }[richtung] || 'translateY(18px)'

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: sichtbar ? 1 : 0,
        transform: sichtbar ? 'none' : versatz,
        transition: `opacity 700ms cubic-bezier(0.22, 1, 0.36, 1) ${verzoegerung}ms, `
                  + `transform 700ms cubic-bezier(0.22, 1, 0.36, 1) ${verzoegerung}ms`,
        // Ohne diese Zeile zeichnet Safari die Schrift während der Bewegung
        // neu und lässt sie flimmern.
        willChange: sichtbar ? 'auto' : 'opacity, transform',
      }}
    >
      {children}
    </div>
  )
}
