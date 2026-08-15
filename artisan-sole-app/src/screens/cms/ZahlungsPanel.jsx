/**
 * ZahlungsPanel.jsx — der Kontoauszug trifft auf die Bestellliste.
 *
 * Es gibt keinen Bankabruf und keinen Zahlungsdienstleister; der Abgleich
 * geschieht von Hand. Mühsam war daran nie das Buchen, sondern das Suchen:
 * In der Bestellliste stehen Namen und Nummern, auf dem Auszug steht ein
 * Verwendungszweck, und dazwischen saß ein Mensch, der beides vergleicht.
 *
 * Hier ist es umgedreht. Man kopiert eine Zeile aus dem Onlinebanking in das
 * Feld, und der Server sucht die Referenz darin — der Kunde schreibt sie
 * selten sauber ab, meistens steht sie mitten im Text und der eigene Name
 * dahinter. Gebucht wird dann der ganze Warenkorb, denn es war eine
 * Überweisung.
 */
import { useState, useEffect, useCallback } from 'react'
import { Banknote, Search, RefreshCw, AlertTriangle, CheckCircle2, Copy } from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'
import MFAModal from '../../components/MFAModal'

const geld = (n) =>
  `${(Number(n) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`

const tageSeit = (s) => {
  if (!s) return 0
  const d = new Date(String(s).replace(' ', 'T') + 'Z')
  return Math.floor((Date.now() - d.getTime()) / 86_400_000)
}

