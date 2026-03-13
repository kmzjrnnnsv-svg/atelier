/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ATELIER × SnugFit – Scan Configuration
 * ─────────────────────────────────────────────────────────────────────────────
 * Zentrale Konfigurationsdatei für alle Scan-Parameter, Schwellenwerte und
 * API-Endpunkte. Alle veränderbaren Werte an einem Ort.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── SDK ───────────────────────────────────────────────────────────────────────
export const SNUGFIT_CONFIG = {
  /** Dein SnugFit API-Key (aus dem Developer Dashboard) */
  apiKey: process.env.SNUGFIT_API_KEY ?? '__REPLACE_WITH_API_KEY__',

  /** SDK-Umgebung: 'production' | 'sandbox' */
  environment: __DEV__ ? 'sandbox' : 'production',

  /** Scan-Auflösung: 'standard' | 'high' | 'ultra'
   *  'ultra' benötigt LiDAR (iPhone 12 Pro+) oder ToF-Sensor (Android)  */
  resolution: 'high',

  /** Minimale akzeptierte Scan-Genauigkeit in Prozent (0–100) */
  minAccuracyThreshold: 92.0,

  /** Maximale Wiederholungsversuche, bevor Nutzer*in abgebrochen wird */
  maxRetries: 3,

  /** Timeout für einen einzelnen Scan-Schritt in Sekunden */
  captureTimeoutSec: 45,

  /** SDK-Modell für 3D-Rekonstruktion */
  meshModel: 'foot_v3',          // foot_v2 | foot_v3 (genauer, langsamer)

  /** Millimeter-Toleranz für Messwerte */
  measurementToleranceMm: 0.5,
}

// ── Scan-Schritte ─────────────────────────────────────────────────────────────
/**
 * Definiert die exakten Aufnahme-Winkel, die für jeden Fuß benötigt werden.
 * Die SnugFit SDK benötigt mindestens 3 Perspektiven für ein präzises Modell.
 */
export const SCAN_ANGLES = [
  {
    id: 'top',
    label: 'Draufsicht',
    instruction: 'Halte die Kamera senkrecht über den Fuß',
    icon: '⬆️',
    requiredForSTL: true,
  },
  {
    id: 'inner_side',
    label: 'Innenseite',
    instruction: 'Neige die Kamera 45° zur Innenseite des Fußes',
    icon: '↗️',
    requiredForSTL: true,
  },
  {
    id: 'outer_side',
    label: 'Außenseite',
    instruction: 'Neige die Kamera 45° zur Außenseite des Fußes',
    icon: '↘️',
    requiredForSTL: true,
  },
  {
    id: 'heel',
    label: 'Ferse',
    instruction: 'Fotografiere die Ferse von hinten',
    icon: '⬇️',
    requiredForSTL: false,   // Verbessert Qualität, aber nicht zwingend erforderlich
  },
]

// ── Füße ──────────────────────────────────────────────────────────────────────
export const FOOT_SIDES = {
  LEFT: {
    id: 'LEFT',
    label: 'Linker Fuß',
    shortLabel: 'Links',
    fileName: 'left_foot.stl',
    emoji: '🦶',
    /** Kamera-Spiegel für linken Fuß: AR-Overlay wird gespiegelt */
    mirrorOverlay: false,
  },
  RIGHT: {
    id: 'RIGHT',
    label: 'Rechter Fuß',
    shortLabel: 'Rechts',
    fileName: 'right_foot.stl',
    emoji: '🦶',
    mirrorOverlay: true,
  },
}

