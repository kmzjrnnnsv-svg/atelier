import ARKit
import Capacitor
import UIKit

// ─────────────────────────────────────────────────────────────────────────────
// LidarScanPlugin
//
// Exposes three scanning modes to JavaScript via Capacitor:
//
//  Mode 1 – captureFootScan
//      Single-pass LiDAR depth scan (≈3 s).  Captures several depth frames,
//      filters pixels by confidence and depth range (15–80 cm),
//      then returns a flat point cloud in camera-relative world space.
//
//  Mode 2 – Walk-Around (startWalkAround / getWalkAroundProgress / finishWalkAround)
//      ARKit scene-reconstruction pass.  The user moves the phone around the
//      object while ARKit continuously builds mesh anchors.  JS polls progress
//      via getWalkAroundProgress, then calls finishWalkAround to collect all
//      mesh vertices and return a world-space point cloud.
//
//  Mode 3 – Continuous Depth Capture (startContinuousCapture / getContinuousCaptureProgress / finishContinuousCapture)
//      Uses raw LiDAR depth frames (not mesh reconstruction) for reliable capture.
//      Continuously collects depth frames at ~4 fps, projects to world space,
//      and tracks angular coverage.  More robust than mesh reconstruction as it
//      does not depend on surface texture.
// ─────────────────────────────────────────────────────────────────────────────

@objc(LidarScanPlugin)
public class LidarScanPlugin: CAPPlugin, ARSessionDelegate {

    // ── Shared ARKit session ──────────────────────────────────────────────────
    private var arSession: ARSession?

    // ── Mode 1 state ──────────────────────────────────────────────────────────
    /// The pending Capacitor call for captureFootScan
    private var captureCall: CAPPluginCall?
    /// Buffered (depthMap, confidenceMap, camera) tuples from ARKit frames
    private var frameBuffer: [(depth: CVPixelBuffer, confidence: CVPixelBuffer, camera: ARCamera)] = []
    /// Timer that fires after captureDuration to stop collecting frames
    private var captureTimer: Timer?
    /// Maximum number of depth frames to accumulate
    private let maxFrames = 5
    /// How long (seconds) to collect frames before processing
    private let captureDuration: TimeInterval = 3.0

    // ── Mode 2 state ──────────────────────────────────────────────────────────
    /// The pending Capacitor call for finishWalkAround
    private var walkAroundCall: CAPPluginCall?
    /// Live dictionary of mesh anchors keyed by their UUID.
    /// didAdd/didUpdate both write into this dict so each UUID stores the
    /// most-recent geometry for that anchor.
    private var meshAnchors: [UUID: ARMeshAnchor] = [:]
    /// Serialises access to meshAnchors from the ARKit delegate queue
    private let meshLock = NSLock()
    /// True while a walk-around session is active
    private var walkAroundActive = false

    // ── Auto-capture RGB frames for ML training ─────────────────────────────
    /// Stores camera frames captured during walk-around for later view selection.
    private struct CapturedFrame {
        let image: UIImage
        let cameraTransform: simd_float4x4
        let timestamp: TimeInterval
    }
    private var capturedFrames: [CapturedFrame] = []
    private let frameCaptureLock = NSLock()
    /// Max RGB frames to keep in memory during walk-around
    private let maxCapturedFrames = 20
    /// Minimum interval between frame captures (seconds)
    private let frameCaptureInterval: TimeInterval = 1.5
    /// Timestamp of last captured frame
    private var lastFrameCaptureTime: TimeInterval = 0
    /// Track if an ARKit error occurred during session
    private var sessionError: String? = nil

    // ── Mode 3: Continuous Depth Capture ────────────────────────────────────
    /// True while a continuous depth capture session is active
    private var continuousActive = false
    /// Accumulated world-space points from all captured depth frames
    private var continuousPoints: [[String: Double]] = []
    /// Serialises access to continuousPoints
    private let continuousLock = NSLock()
    /// Tracked angle bins (0–11, each covering 30°) for coverage estimation
    private var continuousAngles: Set<Int> = []
    /// Per-bin point counts – bin only counts as "covered" when >= minBinPoints
    private var continuousBinCounts: [Int: Int] = [:]
    /// Minimum points per bin before it's considered covered (for ±1mm accuracy)
    private let minBinPoints: Int = 200
    /// Timestamp of last depth frame capture in continuous mode
    private var lastContinuousDepthTime: TimeInterval = 0
    /// Minimum interval between depth captures in continuous mode (seconds)
    private let continuousDepthInterval: TimeInterval = 0.25  // ~4 fps

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Capability check
    // ─────────────────────────────────────────────────────────────────────────

