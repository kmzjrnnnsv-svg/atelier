/**
 * Der Titel der aktuellen Seite — für die eine Leiste am oberen Rand.
 *
 * Bis hierher trug fast jede Unterseite ihre eigene Kopfzeile: noch ein
 * Zurück-Pfeil, noch eine Überschrift, direkt unter der Leiste, die beides
 * bereits hatte. Zwei Zeilen, die dasselbe sagen, und zwei Pfeile, von denen
 * der Kunde raten musste, welcher wohin führt.
 *
 * Deshalb gibt es die Überschrift jetzt genau einmal, und zwar dort, wo auch
 * der Zurück-Pfeil sitzt. Feste Seiten stehen in der Tabelle unten; Seiten,
 * deren Titel erst beim Laden feststeht (ein Rechtstext, ein Schuhmodell),
 * melden ihn über `useSeitentitel` nach.
 */
import { useEffect } from 'react'
import { create } from 'zustand'

export const useSeitentitelStore = create(set => ({
  titel: null,
  setTitel: (titel) => set({ titel }),
}))

/**
 * Meldet den Titel der Seite an die obere Leiste und nimmt ihn beim Verlassen
 * wieder zurück — sonst bliebe die Überschrift der vorigen Seite stehen.
 */
export function useSeitentitel(titel) {
  const setTitel = useSeitentitelStore(s => s.setTitel)
  useEffect(() => {
    setTitel(titel || null)
    return () => setTitel(null)
  }, [titel, setTitel])
}

/**
 * Titel der Seiten, die immer gleich heißen. Wer hier steht, braucht den Haken
 * im Bildschirm selbst nicht.
 *
 * Die Hauptseiten (Kollektion, Zubehör) stehen bewusst nicht dabei: Dort trägt
 * die Leiste kein Zurück, sondern das Menü — und in der Mitte die Marke.
 *
 * Ebenso fehlen die Seiten mit eigener großer Überschrift (Profil,
 * Wunschliste, Hilfe, Rücksendungen, Einstellungen, Bestellungen, Fuß &
 * Gesundheit). Dort stünde der Titel sonst zweimal: einmal in der Leiste und
 * einen Fingerbreit darunter noch einmal in groß. Genau diese Dopplung sollte
 * verschwinden — sie durch eine neue zu ersetzen, wäre nichts gewonnen.
 */
export const TITEL_NACH_PFAD = {
  '/my-scans': 'Meine Vermessungen',
  '/feedback': 'Feedback & Hilfe',
}

/** Der Titel für einen Pfad, oder null — dann zeigt die Leiste die Marke. */
export function titelFuerPfad(pfad) {
  return TITEL_NACH_PFAD[pfad] || null
}
