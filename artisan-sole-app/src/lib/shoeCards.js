/**
 * Zusatzdaten für die Kacheln der Modellübersicht.
 *
 * Warum das nicht einfach in /api/shoes mitkommt: Produkt- und Variantenbilder
 * liegen als base64-Data-URLs in der Datenbank. Die Schuhliste trägt davon
 * schon eines pro Modell; ein zweites für den Hover-Wechsel würde die Antwort
 * etwa verdoppeln, und zwar für jeden Besucher, auch auf dem Telefon, wo es gar
 * keinen Hover gibt.
 *
 * Deshalb zweigeteilt:
 *   • Farben (nur Hex + Name, wenige Kilobyte) — einmal gebündelt für alle.
 *   • Zweitansicht — erst wenn der Zeiger die Kachel wirklich berührt, und
 *     danach im Modul gemerkt.
 */
import { useEffect, useState } from 'react'
import { apiFetch } from '../hooks/useApi'

// ── Farben aller Modelle ───────────────────────────────────────────────────
let colorCache = null
let colorInflight = null

function loadColors() {
  if (colorCache) return Promise.resolve(colorCache)
  if (!colorInflight) {
    colorInflight = apiFetch('/api/shoes/color-summary')
      .then(d => { colorCache = (d && typeof d === 'object') ? d : {}; return colorCache })
      .catch(() => { colorCache = {}; return colorCache })
      .finally(() => { colorInflight = null })
  }
  return colorInflight
}

/** Farbtöne eines Modells, [] solange nichts geladen ist. */
export function useShoeColors(shoeId) {
  const [colors, setColors] = useState(() => colorCache?.[shoeId] || [])

  useEffect(() => {
    let cancelled = false
    loadColors().then(map => { if (!cancelled) setColors(map?.[shoeId] || []) })
    return () => { cancelled = true }
  }, [shoeId])

  return colors
}

// ── Zweitansicht je Modell ─────────────────────────────────────────────────
// null = geladen, aber es gibt keine; undefined = noch nicht geladen.
const hoverCache = new Map()
const hoverInflight = new Map()

function loadHoverImage(shoeId) {
  if (hoverCache.has(shoeId)) return Promise.resolve(hoverCache.get(shoeId))
  if (!hoverInflight.has(shoeId)) {
    const req = apiFetch(`/api/shoes/${shoeId}/hover-image`)
      .then(d => { const img = d?.image || null; hoverCache.set(shoeId, img); return img })
      .catch(() => { hoverCache.set(shoeId, null); return null })
      .finally(() => { hoverInflight.delete(shoeId) })
    hoverInflight.set(shoeId, req)
  }
  return hoverInflight.get(shoeId)
}

/**
 * Zweitansicht, geladen sobald `active` einmal true war.
 * Beim allerersten Überfahren eines Modells kann sie einen Moment später
 * eintreffen — die Kachel blendet sie dann über. Jedes weitere Mal sitzt sie
 * sofort, weil sie im Modul gemerkt bleibt.
 */
export function useHoverImage(shoeId, active) {
  const [image, setImage] = useState(() => hoverCache.get(shoeId) ?? null)

  useEffect(() => {
    if (!active) return
    let cancelled = false
    loadHoverImage(shoeId).then(img => { if (!cancelled) setImage(img) })
    return () => { cancelled = true }
  }, [shoeId, active])

  return image
}