    @objc func isLidarSupported(_ call: CAPPluginCall) {
        let supported = ARWorldTrackingConfiguration.supportsFrameSemantics(.smoothedSceneDepth)
        call.resolve(["supported": supported])
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Mode 1: captureFootScan
    // ─────────────────────────────────────────────────────────────────────────

    /// Starts a short (≈3 s) LiDAR scan and resolves with a confidence-filtered
    /// point cloud: { pointCloud: [{x,y,z}], frameCount, pointCount }
    @objc func captureFootScan(_ call: CAPPluginCall) {
        guard ARWorldTrackingConfiguration.supportsFrameSemantics(.smoothedSceneDepth) else {
            call.reject("LIDAR_NOT_SUPPORTED", "This device does not have a LiDAR sensor")
            return
        }

        // Reset any leftover walk-around state
        stopWalkAroundSession()

        captureCall  = call
        frameBuffer  = []

        DispatchQueue.main.async { [weak self] in
            self?.startSinglePassSession()
        }
    }

    // Start ARKit configured for single-pass depth capture
    private func startSinglePassSession() {
        let config = ARWorldTrackingConfiguration()
        config.frameSemantics = [.smoothedSceneDepth]

        arSession          = ARSession()
        arSession?.delegate = self
        arSession?.run(config, options: [.resetTracking, .removeExistingAnchors])

        // Stop after captureDuration seconds
        captureTimer = Timer.scheduledTimer(
            withTimeInterval: captureDuration,
            repeats: false
        ) { [weak self] _ in
            self?.finalizeCapture()
        }
    }

    // ARSessionDelegate – fires for every frame (~60 fps)
    public func session(_ session: ARSession, didUpdate frame: ARFrame) {
        // ── Mode 3: Continuous depth capture ─────────────────────────────
        if continuousActive {
            processContinuousDepthFrame(frame)
            captureRGBFrameIfNeeded(frame)
            return
        }

        // ── Walk-around mode: capture RGB frames for ML training ─────────
        if walkAroundActive {
            captureRGBFrameIfNeeded(frame)
            return
        }

        // ── Mode 1: collect depth frames ─────────────────────────────────
        guard frameBuffer.count < maxFrames,
              let sceneDepth = frame.smoothedSceneDepth,
              let confidenceMap = sceneDepth.confidenceMap
        else { return }

        let depthMap = sceneDepth.depthMap

        // Spread samples evenly across the capture window (≈ every 36 frames)
        let interval = max(1, Int(captureDuration * 60.0 / Double(maxFrames)))
        guard Int(frame.timestamp * 60) % interval == 0 else { return }

        frameBuffer.append((depth: depthMap, confidence: confidenceMap, camera: frame.camera))
    }

    /// Process a depth frame during continuous capture: extract points,
    /// transform to world space, and track angular coverage.
    private func processContinuousDepthFrame(_ frame: ARFrame) {
        let now = frame.timestamp
        guard now - lastContinuousDepthTime >= continuousDepthInterval else { return }

        guard let sceneDepth = frame.smoothedSceneDepth,
              let confidenceMap = sceneDepth.confidenceMap
        else { return }

        lastContinuousDepthTime = now

        let pts = extractPointsFromDepthFrame(
            depthMap:      sceneDepth.depthMap,
            confidenceMap: confidenceMap,
            camera:        frame.camera
        )

        // Transform camera-relative points into world space
        let transform = frame.camera.transform
        var worldPts: [[String: Double]] = []
        worldPts.reserveCapacity(pts.count)
        for p in pts {
            let world = transform * SIMD4<Float>(p.x, p.y, p.z, 1)
            worldPts.append([
                "x": Double(world.x),
                "y": Double(world.y),
                "z": Double(world.z)
            ])
        }

        // Calculate camera azimuth (0–360°) and bin into 30° sectors
        let forward = -transform.columns.2  // camera forward = -Z column
        let azimuthDeg = atan2(forward.x, forward.z) * 180.0 / .pi  // −180..180
        let bin = Int((azimuthDeg + 180.0) / 30.0) % 12  // 0..11

        continuousLock.lock()
        continuousPoints.append(contentsOf: worldPts)
        // Track per-bin point density; only mark as covered when >= minBinPoints
        let newCount = (continuousBinCounts[bin] ?? 0) + worldPts.count
        continuousBinCounts[bin] = newCount
        if newCount >= minBinPoints {
            continuousAngles.insert(bin)
        }
        continuousLock.unlock()
    }

    /// Capture an RGB frame every ~1.5 seconds during walk-around for ML training.
    private func captureRGBFrameIfNeeded(_ frame: ARFrame) {
        let now = frame.timestamp
        guard now - lastFrameCaptureTime >= frameCaptureInterval else { return }

        frameCaptureLock.lock()
        let count = capturedFrames.count
        frameCaptureLock.unlock()
        guard count < maxCapturedFrames else { return }

        // Convert CVPixelBuffer → UIImage on background queue to avoid blocking ARKit
        let pixelBuffer = frame.capturedImage
        let transform = frame.camera.transform
        let ts = frame.timestamp

        DispatchQueue.global(qos: .utility).async { [weak self] in
            guard let self = self else { return }
            let ciImage = CIImage(cvPixelBuffer: pixelBuffer)
            let context = CIContext(options: [.useSoftwareRenderer: false])
            guard let cgImage = context.createCGImage(ciImage, from: ciImage.extent) else { return }

            // Downscale to max 800px wide to save memory
            let original = UIImage(cgImage: cgImage)
            let maxWidth: CGFloat = 800
            let scale = min(1.0, maxWidth / original.size.width)
            let newSize = CGSize(width: original.size.width * scale, height: original.size.height * scale)
            UIGraphicsBeginImageContextWithOptions(newSize, true, 1.0)
            original.draw(in: CGRect(origin: .zero, size: newSize))
            guard let resized = UIGraphicsGetImageFromCurrentImageContext() else {
                UIGraphicsEndImageContext()
                return
            }
            UIGraphicsEndImageContext()

            let captured = CapturedFrame(image: resized, cameraTransform: transform, timestamp: ts)
            self.frameCaptureLock.lock()
            if self.capturedFrames.count < self.maxCapturedFrames {
                self.capturedFrames.append(captured)
            }
            self.frameCaptureLock.unlock()
        }

        lastFrameCaptureTime = now
    }

    // Timer callback: stop session and build point cloud on background queue
    private func finalizeCapture() {
        captureTimer?.invalidate()
        captureTimer = nil
        arSession?.pause()

        guard !frameBuffer.isEmpty else {
            captureCall?.reject("NO_FRAMES", "No depth frames were captured")
            return
        }

        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self = self else { return }
            do {
                let result = try self.buildSinglePassPointCloud()
                self.captureCall?.resolve(result)
            } catch {
                self.captureCall?.reject("PROCESSING_ERROR", error.localizedDescription)
            }
        }
    }

