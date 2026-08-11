/**
 * AffiliateOverview — die Affiliate-Anleitung auf einer Seite.
 *
 * Gegenstück zu /business/uebersicht, gleicher Aufbau: nummerierte Abschnitte,
 * Zahlen groß, druckfreundlich. Wer als Affiliate anfängt, hat drei Fragen —
 * was bekomme ich, wie läuft es ab, und was muss ich dafür liefern. Alle drei
 * stehen hier, damit man sie nachlesen kann, ohne zu fragen.
 */
import { Link } from 'react-router-dom'
import {
  LogIn, Check, Link2, Percent, Wallet, ShieldCheck, Printer, ArrowRight, FileText,
} from 'lucide-react'

const LEISTUNG = [
  { icon: Link2,       t: 'Persönlicher Link',   d: 'Führt auf den regulären Shop, Ihre Empfehlung wird mitgeführt. Dazu ein QR-Code zum Ausdrucken.' },
  { icon: Percent,     t: 'Provision je Paar',   d: 'Prozentual oder als fester Betrag, mit vereinbarter Obergrenze je Paar.' },
  { icon: Wallet,      t: 'Abrechnung im Konto', d: 'Jedes vermittelte Paar mit Stand und Betrag, dazu der Fortschritt bis zur nächsten Auszahlung.' },
  { icon: ShieldCheck, t: 'Ohne stilles Mitlesen', d: 'Der Code steht sichtbar im Warenkorb statt in einem Cookie. Kundendaten sehen Sie nicht.' },
]

const STUFEN = [
  { stufe: 'Angelegt',   d: 'Die Bestellung liegt vor, das Paar geht in die Fertigung.', wann: 'mit der Bestellung' },
  { stufe: 'Bestätigt',  d: 'Zugestellt. Die Schutzfrist läuft, in der reklamiert werden kann.', wann: 'mit der Zustellung' },
  { stufe: 'Auszahlbar', d: 'Frist verstrichen, nichts beanstandet. Das Paar zählt für die nächste Runde.', wann: 'nach der Schutzfrist' },
]

const PROZESS = [
  { n: '01', t: 'Einladung',    d: 'Wir legen Ihr Konto an und schicken Ihnen den Link samt Ihrem Code.' },
  { n: '02', t: 'Aktivierung',  d: 'Passwort festlegen. Danach sind Sie in Ihrem Bereich angemeldet.' },
  { n: '03', t: 'Angaben',      d: 'Anschrift, Geburtsdatum, Steuernummer und Bankverbindung — ohne sie kann nicht ausgezahlt werden.' },
  { n: '04', t: 'Weitergeben',  d: 'Link oder QR-Code an Ihre Kontakte. Auch bestehende Kunden können darüber profitieren.' },
  { n: '05', t: 'Abrechnung',   d: 'Sind fünf Paare auszahlbar, rechnen wir ab, älteste zuerst. Der Rest zählt weiter.' },
]

const UNTERLAGEN = [
  { label: 'Anschrift laut Ausweis',        note: 'für die Gutschrift und zur eindeutigen Zuordnung' },
  { label: 'Geburtsdatum',                  note: 'trennt Namensgleiche' },
  { label: 'Steuernummer oder USt-IdNr.',   note: 'je nachdem, ob Sie Umsatzsteuer ausweisen' },
  { label: 'IBAN und Kontoinhaber',         note: 'ohne beides ist keine Auszahlung möglich' },
]

