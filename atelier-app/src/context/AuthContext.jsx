import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import { setNativeRefreshToken } from '../hooks/useApi'

const AuthContext = createContext(null)

// Access token lives only in memory — never localStorage
let _accessToken = null
// Refresh token — only used in Capacitor native mode (WKWebView can't do cross-origin cookies)
let _refreshToken = null

const isNativePlatform = Capacitor.isNativePlatform()
const RT_STORAGE_KEY = '__atelier_rt'

// Persist refresh token for native builds so force-close doesn't log out
function persistRefreshToken(token) {
  try {
    if (token) localStorage.setItem(RT_STORAGE_KEY, token)
    else localStorage.removeItem(RT_STORAGE_KEY)
  } catch { /* localStorage unavailable */ }
}

function loadPersistedRefreshToken() {
  try { return localStorage.getItem(RT_STORAGE_KEY) || null } catch { return null }
}

// Restore refresh token from storage on cold start (native only)
if (isNativePlatform) {
  _refreshToken = loadPersistedRefreshToken()
  if (_refreshToken) setNativeRefreshToken(_refreshToken)
}

export function getAccessToken() { return _accessToken }
export function setAccessToken(t) { _accessToken = t }

// In Capacitor iOS builds, relative URLs don't reach the backend.
const API_BASE = import.meta.env.VITE_API_URL ?? ''

function storeTokens(data) {
  _accessToken = data.accessToken
  if (isNativePlatform && data.refreshToken) {
    _refreshToken = data.refreshToken
    setNativeRefreshToken(data.refreshToken)
    persistRefreshToken(data.refreshToken)
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)        // { id, name, email, role }
  const [loading, setLoading] = useState(true)  // true while checking existing session
  const refreshTimer = useRef(null)
  const refreshPromise = useRef(null)

  // Schedule access token refresh 1 minute before expiry (14 min cycle)
  function scheduleRefresh() {
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
    refreshTimer.current = setTimeout(() => silentRefresh(), 14 * 60 * 1000)
  }

  const silentRefresh = useCallback(() => {
    // If a refresh is already in flight, return the SAME promise so all
    // callers (including StrictMode double-mount) wait for the real result.
    if (refreshPromise.current) return refreshPromise.current

    refreshPromise.current = (async () => {
      try {
        // In native mode: no cookie available, send refresh token in body
        const fetchOpts = {
          method: 'POST',
          credentials: 'include',
        }
        if (isNativePlatform && _refreshToken) {
          fetchOpts.headers = { 'Content-Type': 'application/json' }
          fetchOpts.body = JSON.stringify({ refreshToken: _refreshToken })
        }
        const res = await fetch(`${API_BASE}/api/auth/refresh`, fetchOpts)
        if (!res.ok) {
          // Don't call logout() — it would destroy the DB token permanently.
          storeTokens({ accessToken: null })
          _refreshToken = null
          setNativeRefreshToken(null)
          persistRefreshToken(null)
          setUser(null)
          if (refreshTimer.current) clearTimeout(refreshTimer.current)
          return
        }
        const data = await res.json()
        storeTokens(data)
        setUser(data.user)
        scheduleRefresh()
      } catch {
        // Network error — just clear local state, keep the cookie
        _accessToken = null
        setUser(null)
        if (refreshTimer.current) clearTimeout(refreshTimer.current)
      } finally {
        refreshPromise.current = null
      }
    })()

    return refreshPromise.current
  }, [])

  // On mount: try to restore session via httpOnly refresh cookie (or stored token in native)
  useEffect(() => {
    silentRefresh().finally(() => setLoading(false))
    return () => { if (refreshTimer.current) clearTimeout(refreshTimer.current) }
  }, [])

  async function register(name, email, password) {
    let res
    try {
      res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, password }),
      })
    } catch (networkErr) {
      throw { error: 'Server nicht erreichbar. Prüfe deine Verbindung.' }
    }
    let data
    try {
      data = await res.json()
    } catch {
      throw { error: `Server-Fehler (${res.status})` }
    }
    if (!res.ok) throw data
    storeTokens(data)
    setUser(data.user)
    scheduleRefresh()
    return data.user
  }

  async function login(email, password) {
    let res
    try {
      res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })
    } catch (networkErr) {
      throw { error: 'Server nicht erreichbar. Prüfe deine Verbindung.' }
    }
    let data
    try {
      data = await res.json()
    } catch {
      throw { error: `Server-Fehler (${res.status})` }
    }
    if (!res.ok) throw data
    storeTokens(data)
    setUser(data.user)
    scheduleRefresh()
    return data.user
  }

  function loginWithTokenData(data) {
    storeTokens(data)
    setUser(data.user)
    scheduleRefresh()
  }

  function logout() {
    const body = isNativePlatform && _refreshToken ? JSON.stringify({ refreshToken: _refreshToken }) : undefined
    const headers = body ? { 'Content-Type': 'application/json' } : undefined
    _accessToken = null
    _refreshToken = null
    setNativeRefreshToken(null)
    persistRefreshToken(null)
    setUser(null)
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
    fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include', headers, body }).catch(() => {})
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, silentRefresh, loginWithTokenData }}>
      {children}
    </AuthContext.Provider>
  )
}

const _authFallback = { user: null, loading: false, login: () => Promise.resolve(), logout: () => {}, register: () => Promise.resolve() }

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    if (import.meta.env.DEV) return _authFallback
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return ctx
}
