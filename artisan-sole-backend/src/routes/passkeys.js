/**
 * passkeys.js · Anmeldung ohne Passwort (WebAuthn).
 *
 * ── Warum der Passkey jetzt der Regelweg ist ──────────────────────────────
 *
 * Ursprünglich war er den Verwaltungsrollen vorbehalten, mit der Begründung:
 * geringer Gewinn für Kunden, aber jedes verlorene Telefon wird zum
 * Support-Fall. Die Rechnung ging so nicht auf. Ein Passwort ist auch ein
 * Support-Fall — nur einer, der viel häufiger eintritt, weil man es vergisst,
 * ohne etwas zu verlieren. Und die Wiederherstellung eines Passworts hing an
 * einer Mail, die dieses Haus derzeit nicht verschicken kann.
 *
 * Was dadurch ersatzlos entfällt: Passwortregeln, Passwortstärke,
 * Zurücksetzen, Phishing, wiederverwendete Passwörter, die Abhängigkeit vom
 * Mailversand. Was hinzukommt: eine Registrierung, die aus einem Blick ins
 * Gesicht besteht.
 *
 * Das Passwort bleibt ausschließlich für Verwaltungsrollen bestehen — als
 * Notausgang. Wer den eigenen Laden betreibt, darf nicht durch ein verlorenes
 * Telefon davor stehen.
 *
 * ── Wo es nicht funktioniert, und was dann geschieht ──────────────────────
 *
 * Eingebettete Browser (Instagram, Facebook) können WebAuthn oft nicht. Die
 * Registrierung schlägt dort fehl, und ohne Erklärung sähe es nach einem
 * Fehler der Seite aus. Die Oberfläche prüft das vorher und sagt es.
 *
 * Hinweis zur iOS-App: Passkeys sind an die Domain gebunden. Die Capacitor-App
 * lädt aus capacitor://localhost und teilt diese Bindung nicht; dort braucht
 * es Associated Domains, damit dieselben Schlüssel gelten.
 */
import { Router } from 'express'
import crypto from 'crypto'
import {
  generateRegistrationOptions, verifyRegistrationResponse,
  generateAuthenticationOptions, verifyAuthenticationResponse,
} from '@simplewebauthn/server'
import { getDb } from '../db/database.js'
import { authenticate } from '../middleware/auth.js'
import { kennungPruefen, kennungEinloesen } from './recovery.js'

const router = Router()
// Jeder Angemeldete verwaltet seine eigenen Passkeys. Die Beschränkung auf
// Verwaltungsrollen ist weggefallen — sie war der Grund, weshalb Kunden
// überhaupt noch Passwörter brauchten.
const canUse = [authenticate]

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
function storeChallenge(userId, challenge, purpose, daten = null) {
  const db = getDb()
  db.prepare("DELETE FROM webauthn_challenges WHERE created_at < datetime('now', ?)")
    .run(`-${CHALLENGE_TTL_MINUTES} minutes`)
  const id = crypto.randomBytes(24).toString('base64url')
  db.prepare('INSERT INTO webauthn_challenges (id, user_id, challenge, purpose, data) VALUES (?,?,?,?,?)')
    .run(id, userId ?? null, challenge, purpose, daten ? JSON.stringify(daten) : null)
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

// ── Registrieren ohne Passwort ──────────────────────────────────────────────
//
// Bislang ließ sich ein Passkey nur HINZUFÜGEN, wenn man bereits angemeldet
// war — es gab also keinen Weg in ein Konto hinein, der ohne Passwort auskam.
// Diese beiden Aufrufe schließen ihn: Name und Adresse, ein Blick ins Gesicht,
// fertig. Ein Passwort entsteht dabei nie, und was nie entsteht, kann weder
// vergessen noch gestohlen werden.
//
// Bestehende Konten bleiben unberührt: Wer ein Passwort hat, meldet sich
// weiter damit an und kann sich einen Passkey dazulegen.

const normMail = (s) => String(s || '').trim().toLowerCase()

router.post('/signup/options', async (req, res) => {
  const email = normMail(req.body?.email)
  const name  = String(req.body?.name || '').trim()

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: 'Bitte eine gültige E-Mail-Adresse angeben.' })
  }
  if (name.length < 2) {
    return res.status(400).json({ error: 'Bitte einen Namen angeben.' })
  }

  const db = getDb()
  if (db.prepare('SELECT 1 FROM users WHERE email = ? COLLATE NOCASE').get(email)) {
    // Kein stilles Weiterlaufen: Wer hier landet, hat schon ein Konto und
    // sucht die Anmeldung, nicht die Registrierung.
    return res.status(409).json({
      error: 'Zu dieser Adresse besteht bereits ein Konto. Bitte melden Sie sich an.',
      code: 'KONTO_VORHANDEN',
    })
  }

  const { rpID } = relyingParty()
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID,
    userName: email,
    userDisplayName: name,
    authenticatorSelection: {
      residentKey: 'required',       // später ohne eingetippte Adresse anmelden
      userVerification: 'preferred', // Gesicht, Fingerabdruck oder Geräte-PIN
    },
  })

  // Name und Adresse überdauern die Zeremonie hier, nicht im Browser. Kämen
  // sie beim Einlösen erneut mit, ließe sich dazwischen eine andere Adresse
  // einsetzen und der Passkey einem fremden Konto zuschreiben.
  const challengeId = storeChallenge(null, options.challenge, 'register', { email, name })
  res.json({ challengeId, options })
})

