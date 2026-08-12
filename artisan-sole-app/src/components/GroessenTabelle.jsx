/**
 * GroessenTabelle — Größe wählen, wenn nicht gemessen werden soll.
 *
 * Vorher stand hier eine Tabelle mit einer Auswahlliste aller fünfzehn
 * Leisten. Wer sie öffnete, musste erst einen Leistennamen kennen, den es
 * außerhalb einer Manufaktur nirgends gibt, und bekam dann Zahlenkolonnen —
 * aber keine Möglichkeit, eine Größe zu wählen. Die Frage war „welche Größe
 * nehme ich?", die Antwort eine Maßtabelle.
 *
 * Jetzt sind es drei Schritte in Alltagssprache:
 *
 *   1. Wie breit ist Ihr Fuß?   Normal, breit, sehr breit — mit dem Satz
 *                               dazu, woran man es merkt.
 *   2. Welche Größe tragen Sie? Nur die Größen, die es für diesen Schuh
 *                               wirklich gibt.
 *   3. Das kommt dabei heraus.  Fußlänge und Ballenumfang in Millimetern,
 *                               dazu UK, US und Japan — und ein Knopf, der
 *                               die Größe übernimmt.
 *
 * Die Leistenwahl ist keine Frage mehr an den Kunden: Sie kommt aus dem
 * Schuh. Nur wenn zu einem Modell mehrere Formen zur Auswahl stehen, sind sie
 * als Knöpfe zu sehen — mit ihren Namen, nicht mit ihren Schlüsseln.
 *
 * Der Vergleich mit anderen Häusern bleibt bewusst bei Größensystem und
 * Machart. Feste Zuschläge je Marke stimmen bestenfalls für ein einziges
 * Modell; eine Zahl, die man nicht belegen kann, ist bei einem Schuh, der
 * eigens gefertigt wird, keine Hilfe, sondern ein Rückgabegrund.
 *
 * Als Portal an <body>: Ein Vorfahr des Konfigurators trägt eine
 * CSS-Transformation, und darunter bezieht sich `position: fixed` nicht mehr
 * auf das Fenster.
 */
import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X, Ruler, ArrowLeftRight, Info, Check } from 'lucide-react'
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

/** Die Zeile, deren Fußlänge der gesuchten am nächsten liegt. */
function umrechnungFuer(mm) {
  if (!Number.isFinite(mm)) return null
  return UMRECHNUNG.reduce((a, b) => (Math.abs(b.mm - mm) < Math.abs(a.mm - mm) ? b : a))
}

/**
 * Die Weiten in Alltagssprache.
 *
 * D, EE und EEE sind Werkstattbezeichnungen. Was sie bedeuten, weiß niemand,
 * der nicht in einer Manufaktur gearbeitet hat — der Hinweis darunter sagt
 * deshalb, woran man die eigene Weite merkt.
 */
const WEITEN = [
  {
    key: 'D',
    titel: 'Normal',
    kurz: 'Die meisten Füße',
    hinweis: 'Sie kaufen Schuhe von der Stange und es passt meistens.',
  },
  {
    key: 'EE',
    titel: 'Breit',
    kurz: 'Drückt am Ballen',
    hinweis: 'Neue Schuhe drücken seitlich am Fußballen, obwohl die Länge stimmt. Oft kaufen Sie deshalb eine Nummer größer.',
  },
  {
    key: 'EEE',
    titel: 'Sehr breit',
    kurz: 'Auch weite drücken',
    hinweis: 'Auch als weit ausgewiesene Schuhe sind Ihnen zu eng, oder Sie tragen üblicherweise Spezialweiten.',
  },
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
    hinweis: 'Rechnen in UK-Größen. Zwischen UK und EU liegen je nach Umrechnung ein bis zwei halbe Größen — die häufigste Quelle für einen zu großen Schuh. Ihre UK-Zahl finden Sie unten in der Tabelle wieder.',
  },
  {
    gruppe: 'Italienische Manufakturen',
    system: 'EU',
    hinweis: 'Rechnen in EU-Größen, fallen aber oft schmal und knapp aus. Wenn Sie dort eine halbe Nummer größer kaufen, wählen Sie hier trotzdem Ihre gemessene Größe — und lieber die Weite breit.',
  },
  {
    gruppe: 'Amerikanische Klassiker',
    system: 'US',
    hinweis: 'US-Größen mit eigener Weitenskala (B bis EEE). Die Weite steht dort gleichberechtigt neben der Länge — wie bei uns. Ihr Weitenbuchstabe lässt sich also direkt übernehmen.',
  },
  {
    gruppe: 'Sneaker',
    system: 'US / UK gemischt',
    hinweis: 'Fallen meist eine halbe bis ganze Größe größer aus als Rahmengenähte, weil sie mehr Zugabe brauchen. Eine Sneakergröße lässt sich nicht auf einen Anzugschuh übertragen — nehmen Sie hier eher die kleinere Zahl.',
  },
]

