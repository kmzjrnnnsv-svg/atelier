/**
 * configs.js · Konfigurations-Entwürfe.
 *
 * Der Konfigurator speichert fortlaufend, was gewählt wurde — auch ohne
 * Anmeldung und lange bevor bestellt wird. Beim Bestellen verweist die
 * Bestellung nur noch auf diesen Entwurf, und der Server liest die Angaben
 * von dort.
 *
 * Der Grund ist eine Fehlerklasse, keine Bequemlichkeit: Vorher wanderte die
 * Konfiguration als Browser-Zustand durch Konfigurator, Warenkorb und Kasse.
 * Jede dieser Stellen baute das Produktobjekt neu zusammen, und wer ein Feld
 * vergaß, verlor es lautlos — beim Direktkauf fehlten so alle Zusatzoptionen
 * in der fertigen Bestellung, ohne dass irgendwo ein Fehler auftauchte.
 */
import { Router } from 'express'
import { getDb } from '../db/database.js'
import { authenticate, authenticateOptional } from '../middleware/auth.js'

const router = Router()

// Die Kennung kommt vom Browser, damit auch ein Gast einen Entwurf führen
// kann, ohne vorher ein Konto anzulegen.
const VALID_ID = /^[A-Za-z0-9_-]{8,64}$/

const json = (v) => (v === undefined || v === null ? null : (typeof v === 'string' ? v : JSON.stringify(v)))
const str  = (v) => (v === undefined || v === null || v === '' ? null : String(v))

// PUT /api/configs/:id — Entwurf anlegen oder fortschreiben
router.put('/:id', authenticateOptional, (req, res) => {
  const id = req.params.id
  if (!VALID_ID.test(id)) return res.status(400).json({ error: 'Ungültige Kennung' })

  const db = getDb()
  const existing = db.prepare('SELECT user_id, status FROM shoe_configs WHERE id = ?').get(id)

  // Ein abgeschlossener Entwurf gehört zur Bestellung und wird nicht mehr
  // verändert — sonst ließe sich nachträglich umschreiben, was gefertigt wird.
  if (existing?.status === 'ordered') {
    return res.status(409).json({ error: 'Diese Konfiguration gehört bereits zu einer Bestellung.' })
  }
  // Fremde Entwürfe bleiben fremd. Die Kennung ist zufällig, aber raten soll
  // sich trotzdem nicht lohnen.
  if (existing && existing.user_id && existing.user_id !== req.user?.id) {
    return res.status(403).json({ error: 'Kein Zugriff' })
  }

  const b = req.body || {}
  db.prepare(`
    INSERT INTO shoe_configs
      (id, user_id, shoe_id, shoe_name, material, color, color_name, sole, extras,
       size_type, eu_size, last_key, last_label, last_width, fit_measurements,
       accessories, price, fit_profile_id, status, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'draft', datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      user_id     = COALESCE(excluded.user_id, shoe_configs.user_id),
      shoe_id     = excluded.shoe_id,
      shoe_name   = excluded.shoe_name,
      material    = excluded.material,
      color       = excluded.color,
      color_name  = excluded.color_name,
      sole        = excluded.sole,
      extras      = excluded.extras,
      size_type   = excluded.size_type,
      eu_size     = excluded.eu_size,
      last_key    = excluded.last_key,
      last_label  = excluded.last_label,
      last_width  = excluded.last_width,
      fit_measurements = excluded.fit_measurements,
      accessories = excluded.accessories,
      price       = excluded.price,
      fit_profile_id = excluded.fit_profile_id,
      updated_at  = datetime('now')
  `).run(
    id, req.user?.id ?? null, b.shoe_id ?? null, str(b.shoe_name), str(b.material),
    str(b.color), str(b.color_name), str(b.sole), json(b.extras),
    str(b.size_type), str(b.eu_size), str(b.last_key), str(b.last_label), str(b.last_width),
    json(b.fit_measurements), json(b.accessories), str(b.price),
    b.fit_profile_id ?? null,
  )
  res.json({ id, saved: true })
})

/**
 * GET /api/configs/offen/:shoeId — der offene Entwurf dieses Kunden zu diesem
 * Modell. Offen heißt: noch nicht im Warenkorb und nicht bestellt. Damit kann
 * der Konfigurator beim Wiederaufrufen fragen, ob fortgesetzt werden soll.
 */
router.get('/offen/:shoeId', authenticate, (req, res) => {
  const row = getDb().prepare(`
    SELECT * FROM shoe_configs
    WHERE user_id = ? AND shoe_id = ? AND status = 'draft' AND in_cart = 0
    ORDER BY updated_at DESC LIMIT 1
  `).get(req.user.id, req.params.shoeId)
  res.json(row || null)
})

/** Entwurf verwerfen — „Nein, neu anfangen". */
router.delete('/:id', authenticateOptional, (req, res) => {
  const db = getDb()
  const row = db.prepare('SELECT user_id, status FROM shoe_configs WHERE id = ?').get(req.params.id)
  if (!row) return res.json({ ok: true })   // schon weg, auch gut
  if (row.status === 'ordered') {
    return res.status(409).json({ error: 'Gehört zu einer Bestellung und bleibt erhalten.' })
  }
  if (row.user_id && row.user_id !== req.user?.id) return res.status(403).json({ error: 'Kein Zugriff' })
  db.prepare('DELETE FROM shoe_configs WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

/** Als „im Warenkorb" markieren, damit nicht mehr danach gefragt wird. */
router.post('/:id/warenkorb', authenticateOptional, (req, res) => {
  const db = getDb()
  const row = db.prepare('SELECT user_id, status FROM shoe_configs WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Nicht gefunden' })
  if (row.user_id && row.user_id !== req.user?.id) return res.status(403).json({ error: 'Kein Zugriff' })
  db.prepare("UPDATE shoe_configs SET in_cart = ?, updated_at = datetime('now') WHERE id = ?")
    .run(req.body?.in_cart === false ? 0 : 1, req.params.id)
  res.json({ ok: true })
})

// GET /api/configs/:id — eigener Entwurf oder Verwaltung
router.get('/:id', authenticateOptional, (req, res) => {
  const row = getDb().prepare('SELECT * FROM shoe_configs WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Nicht gefunden' })
  const isStaff = req.user?.role === 'admin' || req.user?.role === 'curator'
  if (row.user_id && row.user_id !== req.user?.id && !isStaff) {
    return res.status(403).json({ error: 'Kein Zugriff' })
  }
  res.json(row)
})

// GET /api/configs — eigene Entwürfe, jüngste zuerst
router.get('/', authenticate, (req, res) => {
  const rows = getDb().prepare(
    "SELECT * FROM shoe_configs WHERE user_id = ? AND status = 'draft' ORDER BY updated_at DESC LIMIT 20"
  ).all(req.user.id)
  res.json(rows)
})

export default router
