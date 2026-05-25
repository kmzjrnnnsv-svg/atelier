import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, Package, CheckCircle2 } from 'lucide-react'
import useStore from '../../store/store'

export default function CampaignDashboard() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { fetchCampaignDashboard } = useStore()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchCampaignDashboard(id)
      .then(setData)
      .catch(e => setError(e?.error || 'Laden fehlgeschlagen'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="min-h-[100dvh] bg-white flex items-center justify-center"><div className="w-7 h-7 border-2 border-stone-200 border-t-stone-600 rounded-full animate-spin-custom" /></div>
  if (error || !data) return (
    <div className="min-h-[100dvh] bg-white flex items-center justify-center px-6 text-center">
      <div><p className="text-[14px] text-stone-500 font-light">{error || 'Nicht gefunden.'}</p>
        <button onClick={() => navigate('/business/campaigns')} className="mt-4 text-[12px] text-stone-400 underline bg-transparent border-0">Zu den Kampagnen</button></div>
    </div>
  )

  const { campaign, moq_per_model, per_model, totals } = data
  const reachedCount = per_model.filter(m => m.reached).length

  return (
    <div className="min-h-[100dvh] bg-white">
      <div className="max-w-3xl mx-auto px-5 lg:px-8 pt-10 pb-16">
        <button onClick={() => navigate('/business/campaigns')} className="flex items-center gap-1.5 text-[11px] text-stone-500 hover:text-stone-900 bg-transparent border-0 uppercase tracking-[0.15em] mb-8">
          <ArrowLeft size={15} strokeWidth={1.4} /> Kampagnen
        </button>

        <p className="text-[10px] text-stone-400 uppercase tracking-[0.3em] mb-2">Fortschritt</p>
        <h1 className="text-[26px] lg:text-[30px] font-extralight text-stone-900 tracking-tight">{campaign.name}</h1>
        <p className="text-[12px] text-stone-500 font-light mt-2">
          {campaign.payment_mode === 'company' ? 'Firma zahlt' : `${campaign.discount_pct}% Rabatt`} · Mindestmenge {moq_per_model} pro Modell
        </p>

        {/* Kennzahlen */}
        <div className="grid grid-cols-3 gap-px bg-stone-200 border border-stone-200 mt-7">
          {[
            { icon: Package, label: 'Bestellungen', value: totals.orders },
            { icon: Users, label: 'Teilnehmende', value: totals.participants },
            { icon: CheckCircle2, label: 'Modelle erreicht', value: `${reachedCount}/${per_model.length || 0}` },
          ].map(k => {
            const Icon = k.icon
            return (
              <div key={k.label} className="bg-white p-5 text-center">
                <Icon size={18} strokeWidth={1.3} className="text-stone-400 mx-auto mb-2" />
                <p className="text-[22px] font-extralight text-stone-900 leading-none">{k.value}</p>
                <p className="text-[10px] text-stone-400 uppercase tracking-[0.12em] mt-1.5">{k.label}</p>
              </div>
            )
          })}
        </div>

        {/* Fortschritt je Modell (Wolt-Style) */}
        <p className="text-[10px] text-stone-400 uppercase tracking-[0.2em] mt-10 mb-4">Fortschritt je Modell</p>
        {per_model.length === 0 ? (
          <p className="text-[13px] text-stone-500 font-light py-6">Noch keine Bestellungen in dieser Kampagne.</p>
        ) : (
          <div className="space-y-5">
            {per_model.map(m => {
              const pct = Math.min(100, Math.round((m.units / moq_per_model) * 100))
              const remaining = Math.max(0, moq_per_model - m.units)
              return (
                <div key={`${m.shoe_id}-${m.shoe_name}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[13px] text-stone-900">{m.shoe_name}</span>
                    <span className={`text-[12px] font-light ${m.reached ? 'text-green-700' : 'text-stone-500'}`}>
                      {m.units} / {moq_per_model} {m.reached ? '· erreicht' : `· noch ${remaining}`}
                    </span>
                  </div>
                  <div className="h-2.5 bg-stone-100 overflow-hidden">
                    <div className={`h-full transition-all duration-500 ${m.reached ? 'bg-green-600' : 'bg-stone-900'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <p className="text-center text-[11px] text-stone-400 font-light mt-10 leading-relaxed">
          Sobald genug Bestellungen je Modell zusammenkommen, ist die Mindestmenge erreicht.
          Schließen Sie die Kampagne, wenn Sie bereit sind.
        </p>
      </div>
    </div>
  )
}