const REGISTER = [
  { id: 'waehlen',   label: 'Größe wählen', icon: Ruler },
  { id: 'vergleich', label: 'Vergleich',    icon: ArrowLeftRight },
]

const zahl = (v) => (v == null ? '—' : String(Math.round(v)).replace('.', ','))

/** Aus 'penny_loafer' wird 'Penny Loafer' — für den Fall ohne mitgelieferten Namen. */
const leistenName = (key) =>
  String(key || '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

/** Größen sind Text ('42.5'), sortiert werden muss aber nach Zahl. */
const alsZahl = (s) => parseFloat(String(s).replace(',', '.')) || 0

export default function GroessenTabelle({
  offen,
  onClose,
  lastKey = null,
  leisten = [],
  onUebernehmen = null,
}) {
  const [aktiv, setAktiv]   = useState('waehlen')
  const [chart, setChart]   = useState(null)
  // null bedeutet „der Schuh bestimmt die Form". Erst wenn jemand eine andere
  // anklickt, steht hier ein Schlüssel — so bleibt eine gewechselte Form des
  // Konfigurators wirksam, ohne dass ein Effekt sie nachträglich überschreibt.
  const [leisteWahl, setLeisteWahl] = useState(null)
  const [weite, setWeite]   = useState('D')
  const [groesse, setGroesse] = useState(null)
  const [uebernommen, setUebernommen] = useState(false)

  useEffect(() => {
    if (!offen || chart) return
    apiFetch('/api/last-size-chart').then(setChart).catch(() => setChart([]))
  }, [offen, chart])

  // Mit der Esc-Taste schließen — ein Fenster ohne diesen Weg fühlt sich
  // festgehalten an.
  useEffect(() => {
    if (!offen) return
    const zu = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', zu)
    return () => window.removeEventListener('keydown', zu)
  }, [offen, onClose])

  // Nur EU: Zwei Größensysteme nebeneinander zur Wahl zu stellen, wäre genau
  // die Verwirrung, die dieses Fenster auflösen soll. US steht im Ergebnis.
  const zeilenAlle = useMemo(
    () => (chart || []).filter(r => r.size_system === 'EU'),
    [chart]
  )

  // Welche Leisten überhaupt zur Wahl stehen. Ohne Angabe vom Schuh gibt es
  // keine Auswahlliste über alle fünfzehn — dann steht eine als Richtwert da.
  const auswahl = useMemo(() => {
    const vorhanden = new Set(zeilenAlle.map(r => r.last_key))
    const vomSchuh = (leisten || [])
      .filter(l => vorhanden.has(l.key))
      .map(l => ({ key: l.key, label: l.label || leistenName(l.key) }))
    if (vomSchuh.length) return vomSchuh
    if (lastKey && vorhanden.has(lastKey)) return [{ key: lastKey, label: leistenName(lastKey) }]
    const erste = [...vorhanden].sort()[0]
    return erste ? [{ key: erste, label: leistenName(erste) }] : []
  }, [zeilenAlle, leisten, lastKey])

  const gewaehlteLeiste =
    auswahl.find(l => l.key === (leisteWahl || lastKey)) || auswahl[0] || null

  // Welche Weiten es für diese Leiste gibt — nicht jede Form wird in jeder
  // Weite gebaut, und eine Weite anzubieten, die es nicht gibt, führt zu einer
  // leeren Größenliste ohne Erklärung.
  const weitenDa = useMemo(() => {
    const s = new Set(zeilenAlle.filter(r => r.last_key === gewaehlteLeiste?.key).map(r => r.width))
    return WEITEN.filter(w => s.has(w.key))
  }, [zeilenAlle, gewaehlteLeiste])

  const wirksameWeite = weitenDa.some(w => w.key === weite) ? weite : (weitenDa[0]?.key || 'D')

  const groessen = useMemo(
    () => zeilenAlle
      .filter(r => r.last_key === gewaehlteLeiste?.key && r.width === wirksameWeite)
      .sort((a, b) => alsZahl(a.size_label) - alsZahl(b.size_label)),
    [zeilenAlle, gewaehlteLeiste, wirksameWeite]
  )

  // Der Treffer wird in der aktuellen Liste gesucht, nicht aus einer
  // vorherigen Auswahl übernommen: Wer die Weite wechselt, sieht dadurch die
  // Werte dieser Weite — und nie die einer Zeile, die es nicht mehr gibt.
  const treffer = groessen.find(r => r.size_label === groesse) || null
  const um = treffer ? umrechnungFuer(treffer.foot_length_mm) : null

  if (!offen) return null

  const waehle = (fn) => (wert) => { fn(wert); setUebernommen(false) }

  const uebernehmen = () => {
    if (!treffer || !onUebernehmen) return
    onUebernehmen({
      last_key:    treffer.last_key,
      last_label:  gewaehlteLeiste?.label || leistenName(treffer.last_key),
      width:       treffer.width,
      size_system: treffer.size_system,
      size_label:  treffer.size_label,
      foot_length_mm: treffer.foot_length_mm,
      ball_girth_mm:  treffer.ball_girth_mm,
    })
    setUebernommen(true)
    setTimeout(onClose, 450)
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-end lg:items-center justify-center bg-black/40 px-0 lg:px-5"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Größe wählen"
    >
      <div
        className="bg-white w-full lg:max-w-2xl max-h-[88dvh] flex flex-col"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'slideUp 0.24s ease-out both' }}
      >
        <div className="flex items-start justify-between px-5 pt-5 pb-3 border-b border-black/[0.07]">
          <div>
            <p className="text-[9px] text-black/30 uppercase" style={{ letterSpacing: '0.25em' }}>Ohne Maße</p>
            <h2 className="text-[16px] font-light text-black tracking-[0.08em] uppercase mt-0.5">Größe wählen</h2>
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
          {aktiv === 'waehlen' && (
            !chart ? (
              <p className="text-[12px] text-black/35">Wird geladen…</p>
            ) : !gewaehlteLeiste ? (
              <p className="text-[12px] text-black/35">Derzeit sind keine Größen hinterlegt.</p>
            ) : (
              <>
                {/* Die Schuhform, nicht als Frage. Sie gehört zum Modell —
                    zur Wahl steht sie nur, wenn es dazu wirklich mehrere gibt. */}
                {auswahl.length > 1 ? (
                  <div className="mb-5">
                    <p className="text-[9px] text-black/35 uppercase tracking-[0.14em] mb-2">Schuhform</p>
                    <div className="flex flex-wrap gap-1.5">
                      {auswahl.map(l => (
                        <button
                          key={l.key}
                          onClick={() => waehle(setLeisteWahl)(l.key)}
                          className={`h-8 px-3 text-[12px] border transition-colors ${
                            l.key === gewaehlteLeiste.key
                              ? 'bg-black text-white border-black'
                              : 'bg-white text-black/60 border-black/15 hover:border-black/40'
                          }`}
                        >
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-black/40 font-light mb-5">
                    Für die Schuhform <span className="text-black/70">{gewaehlteLeiste.label}</span>.
                  </p>
                )}

                {/* Schritt 1 — Weite */}
                <p className="text-[9px] text-black/35 uppercase tracking-[0.14em] mb-2">
                  1 · Wie breit ist Ihr Fuß?
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 mb-2">
                  {weitenDa.map(w => {
                    const an = w.key === wirksameWeite
                    return (
                      <button
                        key={w.key}
                        onClick={() => waehle(setWeite)(w.key)}
                        className={`text-left p-3 border transition-colors ${
                          an ? 'bg-black text-white border-black' : 'bg-white border-black/15 hover:border-black/40'
                        }`}
                      >
                        <span className="block text-[13px]">{w.titel}</span>
                        <span className={`block text-[10px] mt-0.5 ${an ? 'text-white/60' : 'text-black/40'}`}>
                          {w.kurz}
                        </span>
                      </button>
                    )
                  })}
                </div>
                <p className="text-[10px] text-black/45 font-light leading-relaxed mb-6">
                  {WEITEN.find(w => w.key === wirksameWeite)?.hinweis}
                </p>

                {/* Schritt 2 — Größe */}
                <p className="text-[9px] text-black/35 uppercase tracking-[0.14em] mb-2">
                  2 · Welche Größe tragen Sie? (EU)
                </p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {groessen.map(r => {
                    const an = r.size_label === groesse
                    return (
                      <button
                        key={r.id}
                        onClick={() => waehle(setGroesse)(r.size_label)}
                        className={`w-[58px] h-9 text-[13px] tabular-nums border transition-colors ${
                          an ? 'bg-black text-white border-black' : 'bg-white text-black/70 border-black/15 hover:border-black/40'
                        }`}
                      >
                        {String(r.size_label).replace('.', ',')}
                      </button>
                    )
                  })}
                </div>
                {groessen.length === 0 && (
                  <p className="text-[11px] text-black/40 font-light mb-4">
                    Für diese Form und Weite sind noch keine Größen hinterlegt.
                  </p>
                )}

                {/* Schritt 3 — was dabei herauskommt */}
                {treffer && (
                  <div className="mt-5 border border-black/12 bg-[#fafaf9] p-4">
                    <p className="text-[9px] text-black/35 uppercase tracking-[0.14em] mb-2">3 · Ihre Größe</p>
                    <p className="text-[22px] font-extralight tracking-tight text-black">
                      EU {String(treffer.size_label).replace('.', ',')}
                      <span className="text-[13px] text-black/45 ml-2">
                        · Weite {WEITEN.find(w => w.key === treffer.width)?.titel.toLowerCase() || treffer.width}
                      </span>
                    </p>
                    <p className="text-[11px] text-black/50 font-light leading-relaxed mt-2">
                      Dafür bauen wir auf {zahl(treffer.foot_length_mm)} mm Fußlänge und
                      {' '}{zahl(treffer.ball_girth_mm)} mm Ballenumfang. Passt das ungefähr zu
                      Ihrem Fuß, sind Sie richtig.
                    </p>
                    {um && (
                      <p className="text-[11px] text-black/45 font-light mt-2">
                        Andernorts wäre das etwa UK {um.uk} · US {um.us} · Japan {um.jp} cm.
                      </p>
                    )}

                    {onUebernehmen && (
                      <button
                        onClick={uebernehmen}
                        className="w-full mt-4 py-3 bg-black text-white border-0 flex items-center justify-center gap-2"
                        style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase' }}
                      >
                        {uebernommen
                          ? <><Check size={13} strokeWidth={2} /> Übernommen</>
                          : 'Diese Größe übernehmen'}
                      </button>
                    )}
                  </div>
                )}
              </>
            )
          )}

          {aktiv === 'vergleich' && (
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
                  {UMRECHNUNG.map(r => {
                    const an = um && um.mm === r.mm
                    return (
                      <tr key={r.mm} className={`border-b border-black/[0.04] last:border-0 ${an ? 'bg-black/[0.04]' : ''}`}>
                        <td className="py-2 tabular-nums text-black/80">{r.mm} mm</td>
                        <td className="py-2 text-right tabular-nums text-black/60">{r.eu}</td>
                        <td className="py-2 text-right tabular-nums text-black/60">{r.uk}</td>
                        <td className="py-2 text-right tabular-nums text-black/60">{r.us}</td>
                        <td className="py-2 text-right tabular-nums text-black/60">{r.jp}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              <p className="text-[11px] text-black/50 font-light leading-relaxed mt-7 mb-4">
                Warum dieselbe Zahl anderswo anders ausfällt. Es liegt am Größensystem
                und an der Machart — nicht daran, dass jemand falsch misst.
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
            Eine Größenzahl kennt nur die Länge. Zwei Maße — Fußlänge und Ballenumfang —
            genügen uns für Leisten, Weite und Größe, und das Ergebnis sitzt spürbar
            besser. Bei einem Schuh, der eigens für Sie gebaut wird, lohnt sich das Maßband.
          </p>
        </div>
      </div>
    </div>,
    document.body
  )
}