// ── STL-Einstellungen ─────────────────────────────────────────────────────────
export const STL_CONFIG = {
  /** Temporärer Speicherpfad auf dem Gerät */
  tempDirectory: 'snugfit_temp',       // Relativ zum Dokument-Verzeichnis

  /** Endgültiger Ordner im Nutzerkonto */
  accountDirectory: 'foot_models',

  /** Ziel-Dreiecksdichte des STL-Mesh */
  targetTriangleCount: 50_000,         // Kompromiss: Genauigkeit vs. Dateigröße

  /** STL-Format: 'binary' (kleiner) | 'ascii' (lesbar) */
  format: 'binary',

  /** Maßeinheit im STL: 'mm' (Standard für Schuhfertigung) */
  unit: 'mm',

  /** Skalierungsfaktor (1.0 = keine Skalierung) */
  scale: 1.0,
}

// ── API-Endpunkte ─────────────────────────────────────────────────────────────
export const API_CONFIG = {
  baseUrl: process.env.API_BASE_URL ?? 'https://api.atelier-shoes.com/v1',
  endpoints: {
    uploadSTL:    '/users/me/foot-models',
    getSTLModels: '/users/me/foot-models',
    createOrder:  '/orders',
    updateOrder:  '/orders/:orderId',
  },
  uploadTimeoutMs: 60_000,
}

// ── Positioning-Feedback ──────────────────────────────────────────────────────
/**
 * Texte und Farben für das Echtzeit-Positionierungs-Feedback der SDK.
 * SnugFit gibt einen `PositionStatus`-Enum zurück, den wir hier mappen.
 */
export const POSITION_FEEDBACK = {
  FOOT_NOT_DETECTED: {
    message: 'Kein Fuß erkannt',
    subtext: 'Platziere deinen Fuß im markierten Bereich',
    color: '#ef4444',    // Rot
    icon: '❌',
  },
  TOO_FAR: {
    message: 'Zu weit entfernt',
    subtext: 'Näher an den Fuß herangehen',
    color: '#f59e0b',    // Amber
    icon: '🔍',
  },
  TOO_CLOSE: {
    message: 'Zu nah',
    subtext: 'Etwas weiter zurückgehen',
    color: '#f59e0b',
    icon: '↩️',
  },
  POOR_LIGHTING: {
    message: 'Zu dunkel',
    subtext: 'Für mehr Licht sorgen',
    color: '#f59e0b',
    icon: '💡',
  },
  MOTION_BLUR: {
    message: 'Kamera bewegt sich',
    subtext: 'Ruhig halten',
    color: '#f59e0b',
    icon: '⏸️',
  },
  FOOT_PARTIALLY_VISIBLE: {
    message: 'Fuß nicht vollständig sichtbar',
    subtext: 'Den gesamten Fuß ins Bild bringen',
    color: '#f59e0b',
    icon: '✂️',
  },
  READY: {
    message: 'Fuß korrekt positioniert',
    subtext: 'Bereit zum Scannen',
    color: '#10b981',    // Grün
    icon: '✅',
  },
  SCANNING: {
    message: 'Scan läuft…',
    subtext: 'Nicht bewegen',
    color: '#3b82f6',    // Blau
    icon: '📡',
  },
  SCAN_COMPLETE: {
    message: 'Scan abgeschlossen!',
    subtext: 'Daten werden verarbeitet',
    color: '#10b981',
    icon: '🎉',
  },
}

// ── Demo-Modus ────────────────────────────────────────────────────────────────
export const DEMO_CONFIG = {
  enabled: __DEV__,
  /** Simulierte Verzögerungen in ms (für realistische UX-Tests) */
  delays: {
    positioning: 2_000,     // Zeit bis Fuß „erkannt" wird
    scanning:    3_000,     // Scan-Dauer
    processing:  4_500,     // Mesh-Verarbeitung
    upload:      2_000,     // Upload-Dauer
  },
  /** Simulierte Genauigkeit für Demo-Scans */
  mockAccuracy: {
    LEFT:  97.4,
    RIGHT: 96.8,
  },
  /** Demo-Messungen in mm */
  mockMeasurements: {
    LEFT:  { length: 265, width: 97,  heelWidth: 68, instepHeight: 72, archHeight: 18 },
    RIGHT: { length: 267, width: 98,  heelWidth: 69, instepHeight: 73, archHeight: 19 },
  },
}
