/**
 * AffiliatePortal — die Ansicht eines Affiliates auf seine eigene Arbeit.
 *
 * Kern ist die Fortschrittsleiste zur nächsten Auszahlung. Ausgezahlt wird in
 * Fünferrunden, und genau das soll man auf einen Blick sehen: wie viele Paare
 * schon zählen und wie viele noch fehlen — dieselbe Idee wie bei den
 * Sammelkarten der Lieferdienste, wo man weiß, dass die nächste Bestellung die
 * Runde voll macht.
 *
 * Bewusst nicht enthalten: Kundennamen, Adressen, Bestellnummern. Für die
 * Abrechnung nicht nötig, datenschutzrechtlich unnötiger Ballast.
 */
import { useEffect, useState, useCallback } from 'react'
import { Copy, Check, Download, Clock, Wallet, PackageCheck, AlertCircle, Share2, Mail, LogOut, MessageSquare } from 'lucide-react'
import { apiFetch } from '../hooks/useApi'
import { useAuth } from '../context/AuthContext'
import { HOME_PATH } from '../lib/homePath'
import ChatFenster, { useUngelesen } from '../components/ChatFenster'
import Bereichswechsel from '../components/Bereichswechsel'
import AffiliateStammdaten from '../components/AffiliateStammdaten'
import Ablauf from '../components/Ablauf'
import VermittlerWerkzeug, { GutschriftKnopf } from '../components/VermittlerWerkzeug'

