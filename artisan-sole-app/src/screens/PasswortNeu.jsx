/**
 * PasswortNeu.jsx — beide Hälften des Zurücksetzens auf einer Seite.
 *
 * Ohne `?token=` fragt die Seite nach der Adresse und schickt die Nachricht
 * los. Mit Token nimmt sie das neue Passwort entgegen. Zwei Seiten dafür
 * wären zwei Wege, sich zu verlaufen — der Link aus der Mail landet ohnehin
 * hier, und wer ihn zu spät öffnet, findet auf derselben Seite die
 * Möglichkeit, einen neuen anzufordern.
 *
 * Die Antwort auf die Anforderung ist immer dieselbe, auch für Adressen ohne
 * Konto. Das ist keine Unhöflichkeit: Eine Seite, die „Diese Adresse kennen
 * wir nicht" sagt, ist ein Werkzeug, um Kundenlisten abzugleichen.
 */
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, MailCheck, KeyRound } from 'lucide-react'
import { apiFetch } from '../hooks/useApi'

export default function PasswortNeu() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [passwort, setPasswort] = useState('')
  const [zeigen, setZeigen] = useState(false)
  const [laeuft, setLaeuft] = useState(false)
  const [fehler, setFehler] = useState(null)
  const [gesendet, setGesendet] = useState(false)
  const [fertig, setFertig] = useState(false)

  // Dieselben Regeln wie im Server. Sie hier zu wiederholen erspart dem
  // Benutzer den Weg über eine Fehlermeldung.
  const passwortTaugt = passwort.length >= 8 && /[0-9]/.test(passwort) && /[^a-zA-Z0-9]/.test(passwort)

  const anfordern = async (e) => {
    e.preventDefault()
    setLaeuft(true); setFehler(null)
    try {
      await apiFetch('/api/auth/passwort-vergessen', {
        method: 'POST', body: JSON.stringify({ email: email.trim() }),
      })
      setGesendet(true)
    } catch (err) {
      setFehler(err.error || 'Das hat nicht geklappt. Bitte versuchen Sie es erneut.')
    } finally {
      setLaeuft(false)
    }
  }

  const setzen = async (e) => {
    e.preventDefault()
    setLaeuft(true); setFehler(null)
    try {
      await apiFetch('/api/auth/passwort-neu', {
        method: 'POST', body: JSON.stringify({ token, password: passwort }),
      })
      setFertig(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err) {
      setFehler(err.error || 'Das hat nicht geklappt.')
    } finally {
      setLaeuft(false)
    }
  }

  const rahmen = (kopf, inhalt) => (
    <div className="min-h-full bg-white flex flex-col">
      <div className="w-full max-w-[420px] mx-auto px-5 pt-4">
        <Link to="/login" className="w-10 h-10 -ml-2 flex items-center justify-center no-underline">
          <ArrowLeft size={18} strokeWidth={1.5} className="text-black" />
        </Link>
      </div>
      <div className="w-full max-w-[420px] mx-auto px-5 py-10 flex-1">
        <p className="text-[10px] uppercase tracking-[0.25em] text-black/30 mb-3">Artisan Sole</p>
        <h1 className="text-[26px] font-extralight text-black tracking-tight leading-tight mb-8">{kopf}</h1>
        {inhalt}
      </div>
    </div>
  )

  // ── Erledigt ─────────────────────────────────────────────────────────────
  if (fertig) {
    return rahmen('Passwort gesetzt', (
      <div>
        <KeyRound size={28} strokeWidth={0.9} className="text-black/20 mb-4" />
        <p className="text-[14px] text-black/60 font-light leading-relaxed">
          Ihr neues Passwort gilt. Alle offenen Sitzungen wurden beendet,
          falls jemand anderes an Ihrem Konto war, ist er jetzt draußen.
        </p>
        <Link
          to="/login"
          className="block text-center mt-8 py-4 bg-black text-white text-[12px] uppercase tracking-[0.18em] no-underline"
        >
          Jetzt anmelden
        </Link>
      </div>
    ))
  }

  // ── Nachricht ist unterwegs ──────────────────────────────────────────────
  if (gesendet) {
    return rahmen('Nachricht unterwegs', (
      <div>
        <MailCheck size={28} strokeWidth={0.9} className="text-black/20 mb-4" />
        <p className="text-[14px] text-black/60 font-light leading-relaxed">
          Wenn es zu dieser Adresse ein Konto gibt, ist eine Nachricht unterwegs.
          Der Link darin gilt eine Stunde und nur einmal.
        </p>
        <p className="text-[12px] text-black/35 font-light leading-relaxed mt-4">
          Nichts angekommen? Sehen Sie im Spam-Ordner nach. Steht dort auch
          nichts, wurde das Konto möglicherweise mit einer anderen Adresse
          angelegt.
        </p>
        <button
          onClick={() => { setGesendet(false); setEmail('') }}
          className="w-full mt-8 py-4 border border-black/15 bg-white text-[12px] uppercase tracking-[0.18em] text-black/60"
        >
          Andere Adresse versuchen
        </button>
      </div>
    ))
  }

  // ── Neues Passwort setzen ────────────────────────────────────────────────
  if (token) {
    return rahmen('Neues Passwort', (
      <form onSubmit={setzen} className="flex flex-col gap-5">
        <div>
          <label className="text-[9px] uppercase tracking-[0.15em] text-black/40 font-medium mb-1.5 block">
            Neues Passwort
          </label>
          <div className="relative">
            <input
              type={zeigen ? 'text' : 'password'}
              autoComplete="new-password"
              value={passwort}
              onChange={(e) => { setPasswort(e.target.value); setFehler(null) }}
              placeholder="••••••••"
              className="w-full h-12 border border-black/10 px-3 pr-10 text-sm text-black/90 placeholder-black/20 focus:outline-none focus:border-black transition-colors"
            />
            <button
              type="button" onClick={() => setZeigen(!zeigen)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 bg-transparent border-0 p-0"
            >
              {zeigen ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <p className={`text-[11px] font-light mt-2 ${passwort && !passwortTaugt ? 'text-amber-700' : 'text-black/30'}`}>
            Mindestens 8 Zeichen, davon eine Ziffer und ein Sonderzeichen.
          </p>
        </div>

        {fehler && (
          <div className="bg-red-50 border border-red-200 px-3 py-2.5">
            <p className="text-[12px] text-red-800 font-light">{fehler}</p>
            <Link to="/passwort-neu" className="text-[11px] text-red-900 underline underline-offset-4 mt-1 inline-block">
              Neuen Link anfordern
            </Link>
          </div>
        )}

        <button
          type="submit" disabled={!passwortTaugt || laeuft}
          style={{ height: '52px', letterSpacing: '0.18em' }}
          className="w-full text-sm font-semibold uppercase bg-black text-white border-0 disabled:opacity-30"
        >
          {laeuft ? 'Einen Moment …' : 'Passwort setzen'}
        </button>
      </form>
    ))
  }

  // ── Adresse abfragen ─────────────────────────────────────────────────────
  return rahmen('Passwort vergessen', (
    <form onSubmit={anfordern} className="flex flex-col gap-5">
      <p className="text-[13px] text-black/50 font-light leading-relaxed -mt-3">
        Geben Sie die Adresse an, mit der Sie Ihr Konto angelegt haben. Wir
        schicken Ihnen einen Link, mit dem Sie ein neues Passwort setzen.
      </p>

      <div>
        <label className="text-[9px] uppercase tracking-[0.15em] text-black/40 font-medium mb-1.5 block">
          E-Mail-Adresse
        </label>
        <input
          type="email" autoComplete="email" value={email}
          onChange={(e) => { setEmail(e.target.value); setFehler(null) }}
          placeholder="ihre@email.com"
          className="w-full h-12 border border-black/10 px-3 text-sm text-black/90 placeholder-black/20 focus:outline-none focus:border-black transition-colors"
        />
      </div>

      {fehler && <p className="text-[12px] text-red-700 font-light">{fehler}</p>}

      <button
        type="submit" disabled={!email.includes('@') || laeuft}
        style={{ height: '52px', letterSpacing: '0.18em' }}
        className="w-full text-sm font-semibold uppercase bg-black text-white border-0 disabled:opacity-30"
      >
        {laeuft ? 'Einen Moment …' : 'Link anfordern'}
      </button>

      {/* Wer sich mit Passkey angemeldet hat, hat gar kein Passwort — für den
          ist der andere Weg der richtige. */}
      <p className="text-center pt-2">
        <Link to="/konto-wiederherstellen" className="text-[11px] text-black/30 hover:text-black/60 underline underline-offset-4">
          Ohne Passwort angemeldet? Konto wiederherstellen
        </Link>
      </p>
    </form>
  ))
}