/**
 * Der zweite Schritt: Passkey prüfen, Konto anlegen, angemeldet sein.
 *
 * Braucht issueTokens und wird deshalb wie die Anmeldung von außen verdrahtet.
 */
export function makeSignupVerify(issueTokens) {
  return async (req, res) => {
    const { challengeId, response, label } = req.body || {}
    const stored = consumeChallenge(challengeId, 'register')
    // Eine Registrierungs-Aufgabe ohne Konto dahinter (user_id NULL) und mit
    // hinterlegten Daten — so lässt sie sich nicht mit der Aufgabe eines
    // angemeldeten Nutzers verwechseln, der nur ein Gerät hinzufügt.
    if (!stored || stored.user_id !== null || !stored.data) {
      return res.status(400).json({ error: 'Der Vorgang ist abgelaufen. Bitte erneut versuchen.' })
    }

    let angaben
    try { angaben = JSON.parse(stored.data) } catch { angaben = null }
    if (!angaben?.email) {
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
      return res.status(400).json({ error: 'Der Passkey konnte nicht bestätigt werden.' })
    }

    const db = getDb()
    const { credential } = verification.registrationInfo

    // Konto und Schlüssel entstehen gemeinsam oder gar nicht. Ohne Klammer
    // bliebe bei einem Fehler im zweiten Schritt ein Konto zurück, in das
    // niemand hineinkommt — kein Passwort, kein Passkey.
    let neu
    try {
      neu = db.transaction(() => {
        if (db.prepare('SELECT 1 FROM users WHERE email = ? COLLATE NOCASE').get(angaben.email)) {
          const e = new Error('KONTO_VORHANDEN'); e.bekannt = true; throw e
        }
        // Ein Zufallswert als Passwort-Hash: Die Spalte verlangt einen Wert,
        // und er darf zu keiner Eingabe passen. Nichts kann ihn erraten, weil
        // er nie ein Passwort war.
        const platzhalter = `passkey:${crypto.randomBytes(32).toString('hex')}`
        const info = db.prepare(`
          INSERT INTO users (name, email, password_hash, role, is_active, email_verified)
          VALUES (?, ?, ?, 'user', 1, 0)
        `).run(angaben.name, angaben.email, platzhalter)

        db.prepare(`
          INSERT INTO passkeys (user_id, credential_id, public_key, counter, transports, label)
          VALUES (?,?,?,?,?,?)
        `).run(
          info.lastInsertRowid,
          credential.id,
          Buffer.from(credential.publicKey).toString('base64'),
          credential.counter || 0,
          JSON.stringify(credential.transports || []),
          (label || '').trim().slice(0, 60) || 'Erstes Gerät',
        )
        return db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid)
      })()
    } catch (e) {
      if (e.bekannt || String(e.message).includes('UNIQUE')) {
        return res.status(409).json({ error: 'Zu dieser Adresse besteht bereits ein Konto. Bitte melden Sie sich an.' })
      }
      throw e
    }

    res.status(201).json(issueTokens(res, neu))
  }
}

