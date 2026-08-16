/**
 * KontoWiederherstellen — der Weg zurück, wenn alle Geräte weg sind.
 *
 * Konten ohne Passwort haben nichts, was sich zurücksetzen ließe. In aller
 * Regel geht auch nichts verloren, weil der Schlüsselbund die Schlüssel
 * mitträgt — aber „in aller Regel" ist keine Antwort für den, bei dem es
 * schiefging.
 *
 * Zwei Wege führen hierher:
 *
 *   1. Selbstauskunft. Der Kunde nennt seine Adresse, die Bestellnummer und
 *      die Postleitzahl der Lieferung. Beides steht auf der Bestätigung, und
 *      die Bestellnummer ist der Verwendungszweck seiner Überweisung.
 *   2. Ein Link aus der Verwaltung, wenn das nicht reicht. Dann steht die
 *      Kennung schon in der Adresse und der erste Schritt entfällt.
 *
 * Absichtlich ohne E-Mail. Der Versand steht ohnehin still, und eine Adresse
 * beweist nur, dass man ein Postfach kontrolliert — die Bestellung beweist
 * mehr.
 */
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { ArrowLeft, ScanFace, ShieldCheck, AlertCircle, Check } from 'lucide-react'
import { startRegistration } from '@simplewebauthn/browser'
import { apiFetch } from '../hooks/useApi'
import { useAuth } from '../context/AuthContext'
import { HOME_PATH } from '../lib/homePath'

const passkeyMoeglich = typeof window !== 'undefined' && !!window.PublicKeyCredential