    // Iterate all buffered frames and build the combined world-space point cloud
    private func buildSinglePassPointCloud() throws -> [String: Any] {
        var allPoints: [[String: Double]] = []

        for (depthMap, confidenceMap, camera) in frameBuffer {
            let pts = extractPointsFromDepthFrame(
                depthMap:      depthMap,
                confidenceMap: confidenceMap,
                camera:        camera
            )
            // Transform camera-relative points into world (ARKit) space
            let transform = camera.transform
            for p in pts {
                let world = transform * SIMD4<Float>(p.x, p.y, p.z, 1)
                allPoints.append([
                    "x": Double(world.x),
                    "y": Double(world.y),
                    "z": Double(world.z)
                ])
            }
        }

        guard allPoints.count > 150 else {
            throw NSError(
                domain: "LidarScan",
                code:   1,
                userInfo: [NSLocalizedDescriptionKey:
                    "Zu wenige Punkte erfasst (\(allPoints.count)). " +
                    "Halte das Handy 15–80 cm über den Fuß und bewege es langsam."]
            )
        }

        return [
            "pointCloud": allPoints,
            "frameCount": frameBuffer.count,
            "pointCount": allPoints.count
        ]
    }

    // ── Depth-frame → camera-space 3D points (confidence-filtered) ───────────
    //
    // depthMap:      CVPixelBuffer (kCVPixelFormatType_DepthFloat32)
    // confidenceMap: CVPixelBuffer (kCVPixelFormatType_OneComponent8)
    //   0 = low  /  1 = medium  /  2 = high  ← medium + high accepted
    //
    // Depth valid range: 0.15 m – 0.80 m
    // Stride: every 2nd pixel in both axes (4× decimation, good enough)
    private func extractPointsFromDepthFrame(
        depthMap:      CVPixelBuffer,
        confidenceMap: CVPixelBuffer,
        camera:        ARCamera
    ) -> [SIMD3<Float>] {

        // Lock both buffers for reading
        CVPixelBufferLockBaseAddress(depthMap,      .readOnly)
        CVPixelBufferLockBaseAddress(confidenceMap, .readOnly)
        defer {
            CVPixelBufferUnlockBaseAddress(depthMap,      .readOnly)
            CVPixelBufferUnlockBaseAddress(confidenceMap, .readOnly)
        }

        let dWidth  = CVPixelBufferGetWidth(depthMap)
        let dHeight = CVPixelBufferGetHeight(depthMap)
        let depthPtr = CVPixelBufferGetBaseAddress(depthMap)!
                           .assumingMemoryBound(to: Float32.self)

        let cWidth  = CVPixelBufferGetWidth(confidenceMap)
        let cHeight = CVPixelBufferGetHeight(confidenceMap)
        let confPtr  = CVPixelBufferGetBaseAddress(confidenceMap)!
                           .assumingMemoryBound(to: UInt8.self)

        // Scale factor: map depth pixel (u,v) → confidence pixel coordinates
        // (depth and confidence buffers are typically the same size on iPhone,
        //  but we handle the general case for safety)
        let scaleX = Float(cWidth)  / Float(dWidth)
        let scaleY = Float(cHeight) / Float(dHeight)

        // Camera intrinsics scaled to depth-buffer resolution
        let imageRes = camera.imageResolution
        let scaleH   = Float(dHeight) / Float(imageRes.height)
        let intr     = camera.intrinsics
        let fx = intr[0][0] * scaleH
        let fy = intr[1][1] * scaleH
        let cx = intr[2][0] * scaleH
        let cy = intr[2][1] * scaleH

        var points: [SIMD3<Float>] = []
        points.reserveCapacity(dWidth * dHeight / 4)

        let stride = 2  // sample every 2nd pixel

        for v in Swift.stride(from: 0, to: dHeight, by: stride) {
            for u in Swift.stride(from: 0, to: dWidth, by: stride) {

                // ── Confidence gate ────────────────────────────────────────
                let cu = Int(Float(u) * scaleX)
                let cv = Int(Float(v) * scaleY)
                // Clamp to confidence-buffer bounds
                let cuClamped = min(max(cu, 0), cWidth  - 1)
                let cvClamped = min(max(cv, 0), cHeight - 1)
                let confidence = confPtr[cvClamped * cWidth + cuClamped]
                guard confidence >= 1 else { continue }   // medium + high confidence

                // ── Depth gate ─────────────────────────────────────────────
                let depth = depthPtr[v * dWidth + u]
                guard depth >= 0.15 && depth <= 0.80 else { continue }

                // ── Back-project to 3D camera space ────────────────────────
                let x = (Float(u) - cx) * depth / fx
                let y = (Float(v) - cy) * depth / fy
                let z = -depth   // ARKit camera looks along -Z
                points.append(SIMD3(x, y, z))
            }
        }
        return points
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Mode 2: Walk-Around via ARKit Scene Reconstruction
    // ─────────────────────────────────────────────────────────────────────────

    /// Starts a mesh-reconstruction ARKit session.
    /// Returns immediately with { started: true }.
    @objc func startWalkAround(_ call: CAPPluginCall) {
        guard ARWorldTrackingConfiguration.supportsSceneReconstruction(.mesh) else {
            call.reject("SCENE_RECONSTRUCTION_NOT_SUPPORTED",
                        "Dieses Gerät unterstützt keine ARKit-Szenenrekonstruktion")
            return
        }

        // Tear down any prior session cleanly
        stopWalkAroundSession()

        meshLock.lock()
        meshAnchors = [:]
        meshLock.unlock()

        // Reset frame capture state
        frameCaptureLock.lock()
        capturedFrames = []
        frameCaptureLock.unlock()
        lastFrameCaptureTime = 0
        sessionError = nil

        walkAroundCall   = nil
        walkAroundActive = true

        DispatchQueue.main.async { [weak self] in
            self?.startMeshReconstructionSession()
        }

        call.resolve(["started": true])
    }

    // Configure and run the mesh-reconstruction session
    private func startMeshReconstructionSession() {
        let config = ARWorldTrackingConfiguration()
        config.sceneReconstruction = .mesh
        // Also enable smoothed depth for potential future hybrid use
        if ARWorldTrackingConfiguration.supportsFrameSemantics(.smoothedSceneDepth) {
            config.frameSemantics = [.smoothedSceneDepth]
        }

        arSession           = ARSession()
        arSession?.delegate = self
        arSession?.run(config, options: [.resetTracking, .removeExistingAnchors])
    }

    /// Returns live progress: { pointCount: Int, meshAnchorCount: Int }
    @objc func getWalkAroundProgress(_ call: CAPPluginCall) {
        guard walkAroundActive else {
            call.reject("NOT_ACTIVE", "No walk-around session is running")
            return
        }

        meshLock.lock()
        let anchorCount = meshAnchors.count
        var totalVertices = 0
        for anchor in meshAnchors.values {
            totalVertices += anchor.geometry.vertices.count
        }
        meshLock.unlock()

        call.resolve([
            "pointCount":      totalVertices,
            "meshAnchorCount": anchorCount
        ])
    }

    /// Stops the session, extracts all mesh vertices in world space, and
    /// resolves with { pointCloud, pointCount, meshAnchorCount, capturedImages }.
    @objc func finishWalkAround(_ call: CAPPluginCall) {
        guard walkAroundActive else {
            call.reject("NOT_ACTIVE", "Keine aktive Walk-Around-Session")
            return
        }

        walkAroundActive = false
        arSession?.pause()

        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self = self else { return }

            self.meshLock.lock()
            let snapshot = self.meshAnchors
            self.meshLock.unlock()

            let anchorCount = snapshot.count
            var pointCloud: [[String: Double]] = []

            for anchor in snapshot.values {
                let pts = self.extractVertices(from: anchor)
                pointCloud.append(contentsOf: pts)
            }

            // Select best top-down and side-view frames for ML training
            let bestImages = self.selectBestFrames()

            var result: [String: Any] = [
                "pointCloud":      pointCloud,
                "pointCount":      pointCloud.count,
                "meshAnchorCount": anchorCount,
                "capturedImages":  bestImages
            ]

            if let error = self.sessionError {
                result["sessionWarning"] = error
            }

            // Clean up captured frames to free memory
            self.frameCaptureLock.lock()
            self.capturedFrames = []
            self.frameCaptureLock.unlock()
            self.sessionError = nil

            call.resolve(result)
        }
    }

