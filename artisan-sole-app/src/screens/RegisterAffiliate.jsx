/**
 * RegisterAffiliate — Affiliate-Konto aktivieren, ohne Passwort.
 *
 * Der Affiliate ist der Fall, in dem ein Passwort am wenigsten Sinn ergibt: Er
 * bekommt keine Mail von uns, die Einladung kommt als QR-Code, den er im Laden
 * vom Bildschirm abscannt. Ein Passwort wäre der einzige Schritt in dieser
 * Kette, der nicht am Gerät hängt — und das eine, was er später vergisst.
 *
 * Der Datensatz besteht bereits (die Verwaltung hat ihn mit der E-Mail
 * angelegt); hier trägt er seinen Namen ein und hinterlegt sein Gerät.
 *
 * Das Passwortfeld bleibt als Notausgang für Browser ohne WebAuthn — ein
 * Affiliate, der im falschen Browser landet, soll nicht vor der Tür stehen.
 */
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight, ScanFace, ShieldCheck } from 'lucide-react'
import { startRegistration } from '@simplewebauthn/browser'
import { useAuth } from '../context/AuthContext'

const passkeyMoeglich = typeof window !== 'undefined' && !!window.PublicKeyCredential

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
  const [passwortWeg, setPasswortWeg] = useState(!passkeyMoeglich)

  /** Gerät hinterlegen statt Passwort ausdenken. */
  const mitPasskey = async () => {
    if (name.trim().length < 2 || loading) return
    setLoading(true); setError(null)
    try {
      const hole = async (pfad, koerper) => {
        const r = await fetch(`${API_BASE}${pfad}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'ArtisanSole' },
          credentials: 'include',
          body: JSON.stringify(koerper),
        })
        const d = await r.json()
        if (!r.ok) throw d
        return d
      }
      const { challengeId, options } = await hole('/api/auth/passkey/affiliate/options', { token, name: name.trim() })
      const antwort = await startRegistration({ optionsJSON: options })
      const daten = await hole('/api/auth/passkey/affiliate/verify', {
        token, challengeId, response: antwort, label: 'Erstes Gerät',
      })
      loginWithTokenData(daten)
      navigate('/affiliate', { replace: true })
    } catch (err) {
      const n = err?.name || ''
      if (n === 'NotAllowedError' || n === 'AbortError') setError(null)
      else setError(err?.error || err?.message || 'Das hat nicht geklappt. Bitte noch einmal versuchen.')
    } finally { setLoading(false) }
  }

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
            Nennen Sie uns Ihren Namen und hinterlegen Sie dieses Gerät, danach
            melden Sie sich damit an, ohne Passwort. In Ihrem Bereich finden Sie
            Ihren Werbelink, Ihren QR-Code zum Auslegen und Ihre vermittelten Paare.
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
          {passwortWeg ? (
            <>
              <div>
                <label className={lbl}>Passwort</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    className={`${inp} pr-10`}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(null) }}
                    placeholder="Mind. 8 Zeichen, Zahl & Sonderzeichen"
                    autoComplete="new-password"
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
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={mitPasskey}
                disabled={name.trim().length < 2 || loading}
                className="w-full h-[52px] flex items-center justify-center gap-2.5 bg-black text-white border-0 disabled:opacity-30 transition-all"
                style={{ letterSpacing: '0.14em', textTransform: 'uppercase', fontSize: '12px' }}
              >
                {loading
                  ? <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin-custom" />
                  : <><ScanFace size={17} strokeWidth={1.6} /> Konto aktivieren</>}
              </button>
              <div className="flex items-start gap-2">
                <ShieldCheck size={13} strokeWidth={1.5} className="text-black/30 mt-0.5 flex-shrink-0" />
                <p className="text-[10px] text-black/45 leading-relaxed">
                  Ihr Gerät fragt gleich nach Face ID, Fingerabdruck oder Ihrer Geräte-PIN.
                  Sie brauchen kein Passwort und können keines vergessen.
                </p>
              </div>
            </>
          )}

          {/* Notausgang für Browser ohne WebAuthn. Nachgeordnet: Er ist die
              schlechtere Wahl und existiert nur, damit niemand vor der Tür
              steht, der den QR-Code aus der falschen App heraus geöffnet hat. */}
          {passkeyMoeglich && (
            <p className="text-center pt-1">
              <button
                type="button"
                onClick={() => setPasswortWeg(v => !v)}
                className="text-[10px] text-black/30 hover:text-black/60 underline underline-offset-4 bg-transparent border-0 p-0"
              >
                {passwortWeg ? 'Doch ohne Passwort' : 'Gerät kann das nicht? Mit Passwort aktivieren'}
              </button>
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
