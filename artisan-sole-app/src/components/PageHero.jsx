/**
 * PageHero, der Kopf einer öffentlichen Seite.
 *
 * Ersetzt die vorher je Seite einzeln gesetzten Banner. Zwei Dinge kamen
 * dabei zusammen:
 *
 * 1. Format. Die Header lagen auf 16/5, das Profil sogar auf 16/3. Ein Foto,
 *    das nicht für diesen Streifen aufgenommen wurde, verliert dabei genau
 *    seine Mitte — übrig bleibt ein Band ohne Motiv. Hochformat auf dem
 *    Telefon (4/5) und 16/9 auf großen Schirmen zeigen das Bild, statt es
 *    zu beschneiden.
 * 2. Ausschnitt. `position` (CSS object-position) bestimmt, welcher Teil
 *    stehen bleibt, wenn doch zugeschnitten werden muss. Im CMS pro Header
 *    einstellbar, damit nicht der Zufall entscheidet, ob der Schuh im Bild
 *    ist oder knapp daneben.
 *
 * `slot` verbindet den Header mit dem CMS-Eintrag; ohne Eintrag greift
 * `fallback`.
 */
import { usePageHero } from '../lib/pageHeroes'

export default function PageHero({
  slot,
  fallback,
  alt = '',
  // Hochformat auf dem Telefon, liegendes Band auf großen Schirmen. 21/9 statt
  // 16/9, weil ein 16/9-Kopf auf 1440×900 die komplette erste Bildschirmhöhe
  // belegt und die Modelle unter die Kante drückt — Kampagnenseiten dürfen das,
  // eine Übersicht nicht. Sie überschreiben das per `ratio`.
  ratio = 'aspect-[4/5] sm:aspect-[3/2] lg:aspect-[21/9]',
  priority = false,
  imgClassName = '',
  children,
}) {
  const { image, position } = usePageHero(slot, fallback)

  return (
    <div className={`relative w-full overflow-hidden bg-[#EDEAE3] ${ratio}`}>
      <img
        src={image}
        alt={alt}
        className={`w-full h-full object-cover ${imgClassName}`}
        style={{ objectPosition: position }}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
      />
      {children}
    </div>
  )
}
