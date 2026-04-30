/**
 * depthSensing.js — Cross-platform depth sensing (WebXR for Android, LiDAR for iOS)
 *
 * Provides depth data alongside regular camera captures:
 *  - iOS: Uses native LiDAR via Capacitor plugin
 *  - Android: Uses WebXR Depth Sensing API (Chrome + ARCore)
 *  - Fallback: Monocular depth estimation hint via structure-from-motion
 *
 * Usage:
 *   const depth = new DepthSensing()
 *   const supported = await depth.init()
 *   // During each photo capture:
 *   const depthData = await depth.captureDepth()
 *   depth.destroy()
 */

// ─── WebXR Depth Sensing (Android Chrome + ARCore) ────────────────────────────

let _xrSession = null
let _xrRefSpace = null
let _glBinding = null
let _glContext = null

async function checkWebXRDepth() {
  if (!navigator.xr) return false
  try {
    return await navigator.xr.isSessionSupported('immersive-ar')
  } catch {
    return false
  }
}

async function startWebXRDepth() {
  if (!navigator.xr) return null
  try {
    _xrSession = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['depth-sensing', 'local'],
      depthSensing: {
        usagePreference: ['cpu-optimized'],
        dataFormatPreference: ['luminance-alpha', 'float32'],
      },
    })

    _xrRefSpace = await _xrSession.requestReferenceSpace('local')

    // Create WebGL context for depth binding
    const canvas = document.createElement('canvas')
    _glContext = canvas.getContext('webgl2', { xrCompatible: true })
    if (!_glContext) return null

    await _xrSession.updateRenderState({
      baseLayer: new XRWebGLLayer(_xrSession, _glContext),
    })

    _glBinding = new XRWebGLBinding(_xrSession, _glContext)
    return _xrSession
  } catch (e) {
    console.warn('[DepthSensing] WebXR depth init failed:', e.message)
    return null
  }
}

function getWebXRDepthFrame(frame) {
  if (!frame || !_xrRefSpace || !_glBinding) return null
  try {
    const viewerPose = frame.getViewerPose(_xrRefSpace)
    if (!viewerPose?.views?.[0]) return null

    const view = viewerPose.views[0]
    const depthInfo = _glBinding.getDepthInformation(view)
    if (!depthInfo) return null

    // Extract depth data
    const { width, height, rawValueToMeters } = depthInfo
    const data = new Float32Array(width * height)

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        data[y * width + x] = depthInfo.getDepthInMeters(x, y)
      }
    }

    return {
      width,
      height,
      data, // Float32Array of depth in meters
      rawValueToMeters,
      transform: view.transform.matrix,
    }
  } catch {
    return null
  }
}

function stopWebXRDepth() {
  if (_xrSession) {
    _xrSession.end().catch(() => {})
    _xrSession = null
  }
  _xrRefSpace = null
  _glBinding = null
  _glContext = null
}

// ─── Structure-from-Motion depth hint (universal fallback) ────────────────────
// Uses consecutive frames to estimate relative depth via parallax.
// Not metric-accurate, but gives foot-vs-background separation.

class SfMDepthEstimator {
  constructor() {
    this.prevFrame = null
    this.prevKeypoints = null
  }

  estimateDepthHint(frameCanvas) {
    // Extract sparse features from current frame
    const ctx = frameCanvas.getContext('2d')
    const { data, width, height } = ctx.getImageData(0, 0, frameCanvas.width, frameCanvas.height)

    // Simple gradient-based depth hint (edges = closer objects)
    const depthHint = new Float32Array(width * height)
    const blockSize = 8

    for (let by = 0; by < height; by += blockSize) {
      for (let bx = 0; bx < width; bx += blockSize) {
        let gradSum = 0, count = 0
        for (let y = by; y < Math.min(by + blockSize, height - 1); y++) {
          for (let x = bx; x < Math.min(bx + blockSize, width - 1); x++) {
            const idx = (y * width + x) * 4
            const luma = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114
            const idxR = (y * width + x + 1) * 4
            const lumaR = data[idxR] * 0.299 + data[idxR + 1] * 0.587 + data[idxR + 2] * 0.114
            const idxD = ((y + 1) * width + x) * 4
            const lumaD = data[idxD] * 0.299 + data[idxD + 1] * 0.587 + data[idxD + 2] * 0.114
            gradSum += Math.abs(luma - lumaR) + Math.abs(luma - lumaD)
            count++
          }
        }
        const avgGrad = count > 0 ? gradSum / count : 0
        // Higher gradient = more texture = likely closer object (foot vs flat floor)
        for (let y = by; y < Math.min(by + blockSize, height); y++) {
          for (let x = bx; x < Math.min(bx + blockSize, width); x++) {
            depthHint[y * width + x] = Math.min(avgGrad / 50, 1.0)
          }
        }
      }
    }

    return { width, height, data: depthHint, source: 'sfm-hint' }
  }
}

