import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Building2, ArrowRight, Check } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import useStore from '../../store/store'

export default function CampaignJoin() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { fetchCampaignBySlug, joinCampaign, resendVerification } = useStore()

  const [camp, setCamp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [joining, setJoining] = useState(false)
  const [joined, setJoined] = useState(false)
  const [needVerify, setNeedVerify] = useState(false)
  const [resent, setResent] = useState(false)

  useEffect(() => {
    fetchCampaignBySlug(slug)
      .then(setCamp)
      .catch(() => setError('Diese Kampagne wurde nicht gefunden.'))
      .finally(() => setLoading(false))
  }, [slug])

  const doJoin = async () => {
    if (joining) return
    setJoining(true); setError(null)
    try {
      await joinCampaign(slug)
      setJoined(true)
      setTimeout(() => navigate('/collection'), 900)
    } catch (e) {
      if (e?.code === 'EMAIL_UNVERIFIED') setNeedVerify(true)
      setError(e?.error || 'Beitritt nicht möglich.')
    } finally { setJoining(false) }
  }

  const doResend = async () => {
    try { await resendVerification(); setResent(true) } catch { /* ignore */ }
  }

  // Eingeloggt und Kampagne offen → automatisch beitreten.
  useEffect(() => {
    if (user && camp && camp.status === 'open' && !joined && !joining) doJoin()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, camp])

  const resolveLogo = (l) => (l && (l.startsWith('http') || l.startsWith('data:'))) ? l : null

  if (loading) {
    return <div className="min-h-[100dvh] bg-white flex items-center justify-center"><div className="w-7 h-7 border-2 border-stone-200 border-t-stone-600 rounded-full animate-spin-custom" /></div>
  }
  if (!camp) {
    return (
      <div className="min-h-[100dvh] bg-white flex items-center justify-center px-6 text-center">
        <div>
          <p className="text-[14px] text-stone-500 font-light">{error || 'Kampagne nicht gefunden.'}</p>
          <button onClick={() => navigate('/collection')} className="mt-4 text-[12px] text-stone-400 underline bg-transparent border-0">Zum Shop</button>
        </div>
      </div>
    )
  }

  const logo = resolveLogo(camp.business_logo)
  const benefit = camp.payment_mode === 'company'
    ? 'Ihr Schuh wird vom Unternehmen übernommen.'
    : `Sie erhalten ${camp.discount_pct}% Rabatt auf Ihren Custom-made Schuh.`

  return (
    <div className="min-h-[100dvh] bg-stone-50 flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-md bg-white border border-stone-200 p-8 lg:p-10 text-center">
        {logo
          ? <img src={logo} alt="" className="w-20 h-20 object-contain mx-auto mb-5" />
          : <Building2 size={40} strokeWidth={1.1} className="text-stone-400 mx-auto mb-5" />}
        <p className="text-[10px] uppercase tracking-[0.3em] text-stone-400 mb-2">{camp.business_name || 'Firmen-Aktion'}</p>
        <h1 className="text-[24px] font-extralight text-stone-900 tracking-tight">{camp.name}</h1>
        <p className="text-[13px] text-stone-500 font-light mt-3 leading-relaxed">{benefit}</p>

        {camp.status !== 'open' ? (
          <p className="text-[12px] text-amber-700 font-light mt-6">Diese Kampagne ist derzeit nicht aktiv.</p>
        ) : joined ? (
          <div className="mt-7 inline-flex items-center gap-2 text-[13px] text-green-700"><Check size={16} /> Beigetreten, weiter zum Shop …</div>
        ) : needVerify ? (
          <div className="mt-7">
            <p className="text-[12px] text-stone-600 font-light leading-relaxed">Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse. Wir haben Ihnen einen Link gesendet{camp.allowed_email_domain ? ` (an Ihre @${camp.allowed_email_domain}-Adresse)` : ''}.</p>
            {resent
              ? <p className="text-[12px] text-green-700 mt-3 inline-flex items-center gap-1.5"><Check size={14} /> Erneut gesendet.</p>
              : <button onClick={doResend} className="mt-4 text-[12px] text-stone-900 underline underline-offset-4 bg-transparent border-0">Bestätigungs-E-Mail erneut senden</button>}
          </div>
        ) : user ? (
          <button onClick={doJoin} disabled={joining} className="mt-7 w-full h-12 inline-flex items-center justify-center gap-2 bg-stone-900 text-white border-0 disabled:opacity-40" style={{ letterSpacing: '0.18em', textTransform: 'uppercase', fontSize: '12px' }}>
            {joining ? 'Einen Moment …' : <>Teilnehmen <ArrowRight size={15} /></>}
          </button>
        ) : (
          <>
            <p className="text-[12px] text-stone-500 font-light mt-6 leading-relaxed">
              {camp.allowed_email_domain
                ? <>Bitte mit Ihrer <span className="text-stone-900">@{camp.allowed_email_domain}</span>-Adresse anmelden, um teilzunehmen.</>
                : 'Bitte anmelden, um teilzunehmen.'}
            </p>
            <button
              onClick={() => navigate('/login', { state: { from: location.pathname } })}
              className="mt-5 w-full h-12 inline-flex items-center justify-center gap-2 bg-stone-900 text-white border-0"
              style={{ letterSpacing: '0.18em', textTransform: 'uppercase', fontSize: '12px' }}
            >
              Anmelden <ArrowRight size={15} />
            </button>
            <button onClick={() => navigate('/register', { state: { from: location.pathname } })} className="mt-3 text-[12px] text-stone-500 hover:text-stone-900 bg-transparent border-0 underline underline-offset-4">
              Noch kein Konto? Registrieren
            </button>
          </>
        )}

        {error && <p className="text-[12px] text-red-600/80 font-light mt-4">{error}</p>}
      </div>
    </div>
  )
}
