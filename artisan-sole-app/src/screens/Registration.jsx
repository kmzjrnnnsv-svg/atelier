/**
 * Registration — Konto anlegen ohne Passwort.
 *
 * Verlangt wurden bisher vier Felder: Name, Adresse, Passwort, Passwort noch
 * einmal. Dazu eine Stärkeanzeige, die niemandem hilft, und ein Geheimnis,
 * das sich der Kunde ausdenken, merken und irgendwann wieder zurücksetzen
 * muss — über eine Mail, die dieses Haus derzeit nicht verschicken kann.
 *
 * Jetzt sind es zwei Felder und ein Blick ins Gesicht. Der Schlüssel bleibt
 * auf dem Gerät und wird über den Schlüsselbund des Herstellers auf die
 * anderen Geräte des Kunden übertragen. Es gibt kein Passwort — und was nie
 * entsteht, kann weder vergessen noch abgefischt werden.
 *
 * ── Wo es nicht geht ──────────────────────────────────────────────────────
 *
 * Eingebettete Browser (der Instagram- oder Facebook-Browser) können WebAuthn
 * häufig nicht. Ein Fehlschlag sähe dort aus wie ein Fehler unserer Seite.
 * Deshalb wird vorher geprüft und gesagt, was zu tun ist — und für diesen
 * Fall bleibt der Weg über ein Passwort erreichbar, aber nicht sichtbar.
 * Ein Bestandskonto anzulegen ist besser als ein verlorener Kunde.
 *
 * Das Wort „Passkey" kommt in der Oberfläche bewusst nicht vor. Wer hier ein
 * Paar Schuhe für vierhundert Euro kauft, muss keine Fachbegriffe lernen;
 * „mit Face ID oder Fingerabdruck" sagt dasselbe und erklärt sich selbst.
 */
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { X, Eye, EyeOff, ArrowRight, AlertCircle, ScanFace, ShieldCheck } from 'lucide-react'
import { startRegistration } from '@simplewebauthn/browser'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../hooks/useApi'

/** Kann dieser Browser überhaupt Passkeys? */
const passkeyMoeglich = typeof window !== 'undefined' && !!window.PublicKeyCredential