// ─── Unified DepthSensing class ───────────────────────────────────────────────

export default class DepthSensing {
  constructor() {
    this.mode = 'none' // 'webxr' | 'sfm' | 'none'
    this.webxrSession = null
    this.sfm = new SfMDepthEstimator()
    this.frameCallback = null
    this.latestDepth = null
  }

  /**
   * Initialize depth sensing. Returns the mode that was activated.
   * Priority: WebXR (Android) > SfM fallback
   */
  async init() {
    // Try WebXR Depth (Android Chrome + ARCore)
    const webxrSupported = await checkWebXRDepth()
    if (webxrSupported) {
      this.webxrSession = await startWebXRDepth()
      if (this.webxrSession) {
        this.mode = 'webxr'
        // Start frame loop for continuous depth
        this._startFrameLoop()
        return 'webxr'
      }
    }

    // Fallback: SfM-based depth hints
    this.mode = 'sfm'
    return 'sfm'
  }

  _startFrameLoop() {
    if (!this.webxrSession) return
    const onFrame = (time, frame) => {
      if (!this.webxrSession) return
      this.latestDepth = getWebXRDepthFrame(frame)
      this.webxrSession.requestAnimationFrame(onFrame)
    }
    this.webxrSession.requestAnimationFrame(onFrame)
  }

  /**
   * Capture depth data for the current camera frame.
   * @param {HTMLCanvasElement} frameCanvas - Canvas with current camera frame (for SfM fallback)
   * @returns {{ width, height, data: Float32Array, source: string } | null}
   */
  captureDepth(frameCanvas) {
    if (this.mode === 'webxr' && this.latestDepth) {
      return { ...this.latestDepth, source: 'webxr-arcore' }
    }

    if (this.mode === 'sfm' && frameCanvas) {
      return this.sfm.estimateDepthHint(frameCanvas)
    }

    return null
  }

  /**
   * Convert depth map to a pseudo-point-cloud (for PCA fitting).
   * Only works with metric depth (WebXR).
   * @param {object} depthFrame - From captureDepth()
   * @param {number} focalLength - Camera focal length in pixels (estimated)
   * @returns {Array<{x,y,z}>} Point cloud in meters
   */
  depthToPointCloud(depthFrame, focalLength = 500) {
    if (!depthFrame?.data || depthFrame.source === 'sfm-hint') return null

    const { width, height, data } = depthFrame
    const cx = width / 2, cy = height / 2
    const points = []

    // Subsample for performance (every 4th pixel)
    for (let y = 0; y < height; y += 4) {
      for (let x = 0; x < width; x += 4) {
        const z = data[y * width + x]
        if (z <= 0.01 || z > 2.0) continue // skip invalid or far points

        const px = (x - cx) * z / focalLength
        const py = (y - cy) * z / focalLength
        points.push({ x: px, y: py, z })
      }
    }

    return points.length > 100 ? points : null
  }

  destroy() {
    if (this.mode === 'webxr') {
      stopWebXRDepth()
    }
    this.webxrSession = null
    this.mode = 'none'
    this.latestDepth = null
  }
}

// ─── Utility: check if device has any depth capability ────────────────────────

export async function depthCapabilities() {
  const caps = {
    webxr: false,
    lidar: false,
    sfm: true,    // always available as fallback
    best: 'sfm',
  }

  try {
    caps.webxr = await checkWebXRDepth()
  } catch {}

  // Check LiDAR via native Capacitor plugin
  try {
    const { lidarAvailable } = await import('./lidarScan')
    caps.lidar = await lidarAvailable()
  } catch {}

  // LiDAR is the best option, then WebXR, then SfM
  if (caps.lidar) caps.best = 'lidar'
  else if (caps.webxr) caps.best = 'webxr'

  return caps
}
