import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'

/**
 * Detects device type, OS, and capabilities from user agent + screen info.
 * Async LiDAR detection via native plugin for iPhone Pro models.
 */
export default function useDeviceInfo() {
  const [info, setInfo] = useState(() => detect())
  useEffect(() => {
    const update = () => setInfo(prev => ({ ...detect(), hasLidar: prev.hasLidar, lidarChecked: prev.lidarChecked }))
    window.addEventListener('resize', update)
    // Async LiDAR check (native plugin or WebXR)
    checkLidar().then(hasLidar => {
      setInfo(prev => ({ ...prev, hasLidar, lidarChecked: true }))
    })
    return () => window.removeEventListener('resize', update)
  }, [])
  return info
}

function detect() {
  const ua = navigator.userAgent || ''
  const platform = navigator.platform || ''
  const maxTouch = navigator.maxTouchPoints || 0
  const w = window.innerWidth
  const isNative = Capacitor.isNativePlatform()

  // ── OS ──
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (platform === 'MacIntel' && maxTouch > 1)
  const isAndroid = /Android/i.test(ua)
  const isMac = /Macintosh|MacIntel/.test(ua) && maxTouch === 0
  const isWindows = /Windows/i.test(ua)
  const isLinux = /Linux/i.test(ua) && !isAndroid

  const os = isIOS ? 'ios' : isAndroid ? 'android' : isMac ? 'macos' : isWindows ? 'windows' : isLinux ? 'linux' : 'unknown'

  // ── Specific device ──
  const isIPhone = /iPhone/.test(ua)
  const isIPad = /iPad/.test(ua) || (platform === 'MacIntel' && maxTouch > 1 && !isIPhone)

  // ── Device type ──
  let type = 'desktop'
  if (isIPhone || (isAndroid && /Mobile/i.test(ua))) {
    type = 'smartphone'
  } else if (isIPad || (isAndroid && !/Mobile/i.test(ua))) {
    type = 'tablet'
  } else if (maxTouch > 0 && w < 1024) {
    type = 'tablet'
  } else if (maxTouch === 0 || w >= 1024) {
    type = 'desktop'
  }

  // ── LiDAR: sync heuristic (iPad Pro) ──
  const isIPadPro = platform === 'MacIntel' && maxTouch > 1
  const hasLidar = isIPadPro // updated async below for iPhones

  // ── Device label ──
  let label = 'Desktop'
  if (isIPhone) label = 'iPhone'
  else if (isIPad) label = 'iPad'
  else if (isAndroid && type === 'smartphone') label = 'Android Smartphone'
  else if (isAndroid && type === 'tablet') label = 'Android Tablet'
  else if (isMac) label = 'Mac'
  else if (isWindows) label = 'Windows PC'
  else if (isLinux) label = 'Linux PC'

  // ── Icon hint ──
  let icon = 'monitor'
  if (type === 'smartphone') icon = 'smartphone'
  else if (type === 'tablet') icon = 'tablet'

  return {
    type,       // 'smartphone' | 'tablet' | 'desktop'
    os,         // 'ios' | 'android' | 'macos' | 'windows' | 'linux' | 'unknown'
    label,      // 'iPhone', 'iPad', 'Mac', etc.
    icon,       // lucide icon name
    isNative,
    hasLidar,
    lidarChecked: false, // true once async check completes
    isIPhone,
    isIPad,
    isAndroid,
    isMac,
    isWindows,
    screenWidth: w,
  }
}

/**
 * Async LiDAR detection:
 * 1. Native Capacitor plugin (most reliable — detects iPhone 12 Pro+)
 * 2. iPad Pro heuristic (MacIntel + touch)
 * 3. WebXR depth sensing check (Android ARCore)
 */
async function checkLidar() {
  const ua = navigator.userAgent || ''
  const platform = navigator.platform || ''
  const maxTouch = navigator.maxTouchPoints || 0

  // iPad Pro with LiDAR (2020+)
  if (platform === 'MacIntel' && maxTouch > 1) return true

  // Native plugin check (iPhone Pro models)
  if (Capacitor.isNativePlatform()) {
    try {
      const { lidarAvailable } = await import('../plugins/lidarScan')
      return await lidarAvailable()
    } catch {
      // plugin not available
    }
  }

  // WebXR depth sensing (Android with ARCore)
  if (/Android/i.test(ua) && navigator.xr) {
    try {
      const supported = await navigator.xr.isSessionSupported('immersive-ar')
      if (supported) return true // ARCore depth sensing available
    } catch {
      // WebXR not available
    }
  }

  return false
}

// Static version for non-React contexts
export const deviceInfo = detect()
