import { useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Footprints, Sparkles, Shirt, Image, ImagePlus, LogOut, Users, Shield, ScanLine, BookOpen, HelpCircle, FileText, ShoppingBag, ShieldCheck, Landmark, Mail, Ruler, Palette, Award, MessageSquare, Truck, Ticket, Gift, Star, Megaphone, Home, ExternalLink } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import useAtelierStore from '../../store/atelierStore'

export default function CMSLayout() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { shoes, curated, wardrobe, outfits, initStore, resetToDefaults } = useAtelierStore()

  useEffect(() => { initStore() }, [])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex bg-white text-black" style={{ width: '100%', height: '100%', maxWidth: '100vw', maxHeight: '100dvh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside className="w-[220px] flex-shrink-0 bg-[#111] flex flex-col">

        {/* Logo */}
        <div className="px-7 pt-8 pb-6">
          <p className="text-[11px] font-extralight tracking-[0.35em] uppercase text-white/90">ATELIER</p>
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
              { to: '/cms/leisten',        label: 'Leisten-Parameter', icon: Ruler },
              { to: '/cms/accessories',    label: 'Zubehör',          icon: Gift },
            ]},
            { heading: 'Bestellungen', items: [
              { to: '/cms/orders',   label: 'Bestellungen', icon: ShoppingBag },
              { to: '/cms/shipping', label: 'Versand',      icon: Truck },
              { to: '/cms/coupons',  label: 'Gutscheine',   icon: Ticket },
            ]},
            { heading: 'Inhalte', items: [
              { to: '/cms/homepage', label: 'Homepage',          icon: Home },
              { to: '/cms/featured', label: 'Empfehlungen',     icon: Star },
              { to: '/cms/curated',  label: 'Curated Sections', icon: Sparkles },
              { to: '/cms/wardrobe', label: 'Garderobe',        icon: Shirt },
              { to: '/cms/outfits',  label: 'Outfits',          icon: Image },
              { to: '/cms/articles', label: 'Artikel',          icon: BookOpen },
              { to: '/cms/cta-banner', label: 'CTA-Banner',     icon: Megaphone },
              { to: '/cms/footer',     label: 'Footer & Service', icon: FileText },
              { to: '/cms/media',      label: 'Mediathek',        icon: ImagePlus },
            ]},
            { heading: 'Kunden', items: [
              { to: '/cms/scans',    label: 'Foot Scans',   icon: ScanLine },
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
        <div className="w-full max-w-full overflow-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
