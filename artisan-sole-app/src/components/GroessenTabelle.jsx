/**
 * GroessenTabelle — kleines Fenster mit drei Registern zur Größenfrage.
 *
 * Gedacht für den, der seine Füße nicht messen will. Das ist die schlechtere
 * Wahl und wird auch so gesagt: Ein Leisten wird nach Länge UND Ballenumfang
 * ausgesucht, eine Größenzahl kennt nur die Länge. Wer sie angibt, bekommt die
 * Standardweite und muss mit dem leben, was daraus wird.
 *
 * Drei Register, weil drei verschiedene Fragen dahinterstecken:
 *   Unsere Größen — was bedeutet eine Größe bei uns, in Millimetern?
 *                   Aus der Leisten-Tabelle der Datenbank, nicht geschätzt.
 *   Umrechnung    — EU, UK, US, Japan nebeneinander.
 *   Marken        — warum dieselbe Zahl anderswo anders ausfällt.
 *
 * Als Portal an <body>: Ein Vorfahr des Konfigurators trägt eine
 * CSS-Transformation, und darunter bezieht sich `position: fixed` nicht mehr
 * auf das Fenster. Das Fenster erschien dann irgendwo weit unten auf der Seite.
 */
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Ruler, ArrowLeftRight, Tag, Info } from 'lucide-react'
import { apiFetch } from '../hooks/useApi'

/**
 * Fußlänge → gängige Größenbezeichnungen.
 *
 * Die Fußlänge in Millimetern ist der einzige feste Bezugspunkt; EU, UK und US
 * sind Rechengrößen, die je nach Haus um eine halbe bis ganze Größe abweichen.
 * Genau deshalb steht sie hier in der ersten Spalte und nicht am Rand.
 */
const UMRECHNUNG = [
  { mm: 240, eu: '38½', uk: '5½',  us: '6',   jp: '24,0' },
  { mm: 245, eu: '39',  uk: '6',   us: '6½',  jp: '24,5' },
  { mm: 250, eu: '40',  uk: '6½',  us: '7',   jp: '25,0' },
  { mm: 255, eu: '40½', uk: '7',   us: '7½',  jp: '25,5' },
  { mm: 260, eu: '41',  uk: '7½',  us: '8',   jp: '26,0' },
  { mm: 265, eu: '42',  uk: '8',   us: '8½',  jp: '26,5' },
  { mm: 270, eu: '42½', uk: '8½',  us: '9',   jp: '27,0' },
  { mm: 275, eu: '43',  uk: '9',   us: '9½',  jp: '27,5' },
  { mm: 280, eu: '44',  uk: '9½',  us: '10',  jp: '28,0' },
  { mm: 285, eu: '44½', uk: '10',  us: '10½', jp: '28,5' },
  { mm: 290, eu: '45',  uk: '10½', us: '11',  jp: '29,0' },
  { mm: 295, eu: '46',  uk: '11',  us: '11½', jp: '29,5' },
  { mm: 300, eu: '46½', uk: '11½', us: '12',  jp: '30,0' },
]

/**
 * Woran es liegt, dass dieselbe Zahl anderswo anders ausfällt.
 *
 * Bewusst über die Größensysteme und die Machart, nicht über einzelne Häuser
 * mit angeblich festen Zuschlägen: Solche Zahlen stimmen bestenfalls für ein
 * Modell und führen sonst in die Irre. Was hier steht, ist überprüfbar.
 */
const MARKEN = [
  {
    gruppe: 'Englische Rahmengenähte',
    system: 'UK',
    hinweis: 'Rechnen in UK-Größen. Zwischen UK und EU liegen je nach Umrechnung ein bis zwei halbe Größen — die häufigste Quelle für einen zu großen Schuh.',
  },
  {
    gruppe: 'Italienische Manufakturen',
    system: 'EU',
    hinweis: 'Rechnen in EU-Größen, fallen aber oft schmal und knapp aus. Bei kräftigem Vorfuß eher eine halbe Größe mehr.',
  },
  {
    gruppe: 'Amerikanische Klassiker',
    system: 'US',
    hinweis: 'US-Größen mit eigener Weitenskala (B bis EEE). Die Weite steht dort gleichberechtigt neben der Länge — wie bei uns.',
  },
  {
    gruppe: 'Sneaker',
    system: 'US / UK gemischt',
    hinweis: 'Fallen meist eine halbe bis ganze Größe größer aus als Rahmengenähte, weil sie mehr Zugabe brauchen. Eine Sneakergröße lässt sich nicht auf einen Anzugschuh übertragen.',
  },
]

