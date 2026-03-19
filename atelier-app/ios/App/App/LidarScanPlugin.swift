import ARKit
import Capacitor
import UIKit

// ─────────────────────────────────────────────────────────────────────────────
// LidarScanPlugin
//
// Exposes two scanning modes to JavaScript via Capacitor:
//
//  Mode 1 – captureFootScan
//      Single-pass LiDAR depth scan (≈3 s).  Captures several depth frames,
//      filters pixels by confidence (high only) and depth range (15–80 cm),
//      then returns a flat point cloud in camera-relative world space.
//
//  Mode 2 – Walk-Around (startWalkAround / getWalkAroundProgress / finishWalkAround)
//      ARKit scene-reconstruction pass.  The user moves the phone around the
//      object while ARKit continuously builds mesh anchors.  JS polls progress
//      via getWalkAroundProgress, then calls finishWalkAround to collect all
//      mesh vertices and return a world-space point cloud.
// ─────────────────────────────────────────────────────────────────────────────

@objc(LidarScanPlugin)
public class LidarScanPlugin: CAPPlugin, CAPBridgedPlugin, ARSessionDelegate {

    // ── Capacitor 8: define plugin methods in Swift (replaces .m bridge) ─────
    public let identifier = "LidarScanPlugin"
    public let jsName = "LidarScan"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isLidarSupported",      returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "captureFootScan",        returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startWalkAround",        returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getWalkAroundProgress",  returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finishWalkAround",       returnType: CAPPluginReturnPromise),
    ]

    // ── Shared ARKit session ──────────────────────────────────────────────────
    private var arSession: ARSession?

    // Called by Capacitor after plugin is registered with the bridge
    override public func load() {
        print("[LiDAR] ✅ Plugin.load() called – plugin is live on bridge")
        print("[LiDAR]    pluginId = \(pluginId ?? "nil")")
        print("[LiDAR]    bridge = \(bridge != nil ? "connected" : "nil")")
        print("[LiDAR]    webView = \(webView != nil ? "connected" : "nil")")
    }

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

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Capability check
    // ─────────────────────────────────────────────────────────────────────────

    @objc func isLidarSupported(_ call: CAPPluginCall) {
        print("[LiDAR] isLidarSupported called")
        let supported = ARWorldTrackingConfiguration.supportsFrameSemantics(.smoothedSceneDepth)
        print("[LiDAR] ARKit smoothedSceneDepth supported: \(supported)")
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
        // Only collect frames for Mode 1 while the capture window is open
        guard walkAroundActive == false,
              frameBuffer.count < maxFrames,
              let sceneDepth = frame.smoothedSceneDepth,
              let confidenceMap = sceneDepth.confidenceMap
        else { return }

        let depthMap = sceneDepth.depthMap

        // Spread samples evenly across the capture window (≈ every 36 frames)
        let interval = max(1, Int(captureDuration * 60.0 / Double(maxFrames)))
        guard Int(frame.timestamp * 60) % interval == 0 else { return }

        frameBuffer.append((depth: depthMap, confidence: confidenceMap, camera: frame.camera))
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

        guard allPoints.count > 200 else {
            throw NSError(
                domain: "LidarScan",
                code:   1,
                userInfo: [NSLocalizedDescriptionKey:
                    "Insufficient point cloud density (\(allPoints.count) pts). " +
                    "Hold the phone 15–80 cm above the foot."]
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
    //   0 = low  /  1 = medium  /  2 = high  ← only 2 is accepted
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
                guard confidence == 2 else { continue }   // high confidence only

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
                        "This device does not support ARKit scene reconstruction")
            return
        }

        // Tear down any prior session cleanly
        stopWalkAroundSession()

        meshLock.lock()
        meshAnchors = [:]
        meshLock.unlock()

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

    /// Returns live progress including spatial zone coverage.
    ///
    /// Zones divide the horizontal plane around the centroid into 6 sectors:
    ///   0 = top (directly above), 1 = front (toes), 2 = inner,
    ///   3 = back (heel), 4 = outer, 5 = bottom
    ///
    /// Returns: { pointCount, meshAnchorCount, zones: [Bool], boundingBox: {minX,maxX,minY,maxY,minZ,maxZ} }
    @objc func getWalkAroundProgress(_ call: CAPPluginCall) {
        guard walkAroundActive else {
            call.reject("NOT_ACTIVE", "No walk-around session is running")
            return
        }

        meshLock.lock()
        let anchorCount = meshAnchors.count
        var totalVertices = 0
        // Sample vertices to compute spatial coverage (every Nth vertex for speed)
        var sampledPoints: [SIMD3<Float>] = []
        sampledPoints.reserveCapacity(2000)

        for anchor in meshAnchors.values {
            let geo = anchor.geometry
            let count = geo.vertices.count
            totalVertices += count
            let stride = geo.vertices.stride
            let rawPtr = geo.vertices.buffer.contents()
            // Sample up to ~300 vertices per anchor
            let step = max(1, count / 300)
            for i in Swift.stride(from: 0, to: count, by: step) {
                let ptr = rawPtr.advanced(by: i * stride)
                let v = ptr.assumingMemoryBound(to: (Float, Float, Float).self).pointee
                let local = SIMD4<Float>(v.0, v.1, v.2, 1)
                let world = anchor.transform * local
                sampledPoints.append(SIMD3<Float>(world.x, world.y, world.z))
            }
        }
        meshLock.unlock()

        // Compute bounding box and zone coverage
        var zones = [false, false, false, false, false, false] // top, front, inner, back, outer, bottom
        var bbox: [String: Double] = ["minX": 0, "maxX": 0, "minY": 0, "maxY": 0, "minZ": 0, "maxZ": 0]

        if sampledPoints.count > 10 {
            // Bounding box
            var minP = sampledPoints[0]
            var maxP = sampledPoints[0]
            var centroid = SIMD3<Float>(0, 0, 0)
            for p in sampledPoints {
                minP = min(minP, p)
                maxP = max(maxP, p)
                centroid += p
            }
            centroid /= Float(sampledPoints.count)
            bbox = [
                "minX": Double(minP.x), "maxX": Double(maxP.x),
                "minY": Double(minP.y), "maxY": Double(maxP.y),
                "minZ": Double(minP.z), "maxZ": Double(maxP.z)
            ]

            // Zone detection based on vertex distribution relative to centroid
            // ARKit: Y is up, X is right, Z is towards user
            let spreadX = maxP.x - minP.x
            let spreadY = maxP.y - minP.y
            let spreadZ = maxP.z - minP.z
            let threshold = 5 // need at least N sampled points in a zone

            var zoneCounts = [0, 0, 0, 0, 0, 0]
            for p in sampledPoints {
                let dx = p.x - centroid.x
                let dy = p.y - centroid.y
                let dz = p.z - centroid.z

                // Top: points significantly above centroid
                if dy > spreadY * 0.2 { zoneCounts[0] += 1 }
                // Bottom: points significantly below centroid
                if dy < -spreadY * 0.2 { zoneCounts[5] += 1 }
                // Front (positive Z in many setups, but use the longest horizontal axis)
                if dz > spreadZ * 0.2 { zoneCounts[1] += 1 }
                // Back (heel)
                if dz < -spreadZ * 0.2 { zoneCounts[3] += 1 }
                // Inner (negative X for right foot convention)
                if dx < -spreadX * 0.2 { zoneCounts[2] += 1 }
                // Outer (positive X)
                if dx > spreadX * 0.2 { zoneCounts[4] += 1 }
            }

            for i in 0..<6 {
                zones[i] = zoneCounts[i] >= threshold
            }
        }

        call.resolve([
            "pointCount":      totalVertices,
            "meshAnchorCount": anchorCount,
            "zones":           zones,
            "boundingBox":     bbox
        ])
    }

    /// Stops the session, extracts all mesh vertices in world space, and
    /// resolves with { pointCloud: [{x,y,z}], pointCount, meshAnchorCount }.
    @objc func finishWalkAround(_ call: CAPPluginCall) {
        guard walkAroundActive else {
            call.reject("NOT_ACTIVE", "No walk-around session is running")
            return
        }

        walkAroundActive = false
        arSession?.pause()

        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self = self else { return }

            self.meshLock.lock()
            let snapshot = self.meshAnchors  // copy reference; dict values are structs
            self.meshLock.unlock()

            let anchorCount = snapshot.count
            var pointCloud: [[String: Double]] = []

            for anchor in snapshot.values {
                let pts = self.extractVertices(from: anchor)
                pointCloud.append(contentsOf: pts)
            }

            call.resolve([
                "pointCloud":      pointCloud,
                "pointCount":      pointCloud.count,
                "meshAnchorCount": anchorCount
            ])
        }
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
    // MARK: – Helpers
    // ─────────────────────────────────────────────────────────────────────────

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
    }
}
