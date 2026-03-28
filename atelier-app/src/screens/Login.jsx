import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const isValid = form.email && form.password

  const handleSubmit = async () => {
    if (!isValid || loading) return
    setLoading(true)
    setError(null)
    try {
      const user = await login(form.email, form.password)
      if (user.role === 'admin' || user.role === 'curator') {
        navigate('/cms', { replace: true })
      } else {
        navigate('/foryou', { replace: true })
      }
    } catch (err) {
      setError(err?.error || 'Login fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-white">
      {/* Top section - vertically centered */}
      <div className="flex-1 flex flex-col justify-center px-5">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="font-playfair text-xl font-semibold tracking-[0.3em] uppercase text-black">
            ATELIER
          </span>
        </div>

        {/* Hero text */}
        <div className="text-center px-3 mb-8">
          <h1 className="text-3xl text-black leading-tight uppercase tracking-[0.15em] font-semibold">Welcome Back</h1>
          <p className="text-xs text-black/40 mt-2 leading-relaxed" style={{ letterSpacing: '0.15em' }}>
            Sign in to your personal atelier studio
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
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
              value={form.email}
              onChange={(e) => { setForm({ ...form, email: e.target.value }); setError(null) }}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="ihre@email.com"
              className="w-full h-12 border border-black/10 px-3 text-sm text-black/90 placeholder-black/20 focus:outline-none focus:border-black transition-colors"
            />
          </div>

          <div>
            <label className="text-[9px] uppercase tracking-[0.15em] text-black/40 font-medium mb-1.5 block" style={{ letterSpacing: '0.15em' }}>Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => { setForm({ ...form, password: e.target.value }); setError(null) }}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
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
            onClick={handleSubmit}
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
        </div>
      </div>

      {/* Footer - pinned to bottom */}
      <div className="text-center py-8 flex-shrink-0">
        <p className="text-xs text-black/50">
          Noch kein Account?{' '}
          <Link to="/register" className="text-black font-semibold no-underline">Registrieren</Link>
        </p>
      </div>
    </div>
  )
}
