import { useState, useEffect } from 'react'
import { Building2, Mail, Phone, Plus, Copy, Check, UserPlus, Clock, X, Ticket, ChevronDown, Megaphone } from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'

const APP_ORIGIN = (import.meta.env.VITE_API_URL ?? '') || (typeof window !== 'undefined' ? window.location.origin : '')

// Firmenname aus den Notizen einer Anfrage ziehen ("Firma: …").
const companyFromNotes = (notes) => {
  if (!notes) return ''
  const m = notes.match(/Firma:\s*(.+)/i)
  return m ? m[1].trim() : ''
}

const emptyForm = { company: '', contact_name: '', email: '', contact_phone: '', source_request_id: null }

export default function BusinessPanel() {
  const [accounts, setAccounts] = useState([])
  const [inquiries, setInquiries] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)   // null = closed
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(null)
  const [expanded, setExpanded] = useState(null)   // account id whose codes are shown
  const [codesById, setCodesById] = useState({})   // { [id]: codes[] }

  const toggleCodes = async (id) => {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    if (!codesById[id]) {
      try {
        const codes = await apiFetch(`/api/business/${id}/codes`)
        setCodesById(m => ({ ...m, [id]: Array.isArray(codes) ? codes : [] }))
      } catch { setCodesById(m => ({ ...m, [id]: [] })) }
    }
  }

  const codeSummary = (codes) => {
    const by = { issued: 0, redeemed: 0, revoked: 0, expired: 0 }
    for (const c of codes) by[c.status] = (by[c.status] || 0) + 1
    return by
  }

  const [campExpanded, setCampExpanded] = useState(null)
  const [campsById, setCampsById] = useState({})
  const toggleCamps = async (id) => {
    if (campExpanded === id) { setCampExpanded(null); return }
    setCampExpanded(id)
    if (!campsById[id]) {
      try {
        const camps = await apiFetch(`/api/business/${id}/campaigns`)
        setCampsById(m => ({ ...m, [id]: Array.isArray(camps) ? camps : [] }))
      } catch { setCampsById(m => ({ ...m, [id]: [] })) }
    }
  }

  const load = async () => {
    try {
      const [accts, reqs] = await Promise.all([
        apiFetch('/api/business'),
        apiFetch('/api/custom-requests').catch(() => []),
      ])
      setAccounts(Array.isArray(accts) ? accts : [])
      // Nur Corporate-Gifting-Anfragen, die noch nicht in ein Konto überführt wurden.
      const linkedReqIds = new Set((accts || []).map(a => a.source_request_id).filter(Boolean))
      setInquiries((Array.isArray(reqs) ? reqs : []).filter(r =>
        r.shoe_name === 'Corporate Gifting' && !linkedReqIds.has(r.id)
      ))
    } catch (e) {
      setError(e?.error || 'Laden fehlgeschlagen')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openFromInquiry = (r) => {
    setError(null)
    setForm({
      company: companyFromNotes(r.notes) || r.customer_name || '',
      contact_name: r.customer_name || '',
      email: r.customer_email || '',
      contact_phone: r.customer_phone || '',
      source_request_id: r.id,
    })
  }

  const save = async () => {
    if (busy || !form) return
    setBusy(true); setError(null)
    try {
      await apiFetch('/api/business', {
        method: 'POST',
        body: JSON.stringify({
          company: form.company.trim(),
          contact_name: form.contact_name.trim(),
          email: form.email.trim(),
          contact_phone: form.contact_phone.trim() || null,
          source_request_id: form.source_request_id,
        }),
      })
      setForm(null)
      load()
    } catch (e) {
      setError(e?.error || e?.errors?.[0]?.msg || 'Anlegen fehlgeschlagen')
    } finally { setBusy(false) }
  }

  const copyInvite = (token, id) => {
    const link = `${APP_ORIGIN}/register-business?token=${token}`
    navigator.clipboard?.writeText(link)
    setCopied(id)
    setTimeout(() => setCopied(null), 1800)
  }

  const inp = 'w-full h-10 border border-black/15 px-3 text-[13px] bg-white outline-none focus:border-black/40 font-light'
  const lbl = 'block text-[10px] text-black/40 uppercase tracking-[0.12em] mb-1 font-light'
  const statusBadge = (s) => ({
    active: 'bg-green-50 text-green-700 border-green-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    suspended: 'bg-red-50 text-red-700 border-red-200',
  }[s] || 'bg-black/[0.04] text-black/50 border-black/10')

  if (loading) {
    return <div className="p-8"><div className="w-7 h-7 border-2 border-black/15 border-t-black/60 rounded-full animate-spin-custom" /></div>
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-extralight text-black tracking-tight flex items-center gap-2">
            <Building2 size={20} strokeWidth={1.3} /> Firmenkonten
          </h1>
          <p className="text-[12px] text-black/45 font-light mt-1">B2B-Konten für business.artisansole.com, anlegen, einladen, verwalten.</p>
        </div>
        <button onClick={() => { setError(null); setForm({ ...emptyForm }) }} className="flex items-center gap-1.5 text-[11px] tracking-[0.12em] uppercase text-white bg-black px-4 py-2.5 border-0">
          <Plus size={14} strokeWidth={1.6} /> Konto anlegen
        </button>
      </div>

      {error && !form && <div className="bg-red-50 border border-red-200 px-4 py-3 mb-5"><p className="text-xs text-red-600">{error}</p></div>}

      {/* Offene Anfragen */}
      {inquiries.length > 0 && (
        <div className="mb-8">
          <p className="text-[10px] text-black/35 uppercase tracking-[0.2em] mb-3">Offene Unternehmens-Anfragen</p>
          <div className="space-y-2">
            {inquiries.map(r => (
              <div key={r.id} className="flex items-center justify-between gap-4 border border-black/10 bg-white px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[13px] text-black truncate">{companyFromNotes(r.notes) || r.customer_name}</p>
                  <p className="text-[11px] text-black/45 font-light truncate">{r.customer_name} · {r.customer_email} · {r.customer_phone}</p>
                </div>
                <button onClick={() => openFromInquiry(r)} className="flex items-center gap-1.5 text-[11px] tracking-[0.1em] uppercase text-black border border-black/20 px-3 py-2 bg-white hover:bg-black/[0.02] shrink-0">
                  <UserPlus size={14} strokeWidth={1.5} /> Konto anlegen
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Konten-Liste */}
      <p className="text-[10px] text-black/35 uppercase tracking-[0.2em] mb-3">Firmenkonten ({accounts.length})</p>
      {accounts.length === 0 ? (
        <p className="text-[13px] text-black/40 font-light py-6">Noch keine Firmenkonten.</p>
      ) : (
        <div className="space-y-2">
          {accounts.map(a => (
            <div key={a.id} className="border border-black/10 bg-white px-4 py-3.5">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] text-black truncate">{a.name}</p>
                    <span className={`text-[9px] uppercase tracking-[0.1em] border px-1.5 py-0.5 ${statusBadge(a.status)}`}>{a.status}</span>
                  </div>
                  <p className="text-[11px] text-black/45 font-light mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    <span className="inline-flex items-center gap-1"><Mail size={11} /> {a.owner_email}</span>
                    {a.contact_phone && <span className="inline-flex items-center gap-1"><Phone size={11} /> {a.contact_phone}</span>}
                    <span>{a.owner_name}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => toggleCamps(a.id)} className="flex items-center gap-1.5 text-[11px] tracking-[0.1em] uppercase text-black/60 hover:text-black border border-black/15 px-3 py-2 bg-white">
                    <Megaphone size={13} strokeWidth={1.6} /> Kampagnen <ChevronDown size={13} className={`transition-transform ${campExpanded === a.id ? 'rotate-180' : ''}`} />
                  </button>
                  <button onClick={() => toggleCodes(a.id)} className="flex items-center gap-1.5 text-[11px] tracking-[0.1em] uppercase text-black/60 hover:text-black border border-black/15 px-3 py-2 bg-white">
                    <Ticket size={13} strokeWidth={1.6} /> Codes <ChevronDown size={13} className={`transition-transform ${expanded === a.id ? 'rotate-180' : ''}`} />
                  </button>
                  {a.pending && a.invite_token && (
                    <button onClick={() => copyInvite(a.invite_token, a.id)} className="flex items-center gap-1.5 text-[11px] tracking-[0.1em] uppercase text-black/60 hover:text-black border border-black/15 px-3 py-2 bg-white">
                      {copied === a.id ? <><Check size={13} strokeWidth={2} /> Kopiert</> : <><Copy size={13} strokeWidth={1.6} /> Einladungslink</>}
                    </button>
                  )}
                </div>
              </div>
              {a.pending && (
                <p className="text-[10px] text-amber-700/80 font-light mt-2 flex items-center gap-1.5"><Clock size={11} /> Wartet auf Aktivierung durch das Unternehmen.</p>
              )}
              {campExpanded === a.id && (
                <div className="mt-3 border-t border-black/[0.06] pt-3">
                  {!campsById[a.id] ? (
                    <p className="text-[11px] text-black/40 font-light">Laden …</p>
                  ) : campsById[a.id].length === 0 ? (
                    <p className="text-[11px] text-black/40 font-light">Noch keine Kampagnen.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {campsById[a.id].map(c => (
                        <div key={c.id} className="flex items-center justify-between gap-3 text-[11px] bg-black/[0.03] border border-black/10 px-2.5 py-1.5">
                          <span className="text-black/80 truncate">{c.name} <span className="text-black/35">· {c.status}</span></span>
                          <span className="text-black/45 shrink-0">{c.payment_mode === 'company' ? 'Firma zahlt' : `${c.discount_pct}%`} · {c.units || 0} Best. · {c.participants || 0} TN</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {expanded === a.id && (
                <div className="mt-3 border-t border-black/[0.06] pt-3">
                  {!codesById[a.id] ? (
                    <p className="text-[11px] text-black/40 font-light">Laden …</p>
                  ) : codesById[a.id].length === 0 ? (
                    <p className="text-[11px] text-black/40 font-light">Noch keine Codes erstellt.</p>
                  ) : (
                    <>
                      {(() => { const s = codeSummary(codesById[a.id]); return (
                        <p className="text-[11px] text-black/55 font-light mb-2">
                          {codesById[a.id].length} Codes · {s.issued} offen · {s.redeemed} eingelöst · {s.revoked} gesperrt · {s.expired} abgelaufen
                        </p>
                      )})()}
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                        {codesById[a.id].map(c => (
                          <span key={c.id} className="font-mono text-[11px] text-black/70 bg-black/[0.04] border border-black/10 px-2 py-0.5">{c.code} · {c.status}</span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Anlege-Modal */}
      {form && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => !busy && setForm(null)}>
          <div className="bg-white w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[16px] font-light text-black">Firmenkonto anlegen</h2>
              <button onClick={() => setForm(null)} className="text-black/40 hover:text-black bg-transparent border-0 p-0"><X size={18} /></button>
            </div>
            {error && <div className="bg-red-50 border border-red-200 px-3 py-2 mb-4"><p className="text-xs text-red-600">{error}</p></div>}
            <div className="space-y-3.5">
              <div>
                <label className={lbl}>Firmenname *</label>
                <input className={inp} value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="ACME GmbH" />
              </div>
              <div>
                <label className={lbl}>Ansprechpartner *</label>
                <input className={inp} value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} placeholder="Vor- und Nachname" />
              </div>
              <div>
                <label className={lbl}>E-Mail (Login) *</label>
                <input type="email" className={inp} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="name@firma.com" />
              </div>
              <div>
                <label className={lbl}>Telefon</label>
                <input className={inp} value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} placeholder="+49 …" />
              </div>
            </div>
            <p className="text-[10px] text-black/40 font-light mt-3 leading-relaxed">Es wird eine Einladungs-E-Mail mit Aktivierungslink versandt. Den Link können Sie anschließend auch hier kopieren.</p>
            <button onClick={save} disabled={busy} className="w-full h-11 mt-5 bg-black text-white border-0 disabled:opacity-30" style={{ letterSpacing: '0.16em', textTransform: 'uppercase', fontSize: '12px' }}>
              {busy ? 'Wird angelegt …' : 'Anlegen & Einladen'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
