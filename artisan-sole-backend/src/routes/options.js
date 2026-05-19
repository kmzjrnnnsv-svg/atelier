/**
 * options.js — Konfigurator-Optionen
 *
 * GET  /api/option-groups            (public)  alle Gruppen mit Werten
 * POST /api/option-groups            (admin)   neue Gruppe
 * PUT  /api/option-groups/:id        (admin)
 * DELETE /api/option-groups/:id      (admin)
 * POST /api/options                  (admin)   neuer Wert
 * PUT  /api/options/:id              (admin)
 * DELETE /api/options/:id            (admin)
 * GET  /api/shoes/:id/options        (public)  Konfigurator-Daten für 1 Schuh
 * PUT  /api/shoes/:id/options        (admin/curator) Auswahl pro Schuh setzen
 * GET  /api/category-templates/:cat  (public)  Vorlage für eine Kategorie
 */
import { Router } from 'express'
import { body, param, validationResult } from 'express-validator'
import { getDb } from '../db/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()
const canManage = [authenticate, requireRole('admin', 'curator')]
const adminOnly = [authenticate, requireRole('admin')]

// ── Helper: lade alle Gruppen mit ihren Optionen ───────────────────────────
function loadAllGroups(db) {
  const groups = db.prepare(`
    SELECT id, key, label, description, ui_type, required, sort_order
    FROM option_groups ORDER BY sort_order ASC, id ASC
  `).all()
  const options = db.prepare(`
    SELECT id, group_id, key, label, description, image_data,
           default_price_extra, applicable_categories, sort_order
    FROM options ORDER BY sort_order ASC, id ASC
  `).all()
  const byGroup = new Map()
  options.forEach(o => {
    if (!byGroup.has(o.group_id)) byGroup.set(o.group_id, [])
    byGroup.get(o.group_id).push(o)
  })
  return groups.map(g => ({
    ...g,
    values: byGroup.get(g.id) || [],
  }))
}

// GET /api/option-groups — alle Gruppen mit Werten (öffentlich, für Konfigurator)
router.get('/option-groups', (req, res) => {
  res.json(loadAllGroups(getDb()))
})

// POST /api/option-groups — neue Gruppe (admin)
router.post('/option-groups', ...adminOnly,
  body('key').trim().isString().isLength({ min: 2 }),
  body('label').trim().isString().isLength({ min: 1 }),
  body('ui_type').optional().isIn(['single', 'toggle', 'multi']),
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })
    const { key, label, description, ui_type, required, sort_order } = req.body
    const db = getDb()
    try {
      const r = db.prepare(`
        INSERT INTO option_groups (key, label, description, ui_type, required, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(key, label, description || null, ui_type || 'single', required ? 1 : 0, sort_order || 0)
      res.status(201).json(db.prepare('SELECT * FROM option_groups WHERE id = ?').get(r.lastInsertRowid))
    } catch (e) {
      res.status(400).json({ error: e.message })
    }
  }
)

// PUT /api/option-groups/:id — bearbeiten (admin)
router.put('/option-groups/:id', ...adminOnly, param('id').isInt(), (req, res) => {
  const db = getDb()
  const id = parseInt(req.params.id)
  if (!db.prepare('SELECT id FROM option_groups WHERE id = ?').get(id)) {
    return res.status(404).json({ error: 'Group not found' })
  }
  const { key, label, description, ui_type, required, sort_order } = req.body
  const updates = []
  const vals = []
  if (key !== undefined)         { updates.push('key = ?');         vals.push(key) }
  if (label !== undefined)       { updates.push('label = ?');       vals.push(label) }
  if (description !== undefined) { updates.push('description = ?'); vals.push(description) }
  if (ui_type !== undefined)     { updates.push('ui_type = ?');     vals.push(ui_type) }
  if (required !== undefined)    { updates.push('required = ?');    vals.push(required ? 1 : 0) }
  if (sort_order !== undefined)  { updates.push('sort_order = ?');  vals.push(sort_order) }
  updates.push("updated_at = datetime('now')")
  if (updates.length > 1) {
    db.prepare(`UPDATE option_groups SET ${updates.join(', ')} WHERE id = ?`).run(...vals, id)
  }
  res.json(db.prepare('SELECT * FROM option_groups WHERE id = ?').get(id))
})

// DELETE /api/option-groups/:id (admin)
router.delete('/option-groups/:id', ...adminOnly, param('id').isInt(), (req, res) => {
  const db = getDb()
  db.prepare('DELETE FROM option_groups WHERE id = ?').run(req.params.id)
  res.json({ message: 'Deleted' })
})

// POST /api/options — neuer Wert (admin)
router.post('/options', ...adminOnly,
  body('group_id').isInt(),
  body('key').trim().isString().isLength({ min: 1 }),
  body('label').trim().isString().isLength({ min: 1 }),
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })
    const { group_id, key, label, description, image_data, default_price_extra, applicable_categories, sort_order } = req.body
    const db = getDb()
    try {
      const r = db.prepare(`
        INSERT INTO options (group_id, key, label, description, image_data, default_price_extra, applicable_categories, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(group_id, key, label, description || null, image_data || null,
             parseFloat(default_price_extra) || 0, applicable_categories || '*', parseInt(sort_order) || 0)
      res.status(201).json(db.prepare('SELECT * FROM options WHERE id = ?').get(r.lastInsertRowid))
    } catch (e) {
      res.status(400).json({ error: e.message })
    }
  }
)

