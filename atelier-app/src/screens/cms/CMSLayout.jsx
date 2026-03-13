import { useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Footprints, Sparkles, Shirt, Image, LogOut, Users, Shield, ScanLine, BookOpen, HelpCircle, FileText, ShoppingBag, ShieldCheck, Landmark, Mail } from 'lucide-react'
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
    { to: '/cms/articles', label: 'Artikel',      icon: BookOpen   },
    { to: '/cms/orders',          label: 'Bestellungen',  icon: ShoppingBag },
    { to: '/cms/email-templates', label: 'E-Mail Vorlagen', icon: Mail       },
    { to: '/cms/faq',             label: 'FAQ & Support',  icon: HelpCircle  },
    { to: '/cms/legal',    label: 'Rechtliches',   icon: FileText    },
  ]

  const roleColor = {
    admin:   'text-red-400',
    curator: 'text-purple-400',
    user:    'text-gray-400',
  }

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 overflow-hidden" style={{ width: '100%' }}>
      {/* Sidebar */}
      <aside className="w-52 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col">

        {/* Logo */}
        <div className="px-6 py-6 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-gray-900 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs font-playfair">A</span>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase text-gray-900">ATELIER</p>
              <p className="text-[9px] text-gray-400 uppercase tracking-wider">CMS Studio</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 overflow-y-auto">
          {/* Content section */}
          <p className="text-[9px] uppercase tracking-widest text-gray-300 px-2 mb-2">Inhalte</p>
          <div className="space-y-px">
            {contentNav.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all no-underline ${
                    isActive
                      ? 'bg-gray-900 text-white font-medium'
                      : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
                  }`
                }
              >
                <Icon size={14} />
                {label}
              </NavLink>
            ))}
          </div>

          {/* Admin-only section */}
          {user?.role === 'admin' && (
            <>
              <p className="text-[9px] uppercase tracking-widest text-gray-300 px-2 mb-2 mt-6">Administration</p>
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
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all no-underline ${
                        isActive
                          ? 'bg-red-50 text-red-600 font-medium'
                          : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
                      }`
                    }
                  >
                    <Icon size={14} />
                    {label}
                  </NavLink>
                ))}
              </div>
            </>
          )}
        </nav>

        {/* User footer */}
        <div className="px-5 py-5 border-t border-gray-100">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-gray-600">{user?.name?.[0]?.toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
          <p className={`text-[9px] font-medium uppercase tracking-wider mb-3 ${roleColor[user?.role] || 'text-gray-400'}`}>
            {user?.role}
          </p>
          <div className="space-y-0.5">
            <button
              onClick={() => navigate('/collection')}
              className="w-full flex items-center gap-2.5 px-0 py-1.5 text-xs text-gray-400 hover:text-gray-900 transition-colors bg-transparent border-0 text-left"
            >
              <Shield size={13} />
              App ansehen
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-0 py-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors bg-transparent border-0 text-left"
            >
              <LogOut size={13} />
              Abmelden
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <Outlet />
      </main>
    </div>
  )
}
