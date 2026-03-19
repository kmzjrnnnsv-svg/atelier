export class LidarScanWeb {
  async isLidarSupported() { return { supported: false } }
  async captureFootScan() { throw new Error('LiDAR only available in native iOS app') }
  async startWalkAround() { throw new Error('LiDAR only available in native iOS app') }
  async getWalkAroundProgress() { return { pointCount: 0, meshAnchorCount: 0 } }
  async finishWalkAround() { return { pointCloud: [], pointCount: 0, meshAnchorCount: 0, capturedImages: {} } }
}
