import { useState, useEffect } from 'react'
import { Eye, EyeOff, Send, CheckCircle2, XCircle, ChevronDown } from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'
import MFAModal from '../../components/MFAModal'

export default function EmailSettings() {
 const [form, setForm] = useState({
 smtp_host: '', smtp_port: '587', smtp_user: '',
 smtp_pass: '', smtp_manufacturer_email: '', business_inquiry_email: '', app_url: '',
 mail_weg: 'smtp', mail_anbieter: 'brevo', mail_api_key: '',
 mail_absender: '', mail_domain: '', mail_region: 'eu',
 })
 const [passSet, setPassSet] = useState(false)
 const [showPass, setShowPass] = useState(false)
 const [keySet, setKeySet] = useState(false)
 const [showKey, setShowKey] = useState(false)
 const [anbieter, setAnbieter] = useState([])
 const [anleitungOffen, setAnleitungOffen] = useState(false)
 const [loading, setLoading] = useState(true)
 const [saving, setSaving] = useState(false)
 const [msg, setMsg] = useState(null)
 const [mfaOpen, setMfaOpen] = useState(false)
 const [mfaErr, setMfaErr] = useState(null)
 const [check, setCheck] = useState(null)      // Ergebnis der Verbindungsprüfung
 const [testTo, setTestTo] = useState('')
 const [testing, setTesting] = useState(false)
 const [testResult, setTestResult] = useState(null)
 const [diag, setDiag] = useState(null)        // Ergebnis der Leitungsprüfung
 const [diagLaeuft, setDiagLaeuft] = useState(false)

 // Die Leitungsprüfung geht bewusst nicht automatisch los: Sie baut bis zu
 // sechs Verbindungen auf und dauert einige Sekunden. Gebraucht wird sie erst,
 // wenn etwas nicht geht.
 const runDiag = async () => {
   setDiagLaeuft(true); setDiag(null)
   try { setDiag(await apiFetch('/api/settings/email/diagnose')) }
   catch (e) { setDiag({ ok: false, reason: e?.error || 'Prüfung fehlgeschlagen' }) }
   finally { setDiagLaeuft(false) }
 }

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
 setKeySet(!!data.mail_api_key_set)
 setAnbieter(Array.isArray(data.anbieter) ? data.anbieter : [])
 setForm({
 smtp_host: data.smtp_host || '',
 smtp_port: data.smtp_port || '587',
 smtp_user: data.smtp_user || '',
 smtp_pass: '',
 smtp_manufacturer_email: data.smtp_manufacturer_email || '',
 business_inquiry_email: data.business_inquiry_email || '',
 app_url: data.app_url || '',
 mail_weg: data.mail_weg || 'smtp',
 mail_anbieter: data.mail_anbieter || 'brevo',
 mail_api_key: '',
 mail_absender: data.mail_absender || '',
 mail_domain: data.mail_domain || '',
 mail_region: data.mail_region || 'eu',
 })
 } catch { /* keep defaults */ }
 finally { setLoading(false) }
 }

 const f = (field, val) => setForm(prev => ({ ...prev, [field]: val }))

 const aktuellerAnbieter = anbieter.find(a => a.schluessel === form.mail_anbieter) || null

 // Der Weg ist gewählt, aber es fehlt noch etwas: Dann greift im Hintergrund
 // weiterhin SMTP, und dort scheitert der Versand. Das sagt sonst niemand —
 // die Felder sehen aus wie fertig, und der Fehler taucht erst bei der
 // nächsten Bestellung auf.
 const nochUnvollstaendig = form.mail_weg === 'http' && ([
   !keySet && !form.mail_api_key.trim() ? (aktuellerAnbieter?.schluesselFeld || 'Schlüssel') : null,
   !form.mail_absender.trim() && !form.smtp_user.trim() ? 'Absenderadresse' : null,
   aktuellerAnbieter?.brauchtDomain && !form.mail_domain.trim() ? 'Domain' : null,
 ].filter(Boolean))

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
 if (form.mail_api_key) setKeySet(true)
 setForm(f => ({ ...f, smtp_pass: '', mail_api_key: '' }))
 setMsg({ type: 'ok', text: 'E-Mail-Einstellungen gespeichert.' })
 // Der Zustand oben stammt noch vom alten Weg — nach dem Umstellen wäre er
 // schlicht falsch. Also gleich neu prüfen.
 apiFetch('/api/settings/email/check').then(setCheck).catch(() => setCheck(null))
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
 <h1 className="text-[28px] font-extralight text-black/85 tracking-tight">E-Mail-Versand</h1>
 <p className="text-[13px] text-black/30 mt-2 font-light">
 Auf welchem Weg die Nachrichten hinausgehen. Änderungen erfordern MFA-Bestätigung.
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

 {/* ── Der Weg hinaus ─────────────────────────────────────────────────
     Die wichtigste Entscheidung auf dieser Seite, deshalb steht sie oben
     und nicht zwischen den Feldern. SMTP scheitert auf diesem Server am
     gesperrten Port, nicht an den Zugangsdaten — der Weg über HTTPS
     umgeht das, weil Port 443 offen sein muss, sonst gäbe es die Website
     nicht. */}
 <div className="bg-white p-7 mb-6">
 <p className="text-[10px] text-black/30 uppercase tracking-[0.2em] mb-4 font-light">Versandweg</p>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 {[
 { wert: 'smtp', titel: 'Mailserver (SMTP)', text: 'Der klassische Weg über Port 465 oder 587. Braucht einen freigeschalteten Mail-Port.' },
 { wert: 'http', titel: 'Maildienst (HTTPS)', text: 'Über Port 443 wie die Website selbst. Funktioniert auch dann, wenn die Mail-Ports gesperrt sind.' },
 ].map(o => (
 <button
 key={o.wert} type="button" onClick={() => f('mail_weg', o.wert)}
 className={`text-left px-4 py-3.5 border bg-transparent transition-colors ${
 form.mail_weg === o.wert ? 'border-black/60' : 'border-black/[0.10] hover:border-black/25'
 }`}
 >
 <p className={`text-[13px] font-light ${form.mail_weg === o.wert ? 'text-black' : 'text-black/50'}`}>{o.titel}</p>
 <p className="text-[11px] text-black/30 font-light mt-1 leading-relaxed">{o.text}</p>
 </button>
 ))}
 </div>
 {/* Was noch fehlt, steht hier oben und nicht unten bei den Feldern:
     Solange etwas davon fehlt, greift im Hintergrund weiter SMTP, und
     dort scheitert der Versand. Die Felder sähen sonst fertig aus, und
     der Fehler fiele erst bei der nächsten Bestellung auf. */}
 {nochUnvollstaendig && nochUnvollstaendig.length > 0 && (
 <p className="text-[12px] text-amber-900 font-light leading-relaxed border border-amber-300 bg-amber-50 px-4 py-3 mt-5">
 Es fehlt noch: <strong className="font-normal">{nochUnvollstaendig.join(', ')}</strong>.
 Bis dahin geht der Versand weiter über den Mailserver — und scheitert dort am gesperrten Port.
 </p>
 )}
 </div>

 {/* ── Maildienst über HTTPS ─────────────────────────────────────── */}
 {form.mail_weg === 'http' && (
 <>
 {/* Die Einrichtung passiert beim Dienst, nicht hier — und wer das zum
     ersten Mal macht, sucht sonst in einem fremden Menü nach dem
     richtigen Reiter. Deshalb stehen die Schritte an der Stelle, an der
     man sie braucht, und nicht in einer Datei, die niemand aufmacht. */}
 <div className="bg-white border border-black/[0.08] mb-6">
 <button
 onClick={() => setAnleitungOffen(v => !v)}
 className="w-full flex items-center justify-between px-7 py-4 bg-transparent border-0 text-left"
 >
 <span className="text-[10px] text-black/30 uppercase tracking-[0.2em] font-light">
 So richten Sie {aktuellerAnbieter?.name || 'den Dienst'} ein
 </span>
 <ChevronDown size={14} strokeWidth={1.4} className={`text-black/25 transition-transform ${anleitungOffen ? 'rotate-180' : ''}`} />
 </button>
 {anleitungOffen && (
 <div className="px-7 pb-7 -mt-1">
 <ol className="space-y-3.5 list-none p-0 m-0">
 {(aktuellerAnbieter?.einrichtung || []).map((schritt, i) => (
 <li key={i} className="flex gap-3.5">
 <span className="flex-shrink-0 w-5 h-5 border border-black/15 flex items-center justify-center text-[10px] text-black/40 tabular-nums">
 {i + 1}
 </span>
 <span className="text-[12px] text-black/55 font-light leading-relaxed">{schritt}</span>
 </li>
 ))}
 </ol>
 <p className="text-[11px] text-black/30 font-light leading-relaxed mt-5 pt-4 border-t border-black/[0.06]">
 Die DNS-Einträge liegen dort, wo die Domain verwaltet wird. Ihre Werte erzeugt der Dienst
 selbst und zeigt sie an — sie lassen sich nicht vorwegnehmen, weil jeder Schlüssel anders
 ist. Ein DMARC-Eintrag ist zusätzlich empfehlenswert, aber keine Voraussetzung dafür,
 dass Nachrichten hinausgehen.
 </p>
 </div>
 )}
 </div>

 <div className="bg-white p-7 mb-6">
 <div className="space-y-5">

 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Dienst</label>
 <select
 className="w-full h-10 px-1 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70"
 value={form.mail_anbieter}
 onChange={e => f('mail_anbieter', e.target.value)}
 >
 {anbieter.map(a => <option key={a.schluessel} value={a.schluessel}>{a.name}</option>)}
 </select>
 <p className="text-[10px] text-black/25 font-light mt-1.5 leading-relaxed">
 {anbieter.find(a => a.schluessel === form.mail_anbieter)?.hinweis
 || 'Bei allen: dort ein Konto anlegen, Absenderadresse oder Domain bestätigen, Schlüssel erzeugen.'}
 </p>
 </div>

 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">
 {anbieter.find(a => a.schluessel === form.mail_anbieter)?.schluesselFeld || 'API-Schlüssel'}
 {keySet && <span className="ml-2 text-black/25 normal-case tracking-normal font-light">gesetzt</span>}
 </label>
 <div className="relative">
 <input
 className="w-full h-10 px-4 pr-10 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15"
 type={showKey ? 'text' : 'password'}
 placeholder={keySet ? 'Leer lassen = Schlüssel behalten' : 'Schlüssel einfügen'}
 value={form.mail_api_key}
 onChange={e => f('mail_api_key', e.target.value)}
 />
 <button
 type="button"
 onClick={() => setShowKey(v => !v)}
 className="absolute right-3 top-1/2 -translate-y-1/2 text-black/25 hover:text-black/50 bg-transparent border-0 p-0 transition-colors"
 >
 {showKey ? <EyeOff size={14} strokeWidth={1.25} /> : <Eye size={14} strokeWidth={1.25} />}
 </button>
 </div>
 <p className="text-[10px] text-black/25 font-light mt-1.5">
 Wird wie das SMTP-Passwort nie zurückgegeben. Leer lassen = bisheriger Schlüssel bleibt.
 </p>
 </div>

 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Absenderadresse</label>
 <input
 className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15"
 type="email"
 placeholder="kontakt@artisansole.com"
 value={form.mail_absender}
 onChange={e => f('mail_absender', e.target.value)}
 />
 <p className="text-[10px] text-black/25 font-light mt-1 leading-relaxed">
 Diese Adresse muss beim Dienst bestätigt sein — entweder einzeln oder über die
 DNS-Einträge der ganzen Domain. Ohne Bestätigung nimmt keiner der Dienste die
 Nachricht an. Leer = die SMTP-Absenderadresse.
 </p>
 </div>

 {anbieter.find(a => a.schluessel === form.mail_anbieter)?.brauchtDomain && (
 <div className="grid grid-cols-3 gap-5">
 <div className="col-span-2">
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Domain beim Dienst</label>
 <input
 className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15"
 placeholder="mg.artisansole.com"
 value={form.mail_domain}
 onChange={e => f('mail_domain', e.target.value)}
 />
 </div>
 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Region</label>
 <select
 className="w-full h-10 px-1 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70"
 value={form.mail_region}
 onChange={e => f('mail_region', e.target.value)}
 >
 <option value="eu">EU</option>
 <option value="us">US</option>
 </select>
 </div>
 <p className="col-span-3 text-[10px] text-black/25 font-light -mt-3 leading-relaxed">
 Ein EU-Konto ist über den US-Endpunkt nicht erreichbar und umgekehrt — die Region
 muss zu der passen, in der das Konto angelegt wurde.
 </p>
 </div>
 )}
 </div>
 </div>
 </>
 )}

 <div className="bg-white p-7 mb-6">
 {form.mail_weg === 'http' && (
 <p className="text-[11px] text-black/30 font-light mb-5 leading-relaxed">
 Der Mailserver bleibt hinterlegt, wird aber nicht benutzt, solange oben der
 Maildienst gewählt ist. Zurückstellen genügt, falls der Port doch freigegeben wird.
 </p>
 )}
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
 <p className="text-[12px] font-light text-black/70 leading-relaxed">
 {check.ok
 ? (check.weg === 'http'
 ? `${check.anbieter} antwortet — Schlüssel und Verbindung stimmen.`
 : `Verbindung zu ${check.host}:${check.port} steht.`)
 : `Kein Versand möglich: ${check.reason}`}
 </p>
 {/* Beim Weg über HTTPS sagt die Prüfung noch nichts über die
     Absenderadresse: Ob der Dienst sie annimmt, zeigt erst eine
     Nachricht, die tatsächlich hinausgeht. */}
 {check.ok && check.weg === 'http' && check.hinweis && (
 <p className="text-[11px] text-black/40 font-light mt-1.5 leading-relaxed">
 {check.hinweis} Absender: <strong className="font-normal">{check.absender || '—'}</strong>
 </p>
 )}
 {/* Wohin überhaupt verbunden wurde. Bei einer Zeitüberschreitung ist der
     häufigste Fall, dass dort noch ein Vorgabewert steht — was niemand
     bemerkt, solange die Meldung ihn nicht nennt. */}
 {!check.ok && check.weg !== 'http' && check.host && (
 <p className="text-[11px] text-amber-800/80 font-light mt-1.5 leading-relaxed">
 Versucht wurde <strong className="font-normal">{check.host}:{check.port}</strong>
 {check.user ? <> als <strong className="font-normal">{check.user}</strong></> : null}
 {check.code ? <> · Fehlercode {check.code}</> : null}
 </p>
 )}
 {check.ok && !check.appUrlUsable && (
 <p className="text-[11px] text-amber-800 font-light mt-1.5 leading-relaxed">
 Die Adresse der Anwendung steht auf <strong className="font-normal">{check.appUrl}</strong>.
 Mails gehen zwar hinaus, aber Einladungs- und Bestätigungslinks darin führen beim
 Empfänger ins Leere. Bitte unten auf die öffentliche Adresse setzen.
 </p>
 )}

 {/* Leitungsprüfung. Sie beantwortet die Frage, die die Fehlermeldung
     offenlässt: gesperrter Port oder IPv6-Sackgasse? Beide sehen von
     außen gleich aus, brauchen aber gegensätzliche Abhilfen. */}
 {!check.ok && check.weg !== 'http' && (
 <div className="mt-3 pt-3 border-t border-amber-200">
 <p className="text-[11px] text-amber-900 font-light mb-2.5 leading-relaxed">
 Findet die Prüfung eine Sperre beim Rechenzentrum, hilft kein Feld auf dieser
 Seite: Dann bitte oben auf <strong className="font-normal">Maildienst (HTTPS)</strong>
 {' '}umstellen — dieser Weg braucht keinen Mail-Port.
 </p>
 <button
 type="button" onClick={runDiag} disabled={diagLaeuft}
 className="h-8 px-3 border border-amber-700/40 text-[11px] tracking-[0.1em] uppercase text-amber-900 bg-transparent hover:bg-amber-100 disabled:opacity-40"
 >
 {diagLaeuft ? 'Leitung wird geprüft …' : 'Leitung prüfen'}
 </button>
 <span className="text-[10px] text-amber-800/70 font-light ml-2.5">
 Baut Testverbindungen zu {check.host} auf — dauert einige Sekunden.
 </span>

 {diag && (
 <div className="mt-3">
 <p className="text-[12px] text-amber-900 font-light leading-relaxed">
 {diag.befund || diag.reason}
 </p>
 {Array.isArray(diag.ports) && (
 <table className="mt-2.5 text-[11px]">
 <tbody>
 {diag.ports.map(p => (
 <tr key={p.port}>
 <td className="pr-4 py-0.5 text-amber-900/70 tabular-nums whitespace-nowrap">
 Port {p.port}{p.konfiguriert ? ' · eingestellt' : ''}
 </td>
 <td className="pr-4 py-0.5 text-amber-900/70 whitespace-nowrap">
 IPv4: {p.ipv4 ? (p.ipv4.ok ? 'offen' : p.ipv4.grund) : '—'}
 </td>
 <td className="py-0.5 text-amber-900/70 whitespace-nowrap">
 IPv6: {p.ipv6 ? (p.ipv6.ok ? 'offen' : p.ipv6.grund) : '—'}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 )}
 {(diag.ipv4 || diag.ipv6) && (
 <p className="text-[10px] text-amber-800/60 font-light mt-1.5">
 {diag.host} löst auf zu {[diag.ipv4, diag.ipv6].filter(Boolean).join(' und ')}
 </p>
 )}
 </div>
 )}
 </div>
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
