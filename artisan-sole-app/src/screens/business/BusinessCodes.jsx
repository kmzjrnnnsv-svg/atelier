import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Copy, Check, Ban, Ticket, X } from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'

const emptyGen = {
  count: 10,
  coverage_type: 'full',
  discount_type: 'percentage',
  discount_value: '',
  design_scope: 'catalog',
  allowed_shoe_ids: [],
  max_value: '',
  expires_at: '',
}

const statusLabel = { issued: 'Offen', redeemed: 'Eingelöst', revoked: 'Gesperrt', expired: 'Abgelaufen' }
const statusCls = {
  issued: 'bg-green-50 text-green-700 border-green-200',
  redeemed: 'bg-black/[0.06] text-black/55 border-black/15',
  revoked: 'bg-red-50 text-red-700 border-red-200',
  expired: 'bg-amber-50 text-amber-700 border-amber-200',
}

export default function BusinessCodes() {
  const navigate = useNavigate()
  const [codes, setCodes] = useState([])
  const [shoes, setShoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showGen, setShowGen] = useState(false)
  const [gen, setGen] = useState(emptyGen)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [justCreated, setJustCreated] = useState(null)  // array of code strings
  const [copied, setCopied] = useState(null)

  const shoeName = (id) => shoes.find(s => s.id === id)?.name || `#${id}`

  const load = async () => {
    try {
      const [c, s] = await Promise.all([
        apiFetch('/api/business/me/codes'),
        apiFetch('/api/shoes').catch(() => []),
      ])
      setCodes(Array.isArray(c) ? c : [])
      setShoes(Array.isArray(s) ? s : [])
    } catch (e) { setError(e?.error || 'Laden fehlgeschlagen') } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const toggleShoe = (id) => setGen(g => ({
    ...g,
    allowed_shoe_ids: g.allowed_shoe_ids.includes(id)
      ? g.allowed_shoe_ids.filter(x => x !== id)
      : [...g.allowed_shoe_ids, id],
  }))

  const generate = async () => {
    if (busy) return
    setBusy(true); setError(null)
    try {
      const payload = {
        count: parseInt(gen.count, 10) || 0,
        coverage_type: gen.coverage_type,
        design_scope: gen.design_scope,
        expires_at: gen.expires_at || null,
      }
      if (gen.coverage_type === 'discount') {
        payload.discount_type = gen.discount_type
        payload.discount_value = parseFloat(gen.discount_value) || 0
      }
      if (gen.design_scope === 'fixed') payload.allowed_shoe_ids = gen.allowed_shoe_ids
      else if (gen.max_value !== '') payload.max_value = parseFloat(gen.max_value)

      const r = await apiFetch('/api/business/me/codes', { method: 'POST', body: JSON.stringify(payload) })
      setJustCreated(r.codes || [])
      setShowGen(false)
      setGen(emptyGen)
      load()
    } catch (e) {
      setError(e?.error || e?.errors?.[0]?.msg || 'Erzeugen fehlgeschlagen')
    } finally { setBusy(false) }
  }

  const revoke = async (id) => {
    if (!confirm('Diesen Code sperren?')) return
    try { await apiFetch(`/api/business/me/codes/${id}/revoke`, { method: 'POST' }); load() }
    catch (e) { alert(e?.error || 'Fehler') }
  }

  const copy = (text, key) => {
    navigator.clipboard?.writeText(text)
    setCopied(key); setTimeout(() => setCopied(null), 1600)
  }
  const copyOpen = () => {
    const open = codes.filter(c => c.status === 'issued').map(c => c.code)
    if (open.length) copy(open.join('\n'), '__all')
  }

  const coverageText = (c) => c.coverage_type === 'full'
    ? 'Voll gedeckt'
    : `Rabatt ${c.discount_value}${c.discount_type === 'percentage' ? ' %' : ' €'}`
  const designText = (c) => c.design_scope === 'fixed'
    ? (c.allowed_shoe_ids || []).map(shoeName).join(', ')
    : `Freie Wahl${c.max_value ? ` · bis ${c.max_value} €` : ''}`

  const inp = 'w-full h-11 border border-black/15 px-3 text-[14px] bg-white outline-none focus:border-black/40 font-light'
  const lbl = 'block text-[10px] text-black/40 uppercase tracking-[0.15em] mb-1.5 font-light'
  const seg = (active) => `flex-1 h-11 text-[12px] tracking-[0.08em] uppercase border transition-colors ${active ? 'bg-black text-white border-black' : 'bg-white text-black/55 border-black/15 hover:border-black/35'}`

  if (loading) {
    return <div className="min-h-[100dvh] bg-white flex items-center justify-center"><div className="w-7 h-7 border-2 border-black/15 border-t-black/60 rounded-full animate-spin-custom" /></div>
  }

  return (
    <div className="min-h-[100dvh] bg-white">
      <div className="max-w-3xl mx-auto px-5 lg:px-8 pt-10 pb-16">
        <button onClick={() => navigate('/business/dashboard')} className="flex items-center gap-1.5 text-[11px] text-black/45 hover:text-black bg-transparent border-0 uppercase tracking-[0.15em] mb-8">
          <ArrowLeft size={15} strokeWidth={1.4} /> Dashboard
        </button>

        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <p className="text-[10px] text-black/30 uppercase tracking-[0.3em] mb-2">Einmal-Codes</p>
            <h1 className="text-[26px] lg:text-[30px] font-extralight text-black tracking-tight">Codes erstellen & verwalten</h1>
            <p className="text-[12px] text-black/45 font-light mt-2 max-w-lg leading-relaxed">Jeder Code ist genau einmal einlösbar. Ihre Empfänger bestellen damit ihren passgenauen Schuh.</p>
          </div>
          <button onClick={() => { setError(null); setShowGen(true) }} className="flex items-center gap-1.5 text-[11px] tracking-[0.12em] uppercase text-white bg-black px-4 py-2.5 border-0 shrink-0">
            <Plus size={14} strokeWidth={1.6} /> Erzeugen
          </button>
        </div>

        {error && !showGen && <div className="bg-red-50 border border-red-200 px-4 py-3 mb-5"><p className="text-xs text-red-600">{error}</p></div>}

        {justCreated && (
          <div className="border border-black/10 bg-[#fafaf9] p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] text-black uppercase tracking-[0.12em]">{justCreated.length} Code(s) erzeugt</p>
              <div className="flex items-center gap-3">
                <button onClick={() => copy(justCreated.join('\n'), '__new')} className="text-[11px] text-black/60 hover:text-black bg-transparent border-0 inline-flex items-center gap-1.5 uppercase tracking-[0.1em]">
                  {copied === '__new' ? <><Check size={13} /> Kopiert</> : <><Copy size={13} /> Alle kopieren</>}
                </button>
                <button onClick={() => setJustCreated(null)} className="text-black/40 hover:text-black bg-transparent border-0 p-0"><X size={16} /></button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {justCreated.map(c => <span key={c} className="font-mono text-[13px] text-black bg-white border border-black/10 px-2.5 py-1">{c}</span>)}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] text-black/35 uppercase tracking-[0.2em]">Alle Codes ({codes.length})</p>
          {codes.some(c => c.status === 'issued') && (
            <button onClick={copyOpen} className="text-[11px] text-black/55 hover:text-black bg-transparent border-0 inline-flex items-center gap-1.5 uppercase tracking-[0.1em]">
              {copied === '__all' ? <><Check size={13} /> Kopiert</> : <><Copy size={13} /> Offene kopieren</>}
            </button>
          )}
        </div>

        {codes.length === 0 ? (
          <div className="border border-black/[0.06] bg-[#fafaf9] py-12 text-center">
            <Ticket size={26} strokeWidth={1.2} className="text-black/25 mx-auto mb-3" />
            <p className="text-[13px] text-black/45 font-light">Noch keine Codes. Erzeugen Sie Ihren ersten Batch.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {codes.map(c => (
              <div key={c.id} className="flex items-center justify-between gap-4 border border-black/10 bg-white px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-[14px] text-black">{c.code}</span>
                    <span className={`text-[9px] uppercase tracking-[0.1em] border px-1.5 py-0.5 ${statusCls[c.status]}`}>{statusLabel[c.status]}</span>
                  </div>
                  <p className="text-[11px] text-black/45 font-light mt-0.5 truncate">
                    {coverageText(c)} · {designText(c)}{c.expires_at ? ` · gültig bis ${c.expires_at.slice(0, 10)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => copy(c.code, c.id)} className="text-black/45 hover:text-black bg-transparent border-0 p-1.5" title="Kopieren">
                    {copied === c.id ? <Check size={15} /> : <Copy size={15} />}
                  </button>
                  {c.status === 'issued' && (
                    <button onClick={() => revoke(c.id)} className="text-black/35 hover:text-red-600 bg-transparent border-0 p-1.5" title="Sperren">
                      <Ban size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generierungs-Modal */}
      {showGen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => !busy && setShowGen(false)}>
          <div className="bg-white w-full max-w-md max-h-[90dvh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[16px] font-light text-black">Codes erzeugen</h2>
              <button onClick={() => setShowGen(false)} className="text-black/40 hover:text-black bg-transparent border-0 p-0"><X size={18} /></button>
            </div>
            {error && <div className="bg-red-50 border border-red-200 px-3 py-2 mb-4"><p className="text-xs text-red-600">{error}</p></div>}

            <div className="space-y-4">
              <div>
                <label className={lbl}>Anzahl Codes</label>
                <input type="number" min="1" max="500" className={inp} value={gen.count} onChange={e => setGen({ ...gen, count: e.target.value })} />
              </div>

              <div>
                <label className={lbl}>Deckung</label>
                <div className="flex gap-2">
                  <button type="button" className={seg(gen.coverage_type === 'full')} onClick={() => setGen({ ...gen, coverage_type: 'full' })}>Voll gedeckt</button>
                  <button type="button" className={seg(gen.coverage_type === 'discount')} onClick={() => setGen({ ...gen, coverage_type: 'discount' })}>Rabatt</button>
                </div>
              </div>

              {gen.coverage_type === 'discount' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Rabattart</label>
                    <select className={inp} value={gen.discount_type} onChange={e => setGen({ ...gen, discount_type: e.target.value })}>
                      <option value="percentage">Prozent (%)</option>
                      <option value="fixed">Festbetrag (€)</option>
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Wert</label>
                    <input type="number" min="1" className={inp} value={gen.discount_value} onChange={e => setGen({ ...gen, discount_value: e.target.value })} placeholder={gen.discount_type === 'percentage' ? 'z. B. 50' : 'z. B. 100'} />
                  </div>
                </div>
              )}

              <div>
                <label className={lbl}>Einlösbar auf</label>
                <div className="flex gap-2">
                  <button type="button" className={seg(gen.design_scope === 'catalog')} onClick={() => setGen({ ...gen, design_scope: 'catalog' })}>Freie Wahl</button>
                  <button type="button" className={seg(gen.design_scope === 'fixed')} onClick={() => setGen({ ...gen, design_scope: 'fixed' })}>Festes Design</button>
                </div>
              </div>

              {gen.design_scope === 'fixed' ? (
                <div>
                  <label className={lbl}>Designs ({gen.allowed_shoe_ids.length} gewählt)</label>
                  <div className="border border-black/15 max-h-44 overflow-y-auto divide-y divide-black/[0.06]">
                    {shoes.map(s => (
                      <label key={s.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-black/[0.02]">
                        <input type="checkbox" checked={gen.allowed_shoe_ids.includes(s.id)} onChange={() => toggleShoe(s.id)} />
                        <span className="text-[13px] text-black">{s.name}</span>
                        <span className="text-[10px] text-black/35 uppercase tracking-wider ml-auto">{s.category}</span>
                      </label>
                    ))}
                    {shoes.length === 0 && <p className="px-3 py-3 text-[12px] text-black/40 font-light">Keine Designs verfügbar.</p>}
                  </div>
                </div>
              ) : (
                <div>
                  <label className={lbl}>Wert-Obergrenze € (optional)</label>
                  <input type="number" min="1" className={inp} value={gen.max_value} onChange={e => setGen({ ...gen, max_value: e.target.value })} placeholder="z. B. 350" />
                </div>
              )}

              <div>
                <label className={lbl}>Gültig bis (optional)</label>
                <input type="date" className={inp} value={gen.expires_at} onChange={e => setGen({ ...gen, expires_at: e.target.value })} />
              </div>
            </div>

            <button onClick={generate} disabled={busy} className="w-full h-11 mt-6 bg-black text-white border-0 disabled:opacity-30" style={{ letterSpacing: '0.16em', textTransform: 'uppercase', fontSize: '12px' }}>
              {busy ? 'Wird erzeugt …' : `${parseInt(gen.count, 10) || 0} Code(s) erzeugen`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