export default function Registration() {
  const navigate = useNavigate()
  const { register, loginWithTokenData } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', password: '', passwordConfirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [showPwConfirm, setShowPwConfirm] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState(null)
  // Der Passwortweg ist der Notausgang für Browser ohne WebAuthn. Standardmäßig
  // zu, damit er nicht als gleichwertige Wahl erscheint.
  const [passwortWeg, setPasswortWeg] = useState(!passkeyMoeglich)

  const isEmailValid = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
  const passwordsMatch = form.password === form.passwordConfirm
  const basisOk = form.name.trim().length > 1 && isEmailValid(form.email) && agreeTerms
  const isFormValid = basisOk && form.password.length >= 8 && passwordsMatch

  const pwStrength = () => {
    if (!form.password) return 0
    if (form.password.length < 6) return 1
    if (form.password.length < 10) return 2
    return 3
  }

  /**
   * Registrierung mit Passkey: Aufgabe holen, Gerät fragen, Konto anlegen.
   * Am Ende ist der Kunde angemeldet — ohne zweiten Schritt.
   */
  const mitPasskey = async () => {
    if (!basisOk || loading) return
    setLoading(true); setApiError(null); setErrors({})
    try {
      const { challengeId, options } = await apiFetch('/api/auth/passkey/signup/options', {
        method: 'POST',
        body: JSON.stringify({ name: form.name.trim(), email: form.email.trim() }),
      })
      const antwort = await startRegistration({ optionsJSON: options })
      const daten = await apiFetch('/api/auth/passkey/signup/verify', {
        method: 'POST',
        body: JSON.stringify({ challengeId, response: antwort, label: 'Erstes Gerät' }),
      })
      loginWithTokenData(daten)
      navigate('/welcome', { replace: true })
    } catch (err) {
      // Abbruch durch den Nutzer ist kein Fehler — er hat den Dialog
      // weggetippt und weiß das selbst.
      const name = err?.name || ''
      if (name === 'NotAllowedError' || name === 'AbortError') {
        setApiError(null)
      } else if (err?.code === 'KONTO_VORHANDEN') {
        setErrors({ email: 'Diese E-Mail ist bereits registriert.' })
      } else {
        setApiError(err?.error || err?.message || 'Das hat nicht geklappt. Bitte noch einmal versuchen.')
      }
    } finally {
      setLoading(false)
    }
  }

  /** Der Notausgang: Konto mit Passwort, wie bisher. */
  const mitPasswort = async () => {
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
    <div className="flex flex-col min-h-[100dvh] bg-white relative">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0">
        <button className="w-8 h-8 flex items-center justify-center bg-transparent border-0" onClick={() => navigate('/login')}>
          <X size={20} strokeWidth={1.5} className="text-black/70" />
        </button>
        <span className="font-brand text-[15px] text-black">ARTISAN SOLE</span>
        <div className="w-8" />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">

      {/* Headline */}
      <div className="text-center mt-3 px-6">
        <h1 className="text-2xl text-black leading-tight uppercase tracking-[0.15em] font-semibold">Step into Perfection</h1>
        <p className="text-xs text-black/50 mt-1.5 leading-relaxed max-w-xs mx-auto" style={{ letterSpacing: '0.15em' }}>
          Crafting your digital silhouette for custom-made luxury footwear.
        </p>
      </div>

      {/* Form */}
      <div className="px-5 mt-4 space-y-3.5">
        {apiError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-2.5">
            <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-600">{apiError}</p>
          </div>
        )}

        <div>
          <label className="text-[9px] uppercase tracking-[0.15em] text-black/40 font-medium mb-1 block" style={{ letterSpacing: '0.15em' }}>Vollständiger Name</label>
          <input type="text" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Vor- und Nachname"
            autoComplete="name"
            className="w-full h-11 border border-black/10 px-3 text-sm text-black/90 placeholder-black/20 focus:outline-none focus:border-black transition-colors" />
        </div>

        <div>
          <label className="text-[9px] uppercase tracking-[0.15em] text-black/40 font-medium mb-1 block" style={{ letterSpacing: '0.15em' }}>E-Mail</label>
          <input type="email" value={form.email}
            onChange={(e) => { setForm({ ...form, email: e.target.value }); setErrors(er => ({ ...er, email: null })) }}
            onBlur={() => { if (form.email && !isEmailValid(form.email)) setErrors(er => ({ ...er, email: 'Ungültige E-Mail' })) }}
            placeholder="name@beispiel.de"
            autoComplete="email"
            className={`w-full h-11 border px-3 text-sm text-black/90 placeholder-black/20 focus:outline-none transition-colors ${errors.email ? 'border-red-400' : 'border-black/10 focus:border-black'}`} />
          {errors.email && (
            <p className="text-[10px] text-red-500 mt-1">{errors.email}{' '}
              {errors.email?.includes('bereits') && <Link to="/login" className="underline font-semibold text-red-600">Jetzt anmelden →</Link>}
            </p>
          )}
        </div>

        {/* Passwortfelder nur im Notausgang. Im Regelfall gibt es sie nicht —
            und damit auch nichts zu vergessen. */}
        {passwortWeg && (
          <>
            <div>
              <label className="text-[9px] uppercase tracking-[0.15em] text-black/40 font-medium mb-1 block" style={{ letterSpacing: '0.15em' }}>Passwort</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={form.password}
                  onChange={(e) => { setForm({ ...form, password: e.target.value }); setErrors(er => ({ ...er, password: null })) }}
                  placeholder="Min. 8 Zeichen"
                  autoComplete="new-password"
                  className={`w-full h-11 border px-3 pr-10 text-sm text-black/90 placeholder-black/20 focus:outline-none transition-colors ${errors.password ? 'border-red-400' : 'border-black/10 focus:border-black'}`} />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 bg-transparent border-0 p-0">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {form.password.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className={`h-1 flex-1 transition-all ${strength >= i ? strColors[strength] : 'bg-black/10'}`} />
                  ))}
                </div>
              )}
              {errors.password && <p className="text-[10px] text-red-500 mt-1">{errors.password}</p>}
            </div>

            <div>
              <label className="text-[9px] uppercase tracking-[0.15em] text-black/40 font-medium mb-1 block" style={{ letterSpacing: '0.15em' }}>Passwort bestätigen</label>
              <div className="relative">
                <input type={showPwConfirm ? 'text' : 'password'} value={form.passwordConfirm}
                  onChange={(e) => setForm({ ...form, passwordConfirm: e.target.value })}
                  placeholder="Passwort wiederholen"
                  autoComplete="new-password"
                  className={`w-full h-11 border px-3 pr-10 text-sm text-black/90 placeholder-black/20 focus:outline-none transition-colors ${
                    form.passwordConfirm && !passwordsMatch ? 'border-red-400' : 'border-black/10 focus:border-black'
                  }`} />
                <button type="button" onClick={() => setShowPwConfirm(!showPwConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 bg-transparent border-0 p-0">
                  {showPwConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {form.passwordConfirm && !passwordsMatch && (
                <p className="text-[10px] text-red-500 mt-1">Passwörter stimmen nicht überein</p>
              )}
            </div>
          </>
        )}

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={agreeTerms}
            onChange={e => setAgreeTerms(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-black flex-shrink-0"
          />
          <span className="text-[10px] text-black/50 leading-relaxed">
            Ich stimme den{' '}
            <Link to="/legal/agb" className="text-black underline font-semibold">AGB</Link>
            {' '}und der{' '}
            <Link to="/legal/datenschutz" className="text-black underline font-semibold">Datenschutzerklärung</Link>
            {' '}zu.
          </span>
        </label>

        {passwortWeg ? (
          <button
            onClick={mitPasswort}
            disabled={!isFormValid || loading}
            style={{ height: '48px', letterSpacing: '0.18em' }}
            className={`w-full flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-widest transition-all mt-2 ${
              isFormValid && !loading ? 'bg-black text-white' : 'bg-black/10 text-black/40 cursor-not-allowed'
            }`}
          >
            {loading
              ? <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin-custom" />
              : <><span>Konto anlegen</span><ArrowRight size={16} /></>
            }
          </button>
        ) : (
          <button
            onClick={mitPasskey}
            disabled={!basisOk || loading}
            style={{ height: '52px', letterSpacing: '0.14em' }}
            className={`w-full flex items-center justify-center gap-2.5 text-sm font-semibold uppercase transition-all mt-2 ${
              basisOk && !loading ? 'bg-black text-white' : 'bg-black/10 text-black/40 cursor-not-allowed'
            }`}
          >
            {loading
              ? <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin-custom" />
              : <><ScanFace size={17} strokeWidth={1.6} /><span>Konto anlegen</span></>
            }
          </button>
        )}

        {/* Was gleich passiert — vor dem Tippen, nicht danach. Ein
            Systemdialog, den man nicht erwartet hat, wird weggeklickt. */}
        {!passwortWeg && (
          <div className="flex items-start gap-2 pt-0.5">
            <ShieldCheck size={13} strokeWidth={1.5} className="text-black/30 mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-black/45 leading-relaxed">
              Ihr Gerät fragt gleich nach Face ID, Fingerabdruck oder Ihrer Geräte-PIN.
              Damit ist Ihr Konto geschützt — Sie brauchen kein Passwort und können
              keines vergessen.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center mt-4 pb-6 px-5 space-y-3">
        <p className="text-xs text-black/50">
          Sie haben bereits ein Konto?{' '}
          <Link to="/login" className="text-black font-semibold no-underline">Anmelden</Link>
        </p>

        {/* Notausgang. Klein und nachgeordnet: Er ist die schlechtere Wahl und
            existiert nur für Browser, die es nicht anders können. */}
        {!passwortWeg && (
          <button
            type="button"
            onClick={() => setPasswortWeg(true)}
            className="text-[10px] text-black/30 hover:text-black/60 underline underline-offset-4 bg-transparent border-0 p-0"
          >
            Gerät kann das nicht? Mit Passwort anlegen
          </button>
        )}
        {passwortWeg && passkeyMoeglich && (
          <button
            type="button"
            onClick={() => setPasswortWeg(false)}
            className="text-[10px] text-black/30 hover:text-black/60 underline underline-offset-4 bg-transparent border-0 p-0"
          >
            Doch ohne Passwort anlegen
          </button>
        )}
        {!passkeyMoeglich && (
          <p className="text-[10px] text-black/35 leading-relaxed max-w-xs mx-auto">
            Ihr Browser unterstützt die Anmeldung ohne Passwort nicht. In Safari oder
            Chrome geht es — falls Sie diese Seite gerade aus einer anderen App heraus
            geöffnet haben, öffnen Sie sie dort noch einmal.
          </p>
        )}
      </div>

      </div>{/* end scrollable */}
    </div>
  )
}
