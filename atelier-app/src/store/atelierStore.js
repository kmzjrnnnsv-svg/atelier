import { create } from 'zustand'
import { apiFetch } from '../hooks/useApi'

// Client-side cache — source of truth is the backend DB
const useAtelierStore = create((set, get) => ({
  shoes:      [],
  curated:    [],
  wardrobe:   [],
  outfits:    [],
  articles:   [],
  favorites:  [],   // string shoe IDs
  orders:     [],
  cart:       [],   // items in shopping cart (not yet ordered)
  faqs:       [],
  latestScan:  null, // most recent foot scan for this user
  averagedScan: null, // Bayesian-weighted average of all user scans
  footNotes:   '',   // user-level persistent foot notes
  shoeMaterials: [],
  shoeColors:   [],
  shoeSoles:    [],
  accessories:  [],          // all accessories from DB
  shoeAccessoryMap: {},      // { shoeId: [accessory, ...] }
  exploreSections: [],
  exploreHero: { image: null, title: '', subtitle: '' },
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
    const cart = get().cart
    apiFetch('/api/auth/me/cart', { method: 'PUT', body: JSON.stringify({ cart }) }).catch(() => {})
  },
  addToCart(item) {
    const existing = get().cart.find(c => c.shoeId === item.shoeId && c.material === item.material && c.color === item.color && c.sole === item.sole)
    if (existing) {
      set(s => ({ cart: s.cart.map(c => c.id === existing.id ? { ...c, qty: c.qty + 1 } : c) }))
    } else {
      set(s => ({ cart: [...s.cart, { id: Date.now(), qty: 1, addedAt: new Date().toISOString(), ...item }] }))
    }
    setTimeout(() => get()._syncCart(), 0)
  },
  removeFromCart(id) {
    set(s => ({ cart: s.cart.filter(c => c.id !== id) }))
    setTimeout(() => get()._syncCart(), 0)
  },
  updateCartQty(id, qty) {
    if (qty <= 0) return get().removeFromCart(id)
    set(s => ({ cart: s.cart.map(c => c.id === id ? { ...c, qty } : c) }))
    setTimeout(() => get()._syncCart(), 0)
  },
  clearCart() {
    set({ cart: [] })
    get()._syncCart()
  },

  async initStore() {
    set({ loading: true, error: null })
    try {
      const [shoes, curated, wardrobe, outfits, articles, favs, orders, faqs, scans, mats, cols, soles, accs, accByShoe, expSections, settings, loyaltyTiers, loyaltyStatus, footNotesData, addressData, cartData] = await Promise.all([
        apiFetch('/api/shoes').catch(() => []),
        apiFetch('/api/curated').catch(() => []),
        apiFetch('/api/wardrobe').catch(() => []),
        apiFetch('/api/outfits').catch(() => []),
        apiFetch('/api/articles').catch(() => []),
        apiFetch('/api/favorites/mine').catch(() => []),
        apiFetch('/api/orders/mine').catch(() => []),
        apiFetch('/api/faqs').catch(() => []),
        apiFetch('/api/scans/mine').catch(() => []),
        apiFetch('/api/materials').catch(() => []),
        apiFetch('/api/colors').catch(() => []),
        apiFetch('/api/soles').catch(() => []),
        apiFetch('/api/accessories').catch(() => []),
        apiFetch('/api/accessories/by-shoe').catch(() => ({})),
        apiFetch('/api/explore-sections').catch(() => []),
        apiFetch('/api/settings/explore').catch(() => ({})),
        apiFetch('/api/loyalty/tiers').catch(() => []),
        apiFetch('/api/loyalty/my-status').catch(() => ({ points: 0, tier: 'bronze' })),
        apiFetch('/api/auth/me/foot-notes').catch(() => ({ foot_notes: '' })),
        apiFetch('/api/auth/me/addresses').catch(() => ({ delivery: null, billing: null })),
        apiFetch('/api/auth/me/cart').catch(() => ({ cart: [] })),
      ])
      const settingsMap = settings || {}
      set({
        shoes:      shoes.map(normalizeShoe),
        curated:    curated.map(normalizeCurated),
        wardrobe:   wardrobe.map(normalizeWardrobe),
        outfits:    outfits.map(normalizeOutfit),
        articles:   articles.map(normalizeArticle).sort(articleSort),
        favorites:  favs.map(r => String(r.shoe_id)),
        orders,
        faqs,
        latestScan: Array.isArray(scans) && scans.length > 0 ? scans[0] : null,
        shoeMaterials: Array.isArray(mats) ? mats : [],
        shoeColors:    Array.isArray(cols) ? cols : [],
        shoeSoles:     Array.isArray(soles) ? soles : [],
        accessories:   Array.isArray(accs) ? accs.filter(a => a.is_active) : [],
        shoeAccessoryMap: accByShoe || {},
        exploreSections: Array.isArray(expSections) ? expSections.map(normalizeExploreSection) : [],
        exploreHero: {
          image: settingsMap['explore_hero_image'] || null,
          title: settingsMap['explore_hero_title'] || '',
          subtitle: settingsMap['explore_hero_subtitle'] || '',
        },
        loyaltyTiers: Array.isArray(loyaltyTiers) ? loyaltyTiers.map(normalizeLoyaltyTier) : [],
        loyaltyStatus: loyaltyStatus || { points: 0, tier: 'bronze' },
        footNotes: footNotesData?.foot_notes || '',
        savedDeliveryAddress: addressData?.delivery || null,
        savedBillingAddress:  addressData?.billing  || null,
        cart: Array.isArray(cartData?.cart) && cartData.cart.length > 0 ? cartData.cart : get().cart,
        loading:    false,
      })
    } catch (e) {
      set({ error: e?.error || 'Failed to load', loading: false })
    }
  },

  // --- FAVORITES ---
  async toggleFavorite(shoeId) {
    const id = String(shoeId)
    const isFav = get().favorites.includes(id)
    if (isFav) {
      await apiFetch(`/api/favorites/${id}`, { method: 'DELETE' })
      set(s => ({ favorites: s.favorites.filter(f => f !== id) }))
    } else {
      await apiFetch(`/api/favorites/${id}`, { method: 'POST' })
      set(s => ({ favorites: [...s.favorites, id] }))
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
    set(s => ({ shoes: [...s.shoes, normalizeShoe(row)] }))
  },
  async updateShoe(id, updates) {
    const existing = get().shoes.find(s => s.id == id)
    const row = await apiFetch(`/api/shoes/${id}`, { method: 'PUT', body: JSON.stringify(shoeToApi({ ...existing, ...updates })) })
    set(s => ({ shoes: s.shoes.map(sh => sh.id == id ? normalizeShoe(row) : sh) }))
  },
  async deleteShoe(id) {
    await apiFetch(`/api/shoes/${id}`, { method: 'DELETE' })
    set(s => ({ shoes: s.shoes.filter(sh => sh.id != id) }))
  },

  // --- CURATED ---
  async addCurated(item) {
    const row = await apiFetch('/api/curated', { method: 'POST', body: JSON.stringify(item) })
    set(s => ({ curated: [...s.curated, normalizeCurated(row)] }))
  },
  async updateCurated(id, updates) {
    const row = await apiFetch(`/api/curated/${id}`, { method: 'PUT', body: JSON.stringify(updates) })
    set(s => ({ curated: s.curated.map(c => c.id == id ? normalizeCurated(row) : c) }))
  },
  async deleteCurated(id) {
    await apiFetch(`/api/curated/${id}`, { method: 'DELETE' })
    set(s => ({ curated: s.curated.filter(c => c.id != id) }))
  },

  // --- WARDROBE ---
  async addWardrobeItem(item) {
    const row = await apiFetch('/api/wardrobe', { method: 'POST', body: JSON.stringify(item) })
    set(s => ({ wardrobe: [...s.wardrobe, normalizeWardrobe(row)] }))
  },
  async updateWardrobeItem(id, updates) {
    const row = await apiFetch(`/api/wardrobe/${id}`, { method: 'PUT', body: JSON.stringify(updates) })
    set(s => ({ wardrobe: s.wardrobe.map(w => w.id == id ? normalizeWardrobe(row) : w) }))
  },
  async deleteWardrobeItem(id) {
    await apiFetch(`/api/wardrobe/${id}`, { method: 'DELETE' })
    set(s => ({ wardrobe: s.wardrobe.filter(w => w.id != id) }))
  },

  // --- OUTFITS ---
  async addOutfit(outfit) {
    const row = await apiFetch('/api/outfits', { method: 'POST', body: JSON.stringify(outfitToApi(outfit)) })
    set(s => ({ outfits: [...s.outfits, normalizeOutfit(row)] }))
  },
  async updateOutfit(id, updates) {
    const existing = get().outfits.find(o => o.id == id)
    const row = await apiFetch(`/api/outfits/${id}`, { method: 'PUT', body: JSON.stringify(outfitToApi({ ...existing, ...updates })) })
    set(s => ({ outfits: s.outfits.map(o => o.id == id ? normalizeOutfit(row) : o) }))
  },
  async deleteOutfit(id) {
    await apiFetch(`/api/outfits/${id}`, { method: 'DELETE' })
    set(s => ({ outfits: s.outfits.filter(o => o.id != id) }))
  },

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
  async fetchExploreSections() {
    const rows = await apiFetch('/api/explore-sections')
    set({ exploreSections: rows.map(normalizeExploreSection) })
  },
  async addExploreSection(item) {
    const row = await apiFetch('/api/explore-sections', { method: 'POST', body: JSON.stringify(exploreSectionToApi(item)) })
    set(s => ({ exploreSections: [...s.exploreSections, normalizeExploreSection(row)] }))
  },
  async updateExploreSection(id, updates) {
    const existing = get().exploreSections.find(s => s.id == id)
    const row = await apiFetch(`/api/explore-sections/${id}`, { method: 'PUT', body: JSON.stringify(exploreSectionToApi({ ...existing, ...updates })) })
    set(s => ({ exploreSections: s.exploreSections.map(es => es.id == id ? normalizeExploreSection(row) : es) }))
  },
  async deleteExploreSection(id) {
    await apiFetch(`/api/explore-sections/${id}`, { method: 'DELETE' })
    set(s => ({ exploreSections: s.exploreSections.filter(es => es.id != id) }))
  },
  async updateExploreHero(hero) {
    await apiFetch('/api/settings/explore', {
      method: 'PUT',
      body: JSON.stringify({
        explore_hero_image: hero.image || '',
        explore_hero_title: hero.title || '',
        explore_hero_subtitle: hero.subtitle || '',
      }),
    })
    set({ exploreHero: hero })
  },

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
  async addArticle(article) {
    const row = await apiFetch('/api/articles', { method: 'POST', body: JSON.stringify(articleToApi(article)) })
    set(s => ({ articles: [...s.articles, normalizeArticle(row)].sort(articleSort) }))
  },
  async updateArticle(id, updates) {
    const existing = get().articles.find(a => a.id == id)
    const row = await apiFetch(`/api/articles/${id}`, { method: 'PUT', body: JSON.stringify(articleToApi({ ...existing, ...updates })) })
    set(s => ({ articles: s.articles.map(a => a.id == id ? normalizeArticle(row) : a).sort(articleSort) }))
  },
  async deleteArticle(id) {
    await apiFetch(`/api/articles/${id}`, { method: 'DELETE' })
    set(s => ({ articles: s.articles.filter(a => a.id != id) }))
  },
}))

