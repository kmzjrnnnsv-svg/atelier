import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight, AlertCircle, ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const isValid = form.email && form.password

  // Where the user wanted to go before being redirected to /login
  const redirectTo = location.state?.from || null

  const handleSubmit = async () => {
    if (!isValid || loading) return
    setLoading(true)
    setError(null)
    try {
      const user = await login(form.email, form.password)
      if (user.role === 'admin' || user.role === 'curator') {
        navigate('/cms', { replace: true })
      } else if (user.is_business) {
        navigate('/business/dashboard', { replace: true })
      } else if (redirectTo) {
        navigate(redirectTo, { replace: true })
      } else {
        navigate('/collection', { replace: true })
      }
    } catch (err) {
      setError(err?.error || 'Login fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-white">
      {/* Top bar, Zurück zum Shop (Window Shopping ohne Login).
          IMMER /collection: redirectTo kann eine geschützte Seite sein, die
          uns sofort wieder zu /login schickt. */}
      <div className="w-full flex items-center justify-between px-5 lg:px-10 py-4">
        <button
          type="button"
          onClick={() => navigate('/collection', { replace: true })}
          className="flex items-center gap-1.5 bg-transparent border-0 text-black/55 hover:text-black active:opacity-50 text-[12px] tracking-[0.15em] uppercase"
        >
          <ArrowLeft size={16} strokeWidth={1.4} />
          Zurück zum Shop
        </button>
        <span className="text-[10px] text-black/30 tracking-[0.2em] uppercase hidden sm:block">
          Window Shopping ohne Login
        </span>
      </div>

      {/* Top section - vertically centered */}
      <div className="flex-1 flex flex-col justify-center px-5">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="font-brand text-xl text-black">
            ARTISAN SOLE
          </span>
        </div>

        {/* Hero text */}
        <div className="text-center px-3 mb-8">
          <h1 className="text-3xl text-black leading-tight uppercase tracking-[0.15em] font-semibold">Welcome Back</h1>
          <p className="text-xs text-black/40 mt-2 leading-relaxed" style={{ letterSpacing: '0.15em' }}>
            Sign in to your personal studio
          </p>
        </div>

        {/* Form */}
        <form
          className="space-y-4"
          onSubmit={(e) => { e.preventDefault(); handleSubmit() }}
          noValidate
        >
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-4 py-3">
              <AlertCircle size={15} className="text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          <div>
            <label className="text-[9px] uppercase tracking-[0.15em] text-black/40 font-medium mb-1.5 block" style={{ letterSpacing: '0.15em' }}>Email Address</label>
            <input
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => { setForm({ ...form, email: e.target.value }); setError(null) }}
              placeholder="ihre@email.com"
              className="w-full h-12 border border-black/10 px-3 text-sm text-black/90 placeholder-black/20 focus:outline-none focus:border-black transition-colors"
            />
          </div>

          <div>
            <label className="text-[9px] uppercase tracking-[0.15em] text-black/40 font-medium mb-1.5 block" style={{ letterSpacing: '0.15em' }}>Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => { setForm({ ...form, password: e.target.value }); setError(null) }}
                placeholder="••••••••"
                className="w-full h-12 border border-black/10 px-3 pr-10 text-sm text-black/90 placeholder-black/20 focus:outline-none focus:border-black transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 bg-transparent border-0 p-0"
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={!isValid || loading}
            style={{ height: '52px', letterSpacing: '0.18em' }}
            className={`w-full flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-widest transition-all mt-2 ${
              isValid && !loading ? 'bg-black text-white' : 'bg-black/10 text-black/40 cursor-not-allowed'
            }`}
          >
            {loading
              ? <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin-custom" />
              : <><span>Sign In</span><ArrowRight size={16} /></>
            }
          </button>
        </form>
      </div>

      {/* Footer - pinned to bottom */}
      <div className="text-center py-8 flex-shrink-0 space-y-3">
        <p className="text-xs text-black/50">
          Noch kein Account?{' '}
          <Link to="/register" className="text-black font-semibold no-underline">Registrieren</Link>
        </p>
        <button
          type="button"
          onClick={() => navigate('/collection', { replace: true })}
          className="text-[11px] text-black/40 hover:text-black tracking-[0.2em] uppercase bg-transparent border-0"
        >
          Weiter ohne Anmeldung
        </button>
      </div>
    </div>
  )
}
