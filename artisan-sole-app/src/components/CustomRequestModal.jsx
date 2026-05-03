import { useState, useEffect } from 'react'
import { X, Check, AlertCircle, Phone, MessageCircle } from 'lucide-react'
import { apiFetch } from '../hooks/useApi'
import { useAuth } from '../context/AuthContext'

/**
 * Maßanfertigungs-Anfrage — geht ohne Login als Anfrage an Admin/Curator,
 * Telefonnummer ist Pflicht, weiterer Austausch über WhatsApp Business.
 */
export default function CustomRequestModal({
  open,
  onClose,
  product,           // shoe object
  config,            // { material, color, sole, euSize, scanId, accessories[] }
}) {
  const { user } = useAuth()
  const [form, setForm] = useState({
    name:  user?.name  || '',
    email: user?.email || '',
    phone: '',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [waNumber, setWaNumber] = useState('+4915126936500')

  useEffect(() => {
    if (!open) return
    apiFetch('/api/settings/whatsapp')
      .then(r => { if (r?.number) setWaNumber(r.number) })
      .catch(() => {})
  }, [open])

  useEffect(() => {
    if (open) {
      setForm(f => ({ ...f, name: user?.name || f.name, email: user?.email || f.email }))
      setError(null); setSuccess(null)
    }
  }, [open, user])

  if (!open) return null

  const phoneValid = /^[+0-9 ()/-]{6,}$/.test(form.phone.trim())
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
  const isValid = form.name.trim() && emailValid && phoneValid

  const submit = async () => {
    if (!isValid || submitting) return
    setSubmitting(true); setError(null)
    try {
      const row = await apiFetch('/api/custom-requests', {
        method: 'POST',
        body: JSON.stringify({
          customer_name:  form.name.trim(),
          customer_email: form.email.trim(),
          customer_phone: form.phone.trim(),
          shoe_id:   product?.id ?? null,
          shoe_name: product?.name ?? null,
          material:  config?.material ?? null,
          color:     config?.color    ?? null,
          sole:      config?.sole     ?? null,
          eu_size:   config?.euSize   ?? null,
          scan_id:   config?.scanId   ?? null,
          accessories: config?.accessories || [],
          notes:     form.notes.trim() || null,
        }),
      })
      setSuccess(row)
    } catch (err) {
      setError(err?.error || err?.errors?.[0]?.msg || 'Anfrage konnte nicht gesendet werden')
    } finally {
      setSubmitting(false)
    }
  }

  const buildWhatsAppLink = () => {
    if (!waNumber) return null
    const normalized = waNumber.replace(/[^0-9+]/g, '').replace(/^\+/, '')
    const ref = success?.id ? `#${success.id}` : ''
    const lines = [
      `Hallo Artisan Sole, ich habe eine Maßanfertigungs-Anfrage ${ref} gestellt.`,
      product?.name && `Modell: ${product.name}`,
      config?.material && `Material: ${config.material}`,
      config?.color && `Farbe: ${config.color}`,
      config?.sole && `Sohle: ${config.sole}`,
    ].filter(Boolean).join('\n')
    return `https://wa.me/${normalized}?text=${encodeURIComponent(lines)}`
  }
  const waLink = buildWhatsAppLink()

  return (
    <div className="fixed inset-0 z-[1000] flex items-end lg:items-center justify-center bg-black/40">
      <div
        className="bg-white w-full lg:max-w-xl lg:my-8 max-h-[92dvh] overflow-y-auto"
        style={{ animation: 'slideUp 0.28s ease-out both' }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-black/[0.06] px-5 py-4 flex items-center justify-between z-10">
          <div>
            <p className="text-[9px] text-black/30 uppercase" style={{ letterSpacing: '0.25em' }}>Maßanfertigung</p>
            <h2 className="text-[16px] font-light text-black tracking-[0.12em] uppercase mt-0.5">Anfrage senden</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center bg-transparent border-0 text-black/60 active:opacity-50"
            aria-label="Schließen"
          >
            <X size={20} strokeWidth={1.3} />
          </button>
        </div>

        {success ? (
          /* ── Erfolg ── */
          <div className="px-5 py-8 text-center">
            <div className="w-14 h-14 mx-auto bg-black flex items-center justify-center mb-5">
              <Check size={26} strokeWidth={1.5} className="text-white" />
            </div>
            <p className="text-[10px] text-black/30 uppercase mb-2" style={{ letterSpacing: '0.25em' }}>Anfrage #{success.id}</p>
            <h3 className="text-[18px] font-light tracking-[0.12em] uppercase text-black mb-3">Vielen Dank</h3>
            <p className="text-[13px] text-black/55 font-light leading-relaxed max-w-md mx-auto">
              Ihre Anfrage zur Maßanfertigung ist eingegangen. Unser Atelier meldet sich
              {waNumber ? ' in Kürze über WhatsApp Business' : ' in Kürze bei Ihnen'} unter
              <span className="text-black"> {form.phone}</span>.
            </p>

            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-7 inline-flex items-center gap-2.5 px-7 h-12 bg-[#25D366] text-white text-[12px] tracking-[0.18em] uppercase"
              >
                <MessageCircle size={16} strokeWidth={1.6} />
                WhatsApp öffnen
              </a>
            )}

            <button
              onClick={onClose}
              className="block mx-auto mt-5 text-[11px] text-black/40 tracking-[0.18em] uppercase bg-transparent border-0 hover:text-black"
            >
              Schließen
            </button>
          </div>
        ) : (
          /* ── Formular ── */
          <div className="px-5 py-5">
            {/* Konfiguration-Übersicht */}
            <div className="bg-[#f6f5f3] p-4 mb-5 text-[12px] text-black/70 font-light">
              <p className="text-[9px] text-black/35 uppercase mb-2" style={{ letterSpacing: '0.2em' }}>Ihre Konfiguration</p>
              <p className="text-[13px] text-black mb-1">{product?.name || '–'}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                {config?.material && <span>{config.material}</span>}
                {config?.color    && <span>· {config.color}</span>}
                {config?.sole     && <span>· {config.sole}</span>}
                {config?.euSize   && <span>· EU {config.euSize}</span>}
              </div>
              {config?.accessories?.length > 0 && (
                <p className="text-[11px] text-black/45 mt-1.5">+ {config.accessories.length}× Zubehör</p>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-4 py-3 mb-4">
                <AlertCircle size={15} className="text-red-500 flex-shrink-0" />
                <p className="text-[12px] text-red-700">{error}</p>
              </div>
            )}

            <Field label="Name" required value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Vor- und Nachname" />
            <Field label="E-Mail" required type="email" value={form.email} onChange={v => setForm({ ...form, email: v })} placeholder="ihre@email.com" />
            <Field
              label="Telefon (für WhatsApp)"
              required
              type="tel"
              icon={Phone}
              value={form.phone}
              onChange={v => setForm({ ...form, phone: v })}
              placeholder="+49 …"
              hint="Wird ausschließlich für die Bearbeitung Ihrer Anfrage verwendet."
            />

            <label className="block">
              <span className="text-[9px] text-black/40 uppercase tracking-[0.18em] mb-1.5 block">
                Anmerkungen
              </span>
              <textarea
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                rows={4}
                placeholder="Wünsche, Maße, bevorzugte Kontaktzeiten …"
                className="w-full bg-[#f6f5f3] border border-black/[0.06] px-3 py-3 text-[13px] text-black placeholder-black/25 focus:outline-none focus:border-black/30 transition-all font-light"
                style={{ fontFamily: 'inherit' }}
              />
            </label>

            <p className="text-[10px] text-black/35 leading-relaxed mt-3">
              Mit dem Absenden willigen Sie ein, dass wir Sie zur Bearbeitung Ihrer Anfrage telefonisch
              oder per WhatsApp Business kontaktieren.
            </p>

            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                disabled={submitting}
                className="flex-1 h-12 bg-white text-black border border-black/15 text-[11px] tracking-[0.18em] uppercase active:bg-black/5"
              >
                Abbrechen
              </button>
              <button
                onClick={submit}
                disabled={!isValid || submitting}
                className={`flex-[2] h-12 text-[11px] tracking-[0.18em] uppercase border-0 transition-all ${
                  !isValid || submitting
                    ? 'bg-black/30 text-white cursor-not-allowed'
                    : 'bg-black text-white active:bg-black/85'
                }`}
              >
                {submitting ? 'Wird gesendet …' : 'Anfrage senden'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, required, type = 'text', value, onChange, placeholder, hint, icon: Icon }) {
  return (
    <label className="block mb-4">
      <span className="text-[9px] text-black/40 uppercase tracking-[0.18em] mb-1.5 flex items-center gap-1.5">
        {Icon && <Icon size={11} strokeWidth={1.6} />}
        {label}
        {required && <span className="text-black/60">*</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#f6f5f3] border border-black/[0.06] px-3 h-11 text-[13px] text-black placeholder-black/25 focus:outline-none focus:border-black/30 transition-all font-light"
        style={{ fontFamily: 'inherit' }}
      />
      {hint && <span className="block text-[10px] text-black/35 mt-1">{hint}</span>}
    </label>
  )
}
