import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Copy, Check, X, Megaphone, BarChart3, Play, Square, Users } from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'
import useStore from '../../store/store'

const JOIN_ORIGIN = 'https://business.artisansole.com'

const empty = {
  name: '', payment_mode: 'employee', discount_pct: 25, moq_per_model: 10,
  allowed_shoe_ids: [], access_mode: 'domain', allowed_email_domain: '', deadline: '',
}

const statusCls = {
  open: 'bg-green-50 text-green-700 border-green-200',
  draft: 'bg-stone-100 text-stone-500 border-stone-200',
  closed: 'bg-stone-200 text-stone-600 border-stone-300',
}
const statusLabel = { open: 'Aktiv', draft: 'Entwurf', closed: 'Geschlossen' }

export default function BusinessCampaigns() {
  const navigate = useNavigate()
  const { fetchOwnerCampaigns, createCampaign, updateCampaign } = useStore()
  const [list, setList] = useState([])
  const [shoes, setShoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)   // null = closed modal
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(null)

  const load = async () => {
    try {
      const [cs, ss] = await Promise.all([fetchOwnerCampaigns(), apiFetch('/api/shoes').catch(() => [])])
      setList(Array.isArray(cs) ? cs : [])
      setShoes(Array.isArray(ss) ? ss : [])
    } catch (e) { setError(e?.error || 'Laden fehlgeschlagen') } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const shoeName = (id) => shoes.find(s => s.id === id)?.name || `#${id}`
  const toggleShoe = (id) => setForm(f => ({ ...f, allowed_shoe_ids: f.allowed_shoe_ids.includes(id) ? f.allowed_shoe_ids.filter(x => x !== id) : [...f.allowed_shoe_ids, id] }))

  const save = async () => {
    if (busy || !form) return
    setBusy(true); setError(null)
    try {
      const payload = {
        name: form.name.trim(),
        payment_mode: form.payment_mode,
        discount_pct: parseFloat(form.discount_pct) || 0,
        moq_per_model: parseInt(form.moq_per_model, 10) || 10,
        allowed_shoe_ids: form.allowed_shoe_ids,
        access_mode: form.access_mode,
        allowed_email_domain: form.allowed_email_domain.trim() || null,
        deadline: form.deadline || null,
        status: 'open',
      }
      await createCampaign(payload)
      setForm(null); load()
    } catch (e) { setError(e?.error || e?.errors?.[0]?.msg || 'Anlegen fehlgeschlagen') } finally { setBusy(false) }
  }

  const toggleStatus = async (c) => {
    const next = c.status === 'open' ? 'closed' : 'open'
    try { await updateCampaign(c.id, { status: next }); load() } catch (e) { alert(e?.error || 'Fehler') }
  }

  const copyLink = (slug) => {
    navigator.clipboard?.writeText(`${JOIN_ORIGIN}/c/${slug}`)
    setCopied(slug); setTimeout(() => setCopied(null), 1800)
  }

  const inp = 'w-full h-10 border border-stone-300 px-3 text-[13px] bg-white outline-none focus:border-stone-900 font-light'
  const lbl = 'block text-[10px] text-stone-400 uppercase tracking-[0.12em] mb-1 font-light'
  const seg = (active) => `flex-1 h-10 text-[12px] tracking-[0.06em] uppercase border transition-colors ${active ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-500 border-stone-300 hover:border-stone-500'}`

  if (loading) return <div className="min-h-[100dvh] bg-white flex items-center justify-center"><div className="w-7 h-7 border-2 border-stone-200 border-t-stone-600 rounded-full animate-spin-custom" /></div>

  return (
    <div className="min-h-[100dvh] bg-white">
      <div className="max-w-3xl mx-auto px-5 lg:px-8 pt-10 pb-16">
        <button onClick={() => navigate('/business/dashboard')} className="flex items-center gap-1.5 text-[11px] text-stone-500 hover:text-stone-900 bg-transparent border-0 uppercase tracking-[0.15em] mb-8">
          <ArrowLeft size={15} strokeWidth={1.4} /> Dashboard
        </button>

        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <p className="text-[10px] text-stone-400 uppercase tracking-[0.3em] mb-2">Kampagnen</p>
            <h1 className="text-[26px] lg:text-[30px] font-extralight text-stone-900 tracking-tight">Sammelbestellungen</h1>
            <p className="text-[12px] text-stone-500 font-light mt-2 max-w-lg leading-relaxed">Erstellen Sie eine Kampagne, teilen Sie den Link, und Ihre Mitarbeitenden bestellen ihren Schuh. Ab 10 pro Modell greift der Mengenrabatt.</p>
          </div>
          <button onClick={() => { setError(null); setForm({ ...empty }) }} className="flex items-center gap-1.5 text-[11px] tracking-[0.12em] uppercase text-white bg-stone-900 px-4 py-2.5 border-0 shrink-0">
            <Plus size={14} strokeWidth={1.6} /> Neu
          </button>
        </div>

        {error && !form && <div className="bg-red-50 border border-red-200 px-4 py-3 mb-5"><p className="text-xs text-red-600">{error}</p></div>}

        {list.length === 0 ? (
          <div className="border border-stone-200 bg-stone-50 py-12 text-center">
            <Megaphone size={26} strokeWidth={1.2} className="text-stone-300 mx-auto mb-3" />
            <p className="text-[13px] text-stone-500 font-light">Noch keine Kampagne. Legen Sie Ihre erste an.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {list.map(c => (
              <div key={c.id} className="border border-stone-200 bg-white px-4 py-3.5">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <p className="text-[14px] text-stone-900">{c.name}</p>
                      <span className={`text-[9px] uppercase tracking-[0.1em] border px-1.5 py-0.5 ${statusCls[c.status]}`}>{statusLabel[c.status]}</span>
                    </div>
                    <p className="text-[11px] text-stone-500 font-light mt-0.5">
                      {c.payment_mode === 'company' ? 'Firma zahlt' : `${c.discount_pct}% Rabatt`}
                      {' · '}{c.allowed_shoe_ids ? `${c.allowed_shoe_ids.length} Modell(e)` : 'ganzer Katalog'}
                      {' · '}<span className="inline-flex items-center gap-1"><Users size={11} /> {c.participants || 0}</span>
                      {c.allowed_email_domain ? ` · @${c.allowed_email_domain}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => copyLink(c.slug)} className="text-stone-500 hover:text-stone-900 bg-transparent border-0 p-1.5" title="Link kopieren">
                      {copied === c.slug ? <Check size={15} /> : <Copy size={15} />}
                    </button>
                    <button onClick={() => navigate(`/business/campaigns/${c.id}`)} className="text-stone-500 hover:text-stone-900 bg-transparent border-0 p-1.5" title="Fortschritt">
                      <BarChart3 size={15} />
                    </button>
                    <button onClick={() => toggleStatus(c)} className="text-stone-500 hover:text-stone-900 bg-transparent border-0 p-1.5" title={c.status === 'open' ? 'Schließen' : 'Öffnen'}>
                      {c.status === 'open' ? <Square size={15} /> : <Play size={15} />}
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-stone-400 font-light mt-2 break-all">{JOIN_ORIGIN}/c/{c.slug}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Anlege-Modal */}
      {form && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => !busy && setForm(null)}>
          <div className="bg-white w-full max-w-md max-h-[90dvh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[16px] font-light text-stone-900">Kampagne anlegen</h2>
              <button onClick={() => setForm(null)} className="text-stone-400 hover:text-stone-900 bg-transparent border-0 p-0"><X size={18} /></button>
            </div>
            {error && <div className="bg-red-50 border border-red-200 px-3 py-2 mb-4"><p className="text-xs text-red-600">{error}</p></div>}
            <div className="space-y-4">
              <div><label className={lbl}>Name</label><input className={inp} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="z. B. Winter 2026" /></div>

              <div>
                <label className={lbl}>Zahlung</label>
                <div className="flex gap-2">
                  <button type="button" className={seg(form.payment_mode === 'employee')} onClick={() => setForm({ ...form, payment_mode: 'employee' })}>Mitarbeiter zahlt</button>
                  <button type="button" className={seg(form.payment_mode === 'company')} onClick={() => setForm({ ...form, payment_mode: 'company' })}>Firma zahlt</button>
                </div>
              </div>

              {form.payment_mode === 'employee' && (
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={lbl}>Rabatt %</label><input type="number" min="0" max="100" className={inp} value={form.discount_pct} onChange={e => setForm({ ...form, discount_pct: e.target.value })} /></div>
                  <div><label className={lbl}>MOQ je Modell</label><input type="number" min="1" className={inp} value={form.moq_per_model} onChange={e => setForm({ ...form, moq_per_model: e.target.value })} /></div>
                </div>
              )}
              {form.payment_mode === 'company' && (
                <div><label className={lbl}>MOQ je Modell</label><input type="number" min="1" className={inp} value={form.moq_per_model} onChange={e => setForm({ ...form, moq_per_model: e.target.value })} /></div>
              )}

              <div>
                <label className={lbl}>Zugang</label>
                <div className="flex gap-2">
                  <button type="button" className={seg(form.access_mode === 'domain')} onClick={() => setForm({ ...form, access_mode: 'domain' })}>E-Mail-Domain</button>
                  <button type="button" className={seg(form.access_mode === 'both')} onClick={() => setForm({ ...form, access_mode: 'both' })}>Domain + Liste</button>
                </div>
              </div>
              {(form.access_mode === 'domain' || form.access_mode === 'both') && (
                <div><label className={lbl}>Firmen-Domain</label><input className={inp} value={form.allowed_email_domain} onChange={e => setForm({ ...form, allowed_email_domain: e.target.value })} placeholder="firma.com" /></div>
              )}

              <div>
                <label className={lbl}>Designs ({form.allowed_shoe_ids.length} gewählt, leer = ganzer Katalog)</label>
                <div className="border border-stone-300 max-h-40 overflow-y-auto divide-y divide-stone-100">
                  {shoes.map(s => (
                    <label key={s.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-stone-50">
                      <input type="checkbox" checked={form.allowed_shoe_ids.includes(s.id)} onChange={() => toggleShoe(s.id)} />
                      <span className="text-[13px] text-stone-900">{s.name}</span>
                      <span className="text-[10px] text-stone-400 uppercase tracking-wider ml-auto">{s.category}</span>
                    </label>
                  ))}
                  {shoes.length === 0 && <p className="px-3 py-3 text-[12px] text-stone-400 font-light">Keine Designs verfügbar.</p>}
                </div>
              </div>

              <div><label className={lbl}>Deadline (optional)</label><input type="date" className={inp} value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} /></div>
            </div>
            <button onClick={save} disabled={busy || form.name.trim().length < 2} className="w-full h-11 mt-6 bg-stone-900 text-white border-0 disabled:opacity-30" style={{ letterSpacing: '0.16em', textTransform: 'uppercase', fontSize: '12px' }}>
              {busy ? 'Wird erstellt …' : 'Erstellen & öffnen'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
