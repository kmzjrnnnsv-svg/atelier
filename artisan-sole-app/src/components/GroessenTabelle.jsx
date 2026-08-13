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
 *   1. Welche Weite brauchen Sie? Normal, breit, sehr breit — mit dem Satz
 *                               dazu, woran man es merkt, und dem
 *                               Ballenumfang in Millimetern daneben.
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
 * Der zweite Reiter beantwortet die andere Frage: „Und was bin ich bei
 * Crockett & Jones?" Er nimmt die Fußlänge — aus der gewählten Größe oder von
 * Hand eingetippt — und rechnet sie in UK, US, EU und Mondopoint um, nach den
 * veröffentlichten Regeln der jeweiligen Systeme (siehe lib/groessenSysteme.js).
 * Abgeschriebene Marken-Tabellen stehen hier bewusst nicht: Sie stammen fast
 * nie vom Hersteller, widersprechen einander, und eine falsche halbe Größe ist
 * bei einem eigens gefertigten Schuh ein Rückgabegrund.
 *
 * Als Portal an <body>: Ein Vorfahr des Konfigurators trägt eine
 * CSS-Transformation, und darunter bezieht sich `position: fixed` nicht mehr
 * auf das Fenster.
 */
import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X, Ruler, ArrowLeftRight, Info, Check } from 'lucide-react'
import { apiFetch } from '../hooks/useApi'
import { umrechnen, spanneText, HAEUSER } from '../lib/groessenSysteme'

