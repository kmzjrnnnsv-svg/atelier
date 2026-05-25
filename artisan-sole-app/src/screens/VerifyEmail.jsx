import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Check, X } from 'lucide-react'

export default function VerifyEmail() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token')
  const API_BASE = import.meta.env.VITE_API_URL ?? ''
  const [state, setState] = useState('loading')   // loading | ok | error

  useEffect(() => {
    if (!token) { setState('error'); return }
    fetch(`${API_BASE}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'ArtisanSole' },
      body: JSON.stringify({ token }),
    })
      .then(r => setState(r.ok ? 'ok' : 'error'))
      .catch(() => setState('error'))
  }, [token])

  return (
    <div className="min-h-[100dvh] bg-stone-50 flex items-center justify-center px-5">
      <div className="w-full max-w-sm bg-white border border-stone-200 p-8 lg:p-10 text-center">
        <p className="font-brand text-[15px] text-stone-900 mb-6">ARTISAN SOLE</p>
        {state === 'loading' && <div className="w-7 h-7 border-2 border-stone-200 border-t-stone-600 rounded-full animate-spin-custom mx-auto" />}
        {state === 'ok' && (
          <>
            <div className="w-12 h-12 bg-green-600 flex items-center justify-center mx-auto mb-4"><Check size={22} className="text-white" strokeWidth={2} /></div>
            <p className="text-[18px] font-extralight text-stone-900 tracking-tight">E-Mail bestätigt</p>
            <p className="text-[12px] text-stone-500 font-light mt-2">Sie können jetzt an Firmen-Aktionen teilnehmen.</p>
            <button onClick={() => navigate('/collection')} className="mt-6 w-full h-11 bg-stone-900 text-white border-0" style={{ letterSpacing: '0.18em', textTransform: 'uppercase', fontSize: '12px' }}>Weiter</button>
          </>
        )}
        {state === 'error' && (
          <>
            <div className="w-12 h-12 bg-stone-200 flex items-center justify-center mx-auto mb-4"><X size={22} className="text-stone-600" strokeWidth={2} /></div>
            <p className="text-[18px] font-extralight text-stone-900 tracking-tight">Link ungültig</p>
            <p className="text-[12px] text-stone-500 font-light mt-2">Dieser Bestätigungslink ist ungültig oder wurde bereits verwendet.</p>
            <button onClick={() => navigate('/collection')} className="mt-6 w-full h-11 bg-stone-900 text-white border-0" style={{ letterSpacing: '0.18em', textTransform: 'uppercase', fontSize: '12px' }}>Zum Shop</button>
          </>
        )}
      </div>
    </div>
  )
}