    /// Select the best top-down and side-view frames from captured RGB data.
    ///
    /// Uses the camera transform to classify viewing angle:
    ///   - Top-down: camera forward vector (−Z column) has Y < −0.7 (looking down)
    ///   - Side view: camera forward Y component near 0 (|Y| < 0.3, looking horizontal)
    ///
    /// Returns dict with "top" and/or "side" keys → base64 JPEG strings.
    private func selectBestFrames() -> [String: String] {
        frameCaptureLock.lock()
        let frames = capturedFrames
        frameCaptureLock.unlock()

        var bestTop: (frame: CapturedFrame, score: Float)? = nil
        var bestSide: (frame: CapturedFrame, score: Float)? = nil

        for frame in frames {
            let t = frame.cameraTransform
            // Forward vector = negative Z-axis of the camera transform
            let forwardY = -t.columns.2.y

            // Top-down: forwardY strongly negative (camera pointing down)
            // Score: how close to perfectly down (-1.0)
            if forwardY < -0.6 {
                let score = -forwardY  // closer to 1.0 = more directly downward
                if bestTop == nil || score > bestTop!.score {
                    bestTop = (frame, score)
                }
            }

            // Side view: forwardY near 0 (camera pointing horizontally)
            // Score: how close to perfectly horizontal (0.0)
            if abs(forwardY) < 0.35 {
                let score = 1.0 - abs(forwardY)  // closer to 1.0 = more horizontal
                if bestSide == nil || score > bestSide!.score {
                    bestSide = (frame, score)
                }
            }
        }

        var images: [String: String] = [:]

        if let top = bestTop {
            if let jpeg = top.frame.image.jpegData(compressionQuality: 0.75) {
                images["top"] = "data:image/jpeg;base64," + jpeg.base64EncodedString()
            }
        }
        if let side = bestSide {
            if let jpeg = side.frame.image.jpegData(compressionQuality: 0.75) {
                images["side"] = "data:image/jpeg;base64," + jpeg.base64EncodedString()
            }
        }

        return images
    }

