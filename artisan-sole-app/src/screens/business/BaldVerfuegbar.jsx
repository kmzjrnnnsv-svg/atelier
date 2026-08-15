/**
 * Der Firmenbereich, solange er noch nicht offen ist.
 *
 * Kein leerer Bildschirm und keine Fehlerseite: Wer hier landet, hat sich
 * angemeldet und erwartet seinen Bereich. Er bekommt eine Antwort, einen Weg
 * zum Gespräch und den Hinweis, dass sein Konto bestehen bleibt.
 */
import { useNavigate } from 'react-router-dom'
import { Clock, ArrowRight, LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { HOME_PATH } from '../../lib/homePath'

export default function BaldVerfuegbar() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  return (
    <div className="min-h-[100dvh] bg-white text-black flex flex-col">
      <div className="flex items-center justify-between px-5 lg:px-16 h-14 border-b border-black/[0.06]">
        <span className="font-brand text-[11px] text-black/70">ARTISAN SOLE</span>
        <button
          onClick={() => { logout(); window.location.replace(HOME_PATH) }}
          className="flex items-center gap-2 h-11 px-2 bg-transparent border-0 text-[11px] text-black/40 hover:text-black/70 uppercase tracking-[0.16em]"
        >
          <LogOut size={14} strokeWidth={1.4} /> Abmelden
        </button>
      </div>

      <div className="flex-1 flex items-center px-6 lg:px-16">
        <div className="max-w-xl">
          <Clock size={20} strokeWidth={1.3} className="text-black/40" />
          <p className="text-[10px] uppercase tracking-[0.3em] text-black/30 mt-6">Firmenbereich</p>
          <h1 className="text-[27px] lg:text-[34px] font-extralight leading-[1.15] tracking-tight mt-3">
            Wir bereiten diesen Bereich noch vor.
          </h1>
          <p className="text-[14px] text-black/50 font-light leading-relaxed mt-5">
            Sammelbestellungen, Einmal-Codes und Ihr Logo auf der Sohle stehen kurz bevor.
            Wir öffnen den Bereich erst, wenn wir jede Bestellung daraus auch zuverlässig
            ausführen können, eine halb betreute Kampagne wäre niemandem gedient.
          </p>
          <p className="text-[14px] text-black/50 font-light leading-relaxed mt-4">
            Ihr Konto bleibt bestehen. Sobald es so weit ist, melden wir uns bei Ihnen.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-9">
            <button
              onClick={() => navigate('/business')}
              className="flex items-center gap-2.5 bg-black text-white border-0 px-7 py-4"
              style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase' }}
            >
              Was wir für Unternehmen planen <ArrowRight size={14} strokeWidth={1.6} />
            </button>
            <button
              onClick={() => navigate('/collection')}
              className="bg-transparent border-0 p-0 text-[12px] text-black/40 hover:text-black transition-colors"
            >
              Zur Kollektion
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
