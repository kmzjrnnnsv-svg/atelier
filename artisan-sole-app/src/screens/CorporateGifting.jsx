/**
 * CorporateGifting.jsx — business.artisansole.com Einstieg.
 *
 * Öffentliche B2B-Seite: Schuhe nach Maß (Made-to-Measure) als Mitarbeiter-
 * geschenk / Corporate Benefit (ab 10 Paar pro Design), inkl. Katalog und
 * Anfrage (Formular oder WhatsApp). Anfragen laufen über das bestehende
 * custom_requests-System (kein Login nötig) und erscheinen im CMS.
 */
import { useState, useRef, useEffect } from 'react'
import { Check, Send, MapPin, Gem, Footprints, Users, PenTool, Package, MessageCircle } from 'lucide-react'
import { apiFetch } from '../hooks/useApi'
import { HEROES } from '../lib/editorialImages'
import useStore from '../store/store'

const IMG_API_BASE = import.meta.env.VITE_API_URL || ''
const resolveImg = (url) => {
  if (!url) return null
  if (url.startsWith('http') || url.startsWith('data:')) return url
  return `${IMG_API_BASE}${url}`
}

// Office-taugliche Kategorien für den Katalog.
const OFFICE_CATEGORIES = ['OXFORD', 'WHOLECUT', 'DERBY', 'MONK', 'DOUBLE_MONK', 'LOAFER', 'BALMORAL']
const MIN_PER_DESIGN = 10

