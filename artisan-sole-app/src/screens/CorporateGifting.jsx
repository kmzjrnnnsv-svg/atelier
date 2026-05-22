/**
 * CorporateGifting.jsx — business.artisansole.com Einstieg.
 *
 * Öffentliche B2B-Seite: Office-Schuhe als Corporate Benefit / Einstellungs-
 * geschenk (ab 10 Paar pro Design), inkl. Katalog und Anfrageformular. Die
 * Anfrage läuft über das bestehende custom_requests-System (kein Login nötig)
 * und erscheint im CMS unter den Anfragen.
 */
import { useState, useRef } from 'react'
import { Check, Send, MapPin, Gem, Footprints, Users, PenTool, Package } from 'lucide-react'
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
  { icon: Users,      title: 'Eine Geste, die bleibt',  desc: 'Ob Willkommensgeschenk für neue Kolleginnen und Kollegen oder Dankeschön an Ihr Team — ein Schuh, der jeden Tag begleitet, sagt mehr als jede Karte.' },
  { icon: Footprints, title: 'Passt. Wirklich jedem.',   desc: 'Über zwei einfache Maße finden wir für jeden Fuß die richtige Größe und Weite. Kein Rätselraten, keine Rückläufer — nur Schuhe, die sitzen.' },
  { icon: MapPin,     title: 'Aus spanischer Hand',      desc: 'Gefertigt in kleinen Manufakturen in Spanien, wo Schuhmacherkunst noch ein Handwerk ist — Paar für Paar, mit Liebe zum Detail.' },
  { icon: Gem,        title: 'Leder, das man fühlt',     desc: 'Ausschließlich feinste Kalbs- und Premiumleder: edel im Griff, langlebig im Tragen und mit jedem Jahr schöner.' },
  { icon: PenTool,    title: 'Ihre Handschrift',         desc: 'Auf Wunsch mit Monogramm, Initialen oder einer dezenten firmeneigenen Veredelung — ganz persönlich, in feiner Handarbeit.' },
  { icon: Package,    title: 'Schon ab 10 Paar',         desc: `Ab ${MIN_PER_DESIGN} Paar pro Design begleiten wir Sie persönlich — mit fairen Konditionen, die zu Ihrem Unternehmen passen.` },
]

