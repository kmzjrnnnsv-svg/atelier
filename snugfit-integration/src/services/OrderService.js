/**
 * ─────────────────────────────────────────────────────────────────────────────
 * OrderService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Bestell-Workflow für maßgefertigte Schuhe.
 *
 * Ablauf:
 *   1. Prüfen, ob Nutzer*in beide STL-Modelle hat
 *   2. Auftrag mit Schuh-Konfiguration erstellen
 *   3. STL-Modelle (links + rechts) automatisch an Auftrag knüpfen
 *   4. Auftrag ans Produktionssystem übergeben
 *   5. Bestätigung und Tracking-Referenz zurückgeben
 *
 * Produktions-Integration:
 *   Die STL-Dateien werden per webhook an das CAD/CAM-System
 *   des Schuhfertigers (z.B. via SFTP oder S3-Event) weitergeleitet.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { API_CONFIG } from '../constants/scanConfig'
import { getUserFootModels } from './AccountService'

// ── Auth (identisch mit AccountService) ──────────────────────────────────────
let _getToken = null
export function setTokenGetter(getter) { _getToken = getter }

function _authHeaders() {
  const token = _getToken?.()
  if (!token) throw new Error('Nicht eingeloggt.')
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Erstellt einen Bestellauftrag für maßgefertigte Schuhe.
 *
 * Der Service:
 *   1. Prüft, ob beide STL-Modelle vorhanden sind
 *   2. Holt die Modell-IDs aus dem Account
 *   3. Erstellt den Auftrag mit Schuhkonfiguration
 *   4. Knüpft STL-Modelle automatisch an den Auftrag
 *   5. Gibt Auftragsnummer + geschätzte Lieferzeit zurück
 *
 * @param {ShoeOrderConfig} shoeConfig  – Schuh-Konfiguration
 * @returns {Promise<OrderResult>}
 *
 * @example
 * const order = await createShoeOrder({
 *   shoeId:    'heritage_oxford_001',
 *   material:  'full_grain_calfskin',
 *   color:     '#1f2937',
 *   size:      null,   // null = aus STL-Messung berechnen
 *   quantity:  1,
 *   notes:     'Leicht weiteres Kappenfutter',
 * })
 */
