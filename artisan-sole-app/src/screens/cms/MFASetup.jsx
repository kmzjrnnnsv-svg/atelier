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
 <div className="px-10 py-10 lg:px-14 lg:py-12 flex items-center gap-3 text-black/30">
 <Loader size={14} className="animate-spin" />
 <span className="text-[13px] font-light">Laden…</span>
 </div>
 )
 }

 return (
 <div className="px-10 py-10 lg:px-14 lg:py-12" style={{ maxWidth: '640px' }}>
 <p className="text-[9px] text-black/20 uppercase tracking-[0.3em] mb-3 font-light">Sicherheit</p>
 <h1 className="text-[28px] font-extralight text-black/85 tracking-tight">Zwei-Faktor-Authentifizierung</h1>
 <p className="text-[13px] text-black/30 mt-2 font-light mb-10">Schutz Ihres Admin-Zugangs mit TOTP-Einmalpasswort</p>

 {/* Current status */}
 <div className="bg-white p-7 mb-6">
 <div className="flex items-center gap-3">
 {status.enabled
 ? <><ShieldCheck size={15} className="text-black/30" /><span className="text-[13px] text-black/60 font-light">MFA ist aktiviert</span></>
 : <><ShieldOff size={15} className="text-black/25" /><span className="text-[13px] text-black/40 font-light">MFA ist nicht aktiviert</span></>
 }
 </div>
 </div>

 {/* Feedback message */}
 {msg && (
 <div className="flex items-start gap-3 mb-6">
 {msg.type === 'ok'
 ? <CheckCircle2 size={13} className="text-black/30 flex-shrink-0 mt-0.5" />
 : <AlertCircle size={13} className="text-black/25 flex-shrink-0 mt-0.5" />
 }
 <p className={`text-[13px] leading-relaxed font-light ${msg.type === 'ok' ? 'text-black/60' : 'text-black/40'}`}>{msg.text}</p>
 </div>
 )}

 {/* -- IDLE: Not yet set up -- */}
 {phase === 'idle' && !status.enabled && (
 <div>
 <p className="text-[13px] text-black/30 font-light leading-relaxed mb-8">
 Schutzen Sie Ihren Admin-Zugang mit einem Einmalpasswort (TOTP).
 Sie benotigen eine Authenticator-App wie <span className="text-black/70">Google Authenticator</span> oder <span className="text-black/70">Aegis</span>.
 </p>
 <button
 onClick={handleSetup}
 disabled={loading}
 className="px-8 h-11 border border-black text-black text-[11px] bg-transparent hover:bg-black hover:text-white transition-all uppercase tracking-[0.2em] font-light disabled:opacity-30 flex items-center gap-3"
 >
 {loading ? <Loader size={13} className="animate-spin" /> : <QrCode size={13} />}
 MFA einrichten
 </button>
 </div>
 )}

 {/* -- SETUP: Show QR code -- */}
 {phase === 'setup' && (
 <div>
 <p className="text-[13px] text-black/30 font-light mb-8 leading-relaxed">
 Scannen Sie diesen QR-Code mit Ihrer Authenticator-App und geben Sie dann den angezeigten 6-stelligen Code ein.
 </p>
 <div className="bg-white p-7 mb-6 inline-block">
 <div className="border border-black/[0.06] p-4 inline-block">
 <img src={qrCode} alt="MFA QR Code" className="w-48 h-48" />
 </div>
 </div>
 <div className="bg-white p-7 mb-8">
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Manueller Schlussel</label>
 <p className="text-[13px] font-mono text-black/70 font-light break-all">{secret}</p>
 </div>
 <form onSubmit={handleConfirm} className="space-y-4">
 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Bestatigungscode</label>
 <input
 type="text"
 inputMode="numeric"
 maxLength={6}
 value={code}
 onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
 className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 font-light text-black/70 placeholder-black/15 text-center tracking-[0.5em] font-mono"
 placeholder="000000"
 />
 </div>
 <button
 type="submit"
 disabled={code.length !== 6 || loading}
 className="w-full px-8 h-11 border border-black text-black text-[11px] bg-transparent hover:bg-black hover:text-white transition-all uppercase tracking-[0.2em] font-light disabled:opacity-30 flex items-center justify-center gap-3"
 >
 {loading ? <Loader size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
 Aktivieren
 </button>
 <button
 type="button"
 onClick={() => { setPhase('idle'); setMsg(null) }}
 className="w-full px-6 h-11 text-[11px] text-black/30 hover:text-black/60 bg-transparent border-0 font-light transition-all"
 >
 Abbrechen
 </button>
 </form>
 </div>
 )}

 {/* -- IDLE: Already enabled -> offer disable -- */}
 {phase === 'idle' && status.enabled && (
 <div>
 <p className="text-[13px] text-black/30 font-light leading-relaxed mb-8">
 Ihre sensitiven Admin-Aktionen (Zahlungsbestatigung, Bankdaten) sind durch MFA geschutzt.
 </p>
 <button
 onClick={() => { setMfaModal(true); setMfaErr(null) }}
 className="px-6 h-11 text-[11px] text-black/30 hover:text-black/60 bg-transparent border border-black/[0.08] font-light transition-all uppercase tracking-[0.2em] flex items-center gap-3"
 >
 <ShieldOff size={13} />
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