// PUT /api/options/:id (admin)
router.put('/options/:id', ...adminOnly, param('id').isInt(), (req, res) => {
  const db = getDb()
  const id = parseInt(req.params.id)
  if (!db.prepare('SELECT id FROM options WHERE id = ?').get(id)) {
    return res.status(404).json({ error: 'Option not found' })
  }
  const { key, label, description, image_data, default_price_extra, applicable_categories, sort_order, group_id } = req.body
  const updates = []
  const vals = []
  if (key !== undefined)         { updates.push('key = ?');         vals.push(key) }
  if (label !== undefined)       { updates.push('label = ?');       vals.push(label) }
  if (description !== undefined) { updates.push('description = ?'); vals.push(description) }
  if (image_data !== undefined)  { updates.push('image_data = ?');  vals.push(image_data) }
  if (default_price_extra !== undefined) { updates.push('default_price_extra = ?'); vals.push(parseFloat(default_price_extra) || 0) }
  if (applicable_categories !== undefined) { updates.push('applicable_categories = ?'); vals.push(applicable_categories) }
  if (sort_order !== undefined)  { updates.push('sort_order = ?');  vals.push(parseInt(sort_order) || 0) }
  if (group_id !== undefined)    { updates.push('group_id = ?');    vals.push(parseInt(group_id)) }
  updates.push("updated_at = datetime('now')")
  if (updates.length > 1) {
    db.prepare(`UPDATE options SET ${updates.join(', ')} WHERE id = ?`).run(...vals, id)
  }
  res.json(db.prepare('SELECT * FROM options WHERE id = ?').get(id))
})

// DELETE /api/options/:id (admin)
router.delete('/options/:id', ...adminOnly, param('id').isInt(), (req, res) => {
  const db = getDb()
  db.prepare('DELETE FROM options WHERE id = ?').run(req.params.id)
  res.json({ message: 'Deleted' })
})

