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

 const inp = 'w-full bg-white border border-black/10 px-3.5 py-2.5 text-sm text-black/90 placeholder-black/20 focus:outline-none focus:border-black/20 transition-colors font-mono'

 if (loading) {
 return (
 <div className="p-8 flex items-center gap-3 text-black/45">
 <Loader size={16} className="animate-spin" /> Laden…
 </div>
 )
 }

 return (
 <div className="p-8 max-w-xl">
 <div className="flex items-center gap-3 mb-2">
 <Landmark size={18} className="text-black/35" />
 <h1 className="text-xl font-semibold text-black/90 tracking-tight" style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}>Bankverbindung</h1>
 </div>
 <p className="text-sm text-black/35 mb-8 ml-7 leading-relaxed">
 Diese Daten werden dem Kunden nach der Bestellung als Überweisungsziel angezeigt.
 Änderungen erfordern MFA-Bestätigung.
 </p>

 {msg && (
 <div className={`flex items-start gap-2 px-4 py-3 mb-5 ${
 msg.type === 'ok' ? 'bg-teal-500/10 border border-teal-500/30' : 'bg-red-500/10 border border-red-500/30'
 }`}>
 {msg.type === 'ok'
 ? <CheckCircle2 size={14} className="text-teal-400 flex-shrink-0 mt-0.5" />
 : <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
 }
 <p className={`text-[11px] leading-relaxed ${msg.type === 'ok' ? 'text-teal-700' : 'text-red-600'}`}>{msg.text}</p>
 </div>
 )}

 <div className="space-y-4">
 <div>
 <label className="text-xs font-medium text-black/35 block mb-1.5">IBAN</label>
 <input className={inp} placeholder="DE00 0000 0000 0000 0000 00" value={form.bank_iban} onChange={e => f('bank_iban', e.target.value)} />
 </div>
 <div>
 <label className="text-xs font-medium text-black/35 block mb-1.5">BIC / SWIFT</label>
 <input className={inp} placeholder="XXXXXXXX" value={form.bank_bic} onChange={e => f('bank_bic', e.target.value)} />
 </div>
 <div>
 <label className="text-xs font-medium text-black/35 block mb-1.5">Kontoinhaber</label>
 <input className={inp} style={{ fontFamily: 'inherit' }} placeholder="ATELIER GmbH" value={form.bank_holder} onChange={e => f('bank_holder', e.target.value)} />
 </div>
 <div>
 <label className="text-xs font-medium text-black/35 block mb-1.5">Bank</label>
 <input className={inp} style={{ fontFamily: 'inherit' }} placeholder="Musterbank" value={form.bank_name} onChange={e => f('bank_name', e.target.value)} />
 </div>

 <div className="pt-2">
 <button
 onClick={handleSave}
 disabled={saving}
 className="flex items-center gap-2 bg-black hover:bg-black text-white text-xs font-medium px-4 py-2.5 border-0 transition-colors disabled:opacity-50"
 >
 {saving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
 Speichern (MFA erforderlich)
 </button>
 </div>
 </div>

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
