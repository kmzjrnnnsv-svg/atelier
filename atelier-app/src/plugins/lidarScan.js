import { registerPlugin } from '@capacitor/core'

const LidarScanNative = registerPlugin('LidarScan', {
  web: () => import('./lidarScanWeb').then(m => new m.LidarScanWeb()),
})

export default LidarScanNative

export function isCapacitorNative() {
  return typeof window !== 'undefined' &&
    window.Capacitor?.isNativePlatform?.() === true
}

export async function lidarAvailable() {
  try {
    const { supported } = await LidarScanNative.isLidarSupported()
    return !!supported
  } catch {
    return false
  }
}
