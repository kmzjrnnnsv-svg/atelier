/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SnugFitBridge.swift  –  iOS Native Module für React Native
 * ─────────────────────────────────────────────────────────────────────────────
 * Verbindet das React Native JavaScript-Layer mit dem nativen SnugFit SDK.
 *
 * Setup:
 *   1. SnugFit.xcframework zum Xcode-Projekt hinzufügen (General → Frameworks)
 *   2. Diese Datei ins ios/-Verzeichnis des RN-Projekts kopieren
 *   3. Kamera-Berechtigungen in Info.plist:
 *      NSCameraUsageDescription = "Wird für den 3D-Fußscan benötigt"
 *
 * Benötigt iOS 14+ (LiDAR), iOS 13+ (ohne LiDAR/ARKit Depth)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import Foundation
import React
import SnugFitSDK          // ← offizielles SnugFit Framework (Pseudocode)
import ARKit
import SceneKit

@objc(SnugFitSDK)
class SnugFitBridge: RCTEventEmitter {

  // ── Interne Zustandsvariablen ──────────────────────────────────────────────
  private var activeSessions:    [String: SFScanSession]    = [:]
  private var arControllers:     [String: SFARViewController] = [:]
  private var positioningTimers: [String: Timer]             = [:]

  // ── RCTEventEmitter Setup ─────────────────────────────────────────────────

  override func supportedEvents() -> [String] {
    return [
      "SnugFitPositionUpdate",    // Echtzeit-Positions-Feedback
      "SnugFitMeshProgress",      // Verarbeitungsfortschritt 0–100%
      "SnugFitScanQuality",       // Scan-Qualitäts-Update
    ]
  }