export async function createShoeOrder(shoeConfig) {
  // ── Schritt 1: STL-Modelle prüfen ──────────────────────────────────────────
  const footModels = await getUserFootModels()

  if (!footModels.LEFT) {
    throw new Error(
      'Kein STL-Modell für linken Fuß gefunden. Bitte zuerst einen Fußscan durchführen.'
    )
  }
  if (!footModels.RIGHT) {
    throw new Error(
      'Kein STL-Modell für rechten Fuß gefunden. Bitte zuerst einen vollständigen Fußscan durchführen.'
    )
  }

  // ── Schritt 2: Schuhgröße aus Messung berechnen (falls nicht explizit angegeben) ──
  let euSize = shoeConfig.size
  if (!euSize) {
    euSize = _calculateEuSizeFromMeasurements(
      footModels.LEFT.measurements,
      footModels.RIGHT.measurements
    )
    console.log(`[Order] Schuhgröße aus Scan berechnet: EU ${euSize}`)
  }

  // ── Schritt 3: Auftrag erstellen ───────────────────────────────────────────
  const orderPayload = {
    // Schuh-Konfiguration
    shoe: {
      id:       shoeConfig.shoeId,
      material: shoeConfig.material,
      color:    shoeConfig.color,
      size_eu:  euSize,
      quantity: shoeConfig.quantity ?? 1,
      notes:    shoeConfig.notes ?? '',
    },

    // STL-Referenzen → Backend verknüpft diese mit dem Auftrag
    foot_models: {
      left_foot_model_id:  footModels.LEFT.id,
      right_foot_model_id: footModels.RIGHT.id,
    },

    // Fußmaße direkt im Auftrag speichern (Redundanz für Produktionssystem)
    measurements: {
      left:  footModels.LEFT.measurements,
      right: footModels.RIGHT.measurements,
    },

    // Fertigungsanweisungen
    production: {
      // Welches Fußmodell für die Leisten-Erstellung primär genutzt wird
      primary_foot:     _getLargerFoot(footModels),
      // Beide STL-Pfade für das CAD/CAM-System
      stl_urls: {
        left:  footModels.LEFT.file_url,
        right: footModels.RIGHT.file_url,
      },
      // Präzisionsklasse (bestimmt Fertigungsaufwand)
      precision_class:  'bespoke',   // 'standard' | 'premium' | 'bespoke'
      // Maßtoleranz in mm
      fit_tolerance_mm: 0.5,
    },

    // Metadaten
    order_source: 'mobile_app',
    created_at:   new Date().toISOString(),
  }

  // ── Schritt 4: API-Call ────────────────────────────────────────────────────
  const response = await fetch(
    `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.createOrder}`,
    {
      method:  'POST',
      headers: _authHeaders(),
      body:    JSON.stringify(orderPayload),
    }
  )

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.message ?? `Auftrag konnte nicht erstellt werden (HTTP ${response.status})`)
  }

  const order = await response.json()

  // order enthält:
  // {
  //   id:                    'order_abc123',
  //   order_number:          'ATL-2024-00847',
  //   status:                'production_queued',
  //   estimated_delivery:    '2024-03-15',
  //   production_reference:  'PROD-847-L-R',   // CAD/CAM-Referenz
  //   total_price_eur:       1450.00,
  //   created_at:            '2024-01-15T10:30:00Z',
  // }

  console.log(`[Order] Auftrag erstellt: ${order.order_number}`)
  return {
    success:             true,
    orderId:             order.id,
    orderNumber:         order.order_number,
    status:              order.status,
    estimatedDelivery:   order.estimated_delivery,
    productionReference: order.production_reference,
    totalPriceEur:       order.total_price_eur,
    euSize,
    leftModelId:         footModels.LEFT.id,
    rightModelId:        footModels.RIGHT.id,
  }
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gibt den aktuellen Status eines Auftrags zurück.
 *
 * Status-Flow:
 *   pending → production_queued → in_production → quality_check
 *   → shipped → delivered
 *
 * @param {string} orderId
 * @returns {Promise<OrderStatus>}
 */
export async function getOrderStatus(orderId) {
  const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.updateOrder.replace(':orderId', orderId)}`

  const response = await fetch(url, { headers: _authHeaders() })

  if (!response.ok) {
    throw new Error(`Auftrag nicht gefunden (HTTP ${response.status})`)
  }

  return response.json()
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Interne Hilfs-Funktionen ──────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Berechnet die EU-Schuhgröße aus den Fußmaßen beider Füße.
 * Maßgeblich ist der längere/breitere Fuß.
 *
 * Formel (nach DIN EN ISO 19952):
 *   EU-Größe = (Fußlänge_mm × 1.5) / 10 × (2/3)
 *   → Vereinfacht: EU ≈ Fußlänge_mm / 6.67
 *
 * @param {Measurements} leftMeasurements
 * @param {Measurements} rightMeasurements
 * @returns {number}  EU-Größe (gerundet auf 0.5)
 */
function _calculateEuSizeFromMeasurements(leftMeasurements, rightMeasurements) {
  // Maßgeblich: der längere Fuß
  const maxLength = Math.max(
    leftMeasurements?.length_mm  ?? 0,
    rightMeasurements?.length_mm ?? 0
  )

  if (maxLength === 0) return 42 // Fallback

  // EU-Größe = Pariser Stich = Fußlänge × 1.5 cm / 0.667 cm pro Stich
  const euRaw = (maxLength / 10) * 1.5 / 0.667
  // Runde auf nächste 0.5-Größe
  return Math.round(euRaw * 2) / 2
}

/**
 * Bestimmt, welcher Fuß für die Leisten-Erstellung primär verwendet wird.
 * Üblicherweise der längere / volumenstärkere Fuß.
 */
function _getLargerFoot(footModels) {
  const leftLen  = footModels.LEFT.measurements?.length_mm  ?? 0
  const rightLen = footModels.RIGHT.measurements?.length_mm ?? 0
  return leftLen >= rightLen ? 'LEFT' : 'RIGHT'
}
