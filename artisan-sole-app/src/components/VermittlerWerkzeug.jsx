/**
 * VermittlerWerkzeug.jsx — was ein Vermittler zum Arbeiten braucht.
 *
 * Bis eben konnte er zusehen und sonst nichts: Er sah seine Provisionen, aber
 * nicht, ob sein Link überhaupt geklickt wird; er hatte kein Material, mit dem
 * er hätte werben können; er konnte seine Auszahlung nicht anstoßen und hatte
 * hinterher keinen Beleg fürs Finanzamt.
 *
 * Die Klickzahl allein wäre dabei keine Auskunft. Erst neben der Zahl der
 * Bestellungen wird sie eine: 200 Klicks ohne Bestellung und 3 Klicks mit
 * einer Bestellung sind zwei völlig verschiedene Lagen, und die eine Zahl
 * unterscheidet sie nicht.
 */
import { useState, useEffect } from 'react'
import { MousePointerClick, Link2, Copy, Check, Megaphone, FileText, Banknote, Download } from 'lucide-react'
import { apiFetch } from '../hooks/useApi'

const euro = (n) =>
  `${(Number(n) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`

function KopierKnopf({ text, label = 'Kopieren' }) {
  const [kopiert, setKopiert] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(text)
        setKopiert(true)
        setTimeout(() => setKopiert(false), 1600)
      }}
      className="flex items-center gap-1.5 px-3 py-1.5 border border-black/10 bg-white text-[10px] uppercase tracking-[0.15em] text-black/50 flex-shrink-0"
    >
      {kopiert ? <Check size={11} strokeWidth={1.6} /> : <Copy size={11} strokeWidth={1.4} />}
      {kopiert ? 'Kopiert' : label}
    </button>
  )
}

