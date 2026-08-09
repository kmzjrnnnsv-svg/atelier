/**
 * passkeys.js · Anmeldung mit Passkey (WebAuthn) für den Verwaltungszugang.
 *
 * Warum nur für Verwaltungsrollen: Dort ist der Gewinn am größten und der
 * Aufwand am kleinsten. Ein Passkey ist gegen Phishing immun — anders als
 * Passwort plus TOTP, das sich auf einer nachgebauten Anmeldeseite abgreifen
 * lässt. Und weil den Zugang eine Handvoll Menschen benutzt, entsteht kein
 * Betreuungsaufwand für verlorene Geräte.
 *
 * Für Kundenkonten bewusst nicht: geringer Sicherheitsgewinn, aber jeder
 * Kunde mit verlorenem Telefon landet als Support-Fall beim Betreiber.
 *
 * Das Passwort bleibt bestehen. Ein Passkey ist der bequeme Normalweg, nicht
 * der einzige — wer sein einziges Gerät verliert, käme sonst an seinen
 * eigenen Laden nicht mehr heran.
 *
 * Hinweis zur iOS-App: Passkeys sind an die Domain gebunden. Die Capacitor-App
 * lädt aus capacitor://localhost und teilt diese Bindung nicht. Dort bleibt
 * die Anmeldung per Passwort — für den Verwaltungszugang ist das folgenlos,
 * der läuft ohnehin im Browser.
 */
import { Router } from 'express'
import crypto from 'crypto'
import {
  generateRegistrationOptions, verifyRegistrationResponse,
  generateAuthenticationOptions, verifyAuthenticationResponse,
} from '@simplewebauthn/server'
import { getDb } from '../db/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()
const canUse = [authenticate, requireRole('admin', 'curator')]

const RP_NAME = 'Artisan Sole'
const CHALLENGE_TTL_MINUTES = 5

/**
 * Die Kennung der vertrauenswürdigen Partei — die nackte Domain. Sie ist
 * unveränderlich: Wird sie später geändert, sind alle hinterlegten Passkeys
 * wertlos, weil das Gerät sie nicht mehr zuordnet.
 *
 * Abgeleitet aus app_url, damit Entwicklung (localhost) und Betrieb ohne
 * Sonderbehandlung funktionieren. WEBAUTHN_RP_ID sticht, falls die Domain
 * einmal von der App-Adresse abweichen sollte.
 */
function relyingParty() {
  const db = getDb()
  const row = db.prepare("SELECT value FROM settings WHERE key = 'app_url'").get()
  const appUrl = process.env.APP_URL || row?.value || 'http://localhost:5173'
  let origin = appUrl.replace(/\/+$/, '')
  let host = 'localhost'
  try { host = new URL(origin).hostname } catch { /* unbrauchbare Adresse, Rückfall unten */ }

  // Ein Passkey für artisansole.com gilt auch auf business.artisansole.com.
  // Deshalb die Registrierungsdomain um eine Ebene kürzen, wenn wir auf einer
  // Unterdomain sitzen — sonst bräuchte jede Unterdomain eigene Schlüssel.
  const rpID = process.env.WEBAUTHN_RP_ID || host.replace(/^business\./i, '')

  // Beide Herkünfte gelten: Wer sich auf der Unterdomain anmeldet, soll
  // denselben Schlüssel benutzen können.
  const origins = [origin]
  if (host !== rpID) origins.push(origin.replace(host, rpID))
  return { rpID, origins }
}

// ── Aufgaben (Challenges) ───────────────────────────────────────────────────
// In der Datenbank statt in der Sitzung: Die Anmeldung findet ohne Sitzung
// statt, und mehrere Backend-Prozesse teilen keinen Arbeitsspeicher.
function storeChallenge(userId, challenge, purpose) {
  const db = getDb()
  db.prepare("DELETE FROM webauthn_challenges WHERE created_at < datetime('now', ?)")
    .run(`-${CHALLENGE_TTL_MINUTES} minutes`)
  const id = crypto.randomBytes(24).toString('base64url')
  db.prepare('INSERT INTO webauthn_challenges (id, user_id, challenge, purpose) VALUES (?,?,?,?)')
    .run(id, userId ?? null, challenge, purpose)
  return id
}

/** Einlösen: liefert die Aufgabe und löscht sie. Ein zweiter Versuch scheitert. */
function consumeChallenge(id, purpose) {
  const db = getDb()
  const row = db.prepare(
    "SELECT * FROM webauthn_challenges WHERE id = ? AND purpose = ? AND created_at >= datetime('now', ?)"
  ).get(id, purpose, `-${CHALLENGE_TTL_MINUTES} minutes`)
  if (row) db.prepare('DELETE FROM webauthn_challenges WHERE id = ?').run(id)
  return row || null
}

const toTransports = (v) => {
  try { const a = JSON.parse(v || '[]'); return Array.isArray(a) ? a : [] } catch { return [] }
}

// ── Eigene Passkeys verwalten ───────────────────────────────────────────────

router.get('/', ...canUse, (req, res) => {
  const rows = getDb().prepare(
    'SELECT id, label, created_at, last_used_at FROM passkeys WHERE user_id = ? ORDER BY created_at'
  ).all(req.user.id)
  res.json(rows)
})

