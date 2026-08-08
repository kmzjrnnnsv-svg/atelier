/**
 * Bild-URLs aus dem CMS auflösen.
 *
 * Die Media-Library speichert Pfade relativ ('/uploads/…'). Im Browser
 * gegen dieselbe Domain genügt das; im iOS-Build und überall dort, wo die
 * API auf einer anderen Domain liegt (VITE_API_URL), läuft ein relativer
 * Pfad dagegen ins Leere. Absolute URLs und Data-URIs bleiben unberührt —
 * die Rückfallbilder aus editorialImages.js sind absolut.
 */
const IMG_API_BASE = import.meta.env.VITE_API_URL || ''

export function resolveMediaUrl(url) {
  if (!url) return url
  if (url.startsWith('http') || url.startsWith('data:')) return url
  return `${IMG_API_BASE}${url}`
}
