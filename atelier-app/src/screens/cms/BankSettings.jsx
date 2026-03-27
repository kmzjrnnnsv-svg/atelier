import { useState, useEffect } from 'react'
import { Landmark, Save, CheckCircle2, AlertCircle, Loader } from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'
import MFAModal from '../../components/MFAModal'

export default function BankSettings() {
 const [form, setForm] = useState({ bank_iban: '', bank_bic: '', bank_holder: '', bank_name: '' })
 const [loading, setLoading] = useState(true)
 const [saving, setSaving] = useState(false)
 const [msg, setMsg] = useState(null)
 const [mfaOpen, setMfaOpen] = useState(false)
 const [mfaErr, setMfaErr] = useState(null)

 useEffect(() => { loadSettings() }, [])

 async function loadSettings() {
 setLoading(true)
 try {
 const data = await apiFetch('/api/settings/bank')
 setForm(data)
 } catch { /* fallback to empty */ }
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
 await apiFetch('/api/settings/bank', {
 method: 'PUT',
 headers: { 'X-MFA-Code': code },
 body: JSON.stringify(form),
 })
 setMfaOpen(false)
 setMsg({ type: 'ok', text: 'Bankdaten erfolgreich gespeichert.' })
 } catch (e) {
 if (e?.code === 'MFA_INVALID') {
 setMfaErr(e.error)
 } else if (e?.code === 'MFA_NOT_SETUP') {
 setMfaOpen(false)
 setMsg({ type: 'err', text: 'MFA nicht eingerichtet. Bitte zuerst MFA aktivieren.' })
 } else {
 setMfaOpen(false)
 setMsg({ type: 'err', text: e?.error || 'Speichern fehlgeschlagen.' })
 }
 } finally { setSaving(false) }
 }

 const inp = 'w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15 font-mono'

 if (loading) {
 return (
 <div className="px-10 py-10 lg:px-14 lg:py-12 flex items-center gap-3 text-black/30">
 <div className="w-5 h-5 border border-black/10 border-t-black/40 animate-spin rounded-full" /> Laden…
 </div>
 )
 }

 return (
 <div className="px-10 py-10 lg:px-14 lg:py-12" style={{ maxWidth: '640px' }}>
 <div className="mb-10">
 <p className="text-[9px] text-black/20 uppercase tracking-[0.3em] mb-3 font-light">Administration</p>
 <h1 className="text-[28px] font-extralight text-black/85 tracking-tight">Bankverbindung</h1>
 <p className="text-[13px] text-black/30 mt-2 font-light">
 Diese Daten werden dem Kunden nach der Bestellung als Überweisungsziel angezeigt.
 Änderungen erfordern MFA-Bestätigung.
 </p>
 </div>

 {msg && (
 <div className="flex items-start gap-2.5 px-5 py-3.5 mb-6 bg-white">
 {msg.type === 'ok'
 ? <CheckCircle2 size={13} className="text-black/40 flex-shrink-0 mt-0.5" strokeWidth={1.25} />
 : <AlertCircle size={13} className="text-black/30 flex-shrink-0 mt-0.5" strokeWidth={1.25} />
 }
 <p className="text-[12px] font-light text-black/50">{msg.text}</p>
 </div>
 )}

 <div className="bg-white p-7 space-y-5">
 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">IBAN</label>
 <input className={inp} placeholder="DE00 0000 0000 0000 0000 00" value={form.bank_iban} onChange={e => f('bank_iban', e.target.value)} />
 </div>
 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">BIC / SWIFT</label>
 <input className={inp} placeholder="XXXXXXXX" value={form.bank_bic} onChange={e => f('bank_bic', e.target.value)} />
 </div>
 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Kontoinhaber</label>
 <input className={inp} style={{ fontFamily: 'inherit' }} placeholder="ATELIER GmbH" value={form.bank_holder} onChange={e => f('bank_holder', e.target.value)} />
 </div>
 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Bank</label>
 <input className={inp} style={{ fontFamily: 'inherit' }} placeholder="Musterbank" value={form.bank_name} onChange={e => f('bank_name', e.target.value)} />
 </div>
 </div>

 <button
 onClick={handleSave}
 disabled={saving}
 className="mt-8 px-8 h-11 border border-black text-black text-[11px] bg-transparent hover:bg-black hover:text-white transition-all duration-300 uppercase tracking-[0.2em] font-light disabled:opacity-30 flex items-center gap-2"
 >
 {saving ? <div className="w-4 h-4 border border-black/20 border-t-black/60 animate-spin rounded-full" /> : null}
 Speichern (MFA)
 </button>

 <MFAModal
 open={mfaOpen}
 title="Bankdaten speichern"
 onClose={() => setMfaOpen(false)}
 onConfirm={handleMfaConfirm}
 loading={saving}
 error={mfaErr}
 />
 </div>
 )
}