export default function KontoWiederherstellen() {
  const navigate = useNavigate()
  const [suche] = useSearchParams()
  const { loginWithTokenData } = useAuth()

  // Kennung aus der Adresse (Weg über die Verwaltung) oder aus der
  // Selbstauskunft. Liegt sie vor, beginnt es beim zweiten Schritt.
  const [kennung, setKennung] = useState(suche.get('token') || '')
  const [form, setForm] = useState({ email: '', order_ref: '', zip: '' })
  const [laeuft, setLaeuft] = useState(false)
  const [fehler, setFehler] = useState(null)
  const [fertig, setFertig] = useState(false)

  // Die Kennung gehört nicht in den Verlauf des Browsers. Wer den Link
  // weitergibt oder auf einem geteilten Rechner sitzt, verschenkt sonst einen
  // Zugang, der noch eine Stunde gilt.
  useEffect(() => {
    if (suche.get('token') && typeof window !== 'undefined') {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [suche])

  const ausweisen = async (e) => {
    e?.preventDefault?.()
    if (laeuft) return
    setLaeuft(true); setFehler(null)
    try {
      const d = await apiFetch('/api/auth/recover/start', {
        method: 'POST',
        body: JSON.stringify({
          email: form.email.trim(),
          order_ref: form.order_ref.trim(),
          zip: form.zip.trim(),
        }),
      })
      setKennung(d.token)
    } catch (err) {
      setFehler(err?.error || 'Das hat nicht geklappt. Bitte noch einmal versuchen.')
    } finally { setLaeuft(false) }
  }

  const neuesGeraet = async () => {
    if (laeuft) return
    setLaeuft(true); setFehler(null)
    try {
      const { challengeId, options } = await apiFetch('/api/auth/passkey/recover/options', {
        method: 'POST',
        body: JSON.stringify({ token: kennung }),
      })
      const antwort = await startRegistration({ optionsJSON: options })
      const daten = await apiFetch('/api/auth/passkey/recover/verify', {
        method: 'POST',
        body: JSON.stringify({ token: kennung, challengeId, response: antwort, label: 'Wiederhergestellt' }),
      })
      setFertig(true)
      loginWithTokenData(daten)
      setTimeout(() => navigate(HOME_PATH, { replace: true }), 1200)
    } catch (err) {
      const name = err?.name || ''
      if (name === 'NotAllowedError' || name === 'AbortError') setFehler(null)
      else setFehler(err?.error || err?.message || 'Das hat nicht geklappt. Bitte noch einmal versuchen.')
    } finally { setLaeuft(false) }
  }

  const feld = 'w-full h-12 border border-black/10 px-3 text-sm text-black/90 placeholder-black/20 focus:outline-none focus:border-black transition-colors'
  const marke = 'text-[9px] uppercase tracking-[0.15em] text-black/40 font-medium mb-1.5 block'

  return (
    <div className="flex flex-col min-h-[100dvh] bg-white">
      <div className="w-full flex items-center px-5 lg:px-10 py-4">
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="flex items-center gap-1.5 bg-transparent border-0 text-black/55 hover:text-black text-[12px] tracking-[0.15em] uppercase"
        >
          <ArrowLeft size={16} strokeWidth={1.4} /> Zur Anmeldung
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center px-5 max-w-md mx-auto w-full pb-10">
        <div className="text-center mb-8">
          <span className="font-brand text-xl text-black">ARTISAN SOLE</span>
        </div>

        {fertig ? (
          <div className="text-center">
            <Check size={30} strokeWidth={1.2} className="text-black mx-auto" />
            <h1 className="text-[22px] font-extralight tracking-tight mt-4">Ihr Zugang steht wieder.</h1>
            <p className="text-[13px] text-black/50 font-light mt-3 leading-relaxed">
              Dieses Gerät meldet Sie ab jetzt an. Einen Augenblick, wir bringen Sie weiter.
            </p>
          </div>
        ) : !kennung ? (
          <>
            <h1 className="text-[24px] font-extralight tracking-tight text-center">Kein Zugriff mehr?</h1>
            <p className="text-[13px] text-black/50 font-light mt-3 mb-7 leading-relaxed text-center">
              Kein Passwort heißt: Es gibt nichts zurückzusetzen. Wir erkennen Sie stattdessen
              an einer Ihrer Bestellungen, beide Angaben stehen auf Ihrer Bestellbestätigung,
              die Bestellnummer außerdem im Verwendungszweck Ihrer Überweisung.
            </p>

            {fehler && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 px-4 py-3 mb-4">
                <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-600 leading-relaxed">{fehler}</p>
              </div>
            )}

            <form onSubmit={ausweisen} className="space-y-4">
              <div>
                <label className={marke}>E-Mail Ihres Kontos</label>
                <input type="email" autoComplete="email" className={feld} value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })} placeholder="ihre@email.com" />
              </div>
              <div>
                <label className={marke}>Bestellnummer</label>
                <input className={feld} value={form.order_ref}
                  onChange={e => setForm({ ...form, order_ref: e.target.value })} placeholder="ATL-20260813-XXXXXX" />
              </div>
              <div>
                <label className={marke}>PLZ der Lieferadresse</label>
                <input inputMode="numeric" className={feld} value={form.zip}
                  onChange={e => setForm({ ...form, zip: e.target.value })} placeholder="60486" />
              </div>
              <button
                type="submit"
                disabled={laeuft || !form.email || !form.order_ref || !form.zip}
                style={{ height: '52px', letterSpacing: '0.18em' }}
                className="w-full flex items-center justify-center text-sm font-semibold uppercase bg-black text-white border-0 disabled:bg-black/10 disabled:text-black/40"
              >
                {laeuft ? <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin-custom" /> : 'Weiter'}
              </button>
            </form>

            <p className="text-[11px] text-black/40 font-light leading-relaxed mt-6 text-center">
              Sie haben noch nie bestellt oder kommen nicht weiter?{' '}
              <Link to="/help" className="text-black underline underline-offset-2">Schreiben Sie uns</Link>,
              wir schalten Ihnen den Zugang von Hand frei.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-[24px] font-extralight tracking-tight text-center">Dieses Gerät hinterlegen</h1>
            <p className="text-[13px] text-black/50 font-light mt-3 mb-7 leading-relaxed text-center">
              Wir haben Sie erkannt. Hinterlegen Sie jetzt dieses Gerät, danach melden Sie
              sich damit an, ohne Passwort.
            </p>

            {fehler && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 px-4 py-3 mb-4">
                <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-600 leading-relaxed">{fehler}</p>
              </div>
            )}

            {passkeyMoeglich ? (
              <>
                <button
                  onClick={neuesGeraet}
                  disabled={laeuft}
                  style={{ height: '52px', letterSpacing: '0.14em' }}
                  className="w-full flex items-center justify-center gap-2.5 text-sm font-semibold uppercase bg-black text-white border-0 disabled:opacity-40"
                >
                  {laeuft
                    ? <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin-custom" />
                    : <><ScanFace size={17} strokeWidth={1.6} /> Gerät hinterlegen</>}
                </button>
                <div className="flex items-start gap-2 mt-4">
                  <ShieldCheck size={13} strokeWidth={1.5} className="text-black/30 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-black/45 leading-relaxed">
                    Ihr Gerät fragt gleich nach Face ID, Fingerabdruck oder Ihrer Geräte-PIN.
                    Ihre bisherigen Geräte bleiben gültig, falls eines wieder auftaucht,
                    funktioniert es weiterhin. Alle offenen Sitzungen werden beendet.
                  </p>
                </div>
              </>
            ) : (
              <p className="text-[12px] text-black/50 font-light leading-relaxed text-center">
                Dieser Browser kann die Anmeldung ohne Passwort nicht. Bitte öffnen Sie diese
                Seite in Safari oder Chrome, haben Sie sie gerade aus einer anderen App
                heraus geöffnet, dort noch einmal im richtigen Browser.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
