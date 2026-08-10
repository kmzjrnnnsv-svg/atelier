import { useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Footprints, Image, ImagePlus, LogOut, Users, Shield, ScanLine, HelpCircle, FileText, ShoppingBag, ShieldCheck, Landmark, Mail, Ruler, Palette, Award, MessageSquare, Truck, Ticket, Gift, Megaphone, ExternalLink, Sliders, Building2, Smartphone, ChevronRight, Inbox, PackageOpen } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import useStore from '../../store/store'
import { HOME_PATH } from '../../lib/homePath'

export default function CMSLayout() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { shoes, initStore, resetToDefaults } = useStore()

  useEffect(() => { initStore() }, [])

  const handleLogout = () => {
    // Vollständiger Seitenwechsel statt Router-Navigation. Beim Abmelden
    // rendern die geschützten Hüllen sonst noch einmal ohne Benutzer und
    // schicken einen auf die Anmeldemaske, bevor der Wechsel greift — der
    // Nutzer landete trotz allem auf /login. Der Neuaufbau räumt außerdem
    // jeden im Speicher gehaltenen Zustand mit ab, was beim Abmelden
    // ohnehin das Gewünschte ist.
    logout()
    window.location.replace(HOME_PATH)
  }

  return (
    <div className="flex bg-white text-black" style={{ width: '100%', height: '100%', maxWidth: '100vw', maxHeight: '100dvh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside className="w-[220px] flex-shrink-0 bg-[#111] flex flex-col">

        {/* Logo */}
        <div className="px-7 pt-8 pb-6">
          <p className="font-brand text-[11px] text-white/90">ARTISAN SOLE</p>
          <p className="text-[9px] text-white/20 tracking-[0.2em] uppercase mt-1 font-light">Content Studio</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 pb-4 overflow-y-auto" data-keep-scroll>
          {[
            { heading: null, items: [
              { to: '/cms', label: 'Dashboard', icon: LayoutDashboard, end: true },
            ]},
            { heading: 'Produkte', items: [
              { to: '/cms/shoes',          label: 'Schuhe',           icon: Footprints },
              { to: '/cms/product-config', label: 'Produkt-Konfig',   icon: Palette },
              { to: '/cms/options',        label: 'Konfigurator-Optionen', icon: Sliders },
              { to: '/cms/matrix',         label: 'Modell-Matrix',        icon: LayoutDashboard },
              { to: '/cms/leisten',        label: 'Leisten-Parameter', icon: Ruler },
              { to: '/cms/accessories',    label: 'Zubehör',          icon: Gift },
            ]},
            { heading: 'Bestellungen', items: [
              { to: '/cms/anfragen', label: 'Anfragen',     icon: Inbox },
              { to: '/cms/orders',   label: 'Bestellungen', icon: ShoppingBag },
              { to: '/cms/shipping', label: 'Versand',      icon: Truck },
              { to: '/cms/ruecksendungen', label: 'Rücksendungen', icon: PackageOpen },
              { to: '/cms/coupons',  label: 'Gutscheine',   icon: Ticket },
            ]},
            { heading: 'Inhalte', items: [
              { to: '/cms/cta-banner', label: 'CTA-Banner',     icon: Megaphone },
              { to: '/cms/product-texts', label: 'Produktseite-Texte', icon: FileText },
              { to: '/cms/footer',     label: 'Footer & Service', icon: FileText },
              { to: '/cms/website-images', label: 'Website-Bilder',  icon: Image },
              { to: '/cms/media',      label: 'Mediathek',        icon: ImagePlus },
            ]},
            { heading: 'Kunden', items: [
              { to: '/cms/scans',    label: 'Foot Scans',   icon: ScanLine },
              { to: '/cms/business', label: 'Firmenkonten', icon: Building2 },
              { to: '/cms/vermittler', label: 'Vermittler',  icon: Users },
              { to: '/cms/loyalty',  label: 'Loyalty & Tiers', icon: Award },
              { to: '/cms/feedback', label: 'Feedback & Tickets', icon: MessageSquare },
            ]},
            { heading: 'Kommunikation', items: [
              { to: '/cms/email-templates', label: 'E-Mail Vorlagen', icon: Mail },
              { to: '/cms/faq',             label: 'FAQ & Support',   icon: HelpCircle },
              { to: '/cms/legal',           label: 'Rechtliches',     icon: FileText },
            ]},
            ...(user?.role === 'admin' ? [{ heading: 'Administration', items: [
              { to: '/cms/users', label: 'Benutzer',       icon: Users },
              { to: '/cms/bank',  label: 'Bankverbindung', icon: Landmark },
              { to: '/cms/email', label: 'E-Mail / SMTP',  icon: Mail },
              { to: '/cms/mfa',   label: 'MFA-Sicherheit', icon: ShieldCheck },
            ]}] : []),
          ].map(({ heading, items }, gi) => (
            <div key={gi}>
              {heading && (
                <p className="text-[8px] uppercase tracking-[0.25em] text-white/15 px-3 mb-2.5 mt-7 font-light">{heading}</p>
              )}
              <div className="space-y-0.5">
                {items.map(({ to, label, icon: Icon, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-[7px] text-[12px] transition-all no-underline tracking-wide ${
                        isActive
                          ? 'bg-white/[0.08] text-white/90 font-normal'
                          : 'text-white/25 hover:text-white/50 hover:bg-white/[0.03] font-light'
                      }`
                    }
                  >
                    <Icon size={13} strokeWidth={1.25} />
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-6 py-6 border-t border-white/[0.06]">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 bg-white/[0.08] flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-light text-white/50">{user?.name?.[0]?.toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-light text-white/60 truncate">{user?.name}</p>
              <p className="text-[9px] text-white/20 truncate font-light">{user?.role}</p>
            </div>
          </div>
          <div className="space-y-1">
            <button
              onClick={() => navigate('/collection')}
              className="w-full flex items-center gap-2.5 px-0 py-1 text-[11px] text-white/20 hover:text-white/45 transition-colors bg-transparent border-0 text-left font-light tracking-wide"
            >
              <ExternalLink size={11} strokeWidth={1.25} />
              App ansehen
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-0 py-1 text-[11px] text-white/20 hover:text-white/45 transition-colors bg-transparent border-0 text-left font-light tracking-wide"
            >
              <LogOut size={11} strokeWidth={1.25} />
              Abmelden
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto bg-[#fafaf9]">
        {/* Hinweis nur auf schmalen Schirmen: Die Seitenleiste belegt feste
            220 px, auf einem Telefon bleiben davon keine 160 px für den
            Inhalt. Statt hier alles umzubauen, führt der Weg zur schlanken
            Verwaltung — die deckt ab, was unterwegs anfällt. */}
        <NavLink to="/verwaltung"
          className="lg:hidden flex items-center gap-2 bg-black text-white px-4 py-3 text-[12px] font-light no-underline">
          <Smartphone size={15} strokeWidth={1.4} className="flex-shrink-0" />
          <span className="flex-1">Auf dem Telefon: zur schlanken Verwaltung</span>
          <ChevronRight size={15} strokeWidth={1.5} />
        </NavLink>
        <div className="w-full max-w-full overflow-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
