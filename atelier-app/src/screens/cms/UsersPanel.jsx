import { useState, useEffect } from 'react'
import { Shield, UserX, UserCheck, Trash2, ChevronDown, Plus, Send, ScanLine, Sparkles } from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'

const ROLES = ['user', 'curator', 'admin']

const roleBadge = {
 admin: 'bg-black text-white',
 curator: 'bg-black/15 text-black/60',
 user: 'bg-black/5 text-black/35',
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
 <div className="p-8">
 <div className="mb-6">
 <div className="flex items-center gap-2 mb-1">
 <Shield size={18} strokeWidth={1.5} className="text-black/35" />
 <h1 className="text-xl font-bold text-black/85" style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>Benutzerverwaltung</h1>
 </div>
 <p className="text-black/45 text-sm">Rollen, Status und Zugriff für alle Accounts verwalten</p>
 </div>

 {/* Tabs */}
 <div className="flex items-center gap-3 mb-5">
 <div className="flex gap-1.5">
 {[
 { key: 'all', label: `Alle (${users.length})` },
 { key: 'promo', label: `Promotion (${users.filter(u => u.is_promotion).length})` },
 ].map(t => (
 <button
 key={t.key}
 onClick={() => setTab(t.key)}
 className={`px-3 py-1.5 text-[10px] font-semibold transition-all border-0 uppercase tracking-wider ${
 tab === t.key ? 'bg-black text-white' : 'bg-black/4 text-black/35 hover:text-black/60 hover:bg-black/8'
 }`}
 >{t.label}</button>
 ))}
 </div>
 <div className="flex-1" />
 {!showPromoForm && (
 <button
 onClick={() => setShowPromoForm(true)}
 className="flex items-center gap-2 bg-amber-600 text-white text-[10px] font-semibold px-4 py-2 border-0 uppercase tracking-wider hover:bg-amber-700 transition-colors"
 >
 <Plus size={12} /> Promotion-Account
 </button>
 )}
 </div>

 {/* Create Promo Form */}
 {showPromoForm && (
 <div className="bg-amber-50 border border-amber-200/60 p-5 mb-5 space-y-3">
 <div className="flex items-center gap-2 mb-1">
 <Sparkles size={14} className="text-amber-600" />
 <h3 className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Promotion-Account erstellen</h3>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <input
 value={promoForm.email} onChange={e => setPromoForm(f => ({ ...f, email: e.target.value }))}
 placeholder="E-Mail *" className="bg-white border border-amber-200 px-3 py-2.5 text-sm placeholder-black/20 focus:outline-none focus:border-amber-400"
 />
 <input
 value={promoForm.name} onChange={e => setPromoForm(f => ({ ...f, name: e.target.value }))}
 placeholder="Name *" className="bg-white border border-amber-200 px-3 py-2.5 text-sm placeholder-black/20 focus:outline-none focus:border-amber-400"
 />
 <input
 type="number" value={promoForm.discount_pct} onChange={e => setPromoForm(f => ({ ...f, discount_pct: e.target.value }))}
 placeholder="Rabatt % (z.B. 20)" className="bg-white border border-amber-200 px-3 py-2.5 text-sm placeholder-black/20 focus:outline-none focus:border-amber-400"
 />
 <input
 type="number" value={promoForm.max_orders} onChange={e => setPromoForm(f => ({ ...f, max_orders: e.target.value }))}
 placeholder="Max. Bestellungen (leer = unbegrenzt)" className="bg-white border border-amber-200 px-3 py-2.5 text-sm placeholder-black/20 focus:outline-none focus:border-amber-400"
 />
 </div>
 <div className="flex gap-2">
 <button
 onClick={createPromo} disabled={promoSaving || !promoForm.email || !promoForm.name}
 className="flex items-center gap-2 bg-amber-600 text-white text-[10px] font-semibold px-4 py-2 border-0 uppercase tracking-wider hover:bg-amber-700 disabled:opacity-40 transition-all"
 >
 <Send size={11} /> {promoSaving ? 'Wird gesendet...' : 'Einladung senden'}
 </button>
 <button onClick={() => setShowPromoForm(false)} className="px-4 py-2 text-[10px] text-black/40 bg-black/4 border-0 hover:bg-black/8">Abbrechen</button>
 </div>
 </div>
 )}

 {/* Scan Assign Modal */}
 {scanAssign && (
 <div className="bg-teal-50 border border-teal-200/60 p-5 mb-5 space-y-3">
 <h3 className="text-[11px] font-semibold text-teal-800 uppercase tracking-wider">Scan zuweisen an {scanAssign.userName}</h3>
 <div className="flex gap-2">
 <input
 type="number" value={scanId} onChange={e => setScanId(e.target.value)}
 placeholder="Scan-ID eingeben" className="flex-1 bg-white border border-teal-200 px-3 py-2.5 text-sm placeholder-black/20 focus:outline-none focus:border-teal-400"
 />
 <button
 onClick={assignScan} disabled={!scanId}
 className="flex items-center gap-2 bg-teal-600 text-white text-[10px] font-semibold px-4 py-2 border-0 uppercase tracking-wider hover:bg-teal-700 disabled:opacity-40"
 >
 <ScanLine size={11} /> Zuweisen
 </button>
 <button onClick={() => { setScanAssign(null); setScanId('') }} className="px-3 py-2 text-[10px] text-black/40 bg-black/4 border-0 hover:bg-black/8">Abbrechen</button>
 </div>
 </div>
 )}

 {/* Role legend */}
 <div className="flex gap-3 mb-5 flex-wrap">
 {[
 { role: 'admin', desc: 'Voller Zugriff, User-Verwaltung' },
 { role: 'curator', desc: 'CMS-Inhalte verwalten' },
 { role: 'user', desc: 'Nur App-Zugriff' },
 ].map(({ role, desc }) => (
 <div key={role} className="flex items-center gap-2 bg-white px-3 py-2 border border-black/6">
 <span className={`text-[10px] font-medium px-2 py-0.5 ${roleBadge[role]}`}>{role}</span>
 <span className="text-xs text-black/35">{desc}</span>
 </div>
 ))}
 </div>

 {loading && (
 <div className="flex justify-center py-16">
 <div className="w-6 h-6 border-2 border-black/15 border-t-black animate-spin-custom" />
 </div>
 )}

 {error && (
 <div className="bg-black/5 border border-black/10 px-4 py-3 text-sm text-black/50">{error}</div>
 )}

 {!loading && !error && (
 <div className="bg-white border border-black/6 overflow-hidden">
 <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 bg-[#f6f5f3] border-b border-black/6">
 {['Benutzer', 'Rolle', 'Status', 'Erstellt', 'Aktionen'].map(h => (
 <p key={h} className="text-[10px] font-medium text-black/30 uppercase tracking-wider">{h}</p>
 ))}
 </div>

 <div className="divide-y divide-black/6">
 {filtered.map(u => (
 <div key={u.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-4 items-center hover:bg-black/5 transition-colors">
 {/* User info */}
 <div className="min-w-0">
 <div className="flex items-center gap-2">
 <div className="w-7 h-7 bg-black/10 flex items-center justify-center flex-shrink-0">
 <span className="text-[10px] font-bold text-black/65">{u.name[0].toUpperCase()}</span>
 </div>
 <div className="min-w-0">
 <div className="flex items-center gap-1.5">
 <p className="text-sm font-medium text-black/90 truncate">
 {u.name}
 {u.id === me.id && <span className="ml-1.5 text-[8px] text-black/45">(du)</span>}
 </p>
 {!!u.is_promotion && (
 <span className="text-[8px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 uppercase tracking-wider flex-shrink-0">PROMO</span>
 )}
 </div>
 <p className="text-[10px] text-black/45 truncate">{u.email}</p>
 {!!u.is_promotion && (
 <p className="text-[9px] text-amber-600/70 mt-0.5">
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
 <span className={`text-[10px] font-medium px-2 py-0.5 ${roleBadge[u.role]}`}>{u.role}</span>
 ) : (
 <div className="relative">
 <select
 value={u.role}
 onChange={(e) => changeRole(u.id, e.target.value)}
 className={`appearance-none text-[10px] font-medium px-2 py-0.5 pr-5 cursor-pointer bg-transparent focus:outline-none ${roleBadge[u.role]}`}
 >
 {ROLES.map(r => <option key={r} value={r} className="bg-white text-black/90 normal-case text-sm">{r}</option>)}
 </select>
 <ChevronDown size={9} strokeWidth={1.5} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-current" />
 </div>
 )}
 </div>

 {/* Status badge */}
 <div>
 <span className={`text-[10px] font-medium px-2 py-0.5 ${
 u.is_active ? 'bg-black/8 text-black/50' : 'bg-black/4 text-black/25'
 }`}>
 {u.is_active ? 'Aktiv' : 'Inaktiv'}
 </span>
 </div>

 {/* Created at */}
 <p className="text-[10px] text-black/35 whitespace-nowrap">
 {new Date(u.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
 </p>

 {/* Actions */}
 <div className="flex gap-1">
 {u.id !== me.id && (
 <>
 <button
 onClick={() => togglePromo(u)}
 title={u.is_promotion ? 'Promotion entfernen' : 'Zu Promotion machen'}
 className={`w-7 h-7 flex items-center justify-center border-0 transition-colors ${u.is_promotion ? 'bg-amber-100 hover:bg-amber-200' : 'bg-black/4 hover:bg-black/8'}`}
 >
 <Sparkles size={11} strokeWidth={1.5} className={u.is_promotion ? 'text-amber-600' : 'text-black/30'} />
 </button>
 {!!u.is_promotion && (
 <button
 onClick={() => setScanAssign({ userId: u.id, userName: u.name })}
 title="Scan zuweisen"
 className="w-7 h-7 bg-teal-50 hover:bg-teal-100 flex items-center justify-center border-0 transition-colors"
 >
 <ScanLine size={11} strokeWidth={1.5} className="text-teal-600" />
 </button>
 )}
 <button
 onClick={() => toggleStatus(u.id, u.is_active)}
 title={u.is_active ? 'Deaktivieren' : 'Aktivieren'}
 className="w-7 h-7 flex items-center justify-center border-0 transition-colors bg-black/4 hover:bg-black/8"
 >
 {u.is_active
 ? <UserX size={12} strokeWidth={1.5} className="text-black/40" />
 : <UserCheck size={12} strokeWidth={1.5} className="text-black/40" />
 }
 </button>
 <button
 onClick={() => deleteUser(u.id, u.name)}
 title="Löschen"
 className="w-7 h-7 bg-black/4 hover:bg-black/8 flex items-center justify-center border-0 transition-colors"
 >
 <Trash2 size={12} strokeWidth={1.5} className="text-black/30" />
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
