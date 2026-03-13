import { useState, useEffect } from 'react'
import { Mail, Save, CheckCircle2, AlertCircle, Loader, Eye, EyeOff, Info } from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'
import MFAModal from '../../components/MFAModal'

export default function EmailSettings() {
  const [form,    setForm]    = useState({
    smtp_host: '', smtp_port: '587', smtp_user: '',
    smtp_pass: '', smtp_manufacturer_email: '', app_url: '',
  })
  const [passSet,  setPassSet]  = useState(false)   // true = password already saved in DB
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState(null)
  const [mfaOpen,  setMfaOpen]  = useState(false)
  const [mfaErr,   setMfaErr]   = useState(null)

  useEffect(() => { loadSettings() }, [])

  async function loadSettings() {
    setLoading(true)
    try {
      const data = await apiFetch('/api/settings/email')
      setPassSet(!!data.smtp_pass_set)
      setForm({
        smtp_host:               data.smtp_host               || '',
        smtp_port:               data.smtp_port               || '587',
        smtp_user:               data.smtp_user               || '',
        smtp_pass:               '',   // never pre-fill password
        smtp_manufacturer_email: data.smtp_manufacturer_email || '',
        app_url:                 data.app_url                 || '',
      })
    } catch { /* keep defaults */ }
    finally { setLoading(false) }
  }

  const f = (field, val) => setForm(prev => ({ ...prev, [field]: val }))

  const handleSave = () => {
    setMfaErr(null)
    setMfaOpen(true)
  }

  async function handleMfaConfirm(code) {
    setSaving(true)
    setMfaErr(null)
    try {
      await apiFetch('/api/settings/email', {
        method:  'PUT',
        headers: { 'X-MFA-Code': code },
        body:    JSON.stringify(form),
      })
      setMfaOpen(false)
      if (form.smtp_pass) setPassSet(true)
      setForm(f => ({ ...f, smtp_pass: '' }))  // clear password field after save
      setMsg({ type: 'ok', text: 'E-Mail-Einstellungen gespeichert.' })
    } catch (e) {
      if (e?.code === 'MFA_INVALID') {
        setMfaErr(e.error)
      } else if (e?.code === 'MFA_NOT_SETUP') {
        setMfaOpen(false)
        setMsg({ type: 'err', text: 'MFA nicht eingerichtet. Bitte zuerst MFA in Admin-Einstellungen aktivieren.' })
      } else {
        setMfaOpen(false)
        setMsg({ type: 'err', text: e?.error || 'Speichern fehlgeschlagen.' })
      }
    } finally { setSaving(false) }
  }

  const inp = 'w-full bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-400 transition-colors'

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-3 text-gray-500">
        <Loader size={16} className="animate-spin" /> Laden…
      </div>
    )
  }

  return (
    <div className="p-8 max-w-xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Mail size={18} className="text-gray-400" />
        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">E-Mail / SMTP</h1>
      </div>
      <p className="text-sm text-gray-400 mb-8 ml-7 leading-relaxed">
        SMTP-Zugangsdaten für den automatischen E-Mail-Versand (Bestellbestätigungen,
        Zahlungshinweise, Hersteller-Benachrichtigungen). Änderungen erfordern MFA-Bestätigung.
      </p>

      {/* Status message */}
      {msg && (
        <div className={`flex items-start gap-2 rounded-xl px-4 py-3 mb-5 ${
          msg.type === 'ok' ? 'bg-teal-500/10 border border-teal-500/30' : 'bg-red-500/10 border border-red-500/30'
        }`}>
          {msg.type === 'ok'
            ? <CheckCircle2 size={14} className="text-teal-400 flex-shrink-0 mt-0.5" />
            : <AlertCircle  size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
          }
          <p className={`text-[11px] leading-relaxed ${msg.type === 'ok' ? 'text-teal-700' : 'text-red-600'}`}>
            {msg.text}
          </p>
        </div>
      )}

      <div className="space-y-4">

        {/* SMTP Host */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-400 block mb-1.5">SMTP Host</label>
            <input
              className={inp}
              placeholder="smtp.ionos.de"
              value={form.smtp_host}
              onChange={e => f('smtp_host', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1.5">Port</label>
            <input
              className={inp}
              placeholder="587"
              value={form.smtp_port}
              onChange={e => f('smtp_port', e.target.value)}
            />
          </div>
        </div>

        {/* Sender email */}
        <div>
          <label className="text-xs font-medium text-gray-400 block mb-1.5">Absender E-Mail (SMTP User)</label>
          <input
            className={inp}
            type="email"
            placeholder="info@ihre-domain.de"
            value={form.smtp_user}
            onChange={e => f('smtp_user', e.target.value)}
          />
        </div>

        {/* Password */}
        <div>
          <label className="text-xs font-medium text-gray-400 block mb-1.5">
            Passwort
            {passSet && (
              <span className="ml-2 text-teal-400 normal-case tracking-normal">✓ gesetzt</span>
            )}
          </label>
          <div className="relative">
            <input
              className={inp + ' pr-10'}
              type={showPass ? 'text' : 'password'}
              placeholder={passSet ? 'Leer lassen = Passwort behalten' : 'SMTP-Passwort eingeben'}
              value={form.smtp_pass}
              onChange={e => f('smtp_pass', e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPass(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 bg-transparent border-0 p-0"
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="flex items-start gap-1.5 mt-1.5">
            <Info size={10} className="text-gray-400 flex-shrink-0 mt-0.5" />
            <p className="text-[9px] text-gray-400 leading-relaxed">
              Das Passwort wird aus Sicherheitsgründen nicht angezeigt. Leer lassen = altes Passwort bleibt erhalten.
            </p>
          </div>
        </div>

        {/* Manufacturer email */}
        <div>
          <label className="text-xs font-medium text-gray-400 block mb-1.5">Hersteller-E-Mail</label>
          <input
            className={inp}
            type="email"
            placeholder="hersteller@ihre-domain.de"
            value={form.smtp_manufacturer_email}
            onChange={e => f('smtp_manufacturer_email', e.target.value)}
          />
          <p className="text-[9px] text-gray-400 mt-1 leading-relaxed">
            An diese Adresse werden neue Bestellungen mit Fußmaßen und STL-Link gesendet.
          </p>
        </div>

        {/* App URL */}
        <div>
          <label className="text-xs font-medium text-gray-400 block mb-1.5">App URL</label>
          <input
            className={inp}
            type="url"
            placeholder="https://ihre-domain.de"
            value={form.app_url}
            onChange={e => f('app_url', e.target.value)}
          />
          <p className="text-[9px] text-gray-400 mt-1 leading-relaxed">
            Wird als Basis für Links in E-Mails verwendet (z.B. Link zum Admin-Panel).
          </p>
        </div>

        {/* Save button */}
        <div className="pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white text-xs font-medium px-4 py-2.5 rounded-lg border-0 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
            Speichern (MFA erforderlich)
          </button>
        </div>
      </div>

      <MFAModal
        open={mfaOpen}
        title="E-Mail-Einstellungen speichern"
        onClose={() => setMfaOpen(false)}
        onConfirm={handleMfaConfirm}
        loading={saving}
        error={mfaErr}
      />
    </div>
  )
}