// Die Umrechnung liegt in lib/groessenSysteme.js: gerechnet nach den
// veröffentlichten Regeln (Gerstenkorn, Brannock, Pariser Stich, Mondopoint)
// statt aus fremden Tabellen abgeschrieben. Warum, steht dort ausführlich.

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
  // Fußlänge im Vergleichsteil. Leer heißt „die der gewählten Größe" — so
  // muss niemand abtippen, was nebenan schon steht, kann aber jederzeit eine
  // eigene Zahl eingeben, ohne vorher eine Größe zu wählen.
  const [laenge, setLaenge] = useState('')

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

  /**
   * Der Ballenumfang einer Weite, in der gewählten Größe.
   *
   * Solange keine Größe gewählt ist, in der mittleren der angebotenen — so
   * steht schon vor der Größenwahl eine Hausnummer da, statt eines leeren
   * Knopfes. Ein Zentimeter Unterschied über die Größenreihe ändert an der
   * Entscheidung „normal oder breit" ohnehin nichts.
   */
  const umfangFuer = (w) => {
    const reihe = zeilenAlle
      .filter(r => r.last_key === gewaehlteLeiste?.key && r.width === w)
      .sort((a, b) => alsZahl(a.size_label) - alsZahl(b.size_label))
    if (!reihe.length) return null
    const genau = groesse && reihe.find(r => r.size_label === groesse)
    return (genau || reihe[Math.floor(reihe.length / 2)]).ball_girth_mm
  }

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
  const um = treffer ? umrechnen(treffer.foot_length_mm) : null

  // Der Vergleich rechnet mit der eingetippten Länge, sonst mit der der
  // gewählten Größe.
  const eigeneLaenge = parseFloat(String(laenge).replace(',', '.'))
  const vergleich = Number.isFinite(eigeneLaenge) && eigeneLaenge > 0
    ? umrechnen(eigeneLaenge)
    : um

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
                <p className="text-[9px] text-black/35 uppercase tracking-[0.14em] mb-0.5">
                  1 · Welche Weite brauchen Sie?
                </p>
                <p className="text-[10px] text-black/35 font-light mb-2">
                  Die Zahl ist der Ballenumfang, nicht die Breite.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 mb-2">
                  {weitenDa.map(w => {
                    const an = w.key === wirksameWeite
                    // Der Ballenumfang dieser Weite in der bereits gewählten
                    // Größe — oder, solange keine gewählt ist, in der
                    // mittleren. Ohne eine Zahl bliebe „normal oder breit?"
                    // eine Geschmacksfrage.
                    const mm = umfangFuer(w.key)
                    return (
                      <button
                        key={w.key}
                        onClick={() => waehle(setWeite)(w.key)}
                        className={`text-left p-3 border transition-colors ${
                          an ? 'bg-black text-white border-black' : 'bg-white border-black/15 hover:border-black/40'
                        }`}
                      >
                        <span className="block text-[13px]">{w.titel}</span>
                        {mm != null && (
                          <span className={`block text-[12px] tabular-nums mt-0.5 ${an ? 'text-white' : 'text-black/70'}`}>
                            {Math.round(mm)} mm
                            <span className={`text-[9px] ml-1 tracking-wide ${an ? 'text-white/55' : 'text-black/35'}`}>Umfang</span>
                          </span>
                        )}
                        <span className={`block text-[10px] mt-0.5 ${an ? 'text-white/60' : 'text-black/40'}`}>
                          {w.kurz}
                        </span>
                      </button>
                    )
                  })}
                </div>
                <p className="text-[10px] text-black/50 font-light leading-relaxed mb-1.5">
                  Der Ballenumfang ist einmal um den Fuß herum gemessen, an der breitesten
                  Stelle, dort wo der große Zeh ansetzt — nicht die Breite quer über den Fuß.
                  Kein Maßband nötig: Schnürsenkel um den Ballen legen, die Stelle markieren,
                  wo er sich trifft, und an ein Lineal halten.
                </p>
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
                        Andernorts wäre das UK {spanneText(um.uk)} · US {spanneText(um.us)} ·
                        {' '}Japan {String(um.jp).replace('.', ',')} cm.
                        {' '}<button
                          type="button"
                          onClick={() => setAktiv('vergleich')}
                          className="underline underline-offset-2 bg-transparent border-0 p-0 text-[11px] text-black/45 hover:text-black"
                        >
                          Zum Vergleich
                        </button>
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
                Was Ihre Fußlänge anderswo für eine Nummer ergibt. Gerechnet nach den
                Regeln, nach denen die Häuser ihre Größen vergeben — nicht aus fremden
                Tabellen abgeschrieben.
              </p>

              {/* Die Fußlänge ist der Bezugspunkt. Ohne gewählte Größe lässt sie
                  sich hier direkt eingeben: Wer nur wissen will, was seine
                  25,9 cm anderswo bedeuten, soll nicht erst eine Größe wählen
                  müssen, die er noch nicht kennt. */}
              <label className="block mb-5">
                <span className="block text-[9px] text-black/35 uppercase tracking-[0.14em] mb-1.5">
                  Ihre Fußlänge
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number" inputMode="decimal" step="1" min="180" max="360"
                    value={laenge}
                    onChange={e => setLaenge(e.target.value)}
                    placeholder={treffer ? String(Math.round(treffer.foot_length_mm)) : 'z. B. 265'}
                    className="w-28 h-9 px-2.5 border border-black/15 text-[14px] tabular-nums bg-white outline-none focus:border-black/40"
                  />
                  <span className="text-[12px] text-black/40">mm</span>
                  {treffer && (
                    <button
                      type="button"
                      onClick={() => setLaenge('')}
                      className="text-[10px] text-black/35 hover:text-black underline underline-offset-2 bg-transparent border-0 p-0 ml-1"
                    >
                      aus Ihrer Größe übernehmen
                    </button>
                  )}
                </div>
              </label>

              {vergleich ? (
                <>
                  <table className="w-full text-[12px] mb-2">
                    <tbody>
                      {[
                        ['Japan / Mondopoint', `${String(vergleich.jp).replace('.', ',')} cm`, 'Die Größe ist die Fußlänge. Nichts umzurechnen.'],
                        ['UK', spanneText(vergleich.uk), 'Gerstenkorn: eine Größe ist ein Drittel Zoll.'],
                        ['US Herren', spanneText(vergleich.us), 'Brannock: dieselbe Schrittweite, genau eine Nummer über UK.'],
                        ['EU', spanneText(vergleich.eu, n => String(n)), 'Pariser Stich, gemessen am Leisten — deshalb die Spanne.'],
                      ].map(([sys, wert, erklaerung]) => (
                        <tr key={sys} className="border-b border-black/[0.05] last:border-0">
                          <td className="py-2.5 pr-3 align-top">
                            <span className="text-[12px] text-black/75">{sys}</span>
                            <span className="block text-[10px] text-black/35 font-light leading-relaxed mt-0.5">{erklaerung}</span>
                          </td>
                          <td className="py-2.5 text-right align-top tabular-nums text-[15px] text-black whitespace-nowrap">{wert}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <p className="text-[10px] text-black/40 font-light leading-relaxed mb-7">
                    UK und US stehen als halbe Spanne da, und das mit Absicht. Die reine
                    Rechnung ergibt die untere Zahl; die englischen Häuser führen dieselbe
                    Fußlänge in ihren eigenen Tabellen durchgehend eine halbe Größe höher,
                    weil dort schon etwas Luft eingerechnet ist. Eine der beiden Zahlen
                    auszuwählen hieße, die andere zu unterschlagen.
                  </p>

                  {/* Wer wie nummeriert. Der Weitenteil ist der nützlichste:
                      Dieselben Buchstaben bedeuten je nach Haus anderes. */}
                  <p className="text-[11px] text-black/50 font-light leading-relaxed mb-4">
                    Und so hieße Ihre Größe bei den Häusern, mit denen wir am häufigsten
                    verglichen werden:
                  </p>
                  <div className="space-y-4">
                    {HAEUSER.map(h => (
                      <div key={h.gruppe} className="border-b border-black/[0.05] pb-4 last:border-0 last:pb-0">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="text-[13px] text-black">{h.gruppe}</p>
                          <span className="text-[13px] tabular-nums text-black shrink-0">
                            {h.system === 'uk' ? `UK ${spanneText(vergleich.uk)}` : `US ${spanneText(vergleich.us)}`}
                          </span>
                        </div>
                        <p className="text-[10px] text-black/40 font-light mt-0.5">{h.beispiele}</p>
                        <p className="text-[11px] text-black/50 font-light leading-relaxed mt-1.5">{h.hinweis}</p>
                        <p className="text-[10px] text-black/35 font-light leading-relaxed mt-1">Weiten dort: {h.weiten}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-[11px] text-black/35 font-light">
                  Fußlänge eintragen oder links eine Größe wählen — dann steht hier, was
                  daraus anderswo wird.
                </p>
              )}

              <p className="text-[10px] text-black/35 font-light leading-relaxed mt-6">
                Zur Orientierung. Auch innerhalb eines Hauses fällt nicht jeder Leisten
                gleich aus, und keine Umrechnung kennt Ihren Ballenumfang — deshalb messen
                wir lieber, als zu rechnen. Für Ihr Paar zählt allein unsere eigene
                Leistentabelle.
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
