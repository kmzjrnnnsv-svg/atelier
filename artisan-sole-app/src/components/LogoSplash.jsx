/**
 * LogoSplash, Markeneinblendung beim Cold-Start.
 *
 * Animation:
 *  1. „AS“ erscheint mittig (A und S direkt nebeneinander)
 *  2. A und S schieben sich horizontal auseinander
 *  3. „RTISAN“ + „OLE“ erscheinen zwischen ihnen → „ARTISAN SOLE“
 *  4. Splash fadet aus, App wird sichtbar
 *
 * Wird einmal pro Browser-Session via sessionStorage gemerkt.
 */
import { useEffect, useState } from 'react'

const SESSION_KEY = '__atelier_splash_shown'

export default function LogoSplash() {
  const [shown, setShown] = useState(() => {
    try { return sessionStorage.getItem(SESSION_KEY) === '1' } catch { return false }
  })
  const [fadingOut, setFadingOut] = useState(false)

  useEffect(() => {
    if (shown) return
    // Phasen: AS in (1.2s) → Reveal (2.0s) → Hold (1.0s) → Fade-Out (1.1s)
    const startFade = setTimeout(() => setFadingOut(true), 4200)
    const done = setTimeout(() => {
      try { sessionStorage.setItem(SESSION_KEY, '1') } catch { /* ignore */ }
      setShown(true)
    }, 5300)
    return () => { clearTimeout(startFade); clearTimeout(done) }
  }, [shown])

  if (shown) return null

  return (
    <div className={`logo-splash ${fadingOut ? 'logo-splash--out' : ''}`} aria-hidden="true">
      <div className="logo-splash__row">
        <span className="logo-splash__letter">A</span>
        <span className="logo-splash__reveal">RTISAN</span>
        <span className="logo-splash__gap">&nbsp;</span>
        <span className="logo-splash__letter">S</span>
        <span className="logo-splash__reveal">OLE</span>
      </div>
    </div>
  )
}
