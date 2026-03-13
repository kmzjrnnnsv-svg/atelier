/**
 * ─────────────────────────────────────────────────────────────────────────────
 * AccountService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Verwaltet alle Account-Operationen rund um 3D-Fußmodelle:
 *   - STL-Dateien in den persönlichen Account-Ordner hochladen
 *   - Vorhandene Modelle abrufen
 *   - Upload-Status tracken
 *
 * API-Basis: ATELIER Backend (Express / Node.js)
 * Auth:      JWT Bearer Token (in Memory, kein LocalStorage)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import RNFS from 'react-native-fs'
import { API_CONFIG, STL_CONFIG } from '../constants/scanConfig'

// ── Auth-Token-Getter (wird aus dem Auth-Context injiziert) ───────────────────
// Anstatt AuthContext hier direkt zu importieren, wird ein Getter-Callback
// übergeben. Das hält den Service entkoppelt.
let _getToken = null

/**
 * Registriert die Token-Getter-Funktion.
 * Muss beim App-Start aufgerufen werden:
 *   AccountService.setTokenGetter(() => authContext.accessToken)
 *
 * @param {Function} getter  – () => string | null
 */
export function setTokenGetter(getter) {
  _getToken = getter
}

function _authHeaders() {
  const token = _getToken?.()
  if (!token) throw new Error('Kein Auth-Token verfügbar. Bitte erneut einloggen.')
  return {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${token}`,
  }
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lädt eine STL-Datei in den persönlichen Ordner des Nutzers hoch.
 *
 * Endpoint: POST /users/me/foot-models
 * Body:     multipart/form-data
 *   - file:      STL-Datei
 *   - foot_side: 'LEFT' | 'RIGHT'
 *   - accuracy:  Scan-Genauigkeit (%)
 *   - measurements: JSON-Objekt mit Fußmaßen
 *
 * Das Backend speichert die Datei unter:
 *   /uploads/users/{userId}/foot-models/{foot_side.toLowerCase()}_foot.stl
 *
 * @param {object} params
 * @param {string}           params.filePath      – Lokaler temp-Pfad zur STL
 * @param {('LEFT'|'RIGHT')} params.footSide
 * @param {number}           params.accuracy      – 0–100
 * @param {object}           params.measurements  – Fußmaße in mm
 * @param {Function}         params.onProgress    – (pct: 0–100) => void
 * @returns {Promise<UploadResult>}
 */
export async function uploadSTLModel({ filePath, footSide, accuracy, measurements, onProgress }) {
  // Datei als Base64 lesen (für JSON-Upload)
  // Alternative: multipart/form-data mit react-native-blob-util
  const base64Data = await RNFS.readFile(filePath, 'base64')

  const body = JSON.stringify({
    foot_side:    footSide,
    stl_data:     base64Data,          // Base64-kodiertes Binary STL
    accuracy:     Math.round(accuracy * 10) / 10,
    measurements: {
      length_mm:        measurements.length,
      width_mm:         measurements.width,
      heel_width_mm:    measurements.heelWidth,
      instep_height_mm: measurements.instepHeight,
      arch_height_mm:   measurements.archHeight,
    },
    metadata: {
      generated_at: new Date().toISOString(),
      sdk_version:  '3.0',
      file_format:  STL_CONFIG.format,
    },
  })

  // Upload mit Fortschritts-Tracking
  // (Für echtes Fortschritts-Tracking: XMLHttpRequest oder react-native-blob-util)
  const controller = new AbortController()
  const timeoutId  = setTimeout(() => controller.abort(), API_CONFIG.uploadTimeoutMs)

  try {
    onProgress?.(10) // Upload gestartet

    const response = await fetch(
      `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.uploadSTL}`,
      {
        method:  'POST',
        headers: _authHeaders(),
        body,
        signal:  controller.signal,
      }
    )

    onProgress?.(90)

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      throw new Error(errData.message ?? `Upload fehlgeschlagen (HTTP ${response.status})`)
    }

    const result = await response.json()
    onProgress?.(100)

    // result enthält:
    // {
    //   id:           'model_abc123',
    //   foot_side:    'LEFT',
    //   file_url:     'https://storage.../left_foot.stl',
    //   accuracy:     97.4,
    //   created_at:   '2024-01-15T10:30:00Z',
    // }
    return {
      success:  true,
      modelId:  result.id,
      fileUrl:  result.file_url,
      accuracy: result.accuracy,
    }

  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Upload-Timeout. Bitte Internetverbindung prüfen.')
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lädt beide STL-Modelle sequenziell hoch.
 * Gibt detaillierte Statusinformationen für die UI zurück.
 *
 * @param {ScanResults}  scanResults  – Ergebnis beider Scans aus useFootScan
 * @param {Function}     onProgress   – ({ side, pct, status }) => void
 * @returns {Promise<{ LEFT: UploadResult, RIGHT: UploadResult }>}
 */
export async function uploadBothSTLModels(scanResults, onProgress) {
  const results = {}

  for (const side of ['LEFT', 'RIGHT']) {
    const scan = scanResults[side]
    if (!scan?.stlPath) {
      throw new Error(`STL-Datei für ${side} nicht gefunden. Bitte Scan wiederholen.`)
    }

    onProgress?.({ side, pct: 0, status: 'uploading' })

    try {
      results[side] = await uploadSTLModel({
        filePath:     scan.stlPath,
        footSide:     side,
        accuracy:     scan.accuracy,
        measurements: scan.measurements,
        onProgress:   (pct) => onProgress?.({ side, pct, status: 'uploading' }),
      })

      onProgress?.({ side, pct: 100, status: 'done' })
      console.log(`[Account] ${side} STL erfolgreich hochgeladen: ${results[side].modelId}`)

    } catch (error) {
      onProgress?.({ side, pct: 0, status: 'error' })
      console.error(`[Account] Upload ${side} fehlgeschlagen:`, error.message)
      throw new Error(`Upload für ${side === 'LEFT' ? 'linken' : 'rechten'} Fuß fehlgeschlagen: ${error.message}`)
    }
  }

  return results
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ruft alle 3D-Fußmodelle des aktuell eingeloggten Nutzers ab.
 *
 * Endpoint: GET /users/me/foot-models
 * Response: Array mit { id, foot_side, file_url, accuracy, measurements, created_at }
 *
 * @returns {Promise<{ LEFT: FootModel|null, RIGHT: FootModel|null }>}
 */
export async function getUserFootModels() {
  const response = await fetch(
    `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.getSTLModels}`,
    { headers: _authHeaders() }
  )

  if (!response.ok) {
    if (response.status === 401) throw new Error('Nicht eingeloggt.')
    throw new Error(`Modelle konnten nicht geladen werden (HTTP ${response.status})`)
  }

  const models = await response.json()

  // Modelle nach Fußseite indexieren
  return {
    LEFT:  models.find(m => m.foot_side === 'LEFT')  ?? null,
    RIGHT: models.find(m => m.foot_side === 'RIGHT') ?? null,
  }
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gibt zurück, ob der Nutzer beide STL-Modelle hat.
 * Wird für den Bestell-Workflow geprüft.
 *
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export async function hasBothFootModels() {
  const models = await getUserFootModels()
  return models.LEFT !== null && models.RIGHT !== null
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Löscht ein STL-Modell aus dem Nutzerkonto (z.B. vor einem Re-Scan).
 *
 * @param {string} modelId
 * @returns {Promise<void>}
 */
export async function deleteFootModel(modelId) {
  const response = await fetch(
    `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.getSTLModels}/${modelId}`,
    { method: 'DELETE', headers: _authHeaders() }
  )

  if (!response.ok) {
    throw new Error(`Löschen fehlgeschlagen (HTTP ${response.status})`)
  }
}
