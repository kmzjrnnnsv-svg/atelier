/**
 * lastChart.js — Leisten-Maßtabelle (last_size_chart)
 *
 * GET  /api/last-size-chart        (public)  alle Zeilen
 * PUT  /api/last-size-chart        (manage)  Bulk-Update von Werten
 * POST /api/last-size-chart/reset  (admin)   autoritativer Reset auf Tabellen-Werte
 */
import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { getDb } from '../db/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { applyLastSizeChartSeed } from '../db/seed.js'

const router = Router()
const canManage = [authenticate, requireRole('admin', 'curator')]
const adminOnly = [authenticate, requireRole('admin')]

// GET /api/last-size-chart — alle Zeilen (öffentlich, fürs CMS + Anzeige)
router.get('/', (req, res) => {
  const rows = getDb().prepare(`
    SELECT id, last_key, width, size_system, size_label, foot_length_mm, ball_girth_mm
    FROM last_size_chart
    ORDER BY last_key, width, size_system, foot_length_mm
  `).all()
  res.json(rows)
})

// PUT /api/last-size-chart — Bulk-Update der Werte (Fußlänge/Ballenumfang)
// Body: { updates: [{ id, foot_length_mm, ball_girth_mm }, …] }
router.put('/', ...canManage,
  body('updates').isArray({ min: 1 }),
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const db = getDb()
    const upd = db.prepare(`
      UPDATE last_size_chart
      SET foot_length_mm = ?, ball_girth_mm = ?
      WHERE id = ?
    `)
    let count = 0
    db.transaction(() => {
      for (const u of req.body.updates) {
        if (!Number.isInteger(u?.id)) continue
        const len = Number(u.foot_length_mm)
        const girth = Number(u.ball_girth_mm)
        if (!Number.isFinite(len) || !Number.isFinite(girth)) continue
        if (len < 100 || len > 400 || girth < 100 || girth > 400) continue
        upd.run(Math.round(len * 10) / 10, Math.round(girth * 10) / 10, u.id)
        count++
      }
    })()
    res.json({ message: 'Saved', count })
  }
)

// POST /api/last-size-chart/reset — autoritativer Reset auf die Tabellen-Werte
// (überschreibt CMS-Edits). Nur Admin.
router.post('/reset', ...adminOnly, (req, res) => {
  const n = applyLastSizeChartSeed(getDb())
  res.json({ message: 'Reset', count: n })
})

export default router
