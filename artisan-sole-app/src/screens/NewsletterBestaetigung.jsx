/**
 * NewsletterBestaetigung — was hinter dem Link aus der E-Mail liegt.
 *
 * Zwei Wege, eine Seite: bestätigen und abmelden. Beide brauchen keine
 * Anmeldung, beide sagen in einem Satz, was geschehen ist, und beide
 * vertragen einen zweiten Klick, ohne zu klagen — ein Link in einer E-Mail
 * wird geteilt, vorgeladen und doppelt angetippt.
 */
import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { Loader2, Check, X } from 'lucide-react'
import { apiFetch } from '../hooks/useApi'

export default function NewsletterBestaetigung() {
  const [params] = useSearchParams()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const abmelden = pathname.includes('abmelden')

  // Ein Link ohne Schlüssel ist schon beim ersten Zeichnen erledigt — das
  // gehört in den Anfangszustand, nicht in einen Effekt, der ein zweites Mal
  // zeichnen lässt.
  const token = params.get('token')
  const [zustand, setZustand] = useState(token ? 'laeuft' : 'fehler')  // laeuft | fertig | fehler
  const [antwort, setAntwort] = useState(null)
  const [fehler, setFehler]   = useState(token ? null : 'Dieser Link ist unvollständig.')
  const [kopiert, setKopiert] = useState(false)

  useEffect(() => {
    if (!token) return
    apiFetch(`/api/newsletter/${abmelden ? 'abmelden' : 'bestaetigen'}`, {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
      .then(a => {
        setAntwort(a); setZustand('fertig')
        // Den Code hier ablegen, damit die Kasse ihn von allein einsetzt.
        // Ein Gutschein, den man erst aus einer E-Mail abschreiben muss, wird
        // zur Hälfte nie eingelöst — und dann hat der Rabatt seinen Zweck
        // verfehlt, obwohl alles funktioniert hat.
        if (a?.code) { try { localStorage.setItem('as_gutschein', a.code) } catch { /* kein Speicher */ } }
      })
      .catch(e => { setFehler(e?.error || 'Das hat nicht geklappt.'); setZustand('fehler') })
  }, [abmelden, token])

  const code = antwort?.code

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-8 text-center">
      <p className="text-[11px] tracking-[0.3em] uppercase text-black/70 mb-12 font-light">Artisan Sole</p>

      {zustand === 'laeuft' && (
        <div className="flex items-center gap-2 text-black/40 text-[12px] font-light">
          <Loader2 size={14} className="animate-spin" /> Einen Moment …
        </div>
      )}

      {zustand === 'fehler' && (
        <>
          <div className="w-12 h-12 border border-black/15 flex items-center justify-center mb-6">
            <X size={18} strokeWidth={1.4} className="text-black/50" />
          </div>
          <h1 className="text-[24px] font-extralight text-black mb-3 tracking-tight">
            Das hat nicht geklappt
          </h1>
          <p className="text-[13px] text-black/45 font-light leading-[1.75] max-w-sm mb-8">{fehler}</p>
          <button
            onClick={() => navigate('/collection')}
            className="h-12 px-8 bg-black text-white text-[10px] tracking-[0.18em] uppercase font-light border-0"
          >
            Zur Kollektion
          </button>
        </>
      )}

      {zustand === 'fertig' && (
        <>
          <div className="w-12 h-12 border border-black/15 flex items-center justify-center mb-6">
            <Check size={18} strokeWidth={1.4} className="text-black/70" />
          </div>
          <h1 className="text-[24px] font-extralight text-black mb-3 tracking-tight">
            {abmelden ? 'Sie sind abgemeldet' : 'Danke, das war’s'}
          </h1>
          <p className="text-[13px] text-black/45 font-light leading-[1.75] max-w-sm mb-8">
            {abmelden
              ? 'Wir schreiben Ihnen nicht mehr. Ihre Adresse bleibt nur noch dort stehen, wo sie stehen muss, damit wir sie nicht versehentlich erneut anschreiben.'
              : antwort?.bereits
                ? 'Ihre Anmeldung war bereits bestätigt. Ihr Code steht unten, er gilt weiterhin.'
                : 'Ihre Anmeldung ist bestätigt. Hier ist Ihr Gutschein — er liegt zusätzlich in Ihrem Postfach.'}
          </p>

          {code && (
            <div className="border border-black/15 px-8 py-6 mb-6">
              <p className="text-[9px] text-black/30 uppercase tracking-[0.25em] font-light mb-2">
                {antwort.rabatt} % auf Ihr erstes Paar
              </p>
              <p className="text-[26px] font-light text-black tracking-[0.12em]">{code}</p>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(code).then(() => setKopiert(true)).catch(() => {})
                }}
                className="mt-3 text-[10px] tracking-[0.18em] uppercase font-light text-black/40 hover:text-black bg-transparent border-0"
              >
                {kopiert ? 'Kopiert' : 'Code kopieren'}
              </button>
            </div>
          )}

          <button
            onClick={() => navigate('/collection')}
            className="h-12 px-8 bg-black text-white text-[10px] tracking-[0.18em] uppercase font-light border-0"
          >
            Zur Kollektion
          </button>

          {!abmelden && (
            <p className="text-[11px] text-black/30 font-light mt-8 max-w-xs leading-[1.7]">
              Den Code geben Sie beim Abschluss der Bestellung im Feld
              „Gutscheincode" ein. Er ist einmal einlösbar und nur für Sie bestimmt.
            </p>
          )}
        </>
      )}

      <Link to="/legal/datenschutz" className="text-[10px] tracking-[0.18em] uppercase text-black/25 hover:text-black/60 no-underline mt-12">
        Datenschutz
      </Link>
    </div>
  )
}
