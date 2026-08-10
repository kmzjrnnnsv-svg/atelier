/**
 * CorporateGifting.jsx, business.artisansole.com Einstieg.
 *
 * Öffentliche B2B-Seite (use-case-neutral): Custom-made Schuhe als Corporate
 * Benefit, Mitarbeiter-, Kunden- oder Partnergeschenk oder für sonstige
 * Anlässe. Unternehmen senden eine Anfrage (Formular oder WhatsApp) und
 * erhalten ein Firmenkonto, in dem sie ihr Logo (für die Sohle) hinterlegen
 * und künftig Einmal-Codes verwalten. Anfragen laufen über das bestehende
 * custom_requests-System (kein Login nötig) und erscheinen im CMS.
 */
import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Check, Send, MapPin, Gem, Footprints, PenTool, Package, MessageCircle, ArrowRight, LogIn, Gift, Heart, Handshake, Award, Building2 } from 'lucide-react'
import { apiFetch } from '../hooks/useApi'
import useStore from '../store/store'
import Ablauf from '../components/Ablauf'

const IMG_API_BASE = import.meta.env.VITE_API_URL || ''
const resolveImg = (url) => {
  if (!url) return null
  if (url.startsWith('http') || url.startsWith('data:')) return url
  return `${IMG_API_BASE}${url}`
}

// Office-taugliche Kategorien für den Katalog.
const OFFICE_CATEGORIES = ['OXFORD', 'WHOLECUT', 'DERBY', 'MONK', 'DOUBLE_MONK', 'LOAFER', 'BALMORAL']

const USE_CASES = [
  { icon: Award,     title: 'Corporate Benefit',          desc: 'Ein Benefit, der jeden Tag getragen wird, hochwertiger als jeder Gutschein und persönlicher als jede Prämie.' },
  { icon: Gift,      title: 'Mitarbeitergeschenke',        desc: 'Willkommen für neue Kolleginnen und Kollegen, Dank für langjährige Weggefährten, Jubiläum oder Jahresende.' },
  { icon: Handshake, title: 'Kunden- & Partnergeschenke',  desc: 'Wertschätzung, die in Erinnerung bleibt, für Schlüsselkunden, Partner und Wegbegleiter Ihres Unternehmens.' },
  { icon: Heart,     title: 'Weitere Anlässe',             desc: 'Auszeichnungen, Meilensteine, Events oder Incentives. Sie bestimmen den Anlass, wir liefern das Handwerk.' },
]

const VALUES = [
  { icon: Footprints, title: 'Präzise Passform',       desc: 'Aus Fußlänge und Ballenumfang fertigen wir jeden Schuh in der passenden Länge und Weite, auf wenige Millimeter genau. Kein Schätzen, kein Umtausch.' },
  { icon: MapPin,     title: 'Spanische Manufaktur',   desc: 'Jedes Paar entsteht einzeln auf Bestellung in einer traditionsreichen Manufaktur in Spanien, Schuhmacherhandwerk, wie es sein soll.' },
  { icon: Gem,        title: 'Feinste Leder',          desc: 'Ausschließlich hochwertige Kalbs- und Premiumleder: edel im Griff, langlebig im Tragen und mit den Jahren nur schöner.' },
  { icon: PenTool,    title: 'Ihr Logo, dezent veredelt', desc: 'Auf Wunsch mit Ihrem Firmenlogo, Initialen oder Monogramm, etwa auf der Sohle, in feiner Handarbeit ausgeführt.' },
  { icon: Building2,  title: 'Auf Wunsch ein Firmenkonto', desc: 'Für wiederkehrende Vorhaben richten wir Ihnen ein Firmenkonto ein: Logo hinterlegen, Profil pflegen und Einlöse-Codes verwalten.' },
  { icon: Package,    title: 'Für Teams jeder Größe',   desc: 'Vom kleinen Team bis zur großen Belegschaft, Konditionen und Ablauf stimmen wir individuell auf Ihr Vorhaben ab.' },
]

