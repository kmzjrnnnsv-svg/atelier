import ARKit
import Capacitor
import SceneKit
import UIKit
import Vision

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
public class LidarScanPlugin: CAPPlugin, CAPBridgedPlugin, ARSessionDelegate {

    // ── Capacitor 8: define plugin methods in Swift (replaces .m bridge) ─────
    public let identifier = "LidarScanPlugin"
    public let jsName = "LidarScan"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isLidarSupported",              returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "captureFootScan",               returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startWalkAround",               returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getWalkAroundProgress",         returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finishWalkAround",              returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startContinuousCapture",        returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getContinuousCaptureProgress",  returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finishContinuousCapture",       returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startCameraPreview",            returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopCameraPreview",             returnType: CAPPluginReturnPromise),
    ]

    // ── Shared ARKit session ──────────────────────────────────────────────────
    private var arSession: ARSession?

    // ── Camera Preview ───────────────────────────────────────────────────────
    /// Native ARSCNView for live camera feed behind the transparent webview
    private var cameraPreviewView: ARSCNView?

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

    // ── Auto-capture RGB frames for ML training ─────────────────────────────
    /// Stores camera frames captured during walk-around for later view selection.
    /// Etappe 8: Extended with intrinsics for photogrammetry/SfM pipeline.
    private struct CapturedFrame {
        let image: UIImage
        let cameraTransform: simd_float4x4
        let cameraIntrinsics: simd_float3x3
        let imageResolution: CGSize
        let timestamp: TimeInterval
    }
    private var capturedFrames: [CapturedFrame] = []
    private let frameCaptureLock = NSLock()
    /// Max RGB frames to keep in memory during walk-around
    private let maxCapturedFrames = 60  // Etappe 3: more frames for future photogrammetry
    /// Minimum interval between frame captures (seconds)
    private let frameCaptureInterval: TimeInterval = 0.5  // Etappe 3: capture 2fps RGB
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
    private let continuousDepthInterval: TimeInterval = 0.125  // Etappe 3: ~8 fps for denser capture

    // ── Environment Quality Monitoring (Etappe 1) ──────────────────────────
    /// Exponential moving average of ambient light intensity (lux)
    private var lightLevelEMA: Double = 1000.0
    /// Current light quality classification
    private var currentLightQuality: String = "good"
    /// Current ARKit tracking state as string
    private var currentTrackingState: String = "normal"
    /// Reason for limited tracking (nil when normal)
    private var currentTrackingReason: String? = nil
    /// Number of depth frames processed in current continuous session
    private var continuousFrameCount: Int = 0

    // ── Floor Detection & Foot Isolation (Etappe 2) ────────────────────────
    /// Detected floor plane equation (a,b,c,d) where ax+by+cz+d=0
    private var floorPlane: SIMD4<Float>? = nil
    /// Whether floor has been successfully detected
    private var floorDetected: Bool = false
    /// Accumulated world-space points for RANSAC floor detection (first ~2s)
    private var floorCandidatePoints: [SIMD3<Float>] = []
    /// Timestamp when continuous capture started (for floor detection window)
    private var continuousStartTime: TimeInterval = 0
    /// How long to collect points before running RANSAC (seconds)
    private let floorDetectionWindow: TimeInterval = 2.0
    /// Count of points classified as foot (above floor, below 200mm)
    private var footPointCount: Int = 0

    // ── ArUco Calibration (Etappe 7) ──────────────────────────────────────
    /// Scale correction factor derived from ArUco marker detection
    /// 1.0 = no correction, <1.0 = LiDAR overestimates, >1.0 = underestimates
    private var calibrationScaleFactor: Float = 1.0
    /// Whether calibration has been performed
    private var calibrationDone: Bool = false
    /// Residual error from calibration (mm)
    private var calibrationResidualMM: Float = 0.0
    /// Number of frames where ArUco was detected
    private var arucoDetectionCount: Int = 0
    /// Accumulated scale factors for averaging
    private var arucoScaleFactors: [Float] = []
    /// Known credit card dimensions for calibration (mm)
    private let calibrationCardWidthMM: Float = 85.6   // ISO/IEC 7810 ID-1
    private let calibrationCardHeightMM: Float = 53.98
    /// Minimum ArUco detections before accepting calibration
    private let minArucoDetections: Int = 5
    /// Interval between ArUco detection attempts (seconds)
    private let arucoDetectionInterval: TimeInterval = 0.5
    /// Last ArUco detection attempt timestamp
    private var lastArucoDetectionTime: TimeInterval = 0

    // ── Vision Framework Foot Segmentation (Etappe 15) ──────────────────
    /// Whether a foot/ankle has been detected via Vision body pose
    private var footSegmented: Bool = false
    /// Detected ankle positions in world space (left/right)
    private var detectedAnkleLeft: SIMD3<Float>? = nil
    private var detectedAnkleRight: SIMD3<Float>? = nil
    /// Timestamp of last body pose detection attempt
    private var lastBodyPoseTime: TimeInterval = 0
    /// Interval between body pose detection attempts (seconds)
    private let bodyPoseInterval: TimeInterval = 1.0

    // ── Camera Height Tracking ───────────────────────────────────────────
    /// Camera height above detected floor in millimetres (updated every frame)
    private var cameraHeightAboveFloorMM: Float = 0

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
        // ── Environment quality monitoring (runs for all active modes) ───
        if continuousActive || walkAroundActive {
            updateEnvironmentQuality(frame)
        }

        // ── Mode 3: Continuous depth capture ─────────────────────────────
        if continuousActive {
            processContinuousDepthFrame(frame)
            // Track camera height above floor for distance feedback
            if floorDetected, let plane = floorPlane {
                let camPos = frame.camera.transform.columns.3
                let dist = camPos.x * plane.x + camPos.y * plane.y + camPos.z * plane.z + plane.w
                cameraHeightAboveFloorMM = abs(dist) * 1000.0
            }
            captureRGBFrameIfNeeded(frame)
            // Etappe 7: Attempt ArUco/rectangle calibration during scan
            if !calibrationDone {
                attemptCalibrationDetection(frame)
            }
            // Etappe 15: Vision body pose for ankle/foot segmentation
            if !footSegmented {
                attemptBodyPoseDetection(frame)
            }
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

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Environment Quality Monitoring (Etappe 1)
    // ─────────────────────────────────────────────────────────────────────────

    /// Reads light estimate and tracking state from the current ARFrame.
    /// Updates EMA light level and classifies quality for JS consumption.
    private func updateEnvironmentQuality(_ frame: ARFrame) {
        // ── Light level (EMA, alpha=0.1 for smooth updates) ──────────────
        if let lightEstimate = frame.lightEstimate {
            let intensity = lightEstimate.ambientIntensity  // lux
            let alpha = 0.1
            lightLevelEMA = alpha * Double(intensity) + (1.0 - alpha) * lightLevelEMA
        }

        // Classify: ≥750 = good, 400–750 = low, <400 = critical
        if lightLevelEMA >= 750 {
            currentLightQuality = "good"
        } else if lightLevelEMA >= 400 {
            currentLightQuality = "low"
        } else {
            currentLightQuality = "critical"
        }

        // ── Tracking state ───────────────────────────────────────────────
        switch frame.camera.trackingState {
        case .normal:
            currentTrackingState = "normal"
            currentTrackingReason = nil
        case .limited(let reason):
            currentTrackingState = "limited"
            switch reason {
            case .excessiveMotion:
                currentTrackingReason = "excessiveMotion"
            case .insufficientFeatures:
                currentTrackingReason = "insufficientFeatures"
            case .initializing:
                currentTrackingReason = "initializing"
            case .relocalizing:
                currentTrackingReason = "relocalizing"
            @unknown default:
                currentTrackingReason = "unknown"
            }
        case .notAvailable:
            currentTrackingState = "notAvailable"
            currentTrackingReason = nil
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Floor Detection via RANSAC (Etappe 2)
    // ─────────────────────────────────────────────────────────────────────────

    /// Run RANSAC on accumulated candidate points to find the dominant
    /// horizontal floor plane. Returns plane equation (a,b,c,d) or nil.
    ///
    /// Algorithm: 300 iterations, pick 3 random points, fit plane, count
    /// inliers within 8mm. Only accept if normal is roughly vertical
    /// (Y component ≥ 0.85 since ARKit Y is up).
    private func detectFloorRANSAC(_ points: [SIMD3<Float>]) -> SIMD4<Float>? {
        guard points.count >= 50 else { return nil }

        let iterations = 300
        let threshold: Float = 0.008  // 8mm inlier distance
        let minNormalY: Float = 0.85  // must be roughly horizontal

        var bestPlane: SIMD4<Float>? = nil
        var bestInlierCount = 0

        for _ in 0..<iterations {
            // Pick 3 random distinct points
            let i0 = Int.random(in: 0..<points.count)
            var i1 = Int.random(in: 0..<points.count)
            while i1 == i0 { i1 = Int.random(in: 0..<points.count) }
            var i2 = Int.random(in: 0..<points.count)
            while i2 == i0 || i2 == i1 { i2 = Int.random(in: 0..<points.count) }

            let p0 = points[i0], p1 = points[i1], p2 = points[i2]

            // Compute plane normal via cross product
            let v1 = p1 - p0
            let v2 = p2 - p0
            var normal = simd_cross(v1, v2)
            let len = simd_length(normal)
            guard len > 1e-6 else { continue }
            normal /= len

            // Ensure normal points upward (positive Y)
            if normal.y < 0 { normal = -normal }

            // Horizontal bias: skip if not roughly horizontal
            guard normal.y >= minNormalY else { continue }

            // Plane equation: ax + by + cz + d = 0
            let d = -simd_dot(normal, p0)

            // Count inliers
            var inlierCount = 0
            for pt in points {
                let dist = abs(simd_dot(normal, pt) + d)
                if dist < threshold { inlierCount += 1 }
            }

            if inlierCount > bestInlierCount {
                bestInlierCount = inlierCount
                bestPlane = SIMD4<Float>(normal.x, normal.y, normal.z, d)
            }
        }

        // Accept if at least 20% of points are inliers (it's a real floor)
        guard let plane = bestPlane,
              bestInlierCount >= points.count / 5
        else { return nil }

        print("[LiDAR] Floor detected: normal=(\(plane.x), \(plane.y), \(plane.z)), d=\(plane.w), inliers=\(bestInlierCount)/\(points.count)")
        return plane
    }

    /// Compute signed distance from a point to the floor plane.
    /// Positive = above floor, negative = below floor.
    private func distanceToFloor(_ point: SIMD3<Float>) -> Float {
        guard let plane = floorPlane else { return 0 }
        return plane.x * point.x + plane.y * point.y + plane.z * point.z + plane.w
    }

    /// Check if a world-space point is in the foot region (5–200mm above floor).
    private func isFootPoint(_ point: SIMD3<Float>) -> Bool {
        let dist = distanceToFloor(point)
        return dist >= 0.005 && dist <= 0.200
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – ArUco / Rectangle Calibration (Etappe 7)
    // ─────────────────────────────────────────────────────────────────────────

    /// Attempt to detect a credit-card-sized rectangle in the camera frame
    /// for absolute scale calibration. Uses Vision Framework rectangle detection.
    ///
    /// When a rectangle matching credit card proportions is found:
    /// 1. Measure its apparent size using depth data
    /// 2. Compare to known dimensions (85.6 × 54mm)
    /// 3. Compute scale correction factor
    private func attemptCalibrationDetection(_ frame: ARFrame) {
        let now = frame.timestamp
        guard now - lastArucoDetectionTime >= arucoDetectionInterval else { return }
        lastArucoDetectionTime = now

        // Need depth for 3D measurement of detected rectangle
        guard let sceneDepth = frame.smoothedSceneDepth else { return }

        let pixelBuffer = frame.capturedImage

        // Use VNDetectRectanglesRequest to find card-like rectangles
        let request = VNDetectRectanglesRequest { [weak self] request, error in
            guard let self = self,
                  error == nil,
                  let results = request.results as? [VNRectangleObservation],
                  let rect = results.first
            else { return }

            // Check aspect ratio matches credit card (~1.586)
            let width = self.distance(from: rect.topLeft, to: rect.topRight)
            let height = self.distance(from: rect.topLeft, to: rect.bottomLeft)
            let aspectRatio = max(width, height) / max(0.001, min(width, height))
            let targetRatio: CGFloat = 85.6 / 54.0  // 1.585

            // Accept if aspect ratio is within 15% of credit card
            guard abs(aspectRatio - targetRatio) / targetRatio < 0.15 else { return }

            // Compute 3D scale from rectangle corners using depth
            let scaleFactor = self.computeScaleFromRectangle(
                rect: rect,
                depthMap: sceneDepth.depthMap,
                camera: frame.camera
            )

            if let sf = scaleFactor, sf > 0.8 && sf < 1.2 {
                self.arucoScaleFactors.append(sf)
                self.arucoDetectionCount += 1

                if self.arucoScaleFactors.count >= self.minArucoDetections && !self.calibrationDone {
                    // Compute median scale factor (robust to outliers)
                    let sorted = self.arucoScaleFactors.sorted()
                    let median = sorted[sorted.count / 2]
                    self.calibrationScaleFactor = median

                    // Residual: std dev of scale factors × average dimension
                    let mean = self.arucoScaleFactors.reduce(0, +) / Float(self.arucoScaleFactors.count)
                    let variance = self.arucoScaleFactors.reduce(0) { $0 + ($1 - mean) * ($1 - mean) } / Float(self.arucoScaleFactors.count)
                    let avgDimMM: Float = (self.calibrationCardWidthMM + self.calibrationCardHeightMM) / 2
                    self.calibrationResidualMM = sqrt(variance) * avgDimMM
                    self.calibrationDone = true

                    print("[LiDAR] Calibration done: scale=\(median), residual=\(self.calibrationResidualMM)mm, detections=\(self.arucoScaleFactors.count)")
                }
            }
        }

        request.minimumAspectRatio = 1.3
        request.maximumAspectRatio = 1.9
        request.minimumSize = 0.05  // at least 5% of image
        request.maximumObservations = 1
        request.minimumConfidence = 0.8

        // Run asynchronously to avoid blocking ARKit delegate
        DispatchQueue.global(qos: .utility).async {
            let handler = VNImageRequestHandler(cvPixelBuffer: pixelBuffer, orientation: .right)
            try? handler.perform([request])
        }
    }

    /// Compute Euclidean distance between two Vision normalized points
    private func distance(from a: CGPoint, to b: CGPoint) -> CGFloat {
        return sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y))
    }

    /// Compute scale factor from a detected rectangle by measuring its
    /// 3D dimensions via depth and comparing to known card size.
    private func computeScaleFromRectangle(
        rect: VNRectangleObservation,
        depthMap: CVPixelBuffer,
        camera: ARCamera
    ) -> Float? {
        // Get depth at rectangle corners (Vision coords are normalized 0-1)
        let corners = [rect.topLeft, rect.topRight, rect.bottomRight, rect.bottomLeft]

        let dWidth = CVPixelBufferGetWidth(depthMap)
        let dHeight = CVPixelBufferGetHeight(depthMap)

        CVPixelBufferLockBaseAddress(depthMap, .readOnly)
        defer { CVPixelBufferUnlockBaseAddress(depthMap, .readOnly) }
        let depthPtr = CVPixelBufferGetBaseAddress(depthMap)!.assumingMemoryBound(to: Float32.self)

        // Back-project corners to 3D
        let imageRes = camera.imageResolution
        let scaleH = Float(dHeight) / Float(imageRes.height)
        let intr = camera.intrinsics
        let fx = intr[0][0] * scaleH
        let fy = intr[1][1] * scaleH
        let cx = intr[2][0] * scaleH
        let cy = intr[2][1] * scaleH

        var points3D: [SIMD3<Float>] = []
        for corner in corners {
            // Convert normalized Vision coords to depth buffer coords
            // Vision: origin bottom-left, depth: origin top-left
            let u = Int(corner.x * CGFloat(dWidth))
            let v = Int((1.0 - corner.y) * CGFloat(dHeight))
            guard u >= 0 && u < dWidth && v >= 0 && v < dHeight else { return nil }

            let depth = depthPtr[v * dWidth + u]
            guard depth > 0.1 && depth < 1.0 else { return nil }

            let x = (Float(u) - cx) * depth / fx
            let y = (Float(v) - cy) * depth / fy
            let z = -depth
            points3D.append(SIMD3(x, y, z))
        }

        guard points3D.count == 4 else { return nil }

        // Measure rectangle dimensions in 3D (metres)
        let topEdge = simd_length(points3D[1] - points3D[0])
        let bottomEdge = simd_length(points3D[2] - points3D[3])
        let leftEdge = simd_length(points3D[3] - points3D[0])
        let rightEdge = simd_length(points3D[2] - points3D[1])

        let measuredWidth = (topEdge + bottomEdge) / 2 * 1000   // mm
        let measuredHeight = (leftEdge + rightEdge) / 2 * 1000  // mm

        // Compare to known card dimensions
        let scaleW = calibrationCardWidthMM / measuredWidth
        let scaleH2 = calibrationCardHeightMM / measuredHeight
        let avgScale = (scaleW + scaleH2) / 2

        return avgScale
    }

    /// Apply calibration scale to a world-space point
    private func applyCalibration(_ point: SIMD3<Float>) -> SIMD3<Float> {
        guard calibrationDone else { return point }
        return point * calibrationScaleFactor
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Vision Framework Foot Segmentation (Etappe 15)
    // ─────────────────────────────────────────────────────────────────────────

    /// Uses VNDetectHumanBodyPoseRequest to find ankle keypoints.
    /// Ankle positions are transformed to world space for tighter foot bounding
    /// and heel girth positioning.
    private func attemptBodyPoseDetection(_ frame: ARFrame) {
        let now = frame.timestamp
        guard now - lastBodyPoseTime >= bodyPoseInterval else { return }
        lastBodyPoseTime = now

        guard let sceneDepth = frame.smoothedSceneDepth else { return }

        let pixelBuffer = frame.capturedImage
        let camera = frame.camera
        let transform = camera.transform
        let depthMap = sceneDepth.depthMap

        let request = VNDetectHumanBodyPoseRequest { [weak self] request, error in
            guard let self = self,
                  error == nil,
                  let results = request.results as? [VNHumanBodyPoseObservation],
                  let body = results.first
            else { return }

            // Extract ankle keypoints
            do {
                let leftAnkle = try body.recognizedPoint(.leftAnkle)
                let rightAnkle = try body.recognizedPoint(.rightAnkle)

                // Only use high-confidence detections
                guard leftAnkle.confidence > 0.3 || rightAnkle.confidence > 0.3 else { return }

                let dWidth = CVPixelBufferGetWidth(depthMap)
                let dHeight = CVPixelBufferGetHeight(depthMap)
                let imageRes = camera.imageResolution
                let scaleH = Float(dHeight) / Float(imageRes.height)
                let intr = camera.intrinsics
                let fx = intr[0][0] * scaleH
                let fy = intr[1][1] * scaleH
                let cx = intr[2][0] * scaleH
                let cy = intr[2][1] * scaleH

                CVPixelBufferLockBaseAddress(depthMap, .readOnly)
                defer { CVPixelBufferUnlockBaseAddress(depthMap, .readOnly) }
                let depthPtr = CVPixelBufferGetBaseAddress(depthMap)!.assumingMemoryBound(to: Float32.self)

                // Helper: Vision normalized coords → world space via depth
                func toWorldSpace(_ point: VNRecognizedPoint) -> SIMD3<Float>? {
                    guard point.confidence > 0.3 else { return nil }
                    let u = Int(point.location.x * CGFloat(dWidth))
                    let v = Int((1.0 - point.location.y) * CGFloat(dHeight))
                    guard u >= 0, u < dWidth, v >= 0, v < dHeight else { return nil }

                    let depth = depthPtr[v * dWidth + u]
                    guard depth > 0.1, depth < 1.5 else { return nil }

                    let x = (Float(u) - cx) * depth / fx
                    let y = (Float(v) - cy) * depth / fy
                    let z = -depth

                    let camPt = SIMD4<Float>(x, y, z, 1)
                    let world = transform * camPt
                    return SIMD3<Float>(world.x, world.y, world.z)
                }

                if let lw = toWorldSpace(leftAnkle) {
                    self.detectedAnkleLeft = lw
                    print("[LiDAR] Etappe 15: Left ankle detected at world (\(lw.x), \(lw.y), \(lw.z))")
                }
                if let rw = toWorldSpace(rightAnkle) {
                    self.detectedAnkleRight = rw
                    print("[LiDAR] Etappe 15: Right ankle detected at world (\(rw.x), \(rw.y), \(rw.z))")
                }

                if self.detectedAnkleLeft != nil || self.detectedAnkleRight != nil {
                    self.footSegmented = true
                    print("[LiDAR] Etappe 15: Foot segmented via body pose (ankle detected)")
                }
            } catch {
                // Ankle keypoints not found in this frame — ignore
            }
        }

        DispatchQueue.global(qos: .utility).async {
            let handler = VNImageRequestHandler(cvPixelBuffer: pixelBuffer, orientation: .right)
            try? handler.perform([request])
        }
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
        continuousFrameCount += 1

        let pts = extractPointsFromDepthFrame(
            depthMap:      sceneDepth.depthMap,
            confidenceMap: confidenceMap,
            camera:        frame.camera
        )

        // Transform camera-relative points into world space
        let transform = frame.camera.transform
        var worldPts: [[String: Double]] = []
        var worldPtsRaw: [SIMD3<Float>] = []  // for floor detection
        worldPts.reserveCapacity(pts.count)
        worldPtsRaw.reserveCapacity(pts.count)

        for p in pts {
            let world = transform * SIMD4<Float>(p.x, p.y, p.z, 1)
            let wp = SIMD3<Float>(world.x, world.y, world.z)
            worldPtsRaw.append(wp)
        }

        // ── Etappe 2: Floor detection in first ~2 seconds ───────────────
        if !floorDetected && (now - continuousStartTime) < floorDetectionWindow {
            // Accumulate points for RANSAC (subsample to keep memory low)
            let step = max(1, worldPtsRaw.count / 200)
            for i in stride(from: 0, to: worldPtsRaw.count, by: step) {
                floorCandidatePoints.append(worldPtsRaw[i])
            }
        } else if !floorDetected && floorCandidatePoints.count >= 50 {
            // Time's up — run RANSAC once
            if let plane = detectFloorRANSAC(floorCandidatePoints) {
                floorPlane = plane
                floorDetected = true
            } else {
                // Mark as attempted so we don't retry
                floorDetected = false
                floorCandidatePoints = []  // free memory
                print("[LiDAR] Floor detection failed — continuing without floor filtering")
            }
            floorCandidatePoints = []  // free memory regardless
        }

        // ── Build point cloud, optionally filtering by floor ────────────
        var footPtsThisFrame = 0
        for wp in worldPtsRaw {
            // If floor detected, only keep foot points (5–200mm above floor)
            if floorDetected && floorPlane != nil {
                if !isFootPoint(wp) { continue }
                footPtsThisFrame += 1
            }
            // Etappe 7: Apply calibration scale if available
            let calibrated = applyCalibration(wp)
            worldPts.append([
                "x": Double(calibrated.x),
                "y": Double(calibrated.y),
                "z": Double(calibrated.z)
            ])
        }

        // Calculate camera azimuth (0–360°) and bin into 30° sectors
        let forward = -transform.columns.2  // camera forward = -Z column
        let azimuthDeg = atan2(forward.x, forward.z) * 180.0 / .pi  // −180..180
        let bin = Int((azimuthDeg + 180.0) / 30.0) % 12  // 0..11

        continuousLock.lock()
        continuousPoints.append(contentsOf: worldPts)
        footPointCount += (floorDetected ? footPtsThisFrame : worldPts.count)
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
        let intrinsics = frame.camera.intrinsics
        let imageRes = frame.camera.imageResolution
        let ts = frame.timestamp

        DispatchQueue.global(qos: .utility).async { [weak self] in
            guard let self = self else { return }
            let ciImage = CIImage(cvPixelBuffer: pixelBuffer)
            let context = CIContext(options: [.useSoftwareRenderer: false])
            guard let cgImage = context.createCGImage(ciImage, from: ciImage.extent) else { return }

            // Downscale to max 1200px wide for photogrammetry
            let original = UIImage(cgImage: cgImage)
            let maxWidth: CGFloat = 1200
            let scale = min(1.0, maxWidth / original.size.width)
            let newSize = CGSize(width: original.size.width * scale, height: original.size.height * scale)
            UIGraphicsBeginImageContextWithOptions(newSize, true, 1.0)
            original.draw(in: CGRect(origin: .zero, size: newSize))
            guard let resized = UIGraphicsGetImageFromCurrentImageContext() else {
                UIGraphicsEndImageContext()
                return
            }
            UIGraphicsEndImageContext()

            let captured = CapturedFrame(
                image: resized,
                cameraTransform: transform,
                cameraIntrinsics: intrinsics,
                imageResolution: imageRes,
                timestamp: ts
            )
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

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Bilateral Depth Filter (Etappe 9)
    // ─────────────────────────────────────────────────────────────────────────

    /// Apply a simplified bilateral filter to the depth map in-place.
    /// Smooths depth values while preserving edges (depth discontinuities).
    /// Uses a 3×3 kernel with spatial and range Gaussian weights.
    ///
    /// This approximates Joint Bilateral Upsampling without requiring RGB:
    ///   - Spatial sigma: 1.0 pixel
    ///   - Range sigma: 5mm (depth difference threshold for edge preservation)
    private func bilateralFilterDepth(
        _ depthPtr: UnsafeMutablePointer<Float32>,
        width: Int,
        height: Int,
        confidencePtr: UnsafePointer<UInt8>,
        confWidth: Int,
        confHeight: Int,
        scaleX: Float,
        scaleY: Float
    ) {
        let rangeSigma: Float = 0.005  // 5mm — preserves edges > 5mm discontinuity
        let rangeSigmaSq2 = 2.0 * rangeSigma * rangeSigma

        // Pre-computed spatial weights for 3×3 kernel (sigma=1.0)
        let spatialWeights: [Float] = [
            0.0585, 0.0965, 0.0585,  // exp(-2/2), exp(-1/2), exp(-2/2)
            0.0965, 0.1592, 0.0965,  // exp(-1/2), exp(0/2),  exp(-1/2)
            0.0585, 0.0965, 0.0585,
        ]

        // Work on a copy to avoid reading modified values
        let totalPixels = width * height
        let copy = UnsafeMutablePointer<Float32>.allocate(capacity: totalPixels)
        copy.initialize(from: depthPtr, count: totalPixels)
        defer { copy.deallocate() }

        // Process every other pixel (matching our extraction stride of 2)
        let step = 2
        for v in Swift.stride(from: 1, to: height - 1, by: step) {
            for u in Swift.stride(from: 1, to: width - 1, by: step) {
                let centerDepth = copy[v * width + u]
                guard centerDepth >= 0.15 && centerDepth <= 0.80 else { continue }

                // Only filter medium+ confidence pixels
                let cu = min(max(Int(Float(u) * scaleX), 0), confWidth - 1)
                let cv = min(max(Int(Float(v) * scaleY), 0), confHeight - 1)
                guard confidencePtr[cv * confWidth + cu] >= 1 else { continue }

                var weightedSum: Float = 0
                var weightSum: Float = 0
                var ki = 0

                for dv in -1...1 {
                    for du in -1...1 {
                        let nu = u + du
                        let nv = v + dv
                        let neighborDepth = copy[nv * width + nu]
                        guard neighborDepth >= 0.15 && neighborDepth <= 0.80 else {
                            ki += 1
                            continue
                        }

                        let depthDiff = centerDepth - neighborDepth
                        let rangeWeight = exp(-(depthDiff * depthDiff) / rangeSigmaSq2)
                        let w = spatialWeights[ki] * rangeWeight

                        weightedSum += w * neighborDepth
                        weightSum += w
                        ki += 1
                    }
                }

                if weightSum > 0.001 {
                    depthPtr[v * width + u] = weightedSum / weightSum
                }
            }
        }
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

        // Lock both buffers for reading/writing (bilateral filter modifies depth)
        CVPixelBufferLockBaseAddress(depthMap,      [])
        CVPixelBufferLockBaseAddress(confidenceMap, .readOnly)
        defer {
            CVPixelBufferUnlockBaseAddress(depthMap,      [])
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

        // Etappe 9: Apply bilateral depth filter for edge-preserving smoothing
        if continuousActive {
            bilateralFilterDepth(
                depthPtr, width: dWidth, height: dHeight,
                confidencePtr: confPtr, confWidth: cWidth, confHeight: cHeight,
                scaleX: scaleX, scaleY: scaleY
            )
        }

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
                // Etappe 3: prefer high confidence (2) for ±1mm accuracy;
                // medium (1) accepted to maintain point density in difficult areas
                guard confidence >= 1 else { continue }

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

    /// Etappe 8: Export camera poses for all captured RGB frames.
    /// Returns array of pose data suitable for SfM/photogrammetry pipeline.
    private func exportCameraPoses() -> [[String: Any]] {
        frameCaptureLock.lock()
        let frames = capturedFrames
        frameCaptureLock.unlock()

        var poses: [[String: Any]] = []
        for (i, frame) in frames.enumerated() {
            let t = frame.cameraTransform
            // Flatten 4x4 transform to array (column-major, matching ARKit)
            let transform: [Float] = [
                t.columns.0.x, t.columns.0.y, t.columns.0.z, t.columns.0.w,
                t.columns.1.x, t.columns.1.y, t.columns.1.z, t.columns.1.w,
                t.columns.2.x, t.columns.2.y, t.columns.2.z, t.columns.2.w,
                t.columns.3.x, t.columns.3.y, t.columns.3.z, t.columns.3.w,
            ]
            let intr = frame.cameraIntrinsics
            let intrinsics: [Float] = [
                intr.columns.0.x, intr.columns.0.y, intr.columns.0.z,
                intr.columns.1.x, intr.columns.1.y, intr.columns.1.z,
                intr.columns.2.x, intr.columns.2.y, intr.columns.2.z,
            ]
            poses.append([
                "index": i,
                "timestamp": frame.timestamp,
                "transform": transform.map { Double($0) },
                "intrinsics": intrinsics.map { Double($0) },
                "imageWidth": Int(frame.imageResolution.width),
                "imageHeight": Int(frame.imageResolution.height),
            ])
        }
        return poses
    }

    /// Etappe 8: Estimate photo overlap quality (0-100%).
    /// Checks how many consecutive frame pairs have sufficient baseline
    /// (camera movement) while maintaining viewing overlap.
    private func estimatePhotoOverlap() -> Int {
        frameCaptureLock.lock()
        let frames = capturedFrames
        frameCaptureLock.unlock()

        guard frames.count >= 2 else { return 0 }

        var goodPairs = 0
        let totalPairs = frames.count - 1

        for i in 0..<totalPairs {
            let t1 = frames[i].cameraTransform
            let t2 = frames[i + 1].cameraTransform

            // Camera positions
            let p1 = SIMD3<Float>(t1.columns.3.x, t1.columns.3.y, t1.columns.3.z)
            let p2 = SIMD3<Float>(t2.columns.3.x, t2.columns.3.y, t2.columns.3.z)
            let baseline = simd_length(p2 - p1)

            // Forward vectors
            let f1 = -SIMD3<Float>(t1.columns.2.x, t1.columns.2.y, t1.columns.2.z)
            let f2 = -SIMD3<Float>(t2.columns.2.x, t2.columns.2.y, t2.columns.2.z)
            let angleCos = simd_dot(simd_normalize(f1), simd_normalize(f2))

            // Good pair: sufficient baseline (>2cm) + still overlapping (angle < 45°)
            if baseline > 0.02 && baseline < 0.15 && angleCos > 0.707 {
                goodPairs += 1
            }
        }

        return Int(Double(goodPairs) / Double(totalPairs) * 100)
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
        continuousPoints.reserveCapacity(40_000)  // Etappe 3: higher with 8fps capture
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

        // Reset environment quality state
        lightLevelEMA = 1000.0
        currentLightQuality = "good"
        currentTrackingState = "normal"
        currentTrackingReason = nil
        continuousFrameCount = 0

        // Reset floor detection state (Etappe 2)
        floorPlane = nil
        floorDetected = false
        floorCandidatePoints = []
        floorCandidatePoints.reserveCapacity(2000)
        continuousStartTime = CACurrentMediaTime()
        footPointCount = 0

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
        let currentFootPts = footPointCount
        let currentBinCounts = continuousBinCounts  // Etappe 10: copy for heatmap
        continuousLock.unlock()

        // Coverage: use footPointCount when floor detected (cleaner signal)
        let effectivePoints = floorDetected ? currentFootPts : pointCount
        let pointScore = min(1.0, Double(effectivePoints) / (floorDetected ? 12000.0 : 15000.0))
        let angleScore = min(1.0, Double(anglesCovered) / 8.0)
        let coverage = Int(min(100, (pointScore * 40.0 + angleScore * 60.0)))

        var result: [String: Any] = [
            "pointCount":        pointCount,
            "anglesCovered":     anglesCovered,
            "totalAngleBins":    12,
            "estimatedCoverage": coverage,
            // ── Etappe 1: Environment quality ────────────────────────────
            "lightLevel":        Int(lightLevelEMA),
            "lightQuality":      currentLightQuality,
            "trackingState":     currentTrackingState,
            "frameCount":        continuousFrameCount,
            // ── Etappe 2: Floor detection ────────────────────────────────
            "floorDetected":     floorDetected,
            "footPointCount":    currentFootPts,
            // ── Etappe 7: Calibration status ─────────────────────────────
            "calibrationDone":   calibrationDone,
            "calibrationScale":  calibrationDone ? calibrationScaleFactor : NSNull(),
            "calibrationResidualMM": calibrationDone ? calibrationResidualMM : NSNull(),
            "arucoDetections":   arucoDetectionCount,
            // ── Etappe 8: Photo capture progress ─────────────────────────
            "rgbFrameCount":     capturedFrames.count,
            // ── Etappe 10: Per-bin point counts for quality heatmap ───────
            "binCounts":         currentBinCounts,
            // ── Etappe 15: Vision body pose foot segmentation ────────────
            "footSegmented":     footSegmented,
            // ── Camera distance feedback ─────────────────────────────────
            "cameraHeightMM":    floorDetected ? Int(cameraHeightAboveFloorMM) : NSNull()
        ]

        if let reason = currentTrackingReason {
            result["trackingReason"] = reason
        }

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
            let rawPoints = self.continuousPoints
            let angles = self.continuousAngles
            self.continuousLock.unlock()

            // ── Etappe 5: Voxel-grid averaging for noise reduction ──────
            let (averagedPoints, rawCount, voxelCount) = self.voxelGridAverage(rawPoints)

            let bestImages = self.selectBestFrames()

            var result: [String: Any] = [
                "pointCloud":       averagedPoints,
                "pointCount":       averagedPoints.count,
                "rawPointCount":    rawCount,
                "voxelCount":       voxelCount,
                "anglesCovered":    angles.count,
                "capturedImages":   bestImages,
                // ── Etappe 2: Floor detection info ───────────────────────
                "floorDetected":    self.floorDetected,
                "footPointCount":   self.footPointCount,
                // ── Etappe 7: Calibration info ───────────────────────────
                "calibrationDone":  self.calibrationDone,
                "calibrationScale": self.calibrationDone ? self.calibrationScaleFactor : NSNull(),
                "calibrationResidualMM": self.calibrationDone ? self.calibrationResidualMM : NSNull(),
                // ── Etappe 8: SfM camera poses + overlap quality ─────────
                "cameraPoses":      self.exportCameraPoses(),
                "photoOverlap":     self.estimatePhotoOverlap(),
                "rgbFrameCount":    self.capturedFrames.count,
                // ── Etappe 15: Foot segmentation info ────────────────────
                "footSegmented":    self.footSegmented,
            ]

            // Etappe 15: Add ankle positions if detected
            if let ankle = self.detectedAnkleLeft {
                result["ankleLeftWorld"] = ["x": Double(ankle.x), "y": Double(ankle.y), "z": Double(ankle.z)]
            }
            if let ankle = self.detectedAnkleRight {
                result["ankleRightWorld"] = ["x": Double(ankle.x), "y": Double(ankle.y), "z": Double(ankle.z)]
            }

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

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Voxel-Grid Point Averaging (Etappe 5)
    // ─────────────────────────────────────────────────────────────────────────

    /// Voxel size in meters (0.5mm = high resolution for ±1mm accuracy)
    private let voxelSize: Double = 0.0005

    /// Downsamples a point cloud using voxel-grid averaging.
    /// All points within each 0.5mm³ voxel are averaged to a single point.
    /// This reduces noise by √n factor where n = points per voxel.
    ///
    /// Returns: (averaged points, original count, voxel count)
    private func voxelGridAverage(_ points: [[String: Double]]) -> (points: [[String: Double]], originalCount: Int, voxelCount: Int) {
        let originalCount = points.count
        guard originalCount > 100 else {
            return (points, originalCount, originalCount)
        }

        // Accumulator: voxel key → (sumX, sumY, sumZ, count)
        struct VoxelAccum {
            var sumX: Double = 0
            var sumY: Double = 0
            var sumZ: Double = 0
            var count: Int = 0
        }

        // Use a dictionary with integer voxel coordinates as key
        // Key = ix * P1 + iy * P2 + iz  (spatial hash)
        let invVoxel = 1.0 / voxelSize
        var voxels: [Int64: VoxelAccum] = [:]
        voxels.reserveCapacity(points.count / 3)  // rough estimate

        // Large primes for spatial hashing to avoid collisions
        let p1: Int64 = 73856093
        let p2: Int64 = 19349663

        for pt in points {
            guard let x = pt["x"], let y = pt["y"], let z = pt["z"] else { continue }
            let ix = Int64(floor(x * invVoxel))
            let iy = Int64(floor(y * invVoxel))
            let iz = Int64(floor(z * invVoxel))
            let key = ix &* p1 &+ iy &* p2 &+ iz

            if var accum = voxels[key] {
                accum.sumX += x
                accum.sumY += y
                accum.sumZ += z
                accum.count += 1
                voxels[key] = accum
            } else {
                voxels[key] = VoxelAccum(sumX: x, sumY: y, sumZ: z, count: 1)
            }
        }

        // Average each voxel
        var averaged: [[String: Double]] = []
        averaged.reserveCapacity(voxels.count)
        for (_, accum) in voxels {
            let n = Double(accum.count)
            averaged.append([
                "x": accum.sumX / n,
                "y": accum.sumY / n,
                "z": accum.sumZ / n
            ])
        }

        print("[LiDAR] Voxel averaging: \(originalCount) → \(averaged.count) points (\(String(format: "%.1f", Double(originalCount)/max(1.0, Double(averaged.count))))× compression)")
        return (averaged, originalCount, averaged.count)
    }

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
        continuousFrameCount = 0
        floorPlane = nil
        floorDetected = false
        floorCandidatePoints = []
        footPointCount = 0
        // Reset calibration
        calibrationScaleFactor = 1.0
        calibrationDone = false
        calibrationResidualMM = 0.0
        arucoDetectionCount = 0
        arucoScaleFactors = []
        lastArucoDetectionTime = 0
        // Reset body pose / foot segmentation
        footSegmented = false
        detectedAnkleLeft = nil
        detectedAnkleRight = nil
        lastBodyPoseTime = 0
        // Reset camera height
        cameraHeightAboveFloorMM = 0
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

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: – Camera Preview (live feed behind transparent webview)
    // ─────────────────────────────────────────────────────────────────────────

    @objc func startCameraPreview(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { call.reject("PLUGIN_DEALLOCATED"); return }

            // Already showing?
            if self.cameraPreviewView != nil {
                call.resolve()
                return
            }

            // Need an active ARSession
            guard let session = self.arSession else {
                print("[LiDAR] startCameraPreview – no active ARSession, creating one")
                // If no session yet, start one for preview only
                let session = ARSession()
                session.delegate = self
                self.arSession = session
                let config = ARWorldTrackingConfiguration()
                if ARWorldTrackingConfiguration.supportsFrameSemantics(.smoothedSceneDepth) {
                    config.frameSemantics = [.smoothedSceneDepth]
                }
                session.run(config)
                self.insertCameraPreview(session: session)
                call.resolve()
                return
            }

            self.insertCameraPreview(session: session)
            call.resolve()
        }
    }

    private func insertCameraPreview(session: ARSession) {
        guard let vc = self.bridge?.viewController else {
            print("[LiDAR] startCameraPreview – no viewController")
            return
        }

        let arView = ARSCNView(frame: vc.view.bounds)
        arView.session = session
        arView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        arView.scene = SCNScene()
        arView.rendersContinuously = true

        // Insert behind the webview (index 0)
        vc.view.insertSubview(arView, at: 0)
        self.cameraPreviewView = arView

        // Force webview transparency (belt-and-suspenders — Capacitor config may override)
        if let webView = self.webView {
            webView.isOpaque = false
            webView.backgroundColor = .clear
            webView.scrollView.backgroundColor = .clear
            print("[LiDAR] ✅ Camera preview inserted + webView forced transparent")
        } else {
            print("[LiDAR] ✅ Camera preview inserted (webView not available for transparency)")
        }
    }

    @objc func stopCameraPreview(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            self?.removeCameraPreview()
            call.resolve()
        }
    }

    private func removeCameraPreview() {
        cameraPreviewView?.removeFromSuperview()
        cameraPreviewView = nil
        print("[LiDAR] Camera preview removed")
    }
}
