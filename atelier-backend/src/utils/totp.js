/**
 * totp.js — thin ESM wrapper around the CJS-only `otplib` package.
 * Uses createRequire to bridge the module boundary.
 */
import { createRequire } from 'module'
const _require = createRequire(import.meta.url)
const { verifySync, generateSync, generateSecret } = _require('otplib')

/**
 * Verify a 6-digit TOTP token against a secret.
 * @param {string} token  - the 6-digit code
 * @param {string} secret - base32 TOTP secret
 * @returns {boolean}
 */
export function totpVerify(token, secret) {
  try {
    const result = verifySync({ type: 'totp', token: String(token), secret })
    return result?.valid === true
  } catch { return false }
}

/**
 * Generate the current TOTP token for a secret (useful for testing).
 */
export function totpGenerate(secret) {
  return generateSync({ type: 'totp', secret })
}

/**
 * Generate a new random TOTP secret (base32 encoded).
 */
export { generateSecret as totpSecret }

/**
 * Build an otpauth:// URI compatible with Google Authenticator.
 */
export function totpKeyUri(email, issuer, secret) {
  const label = encodeURIComponent(`${issuer}:${email}`)
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`
}
