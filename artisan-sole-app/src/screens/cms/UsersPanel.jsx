import { useState, useEffect } from 'react'
import { Shield, UserX, UserCheck, Trash2, ChevronDown, Plus, Send, ScanLine, Sparkles } from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'

const ROLES = ['user', 'curator', 'admin']

const roleBadge = {
 admin: 'text-[9px] bg-black text-white px-2.5 py-0.5 font-light tracking-wider',
 curator: 'text-[9px] bg-black/10 text-black/50 px-2.5 py-0.5 font-light tracking-wider',
 user: 'text-[9px] text-black/25 px-2.5 py-0.5 font-light tracking-wider',
}

export default function UsersPanel() {
 const { user: me } = useAuth()
 const [users, setUsers] = useState([])
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState(null)
 const [tab, setTab] = useState('all') // 'all' | 'promo'
 const [showPromoForm, setShowPromoForm] = useState(false)
 const [promoForm, setPromoForm] = useState({ email: '', name: '', discount_pct: '', max_orders: '' })
 const [promoSaving, setPromoSaving] = useState(false)
 const [scanAssign, setScanAssign] = useState(null) // { userId, userName }
 const [scanId, setScanId] = useState('')

 const load = async () => {
 try {
 const data = await apiFetch('/api/users')
 setUsers(data)
 } catch (e) {
 setError(e?.error || 'Fehler beim Laden')
 } finally {
 setLoading(false)
 }
 }

 useEffect(() => { load() }, [])

 const changeRole = async (id, role) => {
 try {
 await apiFetch(`/api/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) })
 setUsers(u => u.map(usr => usr.id === id ? { ...usr, role } : usr))
 } catch (e) { alert(e?.error || 'Fehler') }
 }

 const toggleStatus = async (id, is_active) => {
 try {
 await apiFetch(`/api/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ is_active: !is_active }) })
 setUsers(u => u.map(usr => usr.id === id ? { ...usr, is_active: is_active ? 0 : 1 } : usr))
 } catch (e) { alert(e?.error || 'Fehler') }
 }

 const deleteUser = async (id, name) => {
 if (!confirm(`"${name}" wirklich löschen?`)) return
 try {
 await apiFetch(`/api/users/${id}`, { method: 'DELETE' })
 setUsers(u => u.filter(usr => usr.id !== id))
 } catch (e) { alert(e?.error || 'Fehler') }
 }

 const togglePromo = async (u) => {
 const newPromo = !u.is_promotion
 try {
 await apiFetch(`/api/users/${u.id}/promotion`, {
 method: 'PATCH',
 body: JSON.stringify({
 is_promotion: newPromo ? 1 : 0,
 discount_pct: newPromo ? (u.promotion_discount_pct || 20) : null,
 max_orders: newPromo ? (u.promotion_max_orders || null) : null,
 }),
 })
 setUsers(prev => prev.map(usr => usr.id === u.id ? { ...usr, is_promotion: newPromo ? 1 : 0 } : usr))
 } catch (e) { alert(e?.error || 'Fehler') }
 }

 const createPromo = async () => {
 if (!promoForm.email || !promoForm.name) return
 setPromoSaving(true)
 try {
 const res = await apiFetch('/api/users/promotion', {
 method: 'POST',
 body: JSON.stringify({
 email: promoForm.email,
 name: promoForm.name,
 discount_pct: parseFloat(promoForm.discount_pct) || 20,
 max_orders: promoForm.max_orders ? parseInt(promoForm.max_orders) : null,
 }),
 })
 setUsers(prev => [...prev, res.user])
 setShowPromoForm(false)
 setPromoForm({ email: '', name: '', discount_pct: '', max_orders: '' })
 alert('Einladung gesendet!')
 } catch (e) { alert(e?.error || 'Fehler') }
 finally { setPromoSaving(false) }
 }

 const assignScan = async () => {
 if (!scanId || !scanAssign) return
 try {
 await apiFetch('/api/scans/assign', {
 method: 'POST',
 body: JSON.stringify({ scan_id: parseInt(scanId), target_user_id: scanAssign.userId }),
 })
 alert(`Scan #${scanId} wurde ${scanAssign.userName} zugewiesen.`)
 setScanAssign(null)
 setScanId('')
 } catch (e) { alert(e?.error || 'Fehler') }
 }

 const filtered = tab === 'promo' ? users.filter(u => u.is_promotion) : users

 return (
 <div className="px-10 py-10 lg:px-14 lg:py-12">
 <div className="mb-8">
 <p className="text-[9px] text-black/20 uppercase tracking-[0.3em] mb-3 font-light">Administration</p>
 <h1 className="text-[28px] font-extralight text-black/85 tracking-tight">Benutzerverwaltung</h1>
 <p className="text-[13px] text-black/30 mt-2 font-light">Rollen, Status und Zugriff für alle Accounts verwalten</p>
 </div>

 {/* Tabs */}
 <div className="flex items-center gap-3 mb-6">
 <div className="flex gap-1.5">
 {[
 { key: 'all', label: `Alle (${users.length})` },
 { key: 'promo', label: `Promotion (${users.filter(u => u.is_promotion).length})` },
 ].map(t => (
 <button
 key={t.key}
 onClick={() => setTab(t.key)}
 className={`px-3.5 py-1.5 text-[10px] transition-all border-0 uppercase tracking-wider font-light ${
 tab === t.key ? 'bg-black text-white' : 'text-black/25 hover:text-black/50 bg-transparent'
 }`}
 >{t.label}</button>
 ))}
 </div>
 <div className="flex-1" />
 {!showPromoForm && (
 <button
 onClick={() => setShowPromoForm(true)}
 className="flex items-center gap-2 px-6 h-10 border border-black text-black text-[11px] bg-transparent hover:bg-black hover:text-white transition-all uppercase tracking-[0.2em] font-light"
 >
 <Plus size={12} strokeWidth={1.25} /> Promotion-Account
 </button>
 )}
 </div>

 {/* Create Promo Form */}
 {showPromoForm && (
 <div className="bg-white p-6 mb-6 space-y-4">
 <div className="flex items-center gap-2 mb-1">
 <Sparkles size={12} strokeWidth={1.25} className="text-black/25" />
 <h3 className="text-[9px] text-black/20 uppercase tracking-[0.3em] font-light">Promotion-Account erstellen</h3>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <input
 value={promoForm.email} onChange={e => setPromoForm(f => ({ ...f, email: e.target.value }))}
 placeholder="E-Mail *" className="h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 font-light text-black/70 placeholder-black/15"
 />
 <input
 value={promoForm.name} onChange={e => setPromoForm(f => ({ ...f, name: e.target.value }))}
 placeholder="Name *" className="h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 font-light text-black/70 placeholder-black/15"
 />
 <input
 type="number" value={promoForm.discount_pct} onChange={e => setPromoForm(f => ({ ...f, discount_pct: e.target.value }))}
 placeholder="Rabatt % (z.B. 20)" className="h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 font-light text-black/70 placeholder-black/15"
 />
 <input
 type="number" value={promoForm.max_orders} onChange={e => setPromoForm(f => ({ ...f, max_orders: e.target.value }))}
 placeholder="Max. Bestellungen (leer = unbegrenzt)" className="h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 font-light text-black/70 placeholder-black/15"
 />
 </div>
 <div className="flex gap-3 pt-1">
 <button
 onClick={createPromo} disabled={promoSaving || !promoForm.email || !promoForm.name}
 className="flex items-center gap-2 px-6 h-10 border border-black text-black text-[11px] bg-transparent hover:bg-black hover:text-white transition-all uppercase tracking-[0.2em] font-light disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-black"
 >
 <Send size={11} strokeWidth={1.25} /> {promoSaving ? 'Wird gesendet...' : 'Einladung senden'}
 </button>
 <button onClick={() => setShowPromoForm(false)} className="px-3.5 py-1.5 text-[10px] text-black/25 hover:text-black/50 bg-transparent border-0 tracking-wider font-light uppercase">Abbrechen</button>
 </div>
 </div>
 )}

 {/* Scan Assign Modal */}
 {scanAssign && (
 <div className="bg-white p-6 mb-6 space-y-4">
 <h3 className="text-[9px] text-black/20 uppercase tracking-[0.3em] font-light">Scan zuweisen an {scanAssign.userName}</h3>
 <div className="flex gap-3">
 <input
 type="number" value={scanId} onChange={e => setScanId(e.target.value)}
 placeholder="Scan-ID eingeben" className="flex-1 h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 font-light text-black/70 placeholder-black/15"
 />
 <button
 onClick={assignScan} disabled={!scanId}
 className="flex items-center gap-2 px-6 h-10 border border-black text-black text-[11px] bg-transparent hover:bg-black hover:text-white transition-all uppercase tracking-[0.2em] font-light disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-black"
 >
 <ScanLine size={11} strokeWidth={1.25} /> Zuweisen
 </button>
 <button onClick={() => { setScanAssign(null); setScanId('') }} className="px-3.5 py-1.5 text-[10px] text-black/25 hover:text-black/50 bg-transparent border-0 tracking-wider font-light uppercase">Abbrechen</button>
 </div>
 </div>
 )}

 {/* Role legend */}
 <div className="flex gap-3 mb-6 flex-wrap">
 {[
 { role: 'admin', desc: 'Voller Zugriff, User-Verwaltung' },
 { role: 'curator', desc: 'CMS-Inhalte verwalten' },
 { role: 'user', desc: 'Nur App-Zugriff' },
 ].map(({ role, desc }) => (
 <div key={role} className="flex items-center gap-2.5 bg-white px-4 py-3">
 <span className={roleBadge[role]}>{role}</span>
 <span className="text-[11px] text-black/30 font-light">{desc}</span>
 </div>
 ))}
 </div>

 {loading && (
 <div className="flex justify-center py-16">
 <div className="w-5 h-5 border border-black/10 border-t-black/40 rounded-full animate-spin" />
 </div>
 )}

 {error && (
 <div className="bg-white px-6 py-4 text-[13px] text-black/40 font-light">{error}</div>
 )}

 {!loading && !error && (
 <div className="bg-white overflow-hidden">
 <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-6 py-4 border-b border-black/[0.04]">
 {['Benutzer', 'Rolle', 'Status', 'Erstellt', 'Aktionen'].map(h => (
 <p key={h} className="text-[9px] text-black/20 uppercase tracking-[0.25em] font-light">{h}</p>
 ))}
 </div>

 <div>
 {filtered.map(u => (
 <div key={u.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-6 py-4 items-center hover:bg-black/[0.01] border-b border-black/[0.04] transition-colors">
 {/* User info */}
 <div className="min-w-0">
 <div className="flex items-center gap-3">
 <div className="w-7 h-7 bg-black/[0.04] flex items-center justify-center flex-shrink-0">
 <span className="text-[10px] font-light text-black/30">{u.name[0].toUpperCase()}</span>
 </div>
 <div className="min-w-0">
 <div className="flex items-center gap-1.5">
 <p className="text-[13px] font-light text-black/70 truncate">
 {u.name}
 {u.id === me.id && <span className="ml-1.5 text-[9px] text-black/20 font-light">(du)</span>}
 </p>
 {!!u.is_promotion && (
 <span className="text-[8px] bg-black/10 text-black/40 px-2 py-0.5 uppercase tracking-wider font-light flex-shrink-0">PROMO</span>
 )}
 </div>
 <p className="text-[10px] text-black/25 truncate font-light">{u.email}</p>
 {!!u.is_promotion && (
 <p className="text-[9px] text-black/25 mt-0.5 font-light">
 {u.promotion_discount_pct ? `${u.promotion_discount_pct}% Rabatt` : ''}
 {u.promotion_max_orders ? ` · ${u.promotion_orders_used || 0}/${u.promotion_max_orders} Bestellungen` : ''}
 </p>
 )}
 </div>
 </div>
 </div>

 {/* Role selector */}
 <div className="relative">
 {u.id === me.id ? (
 <span className={roleBadge[u.role]}>{u.role}</span>
 ) : (
 <div className="relative">
 <select
 value={u.role}
 onChange={(e) => changeRole(u.id, e.target.value)}
 className={`appearance-none pr-5 cursor-pointer bg-transparent focus:outline-none ${roleBadge[u.role]}`}
 >
 {ROLES.map(r => <option key={r} value={r} className="bg-white text-black/90 normal-case text-sm">{r}</option>)}
 </select>
 <ChevronDown size={8} strokeWidth={1.25} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-current" />
 </div>
 )}
 </div>

 {/* Status badge */}
 <div>
 <span className={`text-[9px] font-light px-2.5 py-0.5 tracking-wider ${
 u.is_active ? 'bg-black/[0.06] text-black/40' : 'bg-black/[0.02] text-black/20'
 }`}>
 {u.is_active ? 'Aktiv' : 'Inaktiv'}
 </span>
 </div>

 {/* Created at */}
 <p className="text-[10px] text-black/25 whitespace-nowrap font-light">
 {new Date(u.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
 </p>

 {/* Actions */}
 <div className="flex gap-1">
 {u.id !== me.id && (
 <>
 <button
 onClick={() => togglePromo(u)}
 title={u.is_promotion ? 'Promotion entfernen' : 'Zu Promotion machen'}
 className="w-7 h-7 flex items-center justify-center hover:bg-black/[0.04] transition-colors border-0 bg-transparent"
 >
 <Sparkles size={12} strokeWidth={1.25} className="text-black/25" />
 </button>
 {!!u.is_promotion && (
 <button
 onClick={() => setScanAssign({ userId: u.id, userName: u.name })}
 title="Scan zuweisen"
 className="w-7 h-7 flex items-center justify-center hover:bg-black/[0.04] transition-colors border-0 bg-transparent"
 >
 <ScanLine size={12} strokeWidth={1.25} className="text-black/25" />
 </button>
 )}
 <button
 onClick={() => toggleStatus(u.id, u.is_active)}
 title={u.is_active ? 'Deaktivieren' : 'Aktivieren'}
 className="w-7 h-7 flex items-center justify-center hover:bg-black/[0.04] transition-colors border-0 bg-transparent"
 >
 {u.is_active
 ? <UserX size={12} strokeWidth={1.25} className="text-black/25" />
 : <UserCheck size={12} strokeWidth={1.25} className="text-black/25" />
 }
 </button>
 <button
 onClick={() => deleteUser(u.id, u.name)}
 title="Löschen"
 className="w-7 h-7 flex items-center justify-center hover:bg-black/[0.04] transition-colors border-0 bg-transparent"
 >
 <Trash2 size={12} strokeWidth={1.25} className="text-black/25" />
 </button>
 </>
 )}
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 )
}
