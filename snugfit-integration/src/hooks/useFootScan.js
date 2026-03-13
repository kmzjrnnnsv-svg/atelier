/**
 * ─────────────────────────────────────────────────────────────────────────────
 * useFootScan.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Zentraler React-Hook für den gesamten Scan-Workflow.
 *
 * Kapselt:
 *   - State-Verwaltung aller Scan-Phasen
 *   - SnugFit SDK-Aufrufe
 *   - Fehlerbehandlung + Wiederholungs-Logik
 *   - Fortschrittsberichte an die UI
 *
 * Verwendung:
 *   const scan = useFootScan()
 *   // In FootScanWizard.jsx
 *
 * State-Flow:
 *   idle → initializing → scanning:LEFT → processing:LEFT
 *        → scanning:RIGHT → processing:RIGHT
 *        → uploading → complete | error
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  initializeSnugFit,
  createScanSession,
  startARPreview,
  subscribeToPositioningFeed,
  captureAngle,
  processMesh,
  generateSTL,
  endScanSession,
} from '../services/SnugFitService'
import {
  ensureTempDirectory,
  getTempSTLPath,
  validateSTL,
  moveToAccountStorage,
  cleanupTempFiles,
} from '../services/STLService'
import { uploadBothSTLModels } from '../services/AccountService'
import {
  SCAN_ANGLES,
  SNUGFIT_CONFIG,
  POSITION_FEEDBACK,
} from '../constants/scanConfig'

// ─────────────────────────────────────────────────────────────────────────────
// Typen-Dokumentation (JSDoc für IDE-Unterstützung)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} ScanPhaseResult
 * @property {string}  stlPath       – Lokaler Pfad zur STL-Datei
 * @property {number}  accuracy      – Scan-Genauigkeit in % (0–100)
 * @property {object}  measurements  – Fußmaße in mm
 * @property {number}  fileSize      – STL-Dateigröße in Bytes
 * @property {number}  triangleCount
 */

/**
 * @typedef {Object} ScanState
 * @property {'idle'|'initializing'|'scanning'|'processing'|'uploading'|'complete'|'error'} phase
 * @property {('LEFT'|'RIGHT'|null)}  currentFoot
 * @property {string|null}            currentAngle
 * @property {string|null}            positionStatus
 * @property {object|null}            positionFeedback
 * @property {number}                 captureProgress    – 0–100
 * @property {number}                 processProgress    – 0–100
 * @property {number}                 uploadProgress     – 0–100
 * @property {object|null}            results            – { LEFT: ScanPhaseResult, RIGHT: ScanPhaseResult }
 * @property {string|null}            error
 * @property {number}                 retryCount
 */

// ─────────────────────────────────────────────────────────────────────────────

const INITIAL_STATE = {
  phase:            'idle',
  currentFoot:      null,
  currentAngle:     null,
  positionStatus:   'FOOT_NOT_DETECTED',
  positionFeedback: POSITION_FEEDBACK.FOOT_NOT_DETECTED,
  captureProgress:  0,
  processProgress:  0,
  uploadProgress:   0,
  completedAngles:  [],    // ['top', 'inner_side', ...]
  results:          {},    // { LEFT: {...}, RIGHT: {...} }
  error:            null,
  retryCount:       0,
}

// ─────────────────────────────────────────────────────────────────────────────

