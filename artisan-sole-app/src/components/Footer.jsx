/**
 * Footer.jsx — Lemaire-Style Global Footer
 * Heller Hintergrund, dunkle minimale Typografie, vier Spalten
 * (Über uns / Hilfe / Social / Rechtliches), Land + Sprache rechts unten.
 * Inhalte sind weiterhin CMS-editierbar über /api/settings/footer.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronUp } from 'lucide-react'
import { apiFetch } from '../hooks/useApi'

const DEFAULTS = {
  // „Über uns“-Spalte
  about_label: 'Über uns',
  about_links: [
    { label: 'Artisan Sole', path: '/legal/about' },
    { label: 'Für Unternehmen', path: '/business' },
    { label: 'Boutiquen',    path: '/help' },
  ],

  // „Hilfe“-Spalte
  help_label: 'Hilfe',
  help_links: [
    { label: 'Versand & Lieferung', path: '/legal/shipping' },
    { label: 'Kundenbetreuung',     path: '/help' },
    { label: 'FAQ',                 path: '/help' },
    { label: 'Rückgabeanfrage',     path: '/legal/withdrawal' },
    { label: 'Rückverfolgbarkeit',  path: '/orders' },
  ],

  // „Social“-Spalte
  social_label: 'Social',
  social_links: [
    { label: 'Instagram', path: 'https://instagram.com' },
    { label: 'Facebook',  path: 'https://facebook.com' },
    { label: 'Pinterest', path: 'https://pinterest.com' },
    { label: 'YouTube',   path: 'https://youtube.com' },
  ],

  // „Rechtliches“-Spalte
  legal_label: 'Rechtliches',
  legal_links: [
    { label: 'Allgemeine Geschäftsbedingungen', path: '/legal/terms' },
    { label: 'Datenschutzerklärung',           path: '/legal/privacy' },
    { label: 'Impressum',                       path: '/legal/imprint' },
    { label: 'Widerrufsbelehrung',              path: '/legal/withdrawal' },
    { label: 'Cookie-Einstellungen',            path: '/legal/cookies' },
  ],

  // Land + Sprache
  country: 'Deutschland',
  language: 'Deutsch',

  copyright: 'Artisan Sole',
}

function Column({ label, links, navigate }) {
  if (!links?.length) return null
  return (
    <div>
      <p className="text-[11px] text-black/35 mb-5 font-light tracking-[0.05em]">{label}</p>
      <ul className="space-y-2.5">
        {links.map((link, i) => {
          const external = link.path?.startsWith('http')
          const Tag = external ? 'a' : 'button'
          const props = external
            ? { href: link.path, target: '_blank', rel: 'noopener noreferrer' }
            : { type: 'button', onClick: () => navigate(link.path) }
          return (
            <li key={i}>
              <Tag
                {...props}
                className="text-[11px] text-black tracking-[0.15em] uppercase font-light bg-transparent border-0 p-0 hover:text-black/55 transition-colors cursor-pointer no-underline block"
                style={{ fontFamily: "'Jost', 'Futura', 'Century Gothic', sans-serif" }}
              >
                {link.label}
              </Tag>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default function Footer() {
  const navigate = useNavigate()
  const [cfg, setCfg] = useState(DEFAULTS)

  useEffect(() => {
    apiFetch('/api/settings/footer')
      .then(data => { if (data) setCfg({ ...DEFAULTS, ...data }) })
      .catch(() => {})
  }, [])

  // „Für Unternehmen" (Corporate Gifting) immer in der „Über uns"-Spalte zeigen,
  // auch wenn der Footer im CMS angepasst wurde.
  const aboutLinks = (() => {
    const links = cfg.about_links?.length ? [...cfg.about_links] : DEFAULTS.about_links
    if (!links.some(l => l.path === '/business')) links.push({ label: 'Für Unternehmen', path: '/business' })
    return links
  })()

  return (
    <footer className="bg-[#f7f5f0] text-black">
      <div className="px-6 lg:px-16 xl:px-24 pt-16 lg:pt-20 pb-10">
        {/* Spalten */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-12 gap-x-8 lg:gap-x-16">
          <Column label={cfg.about_label || 'Über uns'}   links={aboutLinks}  navigate={navigate} />
          <Column label={cfg.help_label  || 'Hilfe'}      links={cfg.help_links}   navigate={navigate} />
          <Column label={cfg.social_label || 'Social'}    links={cfg.social_links} navigate={navigate} />
          <Column label={cfg.legal_label || 'Rechtliches'} links={cfg.legal_links} navigate={navigate} />
        </div>

        {/* Bottom-Bar: Copyright links, Land + Sprache rechts */}
        <div className="mt-16 lg:mt-24 pt-6 border-t border-black/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <p className="text-[10px] text-black/30 font-light tracking-[0.1em]">
            © {new Date().getFullYear()} {cfg.copyright || 'Artisan Sole'}
          </p>
          <div className="flex items-center gap-8">
            <button
              type="button"
              className="flex items-center gap-1 text-[11px] text-black tracking-[0.05em] font-light bg-transparent border-0 hover:text-black/60 transition-colors"
              aria-label="Land wählen"
            >
              {cfg.country || 'Deutschland'}
              <ChevronUp size={12} strokeWidth={1.4} className="text-black/40" />
            </button>
            <button
              type="button"
              className="flex items-center gap-1 text-[11px] text-black tracking-[0.05em] font-light bg-transparent border-0 hover:text-black/60 transition-colors"
              aria-label="Sprache wählen"
            >
              {cfg.language || 'Deutsch'}
              <ChevronUp size={12} strokeWidth={1.4} className="text-black/40" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}
