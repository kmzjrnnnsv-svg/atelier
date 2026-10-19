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
      setOk(antwort?.message || 'Bitte sieh in dein Postfach.')
      try { localStorage.setItem(EINGETRAGEN, '1') } catch { /* egal */ }
    } catch (err) {
      setFehler(err?.error || 'Das hat gerade nicht geklappt. Bitte versuch es später erneut.')
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
      {/* Ein ruhiger Schleier statt Weichzeichner: Der Laden dahinter bleibt
          lesbar, das Fenster steht davor, und nichts flimmert beim Öffnen.
          Das Fenster selbst im Grund und in der Schrift des Hauses, mit
          Text ab 14 px in voller Tinte. Vorher: 9 px gesperrte Versalien,
          Absätze in 12 px Grau, ein Knopf in 10 px. */}
      <div className="absolute inset-0 bg-[rgba(29,23,20,0.45)]" />
      <div
        onClick={e => e.stopPropagation()}
        className="haus relative w-full max-w-[460px] shadow-[0_24px_80px_rgba(29,23,20,0.35)]"
      >
        <div className="flex justify-end px-3 pt-3">
          <button
            onClick={schliessen}
            aria-label="Schließen"
            className="w-11 h-11 flex items-center justify-center c-leise hover:text-black bg-transparent border-0"
          >
            <X size={18} strokeWidth={1.4} />
          </button>
        </div>

        {ok ? (
          <div className="px-7 pb-8 sm:px-9 sm:pb-10">
            <Check size={22} strokeWidth={1.4} className="c-tinte mb-4" />
            <p className="t-lead c-tinte mb-3">
              Sieh bitte in dein Postfach.
            </p>
            <p className="t-text c-tinte">
              {ok} Erst nach deiner Bestätigung schicken wir dir den Gutschein.
              So kommt niemand ungefragt auf unsere Liste.
            </p>
          </div>
        ) : (
          <form onSubmit={absenden} className="px-7 pb-8 sm:px-9 sm:pb-10">
            <p className="t-kopf c-tinte">
              10 % auf dein erstes Paar
            </p>
            <p className="t-text c-tinte mt-4 mb-6">
              Trag dich in unseren Newsletter ein. Du bekommst eine E-Mail
              zur Bestätigung, danach deinen persönlichen Code, einlösbar beim
              Abschluss deiner Bestellung.
            </p>

            <label className="block">
              <span className="t-klein c-leise">Deine E-Mail-Adresse</span>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@beispiel.de"
                autoComplete="email"
                className="t-text c-tinte mt-1.5 w-full h-12 px-4 g-angebot border-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 placeholder:text-[#5B5148]/60"
              />
            </label>

            {/* Nicht vorangekreuzt, und der Wortlaut steht da, wo er gilt. */}
            <label className="flex items-start gap-3 mt-5 cursor-pointer">
              <input
                type="checkbox"
                checked={zugestimmt}
                onChange={e => setZugestimmt(e.target.checked)}
                className="mt-1 w-5 h-5 flex-shrink-0 accent-[#6B231D]"
              />
              <span className="t-klein c-tinte">
                Ich möchte den Newsletter per E-Mail erhalten und bin damit
                einverstanden, dass Artisan Sole mich dazu kontaktiert. Ich kann das
                jederzeit widerrufen, ein Klick in jeder Nachricht genügt. Es gilt die{' '}
                <Link to="/legal/datenschutz" className="underline underline-offset-4 hover:opacity-70" onClick={e => e.stopPropagation()}>
                  Datenschutzerklärung
                </Link>.
              </span>
            </label>

            {fehler && <p role="alert" className="t-klein text-[#9B1C1C] mt-3">{fehler}</p>}

            <button
              type="submit"
              disabled={!zugestimmt || laedt || !email.trim()}
              className="t-klein w-full h-12 mt-6 g-akzent border-0 flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {laedt && <Loader2 size={15} className="animate-spin" />}
              {laedt ? 'Einen Moment' : 'Gutschein sichern'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
