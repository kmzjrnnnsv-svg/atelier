import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import bcrypt from 'bcryptjs'
import QRCode from 'qrcode'
import { totpVerify, totpSecret, totpKeyUri } from '../utils/totp.js'
import { getDb } from '../db/database.js'
import {
  signAccessToken, generateRefreshToken, hashToken,
  refreshExpiresAt, COOKIE_OPTIONS
} from '../utils/tokens.js'
import { authLimiter, refreshLimiter, strictLimiter } from '../middleware/rateLimiter.js'
import { authenticate } from '../middleware/auth.js'
import { sendEmailVerification, sendPasswordReset } from '../utils/email.js'
import { kampagnenAutomatischBeitreten } from './business.js'
import crypto from 'crypto'

const router = Router()

const validateRegister = [
  body('name').trim().isLength({ min: 2 }).withMessage('Name min 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password min 8 characters')
    .matches(/[0-9]/).withMessage('Password must contain a number')
    .matches(/[^a-zA-Z0-9]/).withMessage('Password must contain a special character'),
]

const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
]

export function issueTokens(res, user) {
  const accessToken  = signAccessToken(user)
  const refreshToken = generateRefreshToken()
  const tokenHash    = hashToken(refreshToken)
  const expiresAt    = refreshExpiresAt()

  getDb().prepare(`
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
    VALUES (?, ?, ?)
  `).run(user.id, tokenHash, expiresAt)

  res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS)

  // Firmenkonto-Kontext (business.artisansole.com): treibt Login-Redirect &
  // BusinessRoute im Frontend. Lookup per owner, damit es auf allen Token-
  // Pfaden (login/register/refresh) konsistent ist.
  const biz = getDb().prepare('SELECT id, name FROM businesses WHERE owner_user_id = ?').get(user.id)
  const vrow = getDb().prepare('SELECT email_verified FROM users WHERE id = ?').get(user.id)
  // Affiliate kennzeichnen, damit die Anmeldung sie in ihr Portal führt statt
  // in den Laden. Nur freigeschaltete zählen — wer noch auf Freigabe wartet,
  // hat dort nichts zu sehen.
  const aff = getDb().prepare("SELECT code FROM affiliates WHERE user_id = ? AND status = 'active'").get(user.id)

  // Firmen-Aktionen, die allein an der Adresse hängen, greifen ohne Zutun:
  // Wer sich mit der Firmen-Domain anmeldet, ist danach Teilnehmer, und der
  // Konfigurator zeigt die Konditionen. Hier, weil alle Token-Pfade darüber
  // laufen — Anmeldung, Registrierung, Erneuerung, Passkey. Ein Fehler darf
  // niemanden aussperren.
  try {
    kampagnenAutomatischBeitreten(getDb(), user.id)
  } catch (e) {
    console.error('[kampagne-beitritt]', e.message)
  }

  // Return refreshToken in body too — Capacitor native apps can't rely on
  // cross-origin cookies in WKWebView, so they store it in memory instead.
  return { accessToken, refreshToken, user: { id: user.id, name: user.name, email: user.email, role: user.role, is_promotion: !!user.is_promotion, promotion_discount_pct: user.promotion_discount_pct || 0, is_business: !!biz, business_id: biz?.id || null, business_name: biz?.name || null, is_affiliate: !!aff, affiliate_code: aff?.code || null, email_verified: !!vrow?.email_verified } }
}

