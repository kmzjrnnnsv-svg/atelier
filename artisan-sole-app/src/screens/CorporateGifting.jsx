/**
 * CorporateGifting.jsx — business.artisansole.com Einstieg.
 *
 * Öffentliche Corporate-Gifting-Landingpage mit Anfrageformular. Die Anfrage
 * wird über das bestehende custom_requests-System gespeichert (kein Login nötig)
 * und erscheint im CMS unter Maßanfertigungs-/Anfragen.
 */
import { useState } from 'react'
import { Gift, Award, Package, PenTool, Check, Send } from 'lucide-react'
import { apiFetch } from '../hooks/useApi'
import { HEROES } from '../lib/editorialImages'

const VALUES = [
  { icon: Gift,    title: 'Individuelle Geschenke', desc: 'Maßgefertigte Schuhe und Accessoires als unvergessliches Präsent für Kunden, Partner und Mitarbeiter.' },
  { icon: PenTool, title: 'Personalisierung',       desc: 'Monogramm, Gravur oder firmeneigene Veredelung — diskret und in Handarbeit umgesetzt.' },
  { icon: Package, title: 'Mengen & Konditionen',   desc: 'Von der einzelnen Aufmerksamkeit bis zur größeren Auflage — mit passenden Geschäftskonditionen.' },
  { icon: Award,   title: 'Persönliche Betreuung',  desc: 'Ein fester Ansprechpartner begleitet Ihr Projekt von der Idee bis zur Lieferung.' },
]

export default function CorporateGifting() {
  const [form, setForm] = useState({ company: '', name: '', email: '', phone: '', occasion: '', quantity: '', message: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const valid = form.company.trim() && form.name.trim() && /\S+@\S+\.\S+/.test(form.email) && form.phone.trim()

  const submit = async (e) => {
    e.preventDefault()
    if (!valid || sending) return
    setSending(true); setError(null)
    try {
      const notes = [
        `Firma: ${form.company.trim()}`,
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
          Corporate Gifting
        </h1>
        <p className="text-[13px] lg:text-[15px] text-black/45 font-light max-w-2xl mx-auto mt-4 leading-relaxed">
          Maßgefertigte Schuhe und feines Lederzubehör als Ausdruck von Wertschätzung —
          handgefertigt, personalisierbar und auf Ihr Unternehmen abgestimmt.
        </p>
      </div>

      {/* Value props */}
      <div className="px-5 lg:px-16 pb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-black/[0.06] border border-black/[0.06]">
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

      {/* Anfrageformular */}
      <div className="px-5 lg:px-16 py-12 lg:py-16">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-[10px] text-black/30 uppercase tracking-[0.3em] mb-3">Anfrage</p>
            <h2 className="text-[22px] lg:text-[26px] font-extralight text-black tracking-tight">Sprechen wir über Ihr Projekt</h2>
            <p className="text-[12px] text-black/40 font-light mt-3">
              Schildern Sie uns Ihr Vorhaben — wir melden uns persönlich mit einem Vorschlag.
            </p>
          </div>

          {sent ? (
            <div className="border border-black/10 p-10 text-center">
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
                  <input className={inputCls} value={form.occasion} onChange={e => set('occasion', e.target.value)} placeholder="z. B. Jubiläum, Weihnachten" />
                </div>
                <div>
                  <label className={labelCls}>Stückzahl (ca.)</label>
                  <input className={inputCls} value={form.quantity} onChange={e => set('quantity', e.target.value)} placeholder="z. B. 25" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Nachricht</label>
                <textarea rows={4} className={`${inputCls} resize-none`} value={form.message} onChange={e => set('message', e.target.value)} placeholder="Ihre Idee, Budget, Zeitrahmen …" />
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
                Persönliche Beratung · unverbindlich
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
