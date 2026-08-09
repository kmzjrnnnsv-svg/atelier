/**
 * Rückfallbilder für die redaktionellen Flächen der Website.
 *
 * Wichtig: Das hier sind *Fallbacks* für die redaktionellen Kacheln. Die
 * Kopfbilder der öffentlichen Seiten sind entfallen — die Seiten beginnen
 * jetzt direkt mit ihrem Inhalt.
 *
 * Regel für neue Einträge — innerhalb einer Seite darf sich kein Foto
 * wiederholen. Vorher lag z. B. auf der Explore-Seite dreimal dasselbe Bild
 * (Header, Kachel „Handwerk", Artikel-Platzhalter), und der Business-Header
 * war identisch mit dem der Kollektion. Über Seitengrenzen hinweg ist eine
 * Wiederverwendung in Ordnung — der Vorrat an Stockfotos ist begrenzt, und
 * mit eigenen Aufnahmen im CMS erübrigt sich die Frage ohnehin.
 *
 * Quelle: Unsplash (kommerziell nutzbar, keine Namensnennung nötig).
 */

const UNS = (id, w = 1200) => `https://images.unsplash.com/${id}?w=${w}&q=80&fit=crop&auto=format`

// ── Schuhe ──────────────────────────────────────────────────────────────────
export const SHOES = {
  hero:          UNS('photo-1472927321085-bce6a75e1025', 1600),  // Braune Rahmengenähte
  editorial:     UNS('photo-1614252235316-8c857d38b5f4', 1200),  // Elegante Lederschuhe
  onSurface:     UNS('photo-1560343090-f0409e92791a', 1200),     // Schuhe auf Fläche
  dressShoes:    UNS('photo-1533867617858-e7b97e060509', 1200),  // Schnürer, braun
  oxfords:       UNS('photo-1595341888016-a392ef81b7de', 1200),  // Oxford, Detail
  loafers:       UNS('photo-1548036328-c9fa89d128fa', 1200),     // Loafer
  boots:         UNS('photo-1520639888713-7851133b1ed0', 1200),  // Chelsea Boots
}

// ── Handwerk ────────────────────────────────────────────────────────────────
export const CRAFT = {
  workshop:      UNS('photo-1565793298595-6a879b1d9492', 1200),  // Werkstatt
  hands:         UNS('photo-1452587925148-ce544e77e70d', 1200),  // Hände bei der Arbeit
  leather:       UNS('photo-1605733160314-4fc7dac4bb16', 1200),  // Lederverarbeitung
  stitching:     UNS('photo-1558618666-fcd25c85f82e', 1200),     // Naht, nah
  tools:         UNS('photo-1581783898377-1c85bf937427', 1200),  // Werkzeug
}

// ── Lifestyle ───────────────────────────────────────────────────────────────
export const LIFESTYLE = {
  walking:       UNS('photo-1460353581641-37baddab0fa2', 1200),  // Gehend
  elegance:      UNS('photo-1542291026-7eec264c27ff', 1200),     // Präsentation
  store:         UNS('photo-1441986300917-64674bd600d8', 1200),  // Interieur
  detail:        UNS('photo-1449505278894-297fdb3edbc1', 1200),  // Leder, Detail
  darkLeather:   UNS('photo-1543163521-1bf539c55dd2', 1200),     // Dunkles Leder
  care:          UNS('photo-1582897085656-c636d006a246', 1200),  // Pflege
}

// ── Explore-Kacheln ─────────────────────────────────────────────────────────
// Adressiert über EXPLORE[section.id]; die Schlüssel entsprechen den
// Sektions-IDs aus dem Explore-CMS. Keiner davon doppelt den Explore-Header
// oder den Artikel-Platzhalter.
export const EXPLORE = {
  editorial:     UNS('photo-1533867617858-e7b97e060509', 1200),
  craft:         UNS('photo-1452587925148-ce544e77e70d', 1200),
  styleguide:    UNS('photo-1460353581641-37baddab0fa2', 1200),
  trends:        UNS('photo-1543163521-1bf539c55dd2', 1200),
  collabs:       UNS('photo-1449505278894-297fdb3edbc1', 1200),
  community:     UNS('photo-1548036328-c9fa89d128fa', 1200),
}