router.delete('/:id', ...canUse, (req, res) => {
  const db = getDb()
  const info = db.prepare('DELETE FROM passkeys WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id)
  if (!info.changes) return res.status(404).json({ error: 'Nicht gefunden' })
  res.json({ ok: true })
})

// ── Einrichten ──────────────────────────────────────────────────────────────

router.post('/register/options', ...canUse, async (req, res) => {
  const { rpID } = relyingParty()
  const db = getDb()
  const existing = db.prepare('SELECT credential_id, transports FROM passkeys WHERE user_id = ?').all(req.user.id)

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID,
    userName: req.user.email,
    userDisplayName: req.user.name || req.user.email,
    // Bereits hinterlegte ausschließen, damit dasselbe Gerät nicht zweimal
    // dieselbe Kennung anlegt und der Nutzer denkt, es habe nicht geklappt.
    excludeCredentials: existing.map(c => ({ id: c.credential_id, transports: toTransports(c.transports) })),
    authenticatorSelection: {
      residentKey: 'required',       // ohne vorher eingetippte E-Mail anmelden
      userVerification: 'preferred', // Fingerabdruck, Gesicht oder Geräte-PIN
    },
  })

  const challengeId = storeChallenge(req.user.id, options.challenge, 'register')
  res.json({ challengeId, options })
})

router.post('/register/verify', ...canUse, async (req, res) => {
  const { challengeId, response, label } = req.body || {}
  const stored = consumeChallenge(challengeId, 'register')
  if (!stored || stored.user_id !== req.user.id) {
    return res.status(400).json({ error: 'Der Vorgang ist abgelaufen. Bitte erneut versuchen.' })
  }

  const { rpID, origins } = relyingParty()
  let verification
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: stored.challenge,
      expectedOrigin: origins,
      expectedRPID: rpID,
      requireUserVerification: false,
    })
  } catch (e) {
    return res.status(400).json({ error: e.message })
  }
  if (!verification.verified || !verification.registrationInfo) {
    return res.status(400).json({ error: 'Passkey konnte nicht bestätigt werden.' })
  }

  const { credential } = verification.registrationInfo
  try {
    getDb().prepare(`
      INSERT INTO passkeys (user_id, credential_id, public_key, counter, transports, label)
      VALUES (?,?,?,?,?,?)
    `).run(
      req.user.id,
      credential.id,
      Buffer.from(credential.publicKey).toString('base64'),
      credential.counter || 0,
      JSON.stringify(credential.transports || []),
      (label || '').trim().slice(0, 60) || 'Unbenanntes Gerät',
    )
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'Dieser Passkey ist bereits hinterlegt.' })
    }
    throw e
  }
  res.status(201).json({ ok: true })
})

// ── Anmelden ────────────────────────────────────────────────────────────────
// Ohne Benutzernamen: Das Gerät weiß, welcher Schlüssel zu dieser Seite
// gehört, und bietet ihn an. Deshalb residentKey oben auf 'required'.

router.post('/login/options', async (req, res) => {
  const { rpID } = relyingParty()
  const options = await generateAuthenticationOptions({ rpID, userVerification: 'preferred' })
  const challengeId = storeChallenge(null, options.challenge, 'login')
  res.json({ challengeId, options })
})

/**
 * Der eigentliche Anmeldeschritt. Er gibt bewusst keine Auskunft darüber,
 * woran es lag — ob ein Schlüssel unbekannt ist oder das Konto gesperrt,
 * geht einen Unbefugten nichts an.
 */
export function makeLoginVerify(issueTokens) {
  return async (req, res) => {
    const { challengeId, response } = req.body || {}
    const stored = consumeChallenge(challengeId, 'login')
    if (!stored) return res.status(400).json({ error: 'Der Vorgang ist abgelaufen. Bitte erneut versuchen.' })

    const db = getDb()
    const row = db.prepare('SELECT * FROM passkeys WHERE credential_id = ?').get(response?.id)
    if (!row) return res.status(401).json({ error: 'Anmeldung fehlgeschlagen' })

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(row.user_id)
    if (!user || !user.is_active) return res.status(401).json({ error: 'Anmeldung fehlgeschlagen' })
    if (user.role !== 'admin' && user.role !== 'curator') {
      return res.status(401).json({ error: 'Anmeldung fehlgeschlagen' })
    }

    const { rpID, origins } = relyingParty()
    let verification
    try {
      verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: stored.challenge,
        expectedOrigin: origins,
        expectedRPID: rpID,
        requireUserVerification: false,
        credential: {
          id: row.credential_id,
          publicKey: new Uint8Array(Buffer.from(row.public_key, 'base64')),
          counter: row.counter,
          transports: toTransports(row.transports),
        },
      })
    } catch {
      return res.status(401).json({ error: 'Anmeldung fehlgeschlagen' })
    }
    if (!verification.verified) return res.status(401).json({ error: 'Anmeldung fehlgeschlagen' })

    // Der Zähler steigt bei jeder Benutzung. Bliebe er stehen oder fiele
    // zurück, wäre das ein Hinweis auf einen kopierten Schlüssel — Geräte mit
    // Synchronisierung melden allerdings dauerhaft 0, deshalb nur mitführen.
    db.prepare("UPDATE passkeys SET counter = ?, last_used_at = datetime('now') WHERE id = ?")
      .run(verification.authenticationInfo.newCounter, row.id)

    res.json(issueTokens(res, user))
  }
}

export default router
