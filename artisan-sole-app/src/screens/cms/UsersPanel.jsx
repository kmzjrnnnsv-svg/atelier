import { useState, useEffect } from 'react'
import { Shield, UserX, UserCheck, Trash2, ChevronDown, Plus, Send, ScanLine, Sparkles, KeyRound, Copy, Check, Undo2, AlertTriangle } from 'lucide-react'
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
 // Notausgang: { userId, userName, note } beim Erfassen, danach zusätzlich
 // { link, qr }. Der letzte Weg zurück, wenn ein Kunde alle Geräte verloren
 // hat und auch über die Bestelldaten nicht weiterkommt.
 const [wiederherstellung, setWiederherstellung] = useState(null)
 const [wBusy, setWBusy] = useState(false)
 const [wKopiert, setWKopiert] = useState(false)

 // ── Konto löschen: beantragen, bestätigen, Frist ──────────────────────
 const [loeschen, setLoeschen] = useState(null)   // { userId, userName, reason }
 const [lBusy, setLBusy] = useState(false)
 const [geloescht, setGeloescht] = useState(null) // { konten, frist_tage }
 const [zeigeGeloescht, setZeigeGeloescht] = useState(false)

 const geloeschteLaden = async () => {
   try { setGeloescht(await apiFetch('/api/users/geloescht')) }
   catch (e) { alert(e?.error || 'Liste konnte nicht geladen werden') }
 }
 useEffect(() => { geloeschteLaden() }, [])

 const loeschAktion = async (pfad, koerper, erfolg) => {
   setLBusy(true)
   try {
     await apiFetch(pfad, { method: 'POST', body: JSON.stringify(koerper || {}) })
     await Promise.all([load(), geloeschteLaden()])
     setLoeschen(null)
     if (erfolg) alert(erfolg)
   } catch (e) {
     alert(e?.error || 'Vorgang fehlgeschlagen')
   } finally { setLBusy(false) }
 }

 const zugangFreigeben = async () => {
   if (!wiederherstellung || wBusy) return
   setWBusy(true)
   try {
     const d = await apiFetch(`/api/users/${wiederherstellung.userId}/wiederherstellung`, {
       method: 'POST',
       body: JSON.stringify({ note: wiederherstellung.note }),
     })
     setWiederherstellung(w => ({ ...w, ...d }))
   } catch (e) {
     alert(e?.error || 'Freigabe fehlgeschlagen')
   } finally { setWBusy(false) }
 }
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

 /**
  * Der letzte Schritt: endgültig entfernen, bevor die Frist abgelaufen ist.
  *
  * Der Server nimmt das nur für Konten an, die bereits gesperrt sind, und
  * nur von einer anderen Person als der, die den Antrag gestellt hat.
  * Vorher hing an dieser Stelle ein Knopf, der ohne Umweg gelöscht hat.
  */
 const endgueltigLoeschen = async (id, name) => {
 if (!confirm(`„${name}" endgültig entfernen? Das lässt sich nicht zurücknehmen.`)) return
 try {
 await apiFetch(`/api/users/${id}`, { method: 'DELETE' })
 setUsers(u => u.filter(usr => usr.id !== id))
 await geloeschteLaden()
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
 const newUser = await apiFetch('/api/users/promotion', {
 method: 'POST',
 body: JSON.stringify({
 email: promoForm.email,
 name: promoForm.name,
 discount_pct: parseFloat(promoForm.discount_pct) || 20,
 max_orders: promoForm.max_orders ? parseInt(promoForm.max_orders) : null,
 }),
 })
 // Backend liefert das User-Objekt direkt zurück, nicht { user }.
 if (newUser && typeof newUser === 'object' && newUser.id) {
   setUsers(prev => [...prev, newUser])
 } else {
   await load() // Fallback: Liste neu laden
 }
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

 const safeUsers = users.filter(u => u && typeof u === 'object' && u.id != null)
 const filtered = tab === 'promo' ? safeUsers.filter(u => u.is_promotion) : safeUsers

 return (
 <div className="">
 <div className="mb-8">
 <p className="text-[9px] text-black/20 uppercase tracking-[0.3em] mb-3 font-light">Administration</p>
 <h1 className="text-[28px] font-extralight text-black/85 tracking-tight">Benutzerverwaltung</h1>
 <p className="text-[13px] text-black/30 mt-2 font-light">Rollen, Status und Zugriff für alle Accounts verwalten</p>
 </div>

 {/* Tabs */}
 <div className="flex items-center gap-3 mb-6">
 <div className="flex gap-1.5">
 {[
 { key: 'all', label: `Alle (${safeUsers.length})` },
 { key: 'promo', label: `Promotion (${safeUsers.filter(u => u.is_promotion).length})` },
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

 {/* Notausgang. Der Weg, an dem Unternehmen fallen — nicht an der
     Verschlüsselung, sondern daran, dass jemand anruft, überzeugend klingt
     und einen Link bekommt. Deshalb ist die Notiz Pflicht: Sie stellt die
     Frage, wie die Identität geprüft wurde, bevor der Link entsteht. */}
 {wiederherstellung && (
 <div className="bg-white p-6 mb-6 space-y-4 border border-black/10">
 <h3 className="text-[9px] text-black/20 uppercase tracking-[0.3em] font-light">
 Zugang wiederherstellen für {wiederherstellung.userName}
 </h3>

 {!wiederherstellung.link ? (
 <>
 <p className="text-[12px] text-black/50 font-light leading-relaxed max-w-2xl">
 Erzeugt einen Link, mit dem dieses Konto ein neues Gerät hinterlegen kann —
 eine Stunde gültig, einmal benutzbar. Bestehende Geräte bleiben gültig, alle
 offenen Sitzungen werden beendet, und im Nachrichtenverlauf des Kunden
 erscheint ein Hinweis.
 </p>
 <p className="text-[12px] text-black/50 font-light leading-relaxed max-w-2xl">
 Bitte vorher die Identität prüfen: Bestellnummer <em>und</em> Lieferadresse
 abfragen, nicht nur die E-Mail. Geben Sie den Link niemals an eine Adresse,
 die Ihnen gerade erst genannt wurde.
 </p>
 <input
 value={wiederherstellung.note}
 onChange={e => setWiederherstellung(w => ({ ...w, note: e.target.value }))}
 placeholder="Wie haben Sie die Identität geprüft?"
 className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 font-light text-black/70 placeholder-black/15"
 />
 <div className="flex gap-3">
 <button
 onClick={zugangFreigeben}
 disabled={wBusy || (wiederherstellung.note || '').trim().length < 4}
 className="flex items-center gap-2 px-6 h-10 border border-black text-black text-[11px] bg-transparent hover:bg-black hover:text-white transition-all uppercase tracking-[0.2em] font-light disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-black"
 >
 <KeyRound size={11} strokeWidth={1.25} /> {wBusy ? 'Wird erzeugt …' : 'Link erzeugen'}
 </button>
 <button onClick={() => setWiederherstellung(null)} className="px-3.5 py-1.5 text-[10px] text-black/25 hover:text-black/50 bg-transparent border-0 tracking-wider font-light uppercase">Abbrechen</button>
 </div>
 </>
 ) : (
 <div className="flex flex-col sm:flex-row gap-5">
 {wiederherstellung.qr && (
 <img src={wiederherstellung.qr} alt="QR-Code zur Wiederherstellung" className="w-[150px] h-[150px] border border-black/[0.07] flex-shrink-0" />
 )}
 <div className="flex-1 min-w-0">
 <p className="text-[11px] text-black/45 font-light leading-relaxed mb-2">
 Eine Stunde gültig, einmal benutzbar. Geben Sie ihn dem Kunden direkt —
 am Telefon vorlesen, im Laden abscannen lassen.
 </p>
 <p className="text-[11px] text-black/70 break-all bg-black/[0.02] border border-black/[0.06] p-2.5">
 {wiederherstellung.link}
 </p>
 <div className="flex gap-3 mt-2.5">
 <button
 onClick={async () => {
 try { await navigator.clipboard.writeText(wiederherstellung.link); setWKopiert(true); setTimeout(() => setWKopiert(false), 1600) } catch { /* ohne Zwischenablage bleibt das Ablesen */ }
 }}
 className="flex items-center gap-1.5 h-8 px-3 border border-black/15 text-[11px] tracking-[0.1em] uppercase text-black/60 hover:border-black hover:text-black bg-transparent"
 >
 {wKopiert ? <Check size={12} /> : <Copy size={12} />} {wKopiert ? 'Kopiert' : 'Link kopieren'}
 </button>
 <button onClick={() => setWiederherstellung(null)} className="text-[10px] text-black/25 hover:text-black/50 bg-transparent border-0 tracking-wider font-light uppercase">Schließen</button>
 </div>
 </div>
 </div>
 )}
 </div>
 )}


 {/* Löschantrag. Der Grund ist Pflicht: Er zwingt dazu, kurz innezuhalten,
     und beantwortet später die Frage, warum ein Konto weg ist. */}
 {loeschen && (
 <div className="bg-white p-6 mb-6 space-y-4 border border-black/15">
 <div className="flex items-start gap-2">
 <AlertTriangle size={14} className="text-black/40 mt-0.5 shrink-0" />
 <div>
 <h3 className="text-[9px] text-black/20 uppercase tracking-[0.3em] font-light">
 Konto löschen — {loeschen.userName}
 </h3>
 <p className="text-[12px] text-black/50 font-light leading-relaxed mt-2 max-w-2xl">
 Zwei Schritte: Sie beantragen, eine zweite Person aus der Verwaltung bestätigt.
 Danach ist das Konto gesperrt und {geloescht?.frist_tage || 30} Tage lang
 wiederherstellbar; erst dann wird es endgültig entfernt. Bestellungen bleiben
 als Geschäftsunterlagen bestehen, verlieren aber die Verbindung zur Person.
 </p>
 </div>
 </div>
 <input
 value={loeschen.reason}
 onChange={e => setLoeschen(l => ({ ...l, reason: e.target.value }))}
 placeholder="Grund — etwa „Löschwunsch des Kunden vom 13.08.“"
 className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 font-light text-black/70 placeholder-black/15"
 />
 <div className="flex gap-3">
 <button
 onClick={() => loeschAktion(`/api/users/${loeschen.userId}/loeschung`, { reason: loeschen.reason },
   'Antrag gestellt. Eine zweite Person muss ihn jetzt bestätigen.')}
 disabled={lBusy || (loeschen.reason || '').trim().length < 4}
 className="flex items-center gap-2 px-6 h-10 border border-black text-black text-[11px] bg-transparent hover:bg-black hover:text-white transition-all uppercase tracking-[0.2em] font-light disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-black"
 >
 <Trash2 size={11} strokeWidth={1.25} /> {lBusy ? 'Läuft …' : 'Löschung beantragen'}
 </button>
 <button onClick={() => setLoeschen(null)} className="px-3.5 py-1.5 text-[10px] text-black/25 hover:text-black/50 bg-transparent border-0 tracking-wider font-light uppercase">Abbrechen</button>
 </div>
 </div>
 )}

 {/* Gelöschte Konten — die Frist sichtbar machen. Ein Konto, das still im
     Hintergrund abläuft, ist genau das, was niemand rechtzeitig bemerkt. */}
 {!!geloescht?.konten?.length && (
 <div className="bg-white border border-black/[0.08] mb-6">
 <button
 onClick={() => setZeigeGeloescht(v => !v)}
 className="w-full flex items-center justify-between px-5 py-3.5 bg-transparent border-0 text-left"
 >
 <span className="text-[9px] text-black/30 uppercase tracking-[0.25em] font-light">
 Gelöschte Konten · {geloescht.konten.length}
 </span>
 <ChevronDown size={13} className={`text-black/25 transition-transform ${zeigeGeloescht ? 'rotate-180' : ''}`} />
 </button>

 {zeigeGeloescht && (
 <div className="px-5 pb-5">
 <p className="text-[11px] text-black/40 font-light leading-relaxed mb-4 max-w-2xl">
 Gesperrt und wiederherstellbar. Nach {geloescht.frist_tage} Tagen werden sie
 automatisch endgültig entfernt — beim nächsten Öffnen dieser Liste.
 </p>
 {geloescht.konten.map(k => (
 <div key={k.id} className="flex items-start justify-between gap-4 py-3 border-t border-black/[0.05]">
 <div className="min-w-0">
 <p className="text-[13px] text-black/75 font-light">{k.name}</p>
 <p className="text-[10px] text-black/35 font-light">{k.email}</p>
 {k.deletion_reason && (
 <p className="text-[10px] text-black/45 font-light mt-1 leading-relaxed">{k.deletion_reason}</p>
 )}
 <p className="text-[10px] text-black/30 font-light mt-1">
 {k.deleted_at
 ? `Gesperrt · noch ${Math.max(0, k.tage_uebrig)} Tage · beantragt von ${k.beantragt_von || '—'}, bestätigt von ${k.bestaetigt_von || '—'}`
 : `Antrag von ${k.beantragt_von || '—'} — wartet auf Bestätigung durch eine zweite Person`}
 </p>
 </div>
 <div className="flex items-center gap-2 shrink-0">
 {!k.deleted_at && k.beantragt_von && (
 <button
 onClick={() => loeschAktion(`/api/users/${k.id}/loeschung/bestaetigen`, {},
   'Bestätigt. Das Konto ist gesperrt und läuft in der Frist.')}
 disabled={lBusy}
 className="h-8 px-3 border border-black/15 text-[10px] tracking-[0.1em] uppercase text-black/60 hover:border-black hover:text-black bg-transparent disabled:opacity-30"
 >
 Bestätigen
 </button>
 )}
 {k.deleted_at && (
 <button
 onClick={() => endgueltigLoeschen(k.id, k.name)}
 title="Frist abkürzen und endgültig entfernen"
 className="h-8 px-3 border border-black/15 text-[10px] tracking-[0.1em] uppercase text-black/40 hover:border-red-400 hover:text-red-600 bg-transparent"
 >
 Jetzt endgültig
 </button>
 )}
 <button
 onClick={() => loeschAktion(`/api/users/${k.id}/loeschung/zuruecknehmen`, {}, 'Konto wiederhergestellt.')}
 disabled={lBusy}
 title="Wiederherstellen"
 className="flex items-center gap-1.5 h-8 px-3 border border-black/15 text-[10px] tracking-[0.1em] uppercase text-black/60 hover:border-black hover:text-black bg-transparent disabled:opacity-30"
 >
 <Undo2 size={11} strokeWidth={1.4} /> Zurückholen
 </button>
 </div>
 </div>
 ))}
 </div>
 )}
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
 onClick={() => setWiederherstellung({ userId: u.id, userName: u.name, note: '' })}
 title="Zugang wiederherstellen"
 className="w-7 h-7 flex items-center justify-center hover:bg-black/[0.04] transition-colors border-0 bg-transparent"
 >
 <KeyRound size={12} strokeWidth={1.25} className="text-black/25" />
 </button>
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
 onClick={() => setLoeschen({ userId: u.id, userName: u.name, reason: '' })}
 title="Konto löschen (Antrag, zweite Person bestätigt)"
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
