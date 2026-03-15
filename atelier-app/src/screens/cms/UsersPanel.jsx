import { useState, useEffect } from 'react'
import { Shield, UserX, UserCheck, Trash2, ChevronDown } from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'

const ROLES = ['user', 'curator', 'admin']

const roleBadge = {
 admin: 'bg-red-100 text-red-600 border-red-200',
 curator: 'bg-purple-100 text-purple-700 border-purple-200',
 user: 'bg-black/10 text-black/45 border-black/15',
}

export default function UsersPanel() {
 const { user: me } = useAuth()
 const [users, setUsers] = useState([])
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState(null)

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
 await apiFetch(`/api/users/${id}/role`, {
 method: 'PATCH',
 body: JSON.stringify({ role }),
 })
 setUsers(u => u.map(usr => usr.id === id ? { ...usr, role } : usr))
 } catch (e) {
 alert(e?.error || 'Fehler')
 }
 }

 const toggleStatus = async (id, is_active) => {
 try {
 await apiFetch(`/api/users/${id}/status`, {
 method: 'PATCH',
 body: JSON.stringify({ is_active: !is_active }),
 })
 setUsers(u => u.map(usr => usr.id === id ? { ...usr, is_active: is_active ? 0 : 1 } : usr))
 } catch (e) {
 alert(e?.error || 'Fehler')
 }
 }

 const deleteUser = async (id, name) => {
 if (!confirm(`"${name}" wirklich löschen?`)) return
 try {
 await apiFetch(`/api/users/${id}`, { method: 'DELETE' })
 setUsers(u => u.filter(usr => usr.id !== id))
 } catch (e) {
 alert(e?.error || 'Fehler')
 }
 }

 return (
 <div className="p-8 max-w-4xl">
 <div className="mb-6">
 <div className="flex items-center gap-2 mb-1">
 <Shield size={18} className="text-red-400" />
 <h1 className="text-xl font-semibold text-black/90 tracking-tight" style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}>Benutzerverwaltung</h1>
 </div>
 <p className="text-black/45 text-sm">Rollen, Status und Zugriff für alle Accounts verwalten</p>
 </div>

 {/* Role legend */}
 <div className="flex gap-3 mb-6 flex-wrap">
 {[
 { role: 'admin', desc: 'Voller Zugriff, User-Verwaltung' },
 { role: 'curator', desc: 'CMS-Inhalte verwalten' },
 { role: 'user', desc: 'Nur App-Zugriff' },
 ].map(({ role, desc }) => (
 <div key={role} className="flex items-center gap-2 bg-white px-3 py-2 border border-black/8">
 <span className={`text-[10px] font-medium px-2 py-0.5 border ${roleBadge[role]}`}>{role}</span>
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
 <div className="bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">{error}</div>
 )}

 {!loading && !error && (
 <div className="bg-white border border-black/8 overflow-hidden">
 <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-black/8">
 {['Benutzer', 'Rolle', 'Status', 'Erstellt', 'Aktionen'].map(h => (
 <p key={h} className="text-xs font-medium text-black/35">{h}</p>
 ))}
 </div>

 <div className="divide-y divide-black/8">
 {users.map(u => (
 <div key={u.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-4 items-center hover:bg-black/5 transition-colors">
 {/* User info */}
 <div className="min-w-0">
 <div className="flex items-center gap-2">
 <div className="w-7 h-7 bg-black/10 flex items-center justify-center flex-shrink-0">
 <span className="text-[10px] font-bold text-black/65">{u.name[0].toUpperCase()}</span>
 </div>
 <div className="min-w-0">
 <p className="text-sm font-medium text-black/90 truncate">
 {u.name}
 {u.id === me.id && <span className="ml-1.5 text-[8px] text-black/45">(du)</span>}
 </p>
 <p className="text-[10px] text-black/45 truncate">{u.email}</p>
 </div>
 </div>
 </div>

 {/* Role selector */}
 <div className="relative">
 {u.id === me.id ? (
 <span className={`text-[10px] font-medium px-2 py-0.5 border ${roleBadge[u.role]}`}>
 {u.role}
 </span>
 ) : (
 <div className="relative">
 <select
 value={u.role}
 onChange={(e) => changeRole(u.id, e.target.value)}
 className={`appearance-none text-[10px] font-medium px-2 py-0.5 pr-5 border cursor-pointer bg-transparent focus:outline-none ${roleBadge[u.role]}`}
 >
 {ROLES.map(r => <option key={r} value={r} className="bg-white text-black/90 normal-case text-sm">{r}</option>)}
 </select>
 <ChevronDown size={9} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-current" />
 </div>
 )}
 </div>

 {/* Status badge */}
 <div>
 <span className={`text-[10px] font-medium px-2 py-0.5 border ${
 u.is_active ? 'bg-emerald-100 text-emerald-600 border-emerald-200' : 'bg-black/10 text-black/45 border-black/15'
 }`}>
 {u.is_active ? 'Aktiv' : 'Inaktiv'}
 </span>
 </div>

 {/* Created at */}
 <p className="text-[10px] text-black/35 whitespace-nowrap">
 {new Date(u.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
 </p>

 {/* Actions */}
 <div className="flex gap-1.5">
 {u.id !== me.id && (
 <>
 <button
 onClick={() => toggleStatus(u.id, u.is_active)}
 title={u.is_active ? 'Deaktivieren' : 'Aktivieren'}
 className={`w-7 h-7 flex items-center justify-center border-0 transition-colors ${
 u.is_active
 ? 'bg-orange-500/10 hover:bg-orange-500/20'
 : 'bg-emerald-500/10 hover:bg-emerald-500/20'
 }`}
 >
 {u.is_active
 ? <UserX size={12} className="text-orange-400" />
 : <UserCheck size={12} className="text-emerald-400" />
 }
 </button>
 <button
 onClick={() => deleteUser(u.id, u.name)}
 title="Löschen"
 className="w-7 h-7 bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center border-0 transition-colors"
 >
 <Trash2 size={12} className="text-red-400" />
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
