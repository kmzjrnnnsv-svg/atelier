import { useState, useEffect } from 'react'
import { ShieldCheck, ShieldOff, QrCode, CheckCircle2, AlertCircle, Loader } from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'
import MFAModal from '../../components/MFAModal'

export default function MFASetup() {
 const [status, setStatus] = useState(null) // null | { enabled: bool }
 const [phase, setPhase] = useState('idle') // idle | setup | confirm | disabling
 const [qrCode, setQrCode] = useState(null)
 const [secret, setSecret] = useState(null)
 const [code, setCode] = useState('')
 const [loading, setLoading] = useState(false)
 const [msg, setMsg] = useState(null) // { type: 'ok'|'err', text }
 const [mfaModal, setMfaModal] = useState(false)
 const [mfaErr, setMfaErr] = useState(null)

 useEffect(() => { loadStatus() }, [])

 async function loadStatus() {
 try {
 const s = await apiFetch('/api/auth/mfa/status')
 setStatus(s)
 } catch { setStatus({ enabled: false }) }
 }

 async function handleSetup() {
 setLoading(true)
 setMsg(null)
 try {
 const data = await apiFetch('/api/auth/mfa/setup', { method: 'POST' })
 setQrCode(data.qrCode)
 setSecret(data.secret)
 setPhase('setup')
 } catch (e) {
 setMsg({ type: 'err', text: e?.error || 'Fehler beim Setup' })
 } finally { setLoading(false) }
 }

 async function handleConfirm(e) {
 e?.preventDefault()
 if (code.length !== 6) return
 setLoading(true)
 setMsg(null)
 try {
 await apiFetch('/api/auth/mfa/confirm', { method: 'POST', body: JSON.stringify({ code }) })
 setMsg({ type: 'ok', text: 'MFA erfolgreich aktiviert! Bewahren Sie Ihren Authenticator sicher auf.' })
 setPhase('idle')
 setStatus({ enabled: true })
 } catch (e) {
 setMsg({ type: 'err', text: e?.error || 'Ungültiger Code' })
 } finally { setLoading(false) }
 }

 async function handleDisable(mfaCode) {
 setLoading(true)
 setMfaErr(null)
 try {
 await apiFetch('/api/auth/mfa', { method: 'DELETE', headers: { 'X-MFA-Code': mfaCode } })
 setMfaModal(false)
 setMsg({ type: 'ok', text: 'MFA deaktiviert.' })
 setStatus({ enabled: false })
 } catch (e) {
 setMfaErr(e?.error || 'Ungültiger Code')
 } finally { setLoading(false) }
 }

 if (!status) {
 return (
 <div className="p-8 flex items-center gap-3 text-black/45">
 <Loader size={16} className="animate-spin" /> Laden…
 </div>
 )
 }

 return (
 <div className="p-8" style={{ maxWidth: '640px' }}>
 <div className="flex items-center gap-3 mb-6">
 <ShieldCheck size={18} className="text-black/40" />
 <h1 className="text-xl font-bold text-black/85" style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}>Zwei-Faktor-Authentifizierung (MFA)</h1>
 </div>

 {/* Current status */}
 <div className={`flex items-center gap-3 px-4 py-3 mb-6 ${
 status.enabled ? 'bg-black/4 border border-black/10' : 'bg-black/5 border border-black/15'
 }`}>
 {status.enabled
 ? <><ShieldCheck size={16} className="text-black/40" /><span className="text-sm text-black/50 font-semibold">MFA ist aktiviert</span></>
 : <><ShieldOff size={16} className="text-black/45" /><span className="text-sm text-black/45">MFA ist nicht aktiviert</span></>
 }
 </div>

 {/* Feedback message */}
 {msg && (
 <div className={`flex items-start gap-2 px-4 py-3 mb-5 ${
 msg.type === 'ok' ? 'bg-black/4 border border-black/10' : 'bg-black/4 border border-black/10'
 }`}>
 {msg.type === 'ok'
 ? <CheckCircle2 size={14} className="text-black/40 flex-shrink-0 mt-0.5" />
 : <AlertCircle size={14} className="text-black/40 flex-shrink-0 mt-0.5" />
 }
 <p className={`text-[11px] leading-relaxed ${msg.type === 'ok' ? 'text-black/50' : 'text-black/40'}`}>{msg.text}</p>
 </div>
 )}

 {/* ── IDLE: Not yet set up ── */}
 {phase === 'idle' && !status.enabled && (
 <div>
 <p className="text-[12px] text-black/35 leading-relaxed mb-5">
 Schützen Sie Ihren Admin-Zugang mit einem Einmalpasswort (TOTP).
 Sie benötigen eine Authenticator-App wie <strong className="text-black/90">Google Authenticator</strong> oder <strong className="text-black/90">Aegis</strong>.
 </p>
 <button
 onClick={handleSetup}
 disabled={loading}
 className="flex items-center gap-2 bg-black hover:bg-black text-white text-xs font-medium px-4 py-2.5 border-0 transition-colors disabled:opacity-50"
 >
 {loading ? <Loader size={14} className="animate-spin" /> : <QrCode size={14} />}
 MFA einrichten
 </button>
 </div>
 )}

 {/* ── SETUP: Show QR code ── */}
 {phase === 'setup' && (
 <div>
 <p className="text-[12px] text-black/35 mb-4 leading-relaxed">
 Scannen Sie diesen QR-Code mit Ihrer Authenticator-App und geben Sie dann den angezeigten 6-stelligen Code ein.
 </p>
 <div className="bg-white p-4 inline-block mb-5">
 <img src={qrCode} alt="MFA QR Code" className="w-48 h-48" />
 </div>
 <div className="bg-black/5 px-4 py-3 mb-5">
 <p className="text-xs font-medium text-black/35 mb-1">Manueller Schlüssel</p>
 <p className="text-xs font-mono text-black/65 break-all">{secret}</p>
 </div>
 <form onSubmit={handleConfirm} className="space-y-3">
 <input
 type="text"
 inputMode="numeric"
 maxLength={6}
 value={code}
 onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
 className="w-full bg-white border border-black/10 px-3.5 py-2.5 text-black/90 text-center text-2xl font-mono tracking-[0.5em] focus:outline-none focus:border-black/20 transition-colors placeholder-black/20"
 placeholder="000000"
 />
 <button
 type="submit"
 disabled={code.length !== 6 || loading}
 className="w-full py-2.5 bg-black hover:bg-black text-white text-xs font-medium flex items-center justify-center gap-2 border-0 transition-colors disabled:opacity-40"
 >
 {loading ? <Loader size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
 Aktivieren
 </button>
 <button
 type="button"
 onClick={() => { setPhase('idle'); setMsg(null) }}
 className="w-full py-2 text-xs text-black/45 hover:text-black/65 border-0 bg-transparent transition-colors"
 >
 Abbrechen
 </button>
 </form>
 </div>
 )}

 {/* ── IDLE: Already enabled → offer disable ── */}
 {phase === 'idle' && status.enabled && (
 <div>
 <p className="text-[12px] text-black/35 leading-relaxed mb-5">
 Ihre sensitiven Admin-Aktionen (Zahlungsbestätigung, Bankdaten) sind durch MFA geschützt.
 </p>
 <button
 onClick={() => { setMfaModal(true); setMfaErr(null) }}
 className="flex items-center gap-2 bg-black/5 hover:bg-black/8 text-black/40 text-xs font-medium px-4 py-2.5 border border-black/10 transition-colors"
 >
 <ShieldOff size={14} />
 MFA deaktivieren
 </button>
 </div>
 )}

 {/* Disable MFA modal */}
 <MFAModal
 open={mfaModal}
 title="MFA deaktivieren"
 onClose={() => setMfaModal(false)}
 onConfirm={handleDisable}
 loading={loading}
 error={mfaErr}
 />
 </div>
 )
}
