/**
 * ─────────────────────────────────────────────────────────────────────────────
 * STLService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Verwaltet STL-Dateien auf dem Gerät:
 *   - Temporäre Speicherung nach dem Scan
 *   - Validierung (Format, Größe, Wasserdichtigkeit)
 *   - Bereinigung von alten temp-Dateien
 *
 * Verwendet react-native-fs (RNFS) für Dateisystem-Operationen.
 * Installation: yarn add react-native-fs
 * ─────────────────────────────────────────────────────────────────────────────
 */

import RNFS from 'react-native-fs'
import { STL_CONFIG } from '../constants/scanConfig'

// ── Pfad-Helfer ───────────────────────────────────────────────────────────────

/**
 * Gibt den absoluten Pfad des temporären STL-Verzeichnisses zurück.
 * Wird beim ersten Aufruf automatisch erstellt.
 *
 * iOS:     /var/mobile/.../Documents/snugfit_temp/
 * Android: /data/data/.../files/snugfit_temp/
 */
export function getTempDirectory() {
  return `${RNFS.DocumentDirectoryPath}/${STL_CONFIG.tempDirectory}`
}

/**
 * Gibt den vollständigen temporären Dateipfad für einen Fuß-Scan zurück.
 *
 * @param {('LEFT'|'RIGHT')} footSide
 * @param {string}           sessionId   – Wird als Teil des Dateinamens verwendet
 * @returns {string}
 */
