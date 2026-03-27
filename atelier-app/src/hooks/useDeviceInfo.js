import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'

/**
 * Detects device type, OS, and capabilities from user agent + screen info.
 * Returns a stable object that updates on resize (tablet ↔ desktop breakpoint).
 */
export default function useDeviceInfo() {
  const [info, setInfo] = useState(() => detect())
  useEffect(() => {
    const update = () => setInfo(detect())
    window.addEventListener('resize', update)
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
  let type = 'desktop' // default
  if (isIPhone || (isAndroid && /Mobile/i.test(ua))) {
    type = 'smartphone'
  } else if (isIPad || (isAndroid && !/Mobile/i.test(ua))) {
    type = 'tablet'
  } else if (maxTouch > 0 && w < 1024) {
    type = 'tablet'
  } else if (maxTouch === 0 || w >= 1024) {
    type = 'desktop'
  }

  // ── LiDAR capability (heuristic) ──
  // iPhone 12 Pro+ and iPad Pro 2020+ have LiDAR
  // In browser we can only reliably detect iPad Pro; iPhone Pro needs native plugin
  const isIPadPro = platform === 'MacIntel' && maxTouch > 1
  const hasLidar = isIPadPro // conservative; FootScan uses native plugin for iPhones

  // ── Device label for display ──
  let label = 'Desktop'
  if (isIPhone) label = 'iPhone'
  else if (isIPad) label = 'iPad'
  else if (isAndroid && type === 'smartphone') label = 'Android Smartphone'
  else if (isAndroid && type === 'tablet') label = 'Android Tablet'
  else if (isMac) label = 'Mac'
  else if (isWindows) label = 'Windows PC'
  else if (isLinux) label = 'Linux PC'

  // ── Icon hint ──
  let icon = 'monitor' // lucide icon name
  if (type === 'smartphone') icon = 'smartphone'
  else if (type === 'tablet') icon = 'tablet'
  else icon = 'monitor'

  return {
    type,       // 'smartphone' | 'tablet' | 'desktop'
    os,         // 'ios' | 'android' | 'macos' | 'windows' | 'linux' | 'unknown'
    label,      // Human-readable: 'iPhone', 'iPad', 'Mac', etc.
    icon,       // Lucide icon name suggestion
    isNative,   // Running in Capacitor
    hasLidar,   // LiDAR heuristic (conservative)
    isIPhone,
    isIPad,
    isAndroid,
    isMac,
    isWindows,
    screenWidth: w,
  }
}

// Static version for non-React contexts
export const deviceInfo = detect()