// DB snake_case → app camelCase
function normalizeShoe(r) {
  return { id: String(r.id), name: r.name, category: r.category, price: r.price, material: r.material, match: r.match_pct || '', color: r.color, tag: r.tag || null, image: r.image_data || null, cost_price: r.cost_price ?? '', promotion_price: r.promotion_price || '' }
}
function normalizeCurated(r) {
  return { id: String(r.id), name: r.name, color: r.color, badge: r.badge || '' }
}
function normalizeWardrobe(r) {
  return { id: String(r.id), name: r.name, color: r.color }
}
function normalizeOutfit(r) {
  return { id: String(r.id), style: r.style, description: r.description, top: r.top, bottom: r.bottom, shoe: r.shoe, shoeColor: r.shoe_color, bgColor: r.bg_color }
}
function normalizeArticle(r) {
  return {
    id: String(r.id),
    title: r.title,
    slug: r.slug || '',
    excerpt: r.excerpt || '',
    content: r.content,
    category: r.category || 'Allgemein',
    featured: r.featured === 1 || r.featured === true,
    image: r.image_data || null,
    sortOrder: r.sort_order || 0,
    createdAt: r.created_at || '',
  }
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

function normalizeExploreSection(r) {
  return {
    id: String(r.id),
    key: r.key,
    label: r.label,
    title: r.title,
    description: r.description || '',
    tag: r.tag || 'Demnächst',
    color: r.color || '#1a1a1a',
    accent: r.accent || '#ffffff',
    icon: r.icon || 'BookOpen',
    image: r.image_data || null,
    previewItems: (() => { try { return JSON.parse(r.preview_items || '[]') } catch { return [] } })(),
    visible: r.visible === 1 || r.visible === true,
    sortOrder: r.sort_order || 0,
  }
}
function exploreSectionToApi(s) {
  return {
    key: s.key,
    label: s.label,
    title: s.title,
    description: s.description || '',
    tag: s.tag || 'Demnächst',
    color: s.color || '#1a1a1a',
    accent: s.accent || '#ffffff',
    icon: s.icon || 'BookOpen',
    image_data: s.image || null,
    preview_items: JSON.stringify(s.previewItems || []),
    visible: s.visible ? 1 : 0,
    sort_order: s.sortOrder || 0,
  }
}

function shoeToApi(s) {
  return { name: s.name, category: s.category, price: s.price, material: s.material, match_pct: s.match, color: s.color, tag: s.tag || null, image_data: s.image || null, cost_price: s.cost_price ? parseFloat(s.cost_price) : null, promotion_price: s.promotion_price || null }
}
function outfitToApi(o) {
  return { style: o.style, description: o.description, top: o.top, bottom: o.bottom, shoe: o.shoe, shoe_color: o.shoeColor, bg_color: o.bgColor }
}
function articleToApi(a) {
  return {
    title: a.title,
    slug: a.slug || a.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-'),
    excerpt: a.excerpt || null,
    content: a.content,
    category: a.category || 'Allgemein',
    featured: a.featured ? 1 : 0,
    image_data: a.image || null,
    sort_order: a.sortOrder || 0,
  }
}

// Sort: featured first, then by sortOrder, then by id
function articleSort(a, b) {
  if (b.featured !== a.featured) return b.featured - a.featured
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
  return Number(a.id) - Number(b.id)
}

export default useAtelierStore
