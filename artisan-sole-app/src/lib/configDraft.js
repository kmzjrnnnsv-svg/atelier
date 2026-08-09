/**
 * Konfigurations-Entwurf: laufend sichern, statt ihn durch den Browser zu tragen.
 *
 * Der Konfigurator schreibt bei jeder Änderung in die Datenbank. Die Bestellung
 * verweist später nur noch auf diesen Entwurf, und der Server liest die
 * Fertigungsangaben von dort.
 *
 * Anlass: Vorher wanderte die Konfiguration als Zustand durch Konfigurator,
 * Warenkorb und Kasse. Jede Stelle baute das Produktobjekt neu zusammen — und
 * wer ein Feld vergaß, verlor es lautlos. Beim Direktkauf fehlten so sämtliche
 * Zusatzoptionen in der fertigen Bestellung, ohne Fehlermeldung, ohne Absturz.
 */
import { apiFetch } from '../hooks/useApi'

/** Zufällige Kennung, im Browser erzeugt — damit auch Gäste einen Entwurf haben. */
export function newDraftId() {
  const a = new Uint8Array(16)
  crypto.getRandomValues(a)
  return Array.from(a, b => b.toString(16).padStart(2, '0')).join('')
}

// Gesammelt speichern statt bei jedem Klick: Beim Durchprobieren von Farben
// entstünde sonst ein Schwall von Anfragen.
const timers = new Map()
const lastSent = new Map()

export function saveDraft(id, payload, { delay = 600 } = {}) {
  if (!id) return
  const body = JSON.stringify(payload)
  if (lastSent.get(id) === body) return          // nichts Neues
  clearTimeout(timers.get(id))
  timers.set(id, setTimeout(() => {
    lastSent.set(id, body)
    // Stiller Fehlschlag ist hier vertretbar: Der Entwurf ist Beiwerk, solange
    // der Kunde konfiguriert. Verbindlich wird er erst beim Bestellen, und dort
    // wird das Ergebnis geprüft.
    apiFetch(`/api/configs/${id}`, { method: 'PUT', body }).catch(() => {})
  }, delay))
}

/** Vor dem Bestellen ohne Verzögerung sichern und auf das Ergebnis warten. */
export async function flushDraft(id, payload) {
  if (!id) return false
  clearTimeout(timers.get(id))
  try {
    await apiFetch(`/api/configs/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
    lastSent.set(id, JSON.stringify(payload))
    return true
  } catch {
    return false
  }
}

/** Offener Entwurf dieses Kunden zu diesem Modell — oder null. */
export async function findOpenDraft(shoeId) {
  if (!shoeId) return null
  try { return await apiFetch(`/api/configs/offen/${shoeId}`) } catch { return null }
}

/** Verwerfen: „Nein, ich fange neu an." */
export async function discardDraft(id) {
  if (!id) return
  clearTimeout(timers.get(id)); timers.delete(id); lastSent.delete(id)
  try { await apiFetch(`/api/configs/${id}`, { method: 'DELETE' }) } catch { /* egal */ }
}

/**
 * Als „im Warenkorb" markieren. Danach fragt der Konfigurator nicht mehr
 * nach — der Entwurf ist ja weitergereicht und keine liegengebliebene Arbeit.
 */
export async function markInCart(id) {
  if (!id) return
  try { await apiFetch(`/api/configs/${id}/warenkorb`, { method: 'POST', body: JSON.stringify({ in_cart: true }) }) }
  catch { /* egal */ }
}
