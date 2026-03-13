import { verifyAccessToken } from '../utils/tokens.js'
import { getDb } from '../db/database.js'
import { totpVerify } from '../utils/totp.js'

export function authenticate(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' })
  }

  const token = header.slice(7)
  try {
    const payload = verifyAccessToken(token)
    // Verify user is still active
    const user = getDb().prepare('SELECT id, name, email, role, is_active FROM users WHERE id = ?').get(payload.sub)
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Account inactive or not found' })
    }
    req.user = user
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' })
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' })
    }
    next()
  }
}

export function requireMFA(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })
  const row = getDb()
    .prepare('SELECT mfa_secret, mfa_enabled FROM users WHERE id = ?')
    .get(req.user.id)
  if (!row?.mfa_enabled) {
    return res.status(403).json({ error: 'MFA nicht eingerichtet', code: 'MFA_NOT_SETUP' })
  }
  const code = req.headers['x-mfa-code']
  if (!code) {
    return res.status(403).json({ error: 'MFA-Code erforderlich', code: 'MFA_REQUIRED' })
  }
  const valid = totpVerify(code, row.mfa_secret)
  if (!valid) {
    return res.status(400).json({ error: 'Ungültiger oder abgelaufener MFA-Code', code: 'MFA_INVALID' })
  }
  next()
}
