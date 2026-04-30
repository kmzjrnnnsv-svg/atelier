import { useState, useEffect } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'
import MFAModal from '../../components/MFAModal'

export default function EmailSettings() {
 const [form, setForm] = useState({
 smtp_host: '', smtp_port: '587', smtp_user: '',
 smtp_pass: '', smtp_manufacturer_email: '', app_url: '',
 })
 const [passSet, setPassSet] = useState(false)
 const [showPass, setShowPass] = useState(false)
 const [loading, setLoading] = useState(true)
 const [saving, setSaving] = useState(false)
 const [msg, setMsg] = useState(null)
 const [mfaOpen, setMfaOpen] = useState(false)
 const [mfaErr, setMfaErr] = useState(null)

 useEffect(() => { loadSettings() }, [])

 async function loadSettings() {
 setLoading(true)
 try {
 const data = await apiFetch('/api/settings/email')
 setPassSet(!!data.smtp_pass_set)
 setForm({
 smtp_host: data.smtp_host || '',
 smtp_port: data.smtp_port || '587',
 smtp_user: data.smtp_user || '',
 smtp_pass: '',
 smtp_manufacturer_email: data.smtp_manufacturer_email || '',
 app_url: data.app_url || '',
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
 method: 'PUT',
 headers: { 'X-MFA-Code': code },
 body: JSON.stringify(form),
 })
 setMfaOpen(false)
 if (form.smtp_pass) setPassSet(true)
 setForm(f => ({ ...f, smtp_pass: '' }))
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

 if (loading) {
 return (
 <div className="px-10 py-10 lg:px-14 lg:py-12 flex items-center gap-3">
 <p className="text-[13px] text-black/30 font-light opacity-50">Laden...</p>
 </div>
 )
 }

 return (
 <div className="px-10 py-10 lg:px-14 lg:py-12 max-w-2xl">
 {/* Header */}
 <div className="mb-10">
 <p className="text-[9px] text-black/20 uppercase tracking-[0.3em] mb-3 font-light">Konfiguration</p>
 <h1 className="text-[28px] font-extralight text-black/85 tracking-tight">E-Mail / SMTP</h1>
 <p className="text-[13px] text-black/30 mt-2 font-light">
 SMTP-Zugangsdaten für den automatischen E-Mail-Versand. Änderungen erfordern MFA-Bestätigung.
 </p>
 </div>

 {/* Status message */}
 {msg && (
 <div className="flex items-start gap-2 mb-6">
 <p className="text-[10px] text-black/25 font-light">
 {msg.text}
 </p>
 </div>
 )}

 <div className="bg-white p-7 mb-6">
 <div className="space-y-5">

 {/* SMTP Host + Port */}
 <div className="grid grid-cols-3 gap-5">
 <div className="col-span-2">
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">SMTP Host</label>
 <input
 className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15"
 placeholder="smtp.ionos.de"
 value={form.smtp_host}
 onChange={e => f('smtp_host', e.target.value)}
 />
 </div>
 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Port</label>
 <input
 className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15"
 placeholder="587"
 value={form.smtp_port}
 onChange={e => f('smtp_port', e.target.value)}
 />
 </div>
 </div>

 {/* Sender email */}
 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Absender E-Mail (SMTP User)</label>
 <input
 className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15"
 type="email"
 placeholder="info@ihre-domain.de"
 value={form.smtp_user}
 onChange={e => f('smtp_user', e.target.value)}
 />
 </div>

 {/* Password */}
 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">
 Passwort
 {passSet && (
 <span className="ml-2 text-black/25 normal-case tracking-normal font-light">gesetzt</span>
 )}
 </label>
 <div className="relative">
 <input
 className="w-full h-10 px-4 pr-10 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15"
 type={showPass ? 'text' : 'password'}
 placeholder={passSet ? 'Leer lassen = Passwort behalten' : 'SMTP-Passwort eingeben'}
 value={form.smtp_pass}
 onChange={e => f('smtp_pass', e.target.value)}
 />
 <button
 type="button"
 onClick={() => setShowPass(v => !v)}
 className="absolute right-3 top-1/2 -translate-y-1/2 text-black/25 hover:text-black/50 bg-transparent border-0 p-0 transition-colors"
 >
 {showPass ? <EyeOff size={14} strokeWidth={1.25} /> : <Eye size={14} strokeWidth={1.25} />}
 </button>
 </div>
 <p className="text-[10px] text-black/25 font-light mt-1.5">
 Das Passwort wird aus Sicherheitsgründen nicht angezeigt. Leer lassen = altes Passwort bleibt erhalten.
 </p>
 </div>

 {/* Manufacturer email */}
 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Hersteller-E-Mail</label>
 <input
 className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15"
 type="email"
 placeholder="hersteller@ihre-domain.de"
 value={form.smtp_manufacturer_email}
 onChange={e => f('smtp_manufacturer_email', e.target.value)}
 />
 <p className="text-[10px] text-black/25 font-light mt-1">
 An diese Adresse werden neue Bestellungen mit Fußmaßen und STL-Link gesendet.
 </p>
 </div>

 {/* App URL */}
 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">App URL</label>
 <input
 className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15"
 type="url"
 placeholder="https://ihre-domain.de"
 value={form.app_url}
 onChange={e => f('app_url', e.target.value)}
 />
 <p className="text-[10px] text-black/25 font-light mt-1">
 Wird als Basis für Links in E-Mails verwendet (z.B. Link zum Admin-Panel).
 </p>
 </div>
 </div>
 </div>

 {/* Save button */}
 <button
 onClick={handleSave}
 disabled={saving}
 className="px-8 h-11 border border-black text-black text-[11px] bg-transparent hover:bg-black hover:text-white transition-all duration-300 uppercase tracking-[0.2em] font-light disabled:opacity-30"
 >
 {saving ? 'Speichern...' : 'Speichern (MFA erforderlich)'}
 </button>

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
