import { Capacitor } from '@capacitor/core'
import { getAccessToken, setAccessToken } from '../context/AuthContext'

// In Capacitor iOS production builds, relative URLs don't reach the backend.
// VITE_API_URL should be set to the production server (e.g. https://artisansole.com).
// Empty string in dev, Vite proxy handles /api/* → localhost:3001.
const API_BASE = import.meta.env.VITE_API_URL ?? ''
const isNativePlatform = Capacitor.isNativePlatform()

// In-memory refresh token for native builds (mirrors AuthContext._refreshToken)
let _nativeRefreshToken = null
export function setNativeRefreshToken(t) { _nativeRefreshToken = t }

let isRefreshing = false
let refreshQueue = []

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
// Exponentielles Backoff mit Jitter (300ms, 600ms, 1200ms …, gekappt bei 8s).
const backoff = (attempt) => Math.min(8000, 300 * 2 ** attempt + Math.random() * 250)

/**
 * Einziger Weg, einen neuen Access-Token zu holen.
 *
 * Der Refresh-Token ist einmalig: /api/auth/refresh löscht den alten und gibt
 * einen neuen aus. Zwei gleichzeitige Aufrufe entwerten sich deshalb
 * gegenseitig — der erste rotiert, der zweite legt den bereits gelöschten
 * Token vor und bekommt 401. Danach ist die Sitzung serverseitig weg, und
 * jeder Schreibvorgang scheitert mit „No token provided", obwohl die
 * Oberfläche noch angemeldet aussieht.
 *
 * Genau das passierte beim harten Neuladen: AuthContext erneuerte die Sitzung,
 * und parallel liefen ein Dutzend Datenabrufe ohne Token in ihr 401 und
 * erneuerten ein zweites Mal. Deshalb teilen sich jetzt beide Seiten diese
 * eine Sperre; AuthContext ruft dieselbe Funktion auf.
 *
 * Liefert die vollständige Antwort ({ accessToken, user, … }), damit auch
 * AuthContext den Benutzer daraus setzen kann.
 */
export async function refreshAccessToken() {
  if (isRefreshing) {
    return new Promise((resolve, reject) => refreshQueue.push({ resolve, reject }))
  }
  isRefreshing = true
  try {
    const fetchOpts = { method: 'POST', credentials: 'include', headers: { 'X-Requested-With': 'ArtisanSole' } }
    if (isNativePlatform && _nativeRefreshToken) {
      fetchOpts.headers = { ...fetchOpts.headers, 'Content-Type': 'application/json' }
      fetchOpts.body = JSON.stringify({ refreshToken: _nativeRefreshToken })
    }
    // Bei schnellem mehrfachem Neuladen kann der Refresh-Endpunkt kurzzeitig
    // rate-limitet sein (429). Einmal mit kurzem Backoff erneut versuchen,
    // statt die ganze Sitzung scheitern zu lassen.
    let res = await fetch(`${API_BASE}/api/auth/refresh`, fetchOpts)
    if (res.status === 429) {
      const ra = Number(res.headers.get('Retry-After'))
      await sleep(Number.isFinite(ra) && ra > 0 ? Math.min(ra * 1000, 4000) : 800)
      res = await fetch(`${API_BASE}/api/auth/refresh`, fetchOpts)
    }
    if (!res.ok) throw new Error('refresh_failed')
    const data = await res.json()
    setAccessToken(data.accessToken)
    if (isNativePlatform && data.refreshToken) _nativeRefreshToken = data.refreshToken
    refreshQueue.forEach(p => p.resolve(data))
    return data
  } catch (err) {
    refreshQueue.forEach(p => p.reject(err))
    setAccessToken(null)
    _nativeRefreshToken = null
    throw err
  } finally {
    isRefreshing = false
    refreshQueue = []
  }
}

/**
 * Ein Satz zu einem Statuscode, wenn der Server keinen mitgeschickt hat.
 *
 * „HTTP 400" sagt niemandem, was zu tun ist — es sah aus wie ein Defekt,
 * obwohl meist nur ein Feld nicht stimmte. Die Sätze hier sind der letzte
 * Ausweg: Steht im Körper eine Meldung oder eine Feldprüfung, gilt die.
 */
function statusSatz(status) {
  switch (status) {
    case 400: return 'Ihre Angaben sind unvollständig oder nicht im erwarteten Format. Bitte prüfen Sie die Felder.'
    case 401: return 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.'
    case 403: return 'Für diesen Schritt fehlt die Berechtigung.'
    case 404: return 'Das Gesuchte gibt es nicht (mehr).'
    case 409: return 'Das lässt sich so nicht speichern — etwas ist bereits vergeben oder hat sich inzwischen geändert.'
    case 413: return 'Die Datei ist zu groß.'
    case 422: return 'Die Angaben konnten nicht verarbeitet werden. Bitte prüfen Sie die Felder.'
    case 429: return 'Zu viele Versuche in kurzer Zeit. Bitte warten Sie einen Moment — an Ihren Angaben liegt es nicht.'
    case 500: return 'Auf unserer Seite ist etwas schiefgegangen. Ihre Angaben sind in Ordnung — bitte versuchen Sie es in einigen Minuten erneut.'
    case 502:
    case 503:
    case 504: return 'Unser Server ist gerade nicht erreichbar. Das liegt nicht an Ihren Angaben — bitte versuchen Sie es in einigen Minuten erneut.'
    default:  return status >= 500
      ? 'Auf unserer Seite ist etwas schiefgegangen. Ihre Angaben sind in Ordnung — bitte versuchen Sie es später erneut.'
      : 'Die Anfrage konnte nicht verarbeitet werden. Bitte prüfen Sie Ihre Angaben.'
  }
}

