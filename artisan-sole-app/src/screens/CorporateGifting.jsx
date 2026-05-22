/**
 * CorporateGifting.jsx — business.artisansole.com Einstieg.
 *
 * Öffentliche B2B-Seite: Office-Schuhe als Corporate Benefit / Einstellungs-
 * geschenk (ab 10 Paar pro Design), inkl. Katalog und Anfrageformular. Die
 * Anfrage läuft über das bestehende custom_requests-System (kein Login nötig)
 * und erscheint im CMS unter den Anfragen.
 */
import { useState, useRef } from 'react'
import { Gift, Award, Package, PenTool, Check, Send, MapPin, Gem, Footprints, Users } from 'lucide-react'
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
  { icon: Users,      title: 'Corporate Benefit',     desc: 'Hochwertige Office-Schuhe als Mitarbeiter-Benefit oder Einstellungsgeschenk — ein Zeichen echter Wertschätzung.' },
  { icon: Footprints, title: 'Für jeden Fuß',          desc: 'Dank Maßermittlung über Fußlänge & Ballenumfang sitzt jedes Paar perfekt — keine Größenprobleme im Team.' },
  { icon: MapPin,     title: 'In Spanien gefertigt',   desc: 'Traditionelle Schuhmacherkunst aus Spanien, in kleinen Manufakturen mit Liebe zum Detail produziert.' },
  { icon: Gem,        title: 'Top-Leder',              desc: 'Ausschließlich feinste Kalbs- und Premiumleder — langlebig, edel und angenehm zu tragen.' },
  { icon: PenTool,    title: 'Personalisierung',       desc: 'Auf Wunsch Monogramm, Gravur oder firmeneigene Veredelung — diskret und in Handarbeit.' },
  { icon: Package,    title: 'Ab 10 Paar pro Design',  desc: `Mindestabnahme ${MIN_PER_DESIGN} Paar je Modell — mit passenden Geschäftskonditionen für Ihr Unternehmen.` },
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

  const chooseDesign = (name) => {
    setSelectedDesign(name)
    setForm(f => ({ ...f, quantity: f.quantity || String(MIN_PER_DESIGN) }))
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
      setError(e?.error || 'Anfrage konnte nicht gesendet werden. Bitte erneut versuchen.')
    } finally { setSending(false) }
  }

  const inputCls = 'w-full border border-black/15 px-3.5 py-2.5 text-[14px] bg-white outline-none focus:border-black/40 transition-colors font-light'
  const labelCls = 'block text-[10px] text-black/40 uppercase tracking-[0.15em] mb-1.5 font-light'

  return (
    <div className="min-h-full bg-white">
      {/* Hero */}
      <div className="w-full overflow-hidden relative" style={{ aspectRatio: '16 / 6' }}>
        <img src={HEROES.collection} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(transparent 40%, rgba(0,0,0,0.45) 100%)' }} />
      </div>
      <div className="text-center px-5 lg:px-16 pt-10 lg:pt-14 pb-8">
        <p className="text-[10px] text-black/30 uppercase tracking-[0.3em] mb-3">Artisan Sole · Business</p>
        <h1 className="text-[26px] lg:text-[36px] font-extralight text-black leading-[1.05] tracking-tight">
          Office-Schuhe für Ihr Team
        </h1>
        <p className="text-[13px] lg:text-[15px] text-black/45 font-light max-w-2xl mx-auto mt-4 leading-relaxed">
          Maßgefertigte Schuhe aus Spanien als Corporate Benefit oder Einstellungs­geschenk.
          Top-Leder, perfekte Passform für jeden Fuß — ab {MIN_PER_DESIGN} Paar pro Design.
        </p>
        <button
          onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="mt-7 px-8 h-12 bg-black text-white border-0 hover:bg-black/90 transition-all"
          style={{ letterSpacing: '0.18em', textTransform: 'uppercase', fontSize: '12px' }}
        >
          Tun Sie Ihren Mitarbeitern etwas Gutes
        </button>
      </div>

      {/* Value props */}
      <div className="px-5 lg:px-16 pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-black/[0.06] border border-black/[0.06]">
          {VALUES.map(v => {
            const Icon = v.icon
            return (
              <div key={v.title} className="bg-white p-6">
                <Icon size={20} strokeWidth={1.25} className="text-black/55 mb-3" />
                <p className="text-[13px] text-black font-normal mb-1.5">{v.title}</p>
                <p className="text-[11px] text-black/40 font-light leading-relaxed">{v.desc}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Office-Katalog */}
      {officeShoes.length > 0 && (
        <div className="px-5 lg:px-16 py-10">
          <div className="text-center mb-8">
            <p className="text-[10px] text-black/30 uppercase tracking-[0.3em] mb-3">Katalog</p>
            <h2 className="text-[22px] lg:text-[26px] font-extralight text-black tracking-tight">Unsere Office-Designs</h2>
            <p className="text-[12px] text-black/40 font-light mt-3 max-w-xl mx-auto">
              Wählen Sie ein Design für Ihr Team — Mindestabnahme {MIN_PER_DESIGN} Paar pro Modell,
              individuell in Größe und Weite für jeden Mitarbeiter gefertigt.
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 lg:gap-x-6 gap-y-8">
            {officeShoes.map(s => (
              <div key={s.id} className="group">
                <div className="w-full overflow-hidden bg-[#f6f5f3] flex items-center justify-center" style={{ aspectRatio: '3 / 4' }}>
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
                    Für mein Team anfragen
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-[11px] text-black/30 font-light mt-8">
            Konditionen & Mengenstaffel auf Anfrage · Lieferzeit nach Absprache
          </p>
        </div>
      )}

      {/* Anfrageformular */}
      <div ref={formRef} className="px-5 lg:px-16 py-12 lg:py-16 bg-[#fafaf9] border-t border-black/[0.06] scroll-mt-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-[10px] text-black/30 uppercase tracking-[0.3em] mb-3">Anfrage</p>
            <h2 className="text-[22px] lg:text-[26px] font-extralight text-black tracking-tight">Sprechen wir über Ihr Projekt</h2>
            <p className="text-[12px] text-black/40 font-light mt-3">
              Schildern Sie uns Ihr Vorhaben — wir melden uns persönlich mit einem Vorschlag.
            </p>
          </div>

          {sent ? (
            <div className="border border-black/10 p-10 text-center bg-white">
              <div className="w-12 h-12 bg-black flex items-center justify-center mx-auto mb-4">
                <Check size={20} className="text-white" strokeWidth={1.5} />
              </div>
              <p className="text-[18px] font-extralight text-black tracking-tight">Vielen Dank</p>
              <p className="text-[12px] text-black/40 font-light mt-2 leading-relaxed">
                Ihre Anfrage ist eingegangen. Unser Business-Team meldet sich in Kürze bei Ihnen.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {selectedDesign && (
                <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-white border border-black/10">
                  <span className="text-[12px] text-black/60 font-light">Gewähltes Design: <span className="text-black">{selectedDesign}</span></span>
                  <button type="button" onClick={() => setSelectedDesign('')} className="text-[10px] text-black/30 hover:text-black/60 bg-transparent border-0 uppercase tracking-wider">Entfernen</button>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Firma *</label>
                  <input className={inputCls} value={form.company} onChange={e => set('company', e.target.value)} placeholder="Unternehmen" />
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
                  <input className={inputCls} value={form.occasion} onChange={e => set('occasion', e.target.value)} placeholder="z. B. Onboarding, Jubiläum" />
                </div>
                <div>
                  <label className={labelCls}>Stückzahl (ab {MIN_PER_DESIGN}/Design)</label>
                  <input className={inputCls} value={form.quantity} onChange={e => set('quantity', e.target.value)} placeholder={`z. B. ${MIN_PER_DESIGN}`} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Nachricht</label>
                <textarea rows={4} className={`${inputCls} resize-none`} value={form.message} onChange={e => set('message', e.target.value)} placeholder="Ihre Idee, Budget, Zeitrahmen, Teamgröße …" />
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
              <p className="text-center text-[10px] text-black/25 font-light tracking-wide">
                Persönliche Beratung · unverbindlich · in Spanien gefertigt
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
