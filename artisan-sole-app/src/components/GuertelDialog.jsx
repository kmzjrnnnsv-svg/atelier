/**
 * GuertelDialog.jsx — den Gürtel nachbestellen, ohne die Schuhe daneben.
 *
 * ── Die Ausgangslage ─────────────────────────────────────────────────────
 *
 * Im Konfigurator ist die Frage einfach: Leder und Farbe stehen fest, weil
 * der Schuh danebensteht. Hier steht nichts fest — der Kunde kommt Wochen
 * später über die Zubehörseite und will „den passenden Gürtel".
 *
 * Passend wozu? Das weiß seine Bestellung. Deshalb beginnt der Dialog nicht
 * mit einer Lederliste, sondern mit der Frage nach der Vorlage:
 *
 *   „Wie eines Ihrer Paare"  → die eigenen Bestellungen, jede als Karte mit
 *                              Leder, Farbe und, falls vorhanden, Metallton.
 *                              Danach sind nur noch Form und Länge offen.
 *
 *   „Frei zusammenstellen"   → alles wird gefragt.
 *
 * Wer noch nichts bestellt hat, sieht die erste Möglichkeit gar nicht. Eine
 * leere Liste anzubieten wäre eine Frage, auf die es keine Antwort gibt.
 */
import { useEffect, useState } from 'react'
import { X, ShoppingBag, Loader2 } from 'lucide-react'
import { apiFetch } from '../hooks/useApi'
import GuertelWahl from './GuertelWahl'
import { guertelSatz, eur } from '../lib/guertel'

const datum = (s) => {
  const d = new Date(String(s || '').replace(' ', 'T') + 'Z')
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
}

export default function GuertelDialog({ optionen, materialien = [], farben = [], angemeldet, onSchliessen, onUebernehmen }) {
  // null = wird geladen, [] = es gibt keine. Ein Gast hat von vornherein
  // keine — dafür braucht es keinen Ladevorgang und keinen Effekt, der den
  // Zustand gleich nach dem ersten Zeichnen wieder umsetzt.
  const [vorlagen, setVorlagen] = useState(angemeldet ? null : [])
  const [gewaehlteVorlage, setGewaehlteVorlage] = useState(null)
  const [freiGewaehlt, setFreiGewaehlt] = useState(false)
  const [cfg, setCfg] = useState(null)

  useEffect(() => {
    if (!angemeldet) return
    apiFetch('/api/orders/mine/guertel-vorlagen')
      .then(r => setVorlagen(Array.isArray(r) ? r : []))
      .catch(() => setVorlagen([]))
  }, [angemeldet])

  // Ohne eigene Bestellungen gibt es nichts zu übernehmen — dann ist die
  // freie Zusammenstellung nicht eine von zwei Möglichkeiten, sondern die
  // einzige, und der Kunde soll nicht erst eine leere Liste wegklicken.
  //
  // Abgeleitet statt in einem Effekt gesetzt: „keine Vorlagen" ist keine
  // Entscheidung des Kunden, sondern eine Tatsache über seine Bestellungen.
  const frei = freiGewaehlt || (Array.isArray(vorlagen) && vorlagen.length === 0)

  const preis = Number(optionen?.preis_einzeln) || 0
  const vorgabe = gewaehlteVorlage || {}
  const bereit = !!cfg

  const inDenKorb = () => {
    if (!cfg) return
    onUebernehmen({
      key: optionen.artikel.key,
      name: optionen.artikel.name,
      price: eur(preis),
      priceNum: preis,
      config_kind: 'belt',
      belt: cfg,
      beschreibung: guertelSatz(cfg, optionen.spielraum_cm),
    })
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-end lg:items-center justify-center p-0 lg:p-6"
      onClick={onSchliessen}>
      <div className="bg-white w-full lg:max-w-xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        <div className="sticky top-0 bg-white border-b border-black/[0.07] px-5 lg:px-7 py-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-[15px] font-light text-black">{optionen?.artikel?.name}</p>
            <p className="text-[12px] text-black/45 mt-0.5">{eur(preis)} · einzeln bestellt</p>
          </div>
          <button onClick={onSchliessen} className="text-black/35 hover:text-black bg-transparent border-0 p-1 shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 lg:px-7 py-5">
          {optionen?.artikel?.description && (
            <p className="text-[11px] text-black/45 font-light leading-relaxed mb-5 whitespace-pre-line">
              {optionen.artikel.description}
            </p>
          )}

          {vorlagen === null ? (
            <div className="flex items-center gap-2 text-[12px] text-black/40 py-6">
              <Loader2 size={14} className="animate-spin" /> Ihre Bestellungen werden gelesen …
            </div>
          ) : (
            <>
              {vorlagen.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-black/45 mb-2.5">
                    Passend zu einem Ihrer Paare
                  </p>
                  <div className="space-y-2">
                    {vorlagen.map(v => {
                      const aktiv = !frei && gewaehlteVorlage?.order_id === v.order_id
                      return (
                        <button key={v.order_id}
                          onClick={() => { setFreiGewaehlt(false); setGewaehlteVorlage(v) }}
                          className={`w-full flex items-center gap-3 border px-3 py-2.5 text-left transition-colors ${
                            aktiv ? 'border-black' : 'border-black/12 hover:border-black/30'}`}>
                          <span className="w-6 h-6 rounded-full border border-black/10 shrink-0"
                            style={{ backgroundColor: v.farbe_hex || '#eee' }} />
                          <span className="min-w-0">
                            <span className="block text-[12.5px] text-black/80 truncate">
                              {v.leder_label} in {v.farbe_name}
                            </span>
                            <span className="block text-[10.5px] text-black/40 truncate">
                              {v.schuh} · {datum(v.bestellt_am)}
                              {v.metall_label && ` · Metall ${v.metall_label}`}
                            </span>
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  <button onClick={() => { setFreiGewaehlt(true); setGewaehlteVorlage(null) }}
                    className={`mt-2 w-full border px-3 py-2.5 text-[12px] text-left transition-colors ${
                      frei ? 'border-black text-black' : 'border-black/12 text-black/55 hover:border-black/30'}`}>
                    Frei zusammenstellen — anderes Leder, andere Farbe
                  </button>
                </div>
              )}

              {(frei || gewaehlteVorlage) && (
                <GuertelWahl
                  optionen={optionen}
                  vorgabe={frei ? {} : vorgabe}
                  lederListe={materialien}
                  farbListe={farben}
                  woher={`wie Ihr ${vorgabe.schuh || 'Paar'}`}
                  onChange={setCfg}
                />
              )}
            </>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-black/[0.07] px-5 lg:px-7 py-4">
          <button onClick={inDenKorb} disabled={!bereit}
            className={`w-full h-11 flex items-center justify-center gap-2 text-[12px] uppercase tracking-[0.1em] border transition-colors ${
              bereit ? 'bg-black text-white border-black hover:bg-white hover:text-black'
                     : 'bg-white text-black/25 border-black/10 cursor-not-allowed'}`}>
            <ShoppingBag size={14} strokeWidth={1.6} />
            {bereit ? `In den Warenkorb · ${eur(preis)}` : 'Bitte alle Angaben wählen'}
          </button>
        </div>
      </div>
    </div>
  )
}