export default function ZahlungsPanel() {
  const [koerbe, setKoerbe] = useState([])
  const [laed, setLaed] = useState(true)
  const [text, setText] = useState('')
  const [freigeben, setFreigeben] = useState(true)
  const [mfaOffen, setMfaOffen] = useState(false)
  const [mfaFehler, setMfaFehler] = useState(null)
  const [bucht, setBucht] = useState(false)
  const [fehler, setFehler] = useState(null)
  const [erfolg, setErfolg] = useState(null)

  const laden = useCallback(async () => {
    setLaed(true)
    try {
      const rows = await apiFetch('/api/orders/zahlung/offen')
      setKoerbe(Array.isArray(rows) ? rows : [])
    } catch (e) {
      setFehler(e.error || 'Die Liste konnte nicht geladen werden.')
    } finally {
      setLaed(false)
    }
  }, [])

  useEffect(() => { laden() }, [laden])

  const buchen = async (mfaCode) => {
    setBucht(true); setFehler(null); setMfaFehler(null)
    try {
      const erg = await apiFetch('/api/orders/zahlung/buchen', {
        method: 'POST',
        headers: mfaCode ? { 'X-MFA-Code': mfaCode } : {},
        body: JSON.stringify({ verwendungszweck: text.trim(), freigeben }),
      })
      setMfaOffen(false)
      setErfolg(erg)
      setText('')
      laden()
    } catch (e) {
      if (e?.code === 'MFA_REQUIRED' || e?.code === 'MFA_NOT_SETUP') {
        setMfaOffen(true)
        if (e.code === 'MFA_NOT_SETUP') {
          setFehler('Für das Buchen von Zahlungen ist ein zweiter Faktor nötig. Sie richten ihn unter MFA-Sicherheit ein.')
          setMfaOffen(false)
        }
        return
      }
      if (e?.code === 'MFA_INVALID') { setMfaFehler(e.error); return }
      setFehler(e.error || 'Das Buchen ist nicht durchgegangen.')
      setMfaOffen(false)
    } finally {
      setBucht(false)
    }
  }

  const summeOffen = koerbe.reduce((s, k) => s + (k.summe || 0), 0)

  return (
    <div className="max-w-4xl">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <p className="text-[9px] text-black/25 uppercase tracking-[0.25em] mb-2 font-light">Bestellungen</p>
          <h1 className="text-[26px] font-extralight text-black tracking-tight">Zahlungseingang</h1>
          <p className="text-[12px] text-black/35 font-light mt-1.5">
            {koerbe.length} offene {koerbe.length === 1 ? 'Überweisung' : 'Überweisungen'} · {geld(summeOffen)}
          </p>
        </div>
        <button
          onClick={laden}
          className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-black/35 bg-transparent border-0"
        >
          <RefreshCw size={12} strokeWidth={1.4} className={laed ? 'animate-spin' : ''} /> Neu laden
        </button>
      </div>

      {/* ── Buchen ─────────────────────────────────────────────────────── */}
      <div className="border border-black/10 p-6 mb-8">
        <p className="text-[10px] text-black/30 uppercase tracking-[0.2em] mb-3 font-light">
          Zeile vom Kontoauszug einfügen
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            value={text}
            onChange={(e) => { setText(e.target.value); setFehler(null); setErfolg(null) }}
            onKeyDown={(e) => { if (e.key === 'Enter' && text.trim().length >= 4) buchen(null) }}
            placeholder="z. B. ATL-20260815-A1B2C3 Wanda Probst"
            className="h-11 flex-1 min-w-[260px] border border-black/10 px-3 text-[13px] font-light focus:outline-none focus:border-black"
          />
          <button
            onClick={() => buchen(null)}
            disabled={bucht || text.trim().length < 4}
            className="h-11 px-6 bg-black text-white text-[10px] uppercase tracking-[0.18em] border-0 disabled:opacity-30 flex items-center gap-2"
          >
            <Search size={12} strokeWidth={1.5} /> {bucht ? 'Bucht …' : 'Buchen'}
          </button>
        </div>

        <label className="flex items-center gap-2 mt-3 cursor-pointer">
          <input
            type="checkbox" checked={freigeben}
            onChange={(e) => setFreigeben(e.target.checked)}
            className="w-3.5 h-3.5 accent-black"
          />
          <span className="text-[11px] text-black/45 font-light">
            Zugleich an die Werkstatt freigeben (Kunde und Fertigung bekommen eine Nachricht)
          </span>
        </label>
        <p className="text-[10px] text-black/25 font-light mt-2 leading-relaxed">
          Ohne Haken wird nur die Zahlung verbucht. Bis zur Freigabe ist eine
          Stornierung für den Kunden kostenfrei — nach AGB 7.2 ist sie der
          Wendepunkt.
        </p>

        {fehler && (
          <div className="flex items-start gap-2 mt-4 bg-red-50 border border-red-200 px-3 py-2.5">
            <AlertTriangle size={13} strokeWidth={1.4} className="text-red-700 mt-0.5 flex-shrink-0" />
            <p className="text-[12px] text-red-800 font-light">{fehler}</p>
          </div>
        )}

        {erfolg && (
          <div className="flex items-start gap-2 mt-4 bg-green-50 border border-green-200 px-3 py-2.5">
            <CheckCircle2 size={13} strokeWidth={1.4} className="text-green-700 mt-0.5 flex-shrink-0" />
            <p className="text-[12px] text-green-900 font-light">
              {erfolg.anzahl} {erfolg.anzahl === 1 ? 'Bestellung' : 'Bestellungen'} zu{' '}
              <span className="font-normal">{erfolg.referenz}</span> gebucht · {geld(erfolg.summe)}
              {erfolg.status === 'processing' ? ' · an die Werkstatt freigegeben' : ' · noch nicht freigegeben'}
            </p>
          </div>
        )}
      </div>

      {/* ── Offene Überweisungen ───────────────────────────────────────── */}
      {laed ? (
        <p className="text-[12px] text-black/30 font-light">Wird geladen …</p>
      ) : koerbe.length === 0 ? (
        <div className="text-center py-16">
          <Banknote size={28} strokeWidth={0.8} className="text-black/10 mx-auto mb-3" />
          <p className="text-[13px] text-black/35 font-light">Nichts offen. Alle Zahlungen sind verbucht.</p>
        </div>
      ) : (
        <div className="border border-black/[0.08]">
          {koerbe.map((k, i) => {
            const tage = tageSeit(k.seit)
            return (
              <div key={k.referenz} className={`px-5 py-4 ${i > 0 ? 'border-t border-black/[0.06]' : ''}`}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] text-black font-light">{k.kunde}</p>
                      {/* Zehn Tage ist die Grenze, ab der eine Überweisung
                          nicht mehr „unterwegs" ist, sondern ausbleibt. */}
                      {tage >= 10 && (
                        <span className="text-[9px] uppercase tracking-[0.15em] px-2 py-0.5 bg-amber-100 text-amber-800">
                          seit {tage} Tagen
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => navigator.clipboard?.writeText(k.verwendungszweck)}
                      title="Verwendungszweck kopieren"
                      className="flex items-center gap-1.5 mt-1 text-[11px] text-black/40 font-light bg-transparent border-0 p-0"
                    >
                      {k.verwendungszweck} <Copy size={10} strokeWidth={1.4} />
                    </button>
                    <p className="text-[10px] text-black/30 font-light mt-1">
                      {k.positionen.map(p => p.shoe_name).join(' · ')}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[15px] text-black font-light tabular-nums">{geld(k.summe)}</p>
                    <button
                      onClick={() => { setText(k.verwendungszweck); setErfolg(null); setFehler(null) }}
                      className="text-[10px] uppercase tracking-[0.15em] text-black/35 hover:text-black/60 bg-transparent border-0 p-0 mt-1"
                    >
                      Übernehmen
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <MFAModal
        open={mfaOffen}
        title="Zahlungseingang buchen"
        onClose={() => setMfaOffen(false)}
        onConfirm={(code) => buchen(code)}
        loading={bucht}
        error={mfaFehler}
      />
    </div>
  )
}
