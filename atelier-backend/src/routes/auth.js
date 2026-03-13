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
import { authLimiter, refreshLimiter } from '../middleware/rateLimiter.js'
import { authenticate } from '../middleware/auth.js'

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

function issueTokens(res, user) {
  const accessToken  = signAccessToken(user)
  const refreshToken = generateRefreshToken()
  const tokenHash    = hashToken(refreshToken)
  const expiresAt    = refreshExpiresAt()

  getDb().prepare(`
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
    VALUES (?, ?, ?)
  `).run(user.id, tokenHash, expiresAt)

  res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS)

  return { accessToken, user: { id: user.id, name: user.name, email: user.email, role: user.role } }
}

// POST /api/auth/register
router.post('/register', authLimiter, validateRegister, (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

  const { name, email, password } = req.body
  const db = getDb()

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' })
  }

  const hash = bcrypt.hashSync(password, 12)
  const result = db.prepare(`
    INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'user')
  `).run(name, email, hash)

  const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(result.lastInsertRowid)
  const payload = issueTokens(res, user)
  res.status(201).json(payload)
})

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
  const rawToken = req.cookies?.refreshToken
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
  const rawToken = req.cookies?.refreshToken
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
  res.json({ id, name, email, role })
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
