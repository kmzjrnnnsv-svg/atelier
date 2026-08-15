/**
 * RefErfassung.jsx — den Werbecode überall aufnehmen, nicht nur auf einer Seite.
 *
 * Bislang las nur `/entdecken` das `?ref=` aus der Adresse. Das reichte,
 * solange der Werbelink immer auf die Startseite führte. Seit ein Vermittler
 * fertige Links auf einzelne Modelle bekommt — `/schuhe/heritage-oxford?ref=…` —
 * kommt der Besucher woanders an, und der Code fiele dort unter den Tisch:
 * kein Nachlass für den Kunden, keine Provision für den Vermittler.
 *
 * Rendert nichts. Hängt einmal im Baum und beobachtet die Adresse.
 */
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { refAusUrl, refMerken, refZaehlen } from '../lib/affiliateCode'

export default function RefErfassung() {
  const { pathname, search } = useLocation()

  useEffect(() => {
    const code = refAusUrl(search)
    if (!code) return
    refMerken(code)

    // Führt der Link auf ein bestimmtes Modell, wird das mitgezählt — dem
    // Vermittler sagt erst das, welches Paar seine Empfehlung trägt.
    const treffer = pathname.match(/^\/schuhe\/([^/]+)/)
    refZaehlen(treffer
      ? { code, target: 'modell', shoe_slug: decodeURIComponent(treffer[1]) }
      : { code, target: 'seite' })
  }, [pathname, search])

  return null
}
