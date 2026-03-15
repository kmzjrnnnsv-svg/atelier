import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { X, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Registration() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', password: '', passwordConfirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [showPwConfirm, setShowPwConfirm] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState(null)

  const isEmailValid = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
  const passwordsMatch = form.password === form.passwordConfirm
  const isFormValid = form.name.length > 1 && isEmailValid(form.email) && form.password.length >= 8 && passwordsMatch && agreeTerms

  const pwStrength = () => {
    if (!form.password) return 0
    if (form.password.length < 6) return 1
    if (form.password.length < 10) return 2
    return 3
  }

  const handleSubmit = async () => {
    if (!isFormValid || loading) return
    setLoading(true)
    setApiError(null)
    try {
      await register(form.name, form.email, form.password)
      navigate('/welcome', { replace: true })
    } catch (err) {
      if (err?.error === 'Email already registered') {
        setErrors(e => ({ ...e, email: 'Diese E-Mail ist bereits registriert.' }))
      } else if (err?.errors) {
        const msgs = {}
        err.errors.forEach(e => {
          if (e.path === 'email') msgs.email = e.msg
          if (e.path === 'password') msgs.password = e.msg
        })
        setErrors(msgs)
      } else {
        setApiError(err?.error || 'Registrierung fehlgeschlagen')
      }
    } finally {
      setLoading(false)
    }
  }

  const strColors = ['', 'bg-red-500', 'bg-orange-400', 'bg-green-500']
  const strength = pwStrength()

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0">
        <button className="w-8 h-8 flex items-center justify-center bg-transparent border-0" onClick={() => navigate('/login')}>
          <X size={20} strokeWidth={1.5} className="text-gray-700" />
        </button>
        <span className="font-playfair text-lg font-semibold tracking-[0.25em] uppercase text-black">ATELIER</span>
        <div className="w-8" />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">

      {/* Headline */}
      <div className="text-center mt-3 px-6">
        <h1 className="font-playfair text-2xl italic text-black leading-tight">Step into Perfection</h1>
        <p className="text-xs text-gray-500 mt-1.5 leading-relaxed max-w-xs mx-auto">
          Crafting your digital silhouette for bespoke luxury footwear.
        </p>
      </div>

      {/* Form */}
      <div className="px-5 mt-4 space-y-3.5">
        {apiError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
            <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-600">{apiError}</p>
          </div>
        )}

        <div>
          <label className="text-[9px] uppercase tracking-[0.15em] text-gray-400 font-medium mb-1 block">Full Name</label>
          <input type="text" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="James Sterling"
            className="w-full h-11 border border-gray-200 rounded-lg px-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-900 transition-colors" />
        </div>

        <div>
          <label className="text-[9px] uppercase tracking-[0.15em] text-gray-400 font-medium mb-1 block">Email Address</label>
          <input type="email" value={form.email}
            onChange={(e) => { setForm({ ...form, email: e.target.value }); setErrors(er => ({ ...er, email: null })) }}
            onBlur={() => { if (form.email && !isEmailValid(form.email)) setErrors(er => ({ ...er, email: 'Ungültige E-Mail' })) }}
            placeholder="examplename@pinstripe.com"
            className={`w-full h-11 border rounded-lg px-3 text-sm text-gray-900 placeholder-gray-300 italic focus:outline-none transition-colors ${errors.email ? 'border-red-400' : 'border-gray-200 focus:border-gray-900'}`} />
          {errors.email && (
            <p className="text-[10px] text-red-500 mt-1">{errors.email}{' '}
              {errors.email?.includes('bereits') && <Link to="/login" className="underline font-semibold text-red-600">Jetzt einloggen →</Link>}
            </p>
          )}
        </div>

        <div>
          <label className="text-[9px] uppercase tracking-[0.15em] text-gray-400 font-medium mb-1 block">Password</label>
          <div className="relative">
            <input type={showPw ? 'text' : 'password'} value={form.password}
              onChange={(e) => { setForm({ ...form, password: e.target.value }); setErrors(er => ({ ...er, password: null })) }}
              placeholder="Min. 8 Zeichen"
              className={`w-full h-11 border rounded-lg px-3 pr-10 text-sm text-gray-900 placeholder-gray-300 focus:outline-none transition-colors ${errors.password ? 'border-red-400' : 'border-gray-200 focus:border-gray-900'}`} />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 bg-transparent border-0 p-0">
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {form.password.length > 0 && (
            <div className="flex gap-1 mt-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-all ${strength >= i ? strColors[strength] : 'bg-gray-200'}`} />
              ))}
            </div>
          )}
          {errors.password && <p className="text-[10px] text-red-500 mt-1">{errors.password}</p>}
        </div>

        <div>
          <label className="text-[9px] uppercase tracking-[0.15em] text-gray-400 font-medium mb-1 block">Passwort bestätigen</label>
          <div className="relative">
            <input type={showPwConfirm ? 'text' : 'password'} value={form.passwordConfirm}
              onChange={(e) => setForm({ ...form, passwordConfirm: e.target.value })}
              placeholder="Passwort wiederholen"
              className={`w-full h-11 border rounded-lg px-3 pr-10 text-sm text-gray-900 placeholder-gray-300 focus:outline-none transition-colors ${
                form.passwordConfirm && !passwordsMatch ? 'border-red-400' : 'border-gray-200 focus:border-gray-900'
              }`} />
            <button type="button" onClick={() => setShowPwConfirm(!showPwConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 bg-transparent border-0 p-0">
              {showPwConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {form.passwordConfirm && !passwordsMatch && (
            <p className="text-[10px] text-red-500 mt-1">Passwörter stimmen nicht überein</p>
          )}
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={agreeTerms}
            onChange={e => setAgreeTerms(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-black flex-shrink-0"
          />
          <span className="text-[10px] text-gray-500 leading-relaxed">
            Ich stimme den{' '}
            <Link to="/legal/agb" className="text-black underline font-semibold">AGB</Link>
            {' '}und der{' '}
            <Link to="/legal/datenschutz" className="text-black underline font-semibold">Datenschutzerklärung</Link>
            {' '}zu.
          </span>
        </label>

        <button
          onClick={handleSubmit}
          disabled={!isFormValid || loading}
          style={{ height: '48px' }}
          className={`w-full rounded-lg flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-widest transition-all mt-2 ${
            isFormValid && !loading ? 'bg-black text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {loading
            ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin-custom" />
            : <><span>CREATE ACCOUNT</span><ArrowRight size={16} /></>
          }
        </button>
      </div>

      {/* Footer */}
      <div className="text-center mt-4 pb-6 px-5 space-y-3">
        <p className="text-xs text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="text-black font-semibold no-underline">Log In</Link>
        </p>
      </div>

      </div>{/* end scrollable */}
    </div>
  )
}
