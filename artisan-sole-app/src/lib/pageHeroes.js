/**
 * Header-Bilder der öffentlichen Seiten aus dem CMS.
 *
 * Die Konfiguration ist für alle Seiten dieselbe, deshalb wird sie einmal
 * geladen und danach aus dem Modul-Cache bedient — sieben Header sollen keine
 * sieben Anfragen auslösen. Ein Fehlschlag ist unkritisch: dann greifen die
 * Fallbacks aus editorialImages.js, und die Seite sieht aus wie vorher.
 */
import { useEffect, useState } from 'react'
import { apiFetch } from '../hooks/useApi'
import { resolveMediaUrl } from './mediaUrl'

let cache = null      // geladene Konfiguration, { slot: { image, position } }
let inflight = null   // laufende Anfrage, damit parallele Aufrufe sie teilen

function load() {
  if (cache) return Promise.resolve(cache)
  if (!inflight) {
    inflight = apiFetch('/api/settings/page-heroes')
      .then(data => { cache = data && typeof data === 'object' ? data : {}; return cache })
      .catch(() => { cache = {}; return cache })
      .finally(() => { inflight = null })
  }
  return inflight
}

/** Cache verwerfen, damit das CMS nach dem Speichern sofort das Neue zeigt. */
export function invalidatePageHeroes() {
  cache = null
  inflight = null
}

/**
 * Liefert { image, position } für einen Header-Slot.
 * Solange nichts geladen ist (oder nichts hinterlegt wurde), kommt der
 * übergebene Fallback zurück — es gibt also nie ein leeres Bildfeld.
 */
export function usePageHero(slot, fallback) {
  const [entry, setEntry] = useState(() => cache?.[slot] || null)

  useEffect(() => {
    let cancelled = false
    load().then(cfg => { if (!cancelled) setEntry(cfg?.[slot] || null) })
    return () => { cancelled = true }
  }, [slot])

  return {
    image: resolveMediaUrl(entry?.image) || fallback,
    position: entry?.position || 'center',
    // Nur für hinterlegte Bilder — ein Fallback aus editorialImages.js steht
    // nicht auf Weiß und würde durch das Multiplizieren nur trüb.
    tint: !!entry?.image && entry?.tint === true,
  }
}
