/**
 * KontaktPanel.jsx — die Nummer und der Satz über dem Laden.
 *
 * ── Warum das zusammen auf eine Seite gehört ──────────────────────────────
 *
 * Beides beantwortet dieselbe Frage eines Besuchers: „Kann ich hier gerade
 * etwas kaufen, und wen frage ich, wenn nicht?" Der Hinweis sagt, ab wann;
 * die Nummer sagt, wohin in der Zwischenzeit. Getrennt gepflegt stünde
 * irgendwann ein Hinweis ohne Weg daneben.
 *
 * ── Warum es diese Seite überhaupt gibt ───────────────────────────────────
 *
 * Die WhatsApp-Nummer lag seit jeher in der Datenbank und wurde von den
 * Firmenseiten und der Sonderanfrage benutzt — nur ließ sie sich nirgends
 * eintragen. Es gab den Endpunkt, aber kein Feld. Wer die Nummer ändern
 * wollte, musste sie dem Server von Hand schicken.
 */
import { useState, useEffect } from 'react'
import { MessageCircle, Megaphone, Check } from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'

/* Was WhatsApp im Link erwartet: nur Ziffern, mit Landesvorwahl, ohne Plus
   und ohne Null davor. Was ein Mensch einträgt, sieht anders aus — deshalb
   wird hier gezeigt, was daraus wird, statt die Eingabe zu erzwingen. */
const nurZiffern = (s) => String(s || '').replace(/[^0-9]/g, '')

