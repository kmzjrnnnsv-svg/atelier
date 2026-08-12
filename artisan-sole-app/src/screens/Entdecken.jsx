/**
 * Entdecken — der Weg vom Aufsteller im Laden in den Konfigurator.
 *
 * Jemand steht in einem fremden Geschäft, hat einen unserer Schuhe in der Hand
 * und scannt den QR-Code daneben. Er hat wenig Zeit, eine Hand frei und keine
 * Geduld für eine Kachelübersicht. Deshalb vier Folien statt einer Startseite:
 * Wer wir sind, was das Handwerk ausmacht, warum die Passform zählt — und was
 * ihm dieser Laden mitgibt.
 *
 * Der Werbecode wird gemerkt, bevor die erste Folie erscheint. Wer abbricht und
 * abends wiederkommt, wird dem Laden trotzdem zugerechnet.
 *
 * Die Animationen sind bewusst zurückhaltend: Ein Aufblenden und ein kleiner
 * Weg nach oben, gestaffelt. Bei „prefers-reduced-motion" bleibt alles stehen —
 * wer Bewegung abgestellt hat, hat dafür einen Grund.
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowRight, ArrowLeft, Check } from 'lucide-react'
import { apiFetch } from '../hooks/useApi'
import { refAusUrl, refMerken, refLesen } from '../lib/affiliateCode'
import { nameMerken, nameLesen, nameSaeubern } from '../lib/besucherName'

const ZUGABE_NAMEN = {
  shoe_tree_cedar: 'Zedernholz-Schuhspanner',
  care_kit_leather: 'Lederpflege-Set',
  care_kit_suede: 'Wildlederpflege-Set',
  shoe_tree_black: 'Schuhspanner',
  boot_tree_cedar: 'Zedernholz-Stiefelspanner',
}

/** Anrede für die Folien nach der Begrüßung. */
const anrede = (name) => (name ? `${name}, ` : '')