export default function CorporateGifting() {
  const { shoes } = useStore()
  const formRef = useRef(null)
  const [form, setForm] = useState({ company: '', name: '', email: '', phone: '', occasion: '', quantity: '', message: '' })
  const [selectedDesign, setSelectedDesign] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)
  const [waNumber, setWaNumber] = useState('+4915126936500')

  useEffect(() => {
    apiFetch('/api/settings/whatsapp')
      .then(r => { if (r?.number) setWaNumber(r.number) })
      .catch(() => {})
  }, [])

  const officeShoes = (Array.isArray(shoes) ? shoes : []).filter(s => OFFICE_CATEGORIES.includes(s.category))

  const buildWhatsAppLink = () => {
    if (!waNumber) return null
    const normalized = waNumber.replace(/[^0-9+]/g, '').replace(/^\+/, '')
    const lines = [
      'Guten Tag Artisan Sole, wir interessieren uns für Custom-made Schuhe für unser Unternehmen.',
      form.company.trim() && `Firma: ${form.company.trim()}`,
      selectedDesign && `Design: ${selectedDesign}`,
      form.quantity.trim() && `Stückzahl: ${form.quantity.trim()}`,
      form.occasion.trim() && `Anlass: ${form.occasion.trim()}`,
      form.message.trim() && `\n${form.message.trim()}`,
    ].filter(Boolean).join('\n')
    return `https://wa.me/${normalized}?text=${encodeURIComponent(lines)}`
  }
  const waLink = buildWhatsAppLink()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const emailValid = /\S+@\S+\.\S+/.test(form.email)
  // Telefon ist freiwillig — wer angerufen werden möchte, trägt es ein. Steht
  // etwas drin, muss es aber eine Nummer sein: Dieselbe Regel wie im Server
  // (routes/customRequests.js), damit „test" hier auffällt und nicht erst als
  // Absage zurückkommt, nachdem alles ausgefüllt war.
  const phoneValid = !form.phone.trim() || /^[+0-9 ()/-]{6,}$/.test(form.phone.trim())
  const valid = form.company.trim() && form.name.trim() && emailValid && phoneValid && form.message.trim()
  // Was fehlt noch? (für den Hinweis am deaktivierten Button)
  const missing = [
    !form.company.trim() && 'Firma',
    !form.name.trim() && 'Ansprechpartner',
    !form.email.trim() ? 'E-Mail' : (!emailValid && 'gültige E-Mail'),
    !phoneValid && 'gültige Telefonnummer',
    !form.message.trim() && 'Nachricht',
  ].filter(Boolean)
  const started = !!(form.company || form.name || form.email || form.phone)

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const chooseDesign = (name) => {
    setSelectedDesign(name)
    scrollToForm()
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!valid || sending) return
    setSending(true); setError(null)
    try {
      const notes = [
        `Firma: ${form.company.trim()}`,
        selectedDesign && `Design: ${selectedDesign}`,
        form.occasion.trim() && `Anlass: ${form.occasion.trim()}`,
        form.quantity.trim() && `Stückzahl: ${form.quantity.trim()}`,
        form.message.trim() && `\n${form.message.trim()}`,
      ].filter(Boolean).join('\n')
      await apiFetch('/api/custom-requests', {
        method: 'POST',
        body: JSON.stringify({
          customer_name: form.name.trim(),
          customer_email: form.email.trim(),
          customer_phone: form.phone.trim() || undefined,
          shoe_name: 'Corporate Gifting',
          notes,
          source: 'business',
        }),
      })
      setSent(true)
    } catch (e) {
      setError(e?.error || 'Ihre Anfrage konnte nicht gesendet werden. Bitte versuchen Sie es erneut.')
    } finally { setSending(false) }
  }

  const inputCls = 'w-full border border-stone-300 px-3.5 py-3 text-[14px] bg-white outline-none focus:border-stone-900 transition-colors font-light text-stone-900 placeholder-stone-400'
  const labelCls = 'block text-[10px] text-stone-400 uppercase tracking-[0.18em] mb-1.5 font-light'
  const eyebrow  = 'text-[10px] uppercase tracking-[0.32em] text-stone-400'
  const h2cls    = 'text-[23px] lg:text-[30px] font-extralight text-stone-900 tracking-tight leading-[1.12]'
  const lead     = 'text-[13px] lg:text-[14px] text-stone-500 font-light leading-relaxed'
  const card     = 'bg-white border border-stone-200/80 p-7 lg:p-8 transition-colors duration-300 hover:border-stone-300'

  return (
    <div className="min-h-full bg-white text-stone-900">
      {/* Top bar, Brand + Firmen-Login */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-5 lg:px-10 py-4 bg-white/85 backdrop-blur-md border-b border-stone-200/70">
        <span className="font-brand text-[15px] tracking-[0.04em]">ARTISAN SOLE</span>
        <Link
          to="/login"
          className="flex items-center gap-1.5 text-[11px] text-stone-500 hover:text-stone-900 no-underline uppercase tracking-[0.18em] transition-colors"
        >
          <LogIn size={15} strokeWidth={1.4} /> Firmen-Login
        </Link>
      </div>

      {/* Einstieg. Ohne Bannerbild: Die Aussage trägt sich selbst, und ein
          Stockfoto hätte hier nur Platz zwischen Überschrift und Angebot
          gekostet. Farben daher von Weiß auf Dunkel gedreht. */}
      <section className="px-6 py-20 lg:py-28 flex flex-col items-center text-center bg-white">
          <p className="text-[10px] text-stone-400 uppercase tracking-[0.4em] mb-5">Artisan Sole · für Unternehmen</p>
          <h1 className="text-[30px] lg:text-[52px] font-extralight text-stone-900 leading-[1.04] tracking-tight max-w-3xl">
            Ein Geschenk, das man jeden Tag trägt.
          </h1>
          <p className="text-[13px] lg:text-[16px] text-stone-500 font-light max-w-xl mt-6 leading-relaxed">
            Custom-made Lederschuhe, für Mitarbeitende, Kunden und Partner. In
            spanischer Manufaktur gefertigt, auf Wunsch mit Ihrem Logo.
          </p>
          <button
            onClick={scrollToForm}
            className="group mt-9 px-9 h-12 bg-stone-900 text-white border-0 hover:bg-stone-800 transition-colors flex items-center gap-2.5"
            style={{ letterSpacing: '0.2em', textTransform: 'uppercase', fontSize: '12px' }}
          >
            Angebot anfragen <ArrowRight size={15} strokeWidth={1.6} className="transition-transform group-hover:translate-x-0.5" />
          </button>
          <Link
            to="/business/uebersicht"
            className="mt-4 inline-flex items-center gap-1.5 text-[10px] text-stone-400 hover:text-stone-900 no-underline uppercase tracking-[0.22em] transition-colors"
          >
            Preise und Prozess auf einen Blick <ArrowRight size={12} strokeWidth={1.6} />
          </Link>
      </section>

      {/* Leitsatz */}
      <section className="px-5 lg:px-8 py-16 lg:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <span className="block w-10 h-px bg-stone-300 mx-auto mb-8" />
          <p className="text-[20px] lg:text-[27px] font-extralight text-stone-500 leading-[1.4] tracking-tight">
            Die meisten Geschenke sind bis zum Jahresende vergessen.
            <span className="text-stone-900"> Ein Schuh, der perfekt sitzt, begleitet jeden Tag.</span>
          </p>
        </div>
      </section>

      {/* Anwendungsfälle */}
      <section className="px-5 lg:px-8 py-16 lg:py-24 bg-stone-50 border-y border-stone-200/70">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 lg:mb-14">
            <p className={`${eyebrow} mb-3`}>Für jeden Anlass</p>
            <h2 className={h2cls}>Ein Geschenk, viele Anlässe</h2>
            <p className={`${lead} mt-4 max-w-xl mx-auto`}>Wofür Sie unsere Custom-made Schuhe einsetzen, bleibt ganz Ihnen überlassen.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
            {USE_CASES.map(u => {
              const Icon = u.icon
              return (
                <div key={u.title} className={card}>
                  <Icon size={22} strokeWidth={1.25} className="text-stone-500 mb-4" />
                  <p className="text-[14px] text-stone-900 font-normal mb-2">{u.title}</p>
                  <p className="text-[11.5px] text-stone-500 font-light leading-relaxed">{u.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Custom Made, das Verfahren */}
      <section className="px-5 lg:px-8 py-16 lg:py-24">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 lg:mb-16">
            <p className={`${eyebrow} mb-3`}>Custom Made</p>
            <h2 className={h2cls}>Die Präzision maßgefertigter Schuhe, ohne den Aufwand</h2>
            <p className={`${lead} mt-4 max-w-xl mx-auto`}>
              Keine Schuhmacher-Termine, kein aufwendiges Vermessen. Zwei Angaben der Empfänger genügen, den Rest übernehmen wir.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-8">
            {[
              { n: '01', t: 'Maße nehmen', d: 'Fußlänge und Ballenumfang, in wenigen Augenblicken erfasst, ganz ohne Spezialwerkzeug.' },
              { n: '02', t: 'Auf den Fuß abgestimmt', d: 'Wir bestimmen die ideale Leistenform und stimmen Länge und Weite präzise auf den individuellen Fuß ab.' },
              { n: '03', t: 'Einzeln gefertigt', d: 'Jedes Paar wird einzeln in spanischer Manufaktur produziert. Einzelbestellungen bis zu 4 Wochen, größere Sammelbestellungen bis zu 8 Wochen, jeweils nach Zahlungseingang. Lieferung direkt an die Empfänger.' },
            ].map(s => (
              <div key={s.n} className="text-center sm:text-left">
                <p className="text-[34px] font-extralight text-stone-300 leading-none mb-4">{s.n}</p>
                <p className="text-[14px] text-stone-900 font-normal mb-2">{s.t}</p>
                <p className="text-[11.5px] text-stone-500 font-light leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-[12px] text-stone-400 font-light mt-14 max-w-2xl mx-auto leading-relaxed">
            Das Ergebnis: Schuhe, die sich anfühlen, als wären sie für genau diesen Fuß gemacht, sodass jeder Fuß sein passendes Bett findet.
          </p>
        </div>
      </section>

      {/* Value props */}
      <section className="px-5 lg:px-8 py-16 lg:py-24 bg-stone-50 border-y border-stone-200/70">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 lg:mb-14">
            <p className={`${eyebrow} mb-3`}>Warum Artisan Sole</p>
            <h2 className={h2cls}>Handwerk, das Eindruck hinterlässt</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
            {VALUES.map(v => {
              const Icon = v.icon
              return (
                <div key={v.title} className={card}>
                  <Icon size={20} strokeWidth={1.25} className="text-stone-500 mb-4" />
                  <p className="text-[13.5px] text-stone-900 font-normal mb-2">{v.title}</p>
                  <p className="text-[11.5px] text-stone-500 font-light leading-relaxed">{v.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Katalog */}
      {officeShoes.length > 0 && (
        <section className="px-5 lg:px-8 py-16 lg:py-24">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <p className={`${eyebrow} mb-3`}>Kollektion</p>
              <h2 className={h2cls}>Eine Auswahl unserer Designs</h2>
              <p className={`${lead} mt-4 max-w-xl mx-auto`}>
                Jedes Modell fertigen wir individuell, in Größe und Weite jedes Empfängers. Wählen Sie ein Design; um die perfekte Passform kümmern wir uns.
              </p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 lg:gap-x-6 gap-y-10">
              {officeShoes.map(s => (
                <div key={s.id} className="group">
                  <div className="w-full overflow-hidden bg-stone-100 flex items-center justify-center transition-colors duration-500 group-hover:bg-stone-200/70" style={{ aspectRatio: '3 / 4' }}>
                    {s.image
                      ? <img src={resolveImg(s.image)} alt={s.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                      : <span className="text-[10px] text-stone-400 tracking-wider uppercase">{s.name}</span>}
                  </div>
                  <div className="pt-3.5">
                    <p className="text-[12px] lg:text-[13px] text-stone-900 font-normal leading-snug">{s.name}</p>
                    <p className="text-[10px] text-stone-400 tracking-wider uppercase mt-0.5">{s.category}</p>
                    <button
                      onClick={() => chooseDesign(s.name)}
                      className="mt-2.5 text-[10px] tracking-[0.16em] uppercase text-stone-500 hover:text-stone-900 bg-transparent border-0 underline underline-offset-4 decoration-stone-300 transition-colors"
                    >
                      Dieses Design wählen
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-center text-[11px] text-stone-400 font-light mt-12">
              Ein bestimmtes Modell im Sinn? Nennen Sie es uns, wir setzen es um.
            </p>
          </div>
        </section>
      )}

      {/* Anfrage */}
      <section id="anfrage" ref={formRef} className="px-5 lg:px-8 py-16 lg:py-24 bg-stone-50 border-t border-stone-200/70 scroll-mt-16">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-10">
            <p className={`${eyebrow} mb-3`}>Anfrage</p>
            <h2 className={h2cls}>Ihr Vorhaben, unser Vorschlag</h2>
            <p className={`${lead} mt-4`}>
              Schildern Sie uns kurz Ihr Vorhaben. Wir melden uns persönlich mit einem passenden Vorschlag, unverbindlich.
            </p>
          </div>

          {sent ? (
            <div className="border border-stone-200 p-10 text-center bg-white">
              <div className="w-12 h-12 bg-stone-900 flex items-center justify-center mx-auto mb-4">
                <Check size={20} className="text-white" strokeWidth={1.5} />
              </div>
              <p className="text-[18px] font-extralight text-stone-900 tracking-tight">Vielen Dank für Ihre Anfrage.</p>
              <p className="text-[12px] text-stone-500 font-light mt-2.5 leading-relaxed max-w-sm mx-auto">
                Ihre Anfrage ist bei uns eingegangen. Unser Business-Team meldet sich in Kürze persönlich bei Ihnen.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {selectedDesign && (
                <div className="flex items-center justify-between gap-3 px-4 py-3 bg-white border border-stone-200">
                  <span className="text-[12px] text-stone-500 font-light">Gewähltes Design: <span className="text-stone-900">{selectedDesign}</span></span>
                  <button type="button" onClick={() => setSelectedDesign('')} className="text-[10px] text-stone-400 hover:text-stone-700 bg-transparent border-0 uppercase tracking-wider">Ändern</button>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Firma *</label>
                  <input className={inputCls} value={form.company} onChange={e => set('company', e.target.value)} placeholder="Ihr Unternehmen" />
                </div>
                <div>
                  <label className={labelCls}>Ansprechpartner *</label>
                  <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Vor- und Nachname" />
                </div>
                <div>
                  <label className={labelCls}>E-Mail *</label>
                  <input type="email" className={inputCls} value={form.email} onChange={e => set('email', e.target.value)} placeholder="name@firma.com" />
                </div>
                <div>
                  <label className={labelCls}>Telefon</label>
                  <input className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+49 …" />
                </div>
                <div>
                  <label className={labelCls}>Anlass</label>
                  <input className={inputCls} value={form.occasion} onChange={e => set('occasion', e.target.value)} placeholder="z. B. Benefit, Onboarding, Jubiläum" />
                </div>
                <div>
                  <label className={labelCls}>Ungefähre Stückzahl</label>
                  <input className={inputCls} value={form.quantity} onChange={e => set('quantity', e.target.value)} placeholder="z. B. 25" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Nachricht *</label>
                <textarea rows={4} className={`${inputCls} resize-none`} value={form.message} onChange={e => set('message', e.target.value)} placeholder="Anzahl Empfänger, Wünsche, Zeitrahmen, Budget …" />
              </div>

              {error && <p className="text-[12px] text-red-600/80 font-light">{error}</p>}

              {!valid && started && (
                <p className="text-[11px] text-stone-400 font-light text-center">
                  Bitte noch ausfüllen: {missing.join(', ')}
                </p>
              )}

              <button
                type="submit"
                disabled={!valid || sending}
                className="w-full h-14 flex items-center justify-center gap-2.5 bg-stone-900 text-white border-0 hover:bg-stone-800 disabled:opacity-30 transition-colors"
                style={{ letterSpacing: '0.2em', textTransform: 'uppercase', fontSize: '12px' }}
              >
                <Send size={15} strokeWidth={1.5} /> {sending ? 'Wird gesendet …' : 'Anfrage senden'}
              </button>

              {waLink && (
                <>
                  <div className="flex items-center gap-3 py-1">
                    <span className="flex-1 h-px bg-stone-200" />
                    <span className="text-[10px] text-stone-400 uppercase tracking-[0.2em] font-light">oder</span>
                    <span className="flex-1 h-px bg-stone-200" />
                  </div>
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-14 flex items-center justify-center gap-2.5 bg-white text-stone-900 border border-stone-300 hover:border-stone-900 transition-colors no-underline"
                    style={{ letterSpacing: '0.2em', textTransform: 'uppercase', fontSize: '12px' }}
                  >
                    <MessageCircle size={15} strokeWidth={1.5} /> Direkt per WhatsApp
                  </a>
                  <p className="text-center text-[10px] text-stone-400 font-light leading-relaxed">
                    Lieber direkt schreiben? Stellen Sie Ihre Fragen per WhatsApp, Ihre Angaben übernehmen wir.
                  </p>
                </>
              )}

              <p className="text-center text-[10px] text-stone-400 font-light tracking-wide">
                Persönliche Beratung · unverbindlich · gefertigt in Spanien
              </p>
            </form>
          )}
        </div>
      </section>

      {/* ── Wie ein Firmenkonto abläuft ─────────────────────────────
          Vor dem Footer, nach dem Kontaktformular: Wer bis hierhin gelesen
          hat, überlegt es sich. Die häufigste offene Frage ist nicht das Ob,
          sondern wie viel Arbeit es macht — deshalb steht der Ablauf hier
          und nicht in einem FAQ. */}
      <section className="px-5 lg:px-8 py-16 bg-white border-t border-stone-200/70">
        <div className="max-w-5xl mx-auto">
          <Ablauf
            titel="Von der Anfrage bis zum ersten Paar"
            intro="Sie legen die Konditionen fest, Ihre Mitarbeitenden bestellen selbst. Sie sammeln keine Größen ein und legen nichts aus."
            schritte={[
              {
                titel: 'Anfrage senden',
                text: 'Über das Formular oben oder per WhatsApp. Wir melden uns und klären, was Sie vorhaben — Anlass, Anzahl, Zeitrahmen.',
              },
              {
                titel: 'Firmenkonto erhalten',
                text: 'Wir richten Ihr Konto ein und schicken einen Einladungslink. Dort legen Sie Ihr Passwort fest, danach sind Sie unter business.artisansole.com angemeldet.',
              },
              {
                titel: 'Profil und Logo hinterlegen',
                text: 'Firmendaten und, wenn gewünscht, Ihr Logo für die Sohlenprägung. Einmal hinterlegt, gilt es für alle Bestellungen Ihres Hauses.',
              },
              {
                titel: 'Kampagne anlegen',
                text: 'Name, Rabatt, Frist und welche Modelle zur Wahl stehen. Sie entscheiden auch, wer teilnehmen darf: alle mit Ihrer E-Mail-Domain oder eine namentliche Liste.',
              },
              {
                titel: 'Mitarbeitende teilnehmen lassen',
                text: 'Wer sich mit der Firmen-E-Mail anmeldet, ist automatisch dabei — der Rabatt steht ohne Code im Konfigurator. Bei der namentlichen Liste verschicken wir die Einladungen per Mail.',
              },
              {
                titel: 'Fortschritt verfolgen',
                text: 'Sie sehen live, wie viele Paare je Modell zusammenkommen und wer schon bestellt hat. Ab zehn Paar pro Modell greift der Mengenrabatt.',
              },
            ]}
            fuss="Jedes Paar wird einzeln auf die Maße der jeweiligen Person gefertigt und einzeln zugestellt. Es gibt keine Sammellieferung und keine Größenliste, die Sie führen müssten."
            hell
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="px-5 lg:px-8 py-9 bg-white border-t border-stone-200/70">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-brand text-[13px] tracking-[0.04em] text-stone-900">ARTISAN SOLE</span>
          <div className="flex items-center gap-5">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-[10px] text-stone-400 hover:text-stone-700 no-underline uppercase tracking-[0.2em] transition-colors"
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