export default function AffiliateOverview() {
  const eyebrow      = 'text-[10px] uppercase tracking-[0.32em] text-stone-400'
  const h2cls        = 'text-[23px] lg:text-[30px] font-extralight text-stone-900 tracking-tight leading-[1.12]'
  const lead         = 'text-[13px] lg:text-[14px] text-stone-500 font-light leading-relaxed'
  const card         = 'bg-white border border-stone-200/80 p-6 lg:p-7 transition-colors duration-300 hover:border-stone-300'
  const sectionLabel = 'text-[10px] uppercase tracking-[0.32em] text-stone-400 mb-3'

  return (
    <div className="min-h-full bg-white text-stone-900">
      <div className="sticky top-0 z-30 flex items-center justify-between px-5 lg:px-10 py-4 bg-white/85 backdrop-blur-md border-b border-stone-200/70 print:hidden">
        <Link to="/" className="font-brand text-[15px] tracking-[0.04em] no-underline text-stone-900">
          ARTISAN SOLE
        </Link>
        <Link
          to="/login"
          className="flex items-center gap-1.5 text-[11px] text-stone-500 hover:text-stone-900 no-underline uppercase tracking-[0.18em] transition-colors"
        >
          <LogIn size={15} strokeWidth={1.4} /> Affiliate-Login
        </Link>
      </div>

      <section className="px-5 lg:px-8 pt-14 lg:pt-20 pb-10 lg:pb-14 border-b border-stone-200/60">
        <div className="max-w-4xl mx-auto text-center">
          <p className={`${eyebrow} mb-4`}>Für Affiliate · auf einen Blick</p>
          <h1 className="text-[28px] lg:text-[42px] font-extralight text-stone-900 leading-[1.08] tracking-tight">
            Empfehlen und daran verdienen.
            <br />
            <span className="text-stone-500">Konditionen und Ablauf, kompakt.</span>
          </h1>
          <p className={`${lead} mt-5 max-w-xl mx-auto`}>
            Alles, was Sie zum Anfangen brauchen, auf einer Seite: was Sie bekommen,
            wie eine Provision reift und welche Angaben wir für die Abrechnung benötigen.
          </p>
        </div>
      </section>

      <section className="px-5 lg:px-8 py-12 lg:py-16">
        <div className="max-w-5xl mx-auto">
          <p className={sectionLabel}>01 · Leistungsumfang</p>
          <h2 className={h2cls}>Was Sie bekommen</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            {LEISTUNG.map(l => {
              const Icon = l.icon
              return (
                <div key={l.t} className={card}>
                  <Icon size={22} strokeWidth={1.3} className="text-stone-700 mb-4" />
                  <p className="text-[13px] text-stone-900 font-light mb-1.5">{l.t}</p>
                  <p className="text-[12px] text-stone-500 font-light leading-relaxed">{l.d}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Die Stufen sind der Teil, an dem sonst die meisten Rückfragen
          entstehen: „Warum ist das Paar noch nicht ausgezahlt?" */}
      <section className="px-5 lg:px-8 py-12 lg:py-16 bg-stone-50/60 border-y border-stone-200/60">
        <div className="max-w-4xl mx-auto">
          <p className={sectionLabel}>02 · Vergütung</p>
          <h2 className={h2cls}>Wie eine Provision reift</h2>
          <p className={`${lead} mt-4 max-w-xl`}>
            Ein vermitteltes Paar wird nicht sofort ausgezahlt. Es durchläuft drei Stufen —
            erst danach zählt es für eine Abrechnung. Wird zurückgegeben oder reklamiert,
            entfällt die Provision.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
            {STUFEN.map((s, i) => (
              <div key={s.stufe} className={`${card} text-center`}>
                <p className="text-[10px] uppercase tracking-[0.25em] text-stone-400 mb-3">Stufe {i + 1}</p>
                <p className="text-[20px] lg:text-[23px] font-extralight text-stone-900 tracking-tight">{s.stufe}</p>
                <p className="text-[11px] text-stone-400 font-light mt-1">{s.wann}</p>
                <p className="text-[12px] text-stone-500 font-light leading-relaxed mt-3">{s.d}</p>
              </div>
            ))}
          </div>
          <p className={`${lead} mt-8 max-w-xl`}>
            Ausgezahlt wird in Fünferschritten: Sind fünf Paare auszahlbar, rechnen wir ab,
            älteste zuerst. Was übrig bleibt, zählt für die nächste Runde weiter.
          </p>
          <p className="text-[12px] text-stone-500 font-light leading-relaxed mt-4 max-w-xl">
            <span className="text-stone-900">Zugabe und Nachlass sind zweierlei.</span>{' '}
            Ein Nachlass für den Geworbenen geht zulasten des Hauses. Eine Zugabe wie der
            Zedernholz-Spanner wird zum Einkaufspreis von Ihrer Provision abgezogen. Was
            davon für Sie gilt, steht in Ihren Konditionen.
          </p>
        </div>
      </section>

      <section className="px-5 lg:px-8 py-12 lg:py-16">
        <div className="max-w-5xl mx-auto">
          <p className={sectionLabel}>03 · Ablauf</p>
          <h2 className={h2cls}>Vom Konto bis zur Auszahlung</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mt-10">
            {PROZESS.map(s => (
              <div key={s.n}>
                <p className="text-[34px] font-extralight text-stone-300 leading-none mb-3">{s.n}</p>
                <p className="text-[13px] text-stone-900 font-light mb-1.5">{s.t}</p>
                <p className="text-[12px] text-stone-500 font-light leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 lg:px-8 py-12 lg:py-16 bg-stone-50/60 border-y border-stone-200/60">
        <div className="max-w-4xl mx-auto">
          <p className={sectionLabel}>04 · Unterlagen</p>
          <h2 className={h2cls}>Was wir für die Abrechnung brauchen</h2>
          <p className={`${lead} mt-4 max-w-xl`}>
            Wir stellen die Gutschrift aus, nicht Sie die Rechnung. Dafür müssen die
            Angaben stimmen — fehlt eine davon, bleibt die Auszahlung gesperrt.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 max-w-2xl">
            {UNTERLAGEN.map(u => (
              <div key={u.label} className="flex items-start gap-2.5 text-[12px] text-stone-600 font-light">
                <Check size={14} strokeWidth={1.6} className="text-stone-400 mt-0.5 shrink-0" />
                <span><span className="text-stone-900">{u.label}</span>, {u.note}</span>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-2.5 mt-8 max-w-xl">
            <FileText size={14} strokeWidth={1.5} className="text-stone-400 mt-0.5 shrink-0" />
            <p className="text-[12px] text-stone-500 font-light leading-relaxed">
              Sind Sie Kleinunternehmer nach § 19 UStG, genügt die Steuernummer. Weisen Sie
              Umsatzsteuer aus, brauchen wir zusätzlich die USt-IdNr. — sie gehört auf die
              Gutschrift.
            </p>
          </div>
        </div>
      </section>

      <section className="px-5 lg:px-8 py-14 lg:py-20 print:hidden">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className={h2cls}>Fragen offen?</h2>
          <p className={`${lead} mt-4 max-w-lg mx-auto`}>
            Zu Konditionen, Abrechnung oder einer bestehenden Zusammenarbeit — schreiben
            Sie uns, wir antworten per E-Mail.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <Link
              to="/#anfrage"
              className="h-12 px-7 inline-flex items-center gap-2 bg-stone-900 text-white no-underline hover:bg-stone-800 transition-colors"
              style={{ letterSpacing: '0.18em', textTransform: 'uppercase', fontSize: '12px' }}
            >
              Anfrage senden <ArrowRight size={15} strokeWidth={1.6} />
            </Link>
            <button
              type="button"
              onClick={() => window.print()}
              className="h-12 px-7 inline-flex items-center gap-2 bg-white text-stone-900 border border-stone-300 hover:border-stone-900 transition-colors"
              style={{ letterSpacing: '0.18em', textTransform: 'uppercase', fontSize: '12px' }}
            >
              <Printer size={15} strokeWidth={1.5} /> Seite drucken
            </button>
          </div>
        </div>
      </section>

      <footer className="px-5 lg:px-8 py-9 bg-white border-t border-stone-200/70">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <Link to="/" className="font-brand text-[13px] tracking-[0.04em] no-underline text-stone-900">ARTISAN SOLE</Link>
          <p className="text-[10px] text-stone-400 uppercase tracking-[0.2em]">Custom Made Footwear · Made in Spain</p>
        </div>
      </footer>
    </div>
  )
}
