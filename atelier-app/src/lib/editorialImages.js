/**
 * Editorial images for LV-style pages.
 * All from Unsplash (free for commercial use, no attribution required).
 * Update URLs here to change images across all pages at once.
 */

const UNS = (id, w = 1200) => `https://images.unsplash.com/${id}?w=${w}&q=80&fit=crop&auto=format`

// ── Shoes & Fashion ─────────────────────────────────────────────────────────
export const SHOES = {
  hero:          UNS('photo-1472927321085-bce6a75e1025', 1600),  // Brown leather dress shoes
  editorial1:    UNS('photo-1614252235316-8c857d38b5f4', 1200),  // Elegant leather shoes
  editorial2:    UNS('photo-1560343090-f0409e92791a', 1200),     // Shoes on surface
  dressShoes:    UNS('photo-1533867617858-e7b97e060509', 1200),  // Brown dress shoes with laces
  oxfords:       UNS('photo-1595341888016-a392ef81b7de', 1200),  // Oxford shoe detail
  loafers:       UNS('photo-1548036328-c9fa89d128fa', 1200),     // Loafer style
  boots:         UNS('photo-1520639888713-7851133b1ed0', 1200),  // Chelsea boots
}

// ── Craftsmanship & Workshop ────────────────────────────────────────────────
export const CRAFT = {
  workshop:      UNS('photo-1565793298595-6a879b1d9492', 1200),  // Workshop tools
  hands:         UNS('photo-1452587925148-ce544e77e70d', 1200),  // Artisan hands working
  leather:       UNS('photo-1605733160314-4fc7dac4bb16', 1200),  // Leather crafting
  stitching:     UNS('photo-1558618666-fcd25c85f82e', 1200),     // Close-up stitching
  tools:         UNS('photo-1581783898377-1c85bf937427', 1200),  // Craft tools laid out
}

// ── Materials & Textures ────────────────────────────────────────────────────
export const MATERIALS = {
  leatherBrown:  UNS('photo-1558618666-fcd25c85f82e', 1200),    // Brown leather texture
  leatherBlack:  UNS('photo-1543163521-1bf539c55dd2', 1200),    // Dark leather
  fabric:        UNS('photo-1558171813-4c088753af8f', 1200),    // Fabric texture
  wood:          UNS('photo-1558618666-fcd25c85f82e', 800),     // Wooden surface
}

// ── Lifestyle & Editorial ───────────────────────────────────────────────────
export const LIFESTYLE = {
  walking:       UNS('photo-1460353581641-37baddab0fa2', 1200),  // Person walking
  suit:          UNS('photo-1507003211169-0a1dd7228f2d', 1200),  // Man in suit
  store:         UNS('photo-1441986300917-64674bd600d8', 1200),  // Luxury interior
  detail:        UNS('photo-1617606002806-94e279c22f4c', 1200),  // Fashion detail
}

// ── Accessories & Care ──────────────────────────────────────────────────────
export const CARE = {
  polish:        UNS('photo-1582897085656-c636d006a246', 1200),  // Shoe care
  brushes:       UNS('photo-1585123334904-845d60e97b29', 1200),  // Care tools
  cream:         UNS('photo-1586105251261-72a756497a11', 1200),  // Polish/cream
}

// ── Page-specific hero images ───────────────────────────────────────────────
export const HEROES = {
  foryou:        UNS('photo-1472927321085-bce6a75e1025', 1600),
  collection:    UNS('photo-1614252235316-8c857d38b5f4', 1600),
  explore:       UNS('photo-1452587925148-ce544e77e70d', 1600),
  accessories:   UNS('photo-1582897085656-c636d006a246', 1600),
  profile:       UNS('photo-1507003211169-0a1dd7228f2d', 1200),
}

// ── Explore section images ──────────────────────────────────────────────────
export const EXPLORE = {
  editorial:     UNS('photo-1472927321085-bce6a75e1025', 1200),  // Editorial
  craft:         UNS('photo-1452587925148-ce544e77e70d', 1200),  // Handwerk
  styleguide:    UNS('photo-1460353581641-37baddab0fa2', 1200),  // Style
  trends:        UNS('photo-1558618666-fcd25c85f82e', 1200),     // Materials/Trends
  collabs:       UNS('photo-1441986300917-64674bd600d8', 1200),  // Limited editions
  community:     UNS('photo-1507003211169-0a1dd7228f2d', 1200),  // Community
}
