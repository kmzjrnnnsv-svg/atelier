import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RegisterPromotion() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token')
  const { loginWithTokenData } = useAuth()
  const API_BASE = import.meta.env.VITE_API_URL ?? ''

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  if (!token) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-white/60 text-sm">Ungültiger Einladungslink.</p>
          <button onClick={() => navigate('/login')} className="mt-4 text-white/40 text-xs underline bg-transparent border-0">Zum Login</button>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/register-promotion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, name, password }),
      })
      const data = await res.json()
      if (!res.ok) throw data
      loginWithTokenData(data)
      navigate('/collection', { replace: true })
    } catch (err) {
      setError(err?.error || err?.message || 'Registrierung fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  const inp = 'w-full bg-transparent border border-white/15 px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-white/40 transition-colors'

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-[11px] font-bold text-white/90" style={{ letterSpacing: '0.35em' }}>ATELIER</p>
          <div className="mt-3 inline-block px-3 py-1 bg-amber-600/20">
            <p className="text-[9px] text-amber-400" style={{ letterSpacing: '0.2em', textTransform: 'uppercase' }}>Promotion-Zugang</p>
          </div>
          <p className="text-white/40 text-xs mt-4">Erstellen Sie Ihr exklusives Konto</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text" placeholder="Ihr Name" value={name} onChange={e => setName(e.target.value)}
            required minLength={2} className={inp}
          />
          <input
            type="password" placeholder="Passwort (min. 8 Zeichen)" value={password} onChange={e => setPassword(e.target.value)}
            required minLength={8} className={inp}
          />
          {error && <p className="text-red-400 text-xs text-center">{error}</p>}
          <button
            type="submit" disabled={loading || !name || password.length < 8}
            className="w-full py-3 bg-white text-black text-xs font-bold border-0 disabled:opacity-30 transition-opacity"
            style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}
          >
            {loading ? 'Wird erstellt…' : 'Konto erstellen'}
          </button>
        </form>
      </div>
    </div>
  )
}