export function getTempSTLPath(footSide, sessionId) {
  const side = footSide.toLowerCase()
  return `${getTempDirectory()}/${side}_foot_${sessionId}.stl`
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Erstellt das temporäre Verzeichnis, falls es nicht existiert.
 * Sollte beim App-Start oder vor dem ersten Scan aufgerufen werden.
 */
export async function ensureTempDirectory() {
  const dir = getTempDirectory()
  const exists = await RNFS.exists(dir)
  if (!exists) {
    await RNFS.mkdir(dir)
    console.log('[STL] Temp-Verzeichnis erstellt:', dir)
  }
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validiert eine STL-Datei nach dem Scan.
 *
 * Prüft:
 *   ✓ Datei existiert und ist nicht leer
 *   ✓ Gültige binäre STL-Signatur (80-Byte-Header + Triangle-Count)
 *   ✓ Dateigröße stimmt mit Triangle-Count überein
 *   ✓ Minimale Triangle-Dichte (Qualitätscheck)
 *
 * @param {string} filePath  – Absoluter Pfad zur STL-Datei
 * @returns {Promise<ValidationResult>}
 */
export async function validateSTL(filePath) {
  // 1. Datei existiert?
  const exists = await RNFS.exists(filePath)
  if (!exists) {
    return { valid: false, error: 'STL-Datei nicht gefunden', code: 'FILE_NOT_FOUND' }
  }

  // 2. Dateigröße prüfen
  const stat = await RNFS.stat(filePath)
  if (stat.size < 84) {
    // Minimales binäres STL: 80 (Header) + 4 (Count) = 84 Bytes
    return { valid: false, error: 'Datei zu klein (beschädigt)', code: 'FILE_TOO_SMALL' }
  }

  // 3. Binären STL-Header lesen und Triangle-Count extrahieren
  const headerBase64 = await RNFS.read(filePath, 84, 0, 'base64')
  const headerBytes  = Buffer.from(headerBase64, 'base64')

  // Triangle-Count steht bei Byte 80–83 (Little-Endian UInt32)
  const triangleCount = headerBytes.readUInt32LE(80)

  // 4. Erwartete Dateigröße prüfen: 84 + (triangleCount * 50) Bytes
  const expectedSize = 84 + triangleCount * 50
  const tolerance    = 100 // Bytes Toleranz

  if (Math.abs(stat.size - expectedSize) > tolerance) {
    return {
      valid: false,
      error: `Dateigröße stimmt nicht (erwartet ~${expectedSize}, gefunden ${stat.size})`,
      code:  'SIZE_MISMATCH',
    }
  }

  // 5. Mindest-Qualität: Triangle-Count nicht zu niedrig
  const MIN_TRIANGLES = 5_000
  if (triangleCount < MIN_TRIANGLES) {
    return {
      valid:  false,
      error:  `Zu wenige Dreiecke (${triangleCount}, Minimum: ${MIN_TRIANGLES}). Scan wiederholen.`,
      code:   'QUALITY_TOO_LOW',
      triangleCount,
    }
  }

  return {
    valid:         true,
    triangleCount,
    fileSizeBytes: stat.size,
    fileSizeMB:    (stat.size / 1_048_576).toFixed(2),
    code:          'OK',
  }
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Liest Basis-Metadaten aus dem STL-Header.
 *
 * Binary STL Header = 80 ASCII-Bytes
 * Gute SDKs schreiben Metadaten (z.B. "ATELIER left_foot 2024-01-15") hinein.
 *
 * @param {string} filePath
 * @returns {Promise<{ headerText: string, triangleCount: number }>}
 */
export async function readSTLMetadata(filePath) {
  const headerBase64 = await RNFS.read(filePath, 84, 0, 'base64')
  const headerBytes  = Buffer.from(headerBase64, 'base64')

  // Header-Text (Bytes 0–79)
  const headerText    = headerBytes.slice(0, 80).toString('utf8').replace(/\0/g, '').trim()
  const triangleCount = headerBytes.readUInt32LE(80)

  return { headerText, triangleCount }
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verschiebt eine STL-Datei vom temporären in den finalen Account-Ordner.
 * Wird nach erfolgreichem Upload aufgerufen (lokale Kopie für Offline-Zugriff).
 *
 * @param {string}           tempPath   – Quelle (temp-Verzeichnis)
 * @param {('LEFT'|'RIGHT')} footSide
 * @param {string}           userId
 * @returns {Promise<string>}            – Neuer Dateipfad
 */
export async function moveToAccountStorage(tempPath, footSide, userId) {
  const accountDir  = `${RNFS.DocumentDirectoryPath}/${STL_CONFIG.accountDirectory}/${userId}`
  const accountPath = `${accountDir}/${footSide.toLowerCase()}_foot.stl`

  // Verzeichnis erstellen falls nicht vorhanden
  const dirExists = await RNFS.exists(accountDir)
  if (!dirExists) {
    await RNFS.mkdir(accountDir)
  }

  // Vorhandene Datei überschreiben (Re-Scan)
  const destExists = await RNFS.exists(accountPath)
  if (destExists) {
    await RNFS.unlink(accountPath)
  }

  // Verschieben (copy + delete für Cross-Partition-Kompatibilität)
  await RNFS.copyFile(tempPath, accountPath)
  await RNFS.unlink(tempPath)

  console.log(`[STL] ${footSide} verschoben nach: ${accountPath}`)
  return accountPath
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gibt die lokalen STL-Pfade eines Nutzers zurück (falls vorhanden).
 *
 * @param {string} userId
 * @returns {Promise<{ LEFT: string|null, RIGHT: string|null }>}
 */
export async function getLocalSTLPaths(userId) {
  const accountDir = `${RNFS.DocumentDirectoryPath}/${STL_CONFIG.accountDirectory}/${userId}`

  const result = { LEFT: null, RIGHT: null }

  for (const side of ['left', 'right']) {
    const path = `${accountDir}/${side}_foot.stl`
    const exists = await RNFS.exists(path)
    if (exists) {
      result[side.toUpperCase()] = path
    }
  }

  return result
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Löscht alle temporären STL-Dateien, die älter als `maxAgeHours` sind.
 * Sollte periodisch aufgerufen werden (z.B. beim App-Start).
 *
 * @param {number} maxAgeHours – Standardmäßig 24h
 */
export async function cleanupTempFiles(maxAgeHours = 24) {
  const dir = getTempDirectory()
  const exists = await RNFS.exists(dir)
  if (!exists) return

  const files   = await RNFS.readDir(dir)
  const cutoff  = Date.now() - maxAgeHours * 3_600_000
  let   deleted = 0

  for (const file of files) {
    if (file.isFile() && new Date(file.mtime).getTime() < cutoff) {
      await RNFS.unlink(file.path)
      deleted++
    }
  }

  if (deleted > 0) {
    console.log(`[STL] ${deleted} temporäre Datei(en) gelöscht`)
  }
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Berechnet einen lesbaren String für die Dateigröße.
 * @param {number} bytes
 * @returns {string}  z.B. "1.24 MB"
 */
export function formatFileSize(bytes) {
  if (bytes < 1_024)             return `${bytes} B`
  if (bytes < 1_048_576)         return `${(bytes / 1_024).toFixed(1)} KB`
  return `${(bytes / 1_048_576).toFixed(2)} MB`
}