// GET /api/shoes/:id/options — Konfigurator-Struktur für einen Schuh (öffentlich)
// Liefert: Gruppen mit Werten, die für DIESEN Schuh aktiviert sind
// (shoe_options), inkl. effektiven Preis und Default-Flag.
router.get('/shoes/:id/options', param('id').isInt(), (req, res) => {
  const db = getDb()
  const shoeId = parseInt(req.params.id)
  const shoe = db.prepare('SELECT id, category FROM shoes WHERE id = ?').get(shoeId)
  if (!shoe) return res.status(404).json({ error: 'Shoe not found' })

  const rows = db.prepare(`
    SELECT g.id as group_id, g.key as group_key, g.label as group_label,
           g.description as group_description, g.ui_type, g.required, g.sort_order as group_sort,
           o.id as option_id, o.key as option_key, o.label as option_label,
           o.description as option_description, o.image_data,
           o.default_price_extra, o.applicable_categories, o.sort_order as option_sort,
           so.price_override, so.is_default, so.sort_order as shoe_sort
    FROM shoe_options so
    JOIN options o ON o.id = so.option_id
    JOIN option_groups g ON g.id = o.group_id
    WHERE so.shoe_id = ?
    ORDER BY g.sort_order, g.id, so.sort_order, o.sort_order
  `).all(shoeId)

  const byGroup = new Map()
  for (const r of rows) {
    if (!byGroup.has(r.group_id)) {
      byGroup.set(r.group_id, {
        id: r.group_id, key: r.group_key, label: r.group_label,
        description: r.group_description, ui_type: r.ui_type, required: !!r.required,
        sort_order: r.group_sort,
        values: [],
      })
    }
    byGroup.get(r.group_id).values.push({
      id: r.option_id, key: r.option_key, label: r.option_label,
      description: r.option_description, image: r.image_data,
      price_extra: r.price_override !== null ? r.price_override : r.default_price_extra,
      is_default: !!r.is_default,
      sort_order: r.shoe_sort,
    })
  }
  res.json([...byGroup.values()])
})

// PUT /api/shoes/:id/options — Vollersatz der Auswahl (admin/curator)
// Body: { selections: [{ option_id, price_override?, is_default?, sort_order? }, …] }
router.put('/shoes/:id/options', ...canManage, param('id').isInt(), (req, res) => {
  const db = getDb()
  const shoeId = parseInt(req.params.id)
  if (!db.prepare('SELECT id FROM shoes WHERE id = ?').get(shoeId)) {
    return res.status(404).json({ error: 'Shoe not found' })
  }
  const selections = Array.isArray(req.body.selections) ? req.body.selections : []
  db.transaction(() => {
    db.prepare('DELETE FROM shoe_options WHERE shoe_id = ?').run(shoeId)
    const ins = db.prepare(`
      INSERT INTO shoe_options (shoe_id, option_id, price_override, is_default, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `)
    selections.forEach((s, i) => {
      if (!Number.isInteger(s?.option_id)) return
      ins.run(
        shoeId,
        s.option_id,
        s.price_override !== undefined && s.price_override !== null ? parseFloat(s.price_override) : null,
        s.is_default ? 1 : 0,
        Number.isInteger(s.sort_order) ? s.sort_order : i,
      )
    })
  })()
  res.json({ message: 'Saved', count: selections.length })
})

// GET /api/category-templates/:cat — Vorlage für eine Kategorie (öffentlich, vom CMS genutzt)
router.get('/category-templates/:cat', param('cat').isString(), (req, res) => {
  const db = getDb()
  const rows = db.prepare(`
    SELECT ct.option_id, ct.is_default, ct.sort_order,
           o.key as option_key, o.label as option_label, o.default_price_extra,
           g.id as group_id, g.key as group_key, g.label as group_label, g.ui_type, g.required
    FROM category_templates ct
    JOIN options o ON o.id = ct.option_id
    JOIN option_groups g ON g.id = o.group_id
    WHERE ct.category = ?
    ORDER BY g.sort_order, ct.sort_order
  `).all(req.params.cat.toUpperCase())
  res.json(rows)
})

// PUT /api/category-templates/:cat — Vorlage neu setzen (admin)
router.put('/category-templates/:cat', ...adminOnly, param('cat').isString(), (req, res) => {
  const db = getDb()
  const cat = req.params.cat.toUpperCase()
  const entries = Array.isArray(req.body.entries) ? req.body.entries : []
  db.transaction(() => {
    db.prepare('DELETE FROM category_templates WHERE category = ?').run(cat)
    const ins = db.prepare(`
      INSERT INTO category_templates (category, option_id, is_default, sort_order)
      VALUES (?, ?, ?, ?)
    `)
    entries.forEach((e, i) => {
      if (Number.isInteger(e?.option_id)) {
        ins.run(cat, e.option_id, e.is_default ? 1 : 0, Number.isInteger(e.sort_order) ? e.sort_order : i)
      }
    })
  })()
  res.json({ message: 'Saved', count: entries.length })
})

export default router
