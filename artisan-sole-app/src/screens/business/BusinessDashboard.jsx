import { useNavigate } from 'react-router-dom'
import { Building2, ImageIcon, Megaphone, LogOut, ChevronRight } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function BusinessDashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const cards = [
    { icon: Megaphone, title: 'Kampagnen', desc: 'Sammelbestellungen anlegen, Beitritts-Link teilen und den Fortschritt je Modell verfolgen.', to: '/business/campaigns', active: true },
    { icon: ImageIcon, title: 'Profil & Logo', desc: 'Firmendaten pflegen und Ihr Logo für die Schuhsohle hinterlegen.', to: '/business/profile', active: true },
  ]

  return (
    <div className="min-h-[100dvh] bg-white">
      <div className="max-w-3xl mx-auto px-5 lg:px-8 pt-12 pb-16">
        <div className="flex items-start justify-between gap-4 mb-10">
          <div>
            <p className="text-[10px] text-black/30 uppercase tracking-[0.3em] mb-2">Firmenkonto</p>
            <h1 className="text-[26px] lg:text-[32px] font-extralight text-black tracking-tight leading-tight">
              {user?.business_name || 'Willkommen'}
            </h1>
            <p className="text-[13px] text-black/45 font-light mt-2">{user?.name} · {user?.email}</p>
          </div>
          <button
            onClick={() => { logout(); navigate('/login', { replace: true }) }}
            className="flex items-center gap-1.5 text-[11px] text-black/45 hover:text-black bg-transparent border-0 uppercase tracking-[0.15em] shrink-0 pt-1"
          >
            <LogOut size={15} strokeWidth={1.4} /> Abmelden
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-black/[0.06] border border-black/[0.06]">
          {cards.map(c => {
            const Icon = c.icon
            return (
              <button
                key={c.title}
                onClick={() => c.active && c.to && navigate(c.to)}
                disabled={!c.active}
                className={`text-left bg-white p-7 transition-colors border-0 ${c.active ? 'hover:bg-black/[0.02] cursor-pointer' : 'cursor-default'}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <Icon size={22} strokeWidth={1.25} className="text-black/55" />
                  {c.active
                    ? <ChevronRight size={16} className="text-black/25" />
                    : <span className="text-[9px] text-black/35 uppercase tracking-[0.2em] border border-black/15 px-1.5 py-0.5">Demnächst</span>}
                </div>
                <p className="text-[14px] text-black font-normal mb-1.5">{c.title}</p>
                <p className="text-[11px] text-black/45 font-light leading-relaxed">{c.desc}</p>
              </button>
            )
          })}
        </div>

        <div className="mt-10 border border-black/[0.06] bg-[#fafaf9] p-7">
          <div className="flex items-center gap-2.5 mb-2">
            <Building2 size={16} strokeWidth={1.4} className="text-black/50" />
            <p className="text-[12px] text-black font-normal uppercase tracking-[0.15em]">So funktioniert es</p>
          </div>
          <p className="text-[12px] text-black/50 font-light leading-relaxed">
            Legen Sie eine Kampagne an und teilen Sie den Beitritts-Link mit Ihrem
            Team. Mitarbeitende melden sich mit ihrer Firmen-E-Mail an und bestellen
            ihren passgenauen Custom-made Schuh, auf Wunsch mit Ihrem Logo auf der Sohle.
            Ab 10 Paar pro Modell greift der Mengenrabatt, den Fortschritt sehen Sie
            live je Modell.
          </p>
        </div>
      </div>
    </div>
  )
}
