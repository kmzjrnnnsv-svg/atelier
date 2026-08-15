/**
 * GuertelWahl.jsx — die Maske, mit der ein Gürtel zusammengestellt wird.
 *
 * ── Warum ein gemeinsames Bauteil ────────────────────────────────────────
 *
 * Denselben Gürtel gibt es an zwei Stellen: neben dem Schuh im Konfigurator
 * und für sich auf der Zubehörseite. Die Fragen sind dieselben, nur die
 * Ausgangslage unterscheidet sich — neben dem Schuh stehen Leder und Farbe
 * schon fest, bei Monk und Double Monk auch der Metallton.
 *
 * Zwei Masken hätten zwei Wahrheiten ergeben: Der Konfigurator hätte eine
 * Länge angeboten, die die Zubehörseite nicht kennt, und der Preis wäre
 * irgendwann an einer der beiden Stellen der falsche gewesen. Deshalb eine
 * Maske mit einem Schalter statt zweier Masken.
 *
 * ── Was „vorgabe" heißt ──────────────────────────────────────────────────
 *
 * `vorgabe` sind die Angaben, die schon feststehen. Was darin steht, wird
 * ANGEZEIGT statt gefragt — der Kunde sieht, dass sein Gürtel dasselbe Leder
 * bekommt wie seine Schuhe, und muss es nicht noch einmal wählen. Was fehlt,
 * wird gefragt. Der Unterschied zwischen „am Schuh festgelegt" und „hier zu
 * entscheiden" ist genau der Unterschied zwischen einem gesetzten und einem
 * fehlenden Feld — mehr Logik braucht es dafür nicht.
 *
 * ── Warum hier kaum Effekte stehen ───────────────────────────────────────
 *
 * Was sich aus `vorgabe` ergibt, wird BEIM LESEN abgeleitet und nicht in
 * einem Effekt in den Zustand zurückgeschrieben. Eine Vorgabe, die in den
 * Zustand kopiert wird, ist ein zweites Exemplar derselben Angabe — und
 * zwei Exemplare laufen auseinander, sobald der Kunde die Vorlage wechselt.
 */
import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronDown, Ruler } from 'lucide-react'
import { spanne, guertelSatz, farbePasstZuLeder, SPIELRAUM_CM } from '../lib/guertel'

function Feld({ nummer, titel, hinweis, children }) {
  return (
    <div className="mt-6">
      <div className="flex items-baseline gap-2 mb-2.5">
        {nummer && <span className="text-[9px] text-black/30 border border-black/15 px-1.5 py-0.5">{nummer}</span>}
        <p className="text-[10px] uppercase tracking-[0.18em] text-black/45">{titel}</p>
      </div>
      {hinweis && <p className="text-[11px] text-black/40 leading-relaxed mb-2.5">{hinweis}</p>}
      {children}
    </div>
  )
}