// ── Zugang wiederherstellen ─────────────────────────────────────────────────
//
// Mit einer Kennung aus recovery.js: ausgestellt entweder gegen Bestellnummer
// und Postleitzahl oder von der Verwaltung. Sie erlaubt genau eines — einen
// neuen Passkey anzulegen.

router.post('/recover/options', async (req, res) => {
  const db = getDb()
  const eintrag = kennungPruefen(db, req.body?.token)
  if (!eintrag) {
    return res.status(400).json({ error: 'Dieser Link ist abgelaufen oder wurde bereits benutzt.' })
  }
  const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(eintrag.user_id)
  if (!user) return res.status(400).json({ error: 'Dieser Link ist abgelaufen oder wurde bereits benutzt.' })

  const { rpID } = relyingParty()
  const vorhanden = db.prepare('SELECT credential_id, transports FROM passkeys WHERE user_id = ?').all(user.id)
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID,
    userName: user.email,
    userDisplayName: user.name || user.email,
    excludeCredentials: vorhanden.map(c => ({ id: c.credential_id, transports: toTransports(c.transports) })),
    authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' },
  })

  const challengeId = storeChallenge(user.id, options.challenge, 'register')
  res.json({ challengeId, options, name: user.name })
})

export function makeRecoverVerify(issueTokens) {
  return async (req, res) => {
    const { token, challengeId, response, label } = req.body || {}
    const db = getDb()

    // Erst die Kennung, dann die Aufgabe: Eine gültige Aufgabe ohne gültige
    // Kennung wäre ein Weg, sich einen Schlüssel in ein fremdes Konto zu
    // legen, sobald man einmal eine Aufgabe abgefangen hat.
    const eintrag = kennungPruefen(db, token)
    if (!eintrag) {
      return res.status(400).json({ error: 'Dieser Link ist abgelaufen oder wurde bereits benutzt.' })
    }
    const stored = consumeChallenge(challengeId, 'register')
    if (!stored || stored.user_id !== eintrag.user_id) {
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
      return res.status(400).json({ error: 'Der Passkey konnte nicht bestätigt werden.' })
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(eintrag.user_id)
    if (!user || !user.is_active) {
      return res.status(400).json({ error: 'Dieser Link ist abgelaufen oder wurde bereits benutzt.' })
    }

    const { credential } = verification.registrationInfo
    db.transaction(() => {
      db.prepare(`
        INSERT INTO passkeys (user_id, credential_id, public_key, counter, transports, label)
        VALUES (?,?,?,?,?,?)
      `).run(
        user.id,
        credential.id,
        Buffer.from(credential.publicKey).toString('base64'),
        credential.counter || 0,
        JSON.stringify(credential.transports || []),
        (label || '').trim().slice(0, 60) || 'Wiederhergestellt',
      )
      kennungEinloesen(db, eintrag.id)

      // Alle bestehenden Sitzungen beenden. Wer den Zugang zurückholt, will
      // nicht, dass daneben noch jemand angemeldet bleibt.
      db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(user.id)

      // Bestehende Passkeys bleiben ABSICHTLICH stehen: Sie zu löschen machte
      // aus der Wiederherstellung eine Waffe gegen den rechtmäßigen Inhaber.
      // Stattdessen eine Spur im Nachrichtenverlauf — der einzige Kanal, der
      // den Kunden ohne Mailversand zuverlässig erreicht.
      try {
        let thread = db.prepare('SELECT id FROM chat_threads WHERE user_id = ?').get(user.id)
        if (!thread) {
          const info = db.prepare('INSERT INTO chat_threads (user_id) VALUES (?)').run(user.id)
          thread = { id: info.lastInsertRowid }
        }
        db.prepare(`
          INSERT INTO chat_messages (thread_id, sender, body)
          VALUES (?, 'team', ?)
        `).run(
          thread.id,
          'Für Ihr Konto wurde ein neues Gerät zur Anmeldung hinterlegt und alle offenen '
          + 'Sitzungen wurden beendet. Waren Sie das nicht, melden Sie sich bitte umgehend '
          + 'bei uns — wir entfernen den Zugang dann sofort.',
        )
      } catch { /* ohne Nachrichtenverlauf geht die Wiederherstellung trotzdem */ }
    })()

    res.json(issueTokens(res, user))
  }
}

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