// ── Klicks ──────────────────────────────────────────────────────────────────
function Klicks({ klicks }) {
  if (!klicks) return null
  const hoechst = Math.max(1, ...klicks.proTag.map(t => t.anzahl))

  return (
    <div className="border border-black/10 bg-white px-6 py-6">
      <p className="text-[10px] uppercase tracking-[0.25em] text-black/30 mb-5 flex items-center gap-1.5">
        <MousePointerClick size={11} strokeWidth={1.4} /> Ihre Reichweite
      </p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <p className="text-[22px] font-extralight text-black tabular-nums leading-none">{klicks.siebenTage}</p>
          <p className="text-[10px] text-black/30 font-light mt-1.5">Klicks, 7 Tage</p>
        </div>
        <div>
          <p className="text-[22px] font-extralight text-black tabular-nums leading-none">{klicks.dreissigTage}</p>
          <p className="text-[10px] text-black/30 font-light mt-1.5">Klicks, 30 Tage</p>
        </div>
        <div>
          <p className="text-[22px] font-extralight text-black tabular-nums leading-none">
            {klicks.konversion === null ? 'noch keine' : `${klicks.konversion} %`}
          </p>
          <p className="text-[10px] text-black/30 font-light mt-1.5">werden zur Bestellung</p>
        </div>
      </div>

      {klicks.proTag.length > 0 && (
        <div className="flex items-end gap-[3px] h-16 mb-5">
          {klicks.proTag.map(t => (
            <div
              key={t.day} className="flex-1 bg-black/70 min-h-[2px]"
              style={{ height: `${(t.anzahl / hoechst) * 100}%` }}
              title={`${new Date(t.day).toLocaleDateString('de-DE')}: ${t.anzahl}`}
            />
          ))}
        </div>
      )}

      {klicks.gesamt === 0 ? (
        <p className="text-[12px] text-black/35 font-light leading-relaxed">
          Noch keine Klicks gezählt. Sobald jemand über Ihren Link oder Ihren
          Code kommt, steht es hier.
        </p>
      ) : (
        <>
          {klicks.herkunft.length > 0 && (
            <div className="border-t border-black/[0.06] pt-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-black/25 mb-2">Woher</p>
              {klicks.herkunft.map(h => (
                <div key={h.quelle} className="flex justify-between py-1">
                  <span className="text-[12px] text-black/55 font-light">{h.quelle}</span>
                  <span className="text-[12px] text-black/40 font-light tabular-nums">{h.anzahl}</span>
                </div>
              ))}
            </div>
          )}
          {klicks.modelle.length > 0 && (
            <div className="border-t border-black/[0.06] pt-3 mt-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-black/25 mb-2">Meistgeklickte Modelle</p>
              {klicks.modelle.map(m => (
                <div key={m.shoe_slug} className="flex justify-between py-1">
                  <span className="text-[12px] text-black/55 font-light truncate">{m.shoe_slug}</span>
                  <span className="text-[12px] text-black/40 font-light tabular-nums flex-shrink-0">{m.anzahl}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      <p className="text-[10px] text-black/25 font-light mt-4 leading-relaxed">
        Gezählt wird ohne Cookie und ohne IP-Adresse, nur Tag, Ziel und die
        Seite, von der jemand kam.
      </p>
    </div>
  )
}

// ── Fertige Links ───────────────────────────────────────────────────────────
function Links({ link }) {
  const [daten, setDaten] = useState(null)
  const [suche, setSuche] = useState('')

  useEffect(() => {
    apiFetch('/api/affiliates/me/links').then(setDaten).catch(() => setDaten({ modelle: [] }))
  }, [])

  const gefiltert = (daten?.modelle || []).filter(m =>
    !suche.trim() || m.name.toLowerCase().includes(suche.trim().toLowerCase()))

  return (
    <div className="border border-black/10 bg-white px-6 py-6">
      <p className="text-[10px] uppercase tracking-[0.25em] text-black/30 mb-4 flex items-center gap-1.5">
        <Link2 size={11} strokeWidth={1.4} /> Links zum Teilen
      </p>

      <div className="flex items-center gap-2 mb-5">
        <span className="text-[12px] text-black/55 font-light truncate flex-1">{link}</span>
        <KopierKnopf text={link} label="Ihr Link" />
      </div>

      <p className="text-[12px] text-black/45 font-light leading-relaxed mb-3">
        Für ein bestimmtes Paar: Diese Links führen direkt zum Modell und
        tragen Ihren Code mit.
      </p>

      <input
        value={suche} onChange={(e) => setSuche(e.target.value)}
        placeholder="Modell suchen"
        className="w-full h-10 border border-black/10 px-3 text-[12px] font-light mb-3 focus:outline-none focus:border-black/40"
      />

      {!daten ? (
        <p className="text-[12px] text-black/30 font-light">Wird geladen …</p>
      ) : (
        <div className="max-h-72 overflow-y-auto divide-y divide-black/[0.05]">
          {gefiltert.map(m => (
            <div key={m.slug} className="flex items-center gap-3 py-2.5">
              {m.bild && <img src={m.bild} alt="" className="w-10 h-10 object-cover flex-shrink-0" />}
              <div className="min-w-0 flex-1">
                <p className="text-[12px] text-black/70 font-light truncate">{m.name}</p>
                <p className="text-[10px] text-black/25 font-light truncate">{m.url}</p>
              </div>
              <KopierKnopf text={m.url} />
            </div>
          ))}
          {gefiltert.length === 0 && (
            <p className="text-[12px] text-black/30 font-light py-3">Kein Modell gefunden.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Werbemittel ─────────────────────────────────────────────────────────────
function Werbemittel() {
  const [mittel, setMittel] = useState(null)
  useEffect(() => {
    apiFetch('/api/affiliates/me/werbemittel').then(setMittel).catch(() => setMittel([]))
  }, [])

  if (!mittel || mittel.length === 0) return null

  return (
    <div className="border border-black/10 bg-white px-6 py-6">
      <p className="text-[10px] uppercase tracking-[0.25em] text-black/30 mb-4 flex items-center gap-1.5">
        <Megaphone size={11} strokeWidth={1.4} /> Werbemittel
      </p>
      <p className="text-[12px] text-black/45 font-light leading-relaxed mb-4">
        Freigegebenes Material. Bitte verwenden Sie diese Bilder und Formulierungen
        unverändert, sie sind mit dem Haus abgestimmt.
      </p>
      <div className="flex flex-col gap-4">
        {mittel.map(m => (
          <div key={m.id} className="border border-black/[0.06] p-4">
            <p className="text-[12px] text-black/70 font-light mb-2">{m.title}</p>
            {m.kind === 'bild' && m.image_data ? (
              <>
                <img src={m.image_data} alt={m.title} className="max-h-56 border border-black/[0.06]" />
                <a
                  href={m.image_data} download={`${m.title.replace(/[^\w-]+/g, '-').toLowerCase()}.jpg`}
                  className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 border border-black/10 text-[10px] uppercase tracking-[0.15em] text-black/50 no-underline"
                >
                  <Download size={11} strokeWidth={1.4} /> Bild sichern
                </a>
              </>
            ) : (
              <div className="flex items-start gap-3">
                <p className="text-[12px] text-black/55 font-light leading-relaxed whitespace-pre-line flex-1">{m.body}</p>
                <KopierKnopf text={m.body || ''} />
              </div>
            )}
            {m.note && <p className="text-[10px] text-black/30 font-light mt-2">{m.note}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Auszahlung anfordern ────────────────────────────────────────────────────
function Auszahlung({ affiliate, standing, aufFrisch }) {
  const [laeuft, setLaeuft] = useState(false)
  const [fehler, setFehler] = useState(null)
  const [erfolg, setErfolg] = useState(null)

  const angefordert = !!affiliate.payout_requested_at
  const offen = standing?.payable?.pairs || 0

  const anfordern = async () => {
    setLaeuft(true); setFehler(null)
    try {
      const erg = await apiFetch('/api/affiliates/me/auszahlung', { method: 'POST' })
      setErfolg(erg)
      aufFrisch?.()
    } catch (e) {
      setFehler(e.error || 'Das hat nicht geklappt.')
    } finally {
      setLaeuft(false)
    }
  }

  if (angefordert || erfolg) {
    return (
      <div className="border border-black/10 bg-white px-6 py-5">
        <div className="flex items-start gap-2.5">
          <Check size={14} strokeWidth={1.5} className="text-black/40 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[13px] text-black font-light">Ihre Auszahlung ist angefordert.</p>
            <p className="text-[12px] text-black/40 font-light mt-1 leading-relaxed">
              Wir prüfen die Angaben und weisen sie an. Sie bekommen anschließend
              eine Gutschrift, die Sie hier herunterladen können.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (offen === 0) return null

  return (
    <div className="border border-black/10 bg-white px-6 py-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-[13px] text-black font-light">
            {offen} {offen === 1 ? 'Paar' : 'Paare'} auszahlbar · {euro(standing.payable.amount)}
          </p>
          <p className="text-[11px] text-black/35 font-light mt-0.5">
            {affiliate.iban
              ? 'Sagen Sie Bescheid, wenn Sie ausgezahlt werden möchten.'
              : 'Tragen Sie zuerst Ihre Bankverbindung ein, ohne sie können wir nicht überweisen.'}
          </p>
        </div>
        <button
          onClick={anfordern} disabled={laeuft || !affiliate.iban}
          className="px-5 py-2.5 bg-black text-white text-[10px] uppercase tracking-[0.15em] border-0 disabled:opacity-30 flex items-center gap-2 flex-shrink-0"
        >
          <Banknote size={12} strokeWidth={1.5} /> {laeuft ? '…' : 'Auszahlung anfordern'}
        </button>
      </div>
      {fehler && <p className="text-[11px] text-red-700 font-light mt-2">{fehler}</p>}
    </div>
  )
}

// ── Gutschrift zu einer Auszahlung ──────────────────────────────────────────
export function GutschriftKnopf({ payout }) {
  const [laed, setLaed] = useState(false)

  const oeffnen = async () => {
    setLaed(true)
    try {
      const res = await apiFetch(`/api/affiliates/me/gutschrift/${payout.id}`, { raw: true })
      if (!res.ok) throw new Error()
      const url = URL.createObjectURL(await res.blob())
      window.open(url, '_blank', 'noopener')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch {
      /* Bleibt still: Der Knopf ist eine Beigabe, kein Arbeitsschritt. */
    } finally {
      setLaed(false)
    }
  }

  return (
    <button
      onClick={oeffnen} disabled={laed}
      title="Gutschrift als PDF"
      className="flex items-center gap-1.5 px-2.5 py-1.5 border border-black/10 bg-white text-[10px] uppercase tracking-[0.15em] text-black/45 flex-shrink-0 disabled:opacity-40"
    >
      <FileText size={11} strokeWidth={1.4} /> {laed ? '…' : 'Beleg'}
    </button>
  )
}

export default function VermittlerWerkzeug({ affiliate, standing, klicks, link, aufFrisch }) {
  return (
    <>
      <Auszahlung affiliate={affiliate} standing={standing} aufFrisch={aufFrisch} />
      <Klicks klicks={klicks} />
      <Links link={link} />
      <Werbemittel />
    </>
  )
}