    // ── ARMeshGeometry vertex extraction ─────────────────────────────────────
    //
    // Reads raw (Float, Float, Float) tuples directly from the Metal buffer
    // using stride-based pointer arithmetic, then transforms each vertex into
    // ARKit world space using the anchor's 4×4 transform matrix.
    private func extractVertices(from meshAnchor: ARMeshAnchor) -> [[String: Double]] {
        let geometry   = meshAnchor.geometry
        let vertexBuffer = geometry.vertices
        let stride     = vertexBuffer.stride          // bytes between vertices
        let count      = vertexBuffer.count           // total vertex count
        let rawPtr     = vertexBuffer.buffer.contents()

        var result: [[String: Double]] = []
        result.reserveCapacity(count)

        for i in 0..<count {
            // Advance by i * stride bytes to reach vertex i
            let ptr = rawPtr.advanced(by: i * stride)
            // Each vertex is stored as three consecutive Float32 values
            let v = ptr.assumingMemoryBound(to: (Float, Float, Float).self).pointee

            // Apply the anchor's transform to convert from anchor-local space
            // to ARKit world space
            let localPos = SIMD4<Float>(v.0, v.1, v.2, 1)
            let worldPos = meshAnchor.transform * localPos

            result.append([
                "x": Double(worldPos.x),
                "y": Double(worldPos.y),
                "z": Double(worldPos.z)
            ])
        }
        return result
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – ARSessionDelegate – mesh anchor updates (Mode 2)
    // ─────────────────────────────────────────────────────────────────────────

    // Called when ARKit adds new anchors (including new mesh anchors)
    public func session(_ session: ARSession, didAdd anchors: [ARAnchor]) {
        guard walkAroundActive else { return }
        let meshUpdates = anchors.compactMap { $0 as? ARMeshAnchor }
        guard !meshUpdates.isEmpty else { return }

        meshLock.lock()
        for anchor in meshUpdates {
            meshAnchors[anchor.identifier] = anchor
        }
        meshLock.unlock()
    }

    // Called when ARKit refines existing anchors (mesh geometry may change)
    public func session(_ session: ARSession, didUpdate anchors: [ARAnchor]) {
        guard walkAroundActive else { return }
        let meshUpdates = anchors.compactMap { $0 as? ARMeshAnchor }
        guard !meshUpdates.isEmpty else { return }

        meshLock.lock()
        for anchor in meshUpdates {
            // Replace stale entry with updated geometry
            meshAnchors[anchor.identifier] = anchor
        }
        meshLock.unlock()
    }

    // Called when ARKit removes anchors
    public func session(_ session: ARSession, didRemove anchors: [ARAnchor]) {
        guard walkAroundActive else { return }
        let meshIds = anchors.compactMap { ($0 as? ARMeshAnchor)?.identifier }
        guard !meshIds.isEmpty else { return }

        meshLock.lock()
        for id in meshIds {
            meshAnchors.removeValue(forKey: id)
        }
        meshLock.unlock()
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – ARSession error handling
    // ─────────────────────────────────────────────────────────────────────────

    public func session(_ session: ARSession, didFailWithError error: Error) {
        let msg = "ARKit-Fehler: \(error.localizedDescription)"
        sessionError = msg

        // If we're in capture mode, reject the call immediately
        if let call = captureCall {
            call.reject("ARKIT_ERROR", msg)
            captureCall = nil
            captureTimer?.invalidate()
            captureTimer = nil
        }
    }

    public func sessionWasInterrupted(_ session: ARSession) {
        sessionError = "AR-Session wurde unterbrochen (z.B. durch eingehenden Anruf)"
    }

    public func sessionInterruptionEnded(_ session: ARSession) {
        sessionError = nil
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Mode 3: Continuous Depth Capture
    // ─────────────────────────────────────────────────────────────────────────

    /// Starts a continuous depth-frame capture session using LiDAR.
    /// Unlike walk-around (Mode 2), this does NOT rely on mesh reconstruction.
    /// Instead it collects raw depth frames and projects them to world space.
    /// Returns immediately with { started: true }.
    @objc func startContinuousCapture(_ call: CAPPluginCall) {
        guard ARWorldTrackingConfiguration.supportsFrameSemantics(.smoothedSceneDepth) else {
            call.reject("LIDAR_NOT_SUPPORTED",
                        "Dieses Gerät unterstützt keinen LiDAR-Sensor")
            return
        }

        // Tear down any prior session
        stopWalkAroundSession()
        stopContinuousSession()

        // Reset state — pre-allocate for ~20k points to avoid resizes under lock
        continuousLock.lock()
        continuousPoints = []
        continuousPoints.reserveCapacity(20_000)
        continuousAngles = []
        continuousBinCounts = [:]
        continuousLock.unlock()

        frameCaptureLock.lock()
        capturedFrames = []
        frameCaptureLock.unlock()
        lastFrameCaptureTime = 0
        lastContinuousDepthTime = 0
        sessionError = nil
        continuousActive = true

        DispatchQueue.main.async { [weak self] in
            let config = ARWorldTrackingConfiguration()
            config.frameSemantics = [.smoothedSceneDepth]
            // Also enable scene reconstruction if supported for bonus mesh data
            if ARWorldTrackingConfiguration.supportsSceneReconstruction(.mesh) {
                config.sceneReconstruction = .mesh
            }

            self?.arSession = ARSession()
            self?.arSession?.delegate = self
            self?.arSession?.run(config, options: [.resetTracking, .removeExistingAnchors])
        }

        call.resolve(["started": true])
    }

    /// Returns live progress for continuous capture:
    /// { pointCount, anglesCovered, totalAngleBins, estimatedCoverage }
    @objc func getContinuousCaptureProgress(_ call: CAPPluginCall) {
        guard continuousActive else {
            call.reject("NOT_ACTIVE", "No continuous capture session running")
            return
        }

        continuousLock.lock()
        let pointCount = continuousPoints.count
        let anglesCovered = continuousAngles.count
        continuousLock.unlock()

        // Coverage = weighted mix: points (40%) + angles (60%)
        let pointScore = min(1.0, Double(pointCount) / 15000.0)
        let angleScore = min(1.0, Double(anglesCovered) / 8.0)
        let coverage = Int(min(100, (pointScore * 40.0 + angleScore * 60.0)))

        var result: [String: Any] = [
            "pointCount":        pointCount,
            "anglesCovered":     anglesCovered,
            "totalAngleBins":    12,
            "estimatedCoverage": coverage
        ]

        if let error = sessionError {
            result["sessionWarning"] = error
        }

        call.resolve(result)
    }

    /// Stops the continuous capture session and returns the accumulated point cloud.
    /// { pointCloud, pointCount, anglesCovered, capturedImages }
    @objc func finishContinuousCapture(_ call: CAPPluginCall) {
        guard continuousActive else {
            call.reject("NOT_ACTIVE", "Keine aktive Continuous-Capture-Session")
            return
        }

        continuousActive = false
        arSession?.pause()

        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self = self else { return }

            self.continuousLock.lock()
            let points = self.continuousPoints
            let angles = self.continuousAngles
            self.continuousLock.unlock()

            let bestImages = self.selectBestFrames()

            var result: [String: Any] = [
                "pointCloud":    points,
                "pointCount":    points.count,
                "anglesCovered": angles.count,
                "capturedImages": bestImages
            ]

            if let error = self.sessionError {
                result["sessionWarning"] = error
            }

            // Cleanup
            self.continuousLock.lock()
            self.continuousPoints = []
            self.continuousAngles = []
            self.continuousBinCounts = [:]
            self.continuousLock.unlock()
            self.frameCaptureLock.lock()
            self.capturedFrames = []
            self.frameCaptureLock.unlock()
            self.sessionError = nil

            call.resolve(result)
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Helpers
    // ─────────────────────────────────────────────────────────────────────────

    /// Cleanly tears down any active continuous capture session.
    private func stopContinuousSession() {
        if continuousActive {
            continuousActive = false
            arSession?.pause()
            arSession = nil
        }
        continuousLock.lock()
        continuousPoints = []
        continuousAngles = []
        continuousBinCounts = [:]
        continuousLock.unlock()
    }

    /// Cleanly tears down any active walk-around session and resets state.
    private func stopWalkAroundSession() {
        if walkAroundActive {
            walkAroundActive = false
            arSession?.pause()
            arSession = nil
        }
        meshLock.lock()
        meshAnchors = [:]
        meshLock.unlock()
        frameCaptureLock.lock()
        capturedFrames = []
        frameCaptureLock.unlock()
    }
}
