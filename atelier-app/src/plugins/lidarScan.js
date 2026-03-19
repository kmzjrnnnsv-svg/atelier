import { registerPlugin, Capacitor } from '@capacitor/core'

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
  const diag = []

  diag.push(`Capacitor: ${typeof window.Capacitor}`)
  diag.push(`isNative: ${window.Capacitor?.isNativePlatform?.()}`)
  diag.push(`platform: ${window.Capacitor?.getPlatform?.()}`)
  diag.push(`pluginAvail: ${Capacitor.isPluginAvailable?.('LidarScan')}`)

  // Also check raw PluginHeaders to see what native registered
  const headers = window.Capacitor?.PluginHeaders
  const lidarHeader = headers?.find?.(h => h.name === 'LidarScan')
  diag.push(`PluginHeaders count: ${headers?.length ?? 'none'}`)
  diag.push(`LidarScan header: ${lidarHeader ? JSON.stringify(lidarHeader) : 'NOT FOUND'}`)

  console.log('[LiDAR] ── Detection Start ──')
  diag.forEach(d => console.log(`[LiDAR] ${d}`))

  const isNative = isCapacitorNative()
  diag.push(`isCapacitorNative(): ${isNative}`)

  // Try native plugin first (most reliable)
  if (isNative) {
    try {
      console.log('[LiDAR] Calling LidarScanNative.isLidarSupported()...')
      const result = await LidarScanNative.isLidarSupported()
      console.log('[LiDAR] Native result:', JSON.stringify(result))
      diag.push(`native result: ${JSON.stringify(result)}`)
      if (result?.supported) return true
    } catch (e) {
      console.warn('[LiDAR] Native plugin check failed:', e.message, e)
      diag.push(`native ERROR: ${e.message}`)
    }
  }

  // Fallback: detect known LiDAR models via user-agent
  // iPhone 12 Pro+, 13 Pro+, 14 Pro+, 15 Pro+, 16 Pro+, iPad Pro (2020+)
  const uaResult = isLidarDeviceByUA()
  diag.push(`UA fallback: ${uaResult}`)
  console.log('[LiDAR] ── Detection End ──')

  // Show on-screen diagnostic overlay (temporary – remove after debugging)
  showDiagOverlay(diag)

  return uaResult
}

// Temporary: shows diagnostic info as a visible overlay on the screen
function showDiagOverlay(lines) {
  try {
    const existing = document.getElementById('lidar-diag')
    if (existing) existing.remove()

    const el = document.createElement('div')
    el.id = 'lidar-diag'
    el.style.cssText = 'position:fixed;top:60px;left:10px;right:10px;z-index:99999;' +
      'background:rgba(0,0,0,0.85);color:#0f0;font:11px/1.4 monospace;' +
      'padding:12px;border-radius:8px;pointer-events:auto;max-height:40vh;overflow:auto;'
    el.innerHTML = '<b>[LiDAR Diagnostic]</b><br>' + lines.join('<br>')

    // Auto-dismiss after 15s on tap
    el.onclick = () => el.remove()
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 15000)
  } catch (_) { /* ignore DOM errors */ }
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