export default function Entdecken() {
  const navigate = useNavigate()
  const { search } = useLocation()

  const [folie, setFolie] = useState(0)
  const [name, setName] = useState(() => nameLesen())
  const [eingabe, setEingabe] = useState(() => nameLesen())
  const [vorteil, setVorteil] = useState(null)   // { rabatt, deckel, gift }
  const [laden, setLaden] = useState('')          // Name des Geschäfts, falls bekannt

  // Der Code zuerst — noch vor der ersten Folie. Bricht jemand hier ab und
  // kommt später wieder, zählt der Laden trotzdem.
  useEffect(() => {
    const code = refAusUrl(search) || refLesen()
    if (!code) return
    refMerken(code)
    apiFetch(`/api/affiliates/validate/${encodeURIComponent(code)}`)
      .then(d => {
        if (!d?.valid) return
        setVorteil({
          rabatt: Number(d.customer_discount_pct) || 0,
          deckel: Number(d.discount_cap) || 0,
          gift: d.gift || null,
        })
        if (d.partner_name) setLaden(d.partner_name)
      })
      .catch(() => { /* ohne Vorteil geht es auch — dann endet es beim Knopf */ })
  }, [search])

  const weiter = useCallback(() => setFolie(f => Math.min(f + 1, 3)), [])
  const zurueck = useCallback(() => setFolie(f => Math.max(f - 1, 0)), [])

  const nameUebernehmen = (e) => {
    e?.preventDefault?.()
    setName(nameMerken(eingabe))
    weiter()
  }

  const inDenShop = () => navigate('/collection')

  const hatVorteil = !!(vorteil && (vorteil.rabatt > 0 || vorteil.gift))

  return (
    <div className="min-h-[100dvh] bg-white text-black flex flex-col">
      <style>{`
        @keyframes folieAuf { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }
        .folie > * { animation: folieAuf 520ms cubic-bezier(.22,.61,.36,1) both }
        .folie > *:nth-child(1) { animation-delay:  40ms }
        .folie > *:nth-child(2) { animation-delay: 140ms }
        .folie > *:nth-child(3) { animation-delay: 240ms }
        .folie > *:nth-child(4) { animation-delay: 340ms }
        .folie > *:nth-child(5) { animation-delay: 440ms }
        @media (prefers-reduced-motion: reduce) {
          .folie > * { animation: none }
        }
      `}</style>

      {/* Kopf: Marke und Fortschritt. Kein Zurück auf der ersten Folie — dort
          gibt es nichts, wohin man zurückkehren könnte. */}
      <header className="flex-shrink-0 flex items-center justify-between px-5 lg:px-10 h-14">
        <button
          onClick={zurueck}
          className={`bg-transparent border-0 p-1 -ml-1 text-black/40 hover:text-black ${folie === 0 ? 'invisible' : ''}`}
          aria-label="Eine Folie zurück"
        >
          <ArrowLeft size={18} strokeWidth={1.4} />
        </button>
        <span className="font-brand text-[13px] tracking-[0.3em] text-black/70">ARTISAN SOLE</span>
        <div className="flex items-center gap-1.5" aria-hidden>
          {[0, 1, 2, 3].map(i => (
            <span
              key={i}
              className="block h-px transition-all duration-500"
              style={{ width: i === folie ? 18 : 8, background: i <= folie ? '#111' : 'rgba(0,0,0,.18)' }}
            />
          ))}
        </div>
      </header>

      <main key={folie} className="folie flex-1 flex flex-col justify-center px-6 lg:px-10 max-w-xl mx-auto w-full pb-10">

        {/* ── 1 · Wer wir sind, und wie heißen Sie? ───────────────────────── */}
        {folie === 0 && (
          <>
            <p className="text-[10px] uppercase tracking-[0.3em] text-black/30">Schön, dass Sie da sind</p>
            <h1 className="text-[27px] lg:text-[34px] font-extralight leading-[1.15] tracking-tight mt-4">
              Wir sind Artisan Sole — und wir lassen die Seele des Handwerks wieder aufleben.
            </h1>
            <p className="text-[14px] text-black/50 font-light leading-relaxed mt-5">
              Das Paar, das Sie gerade in der Hand halten, ist kein Serienschuh. Wir nehmen uns
              dafür ein paar Sätze Zeit — und würden Sie dabei gern beim Namen nennen.
            </p>
            <form onSubmit={nameUebernehmen} className="mt-8">
              <label className="block text-[10px] uppercase tracking-[0.18em] text-black/40 mb-2">Ihr Vorname</label>
              <input
                value={eingabe}
                onChange={e => setEingabe(e.target.value)}
                autoFocus
                autoComplete="given-name"
                placeholder="z. B. Qasim"
                className="w-full border-0 border-b border-black/20 focus:border-black outline-none py-2.5 text-[19px] font-light bg-transparent transition-colors"
              />
              <p className="text-[10px] text-black/30 mt-2 leading-relaxed">
                Bleibt auf Ihrem Gerät, bis Sie den Tab schließen. Wir übertragen ihn nicht.
              </p>
            </form>
            <div className="flex items-center gap-5 mt-8">
              <button
                onClick={nameUebernehmen}
                disabled={!nameSaeubern(eingabe)}
                className="flex items-center gap-2.5 bg-black text-white border-0 px-7 py-4 disabled:opacity-25 transition-opacity"
                style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase' }}
              >
                Weiter <ArrowRight size={14} strokeWidth={1.6} />
              </button>
              <button
                onClick={() => { setName(''); weiter() }}
                className="bg-transparent border-0 p-0 text-[12px] text-black/35 hover:text-black/70 transition-colors"
              >
                Ohne Namen
              </button>
            </div>
          </>
        )}

        {/* ── 2 · Das Handwerk ───────────────────────────────────────────── */}
        {folie === 1 && (
          <>
            <p className="text-[10px] uppercase tracking-[0.3em] text-black/30">Made in Spain</p>
            <h2 className="text-[26px] lg:text-[32px] font-extralight leading-[1.15] tracking-tight mt-4">
              {name ? `${name}, dieses Paar gibt es noch nicht.` : 'Dieses Paar gibt es noch nicht.'}
            </h2>
            <p className="text-[14px] text-black/55 font-light leading-relaxed mt-5">
              Wir haben kein Lager, aus dem wir greifen. Jeder Schuh entsteht erst nach Ihrer
              Bestellung, von Hand, in einer Manufaktur in Spanien — in vier bis sechs Wochen.
            </p>
            <p className="text-[14px] text-black/55 font-light leading-relaxed mt-4">
              Rahmengenäht statt geklebt: Sohle und Schaft sind über einen Lederstreifen
              vernäht. Ist die Sohle in zehn Jahren durch, wird sie erneuert — der Schuh bleibt.
              Ein geklebter Schuh wäre an dieser Stelle Abfall.
            </p>
            <Knopf onClick={weiter} />
          </>
        )}

        {/* ── 3 · Warum die Passform zählt ───────────────────────────────── */}
        {folie === 2 && (
          <>
            <p className="text-[10px] uppercase tracking-[0.3em] text-black/30">Die Passform</p>
            <h2 className="text-[26px] lg:text-[32px] font-extralight leading-[1.15] tracking-tight mt-4">
              Ein Bett für den Fuß, kein Behälter.
            </h2>
            <p className="text-[14px] text-black/55 font-light leading-relaxed mt-5">
              {anrede(name)}Ihre Füße tragen Sie ein Leben lang. Ein zu enger Schuh drückt die
              Zehen dauerhaft in eine Stellung, die sie nicht wieder verlassen; ein zu weiter
              lässt den Fuß arbeiten und scheuert. Beides merkt man erst nach Jahren.
            </p>
            <p className="text-[14px] text-black/55 font-light leading-relaxed mt-4">
              Deshalb fragen wir nicht nach einer Größe, sondern nach Maßen: Länge, Ballenweite
              und Rist getrennt. Daraus wird der Leisten, auf dem Ihr Paar entsteht.
            </p>
            <Knopf onClick={weiter} />
          </>
        )}

        {/* ── 4 · Ihr Vorteil, dann in den Laden ─────────────────────────── */}
        {folie === 3 && (
          <>
            <p className="text-[10px] uppercase tracking-[0.3em] text-black/30">
              {laden ? `Ihr Vorteil bei ${laden}` : 'Ihr Vorteil'}
            </p>
            <h2 className="text-[26px] lg:text-[32px] font-extralight leading-[1.15] tracking-tight mt-4">
              {hatVorteil
                ? (name ? `${name}, das gilt für Ihr erstes Paar.` : 'Das gilt für Ihr erstes Paar.')
                : (name ? `${name}, sehen wir uns die Modelle an.` : 'Sehen wir uns die Modelle an.')}
            </h2>

            {hatVorteil && (
              <div className="mt-6 border border-black/12 divide-y divide-black/[0.08]">
                {vorteil.rabatt > 0 && (
                  <div className="flex items-start gap-3 p-4">
                    <Check size={15} strokeWidth={1.6} className="text-black/60 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[15px] text-black">
                        {String(vorteil.rabatt).replace('.', ',')} % auf Ihr erstes Paar
                      </p>
                      <p className="text-[11px] text-black/40 font-light mt-0.5">
                        Wird im Konfigurator abgezogen. Sie müssen nichts eingeben.
                        {vorteil.deckel > 0 && ` Höchstens € ${vorteil.deckel} je Paar.`}
                      </p>
                    </div>
                  </div>
                )}
                {vorteil.gift && (
                  <div className="flex items-start gap-3 p-4">
                    <Check size={15} strokeWidth={1.6} className="text-black/60 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[15px] text-black">
                        {ZUGABE_NAMEN[vorteil.gift] || 'Zugabe'} — kostenlos dazu
                      </p>
                      <p className="text-[11px] text-black/40 font-light mt-0.5">
                        Liegt Ihrem ersten Paar bei.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <p className="text-[13px] text-black/45 font-light leading-relaxed mt-6">
              Im Konfigurator wählen Sie Leder, Farbe, Sohle und Ausführung. Ihre Maße nehmen
              wir Schritt für Schritt mit Ihnen auf.
            </p>

            <button
              onClick={inDenShop}
              className="flex items-center justify-center gap-2.5 bg-black text-white border-0 w-full py-4 mt-7"
              style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase' }}
            >
              Kollektion ansehen <ArrowRight size={14} strokeWidth={1.6} />
            </button>
          </>
        )}
      </main>
    </div>
  )
}

/** Der immer gleiche Weiter-Knopf der Erzählfolien. */
function Knopf({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 bg-black text-white border-0 px-7 py-4 mt-9 self-start"
      style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase' }}
    >
      Weiter <ArrowRight size={14} strokeWidth={1.6} />
    </button>
  )
}
