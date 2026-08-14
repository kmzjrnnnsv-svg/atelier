import { create } from 'zustand'
import { apiFetch } from '../hooks/useApi'
import { refAusUrl, refMerken, refLesen, refVergessen } from '../lib/affiliateCode'

/**
 * Der Warenkorb liegt zweimal: im Konto und auf dem Gerät.
 *
 * Im Konto, damit er vom Telefon auf den Rechner mitkommt. Auf dem Gerät,
 * weil ein Gast kein Konto hat — und gerade er soll seinen Korb behalten. Wer
 * im Laden einen QR-Code scannt, stellt sich einen Schuh zusammen und meldet
 * sich erst an, wenn er wirklich bestellt; bis dahin lag der Korb allein im
 * Arbeitsspeicher und war beim nächsten Seitenaufruf leer.
 */
const WK_KEY = 'as_cart'
function warenkorbLesen() {
  try {
    const v = localStorage.getItem(WK_KEY)
    if (v) { const a = JSON.parse(v); if (Array.isArray(a)) return a }
  } catch { /* ohne Speicher bleibt der Korb flüchtig */ }
  return []
}
function warenkorbSchreiben(cart) {
  try {
    if (Array.isArray(cart) && cart.length) localStorage.setItem(WK_KEY, JSON.stringify(cart))
    else localStorage.removeItem(WK_KEY)
  } catch { /* ohne Speicher bleibt der Korb flüchtig */ }
}

// Debounced cart sync, avoids race conditions when removing items quickly
let _syncTimer = null
function debouncedSyncCart(getFn) {
  // Lokal sofort: Ein Neuladen darf den Korb nicht um 300 ms verpassen.
  warenkorbSchreiben(getFn().cart)
  clearTimeout(_syncTimer)
  _syncTimer = setTimeout(() => {
    const cart = getFn().cart
    apiFetch('/api/auth/me/cart', { method: 'PUT', body: JSON.stringify({ cart }) }).catch(() => {})
  }, 300)
}

