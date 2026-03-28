export class LidarScanWeb {
  async isLidarSupported() { return { supported: false } }
  async captureFootScan() { throw new Error('LiDAR only available in native iOS app') }
  async startWalkAround() { throw new Error('LiDAR only available in native iOS app') }
  async getWalkAroundProgress() { return { pointCount: 0, meshAnchorCount: 0 } }
  async finishWalkAround() { return { pointCloud: [], pointCount: 0, meshAnchorCount: 0, capturedImages: {} } }
  // Mode 3: Continuous Depth Capture
  async startContinuousCapture() { throw new Error('LiDAR only available in native iOS app') }
  async getContinuousCaptureProgress() { return { pointCount: 0, anglesCovered: 0, totalAngleBins: 12, estimatedCoverage: 0, lightLevel: 1000, lightQuality: 'good', trackingState: 'normal', trackingReason: null, frameCount: 0 } }
  async finishContinuousCapture() { return { pointCloud: [], pointCount: 0, anglesCovered: 0, capturedImages: {} } }
}
