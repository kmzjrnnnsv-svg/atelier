import { useNavigate } from 'react-router-dom'
import { Building2, ImageIcon, Megaphone, LogOut, ChevronRight } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { HOME_PATH } from '../../lib/homePath'
import Ablauf from '../../components/Ablauf'

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
            onClick={() => { logout(); window.location.replace(HOME_PATH) }}
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

        {/* Anleitung für das angemeldete Firmenkonto. Sie stand hier als ein
            Absatz — richtig, aber nicht als Handlungsanweisung zu lesen. Wer
            sich zum ersten Mal anmeldet, sucht die nächste Schaltfläche, nicht
            eine Beschreibung. */}
        <div className="mt-10">
          <div className="flex items-center gap-2.5 mb-5">
            <Building2 size={16} strokeWidth={1.4} className="text-black/50" />
            <p className="text-[12px] text-black font-normal uppercase tracking-[0.15em]">Ihre nächsten Schritte</p>
          </div>
          <Ablauf
            titel="Von hier bis zum ersten Paar"
            intro="Sie legen die Konditionen fest, Ihre Mitarbeitenden bestellen selbst. Größen sammeln Sie keine ein."
            schritte={[
              {
                titel: 'Profil und Logo hinterlegen',
                text: 'Unter „Profil & Logo": Firmendaten und, wenn gewünscht, Ihr Logo für die Sohlenprägung. Einmal hinterlegt, gilt es für alle Bestellungen Ihres Hauses. Das ist der einzige Schritt, den Sie vorziehen sollten — ohne Logo geht die erste Kampagne ohne los.',
              },
              {
                titel: 'Kampagne anlegen',
                text: 'Unter „Kampagnen": Name, Rabatt, Frist und welche Modelle zur Wahl stehen. Sie entscheiden auch, wer teilnehmen darf — alle mit Ihrer E-Mail-Domain oder eine namentliche Liste.',
              },
              {
                titel: 'Zugang öffnen',
                text: 'Bei Domain-Zugang genügt die Ankündigung im Haus: Wer sich mit der Firmen-E-Mail anmeldet, ist automatisch dabei, ohne Code und ohne Beitrittslink. Bei der namentlichen Liste tragen Sie die Adressen ein, die Einladungen gehen per Mail raus.',
              },
              {
                titel: 'Mitarbeitende bestellen',
                text: 'Jeder gibt seine Fußmaße an und konfiguriert sein Paar. Der Rabatt steht im Konfigurator schon am Preis, es ist nichts einzugeben.',
              },
              {
                titel: 'Fortschritt verfolgen',
                text: 'Im Kampagnen-Dashboard sehen Sie je Modell, wie viele Paare zusammengekommen sind und wie viele Personen teilnehmen. Ab zehn Paar pro Modell greift der Mengenrabatt.',
              },
              {
                titel: 'Kampagne schließen',
                text: 'Zur Frist oder von Hand. Danach kommt niemand mehr dazu; bereits bestellte Paare laufen normal weiter durch die Fertigung.',
              },
            ]}
            fuss="Jedes Paar wird einzeln auf die Maße der jeweiligen Person gefertigt und einzeln zugestellt. Es gibt keine Sammellieferung und keine Größenliste, die Sie führen müssten."
            hell
          />
        </div>
      </div>
    </div>
  )
}
