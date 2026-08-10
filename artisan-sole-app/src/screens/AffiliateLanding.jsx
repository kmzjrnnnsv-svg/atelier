/**
 * AffiliateLanding — affiliate.artisansole.com für Nichtangemeldete.
 *
 * Bis hierher führte die Adresse direkt auf die Anmeldemaske. Wer den
 * Vermittlerbereich zum ersten Mal aufruft, sieht dann ein Formular und keine
 * Erklärung — und wer bereits eingeladen wurde, weiß nicht, ob er hier
 * richtig ist. Diese Seite erklärt beides und führt dann zur Anmeldung.
 *
 * Bewusst ohne Bewerbungsformular: Vermittler werden angesprochen, nicht
 * angemeldet. Der Code ist Teil der Außenwirkung, seine Vergabe bleibt beim
 * Haus.
 */
import { Link } from 'react-router-dom'
import { LogIn, Link2, Percent, Wallet, ShieldCheck } from 'lucide-react'
import Ablauf from '../components/Ablauf'

const MERKMALE = [
  { icon: Link2, titel: 'Ein Link, ein QR-Code', text: 'Beides finden Sie nach der Anmeldung in Ihrem Bereich. Der Link führt auf den regulären Shop — Ihre Empfehlung wird dabei mitgeführt.' },
  { icon: Percent, titel: 'Provision je vermitteltem Paar', text: 'Prozentual oder als fester Betrag, mit einer vereinbarten Obergrenze je Paar. Ihre Konditionen stehen in Ihrem Bereich.' },
  { icon: Wallet, titel: 'Auszahlung in Fünferschritten', text: 'Sind fünf Paare auszahlbar, wird abgerechnet. Was übrig bleibt, zählt für die nächste Runde weiter.' },
  { icon: ShieldCheck, titel: 'Nachvollziehbar, ohne stilles Mitlesen', text: 'Der Code steht sichtbar im Warenkorb, statt in einem Cookie zu stecken. Kundennamen und Adressen sehen Sie nicht — für die Abrechnung sind sie nicht nötig.' },
]

export default function AffiliateLanding() {
  return (
    <div className="min-h-[100dvh] bg-white text-stone-900">
      <div className="sticky top-0 z-30 flex items-center justify-between px-5 lg:px-10 py-4 bg-white/85 backdrop-blur-md border-b border-stone-200/70">
        <span className="font-brand text-[15px] tracking-[0.04em]">ARTISAN SOLE</span>
        <Link
          to="/login"
          className="flex items-center gap-1.5 text-[11px] text-stone-500 hover:text-stone-900 no-underline uppercase tracking-[0.18em] transition-colors"
        >
          <LogIn size={15} strokeWidth={1.4} /> Vermittler-Login
        </Link>
      </div>

      <section className="px-5 lg:px-10 pt-16 pb-14 max-w-5xl mx-auto">
        <p className="text-[10px] uppercase tracking-[0.32em] text-stone-400 mb-4">Vermittler</p>
        <h1 className="text-[28px] lg:text-[38px] font-extralight tracking-tight leading-[1.1] max-w-2xl">
          Sie empfehlen. Wir fertigen. Beide verdienen daran.
        </h1>
        <p className="text-[13px] lg:text-[14px] text-stone-500 font-light leading-relaxed max-w-2xl mt-5">
          Ein Vermittlerkonto ist kein Werbenetzwerk. Es ist eine Vereinbarung zwischen
          Ihnen und dem Haus: Sie geben Ihren Link weiter, wer darüber bestellt, bekommt
          die zugesagte Kondition, und Sie erhalten Ihre Provision. Wir sprechen
          Vermittler an — bewerben können Sie sich nicht, und das ist Absicht.
        </p>
        <div className="flex flex-wrap items-center gap-3 mt-8">
          <Link
            to="/login"
            className="h-12 px-7 inline-flex items-center gap-2 bg-stone-900 text-white no-underline"
            style={{ letterSpacing: '0.18em', textTransform: 'uppercase', fontSize: '12px' }}
          >
            <LogIn size={15} strokeWidth={1.5} /> Zum Vermittler-Login
          </Link>
          <p className="text-[11px] text-stone-400 font-light">
            Einladung erhalten? Der Link darin führt direkt zur Aktivierung.
          </p>
        </div>
      </section>

      <section className="px-5 lg:px-10 pb-16 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-stone-200/70 border border-stone-200/70">
          {MERKMALE.map(m => {
            const Icon = m.icon
            return (
              <div key={m.titel} className="bg-white p-7">
                <Icon size={20} strokeWidth={1.3} className="text-stone-500 mb-4" />
                <p className="text-[14px] text-stone-900 mb-1.5">{m.titel}</p>
                <p className="text-[11px] text-stone-500 font-light leading-relaxed">{m.text}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="px-5 lg:px-10 pb-20 max-w-5xl mx-auto">
        <Ablauf
          titel="Vom Konto bis zur Auszahlung"
          intro="Sechs Schritte, von denen Sie fünf einmal machen und einen immer wieder."
          schritte={[
            {
              titel: 'Einladung erhalten',
              text: 'Wir legen Ihr Konto an und schicken Ihnen einen Link. Darin steht auch Ihr Code — der Name, unter dem Sie empfehlen.',
            },
            {
              titel: 'Konto aktivieren',
              text: 'Passwort festlegen, fertig. Danach sind Sie hier angemeldet. Für die Abrechnung brauchen wir Anschrift, Geburtsdatum, Steuernummer und Bankverbindung; fehlt davon etwas, holen wir es nach.',
            },
            {
              titel: 'Link und QR-Code abholen',
              text: 'Beide stehen in Ihrem Bereich. Der QR-Code lässt sich ausdrucken und auslegen, der Link per Mail oder Nachricht weitergeben.',
            },
            {
              titel: 'Weitergeben',
              text: 'An wen Sie möchten. Wer über Ihren Link kommt, kauft im regulären Shop — mit der Kondition, die Sie ihm zugesagt bekommen haben. Auch bestehende Kunden können darüber profitieren, sie müssen den Link nur bekommen haben.',
            },
            {
              titel: 'Paare reifen lassen',
              text: 'Jedes vermittelte Paar durchläuft dieselben Stufen: angelegt mit der Bestellung, bestätigt mit der Zustellung, auszahlbar nach der Schutzfrist. Wird zurückgegeben oder reklamiert, entfällt die Provision.',
            },
            {
              titel: 'Abrechnung erhalten',
              text: 'Sind fünf Paare auszahlbar, rechnen wir ab, älteste zuerst. Sie sehen jederzeit, wie viele Paare offen sind und was noch bis zur nächsten Runde fehlt.',
            },
          ]}
          fuss="Zugabe und Nachlass sind zweierlei. Ein Nachlass für den Geworbenen geht zulasten des Hauses; eine Zugabe wie der Zedernholz-Spanner wird zum Einkaufspreis von Ihrer Provision abgezogen. Was davon für Sie gilt, steht in Ihren Konditionen."
          hell
        />
      </section>

      <footer className="px-5 lg:px-10 py-9 bg-white border-t border-stone-200/70">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-brand text-[13px] tracking-[0.04em]">ARTISAN SOLE</span>
          <p className="text-[10px] text-stone-400 uppercase tracking-[0.2em]">Custom Made Footwear · Made in Spain</p>
        </div>
      </footer>
    </div>
  )
}