const REGISTER = [
  { id: 'unsere',      label: 'Unsere Größen', icon: Ruler },
  { id: 'umrechnung',  label: 'Umrechnung',    icon: ArrowLeftRight },
  { id: 'marken',      label: 'Marken',        icon: Tag },
]

const zahl = (v) => v == null ? '—' : String(Math.round(v)).replace('.', ',')

export default function GroessenTabelle({ offen, onClose, lastKey = null }) {
  const [aktiv, setAktiv] = useState('unsere')
  const [chart, setChart] = useState(null)
  const [leisten, setLeisten] = useState(lastKey)

  useEffect(() => {
    if (!offen || chart) return
    apiFetch('/api/last-chart').then(setChart).catch(() => setChart([]))
  }, [offen, chart])

  // Mit der Esc-Taste schließen — ein Fenster ohne diesen Weg fühlt sich
  // festgehalten an.
  useEffect(() => {
    if (!offen) return
    const zu = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', zu)
    return () => window.removeEventListener('keydown', zu)
  }, [offen, onClose])

  if (!offen) return null

  const alleLeisten = [...new Set((chart || []).map(r => r.last_key))].sort()
  const gewaehlt = leisten && alleLeisten.includes(leisten) ? leisten : alleLeisten[0]

  // Je Leisten die Standardweite zeigen. Andere Weiten gibt es, aber sie sind
  // eine Antwort auf gemessene Füße — hier geht es um den Fall ohne Maße.
  const zeilen = (chart || [])
    .filter(r => r.last_key === gewaehlt && r.width === 'D')
    .sort((a, b) => a.foot_length_mm - b.foot_length_mm)

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-end lg:items-center justify-center bg-black/40 px-0 lg:px-5"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Größentabelle"
    >
      <div
        className="bg-white w-full lg:max-w-2xl max-h-[88dvh] flex flex-col"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'slideUp 0.24s ease-out both' }}
      >
        <div className="flex items-start justify-between px-5 pt-5 pb-3 border-b border-black/[0.07]">
          <div>
            <p className="text-[9px] text-black/30 uppercase" style={{ letterSpacing: '0.25em' }}>Größen</p>
            <h2 className="text-[16px] font-light text-black tracking-[0.08em] uppercase mt-0.5">Größentabelle</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center bg-transparent border-0 text-black/50 hover:text-black"
            aria-label="Schließen"
          >
            <X size={19} strokeWidth={1.3} />
          </button>
        </div>

        <div className="flex gap-px bg-black/[0.06] border-b border-black/[0.06]">
          {REGISTER.map(r => {
            const Icon = r.icon
            const an = r.id === aktiv
            return (
              <button
                key={r.id}
                onClick={() => setAktiv(r.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 border-0 transition-colors ${an ? 'bg-black text-white' : 'bg-white text-black/55 hover:bg-black/[0.02]'}`}
              >
                <Icon size={13} strokeWidth={1.5} />
                <span className="text-[10px] uppercase tracking-[0.12em]">{r.label}</span>
              </button>
            )
          })}
        </div>

        <div className="overflow-y-auto px-5 py-4 flex-1">
          {aktiv === 'unsere' && (
            <>
              <p className="text-[11px] text-black/50 font-light leading-relaxed mb-4">
                Was eine Größe bei uns bedeutet — in Millimetern, je Leisten. Die Werte
                stammen aus derselben Tabelle, mit der wir die Passform ermitteln.
              </p>

              {!chart ? (
                <p className="text-[12px] text-black/35">Wird geladen…</p>
              ) : alleLeisten.length === 0 ? (
                <p className="text-[12px] text-black/35">Derzeit keine Werte hinterlegt.</p>
              ) : (
                <>
                  <label className="block mb-4">
                    <span className="block text-[9px] text-black/35 uppercase tracking-[0.14em] mb-1.5">Leisten</span>
                    <select
                      value={gewaehlt}
                      onChange={e => setLeisten(e.target.value)}
                      className="w-full h-9 px-2.5 border border-black/15 text-[13px] bg-white outline-none focus:border-black/40"
                    >
                      {alleLeisten.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </label>

                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="text-[9px] uppercase tracking-[0.14em] text-black/35 border-b border-black/[0.07]">
                        <th className="text-left font-normal py-2">Größe</th>
                        <th className="text-right font-normal py-2">Fußlänge</th>
                        <th className="text-right font-normal py-2">Ballenumfang</th>
                      </tr>
                    </thead>
                    <tbody>
                      {zeilen.map(r => (
                        <tr key={r.id} className="border-b border-black/[0.04] last:border-0">
                          <td className="py-2 text-black/80">
                            {r.size_label}
                            <span className="text-black/30 ml-1.5 text-[10px]">{r.size_system}</span>
                          </td>
                          <td className="py-2 text-right tabular-nums text-black/60">{zahl(r.foot_length_mm)} mm</td>
                          <td className="py-2 text-right tabular-nums text-black/60">{zahl(r.ball_girth_mm)} mm</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-[10px] text-black/35 font-light mt-3">
                    Standardweite D. Andere Weiten fertigen wir, sie ergeben sich aber aus
                    gemessenen Füßen.
                  </p>
                </>
              )}
            </>
          )}

          {aktiv === 'umrechnung' && (
            <>
              <p className="text-[11px] text-black/50 font-light leading-relaxed mb-4">
                Die Fußlänge steht vorne, weil sie als Einzige feststeht. EU, UK und US
                sind Rechengrößen — sie sagen erst zusammen mit dem Haus etwas aus.
              </p>
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-[9px] uppercase tracking-[0.14em] text-black/35 border-b border-black/[0.07]">
                    <th className="text-left font-normal py-2">Fußlänge</th>
                    <th className="text-right font-normal py-2">EU</th>
                    <th className="text-right font-normal py-2">UK</th>
                    <th className="text-right font-normal py-2">US</th>
                    <th className="text-right font-normal py-2">JP / cm</th>
                  </tr>
                </thead>
                <tbody>
                  {UMRECHNUNG.map(r => (
                    <tr key={r.mm} className="border-b border-black/[0.04] last:border-0">
                      <td className="py-2 tabular-nums text-black/80">{r.mm} mm</td>
                      <td className="py-2 text-right tabular-nums text-black/60">{r.eu}</td>
                      <td className="py-2 text-right tabular-nums text-black/60">{r.uk}</td>
                      <td className="py-2 text-right tabular-nums text-black/60">{r.us}</td>
                      <td className="py-2 text-right tabular-nums text-black/60">{r.jp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {aktiv === 'marken' && (
            <>
              <p className="text-[11px] text-black/50 font-light leading-relaxed mb-4">
                Warum dieselbe Zahl anderswo anders ausfällt. Es liegt am
                Größensystem und an der Machart — nicht daran, dass jemand falsch misst.
              </p>
              <div className="space-y-4">
                {MARKEN.map(m => (
                  <div key={m.gruppe} className="border-b border-black/[0.05] pb-4 last:border-0 last:pb-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-[13px] text-black">{m.gruppe}</p>
                      <span className="text-[10px] uppercase tracking-[0.14em] text-black/35 shrink-0">{m.system}</span>
                    </div>
                    <p className="text-[11px] text-black/50 font-light leading-relaxed mt-1">{m.hinweis}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-black/35 font-light leading-relaxed mt-5">
                Angaben zur Orientierung. Auch innerhalb eines Hauses fällt nicht jeder
                Leisten gleich aus — deshalb messen wir lieber, als umzurechnen.
              </p>
            </>
          )}
        </div>

        <div className="flex items-start gap-2 px-5 py-3.5 border-t border-black/[0.07] bg-[#fafaf9]">
          <Info size={13} strokeWidth={1.5} className="text-black/35 mt-0.5 shrink-0" />
          <p className="text-[11px] text-black/50 font-light leading-relaxed">
            Mit einer Größenzahl allein bekommen Sie die Standardweite. Zwei Maße —
            Fußlänge und Ballenumfang — genügen uns für Leisten und Größe, und das
            Ergebnis sitzt spürbar besser.
          </p>
        </div>
      </div>
    </div>,
    document.body
  )
}