const euro = (n) => `€ ${Number(n || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const STATUS_LABEL = {
  pending:   { text: 'In Bearbeitung', hint: 'Bestellung liegt vor, noch nicht zugestellt' },
  confirmed: { text: 'Schutzfrist läuft', hint: 'Zugestellt, wird nach Ablauf der Frist auszahlbar' },
  payable:   { text: 'Auszahlbar', hint: 'Zählt für die nächste Auszahlungsrunde' },
  paid:      { text: 'Ausgezahlt', hint: '' },
  cancelled: { text: 'Verfallen', hint: 'Zurückgegeben oder reklamiert' },
}

// ── Fortschritt bis zur nächsten Auszahlung ───────────────────────────────
function PayoutProgress({ standing }) {
  const { batchSize, pairsInBatch, pairsUntilPayout, readyForPayout } = standing

  return (
    <div className="border border-black/10 bg-white px-6 py-7">
      <p className="text-[10px] uppercase tracking-[0.25em] text-black/30 mb-4">Nächste Auszahlung</p>

      {/* Ein Segment je Paar der Runde. Deutlicher als ein durchgehender
          Balken: Es geht um abzählbare Paare, nicht um einen Prozentwert. */}
      <div className="flex gap-1.5 mb-5" role="img"
           aria-label={`${pairsInBatch} von ${batchSize} Paaren erreicht`}>
        {Array.from({ length: batchSize }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-2.5 rounded-full transition-colors duration-500"
            style={{ backgroundColor: i < pairsInBatch ? '#111' : 'rgba(0,0,0,0.08)' }}
          />
        ))}
      </div>

      {readyForPayout ? (
        <>
          <p className="text-[19px] font-light text-black leading-snug">Runde voll.</p>
          <p className="text-[13px] text-black/45 font-light mt-1">
            {standing.payable.pairs} Paar auszahlbar · {euro(standing.payable.amount)}.
            Die Auszahlung wird beim nächsten Lauf angewiesen.
          </p>
        </>
      ) : (
        <>
          <p className="text-[19px] font-light text-black leading-snug">
            {pairsUntilPayout === 1
              ? 'Noch ein Paar bis zur Auszahlung.'
              : `Noch ${pairsUntilPayout} Paare bis zur Auszahlung.`}
          </p>
          <p className="text-[13px] text-black/45 font-light mt-1">
            {pairsInBatch} von {batchSize} Paaren dieser Runde zählen bereits.
          </p>
        </>
      )}
    </div>
  )
}

function Figure({ icon: FigureIcon, label, value, sub }) {
  return (
    <div className="border border-black/10 bg-white px-5 py-5">
      <div className="flex items-center gap-2 mb-2.5">
        <FigureIcon size={13} strokeWidth={1.5} className="text-black/30" />
        <p className="text-[10px] uppercase tracking-[0.2em] text-black/30">{label}</p>
      </div>
      <p className="text-[22px] font-light text-black leading-none">{value}</p>
      {sub && <p className="text-[11px] text-black/35 font-light mt-1.5">{sub}</p>}
    </div>
  )
}

export default function AffiliatePortal() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const { logout } = useAuth()
  // Kurzer Draht ins Haus — Fragen zur Abrechnung gehören nicht in ein
  // fremdes Postfach.
  const [chatOffen, setChatOffen] = useState(false)
  const { ungelesen, neuLaden } = useUngelesen(true)

  // Als benannte Funktion, damit der Stand nach dem Eintragen der eigenen
  // Daten neu geholt werden kann — sonst stünde oben weiter der leere Name.
  const laden = useCallback(() => {
    apiFetch('/api/affiliates/me')
      .then(setData)
      .catch(e => setError(e?.error || 'Konnte nicht geladen werden'))
  }, [])
  useEffect(() => { laden() }, [laden])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(data.link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* Zwischenablage nicht verfügbar */ }
  }

  // Weitergeben statt abschreiben. Auf dem Telefon öffnet das die gewohnte
  // Teilen-Auswahl (WhatsApp, Nachrichten, Mail); wo es die nicht gibt —
  // Firefox, ältere Browser, http — bleibt der Weg über die Zwischenablage.
  const shareLink = async () => {
    const text = `Custom Made Schuhe von Artisan Sole. Mit diesem Link ist mein Code ${data.affiliate.code} beim Bezahlen schon hinterlegt:`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Artisan Sole', text, url: data.link })
        return
      } catch { /* abgebrochen oder nicht erlaubt — dann kopieren */ }
    }
    copyLink()
  }

  if (error) {
    return (
      <div className="min-h-full bg-[#fafaf9] flex items-center justify-center px-8">
        <div className="text-center max-w-sm">
          <AlertCircle size={20} strokeWidth={1.4} className="text-black/25 mx-auto mb-4" />
          <p className="text-[14px] font-light text-black/60">{error}</p>
          <p className="text-[12px] text-black/35 font-light mt-2">
            Dieser Bereich steht nur freigegebenen Affiliates offen.
          </p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-full bg-[#fafaf9] flex items-center justify-center">
        <div className="w-6 h-6 border border-black/15 border-t-black/50 rounded-full animate-spin-custom" />
      </div>
    )
  }

  const { affiliate: a, standing, commissions, payouts, link, qr, rules, klicks } = data

  return (
    <div className="min-h-full bg-[#fafaf9] pb-20">
      {/* Eigene Kopfzeile: Das Portal zeigt die Shop-Navigation nicht mehr,
          also braucht es hier einen eigenen Weg nach draußen. Ohne ihn käme
          ein Affiliate nicht einmal mehr zum Abmelden. */}
      <ChatFenster offen={chatOffen} onClose={() => setChatOffen(false)} onGelesen={neuLaden} />
      <div className="flex items-center justify-between px-5 lg:px-16 h-14 border-b border-black/[0.06] bg-white">
        <span className="font-brand text-[11px] text-black/70">ARTISAN SOLE</span>
        <div className="flex items-center gap-1">
        {/* Zurück in den Laden. Ein Affiliate ist meistens auch Kunde — er
            trägt schließlich, was er empfiehlt. Ohne diesen Weg müsste er
            sich abmelden, um ein Paar für sich selbst zu bestellen. */}
        <Bereichswechsel kompakt />
        <button
          onClick={() => setChatOffen(true)}
          className="relative flex items-center gap-2 h-11 px-2 bg-transparent border-0 text-[11px] text-black/40 hover:text-black/70 uppercase tracking-[0.16em]"
        >
          <MessageSquare size={14} strokeWidth={1.4} /> Nachrichten
          {ungelesen > 0 && (
            <span className="bg-black text-white text-[9px] min-w-[15px] h-[15px] px-1 flex items-center justify-center">
              {ungelesen > 99 ? '99+' : ungelesen}
            </span>
          )}
        </button>
        <button
          onClick={() => { logout(); window.location.replace(HOME_PATH) }}
          className="flex items-center gap-2 h-11 px-2 bg-transparent border-0 text-[11px] text-black/40 hover:text-black/70 uppercase tracking-[0.16em]"
        >
          <LogOut size={14} strokeWidth={1.4} /> Abmelden
        </button>
        </div>
      </div>

      <div className="px-5 lg:px-16 pt-10 lg:pt-14 pb-8 max-w-5xl">
        <p className="text-[10px] uppercase tracking-[0.3em] text-black/25 mb-3">Affiliate-Bereich</p>
        <h1 className="text-[26px] lg:text-[34px] font-extralight text-black tracking-tight">{a.full_name}</h1>
        <p className="text-[13px] text-black/40 font-light mt-1.5">
          Ihr Code: <span className="text-black font-normal tracking-wide">{a.code.toUpperCase()}</span>
          {a.status !== 'active' && (
            <span className="ml-3 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5">
              {a.status === 'pending' ? 'Freigabe steht aus' : 'Zurzeit ruhend'}
            </span>
          )}
        </p>
      </div>

      <div className="px-5 lg:px-16 max-w-5xl space-y-4">
        {/* Ganz oben, solange etwas fehlt: Ohne Anschrift und Bankverbindung
            kann nicht ausgezahlt werden, und das erfährt man sonst erst, wenn
            die erste Runde voll ist. */}
        <AffiliateStammdaten affiliate={a} onGespeichert={laden} />

        <PayoutProgress standing={standing} />

        {/* Alles, was der Vermittler selbst tun kann: Auszahlung anfordern,
            Reichweite ablesen, Links und Material holen. Vorher konnte er
            zusehen und sonst nichts. */}
        <VermittlerWerkzeug
          affiliate={a} standing={standing} klicks={klicks} link={link}
          aufFrisch={laden}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Figure
            icon={Wallet} label="Auszahlbar"
            value={euro(standing.payable.amount)}
            sub={`${standing.payable.pairs} Paar`}
          />
          <Figure
            icon={Clock} label="Unterwegs"
            value={euro(standing.pending.amount + standing.confirmed.amount)}
            sub={`${standing.pending.pairs + standing.confirmed.pairs} Paar in Bearbeitung oder Frist`}
          />
          <Figure
            icon={PackageCheck} label="Bereits ausgezahlt"
            value={euro(standing.paid.amount)}
            sub={`${standing.paid.pairs} Paar`}
          />
        </div>

        {/* ── Werbemittel ─────────────────────────────────────────────── */}
        <div className="border border-black/10 bg-white px-6 py-6">
          <p className="text-[10px] uppercase tracking-[0.25em] text-black/30 mb-4">Ihr Link und QR-Code</p>
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="flex-1 min-w-0 w-full">
              <div className="flex items-stretch border border-black/12">
                <span className="flex-1 min-w-0 px-3 py-2.5 text-[12px] text-black/60 font-light truncate">{link}</span>
                <button
                  onClick={copyLink}
                  className="px-4 border-0 border-l border-black/12 bg-transparent text-black/50 hover:text-black hover:bg-black/[0.03] transition-colors"
                  aria-label="Link kopieren"
                >
                  {copied ? <Check size={14} strokeWidth={1.6} /> : <Copy size={14} strokeWidth={1.5} />}
                </button>
              </div>

              {/* Mindestens 44 px hoch — das Portal wird überwiegend auf dem
                  Telefon benutzt, und genau dort wird der Link weitergereicht. */}
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button
                  onClick={shareLink}
                  className="h-12 flex items-center justify-center gap-2 bg-black text-white border border-black text-[11px] tracking-[0.16em] uppercase"
                >
                  <Share2 size={14} strokeWidth={1.5} /> Weitergeben
                </button>
                <a
                  href={`mailto:?subject=${encodeURIComponent('Custom Made Schuhe von Artisan Sole')}&body=${encodeURIComponent(`Mit diesem Link ist mein Code ${a.code} beim Bezahlen schon hinterlegt:\n\n${link}`)}`}
                  className="h-12 flex items-center justify-center gap-2 bg-white text-black/70 border border-black/15 text-[11px] tracking-[0.16em] uppercase no-underline"
                >
                  <Mail size={14} strokeWidth={1.5} /> Per E-Mail
                </a>
              </div>
              <p className="text-[11px] text-black/35 font-light mt-3 leading-relaxed">
                Wer über den Link kommt, hat Ihren Code beim Bezahlen bereits im Warenkorb stehen.
                Er lässt sich dort auch von Hand eingeben — auf einer Karte, im Laden, im Gespräch.
              </p>
              {a.customer_benefit === 'gift' && (
                <p className="text-[11px] text-black/45 font-light mt-2.5 leading-relaxed">
                  Ihre Kunden erhalten {rules.giftName || 'eine Zugabe'} dazu. Dafür werden je Paar
                  {' '}{euro(rules.giftCost)} von Ihrer Provision einbehalten.
                </p>
              )}
              {a.customer_benefit === 'discount' && (
                <p className="text-[11px] text-black/45 font-light mt-2.5 leading-relaxed">
                  Ihre Kunden erhalten {String(a.customer_discount_pct).replace('.', ',')} % Nachlass,
                  höchstens {euro(rules.capPerShoe)} je Paar. Der Nachlass geht von Ihrer Provision ab.
                </p>
              )}
              {(!a.customer_benefit || a.customer_benefit === 'none') && (
                <p className="text-[11px] text-black/45 font-light mt-2.5 leading-relaxed">
                  Ihre Kunden zahlen den Normalpreis — dafür bleibt Ihnen die volle Provision.
                </p>
              )}
            </div>
            {qr && (
              <div className="flex-shrink-0">
                <img src={qr} alt="QR-Code zu Ihrem Werbelink" className="w-32 h-32 border border-black/10" />
                <a
                  href={qr} download={`artisan-sole-${a.code}.png`}
                  className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-black/40 hover:text-black no-underline uppercase tracking-[0.15em]"
                >
                  <Download size={11} strokeWidth={1.5} /> Speichern
                </a>
              </div>
            )}
          </div>
        </div>

        {/* ── Vermittelte Paare ───────────────────────────────────────── */}
        <div className="border border-black/10 bg-white">
          <div className="px-6 pt-6 pb-3">
            <p className="text-[10px] uppercase tracking-[0.25em] text-black/30">Vermittelte Paare</p>
          </div>
          {commissions.length === 0 ? (
            <p className="px-6 pb-6 text-[13px] text-black/35 font-light">
              Noch keine Vermittlung. Sobald jemand mit Ihrem Code bestellt, erscheint sie hier.
            </p>
          ) : (
            <div className="divide-y divide-black/[0.06]">
              {commissions.map(c => {
                const s = STATUS_LABEL[c.status] || { text: c.status, hint: '' }
                return (
                  <div key={c.id} className="px-6 py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[13px] text-black font-light truncate">{c.shoe_name}</p>
                      <p className="text-[11px] text-black/35 font-light mt-0.5">
                        {new Date(c.created_at + 'Z').toLocaleDateString('de-DE')} · {s.text}
                        {c.gift_cost > 0 && ` · ${c.benefit_kind === 'discount' ? 'Nachlass' : 'Zugabe'} −${euro(c.gift_cost)}`}
                      </p>
                    </div>
                    <p className={`text-[13px] font-light flex-shrink-0 ${c.status === 'cancelled' ? 'text-black/25 line-through' : 'text-black'}`}>
                      {euro(c.amount)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Auszahlungen ────────────────────────────────────────────── */}
        {payouts.length > 0 && (
          <div className="border border-black/10 bg-white">
            <div className="px-6 pt-6 pb-3">
              <p className="text-[10px] uppercase tracking-[0.25em] text-black/30">Auszahlungen</p>
            </div>
            <div className="divide-y divide-black/[0.06]">
              {payouts.map(p => (
                <div key={p.id} className="px-6 py-3.5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[13px] text-black font-light">{p.pair_count} Paar</p>
                    <p className="text-[11px] text-black/35 font-light mt-0.5 truncate">
                      {p.paid_at ? new Date(p.paid_at + 'Z').toLocaleDateString('de-DE') : '—'} · {p.document_no || p.reference}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <p className="text-[13px] text-black font-light">{euro(p.amount)}</p>
                    <GutschriftKnopf payout={p} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Die Rechnung in drei Sätzen. Ohne sie wirkt ein Abzug in der Liste
            oben wie ein Fehler — und ohne sie wüsste niemand, dass es sich
            lohnt, nichts zu verschenken. */}
        <div className="border border-black/10 bg-white px-6 py-6">
          <p className="text-[10px] uppercase tracking-[0.25em] text-black/30 mb-4">Wie sich das rechnet</p>
          <p className="text-[13px] text-black/60 font-light leading-relaxed">
            Für jedes vermittelte Paar stehen {String(a.commission_value).replace('.', ',')}
            {a.commission_type === 'fixed' ? ' €' : ' % des Kaufpreises'} bereit, höchstens
            {' '}{euro(rules.capPerShoe)}. Aus diesem Betrag zahlen Sie, was Sie Ihrem Kunden
            zusagen — der Rest wird an Sie ausgezahlt.
          </p>
          <p className="text-[13px] text-black/60 font-light leading-relaxed mt-3">
            Sagen Sie nichts zu, bleibt Ihnen alles. Eine Zugabe kostet ihren Einkaufspreis,
            ein Nachlass kostet genau den Nachlass. Was Sie zusagen, legen Sie fest — sprechen
            Sie uns über die Nachrichten an, wenn Sie es ändern möchten.
          </p>
        </div>

        <p className="text-[11px] text-black/30 font-light leading-relaxed pt-2">
          Ausgezahlt wird nach jeweils {rules.batchSize} vermittelten Paaren. Ein Paar wird
          {' '}{rules.protectionDays} Tage nach Zustellung auszahlbar; wird es zurückgegeben oder
          reklamiert, entfällt die Provision.
        </p>

        {/* Anleitung nach der Anmeldung. Der Bereich zeigt Zahlen — was damit
            zu tun ist, stand nirgends. */}
        <div className="pt-6 border-t border-black/[0.07]">
          <Ablauf
            titel="So arbeiten Sie damit"
            intro="Fünf Schritte, von denen Sie vier einmal machen und einen immer wieder."
            schritte={[
              {
                titel: 'Angaben vervollständigen',
                text: 'Anschrift, Geburtsdatum, Steuernummer und Bankverbindung. Fehlt davon etwas, kann nicht ausgezahlt werden — die Gutschrift braucht die Angaben. Melden Sie sich, wenn etwas geändert werden muss.',
              },
              {
                titel: 'Link oder QR-Code nehmen',
                text: 'Beides steht oben in Ihrem Bereich. Der Link lässt sich per Mail oder Nachricht verschicken, den QR-Code können Sie ausdrucken und auslegen.',
              },
              {
                titel: 'Weitergeben',
                text: 'An wen Sie möchten. Wer über Ihren Link kommt, kauft im regulären Shop; Ihr Code steht sichtbar im Warenkorb, damit die Zuordnung nachvollziehbar bleibt. Auch bestehende Kunden können darüber profitieren — sie müssen den Link nur bekommen haben.',
              },
              {
                titel: 'Paare reifen sehen',
                text: `Jedes vermittelte Paar durchläuft dieselben Stufen: angelegt mit der Bestellung, bestätigt mit der Zustellung, auszahlbar ${rules.protectionDays} Tage danach. In der Liste oben sehen Sie, wo jedes Paar gerade steht.`,
              },
              {
                titel: 'Abrechnung abwarten',
                text: `Sind ${rules.batchSize} Paare auszahlbar, rechnen wir ab, älteste zuerst. Der Rest bleibt stehen und zählt für die nächste Runde weiter.`,
              },
            ]}
            fuss="Kundennamen und Adressen sehen Sie hier nicht. Für die Abrechnung sind sie nicht nötig, und was nicht nötig ist, zeigen wir nicht."
            hell
          />
        </div>
      </div>
    </div>
  )
}
