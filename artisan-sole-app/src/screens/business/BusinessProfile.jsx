import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, Trash2, Check } from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'

const MAX_BYTES = 2 * 1024 * 1024 // 2 MB

export default function BusinessProfile() {
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({ name: '', contact_email: '', contact_phone: '', logo_data: '' })

  useEffect(() => {
    apiFetch('/api/business/me')
      .then(b => setForm({
        name: b.name || '',
        contact_email: b.contact_email || '',
        contact_phone: b.contact_phone || '',
        logo_data: b.logo_data || '',
      }))
      .catch(e => setError(e?.error || 'Profil konnte nicht geladen werden'))
      .finally(() => setLoading(false))
  }, [])

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setSaved(false) }

  const onFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!/^image\/(png|jpe?g|svg\+xml|webp)$/.test(file.type)) {
      setError('Bitte ein PNG-, JPG-, SVG- oder WEBP-Bild wählen.'); return
    }
    if (file.size > MAX_BYTES) { setError('Logo ist zu groß (max. 2 MB).'); return }
    const reader = new FileReader()
    reader.onload = () => { setError(null); set('logo_data', reader.result) }
    reader.readAsDataURL(file)
  }

  const save = async () => {
    if (saving) return
    if (form.name.trim().length < 2) { setError('Firmenname min. 2 Zeichen'); return }
    setSaving(true); setError(null)
    try {
      await apiFetch('/api/business/me', {
        method: 'PUT',
        body: JSON.stringify({
          name: form.name.trim(),
          contact_email: form.contact_email.trim(),
          contact_phone: form.contact_phone.trim(),
          logo_data: form.logo_data || '',
        }),
      })
      setSaved(true)
    } catch (e) {
      setError(e?.error || 'Speichern fehlgeschlagen')
    } finally { setSaving(false) }
  }

  const inp = 'w-full h-12 border border-black/15 px-3.5 text-[14px] bg-white outline-none focus:border-black/40 transition-colors font-light'
  const lbl = 'block text-[10px] text-black/40 uppercase tracking-[0.15em] mb-1.5 font-light'

  if (loading) {
    return <div className="min-h-[100dvh] bg-white flex items-center justify-center"><div className="w-7 h-7 border-2 border-black/15 border-t-black/60 rounded-full animate-spin-custom" /></div>
  }

  return (
    <div className="min-h-[100dvh] bg-white">
      <div className="max-w-2xl mx-auto px-5 lg:px-8 pt-10 pb-16">
        <button
          onClick={() => navigate('/business/dashboard')}
          className="flex items-center gap-1.5 text-[11px] text-black/45 hover:text-black bg-transparent border-0 uppercase tracking-[0.15em] mb-8"
        >
          <ArrowLeft size={15} strokeWidth={1.4} /> Dashboard
        </button>

        <p className="text-[10px] text-black/30 uppercase tracking-[0.3em] mb-2">Profil</p>
        <h1 className="text-[26px] lg:text-[30px] font-extralight text-black tracking-tight mb-8">Firmendaten & Logo</h1>

        {error && <div className="bg-red-50 border border-red-200 px-4 py-3 mb-5"><p className="text-xs text-red-600">{error}</p></div>}

        <div className="space-y-5">
          <div>
            <label className={lbl}>Firmenname *</label>
            <input className={inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ihr Unternehmen" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Kontakt-E-Mail</label>
              <input type="email" className={inp} value={form.contact_email} onChange={e => set('contact_email', e.target.value)} placeholder="name@firma.com" />
            </div>
            <div>
              <label className={lbl}>Telefon</label>
              <input className={inp} value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} placeholder="+49 …" />
            </div>
          </div>

          <div>
            <label className={lbl}>Logo (für die Schuhsohle)</label>
            <div className="flex items-center gap-5 border border-black/15 p-4">
              <div className="w-24 h-24 bg-[#f6f5f3] border border-black/[0.06] flex items-center justify-center overflow-hidden shrink-0">
                {form.logo_data
                  ? <img src={form.logo_data} alt="Logo" className="w-full h-full object-contain p-1.5" />
                  : <span className="text-[9px] text-black/25 uppercase tracking-wider text-center px-2">Kein Logo</span>}
              </div>
              <div className="flex-1">
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={onFile} className="hidden" />
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 text-[11px] tracking-[0.12em] uppercase text-black border border-black/20 px-3.5 py-2 bg-white hover:bg-black/[0.02] transition-colors">
                    <Upload size={14} strokeWidth={1.5} /> Logo hochladen
                  </button>
                  {form.logo_data && (
                    <button type="button" onClick={() => { set('logo_data', ''); if (fileRef.current) fileRef.current.value = '' }} className="flex items-center gap-1.5 text-[11px] tracking-[0.12em] uppercase text-black/55 hover:text-black border border-black/15 px-3.5 py-2 bg-white transition-colors">
                      <Trash2 size={14} strokeWidth={1.5} /> Entfernen
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-black/35 font-light mt-2 leading-relaxed">PNG, JPG, SVG oder WEBP · max. 2 MB. Am besten einfarbig/monochrom für die Sohlenprägung.</p>
              </div>
            </div>
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="w-full mt-2 flex items-center justify-center gap-2 bg-black text-white border-0 disabled:opacity-30 transition-all"
            style={{ height: '52px', letterSpacing: '0.18em', textTransform: 'uppercase', fontSize: '12px' }}
          >
            {saved ? <><Check size={16} strokeWidth={2} /> Gespeichert</> : (saving ? 'Wird gespeichert …' : 'Speichern')}
          </button>
        </div>
      </div>
    </div>
  )
}