// Fußmaße lokal persistieren, damit sie auch für Gäste (ohne Login) über
// Reloads und Seitenwechsel erhalten bleiben. localStorage UND Cookie als
// Fallback (manche Umgebungen/iframes blockieren localStorage).
const FM_KEY = 'as_foot_measurements'
function readLocalMeasurements() {
  try { const v = localStorage.getItem(FM_KEY); if (v) return JSON.parse(v) } catch {}
  try {
    const m = document.cookie.match(/(?:^|;\s*)as_fm=([^;]+)/)
    if (m) return JSON.parse(decodeURIComponent(m[1]))
  } catch {}
  return null
}
function writeLocalMeasurements(m) {
  try { m ? localStorage.setItem(FM_KEY, JSON.stringify(m)) : localStorage.removeItem(FM_KEY) } catch {}
  try {
    if (m) document.cookie = `as_fm=${encodeURIComponent(JSON.stringify(m))}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
    else document.cookie = 'as_fm=; path=/; max-age=0'
  } catch {}
}

// Client-side cache, source of truth is the backend DB
const useStore = create((set, get) => ({
  shoes:      [],
  favorites:  [],   // string shoe IDs
  orders:     [],
  cart:       warenkorbLesen(),   // items in shopping cart (not yet ordered)
  faqs:       [],
  latestScan:  null, // most recent foot scan for this user
  averagedScan: null, // Bayesian-weighted average of all user scans
  footNotes:   '',   // user-level persistent foot notes
  footMeasurements: null, // { foot_length_mm, ball_girth_mm, fit_adjust, saved_fit }
  shoeMaterials: [],
  shoeColors:   [],
  shoeSoles:    [],
  accessories:  [],          // all accessories from DB
  myCampaigns:  [],          // Firmen-Aktionen, in denen der Kunde Mitglied ist
  affiliate:   null,        // { code, gift, customer_discount_pct, discount_cap } aus ?ref=
  shoeAccessoryMap: {},      // { shoeId: [accessory, ...] }
  loyaltyTiers: [],
  loyaltyStatus: { points: 0, tier: 'bronze' },
  savedDeliveryAddress: null, // persisted delivery address
  savedBillingAddress:  null, // persisted billing address
  notifications: [], // in-app notifications
  reminders:  [],    // items user wants to be reminded about
  loading:    false,
  error:      null,

  // --- NOTIFICATIONS ---
  addNotification(notification) {
    const n = { id: Date.now(), read: false, createdAt: new Date().toISOString(), ...notification }
    set(s => ({ notifications: [n, ...s.notifications] }))
  },
  markNotificationRead(id) {
    set(s => ({ notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n) }))
  },
  markAllNotificationsRead() {
    set(s => ({ notifications: s.notifications.map(n => ({ ...n, read: true })) }))
  },

  // --- REMINDERS ---
  addReminder(item) {
    const existing = get().reminders
    if (existing.some(r => r.type === item.type && r.itemId === item.itemId)) return
    const r = { id: Date.now(), createdAt: new Date().toISOString(), ...item }
    set(s => ({ reminders: [r, ...s.reminders] }))
    get().addNotification({
      type: 'reminder_set',
      title: 'Erinnerung gesetzt',
      message: `Du wirst benachrichtigt, sobald "${item.label}" verfügbar ist.`,
      icon: 'bell',
    })
  },
  removeReminder(type, itemId) {
    set(s => ({ reminders: s.reminders.filter(r => !(r.type === type && r.itemId === itemId)) }))
  },
  hasReminder(type, itemId) {
    return get().reminders.some(r => r.type === type && r.itemId === itemId)
  },

  // --- CART (persisted to backend) ---
  _syncCart() {
    debouncedSyncCart(get)
  },
  addToCart(item) {
    const existing = get().cart.find(c =>
      item.isAccessory
        ? c.id === item.id
        : c.shoeId === item.shoeId && c.material === item.material && c.color === item.color && c.sole === item.sole
    )
    if (existing) {
      set(s => ({ cart: s.cart.map(c => c.id === existing.id ? { ...c, qty: c.qty + 1 } : c) }))
    } else {
      set(s => ({ cart: [...s.cart, { qty: 1, addedAt: new Date().toISOString(), ...item, id: item.id || Date.now() }] }))
    }
    debouncedSyncCart(get)
  },
  removeFromCart(id) {
    set(s => ({ cart: s.cart.filter(c => c.id !== id) }))
    debouncedSyncCart(get)
  },
  updateCartQty(id, qty) {
    if (qty <= 0) return get().removeFromCart(id)
    set(s => ({ cart: s.cart.map(c => c.id === id ? { ...c, qty } : c) }))
    debouncedSyncCart(get)
  },
  clearCart() {
    set({ cart: [] })
    warenkorbSchreiben([])
    clearTimeout(_syncTimer)
    apiFetch('/api/auth/me/cart', { method: 'PUT', body: JSON.stringify({ cart: [] }) }).catch(() => {})
  },

  /**
   * Den Werbecode aus dem Link aufnehmen und prüfen.
   *
   * Läuft bei jedem Start: Ein neuer ?ref= in der Adresse ersetzt einen
   * gemerkten, sonst gilt der gemerkte weiter. Ist er ungültig oder der
   * Affiliate nicht mehr aktiv, wird er verworfen statt bis zur Kasse
   * mitgeschleppt — dort fiele es sonst zum denkbar schlechtesten Zeitpunkt auf.
   */
  async affiliatePruefen() {
    const ausUrl = refAusUrl()
    if (ausUrl) refMerken(ausUrl)
    const code = ausUrl || refLesen()
    if (!code) { set({ affiliate: null }); return null }
    try {
      const r = await apiFetch(`/api/affiliates/validate/${encodeURIComponent(code)}`)
      if (!r?.valid) { refVergessen(); set({ affiliate: null }); return null }
      const v = {
        code: r.code,
        gift: r.gift || null,
        // Die Zugabe mit Namen, Bild und Ladenpreis — damit sie im Warenkorb
        // als Artikel dasteht und nicht als Schlüssel.
        gift_item: r.gift_item || null,
        customer_discount_pct: Number(r.customer_discount_pct) || 0,
        // Euro-Grenze des Nachlasses. Der Affiliate zahlt ihn aus seiner
        // Provision, und die ist je Paar gedeckelt.
        discount_cap: Number(r.discount_cap) || 0,
      }
      set({ affiliate: v })
      return v
    } catch (e) {
      // Eine klare Absage des Servers wird auch als solche behandelt: Der Code
      // gilt nicht (404) oder er ist der eigene (409). Ihn weiter mitzuführen
      // hieße, ihn bei jedem Start erneut anzubieten und jedes Mal wieder
      // abzuweisen. Netzwerkfehler dagegen sind kein Grund, ihn wegzuwerfen —
      // beim nächsten Start wird erneut geprüft.
      if (e?.status === 404 || e?.status === 409) refVergessen()
      set({ affiliate: null })
      return null
    }
  },

  affiliateEntfernen() {
    refVergessen()
    set({ affiliate: null })
  },

  async initStore() {
    set({ loading: true, error: null })
    try {
      // Die Reihenfolge hier muss Zeile für Zeile zur Liste unten passen.
      // Sie tat es nicht: Eine Stelle für `settings` stand in der Zuweisung,
      // ohne dass etwas abgerufen wurde — ab da war alles um eins verschoben.
      // Die Fußmaße bekamen deshalb nie die Werte vom Server (nur den lokalen
      // Notbehelf), und die gespeicherte Lieferadresse bekam den Warenkorb.
      const [shoes, favs, orders, faqs, scans, mats, cols, soles, accs, accByShoe, loyaltyTiers, loyaltyStatus, footNotesData, addressData, cartData, footMeasData, myCampaigns] = await Promise.all([
        apiFetch('/api/shoes').catch(() => []),
        apiFetch('/api/favorites/mine').catch(() => []),
        apiFetch('/api/orders/mine').catch(() => []),
        apiFetch('/api/faqs').catch(() => []),
        apiFetch('/api/scans/mine').catch(() => []),
        apiFetch('/api/materials').catch(() => []),
        apiFetch('/api/colors').catch(() => []),
        apiFetch('/api/soles').catch(() => []),
        apiFetch('/api/accessories').catch(() => []),
        apiFetch('/api/accessories/by-shoe').catch(() => ({})),
        apiFetch('/api/loyalty/tiers').catch(() => []),
        apiFetch('/api/loyalty/my-status').catch(() => ({ points: 0, tier: 'bronze' })),
        apiFetch('/api/auth/me/foot-notes').catch(() => ({ foot_notes: '' })),
        apiFetch('/api/auth/me/addresses').catch(() => ({ delivery: null, billing: null })),
        apiFetch('/api/auth/me/cart').catch(() => ({ cart: [] })),
        apiFetch('/api/auth/me/foot-measurements').catch(() => ({ foot_measurements: null })),
        // Firmen-Aktionen, an denen dieser Kunde teilnimmt. Der Rabatt daraus
        // wird im Konfigurator auf den Preis gerechnet, ohne dass jemand einen
        // Code eingibt — die Teilnahme hängt an der Adresse.
        apiFetch('/api/business/campaigns/mine').catch(() => []),
      ])
      set({
        shoes:      shoes.map(normalizeShoe),
        favorites:  favs.map(r => String(r.shoe_id)),
        orders,
        faqs,
        latestScan: Array.isArray(scans) && scans.length > 0 ? scans[0] : null,
        shoeMaterials: Array.isArray(mats) ? mats : [],
        shoeColors:    Array.isArray(cols) ? cols : [],
        shoeSoles:     Array.isArray(soles) ? soles : [],
        accessories:   Array.isArray(accs) ? accs.filter(a => a.is_active) : [],
        shoeAccessoryMap: accByShoe || {},
        loyaltyTiers: Array.isArray(loyaltyTiers) ? loyaltyTiers.map(normalizeLoyaltyTier) : [],
        loyaltyStatus: loyaltyStatus || { points: 0, tier: 'bronze' },
        footNotes: footNotesData?.foot_notes || '',
        footMeasurements: footMeasData?.foot_measurements || readLocalMeasurements(),
        savedDeliveryAddress: addressData?.delivery || null,
        savedBillingAddress:  addressData?.billing  || null,
        cart: Array.isArray(cartData?.cart) && cartData.cart.length > 0 ? cartData.cart : get().cart,
        myCampaigns: Array.isArray(myCampaigns) ? myCampaigns : [],
        loading:    false,
      })
      // Hat der Korb aus dem Konto gewonnen, muss die Kopie auf dem Gerät
      // nachziehen — sonst holt der nächste Seitenaufruf den alten zurück.
      warenkorbSchreiben(get().cart)
    } catch (e) {
      set({ error: e?.error || 'Failed to load', loading: false })
    }
  },

  // --- FAVORITES ---
  // Returns 'unauthenticated' if no session; call sites should redirect to /login.
  async toggleFavorite(shoeId) {
    const id = String(shoeId)
    const isFav = get().favorites.includes(id)
    try {
      if (isFav) {
        await apiFetch(`/api/favorites/${id}`, { method: 'DELETE' })
        set(s => ({ favorites: s.favorites.filter(f => f !== id) }))
      } else {
        await apiFetch(`/api/favorites/${id}`, { method: 'POST' })
        set(s => ({ favorites: [...s.favorites, id] }))
      }
    } catch (err) {
      if (err?.status === 401) return 'unauthenticated'
      throw err
    }
  },

  // --- SCANS ---
  async refreshScan() {
    const scans = await apiFetch('/api/scans/mine').catch(() => [])
    set({ latestScan: Array.isArray(scans) && scans.length > 0 ? scans[0] : null })
    // Also fetch Bayesian average for returning users
    const avg = await apiFetch('/api/scans/my-average').catch(() => null)
    set({ averagedScan: avg })
  },

  // --- FOOT NOTES ---
  async saveFootNotes(notes) {
    const res = await apiFetch('/api/auth/me/foot-notes', {
      method: 'PUT',
      body: JSON.stringify({ foot_notes: notes }),
    })
    set({ footNotes: res.foot_notes || '' })
  },

  // --- FOOT MEASUREMENTS & FIT ---
  async saveFootMeasurements(m) {
    // Leeres Maß-Paar → Passform zurücksetzen (lokal + Konto).
    const clearing = m == null || m.foot_length_mm == null || m.foot_length_mm === ''
    if (clearing) {
      writeLocalMeasurements(null)
      apiFetch('/api/auth/me/foot-measurements', { method: 'PUT', body: JSON.stringify({ foot_length_mm: null, ball_girth_mm: null }) }).catch(() => {})
      set({ footMeasurements: null })
      return null
    }
    // Immer lokal sichern (Gast + Reload), dann versuchen aufs Konto zu speichern.
    writeLocalMeasurements(m)
    let saved = m
    try {
      const res = await apiFetch('/api/auth/me/foot-measurements', {
        method: 'PUT',
        body: JSON.stringify(m),
      })
      if (res?.foot_measurements) { saved = res.foot_measurements; writeLocalMeasurements(saved) }
    } catch { /* Gast oder offline, lokale Persistenz genügt */ }
    set({ footMeasurements: saved })
    return saved
  },

  // Ermittelt die best-passende Leisten×Weite×Größe. Transient (kein State).
  // Gibt { ok, matches } zurück: ok=false signalisiert einen Übertragungs-
  // fehler (z. B. Rate-Limit), der NICHT mit „keine Passform" verwechselt
  // werden darf — ein leeres matches bei ok=true ist die echte Absage.
  // `girth` darf fehlen: Dann rastet der Server nur nach der Länge und nimmt
  // die Weite, die hier als `width` mitkommt (ohne Angabe: Normalweite).
  async matchFit({ category, length, girth, width, tolerance = 5 }) {
    const q = new URLSearchParams({
      category: category || '',
      length: String(length),
      tolerance: String(tolerance),
    })
    if (Number.isFinite(Number(girth))) q.set('girth', String(girth))
    else if (width) q.set('width', String(width))
    try {
      const res = await apiFetch(`/api/fit/match?${q.toString()}`)
      return { ok: true, matches: Array.isArray(res?.matches) ? res.matches : [] }
    } catch {
      return { ok: false, matches: [] }
    }
  },

  // Welche Leisten/Kategorien passen zu den Maßen (für Collection-Filter).
  async fitFeasibility({ length, girth, tolerance = 5 }) {
    const q = new URLSearchParams({ length: String(length), girth: String(girth), tolerance: String(tolerance) })
    return apiFetch(`/api/fit/feasible?${q.toString()}`)
      .catch(() => ({ lasts: [], categories: [], knownCategories: [] }))
  },

  async sendFitFeedback(verdict, nudge) {
    const body = nudge ? nudge : { verdict }
    const res = await apiFetch('/api/auth/me/fit-feedback', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    set({ footMeasurements: res.foot_measurements || null })
    return res.foot_measurements || null
  },

  // --- SAVED CONFIGURATIONS (nur eingeloggt) ---
  async fetchConfigurations() {
    const res = await apiFetch('/api/auth/me/configurations').catch(() => ({ configurations: [] }))
    return Array.isArray(res?.configurations) ? res.configurations : []
  },
  async saveConfiguration(config) {
    const res = await apiFetch('/api/auth/me/configurations', {
      method: 'POST',
      body: JSON.stringify({ config }),
    })
    return res
  },
  async deleteConfiguration(id) {
    const res = await apiFetch(`/api/auth/me/configurations/${id}`, { method: 'DELETE' })
    return Array.isArray(res?.configurations) ? res.configurations : []
  },

  // --- SAVED ADDRESSES ---
  async saveAddresses(delivery, billing) {
    const res = await apiFetch('/api/auth/me/addresses', {
      method: 'PUT',
      body: JSON.stringify({ delivery, billing }),
    })
    set({ savedDeliveryAddress: res.delivery, savedBillingAddress: res.billing })
  },

  // --- ORDERS ---
  async placeOrder(data) {
    const row = await apiFetch('/api/orders', { method: 'POST', body: JSON.stringify(data) })
    set(s => ({ orders: [row, ...s.orders] }))
    return row
  },

  async validateCoupon(code, orderTotal) {
    return apiFetch('/api/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({ code, order_total: orderTotal }),
    })
  },

  async validateBusinessCode(code, shoeId) {
    const q = new URLSearchParams({ code })
    if (shoeId != null) q.set('shoe_id', String(shoeId))
    return apiFetch(`/api/business/codes/validate?${q.toString()}`)
  },

  // ── B2B-Kampagnen ──────────────────────────────────────────────────────────
  // Mitglieder-Sicht
  async fetchMyCampaigns() { return apiFetch('/api/business/campaigns/mine') },
  async fetchCampaignBySlug(slug) { return apiFetch(`/api/business/campaigns/by-slug/${encodeURIComponent(slug)}`) },
  async joinCampaign(slug) { return apiFetch(`/api/business/campaigns/${encodeURIComponent(slug)}/join`, { method: 'POST' }) },
  async resendVerification() { return apiFetch('/api/auth/resend-verification', { method: 'POST' }) },
  // Inhaber-Sicht
  async fetchOwnerCampaigns() { return apiFetch('/api/business/me/campaigns') },
  async createCampaign(data) { return apiFetch('/api/business/me/campaigns', { method: 'POST', body: JSON.stringify(data) }) },
  async updateCampaign(id, data) { return apiFetch(`/api/business/me/campaigns/${id}`, { method: 'PUT', body: JSON.stringify(data) }) },
  async fetchCampaignDashboard(id) { return apiFetch(`/api/business/me/campaigns/${id}/dashboard`) },
  async addCampaignInvites(id, emails) { return apiFetch(`/api/business/me/campaigns/${id}/invites`, { method: 'POST', body: JSON.stringify({ emails }) }) },

  // --- FAQS (CMS) ---
  async fetchFaqs() {
    const rows = await apiFetch('/api/faqs')
    set({ faqs: rows })
  },
  async addFaq(faq) {
    const row = await apiFetch('/api/faqs', { method: 'POST', body: JSON.stringify(faq) })
    set(s => ({ faqs: [...s.faqs, row] }))
    return row
  },
  async updateFaq(id, updates) {
    const row = await apiFetch(`/api/faqs/${id}`, { method: 'PUT', body: JSON.stringify(updates) })
    set(s => ({ faqs: s.faqs.map(f => f.id == id ? row : f) }))
    return row
  },
  async deleteFaq(id) {
    await apiFetch(`/api/faqs/${id}`, { method: 'DELETE' })
    set(s => ({ faqs: s.faqs.filter(f => f.id != id) }))
  },

  // --- SHOES ---
  async addShoe(shoe) {
    const row = await apiFetch('/api/shoes', { method: 'POST', body: JSON.stringify(shoeToApi(shoe)) })
    const normalized = normalizeShoe(row)
    set(s => ({ shoes: [...s.shoes, normalized] }))
    return normalized
  },
  async updateShoe(id, updates) {
    const existing = get().shoes.find(s => s.id == id)
    const row = await apiFetch(`/api/shoes/${id}`, { method: 'PUT', body: JSON.stringify(shoeToApi({ ...existing, ...updates })) })
    const normalized = normalizeShoe(row)
    set(s => ({ shoes: s.shoes.map(sh => sh.id == id ? normalized : sh) }))
    return normalized
  },
  async deleteShoe(id) {
    await apiFetch(`/api/shoes/${id}`, { method: 'DELETE' })
    set(s => ({ shoes: s.shoes.filter(sh => sh.id != id) }))
  },

  // --- CURATED ---

  // --- WARDROBE ---

  // --- OUTFITS ---

  // --- SHOE MATERIALS ---
  async addMaterial(m) {
    const row = await apiFetch('/api/materials', { method: 'POST', body: JSON.stringify(m) })
    set(s => ({ shoeMaterials: [...s.shoeMaterials, row] }))
  },
  async updateMaterial(id, u) {
    const row = await apiFetch(`/api/materials/${id}`, { method: 'PUT', body: JSON.stringify(u) })
    set(s => ({ shoeMaterials: s.shoeMaterials.map(m => m.id == id ? row : m) }))
  },
  async deleteMaterial(id) {
    await apiFetch(`/api/materials/${id}`, { method: 'DELETE' })
    set(s => ({ shoeMaterials: s.shoeMaterials.filter(m => m.id != id) }))
  },

  // --- SHOE COLORS ---
  async addColor(c) {
    const row = await apiFetch('/api/colors', { method: 'POST', body: JSON.stringify(c) })
    set(s => ({ shoeColors: [...s.shoeColors, row] }))
  },
  async updateColor(id, u) {
    const row = await apiFetch(`/api/colors/${id}`, { method: 'PUT', body: JSON.stringify(u) })
    set(s => ({ shoeColors: s.shoeColors.map(c => c.id == id ? row : c) }))
  },
  async deleteColor(id) {
    await apiFetch(`/api/colors/${id}`, { method: 'DELETE' })
    set(s => ({ shoeColors: s.shoeColors.filter(c => c.id != id) }))
  },

  // --- SHOE SOLES ---
  async addSole(s2) {
    const row = await apiFetch('/api/soles', { method: 'POST', body: JSON.stringify(s2) })
    set(s => ({ shoeSoles: [...s.shoeSoles, row] }))
  },
  async updateSole(id, u) {
    const row = await apiFetch(`/api/soles/${id}`, { method: 'PUT', body: JSON.stringify(u) })
    set(s => ({ shoeSoles: s.shoeSoles.map(s2 => s2.id == id ? row : s2) }))
  },
  async deleteSole(id) {
    await apiFetch(`/api/soles/${id}`, { method: 'DELETE' })
    set(s => ({ shoeSoles: s.shoeSoles.filter(s2 => s2.id != id) }))
  },

  // --- EXPLORE SECTIONS ---

  // --- LOYALTY TIERS ---
  async fetchLoyaltyTiers() {
    const rows = await apiFetch('/api/loyalty/tiers')
    set({ loyaltyTiers: rows.map(normalizeLoyaltyTier) })
  },
  async addLoyaltyTier(tier) {
    const row = await apiFetch('/api/loyalty/tiers', { method: 'POST', body: JSON.stringify(loyaltyTierToApi(tier)) })
    set(s => ({ loyaltyTiers: [...s.loyaltyTiers, normalizeLoyaltyTier(row)] }))
  },
  async updateLoyaltyTier(id, updates) {
    const existing = get().loyaltyTiers.find(t => t.id == id)
    const row = await apiFetch(`/api/loyalty/tiers/${id}`, { method: 'PUT', body: JSON.stringify(loyaltyTierToApi({ ...existing, ...updates })) })
    set(s => ({ loyaltyTiers: s.loyaltyTiers.map(t => t.id == id ? normalizeLoyaltyTier(row) : t) }))
  },
  async deleteLoyaltyTier(id) {
    await apiFetch(`/api/loyalty/tiers/${id}`, { method: 'DELETE' })
    set(s => ({ loyaltyTiers: s.loyaltyTiers.filter(t => t.id != id) }))
  },

  // --- ARTICLES ---
}))

// DB snake_case → app camelCase
function normalizeShoe(r) {
  return { id: String(r.id), slug: r.slug || null, model_3d: r.model_3d || null, name: r.name, category: r.category, price: r.price, material: r.material, match: r.match_pct || '', color: r.color, tag: r.tag || null, image: r.image_data || null, ...('hover_image_data' in r ? { hover_image: r.hover_image_data || null } : {}), cost_price: r.cost_price ?? '', promotion_price: r.promotion_price || '', tagline: r.tagline || '', description: r.description || '', locked_decoration: r.locked_decoration || '',
    express: Number(r.express) ? 1 : 0,
    express_surcharge: r.express_surcharge ?? 100,
    express_weeks: r.express_weeks ?? 2,
    express_groups: r.express_groups ?? '[]',
    collection: r.collection || 'standard' }
}

function normalizeLoyaltyTier(r) {
  return {
    id: String(r.id),
    key: r.key,
    label: r.label,
    minPoints: r.min_points || 0,
    color: r.color || '#000000',
    icon: r.icon || 'Award',
    description: r.description || null,
    benefits: (() => { try { return JSON.parse(r.benefits || '[]') } catch { return [] } })(),
    visible: r.visible === 1 || r.visible === true,
    sortOrder: r.sort_order || 0,
  }
}
function loyaltyTierToApi(t) {
  return {
    key: t.key,
    label: t.label,
    min_points: t.minPoints || 0,
    color: t.color || '#000000',
    icon: t.icon || 'Award',
    description: t.description || null,
    benefits: JSON.stringify(t.benefits || []),
    visible: t.visible ? 1 : 0,
    sort_order: t.sortOrder || 0,
  }
}


function shoeToApi(s) {
  // Bildfelder nur mitschicken, wenn das Formular sie wirklich kennt — sonst
  // überschriebe ein Speichern aus einem Kontext ohne diese Felder (etwa aus
  // der Schuhliste, die sie aus Gewichtsgründen nicht liefert) die
  // hinterlegten Bilder mit null.
  const imageFields = {}
  // model_3d wie die Bildfelder nur mitschicken, wenn das Formular es kennt.
  if (s.model_3d !== undefined) imageFields.model_3d = s.model_3d || null
  if (s.default_images !== undefined) {
    const gallery = Array.isArray(s.default_images) ? s.default_images : []
    imageFields.default_images = JSON.stringify(gallery)
    // Die beiden Einzelfelder bleiben gespiegelt: Kollektionskachel,
    // Wunschliste, Warenkorb und Bestellungen lesen weiterhin von dort.
    imageFields.image_data = gallery[0] || null
    imageFields.hover_image_data = gallery[1] || null
  } else if (s.hover_image !== undefined) {
    imageFields.hover_image_data = s.hover_image || null
  }
  // Express-Angaben nur mitschicken, wenn das Formular sie kennt — dieselbe
  // Vorsicht wie bei den Bildern. Ein Speichern aus der Liste heraus dürfte
  // ein Express-Modell sonst stillschweigend zurück in die Maßanfertigung
  // stellen.
  const express = {}
  if (s.express !== undefined) {
    express.express = Number(s.express) ? 1 : 0
    express.express_surcharge = Number(s.express_surcharge) || 0
    express.express_weeks = Math.max(1, Number(s.express_weeks) || 2)
    // Immer als gültiges JSON-Array, auch wenn im Formular Unsinn steht —
    // ein kaputter Wert in dieser Spalte blendete im Konfigurator sonst
    // sämtliche Auswahl aus, ohne dass jemand den Zusammenhang sähe.
    express.collection = s.collection || (Number(s.express) ? 'express' : 'standard')
    express.express_groups = (() => {
      try {
        const l = JSON.parse(s.express_groups || '[]')
        return JSON.stringify(Array.isArray(l) ? l.filter(x => typeof x === 'string') : [])
      } catch { return '[]' }
    })()
  }
  return { name: s.name, category: s.category, price: s.price, material: s.material, match_pct: s.match, color: s.color, tag: s.tag || null, image_data: s.image || null, ...imageFields, ...express, cost_price: s.cost_price ? parseFloat(s.cost_price) : null, promotion_price: s.promotion_price || null, tagline: s.tagline || null, description: s.description || null }
}

// Sort: featured first, then by sortOrder, then by id

export default useStore