/**
 * Woran es lag — damit die Meldung nicht offenlässt, wer am Zug ist.
 *
 * „Bitte versuchen Sie es erneut" ist der unfreundlichste Satz, den ein
 * Formular sagen kann: Er verschweigt, ob der Kunde etwas ändern kann oder ob
 * er vergeblich klickt, weil unser Server nicht antwortet.
 *
 *   'angaben'   — im Formular steht etwas, das sich korrigieren lässt
 *   'anmeldung' — die Sitzung fehlt oder reicht nicht
 *   'warten'    — zu viele Versuche, es hilft nur Zeit
 *   'system'    — unsere Seite; der Kunde kann nichts tun
 */
function herkunftZuStatus(status) {
  if (status === 401 || status === 403) return 'anmeldung'
  if (status === 429) return 'warten'
  if (status >= 500 || status === 0) return 'system'
  return 'angaben'
}

export async function apiFetch(url, options = {}, _attempt = 0) {
  const token = getAccessToken()
  const headers = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'ArtisanSole',
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  const fullUrl = `${API_BASE}${url}`
  const method = (options.method || 'GET').toUpperCase()
  const idempotent = method === 'GET' || method === 'HEAD'

  let res
  try {
    res = await fetch(fullUrl, { ...options, headers, credentials: 'include' })
  } catch (netErr) {
    // Netzwerk-Blip (häufig bei schnellem Neuladen): idempotente Requests
    // ein paar Mal mit Backoff wiederholen, bevor wir aufgeben.
    if (idempotent && _attempt < 3) {
      await sleep(backoff(_attempt))
      return apiFetch(url, options, _attempt + 1)
    }
    // Hier landet, was den Server nie erreicht hat: Server aus, Verbindung
    // weg, Anfrage vom Browser blockiert. Bisher schlug der rohe TypeError
    // durch — ohne `.error`, weshalb jedes Formular auf seinen allgemeinen
    // Ersatzsatz zurückfiel („Bitte versuchen Sie es erneut"). Der Kunde
    // korrigierte daraufhin Felder, an denen nichts falsch war.
    //
    // Deshalb bekommt der Netzwerkfall dieselbe Form wie eine Fehlerantwort,
    // nur mit Status 0 — und sagt ausdrücklich, dass es nicht an den Angaben
    // liegt.
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false
    const fehler = new Error(offline
      ? 'Keine Internetverbindung. Ihre Angaben bleiben erhalten — bitte versuchen Sie es erneut, sobald Sie wieder online sind.'
      : 'Wir konnten unseren Server nicht erreichen. Das liegt nicht an Ihren Angaben — bitte versuchen Sie es in einigen Minuten erneut.')
    fehler.status = 0
    fehler.herkunft = offline ? 'verbindung' : 'system'
    fehler.error = fehler.message
    fehler.ursache = netErr
    throw fehler
  }

  // Token expired, try refresh once
  if (res.status === 401) {
    try {
      const data = await refreshAccessToken()
      res = await fetch(fullUrl, {
        ...options,
        headers: { ...headers, Authorization: `Bearer ${data.accessToken}` },
        credentials: 'include',
      })
    } catch {
      // Refresh failed, let the caller handle the 401. ProtectedRoute will
      // redirect logged-out users when they hit a guarded page; public pages
      // (Window-Shopping) just see the empty/fallback data via .catch().
      // No forced window.location redirect, that would block guest browsing.
    }
  }

  // Transiente Server-/Rate-Limit-Antworten abfedern. 429 bedeutet, der
  // Request wurde NICHT verarbeitet → für jede Methode sicher wiederholbar.
  // 502/503/504 nur für idempotente Requests wiederholen.
  if ((res.status === 429 || (idempotent && [502, 503, 504].includes(res.status))) && _attempt < 3) {
    const ra = Number(res.headers.get('Retry-After'))
    const wait = Number.isFinite(ra) && ra > 0 ? Math.min(ra * 1000, 8000) : backoff(_attempt)
    await sleep(wait)
    return apiFetch(url, options, _attempt + 1)
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Unknown error' }))
    // express-validator antwortet mit { errors: [{ msg, path }] }, nicht mit
    // { error }. Ohne diese Zeile blieb von „Ungültige Telefonnummer" nur
    // „HTTP 400" übrig — und zwar in jedem validierten Formular der Anwendung.
    // Mehrere Fehler werden zusammengezogen, sonst behebt man sie einzeln
    // und schickt für jeden erneut ab.
    const validierung = Array.isArray(body.errors)
      ? [...new Set(body.errors.map(e => e?.msg).filter(Boolean))].join(' · ')
      : null
    // 'Unknown error' stammt aus der Ersatzantwort oben, wenn der Körper kein
    // JSON war — als Meldung taugt er nicht.
    const vomServer = [body.detail, body.error, body.message]
      .find(t => typeof t === 'string' && t.trim() && t !== 'Unknown error')

    const errMsg = vomServer || validierung || statusSatz(res.status)
    const error = new Error(errMsg)
    error.status = res.status
    error.body = body
    error.code = body.code || null
    error.error = errMsg
    // Wer ist am Zug — der Kunde oder wir? Formulare können daran ihren
    // Hinweis ausrichten, statt jeden Fehlschlag gleich aussehen zu lassen.
    error.herkunft = herkunftZuStatus(res.status)
    throw error
  }

  // Wer etwas anderes als JSON erwartet — eine Rechnung als PDF etwa —
  // bekommt die Antwort selbst. Alles davor gilt trotzdem: Anmeldung,
  // Token-Erneuerung, Wiederholung bei 429.
  if (options.raw) return res

  const text = await res.text()
  return text ? JSON.parse(text) : null
}