export default function KontaktPanel() {
  const [nummer, setNummer] = useState('')
  const [hinweis, setHinweis] = useState({ an: true, text: '', whatsappSatz: '' })
  const [geladen, setGeladen] = useState(false)
  const [speichert, setSpeichert] = useState(false)
  const [fertig, setFertig] = useState(false)
  const [fehler, setFehler] = useState(null)

  useEffect(() => {
    let verworfen = false
    apiFetch('/api/settings/hinweis')
      .then(d => {
        if (verworfen) return
        setNummer(d.whatsapp || '')
        setHinweis({ an: d.an, text: d.text || '', whatsappSatz: d.whatsappSatz || '' })
        setGeladen(true)
      })
      .catch(e => { if (!verworfen) setFehler(e.error || 'Die Angaben konnten nicht geladen werden.') })
    return () => { verworfen = true }
  }, [])

  const speichern = async () => {
    setSpeichert(true); setFehler(null)
    try {
      // Zwei Endpunkte, weil die Nummer schon einen hat und von drei anderen
      // Stellen gelesen wird. Nacheinander, damit ein Fehler der Nummer den
      // Hinweis nicht halb gespeichert zurücklässt.
      await apiFetch('/api/settings/whatsapp', { method: 'PUT', body: JSON.stringify({ number: nummer.trim() }) })
      const d = await apiFetch('/api/settings/hinweis', { method: 'PUT', body: JSON.stringify(hinweis) })
      setHinweis({ an: d.an, text: d.text || '', whatsappSatz: d.whatsappSatz || '' })
      setFertig(true)
      setTimeout(() => setFertig(false), 2200)
    } catch (e) {
      setFehler(e.error || 'Speichern fehlgeschlagen.')
    }
    setSpeichert(false)
  }

  if (!geladen && !fehler) {
    return <p className="text-[12px] text-black/30 font-light">Wird geladen …</p>
  }

  const ziffern = nurZiffern(nummer)

  return (
    <div className="max-w-2xl">
      <p className="text-[9px] text-black/25 uppercase tracking-[0.25em] mb-2 font-light">Inhalte</p>
      <h1 className="text-[26px] font-extralight text-black tracking-tight mb-8">Kontakt &amp; Hinweis</h1>

      {fehler && <p className="text-[12px] text-red-700 font-light mb-6">{fehler}</p>}

      {/* ── WhatsApp ───────────────────────────────────────────────────── */}
      <section className="border border-black/[0.08] p-6 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <MessageCircle size={14} strokeWidth={1.4} className="text-black/40" />
          <h2 className="text-[13px] font-light text-black">WhatsApp Business</h2>
        </div>
        <p className="text-[11px] text-black/40 font-light leading-[1.8] mb-5">
          Die Nummer, an die Interessenten schreiben. Sie steht auf der Startseite,
          bei den Firmenkunden und in der Sonderanfrage. Bleibt das Feld leer,
          erscheint an allen drei Stellen kein WhatsApp-Knopf.
        </p>
        <label className="block text-[10px] uppercase tracking-[0.16em] text-black/40 font-light mb-2">
          Nummer mit Landesvorwahl
        </label>
        <input
          type="tel"
          value={nummer}
          onChange={e => setNummer(e.target.value)}
          placeholder="+49 170 1234567"
          className="w-full border border-black/15 px-3 py-2.5 text-[13px] font-light bg-white focus:outline-none focus:border-black/40"
        />
        <p className="text-[11px] text-black/35 font-light mt-2">
          {ziffern
            ? <>Der Link wird <span className="tabular-nums text-black/55">wa.me/{ziffern}</span></>
            : <>Leerzeichen, Klammern und Striche sind in Ordnung, sie werden für den Link entfernt.</>}
        </p>
      </section>

      {/* ── Hinweisband ────────────────────────────────────────────────── */}
      <section className="border border-black/[0.08] p-6">
        <div className="flex items-center gap-2 mb-1">
          <Megaphone size={14} strokeWidth={1.4} className="text-black/40" />
          <h2 className="text-[13px] font-light text-black">Hinweis auf der Startseite</h2>
        </div>
        <p className="text-[11px] text-black/40 font-light leading-[1.8] mb-5">
          Ein Band direkt unter dem Aufmacher. Gedacht für das, was sich
          ändert — Verkaufsstart, Lieferzeit, eine Pause. Es steht vor dem
          ersten Scrollen und ist damit die einzige Stelle, die jeder sieht.
        </p>

        <label className="flex items-center gap-2.5 mb-5 cursor-pointer">
          <input
            type="checkbox"
            checked={hinweis.an}
            onChange={e => setHinweis(h => ({ ...h, an: e.target.checked }))}
            className="w-4 h-4 accent-black"
          />
          <span className="text-[12px] font-light text-black/70">Band anzeigen</span>
        </label>

        <label className="block text-[10px] uppercase tracking-[0.16em] text-black/40 font-light mb-2">
          Text
        </label>
        <textarea
          rows={2}
          maxLength={300}
          value={hinweis.text}
          onChange={e => setHinweis(h => ({ ...h, text: e.target.value }))}
          placeholder="Verkaufsstart im Februar. Ein Teil der Paare wird noch im Februar ausgeliefert."
          className="w-full border border-black/15 px-3 py-2.5 text-[13px] font-light bg-white focus:outline-none focus:border-black/40 resize-none leading-[1.7]"
        />

        <label className="block text-[10px] uppercase tracking-[0.16em] text-black/40 font-light mb-2 mt-5">
          Zeile am WhatsApp-Knopf
        </label>
        <input
          type="text"
          maxLength={200}
          value={hinweis.whatsappSatz}
          onChange={e => setHinweis(h => ({ ...h, whatsappSatz: e.target.value }))}
          placeholder="Fragen vorab? Schreib uns auf WhatsApp."
          className="w-full border border-black/15 px-3 py-2.5 text-[13px] font-light bg-white focus:outline-none focus:border-black/40"
        />

        {/* Die Vorschau in den Farben des Bandes: beiger Grund, dunkle
            Schrift. Sie stand erst auf Schwarz, weil das Band unter dem
            dunklen Aufmacher sitzt — es ist aber selbst beige, und eine
            Vorschau, die anders aussieht als die Sache, ist keine. */}
        {hinweis.an && (hinweis.text.trim() || ziffern) && (
          <div className="mt-6">
            <p className="text-[9px] uppercase tracking-[0.2em] text-black/25 font-light mb-2">So sieht es aus</p>
            <div className="bg-[#F4F2ED] border-b border-black/[0.07] px-5 py-4 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3">
              {hinweis.text.trim() && (
                <p className="text-[12px] text-black/65 font-light leading-[1.75]">{hinweis.text}</p>
              )}
              {ziffern && (
                <div className="shrink-0 sm:text-right">
                  {hinweis.whatsappSatz && (
                    <p className="text-[11px] text-black/40 font-light leading-[1.75] mb-1">{hinweis.whatsappSatz}</p>
                  )}
                  <span className="text-[10px] uppercase tracking-[0.2em] text-black border-b border-black/25 pb-0.5">
                    Auf WhatsApp schreiben
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <div className="flex items-center gap-4 mt-6">
        <button
          type="button"
          onClick={speichern}
          disabled={speichert}
          className="bg-black text-white border-0 px-7 py-2.5 text-[11px] uppercase tracking-[0.18em] disabled:opacity-40"
        >
          {speichert ? 'Wird gespeichert …' : 'Speichern'}
        </button>
        {fertig && (
          <span className="flex items-center gap-1.5 text-[11px] text-black/50 font-light">
            <Check size={13} strokeWidth={1.6} /> Gespeichert
          </span>
        )}
      </div>
    </div>
  )
}
