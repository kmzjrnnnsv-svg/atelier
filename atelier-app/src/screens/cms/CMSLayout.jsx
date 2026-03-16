import { useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Footprints, Sparkles, Shirt, Image, LogOut, Users, Shield, ScanLine, BookOpen, HelpCircle, FileText, ShoppingBag, ShieldCheck, Landmark, Mail, Ruler, Palette, Compass, Award, MessageSquare } from 'lucide-react'
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

  const contentNav = [
    { to: '/cms', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/cms/shoes', label: 'Schuhe', icon: Footprints },
    { to: '/cms/curated', label: 'Curated Sections', icon: Sparkles },
    { to: '/cms/wardrobe', label: 'Garderobe', icon: Shirt },
    { to: '/cms/outfits', label: 'Outfits', icon: Image },
    { to: '/cms/scans',    label: 'Foot Scans',   icon: ScanLine   },
    { to: '/cms/leisten',  label: 'Leisten-Parameter', icon: Ruler   },
    { to: '/cms/product-config', label: 'Produkt-Konfig', icon: Palette },
    { to: '/cms/explore',  label: 'Explore',        icon: Compass    },
    { to: '/cms/loyalty',  label: 'Loyalty & Tiers', icon: Award     },
    { to: '/cms/articles', label: 'Artikel',      icon: BookOpen   },
    { to: '/cms/orders',          label: 'Bestellungen',  icon: ShoppingBag },
    { to: '/cms/email-templates', label: 'E-Mail Vorlagen', icon: Mail       },
    { to: '/cms/faq',             label: 'FAQ & Support',  icon: HelpCircle  },
    { to: '/cms/feedback',         label: 'Feedback & Tickets', icon: MessageSquare },
    { to: '/cms/legal',    label: 'Rechtliches',   icon: FileText    },
  ]

  return (
    <div className="flex h-full w-full bg-[#f6f5f3] text-black overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-[#0d0d0d] flex flex-col">

        {/* Logo */}
        <div className="px-6 py-6 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/10 flex items-center justify-center">
              <span className="text-white font-bold text-sm" style={{ fontFamily: 'Georgia, serif' }}>A</span>
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-[0.25em] uppercase text-white">ATELIER</p>
              <p className="text-[9px] text-white/30 uppercase tracking-wider">Content Studio</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 overflow-y-auto">
          {/* Content section */}
          <p className="text-[8px] uppercase tracking-[0.2em] text-white/20 px-3 mb-2 font-semibold">Inhalte</p>
          <div className="space-y-px">
            {contentNav.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 text-[13px] transition-all no-underline ${
                    isActive
                      ? 'bg-white/10 text-white font-medium'
                      : 'text-white/35 hover:text-white/70 hover:bg-white/5'
                  }`
                }
              >
                <Icon size={14} strokeWidth={1.5} />
                {label}
              </NavLink>
            ))}
          </div>

          {/* Admin-only section */}
          {user?.role === 'admin' && (
            <>
              <p className="text-[8px] uppercase tracking-[0.2em] text-white/20 px-3 mb-2 mt-6 font-semibold">Administration</p>
              <div className="space-y-px">
                {[
                  { to: '/cms/users',    label: 'Benutzer',       icon: Users       },
                  { to: '/cms/bank',     label: 'Bankverbindung', icon: Landmark    },
                  { to: '/cms/email',    label: 'E-Mail / SMTP',  icon: Mail        },
                  { to: '/cms/mfa',      label: 'MFA-Sicherheit', icon: ShieldCheck },
                ].map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 text-[13px] transition-all no-underline ${
                        isActive
                          ? 'bg-white/10 text-white font-medium'
                          : 'text-white/35 hover:text-white/70 hover:bg-white/5'
                      }`
                    }
                  >
                    <Icon size={14} strokeWidth={1.5} />
                    {label}
                  </NavLink>
                ))}
              </div>
            </>
          )}
        </nav>

        {/* User footer */}
        <div className="px-5 py-5 border-t border-white/8">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 bg-white/10 flex items-center justify-center flex-shrink-0">
              <span className="text-[11px] font-semibold text-white/70">{user?.name?.[0]?.toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-white/80 truncate">{user?.name}</p>
              <p className="text-[10px] text-white/30 truncate">{user?.email}</p>
            </div>
          </div>
          <p className="text-[9px] font-medium uppercase tracking-wider mb-3 text-white/25">
            {user?.role}
          </p>
          <div className="space-y-0.5">
            <button
              onClick={() => navigate('/collection')}
              className="w-full flex items-center gap-2.5 px-0 py-1.5 text-[12px] text-white/30 hover:text-white/60 transition-colors bg-transparent border-0 text-left"
            >
              <Shield size={13} strokeWidth={1.5} />
              App ansehen
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-0 py-1.5 text-[12px] text-white/30 hover:text-white/60 transition-colors bg-transparent border-0 text-left"
            >
              <LogOut size={13} strokeWidth={1.5} />
              Abmelden
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto bg-[#f6f5f3]">
        <div className="w-full max-w-full overflow-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
