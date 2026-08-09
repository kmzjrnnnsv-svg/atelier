import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import { setNativeRefreshToken, refreshAccessToken } from '../hooks/useApi'

const AuthContext = createContext(null)

// Access token lives only in memory, never localStorage
let _accessToken = null
// Refresh token, only used in Capacitor native mode (WKWebView can't do cross-origin cookies)
let _refreshToken = null

const isNativePlatform = Capacitor.isNativePlatform()
const RT_STORAGE_KEY = '__artisansole_rt'

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
        // Bewusst über useApi statt mit eigenem fetch: Der Refresh-Token ist
        // einmalig, zwei gleichzeitige Erneuerungen entwerten sich gegenseitig.
        // Beim harten Neuladen lief hier eine Erneuerung, während ein Dutzend
        // Datenabrufe ohne Token in ihr 401 liefen und ein zweites Mal
        // erneuerten — die Sitzung war danach serverseitig weg, und jedes
        // Speichern scheiterte mit „No token provided". Mit dem gemeinsamen
        // Aufruf gibt es nur noch eine Erneuerung, alle warten auf dieselbe.
        const data = await refreshAccessToken().catch(() => null)
        if (!data) {
          // Kein logout(): das würde den Token in der Datenbank endgültig
          // löschen. Nur den lokalen Zustand räumen.
          storeTokens({ accessToken: null })
          _refreshToken = null
          setNativeRefreshToken(null)
          persistRefreshToken(null)
          setUser(null)
          if (refreshTimer.current) clearTimeout(refreshTimer.current)
          return
        }
        storeTokens(data)
        setUser(data.user)
        scheduleRefresh()
      } catch {
        // Network error, just clear local state, keep the cookie
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
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'ArtisanSole' },
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
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'ArtisanSole' },
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
    const headers = { 'X-Requested-With': 'ArtisanSole', ...(body ? { 'Content-Type': 'application/json' } : {}) }
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