/** Eine Angabe, die schon feststeht. Kein Knopf — es gibt nichts zu drücken. */
function Uebernommen({ titel, wert, hex, woher }) {
  return (
    <div className="mt-6">
      <p className="text-[10px] uppercase tracking-[0.18em] text-black/45 mb-2">{titel}</p>
      <div className="flex items-center gap-2.5 border border-black/10 bg-black/[0.02] px-3 py-2.5">
        {hex && <span className="w-5 h-5 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: hex }} />}
        <span className="text-[13px] text-black/75">{wert}</span>
        <span className="text-[10px] text-black/35 ml-auto">{woher}</span>
      </div>
    </div>
  )
}

export default function GuertelWahl({
  optionen,          // Antwort von /api/accessories/guertel
  vorgabe = {},      // was schon feststeht (leder, farbe, metall, form …)
  lederListe = [],   // für die freie Wahl: verfügbare Lederarten
  farbListe = [],    // für die freie Wahl: verfügbare Farben (global)
  woher = 'wie Ihr Schuh',
  onChange,
}) {
  const [form, setForm]       = useState('')
  const [metall, setMetall]   = useState('')
  const [groesse, setGroesse] = useState('')
  const [leder, setLeder]     = useState('')
  const [farbe, setFarbe]     = useState('')
  const [hilfeOffen, setHilfeOffen] = useState(false)

  const lederFest  = !!vorgabe.leder
  const metallFest = !!vorgabe.metall

  // Die Vorgabe hat Vorrang, ohne den Zustand anzufassen: Wechselt der Kunde
  // die Vorlage, zieht die Anzeige sofort nach, und seine eigene Wahl bleibt
  // darunter erhalten, falls er auf „frei zusammenstellen" zurückgeht.
  const gLeder  = vorgabe.leder  || leder
  const gForm   = vorgabe.form   || form
  const gMetall = vorgabe.metall || metall

  // Bei freier Wahl: nur Farben, die es an diesem Leder gibt. Dieselbe Regel
  // wie im Schuhkonfigurator — eine Farbe ohne zugehöriges Leder wäre eine
  // Auswahl, die ins Leere führt.
  const farbenHier = useMemo(
    () => (lederFest || !gLeder ? [] : farbListe.filter(c => farbePasstZuLeder(c, gLeder))),
    [farbListe, gLeder, lederFest],
  )

  // Wechselt das Leder, ist die vorher gewählte Farbe womöglich keine mehr.
  // Sie wird beim Lesen verworfen statt in einem Effekt zurückgesetzt: So
  // gibt es keinen Zwischenzustand, in dem eine unmögliche Paarung gilt.
  const gFarbe = lederFest
    ? vorgabe.farbe
    : (farbenHier.some(c => c.key === farbe) ? farbe : '')

  const gewaehlt = useMemo(() => {
    const l = lederFest
      ? { key: vorgabe.leder, label: vorgabe.leder_label }
      : lederListe.find(m => m.key === gLeder)
    const f = lederFest
      ? { key: vorgabe.farbe, name: vorgabe.farbe_name, hex: vorgabe.farbe_hex }
      : farbenHier.find(c => c.key === gFarbe)
    const fo = (optionen?.formen || []).find(x => x.key === gForm)
    const me = (optionen?.metalle || []).find(x => x.key === gMetall)
    if (!l || !f || !fo || !me || !groesse) return null
    return {
      art: 'belt',
      leder: l.key, leder_label: l.label,
      farbe: f.key, farbe_name: f.name, farbe_hex: f.hex,
      form: fo.key, form_label: fo.label,
      metall: me.key, metall_label: me.label, metall_hex: me.color_hex,
      groesse: Number(groesse),
    }
  }, [lederFest, vorgabe, lederListe, gLeder, farbenHier, gFarbe, optionen, gForm, gMetall, groesse])

  // Das Ergebnis nach oben melden. Ein Effekt ist hier richtig: Der
  // Elternteil bekommt die Nachricht, NACHDEM diese Maske gezeichnet ist —
  // ihn währenddessen zu ändern wäre ein Seiteneffekt im Rendern.
  useEffect(() => { onChange?.(gewaehlt) }, [gewaehlt])

  if (!optionen) return null

  const spielraum = optionen.spielraum_cm || SPIELRAUM_CM
  const sp = spanne(groesse, spielraum)
  let nr = 0

  return (
    <div>
      {/* ── Leder und Farbe ───────────────────────────────────────────── */}
      {lederFest ? (
        <Uebernommen
          titel="Leder und Farbe"
          wert={`${vorgabe.leder_label} in ${vorgabe.farbe_name}`}
          hex={vorgabe.farbe_hex}
          woher={woher}
        />
      ) : (
        <>
          <Feld nummer={++nr} titel="Leder">
            <div className="flex flex-wrap gap-2">
              {lederListe.map(m => (
                <button key={m.key} onClick={() => setLeder(m.key)}
                  className={`px-3 py-2 border text-[12px] transition-colors ${
                    gLeder === m.key ? 'border-black text-black' : 'border-black/12 text-black/55 hover:border-black/30'}`}>
                  {m.label}
                </button>
              ))}
            </div>
          </Feld>

          <Feld nummer={++nr} titel="Farbe"
            hinweis={gLeder ? null : 'Wählen Sie zuerst das Leder — die Farben unterscheiden sich je nach Art.'}>
            <div className="flex flex-wrap gap-2">
              {farbenHier.map(c => (
                <button key={c.key} onClick={() => setFarbe(c.key)} title={c.name}
                  className={`w-9 h-9 rounded-lg border-2 flex items-center justify-center transition-all ${
                    gFarbe === c.key ? 'border-black' : 'border-transparent'}`}
                  style={{ backgroundColor: c.hex }}>
                  {gFarbe === c.key && <Check size={14} className="text-white drop-shadow" strokeWidth={2.5} />}
                </button>
              ))}
            </div>
            {gFarbe && (
              <p className="text-[11px] text-black/45 mt-2">{farbenHier.find(c => c.key === gFarbe)?.name}</p>
            )}
          </Feld>
        </>
      )}

      {/* ── Form der Schließe ─────────────────────────────────────────── */}
      <Feld nummer={++nr} titel="Form der Schließe">
        <div className="grid grid-cols-2 gap-2 max-w-sm">
          {(optionen.formen || []).map(f => (
            <button key={f.key} onClick={() => setForm(f.key)}
              className={`border px-3 py-3 text-left transition-colors ${
                gForm === f.key ? 'border-black' : 'border-black/12 hover:border-black/30'}`}>
              <span className={`block text-[12px] ${gForm === f.key ? 'text-black' : 'text-black/60'}`}>{f.label}</span>
            </button>
          ))}
        </div>
      </Feld>

      {/* ── Metall ────────────────────────────────────────────────────── */}
      {metallFest ? (
        <Uebernommen titel="Metall" wert={vorgabe.metall_label} hex={vorgabe.metall_hex}
          woher="wie die Schnalle Ihres Schuhs" />
      ) : (
        <Feld nummer={++nr} titel="Farbe des Metalls">
          <div className="flex flex-wrap gap-2">
            {(optionen.metalle || []).map(m => (
              <button key={m.key} onClick={() => setMetall(m.key)} title={m.label}
                className={`flex items-center gap-2 border px-2.5 py-2 transition-colors ${
                  gMetall === m.key ? 'border-black' : 'border-black/12 hover:border-black/30'}`}>
                <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: m.color_hex || '#ccc' }} />
                <span className={`text-[12px] ${gMetall === m.key ? 'text-black' : 'text-black/60'}`}>{m.label}</span>
              </button>
            ))}
          </div>
        </Feld>
      )}

      {/* ── Länge ─────────────────────────────────────────────────────── */}
      <Feld nummer={++nr} titel="Länge">
        <div className="grid grid-cols-7 gap-1.5 max-w-md">
          {(optionen.groessen || []).map(g => (
            <button key={g} onClick={() => setGroesse(g)}
              className={`py-2 text-[12px] border transition-colors ${
                Number(groesse) === g ? 'border-black text-black' : 'border-black/12 text-black/55 hover:border-black/30'}`}>
              {g}
            </button>
          ))}
        </div>
        {sp && (
          <p className="text-[11px] text-black/50 mt-2.5">
            {groesse} cm — gemessen bis zum mittleren Loch. Sitzt von {sp.von} bis {sp.bis} cm.
          </p>
        )}

        {/* Die Hilfe steht eingeklappt da: Wer seine Größe kennt, soll nicht
            drei Absätze überlesen müssen; wer sie nicht kennt, findet sie an
            der Stelle, an der die Frage auftaucht. */}
        <button onClick={() => setHilfeOffen(o => !o)}
          className="flex items-center gap-1.5 text-[11px] text-black/45 hover:text-black/70 mt-3 transition-colors">
          <Ruler size={12} />
          {optionen.hilfe?.titel || 'Welche Länge brauche ich?'}
          <ChevronDown size={12} className={`transition-transform ${hilfeOffen ? 'rotate-180' : ''}`} />
        </button>
        {hilfeOffen && (
          <div className="mt-2.5 border-l-2 border-black/10 pl-3 space-y-2.5">
            {(optionen.hilfe?.wege || []).map((w, i) => (
              <div key={i}>
                <p className="text-[11px] text-black/70">{w.titel}</p>
                <p className="text-[11px] text-black/45 leading-relaxed">{w.text}</p>
              </div>
            ))}
            {optionen.hilfe?.hinweis && (
              <p className="text-[11px] text-black/40 leading-relaxed italic">{optionen.hilfe.hinweis}</p>
            )}
          </div>
        )}
      </Feld>

      {/* ── Was dabei herauskommt ─────────────────────────────────────── */}
      {gewaehlt && (
        <div className="mt-6 border border-black/10 bg-black/[0.02] px-3.5 py-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-black/35 mb-1.5">Ihr Gürtel</p>
          <p className="text-[12px] text-black/75 leading-relaxed">{guertelSatz(gewaehlt, spielraum)}</p>
        </div>
      )}
    </div>
  )
}
