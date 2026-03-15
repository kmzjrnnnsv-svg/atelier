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
  faqs:       [],
  latestScan:  null, // most recent foot scan for this user
  shoeMaterials: [],
  shoeColors:   [],
  shoeSoles:    [],
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

  async initStore() {
    set({ loading: true, error: null })
    try {
      const [shoes, curated, wardrobe, outfits, articles, favs, orders, faqs, scans, mats, cols, soles] = await Promise.all([
        apiFetch('/api/shoes'),
        apiFetch('/api/curated'),
        apiFetch('/api/wardrobe'),
        apiFetch('/api/outfits'),
        apiFetch('/api/articles'),
        apiFetch('/api/favorites/mine').catch(() => []),
        apiFetch('/api/orders/mine').catch(() => []),
        apiFetch('/api/faqs').catch(() => []),
        apiFetch('/api/scans/mine').catch(() => []),
        apiFetch('/api/materials').catch(() => []),
        apiFetch('/api/colors').catch(() => []),
        apiFetch('/api/soles').catch(() => []),
      ])
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
  },

  // --- ORDERS ---
  async placeOrder(data) {
    const row = await apiFetch('/api/orders', { method: 'POST', body: JSON.stringify(data) })
    set(s => ({ orders: [row, ...s.orders] }))
    return row
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
  return { id: String(r.id), name: r.name, category: r.category, price: r.price, material: r.material, match: r.match_pct || '', color: r.color, tag: r.tag || null, image: r.image_data || null }
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

function shoeToApi(s) {
  return { name: s.name, category: s.category, price: s.price, material: s.material, match_pct: s.match, color: s.color, tag: s.tag || null, image_data: s.image || null }
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