export default function CorporateGifting() {
  const { shoes } = useStore()
  const formRef = useRef(null)
  const [form, setForm] = useState({ company: '', name: '', email: '', phone: '', occasion: '', quantity: '', message: '' })
  const [selectedDesign, setSelectedDesign] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  const officeShoes = (Array.isArray(shoes) ? shoes : []).filter(s => OFFICE_CATEGORIES.includes(s.category))

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
      setError(e?.error || 'Da ist etwas schiefgelaufen. Versuchen Sie es bitte noch einmal.')
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
          Schenken Sie Ihrem Team einen Schuh, der bleibt.
        </h1>
        <p className="text-[13px] lg:text-[15px] text-black/45 font-light max-w-2xl mx-auto mt-5 leading-relaxed">
          Maßgefertigt in Spanien, aus feinstem Leder, perfekt für jeden Fuß.
          Als Willkommensgeschenk für neue Gesichter oder als Dankeschön an die,
          die schon lange dabei sind — ab {MIN_PER_DESIGN} Paar pro Design.
        </p>
        <button
          onClick={scrollToForm}
          className="mt-8 px-9 h-12 bg-black text-white border-0 hover:bg-black/90 transition-all"
          style={{ letterSpacing: '0.18em', textTransform: 'uppercase', fontSize: '12px' }}
        >
          Tun Sie Ihrem Team etwas Gutes
        </button>
      </div>

      {/* Emotionaler Zwischensatz */}
      <div className="px-5 lg:px-16 pb-12 lg:pb-16">
        <p className="text-center text-[18px] lg:text-[22px] font-extralight text-black/70 leading-snug max-w-3xl mx-auto tracking-tight">
          Manche Geschenke verschwinden in der Schublade.
          <br className="hidden sm:block" />
          <span className="text-black"> Ein Schuh, der perfekt sitzt, begleitet jeden Schritt.</span>
        </p>
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

      {/* Office-Katalog */}
      {officeShoes.length > 0 && (
        <div className="px-5 lg:px-16 py-12">
          <div className="text-center mb-8">
            <p className="text-[10px] text-black/30 uppercase tracking-[0.3em] mb-3">Zur Inspiration</p>
            <h2 className="text-[22px] lg:text-[26px] font-extralight text-black tracking-tight">Finden Sie ein Lieblingsstück</h2>
            <p className="text-[12px] text-black/40 font-light mt-3 max-w-xl mx-auto leading-relaxed">
              Jedes Design fertigen wir individuell für jeden Mitarbeitenden — in seiner
              Größe, seiner Weite. Wählen Sie ein Modell, der Rest ist unsere Aufgabe.
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
            Sie haben ein bestimmtes Modell im Kopf? Schreiben Sie es uns einfach — wir machen es möglich.
          </p>
        </div>
      )}

      {/* Anfrageformular */}
      <div ref={formRef} className="px-5 lg:px-16 py-12 lg:py-16 bg-[#fafaf9] border-t border-black/[0.06] scroll-mt-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-[10px] text-black/30 uppercase tracking-[0.3em] mb-3">Lernen wir uns kennen</p>
            <h2 className="text-[22px] lg:text-[26px] font-extralight text-black tracking-tight">Erzählen Sie uns von Ihrem Team</h2>
            <p className="text-[12px] text-black/40 font-light mt-3 leading-relaxed">
              Ein paar Zeilen genügen. Wir melden uns persönlich mit einer Idee, die zu Ihnen passt — unverbindlich und in Ruhe.
            </p>
          </div>

          {sent ? (
            <div className="border border-black/10 p-10 text-center bg-white">
              <div className="w-12 h-12 bg-black flex items-center justify-center mx-auto mb-4">
                <Check size={20} className="text-white" strokeWidth={1.5} />
              </div>
              <p className="text-[18px] font-extralight text-black tracking-tight">Wie schön, von Ihnen zu hören.</p>
              <p className="text-[12px] text-black/45 font-light mt-2.5 leading-relaxed max-w-sm mx-auto">
                Ihre Anfrage ist bei uns angekommen. Unser Business-Team meldet sich in Kürze ganz persönlich bei Ihnen.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {selectedDesign && (
                <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-white border border-black/10">
                  <span className="text-[12px] text-black/60 font-light">Ihr Wunsch-Design: <span className="text-black">{selectedDesign}</span></span>
                  <button type="button" onClick={() => setSelectedDesign('')} className="text-[10px] text-black/30 hover:text-black/60 bg-transparent border-0 uppercase tracking-wider">Ändern</button>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Firma *</label>
                  <input className={inputCls} value={form.company} onChange={e => set('company', e.target.value)} placeholder="Ihr Unternehmen" />
                </div>
                <div>
                  <label className={labelCls}>Ihr Name *</label>
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
                  <label className={labelCls}>Wie viele dürfen es sein?</label>
                  <input className={inputCls} value={form.quantity} onChange={e => set('quantity', e.target.value)} placeholder={`ab ${MIN_PER_DESIGN} pro Design`} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Ihre Nachricht</label>
                <textarea rows={4} className={`${inputCls} resize-none`} value={form.message} onChange={e => set('message', e.target.value)} placeholder="Worum geht es? Teamgröße, Wünsche, Zeitrahmen — erzählen Sie einfach drauflos." />
              </div>

              {error && <p className="text-[12px] text-red-600/80 font-light">{error}</p>}

              <button
                type="submit"
                disabled={!valid || sending}
                className="w-full h-14 flex items-center justify-center gap-2.5 bg-black text-white border-0 hover:bg-black/90 disabled:opacity-30 transition-all"
                style={{ letterSpacing: '0.18em', textTransform: 'uppercase', fontSize: '12px' }}
              >
                <Send size={15} strokeWidth={1.5} /> {sending ? 'Einen Moment …' : 'Anfrage senden'}
              </button>
              <p className="text-center text-[10px] text-black/30 font-light tracking-wide">
                Persönliche Beratung · unverbindlich · mit Liebe in Spanien gefertigt
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
