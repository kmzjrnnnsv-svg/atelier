/**
 * NewsletterBanner — zehn Prozent gegen eine Adresse, mit dem nötigen Anstand.
 *
 * ── Drei Regeln, an die er sich hält ──────────────────────────────────────
 *
 * 1. Er kommt nicht sofort und nicht überall. Wer gerade zur Kasse geht oder
 *    seine Maße einträgt, wird nicht unterbrochen; wer eben erst angekommen
 *    ist, auch nicht.
 * 2. Das Kästchen ist leer. Eine vorangekreuzte Einwilligung ist keine
 *    (EuGH, „Planet49"), und der Wortlaut steht daneben, nicht hinter einem
 *    Link.
 * 3. Ein Nein hält. Wer schließt, sieht ihn drei Monate nicht wieder; wer
 *    sich einträgt, nie mehr.
 *
 * Die Adresse allein bringt noch nichts: Was danach passiert, entscheidet
 * das Postfach. Siehe routes/newsletter.js.
 */
import { useState, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { X, Loader2, Check } from 'lucide-react'
import { apiFetch } from '../hooks/useApi'
import { entscheidung } from '../lib/einwilligung'

const ZU        = 'as_newsletter_zu'        // bis wann geschlossen
const EINGETRAGEN = 'as_newsletter_ein'     // hat sich eingetragen
const RUHE_TAGE = 90
const WARTEN_MS = 20_000

// Wo niemand unterbrochen werden will.
const NICHT_HIER = ['/checkout', '/scan', '/cms', '/verwaltung', '/login', '/register',
                    '/passwort-neu', '/konto-wiederherstellen', '/newsletter', '/business', '/affiliate', '/vermittler']

export default function NewsletterBanner() {
  const { pathname } = useLocation()
  const [offen, setOffen]   = useState(false)
  const [email, setEmail]   = useState('')
  const [ok, setOk]         = useState(false)
  const [laedt, setLaedt]   = useState(false)
  const [fehler, setFehler] = useState(null)
  const [zugestimmt, setZugestimmt] = useState(false)

  const verboten = NICHT_HIER.some(p => pathname.startsWith(p))

  useEffect(() => {
    if (verboten || offen || ok) return
    try {
      if (localStorage.getItem(EINGETRAGEN)) return
      const bis = Number(localStorage.getItem(ZU) || 0)
      if (bis && Date.now() < bis) return
    } catch { return }   // ohne Speicher kein Wiedererkennen — dann lieber nichts

    const t = setTimeout(() => {
      // Nicht zwei Fenster übereinander: Der Hinweis zur Speicherung hat Vorrang.
      if (!entscheidung()) return
      setOffen(true)
    }, WARTEN_MS)
    return () => clearTimeout(t)
  }, [pathname, verboten, offen, ok])

  const schliessen = () => {
    setOffen(false)
    try { localStorage.setItem(ZU, String(Date.now() + RUHE_TAGE * 864e5)) } catch { /* egal */ }
  }

  // Escape schließt. Ein Fenster in der Mitte, das die Tastatur ignoriert,
  // fühlt sich an wie eines, das einen nicht gehen lassen will. Und solange
  // es steht, soll der Laden dahinter nicht wegscrollen.
  useEffect(() => {
    if (!offen) return
    const taste = (e) => { if (e.key === 'Escape') schliessen() }
    document.addEventListener('keydown', taste)
    const vorher = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', taste)
      document.body.style.overflow = vorher
    }
  }, [offen])

  const absenden = async (e) => {
    e.preventDefault()
    if (!zugestimmt || laedt) return
    setLaedt(true); setFehler(null)
    try {
      const antwort = await apiFetch('/api/newsletter/anmelden', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), quelle: `banner:${pathname}` }),
      })
      setOk(antwort?.message || 'Bitte sehen Sie in Ihr Postfach.')
      try { localStorage.setItem(EINGETRAGEN, '1') } catch { /* egal */ }
    } catch (err) {
      setFehler(err?.error || 'Das hat gerade nicht geklappt. Bitte versuchen Sie es später erneut.')
    } finally {
      setLaedt(false)
    }
  }

  if (!offen || verboten) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Newsletter mit zehn Prozent Willkommensgutschein"
      className="fixed inset-0 z-[880] flex items-center justify-center p-4"
      // Der Grund liegt vor dem Laden, nicht daneben: Wer ihn anklickt, meint
      // „weg damit". Ein Fenster in der Mitte, das sich nur über ein kleines
      // Kreuz schließen lässt, ist eine Falle, keine Einladung.
      onClick={schliessen}
    >
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" />
      <div
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-[420px] bg-white border border-black/10 shadow-[0_10px_60px_rgba(0,0,0,0.22)]"
      >
        <div className="flex items-start justify-between px-6 pt-5">
          <p className="text-[9px] text-black/30 uppercase tracking-[0.25em] font-light">
            {ok ? 'Fast geschafft' : 'Willkommen'}
          </p>
          <button
            onClick={schliessen}
            aria-label="Schließen"
            className="w-8 h-8 -mr-2 -mt-1 flex items-center justify-center text-black/25 hover:text-black bg-transparent border-0"
          >
            <X size={15} strokeWidth={1.4} />
          </button>
        </div>

        {ok ? (
          <div className="px-6 pb-6 pt-2">
            <div className="w-10 h-10 border border-black/15 flex items-center justify-center mb-4">
              <Check size={16} strokeWidth={1.4} className="text-black/70" />
            </div>
            <p className="text-[15px] font-extralight text-black leading-[1.4] mb-2">
              Sehen Sie bitte in Ihr Postfach.
            </p>
            <p className="text-[12px] text-black/45 font-light leading-[1.75]">
              {ok} Erst nach Ihrer Bestätigung schicken wir Ihnen den Gutschein —
              so kommt niemand ungefragt auf unsere Liste.
            </p>
          </div>
        ) : (
          <form onSubmit={absenden} className="px-6 pb-6 pt-2">
            <p className="text-[22px] font-extralight text-black leading-[1.2] tracking-tight">
              10 % auf Ihr erstes Paar
            </p>
            <p className="text-[12px] text-black/45 font-light leading-[1.75] mt-2 mb-4">
              Tragen Sie sich in unseren Newsletter ein. Sie bekommen eine E-Mail
              zur Bestätigung, danach Ihren persönlichen Code — einlösbar beim
              Abschluss Ihrer Bestellung.
            </p>

            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ihre@email.com"
              autoComplete="email"
              className="w-full h-11 px-3 border-b border-black/15 text-[13px] bg-transparent outline-none focus:border-black/50 font-light placeholder-black/20"
            />

            {/* Nicht vorangekreuzt, und der Wortlaut steht da, wo er gilt. */}
            <label className="flex items-start gap-2.5 mt-4 cursor-pointer">
              <input
                type="checkbox"
                checked={zugestimmt}
                onChange={e => setZugestimmt(e.target.checked)}
                className="mt-0.5 w-4 h-4 flex-shrink-0 accent-black"
              />
              <span className="text-[11px] text-black/45 font-light leading-[1.65]">
                Ich möchte den Newsletter per E-Mail erhalten und bin damit
                einverstanden, dass Artisan Sole mich dazu kontaktiert. Ich kann das
                jederzeit widerrufen, ein Klick in jeder Nachricht genügt. Es gilt die{' '}
                <Link to="/legal/datenschutz" className="underline hover:text-black" onClick={e => e.stopPropagation()}>
                  Datenschutzerklärung
                </Link>.
              </span>
            </label>

            {fehler && <p role="alert" className="text-[11px] text-red-600 mt-3 leading-relaxed">{fehler}</p>}

            <button
              type="submit"
              disabled={!zugestimmt || laedt || !email.trim()}
              className={`w-full h-12 mt-5 text-[10px] tracking-[0.18em] uppercase font-light border-0 flex items-center justify-center gap-2 transition-colors ${
                zugestimmt && email.trim() && !laedt
                  ? 'bg-black text-white'
                  : 'bg-black/15 text-white cursor-not-allowed'
              }`}
            >
              {laedt && <Loader2 size={13} className="animate-spin" />}
              {laedt ? 'Einen Moment' : 'Gutschein sichern'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
