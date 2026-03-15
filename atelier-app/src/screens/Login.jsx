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
        navigate('/collection', { replace: true })
      }
    } catch (err) {
      setError(err?.error || 'Login fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
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
          <h1 className="font-playfair text-3xl text-black leading-tight">Welcome Back</h1>
          <p className="text-xs text-gray-400 mt-2 leading-relaxed">
            Sign in to your personal atelier studio
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle size={15} className="text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          <div>
            <label className="text-[9px] uppercase tracking-[0.15em] text-gray-400 font-medium mb-1.5 block">Email Address</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => { setForm({ ...form, email: e.target.value }); setError(null) }}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="ihre@email.com"
              className="w-full h-12 border border-gray-200 rounded-lg px-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-900 transition-colors"
            />
          </div>

          <div>
            <label className="text-[9px] uppercase tracking-[0.15em] text-gray-400 font-medium mb-1.5 block">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => { setForm({ ...form, password: e.target.value }); setError(null) }}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="••••••••"
                className="w-full h-12 border border-gray-200 rounded-lg px-3 pr-10 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-900 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 bg-transparent border-0 p-0"
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!isValid || loading}
            style={{ height: '52px' }}
            className={`w-full rounded-lg flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-widest transition-all mt-2 ${
              isValid && !loading ? 'bg-black text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {loading
              ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin-custom" />
              : <><span>Sign In</span><ArrowRight size={16} /></>
            }
          </button>
        </div>
      </div>

      {/* Footer - pinned to bottom */}
      <div className="text-center py-8 flex-shrink-0">
        <p className="text-xs text-gray-500">
          Noch kein Account?{' '}
          <Link to="/register" className="text-black font-semibold no-underline">Registrieren</Link>
        </p>
      </div>
    </div>
  )
}
