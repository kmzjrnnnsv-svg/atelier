import { useState, useEffect } from 'react'
import { Eye, EyeOff, Send, CheckCircle2, XCircle } from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'
import MFAModal from '../../components/MFAModal'

export default function EmailSettings() {
 const [form, setForm] = useState({
 smtp_host: '', smtp_port: '587', smtp_user: '',
 smtp_pass: '', smtp_manufacturer_email: '', business_inquiry_email: '', app_url: '',
 })
 const [passSet, setPassSet] = useState(false)
 const [showPass, setShowPass] = useState(false)
 const [loading, setLoading] = useState(true)
 const [saving, setSaving] = useState(false)
 const [msg, setMsg] = useState(null)
 const [mfaOpen, setMfaOpen] = useState(false)
 const [mfaErr, setMfaErr] = useState(null)
 const [check, setCheck] = useState(null)      // Ergebnis der Verbindungsprüfung
 const [testTo, setTestTo] = useState('')
 const [testing, setTesting] = useState(false)
 const [testResult, setTestResult] = useState(null)

 // Beim Öffnen sofort prüfen: Die häufigste Ursache für ausbleibende Mails ist
 // eine fehlende Zugangskennung, und das sieht man den Feldern nicht an.
 useEffect(() => { apiFetch('/api/settings/email/check').then(setCheck).catch(() => setCheck(null)) }, [])

 const runTest = async () => {
   setTesting(true); setTestResult(null)
   try {
     await apiFetch('/api/settings/email/test', { method: 'POST', body: JSON.stringify({ to: testTo.trim() }) })
     setTestResult({ ok: true })
   } catch (e) {
     setTestResult({ ok: false, error: e?.error || 'Versand fehlgeschlagen' })
   } finally { setTesting(false) }
 }

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
 business_inquiry_email: data.business_inquiry_email || '',
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
 <div className="flex items-center gap-3">
 <p className="text-[13px] text-black/30 font-light opacity-50">Laden...</p>
 </div>
 )
 }

 return (
 <div className="max-w-2xl">
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

 {/* Inquiry email */}
 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Anfragen-E-Mail</label>
 <input
 className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15"
 type="email"
 placeholder="anfragen@ihre-domain.de"
 value={form.business_inquiry_email}
 onChange={e => f('business_inquiry_email', e.target.value)}
 />
 <p className="text-[10px] text-black/25 font-light mt-1">
 An diese Adresse gehen neue Anfragen (Firmen- &amp; Custom-Anfragen). Leer = Hersteller-E-Mail.
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

 {/* Zustand des Versands, sichtbar ohne Suchen im Log */}
 {check && (
 <div className={`mb-6 border px-4 py-3 ${check.ok ? 'border-black/10 bg-black/[0.02]' : 'border-amber-300 bg-amber-50'}`}>
 <div className="flex items-start gap-2">
 {check.ok
 ? <CheckCircle2 size={14} className="text-green-700 flex-shrink-0 mt-0.5" strokeWidth={1.6} />
 : <XCircle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" strokeWidth={1.6} />}
 <div className="min-w-0">
 <p className="text-[12px] font-light text-black/70">
 {check.ok ? `Verbindung zu ${check.host}:${check.port} steht.` : `Kein Versand möglich: ${check.reason}`}
 </p>
 {check.ok && !check.appUrlUsable && (
 <p className="text-[11px] text-amber-800 font-light mt-1.5 leading-relaxed">
 Die Adresse der Anwendung steht auf <strong className="font-normal">{check.appUrl}</strong>.
 Mails gehen zwar hinaus, aber Einladungs- und Bestätigungslinks darin führen beim
 Empfänger ins Leere. Bitte unten auf die öffentliche Adresse setzen.
 </p>
 )}
 </div>
 </div>
 </div>
 )}

 {/* Testversand */}
 <div className="mb-8 border border-black/[0.08] px-4 py-4">
 <p className="text-[10px] text-black/30 uppercase tracking-[0.2em] mb-2.5 font-light">Testnachricht</p>
 <div className="flex gap-2">
 <input
 type="email" value={testTo} onChange={e => setTestTo(e.target.value)}
 placeholder="empfaenger@beispiel.de"
 className="flex-1 h-10 px-3 border border-black/[0.12] text-[13px] font-light text-black/70 outline-none focus:border-black/40"
 />
 <button
 onClick={runTest} disabled={testing || !testTo.includes('@')}
 className="px-5 h-10 flex items-center gap-2 border border-black/20 text-[11px] uppercase tracking-[0.15em] font-light bg-transparent hover:bg-black hover:text-white transition-colors disabled:opacity-30"
 >
 <Send size={13} strokeWidth={1.4} /> {testing ? 'Sendet…' : 'Senden'}
 </button>
 </div>
 {testResult && (
 <p className={`text-[12px] font-light mt-2 ${testResult.ok ? 'text-green-700' : 'text-red-700'}`}>
 {testResult.ok ? 'Versendet. Bitte im Postfach nachsehen, auch im Spam-Ordner.' : testResult.error}
 </p>
 )}
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