  override static func requiresMainQueueSetup() -> Bool {
    return true
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MARK: - SDK Initialisierung
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Initialisiert das SnugFit SDK mit API-Key und Konfiguration.
   * Muss einmalig beim App-Start aufgerufen werden.
   *
   * PSEUDOCODE: `SnugFitManager.configure()` ist der echte SDK-Einstiegspunkt.
   * Namen können je nach SDK-Version abweichen.
   */
  @objc func initialize(
    _ config: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject:  @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      do {
        // PSEUDOCODE ─ SnugFit SDK konfigurieren
        let sdkConfig = SFConfiguration(
          apiKey:      config["apiKey"]      as? String ?? "",
          environment: config["environment"] as? String == "sandbox" ? .sandbox : .production,
          resolution:  self.parseResolution(config["resolution"] as? String),
          meshModel:   config["meshModel"]   as? String ?? "foot_v3",
          enableLiDAR: config["enableLiDAR"] as? Bool ?? true,
          enableARKit:  config["enableARMode"] as? Bool ?? true
        )

        // PSEUDOCODE ─ Initialisierung aufrufen
        try SnugFitManager.shared.configure(with: sdkConfig)

        resolve([
          "version":     SnugFitManager.shared.sdkVersion,
          "lidarAvailable": ARWorldTrackingConfiguration.supportsSceneReconstruction(.mesh),
          "status":      "initialized",
        ])
      } catch {
        reject("SF_INIT_ERROR", "SDK-Initialisierung fehlgeschlagen: \(error.localizedDescription)", error)
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MARK: - Session Management
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Erstellt eine neue Scan-Session für einen Fuß.
   */
  @objc func createScanSession(
    _ options: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject:  @escaping RCTPromiseRejectBlock
  ) {
    guard let footSideStr = options["footSide"] as? String,
          let footSide    = SFFootSide(rawValue: footSideStr) else {
      reject("SF_INVALID_PARAMS", "footSide muss 'LEFT' oder 'RIGHT' sein", nil)
      return
    }

    // PSEUDOCODE ─ Session erstellen
    let sessionOptions = SFSessionOptions(
      footSide:        footSide,
      captureTimeout:  options["captureTimeout"] as? TimeInterval ?? 45,
      minQuality:      options["minQuality"] as? Float ?? 92.0,
      mode:            options["mode"] as? String == "freeform" ? .freeform : .guided
    )

    // PSEUDOCODE ─ Session-Objekt vom SDK anfordern
    let session   = SnugFitManager.shared.createSession(with: sessionOptions)
    let sessionId = session.sessionId

    activeSessions[sessionId] = session
    resolve(["sessionId": sessionId])
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MARK: - AR-Kamera-Preview
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Startet die AR-Kamera-Preview und bindet das SnugFit AR-Overlay
   * an den nativen View des React Native-Rendering-Tree.
   */
  @objc func startARPreview(
    _ options: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject:  @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      guard let sessionId = options["sessionId"]  as? String,
            let session   = self.activeSessions[sessionId],
            let viewHandle = options["viewHandle"] as? NSNumber,
            let bridge    = self.bridge,
            let uiManager = bridge.uiManager,
            let view      = uiManager.view(forReactTag: viewHandle) else {
        reject("SF_PREVIEW_ERROR", "Session oder View nicht gefunden", nil)
        return
      }

      // PSEUDOCODE ─ AR-View-Controller erstellen und an View binden
      let arConfig = SFARConfig(
        showDepthMap: options["showDepthMap"] as? Bool ?? true,
        showSkeleton: options["showSkeleton"] as? Bool ?? true,
        overlayColor: UIColor.systemGreen
      )

      let arVC = SnugFitManager.shared.createARViewController(
        for:    session,
        config: arConfig
      )

      // AR-View in den React Native View einbetten
      arVC.view.frame = view.bounds
      arVC.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
      view.addSubview(arVC.view)

      // Position-Updates vom AR-Controller abonnieren
      arVC.onPositionUpdate = { [weak self] positionData in
        guard let self = self else { return }
        self.sendEvent(
          withName: "SnugFitPositionUpdate",
          body: [
            "sessionId":  sessionId,
            "status":     positionData.statusString,
            "confidence": positionData.confidence,
            "boundingBox": [
              "x":      positionData.boundingBox.origin.x,
              "y":      positionData.boundingBox.origin.y,
              "width":  positionData.boundingBox.size.width,
              "height": positionData.boundingBox.size.height,
            ]
          ]
        )
      }

      self.arControllers[sessionId] = arVC
      resolve(["status": "ar_preview_started"])
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MARK: - Winkel-Aufnahme
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Nimmt einen Scan-Winkel auf.
   */
  @objc func captureAngle(
    _ options: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject:  @escaping RCTPromiseRejectBlock
  ) {
    guard let sessionId = options["sessionId"] as? String,
          let session   = activeSessions[sessionId],
          let angleId   = options["angleId"] as? String else {
      reject("SF_CAPTURE_ERROR", "Ungültige Parameter", nil)
      return
    }

    // PSEUDOCODE ─ Winkel-Aufnahme
    let captureOptions = SFCaptureOptions(
      angleId:         angleId,
      frameCount:      options["frameCount"] as? Int ?? 5,
      depthResolution: .full
    )

    session.captureAngle(captureOptions) { result in
      switch result {
      case .success(let captureResult):
        resolve([
          "success":  true,
          "quality":  captureResult.quality,
          "message":  "Aufnahme erfolgreich",
          "previewImageBase64": captureResult.previewImageBase64 ?? NSNull(),
        ])

      case .failure(let error):
        resolve([
          "success":  false,
          "quality":  error.quality ?? 0,
          "message":  error.localizedDescription,
        ])
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MARK: - Mesh-Verarbeitung
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Verarbeitet alle aufgenommenen Winkel zu einem 3D-Mesh.
   */
  @objc func processMesh(
    _ options: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject:  @escaping RCTPromiseRejectBlock
  ) {
    guard let sessionId = options["sessionId"] as? String,
          let session   = activeSessions[sessionId] else {
      reject("SF_MESH_ERROR", "Session nicht gefunden", nil)
      return
    }

    let meshOptions = SFMeshOptions(
      targetTriangles:  options["targetTriangles"] as? Int ?? 50_000,
      smoothing:        options["smoothing"]       as? Float ?? 0.3,
      fillHoles:        options["fillHoles"]       as? Bool  ?? true,
      coordinateSystem: .footStandard
    )

    // Progress-Events feuern
    session.processMesh(options: meshOptions, progress: { [weak self] percentage in
      guard let self = self else { return }
      self.sendEvent(
        withName: "SnugFitMeshProgress",
        body: ["sessionId": sessionId, "percentage": percentage]
      )
    }, completion: { result in
      switch result {
      case .success(let meshResult):
        resolve([
          "accuracy": meshResult.accuracy,
          "meshId":   meshResult.meshId,
          "measurements": [
            "length":       meshResult.measurements.length,
            "width":        meshResult.measurements.width,
            "heelWidth":    meshResult.measurements.heelWidth,
            "instepHeight": meshResult.measurements.instepHeight,
            "archHeight":   meshResult.measurements.archHeight,
            "ballGirth":    meshResult.measurements.ballGirth,
          ],
        ])

      case .failure(let error):
        reject("SF_MESH_ERROR", "Mesh-Verarbeitung fehlgeschlagen: \(error.localizedDescription)", error)
      }
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MARK: - STL-Export
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Exportiert das Mesh als STL-Datei.
   */
  @objc func exportSTL(
    _ options: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject:  @escaping RCTPromiseRejectBlock
  ) {
    guard let sessionId  = options["sessionId"]  as? String,
          let session    = activeSessions[sessionId],
          let outputPath = options["outputPath"] as? String else {
      reject("SF_EXPORT_ERROR", "Ungültige Export-Parameter", nil)
      return
    }

    let exportOptions = SFSTLExportOptions(
      outputPath:  outputPath,
      format:      options["format"] as? String == "ascii" ? .ascii : .binary,
      unit:        .millimeters,
      scale:       options["scale"] as? Double ?? 1.0,
      metadata:    options["metadata"] as? [String: String] ?? [:]
    )

    session.exportSTL(options: exportOptions) { result in
      switch result {
      case .success(let stlResult):
        resolve([
          "path":          stlResult.path,
          "fileSize":      stlResult.fileSize,
          "triangleCount": stlResult.triangleCount,
          "isWatertight":  stlResult.isWatertight,
          "checksum":      stlResult.sha256Checksum,
        ])

      case .failure(let error):
        reject("SF_EXPORT_ERROR", "STL-Export fehlgeschlagen: \(error.localizedDescription)", error)
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MARK: - Session beenden
  // ─────────────────────────────────────────────────────────────────────────

  @objc func endSession(
    _ sessionId: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject:  @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      if let session = self.activeSessions[sessionId] {
        session.cancel()
        self.activeSessions.removeValue(forKey: sessionId)
      }
      if let arVC = self.arControllers[sessionId] {
        arVC.view.removeFromSuperview()
        self.arControllers.removeValue(forKey: sessionId)
      }
      resolve(["status": "ended"])
    }
  }

  @objc func getVersion() -> String {
    // PSEUDOCODE ─ SDK-Version
    return SnugFitManager.shared.sdkVersion
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MARK: - Hilfsfunktionen
  // ─────────────────────────────────────────────────────────────────────────

  private func parseResolution(_ value: String?) -> SFScanResolution {
    switch value {
    case "ultra":    return .ultra
    case "standard": return .standard
    default:         return .high
    }
  }
}
