/**
 * CorporateOverview.jsx, öffentliche B2B-Unterseite zu /business.
 * Kompakte einseitige Preis- und Prozessübersicht für Firmenkunden,
 * Custom-made-Wording, druckfreundlich.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  LogIn, Send, MessageCircle, Check,
  Footprints, MapPin, Gem, PenTool, Award, Leaf,
} from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'

const LEISTUNG = [
  { icon: Footprints, t: 'Custom Made',          d: 'Auf Bestellung gefertigt, abgestimmt auf Fußmaße und Konfiguration.' },
  { icon: MapPin,     t: 'Spanische Manufaktur', d: 'Einzeln gefertigt in traditionsreicher Manufaktur in Spanien.' },
  { icon: Gem,        t: 'Premium-Leder',        d: 'Ausschließlich hochwertige Kalbs- und Premiumleder.' },
  { icon: PenTool,    t: 'Ihr Logo, optional',   d: 'Auf Wunsch dezent auf der Sohle, in feiner Handarbeit.' },
]

const PREISE = [
  { tier: 'Loafer',                price: 'ab € 280',  note: 'z. B. The Riviera Loafer, custom-made' },
  { tier: 'Oxford, Derby & Monk',  price: 'ab € 380',  note: 'klassische Business-Modelle' },
  { tier: 'Boots & Chelsea',       price: 'bis € 520', note: 'Chelsea, Balmoral, Statement-Stücke' },
]

const ZUSATZ = [
  { label: 'Firmenlogo auf der Sohle',   note: 'in feiner Handarbeit ausgeführt' },
  { label: 'Geschenkverpackung',          note: 'edle Schuhbox, optional gravierte Karte' },
  { label: 'Schuhspanner aus Zedernholz', note: 'verlängert die Lebensdauer spürbar' },
  { label: 'Lederpflege-Kit',             note: 'alle Komponenten für Reinigung und Pflege' },
]

const PROZESS = [
  { n: '01', t: 'Anfrage',              d: 'Sie senden uns Vorhaben und Anzahl, per Formular oder WhatsApp.' },
  { n: '02', t: 'Persönliches Angebot', d: 'Wir melden uns mit einem passenden Vorschlag, abgestimmt auf Modell, Logo und Größe.' },
  { n: '03', t: 'Konfiguration',        d: 'Mitarbeitende konfigurieren ihren Schuh per Code oder werden zentral betreut.' },
  { n: '04', t: 'Produktion',           d: 'Jedes Paar wird custom-made und erst auf Bestellung in Spanien gefertigt.' },
  { n: '05', t: 'Lieferung',            d: 'Einzelbestellungen bis zu 4 Wochen, größere Sammelbestellungen bis zu 8 Wochen, jeweils nach Zahlungseingang. Lieferung an Empfänger oder zentral an Sie.' },
]

const QUALITAET = [
  { icon: Footprints, t: 'Aus zwei Maßen',          d: 'Fußlänge und Ballenumfang reichen, alles Weitere bestimmen wir.' },
  { icon: Award,      t: 'Hunderte Leisten',        d: 'Wir wählen die exakt passende aus unserer Leisten-Bibliothek.' },
  { icon: Check,      t: 'Bis zu 100 % passgenau',  d: 'Auf den Fuß abgestimmt, ganz ohne klassische Konfektionsgröße.' },
]

export default function CorporateOverview() {
  const [waNumber, setWaNumber] = useState('+4915126936500')

  useEffect(() => {
    apiFetch('/api/settings/whatsapp')
      .then(r => { if (r?.number) setWaNumber(r.number) })
      .catch(() => {})
  }, [])

  const waLink = (() => {
    if (!waNumber) return null
    const normalized = waNumber.replace(/[^0-9+]/g, '').replace(/^\+/, '')
    const text = 'Guten Tag Artisan Sole, wir interessieren uns für Custom-made Schuhe für unser Unternehmen.'
    return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`
  })()

  const eyebrow      = 'text-[10px] uppercase tracking-[0.32em] text-stone-400'
  const h2cls        = 'text-[23px] lg:text-[30px] font-extralight text-stone-900 tracking-tight leading-[1.12]'
  const lead         = 'text-[13px] lg:text-[14px] text-stone-500 font-light leading-relaxed'
  const card         = 'bg-white border border-stone-200/80 p-6 lg:p-7 transition-colors duration-300 hover:border-stone-300'
  const sectionLabel = 'text-[10px] uppercase tracking-[0.32em] text-stone-400 mb-3'

  return (
    <div className="min-h-full bg-white text-stone-900">
      {/* Top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-5 lg:px-10 py-4 bg-white/85 backdrop-blur-md border-b border-stone-200/70 print:hidden">
        <Link to="/business" className="font-brand text-[15px] tracking-[0.04em] no-underline text-stone-900">
          ARTISAN SOLE
        </Link>
        <Link
          to="/login"
          className="flex items-center gap-1.5 text-[11px] text-stone-500 hover:text-stone-900 no-underline uppercase tracking-[0.18em] transition-colors"
        >
          <LogIn size={15} strokeWidth={1.4} /> Firmen-Login
        </Link>
      </div>

      {/* Header */}
      <section className="px-5 lg:px-8 pt-14 lg:pt-20 pb-10 lg:pb-14 border-b border-stone-200/60">
        <div className="max-w-4xl mx-auto text-center">
          <p className={`${eyebrow} mb-4`}>Für Unternehmen · auf einen Blick</p>
          <h1 className="text-[28px] lg:text-[42px] font-extralight text-stone-900 leading-[1.08] tracking-tight">
            Custom Made für Ihr Team.
            <br />
            <span className="text-stone-500">Preise und Prozess, kompakt.</span>
          </h1>
          <p className={`${lead} mt-5 max-w-xl mx-auto`}>
            Alles, was Sie für eine Entscheidung brauchen, ohne Telefonat. Leistungsumfang,
            Preise und Ablauf für Sie und Ihre Mitarbeitenden auf einer Seite.
          </p>
        </div>
      </section>

      {/* 01 Leistungsumfang */}
      <section className="px-5 lg:px-8 py-12 lg:py-16">
        <div className="max-w-5xl mx-auto">
          <p className={sectionLabel}>01 · Leistungsumfang</p>
          <h2 className={h2cls}>Was Sie bekommen</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            {LEISTUNG.map(({ icon: Icon, t, d }) => (
              <div key={t} className={card}>
                <Icon size={22} strokeWidth={1.3} className="text-stone-700 mb-4" />
                <p className="text-[13px] text-stone-900 font-light mb-1.5">{t}</p>
                <p className="text-[12px] text-stone-500 font-light leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 02 Preise */}
      <section className="px-5 lg:px-8 py-12 lg:py-16 bg-stone-50/60 border-y border-stone-200/60">
        <div className="max-w-4xl mx-auto">
          <p className={sectionLabel}>02 · Preise</p>
          <h2 className={h2cls}>Ab-Preise pro Paar</h2>
          <p className={`${lead} mt-4 max-w-xl`}>
            Endpreis je nach Modell, Leder und Vorhabensgröße. Konditionen für Ihr
            Vorhaben nennen wir im persönlichen Angebot.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
            {PREISE.map(p => (
              <div key={p.tier} className={`${card} text-center`}>
                <p className="text-[10px] uppercase tracking-[0.25em] text-stone-400 mb-3">{p.tier}</p>
                <p className="text-[28px] lg:text-[32px] font-extralight text-stone-900 tracking-tight">{p.price}</p>
                <p className="text-[11px] text-stone-500 font-light mt-2">{p.note}</p>
              </div>
            ))}
          </div>
          <p className={`${eyebrow} mt-10 mb-3`}>Optionen und Extras</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
            {ZUSATZ.map(z => (
              <div key={z.label} className="flex items-start gap-2.5 text-[12px] text-stone-600 font-light">
                <Check size={14} strokeWidth={1.6} className="text-stone-400 mt-0.5 shrink-0" />
                <span><span className="text-stone-900">{z.label}</span>, {z.note}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 03 Prozess */}
      <section className="px-5 lg:px-8 py-12 lg:py-16">
        <div className="max-w-5xl mx-auto">
          <p className={sectionLabel}>03 · Prozess</p>
          <h2 className={h2cls}>Vom Erstkontakt zum Schuh am Fuß</h2>
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

      {/* 04 Mitarbeiter-Wege */}
      <section className="px-5 lg:px-8 py-12 lg:py-16 bg-stone-50/60 border-y border-stone-200/60">
        <div className="max-w-5xl mx-auto">
          <p className={sectionLabel}>04 · Mitarbeiter-Ablauf</p>
          <h2 className={h2cls}>Zwei Wege, je nach Vorhaben</h2>
          <p className={`${lead} mt-4 max-w-xl`}>
            Beide Wege enden im selben Ergebnis: custom-made Schuhe, exakt passend.
            Welcher Weg für Ihr Team passt, klären wir gemeinsam.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-8">
            <div className={card}>
              <p className="text-[10px] uppercase tracking-[0.25em] text-stone-400 mb-2">Weg A</p>
              <h3 className="text-[18px] font-extralight text-stone-900 tracking-tight mb-3">Self-Service mit Einlöse-Code</h3>
              <p className="text-[12px] text-stone-500 font-light leading-relaxed">
                Ihre Mitarbeitenden erhalten einen persönlichen Code, vermessen ihren Fuß
                bequem per Foto-Scan und konfigurieren ihren Schuh selbst: Modell, Leder, Sohle.
              </p>
              <ul className="mt-4 space-y-1.5 text-[11px] text-stone-600 font-light">
                <li>· Zeitlich und örtlich flexibel</li>
                <li>· Ideal für verteilte Teams</li>
                <li>· Volle Kontrolle über Budget und Auswahl</li>
              </ul>
            </div>
            <div className={card}>
              <p className="text-[10px] uppercase tracking-[0.25em] text-stone-400 mb-2">Weg B</p>
              <h3 className="text-[18px] font-extralight text-stone-900 tracking-tight mb-3">Zentral betreut</h3>
              <p className="text-[12px] text-stone-500 font-light leading-relaxed">
                Wir vermessen vor Ort oder beraten zentral, die Bestellung läuft über Ihre
                Personalstelle. Ein Ansprechpartner, eine Sammelrechnung, klare Logistik.
              </p>
              <ul className="mt-4 space-y-1.5 text-[11px] text-stone-600 font-light">
                <li>· Persönliches Erlebnis vor Ort</li>
                <li>· Ein zentraler Ansprechpartner</li>
                <li>· Sammelrechnung, einfache Buchhaltung</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 05 Passform */}
      <section className="px-5 lg:px-8 py-12 lg:py-16">
        <div className="max-w-4xl mx-auto">
          <p className={sectionLabel}>05 · Passform und Qualität</p>
          <h2 className={h2cls}>Bis zu 100 % passgenau, ohne Konfektionsgröße</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
            {QUALITAET.map(({ icon: Icon, t, d }) => (
              <div key={t} className={card}>
                <Icon size={22} strokeWidth={1.3} className="text-stone-700 mb-4" />
                <p className="text-[13px] text-stone-900 font-light mb-1.5">{t}</p>
                <p className="text-[12px] text-stone-500 font-light leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 06 Nachhaltigkeit */}
      <section className="px-5 lg:px-8 py-12 lg:py-16 bg-stone-50/60 border-y border-stone-200/60">
        <div className="max-w-3xl mx-auto text-center">
          <Leaf size={26} strokeWidth={1.3} className="text-stone-500 mx-auto mb-5" />
          <p className={sectionLabel}>06 · Nachhaltigkeit</p>
          <h2 className={h2cls}>Made to Order, Paar für Paar</h2>
          <p className={`${lead} mt-5 max-w-xl mx-auto`}>
            Wir fertigen jedes Paar erst, nachdem Sie bestellt haben. Keine Überproduktion,
            kein Lagerüberschuss, jeder Schuh wird gezielt für einen Empfänger gefertigt.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 lg:px-8 py-14 lg:py-20 print:hidden">
        <div className="max-w-2xl mx-auto text-center">
          <p className={sectionLabel}>Nächster Schritt</p>
          <h2 className={h2cls}>Anfrage stellen</h2>
          <p className={`${lead} mt-4 max-w-md mx-auto`}>
            Schildern Sie uns kurz Ihr Vorhaben. Wir melden uns persönlich mit einem
            passenden Vorschlag, unverbindlich.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch justify-center gap-3 mt-8 max-w-md mx-auto">
            <Link
              to="/business#anfrage"
              className="flex-1 h-12 inline-flex items-center justify-center gap-2 bg-stone-900 text-white no-underline hover:bg-stone-800 transition-colors"
              style={{ letterSpacing: '0.2em', textTransform: 'uppercase', fontSize: '12px' }}
            >
              <Send size={15} strokeWidth={1.5} /> Anfrage senden
            </Link>
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 h-12 inline-flex items-center justify-center gap-2 bg-white text-stone-900 border border-stone-300 hover:border-stone-900 transition-colors no-underline"
                style={{ letterSpacing: '0.2em', textTransform: 'uppercase', fontSize: '12px' }}
              >
                <MessageCircle size={15} strokeWidth={1.5} /> WhatsApp
              </a>
            )}
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="mt-6 text-[10px] text-stone-400 hover:text-stone-700 uppercase tracking-[0.2em] bg-transparent border-0"
          >
            Seite drucken
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-5 lg:px-8 py-9 bg-white border-t border-stone-200/70">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-brand text-[13px] tracking-[0.04em] text-stone-900">ARTISAN SOLE</span>
          <div className="flex items-center gap-5">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-[10px] text-stone-400 hover:text-stone-700 no-underline uppercase tracking-[0.2em] transition-colors print:hidden"
            >
              <LogIn size={13} strokeWidth={1.4} /> Bereits Firmenkunde? Zum Firmen-Login
            </Link>
            <p className="text-[10px] text-stone-400 uppercase tracking-[0.2em]">Custom Made Footwear · Made in Spain</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
