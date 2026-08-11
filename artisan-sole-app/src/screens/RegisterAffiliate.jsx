/**
 * RegisterAffiliate — Affiliate-Konto aktivieren.
 *
 * Gegenstück zu RegisterBusiness: Der Datensatz besteht bereits, hier wird nur
 * das Passwort gesetzt. Bewusst eine eigene Seite und keine geteilte mit einem
 * Schalter — die beiden Einladungen sagen Unterschiedliches, und der Text ist
 * das halbe Formular.
 */
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function RegisterAffiliate() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token')
  const { loginWithTokenData } = useAuth()
  const API_BASE = import.meta.env.VITE_API_URL ?? ''

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  if (!token) {
    return (
      <div className="min-h-[100dvh] bg-white flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-black/60 text-sm">Ungültiger Einladungslink.</p>
          <button onClick={() => navigate('/login')} className="mt-4 text-black/40 text-xs underline bg-transparent border-0">Zum Login</button>
        </div>
      </div>
    )
  }

  const valid = name.trim().length >= 2 && password.length >= 8

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!valid || loading) return
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/register-affiliate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'ArtisanSole' },
        credentials: 'include',
        body: JSON.stringify({ token, name: name.trim(), password }),
      })
      const data = await res.json()
      if (!res.ok) throw data
      loginWithTokenData(data)
      navigate('/affiliate', { replace: true })
    } catch (err) {
      setError(err?.error || err?.errors?.[0]?.msg || 'Registrierung fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  const inp = 'w-full h-12 border border-black/15 px-3.5 text-[14px] bg-white outline-none focus:border-black/40 transition-colors font-light'
  const lbl = 'block text-[10px] text-black/40 uppercase tracking-[0.15em] mb-1.5 font-light'

  return (
    <div className="min-h-[100dvh] bg-white flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="font-brand text-xl text-black">ARTISAN SOLE</p>
          <div className="mt-3 inline-block px-3 py-1 bg-black/[0.06]">
            <p className="text-[9px] text-black/55 tracking-[0.25em] uppercase">Affiliate</p>
          </div>
          <p className="text-black/45 text-[13px] font-light mt-4 leading-relaxed">
            Legen Sie Ihr Passwort fest, um Ihr Affiliate-Konto zu aktivieren.
            Danach finden Sie dort Ihren Link, den QR-Code und Ihre vermittelten Paare.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div className="bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}
          <div>
            <label className={lbl}>Ihr Name</label>
            <input className={inp} value={name} onChange={e => { setName(e.target.value); setError(null) }} placeholder="Vor- und Nachname" />
          </div>
          <div>
            <label className={lbl}>Passwort</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                className={`${inp} pr-10`}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(null) }}
                placeholder="Mind. 8 Zeichen, Zahl & Sonderzeichen"
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 bg-transparent border-0 p-0">
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={!valid || loading}
            className="w-full h-12 flex items-center justify-center gap-2 bg-black text-white border-0 disabled:opacity-30 transition-all"
            style={{ letterSpacing: '0.18em', textTransform: 'uppercase', fontSize: '12px' }}
          >
            {loading ? 'Wird aktiviert …' : <><span>Konto aktivieren</span><ArrowRight size={16} /></>}
          </button>
        </form>
      </div>
    </div>
  )
}