const VALUES = [
  { icon: Footprints, title: 'Präzise Passform',        desc: 'Aus Fußlänge und Ballenumfang fertigen wir jeden Schuh in der passenden Länge und Weite — auf wenige Millimeter genau. Kein Schätzen, kein Umtausch.' },
  { icon: MapPin,     title: 'Spanische Manufaktur',    desc: 'Jedes Paar entsteht einzeln auf Bestellung in einer traditionsreichen Manufaktur in Spanien — Schuhmacherhandwerk, wie es sein soll.' },
  { icon: Gem,        title: 'Feinste Leder',           desc: 'Ausschließlich hochwertige Kalbs- und Premiumleder: edel im Griff, langlebig im Tragen und mit den Jahren nur schöner.' },
  { icon: PenTool,    title: 'Persönliche Veredelung',  desc: 'Auf Wunsch mit Monogramm, Initialen oder einer dezenten firmeneigenen Note — in feiner Handarbeit ausgeführt.' },
  { icon: Users,      title: 'Anerkennung mit Bestand', desc: 'Ob Willkommen für neue Kolleginnen und Kollegen oder Dank an langjährige Mitarbeitende — ein Paar, das täglich getragen wird, wirkt länger als jede Geste auf Papier.' },
  { icon: Package,    title: `Ab ${MIN_PER_DESIGN} Paar pro Design`, desc: 'Wir begleiten Ihr Projekt persönlich — mit transparenten Konditionen, die zur Größe Ihres Vorhabens passen.' },
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
      'Guten Tag Artisan Sole, wir interessieren uns für Schuhe nach Maß als Mitarbeitergeschenk.',
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
  const valid = form.company.trim() && form.name.trim() && /\S+@\S+\.\S+/.test(form.email) && form.phone.trim()

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const chooseDesign = (name) => {
    setSelectedDesign(name)
    setForm(f => ({ ...f, quantity: f.quantity || String(MIN_PER_DESIGN) }))
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
          customer_phone: form.phone.trim(),
          shoe_name: 'Corporate Gifting',
          notes,
        }),
      })
      setSent(true)
    } catch (e) {
      setError(e?.error || 'Ihre Anfrage konnte nicht gesendet werden. Bitte versuchen Sie es erneut.')
    } finally { setSending(false) }
  }

  const inputCls = 'w-full border border-black/15 px-3.5 py-2.5 text-[14px] bg-white outline-none focus:border-black/40 transition-colors font-light'
  const labelCls = 'block text-[10px] text-black/40 uppercase tracking-[0.15em] mb-1.5 font-light'

  return (
    <div className="min-h-full bg-white">
      {/* Hero */}
      <div className="w-full overflow-hidden relative" style={{ aspectRatio: '16 / 6' }}>
        <img src={HEROES.collection} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(transparent 35%, rgba(0,0,0,0.5) 100%)' }} />
      </div>
      <div className="text-center px-5 lg:px-16 pt-10 lg:pt-14 pb-8">
        <p className="text-[10px] text-black/30 uppercase tracking-[0.3em] mb-3">Artisan Sole · für Unternehmen</p>
        <h1 className="text-[26px] lg:text-[38px] font-extralight text-black leading-[1.08] tracking-tight max-w-3xl mx-auto">
          Wertschätzung, die man trägt.
        </h1>
        <p className="text-[13px] lg:text-[15px] text-black/45 font-light max-w-2xl mx-auto mt-5 leading-relaxed">
          Lederschuhe nach Maß für Ihr Team — auf den Fuß jeder Trägerin und jedes Trägers
          abgestimmt und in spanischer Manufaktur gefertigt. Als Willkommen für neue
          Kolleginnen und Kollegen oder als Anerkennung für langjährige Weggefährten.
          Ab {MIN_PER_DESIGN} Paar pro Design.
        </p>
        <button
          onClick={scrollToForm}
          className="mt-8 px-9 h-12 bg-black text-white border-0 hover:bg-black/90 transition-all"
          style={{ letterSpacing: '0.18em', textTransform: 'uppercase', fontSize: '12px' }}
        >
          Angebot anfragen
        </button>
      </div>

      {/* Leitsatz */}
      <div className="px-5 lg:px-16 pb-12 lg:pb-16">
        <p className="text-center text-[18px] lg:text-[22px] font-extralight text-black/70 leading-snug max-w-3xl mx-auto tracking-tight">
          Die meisten Geschenke sind bis zum Jahresende vergessen.
          <br className="hidden sm:block" />
          <span className="text-black"> Ein Schuh, der perfekt sitzt, begleitet jeden Tag.</span>
        </p>
      </div>

      {/* Made-to-Measure — das Verfahren */}
      <div className="px-5 lg:px-16 pb-12 lg:pb-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[10px] text-black/30 uppercase tracking-[0.3em] mb-3">Schuhe nach Maß</p>
            <h2 className="text-[22px] lg:text-[26px] font-extralight text-black tracking-tight">Die Präzision von Maßschuhen — ohne den Aufwand</h2>
            <p className="text-[12px] lg:text-[13px] text-black/45 font-light mt-3 max-w-2xl mx-auto leading-relaxed">
              Keine Schuhmacher-Termine, kein aufwendiges Vermessen. Zwei Angaben Ihres
              Teams genügen — den Rest übernehmen wir.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-black/[0.06] border border-black/[0.06]">
            {[
              { n: '01', t: 'Maße nehmen', d: 'Fußlänge und Ballenumfang — in wenigen Augenblicken erfasst, ganz ohne Spezialwerkzeug.' },
              { n: '02', t: 'Auf den Fuß abgestimmt', d: 'Auf Grundlage dieser Maße bestimmen wir die ideale Leistenform und stimmen Länge und Weite präzise auf den individuellen Fuß ab.' },
              { n: '03', t: 'Einzeln gefertigt', d: 'Jedes Paar wird daraufhin einzeln in spanischer Manufaktur produziert und an Ihr Team geliefert.' },
            ].map(s => (
              <div key={s.n} className="bg-white p-7">
                <p className="text-[11px] text-black/25 font-light tracking-[0.2em] mb-3">{s.n}</p>
                <p className="text-[14px] text-black font-normal mb-1.5">{s.t}</p>
                <p className="text-[11px] text-black/45 font-light leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-[12px] text-black/40 font-light mt-8 max-w-2xl mx-auto leading-relaxed">
            Das Ergebnis: Schuhe, die sich anfühlen, als wären sie für genau diesen Fuß
            gemacht. Auch die Weite (D/EE/EEE) sitzt — für jede und jeden.
          </p>
        </div>
      </div>

      {/* Value props */}
      <div className="px-5 lg:px-16 pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-black/[0.06] border border-black/[0.06]">
          {VALUES.map(v => {
            const Icon = v.icon
            return (
              <div key={v.title} className="bg-white p-7">
                <Icon size={20} strokeWidth={1.25} className="text-black/55 mb-3" />
                <p className="text-[13px] text-black font-normal mb-1.5">{v.title}</p>
                <p className="text-[11px] text-black/45 font-light leading-relaxed">{v.desc}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Katalog */}
      {officeShoes.length > 0 && (
        <div className="px-5 lg:px-16 py-12">
          <div className="text-center mb-8">
            <p className="text-[10px] text-black/30 uppercase tracking-[0.3em] mb-3">Kollektion</p>
            <h2 className="text-[22px] lg:text-[26px] font-extralight text-black tracking-tight">Designs für das Büro</h2>
            <p className="text-[12px] text-black/40 font-light mt-3 max-w-xl mx-auto leading-relaxed">
              Jedes Modell fertigen wir individuell — in der Größe und Weite jedes
              Mitarbeitenden. Wählen Sie ein Design; um die perfekte Passform kümmern wir uns.
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 lg:gap-x-6 gap-y-8">
            {officeShoes.map(s => (
              <div key={s.id} className="group">
                <div className="w-full overflow-hidden bg-[#f6f5f3] flex items-center justify-center transition-colors duration-500 group-hover:bg-[#efeee9]" style={{ aspectRatio: '3 / 4' }}>
                  {s.image
                    ? <img src={resolveImg(s.image)} alt={s.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                    : <span className="text-[10px] text-black/20 tracking-wider uppercase">{s.name}</span>}
                </div>
                <div className="pt-3">
                  <p className="text-[12px] lg:text-[13px] text-black font-normal leading-snug">{s.name}</p>
                  <p className="text-[10px] text-black/30 tracking-wider uppercase mt-0.5">{s.category}</p>
                  <button
                    onClick={() => chooseDesign(s.name)}
                    className="mt-2 text-[10px] tracking-[0.15em] uppercase text-black/55 hover:text-black bg-transparent border-0 underline underline-offset-4 decoration-black/20"
                  >
                    Dieses Design wählen
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-[11px] text-black/30 font-light mt-9">
            Ein bestimmtes Modell im Sinn? Nennen Sie es uns — wir setzen es um.
          </p>
        </div>
      )}

      {/* Anfrage */}
      <div ref={formRef} className="px-5 lg:px-16 py-12 lg:py-16 bg-[#fafaf9] border-t border-black/[0.06] scroll-mt-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-[10px] text-black/30 uppercase tracking-[0.3em] mb-3">Anfrage</p>
            <h2 className="text-[22px] lg:text-[26px] font-extralight text-black tracking-tight">Ihr Vorhaben, unser Vorschlag</h2>
            <p className="text-[12px] text-black/40 font-light mt-3 leading-relaxed">
              Schildern Sie uns kurz Ihr Vorhaben. Wir melden uns persönlich mit einem
              passenden Vorschlag — unverbindlich.
            </p>
          </div>

          {sent ? (
            <div className="border border-black/10 p-10 text-center bg-white">
              <div className="w-12 h-12 bg-black flex items-center justify-center mx-auto mb-4">
                <Check size={20} className="text-white" strokeWidth={1.5} />
              </div>
              <p className="text-[18px] font-extralight text-black tracking-tight">Vielen Dank für Ihre Anfrage.</p>
              <p className="text-[12px] text-black/45 font-light mt-2.5 leading-relaxed max-w-sm mx-auto">
                Ihre Anfrage ist bei uns eingegangen. Unser Business-Team meldet sich in Kürze persönlich bei Ihnen.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {selectedDesign && (
                <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-white border border-black/10">
                  <span className="text-[12px] text-black/60 font-light">Gewähltes Design: <span className="text-black">{selectedDesign}</span></span>
                  <button type="button" onClick={() => setSelectedDesign('')} className="text-[10px] text-black/30 hover:text-black/60 bg-transparent border-0 uppercase tracking-wider">Ändern</button>
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
                  <label className={labelCls}>Telefon *</label>
                  <input className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+49 …" />
                </div>
                <div>
                  <label className={labelCls}>Anlass</label>
                  <input className={inputCls} value={form.occasion} onChange={e => set('occasion', e.target.value)} placeholder="z. B. Onboarding, Jubiläum, Weihnachten" />
                </div>
                <div>
                  <label className={labelCls}>Stückzahl (ab {MIN_PER_DESIGN}/Design)</label>
                  <input className={inputCls} value={form.quantity} onChange={e => set('quantity', e.target.value)} placeholder={`z. B. ${MIN_PER_DESIGN}`} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Nachricht</label>
                <textarea rows={4} className={`${inputCls} resize-none`} value={form.message} onChange={e => set('message', e.target.value)} placeholder="Teamgröße, Wünsche, Zeitrahmen, Budget …" />
              </div>

              {error && <p className="text-[12px] text-red-600/80 font-light">{error}</p>}

              <button
                type="submit"
                disabled={!valid || sending}
                className="w-full h-14 flex items-center justify-center gap-2.5 bg-black text-white border-0 hover:bg-black/90 disabled:opacity-30 transition-all"
                style={{ letterSpacing: '0.18em', textTransform: 'uppercase', fontSize: '12px' }}
              >
                <Send size={15} strokeWidth={1.5} /> {sending ? 'Wird gesendet …' : 'Anfrage senden'}
              </button>

              {waLink && (
                <>
                  <div className="flex items-center gap-3 py-1">
                    <span className="flex-1 h-px bg-black/10" />
                    <span className="text-[10px] text-black/30 uppercase tracking-[0.2em] font-light">oder</span>
                    <span className="flex-1 h-px bg-black/10" />
                  </div>
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-14 flex items-center justify-center gap-2.5 bg-white text-black border border-black/20 hover:border-black hover:bg-black/[0.02] transition-all no-underline"
                    style={{ letterSpacing: '0.18em', textTransform: 'uppercase', fontSize: '12px' }}
                  >
                    <MessageCircle size={15} strokeWidth={1.5} /> Direkt per WhatsApp
                  </a>
                  <p className="text-center text-[10px] text-black/35 font-light leading-relaxed">
                    Lieber direkt schreiben? Stellen Sie Ihre Fragen per WhatsApp —
                    Ihre Angaben übernehmen wir.
                  </p>
                </>
              )}

              <p className="text-center text-[10px] text-black/30 font-light tracking-wide">
                Persönliche Beratung · unverbindlich · gefertigt in Spanien
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
