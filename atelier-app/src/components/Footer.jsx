/**
 * Footer.jsx — Global site footer
 * Dark angular design inspired by luxury e-commerce
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Instagram, ArrowRight } from 'lucide-react'
import { CRAFT } from '../lib/editorialImages'

export default function Footer() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')

  const handleNewsletter = (e) => {
    e.preventDefault()
    if (email.trim()) {
      setEmail('')
    }
  }

  return (
    <footer className="bg-[#1a1a1a] text-white">

      {/* ── Help Banner ─────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ minHeight: 220 }}>
        <img src={CRAFT.workshop} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative px-6 lg:px-16 xl:px-24 py-10 lg:py-14 flex flex-col justify-center" style={{ minHeight: 220 }}>
          <p className="text-[9px] text-white/30 uppercase tracking-[0.3em] mb-2">Brauchen Sie Hilfe?</p>
          <h3 className="text-[22px] lg:text-[30px] font-extralight text-white leading-tight tracking-tight">Wir sind für Sie da</h3>
          <p className="text-[11px] lg:text-[13px] text-white/30 mt-2 font-light max-w-sm">
            Unser Team hilft Ihnen gerne — persönlich und diskret.
          </p>
          <button
            onClick={() => navigate('/help')}
            className="mt-4 lg:mt-5 px-6 py-2.5 border border-white/30 text-white text-[10px] bg-transparent hover:bg-white hover:text-black transition-all duration-300 w-fit"
            style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}
          >
            Kontakt
          </button>
        </div>
      </div>

      {/* ── Footer Links Grid ───────────────────────────────── */}
      <div className="px-6 lg:px-16 xl:px-24 py-10 lg:py-14">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">

          {/* Contact */}
          <div>
            <p className="text-[9px] text-white/25 uppercase tracking-[0.25em] mb-4">Kontakt</p>
            <div className="space-y-2.5">
              <p className="text-[12px] text-white/50 font-light">+49 123 456 789</p>
              <p className="text-[12px] text-white/50 font-light">service@atelier.de</p>
            </div>
          </div>

          {/* Shop */}
          <div>
            <p className="text-[9px] text-white/25 uppercase tracking-[0.25em] mb-4">Shop</p>
            <div className="space-y-2.5">
              {[
                { label: 'Kollektion', path: '/collection' },
                { label: 'Zubehör', path: '/accessories' },
                { label: 'Maßanfertigung', path: '/customize' },
                { label: 'Neuheiten', path: '/collection' },
              ].map(link => (
                <button
                  key={link.label}
                  onClick={() => navigate(link.path)}
                  className="block text-[12px] text-white/40 font-light bg-transparent border-0 p-0 hover:text-white/70 transition-colors cursor-pointer"
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>

          {/* Company */}
          <div>
            <p className="text-[9px] text-white/25 uppercase tracking-[0.25em] mb-4">Unternehmen</p>
            <div className="space-y-2.5">
              {[
                { label: 'Über uns', path: '/explore' },
                { label: 'Journal', path: '/explore' },
                { label: 'AGB', path: '/legal/terms' },
                { label: 'Datenschutz', path: '/legal/privacy' },
                { label: 'Impressum', path: '/legal/imprint' },
              ].map(link => (
                <button
                  key={link.label}
                  onClick={() => navigate(link.path)}
                  className="block text-[12px] text-white/40 font-light bg-transparent border-0 p-0 hover:text-white/70 transition-colors cursor-pointer"
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>

          {/* Newsletter */}
          <div>
            <p className="text-[9px] text-white/25 uppercase tracking-[0.25em] mb-4">Newsletter</p>
            <p className="text-[11px] text-white/35 font-light mb-4 leading-relaxed">
              Erhalten Sie als Erster exklusive Neuigkeiten und Angebote.
            </p>
            <form onSubmit={handleNewsletter} className="flex">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="IHRE E-MAIL"
                className="flex-1 bg-transparent border border-white/15 border-r-0 px-3 py-2.5 text-[10px] text-white/70 placeholder-white/20 outline-none focus:border-white/30 transition-colors font-light tracking-wider"
              />
              <button
                type="submit"
                className="w-10 border border-white/15 bg-transparent text-white/30 hover:text-white/60 hover:border-white/30 flex items-center justify-center transition-colors"
              >
                <ArrowRight size={13} strokeWidth={1.25} />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ── Bottom Bar ──────────────────────────────────────── */}
      <div className="border-t border-white/[0.06] px-6 lg:px-16 xl:px-24 py-5 flex items-center justify-between">
        <p className="text-[10px] text-white/20 font-light">
          © {new Date().getFullYear()} Atelier
        </p>
        <div className="flex items-center gap-5">
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-white/25 hover:text-white/50 transition-colors">
            <Instagram size={15} strokeWidth={1.25} />
          </a>
          <svg className="text-white/25 hover:text-white/50 transition-colors cursor-pointer" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
          </svg>
        </div>
      </div>
    </footer>
  )
}