export function useFootScan({ userId, onComplete } = {}) {
  const [state, setState] = useState(INITIAL_STATE)

  // Refs für SDK-Session-IDs und Cleanup-Funktionen
  const sessionIdRef          = useRef(null)
  const positionUnsubscribeRef = useRef(null)
  const isMountedRef          = useRef(true)
  const cameraViewRef         = useRef(null)

  // Cleanup bei Unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      _cleanup()
    }
  }, [])

  // Hilfs-Funktion für sicheres State-Update (verhindert Updates nach Unmount)
  const safeSetState = useCallback((update) => {
    if (isMountedRef.current) {
      setState(prev => typeof update === 'function' ? update(prev) : { ...prev, ...update })
    }
  }, [])

  // ── Hauptfunktionen ──────────────────────────────────────────────────────────

  /**
   * Initialisiert das SDK und bereitet den Scan vor.
   * Muss aufgerufen werden, bevor der Scan-Wizard geöffnet wird.
   */
  const initialize = useCallback(async () => {
    safeSetState({ phase: 'initializing', error: null })

    try {
      // Temp-Verzeichnis vorbereiten
      await ensureTempDirectory()
      await cleanupTempFiles(24)  // Alte temp-Dateien löschen

      // SDK initialisieren
      await initializeSnugFit()

      safeSetState({ phase: 'idle' })
      console.log('[useFootScan] Initialisierung abgeschlossen')

    } catch (error) {
      console.error('[useFootScan] Initialisierung fehlgeschlagen:', error)
      safeSetState({
        phase: 'error',
        error: `SDK konnte nicht gestartet werden: ${error.message}`,
      })
    }
  }, [safeSetState])

  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Startet den Scan für einen Fuß.
   * Öffnet die Kamera und beginnt den AR-Positionierungs-Feed.
   *
   * @param {('LEFT'|'RIGHT')} footSide
   */
  const startFootScan = useCallback(async (footSide) => {
    safeSetState({
      phase:           'scanning',
      currentFoot:     footSide,
      currentAngle:    SCAN_ANGLES[0].id,
      completedAngles: [],
      error:           null,
      retryCount:      0,
    })

    try {
      // Neue SDK-Session erstellen
      sessionIdRef.current = await createScanSession(footSide)

      // AR-Kamera-Preview starten
      await startARPreview(sessionIdRef.current, cameraViewRef)

      // Positions-Feed abonnieren
      positionUnsubscribeRef.current?.()  // Altes Abo beenden
      positionUnsubscribeRef.current = subscribeToPositioningFeed(({ status, feedback }) => {
        safeSetState({ positionStatus: status, positionFeedback: feedback })
      })

    } catch (error) {
      console.error(`[useFootScan] Scan ${footSide} konnte nicht gestartet werden:`, error)
      safeSetState({ phase: 'error', error: error.message })
    }
  }, [safeSetState])

  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Nimmt den aktuellen Winkel auf.
   * Wird aufgerufen wenn der Nutzer den Auslöse-Button drückt.
   *
   * Bei schlechter Qualität: Nutzer*in wird aufgefordert, es erneut zu versuchen.
   * Nach MAX_RETRIES: Fehlermeldung + Session beenden.
   *
   * @param {string} angleId  – ID des aktuellen Winkels
   */
  const captureCurrentAngle = useCallback(async (angleId) => {
    const sessionId = sessionIdRef.current
    if (!sessionId) return

    safeSetState({ positionFeedback: POSITION_FEEDBACK.SCANNING })

    try {
      const result = await captureAngle(sessionId, angleId)

      if (!result.success) {
        // Qualität unzureichend → Retry
        const newRetryCount = (state.retryCount || 0) + 1

        if (newRetryCount >= SNUGFIT_CONFIG.maxRetries) {
          safeSetState({
            phase: 'error',
            error: `Scan-Qualität nach ${newRetryCount} Versuchen unzureichend. ` +
                   `Bitte für bessere Beleuchtung sorgen und erneut versuchen.`,
          })
          return
        }

        safeSetState({
          retryCount:      newRetryCount,
          positionFeedback: {
            ...POSITION_FEEDBACK.FOOT_NOT_DETECTED,
            message: `Bitte erneut versuchen (Versuch ${newRetryCount}/${SNUGFIT_CONFIG.maxRetries})`,
            subtext:  result.message,
          },
        })
        return
      }

      // Winkel erfolgreich aufgenommen
      const requiredAngles    = SCAN_ANGLES.filter(a => a.requiredForSTL).map(a => a.id)
      const updatedCompleted  = [...(state.completedAngles || []), angleId]
      const allRequired       = requiredAngles.every(id => updatedCompleted.includes(id))
      const nextAngle         = SCAN_ANGLES.find(a => !updatedCompleted.includes(a.id))

      safeSetState(prev => ({
        completedAngles:  updatedCompleted,
        retryCount:       0,
        captureProgress:  Math.round((updatedCompleted.length / SCAN_ANGLES.length) * 100),
        currentAngle:     allRequired ? null : (nextAngle?.id ?? null),
        positionFeedback: POSITION_FEEDBACK.SCAN_COMPLETE,
      }))

      console.log(`[useFootScan] Winkel "${angleId}" aufgenommen. Fortschritt: ${updatedCompleted.length}/${SCAN_ANGLES.length}`)

    } catch (error) {
      console.error('[useFootScan] Aufnahme fehlgeschlagen:', error)
      safeSetState({ error: error.message, positionFeedback: POSITION_FEEDBACK.FOOT_NOT_DETECTED })
    }
  }, [state.retryCount, state.completedAngles, safeSetState])

  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Verarbeitet die aufgenommenen Winkel zu einem 3D-Mesh und generiert das STL.
   * Wird nach Abschluss aller Winkel-Aufnahmen aufgerufen.
   *
   * @param {('LEFT'|'RIGHT')} footSide
   */
  const processAndGenerateSTL = useCallback(async (footSide) => {
    const sessionId = sessionIdRef.current
    if (!sessionId) return

    // Positions-Feed abmelden (Kamera nicht mehr nötig)
    positionUnsubscribeRef.current?.()
    positionUnsubscribeRef.current = null

    safeSetState({ phase: 'processing', processProgress: 0 })

    try {
      // ── 1. Mesh aus Kamera-Daten berechnen ─────────────────────────────────
      const meshResult = await processMesh(sessionId, (pct) => {
        safeSetState({ processProgress: Math.min(pct, 80) })  // 0–80%
      })

      console.log(`[useFootScan] ${footSide} Mesh: Genauigkeit ${meshResult.accuracy}%`)
      safeSetState({ processProgress: 85 })

      // ── 2. STL-Datei generieren ─────────────────────────────────────────────
      const tempPath  = getTempSTLPath(footSide, sessionId)
      const stlResult = await generateSTL(sessionId, tempPath)
      safeSetState({ processProgress: 95 })

      // ── 3. STL validieren ───────────────────────────────────────────────────
      const validation = await validateSTL(stlResult.path)
      if (!validation.valid) {
        throw new Error(`STL-Validierung fehlgeschlagen: ${validation.error}`)
      }
      safeSetState({ processProgress: 100 })

      // ── 4. Ergebnis speichern ───────────────────────────────────────────────
      safeSetState(prev => ({
        results: {
          ...prev.results,
          [footSide]: {
            stlPath:       stlResult.path,
            accuracy:      meshResult.accuracy,
            measurements:  meshResult.measurements,
            fileSize:      stlResult.fileSize,
            triangleCount: stlResult.triangleCount,
            isWatertight:  stlResult.isWatertight,
          },
        },
        phase:          footSide === 'RIGHT' ? 'uploading' : 'idle',
        currentFoot:    null,
        processProgress: 100,
      }))

      // Session beenden
      await endScanSession(sessionId)
      sessionIdRef.current = null

      console.log(`[useFootScan] ${footSide} STL fertig: ${stlResult.path}`)
      return meshResult.accuracy

    } catch (error) {
      console.error(`[useFootScan] Verarbeitung ${footSide} fehlgeschlagen:`, error)
      safeSetState({ phase: 'error', error: error.message })
      await endScanSession(sessionId).catch(() => {})
      sessionIdRef.current = null
    }
  }, [safeSetState])

  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Lädt beide STL-Modelle in den Account hoch.
   * Wird nach erfolgreichem Scan beider Füße aufgerufen.
   */
  const uploadToAccount = useCallback(async () => {
    const { results } = state

    if (!results.LEFT || !results.RIGHT) {
      safeSetState({ error: 'Beide Füße müssen gescannt werden vor dem Upload.' })
      return
    }

    safeSetState({ phase: 'uploading', uploadProgress: 0, error: null })

    try {
      const uploadResults = await uploadBothSTLModels(
        results,
        ({ side, pct, status }) => {
          safeSetState(prev => ({
            uploadProgress: side === 'LEFT' ? pct / 2 : 50 + pct / 2,
          }))
        }
      )

      // Lokale Dateien in Account-Storage verschieben (falls userId vorhanden)
      if (userId) {
        for (const side of ['LEFT', 'RIGHT']) {
          if (results[side]?.stlPath) {
            const newPath = await moveToAccountStorage(
              results[side].stlPath,
              side,
              userId
            )
            safeSetState(prev => ({
              results: {
                ...prev.results,
                [side]: { ...prev.results[side], stlPath: newPath },
              },
            }))
          }
        }
      }

      safeSetState({
        phase:          'complete',
        uploadProgress: 100,
        uploadResults,
      })

      onComplete?.({ results, uploadResults })
      console.log('[useFootScan] Upload abgeschlossen')

    } catch (error) {
      console.error('[useFootScan] Upload fehlgeschlagen:', error)
      safeSetState({ phase: 'error', error: error.message })
    }
  }, [state, userId, onComplete, safeSetState])

  // ─────────────────────────────────────────────────────────────────────────

  /** Setzt den State zurück für einen neuen Scan. */
  const reset = useCallback(async () => {
    await _cleanup()
    safeSetState({ ...INITIAL_STATE })
  }, [safeSetState])

  /** Setzt nur den Fehlerstatus zurück (für Retry). */
  const clearError = useCallback(() => {
    safeSetState({ error: null, retryCount: 0 })
  }, [safeSetState])

  // ── Cleanup ────────────────────────────────────────────────────────────────
  async function _cleanup() {
    positionUnsubscribeRef.current?.()
    positionUnsubscribeRef.current = null

    if (sessionIdRef.current) {
      await endScanSession(sessionIdRef.current).catch(() => {})
      sessionIdRef.current = null
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  return {
    // State
    ...state,
    cameraViewRef,

    // Computed
    isLoading:       ['initializing', 'processing', 'uploading'].includes(state.phase),
    isScanning:      state.phase === 'scanning',
    isProcessing:    state.phase === 'processing',
    isComplete:      state.phase === 'complete',
    hasError:        state.phase === 'error',
    hasLeftScan:     !!state.results?.LEFT,
    hasRightScan:    !!state.results?.RIGHT,
    hasBothScans:    !!(state.results?.LEFT && state.results?.RIGHT),
    isPositionReady: state.positionStatus === 'READY',

    // Aktionen
    initialize,
    startFootScan,
    captureCurrentAngle,
    processAndGenerateSTL,
    uploadToAccount,
    reset,
    clearError,
  }
}
