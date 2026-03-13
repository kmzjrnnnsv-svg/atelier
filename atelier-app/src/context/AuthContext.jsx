import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'

const AuthContext = createContext(null)

// Access token lives only in memory — never localStorage
let _accessToken = null

export function getAccessToken() { return _accessToken }
export function setAccessToken(t) { _accessToken = t }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)        // { id, name, email, role }
  const [loading, setLoading] = useState(true)  // true while checking existing session
  const refreshTimer = useRef(null)

  // Schedule access token refresh 1 minute before expiry (14 min cycle)
  function scheduleRefresh() {
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
    refreshTimer.current = setTimeout(() => silentRefresh(), 14 * 60 * 1000)
  }

  const silentRefresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
      if (!res.ok) { logout(); return }
      const data = await res.json()
      setAccessToken(data.accessToken)
      setUser(data.user)
      scheduleRefresh()
    } catch {
      logout()
    }
  }, [])

  // On mount: try to restore session via httpOnly refresh cookie
  useEffect(() => {
    silentRefresh().finally(() => setLoading(false))
    return () => { if (refreshTimer.current) clearTimeout(refreshTimer.current) }
  }, [])

  async function register(name, email, password) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw data
    setAccessToken(data.accessToken)
    setUser(data.user)
    scheduleRefresh()
    return data.user
  }

  async function login(email, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw data
    setAccessToken(data.accessToken)
    setUser(data.user)
    scheduleRefresh()
    return data.user
  }

  function logout() {
    setAccessToken(null)
    setUser(null)
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {})
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, silentRefresh }}>
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
