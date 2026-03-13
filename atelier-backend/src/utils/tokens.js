import jwt from 'jsonwebtoken'
import crypto from 'crypto'

const ACCESS_EXPIRY  = '15m'
const REFRESH_EXPIRY = 7 * 24 * 60 * 60 * 1000 // 7 days in ms

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, name: user.name },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRY }
  )
}

export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET)
}

export function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex')
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function refreshExpiresAt() {
  return new Date(Date.now() + REFRESH_EXPIRY).toISOString()
}

export const REFRESH_MAX_AGE = REFRESH_EXPIRY

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api/auth/refresh',
  maxAge: REFRESH_EXPIRY,
}
