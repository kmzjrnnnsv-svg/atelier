/**
 * Footer.jsx — Global site footer
 * Matches Dribbble reference: split help banner, links grid, bottom bar
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
    <footer className="bg-[#2a2a2a] text-white">

      {/* ── Help Banner — split: dark text left, image right ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* Text side */}
        <div className="px-6 lg:px-16 xl:px-24 py-10 lg:py-14 flex flex-col justify-center">
          <p className="text-[9px] text-white/30 uppercase tracking-[0.3em] mb-2 lg:mb-3">Brauchen Sie Hilfe?</p>
          <h3 className="text-[20px] lg:text-[26px] font-extralight text-white leading-tight tracking-tight">Wir sind für Sie da</h3>
          <p className="text-[11px] lg:text-[12px] text-white/30 mt-2 lg:mt-3 font-light max-w-xs leading-relaxed">
            Unser Team hilft Ihnen gerne — persönlich und diskret.
          </p>
          <button
            onClick={() => navigate('/help')}
            className="mt-5 lg:mt-6 px-6 py-2.5 border border-white/25 text-white text-[10px] bg-transparent hover:bg-white hover:text-black transition-all duration-300 w-fit"
            style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}
          >
            Kontakt
          </button>
        </div>
        {/* Image side */}
        <div className="hidden lg:block overflow-hidden">
          <img src={CRAFT.hands} alt="" className="w-full h-full object-cover" style={{ minHeight: 240 }} />
        </div>
      </div>

      {/* ── Footer Links Grid ───────────────────────────────── */}
      <div className="border-t border-white/[0.06]">
        <div className="px-6 lg:px-16 xl:px-24 py-10 lg:py-14">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">

            {/* Shop — matches sidebar nav */}
            <div>
              <p className="text-[11px] text-white/60 mb-4 font-normal">Shop</p>
              <div className="space-y-2">
                {[
                  { label: 'Für dich', path: '/foryou' },
                  { label: 'Kollektion', path: '/collection' },
                  { label: 'Zubehör', path: '/accessories' },
                  { label: 'Entdecken', path: '/explore' },
                ].map(link => (
                  <button
                    key={link.label}
                    onClick={() => navigate(link.path)}
                    className="block text-[12px] text-white/35 font-light bg-transparent border-0 p-0 hover:text-white/60 transition-colors cursor-pointer"
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Konto — matches sidebar secondary */}
            <div>
              <p className="text-[11px] text-white/60 mb-4 font-normal">Konto</p>
              <div className="space-y-2">
                {[
                  { label: 'Wunschliste', path: '/wishlist' },
                  { label: 'Bestellungen', path: '/orders' },
                  { label: 'Hilfe & Kontakt', path: '/help' },
                  { label: 'Einstellungen', path: '/settings' },
                ].map(link => (
                  <button
                    key={link.label}
                    onClick={() => navigate(link.path)}
                    className="block text-[12px] text-white/35 font-light bg-transparent border-0 p-0 hover:text-white/60 transition-colors cursor-pointer"
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Rechtliches */}
            <div>
              <p className="text-[11px] text-white/60 mb-4 font-normal">Rechtliches</p>
              <div className="space-y-2">
                {[
                  { label: 'AGB', path: '/legal/terms' },
                  { label: 'Datenschutz', path: '/legal/privacy' },
                  { label: 'Impressum', path: '/legal/imprint' },
                  { label: 'Widerrufsbelehrung', path: '/legal/withdrawal' },
                  { label: 'Versand & Lieferung', path: '/legal/shipping' },
                ].map(link => (
                  <button
                    key={link.label}
                    onClick={() => navigate(link.path)}
                    className="block text-[12px] text-white/35 font-light bg-transparent border-0 p-0 hover:text-white/60 transition-colors cursor-pointer"
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Newsletter */}
            <div>
              <p className="text-[11px] text-white/60 mb-4 font-normal">Newsletter</p>
              <p className="text-[11px] text-white/30 font-light mb-4 leading-relaxed">
                Erhalten Sie als Erster exklusive Neuigkeiten und Angebote.
              </p>
              <form onSubmit={handleNewsletter} className="flex">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="IHRE E-MAIL ADRESSE"
                  className="flex-1 bg-transparent border border-white/15 border-r-0 px-3 py-2.5 text-[10px] text-white/60 placeholder-white/20 outline-none focus:border-white/30 transition-colors font-light tracking-wider"
                />
                <button
                  type="submit"
                  className="w-10 border border-white/15 bg-transparent text-white/25 hover:text-white/50 hover:border-white/30 flex items-center justify-center transition-colors"
                >
                  <ArrowRight size={13} strokeWidth={1.25} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Bar ──────────────────────────────────────── */}
      <div className="border-t border-white/[0.06] px-6 lg:px-16 xl:px-24 py-5 flex items-center justify-between">
        <p className="text-[10px] text-white/20 font-light">
          Copyright © {new Date().getFullYear()} Atelier
        </p>
        <div className="flex items-center gap-5">
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-white/25 hover:text-white/50 transition-colors">
            <Instagram size={16} strokeWidth={1.25} />
          </a>
          <svg className="text-white/25 hover:text-white/50 transition-colors cursor-pointer" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
          </svg>
          <svg className="text-white/25 hover:text-white/50 transition-colors cursor-pointer" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
          </svg>
        </div>
      </div>
    </footer>
  )
}