// POST /api/auth/register
router.post('/register', strictLimiter, authLimiter, validateRegister, (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

  const { name, email, password } = req.body
  const db = getDb()

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' })
  }

  const hash = bcrypt.hashSync(password, 12)
  const verifyToken = crypto.randomBytes(32).toString('hex')
  const result = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, email_verify_token) VALUES (?, ?, ?, 'user', ?)
  `).run(name, email, hash, verifyToken)

  sendEmailVerification(email, name, verifyToken).catch(e => console.error('[email verify]', e.message))

  const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(result.lastInsertRowid)
  const payload = issueTokens(res, user)
  res.status(201).json(payload)
})

// POST /api/auth/verify-email — E-Mail per Token bestätigen (öffentlich)
router.post('/verify-email', (req, res) => {
  const { token } = req.body || {}
  if (!token) return res.status(400).json({ error: 'Token erforderlich' })
  const db = getDb()
  const row = db.prepare('SELECT id FROM users WHERE email_verify_token = ?').get(String(token))
  if (!row) return res.status(404).json({ error: 'Ungültiger oder bereits verwendeter Link' })
  db.prepare("UPDATE users SET email_verified = 1, email_verify_token = NULL, updated_at = datetime('now') WHERE id = ?").run(row.id)
  // Der Domain-Zugang zu Firmen-Aktionen setzt eine bestätigte Adresse voraus —
  // ab jetzt liegt sie vor, also gleich eintragen statt bis zur nächsten
  // Anmeldung zu warten.
  let kampagnen = 0
  try { kampagnen = kampagnenAutomatischBeitreten(db, row.id) } catch (e) { console.error('[kampagne-beitritt]', e.message) }
  res.json({ ok: true, kampagnen })
})

// POST /api/auth/resend-verification — neuen Bestätigungslink anfordern
router.post('/resend-verification', authenticate, (req, res) => {
  const db = getDb()
  const row = db.prepare('SELECT email_verified, name FROM users WHERE id = ?').get(req.user.id)
  if (row?.email_verified) return res.json({ ok: true, already: true })
  const verifyToken = crypto.randomBytes(32).toString('hex')
  db.prepare('UPDATE users SET email_verify_token = ? WHERE id = ?').run(verifyToken, req.user.id)
  sendEmailVerification(req.user.email, row?.name, verifyToken).catch(e => console.error('[email verify resend]', e.message))
  res.json({ ok: true })
})

// ── Passwort vergessen ──────────────────────────────────────────────────────
//
// Gab es nicht, und der Grund dafür ist entfallen: Der Mailversand stand
// still, also hätte ein Zurücksetzen per Mail ins Leere geführt. Die
// Kontowiederherstellung (POST /api/auth/recover) weist sich über
// Bestellnummer und Postleitzahl aus und führt zu einem neuen Passkey — wer
// sich mit Passwort anmeldet und es vergisst, hatte damit keinen Weg zurück.
//
// Drei Dinge sind hier wichtiger als Bequemlichkeit:
//
//  1. Die Antwort ist immer dieselbe. Ob es die Adresse gibt, verrät der
//     Server nicht — sonst wäre dieser Weg ein Werkzeug, um Kundenlisten
//     abzugleichen.
//  2. Gespeichert wird der SHA-256 des Tokens. Wer die Datenbank liest, soll
//     sich damit nicht anmelden können.
//  3. Beim Setzen des neuen Passworts enden alle Sitzungen. Wenn ein Konto
//     übernommen war, ist das der Moment, in dem der Angreifer hinausfliegt.

const RESET_STUNDEN = 1
const tokenHashen = (t) => crypto.createHash('sha256').update(String(t)).digest('hex')

// POST /api/auth/passwort-vergessen
router.post('/passwort-vergessen',
  strictLimiter, authLimiter,
  body('email').isEmail().normalizeEmail(),
  (req, res) => {
    const errors = validationResult(req)
    // Auch ein Formfehler bekommt die freundliche Antwort — sonst ließe sich
    // an der Fehlermeldung ablesen, welche Eingaben der Server ernst nimmt.
    if (errors.isEmpty()) {
      const db = getDb()
      const user = db.prepare('SELECT id, name, email, is_active FROM users WHERE email = ?').get(req.body.email)
      if (user && user.is_active) {
        const token = crypto.randomBytes(32).toString('hex')
        db.prepare(`
          UPDATE users SET reset_token_hash = ?,
            reset_expires_at = datetime('now', ?), updated_at = datetime('now')
          WHERE id = ?
        `).run(tokenHashen(token), `+${RESET_STUNDEN} hours`, user.id)
        sendPasswordReset(user.email, user.name, token, RESET_STUNDEN)
          .catch(e => console.error('[email reset]', e.message))
      }
    }
    res.json({
      ok: true,
      message: 'Wenn es zu dieser Adresse ein Konto gibt, ist eine Nachricht unterwegs.',
    })
  }
)

// POST /api/auth/passwort-neu
router.post('/passwort-neu',
  authLimiter,
  body('token').trim().isLength({ min: 32 }),
  body('password')
    .isLength({ min: 8 }).withMessage('Mindestens 8 Zeichen')
    .matches(/[0-9]/).withMessage('Mindestens eine Ziffer')
    .matches(/[^a-zA-Z0-9]/).withMessage('Mindestens ein Sonderzeichen'),
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg })

    const db = getDb()
    const user = db.prepare(`
      SELECT id, email FROM users
      WHERE reset_token_hash = ? AND reset_expires_at > datetime('now')
    `).get(tokenHashen(req.body.token))

    if (!user) {
      return res.status(400).json({
        error: 'Dieser Link ist abgelaufen oder wurde bereits benutzt. Fordern Sie einen neuen an.',
        code: 'TOKEN_UNGUELTIG',
      })
    }

    db.transaction(() => {
      db.prepare(`
        UPDATE users SET password_hash = ?, reset_token_hash = NULL,
          reset_expires_at = NULL, updated_at = datetime('now')
        WHERE id = ?
      `).run(bcrypt.hashSync(req.body.password, 10), user.id)
      // Alle Sitzungen beenden — siehe Punkt 3 oben.
      db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(user.id)
    })()

    res.json({ ok: true, message: 'Ihr Passwort ist gesetzt. Bitte melden Sie sich neu an.' })
  }
)

// POST /api/auth/login
router.post('/login', authLimiter, validateLogin, (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

  const { email, password } = req.body
  const db = getDb()

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }
  if (!user.is_active) {
    return res.status(403).json({ error: 'Account has been deactivated' })
  }

  // Update last login
  db.prepare("UPDATE users SET updated_at = datetime('now') WHERE id = ?").run(user.id)

  const payload = issueTokens(res, user)
  res.json(payload)
})

// POST /api/auth/refresh
router.post('/refresh', refreshLimiter, (req, res) => {
  // Accept refresh token from: cookie (web), request body (Capacitor native)
  const rawToken = req.cookies?.refreshToken || req.body?.refreshToken
  if (!rawToken) return res.status(401).json({ error: 'No refresh token' })

  const db = getDb()
  const tokenHash = hashToken(rawToken)
  const stored = db.prepare(`
    SELECT rt.*, u.id as uid, u.name, u.email, u.role, u.is_active
    FROM refresh_tokens rt
    JOIN users u ON u.id = rt.user_id
    WHERE rt.token_hash = ? AND rt.expires_at > datetime('now')
  `).get(tokenHash)

  if (!stored || !stored.is_active) {
    res.clearCookie('refreshToken', { path: '/api/auth/refresh' })
    return res.status(401).json({ error: 'Invalid or expired refresh token' })
  }

  // Rotate: delete old, issue new
  db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(stored.id)

  const user = { id: stored.uid, name: stored.name, email: stored.email, role: stored.role }
  const payload = issueTokens(res, user)
  res.json(payload)
})

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const rawToken = req.cookies?.refreshToken || req.body?.refreshToken
  if (rawToken) {
    const db = getDb()
    db.prepare('DELETE FROM refresh_tokens WHERE token_hash = ?').run(hashToken(rawToken))
  }
  res.clearCookie('refreshToken', { path: '/api/auth/refresh' })
  res.json({ message: 'Logged out' })
})

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  const { id, name, email, role } = req.user
  const row = getDb().prepare('SELECT is_promotion, promotion_discount_pct, promotion_max_orders, promotion_orders_used FROM users WHERE id = ?').get(id)
  const biz = getDb().prepare('SELECT id, name FROM businesses WHERE owner_user_id = ?').get(id)
  const vrow = getDb().prepare('SELECT email_verified FROM users WHERE id = ?').get(id)
  const aff = getDb().prepare("SELECT code FROM affiliates WHERE user_id = ? AND status = 'active'").get(id)
  res.json({ id, name, email, role, is_promotion: !!(row?.is_promotion), promotion_discount_pct: row?.promotion_discount_pct, promotion_max_orders: row?.promotion_max_orders, promotion_orders_used: row?.promotion_orders_used, is_business: !!biz, business_id: biz?.id || null, business_name: biz?.name || null, is_affiliate: !!aff, affiliate_code: aff?.code || null, email_verified: !!vrow?.email_verified })
})

// PATCH /api/auth/me  –  Update own profile (name / email / password)
router.patch('/me', authenticate,
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name min 2 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email required'),
  body('newPassword').optional()
    .isLength({ min: 8 }).withMessage('Password min 8 characters')
    .matches(/[0-9]/).withMessage('Password must contain a number')
    .matches(/[^a-zA-Z0-9]/).withMessage('Password must contain a special character'),
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const { name, email, currentPassword, newPassword } = req.body
    const db   = getDb()
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)

    // Password change requires current password verification
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Aktuelles Passwort erforderlich' })
      }
      if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
        return res.status(401).json({ error: 'Aktuelles Passwort ist falsch' })
      }
    }

    // Email must be unique
    if (email && email !== user.email) {
      const taken = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, req.user.id)
      if (taken) return res.status(409).json({ error: 'E-Mail wird bereits verwendet' })
    }

    const cols   = []
    const params = []
    if (name)        { cols.push('name = ?');          params.push(name) }
    if (email)       { cols.push('email = ?');         params.push(email) }
    if (newPassword) { cols.push('password_hash = ?'); params.push(bcrypt.hashSync(newPassword, 12)) }

    if (cols.length === 0) {
      return res.status(400).json({ error: 'Keine Änderungen angegeben' })
    }

    cols.push("updated_at = datetime('now')")
    params.push(req.user.id)

    db.prepare(`UPDATE users SET ${cols.join(', ')} WHERE id = ?`).run(...params)

    const updated = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(req.user.id)
    res.json(updated)
  }
)

// GET /api/auth/me/foot-notes — get user-level foot notes
router.get('/me/foot-notes', authenticate, (req, res) => {
  const row = getDb().prepare('SELECT foot_notes FROM users WHERE id = ?').get(req.user.id)
  res.json({ foot_notes: row?.foot_notes || '' })
})

// PUT /api/auth/me/foot-notes — save user-level foot notes
router.put('/me/foot-notes', authenticate, (req, res) => {
  const { foot_notes } = req.body
  if (foot_notes != null && typeof foot_notes !== 'string') {
    return res.status(400).json({ error: 'foot_notes must be a string' })
  }
  if (foot_notes && foot_notes.length > 1000) {
    return res.status(400).json({ error: 'foot_notes max 1000 characters' })
  }
  getDb().prepare("UPDATE users SET foot_notes = ?, updated_at = datetime('now') WHERE id = ?")
    .run(foot_notes ?? null, req.user.id)
  res.json({ foot_notes: foot_notes ?? '' })
})

// ── Fußmaße & Passform ──────────────────────────────────────────────────────────
// Kategorisches Feedback → mm-Anpassung auf fit_adjust. Zentral im Backend,
// damit Konfigurator & Profil dieselbe Logik teilen.
const FIT_FEEDBACK_MAP = {
  fit:        { length_mm: 0,  girth_mm: 0  },
  too_narrow: { length_mm: 0,  girth_mm: 4  },
  too_wide:   { length_mm: 0,  girth_mm: -4 },
  too_short:  { length_mm: 4,  girth_mm: 0  },
  too_long:   { length_mm: -4, girth_mm: 0  },
}

function readMeasurements(row) {
  if (!row?.foot_measurements) return null
  try { return JSON.parse(row.foot_measurements) } catch { return null }
}

// GET /api/auth/me/foot-measurements — Maße + fit_adjust + saved_fit
router.get('/me/foot-measurements', authenticate, (req, res) => {
  const row = getDb().prepare('SELECT foot_measurements FROM users WHERE id = ?').get(req.user.id)
  res.json({ foot_measurements: readMeasurements(row) })
})

// PUT /api/auth/me/foot-measurements — Maße (+ optional fit_adjust/saved_fit) speichern
router.put('/me/foot-measurements', authenticate, (req, res) => {
  const { foot_length_mm, ball_girth_mm, fit_adjust, saved_fit, feet } = req.body || {}
  // Leeres/null Maß-Paar → Passform zurücksetzen.
  if ((foot_length_mm == null || foot_length_mm === '') && (ball_girth_mm == null || ball_girth_mm === '')) {
    getDb().prepare("UPDATE users SET foot_measurements = NULL, updated_at = datetime('now') WHERE id = ?").run(req.user.id)
    return res.json({ foot_measurements: null })
  }
  const len = Number(foot_length_mm)
  if (!Number.isFinite(len) || len < 150 || len > 350) {
    return res.status(400).json({ error: 'foot_length_mm muss zwischen 150 und 350 mm liegen' })
  }
  // Der Ballenumfang ist freiwillig.
  //
  // Er war Pflicht, und das kostete mehr, als es einbrachte: Die Länge misst
  // jeder mit Wand und Zollstock, für den Umfang braucht es ein Maßband.
  // Wer nur die Länge hatte, konnte gar nichts speichern und stand vor einem
  // Konfigurator, der auf Maße wartete, die nie kamen. Fehlt er, wird die
  // Weite gewählt statt gemessen (siehe fit.js) — schlechter als gemessen,
  // aber unendlich viel besser als nichts.
  const girthRoh = ball_girth_mm == null || ball_girth_mm === '' ? null : Number(ball_girth_mm)
  if (girthRoh !== null && (!Number.isFinite(girthRoh) || girthRoh < 150 || girthRoh > 340)) {
    return res.status(400).json({ error: 'ball_girth_mm muss zwischen 150 und 340 mm liegen' })
  }
  const girth = girthRoh
  // Optionale Links/Rechts-Maße. Gespeichert wird beides; fürs Matching zählt
  // der größere Fuß (vom Client als foot_length_mm/ball_girth_mm übergeben).
  const cleanFoot = (f) => f && typeof f === 'object'
    ? { length_mm: Number(f.length_mm) || null, girth_mm: Number(f.girth_mm) || null }
    : null
  const db = getDb()
  const existing = readMeasurements(db.prepare('SELECT foot_measurements FROM users WHERE id = ?').get(req.user.id)) || {}
  const next = {
    foot_length_mm: Math.round(len * 10) / 10,
    ball_girth_mm: girth === null ? null : Math.round(girth * 10) / 10,
    updated_at: new Date().toISOString(),
    fit_adjust: fit_adjust && typeof fit_adjust === 'object'
      ? { length_mm: Number(fit_adjust.length_mm) || 0, girth_mm: Number(fit_adjust.girth_mm) || 0 }
      : (existing.fit_adjust || { length_mm: 0, girth_mm: 0 }),
    saved_fit: saved_fit && typeof saved_fit === 'object' ? saved_fit : (existing.saved_fit || null),
    feet: feet && typeof feet === 'object'
      ? { left: cleanFoot(feet.left), right: cleanFoot(feet.right) }
      : (existing.feet || null),
  }
  db.prepare("UPDATE users SET foot_measurements = ?, updated_at = datetime('now') WHERE id = ?")
    .run(JSON.stringify(next), req.user.id)

  // Jede Vermessung wird zusätzlich als eigener Eintrag festgehalten, statt
  // die vorige zu überschreiben. Nur wenn sie sich von der letzten
  // unterscheidet — sonst entstünde bei jedem Speichern eine Dublette.
  let fitProfileId = null
  try {
    const letzte = db.prepare(
      'SELECT id, foot_length_mm, ball_girth_mm FROM fit_profiles WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 1'
    ).get(req.user.id)
    if (!letzte || letzte.foot_length_mm !== next.foot_length_mm || letzte.ball_girth_mm !== next.ball_girth_mm) {
      const info = db.prepare(
        "INSERT INTO fit_profiles (user_id, foot_length_mm, ball_girth_mm, source) VALUES (?,?,?, 'manual')"
      ).run(req.user.id, next.foot_length_mm, next.ball_girth_mm)
      fitProfileId = info.lastInsertRowid
    } else {
      fitProfileId = letzte.id
    }
  } catch (e) { console.error('[fit_profiles]', e.message) }

  res.json({ foot_measurements: next, fit_profile_id: fitProfileId })
})

// GET /api/auth/me/fit-profiles — bisherige Passformen, jüngste zuerst
router.get('/me/fit-profiles', authenticate, (req, res) => {
  const rows = getDb().prepare(`
    SELECT p.id, p.foot_length_mm, p.ball_girth_mm, p.source, p.created_at,
           (SELECT COUNT(*) FROM orders o WHERE o.fit_profile_id = p.id) AS orders_count
    FROM fit_profiles p
    WHERE p.user_id = ?
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT 50
  `).all(req.user.id)
  res.json(rows)
})

// POST /api/auth/me/fit-feedback — kategorisches Feedback ODER direkte Nudges
router.post('/me/fit-feedback', authenticate, (req, res) => {
  const { verdict, length_mm, girth_mm } = req.body || {}
  const db = getDb()
  const existing = readMeasurements(db.prepare('SELECT foot_measurements FROM users WHERE id = ?').get(req.user.id))
  if (!existing) {
    return res.status(400).json({ error: 'Bitte zuerst Fußmaße speichern' })
  }
  const adj = existing.fit_adjust || { length_mm: 0, girth_mm: 0 }
  let dLen = 0, dGirth = 0
  if (verdict && FIT_FEEDBACK_MAP[verdict]) {
    dLen = FIT_FEEDBACK_MAP[verdict].length_mm
    dGirth = FIT_FEEDBACK_MAP[verdict].girth_mm
  } else if (Number.isFinite(Number(length_mm)) || Number.isFinite(Number(girth_mm))) {
    dLen = Number(length_mm) || 0
    dGirth = Number(girth_mm) || 0
  } else {
    return res.status(400).json({ error: 'Ungültiges Feedback' })
  }
  const next = {
    ...existing,
    fit_adjust: {
      length_mm: Math.round((adj.length_mm + dLen) * 10) / 10,
      girth_mm: Math.round((adj.girth_mm + dGirth) * 10) / 10,
    },
    updated_at: new Date().toISOString(),
  }
  db.prepare("UPDATE users SET foot_measurements = ?, updated_at = datetime('now') WHERE id = ?")
    .run(JSON.stringify(next), req.user.id)

  // Jede Vermessung wird zusätzlich als eigener Eintrag festgehalten, statt
  // die vorige zu überschreiben. Nur wenn sie sich von der letzten
  // unterscheidet — sonst entstünde bei jedem Speichern eine Dublette.
  let fitProfileId = null
  try {
    const letzte = db.prepare(
      'SELECT id, foot_length_mm, ball_girth_mm FROM fit_profiles WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 1'
    ).get(req.user.id)
    if (!letzte || letzte.foot_length_mm !== next.foot_length_mm || letzte.ball_girth_mm !== next.ball_girth_mm) {
      const info = db.prepare(
        "INSERT INTO fit_profiles (user_id, foot_length_mm, ball_girth_mm, source) VALUES (?,?,?, 'manual')"
      ).run(req.user.id, next.foot_length_mm, next.ball_girth_mm)
      fitProfileId = info.lastInsertRowid
    } else {
      fitProfileId = letzte.id
    }
  } catch (e) { console.error('[fit_profiles]', e.message) }

  res.json({ foot_measurements: next, fit_profile_id: fitProfileId })
})

// GET /api/auth/me/fit-profiles — bisherige Passformen, jüngste zuerst
router.get('/me/fit-profiles', authenticate, (req, res) => {
  const rows = getDb().prepare(`
    SELECT p.id, p.foot_length_mm, p.ball_girth_mm, p.source, p.created_at,
           (SELECT COUNT(*) FROM orders o WHERE o.fit_profile_id = p.id) AS orders_count
    FROM fit_profiles p
    WHERE p.user_id = ?
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT 50
  `).all(req.user.id)
  res.json(rows)
})

// ── Saved addresses ───────────────────────────────────────────────────────────

// GET /api/auth/me/addresses — get saved delivery & billing addresses
router.get('/me/addresses', authenticate, (req, res) => {
  const row = getDb().prepare('SELECT saved_delivery_address, saved_billing_address FROM users WHERE id = ?').get(req.user.id)
  res.json({
    delivery: row?.saved_delivery_address ? JSON.parse(row.saved_delivery_address) : null,
    billing:  row?.saved_billing_address  ? JSON.parse(row.saved_billing_address)  : null,
  })
})

// PUT /api/auth/me/addresses — save delivery & billing addresses
router.put('/me/addresses', authenticate, (req, res) => {
  const { delivery, billing } = req.body
  const db = getDb()
  db.prepare("UPDATE users SET saved_delivery_address = ?, saved_billing_address = ?, updated_at = datetime('now') WHERE id = ?")
    .run(
      delivery ? JSON.stringify(delivery) : null,
      billing  ? JSON.stringify(billing)  : null,
      req.user.id
    )
  res.json({ delivery: delivery || null, billing: billing || null })
})

// ── Saved cart ────────────────────────────────────────────────────────────────

// GET /api/auth/me/cart — get saved cart
router.get('/me/cart', authenticate, (req, res) => {
  const row = getDb().prepare('SELECT saved_cart FROM users WHERE id = ?').get(req.user.id)
  res.json({ cart: row?.saved_cart ? JSON.parse(row.saved_cart) : [] })
})

// PUT /api/auth/me/cart — save cart
router.put('/me/cart', authenticate, (req, res) => {
  const { cart } = req.body
  getDb().prepare("UPDATE users SET saved_cart = ?, updated_at = datetime('now') WHERE id = ?")
    .run(cart && cart.length > 0 ? JSON.stringify(cart) : null, req.user.id)
  res.json({ cart: cart || [] })
})

// ── Saved configurations (nur eingeloggt) ──────────────────────────────────────
const MAX_SAVED_CONFIGS = 50
const readConfigs = (row) => {
  try { return row?.saved_configurations ? JSON.parse(row.saved_configurations) : [] } catch { return [] }
}

// GET /api/auth/me/configurations — gespeicherte Konfigurationen
router.get('/me/configurations', authenticate, (req, res) => {
  const row = getDb().prepare('SELECT saved_configurations FROM users WHERE id = ?').get(req.user.id)
  res.json({ configurations: readConfigs(row) })
})

// POST /api/auth/me/configurations — eine Konfiguration speichern
router.post('/me/configurations', authenticate, (req, res) => {
  const { config } = req.body || {}
  if (!config || typeof config !== 'object' || !config.shoeId) {
    return res.status(400).json({ error: 'config (mit shoeId) erforderlich' })
  }
  const db = getDb()
  const list = readConfigs(db.prepare('SELECT saved_configurations FROM users WHERE id = ?').get(req.user.id))
  const entry = {
    id: (globalThis.crypto?.randomUUID?.() || String(Date.now()) + Math.random().toString(36).slice(2)),
    created_at: new Date().toISOString(),
    ...config,
  }
  const next = [entry, ...list].slice(0, MAX_SAVED_CONFIGS)
  db.prepare("UPDATE users SET saved_configurations = ?, updated_at = datetime('now') WHERE id = ?")
    .run(JSON.stringify(next), req.user.id)
  res.status(201).json({ configuration: entry, configurations: next })
})

// DELETE /api/auth/me/configurations/:id — eine Konfiguration löschen
router.delete('/me/configurations/:id', authenticate, (req, res) => {
  const db = getDb()
  const list = readConfigs(db.prepare('SELECT saved_configurations FROM users WHERE id = ?').get(req.user.id))
  const next = list.filter(c => String(c.id) !== String(req.params.id))
  db.prepare("UPDATE users SET saved_configurations = ?, updated_at = datetime('now') WHERE id = ?")
    .run(next.length ? JSON.stringify(next) : null, req.user.id)
  res.json({ configurations: next })
})

// POST /api/auth/register-promotion — register via invite token
router.post('/register-promotion',
  body('token').trim().notEmpty().withMessage('Token erforderlich'),
  body('name').trim().isLength({ min: 2 }).withMessage('Name min 2 Zeichen'),
  body('password')
    .isLength({ min: 8 }).withMessage('Passwort min 8 Zeichen')
    .matches(/[0-9]/).withMessage('Passwort muss eine Zahl enthalten')
    .matches(/[^a-zA-Z0-9]/).withMessage('Passwort muss ein Sonderzeichen enthalten'),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const { token, name, password } = req.body
    const db = getDb()

    const user = db.prepare('SELECT * FROM users WHERE promotion_invite_token = ?').get(token)
    if (!user) return res.status(404).json({ error: 'Ungültiger oder abgelaufener Einladungslink' })

    const hash = await bcrypt.hash(password, 12)
    db.prepare(`
      UPDATE users SET name = ?, password_hash = ?, promotion_invite_token = NULL, is_active = 1, updated_at = datetime('now')
      WHERE id = ?
    `).run(name, hash, user.id)

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)
    const result = issueTokens(res, updated)
    res.status(201).json(result)
  }
)

// POST /api/auth/register-business — set password & activate a business login via invite token
router.post('/register-business',
  body('token').trim().notEmpty().withMessage('Token erforderlich'),
  body('name').trim().isLength({ min: 2 }).withMessage('Name min 2 Zeichen'),
  body('password')
    .isLength({ min: 8 }).withMessage('Passwort min 8 Zeichen')
    .matches(/[0-9]/).withMessage('Passwort muss eine Zahl enthalten')
    .matches(/[^a-zA-Z0-9]/).withMessage('Passwort muss ein Sonderzeichen enthalten'),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const { token, name, password } = req.body
    const db = getDb()

    const biz = db.prepare('SELECT * FROM businesses WHERE invite_token = ?').get(token)
    if (!biz) return res.status(404).json({ error: 'Ungültiger oder abgelaufener Einladungslink' })

    const hash = await bcrypt.hash(password, 12)
    db.prepare(`
      UPDATE users SET name = ?, password_hash = ?, is_active = 1, updated_at = datetime('now')
      WHERE id = ?
    `).run(name, hash, biz.owner_user_id)
    db.prepare("UPDATE businesses SET invite_token = NULL, status = 'active', updated_at = datetime('now') WHERE id = ?").run(biz.id)

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(biz.owner_user_id)
    const result = issueTokens(res, updated)
    res.status(201).json(result)
  }
)

// POST /api/auth/register-affiliate — Affiliate-Konto aktivieren
//
// Derselbe Weg wie beim Firmenkonto: Der Datensatz besteht bereits, hier wird
// nur das Passwort gesetzt und das Login scharfgeschaltet. Der Affiliate
// landet danach in seinem Bereich, nicht im Laden.
router.post('/register-affiliate',
  body('token').trim().notEmpty().withMessage('Token erforderlich'),
  body('name').trim().isLength({ min: 2 }).withMessage('Name min 2 Zeichen'),
  body('password')
    .isLength({ min: 8 }).withMessage('Passwort min 8 Zeichen')
    .matches(/[0-9]/).withMessage('Passwort muss eine Zahl enthalten')
    .matches(/[^a-zA-Z0-9]/).withMessage('Passwort muss ein Sonderzeichen enthalten'),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const { token, name, password } = req.body
    const db = getDb()

    const aff = db.prepare('SELECT * FROM affiliates WHERE invite_token = ?').get(token)
    if (!aff) return res.status(404).json({ error: 'Ungültiger oder abgelaufener Einladungslink' })
    if (!aff.user_id) return res.status(409).json({ error: 'Zu dieser Einladung fehlt das Benutzerkonto.' })

    const hash = await bcrypt.hash(password, 12)
    db.prepare(`
      UPDATE users SET name = ?, password_hash = ?, is_active = 1, updated_at = datetime('now')
      WHERE id = ?
    `).run(name, hash, aff.user_id)
    db.prepare("UPDATE affiliates SET invite_token = NULL, status = 'active', updated_at = datetime('now') WHERE id = ?").run(aff.id)

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(aff.user_id)
    res.status(201).json(issueTokens(res, updated))
  }
)

// ── MFA Routes ────────────────────────────────────────────────────────────────

// GET /api/auth/mfa/status
router.get('/mfa/status', authenticate, (req, res) => {
  const row = getDb()
    .prepare('SELECT mfa_enabled FROM users WHERE id = ?')
    .get(req.user.id)
  res.json({ enabled: !!row?.mfa_enabled })
})

// POST /api/auth/mfa/setup — generate TOTP secret + QR code (not yet enabled)
router.post('/mfa/setup', authenticate, async (req, res) => {
  const secret = totpSecret()
  const otpAuthUrl = totpKeyUri(req.user.email, 'ATELIER CMS', secret)
  const qrCode = await QRCode.toDataURL(otpAuthUrl)

  // Store secret temporarily (not enabled until confirmed)
  getDb()
    .prepare("UPDATE users SET mfa_secret = ? WHERE id = ?")
    .run(secret, req.user.id)

  res.json({ secret, qrCode })
})

// POST /api/auth/mfa/confirm — verify first code and enable MFA
router.post('/mfa/confirm', authenticate, (req, res) => {
  const { code } = req.body
  if (!code) return res.status(400).json({ error: 'Code erforderlich' })

  const db  = getDb()
  const row = db.prepare('SELECT mfa_secret FROM users WHERE id = ?').get(req.user.id)
  if (!row?.mfa_secret) {
    return res.status(400).json({ error: 'Kein Setup gefunden. Bitte Setup neu starten.' })
  }

  const valid = totpVerify(code, row.mfa_secret)
  if (!valid) return res.status(400).json({ error: 'Ungültiger Code' })

  db.prepare('UPDATE users SET mfa_enabled = 1 WHERE id = ?').run(req.user.id)
  res.json({ message: 'MFA aktiviert' })
})

// DELETE /api/auth/mfa — disable MFA (requires current MFA code)
router.delete('/mfa', authenticate, (req, res) => {
  const code = req.headers['x-mfa-code']
  if (!code) return res.status(400).json({ error: 'MFA-Code erforderlich', code: 'MFA_REQUIRED' })

  const db  = getDb()
  const row = db.prepare('SELECT mfa_secret, mfa_enabled FROM users WHERE id = ?').get(req.user.id)
  if (!row?.mfa_enabled) {
    return res.status(400).json({ error: 'MFA ist nicht aktiviert' })
  }

  const valid = totpVerify(code, row.mfa_secret)
  if (!valid) return res.status(400).json({ error: 'Ungültiger MFA-Code', code: 'MFA_INVALID' })

  db.prepare('UPDATE users SET mfa_enabled = 0, mfa_secret = NULL WHERE id = ?').run(req.user.id)
  res.json({ message: 'MFA deaktiviert' })
})

export default router
