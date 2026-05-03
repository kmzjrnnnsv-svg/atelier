import { Capacitor } from '@capacitor/core'
import { getAccessToken, setAccessToken } from '../context/AuthContext'

// In Capacitor iOS production builds, relative URLs don't reach the backend.
// VITE_API_URL should be set to the production server (e.g. https://artisansole.com).
// Empty string in dev — Vite proxy handles /api/* → localhost:3001.
const API_BASE = import.meta.env.VITE_API_URL ?? ''
const isNativePlatform = Capacitor.isNativePlatform()

// In-memory refresh token for native builds (mirrors AuthContext._refreshToken)
let _nativeRefreshToken = null
export function setNativeRefreshToken(t) { _nativeRefreshToken = t }

let isRefreshing = false
let refreshQueue = []

async function refreshAccessToken() {
  if (isRefreshing) {
    return new Promise((resolve, reject) => refreshQueue.push({ resolve, reject }))
  }
  isRefreshing = true
  try {
    const fetchOpts = { method: 'POST', credentials: 'include', headers: { 'X-Requested-With': 'ArtisanSole' } }
    if (isNativePlatform && _nativeRefreshToken) {
      fetchOpts.headers = { ...fetchOpts.headers, 'Content-Type': 'application/json' }
      fetchOpts.body = JSON.stringify({ refreshToken: _nativeRefreshToken })
    }
    const res = await fetch(`${API_BASE}/api/auth/refresh`, fetchOpts)
    if (!res.ok) throw new Error('refresh_failed')
    const data = await res.json()
    setAccessToken(data.accessToken)
    if (isNativePlatform && data.refreshToken) _nativeRefreshToken = data.refreshToken
    refreshQueue.forEach(p => p.resolve(data.accessToken))
    return data.accessToken
  } catch (err) {
    refreshQueue.forEach(p => p.reject(err))
    setAccessToken(null)
    _nativeRefreshToken = null
    throw err
  } finally {
    isRefreshing = false
    refreshQueue = []
  }
}

export async function apiFetch(url, options = {}) {
  const token = getAccessToken()
  const headers = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'ArtisanSole',
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  const fullUrl = `${API_BASE}${url}`
  let res = await fetch(fullUrl, { ...options, headers, credentials: 'include' })

  // Token expired — try refresh once
  if (res.status === 401) {
    try {
      const newToken = await refreshAccessToken()
      res = await fetch(fullUrl, {
        ...options,
        headers: { ...headers, Authorization: `Bearer ${newToken}` },
        credentials: 'include',
      })
    } catch {
      // Refresh failed — let the caller handle the 401. ProtectedRoute will
      // redirect logged-out users when they hit a guarded page; public pages
      // (Window-Shopping) just see the empty/fallback data via .catch().
      // No forced window.location redirect — that would block guest browsing.
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Unknown error' }))
    const errMsg = body.detail || body.error || body.message || `HTTP ${res.status}`
    const error = new Error(errMsg)
    error.status = res.status
    error.body = body
    error.code = body.code || null
    error.error = body.error || errMsg
    throw error
  }

  const text = await res.text()
  return text ? JSON.parse(text) : null
}
