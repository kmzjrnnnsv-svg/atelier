import { registerPlugin } from '@capacitor/core'

const LidarScanNative = registerPlugin('LidarScan', {
  web: () => import('./lidarScanWeb').then(m => new m.LidarScanWeb()),
})

export default LidarScanNative

export function isCapacitorNative() {
  return typeof window !== 'undefined' &&
    window.Capacitor?.isNativePlatform?.() === true
}

/**
 * Check if device has LiDAR via native plugin.
 * Falls back to user-agent heuristic for known LiDAR-equipped iPhones/iPads
 * when the native plugin is unavailable (e.g. running in browser).
 */
export async function lidarAvailable() {
  // Try native plugin first (most reliable)
  if (isCapacitorNative()) {
    try {
      const { supported } = await LidarScanNative.isLidarSupported()
      if (supported) return true
    } catch (e) {
      console.warn('[LiDAR] Native plugin check failed:', e.message)
    }
  }

  // Fallback: detect known LiDAR models via user-agent
  // iPhone 12 Pro+, 13 Pro+, 14 Pro+, 15 Pro+, 16 Pro+, iPad Pro (2020+)
  return isLidarDeviceByUA()
}

/**
 * Heuristic: check user-agent for iPhone/iPad models known to have LiDAR.
 * This is a fallback when the native ARKit check is unavailable.
 */
function isLidarDeviceByUA() {
  const ua = navigator.userAgent || ''

  // On iOS Safari, the UA doesn't expose specific model numbers.
  // But in a native WKWebView (Capacitor), we can check platform hints.
  // If we're on an iPhone with iOS 14+ and it's a "Pro" device, LiDAR is likely.
  // The most reliable way is via the native plugin above; this is just a safety net.

  // iPad Pro with LiDAR (2020+): detected via maxTouchPoints on "MacIntel" platform
  const isIPadPro = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  if (isIPadPro) return true

  // For iPhones in native WKWebView, we can't reliably distinguish Pro models
  // from the UA alone. Return false and rely on native plugin.
  return false
}
